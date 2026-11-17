// Декор неба, не влияющий на игру: море облаков, дальние островки с водопадами,
// парящие камни, птицы, солнце/луна, светлячки, падающие звёзды
import * as THREE from 'three';
import { Vox, hash, jitter, glowC } from './vox.js';
import { cloud } from './models.js';

const rnd = (i, k) => hash(i * 7 + 3, k * 13 + 5, 77);

// маленький летающий остров
function islet(seed) {
  const v = new Vox();
  const R = 3 + Math.floor(rnd(seed, 1) * 3);
  const grass = [0x8fd16a, 0x7cc96a, 0xa6dc7c, 0xeef6fb, 0xf1d38e][Math.floor(rnd(seed, 2) * 5)];
  const snowy = grass === 0xeef6fb;
  const sandy = grass === 0xf1d38e;
  // скала-конус
  for (let y = 0; y > -R * 2.6; y--) {
    const r = R * (1 + y / (R * 2.8)) + (rnd(seed, 50 - y) - 0.5);
    for (let x = -R; x <= R; x++)
      for (let z = -R; z <= R; z++) {
        if (Math.hypot(x, z) > r) continue;
        const c = y === 0 ? jitter(grass, x, y, z, 0.04) : y === -1 ? jitter(snowy ? 0xcfe3ef : sandy ? 0xe0bd72 : 0x6fb257, x, y, z, 0.04) : jitter(y > -3 ? 0xb58a5e : 0x8d8279, x, y, z, 0.06);
        v.set(x, y, z, c);
      }
  }
  // что на острове
  const kind = Math.floor(rnd(seed, 3) * 4);
  const tree = (x, z, h) => {
    for (let y = 1; y <= h; y++) v.set(x, y, z, 0x96643f);
    v.sphere(x, h + 2, z, 1.8, (xx, yy, zz) => jitter(snowy ? 0x5fa07a : sandy ? 0x7cc96a : 0x7ccc6a, xx, yy, zz, 0.06));
  };
  const pine = (x, z) => {
    v.set(x, 1, z, 0x96643f);
    for (let i = 0; i < 3; i++) for (let dx = -(2 - i); dx <= 2 - i; dx++) for (let dz = -(2 - i); dz <= 2 - i; dz++) v.set(x + dx, 2 + i, z + dz, jitter(snowy ? 0x5fa07a : 0x4f9a52, x + dx, i, z + dz, 0.06));
    v.set(x, 5, z, snowy ? 0xffffff : 0x4f9a52);
    if (snowy) for (let dx = -1; dx <= 1; dx++) v.set(x + dx, 4, z, 0xffffff);
  };
  // деревья на каждом островке (2–4 штуки, не на постройках)
  const spots = [[-1, -1], [2, 1], [-2, 2], [1, -2], [0, 2], [-2, -2]];
  const busy = kind === 1 ? [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]] : kind === 2 ? [[0, 0], [1, 1], [-1, 1]] : [];
  const nTrees = 2 + Math.floor(rnd(seed, 13) * 3);
  let planted = 0;
  for (let i = 0; i < spots.length && planted < nTrees; i++) {
    const [x, z] = spots[(i + seed) % spots.length];
    if (Math.hypot(x, z) > R - 1 || busy.some(([bx, bz]) => Math.abs(bx - x) <= 1 && Math.abs(bz - z) <= 1)) continue;
    if (rnd(seed, 20 + i) > 0.5 || sandy) tree(x, z, 2 + Math.floor(rnd(seed, 30 + i) * 2));
    else pine(x, z);
    planted++;
  }
  if (kind === 1) {
    // домик
    v.walls(-1, 1, -1, 1, 2, 1, 0xf6e7c8);
    v.set(0, 2, 1, glowC(0xffe6a0));
    for (let i = 0; i < 2; i++) for (let x = -2 + i; x <= 2 - i; x++) for (let z = -2 + i; z <= 2 - i; z++) v.set(x, 3 + i, z, 0xe57f6c);
  }
  if (kind === 2) {
    // кристаллы
    v.box(0, 1, 0, 0, 3, 0, glowC(0x8ff3ff));
    v.box(1, 1, 1, 1, 2, 1, glowC(0x8ff3ff));
    v.box(-1, 1, 1, -1, 1, 1, glowC(0xc9a6ff));
  }
  // пруд и водопад с края
  const fall = rnd(seed, 4) > 0.45 && !sandy;
  if (fall) {
    v.set(R - 1, 0, 0, 0x8fd6f2);
    v.set(R - 2, 0, 0, 0x8fd6f2);
  }
  return { v, fall, R };
}

function bird() {
  // крыло — плоский треугольник
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.08, 0, 0, 0.08, 0.45, 0.02, 0], 3));
  g.computeVertexNormals();
  return g;
}

export class SkyDeco {
  constructor(world) {
    this.w = world;
    const scene = world.scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.t = 0;

    // ---------- море облаков ----------
    const geos = [1, 2, 3, 4, 5].map((i) => world.geom('seacloud' + i, () => cloud(i + 40)).geo);
    this.seaMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.sea = [];
    const perGeo = 13;
    geos.forEach((g, gi) => {
      const m = new THREE.InstancedMesh(g, this.seaMat, perGeo);
      const mat = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      for (let i = 0; i < perGeo; i++) {
        const k = gi * perGeo + i;
        const a = rnd(k, 1) * Math.PI * 2;
        const r = 10 + Math.pow(rnd(k, 2), 0.6) * 150;
        const y = -24 - rnd(k, 3) * 5 - r * 0.05;
        const s = 6 + rnd(k, 4) * 6 + r * 0.05;
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd(k, 5) * 6);
        mat.compose(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r), q, new THREE.Vector3(s, s * 0.7, s));
        m.setMatrixAt(i, mat);
      }
      this.group.add(m);
      this.sea.push(m);
    });

    // мягкая дымка над морем облаков
    {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const ctx = c.getContext('2d');
      const gr = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
      gr.addColorStop(0, 'rgba(255,255,255,0.0)');
      gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, 256, 256);
      this.hazeMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: true });
      for (const [y, sz] of [[-19, 260], [-23, 300]]) {
        const h = new THREE.Mesh(new THREE.PlaneGeometry(sz, sz), this.hazeMat);
        h.rotation.x = -Math.PI / 2;
        h.position.y = y;
        this.group.add(h);
      }
    }

    // ---------- дальние островки ----------
    this.islets = [];
    this.fallMat = new THREE.MeshBasicMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.75 });
    for (let i = 0; i < 9; i++) {
      const { v, fall, R } = islet(i + 1);
      const g = v.build(0.28, 0, 0);
      const grp = world.meshFrom(g, false);
      if (fall) {
        // струя водопада
        const fh = 6 + rnd(i, 9) * 6;
        const wf = new THREE.Mesh(new THREE.BoxGeometry(0.5, fh, 0.45), this.fallMat);
        wf.position.set((R - 0.4) * 0.28 + 0.25, -fh / 2, 0.14);
        grp.add(wf);
        const mist = world.glowSprite(0xffffff, 2.4);
        mist.position.set((R - 0.4) * 0.28 + 0.25, -fh, 0.14);
        mist.material.blending = THREE.NormalBlending;
        mist.userData.alwaysOn = 0.5;
        grp.add(mist);
      }
      const a = (i / 9) * Math.PI * 2 + (rnd(i, 6) - 0.5) * 0.25;
      const r = (i % 2 ? 62 : 44) + rnd(i, 7) * 18;
      const y = (i % 3 === 0 ? -7 : i % 3 === 1 ? 2 : 9) + rnd(i, 8) * 3;
      grp.scale.setScalar(1.7 + rnd(i, 10) * 1.0);
      this.group.add(grp);
      this.islets.push({ grp, a, r, y, sp: 0.003 + rnd(i, 11) * 0.004, ph: rnd(i, 12) * 6 });
    }

    // ---------- парящие камни под островом ----------
    this.rocks = [];
    for (let i = 0; i < 5; i++) {
      const v = new Vox();
      const n = 1 + Math.floor(rnd(i, 20) * 1.6);
      // перевёрнутый конус скалы с травой сверху
      for (let y = 0; y >= -n * 2; y--) {
        const rr = (n + 0.7) * (1 + y / (n * 2.3));
        for (let x = -n - 1; x <= n + 1; x++) for (let z = -n - 1; z <= n + 1; z++) if (Math.hypot(x, z) <= rr) v.set(x, y, z, jitter(y === 0 ? 0x8fd16a : 0x9a8d82, x, y, z, 0.07));
      }
      // дерево
      v.set(0, 1, 0, 0x96643f);
      v.set(0, 2, 0, 0x96643f);
      v.sphere(0, 3.6, 0, 1.6, (x, y, z) => jitter(0x7ccc6a, x, y, z, 0.07));
      const grp = world.meshFrom(v.build(0.3, 0, 0), false);
      this.group.add(grp);
      grp.scale.setScalar(0.75);
      // равномерно по кругу, далеко от края основного острова и друг от друга
      this.rocks.push({ grp, a: (i / 5) * Math.PI * 2 + rnd(i, 21) * 0.5, r: 1.35 + rnd(i, 22) * 0.45, y: -3 - (i % 3) * 3 - rnd(i, 23) * 2, ph: rnd(i, 24) * 6 });
    }

    // ---------- птицы ----------
    this.birdMat = new THREE.MeshLambertMaterial({ color: 0x5a6478, side: THREE.DoubleSide });
    const bg = bird();
    this.flocks = [];
    for (let f = 0; f < 3; f++) {
      const birds = [];
      for (let i = 0; i < 6; i++) {
        const b = new THREE.Group();
        const l = new THREE.Mesh(bg, this.birdMat);
        const r = new THREE.Mesh(bg, this.birdMat);
        r.rotation.y = Math.PI;
        b.add(l, r);
        b.userData = { l, r, off: new THREE.Vector3((i % 3) * -0.9 - Math.floor(i / 3) * 0.4, (i % 2) * 0.3, (i % 3) * (i % 2 ? 0.8 : -0.8)), ph: i * 0.7 };
        b.scale.setScalar(0.9);
        this.group.add(b);
        birds.push(b);
      }
      this.flocks.push({ birds, a: f * 2.1, r: 22 + f * 9, y: 6 + f * 3, sp: 0.06 - f * 0.012 });
    }

    // ---------- солнце и луна ----------
    const disc = (color, size, glowSize) => {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d');
      const gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, color);
      gr.addColorStop(0.18, color);
      gr.addColorStop(0.24, 'rgba(255,240,200,0.55)');
      gr.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, 128, 128);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false }));
      s.scale.set(glowSize, glowSize, 1);
      return s;
    };
    this.sunS = disc('rgba(255,248,220,1)', 1, 60);
    this.moonS = disc('rgba(235,240,255,1)', 1, 38);
    this.group.add(this.sunS, this.moonS);

    // ---------- светлячки ----------
    const fp = [];
    this.fireData = [];
    for (let i = 0; i < 60; i++) this.fireData.push([(rnd(i, 30) - 0.5) * 24, 0.3 + rnd(i, 31) * 2.5, (rnd(i, 32) - 0.5) * 24, rnd(i, 33) * 6]);
    for (const d of this.fireData) fp.push(d[0], d[1], d[2]);
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3));
    this.fire = new THREE.Points(fg, new THREE.PointsMaterial({ color: 0xfff3a0, size: 0.22, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.fire.frustumCulled = false;
    this.group.add(this.fire);

    // ---------- падающая звезда ----------
    this.shoot = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false }));
    this.shoot.frustumCulled = false;
    this.group.add(this.shoot);
    this.shootT = 5;
  }

  update(dt, night, sunDir, rain) {
    this.t += dt;
    const t = this.t;
    const w = this.w;
    // море облаков медленно вращается
    for (let i = 0; i < this.sea.length; i++) this.sea[i].rotation.y += dt * (0.004 + i * 0.0008);
    const cloudCol = new THREE.Color(0xffffff).lerp(new THREE.Color(0x6f7aa8), night * 0.85).lerp(new THREE.Color(0xa5adb5), rain * 0.4);
    this.seaMat.color.copy(cloudCol);
    this.hazeMat.color.copy(cloudCol);
    this.hazeMat.opacity = 1 - night * 0.55;
    // островки
    for (const s of this.islets) {
      s.a += s.sp * dt;
      s.grp.position.set(Math.cos(s.a) * s.r, s.y + Math.sin(t * 0.4 + s.ph) * 0.6, Math.sin(s.a) * s.r);
      s.grp.rotation.y = -s.a * 0.5;
    }
    // камни под островом
    const b = w.bounds || 6;
    for (const r of this.rocks) {
      r.a += dt * 0.01;
      r.grp.position.set(Math.cos(r.a) * (b * r.r + 4), r.y + Math.sin(t * 0.7 + r.ph) * 0.35, Math.sin(r.a) * (b * r.r + 4));
      r.grp.rotation.y += dt * 0.1;
    }
    // птицы (днём)
    for (const f of this.flocks) {
      f.a += f.sp * dt;
      const cx = Math.cos(f.a) * f.r;
      const cz = Math.sin(f.a) * f.r;
      const heading = -f.a;
      const vis = night < 0.6 && rain < 0.5;
      for (const bd of f.birds) {
        bd.visible = vis;
        const o = bd.userData.off;
        const ox = o.x * Math.cos(heading) - o.z * Math.sin(heading);
        const oz = o.x * Math.sin(heading) + o.z * Math.cos(heading);
        bd.position.set(cx + ox, f.y + o.y + Math.sin(t * 0.8 + bd.userData.ph) * 0.3, cz + oz);
        bd.rotation.y = heading + Math.PI;
        const flap = Math.sin(t * 9 + bd.userData.ph) * 0.6;
        bd.userData.l.rotation.x = flap;
        bd.userData.r.rotation.x = -flap;
      }
    }
    // солнце и луна по направлению света
    const sd = sunDir.clone().normalize();
    this.sunS.position.copy(sd).multiplyScalar(220);
    this.sunS.material.opacity = (1 - night) * (1 - rain * 0.8);
    this.moonS.position.copy(sd).multiplyScalar(-220).setY(Math.abs(sd.y) * 220);
    this.moonS.material.opacity = night * (1 - rain * 0.8);
    // светлячки ночью
    this.fire.material.opacity = night * (1 - rain);
    if (night > 0.05) {
      const arr = this.fire.geometry.attributes.position.array;
      const sc = Math.max(1, b / 8);
      this.fireData.forEach((d, i) => {
        arr[i * 3] = d[0] * sc + Math.sin(t * 0.5 + d[3]) * 0.6;
        arr[i * 3 + 1] = d[1] + Math.sin(t * 1.3 + d[3]) * 0.3;
        arr[i * 3 + 2] = d[2] * sc + Math.cos(t * 0.4 + d[3]) * 0.6;
      });
      this.fire.geometry.attributes.position.needsUpdate = true;
    }
    // падающая звезда
    this.shootT -= dt;
    const sm = this.shoot.material;
    if (night > 0.7 && rain < 0.3 && this.shootT <= 0 && !this.shootLive) {
      const a = Math.random() * Math.PI * 2;
      this.shootLive = { p: new THREE.Vector3(Math.cos(a) * 180, 110 + Math.random() * 50, Math.sin(a) * 180), v: new THREE.Vector3(-Math.sin(a) * 120, -40, Math.cos(a) * 120), life: 0.9 };
    }
    if (this.shootLive) {
      const s = this.shootLive;
      s.life -= dt;
      s.p.addScaledVector(s.v, dt);
      const tail = s.p.clone().addScaledVector(s.v, -0.12);
      this.shoot.geometry.setFromPoints([s.p, tail]);
      sm.opacity = Math.max(0, s.life) * night;
      if (s.life <= 0) {
        this.shootLive = null;
        this.shootT = 6 + Math.random() * 10;
        sm.opacity = 0;
      }
    }
    // туманная дымка над морем облаков ночью/днём учитывается в цвете тумана мира
    for (const s of w.glowSprites) if (s.userData.alwaysOn) s.material.opacity = Math.max(s.material.opacity, s.userData.alwaysOn * (1 - night * 0.3));
  }
}
