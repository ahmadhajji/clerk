import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { Library } from '../src/library.js';

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Expected record');
  return Object.fromEntries(Object.entries(value));
}
function text(value: unknown, key: string): string {
  const item = record(value)[key];
  if (typeof item !== 'string') throw new Error(`Expected text ${key}`);
  return item;
}
function rows(value: unknown, key: string): Record<string, unknown>[] {
  const list = record(value)[key];
  if (!Array.isArray(list)) throw new Error(`Expected list ${key}`);
  return list.map(record);
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lib = new Library(root);
try {
  const checks: object[] = [];
  assert.equal(lib.db.prepare('SELECT count(*) AS n FROM archives WHERE completed IS NOT NULL').get()?.n, 3);
  for (const src of ['amboss', 'uworld', 'uptodate'] satisfies ('amboss' | 'uworld' | 'uptodate')[]) {
    const started = performance.now();
    const result = rows(lib.search('diabetic ketoacidosis potassium', src, 3),'results');
    assert.equal(result.length, 3);
    assert.ok(result.every(row => row.source === src));
    const row = result[0];
    const id = text(row,'id');
    const opened = record(lib.show(id, 1));
    const selected = rows(opened,'passages').find(passage => passage.id === id);
    assert.ok(selected);
    assert.equal(typeof opened.selectedLine,'number');
    if (typeof opened.selectedLine !== 'number') throw new Error('Expected citation line');
    const lines = readFileSync(text(opened,'path'), 'utf8').split('\n');
    const passageText = text(selected,'text');
    assert.equal(lines.slice(opened.selectedLine - 1, opened.selectedLine - 1 + passageText.split('\n').length).join('\n'), passageText);
    assert.equal(record(await lib.verify(id)).verified, true);
    checks.push({ source: src, id, title: text(row,'title'), citation: text(opened,'citation'), verified: true, elapsedMs: Math.round(performance.now() - started) });
  }
  const all = rows(lib.search('hyponatremia', 'all', 1),'results');
  assert.deepEqual(all.map(row => row.source), ['amboss','uworld','uptodate']);
  assert.equal(rows(lib.search('medlibrary-test-unknown-47', 'all', 3),'results').length, 0);
  for (const kind of ['Graphics','html']) {
    const row = lib.db.prepare('SELECT p.id FROM passages p JOIN documents d ON d.id=p.doc_id WHERE d.kind=? LIMIT 1').get(kind);
    const id = text(row,'id');
    assert.equal(record(await lib.verify(id)).verified, true);
    checks.push({ kind, id, verified: true });
  }
  const report = { at: new Date().toISOString(), checks, sourceFilters: true, allSources: true, missingEvidence: true, citationLines: true, stats: lib.stats() };
  writeFileSync(join(root,'private','evidence','real-retrieval.json'),JSON.stringify(report,null,2),{mode:0o600});
  process.stdout.write(JSON.stringify({ passed: true, checks, missingEvidence: true, citationLines: true },null,2)+'\n');
} finally { lib.close(); }
