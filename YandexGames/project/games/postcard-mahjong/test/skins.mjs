import {chromium} from 'playwright';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const out='test-results/skins';fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome'}),errors=[],report=[];const url=pathToFileURL(path.resolve('dist-single/index.html')).href;
try{
 for(const [width,height]of [[1280,800],[390,844],[320,568]]){
  const page=await browser.newPage({viewport:{width,height},locale:'ru-RU'});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.__PM_BOOT_DONE);assert.deepEqual(await page.evaluate(()=>[__lib.skinArt.skinArtStatus().fronts,__lib.skinArt.skinArtStatus().backs]),[12,12]);
  const variants=await page.evaluate(()=>__lib.tiles.STYLE_ORDER.map(s=>({s,front:__lib.tiles.tileURL(s,'apple',80),back:__lib.tiles.backURL(s,80)})));
  assert.equal(new Set(variants.map(v=>v.front)).size,12);assert.equal(new Set(variants.map(v=>v.back)).size,12);
  if(width===1280){const sheet=await page.evaluate(()=>{
   const T=__lib.tiles,names=['Имперская кость','Резной нефрит','Янтарные соты','Синий фарфор','Розовый кварц','Золотой обсидиан','Морской перламутр','Аквамариновая волна','Лавандовая мозаика','Резной орех','Терракотовое солнце','Лунная эмаль'];
   const c=document.createElement('canvas');c.width=1240;c.height=750;const g=c.getContext('2d');g.fillStyle='#d5d5c2';g.fillRect(0,0,c.width,c.height);
   T.STYLE_ORDER.forEach((s,n)=>{const x=n%4*310,y=Math.floor(n/4)*250;g.fillStyle='#f5f0e2';g.beginPath();g.roundRect(x+6,y+6,298,238,15);g.fill();g.drawImage(T.bodySprite(s,117),x+24,y+19);g.drawImage(T.faceSprite('apple',103),x+31,y+42.5);g.drawImage(T.bodySprite(s,117,'back'),x+164,y+19);g.font='16px Arial';g.fillStyle='#425b46';g.textAlign='center';g.fillText(names[n],x+155,y+216);});return c.toDataURL('image/png');
  });fs.writeFileSync(`${out}/twelve-materials.png`,Buffer.from(sheet.split(',')[1],'base64'));}
  await page.evaluate(()=>{__save.data.coins=10000;__game.ui.styles()});await page.waitForTimeout(350);assert.equal(await page.locator('.skin-card').count(),12);assert.equal(await page.locator('.skin-card img').count(),24);
  await page.screenshot({path:`${out}/${width}-workshop.png`});
  await page.locator('[data-decor="skin:obsidian"]').click();const after=await page.evaluate(()=>({style:__save.data.style,coins:__save.data.coins,owned:__save.data.styles.includes('obsidian')}));assert.deepEqual(after,{style:'obsidian',coins:8900,owned:true});
  await page.reload();await page.waitForFunction(()=>window.__PM_BOOT_DONE);assert.equal(await page.evaluate(()=>__save.data.style),'obsidian');
  for(const skin of ['porcelain','obsidian','walnut','midnight']){
   await page.evaluate(s=>{__save.data.tut.first=1;__game.ui.closeModal();__game.setStyle(s);__game.startLevel(49,false);__game.ui.closeModal();__game.ui.tutorial(0);__game.view.anim.clear();__game.view.draw(0,__game.st)},skin);await page.waitForTimeout(250);await page.screenshot({path:`${out}/${width}-${skin}-field.png`});
  }
  report.push({viewport:[width,height],fronts:12,backs:12,shopPurchaseAndRestore:true});await page.close();
 }
 const fallback=await browser.newPage({locale:'ru-RU'});fallback.on('pageerror',e=>errors.push(e.message));await fallback.addInitScript(()=>{let art;Object.defineProperty(window,'__TILE_ART__',{get:()=>({...art,'skins-front':'data:image/webp;base64,AAAA','skins-back':'data:image/webp;base64,AAAA'}),set:v=>art=v});});await fallback.goto(url);await fallback.waitForFunction(()=>window.__PM_BOOT_DONE);assert.equal(await fallback.evaluate(()=>__lib.skinArt.skinArtStatus().fronts),0);assert.equal(await fallback.evaluate(()=>__lib.tileArt.tileArtStatus().faces),32);assert.ok(await fallback.evaluate(()=>__lib.tiles.tileURL('walnut','apple',60).startsWith('data:image/png')));await fallback.close();
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/report.json`,JSON.stringify({report,missingSkinFallback:true,errors},null,2));console.log('PASS: 12 different fronts and 12 backs; workshop, purchase, restore, dense fields and missing-texture fallback.');
}finally{await browser.close()}
