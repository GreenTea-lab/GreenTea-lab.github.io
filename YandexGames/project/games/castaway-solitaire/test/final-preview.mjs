import fs from 'node:fs';
import assert from 'node:assert/strict';
import {runtime} from './runtime.mjs';
const R=await runtime(),out='test-results/final';fs.mkdirSync(out,{recursive:true});
try{
 const p=await R.browser.newPage({viewport:{width:1440,height:900},locale:'ru-RU'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
  window.__CS_DEBUG={};
  localStorage.setItem('castaway_solitaire_v1',JSON.stringify({v:2,expansion:5,coins:650,starsSpent:1488,level:1001,levels:Object.fromEntries(Array.from({length:1000},(_,i)=>[i+1,{stars:3,best:1000}])),stages:Object.fromEntries(['hut','fire','water','garden','pier','lookout','workshop','farm','beacon','ship','boathouse','smokehouse','fishmarket','hammock','teahouse','orchard','windmill','guesthouse','fountain','observatory','library','aviary','pavilion','treasury','statue'].map(id=>[id,3])),seen:{coin:1,lock:1,sand:1,keys2:1,wild:1},settings:{quality:'low'}}));
 });
 await p.goto(R.base+'/dist-vk-single/index.html');await p.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
 await p.evaluate(()=>{const I=__game.island;I.camT=null;I.cam.dist=I.baseDist()*1.06;I.update(.01);I.render();});
 await p.screenshot({path:`${out}/island-v2.png`});
 await p.locator('[data-a=levels]').click();await p.waitForTimeout(350);await p.screenshot({path:`${out}/chapters-v2.png`});await p.locator('[data-x]').click();
 for(const n of [61,300,550,800,1000]){
  await p.evaluate(n=>__game.playLevel(n),n);await p.waitForFunction(()=>{document.querySelector('[data-a=ok]')?.click();return __game.table.busy===0&&!__game.ui.modalOpen;});await p.waitForTimeout(400);
  const fits=await p.evaluate(()=>{const T=__game.table;return T.sprites.every(s=>s.x-T.cw/2>=-1&&s.x+T.cw/2<=innerWidth+1&&s.y-T.ch/2>=0&&s.y+T.ch/2<T.stockPos.y-T.ch/2);});assert.ok(fits,'Readable card layout '+n);
  if(n===1000)await p.screenshot({path:`${out}/level-1000.png`});
 }
 await p.close();
 const small=await R.browser.newPage({viewport:{width:320,height:568},locale:'ru-RU'});small.on('pageerror',e=>errors.push(e.message));await small.goto(R.base+'/dist-vk-single/index.html');await small.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
 await small.locator('[data-a=world]').click();await small.waitForTimeout(400);await small.screenshot({path:`${out}/small-world.png`});
 const grid=await small.locator('.district').first().evaluate(e=>getComputedStyle(e).display);assert.equal(grid,'grid');await small.locator('[data-x]').click();
 await small.locator('[data-a=journal]').click();await small.waitForTimeout(350);await small.screenshot({path:`${out}/small-journal.png`});await small.close();
 assert.deepEqual(errors,[]);console.log('PASS: final build, late-level card bounds, expanded island, compact districts and journal');
}finally{await R.close();}
