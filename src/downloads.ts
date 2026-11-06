import { createHash } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import { link, mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { ARCHIVES, fileHash } from './archives.js';
import type { Archive, Source } from './archives.js';

export const LIBRARY_RELEASE = 'library-snapshots-v1';
export type LibraryAsset = Pick<Archive, 'source' | 'name'> & {
  url: string;
  bytes: number;
  sha256: string;
};
const identities: Record<Source, Pick<LibraryAsset, 'bytes' | 'sha256'>> = {
  amboss: { bytes: 483420256, sha256: 'f2c0a97a48503071d3755c62911929835b33cc01038d19d38ee0c2e79cf9f0c3' },
  uworld: { bytes: 1372636224, sha256: '9fbc70a0cb5d2049fb3f2a6474df9569688fbc593b743dcbee304bf74205e517' },
  uptodate: { bytes: 993691487, sha256: '4eda9b27caf1be4f9f1d155a83d6d41e6386dfb7148f661d09b1a37d1ba2942c' },
};
export const LIBRARY_ASSETS: LibraryAsset[] = ARCHIVES.map(({ source, name }) => ({
  source, name, ...identities[source],
  url: `https://github.com/ahmadhajji/clerk/releases/download/${LIBRARY_RELEASE}/${name}`,
}));
interface DownloadResult {
  source: Source;
  path: string;
  status: 'downloaded' | 'verified_existing';
}

async function verifyExisting(path: string, asset: LibraryAsset): Promise<void> {
  const info = await stat(path);
  if (!info.isFile() || info.size !== asset.bytes || await fileHash(path) !== asset.sha256) {
    throw new Error(`Existing ${asset.name} differs from the pinned release; it was preserved. Move it aside explicitly before downloading this snapshot.`);
  }
}

export async function downloadLibraries({ root, assets = LIBRARY_ASSETS, onProgress = () => {} }: {
  root: string;
  assets?: readonly LibraryAsset[];
  onProgress?: (message: string) => void;
}): Promise<DownloadResult[]> {
  const privateDir = join(root, 'private');
  const archiveDir = join(privateDir, 'archives');
  await mkdir(privateDir, { recursive: true, mode: 0o700 });
  await mkdir(archiveDir, { recursive: true, mode: 0o700 });
  const results: DownloadResult[] = [];
  for (const asset of assets) {
    const path = join(archiveDir, asset.name);
    if (existsSync(path)) {
      await verifyExisting(path, asset);
      onProgress(`${asset.source}: existing archive verified`);
      results.push({ source: asset.source, path, status: 'verified_existing' });
      continue;
    }
    onProgress(`${asset.source}: downloading ${(asset.bytes / 1024 ** 2).toFixed(0)} MiB`);
    const tempDir = await mkdtemp(join(archiveDir, '.download-'));
    const partial = join(tempDir, 'archive.partial');
    try {
      const response = await fetch(asset.url, { signal: AbortSignal.timeout(30 * 60_000) });
      if (!response.ok || !response.body) {
        await response.body?.cancel();
        throw new Error(`Cannot download ${asset.name}: HTTP ${response.status}. The release may be private or unavailable; see docs/getting-started.md.`);
      }
      const reader = response.body.getReader();
      const hash = createHash('sha256');
      let bytes = 0;
      async function* chunks(): AsyncGenerator<Uint8Array> {
        try {
          for (;;) {
            const item = await reader.read();
            if (item.done) break;
            bytes += item.value.byteLength;
            if (bytes > asset.bytes) throw new Error(`Download size exceeds pinned size for ${asset.name}`);
            hash.update(item.value);
            yield item.value;
          }
          if (bytes !== asset.bytes || hash.digest('hex') !== asset.sha256) {
            throw new Error(`Download size or SHA-256 mismatch for ${asset.name}`);
          }
        } finally {
          await reader.cancel();
          reader.releaseLock();
        }
      }
      await pipeline(Readable.from(chunks()), createWriteStream(partial, { flags: 'wx', mode: 0o600 }));
      let status: DownloadResult['status'] = 'downloaded';
      try {
        await link(partial, path);
      } catch (error: unknown) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') throw error;
        await verifyExisting(path, asset);
        status = 'verified_existing';
      }
      results.push({ source: asset.source, path, status });
      onProgress(`${asset.source}: archive size and SHA-256 verified`);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }
  return results;
}
