import { initPhysics, Phys } from '../src/physics.js';
import { LEVELS, buildLevel } from '../src/levels.js';
await initPhysics();
const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
for (let i = 0; i < LEVELS.length; i++) {
  if (only && !only.includes(i + 1)) continue;
  const lv = buildLevel(i);
  const P = new Phys(); P.load(lv);
  const start = new Map();
  for (const o of P.objs.values()) { const p = o.body.translation(); start.set(o.id, [p.x, p.y, p.z]); }
  const t0 = performance.now();
  for (let k = 0; k < 150; k++) P.step();
  P.damageOn = true;
  for (let k = 0; k < 150; k++) P.step();
  const ms = (performance.now() - t0) / 300;
  let maxMove = 0, who = '';
  for (const o of P.objs.values()) { const p = o.body.translation(); const s = start.get(o.id); const m = Math.hypot(p.x - s[0], p.y - s[1], p.z - s[2]); if (m > maxMove) { maxMove = m; who = (o.mat || o.type) + '@' + s.map(v => v.toFixed(1)).join(','); } }
  const awake = [...P.objs.values()].filter(o => !o.body.isSleeping()).length;
  const ev = P.events.filter(e => e.t === 'kill' || e.t === 'break').length;
  const bad = maxMove > 0.08 || awake > 0 || ev > 0 || P.enemiesLeft() !== lv.enemies.length;
  console.log(`${bad ? 'BAD ' : 'ok  '} L${i + 1} bodies ${lv.blocks.length}+${lv.enemies.length} move ${maxMove.toFixed(3)} ${who} awake ${awake} breaks ${ev} ms ${ms.toFixed(2)}`);
}
