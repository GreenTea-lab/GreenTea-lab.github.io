// Бот: перебирает все итоговые позиции хода и выбирает лучшую по оценке.
// Уровни: 0 — новичок (часто ошибается), 1 — любитель (небольшой шум), 2 — мастер (точная оценка + взгляд на ответ соперника).
import { allTurns, pips, isRace, cross, startTurn, clone } from './rules.js';

// вероятность попадания по одиночной шашке на расстоянии d (из 36)
const SHOT = [0, 11, 12, 14, 15, 15, 17, 6, 6, 5, 3, 2, 3, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1];
const HOME_PT = [3.6, 4.2, 3.2, 2.2, 1.4, 0.8]; // ценность занятого пункта дома: t=18 (шестёрка) … t=23 (единица)

function structShort(s, p, race) {
  const q = 1 - p;
  const n = s.n[p];
  const o = s.n[q];
  let v = 0;
  if (race) {
    // гонка: лишние шашки глубоко в доме — потерянные пункты
    for (let t = 18; t < 24; t++) if (n[t] > 3) v -= (n[t] - 3) * 0.3;
    return v;
  }
  // занятые пункты
  let run = 0;
  let best = 0;
  for (let t = 0; t < 24; t++) {
    if (n[t] >= 2) {
      if (t >= 18) v += HOME_PT[t - 18];
      else if (t === 17) v += 2.6;
      else if (t === 16) v += 1.5;
      else if (t === 4 || t === 5) v += 2.2;
      else if (t < 4) v += 1.2;
      else v += 0.9;
      run++;
      best = Math.max(best, run);
    } else run = 0;
    if (n[t] > 3) v -= (n[t] - 3) * 0.45;
  }
  v += best >= 3 ? best * best * 0.55 : 0;
  // соперник на баре против сильного дома
  if (s.bar[q]) {
    let home = 0;
    for (let t = 18; t < 24; t++) if (n[t] >= 2) home++;
    v += s.bar[q] * (4 + home * 1.4);
  }
  // одиночные шашки под боем
  // позиции соперника в моей дорожке: он движется к уменьшению
  const oppAt = [];
  for (let t = 0; t < 24; t++) if (o[t]) oppAt.push(cross(s.mode, t));
  if (s.bar[q]) oppAt.push(24);
  let danger = 0;
  for (let t = 0; t < 24; t++) {
    if (n[t] !== 1) continue;
    let miss = 1;
    for (const x of oppAt) {
      const d = x - t;
      if (d > 0 && d <= 24) miss *= 1 - SHOT[d] / 36;
    }
    const pr = 1 - miss;
    if (pr > 0) danger += pr * (t + 1 + 6) * (t >= 12 ? 1.1 : 0.8);
  }
  v -= danger * 0.9;
  return v;
}

function structLong(s, p, race) {
  const q = 1 - p;
  const n = s.n[p];
  const o = s.n[q];
  let v = 0;
  // голова: шашки нужно выводить
  const moved = 15 - n[0] - s.off[p];
  v -= Math.max(0, n[0] - 1) * (moved > 6 ? 1.6 : 0.9);
  if (race) {
    for (let t = 18; t < 24; t++) if (n[t] > 4) v -= (n[t] - 4) * 0.3;
    return v;
  }
  // самая дальняя (задняя) шашка соперника в моих координатах по его ходу
  // соперник в моих координатах движется по кругу; его дорожка tq ↔ мой пункт (tq+12)%24
  let oppBack = 24;
  for (let t = 0; t < 24; t++)
    if (o[t]) {
      oppBack = t;
      break;
    }
  // заслоны: подряд идущие мои пункты на пути соперника (впереди его задней шашки)
  let run = 0;
  for (let tq = 0; tq < 24; tq++) {
    const mine = n[(tq + 12) % 24] > 0;
    if (mine && tq > oppBack) {
      run++;
      v += 0.7 + run * run * 0.35;
    } else run = 0;
  }
  // занятые пункты (растяжка) и перегруз
  let pts = 0;
  for (let t = 1; t < 24; t++) {
    if (n[t]) pts++;
    if (n[t] > 4) v -= (n[t] - 4) * 0.5;
  }
  v += pts * 0.8;
  // пункты перед головой соперника (мои 13..17), пока у него много шашек на голове
  if (o[0] > 3) for (let t = 13; t <= 17; t++) if (n[t]) v += 0.9;
  // занятые пункты в своём доме (готовят выброс)
  for (let t = 18; t < 24; t++) if (n[t]) v += 0.4;
  return v;
}

export function evaluate(s, p) {
  const q = 1 - p;
  if (s.off[p] === 15) return 1000;
  const race = isRace(s);
  let v = (pips(s, q) - pips(s, p)) * 1.0;
  v += (s.off[p] - s.off[q]) * (race ? 1.5 : 0.5);
  if (s.mode === 'short') v += structShort(s, p, race) - structShort(s, q, race);
  else v += structLong(s, p, race) - structLong(s, q, race);
  return v;
}

function gauss(rnd) {
  return (rnd() + rnd() + rnd() + rnd() - 2) * 1.7;
}

// лучший ответ соперника (жадно) — для оценки «на ход вперёд»
function replyValue(s, p) {
  const q = 1 - p;
  let sum = 0;
  let w = 0;
  for (let a = 1; a <= 6; a++)
    for (let b = a; b <= 6; b++) {
      const t = startTurn(s, q, a, b);
      const list = allTurns(clone(s), q, t.dice, t.head);
      let best = -1e9;
      for (const x of list) best = Math.max(best, evaluate(x.s, q));
      if (!list.length) best = evaluate(s, q);
      const wt = a === b ? 1 : 2;
      sum += best * wt;
      w += wt;
    }
  return -sum / w;
}

// выбрать ход: возвращает список шагов [{from,to,d}]
export function choose(s, p, turn, level, rnd = Math.random) {
  const list = allTurns(clone(s), p, turn.dice, turn.head);
  if (!list.length) return [];
  if (list.length === 1) return list[0].steps;
  for (const x of list) x.v = evaluate(x.s, p);
  if (level === 0) {
    // новичок: треть ходов почти случайные, остальное — с большим шумом
    if (rnd() < 0.33) return list[Math.floor(rnd() * list.length)].steps;
    for (const x of list) x.v += gauss(rnd) * 9;
  } else if (level === 1) {
    for (const x of list) x.v += gauss(rnd) * 2.2;
  }
  list.sort((a, b) => b.v - a.v);
  if (level >= 2 && !isRace(s)) {
    // мастер: для лучших кандидатов смотрит ответ соперника
    const top = list.slice(0, s.mode === 'short' ? 4 : 3);
    for (const x of top) x.v2 = replyValue(x.s, p) + x.v * 0.25;
    top.sort((a, b) => b.v2 - a.v2);
    return top[0].steps;
  }
  return list[0].steps;
}
