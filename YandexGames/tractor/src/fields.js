// Поле: сетка клеток 0,5 м, текстура (трава, пашня, всходы, стерня), растения (InstancedMesh), стадии
import * as THREE from 'three';
import { FIELD_W, FIELD_D, CELL, FCX, FCZ, ST, CROPS } from './econ.js';
import * as M from './models.js';

const PX = 8; // пикселей текстуры на клетку
const BX = FCX / 2,
  BZ = FCZ / 2; // растения — по одному на 2×2 клетки
const hash = (a, b) => {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
  return (h ^ (h >>> 16)) / 4294967296;
};
const cropGeos = {};
export const getCropGeo = (id) => (cropGeos[id] = cropGeos[id] || M.cropGeo(id));

export class Field {
  constructor(world, def, idx) {
    this.world = world;
    this.def = def;
    this.idx = idx;
    this.x = def.x;
    this.z = def.z;
    this.owned = def.cost === 0;
    this.stage = ST.WILD;
    this.crop = 'wheat';
    this.t0 = 0;
    this.dur = 0;
    this.cells = new Uint8Array(FCX * FCZ);
    this.doneN = 0;
    this.yieldLeft = 0;
    // текстура
    this.cv = document.createElement('canvas');
    this.cv.width = FCX * PX;
    this.cv.height = FCZ * PX;
    this.g = this.cv.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.cv);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(FIELD_W, FIELD_D), new THREE.MeshLambertMaterial({ map: this.tex }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(this.x, 0.03, this.z);
    mesh.receiveShadow = true;
    world.scene.add(mesh);
    this.mesh = mesh;
    // бортик поля
    const rim = [];
    const hw = FIELD_W / 2 + 0.25,
      hd = FIELD_D / 2 + 0.25;
    rim.push(M.part(new THREE.BoxGeometry(FIELD_W + 0.5, 0.18, 0.3), 0x7a5232, [0, 0.09, -hd]));
    rim.push(M.part(new THREE.BoxGeometry(FIELD_W + 0.5, 0.18, 0.3), 0x7a5232, [0, 0.09, hd]));
    rim.push(M.part(new THREE.BoxGeometry(0.3, 0.18, FIELD_D + 0.5), 0x7a5232, [-hw, 0.09, 0]));
    rim.push(M.part(new THREE.BoxGeometry(0.3, 0.18, FIELD_D + 0.5), 0x7a5232, [hw, 0.09, 0]));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) rim.push(M.part(new THREE.BoxGeometry(0.3, 0.9, 0.3), 0xf6f1e6, [sx * hw, 0.45, sz * hd]));
    world.add(M.merge(rim), this.x, this.z, 0, 0, false);
    // табличка у некупленного поля
    this.sign = world.add(M.signGeo(), this.x, this.z - FIELD_D / 2 - 1.2);
    // растения
    this.inst = new THREE.InstancedMesh(getCropGeo('wheat'), world.mat, BX * BZ);
    this.inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.inst.castShadow = world.sun.castShadow;
    this.inst.receiveShadow = true;
    world.scene.add(this.inst);
    this.base = [];
    for (let bz = 0; bz < BZ; bz++)
      for (let bx = 0; bx < BX; bx++) {
        const jx = (hash(bx + idx * 31, bz) - 0.5) * 0.35,
          jz = (hash(bz + idx * 17, bx + 3) - 0.5) * 0.35;
        this.base.push({ x: this.x - FIELD_W / 2 + (bx * 2 + 1) * CELL + jx, z: this.z - FIELD_D / 2 + (bz * 2 + 1) * CELL + jz, r: hash(bx, bz + 99) * 6.28, s: 0.85 + hash(bx + 7, bz) * 0.3 });
      }
    for (let i = 0; i < BX * BZ; i++) this.inst.setColorAt(i, new THREE.Color(1, 1, 1));
    this._dummy = new THREE.Object3D();
    this._col = new THREE.Color();
    this.lastScale = -1;
    this.paintAll();
    this.updatePlants(true);
  }

  get total() {
    return FCX * FCZ;
  }
  progress() {
    return this.doneN / this.total;
  }
  growK(now) {
    if (this.stage === ST.RIPE) return 1;
    if (this.stage !== ST.GROWING) return 0;
    return Math.max(0, Math.min(1, (now - this.t0) / this.dur));
  }
  timeLeft(now) {
    return Math.max(0, (this.t0 + this.dur - now) / 1000);
  }

  // какая операция нужна полю: plow / seed / harvest / null
  need() {
    if (!this.owned) return null;
    if (this.stage === ST.WILD || this.stage === ST.STUBBLE) return 'plow';
    if (this.stage === ST.PLOWED) return 'seed';
    if (this.stage === ST.RIPE) return 'harvest';
    return null;
  }

  contains(x, z, pad = 0) {
    return Math.abs(x - this.x) <= FIELD_W / 2 + pad && Math.abs(z - this.z) <= FIELD_D / 2 + pad;
  }

  // ---------- рисование клеток ----------
  _cellLook(i) {
    const d = this.cells[i];
    switch (this.stage) {
      case ST.WILD:
        return d ? 'plowed' : 'grass';
      case ST.STUBBLE:
        return d ? 'plowed' : 'stubble';
      case ST.PLOWED:
        return d ? 'sown' : 'plowed';
      case ST.GROWING:
        return 'sown';
      case ST.RIPE:
        return d ? 'stubble' : 'sown';
    }
    return 'grass';
  }

  paintCell(ix, iz) {
    const g = this.g;
    const look = this._cellLook(iz * FCX + ix);
    const x = ix * PX,
      y = iz * PX; // верх текстуры — край поля с меньшим z (плоскость повёрнута на -90° по X)
    const h = hash(ix + this.idx * 101, iz);
    if (look === 'grass') {
      g.fillStyle = h < 0.5 ? '#79bd55' : '#73b650';
      g.fillRect(x, y, PX, PX);
      if (h > 0.7) {
        g.fillStyle = '#5ea443';
        g.fillRect(x + 2, y + 1, 2, 5);
      }
    } else if (look === 'plowed' || look === 'sown') {
      g.fillStyle = iz % 2 ? '#8e5c37' : '#7a4c2c';
      g.fillRect(x, y, PX, PX);
      g.fillStyle = 'rgba(0,0,0,.08)';
      g.fillRect(x, y + (iz % 2 ? 6 : 0), PX, 2);
      if (look === 'sown' && ix % 2 === 0 && iz % 2 === 0) {
        g.fillStyle = '#5fae4a';
        g.fillRect(x + 3, y + 2, 3, 3);
      }
    } else {
      g.fillStyle = h < 0.5 ? '#cfb35c' : '#c7aa52';
      g.fillRect(x, y, PX, PX);
      g.fillStyle = '#a88c3c';
      g.fillRect(x + (h * 5) | 0, y + 2, 1, 4);
    }
  }

  paintAll() {
    for (let iz = 0; iz < FCZ; iz++) for (let ix = 0; ix < FCX; ix++) this.paintCell(ix, iz);
    this.tex.needsUpdate = true;
  }

  // ---------- растения ----------
  updatePlants(force, now = Date.now()) {
    const D = this._dummy,
      C = this._col;
    const st = this.stage;
    const k = this.growK(now);
    const sc = st === ST.PLOWED ? 0.14 : st === ST.GROWING ? 0.18 + 0.82 * k : st === ST.RIPE ? 1 : 0;
    if (!force && Math.abs(sc - this.lastScale) < 0.01 && st !== ST.RIPE && st !== ST.PLOWED) return;
    this.lastScale = sc;
    // пока растёт — зеленее, созрело — родной цвет
    const ripe = st === ST.RIPE ? 1 : st === ST.GROWING ? Math.pow(k, 2) : 0;
    C.setRGB(0.45 + 0.55 * ripe, 0.85 + 0.15 * ripe, 0.35 + 0.65 * ripe);
    for (let b = 0; b < this.base.length; b++) {
      const p = this.base[b];
      const bx = b % BX,
        bz = (b / BX) | 0;
      const ci = bz * 2 * FCX + bx * 2;
      let vis = sc > 0;
      if (st === ST.PLOWED) vis = !!this.cells[ci];
      if (st === ST.RIPE) vis = !this.cells[ci] && !this.cells[ci + 1] && !this.cells[ci + FCX] && !this.cells[ci + FCX + 1];
      D.position.set(p.x, 0.03, p.z);
      D.rotation.set(0, p.r, 0);
      D.scale.setScalar(vis ? sc * p.s : 0);
      D.updateMatrix();
      this.inst.setMatrixAt(b, D.matrix);
      this.inst.setColorAt(b, C);
    }
    this.inst.instanceMatrix.needsUpdate = true;
    this.inst.instanceColor.needsUpdate = true;
  }

  setCrop(id) {
    if (this.crop === id && this.inst.geometry === getCropGeo(id)) return;
    this.crop = id;
    this.inst.geometry = getCropGeo(id);
  }

  // ---------- работа орудия ----------
  // точки (x, z) под орудием; возвращает число новых обработанных клеток
  work(points) {
    let n = 0;
    const x0 = this.x - FIELD_W / 2,
      z0 = this.z - FIELD_D / 2;
    for (const [x, z] of points) {
      const ix = Math.floor((x - x0) / CELL),
        iz = Math.floor((z - z0) / CELL);
      if (ix < 0 || iz < 0 || ix >= FCX || iz >= FCZ) continue;
      const i = iz * FCX + ix;
      if (this.cells[i]) continue;
      this.cells[i] = 1;
      this.doneN++;
      n++;
      this.paintCell(ix, iz);
    }
    if (n) this.tex.needsUpdate = true;
    return n;
  }

  // перейти к следующей стадии (дорисовать оставшиеся клетки)
  advance(now, growMul) {
    if (this.stage === ST.WILD || this.stage === ST.STUBBLE) this.stage = ST.PLOWED;
    else if (this.stage === ST.PLOWED) {
      this.stage = ST.GROWING;
      this.t0 = now;
      this.dur = CROPS[this.crop].grow * 1000 * growMul;
    } else if (this.stage === ST.RIPE) this.stage = ST.STUBBLE;
    this.cells.fill(0);
    this.doneN = 0;
    this.paintAll();
    this.updatePlants(true, now);
  }

  tick(now) {
    if (this.stage === ST.GROWING && now >= this.t0 + this.dur) {
      this.stage = ST.RIPE;
      this.cells.fill(0);
      this.doneN = 0;
      this.paintAll();
      this.updatePlants(true, now);
      return 'ripe';
    }
    if (this.stage === ST.GROWING) this.updatePlants(false, now);
    return null;
  }

  // ---------- сохранение ----------
  serialize() {
    let bin = '';
    for (let i = 0; i < this.cells.length; i += 8) {
      let b = 0;
      for (let k = 0; k < 8; k++) if (this.cells[i + k]) b |= 1 << k;
      bin += String.fromCharCode(b);
    }
    return { o: this.owned ? 1 : 0, s: this.stage, c: this.crop, t0: this.t0, d: this.dur, m: btoa(bin) };
  }

  restore(o) {
    if (!o) return;
    this.owned = !!o.o || this.def.cost === 0;
    this.stage = o.s ?? ST.WILD;
    this.setCrop(o.c || 'wheat');
    this.t0 = o.t0 || 0;
    this.dur = o.d || 0;
    this.doneN = 0;
    try {
      const bin = atob(o.m || '');
      for (let i = 0; i < this.cells.length; i++) {
        this.cells[i] = (bin.charCodeAt(i >> 3) >> (i & 7)) & 1;
        this.doneN += this.cells[i];
      }
    } catch (e) {
      this.cells.fill(0);
    }
    this.paintAll();
    this.updatePlants(true);
  }

  setOwned(v) {
    this.owned = v;
    this.sign.visible = !v;
  }
}
