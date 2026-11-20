import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { runtime } from './runtime.mjs';
import { shapeF } from '../src/island.js';
import { planSites } from '../src/spatial.js';
import { BUILD, VS } from '../src/models.js';

const out = 'test-results/island-workshop';
fs.mkdirSync(out, { recursive: true });
for (let tier = 0; tier <= 5; tier++) {
  const shape = (x, z) => shapeF(x, z, tier);
  const pier = planSites(tier, shape).pier;
  assert.ok(shape(pier.x, pier.z) > 0);
  for (let stage = 1; stage <= 3; stage++) {
    assert.ok(shape(pier.x, pier.z + (BUILD.pier(stage).maxZ - 3) * VS) < -.05);
  }
}
const R = await runtime();
try {
  const page = await R.browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale:'ru-RU' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__CS_DEBUG = {manual:true};
    if (!localStorage.getItem('castaway_solitaire_v1')) {
      localStorage.setItem('castaway_solitaire_v1', JSON.stringify({
        levels: {1: {stars:3, best:100}}, seen:{tableTools:1}, settings:{quality:'low'},
      }));
    }
  });
  await page.goto(R.base + '/dist-vk-single/index.html');
  await page.waitForFunction(() => window.__game?.ui && !document.querySelector('#loader'));
  const nature = await page.evaluate(() => {
    const {naturalPlants, hillPlants, grass,walkers,landAnimals,turtles,gulls} = __game.island;
    return {naturalPlants, hillPlants, grass:grass.spots.length, rocky:grass.spots.filter(p=>__game.island.rockTile(p.x,p.z)).length,
      adults:walkers.length,land:landAnimals.map(w=>w.species),turtles:turtles.length,gulls:gulls.length};
  });
  assert.ok(nature.naturalPlants >= 24 && nature.hillPlants >= 7 && nature.grass >= 100, JSON.stringify(nature));
  assert.deepEqual([nature.rocky,nature.adults,nature.land,nature.turtles,nature.gulls],[0,2,['crab'],0,1]);
  await page.waitForSelector('.logo-hidden',{state:'attached'});
  assert.equal(await page.locator('[data-guide-notice]').getAttribute('data-kind'),'decor');
  await page.locator('.guide-dismiss').tap();
  await page.locator('.guide-dismiss').tap();
  // Manual mode freezes the opening camera move until it is advanced here.
  await page.evaluate(()=>{
    const island=__game.island;
    for(let i=0;island.camT&&i<40;i++)island.update(.05);
    island.render();
  });
  const targetActor=id=>page.evaluate(id=>{
    const I=__game.island;
    I.update(.05);
    I.render();
    const actor=I.allActors().find(w=>w.id===id);
    const {x,y,z}=actor.m.position;
    const p=I.project(x,y+(actor.species?.length ? .32 : .66),z);
    for(const dy of [0,-4,4,-8,8])for(const dx of [0,-4,4,-8,8]){
      const x=p.x+dx,y=p.y+dy;
      if(document.elementFromPoint(x,y)?.id==='c'&&I.pickIsland(x,y)?.actor===actor)return {x,y};
    }
  },id);
  const resident=await targetActor('robin');
  assert.ok(resident,'A visible point hits Robinson');
  await page.touchscreen.tap(resident.x,resident.y);
  assert.match(await page.locator('.actor-speech').textContent(),/Привет/);
  await page.waitForFunction(()=>__audio.ctx?.state==='running');
  await page.evaluate(()=>{delete __audio.last.actor;});
  const crab=await targetActor('crab-0');
  assert.ok(crab,'A visible point hits the crab');
  await page.touchscreen.tap(crab.x,crab.y);
  assert.match(await page.locator('.actor-speech').textContent(),/Клац/);
  assert.equal(await page.evaluate(()=>typeof __audio.last.actor),'number');
  assert.equal(await page.locator('.voyage-strip').count(), 0);
  await page.locator('.island-nav [data-a=world]').tap();
  assert.match(await page.locator('.districts + p').innerText(), /звёзды/);
  await page.locator('[data-x]').tap();
  await page.locator('.districts').waitFor({state:'detached'});
  await page.locator('.island-nav [data-a=build]').tap();
  assert.match(await page.locator('.pb').innerText(), /Баланс звёзд: 3/);
  await page.locator('[data-x]').tap();
  await page.locator('.pb').waitFor({state:'detached'});
  await page.locator('[data-a=decor]').tap();
  assert.equal(await page.locator('[data-decor]').count(), 19);
  await page.screenshot({path:out + '/decor-catalog.png'});
  await page.locator('[data-decor=bench]').tap();
  await page.waitForFunction(() => !__game.ui.transitioning);
  const grid = await page.evaluate(() => __game.island.decorPicker.available);
  assert.ok(grid > 244, `Bench cells: ${grid}`);
  assert.equal(await page.locator('[data-decor-confirm]').count(), 0);
  const point = await page.evaluate(() => {
    const island = __game.island;
    island.update(.05);
    island.render();
    const rotated=island.decorShape(island.decorPicker.shape.def,1);
    for (let x = -11.75; x < 12; x += .5) for (let z = -6.75; z < 9; z += .5) {
      const item = {id:9999, type:'bench', x, z};
      const p = island.project(x, island.ground(x, z), z);
      if (document.elementFromPoint(p.x, p.y)?.id !== 'c') continue;
      const hit = island.pickGround(p.x, p.y);
      if (!hit || hit.x !== x || hit.z !== z || !island.decorPlacement(rotated,x,z) || !island.installDecor(item)) continue;
      island.storeDecor(item.id);
      return {...p, xWorld:x, zWorld:z};
    }
  });
  assert.ok(point, 'A valid bench position can be tapped');
  const before = await page.evaluate(() => __save.data.coins);
  assert.equal(await page.evaluate(() => __game.placeSelectedDecor({x:0,z:17})), false);
  await page.mouse.move(point.x,point.y);
  const hover=await page.evaluate(()=>[__game.island.decorPicker.ghost.visible,__game.island.decorPicker.footprint,__game.decorPoint,__save.data.coins]);
  assert.ok(hover[0] && hover[1]>=2 && !hover[2] && hover[3]===before,JSON.stringify(hover));
  assert.equal(await page.locator('[data-decor-confirm]').count(),0);
  await page.touchscreen.tap(point.x, point.y);
  assert.equal(await page.evaluate(() => __save.data.coins), before);
  assert.equal(await page.evaluate(() => __game.island.decorPicker.ghost.visible), true);
  await page.locator('[data-decor-rotate]').tap();
  assert.equal(await page.evaluate(() => __game.island.decorPicker.ghost.rotation.y),Math.PI/2);
  await page.evaluate(() => __game.island.render());
  await page.screenshot({path:out + '/decor-placement.png'});
  await page.locator('[data-decor-confirm]').tap();
  assert.equal(await page.evaluate(() => __save.data.coins), before - 60);
  assert.equal(await page.evaluate(() => __game.island.decorPicker), null);
  await page.reload();
  await page.waitForFunction(() => window.__game?.island.playerDecor.size === 1);
  assert.equal(await page.evaluate(() => __save.data.decor[0].turn),1);
  await page.locator('[data-a=decor]').tap();
  await page.locator('[data-store-decor]').tap();
  await page.locator('[data-decor=bench]').tap();
  await page.waitForFunction(() => !__game.ui.transitioning);
  await page.evaluate(p => __game.previewSelectedDecor({x:p.xWorld,z:p.zWorld}), point);
  await page.locator('[data-decor-confirm]').tap();
  assert.equal(await page.evaluate(() => __save.data.coins), before - 60);

  await page.evaluate(() => __game.build('hut'));
  await page.waitForFunction(() => __game.island.stages.hut === 1);
  const celebration = await page.evaluate(() => {
    const island = __game.island;
    let celebrating = false, valid = true;
    for (let i = 0; i < 220; i++) {
      island.update(.05);
      celebrating ||= island.walkers.some(w => w.celebration?.started != null && w.m.position.y > island.ground(w.x, w.z) + .1);
      valid &&= island.walkers.every(w => island.walkable(w.x,w.z));
    }
    island.render();
    return {celebrating, valid};
  });
  assert.deepEqual(celebration, {celebrating:true, valid:true});
  assert.ok(await page.evaluate(()=>__game.island.lastArrivals.some(actor=>actor.ru==='Попугай')));
  const parrot=await targetActor('parrot-0');
  assert.ok(parrot,'A visible point hits the parrot after building the hut');
  await page.touchscreen.tap(parrot.x,parrot.y);
  assert.match(await page.locator('.actor-speech').textContent(),/Кар-р/);
  const life=await page.evaluate(()=>{
    const I=__game.island;
    I.setStages({...I.stages,pier:1});
    const arrivedTurtle=I.lastArrivals.some(actor=>actor.ru==='Черепаха');
    const person=I.walkers[0],parrot=I.landAnimals.find(w=>w.species==='parrot');
    person.celebration=person.social=parrot.social=null;
    I.nextSocial=0;
    parrot.x=person.x+1.2;parrot.z=person.z;
    I.startSocial();
    const social=person.social?.partner===parrot&&parrot.social?.partner===person;
    const turtle=I.turtles[0], fin=turtle.userData.flippers[0].part;
    I.update(.05);
    const before=fin.rotation.y;
    I.update(.1);
    const movingFins=before!==fin.rotation.y;
    const old=__save.data.coins;
    const grass=I.grass.spots.find(p=>I.hasGrass(p.x,p.z));
    __game.chooseDecor('grass',true);
    __game.previewSelectedDecor(grass);
    const trimmed=__game.placeSelectedDecor(__game.decorPoint)&&!I.hasGrass(grass.x,grass.z);
    __game.cancelDecor();
    return {social,arrivedTurtle,movingFins,trimmed,free:__save.data.coins===old};
  });
  assert.deepEqual(life,{social:true,arrivedTurtle:true,movingFins:true,trimmed:true,free:true});
  const displaced=await page.evaluate(()=>{
    const game=__game,I=game.island,fire=I.projectArea('fire',1);
    if(!game.chooseDecor('crate'))return false;
    const {shape}=I.decorPicker;
    for(let i=Math.floor(fire.minX*2)-1;i<=Math.ceil(fire.maxX*2);i++)for(let j=Math.floor(fire.minZ*2)-1;j<=Math.ceil(fire.maxZ*2);j++){
      const x=(i+.5)/2,z=(j+.5)/2,placement=I.decorPlacement(shape,x,z);
      if(!placement||!I.overlaps(placement,fire))continue;
      game.previewSelectedDecor({x,z});
      if(!game.placeSelectedDecor(game.decorPoint))return false;
      const crate=__save.data.decor.find(item=>item.type==='crate');
      __save.data.levels[2]={stars:3,best:100};
      game.build('fire');
      return crate.x===null&&crate.z===null&&!I.playerDecor.has(crate.id);
    }
    return false;
  });
  assert.equal(displaced,true,'A new fire moves overlapping decor into storage');
  await page.waitForFunction(()=>__game.island.stages.fire===1);
  await page.getByText(/Декор убран на склад/).waitFor();
  const fireHits=await page.evaluate(()=>{
    const I=__game.island,area=I.projectArea('fire',1),site=I.spots.fire;
    I.camT=null;
    for(let frame=0;frame<22;frame++)I.update(.05);
    I.applyCam();
    I.render();
    const center=I.project((area.minX+area.maxX)/2,(area.minY+area.maxY)/2,(area.minZ+area.maxZ)/2);
    let modelHit=null;
    for(const dy of [0,-3,3,-6,6]){
      for(const dx of [0,-3,3,-6,6]){
        if(I.pickAt(center.x+dx,center.y+dy)==='fire')modelHit='fire';
      }
    }
    const x=site.x,z=area.maxZ+.55;
    const outside=I.project(x,I.ground(x,z)+.01,z);
    return [modelHit,I.pickAt(outside.x,outside.y)];
  });
  assert.equal(fireHits[0],'fire');
  assert.notEqual(fireHits[1],'fire');
  await page.locator('[data-a=settings]').tap();
  const music = ['island','bassa','bossa'];
  const packs = [...music,'draw','place','flip','shuffle','wave','click','error','open','build','buy','gift','decor','unlock'];
  await page.waitForFunction(names => names.every(name => __audio.recordings[name]), packs);
  const played = [];
  for (let i = 0; i < music.length; i++) {
    const track = await page.evaluate(() => __audio.recordedTrack);
    played.push(track);
    await page.evaluate(() => __audio.recordedMusic.stop());
    await page.waitForFunction(last => __audio.recordedTrack !== last, track);
  }
  assert.deepEqual(played.sort(), music.sort());
  await page.locator('[data-audio-pack=musicPack]').selectOption('classic');
  await page.locator('[data-audio-pack=soundPack]').selectOption('classic');
  assert.deepEqual(await page.evaluate(() => [!!__audio.recordedMusic, __audio.soundPack]), [false,'classic']);
  await page.reload();
  await page.waitForFunction(() => window.__save && __save.data.settings.musicPack === 'classic');
  assert.equal(await page.evaluate(() => __save.data.settings.soundPack), 'classic');
  assert.deepEqual(errors, []);
  await page.close();
  const file = out + '/offline.html';
  fs.writeFileSync(file,fs.readFileSync('dist-vk-single/index.html','utf8')
    .replace('<head>','<head><meta name="castaway-preview-reset" content="reset-test">'));
  const offline=await R.browser.newPage({locale:'ru-RU'});
  await offline.addInitScript(()=>{
    window.__CS_DEBUG={manual:true};
    if(!localStorage.getItem('castaway_solitaire_v1'))localStorage.setItem('castaway_solitaire_v1',JSON.stringify({
      level:7,coins:35,settings:{quality:'low',musicVol:.2},
    }));
  });
  await offline.goto(pathToFileURL(file).href);
  await offline.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
  assert.deepEqual(await offline.evaluate(()=>[__save.data.level,__save.data.coins,__save.data.settings.musicVol]),[1,400,.2]);
  await offline.locator('[data-a=settings]').click();
  await Promise.all([
    offline.waitForEvent('load'),
    offline.getByRole('button',{name:'Вернуть прежний прогресс'}).click(),
  ]);
  await offline.waitForFunction(()=>window.__game?.ui&&__save.data.level===7);
  await offline.close();
  fs.unlinkSync(file);
  fs.writeFileSync(out + '/report.json', JSON.stringify({nature, grid, celebration, life, packs, pierCoasts:6},null,2));
  console.log('PASS decor, pier, celebration and audio', JSON.stringify({nature, grid, celebration}));
} finally {
  await R.close();
}
