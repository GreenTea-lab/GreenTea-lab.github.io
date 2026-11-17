import { run, done } from './shot.mjs';
const [w, h, mob] = [+(process.argv[2] || 1280), +(process.argv[3] || 720), process.argv[4] === 'm'];
const errs = await run({ w, h, mobile: mob, debug: { shots: 1 }, steps: async (page) => {
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `shots/menu${mob ? 'M' : ''}.png` });
  await page.evaluate(() => window.__game.startNight(1));
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__game.ui.closeModal(); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `shots/play1${mob ? 'M' : ''}.png` });
  const info = await page.evaluate(() => { const g = window.__game; return { items: g.items.map(i => i.kind + '@' + i.s.room.id), hides: g.world.hides.length, mon: [g.monster.pos.x, g.monster.pos.z, g.monster.state], calls: (window.__calls||[]).slice(0,5) }; });
  console.log(JSON.stringify(info));
}});
done(errs);
