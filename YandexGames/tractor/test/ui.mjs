// Скриншоты: меню, игра, вспашка, посев, рост, урожай, окна
import { run, done } from './shot.mjs';
const O = 'test/out/';
// проехать «змейкой» по полю i, вызывая работу орудия (без реального времени)
const sweep = (page, i, frac = 1) => page.evaluate(([i, frac]) => {
  const g = window.__game, f = g.fields[i], tr = g.tractor;
  const need = f.need(); if (!need) return;
  if (need === 'seed') f.setCrop(g.s.seed);
  tr.setTool({ plow: 'plow', seed: 'seed', harvest: 'harvest' }[need], true);
  const rows = Math.ceil(14 / (tr.width * 0.9));
  for (let r = 0; r < rows * frac; r++) {
    const z = f.z - 7 + (r + 0.5) * (14 / rows);
    for (let k = 0; k <= 60; k++) {
      const x = f.x - 11 + (k / 60) * 22 * (r % 2 ? -1 : 1) + (r % 2 ? 22 : 0);
      tr.h = r % 2 ? -Math.PI / 2 : Math.PI / 2;
      tr.x = x - Math.sin(tr.h) * (need === 'harvest' ? 2.9 : -2.5);
      tr.z = z;
      if (f.need() !== need) return;
      g.work(f, need);
    }
  }
}, [i, frac]);
let all = [];
for (const [name, w, h, mobile] of [['desk', 1280, 720, false], ['phone', 390, 800, true]]) {
  all = all.concat(await run({ w, h, mobile, dpr: mobile ? 2 : 1, steps: async (page) => {
    await page.waitForTimeout(1500);
    await page.screenshot({ path: O + name + '_menu.png' });
    await page.click('#menu .play'); await page.waitForTimeout(800);
    await page.screenshot({ path: O + name + '_tut.png' });
    await page.click('.tut-ok'); await page.waitForTimeout(300);
    // проехать вперёд клавиатурой
    await page.keyboard.down('ArrowDown'); await page.waitForTimeout(4000); await page.keyboard.up('ArrowDown');
    await page.screenshot({ path: O + name + '_drive.png' });
    // поле 0: вспашка наполовину
    await page.evaluate(() => { const g = window.__game, f = g.fields[0]; g.tractor.x = f.x; g.tractor.z = f.z - 9; g.tractor.h = 0; });
    await sweep(page, 0, 0.5);
    await page.evaluate(() => { const g = window.__game, f = g.fields[0], tr = g.tractor; tr.x = f.x + 2; tr.z = f.z - 1; tr.h = Math.PI / 2; });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: O + name + '_plow.png' });
    await sweep(page, 0, 1);
    await page.evaluate(() => { const g = window.__game; g.s.seed = 'corn'; g.s.lvl = 4; });
    await sweep(page, 0, 0.6);
    await page.waitForTimeout(800);
    await page.screenshot({ path: O + name + '_seed.png' });
    await sweep(page, 0, 1);
    // поле 1: пшеница, растёт
    await sweep(page, 1, 1); await page.evaluate(() => (window.__game.s.seed = 'wheat')); await sweep(page, 1, 1);
    await page.evaluate(() => { const g = window.__game; const f = g.fields[1]; f.t0 = Date.now() - f.dur * 0.6; f.updatePlants(true); g.fields[0].t0 = Date.now() - g.fields[0].dur - 1; });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: O + name + '_grow.png' });
    // урожай поля 0 наполовину
    await sweep(page, 0, 0.5);
    await page.evaluate(() => { const g = window.__game, f = g.fields[0], tr = g.tractor; tr.x = f.x - 3; tr.z = f.z + 1; tr.h = -Math.PI / 2; });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: O + name + '_harvest.png' });
    const st = await page.evaluate(() => { const g = window.__game; return { load: g.loadTotal(), stage: g.fields[0].stage, tool: g.tractor.tool, coins: g.s.coins }; });
    console.log(name, JSON.stringify(st));
    // в амбар
    await page.evaluate(() => { const tr = window.__game.tractor; tr.x = -8; tr.z = 1; tr.h = Math.PI; });
    await page.waitForFunction(() => window.__game.loadTotal() === 0, null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: O + name + '_sell.png' });
    console.log(name, 'после продажи', JSON.stringify(await page.evaluate(() => ({ load: window.__game.loadTotal(), coins: window.__game.s.coins, xp: window.__game.s.xp }))));
    await page.click('.h-shop'); await page.waitForTimeout(400);
    await page.screenshot({ path: O + name + '_shop.png' });
    await page.evaluate(() => window.__game.closeModal(true));
    await page.click('.h-orders'); await page.waitForTimeout(300);
    await page.screenshot({ path: O + name + '_orders.png' });
  } }));
}
done(all);
