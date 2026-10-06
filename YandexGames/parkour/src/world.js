// 3D-мир паркура: рендер, небо и «низ» по теме, платформы (инстансы и особые), косилки, монеты, флаги,
// финиш, декор и островки, персонаж, тень под ногами, частицы, камера от третьего лица
import * as THREE from 'three';
import * as M from './models.js';
import { rng, PH } from './data.js';

const UP = new THREE.Vector3(0, 1, 0);

export class World {
  constructor(canvas, quality) {
    this.quality = quality;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance', preserveDrawingBuffer: !!window.__PK_DEBUG }));
    r.setPixelRatio(Math.min(devicePixelRatio || 1, quality === 'high' ? 2 : quality === 'mid' ? 1.5 : 1));
    r.shadowMap.enabled = quality !== 'low';
    r.shadowMap.type = THREE.PCFShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    const scene = (this.scene = new THREE.Scene());
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
    scene.fog = new THREE.Fog(0xcfe9ff, 45, 170);
    this.skyU = { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(400, 24, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: this.skyU,
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y*1.2+0.35,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, pow(h,0.9)),1.0); }',
      }),
    );
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    scene.add(sky);
    this.sky = sky;
    const sp = [];
    const R = rng(3);
    for (let i = 0; i < 600; i++) {
      const a = R() * Math.PI * 2,
        b = (R() - 0.2) * 1.4;
      sp.push(Math.cos(a) * Math.cos(b) * 380, Math.sin(b) * 380, Math.sin(a) * Math.cos(b) * 380);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0.9, fog: false, depthWrite: false }));
    this.stars.frustumCulled = false;
    scene.add(this.stars);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8a9aa0, 1.5);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
    this.sun.castShadow = quality !== 'low';
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = -16;
    sc.right = 16;
    sc.top = 16;
    sc.bottom = -16;
    sc.near = 1;
    sc.far = 90;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun, this.sun.target);
    this.mat = M.VC();
    this.level = new THREE.Group();
    scene.add(this.level);
    // тень-пятно под персонажем — помогает понять, куда приземлишься
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }));
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.renderOrder = 2;
    scene.add(this.blob);
    // частицы
    this.parts = [];
    this.partGeo = new THREE.SphereGeometry(0.09, 6, 4);
    this.t = 0;
    this.cam = { yaw: 0, pitch: 0.42, dist: 7, x: 0, y: 3, z: -7 };
    this.hero = null;
    this.land = 0;
  }

  setSkin(skin) {
    if (this.hero) this.scene.remove(this.hero);
    this.hero = M.makeHero(skin);
    this.scene.add(this.hero);
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 72 : 60;
    this.cam.dist = w / h < 0.8 ? 8.2 : 7;
    this.camera.updateProjectionMatrix();
  }

  // ---------- сборка уровня ----------
  build(lv) {
    const th = lv.theme;
    this.lv = lv;
    // очистить
    for (const p of this.parts) this.scene.remove(p.m);
    this.parts = [];
    for (const c of [...this.level.children]) {
      this.level.remove(c);
      c.traverse((o) => {
        if (o.geometry && !o.userData.shared) o.geometry.dispose();
      });
    }
    this.skyU.top.value.setHex(th.sky[0]);
    this.skyU.bottom.value.setHex(th.sky[1]);
    this.scene.fog.color.setHex(th.fog);
    this.stars.visible = th.id === 'neon' || th.id === 'space' || th.id === 'volcano';
    this.hemi.color.setHex(th.neon ? 0x8a8aff : th.id === 'volcano' ? 0xffb0a0 : 0xffffff);
    this.hemi.groundColor.setHex(th.id === 'volcano' ? 0x803020 : th.neon ? 0x301a60 : 0x8a9aa0);
    this.hemi.intensity = th.neon || th.id === 'space' ? 1.25 : 1.5;
    this.sun.intensity = th.neon ? 1.2 : th.id === 'space' ? 1.8 : 2.2;
    const P = lv.plats;
    const stat = [];
    this.dyn = [];
    // особые платформы — отдельные меши
    for (const p of P) {
      const special = p.mv || p.fade || p.disc || p.bounce || p.cp || p.finish || p.start;
      if (!special) {
        stat.push(p);
        continue;
      }
      const g = this.platGeo(p, th);
      const mesh = new THREE.Mesh(g, p.fade ? new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true }) : this.mat);
      mesh.position.set(p.x, p.y, p.z);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData.p = p;
      this.level.add(mesh);
      this.dyn.push(mesh);
      if (p.bounce) {
        const s = new THREE.Mesh(M.springGeo(), this.mat);
        s.position.y = 0.02;
        s.scale.setScalar(Math.min(p.w, p.d) / 2.4);
        mesh.add(s);
        mesh.userData.spring = s;
      }
      if (p.cp) {
        const f = new THREE.Mesh(M.flagGeo(0xffffff), new THREE.MeshLambertMaterial({ vertexColors: true }));
        f.position.set(p.w / 2 - 0.4, 0, -p.d / 2 + 0.4);
        f.castShadow = true;
        mesh.add(f);
        mesh.userData.flag = f;
      }
      if (p.finish) {
        const a = new THREE.Mesh(M.portalGeo(), this.mat);
        a.position.set(0, 0, 0);
        const yaw = Math.atan2(p.x - P[p.id - 1].x, p.z - P[p.id - 1].z);
        a.rotation.y = yaw + Math.PI / 2;
        a.castShadow = true;
        mesh.add(a);
        const tr = new THREE.Mesh(M.trophyGeo(), this.mat);
        tr.position.set(0, 0, 0);
        tr.castShadow = true;
        mesh.add(tr);
        mesh.userData.trophy = tr;
      }
    }
    // обычные платформы — два инстанса: «тело» и верхний слой; столбы — цилиндрами
    const boxes = stat.filter((p) => !p.pillar),
      pills = stat.filter((p) => p.pillar);
    const mk = (geo, list, fn) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(geo, this.mat, list.length);
      const m = new THREE.Matrix4(),
        c = new THREE.Color();
      list.forEach((p, i) => {
        fn(m, c, p);
        im.setMatrixAt(i, m);
        im.setColorAt(i, c);
      });
      im.castShadow = im.receiveShadow = true;
      this.level.add(im);
    };
    const unitBox = M.colored(new THREE.BoxGeometry(1, 1, 1), 0xffffff);
    const unitCyl = M.colored(new THREE.CylinderGeometry(1, 1, 1, 16), 0xffffff);
    const S = new THREE.Vector3(),
      Q = new THREE.Quaternion(),
      T = new THREE.Vector3();
    mk(unitBox, boxes, (m, c, p) => {
      m.compose(T.set(p.x, p.y - p.t / 2 - 0.08, p.z), Q, S.set(p.w, p.t - 0.16, p.d));
      c.setHex(th.side[p.c % 2]);
    });
    mk(unitBox.clone(), boxes, (m, c, p) => {
      m.compose(T.set(p.x, p.y - 0.09, p.z), Q, S.set(p.w + 0.06, 0.18, p.d + 0.06));
      c.setHex(th.top[p.c % 2]);
    });
    mk(unitCyl, pills, (m, c, p) => {
      m.compose(T.set(p.x, p.y - p.t / 2 - 0.08, p.z), Q, S.set(p.pillar, p.t - 0.16, p.pillar));
      c.setHex(th.side[p.c % 2]);
    });
    mk(unitCyl.clone(), pills, (m, c, p) => {
      m.compose(T.set(p.x, p.y - 0.09, p.z), Q, S.set(p.pillar + 0.05, 0.18, p.pillar + 0.05));
      c.setHex(th.top[p.c % 2]);
    });
    // косилки
    this.bars = lv.bars.map((b) => {
      const g = new THREE.Group();
      g.position.set(b.x, b.y, b.z);
      const geo = M.barGeo(b.len);
      const m1 = new THREE.Mesh(geo, this.mat);
      m1.castShadow = true;
      g.add(m1);
      if (b.two) {
        const m2 = new THREE.Mesh(geo, this.mat);
        m2.rotation.y = Math.PI;
        g.add(m2);
      }
      this.level.add(g);
      return g;
    });
    // монеты
    this.coinIM = new THREE.InstancedMesh(M.coinGeo(), this.mat, Math.max(1, lv.coins.length));
    this.coinIM.castShadow = true;
    this.level.add(this.coinIM);
    // декор: островки, облака, предметы на больших платформах
    this._decor(lv);
    this._below(lv);
  }

  platGeo(p, th) {
    const top = p.cp ? th.accent : p.finish ? 0xffffff : p.fade ? 0xffb0a0 : p.bounce ? th.top[0] : th.top[p.c % 2];
    const side = th.side[p.c % 2];
    if (p.disc) {
      const r = p.disc.r;
      const parts = [M.part(new THREE.CylinderGeometry(r, r, p.t, 28), side, 0, -p.t / 2, 0), M.part(new THREE.CylinderGeometry(r + 0.04, r + 0.04, 0.18, 28), th.top[0], 0, -0.09, 0)];
      // полоски, чтобы было видно вращение
      for (let i = 0; i < 4; i++) parts.push(M.part(new THREE.BoxGeometry(0.35, 0.02, r * 1.9), th.accent, 0, 0.005, 0, 0, (i * Math.PI) / 4));
      return M.merge(parts);
    }
    const parts = [M.part(new THREE.BoxGeometry(p.w, p.t - 0.16, p.d), side, 0, -p.t / 2 - 0.08, 0), M.part(new THREE.BoxGeometry(p.w + 0.06, 0.18, p.d + 0.06), top, 0, -0.09, 0)];
    if (p.finish) {
      // шахматный финиш
      const n = 6;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) if ((i + j) % 2) parts.push(M.part(new THREE.BoxGeometry(p.w / n, 0.01, p.d / n), 0x2a2a3a, -p.w / 2 + (i + 0.5) * (p.w / n), 0.006, -p.d / 2 + (j + 0.5) * (p.d / n)));
    }
    if (p.fade) for (let i = 0; i < 3; i++) parts.push(M.part(new THREE.BoxGeometry(0.06, 0.01, p.d * 0.6), 0x8a3a3a, (i - 1) * p.w * 0.25, 0.006, 0, 0, 0.4 * (i - 1)));
    if (p.mv) parts.push(M.part(new THREE.BoxGeometry(p.w * 0.6, 0.01, 0.12), 0xffffff, 0, 0.006, 0), M.part(new THREE.BoxGeometry(0.12, 0.01, p.d * 0.6), 0xffffff, 0, 0.006, 0));
    if (p.start) {
      // на старте пара деревьев/предметов по углам
      const R = rng(this.lv.L * 31);
      for (const [sx, sz] of [[-1, -1], [1, -1]]) {
        const d = M.decor(th, R);
        d.translate(sx * (p.w / 2 - 0.7), 0, sz * (p.d / 2 - 0.7));
        parts.push(d);
      }
    }
    return M.merge(parts);
  }

  _decor(lv) {
    const th = lv.theme;
    const R = rng(lv.L * 17 + 5);
    const geos = [];
    const P = lv.plats;
    for (let i = 2; i < P.length; i += 3) {
      const p = P[i];
      const side = R() < 0.5 ? -1 : 1;
      const off = 9 + R() * 12;
      // поперёк пути
      const q = P[Math.min(P.length - 1, i + 1)];
      const dx = q.x - p.x,
        dz = q.z - p.z,
        l = Math.hypot(dx, dz) || 1;
      const nx = (-dz / l) * side,
        nz = (dx / l) * side;
      const x = p.x + nx * off,
        z = p.z + nz * off,
        y = p.y - 4 - R() * 8;
      const isl = M.islandGeo(th, R);
      isl.translate(x, y, z);
      geos.push(isl);
      for (let k = 0; k < 2; k++) {
        const d = M.decor(th, R);
        d.translate(x + (R() - 0.5) * 2.5, y + 0.3, z + (R() - 0.5) * 2.5);
        geos.push(d);
      }
    }
    if (geos.length) {
      const m = new THREE.Mesh(M.merge(geos), this.mat);
      m.receiveShadow = true;
      this.level.add(m);
    }
    // облака вокруг
    const cg = [];
    const cc = th.id === 'volcano' ? 0x6a4a50 : th.neon ? 0x3a2a7a : th.id === 'space' ? 0x3a3a6a : th.id === 'candy' ? 0xfff0f8 : 0xffffff;
    for (let i = 0; i < 26; i++) {
      const p = P[Math.floor(R() * P.length)];
      const g = M.cloudGeo(R, cc);
      const s = 1.5 + R() * 2.5;
      g.scale(s, s, s);
      // облака в стороне от трассы, чтобы не закрывали обзор
      const a = R() * Math.PI * 2,
        dd = 28 + R() * 60;
      const above = R() < 0.35;
      g.translate(p.x + Math.cos(a) * dd, p.y + (above ? 16 + R() * 18 : -8 - R() * 20), p.z + Math.sin(a) * dd);
      cg.push(g);
    }
    const clouds = new THREE.Mesh(M.merge(cg), new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: th.neon || th.id === 'space' ? 0.5 : 0.92 }));
    this.level.add(clouds);
  }

  // что под трассой: море, облака, песок, лёд, лава, сетка, пустота с планетами
  _below(lv) {
    const th = lv.theme;
    let minY = Infinity,
      cx = 0,
      cz = 0;
    for (const p of lv.plats) {
      minY = Math.min(minY, p.y);
      cx += p.x;
      cz += p.z;
    }
    cx /= lv.plats.length;
    cz /= lv.plats.length;
    const y = th.kill !== undefined ? lv.kill + 0.4 : minY - 26;
    const colors = { sea: 0x3a9ae0, clouds: 0xffe6f2, sand: 0xe8c07a, ice: 0xe6f4ff, lava: 0xff5a1a, grid: 0x0a0a2a, void: null };
    const c = colors[th.below];
    this.lava = null;
    if (c !== null) {
      const mat = th.below === 'lava' ? new THREE.MeshBasicMaterial({ color: c }) : th.below === 'grid' ? new THREE.MeshBasicMaterial({ map: gridTex(), color: 0xffffff }) : new THREE.MeshLambertMaterial({ color: c });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(cx, y, cz);
      if (th.below === 'grid') {
        mat.map.repeat.set(120, 120);
        mat.fog = true;
      }
      if (th.below === 'lava') this.lava = mat;
      this.level.add(plane);
    }
    if (th.id === 'space') {
      const R = rng(9);
      const pg = [];
      for (let i = 0; i < 5; i++) {
        const r = 10 + R() * 20;
        const g = M.part(new THREE.SphereGeometry(r, 20, 14), [0xc86aff, 0x5ad0ff, 0xff9a5a, 0x8ae0a0, 0xffd06a][i], cx + (R() - 0.5) * 400, minY + (R() - 0.2) * 120, cz + 150 + R() * 200);
        pg.push(g);
      }
      const pl = new THREE.Mesh(M.merge(pg), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }));
      this.level.add(pl);
    }
  }

  // ---------- кадр ----------
  // P — персонаж из физики; view: { yaw, pitch }
  update(dt, P, view, extra = {}) {
    this.t += dt;
    const lv = this.lv;
    if (!lv) return;
    const t = this.t;
    for (const mesh of this.dyn) {
      const p = mesh.userData.p;
      mesh.position.set(p.cx, p.cy, p.cz);
      if (p.disc) mesh.rotation.y = -p.ang;
      if (p.fade) {
        const shake = p.fadeT > 0 ? Math.sin(t * 60) * 0.05 : 0;
        mesh.position.x += shake;
        mesh.visible = !(p.gone > 0);
        mesh.material.opacity = p.fadeT > 0 ? 1 - p.fadeT * 0.8 : 1;
      }
      if (p.cp) {
        const on = P.cp >= p.id;
        const col = on ? 0x4cd06a : 0xffffff;
        if (mesh.userData.flagOn !== on) {
          mesh.userData.flagOn = on;
          mesh.userData.flag.material.color.setHex(col);
        }
        mesh.userData.flag.rotation.y = Math.sin(t * 2) * 0.1;
      }
      if (mesh.userData.spring) mesh.userData.spring.scale.y = 1 + Math.max(0, mesh.userData.bounceT || 0) * 2;
      if (mesh.userData.bounceT) mesh.userData.bounceT = Math.max(0, mesh.userData.bounceT - dt * 3);
      if (mesh.userData.trophy) mesh.userData.trophy.rotation.y = t * 1.5;
    }
    lv.bars.forEach((b, i) => (this.bars[i].rotation.y = b.ang));
    // монеты
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      s = new THREE.Vector3(),
      pos = new THREE.Vector3();
    lv.coins.forEach((c, i) => {
      q.setFromAxisAngle(UP, t * 3 + i);
      const k = c.got ? 0 : 1;
      m.compose(pos.set(c.x, c.y + Math.sin(t * 3 + i) * 0.08, c.z), q, s.set(k, k, k));
      this.coinIM.setMatrixAt(i, m);
    });
    this.coinIM.instanceMatrix.needsUpdate = true;
    if (this.lava) this.lava.color.setHSL(0.04 + Math.sin(t * 1.5) * 0.01, 1, 0.5 + Math.sin(t * 2) * 0.04);
    // персонаж
    const H = this.hero;
    if (H) {
      H.position.set(P.x, P.y, P.z);
      H.rotation.y = P.yaw;
      const run = Math.min(1, Math.hypot(P.vx, P.vz) / PH.speed);
      this.land = Math.max(0, this.land - dt * 5);
      M.animHero(H, t, run, !P.ground, P.vy, this.land);
      H.visible = !extra.hideHero;
    }
    // пятно тени: верх ближайшей платформы под ногами
    let best = null;
    for (const p of lv.plats) {
      if (p.fade && p.gone > 0) continue;
      if (p.cy > P.y + 0.05) continue;
      const R0 = p.pillar || (p.disc && p.disc.r);
      const inside = R0 ? Math.hypot(P.x - p.cx, P.z - p.cz) < R0 : Math.abs(P.x - p.cx) < p.w / 2 && Math.abs(P.z - p.cz) < p.d / 2;
      if (inside && (!best || p.cy > best.cy)) best = p;
    }
    if (best && P.y - best.cy < 14) {
      this.blob.visible = true;
      this.blob.position.set(P.x, best.cy + 0.02, P.z);
      const k = Math.max(0.35, 1 - (P.y - best.cy) * 0.08);
      this.blob.scale.setScalar(k);
      this.blob.material.opacity = 0.32 * k;
    } else this.blob.visible = false;
    // частицы
    for (const p of this.parts) {
      p.life -= dt;
      p.v.y -= (p.g || 9) * dt;
      p.m.position.addScaledVector(p.v, dt);
      const k = Math.max(0, p.life / p.max);
      p.m.scale.setScalar(p.s * (p.shrink ? k : 1));
      if (p.life <= 0) this.scene.remove(p.m);
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    // камера
    const C = this.cam;
    const tx = P.x,
      ty = P.y + 1.3,
      tz = P.z;
    const yaw = view.yaw,
      pitch = view.pitch;
    const fx = Math.sin(yaw),
      fz = Math.cos(yaw);
    const d = C.dist * (view.zoom || 1);
    const wx = tx - fx * d * Math.cos(pitch),
      wy = ty + d * Math.sin(pitch),
      wz = tz - fz * d * Math.cos(pitch);
    const k = view.snap ? 1 : 1 - Math.exp(-dt * 10);
    C.x += (wx - C.x) * k;
    C.y += (wy - C.y) * k;
    C.z += (wz - C.z) * k;
    this.camera.position.set(C.x, C.y, C.z);
    C.lx = C.lx === undefined || view.snap ? tx : C.lx + (tx - C.lx) * Math.min(1, dt * 14);
    C.ly = C.ly === undefined || view.snap ? ty : C.ly + (ty - C.ly) * Math.min(1, dt * 8);
    C.lz = C.lz === undefined || view.snap ? tz : C.lz + (tz - C.lz) * Math.min(1, dt * 14);
    this.camera.lookAt(C.lx, C.ly, C.lz);
    this.sky.position.copy(this.camera.position);
    this.stars.position.copy(this.camera.position);
    // солнце и его тень следуют за игроком
    this.sun.position.set(P.x + 18, P.y + 34, P.z + 10);
    this.sun.target.position.set(P.x, P.y, P.z);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  // ---------- эффекты ----------
  puff(x, y, z, n = 8, color = 0xffffff) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.partGeo, mat);
      m.position.set(x, y + 0.1, z);
      const a = (i / n) * Math.PI * 2;
      this.scene.add(m);
      this.parts.push({ m, v: new THREE.Vector3(Math.cos(a) * 2, 1 + Math.random(), Math.sin(a) * 2), life: 0.45, max: 0.45, s: 1.4, shrink: true, g: 4 });
    }
  }
  sparkle(x, y, z, color = 0xffe27a, n = 10) {
    const mat = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.partGeo, mat);
      m.position.set(x, y, z);
      this.scene.add(m);
      this.parts.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 5, 2 + Math.random() * 3, (Math.random() - 0.5) * 5), life: 0.6, max: 0.6, s: 0.8, shrink: true, g: 9 });
    }
  }
  confetti(x, y, z) {
    const cols = [0xff5a6a, 0xffd23a, 0x4cd06a, 0x4aa8ff, 0xc86aff];
    for (let i = 0; i < 60; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.1), new THREE.MeshBasicMaterial({ color: cols[i % 5] }));
      m.position.set(x, y + 2, z);
      this.scene.add(m);
      this.parts.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 9, 5 + Math.random() * 6, (Math.random() - 0.5) * 9), life: 2.2, max: 2.2, s: 1, g: 9 });
    }
  }
  bounceFx(p) {
    const mesh = this.dyn.find((m) => m.userData.p === p);
    if (mesh) mesh.userData.bounceT = 0.4;
  }
}

function gridTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#0a0a2a';
  x.fillRect(0, 0, 64, 64);
  x.strokeStyle = '#ff3ad0';
  x.lineWidth = 3;
  x.strokeRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
