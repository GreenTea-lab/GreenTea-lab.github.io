// 3D-мир фермы: рендер, небо, свет, день и ночь, земля с дорожками, постройки, деревья, животные, облака, частицы
import * as THREE from 'three';
import * as M from './models.js';
import { FIELDS, FIELD_W, FIELD_D } from './econ.js';

export const BOUNDS = { x0: -52, x1: 52, z0: -26, z1: 54 };
export const BARN = { x: -8, z: -6 };
export const UNLOAD = { x: -8, z: -0.6, r: 3.4 };
const DAY = 480; // секунд в сутках

function rnd(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export class World {
  constructor(canvas, quality) {
    this.quality = quality;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance', preserveDrawingBuffer: !!window.__TF_DEBUG }));
    r.setPixelRatio(Math.min(devicePixelRatio || 1, quality === 'high' ? 2 : quality === 'mid' ? 1.5 : 1));
    r.shadowMap.enabled = quality !== 'low';
    r.shadowMap.type = THREE.PCFShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    const scene = (this.scene = new THREE.Scene());
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.5, 500);
    scene.fog = new THREE.Fog(0xcfe9ff, 90, 220);

    this.skyU = { top: { value: new THREE.Color(0x7fc4f2) }, bottom: { value: new THREE.Color(0xe6f5ff) }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, glow: { value: new THREE.Color(0xfff0d0) } };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(320, 24, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: this.skyU,
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 glow; varying vec3 vP; void main(){ float h = clamp(vP.y*0.9+0.3,0.0,1.0); vec3 c = mix(bottom, top, pow(h,0.8)); float s = max(dot(normalize(vP), normalize(sunDir)),0.0); c += glow*(pow(s,6.0)*0.3 + pow(s,60.0)*0.5); gl_FragColor = vec4(c,1.0); }',
      }),
    );
    sky.renderOrder = -10;
    scene.add(sky);
    this.sky = sky;
    const sp = [];
    const R = rnd(3);
    for (let i = 0; i < 400; i++) {
      const a = R() * Math.PI * 2,
        b = R() * 0.5 + 0.08;
      sp.push(Math.cos(a) * Math.cos(b) * 280, Math.sin(b) * 280, Math.sin(a) * Math.cos(b) * 280);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    scene.add(this.stars);

    this.hemi = new THREE.HemisphereLight(0xfdf8ef, 0x8fae7a, 1.45);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
    this.sun.castShadow = quality !== 'low';
    const ms = quality === 'high' ? 2048 : 1024;
    this.sun.shadow.mapSize.set(ms, ms);
    const sc = this.sun.shadow.camera;
    sc.left = -30;
    sc.right = 30;
    sc.top = 30;
    sc.bottom = -30;
    sc.near = 1;
    sc.far = 140;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun, this.sun.target);

    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.time = DAY * 0.3;
    this.colliders = [];
    this._ground();
    this._decor();
    this._animals();
    this._clouds();
    this._particles();
  }

  add(geo, x, z, ry = 0, y = 0, shadow = true) {
    const m = new THREE.Mesh(geo, this.mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.castShadow = shadow && this.sun.castShadow;
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }

  // земля: трава с пятнами и грунтовые дорожки (рисуются на текстуре)
  _ground() {
    const S = 240,
      N = 1024;
    const cv = document.createElement('canvas');
    cv.width = cv.height = N;
    const g = cv.getContext('2d');
    g.fillStyle = '#7fc35b';
    g.fillRect(0, 0, N, N);
    const R = rnd(11);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = R() < 0.5 ? 'rgba(96,170,70,.35)' : 'rgba(150,210,110,.3)';
      const r = 2 + R() * 7;
      g.beginPath();
      g.arc(R() * N, R() * N, r, 0, 7);
      g.fill();
    }
    const W = (x) => ((x + S / 2) / S) * N;
    const road = (pts, w) => {
      g.strokeStyle = '#c8a46a';
      g.lineWidth = (w / S) * N;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      pts.forEach(([x, z], i) => (i ? g.lineTo(W(x), W(z)) : g.moveTo(W(x), W(z))));
      g.stroke();
      g.strokeStyle = 'rgba(160,125,75,.45)';
      g.lineWidth = (w / S) * N * 0.18;
      for (const off of [-0.25, 0.25]) {
        g.beginPath();
        pts.forEach(([x, z], i) => (i ? g.lineTo(W(x + off * w * 0), W(z) + off * (w / S) * N) : g.moveTo(W(x), W(z) + off * (w / S) * N)));
        g.stroke();
      }
    };
    // двор у амбара и дорожки между полями
    road([[-40, 5], [40, 5]], 4.5);
    road([[-40, 26], [40, 26]], 4);
    road([[-12.5, 5], [-12.5, 46]], 4);
    road([[12.5, 5], [12.5, 46]], 4);
    road([[-8, -1], [-8, 5]], 6);
    road([[10, -3], [10, 5]], 3.5);
    g.fillStyle = '#c8a46a';
    g.beginPath();
    g.ellipse(W(-8), W(0), (7 / S) * N, (4.5 / S) * N, 0, 0, 7);
    g.fill();
    // пруд
    g.fillStyle = '#4da8d6';
    g.beginPath();
    g.ellipse(W(40), W(-6), (8 / S) * N, (5.5 / S) * N, 0.3, 0, 7);
    g.fill();
    g.fillStyle = '#7fcdf0';
    g.beginPath();
    g.ellipse(W(39), W(-7), (5 / S) * N, (3 / S) * N, 0.3, 0, 7);
    g.fill();
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshLambertMaterial({ map: tex }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.colliders.push({ x0: 32, x1: 48, z0: -11.5, z1: -0.5 });
  }

  _decor() {
    // амбар, силос, дом, мельница
    this.add(M.barnGeo(), BARN.x, BARN.z);
    this.colliders.push({ x0: BARN.x - 4.8, x1: BARN.x + 4.8, z0: BARN.z - 3.8, z1: BARN.z + 3.6 });
    this.add(M.siloGeo(), -16, -7);
    this.colliders.push({ x0: -18, x1: -14, z0: -9, z1: -5 });
    this.add(M.houseGeo(), 10, -9);
    this.colliders.push({ x0: 6.3, x1: 13.7, z0: -12.3, z1: -4.4 });
    this.add(M.millTowerGeo(), -34, -14);
    this.colliders.push({ x0: -36.5, x1: -31.5, z0: -16.5, z1: -11.5 });
    this.mill = this.add(M.millBladesGeo(), -34, -11.6, 0, 8.2);
    for (const [x, z, r] of [[-1.5, -3.5, 0.3], [-0.2, -4.6, 1.2], [-15, -2, 0], [-16.6, -2.2, 0.4]]) this.add(M.hayGeo(), x, z, r);
    // загон для коров
    const pen = { x: 26, z: -11, w: 12, d: 8 };
    this.add(M.fenceGeo(pen.w), pen.x, pen.z - pen.d / 2);
    this.add(M.fenceGeo(pen.w), pen.x, pen.z + pen.d / 2);
    this.add(M.fenceGeo(pen.d), pen.x - pen.w / 2, pen.z, Math.PI / 2);
    this.add(M.fenceGeo(pen.d), pen.x + pen.w / 2, pen.z, Math.PI / 2);
    this.colliders.push({ x0: pen.x - pen.w / 2 - 0.3, x1: pen.x + pen.w / 2 + 0.3, z0: pen.z - pen.d / 2 - 0.3, z1: pen.z + pen.d / 2 + 0.3 });
    this.pen = pen;
    // заборы вдоль дороги у дома
    this.add(M.fenceGeo(10), 10, -2.8);
    // деревья: кольцо вокруг фермы и рощицы
    const R = rnd(21);
    const trees = [];
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2 + R() * 0.05;
      const rx = 62 + R() * 10,
        rz = 46 + R() * 8;
      trees.push([Math.cos(a) * rx, 14 + Math.sin(a) * rz, R()]);
    }
    for (const [cx, cz, n] of [[-44, -6, 6], [44, 18, 5], [-44, 30, 5], [30, -20, 4], [-24, -20, 5], [2, -20, 4]])
      for (let k = 0; k < n; k++) trees.push([cx + (R() - 0.5) * 9, cz + (R() - 0.5) * 7, R()]);
    const tgeo = [M.treeGeo(0, 1), M.treeGeo(1, 1.1), M.treeGeo(0, 1.3)];
    const groups = [[], [], []];
    for (const [x, z, s] of trees) {
      if (FIELDS.some((f) => Math.abs(x - f.x) < FIELD_W / 2 + 2 && Math.abs(z - f.z) < FIELD_D / 2 + 2)) continue;
      groups[Math.floor(s * 3)].push([x, z, 0.85 + s * 0.5]);
    }
    const dummy = new THREE.Object3D();
    groups.forEach((list, k) => {
      const im = new THREE.InstancedMesh(tgeo[k], this.mat, list.length);
      list.forEach(([x, z, s], i) => {
        dummy.position.set(x, 0, z);
        dummy.rotation.y = x * 1.7;
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
        if (Math.hypot(x, z - 14) < 56) this.colliders.push({ x0: x - 1, x1: x + 1, z0: z - 1, z1: z + 1 });
      });
      im.castShadow = this.sun.castShadow;
      this.scene.add(im);
    });
    for (let k = 0; k < 14; k++) this.add(M.rockGeo(0.6 + R()), -48 + R() * 96, -22 + R() * 4 + (k % 2) * 72, R() * 6);
  }

  _animals() {
    this.cows = [];
    const hg = M.cowHeadGeo();
    for (let k = 0; k < 3; k++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(M.cowGeo(), this.mat);
      const head = new THREE.Mesh(hg, this.mat);
      head.position.set(0, 1.3, 0.8);
      g.add(body, head);
      g.traverse((o) => (o.castShadow = this.sun.castShadow));
      g.position.set(this.pen.x - 3.5 + k * 3.5, 0, this.pen.z + (k % 2 ? 1.5 : -1.2));
      g.rotation.y = k * 2.1;
      this.scene.add(g);
      this.cows.push({ g, head, ph: k * 1.7 });
    }
    this.chickens = [];
    const cg = M.chickenGeo();
    for (let k = 0; k < 5; k++) {
      const m = new THREE.Mesh(cg, this.mat);
      m.castShadow = this.sun.castShadow;
      m.position.set(4 + k * 1.3, 0, -1.5 - (k % 2));
      this.scene.add(m);
      this.chickens.push({ m, tx: m.position.x, tz: m.position.z, wait: k });
    }
  }

  _clouds() {
    this.clouds = [];
    const R = rnd(5);
    const geo = M.cloudGeo();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.92 });
    for (let k = 0; k < 9; k++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(-90 + R() * 180, 32 + R() * 10, -40 + R() * 110);
      m.scale.setScalar(1 + R() * 1.2);
      this.scene.add(m);
      this.clouds.push(m);
    }
  }

  // частицы: дым из трубы, пыль из-под плуга, семена
  _particles() {
    const N = 220;
    this.pt = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.22, 0), new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.8, depthWrite: false }), N);
    this.pt.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pt.frustumCulled = false;
    this.pts = [];
    for (let i = 0; i < N; i++) {
      this.pts.push({ life: 0 });
      this.pt.setColorAt(i, new THREE.Color(0xffffff));
    }
    this.pt.count = N;
    this.scene.add(this.pt);
    this._pi = 0;
    this._dummy = new THREE.Object3D();
  }

  emit(x, y, z, vx, vy, vz, size, color, life) {
    const idx = this._pi;
    const p = this.pts[idx];
    this._pi = (this._pi + 1) % this.pts.length;
    Object.assign(p, { x, y, z, vx, vy, vz, size, life, max: life });
    this.pt.setColorAt(idx, (this._pc = this._pc || new THREE.Color()).set(color));
    this.pt.instanceColor.needsUpdate = true;
  }

  update(dt, focus) {
    this.time += dt;
    const ph = (this.time % DAY) / DAY; // 0 — рассвет
    const sunA = ph * Math.PI * 2;
    const elev = Math.sin(sunA);
    const day = THREE.MathUtils.smoothstep(elev, -0.15, 0.25);
    this.dayK = day;
    // солнце ходит над фермой; ночью светит луна (тот же свет, синий и слабее)
    const lx = Math.cos(sunA) * 60,
      ly = Math.max(18, Math.abs(elev) * 70 + 18);
    this.sun.position.set(focus.x + lx, ly, focus.z + 30);
    this.sun.target.position.set(focus.x, 0, focus.z);
    this.sun.intensity = 0.7 + day * 1.8;
    this.sun.color.setRGB(1 - (1 - day) * 0.45, 0.95 - (1 - day) * 0.3, 0.86 + (1 - day) * 0.14);
    this.hemi.intensity = 0.85 + day * 0.65;
    this.hemi.color.setRGB(0.75 + day * 0.25, 0.8 + day * 0.18, 0.95);
    const top = new THREE.Color(0x7fc4f2).lerp(new THREE.Color(0x1d2a5a), 1 - day);
    const bot = new THREE.Color(0xe6f5ff).lerp(new THREE.Color(0x52608f), 1 - day);
    // закат и рассвет — тёплый край неба
    const dusk = Math.max(0, 1 - Math.abs(elev) * 4) * 0.6;
    bot.lerp(new THREE.Color(0xffc49a), dusk);
    this.skyU.top.value.copy(top);
    this.skyU.bottom.value.copy(bot);
    this.skyU.sunDir.value.set(lx, elev * 60, 30);
    this.scene.fog.color.copy(bot);
    this.stars.material.opacity = (1 - day) * 0.9;
    // мельница, облака, животные
    this.mill.rotation.z += dt * 0.6;
    for (const c of this.clouds) {
      c.position.x += dt * 1.2;
      if (c.position.x > 100) c.position.x = -100;
    }
    for (const c of this.cows) c.head.rotation.x = 0.35 + Math.sin(this.time * 0.8 + c.ph) * 0.3;
    for (const ch of this.chickens) {
      const m = ch.m;
      const dx = ch.tx - m.position.x,
        dz = ch.tz - m.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.1) {
        ch.wait -= dt;
        if (ch.wait <= 0) {
          ch.tx = 3 + Math.random() * 9;
          ch.tz = -3 + Math.random() * 2.2;
          ch.wait = 1 + Math.random() * 3;
        }
        m.position.y = 0;
      } else {
        const s = Math.min(d, dt * 1.2);
        m.position.x += (dx / d) * s;
        m.position.z += (dz / d) * s;
        m.rotation.y = Math.atan2(dx, dz);
        m.position.y = Math.abs(Math.sin(this.time * 14)) * 0.05;
      }
    }
    // частицы
    const D = this._dummy;
    let i = 0;
    for (const p of this.pts) {
      if (p.life > 0) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vy -= p.grav || 0;
        const k = Math.max(0, p.life / p.max);
        D.position.set(p.x, p.y, p.z);
        D.scale.setScalar(p.size * (0.6 + (1 - k) * 0.9) * (k > 0 ? 1 : 0));
      } else D.scale.setScalar(0);
      D.updateMatrix();
      this.pt.setMatrixAt(i++, D.matrix);
    }
    this.pt.instanceMatrix.needsUpdate = true;
  }

  // столкновение круга (x, z, r) с препятствиями и краями мира
  collide(x, z, r) {
    x = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, x));
    z = Math.max(BOUNDS.z0, Math.min(BOUNDS.z1, z));
    for (const b of this.colliders) {
      const cx = Math.max(b.x0, Math.min(b.x1, x)),
        cz = Math.max(b.z0, Math.min(b.z1, z));
      const dx = x - cx,
        dz = z - cz;
      const d = Math.hypot(dx, dz);
      if (d < r) {
        if (d > 1e-4) {
          x = cx + (dx / d) * r;
          z = cz + (dz / d) * r;
        } else {
          // центр внутри — выталкиваем по ближайшей стороне
          const opts = [[b.x0 - r, z, x - b.x0], [b.x1 + r, z, b.x1 - x], [x, b.z0 - r, z - b.z0], [x, b.z1 + r, b.z1 - z]];
          opts.sort((a, c) => Math.abs(a[2]) - Math.abs(c[2]));
          [x, z] = opts[0];
        }
      }
    }
    return [x, z];
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
