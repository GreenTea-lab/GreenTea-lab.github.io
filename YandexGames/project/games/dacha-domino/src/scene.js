// 3D-сцена: дачная веранда, стол, освещение, камера, которая подстраивается под цепочку
import * as THREE from 'three';
import * as TX from './textures.js';
import { LANG } from './i18n.js';

export const TABLE_W = 32;
export const TABLE_D = 26;
const FLOOR = -30; // пол веранды
const GROUND = -31.5; // земля вокруг

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
function mesh(geo, mat, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (o.ry) m.rotation.y = o.ry;
  if (o.rx) m.rotation.x = o.rx;
  if (o.rz) m.rotation.z = o.rz;
  if (o.s) m.scale.setScalar(o.s);
  m.castShadow = o.cast !== false;
  m.receiveShadow = o.recv !== false;
  return m;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const lathe = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

export class Scene3D {
  constructor(canvas) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!(window.__DD_DEBUG && window.__DD_DEBUG.promo) });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.r = r;
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(34, 1, 0.5, 1500);
    this.scene.add(this.cam);
    this.tilt = 0.5; // наклон камеры от вертикали (рад)
    this.yaw = 0;
    this.view = { x: 0, z: 1.5, dist: 46 };
    this.goal = { x: 0, z: 1.5, dist: 46 };
    this.region = { x0: -1, x1: 1, y0: -1, y1: 1 };
    this.shift = { x: 0, y: 0 };
    this.t = 0;
    this.anim = [];
    // свет
    this.hemi = new THREE.HemisphereLight('#dfefff', '#8a6a48', 1.2);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff3dc', 2.4);
    this.sun.position.set(-26, 60, 14);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.left = -36;
    sc.right = 36;
    sc.top = 36;
    sc.bottom = -36;
    sc.near = 10;
    sc.far = 160;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);
    this.lamp = new THREE.PointLight('#ffc27a', 0, 90, 1.6);
    this.lamp.position.set(0, 40, 4);
    this.scene.add(this.lamp);
    this.glow = TX.glowTex();
    this.blob = TX.blobTex();
    this.tableG = new THREE.Group();
    this.envG = new THREE.Group();
    this.scene.add(this.tableG, this.envG);
    this.board = new THREE.Group(); // сюда кладутся кости
    this.scene.add(this.board);
    this.resize();
  }

  resize() {
    const w = window.innerWidth,
      h = window.innerHeight;
    this.r.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.W = w;
    this.H = h;
  }

  // область экрана (в пикселях CSS), куда должна поместиться цепочка
  setRegion(px) {
    const { W, H } = this;
    this.region = { x0: (px.l / W) * 2 - 1, x1: ((W - px.r) / W) * 2 - 1, y0: 1 - ((H - px.b) / H) * 2, y1: 1 - (px.t / H) * 2 };
  }

  // подобрать камеру так, чтобы прямоугольник стола [x0..x1]×[z0..z1] занял область
  fit(bb, instant = false) {
    const R = this.region;
    const hx = (R.x1 - R.x0) / 2,
      hy = (R.y1 - R.y0) / 2;
    const portrait = (R.x1 - R.x0) * this.W < (R.y1 - R.y0) * this.H * 1.1;
    const minW = bb.minW || (portrait ? 11 : 19),
      minD = bb.minD || 8;
    let { x0, x1, z0, z1 } = bb;
    if (x1 - x0 < minW) {
      const c = (x0 + x1) / 2;
      x0 = c - minW / 2;
      x1 = c + minW / 2;
    }
    if (z1 - z0 < minD) {
      const c = (z0 + z1) / 2;
      z0 = c - minD / 2;
      z1 = c + minD / 2;
    }
    const g = { x: (x0 + x1) / 2, z: (z0 + z1) / 2, dist: 40 };
    const pts = [];
    for (const x of [x0, x1]) for (const z of [z0, z1]) for (const y of [0, 0.5]) pts.push(new THREE.Vector3(x, y, z));
    const cam = this._probe || (this._probe = new THREE.PerspectiveCamera());
    cam.fov = this.cam.fov;
    cam.aspect = this.cam.aspect;
    cam.near = 0.5;
    cam.far = 1500;
    cam.updateProjectionMatrix();
    const v = new THREE.Vector3();
    for (let it = 0; it < 8; it++) {
      this._place(cam, g);
      cam.updateMatrixWorld();
      let ax = Infinity,
        bx = -Infinity,
        ay = Infinity,
        by = -Infinity;
      for (const p of pts) {
        v.copy(p).project(cam);
        ax = Math.min(ax, v.x);
        bx = Math.max(bx, v.x);
        ay = Math.min(ay, v.y);
        by = Math.max(by, v.y);
      }
      const f = Math.max((bx - ax) / (2 * hx), (by - ay) / (2 * hy));
      const k = g.dist * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      g.x += ((ax + bx) / 2) * k * cam.aspect * 0.9;
      g.z -= ((ay + by) / 2) * k * 1.1;
      g.dist = THREE.MathUtils.clamp(g.dist * (0.25 + 0.75 * f), bb.minDist || 22, 140);
    }
    this.goal = g;
    if (instant) Object.assign(this.view, g);
  }

  _place(cam, v) {
    const s = Math.sin(this.tilt),
      c = Math.cos(this.tilt);
    cam.position.set(v.x + Math.sin(this.yaw) * s * v.dist, c * v.dist, v.z + Math.cos(this.yaw) * s * v.dist);
    cam.up.set(0, 1, 0);
    cam.lookAt(v.x, 0, v.z);
  }

  _applyCam() {
    const cam = this.cam;
    this._place(cam, this.view);
    cam.updateProjectionMatrix();
    const R = this.region;
    const sx = (R.x0 + R.x1) / 2,
      sy = (R.y0 + R.y1) / 2;
    this.shift = { x: sx, y: sy };
    cam.projectionMatrix.elements[8] = -sx;
    cam.projectionMatrix.elements[9] = -sy;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    cam.updateMatrixWorld();
  }

  // точка в системе координат камеры на глубине d для экранной точки (пиксели CSS)
  camPoint(px, py, d) {
    const nx = (px / this.W) * 2 - 1,
      ny = 1 - (py / this.H) * 2;
    const e = this.cam.projectionMatrix.elements;
    return new THREE.Vector3(((nx + e[8]) * d) / e[0], ((ny + e[9]) * d) / e[5], -d);
  }
  // сколько единиц мира в одном пикселе на глубине d
  unitsPerPx(d) {
    const e = this.cam.projectionMatrix.elements;
    return (2 * d) / e[5] / this.H;
  }
  // экранные координаты точки мира
  toScreen(v3) {
    const v = v3.clone().project(this.cam);
    return { x: ((v.x + 1) / 2) * this.W, y: ((1 - v.y) / 2) * this.H, vis: v.z < 1 };
  }
  // точка мира над столом на высоте y под экранной точкой
  worldAt(px, py, y = 4) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((px / this.W) * 2 - 1, 1 - (py / this.H) * 2), this.cam);
    const t = (y - ray.ray.origin.y) / ray.ray.direction.y;
    return ray.ray.origin.clone().addScaledVector(ray.ray.direction, t);
  }

  update(dt) {
    this.t += dt;
    const k = 1 - Math.exp(-dt * 3.2);
    this.view.x += (this.goal.x - this.view.x) * k;
    this.view.z += (this.goal.z - this.view.z) * k;
    this.view.dist += (this.goal.dist - this.view.dist) * k;
    this._applyCam();
    // солнце следует за камерой, чтобы тени всегда были чёткими там, где смотрим
    this.sun.target.position.set(this.view.x, 0, this.view.z);
    this.sun.position.set(this.view.x - 26, 60, this.view.z + 14);
    for (let i = this.anim.length - 1; i >= 0; i--) if (this.anim[i](dt, this.t) === false) this.anim.splice(i, 1);
    if (this.envTick) this.envTick(dt, this.t);
  }

  render() {
    this.r.render(this.scene, this.cam);
  }

  // ---------- стол ----------
  setTable(id) {
    this.tableId = id;
    clear(this.tableG);
    const G = this.tableG;
    const W = TABLE_W,
      D = TABLE_D;
    const woodTex = (base, seed, rows = 7) => {
      const t = TX.tex(TX.planks(base, { rows, seed }), [1, 1]);
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      return t;
    };
    const legMat = M('#7a4f2e', { roughness: 0.6 });
    let topMat;
    let edgeMat = M('#8a5a34', { roughness: 0.55 });
    if (id === 'oak') topMat = M('#ffffff', { map: woodTex('#c8925a', 4), roughness: 0.55 });
    else if (id === 'walnut') {
      topMat = M('#ffffff', { map: walnutTex(), roughness: 0.3 });
      edgeMat = M('#4a2a18', { roughness: 0.35 });
    } else if (id === 'felt') topMat = M('#ffffff', { map: TX.felt(), roughness: 1 });
    else topMat = M('#ffffff', { map: woodTex('#b98352', 6), roughness: 0.6 });
    // столешница
    G.add(mesh(box(W, 1.6, D), [edgeMat, edgeMat, topMat, edgeMat, edgeMat, edgeMat], 0, -0.8, 0));
    if (id === 'felt') {
      // сукно в деревянной рамке
      const fr = M('#6b3d22', { roughness: 0.45 });
      const t = 1.3;
      G.add(mesh(box(W + 0.4, 0.5, t), fr, 0, 0.05, -D / 2 + t / 2), mesh(box(W + 0.4, 0.5, t), fr, 0, 0.05, D / 2 - t / 2));
      G.add(mesh(box(t, 0.5, D), fr, -W / 2 + t / 2, 0.05, 0), mesh(box(t, 0.5, D), fr, W / 2 - t / 2, 0.05, 0));
      const brass = M('#d8b25a', { metalness: 0.8, roughness: 0.3 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) G.add(mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16), brass, sx * (W / 2 - 0.65), 0.32, sz * (D / 2 - 0.65)));
    }
    if (id === 'walnut') {
      const inl = M('#e8c88a', { roughness: 0.35 });
      const m = 1.4;
      for (const sz of [-1, 1]) G.add(mesh(box(W - 2 * m, 0.02, 0.18), inl, 0, 0.01, sz * (D / 2 - m), { cast: false }));
      for (const sx of [-1, 1]) G.add(mesh(box(0.18, 0.02, D - 2 * m), inl, sx * (W / 2 - m), 0.01, 0, { cast: false }));
    }
    // скатерть
    if (id === 'oilcloth' || id === 'lace' || id === 'chintz') {
      const map = id === 'oilcloth' ? TX.oilcloth() : id === 'lace' ? TX.lace(W + 1.2, D + 1.2) : TX.chintz();
      const cm = M('#ffffff', { map, roughness: id === 'oilcloth' ? 0.35 : 0.95 });
      const cloth = mesh(new THREE.PlaneGeometry(W + 1.2, D + 1.2), cm, 0, 0.02, 0, { rx: -Math.PI / 2, cast: false });
      G.add(cloth);
      // свисающие края с мягкими складками
      const drop = id === 'lace' ? 3.2 : 2.6;
      const sideMap = map.clone();
      sideMap.needsUpdate = true;
      const sm = M('#ffffff', { map: id === 'lace' ? null : sideMap, color: id === 'lace' ? '#f6f1e6' : '#ffffff', roughness: cm.roughness, side: THREE.DoubleSide });
      const mk = (len) => {
        const g = new THREE.PlaneGeometry(len, drop, Math.round(len * 2), 2);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i),
            y = p.getY(i);
          const k = (drop / 2 - y) / drop;
          p.setZ(i, Math.sin(x * 1.3) * 0.25 * k);
        }
        g.computeVertexNormals();
        return g;
      };
      const hw = (W + 1.2) / 2,
        hd = (D + 1.2) / 2;
      G.add(mesh(mk(W + 1.2), sm, 0, 0.02 - drop / 2, hd, { cast: false }));
      G.add(mesh(mk(W + 1.2), sm, 0, 0.02 - drop / 2, -hd, { ry: Math.PI, cast: false }));
      G.add(mesh(mk(D + 1.2), sm, hw, 0.02 - drop / 2, 0, { ry: Math.PI / 2, cast: false }));
      G.add(mesh(mk(D + 1.2), sm, -hw, 0.02 - drop / 2, 0, { ry: -Math.PI / 2, cast: false }));
      if (id === 'lace') {
        // ажурная кайма — полупрозрачные кружочки по низу
        const dotM = new THREE.MeshStandardMaterial({ color: '#fbf8f1', roughness: 1, side: THREE.DoubleSide });
        const dg = new THREE.CircleGeometry(0.45, 12);
        const dots = new THREE.InstancedMesh(dg, dotM, 260);
        let n = 0;
        const o = new THREE.Object3D();
        const y = 0.02 - drop - 0.15;
        for (let x = -hw; x <= hw && n < 258; x += 0.9) {
          o.position.set(x, y, hd + 0.02);
          o.rotation.set(0, 0, 0);
          o.updateMatrix();
          dots.setMatrixAt(n++, o.matrix);
          o.position.set(x, y, -hd - 0.02);
          o.updateMatrix();
          dots.setMatrixAt(n++, o.matrix);
        }
        dots.count = n;
        G.add(dots);
      }
    }
    // ноги и царга
    const lx = W / 2 - 2,
      lz = D / 2 - 2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) G.add(mesh(box(1.8, 28.4, 1.8), legMat, sx * lx, -1.6 - 14.2, sz * lz));
    G.add(mesh(box(W - 4, 2.4, 0.8), legMat, 0, -2.8, lz), mesh(box(W - 4, 2.4, 0.8), legMat, 0, -2.8, -lz));
    G.add(mesh(box(0.8, 2.4, D - 4), legMat, lx, -2.8, 0), mesh(box(0.8, 2.4, D - 4), legMat, -lx, -2.8, 0));
    this._tableProps();
  }

  // предметы на столе: чай, сушки, блокнот со счётом, очки
  _tableProps() {
    const G = this.tableG;
    const hx = TABLE_W / 2,
      hz = TABLE_D / 2;
    const white = M('#fbfbf8', { roughness: 0.25 });
    const blue = M('#2f64b5', { roughness: 0.3 });
    // чашка с блюдцем (дальний правый угол)
    const cup = new THREE.Group();
    cup.add(mesh(lathe([[0, 0], [2.2, 0], [2.4, 0.18], [2.5, 0.3], [1.3, 0.22], [0, 0.22]]), white, 0, 0, 0));
    cup.add(mesh(new THREE.TorusGeometry(2.35, 0.08, 6, 40), blue, 0, 0.28, 0, { rx: Math.PI / 2 }));
    const cupG = lathe([[0, 0.2], [0.9, 0.2], [1.15, 0.5], [1.35, 1.6], [1.45, 2.4], [1.38, 2.42], [1.25, 1.6], [1.05, 0.55], [0, 0.45]]);
    cup.add(mesh(cupG, white, 0, 0.1, 0));
    cup.add(mesh(new THREE.TorusGeometry(1.45, 0.06, 6, 40), blue, 0, 2.42, 0, { rx: Math.PI / 2 }));
    cup.add(mesh(new THREE.CircleGeometry(1.3, 32), M('#8a3d12', { roughness: 0.1, metalness: 0.1 }), 0, 2.1, 0, { rx: -Math.PI / 2 }));
    cup.add(mesh(new THREE.TorusGeometry(0.55, 0.16, 8, 16, Math.PI * 1.2), white, 1.5, 1.4, 0, { rz: -Math.PI * 0.6 }));
    // ложечка
    const sp = M('#d9dde2', { metalness: 0.9, roughness: 0.25 });
    cup.add(mesh(box(0.18, 0.06, 2.6), sp, -1.6, 0.3, 0.9, { ry: 0.5 }));
    cup.add(mesh(new THREE.SphereGeometry(0.4, 12, 8), sp, -2.2, 0.3, 2.0, { s: 1 }));
    cup.children[cup.children.length - 1].scale.set(1, 0.3, 1.3);
    cup.position.set(hx - 4, 0.02, -hz + 4);
    G.add(cup);
    this.cupPos = cup.position.clone();
    // тарелка с сушками (дальний левый угол)
    const plate = new THREE.Group();
    plate.add(mesh(lathe([[0, 0], [2.4, 0], [3.4, 0.3], [3.6, 0.5], [3.3, 0.42], [2.3, 0.15], [0, 0.15]]), white));
    plate.add(mesh(new THREE.TorusGeometry(3.4, 0.07, 6, 48), M('#c23a3a', { roughness: 0.3 }), 0, 0.42, 0, { rx: Math.PI / 2 }));
    const sushkaM = M('#d79a52', { roughness: 0.55 });
    const sg = new THREE.TorusGeometry(0.8, 0.34, 10, 20);
    const pos = [[0, 0.5, 0, 0.1], [1.6, 0.5, 0.6, 0.4], [-1.4, 0.5, 0.9, -0.3], [0.5, 0.5, -1.6, 0.2], [-0.9, 1.1, -0.5, 0.5], [1.2, 0.5, -0.8, -0.6], [0.2, 1.15, 0.9, -0.2]];
    for (const [x, y, z, a] of pos) {
      const s = mesh(sg, sushkaM, x, y, z, { rx: Math.PI / 2 + a * 0.3, rz: a });
      plate.add(s);
    }
    plate.position.set(-hx + 4.6, 0.02, -hz + 4.4);
    G.add(plate);
    // блокнот с карандашом (ближний правый угол)
    const pad = new THREE.Group();
    pad.add(mesh(box(4.2, 0.3, 5.6), M('#c94a3a', { roughness: 0.6 }), 0, 0.15, 0));
    pad.add(mesh(new THREE.PlaneGeometry(4, 5.3), M('#ffffff', { map: TX.notepad(LANG), roughness: 0.9 }), 0, 0.31, 0.05, { rx: -Math.PI / 2, cast: false }));
    const pen = new THREE.Group();
    pen.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 5, 6), M('#f2c230', { roughness: 0.5 }), 0, 0, 0));
    pen.add(mesh(new THREE.ConeGeometry(0.2, 0.7, 6), M('#e8c9a0'), 0, 2.85, 0));
    pen.add(mesh(new THREE.ConeGeometry(0.07, 0.25, 6), M('#333'), 0, 3.15, 0));
    pen.add(mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.5, 6), M('#e88aa0'), 0, -2.7, 0));
    pen.rotation.set(Math.PI / 2, 0, 0.9);
    pen.position.set(2.9, 0.25, 0.3);
    pad.add(pen);
    pad.position.set(hx - 4.2, 0.02, hz - 4.4);
    pad.rotation.y = -0.18;
    G.add(pad);
    // очки (ближний левый угол)
    const gl = new THREE.Group();
    const fr = M('#5a3a24', { roughness: 0.35 });
    const lens = new THREE.MeshStandardMaterial({ color: '#cfe8ff', roughness: 0.05, transparent: true, opacity: 0.25 });
    for (const sx of [-1, 1]) {
      gl.add(mesh(new THREE.TorusGeometry(0.95, 0.12, 8, 28), fr, sx * 1.15, 0.12, 0, { rx: Math.PI / 2 }));
      gl.add(mesh(new THREE.CircleGeometry(0.9, 24), lens, sx * 1.15, 0.14, 0, { rx: -Math.PI / 2, cast: false }));
      gl.add(mesh(box(0.12, 0.12, 3.6), fr, sx * 2.05, 0.12, -1.8));
    }
    gl.add(mesh(new THREE.TorusGeometry(0.3, 0.1, 6, 12, Math.PI), fr, 0, 0.12, 0, { rx: Math.PI / 2 }));
    gl.position.set(-hx + 4, 0.02, hz - 3.4);
    gl.rotation.y = 0.5;
    G.add(gl);
  }

  // ---------- окружение ----------
  setPlace(id) {
    this.placeId = id;
    clear(this.envG);
    this.envTick = null;
    const G = this.envG;
    const P = PLACE_LOOK[id] || PLACE_LOOK.summer;
    this.scene.background = new THREE.Color(P.sky);
    this.scene.fog = new THREE.Fog(P.sky, 160, 420);
    this.hemi.color.set(P.hemi[0]);
    this.hemi.groundColor.set(P.hemi[1]);
    this.hemi.intensity = P.hemi[2];
    this.sun.color.set(P.sun[0]);
    this.sun.intensity = P.sun[1];
    this.lamp.intensity = P.lamp;
    this.r.toneMappingExposure = P.exposure || 1.05;
    const ticks = [];

    // земля
    const gt = TX.grass(P.grass);
    G.add(mesh(new THREE.PlaneGeometry(900, 900), M('#ffffff', { map: gt, roughness: 1 }), 0, GROUND, 0, { rx: -Math.PI / 2, cast: false }));
    // веранда: дощатый пол
    const DK = 54;
    const deckTex = TX.tex(TX.planks(P.deck, { rows: 10, seed: 8, w: 1024, h: 1024 }), [3, 3]);
    deckTex.rotation = Math.PI / 2;
    G.add(mesh(box(DK * 2, 1.5, DK * 2), [M(P.deckEdge), M(P.deckEdge), M('#ffffff', { map: deckTex, roughness: 0.75 }), M(P.deckEdge), M(P.deckEdge), M(P.deckEdge)], 0, FLOOR - 0.75, 0));
    // коврик-«половик» под столом
    G.add(mesh(new THREE.CircleGeometry(30, 64), M('#ffffff', { map: rugTex(P.rug), roughness: 1 }), 0, FLOOR + 0.05, 0, { rx: -Math.PI / 2, cast: false }));
    // перила и столбики
    const rail = M(P.rail, { roughness: 0.6 });
    const rails = new THREE.Group();
    const balG = box(1, 14, 1);
    for (const side of [0, 1, 2, 3]) {
      const grp = new THREE.Group();
      for (let x = -DK + 3; x <= DK - 3; x += 4.2) {
        if (side === 3 && Math.abs(x) < 9) continue; // проход к ступенькам
        grp.add(mesh(balG, rail, x, FLOOR + 7, DK - 1.2));
      }
      grp.add(mesh(box(DK * 2, 1.4, 2.2), rail, 0, FLOOR + 14.6, DK - 1.2));
      grp.rotation.y = (side * Math.PI) / 2;
      rails.add(grp);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) rails.add(mesh(box(3.4, 80, 3.4), rail, sx * (DK - 1.2), FLOOR + 40, sz * (DK - 1.2)));
    G.add(rails);
    // скамейки вдоль длинных сторон
    const bench = (z, ry) => {
      const b = new THREE.Group();
      const wm = M(P.bench, { roughness: 0.6 });
      b.add(mesh(box(34, 1.2, 8), wm, 0, -12, 0));
      for (const sx of [-1, 1]) b.add(mesh(box(1.4, 17.4, 6.4), wm, sx * 14, -21.3, 0));
      b.add(mesh(box(30, 1, 1), wm, 0, -24, 0));
      b.position.z = z;
      b.rotation.y = ry;
      return b;
    };
    G.add(bench(-22, 0), bench(22, Math.PI));
    // кот спит на дальней скамейке
    G.add(cat(P.cat, -9, -11.4, -22.5, 0.4));
    // самовар на табурете слева
    const stool = new THREE.Group();
    const sm = M(P.bench, { roughness: 0.6 });
    stool.add(mesh(new THREE.CylinderGeometry(5, 5, 1.2, 24), sm, 0, -10, 0));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      stool.add(mesh(box(1, 19, 1), sm, Math.cos(a) * 3.4, -20, Math.sin(a) * 3.4));
    }
    stool.add(samovar());
    stool.position.set(-36, 0, -16);
    stool.scale.setScalar(0.85);
    G.add(stool);
    // горшки с геранью по углам веранды
    for (const [x, z] of [[-44, -44], [44, -44], [44, 40], [-44, 40]]) G.add(flowerPot(x, z, P));
    // лейка, корзина с яблоками
    G.add(wateringCan(30, -38, P));
    G.add(appleBasket(-34, 26, P));
    // мягкие тени-пятна под предметами
    for (const [x, z, s] of [[-36, -16, 12], [-9, -22.5, 9], [30, -38, 8], [-34, 26, 10]]) {
      const b = mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ map: this.blob, transparent: true, depthWrite: false }), x, FLOOR + 0.12, z, { rx: -Math.PI / 2, cast: false, recv: false });
      G.add(b);
    }
    // сад вокруг: деревья, кусты, забор, подсолнухи
    G.add(garden(P, this));
    // тень от листвы на столе и полу
    if (P.dapple) {
      const dt = TX.dapple();
      const dm = new THREE.MeshBasicMaterial({ map: dt, transparent: true, depthWrite: false, opacity: P.dapple });
      dt.repeat.set(2, 2);
      const dp = mesh(new THREE.PlaneGeometry(90, 90), dm, 0, 0.05, 0, { rx: -Math.PI / 2, cast: false, recv: false });
      dp.renderOrder = 1;
      const dp2 = mesh(new THREE.PlaneGeometry(140, 140), dm, 0, FLOOR + 0.1, 0, { rx: -Math.PI / 2, cast: false, recv: false });
      G.add(dp2);
      this.tableG.add(dp);
      ticks.push((dt_, t) => {
        dt.offset.set(Math.sin(t * 0.25) * 0.012, Math.cos(t * 0.31) * 0.01);
      });
    }
    // пар над чаем
    G.add(this._steam(ticks, P));
    // гирлянда по перилам, фонарь над столом
    if (P.garland) G.add(garland(DK, this.glow, ticks));
    if (P.fireflies) G.add(fireflies(this.glow, ticks));
    if (P.snow) G.add(snowfall(this.glow, ticks));
    if (P.leaves) G.add(fallingLeaves(ticks));
    if (P.extras) P.extras(G, this);
    this.envTick = (dt, t) => ticks.forEach((f) => f(dt, t));
  }

  _steam(ticks, P) {
    const g = new THREE.Group();
    const c = this.cupPos || new THREE.Vector3(12, 0, -9);
    const mats = [];
    for (let i = 0; i < 5; i++) {
      const m = new THREE.SpriteMaterial({ map: this.glow, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
      const s = new THREE.Sprite(m);
      s.userData.ph = i / 5;
      g.add(s);
      mats.push(s);
    }
    ticks.push((dt, t) => {
      for (const s of mats) {
        const ph = (t * 0.25 + s.userData.ph) % 1;
        s.position.set(c.x + Math.sin(ph * 6 + s.userData.ph * 9) * 0.6, 2.6 + ph * 7, c.z + Math.cos(ph * 5) * 0.4);
        s.scale.setScalar(1.2 + ph * 3);
        s.material.opacity = Math.sin(ph * Math.PI) * (P.steam || 0.22);
      }
    });
    return g;
  }
}

// ---------- внешний вид мест ----------
const PLACE_LOOK = {
  summer: {
    sky: '#bfe3f2',
    hemi: ['#e6f3ff', '#9a7a52', 1.25],
    sun: ['#fff1d6', 2.5],
    lamp: 0,
    grass: { base: '#67a540', flowers: 1.4, seed: 2 },
    deck: '#c79a64',
    deckEdge: '#8e6238',
    rug: ['#d9534f', '#f2c14e', '#5aa0d8', '#f7f2e6'],
    rail: '#f4efe4',
    bench: '#a8794a',
    cat: '#e8964a',
    dapple: 0.38,
    tree: '#5b9a3a',
    steam: 0.22,
  },
  evening: {
    sky: '#2a3460',
    hemi: ['#5b6aa8', '#3a2a28', 0.75],
    sun: ['#ffb27a', 0.55],
    lamp: 900,
    exposure: 1.15,
    grass: { base: '#3e6a34', flowers: 0.6, seed: 2 },
    deck: '#b48a5a',
    deckEdge: '#6e4a2a',
    rug: ['#c2453f', '#e8b545', '#4a78b8', '#efe6d4'],
    rail: '#e8e0d0',
    bench: '#97683c',
    cat: '#8a8a92',
    garland: true,
    fireflies: true,
    tree: '#2f5a32',
    steam: 0.28,
  },
  autumn: {
    sky: '#f2dcb8',
    hemi: ['#fff0dc', '#8a5a30', 1.2],
    sun: ['#ffd7a0', 2.3],
    lamp: 0,
    grass: { base: '#8f8a3c', flowers: 0.15, leaves: 260, seed: 4 },
    deck: '#c28d58',
    deckEdge: '#87592f',
    rug: ['#b5523a', '#e3a33c', '#6d8a3a', '#f3e8d2'],
    rail: '#f3ece0',
    bench: '#9b6a3e',
    cat: '#3a3532',
    dapple: 0.3,
    leaves: true,
    tree: '#e08a2a',
    steam: 0.3,
    pumpkins: true,
  },
  winter: {
    sky: '#c9d8ea',
    hemi: ['#e8f0ff', '#8090a8', 1.05],
    sun: ['#fff4e6', 1.4],
    lamp: 600,
    grass: { base: '#eef3f8', flowers: 0, seed: 6, snow: true },
    deck: '#b88c5c',
    deckEdge: '#7a5634',
    rug: ['#c73e3a', '#f2f2f2', '#2f6e4a', '#e9dfc9'],
    rail: '#f6f2ea',
    bench: '#8f633a',
    cat: '#f0ede6',
    garland: true,
    snow: true,
    tree: '#2e5a3e',
    steam: 0.4,
    winter: true,
  },
};

function clear(g) {
  for (const c of [...g.children]) {
    g.remove(c);
    c.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    });
  }
}

function walnutTex() {
  const c = TX.planks('#6b3e22', { rows: 6, seed: 11, dark: 0.3, gap: 'rgba(20,10,4,0.4)' });
  const t = TX.tex(c, [1, 1]);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// круглый вязаный половик из колец
function rugTex(cols) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const n = 14;
  for (let i = n; i > 0; i--) {
    g.beginPath();
    g.arc(256, 256, (i / n) * 254, 0, Math.PI * 2);
    g.fillStyle = cols[i % cols.length];
    g.fill();
  }
  // «вязка»
  g.strokeStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 400; i++) {
    const a = Math.random() * Math.PI * 2,
      r = Math.random() * 250;
    g.beginPath();
    g.arc(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 3, 0, Math.PI);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function cat(col, x, y, z, ry) {
  const g = new THREE.Group();
  const m = M(col, { roughness: 0.9 });
  const body = mesh(new THREE.SphereGeometry(3, 20, 14), m, 0, 1.6, 0);
  body.scale.set(1.25, 0.62, 0.95);
  g.add(body);
  const head = mesh(new THREE.SphereGeometry(1.7, 18, 14), m, 3.2, 1.7, 1.1);
  head.scale.set(1, 0.85, 1);
  g.add(head);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.6, 1.2, 4), m, 3.4 + s * 0.2, 3.0, 1.1 + s * 0.85, { rz: -0.2, rx: s * 0.35 });
    g.add(ear);
  }
  // закрытые глазки
  const eye = M('#3a2a20');
  for (const s of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.28, 0.07, 4, 8, Math.PI), eye, 4.55, 1.9, 1.1 + s * 0.6, { ry: Math.PI / 2, rz: Math.PI }));
  g.add(mesh(new THREE.SphereGeometry(0.18, 8, 6), M('#e88a9a'), 4.85, 1.55, 1.1));
  // хвост
  const tail = mesh(new THREE.TorusGeometry(2.6, 0.5, 8, 20, Math.PI * 1.1), m, -0.2, 0.7, 0.4, { rx: Math.PI / 2, rz: 1.8 });
  g.add(tail);
  // полоски
  if (col === '#e8964a') {
    const st = M('#c8702e', { roughness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const s = mesh(new THREE.TorusGeometry(2.6, 0.22, 4, 16, Math.PI), st, -1.5 + i * 1.3, 1.5, 0, { ry: Math.PI / 2 });
      s.scale.set(0.95, 0.62, 1);
      g.add(s);
    }
  }
  g.position.set(x, y, z);
  g.rotation.y = ry;
  g.userData.breath = body;
  return g;
}

function samovar() {
  const g = new THREE.Group();
  const brass = M('#d9a441', { metalness: 0.85, roughness: 0.28 });
  const dark = M('#3a2a1e', { roughness: 0.5 });
  g.add(mesh(lathe([[0, 0], [2.6, 0], [2.6, 0.6], [1.6, 1.2], [1.4, 2.4], [2.2, 2.8]]), brass, 0, -9.4, 0));
  g.add(mesh(lathe([[0, 0], [2.4, 0], [3.8, 1.4], [4.2, 4], [3.9, 6.4], [2.6, 7.4], [1.6, 7.8], [0, 7.8]], 40), brass, 0, -6.6, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.9, 1.2, 1.6, 16), brass, 0, 2, 0));
  // чайник сверху
  g.add(mesh(lathe([[0, 0], [1.6, 0], [2.2, 1.2], [1.8, 2.4], [0.5, 2.8], [0.6, 3.2], [0, 3.3]]), M('#ffffff', { roughness: 0.25 }), 0, 2.8, 0));
  // ручки
  for (const s of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(1, 0.22, 8, 16, Math.PI), dark, s * 4.3, -1.4, 0, { rz: s > 0 ? -Math.PI / 2 : Math.PI / 2 }));
  // краник
  g.add(mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 8), brass, 0, -5, 4.4, { rx: Math.PI / 2.4 }));
  g.add(mesh(box(0.8, 0.5, 0.5), dark, 0, -4.2, 4.8));
  // медали
  for (let i = 0; i < 3; i++) g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.15, 16), M('#f2d27a', { metalness: 0.9, roughness: 0.2 }), -1.2 + i * 1.2, -1.2, 4.05, { rx: Math.PI / 2 - 0.15 }));
  g.position.y = 0.2;
  return g;
}

function flowerPot(x, z, P) {
  const g = new THREE.Group();
  g.add(mesh(lathe([[0, 0], [2.6, 0], [3.4, 5], [3.7, 5.3], [3.7, 6], [0, 6]]), M('#c4683e', { roughness: 0.8 })));
  g.add(mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.4, 20), M('#5a3a24'), 0, 5.7, 0));
  if (P.winter) {
    g.add(mesh(new THREE.SphereGeometry(3.2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M('#ffffff', { roughness: 1 }), 0, 5.8, 0));
  } else {
    const leaf = M(P.pumpkins ? '#7a8a3a' : '#4f9a3c', { roughness: 0.9 });
    const fl = M(P.pumpkins ? '#e8a23a' : '#e2384a', { roughness: 0.7 });
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      g.add(mesh(new THREE.SphereGeometry(1.8, 10, 8), leaf, Math.cos(a) * 1.8, 7 + (i % 2), Math.sin(a) * 1.8, { s: 0.9 }));
    }
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3 + 0.5;
      g.add(mesh(new THREE.SphereGeometry(1.1, 10, 8), fl, Math.cos(a) * 1.4, 9.4 + (i % 2) * 0.6, Math.sin(a) * 1.4));
    }
  }
  g.position.set(x, FLOOR, z);
  return g;
}

function wateringCan(x, z, P) {
  const g = new THREE.Group();
  const m = M(P.winter ? '#8fa7b8' : '#5fa3c8', { metalness: 0.4, roughness: 0.4 });
  g.add(mesh(new THREE.CylinderGeometry(3, 3.4, 6.5, 20), m, 0, 3.25, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.45, 0.6, 7, 10), m, 4.2, 4.4, 0, { rz: -0.9 }));
  g.add(mesh(new THREE.CylinderGeometry(1, 0.6, 1, 12), m, 6.8, 6.6, 0, { rz: -0.9 }));
  g.add(mesh(new THREE.TorusGeometry(2.4, 0.35, 8, 16, Math.PI), m, -0.2, 6.6, 0));
  g.position.set(x, FLOOR, z);
  g.rotation.y = 2.4;
  return g;
}

function appleBasket(x, z, P) {
  const g = new THREE.Group();
  g.add(mesh(lathe([[0, 0], [4, 0], [5, 4], [5.2, 4.4], [0, 4.4]]), M('#b07a3e', { roughness: 0.9 })));
  g.add(mesh(new THREE.TorusGeometry(4.6, 0.3, 6, 24, Math.PI), M('#8a5a2a'), 0, 4.4, 0));
  const col = P.winter ? '#e85a3a' : P.pumpkins ? '#e8b83a' : '#d8383c';
  const am = M(col, { roughness: 0.45 });
  const gm = M('#7ab84a', { roughness: 0.45 });
  for (let i = 0; i < 9; i++) {
    const a = i * 2.2,
      r = i === 0 ? 0 : 2.5;
    g.add(mesh(new THREE.SphereGeometry(1.4, 14, 10), i % 3 === 2 ? gm : am, Math.cos(a) * r, 4.6 + (i % 2) * 0.6, Math.sin(a) * r));
  }
  g.position.set(x, FLOOR, z);
  return g;
}

function garden(P, S) {
  const g = new THREE.Group();
  const trunk = M('#6b4a32', { roughness: 0.9 });
  const leaf = M(P.tree, { roughness: 0.9 });
  // деревья за верандой
  const trees = [[-90, -95], [70, -110], [-130, 10], [120, -20], [-60, -150], [20, -170], [140, 60], [-140, 90]];
  trees.forEach(([x, z], i) => {
    g.add(mesh(new THREE.CylinderGeometry(2.6, 3.6, 40, 10), trunk, x, GROUND + 20, z));
    if (P.winter) {
      // ёлки
      for (let k = 0; k < 4; k++) g.add(mesh(new THREE.ConeGeometry(18 - k * 3.6, 16, 10), leaf, x, GROUND + 26 + k * 9, z));
      for (let k = 0; k < 4; k++) g.add(mesh(new THREE.ConeGeometry(14 - k * 3.4, 4, 10), M('#ffffff'), x, GROUND + 31 + k * 9, z));
    } else {
      for (let k = 0; k < 5; k++) {
        const a = k * 1.7 + i;
        g.add(mesh(new THREE.IcosahedronGeometry(13 - (k % 2) * 3, 1), leaf, x + Math.cos(a) * 9, GROUND + 46 + (k % 3) * 6, z + Math.sin(a) * 9));
      }
      if (!P.pumpkins) for (let k = 0; k < 8; k++) g.add(mesh(new THREE.SphereGeometry(1.4, 8, 6), M('#d8383c'), x + Math.cos(k) * 14, GROUND + 42 + (k % 3) * 5, z + Math.sin(k) * 14));
    }
  });
  // штакетник
  const fm = M(P.winter ? '#e8e2d6' : '#f2ead8', { roughness: 0.8 });
  const pk = box(3, 16, 0.8);
  const fence = new THREE.InstancedMesh(pk, fm, 400);
  const o = new THREE.Object3D();
  let n = 0;
  const R = 200;
  for (let x = -R; x <= R; x += 5) {
    for (const [px, pz, ry] of [[x, -R, 0], [x, R, 0], [-R, x, Math.PI / 2], [R, x, Math.PI / 2]]) {
      if (n >= 400) break;
      o.position.set(px, GROUND + 8, pz);
      o.rotation.set(0, ry, 0);
      o.updateMatrix();
      fence.setMatrixAt(n++, o.matrix);
    }
  }
  fence.count = n;
  fence.castShadow = true;
  g.add(fence);
  // грядки и кусты у веранды
  const bush = M(P.winter ? '#e9eef4' : P.pumpkins ? '#b8742e' : '#4f9a3c', { roughness: 0.9 });
  const flowers = ['#ff6b8a', '#ffd34a', '#ffffff', '#b78cff'];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const r = 66 + (i % 3) * 6;
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    g.add(mesh(new THREE.IcosahedronGeometry(5 + (i % 3), 1), bush, x, GROUND + 3, z));
    if (!P.winter && !P.pumpkins) for (let k = 0; k < 3; k++) g.add(mesh(new THREE.SphereGeometry(1, 8, 6), M(flowers[(i + k) % 4]), x + Math.cos(k * 2) * 3.5, GROUND + 6.5, z + Math.sin(k * 2) * 3.5));
  }
  // подсолнухи летом, тыквы осенью, снеговик зимой
  if (P === PLACE_LOOK.summer || P === PLACE_LOOK.evening) {
    for (let i = 0; i < 7; i++) {
      const x = -60 + i * 14,
        z = -84 - (i % 2) * 6;
      g.add(mesh(new THREE.CylinderGeometry(0.6, 0.8, 34, 6), M('#5a8a34'), x, GROUND + 17, z));
      const head = new THREE.Group();
      head.add(mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.8, 16), M('#f2c230'), 0, 0, 0));
      head.add(mesh(new THREE.CylinderGeometry(2.4, 2.4, 1, 16), M('#5a3a1e'), 0, 0.4, 0));
      head.position.set(x, GROUND + 34, z);
      head.rotation.x = 1.0;
      g.add(head);
    }
  }
  if (P.pumpkins) {
    const pm = M('#e57a1e', { roughness: 0.6 });
    for (const [x, z, s] of [[-40, 48, 1], [-30, 50, 0.7], [46, 10, 0.9], [60, -60, 1.2], [-62, -30, 1]]) {
      const p = mesh(new THREE.SphereGeometry(4 * s, 16, 12), pm, x, x > -45 && x < 50 && Math.abs(z) < 52 ? FLOOR + 3 * s : GROUND + 3 * s, z);
      p.scale.y = 0.72;
      g.add(p);
      g.add(mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.6, 6), M('#5a7a2a'), x, (x > -45 && x < 50 && Math.abs(z) < 52 ? FLOOR : GROUND) + 6 * s, z));
    }
  }
  if (P.winter) {
    const sw = M('#ffffff', { roughness: 0.95 });
    const sm = new THREE.Group();
    sm.add(mesh(new THREE.SphereGeometry(8, 16, 12), sw, 0, 7, 0), mesh(new THREE.SphereGeometry(5.8, 16, 12), sw, 0, 18, 0), mesh(new THREE.SphereGeometry(4, 16, 12), sw, 0, 26.5, 0));
    sm.add(mesh(new THREE.ConeGeometry(0.7, 4, 8), M('#f07a2a'), 0, 26.5, 3.8, { rx: Math.PI / 2 }));
    sm.add(mesh(new THREE.CylinderGeometry(3, 3.4, 3, 12), M('#c73e3a'), 0, 30.4, 0));
    for (const s of [-1, 1]) sm.add(mesh(new THREE.SphereGeometry(0.5, 8, 6), M('#222'), s * 1.4, 27.6, 3.4));
    sm.position.set(72, GROUND, -40);
    sm.rotation.y = -0.8;
    g.add(sm);
    // снег на перилах
    const sn = M('#ffffff', { roughness: 1 });
    for (let s = 0; s < 4; s++) {
      const b = mesh(box(108, 0.9, 2.6), sn, 0, FLOOR + 15.7, 52.8);
      const grp = new THREE.Group();
      grp.add(b);
      grp.rotation.y = (s * Math.PI) / 2;
      g.add(grp);
    }
    // валенки у скамейки
    const vm = M('#5a5450', { roughness: 1 });
    for (const s of [0, 1]) {
      const v = new THREE.Group();
      v.add(mesh(box(2.4, 8, 2.6), vm, 0, 4, 0), mesh(box(2.4, 2.4, 5.2), vm, 0, 1.2, 1.3));
      v.position.set(14 + s * 3.4, FLOOR, 30);
      v.rotation.y = 0.2 * (s ? 1 : -1);
      g.add(v);
    }
  }
  return g;
}

// гирлянда с тёплыми огоньками по перилам
function garland(DK, glow, ticks) {
  const g = new THREE.Group();
  const cols = ['#ffd27a', '#ff8a6a', '#8ad0ff', '#b8ff8a', '#ffb0e0'];
  const bulbs = [];
  const y0 = -30 + 26;
  for (let s = 0; s < 4; s++) {
    const grp = new THREE.Group();
    const wire = [];
    for (let i = 0; i <= 20; i++) {
      const x = -DK + (i / 20) * DK * 2;
      const y = y0 - Math.sin((i / 20) * Math.PI * 4) ** 2 * 3;
      wire.push(new THREE.Vector3(x, y, DK - 1.2));
      if (i % 1 === 0 && i < 20) {
        const c = cols[(i + s) % cols.length];
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), new THREE.MeshBasicMaterial({ color: c }));
        b.position.set(x + DK / 20, y - 1, DK - 1.2);
        grp.add(b);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: c, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
        sp.position.copy(b.position);
        sp.scale.setScalar(5);
        grp.add(sp);
        bulbs.push(sp);
      }
    }
    const curve = new THREE.CatmullRomCurve3(wire);
    grp.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.12, 4), new THREE.MeshBasicMaterial({ color: '#2a2a2a' })));
    grp.rotation.y = (s * Math.PI) / 2;
    g.add(grp);
  }
  ticks.push((dt, t) => bulbs.forEach((b, i) => (b.material.opacity = 0.55 + 0.35 * Math.sin(t * 1.5 + i * 1.7))));
  return g;
}

function fireflies(glow, ticks) {
  const g = new THREE.Group();
  const fl = [];
  for (let i = 0; i < 40; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#d8ff7a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    const a = Math.random() * Math.PI * 2,
      r = 60 + Math.random() * 90;
    s.userData = { x: Math.cos(a) * r, z: Math.sin(a) * r, y: -20 + Math.random() * 20, p: Math.random() * 10 };
    s.scale.setScalar(2.4);
    g.add(s);
    fl.push(s);
  }
  ticks.push((dt, t) => {
    for (const s of fl) {
      const u = s.userData;
      s.position.set(u.x + Math.sin(t * 0.3 + u.p) * 6, u.y + Math.sin(t * 0.7 + u.p * 2) * 3, u.z + Math.cos(t * 0.25 + u.p) * 6);
      s.material.opacity = Math.max(0, Math.sin(t * 1.3 + u.p * 3)) * 0.9;
    }
  });
  return g;
}

function snowfall(glow, ticks) {
  const n = 500;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 300;
    pos[i * 3 + 1] = Math.random() * 120 - 30;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 300;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: glow, color: '#ffffff', size: 1.6, transparent: true, depthWrite: false, opacity: 0.9 }));
  ticks.push((dt, t) => {
    for (let i = 0; i < n; i++) {
      let y = pos[i * 3 + 1] - dt * 6;
      // под крышей беседки снег не идёт
      if (y < -32) y += 150;
      pos[i * 3 + 1] = y;
      pos[i * 3] += Math.sin(t + i) * dt * 1.5;
      const inside = Math.abs(pos[i * 3]) < 56 && Math.abs(pos[i * 3 + 2]) < 56 && y > -32;
      if (inside) pos[i * 3 + 1] = -40;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return pts;
}

function fallingLeaves(ticks) {
  const g = new THREE.Group();
  const cols = ['#e2741f', '#f2b13a', '#c4441e', '#e8c04a'];
  const geo = new THREE.PlaneGeometry(2, 1.2);
  const lv = [];
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: cols[i % 4], side: THREE.DoubleSide, roughness: 0.8 }));
    const reset = (first) => {
      const a = Math.random() * Math.PI * 2,
        r = 60 + Math.random() * 80;
      m.userData = { x: Math.cos(a) * r, z: Math.sin(a) * r, y: first ? Math.random() * 60 : 60, p: Math.random() * 10, v: 3 + Math.random() * 3 };
    };
    reset(true);
    m.userData.reset = reset;
    g.add(m);
    lv.push(m);
  }
  ticks.push((dt, t) => {
    for (const m of lv) {
      const u = m.userData;
      u.y -= u.v * dt;
      if (u.y < GROUND + 0.5) {
        const r = u.reset;
        r(false);
        u.reset = r;
      }
      m.position.set(u.x + Math.sin(t * 0.8 + u.p) * 5, u.y, u.z + Math.cos(t * 0.6 + u.p) * 4);
      m.rotation.set(t * 1.3 + u.p, t * 0.7, Math.sin(t + u.p));
    }
  });
  return g;
}
