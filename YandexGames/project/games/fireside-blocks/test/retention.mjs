import{chromium}from'playwright';import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';import assert from'node:assert/strict';
import{normalizeActivity,aggregateActivity,isDayKey}from'../src/activity-data.js';
import{ROOM_UPGRADES}from'../src/room-progress.js';
assert(!isDayKey('2026-02-29'));assert(isDayKey('2028-02-29'));
const normalized=normalizeActivity({days:{'bad':[3],'2026-11-01':[2,3,4,1,1,90,1],'2026-11-02':[1,0,0,0,1,80,1],'2026-12-01':[8,0,0,0,1,120,0]}},'2026-10-31','2026-11-15');
assert.deepEqual(aggregateActivity(normalized,'2026-11'),{moves:3,lines:3,items:4,wins:1,classicGames:2,classicBest:90,dailyWins:2});assert.equal(Object.keys(normalized.days).length,4);
const out='test-results/retention';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),url=pathToFileURL(path.resolve('dist-vk-single/index.html')).href;
const ready=p=>p.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
async function solve(p){await p.locator('[data-go]').click();await p.evaluate(()=>{const A=__game;for(let n=0;n<150&&!A.finished;n++){const s=__plan(A.st.game,{beam:3})[0];if(!s)throw Error('No solution');A.placeAt(s.slot,s.x,s.y);}if(!A.st.game.won())throw Error('Not won');});await p.locator('.result').waitFor();}
try{
 const c=await browser.newContext({locale:'ru-RU',timezoneId:'Europe/Moscow',reducedMotion:'reduce'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{
  const RealDate=Date;window.__testTime=Number(sessionStorage.getItem('mocktime'))||RealDate.parse('2026-11-15T10:00:00+03:00');
  window.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[window.__testTime]));}static now(){return window.__testTime;}};
  if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('fireside_blocks_save_v1',JSON.stringify({best:900,coins:1000,challenge:{claimed:'2026-11-14',completed:5,run:null}}));}
 });
 await p.goto(url);await ready(p);
 assert.equal(await p.evaluate(()=>Object.keys(__save.data.activity.days).length),1,'no invented past history');
 await p.evaluate(()=>__game.ui.challenge());await p.locator('[data-start]').click();await p.evaluate(()=>window.__oldDaily={...__game.dailyRun});await solve(p);
 const first=await p.evaluate(()=>({moves:__game.st.game.moves,coins:__save.data.coins,completed:__save.data.challenge.completed}));assert.equal(first.coins,1080);assert.equal(first.completed,6);
 await p.locator('[data-home]').click();await p.evaluate(()=>__game.ui.challenge());await p.locator('[data-start]').click();await solve(p);
 assert.equal(await p.evaluate(()=>__save.data.coins),1080);assert.equal(await p.evaluate(()=>__save.data.activity.days['2026-11-15'][0]),first.moves*2);
 await p.evaluate(()=>{__game.toMenu();__game.ui.winCalendar();});assert.equal(await p.locator('.cal-day.won').count(),2);assert.equal(await p.locator('[data-day="2026-11-15"].won').count(),1);assert(await p.locator('[data-cal-next]').isDisabled());await p.screenshot({path:out+'/calendar-with-wins.png'});
 await p.evaluate(()=>{__game.ui.closeModal();__game.startClassic(false);__game.st.game.score=123;__game.endClassic();__game.endClassic();});
 assert.equal(await p.evaluate(()=>__save.data.activity.days['2026-11-15'][4]),1,'classic completion idempotent');
 await p.evaluate(()=>{window.__testTime=Date.parse('2026-11-16T00:01:00+03:00');__game.toMenu();__game.ui.challenge();});await p.locator('[data-start]').click();await solve(p);
 assert.equal(await p.evaluate(()=>__save.data.coins),1080+5+380);
 await p.evaluate(()=>{__game.toMenu();__game.startLevel(__oldDaily.index,{daily:__oldDaily});});await solve(p);
 assert.equal(await p.evaluate(()=>__save.data.coins),1465,'old daily win cannot earn reward again');assert.equal(await p.evaluate(()=>__save.data.challenge.claimed),'2026-11-16');assert.equal(await p.evaluate(()=>__save.data.challenge.completed),7);
 await p.evaluate(()=>{window.__testTime=Date.parse('2026-11-30T23:59:00+03:00');__game.toMenu();__game.startClassic(false);__game.st.game.score=111;__game.endClassic();window.__testTime=Date.parse('2026-12-01T00:01:00+03:00');__game.toMenu();__game.startClassic(false);__game.st.game.score=222;__game.endClassic();__game.ui.statistics('month');});
 assert.equal(await p.locator('[data-stat=classicBest]>b').innerText(),'222');await p.locator('[data-stats-prev]').click();assert.equal(await p.locator('[data-stat=classicBest]>b').innerText(),'123');await p.screenshot({path:out+'/november-statistics.png'});
 await p.evaluate(()=>{sessionStorage.setItem('mocktime',String(__testTime));__save.write();});await p.reload();await ready(p);
 assert.equal(await p.evaluate(()=>__save.data.activity.days['2026-11-15'][6]),1);assert.equal(await p.evaluate(()=>__save.data.best),900,'old all-time record preserved');
 assert.deepEqual(errors,[]);await c.close();console.log('PASS date history, replay rewards, midnight/month, records, persistence and legacy migration');
 for(const[name,width,height]of[['desktop',1440,900],['phone',390,844],['small',320,568],['landscape',844,390],['tablet',768,1024]]){
  for(const locale of ['ru-RU','en-US']){
   const ctx=await browser.newContext({viewport:{width,height},locale,reducedMotion:'reduce'}),page=await ctx.newPage(),err=[];page.on('pageerror',e=>err.push(e.message));await page.goto(url);await ready(page);
   assert.equal(await page.evaluate(()=>document.documentElement.lang),locale==='ru-RU'?'ru':'en');
   for(const kind of ['calendar','day','month']){
    await page.evaluate(kind=>kind==='calendar'?__game.ui.winCalendar():__game.ui.statistics(kind),kind);
    await page.waitForTimeout(30);assert.equal(await page.evaluate(()=>document.querySelector('.mpanel').scrollWidth>document.querySelector('.mpanel').clientWidth+1),false,kind+' overflow');
    assert(!/stat_|period_|undefined/.test(await page.locator('.modal').innerText()));
    await page.screenshot({path:`${out}/${name}-${locale}-${kind}.png`});
   }
   await page.evaluate(()=>__game.ui.closeModal());
   for(const stars of [112,...ROOM_UPGRADES.map(x=>x.stars)]){
    await page.evaluate(stars=>{__save.data.levels={};for(let n=stars;n>0;n-=3)__save.data.levels[Object.keys(__save.data.levels).length]={stars:Math.min(3,n)};__game.toMenu();},stars);
    await page.waitForFunction(stars=>__game.view.roomState?.ready&&__game.view.roomState.stars===stars,stars);
    const state=await page.evaluate(()=>__game.view.roomState.objects);assert.equal(state.length,13);
    if(stars===3000){assert(state.every(id=>ROOM_UPGRADES.some(u=>u.id===id)));await page.screenshot({path:`${out}/${name}-${locale}-room-3000.png`});}
   }
   assert.deepEqual(err,[]);await ctx.close();console.log('PASS calendar/stats and 13 room upgrades:',name,locale);
  }
 }
}finally{await browser.close();}
