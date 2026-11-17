import {chromium} from 'playwright';
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const out='test-results/refinement';fs.mkdirSync(out,{recursive:true});
const url=pathToFileURL(path.resolve('dist-vk-single/index.html')).href;
const browser=await chromium.launch({channel:'chrome'});
const ready=page=>page.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
try{
 for(const [name,width,height]of [['desktop',1440,900],['phone',390,844],['small',320,568],['landscape',844,390]]){
  for(const locale of ['ru-RU','en-US']){
   const ctx=await browser.newContext({viewport:{width,height},locale,reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{document.fonts.load=()=>new Promise(()=>{});});
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.locator('#loader').waitFor();await page.waitForTimeout(220);
   await page.screenshot({path:`${out}/${name}-${locale}-loading.png`});
   const loader=await page.locator('.loading-card').boundingBox();assert(loader.x>=18&&loader.y>=0&&loader.x+loader.width<=width-18&&loader.y+loader.height<=height-10);
   assert.equal(await page.locator('.loading-track i').evaluate(e=>getComputedStyle(e).animationName),'none');
   await ready(page);
   const menu=await page.evaluate(()=>[...document.querySelectorAll('.tile>span')].map(e=>{const b=e.parentElement.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(e);const a=r.getBoundingClientRect();return {text:e.textContent,ok:a.left>=b.left+3&&a.right<=b.right-3&&a.bottom<=b.bottom-2};}));assert(menu.length>0);assert(menu.every(x=>x.ok),JSON.stringify(menu));
   const top=await page.locator('.topbar').boundingBox();assert(top.x>=18&&top.x+top.width<=width-18);
   if(locale==='ru-RU')await page.screenshot({path:`${out}/${name}-menu.png`});
   await page.evaluate(()=>__game.ui.settings());
   const panel=await page.locator('.mpanel').boundingBox();assert(panel.x>=17&&panel.x+panel.width<=width-17&&panel.y>=17);
   const close=await page.locator('.mhead button').boundingBox();assert(close.x+close.width<=panel.x+panel.width-12);
   if(locale==='ru-RU')await page.screenshot({path:`${out}/${name}-settings.png`});
   for(const tab of ['blocks','boards','effects','album']){
    await page.evaluate(tab=>__game.ui.styles(tab),tab);await page.waitForFunction(()=>[...document.querySelectorAll('.modal img')].every(i=>i.complete&&i.naturalWidth));
    assert.equal(await page.evaluate(()=>document.querySelector('.mpanel').scrollWidth>document.querySelector('.mpanel').clientWidth+1),false,tab+' overflows');
    if(locale==='ru-RU')await page.screenshot({path:`${out}/${name}-${tab}.png`});
   }
   assert.equal(await page.locator('[data-tab=cozy]').count(),0);
   await page.evaluate(()=>{__save.data.levels={0:{stars:3},1:{stars:3},2:{stars:3}};__game.toMenu();});
   assert.equal(await page.evaluate(()=>__game.view.roomState.objects.length),5);
   await page.evaluate(()=>{__game.startLevel(0);__game.ui.levelResult({L:__game.st.game.level,stars:3,moves:3,coins:30,newDecor:['yarn','plate'],last:false});});
   await page.locator('[data-decor]').click();assert.equal(await page.evaluate(()=>__game.state),'menu');assert.equal(await page.locator('.modal').count(),0);
   assert.deepEqual(errors,[]);await ctx.close();console.log('PASS layout, loader, room, reward return:',name,locale);
  }
 }
 const ctx=await browser.newContext({viewport:{width:1440,height:900},locale:'ru-RU',reducedMotion:'reduce'}),page=await ctx.newPage();await page.goto(url);await ready(page);
 const audit=await page.evaluate(async()=>{
  const ids=Object.keys(__gfx.STYLES),c=document.createElement('canvas');c.width=1280;c.height=24*104;const g=c.getContext('2d');g.fillStyle='#684b35';g.fillRect(0,0,c.width,c.height);
  ids.forEach((id,n)=>{g.fillStyle='#f8e4bc';g.font='18px Arial';g.fillText(id,12,n*104+58);for(let ci=0;ci<8;ci++)g.drawImage(__gfx.blockSprite(id,ci,90),210+ci*126,n*104+7,90,90);});
  let alpha=0;for(const url of Object.values(__FB_DECOR__)){const i=new Image();i.src=url;await i.decode();const d=document.createElement('canvas');d.width=d.height=384;const dg=d.getContext('2d');dg.drawImage(i,0,0);if(dg.getImageData(0,0,1,1).data[3]===0)alpha++;}
  return {sheet:c.toDataURL().split(',')[1],skins:ids.length,alpha,placed:__gfx.buildTable(960,560,1,'autumn',__gfx.DECOR.map(x=>x.id),[],null).placed.length};
 });assert.equal(audit.skins,24);assert.equal(audit.alpha,26);assert.equal(audit.placed,13);fs.writeFileSync(out+'/24-skins-8-colors.png',Buffer.from(audit.sheet,'base64'));
 await page.evaluate(()=>{__save.data.levels=Object.fromEntries(Array.from({length:40},(_,i)=>[i,{stars:3}]));__game.toMenu();});
 await page.waitForTimeout(250);await page.screenshot({path:out+'/all-decor.png'});await ctx.close();
 const err=await browser.newContext({locale:'en-US'}),p=await err.newPage();
 await p.addInitScript(()=>{if(!sessionStorage.getItem('retry-tested')){sessionStorage.setItem('retry-tested','1');HTMLCanvasElement.prototype.getContext=()=>{throw Error('Simulated canvas failure')};}});
 await p.goto(url);await p.locator('#loader.failed').waitFor();assert.equal(await p.locator('#retry').innerText(),'Try again');await p.screenshot({path:out+'/loading-error.png'});
 await p.locator('#retry').click();await ready(p);await err.close();console.log('PASS 24 × 8 skin sheet, 26 alpha objects, all placed, failed startup and retry');
}finally{await browser.close();}
