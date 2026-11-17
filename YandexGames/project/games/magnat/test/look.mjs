import { run, done } from './shot.mjs';
const [w, h, mobile] = [+(process.argv[2] || 1280), +(process.argv[3] || 720), process.argv[4] === 'm'];
const tag = process.argv[5] || 'd';
const errs = await run({ w, h, mobile, dpr: 1, debug: {}, steps: async (page) => {
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelectorAll('.modal').forEach((m) => m.close && m.close()));
  await page.screenshot({ path: `shots/${tag}_home.png` });
  await page.evaluate(() => window.__game.newGame({ n: 4, diff: 1, limit: 1 }));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `shots/${tag}_match.png` });
} });
done(errs);
