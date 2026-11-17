// Раскладка цепочки на столе «змейкой»: от первой кости правый рукав идёт вправо и заворачивает к игроку,
// левый — влево и заворачивает от игрока. Дубли кладутся поперёк. Позиции уже лежащих костей не меняются.
import { TILES, isDouble } from './rules.js';

const G = 0.06; // зазор между костями
const ROW = 2.2; // шаг между рядами

// поза кости: центр (x, z), угол поворота вокруг вертикали
// у кости ось +z локально направлена от половинки a к половинке b
function pose(id, x, z, dx, dz, inner) {
  // dx,dz — направление от внутреннего конца к внешнему
  const [a] = TILES[id];
  const s = inner === a ? 1 : -1;
  return { x, z, rot: Math.atan2(dx * s, dz * s) };
}

export class Snake {
  constructor(xmax) {
    this.xmax = xmax;
    this.reset();
  }
  reset() {
    this.first = null;
    this.arms = { L: null, R: null };
  }
  // первая кость в центре
  placeFirst(id, l) {
    if (isDouble(id)) {
      this.first = { x: 0, z: 0, rot: 0 };
      this.arms.R = { x: 0.5 + G, z: 0, dir: 1, turn: 1, corner: false };
      this.arms.L = { x: -0.5 - G, z: 0, dir: -1, turn: -1, corner: false };
    } else {
      this.first = pose(id, 0, 0, 1, 0, l);
      this.arms.R = { x: 1 + G, z: 0, dir: 1, turn: 1, corner: false };
      this.arms.L = { x: -1 - G, z: 0, dir: -1, turn: -1, corner: false };
    }
    return this.first;
  }
  // следующая кость рукава (не меняет состояние, если peek)
  next(side, id, inner, peek = false) {
    const st = this.arms[side];
    const s = peek ? { ...st } : st;
    const dbl = isDouble(id);
    const ext = dbl && !s.corner ? 1 : 2;
    let p;
    if (s.dir * (s.x + s.dir * ext) > this.xmax + 1e-6) {
      // угол: кость встаёт вдоль стола, первая половинка — на уровне ряда
      const cx = s.x + s.dir * 0.5;
      p = pose(id, cx, s.z + s.turn * 0.5, 0, s.turn, inner);
      s.z += s.turn * ROW;
      s.dir = -s.dir;
      s.corner = true;
      // следующая кость ляжет первой половинкой под угловой
      s.x = cx - s.dir * 0.5;
      return p;
    }
    if (dbl && !s.corner) {
      p = { x: s.x + s.dir * 0.5, z: s.z, rot: 0 };
      s.x += s.dir * (1 + G);
    } else {
      p = pose(id, s.x + s.dir * 1, s.z, s.dir, 0, inner);
      s.x += s.dir * (2 + G);
    }
    s.corner = false;
    return p;
  }
}

// полный пересчёт раскладки по состоянию кона (для восстановления и для превью)
export function layoutRound(r, xmax) {
  const sn = new Snake(xmax);
  const out = [];
  if (!r.first) return { sn, out };
  out.push({ id: r.first.id, ...sn.placeFirst(r.first.id, r.first.l) });
  for (const e of r.left) out.push({ id: e.id, ...sn.next('L', e.id, e.i) });
  for (const e of r.right) out.push({ id: e.id, ...sn.next('R', e.id, e.i) });
  return { sn, out };
}
