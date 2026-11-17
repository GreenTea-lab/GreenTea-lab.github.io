import { run, done } from './shot.mjs';
const errs = await run({ debug: { shots: 1 }, steps: async (page) => {
  for (const n of [1, 3, 5]) {
    const r = await page.evaluate((n) => {
      const g = window.__game;
      g.startNight(n);
      const w = g.world, m = g.monster, p = g.player;
      const out = { n, rooms: w.openRooms().length, hides: w.hides.length, items: g.items.map(i => i.kind[0] + ':' + i.s.room.id).join(','), doors: w.doorObjs.length };
      // доступность: путь от старта до каждой открытой комнаты
      let bad = [];
      for (const r of w.openRooms()) { const c = w.randomCellIn(r); const pth = w.path(21, 17, c[0], c[1]); if (!pth) bad.push(r.id); }
      out.unreach = bad.join(',');
      // предметы: путь до клетки рядом
      out.itemUnreach = g.items.filter(it => !w.path(21,17,Math.floor(it.s.x),Math.floor(it.s.z))).map(it=>it.s.room.id).join(',');
      // симуляция: игрок стоит в коридоре с фонарём, монстр должен поймать
      g.state = 'sim';
      p.pos.set(20.5, 0, 9); m.state = 'wander'; m.timer = 0;
      let caught = -1; const fake = Object.assign(Object.create(Object.getPrototypeOf(g)), g);
      fake.caught = () => { if (caught < 0) caught = t; }; fake.sound = () => {}; fake.onSpotted = () => {}; fake.onLost = () => {};
      let t = 0; const states = {};
      for (; t < 240 && caught < 0; t += 0.05) { m.update(0.05, p, fake); w.update(0.05, t); states[m.state] = (states[m.state]||0)+1; }
      out.caughtAt = caught.toFixed(1); out.states = JSON.stringify(states);
      // прятки: игрок в шкафу, монстр гоняется → не должен поймать без свидетеля
      const h = w.hides[0]; p.hidden = true; p.hideSpot = h; m.state = 'wander'; m.sawHideT = 9; caught = -1;
      for (t = 0; t < 60 && caught < 0; t += 0.05) m.update(0.05, p, fake);
      out.hiddenCaught = caught; p.hidden = false; p.hideSpot = null;
      // взять ключи и выйти
      g.state = 'play'; m.state = 'idle'; m.timer = 1e9;
      for (const it of g.items) if (it.kind === 'key') g._take(it);
      p.pos.set(21, 0, 19.3); p.yaw = Math.PI; p.pitch = 0;
      g.target = g._findTarget(); out.target = g.target && g.target.kind;
      g.act(); out.state = g.state;
      return out;
    }, n);
    console.log(JSON.stringify(r));
    await page.waitForTimeout(3500);
    console.log('after', await page.evaluate(() => [window.__game.state, window.__game.ui.screen, document.querySelector('.score b')?.textContent, JSON.stringify(window.__save.data.nights)]));
  }
}});
done(errs);
