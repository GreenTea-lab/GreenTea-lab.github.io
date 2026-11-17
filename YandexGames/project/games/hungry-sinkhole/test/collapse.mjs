// дома не должны рушиться сами: считаем сдвинутые куски домов, к которым не подходила дыра, способная их есть
import { Sim, initPhysics, DT } from '../src/sim.js';
import { genMap } from '../src/city.js';
import { botThink } from '../src/bots.js';
await initPhysics();
const id = process.argv[2] || 'town';
const map = genMap(id, 11);
const sim = new Sim(map, { maxBodies: +(process.env.MB || 150), physR: 42 });
const holes = [];
for (let i = 0; i < 11; i++) holes.push(sim.addHole({ name: 'h' + i, x: (Math.random() - 0.5) * map.span * 0.8, z: (Math.random() - 0.5) * map.span * 0.8, bot: true, skill: 0.4 + Math.random() * 0.5, aggro: Math.random() }));
sim.focus = holes[0];
const G = new Map();
for (const [g, items] of sim.groups) {
  let x = 0, z = 0; for (const it of items) { x += it.p.x; z += it.p.z; }
  G.set(g, { x: x / items.length, z: z / items.length, gfit: items[0].gfit, ok: false, near: false });
}
for (let s = 0; s < 60 * +(process.env.T || 90); s++) {
  for (const h of holes) botThink(sim, h, DT);
  const r = holes[0].r; sim.viewR = (24 + Math.min(r, 8) * 6.2 + Math.max(0, r - 8) * 3.4) * 0.78 + 6;
  sim.step();
  sim.events.length = 0; sim.added.length = 0; if (sim.frozenNow) sim.frozenNow.length = 0;
  if (s % 5 === 0) for (const g of G.values()) for (const h of holes) {
    if (!h.alive) continue;
    const d = Math.hypot(h.x - g.x, h.z - g.z);
    if (d < h.r + g.gfit + 4) { g.near = true; if (h.r * 1.9 > g.gfit) g.ok = true; }
  }
}
let self = 0, small = 0, gs = new Set(), gm = new Set();
for (const [gid, items] of sim.groups) {
  const g = G.get(gid);
  if (g.ok) continue;
  for (const it of items) {
    const moved = it.st === 2 || Math.hypot(it.p.x - it.hx, it.p.z - it.hz) > 0.8 || Math.abs(it.p.y - it.hy) > 0.6;
    if (!moved) continue;
    if (g.near) { small++; gm.add(gid); } else { self++; gs.add(gid); }
  }
}
console.log(id, 'groups', sim.groups.size, 'self-moved pieces', self, 'in', gs.size, 'groups; moved by too-small holes', small, 'in', gm.size, 'groups; final r', holes.map((h) => h.r.toFixed(1)).sort((a, b) => b - a).join(' '));
