// 3D-сцена: поле, фишки, дома, кубики, метки владельцев, камера
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { paintBoard, cellGeo, S, C, W, BAND, DECKS } from './board.js';
import { makeToken, makeHouse, makeHotel, makeDie, dieQuat, makeDeck } from './models.js';
import { paintBackground } from './backgrounds.js';
import { t } from './i18n.js';

const TH = 0.5; // толщина поля
const DBG = window.__MG_DEBUG || {};

export class Scene3D {
  constructor(canvas) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!DBG.promo });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setClearColor(0x000000, 0);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.r = r;
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(r);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    this.cam = new THREE.PerspectiveCamera(32, 1, 0.5, 400);
    this.t = 0;
    // камера: точка, расстояние, наклон от вертикали, поворот вокруг поля
    this.view = { x: 0, z: 0, dist: 50, tilt: 0.62, yaw: 0 };
    this.goal = { ...this.view };
    this.region = { x0: 0, y0: 0, x1: 1, y1: 1 }; // свободная от интерфейса часть экрана (доли)
    this.hemi = new THREE.HemisphereLight('#fff6e6', '#6a6a7a', 1.1);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff1dc', 2.2);
    this.sun.position.set(-14, 30, 12);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.left = -19;
    sc.right = 19;
    sc.top = 19;
    sc.bottom = -19;
    sc.near = 5;
    sc.far = 80;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun, this.sun.target);
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.buildBoard();
    this.tokens = [];
    this.buildings = {}; // клетка -> { group, style, n }
    this.marks = {}; // клетка -> метка владельца
    this.dice = [makeDie(), makeDie()];
    this.dice.forEach((d) => {
      d.visible = false;
      this.world.add(d);
    });
    this.anims = [];
    this.resize();
  }

  buildBoard() {
    const tex = new THREE.CanvasTexture(paintBoard());
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.r.capabilities.getMaxAnisotropy();
    this.boardTex = tex;
    const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62 });
    const side = new THREE.MeshStandardMaterial({ color: '#7a1f22', roughness: 0.5, metalness: 0.1 });
    const bot = new THREE.MeshStandardMaterial({ color: '#3a1012' });
    const b = new THREE.Mesh(new THREE.BoxGeometry(S, TH, S), [side, side, top, bot, side, side]);
    b.position.y = -TH / 2;
    b.receiveShadow = true;
    b.castShadow = true;
    this.boardMesh = b;
    this.world.add(b);
    // золотая окантовка
    const trim = new THREE.MeshStandardMaterial({ color: '#d9b25a', metalness: 0.9, roughness: 0.3 });
    for (const [w, d, x, z] of [[S + 0.24, 0.12, 0, S / 2 + 0.06], [S + 0.24, 0.12, 0, -S / 2 - 0.06], [0.12, S, S / 2 + 0.06, 0], [0.12, S, -S / 2 - 0.06, 0]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), trim);
      m.position.set(x, -0.02, z);
      m.castShadow = true;
      this.world.add(m);
    }
    // плинтус под полем — тень на фоне
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.38 }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = -TH - 0.6;
    sh.receiveShadow = true;
    this.world.add(sh);
    // мягкое пятно под полем
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 20, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,.5)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(S * 1.6, S * 1.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = -TH - 0.62;
    this.world.add(blob);
    // колоды
    this.decks = {};
    for (const k of ['chance', 'chest']) {
      const d = makeDeck(k, t(k));
      const p = DECKS[k];
      d.position.set(p.x, 0.16, p.z);
      d.rotation.y = p.rot;
      this.decks[k] = d;
      this.world.add(d);
    }
    // подсветка клетки
    this.hl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#fff6a0', transparent: true, opacity: 0, depthWrite: false }));
    this.hl.rotation.x = -Math.PI / 2;
    this.hl.position.y = 0.012;
    this.world.add(this.hl);
    this.hlCell = -1;
  }

  // перерисовать поле (после смены языка) — названия на клетках
  repaintBoard() {
    this.boardTex.image = paintBoard();
    this.boardTex.needsUpdate = true;
  }

  setBackground(place) {
    this.place = place;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = window.innerWidth * dpr,
      h = window.innerHeight * dpr;
    const c = paintBackground(place, w, h);
    const url = c.toDataURL('image/jpeg', 0.9);
    document.body.style.backgroundImage = `url(${url})`;
    document.body.style.backgroundSize = '100% 100%';
    this._bgSize = [window.innerWidth, window.innerHeight];
  }

  resize() {
    const w = window.innerWidth,
      h = window.innerHeight;
    this.r.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
    if (this.place && this._bgSize && (Math.abs(this._bgSize[0] - w) > 40 || Math.abs(this._bgSize[1] - h) > 40)) {
      clearTimeout(this._bgT);
      this._bgT = setTimeout(() => this.setBackground(this.place), 250);
    }
  }

  // ---------- фишки ----------
  setTokens(list) {
    for (const tk of this.tokens) this.world.remove(tk);
    this.tokens = list.map((p) => {
      const tk = makeToken(p.token, p.color);
      this.world.add(tk);
      return tk;
    });
  }
  // позиция фишки на клетке с учётом соседей; slot — порядковый номер среди стоящих там
  tokenSpot(i, slot, n, jailed) {
    const g = cellGeo(i);
    let x = g.x,
      z = g.z;
    if (i === 10) {
      // тюрьма: внутри квадрата (к центру), гости — по краю
      if (jailed) {
        x += 0.55;
        z -= 0.55;
      } else {
        x -= 0.95;
        z += 0.95;
      }
    } else if (!g.corner) {
      // ближе к внешнему краю, подальше от домов
      x -= g.in[0] * 0.45;
      z -= g.in[1] * 0.45;
    }
    if (n > 1) {
      const off = [[-0.42, -0.42], [0.42, 0.42], [0.42, -0.42], [-0.42, 0.42]][slot % 4];
      const k = g.corner ? 1.2 : 0.9;
      x += off[0] * k * (i === 10 && !jailed ? 0.6 : 1);
      z += off[1] * k * (i === 10 && !jailed ? 0.6 : 1);
    }
    return new THREE.Vector3(x, 0, z);
  }
  faceToken(tk, i) {
    const g = cellGeo(i);
    tk.rotation.y = Math.atan2(-g.al[1], g.al[0]);
  }

  // ---------- постройки ----------
  setBuildings(i, n, style, anim = false) {
    let b = this.buildings[i];
    if (b && b.style === style && b.n === n) return;
    if (b) this.world.remove(b.group);
    delete this.buildings[i];
    if (!n) return;
    const g = cellGeo(i);
    const grp = new THREE.Group();
    // центр цветной полосы
    const cx = g.x + g.in[0] * (C / 2 - BAND / 2),
      cz = g.z + g.in[1] * (C / 2 - BAND / 2);
    grp.position.set(cx, 0, cz);
    grp.rotation.y = Math.atan2(-g.al[1], g.al[0]);
    if (n === 5) {
      grp.add(makeHotel(style));
    } else {
      for (let k = 0; k < n; k++) {
        const h = makeHouse(style);
        h.position.x = (k - (n - 1) / 2) * 0.44;
        grp.add(h);
      }
    }
    this.world.add(grp);
    this.buildings[i] = { group: grp, style, n };
    if (anim) {
      grp.scale.setScalar(0.01);
      this.anim(0.45, (k) => {
        const e = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
        grp.scale.setScalar(Math.max(0.01, e));
      });
    }
  }

  // метка владельца: цветная плашка у внешнего края; залог — серая штриховка
  setMark(i, color, mortgaged) {
    let m = this.marks[i];
    if (!color) {
      if (m) this.world.remove(m);
      delete this.marks[i];
      return;
    }
    if (!m) {
      const g = cellGeo(i);
      m = new THREE.Group();
      const plate = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.06, 0.2), new THREE.MeshStandardMaterial({ color, roughness: 0.4 }));
      plate.castShadow = true;
      plate.receiveShadow = true;
      m.add(plate);
      const over = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.96, C * 0.96), mortMat());
      over.rotation.x = -Math.PI / 2;
      m.add(over);
      m.userData = { plate, over };
      m.position.set(g.x - g.in[0] * (C / 2 - 0.16), 0.03, g.z - g.in[1] * (C / 2 - 0.16));
      m.rotation.y = Math.atan2(-g.al[1], g.al[0]);
      // накладка «залог» на всю клетку (локальная +z смотрит к центру поля)
      over.position.set(0, -0.015, C / 2 - 0.16);
      this.world.add(m);
      this.marks[i] = m;
      m.scale.set(0.01, 1, 1);
      this.anim(0.3, (k) => m.scale.set(Math.max(0.01, k), 1, 1));
    }
    m.userData.plate.material.color.set(color);
    m.userData.over.visible = !!mortgaged;
  }

  highlight(i) {
    this.hlCell = i;
    if (i < 0) return;
    const g = cellGeo(i);
    const w = g.corner ? C : W;
    this.hl.position.x = g.x;
    this.hl.position.z = g.z;
    this.hl.rotation.z = g.side % 2 ? Math.PI / 2 : 0;
    this.hl.scale.set(w * 0.98, C * 0.98, 1);
  }

  // ---------- кубики ----------
  // бросок: кубики вылетают от края поля и катятся к центру, останавливаясь на значениях
  async rollDice(a, b, wait) {
    const from = [new THREE.Vector3(-5, 3.5, 7.5), new THREE.Vector3(-3.8, 4, 8.5)];
    const to = [new THREE.Vector3(-1.0 + Math.random() * 0.6, 0.45, 1.6 + Math.random() * 0.8), new THREE.Vector3(0.6 + Math.random() * 0.6, 0.45, 0.8 + Math.random() * 0.8)];
    const vals = [a, b];
    const spins = this.dice.map(() => new THREE.Vector3(Math.random() * 14 + 8, Math.random() * 10, Math.random() * 14 + 8));
    const finalQ = vals.map((v) => dieQuat(v, Math.random() * 0.8 - 0.4));
    this.dice.forEach((d, k) => {
      d.visible = true;
      d.position.copy(from[k]);
    });
    const E = new THREE.Euler();
    const Qs = new THREE.Quaternion();
    await this.anim(1.0, (k) => {
      this.dice.forEach((d, j) => {
        const e = 1 - Math.pow(1 - k, 2.2);
        d.position.lerpVectors(from[j], to[j], e);
        // подпрыгивания
        const hop = Math.abs(Math.sin(e * Math.PI * 2.5)) * (1 - e) * 1.6;
        d.position.y = 0.45 + hop + (1 - e) * 1.2;
        const rem = 1 - e;
        E.set(spins[j].x * rem, spins[j].y * rem, spins[j].z * rem);
        Qs.setFromEuler(E);
        d.quaternion.copy(finalQ[j]).multiply(Qs);
      });
    });
    this.dice.forEach((d, j) => d.quaternion.copy(finalQ[j]));
  }
  hideDice() {
    this.dice.forEach((d) => (d.visible = false));
  }

  // ---------- анимация ----------
  anim(dur, fn) {
    return new Promise((res) => this.anims.push({ t: 0, dur, fn, res }));
  }

  // ---------- камера ----------
  setRegion(m) {
    this.region = m;
  }
  // обзор всего поля
  overview(instant = false) {
    if (this.free) {
      if (!instant) return;
      this.free = false;
    }
    const tilt = this.portrait() ? 0.5 : 0.62;
    this.goal = { x: 0, z: 0, tilt, yaw: 0, dist: 0, follow: false };
    this.goal.dist = this.fitDist(this.goal, S / 2 + 0.3);
    if (instant) this.view = { ...this.goal };
  }
  // свободная камера: игрок крутит и приближает поле сам
  setFree() {
    if (this.free) return;
    this.free = true;
    this.goal = { ...this.view, follow: false };
    if (this.onFree) this.onFree(true);
  }
  userRotate(dx, dy) {
    this.setFree();
    this.goal.yaw -= dx * 0.007;
    this.goal.tilt = Math.max(0.2, Math.min(1.35, this.goal.tilt - dy * 0.005));
  }
  userZoom(k) {
    this.setFree();
    this.goal.dist = Math.max(9, Math.min(90, this.goal.dist * k));
  }
  portrait() {
    return window.innerHeight > window.innerWidth * 1.1;
  }
  // подлёт к клетке: камера поворачивается к стороне поля, где стоит фишка
  focus(i, zoom = 1) {
    if (this.free) return;
    const g = cellGeo(i);
    const yaw = [0, -Math.PI / 2, Math.PI, Math.PI / 2][g.side];
    let dy = yaw - this.view.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    const k = 0.5;
    const goal = { x: g.x * k, z: g.z * k, tilt: this.portrait() ? 0.5 : 0.72, yaw: this.view.yaw + dy, follow: true };
    // всё поле (с запасом) вписывается в экран, а ближняя сторона крупнее
    goal.dist = this.fitDist(goal, S / 2 - 1.5) * zoom;
    this.goal = goal;
  }
  // камера по параметрам вида
  placeCam(cam, v) {
    const R = this.region;
    const W0 = window.innerWidth,
      H0 = window.innerHeight;
    const cx = ((R.x0 + R.x1) / 2) * W0,
      cy = ((R.y0 + R.y1) / 2) * H0;
    cam.aspect = W0 / H0;
    cam.setViewOffset(W0, H0, W0 / 2 - cx, H0 / 2 - cy, W0, H0);
    const st = Math.sin(v.tilt),
      ct = Math.cos(v.tilt);
    cam.position.set(v.x + st * v.dist * Math.sin(v.yaw), ct * v.dist, v.z + st * v.dist * Math.cos(v.yaw));
    cam.lookAt(v.x, 0, v.z);
    cam.updateMatrixWorld();
  }
  // расстояние, при котором квадрат поля с полустороной half целиком в свободной области
  fitDist(v, half) {
    const R = this.region;
    const cam = this._fc || (this._fc = this.cam.clone());
    cam.fov = this.cam.fov;
    const pts = [];
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) for (const y of [0, 1.2]) pts.push(new THREE.Vector3(x * half, y, z * half));
    const P = new THREE.Vector3();
    const fits = (d) => {
      this.placeCam(cam, { ...v, dist: d });
      cam.updateProjectionMatrix();
      for (const p of pts) {
        P.copy(p).project(cam);
        const sx = (P.x + 1) / 2,
          sy = (1 - P.y) / 2;
        if (P.z > 1 || sx < R.x0 || sx > R.x1 || sy < R.y0 || sy > R.y1) return false;
      }
      return true;
    };
    let lo = 8,
      hi = 300;
    for (let k = 0; k < 30; k++) {
      const m = (lo + hi) / 2;
      if (fits(m)) hi = m;
      else lo = m;
    }
    return hi;
  }

  update(dt) {
    this.t += dt;
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i];
      a.t += dt;
      const k = Math.min(1, a.t / a.dur);
      a.fn(k);
      if (k >= 1) {
        this.anims.splice(i, 1);
        a.res();
      }
    }
    const v = this.view,
      g = this.goal;
    const s = 1 - Math.exp(-dt * 3.2);
    for (const k of ['x', 'z', 'dist', 'tilt', 'yaw']) v[k] += (g[k] - v[k]) * s;
    this.hl.material.opacity = this.hlCell >= 0 ? 0.25 + Math.sin(this.t * 5) * 0.15 : 0;
  }

  render() {
    this.placeCam(this.cam, this.view);
    this.cam.updateProjectionMatrix();
    this.r.render(this.scene, this.cam);
  }

  // картинка модели для интерфейса (магазин, выбор фишки)
  snapshot(obj, { size = 160, dist = 2.6, h = 0.45, look = 0.45 } = {}) {
    const sc = new THREE.Scene();
    sc.environment = this.scene.environment;
    sc.add(new THREE.HemisphereLight('#ffffff', '#777788', 1.2));
    const l = new THREE.DirectionalLight('#fff4e0', 2.2);
    l.position.set(-2, 4, 3);
    sc.add(l);
    sc.add(obj);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    cam.position.set(dist * 0.75, h + dist * 0.45, dist * 0.8);
    cam.lookAt(0, look, 0);
    const rt = new THREE.WebGLRenderTarget(size, size, { colorSpace: THREE.SRGBColorSpace });
    const prev = this.r.getRenderTarget();
    this.r.setRenderTarget(rt);
    this.r.setClearColor(0x000000, 0);
    this.r.clear();
    this.r.render(sc, cam);
    const buf = new Uint8Array(size * size * 4);
    this.r.readRenderTargetPixels(rt, 0, 0, size, size, buf);
    this.r.setRenderTarget(prev);
    rt.dispose();
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    for (let y = 0; y < size; y++) img.data.set(buf.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    g.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  // клетка под точкой экрана
  pick(px, py) {
    const ray = new THREE.Raycaster();
    const W0 = window.innerWidth,
      H0 = window.innerHeight;
    ray.setFromCamera(new THREE.Vector2((px / W0) * 2 - 1, -(py / H0) * 2 + 1), this.cam);
    const hit = ray.intersectObject(this.boardMesh)[0];
    if (!hit) return -1;
    const { x, z } = hit.point;
    for (let i = 0; i < 40; i++) {
      const g = cellGeo(i);
      const hw = (g.corner ? C : g.side % 2 ? C : W) / 2,
        hd = (g.corner ? C : g.side % 2 ? W : C) / 2;
      if (Math.abs(x - g.x) <= hw && Math.abs(z - g.z) <= hd) return i;
    }
    return -1;
  }
  // экранная точка над мировой
  toScreen(v) {
    const p = v.clone().project(this.cam);
    return { x: ((p.x + 1) / 2) * window.innerWidth, y: ((1 - p.y) / 2) * window.innerHeight };
  }
}

let _mort = null;
function mortMat() {
  if (_mort) return _mort;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(40,40,50,.45)';
  g.fillRect(0, 0, 128, 64);
  g.strokeStyle = 'rgba(255,255,255,.25)';
  g.lineWidth = 6;
  for (let k = -64; k < 128; k += 18) {
    g.beginPath();
    g.moveTo(k, 64);
    g.lineTo(k + 64, 0);
    g.stroke();
  }
  const tx = new THREE.CanvasTexture(c);
  _mort = new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false });
  return _mort;
}
