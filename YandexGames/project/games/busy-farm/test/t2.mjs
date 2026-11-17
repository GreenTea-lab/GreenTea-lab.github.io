import { run, done } from './shot.mjs';
const W = +process.argv[2] || 1280, H = +process.argv[3] || 720, mob = process.argv[4] === 'm';
const tag = process.argv[5] || 'd', lvl = +process.argv[6] || 14, sub = +process.argv[7] || 8;
const errs = await run({ w: W, h: H, mobile: mob, debug: { shots: 1, bot: 1, aps: 2.5, sub }, steps: async (p) => {
  await p.evaluate((n) => { window.__game.startLevel(n); }, lvl);
  const t0 = Date.now();
  let i = 0;
  while (Date.now() - t0 < (+process.env.MAXMS || 360000)) {
    await p.waitForTimeout(12000);
    const st = await p.evaluate(() => { const f = window.__game.farm; return { t: Math.round(f.t), coins: f.coins, fin: f.finished, an: f.animals.length, bears: f.bears.filter(b=>!b.gone).length, items: f.items.length, modal: !!document.querySelector('.modal.win') }; });
    console.log(JSON.stringify(st));
    await p.screenshot({ path: `shots/${tag}-g${lvl}-${i++}.png` });
    if (st.modal) break;
  }
}});
done(errs);
