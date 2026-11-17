// Бот: оценка позиции и выбор хода. Нужен для подсказки игроку и для подбора уровней (test/calib.mjs).
import { N, SHAPE, canPlace, wouldClear } from './core.js';

// оценка поля (больше — лучше); b — массив булевых
export function evalBoard(b) {
  let s = 0, empty = 0;
  for (let i = 0; i < N * N; i++) {
    if (b[i]) continue;
    empty++;
    const x = i % N, y = (i / N) | 0;
    // одиночная дырка, зажатая со всех сторон, — очень плохо
    let walls = 0;
    if (x === 0 || b[i - 1]) walls++;
    if (x === N - 1 || b[i + 1]) walls++;
    if (y === 0 || b[i - N]) walls++;
    if (y === N - 1 || b[i + N]) walls++;
    if (walls === 4) s -= 9;
    else if (walls === 3) s -= 2.5;
  }
  // «рваность» рядов и столбцов
  for (let y = 0; y < N; y++) for (let x = 0; x < N - 1; x++) if (b[y * N + x] !== b[y * N + x + 1]) s -= 0.55;
  for (let x = 0; x < N; x++) for (let y = 0; y < N - 1; y++) if (b[y * N + x] !== b[(y + 1) * N + x]) s -= 0.55;
  s += empty * 0.6;
  // есть ли место для больших фигур
  const fitsBox = (w, h) => {
    for (let y = 0; y <= N - h; y++) for (let x = 0; x <= N - w; x++) {
      let ok = true;
      for (let dy = 0; dy < h && ok; dy++) for (let dx = 0; dx < w && ok; dx++) if (b[(y + dy) * N + x + dx]) ok = false;
      if (ok) return true;
    }
    return false;
  };
  if (fitsBox(3, 3)) s += 6;
  if (fitsBox(5, 1)) s += 3;
  if (fitsBox(1, 5)) s += 3;
  return s;
}

function apply(b, items, sh, x, y, itemsWanted) {
  const nb = b.slice();
  const ni = items.slice();
  sh.cells.forEach(([dx, dy]) => (nb[(y + dy) * N + x + dx] = true));
  let lines = 0, got = 0;
  const kill = [];
  for (let r = 0; r < N; r++) { let f = true; for (let c = 0; c < N && f; c++) f = nb[r * N + c]; if (f) { lines++; for (let c = 0; c < N; c++) kill.push(r * N + c); } }
  for (let c = 0; c < N; c++) { let f = true; for (let r = 0; r < N && f; r++) f = nb[r * N + c]; if (f) { lines++; for (let r = 0; r < N; r++) kill.push(r * N + c); } }
  for (const i of kill) {
    if (ni[i] && itemsWanted) got++;
    nb[i] = false;
    ni[i] = false;
  }
  return { nb, ni, lines, got };
}

// лучший порядок и места для всего набора; возвращает список ходов [{slot,x,y}] (может быть короче, если не всё влезает)
export function planSet(game, opts = {}) {
  const items0 = game.board.map((c) => !!(c && c.it));
  const b0 = game.board.map((c) => !!c);
  const wanted = !!(game.level && game.level.goal.type === 'items');
  const slots = game.tray.map((t, i) => (t ? i : -1)).filter((i) => i >= 0);
  const beam = opts.beam || 4;
  const orders = perms(slots);
  let best = null;
  for (const ord of orders) {
    let states = [{ b: b0, it: items0, sc: 0, moves: [] }];
    for (const slot of ord) {
      const sh = SHAPE[game.tray[slot].s];
      const next = [];
      for (const st of states) {
        for (let y = 0; y <= N - sh.h; y++) for (let x = 0; x <= N - sh.w; x++) {
          let ok = true;
          for (const [dx, dy] of sh.cells) if (st.b[(y + dy) * N + x + dx]) { ok = false; break; }
          if (!ok) continue;
          const r = apply(st.b, st.it, sh, x, y, wanted);
          const sc = st.sc + r.lines * 7 + (r.lines > 1 ? r.lines * 4 : 0) + r.got * 6;
          next.push({ b: r.nb, it: r.ni, sc, moves: st.moves.concat([{ slot, x, y }]), e: sc + evalBoard(r.nb) });
        }
      }
      if (!next.length) break;
      next.sort((a, b) => b.e - a.e);
      states = next.slice(0, beam);
    }
    for (const st of states) {
      const v = st.moves.length * 1000 + st.sc + evalBoard(st.b);
      if (!best || v > best.v) best = { v, moves: st.moves };
    }
  }
  return best ? best.moves : [];
}

function perms(a) {
  if (a.length <= 1) return [a];
  const out = [];
  a.forEach((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).forEach((p) => out.push([x, ...p])));
  return out;
}

// подсказка: первый ход лучшего плана
export function hint(game) {
  const plan = planSet(game);
  return plan[0] || null;
}

// сыграть партию ботом (для калибровки); quality < 1 — «рассеянный» бот иногда ходит наугад
export function playOut(game, { maxMoves = 400, quality = 1, R = Math.random } = {}) {
  if (game.tray.every((t) => !t)) game.refill();
  while (game.moves < maxMoves) {
    if (game.won()) return { win: true, moves: game.moves, score: game.score };
    let plan = planSet(game, { beam: 3 });
    if (!plan.length) return { win: false, moves: game.moves, score: game.score };
    if (quality < 1 && R() > quality) {
      // случайный допустимый ход вместо лучшего
      const opts = [];
      game.tray.forEach((t, slot) => {
        if (!t) return;
        const sh = SHAPE[t.s];
        for (let y = 0; y <= N - sh.h; y++) for (let x = 0; x <= N - sh.w; x++) if (canPlace(game.board, sh, x, y)) opts.push({ slot, x, y });
      });
      if (opts.length) plan = [opts[(R() * opts.length) | 0]];
    }
    const m = plan[0];
    game.place(m.slot, m.x, m.y);
    if (game.won()) return { win: true, moves: game.moves, score: game.score };
    if (!game.canAny()) return { win: false, moves: game.moves, score: game.score };
  }
  return { win: game.won(), moves: game.moves, score: game.score };
}

export { wouldClear };
