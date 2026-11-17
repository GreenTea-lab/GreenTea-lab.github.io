// выживание «игрока» (управляет бот средней руки) на арене: node test/psim.mjs [mode] [minutes] [skill]
import { World } from '../src/world.js';
import { newBrain, thinkBot } from '../src/bots.js';
const mode = process.argv[2] || 'ffa', mins = +process.argv[3] || 10, skill = +process.argv[4] || 0.6;
const w = new World({ mode });
for (let i = 0; i < 60 * 60; i++) { w.step(1 / 60); w.events.length = 0; } // арена «живёт» минуту
const lives = [];
let p = null, born = 0;
const spawn = () => { p = w.addPlayer({ name: 'Я', color: 0x31f6ff, team: 0 }); p.bot = newBrain(p); p.bot.skill = skill; p.bot.hunter = false; p.bot.aggr = 0; born = w.t; };
spawn();
for (let i = 0; i < mins * 60 * 60; i++) {
  thinkBot(w, p, 1 / 60);
  w.step(1 / 60);
  for (const ev of w.events) if (ev.type === 'tankdead' && ev.e === p) {
    const k = ev.killer;
    lives.push({ t: Math.round(w.t - born), lvl: p.level, score: Math.round(p.score), by: k ? (k.kind === 'tank' ? 'L' + k.level + (k.bot && k.bot.target === p ? 'T' : '') + (k.bot && k.lastTankHitter === p ? 'R' : '') + (k.bot && k.bot.hunter ? 'H':'') : k.type || k.kind) : '-' });
    spawn();
  }
  w.events.length = 0;
}
lives.push({ t: Math.round(w.t - born), lvl: p.level, score: Math.round(p.score), by: 'alive' });
console.log(lives.map(l => `${l.t}s L${l.lvl} (${l.by})`).join(' | '));
