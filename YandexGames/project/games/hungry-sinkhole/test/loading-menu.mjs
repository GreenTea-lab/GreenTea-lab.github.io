import './remote-browser.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const out='test-results/loading-menu';fs.mkdirSync(out,{recursive:true});
const url=pathToFileURL(path.resolve('dist-vk/index.html')).href;
const browser=await chromium.launch({channel:'chrome'}),report={screens:[],errors:[]};
try{
 for(const [name,w,h,reduced]of [['desktop',1440,900],['phone',390,844],['small',320,568],['landscape',844,390],['reduced',390,844,true]]){
  const p=await browser.newPage({viewport:{width:w,height:h},locale:'ru-RU',reducedMotion:reduced?'reduce':'no-preference'});p.on('pageerror',e=>report.errors.push(name+': '+e.stack));
  await p.addInitScript(()=>{window.__HS_DEBUG={seed:4100};localStorage.setItem('hungry_sinkhole_save_v1',JSON.stringify({level:30,coins:1000,tutDone:true,rounds:0,map:'town'}));window.__loadStages=[];new MutationObserver(()=>{const l=document.getElementById('loader');if(l&&__loadStages.at(-1)!==+l.dataset.stage)__loadStages.push(+l.dataset.stage);}).observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['data-stage']});});
  let release;const gate=new Promise(r=>release=r);await p.route('**/game.js',async route=>{await gate;await route.continue();});
  await p.goto(url,{waitUntil:'commit'});await p.locator('.load-panel').waitFor();await p.evaluate(()=>document.fonts.ready);
  for(const sel of ['.load-brand','.load-panel','.load-scene','.load-footer']){const b=await p.locator(sel).boundingBox();assert.ok(b.x>=-2&&b.y>=0&&b.x+b.width<=w+2&&b.y+b.height<=h,sel+' fits '+name+': '+JSON.stringify(b));}
  if(reduced)assert.equal(await p.locator('.load-orbit').evaluate(e=>getComputedStyle(e).animationName),'none');
  await p.screenshot({path:out+'/loading-'+name+'.png'});release();
  await p.waitForFunction(()=>window.__game?.sim&&!document.getElementById('loader'),null,{timeout:60000});
  assert.deepEqual(await p.evaluate(()=>__loadStages),[0,1,2,3,4,5]);
  const begin=await p.evaluate(()=>({time:__game.sim.time,bots:__game.sim.holes.length,canvas:getComputedStyle(document.getElementById('c')).visibility,coins:__save.data.coins,rounds:__save.data.rounds}));
  assert.ok(begin.bots>=10);assert.equal(begin.canvas,'visible');await p.waitForFunction(t=>__game.sim.time>t+.2,begin.time,{timeout:60000});
  await p.screenshot({path:out+'/menu-'+name+'.png'});
  if(name==='desktop'){
   const timing=await p.evaluate(async()=>{const g=__game,original=g.view.render.bind(g.view);let frames=0;const start=performance.now();g.view.render=()=>{frames++;original();};await new Promise(r=>setTimeout(r,1000));g.view.render=original;return {frames,elapsedMs:performance.now()-start,time:g.sim.time};});assert.ok(timing.frames>0&&timing.frames/(timing.elapsedMs/1000)<=65,'live menu is rendered at no more than display 60 Hz');
   await p.evaluate(()=>window.dispatchEvent(new Event('blur')));const paused=await p.evaluate(()=>__game.sim.time);await p.waitForTimeout(250);assert.equal(await p.evaluate(()=>__game.sim.time),paused);await p.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await p.locator('#snd').click();const modalTime=await p.evaluate(()=>__game.sim.time);await p.waitForTimeout(250);assert.equal(await p.evaluate(()=>__game.sim.time),modalTime);await p.evaluate(()=>__game.ui.closeModal());
   await p.locator('.mcard[data-id="beach"]').click();assert.equal(await p.evaluate(()=>__game.map.id),'beach');assert.equal(await p.evaluate(()=>__game.attractFocus===null||__game.sim.holes.includes(__game.attractFocus)),true);
   assert.deepEqual(await p.evaluate(()=>({coins:__save.data.coins,rounds:__save.data.rounds})),{coins:begin.coins,rounds:begin.rounds});
   await p.screenshot({path:out+'/menu-beach.png'});report.menuFrameRate=timing.frames;report.freezesOnBlurAndModal=true;report.mapSwitch=true;
  }
  report.screens.push({name,width:w,height:h,stages:6,liveMenu:true});await p.close();console.log('LOADING / LIVE MENU',name,'PASS');
 }
 const error=await browser.newPage({viewport:{width:390,height:844},locale:'ru-RU'});await error.route('**/game.js',route=>route.abort('failed'));await error.goto(url);await error.locator('#load-retry:visible').waitFor();assert.ok((await error.locator('#lt').textContent()).includes('Не удалось')); await error.screenshot({path:out+'/loading-error.png'});report.retryOnBundleFailure=true;await error.close();
 const single=await browser.newPage();await single.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);await single.waitForFunction(()=>window.__game?.sim&&!document.querySelector('#loader'));report.singleFileStarts=true;await single.close();
 assert.deepEqual(report.errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log('LOADING / MENU PASS');
}catch(e){report.failure=e.stack;throw e;}finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();}
