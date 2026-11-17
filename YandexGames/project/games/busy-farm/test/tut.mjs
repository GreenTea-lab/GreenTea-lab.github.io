// прогон обучения уровня 1–3 тапами, скриншоты каждого шага
import { run, done } from './shot.mjs';
const W = +process.argv[2] || 1280, H = +process.argv[3] || 720, mob = process.argv[4] === 'm', tag = process.argv[5] || 'tu';
const errs = await run({ w: W, h: H, mobile: mob, locale: process.env.LOC || 'ru-RU', debug: { shots: 1, sub: 4 }, steps: async (p) => {
  const tap = async (x, y) => (mob ? p.touchscreen.tap(x, y) : p.mouse.click(x, y));
  const info = () => p.evaluate(() => { const T = window.__game.tutor; return T.cur ? T.cur.name + ':' + T.cur.i + ':' + T.step.k + (T.cur.shown ? '' : '(hidden)') : 'none'; });
  let k = 0;
  const shot = async (n) => p.screenshot({ path: `shots/${tag}-${String(k++).padStart(2, '0')}-${n}.png` });
  const ok = async () => { const b = await p.$('.tut .tok'); if (b) { await (mob ? b.tap() : b.click()); await p.waitForTimeout(300); } };
  const proj = (fn) => p.evaluate(fn);
  // уровень 1
  await p.evaluate(() => window.__game.startLevel(1));
  await p.waitForTimeout(600);
  console.log(await info()); await shot('l1a'); await ok();
  console.log(await info()); await shot('l1b');
  const fc = await proj(() => { const g = window.__game, F = g.lay.field; return g.view.project((F.x0 + F.x1) / 2 + 1, 0, (F.z0 + F.z1) / 2); });
  await tap(fc.x, fc.y); await p.waitForTimeout(500);
  console.log(await info()); await shot('l1c'); await ok();
  console.log(await info()); await shot('l1d');
  await p.waitForFunction(() => window.__game.tutor.step && window.__game.tutor.step.k === 'tu_l1e' && window.__game.tutor.cur.shown, null, { timeout: 90000 });
  await p.waitForTimeout(400);
  console.log(await info()); await shot('l1e');
  const it = await proj(() => { const g = window.__game; const i = g.farm.items.find((x) => !x.gone && !x.carried); const q = g.view.project(i.x, 0.2, i.z); return q; });
  await tap(it.x, it.y); await p.waitForTimeout(600);
  console.log(await info()); await shot('l1f'); await ok();
  console.log(await info()); await shot('l1g'); await ok();
  console.log('after l1', await info());
  // уровень 2
  await p.evaluate(() => window.__game.startLevel(2));
  await p.waitForTimeout(600);
  console.log(await info()); await shot('l2a');
  await (mob ? (await p.$('.sbtn[data-k="goose"]')).tap() : (await p.$('.sbtn[data-k="goose"]')).click());
  await p.waitForTimeout(300);
  await p.evaluate(() => { window.__game.farm.stock.egg = 3; });
  await p.waitForTimeout(800);
  console.log(await info()); await shot('l2b');
  const st = await proj(() => { const g = window.__game, s = g.lay.store; return g.view.project(s.x, 1, s.z); });
  await tap(st.x, st.y); await p.waitForTimeout(800);
  await p.waitForTimeout(600); console.log(await info()); await shot('l2c');
  await (mob ? (await p.$('.irow[data-l]')).tap() : (await p.$('.irow[data-l]')).click()); await p.waitForTimeout(1400);
  console.log(await info()); await shot('l2d');
  await (mob ? (await p.$('.modal .go')).tap() : (await p.$('.modal .go')).click()); await p.waitForTimeout(1400);
  console.log(await info()); await shot('l2e'); await ok();
  await p.waitForTimeout(3000); await shot('l2-truck');
  console.log('after l2', await info());
  // уровень 3
  await p.evaluate(() => window.__game.startLevel(3));
  await p.waitForTimeout(600);
  console.log(await info()); await shot('l3a');
  const sl = await proj(() => { const g = window.__game, s = g.farm.slots.find((x) => x.kind === 'powder'); return g.view.project(s.x, 0.8, s.z); });
  await tap(sl.x, sl.y); await p.waitForTimeout(500);
  const bb = await p.$('[data-b]'); if (bb) { await (mob ? bb.tap() : bb.click()); await p.waitForTimeout(600); }
  console.log(await info()); await shot('l3b'); await ok();
  await p.evaluate(() => { window.__game.farm.stock.egg = 4; });
  await p.waitForTimeout(600);
  console.log(await info()); await shot('l3c');
  await tap(sl.x, sl.y); await p.waitForTimeout(600);
  await p.waitForFunction(() => window.__game.tutor.step && window.__game.tutor.step.k === 'tu_l3d' && window.__game.tutor.cur.shown, null, { timeout: 90000 });
  await p.waitForTimeout(300);
  console.log(await info()); await shot('l3d');
  // медведь
  await p.evaluate(() => { const g = window.__game; g.startLevel(8); });
  await p.waitForFunction(() => window.__game.tutor.cur && window.__game.tutor.cur.name === 'bear' && window.__game.tutor.cur.shown, null, { timeout: 120000 });
  await p.waitForTimeout(1500);
  console.log(await info()); await shot('bear');
}});
done(errs);
