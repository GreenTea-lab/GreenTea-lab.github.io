// Симуляция темпа: бот покупает выгодную машину, торгуется, делает окупаемые работы, моет и продаёт.
// node tools/balance.mjs [сделок]
import { genListing, sellerReply, jobs, value, genBuyer, buyerReply, xpFor, quality, dealerPrice, rng } from '../src/econ.js';
import { CAR, UPGRADES, xpNeed } from '../src/data.js';
const N = +process.argv[2] || 80;
const r = rng(7);
let money = 50000, xp = 0, lvl = 1;
const up = {};
let t = 0, flips = 0, loss = 0;
const lvlAt = {};
const log = [];
for (let n = 0; n < N; n++) {
  // объявления: выбираем лучшее по ожидаемой прибыли
  const L = Array.from({ length: 4 + (up.contacts || 0) }, () => genListing(r, lvl, up));
  let best = null;
  for (const l of L) {
    if (l.min > money * 0.9) continue;
    const c = JSON.parse(JSON.stringify(l.car));
    // видим скрытое только со сканером — иначе верим заявлениям
    if (!up.scanner) for (const s in l.claims) c.sys[s] = l.claims[s];
    let spend = 0;
    for (let k = 0; k < 30; k++) {
      const J = jobs(c, up).filter((j) => !j.need && j.gain > j.cost * 1.05).sort((a, b) => b.gain - b.cost - (a.gain - a.cost));
      if (!J.length) break;
      J[0].apply(c);
      spend += J[0].cost;
    }
    c.dirt = 0;
    const est = value(c) * 0.97 - spend - l.min * 1.1;
    if (!best || est > best.est) best = { l, est };
  }
  if (!best) { t += 1; continue; }
  const l = best.l;
  // торг: начинаем с 65% и поднимаем
  let price = null;
  for (let x = Math.round(l.ask * 0.65 / 500) * 500; x <= l.ask; x += Math.max(500, Math.round(l.ask * 0.05 / 500) * 500)) {
    const a = sellerReply(l, x, r);
    if (a.kind === 'accept') { price = a.price; break; }
    if (a.kind === 'leave') break;
  }
  t += 0.6;
  if (price === null || price > money) continue;
  money -= price;
  const car = l.car;
  let spent = 0;
  for (let k = 0; k < 40; k++) {
    const J = jobs(car, up).filter((j) => !j.need && j.gain > j.cost * 1.05 && j.cost <= money).sort((a, b) => b.gain - b.cost - (a.gain - a.cost));
    if (!J.length) break;
    J[0].apply(car);
    money -= J[0].cost;
    spent += J[0].cost;
  }
  car.dirt = 0;
  t += 2.2;
  // продажа: 4 покупателя, торгуемся с каждым, берём лучшее
  const ask = Math.round(value(car) * 1.1 / 500) * 500;
  let sale = dealerPrice(car);
  for (let b = 0; b < 4; b++) {
    const B = genBuyer(r, car, ask, up);
    let got = B.offer;
    for (let c = ask; c > B.offer; c -= Math.round(ask * 0.04 / 500) * 500 || 500) {
      const a = buyerReply(B, c, r);
      if (a.kind === 'accept') { got = a.price; break; }
      if (a.kind === 'leave') { got = 0; break; }
      got = Math.max(got, B.offer);
    }
    sale = Math.max(sale, got);
  }
  t += 0.8;
  money += sale;
  const profit = sale - price - spent;
  if (profit < 0) loss++;
  flips++;
  xp += xpFor(car, profit);
  while (lvl < 30 && xp >= xpNeed(lvl)) { xp -= xpNeed(lvl); lvl++; lvlAt[lvl] = [flips, Math.round(t)]; }
  // улучшения: покупаем, если хватает на два захода
  for (const u of UPGRADES) {
    const cur = up[u.id] || 0;
    if (cur < u.max && lvl >= u.lvl && money > u.cost[cur] * 2.5) { money -= u.cost[cur]; up[u.id] = cur + 1; }
  }
  if (n < 12 || n % 10 === 0) log.push(`#${flips} ${l.car.model} t${l.tier} куплено ${price} работы ${spent} продано ${sale} прибыль ${profit} (${Math.round(profit / CAR[car.model].base * 100)}% базы) деньги ${money} ур ${lvl}`);
}
console.log(log.join('\n'));
console.log('уровни (сделок, минут):', JSON.stringify(lvlAt));
console.log(`итого сделок ${flips}, в минус ${loss}, деньги ${money}, уровень ${lvl}, ~${Math.round(t)} мин`, JSON.stringify(up));
