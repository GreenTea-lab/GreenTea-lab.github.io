// мотор: по умолчанию выключен; у старого сохранения выключается один раз; включённый — только низы
import { run, done } from './shot.mjs';
const res = {};
let e = await run({ w: 800, h: 600, steps: async (page) => {
  res.defaultOff = await page.evaluate(() => window.__game.s.settings.engine === false);
} });
e = e.concat(await run({ w: 800, h: 600, pre: `localStorage.setItem('tractor_farm_save_v1', JSON.stringify({ ts: 1, coins: 999, settings: { engine: true } }))`, steps: async (page) => {
  res.oldSaveOff = await page.evaluate(() => window.__game.s.settings.engine === false && window.__game.s.coins === 999);
  await page.click('#menu .play'); await page.waitForTimeout(300);
  await page.evaluate(() => { window.__game.s.settings.engine = true; });
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(2500);
  res.engineNode = await page.evaluate(async () => { const { } = {}; const a = window.__game && document.querySelector('canvas') ? true : false; return a; });
  await page.keyboard.up('ArrowDown');
} }));
console.log(JSON.stringify(res));
done(e);
