// Соперники: покупка, аукцион, тюрьма, строительство, залог, обмены
import { CELLS, GROUP_CELLS, GROUP_ORDER, JAIL_FINE } from './data.js';
import * as R from './rules.js';

// уровни: 0 — лёгкие, 1 — средние, 2 — сильные
const LV = [
  { reserve: 60, buyChance: 0.75, auction: 0.85, build: 0.55, greed: 1.0, trade: 0.25 },
  { reserve: 120, buyChance: 0.95, auction: 1.05, build: 0.85, greed: 1.25, trade: 0.5 },
  { reserve: 150, buyChance: 1, auction: 1.25, build: 1, greed: 1.45, trade: 0.8 },
];
const lv = (M) => LV[M.diff] || LV[1];

// опасность поля: максимальная аренда у соперников (с домами) — сколько держать про запас
function danger(M, p) {
  let mx = 0;
  for (const i in M.own) {
    const o = M.own[i];
    if (o.o === p || o.m) continue;
    mx = Math.max(mx, R.rent(M, +i, 8));
  }
  return mx;
}
export function reserve(M, p) {
  const L = lv(M);
  return Math.min(500, Math.max(L.reserve, danger(M, p) * (M.diff === 2 ? 0.6 : 0.4)));
}

// сколько участок стоит для игрока p (с учётом групп и блокировки соперников)
export function cellWorth(M, p, i) {
  const c = CELLS[i];
  let v = c.price;
  if (c.type === 'city') {
    const g = GROUP_CELLS[c.group];
    const mine = g.filter((k) => R.owner(M, k) === p).length;
    const others = new Set(g.map((k) => R.owner(M, k)).filter((o) => o >= 0 && o !== p));
    if (mine === g.length - 1) v *= 1.9; // замыкает группу
    else if (mine > 0 && others.size === 0) v *= 1.3;
    // блокирует соперника, у которого почти вся группа
    for (const o of others) if (g.filter((k) => R.owner(M, k) === o).length === g.length - 1) v *= 1.5;
    // оранжевые и красные — самые посещаемые
    if (c.group === 'orange' || c.group === 'red') v *= 1.1;
  } else if (c.type === 'transport') {
    const n = CELLS.filter((x) => x.type === 'transport' && R.owner(M, x.i) === p).length;
    v *= 1 + n * 0.25;
  } else v *= 0.85;
  return v;
}

export function wantBuy(M, p, i, r) {
  const L = lv(M);
  const P = M.players[p];
  const c = CELLS[i];
  if (P.money < c.price) return false;
  const left = P.money - c.price;
  const w = cellWorth(M, p, i);
  if (w >= c.price * 1.8) return left >= 0; // замыкает группу — брать почти любой ценой
  if (left < reserve(M, p) * 0.6) return false;
  return r() < L.buyChance;
}

// максимальная ставка на аукционе
export function auctionMax(M, p, i, r) {
  const L = lv(M);
  const P = M.players[p];
  const w = cellWorth(M, p, i) * L.auction * (0.9 + r() * 0.2);
  return Math.max(0, Math.min(w, P.money - reserve(M, p) * 0.5));
}

// в тюрьме: 'pay', 'card' или 'roll'
export function jailChoice(M, p) {
  const P = M.players[p];
  const unowned = CELLS.filter((c) => c.price && !M.own[c.i]).length;
  const early = unowned > 8;
  if (P.free.length && early) return 'card';
  if (early && P.money > JAIL_FINE + reserve(M, p)) return 'pay';
  if (P.jail >= 3) return P.free.length ? 'card' : 'pay';
  return 'roll';
}

// собрать need денег: сначала заложить одиночные участки, потом продать дома, потом заложить остальное
// возвращает список действий [{a:'mortgage'|'sell', i}]
export function raise(M, p, need) {
  const acts = [];
  const P = M.players[p];
  const mine = () => R.ownedBy(M, p);
  const setCell = (i) => CELLS[i].type === 'city' && R.hasSet(M, p, CELLS[i].group);
  const byCheap = (a, b) => CELLS[a].price - CELLS[b].price;
  let guard = 200;
  while (P.money < need && guard-- > 0) {
    // 1) одиночные участки
    let c = mine().filter((i) => R.canMortgage(M, p, i) && !setCell(i)).sort(byCheap)[0];
    if (c !== undefined) {
      R.mortgage(M, p, c);
      acts.push({ a: 'mortgage', i: c });
      continue;
    }
    // 2) дома (с самых дешёвых групп)
    c = mine().filter((i) => R.canSell(M, p, i)).sort(byCheap)[0];
    if (c !== undefined) {
      R.sell(M, p, c);
      acts.push({ a: 'sell', i: c });
      continue;
    }
    // 3) участки из групп
    c = mine().filter((i) => R.canMortgage(M, p, i)).sort(byCheap)[0];
    if (c !== undefined) {
      R.mortgage(M, p, c);
      acts.push({ a: 'mortgage', i: c });
      continue;
    }
    break;
  }
  return acts;
}

// дела в конце хода: выкуп из залога и строительство; возвращает действия
export function manage(M, p, r) {
  const L = lv(M);
  const P = M.players[p];
  const acts = [];
  const res = reserve(M, p);
  // выкупить заложенные участки из групп
  for (const i of R.ownedBy(M, p)) {
    if (!M.own[i].m) continue;
    const c = CELLS[i];
    const inSet = c.type === 'city' && R.hasSet(M, p, c.group);
    if (P.money - R.unmortgageCost(i) > res * (inSet ? 1 : 1.8)) {
      R.unmortgage(M, p, i);
      acts.push({ a: 'unmortgage', i });
    }
  }
  if (r() > L.build) return acts;
  // строить, начиная с самых дорогих доступных групп, равномерно
  let guard = 60;
  while (guard-- > 0) {
    const opts = R.ownedBy(M, p).filter((i) => R.canBuild(M, p, i) && P.money - R.houseCost(i) >= res);
    if (!opts.length) break;
    // лучше всего доводить до 3 домов: выбираем клетку с максимальным приростом аренды на вложенное
    opts.sort((a, b) => gain(M, b) - gain(M, a));
    const i = opts[0];
    R.build(M, p, i);
    acts.push({ a: 'build', i });
  }
  return acts;
}
function gain(M, i) {
  const c = CELLS[i];
  const h = M.own[i].h;
  return (c.rent[h + 1] - (h ? c.rent[h] : c.rent[0] * 2)) / R.houseCost(i);
}

// ---------- обмены ----------
// оценка сделки для игрока me: выгода по ценности участков и деньгам, минус выгода соперника
export function tradeScore(M, me, t) {
  const other = me === t.a ? t.b : t.a;
  const give = me === t.a ? t.cellsA : t.cellsB;
  const get = me === t.a ? t.cellsB : t.cellsA;
  const mGive = me === t.a ? t.moneyA : t.moneyB;
  const mGet = me === t.a ? t.moneyB : t.moneyA;
  const before = R.holdValue(M, me, R.ownedBy(M, me));
  const after = R.holdValue(M, me, R.cellsAfter(M, me, give, get));
  const oBefore = R.holdValue(M, other, R.ownedBy(M, other));
  const oAfter = R.holdValue(M, other, R.cellsAfter(M, other, get, give));
  const mine = after - before + mGet - mGive;
  const theirs = oAfter - oBefore + mGive - mGet;
  return { mine, theirs };
}

// согласится ли бот me на предложение
export function acceptTrade(M, me, t) {
  const L = lv(M);
  const P = M.players[me];
  const mGive = me === t.a ? t.moneyA : t.moneyB;
  if (mGive > P.money) return false;
  const { mine, theirs } = tradeScore(M, me, t);
  // сильные боты требуют больше, если соперник получает группу
  const need = 10 + Math.max(0, theirs) * (L.greed - 1) * 0.8;
  return mine > need;
}

// бот ищет сделку, которая замкнёт его группу: предлагает деньги (и, если надо, участок)
export function proposeTrade(M, me, r) {
  const L = lv(M);
  if (r() > L.trade) return null;
  const P = M.players[me];
  for (const g of GROUP_ORDER) {
    const cells = GROUP_CELLS[g];
    const mine = cells.filter((i) => R.owner(M, i) === me);
    if (mine.length !== cells.length - 1) continue;
    const miss = cells.find((i) => R.owner(M, i) !== me);
    const o = R.owner(M, miss);
    if (o < 0 || M.players[o].out) continue;
    if (!R.tradable(M, o, miss)) continue;
    const c = CELLS[miss];
    // деньгами: от 1.4 до 2.4 цены
    const price = Math.round((c.price * (1.4 + r() * 0.4) * L.greed) / 10) * 10;
    // доплата участком, который соперник хочет (замыкает его группу не даём)
    const spare = R.ownedBy(M, me).filter((i) => {
      if (!R.tradable(M, me, i) || i === miss) return false;
      const cc = CELLS[i];
      if (cc.type === 'city' && GROUP_CELLS[cc.group].filter((k) => R.owner(M, k) === o).length === GROUP_CELLS[cc.group].length - 1) return false;
      return !(cc.type === 'city' && cc.group === g);
    });
    let t = { a: me, b: o, cellsA: [], cellsB: [miss], moneyA: Math.min(price, Math.max(0, P.money - 60)), moneyB: 0 };
    if (t.moneyA < c.price * 1.2 && spare.length) {
      spare.sort((x, y) => CELLS[x].price - CELLS[y].price);
      t.cellsA = [spare[0]];
      t.moneyA = Math.max(0, Math.min(t.moneyA, c.price * 1.5 - CELLS[spare[0]].price));
      t.moneyA = Math.round(t.moneyA / 10) * 10;
    }
    if (t.moneyA <= 0 && !t.cellsA.length) continue;
    return t;
  }
  return null;
}
