// Уровни: строитель замков из префабов + 30 уровней в трёх мирах
const E = 0.004; // зазор между блоками, чтобы ничего не стартовало в пересечении

export class Builder {
  constructor() {
    this.blocks = [];
    this.enemies = [];
    this.rocks = [];
  }
  // y — низ блока
  box(mat, x, y, z, w, h, d, rot = 0) {
    this.blocks.push({ mat, shape: 'box', size: [w, h, d], pos: [x, y + h / 2 + E, z], rot });
    return y + h + E;
  }
  cyl(mat, x, y, z, r, h) {
    this.blocks.push({ mat, shape: 'cyl', size: [r * 2, h, r * 2], pos: [x, y + h / 2 + E, z], rot: 0 });
    return y + h + E;
  }
  roof(mat, x, y, z, w, h, d, rot = 0) {
    this.blocks.push({ mat, shape: 'roof', size: [w, h, d], pos: [x, y + h / 2 + E, z], rot });
    return y + h + E;
  }
  tnt(x, y, z) {
    return this.cyl('tnt', x, y, z, 0.36, 0.85);
  }
  enemy(type, x, y, z) {
    const h = type === 'king' ? 1.5 : type === 'helmet' ? 0.98 : 0.9;
    this.enemies.push({ type, pos: [x, y + h / 2 + E * 2, z] });
  }
  rock(x, y, z, w, h, d) {
    this.rocks.push({ pos: [x, y + h / 2, z], size: [w, h, d] });
    return y + h;
  }

  // ---------- префабы ----------
  // башня из колонн и перекрытий; en — враг на каждом этаже (строка или массив)
  tower(x, z, { y = 0, floors = 1, mat = 'wood', slab = 'wood', w = 2.4, colH = 1.6, colW = 0.42, en = 'goblin', roof = null, cyl = false, mid = false } = {}) {
    const ens = Array.isArray(en) ? en : Array(floors).fill(en);
    const o = w / 2 - colW / 2;
    for (let f = 0; f < floors; f++) {
      const pts = [[-o, -o], [o, -o], [-o, o], [o, o]];
      if (mid) pts.push([0, -o], [0, o]);
      for (const [dx, dz] of pts) {
        if (cyl) this.cyl(mat, x + dx, y, z + dz, colW / 2, colH);
        else this.box(mat, x + dx, y, z + dz, colW, colH, colW);
      }
      y += colH + E;
      y = this.box(slab, x, y, z, w, 0.3, w);
      if (ens[f]) this.enemy(ens[f], x, y, z);
      if (f < floors - 1 && ens[f] === 'king') y += 0.4;
    }
    if (roof) {
      // крыша приподнята над врагом верхнего этажа на «стропилах»
      const t = ens[floors - 1] === 'king' ? 1.6 : 1.05;
      const pts = [[-o, -o], [o, -o], [-o, o], [o, o]];
      for (const [dx, dz] of pts) this.box(mat, x + dx, y, z + dz, colW * 0.8, t, colW * 0.8);
      y += t + E;
      y = this.box(slab, x, y, z, w, 0.22, w);
      y = this.roof(roof, x, y, z, w + 0.3, Math.min(1.6, w * 0.55), w + 0.3);
    }
    return y;
  }
  // стена из кирпичей со смещением рядов, вдоль X
  wall(x0, x1, z, { y = 0, rows = 2, mat = 'wood', th = 0.7, bh = 0.6, bl = 1.4 } = {}) {
    const L = x1 - x0;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? bl / 2 : 0;
      let x = x0;
      const cuts = [x0];
      let c = x0 + (off || bl);
      while (c < x1 - 0.3) {
        cuts.push(c);
        c += bl;
      }
      cuts.push(x1);
      for (let i = 0; i < cuts.length - 1; i++) {
        const a = cuts[i];
        const b = cuts[i + 1];
        if (b - a < 0.25) continue;
        this.box(mat, (a + b) / 2, y, z, b - a - 0.01, bh, th);
      }
      y += bh + E;
      x = L;
    }
    return y;
  }
  // стена вдоль Z
  wallZ(x, z0, z1, { y = 0, rows = 2, mat = 'wood', th = 0.7, bh = 0.6, bl = 1.4 } = {}) {
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? bl / 2 : 0;
      const cuts = [z0];
      let c = z0 + (off || bl);
      while (c < z1 - 0.3) {
        cuts.push(c);
        c += bl;
      }
      cuts.push(z1);
      for (let i = 0; i < cuts.length - 1; i++) {
        const a = cuts[i];
        const b = cuts[i + 1];
        if (b - a < 0.25) continue;
        this.box(mat, x, y, (a + b) / 2, th, bh, b - a - 0.01);
      }
      y += bh + E;
    }
    return y;
  }
  // домик: четыре стенки, крыша, враг внутри
  house(x, z, { y = 0, mat = 'wood', roofMat = 'wood', w = 2.6, d = 2.2, h = 1.4, en = 'goblin', t = 0.24 } = {}) {
    this.box(mat, x, y, z - d / 2 + t / 2, w, h, t);
    this.box(mat, x, y, z + d / 2 - t / 2, w, h, t);
    this.box(mat, x - w / 2 + t / 2, y, z, t, h, d - t * 2 - 0.02);
    this.box(mat, x + w / 2 - t / 2, y, z, t, h, d - t * 2 - 0.02);
    if (en) this.enemy(en, x, y, z);
    let yy = y + h + E;
    yy = this.box(roofMat, x, yy, z, w + 0.2, 0.2, d + 0.2);
    return this.roof(roofMat, x, yy, z, w + 0.2, 1.0, d + 0.2);
  }
  // пирамида ящиков
  pyramid(x, z, { y = 0, mat = 'wood', base = 3, s = 1, gapEnemy = false } = {}) {
    for (let r = 0; r < base; r++) {
      const n = base - r;
      for (let i = 0; i < n; i++) {
        const xx = x + (i - (n - 1) / 2) * (s + 0.02);
        this.box(mat, xx, y, z, s, s, s);
      }
      y += s + E;
    }
    return y;
  }
  // мостик-доска между точками на высоте y
  plank(x0, x1, z, y, mat = 'wood', d = 1.4, th = 0.26) {
    return this.box(mat, (x0 + x1) / 2, y, z, x1 - x0, th, d);
  }
  // ворота: две колонны и перемычка
  gate(x, z, { y = 0, mat = 'stone', w = 3, h = 2.2, c = 0.6 } = {}) {
    this.box(mat, x - w / 2 + c / 2, y, z, c, h, c);
    this.box(mat, x + w / 2 - c / 2, y, z, c, h, c);
    return this.box(mat, x, y + h + E, z, w + 0.2, 0.5, c + 0.1);
  }
}

// миры
export const WORLDS = [
  { id: 'valley', levels: 10, sky: [0x8fd3ff, 0xe8f7ff], ground: 0x7cc35a, fog: 0xcfeeff },
  { id: 'rocks', levels: 10, sky: [0xffb37a, 0xffe7c9], ground: 0x9cb35a, fog: 0xffe2c4 },
  { id: 'ice', levels: 10, sky: [0x9ab8ff, 0xe8f0ff], ground: 0xeef6ff, fog: 0xdfe9ff },
];

// пул снарядов по уровням: { stone:3, bomb:1 }
// новые виды снарядов появляются на уровнях:
export const AMMO_UNLOCK = { stone: 1, bomb: 5, iron: 11, split: 14, fire: 21 };

const L = [];
const lvl = (ammo, fn, extra = {}) => L.push({ ammo, fn, ...extra });

// ===================== МИР 1: Зелёная долина =====================
// 1. одна башенка
lvl({ stone: 3 }, (b) => {
  b.tower(0, 30, { floors: 1 });
}, { hint: 'aim' });
// 2. две башенки
lvl({ stone: 3 }, (b) => {
  b.tower(-2.5, 30, { floors: 1 });
  b.tower(2.5, 31, { floors: 2 });
});
// 3. забор, гоблины за ним — бросок навесом
lvl({ stone: 5 }, (b) => {
  b.wall(-4, 4, 27, { rows: 2, mat: 'wood' });
  b.enemy('goblin', -1.8, 0, 31);
  b.enemy('goblin', 1.8, 0, 31.5);
  b.tower(0, 34.5, { floors: 1 });
}, { hint: 'arc' });
// 4. домик и башня
lvl({ stone: 5 }, (b) => {
  b.house(-2.6, 29, {});
  b.tower(2.6, 31, { floors: 2, roof: 'wood' });
});
// 5. бомба: пирамида ящиков, гоблины сверху и сбоку
lvl({ stone: 3, bomb: 1 }, (b) => {
  const y = b.pyramid(0, 31, { base: 4, s: 1 });
  b.enemy('goblin', 0, y, 31);
  b.enemy('goblin', -3, 0, 31);
  b.enemy('goblin', 3, 0, 31);
  b.box('wood', -3, 0, 29.6, 1.2, 1.2, 0.3);
  b.box('wood', 3, 0, 29.6, 1.2, 1.2, 0.3);
}, { hint: 'bomb' });
// 6. две башни и мост
lvl({ stone: 4, bomb: 1 }, (b) => {
  const y = b.tower(-3, 31, { floors: 2, en: ['goblin', null] });
  b.tower(3, 31, { floors: 2, en: ['goblin', null] });
  b.enemy('goblin', -3, y + 0.3, 31);
  b.plank(-4.2, 4.2, 31, y + 0.02, 'wood', 1.2);
  b.enemy('goblin', 0, y + 0.3, 31);
});
// 7. бочка с порохом у основания
lvl({ stone: 3 }, (b) => {
  b.tower(0, 31, { floors: 3, roof: 'wood' });
  b.tnt(-1.6, 0, 29.6);
  b.house(3.6, 31, { en: 'goblin' });
  b.tnt(2.0, 0, 29.8);
}, { hint: 'tnt' });
// 8. каменные колонны, гоблин в шлеме
lvl({ stone: 4, bomb: 1 }, (b) => {
  b.tower(-3.4, 30, { floors: 2, mat: 'stone', en: ['goblin', 'helmet'] });
  b.tower(0, 32, { floors: 3, mat: 'stone', en: ['goblin', null, 'goblin'] });
  b.tower(3.4, 30, { floors: 2, mat: 'stone', en: ['helmet', null] });
}, { hint: 'helmet' });
// 9. форт: частокол, домики, башня
lvl({ stone: 3, bomb: 1 }, (b) => {
  b.wall(-5, 5, 26.5, { rows: 2, mat: 'wood', bh: 0.7 });
  b.house(-3, 30, {});
  b.house(3, 30, { en: 'helmet' });
  b.tower(0, 33, { floors: 3, roof: 'wood', en: ['goblin', null, 'goblin'] });
  b.tnt(0, 0, 29.5);
});
// 10. босс: король гоблинов на крепости
lvl({ stone: 3, bomb: 2 }, (b) => {
  b.wall(-5.5, 5.5, 26, { rows: 2, mat: 'stone', th: 0.8, bh: 0.6 });
  b.tower(-4, 30, { floors: 2, en: ['goblin', 'helmet'] });
  b.tower(4, 30, { floors: 2, en: ['helmet', 'goblin'] });
  b.tower(0, 32.5, { floors: 2, w: 3.2, mat: 'stone', slab: 'wood', mid: true, en: [null, 'king'], colH: 1.8, roof: 'wood' });
  b.tnt(-1.8, 0, 30.6);
  b.tnt(1.8, 0, 30.6);
}, { boss: true });

// ===================== МИР 2: Каменные твердыни =====================
// 11. каменная башня, тяжёлое ядро
lvl({ stone: 2, iron: 2 }, (b) => {
  b.tower(0, 31, { floors: 3, mat: 'stone', slab: 'stone', en: ['helmet', 'goblin', 'helmet'], roof: 'stone' });
}, { hint: 'iron' });
// 12. каменная стена и башни по краям
lvl({ stone: 3, iron: 2, bomb: 1 }, (b) => {
  b.wall(-4, 4, 27, { rows: 4, mat: 'stone', th: 0.8, bh: 0.6, bl: 1.6 });
  b.enemy('helmet', -1.5, 0, 29.5);
  b.enemy('goblin', 1.5, 0, 29.5);
  b.tower(-6, 29, { floors: 2, mat: 'stone', en: [null, 'goblin'] });
  b.tower(6, 29, { floors: 2, mat: 'stone', en: [null, 'goblin'] });
});
// 13. крепость на скале
lvl({ stone: 4, iron: 1, bomb: 1 }, (b) => {
  const y = b.rock(0, 0, 31, 7, 3, 6);
  b.tower(-1.6, 31, { y, floors: 2, mat: 'stone', en: ['goblin', 'helmet'] });
  b.house(1.9, 31, { y, mat: 'stone', en: 'goblin' });
  b.enemy('goblin', -3.6, 0, 27.5);
}, { hint: 'cliff' });
// 14. картечь: гоблины на вышках в ряд
lvl({ split: 3, stone: 2 }, (b) => {
  [-3.9, -1.3, 1.3, 3.9].forEach((x, i) => b.tower(x, 30 + (i % 2) * 1.2, { floors: 1, w: 1.7, colH: 1.3 + (i % 2) * 0.7, colW: 0.32, en: 'goblin' }));
  b.house(0, 34, { w: 2.4, d: 2, en: null });
}, { hint: 'split' });
// 15. две цитадели и мост с бочками
lvl({ stone: 3, iron: 1, split: 1, bomb: 1 }, (b) => {
  const y = b.tower(-3.5, 31, { floors: 3, mat: 'stone', slab: 'wood', en: ['goblin', 'helmet', null] });
  b.tower(3.5, 31, { floors: 3, mat: 'stone', slab: 'wood', en: ['helmet', 'goblin', null] });
  b.plank(-4.7, 4.7, 31, y + 0.02, 'wood', 1.3);
  b.tnt(-0.8, y + 0.3, 31);
  b.tnt(0.8, y + 0.3, 31);
  b.enemy('goblin', 0, 0, 31);
});
// 16. каменная пирамида с гоблинами
lvl({ iron: 2, bomb: 1 }, (b) => {
  let y = 0;
  b.box('stone', -2.2, y, 31, 1.4, 1.2, 3);
  b.box('stone', 2.2, y, 31, 1.4, 1.2, 3);
  b.enemy('helmet', 0, 0, 31);
  y = b.box('stone', 0, 1.2 + 0.004, 31, 6, 0.5, 3);
  b.box('stone', -1.4, y, 31, 1.1, 1.1, 2.4);
  b.box('stone', 1.4, y, 31, 1.1, 1.1, 2.4);
  b.enemy('goblin', 0, y, 31);
  y = b.box('stone', 0, y + 1.1 + 0.004, 31, 4, 0.45, 2.4);
  b.enemy('helmet', 0, y, 31);
  b.roof('stone', 0, y + 1.0, 31, 2.2, 1, 2.2);
  b.box('stone', -0.75, y, 31, 0.4, 0.98, 0.4);
  b.box('stone', 0.75, y, 31, 0.4, 0.98, 0.4);
});
// 17. металлический щит — только навесом или бомбой
lvl({ stone: 3, bomb: 2, split: 1 }, (b) => {
  b.box('metal', -2.6, 0, 27, 2.4, 2.6, 0.35);
  b.box('metal', 0, 0, 27, 2.4, 2.6, 0.35);
  b.box('metal', 2.6, 0, 27, 2.4, 2.6, 0.35);
  b.house(-2.2, 30.5, { mat: 'stone', en: 'helmet' });
  b.house(2.2, 30.5, { mat: 'wood', en: 'goblin' });
  b.tower(0, 33.5, { floors: 2, mat: 'stone', en: ['goblin', 'goblin'] });
}, { hint: 'metal' });
// 18. уступы скал
lvl({ stone: 2, iron: 1, bomb: 1, split: 1 }, (b) => {
  const y1 = b.rock(-4, 0, 30, 4, 2, 4);
  const y2 = b.rock(3.5, 0, 33, 5, 4.5, 4);
  b.tower(-4, 30, { y: y1, floors: 2, mat: 'wood', en: ['goblin', 'goblin'] });
  b.tower(3.5, 33, { y: y2, floors: 1, mat: 'stone', en: 'helmet', roof: 'stone' });
  b.enemy('goblin', 0, 0, 32);
  b.box('stone', 0, 0, 30.8, 1.6, 1.4, 0.4);
});
// 19. большой замок: стена, угловые башни, донжон
lvl({ stone: 2, iron: 2, bomb: 1, split: 1 }, (b) => {
  b.wall(-4, 4, 27, { rows: 3, mat: 'stone', th: 0.8, bh: 0.55, bl: 1.6 });
  b.tower(-5.6, 27.2, { floors: 2, mat: 'stone', slab: 'stone', w: 2.2, en: [null, 'goblin'] });
  b.tower(5.6, 27.2, { floors: 2, mat: 'stone', slab: 'stone', w: 2.2, en: [null, 'goblin'] });
  b.tower(0, 32, { floors: 3, w: 3.2, mid: true, mat: 'stone', slab: 'wood', en: ['helmet', 'goblin', 'helmet'], roof: 'wood' });
  b.tnt(-2.6, 0, 30);
  b.tnt(2.6, 0, 30);
});
// 20. босс: цитадель на скале
lvl({ stone: 2, iron: 2, bomb: 2, split: 1 }, (b) => {
  const y = b.rock(0, 0, 33, 9, 2.4, 6);
  b.box('metal', -3, 0, 28.6, 2.2, 1.6, 0.35);
  b.box('metal', 3, 0, 28.6, 2.2, 1.6, 0.35);
  b.enemy('helmet', -3, 0, 29.6);
  b.enemy('helmet', 3, 0, 29.6);
  b.tower(-3, 33, { y, floors: 2, mat: 'stone', en: ['goblin', 'helmet'] });
  b.tower(3, 33, { y, floors: 2, mat: 'stone', en: ['helmet', 'goblin'] });
  b.tower(0, 33.5, { y, floors: 2, w: 3, mid: true, mat: 'stone', slab: 'stone', colH: 1.8, en: [null, 'king'], roof: 'stone' });
}, { boss: true });

// ===================== МИР 3: Ледяные пики =====================
// 21. огонь: деревянная деревня
lvl({ fire: 2, stone: 1 }, (b) => {
  b.house(-3.5, 30, { en: 'goblin' });
  b.house(0, 31.2, { en: 'helmet' });
  b.house(3.5, 30, { en: 'goblin' });
  b.box('straw', -1.8, 0, 29.4, 1, 0.8, 1);
  b.box('straw', 1.8, 0, 29.4, 1, 0.8, 1);
}, { hint: 'fire' });
// 22. ледяная башня — скользко и хрупко
lvl({ stone: 4, iron: 1 }, (b) => {
  b.tower(0, 31, { floors: 4, mat: 'ice', slab: 'ice', w: 2.2, en: ['goblin', 'helmet', 'goblin', 'helmet'], roof: 'ice' });
  b.tower(-4, 30, { floors: 1, mat: 'stone', en: 'goblin' });
});
// 23. ледяная стена, деревянные башни за ней
lvl({ fire: 1, stone: 3, bomb: 1 }, (b) => {
  b.wall(-4.5, 4.5, 27, { rows: 3, mat: 'ice', th: 0.8, bh: 0.6, bl: 1.5 });
  b.tower(-2.4, 30.5, { floors: 2, mat: 'wood', en: ['goblin', 'goblin'] });
  b.tower(2.4, 30.5, { floors: 2, mat: 'wood', en: ['helmet', 'goblin'] });
});
// 24. ледяной мост между скалами
lvl({ stone: 2, split: 2, iron: 1 }, (b) => {
  const y1 = b.rock(-4.5, 0, 31, 3, 4, 3);
  const y2 = b.rock(4.5, 0, 31, 3, 4, 3);
  b.plank(-6, 6, 31, y1, 'ice', 1.6, 0.35);
  b.enemy('goblin', -1.5, y1 + 0.35, 31);
  b.enemy('helmet', 1.5, y1 + 0.35, 31);
  b.tower(-4.5, 31, { y: y1 + 0.36, floors: 1, mat: 'ice', w: 2, en: 'goblin' });
  b.tower(4.5, 31, { y: y2 + 0.36, floors: 1, mat: 'ice', w: 2, en: 'goblin' });
});
// 25. каменные башни с ледяными перекрытиями
lvl({ split: 2, fire: 1, iron: 1, stone: 2 }, (b) => {
  b.tower(-3.5, 30, { floors: 3, mat: 'stone', slab: 'ice', en: ['goblin', 'helmet', 'goblin'] });
  b.tower(3.5, 30, { floors: 3, mat: 'stone', slab: 'ice', en: ['helmet', 'goblin', 'helmet'] });
  b.house(0, 33, { mat: 'wood', en: 'goblin' });
});
// 26. деревянный острог с порохом
lvl({ fire: 1, stone: 2 }, (b) => {
  b.wall(-5, 5, 27, { rows: 3, mat: 'wood', th: 0.6, bh: 0.6 });
  b.tower(-3, 30.5, { floors: 2, mat: 'wood', en: ['goblin', 'helmet'] });
  b.tower(3, 30.5, { floors: 2, mat: 'wood', en: ['helmet', 'goblin'] });
  b.tnt(0, 0, 29.5);
  b.tnt(0, 0, 31.3);
  b.house(0, 34, { mat: 'stone', roofMat: 'wood', en: 'helmet' });
});
// 27. металл и лёд
lvl({ iron: 2, bomb: 2, fire: 1 }, (b) => {
  b.tower(-3, 31, { floors: 3, mat: 'metal', slab: 'ice', w: 2.4, colW: 0.35, en: ['goblin', 'helmet', 'goblin'] });
  b.tower(3, 31, { floors: 3, mat: 'ice', slab: 'metal', w: 2.4, en: ['helmet', 'goblin', 'helmet'] });
  b.box('metal', 0, 0, 28, 1.8, 2.4, 0.35);
});
// 28. две высокие спирали
lvl({ stone: 2, split: 2, iron: 1, bomb: 1 }, (b) => {
  b.tower(-2.6, 31, { floors: 5, w: 2, colH: 1.4, mat: 'ice', slab: 'wood', en: ['goblin', null, 'helmet', null, 'goblin'], roof: 'ice' });
  b.tower(2.6, 32, { floors: 5, w: 2, colH: 1.4, mat: 'stone', slab: 'ice', en: [null, 'goblin', null, 'helmet', 'goblin'], roof: 'stone' });
});
// 29. ледяной дворец
lvl({ stone: 1, iron: 1, fire: 1, split: 1, bomb: 1 }, (b) => {
  b.wall(-5, 5, 26.5, { rows: 2, mat: 'ice', th: 0.8, bh: 0.6, bl: 1.6 });
  b.tower(-4.5, 30, { floors: 3, mat: 'ice', slab: 'stone', en: ['goblin', null, 'helmet'], roof: 'ice' });
  b.tower(4.5, 30, { floors: 3, mat: 'ice', slab: 'stone', en: ['helmet', null, 'goblin'], roof: 'ice' });
  b.tower(0, 32, { floors: 2, w: 3.2, mid: true, mat: 'stone', slab: 'ice', en: ['helmet', 'goblin'], roof: 'ice' });
  b.tnt(-2.2, 0, 29.5);
  b.tnt(2.2, 0, 29.5);
});
// 30. финальный босс
lvl({ stone: 2, iron: 3, bomb: 2, fire: 1, split: 1 }, (b) => {
  const y = b.rock(0, 0, 34, 10, 2.5, 7);
  b.wall(-4.5, 4.5, 28, { rows: 2, mat: 'metal', th: 0.5, bh: 0.6, bl: 1.6 });
  b.enemy('helmet', -2, 0, 29.4);
  b.enemy('helmet', 2, 0, 29.4);
  b.tower(-3.6, 34, { y, floors: 2, mat: 'ice', slab: 'wood', en: ['goblin', 'helmet'], roof: 'ice' });
  b.tower(3.6, 34, { y, floors: 2, mat: 'ice', slab: 'wood', en: ['helmet', 'goblin'], roof: 'ice' });
  b.tower(0, 34.5, { y, floors: 2, w: 3.2, mid: true, mat: 'stone', slab: 'stone', colH: 1.8, en: ['helmet', 'king'], roof: 'stone' });
  b.tnt(-1.8, y, 32);
  b.tnt(1.8, y, 32);
}, { boss: true });

// «пар» для трёх звёзд — по прогонам бота с неточным прицелом (test/bot.mjs)
const PAR = [1, 2, 3, 2, 2, 2, 1, 2, 2, 3, 1, 4, 4, 2, 2, 2, 3, 3, 3, 4, 1, 2, 3, 2, 4, 2, 2, 2, 2, 4];
L.forEach((l, i) => (l.par = PAR[i]));
export const LEVELS = L;
export const levelWorld = (i) => Math.floor(i / 10);

export const Z_SHIFT = -8; // замки стоят ближе к катапульте, чем в черновой разметке
export function buildLevel(i) {
  const b = new Builder();
  LEVELS[i].fn(b);
  for (const o of b.blocks.concat(b.enemies, b.rocks)) o.pos[2] += Z_SHIFT;
  return { ...LEVELS[i], blocks: b.blocks, enemies: b.enemies, rocks: b.rocks, world: levelWorld(i), index: i };
}
