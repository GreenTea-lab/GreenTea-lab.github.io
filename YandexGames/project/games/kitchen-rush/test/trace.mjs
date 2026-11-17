import { Kitchen } from '../src/kitchen.js';
import { Bot } from '../src/bot.js';
const lv = +(process.argv[2] || 1) - 1, T = +(process.argv[3] || 20), every = +(process.argv[4] || 0.5);
const k = new Kitchen(lv, { seed: 1000 });
k.started = true;
const bot = new Bot(k);
const dt = 1 / 30;
let next = 0;
while (!k.finished && k.t < T) {
  const inp = bot.step(dt);
  k.update(dt, inp);
  const ev = k.events.map((e) => e.type).filter((e) => e !== 'chop' && e !== 'wash');
  if (k.t >= next || ev.length) {
    next = k.t + every;
    const f = (c, i) => `${i === k.active ? '*' : ' '}${c.x.toFixed(1)},${c.z.toFixed(1)} h=${c.hold ? c.hold.k + (c.hold.id ? ':' + c.hold.id + ':' + c.hold.st : '') : '-'} w=${c.work ? c.work.type : '-'} I=${bot.intent[i] ? bot.intent[i].op + '@' + bot.intent[i].t.x + ',' + bot.intent[i].t.z + '(' + bot.intent[i].t.type + ')' : '-'} tg=${c.target ? c.target.x + ',' + c.target.z : '-'}`;
    console.log(k.t.toFixed(1), k.chefs.map(f).join(' | '), 'inp', JSON.stringify(inp), ev.join(','), 'orders', k.orders.map((o) => o.r).join(','));
  }
  k.events.length = 0;
}
console.log('score', k.score, 'served', k.served);
