import assert from 'node:assert/strict';
import fs from 'node:fs';
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
    const {naturalPlants, hillPlants, grass} = __game.island;
    return {naturalPlants, hillPlants, grass:grass.spots.length};
  });
  assert.ok(nature.naturalPlants >= 24 && nature.hillPlants >= 7 && nature.grass >= 140, JSON.stringify(nature));
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
  assert.equal(await page.locator('[data-decor]').count(), 13);
  await page.screenshot({path:out + '/decor-catalog.png'});
  await page.locator('[data-decor=bench]').tap();
  await page.waitForFunction(() => !__game.ui.transitioning);
  const grid = await page.evaluate(() => __game.island.decorPicker.available);
  assert.ok(grid >= 100, `Bench cells: ${grid}`);
  assert.equal(await page.locator('[data-decor-confirm]').isDisabled(), true);
  const point = await page.evaluate(() => {
    const island = __game.island;
    island.update(.05);
    island.render();
    for (let x = -11.75; x < 12; x += .5) for (let z = -6.75; z < 9; z += .5) {
      const item = {id:9999, type:'bench', x, z};
      const p = island.project(x, island.ground(x, z), z);
      if (document.elementFromPoint(p.x, p.y)?.id !== 'c') continue;
      const hit = island.pickGround(p.x, p.y);
      if (!hit || hit.x !== x || hit.z !== z || !island.installDecor(item)) continue;
      island.storeDecor(item.id);
      return {...p, xWorld:x, zWorld:z};
    }
  });
  assert.ok(point, 'A valid bench position can be tapped');
  const before = await page.evaluate(() => __save.data.coins);
  assert.equal(await page.evaluate(() => __game.placeSelectedDecor({x:0,z:17})), false);
  assert.equal(await page.evaluate(() => __save.data.coins), before);
  await page.touchscreen.tap(point.x, point.y);
  assert.equal(await page.evaluate(() => __save.data.coins), before);
  assert.equal(await page.evaluate(() => __game.island.decorPicker.ghost.visible), true);
  await page.evaluate(() => __game.island.render());
  await page.screenshot({path:out + '/decor-placement.png'});
  await page.locator('[data-decor-confirm]').tap();
  assert.equal(await page.evaluate(() => __save.data.coins), before - 60);
  assert.equal(await page.evaluate(() => __game.island.decorPicker), null);
  await page.reload();
  await page.waitForFunction(() => window.__game?.island.playerDecor.size === 1);
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
  fs.writeFileSync(out + '/report.json', JSON.stringify({nature, grid, celebration, packs, pierCoasts:6},null,2));
  console.log('PASS decor, pier, celebration and audio', JSON.stringify({nature, grid, celebration}));
} finally {
  await R.close();
}
