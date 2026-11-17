import { World } from '../src/world.js';
const mode = process.argv[2] || 'ffa';
const secs = +process.argv[3] || 180;
const w = new World({ mode });
const t0 = Date.now();
let deaths = 0, kills = {};
const dt = 1/60;
for (let i = 0; i < secs*60; i++) {
  w.step(dt);
  for (const ev of w.events) { if (ev.type==='tankdead') { deaths++; const k=ev.killer; const key=k? (k.kind==='tank'?'tank':k.kind==='shape'?k.type:k.kind):'none'; kills[key]=(kills[key]||0)+1; } if (ev.type==='boss') console.log('boss', ev.boss.type, w.t.toFixed(0)); if (ev.type==='bossdead') console.log('boss dead', w.t.toFixed(0), ev.killer && ev.killer.name); }
  w.events.length = 0;
  if (i % (60*30) === 0) console.log('t', (i/60)|0, 'ents', w.ents.length, 'tanks', w.tanks.length, 'ms/step', ((Date.now()-t0)/(i+1)).toFixed(2));
}
console.log(kills); console.log('deaths', deaths, 'ms/step', ((Date.now()-t0)/(secs*60)).toFixed(2));
for (const t of w.leaderboard(15)) console.log(t.name.padEnd(12), t.cls.padEnd(12), 'L'+t.level, Math.round(t.score), 'k'+t.kills, t.stats.join(''), 'team', t.team);
console.log(w.counts);
