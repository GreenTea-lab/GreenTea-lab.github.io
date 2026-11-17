import { run, done } from './shot.mjs';
// 1) заезд автопилотом с записью сессии, 2) второй заезд — должен появиться призрак «Ты (ранее)»
const errs = await run({
  w: 1280, h: 720, debug: { bot: 1, sub: 12, pushBot: 1, quality: 'low' },
  steps: async (page) => {
    await page.evaluate(() => { window.__save.data.daily.day = new Date().toISOString().slice(0,10); window.__game.ui.menu(); });
    await page.click('[data-a=garage]');
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'test/s_garage.png' });
    await page.evaluate(() => window.__game.startRace(0));
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(2000);
      const fin = await page.evaluate(() => window.__game.race && window.__game.race.finished);
      if (fin) break;
    }
    const ls = await page.evaluate(() => { const a = JSON.parse(localStorage.getItem('cloud_racers_local_ghosts') || '[]'); return a.map(x => ({ meta: x.meta, n: x.timeline.length, size: JSON.stringify(x).length })); });
    console.log('stored', JSON.stringify(ls));
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.__game.startRace(0));
    await page.waitForTimeout(2500);
    const opp = await page.evaluate(() => window.__game.race.opps.map(o => o.kind + ':' + o.name + ':' + (o.src.time ? o.src.time.toFixed(2) : '')));
    console.log('opps', JSON.stringify(opp));
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(2000);
      const st = await page.evaluate(() => { const r = window.__game.race; const g = r.opps.find(o => o.kind === 'ghost'); return { t: r.t.toFixed(1), ps: r.player.sTotal.toFixed(1), gs: g ? g.s.toFixed(1) : null, gd: g ? g.d.toFixed(1): null, pd: r.player.d.toFixed(1), fin: r.finished }; });
      if (i % 5 === 0) console.log(JSON.stringify(st));
      if (st.fin) break;
    }
    await page.waitForTimeout(3000);
    const res = await page.evaluate(() => window.__game.lastResult.rows.map(r => r.name + ' ' + r.time.toFixed(2)));
    console.log('results', JSON.stringify(res));
  },
});
done(errs);
