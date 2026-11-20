import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runtime } from './runtime.mjs';

const output = 'test-results/first-voyage';
fs.mkdirSync(output, { recursive: true });
const { browser, base, close } = await runtime();
const results = [];
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    const page = await browser.newPage({
      viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('castaway_solitaire_v1', JSON.stringify({ seen: { tableTools: 1 } }));
    });
    await page.goto(base + '/parent?lang=ru&platform=mobile_android');
    const frame = page.frameLocator('iframe');
    const navigation = frame.locator('.island-nav button');
    await navigation.first().waitFor();
    assert.deepEqual(await navigation.evaluateAll(buttons => buttons.map(button => button.dataset.a)), ['world','build','decor','play','levels','lb','journal']);
    assert.ok(await navigation.evaluateAll(buttons => buttons.every(button => {
      const rect = button.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
    })));
    const game = page.frames().find(f => f.url().includes('/dist-vk/'));
    assert.equal(await frame.locator('[data-guide-notice]').getAttribute('data-kind'),'controls');
    assert.equal(await game.evaluate(()=>!!__save.data.seen.earnedCoins),false);
    await frame.locator('[data-guide-open]').tap();
    assert.match(await frame.locator('.guide-step').innerText(),/правую кнопку/);
    assert.match(await frame.locator('.guide-step').innerText(),/двумя пальцами/);
    if(viewport.width===390){
      await page.screenshot({path:`${output}/island-guide-${viewport.width}.png`});
      await frame.locator('[data-guide-next]').tap();
      assert.match(await frame.locator('.guide-title').innerText(),/Жители и постройки/);
      await frame.locator('[data-guide-next]').tap();
      assert.match(await frame.locator('.guide-step').innerText(),/клавишей Z/);
      await frame.locator('[data-guide-back]').tap();
      assert.match(await frame.locator('.guide-title').innerText(),/Жители и постройки/);
    }
    await frame.locator('[data-x]').tap();
    assert.equal(await frame.locator('[data-guide-notice]').getAttribute('data-kind'),'');
    if(viewport.width===390){
      await game.waitForFunction(()=>!__game.ui.transitioning);
      await game.evaluate(()=>{__game.island.camT=null;});
      const before=await game.evaluate(()=>({...__game.island.cam}));
      const touch=await page.context().newCDPSession(page);
      const gesture=(type,positions)=>touch.send('Input.dispatchTouchEvent',{type,touchPoints:positions.map(([x,y],id)=>({x,y,id}))});
      await gesture('touchStart',[[180,360]]);
      await gesture('touchMove',[[220,385]]);
      await gesture('touchEnd',[]);
      const afterOrbit=await game.evaluate(()=>({...__game.island.cam}));
      assert.notEqual(afterOrbit.yaw,before.yaw);
      await gesture('touchStart',[[156,355],[190,355]]);
      await gesture('touchMove',[[145,372],[218,372]]);
      await gesture('touchEnd',[]);
      const afterPinch=await game.evaluate(()=>({...__game.island.cam}));
      assert.notEqual(afterPinch.dist,afterOrbit.dist);
      assert.notEqual(afterPinch.tx,afterOrbit.tx);
      await touch.detach();
    }
    await frame.locator('[data-a=play]').tap();
    await game.waitForFunction(() => __game.table.busy === 0);
    assert.equal(await game.evaluate(() => __game.quality), 'mid');
    assert.match(await frame.locator('#tip').innerText(), /на 7 можно положить 6 или 8/);
    const scale = frame.locator('#cardScale');
    await scale.fill(await scale.getAttribute('max'));
    const cards = await game.evaluate(() => {
      const table = __game.table;
      const top = document.querySelector('.tip').getBoundingClientRect().bottom;
      const first = table.g.cards.findIndex((_, index) => table.g.playable(index));
      return {
        width: +table.cw.toFixed(1), scale: table.cardScale,
        fit: table.sprites.every(({ x, y }) => x - table.cw / 2 >= 0 &&
          x + table.cw / 2 <= innerWidth && y - table.ch / 2 >= top &&
          y + table.ch / 2 <= table.stockPos.y - table.ch / 2),
        target: table.sprites[first],
      };
    });
    assert.ok(cards.fit, JSON.stringify({ viewport, cards }));
    await page.screenshot({ path: `${output}/tutorial-${viewport.width}.png` });
    const bounds = await page.locator('iframe').boundingBox();
    await page.touchscreen.tap(bounds.x + cards.target.x, bounds.y + cards.target.y);
    await game.waitForFunction(() => __game.table.g.cards.some(card => card.gone));

    const performance = await game.evaluate(async () => {
      const { island } = __game;
      const renders = [];
      const render = island.render;
      island.render = function () {
        renders.push({ time: window.performance.now(), angle: this.tableOrbit });
        return render.call(this);
      };
      await new Promise(resolve => setTimeout(resolve, 2400));
      island.render = render;
      const gaps = renders.slice(1).map((entry, i) => entry.time - renders[i].time).sort((a, b) => a - b);
      return {
        frames: renders.length, p95GapMs: +gaps[Math.floor(gaps.length * 0.95)]?.toFixed(1),
        backgroundDpr: island.renderer.getPixelRatio(), cardDpr: __game.table.dpr,
        angle: Math.atan2(island.camera.position.y - .6, Math.hypot(island.camera.position.x, island.camera.position.z)) * 180 / Math.PI,
        advancing: renders.slice(1).every((entry, i) => entry.angle > renders[i].angle),
      };
    });
    assert.ok(performance.frames >= 12 && performance.advancing, JSON.stringify(performance));
    assert.ok(performance.cardDpr > performance.backgroundDpr);
    assert.ok(Math.abs(performance.angle - 45) < .1);
    assert.deepEqual(errors, []);
    results.push({ viewport, width: cards.width, scale: cards.scale, ...performance });
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/dist-vk-single/index.html');
  await page.waitForFunction(()=>window.__game?.ui);
  const camera=()=>page.evaluate(()=>{
    const {yaw,pitch,tx,tz,dist}=__game.island.cam;
    return {yaw,pitch,tx,tz,dist};
  });
  await page.evaluate(()=>{__game.island.camT=null;});
  const start=await camera();
  await page.mouse.move(186,360);
  await page.mouse.down({button:'right'});
  await page.mouse.move(226,378,{steps:4});
  await page.mouse.up({button:'right'});
  const orbit=await camera();
  assert.notEqual(orbit.yaw,start.yaw);
  assert.notEqual(orbit.pitch,start.pitch);
  assert.equal(orbit.tx,start.tx);
  await page.mouse.down({button:'left'});
  await page.mouse.move(180,395,{steps:4});
  await page.mouse.up({button:'left'});
  const pan=await camera();
  assert.equal(pan.yaw,orbit.yaw);
  assert.notEqual(pan.tx,orbit.tx);
  await page.mouse.wheel(0,80);
  await page.waitForFunction(dist=>__game.island.cam.dist!==dist,pan.dist);
  await page.goto(base + '/dist-single/gallery.html');
  assert.equal(await page.locator('#coasts button').count(), 6);
  assert.equal(await page.locator('article').count(), 25);
  assert.equal(await page.locator('figure').count(), 75);
  for (const button of await page.locator('#coasts button').all()) {
    await button.click();
    await page.screenshot({ path: `${output}/coast-${(await button.innerText()).replaceAll(' ', '-')}.png` });
  }
  await page.locator('#stages button').first().click();
  assert.equal(await page.locator('#error').isVisible(), false);
  for (const image of await page.locator('figure img').all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(async img => {
      for (let i = 0; i < 30 && !img.src; i++) await new Promise(resolve => setTimeout(resolve, 50));
      await img.decode();
    });
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(`${output}/report.json`, JSON.stringify({ screens: results, coasts: 6, models: 75 }, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await close();
}
