// Проверка: без покупки «Без рекламы» между днями показывается interstitial, не чаще раза в минуту
import { run, done } from './shot.mjs';
process.env.MOCK_SDK = '1';
const errs = await run({
  w: 1280, h: 720, debug: { bot: 1, quality: 'low' },
  steps: async (page) => {
    const calls = () => page.evaluate(() => window.__calls.slice());
    await page.evaluate(() => { window.__game.lastAd = 0; });
    let n0 = (await calls()).length;
    await page.evaluate(() => window.__game.nextDay());
    await page.waitForTimeout(1500);
    console.log('день', await page.evaluate(() => window.__save.data.day), 'вызовы:', (await calls()).slice(n0).join(' | '), '| экран:', await page.evaluate(() => window.__game.state));
    n0 = (await calls()).length;
    await page.evaluate(() => window.__game.nextDay());
    await page.waitForTimeout(1500);
    console.log('сразу ещё день', await page.evaluate(() => window.__save.data.day), 'вызовы:', (await calls()).slice(n0).join(' | '));
  },
});
done(errs);
