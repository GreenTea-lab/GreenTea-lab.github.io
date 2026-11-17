// Окружение кухни: мощёная терраса вокруг, дорожки, столики кафе с гостями,
// декор по краям и задний план за стеной. Своё для каждого мира.
import { shade } from './models.js';

const PAL = {
  home: { pave: ['#f1e2c8', '#e6d2b0', '#ecdcbf'], grout: '#c9b28c', curb: '#d9c4a0', path: ['#d8d0c2', '#cfc5b5'], patch: ['#9bcf6c', '#b4e184', '#8fc662'] },
  beach: { pave: ['#e0aa6e', '#d49a5e', '#e8b67c'], grout: '#a8744a', curb: '#c48a56', path: ['#d9a46a', '#cc9558'], patch: ['#fff0c4', '#ffd98c', '#ffe8b0'] },
  snow: { pave: ['#c9bcae', '#bcae9e', '#d4c8ba'], grout: '#9a8a7a', curb: '#ffffff', path: ['#dfe8f4', '#d4dfee'], patch: ['#ffffff', '#e4eefa', '#f8fbff'] },
  night: { pave: ['#5c5190', '#544988', '#665b9c'], grout: '#3a3266', curb: '#7a6cb8', path: ['#4d437f', '#463c76'], patch: ['#3a3268', '#2f2858', '#403670'] },
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// с какой стороны окно выдачи (туда приходят гости)
function windowSide(k) {
  for (const t of k.tiles) {
    if (t.type !== 'serve') continue;
    for (const [dx, dz, s] of [[1, 0, 'r'], [-1, 0, 'l'], [0, 1, 'f'], [0, -1, 'b']]) {
      const n = k.tile(t.x + dx, t.z + dz);
      if (!n || n.type === 'void') return s;
    }
  }
  return 'r';
}

export function buildExterior(v, b, gl) {
  const k = v.k;
  const th = k.L.theme;
  const P = PAL[th];
  const r = rng(k.idx * 977 + 13);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const L = v.ox,
    R = -v.ox,
    BK = v.oz,
    F = -v.oz;
  const T = 1.3; // ширина террасы
  const win = windowSide(k);
  const rects = []; // занятые прямоугольники: терраса, дорожки
  const circles = []; // занятые круги: столики, деревья
  const inRect = (x, z, rr) => rects.some((q) => x > q[0] - rr && x < q[1] + rr && z > q[2] - rr && z < q[3] + rr);
  const free = (x, z, rr) => !inRect(x, z, rr) && circles.every((c) => Math.hypot(c.x - x, c.z - z) > c.r + rr);
  const take = (x, z, rr) => circles.push({ x, z, r: rr });
  const seats = [];

  // ---------- мощение ----------
  const pave = (x0, x1, z0, z1, along) => {
    b.box(x1 - x0, 0.03, z1 - z0, P.grout, { x: (x0 + x1) / 2, y: -0.005, z: (z0 + z1) / 2 });
    if (th === 'beach') {
      // доски настила
      const w = 0.25;
      if (along === 'x') {
        for (let z = z0 + w / 2; z < z1; z += w) {
          let x = x0 - r() * 0.8;
          while (x < x1) {
            const len = 0.9 + r() * 0.8;
            const a = Math.max(x, x0),
              c = Math.min(x + len, x1);
            if (c - a > 0.15) b.box(c - a - 0.04, 0.04, w - 0.04, pick(P.pave), { x: (a + c) / 2, y: 0.01, z });
            x += len;
          }
        }
      } else {
        for (let x = x0 + w / 2; x < x1; x += w) {
          let z = z0 - r() * 0.8;
          while (z < z1) {
            const len = 0.9 + r() * 0.8;
            const a = Math.max(z, z0),
              c = Math.min(z + len, z1);
            if (c - a > 0.15) b.box(w - 0.04, 0.04, c - a - 0.04, pick(P.pave), { x, y: 0.01, z: (a + c) / 2 });
            z += len;
          }
        }
      }
      return;
    }
    const s = th === 'snow' ? 0.62 : th === 'night' ? 0.36 : 0.5;
    const nx = Math.max(1, Math.round((x1 - x0) / s)),
      nz = Math.max(1, Math.round((z1 - z0) / s));
    const sx = (x1 - x0) / nx,
      sz = (z1 - z0) / nz;
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = x0 + (i + 0.5) * sx,
          z = z0 + (j + 0.5) * sz;
        const col = shade(pick(P.pave), (r() - 0.5) * 0.06);
        if (th === 'night') b.rbox(0.3, 0.05, 0.3, 0.04, col, { x: x + (r() - 0.5) * 0.03, y: 0.0, z: z + (r() - 0.5) * 0.03 });
        else b.box(sx - 0.06, 0.04, sz - 0.06, col, { x, y: 0.01, z });
      }
  };
  const curb = (x0, x1, z0, z1) => b.box(x1 - x0, 0.07, z1 - z0, P.curb, { x: (x0 + x1) / 2, y: 0.02, z: (z0 + z1) / 2 });

  const zTop = BK - 1.4;
  pave(L - T, L, zTop, F + T, 'z');
  pave(R, R + T, zTop, F + T, 'z');
  pave(L, R, F, F + T, 'x');
  rects.push([L - T, R + T, zTop, F + T]);
  // бортик по краю террасы
  curb(L - T - 0.08, L - T, zTop, F + T + 0.08);
  curb(R + T, R + T + 0.08, zTop, F + T + 0.08);
  curb(L - T - 0.08, R + T + 0.08, F + T, F + T + 0.08);
  if (th === 'snow')
    // сугробы вдоль расчищенной дорожки
    for (let i = 0; i < 40; i++) {
      const s = r();
      const [x, z] = s < 0.33 ? [L - T - 0.1, zTop + r() * (F + T - zTop)] : s < 0.66 ? [R + T + 0.1, zTop + r() * (F + T - zTop)] : [L - T + r() * (R - L + 2 * T), F + T + 0.1];
      b.hemi(0.18 + r() * 0.16, '#ffffff', { x, y: 0, z, sy: 0.55 });
    }

  // ---------- дорожки от террасы наружу ----------
  const mz = (BK + F) / 2;
  const paths = [
    ['f', 0, F + T, 0, F + T + 9],
    ['l', L - T, mz, L - T - 9, mz],
  ];
  if (win !== 'r') paths.push(['r', R + T, mz, R + T + 9, mz]);
  for (const [side, x0, z0, x1, z1] of paths) {
    const vert = side === 'f';
    const len = vert ? z1 - z0 : Math.abs(x1 - x0);
    const dir = vert ? 1 : Math.sign(x1 - x0);
    const w = 1.1;
    rects.push(vert ? [x0 - w / 2, x0 + w / 2, z0, z1] : [Math.min(x0, x1), Math.max(x0, x1), z0 - w / 2, z0 + w / 2]);
    const at = (d, o) => (vert ? [x0 + o, z0 + d] : [x0 + d * dir, z0 + o]);
    if (th === 'home') {
      // круглые камешки
      for (let d = 0.45; d < len; d += 0.62) {
        const [x, z] = at(d, (Math.floor(d / 0.62) % 2 ? 0.17 : -0.17) + (r() - 0.5) * 0.06);
        b.cyl(0.27, 0.29, 0.05, pick(P.path), { x, y: 0.0, z, ry: r() * 3, sx: 1.15 }, 10);
      }
    } else if (th === 'beach') {
      // настил из досок поперёк
      for (let d = 0.18; d < len; d += 0.3) {
        const [x, z] = at(d, 0);
        b.box(vert ? w : 0.25, 0.05, vert ? 0.25 : w, pick(P.path), { x, y: 0.02, z });
      }
      for (const o of [-0.4, 0.4]) {
        const [x, z] = at(len / 2, o);
        b.box(vert ? 0.06 : len, 0.03, vert ? len : 0.06, '#a8744a', { x, y: 0.0, z });
      }
    } else if (th === 'snow') {
      // протоптанная тропинка со следами
      const [cx, cz] = at(len / 2, 0);
      b.box(vert ? w : len, 0.02, vert ? len : w, P.path[0], { x: cx, y: 0.0, z: cz });
      for (let d = 0.3; d < len; d += 0.38) {
        const [x, z] = at(d, Math.floor(d / 0.38) % 2 ? 0.12 : -0.12);
        b.sph(0.07, '#c4d2e6', { x, y: 0.01, z, sx: vert ? 1 : 1.5, sy: 0.15, sz: vert ? 1.5 : 1 });
      }
    } else {
      for (let d = 0.2; d < len; d += 0.38)
        for (const o of [-0.38, 0, 0.38]) {
          const [x, z] = at(d, o + (Math.floor(d / 0.38) % 2 ? 0.1 : -0.1));
          b.rbox(0.32, 0.05, 0.32, 0.04, shade(pick(P.path), (r() - 0.5) * 0.08), { x, y: 0.0, z });
        }
    }
  }

  // ---------- фонари по углам террасы ----------
  const lamp = (x, z) => {
    take(x, z, 0.3);
    const pole = th === 'night' ? '#2a2248' : th === 'snow' ? '#4a3a30' : '#3a3a46';
    b.cyl(0.12, 0.15, 0.12, pole, { x, y: 0.06, z }, 10);
    b.cyl(0.045, 0.045, 1.9, pole, { x, y: 1.0, z }, 8);
    b.cyl(0.16, 0.12, 0.08, pole, { x, y: 1.98, z }, 8);
    gl.sph(0.14, th === 'night' ? '#ffe7a0' : '#fff6d8', { x, y: 2.1, z, sy: 1.15 });
    b.cone(0.2, 0.14, pole, { x, y: 2.3, z }, 8);
  };
  lamp(L - T - 0.4, F + T + 0.4);
  lamp(R + T + 0.4, F + T + 0.4);
  lamp(L - T - 0.4, zTop + 0.6);
  lamp(R + T + 0.4, zTop + 0.6);

  // ---------- столики кафе ----------
  const table = (x, z) => {
    take(x, z, 1.05);
    const a = r() * Math.PI;
    const top = th === 'night' ? '#ffffff' : th === 'snow' ? '#a07048' : th === 'beach' ? '#ffffff' : '#ffffff';
    // ножка и столешница
    b.cyl(0.05, 0.05, 0.5, '#5a5260', { x, y: 0.25, z }, 8);
    b.cyl(0.22, 0.24, 0.03, '#5a5260', { x, y: 0.015, z }, 12);
    b.cyl(0.42, 0.42, 0.05, top, { x, y: 0.52, z }, 20);
    if (th === 'home') {
      // скатерть с красной каймой
      b.cyl(0.45, 0.45, 0.02, '#ff7a6a', { x, y: 0.55, z }, 20);
      b.cyl(0.36, 0.36, 0.022, '#ffffff', { x, y: 0.555, z }, 20);
    }
    // зонтик над столиком (кроме ночи)
    if (th !== 'night') {
      const uc = th === 'beach' ? '#e8c26a' : th === 'snow' ? '#c84a4a' : pick(['#ff8a6a', '#7ab8ff', '#8be07a']);
      b.cyl(0.025, 0.025, 1.5, '#e8e8f0', { x, y: 1.25, z }, 6);
      if (th === 'beach') {
        // соломенный зонтик
        b.cone(0.95, 0.45, uc, { x, y: 2.05, z }, 10);
        b.cone(0.98, 0.12, shade(uc, -0.12), { x, y: 1.85, z }, 10);
      } else {
        b.cone(0.95, 0.38, uc, { x, y: 2.0, z }, 8);
        b.sph(0.06, '#ffffff', { x, y: 2.22, z });
      }
    } else {
      // свечка на столе
      b.cyl(0.05, 0.05, 0.1, '#fff4dc', { x, y: 0.6, z }, 8);
      gl.sph(0.045, '#ffd25a', { x, y: 0.69, z, sy: 1.5 });
    }
    // два стула друг напротив друга
    for (const s of [0, Math.PI]) {
      const ca = a + s;
      const sx = x + Math.sin(ca) * 0.72,
        sz = z + Math.cos(ca) * 0.72;
      const chairCol = th === 'beach' ? '#4aa3ff' : th === 'snow' ? '#8a5a3a' : th === 'night' ? '#ff7aa2' : '#c98a52';
      b.cyl(0.2, 0.2, 0.05, chairCol, { x: sx, y: 0.32, z: sz }, 12);
      b.cyl(0.03, 0.03, 0.3, '#5a5260', { x: sx, y: 0.15, z: sz }, 6);
      b.rbox(0.38, 0.32, 0.05, 0.02, chairCol, { x: sx + Math.sin(ca) * 0.18, y: 0.5, z: sz + Math.cos(ca) * 0.18, ry: ca });
      // тарелка или кружка на столе перед стулом
      const px = x + Math.sin(ca) * 0.2,
        pz = z + Math.cos(ca) * 0.2;
      if (r() < 0.6) {
        b.cyl(0.13, 0.1, 0.025, '#ffffff', { x: px, y: 0.56, z: pz }, 14);
        b.sph(0.07, pick(['#ff7a4a', '#ffc94a', '#8be05e', '#c9783a']), { x: px, y: 0.59, z: pz, sy: 0.6 });
      } else {
        b.cyl(0.05, 0.045, 0.1, pick(['#ffffff', '#ff9ab0', '#7ab8ff']), { x: px, y: 0.6, z: pz }, 10);
        b.torus(0.03, 0.01, '#ffffff', { x: px + 0.06, y: 0.6, z: pz });
      }
      seats.push({ x: sx, z: sz, face: ca + Math.PI, y: 0.18 });
    }
  };
  const cand = [];
  for (let z = BK + 0.6; z < F + 0.2; z += 2.7) {
    cand.push([L - T - 1.25, z]);
    cand.push([R + T + (win === 'r' ? 2.6 : 1.25), z]);
  }
  for (let x = L + 1.4; x < R - 1.2; x += 3.1) cand.push([x, F + T + 1.25]);
  for (const [x, z] of cand) if (free(x, z, 1.05)) table(x, z);

  // ---------- декор по краям ----------
  const deco = DECO[th];
  let placed = 0;
  for (let i = 0; i < 260 && placed < 46; i++) {
    const side = r();
    const d = 1.2 + Math.pow(r(), 1.3) * 7;
    let x, z;
    if (side < 0.32) {
      x = L - T - d;
      z = BK - 3 + r() * (F - BK + 7);
    } else if (side < 0.64) {
      x = R + T + d;
      z = BK - 3 + r() * (F - BK + 7);
    } else {
      x = L - T - 4 + r() * (R - L + 2 * T + 8);
      z = F + T + d;
    }
    const item = deco.pick(r());
    if (!free(x, z, item.r)) continue;
    take(x, z, item.r);
    item.draw(b, gl, x, z, r);
    placed++;
  }
  // мелочи на земле: трава, цветы, ракушки, сугробы
  for (let i = 0; i < 160; i++) {
    const x = L - T - 9 + r() * (R - L + 2 * T + 18),
      z = BK - 2 + r() * (F - BK + 12);
    if (!free(x, z, 0.15)) continue;
    deco.small(b, x, z, r);
  }
  // большие пятна на земле, чтобы она не была однотонной
  for (let i = 0; i < 26; i++) {
    const x = L - T - 9 + r() * (R - L + 2 * T + 18),
      z = BK - 1 + r() * (F - BK + 11);
    if (inRect(x, z, 0.8)) continue;
    b.cyl(0.8 + r() * 1.2, 0.8 + r() * 1.2, 0.012, pick(P.patch), { x, y: -0.007 + i * 0.0008, z, sx: 1.4, ry: r() * 3 }, 14);
  }

  // ---------- задний план за стеной ----------
  BACK[th](b, gl, L, R, BK, r, pick);
  return seats;
}

// ---------- элементы декора ----------
const tree = (b, x, z, s, col = '#6cc24a') => {
  b.cyl(0.1 * s, 0.14 * s, 1.0 * s, '#9a6638', { x, y: 0.5 * s, z }, 8);
  b.sph(0.62 * s, col, { x, y: 1.35 * s, z });
  b.sph(0.45 * s, shade(col, 0.1), { x: x + 0.32 * s, y: 1.6 * s, z: z + 0.15 * s });
  b.sph(0.4 * s, shade(col, -0.06), { x: x - 0.3 * s, y: 1.55 * s, z: z - 0.1 * s });
  if (s > 1.1) for (let i = 0; i < 4; i++) b.sph(0.07, '#ff6a5a', { x: x + Math.cos(i * 1.7) * 0.5 * s, y: 1.35 * s + Math.sin(i * 2.3) * 0.25, z: z + Math.sin(i * 1.7) * 0.5 * s });
};
const pine = (b, x, z, s) => {
  b.cyl(0.08 * s, 0.1 * s, 0.4 * s, '#8a5a3a', { x, y: 0.2 * s, z }, 8);
  b.cone(0.6 * s, 0.9 * s, '#3f9a5a', { x, y: 0.8 * s, z }, 10);
  b.cone(0.48 * s, 0.75 * s, '#4cae66', { x, y: 1.3 * s, z }, 10);
  b.cone(0.34 * s, 0.6 * s, '#5cc078', { x, y: 1.75 * s, z }, 10);
  b.cone(0.36 * s, 0.2 * s, '#ffffff', { x, y: 2.0 * s, z }, 10);
  b.cone(0.62 * s, 0.12 * s, '#ffffff', { x, y: 0.42 * s, z }, 10);
};
const palm = (b, x, z, s) => {
  for (let j = 0; j < 6; j++) b.cyl((0.11 - j * 0.008) * s, (0.12 - j * 0.008) * s, 0.42 * s, j % 2 ? '#b07a4a' : '#9a6638', { x: x + j * 0.06 * s, y: (0.21 + j * 0.4) * s, z }, 8);
  for (let j = 0; j < 7; j++) {
    const a = (j / 7) * Math.PI * 2;
    b.sph(0.18 * s, j % 2 ? '#4cbf4a' : '#3eae44', { x: x + 0.36 * s + Math.cos(a) * 0.55 * s, y: 2.3 * s, z: z + Math.sin(a) * 0.55 * s, sx: 3.2, sy: 0.35, sz: 1.2, ry: -a });
  }
  b.sph(0.09 * s, '#8a5a2a', { x: x + 0.4 * s, y: 2.2 * s, z: z + 0.1 });
  b.sph(0.09 * s, '#8a5a2a', { x: x + 0.3 * s, y: 2.2 * s, z: z - 0.08 });
};
const bush = (b, x, z, col = '#5cb84a', fl) => {
  b.sph(0.38, col, { x, y: 0.28, z, sy: 0.8 });
  b.sph(0.3, shade(col, 0.08), { x: x + 0.3, y: 0.24, z: z + 0.1, sy: 0.8 });
  b.sph(0.26, shade(col, -0.05), { x: x - 0.28, y: 0.22, z: z - 0.05, sy: 0.8 });
  if (fl) for (let i = 0; i < 5; i++) b.sph(0.05, fl, { x: x + Math.cos(i * 1.3) * 0.32, y: 0.42 + (i % 2) * 0.1, z: z + Math.sin(i * 1.3) * 0.3 });
};
const fence = (b, x, z, a, n, col) => {
  // штакетник
  for (let i = 0; i < n; i++) {
    const px = x + Math.cos(a) * i * 0.3,
      pz = z - Math.sin(a) * i * 0.3;
    b.box(0.12, 0.55, 0.05, col, { x: px, y: 0.28, z: pz, ry: a });
    b.cone(0.085, 0.1, col, { x: px, y: 0.6, z: pz, ry: a + Math.PI / 4, sz: 0.4 }, 4);
  }
  const mx = x + (Math.cos(a) * (n - 1) * 0.3) / 2,
    mz = z - (Math.sin(a) * (n - 1) * 0.3) / 2;
  for (const y of [0.18, 0.42]) b.box(n * 0.3, 0.06, 0.03, shade(col, -0.08), { x: mx, y, z: mz, ry: a });
};

const DECO = {
  home: {
    items: [
      { w: 4, r: 1.0, draw: (b, gl, x, z, r) => tree(b, x, z, 1 + r() * 0.5) },
      { w: 4, r: 0.6, draw: (b, gl, x, z, r) => bush(b, x, z, '#5cb84a', r() < 0.6 ? ['#ff7aa2', '#ffffff', '#ffd23f'][Math.floor(r() * 3)] : null) },
      {
        w: 2, r: 0.7,
        draw: (b, gl, x, z, r) => {
          // клумба
          b.rbox(1.2, 0.2, 0.6, 0.05, '#c8875a', { x, y: 0.1, z });
          b.box(1.1, 0.04, 0.5, '#7a5236', { x, y: 0.2, z });
          for (let j = 0; j < 6; j++) {
            b.cyl(0.015, 0.015, 0.22, '#58b03e', { x: x - 0.45 + j * 0.18, y: 0.3, z: z + (j % 2 ? 0.1 : -0.1) }, 4);
            b.sph(0.07, ['#ff7aa2', '#ffd23f', '#ffffff', '#b48cff', '#ff8a5c', '#7ab8ff'][j], { x: x - 0.45 + j * 0.18, y: 0.43, z: z + (j % 2 ? 0.1 : -0.1) });
          }
        },
      },
      {
        w: 1.5, r: 0.7,
        draw: (b, gl, x, z, r) => {
          // скамейка
          b.rbox(1.1, 0.06, 0.36, 0.02, '#c98a52', { x, y: 0.42, z });
          b.rbox(1.1, 0.3, 0.05, 0.02, '#c98a52', { x, y: 0.62, z: z - 0.17 });
          for (const sx of [-0.45, 0.45]) b.box(0.06, 0.4, 0.3, '#5a5260', { x: x + sx, y: 0.2, z });
        },
      },
      { w: 1.5, r: 1.0, draw: (b, gl, x, z, r) => fence(b, x - 0.6, z, 0, 5, '#ffffff') },
      {
        w: 0.8, r: 0.4,
        draw: (b, gl, x, z, r) => {
          // почтовый ящик
          b.cyl(0.04, 0.04, 0.8, '#8a5a3a', { x, y: 0.4, z }, 6);
          b.rbox(0.3, 0.22, 0.42, 0.08, '#ff6a5a', { x, y: 0.88, z });
          b.box(0.03, 0.18, 0.08, '#ffd23f', { x: x + 0.16, y: 1.0, z: z + 0.12 });
        },
      },
      {
        w: 0.8, r: 0.5,
        draw: (b, gl, x, z, r) => {
          // ящик с овощами и лейка
          b.box(0.6, 0.3, 0.4, '#c98a52', { x, y: 0.15, z });
          for (let j = 0; j < 4; j++) b.sph(0.1, ['#ff5a4a', '#ff8a2a', '#8be05e', '#ffd23f'][j], { x: x - 0.2 + j * 0.13, y: 0.34, z: z + (j % 2 ? 0.07 : -0.07) });
          b.cyl(0.13, 0.15, 0.26, '#7ab8ff', { x: x + 0.55, y: 0.13, z }, 10);
          b.cyl(0.02, 0.03, 0.3, '#7ab8ff', { x: x + 0.75, y: 0.25, z, rz: -0.9 }, 6);
        },
      },
    ],
    small: (b, x, z, r) => {
      const s = r();
      if (s < 0.6) for (let i = 0; i < 3; i++) b.cone(0.05, 0.16 + r() * 0.08, s < 0.3 ? '#6cbf4a' : '#86d45c', { x: x + (i - 1) * 0.06, y: 0.07, z: z + (r() - 0.5) * 0.06, rz: (i - 1) * 0.3 }, 4);
      else if (s < 0.85) {
        b.cyl(0.01, 0.01, 0.16, '#58b03e', { x, y: 0.08, z }, 4);
        b.sph(0.05, ['#ffffff', '#ffd23f', '#ff9ab0', '#b48cff'][Math.floor(r() * 4)], { x, y: 0.17, z });
      } else b.sph(0.1, '#b8b0a8', { x, y: 0.02, z, sy: 0.5 });
    },
  },
  beach: {
    items: [
      { w: 4, r: 0.9, draw: (b, gl, x, z, r) => palm(b, x, z, 0.9 + r() * 0.4) },
      {
        w: 2.5, r: 0.8,
        draw: (b, gl, x, z, r) => {
          // зонтик и шезлонг
          const c = ['#ff7a7a', '#7ab8ff', '#ffd23f'][Math.floor(r() * 3)];
          b.cyl(0.03, 0.03, 1.6, '#ffffff', { x, y: 0.8, z }, 6);
          b.cone(0.78, 0.36, c, { x, y: 1.65, z }, 8);
          b.cone(0.3, 0.14, '#ffffff', { x, y: 1.83, z }, 8);
          b.rbox(0.45, 0.06, 0.9, 0.03, '#4aa3ff', { x: x + 0.5, y: 0.25, z: z + 0.3, rx: -0.15 });
          b.rbox(0.4, 0.04, 0.4, 0.02, '#ffffff', { x: x + 0.5, y: 0.3, z: z + 0.15, rx: -0.15 });
          b.box(0.4, 0.22, 0.04, '#e8eef8', { x: x + 0.5, y: 0.12, z: z + 0.7 });
          b.box(0.4, 0.22, 0.04, '#e8eef8', { x: x + 0.5, y: 0.12, z: z - 0.05 });
        },
      },
      {
        w: 1.5, r: 0.5,
        draw: (b, gl, x, z, r) => {
          // доска для сёрфинга, воткнутая в песок
          const c = ['#7ad8ff', '#ff9ab0', '#ffd23f'][Math.floor(r() * 3)];
          b.sph(0.18, c, { x, y: 0.7, z, sx: 1, sy: 4.2, sz: 0.25, rz: 0.15 });
          b.box(0.03, 1.2, 0.05, '#ffffff', { x: x + 0.06, y: 0.7, z: z + 0.01, rz: 0.15 });
        },
      },
      {
        w: 1.2, r: 0.4,
        draw: (b, gl, x, z, r) => {
          // пляжный мяч
          b.sph(0.2, '#ff5a4a', { x, y: 0.2, z });
          b.sph(0.202, '#ffffff', { x, y: 0.2, z, sx: 0.4 });
          b.sph(0.204, '#4aa3ff', { x, y: 0.2, z, sz: 0.4 });
        },
      },
      {
        w: 1.2, r: 0.5,
        draw: (b, gl, x, z, r) => {
          // замок из песка
          b.cyl(0.3, 0.35, 0.25, '#f2c46a', { x, y: 0.12, z }, 10);
          for (let i = 0; i < 4; i++) b.cyl(0.08, 0.09, 0.4, '#f2c46a', { x: x + Math.cos(i * 1.57) * 0.28, y: 0.2, z: z + Math.sin(i * 1.57) * 0.28 }, 8);
          b.cyl(0.12, 0.14, 0.3, '#f6cf7a', { x, y: 0.4, z }, 8);
          b.box(0.01, 0.15, 0.1, '#ff5a4a', { x: x + 0.05, y: 0.68, z });
          b.cyl(0.006, 0.006, 0.2, '#ffffff', { x, y: 0.65, z }, 4);
        },
      },
      {
        w: 0.8, r: 0.5,
        draw: (b, gl, x, z, r) => {
          // спасательный круг на столбике
          b.cyl(0.05, 0.05, 1.1, '#ffffff', { x, y: 0.55, z }, 6);
          b.torus(0.22, 0.07, '#ff5a4a', { x, y: 0.85, z: z + 0.06 });
        },
      },
    ],
    small: (b, x, z, r) => {
      const s = r();
      if (s < 0.45) b.box(0.6 + r() * 0.5, 0.012, 0.05, '#fff1c8', { x, y: 0.0, z, ry: 0.2 });
      else if (s < 0.7) b.hemi(0.07, ['#ffffff', '#ffb8c8', '#ffe0a0'][Math.floor(r() * 3)], { x, y: 0, z, sy: 0.6 });
      else if (s < 0.85) for (let i = 0; i < 5; i++) b.box(0.05, 0.03, 0.15, '#ff8a5a', { x: x + Math.sin(i * 1.257) * 0.07, y: 0.01, z: z + Math.cos(i * 1.257) * 0.07, ry: i * 1.257 });
      else b.cone(0.06, 0.18, '#58b03e', { x, y: 0.09, z }, 4);
    },
  },
  snow: {
    items: [
      { w: 5, r: 0.8, draw: (b, gl, x, z, r) => pine(b, x, z, 0.9 + r() * 0.6) },
      {
        w: 1.5, r: 0.5,
        draw: (b, gl, x, z, r) => {
          // снеговик
          b.sph(0.35, '#ffffff', { x, y: 0.25, z });
          b.sph(0.25, '#ffffff', { x, y: 0.72, z });
          b.sph(0.03, '#2b2b3a', { x: x - 0.08, y: 0.78, z: z + 0.23 });
          b.sph(0.03, '#2b2b3a', { x: x + 0.08, y: 0.78, z: z + 0.23 });
          b.cone(0.04, 0.16, '#ff8a3c', { x, y: 0.72, z: z + 0.3, rx: Math.PI / 2 });
          b.torus(0.2, 0.05, '#e84a4a', { x, y: 0.54, z, rx: Math.PI / 2 });
          b.cyl(0.13, 0.15, 0.2, '#2b2b3a', { x, y: 1.02, z }, 10);
          b.cyl(0.04, 0.04, 0.5, '#8a5a3a', { x: x + 0.35, y: 0.6, z, rz: -0.8 }, 4);
        },
      },
      {
        w: 1.5, r: 0.55,
        draw: (b, gl, x, z, r) => {
          // поленница
          for (let j = 0; j < 6; j++) b.cyl(0.11, 0.11, 0.7, j % 2 ? '#a0703e' : '#8a5a34', { x: x - 0.22 + (j % 3) * 0.22, y: 0.12 + Math.floor(j / 3) * 0.2, z, rx: Math.PI / 2 }, 8);
          b.box(0.75, 0.06, 0.75, '#ffffff', { x, y: 0.44, z });
        },
      },
      {
        w: 1, r: 0.6,
        draw: (b, gl, x, z, r) => {
          // санки
          b.rbox(0.45, 0.06, 0.9, 0.03, '#e84a4a', { x, y: 0.2, z });
          for (const sx of [-0.2, 0.2]) {
            b.box(0.03, 0.03, 1.0, '#c8ccd6', { x: x + sx, y: 0.04, z });
            b.box(0.03, 0.16, 0.03, '#c8ccd6', { x: x + sx, y: 0.12, z: z + 0.3 });
            b.box(0.03, 0.16, 0.03, '#c8ccd6', { x: x + sx, y: 0.12, z: z - 0.3 });
          }
        },
      },
      {
        w: 1.2, r: 0.7,
        draw: (b, gl, x, z, r) => {
          // костёр в кругу камней
          for (let i = 0; i < 8; i++) b.sph(0.1, '#8a8a98', { x: x + Math.cos(i * 0.785) * 0.35, y: 0.05, z: z + Math.sin(i * 0.785) * 0.35, sy: 0.7 });
          for (let i = 0; i < 3; i++) b.cyl(0.05, 0.05, 0.5, '#7a4a2a', { x, y: 0.08, z, rx: Math.PI / 2, ry: i * 1.05 }, 6);
          gl.cone(0.14, 0.4, '#ff8a2a', { x, y: 0.3, z }, 8);
          gl.cone(0.08, 0.26, '#ffe05a', { x, y: 0.26, z }, 8);
        },
      },
      {
        w: 0.8, r: 0.4,
        draw: (b, gl, x, z, r) => {
          // фонарик на столбике
          b.cyl(0.04, 0.04, 1.0, '#4a3a30', { x, y: 0.5, z }, 6);
          b.box(0.18, 0.22, 0.18, '#4a3a30', { x, y: 1.1, z });
          gl.box(0.13, 0.17, 0.19, '#ffd27a', { x, y: 1.1, z });
          b.cone(0.16, 0.12, '#ffffff', { x, y: 1.27, z }, 4);
        },
      },
    ],
    small: (b, x, z, r) => {
      const s = r();
      if (s < 0.55) b.hemi(0.18 + r() * 0.25, '#ffffff', { x, y: 0, z, sy: 0.4, sx: 1.4 });
      else if (s < 0.8) b.sph(0.09, '#9aa2b4', { x, y: 0.03, z, sy: 0.6 });
      else b.cone(0.12, 0.3, '#4cae66', { x, y: 0.15, z }, 6);
    },
  },
  night: {
    items: [
      {
        w: 3, r: 1.0,
        draw: (b, gl, x, z, r) => {
          // палатка ярмарки с полосатой крышей
          const c = ['#ff7aa2', '#7ae0ff', '#ffcf5a', '#a8ff7a'][Math.floor(r() * 4)];
          b.box(1.4, 0.8, 0.9, '#f4eeff', { x, y: 0.4, z });
          b.box(1.5, 0.08, 1.0, c, { x, y: 0.82, z });
          for (const sx of [-0.68, 0.68]) for (const sz of [-0.42, 0.42]) b.cyl(0.035, 0.035, 1.6, '#3a3058', { x: x + sx, y: 0.8, z: z + sz }, 6);
          for (let i = 0; i < 6; i++) b.box(0.25, 0.04, 1.1, i % 2 ? c : '#ffffff', { x: x - 0.63 + i * 0.25, y: 1.72, z, rx: 0 });
          b.cone(0.95, 0.4, c, { x, y: 1.95, z, sx: 1.1, sz: 0.85 }, 4);
          gl.box(1.2, 0.18, 0.02, '#fff4c0', { x, y: 1.4, z: z + 0.46 });
          for (let i = 0; i < 6; i++) gl.sph(0.04, ['#ffd23f', '#ff7aa2', '#7ae0ff'][i % 3], { x: x - 0.6 + i * 0.24, y: 1.62, z: z + 0.48 });
        },
      },
      {
        w: 2, r: 0.5,
        draw: (b, gl, x, z, r) => {
          // связка шариков
          for (let j = 0; j < 3; j++) {
            b.cyl(0.006, 0.006, 1.2, '#ffffff', { x: x + (j - 1) * 0.08, y: 0.6, z, rz: (j - 1) * 0.12 }, 4);
            b.sph(0.2, ['#ff7aa2', '#ffcf5a', '#7ae0ff'][j], { x: x + (j - 1) * 0.22, y: 1.3 + (j % 2) * 0.2, z, sy: 1.2 });
          }
          b.box(0.16, 0.12, 0.16, '#5e4f8c', { x, y: 0.06, z });
        },
      },
      {
        w: 2, r: 0.4,
        draw: (b, gl, x, z, r) => {
          // фонарик на столбике
          b.cyl(0.04, 0.04, 1.6, '#3a3058', { x, y: 0.8, z }, 6);
          gl.sph(0.2, ['#ffcf5a', '#ff7aa2', '#7ae0ff'][Math.floor(r() * 3)], { x, y: 1.75, z, sy: 1.2 });
        },
      },
      {
        w: 1, r: 0.5,
        draw: (b, gl, x, z, r) => {
          // карусельная лошадка-качалка и ящик с призами
          b.box(0.6, 0.4, 0.6, '#ffcf5a', { x, y: 0.2, z });
          b.box(0.62, 0.06, 0.62, '#ff7aa2', { x, y: 0.42, z });
          for (let i = 0; i < 3; i++) b.sph(0.12, ['#ff7aa2', '#7ae0ff', '#a8ff7a'][i], { x: x - 0.15 + i * 0.15, y: 0.55, z });
        },
      },
    ],
    small: (b, x, z, r) => {
      const s = r();
      if (s < 0.6) b.box(0.05, 0.01, 0.08, ['#ffd23f', '#ff7aa2', '#7ae0ff', '#a8ff7a'][Math.floor(r() * 4)], { x, y: 0.0, z, ry: r() * 3 });
      else b.rbox(0.3, 0.04, 0.3, 0.04, '#463c76', { x, y: -0.005, z, ry: r() });
    },
  },
};
for (const d of Object.values(DECO)) {
  const tot = d.items.reduce((s, i) => s + i.w, 0);
  d.pick = (u) => {
    let a = u * tot;
    for (const i of d.items) if ((a -= i.w) <= 0) return i;
    return d.items[0];
  };
}

// задний план: то, что видно над стеной кухни
const BACK = {
  home: (b, gl, L, R, BK, r) => {
    for (let x = L - 8; x < R + 8; x += 1.3 + r() * 0.6) tree(b, x, BK - 2.4 - r() * 3.5, 1.4 + r() * 0.9, ['#6cc24a', '#5cb84a', '#7ed957'][Math.floor(r() * 3)]);
    // домики вдали
    for (let x = L - 4; x < R + 4; x += 4.5 + r() * 2) {
      const z = BK - 7 - r() * 2;
      const c = ['#ffe1c2', '#ffd0d8', '#d8ecff', '#fff2b0'][Math.floor(r() * 4)];
      b.box(2.4, 2.2, 2.0, c, { x, y: 1.1, z });
      b.cone(1.9, 1.3, '#e8745a', { x, y: 2.85, z, ry: Math.PI / 4, sz: 0.8 }, 4);
      gl.box(0.5, 0.5, 0.02, '#fff2c8', { x: x - 0.5, y: 1.4, z: z + 1.01 });
      gl.box(0.5, 0.5, 0.02, '#fff2c8', { x: x + 0.5, y: 1.4, z: z + 1.01 });
    }
  },
  beach: (b, gl, L, R, BK, r) => {
    // море за кафе: вода, пена у берега, лодочка и буйки
    const z0 = BK - 3.2;
    b.box(R - L + 60, 0.05, 40, '#4cc4ee', { x: 0, y: -0.02, z: z0 - 20 });
    b.box(R - L + 60, 0.06, 1.2, '#7ad8f6', { x: 0, y: -0.015, z: z0 - 0.6 });
    for (let x = L - 14; x < R + 14; x += 0.7) b.sph(0.22, '#ffffff', { x: x + r() * 0.3, y: 0.0, z: z0 - 0.05 + r() * 0.15, sy: 0.25, sx: 1.6 });
    for (let i = 0; i < 26; i++) b.box(0.8 + r() * 1.2, 0.02, 0.06, '#9ae6ff', { x: L - 10 + r() * (R - L + 20), y: 0.02, z: z0 - 1.5 - r() * 9 });
    const bx = (L + R) / 2 + 2,
      bz = z0 - 5;
    b.rbox(1.6, 0.35, 0.6, 0.15, '#ff7a5a', { x: bx, y: 0.12, z: bz });
    b.box(1.3, 0.05, 0.45, '#ffffff', { x: bx, y: 0.3, z: bz });
    b.cyl(0.03, 0.03, 1.4, '#ffffff', { x: bx, y: 0.9, z: bz }, 6);
    b.cone(0.5, 1.0, '#ffffff', { x: bx + 0.25, y: 1.0, z: bz, sz: 0.1 }, 3);
    for (let i = 0; i < 3; i++) b.sph(0.15, i % 2 ? '#ffffff' : '#ff5a4a', { x: L - 2 + i * 5, y: 0.08, z: z0 - 2.5 - i * 0.8 });
    // пальмы вдоль берега
    for (let x = L - 7; x < R + 7; x += 2.8 + r() * 1.5) palm(b, x, BK - 1.8 - r() * 0.8, 1.1 + r() * 0.4);
  },
  snow: (b, gl, L, R, BK, r) => {
    for (let x = L - 8; x < R + 8; x += 1.2 + r() * 0.7) pine(b, x, BK - 2.2 - r() * 4, 1.3 + r() * 1.0);
    // горы вдали
    for (let x = L - 10; x < R + 12; x += 6 + r() * 3) {
      const h = 6 + r() * 4,
        z = BK - 12 - r() * 3;
      b.cone(4.5, h, '#9ab0cc', { x, y: h / 2, z }, 7);
      b.cone(4.5 * 0.42, h * 0.42, '#ffffff', { x, y: h - h * 0.21, z }, 7);
    }
  },
  night: (b, gl, L, R, BK, r) => {
    // колесо обозрения и шатры ярмарки
    const cx = R * 0.35,
      cz = BK - 6,
      cy = 4.2,
      rr = 3.4;
    b.torus(rr, 0.07, '#d8d0ff', { x: cx, y: cy, z: cz });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      b.box(0.05, rr, 0.05, '#b8b0e8', { x: cx + (Math.cos(a) * rr) / 2, y: cy + (Math.sin(a) * rr) / 2, z: cz, rz: a + Math.PI / 2 });
      gl.sph(0.09, ['#ffd23f', '#ff7aa2', '#7ae0ff'][i % 3], { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr, z: cz + 0.05 });
      b.rbox(0.45, 0.38, 0.4, 0.08, ['#ff7aa2', '#ffcf5a', '#7ae0ff', '#a8ff7a'][i % 4], { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr - 0.3, z: cz + 0.25 });
    }
    for (const sx of [-1, 1]) b.box(0.12, cy + 0.2, 0.12, '#8a7ad0', { x: cx + sx * 1.1, y: cy / 2, z: cz, rz: sx * 0.25 });
    gl.sph(0.25, '#fff4c0', { x: cx, y: cy, z: cz + 0.05 });
    for (let x = L - 7; x < R + 7; x += 2.6 + r() * 1.2) {
      const z = BK - 2.6 - r() * 2;
      const c = ['#ff7aa2', '#7ae0ff', '#ffcf5a', '#a8ff7a'][Math.floor(r() * 4)];
      b.cyl(0.9, 0.9, 1.6, '#f4eeff', { x, y: 0.8, z }, 8);
      b.cone(1.1, 1.3, c, { x, y: 2.25, z }, 8);
      b.sph(0.08, '#ffffff', { x, y: 2.95, z });
      gl.box(0.6, 0.8, 0.02, '#ffe7a0', { x, y: 0.6, z: z + 0.9 });
    }
  },
};
