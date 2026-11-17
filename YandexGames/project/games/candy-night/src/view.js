// 3D-вид уровня: сцена, свет, камера, синхронизация героя, врагов, конфет и эффектов с логикой
import * as THREE from 'three';
import { MAT, MAT_GLOW, blobShadow, B } from './gfx.js';
import { CS } from './map.js';
import { buildLevel, THEME, halo, haloTex } from './scenery.js';
import { makeKid, animKid, makeGhost, makeBat, makeSkel, makePumpkin, makeSpider, makeWitch, makeBigBoo, candyGeo, lollyGeo, CANDY_COL, makeLantern, makeBone, makeCauldron } from './models.js';

const DARK = new THREE.MeshBasicMaterial({ vertexColors: true, color: '#3a3a5a' });
const TRICK = new THREE.MeshBasicMaterial({ vertexColors: true, color: '#a8ff9a' });
const _m = new THREE.Matrix4(),
  _q = new THREE.Quaternion(),
  _e = new THREE.Euler(),
  _v = new THREE.Vector3(),
  _s = new THREE.Vector3(),
  _c = new THREE.Color();

// значок конфеты над дверью горящего дома
let candyIcon = null;
function candyIconTex() {
  if (candyIcon) return candyIcon;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.translate(32, 32);
  g.rotate(-0.4);
  g.fillStyle = '#2a2238';
  const wrap = (s) => {
    g.beginPath();
    g.moveTo(-14 * s, 0);
    g.lineTo(-27 * s, -11 * s);
    g.lineTo(-27 * s, 11 * s);
    g.closePath();
    g.moveTo(14 * s, 0);
    g.lineTo(27 * s, -11 * s);
    g.lineTo(27 * s, 11 * s);
    g.closePath();
    g.fill();
    g.beginPath();
    g.ellipse(0, 0, 16 * s, 12 * s, 0, 0, 7);
    g.fill();
  };
  wrap(1.12);
  g.fillStyle = '#ff6a9a';
  wrap(0.92);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(-4, -4, 5, 3, -0.4, 0, 7);
  g.fill();
  candyIcon = new THREE.CanvasTexture(c);
  candyIcon.colorSpace = THREE.SRGBColorSpace;
  return candyIcon;
}

export class View {
  constructor(game, world, costume = 'pumpkin') {
    this.g = game;
    this.w = world;
    this.theme = world.lv.world;
    const T = THEME[this.theme];
    const sc = (this.scene = new THREE.Scene());
    sc.background = new THREE.Color(T.bg);
    sc.fog = new THREE.Fog(T.fog, 26, 62);
    this.hemi = new THREE.HemisphereLight(T.hemi[0], T.hemi[1], T.hemi[2]);
    sc.add(this.hemi);
    const d = (this.moon = new THREE.DirectionalLight(T.moon[0], T.moon[1]));
    d.castShadow = game.quality !== 'low';
    const ms = game.quality === 'high' ? 2048 : 1024;
    d.shadow.mapSize.set(ms, ms);
    const sz = 17;
    d.shadow.camera.left = -sz;
    d.shadow.camera.right = sz;
    d.shadow.camera.top = sz;
    d.shadow.camera.bottom = -sz;
    d.shadow.camera.near = 1;
    d.shadow.camera.far = 60;
    d.shadow.bias = -0.0008;
    sc.add(d);
    sc.add(d.target);
    const lv = buildLevel(world, this.theme, game.quality);
    sc.add(lv.group);
    this.houseMeshes = lv.houseMeshes;
    // значки конфет над горящими домами
    const it = candyIconTex();
    for (const hm of this.houseMeshes) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: it, transparent: true, depthWrite: false, fog: false }));
      s.scale.set(0.75, 0.75, 1);
      sc.add(s);
      hm.icon = s;
      hm.house = world.houses.find((h) => h.b === hm.blk);
      s.position.set(hm.house.x, 2.7, hm.house.z);
    }
    // котёл
    this.cauldron = makeCauldron();
    this.cauldron.position.set(world.cauldron.x, 0, world.cauldron.z);
    sc.add(this.cauldron);
    const ch = halo('#ff9a3c', 4.5, 0.3);
    ch.position.set(world.cauldron.x, 1.0, world.cauldron.z);
    sc.add(ch);
    this.cauldronHalo = ch;
    this.cauldronLight = new THREE.PointLight('#ffa040', 7, 7, 1.6);
    this.cauldronLight.position.set(world.cauldron.x, 2.2, world.cauldron.z);
    sc.add(this.cauldronLight);
    // герой
    this.kid = makeKid(costume);
    this.kid.scale.setScalar(1.22);
    sc.add(this.kid);
    this.kidShadow = blobShadow(0.42, 0.35);
    sc.add(this.kidShadow);
    this.pLight = new THREE.PointLight('#ffc070', 14, 8, 1.5);
    sc.add(this.pLight);
    // фонарь в руке (во время силы)
    this.held = makeLantern();
    this.held.scale.setScalar(0.55);
    this.held.visible = false;
    this.kid.add(this.held);
    this.held.position.set(-0.32, 0.25, 0.12);
    this.powerRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 32), new THREE.MeshBasicMaterial({ color: '#fff0a0', transparent: true, opacity: 0.6, depthWrite: false }));
    this.powerRing.rotation.x = -Math.PI / 2;
    this.powerRing.visible = false;
    sc.add(this.powerRing);
    // кольцо стука у двери
    this.knockRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 32, 1, 0, Math.PI * 2), new THREE.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.85, depthWrite: false }));
    this.knockRing.rotation.x = -Math.PI / 2;
    this.knockRing.visible = false;
    sc.add(this.knockRing);
    // конфеты
    const cmat = new THREE.MeshToonMaterial({ gradientMap: MAT.gradientMap, vertexColors: true });
    this.candyIM = new THREE.InstancedMesh(candyGeo(), cmat, 900);
    this.candyIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.candyIM.frustumCulled = false;
    this.candyIM.castShadow = false;
    for (let k = 0; k < 900; k++) this.candyIM.setColorAt(k, _c.set(CANDY_COL[k % CANDY_COL.length]));
    sc.add(this.candyIM);
    this.lollyIM = new THREE.InstancedMesh(lollyGeo(), cmat, 40);
    this.lollyIM.frustumCulled = false;
    for (let k = 0; k < 40; k++) this.lollyIM.setColorAt(k, _c.set(['#ff5a7a', '#c58bff', '#7ad0ff'][k % 3]));
    sc.add(this.lollyIM);
    // летящие конфеты (украшение)
    this.flyIM = new THREE.InstancedMesh(candyGeo(), cmat, 160);
    this.flyIM.frustumCulled = false;
    for (let k = 0; k < 160; k++) this.flyIM.setColorAt(k, _c.set(CANDY_COL[k % CANDY_COL.length]));
    sc.add(this.flyIM);
    this.flyers = [];
    // фонари-силы
    this.lanterns = world.lanterns.map((L) => {
      const m = makeLantern();
      m.position.set(L.x, 0.3, L.z);
      sc.add(m);
      const h = halo('#fff2a0', 3.2, 0.6);
      h.position.set(L.x, 0.9, L.z);
      sc.add(h);
      const sh = blobShadow(0.35, 0.3);
      sh.position.set(L.x, 0.02, L.z);
      sc.add(sh);
      return { m, h, sh };
    });
    this.ents = new Map();
    this.pools = { puddle: [], wave: [], bone: [], mark: [] };
    this.parts = [];
    this.partMat = new THREE.SpriteMaterial({ map: haloTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.puffGeo = new THREE.SphereGeometry(0.3, 8, 6);
    this.aimLine = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ff5a8a', transparent: true, opacity: 0.35, depthWrite: false }));
    this.aimLine.rotation.x = -Math.PI / 2;
    this.aimLine.visible = false;
    sc.add(this.aimLine);
    this.ray = new THREE.Ray();
    this.camT = new THREE.Vector3(world.p.x, 0, world.p.z);
    this.shake = 0;
    this.t = 0;
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material.map && o.material.map !== haloTex() && o.material.map !== candyIconTex()) o.material.map.dispose();
    });
  }

  // ---------- камера ----------
  camera(cam, dt, snap = false) {
    const w = this.w,
      P = w.p;
    const portrait = cam.aspect < 1;
    const dist = portrait ? 25 : cam.aspect < 1.4 ? 21 : 18.5;
    const pitch = portrait ? 1.12 : 1.06;
    const gw = w.map.W * CS,
      gh = w.map.H * CS;
    const hx = portrait ? 5 : 9,
      hz = portrait ? 8 : 5;
    const tx = Math.min(Math.max(P.x, Math.min(hx, gw / 2)), Math.max(gw - hx, gw / 2));
    const tz = Math.min(Math.max(P.z, Math.min(hz, gh / 2)), Math.max(gh - hz + 2, gh / 2));
    const k = snap ? 1 : 1 - Math.pow(0.0025, dt);
    this.camT.x += (tx - this.camT.x) * k;
    this.camT.z += (tz - this.camT.z) * k;
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const sz = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    this.shake = Math.max(0, this.shake - dt * 1.5);
    cam.position.set(this.camT.x + sx, Math.sin(pitch) * dist, this.camT.z + Math.cos(pitch) * dist + sz);
    cam.lookAt(this.camT.x + sx, 0.5, this.camT.z + sz);
    const d = this.moon;
    d.position.set(this.camT.x - 7, 22, this.camT.z + 4);
    d.target.position.set(this.camT.x, 0, this.camT.z - 2);
  }

  // ---------- кадр ----------
  update(dt) {
    this.t += dt;
    const t = this.t;
    const w = this.w,
      P = w.p;
    // герой
    const k = this.kid;
    k.position.set(P.x, 0, P.z);
    k.rotation.y = P.dir;
    const mv = P.moving ? 1 : 0;
    animKid(k, t, mv, P.bag / w.st.bag, { dash: P.dashT > 0, hurt: P.hurtT > 0 });
    k.visible = !(P.hurtT > 0 && Math.floor(t * 12) % 2 === 0);
    this.kidShadow.position.set(P.x, 0.02, P.z);
    this.pLight.position.set(P.x, 2.2, P.z + 0.5);
    const pw = w.power;
    this.held.visible = pw;
    this.pLight.color.set(pw ? '#fff2a0' : '#ffc070');
    this.pLight.intensity = pw ? 30 : 14;
    this.powerRing.visible = pw;
    if (pw) {
      this.powerRing.position.set(P.x, 0.04, P.z);
      const s = 1 + Math.sin(t * 8) * 0.08;
      this.powerRing.scale.setScalar(s);
      this.powerRing.material.opacity = P.powerT < 1.5 && Math.floor(t * 8) % 2 ? 0.15 : 0.6;
      this.held.userData.core.scale.setScalar(1 + Math.sin(t * 10) * 0.1);
    }
    // кольцо стука
    if (P.knockHouse) {
      const h = P.knockHouse;
      this.knockRing.visible = true;
      this.knockRing.position.set(h.x, 0.05, h.z);
      const f = Math.min(1, P.knock / 0.45);
      this.knockRing.scale.setScalar(0.4 + f * 0.8);
      this.knockRing.material.opacity = 0.9 - f * 0.4;
    } else this.knockRing.visible = false;
    // дома
    for (const hm of this.houseMeshes) {
      const h = hm.house;
      let mat = h.lit ? MAT_GLOW : DARK;
      if (h.lit && h.trick && Math.sin(t * 3 + h.x) > 0.75) mat = TRICK;
      hm.lights.material = mat;
      hm.icon.visible = h.lit;
      if (h.lit) {
        hm.icon.position.y = 2.7 + Math.sin(t * 3 + h.x) * 0.12;
        hm.icon.material.rotation = Math.sin(t * 2 + h.z) * 0.15;
      }
    }
    // котёл
    const cd = this.cauldron.userData;
    cd.fire.scale.set(1 + Math.sin(t * 13) * 0.08, 1 + Math.sin(t * 17) * 0.15, 1 + Math.cos(t * 11) * 0.08);
    cd.pile.position.y = Math.min(0.25, w.banked / Math.max(1, w.lv.goal[2]) * 0.25) - 0.1;
    this.cauldronLight.intensity = 7 + Math.sin(t * 9) * 1.5;
    // фонари
    w.lanterns.forEach((L, i) => {
      const o = this.lanterns[i];
      o.m.visible = o.h.visible = o.sh.visible = L.on;
      o.m.position.y = 0.35 + Math.sin(t * 2.5 + i) * 0.15;
      o.m.rotation.y = t * 1.2;
      o.h.material.opacity = 0.5 + Math.sin(t * 4 + i) * 0.15;
    });
    this.fadeHouses();
    this.syncCandies(t);
    this.syncEnemies(dt, t);
    this.syncHazards(t);
    this.syncParts(dt);
  }

  // дом между камерой и героем становится полупрозрачным
  fadeHouses() {
    const P = this.w.p;
    const cam = this.g.camera;
    _v.set(P.x, 1.0, P.z);
    const dir = _v.clone().sub(cam.position);
    const len = dir.length();
    this.ray.set(cam.position, dir.normalize());
    for (const hm of this.houseMeshes) {
      let hide = false;
      if (this.ray.intersectsBox(hm.box)) {
        const p = this.ray.intersectBox(hm.box, _s);
        hide = !!p && p.distanceTo(cam.position) < len;
      }
      const want = hide ? 0.22 : 1;
      const cur = hm.mat.opacity;
      const v = cur + (want - cur) * 0.2;
      hm.mat.opacity = Math.abs(v - want) < 0.02 ? want : v;
      hm.mat.transparent = hm.mat.opacity < 0.99;
      hm.mat.depthWrite = !hm.mat.transparent;
      hm.mesh.castShadow = this.g.quality !== 'low' && !hm.mat.transparent;
      const show = hm.mat.opacity > 0.6;
      hm.lights.visible = hm.house.lit && show;
      hm.halo.visible = hm.house.lit && show;
    }
  }

  syncCandies(t) {
    const w = this.w;
    let n = 0,
      nl = 0;
    for (const c of w.candies) {
      if (c.dead) continue;
      let x = c.x,
        z = c.z,
        y = 0.32 + Math.sin(t * 3 + c.x * 1.7 + c.z) * 0.06;
      if (c.fly > 0) {
        const f = c.flyT / c.fly;
        x = c.fromX + (c.x - c.fromX) * f;
        z = c.fromZ + (c.z - c.fromZ) * f;
        y = 0.3 + Math.sin(f * Math.PI) * 1.4;
      }
      if (c.ttl && c.age > c.ttl - 3 && Math.floor(t * 8) % 2) continue;
      if (c.kind === 1) {
        if (nl >= 40) continue;
        _e.set(0, t * 2 + c.x, 0);
        _q.setFromEuler(_e);
        _m.compose(_v.set(x, y - 0.25, z), _q, _s.set(1, 1, 1));
        this.lollyIM.setMatrixAt(nl++, _m);
        continue;
      }
      if (n >= 900) continue;
      _e.set(0.3, t * 1.6 + c.x * 3 + c.z, 0.2);
      _q.setFromEuler(_e);
      _m.compose(_v.set(x, y, z), _q, _s.set(1, 1, 1));
      this.candyIM.setMatrixAt(n, _m);
      _c.set(CANDY_COL[c.col]);
      this.candyIM.setColorAt(n, _c);
      n++;
    }
    this.candyIM.count = n;
    this.candyIM.instanceMatrix.needsUpdate = true;
    if (this.candyIM.instanceColor) this.candyIM.instanceColor.needsUpdate = true;
    this.lollyIM.count = nl;
    this.lollyIM.instanceMatrix.needsUpdate = true;
    // украшение: летящие к мешку/котлу
    let nf = 0;
    for (const f of this.flyers) {
      f.t += 1 / 60;
      const k = Math.min(1, f.t / f.dur);
      if (k >= 1) continue;
      const tx = typeof f.to === 'function' ? f.to() : f.to;
      const x = f.from[0] + (tx[0] - f.from[0]) * k,
        z = f.from[2] + (tx[2] - f.from[2]) * k;
      const y = f.from[1] + (tx[1] - f.from[1]) * k + Math.sin(k * Math.PI) * f.h;
      _e.set(t * 5, t * 7 + f.ph, 0);
      _q.setFromEuler(_e);
      _m.compose(_v.set(x, y, z), _q, _s.setScalar(0.9));
      if (nf < 160) {
        this.flyIM.setMatrixAt(nf, _m);
        this.flyIM.setColorAt(nf, _c.set(CANDY_COL[f.col]));
        nf++;
      }
    }
    this.flyers = this.flyers.filter((f) => f.t < f.dur);
    this.flyIM.count = nf;
    this.flyIM.instanceMatrix.needsUpdate = true;
    if (this.flyIM.instanceColor) this.flyIM.instanceColor.needsUpdate = true;
  }

  fly(from, to, n, h = 1.5, dur = 0.5) {
    for (let k = 0; k < Math.min(n, 30); k++) this.flyers.push({ from: [from[0] + (Math.random() - 0.5) * 0.4, from[1], from[2] + (Math.random() - 0.5) * 0.4], to, t: -k * 0.04, dur, h: h + Math.random() * 0.6, col: Math.floor(Math.random() * 6), ph: Math.random() * 6 });
  }

  makeEnemy(e) {
    let m;
    switch (e.type) {
      case 'ghost':
        m = makeGhost({ party: e.party, tint: e.temp && !e.party ? '#e8fff0' : '#ffffff' });
        break;
      case 'skel':
        m = makeSkel(0.95);
        break;
      case 'jack':
        m = makePumpkin(0.85);
        break;
      case 'spider':
        m = makeSpider();
        break;
      case 'witch':
        m = makeWitch(1.1);
        break;
      case 'bat':
        m = makeBat();
        break;
      case 'boss':
        m = { bigboo: makeBigBoo, skelking: () => makeSkel(1.9, true), witchqueen: () => makeWitch(1.8, true), pumpking: () => makePumpkin(2.1, true) }[e.kind]();
        break;
    }
    // свой материал, чтобы подкрашивать испуганных
    if (e.type !== 'ghost' && !(e.type === 'boss' && e.kind === 'bigboo')) {
      const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: MAT.gradientMap });
      m.traverse((o) => {
        if (o.isMesh && o.material === MAT) o.material = mat;
      });
      m.userData.mat = mat;
    }
    const sh = blobShadow(e.type === 'boss' ? 1.2 : e.type === 'bat' ? 0.3 : 0.5, e.type === 'spider' ? 0.0 : 0.3);
    this.scene.add(m);
    this.scene.add(sh);
    const ent = { m, sh, type: e.type };
    if (e.type === 'spider') {
      const mark = new THREE.Mesh(new THREE.CircleGeometry(0.8, 24), new THREE.MeshBasicMaterial({ color: '#1a1028', transparent: true, opacity: 0.35, depthWrite: false }));
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(e.x, 0.03, e.z);
      this.scene.add(mark);
      ent.mark = mark;
    }
    return ent;
  }

  syncEnemies(dt, t) {
    const w = this.w;
    const seen = new Set();
    const pw = w.power;
    const list = w.enemies.concat(w.bats);
    for (const e of list) {
      seen.add(e.id);
      let ent = this.ents.get(e.id);
      if (!ent) {
        ent = this.makeEnemy(e);
        this.ents.set(e.id, ent);
      }
      const m = ent.m;
      const dead = e.dead > 0;
      m.visible = !dead || (e.type === 'boss' && e.dead > 1e8 && false);
      ent.sh.visible = m.visible && e.type !== 'witch';
      if (!m.visible) {
        if (ent.mark) ent.mark.visible = false;
        continue;
      }
      const scared = pw && e.type !== 'witch' && e.type !== 'spider';
      const fadeOp = e.fade < 1 ? 0.35 + e.fade * 0.5 : 1;
      m.position.set(e.x, e.y || 0, e.z);
      ent.sh.position.set(e.x, 0.02, e.z);
      let ry = e.dir || 0;
      switch (e.type) {
        case 'ghost': {
          m.position.y = 0.15 + Math.sin(t * 3 + e.id * 50) * 0.15;
          const U = m.userData;
          const end = w.p.powerT < 1.5 && Math.floor(t * 8) % 2;
          U.mat.color.set(scared ? (end ? '#ffffff' : '#8ab8ff') : e.party ? '#ffe0f4' : '#ffffff');
          U.mat.opacity = 0.93 * fadeOp;
          U.face.visible = !scared;
          U.scared.visible = scared;
          if (e.stunT > 0) m.scale.setScalar(1 + Math.sin(t * 20) * 0.08);
          else m.scale.setScalar(1);
          break;
        }
        case 'skel': {
          const U = m.userData;
          const walk = e.state === 'charge' ? 2.2 : e.state === 'alert' || e.state === 'tired' ? 0 : 1;
          const s = Math.sin(t * (e.state === 'charge' ? 22 : 10)) * 0.5 * walk;
          U.legs[0].rotation.x = s;
          U.legs[1].rotation.x = -s;
          U.arms[0].rotation.x = e.state === 'alert' ? -2.4 : -s;
          U.arms[1].rotation.x = e.state === 'alert' ? -2.4 : s;
          U.head.position.y = 1.08 + (e.state === 'alert' ? Math.abs(Math.sin(t * 25)) * 0.08 : 0);
          U.root.rotation.x = e.state === 'charge' ? 0.3 : e.state === 'tired' ? -0.15 : 0;
          if (e.state === 'charge') ry = Math.atan2(e.cdir[0], e.cdir[1]);
          break;
        }
        case 'jack': {
          const U = m.userData;
          const sq = e.hop > 0 ? 1.1 : 1 - Math.max(0, 0.25 - e.hopT) * 0.8;
          U.root.scale.set(2 - sq, sq, 2 - sq);
          break;
        }
        case 'spider': {
          const U = m.userData;
          U.thread.scale.y = Math.max(0.01, 6 - e.y);
          U.thread.position.y = (6 - e.y) / 2 + 0.3;
          U.body.rotation.y = Math.sin(t * 2) * 0.3;
          ent.mark.visible = e.phase !== 'up' && e.phase !== 'rise';
          ent.mark.material.opacity = e.phase === 'warn' ? 0.2 + Math.abs(Math.sin(t * 12)) * 0.3 : 0.4;
          ent.mark.scale.setScalar(e.phase === 'warn' ? 0.7 + (Math.sin(t * 12) + 1) * 0.15 : 1);
          ry = 0;
          break;
        }
        case 'witch':
          m.rotation.z = Math.sin(t * 2) * 0.1;
          ry = (e.dir || 0) + 0;
          break;
        case 'bat': {
          const U = m.userData;
          const f = Math.sin(t * 22 + e.ph) * 0.7;
          U.wings[0].rotation.z = f;
          U.wings[1].rotation.z = -f;
          ry = Math.atan2(e.dx, e.dz);
          m.visible = e.t > -0.01;
          ent.sh.visible = m.visible;
          break;
        }
        case 'boss':
          this.animBoss(e, m, t);
          ry = e.dir || 0;
          break;
      }
      m.rotation.y = ry;
      if (m.userData.mat && e.type !== 'ghost') {
        const end = w.p.powerT < 1.5 && Math.floor(t * 8) % 2;
        m.userData.mat.color.set(scared ? (end ? '#ffffff' : '#9ac0ff') : e.stun > 0 && Math.floor(t * 14) % 2 ? '#ff9a9a' : '#ffffff');
        m.userData.mat.transparent = fadeOp < 1;
        m.userData.mat.opacity = fadeOp;
      }
    }
    for (const [id, ent] of this.ents) {
      if (seen.has(id)) continue;
      this.scene.remove(ent.m);
      this.scene.remove(ent.sh);
      if (ent.mark) this.scene.remove(ent.mark);
      this.ents.delete(id);
    }
  }

  animBoss(e, m, t) {
    const U = m.userData;
    if (e.kind === 'bigboo') {
      m.position.y = 0.3 + Math.sin(t * 2) * 0.25;
      const scared = this.w.power;
      U.mat.color.set(scared ? '#8ab8ff' : e.stun > 0 && Math.floor(t * 14) % 2 ? '#ffb0c0' : '#f3eeff');
      U.face.visible = !scared;
      U.scared.visible = scared;
    } else if (e.kind === 'skelking') {
      const s = Math.sin(t * 8) * 0.4;
      U.legs[0].rotation.x = s;
      U.legs[1].rotation.x = -s;
      U.arms[1].rotation.x = e.throwT > 0 ? -2.6 : 0.3;
      U.arms[0].rotation.x = -s;
    } else if (e.kind === 'witchqueen') {
      m.rotation.z = Math.sin(t * 2) * 0.1;
      if (e.swoop > 0) m.rotation.x = 0.4;
      else m.rotation.x = 0;
    } else if (e.kind === 'pumpking') {
      const sq = e.hop > 0 ? 1.12 : 1 - Math.max(0, 0.3 - e.hopT) * 0.6;
      U.root.scale.set(2 - sq, sq, 2 - sq);
    }
    if (e.intro > 0) m.scale.setScalar((e.kind === 'bigboo' ? 2.1 : e.kind === 'skelking' ? 1.9 : e.kind === 'witchqueen' ? 1.8 : 2.1) * Math.min(1, 1.2 - e.intro / 2.2));
  }

  pool(kind, make) {
    const p = this.pools[kind];
    const o = p.find((x) => !x.used);
    if (o) {
      o.used = true;
      o.m.visible = true;
      return o.m;
    }
    const m = make();
    this.scene.add(m);
    p.push({ m, used: true });
    return m;
  }
  poolReset() {
    for (const k in this.pools) for (const o of this.pools[k]) o.used = false;
  }
  poolHide() {
    for (const k in this.pools) for (const o of this.pools[k]) if (!o.used) o.m.visible = false;
  }

  syncHazards(t) {
    const w = this.w;
    this.poolReset();
    for (const pd of w.puddles) {
      const m = this.pool('puddle', () => {
        const g = new THREE.Group();
        const d = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: '#8ae85a', transparent: true, opacity: 0.6, depthWrite: false }));
        d.rotation.x = -Math.PI / 2;
        g.add(d);
        const bb = new B();
        for (let k = 0; k < 5; k++) bb.sph(0.09, '#b8ff8a', { x: Math.sin(k * 2.3) * 0.5, y: 0.05, z: Math.cos(k * 2.3) * 0.5 });
        const bm = bb.mesh(MAT_GLOW, false);
        g.add(bm);
        g.userData = { d, bm };
        return g;
      });
      const f = Math.min(1, pd.t / 0.3) * Math.min(1, (pd.life - pd.t) / 0.8);
      m.position.set(pd.x, 0.04, pd.z);
      m.scale.setScalar(pd.r * Math.max(0.05, f));
      m.userData.bm.position.y = Math.abs(Math.sin(t * 4 + pd.x)) * 0.15;
    }
    for (const wv of w.waves) {
      const m = this.pool('wave', () => {
        const r = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), new THREE.MeshBasicMaterial({ color: '#ffb43a', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
        r.rotation.x = -Math.PI / 2;
        return r;
      });
      m.position.set(wv.x, 0.06, wv.z);
      m.scale.setScalar(wv.r);
      m.material.opacity = 0.85 * (1 - wv.t / 0.55);
    }
    for (const b of w.bones) {
      const m = this.pool('bone', () => makeBone());
      m.position.set(b.x, 0.8, b.z);
      m.rotation.y = t * 14;
    }
    this.poolHide();
    // прицел королевы ведьм
    const boss = w.boss;
    if (boss && boss.kind === 'witchqueen' && boss.aim > 0) {
      const dx = boss.tx - boss.x,
        dz = boss.tz - boss.z;
      const len = Math.hypot(dx, dz) + 4;
      this.aimLine.visible = true;
      this.aimLine.scale.set(1.2, len, 1);
      this.aimLine.position.set(boss.x + (dx / Math.hypot(dx, dz)) * len * 0.5, 0.05, boss.z + (dz / Math.hypot(dx, dz)) * len * 0.5);
      this.aimLine.rotation.set(-Math.PI / 2, 0, -Math.atan2(dx, dz) + Math.PI);
      this.aimLine.material.opacity = 0.2 + Math.abs(Math.sin(t * 14)) * 0.3;
    } else this.aimLine.visible = false;
  }

  // ---------- частицы ----------
  spark(x, y, z, col, n = 6, sp = 2.5, size = 0.35, life = 0.6) {
    for (let k = 0; k < n; k++) {
      const s = new THREE.Sprite(this.partMat.clone());
      s.material.color.set(col);
      s.position.set(x, y, z);
      s.scale.setScalar(size);
      const a = Math.random() * Math.PI * 2;
      this.parts.push({ o: s, vx: Math.cos(a) * sp * (0.4 + Math.random()), vy: 1.5 + Math.random() * 2.5, vz: Math.sin(a) * sp * (0.4 + Math.random()), life, t: 0, size, g: 4 });
      this.scene.add(s);
    }
  }
  puff(x, y, z, n = 6, col = '#f4f0ff') {
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(this.puffGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, depthWrite: false }));
      m.position.set(x + (Math.random() - 0.5) * 0.6, y + Math.random() * 0.6, z + (Math.random() - 0.5) * 0.6);
      const a = Math.random() * Math.PI * 2;
      this.parts.push({ o: m, vx: Math.cos(a) * 1.2, vy: 0.8 + Math.random(), vz: Math.sin(a) * 1.2, life: 0.7, t: 0, size: 0.8 + Math.random() * 0.6, g: -0.5, puff: true });
      this.scene.add(m);
    }
  }
  syncParts(dt) {
    for (const p of this.parts) {
      p.t += dt;
      p.o.position.x += p.vx * dt;
      p.o.position.y += p.vy * dt;
      p.o.position.z += p.vz * dt;
      p.vy -= p.g * dt;
      const f = p.t / p.life;
      if (p.puff) {
        p.o.scale.setScalar(p.size * (0.6 + f));
        p.o.material.opacity = 0.8 * (1 - f);
      } else {
        p.o.scale.setScalar(p.size * (1 - f * 0.6));
        p.o.material.opacity = 1 - f;
      }
    }
    for (const p of this.parts)
      if (p.t >= p.life) {
        this.scene.remove(p.o);
        p.o.material.dispose();
      }
    this.parts = this.parts.filter((p) => p.t < p.life);
  }

  // ---------- реакции на события логики ----------
  onFx(e) {
    const w = this.w,
      P = w.p;
    const kidPos = () => [P.x, 0.9, P.z];
    switch (e.t) {
      case 'pick':
        this.spark(e.x, 0.4, e.z, CANDY_COL[Math.floor(Math.random() * 6)], 3, 1.5, 0.3, 0.4);
        break;
      case 'treat':
        this.fly([e.x, 1.0, e.z], kidPos, e.n, 1.8, 0.55);
        this.spark(e.x, 1.2, e.z, '#ffd24a', 8);
        break;
      case 'trick':
        this.puff(e.x, 0.5, e.z, 10, '#c8ffc0');
        this.shake = 0.3;
        break;
      case 'catch':
        this.puff(e.x, 0.7, e.z, 8);
        this.spark(e.x, 1, e.z, '#fff2a0', 10, 3);
        this.fly([e.x, 1, e.z], kidPos, e.n, 1.6, 0.5);
        break;
      case 'poof':
        this.puff(e.x, 0.7, e.z, 6);
        break;
      case 'bank':
        this.fly([P.x, 0.9, P.z], [w.cauldron.x, 1.8, w.cauldron.z], Math.min(30, e.n), 2.2, 0.6);
        setTimeout(() => this.spark(w.cauldron.x, 2, w.cauldron.z, '#ffd24a', 14, 3, 0.45, 0.8), 450);
        break;
      case 'hurt':
        this.shake = 0.45;
        this.spark(e.x, 1, e.z, '#ff7a9a', 8, 3);
        break;
      case 'power':
        this.spark(e.x, 0.8, e.z, '#fff2a0', 16, 4, 0.5, 0.8);
        break;
      case 'thud':
        if (e.big) this.shake = 0.5;
        this.puff(e.x, 0.1, e.z, e.big ? 8 : 4, '#c8b89a');
        break;
      case 'bossHit':
        this.shake = 0.7;
        this.spark(e.x, 1.5, e.z, '#ffd24a', 20, 5, 0.5, 0.8);
        break;
      case 'bossDown':
        this.shake = 0.9;
        this.puff(e.x, 1, e.z, 20);
        this.spark(e.x, 1.5, e.z, '#ff9ad0', 30, 6, 0.6, 1.2);
        this.fly([e.x, 1.5, e.z], [w.cauldron.x, 1.8, w.cauldron.z], 30, 4, 1.1);
        break;
      case 'summon':
        this.puff(e.x, 1, e.z, 8, '#d8c8ff');
        break;
      case 'rain':
        this.spark(e.x, 3, e.z, '#ff9ad0', 18, 4, 0.5, 1);
        break;
      case 'dash':
        this.puff(e.x, 0.2, e.z, 3, '#d8d0e8');
        break;
      case 'splash':
        this.spark(e.x, 2.5, e.z, '#9be15d', 5, 1, 0.3, 0.6);
        break;
    }
  }

  // экранные координаты точки мира (для всплывающих надписей)
  toScreen(cam, x, y, z, W, H) {
    _v.set(x, y, z).project(cam);
    return [(_v.x * 0.5 + 0.5) * W, (-_v.y * 0.5 + 0.5) * H, _v.z < 1];
  }
}
