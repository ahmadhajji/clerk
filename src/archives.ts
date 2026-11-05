import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, basename, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import yauzl from 'yauzl';
import type { Entry, ZipFile } from 'yauzl';

export const SOURCES = ['amboss', 'uworld', 'uptodate'] satisfies string[];
export type Source = 'amboss' | 'uworld' | 'uptodate';
export function source(value: string): Source {
  if (value === 'amboss' || value === 'uworld' || value === 'uptodate') return value;
  throw new Error(`Unknown library: ${value}`);
}
export interface Archive { source: Source; name: string; dbMember: string }
export const ARCHIVES: Archive[] = [
  { source: 'amboss', name: 'amboss-library.zip', dbMember: 'amboss-library/amboss-2025.db' },
  { source: 'uworld', name: 'uworld-library.zip', dbMember: 'uworld-library/uworldstep1library-March-2026.db' },
  { source: 'uptodate', name: 'uptodate.zip', dbMember: 'uptodate/uptodate-medical-library.db' },
];
export async function fileHash(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const data of createReadStream(path)) hash.update(data);
  return hash.digest('hex');
}
export async function visitZip(path: string, visit: (zip: ZipFile, entry: Entry) => Promise<void>): Promise<void> {
  const zip = await new Promise<ZipFile>((resolve, reject) => yauzl.open(path, { lazyEntries: true, autoClose: false }, (error, result) => error || !result ? reject(error ?? new Error('No ZIP')) : resolve(result)));
  try {
    await new Promise<void>((resolve, reject) => {
      zip.on('error', reject);
      zip.on('end', resolve);
      zip.on('entry', (entry: Entry) => {
        // Reject traversal and symlinks even though destinations never use arbitrary member paths.
        if (entry.fileName.startsWith('/') || entry.fileName.split('/').includes('..') || ((entry.externalFileAttributes >>> 16) & 0o170000) === 0o120000) { reject(new Error(`Unsafe ZIP member: ${entry.fileName}`)); return; }
        visit(zip, entry).then(() => zip.readEntry(), reject);
      });
      zip.readEntry();
    });
  } finally { zip.close(); }
}
export function zipStream(zip: ZipFile, entry: Entry): Promise<NodeJS.ReadableStream> {
  if (entry.isEncrypted()) throw new Error(`Encrypted member: ${entry.fileName}`);
  return new Promise((resolve, reject) => zip.openReadStream(entry, (error, stream) => error || !stream ? reject(error ?? new Error('No ZIP stream')) : resolve(stream)));
}
export async function entryText(zip: ZipFile, entry: Entry): Promise<string> {
  const max = 12 * 1024 * 1024;
  if (entry.uncompressedSize > max) throw new Error('HTML exceeds 12 MiB limit');
  const parts: Buffer[] = [];
  let bytes = 0;
  for await (const data of await zipStream(zip, entry)) {
    const part = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
    bytes += part.length;
    if (bytes > max) throw new Error('Decompression exceeds declared limit');
    parts.push(part);
  }
  return Buffer.concat(parts).toString('utf8');
}
export async function extractDatabase(root: string, archive: Archive, hash: string): Promise<string> {
  // A completed marker is written only after the database AND its WAL sidecars finish.
  const dir = join(root, 'private', 'extracted', archive.source, hash);
  const path = join(dir, basename(archive.dbMember));
  const marker = join(dir, 'complete.json');
  if (existsSync(marker) && existsSync(path)) return path;
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  let found = false;
  await visitZip(join(root, 'private', 'archives', archive.name), async (zip, entry) => {
    if (![archive.dbMember, archive.dbMember + '-wal', archive.dbMember + '-shm'].includes(entry.fileName)) return;
    if (entry.uncompressedSize > 8 * 1024 ** 3) throw new Error('Database exceeds 8 GiB limit');
    const target = join(dir, basename(entry.fileName));
    mkdirSync(dirname(target), { recursive: true });
    const temp = target + '.partial';
    rmSync(temp, { force: true });
    await pipeline(await zipStream(zip, entry), createWriteStream(temp, { mode: 0o600 }));
    renameSync(temp, target);
    if (entry.fileName === archive.dbMember) found = true;
  });
  if (!found) throw new Error(`Missing SQLite member ${archive.dbMember}`);
  writeFileSync(marker, JSON.stringify({ archive: archive.name, hash }), { mode: 0o600 });
  return path;
}
