// 3D-сцена: доска, шашки, кубики, подсветка ходов, выбор пунктов касанием, камера
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildEnv } from './env.js';
import { fieldCanvas, stripCanvas, woodCanvas, checkerTopCanvas, diceFaceCanvas, pointXZ, canvas } from './textures.js';
import { absOf } from './rules.js';

const FIELD_Y = 0.45; // поверхность поля
const FRAME_Y = 0.66; // верх рамки
const CH_R = 0.44; // радиус шашки
const CH_H = 0.2; // толщина шашки
const STEP = 0.9; // шаг шашек вдоль пункта
const PER_ROW = 5;
const DIE = 0.62;

const tex = (c, rep) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (rep) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep[0], rep[1]);
  }
  return t;
};
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// ориентация кубика, при которой значение v смотрит вверх.
// Грани BoxGeometry: +x, -x, +y, -y, +z, -z → значения 3, 4, 1, 6, 2, 5
const FACE_VAL = [3, 4, 1, 6, 2, 5];
const FACE_N = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)];
function upQuat(v, yaw) {
  const n = FACE_N[FACE_VAL.indexOf(v)];
  const q = new THREE.Quaternion().setFromUnitVectors(n, new THREE.Vector3(0, 1, 0));
  const y = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  return y.multiply(q);
}

export class Scene3D {
  constructor(cv, quality) {
    this.cv = cv;
    this.quality = quality;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!(window.__NB_DEBUG && window.__NB_DEBUG.keep) }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1 : 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = quality !== 'low';
    r.shadowMap.type = THREE.PCFShadowMap;
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color('#2a160d');
    s.fog = new THREE.Fog('#2a160d', 60, 120);
    const pm = new THREE.PMREMGenerator(r);
    s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    s.environmentIntensity = 0.35;
    this.cam = new THREE.PerspectiveCamera(36, 1, 0.5, 200);
    // свет
    const hemi = new THREE.HemisphereLight('#ffe3c4', '#3a1e10', 0.9);
    s.add(hemi);
    const sun = (this.sun = new THREE.DirectionalLight('#ffe8cc', 2.3));
    sun.position.set(9, 26, 12);
    sun.castShadow = true;
    const sm = quality === 'high' ? 2048 : 1024;
    sun.shadow.mapSize.set(sm, sm);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 16, bottom: -16, near: 5, far: 60 });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    s.add(sun);
    const rim = new THREE.DirectionalLight('#ffc9a0', 0.3);
    rim.position.set(-10, 12, -20);
    s.add(rim);
    this.env = buildEnv(s, quality);
    this.board = new THREE.Group();
    s.add(this.board);
    this.anims = [];
    this.stacks = {};
    this.time = 0;
    this.view = 'menu';
    this.insets = { top: 0, bottom: 0, left: 0, right: 0 };
    this.portrait = false;
    this.camCur = null;
    this.dirty = true;
    this._buildMarkers();
    this._buildDice();
  }

  // ---------- доска ----------
  setBoardSkin(S) {
    if (this.boardMesh) {
      this.board.remove(this.boardMesh);
      this.boardMesh.traverse((m) => {
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          if (m.material.map) m.material.map.dispose();
          m.material.dispose();
        }
      });
    }
    const g = (this.boardMesh = new THREE.Group());
    this.board.add(g);
    const frameTex = tex(woodCanvas(1024, 256, S.frame, 13, { sx: 0.004, sy: 0.05 }), [1, 1]);
    const frameMat = new THREE.MeshStandardMaterial({ map: frameTex, roughness: 0.42, metalness: 0.02 });
    const darkMat = new THREE.MeshStandardMaterial({ map: frameTex, color: '#8a7a70', roughness: 0.6 });
    const metal = new THREE.MeshStandardMaterial({ color: S.metal, metalness: 0.92, roughness: 0.28 });
    // основание
    const base = new THREE.Mesh(new RoundedBoxGeometry(17.7, FIELD_Y, 11.7, 3, 0.12), darkMat);
    base.position.y = FIELD_Y / 2;
    g.add(base);
    // поле
    const field = new THREE.Mesh(new THREE.PlaneGeometry(12.9, 10.2), new THREE.MeshStandardMaterial({ map: tex(fieldCanvas(S, this.quality === 'low' ? 100 : 150)), roughness: S.felt ? 0.95 : 0.55 }));
    field.rotation.x = -Math.PI / 2;
    field.position.y = FIELD_Y + 0.002;
    field.receiveShadow = true;
    g.add(field);
    // рамка: бортики с инкрустированной полосой сверху
    const strip = stripCanvas(S);
    const stripMat = (len) => new THREE.MeshStandardMaterial({ map: tex(strip, [Math.round(len / 1.6), 1]), roughness: 0.4 });
    const rail = (w, d, x, z, along) => {
      const h = FRAME_Y - FIELD_Y + 0.02;
      const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.05), frameMat);
      m.position.set(x, FIELD_Y + h / 2 - 0.01, z);
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
      const top = new THREE.Mesh(new THREE.PlaneGeometry(along === 'x' ? w - 0.12 : d - 0.12, (along === 'x' ? d : w) - 0.12), stripMat(along === 'x' ? w : d));
      top.rotation.x = -Math.PI / 2;
      if (along === 'z') top.rotation.z = Math.PI / 2;
      top.position.set(x, FRAME_Y + 0.012, z);
      top.receiveShadow = true;
      g.add(top);
    };
    // внешняя рамка
    rail(17.7, 0.55, 0, -5.575, 'x');
    rail(17.7, 0.55, 0, 5.575, 'x');
    rail(0.55, 10.6, -8.575, 0, 'z');
    rail(0.55, 10.6, 8.575, 0, 'z');
    // бортики между полем и лотками
    rail(0.5, 10.6, -6.7, 0, 'z');
    rail(0.5, 10.6, 6.7, 0, 'z');
    // средняя планка-бар с петлями
    rail(0.9, 10.6, 0, 0, 'z');
    for (const z of [-3.6, 3.6]) {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.4, 16), metal);
      hinge.rotation.x = Math.PI / 2;
      hinge.position.set(0, FRAME_Y + 0.06, z);
      hinge.castShadow = true;
      g.add(hinge);
      for (const dz of [-0.75, 0.75]) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), metal);
        cap.position.set(0, FRAME_Y + 0.06, z + dz);
        g.add(cap);
      }
    }
    // замочек по центру бара
    const lock = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.08, 0.7, 2, 0.03), metal);
    lock.position.set(0, FRAME_Y + 0.04, 0);
    g.add(lock);
    // лотки для выброшенных шашек
    const trayTex = tex(woodCanvas(256, 512, S.frame.map((c, i) => [c, c, c][i]), 31, { vertical: true }), [1, 1]);
    for (const sx of [-1, 1]) {
      const tray = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 10.2), new THREE.MeshStandardMaterial({ map: trayTex, color: '#b8a898', roughness: 0.7 }));
      tray.rotation.x = -Math.PI / 2;
      tray.position.set(sx * 7.6, FIELD_Y + 0.003, 0);
      tray.receiveShadow = true;
      g.add(tray);
      const div = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.16, 0.18, 2, 0.05), frameMat);
      div.position.set(sx * 7.6, FIELD_Y + 0.08, 0);
      div.castShadow = true;
      g.add(div);
    }
    // латунные уголки
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const c = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.08, 0.75, 2, 0.04), metal);
        c.position.set(sx * 8.5, FRAME_Y + 0.03, sz * 5.5);
        g.add(c);
        const k = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), metal);
        k.position.set(sx * 8.5, FRAME_Y + 0.08, sz * 5.5);
        g.add(k);
      }
    g.traverse((m) => {
      if (m.isMesh && m !== field) m.castShadow = true;
    });
    this.dirty = true;
  }

  // ---------- шашки ----------
  setCheckerSkin(C) {
    if (!this.checkerGeo) {
      const pts = [[0, 0], [0.4, 0], [0.43, 0.02], [0.445, 0.06], [0.445, 0.14], [0.43, 0.18], [0.41, 0.2], [0.0, 0.2]].map(([x, y]) => new THREE.Vector2(x, y));
      this.checkerGeo = new THREE.LatheGeometry(pts, 40);
      this.topGeo = new THREE.CircleGeometry(0.405, 40);
      this.topGeo.rotateX(-Math.PI / 2);
      this.topGeo.translate(0, CH_H + 0.002, 0);
    }
    const mk = (cols) => {
      const side = new THREE.MeshStandardMaterial({ color: cols[0], roughness: C.metal ? 0.25 : 0.32, metalness: C.metal ? 0.85 : 0.0 });
      const top = new THREE.MeshStandardMaterial({ map: tex(checkerTopCanvas(cols, 256, C.sheen)), roughness: C.metal ? 0.25 : 0.3, metalness: C.metal ? 0.8 : 0.0 });
      return { side, top };
    };
    if (this.chMats) for (const m of this.chMats) {
      m.side.dispose();
      m.top.map.dispose();
      m.top.dispose();
    }
    this.chMats = [mk(C.w), mk(C.b)];
    if (!this.checkers) {
      this.checkers = [[], []];
      for (const p of [0, 1])
        for (let i = 0; i < 15; i++) {
          const g = new THREE.Group();
          const body = new THREE.Mesh(this.checkerGeo, this.chMats[p].side);
          const top = new THREE.Mesh(this.topGeo, this.chMats[p].top);
          body.castShadow = true;
          body.receiveShadow = true;
          top.receiveShadow = true;
          g.add(body, top);
          g.userData = { p, body, top };
          this.board.add(g);
          this.checkers[p].push(g);
        }
    } else {
      for (const p of [0, 1])
        for (const g of this.checkers[p]) {
          g.userData.body.material = this.chMats[p].side;
          g.userData.top.material = this.chMats[p].top;
        }
    }
    this.dirty = true;
  }

  // ---------- кубики ----------
  _buildDice() {
    this.diceGeo = new RoundedBoxGeometry(DIE, DIE, DIE, 4, 0.09);
    this.dice = [];
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(this.diceGeo, []);
      m.castShadow = true;
      m.visible = false;
      this.board.add(m);
      this.dice.push(m);
    }
  }
  setDiceSkin(D) {
    if (this.diceMats) this.diceMats.forEach((m) => {
      m.map.dispose();
      m.dispose();
    });
    this.diceMats = FACE_VAL.map((v) => new THREE.MeshStandardMaterial({ map: tex(diceFaceCanvas(v, D)), roughness: D.metal ? 0.3 : 0.22, metalness: D.metal ? 0.7 : 0 }));
    for (const d of this.dice) d.material = this.diceMats;
    this.dirty = true;
  }

  // бросок: side 0 — игрок (правая половина), 1 — соперник (левая)
  throwDice(vals, side, onDone, fast = false, idx0 = 0) {
    const sx = side === 0 ? 1 : -1;
    const ends = [new THREE.Vector3(sx * 2.6, FIELD_Y + DIE / 2, 0.05), new THREE.Vector3(sx * 4.1, FIELD_Y + DIE / 2, -0.1)];
    if (vals.length === 2) this.dice.forEach((d) => (d.visible = true));
    vals.forEach((v, i) => {
      const d = this.dice[idx0 + i];
      d.visible = true;
      d.userData.used = false;
      this._tintDie(d, 1);
    });
    let left = vals.length;
    vals.forEach((v, i) => {
      const d = this.dice[idx0 + i];
      const end = ends[i].clone();
      end.x += (Math.random() - 0.5) * 0.4;
      end.z += (Math.random() - 0.5) * 0.25;
      const start = new THREE.Vector3(sx * (8 + i * 0.6), FIELD_Y + 2.6, (side === 0 ? 3.5 : -3.5) + i * 0.8);
      if (vals.length === 1) end.x = sx * 3.3;
      const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
      const q1 = upQuat(v, (Math.random() - 0.5) * 0.7);
      const spin = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      const turns = 3 + Math.random() * 2;
      d.position.copy(start);
      d.quaternion.copy(q0);
      const dur = fast ? 0.45 : 0.95 + i * 0.08;
      this.anims.push({
        dur,
        t: 0,
        step: (k) => {
          // три затухающих отскока
          const e = 1 - Math.pow(1 - k, 2.2);
          d.position.lerpVectors(start, end, e);
          const b = k < 0.45 ? Math.sin((k / 0.45) * Math.PI * 0.5 + Math.PI * 0.5) : k < 0.75 ? Math.abs(Math.sin(((k - 0.45) / 0.3) * Math.PI)) * 0.35 : Math.abs(Math.sin(((k - 0.75) / 0.25) * Math.PI)) * 0.1;
          d.position.y = end.y + (k < 0.45 ? b * 2.6 : b);
          const spinQ = new THREE.Quaternion().setFromAxisAngle(spin, (1 - e) * turns * Math.PI * 2);
          const qa = q1.clone().premultiply(spinQ);
          d.quaternion.copy(qa);
          if (k >= 0.45 && !d.userData.b1) {
            d.userData.b1 = 1;
            this.onSound && this.onSound('diceHit', 1);
          }
          if (k >= 0.75 && !d.userData.b2) {
            d.userData.b2 = 1;
            this.onSound && this.onSound('diceHit', 0.5);
          }
        },
        done: () => {
          d.userData.b1 = d.userData.b2 = 0;
          d.position.copy(end);
          d.quaternion.copy(q1);
          if (--left === 0 && onDone) onDone();
        },
      });
    });
    this.onSound && this.onSound('diceShake');
  }
  // затемнить использованные кубики: k — сколько ещё ходов у каждого
  setDiceUsed(used) {
    this.dice.forEach((d, i) => this._tintDie(d, used[i] ? 0.45 : 1));
    this.dirty = true;
  }
  _tintDie(d, k) {
    d.userData.k = k;
    d.onBeforeRender = () => {};
    if (!d.userData.mats || d.userData.mats[0].map !== this.diceMats[0].map) {
      d.userData.mats = this.diceMats.map((m) => m.clone());
    }
    d.userData.mats.forEach((m) => m.color.setScalar(k));
    d.material = d.userData.mats;
  }
  hideDice() {
    this.dice.forEach((d) => (d.visible = false));
    this.dirty = true;
  }
  // показать кубики в покое (восстановление партии)
  placeDice(vals, side) {
    const sx = side === 0 ? 1 : -1;
    vals.forEach((v, i) => {
      const d = this.dice[i];
      d.visible = true;
      d.position.set(sx * (2.6 + i * 1.5), FIELD_Y + DIE / 2, 0);
      d.quaternion.copy(upQuat(v, 0.2 - i * 0.3));
    });
    this.dirty = true;
  }

  // ---------- раскладка ----------
  // местоположение: 'a<абсолютный пункт>' | 'bar<p>' | 'off<p>'
  offSide(p) {
    // лоток рядом с домом игрока
    if (p === 0) return { x: 7.6, z: 1 };
    return this.mode === 'long' ? { x: -7.6, z: -1 } : { x: 7.6, z: -1 };
  }
  slot(loc, i) {
    if (loc[0] === 'a') {
      const a = +loc.slice(1);
      const P = pointXZ(a);
      const dir = P.top ? 1 : -1;
      const layer = Math.floor(i / PER_ROW);
      const k = i % PER_ROW;
      return { pos: new THREE.Vector3(P.x, FIELD_Y + layer * CH_H, P.z + dir * (0.6 + k * STEP)), flat: true };
    }
    if (loc.startsWith('bar')) {
      const p = +loc[3];
      const dir = p === 0 ? 1 : -1;
      return { pos: new THREE.Vector3(0, FRAME_Y + 0.01 + Math.floor(i / 4) * CH_H, dir * (1.2 + (i % 4) * STEP)), flat: true };
    }
    // лоток: шашки стоят на ребре плотным рядом
    const p = +loc[3];
    const S = this.offSide(p);
    const dz = S.z > 0 ? 1 : -1;
    return { pos: new THREE.Vector3(S.x, FIELD_Y + CH_R, dz * (0.35 + i * (CH_H + 0.04)) + dz * 0.0), flat: false, dz };
  }
  // разложить шашки по состоянию партии мгновенно
  layout(s) {
    this.mode = s.mode;
    this.stacks = {};
    const used = [0, 0];
    const put = (p, loc, n) => {
      const arr = (this.stacks[loc] = this.stacks[loc] || []);
      for (let k = 0; k < n; k++) {
        const g = this.checkers[p][used[p]++];
        arr.push(g);
      }
    };
    for (const p of [0, 1]) {
      for (let t = 0; t < 24; t++) if (s.n[p][t]) put(p, 'a' + absOf(s.mode, p, t), s.n[p][t]);
      if (s.bar[p]) put(p, 'bar' + p, s.bar[p]);
      if (s.off[p]) put(p, 'off' + p, s.off[p]);
    }
    for (const loc in this.stacks) this.stacks[loc].forEach((g, i) => this._place(g, loc, i));
    this._labels();
    this.dirty = true;
  }
  _place(g, loc, i) {
    const sl = this.slot(loc, i);
    g.position.copy(sl.pos);
    g.rotation.set(0, 0, 0);
    if (!sl.flat) {
      g.rotation.x = (sl.dz > 0 ? -1 : 1) * Math.PI / 2;
      g.position.z -= sl.dz * CH_H * 0.5;
      g.position.y = FIELD_Y + CH_R;
    }
    g.userData.loc = loc;
  }
  locOf(mode, p, t) {
    if (t === -1) return 'bar' + p;
    if (t >= 24) return 'off' + p;
    return 'a' + absOf(mode, p, t);
  }
  // анимированный перенос верхней шашки
  move(fromLoc, toLoc, onDone, dur = 0.42) {
    const from = this.stacks[fromLoc];
    if (!from || !from.length) {
      onDone && onDone();
      return;
    }
    const g = from.pop();
    const to = (this.stacks[toLoc] = this.stacks[toLoc] || []);
    to.push(g);
    const sl = this.slot(toLoc, to.length - 1);
    const p0 = g.position.clone();
    const r0 = g.rotation.x;
    const tmp = new THREE.Object3D();
    this._place(tmp, toLoc, to.length - 1);
    const p1 = tmp.position.clone();
    const r1 = tmp.rotation.x;
    const lift = 0.8 + Math.min(1.2, p0.distanceTo(p1) * 0.08);
    this._labels();
    this.anims.push({
      dur,
      t: 0,
      step: (k) => {
        const e = ease(k);
        g.position.lerpVectors(p0, p1, e);
        g.position.y += Math.sin(e * Math.PI) * lift;
        g.rotation.x = r0 + (r1 - r0) * e;
      },
      done: () => {
        g.position.copy(p1);
        g.rotation.x = r1;
        g.userData.loc = toLoc;
        this.onSound && this.onSound(toLoc.startsWith('off') ? 'off' : 'place');
        onDone && onDone();
      },
    });
    void sl;
  }

  // ---------- перетаскивание ----------
  dragGrab(loc) {
    const arr = this.stacks[loc];
    if (!arr || !arr.length) return null;
    const g = arr[arr.length - 1];
    g.userData.lift = 0;
    g.userData.liftCur = 0;
    g.userData.body.position.y = g.userData.top.position.y = 0;
    return g;
  }
  dragTo(g, cx, cy) {
    const p = this.planePoint(cx, cy, FIELD_Y + 0.9);
    g.position.set(p.x, FIELD_Y + 0.9, p.z);
    this.dirty = true;
  }
  snapBack(loc, g) {
    const arr = this.stacks[loc];
    const i = arr.indexOf(g);
    const tmp = new THREE.Object3D();
    this._place(tmp, loc, i);
    const p0 = g.position.clone();
    const p1 = tmp.position.clone();
    this.anims.push({ dur: 0.22, t: 0, step: (k) => g.position.lerpVectors(p0, p1, ease(k)), done: () => g.position.copy(p1) });
  }

  // числа над высокими стопками
  _labels() {
    if (!this.labelPool) this.labelPool = [];
    let used = 0;
    for (const loc in this.stacks) {
      const arr = this.stacks[loc];
      if (arr.length <= PER_ROW || !loc.startsWith('a')) continue;
      let sp = this.labelPool[used];
      if (!sp) {
        const c = canvas(96, 96);
        const m = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true });
        sp = new THREE.Sprite(m);
        sp.scale.set(0.55, 0.55, 1);
        sp.renderOrder = 10;
        sp.userData.c = c;
        this.board.add(sp);
        this.labelPool.push(sp);
      }
      const c = sp.userData.c;
      const x = c.getContext('2d');
      x.clearRect(0, 0, 96, 96);
      x.beginPath();
      x.arc(48, 48, 42, 0, Math.PI * 2);
      x.fillStyle = '#fff6e0';
      x.fill();
      x.lineWidth = 6;
      x.strokeStyle = '#3a2314';
      x.stroke();
      x.fillStyle = '#3a2314';
      x.font = '900 50px Nunito, sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(String(arr.length), 48, 52);
      sp.material.map.needsUpdate = true;
      const a = +loc.slice(1);
      const P = pointXZ(a);
      const dir = P.top ? 1 : -1;
      const topLayer = Math.floor((arr.length - 1) / PER_ROW);
      sp.position.set(P.x, FIELD_Y + (topLayer + 1) * CH_H + 0.35, P.z + dir * (0.6 + 4 * STEP + 0.75));
      sp.visible = true;
      used++;
    }
    for (let i = used; i < this.labelPool.length; i++) this.labelPool[i].visible = false;
  }

  // ---------- подсветка ----------
  _buildMarkers() {
    // треугольник-подсветка пункта
    const sh = new THREE.Shape();
    sh.moveTo(-0.48, 0);
    sh.quadraticCurveTo(-0.26, 2.4, 0, 4.35);
    sh.quadraticCurveTo(0.26, 2.4, 0.48, 0);
    sh.closePath();
    const tri = new THREE.ShapeGeometry(sh, 8);
    tri.rotateX(Math.PI / 2);
    this.ptMat = new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending });
    this.ptHi = [];
    for (let a = 0; a < 24; a++) {
      const m = new THREE.Mesh(tri, this.ptMat);
      const P = pointXZ(a);
      m.position.set(P.x, FIELD_Y + 0.01, P.z + (P.top ? 0.1 : -0.1));
      if (!P.top) m.rotation.y = Math.PI;
      m.visible = false;
      m.renderOrder = 2;
      this.board.add(m);
      this.ptHi.push(m);
    }
    // кольцо места посадки
    this.ringGeo = new THREE.RingGeometry(0.3, 0.46, 40);
    this.ringGeo.rotateX(-Math.PI / 2);
    this.dotMat = new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.85, depthWrite: false });
    this.rings = [];
    // подсветка шашек, которыми можно ходить
    this.glowGeo = new THREE.RingGeometry(0.46, 0.6, 40);
    this.glowGeo.rotateX(-Math.PI / 2);
    this.glowMat = new THREE.MeshBasicMaterial({ color: '#ffd55a', transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending });
    this.selMat = new THREE.MeshBasicMaterial({ color: '#7cf0ff', transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
    this.glows = [];
    // лоток-цель
    this.trayHi = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 5), this.ptMat);
    this.trayHi.rotation.x = -Math.PI / 2;
    this.trayHi.visible = false;
    this.board.add(this.trayHi);
    // следы последнего хода соперника
    this.trailMat = new THREE.MeshBasicMaterial({ color: '#ff9d6b', transparent: true, opacity: 0.55, depthWrite: false });
    this.trails = [];
  }
  _ring(i, mat, geo) {
    const pool = mat === this.dotMat ? this.rings : mat === this.trailMat ? this.trails : this.glows;
    let m = pool[i];
    if (!m) {
      m = new THREE.Mesh(geo, mat);
      m.renderOrder = 3;
      this.board.add(m);
      pool[i] = m;
    }
    m.material = mat;
    m.visible = true;
    return m;
  }
  // targets: [loc], movable: [loc], sel: loc|null
  highlight({ targets = [], movable = [], sel = null } = {}) {
    this.ptHi.forEach((m) => (m.visible = false));
    this.rings.forEach((m) => (m.visible = false));
    this.glows.forEach((m) => (m.visible = false));
    this.trayHi.visible = false;
    let ri = 0;
    for (const loc of targets) {
      if (loc.startsWith('off')) {
        const S = this.offSide(+loc[3]);
        this.trayHi.position.set(S.x, FIELD_Y + 0.02, S.z > 0 ? 2.6 : -2.6);
        this.trayHi.visible = true;
        continue;
      }
      const a = +loc.slice(1);
      this.ptHi[a].visible = true;
      const arr = this.stacks[loc] || [];
      const own = arr.length && sel && this.stacks[sel] && arr[0].userData.p === this.stacks[sel][0].userData.p;
      const idx = own ? arr.length : arr.length && this.mode === 'short' ? 0 : arr.length;
      const sl = this.slot(loc, idx);
      const r = this._ring(ri++, this.dotMat, this.ringGeo);
      r.position.copy(sl.pos);
      r.position.y = FIELD_Y + Math.floor(idx / PER_ROW) * CH_H + (arr.length && !own ? CH_H : 0) + 0.02;
    }
    let gi = 0;
    for (const loc of movable) {
      const arr = this.stacks[loc];
      if (!arr || !arr.length) continue;
      const top = arr[arr.length - 1];
      const m = this._ring(gi++, loc === sel ? this.selMat : this.glowMat, this.glowGeo);
      m.position.copy(top.position);
      m.position.y = top.position.y + CH_H + 0.015;
    }
    // выбранная шашка приподнята
    for (const p of [0, 1]) for (const g of this.checkers[p]) g.userData.lift = 0;
    if (sel && this.stacks[sel] && this.stacks[sel].length) this.stacks[sel][this.stacks[sel].length - 1].userData.lift = 1;
    this.dirty = true;
  }
  // след хода соперника: пункты «откуда» и «куда»
  showTrail(locs) {
    this.trails.forEach((m) => (m.visible = false));
    locs.forEach((loc, i) => {
      if (!loc.startsWith('a')) return;
      const arr = this.stacks[loc] || [];
      const m = this._ring(i, this.trailMat, this.ringGeo);
      const sl = this.slot(loc, Math.max(0, arr.length - (i % 2 ? 1 : 0)));
      m.position.copy(sl.pos);
      m.position.y = FIELD_Y + 0.015 + (i % 2 ? Math.floor((arr.length - 1) / PER_ROW) * CH_H + CH_H : 0);
      m.scale.setScalar(i % 2 ? 1.15 : 0.9);
    });
    this.dirty = true;
  }

  // ---------- касание: экран → пункт ----------
  pick(cx, cy) {
    const r = this.cv.getBoundingClientRect();
    const v = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(v, this.cam);
    const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(FIELD_Y + 0.15));
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(pl, hit)) return null;
    return this.locAt(hit.x, hit.z);
  }
  locAt(x, z) {
    if (Math.abs(z) > 5.4) return null;
    const ax = Math.abs(x);
    if (ax <= 0.45) return 'bar';
    if (ax > 6.45 && ax <= 8.8) return 'tray' + (x > 0 ? 'R' : 'L') + (z > 0 ? 'B' : 'T');
    if (ax > 6.45) return null;
    const col = Math.max(0, Math.min(5, x > 0 ? Math.round(x - 0.95) : Math.round(-x - 0.95)));
    const bottom = z > 0;
    let a;
    if (x > 0) a = bottom ? 5 - col : 18 + col;
    else a = bottom ? 6 + col : 17 - col;
    return 'a' + a;
  }
  // экранные координаты точки поля (для подсказок интерфейса)
  toScreen(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.cam);
    const r = this.cv.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }
  // мировая точка под курсором (для перетаскивания)
  planePoint(cx, cy, y = FIELD_Y + 0.6) {
    const r = this.cv.getBoundingClientRect();
    const v = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(v, this.cam);
    const hit = new THREE.Vector3();
    ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), hit);
    return hit;
  }

  // ---------- камера ----------
  resize(w, h, insets) {
    this.W = w;
    this.H = h;
    if (insets) this.insets = insets;
    this.renderer.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.portrait = h > w * 1.05;
    this.cam.updateProjectionMatrix();
    this.camCur = null;
    this.dirty = true;
  }
  setView(v) {
    this.view = v;
    this.dirty = true;
  }
  // камера, при которой доска целиком помещается в свободную часть экрана
  _gameCam() {
    const portrait = this.portrait;
    const ins = this.insets;
    const W = this.W;
    const H = this.H;
    // направление взгляда
    const pitch = portrait ? 1.22 : 1.0;
    const dir = portrait ? new THREE.Vector3(Math.cos(pitch), Math.sin(pitch), 0) : new THREE.Vector3(0, Math.sin(pitch), Math.cos(pitch));
    const up = portrait ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const cam = this._fitCam || (this._fitCam = new THREE.PerspectiveCamera());
    cam.fov = this.cam.fov;
    cam.aspect = W / H;
    cam.updateProjectionMatrix();
    cam.up.copy(up);
    const corners = [];
    for (const x of [-8.9, 8.9]) for (const z of [-5.9, 5.9]) for (const y of [0, 0.8]) corners.push(new THREE.Vector3(x, y, z));
    // свободная область в NDC
    const L = -1 + (2 * ins.left) / W;
    const R = 1 - (2 * ins.right) / W;
    const B = -1 + (2 * ins.bottom) / H;
    const T = 1 - (2 * ins.top) / H;
    let target = new THREE.Vector3(0, 0, 0);
    let dist = 30;
    for (let it = 0; it < 4; it++) {
      // подбор расстояния
      let lo = 5;
      let hi = 120;
      for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2;
        cam.position.copy(target).addScaledVector(dir, mid);
        cam.lookAt(target);
        cam.updateMatrixWorld();
        let ok = true;
        for (const c of corners) {
          const p = c.clone().project(cam);
          if (p.x < L || p.x > R || p.y < B || p.y > T || p.z > 1) {
            ok = false;
            break;
          }
        }
        if (ok) hi = mid;
        else lo = mid;
      }
      dist = hi * 1.01;
      cam.position.copy(target).addScaledVector(dir, dist);
      cam.lookAt(target);
      cam.updateMatrixWorld();
      // центрируем проекцию доски в свободной области
      let minX = 9;
      let maxX = -9;
      let minY = 9;
      let maxY = -9;
      for (const c of corners) {
        const p = c.clone().project(cam);
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
      const dx = (L + R) / 2 - (minX + maxX) / 2;
      const dy = (B + T) / 2 - (minY + maxY) / 2;
      // сдвиг цели в мировых единицах (приблизительно)
      const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
      const upv = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
      const scaleY = dist * Math.tan((cam.fov * Math.PI) / 360);
      const scaleX = scaleY * cam.aspect;
      target = target.clone().addScaledVector(right, -dx * scaleX).addScaledVector(upv, -dy * scaleY);
      target.y = 0;
    }
    return { pos: cam.position.clone(), target, up };
  }
  _menuCam(t) {
    const a = Math.sin(t * 0.05) * 0.35;
    if (this.portrait) return { pos: new THREE.Vector3(Math.sin(a) * 17, 24, Math.cos(a) * 17 + 3), target: new THREE.Vector3(Math.sin(a) * 3, 0, -0.5), up: new THREE.Vector3(0, 1, 0) };
    return { pos: new THREE.Vector3(Math.sin(a) * 24, 11.5, Math.cos(a) * 24), target: new THREE.Vector3(0, 0.5, -3), up: new THREE.Vector3(0, 1, 0) };
  }

  // ---------- кадр ----------
  update(dt) {
    this.time += dt;
    if (this.anims.length) {
      this.dirty = true;
      const list = this.anims;
      this.anims = [];
      for (const a of list) {
        a.t += dt;
        const k = Math.min(1, a.t / a.dur);
        a.step(k);
        if (k >= 1) a.done && a.done();
        else this.anims.push(a);
      }
    }
    // камера: плавный переход
    const want = this.view === 'custom' ? this.customCam : this.view === 'menu' ? this._menuCam(this.time) : this.camGame || (this.camGame = this._gameCam());
    if (this.view !== 'menu') this.dirty = this.dirty || !this.camCur;
    if (!this.camCur) this.camCur = { pos: want.pos.clone(), target: want.target.clone(), up: want.up.clone() };
    const k = 1 - Math.exp(-dt * (this.view === 'menu' ? 2 : 4));
    const d = this.camCur.pos.distanceTo(want.pos);
    this.camCur.pos.lerp(want.pos, k);
    this.camCur.target.lerp(want.target, k);
    this.camCur.up.lerp(want.up, k).normalize();
    if (d > 0.01 || this.view === 'menu') this.dirty = true;
    this.cam.position.copy(this.camCur.pos);
    this.cam.up.copy(this.camCur.up);
    this.cam.lookAt(this.camCur.target);
    // выбранная шашка приподнимается
    if (this.checkers)
      for (const p of [0, 1])
        for (const g of this.checkers[p]) {
          const l = g.userData.lift || 0;
          const cur = g.userData.liftCur || 0;
          if (Math.abs(l - cur) > 0.001 || l) {
            const nv = cur + (l - cur) * Math.min(1, dt * 12);
            g.userData.top.position.y = g.userData.body.position.y = nv * (0.35 + Math.sin(this.time * 4) * 0.04);
            g.userData.liftCur = nv;
            this.dirty = true;
          }
        }
    // пульс подсветки
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 4);
    this.ptMat.opacity = 0.18 + pulse * 0.22;
    this.glowMat.opacity = 0.45 + pulse * 0.45;
    this.dotMat.opacity = 0.6 + pulse * 0.35;
    if (this.ptHi.some((m) => m.visible) || this.glows.some((m) => m.visible)) this.dirty = true;
    // мерцание фонаря
    const L = this.env.userData.lamp.userData;
    L.light.intensity = 13 + Math.sin(this.time * 9) * 0.8 + Math.sin(this.time * 23) * 0.5;
    L.flame.scale.y = 1.6 + Math.sin(this.time * 13) * 0.12;
    this.frameN = (this.frameN || 0) + 1;
    if (this.frameN % 6 === 0) this.dirty = true;
  }
  // фиксированная камера (промо)
  setCam(pos, target) {
    this.customCam = { pos: new THREE.Vector3(...pos), target: new THREE.Vector3(...target), up: new THREE.Vector3(0, 1, 0) };
    this.view = 'custom';
    this.camCur = null;
    this.dirty = true;
  }
  invalidateCam() {
    this.camGame = null;
    this.dirty = true;
  }
  render(force) {
    if (!this.dirty && !force) return;
    this.dirty = false;
    this.renderer.render(this.scene, this.cam);
  }
}
