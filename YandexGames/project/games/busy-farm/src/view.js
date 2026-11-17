// 3D-вид фермы: сцена, камера под углом сверху, синхронизация с логикой, анимации, частицы и выбор по нажатию
import * as THREE from 'three';
import { B, MAT, blobShadow, disposeTree } from './gfx.js';
import { makeAnimal, makeChute, itemMesh, cageParts, grassTuft, makeBuilding, makePlot, makeWell, makeBarn, makeTruck } from './models.js';
import { buildEnv } from './env.js';
import { ANIMALS, BUILDINGS } from './data.js';
import { CELL } from './sim.js';

const P = Math.PI;
const PITCH = 0.86; // наклон камеры (рад от горизонта)
const ITEM_S = 1.5; // товары крупнее «натуры», чтобы по ним было легко попасть
const SCALE = { goose: 1.15, sheep: 1.1, cow: 1.05, cat: 1.1, dog: 1.05, bear: 1.1 };

export class FarmView {
  constructor(renderer, farm, lay, opts = {}) {
    this.r = renderer;
    this.f = farm;
    this.lay = lay;
    this.quality = opts.quality || 'high';
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#bfe6ff');
    this.scene.fog = new THREE.Fog('#d4efff', 34, 70);
    this.cam = new THREE.PerspectiveCamera(30, 1, 0.5, 200);
    this.time = 0;
    this.animals = new Map();
    this.items = new Map();
    this.bears = new Map();
    this.flying = [];
    this.parts = [];
    this.puffs = [];
    this.buildLights();
    this.env = buildEnv(this.scene, lay);
    this.buildStatic();
    this.buildGrass();
    this.buildFx();
    this.hits = [];
    this.makeHits();
  }

  buildLights() {
    const sc = this.scene;
    sc.add(new THREE.HemisphereLight(0xfff8ec, 0x9ab87a, 1.55));
    const d = new THREE.DirectionalLight(0xfff1d6, 1.75);
    const V = this.lay.view;
    const cx = (V.x0 + V.x1) / 2,
      cz = (V.z0 + V.z1) / 2;
    d.position.set(cx - 7, 16, cz + 9);
    d.target.position.set(cx, 0, cz);
    sc.add(d.target);
    if (this.quality !== 'low') {
      d.castShadow = true;
      const s = this.quality === 'high' ? 2048 : 1024;
      d.shadow.mapSize.set(s, s);
      const half = Math.max(V.x1 - V.x0, V.z1 - V.z0) / 2 + 4;
      Object.assign(d.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 50 });
      d.shadow.bias = -0.0008;
      d.shadow.normalBias = 0.02;
    }
    sc.add(d);
    this.sun = d;
  }

  buildStatic() {
    const lay = this.lay;
    const sc = this.scene;
    // колодец
    this.well = makeWell();
    this.well.group.position.set(lay.well.x, 0, lay.well.z);
    sc.add(this.well.group);
    // амбар
    this.barn = makeBarn();
    this.barn.position.set(lay.store.x, 0, lay.store.z);
    this.barn.rotation.y = lay.store.face || 0;
    sc.add(this.barn);
    // машина
    this.truck = makeTruck();
    this.truck.group.rotation.y = P / 2;
    this.truck.group.position.set(lay.truck.x, 0, lay.truck.z);
    sc.add(this.truck.group);
    // мастерские и участки
    this.slots = this.f.slots.map((s) => {
      const g = new THREE.Group();
      g.position.set(s.x, 0, s.z);
      g.rotation.y = s.face;
      sc.add(g);
      return { g, built: null, kind: s.kind, b: null, plot: null, pop: 0 };
    });
    for (let i = 0; i < this.slots.length; i++) this.syncSlot(i, true);
    this.shadowsOn(sc);
  }

  shadowsOn(o) {
    o.traverse((x) => {
      if (x.isMesh && x.userData.noShadow !== true) {
        x.castShadow = true;
        x.receiveShadow = true;
      }
    });
  }

  syncSlot(i, first) {
    const S = this.slots[i],
      s = this.f.slots[i];
    if (S.built === s.built && !first) return;
    S.built = s.built;
    while (S.g.children.length) {
      const c = S.g.children.pop();
      disposeTree(c);
    }
    S.b = null;
    if (!s.kind) {
      // пустое место: клумба
      const b = new B();
      b.rbox(1.6, 0.08, 1.2, 0.2, '#8a5a34', { y: 0.04 });
      for (let k = 0; k < 9; k++) b.sph(0.12, ['#ff6f91', '#ffd23f', '#ffffff', '#b9a0ff'][k % 4], { x: -0.55 + (k % 3) * 0.55, y: 0.15, z: -0.35 + Math.floor(k / 3) * 0.35 });
      for (let k = 0; k < 9; k++) b.sph(0.12, '#5fb84a', { x: -0.55 + (k % 3) * 0.55 + 0.1, y: 0.1, z: -0.35 + Math.floor(k / 3) * 0.35 + 0.08, sy: 0.6 });
      S.g.add(b.mesh());
      return;
    }
    if (!s.built) {
      S.g.add(makePlot());
    } else {
      S.b = makeBuilding(s.kind);
      S.g.add(S.b.group);
      if (!first) S.pop = 1;
    }
    this.shadowsOn(S.g);
  }

  buildGrass() {
    const geo = grassTuft();
    this.grassMax = 1400;
    this.grass = new THREE.InstancedMesh(geo, MAT, this.grassMax);
    this.grass.count = 0;
    this.grass.castShadow = false;
    this.grass.receiveShadow = true;
    this.grass.frustumCulled = false;
    this.scene.add(this.grass);
  }

  buildFx() {
    // искорки и пыль: пул маленьких сфер
    const g = new THREE.SphereGeometry(1, 6, 4);
    this.fxMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
    this.fxPool = [];
    for (let i = 0; i < 80; i++) {
      const m = new THREE.Mesh(g, this.fxMat.clone());
      m.visible = false;
      this.scene.add(m);
      this.fxPool.push({ m, life: 0 });
    }
    // дым из труб
    this.smokeT = 0;
  }

  burst(x, y, z, color, n = 8, spd = 1.6, size = 0.07, up = 1.5) {
    for (let k = 0; k < n; k++) {
      const p = this.fxPool.find((q) => q.life <= 0);
      if (!p) return;
      p.life = p.max = 0.5 + Math.random() * 0.4;
      p.m.visible = true;
      p.m.material.color.set(color);
      p.m.material.opacity = 1;
      p.m.position.set(x, y, z);
      p.m.scale.setScalar(size * (0.7 + Math.random() * 0.6));
      const a = Math.random() * P * 2;
      const s = spd * (0.4 + Math.random() * 0.6);
      p.v = new THREE.Vector3(Math.cos(a) * s, up * (0.5 + Math.random()), Math.sin(a) * s);
      p.g = 4;
      p.grow = 0;
    }
  }
  smoke(x, y, z) {
    const p = this.fxPool.find((q) => q.life <= 0);
    if (!p) return;
    p.life = p.max = 1.6;
    p.m.visible = true;
    p.m.material.color.set('#f4f0ea');
    p.m.material.opacity = 0.8;
    p.m.position.set(x, y, z);
    p.m.scale.setScalar(0.1);
    p.v = new THREE.Vector3(0.15, 0.6, 0);
    p.g = -0.1;
    p.grow = 0.18;
  }

  makeHits() {
    const lay = this.lay;
    const mat = new THREE.MeshBasicMaterial({ visible: false });
    const box = (w, h, d, x, z, tag, ry = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, h / 2, z);
      m.rotation.y = ry;
      m.userData.tag = tag;
      this.scene.add(m);
      this.hits.push(m);
      return m;
    };
    box(1.7, 2.2, 1.7, lay.well.x, lay.well.z, { type: 'well' });
    box(2.6, 2.6, 2.6, lay.store.x, lay.store.z, { type: 'store' });
    this.truckHit = box(1.4, 1.4, 2.4, lay.truck.x, lay.truck.z, { type: 'truck' }, P / 2);
    this.f.slots.forEach((s, i) => {
      if (s.kind) box(2.6, 2.4, 2.2, s.x, s.z, { type: 'slot', i }, s.face);
    });
  }

  // ---------------- камера ----------------
  resize(w, h, insets = { top: 70, bottom: 10, left: 10, right: 10 }) {
    this.w = w;
    this.h = h;
    this.cam.aspect = w / h;
    const V = this.lay.view;
    const pts = [];
    for (const x of [V.x0, V.x1]) for (const z of [V.z0, V.z1]) pts.push(new THREE.Vector3(x, 0, z));
    // верх дальних построек тоже должен влезть
    for (const x of [V.x0, V.x1]) pts.push(new THREE.Vector3(x, 2.4, V.z0));
    const tgt = new THREE.Vector3((V.x0 + V.x1) / 2, 0, (V.z0 + V.z1) / 2);
    const dir = new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH));
    // доля экрана, доступная под ферму (в NDC)
    const L = -1 + (2 * insets.left) / w,
      R = 1 - (2 * insets.right) / w,
      T = 1 - (2 * insets.top) / h,
      Bt = -1 + (2 * insets.bottom) / h;
    let d = 30;
    const v = new THREE.Vector3();
    for (let it = 0; it < 6; it++) {
      // подбор расстояния
      let lo = 5,
        hi = 120;
      for (let k = 0; k < 30; k++) {
        d = (lo + hi) / 2;
        this.cam.position.copy(tgt).addScaledVector(dir, d);
        this.cam.lookAt(tgt);
        this.cam.updateProjectionMatrix();
        this.cam.updateMatrixWorld();
        let ok = true;
        let x0 = 9,
          x1 = -9,
          y0 = 9,
          y1 = -9;
        for (const p of pts) {
          v.copy(p).project(this.cam);
          x0 = Math.min(x0, v.x);
          x1 = Math.max(x1, v.x);
          y0 = Math.min(y0, v.y);
          y1 = Math.max(y1, v.y);
        }
        if (x1 - x0 > R - L || y1 - y0 > T - Bt) ok = false;
        if (ok) hi = d;
        else lo = d;
        this._box = [x0, x1, y0, y1];
      }
      d = hi;
      this.cam.position.copy(tgt).addScaledVector(dir, d);
      this.cam.lookAt(tgt);
      this.cam.updateMatrixWorld();
      // сдвиг центра так, чтобы ферма встала по центру свободной области
      let x0 = 9,
        x1 = -9,
        y0 = 9,
        y1 = -9;
      for (const p of pts) {
        v.copy(p).project(this.cam);
        x0 = Math.min(x0, v.x);
        x1 = Math.max(x1, v.x);
        y0 = Math.min(y0, v.y);
        y1 = Math.max(y1, v.y);
      }
      const dx = (L + R) / 2 - (x0 + x1) / 2,
        dy = (T + Bt) / 2 - (y0 + y1) / 2;
      if (Math.abs(dx) < 0.002 && Math.abs(dy) < 0.002) break;
      // перевод сдвига NDC в мир (приблизительно)
      const wpu = (2 * d * Math.tan((this.cam.fov * P) / 360)) / 2;
      tgt.x -= dx * wpu * this.cam.aspect;
      tgt.z += (dy * wpu) / Math.sin(PITCH);
    }
    this.cam.updateProjectionMatrix();
    // дымка начинается за фермой при любом удалении камеры
    this.scene.fog.near = d + 6;
    this.scene.fog.far = d + 42;
    // сколько пикселей в метре у поля — для радиуса нажатия
    const a = new THREE.Vector3(0, 0, 0).project(this.cam),
      b2 = new THREE.Vector3(1, 0, 0).project(this.cam);
    this.ppm = (Math.abs(b2.x - a.x) * w) / 2;
  }

  project(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.cam);
    return { x: ((v.x + 1) / 2) * this.w, y: ((1 - v.y) / 2) * this.h, vis: v.z < 1 };
  }

  // ---------------- выбор по нажатию ----------------
  pick(sx, sy) {
    const f = this.f;
    const rad = Math.max(30, this.ppm * 0.42);
    let best = null,
      bd = 1e9;
    // товары на земле
    for (const it of f.items) {
      if (it.gone || it.carried) continue;
      const p = this.project(it.x, 0.2, it.z);
      const d = Math.hypot(p.x - sx, p.y - sy);
      if (d < rad && d < bd) {
        bd = d;
        best = { type: 'item', id: it.id };
      }
    }
    // медведи (по центру тела)
    for (const b of f.bears) {
      if (b.gone) continue;
      const by = b.state === 'fall' ? this.bearY(b) : 0;
      for (const yy of [0.4, 0.9]) {
        const p = this.project(b.x, by + yy, b.z);
        const d = Math.hypot(p.x - sx, p.y - sy) * 0.8;
        if (d < rad * 1.5 && d < bd) {
          bd = d;
          best = { type: 'bear', id: b.id };
        }
      }
    }
    if (best) return best;
    // постройки
    const ndc = new THREE.Vector2((sx / this.w) * 2 - 1, -(sy / this.h) * 2 + 1);
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, this.cam);
    this.truckHit.visible = f.truck.state === 'home';
    const hits = rc.intersectObjects(this.hits.filter((h) => h !== this.truckHit || f.truck.state === 'home'), false);
    // земля
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const g = new THREE.Vector3();
    const onGround = rc.ray.intersectPlane(plane, g);
    if (hits.length) {
      const tag = hits[0].object.userData.tag;
      // если тапнули по полю «сквозь» край постройки — всё же поле
      if (!(onGround && f.inField(g.x, g.z, 0.1))) return { ...tag };
    }
    if (onGround) return { type: 'ground', x: g.x, z: g.z, inField: f.inField(g.x, g.z) };
    return null;
  }

  bearY(b) {
    return b.state === 'fall' ? Math.max(0, b.st / 1.3) * 7 : 0;
  }

  // ---------------- синхронизация ----------------
  update(dt) {
    this.time += dt;
    const t = this.time;
    const f = this.f;
    this.env.update(dt, t);
    // события
    for (const e of f.events) this.onEvent(e);
    // трава
    this.syncGrass();
    // животные
    const seen = new Set();
    for (const a of f.animals) {
      seen.add(a.id);
      let v = this.animals.get(a.id);
      if (!v) {
        v = this.addAnimal(a);
      }
      this.animAnimal(v, a, dt);
    }
    for (const [id, v] of this.animals) if (!seen.has(id)) this.removeAnimal(id, v);
    // товары
    const iseen = new Set();
    for (const it of f.items) {
      iseen.add(it.id);
      let v = this.items.get(it.id);
      if (!v) {
        v = { m: itemMesh(it.item, ITEM_S), sh: blobShadow(0.25, 0.22), ph: Math.random() * 6 };
        this.shadowsOn(v.m);
        this.scene.add(v.m);
        this.scene.add(v.sh);
        this.items.set(it.id, v);
      }
      let y = 0;
      if (it.fall > 0) y = Math.sin((it.fall / 0.5) * P) * 0.6 + it.fall * 0.4;
      if (it.carried) {
        const cat = f.animals.find((a) => a.carry === it);
        if (cat) {
          v.m.position.set(cat.x + Math.sin(cat.dir) * 0.25, 0.42, cat.z + Math.cos(cat.dir) * 0.25);
        }
      } else v.m.position.set(it.x, y + Math.max(0, Math.sin(t * 3 + v.ph)) * 0.05, it.z);
      v.m.rotation.y = v.ph + Math.sin(t * 1.5 + v.ph) * 0.25;
      v.sh.position.set(v.m.position.x, 0.03, v.m.position.z);
      // мигает, когда скоро пропадёт
      v.m.visible = !(it.life < 4 && !it.carried && Math.sin(t * (it.life < 2 ? 22 : 12)) < -0.2);
    }
    for (const [id, v] of this.items)
      if (!iseen.has(id)) {
        this.items.delete(id);
        this.scene.remove(v.sh);
        // улетает на склад или лопается
        if (v.fly) this.flying.push({ m: v.m, t: 0, from: v.m.position.clone() });
        else {
          this.scene.remove(v.m);
          disposeTree(v.m);
        }
      }
    // полёт товаров к амбару
    const door = this.lay.store.door;
    for (const fl of this.flying) {
      fl.t += dt / 0.55;
      const k = Math.min(1, fl.t);
      const e = k * k * (3 - 2 * k);
      fl.m.position.set(fl.from.x + (door.x - fl.from.x) * e, fl.from.y + Math.sin(k * P) * 2.2 + (1.2 - fl.from.y) * e, fl.from.z + (door.z - fl.from.z) * e);
      fl.m.scale.setScalar(ITEM_S * (1 - 0.6 * e));
      fl.m.rotation.y += dt * 8;
    }
    this.flying = this.flying.filter((fl) => {
      if (fl.t < 1) return true;
      this.scene.remove(fl.m);
      disposeTree(fl.m);
      this.barnPop = 1;
      return false;
    });
    // медведи
    const bseen = new Set();
    for (const b of f.bears) {
      bseen.add(b.id);
      let v = this.bears.get(b.id);
      if (!v) v = this.addBear(b);
      this.animBear(v, b, dt);
    }
    for (const [id, v] of this.bears)
      if (!bseen.has(id)) {
        this.scene.remove(v.root);
        disposeTree(v.root);
        this.bears.delete(id);
      }
    // мастерские
    for (let i = 0; i < this.slots.length; i++) {
      this.syncSlot(i, false);
      const S = this.slots[i],
        s = f.slots[i];
      if (S.pop > 0) {
        S.pop = Math.max(0, S.pop - dt * 2.5);
        const k = 1 + Math.sin(S.pop * P) * 0.15;
        S.g.scale.set(k, 1 - Math.sin(S.pop * P) * 0.1 + (1 - S.pop) * 0, k);
      } else S.g.scale.set(1, 1, 1);
      if (S.b && S.b.moving) {
        const m = S.b.moving;
        const on = s.queue > 0;
        if (m.userData.spin) m.rotation.z += dt * (on ? 4 : 0.2);
        if (m.userData.slide) m.position.y = (m.userData.y0 ??= m.position.y) + (on ? Math.sin(t * 9) * 0.12 : 0);
        if (m.userData.glow) m.scale.setScalar(on ? 1 + Math.sin(t * 10) * 0.2 : 0.5);
      }
      if (S.b && S.b.smoke && s.queue > 0) {
        S.smT = (S.smT || 0) - dt;
        if (S.smT <= 0) {
          S.smT = 0.35;
          const p = S.b.smoke;
          const v = new THREE.Vector3(p.x, p.y, p.z).applyMatrix4(S.g.matrixWorld);
          this.smoke(v.x, v.y, v.z);
        }
      }
      // подпрыгивание при работе
      if (S.b && s.queue > 0) S.b.group.position.y = Math.abs(Math.sin(t * 7)) * 0.03;
      else if (S.b) S.b.group.position.y = 0;
    }
    // колодец: уровень воды и ведро
    const W = f.well;
    const frac = W.refill > 0 ? 0.15 : W.water / f.wellCap();
    this.well.water.position.y = 0.2 + frac * 0.41;
    this.well.water.visible = frac > 0.02;
    this.well.bucket.position.y = W.refill > 0 ? 0.82 + Math.abs(Math.sin(t * 4)) * 0.35 : 0.82;
    this.well.bucket.rotation.y = W.refill > 0 ? t * 3 : 0;
    // амбар «подпрыгивает», когда в него что-то кладут
    if (this.barnPop > 0) {
      this.barnPop = Math.max(0, this.barnPop - dt * 4);
      const k = 1 + Math.sin(this.barnPop * P) * 0.06;
      this.barn.scale.set(k, 1 + Math.sin(this.barnPop * P) * 0.08, k);
    }
    // машина
    this.animTruck(dt);
    // частицы
    for (const p of this.fxPool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.v.y -= p.g * dt;
      p.m.position.addScaledVector(p.v, dt);
      if (p.grow) p.m.scale.multiplyScalar(1 + p.grow * dt * 6);
      p.m.material.opacity = Math.max(0, p.life / p.max);
      if (p.life <= 0) p.m.visible = false;
    }
  }

  syncGrass() {
    const f = this.f;
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      s = new THREE.Vector3(),
      p = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    let k = 0;
    for (const g of f.grass.values()) {
      if (g.amt <= 0) continue;
      // 1–3 кустика на клетку, по количеству травы
      const n = g.amt;
      for (let j = 0; j < n && k < this.grassMax; j++) {
        const a = g.seed * 20 + j * 2.1;
        const r = j === 0 ? 0.05 : 0.17;
        p.set(g.x + Math.cos(a) * r, 0, g.z + Math.sin(a) * r);
        q.setFromAxisAngle(up, a);
        const gr = g.grow;
        const sc = (0.75 + 0.25 * Math.sin(g.seed * 50 + j)) * (0.3 + 0.7 * gr) * (0.85 + 0.2 * (g.amt / 3));
        s.set(sc, sc * (0.6 + 0.4 * gr), sc);
        m.compose(p, q, s);
        this.grass.setMatrixAt(k++, m);
      }
    }
    this.grass.count = k;
    this.grass.instanceMatrix.needsUpdate = true;
  }

  addAnimal(a) {
    const mdl = makeAnimal(a.kind);
    const root = new THREE.Group();
    mdl.group.scale.setScalar(SCALE[a.kind] || 1);
    root.add(mdl.group);
    const sh = blobShadow(ANIMALS[a.kind].r * 1.3, 0.3);
    root.add(sh);
    this.shadowsOn(mdl.group);
    let chute = null;
    if (a.state === 'drop') {
      chute = makeChute(0.75, ['#ff6b6b', '#4a98dc', '#58b047', '#ffb020', '#b07ae0'][a.id % 5]);
      chute.position.y = mdl.h * (SCALE[a.kind] || 1) + 0.8;
      root.add(chute);
    }
    root.position.set(a.x, 0, a.z);
    this.scene.add(root);
    const v = { root, mdl, chute, sh, ph: Math.random() * 6, deadT: 0 };
    this.animals.set(a.id, v);
    return v;
  }
  removeAnimal(id, v) {
    this.scene.remove(v.root);
    disposeTree(v.root);
    this.animals.delete(id);
  }

  animAnimal(v, a, dt) {
    const t = this.time;
    const M = v.mdl;
    const H = 7;
    if (a.state === 'drop') {
      // спуск на парашюте
      const k = Math.max(0, a.st / 1.4);
      v.root.position.set(a.x + Math.sin(t * 2 + v.ph) * 0.2 * k, k * H, a.z);
      v.root.rotation.z = Math.sin(t * 3 + v.ph) * 0.12 * k;
      v.sh.position.y = -k * H + 0.02;
      v.sh.scale.setScalar(1 - k * 0.5);
      return;
    }
    if (v.chute) {
      // парашют складывается и улетает
      v.chuteT = (v.chuteT || 0) + dt;
      v.chute.position.y += dt * 3;
      v.chute.scale.setScalar(Math.max(0.01, 1 - v.chuteT * 1.5));
      if (v.chuteT > 0.7) {
        v.root.remove(v.chute);
        disposeTree(v.chute);
        v.chute = null;
      }
    }
    v.root.rotation.z = 0;
    v.sh.position.y = 0.02;
    v.sh.scale.setScalar(1);
    v.root.position.set(a.x, 0, a.z);
    v.root.rotation.y = a.dir;
    if (a.dead) {
      // исчезает облачком
      v.deadT += dt;
      const k = Math.max(0, 1 - v.deadT * 2);
      M.group.scale.setScalar((SCALE[a.kind] || 1) * k);
      return;
    }
    const moving = a.moving;
    const spd = a.kind === 'goose' ? 14 : a.kind === 'cat' || a.kind === 'dog' ? 16 : 10;
    const ph = t * spd + v.ph;
    // походка
    M.legs.forEach((l, i) => {
      l.rotation.x = moving ? Math.sin(ph + (i % 2 ? P : 0) + (i > 1 ? P / 2 : 0)) * 0.6 : 0;
    });
    M.body.position.y = moving ? Math.abs(Math.sin(ph)) * 0.05 : Math.sin(t * 2 + v.ph) * 0.008;
    M.body.rotation.z = a.kind === 'goose' && moving ? Math.sin(ph) * 0.12 : 0;
    // голова: клюёт траву или оглядывается
    const eating = a.state === 'eat';
    const want = eating ? 0.75 + Math.sin(t * 14) * 0.18 : a.scared > 0 ? -0.3 : Math.sin(t * 0.7 + v.ph) * 0.08;
    M.head.rotation.x += (want - M.head.rotation.x) * Math.min(1, dt * 10);
    M.head.rotation.y = !moving && !eating ? Math.sin(t * 0.5 + v.ph * 2) * 0.4 : 0;
    // испуг: подскок
    if (a.scared > 0) v.root.position.y = Math.abs(Math.sin(a.scared * 9)) * 0.25;
    // голодный — грустно опускает голову и дрожит
    if (a.food <= 0 && !ANIMALS[a.kind].helper) {
      M.group.rotation.z = Math.sin(t * 30) * 0.03;
    } else M.group.rotation.z = 0;
    // кошка несёт товар — голова чуть вверх
    if (a.carry) M.head.rotation.x = -0.15;
  }

  addBear(b) {
    const mdl = makeAnimal('bear');
    const root = new THREE.Group();
    mdl.group.scale.setScalar(SCALE.bear);
    root.add(mdl.group);
    const sh = blobShadow(0.6, 0.3);
    this.scene.add(root);
    root.add(sh);
    this.shadowsOn(mdl.group);
    const chute = makeChute(1.0, '#8a5a3a', '#ffe9b8');
    chute.position.y = 2.6;
    root.add(chute);
    const v = { root, mdl, chute, sh, cage: null, cageN: -1, ph: Math.random() * 6 };
    this.bears.set(b.id, v);
    return v;
  }

  animBear(v, b, dt) {
    const t = this.time;
    const M = v.mdl;
    const y = this.bearY(b);
    v.root.position.set(b.x, y, b.z);
    v.sh.position.y = -y + 0.02;
    v.root.rotation.y = b.dir;
    if (b.state !== 'fall' && v.chute) {
      v.chT = (v.chT || 0) + dt;
      v.chute.position.y += dt * 4;
      v.chute.scale.setScalar(Math.max(0.01, 1 - v.chT * 1.4));
      if (v.chT > 0.7) {
        v.root.remove(v.chute);
        disposeTree(v.chute);
        v.chute = null;
      }
    }
    // клетка растёт по кликам
    const n = b.state === 'caged' ? 99 : b.clicks;
    if (n !== v.cageN) {
      v.cageN = n;
      if (v.cage) {
        v.root.remove(v.cage);
        disposeTree(v.cage);
        v.cage = null;
      }
      if (n > 0) {
        v.cage = cageParts(b.state === 'caged' ? 1 : n / b.need).mesh();
        v.cage.scale.setScalar(0.95);
        this.shadowsOn(v.cage);
        // клетка не крутится вместе с медведем
        v.root.add(v.cage);
        v.cagePop = 1;
      }
    }
    if (v.cage) {
      v.cage.rotation.y = -b.dir;
      if (v.cagePop > 0) {
        v.cagePop = Math.max(0, v.cagePop - dt * 5);
        v.cage.scale.setScalar(0.95 * (1 + Math.sin(v.cagePop * P) * 0.12));
      }
      // скоро сломает клетку — трясётся
      if (b.state === 'caged' && b.cageT < 5) v.cage.position.x = Math.sin(t * 40) * 0.03;
    }
    const moving = b.state === 'free' || b.state === 'leave' ? b.moving : false;
    const ph = t * 9 + v.ph;
    M.legs.forEach((l, i) => (l.rotation.x = moving ? Math.sin(ph + i * P) * 0.5 : 0));
    M.body.rotation.z = moving ? Math.sin(ph) * 0.1 : b.state === 'caged' ? Math.sin(t * 3) * 0.05 : 0;
    M.body.position.y = moving ? Math.abs(Math.sin(ph)) * 0.06 : 0;
    M.head.rotation.x = b.state === 'caged' ? 0.25 : Math.sin(t * 1.2) * 0.1;
    if (b.gone === 'store') {
      v.root.scale.setScalar(Math.max(0.01, 1 - (b.goneT || 0) * 2));
    }
  }

  animTruck(dt) {
    const T = this.f.truck;
    const g = this.truck.group;
    const lay = this.lay;
    const total = this.f.truckTime();
    const hx = lay.truck.x,
      ex = lay.road.exitX;
    let x = hx,
      bob = 0;
    if (T.state === 'away') {
      const leg = Math.min(4.5, total * 0.25);
      if (T.t < leg) {
        const k = T.t / leg;
        x = hx + (ex - hx) * k * k;
        g.rotation.y = P / 2;
      } else if (T.t > total - leg) {
        const k = (total - T.t) / leg;
        x = hx + (ex - hx) * k * k;
        g.rotation.y = -P / 2;
      } else x = ex + 5;
      bob = Math.abs(Math.sin(this.time * 18)) * 0.03;
      this.dustT = (this.dustT || 0) - dt;
      if (this.dustT <= 0 && x < ex) {
        this.dustT = 0.12;
        this.burst(x - (g.rotation.y > 0 ? 1 : -1), 0.15, lay.road.z + 0.3, '#e8d2a6', 1, 0.3, 0.12, 0.4);
      }
    } else g.rotation.y = P / 2;
    g.position.set(x, bob, lay.road.z);
    this.truck.cargo.visible = this.f.truckUsed() > 0 || (T.state === 'away' && !T.sold);
  }

  // ---------------- реакции на события ----------------
  onEvent(e) {
    switch (e.t) {
      case 'plant':
        this.burst(e.x, 0.1, e.z, '#7fd05a', 7, 1.2, 0.06, 1.2);
        this.burst(e.x, 0.1, e.z, '#7ac7f0', 4, 0.8, 0.05, 1.6);
        break;
      case 'collect': {
        const v = this.items.get(e.id);
        if (v) v.fly = true;
        this.burst(e.x, 0.3, e.z, '#fff3a8', 6, 1.2, 0.05, 1.8);
        break;
      }
      case 'spoil':
      case 'crush':
        this.burst(e.x, 0.2, e.z, e.item === 'egg' ? '#fff7ea' : '#d9c8b0', 8, 1.4, 0.07, 1.2);
        break;
      case 'lay':
        break;
      case 'drop':
        if (e.from !== 'animal') this.burst(e.x, 0.3, e.z, '#ffe58a', 6, 1.3, 0.05, 2);
        break;
      case 'land': {
        const a = this.f.animals.find((x) => x.kind === e.kind && Math.abs(x.x - e.x) < 0.01);
        this.burst(e.x, 0.1, e.z, '#ffffff', 10, 1.6, 0.08, 0.8);
        break;
      }
      case 'bearLand':
        this.burst(e.x, 0.1, e.z, '#d9c8a0', 14, 2.2, 0.1, 1);
        break;
      case 'caged':
        this.burst(e.x, 0.8, e.z, '#ffd23f', 10, 2, 0.06, 2);
        break;
      case 'starved':
        this.burst(e.x, 0.4, e.z, '#ffffff', 14, 1.5, 0.12, 1.2);
        break;
      case 'bearStore': {
        const v = this.bears.get(e.id);
        this.burst(e.x, 0.6, e.z, '#ffd23f', 8, 1.5, 0.06, 2);
        this.barnPop = 1;
        break;
      }
      case 'bearHit':
        this.burst(e.x, 0.5, e.z, '#ffffff', 8, 2, 0.06, 1.5);
        break;
      case 'build': {
        const s = this.f.slots[e.i];
        this.burst(s.x, 0.4, s.z, '#e8d5ba', 18, 2.5, 0.12, 1.4);
        break;
      }
    }
  }

  dispose() {
    disposeTree(this.scene);
  }
}
