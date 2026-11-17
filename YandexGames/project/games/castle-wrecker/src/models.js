// Воксельные модели: гоблины, катапульта, снаряды, деревья и декор
import { Vox, hash, jitter } from './vox.js';

const SKIN = 0x74c24f;
const SKIN_D = 0x4f9a35;

// гоблин: 8 x 12 x 8 вокселей, лицом к +Z
export function goblin(type) {
  const v = new Vox();
  const king = type === 'king';
  const tunic = king ? 0x7a3fa0 : type === 'helmet' ? 0x5b6470 : 0x8a5a2b;
  const pants = king ? 0x4a2a6a : 0x5e4127;
  // ноги
  v.box(1, 0, 2, 2, 2, 5, pants);
  v.box(5, 0, 2, 6, 2, 5, pants);
  v.box(1, 0, 6, 2, 0, 6, 0x3d2a1a);
  v.box(5, 0, 6, 6, 0, 6, 0x3d2a1a);
  v.box(1, 0, 2, 2, 0, 5, 0x3d2a1a);
  v.box(5, 0, 2, 6, 0, 5, 0x3d2a1a);
  // туловище
  v.box(1, 3, 2, 6, 6, 5, (x, y, z) => jitter(tunic, x, y, z, 0.05));
  if (king) v.box(1, 3, 6, 6, 5, 6, (x, y, z) => jitter(tunic, x, y, z, 0.05)); // пузо
  v.box(1, 3, 2, 6, 3, king ? 6 : 5, 0x3d2a1a); // пояс
  v.set(3, 3, king ? 6 : 5, 0xe8c040);
  v.set(4, 3, king ? 6 : 5, 0xe8c040);
  if (type === 'helmet') {
    // нагрудник
    v.box(2, 4, 5, 5, 6, 5, 0x9aa3ad);
    v.set(3, 5, 5, 0xc4ccd4);
  }
  // руки
  v.box(0, 3, 3, 0, 6, 4, SKIN);
  v.box(7, 3, 3, 7, 6, 4, SKIN);
  v.box(0, 6, 3, 0, 6, 4, tunic);
  v.box(7, 6, 3, 7, 6, 4, tunic);
  // голова
  v.box(1, 7, 1, 6, 11, 6, (x, y, z) => jitter(SKIN, x, y, z, 0.04));
  // уши
  v.box(0, 9, 3, 0, 10, 4, SKIN);
  v.box(7, 9, 3, 7, 10, 4, SKIN);
  v.set(-1, 10, 3, SKIN_D);
  v.set(8, 10, 3, SKIN_D);
  v.set(-1, 10, 4, SKIN);
  v.set(8, 10, 4, SKIN);
  // лицо (z = 6)
  v.set(2, 9, 6, 0xffffff);
  v.set(3, 9, 6, 0x1a1a1a);
  v.set(4, 9, 6, 0x1a1a1a);
  v.set(5, 9, 6, 0xffffff);
  v.set(2, 10, 6, SKIN_D);
  v.set(3, 10, 6, 0x2e6b20);
  v.set(4, 10, 6, 0x2e6b20);
  v.set(5, 10, 6, SKIN_D);
  v.set(3, 8, 7, SKIN_D); // нос
  v.set(4, 8, 7, SKIN_D);
  v.box(2, 7, 6, 5, 7, 6, 0x3a1a12); // рот
  v.set(2, 7, 6, 0xfff6d0);
  v.set(5, 7, 6, 0xfff6d0);
  if (type === 'helmet') {
    // шлем с рогами
    v.box(0, 11, 0, 7, 11, 7, 0x8e96a0);
    v.box(1, 12, 1, 6, 12, 6, 0x8e96a0);
    v.box(2, 13, 2, 5, 13, 5, 0xa6aeb8);
    v.box(0, 11, 7, 7, 11, 7, 0x6c737c);
    v.set(-1, 12, 3, 0xf3ead2);
    v.set(-2, 13, 3, 0xf3ead2);
    v.set(-2, 14, 3, 0xe0d6b8);
    v.set(8, 12, 3, 0xf3ead2);
    v.set(9, 13, 3, 0xf3ead2);
    v.set(9, 14, 3, 0xe0d6b8);
  }
  if (king) {
    // корона
    v.box(1, 12, 1, 6, 12, 6, 0xf2c230);
    for (const [x, z] of [[1, 1], [6, 1], [1, 6], [6, 6], [3, 6], [4, 1], [1, 3], [6, 4]]) v.set(x, 13, z, 0xf2c230);
    v.set(3, 12, 6, 0xe0413a);
    v.set(4, 12, 6, 0x3a8be0);
    // плащ
    v.box(0, 2, 1, 7, 8, 1, (x, y, z) => (y === 2 ? 0xf3f0e8 : jitter(0xc8302a, x, y, z, 0.05)));
  }
  return v;
}

// катапульта-требушет. Возвращает {base, arm}; arm вращается вокруг оси X в точке (0, 1.1, -0.2)
export const SKINS = {
  classic: { wood: 0x9c6a3c, dark: 0x6b4526, metal: 0x6f7780, accent: 0xd8402e },
  royal: { wood: 0x8a5f3a, dark: 0x3a3f7a, metal: 0xe0b040, accent: 0x3a6ae0 },
  dark: { wood: 0x4a3a34, dark: 0x2a2224, metal: 0x8a2a2a, accent: 0xe0402a },
  elven: { wood: 0xe8dcc0, dark: 0x9ab07a, metal: 0xc8d4dc, accent: 0x4ab060 },
  frost: { wood: 0x8ab0d0, dark: 0x4a6a90, metal: 0xe0f0ff, accent: 0x60d0ff },
  gold: { wood: 0xd8a830, dark: 0x9a7020, metal: 0xfff0a0, accent: 0xffffff },
};

export function catapult(skin = 'classic', noFlag = false) {
  const S = SKINS[skin] || SKINS.classic;
  const W = (x, y, z) => jitter(S.wood, x, y, z, 0.05);
  const b = new Vox();
  // рама
  b.box(-7, 3, -12, -6, 4, 12, W);
  b.box(6, 3, -12, 7, 4, 12, W);
  b.box(-7, 3, -11, 7, 4, -10, W);
  b.box(-7, 3, 10, 7, 4, 11, W);
  b.box(-5, 4, -4, 5, 4, 3, S.dark); // настил
  // колёса
  for (const wx of [-9, -8, 8, 9])
    for (const wz of [-8, 8])
      for (let y = 0; y <= 7; y++)
        for (let z = -4; z <= 4; z++) {
          const d = Math.hypot(y - 3.5, z);
          if (d <= 3.8) b.set(wx, y, wz + z, d > 2.8 ? S.metal : d < 1 ? S.metal : (y + z) % 3 === 0 ? S.dark : S.wood);
        }
  // стойки
  for (const x of [-6, -5, 5, 6]) {
    b.box(x, 5, -4, x, 12, -3, W);
    b.box(x, 5, 1, x, 9, 2, W); // подпорка
  }
  b.box(-6, 9, -2, -5, 10, 1, W);
  b.box(5, 9, -2, 6, 10, 1, W);
  b.box(-6, 11, -3, 6, 11, -2, S.metal); // ось
  b.box(-4, 15, 3, 4, 15, 4, S.dark); // упор
  b.box(-4, 13, 3, -4, 14, 4, W);
  b.box(4, 13, 3, 4, 14, 4, W);
  b.box(-6, 12, 3, -4, 12, 4, W);
  b.box(4, 12, 3, 6, 12, 4, W);
  b.box(-6, 5, 3, -6, 11, 4, W);
  b.box(6, 5, 3, 6, 11, 4, W);
  // флажок (на переднем плане не нужен — заслоняет обзор)
  if (!noFlag) {
    b.box(7, 5, -12, 7, 20, -12, S.dark);
    b.box(8, 16, -12, 12, 20, -12, (x, y) => ((x + y) % 2 ? S.accent : jitter(S.accent, x, y, 0, 0.1)));
  }

  // рычаг: вдоль +Y от оси
  const a = new Vox();
  a.box(-1, -6, -1, 0, 18, 0, W);
  a.box(-1, -6, -1, 0, -6, 0, S.metal);
  // ковш
  a.box(-3, 17, -2, 2, 17, 2, S.dark);
  a.walls(-3, 18, -2, 2, 19, 2, W);
  // противовес
  a.box(-3, -10, -3, 2, -6, 2, (x, y, z) => jitter(S.metal, x, y, z, 0.08));
  a.box(-3, -7, -3, 2, -7, 2, S.dark);
  return { base: b, arm: a };
}

// снаряды (радиус 4 вокселя)
export function projectile(type) {
  const v = new Vox();
  const col = { stone: 0x9a968c, iron: 0x4a4f58, bomb: 0x2a2a30, split: 0x8a7a5a, fire: 0xe0502a }[type];
  v.sphere(0, 0, 0, 3.6, (x, y, z) => {
    if (type === 'split' && (y === 0 || x === 0)) return 0xe8c040;
    if (type === 'fire') return hash(x, y, z) < 0.4 ? 0xffc040 : jitter(col, x, y, z, 0.1);
    if (type === 'iron' && hash(x, y, z) < 0.2) return 0x6a707a;
    return jitter(col, x, y, z, 0.07);
  });
  if (type === 'bomb') {
    v.box(-1, 3, -1, 0, 4, 0, 0x6a6a70);
    v.set(0, 5, 0, 0x8a6a3a);
    v.set(0, 6, 0, 0x8a6a3a);
  }
  return v;
}

// ---------- окружение ----------
export function tree(seed, kind) {
  const v = new Vox();
  const h = 4 + Math.floor(hash(seed, 1) * 3);
  const trunk = 0x7a5232;
  v.box(0, 0, 0, 1, h, 1, trunk);
  if (kind === 'pine' || kind === 'snowpine') {
    let r = 4;
    for (let y = h - 2; y < h + 9; y += 3) {
      for (let k = 0; k < 3; k++) {
        const rr = r - k;
        for (let x = -rr; x <= rr + 1; x++)
          for (let z = -rr; z <= rr + 1; z++) {
            if (Math.hypot(x - 0.5, z - 0.5) > rr + 0.3) continue;
            const edge = Math.hypot(x - 0.5, z - 0.5) > rr - 0.8;
            const c = kind === 'snowpine' && (k === 0 ? edge : true) && hash(x, y + k, z) < 0.7 ? 0xf4f8ff : jitter(0x2f7d4a, x, y + k, z, 0.08);
            v.set(x, y + k, z, c);
          }
      }
      r -= 1;
    }
    v.set(0, h + 10, 0, kind === 'snowpine' ? 0xf4f8ff : 0x2f7d4a);
  } else {
    const leaf = kind === 'autumn' ? [0xe8902a, 0xd8602a, 0xf0c040][Math.floor(hash(seed, 3) * 3)] : 0x5cb848;
    const r = 3 + hash(seed, 2) * 1.2;
    v.sphere(0.5, h + 2, 0.5, r, (x, y, z) => jitter(leaf, x, y, z, 0.08));
    v.sphere(0.5 + (hash(seed, 4) - 0.5) * 3, h + 3.5, 0.5 + (hash(seed, 5) - 0.5) * 3, r * 0.7, (x, y, z) => jitter(leaf, x, y, z, 0.1));
  }
  return v;
}

export function bush(seed, color) {
  const v = new Vox();
  v.sphere(0, 1, 0, 1.8 + hash(seed, 1), (x, y, z) => (y < 0 ? null : jitter(color, x, y, z, 0.08)));
  if (hash(seed, 2) < 0.5) {
    v.set(1, 2, 1, 0xff8fb1);
    v.set(-1, 2, 0, 0xffffff);
  }
  return v;
}

export function boulder(seed, top) {
  const v = new Vox();
  const r = 1.4 + hash(seed, 1) * 1.6;
  v.sphere(0, 0, 0, r, (x, y, z) => (y < -1 ? null : y >= r - 1 && top ? top : jitter(0x8a8378, x, y, z, 0.08)));
  return v;
}

// дальние горы: крупный воксель
export function mountain(seed, snow, base) {
  const v = new Vox();
  const H = 8 + Math.floor(hash(seed, 1) * 8);
  const R = 7 + hash(seed, 2) * 6;
  for (let x = -R; x <= R; x++)
    for (let z = -R; z <= R; z++) {
      const d = Math.hypot(x, z) / R;
      if (d > 1) continue;
      const h = Math.round(H * Math.pow(1 - d, 1.25) + hash(x, z, seed) * 1.5);
      for (let y = 0; y <= h; y++) v.set(x, y, z, y > H * 0.62 && snow ? 0xf4f8ff : jitter(base, x, y, z, 0.06));
    }
  return v;
}

export function cloud(seed) {
  const v = new Vox();
  const n = 3 + Math.floor(hash(seed, 1) * 3);
  for (let i = 0; i < n; i++) {
    const x = (hash(seed, i, 2) - 0.5) * 10;
    const z = (hash(seed, i, 3) - 0.5) * 5;
    const r = 2 + hash(seed, i, 4) * 2;
    v.sphere(x, 0, z, r, (xx, yy) => (yy < -1 ? null : yy > 1 ? 0xffffff : 0xeef2fa));
  }
  return v;
}

export function flag(color) {
  const v = new Vox();
  v.box(0, 0, 0, 0, 14, 0, 0x6b4526);
  v.box(1, 9, 0, 6, 13, 0, (x, y) => ((x + y) % 2 ? color : jitter(color, x, y, 0, 0.12)));
  return v;
}

export function crystal(seed) {
  const v = new Vox();
  const h = 3 + Math.floor(hash(seed, 1) * 4);
  for (let y = 0; y < h; y++) {
    const r = y < h - 2 ? 1 : 0;
    v.box(-r, y, -r, r, y, r, y > h - 3 ? 0xe8f8ff : 0x9ad8f8);
  }
  return v;
}

// ---------- лагерь гоблинов вокруг замка ----------
export function goblinFlag(seed) {
  const v = new Vox();
  v.box(0, 0, 0, 0, 22, 0, 0x5e4127);
  v.set(0, 23, 0, 0xe8c040);
  const col = [0x3f8a2e, 0x8a2e2e, 0x5a3a8a][seed % 3];
  for (let y = 12; y <= 21; y++)
    for (let x = 1; x <= 8; x++) {
      if (y < 14 && (x === 4 || x === 5)) continue; // «ласточкин хвост»
      v.set(x, y, 0, jitter(col, x, y, 0, 0.06));
    }
  // череп
  for (const [x, y] of [[3, 17], [4, 17], [5, 17], [6, 17], [3, 18], [6, 18], [3, 16], [4, 16], [5, 16], [6, 16], [4, 15], [5, 15]]) v.set(x, y, 0, 0xf3ead2);
  v.set(4, 17, 0, 0x222222);
  v.set(5, 17, 0, 0x222222);
  return v;
}

export function tent(seed) {
  const v = new Vox();
  const a = [0x7a8a3a, 0x9a6a3a, 0x6a7a5a][seed % 3];
  const b = 0xd8c8a0;
  for (let y = 0; y < 9; y++) {
    const r = 8 - y;
    for (let x = -r; x <= r; x++)
      for (let z = -6; z <= 6; z++) {
        if (Math.abs(x) !== r && y !== 0 && Math.abs(z) !== 6) continue;
        if (z === -6 && Math.abs(x) < 2 && y < 4) continue; // вход
        if (y === 0 && Math.abs(x) < r) continue;
        v.set(x, y, z, (x + 8) % 4 < 2 ? a : b);
      }
  }
  v.box(0, 9, 0, 0, 11, 0, 0x5e4127);
  return v;
}

export function crates(seed) {
  const v = new Vox();
  const W = (x, y, z) => ((x + y + z) % 3 === 0 ? 0x8a5a30 : jitter(0xb07a45, x, y, z, 0.05));
  v.box(0, 0, 0, 4, 4, 4, W);
  if (seed % 2) v.box(5, 0, 1, 9, 4, 5, W);
  v.box(1, 5, 1, 4, 8, 4, W);
  // бочка
  for (let y = 0; y < 6; y++)
    for (let x = -2; x <= 2; x++)
      for (let z = -2; z <= 2; z++) if (Math.hypot(x, z) < 2.6) v.set(x - 3, y, z + 3, y === 1 || y === 4 ? 0x5a5f66 : jitter(0x9a5b2c, x, y, z, 0.06));
  return v;
}

export function campfire() {
  const v = new Vox();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    v.set(Math.round(Math.cos(a) * 4), 0, Math.round(Math.sin(a) * 4), 0x8a8378);
  }
  v.box(-2, 0, 0, 2, 0, 0, 0x6b4526);
  v.box(0, 1, -2, 0, 1, 2, 0x5e4127);
  v.set(0, 2, 0, 0x3a2a1a);
  return v;
}

export function grassTuft(seed, color) {
  const v = new Vox();
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(hash(seed, i, 1) * 5) - 2;
    const z = Math.floor(hash(seed, i, 2) * 5) - 2;
    const hh = 1 + Math.floor(hash(seed, i, 3) * 3);
    v.box(x, 0, z, x, hh, z, jitter(color, x, i, z, 0.1));
  }
  if (hash(seed, 9) < 0.4) v.set(0, 3, 0, [0xffffff, 0xffe066, 0xff8fb1][seed % 3]);
  return v;
}
