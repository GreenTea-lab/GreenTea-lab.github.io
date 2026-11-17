import { initPhysics, Phys, solveLaunch, DT } from '../src/physics.js';
import { buildLevel } from '../src/levels.js';
await initPhysics();
const FROM = [0, 2.6, 1.0];
const lv = buildLevel(+process.argv[2] - 1);
for (const arc of ['low', 'high']) for (const ty of ['stone','iron']) {
  const P = new Phys(); P.load(lv); for (let k = 0; k < 150; k++) P.step(); P.damageOn = true;
  const en = [...P.objs.values()].find(o => o.kind === 'enemy'); const p = en.body.translation();
  const s = solveLaunch(FROM, [p.x, p.y, p.z], arc);
  const pr = P.addProjectile(ty, FROM, s.vel);
  let maxImp = {};
  for (let k = 0; k < 400; k++) { P.step(); for (const o of P.objs.values()) { const key = o.kind + ':' + (o.mat || o.type); maxImp[key] = Math.max(maxImp[key] || 0, o.impact); } }
  const ev = P.events.map(e => e.t === 'dmg' ? `dmg(${(e.o.mat||e.o.type)} ${e.d.toFixed(1)})` : e.t).join(' ');
  console.log(arc, ty, 'v', s.v.toFixed(1), 'mass', pr.mass.toFixed(2), 'left', P.enemiesLeft(), 'enHP', en.hp.toFixed(1), JSON.stringify(Object.fromEntries(Object.entries(maxImp).map(([k,v])=>[k,+v.toFixed(1)]))), ev);
}
