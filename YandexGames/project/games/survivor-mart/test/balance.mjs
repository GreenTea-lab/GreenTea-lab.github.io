// Баланс: бот играет N дней подряд без отрисовки; простой «управляющий» нанимает и строит
import { run, done } from './shot.mjs';
const DAYS = +(process.argv[2] || 12);
const errs = await run({
  w: 640, h: 360, debug: { bot: 1, quality: 'low' },
  steps: async (page) => {
    await page.click('[data-a="play"]');
    await page.waitForTimeout(500);
    await page.click('[data-open]');
    await page.waitForTimeout(300);
    const res = await page.evaluate(async (DAYS) => {
      const g = window.__game, s = window.__save.data;
      const World = g.w.constructor, Bot = g.bot.constructor;
      g.state = 'sim';
      const out = [];
      const { BUILD, WEAPONS, TRAIN_COST, WAGE } = window.__DATA;
      const manage = () => {
        // нанять: сначала добытчика, потом кассира, грузчика, охранника
        const cap = 1 + s.build.beds;
        for (const role of ['scav', 'cashier', 'stocker', 'guard', 'scav']) {
          if (s.staff.length >= cap) break;
          if (s.staff.filter((x) => x.role === role).length >= (role === 'scav' ? 2 : 1)) continue;
          const c = s.cand.find((x) => x.role === role);
          if (c && s.bat > WAGE[c.lvl] * 3 + 60) { s.bat -= WAGE[c.lvl] * 3; s.staff.push(c); s.cand = s.cand.filter((x) => x !== c); }
        }
        // вылазки: самое дорогое открытое место
        const opens = Object.keys(s.locs).filter((k) => s.locs[k]);
        for (const st of s.staff) if (st.role === 'scav') st.loc = opens[opens.length - 1];
        // оружие, потом постройки
        const nextW = WEAPONS.find((W) => !s.weapons.includes(W.id));
        if (nextW && s.bat > nextW.cost + 40 && Object.entries(nextW.mats).every(([k, n]) => s.stock[k] >= n)) { s.bat -= nextW.cost; for (const [k, n] of Object.entries(nextW.mats)) s.stock[k] -= n; s.weapons.push(nextW.id); s.weapon = nextW.id; }
        const tryB = (id) => { const B = BUILD[id], l = s.build[id] || 0; if (l < B.max && s.bat >= B.cost[l] + 80 && (!B.mats || Object.entries(B.mats[l]).every(([k, n]) => s.stock[k] >= n))) { s.bat -= B.cost[l]; if (B.mats) for (const [k, n] of Object.entries(B.mats[l])) s.stock[k] -= n; s.build[id] = l + 1; return true; } };
        for (const id of ['walls', 'shelves', 'beds', 'sign', 'register', 'bench', 'walls', 'shelves', 'radio']) tryB(id);
        for (const sk of ['surv', 'serv', 'craft', 'mgmt']) while (s.sp > 0 && s.skills[sk] < 4 && Math.random() < 0.6) { s.skills[sk]++; s.sp--; }
        // игрок крафтит доски из железок и капканы
        while (s.stock.wood < 14 && s.stock.scrap >= 3) { s.stock.scrap -= 3; s.stock.wood += 2; }
        // починить баррикады досками (как кнопка на планшете)
        for (const e of window.__DATA.ENTRIES) {
          const max = (e.door ? 150 + 60 * s.build.walls : 100 + 50 * s.build.walls) * (s.skills.craft >= 3 ? 1.3 : 1);
          let hp = s.barr[e.id] < 0 || s.barr[e.id] === undefined ? max : Math.min(max, s.barr[e.id]);
          while (hp < max && s.stock.wood > 0) { hp = Math.min(max, hp + 25); s.stock.wood--; }
          s.barr[e.id] = hp >= max ? -1 : Math.round(hp);
        }
        // разведать место
        const L = window.__DATA.LOCS.find((L) => !s.locs[L.id]);
        if (L && s.bat > L.cost + 200 && s.staff.some((x) => x.role === 'scav')) { s.bat -= L.cost; s.locs[L.id] = 1; }
      };
      for (let d = 0; d < DAYS; d++) {
        if (d > 0) { s.day++; s.stats.days++; s.cur = null; g.prepDay(); }
        manage();
        const bat0 = s.bat;
        g.w = new World({ phase: 'day', hour: 8 });
        const w = g.w, bot = new Bot(w, { fastTest: false });
        s.tut.skip = 1;
        let steps = 0, ko = 0, minHp = 999; const ph = {};
        while (!w.finished && steps < 40000) {
          w.step(1 / 30, bot.input(1 / 30));
          if (w.P.ko && !ko) { ko = 1; w.surrender(); }
          if (w.phase === 'night') minHp = Math.min(minHp, w.P.hp);
          w.fx.length = 0;
          ph[w.phase] = (ph[w.phase] || 0) + 1;
          steps++;
          if (steps % 3000 === 0) await new Promise((r) => setTimeout(r, 0));
        }
        const S = w.sum;
        out.push(`d${s.day} ${w.horde ? 'H' : ' '} sales=${S.sales} served=${S.served} items=${S.items} caught=${S.caught} scam=${S.scammed} kills=${S.kills} lost=${S.lostBat || 0} stolen=${S.stolen} nloot=${S.nightLoot} slept=${S.slept} ko=${ko} minHp=${Math.round(minHp)} bat=${bat0}->${s.bat} rep=${Math.round(s.rep)} lvl=${s.lvl} staff=${s.staff.map((x) => x.role[0] + (x.hurt ? '!' : '')).join('')} b=${JSON.stringify(s.build)} wp=${s.weapon} bars=${w.barr.map((b) => Math.round(b.hp)).join('/')} stock=${['can','water','wood','scrap','trap'].map((k)=>k+s.stock[k]).join(',')} steps=${steps} ph=${JSON.stringify(ph)}${steps >= 40000 ? ' STUCK ' + JSON.stringify({ custs: w.custs.map((c) => c.state + '@' + c.x.toFixed(1) + ',' + c.z.toFixed(1)), staff: w.staff.map((o) => o.s.role + ':' + o.state + '@' + o.x.toFixed(1) + ',' + o.z.toFixed(1)), P: [w.P.x.toFixed(1), w.P.z.toFixed(1)], zs: w.zs.filter((z) => !z.dead).map((z) => z.type + '@' + z.x.toFixed(1) + ',' + z.z.toFixed(1)) }) : ''}`);
      }
      return out;
    }, DAYS);
    console.log(res.join('\n'));
  },
});
done(errs);
