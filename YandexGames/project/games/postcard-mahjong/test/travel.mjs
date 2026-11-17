import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {Game} from '../src/core.js';
import {CITIES} from '../src/levels.js';
import {LETTERS} from '../src/letters.js';
import {QUESTS,TRIPS,DIFFICULTIES,normalizeTravel,postalProgress,postalState,claimPostal,tripBoard,mailTiles,tripGoal,practiceBoard,knownLayouts,activeTrip,availableTrips} from '../src/travel.js';

const data={settings:{},coins:200,levels:{},library:{favorites:['heart','constructor']}};normalizeTravel(data);
assert.deepEqual(data.library.favorites,['heart']);
for(const q of QUESTS){for(let n=0;n<q.goal;n++)assert.equal(postalProgress(data,q.id,1,'unique-'+n,'2026-11-14'),true);assert.equal(postalProgress(data,q.id,1,'unique-0','2026-11-14'),false);assert.equal(claimPostal(data,q.id,'2026-11-14'),true);assert.equal(claimPostal(data,q.id,'2026-11-14'),false);}
assert.equal(data.coins,325);assert.equal(data.postOffice.stamps['2026-11-14'],true);
assert.equal(postalState(data,'2026-11-15').counts.pairs,0);assert.equal(Object.keys(data.postOffice.stamps).length,1);
assert.equal(activeTrip('2026-11-15').id,'paris-evening');assert.equal(activeTrip('2026-11-16').id,'kyoto-garden');assert.equal(availableTrips('2026-12-14').length,4);
assert.equal(Object.keys(LETTERS).length,20);assert.ok(CITIES.every(c=>LETTERS[c.id].length===2));
let tripBoards=0;
for(const trip of TRIPS)for(let step=0;step<7;step++){
  const B=tripBoard(trip.id,step),g=new Game(B),marked=mailTiles(g),sealed=g.tiles.filter(t=>t.hidden&&!t.seen).map(t=>t.id);
  const initial=tripGoal(g,B,marked,sealed);assert.equal(initial.value,0);assert.ok(initial.goal>0);
  if(B.kind==='seals')assert.equal(initial.kind,'seals','Seal stages must start with actual concealed tiles');
  for(const pair of g.order){g.match(...pair);const q=tripGoal(g,B,marked,sealed);if(q.value>=q.goal)break;}
  const q=tripGoal(g,B,marked,sealed);assert.ok(q.value>=q.goal);tripBoards++;
}
let practiceBoards=0;
for(const lay of knownLayouts({levels:Object.fromEntries(Array.from({length:1000},(_,i)=>[i,{stars:1}]))}))for(const difficulty of Object.keys(DIFFICULTIES)){
  const g=new Game(practiceBoard(lay,difficulty,87191));for(const p of g.order)assert.ok(g.match(...p));assert.equal(g.left,0);practiceBoards++;
}
assert.throws(()=>practiceBoard('heart','constructor',1));
console.log('PASS pure progression:',tripBoards,'trip goals,',practiceBoards,'practice boards, postal claims/rollover and 20 letters');

const out='test-results/travel';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),errors=[],report=[];
const ready=p=>p.waitForFunction(()=>window.__PM_BOOT_DONE);
const plain=p=>p.evaluate(()=>JSON.parse(JSON.stringify(__game.game.toJSON())));
async function solve(p){
  for(let n=0;n<150;n++){
    const done=await p.evaluate(()=>{const A=__game;if(A.finished)return true;const h=A.game.hint();if(!h?.safe)throw Error('No safe solution');A.pair(...h.pair);return A.finished;});
    if(done)return;
  }throw Error('Board did not finish');
}
async function closeIntro(p){await p.evaluate(()=>{__game.ui.closeModal();__game.ui.tutorial(0);});}
try{
  for(const [width,height,locale='ru-RU',dir='dist-vk-single']of [[390,844],[320,568],[1280,800],[844,390],[390,844,'en-US','dist-single']]){
    const ctx=await browser.newContext({viewport:{width,height},locale,hasTouch:width<500,isMobile:width<500,timezoneId:'Europe/Moscow'}),p=await ctx.newPage();
    p.on('pageerror',e=>errors.push(`${width}: ${e.message}`));await p.clock.setFixedTime(new Date('2026-11-14T12:00:00+03:00'));
    await p.goto(pathToFileURL(path.resolve(dir,'index.html')).href);await ready(p);
    await p.locator('[data-a=journal]').click();
    for(const section of ['home','mail','trips','letters','shelf']){
      await p.locator(`[data-jtab=${section}]`).first().click();
      assert.ok(await p.locator('.mpanel').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Journal must not overflow horizontally');
      await p.screenshot({path:`${out}/${width}-${locale}-${section}.png`,animations:'disabled'});
    }
    // Calm completion keeps 3 stars even after a very slow game; challenge retains its clock.
    await p.evaluate(()=>{__game.ui.closeModal();__game.setPace('calm');__game.startLevel(0,false);__game.ui.closeModal();__game.ui.tutorial(0);__game.elapsed=999;__game.ui.tick();});
    assert.equal(await p.locator('.hud').evaluate(e=>e.classList.contains('notimer')),true);
    assert.equal(await p.locator('.mst').getAttribute('data-n'),'3');await solve(p);
    assert.equal(await p.evaluate(()=>__save.data.levels[0].stars),3);
    await p.evaluate(()=>{__game.toMenu();__game.setPace('challenge');__game.startLevel(1,false);__game.ui.closeModal();__game.elapsed=999;});await solve(p);
    assert.equal(await p.evaluate(()=>__save.data.levels[1].stars),1);
    // Exact practice resume includes timer, pace, camera and favourites.
    await p.evaluate(()=>{__game.toMenu();__game.startPractice('heart','normal',false);__game.pair(...__game.game.hint().pair);__game.elapsed=66;__game.setZoom(1.75);__game.view.pan(16,-12);__game.toggleLayout('heart');__game.checkpoint();__game.toMenu();});
    const saved=await p.evaluate(()=>JSON.parse(JSON.stringify(__save.data.sessions.practice)));
    await p.reload();await ready(p);await p.locator('[data-a=play]').click();
    assert.equal(await p.evaluate(()=>__game.mode),'practice');assert.deepEqual(await plain(p),saved.game);assert.equal(await p.evaluate(()=>__game.runId),saved.runId);
    assert.equal(await p.evaluate(()=>__game.view.zoom),saved.camera.zoom);assert.equal(await p.evaluate(()=>__save.data.library.favorites.includes('heart')),true);
    const alive=await p.evaluate(()=>__game.game.alive.slice());
    const point=await p.evaluate(()=>{const b=__game.view.L.board;return {x:b.x+b.w/2,y:b.y+b.h/2};});
    await p.mouse.move(point.x,point.y);await p.mouse.down();await p.mouse.move(point.x+45,point.y+20,{steps:8});await p.mouse.up();
    assert.deepEqual(await p.evaluate(()=>__game.game.alive.slice()),alive,'Panning must not remove tiles');assert.equal(await p.evaluate(()=>__game.st.sel),-1);
    if(width===390&&locale==='ru-RU'){
      const cdp=await ctx.newCDPSession(p),z=await p.evaluate(()=>__game.view.zoom);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x-35,y:point.y,id:1},{x:point.x+35,y:point.y,id:2}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x-49,y:point.y,id:1},{x:point.x+49,y:point.y,id:2}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
      assert.ok(await p.evaluate(()=>__game.view.zoom)>z);assert.deepEqual(await p.evaluate(()=>__game.game.alive.slice()),alive);
    }
    await p.screenshot({path:`${out}/${width}-${locale}-zoom.png`,animations:'disabled'});
    await p.locator('[data-zoom=reset]').click();assert.equal(await p.evaluate(()=>__game.view.zoom),1);
    const pair=await p.evaluate(()=>__game.game.hint().pair.map(i=>__game.view.tileCenter(i)));
    const before=await p.evaluate(()=>__game.game.left);for(const xy of pair)await p.mouse.click(xy.x,xy.y);assert.equal(await p.evaluate(()=>__game.game.left),before-2);
    await solve(p);await p.evaluate(()=>{__game.toMenu();__game.ui.journal('mail');});
    assert.ok(await p.evaluate(()=>['boards','pairs','letters'].every(id=>__save.data.postOffice.counts[id]>={boards:2,pairs:18,letters:3}[id])));
    const coins=await p.evaluate(()=>__save.data.coins);
    for(const q of QUESTS)await p.locator(`[data-postal=${q.id}]`).click();
    assert.equal(await p.evaluate(()=>__save.data.coins),coins+125);assert.equal(await p.locator('.daily-stamp').count(),1);
    await p.screenshot({path:`${out}/${width}-${locale}-postal-rewards.png`,animations:'disabled'});
    // Read a city letter and preserve the read state.
    await p.locator('[data-jtab=letters]').first().click();await p.locator('[data-letter="0"]').click();assert.equal(await p.evaluate(()=>__save.data.letters.moscow),true);await p.locator('.letter-body [data-x]').click();
    if(width===390&&locale==='ru-RU'){
      // All seven route stages, exact interrupted save and a single collection reward.
      await p.evaluate(()=>{__game.ui.closeModal();__game.toMenu();__game.startTrip('paris-evening',0);__game.ui.closeModal();__game.pair(...__game.game.hint().pair);__game.toMenu();});
      const tripSave=await p.evaluate(()=>JSON.parse(JSON.stringify(__save.data.sessions.trip)));
      await p.reload();await ready(p);await p.locator('[data-a=play]').click();await p.locator('[data-trip-go]').click();assert.deepEqual(await plain(p),tripSave.game);
      for(let step=0;step<7;step++){
        if(step){await p.evaluate(step=>__game.startTrip('paris-evening',step),step);await p.locator('[data-trip-go]').click();}
        await solve(p);await p.locator('[data-tripmap]').waitFor();
      }
      assert.equal(await p.evaluate(()=>__save.data.tripProgress['paris-evening'].claimed),true);
      assert.equal(await p.evaluate(()=>__save.data.tripProgress['paris-evening'].wins.length),7);
      const first=await p.evaluate(()=>__save.data.coins);
      await p.evaluate(()=>{__game.ui.closeModal();__game.startTrip('paris-evening',6,false);__game.ui.closeModal();});await solve(p);assert.equal(await p.evaluate(()=>__save.data.coins),first+5);
      await p.evaluate(()=>{__game.toMenu();__game.ui.journal('trips');});await p.screenshot({path:`${out}/completed-trip.png`,animations:'disabled'});
      await p.clock.setFixedTime(new Date('2026-11-16T12:00:00+03:00'));await p.evaluate(()=>__game.ui.journal('trips'));
      assert.equal(await p.locator('[data-trip=kyoto-garden]').isEnabled(),true);assert.equal(await p.locator('[data-trip=paris-evening]').isEnabled(),true);
      await p.evaluate(()=>{__game.ui.closeModal();__game.toMenu();__game.setPace('calm');__game.startEndless(false);__game.E.score=123;__game.endEndless();});assert.equal(await p.evaluate(()=>__save.data.bestCalm),123);assert.equal(await p.evaluate(()=>__save.data.best),0);
    }
    report.push({width,height,locale,dir,journalFits:true,calmAndChallenge:true,practiceResume:true,zoomAndPanning:true,postalRewardOnce:true,letterRead:true});console.log('PASS travel',width,height,locale);await ctx.close();
  }
  const legacy=await browser.newContext({locale:'ru-RU'});
  await legacy.addInitScript(()=>localStorage.setItem('postcard_mahjong_save_v1',JSON.stringify({v:2,campaignVersion:2,coins:777,best:4321,levels:{0:{stars:2,time:51},1:{stars:3,time:63}},postcards:{'0:0':true},style:'jade',styles:['ivory','jade'],settings:{musicVol:.35,sfxVol:.5},dailyWins:{'2026-11-10':true}})));
  const old=await legacy.newPage();await old.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);await ready(old);
  assert.deepEqual(await old.evaluate(()=>({coins:__save.data.coins,best:__save.data.best,style:__save.data.style,stars:__save.data.levels[1].stars,card:__save.data.postcards['0:0'],vol:__save.data.settings.musicVol})),{coins:777,best:4321,style:'jade',stars:3,card:true,vol:.35});
  assert.equal(await old.evaluate(()=>__save.data.settings.pace),'challenge');assert.equal(await old.evaluate(()=>__save.data.library.favorites.length),0);await legacy.close();
  const damaged=await browser.newContext({locale:'ru-RU'});
  await damaged.addInitScript(()=>localStorage.setItem('postcard_mahjong_save_v1',JSON.stringify({campaignVersion:2,coins:600,settings:{zoom:'bad',pace:'unknown'},sessions:{practice:{game:{},spec:{lay:'heart',difficulty:'constructor',seed:1}}},library:{favorites:['constructor','heart','heart'],records:{'heart:constructor':{wins:4},'heart:normal':{wins:1,best:-50}}},tripProgress:{unknown:{wins:[0]}},postOffice:{counts:{pairs:-2},stamps:{invalid:true}}})));
  const repaired=await damaged.newPage();await repaired.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);await ready(repaired);
  assert.equal(await repaired.evaluate(()=>__save.data.sessions.practice),null);assert.deepEqual(await repaired.evaluate(()=>__save.data.library.favorites),['heart']);assert.equal(await repaired.evaluate(()=>__save.data.settings.zoom),1);
  await repaired.evaluate(()=>{__game.startPractice('heart','normal',false);__game.view.pan('broken',Infinity,true);});assert.ok(await repaired.evaluate(()=>Number.isFinite(__game.view.panX)&&Number.isFinite(__game.view.panY)));await damaged.close();
  assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/report.json`,JSON.stringify({date:new Date().toISOString(),tripBoards,practiceBoards,report,legacySavePreserved:true,damagedNewFieldsRepaired:true,errors},null,2));console.log('All travel feature checks passed.');
}finally{await browser.close();}
