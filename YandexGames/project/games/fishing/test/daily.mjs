// Юнит-тесты ежедневного: серия подарков, задания, погода, рыба дня. node test/daily.mjs
import { giftState, makeQuests, questEvent, weatherAt, fishOfDay, dayNum, GIFTS } from '../src/daily.js';
import { LOCATIONS, rollFish, SPECIES } from '../src/data.js';
const ok = [];
const eq = (name, a, b) => ok.push([name, JSON.stringify(a) === JSON.stringify(b), a]);
const d = 20000;
eq('первый вход', giftState({ last: null, streak: 0 }, d), { can: true, idx: 0, broken: false });
eq('сегодня уже забрал', giftState({ last: d, streak: 3 }, d).can, false);
eq('вчера — следующий день', giftState({ last: d - 1, streak: 3 }, d).idx, 3);
eq('после 7 дня — снова 1', giftState({ last: d - 1, streak: 7 }, d).idx, 0);
const br = giftState({ last: d - 3, streak: 5 }, d);
eq('пропуск — серия сброшена', [br.idx, br.broken, br.lost], [0, true, 5]);
eq('пропуск после 1 дня — не «прервалась»', giftState({ last: d - 3, streak: 1 }, d).broken, false);
eq('подарков 7', GIFTS.length, 7);
// задания: стабильны в течение дня, разные в разные дни, 3 штуки, первое — «поймать N»
const q1 = makeQuests(d, 4, [0, 1]), q2 = makeQuests(d, 4, [0, 1]), q3 = makeQuests(d + 1, 4, [0, 1]);
eq('задания стабильны', q1, q2);
eq('три задания', q1.length, 3);
eq('первое — поймать', q1[0].k, 'catch');
ok.push(['меняются по дням', JSON.stringify(q1) !== JSON.stringify(q3) || JSON.stringify(makeQuests(d + 2, 4, [0, 1])) !== JSON.stringify(q1), '']);
const qs = makeQuests(d, 1, [0]);
for (let i = 0; i < 30; i++) questEvent(qs, { t: 'catch', id: 'crucian', w: 5, bubbles: true });
questEvent(qs, { t: 'sell', n: 99999 });
questEvent(qs, { t: 'smoke' }); questEvent(qs, { t: 'smoke' }); questEvent(qs, { t: 'cat' });
const spec = qs.find((q) => q.k === 'species');
ok.push(['задания выполняются', qs.every((q) => q.done || (q.k === 'species' && q.s !== 'crucian')), qs.map((q) => q.k + (q.done ? '✓' : '')).join(' ')]);
// погода: 4 вида встречаются, рыба дня не легендарная
const ws = new Set();
for (let i = 0; i < 400; i++) ws.add(weatherAt(Date.UTC(2026, 0, 1) + i * 6 * 3600e3));
eq('все виды погоды', [...ws].sort(), ['cloud', 'fog', 'rain', 'sun']);
let legendDay = false;
for (let i = 0; i < 365; i++) for (let l = 0; l < 5; l++) if (SPECIES[fishOfDay(l, d + i)].r >= 4) legendDay = true;
eq('рыба дня — не трофейная и не легенда', legendDay, false);
// улов: все виды водоёма ловятся, легенда редкая, мормышка помогает
for (const [li, L] of LOCATIONS.entries()) {
  const cnt = {};
  let leg = 0, legJ = 0;
  for (let i = 0; i < 40000; i++) {
    const part = ['morning', 'day', 'evening', 'night'][i % 4];
    const f = rollFish({ loc: L, bait: ['worm', 'maggot', 'corn', 'spinner'][i % 4], part, weather: 'cloud', d: Math.random(), bubbles: false, luck: false, fishDay: null });
    cnt[f.id] = (cnt[f.id] || 0) + 1;
    if (SPECIES[f.id].r === 5) leg++;
    if (SPECIES[rollFish({ loc: L, bait: 'jig', part, weather: 'cloud', d: 0.8 }).id].r === 5) legJ++;
  }
  ok.push([`${L.id}: все ${L.fish.length} видов ловятся`, L.fish.every((id) => cnt[id] > 0), L.fish.map((id) => id + ':' + (cnt[id] || 0)).join(' ')]);
  ok.push([`${L.id}: легенда ${(leg / 400).toFixed(2)}%, на мормышку ${(legJ / 400).toFixed(2)}%`, leg / 40000 < 0.01 && legJ > leg * 3, '']);
}
let bad = 0;
for (const [n, pass, v] of ok) {
  console.log((pass ? 'ok  ' : 'FAIL') + ' ' + n + (pass ? '' : ' → ' + JSON.stringify(v)) + (pass && typeof v === 'string' && v ? '  ' + v : ''));
  if (!pass) bad++;
}
console.log(bad ? `ПРОВАЛЕНО: ${bad}` : 'ВСЁ ОК');
