// Данные паркура: физика, темы миров, скины, генератор 40 уровней из секций

// физика персонажа (метры, секунды)
export const PH = { r: 0.32, h: 1.6, speed: 6.6, accG: 48, accA: 22, grav: 25, jump: 9.2, bounce: 16.5, coyote: 0.11, buffer: 0.14, step: 0.32 };

// миры по 5 уровней. ice — скользко, grav — множитель гравитации, kill — уровень смерти (лава близко)
export const THEMES = [
  { id: 'meadow', sky: [0x5ab4f0, 0xd8f0ff], fog: 0xcfe9ff, top: [0x7ad65a, 0x5cc04a], side: [0xb8865a, 0x9c6e48], accent: 0xffd23a, below: 'sea' },
  { id: 'candy', sky: [0xff9ad0, 0xffe8f4], fog: 0xffe0f0, top: [0xff8ac0, 0xffd0e6], side: [0xffffff, 0xffb8d8], accent: 0x7ad0ff, below: 'clouds' },
  { id: 'desert', sky: [0xf0a050, 0xffe4b8], fog: 0xffe0b8, top: [0xf2d08a, 0xe8bc6a], side: [0xd89a5a, 0xc88448], accent: 0x4ac0b0, below: 'sand' },
  { id: 'ice', sky: [0x8fc8f0, 0xf0f8ff], fog: 0xe6f4ff, top: [0xe8f6ff, 0xbfe6ff], side: [0x8ac8f0, 0x6ab0e0], accent: 0xff6a8a, below: 'ice', ice: true },
  { id: 'jungle', sky: [0x6ac0a0, 0xe0f8e8], fog: 0xd0f0e0, top: [0x5ab04a, 0x3f9a40], side: [0x8a6a4a, 0x6f5236], accent: 0xffa03a, below: 'sea' },
  { id: 'volcano', sky: [0x3a1a2a, 0xc0503a], fog: 0x6a2a2a, top: [0x5a4a50, 0x6a5a5e], side: [0x3a2e34, 0x2e2428], accent: 0xffb03a, below: 'lava', kill: -2.5 },
  { id: 'neon', sky: [0x0a0a2a, 0x3a1a6a], fog: 0x1a1240, top: [0x2a2a5a, 0x3a2a6a], side: [0x1a1a3a, 0x24204a], accent: 0x3affe0, below: 'grid', neon: true },
  { id: 'space', sky: [0x05061a, 0x1a1a4a], fog: 0x0a0a2a, top: [0x9aa0c0, 0xb8bed8], side: [0x5a6080, 0x484e6a], accent: 0xc86aff, below: 'void', grav: 0.62 },
];
export const LEVELS = 40;
export const themeOf = (L) => THEMES[Math.min(THEMES.length - 1, Math.floor((L - 1) / 5))];

// скины: цвет тела, шапка; price 0 — бесплатный, ad — за рекламу
export const SKINS = [
  { id: 'red', body: 0xff5a5a, hat: 'cap', hatC: 0x3a6ae0, price: 0 },
  { id: 'blue', body: 0x4a8af0, hat: 'none', price: 150 },
  { id: 'green', body: 0x4cc06a, hat: 'leaf', hatC: 0x2f9a40, price: 300 },
  { id: 'cat', body: 0xffa04a, hat: 'ears', hatC: 0xffa04a, price: 0, ad: true },
  { id: 'pink', body: 0xff7ac0, hat: 'bow', hatC: 0xff3a8a, price: 600 },
  { id: 'ninja', body: 0x2a2a3a, hat: 'band', hatC: 0xff3a3a, price: 1000 },
  { id: 'bunny', body: 0xf6f0ff, hat: 'bunny', hatC: 0xf6f0ff, price: 0, ad: true },
  { id: 'king', body: 0x8a5ae0, hat: 'crown', hatC: 0xffd23a, price: 2000 },
  { id: 'astro', body: 0xe8eef8, hat: 'helmet', hatC: 0x9ad8ff, price: 3500 },
  { id: 'gold', body: 0xffc83a, hat: 'top', hatC: 0x2a2a3a, price: 6000 },
];

export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const lerp = (a, b, k) => a + (b - a) * k;

// максимальный зазор между краями платформ при перепаде высоты dy (с запасом для игрока)
export function maxGap(dy, gk = 1) {
  if (dy <= 0) return (3.5 + Math.min(1, -dy * 0.3)) * gk;
  return (3.5 - dy * 1.15) * gk;
}

// какие секции доступны с какого уровня
const SEG = [
  { k: 'hops', from: 1, w: 10 },
  { k: 'stairs', from: 1, w: 5 },
  { k: 'beam', from: 2, w: 5 },
  { k: 'turn', from: 1, w: 4 },
  { k: 'bounce', from: 3, w: 4 },
  { k: 'moving', from: 4, w: 6 },
  { k: 'fade', from: 6, w: 5 },
  { k: 'lift', from: 7, w: 3 },
  { k: 'sweeper', from: 8, w: 5 },
  { k: 'zigzag', from: 9, w: 4 },
  { k: 'disc', from: 11, w: 4 },
  { k: 'pillars', from: 13, w: 4 },
];

// генератор уровня. Возвращает платформы, косилки, монеты, чекпоинты, старт и финиш
export function genLevel(L) {
  const R = rng(L * 7919 + 13);
  const th = themeOf(L);
  const diff = Math.min(1, (L - 1) / 36);
  const gk = th.grav ? 1.12 : 1;
  const plats = [];
  const bars = [];
  const coins = [];
  const cps = [];
  const segs = [];
  let h = 0; // направление: 0 вперёд (+z), 1 вправо (+x), -1 влево (-x)
  const F = () => (h === 0 ? [0, 1] : [h, 0]);
  const Rt = () => (h === 0 ? [1, 0] : [0, -h]);
  // курсор — середина переднего края последней платформы
  const cur = { x: 0, y: 0, z: 3 };
  const add = (p) => {
    p.id = plats.length;
    plats.push(p);
    return p;
  };
  add({ x: 0, y: 0, z: 0, w: 6, d: 6, t: 1.2, start: true, c: 0 });
  // платформа по курсу: len — длина вдоль пути, wid — поперёк
  const place = (len, wid, gap, dy, lat = 0, extra = {}) => {
    const [fx, fz] = F(),
      [rx, rz] = Rt();
    const cx = cur.x + fx * (gap + len / 2) + rx * lat,
      cz = cur.z + fz * (gap + len / 2) + rz * lat;
    const y = cur.y + dy;
    const p = add({ x: cx, y, z: cz, w: h === 0 ? wid : len, d: h === 0 ? len : wid, t: extra.t || 0.8 + R() * 0.4, c: plats.length % 2, gap, dy, ...extra });
    cur.x = cx + fx * (len / 2);
    cur.z = cz + fz * (len / 2);
    cur.y = y;
    return p;
  };
  const coinAt = (x, y, z) => coins.push({ x, y, z });
  const coinOn = (p, n = 1) => {
    const [fx, fz] = F();
    for (let i = 0; i < n; i++) {
      const o = (i - (n - 1) / 2) * 0.9;
      coinAt(p.x + fx * o, p.y + 0.9, p.z + fz * o);
    }
  };
  // монета в воздухе посреди прыжка
  const coinGap = (a, b) => coinAt((a.x + b.x) / 2, Math.max(a.y, b.y) + 1.5, (a.z + b.z) / 2);
  const sizeP = lerp(2.6, 1.55, diff);
  const gapMax = Math.min(lerp(2.2, 3.2, diff), 3.4) * gk;
  const gapR = () => lerp(1.2, gapMax, 0.35 + R() * 0.65);
  let prev = plats[0];
  const nSeg = 8 + Math.floor(L * 0.45);
  const allowed = SEG.filter((s) => s.from <= L);
  let lastK = '';
  for (let i = 0; i < nSeg; i++) {
    if (i > 0 && i % 4 === 0) {
      const p = place(4, 4, 1.8, 0, 0, { cp: true, t: 1 });
      cps.push(p.id);
      prev = p;
    }
    // новая секция выпадает чаще (на своём уровне — обязательно)
    let k;
    const fresh = allowed.filter((s) => s.from === L || (s.from >= L - 2 && s.from > 1));
    if (i === 1 && fresh.length) k = fresh[Math.floor(R() * fresh.length)].k;
    else {
      const pool = allowed.filter((s) => s.k !== lastK && !(s.k === 'turn' && i === 0));
      const sum = pool.reduce((a, s) => a + s.w, 0);
      let x = R() * sum;
      k = pool[pool.length - 1].k;
      for (const s of pool) {
        x -= s.w;
        if (x <= 0) {
          k = s.k;
          break;
        }
      }
    }
    lastK = k;
    segs.push(k);
    const s0 = plats.length;
    if (k === 'hops') {
      const n = 3 + Math.floor(R() * 3);
      for (let j = 0; j < n; j++) {
        const dy = [-0.6, 0, 0, 0.5, 0.9][Math.floor(R() * 5)];
        const g = Math.min(gapR(), maxGap(dy, gk));
        const s = sizeP * (0.85 + R() * 0.35);
        const p = place(s, s, g, dy, (R() - 0.5) * s * 0.6);
        if (R() < 0.45) coinGap(prev, p);
        prev = p;
      }
    } else if (k === 'stairs') {
      const n = 4 + Math.floor(R() * 3);
      for (let j = 0; j < n; j++) {
        const p = place(1.7, 1.9, 1 + R() * 0.6, 0.8, 0, { t: 0.8 });
        if (j === n - 1) coinOn(p);
        prev = p;
      }
    } else if (k === 'beam') {
      const wid = lerp(1.1, 0.55, diff);
      const p = place(5 + R() * 4, wid, 1.6, 0, 0, { t: 0.5 });
      coinOn(p, 3);
      prev = p;
      if (L > 5 && R() < 0.5) {
        prev = place(4 + R() * 3, wid, 1.4, 0, R() < 0.5 ? 1.2 : -1.2, { t: 0.5 });
      }
    } else if (k === 'turn') {
      const p = place(3.4, 3.4, Math.min(gapR(), 2.6), 0, 0, { t: 1 });
      h = h === 0 ? (R() < 0.5 ? 1 : -1) : 0;
      const [fx, fz] = F();
      cur.x = p.x + fx * 1.7;
      cur.z = p.z + fz * 1.7;
      prev = p;
    } else if (k === 'bounce') {
      const p = place(3, 3, Math.min(gapR(), 2.6), 0, 0, { bounce: true, t: 1 });
      const hi = place(3.2, 3.2, 2.4 + R() * 0.8, 3.2, 0, { t: 1 });
      coinGap(p, hi);
      coinOn(hi);
      prev = hi;
    } else if (k === 'moving') {
      const n = 2 + Math.floor(R() * 2);
      for (let j = 0; j < n; j++) {
        const s = sizeP + 0.8;
        const amp = lerp(1.6, 2.4, diff);
        const [rx, rz] = Rt();
        const p = place(s, s, 2 + R() * 0.6 * gk, 0, 0, { mv: { ax: rx * amp, ay: 0, az: rz * amp, sp: lerp(0.85, 1.15, diff) * (0.9 + R() * 0.2), ph: R() * 6.28 } });
        coinOn(p);
        prev = p;
      }
    } else if (k === 'fade') {
      const n = 3 + Math.floor(R() * 3);
      for (let j = 0; j < n; j++) {
        const p = place(2.1, 2.1, 1.4 + R() * 1 * gk, R() < 0.3 ? 0.4 : 0, (R() - 0.5) * 1.2, { fade: true, t: 0.5 });
        prev = p;
      }
      coinOn(prev);
    } else if (k === 'lift') {
      const p = place(2.6, 2.6, 2, 0, 0, { mv: { ax: 0, ay: 1.5, az: 0, sp: 1.1, ph: 0 }, t: 0.6 });
      // верх лифта: cur.y + 1.5; следующая платформа на +2.1 от его середины
      const hi = place(3, 3, 1.6, 2.4, 0, { t: 1 });
      coinOn(hi);
      prev = hi;
      void p;
    } else if (k === 'sweeper') {
      const p = place(7.4, 5.4, Math.min(gapR(), 2.4), 0, 0, { t: 1 });
      const two = L >= 16 && R() < 0.5;
      bars.push({ x: p.x, y: p.y + 0.55, z: p.z, len: 2.4, sp: lerp(1.7, 2.6, diff) * (two ? 0.75 : 1) * (R() < 0.5 ? 1 : -1), ph: R() * 6.28, two });
      coinOn(p, 2);
      prev = p;
    } else if (k === 'zigzag') {
      const n = 4 + Math.floor(R() * 2);
      let side = R() < 0.5 ? 1 : -1;
      for (let j = 0; j < n; j++) {
        const p = place(1.5, 1.5, 0.9 + R() * 0.5, R() < 0.25 ? 0.4 : 0, side * 1.5, { t: 0.6 });
        side = -side;
        // курсор возвращаем к середине пути, чтобы зигзаг не уезжал
        const [rx, rz] = Rt();
        cur.x -= rx * side * -1.5;
        cur.z -= rz * side * -1.5;
        prev = p;
      }
      coinOn(prev);
    } else if (k === 'disc') {
      const r = 2.5;
      const p = place(r * 2, r * 2, Math.min(gapR(), 2.4), 0, 0, { disc: { r, w: lerp(0.6, 1.2, diff) * (R() < 0.5 ? 1 : -1) }, t: 0.6 });
      coinOn(p);
      prev = p;
    } else if (k === 'pillars') {
      const n = 3 + Math.floor(R() * 3);
      for (let j = 0; j < n; j++) {
        const r = lerp(0.8, 0.55, diff);
        const dy = j % 2 ? 0.6 : -0.3;
        const p = place(r * 2, r * 2, Math.min(lerp(1.8, 2.8, diff), maxGap(dy, gk)), dy, 0, { pillar: r, t: 6 });
        if (R() < 0.4) coinGap(prev, p);
        prev = p;
      }
    }
    for (let j = s0; j < plats.length; j++) plats[j].seg = k;
  }
  const fin = place(7, 7, 2, 0, 0, { finish: true, t: 1.4 });
  coinOn(fin, 3);
  // предел падения
  let minY = Infinity;
  for (const p of plats) minY = Math.min(minY, p.y);
  const kill = th.kill !== undefined ? minY + th.kill : minY - 14;
  // эталонное время для трёх звёзд
  let dist = 0;
  for (let j = 1; j < plats.length; j++) dist += Math.hypot(plats[j].x - plats[j - 1].x, plats[j].z - plats[j - 1].z);
  const hard = plats.filter((p) => p.mv || p.fade || p.disc).length + bars.length * 2;
  const par = Math.round(dist / 4.2 + hard * 1.2 + 4);
  return { L, theme: th, plats, bars, coins, cps, segs, start: { x: 0, y: 0, z: 0 }, finish: fin.id, kill, par, dist };
}

// звёзды за время
export function starsFor(time, par) {
  return time <= par ? 3 : time <= par * 1.6 ? 2 : 1;
}

// проверка проходимости: соседние неподвижные платформы — зазор и перепад в пределах прыжка
export function validate(lv) {
  const bad = [];
  const P = lv.plats;
  const gk = lv.theme.grav ? 1.12 : 1;
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1],
      b = P[i];
    if (a.mv || b.mv) continue;
    // расстояние между краями прямоугольников в плоскости
    const dx = Math.max(0, Math.abs(a.x - b.x) - (a.w + b.w) / 2);
    const dz = Math.max(0, Math.abs(a.z - b.z) - (a.d + b.d) / 2);
    const gap = Math.hypot(dx, dz);
    const dy = b.y - a.y;
    const lim = a.bounce ? 6 : maxGap(dy, gk);
    if (gap > lim + 0.01 || (!a.bounce && dy > 1.25)) bad.push({ i, gap: +gap.toFixed(2), dy: +dy.toFixed(2), lim: +lim.toFixed(2), seg: b.seg });
  }
  // перекрытия платформ (кроме соседних)
  for (let i = 0; i < P.length; i++)
    for (let j = i + 2; j < P.length; j++) {
      const a = P[i],
        b = P[j];
      if (a.mv || b.mv) continue;
      const ox = Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 0.05;
      const oz = Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 0.05;
      const oy = Math.abs(a.y - b.y) < 2.2;
      if (ox && oz && oy) bad.push({ overlap: [i, j] });
    }
  return bad;
}
