// Боты: 0 — новичок (ошибается), 1 — любитель (здравый смысл), 2 — мастер (считает карты, бережёт козыри,
// в конце партии на двоих перебирает ходы).
import { suit, rank, beats, LOW } from './core.js';

// «цена» карты: козыри дороже любой простой
function val(g, c) {
  return rank(c) - LOW[g.size] + (suit(c) === g.trump ? 20 : 0);
}

// подбор карт для отбоя всех неотбитых: старшие атаки получают самые дешёвые подходящие карты
export function planDefense(g, hand = g.hands[g.defender]) {
  const und = g.table.map((x, i) => ({ x, i })).filter((o) => o.x.d == null);
  und.sort((A, B) => val(g, B.x.a) - val(g, A.x.a));
  const used = new Set();
  const plan = [];
  let cost = 0;
  for (const { x, i } of und) {
    let best = -1, bv = 1e9;
    for (const c of hand) {
      if (used.has(c) || !beats(c, x.a, g.trump)) continue;
      const v = val(g, c);
      if (v < bv) (bv = v), (best = c);
    }
    if (best < 0) return null;
    used.add(best);
    plan.push({ c: best, i });
    cost += bv;
  }
  return { plan, cost };
}

// сколько козырей и старших карт ещё не видно (для мастера)
function unseen(g, p) {
  const seen = new Set([...g.discard, ...g.hands[p]]);
  for (const x of g.table) {
    seen.add(x.a);
    if (x.d != null) seen.add(x.d);
  }
  return seen;
}

function chooseAttack(g, p, lvl, R) {
  const hand = g.hands[p];
  const opts = hand.filter((c) => g.canAttack(p, c));
  if (!opts.length) return null;
  if (lvl === 0) {
    // новичок: что-нибудь из младших, иногда козырь
    const s = [...opts].sort((a, b) => val(g, a) - val(g, b));
    return s[Math.floor(R() * Math.min(s.length, 3))];
  }
  const endgame = !g.deck.length;
  const def = g.defender;
  const known = g.known[def];
  let best = null, bv = 1e9;
  for (const c of opts) {
    let v = val(g, c);
    // пару одного достоинства выгодно выкладывать: потом можно подкинуть
    const same = hand.filter((x) => rank(x) === rank(c)).length;
    v -= (same - 1) * (lvl === 2 ? 3 : 2);
    if (lvl === 2) {
      // известные карты защитника: ход в масть, которой у него нет и козырей не видно
      const canBeat = known.some((k) => beats(k, c, g.trump));
      if (endgame && !canBeat && known.length >= g.hands[def].length) v -= 15;
      // в конце колоды не тратить козыри зря, но и не держать младшие простые
      if (endgame && suit(c) !== g.trump) v -= 1;
    }
    if (v < bv) (bv = v), (best = c);
  }
  return best;
}

function chooseThrow(g, p, lvl, R) {
  const opts = g.hands[p].filter((c) => g.canAttack(p, c));
  if (!opts.length) return null;
  const endgame = !g.deck.length;
  const taking = g.phase === 'take';
  const lowRank = LOW[g.size];
  opts.sort((a, b) => val(g, a) - val(g, b));
  const c = opts[0];
  if (lvl === 0) return R() < 0.6 ? opts[Math.floor(R() * opts.length)] : null;
  const isTrump = suit(c) === g.trump;
  // когда защитник берёт — отдаём мелочь (но не козыри, пока колода не кончилась)
  if (taking) {
    if (endgame) return c;
    if (isTrump) return null;
    return rank(c) - lowRank <= (lvl === 2 ? 6 : 5) ? c : null;
  }
  if (endgame) return isTrump && lvl === 2 && g.hands[p].length > 2 && g.hands[g.defender].length > 3 ? null : c;
  if (isTrump) return null;
  // не отдавать старшие простые карты в начале
  const lim = g.deck.length > 12 ? 4 : 7;
  return rank(c) - lowRank <= lim ? c : null;
}

function chooseDefense(g, lvl, R) {
  const p = g.defender;
  const hand = g.hands[p];
  const endgame = !g.deck.length;
  // перевод
  if (g.mode === 'perevodnoy') {
    const tr = hand.filter((c) => g.canTransfer(c));
    if (tr.length) {
      tr.sort((a, b) => val(g, a) - val(g, b));
      const c = tr[0];
      if (lvl === 0 && R() < 0.5) return { t: 'transfer', c };
      if (lvl >= 1 && (suit(c) !== g.trump || endgame || g.table.length >= 2)) return { t: 'transfer', c };
    }
  }
  const pd = planDefense(g, hand);
  if (!pd) return { t: 'take' };
  if (lvl === 0) {
    if (R() < 0.12) return { t: 'take' };
    // новичок бьёт не самой выгодной картой
    const und = g.table.findIndex((x) => x.d == null);
    const can = hand.filter((c) => beats(c, g.table[und].a, g.trump));
    return { t: 'defend', c: can[Math.floor(R() * can.length)], i: und };
  }
  // стоит ли отбиваться: в начале не тратить козыри на мелочь, если взять дёшево
  const trumpsUsed = pd.plan.filter((o) => suit(o.c) === g.trump);
  if (!endgame && trumpsUsed.length) {
    const tableCards = g.table.length + g.table.filter((x) => x.d != null).length;
    const lowJunk = g.table.every((x) => rank(x.a) - LOW[g.size] <= 3 && suit(x.a) !== g.trump);
    const highTrump = trumpsUsed.some((o) => rank(o.c) >= 12);
    if (lvl >= 1 && g.deck.length > 10 && lowJunk && tableCards <= 2 && (highTrump || trumpsUsed.length > 1) && hand.length <= 7) return { t: 'take' };
    if (lvl === 2 && g.deck.length > 6 && pd.cost > 45 && tableCards <= 3) return { t: 'take' };
  }
  return { t: 'defend', ...pd.plan[0] };
}

// ---------- конец партии на двоих: перебор с отсечением (все карты известны) ----------
function search(g, me, budget) {
  let nodes = 0;
  const memo = new Map();
  const key = (s) => s.hands.map((h) => [...h].sort((a, b) => a - b).join(',')).join('|') + '/' + s.table.map((x) => x.a + ':' + x.d).join(',') + '/' + s.attacker + s.defender + s.phase + s.passed.join('');
  // возвращает +1, если me не дурак, -1 если дурак, 0 ничья
  const evalOver = (s) => (s.durak === me ? -1 : s.durak < 0 ? 0 : 1);
  function rec(s, depth) {
    if (s.over) return evalOver(s);
    if (++nodes > budget || depth > 60) throw 0;
    const k = key(s);
    if (memo.has(k)) return memo.get(k);
    const actor = whoActs(s);
    const acts = s.actions(actor);
    let best = actor === me ? -2 : 2;
    for (const a of order(s, acts)) {
      const c = s.clone();
      if (!c.apply(actor, a)) continue;
      const v = rec(c, depth + 1);
      if (actor === me ? v > best : v < best) best = v;
      if ((actor === me && best === 1) || (actor !== me && best === -1)) break;
    }
    memo.set(k, best);
    return best;
  }
  function order(s, acts) {
    return [...acts].sort((a, b) => (a.c == null ? 50 : val(s, a.c)) - (b.c == null ? 50 : val(s, b.c)));
  }
  return { rec, nodes: () => nodes };
}

// чей сейчас ход (для перебора и для контроллера): сначала защитник, потом подкидывающие по порядку
export function whoActs(g) {
  if (!g.table.length) return g.attacker;
  if (g.phase === 'attack' && g.undefended()) {
    // защитник отвечает; подкидывающие могут вмешаться, но в переборе ход за защитником
    return g.defender;
  }
  const th = g.throwers();
  return th.length ? th[0] : g.defender;
}

function endgameMove(g, p) {
  if (g.n - g.places.length !== 2 || g.deck.length) return null;
  const total = g.hands.reduce((a, h) => a + h.length, 0) + g.table.length * 2;
  if (total > 16) return null;
  const S = search(g, p, 25000);
  const acts = g.actions(p);
  let best = null, bv = -2;
  try {
    for (const a of acts) {
      const c = g.clone();
      if (!c.apply(p, a)) continue;
      const v = S.rec(c, 0);
      if (v > bv) (bv = v), (best = a);
      if (bv === 1) break;
    }
  } catch (e) {
    return null;
  }
  return best;
}

// главный выбор действия бота p
export function botAction(g, p, lvl, R = Math.random) {
  if (g.over) return null;
  if (lvl === 2) {
    const e = endgameMove(g, p);
    if (e) return e;
  }
  if (p === g.defender) {
    if (g.phase !== 'attack' || !g.undefended()) return null;
    return chooseDefense(g, lvl, R);
  }
  if (!g.table.length) {
    if (p !== g.attacker) return null;
    const c = chooseAttack(g, p, lvl, R);
    return c != null ? { t: 'attack', c } : null;
  }
  if (g.passed[p]) return null;
  const c = chooseThrow(g, p, lvl, R);
  return c != null ? { t: 'attack', c } : { t: 'pass' };
}

// подсказка игроку: как поступил бы мастер
export function hintFor(g, p) {
  return botAction(g, p, 1, () => 0.5);
}
