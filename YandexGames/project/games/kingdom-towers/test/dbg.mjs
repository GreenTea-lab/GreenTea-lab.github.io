import { run, done } from './shot.mjs';
const errs = await run({ w: 960, h: 540, debug: { bot: true }, steps: async (page) => {
  await page.evaluate(() => { const sc = window.__game.scene; sc.stop('Menu'); sc.start('Game', { level: 5 }); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); g.lives = 1; g.waveIdx = 0; g.onDefeat(); });
  await page.waitForTimeout(500);
  console.log(await page.evaluate(() => JSON.stringify(window.__game.scene.scenes.map(s => [s.sys.settings.key, s.sys.settings.status]))));
  await page.evaluate(() => { const sc = window.__game.scene; sc.start('Game', { level: 6 }); });
  await page.waitForTimeout(1500);
  console.log(await page.evaluate(() => JSON.stringify(window.__game.scene.scenes.map(s => [s.sys.settings.key, s.sys.settings.status])) + ' lvl=' + window.__game.scene.getScene('Game').lvl + ' w=' + window.__game.scene.getScene('Game').waveIdx));
}});
done(errs);
