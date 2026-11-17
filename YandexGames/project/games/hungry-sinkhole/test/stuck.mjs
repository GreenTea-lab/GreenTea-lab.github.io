import { Sim, initPhysics, DT } from '../src/sim.js';
import { genMap } from '../src/city.js';
import { botThink } from '../src/bots.js';
await initPhysics();
const map = genMap('castle', 11);
const sim = new Sim(map, {});
const h = sim.addHole({ name: 'me', x: -47.6, z: -51.8, bot: true, skill: 0.9, aggro: 0 });
sim.focus = h;
for (let s = 0; s < 600; s++) { botThink(sim, h, DT); sim.step(); sim.events.length = 0; }
console.log('hole', h.x.toFixed(1), h.z.toFixed(1), h.r, 'pts', h.pts);
sim.query(h.x, h.z, h.r + 3, (it) => { if (it.st === 2) return; const d = Math.hypot(it.p.x - h.x, it.p.z - h.z); if (d > h.r + 2) return; console.log(it.look, it.kind, 'st', it.st, 'drop', it.dropping, 'y', it.p.y.toFixed(2), 'd', d.toFixed(2), 'fit', it.fit.toFixed(2), 'foot', it.footR.toFixed(2), 'sleep', it.body ? it.body.isSleeping() : '-'); });
