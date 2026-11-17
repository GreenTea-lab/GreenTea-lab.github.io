import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {LOCATIONS,CLASSIC_LOCATIONS,SCHOLAR_LOCATIONS,locationFor} from '../src/locations.js';
assert.equal(CLASSIC_LOCATIONS.length,20);assert.equal(SCHOLAR_LOCATIONS.length,20);
assert.equal(new Set(LOCATIONS.map(x=>x.id)).size,40);
for(const mode of ['level','adult']){
  const counts=new Map();for(let n=0;n<1000;n++){const l=locationFor(n,mode);assert.equal(l.mode,mode);counts.set(l.id,(counts.get(l.id)||0)+1);}
  assert.equal(counts.size,20);assert([...counts.values()].every(n=>n===50));
  for(let n=50;n<1000;n+=50)assert.notEqual(locationFor(n-1,mode).id,locationFor(n,mode).id);
}
function jpegSize(buffer){
  let p=2;while(p<buffer.length){if(buffer[p]!==255){p++;continue;}const type=buffer[p+1];if([192,193,194].includes(type))return{width:buffer.readUInt16BE(p+7),height:buffer.readUInt16BE(p+5)};p+=2+buffer.readUInt16BE(p+2);}throw Error('Invalid JPEG');
}
const hashes=new Set();let totalBytes=0;
for(const l of LOCATIONS){
  for(const suffix of ['', '-thumb']){
    const b=fs.readFileSync('static/locations/'+l.id+suffix+'.jpg'),size=jpegSize(b);totalBytes+=b.length;
    assert.deepEqual(size,suffix?{width:640,height:240}:{width:1536,height:1024});
    if(!suffix)hashes.add(crypto.createHash('sha256').update(b).digest('hex'));
  }
}
assert.equal(hashes.size,40,'all 40 full backgrounds are distinct files');
const out='test-results/locations';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),errors=[],report=[];
const ready=p=>p.waitForFunction(()=>window.__app&&!document.querySelector('#boot'));
try{
  for(const [name,width,height,locale]of [['desktop',1440,900,'ru-RU'],['phone',390,844,'ru-RU'],['small',320,568,'ru-RU'],['landscape',844,390,'ru-RU'],['english',1280,800,'en-US']]){
    const ctx=await browser.newContext({viewport:{width,height},locale,reducedMotion:'reduce'}),p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
    await p.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);await ready(p);
    await p.evaluate(()=>__app.save.data.tutDone=true);
    for(const mode of ['level','adult']){
      for(const n of [0,49,50,499,999]){
        await p.evaluate(({n,mode})=>__app.openLevel(n,mode),{n,mode});
        const expected=locationFor(n,mode).id;
        await p.waitForFunction(id=>__app.scene.loaded&&__app.scene.ch===id&&document.querySelector('.illustrated-bg.on')?.dataset.id===id,expected);
        assert.equal(await p.locator('.g-location').innerText(),locationFor(n,mode).name[locale==='en-US'?'en':'ru']);
        assert.equal(await p.locator('.kbd').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight+1),true,name+' keyboard clipped');
        if(n===0||n===499||n===999)await p.screenshot({path:`${out}/${name}-${mode}-${n+1}.png`});
      }
      await p.locator('.g-back').click();
      assert.equal(await p.locator('.location-chapter').count(),20);
      assert.equal(await p.locator('.tile').count(),1000);
      assert.equal(await p.locator('.location-chapter[open]').count(),1);
      assert.equal(await p.locator('.location-chapter[open] .tile').count(),50);
      const names=await p.locator('.location-chapter .chh b').allTextContents();assert.equal(new Set(names).size,20);
      await p.locator('.location-chapter summary').nth(2).click();assert.equal(await p.locator('.location-chapter[open]').count(),2);
      assert.equal(await p.locator('.sheet').count(),0);
      await p.screenshot({path:`${out}/${name}-${mode}-chapters.png`});
    }
    await p.evaluate(()=>{__app.save.data.settings.theme='dark';__app.openLevel(0,'adult');});
    await p.waitForFunction(()=>__app.scene.loaded&&document.querySelector('.illustrated-bg.on')?.dataset.theme==='dark');
    await p.screenshot({path:`${out}/${name}-scholars-night.png`});
    await p.evaluate(()=>{__app.save.data.settings.theme='contrast';__app.openLevel(0);});
    assert.equal(await p.locator('.illustrated-bg.on').count(),0);
    await p.evaluate(()=>{__app.save.data.settings.theme='light';__app.save.data.settings.scenes=false;__app.openLevel(500);});
    assert.equal(await p.locator('.illustrated-bg.on').count(),0);
    await p.evaluate(()=>{__app.save.data.settings.scenes=true;__app.openLevel(1);__app.openLevel(900,'adult');__app.openLevel(400);});
    await p.waitForFunction(id=>__app.scene.loaded&&document.querySelector('.illustrated-bg.on')?.dataset.id===id,locationFor(400).id);
    assert.equal(await p.evaluate(()=>__app.scene.partType()),'none','reduced motion');
    await ctx.close();report.push({name,modeCounts:[20,20],levelsPerLocation:50,passed:true});
  }
}finally{await browser.close();}
assert.deepEqual(errors,[]);
fs.writeFileSync(out+'/report.json',JSON.stringify({locations:40,uniqueImages:hashes.size,assetBytes:totalBytes,report,errors},null,2));
console.log('PASS 40 unique backgrounds, 20+20 chapters, 50 levels per location, names, themes, rapid switching and responsive layouts');
