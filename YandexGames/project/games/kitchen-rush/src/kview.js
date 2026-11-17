// 3D-вид кухни: сборка сцены по карте, синхронизация с логикой, частицы, подсказки над станциями
import * as THREE from 'three';
import { B, MAT, MAT_GLOW, blobShadow, disposeTree } from './gfx.js';
import { makeChef, animChef, itemMesh, ingParts, shade } from './models.js';
import { APRON, ING } from './data.js';
import { dishOf, WARN_TIME, BURN_TIME, SOUP_TIME } from './kitchen.js';
import { thumb } from './thumbs.js';
import { Guests } from './guests.js';
import { buildExterior } from './exterior.js';

export const CH = 0.75; // высота стола
// предметы крупнее «натурального» размера модели: занимают большую часть клетки
const ITEM_S = { ing: 1.6, plate: 1.45, dirty: 1.45, pot: 1.45, pan: 1.3, ext: 1.25 };
const HOLD_K = 0.85; // в лапах чуть меньше, чтобы не закрывать повара

const THEME = {
  home: { body: '#f2c08e', top: '#fff4e4', f1: '#fbe6cb', f2: '#f3d5b2', ground: '#a9d97a', wall: '#ffe1c2', wall2: '#ffb38a', sky: 0xffd8b0, bg: '#ffcf9e', light: 0xfff2dc },
  beach: { body: '#6cc8e2', top: '#fff8e8', f1: '#fff1cf', f2: '#ffe4ad', ground: '#ffe2a0', wall: '#bfe9f5', wall2: '#ff9a7a', sky: 0xbfefff, bg: '#8fe0ff', light: 0xfff6e0 },
  snow: { body: '#b4865e', top: '#f2f6ff', f1: '#e4ecf6', f2: '#d2deec', ground: '#eef5ff', wall: '#9c6e4a', wall2: '#7c5236', sky: 0xd8ecff, bg: '#bcd8f4', light: 0xf2f6ff },
  night: { body: '#8a6ad8', top: '#f4eeff', f1: '#5e4f8c', f2: '#52447c', ground: '#342d5c', wall: '#3c3270', wall2: '#ff7aa2', sky: 0x8a7ad0, bg: '#2a2450', light: 0xffe8c8 },
};

let beltTex = null;
function beltTexture() {
  if (beltTex) return beltTex;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#3a3a48';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#ffd23f';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(18, 14);
  g.lineTo(40, 32);
  g.lineTo(18, 50);
  g.stroke();
  beltTex = new THREE.CanvasTexture(c);
  beltTex.wrapS = beltTex.wrapT = THREE.RepeatWrapping;
  beltTex.colorSpace = THREE.SRGBColorSpace;
  return beltTex;
}

export class KView {
  constructor(game, k, opts = {}) {
    this.g = game;
    this.k = k;
    this.quality = opts.quality || 'high';
    this.th = THEME[k.L.theme];
    this.chefSkins = opts.skins || ['cat', 'dog'];
    this.coop = !!opts.coop;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.th.bg);
    this.ox = -k.W / 2;
    this.oz = -k.H / 2;
    this.items = new Map();
    this.tileDyn = new Map();
    this.time = 0;
    this.buildLights();
    this.buildStatic();
    this.buildChefs();
    this.buildFx();
    this.guests = new Guests(this);
    this.ovRoot = opts.overlay || null;
    this.ov = new Map();
  }

  wx(x) {
    return x + 0.5 + this.ox;
  }
  wz(z) {
    return z + 0.5 + this.oz;
  }

  buildLights() {
    const sc = this.scene;
    const th = this.th;
    const night = this.k.L.theme === 'night';
    sc.add(new THREE.HemisphereLight(th.sky, night ? 0x2a2040 : 0x9a8a7a, night ? 1.6 : 1.9));
    const d = new THREE.DirectionalLight(th.light, night ? 1.3 : 1.7);
    d.position.set(-4, 12, 7);
    const s = Math.max(this.k.W, this.k.H) * 0.75 + 2;
    if (this.quality !== 'low') {
      d.castShadow = true;
      d.shadow.mapSize.set(this.quality === 'high' ? 2048 : 1024, this.quality === 'high' ? 2048 : 1024);
      d.shadow.camera.left = -s;
      d.shadow.camera.right = s;
      d.shadow.camera.top = s;
      d.shadow.camera.bottom = -s;
      d.shadow.camera.near = 1;
      d.shadow.camera.far = 40;
      d.shadow.bias = -0.0008;
      d.shadow.normalBias = 0.02;
    }
    sc.add(d);
    sc.add(d.target);
  }

  // ---------- статичная кухня ----------
  buildStatic() {
    const k = this.k;
    const th = this.th;
    const b = new B();
    const env = new B();
    // земля вокруг
    env.box(k.W + 40, 0.1, k.H + 40, th.ground, { y: -0.06 });
    for (const t of k.tiles) {
      const x = this.wx(t.x),
        z = this.wz(t.z);
      if (t.walk) {
        if (t.type === 'ice') {
          b.box(1, 0.04, 1, (t.x + t.z) % 2 ? '#cfeeff' : '#bfe6ff', { x, y: 0.0, z });
          if ((t.x * 7 + t.z * 3) % 3 === 0) b.box(0.5, 0.042, 0.04, '#ffffff', { x: x - 0.1, y: 0.0, z: z + 0.15, ry: 0.6 });
        } else b.box(1, 0.04, 1, (t.x + t.z) % 2 ? th.f1 : th.f2, { x, y: 0.0, z });
        continue;
      }
      if (t.type === 'void') continue;
      this.station(b, t, x, z);
    }
    const glow = new B();
    this.decor(env, glow);
    const m = b.mesh();
    this.scene.add(m);
    const e = env.mesh();
    e.castShadow = false;
    this.scene.add(e);
    const gm = glow.mesh(MAT_GLOW, false);
    gm.receiveShadow = false;
    this.scene.add(gm);
    this.staticMeshes = [m, e, gm];
  }

  counter(b, x, z, body, top) {
    b.rbox(0.98, CH - 0.06, 0.98, 0.06, body || this.th.body, { x, y: (CH - 0.06) / 2, z });
    b.rbox(1.0, 0.08, 1.0, 0.035, top || this.th.top, { x, y: CH - 0.04, z });
    b.box(0.9, 0.03, 0.02, shade(body || this.th.body, -0.12), { x, y: CH - 0.2, z: z + 0.49 });
  }

  station(b, t, x, z) {
    const th = this.th;
    const k = this.k;
    const dyn = {};
    switch (t.type) {
      case 'counter':
        this.counter(b, x, z);
        break;
      case 'board':
        this.counter(b, x, z);
        b.rbox(0.72, 0.05, 0.56, 0.03, '#d9a066', { x, y: CH + 0.025, z });
        b.rbox(0.66, 0.012, 0.5, 0.02, '#e8b27a', { x, y: CH + 0.051, z });
        // нож
        b.box(0.28, 0.012, 0.07, '#dfe6ee', { x: x + 0.14, y: CH + 0.065, z: z + 0.3, ry: 0.3 });
        b.box(0.14, 0.03, 0.045, '#5a3a2a', { x: x - 0.06, y: CH + 0.07, z: z + 0.36, ry: 0.3 });
        break;
      case 'stove': {
        this.counter(b, x, z, '#7b8296', '#3e4250');
        b.cyl(0.3, 0.3, 0.02, '#2a2c36', { x, y: CH + 0.01, z }, 24);
        b.torus(0.22, 0.02, '#5a5e6c', { x, y: CH + 0.02, z, rx: Math.PI / 2 });
        b.cyl(0.04, 0.04, 0.05, '#ff8a3c', { x: x - 0.25, y: CH - 0.25, z: z + 0.5, rx: Math.PI / 2 });
        b.cyl(0.04, 0.04, 0.05, '#ffd23f', { x: x + 0.25, y: CH - 0.25, z: z + 0.5, rx: Math.PI / 2 });
        // огонь конфорки
        const fb = new B();
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          fb.cone(0.035, 0.08, i % 2 ? '#ffb030' : '#4aa3ff', { x: Math.cos(a) * 0.17, y: 0.04, z: Math.sin(a) * 0.17 }, 6);
        }
        const flame = fb.mesh(MAT_GLOW, false);
        flame.position.set(x, CH, z);
        flame.visible = false;
        this.scene.add(flame);
        dyn.flame = flame;
        break;
      }
      case 'crate': {
        const wood = '#c88a52',
          wood2 = '#a96d3c';
        // ящик открыт сверху: дно с цветной подстилкой ниже бортиков, грани не совпадают (иначе мерцают)
        b.box(0.96, CH - 0.14, 0.96, wood2, { x, y: (CH - 0.14) / 2, z });
        for (let i = 0; i < 3; i++) b.box(0.98, 0.14, 0.98, wood, { x, y: 0.12 + i * 0.24, z });
        b.box(0.97, 0.15, 0.07, wood, { x, y: CH - 0.075, z: z + 0.45 });
        b.box(0.97, 0.15, 0.07, wood, { x, y: CH - 0.075, z: z - 0.45 });
        b.box(0.07, 0.15, 0.83, wood, { x: x + 0.45, y: CH - 0.075, z });
        b.box(0.07, 0.15, 0.83, wood, { x: x - 0.45, y: CH - 0.075, z });
        b.box(0.82, 0.03, 0.82, shade(ING[t.crate].col, -0.25), { x, y: CH - 0.06, z });
        // продукты горкой
        for (let i = 0; i < 4; i++) ingParts(b, t.crate, 'raw', { x: x + (i % 2 ? 0.17 : -0.17), y: CH - 0.05 + (i > 1 ? 0.03 : 0), z: z + (i > 1 ? 0.17 : -0.17), s: 0.9 });
        // табличка с продуктом
        b.rbox(0.42, 0.3, 0.04, 0.03, '#fff8ea', { x, y: CH * 0.55, z: z + 0.5 });
        ingParts(b, t.crate, 'raw', { x, y: CH * 0.55 - 0.1, z: z + 0.54, s: 0.75 });
        break;
      }
      case 'plates':
        this.counter(b, x, z);
        b.cyl(0.3, 0.3, 0.02, '#e0e6f0', { x, y: CH + 0.01, z }, 24);
        break;
      case 'serve': {
        this.counter(b, x, z, '#5ccc4e', '#e9ffe2');
        b.box(0.84, 0.02, 0.84, '#3a4a3a', { x, y: CH + 0.01, z });
        for (let i = 0; i < 3; i++) b.box(0.08, 0.025, 0.34, '#ffd23f', { x: x - 0.25 + i * 0.25, y: CH + 0.02, z, ry: 0.0 });
        // звонок
        b.cyl(0.07, 0.07, 0.02, '#c08a2a', { x: x + 0.34, y: CH + 0.02, z: z + 0.34 });
        b.hemi(0.06, '#ffd23f', { x: x + 0.34, y: CH + 0.03, z: z + 0.34 });
        // арка с табличкой
        b.box(0.06, 0.9, 0.06, '#ffffff', { x: x - 0.44, y: CH + 0.45, z: z - 0.44 });
        b.box(0.06, 0.9, 0.06, '#ffffff', { x: x + 0.44, y: CH + 0.45, z: z - 0.44 });
        b.rbox(1.0, 0.24, 0.08, 0.04, '#5ccc4e', { x, y: CH + 0.92, z: z - 0.44 });
        b.cone(0.07, 0.12, '#ffffff', { x, y: CH + 0.92, z: z - 0.39, rx: Math.PI / 2 }, 3);
        break;
      }
      case 'dirty':
        this.counter(b, x, z);
        b.box(0.8, 0.03, 0.8, '#aab4c4', { x, y: CH + 0.015, z });
        b.box(0.84, 0.06, 0.04, '#8894a8', { x, y: CH + 0.03, z: z + 0.4 });
        b.box(0.84, 0.06, 0.04, '#8894a8', { x, y: CH + 0.03, z: z - 0.4 });
        break;
      case 'sink':
        this.counter(b, x, z, '#9fc4e6', '#f4f9ff');
        b.box(0.62, 0.03, 0.56, '#4aa3ff', { x: x - 0.08, y: CH + 0.005, z });
        b.box(0.66, 0.06, 0.04, '#d6e4f2', { x: x - 0.08, y: CH + 0.03, z: z + 0.3 });
        b.box(0.66, 0.06, 0.04, '#d6e4f2', { x: x - 0.08, y: CH + 0.03, z: z - 0.3 });
        b.cyl(0.03, 0.03, 0.35, '#c8d2de', { x: x - 0.08, y: CH + 0.17, z: z - 0.38 });
        b.cyl(0.025, 0.025, 0.2, '#c8d2de', { x: x - 0.08, y: CH + 0.34, z: z - 0.28, rx: Math.PI / 2 });
        // сушилка
        b.box(0.18, 0.02, 0.5, '#d6e4f2', { x: x + 0.38, y: CH + 0.01, z });
        break;
      case 'trash':
        b.cyl(0.36, 0.32, CH, '#8a96a8', { x, y: CH / 2, z }, 20);
        b.torus(0.36, 0.03, '#6a7688', { x, y: CH, z, rx: Math.PI / 2 });
        for (let i = 0; i < 4; i++) b.box(0.04, CH * 0.7, 0.02, '#76829a', { x: x + Math.cos(i * 0.5 - 0.75) * 0.355, y: CH * 0.45, z: z + Math.sin(i * 0.5 - 0.75) * 0.355 + 0.0, ry: -(i * 0.5 - 0.75) + Math.PI / 2 });
        {
          const lb = new B();
          lb.cyl(0.38, 0.38, 0.06, '#a6b2c4', { y: 0.03 }, 20);
          lb.sph(0.06, '#6a7688', { y: 0.08, sy: 0.6 });
          const lid = lb.mesh();
          lid.position.set(x, CH, z);
          this.scene.add(lid);
          dyn.lid = lid;
        }
        break;
      case 'belt': {
        b.box(0.98, CH - 0.08, 0.98, '#6a6a7a', { x, y: (CH - 0.08) / 2, z });
        const [dx, dz] = t.dir;
        const side = dx !== 0 ? { sx: 1, sz: 0 } : { sx: 0, sz: 1 };
        // бортики
        for (const s of [-1, 1]) b.box(dx !== 0 ? 1 : 0.06, 0.08, dx !== 0 ? 0.06 : 1, '#ffd23f', { x: x + s * 0.47 * side.sz, y: CH - 0.02, z: z + s * 0.47 * side.sx });
        if (!this.beltMat) {
          this.beltMat = new THREE.MeshLambertMaterial({ map: beltTexture() });
        }
        const pm = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.88), this.beltMat);
        pm.rotation.x = -Math.PI / 2;
        // стрелка текстуры смотрит по +u; поворачиваем по направлению
        pm.rotation.z = dx > 0 ? 0 : dx < 0 ? Math.PI : dz > 0 ? -Math.PI / 2 : Math.PI / 2;
        pm.position.set(x, CH - 0.035, z);
        pm.receiveShadow = true;
        this.scene.add(pm);
        break;
      }
    }
    if (t.type !== 'trash' && t.type !== 'belt' && t.type !== 'crate' && t.type !== 'serve' && t.type !== 'stove' && t.type !== 'sink') {
      // прорези-ручки у столов спереди
    }
    this.tileDyn.set(t, dyn);
  }

  // ---------- оформление вокруг ----------
  decor(b, gl) {
    const k = this.k;
    const th = this.th;
    const theme = k.L.theme;
    const W = k.W,
      H = k.H;
    const zb = this.oz - 0.5; // задняя стена
    const wallH = 2.4;
    // задняя стена
    if (theme === 'snow') {
      for (let i = 0; i < 7; i++) b.cyl(0.18, 0.18, W + 1.6, i % 2 ? th.wall : th.wall2, { x: 0, y: 0.18 + i * 0.34, z: zb - 0.2, rz: Math.PI / 2 }, 10);
    } else if (theme === 'night') {
      for (let i = 0; i < W + 2; i++) b.box(1, wallH, 0.2, i % 2 ? th.wall : '#4e4290', { x: this.ox - 0.5 + i, y: wallH / 2, z: zb - 0.2 });
    } else {
      b.box(W + 1.6, wallH, 0.3, th.wall, { x: 0, y: wallH / 2, z: zb - 0.25 });
      // плитка-фартук
      for (let i = 0; i < W + 1; i++) b.box(0.94, 0.5, 0.05, i % 2 ? '#ffffff' : shade(th.wall, 0.06), { x: this.ox + i, y: CH + 0.35, z: zb - 0.08 });
    }
    // окна на стене
    const nWin = Math.max(1, Math.floor(W / 5));
    for (let i = 0; i < nWin; i++) {
      const wx = ((i + 0.5) / nWin - 0.5) * (W - 2);
      if (theme === 'night') {
        // гирлянда
        for (let j = 0; j < 9; j++) {
          const xx = wx - 2 + j * 0.5;
          const yy = wallH + 0.15 - Math.sin((j / 8) * Math.PI) * 0.4;
          b.sph(0.07, ['#ffd23f', '#ff7aa2', '#7ae0ff', '#a8ff7a'][j % 4], { x: xx, y: yy, z: zb + 0.05 });
        }
        b.rbox(1.6, 0.9, 0.08, 0.06, '#ffcf5a', { x: wx, y: 1.75, z: zb - 0.05 });
        b.rbox(1.4, 0.7, 0.1, 0.06, '#ff7aa2', { x: wx, y: 1.75, z: zb - 0.03 });
        continue;
      }
      b.rbox(1.5, 1.0, 0.08, 0.05, '#ffffff', { x: wx, y: 1.75, z: zb - 0.06 });
      b.rbox(1.3, 0.8, 0.1, 0.04, theme === 'snow' ? '#cfe6ff' : theme === 'beach' ? '#7fd8ff' : '#bfe6ff', { x: wx, y: 1.75, z: zb - 0.05 });
      b.box(0.06, 0.8, 0.11, '#ffffff', { x: wx, y: 1.75, z: zb - 0.04 });
      if (theme === 'snow') for (let j = 0; j < 5; j++) b.sph(0.03, '#ffffff', { x: wx - 0.5 + j * 0.25, y: 1.55 + (j % 3) * 0.2, z: 0 + zb - 0.0 });
      // занавески
      if (theme === 'home') {
        b.box(0.3, 1.0, 0.04, th.wall2, { x: wx - 0.75, y: 1.75, z: zb });
        b.box(0.3, 1.0, 0.04, th.wall2, { x: wx + 0.75, y: 1.75, z: zb });
      }
    }
    // полка с баночками
    if (theme !== 'night') {
      const sx = W / 2 - 1.5;
      b.box(1.6, 0.06, 0.25, shade(th.body, -0.1), { x: sx, y: 1.95, z: zb - 0.05 });
      for (let j = 0; j < 4; j++) {
        b.cyl(0.09, 0.09, 0.2, ['#ff8a7a', '#ffd23f', '#8be05e', '#7ab8ff'][j], { x: sx - 0.55 + j * 0.36, y: 2.08, z: zb - 0.05 });
        b.cyl(0.095, 0.095, 0.04, '#ffffff', { x: sx - 0.55 + j * 0.36, y: 2.2, z: zb - 0.05 });
      }
    }
    // кухонная утварь на стене: рейлинг с половником, лопаткой и сковородкой, часы
    if (theme !== 'night') {
      const rx = -W / 2 + 2.2;
      b.cyl(0.025, 0.025, 1.8, '#c8ccd6', { x: rx, y: 2.05, z: zb - 0.02, rz: Math.PI / 2 });
      const tools = [
        (x) => { b.cyl(0.015, 0.015, 0.5, '#d8dce6', { x, y: 1.8, z: zb }); b.hemi(0.09, '#d8dce6', { x, y: 1.55, z: zb + 0.02, rx: Math.PI }); },
        (x) => { b.cyl(0.015, 0.015, 0.45, '#8a5a3a', { x, y: 1.82, z: zb }); b.rbox(0.12, 0.16, 0.02, 0.02, '#4a4a58', { x, y: 1.55, z: zb + 0.01 }); },
        (x) => { b.cyl(0.02, 0.02, 0.3, '#8a5a3a', { x, y: 1.9, z: zb }); b.cyl(0.17, 0.15, 0.04, '#3a3a46', { x, y: 1.62, z: zb + 0.03, rx: Math.PI / 2 }); },
        (x) => { b.cyl(0.015, 0.015, 0.5, '#d8dce6', { x, y: 1.8, z: zb }); for (let j = -1; j <= 1; j++) b.box(0.012, 0.14, 0.012, '#d8dce6', { x: x + j * 0.035, y: 1.5, z: zb }); },
      ];
      tools.forEach((f, j) => f(rx - 0.6 + j * 0.4));
      // часы
      const cx = W / 2 - 3.6;
      b.cyl(0.26, 0.26, 0.06, '#ffffff', { x: cx, y: 1.85, z: zb, rx: Math.PI / 2 }, 24);
      b.torus(0.26, 0.03, theme === 'snow' ? '#7c5236' : '#ff8a5c', { x: cx, y: 1.85, z: zb + 0.03 });
      b.box(0.025, 0.16, 0.02, '#3a3040', { x: cx, y: 1.91, z: zb + 0.05 });
      b.box(0.12, 0.025, 0.02, '#3a3040', { x: cx + 0.05, y: 1.85, z: zb + 0.05 });
    } else {
      // вывеска «кафе» с огоньками
      b.rbox(2.2, 0.6, 0.1, 0.08, '#ffcf5a', { x: 0, y: 2.55, z: zb - 0.02 });
      b.rbox(2.0, 0.42, 0.12, 0.06, '#ff7aa2', { x: 0, y: 2.55, z: zb });
      for (let j = 0; j < 7; j++) b.sph(0.06, '#fff4c0', { x: -0.9 + j * 0.3, y: 2.55, z: zb + 0.08 });
    }
    // мелочи на задних столах: банки, соль-перец, цветок, стопка мисок
    for (const t of k.tiles) {
      if (t.type !== 'counter' || t.z !== 0) continue;
      const h = (t.x * 37 + k.idx * 11) % 5;
      const x = this.wx(t.x) + (t.x % 2 ? 0.3 : -0.3),
        z = this.wz(t.z) - 0.36,
        y = CH;
      if (h === 0) {
        b.cyl(0.07, 0.07, 0.18, '#bfe3ff', { x, y: y + 0.09, z });
        b.cyl(0.075, 0.075, 0.04, '#ff8a5c', { x, y: y + 0.2, z });
      } else if (h === 1) {
        b.cyl(0.035, 0.04, 0.12, '#ffffff', { x: x - 0.05, y: y + 0.06, z });
        b.cyl(0.035, 0.04, 0.12, '#3a3a46', { x: x + 0.05, y: y + 0.06, z });
      } else if (h === 2) {
        b.cyl(0.07, 0.055, 0.1, '#e8845a', { x, y: y + 0.05, z });
        b.sph(0.08, '#6cc24a', { x, y: y + 0.15, z });
        b.sph(0.03, '#ff9ab0', { x: x + 0.04, y: y + 0.22, z: z + 0.03 });
      } else if (h === 3) {
        for (let j = 0; j < 3; j++) b.cyl(0.09 - j * 0.005, 0.06, 0.04, ['#ffd27a', '#7ab8ff', '#ff9ab0'][j], { x, y: y + 0.02 + j * 0.035, z });
      }
    }
    // окружение: терраса, дорожки, столики кафе, задний план
    this.seats = buildExterior(this, b, gl);
  }

  // ---------- повара ----------
  buildChefs() {
    this.chefM = this.k.chefs.map((c, i) => {
      const m = makeChef(this.chefSkins[i], APRON[i]);
      this.scene.add(m.group);
      const sh = blobShadow(0.42, 0.25);
      sh.position.y = 0.025;
      this.scene.add(sh);
      m.shadow = sh;
      // кольцо под активным поваром
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.46, 32), new THREE.MeshBasicMaterial({ color: APRON[i], transparent: true, opacity: 0.85, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      this.scene.add(ring);
      m.ring = ring;
      // стрелка над головой
      const ab = new B();
      ab.cone(0.12, 0.2, APRON[i], { rx: Math.PI }, 4);
      const arrow = ab.mesh(MAT_GLOW, false);
      this.scene.add(arrow);
      m.arrow = arrow;
      m.dir = c.dir;
      return m;
    });
    // подсветка клетки, с которой взаимодействует активный повар
    this.hls = [0, 1].map(() => {
      const hl = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.5, 4, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }));
      hl.rotation.x = -Math.PI / 2;
      hl.rotation.z = Math.PI / 4;
      this.scene.add(hl);
      return hl;
    });
  }

  // ---------- частицы ----------
  buildFx() {
    const N = 260;
    const geo = new THREE.IcosahedronGeometry(1, 0);
    this.pm = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false }), N);
    this.pm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pm.frustumCulled = false;
    this.parts = [];
    for (let i = 0; i < N; i++) {
      this.parts.push({ life: 0 });
      this.pm.setColorAt(i, new THREE.Color(1, 1, 1));
    }
    this.pIdx = 0;
    this.scene.add(this.pm);
    // пламя пожара: группы на клетках
    this.fires = new Map();
  }

  spawn(x, y, z, vx, vy, vz, col, size, life, grav = 0, grow = 0) {
    const p = this.parts[this.pIdx];
    this.pIdx = (this.pIdx + 1) % this.parts.length;
    Object.assign(p, { x, y, z, vx, vy, vz, size, life, max: life, grav, grow });
    this.pm.setColorAt(this.parts.indexOf(p), new THREE.Color(col));
    this.pm.instanceColor.needsUpdate = true;
  }

  burst(type, tx, tz) {
    const x = this.wx(tx),
      z = this.wz(tz);
    const r = () => Math.random() - 0.5;
    switch (type) {
      case 'chop':
        for (let i = 0; i < 4; i++) this.spawn(x + r() * 0.2, CH + 0.12, z + r() * 0.2, r() * 1.5, 1.5 + Math.random(), r() * 1.5, this.chopCol(tx, tz), 0.03, 0.45, 6);
        break;
      case 'serve':
        for (let i = 0; i < 16; i++) this.spawn(x, CH + 0.3, z, r() * 3, 2 + Math.random() * 2, r() * 3, ['#ffd23f', '#ff7aa2', '#7ae0ff', '#8be05e'][i % 4], 0.05, 0.9, 5);
        break;
      case 'wash':
        for (let i = 0; i < 5; i++) this.spawn(x - 0.08 + r() * 0.3, CH + 0.1, z + r() * 0.3, r() * 1.2, 1.2 + Math.random(), r() * 1.2, i % 2 ? '#ffffff' : '#bfe6ff', 0.04, 0.5, 4);
        break;
      case 'trash':
        for (let i = 0; i < 6; i++) this.spawn(x, CH + 0.2, z, r() * 1.5, 1.5, r() * 1.5, '#b0b8c8', 0.04, 0.4, 5);
        break;
      case 'poof':
        for (let i = 0; i < 8; i++) this.spawn(x + r() * 0.5, CH + 0.2, z + r() * 0.5, r() * 0.6, 0.8, r() * 0.6, '#9aa0aa', 0.12, 1.0, -0.3, 0.2);
        break;
      case 'plop':
        for (let i = 0; i < 5; i++) this.spawn(x + r() * 0.2, CH + 0.25, z + r() * 0.2, r() * 1.2, 1.8, r() * 1.2, '#ffffff', 0.035, 0.4, 6);
        break;
    }
  }

  chopCol(tx, tz) {
    const t = this.k.tile(tx, tz);
    return t && t.item && t.item.id ? ING[t.item.id].col : '#ffffff';
  }

  updFx(dt) {
    const m = new THREE.Matrix4();
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      if (p.life <= 0) {
        this.pm.setMatrixAt(i, zero);
        continue;
      }
      p.life -= dt;
      p.vy -= p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.size += p.grow * dt;
      const s = p.size * Math.min(1, (p.life / p.max) * 2.5);
      m.makeScale(s, s, s);
      m.setPosition(p.x, p.y, p.z);
      this.pm.setMatrixAt(i, m);
    }
    this.pm.instanceMatrix.needsUpdate = true;
  }

  // ---------- кадр ----------
  update(dt) {
    const k = this.k;
    this.time += dt;
    // события логики → эффекты
    for (const e of k.events) {
      if (e.type === 'chop') this.burst('chop', e.x, e.z);
      else if (e.type === 'serve') this.burst('serve', e.x, e.z);
      else if (e.type === 'wash' || e.type === 'washed') this.burst('wash', e.x, e.z);
      else if (e.type === 'trash') {
        this.burst('trash', e.x, e.z);
        const d = this.tileDyn.get(k.tile(e.x, e.z));
        if (d && d.lid) d.lidT = 0.5;
      } else if (e.type === 'burnt' || e.type === 'extinguished') this.burst('poof', e.x, e.z);
      else if (e.type === 'plop') this.burst('plop', e.x, e.z);
    }
    this.syncChefs(dt);
    this.guests.update(dt);
    this.syncItems(dt);
    this.syncTiles(dt);
    this.ambient(dt);
    this.updFx(dt);
    if (this.beltMat) this.beltMat.map.offset.x -= dt / 1.0;
  }

  syncChefs(dt) {
    const k = this.k;
    k.chefs.forEach((c, i) => {
      const m = this.chefM[i];
      const x = c.x + this.ox,
        z = c.z + this.oz;
      m.group.position.set(x, 0, z);
      let d = c.dir - m.dir;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      m.dir += d * Math.min(1, dt * 16);
      m.group.rotation.y = m.dir;
      c.act = Math.max(0, (c.act || 0) - dt);
      animChef(m, c.walkPh, c.moving, !!c.hold, !!c.work || c.spray, c.act * 2);
      m.shadow.position.set(x, 0.025, z);
      const act = i === k.active || this.coop;
      m.ring.visible = act && k.chefs.length > 1;
      m.ring.position.set(x, 0.03, z);
      m.arrow.visible = act && k.chefs.length > 1;
      m.arrow.position.set(x, 1.85 + Math.sin(this.time * 5 + i) * 0.06, z);
      m.arrow.rotation.y = this.time * 2;
    });
    // подсветка клетки перед поваром: у активного, а вдвоём — у обоих
    this.hls.forEach((hl, i) => {
      const who = this.coop ? i : k.active;
      const c = k.chefs[who];
      const t = (this.coop || i === 0) && c && c.target;
      hl.visible = !!t && k.started && !k.finished;
      if (!hl.visible) return;
      const top = t.type === 'trash' ? CH + 0.08 : CH + 0.005;
      hl.position.set(this.wx(t.x), top + 0.01 + i * 0.002, this.wz(t.z));
      hl.material.opacity = 0.55 + Math.sin(this.time * 8) * 0.25;
      hl.material.color.set(APRON[who]);
    });
  }

  itemTarget(it, where) {
    // where: { tile } или { chef }
    if (where.chef) {
      const m = this.chefM[where.chef.i];
      const c = where.chef;
      const fx = Math.sin(m.dir),
        fz = Math.cos(m.dir);
      const bob = m.body.position.y;
      const up = it.k === 'pan' || it.k === 'pot' ? 0.5 : it.k === 'ext' ? 0.35 : 0.55;
      return { x: c.x + this.ox + fx * 0.46, y: up + bob, z: c.z + this.oz + fz * 0.46, ry: m.dir + (it.k === 'pan' ? -Math.PI / 2 : 0), s: (ITEM_S[it.k] || 1) * HOLD_K };
    }
    const t = where.tile;
    let y = CH;
    if (t.type === 'board') y += 0.05;
    if (t.type === 'stove') y += 0.02;
    return { x: this.wx(t.x), y, z: this.wz(t.z), ry: it.k === 'pan' ? Math.PI / 2 : 0, s: ITEM_S[it.k] || 1 };
  }

  syncItems(dt) {
    const k = this.k;
    const seen = new Set();
    const place = (it, where) => {
      if (!it) return;
      seen.add(it.uid);
      let e = this.items.get(it.uid);
      const tg = this.itemTarget(it, where);
      const ver = it.v + (it.k === 'pan' && it.item ? it.item.v * 1000 + it.item.uid * 7 : 0);
      if (!e || e.v !== ver) {
        const m = itemMesh(it, (p) => dishOf(p, k.L.menu));
        if (e) {
          m.position.copy(e.m.position);
          m.rotation.y = e.m.rotation.y;
          this.scene.remove(e.m);
          e.m.geometry.dispose();
        } else {
          m.position.set(tg.x, tg.y, tg.z);
          m.rotation.y = tg.ry;
          if (where.tile) m.scale.setScalar(0.3 * tg.s);
        }
        this.scene.add(m);
        e = { m, v: ver, pop: e ? 0.15 : 0 };
        this.items.set(it.uid, e);
      }
      const a = 1 - Math.exp(-dt * 22);
      e.m.position.x += (tg.x - e.m.position.x) * a;
      e.m.position.y += (tg.y - e.m.position.y) * a;
      e.m.position.z += (tg.z - e.m.position.z) * a;
      let d = tg.ry - e.m.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      e.m.rotation.y += d * a;
      // «пружинка» при появлении/изменении
      const sc = e.m.scale.x + (tg.s - e.m.scale.x) * Math.min(1, dt * 14);
      e.m.scale.setScalar(sc);
      if (e.pop > 0) {
        e.pop -= dt;
        e.m.scale.setScalar(tg.s * (1 + Math.sin((e.pop / 0.15) * Math.PI) * 0.2));
      }
    };
    for (const t of k.tiles) if (t.item) place(t.item, { tile: t });
    for (const c of k.chefs) if (c.hold) place(c.hold, { chef: c });
    for (const [uid, e] of this.items)
      if (!seen.has(uid)) {
        this.scene.remove(e.m);
        e.m.geometry.dispose();
        this.items.delete(uid);
      }
  }

  stack(dyn, key, n, make, x, y, z, step) {
    if (dyn[key + 'N'] === n) return;
    dyn[key + 'N'] = n;
    if (dyn[key]) {
      this.scene.remove(dyn[key]);
      dyn[key].geometry.dispose();
      dyn[key] = null;
    }
    if (!n) return;
    const b = new B();
    for (let i = 0; i < Math.min(n, 8); i++) make(b, i);
    const m = b.mesh();
    m.position.set(x, y, z);
    this.scene.add(m);
    dyn[key] = m;
  }

  syncTiles(dt) {
    const k = this.k;
    const plate = (dirty) => (b, i) => {
      b.cyl(0.35, 0.29, 0.055, '#ffffff', { y: 0.028 + i * 0.06 }, 24);
      b.torus(0.32, 0.028, '#e8eef8', { y: 0.056 + i * 0.06, rx: Math.PI / 2 });
      if (dirty) {
        b.sph(0.1, '#a88a5a', { x: 0.07, y: 0.06 + i * 0.06, z: 0.04, sy: 0.15 });
        b.sph(0.06, '#9a7a4a', { x: -0.1, y: 0.06 + i * 0.06, z: -0.06, sy: 0.15 });
      }
    };
    for (const t of k.tiles) {
      const dyn = this.tileDyn.get(t);
      if (!dyn) continue;
      const x = this.wx(t.x),
        z = this.wz(t.z);
      if (t.type === 'plates') this.stack(dyn, 'st', t.count, plate(false), x, CH + 0.02, z);
      else if (t.type === 'dirty') this.stack(dyn, 'st', t.count, plate(true), x, CH + 0.03, z);
      else if (t.type === 'sink') {
        this.stack(dyn, 'st', t.dirty, plate(true), x - 0.08, CH + 0.02, z);
        this.stack(dyn, 'cl', t.clean, (b, i) => b.cyl(0.04, 0.04, 0.42, '#ffffff', { x: 0, y: 0.21, z: -0.18 + i * 0.09, rx: 0.2 }), x + 0.38, CH, z);
      } else if (t.type === 'stove') {
        const it = t.item;
        const on = !!it && ((it.k === 'pot' && it.n > 0 && !it.burnt) || (it.k === 'pan' && it.item && it.item.st !== 'burnt'));
        dyn.flame.visible = on;
        if (on) dyn.flame.scale.set(1, 0.8 + Math.sin(this.time * 20 + t.x) * 0.2, 1);
      }
      if (dyn.lid) {
        dyn.lidT = Math.max(0, (dyn.lidT || 0) - dt);
        dyn.lid.rotation.x = -Math.min(1, dyn.lidT * 4) * 1.1;
        dyn.lid.position.z = z - Math.min(1, dyn.lidT * 4) * 0.25;
      }
      // пожар
      let f = this.fires.get(t);
      if (t.fire > 0) {
        if (!f) {
          const fb = new B();
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2;
            fb.cone(0.13, 0.45, i % 2 ? '#ff7a2a' : '#ffb030', { x: Math.cos(a) * 0.22, y: 0.22, z: Math.sin(a) * 0.22 }, 6);
          }
          fb.cone(0.2, 0.7, '#ffd23f', { y: 0.35 }, 7);
          f = fb.mesh(MAT_GLOW, false);
          f.position.set(x, CH, z);
          this.scene.add(f);
          this.fires.set(t, f);
        }
        const s = 0.4 + t.fire * 0.7;
        f.scale.set(s * (1 + Math.sin(this.time * 17 + t.x) * 0.08), s * (1 + Math.sin(this.time * 23 + t.z) * 0.15), s);
        if (Math.random() < dt * 8) this.spawn(x + (Math.random() - 0.5) * 0.4, CH + 0.6, z + (Math.random() - 0.5) * 0.4, 0, 0.9, 0, '#6a6470', 0.1, 1.2, -0.2, 0.15);
      } else if (f) {
        this.scene.remove(f);
        f.geometry.dispose();
        this.fires.delete(t);
      }
    }
    // огнетушитель: струя
    for (const c of k.chefs) {
      if (!c.spray) continue;
      const fx = Math.sin(c.dir),
        fz = Math.cos(c.dir);
      for (let i = 0; i < 3; i++) {
        const sp = 3 + Math.random() * 1.5;
        this.spawn(c.x + this.ox + fx * 0.5, 0.75, c.z + this.oz + fz * 0.5, fx * sp + (Math.random() - 0.5), 0.3 + Math.random() * 0.5, fz * sp + (Math.random() - 0.5), '#ffffff', 0.08, 0.55, 1, 0.25);
      }
    }
  }

  // пар над кастрюлями, дымок, искры
  ambient(dt) {
    for (const t of this.k.tiles) {
      const it = t.item;
      if (!it || t.type !== 'stove') continue;
      const cooking = (it.k === 'pot' && it.n > 0) || (it.k === 'pan' && it.item);
      if (!cooking) continue;
      const burnt = it.burnt || (it.item && it.item.st === 'burnt');
      const warn = !burnt && it.burn > WARN_TIME;
      const rate = burnt ? 12 : warn ? 7 : 2.2;
      if (Math.random() < dt * rate)
        this.spawn(this.wx(t.x) + (Math.random() - 0.5) * 0.25, CH + 0.3, this.wz(t.z) + (Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.15, burnt ? 0.9 : 0.7, 0, burnt ? '#3a3438' : warn ? '#8a8288' : '#ffffff', burnt ? 0.1 : 0.06, burnt ? 1.6 : 1.1, -0.1, burnt ? 0.3 : 0.12);
    }
  }

  // ---------- подсказки над станциями (DOM) ----------
  // возвращает список значков: прогресс нарезки/готовки/мойки, содержимое кастрюль, «!» перед подгоранием
  overlays(cam, W, H) {
    const k = this.k;
    const out = [];
    const v = new THREE.Vector3();
    const proj = (x, y, z) => {
      v.set(x, y, z).project(cam);
      return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
    };
    for (const t of k.tiles) {
      const it = t.item;
      const x = this.wx(t.x),
        z = this.wz(t.z);
      if (t.type === 'board' && it && it.k === 'ing' && it.st === 'raw' && it.chop > 0) {
        out.push({ key: 'b' + t.x + '_' + t.z, pos: proj(x, CH + 0.62, z), bar: it.chop, col: '#5ccc4e' });
      }
      if (t.type === 'sink' && t.prog > 0 && t.dirty > 0) out.push({ key: 's' + t.x + '_' + t.z, pos: proj(x, CH + 0.6, z), bar: t.prog, col: '#4aa3ff' });
      if (it && (it.k === 'pot' || it.k === 'pan')) {
        const pos = proj(x, CH + 0.8, z);
        const key = 'p' + it.uid;
        const icons = [];
        let bar = null,
          col = '#ffb030',
          warn = false,
          done = false;
        if (it.k === 'pot' && it.n > 0) {
          if (it.burnt) icons.push(thumb(it.ing + ':burnt'));
          else for (let i = 0; i < (it.kind === 'soup' ? 3 : 1); i++) icons.push(i < it.n ? thumb(it.ing + ':' + (it.kind === 'soup' ? 'chop' : 'raw')) : '');
          if (it.burnt) warn = 'x';
          else if (it.done) {
            done = true;
            warn = it.burn > WARN_TIME;
            bar = 1 - it.burn / BURN_TIME;
            col = it.burn > WARN_TIME ? '#ff5a4a' : '#ffb030';
          } else if (t.type === 'stove') bar = it.p;
        } else if (it.k === 'pan' && it.item) {
          icons.push(thumb(it.item.id + ':' + (it.item.st === 'burnt' ? 'burnt' : 'chop')));
          if (it.item.st === 'burnt') warn = 'x';
          else if (it.item.st === 'cook') {
            done = true;
            warn = it.burn > WARN_TIME;
            bar = 1 - it.burn / BURN_TIME;
            col = it.burn > WARN_TIME ? '#ff5a4a' : '#ffb030';
          } else if (t.type === 'stove') bar = it.p;
        }
        if (icons.length) out.push({ key, pos, icons, bar, col, warn, done });
      }
    }
    // кастрюля в руках — тоже показываем содержимое
    for (const c of k.chefs) {
      const it = c.hold;
      if (!it || it.k !== 'pot' || !it.n) continue;
      const m = this.chefM[c.i];
      const pos = proj(m.group.position.x, 1.9, m.group.position.z);
      const icons = [];
      if (it.burnt) icons.push(thumb(it.ing + ':burnt'));
      else for (let i = 0; i < (it.kind === 'soup' ? 3 : 1); i++) icons.push(i < it.n ? thumb(it.ing + ':' + (it.kind === 'soup' ? 'chop' : 'raw')) : '');
      out.push({ key: 'p' + it.uid, pos, icons, bar: it.done ? null : it.p, col: '#ffb030', warn: it.burnt ? 'x' : false, done: it.done });
    }
    return out;
  }

  // границы кадра камеры (в мире): кухня плюс место под очередь гостей
  bounds() {
    const e = this.guests.extra();
    return { x0: this.ox - e.x0, x1: -this.ox + e.x1, z0: this.oz - 0.3 - e.z0, z1: -this.oz + e.z1 };
  }

  dispose() {
    this.guests.dispose();
    disposeTree(this.scene);
  }
}
