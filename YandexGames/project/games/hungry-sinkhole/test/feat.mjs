// новые функции: режимы, обучение, бонусы, регенерация, задания, подарок
import { run, done } from './shot.mjs';
const [, , name = 'feat', w = 1280, h = 720, mob = '0'] = process.argv;
const O = `/tmp/claude-0/${name}_`;
const errs = await run({ w: +w, h: +h, mobile: mob === '1', debug: { seed: 3 }, steps: async (page) => {
  await page.waitForTimeout(1500);
  await page.screenshot({ path: O + 'menu.png' });
  // первый раунд: обучение
  await page.evaluate(() => window.__game.play());
  await page.waitForTimeout(800);
  await page.screenshot({ path: O + 'tut0.png' });
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => { const g = window.__game; g.keys.add('KeyD'); g.ff(240); });
  }
  await page.evaluate(() => window.__game.keys.clear());
  await page.waitForTimeout(600);
  const tut = await page.evaluate(() => ({ tut: window.__game.tut, picks: window.__game.sim.pickups.length, eff: window.__game.me.eff }));
  console.log('tutorial', JSON.stringify(tut));
  await page.screenshot({ path: O + 'tut1.png' });
  // бонус под дыру
  await page.evaluate(() => { const g = window.__game; const p = g.sim.pickups[0]; if (p) { p.x = g.me.x; p.z = g.me.z; } g.ff(2); });
  await page.waitForTimeout(700);
  console.log('after pick eff', await page.evaluate(() => JSON.stringify(window.__game.me.eff)));
  await page.screenshot({ path: O + 'pick.png' });
  await page.evaluate(() => window.__game.ff(130 * 60));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: O + 'result.png' });
  console.log('regen queue', await page.evaluate(() => window.__game.sim.regenQ.length), 'tutDone', await page.evaluate(() => window.__save.data.tutDone));
  console.log('daily', await page.evaluate(() => JSON.stringify(window.__save.data.daily)));
  await page.evaluate(() => window.__game.menu());
  await page.waitForTimeout(1500);
  await page.screenshot({ path: O + 'gift.png' });
  await page.evaluate(() => window.__game.ui.closeModal());
  await page.click('#quests');
  await page.waitForTimeout(600);
  await page.screenshot({ path: O + 'quests.png' });
  await page.evaluate(() => window.__game.ui.closeModal());
  // выживание
  await page.evaluate(() => { window.__save.data.mode = 'royale'; window.__game.play(); });
  await page.waitForTimeout(800);
  await page.evaluate(() => { const g = window.__game; const b = g.sim.holes.find((x) => x.bot); b.mass = 400; b.x = g.me.x; b.z = g.me.z; b.r = 6; g.ff(3); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: O + 'royale_out.png' });
  console.log('royale out', await page.evaluate(() => window.__game.stats.out));
  await page.evaluate(() => window.__game.finishOut());
  await page.waitForTimeout(800);
  await page.screenshot({ path: O + 'royale_res.png' });
  // спокойный
  await page.evaluate(() => { window.__save.data.mode = 'zen'; window.__game.play(); });
  await page.evaluate(() => window.__game.ff(40 * 60));
  await page.waitForTimeout(800);
  await page.screenshot({ path: O + 'zen.png' });
  await page.evaluate(() => window.__game.finishZen());
  await page.waitForTimeout(800);
  await page.screenshot({ path: O + 'zen_res.png' });
} });
done(errs);
