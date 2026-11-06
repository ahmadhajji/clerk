import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { downloadLibraries } from '../src/downloads.js';
import type { LibraryAsset } from '../src/downloads.js';

const original = Buffer.from('A bounded synthetic archive fixture, not publisher content.');
async function fixture(serve: (response: ServerResponse) => void) {
  const root = mkdtempSync(join(tmpdir(), 'clerk-download-'));
  let requests = 0;
  const server = createServer((_request, response) => { requests++; serve(response); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const asset: LibraryAsset = {
    source: 'amboss', name: 'amboss-library.zip', bytes: original.length,
    sha256: createHash('sha256').update(original).digest('hex'),
    url: `http://127.0.0.1:${address.port}/archive.zip`,
  };
  const directory = join(root, 'private', 'archives');
  return {
    root, asset, directory, path: join(directory, asset.name), requests: () => requests,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test('downloads streamed bytes, verifies identity, and reuses a valid archive without another request', async () => {
  const f = await fixture(response => { response.write(original.subarray(0, 13)); response.end(original.subarray(13)); });
  try {
    const first = await downloadLibraries({ root: f.root, assets: [f.asset] });
    assert.equal(first[0]?.status, 'downloaded');
    assert.deepEqual(readFileSync(f.path), original);
    assert.equal(existsSync(join(f.root, 'private', 'index.sqlite')), false);
    if (process.platform !== 'win32') assert.equal(statSync(f.path).mode & 0o777, 0o600);
    const second = await downloadLibraries({ root: f.root, assets: [f.asset] });
    assert.equal(second[0]?.status, 'verified_existing');
    assert.equal(f.requests(), 1);
    assert.deepEqual(readdirSync(f.directory), [f.asset.name]);
  } finally { await f.close(); }
});

test('an existing different snapshot is preserved without requesting or replacing it', async () => {
  const f = await fixture(response => response.end(original));
  try {
    await downloadLibraries({ root: f.root, assets: [f.asset] });
    const different = Buffer.from(original); different[0] = 0;
    writeFileSync(f.path, different);
    await assert.rejects(downloadLibraries({ root: f.root, assets: [f.asset] }), /differs.*preserved/);
    assert.deepEqual(readFileSync(f.path), different);
    assert.equal(f.requests(), 1);
  } finally { await f.close(); }
});

test('wrong hashes, truncated bytes, and oversized bodies never become installed archives', async () => {
  for (const body of [Buffer.alloc(original.length), original.subarray(0, 10), Buffer.concat([original, Buffer.from('extra')])]) {
    const f = await fixture(response => response.end(body));
    try {
      await assert.rejects(downloadLibraries({ root: f.root, assets: [f.asset] }), /size|SHA-256/);
      assert.equal(existsSync(f.path), false);
      assert.deepEqual(readdirSync(f.directory), []);
    } finally { await f.close(); }
  }
});

test('unavailable releases report HTTP failure, leave no archive, and can be retried', async () => {
  let available = false;
  const f = await fixture(response => {
    if (available) response.end(original);
    else { response.writeHead(404); response.end('Not Found'); }
  });
  try {
    await assert.rejects(downloadLibraries({ root: f.root, assets: [f.asset] }), /HTTP 404.*private or unavailable/);
    assert.equal(existsSync(f.path), false);
    assert.deepEqual(readdirSync(f.directory), []);
    available = true;
    await downloadLibraries({ root: f.root, assets: [f.asset] });
    assert.deepEqual(readFileSync(f.path), original);
  } finally { await f.close(); }
});

test('simultaneous downloads converge without overwriting the installed archive', async () => {
  const f = await fixture(response => response.end(original));
  try {
    const results = await Promise.all([
      downloadLibraries({ root: f.root, assets: [f.asset] }),
      downloadLibraries({ root: f.root, assets: [f.asset] }),
    ]);
    assert.deepEqual(results.flatMap(result => result.map(item => item.status)).sort(), ['downloaded', 'verified_existing']);
    assert.deepEqual(readFileSync(f.path), original);
    assert.deepEqual(readdirSync(f.directory), [f.asset.name]);
  } finally { await f.close(); }
});
