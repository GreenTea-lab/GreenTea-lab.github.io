// пики шага физики: что их вызывает (активация домов, разломы, взрывы)
let __s = +(process.env.SEED || 1); Math.random = () => { __s = (__s * 16807) % 2147483647; return __s / 2147483647; };
import { Sim, initPhysics, DT } from '../src/sim.js';
import { genMap } from '../src/city.js';
import { botThink } from '../src/bots.js';
await initPhysics();
const id = process.argv[2] || 'town';
const map = genMap(id, 11);
const sim = new Sim(map, { maxBodies: +(process.env.MB || 230), physR: 42, iters: +(process.env.IT || 0) });
const holes = [];
for (let i = 0; i < 11; i++) holes.push(sim.addHole({ name: 'h' + i, x: (Math.random() - 0.5) * map.span * 0.8, z: (Math.random() - 0.5) * map.span * 0.8, bot: true, skill: 0.8, aggro: 0.5 }));
sim.focus = holes[0];
let nAct = 0; let wT = 0; { const w = sim.world; const f = w.step.bind(w); w.step = (...a) => { const t = performance.now(); const r = f(...a); wT = performance.now() - t; return r; }; } const oa = sim.activate.bind(sim); sim.activate = (it) => { nAct++; return oa(it); };
const ts = [];
for (let s = 0; s < 60 * 120; s++) {
  for (const h of holes) botThink(sim, h, DT);
  if (process.env.VIEW) { const r = holes[0].r; sim.viewR = (24 + Math.min(r, 8) * 6.2 + Math.max(0, r - 8) * 3.4) * 0.78 + 6; }
  nAct = 0;
  const ev0 = sim.events.length;
  const a = performance.now();
  sim.step();
  const dt = performance.now() - a;
  const kinds = {}; for (const e of sim.events) kinds[e.t] = (kinds[e.t] || 0) + 1;
  if (dt > 15 && process.env.MARK) console.log('SPIKE', s, dt.toFixed(1));
  ts.push({ s, dt, w: wT.toFixed(1), act: nAct, active: sim.active.size, kinds: JSON.stringify(kinds) });
  sim.events.length = 0; sim.added.length = 0; if (sim.frozenNow) sim.frozenNow.length = 0;
}
if (globalThis.__stopProf) await globalThis.__stopProf();
const d = ts.map((t) => t.dt).sort((a, b) => a - b);
const p = (q) => d[Math.floor(q * (d.length - 1))].toFixed(2);
console.log('p50', p(0.5), 'p90', p(0.9), 'p99', p(0.99), 'max', p(1));
console.log(ts.filter((t) => t.dt > 8).length, 'steps >8ms');
for (const t of ts.sort((a, b) => b.dt - a.dt).slice(0, 15)) console.log(t.s, t.dt.toFixed(1), 'world', t.w, 'act', t.act, 'active', t.active, t.kinds);
