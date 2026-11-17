import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/fc31419c-4951-5c39-8720-5e89ab1869b0/scratchpad/';
const errs = await run({ debug: {}, steps: async (page) => {
  const G = (f) => page.evaluate(f);
  await G(() => { const m = window.__game.scene.getScene('Menu'); m.panel = 'lb'; m.layout(); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: out + 'sdk_lb.png' });
  await G(() => { const m = window.__game.scene.getScene('Menu'); m.panel = null; m.layout(); m.scene.start('Game'); });
  await page.waitForTimeout(1000);
  await G(() => { const g = window.__game.scene.getScene('Game'); g.kills = 300; g.t = 200; g.die(); });
  await page.waitForTimeout(1500);
  await page.mouse.click(640, 720 * 0.56); // воскреснуть за рекламу
  await page.waitForTimeout(1500);
  console.log('revived', await G(() => !window.__game.scene.getScene('Game').dead));
  await G(() => window.__game.scene.getScene('Game').die());
  await page.waitForTimeout(800);
  const btns = await G(() => window.__game.scene.getScene('Hud').ovL.items.filter(o => o.label && o.label.text).map(o => [o.label.text, o.c.y]));
  await page.mouse.click(640, btns.find(b => b[0].includes('x2'))[1]);
  await page.waitForTimeout(1200);
  const btns2 = await G(() => window.__game.scene.getScene('Hud').ovL.items.filter(o => o.label && o.label.text).map(o => [o.label.text, o.c.y]));
  console.log(JSON.stringify(btns2.map(b=>b[0])));
  await page.mouse.click(640, btns2.find(b => b[0] === 'MENU' || b[0] === 'В МЕНЮ')[1]);
  await page.waitForTimeout(1500);
  console.log('lang', await G(() => document.documentElement.lang), 'menu', await G(() => window.__game.scene.isActive('Menu')));
  console.log(await G(() => window.__calls.join('\n')));
}});
done(errs);
