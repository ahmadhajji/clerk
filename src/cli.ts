import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { Library } from './library.js';
import { source } from './archives.js';
import { media } from './media.js';
import { downloadLibraries, LIBRARY_ASSETS } from './downloads.js';

const args = process.argv.slice(2);
const command = args.shift();
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function option(name: string, fallback: string): string {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing ${name} value`);
  args.splice(index, 2);
  return value;
}
function bounded(value: string, max: number): number {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0 || result > max) throw new Error(`Expected integer 0..${max}`);
  return result;
}
async function main(): Promise<void> {
  if (!command || command === 'help' || command === '--help') {
    process.stdout.write('Clerk, local snapshot retrieval\n\npnpm med download [--source amboss|uworld|uptodate]\npnpm med ingest [--source amboss|uworld|uptodate]\npnpm med search "key terms" [--source all|amboss|uworld|uptodate] [--limit 3] [--mode all|any|phrase]\npnpm med open <passage-id> [--context 1]\npnpm med verify <passage-id>\npnpm med media <passage-id> [--scope section|document] [--kind all|image|table] [--limit 3]\npnpm med stats\npnpm med audit\n\nDownload obtains the pinned library release and checks file sizes and SHA-256.\nSearch all uses the limit per library. Open writes a private citation file with surrounding passages.\n');
    return;
  }
  if (!['download','ingest','search','open','verify','stats','audit','media'].includes(command)) throw new Error(`Unknown command ${command}`);
  const selected = option('--source','all');
  if (command === 'download') {
    const selectedSource = selected === 'all' ? 'all' : source(selected);
    if (args.length !== 0) throw new Error('Download accepts only --source');
    const assets = LIBRARY_ASSETS.filter(asset => selectedSource === 'all' || asset.source === selectedSource);
    const archives = await downloadLibraries({ root, assets, onProgress: message => process.stderr.write(message + '\n') });
    process.stdout.write(JSON.stringify({ archives }, null, 2) + '\n');
    return;
  }
  const lib = new Library(root, command === 'ingest');
  try {
    let result: object;
    switch (command) {
      case 'ingest': await lib.ingest(selected === 'all' ? undefined : source(selected)); result = lib.stats(); break;
      case 'stats': result = lib.stats(); break;
      case 'audit': result = await lib.audit(); break;
      case 'search': {
        const limit = bounded(option('--limit','3'),20);
        const mode = option('--mode','all');
        if (!['all','any','phrase'].includes(mode)) throw new Error('Mode must be all, any, or phrase');
        result = lib.search(args.join(' '), selected === 'all' ? 'all' : source(selected),limit,mode === 'all' ? 'all' : mode === 'any' ? 'any' : 'phrase');
        break;
      }
      case 'open': {
        const radius = bounded(option('--context','1'),3);
        if (args.length !== 1 || !args[0]) throw new Error('Supply one passage ID');
        result = lib.show(args[0],radius); break;
      }
      case 'verify': if (args.length !== 1 || !args[0]) throw new Error('Supply one passage ID'); result = await lib.verify(args[0]); break;
      case 'media': {
        const limit=bounded(option('--limit','3'),5);
        const scope=option('--scope','section'); const kind=option('--kind','all');
        if(scope!=='section' && scope!=='document') throw new Error('Scope must be section or document');
        if(kind!=='all' && kind!=='image' && kind!=='table') throw new Error('Kind must be all, image, or table');
        if(args.length!==1 || !args[0]) throw new Error('Supply one passage ID');
        result=await media(lib,args[0],{limit,scope,kind}); break;
      }
      default: throw new Error('Unsupported command');
    }
    process.stdout.write(JSON.stringify(result,null,2) + '\n');
  } finally { lib.close(); }
}
main().catch((error: unknown) => { process.stderr.write((error instanceof Error ? error.message : String(error)) + '\n'); process.exitCode = 1; });
