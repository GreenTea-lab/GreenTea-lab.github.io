import { initPhysics, Phys, solveLaunch } from '../src/physics.js';
await initPhysics();
const P = new Phys();
const E = 0.002;
// башня: 3 этажа, 4 колонны + плита, гоблин на каждом этаже
let y = 0;
for (let f = 0; f < 3; f++) {
  for (const [x, z] of [[-1, 29], [1, 29], [-1, 31], [1, 31]]) P.addBlock('stone', 'box', [0.5, 2, 0.5], [x, y + 1 + E, z]);
  y += 2 + E;
  P.addBlock('wood', 'box', [3, 0.3, 3], [0, y + 0.15 + E, 30]);
  y += 0.3 + E;
  P.addEnemy('goblin', [0, y + 0.45 + E, 30]);
}
P.addBlock('stone', 'roof', [3, 1.2, 3], [0, y + 0.6 + E, 30]);
let t0 = performance.now();
for (let i = 0; i < 180; i++) P.step();
const sleeping = [...P.objs.values()].filter(o => o.body.isSleeping()).length;
console.log('settle: objs', P.objs.size, 'sleeping', sleeping, 'activity', P.activity().toFixed(3), 'ms/step', ((performance.now()-t0)/180).toFixed(2));
P.damageOn = true;
const from = [0, 2.2, 0.5];
for (const [type, arc, target] of [['stone','low',[0,1,29]], ['iron','low',[0,3,29]], ['bomb','high',[0,4,30]]]) {
  const s = solveLaunch(from, target, arc);
  P.addProjectile(type, from, s.vel);
  let n = 0; while (n++ < 360) P.step();
  const ev = P.events.reduce((m, e) => (m[e.t] = (m[e.t] || 0) + 1, m), {});
  P.events = [];
  console.log(type, arc, 'v', s.v.toFixed(1), 'T', s.T.toFixed(2), 'events', JSON.stringify(ev), 'enemies', P.enemiesLeft(), 'objs', P.objs.size, 'score', P.score);
}
