// обход карт: меню-фон, начало раунда и вид сверху (дыра побольше) на каждой карте
import { run, done } from './shot.mjs';
const maps = (process.argv[2] || 'beach,winter,fair,japan').split(',');
const [w, h] = [+(process.argv[3] || 1280), +(process.argv[4] || 720)];
const out = '/tmp/claude-0/maps';
const errs = await run({ w, h, mobile: w < h, steps: async (page) => {
  await page.evaluate(() => { const d = window.__save.data; d.level = 20; d.tutDone = true; d.rounds = 0; });
  for (const id of maps) {
    await page.evaluate((id) => { window.__save.data.map = id; window.__game.menu(); }, id);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${out}/${id}_menu.png` });
    await page.evaluate(() => window.__game.play());
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${out}/${id}_play.png` });
    await page.evaluate(() => { const g = window.__game; g.me.r = 7; });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${out}/${id}_top.png` });
    const info = await page.evaluate(() => { const g = window.__game; return { map: g.map.id, items: g.sim.items.length, active: g.sim.active.size }; });
    console.log(JSON.stringify(info));
    await page.evaluate(() => window.__game.menu());
    await page.waitForTimeout(500);
  }
} });
done(errs);
