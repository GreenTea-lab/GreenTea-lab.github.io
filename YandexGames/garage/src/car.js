// Процедурная 3D-машина. Кузов — гладкая поверхность, натянутая на поперечные сечения вдоль длины
// (профиль сбоку, ширина в плане, линия окон, завал крыши). Поверхность режется на детали: капот, крылья,
// двери, задние крылья, багажник, крыша, бамперы, стёкла; между деталями — тонкие зазоры, вокруг стёкол —
// резиновые уплотнители. Плюс колёса (шина, диск, тормоз), фары, решётка, номера, зеркала, ручки,
// дворники, салон (сиденья, руль, панель) и мотор под открывающимся капотом.
// Оси: x — вдоль машины (перед в +x), y — вверх, z — вправо. Пол — y = 0.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { paintMaterial } from './paint.js';
import { decalGeo, decalMat, rrect, circle, hull } from './decals.js';

const NX = 104; // сечений вдоль длины
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

// сглаженная ломаная (Catmull-Rom) по точкам [u, y], u растёт
function curve(pts) {
  return (u) => {
    if (u <= pts[0][0]) return pts[0][1];
    const n = pts.length;
    if (u >= pts[n - 1][0]) return pts[n - 1][1];
    let i = 0;
    while (i < n - 2 && u > pts[i + 1][0]) i++;
    const p0 = pts[Math.max(0, i - 1)],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[Math.min(n - 1, i + 2)];
    const t = (u - p1[0]) / (p2[0] - p1[0]);
    // монотонный кубический Эрмит с ограничением наклонов (без «перелётов»)
    const d = (a, b) => (b[1] - a[1]) / Math.max(1e-6, b[0] - a[0]);
    const s1 = d(p1, p2);
    let m1 = i === 0 ? s1 : (d(p0, p1) + s1) / 2,
      m2 = i + 2 >= n ? s1 : (s1 + d(p2, p3)) / 2;
    if (Math.sign(m1) !== Math.sign(s1) || s1 === 0) m1 = 0;
    if (Math.sign(m2) !== Math.sign(s1) || s1 === 0) m2 = 0;
    const lim = 3 * Math.abs(s1);
    m1 = clamp(m1, -lim, lim);
    m2 = clamp(m2, -lim, lim);
    const h = p2[0] - p1[0];
    const t2 = t * t,
      t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * h * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * h * m2;
  };
}

// ---------- форма кузова ----------
export class BodyShape {
  constructor(s) {
    this.s = s;
    this.L = s.L;
    this.top = curve(s.top);
    this.beltF = curve(typeof s.belt[0] === 'number' ? [[0, s.belt[0]], [1, s.belt[1]]] : s.belt);
    this.axF = s.axF * s.L;
    this.axR = s.axR * s.L;
    this.archR = s.wheel.R + (s.archGap ?? 0.06);
  }
  // полуширина в плане
  W(x) {
    const s = this.s;
    const u = x / this.L;
    const t = (u - 0.5) * 2;
    const p = t > 0 ? s.pF : s.pR;
    let w = s.W * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), p)), 1 / p);
    w *= 1 - (s.taperF || 0) * sstep(0.62, 1, u) - (s.taperR || 0) * sstep(0.38, 0, u);
    if (s.flare) for (const a of [this.axF, this.axR]) w += s.flare * Math.exp(-(((x - a) / 0.5) ** 2));
    return w;
  }
  T(x) {
    return this.top(x / this.L);
  }
  belt(x) {
    return this.beltF(x / this.L);
  }
  // нижняя кромка: порог, подъём к краям, арки колёс
  B(x) {
    const s = this.s;
    const u = x / this.L;
    let b = s.sill;
    b = lerp(b, s.botF ?? s.sill + 0.08, sstep(s.axF + 0.08, 1, u));
    b = lerp(b, s.botR ?? s.sill + 0.08, sstep(s.axR - 0.08, 0, u));
    return Math.min(b, this.T(x) - 0.14);
  }
  // точки правой половины сечения от низа по центру до верха по центру: [z, y, сегмент]
  // сегменты: 0 низ, 1 нижний угол, 2 борт, 3 стойки/окна, 4 угол крыши, 5 верх
  section(x) {
    const s = this.s;
    const W = this.W(x);
    const T = this.T(x);
    const B = this.B(x);
    const rb = Math.min(0.06, (T - B) * 0.2);
    const hoodR = s.hoodR ?? 0.1;
    const belt = Math.min(this.belt(x), T - hoodR * 0.6);
    const uh = Math.max(0, T - belt - hoodR);
    const g = sstep(0, 0.32, uh);
    const r = lerp(hoodR, s.roofR ?? 0.09, g) * clamp(W / 0.25, 0, 1);
    const crown = (s.crown ?? 0.03) * lerp(0.6, 1, g);
    const bulge = s.bulge ?? 0.035;
    const Wt = W * lerp(1 - bulge * 0.5, s.tumble ?? 0.8, g);
    const pts = [];
    const add = (z, y, seg, t = 0) => pts.push([Math.max(0, z), y, seg, t]);
    // 0: низ
    for (let i = 0; i < 3; i++) add(((W - rb) * i) / 3, B, 0);
    // 1: нижний угол
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + (i / 4) * (Math.PI / 2);
      add(W - rb + Math.cos(a) * rb, B + rb + Math.sin(a) * rb, 1);
    }
    // 2: борт с лёгкой выпуклостью
    const y0 = B + rb,
      y1 = Math.max(y0 + 0.001, belt);
    const yb = s.bulgeY ?? 0.55;
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const y = lerp(y0, y1, t);
      const k = (y - lerp(y0, y1, yb)) / ((y1 - y0) * 0.6 + 1e-6);
      add(W * (1 - bulge * Math.min(1, k * k)), y, 2);
    }
    // 3: окна/стойки — от линии окон к краю крыши с завалом внутрь
    const zb = W * (1 - bulge * Math.min(1, ((y1 - lerp(y0, y1, yb)) / ((y1 - y0) * 0.6 + 1e-6)) ** 2));
    const yTop = T - crown - r;
    for (let i = 0; i < 7; i++) {
      const t = i / 7;
      const y = lerp(y1, Math.max(y1, yTop), t);
      add(lerp(zb, Wt, Math.pow(t, 0.9)), y, 3, t);
    }
    // 4: угол крыши/капота
    const cy = Math.max(y1, yTop);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      add(Wt - r + Math.cos(a) * r, cy + Math.sin(a) * r, 4);
    }
    // 5: верх с «горбом»
    for (let i = 0; i <= 5; i++) {
      const z = (Wt - r) * (1 - i / 5);
      const k = z / Math.max(1e-6, Wt);
      add(z, cy + r + crown * (1 - k * k), 5);
    }
    return pts;
  }
  // полуширина на высоте y (борт), для расстановки фар и ручек
  zAt(x, y) {
    const p = this.section(x);
    for (let i = 3; i < p.length; i++) {
      if (p[i][1] >= y) {
        const a = p[i - 1],
          b = p[i];
        const t = (y - a[1]) / Math.max(1e-6, b[1] - a[1]);
        return lerp(a[0], b[0], clamp(t, 0, 1));
      }
    }
    return 0;
  }
  // точка на передней (side=1) или задней (-1) поверхности: где кузов при высоте y достигает |z|
  endPoint(y, z, side = 1) {
    const L = this.L;
    const zMax = this.zAt(side > 0 ? L * 0.6 : L * 0.4, y);
    if (Math.abs(z) > zMax - 0.01) z = Math.sign(z || 1) * Math.max(0, zMax - 0.01);
    let lo = side > 0 ? L * 0.6 : L * 0.4,
      hi = side > 0 ? L : 0;
    for (let k = 0; k < 30; k++) {
      const m = (lo + hi) / 2;
      if (this.zAt(m, y) >= Math.abs(z)) lo = m;
      else hi = m;
    }
    const x = lo;
    const d = 0.01;
    const x2 = (() => {
      let a = side > 0 ? L * 0.6 : L * 0.4,
        b = side > 0 ? L : 0;
      for (let k = 0; k < 30; k++) {
        const m = (a + b) / 2;
        if (this.zAt(m, y) >= Math.abs(z) + d) a = m;
        else b = m;
      }
      return a;
    })();
    // нормаль: от изменения x при сдвиге по z (по y считаем вертикальной)
    const n = new THREE.Vector3(side * d, 0, Math.sign(z || 1) * Math.abs(x - x2)).normalize();
    return { p: new THREE.Vector3(x, y, z), n };
  }
}

// ---------- сетка поверхности и разбивка на детали ----------
function buildGrid(shape) {
  const L = shape.L;
  const xs = [];
  for (let i = 0; i <= NX; i++) {
    const t = i / NX;
    const u = 0.55 * t + 0.45 * (0.5 - 0.5 * Math.cos(Math.PI * t));
    xs.push(u * L);
  }
  const P0 = shape.s.parts,
    G0 = shape.s.glass;
  const marks = [P0.hood, P0.df, P0.dr, P0.trunk, P0.bf, P0.br, G0.wsB, G0.wsT, G0.rwT, G0.rwB, G0.sf, G0.sr];
  for (const b of G0.bps || (G0.bp ? [G0.bp] : [])) marks.push(b - (G0.bpw ?? 0.012), b + (G0.bpw ?? 0.012));
  const used = new Set();
  for (const m of marks) {
    if (!(m > 0.005 && m < 0.995)) continue;
    let bi = -1,
      bd = 1e9;
    for (let i = 1; i < NX; i++) {
      if (used.has(i)) continue;
      const d = Math.abs(xs[i] / L - m);
      if (d < bd) (bd = d), (bi = i);
    }
    if (bi > 0) {
      xs[bi] = m * L;
      used.add(bi);
    }
  }
  xs.sort((a, b) => a - b);
  const rows = xs.map((x) => {
    const half = shape.section(x);
    // кольцо: низ-центр → правый борт → верх-центр → левый борт → низ-центр
    const ring = half.map(([z, y, seg, t]) => ({ x, y, z, seg, t, side: 1 }));
    for (let j = half.length - 2; j >= 0; j--) ring.push({ x, y: half[j][1], z: -half[j][0], seg: half[j][2], t: half[j][3], side: -1 });
    return ring;
  });
  const M = rows[0].length;
  // линия бампера: ближайшую к высоте бампера точку борта ставим ровно на неё
  const s0 = shape.s;
  if (s0.bumper !== 'bar') {
    // один и тот же индекс точки сечения для всей зоны бампера — шов идёт ровно по линии сетки
    const pick = (u0, hb) => {
      const i0 = xs.reduce((bi, x, i) => (Math.abs(x / L - u0) < Math.abs(xs[bi] / L - u0) ? i : bi), 0);
      const row = rows[i0];
      let best = -1,
        bd = 1e9;
      for (let j = 0; j < (M - 1) / 2; j++)
        if (row[j].seg === 2) {
          const d = Math.abs(row[j].y - hb);
          if (d < bd) (bd = d), (best = j);
        }
      return best;
    };
    const jF = pick(s0.parts.bf, s0.bumpH[1]),
      jR = pick(s0.parts.br, s0.bumpH[0]);
    rows.forEach((row, i) => {
      const u = xs[i] / L;
      const front = u >= s0.parts.bf - 1e-6,
        rear = u <= s0.parts.br + 1e-6;
      if (!front && !rear) return;
      const jb = front ? jF : jR;
      if (jb < 0) return;
      const hb = s0.bumpH[front ? 1 : 0];
      // подтягиваем точку к линии бампера, если она рядом (на самом носу сечение ниже — не трогаем)
      if (Math.abs(row[jb].y - hb) < 0.06) {
        row[jb].y = hb;
        row[M - 1 - jb].y = hb;
      }
      row.jb = jb;
    });
  }
  // арки колёс: точки борта внутри круга арки сдвигаем на окружность — край выреза получается ровным
  const R0 = shape.s.wheel.R;
  for (const row of rows)
    for (const v of row) {
      if (v.seg < 2 || v.seg > 3) continue;
      for (const a of [shape.axF, shape.axR]) {
        const dx = v.x - a,
          dy = v.y - R0;
        const d = Math.hypot(dx, dy);
        if (d < shape.archR) {
          const k = shape.archR / Math.max(1e-6, d);
          const ny = R0 + dy * k;
          // ниже порога не тянем — иначе под аркой торчат осколки
          if (ny < shape.B(v.x) + 0.04) continue;
          v.x = a + dx * k;
          v.y = ny;
          v.arch = true;
        }
      }
    }
  // нормали по сетке
  const P = (i, j) => rows[clamp(i, 0, NX)][clamp(j, 0, M - 1)];
  const nrm = rows.map((row, i) =>
    row.map((_, j) => {
      const a = P(i + 1, j),
        b = P(i - 1, j),
        c = P(i, j + 1),
        d = P(i, j - 1);
      const tx = new THREE.Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
      const tr = new THREE.Vector3(c.x - d.x, c.y - d.y, c.z - d.z);
      const n = new THREE.Vector3().crossVectors(tx, tr);
      if (n.lengthSq() < 1e-12) {
        // на торце — смотрим наружу вдоль оси
        n.set(i === 0 ? -1 : i === NX ? 1 : 0, 0, 0);
      }
      return n.normalize();
    }),
  );
  return { rows, nrm, M, xs };
}

// какой детали принадлежит ячейка (i, j)
function classify(shape, g, i, j) {
  const s = shape.s;
  const a = g.rows[i][j],
    b = g.rows[i + 1][j + 1];
  const x = (a.x + b.x) / 2,
    y = (a.y + b.y) / 2;
  const u = x / shape.L;
  const seg = Math.max(a.seg, g.rows[i][j + 1].seg);
  const side = (a.z + b.z) / 2 >= 0 ? 'R' : 'L';
  const segMin = Math.min(a.seg, g.rows[i][j + 1].seg);
  const P = s.parts;
  // вырез арки
  for (const ax of [shape.axF, shape.axR]) {
    const c = [g.rows[i][j], g.rows[i + 1][j], g.rows[i][j + 1], g.rows[i + 1][j + 1]];
    const cx = c.reduce((q, v) => q + v.x, 0) / 4,
      cy = c.reduce((q, v) => q + v.y, 0) / 4;
    if (Math.hypot(cx - ax, cy - s.wheel.R) < shape.archR - 0.003) {
      if (seg >= 1 && segMin >= 1) return null;
      const cz = Math.abs(c.reduce((q, v) => q + v.z, 0) / 4);
      if (cz > s.W - s.wheel.w - 0.12) return null;
    }
  }
  if (segMin === 0 && seg <= 1) return 'under';
  // бамперы из кузова (современные)
  if (s.bumper !== 'bar') {
    const jb = g.rows[i + 1].jb ?? g.rows[i].jb;
    if (jb !== undefined && (u > P.bf || u < P.br)) {
      const below = j < jb || j >= g.M - 1 - jb;
      if (below) return u > P.bf ? 'bumperF' : 'bumperR';
    }
  }
  if (seg <= 2) {
    if (u > P.df) return 'fender' + side;
    if (u < P.dr) return 'quarter' + side;
    return 'door' + side;
  }
  const T = shape.T(x);
  if (seg === 3) {
    // окна: полоса между поясом и крышей, без стоек
    const hb = shape.belt(x),
      span = T - hb;
    const ta = a.seg === 3 ? a.t : 1,
      tb = g.rows[i][j + 1].seg === 3 ? g.rows[i][j + 1].t : 1;
    const f = (ta + tb) / 2;
    const G = s.glass;
    const bps = G.bps || (G.bp ? [G.bp] : []);
    const inX = u > G.sr && u < G.sf && !bps.some((b) => Math.abs(u - b) < (G.bpw ?? 0.012));
    if (inX && span > 0.16 && f > 0.1 && f < 0.9 && seg === 3 && segMin === 3) return 'glass' + side;
    if (u > P.hood) return 'fender' + side;
    if (u < P.trunk) return 'quarter' + side;
    return 'roof';
  }
  // верх и угол крыши
  const G = s.glass;
  if (u > P.hood) return 'hood';
  if (u > G.wsT && u < G.wsB) {
    // лобовое: центр и часть угла, края угла — стойки
    if (seg === 5 || (seg === 4 && Math.max(Math.abs(a.z), Math.abs(b.z)) < shape.W(x) * (s.tumble ?? 0.8) - (s.aPillar ?? 0.035))) return 'glassF';
    return 'roof';
  }
  if (u < G.rwT && u > G.rwB) {
    if (seg === 5 || (seg === 4 && Math.max(Math.abs(a.z), Math.abs(b.z)) < shape.W(x) * (s.tumble ?? 0.8) - 0.08)) return 'glassR';
    return u < P.trunk ? 'trunk' : 'roof';
  }
  if (u < P.trunk) return 'trunk';
  return 'roof';
}

const PAINTED = ['hood', 'trunk', 'roof', 'doorL', 'doorR', 'fenderL', 'fenderR', 'quarterL', 'quarterR', 'bumperF', 'bumperR'];
export const PANELS = PAINTED;

function bucketsFrom(shape, g) {
  const B = {};
  const cls = [];
  for (let i = 0; i < NX; i++) {
    cls.push([]);
    for (let j = 0; j < g.M - 1; j++) {
      const c = classify(shape, g, i, j);
      cls[i].push(c);
      if (!c) continue;
      const q = (B[c] = B[c] || { p: [], n: [], uv: [] });
      const V = (ii, jj) => {
        const r = g.rows[ii][jj],
          n = g.nrm[ii][jj];
        q.p.push(r.x, r.y, r.z);
        q.n.push(n.x, n.y, n.z);
        q.uv.push(r.x / shape.L, jj / (g.M - 1));
      };
      // ориентация: наружу
      V(i, j);
      V(i + 1, j);
      V(i, j + 1);
      V(i, j + 1);
      V(i + 1, j);
      V(i + 1, j + 1);
    }
  }
  const geos = {};
  for (const k in B) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(B[k].p, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(B[k].n, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(B[k].uv, 2));
    // проверка ориентации: если нормаль смотрит против обхода — разворачиваем треугольники
    geos[k] = geo;
  }
  return { geos, cls };
}

// ленты по границам деталей: зазоры (тёмные) и уплотнители стёкол (чёрные)
function seams(shape, g, cls) {
  const gap = [],
    seal = [];
  const push = (arr, A, B, nA, nB, w, off) => {
    const d = new THREE.Vector3(B.x - A.x, B.y - A.y, B.z - A.z);
    const n = new THREE.Vector3().addVectors(nA, nB).normalize();
    const c = new THREE.Vector3().crossVectors(n, d).normalize().multiplyScalar(w / 2);
    const o = n.clone().multiplyScalar(off);
    const a1 = new THREE.Vector3(A.x, A.y, A.z).add(o).add(c),
      a2 = new THREE.Vector3(A.x, A.y, A.z).add(o).sub(c),
      b1 = new THREE.Vector3(B.x, B.y, B.z).add(o).add(c),
      b2 = new THREE.Vector3(B.x, B.y, B.z).add(o).sub(c);
    for (const v of [a1, b1, a2, a2, b1, b2]) arr.push(v.x, v.y, v.z);
  };
  const isG = (c) => c && c.startsWith('glass');
  const kind = (c1, c2) => {
    if (!c1 || !c2 || c1 === c2 || c1 === 'under' || c2 === 'under') return null;
    if (isG(c1) !== isG(c2)) return 'seal';
    if (isG(c1) && isG(c2)) return null;
    // крыша со стойками неразрывна с задними крыльями у седанов — оставим шов
    return 'gap';
  };
  for (let i = 0; i < NX; i++)
    for (let j = 0; j < g.M - 1; j++) {
      const c = cls[i][j];
      // граница с соседом по x (вертикальная линия сетки i+1)
      if (i + 1 < NX) {
        const k = kind(c, cls[i + 1][j]);
        if (k) push(k === 'gap' ? gap : seal, g.rows[i + 1][j], g.rows[i + 1][j + 1], g.nrm[i + 1][j], g.nrm[i + 1][j + 1], k === 'gap' ? 0.0055 : 0.022, 0.0015);
      }
      // граница с соседом по кольцу (линия j+1)
      if (j + 1 < g.M - 1) {
        const k = kind(c, cls[i][j + 1]);
        if (k) push(k === 'gap' ? gap : seal, g.rows[i][j + 1], g.rows[i + 1][j + 1], g.nrm[i][j + 1], g.nrm[i + 1][j + 1], k === 'gap' ? 0.0055 : 0.022, 0.0015);
      }
    }
  const mk = (arr) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    geo.computeVertexNormals();
    return geo;
  };
  return { gap: mk(gap), seal: mk(seal) };
}

// ---------- общие материалы ----------
const M = {};
export function shared() {
  if (M.rubber) return M;
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.86, metalness: 0 });
  M.tread = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.95, metalness: 0 });
  M.black = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.7, metalness: 0 });
  M.under = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.9, metalness: 0.1, side: THREE.DoubleSide });
  M.gap = new THREE.MeshBasicMaterial({ color: 0x161618, side: THREE.DoubleSide });
  M.seal = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.55, side: THREE.DoubleSide });
  M.chrome = new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.08, metalness: 1 });
  M.alloy = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.22, metalness: 1 });
  M.darkMetal = new THREE.MeshStandardMaterial({ color: 0x55585e, roughness: 0.45, metalness: 1 });
  M.disc = new THREE.MeshStandardMaterial({ color: 0x8a8c90, roughness: 0.35, metalness: 1 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0x1a2630, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.42, side: THREE.DoubleSide, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false });
  M.lens = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.25, clearcoat: 1, depthWrite: false });
  M.reflector = new THREE.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.12, metalness: 1, emissive: 0x000000 });
  M.tail = new THREE.MeshPhysicalMaterial({ color: 0xb0101a, roughness: 0.15, metalness: 0, emissive: 0x3a0004, clearcoat: 1, transparent: true, opacity: 0.92 });
  M.amber = new THREE.MeshPhysicalMaterial({ color: 0xff9a1a, roughness: 0.15, emissive: 0x3a1800, clearcoat: 1 });
  M.plate = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, map: plateTex() });
  M.engine = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.55, metalness: 0.7 });
  M.hose = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.6 });
  M.battery = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.5 });
  M.redT = new THREE.MeshStandardMaterial({ color: 0xd02020, roughness: 0.4 });
  M.radiator = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.6, metalness: 0.6 });
  return M;
}

function plateTex() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 56;
  const x = c.getContext('2d');
  x.fillStyle = '#f4f4f0';
  x.fillRect(0, 0, 256, 56);
  x.strokeStyle = '#111';
  x.lineWidth = 4;
  x.strokeRect(3, 3, 250, 50);
  x.beginPath();
  x.moveTo(196, 4);
  x.lineTo(196, 52);
  x.stroke();
  x.fillStyle = '#111';
  x.font = 'bold 38px Arial, sans-serif';
  x.textBaseline = 'middle';
  x.fillText('A 777 OK', 14, 30);
  x.font = 'bold 22px Arial, sans-serif';
  x.fillText('99', 210, 24);
  x.font = 'bold 11px Arial, sans-serif';
  x.fillText('GRG', 210, 44);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}


// ---------- колесо ----------
const RIM_CACHE = {};
export function wheelGeo(R, w, rimR, style) {
  const key = [R, w, rimR, style].map((v) => (typeof v === 'number' ? v.toFixed(3) : v)).join('|');
  if (RIM_CACHE[key]) return RIM_CACHE[key];
  // шина: профиль вращения (радиус, смещение по оси)
  const hw = w / 2;
  const sh = R - rimR;
  const prof = [];
  const P = (r, y) => prof.push(new THREE.Vector2(r, y));
  P(rimR - 0.005, -hw * 0.86);
  P(rimR + sh * 0.25, -hw * 0.98);
  P(rimR + sh * 0.6, -hw * 1.02);
  P(R - sh * 0.18, -hw * 0.98);
  P(R - 0.01, -hw * 0.86);
  P(R, -hw * 0.7);
  // канавки протектора
  for (const [y0, y1] of [[-0.5, -0.38], [-0.12, 0.0], [0.26, 0.38]]) {
    P(R, hw * y0);
    P(R - 0.008, hw * y0 + 0.002);
    P(R - 0.008, hw * y1 - 0.002);
    P(R, hw * y1);
  }
  P(R, hw * 0.7);
  P(R - 0.01, hw * 0.86);
  P(R - sh * 0.18, hw * 0.98);
  P(rimR + sh * 0.6, hw * 1.02);
  P(rimR + sh * 0.25, hw * 0.98);
  P(rimR - 0.005, hw * 0.86);
  const tire = new THREE.LatheGeometry(prof, 40);
  tire.rotateX(Math.PI / 2); // ось вдоль z
  // диск: лицевая часть с окнами + обод
  const face = new THREE.Shape();
  face.absarc(0, 0, rimR * 0.97, 0, Math.PI * 2, false);
  const holes = [];
  const hole = (fn) => {
    const h = new THREE.Path();
    fn(h);
    face.holes.push(h);
  };
  const win = (n, r0, r1, a0) => {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      hole((h) => {
        const da = (Math.PI / n) * a0;
        h.moveTo(Math.cos(a - da * 0.55) * r0, Math.sin(a - da * 0.55) * r0);
        h.lineTo(Math.cos(a - da) * r1, Math.sin(a - da) * r1);
        h.absarc(0, 0, r1, a - da, a + da, false);
        h.lineTo(Math.cos(a + da * 0.55) * r0, Math.sin(a + da * 0.55) * r0);
        h.absarc(0, 0, r0, a + da * 0.55, a - da * 0.55, true);
      });
    }
  };
  if (style === 'steel') {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      hole((h) => h.absarc(Math.cos(a) * rimR * 0.62, Math.sin(a) * rimR * 0.62, rimR * 0.1, 0, Math.PI * 2, true));
    }
  } else if (style === 'spoke5') win(5, rimR * 0.36, rimR * 0.86, 0.62);
  else if (style === 'multi') win(10, rimR * 0.38, rimR * 0.88, 0.5);
  else if (style === 'star') win(6, rimR * 0.3, rimR * 0.84, 0.72);
  else if (style === 'turbine') win(14, rimR * 0.45, rimR * 0.88, 0.45);
  else if (style === 'deep') win(5, rimR * 0.3, rimR * 0.72, 0.7);
  const dish = style === 'deep' ? hw * 0.75 : style === 'steel' ? hw * 0.25 : hw * 0.4;
  const faceG = new THREE.ExtrudeGeometry(face, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 1, curveSegments: 14 });
  faceG.translate(0, 0, hw * 0.85 - dish - 0.02);
  // обод (бочка) и закраина
  const barrel = new THREE.CylinderGeometry(rimR, rimR, w * 0.9, 32, 1, true);
  barrel.rotateX(Math.PI / 2);
  const lip = new THREE.TorusGeometry(rimR, 0.012, 8, 48);
  lip.translate(0, 0, hw * 0.86);
  const inner = new THREE.CircleGeometry(rimR, 32);
  inner.translate(0, 0, -hw * 0.6);
  // ступица и гайки
  const hub = new THREE.CylinderGeometry(rimR * 0.2, rimR * 0.24, 0.04, 20);
  hub.rotateX(Math.PI / 2);
  hub.translate(0, 0, hw * 0.85 - dish + 0.01);
  const nuts = [];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    const n = new THREE.CylinderGeometry(0.011, 0.011, 0.03, 6);
    n.rotateX(Math.PI / 2);
    n.translate(Math.cos(a) * rimR * 0.3, Math.sin(a) * rimR * 0.3, hw * 0.85 - dish + 0.015);
    nuts.push(n);
  }
  let cap = null;
  if (style === 'steel') {
    cap = new THREE.SphereGeometry(rimR * 0.42, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2.6);
    cap.rotateX(Math.PI / 2);
    cap.translate(0, 0, hw * 0.85 - dish - rimR * 0.2);
  }
  // тормоз: диск и суппорт
  const disc = new THREE.CylinderGeometry(rimR * 0.78, rimR * 0.78, 0.022, 32);
  disc.rotateX(Math.PI / 2);
  disc.translate(0, 0, -hw * 0.05);
  const cal = new RoundedBoxGeometry(rimR * 0.34, rimR * 0.5, 0.06, 2, 0.01);
  cal.translate(-rimR * 0.62, rimR * 0.16, hw * 0.05);
  const r = {
    tire,
    face: mergeGeometries([faceG, hub, ...nuts, ...(cap ? [cap] : [])].map((g) => (g.index ? g.toNonIndexed() : g)).map(stripUv)),
    barrel: mergeGeometries([barrel, lip, inner].map((g) => (g.index ? g.toNonIndexed() : g)).map(stripUv)),
    disc,
    cal,
  };
  RIM_CACHE[key] = r;
  return r;
}
function stripUv(g) {
  if (g.attributes.uv) g.deleteAttribute('uv');
  if (g.attributes.uv1) g.deleteAttribute('uv1');
  return g;
}

export const RIM_STYLES = ['steel', 'spoke5', 'multi', 'star', 'turbine', 'deep'];

export function makeWheel(spec, look, side) {
  const S = shared();
  const R = look.wheelR ?? spec.wheel.R;
  const w = look.wheelW ?? spec.wheel.w;
  const rimR = R * (look.rimK ?? spec.wheel.rimK ?? 0.6);
  const style = look.rim ?? spec.wheel.rim ?? 'steel';
  const G = wheelGeo(R, w, rimR, style);
  const g = new THREE.Group();
  const spin = new THREE.Group();
  const rimMat = style === 'steel' ? (look.rimColor === 'black' ? S.black : S.darkMetal) : look.rimColor === 'black' ? new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.3, metalness: 0.8 }) : look.rimColor === 'gold' ? new THREE.MeshStandardMaterial({ color: 0xd8b060, roughness: 0.22, metalness: 1 }) : S.alloy;
  const tire = new THREE.Mesh(G.tire, S.rubber);
  const face = new THREE.Mesh(G.face, rimMat);
  const barrel = new THREE.Mesh(G.barrel, S.darkMetal);
  [tire, face, barrel].forEach((m) => (m.castShadow = true));
  spin.add(tire, face, barrel);
  const disc = new THREE.Mesh(G.disc, S.disc);
  const cal = new THREE.Mesh(G.cal, look.caliper ? new THREE.MeshStandardMaterial({ color: look.caliper, roughness: 0.35, metalness: 0.2 }) : S.darkMetal);
  g.add(spin, disc, cal);
  if (side < 0) g.scale.z = -1;
  g.userData = { spin, tire, face, R };
  return g;
}

// ---------- фары, решётка, номер ----------
function roundLamp(r, depth, lensMat) {
  const S = shared();
  const g = new THREE.Group();
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.12, 10, 32), S.chrome);
  const refl = new THREE.Mesh(new THREE.SphereGeometry(r * 0.98, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), S.reflector);
  refl.rotation.x = -Math.PI / 2;
  refl.position.z = -depth * 0.2;
  refl.scale.set(1, 1, -0.6);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4d0, emissiveIntensity: 0.4 }));
  bulb.position.z = -depth * 0.1;
  const lens = new THREE.Mesh(new THREE.SphereGeometry(r * 1.0, 24, 8, 0, Math.PI * 2, 0, Math.PI / 5), lensMat || S.lens);
  lens.rotation.x = Math.PI / 2;
  lens.position.z = -r * 0.81;
  g.add(refl, bulb, lens, bezel);
  g.userData.bulb = bulb;
  return g;
}
function rectLamp(w, h, r, mat, back) {
  const S = shared();
  const g = new THREE.Group();
  const housing = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.05, 3, Math.min(r, h / 2 - 0.001)), back || S.black);
  housing.position.z = -0.02;
  g.add(housing);
  if (!mat) {
    // фара: отражатель + 1-2 линзы + стекло
    const refl = new THREE.Mesh(new RoundedBoxGeometry(w * 0.94, h * 0.84, 0.02, 2, Math.min(r * 0.8, h * 0.4)), S.reflector);
    refl.position.z = 0.008;
    g.add(refl);
    const n = w > h * 2.4 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const lr = Math.min(h * 0.32, w / (n * 2.6));
      const lens = new THREE.Mesh(new THREE.SphereGeometry(lr, 18, 10), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0.1, clearcoat: 1, emissive: 0xfff6dd, emissiveIntensity: 0.25 }));
      lens.scale.z = 0.4;
      lens.position.set((k - (n - 1) / 2) * w * 0.42 + (n === 1 ? -w * 0.1 : 0), 0, 0.02);
      g.add(lens);
    }
    const glass = new THREE.Mesh(new RoundedBoxGeometry(w * 1.0, h * 0.98, 0.02, 2, Math.min(r, h / 2 - 0.001)), S.lens);
    glass.position.z = 0.025;
    g.add(glass);
  } else {
    const lens = new THREE.Mesh(new RoundedBoxGeometry(w * 0.96, h * 0.9, 0.03, 2, Math.min(r * 0.9, h * 0.44)), mat);
    lens.position.z = 0.012;
    g.add(lens);
    // секции фонаря
    const bars = Math.max(1, Math.round(w / h));
    for (let k = 1; k < bars; k++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.006, h * 0.86, 0.034), S.black);
      b.position.set(-w / 2 + (k * w) / bars, 0, 0.014);
      g.add(b);
    }
  }
  return g;
}
function grille(w, h, style) {
  const S = shared();
  const g = new THREE.Group();
  const back = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.03, 2, Math.min(0.02, h / 3)), S.black);
  g.add(back);
  const mat = style === 'chrome' ? S.chrome : new THREE.MeshStandardMaterial({ color: 0x202024, roughness: 0.45, metalness: 0.4 });
  if (style === 'mesh') {
    for (let i = 0; i < 9; i++)
      for (let j = 0; j < 3; j++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(w / 11, h / 5, 0.012), mat);
        c.position.set(-w / 2 + ((i + 0.5 + (j % 2) * 0.5) * w) / 9.5, -h / 2 + ((j + 0.5) * h) / 3, 0.018);
        c.rotation.z = Math.PI / 4;
        c.scale.set(0.5, 0.5, 1);
        g.add(c);
      }
  } else {
    const n = Math.max(2, Math.round(h / 0.035));
    for (let k = 0; k < n; k++) {
      const b = new THREE.Mesh(new RoundedBoxGeometry(w * 0.96, (h / n) * 0.45, 0.02, 2, 0.004), mat);
      b.position.set(0, -h / 2 + ((k + 0.5) * h) / n, 0.02);
      g.add(b);
    }
  }
  if (style === 'chrome') {
    // рамка из четырёх скруглённых планок
    const t = 0.016;
    for (const [bw, bh, x, y] of [[w + t, t, 0, h / 2], [w + t, t, 0, -h / 2], [t, h, w / 2, 0], [t, h, -w / 2, 0]]) {
      const b = new THREE.Mesh(new RoundedBoxGeometry(bw, bh, 0.02, 2, 0.006), S.chrome);
      b.position.set(x, y, 0.022);
      g.add(b);
    }
  }
  return g;
}

// разместить объект на поверхности с ориентацией по нормали (лицо объекта — +z локально)
function placeOn(obj, p, n) {
  obj.position.copy(p);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n.clone().normalize());
  obj.quaternion.copy(q);
  return obj;
}

// ---------- салон ----------
function interior(shape, spec, look) {
  const S = shared();
  const s = spec;
  const g = new THREE.Group();
  const col = look.interior ?? s.interior ?? 0x3a3a40;
  const fab = new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 });
  const dash = new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.75 });
  const G = s.glass;
  const xWs = G.wsB * shape.L;
  const floorY = s.sill + 0.12;
  const beltY = shape.belt(xWs - 0.3);
  const W = shape.W(shape.L * 0.5);
  // панель приборов
  const d = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.22, W * 1.8, 3, 0.05), dash);
  d.position.set(xWs - 0.28, beltY - 0.06, 0);
  g.add(d);
  // руль (левый руль: водитель слева, z < 0)
  const zDrv = -W * 0.45;
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 8, 28), new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.5 }));
  wheel.add(rim);
  const sp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.02), rim.material);
  wheel.add(sp);
  const hubc = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 14), rim.material);
  hubc.rotation.x = Math.PI / 2;
  wheel.add(hubc);
  wheel.rotation.y = Math.PI / 2;
  wheel.rotation.x = 0;
  wheel.rotateOnAxis(new THREE.Vector3(1, 0, 0), 0);
  wheel.position.set(xWs - 0.52, beltY - 0.02, zDrv);
  wheel.rotation.z = 0.45;
  g.add(wheel);
  // сиденья
  const seat = (x, z, wd) => {
    const sg = new THREE.Group();
    const base = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.14, wd, 2, 0.05), fab);
    base.position.set(0, 0.07, 0);
    const back = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.58, wd, 2, 0.05), fab);
    back.position.set(-0.24, 0.36, 0);
    back.rotation.z = 0.18;
    sg.add(base, back);
    if (wd < 0.7) {
      const head = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.18, wd * 0.6, 2, 0.04), fab);
      head.position.set(-0.32, 0.74, 0);
      head.rotation.z = 0.18;
      sg.add(head);
    }
    const head = shape.T(x) - (floorY + 0.12);
    sg.scale.y = clamp((head - 0.12) / 0.86, 0.55, 1);
    sg.position.set(x, floorY + 0.12, z);
    sg.traverse((o) => o.isMesh && (o.castShadow = true));
    return sg;
  };
  const xF = xWs - 0.95;
  g.add(seat(xF, zDrv, 0.48), seat(xF, -zDrv, 0.48));
  if (s.seats !== 2) g.add(seat(xF - 0.85, 0, W * 1.5));
  // пол
  const fl = new THREE.Mesh(new THREE.BoxGeometry(shape.L * 0.5, 0.02, W * 1.9), dash);
  fl.position.set(shape.L * 0.47, floorY, 0);
  g.add(fl);
  return g;
}

// ---------- мотор ----------
function engine(shape, spec, look) {
  const S = shared();
  const g = new THREE.Group();
  const xc = (spec.parts.hood + 1) * 0.5 * shape.L - 0.05;
  const yTop = shape.T(xc) - 0.12;
  const yBot = spec.sill + 0.12;
  const h = Math.max(0.2, (yTop - yBot) * 0.78);
  const block = new THREE.Mesh(new RoundedBoxGeometry(0.46, h, 0.5, 3, 0.04), S.engine);
  block.position.set(xc - 0.05, yBot + h / 2, 0);
  const cover = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.08, 0.32, 3, 0.03), new THREE.MeshStandardMaterial({ color: look.engineColor ?? 0x9a1a1a, roughness: 0.35, metalness: 0.5 }));
  cover.position.set(xc - 0.05, yBot + h + 0.03, 0);
  const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.07, 28), S.darkMetal);
  filter.position.set(xc - 0.05, yBot + h + 0.1, -0.05);
  const bat = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.17, 0.14, 2, 0.01), S.battery);
  bat.position.set(xc - 0.25, yBot + h * 0.6, shape.W(xc) * 0.62);
  const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.03, 8), S.redT);
  t1.position.set(xc - 0.3, yBot + h * 0.6 + 0.1, shape.W(xc) * 0.62 - 0.04);
  const rad = new THREE.Mesh(new THREE.BoxGeometry(0.05, h * 0.9, shape.W(xc) * 1.4), S.radiator);
  rad.position.set(shape.L * (spec.parts.bf - 0.02), yBot + h * 0.5, 0);
  const hose = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 16, Math.PI), S.hose);
  hose.position.set(xc + 0.22, yBot + h * 0.7, 0.16);
  hose.rotation.y = Math.PI / 2;
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 14), new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.4, transparent: true, opacity: 0.85 }));
  tank.position.set(xc - 0.2, yBot + h * 0.75, -shape.W(xc) * 0.6);
  const zIn = spec.W - spec.wheel.w - (spec.wheel.inset ?? 0.05) - 0.08;
  const bay = new THREE.Mesh(new THREE.BoxGeometry(shape.L * (1 - spec.parts.hood) * 0.9, 0.02, zIn * 2), S.under);
  bay.position.set(xc, yBot - 0.02, 0);
  g.add(block, cover, filter, bat, t1, rad, hose, tank, bay);
  g.traverse((o) => o.isMesh && (o.castShadow = true));
  g.userData = { block, cover };
  return g;
}

// ---------- сборка машины ----------
// look: { color, metallic, rim, rimColor, wheelR, wheelW, rimK, caliper, interior, engineColor, spoiler, stance, plate }
export function buildCar(spec, look = {}) {
  const S = shared();
  const shape = new BodyShape(spec);
  const g = buildGrid(shape);
  const { geos, cls } = bucketsFrom(shape, g);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const panels = {};
  const mats = {};
  const color = look.color ?? spec.color ?? 0xc0392b;
  for (const k in geos) {
    const geo = geos[k];
    let mesh;
    if (k === 'under') mesh = new THREE.Mesh(geo, S.under);
    else if (k.startsWith('glass')) mesh = new THREE.Mesh(geo, S.glass);
    else {
      const plastic = (k === 'bumperF' || k === 'bumperR') && spec.bumper === 'plastic';
      const m = paintMaterial({ color: plastic ? 0x1e1e22 : color, metallic: look.metallic, plastic, side: k === 'hood' || k === 'trunk' ? THREE.DoubleSide : THREE.FrontSide });
      m.userData.u.uSill.value = spec.sill + 0.05;
      m.userData.u.uArch.value = [shape.axF, shape.axR];
      m.userData.u.uArchR.value.set(spec.wheel.R, shape.archR);
      mats[k] = m;
      mesh = new THREE.Mesh(geo, m);
      mesh.userData.panel = k;
      panels[k] = mesh;
    }
    mesh.castShadow = !k.startsWith('glass');
    mesh.receiveShadow = true;
    mesh.renderOrder = k.startsWith('glass') ? 2 : 0;
    body.add(mesh);
  }
  // внутренняя обшивка: те же детали изнутри, тёмные (видно через стёкла)
  const innerMat = new THREE.MeshStandardMaterial({ color: look.interior ?? spec.interior ?? 0x2a2a2e, roughness: 0.95, side: THREE.BackSide });
  for (const k of ['roof', 'doorL', 'doorR', 'quarterL', 'quarterR']) if (geos[k]) body.add(new THREE.Mesh(geos[k], innerMat));
  // зазоры и уплотнители
  const sm = seams(shape, g, cls);
  body.add(new THREE.Mesh(sm.gap, S.gap), new THREE.Mesh(sm.seal, S.seal));
  // капот и багажник — на петлях
  const hinge = (mesh, x, open) => {
    const piv = new THREE.Group();
    const y = shape.T(x) - 0.01;
    piv.position.set(x, y, 0);
    mesh.position.set(-x, -y, 0);
    body.remove(mesh);
    piv.add(mesh);
    body.add(piv);
    piv.userData.open = open;
    return piv;
  };
  const hoodX = spec.parts.hood * shape.L;
  const hoodPivot = panels.hood ? hinge(panels.hood, hoodX + 0.01, 1) : null;
  const trunkX = spec.parts.trunk * shape.L;
  const trunkPivot = panels.trunk ? hinge(panels.trunk, trunkX - 0.01, -1) : null;

  // колёса и подкрылки
  const wheels = [];
  const track = spec.W - spec.wheel.w / 2 - (spec.wheel.inset ?? 0.05) + (look.stance ? 0.03 : 0);
  const S2 = shared();
  for (const [ax, front] of [[shape.axF, true], [shape.axR, false]])
    for (const side of [1, -1]) {
      const w = makeWheel(spec, look, side);
      w.position.set(ax, (look.wheelR ?? spec.wheel.R), side * track);
      w.userData.front = front;
      root.add(w);
      wheels.push(w);
      // подкрылок: тёмная полукруглая ниша над колесом с глухой внутренней стенкой
      const zIn = track - spec.wheel.w / 2 - 0.06,
        zOut = spec.W - 0.01;
      const lw = zOut - zIn;
      const lg = new THREE.Group();
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(shape.archR - 0.004, shape.archR - 0.004, lw, 28, 1, true, -Math.PI / 2, Math.PI), S2.under);
      shell.rotation.x = -Math.PI / 2;
      const cap = new THREE.Mesh(new THREE.CircleGeometry(shape.archR - 0.004, 28, 0, Math.PI), S2.under);
      cap.position.z = -lw / 2;
      lg.add(shell, cap);
      lg.position.set(ax, spec.wheel.R, side * (zIn + lw / 2));
      lg.scale.z = side;
      root.add(lg);
    }
  // окантовка арок
  for (const ax of [shape.axF, shape.axR])
    for (const side of [1, -1]) {
      const a0 = Math.asin(clamp((spec.sill + 0.03 - spec.wheel.R) / shape.archR, -1, 1));
      const pts = [];
      for (let k = 0; k <= 24; k++) {
        const a = a0 + ((Math.PI - 2 * a0) * k) / 24;
        const x = ax + Math.cos(a) * (shape.archR + 0.003),
          y = spec.wheel.R + Math.sin(a) * (shape.archR + 0.003);
        pts.push(new THREE.Vector3(x, y, side * (shape.zAt(x, y) - 0.006)));
      }
      const lip = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.011, 6, false), S.black);
      root.add(lip);
    }

  // фары, фонари, решётка — наклейки по форме кузова
  const lights = { head: [], tail: [] };
  const fl = spec.lights.front;
  const placeFront = (obj, y, z, side = 1, push = 0.004) => {
    const q = shape.endPoint(y, z, side);
    placeOn(obj, q.p.clone().add(q.n.clone().multiplyScalar(push)), q.n);
    root.add(obj);
    return q;
  };
  const dec = (axis, poly, kind, off = 0.003) => {
    const geo = decalGeo(g, cls, { axis, poly, off, L: shape.L });
    const m = new THREE.Mesh(geo, decalMat(kind));
    m.renderOrder = 1;
    m.receiveShadow = true;
    body.add(m);
    return m;
  };
  for (const zs of [1, -1]) {
    if (fl.type === 'round' || fl.type === 'quad') {
      const list = [[fl.z, fl.r]];
      if (fl.type === 'quad') list.push([fl.z - fl.r * 2.25, fl.r * 0.9]);
      for (const [z0, r0] of list) {
        lights.head.push(dec('+x', circle(-z0 * zs, fl.y, r0, 28), 'headRound', 0.004));
        // хромированный ободок
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r0 + 0.006, 0.011, 8, 32), S.chrome);
        placeFront(ring, fl.y, z0 * zs, 1, 0.006);
      }
    } else {
      const poly = fl.pts ? hull(fl.pts.map(([zz, yy]) => [-zz * zs, yy])) : rrect(-fl.z * zs, fl.y, fl.w, fl.h, fl.r ?? 0.02, 4);
      const back = fl.pts ? hull(fl.pts.flatMap(([zz, yy]) => [[-zz * zs - 0.012, yy - 0.012], [-zz * zs + 0.012, yy + 0.012], [-zz * zs - 0.012, yy + 0.012], [-zz * zs + 0.012, yy - 0.012]])) : rrect(-fl.z * zs, fl.y, fl.w + 0.024, fl.h + 0.024, (fl.r ?? 0.02) + 0.012, 4);
      dec('+x', back, 'rubber', 0.002);
      lights.head.push(dec('+x', poly, fl.tex || 'headRect', 0.004));
    }
    if (fl.amber) dec('+x', rrect(-(fl.amberZ ?? fl.z) * zs, fl.amberY ?? fl.y - 0.12, fl.amber[0], fl.amber[1], 0.012, 3), 'amber', 0.004);
    const rl = spec.lights.rear;
    if (rl.type === 'round') {
      lights.tail.push(dec('-x', circle(rl.z * zs, rl.y, rl.r, 24), 'tailRound', 0.004));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rl.r + 0.005, 0.009, 8, 28), S.chrome);
      placeFront(ring, rl.y, rl.z * zs, -1, 0.005);
    } else {
      dec('-x', rrect(rl.z * zs, rl.y, rl.w + 0.02, rl.h + 0.02, (rl.r ?? 0.015) + 0.01, 3), 'rubber', 0.002);
      lights.tail.push(dec('-x', rrect(rl.z * zs, rl.y, rl.w, rl.h, rl.r ?? 0.015, 3), 'tail', 0.004));
    }
  }
  if (spec.grille) {
    const G2 = spec.grille;
    const kind = G2.style === 'chrome' ? 'grilleChrome' : G2.style === 'mesh' ? 'grilleMesh' : 'grilleBars';
    dec('+x', rrect(0, G2.y, G2.w, G2.h, G2.r ?? 0.02, 4), kind, 0.0025);
  }
  // заднее стекло на вертикальной стенке (внедорожники, фургоны)
  if (spec.glass.back) for (const b of [].concat(spec.glass.back)) dec('-x', rrect(b.z ?? 0, b.y, b.w, b.h, b.r ?? 0.04, 3), 'backGlass', 0.004);

  // молдинги по бортам (хром у ретро, чёрные у остальных)
  if (spec.trim) {
    const T2 = spec.trim;
    for (const ax of ['+z', '-z']) dec(ax, rrect(ax === '+z' ? T2.x * shape.L : -T2.x * shape.L, T2.y, T2.len * shape.L, T2.h ?? 0.022, 0.008, 2), T2.kind || 'trim', 0.003);
  }
  // номера
  const plateGeo = new RoundedBoxGeometry(0.52, 0.115, 0.012, 2, 0.008);
  const pf = new THREE.Mesh(plateGeo, S.plate);
  placeFront(pf, spec.plateY?.[1] ?? spec.bumpH[1] - 0.14, 0, 1, 0.012);
  const pr = new THREE.Mesh(plateGeo, S.plate);
  placeFront(pr, spec.plateY?.[0] ?? spec.bumpH[0] + 0.08, 0, -1, 0.012);
  pr.rotateY(0);

  // бамперы-брусья (ретро): хромированный брус по контуру
  if (spec.bumper === 'bar') {
    for (const side of [1, -1]) {
      const y = spec.bumpH[side > 0 ? 1 : 0];
      const pts = [];
      for (let k = 0; k <= 16; k++) {
        const z = (k / 16 - 0.5) * 2 * (spec.W - 0.05);
        const q = shape.endPoint(y, z, side);
        pts.push(q.p.clone().add(q.n.clone().multiplyScalar(0.05)));
      }
      // загнуть концы к бортам
      const curveP = new THREE.CatmullRomCurve3(pts);
      const sh = new THREE.Shape();
      const bw = 0.05,
        bh = 0.06;
      sh.moveTo(-bw, -bh);
      sh.lineTo(bw, -bh);
      sh.quadraticCurveTo(bw * 1.3, 0, bw, bh);
      sh.lineTo(-bw, bh);
      sh.quadraticCurveTo(-bw * 1.1, 0, -bw, -bh);
      const geo = new THREE.ExtrudeGeometry(sh, { steps: 40, extrudePath: curveP, bevelEnabled: false, curveSegments: 6 });
      const key = side > 0 ? 'bumperF' : 'bumperR';
      const m = spec.bumperColor === 'black' ? paintMaterial({ plastic: true, color: 0x1c1c20 }) : paintMaterial({ chrome: true, color: 0xe8ecf0 });
      m.userData.u.uSill.value = 1;
      const mesh = new THREE.Mesh(geo, m);
      mesh.castShadow = true;
      mesh.userData.panel = key;
      root.add(mesh);
      panels[key] = mesh;
      mats[key] = m;
    }
  }

  // зеркала
  const xm = spec.glass.wsB * shape.L - 0.12;
  const ym = shape.belt(xm) + 0.06;
  for (const side of [1, -1]) {
    const z = shape.zAt(xm, ym);
    const mg = new THREE.Group();
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.08), S.black);
    stalk.position.z = 0.04;
    const head = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.1, 0.16, 3, 0.03), spec.mirror === 'chrome' ? S.chrome : spec.mirror === 'body' && mats.doorR ? mats['door' + (side > 0 ? 'R' : 'L')] : S.black);
    head.position.set(-0.01, 0.03, 0.12);
    const glassM = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.13), S.chrome);
    glassM.rotation.y = -Math.PI / 2;
    glassM.position.set(-0.047, 0.03, 0.12);
    mg.add(stalk, head, glassM);
    mg.position.set(xm, ym, side * z);
    mg.scale.z = side;
    mg.traverse((o) => o.isMesh && (o.castShadow = true));
    root.add(mg);
  }
  // ручки дверей
  const handles = spec.doors === 4 ? [spec.parts.df - 0.02, (spec.glass.bp ?? 0.5) - 0.03] : [spec.parts.df - 0.03];
  for (const uh of handles)
    for (const side of [1, -1]) {
      const x = uh * shape.L - 0.12;
      const y = shape.belt(x) - 0.07;
      const z = shape.zAt(x, y);
      const h = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.03, 0.025, 2, 0.01), spec.mirror === 'chrome' ? S.chrome : S.black);
      h.position.set(x, y, side * (z + 0.006));
      root.add(h);
    }
  // дворники
  const xw = spec.glass.wsB * shape.L + 0.02;
  for (const zw of [-0.32, 0.22]) {
    const wp = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.5), S.black);
    wp.position.set(xw - 0.04, shape.T(xw) + 0.01, zw);
    wp.rotation.y = -0.15;
    wp.rotation.z = -0.25;
    root.add(wp);
  }
  // глушитель
  const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 14, 1, true), S.darkMetal);
  ex.rotation.z = Math.PI / 2;
  ex.position.set(0.05, (spec.botR ?? spec.sill) - 0.07, -spec.W * 0.55);
  root.add(ex);
  // антенна у ретро, багажник на крыше у внедорожников, спойлер — тюнинг
  if (spec.antenna) {
    const an = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.8, 5), S.chrome);
    const xa = spec.parts.df * shape.L - 0.05;
    an.position.set(xa, shape.belt(xa) + 0.4, spec.W * 0.9);
    an.rotation.z = 0.25;
    root.add(an);
  }
  if (spec.rack) {
    const rx = (spec.glass.wsT + spec.glass.rwT) / 2;
    const xr = rx * shape.L;
    const yr = shape.T(xr) + 0.06;
    const len = (spec.glass.wsT - spec.glass.rwT) * shape.L * 0.9;
    const wr = shape.W(xr) * (spec.tumble ?? 0.8) * 0.9;
    for (const z of [-wr, wr]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, len, 8), S.black);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(xr, yr, z);
      root.add(rail);
    }
    for (let k = 0; k < 4; k++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, wr * 2, 8), S.black);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(xr - len / 2 + ((k + 0.5) * len) / 4, yr, 0);
      root.add(bar);
    }
  }
  if (spec.spare) {
    const sw = makeWheel(spec, { ...look, rim: 'steel' }, 1);
    sw.rotation.y = Math.PI / 2;
    const q = shape.endPoint(spec.spare, 0, -1);
    sw.position.copy(q.p).add(new THREE.Vector3(-spec.wheel.w * 0.55, 0, 0));
    root.add(sw);
  }
  const extras = new THREE.Group();
  root.add(extras);

  // салон и мотор
  const inside = interior(shape, spec, look);
  root.add(inside);
  const eng = engine(shape, spec, look);
  root.add(eng);

  // центрировать по длине
  root.children.forEach((c) => (c.position.x -= shape.L / 2));
  const car = { root, body, panels, mats, wheels, lights, hoodPivot, trunkPivot, shape, spec, extras, engine: eng, look, grid: g, cls };
  root.userData.car = car;
  setSpoiler(car, look.spoiler || 0);
  if (look.stripes) setStripes(car, look.stripes);
  return car;
}

// гоночные полосы по верху кузова (тюнинг): 0 нет, иначе цвет
export function setStripes(car, color) {
  if (car._stripes) {
    car._stripes.forEach((m) => car.body.remove(m));
    car._stripes = null;
  }
  car.look.stripes = color || 0;
  if (!color) return;
  const m = decalMat('stripe').clone();
  m.color.setHex(color);
  car._stripes = [-1, 1].map((sz) => {
    const geo = decalGeo(car.grid, car.cls, { axis: '+y', poly: rrect(car.shape.L / 2, sz * 0.13, car.shape.L * 1.05, 0.1, 0.001, 1), off: 0.0035, L: car.shape.L });
    const mesh = new THREE.Mesh(geo, m);
    mesh.renderOrder = 1;
    car.body.add(mesh);
    return mesh;
  });
}

// спойлер (тюнинг): 0 нет, 1 лип-спойлер на багажнике, 2 крыло на стойках
export function setSpoiler(car, kind) {
  const { extras, shape, spec } = car;
  extras.clear();
  if (!kind) return;
  const S = shared();
  const x = Math.max(0.03, spec.parts.trunk * 0.35) * shape.L;
  const y = shape.T(x);
  const w = shape.W(x) * 1.7;
  const m = car.mats.trunk || car.mats.roof;
  if (kind === 1) {
    const lip = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.04, w, 2, 0.015), m);
    lip.position.set(x - shape.L / 2, y + 0.02, 0);
    lip.rotation.z = -0.25;
    extras.add(lip);
  } else {
    const wing = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.03, w * 1.05, 3, 0.012), m);
    wing.position.set(x - shape.L / 2 - 0.02, y + 0.22, 0);
    wing.rotation.z = 0.12;
    extras.add(wing);
    for (const z of [-w * 0.32, w * 0.32]) {
      const st = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.22, 0.025, 2, 0.008), S.black);
      st.position.set(x - shape.L / 2, y + 0.11, z);
      extras.add(st);
    }
    for (const z of [-w * 0.525, w * 0.525]) {
      const ep = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.1, 0.012, 2, 0.004), m);
      ep.position.set(x - shape.L / 2 - 0.02, y + 0.22, z);
      extras.add(ep);
    }
  }
  extras.traverse((o) => o.isMesh && (o.castShadow = true));
}

// перекрасить кузов
export function setColor(car, color, metallic) {
  for (const k in car.mats) {
    const m = car.mats[k];
    if (m.metalness === 1 && m.roughness < 0.2) continue; // хром
    if (car.spec.bumper === 'plastic' && (k === 'bumperF' || k === 'bumperR')) continue;
    m.color.setHex(color);
    m.metalness = metallic ? 0.55 : 0.05;
    m.roughness = metallic ? 0.32 : 0.28;
  }
  car.look.color = color;
  car.look.metallic = metallic;
}
