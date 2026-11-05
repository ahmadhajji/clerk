import { createHash } from 'node:crypto';
import { Parser } from 'htmlparser2';

export const PARSER_VERSION = '1';
export const digest = (text: string | Buffer): string => createHash('sha256').update(text).digest('hex');
export interface Section { title: string; anchor: string | null; text: string }
export interface Parsed { sections: Section[]; dates: Record<string, string>; originalUrl: string | null }

export function parseHtml(html: string): Parsed {
  const sections: Section[] = [];
  let title = 'Document opening';
  let anchor: string | null = null;
  let text = '';
  let heading: { depth: number; text: string; anchor: string | null } | null = null;
  let depth = 0;
  let hiddenDepth = 0;
  let originalUrl: string | null = null;
  let lastAnchor: string | null = null;
  const dates: Record<string, string> = {};
  function flush(): void {
    const cleaned = text.replace(/[ \t\r]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (cleaned) sections.push({ title, anchor, text: cleaned });
    text = '';
  }
  const parser = new Parser({
    onopentag(name, attrs) {
      depth++;
      if ((name === 'link' && attrs.rel === 'canonical') || (name === 'meta' && attrs.property === 'og:url')) {
        const url = attrs.href ?? attrs.content;
        if (url && /^https?:\/\//i.test(url)) originalUrl = url;
      }
      if (hiddenDepth > 0) return;
      if (['script', 'style', 'head', 'noscript', 'template'].includes(name)) {
        // Metadata is collected below even inside the head; visible text is discarded.
        hiddenDepth = depth;
      }
      if (attrs.id && attrs.class === 'headingAnchor') lastAnchor = attrs.id;
      if (/^h[1-6]$/.test(name) || attrs.role === 'heading' || /^h[1-6]$/.test(attrs['data-node-name'] ?? '')) {
        if (!heading && hiddenDepth === 0) {
          flush();
          heading = { depth, text: '', anchor: attrs.id ?? lastAnchor };
        }
      }
      if (name === 'img' && attrs.alt) text += ` [Image description: ${attrs.alt}] `;
      if (['p','div','li','tr','br','section','table'].includes(name)) text += '\n';
      if (name === 'td' || name === 'th') text += ' | ';
    },
    ontext(value) {
      if (hiddenDepth > 0) return;
      if (heading) heading.text += value;
      else text += value;
    },
    onclosetag(name) {
      if (heading?.depth === depth) {
        title = heading.text.replace(/\s+/g, ' ').trim() || 'Untitled section';
        anchor = heading.anchor;
        heading = null;
      }
      if (hiddenDepth === depth) hiddenDepth = 0;
      else if (hiddenDepth === 0 && ['p','div','li','tr','section','table'].includes(name)) text += '\n';
      depth--;
    },
  }, { decodeEntities: true });
  parser.write(html);
  parser.end();
  flush();
  // Preserve date labels verbatim. Ambiguous day/month ordering is not normalized.
  const opening = sections.slice(0, 3).map(s => s.text).join('\n').slice(0, 16000);
  for (const [key, pattern] of [
    ['lastUpdated', /(?:This topic last updated:|Last updated:)\s*([^\n|]+?)(?=\n|\s{2,}|$)/i],
    ['literatureReviewThrough', /Literature review current through:\s*([^\n|]+)/i],
    ['published', /(?:Date published:|Published on:)\s*([^\n|]+)/i],
  ] satisfies [string, RegExp][]) {
    const found = opening.match(pattern)?.[1]?.trim();
    if (found && found.length < 150 && !found.includes('$')) dates[key] = found;
  }
  return { sections, dates, originalUrl };
}

export interface Chunk { section: string; anchor: string | null; part: number; text: string }
export function chunkSections(sections: Section[], size = 3600, overlap = 500): Chunk[] {
  if (size < 100 || overlap < 0 || overlap >= size) throw new Error('Invalid chunk bounds');
  const chunks: Chunk[] = [];
  for (const section of sections) {
    for (let start = 0; start < section.text.length;) {
      let end = Math.min(start + size, section.text.length);
      if (end < section.text.length) {
        const boundary = Math.max(section.text.lastIndexOf('\n', end), section.text.lastIndexOf('. ', end));
        if (boundary > start + size / 2) end = boundary + 1;
      }
      chunks.push({ section: section.title, anchor: section.anchor, part: chunks.length + 1, text: section.text.slice(start, end) });
      if (end === section.text.length) break;
      start = end - overlap;
    }
  }
  return chunks;
}
