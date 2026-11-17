import './remote-browser.mjs';
import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const out='test-results/offline-browser';fs.mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],menu:[],duel:[]},b=await chromium.launch({channel:'chrome'});
const check=(name,v)=>{assert.ok(v,name);report.checks.push(name);console.log('PASS',name);};
try{
 for(const [width,height]of [[390,844],[844,390],[320,568]]){
  const p=await b.newPage({viewport:{width,height},hasTouch:true,isMobile:true,locale:'ru-RU'});p.setDefaultTimeout(90000);p.on('pageerror',e=>report.errors.push(e.stack));
  await p.addInitScript(()=>{window.__HS_DEBUG={seed:4100,quality:'low'};if(!localStorage.getItem('hungry_sinkhole_save_v1'))localStorage.setItem('hungry_sinkhole_save_v1',JSON.stringify({level:30,tutDone:true,rounds:0,coins:1000}));});
  await p.goto(pathToFileURL(path.resolve('dist-vk/index.html')).href);await p.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'),null,{timeout:90000});
  const menu=await p.evaluate(async()=>{const g=__game;await new Promise(r=>setTimeout(r,1800));const a=g.view.slots.size,total=g.sim.items.filter(i=>i.st!==2).length,r=g.view.renderer;const start=performance.now();let frames=0;const original=g.view.render.bind(g.view);g.view.render=()=>{frames++;original();};await new Promise(r=>setTimeout(r,3000));g.view.render=original;return {visible:a,total,active:g.sim.active.size,shadow:r.shadowMap.enabled,dpr:r.getPixelRatio(),frames,ms:performance.now()-start,triangles:r.info.render.triangles,calls:r.info.render.calls};});
  report.menu.push({width,height,...menu});check('menu culls models and avoids physics/shadows '+width,menu.visible>0&&menu.visible<menu.total*.8&&menu.active===0&&!menu.shadow&&menu.dpr<=1);
  await p.screenshot({path:out+'/menu-'+width+'.png'});
  await p.locator('#album').click();check('album contains 16 maps and 48 stickers '+width,await p.locator('.album-card').count()===16&&await p.locator('.sticker').count()===48);await p.screenshot({path:out+'/album-'+width+'.png'});await p.locator('.mx').click();
  await p.evaluate(()=>{for(const k in __save.data.offline.pantry)__save.data.offline.pantry[k]=1000;});
  await p.locator('#workshop').click();for(let i=0;i<4;i++)await p.locator('[data-recipe="decor'+i+'"]').click();await p.locator('[data-slot="5"]').click();
  check('workshop crafts, places and unlocks its skin '+width,await p.evaluate(()=>__save.data.offline.crafted.length===4&&__save.data.offline.placements[5]==='decor3'&&__save.data.skins.includes('artisanLeaf')));await p.screenshot({path:out+'/workshop-'+width+'.png'});await p.locator('.mx').click();
  await p.locator('#festival').click();await p.evaluate(()=>{__game.ui.closeModal();__save.data.offline.season.points=360;});await p.locator('#festival').click();await p.locator('[data-tier="12"]').click();check('free festival grants a permanent skin '+width,await p.evaluate(()=>__save.data.skins.some(s=>s.startsWith('festival'))));await p.screenshot({path:out+'/festival-'+width+'.png'});await p.locator('.mx').click();
  await p.locator('#daily-challenge').click();await p.locator('#start-daily').click();check('daily challenge starts without upgrades '+width,await p.evaluate(()=>__game.mode==='daily'&&__game.me.sizeBonus===0));
  await p.evaluate(()=>{__game.time=0;__game.stats.eaten=75;__game.end();});await p.screenshot({path:out+'/daily-result-'+width+'.png'});
  await p.evaluate(()=>{__game.menu();__save.data.mode='duel';__game.play();});await p.keyboard.down('KeyW');await p.keyboard.down('ArrowRight');await p.waitForTimeout(900);await p.keyboard.up('KeyW');await p.keyboard.up('ArrowRight');
  check('duel renders two views and independent real players '+width,await p.evaluate(()=>__game.sim.holes.length===2&&__game.view.splitCameras?.length===2&&__game.me.z!==__game.second.z&&__game.view.renderer.getContext().getError()===0));
  await p.screenshot({path:out+'/duel-'+width+'.png'});
  // Simulate two independent touch pointers through the real input listeners.
  const touches=await p.evaluate(()=>{const c=document.querySelector('#c'),g=__game,H=innerHeight,W=innerWidth,vertical=H>W;for(let i=0;i<2;i++){const x=vertical?W*.5:W*(i?.75:.25),y=vertical?H*(i?.75:.25):H*.65;c.dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',pointerId:80+i,clientX:x,clientY:y,bubbles:true}));window.dispatchEvent(new PointerEvent('pointermove',{pointerType:'touch',pointerId:80+i,clientX:x+30,clientY:y-30,bubbles:true}));}const both=g.localSticks.every(s=>s?.on&&s.dx>0);window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:80}));window.dispatchEvent(new PointerEvent('pointerup',{pointerId:81}));return {both,released:g.localSticks.every(s=>!s?.on)};});check('two touch controls release safely '+width,touches.both&&touches.released);
  await p.evaluate(()=>{__game.menu();__save.data.mode='battle';__game.play();});await p.waitForFunction(()=>document.querySelectorAll('#board .lb-row').length===5);await p.screenshot({path:out+'/top5-'+width+'.png'});
  await p.locator('#board-toggle').click();await p.waitForFunction(()=>document.querySelectorAll('#board .lb-row').length>=10);check('phone top 5 expands and collapses '+width,await p.locator('#board-toggle').getAttribute('aria-expanded')==='true');await p.screenshot({path:out+'/top10-'+width+'.png'});await p.locator('#board-toggle').click();await p.waitForFunction(()=>document.querySelectorAll('#board .lb-row').length===5);
  await p.evaluate(()=>{__game.menu();__save.data.mode='rain';__game.play();});await p.waitForFunction(()=>__game.rain?.spawned>0,null,{timeout:90000});await p.locator('#pause').click();check('rain is endless and can finish from pause '+width,await p.locator('#zfin').isVisible());await p.locator('#zfin').click();await p.waitForFunction(()=>__game.state==='result');
  await p.reload();await p.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));check('workshop placement survives reload '+width,await p.evaluate(()=>__save.data.offline.placements[5]==='decor3'));await p.close();
 }
 assert.deepEqual(report.errors,[]);
}finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');await b.close();}
