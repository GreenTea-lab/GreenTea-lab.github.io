// Трактор: движение, руление, колёса, орудия (плуг, сеялка, жатка) и прицеп с урожаем
import * as THREE from 'three';
import * as M from './models.js';
import { CROPS } from './econ.js';

const TURN = 2.3; // рад/с
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class Tractor {
  constructor(world) {
    this.world = world;
    this.g = new THREE.Group();
    world.scene.add(this.g);
    this.x = -8;
    this.z = 4;
    this.h = 0; // смотрит к полям
    this.v = 0;
    this.tool = null;
    this.width = 2.4;
    this.maxSpeed = 4.2;
    this.load = 0;
    this.cap = 60;
    this.puff = 0;
    this.toolY = 0;
    this.bob = 0;
    this.reel = null;
    this.trailerH = this.h;
    this._tc = null;
    this.mat = world.mat;
  }

  // внешний вид: вариант трактора (цвета)
  setLook(v) {
    if (this.look === v) return;
    this.look = v;
    for (const c of [...this.g.children]) this.g.remove(c);
    const sh = this.world.sun.castShadow;
    const mk = (geo) => {
      const m = new THREE.Mesh(geo, this.mat);
      m.castShadow = sh;
      return m;
    };
    this.body = mk(M.tractorBody(v));
    this.g.add(this.body);
    const rear = M.wheelGeo(0.78, 0.5, v.rim),
      front = M.wheelGeo(0.45, 0.32, v.rim);
    this.wheels = [];
    for (const [x, z, geo, r, steer] of [[-0.98, -0.65, rear, 0.78, false], [0.98, -0.65, rear, 0.78, false], [-0.78, 1.25, front, 0.45, true], [0.78, 1.25, front, 0.45, true]]) {
      const piv = new THREE.Group();
      piv.position.set(x, r, z);
      const w = mk(geo);
      piv.add(w);
      this.g.add(piv);
      this.wheels.push({ piv, w, r, steer });
    }
    this.attach = new THREE.Group();
    this.g.add(this.attach);
    // прицеп — отдельно, тянется за трактором
    if (!this.trailer) {
      this.trailer = new THREE.Group();
      const tm = new THREE.Mesh(M.trailerGeo(), this.mat);
      tm.castShadow = sh;
      tm.position.z = -1.6;
      this.trailer.add(tm);
      // куча урожая: усечённая пирамида со скруглённым верхом
      const pg = new THREE.CylinderGeometry(0.62, 1.08, 1, 4, 1);
      pg.rotateY(Math.PI / 4);
      pg.scale(1, 1, 1.32);
      this.pile = new THREE.Mesh(pg, new THREE.MeshLambertMaterial({ color: 0xf1cf5c }));
      this.pile.position.set(0, 1.05, -1.6);
      this.trailer.add(this.pile);
      this.world.scene.add(this.trailer);
    }
    this._tools();
  }

  _tools() {
    for (const c of [...this.attach.children]) this.attach.remove(c);
    const sh = this.world.sun.castShadow;
    const mk = (geo, z) => {
      const m = new THREE.Mesh(geo, this.mat);
      m.castShadow = sh;
      m.position.z = z;
      m.visible = false;
      this.attach.add(m);
      return m;
    };
    this.tools = {
      plow: mk(M.plowGeo(this.width), -2.3),
      seed: mk(M.seederGeo(this.width), -2.35),
      harvest: mk(M.headerGeo(this.width), 2.55),
    };
    this.reel = new THREE.Mesh(M.reelGeo(this.width), this.mat);
    this.reel.position.set(0, 0.85, 0.75);
    this.tools.harvest.add(this.reel);
    this.setTool(this.tool, true);
  }

  setWidth(w) {
    if (Math.abs(w - this.width) < 1e-3 && this.tools) return;
    this.width = w;
    if (this.look) this._tools();
  }

  setTool(t, silent) {
    const changed = t !== this.tool;
    this.tool = t;
    if (!this.tools) return changed;
    for (const k in this.tools) this.tools[k].visible = k === t;
    if (changed && !silent) this.toolY = 0.6; // орудие «опускается»
    return changed;
  }

  get fwd() {
    return [Math.sin(this.h), Math.cos(this.h)];
  }

  // точки под рабочим органом орудия (мировые x, z)
  toolPoints(out = []) {
    out.length = 0;
    if (!this.tool) return out;
    const [fx, fz] = this.fwd;
    const off = this.tool === 'harvest' ? 2.9 : -2.5;
    const cx = this.x + fx * off,
      cz = this.z + fz * off;
    const rx = fz,
      rz = -fx; // вправо
    const n = Math.max(2, Math.ceil(this.width / 0.22));
    for (let k = 0; k <= n; k++) {
      const s = -this.width / 2 + (this.width * k) / n;
      for (const d of [-0.45, 0, 0.45]) out.push([cx + rx * s + fx * d, cz + rz * s + fz * d]);
    }
    return out;
  }

  // ввод: dx, dz — желаемое направление в мире, mag 0..1
  update(dt, dx, dz, mag, world) {
    const target = this.maxSpeed * Math.min(1, mag);
    let turnK = 1;
    if (mag > 0.08) {
      const want = Math.atan2(dx, dz);
      const diff = wrap(want - this.h);
      const step = TURN * dt * (0.45 + 0.55 * Math.min(1, Math.abs(this.v) / 2 + 0.3));
      this.h = wrap(this.h + Math.max(-step, Math.min(step, diff)));
      turnK = Math.max(0.3, Math.cos(Math.min(Math.abs(diff), Math.PI / 2)));
      this.steer = Math.max(-0.5, Math.min(0.5, diff));
    } else this.steer = (this.steer || 0) * 0.85;
    const tv = target * turnK;
    this.v += (tv - this.v) * Math.min(1, dt * (tv > this.v ? 2.2 : 3.5));
    const [fx, fz] = this.fwd;
    let nx = this.x + fx * this.v * dt,
      nz = this.z + fz * this.v * dt;
    [nx, nz] = world.collide(nx, nz, 1.5);
    const moved = Math.hypot(nx - this.x, nz - this.z);
    this.x = nx;
    this.z = nz;
    // колёса и покачивание
    for (const w of this.wheels) {
      w.w.rotation.x += (moved / w.r) * (this.v >= 0 ? 1 : -1);
      if (w.steer) w.piv.rotation.y = this.steer * 0.8;
    }
    this.bob += moved * 3;
    this.g.position.set(this.x, Math.abs(Math.sin(this.bob)) * 0.04, this.z);
    this.g.rotation.set(Math.sin(this.bob * 0.5) * 0.012, this.h, 0);
    // опускание орудия
    this.toolY *= Math.pow(0.02, dt);
    this.attach.position.y = this.toolY;
    if (this.reel && this.tool === 'harvest') this.reel.rotation.x -= dt * (2 + this.v * 1.5);
    // прицеп тянется за сцепкой: его ось смотрит на точку сцепки
    const hx = this.x - fx * 1.9,
      hz = this.z - fz * 1.9;
    // после телепорта (загрузка сохранения) ставим прицеп ровно за трактором
    if (!this._tc || Math.hypot(hx - this._tc[0], hz - this._tc[1]) > 2.5) this._tc = [hx - fx * 1.6, hz - fz * 1.6];
    const th = Math.atan2(hx - this._tc[0], hz - this._tc[1]);
    this._tc[0] = hx - Math.sin(th) * 1.6;
    this._tc[1] = hz - Math.cos(th) * 1.6;
    this.trailerH = th;
    this.trailer.position.set(hx, 0, hz);
    this.trailer.rotation.y = th;
    this.trailer.visible = this.tool === 'harvest' || this.load > 0;
    // груз
    const k = Math.min(1, this.load / this.cap);
    this.pile.visible = k > 0.01;
    this.pile.scale.y = Math.max(0.05, k) * 0.7;
    this.pile.position.y = 1.0 + this.pile.scale.y * 0.5;
    // дым из трубы
    this.puff -= dt;
    if (this.puff <= 0) {
      this.puff = 0.14 - Math.min(0.08, Math.abs(this.v) * 0.015);
      const px = this.x + fx * 1.25 + fz * 0.42,
        pz = this.z + fz * 1.25 - fx * 0.42;
      world.emit(px, 2.6, pz, (Math.random() - 0.5) * 0.3, 1.2 + Math.random() * 0.4, (Math.random() - 0.5) * 0.3, 0.35, 0x8c8c94, 1.1);
    }
    return moved;
  }

  // пыль и семена из-под орудия
  workFx(world, crop) {
    if (!this.tool || Math.random() > 0.55) return;
    const [fx, fz] = this.fwd;
    const off = this.tool === 'harvest' ? 2.9 : -2.6;
    const s = (Math.random() - 0.5) * this.width;
    const x = this.x + fx * off + fz * s,
      z = this.z + fz * off - fx * s;
    if (this.tool === 'plow') world.emit(x, 0.3, z, (Math.random() - 0.5) * 0.6, 0.9, (Math.random() - 0.5) * 0.6, 0.3, 0x9a6a40, 0.7);
    else if (this.tool === 'seed') world.emit(x, 0.6, z, 0, -0.4, 0, 0.12, 0xf3e08a, 0.45);
    else world.emit(x, 1.0, z, (Math.random() - 0.5) * 1.2, 1.6, (Math.random() - 0.5) * 1.2, 0.18, CROPS[crop] ? CROPS[crop].color : 0xf1cf5c, 0.6);
  }

  setLoadColor(crop) {
    if (crop && CROPS[crop]) this.pile.material.color.setHex(CROPS[crop].color);
  }
}
