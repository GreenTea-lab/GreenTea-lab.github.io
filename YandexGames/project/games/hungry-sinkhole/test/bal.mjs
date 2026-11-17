// баланс: все дыры — боты, 120 с, все дыры в физической зоне игрока по очереди
import { Sim, initPhysics, DT } from '../src/sim.js';
import { genMap } from '../src/city.js';
import { botThink } from '../src/bots.js';
await initPhysics();
const id = process.argv[2] || 'town';
const solo = process.argv[3] === 'solo';
const map = genMap(id, 11);
const sim = new Sim(map, { maxBodies: +(process.env.MB || 320), iters: +(process.env.IT || 0) });
const holes = [];
const n = solo ? 1 : 11;
for (let i = 0; i < n; i++) holes.push(sim.addHole({ name: 'h' + i, x: (Math.random() - 0.5) * map.span * 0.8, z: (Math.random() - 0.5) * map.span * 0.8, bot: true, skill: i === 0 ? 0.9 : 0.4 + Math.random() * 0.5, aggro: i === 0 ? 0.8 : Math.random(), grow: solo ? +(process.env.G || 2.6) : 1 }));
sim.focus = holes[0];
let t0 = performance.now(), worst = 0;
for (let s = 0; s < 60 * 120; s++) {
  for (const h of holes) botThink(sim, h, DT);
  if (process.env.VIEW) { const r = holes[0].r; sim.viewR = (24 + Math.min(r, 8) * 6.2 + Math.max(0, r - 8) * 3.4) * 0.78 + 6; }
  const a = performance.now();
  sim.step();
  worst = Math.max(worst, performance.now() - a);
  sim.events.length = 0; sim.added.length = 0; if (sim.frozenNow) sim.frozenNow.length = 0;
  if (s % 120 === 119 && s < 3600 && process.env.V) console.log("h0", holes[0].x.toFixed(1), holes[0].z.toFixed(1), "t", holes[0].tx?.toFixed(1), holes[0].tz?.toFixed(1), "flee", holes[0].flee, "thr", holes[0].throttle.toFixed(2));
  if (s % 1800 === 1799) console.log(((s + 1) / 60) + 's', 'me r', holes[0].r.toFixed(2), 'pts', holes[0].pts, 'active', sim.active.size, 'prog', (sim.progress() * 100).toFixed(1) + '%', 'others', holes.slice(1).map((h) => h.r.toFixed(1)).join(','));
}
console.log('final', holes.map((h) => h.r.toFixed(1)).sort((a, b) => b - a).join(' '));
console.log('avg', ((performance.now() - t0) / 7200).toFixed(2), 'ms worst', worst.toFixed(1), 'items', map.items.length);
