// большая дыра под новыми сооружениями: всё ли проваливается и нет ли NaN
import { Sim, initPhysics, DT } from '../src/sim.js';
import { genMap } from '../src/city.js';
await initPhysics();
for (const [id, x, z] of [['fair', -17, -16], ['fair', 17, -17], ['fair', -17, 17], ['fair', 17, 17], ['japan', -16, -16], ['japan', 16, -16], ['winter', -16, -16], ['beach', -16, -16]]) {
  const map = genMap(id, 5);
  const sim = new Sim(map, { regen: true, pickups: 0 });
  const h = sim.addHole({ name: 'me', x, z, mass: 400 });
  sim.focus = h;
  const b = map.blocks.find((q) => Math.abs(q.cx - x) < 3 && Math.abs(q.cz - z) < 3);
  const inBlock = (it) => Math.abs(it.hx ?? it.p.x - b.cx) < 20;
  const near = () => sim.items.filter((it) => it.st !== 2 && Math.abs(it.p.x - b.cx) < b.iw + 1 && Math.abs(it.p.z - b.cz) < b.iw + 1).length;
  const n0 = near();
  let bad = 0, eat = 0;
  for (let s = 0; s < 60 * 25; s++) {
    // дыра ездит кругами по кварталу
    const a = s / 120;
    h.dirX = Math.cos(a); h.dirZ = Math.sin(a); h.throttle = 0.5;
    sim.step();
    for (const e of sim.events) if (e.t === 'eat') eat++;
    sim.events.length = 0; sim.added.length = 0; if (sim.frozenNow) sim.frozenNow.length = 0;
  }
  for (const it of sim.items) if (it.st !== 2 && !(Number.isFinite(it.p.x) && Number.isFinite(it.p.y))) bad++;
  console.log(id, x, z, 'block items', n0, '->', near(), 'eaten', eat, 'r', h.r.toFixed(1), 'NaN', bad);
}
