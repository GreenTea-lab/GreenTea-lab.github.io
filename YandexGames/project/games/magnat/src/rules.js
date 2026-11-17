// Правила: состояние партии, аренда, строительство, залог, карточки, оценка имущества
import { CELLS, GROUPS, GROUP_CELLS, TRANSPORT, UTILS, OWNABLE, TRANSPORT_RENT, CHANCE, CHEST, START_MONEY, JAIL } from './data.js';

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const shuffle = (n, r) => {
  const a = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// новая партия: players — [{name, bot, token, av, g}]
export function newMatch({ players, diff, limit, seed, rules = {} }) {
  const r = rng(seed || Date.now());
  return {
    v: 1,
    seed: Math.floor(r() * 1e9),
    players: players.map((p, i) => ({ ...p, idx: i, money: START_MONEY, pos: 0, jail: 0, inJail: false, free: [], out: false, place: 0 })),
    own: {}, // клетка -> { o: игрок, h: дома 0..5 (5 — отель), m: в залоге }
    cur: 0,
    round: 1,
    doubles: 0,
    decks: { chance: shuffle(CHANCE.length, r), chest: shuffle(CHEST.length, r) },
    diff,
    limit, // число кругов, 0 — до банкротства
    over: false,
    outOrder: [],
    adBonus: false,
    stats: { rentPaid: [0, 0, 0, 0], rentGot: [0, 0, 0, 0], built: [0, 0, 0, 0] },
    rules: { pot: !!rules.pot, go2: !!rules.go2, quick: !!rules.quick },
    pot: 0, // копилка парка
    hist: [], // капитал игроков по кругам (для графика в итогах)
    sets: {}, // группы, уже засчитанные игроку в задания
  };
}

// «Быстрый старт»: каждому по 2 случайных города из разных групп, бесплатно
export function dealStart(M, r) {
  const cities = shuffle(CELLS.length, r).filter((i) => CELLS[i].type === 'city');
  const used = new Set();
  for (const p of M.players) {
    let got = 0;
    for (const i of cities) {
      if (got >= 2) break;
      if (M.own[i]) continue;
      const g = CELLS[i].group;
      if (used.has(p.idx + g)) continue;
      M.own[i] = { o: p.idx, h: 0, m: false };
      used.add(p.idx + g);
      got++;
    }
  }
}

export function snapshot(M) {
  M.hist = M.hist || [];
  M.hist.push(M.players.map((p) => (p.out ? 0 : worth(M, p.idx))));
}

// группы, которые станут полными у p после обмена (а сейчас не полные)
export function newSets(M, p, give, get) {
  const after = new Set(cellsAfter(M, p, give, get));
  return Object.keys(GROUP_CELLS).filter((g) => !hasSet(M, p, g) && GROUP_CELLS[g].every((i) => after.has(i)));
}

export const cell = (i) => CELLS[i];
export const owner = (M, i) => (M.own[i] ? M.own[i].o : -1);
export const alive = (M) => M.players.filter((p) => !p.out);
export const ownedBy = (M, p) => OWNABLE.filter((i) => M.own[i] && M.own[i].o === p);

export function hasSet(M, p, g) {
  return GROUP_CELLS[g].every((i) => owner(M, i) === p);
}
export function setMortgaged(M, g) {
  return GROUP_CELLS[g].some((i) => M.own[i] && M.own[i].m);
}
export const groupHouses = (M, g) => GROUP_CELLS[g].reduce((s, i) => s + ((M.own[i] && M.own[i].h) || 0), 0);

// аренда на клетке; dice — сумма костей (для предприятий); mult — множитель от карточки
export function rent(M, i, dice = 7, card = null) {
  const c = CELLS[i];
  const o = M.own[i];
  if (!o || o.m) return 0;
  if (c.type === 'city') {
    if (o.h > 0) return c.rent[o.h];
    return hasSet(M, o.o, c.group) ? c.rent[0] * 2 : c.rent[0];
  }
  if (c.type === 'transport') {
    const n = TRANSPORT.filter((k) => owner(M, k) === o.o).length;
    return TRANSPORT_RENT[n - 1] * (card === 'nearest' ? 2 : 1);
  }
  if (c.type === 'util') {
    if (card === 'nearest') return dice * 10;
    const n = UTILS.filter((k) => owner(M, k) === o.o).length;
    return dice * (n === 2 ? 10 : 4);
  }
  return 0;
}

// ---------- строительство ----------
export const houseCost = (i) => GROUPS[CELLS[i].group].house;

export function canBuild(M, p, i) {
  const c = CELLS[i];
  if (c.type !== 'city' || owner(M, i) !== p) return false;
  if (!hasSet(M, p, c.group) || setMortgaged(M, c.group)) return false;
  const h = M.own[i].h;
  if (h >= 5) return false;
  const min = Math.min(...GROUP_CELLS[c.group].map((k) => M.own[k].h));
  return h === min && M.players[p].money >= houseCost(i);
}
export function canSell(M, p, i) {
  const c = CELLS[i];
  if (c.type !== 'city' || owner(M, i) !== p) return false;
  const h = M.own[i].h;
  if (h <= 0) return false;
  const max = Math.max(...GROUP_CELLS[c.group].map((k) => M.own[k].h));
  return h === max;
}
export function canMortgage(M, p, i) {
  const c = CELLS[i];
  if (owner(M, i) !== p || M.own[i].m) return false;
  if (c.type === 'city' && groupHouses(M, c.group) > 0) return false;
  return true;
}
export const unmortgageCost = (i) => Math.ceil(CELLS[i].mortgage * 1.1);
export function canUnmortgage(M, p, i) {
  return owner(M, i) === p && M.own[i].m && M.players[p].money >= unmortgageCost(i);
}
export function build(M, p, i) {
  M.players[p].money -= houseCost(i);
  M.own[i].h++;
  M.stats.built[p]++;
}
export function sell(M, p, i) {
  M.own[i].h--;
  M.players[p].money += houseCost(i) / 2;
}
export function mortgage(M, p, i) {
  M.own[i].m = true;
  M.players[p].money += CELLS[i].mortgage;
}
export function unmortgage(M, p, i) {
  M.own[i].m = false;
  M.players[p].money -= unmortgageCost(i);
}

// сколько денег можно собрать, продав дома и заложив всё
export function liquid(M, p) {
  let s = M.players[p].money;
  for (const i of ownedBy(M, p)) {
    const o = M.own[i];
    if (o.h) s += (o.h * houseCost(i)) / 2;
    if (!o.m) s += CELLS[i].mortgage;
  }
  return s;
}
// капитал: деньги + цена участков (заложенные — половина) + стоимость домов
export function worth(M, p) {
  let s = M.players[p].money;
  for (const i of ownedBy(M, p)) {
    const o = M.own[i];
    s += o.m ? CELLS[i].mortgage : CELLS[i].price;
    if (o.h) s += o.h * houseCost(i);
  }
  return s;
}

export const housesOf = (M, p) => {
  let h = 0,
    H = 0;
  for (const i of ownedBy(M, p)) {
    const n = M.own[i].h;
    if (n === 5) H++;
    else h += n;
  }
  return { h, H };
};

// ---------- карточки ----------
export function draw(M, deck) {
  const d = M.decks[deck];
  const k = d.shift();
  // карточку «Освобождение» игрок забирает себе, остальные уходят под низ колоды
  const card = (deck === 'chance' ? CHANCE : CHEST)[k];
  if (card.a !== 'free') d.push(k);
  return { ...card, id: k, deck };
}
export function returnFree(M, p) {
  const f = M.players[p].free.shift();
  if (f) M.decks[f.deck].push(f.id);
}

export function nearest(pos, kind) {
  const list = kind === 'transport' ? TRANSPORT : UTILS;
  for (let s = 1; s <= 40; s++) if (list.includes((pos + s) % 40)) return (pos + s) % 40;
  return list[0];
}

// передача имущества банкрота: кредитору (или банку, если -1)
export function bankrupt(M, p, to) {
  const P = M.players[p];
  for (const i of ownedBy(M, p)) {
    const o = M.own[i];
    // дома банку за полцены
    if (o.h) {
      P.money += (o.h * houseCost(i)) / 2;
      o.h = 0;
    }
    if (to >= 0) o.o = to;
    else delete M.own[i];
  }
  if (to >= 0) {
    M.players[to].money += Math.max(0, P.money);
    M.players[to].free.push(...P.free);
  } else for (const f of P.free) M.decks[f.deck].push(f.id);
  P.free = [];
  P.money = 0;
  P.out = true;
  M.outOrder.push(p);
}

export function nextPlayer(M) {
  let n = M.cur;
  for (let k = 0; k < M.players.length; k++) {
    n = (n + 1) % M.players.length;
    if (!M.players[n].out) break;
  }
  if (n <= M.cur) M.round++;
  M.cur = n;
  M.doubles = 0;
}

// места в конце: живые по капиталу, потом выбывшие в обратном порядке
export function standings(M) {
  const live = alive(M)
    .map((p) => p.idx)
    .sort((a, b) => worth(M, b) - worth(M, a));
  return [...live, ...[...M.outOrder].reverse()];
}

// ---------- оценка участков (для ботов и обменов) ----------
// ценность набора участков для игрока: полные группы ценятся сильно дороже
export function holdValue(M, p, cells) {
  const set = new Set(cells);
  let v = 0;
  const byG = {};
  let tr = 0,
    ut = 0;
  for (const i of set) {
    const c = CELLS[i];
    const base = M.own[i] && M.own[i].m ? c.price * 0.55 : c.price;
    if (c.type === 'city') (byG[c.group] = byG[c.group] || []).push(base + (M.own[i] ? M.own[i].h * houseCost(i) : 0));
    else if (c.type === 'transport') {
      tr++;
      v += base;
    } else {
      ut++;
      v += base;
    }
  }
  if (tr > 1) v += (tr - 1) * 60 * tr;
  if (ut > 1) v += 60;
  for (const g in byG) {
    const n = GROUP_CELLS[g].length;
    const k = byG[g].length;
    const sum = byG[g].reduce((a, b) => a + b, 0);
    const mult = k === n ? 2.6 : k === n - 1 ? 1.3 : 1;
    v += sum * mult;
  }
  return v;
}

export function cellsAfter(M, p, give, get) {
  const own = ownedBy(M, p).filter((i) => !give.includes(i));
  return [...own, ...get];
}

// выполнить обмен: a отдаёт cellsA и moneyA, b — cellsB и moneyB
export function doTrade(M, t) {
  for (const i of t.cellsA) M.own[i].o = t.b;
  for (const i of t.cellsB) M.own[i].o = t.a;
  M.players[t.a].money += t.moneyB - t.moneyA;
  M.players[t.b].money += t.moneyA - t.moneyB;
}

// в обмен можно отдавать только участки без домов во всей группе
export function tradable(M, p, i) {
  if (owner(M, i) !== p) return false;
  const c = CELLS[i];
  return c.type !== 'city' || groupHouses(M, c.group) === 0;
}

export function jailCell() {
  return JAIL;
}
