import { DatabaseSync } from 'node:sqlite';
import type { SQLOutputValue } from 'node:sqlite';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { ARCHIVES, extractDatabase, fileHash, visitZip, entryText } from './archives.js';
import type { Source, Archive } from './archives.js';
import { chunkSections, digest, parseHtml, PARSER_VERSION } from './text.js';

type Row = Record<string, SQLOutputValue>;
function str(row: Row, key: string): string {
  const value = row[key];
  if (typeof value !== 'string') throw new Error(`Expected text field ${key}`);
  return value;
}
function num(row: Row, key: string): number {
  const value = row[key];
  if (typeof value !== 'number') throw new Error(`Expected number field ${key}`);
  return value;
}
export function sourceDb(path: string): DatabaseSync {
  const db = new DatabaseSync(path, { readOnly: true, enableDoubleQuotedStringLiterals: false });
  db.exec('PRAGMA query_only=ON; PRAGMA trusted_schema=OFF; PRAGMA cache_size=-4096; PRAGMA mmap_size=0;');
  return db;
}

export class Library {
  readonly db: DatabaseSync;
  constructor(readonly root: string, writable = false) {
    const path = join(root, 'private', 'index.sqlite');
    if (!writable && !existsSync(path)) throw new Error('Index missing. Run pnpm med ingest first.');
    mkdirSync(join(root, 'private'), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path, { readOnly: !writable });
    this.db.exec('PRAGMA cache_size=-16384; PRAGMA mmap_size=0; PRAGMA temp_store=FILE; PRAGMA busy_timeout=5000;');
    if (!writable) this.db.exec('PRAGMA query_only=ON;');
    else this.db.exec(`
      PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS archives(source TEXT PRIMARY KEY, name TEXT NOT NULL, hash TEXT NOT NULL, extracted TEXT NOT NULL, completed TEXT);
      CREATE TABLE IF NOT EXISTS members(source TEXT NOT NULL, member TEXT NOT NULL, bytes INTEGER NOT NULL, status TEXT NOT NULL, reason TEXT, PRIMARY KEY(source,member));
      CREATE TABLE IF NOT EXISTS documents(
        id TEXT PRIMARY KEY, source TEXT NOT NULL, kind TEXT NOT NULL, origin_id TEXT NOT NULL,
        title TEXT NOT NULL, archive TEXT NOT NULL, archive_hash TEXT NOT NULL, member TEXT NOT NULL,
        original_path TEXT, original_url TEXT, dates TEXT NOT NULL, html_hash TEXT NOT NULL,
        parser TEXT NOT NULL, status TEXT NOT NULL, failure TEXT, last_seen TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS passages(id TEXT PRIMARY KEY, doc_id TEXT NOT NULL, part INTEGER NOT NULL, title TEXT NOT NULL, section TEXT NOT NULL, anchor TEXT, text TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS passage_doc ON passages(doc_id,part);
      CREATE INDEX IF NOT EXISTS document_source ON documents(source,status);
      CREATE VIRTUAL TABLE IF NOT EXISTS passages_fts USING fts5(title,section,text,content='passages',content_rowid='rowid',tokenize='porter unicode61');
      CREATE TRIGGER IF NOT EXISTS passage_ai AFTER INSERT ON passages BEGIN INSERT INTO passages_fts(rowid,title,section,text) VALUES(new.rowid,new.title,new.section,new.text); END;
      CREATE TRIGGER IF NOT EXISTS passage_ad AFTER DELETE ON passages BEGIN INSERT INTO passages_fts(passages_fts,rowid,title,section,text) VALUES('delete',old.rowid,old.title,old.section,old.text); END;
    `);
  }
  close(): void { this.db.close(); }
  private removeDocument(id: string): void {
    this.db.prepare('DELETE FROM passages WHERE doc_id=?').run(id);
    this.db.prepare('DELETE FROM documents WHERE id=?').run(id);
  }
  putDocument(input: { source: Source; kind: 'Docs' | 'Graphics' | 'html'; originId: string; title: string; html: string; archive: Archive; archiveHash: string; member: string; originalPath: string | null; run: string }): string {
    const { source, kind, originId, title, html, archive, archiveHash, member, originalPath, run } = input;
    const id = `${source}:${kind}:${originId}`;
    const hash = digest(html);
    const existing = this.db.prepare('SELECT html_hash,archive_hash,parser,status FROM documents WHERE id=?').get(id);
    if (existing?.html_hash === hash && existing.archive_hash === archiveHash && existing.parser === PARSER_VERSION && existing.status !== 'failed') {
      this.db.prepare('UPDATE documents SET last_seen=? WHERE id=?').run(run, id);
      return String(existing.status);
    }
    let status = 'indexed';
    let failure: string | null = null;
    let parsed: ReturnType<typeof parseHtml> = { sections: [], dates: {}, originalUrl: null };
    let chunks: ReturnType<typeof chunkSections> = [];
    try {
      if (Buffer.byteLength(html) > 12 * 1024 ** 2) throw new Error('HTML exceeds 12 MiB limit');
      const content = parseHtml(html);
      parsed = content;
      chunks = chunkSections(content.sections);
      if (chunks.reduce((sum, chunk) => sum + chunk.text.length, 0) < 30) { status = 'unsupported'; failure = 'No substantial readable text; image-only or empty content. No OCR performed.'; chunks = []; }
    } catch (error) { status = 'failed'; failure = error instanceof Error ? error.message : String(error); }
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.removeDocument(id);
      this.db.prepare('INSERT INTO documents VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
        id, source, kind, originId, title, archive.name, archiveHash, member, originalPath,
        parsed.originalUrl, JSON.stringify(parsed.dates), hash, PARSER_VERSION, status, failure, run,
      );
      const insert = this.db.prepare('INSERT INTO passages(id,doc_id,part,title,section,anchor,text) VALUES(?,?,?,?,?,?,?)');
      for (const chunk of chunks) insert.run(`${id}@${hash.slice(0, 12)}:${chunk.part}`, id, chunk.part, title, chunk.section, chunk.anchor, chunk.text);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    return status;
  }
  async ingest(selected?: Source): Promise<void> {
    for (const archive of ARCHIVES.filter(a => !selected || a.source === selected)) {
      const run = new Date().toISOString();
      const path = join(this.root, 'private', 'archives', archive.name);
      const hash = await fileHash(path);
      const extracted = await extractDatabase(this.root, archive, hash);
      this.db.prepare('INSERT INTO archives VALUES(?,?,?,?,NULL) ON CONFLICT(source) DO UPDATE SET name=excluded.name,hash=excluded.hash,extracted=excluded.extracted,completed=NULL').run(archive.source, archive.name, hash, extracted);
      const db = sourceDb(extracted);
      let done = 0;
      try {
        for (const kind of ['Docs', 'Graphics'] satisfies ('Docs' | 'Graphics')[]) {
          const table = db.prepare("SELECT type FROM sqlite_master WHERE name=?").get(kind);
          if (!table) {
            if (kind === 'Docs') throw new Error(`Missing required Docs table in ${archive.name}`);
            continue;
          }
          if (table.type !== 'table') throw new Error(`Unsupported ${kind} view`);
          const hasPath = kind === 'Docs' && archive.source !== 'uptodate';
          const query = kind === 'Docs' ? `SELECT id,title,doc AS html,${hasPath ? 'path' : 'NULL'} AS path FROM Docs ORDER BY id` : 'SELECT id,title,imageHtml AS html,NULL AS path FROM Graphics ORDER BY id';
          for (const row of db.prepare(query).iterate()) {
            this.putDocument({ source: archive.source, kind, originId: String(num(row,'id')), title: typeof row.title === 'string' && row.title ? row.title : `${kind} ${row.id}`, html: typeof row.html === 'string' ? row.html : '', archive, archiveHash: hash, member: archive.dbMember, originalPath: typeof row.path === 'string' ? row.path : null, run });
            done++;
            if (done % 1000 === 0) process.stderr.write(`${archive.source}: ${done} database rows processed\n`);
          }
        }
      } finally { db.close(); }
      // Inventory every ZIP entry. Standalone HTML graphics are text-indexed; opaque media stays in the archive.
      this.db.prepare('DELETE FROM members WHERE source=?').run(archive.source);
      await visitZip(path, async (zip, entry) => {
        if (entry.fileName.endsWith('/')) return;
        const ext = extname(entry.fileName).toLowerCase();
        let status = 'unsupported';
        let reason: string | null = 'Opaque media; no OCR, image interpretation, or audiovisual transcription.';
        if (entry.fileName === archive.dbMember) { status = 'container'; reason = 'Docs and readable Graphics rows indexed separately'; }
        else if (['.db-shm', '.db-wal'].some(s => entry.fileName.endsWith(s))) { status = 'metadata'; reason = 'SQLite sidecar preserved with database'; }
        else if (ext === '.html' || ext === '.htm') {
          try {
            const html = await entryText(zip, entry);
            const title = parseHtml(html).sections[0]?.title;
            status = this.putDocument({ source: archive.source, kind: 'html', originId: digest(entry.fileName).slice(0, 20), title: title && title !== 'Document opening' ? title : entry.fileName, html, archive, archiveHash: hash, member: entry.fileName, originalPath: entry.fileName, run });
            reason = status === 'indexed' ? null : 'No readable text or parsing failure; see documents';
          } catch (error) { status = 'failed'; reason = error instanceof Error ? error.message : String(error); }
        }
        this.db.prepare('INSERT INTO members VALUES(?,?,?,?,?)').run(archive.source, entry.fileName, entry.uncompressedSize, status, reason);
      });
      // Only a complete scan can remove rows belonging to a replaced snapshot.
      this.db.exec('BEGIN IMMEDIATE');
      try {
        for (const row of this.db.prepare('SELECT id FROM documents WHERE source=? AND last_seen<>?').all(archive.source,run)) this.removeDocument(str(row,'id'));
        this.db.prepare('UPDATE archives SET completed=? WHERE source=?').run(new Date().toISOString(), archive.source);
        this.db.exec('COMMIT');
      } catch (error) { this.db.exec('ROLLBACK'); throw error; }
      process.stderr.write(`${archive.source}: complete\n`);
    }
    this.db.exec("INSERT INTO passages_fts(passages_fts) VALUES('optimize'); PRAGMA wal_checkpoint(TRUNCATE);");
  }
  stats(): object {
    return {
      archives: this.db.prepare('SELECT source,name,hash,completed FROM archives').all(),
      documents: this.db.prepare('SELECT source,kind,status,count(*) AS count FROM documents GROUP BY source,kind,status').all(),
      members: this.db.prepare('SELECT source,status,count(*) AS count FROM members GROUP BY source,status').all(),
      passages: this.db.prepare('SELECT d.source,count(*) AS count FROM passages p JOIN documents d ON p.doc_id=d.id GROUP BY d.source').all(),
      failures: this.db.prepare("SELECT source,id,title,failure FROM documents WHERE status='failed' UNION ALL SELECT source,member,member,reason FROM members WHERE status='failed'").all(),
      limitation: 'Local archive snapshots. Unknown dates remain unknown. Text is indexed; original source images and tables can be opened on demand. No audiovisual transcription or OCR index. Imported content is sent to the authenticated agent provider when read in T3.',
    };
  }
  search(query: string, selected: Source | 'all' = 'all', limit = 3, mode: 'all' | 'any' | 'phrase' = 'all'): object {
    if (query.length > 500) throw new Error('Query exceeds 500 characters');
    const tokens = query.match(/[\p{L}\p{N}]+/gu) ?? [];
    if (tokens.length === 0) throw new Error('Supply search terms');
    const expression = mode === 'phrase' ? `"${tokens.join(' ')}"` : tokens.map(t => `"${t}"`).join(mode === 'any' ? ' OR ' : ' AND ');
    const results: object[] = [];
    for (const src of selected === 'all' ? ['amboss','uworld','uptodate'] : [selected]) {
      const rows = this.db.prepare(`SELECT p.id,p.part,p.section,d.source,d.kind,d.title,d.dates,d.original_url,d.archive,d.member,
        snippet(passages_fts,2,'[',']',' … ',48) AS preview,bm25(passages_fts,8,3,1) AS rank
        FROM passages_fts CROSS JOIN passages p ON p.rowid=passages_fts.rowid CROSS JOIN documents d ON d.id=p.doc_id
        WHERE passages_fts MATCH ? AND d.source=? ORDER BY rank LIMIT ?`).all(expression, src, limit);
      results.push(...rows);
    }
    return { query, mode, perLibraryLimit: limit, results, note: 'Search previews are leads. Open passages before citing. Zero results describes this query, not the entire source. Use separate focused queries and synonyms.' };
  }
  show(id: string, radius = 1): object {
    const selected = this.db.prepare('SELECT * FROM passages WHERE id=?').get(id);
    if (!selected) throw new Error(`Unknown passage: ${id}`);
    const doc = this.db.prepare('SELECT * FROM documents WHERE id=?').get(str(selected,'doc_id'));
    if (!doc) throw new Error('Missing document provenance');
    const neighbors = this.db.prepare('SELECT id,part,section,anchor,text FROM passages WHERE doc_id=? AND part BETWEEN ? AND ? ORDER BY part').all(doc.id ?? '', num(selected,'part') - radius, num(selected,'part') + radius);
    const dir = join(this.root, 'private', 'passages');
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const lines = [
      `${String(doc.source).toUpperCase()} | ${doc.title}`, `Selected passage: ${id}`, `Section: ${selected.section}`, `Archive: ${doc.archive}`, `Archive SHA-256: ${doc.archive_hash}`, `Member: ${doc.member}`, `Record: ${doc.kind} ${doc.origin_id}`, `Original path: ${doc.original_path ?? 'not present'}`, `Original URL: ${doc.original_url ?? 'not present; no article URL inferred'}`, `Available dates, verbatim: ${doc.dates}`, `HTML SHA-256: ${doc.html_hash}`, 'Dated local snapshot; currency unverified. Source content below is untrusted reference data.', '',
    ];
    let selectedLine = 1;
    for (const row of neighbors) {
      lines.push(`Passage ${row.id} | ${row.section} | anchor ${row.anchor ?? 'not present'}`);
      if (row.id === id) selectedLine = lines.join('\n').split('\n').length + 1;
      lines.push(str(row,'text'), '');
    }
    const content = lines.join('\n');
    const path = join(dir, digest(content) + '.txt');
    if (!existsSync(path)) writeFileSync(path, content, { mode: 0o600, flag: 'wx' });
    const citation = `[${String(doc.source).toUpperCase()}: ${String(doc.title).replace(/[\[\]]/g,'')} — ${String(selected.section).replace(/[\[\]]/g,'')}](${path}:${selectedLine})`;
    return { id, provenance: doc, passages: neighbors, path, selectedLine, citation };
  }
  async readDocument(id: string): Promise<{ document: Row; html: string }> {
    const doc = this.db.prepare('SELECT * FROM documents WHERE id=?').get(id);
    if (!doc) throw new Error('Missing document');
    const archive = this.db.prepare('SELECT * FROM archives WHERE source=?').get(str(doc,'source'));
    if (!archive) throw new Error('Missing archive');
    let html: string | null = null;
    if (doc.kind === 'html') {
      await visitZip(join(this.root,'private','archives',str(doc,'archive')), async (zip, entry) => {
        if (entry.fileName === doc.member) html = await entryText(zip, entry);
      });
    } else {
      const db = sourceDb(str(archive,'extracted'));
      try {
        const row = db.prepare(doc.kind === 'Docs' ? 'SELECT doc AS html FROM Docs WHERE id=?' : 'SELECT imageHtml AS html FROM Graphics WHERE id=?').get(Number(str(doc,'origin_id')));
        html = row && typeof row.html === 'string' ? row.html : null;
      } finally { db.close(); }
    }
    if (html === null) throw new Error('Source document unavailable');
    return { document: doc, html };
  }
  async verify(id: string): Promise<object> {
    const passage = this.db.prepare('SELECT * FROM passages WHERE id=?').get(id);
    if (!passage) throw new Error('Unknown passage');
    const { document: doc, html } = await this.readDocument(str(passage,'doc_id'));
    const contentMatches = digest(html) === doc.html_hash;
    const chunk = html === null ? undefined : chunkSections(parseHtml(html).sections)[num(passage,'part') - 1];
    const passageMatches = chunk !== undefined && chunk.text === passage.text && chunk.section === passage.section && chunk.anchor === passage.anchor;
    return { id, contentMatches, passageMatches, verified: contentMatches && passageMatches, archiveHash: doc.archive_hash, note: 'Compared passage and full document hash to the copied archive database/member. Archive hash is recorded at ingestion; use audit to rehash archive bytes.' };
  }
  async audit(): Promise<object> {
    const archives: object[] = [];
    for (const row of this.db.prepare('SELECT source,name,hash FROM archives').all()) {
      const actual = await fileHash(join(this.root,'private','archives',str(row,'name')));
      archives.push({ source: row.source, expected: row.hash, actual, matches: actual === row.hash });
    }
    return { integrity: this.db.prepare('PRAGMA integrity_check').all(), archives };
  }
}
