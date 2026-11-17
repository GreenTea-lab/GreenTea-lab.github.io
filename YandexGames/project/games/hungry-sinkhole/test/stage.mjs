import { Sim, initPhysics } from '../src/sim.js';
import { genMap } from '../src/city.js';
await initPhysics();
const map = genMap('town', 7);
const sim = new Sim(map, { maxBodies: 320 });
const me = sim.addHole({ name: 'me', x: 0, z: 0, mass: 0 });
sim.focus = me;
let best = null;
for (const [grp, items] of sim.groups) {
  if (items.length < 18) continue;
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const it of items) { x0 = Math.min(x0, it.p.x); x1 = Math.max(x1, it.p.x); z0 = Math.min(z0, it.p.z); z1 = Math.max(z1, it.p.z); }
  const w = x1 - x0; if (w < 8 || w > 16) continue;
  const cx = (x0 + x1) / 2, d = Math.hypot(cx, z1);
  if (!best || d < best.d) best = { d, cx, z1, grp, items };
}
me.mass = 260; me.x = best.cx - 1.5; me.z = best.z1 - 0.8; me.throttle = 0;
for (let s = 0; s < 150; s++) { sim.step(); sim.events.length = 0; sim.added.length = 0; if (sim.frozenNow) sim.frozenNow.length = 0;
  if (s % 30 === 29) { const st = best.items.map(it => it.st + (it.dropping ? 'D' : '')).join(''); console.log(s, 'r', me.r.toFixed(2), 'x', me.x.toFixed(1), me.z.toFixed(1), st); } }
for (const it of best.items) { const d = Math.hypot(it.p.x - me.x, it.p.z - me.z); if (d < me.r) console.log(it.kind, it.size.map(v=>v.toFixed(1)).join('x'), 'y', it.p.y.toFixed(2), 'd', d.toFixed(2), 'fit', it.fit.toFixed(1), 'st', it.st, it.dropping); }
