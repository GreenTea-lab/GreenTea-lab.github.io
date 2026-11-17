// Мебель и декор. Каждая функция строит предмет в локальных координатах:
// центр основания в (0,0,0), перед смотрит на +z, спинка у стены (z = -d/2).
import { rng } from './tex.js';

export const C = {
  dark: 0x4a2e1c,
  mid: 0x7a5234,
  light: 0xa4784e,
  red: 0x7a2424,
  green: 0x2e4a34,
  blue: 0x2a3a5a,
  cream: 0xd8ccb0,
  white: 0xe8e4dc,
  brass: 0xb8903c,
  iron: 0x3c3c40,
  black: 0x1a1a1c,
};

const BOOK = [0x6a1e1e, 0x1e3a5a, 0x2a4a2a, 0x5a4a2a, 0x3a1e3a, 0x8a6a3a, 0x2a2a2a, 0x7a3a1e, 0x4a5a6a, 0x6a5a4a];

// ряд книг на полке шириной w
function books(b, w, y, z, R, depth = 0.24, h = 0.3) {
  let x = -w / 2 + 0.03;
  while (x < w / 2 - 0.06) {
    if (R() < 0.08) {
      // пустое место / книга лежит
      if (R() < 0.5) b.boxOn('plain', BOOK[(R() * 10) | 0], 0.22, 0.04, 0.16, x + 0.11, y, z, R() * 0.4);
      x += 0.16;
      continue;
    }
    const bw = 0.03 + R() * 0.04,
      bh = h * (0.7 + R() * 0.3);
    const tilt = R() < 0.07 ? 0.25 : 0;
    b.box('plain', BOOK[(R() * 10) | 0], bw, bh, depth * (0.8 + R() * 0.2), x + bw / 2, y + bh / 2, z, 0, 0, tilt);
    // корешок с золотой полоской
    if (R() < 0.5) b.box('plain', C.brass, bw + 0.002, 0.01, 0.005, x + bw / 2, y + bh * 0.8, z + depth * 0.42);
    x += bw + 0.004;
  }
}

export const PROPS = {
  // ---------- шкаф (можно спрятаться) ----------
  wardrobe: {
    w: 1,
    d: 0.65,
    blocks: true,
    hide: true,
    fn(b, R) {
      const w = 1.05,
        d = 0.62,
        h = 2.15;
      b.boxOn('wood', C.dark, w, h, d, 0, 0.08, 0);
      // ножки
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.boxOn('wood', C.dark, 0.08, 0.08, 0.08, sx * (w / 2 - 0.06), 0, sz * (d / 2 - 0.06));
      // карниз
      b.boxOn('wood', C.mid, w + 0.1, 0.08, d + 0.08, 0, h + 0.08, 0);
      b.boxOn('wood', C.dark, w + 0.04, 0.12, d + 0.02, 0, h - 0.04, 0);
      // резной гребень
      b.boxOn('wood', C.mid, 0.5, 0.12, 0.04, 0, h + 0.16, d / 2 - 0.02);
      b.cyl('wood', C.mid, 0.06, 0.06, 0.04, 10, 0, h + 0.28, d / 2 - 0.02, Math.PI / 2);
      // дверцы с филёнками
      for (const sx of [-1, 1]) {
        b.box('wood', C.mid, w / 2 - 0.04, h - 0.25, 0.03, sx * (w / 4), 0.08 + h / 2, d / 2 + 0.01);
        b.box('wood', C.dark, w / 2 - 0.16, 0.7, 0.02, sx * (w / 4), 1.55, d / 2 + 0.03);
        b.box('wood', C.dark, w / 2 - 0.16, 0.9, 0.02, sx * (w / 4), 0.75, d / 2 + 0.03);
        // щели-жалюзи на верхней филёнке
        for (let i = 0; i < 5; i++) b.box('plain', C.black, w / 2 - 0.22, 0.025, 0.02, sx * (w / 4), 1.35 + i * 0.09, d / 2 + 0.04);
        b.sphere('metal', C.brass, 0.025, sx * 0.06, 1.15, d / 2 + 0.06);
      }
      b.collide(-w / 2, -d / 2, w / 2, d / 2, h);
    },
  },

  bookshelf: {
    w: 1,
    d: 0.42,
    blocks: true,
    fn(b, R) {
      const w = 1,
        d = 0.38,
        h = 2.2;
      b.boxOn('wood', C.dark, 0.05, h, d, -w / 2 + 0.025, 0, 0);
      b.boxOn('wood', C.dark, 0.05, h, d, w / 2 - 0.025, 0, 0);
      b.boxOn('wood', C.dark, w, h, 0.03, 0, 0, -d / 2 + 0.015);
      b.boxOn('wood', C.mid, w + 0.06, 0.06, d + 0.04, 0, h, 0);
      for (let i = 0; i < 5; i++) {
        const y = 0.08 + i * 0.43;
        b.boxOn('wood', C.mid, w - 0.08, 0.03, d - 0.02, 0, y, 0);
        if (i < 4 || R() < 0.5) books(b, w - 0.12, y + 0.03, 0.02, R, 0.26, 0.32);
        if (i >= 1 && i <= 3 && R() < 0.4) b.spot((R() - 0.5) * 0.5, y + 0.035, 0.12);
      }
      b.collide(-w / 2, -d / 2, w / 2, d / 2, h);
    },
  },

  bed: {
    w: 1.5,
    d: 2.1,
    blocks: true,
    fn(b, R, o = {}) {
      const w = o.small ? 1 : 1.45,
        L = o.small ? 1.6 : 2.05;
      const z0 = -L / 2;
      b.push(0, 0, o.small ? -0.22 : 0, 0);
      // изголовье со столбиками
      b.boxOn('wood', C.dark, w, 1.1, 0.07, 0, 0, z0 + 0.04);
      for (const sx of [-1, 1]) {
        b.cyl('wood', C.mid, 0.045, 0.05, 1.3, 8, sx * (w / 2), 0.65, z0 + 0.04);
        b.sphere('wood', C.mid, 0.065, sx * (w / 2), 1.33, z0 + 0.04);
        b.cyl('wood', C.mid, 0.04, 0.045, 0.7, 8, sx * (w / 2), 0.35, -z0 - 0.04);
      }
      for (let i = 0; i < 5; i++) b.boxOn('wood', C.mid, 0.03, 0.55, 0.03, -w / 2 + 0.2 + (i * (w - 0.4)) / 4, 0.45, z0 + 0.09);
      b.boxOn('wood', C.dark, w, 0.5, 0.06, 0, 0, -z0 - 0.04);
      // рама и матрас
      b.boxOn('wood', C.dark, w, 0.2, L, 0, 0.18, 0);
      b.boxOn('fabric', C.white, w - 0.06, 0.18, L - 0.14, 0, 0.38, 0);
      // одеяло со складкой
      const col = o.small ? 0x6a8ab0 : [C.red, C.green, 0x5a4a7a][(R() * 3) | 0];
      b.boxOn('fabric', col, w + 0.04, 0.08, L * 0.62, 0, 0.53, L * 0.17);
      b.box('fabric', col, w + 0.04, 0.4, 0.06, 0, 0.4, L * 0.17 + L * 0.31, 0);
      b.box('fabric', col, 0.06, 0.3, L * 0.62, -w / 2 - 0.02, 0.43, L * 0.17);
      b.box('fabric', col, 0.06, 0.3, L * 0.62, w / 2 + 0.02, 0.43, L * 0.17);
      b.boxOn('fabric', C.white, w - 0.1, 0.06, 0.25, 0, 0.56, -L * 0.15);
      // подушки
      const pw = o.small ? 0.6 : (w - 0.2) / 2;
      for (let i = 0; i < (o.small ? 1 : 2); i++) b.sphere('fabric', C.cream, 0.5, (o.small ? 0 : (i - 0.5) * (pw + 0.04)), 0.62, z0 + 0.3, pw, 0.22, 0.5);
      if (o.small) {
        // плюшевый мишка
        b.sphere('fabric', 0x8a5a3a, 0.12, 0.2, 0.68, z0 + 0.55);
        b.sphere('fabric', 0x8a5a3a, 0.09, 0.2, 0.86, z0 + 0.55);
        b.sphere('fabric', 0x8a5a3a, 0.035, 0.14, 0.94, z0 + 0.55);
        b.sphere('fabric', 0x8a5a3a, 0.035, 0.26, 0.94, z0 + 0.55);
        b.sphere('plain', C.black, 0.012, 0.17, 0.88, z0 + 0.63);
        b.sphere('plain', C.black, 0.012, 0.23, 0.88, z0 + 0.63);
      }
      b.spot(w * 0.25, 0.58, L * 0.25);
      b.collide(-w / 2, -L / 2, w / 2, L / 2, 0.6);
      b.pop();
    },
  },

  nightstand: {
    w: 0.6,
    d: 0.5,
    blocks: true,
    fn(b, R) {
      b.boxOn('wood', C.mid, 0.5, 0.58, 0.42, 0, 0.06, 0);
      b.boxOn('wood', C.dark, 0.54, 0.03, 0.46, 0, 0.64, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.boxOn('wood', C.dark, 0.04, 0.06, 0.04, sx * 0.22, 0, sz * 0.18);
      b.box('wood', C.dark, 0.42, 0.18, 0.02, 0, 0.5, 0.215);
      b.sphere('metal', C.brass, 0.018, 0, 0.5, 0.235);
      b.box('wood', C.dark, 0.42, 0.26, 0.02, 0, 0.22, 0.215);
      // подсвечник с огарком
      b.cyl('metal', C.brass, 0.05, 0.06, 0.02, 10, 0.12, 0.68, -0.05);
      b.cyl('plain', C.cream, 0.018, 0.02, 0.09, 8, 0.12, 0.735, -0.05);
      // будильник
      if (R() < 0.6) {
        b.cyl('metal', 0x8a2a2a, 0.06, 0.06, 0.04, 12, -0.1, 0.73, -0.02, Math.PI / 2);
        b.cyl('plain', C.cream, 0.05, 0.05, 0.005, 12, -0.1, 0.73, 0.0, Math.PI / 2);
        b.sphere('metal', C.brass, 0.02, -0.14, 0.79, -0.02);
        b.sphere('metal', C.brass, 0.02, -0.06, 0.79, -0.02);
      }
      b.spot(-0.05, 0.655, 0.1);
      b.collide(-0.27, -0.23, 0.27, 0.23, 0.66);
    },
  },

  dresser: {
    w: 1.2,
    d: 0.55,
    blocks: true,
    fn(b, R) {
      b.boxOn('wood', C.dark, 1.15, 0.86, 0.5, 0, 0.06, 0);
      b.boxOn('wood', C.mid, 1.2, 0.04, 0.54, 0, 0.92, 0);
      for (let i = 0; i < 3; i++) {
        b.box('wood', C.mid, 1.05, 0.22, 0.02, 0, 0.2 + i * 0.27, 0.255);
        for (const sx of [-1, 1]) b.box('metal', C.brass, 0.1, 0.02, 0.02, sx * 0.28, 0.2 + i * 0.27, 0.275);
      }
      for (const sx of [-1, 1]) b.boxOn('wood', C.dark, 0.06, 0.06, 0.06, sx * 0.52, 0, 0.2);
      // зеркало в раме (тёмное)
      b.boxOn('wood', C.dark, 0.7, 0.85, 0.04, 0, 0.96, -0.22);
      b.boxOn('mirror', 0x9aa4b0, 0.6, 0.75, 0.01, 0, 1.01, -0.195);
      // шкатулка, флакон
      b.boxOn('wood', C.red, 0.18, 0.08, 0.12, -0.38, 0.96, 0.05);
      b.cyl('glass', 0x9ac0b0, 0.03, 0.04, 0.12, 8, 0.4, 1.02, 0.02);
      b.spot(0.15, 0.965, 0.1);
      b.collide(-0.6, -0.27, 0.6, 0.27, 0.95);
    },
  },

  sofa: {
    w: 2,
    d: 0.95,
    blocks: true,
    fn(b, R) {
      const col = [C.red, C.green, 0x5a3a5a][(R() * 3) | 0];
      b.boxOn('fabric', col, 1.9, 0.42, 0.85, 0, 0.1, 0);
      b.boxOn('fabric', col, 1.9, 0.5, 0.22, 0, 0.45, -0.32);
      for (const sx of [-1, 1]) {
        b.boxOn('fabric', col, 0.2, 0.62, 0.85, sx * 0.95, 0.1, 0);
        b.cyl('fabric', col, 0.13, 0.13, 0.85, 10, sx * 0.95, 0.72, 0, Math.PI / 2);
      }
      for (let i = 0; i < 3; i++) b.boxOn('fabric', col, 0.56, 0.1, 0.6, -0.6 + i * 0.6, 0.52, 0.06);
      // пуговицы-стяжки на спинке
      for (let i = 0; i < 6; i++) b.sphere('fabric', 0x1a1010, 0.015, -0.75 + i * 0.3, 0.78, -0.2);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl('wood', C.dark, 0.03, 0.02, 0.1, 6, sx * 0.9, 0.05, sz * 0.36);
      // подушка и плед
      b.boxOn('fabric', C.cream, 0.35, 0.3, 0.12, -0.6, 0.6, -0.15, 0.3);
      b.box('fabric', 0x6a5a3a, 0.5, 0.04, 0.9, 0.6, 0.64, 0.02, 0, 0, 0.05);
      b.spot(0.1, 0.63, 0.15);
      b.collide(-1.05, -0.45, 1.05, 0.45, 0.65);
    },
  },

  armchair: {
    w: 1,
    d: 0.9,
    blocks: true,
    fn(b, R) {
      const col = [C.red, C.green, 0x6a4a2a][(R() * 3) | 0];
      b.boxOn('fabric', col, 0.8, 0.4, 0.75, 0, 0.12, 0);
      b.boxOn('fabric', col, 0.8, 0.75, 0.18, 0, 0.45, -0.3);
      // «уши» кресла
      for (const sx of [-1, 1]) {
        b.boxOn('fabric', col, 0.16, 0.36, 0.75, sx * 0.42, 0.42, 0);
        b.boxOn('fabric', col, 0.12, 0.5, 0.2, sx * 0.38, 0.75, -0.28);
      }
      b.boxOn('fabric', col, 0.62, 0.1, 0.58, 0, 0.52, 0.05);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl('wood', C.dark, 0.035, 0.025, 0.12, 6, sx * 0.34, 0.06, sz * 0.3);
      b.spot(0, 0.63, 0.1);
      b.collide(-0.5, -0.42, 0.5, 0.42, 0.62);
    },
  },

  fireplace: {
    w: 1.8,
    d: 0.6,
    blocks: true,
    fire: true,
    fn(b, R) {
      // каменный портал
      b.boxOn('plain', 0x6a625a, 1.7, 1.15, 0.5, 0, 0, -0.05);
      b.boxOn('plain', 0x1a1410, 0.9, 0.75, 0.3, 0, 0.12, 0.08);
      b.boxOn('wood', C.dark, 1.9, 0.08, 0.6, 0, 1.15, 0);
      b.boxOn('plain', 0x5a524a, 1.8, 0.1, 0.62, 0, 0, 0.05);
      // кирпичики
      for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) b.box('plain', 0x7a6a5e, 0.22, 0.12, 0.02, -0.68 + i * 0.226, 0.25 + j * 0.24, 0.205);
      // дрова и угли
      for (let i = 0; i < 3; i++) b.cyl('wood', 0x3a2414, 0.05, 0.05, 0.6, 7, 0, 0.18 + (i === 2 ? 0.08 : 0), 0.05 + (i - 1) * 0.06, 0, 0, Math.PI / 2 + (i - 1) * 0.15);
      b.sphere('glow', 0xff7020, 0.12, -0.12, 0.2, 0.06, 1.4, 0.6, 1);
      b.sphere('glow', 0xffa040, 0.08, 0.12, 0.22, 0.08, 1.2, 0.8, 1);
      // решётка
      for (let i = 0; i < 6; i++) b.cyl('metal', C.iron, 0.008, 0.008, 0.4, 4, -0.3 + i * 0.12, 0.3, 0.33);
      b.box('metal', C.iron, 0.75, 0.02, 0.02, 0, 0.5, 0.33);
      // часы и подсвечники на полке
      b.boxOn('wood', C.dark, 0.3, 0.32, 0.14, 0, 1.23, -0.05);
      b.cyl('plain', C.cream, 0.1, 0.1, 0.02, 14, 0, 1.42, 0.03, Math.PI / 2);
      for (const sx of [-1, 1]) {
        b.cyl('metal', C.brass, 0.05, 0.06, 0.02, 8, sx * 0.6, 1.24, 0);
        b.cyl('metal', C.brass, 0.012, 0.012, 0.22, 6, sx * 0.6, 1.35, 0);
        b.cyl('plain', C.cream, 0.018, 0.018, 0.1, 6, sx * 0.6, 1.5, 0);
      }
      b.cyl('plain', 0x4a5a6a, 0.06, 0.08, 0.2, 10, -0.35, 1.33, 0);
      b.spot(0.35, 1.235, 0.05);
      b.collide(-0.9, -0.3, 0.9, 0.35, 1.2);
    },
  },

  piano: {
    w: 1.6,
    d: 0.65,
    blocks: true,
    fn(b, R) {
      b.boxOn('wood', C.black, 1.5, 1.25, 0.45, 0, 0, -0.08);
      b.boxOn('wood', C.black, 1.5, 0.12, 0.28, 0, 0.7, 0.24);
      b.boxOn('plain', C.white, 1.36, 0.03, 0.15, 0, 0.82, 0.25);
      for (let i = 0; i < 26; i++) if (i % 7 !== 2 && i % 7 !== 6) b.boxOn('plain', C.black, 0.025, 0.03, 0.09, -0.66 + i * 0.052 + 0.026, 0.85, 0.22);
      for (const sx of [-1, 1]) b.boxOn('wood', C.black, 0.07, 0.7, 0.07, sx * 0.7, 0, 0.3);
      b.box('wood', 0x2a2420, 1.2, 0.45, 0.02, 0, 1.05, 0.15);
      // ноты и метроном
      b.box('plain', C.cream, 0.4, 0.28, 0.01, 0, 1.0, 0.17, 0, -0.2);
      b.cyl('wood', C.mid, 0.02, 0.07, 0.2, 4, 0.5, 1.35, -0.05);
      b.spot(-0.3, 1.255, -0.05);
      b.collide(-0.78, -0.32, 0.78, 0.38, 1.25);
    },
  },

  clock: {
    w: 0.6,
    d: 0.4,
    blocks: true,
    clock: true,
    fn(b, R) {
      b.boxOn('wood', C.dark, 0.5, 0.4, 0.34, 0, 0, 0);
      b.boxOn('wood', C.mid, 0.4, 1.1, 0.28, 0, 0.4, 0);
      b.boxOn('wood', C.dark, 0.5, 0.55, 0.34, 0, 1.5, 0);
      b.boxOn('wood', C.mid, 0.56, 0.08, 0.38, 0, 2.05, 0);
      b.cyl('plain', C.cream, 0.17, 0.17, 0.02, 20, 0, 1.78, 0.17, Math.PI / 2);
      b.torus('metal', C.brass, 0.17, 0.015, 0, 1.78, 0.18);
      for (let i = 0; i < 12; i++) b.box('plain', C.black, 0.01, 0.03, 0.01, Math.sin((i / 12) * 6.28) * 0.14, 1.78 + Math.cos((i / 12) * 6.28) * 0.14, 0.185, 0, 0, -(i / 12) * 6.28);
      b.box('plain', C.black, 0.012, 0.12, 0.01, 0.03, 1.82, 0.19, 0, 0, -0.5);
      b.box('plain', C.black, 0.01, 0.09, 0.01, -0.03, 1.76, 0.19, 0, 0, 2.2);
      b.box('glass', 0x3a4048, 0.3, 0.9, 0.01, 0, 0.92, 0.145);
      b.collide(-0.26, -0.18, 0.26, 0.18, 2.1);
    },
  },

  sideboard: {
    w: 1.6,
    d: 0.55,
    blocks: true,
    fn(b, R) {
      b.boxOn('wood', C.dark, 1.5, 0.85, 0.48, 0, 0.1, 0);
      b.boxOn('wood', C.mid, 1.56, 0.04, 0.52, 0, 0.95, 0);
      for (let i = 0; i < 3; i++) {
        b.box('wood', C.mid, 0.44, 0.6, 0.02, -0.5 + i * 0.5, 0.45, 0.245);
        b.sphere('metal', C.brass, 0.02, -0.5 + i * 0.5 + 0.15, 0.5, 0.26);
      }
      for (const sx of [-1, 1]) b.cyl('wood', C.dark, 0.035, 0.025, 0.1, 6, sx * 0.7, 0.05, 0.18);
      // посуда
      b.cyl('plain', C.white, 0.08, 0.06, 0.12, 12, -0.5, 1.05, 0);
      b.cyl('plain', C.white, 0.06, 0.04, 0.03, 12, -0.5, 1.12, 0);
      b.cyl('metal', C.brass, 0.05, 0.08, 0.3, 10, 0.5, 1.12, -0.05);
      b.sphere('metal', C.brass, 0.05, 0.5, 1.3, -0.05);
      // тарелки на подставке
      for (let i = 0; i < 3; i++) b.cyl('plain', 0xd0c8b8, 0.12, 0.12, 0.01, 16, -0.05 + i * 0.13, 1.1, -0.18, Math.PI / 2 - 0.2);
      b.spot(0.1, 0.97, 0.12);
      b.collide(-0.78, -0.26, 0.78, 0.26, 0.97);
    },
  },

  counter: {
    w: 1,
    d: 0.65,
    blocks: true,
    fn(b, R, o = {}) {
      b.boxOn('wood', 0x6a7a6a, 1, 0.85, 0.6, 0, 0.05, 0);
      b.boxOn('plain', 0x2a2a28, 0.96, 0.05, 0.56, 0, 0, 0.02);
      b.boxOn('plain', 0xb0a898, 1.02, 0.05, 0.64, 0, 0.9, 0);
      for (const sx of [-1, 1]) {
        b.box('wood', 0x7a8a7a, 0.44, 0.55, 0.02, sx * 0.24, 0.45, 0.305);
        b.box('metal', C.brass, 0.02, 0.1, 0.02, sx * 0.06, 0.6, 0.32);
      }
      b.box('wood', 0x7a8a7a, 0.94, 0.14, 0.02, 0, 0.82, 0.305);
      if (o.sink) {
        b.boxOn('metal', 0x9aa0a4, 0.5, 0.04, 0.4, 0, 0.92, 0.02);
        b.boxOn('plain', 0x404448, 0.42, 0.03, 0.32, 0, 0.94, 0.02);
        b.cyl('metal', 0xb0b4b8, 0.015, 0.015, 0.25, 6, 0, 1.06, -0.22);
        b.cyl('metal', 0xb0b4b8, 0.012, 0.012, 0.15, 6, 0, 1.18, -0.15, Math.PI / 2);
      } else {
        // банки, доска, кастрюля
        const k = (R() * 3) | 0;
        if (k === 0) {
          for (let i = 0; i < 3; i++) b.cyl('glass', [0xa08040, 0x8a3a2a, 0x6a8a4a][i], 0.05, 0.05, 0.16 - i * 0.02, 10, -0.3 + i * 0.12, 1.0, -0.18);
          b.boxOn('wood', C.light, 0.35, 0.02, 0.25, 0.2, 0.95, 0.05);
        } else if (k === 1) {
          b.cyl('metal', 0x5a5a60, 0.13, 0.12, 0.15, 14, 0.1, 1.03, 0);
          b.cyl('metal', 0x5a5a60, 0.14, 0.14, 0.01, 14, 0.1, 1.11, 0);
        } else {
          b.cyl('plain', C.white, 0.09, 0.06, 0.1, 12, -0.15, 1.0, 0);
          b.box('plain', 0xb08a50, 0.25, 0.08, 0.12, 0.2, 0.99, -0.1, 0.3);
        }
      }
      b.spot((R() - 0.5) * 0.4, 0.95, 0.15);
      b.collide(-0.5, -0.32, 0.5, 0.32, 0.95);
    },
  },

  stove: {
    w: 1,
    d: 0.7,
    blocks: true,
    fn(b, R) {
      b.boxOn('metal', 0xd8d4c8, 0.9, 0.85, 0.62, 0, 0.05, 0);
      b.boxOn('metal', C.black, 0.92, 0.04, 0.64, 0, 0.9, 0);
      b.box('glass', 0x1a1a1a, 0.6, 0.35, 0.02, 0, 0.42, 0.315);
      b.box('metal', 0xb0b0b0, 0.6, 0.03, 0.04, 0, 0.66, 0.34);
      for (let i = 0; i < 4; i++) b.sphere('plain', C.black, 0.025, -0.3 + i * 0.2, 0.78, 0.32);
      for (const [x, z] of [[-0.22, -0.13], [0.22, -0.13], [-0.22, 0.15], [0.22, 0.15]]) b.torus('metal', C.iron, 0.09, 0.015, x, 0.95, z, Math.PI / 2);
      // чайник
      b.sphere('metal', 0x8a3a2a, 0.11, 0.22, 1.04, -0.13, 1, 0.8, 1);
      b.cyl('metal', 0x8a3a2a, 0.02, 0.03, 0.12, 6, 0.36, 1.06, -0.13, 0, 0, 0.9);
      b.torus('metal', C.black, 0.07, 0.01, 0.22, 1.13, -0.13, 0, 0, 0, Math.PI);
      // вытяжка-труба
      b.boxOn('metal', 0x8a8a84, 0.5, 0.3, 0.3, 0, 2.0, -0.15);
      b.boxOn('metal', 0x8a8a84, 0.2, 0.6, 0.2, 0, 2.3, -0.2);
      b.collide(-0.46, -0.32, 0.46, 0.32, 0.95);
    },
  },

  fridge: {
    w: 0.9,
    d: 0.75,
    blocks: true,
    fn(b, R) {
      b.boxOn('plain', 0xe0dcd0, 0.78, 1.7, 0.68, 0, 0.04, 0);
      b.cyl('plain', 0xe0dcd0, 0.34, 0.34, 0.78, 16, 0, 1.74, 0, 0, 0, Math.PI / 2);
      b.box('plain', 0xc8c4b8, 0.76, 0.01, 0.01, 0, 1.3, 0.345);
      b.box('metal', 0xb0b0b0, 0.05, 0.25, 0.05, 0.3, 1.1, 0.37);
      b.box('metal', 0xb8903c, 0.18, 0.04, 0.01, 0, 1.6, 0.345);
      // магниты и рисунок
      b.box('plain', 0xe8e0c8, 0.18, 0.22, 0.005, -0.15, 1.05, 0.345, 0, 0, 0.1);
      b.sphere('plain', C.red, 0.015, -0.15, 1.15, 0.35);
      b.collide(-0.4, -0.35, 0.4, 0.35, 1.9);
    },
  },

  kitchenShelf: {
    w: 1,
    d: 0.35,
    blocks: true,
    fn(b, R) {
      b.boxOn('wood', C.mid, 1, 1.9, 0.03, 0, 0, -0.15);
      for (const sx of [-1, 1]) b.boxOn('wood', C.dark, 0.04, 1.9, 0.32, sx * 0.48, 0, 0);
      for (let i = 0; i < 4; i++) {
        const y = 0.3 + i * 0.45;
        b.boxOn('wood', C.mid, 0.92, 0.03, 0.3, 0, y, 0);
        for (let k = 0; k < 4; k++) {
          const x = -0.33 + k * 0.22;
          if (R() < 0.75) {
            if (R() < 0.6) {
              const c = [0xa08040, 0x8a3a2a, 0x6a8a4a, 0xc8b070, 0x7a4a6a][(R() * 5) | 0];
              const h = 0.12 + R() * 0.1;
              b.cyl('glass', c, 0.055, 0.055, h, 10, x, y + 0.03 + h / 2, 0);
              b.cyl('plain', [C.red, 0xe0d8c0][(R() * 2) | 0], 0.06, 0.06, 0.025, 10, x, y + 0.04 + h, 0);
            } else b.boxOn('plain', [0xb08a50, 0x8a6a4a, 0xc0b090][(R() * 3) | 0], 0.14, 0.18 + R() * 0.1, 0.12, x, y + 0.03, 0, R() * 0.3);
          } else if (R() < 0.5) b.spot(x, y + 0.035, 0.03);
        }
      }
      b.collide(-0.5, -0.17, 0.5, 0.17, 1.9);
    },
  },

  bathtub: {
    w: 1.8,
    d: 0.8,
    blocks: true,
    fn(b, R) {
      b.boxOn('plain', C.white, 1.65, 0.48, 0.72, 0, 0.14, 0);
      b.cyl('plain', C.white, 0.36, 0.36, 0.48, 14, -0.82, 0.38, 0);
      b.cyl('plain', C.white, 0.36, 0.36, 0.48, 14, 0.82, 0.38, 0);
      b.boxOn('plain', 0x5a6a6a, 1.6, 0.02, 0.6, 0, 0.5, 0);
      b.torus('plain', C.white, 0.35, 0.03, -0.82, 0.62, 0, Math.PI / 2);
      b.torus('plain', C.white, 0.35, 0.03, 0.82, 0.62, 0, Math.PI / 2);
      b.box('plain', C.white, 1.64, 0.06, 0.06, 0, 0.62, 0.34);
      b.box('plain', C.white, 1.64, 0.06, 0.06, 0, 0.62, -0.34);
      // лапы
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.sphere('metal', C.brass, 0.06, sx * 0.7, 0.07, sz * 0.25, 1, 1.2, 1);
      // кран и шторка
      b.cyl('metal', C.brass, 0.02, 0.02, 0.3, 6, -0.95, 0.8, -0.2);
      b.cyl('metal', C.brass, 0.015, 0.015, 0.2, 6, -0.88, 0.94, -0.2, 0, 0, Math.PI / 2);
      b.cyl('metal', C.brass, 0.012, 0.012, 1.8, 6, 0, 2.0, 0.35, 0, 0, Math.PI / 2);
      for (let i = 0; i < 9; i++) b.box('fabric', 0xc8d8d0, 0.12, 1.2, 0.02, -0.85 + i * 0.07, 1.38, 0.36 + (i % 2) * 0.03, (i % 2 ? 0.4 : -0.4));
      b.collide(-0.9, -0.38, 0.9, 0.38, 0.65);
    },
  },

  toilet: {
    w: 0.6,
    d: 0.7,
    blocks: true,
    fn(b, R) {
      b.cyl('plain', C.white, 0.18, 0.13, 0.4, 12, 0, 0.2, 0.08);
      b.cyl('plain', C.white, 0.21, 0.21, 0.05, 14, 0, 0.42, 0.1);
      b.boxOn('plain', C.white, 0.4, 0.4, 0.2, 0, 0.4, -0.22);
      b.boxOn('wood', C.dark, 0.44, 0.03, 0.24, 0, 0.8, -0.22);
      b.cyl('metal', C.brass, 0.015, 0.015, 0.1, 6, 0.16, 0.72, -0.1, Math.PI / 2);
      b.collide(-0.24, -0.33, 0.24, 0.3, 0.45);
    },
  },

  washbasin: {
    w: 0.7,
    d: 0.5,
    blocks: true,
    fn(b, R) {
      b.cyl('plain', C.white, 0.08, 0.12, 0.75, 10, 0, 0.375, -0.05);
      b.boxOn('plain', C.white, 0.6, 0.12, 0.42, 0, 0.75, 0);
      b.boxOn('plain', 0x6a7a7a, 0.48, 0.02, 0.3, 0, 0.85, 0.02);
      b.cyl('metal', C.brass, 0.015, 0.015, 0.15, 6, 0, 0.94, -0.16);
      // зеркало над раковиной
      b.boxOn('wood', C.dark, 0.55, 0.7, 0.03, 0, 1.2, -0.23);
      b.boxOn('mirror', 0x9aa4b0, 0.47, 0.62, 0.01, 0, 1.24, -0.21);
      b.boxOn('wood', C.dark, 0.5, 0.02, 0.1, 0, 1.15, -0.18);
      b.cyl('glass', 0x9ab0c0, 0.025, 0.03, 0.1, 8, 0.12, 1.22, -0.17);
      b.spot(-0.15, 0.87, 0.1);
      b.collide(-0.3, -0.25, 0.3, 0.22, 0.9);
    },
  },

  desk: {
    w: 1.4,
    d: 0.75,
    blocks: true,
    fn(b, R) {
      b.boxOn('wood', C.dark, 1.35, 0.05, 0.7, 0, 0.74, 0);
      for (const sx of [-1, 1]) {
        b.boxOn('wood', C.mid, 0.4, 0.7, 0.62, sx * 0.45, 0.04, 0);
        for (let i = 0; i < 3; i++) {
          b.box('wood', C.dark, 0.36, 0.18, 0.02, sx * 0.45, 0.17 + i * 0.22, 0.315);
          b.sphere('metal', C.brass, 0.015, sx * 0.45, 0.17 + i * 0.22, 0.33);
        }
      }
      b.boxOn('fabric', C.green, 0.8, 0.005, 0.45, 0, 0.79, 0.05);
      // печатная машинка
      b.boxOn('metal', C.black, 0.36, 0.1, 0.28, -0.05, 0.79, 0.02);
      b.box('metal', C.black, 0.4, 0.08, 0.06, -0.05, 0.93, -0.08, 0, 0.3);
      b.cyl('metal', C.black, 0.025, 0.025, 0.44, 8, -0.05, 0.94, -0.12, 0, 0, Math.PI / 2);
      b.box('plain', C.cream, 0.2, 0.2, 0.005, -0.05, 1.02, -0.13, 0, -0.3);
      for (let i = 0; i < 12; i++) b.sphere('plain', C.cream, 0.012, -0.18 + (i % 6) * 0.05, 0.9, 0.08 + ((i / 6) | 0) * 0.04);
      // лампа, бумаги, чернильница
      b.cyl('metal', C.brass, 0.07, 0.08, 0.02, 10, 0.5, 0.8, -0.15);
      b.cyl('metal', C.brass, 0.012, 0.012, 0.35, 6, 0.5, 0.97, -0.15);
      b.cyl('glass', 0x2a5a3a, 0.04, 0.12, 0.1, 10, 0.5, 1.15, -0.08, 0.5);
      for (let i = 0; i < 4; i++) b.box('plain', 0xe0d4b8, 0.21, 0.003, 0.29, 0.25 + i * 0.01, 0.775 + i * 0.003, 0.15, R() * 0.4 - 0.2);
      b.cyl('glass', 0x101018, 0.03, 0.03, 0.05, 8, -0.45, 0.8, 0.1);
      b.spot(-0.45, 0.77, 0.2);
      b.spot(0.3, 0.775, 0.2);
      b.collide(-0.7, -0.37, 0.7, 0.37, 0.78);
    },
  },

  chair: {
    w: 0.5,
    d: 0.5,
    blocks: false,
    fn(b, R, o = {}) {
      const col = o.col || C.mid;
      b.boxOn('wood', col, 0.44, 0.04, 0.42, 0, 0.45, 0);
      b.boxOn('fabric', o.seat || C.red, 0.38, 0.03, 0.36, 0, 0.49, 0.01);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) b.boxOn('wood', col, 0.04, 0.45, 0.04, sx * 0.19, 0, sz * 0.18);
        b.boxOn('wood', col, 0.04, 0.55, 0.04, sx * 0.19, 0.49, -0.18);
      }
      b.boxOn('wood', col, 0.42, 0.1, 0.03, 0, 0.9, -0.18);
      for (let i = 0; i < 3; i++) b.boxOn('wood', col, 0.04, 0.4, 0.02, -0.1 + i * 0.1, 0.5, -0.18);
      b.collide(-0.22, -0.2, 0.22, 0.2, 0.5);
    },
  },

  diningTable: {
    w: 2.2,
    d: 1.2,
    blocks: true,
    fn(b, R) {
      b.boxOn('wood', C.dark, 2.0, 0.06, 1.0, 0, 0.74, 0);
      b.boxOn('wood', C.mid, 1.9, 0.1, 0.9, 0, 0.64, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl('wood', C.dark, 0.04, 0.03, 0.64, 8, sx * 0.88, 0.32, sz * 0.4);
      // скатерть-дорожка, канделябр, тарелки
      b.boxOn('fabric', C.cream, 1.8, 0.005, 0.4, 0, 0.8, 0);
      b.cyl('metal', C.brass, 0.08, 0.1, 0.03, 10, 0, 0.82, 0);
      b.cyl('metal', C.brass, 0.015, 0.015, 0.3, 6, 0, 0.98, 0);
      b.box('metal', C.brass, 0.4, 0.015, 0.015, 0, 1.08, 0);
      for (const x of [-0.2, 0, 0.2]) {
        b.cyl('metal', C.brass, 0.025, 0.02, 0.04, 8, x, 1.11, 0);
        b.cyl('plain', C.cream, 0.015, 0.015, 0.12 - Math.abs(x) * 0.2, 6, x, 1.18, 0);
      }
      for (const [x, z] of [[-0.6, 0.3], [0.6, 0.3], [-0.6, -0.3], [0.6, -0.3], [0, 0.3], [0, -0.3]]) {
        b.cyl('plain', C.white, 0.12, 0.1, 0.015, 16, x, 0.81, z);
        if (R() < 0.5) b.cyl('glass', 0x8aa0a8, 0.03, 0.025, 0.1, 8, x + 0.15, 0.86, z * 0.7);
      }
      b.spot(0.35, 0.815, 0.1);
      b.spot(-0.35, 0.815, -0.12);
      b.collide(-1.0, -0.5, 1.0, 0.5, 0.8);
    },
  },

  smallTable: {
    w: 0.9,
    d: 0.9,
    blocks: true,
    fn(b, R, o = {}) {
      b.cyl('wood', C.dark, 0.38, 0.38, 0.04, 16, 0, 0.7, 0);
      b.cyl('wood', C.mid, 0.05, 0.06, 0.66, 8, 0, 0.35, 0);
      b.cyl('wood', C.dark, 0.2, 0.24, 0.05, 10, 0, 0.03, 0);
      if (o.globe) {
        b.sphere('plain', 0x4a6a5a, 0.16, 0, 0.94, 0);
        b.torus('metal', C.brass, 0.18, 0.008, 0, 0.94, 0, 0, 0, 0.4);
        b.cyl('metal', C.brass, 0.01, 0.04, 0.1, 6, 0, 0.77, 0);
      } else {
        b.cyl('glass', 0x6a8aa0, 0.06, 0.05, 0.22, 10, -0.12, 0.83, 0.05);
        // засохшие цветы
        for (let i = 0; i < 4; i++) b.cyl('plain', 0x5a4a2a, 0.005, 0.005, 0.25, 4, -0.12 + (i - 1.5) * 0.02, 1.02, 0.05, 0, 0, (i - 1.5) * 0.15);
        for (let i = 0; i < 4; i++) b.sphere('plain', 0x6a2a3a, 0.025, -0.12 + (i - 1.5) * 0.045, 1.14, 0.05);
      }
      b.spot(0.15, 0.725, -0.1);
      b.collide(-0.38, -0.38, 0.38, 0.38, 0.75);
    },
  },

  coatRack: {
    w: 0.6,
    d: 0.5,
    blocks: false,
    fn(b, R) {
      b.cyl('wood', C.dark, 0.03, 0.035, 1.8, 8, 0, 0.9, 0);
      for (let i = 0; i < 4; i++) b.cyl('wood', C.dark, 0.012, 0.012, 0.25, 4, Math.cos(i * 1.57) * 0.12, 0.1, Math.sin(i * 1.57) * 0.12, Math.sin(i * 1.57) * 1.0, 0, -Math.cos(i * 1.57) * 1.0);
      for (let i = 0; i < 4; i++) b.cyl('wood', C.dark, 0.01, 0.01, 0.15, 4, Math.cos(i * 1.57 + 0.7) * 0.06, 1.72, Math.sin(i * 1.57 + 0.7) * 0.06, -Math.sin(i * 1.57 + 0.7) * 0.8, 0, Math.cos(i * 1.57 + 0.7) * 0.8);
      // висящее пальто и шляпа
      b.cyl('fabric', 0x2a2a30, 0.12, 0.22, 1.0, 10, 0.1, 1.15, 0.05);
      b.sphere('fabric', 0x2a2a30, 0.1, 0.1, 1.65, 0.05, 1.2, 0.6, 1);
      b.cyl('fabric', 0x1a1a1c, 0.1, 0.1, 0.12, 12, -0.05, 1.86, -0.05);
      b.cyl('fabric', 0x1a1a1c, 0.17, 0.17, 0.01, 14, -0.05, 1.8, -0.05);
      b.collide(-0.15, -0.15, 0.15, 0.15, 1.8);
    },
  },

  crate: {
    w: 0.8,
    d: 0.8,
    blocks: true,
    fn(b, R) {
      const s = 0.6 + R() * 0.15;
      b.boxOn('wood', C.light, s, s, s, 0, 0, 0, R() * 0.3);
      for (const y of [0.04, s - 0.04]) b.box('wood', C.mid, s + 0.02, 0.06, s + 0.02, 0, y, 0, 0);
      b.box('wood', C.mid, s * 1.3, 0.06, 0.02, 0, s / 2, s / 2 + 0.01, 0, 0, 0.75);
      if (R() < 0.5) b.boxOn('wood', C.light, s * 0.7, s * 0.6, s * 0.7, 0.03, s, 0.02, R());
      b.spot(0, s + (R() < 0.5 ? 0 : 0), 0.1);
      b.collide(-s / 2 - 0.05, -s / 2 - 0.05, s / 2 + 0.05, s / 2 + 0.05, s);
    },
  },

  barrel: {
    w: 0.7,
    d: 0.7,
    blocks: true,
    fn(b, R) {
      b.cyl('wood', C.mid, 0.3, 0.26, 0.9, 14, 0, 0.45, 0);
      b.cyl('wood', C.mid, 0.26, 0.3, 0.001, 14, 0, 0.9, 0);
      for (const y of [0.12, 0.45, 0.78]) b.torus('metal', C.iron, 0.29 - Math.abs(y - 0.45) * 0.08, 0.015, 0, y, 0, Math.PI / 2);
      b.spot(0, 0.9, 0);
      b.collide(-0.3, -0.3, 0.3, 0.3, 0.9);
    },
  },

  sacks: {
    w: 0.9,
    d: 0.7,
    blocks: true,
    fn(b, R) {
      for (let i = 0; i < 3; i++) {
        b.sphere('fabric', 0xb8a070, 0.25, (i - 1) * 0.28, 0.24 + (i === 1 ? 0.3 : 0), (i === 1 ? -0.05 : 0.02), 1, 1.1, 0.8);
        b.sphere('fabric', 0xa89060, 0.07, (i - 1) * 0.28, 0.52 + (i === 1 ? 0.3 : 0), (i === 1 ? -0.05 : 0.02));
      }
      b.collide(-0.45, -0.3, 0.45, 0.3, 0.6);
    },
  },

  wineRack: {
    w: 1.2,
    d: 0.4,
    blocks: true,
    fn(b, R) {
      b.boxOn('wood', C.dark, 1.15, 1.9, 0.03, 0, 0, -0.17);
      for (let i = 0; i < 6; i++) b.boxOn('wood', C.dark, 0.04, 1.9, 0.36, -0.55 + i * 0.22, 0, 0);
      for (let j = 0; j < 7; j++) {
        b.boxOn('wood', C.mid, 1.15, 0.03, 0.36, 0, 0.1 + j * 0.27, 0);
        for (let i = 0; i < 5; i++) if (R() < 0.7) {
          b.cyl('glass', [0x2a3a1a, 0x3a1a1a, 0x1a2a1a][(R() * 3) | 0], 0.04, 0.04, 0.28, 8, -0.44 + i * 0.22, 0.17 + j * 0.27, 0.02, Math.PI / 2);
          b.cyl('plain', C.red, 0.015, 0.015, 0.06, 6, -0.44 + i * 0.22, 0.17 + j * 0.27, 0.19, Math.PI / 2);
        }
      }
      b.collide(-0.58, -0.2, 0.58, 0.2, 1.9);
    },
  },

  boiler: {
    w: 1,
    d: 0.9,
    blocks: true,
    fn(b, R) {
      b.cyl('metal', 0x5a4a3a, 0.4, 0.4, 1.5, 16, 0, 0.85, 0);
      b.sphere('metal', 0x5a4a3a, 0.4, 0, 1.6, 0, 1, 0.5, 1);
      b.cyl('metal', 0x4a3a2a, 0.08, 0.08, 1.2, 8, 0, 2.3, -0.1);
      b.boxOn('metal', 0x2a2a2a, 0.3, 0.25, 0.05, 0, 0.35, 0.39);
      b.box('glow', 0xff5010, 0.22, 0.04, 0.01, 0, 0.47, 0.42);
      for (const y of [0.3, 0.8, 1.3]) b.torus('metal', 0x3a2a1a, 0.41, 0.02, 0, y, 0, Math.PI / 2);
      b.cyl('plain', C.cream, 0.07, 0.07, 0.02, 12, 0.2, 1.2, 0.38, Math.PI / 2);
      b.cyl('metal', 0x6a5a4a, 0.04, 0.04, 0.8, 8, 0.5, 1.7, 0, 0, 0, Math.PI / 2);
      b.collide(-0.45, -0.45, 0.45, 0.45, 2);
    },
  },

  sheet: {
    w: 1,
    d: 0.9,
    blocks: true,
    fn(b, R) {
      // мебель под белой простынёй
      const h = 0.7 + R() * 0.6;
      b.boxOn('fabric', 0xd8d4c8, 0.8, h, 0.7, 0, 0.05, 0);
      b.cyl('fabric', 0xd8d4c8, 0.48, 0.52, 0.1, 12, 0, 0.05, 0, 0, 0, 0);
      b.sphere('fabric', 0xd8d4c8, 0.4, 0, h, 0, 1.05, 0.25, 0.9);
      for (let i = 0; i < 6; i++) b.box('fabric', 0xc8c4b8, 0.04, h * 0.8, 0.02, -0.35 + i * 0.14, h * 0.45, 0.36, 0, 0, (i % 2 ? 0.05 : -0.05));
      b.spot(0, h + 0.05, 0.05);
      b.collide(-0.45, -0.38, 0.45, 0.38, h);
    },
  },

  toyChest: {
    w: 0.9,
    d: 0.55,
    blocks: true,
    fn(b, R) {
      b.boxOn('wood', 0x6a8ab0, 0.85, 0.45, 0.5, 0, 0, 0);
      b.boxOn('wood', 0xd0a040, 0.88, 0.05, 0.53, 0, 0.45, 0);
      for (const sx of [-1, 1]) b.box('wood', 0xd05050, 0.15, 0.15, 0.02, sx * 0.25, 0.22, 0.26, 0, 0, 0.785);
      // кубики с буквами
      for (let i = 0; i < 3; i++) b.boxOn('wood', [0xd05050, 0x50a050, 0xd0a040][i], 0.1, 0.1, 0.1, -0.25 + i * 0.12, 0.5, 0.05, i * 0.4);
      b.boxOn('wood', 0x5070c0, 0.1, 0.1, 0.1, -0.19, 0.6, 0.05, 0.2);
      b.spot(0.2, 0.505, 0.05);
      b.collide(-0.44, -0.27, 0.44, 0.27, 0.5);
    },
  },

  rockingHorse: {
    w: 0.9,
    d: 0.6,
    blocks: false,
    fn(b, R) {
      b.torus('wood', C.mid, 0.6, 0.025, 0, 0.6, 0.18, 0, 0, -Math.PI / 2 - 0.5, 1.0);
      b.torus('wood', C.mid, 0.6, 0.025, 0, 0.6, -0.18, 0, 0, -Math.PI / 2 - 0.5, 1.0);
      b.sphere('wood', 0xd8ccb0, 0.18, 0, 0.45, 0, 1.6, 0.8, 0.8);
      b.cyl('wood', 0xd8ccb0, 0.06, 0.07, 0.3, 8, 0.24, 0.6, 0, 0, 0, -0.6);
      b.sphere('wood', 0xd8ccb0, 0.08, 0.34, 0.74, 0, 1.4, 0.8, 0.8);
      b.boxOn('fabric', C.red, 0.2, 0.03, 0.22, 0, 0.58, 0);
      for (let i = 0; i < 4; i++) b.box('fabric', 0x3a2a1a, 0.03, 0.12, 0.05, 0.18 + i * 0.03, 0.75 - i * 0.03, 0, 0, 0, 0.5);
      b.sphere('plain', C.black, 0.015, 0.4, 0.78, 0.06);
      b.sphere('plain', C.black, 0.015, 0.4, 0.78, -0.06);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl('wood', 0xd8ccb0, 0.025, 0.025, 0.3, 6, sx * 0.17, 0.28, sz * 0.1);
      b.collide(-0.4, -0.22, 0.4, 0.22, 0.7);
    },
  },

  dollhouse: {
    w: 1,
    d: 0.5,
    blocks: true,
    fn(b, R) {
      b.boxOn('wood', C.mid, 0.9, 0.5, 0.45, 0, 0, 0);
      b.boxOn('wood', 0xe0d0b0, 0.7, 0.7, 0.35, 0, 0.5, -0.03);
      b.box('wood', 0x8a3a2a, 0.55, 0.06, 0.4, -0.18, 1.35, -0.03, 0, 0, 0.7);
      b.box('wood', 0x8a3a2a, 0.55, 0.06, 0.4, 0.18, 1.35, -0.03, 0, 0, -0.7);
      for (const [x, y] of [[-0.18, 0.95], [0.18, 0.95], [-0.18, 0.7], [0.18, 0.7]]) {
        b.box('glass', 0x2a2a20, 0.12, 0.14, 0.01, x, y, 0.15);
        b.box('wood', C.white, 0.14, 0.02, 0.02, x, y - 0.08, 0.16);
      }
      b.box('wood', 0x5a3a2a, 0.1, 0.18, 0.01, 0, 0.6, 0.15);
      // кукла рядом
      b.sphere('plain', 0xe8d0c0, 0.06, 0.35, 0.58, 0.12);
      b.cyl('fabric', 0x8a4a6a, 0.04, 0.08, 0.14, 8, 0.35, 0.47, 0.12);
      b.sphere('plain', C.black, 0.01, 0.33, 0.59, 0.175);
      b.sphere('plain', C.black, 0.01, 0.37, 0.59, 0.175);
      b.spot(-0.3, 0.505, 0.12);
      b.collide(-0.45, -0.22, 0.45, 0.22, 1.3);
    },
  },

  filing: {
    w: 0.6,
    d: 0.6,
    blocks: true,
    fn(b, R) {
      b.boxOn('metal', 0x5a6050, 0.5, 1.3, 0.55, 0, 0, 0);
      for (let i = 0; i < 4; i++) {
        b.box('metal', 0x6a7060, 0.44, 0.28, 0.02, 0, 0.18 + i * 0.31, 0.28);
        b.box('metal', C.brass, 0.12, 0.03, 0.03, 0, 0.26 + i * 0.31, 0.29);
        b.box('plain', C.cream, 0.08, 0.04, 0.005, 0, 0.21 + i * 0.31, 0.295);
      }
      b.boxOn('plain', 0xe0d4b8, 0.3, 0.04, 0.22, 0, 1.3, 0, 0.3);
      b.spot(-0.1, 1.305, 0.15);
      b.collide(-0.25, -0.28, 0.25, 0.28, 1.3);
    },
  },

  umbrella: {
    w: 0.4,
    d: 0.4,
    blocks: false,
    fn(b, R) {
      b.cyl('metal', 0x3a4a3a, 0.13, 0.11, 0.55, 12, 0, 0.275, 0);
      for (let i = 0; i < 3; i++) {
        b.cyl('fabric', [0x1a1a1a, 0x5a1a1a, 0x1a2a4a][i], 0.03, 0.06, 0.6, 6, (i - 1) * 0.05, 0.75, 0, 0, 0, (i - 1) * 0.12);
        b.torus('wood', C.dark, 0.04, 0.01, (i - 1) * 0.07, 1.08, 0, 0, 0, 0, Math.PI);
      }
      b.collide(-0.14, -0.14, 0.14, 0.14, 1);
    },
  },

  plant: {
    w: 0.6,
    d: 0.6,
    blocks: false,
    fn(b, R) {
      b.cyl('plain', 0x8a4a2a, 0.17, 0.12, 0.35, 12, 0, 0.175, 0);
      b.cyl('plain', 0x3a2a1a, 0.16, 0.16, 0.01, 12, 0, 0.34, 0);
      // засохшее растение
      for (let i = 0; i < 9; i++) {
        const a = i * 0.7,
          t = 0.25 + R() * 0.4;
        b.cyl('plain', 0x5a5a2a, 0.008, 0.012, 0.7, 4, Math.cos(a) * 0.08, 0.65, Math.sin(a) * 0.08, Math.sin(a) * t, 0, -Math.cos(a) * t);
        b.sphere('plain', i % 3 ? 0x4a5a2a : 0x6a5a2a, 0.06, Math.cos(a) * (0.08 + t * 0.35), 0.95, Math.sin(a) * (0.08 + t * 0.35), 1.5, 0.4, 0.8);
      }
      b.collide(-0.18, -0.18, 0.18, 0.18, 0.4);
    },
  },
};

// ---------- настенный декор (без коллизий) ----------
// x — вдоль стены, перед — +z
export function wallPainting(b, R, kind, seed, y = 1.55) {
  const w = 0.55 + R() * 0.25,
    h = w * 1.25;
  b.box('wood', C.brass, w + 0.12, h + 0.12, 0.04, 0, y, 0.02);
  b.box('wood', C.dark, w + 0.04, h + 0.04, 0.045, 0, y, 0.025);
  b.plane('paint' + kind + seed, 0xffffff, w, h, 0, y, 0.05);
  // гвоздь и шнурок
  b.cyl('metal', C.iron, 0.005, 0.005, 0.3, 4, -0.08, y + h / 2 + 0.12, 0.01, 0, 0, 1.0);
  b.cyl('metal', C.iron, 0.005, 0.005, 0.3, 4, 0.08, y + h / 2 + 0.12, 0.01, 0, 0, -1.0);
}

export function sconce(b) {
  b.box('metal', C.brass, 0.1, 0.18, 0.03, 0, 1.85, 0.015);
  b.cyl('metal', C.brass, 0.012, 0.012, 0.18, 6, 0, 1.85, 0.1, Math.PI / 2);
  b.cyl('metal', C.brass, 0.04, 0.03, 0.04, 8, 0, 1.88, 0.18);
  b.cyl('plain', C.cream, 0.015, 0.015, 0.1, 6, 0, 1.95, 0.18);
  b.cyl('glass', 0xc8c0a8, 0.06, 0.04, 0.12, 8, 0, 1.98, 0.18);
}

export function wallClock(b) {
  b.cyl('wood', C.dark, 0.2, 0.2, 0.05, 18, 0, 1.9, 0.025, Math.PI / 2);
  b.cyl('plain', C.cream, 0.17, 0.17, 0.01, 18, 0, 1.9, 0.055, Math.PI / 2);
  for (let i = 0; i < 12; i++) b.box('plain', C.black, 0.008, 0.025, 0.005, Math.sin(i * 0.5236) * 0.14, 1.9 + Math.cos(i * 0.5236) * 0.14, 0.062, 0, 0, -i * 0.5236);
  b.box('plain', C.black, 0.01, 0.1, 0.005, 0.02, 1.93, 0.065, 0, 0, -0.6);
  b.box('plain', C.black, 0.008, 0.13, 0.005, -0.03, 1.88, 0.066, 0, 0, 2.6);
}

export function wallMirror(b) {
  b.box('wood', C.brass, 0.7, 1.0, 0.04, 0, 1.5, 0.02);
  b.box('mirror', 0x8a94a0, 0.6, 0.9, 0.01, 0, 1.5, 0.045);
  // трещина
  b.box('plain', 0xd0d8e0, 0.005, 0.5, 0.002, 0.08, 1.55, 0.051, 0, 0, 0.4);
  b.box('plain', 0xd0d8e0, 0.005, 0.25, 0.002, 0.15, 1.42, 0.051, 0, 0, -0.5);
}

export function wallShelf(b, R) {
  b.box('wood', C.mid, 0.8, 0.03, 0.2, 0, 1.6, 0.1);
  for (const sx of [-1, 1]) b.box('wood', C.dark, 0.02, 0.12, 0.15, sx * 0.3, 1.53, 0.08);
  books(b, 0.4, 1.615, 0.1, R, 0.16, 0.22);
  b.cyl('glass', 0x6a8a7a, 0.04, 0.05, 0.14, 8, 0.28, 1.685, 0.1);
}
