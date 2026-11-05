import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { ARCHIVES } from '../src/archives.js';
import { Library } from '../src/library.js';
import { describeMedia, imageExtension, media } from '../src/media.js';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQ1sAAAAASUVORK5CYII=','base64');
function record(value: unknown): Record<string,unknown> {
  if(typeof value!=='object' || value===null || Array.isArray(value)) throw new Error('Expected record');
  return Object.fromEntries(Object.entries(value));
}
function rows(value: unknown,key: string): Record<string,unknown>[] {
  const result=record(value)[key]; if(!Array.isArray(result)) throw new Error('Expected list'); return result.map(record);
}
function text(value:unknown,key:string):string { const v=record(value)[key]; if(typeof v!=='string') throw new Error('Expected text');return v; }
async function fixture():Promise<{lib:Library;root:string;close:()=>void}> {
  const root=mkdtempSync(join(tmpdir(),'medlibrary-media-'));mkdirSync(join(root,'private','archives'),{recursive:true});
  const caption=Buffer.from('<p>Source caption describing the original figure.</p>').toString('base64');
  for(const archive of ARCHIVES) {
    const db=new DatabaseSync(join(root,basename(archive.dbMember)));
    db.exec('CREATE TABLE Docs(id INTEGER PRIMARY KEY,title TEXT,doc TEXT,path TEXT); CREATE TABLE Graphics(id INTEGER PRIMARY KEY,title TEXT,imageHtml TEXT,base64Image TEXT)');
    const image=archive.source==='amboss' ? `<span data-type="image" data-source="../Images/pixel.png" data-title="${Buffer.from('Original source image').toString('base64')}" data-description="${caption}"><img src="" title="Pixel"></span>` : archive.source==='uworld' ? '<img src="../Images/pixel.png" alt="UWorld fixture image">' : '<a class="graphic graphicRef123" href="javascript:appAction(dangerous())">figure 1</a>';
    db.prepare('INSERT INTO Docs VALUES(?,?,?,?)').run(1,'Fixture topic',`<h2>Appearance</h2><p>Original appearance description provides enough context for indexing and source association.</p>${image}<h2>Other section</h2><p>Different section text should not automatically inherit the original image reference.</p><img src="../../../outside/pixel.png"><img src="../Images/danger.svg"><img src="https://external.test/pixel.png">`,'base/1.html');
    db.prepare('INSERT INTO Graphics VALUES(?,?,?,?)').run(123,'Original database image','<p>Source graphic caption.</p><img src="misleading.gif">',png.toString('base64'));
    db.prepare('INSERT INTO Graphics VALUES(?,?,?,?)').run(124,'Source classification table','<table><caption>Classification</caption><tr><th>Class</th><th>Finding</th></tr><tr><td>A</td><td>Source-defined diagnostic finding</td></tr></table>',null);
    db.close();
  }
  execFileSync('python3',['-c',`import sys,json,pathlib,zipfile,base64
r=pathlib.Path(sys.argv[1])
for a in json.loads(sys.argv[2]):
 with zipfile.ZipFile(r/'private/archives'/a['name'],'w',zipfile.ZIP_DEFLATED) as z:
  z.write(r/pathlib.Path(a['dbMember']).name,a['dbMember'])
  prefix=a['dbMember'].rsplit('/',1)[0]
  z.writestr(prefix+'/Images/pixel.png',base64.b64decode(sys.argv[3]))
  z.writestr(prefix+'/Other/pixel.png',base64.b64decode(sys.argv[3]))
  z.writestr(prefix+'/Images/danger.svg','<svg onload="dangerous()"></svg>')
  z.writestr(prefix+'/Images/figure.html','<h2>Standalone figure</h2><p>Source explanation for a standalone HTML figure with an associated image.</p><img src="pixel.png">')
`,root,JSON.stringify(ARCHIVES),png.toString('base64')]);
  const lib=new Library(root,true);await lib.ingest();
  return {lib,root,close:()=>{lib.close();rmSync(root,{recursive:true,force:true});}};
}
function passage(lib:Library,source:string,section:string):string {
  return text(lib.db.prepare('SELECT p.id FROM passages p JOIN documents d ON d.id=p.doc_id WHERE d.source=? AND d.kind=? AND p.section=? LIMIT 1').get(source,'Docs',section),'id');
}

test('media discovery preserves section, decodes source captions, and expands merged table labels',()=> {
  const refs=describeMedia('<head><script>run()</script></head><h2>Findings</h2><img src="image.png" alt="Characteristic appearance"><table><caption>Source comparison</caption><tr><th>Group</th><th>Finding</th></tr><tr><td rowspan="2">A</td><td>First</td></tr><tr><td>Second</td></tr></table>');
  assert.equal(refs[0]?.section,'Findings');assert.equal(refs[0]?.caption,'Characteristic appearance');
  const table=refs.find(r=>r.kind==='table');assert.ok(table && table.kind==='table');
  assert.match(table.markdown,/\| A \| First \|/);assert.match(table.markdown,/\| A \| Second \|/);assert.equal(table.mergedCells,true);
  assert.equal(imageExtension(png),'png');assert.equal(imageExtension(Buffer.from('<svg>')) ,null);
});

test('all three source image paths materialize exact original bytes with private provenance and stable links',async()=> {
  const f=await fixture();try {
    for(const src of ['amboss','uworld','uptodate']) {
      const id=passage(f.lib,src,'Appearance');
      const result=await media(f.lib,id,{limit:3,scope:'section',kind:'image'});
      const assets=rows(result,'assets');assert.equal(assets.length,1);
      const image=assets[0];const path=text(image,'path');assert.deepEqual(readFileSync(path),png);
      assert.match(text(image,'markdown'),new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
      const receipt=readFileSync(text(image,'provenancePath'),'utf8');assert.match(receipt,/Archive SHA-256/);assert.match(receipt,/Source HTML SHA-256/);assert.match(receipt,/Image SHA-256/);
      assert.equal(text(image,'section'),'Appearance');
      if(src==='amboss') { assert.equal(text(image,'title'),'Original source image');assert.equal(text(image,'caption'),'Source caption describing the original figure.'); }
      const repeated=rows(await media(f.lib,id,{limit:1,scope:'document',kind:'image'}),'assets')[0];assert.equal(text(repeated,'path'),path);
    }
  } finally {f.close();}
});

test('missing section visuals and invalid, ambiguous, and active-content locators stay unavailable',async()=> {
  const f=await fixture();try {
    const id=passage(f.lib,'amboss','Other section');
    const result=await media(f.lib,id,{limit:3,scope:'section',kind:'image'});
    assert.deepEqual(rows(result,'assets'),[]);const failures=rows(result,'unavailable');assert.equal(failures.length,3);
    assert.ok(failures.some(r=>text(r,'reason').includes('SVG/HTML')));
    assert.ok(failures.filter(r=>text(r,'reason').includes('missing or ambiguous')).length>=2);
    assert.ok(rows(result,'availableSections').some(r=>r.section==='Appearance' && r.images===1));
  }finally{f.close();}
});

test('direct UpToDate table rows return bounded selectable tables with source provenance',async()=> {
  const f=await fixture();try {
    const row=f.lib.db.prepare("SELECT id FROM passages WHERE doc_id='uptodate:Graphics:124' LIMIT 1").get();
    const result=await media(f.lib,text(row,'id'),{limit:1,scope:'section',kind:'table'});
    const table=rows(result,'assets')[0];assert.equal(record(table).kind,'table');assert.match(text(table,'markdown'),/Source-defined diagnostic finding/);assert.equal(record(table).truncated,false);
    assert.match(readFileSync(text(table,'provenancePath'),'utf8'),/Graphics:124/);
  }finally{f.close();}
});

test('changed source HTML refuses association before extracting or displaying media',async()=> {
  const f=await fixture();try {
    const id=passage(f.lib,'amboss','Appearance');const archive=f.lib.db.prepare("SELECT extracted FROM archives WHERE source='amboss'").get();
    const db=new DatabaseSync(text(archive,'extracted'));db.exec("UPDATE Docs SET doc='<p>Changed source content</p>' WHERE id=1");db.close();
    await assert.rejects(media(f.lib,id,{limit:1,scope:'document',kind:'image'}),/Source document changed/);
  }finally{f.close();}
});

test('standalone HTML images resolve relative to the actual ZIP member directory',async()=> {
  const f=await fixture();try {
    const row=f.lib.db.prepare("SELECT p.id FROM passages p JOIN documents d ON d.id=p.doc_id WHERE d.source='uworld' AND d.kind='html' LIMIT 1").get();
    const result=await media(f.lib,text(row,'id'),{limit:1,scope:'document',kind:'image'});
    const assets=rows(result,'assets');assert.equal(assets.length,1);
    assert.deepEqual(readFileSync(text(assets[0],'path')),png);
    assert.equal(record(assets[0]).locator,'uworld-library/Images/pixel.png');
  }finally{f.close();}
});
