import {chromium} from 'playwright';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
import {CITIES} from '../src/levels.js';
const manifest=JSON.parse(fs.readFileSync('static/postcards/manifest.json','utf8'));
assert.equal(manifest.length,22);assert.equal(new Set(manifest.flatMap(x=>x.sceneHashes)).size,88);
for(const id of [...CITIES.map(c=>c.id),'weekly','events'])assert.ok(manifest.some(x=>x.id===id&&x.scenes===4&&x.width>=1536&&x.height>=1024));
assert.deepEqual(JSON.parse(fs.readFileSync('static/ui/mira.json','utf8')).alpha,[0,0]);
const out='test-results/postcard-art';fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({channel:'chrome'}),errors=[];
try{
  const p=await b.newPage({viewport:{width:1280,height:800},locale:'ru-RU'}),remote=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url())});
  await p.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);await p.waitForFunction(()=>window.__PM_BOOT_DONE);
  assert.equal(await p.evaluate(()=>Object.keys(__POSTCARD_ART__).length),22);
  const result=await p.evaluate(async()=>{
    const A=__lib.postcardArt,images=[];
    for(let city=0;city<20;city++){
      await A.loadPostcardArt(__lib.levels.CITIES[city].id);
      const cards=[0,1,2,3].map(v=>__lib.postcardURL(city,360,v));if(new Set(cards).size!==4)throw Error('Repeated city postcards');images.push({city,cards});
    }
    for(const id of ['weekly','events'])await A.loadPostcardArt(id);
    const full=[...__lib.levels.CITIES.map(c=>c.id),'weekly','events'].filter(id=>A.postcardArtStatus(id)?.image).length;
    const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=20*240;const g=canvas.getContext('2d');
    for(const row of images)for(let v=0;v<4;v++){const image=new Image();await new Promise(r=>{image.onload=r;image.src=row.cards[v]});g.drawImage(image,v*360,row.city*240,360,240);}
    return {sheet:canvas.toDataURL('image/jpeg',.86),full};
  });
  fs.writeFileSync(out+'/eighty-city-postcards.jpg',Buffer.from(result.sheet.split(',')[1],'base64'));assert.ok(result.full<=4);
  await p.evaluate(()=>__game.ui.journal());await p.locator('.mira-note img').waitFor();assert.ok(await p.locator('.mira-note img').evaluate(i=>i.complete&&i.naturalWidth===512));
  await p.screenshot({path:out+'/journal-with-mira.png',animations:'disabled'});
  await p.evaluate(()=>{__game.ui.closeModal();__game.startTrip('paris-evening',0);});await p.waitForTimeout(500);await p.screenshot({path:out+'/paris-event.png',animations:'disabled'});
  assert.deepEqual(remote,[]);assert.deepEqual(errors,[]);
  fs.writeFileSync(out+'/report.json',JSON.stringify({date:new Date().toISOString(),cityIllustrations:80,specialIllustrations:8,actualTransparency:true,fullImageCache:result.full,remote,errors},null,2));
  console.log('PASS: 80 different city illustrations, 8 special scenes, transparent guide, local assets and four-atlas memory limit.');
}finally{await b.close();}
