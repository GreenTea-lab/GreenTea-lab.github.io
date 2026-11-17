// Правила домино: кости, раздача, ходы, подсчёт очков и боты. Чистая логика без графики
// (состояние — обычный объект, его можно сохранить в JSON и продолжить партию после перезагрузки).
//
// Режимы:
//  goat    — «Козёл»: 4 игрока, пары 0+2 против 1+3, все 28 костей розданы, базара нет.
//            Проигравшая пара записывает себе очки; пара, набравшая лимит, — «козлы».
//  classic — «Классика» с базаром: 2–4 игрока, каждый сам за себя, по 7 костей, остальное в базар.
//            Победитель кона получает очки соперников; кто первым набрал лимит — выиграл партию.

export const TILES = [];
for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) TILES.push([a, b]);
export const pips = (id) => TILES[id][0] + TILES[id][1];
export const isDouble = (id) => TILES[id][0] === TILES[id][1];
export const tileId = (a, b) => TILES.findIndex((t) => t[0] === Math.min(a, b) && t[1] === Math.max(a, b));
export const has = (id, v) => TILES[id][0] === v || TILES[id][1] === v;
export const other = (id, v) => (TILES[id][0] === v ? TILES[id][1] : TILES[id][0]);
export const handPips = (h) => h.reduce((s, id) => s + pips(id), 0);
export const team = (p) => p % 2;

export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
const sortHand = (h) => h.sort((x, y) => TILES[x][0] - TILES[y][0] || TILES[x][1] - TILES[y][1]);

// новый кон. starter — кто ходит первым (победитель прошлого кона), иначе по правилам первого кона
export function newRound({ mode, n, rand, starter = null }) {
  const deck = shuffle(TILES.map((_, i) => i), rand);
  const hands = [];
  for (let p = 0; p < n; p++) hands.push(sortHand(deck.splice(0, 7)));
  const r = {
    mode,
    n,
    hands,
    bone: mode === 'classic' ? deck : [],
    first: null,
    left: [],
    right: [],
    turn: 0,
    must: -1, // кость, которой обязан начать первый ход (-1 — любой)
    passes: 0,
    last: -1, // кто положил последнюю кость
    moves: 0,
    lacks: hands.map(() => [0, 0, 0, 0, 0, 0, 0]), // известно, что у игрока нет этой масти (пасовал / брал из базара)
    over: null,
  };
  if (starter !== null && starter >= 0) {
    r.turn = starter;
  } else if (mode === 'goat') {
    // первый кон «Козла» начинает тот, у кого «один-один»
    const id = tileId(1, 1);
    r.turn = hands.findIndex((h) => h.includes(id));
    r.must = id;
  } else {
    // классика: самый младший дубль, если дублей нет ни у кого — самая тяжёлая кость
    let best = null;
    for (let v = 0; v <= 6; v++) {
      const id = tileId(v, v);
      const p = hands.findIndex((h) => h.includes(id));
      if (p >= 0) {
        best = { p, id };
        break;
      }
    }
    if (!best) {
      let top = -1;
      hands.forEach((h, p) =>
        h.forEach((id) => {
          if (pips(id) > top) {
            top = pips(id);
            best = { p, id };
          }
        })
      );
    }
    r.turn = best.p;
    r.must = best.id;
  }
  return r;
}

export function ends(r) {
  if (!r.first) return null;
  const L = r.left.length ? r.left[r.left.length - 1].o : r.first.l;
  const R = r.right.length ? r.right[r.right.length - 1].o : r.first.r;
  return [L, R];
}

// все допустимые ходы игрока: [{ id, side: 'L' | 'R' }]
export function movesFor(r, p, hand = r.hands[p]) {
  const out = [];
  if (!r.first) {
    if (r.must >= 0) return hand.includes(r.must) ? [{ id: r.must, side: 'R' }] : [];
    for (const id of hand) out.push({ id, side: 'R' });
    return out;
  }
  const [L, R] = ends(r);
  for (const id of hand) {
    if (has(id, L)) out.push({ id, side: 'L' });
    if (has(id, R) && !(L === R && has(id, L))) out.push({ id, side: 'R' });
  }
  return out;
}
export const canMove = (r, p) => movesFor(r, p).length > 0;
// куда можно положить кость: ['L'], ['R'], ['L','R'] или [] (если обе стороны дают одно и то же — одна)
export function sidesFor(r, id) {
  if (!r.first) return ['R'];
  const [L, R] = ends(r);
  const s = [];
  if (has(id, L)) s.push('L');
  if (has(id, R)) s.push('R');
  return s;
}

export function play(r, p, id, side) {
  if (r.over || r.turn !== p) throw new Error('not your turn');
  const h = r.hands[p];
  const k = h.indexOf(id);
  if (k < 0) throw new Error('no tile');
  let entry;
  if (!r.first) {
    if (r.must >= 0 && id !== r.must) throw new Error('must start with ' + r.must);
    const [a, b] = TILES[id];
    r.first = { id, l: a, r: b };
    entry = { id, side: 'C' };
  } else {
    const [L, R] = ends(r);
    const v = side === 'L' ? L : R;
    if (!has(id, v)) throw new Error('does not fit');
    const e = { id, i: v, o: other(id, v) };
    (side === 'L' ? r.left : r.right).push(e);
    entry = { id, side, i: e.i, o: e.o };
  }
  h.splice(k, 1);
  r.passes = 0;
  r.last = p;
  r.moves++;
  r.must = -1;
  if (!h.length) {
    r.over = { out: p, fish: false };
  } else if (!r.bone.length && blocked(r)) {
    r.over = { out: -1, fish: true, by: p };
  } else {
    r.turn = (p + 1) % r.n;
  }
  return entry;
}

// «рыба»: базар пуст и никто не может пойти
export function blocked(r) {
  if (!r.first || r.bone.length) return false;
  for (let q = 0; q < r.n; q++) if (canMove(r, q)) return false;
  return true;
}

export function markLacks(r, p) {
  const e = ends(r);
  if (!e) return;
  r.lacks[p][e[0]] = 1;
  r.lacks[p][e[1]] = 1;
}

// взять кость из базара (только классика и только если нечем ходить)
export function draw(r, p) {
  if (r.over || r.turn !== p || !r.bone.length) throw new Error('cannot draw');
  if (canMove(r, p)) throw new Error('has a move');
  markLacks(r, p);
  const id = r.bone.pop();
  r.hands[p].push(id);
  sortHand(r.hands[p]);
  return id;
}

// пропуск хода (нечем ходить и базар пуст)
export function pass(r, p) {
  if (r.over || r.turn !== p) throw new Error('not your turn');
  if (canMove(r, p) || r.bone.length) throw new Error('cannot pass');
  markLacks(r, p);
  r.passes++;
  if (r.passes >= r.n) r.over = { out: -1, fish: true, by: r.last };
  else r.turn = (p + 1) % r.n;
}

// итог кона.
// goat:    { loser: пара, points, win: пара | -1 } — очки записываются проигравшей паре
// classic: { win: игрок | -1, points } — очки получает победитель
export function roundResult(r) {
  const o = r.over;
  const hp = r.hands.map(handPips);
  if (r.mode === 'goat') {
    const t = [hp[0] + hp[2], hp[1] + hp[3]];
    if (!o.fish) {
      const win = team(o.out);
      const loser = 1 - win;
      return { win, loser, points: t[loser], hp, teamPips: t, fish: false, out: o.out };
    }
    if (t[0] === t[1]) return { win: -1, loser: -1, points: 0, hp, teamPips: t, fish: true, by: o.by };
    const loser = t[0] > t[1] ? 0 : 1;
    return { win: 1 - loser, loser, points: t[0] + t[1], hp, teamPips: t, fish: true, by: o.by };
  }
  if (!o.fish) {
    const points = hp.reduce((s, v, q) => (q === o.out ? s : s + v), 0);
    return { win: o.out, points, hp, fish: false, out: o.out };
  }
  const min = Math.min(...hp);
  const who = hp.map((v, q) => (v === min ? q : -1)).filter((q) => q >= 0);
  if (who.length > 1) return { win: -1, points: 0, hp, fish: true, by: o.by };
  const points = hp.reduce((s, v, q) => (q === who[0] ? s : s + v), 0);
  return { win: who[0], points, hp, fish: true, by: o.by };
}

// ---------- партия (несколько конов до лимита очков) ----------
export function newMatch({ mode, n, target, diff, seed }) {
  return {
    mode,
    n: mode === 'goat' ? 4 : n,
    target,
    diff,
    seed: seed >>> 0,
    scores: mode === 'goat' ? [0, 0] : new Array(n).fill(0),
    rounds: [], // история конов для блокнота
    starter: null,
    k: 0,
    done: null, // { win: пара/игрок }
  };
}
export function matchRand(m) {
  return rng((m.seed + m.k * 7919) >>> 0);
}
export function startRound(m) {
  m.k++;
  return newRound({ mode: m.mode, n: m.n, rand: matchRand(m), starter: m.starter });
}
// записать итог кона в партию, вернуть итог
export function applyRound(m, r) {
  const res = roundResult(r);
  if (m.mode === 'goat') {
    if (res.loser >= 0) m.scores[res.loser] += res.points;
    m.rounds.push({ s: [...m.scores], add: res.loser >= 0 ? (res.loser === 0 ? [res.points, 0] : [0, res.points]) : [0, 0], fish: res.fish });
    m.starter = res.fish ? res.by : res.out;
    const lost = m.scores.findIndex((s) => s >= m.target);
    if (lost >= 0) m.done = { win: 1 - lost, lost };
  } else {
    if (res.win >= 0) m.scores[res.win] += res.points;
    const add = new Array(m.n).fill(0);
    if (res.win >= 0) add[res.win] = res.points;
    m.rounds.push({ s: [...m.scores], add, fish: res.fish });
    m.starter = res.win >= 0 ? res.win : res.by;
    const best = Math.max(...m.scores);
    if (best >= m.target) m.done = { win: m.scores.indexOf(best) };
  }
  return res;
}
// победил ли человек (место 0) в партии
export const humanWon = (m) => (m.mode === 'goat' ? m.done.win === 0 : m.done.win === 0);

// ---------- боты ----------
// level: 0 — новичок, 1 — любитель, 2 — мастер
export function botMove(r, p, level, rand = Math.random) {
  const moves = movesFor(r, p);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  if (level <= 0) {
    // новичок: чаще всего случайно, иногда сбрасывает тяжёлую
    if (rand() < 0.35) return moves.reduce((a, b) => (pips(b.id) > pips(a.id) ? b : a));
    return moves[Math.floor(rand() * moves.length)];
  }
  let best = null;
  let bestS = -Infinity;
  for (const m of moves) {
    const s = scoreMove(r, p, m, level) + rand() * (level === 1 ? 2.5 : 0.6);
    if (s > bestS) {
      bestS = s;
      best = m;
    }
  }
  return best;
}

// концы после хода
function endsAfter(r, m) {
  if (!r.first) return [TILES[m.id][0], TILES[m.id][1]];
  const [L, R] = ends(r);
  return m.side === 'L' ? [other(m.id, L), R] : [L, other(m.id, R)];
}

function scoreMove(r, p, m, level) {
  const hand = r.hands[p];
  const rest = hand.filter((x) => x !== m.id);
  const ne = endsAfter(r, m);
  let s = 0;
  // тяжёлые кости — в начале (за них записывают очки), дубли — пока не застряли
  s += pips(m.id) * 0.9;
  if (isDouble(m.id)) s += 4;
  // гибкость: сколько своих костей останется ходовыми
  const fit = rest.filter((x) => has(x, ne[0]) || has(x, ne[1])).length;
  s += fit * 2.2;
  if (!rest.length) return 1000;
  if (level < 2) return s;

  // мастер: считает кости и помнит, кто на чём пасовал
  const seen = new Set(hand);
  if (r.first) seen.add(r.first.id);
  r.left.forEach((e) => seen.add(e.id));
  r.right.forEach((e) => seen.add(e.id));
  seen.add(m.id);
  // сколько костей масти v ещё может быть у других
  const unknown = (v) => TILES.reduce((c, t, id) => c + (!seen.has(id) && (t[0] === v || t[1] === v) ? 1 : 0), 0);
  const nxt = (p + 1) % r.n;
  const opp = (q) => (r.mode === 'goat' ? team(q) !== team(p) : q !== p);
  const lackBoth = (q) => (r.lacks[q][ne[0]] || unknown(ne[0]) === 0) && (r.lacks[q][ne[1]] || unknown(ne[1]) === 0);
  const danger = Math.min(...r.hands.map((h, q) => (opp(q) ? h.length : 99)));
  const k = danger <= 2 ? 2 : 1;
  if (opp(nxt) && lackBoth(nxt)) s += 7 * k;
  if (r.mode === 'goat') {
    const mate = (p + 2) % 4;
    if (lackBoth(mate)) s -= 5;
    // напарнику удобно, если масть на концах та, на которую он ходил
  }
  // держать масть: концы, которых у меня много, а у других мало
  for (const v of ne) {
    const mine = rest.filter((x) => has(x, v)).length;
    if (mine >= 2 && unknown(v) <= 2) s += 3;
  }
  // «рыба» после хода: выгодна, только если наша сторона легче
  if (!r.bone.length) {
    const sim = JSON.parse(JSON.stringify(r));
    sim.turn = p;
    play(sim, p, m.id, m.side);
    if (sim.over && sim.over.fish) {
      const res = roundResult(sim);
      const mine = r.mode === 'goat' ? res.win === team(p) : res.win === p;
      s += mine ? 60 : -60;
    }
  }
  return s;
}
