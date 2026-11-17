// Скриншоты меню и игры: node test/look.mjs
import { run, done } from './shot.mjs';
const out = process.env.OUT || '/tmp/claude-0/x/shots/';
let all = [];
for (const [tag, w, h, mobile] of [['land', 1600, 900, false], ['port', 412, 892, true]]) {
  if (process.env.ONLY && process.env.ONLY !== tag) continue;
  all = all.concat(await run({ w, h, mobile, dpr: mobile ? 2 : 1, debug: { nodaily: 1, auto: 1, speed: 4 }, pre: 'try{localStorage.clear()}catch(e){}', steps: async (page) => {
    await page.waitForTimeout(5000); await page.screenshot({ path: out + tag + '_menu.png' });
    await page.evaluate(() => { window.__game.S.settings.fast = true; window.__game.newGame(); });
    for (let k = 0; k < 4; k++) {
      await page.waitForTimeout(6000);
      await page.screenshot({ path: out + tag + '_play' + k + '.png' });
    }
  } }));
}
done(all);
