import { run, done } from './shot.mjs';
const errs = await run({ w: 390, h: 844, mobile: true, debug: { seed: 5, auto: true, quality: 'mid' }, steps: async (page) => {
  const names = () => page.evaluate(() => window.__game.view.renderer.info.programs.map((p) => p.name + '|' + p.cacheKey.slice(0, 40)).join('\n'));
  console.log('MENU\n' + await names());
  await page.evaluate(() => { window.__game.play(); });
  await page.waitForTimeout(3000);
  console.log('PLAY\n' + await names());
  await page.evaluate(() => window.__game.ff(60 * 40));
  await page.waitForTimeout(3000);
  console.log('LATER\n' + await names());
} });
done(errs);
