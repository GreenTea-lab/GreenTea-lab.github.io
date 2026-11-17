// Дом: стены, полы, окна, двери, мебель, ключи и батарейки, коллизии, обзор и пути
import * as THREE from 'three';
import { Builder } from './builder.js';
import { PROPS, C, wallPainting, sconce, wallClock, wallMirror, wallShelf } from './props.js';
import { W, H, ROOMS, EXIT, buildGrid, cell, inside } from './map.js';
import * as T from './tex.js';

export const WALL_H = 2.8;

// вид комнат: обои (тип, фон, узор), пол, панели снизу
const LOOK = {
  hall: { wp: ['damask', 0x5a3e34, 0x2e1e18], floor: 'planks', wain: true },
  foyer: { wp: ['stripe', 0x4e4636, 0x2a2418], floor: 'checker', wain: true },
  living: { wp: ['damask', 0x3e4a3a, 0x1e281c], floor: 'planks', wain: true },
  bath: { wp: ['diamond', 0x7a8a86, 0x3a4a48], floor: 'smalltile', tileWall: true },
  dining: { wp: ['stripe', 0x5a2e2e, 0x2e1414], floor: 'planks2', wain: true },
  kitchen: { wp: ['diamond', 0x7a7458, 0x4a4430], floor: 'checker', tileWall: true },
  bedroom: { wp: ['flower', 0x5a5470, 0x2e2a44], floor: 'planks2' },
  bedroom2: { wp: ['flower', 0x6a5a48, 0x3a2e22], floor: 'planks' },
  library: { wp: ['damask', 0x3a3448, 0x1c1828], floor: 'planks', wain: true },
  study: { wp: ['stripe', 0x2e4048, 0x14222a], floor: 'planks2', wain: true },
  kids: { wp: ['kids', 0x5a6a80, 0xe0d0a0], floor: 'planks2' },
  pantry: { wp: ['stripe', 0x5a5444, 0x3a3428], floor: 'planks' },
  cellar: { wp: null, floor: 'stone' },
};

// что расставить у стен; center — предметы в середине комнаты
const RECIPE = {
  hall: { wall: ['wardrobe', 'clock', 'wardrobe', 'bookshelf', 'umbrella', 'plant', 'wardrobe', 'coatRack', 'plant', 'bookshelf'], runner: true },
  foyer: { wall: ['wardrobe', 'coatRack', 'umbrella', 'smallTable', 'plant', 'clock'], rug: [0x4a2020, 0xb89060] },
  living: { wall: ['fireplace', 'sofa', 'piano', 'wardrobe', 'armchair', 'armchair', 'bookshelf', 'clock', 'plant', 'smallTable'], rug: [0x5a1e1e, 0xc0a060], center: 'smallTable' },
  bath: { wall: ['bathtub', 'toilet', 'washbasin', 'wardrobe', 'plant'] },
  dining: { wall: ['sideboard', 'sideboard', 'wardrobe', 'clock', 'plant'], center: 'diningTable' },
  kitchen: { wall: ['stove', 'fridge', 'counter:sink', 'counter', 'counter', 'kitchenShelf', 'wardrobe', 'kitchenShelf', 'counter'] },
  bedroom: { wall: ['bed', 'wardrobe', 'dresser', 'nightstand', 'nightstand', 'chair', 'armchair', 'plant', 'wardrobe'], rug: [0x2a3a5a, 0xb0a070] },
  bedroom2: { wall: ['bed', 'wardrobe', 'nightstand', 'dresser', 'chair', 'plant'] },
  library: { wall: ['bookshelf', 'bookshelf', 'bookshelf', 'wardrobe', 'bookshelf', 'bookshelf', 'bookshelf', 'armchair', 'bookshelf', 'clock', 'bookshelf'], rug: [0x3a2a1a, 0xa08050], center: 'desk', extra: ['smallTable:globe'] },
  study: { wall: ['desk', 'filing', 'bookshelf', 'wardrobe', 'filing', 'armchair', 'bookshelf', 'clock', 'plant'], rug: [0x1e2e3a, 0x9a8a60] },
  kids: { wall: ['bed:small', 'toyChest', 'dollhouse', 'wardrobe', 'rockingHorse', 'nightstand', 'bookshelf'], rug: [0x4a6a8a, 0xe0c070] },
  pantry: { wall: ['kitchenShelf', 'kitchenShelf', 'sacks', 'barrel', 'kitchenShelf', 'crate', 'wardrobe'] },
  cellar: { wall: ['wineRack', 'boiler', 'crate', 'barrel', 'wardrobe', 'crate', 'sheet', 'barrel', 'wineRack', 'sheet', 'crate'], extra: ['sheet', 'crate'] },
};

const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export class World {
  constructor(scene, night, seed, quality) {
    this.scene = scene;
    this.night = night;
    this.R = T.rng(seed * 7919 + night * 31);
    this.quality = quality;
    this.root = new THREE.Group();
    scene.add(this.root);
    const grid = buildGrid(night);
    Object.assign(this, grid); // g, room, doors, open
    this.occ = new Uint8Array(W * H); // занято мебелью (для расстановки)
    this.pblock = new Uint8Array(W * H); // мебель перекрывает центр клетки (для путей)
    this.windowCells = new Set(); // клетки пола перед окнами
    this.wallUsed = new Set(); // занятые участки стен 'x,y,dir'
    this.hides = []; // шкафы
    this.spots = [];
    this.colliders = [];
    this.mats = {};
    this.lights = [];
    this.anim = []; // анимированные мелочи (маятник, свечи)
    this.b = new Builder();
    this._materials();
    this._structure();
    this._windows();
    this._furnish();
    this._doors();
    this._exit();
    this._ceilingDecor();
    this.b.build(this.mats, this.root).forEach((m) => {
      m.receiveShadow = true;
      m.castShadow = !m.material.transparent;
    });
    this.colliders.push(...this.b.boxes);
    this.spots.push(...this.b.spots);
    this._index();
    this._pathGrid();
    this._dust();
  }

  // ---------- материалы ----------
  _materials() {
    const M = this.mats;
    const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, o));
    M.wood = std({ map: T.woodGrain(), vertexColors: true, roughness: 0.7 });
    M.fabric = std({ map: T.fabric(), vertexColors: true, roughness: 0.95 });
    M.plain = std({ vertexColors: true, roughness: 0.75 });
    M.metal = std({ vertexColors: true, roughness: 0.4, metalness: 0.6 });
    M.glass = std({ vertexColors: true, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.75 });
    M.mirror = std({ vertexColors: true, roughness: 0.05, metalness: 0.9 });
    M.glow = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
    M.frame = std({ map: T.woodGrain(21), color: 0x5a3a24, roughness: 0.7 });
    M.ceil = std({ map: T.plaster(), roughness: 1 });
    M.stoneWall = std({ map: T.stone(), roughness: 1 });
    M.stoneFloor = std({ map: T.stone(8), roughness: 1 });
    M.planks = std({ map: T.planks(0x6b4a2e, 3), roughness: 0.6 });
    M.planks2 = std({ map: T.planks(0x8a5e38, 4), roughness: 0.6 });
    M.checker = std({ map: T.tiles(0xd8d2c4, 0x2a2a2e, 8, 5), roughness: 0.35 });
    M.smalltile = std({ map: T.tiles(0xc8d0cc, 0xa8b4b0, 16, 6), roughness: 0.3 });
    M.wallTile = std({ map: T.tiles(0xd0d4c8, 0xb8c0b4, 12, 9), roughness: 0.3 });
    M.window = new THREE.MeshBasicMaterial({ map: T.nightWindow(1), fog: false });
    M.window2 = new THREE.MeshBasicMaterial({ map: T.nightWindow(2), fog: false });
    M.moon = new THREE.MeshBasicMaterial({ map: T.moonPool(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 });
    M.web = new THREE.MeshBasicMaterial({ map: T.cobweb(), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.5 });
    M.note = std({ map: T.scribble(1), roughness: 1 });
    for (const k in LOOK) {
      const L = LOOK[k];
      if (L.wp) M['wp_' + k] = std({ map: T.wallpaper(L.wp[0], L.wp[1], L.wp[2], k.length), roughness: 0.95 });
    }
    // картины и ковры создаются по запросу
    const self = this;
    this.mats = new Proxy(M, {
      get(t, k) {
        if (t[k]) return t[k];
        if (typeof k === 'string' && k.startsWith('paint')) {
          const m = /^paint(\w+?)(\d+)$/.exec(k);
          t[k] = std({ map: T.painting(m[1], +m[2]), roughness: 0.6 });
          return t[k];
        }
        if (typeof k === 'string' && k.startsWith('rug')) {
          const [, a, c] = k.split('_');
          t[k] = std({ map: T.rug(+a, +c, self.night), roughness: 1 });
          return t[k];
        }
        return t[k];
      },
    });
  }

  roomOf(x, y) {
    const r = this.room[cell(x, y)];
    return r >= 0 ? ROOMS[r] : null;
  }

  // ---------- стены, полы, потолки ----------
  _structure() {
    const b = this.b;
    // полы и потолки комнат
    for (const r of ROOMS) {
      const L = LOOK[r.type];
      const s = L.floor === 'checker' ? 0.5 : L.floor === 'smalltile' ? 0.5 : L.floor === 'stone' ? 0.4 : 0.3;
      b.plane(L.floor === 'stone' ? 'stoneFloor' : L.floor, 0xffffff, r.w, r.h, r.x + r.w / 2, 0, r.y + r.h / 2, -Math.PI / 2, 0, 0, s);
      b.plane(L.floor === 'stone' ? 'stoneWall' : 'ceil', L.floor === 'stone' ? 0x8a8478 : 0xffffff, r.w, r.h, r.x + r.w / 2, WALL_H, r.y + r.h / 2, Math.PI / 2, 0, 0, 0.5);
    }
    // полы в дверных проёмах + косяки
    for (const d of this.doors) {
      b.plane('planks', 0xffffff, 1, 1, d.x + 0.5, 0.005, d.y + 0.5, -Math.PI / 2, 0, 0, 0.3);
      b.plane('ceil', 0xffffff, 1, 1, d.x + 0.5, 2.2, d.y + 0.5, Math.PI / 2, 0, 0, 0.5);
      // перемычка над проёмом
      b.box('frame', 0xffffff, 1, WALL_H - 2.2, 1, d.x + 0.5, 2.2 + (WALL_H - 2.2) / 2, d.y + 0.5);
      // боковины проёма — обшивка
      const side = d.vert ? [[d.x, d.y + 0.5, Math.PI / 2], [d.x + 1, d.y + 0.5, -Math.PI / 2]] : [[d.x + 0.5, d.y, 0], [d.x + 0.5, d.y + 1, Math.PI]];
      for (const [x, z, ry] of side) b.plane('frame', 0xffffff, 1, 2.2, x, 1.1, z, 0, ry, 0, 1);
      // наличники с обеих сторон
      for (const s of [-1, 1]) {
        if (d.vert) {
          const z = d.y + 0.5 + s * 0.52;
          b.box('wood', C.mid, 0.1, 2.3, 0.05, d.x + 0.02, 1.15, z);
          b.box('wood', C.mid, 0.1, 2.3, 0.05, d.x + 0.98, 1.15, z);
          b.box('wood', C.mid, 1.16, 0.12, 0.05, d.x + 0.5, 2.26, z);
        } else {
          const x = d.x + 0.5 + s * 0.52;
          b.box('wood', C.mid, 0.05, 2.3, 0.1, x, 1.15, d.y + 0.02);
          b.box('wood', C.mid, 0.05, 2.3, 0.1, x, 1.15, d.y + 0.98);
          b.box('wood', C.mid, 0.05, 0.12, 1.16, x, 2.26, d.y + 0.5);
        }
      }
    }
    // стены: плоскость на каждой границе стена|пол
    this.faces = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (this.g[cell(x, y)] !== 0) continue;
      DIRS.forEach(([dx, dy], di) => {
        const nx = x + dx,
          ny = y + dy;
        if (!inside(nx, ny) || this.g[cell(nx, ny)] !== 1) return;
        const r = this.roomOf(nx, ny);
        // граница: середина стороны клетки (nx,ny), обращённой к стене
        const fx = nx + 0.5 - dx * 0.5,
          fz = ny + 0.5 - dy * 0.5;
        const ry = Math.atan2(dx, dy); // нормаль от стены к полу
        // dir — направление от пола к стене (как стороны при расстановке)
        this.faces.push({ x: nx, y: ny, dir: (di + 2) % 4, fx, fz, ry, r, outer: x === 0 || y === 0 || x === W - 1 || y === H - 1 });
      });
    }
  }

  _wallFace(f, from = 0, to = WALL_H) {
    const b = this.b;
    const L = LOOK[f.r.type];
    const h = to - from;
    const mat = L.wp ? 'wp_' + f.r.type : 'stoneWall';
    b.push(f.fx, 0, f.fz, f.ry);
    if (L.tileWall && from < 1.3) {
      const t = Math.min(1.3, to);
      b.plane('wallTile', 0xffffff, 1, t - from, 0, from + (t - from) / 2, 0, 0, 0, 0, 0.5);
      if (to > 1.3) b.plane(mat, 0xffffff, 1, to - 1.3, 0, 1.3 + (to - 1.3) / 2, 0, 0, 0, 0, 0.7);
      if (from < 1.3 && to > 1.3) b.box('plain', 0x8a9490, 1, 0.05, 0.03, 0, 1.3, 0.015);
    } else b.plane(mat, mat === 'stoneWall' ? 0x9a948a : 0xffffff, 1, h, 0, from + h / 2, 0, 0, 0, 0, 0.7);
    if (L.wp && from === 0) {
      // плинтус
      b.box('wood', C.dark, 1, 0.14, 0.03, 0, 0.07, 0.015);
      // панели снизу
      if (L.wain && to > 1) {
        b.box('wood', C.mid, 1, 0.92, 0.02, 0, 0.6, 0.01);
        b.box('wood', C.dark, 1, 0.05, 0.05, 0, 1.08, 0.025);
        b.box('wood', C.dark, 0.7, 0.6, 0.012, 0, 0.6, 0.026);
      }
    }
    if (to === WALL_H && L.wp) b.box('wood', 0xb0a490, 1, 0.1, 0.06, 0, WALL_H - 0.05, 0.03); // карниз
    b.pop();
  }

  // ---------- окна на внешних стенах ----------
  _windows() {
    const R = this.R;
    for (const f of this.faces) {
      const room = f.r;
      const along = f.dir % 2 === 0 ? f.x : f.y;
      const nearDoor = DIRS.some(([dx, dy]) => this.g[cell(f.x + dx, f.y + dy)] === 2 || this.g[cell(f.x + dx, f.y + dy)] === 3);
      const isWin = f.outer && room.type !== 'cellar' && room.type !== 'pantry' && along % 3 === 1 && !nearDoor && this._notCorner(f);
      if (!isWin) {
        this._wallFace(f);
        continue;
      }
      this._wallFace(f, 0, 0.9);
      this._wallFace(f, 2.25, WALL_H);
      const b = this.b;
      b.push(f.fx, 0, f.fz, f.ry);
      // ниша и стекло с видом на ночь
      b.plane('frame', 0xffffff, 0.12, 1.35, -0.5 + 0.06, 1.575, 0, 0, 0, 0, 1);
      b.plane('frame', 0xffffff, 0.12, 1.35, 0.5 - 0.06, 1.575, 0, 0, 0, 0, 1);
      for (const sx of [-1, 1]) b.plane('frame', 0xffffff, 0.25, 1.35, sx * 0.44, 1.575, -0.12, 0, (-sx * Math.PI) / 2, 0, 1);
      b.plane('frame', 0xffffff, 0.88, 0.25, 0, 2.24, -0.12, Math.PI / 2, 0, 0, 1);
      b.plane(R() < 0.5 ? 'window' : 'window2', 0xffffff, 0.88, 1.35, 0, 1.575, -0.24);
      // переплёт
      b.box('wood', 0xd8d0c0, 0.05, 1.35, 0.05, 0, 1.575, -0.22);
      b.box('wood', 0xd8d0c0, 0.88, 0.05, 0.05, 0, 1.7, -0.22);
      b.box('wood', 0xd8d0c0, 0.92, 0.08, 0.08, 0, 2.23, -0.2);
      // подоконник
      b.box('wood', 0xd8d0c0, 1.0, 0.05, 0.3, 0, 0.9, -0.05);
      if (R() < 0.4) b.cyl('plain', 0x8a4a2a, 0.07, 0.05, 0.12, 8, 0.28, 0.98, 0.02);
      // шторы с драпировкой
      const cc = [0x6a1e22, 0x2a3a2a, 0x3a2a4a, 0x8a7a5a][(R() * 4) | 0];
      b.cyl('metal', C.brass, 0.015, 0.015, 1.5, 6, 0, 2.42, 0.1, 0, 0, Math.PI / 2);
      for (const sx of [-1, 1]) {
        for (let i = 0; i < 4; i++) b.box('fabric', cc, 0.09, 2.3, 0.04, sx * (0.55 + i * 0.07), 1.27, 0.1 + (i % 2) * 0.04, 0, 0, sx * 0.02);
        b.box('fabric', 0xb8903c, 0.32, 0.04, 0.08, sx * 0.62, 1.1, 0.15);
      }
      // пятно лунного света на полу
      b.plane('moon', 0xffffff, 0.9, 1.6, 0.05, 0.012, 1.0, -Math.PI / 2, 0, 0.12);
      b.pop();
      this.windowCells.add(cell(f.x, f.y));
      this.wallUsed.add(`${f.x},${f.y},${f.dir}`);
    }
  }

  _notCorner(f) {
    const [dx, dy] = DIRS[f.dir];
    // соседи вдоль стены — тоже пол той же комнаты
    const a = [f.x + dy, f.y + dx],
      c2 = [f.x - dy, f.y - dx];
    return [a, c2].every(([x, y]) => this.room[cell(x, y)] === this.room[cell(f.x, f.y)]);
  }

  // ---------- мебель ----------
  _furnish() {
    const R = this.R;
    const plan = [];
    ROOMS.forEach((r, ri) => {
      if (!this.open[ri]) return; // закрытые крылья не обставляем — их не видно
      const rec = RECIPE[r.type];
      const cells = [];
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) cells.push([x, y]);
      // клетки у дверей держим свободными
      const nearDoor = (x, y) => DIRS.some(([dx, dy]) => [2, 3].includes(this.g[cell(x + dx, y + dy)]));
      const free = (x, y) => this.room[cell(x, y)] === ri && !this.occ[cell(x, y)] && !nearDoor(x, y);
      // центр комнаты
      if (rec.center) {
        const P = PROPS[rec.center];
        const wc = Math.ceil(P.w),
          dc = Math.ceil(P.d);
        const long = r.w >= r.h;
        const cw = long ? wc : dc,
          ch = long ? dc : wc;
        const cx = Math.floor(r.x + (r.w - cw) / 2),
          cy = Math.floor(r.y + (r.h - ch) / 2);
        plan.push({ name: rec.center, x: cx + cw / 2, z: cy + ch / 2, ry: long ? 0 : Math.PI / 2, cells: this._rect(cx, cy, cw, ch) });
        this._rect(cx, cy, cw, ch).forEach((c) => (this.occ[c] = this.pblock[c] = 1));
        if (rec.center === 'diningTable') {
          // стулья вокруг стола
          const chairs = long
            ? [[-0.6, -0.85, 0], [0, -0.85, 0], [0.6, -0.85, 0], [-0.6, 0.85, Math.PI], [0, 0.85, Math.PI], [0.6, 0.85, Math.PI]]
            : [[-0.85, -0.6, Math.PI / 2], [-0.85, 0, Math.PI / 2], [-0.85, 0.6, Math.PI / 2], [0.85, -0.6, -Math.PI / 2], [0.85, 0, -Math.PI / 2], [0.85, 0.6, -Math.PI / 2]];
          for (const [ox, oz, ry] of chairs) plan.push({ name: 'chair', x: cx + cw / 2 + ox, z: cy + ch / 2 + oz, ry: ry + Math.PI + (R() - 0.5) * 0.3, opts: { seat: C.red, col: C.dark }, nocell: true });
        }
        if (rec.center === 'desk') plan.push({ name: 'chair', x: cx + cw / 2, z: cy + ch / 2 + (long ? -0.75 : 0), ry: 0.2, opts: { seat: C.green }, nocell: true });
      }
      if (rec.rug) {
        const rw = Math.min(r.w - 2, 4),
          rh = Math.min(r.h - 2, 5.5);
        if (rw > 1.5 && rh > 1.5) this.b.plane(`rug_${rec.rug[0]}_${rec.rug[1]}`, 0xffffff, r.w >= r.h ? rh : rw, r.w >= r.h ? rw : rh, r.x + r.w / 2, 0.01, r.y + r.h / 2, -Math.PI / 2, 0, r.w >= r.h ? Math.PI / 2 : 0);
      }
      if (rec.runner) {
        // ковровая дорожка по коридору
        for (let x = r.x + 2; x < r.x + r.w - 4; x += 7) this.b.plane(`rug_${0x5a1e1e}_${0xc09050}`, 0xffffff, 1.1, 5, x + 2.5, 0.01, r.y + r.h / 2, -Math.PI / 2, 0, Math.PI / 2);
      }
      // у стен
      for (const item of rec.wall) {
        const [name, opt] = item.split(':');
        const P = PROPS[name];
        const wc = Math.max(1, Math.ceil(P.w - 0.05)),
          dc = Math.max(1, Math.ceil(P.d - 0.05));
        const tall = ['wardrobe', 'bookshelf', 'clock', 'kitchenShelf', 'wineRack', 'fridge', 'coatRack', 'boiler', 'dollhouse'].includes(name);
        // все варианты: сторона + смещение
        const opts = [];
        for (let side = 0; side < 4; side++) {
          const horiz = side % 2 === 0; // стена N/S
          const len = horiz ? r.w : r.h;
          for (let o = 0; o + wc <= len; o++) {
            let x0, y0, cw, ch;
            if (horiz) {
              cw = wc;
              ch = dc;
              x0 = r.x + o;
              y0 = side === 0 ? r.y : r.y + r.h - dc;
            } else {
              cw = dc;
              ch = wc;
              y0 = r.y + o;
              x0 = side === 3 ? r.x : r.x + r.w - dc;
            }
            const cs = this._rect(x0, y0, cw, ch);
            if (!cs.every((c) => free(c % W, (c / W) | 0))) continue;
            if (tall && cs.some((c) => this.windowCells.has(c))) continue;
            opts.push({ side, x0, y0, cw, ch, cs });
          }
        }
        if (!opts.length) continue;
        // кровать — изголовьем к стене, остальные — спиной
        for (let tries = 0; tries < 6 && opts.length; tries++) {
          const k = (R() * opts.length) | 0;
          const o = opts.splice(k, 1)[0];
          const ry = [0, -Math.PI / 2, Math.PI, Math.PI / 2][o.side];
          const back = [
            [0, -1],
            [1, 0],
            [0, 1],
            [-1, 0],
          ][o.side];
          // центр предмета: спинка вплотную к стене
          let x = o.x0 + o.cw / 2,
            z = o.y0 + o.ch / 2;
          const slack = (o.side % 2 === 0 ? o.ch : o.cw) - P.d;
          x += back[0] * slack * 0.5;
          z += back[1] * slack * 0.5;
          // проверка: комната остаётся проходимой
          o.cs.forEach((c) => (this.occ[c] = 1));
          const blocking = P.blocks && P.d > 0.3;
          if (blocking) o.cs.forEach((c) => (this.pblock[c] = 1));
          if (blocking && !this._connected(ri)) {
            o.cs.forEach((c) => (this.occ[c] = 0));
            o.cs.forEach((c) => (this.pblock[c] = 0));
            continue;
          }
          plan.push({ name, opt, x, z, ry, side: o.side, cs: o.cs, room: r });
          for (const c of o.cs) this.wallUsed.add(`${c % W},${(c / W) | 0},${o.side}`);
          break;
        }
      }
      // дополнительные предметы в свободных местах
      for (const item of rec.extra || []) {
        const [name, opt] = item.split(':');
        const fr = cells.filter(([x, y]) => free(x, y) && DIRS.every(([dx, dy]) => this.room[cell(x + dx, y + dy)] === ri));
        for (let t = 0; t < 8 && fr.length; t++) {
          const [x, y] = fr.splice((R() * fr.length) | 0, 1)[0];
          this.occ[cell(x, y)] = 1;
          this.pblock[cell(x, y)] = 1;
          if (!this._connected(ri)) {
            this.occ[cell(x, y)] = 0;
            this.pblock[cell(x, y)] = 0;
            continue;
          }
          plan.push({ name, opt, x: x + 0.5, z: y + 0.5, ry: R() * 6.28 });
          break;
        }
      }
    });
    // строим
    for (const p of plan) {
      const P = PROPS[p.name];
      this.b.push(p.x, 0, p.z, p.ry);
      const opts = p.opts || (p.opt ? { [p.opt]: true } : {});
      P.fn(this.b, this.R, opts);
      this.b.pop();
      if (P.hide) {
        const f = new THREE.Vector3(0, 0, 0.75).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.ry);
        this.hides.push({ x: p.x, z: p.z, ry: p.ry, front: { x: p.x + f.x, z: p.z + f.z }, room: p.room });
      }
      if (P.fire) this._fire(p);
      if (P.clock) this._pendulum(p);
    }
    this._wallDecor();
    this._floorSpots();
  }

  _rect(x0, y0, w, h) {
    const out = [];
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) out.push(cell(x, y));
    return out;
  }

  // все свободные клетки комнаты связаны и все двери достижимы
  _connected(ri) {
    const r = ROOMS[ri];
    const ok = (x, y) => this.room[cell(x, y)] === ri && !this.pblock[cell(x, y)];
    let start = null,
      total = 0;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (ok(x, y)) {
      total++;
      if (!start) start = [x, y];
    }
    if (!start) return false;
    const seen = new Set([cell(...start)]);
    const q = [start];
    while (q.length) {
      const [x, y] = q.pop();
      for (const [dx, dy] of DIRS) {
        const nx = x + dx,
          ny = y + dy,
          c = cell(nx, ny);
        if (!seen.has(c) && ok(nx, ny)) {
          seen.add(c);
          q.push([nx, ny]);
        }
      }
    }
    return seen.size === total;
  }

  // картины, бра, часы, записки — на свободных участках стен
  _wallDecor() {
    const R = this.R;
    const kinds = ['portrait', 'landscape', 'still'];
    for (const f of this.faces) {
      if (!this.open[this.room[cell(f.x, f.y)]]) continue;
      if (this.wallUsed.has(`${f.x},${f.y},${f.dir}`)) continue;
      const nearDoor = DIRS.some(([dx, dy]) => [2, 3].includes(this.g[cell(f.x + dx, f.y + dy)]));
      if (nearDoor || f.r.type === 'cellar') continue;
      const roll = R();
      this.b.push(f.fx, 0, f.fz, f.ry);
      if (roll < 0.28) wallPainting(this.b, R, kinds[(R() * 3) | 0], 1 + ((R() * 6) | 0));
      else if (roll < 0.38) sconce(this.b);
      else if (roll < 0.43) wallClock(this.b);
      else if (roll < 0.48 && (f.r.type === 'foyer' || f.r.type === 'bath' || f.r.type === 'bedroom')) wallMirror(this.b);
      else if (roll < 0.53 && f.r.type !== 'bath') wallShelf(this.b, R);
      else if (roll < 0.53 + 0.02 * this.night) {
        // записки и каракули — с каждой ночью их больше
        this.b.plane('note', 0xffffff, 0.24, 0.18, (R() - 0.5) * 0.4, 1.3 + R() * 0.4, 0.012, 0, 0, (R() - 0.5) * 0.3);
      }
      this.b.pop();
    }
  }

  // места на полу у стен (на случай нехватки поверхностей)
  _floorSpots() {
    const R = this.R;
    ROOMS.forEach((r, ri) => {
      if (!this.open[ri]) return;
      for (let i = 0; i < 2; i++) {
        const x = r.x + ((R() * r.w) | 0),
          y = r.y + ((R() * r.h) | 0);
        if (this.occ[cell(x, y)]) continue;
        this.b.spot(x + 0.2 + R() * 0.6, 0.01, y + 0.2 + R() * 0.6, 'floor');
      }
    });
  }

  // ---------- двери ----------
  _doors() {
    // общая геометрия створки
    const db = new Builder();
    db.box('wood', C.mid, 0.9, 2.12, 0.05, 0.45, 1.07, 0);
    for (const y of [0.55, 1.5]) for (const s of [-1, 1]) {
      db.box('wood', C.dark, 0.66, y === 0.55 ? 0.7 : 0.8, 0.02, 0.45, y, s * 0.03);
    }
    for (const s of [-1, 1]) {
      db.sphere('metal', C.brass, 0.035, 0.8, 1.0, s * 0.06);
      db.box('metal', C.brass, 0.05, 0.18, 0.01, 0.8, 1.0, s * 0.03);
      db.box('metal', C.iron, 0.02, 0.15, 0.03, 0.02, 0.4, s * 0.02);
      db.box('metal', C.iron, 0.02, 0.15, 0.03, 0.02, 1.7, s * 0.02);
    }
    const grp = new THREE.Group();
    db.build(this.mats, grp);
    this.doorTpl = grp;
    // доски для заколоченных
    const pb = new Builder();
    for (let i = 0; i < 4; i++) {
      const y = 0.4 + i * 0.5,
        a = (i % 2 ? 1 : -1) * (0.15 + this.R() * 0.15);
      pb.box('wood', 0x8a6a48, 1.1, 0.14, 0.03, 0.45, y, 0.06, 0, 0, a);
      pb.box('wood', 0x8a6a48, 1.1, 0.14, 0.03, 0.45, y + 0.2, -0.06, 0, 0, -a);
      for (const s of [-1, 1]) pb.sphere('metal', C.iron, 0.012, 0.45 + s * 0.45, y + s * a * 0.45, 0.08);
    }
    const pg = new THREE.Group();
    pb.build(this.mats, pg);
    this.doorObjs = [];
    for (const d of this.doors) {
      if (d.arch) continue;
      const pivot = new THREE.Group();
      // створка у комнатной стороны проёма, петля сбоку
      if (d.vert) {
        pivot.position.set(d.x + 0.05, 0, d.y + 0.9);
        pivot.rotation.y = 0;
      } else {
        pivot.position.set(d.x + 0.9, 0, d.y + 0.05);
        pivot.rotation.y = -Math.PI / 2;
      }
      const leaf = this.doorTpl.clone();
      pivot.add(leaf);
      if (d.boarded) {
        const planks = pg.clone();
        pivot.add(planks);
      }
      pivot.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      this.root.add(pivot);
      const open = !d.boarded && this.R() < 0.65;
      const obj = { d, pivot, base: pivot.rotation.y, sign: d.vert ? 1 : -1, open, t: open ? 1 : 0, boarded: d.boarded, busy: 0 };
      pivot.rotation.y = obj.base + obj.sign * obj.t * (Math.PI / 2) * 0.97;
      this.doorObjs.push(obj);
      d.obj = obj;
    }
  }

  doorAt(x, y) {
    const d = this.doors.find((q) => q.x === x && q.y === y);
    return d && d.obj;
  }

  toggleDoor(obj, open = !obj.open) {
    if (obj.boarded || obj.open === open) return false;
    obj.open = open;
    return true;
  }

  // ---------- парадная дверь с замками ----------
  _exit() {
    const b = this.b;
    const x = EXIT.x,
      z = EXIT.y;
    // проём и рама
    b.box('wood', C.dark, 0.14, 2.5, 0.2, x + 0.07, 1.25, z + 0.05);
    b.box('wood', C.dark, 0.14, 2.5, 0.2, x + 2 - 0.07, 1.25, z + 0.05);
    b.box('wood', C.dark, 2, 0.3, 0.2, x + 1, 2.55, z + 0.05);
    b.box('wood', C.mid, 2.3, 0.1, 0.25, x + 1, 2.75, z + 0.05);
    // фрамуга
    b.plane('window2', 0xffffff, 1.6, 0.18, x + 1, 2.55, z - 0.06);
    this.exitDoors = [];
    const lb = new Builder();
    lb.box('wood', 0x4a2a1a, 0.86, 2.35, 0.08, 0.43, 1.175, 0);
    for (const yy of [0.5, 1.2, 1.9]) lb.box('wood', 0x3a2012, 0.62, 0.5, 0.02, 0.43, yy, -0.05);
    lb.box('glass', 0x2a3a4a, 0.4, 0.3, 0.02, 0.43, 1.9, -0.06);
    lb.sphere('metal', C.brass, 0.045, 0.78, 1.05, -0.07);
    const lg = new THREE.Group();
    lb.build(this.mats, lg);
    for (const s of [0, 1]) {
      const pv = new THREE.Group();
      pv.position.set(s ? x + 1.93 : x + 0.07, 0, z + 0.02);
      const leaf = lg.clone();
      if (s) leaf.scale.x = -1;
      pv.add(leaf);
      this.root.add(pv);
      this.exitDoors.push(pv);
    }
    // цепь и навесные замки — по числу нужных ключей
    this.locks = [];
    const need = this.needKeys || 2;
    void need;
    this.exitPos = new THREE.Vector3(x + 1, 1.2, z - 0.1);
  }

  setLocks(n) {
    for (const l of this.locks) this.root.remove(l);
    this.locks = [];
    const chain = new Builder();
    for (let i = 0; i < 14; i++) chain.torus('metal', 0x6a6a6e, 0.04, 0.012, EXIT.x + 0.35 + i * 0.095, 1.15 + Math.sin(i * 0.45) * 0.05, EXIT.y - 0.1, i % 2 ? Math.PI / 2 : 0, 0, 0.1);
    const cg = new THREE.Group();
    chain.build(this.mats, cg);
    this.root.add(cg);
    this.locks.push(cg);
    this.lockMeshes = [];
    for (let i = 0; i < n; i++) {
      const lb = new Builder();
      lb.box('metal', 0xb08a3c, 0.12, 0.14, 0.05, 0, 0, 0);
      lb.torus('metal', 0x9a9a9e, 0.045, 0.012, 0, 0.09, 0, 0, 0, 0, Math.PI);
      lb.box('plain', C.black, 0.015, 0.03, 0.01, 0, -0.02, 0.03);
      const g = new THREE.Group();
      lb.build(this.mats, g);
      g.position.set(EXIT.x + 1 + (i - (n - 1) / 2) * 0.24, 1.0 + (i % 2) * 0.08, EXIT.y - 0.14);
      this.root.add(g);
      this.locks.push(g);
      this.lockMeshes.push(g);
    }
  }

  // ---------- люстры, паутина ----------
  _ceilingDecor() {
    const b = this.b;
    const R = this.R;
    ROOMS.forEach((r, ri) => {
      if (!this.open[ri]) return;
      const spots = r.type === 'hall' ? [8, 18, 28, 36].map((x) => [r.x + x, r.y + r.h / 2]) : [[r.x + r.w / 2, r.y + r.h / 2]];
      for (const [cx, cz] of spots) {
        if (r.type === 'cellar' || r.type === 'pantry') {
          // голая лампочка на проводе
          b.cyl('plain', C.black, 0.005, 0.005, 0.6, 4, cx, WALL_H - 0.3, cz);
          b.cyl('plain', 0x3a3a3a, 0.025, 0.025, 0.05, 6, cx, WALL_H - 0.62, cz);
          b.sphere('glass', 0xa0a090, 0.045, cx, WALL_H - 0.68, cz, 1, 1.3, 1);
          continue;
        }
        b.cyl('metal', C.brass, 0.008, 0.008, 0.5, 4, cx, WALL_H - 0.25, cz);
        b.cyl('metal', C.brass, 0.08, 0.05, 0.12, 8, cx, WALL_H - 0.55, cz);
        b.torus('metal', C.brass, 0.32, 0.015, cx, WALL_H - 0.62, cz, Math.PI / 2);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const x = cx + Math.cos(a) * 0.32,
            z = cz + Math.sin(a) * 0.32;
          b.cyl('metal', C.brass, 0.035, 0.025, 0.04, 6, x, WALL_H - 0.6, z);
          b.cyl('plain', C.cream, 0.013, 0.013, 0.08 + R() * 0.05, 6, x, WALL_H - 0.53, z);
          // нити паутины к потолку
          if (i % 2 === 0) b.plane('web', 0xffffff, 0.35, 0.5, (x + cx) / 2, WALL_H - 0.35, (z + cz) / 2, 0, a, 0);
        }
      }
      // паутина в углах
      const corners = [[r.x, r.y, 0], [r.x + r.w, r.y, -Math.PI / 2], [r.x + r.w, r.y + r.h, Math.PI], [r.x, r.y + r.h, Math.PI / 2]];
      for (const [x, z, a] of corners) {
        if (R() < 0.45) continue;
        b.push(x, WALL_H, z, a);
        b.plane('web', 0xffffff, 0.8, 0.8, 0.4, -0.02, 0.4, Math.PI / 2, 0, 0);
        b.plane('web', 0xffffff, 0.7, 0.7, 0.35, -0.35, 0.01, 0, 0, Math.PI);
        b.pop();
      }
    });
  }

  // огонь в камине: свет + анимация
  _fire(p) {
    const f = new THREE.Vector3(0, 0.35, 0.45).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.ry);
    const l = new THREE.PointLight(0xff8a3a, 3.2, 7, 1.6);
    l.position.set(p.x + f.x, f.y, p.z + f.z);
    this.root.add(l);
    this.anim.push((t) => (l.intensity = 2.6 + Math.sin(t * 9) * 0.35 + Math.sin(t * 23.7) * 0.25 + Math.sin(t * 3.1) * 0.3));
    this.fireLight = l;
    this.firePos = l.position.clone();
  }

  _pendulum(p) {
    const pb = new Builder();
    pb.cyl('metal', C.brass, 0.006, 0.006, 0.6, 4, 0, -0.3, 0);
    pb.cyl('metal', C.brass, 0.06, 0.06, 0.012, 14, 0, -0.62, 0, Math.PI / 2);
    const g = new THREE.Group();
    pb.build(this.mats, g);
    const f = new THREE.Vector3(0, 1.35, 0.12).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.ry);
    const pv = new THREE.Group();
    pv.position.set(p.x + f.x, f.y, p.z + f.z);
    pv.rotation.y = p.ry;
    pv.add(g);
    this.root.add(pv);
    this.anim.push((t) => (g.rotation.z = Math.sin(t * Math.PI) * 0.18));
    (this.clocks ||= []).push(pv.position);
  }

  // ---------- пыль в луче ----------
  _dust() {
    const n = this.quality === 'low' ? 120 : 260;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = Math.random() * WALL_H;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ size: 0.025, map: T.glow('255,240,220'), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff0d8 });
    this.dust = new THREE.Points(geo, mat);
    this.dust.frustumCulled = false;
    this.root.add(this.dust);
  }

  // ---------- индекс коллайдеров по клеткам ----------
  _index() {
    this.cellBoxes = new Map();
    for (const bx of this.colliders) {
      for (let y = Math.floor(bx.z0); y <= Math.floor(bx.z1); y++) for (let x = Math.floor(bx.x0); x <= Math.floor(bx.x1); x++) {
        const k = cell(x, y);
        if (!this.cellBoxes.has(k)) this.cellBoxes.set(k, []);
        this.cellBoxes.get(k).push(bx);
      }
    }
  }

  // проходимость клетки для коллизий (стены, закрытые двери, выход)
  solid(x, y) {
    if (!inside(x, y)) return true;
    const v = this.g[cell(x, y)];
    if (v === 0 || v === 3) return true;
    if (v === 2) {
      const o = this.doorAt(x, y);
      return o ? o.boarded || o.t < 0.85 : false;
    }
    return false;
  }

  // круг (игрок/монстр) против стен и мебели: возвращает исправленную позицию
  collide(p, r, ignoreProps = false) {
    for (let it = 0; it < 3; it++) {
      const cx = Math.floor(p.x),
        cz = Math.floor(p.z);
      for (let y = cz - 1; y <= cz + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
        if (this.solid(x, y)) this._push(p, r, x, y, x + 1, y + 1);
        if (!ignoreProps) {
          const list = this.cellBoxes.get(cell(x, y));
          if (list) for (const bx of list) this._push(p, r, bx.x0, bx.z0, bx.x1, bx.z1);
        }
      }
    }
    return p;
  }

  _push(p, r, x0, z0, x1, z1) {
    const nx = Math.max(x0, Math.min(p.x, x1)),
      nz = Math.max(z0, Math.min(p.z, z1));
    const dx = p.x - nx,
      dz = p.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) return;
    if (d2 < 1e-8) {
      // центр внутри — выталкиваем по меньшему проникновению
      const opts = [[p.x - x0 + r, -1, 0], [x1 - p.x + r, 1, 0], [p.z - z0 + r, 0, -1], [z1 - p.z + r, 0, 1]];
      opts.sort((a, b) => a[0] - b[0]);
      p.x += opts[0][1] * opts[0][0];
      p.z += opts[0][2] * opts[0][0];
      return;
    }
    const d = Math.sqrt(d2);
    p.x += (dx / d) * (r - d);
    p.z += (dz / d) * (r - d);
  }

  // прямая видимость между точками (стены и закрытые двери загораживают)
  los(ax, az, bx, bz) {
    const dx = bx - ax,
      dz = bz - az;
    const dist = Math.hypot(dx, dz);
    const steps = Math.ceil(dist / 0.25);
    for (let i = 1; i < steps; i++) {
      const x = ax + (dx * i) / steps,
        z = az + (dz * i) / steps;
      const cx = Math.floor(x),
        cz = Math.floor(z);
      if (!inside(cx, cz)) return false;
      const v = this.g[cell(cx, cz)];
      if (v === 0 || v === 3) return false;
      if (v === 2) {
        const o = this.doorAt(cx, cz);
        if (o && (o.boarded || o.t < 0.5)) return false;
      }
    }
    return true;
  }

  // ---------- пути для монстра ----------
  _pathGrid() {
    this.walk = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = cell(x, y),
        v = this.g[c];
      if (v === 1 && this.open[this.room[c]] && !this.pblock[c]) this.walk[c] = 1;
      if (v === 2) {
        const o = this.doorAt(x, y);
        if (!o || !o.boarded) this.walk[c] = 1;
      }
    }
  }

  // A* по клеткам (8 направлений без срезания углов)
  path(sx, sy, tx, ty) {
    if (!inside(tx, ty) || !this.walk[cell(tx, ty)]) {
      const n = this.nearestWalk(tx, ty);
      if (!n) return null;
      [tx, ty] = n;
    }
    const start = cell(sx, sy),
      goal = cell(tx, ty);
    const gS = new Float32Array(W * H).fill(1e9);
    const from = new Int32Array(W * H).fill(-1);
    const open = [start];
    const inOpen = new Uint8Array(W * H);
    const closed = new Uint8Array(W * H);
    gS[start] = 0;
    inOpen[start] = 1;
    const h = (c) => Math.hypot((c % W) - tx, ((c / W) | 0) - ty);
    let it = 0;
    while (open.length && it++ < 3000) {
      let bi = 0,
        bf = 1e9;
      for (let i = 0; i < open.length; i++) {
        const f = gS[open[i]] + h(open[i]);
        if (f < bf) (bf = f), (bi = i);
      }
      const c = open[bi];
      open[bi] = open[open.length - 1];
      open.pop();
      inOpen[c] = 0;
      if (c === goal) break;
      closed[c] = 1;
      const x = c % W,
        y = (c / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx,
          ny = y + dy;
        if (!inside(nx, ny)) continue;
        const n = cell(nx, ny);
        if (!this.walk[n] || closed[n]) continue;
        if (dx && dy && (!this.walk[cell(x + dx, y)] || !this.walk[cell(x, y + dy)])) continue;
        // через двери — только прямо
        if (dx && dy && (this.g[n] === 2 || this.g[c] === 2)) continue;
        let cost = dx && dy ? 1.414 : 1;
        if (this.g[n] === 2) {
          const o = this.doorAt(nx, ny);
          if (o && !o.open) cost += 1.5;
        }
        const ng = gS[c] + cost;
        if (ng < gS[n]) {
          gS[n] = ng;
          from[n] = c;
          if (!inOpen[n]) {
            open.push(n);
            inOpen[n] = 1;
          }
        }
      }
    }
    if (from[goal] === -1 && goal !== start) return null;
    const out = [];
    for (let c = goal; c !== -1 && c !== start; c = from[c]) out.push([(c % W) + 0.5, ((c / W) | 0) + 0.5, c]);
    return out.reverse();
  }

  nearestWalk(x, y) {
    for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx,
        ny = y + dy;
      if (inside(nx, ny) && this.walk[cell(nx, ny)]) return [nx, ny];
    }
    return null;
  }

  // случайная проходимая клетка в комнате
  randomCellIn(r) {
    for (let i = 0; i < 30; i++) {
      const x = r.x + ((Math.random() * r.w) | 0),
        y = r.y + ((Math.random() * r.h) | 0);
      if (this.walk[cell(x, y)]) return [x, y];
    }
    return this.nearestWalk(r.x + (r.w >> 1), r.y + (r.h >> 1));
  }

  openRooms() {
    return ROOMS.filter((r, i) => this.open[i]);
  }

  update(dt, t) {
    for (const o of this.doorObjs) {
      const target = o.open ? 1 : 0;
      if (o.t !== target) {
        o.t += Math.sign(target - o.t) * Math.min(Math.abs(target - o.t), dt * 3.2);
        o.pivot.rotation.y = o.base + o.sign * o.t * (Math.PI / 2) * 0.97;
      }
    }
    for (const f of this.anim) f(t);
  }

  dispose() {
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
  }
}
