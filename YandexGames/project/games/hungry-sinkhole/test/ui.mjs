// UI на телефоне с моком SDK: меню, окна, покупка, раунд до конца, итоги, x2, реклама между раундами
import { run, done } from './shot.mjs';
const [, , name = 'ui', w = 390, h = 844, mob = '1'] = process.argv;
const O = `/tmp/claude-0/${name}_`;
const errs = await run({ w: +w, h: +h, mobile: mob === '1', dpr: 1,
  pre: () => { window.__MOCK_CATALOG = [{ id: 'coins_1000', title: '1 000 монет', price: 19 }, { id: 'coins_3500', title: '3 500 монет', price: 59 }, { id: 'coins_10000', title: '10 000 монет', price: 149 }, { id: 'disable_ads', title: 'Без рекламы', price: 99 }]; },
  debug: { seed: 3 }, steps: async (page) => {
  await page.waitForTimeout(1500);
  await page.screenshot({ path: O + 'menu.png' });
  for (const id of ['skins', 'ups', 'lb', 'coins', 'snd']) {
    await (mob === '1' ? page.tap('#' + id) : page.click('#' + id));
    await page.waitForTimeout(700);
    await page.screenshot({ path: O + id + '.png' });
    if (id === 'coins') {
      const c0 = await page.evaluate(() => window.__save.data.coins);
      await (mob === '1' ? page.locator('.iap-buy').nth(1).tap() : page.locator('.iap-buy').nth(1).click());
      await page.waitForTimeout(1200);
      const c1 = await page.evaluate(() => window.__save.data.coins);
      console.log('coins after buy', c0, '->', c1);
      await page.screenshot({ path: O + 'coins2.png' });
    }
    await page.evaluate(() => window.__game.ui.closeModal());
    await page.waitForTimeout(300);
  }
  await (mob === '1' ? page.tap('#play') : page.click('#play'));
  await page.waitForTimeout(1200);
  // палец: касание и протяжка вправо — дыра должна поехать вправо
  const me0 = await page.evaluate(() => ({ x: window.__game.me.x, z: window.__game.me.z }));
  const cx = +w / 2, cy = +h * 0.7;
  if (mob === '1') {
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', cx, cy);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', cx + i * 8, cy); await page.waitForTimeout(30); }
  await page.waitForTimeout(500);
  await page.screenshot({ path: O + 'touch.png' });
  const st = await page.evaluate(() => { const g = window.__game; return { stick: g.stick, x: g.me.x, z: g.me.z }; });
  await touch('touchEnd');
  console.log('touch: stick', JSON.stringify(st.stick), 'moved dx', (st.x - me0.x).toFixed(2), 'dz', (st.z - me0.z).toFixed(2));
  }
  await page.evaluate(() => window.__game.ff(125 * 60));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: O + 'result.png' });
  const c0 = await page.evaluate(() => window.__save.data.coins);
  const x2 = page.locator('#x2');
  if (await x2.count()) { await (mob === '1' ? x2.tap() : x2.click()); await page.waitForTimeout(1000); }
  const c1 = await page.evaluate(() => window.__save.data.coins);
  console.log('x2 coins', c0, '->', c1);
  await page.screenshot({ path: O + 'result2.png' });
  const again = page.locator('#again');
  if (await again.count()) { await (mob === '1' ? again.tap() : again.click()); await page.waitForTimeout(1200); }
  console.log('state', await page.evaluate(() => window.__game.state), 'calls', await page.evaluate(() => window.__calls.filter((c) => !c.startsWith('setData') && !c.startsWith('getData')).join(' | ')));
} });
done(errs);
