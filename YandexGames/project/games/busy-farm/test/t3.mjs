// ручной прогон: тапы по полю, покупка, сбор, амбар, машина
import { run, done } from './shot.mjs';
const W = +process.argv[2] || 390, H = +process.argv[3] || 844, mob = process.argv[4] !== 'd';
const tag = process.argv[5] || 'h', loc = process.argv[6] || 'ru-RU';
const errs = await run({ w: W, h: H, mobile: mob, locale: loc, debug: { shots: 1, sub: 6 }, steps: async (p) => {
  const tap = async (x, y) => (mob ? p.touchscreen.tap(x, y) : p.mouse.click(x, y));
  const S = () => p.evaluate(() => { const f = window.__game.farm; return { t: +f.t.toFixed(1), coins: f.coins, water: f.well.water, grass: f.grass ? f.grass.length : (f.cells ? f.cells.filter(Boolean).length : -1), animals: f.animals.length, items: f.items.filter(i=>!i.gone).length, stock: JSON.stringify(f.stock), truck: f.truck.state }; });
  await p.evaluate(() => window.__game.startLevel(2));
  await p.waitForTimeout(800);
  // поле
  const fc = await p.evaluate(() => { const g = window.__game, F = g.lay.field; return g.view.project((F.x0 + F.x1) / 2, 0, (F.z0 + F.z1) / 2); });
  await tap(fc.x, fc.y); await p.waitForTimeout(150);
  await tap(fc.x + 30, fc.y + 20); await p.waitForTimeout(150);
  console.log('after plant', JSON.stringify(await S()));
  // купить гуся
  const b = await p.$('.sbtn[data-k="goose"]');
  await (mob ? b.tap() : b.click());
  await p.waitForTimeout(500);
  console.log('after buy', JSON.stringify(await S()));
  await p.screenshot({ path: `shots/${tag}-play1.png` });
  // ждём яйца и собираем тапом
  for (let k = 0; k < 40; k++) {
    await p.waitForTimeout(1000);
    const it = await p.evaluate(() => { const g = window.__game; const i = g.farm.items.find((x) => !x.gone && !x.carried && true); if (!i) return null; const q = g.view.project(i.x, 0.2, i.z); return { x: q.x, y: q.y, id: i.id }; });
    if (it) { await p.screenshot({ path: `shots/${tag}-egg.png` }); await tap(it.x, it.y); await p.waitForTimeout(600); console.log('tap item', JSON.stringify(it), JSON.stringify(await S())); break; }
  }
  // амбар
  const st = await p.evaluate(() => { const g = window.__game, s = g.lay.store; return g.view.project(s.x, 1, s.z); });
  await tap(st.x, st.y); await p.waitForTimeout(500);
  console.log('barn open', await p.evaluate(() => !!document.querySelector('.modal.barn')));
  const row = await p.$('.irow[data-l]:not([disabled])'); console.log('barn html', await p.evaluate(() => document.querySelector('.barn2')?.innerText.replace(/\s+/g,' ')));
  if (row) { await (mob ? row.tap() : row.click()); await p.waitForTimeout(300); }
  await p.screenshot({ path: `shots/${tag}-barn.png` });
  const go = await p.$('.modal .go:not([disabled])');
  if (go) { await (mob ? go.tap() : go.click()); await p.waitForTimeout(500); }
  console.log('after send', JSON.stringify(await S()));
  await p.waitForTimeout(4000);
  await p.screenshot({ path: `shots/${tag}-play2.png` });
  // пауза и настройки
  await (mob ? (await p.$('[data-a="pause"]')).tap() : (await p.$('[data-a="pause"]')).click());
  await p.waitForTimeout(400);
  await p.screenshot({ path: `shots/${tag}-pause.png` });
}});
done(errs);
