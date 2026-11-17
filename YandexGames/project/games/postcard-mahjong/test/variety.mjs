import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {Game} from '../src/core.js';import {level,COUNT} from '../src/levels.js';
import {balancedLevelV3} from '../src/balanced-levels-v3.js';
import {campaignTargets,campaignGoal} from '../src/campaign-goals.js';
import {ROUTE_LAYOUT_META,ROUTE_LAYOUT_INDEX} from '../src/route-layouts.js';

const out='test-results/variety';fs.mkdirSync(out,{recursive:true});
function geometryKey(pos){
  const variants=[];
  for(const swap of [false,true])for(const sx of [-1,1])for(const sy of [-1,1]){
    const a=pos.map(({x,y,z})=>[sx*(swap?y:x),sy*(swap?x:y),z]),minX=Math.min(...a.map(p=>p[0])),minY=Math.min(...a.map(p=>p[1]));
    variants.push(a.map(([x,y,z])=>[x-minX,y-minY,z]).sort((a,b)=>a[2]-b[2]||a[1]-b[1]||a[0]-b[0]).flat().join(','));
  }return variants.sort()[0];
}
assert.equal(ROUTE_LAYOUT_INDEX.length,1000);assert.equal(Object.keys(ROUTE_LAYOUT_META).length,989);
const signatures=new Set(),counts={clear:0,mail:0,seals:0,unlock:0},cityFamilies=Array.from({length:20},()=>new Set());
let missions=0,shortFinishes=0;
for(let i=0;i<COUNT;i++){
  const L=level(i);signatures.add(geometryKey(L.pos));counts[L.mission]++;
  assert.ok(Math.max(...L.pos.map(p=>p.x))-Math.min(...L.pos.map(p=>p.x))+2<=16);
  assert.ok(Math.max(...L.pos.map(p=>p.y))-Math.min(...L.pos.map(p=>p.y))+2<=16);
  assert.equal(new Set(L.pos.map(p=>[p.x,p.y,p.z].join(','))).size,L.pos.length);
  if(i>=11){
    const m=ROUTE_LAYOUT_META[L.lay];assert.equal(m.city,L.city);cityFamilies[L.city].add(m.family);
    if(i>11&&i%50!==0)assert.notEqual(m.family,ROUTE_LAYOUT_META[level(i-1).lay]?.family,'Avoid neighbouring shapes of the same family');
    for(const p of L.pos)if(p.z)assert.ok(L.pos.some(q=>q.z===p.z-1&&q.x===p.x&&q.y===p.y),'Every upper tile has support');
  }
  if(L.mission==='clear')continue;
  for(const seed of L.seeds){
    const g=new Game({...L,seed}),ids=campaignTargets(g,L);assert.ok(ids.length>=3);assert.equal(new Set(ids).size,ids.length);
    assert.equal(campaignGoal(g,L,ids).done,false);
    for(const pair of g.order){
      assert.ok(g.match(...pair));const q=campaignGoal(g,L,ids);
      if(q.pairs<q.minPairs)assert.equal(q.done,false);
      if(q.done)break;
    }
    const q=campaignGoal(g,L,ids);assert.equal(q.done,true);assert.ok(q.pairs>=Math.ceil(L.pairs*.65));
    if(g.left)shortFinishes++;missions++;
    const restored=Game.fromJSON(JSON.parse(JSON.stringify(g.toJSON())));assert.deepEqual(campaignGoal(restored,L,ids),q);
  }
}
assert.equal(signatures.size,999);assert.ok(cityFamilies.every(s=>s.size===10));assert.equal(counts.mail,99);assert.equal(counts.seals,98);assert.equal(counts.unlock,97);
assert.ok(shortFinishes>missions*.5,'Special routes should regularly finish before the full board is empty');
console.log('PASS variety geometry/goals:',signatures.size,'canonical shapes;',JSON.stringify(counts),missions,'missions;',shortFinishes,'early finishes');

const browser=await chromium.launch({channel:'chrome'}),errors=[],screens=[];
const ready=p=>p.waitForFunction(()=>window.__PM_BOOT_DONE);
try{
  // A contact sheet uses actual runtime positions, including all four layers.
  const contact=await browser.newPage({viewport:{width:1200,height:1120}});
  const cells=Array.from({length:20},(_,c)=>[c*50+12,c*50+27,c*50+49]).flat().map(i=>{
    const L=level(i),m=ROUTE_LAYOUT_META[L.lay];return `<article><b>${i+1} · ${m.theme[0]}</b><small>${m.name[0]} · ${L.mission} · ${L.pairs} пар</small><svg viewBox="-1 -2 19 20">${L.pos.slice().sort((a,b)=>a.z-b.z).map(p=>`<rect x="${p.x-p.z*.13}" y="${p.y-p.z*.17}" width="1.82" height="2.05" rx=".23" fill="${['#bcac84','#dfcfaa','#f2e4c8','#fff6dd'][p.z]}" stroke="#655f48" stroke-width=".09"/>`).join('')}</svg></article>`;
  });
  await contact.setContent(`<style>body{margin:0;background:#183f3a;display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding:10px;font-family:Arial}article{background:#f3eedf;padding:9px;border-radius:10px;display:flex;flex-direction:column}b{font-size:12px}small{font-size:10px;color:#65725a}svg{width:100%;height:140px}</style>${cells.slice(0,30).join('')}`);
  await contact.screenshot({path:`${out}/shapes-1.png`,fullPage:true});
  await contact.setContent(`<style>body{margin:0;background:#183f3a;display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding:10px;font-family:Arial}article{background:#f3eedf;padding:9px;border-radius:10px;display:flex;flex-direction:column}b{font-size:12px}small{font-size:10px;color:#65725a}svg{width:100%;height:140px}</style>${cells.slice(30).join('')}`);
  await contact.screenshot({path:`${out}/shapes-2.png`,fullPage:true});await contact.close();
  for(const [width,height,locale]of [[320,568,'ru-RU'],[390,844,'ru-RU'],[844,390,'ru-RU'],[1280,800,'en-US']]){
    const p=await browser.newPage({viewport:{width,height},locale});p.on('pageerror',e=>errors.push(e.message));
    await p.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);await ready(p);
    await p.evaluate(()=>{__game.dbg.freeze=true;__save.data.settings.pace='calm';});
    for(const [i,kind]of [[12,'mail'],[27,'seals'],[36,'unlock']]){
      await p.evaluate(i=>{__game.ui.closeModal();__save.data.settings.zoom=1;__game.startLevel(i,false);__game.ui.tutorial(0);},i);
      assert.equal(await p.locator('.campaignm').count(),1);assert.ok(await p.locator('.campaignm .mpanel').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
      await p.locator('[data-campaign-go]').click();assert.equal(await p.evaluate(()=>__game.L.mission),kind);
      assert.equal(await p.locator('[data-board-goal]').getAttribute('data-a'),'boardGoal');
      const goalBox=await p.locator('[data-board-goal]').boundingBox();assert.ok(goalBox.x+goalBox.width<=width);
      await p.evaluate(()=>{__game.dbg.freeze=false;});await p.waitForTimeout(1000);await p.evaluate(()=>{__game.dbg.freeze=true;});
      await p.evaluate(()=>document.querySelectorAll('.toast,.banner').forEach(e=>e.remove()));
      await p.screenshot({path:`${out}/${kind}-${width}.png`});
      await p.locator('[data-board-goal]').click();await p.locator('[data-campaign-go]').click();
      await p.evaluate(()=>{__game.pair(...__game.game.hint().pair);__game.elapsed=37;__game.setZoom(1.5);__game.checkpoint();__game.toMenu();});
      const snapshot=await p.evaluate(()=>JSON.parse(JSON.stringify(__save.data.sessions.level)));
      await p.reload();await ready(p);await p.evaluate(()=>{__game.dbg.freeze=true;__game.playContinue();__game.ui.closeModal();});
      assert.deepEqual(await p.evaluate(()=>__game.missionIds),snapshot.missionIds);assert.equal(await p.evaluate(()=>__game.elapsed),37);
      assert.deepEqual(await p.evaluate(()=>[...__game.view.goalIds]),snapshot.missionIds);
      assert.deepEqual(await p.evaluate(()=>JSON.parse(JSON.stringify(__game.game.toJSON()))),snapshot.game);
      if(kind==='seals'){
        await p.evaluate(()=>{for(let n=0;n<9&&!__game.finished;n++)__game.pair(...__game.game.hint().pair);});
        if(!await p.evaluate(()=>__game.finished)){
          const seen=await p.evaluate(()=>__game.missionIds.filter(i=>__game.game.tiles[i].seen));
          await p.evaluate(()=>__game.applyBoost('shuffle'));
          assert.ok(await p.evaluate(ids=>ids.every(i=>__game.game.tiles[i].seen),seen),'Shuffle must retain revealed mission tiles');
        }
      }
      if(kind==='unlock'){
        for(let n=0;n<50&&await p.evaluate(()=>__game.game.keysAlive());n++)await p.evaluate(()=>__game.pair(...__game.game.hint().pair));
        assert.equal(await p.evaluate(()=>__game.game.keysAlive()),false);
        assert.equal(await p.evaluate(()=>__game.view.campaignKind),'unlock');
        assert.deepEqual(await p.evaluate(()=>[...__game.view.goalIds]),snapshot.missionIds,'Lock targets stay marked after the keys are removed');
      }
      for(let n=0;n<110&&!await p.evaluate(()=>__game.finished);n++)await p.evaluate(()=>{const h=__game.game.hint();if(!h?.safe)throw Error('No safe solution');__game.pair(...h.pair);});
      assert.equal(await p.evaluate(()=>__game.finished),true);assert.ok(await p.evaluate(i=>__save.data.levels[i]?.stars===3,i));
      const reward=await p.evaluate(()=>({coins:__save.data.coins,wins:__save.data.travelStats.wins}));
      await p.evaluate(()=>__game.pair(0,1));assert.deepEqual(await p.evaluate(()=>({coins:__save.data.coins,wins:__save.data.travelStats.wins})),reward);
      await p.evaluate(()=>__game.toMenu());
    }
    if(width===390){
      const old=balancedLevelV3(49),g=new Game({...old,seed:103});g.match(...g.order[0]);
      const saved={id:49,balanceVersion:3,game:g.toJSON(),elapsed:77,used:1,combo:0,lastPair:-99,sel:-1};
      await p.evaluate(s=>{__save.data.sessions.level=s;__save.data.lastMode='level';__save.write(false);},saved);
      await p.reload();await ready(p);await p.evaluate(()=>{__game.dbg.freeze=true;__game.playContinue();});
      assert.deepEqual(await p.evaluate(()=>__game.L.par),old.par);assert.equal(await p.evaluate(()=>__game.L.balanceVersion),3);
      assert.deepEqual(await p.evaluate(()=>JSON.parse(JSON.stringify(__game.game.toJSON()))),JSON.parse(JSON.stringify(saved.game)));
      await p.evaluate(()=>{__game.toMenu();__game.playContinue();});assert.equal(await p.evaluate(()=>__game.L.balanceVersion),3);
    }
    await p.evaluate(()=>{__game.toMenu();__save.data.levels=Object.fromEntries(Array.from({length:1000},(_,i)=>[i,{stars:3,time:60}]));__game.ui.journal('shelf');});
    assert.equal(await p.locator('.layout-card').count(),12);await p.locator('[data-shelf-page="1"]').click();assert.equal(await p.locator('.layout-card').count(),12);
    assert.ok(await p.locator('.mpanel').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    await p.screenshot({path:`${out}/shelf-${width}.png`});
    screens.push({width,height,locale,passed:true});await p.close();
  }
}finally{await browser.close();}
assert.deepEqual(errors,[]);
fs.writeFileSync(`${out}/verification.json`,JSON.stringify({canonicalShapes:signatures.size,newLayouts:989,counts,missions,shortFinishes,screens,errors},null,2));
console.log('PASS campaign goals, minimum progress, RU/EN phone/landscape layouts, shuffle, save/reload, v3 migration and paginated shelf');
