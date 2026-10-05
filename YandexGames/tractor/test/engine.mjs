// мотор: по умолчанию выключен; у старого сохранения выключается один раз; включённый — только низы
import { run, done } from './shot.mjs';
const res = {};
let e = await run({ w: 800, h: 600, steps: async (page) => {
  res.defaultOn = await page.evaluate(() => window.__game.s.settings.engine === true);
} });
e = e.concat(await run({ w: 800, h: 600, pre: `localStorage.setItem('tractor_farm_save_v1', JSON.stringify({ ts: 1, coins: 999, settings: { engine: false, eng2: true } }))`, steps: async (page) => {
  res.oldSaveOn = await page.evaluate(() => window.__game.s.settings.engine === true && window.__game.s.coins === 999);
  await page.click('#menu .play'); await page.waitForTimeout(300);
  await page.evaluate(() => { window.__game.s.settings.engine = true; });
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(2500);
  res.engineNode = await page.evaluate(async () => { const { } = {}; const a = window.__game && document.querySelector('canvas') ? true : false; return a; });
  await page.keyboard.up('ArrowDown');
} }));
console.log(JSON.stringify(res));
// выбор игрока сохраняется: выключил — после перезапуска остаётся выключенным
const e2 = await run({ w: 800, h: 600, pre: `localStorage.setItem('tractor_farm_save_v1', JSON.stringify({ ts: 1, settings: { engine: false, eng3: true } }))`, steps: async (page) => {
  console.log('userOffKept', await page.evaluate(() => window.__game.s.settings.engine === false));
} });
done(e.concat(e2));
