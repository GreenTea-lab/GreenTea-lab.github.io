// Скриншоты состояний: выбор героя, ход игрока, клавиатура, слово, окна меню, суперигра
import { run, done } from './shot.mjs';
const out = process.env.OUT || '/tmp/claude-0/x/shots/';
const tags = process.argv.slice(2);
let all = [];
for (const [tag, w, h, mobile] of [['land', 1600, 900, false], ['port', 412, 892, true]]) {
  if (tags.length && !tags.includes(tag)) continue;
  all = all.concat(await run({ w, h, mobile, dpr: mobile ? 2 : 1, debug: { nodaily: 1, first: 'me', speed: 8 }, pre: 'try{localStorage.clear()}catch(e){}', steps: async (page) => {
    const shot = (n) => page.screenshot({ path: out + tag + '_' + n + '.png' });
    const waitPend = () => page.waitForFunction(() => !!window.__game.pend, null, { timeout: 180000 });
    await page.evaluate(() => { const g = window.__game; g.S.coins = 2600; g.addCoins(0); g.newGame(); });
    await page.waitForSelector('.hero', { timeout: 120000 });
    await page.waitForTimeout(1500);
    await shot('pick');
    await page.evaluate(() => document.querySelectorAll('.hero')[1].click());
    await waitPend();
    await page.waitForTimeout(2500);
    await shot('turn');
    await page.evaluate(() => { window.__game.debug.rig = 'P'; window.__game.answer({ act: 'spin', w: 900 }); });
    await page.waitForSelector('#pplay', { timeout: 60000 });
    await shot('prize');
    await page.evaluate(() => document.querySelector('#pplay').click());
    await waitPend();
    await page.waitForTimeout(1500);
    await shot('kbd');
    await page.evaluate(() => { const ks = document.querySelectorAll('#kbd .k'); ks[15].click(); });
    await page.waitForTimeout(1200);
    await shot('letter');
    await page.waitForTimeout(4000);
    await shot('letter2');
    await page.evaluate(() => window.__game.toMenu());
    await page.waitForTimeout(3000);
    await shot('menu_cont');
    for (const [n, f] of [['shop', 'openShop'], ['rules', 'openRules']]) {
      await page.evaluate((f) => window.__game[f](), f);
      await page.waitForTimeout(400);
      await shot(n);
    }
    // итоги тройки
    await page.evaluate(() => { const g = window.__game; g.ui.closeModal(); g.S.run.fin = [{ id: 'zorg', mine: true }]; g.S.run.stage = 1; g.resultModal({ title: 'Зорг в полуфинале!', text: 'Слово: «САМОВАР». Ваш герой проходит в полуфинал.', coins: 60, score: 1200, next: 'Следующая тройка', menu: true, fin: true }); });
    await page.waitForTimeout(600);
    await shot('result');
    // суперигра
    await page.evaluate(() => { const g = window.__game; g.ui.closeModal(); g.abortFlow(); g.state = 'play'; g.ui.showPlay(); g.S.run = { stage: 4, superId: 'zorg', fin: [], bank: 4200, cast: [] }; g.superGame(); });
    await page.waitForSelector('#modal .card', { timeout: 60000 });
    await shot('superpick');
    await page.evaluate(() => document.querySelector('#modal .card').click());
    await page.waitForSelector('#sok', { timeout: 60000 });
    await page.evaluate(() => { const ks = document.querySelectorAll('#kbd .k'); ks[0].click(); ks[14].click(); ks[17].click(); });
    await shot('superletters');
    await page.evaluate(() => document.querySelector('#sok').click());
    await page.waitForSelector('#wtimer', { timeout: 60000 });
    await page.waitForTimeout(1500);
    await shot('supertimer');
  } }));
}
done(all);
