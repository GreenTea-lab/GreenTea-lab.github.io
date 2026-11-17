import { initPhysics, Phys, solveLaunch, DT } from '../src/physics.js';
import { buildLevel } from '../src/levels.js';
await initPhysics();
const FROM = [0, 2.6, 1.0];
const lv = buildLevel(0);
let P = new Phys(); P.load(lv); for (let k = 0; k < 150; k++) P.step();
const S = P.snapshot();
for (let rep = 0; rep < 3; rep++) {
  const Q = Phys.restore(S);
  Q.damageOn = true;
  const en = [...Q.objs.values()].find(o => o.kind === 'enemy'); const p = en.body.translation();
  const s = solveLaunch(FROM, [p.x, p.y, p.z], 'low');
  Q.addProjectile('stone', FROM, s.vel);
  for (let k = 0; k < 300; k++) Q.step();
  console.log('rep', rep, 'left', Q.enemiesLeft(), Q.events.map(e => e.t).join(' '));
  Q.free();
}
