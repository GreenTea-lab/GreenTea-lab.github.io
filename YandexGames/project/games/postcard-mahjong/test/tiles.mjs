import {chromium} from 'playwright';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const out='test-results/tiles';fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome'}),errors=[];const url=pathToFileURL(path.resolve('dist-single/index.html')).href;
try{
 for(const [width,height]of [[390,844],[320,568],[1280,800]]){
  const page=await browser.newPage({viewport:{width,height},locale:'ru-RU'});const remote=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url())});
  await page.goto(url);await page.waitForFunction(()=>window.__PM_BOOT_DONE);assert.equal(await page.evaluate(()=>__lib.tileArt.tileArtStatus().faces),32);assert.deepEqual(remote,[]);
  if(width===1280){
   const sheets=await page.evaluate(()=>{
    const {tiles:T}=__lib,result={};
    for(const [name,list,columns]of [['botanical',T.FACE_ORDER.map(f=>['ivory',f,'fruit']),8],['materials',T.STYLE_ORDER.map(s=>[s,'apple','fruit']),6],['collections',['fruit','classic','gems','stamps'].flatMap(set=>T.FACE_ORDER.slice(0,8).map(f=>['ivory',f,set])),8]]){
     const c=document.createElement('canvas');c.width=columns*140;c.height=Math.ceil(list.length/columns)*170;const g=c.getContext('2d');g.fillStyle='#d9d8c6';g.fillRect(0,0,c.width,c.height);
     list.forEach(([style,f,set],n)=>{const x=n%columns*140,y=Math.floor(n/columns)*170;g.drawImage(T.bodySprite(style,94),x+16,y+10);g.drawImage(T.faceSprite(f,83,set),x+21.5,y+28.5);g.fillStyle='#465a47';g.font='13px Arial';g.textAlign='center';g.fillText(name==='materials'?style:name==='collections'?set:f,x+70,y+155);});result[name]=c.toDataURL('image/png');
    }return result;
   });for(const [id,data]of Object.entries(sheets))fs.writeFileSync(`${out}/${id}.png`,Buffer.from(data.split(',')[1],'base64'));
   const hashes=await page.evaluate(()=>__lib.tiles.FACE_ORDER.map(f=>__lib.tiles.faceURL(f,128)));assert.equal(new Set(hashes).size,32);
  }
  for(const level of [0,9,49,999]){
   await page.evaluate(async i=>{await __lib.cityArt.loadCityArt(__lib.levels.CITIES[Math.floor(i/50)].id);__save.data.tut.first=1;__game.ui.closeModal();__game.startLevel(i,false);__game.ui.closeModal();__game.ui.tutorial(0);},level);
   await page.waitForTimeout(650);await page.evaluate(()=>{__game.view.anim.clear();__game.view.draw(0,__game.st)});await page.screenshot({path:`${out}/${width}-level-${level+1}.png`});
  }
  await page.evaluate(()=>__game.ui.pause());await page.waitForTimeout(250);await page.close();
 }
 // Broken image data must still allow a complete local startup and usable Canvas faces.
 const page=await browser.newPage({locale:'ru-RU'});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>Object.defineProperty(window,'__TILE_ART__',{get:()=>({fruits:'data:image/webp;base64,AAAA',flowers:'data:image/webp;base64,AAAA'}),set:()=>{}}));
 await page.goto(url);await page.waitForFunction(()=>window.__PM_BOOT_DONE);assert.equal(await page.evaluate(()=>__lib.tileArt.tileArtStatus().faces),0);assert.ok(await page.evaluate(()=>__lib.tiles.faceURL('apple',96).startsWith('data:image/png')));await page.close();
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/report.json`,JSON.stringify({date:new Date().toISOString(),faces:32,materials:12,faceSets:4,offline:true,missingArtFallback:true,viewports:[[390,844],[320,568],[1280,800]],levels:[1,10,50,1000],errors},null,2));console.log('PASS: 32 painted symbols, 12 materials, 4 collections, offline startup and missing-art fallback.');
}finally{await browser.close()}
