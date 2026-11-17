// отладка бота: node test/dbg.mjs <уровень> <seed> <с> <по>
import { Kitchen } from '../src/kitchen.js';
import { Bot } from '../src/bot.js';
const [lv, seed, t0, t1] = process.argv.slice(2).map(Number);
const k = new Kitchen(lv - 1, { seed }); k.started = true;
const bot = new Bot(k); const dt = 1 / 30;
const it = (x) => !x ? '-' : x.k === 'ing' ? x.id + ':' + x.st : x.k === 'plate' ? 'plate[' + x.parts.join('+') + (x.soup ? 'soup:' + x.soup : '') + ']' : x.k;
while (k.t < t1 && !k.finished) {
  const inp = bot.step(dt); k.update(dt, inp);
  if (k.t >= t0) {
    const ev = k.events.map((e) => e.type + (e.x !== undefined ? '@' + e.x + ',' + e.z : '')).join();
    console.log(k.t.toFixed(2), 'A' + k.active, k.chefs.map((c, i) => `${c.x.toFixed(2)},${c.z.toFixed(2)} d${c.dir.toFixed(2)} tg${c.target ? c.target.x + ',' + c.target.z : '-'} w${c.work ? 1 : 0} h=${it(c.hold)} I=${bot.intent[i] ? bot.intent[i].op + bot.intent[i].t.x + ',' + bot.intent[i].t.z : '-'}`).join(' | '), JSON.stringify(inp), ev);
  }
  k.events.length = 0;
}
