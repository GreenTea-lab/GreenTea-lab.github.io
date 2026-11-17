import assert from 'node:assert/strict';
import fs from 'node:fs';import crypto from 'node:crypto';import path from 'node:path';
import {pathToFileURL} from 'node:url';import {chromium} from 'playwright';
import {Game} from '../src/core.js';
import {level,COUNT,FIRST,RHYTHM} from '../src/levels.js';
import {legacyLevel} from '../src/legacy-levels.js';
import {CAMPAIGN_CONFIG_HASH,CAMPAIGN_SEEDS} from '../src/campaign-seeds.js';
import {practiceBoard} from '../src/travel.js';
import {auditDeal} from '../tools/balance-model.mjs';

const out='test-results/balance';fs.mkdirSync(out,{recursive:true});
assert.equal(CAMPAIGN_SEEDS.length,COUNT);
const config=Array.from({length:COUNT},(_,i)=>{const L=level(i);return {pos:L.pos,types:L.types,pairCopies:L.pairCopies,locks:L.locks,hiddenCount:L.hiddenCount};});
assert.equal(crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex'),CAMPAIGN_CONFIG_HASH,'Recalibrate when generation options change');
const groups={first:{easy:[],normal:[],hard:[]},later:{easy:[],normal:[],hard:[]}},rows=[];
for(let i=0;i<COUNT;i++){
  const L=level(i);assert.equal(L.seeds.length,3);assert.equal(new Set(L.seeds).size,3);
  assert.equal(L.pos.length%2,0);assert.ok(L.par.t2>L.par.t3);
  if(i<10)assert.ok(L.pairs<=19);
  if(i<50)assert.ok(L.pairs<=33);
  if(i>=50)assert.equal(L.tier,RHYTHM[i%10]);
  let rate=0;
  for(const seed of L.seeds){
    const g=new Game({...L,seed});
    assert.equal(g.tiles.filter(t=>t.lock).length,L.locks);
    assert.equal(g.tiles.filter(t=>t.hidden&&!t.seen).length,L.hiddenCount);
    if(L.tier==='easy'){
      const counts={};for(const t of g.tiles)counts[t.f]=(counts[t.f]||0)+1;
      assert.ok(Object.values(counts).every(n=>n===2),'Easy campaign boards have exactly one pair per face');
    }
    // Holdout RNG is independent of both the search scout and confirmation simulations.
    const a=auditDeal(g,64,290113+i*37+(seed%997));
    if(L.tier==='easy')assert.equal(a.clearRate,1);
    rate+=a.clearRate/3;
  }
  groups[i<50?'first':'later'][L.tier].push(rate);
  rows.push({level:i+1,tier:L.tier,pairs:L.pairs,clearRate:rate});
}
assert.equal(level(COUNT-1).pairs,50);assert.equal(Math.max(...level(COUNT-1).pos.map(p=>p.z)),3);
assert.equal(level(FIRST.lock).locks,2);assert.equal(level(FIRST.hidden).hiddenCount,3);
assert.ok(Array.from({length:FIRST.lock},(_,i)=>level(i)).every(L=>L.locks===0));
assert.ok(Array.from({length:FIRST.hidden},(_,i)=>level(i)).every(L=>L.hiddenCount===0));
const means={};
for(const [chapter,tiers]of Object.entries(groups)){
  means[chapter]=Object.fromEntries(Object.entries(tiers).map(([tier,rs])=>[tier,{boards:rs.length,mean:rs.reduce((a,b)=>a+b,0)/rs.length}]));
  assert.ok(means[chapter].normal.mean>.6&&means[chapter].normal.mean<.95);
  assert.ok(means[chapter].hard.mean>.15&&means[chapter].hard.mean<means[chapter].normal.mean-.15);
}
const small=['easy','normal','hard'].map(d=>new Game(practiceBoard('mini',d,103)));
assert.equal(small[0].opts.pairCopies,1);assert.equal(small[1].opts.pairCopies,2);assert.equal(small[2].opts.pairCopies,3);
assert.ok(new Set(small.map(g=>g.tiles.map(t=>t.f).join(','))).size===3,'Small practice profiles must differ');
console.log('PASS balance holdout:',JSON.stringify(means));

const browser=await chromium.launch({channel:'chrome'}),errors=[],screens=[];
try{
  for(const [w,h,locale]of [[320,568,'ru-RU'],[390,844,'ru-RU'],[844,390,'ru-RU'],[1280,800,'en-US']]){
    const p=await browser.newPage({viewport:{width:w,height:h},locale});p.on('pageerror',e=>errors.push(e.message));
    await p.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);await p.waitForFunction(()=>window.__PM_BOOT_DONE);
    await p.evaluate(()=>{__game.ui.journey();__game.ui.page=1;__game.ui.journey();});
    assert.equal(await p.locator('.level-difficulty').count(),10);
    assert.ok(await p.locator('.journey-panel').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await p.screenshot({path:`${out}/map-${w}.png`});
    await p.evaluate(()=>{__game.startLevel(11,false);__game.ui.tutorial(0);});
    assert.equal(await p.locator('.intro .repeat-pics img').count(),4);
    assert.ok(await p.locator('.intro').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await p.screenshot({path:`${out}/intro-${w}.png`});
    await p.evaluate(()=>{__game.ui.closeModal();__game.ui.tutorial(0);__game.dbg.freeze=true;__game.startLevel(49,false);__game.ui.closeModal();});
    assert.equal(await p.evaluate(()=>__game.L.balanceVersion),4);
    assert.ok(await p.evaluate(()=>__game.L.seeds.includes(__game.game.opts.seed)));
    await p.evaluate(()=>{__game.pair(...__game.game.hint().pair);__game.elapsed=61;__game.checkpoint();__game.toMenu();});
    const exact=await p.evaluate(()=>JSON.parse(JSON.stringify(__save.data.sessions.level)));
    await p.reload();await p.waitForFunction(()=>window.__PM_BOOT_DONE);
    await p.evaluate(()=>{__game.dbg.freeze=true;__game.playContinue();__game.ui.closeModal();});
    assert.deepEqual(await p.evaluate(()=>JSON.parse(JSON.stringify(__game.game.toJSON()))),exact.game);
    assert.equal(await p.evaluate(()=>__game.elapsed),61);
    assert.equal(await p.evaluate(()=>__save.data.sessions.level.balanceVersion),4);
    if(w===390){
      const old=legacyLevel(9),g=new Game({...old,seed:103});g.match(...g.order[0]);
      const snapshot={id:9,game:g.toJSON(),elapsed:77,used:1,combo:0,lastPair:-99,sel:-1};
      await p.evaluate(s=>{__game.toMenu();__save.data.sessions.level=s;__save.data.lastMode='level';__save.data.levels[0]={stars:3,time:42};__save.write(false);},snapshot);
      await p.reload();await p.waitForFunction(()=>window.__PM_BOOT_DONE);
      await p.evaluate(()=>{__game.dbg.freeze=true;__game.playContinue();});
      assert.deepEqual(await p.evaluate(()=>JSON.parse(JSON.stringify(__game.game.toJSON()))),JSON.parse(JSON.stringify(snapshot.game)));
      assert.deepEqual(await p.evaluate(()=>__game.L.par),old.par);
      assert.equal(await p.evaluate(()=>__save.data.sessions.level.balanceVersion),2);
      assert.equal(await p.evaluate(()=>__save.data.levels[0].stars),3);
      await p.evaluate(()=>{__game.toMenu();__game.playContinue();});
      assert.deepEqual(await p.evaluate(()=>__game.L.par),old.par,'Legacy metadata survives repeated checkpoints');
      await p.evaluate(()=>{__game.ui.closeModal();__game.startLevel(9,false);__game.ui.closeModal();});
      assert.equal(await p.evaluate(()=>__game.game.tiles.length),38);
      assert.equal(await p.evaluate(()=>__save.data.sessions.level.balanceVersion),4);
    }
    screens.push({w,h,locale,passed:true});await p.close();
  }
}finally{await browser.close();}
assert.deepEqual(errors,[]);
fs.writeFileSync(`${out}/verification.json`,JSON.stringify({configHash:CAMPAIGN_CONFIG_HASH,method:'Independent uniform legal-pair simulations, not human win rates',means,screens,errors,rows},null,2));
console.log('PASS curated starts, repeat tutorial, RU/EN map layouts, exact new/legacy resume and preserved stars');
