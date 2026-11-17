import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runtime} from './runtime.mjs';
const R=await runtime(),out='test-results/expansion';fs.mkdirSync(out,{recursive:true});
const report=[],errors=[];
try{
 const ctx=await R.browser.newContext({viewport:{width:1440,height:900},locale:'ru-RU'});
 await ctx.addInitScript(()=>{window.__CS_DEBUG={};localStorage.setItem('castaway_solitaire_v1',JSON.stringify({v:1,coins:400,level:61,levels:Object.fromEntries(Array.from({length:60},(_,i)=>[i+1,{stars:3,best:100+i}])),stages:{hut:3,garden:3},settings:{musicVol:.2,sfxVol:.6},ts:1}));});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(R.base+'/parent');
 const f=page.frames().find(f=>f.url().includes('dist-vk'));await f.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));await f.waitForTimeout(1400);
 assert.equal(await f.evaluate(()=>Object.keys(__save.data.levels).length),60);assert.equal(await f.evaluate(()=>__save.data.stages.hut),3);assert.equal(await f.evaluate(()=>__save.data.settings.musicVol),.2);
 await f.locator('[data-a=levels]').click();assert.equal(await f.locator('[data-ch]').count(),20);
 await f.locator('[data-ch="19"]').click();assert.equal(await f.locator('.voyage-levels .lv').count(),50);assert.equal(await f.locator('.voyage-levels .lv.lock').count(),50);
 await page.screenshot({path:`${out}/chapter-20-locked.png`});await f.locator('[data-x]').click();
 await f.evaluate(()=>{__save.data.level=1001;__save.data.levels=Object.fromEntries(Array.from({length:1000},(_,i)=>[i+1,{stars:3,best:1000}]));__game.ui.home();});
 let previous=await f.evaluate(()=>Array.from(__game.island.hv).filter(h=>h>0).length);
 for(let tier=1;tier<=5;tier++){
  await f.locator('[data-a=world]').click();await f.locator('[data-expand]').click();
  assert.equal(await f.evaluate(()=>__save.data.expansion),tier);await f.locator('[data-x]').click();await f.waitForTimeout(1500);
  const state=await f.evaluate(()=>{const I=__game.island;return {land:Array.from(I.hv).filter(h=>h>0).length,spots:Object.keys(I.spots).length,dry:Object.values(I.spots).every(s=>I.ground(s.x,s.z)>.4),stars:__save.data.starsSpent};});
  assert.ok(state.land>previous,'Physical land increases');assert.equal(state.spots,10+tier*3);assert.ok(state.dry,'Building sites remain dry');previous=state.land;report.push({tier,...state});
  await page.screenshot({path:`${out}/coast-${tier}.png`});
 }
 const stars=await f.evaluate(()=>__save.data.starsSpent);assert.equal(await f.evaluate(()=>__game.expandIsland()),false);assert.equal(await f.evaluate(()=>__save.data.starsSpent),stars);
 await f.evaluate(()=>__game.build('observatory'));await f.waitForTimeout(850);assert.equal(await f.evaluate(()=>__save.data.stages.observatory),1);
 await f.evaluate(()=>{for(const id of Object.keys(__game.island.spots))__save.data.stages[id]=3;__game.island.setStages(__save.data.stages);__game.island.setMode('island');});await f.waitForTimeout(1500);
 await page.screenshot({path:`${out}/island-complete.png`});
 const residents=await f.evaluate(()=>{
  const I=__game.island,stats=I.walkers.map(w=>({id:w.id,distance:0,invalid:0,maxStep:0}));
  for(let k=0;k<2400;k++){const old=I.walkers.map(w=>({x:w.x,z:w.z}));I.update(.05);I.walkers.forEach((w,i)=>{const d=Math.hypot(w.x-old[i].x,w.z-old[i].z);stats[i].distance+=d;stats[i].maxStep=Math.max(stats[i].maxStep,d);if(!I.walkable(w.x,w.z))stats[i].invalid++;});}return stats;
 });
 assert.ok(residents.every(s=>s.distance>5&&s.invalid===0&&s.maxStep<.06),JSON.stringify(residents));
 await f.locator('[data-a=journal]').click();const coins=await f.evaluate(()=>__save.data.coins);
 await f.locator('[data-find="0"]').click();assert.equal(await f.evaluate(()=>__save.data.coins),coins+150);assert.ok(await f.locator('[data-find="0"]').isDisabled());
 await f.evaluate(()=>{const j=__save.data.journal;j.daily={day:new Date().toISOString().slice(0,10),wins:3,cards:60,streak:8,claimed:[]};__save.data.wins=3;__game.ui.closeModals();__game.ui.journal();});
 await f.locator('[data-task=wins]').click();await f.locator('[data-task=cards]').click();await f.locator('[data-task=streak]').click();await f.locator('[data-harvest]').click();assert.ok(await f.locator('[data-harvest]').isDisabled());
 const awarded=await f.evaluate(()=>__save.data.coins);assert.equal(awarded,coins+150+40+30+35+85);
 await page.screenshot({path:`${out}/journal.png`});
 await f.evaluate(()=>__save.flush());
 // Remove the init seed before reload: restore the expanded world from the real local/cloud paths.
 await ctx.clearCookies();await f.evaluate(()=>localStorage.clear());
 await page.reload();const f2=page.frames().find(f=>f.url().includes('dist-vk'));await f2.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
 assert.equal(await f2.evaluate(()=>__save.data.expansion),5);assert.equal(await f2.evaluate(()=>__save.data.coins),awarded);assert.equal(await f2.evaluate(()=>__save.data.journal.chapters[0]),0);assert.equal(await f2.evaluate(()=>Object.keys(__game.island.spots).length),25);
 await ctx.close();
 for(const [name,w,h,lang]of[['phone',390,844,'ru'],['small',320,568,'ru'],['landscape',844,390,'en']]){
  const c=await R.browser.newContext({viewport:{width:w,height:h},locale:'ru-RU',isMobile:true,hasTouch:true});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(R.base+'/parent?lang='+lang);const f=p.frames().find(f=>f.url().includes('dist-vk'));await f.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));await f.waitForTimeout(1300);
  await p.screenshot({path:`${out}/${name}-home.png`});
  for(const screen of ['world','journal','levels']){await f.locator('[data-a='+screen+']').click();await f.waitForTimeout(400);const box=await f.locator('.panel').boundingBox();assert.ok(box.x>=-1&&box.y>=-1&&box.x+box.width<=w+1&&box.y+box.height<=h+1,screen+JSON.stringify(box));await p.screenshot({path:`${out}/${name}-${screen}.png`});await f.locator('[data-x]').click();}
  await c.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/report.json`,JSON.stringify({expansions:report,residents,errors},null,2));console.log('PASS: five physical coast expansions, 25 buildings, 1000-level map, migration, rewards, cloud restore, mobile UI');
}finally{await R.close();}
