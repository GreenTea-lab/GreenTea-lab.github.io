import {chromium} from 'playwright';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const out='test-results/collections';fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome'}),errors=[],report=[];const url=pathToFileURL(path.resolve('dist-single/index.html')).href;
try{
 for(const [width,height]of [[1280,800],[390,844],[320,568]]){
  const page=await browser.newPage({viewport:{width,height},locale:'ru-RU'}),remote=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url())});
  await page.goto(url);await page.waitForFunction(()=>window.__PM_BOOT_DONE);assert.deepEqual(await page.evaluate(()=>__lib.tileArt.tileArtStatus().collections),{fruit:32,gems:32,stamps:32});assert.deepEqual(remote,[]);
  const counts=await page.evaluate(()=>Object.fromEntries(['fruit','classic','gems','stamps'].map(set=>[set,new Set(__lib.tiles.FACE_ORDER.map(f=>__lib.tiles.faceSprite(f,128,set).toDataURL())).size])));assert.deepEqual(counts,{fruit:32,classic:32,gems:32,stamps:32});
  if(width===1280){const sheets=await page.evaluate(()=>{
   const T=__lib.tiles,result={},sets=['fruit','classic','gems','stamps'],names=['Ботаническая эмаль','Императорская классика','Ювелирные самоцветы','Марки путешествий'];
   const draw=(g,s,f,set,x,y,w)=>{const D=T.tileDims(w),sz=T.faceSize(w,set,f);g.drawImage(T.bodySprite(s,w),x,y);g.drawImage(T.faceSprite(f,sz,set),x+(D.w-sz)/2,y+(D.h-sz)/2);};
   for(const [si,set]of sets.entries()){
    const c=document.createElement('canvas');c.width=1120;c.height=720;const g=c.getContext('2d');g.fillStyle='#ddd9c9';g.fillRect(0,0,c.width,c.height);g.font='25px Georgia';g.fillStyle='#385344';g.textAlign='center';g.fillText(names[si],560,38);
    T.FACE_ORDER.forEach((f,n)=>draw(g,'ivory',f,set,n%8*140+20,Math.floor(n/8)*164+64,94));result[set]=c.toDataURL('image/png');
   }
   const c=document.createElement('canvas');c.width=1120;c.height=720;const g=c.getContext('2d');g.fillStyle='#ddd9c9';g.fillRect(0,0,c.width,c.height);
   sets.forEach((set,i)=>{T.FACE_ORDER.slice(0,8).forEach((f,n)=>draw(g,'ivory',f,set,n*140+20,i*180+7,94));g.fillStyle='#385344';g.font='17px Georgia';g.textAlign='center';g.fillText(names[i],560,i*180+165);});result['four-collections']=c.toDataURL('image/png');
   const m=document.createElement('canvas');m.width=1320;m.height=640;const mg=m.getContext('2d');mg.fillStyle='#ddd9c9';mg.fillRect(0,0,m.width,m.height);sets.forEach((set,i)=>T.STYLE_ORDER.forEach((s,n)=>draw(mg,s,'apple',set,n*110+6,i*160+10,86)));result['skin-combinations']=m.toDataURL('image/png');return result;
  });for(const [id,data]of Object.entries(sheets))fs.writeFileSync(`${out}/${id}.png`,Buffer.from(data.split(',')[1],'base64'));}
  for(const set of ['fruit','classic','gems','stamps']){
   await page.evaluate(set=>{__save.data.tut.first=1;__game.ui.closeModal();__game.setFaces(set);__game.startLevel(49,false);__game.ui.closeModal();__game.ui.tutorial(0);__game.view.anim.clear();__game.view.draw(0,__game.st)},set);await page.waitForTimeout(250);await page.screenshot({path:`${out}/${width}-${set}-field.png`});
   await page.evaluate(()=>{__game.startLevel(0,false);__game.ui.closeModal();__game.ui.tutorial(0);__game.view.anim.clear()});
   const before=await page.evaluate(()=>__game.game.left),points=await page.evaluate(()=>__game.game.hint().pair.map(i=>__game.view.tileCenter(i)));for(const p of points)await page.mouse.click(p.x,p.y);assert.equal(await page.evaluate(()=>__game.game.left),before-2);
  }
  await page.evaluate(()=>{__game.toMenu();__game.setFaces('fruit');__save.data.coins=10000;__game.ui.styles()});await page.locator('.face-card').first().scrollIntoViewIfNeeded();await page.waitForTimeout(200);await page.screenshot({path:`${out}/${width}-workshop.png`});await page.locator('[data-decor="faces:stamps"]').click();assert.equal(await page.evaluate(()=>__save.data.faces),'stamps');assert.equal(await page.evaluate(()=>__save.data.coins),9200);await page.reload();await page.waitForFunction(()=>window.__PM_BOOT_DONE);assert.equal(await page.evaluate(()=>__save.data.faces),'stamps');report.push({viewport:[width,height],uniqueSymbols:counts,matchingByRealClicks:true,purchaseAndRestore:true});await page.close();
 }
 const fallback=await browser.newPage({locale:'ru-RU'});fallback.on('pageerror',e=>errors.push(e.message));await fallback.addInitScript(()=>{let art;Object.defineProperty(window,'__TILE_ART__',{get:()=>({...art,...Object.fromEntries(['fruits','flowers','gems-a','gems-b','stamps-a','stamps-b'].map(k=>[k,'data:image/webp;base64,AAAA']))}),set:v=>art=v});});await fallback.goto(url);await fallback.waitForFunction(()=>window.__PM_BOOT_DONE);assert.equal(await fallback.evaluate(()=>__lib.tileArt.tileArtStatus().totalFaces),0);assert.ok(await fallback.evaluate(()=>['fruit','classic','gems','stamps'].every(set=>__lib.tiles.tileURL('ivory','apple',60,set).startsWith('data:image/png'))));await fallback.close();
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/report.json`,JSON.stringify({report,offline:true,missingAtlasFallback:true,errors},null,2));console.log('PASS: four collections, 128 distinct symbols, actual matching, purchase/restore and fallback at three screen sizes.');
}finally{await browser.close()}
