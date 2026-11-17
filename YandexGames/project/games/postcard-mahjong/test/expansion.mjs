import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { weeklyState, claimWeek, weekOf, unlockCards } from '../src/collection.js';
import { COUNT, PER, CITIES, level } from '../src/levels.js';
import { Game } from '../src/core.js';

assert.equal(COUNT,1000);assert.equal(PER,50);assert.equal(CITIES.length,20);
for(let c=0;c<20;c++)assert.ok(Array.from({length:50},(_,n)=>level(c*50+n)).every(L=>L.city===c));
const data={levels:{},postcards:{},weeklyCards:{},dailyWins:{},dc:{},coins:0};
for(let i=0;i<3;i++)data.levels[i]={stars:1,time:30};
assert.deepEqual(unlockCards(data,0),[0]);assert.deepEqual(unlockCards(data,0),[]);
for(const day of ['2026-10-26','2026-10-28','2026-10-31','2026-11-01'])data.dailyWins[day]=true;
assert.equal(weekOf('2026-11-01'),'2026-10-26');assert.equal(weeklyState(data,'2026-10-26').count,4);
assert.equal(claimWeek(data,'2026-10-26'),true);assert.equal(claimWeek(data,'2026-10-26'),false);assert.equal(data.coins,150);
const G=new Game({...level(49),seed:719});const p=G.hint().pair;G.match(...p);const state=G.toJSON(),restored=Game.fromJSON(state);
assert.deepEqual(restored.toJSON(),state);G.shuffle();restored.shuffle();assert.deepEqual(restored.toJSON(),G.toJSON());

const out=path.resolve('test-results/expansion');fs.mkdirSync(out,{recursive:true});
const url=pathToFileURL(path.resolve('dist-single/index.html')).href;
const browser=await chromium.launch({...process.platform==='win32'?{channel:'chrome'}:{}});
const errors=[],report=[];
async function ready(p){await p.waitForFunction(()=>window.__PM_BOOT_DONE===true,null,{timeout:10000});}
async function closeCard(p){const card=p.locator('.pcm');if(await card.count())await card.locator('.mhead [data-x]').click();}
async function solve(p,touch=false){
  for(let n=0;n<100;n++){
    const move=await p.evaluate(()=>{const A=__game;if(A.finished)return null;const h=A.game.hint();if(!h?.safe)throw Error('No solution');return h.pair.map(i=>A.view.tileCenter(i));});
    if(!move)return;for(const xy of move)touch?await p.touchscreen.tap(xy.x,xy.y):await p.mouse.click(xy.x,xy.y);
  }await p.screenshot({path:path.join(out,'failed-solve.png')});console.log(await p.evaluate(()=>({mode:__game.mode,level:__game.levelIdx,left:__game.game.left,modal:__game.ui.modalOpen,background:[...__game.background],sel:__game.st.sel,tut:__game.ui.tutStep})));throw Error('Too many moves');
}
try{
  for(const [w,h]of [[390,844],[320,568],[1280,720]]){
    const ctx=await browser.newContext({viewport:{width:w,height:h},isMobile:w<500,hasTouch:w<500,locale:'ru-RU',timezoneId:'Europe/Moscow'});
    await ctx.addInitScript(()=>{CanvasRenderingContext2D.prototype.roundRect=undefined;window.YaGames={init:()=>new Promise(()=>{})};});
    const p=await ctx.newPage(),requests=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
    const t0=Date.now();await p.goto(url);await ready(p);assert.ok(Date.now()-t0<8000);
    assert.equal(await p.evaluate(()=>__sdk.real),false);assert.ok(!requests.some(u=>/^https?:/.test(u)));
    await p.screenshot({path:path.join(out,`${w}-menu.png`)});
    await p.locator('[data-a=play]').click();await p.locator('[data-go]').click();await p.waitForTimeout(500);
    await p.screenshot({path:path.join(out,`${w}-play.png`)});
    // Снимаем две пары и восстанавливаем точное поле, историю и таймер из локального файла.
    await p.evaluate(()=>{const A=__game;for(let i=0;i<2;i++)A.pair(...A.game.hint().pair);A.elapsed=37.5;A.checkpoint();});
    const snapshot=await p.evaluate(()=>__save.data.sessions.level);
    await p.reload();await ready(p);await p.locator('[data-a=play]').click();
    assert.deepEqual(await p.evaluate(()=>__game.game.toJSON()),snapshot.game);
    assert.ok(await p.evaluate(()=>__game.elapsed>=37.5));
    assert.equal(await p.evaluate(()=>__game.game.history.length),2);
    await solve(p,w<500);await p.locator('[data-next]').click();await solve(p,w<500);await p.locator('[data-next]').click();await solve(p,w<500);
    await p.locator('.pcm').waitFor();assert.equal(await p.evaluate(()=>!!__save.data.postcards['0:0']),true);
    assert.equal(await p.evaluate(()=>__save.data.sessions.level),null);
    await p.waitForTimeout(2600);await p.screenshot({path:path.join(out,`${w}-first-postcard.png`)});
    await closeCard(p);await p.locator('[data-lv]').click();
    assert.equal(await p.locator('.lvl').count(),10);
    await p.locator('[data-page="4"]').click();assert.equal(await p.locator('.lvl').first().innerText().then(s=>s.includes('41')),true);
    await p.screenshot({path:path.join(out,`${w}-map.png`)});

    // Два независимых слота продолжения — путешествие и задача дня.
    await p.evaluate(()=>{__game.toMenu();__game.startDaily('2026-11-10');__game.pair(...__game.game.hint().pair);__game.elapsed=59;__game.checkpoint();});
    const daily=await p.evaluate(()=>__save.data.sessions.daily);
    await p.reload();await ready(p);assert.ok((await p.locator('[data-a=play]').innerText()).includes('10'));
    await p.locator('[data-a=play]').click();assert.equal(await p.evaluate(()=>__game.mode),'daily');
    assert.deepEqual(await p.evaluate(()=>__game.game.toJSON()),daily.game);assert.ok(await p.evaluate(()=>__game.elapsed>=59));
    await p.evaluate(()=>__game.toMenu());

    if(w===390){
      // Четыре разные задачи, включая наверстывание, дают одну недельную открытку.
      for(const key of ['2026-11-09','2026-11-10','2026-11-11','2026-11-12']){
        await p.evaluate(key=>{const A=__game;A.startDaily(key,false);for(const pair of A.game.order)A.pair(...pair);A.toMenu();},key);
      }
      const card=await p.evaluate(()=>__save.data.weeklyCards['2026-11-09']);assert.ok(card);
      const repeat=await p.evaluate(()=>{const before=__save.data.coins,A=__game;A.startDaily('2026-11-09',false);for(const pair of A.game.order)A.pair(...pair);return __save.data.coins-before;});
      assert.ok(repeat<150,'Repeated daily must not grant a second weekly reward');
      await p.evaluate(()=>__game.toMenu());
      await p.evaluate(()=>__game.ui.dailyCal('2026-11-12'));await p.screenshot({path:path.join(out,'weekly-progress.png')});
      await p.locator('[data-weekcard]').click();await p.screenshot({path:path.join(out,'weekly-postcard.png')});
      await p.evaluate(()=>{__game.ui.closeModal();__game.toMenu();__game.ui.dailyCal('2026-10-26');});
      assert.equal(await p.locator('.week-days button').count(),7);
      assert.ok((await p.locator('.week-nav').innerText()).includes('26'));
      await p.evaluate(()=>{__game.ui.closeModal();__save.data.coins=10000;__game.ui.styles();});
      for(const selection of ['skin:rose','faces:gems','mat:navy','frame:airmail','effect:petals'])await p.locator(`[data-decor="${selection}"]`).click();
      await p.screenshot({path:path.join(out,'workshop.png')});
      const owned=await p.evaluate(()=>({style:__save.data.style,faces:__save.data.faces,decor:__save.data.decor,coins:__save.data.coins}));
      assert.equal(owned.style,'rose');assert.equal(owned.faces,'gems');assert.equal(owned.decor.mat,'navy');assert.equal(owned.coins,10000-550-600-550-300-350);
      await p.reload();await ready(p);assert.deepEqual(await p.evaluate(()=>({style:__save.data.style,faces:__save.data.faces,decor:__save.data.decor,coins:__save.data.coins})),owned);
      await p.locator('[data-a=play]').click();if(await p.locator('[data-go]').count())await p.locator('[data-go]').click();await p.waitForTimeout(400);await p.screenshot({path:path.join(out,'customized-game.png')});
      // Все двадцать фонов рисуются и отличаются; обзорная контактная таблица.
      const sheet=await p.evaluate(()=>{
        const cv=document.createElement('canvas');cv.width=1500;cv.height=1000;const g=cv.getContext('2d');
        __lib.levels.CITIES.forEach((C,i)=>{const c=document.createElement('canvas');c.width=300;c.height=250;__lib.drawCity(c.getContext('2d'),C.id,300,250);g.drawImage(c,i%5*300,Math.floor(i/5)*250);g.fillStyle='#fff3dc';g.fillRect(i%5*300+8,Math.floor(i/5)*250+8,130,25);g.fillStyle='#3d453e';g.font='bold 15px Arial';g.fillText(C.id,i%5*300+15,Math.floor(i/5)*250+26);});
        return cv.toDataURL('image/png');
      });fs.writeFileSync(path.join(out,'twenty-cities.png'),Buffer.from(sheet.split(',')[1],'base64'));
    }
    report.push({viewport:[w,h],passed:true});console.log('PASS expansion',w,h);await ctx.close();
  }
  // Ранние сохранения сохраняют звёзды, валюту и уже полученные открытки.
  const ctx=await browser.newContext({locale:'ru-RU'});
  await ctx.addInitScript(()=>localStorage.setItem('postcard_mahjong_save_v1',JSON.stringify({v:1,coins:777,levels:{9:{stars:2,time:100},19:{stars:3,time:90}},styles:['ivory','jade'],style:'jade'})));
  const p=await ctx.newPage();await p.goto(url);await ready(p);assert.equal(await p.evaluate(()=>__save.data.coins),777);assert.equal(await p.evaluate(()=>__save.data.levels[19].stars),3);assert.equal(await p.evaluate(()=>!!__save.data.postcards['1:0']),true);await ctx.close();
  const damaged=await browser.newContext({locale:'ru-RU'});
  await damaged.addInitScript(()=>localStorage.setItem('postcard_mahjong_save_v1',JSON.stringify({levels:{0:{stars:2,time:31},1:null,2:'broken'},coins:'invalid',lastMode:'__proto__',weeklyCards:{'2026-11-09':{city:99}},settings:{musicVol:'broken'}})));
  const repaired=await damaged.newPage();await repaired.goto(url);await ready(repaired);assert.equal(await repaired.evaluate(()=>__save.data.levels[0].stars),2);assert.equal(await repaired.evaluate(()=>__save.data.coins),200);await damaged.close();
  // Если game.js отсутствует, вместо бесконечной анимации показываются причина и кнопки.
  const bad=await browser.newPage();await bad.goto(pathToFileURL(path.resolve('static/index.html')).href);await bad.locator('#boot-actions:not([hidden])').waitFor();assert.ok((await bad.locator('#lt').innerText()).includes('файлы'));await bad.screenshot({path:path.join(out,'missing-files-diagnostic.png')});await bad.close();
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({date:new Date().toISOString(),report,errors},null,2));console.log('All expansion checks passed.');
}finally{await browser.close();}
