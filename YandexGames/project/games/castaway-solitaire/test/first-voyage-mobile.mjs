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
    await frame.locator('[data-a=play]').tap();
    const game = page.frames().find(f => f.url().includes('/dist-vk/'));
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
        advancing: renders.slice(1).every((entry, i) => entry.angle > renders[i].angle),
      };
    });
    assert.ok(performance.frames >= 12 && performance.advancing, JSON.stringify(performance));
    assert.ok(performance.cardDpr > performance.backgroundDpr);
    assert.deepEqual(errors, []);
    results.push({ viewport, width: cards.width, scale: cards.scale, ...performance });
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
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
