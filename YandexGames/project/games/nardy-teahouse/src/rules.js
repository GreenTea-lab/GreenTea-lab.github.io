// Правила нард: длинные (long) и короткие (short, классический бэкгаммон).
// Позиция хранится в «дорожках» игроков: у каждого своя нумерация пунктов 0..23 по ходу движения
// (0 — старт/голова, 18..23 — дом, 24 — выброшена, -1 — бар в коротких нардах).
// Абсолютные пункты доски 0..23: 0..11 нижний ряд справа налево, 12..23 верхний ряд слева направо.

export const WHITE = 0;
export const BLACK = 1;

// абсолютный пункт по дорожке игрока
export function absOf(mode, p, t) {
  if (p === WHITE) return 23 - t;
  return mode === 'long' ? (35 - t) % 24 : t;
}
// тот же пункт в дорожке соперника
export const cross = (mode, t) => (mode === 'long' ? (t + 12) % 24 : 23 - t);

export function newGame(mode) {
  const s = { mode, n: [new Int8Array(24), new Int8Array(24)], bar: [0, 0], off: [0, 0], moved: [0, 0] };
  for (const p of [0, 1]) {
    if (mode === 'long') s.n[p][0] = 15;
    else {
      s.n[p][0] = 2;
      s.n[p][11] = 5;
      s.n[p][16] = 3;
      s.n[p][18] = 5;
    }
  }
  return s;
}

export function clone(s) {
  return { mode: s.mode, n: [s.n[0].slice(), s.n[1].slice()], bar: s.bar.slice(), off: s.off.slice(), moved: s.moved.slice() };
}

export function toJSON(s) {
  return { mode: s.mode, n: [Array.from(s.n[0]), Array.from(s.n[1])], bar: s.bar.slice(), off: s.off.slice(), moved: s.moved.slice() };
}
export function fromJSON(o) {
  return { mode: o.mode, n: [Int8Array.from(o.n[0]), Int8Array.from(o.n[1])], bar: o.bar.slice(), off: o.off.slice(), moved: (o.moved || [1, 1]).slice() };
}

export function key(s) {
  return s.n[0].join(',') + '|' + s.n[1].join(',') + '|' + s.bar.join(',') + '|' + s.off.join(',');
}

export function pips(s, p) {
  let r = s.bar[p] * 25;
  const n = s.n[p];
  for (let t = 0; t < 24; t++) r += n[t] * (24 - t);
  return r;
}

// сколько из голов можно снять за ход (длинные): 1, а на первом ходу при дублях 6, 4, 3 — 2
export function headLimit(s, p, dice) {
  if (s.mode !== 'long') return 99;
  if (!s.moved[p] && dice.length === 4 && [6, 4, 3].includes(dice[0])) return 2;
  return 1;
}

function allHome(s, p) {
  if (s.bar[p]) return false;
  const n = s.n[p];
  for (let t = 0; t < 18; t++) if (n[t]) return false;
  return true;
}

// длинные нарды: нельзя ставить заслон из 6 пунктов подряд, если впереди него нет ни одной шашки соперника
export function primeViolation(s, p) {
  if (s.mode !== 'long') return false;
  const q = 1 - p;
  const mine = s.n[p];
  const opp = s.n[q];
  // впереди: самая дальняя шашка соперника по его дорожке
  let far = -1;
  for (let t = 23; t >= 0; t--)
    if (opp[t]) {
      far = t;
      break;
    }
  if (s.off[q]) far = 24;
  let run = 0;
  for (let j = 0; j < 24; j++) {
    if (mine[(j + 12) % 24]) run++;
    else run = 0;
    if (run >= 6 && far <= j) return true;
  }
  return false;
}

// можно ли сходить шашкой с from на кубик d; возвращает пункт назначения или null
export function target(s, p, from, d, head) {
  const q = 1 - p;
  const mode = s.mode;
  if (from === -1) {
    if (!s.bar[p]) return null;
    const to = d - 1;
    if (s.n[q][cross(mode, to)] >= 2) return null;
    return to;
  }
  if (s.bar[p]) return null;
  if (!s.n[p][from]) return null;
  if (mode === 'long' && from === 0 && head <= 0) return null;
  const to = from + d;
  if (to < 24) {
    const o = s.n[q][cross(mode, to)];
    if (mode === 'long' ? o > 0 : o >= 2) return null;
    return to;
  }
  if (!allHome(s, p)) return null;
  if (to === 24) return 24;
  // больший кубик — только с самой дальней шашки
  for (let t = 18; t < from; t++) if (s.n[p][t]) return null;
  return 24;
}

// сделать шаг (без проверок); возвращает описание шага
export function apply(s, p, from, to, d) {
  const q = 1 - p;
  const st = { p, from, to, d, hit: false };
  if (from === -1) s.bar[p]--;
  else s.n[p][from]--;
  if (to >= 24) s.off[p]++;
  else {
    if (s.mode === 'short') {
      const c = cross(s.mode, to);
      if (s.n[q][c] === 1) {
        s.n[q][c] = 0;
        s.bar[q]++;
        st.hit = true;
      }
    }
    s.n[p][to]++;
  }
  return st;
}

export function undoStep(s, st) {
  const q = 1 - st.p;
  if (st.to >= 24) s.off[st.p]--;
  else {
    s.n[st.p][st.to]--;
    if (st.hit) {
      s.n[q][cross(s.mode, st.to)] = 1;
      s.bar[q]--;
    }
  }
  if (st.from === -1) s.bar[st.p]++;
  else s.n[st.p][st.from]++;
}

// все одиночные шаги (без учёта правила «использовать максимум кубиков»)
function rawSteps(s, p, dice, head) {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < dice.length; i++) {
    const d = dice[i];
    if (seen.has(d)) continue;
    seen.add(d);
    const froms = s.bar[p] ? [-1] : [];
    if (!s.bar[p]) for (let t = 0; t < 24; t++) if (s.n[p][t]) froms.push(t);
    for (const f of froms) {
      const to = target(s, p, f, d, head);
      if (to === null) continue;
      if (s.mode === 'long') {
        const st = apply(s, p, f, to, d);
        const bad = primeViolation(s, p);
        undoStep(s, st);
        if (bad) continue;
      }
      out.push({ from: f, to, d, i });
    }
  }
  return out;
}

const rest = (dice, i) => dice.slice(0, i).concat(dice.slice(i + 1));

// сколько кубиков можно использовать максимум из этой позиции
export function maxUse(s, p, dice, head, cap = dice.length, memo = new Map()) {
  if (!dice.length) return 0;
  const k = key(s) + '#' + dice.join('') + '#' + head;
  if (memo.has(k)) return memo.get(k);
  let best = 0;
  for (const m of rawSteps(s, p, dice, head)) {
    const st = apply(s, p, m.from, m.to, m.d);
    const r = 1 + maxUse(s, p, rest(dice, m.i), m.from === 0 ? head - 1 : head, cap - 1, memo);
    undoStep(s, st);
    if (r > best) best = r;
    if (best >= cap) break;
  }
  memo.set(k, best);
  return best;
}

// законные шаги сейчас (с учётом обязательного использования максимума кубиков и правила большего кубика)
// turn: { dice: [...оставшиеся], head, total, maxTotal, big }
export function legalSteps(s, p, turn) {
  const dice = turn.dice;
  if (!dice.length) return [];
  const need = maxUse(s, p, dice, turn.head);
  if (!need) return [];
  const memo = new Map();
  let res = [];
  for (const m of rawSteps(s, p, dice, turn.head)) {
    const st = apply(s, p, m.from, m.to, m.d);
    const r = 1 + maxUse(s, p, rest(dice, m.i), m.from === 0 ? turn.head - 1 : turn.head, need - 1, memo);
    undoStep(s, st);
    if (r >= need) res.push(m);
  }
  // если за ход можно сыграть лишь один кубик из двух разных — обязан больший (если он вообще играется)
  if (need === 1 && dice.length === 2 && dice[0] !== dice[1]) {
    const big = Math.max(dice[0], dice[1]);
    if (res.some((m) => m.d === big)) res = res.filter((m) => m.d === big);
  }
  return res;
}

export function startTurn(s, p, d1, d2) {
  const dice = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
  return { p, roll: [d1, d2], dice, head: headLimit(s, p, dice), steps: [] };
}

// сделать законный шаг в ходе
export function playStep(s, turn, m) {
  const st = apply(s, turn.p, m.from, m.to, m.d);
  st.i = m.i;
  turn.dice = rest(turn.dice, m.i);
  if (m.from === 0 && s.mode === 'long') turn.head--;
  turn.steps.push(st);
  return st;
}
export function undoTurnStep(s, turn) {
  const st = turn.steps.pop();
  if (!st) return null;
  undoStep(s, st);
  turn.dice.splice(Math.min(st.i, turn.dice.length), 0, st.d);
  if (st.from === 0 && s.mode === 'long') turn.head++;
  return st;
}
export function endTurn(s, turn) {
  if (turn.steps.length) s.moved[turn.p] = 1;
}

// все различные итоговые позиции хода (для бота): [{ steps, s }]
export function allTurns(s, p, dice, head) {
  const res = new Map();
  const visited = new Set();
  let maxN = 0;
  const path = [];
  const rec = (dice, head) => {
    const k = key(s) + '#' + dice.join('') + '#' + head;
    if (visited.has(k)) return;
    visited.add(k);
    const moves = rawSteps(s, p, dice, head);
    if (!moves.length) {
      const n = path.length;
      if (n < maxN) return;
      if (n > maxN) {
        maxN = n;
        res.clear();
      }
      const fk = key(s);
      const old = res.get(fk);
      // одна и та же позиция разными кубиками: для правила «большего кубика» храним вариант с большим
      if (!old || (n === 1 && path[0].d > old.steps[0].d)) res.set(fk, { steps: path.slice(), s: clone(s) });
      return;
    }
    for (const m of moves) {
      const st = apply(s, p, m.from, m.to, m.d);
      path.push({ from: m.from, to: m.to, d: m.d });
      rec(rest(dice, m.i), m.from === 0 ? head - 1 : head);
      path.pop();
      undoStep(s, st);
    }
  };
  rec(dice, head);
  let list = [...res.values()];
  if (maxN === 1 && dice.length === 2 && dice[0] !== dice[1]) {
    const big = Math.max(dice[0], dice[1]);
    if (list.some((x) => x.steps[0].d === big)) list = list.filter((x) => x.steps[0].d === big);
  }
  return list;
}

// итог партии: 0 — не окончена, иначе очки (1 — обычная, 2 — марс/гаммон, 3 — кокс/бэкгаммон)
export function result(s, p) {
  if (s.off[p] < 15) return 0;
  const q = 1 - p;
  if (s.off[q] > 0) return 1;
  if (s.mode === 'short') {
    if (s.bar[q]) return 3;
    // шашки проигравшего в доме победителя (его дорожка 0..5)
    for (let t = 0; t < 6; t++) if (s.n[q][t]) return 3;
    return 2;
  }
  return 2;
}

// фаза «гонки»: ни одна шашка больше не может упереться в шашку соперника
export function isRace(s) {
  if (s.bar[0] || s.bar[1]) return false;
  const m = s.mode;
  for (const p of [0, 1]) {
    let back = 24;
    for (let t = 0; t < 24; t++)
      if (s.n[p][t]) {
        back = t;
        break;
      }
    const q = 1 - p;
    for (let t = 0; t < 24; t++) if (s.n[q][t] && cross(m, t) > back) return false;
  }
  return true;
}
