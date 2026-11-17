import {chromium} from 'playwright';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
import {level,COUNT,SEASONS} from '../src/levels.js';import {Game,SHAPE} from '../src/core.js';import {playOut} from '../src/bot.js';
assert.equal(COUNT,1000);assert.equal(SEASONS.length,20);
const signatures=new Set(),models=[];
for(let i=140;i<COUNT;i++){
 const L=level(i);signatures.add(JSON.stringify({b:L.board,g:L.goal,m:L.modifier}));
 for(const seed of L.seeds){
  const g=new Game({seed,board:L.board,level:L,mode:'adv'});g.refill();
  const result=playOut(g,{maxMoves:45,quality:1});assert.ok(result.win,'Unsolved '+(i+1)+' seed '+seed);models.push({level:i+1,seed,...result});
 }
}
assert.equal(signatures.size,860);
const out=path.resolve('test-results/expansion');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'models.json'),JSON.stringify({count:COUNT,chapters:20,uniqueNewBoards:signatures.size,models},null,2));
console.log('PASS',models.length,'calibrated games');
if(process.argv.includes('--models-only'))process.exit(0);
const browser=await chromium.launch({channel:'chrome'}),errors=[];
async function solve(page){
 await page.evaluate(()=>{const A=__game;for(let n=0;n<150&&!A.finished;n++){const p=__plan(A.st.game,{beam:3})[0];if(!p)throw new Error('Stuck '+A.levelIdx);A.placeAt(p.slot,p.x,p.y);}if(!A.st.game.won())throw new Error('Not won');});
 await page.waitForSelector('.result');
}
try{
 for(const [name,width,height]of [['desktop',1440,900],['phone',390,844],['small',320,568]]){
  const ctx=await browser.newContext({viewport:{width,height},locale:'ru-RU',hasTouch:true});const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);await page.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
  await page.evaluate(()=>{__save.data.coins=30000;__game.ui.styles();});
  assert.equal(await page.locator('[data-buy],[data-use],.scard .sel').count(),24);
  await page.waitForTimeout(300);await page.screenshot({path:path.join(out,name+'-skins.png')});
  await page.locator('[data-buy=stained]').click();assert.equal(await page.evaluate(()=>__save.data.style),'stained');assert.equal(await page.evaluate(()=>__save.data.coins),29600);
  await page.locator('[data-tab=boards]').click();assert.equal(await page.locator('.scard').count(),8);await page.locator('[data-cosmetic=jade]').click();
  assert.equal(await page.evaluate(()=>__game.view.boardStyle),'jade');
  await page.locator('[data-tab=effects]').click();assert.equal(await page.locator('.scard').count(),6);await page.locator('[data-cosmetic=snow]').click();assert.equal(await page.evaluate(()=>__game.view.effect),'snow');
  await page.locator('[data-tab=album]').click();assert.equal(await page.locator('.album-card').count(),20);
  await page.evaluate(()=>{for(let i=0;i<3;i++)__save.data.levels[i]={stars:3};__game.ui.styles('album');});
  const old=await page.evaluate(()=>__save.data.coins);await page.locator('[data-medal="0:0"]').click();assert.equal(await page.evaluate(()=>__save.data.coins),old+60);assert.ok(await page.locator('[data-medal="0:0"]').isDisabled());
  await page.waitForTimeout(300);await page.screenshot({path:path.join(out,name+'-album.png')});
  await page.reload();await page.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
  assert.equal(await page.evaluate(()=>__save.data.style),'stained');assert.equal(await page.evaluate(()=>__game.view.boardStyle),'jade');assert.equal(await page.evaluate(()=>__game.view.effect),'snow');
  await page.evaluate(()=>{__save.data.levels[139]={stars:1};__game.ui.season=8;__game.ui.levels();});assert.equal(await page.locator('.stab').count(),20);
  await page.waitForTimeout(300);await page.screenshot({path:path.join(out,name+'-chapters.png')});
  // Разные типы целей, ограничения фигур и читабельная цель в интерфейсе.
  for(const i of [140,141,142,143,145,146,150]){
    await page.evaluate(i=>{__game.toMenu();__game.startLevel(i);},i);await page.locator('[data-go]').click();
    assert.ok(!/undefined|task_|goal_/.test(await page.locator('#ui').innerText()));await solve(page);
  }
  await page.evaluate(()=>{__game.toMenu();__game.ui.missions();});assert.ok(await page.evaluate(()=>__save.data.missions.lines>0));
  const missionBefore=await page.evaluate(()=>__save.data.coins);
  await page.locator('[data-claim=lines]').click();assert.equal(await page.evaluate(()=>__save.data.coins),missionBefore+40);assert.ok(await page.locator('[data-claim=lines]').isDisabled());
  // Позднее продолжение не обрезается старым пределом 140.
  await page.evaluate(()=>{__game.toMenu();__game.startLevel(999);});await page.locator('[data-go]').click();
  await page.evaluate(()=>{const p=__plan(__game.st.game,{beam:3})[0];__game.placeAt(p.slot,p.x,p.y);});
  const snapshot=await page.evaluate(()=>JSON.stringify(__game.st.game.toJSON()));await page.reload();await page.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
  assert.equal(await page.evaluate(()=>__save.data.adventure.idx),999);await page.locator('[data-a=travelPlay]').click();await page.locator('[data-go]').click();
  assert.equal(await page.evaluate(()=>JSON.stringify(__game.st.game.toJSON())),snapshot);await solve(page);
  await page.waitForTimeout(300);await page.screenshot({path:path.join(out,name+'-level-1000.png')});
  if(name==='desktop'){
   await page.evaluate(()=>{__game.toMenu();__game.ui.weekly();});const before=await page.evaluate(()=>__save.data.coins);
   for(let n=0;n<5;n++){await page.locator('[data-event]').click();await page.locator('[data-go]').click();await solve(page);await page.locator('[data-event-next]').click();}
   assert.equal(await page.evaluate(()=>__save.data.weekly.stage),5);assert.equal(await page.evaluate(()=>__save.data.coins),before+450);assert.equal(await page.evaluate(()=>__save.data.trophies.length),1);
   assert.equal(await page.locator('[data-event]').count(),0);await page.waitForTimeout(300);await page.screenshot({path:path.join(out,'weekly-complete.png')});
  }
  await ctx.close();console.log('PASS UI',name);
 }
 assert.deepEqual(errors,[]);
}finally{fs.writeFileSync(path.join(out,'ui-report.json'),JSON.stringify({errors},null,2));await browser.close();}
