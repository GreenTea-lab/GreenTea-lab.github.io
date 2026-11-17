// Поток: меню → партия → игрок играет ботом до конца → итоги. node test/flow.mjs <w> <h> <mobile> <tag>
import { run, done } from './shot.mjs';
const [w, h, mob, tag] = [+process.argv[2] || 1280, +process.argv[3] || 720, process.argv[4] === '1', process.argv[5] || 'd'];
const cfg = JSON.parse(process.argv[6] || '{}');
const errors = await run({
  w, h, mobile: mob, debug: {}, locale: process.env.LOC || 'ru-RU',
  steps: async (p) => {
    await p.screenshot({ path: `/tmp/f_${tag}_menu.png` });
    await p.evaluate((c) => { if (c.hintsOff) window.__save.data.settings.hints = false; window.__game.newGame(c); }, cfg);
    await p.waitForTimeout(4500);
    await p.screenshot({ path: `/tmp/f_${tag}_deal.png` });
    // игрок ходит как бот-любитель
    let shots = 0;
    for (let i = 0; i < 3000; i++) {
      const st = await p.evaluate(() => {
        const A = window.__game, g = A.game;
        if (!g) return 'nogame';
        if (g.over) return 'over';
        if (A.busy()) return 'busy';
        if (A.humanMust()) {
          const a = window.__bot.botAction(g, 0, 1) || (g.defender === 0 ? { t: 'take' } : { t: 'pass' });
          A.humanAct(a);
          return 'acted ' + a.t;
        }
        return 'wait';
      });
      if (st === 'over' || st === 'nogame') break;
      if (i === 6 || i === 25) await p.screenshot({ path: `/tmp/f_${tag}_mid${shots++}.png` });
      await p.waitForTimeout(st.startsWith('acted') ? 500 : 300);
    }
    await p.waitForTimeout(3500);
    await p.screenshot({ path: `/tmp/f_${tag}_end.png` });
    console.log(await p.evaluate(() => JSON.stringify({ over: window.__game.game && window.__game.game.over, durak: window.__game.game && window.__game.game.durak, coins: window.__save.data.coins, stats: window.__save.data.stats })));
  },
});
done(errors);
