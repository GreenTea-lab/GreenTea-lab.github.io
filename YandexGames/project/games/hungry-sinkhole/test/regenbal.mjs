// сравнение баланса: 11 ботов, 120 с, город с регенерацией и без
import { Sim, initPhysics, DT } from '../src/sim.js';
import { genMap } from '../src/city.js';
import { botThink } from '../src/bots.js';
await initPhysics();
for (const regen of [false, true]) for (let seed = 1; seed <= 4; seed++) {
  const map = genMap('town', seed);
  const sim = new Sim(map, { regen, pickups: 6, seed });
  const holes = [];
  for (let i = 0; i < 11; i++) holes.push(sim.addHole({ name: 'h' + i, x: (sim.rnd() - 0.5) * map.span * 0.8, z: (sim.rnd() - 0.5) * map.span * 0.8, bot: true, skill: 0.4 + sim.rnd() * 0.5, aggro: sim.rnd() }));
  sim.focus = holes[0];
  for (let s = 0; s < 7200; s++) { for (const h of holes) botThink(sim, h, DT); sim.step(); sim.events.length = 0; sim.added.length = 0; if (sim.frozenNow) sim.frozenNow.length = 0; }
  const pts = holes.map((h) => h.pts).sort((a, b) => b - a);
  console.log(regen ? 'regen' : 'off  ', seed, 'top', pts[0], 'median', pts[5], 'top r', Math.max(...holes.map((h) => h.r)).toFixed(1));
}
