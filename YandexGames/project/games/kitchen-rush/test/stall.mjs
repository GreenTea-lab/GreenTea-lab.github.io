import { Kitchen } from '../src/kitchen.js';
import { Bot } from '../src/bot.js';
const lv = +process.argv[2] - 1, seed = +(process.argv[3] || 1000);
const k = new Kitchen(lv, { seed }); k.started = true;
const bot = new Bot(k); const dt = 1 / 30; let idle = 0, shown = 0;
const it = (x) => !x ? '-' : x.k === 'ing' ? x.id + ':' + x.st : x.k === 'plate' ? 'plate[' + x.parts.join('+') + (x.soup ? 'soup:' + x.soup : '') + ']' : x.k === 'pot' ? `pot(${x.ing||''}${x.n} ${x.done?'done':''}${x.burnt?'BURNT':''})` : x.k === 'pan' ? 'pan(' + it(x.item) + ')' : x.k;
while (!k.finished) {
  const inp = bot.step(dt); k.update(dt, inp); k.events.length = 0;
  const moving = k.chefs.some((c) => Math.hypot(c.vx, c.vz) > 0.3 || c.work);
  idle = moving ? 0 : idle + dt;
  if (idle > 4 && shown < 2) {
    shown++; idle = -20;
    console.log('STALL t=' + k.t.toFixed(1), 'orders', k.orders.map((o) => o.r).join(','));
    k.chefs.forEach((c, i) => console.log(' chef', i, c.x.toFixed(1), c.z.toFixed(1), 'hold', it(c.hold), 'intent', JSON.stringify(bot.intent[i] && { op: bot.intent[i].op, x: bot.intent[i].t.x, z: bot.intent[i].t.z })));
    for (const t of k.tiles) if (t.item || t.count || t.dirty || t.clean) console.log('  ', t.x, t.z, t.type, it(t.item), t.count ?? '', t.dirty ?? '', t.clean ?? '', t.fire ? 'FIRE' : '');
  }
}
console.log('score', k.score);
