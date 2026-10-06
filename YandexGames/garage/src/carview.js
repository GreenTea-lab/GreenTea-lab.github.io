// Связь состояния машины (данные) и её 3D-модели: ржавчина, вмятины, грунт, выгоревшая краска, грязь,
// трещины на лобовом, мутные фары, старые шины, тюнинг. Изменения после работ проигрываются плавно.
import * as THREE from 'three';
import { buildCar, setSpoiler, setStripes, setColor } from './car.js';
import { setState, DirtMask } from './paint.js';
import { MODELS } from './models.js';
import { rng } from './econ.js';
import { decalMat } from './decals.js';

let crackTex = null;
function cracks() {
  if (crackTex) return crackTex;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const x = c.getContext('2d');
  x.clearRect(0, 0, c.width, c.height);
  x.strokeStyle = 'rgba(255,255,255,.85)';
  x.lineWidth = 1.6;
  const r = rng(77);
  // трещины — во всю полосу u (по всей длине) на верхней части кольца (лобовое у разных моделей в разных местах)
  for (let s = 0; s < 14; s++) {
    const cx = 200 + r() * 700,
      cy = 200 + r() * 100;
    for (let k = 0; k < 9; k++) {
      let px = cx,
        py = cy,
        a = r() * Math.PI * 2;
      x.beginPath();
      x.moveTo(px, py);
      for (let j = 0; j < 7; j++) {
        a += (r() - 0.5) * 0.7;
        px += Math.cos(a) * (8 + r() * 16);
        py += Math.sin(a) * (4 + r() * 8);
        x.lineTo(px, py);
      }
      x.stroke();
    }
  }
  crackTex = new THREE.CanvasTexture(c);
  return crackTex;
}

export class CarView {
  constructor(data) {
    this.data = data;
    this.build();
  }
  build() {
    const d = this.data;
    const look = { ...d.look, color: d.color, metallic: d.metallic };
    this.car = buildCar(MODELS[d.model], look);
    this.mask = new DirtMask();
    this.dirt0 = d.dirt;
    this.anim = [];
    const car = this.car;
    for (const k in car.mats) {
      const m = car.mats[k];
      m.userData.u.uDirtMap.value = this.mask.tex;
      this._dents(k);
    }
    // стекло и фары — свои экземпляры материалов, чтобы менять вид
    car.root.traverse((o) => {
      if (o.isMesh && o.material && o.material.transparent && o.material.opacity < 0.5 && o.material.type === 'MeshPhysicalMaterial' && !o.userData.panel) {
        if (!this.glassM) {
          this.glassM = o.material.clone();
          this.glassM.alphaMap = null;
        }
        o.material = this.glassM;
      }
    });
    this.headM = car.lights.head.length ? car.lights.head[0].material.clone() : null;
    car.lights.head.forEach((m) => (m.material = this.headM));
    this.sync(true);
  }
  // вмятины: точки на детали из её геометрии (детерминированно по seed)
  _dents(k) {
    const p = this.data.panels[k];
    const m = this.car.mats[k];
    const mesh = this.car.panels[k];
    if (!p || !m || !mesh) return;
    const pos = mesh.geometry.attributes.position;
    const r = rng(p.seed || 1);
    const n = 1 + Math.floor(r() * 3);
    const u = m.userData.u;
    for (let i = 0; i < 4; i++) {
      if (i < n && pos.count) {
        const vi = Math.floor(r() * pos.count);
        u.uDents.value[i].set(pos.getX(vi), pos.getY(vi), pos.getZ(vi), 0.12 + r() * 0.12);
      } else u.uDents.value[i].set(0, -99, 0, 0.1);
    }
  }
  // применить данные к модели; instant — без анимации
  sync(instant = false) {
    const d = this.data;
    const car = this.car;
    for (const k in car.mats) {
      const p = d.panels[k] || { rust: 0, dent: 0, fade: 0, primer: 0 };
      const target = { rust: p.rust, dent: p.dent, fade: p.fade, primer: p.primer, dirt: this.dirt0 };
      const m = car.mats[k];
      if (instant) setState(m, target);
      else this.anim.push({ m, from: { ...curState(m) }, to: target, t: 0 });
    }
    const S = d.sys;
    // лобовое: трещины при плохом состоянии стёкол
    if (this.glassM) {
      const bad = S.glass < 0.5;
      this.glassM.map = bad ? cracks() : null;
      this.glassM.opacity = bad ? 0.55 : 0.42;
      this.glassM.needsUpdate = true;
    }
    if (this.headM) {
      const k = S.lights;
      this.headM.color.setRGB(0.55 + 0.45 * k, 0.5 + 0.5 * k, 0.4 + 0.6 * k);
      this.headM.roughness = 0.12 + (1 - k) * 0.5;
    }
    // шины: старые — серые и потрескавшиеся
    for (const w of car.wheels) {
      const tm = w.userData.tire.material;
      if (!w.userData.ownTire) {
        w.userData.tire.material = tm.clone();
        w.userData.ownTire = true;
      }
      const t = S.tires;
      w.userData.tire.material.color.setRGB(0.09 + (1 - t) * 0.14, 0.09 + (1 - t) * 0.13, 0.1 + (1 - t) * 0.11);
      w.userData.tire.material.roughness = 0.75 + (1 - t) * 0.2;
    }
    // мотор: ржавый или чистый
    const e = S.engine;
    const blk = car.engine.userData.block.material;
    blk.color.setRGB(0.22 + (1 - e) * 0.18, 0.23 + (1 - e) * 0.08, 0.25 - (1 - e) * 0.08);
    blk.roughness = 0.4 + (1 - e) * 0.5;
  }
  // перестроить (новый цвет / диски / посадка меняют геометрию или материалы)
  rebuildLook() {
    const d = this.data;
    setColor(this.car, d.color, d.metallic);
    setSpoiler(this.car, d.look.spoiler || 0);
    setStripes(this.car, d.look.stripes || 0);
  }
  update(dt) {
    for (const a of this.anim) {
      a.t = Math.min(1, a.t + dt / 0.9);
      const k = a.t * a.t * (3 - 2 * a.t);
      const s = {};
      for (const key in a.to) s[key] = a.from[key] + (a.to[key] - a.from[key]) * k;
      setState(a.m, s);
    }
    this.anim = this.anim.filter((a) => a.t < 1);
  }
  // мойка: стереть грязь по uv; возвращает остаток грязи 0..1
  rub(uv, big) {
    this.mask.rub(uv.x, uv.y, big ? 0.085 : 0.055, big ? 0.8 : 0.6);
  }
  dirtLeft() {
    return this.dirt0 * this.mask.left();
  }
  highlight(k) {
    for (const key in this.car.mats) setState(this.car.mats[key], { hi: key === k ? 0.6 : 0 });
  }
  dispose() {
    this.car.root.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose && !o.geometry.userData?.shared && o.geometry.dispose();
      }
    });
    for (const k in this.car.mats) this.car.mats[k].dispose();
    this.mask.tex.dispose();
  }
}
function curState(m) {
  const u = m.userData.u;
  return { rust: u.uRust.value, dent: u.uDent.value, fade: u.uFade.value, primer: u.uPrimer.value, dirt: u.uDirt.value };
}
