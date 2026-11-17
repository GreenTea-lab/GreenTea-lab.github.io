import { Sim, initPhysics, DT } from '../src/sim.js';
import { genMap } from '../src/city.js';
await initPhysics();
const id = process.argv[2] || 'town';
const map = genMap(id, 1);
console.log('items', map.items.length);
const sim = new Sim(map, {});
const h = sim.addHole({ name: 'me', x: 0, z: -40 });
sim.focus = h;
const bots = [];
for (let i = 0; i < 9; i++) bots.push(sim.addHole({ name: 'b' + i, x: (i - 4) * 18, z: 50, bot: true }));
let t0 = Date.now(), maxStep = 0, ang = 0;
for (let s = 0; s < 60 * 120; s++) {
  // спиральный обход
  ang += DT * 0.35;
  h.dirX = Math.cos(ang); h.dirZ = Math.sin(ang); h.throttle = 1;
  for (const b of bots) { b.dirX = Math.cos(ang * 1.3 + b.id); b.dirZ = Math.sin(ang * 0.7 + b.id); b.throttle = 1; }
  const a = performance.now();
  sim.step();
  const dt = performance.now() - a;
  maxStep = Math.max(maxStep, dt);
  sim.events.length = 0; sim.added.length = 0;
  if (s % 600 === 0) console.log((s / 60).toFixed(0) + 's', 'r', h.r.toFixed(2), 'pts', h.pts, 'active', sim.active.size, 'eaten', h.eaten, 'prog', (sim.progress() * 100).toFixed(1) + '%', 'bots r', bots.map((b) => b.r.toFixed(1)).join(','));
}
console.log('avg ms/step', ((Date.now() - t0) / 7200).toFixed(2), 'max', maxStep.toFixed(1));
