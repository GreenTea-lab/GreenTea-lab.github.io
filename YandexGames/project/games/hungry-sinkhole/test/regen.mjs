// регенерация: 11 ботов, 180 с; считаем, сколько всего вернулось и сколько домов отстроилось
import { Sim, initPhysics, DT } from '../src/sim.js';
import { genMap } from '../src/city.js';
import { botThink } from '../src/bots.js';
await initPhysics();
const id = process.argv[2] || 'town';
const regen = process.argv[3] !== 'off';
const map = genMap(id, 11);
const sim = new Sim(map, { regen, pickups: 6 });
const holes = [];
for (let i = 0; i < 11; i++) holes.push(sim.addHole({ name: 'h' + i, x: (Math.random() - 0.5) * map.span * 0.8, z: (Math.random() - 0.5) * map.span * 0.8, bot: true, skill: 0.4 + Math.random() * 0.5, aggro: Math.random() }));
sim.focus = holes[0];
const cnt = { eat: 0, regen: 0, house: 0, pick: 0, gold: 0, goldEat: 0 };
const t0 = performance.now();
let worst = 0;
for (let s = 0; s < 60 * 180; s++) {
  for (const h of holes) botThink(sim, h, DT);
  const a = performance.now();
  sim.step();
  worst = Math.max(worst, performance.now() - a);
  for (const e of sim.events) {
    if (e.t === 'eat') cnt.eat++;
    if (e.t === 'regen') e.big ? cnt.house++ : cnt.regen++;
    if (e.t === 'pick') cnt.pick++;
    if (e.t === 'gold') cnt.gold++;
    if (e.t === 'eat' && e.it.gold) cnt.goldEat++;
  }
  sim.events.length = 0; sim.added.length = 0; if (sim.frozenNow) sim.frozenNow.length = 0;
  if (s % 1800 === 1799) {
    const alive = sim.items.filter((it) => it.st !== 2).length;
    console.log((s + 1) / 60 + 's', JSON.stringify(cnt), 'alive items', alive, 'queue', sim.regenQ.length, 'pickups', sim.pickups.length, 'top r', Math.max(...holes.map((h) => h.r)).toFixed(1));
  }
}
console.log('avg', ((performance.now() - t0) / 10800).toFixed(2), 'ms worst', worst.toFixed(1), 'start items', map.items.length);
