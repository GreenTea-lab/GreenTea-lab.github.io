import { initPhysics, Phys, solveLaunch, DT, FROM } from '../src/physics.js';
import { buildLevel } from '../src/levels.js';
await initPhysics();
const lv = buildLevel(13);
for (const f of [0.25, 0.4, 0.55, 0.7]) for (const arc of ['low', 'high']) {
  const P = new Phys(); P.load(lv); for (let k = 0; k < 150; k++) P.step(); P.damageOn = true;
  const en = [...P.objs.values()].filter(o => o.kind === 'enemy');
  const p = en[2].body.translation();
  const s = solveLaunch(FROM, [p.x, p.y, p.z], arc);
  const pr = P.addProjectile('split', FROM, s.vel);
  let t = 0, split = false;
  for (let k = 0; k < 500; k++) { if (!split && t > s.T * f) { P.splitProj(pr); split = true; } P.step(); t += DT; }
  console.log('f', f, arc, 'killed', 6 - P.enemiesLeft(), 'score', P.score);
}
