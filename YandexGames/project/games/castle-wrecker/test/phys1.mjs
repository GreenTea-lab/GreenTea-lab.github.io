import { initPhysics, Phys } from '../src/physics.js';
await initPhysics();
const P = new Phys();
const E = 0.002;
let y = 0;
const start = new Map();
for (let f = 0; f < 3; f++) {
  for (const [x, z] of [[-1, 29], [1, 29], [-1, 31], [1, 31]]) P.addBlock('stone', 'box', [0.5, 2, 0.5], [x, y + 1 + E, z]);
  y += 2 + E;
  P.addBlock('wood', 'box', [3, 0.3, 3], [0, y + 0.15 + E, 30]);
  y += 0.3 + E;
  P.addEnemy('goblin', [0, y + 0.45 + E, 30]);
}
P.addBlock('stone', 'roof', [3, 1.2, 3], [0, y + 0.6 + E, 30]);
for (const o of P.objs.values()) { const p = o.body.translation(); start.set(o.id, [p.x,p.y,p.z]); }
for (let i = 0; i < 300; i++) { P.step(); if (i % 60 == 59) console.log(i, P.activity().toFixed(3)); }
for (const o of P.objs.values()) { const p = o.body.translation(); const s = start.get(o.id); const v=o.body.linvel(); console.log(o.kind, o.mat||o.type, o.shape||'', 'moved', Math.hypot(p.x-s[0],p.y-s[1],p.z-s[2]).toFixed(3), 'sleep', o.body.isSleeping(), 'v', Math.hypot(v.x,v.y,v.z).toFixed(3)); }
