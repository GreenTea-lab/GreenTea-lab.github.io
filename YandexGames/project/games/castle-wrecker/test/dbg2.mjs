import { initPhysics, Phys, solveLaunch } from '../src/physics.js';
import { buildLevel } from '../src/levels.js';
await initPhysics();
const FROM = [0, 2.6, 1.0];
const lv = buildLevel(0);
const P = new Phys(); P.load(lv); for (let k = 0; k < 150; k++) P.step();
const S = P.snapshot();
for (const useRestore of [false, true]) {
  const Q = useRestore ? Phys.restore(S) : P;
  Q.damageOn = true;
  const en = [...Q.objs.values()].find(o => o.kind === 'enemy'); const p = en.body.translation();
  const s = solveLaunch(FROM, [p.x, p.y, p.z], 'low');
  Q.addProjectile('stone', FROM, s.vel);
  for (let k = 0; k < 300; k++) Q.step();
  console.log('restore', useRestore, 'left', Q.enemiesLeft(), Q.events.map(e => e.t).join(' '), 'pos', JSON.stringify(p));
}
