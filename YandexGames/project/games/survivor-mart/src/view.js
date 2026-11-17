// 3D-вид: свет по времени суток, камера, синхронизация продавца, покупателей, персонала, зомби, полок и эффектов с логикой
import * as THREE from 'three';
import { MAT, MAT_GLOW, blobShadow, B } from './gfx.js';
import { buildScene } from './scene.js';
import { makeHero, makeCustomer, makeStaff, makeZombie, animPerson, animZombie, itemGeo, makeItem, makeShelf, makeRadioTower, makeSparkle } from './models.js';
import { SHELF_SLOTS, SHELF_CAP, ENTRIES, FRONT_Z, WALL_T, TRAP_SLOTS, REG, STORAGE, BENCH, SHOP, ZOMBIES } from './data.js';
import { itemIcon } from './thumbs.js';
import { H0, H1 } from './world.js';

const _v = new THREE.Vector3();
const _c = new THREE.Color();
const _c2 = new THREE.Color();
const HIT = new THREE.MeshBasicMaterial({ color: '#ffffff' });

// ключевые кадры освещения по часам; 24 — ночь
const LIGHT = [
  { h: 7.5, sky: '#f4c8a0', sun: '#ffd8a8', si: 2.0, hs: '#f4e0c8', hg: '#8a8a70', hi: 1.15, fog: '#f0d0b0' },
  { h: 10, sky: '#a8d8f4', sun: '#fff4e0', si: 2.5, hs: '#d8ecff', hg: '#8a9a70', hi: 1.35, fog: '#c8e4f4' },
  { h: 15, sky: '#9ed2f2', sun: '#fff6e4', si: 2.6, hs: '#d8ecff', hg: '#8a9a70', hi: 1.35, fog: '#c4e0f2' },
  { h: 18.3, sky: '#f4b88a', sun: '#ffb070', si: 2.1, hs: '#f8d0b0', hg: '#8a7a70', hi: 1.15, fog: '#eab89a' },
  { h: 20, sky: '#8a7aa8', sun: '#e88a70', si: 1.2, hs: '#b8a8d0', hg: '#5a5070', hi: 0.95, fog: '#8a7aa0' },
  { h: 24, sky: '#28304e', sun: '#a8b8ff', si: 0.85, hs: '#5a6aa0', hg: '#2a2a3a', hi: 0.8, fog: '#2a3250' },
];

function lightAt(h) {
  // ночь идёт до 6:00 (h=30): глубокая ночь, затем рассвет
  if (h > 24) {
    if (h < 29) return LIGHT[LIGHT.length - 1];
    const a = LIGHT[LIGHT.length - 1],
      b = LIGHT[0],
      t = Math.min(1, h - 29);
    const mix = (p) => '#' + _c.set(a[p]).lerp(_c2.set(b[p]), t).getHexString();
    return { sky: mix('sky'), sun: mix('sun'), si: a.si + (b.si - a.si) * t, hs: mix('hs'), hg: mix('hg'), hi: a.hi + (b.hi - a.hi) * t, fog: mix('fog') };
  }
  if (h <= LIGHT[0].h) return LIGHT[0];
  for (let k = 0; k < LIGHT.length - 1; k++) {
    const a = LIGHT[k],
      b = LIGHT[k + 1];
    if (h <= b.h) {
      const t = (h - a.h) / (b.h - a.h);
      const mix = (p) => '#' + _c.set(a[p]).lerp(_c2.set(b[p]), t).getHexString();
      return { sky: mix('sky'), sun: mix('sun'), si: a.si + (b.si - a.si) * t, hs: mix('hs'), hg: mix('hg'), hi: a.hi + (b.hi - a.hi) * t, fog: mix('fog') };
    }
  }
  return LIGHT[LIGHT.length - 1];
}

// значки-пузыри над покупателями
const bubbleCache = {};
function bubbleTex(kind, type) {
  const key = kind + ':' + (type || '');
  if (bubbleCache[key]) return bubbleCache[key];
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fffaf0';
  g.strokeStyle = '#2a2430';
  g.lineWidth = 6;
  g.beginPath();
  g.arc(64, 56, 46, 0, 7);
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(50, 96);
  g.lineTo(64, 122);
  g.lineTo(76, 96);
  g.fill();
  g.stroke();
  g.fillStyle = '#fffaf0';
  g.fillRect(48, 88, 30, 10);
  const icon = type && itemIcon(type).cv;
  if (icon) g.drawImage(icon, 22, 14, 84, 84);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const sym = { happy: '♥', love: '♥♥', angry: '!!', scared: '!', wait: '…', oops: '><', sad: ':(' }[kind];
  if (sym) {
    g.font = 'bold 54px Arial';
    g.fillStyle = { happy: '#ff6a8a', love: '#ff4a7a', angry: '#e84a3a', scared: '#e8a03a', wait: '#5a6a8a', oops: '#4a8ad8', sad: '#5a8ad8' }[kind];
    g.fillText(sym, 64, 58);
  }
  if (kind === 'miss') {
    g.strokeStyle = '#e84a3a';
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(34, 26);
    g.lineTo(94, 86);
    g.stroke();
  }
  if (kind === 'pricey') {
    g.font = 'bold 34px Arial';
    g.fillStyle = '#e84a3a';
    g.strokeStyle = '#fffaf0';
    g.lineWidth = 6;
    g.strokeText('⚡⚡⚡', 64, 88);
    g.fillText('⚡⚡⚡', 64, 88);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  bubbleCache[key] = new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true });
  return bubbleCache[key];
}

// полоска здоровья (две плоскости, повёрнуты к камере)
function hpBar(w = 0.8, col = '#6ad04a') {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.08, 0.16), new THREE.MeshBasicMaterial({ color: '#2a2430', depthTest: false, transparent: true }));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.09), new THREE.MeshBasicMaterial({ color: col, depthTest: false, transparent: true }));
  fg.position.z = 0.001;
  bg.renderOrder = 10;
  fg.renderOrder = 11;
  g.add(bg, fg);
  g.userData = { fg, w };
  return g;
}
function setBar(bar, f) {
  const U = bar.userData;
  f = Math.max(0, Math.min(1, f));
  U.fg.scale.x = Math.max(0.001, f);
  U.fg.position.x = (-U.w * (1 - f)) / 2;
}

export class View {
  constructor(game, world) {
    this.g = game;
    this.w = world;
    this.t = 0;
    const sc = (this.scene = new THREE.Scene());
    sc.background = new THREE.Color('#a8d8f4');
    sc.fog = new THREE.Fog('#c8e4f4', 40, 95);
    this.hemi = new THREE.HemisphereLight('#d8ecff', '#8a9a70', 1.3);
    sc.add(this.hemi);
    const d = (this.sun = new THREE.DirectionalLight('#fff4e0', 2.4));
    d.castShadow = game.quality !== 'low';
    const ms = game.quality === 'high' ? 2048 : 1024;
    d.shadow.mapSize.set(ms, ms);
    const sz = 26;
    Object.assign(d.shadow.camera, { left: -sz, right: sz, top: sz, bottom: -sz, near: 1, far: 90 });
    d.shadow.bias = -0.0006;
    sc.add(d);
    sc.add(d.target);
    const S = (this.st = buildScene(game.quality));
    sc.add(S.group);
    // свет внутри лавки и у фонарей
    this.inLight = new THREE.PointLight('#ffd890', 0, 18, 1.4);
    this.inLight.position.set(0, 2.6, -7.5);
    sc.add(this.inLight);
    this.lampLights = [new THREE.PointLight('#ffe0a0', 0, 12, 1.5), new THREE.PointLight('#ffe0a0', 0, 12, 1.5)];
    this.lampLights[0].position.set(-8.6, 3.8, 2.5);
    this.lampLights[1].position.set(8.6, 3.8, 3.5);
    for (const l of this.lampLights) sc.add(l);
    // полки
    this.shelfMeshes = [];
    this.shelfSig = [];
    for (let k = 0; k < SHELF_SLOTS.length; k++) {
      const grp = new THREE.Group();
      const [x, z] = SHELF_SLOTS[k];
      grp.position.set(x, 0, z);
      const rack = new THREE.Mesh(S.shelfGeo, MAT);
      rack.castShadow = true;
      rack.receiveShadow = true;
      grp.add(rack);
      const items = new THREE.Group();
      grp.add(items);
      grp.userData.items = items;
      sc.add(grp);
      this.shelfMeshes.push(grp);
      this.shelfSig.push('');
    }
    // продавец
    this.hero = makeHero();
    sc.add(this.hero);
    // тёплый свет вокруг продавца ночью: видно зомби рядом
    this.heroLight = new THREE.PointLight('#ffe8c0', 0, 9, 1.3);
    sc.add(this.heroLight);
    this.heroSh = blobShadow(0.45, 0.32);
    sc.add(this.heroSh);
    this.carry = new THREE.Group();
    this.hero.userData.hand.add(this.carry);
    this.carrySig = '';
    // оружие в руке
    this.weaponMesh = null;
    this.setWeapon(world.weapon.id);
    // кольцо-подсветка цели действия
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.66, 32), new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0.85, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    sc.add(this.ring);
    this.progRing = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.86, 32, 1, 0, Math.PI * 2), new THREE.MeshBasicMaterial({ color: '#6ad04a', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
    this.progRing.rotation.x = -Math.PI / 2;
    this.progRing.visible = false;
    sc.add(this.progRing);
    // указатель обучения: прыгающая стрелка и кольцо на земле
    const ab = new B();
    ab.cone(0.26, 0.42, '#ffe27a', { y: 0.21, rx: Math.PI }, 4);
    ab.box(0.16, 0.36, 0.16, '#ffe27a', { y: 0.58 });
    this.tutArrow = ab.mesh(MAT_GLOW, false);
    this.tutArrow.visible = false;
    sc.add(this.tutArrow);
    this.tutRing = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.8, 32), new THREE.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0.8, depthWrite: false }));
    this.tutRing.rotation.x = -Math.PI / 2;
    this.tutRing.visible = false;
    sc.add(this.tutRing);
    this.tutTarget = null;
    // кольцо у кассы
    this.regRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 28), new THREE.MeshBasicMaterial({ color: '#8ad0ff', transparent: true, opacity: 0.6, depthWrite: false }));
    this.regRing.rotation.x = -Math.PI / 2;
    this.regRing.position.set(5.6, 0.03, -7.65);
    sc.add(this.regRing);
    // блёстки над местами поиска
    this.sparkles = {};
    for (const sp of world.spots) {
      const m = makeSparkle();
      m.position.set(sp.L.ix, 1.9, sp.L.iz);
      sc.add(m);
      this.sparkles[sp.L.id] = m;
    }
    // капканы
    this.trapMeshes = TRAP_SLOTS.map(([x, z]) => {
      const m = makeItem('trap');
      m.scale.setScalar(1.6);
      m.position.set(x, 0.01, z);
      m.visible = false;
      sc.add(m);
      return m;
    });
    // полоски прочности баррикад
    this.barBars = ENTRIES.map((e) => {
      const b = hpBar(1.4, '#f2c84a');
      b.position.set(e.x, e.door ? 2.75 : 2.55, FRONT_Z + WALL_T + 0.3);
      sc.add(b);
      return b;
    });
    // радиовышка
    this.towerStage = -1;
    this.tower = null;
    this.updateTower();
    // сущности
    this.custM = new Map();
    this.staffM = new Map();
    this.zM = new Map();
    this.projM = [];
    this.puddles = [];
    this.parts = [];
    this.partGeo = new THREE.SphereGeometry(1, 8, 6);
    this.camPos = new THREE.Vector3();
    this.camTgt = new THREE.Vector3();
    this.camInit = false;
    this.fade = 1;
    this.shake = 0;
    this.barBase = this.st.barricades.map((m) => m.position.x);
    this.doorK = 0;
    this.applyLight(world.hour);
  }

  setWeapon(id) {
    if (this.weaponMesh) this.hero.userData.arms[1].remove(this.weaponMesh);
    const b = new B();
    switch (id) {
      case 'pin':
        b.cyl(0.05, 0.05, 0.42, '#e0b07a', { rz: 0 }, 10);
        for (const s of [-1, 1]) b.cyl(0.02, 0.02, 0.1, '#c4945a', { y: s * 0.25 }, 6);
        break;
      case 'bat':
        b.cyl(0.07, 0.03, 0.7, '#c4945a', {}, 10);
        b.cyl(0.04, 0.04, 0.12, '#3a3a40', { y: -0.3 }, 8);
        break;
      case 'shovel':
        b.cyl(0.025, 0.025, 0.8, '#a8744a', {}, 8);
        b.box(0.24, 0.3, 0.03, '#8a96a8', { y: 0.5 });
        break;
      case 'axe':
        b.cyl(0.03, 0.03, 0.8, '#a8744a', {}, 8);
        b.box(0.3, 0.2, 0.05, '#e84a3a', { x: 0.12, y: 0.32 });
        b.box(0.08, 0.2, 0.051, '#c8ccd4', { x: 0.28, y: 0.32 });
        break;
      case 'sling':
        b.cyl(0.025, 0.025, 0.3, '#a8744a', {}, 6);
        for (const s of [-1, 1]) b.cyl(0.02, 0.02, 0.2, '#a8744a', { x: s * 0.07, y: 0.22, rz: -s * 0.4 }, 6);
        break;
      case 'nailgun':
        b.box(0.12, 0.3, 0.14, '#f2a63a', { y: 0.05 });
        b.box(0.1, 0.1, 0.36, '#3a3a40', { y: 0.2, z: 0.12 });
        break;
    }
    const m = b.mesh();
    m.position.set(0, -0.3, 0.05);
    m.rotation.x = Math.PI / 2;
    this.hero.userData.arms[1].add(m);
    this.weaponMesh = m;
  }

  updateTower() {
    const st = this.w.s.build.radio || 0;
    if (st === this.towerStage) return;
    this.towerStage = st;
    if (this.tower) this.scene.remove(this.tower);
    this.tower = makeRadioTower(st).mesh();
    this.tower.position.set(this.st.towerPos[0], 0, this.st.towerPos[1]);
    this.scene.add(this.tower);
  }

  applyLight(h) {
    const L = lightAt(h);
    this.scene.background.set(L.sky);
    this.scene.fog.color.set(L.fog);
    this.sun.color.set(L.sun);
    this.sun.intensity = L.si;
    this.hemi.color.set(L.hs);
    this.hemi.groundColor.set(L.hg);
    this.hemi.intensity = L.hi;
    const night = h >= 19.5;
    const k = Math.max(0, Math.min(1, (h - 19) / 2, 30 - h));
    this.inLight.intensity = 6 + k * 14;
    for (const l of this.lampLights) l.intensity = k * 22;
    for (const p of this.st.lampPools) p.material.opacity = k * 0.22;
    for (const hd of this.st.lampHeads) hd.material.color.set(k > 0.3 ? '#fff4c0' : '#d8dce4');
    for (const w of this.st.windowsLit) w.visible = night;
    // солнце идёт с востока на запад
    const a = ((Math.min(h, 20) - 6) / 14) * Math.PI;
    const P = this.w.P;
    const cx = P ? P.x * 0.5 : 0,
      cz = P ? P.z * 0.5 : 0;
    if (h >= 22) this.sun.position.set(cx - 12, 30, cz + 14);
    else this.sun.position.set(cx + Math.cos(a) * 26, 12 + Math.sin(a) * 22, cz + 16);
    this.sun.target.position.set(cx, 0, cz);
  }

  // ---------- кадр ----------
  update(dt) {
    this.t += dt;
    const w = this.w,
      t = this.t;
    const night = w.phase === 'night' || w.phase === 'dawn';
    this.applyLight(w.phase === 'dawn' ? 30 : w.hour);
    this.heroLight.intensity = night ? Math.max(0, Math.min(1, (w.hour - 20) / 1.5, 30 - w.hour)) * 7 : 0;
    this.heroLight.position.set(w.P.x, 2.2, w.P.z + 0.4);
    if (this.st.bulbs) this.st.bulbs.visible = night || w.hour > 18.5 || ((t * 2) | 0) % 2 === 0 || true;
    // передняя стена тает, когда продавец внутри
    const P = w.P;
    const inside = w.inside(P.x, P.z) || P.z < FRONT_Z + 0.5;
    const want = inside ? 0.07 : 1;
    this.fade += (want - this.fade) * Math.min(1, dt * 6);
    for (const m of this.st.fadeMats) {
      m.opacity = this.fade;
      m.depthWrite = this.fade > 0.9;
    }
    if (this.st.sign) {
      this.st.sign.material.opacity = this.fade * this.fade * this.fade;
      this.st.sign.visible = this.fade > 0.05;
      this.st.sign.material.depthWrite = this.fade > 0.9;
    }
    for (const f of this.st.front) f.castShadow = this.fade > 0.5;
    // двери: днём открыты, ночью открываются, когда продавец рядом
    const open = w.doorOpen();
    const dk = ENTRIES.findIndex((e) => e.door);
    const pass = night && !w.sleeping && Math.abs(P.x - ENTRIES[dk].x) < 1.4 && Math.abs(P.z - FRONT_Z) < 1.8;
    this.doorK += ((pass ? 1 : 0) - this.doorK) * Math.min(1, dt * 7);
    this.st.doors.forEach((d, k) => {
      const sx = k ? 1 : -1;
      const tgt = open ? sx * 1.6 : sx * 1.5 * this.doorK;
      d.rotation.y += (tgt - d.rotation.y) * Math.min(1, dt * 5);
    });
    // баррикады
    w.barr.forEach((b, k) => {
      const m = this.st.barricades[k];
      const show = b.hp > 0 && (!b.e.door || !open);
      m.visible = show;
      // доски на двери сдвигаются, пока продавец проходит
      if (b.e.door) m.position.x = this.barBase[k] + this.doorK * 1.5;
      const f = b.hp / b.max;
      m.scale.y = 0.75 + 0.25 * f;
      m.rotation.z = b.hit > 0 ? Math.sin(t * 60) * 0.03 : (1 - f) * 0.06 * (k % 2 ? 1 : -1);
      const bar = this.barBars[k];
      bar.visible = night && b.hp < b.max;
      if (bar.visible) {
        setBar(bar, f);
        bar.userData.fg.material.color.set(f > 0.5 ? '#f2c84a' : f > 0.25 ? '#f29a3a' : '#e84a3a');
        bar.quaternion.copy(this.g.camera.quaternion);
      }
    });
    this.updateShelves();
    this.updateHero(dt);
    this.updateCustomers(dt);
    this.updateStaff(dt);
    this.updateZombies(dt);
    this.updateProj();
    // места поиска
    for (const sp of w.spots) {
      const m = this.sparkles[sp.L.id];
      m.visible = !sp.done;
      if (m.visible) {
        m.position.y = 1.9 + Math.sin(t * 3 + sp.L.ix) * 0.15;
        m.scale.setScalar(1 + Math.sin(t * 5 + sp.L.iz) * 0.15);
      }
    }
    w.traps.forEach((tr, k) => {
      const m = this.trapMeshes[k];
      m.visible = tr.on || tr.snap > 0;
      m.scale.setScalar(1.6 * (tr.snap > 0 ? 1 + tr.snap : 1));
    });
    this.regRing.visible = !night && w.queue.length > 0 && !P.atReg;
    if (this.regRing.visible) this.regRing.material.opacity = 0.45 + Math.sin(t * 5) * 0.25;
    this.updateTower();
    const tg = this.tutTarget;
    this.tutArrow.visible = this.tutRing.visible = !!tg;
    if (tg) {
      // над зомби стрелка выше полоски здоровья
      this.tutArrow.position.set(tg.x, (tg.obj ? 2.75 : 2.2) + Math.abs(Math.sin(t * 4)) * 0.35, tg.z);
      this.tutArrow.rotation.y = t * 2;
      this.tutRing.position.set(tg.x, 0.05, tg.z);
      this.tutRing.scale.setScalar(1 + Math.sin(t * 5) * 0.08);
      this.tutRing.material.opacity = 0.55 + Math.sin(t * 5) * 0.25;
    }
    this.updateParts(dt);
    this.updatePuddles(dt);
  }

  updateShelves() {
    const w = this.w;
    for (let k = 0; k < SHELF_SLOTS.length; k++) {
      const grp = this.shelfMeshes[k];
      const on = k < w.nShelves;
      grp.visible = on;
      if (!on) continue;
      const sh = w.shelves[k];
      const sig = sh.type + ':' + sh.n;
      if (this.shelfSig[k] === sig) continue;
      this.shelfSig[k] = sig;
      const items = grp.userData.items;
      while (items.children.length) items.remove(items.children[0]);
      if (!sh.type || sh.n <= 0) continue;
      const geo = itemGeo(sh.type);
      for (let q = 0; q < sh.n; q++) {
        const lvl = q < 4 ? 0 : 1;
        const i = q % 4;
        const m = new THREE.Mesh(geo, MAT);
        m.castShadow = true;
        m.position.set(-0.6 + i * 0.4, lvl === 0 ? 0.64 : 1.14, 0.06 + ((q * 7) % 3) * 0.02);
        m.rotation.y = ((q * 13) % 5) * 0.12 - 0.2;
        m.scale.setScalar(1.25);
        items.add(m);
      }
    }
  }

  updateHero(dt) {
    const w = this.w,
      P = w.P,
      H = this.hero;
    H.position.set(P.x, 0, P.z);
    H.rotation.y = P.dir;
    this.heroSh.position.set(P.x, 0.02, P.z);
    if (w.sleeping) {
      // спит на раскладушке, головой к подушке
      H.position.set(-0.75, 0.56, -11.55);
      H.rotation.set(0, 0, Math.PI / 2);
      this.heroSh.position.set(-1.6, 0.02, -11.55);
      animPerson(H, 0, 0, {});
    } else if (P.ko) {
      H.rotation.z = 0;
      H.rotation.x = -Math.PI / 2 + 0.2;
      H.position.y = 0.25;
    } else {
      H.rotation.x = 0;
      H.rotation.z = 0;
      animPerson(H, this.t, P.moving ? 1 : 0, { carry: !!P.hand, swing: P.swing, work: !!P.act });
    }
    // мигание при уроне
    H.visible = !(P.hurtT > 0 && ((this.t * 20) | 0) % 2 === 0);
    if (this.weaponMesh) this.weaponMesh.visible = !P.hand;
    // ноша
    const sig = P.hand ? P.hand.type + P.hand.n : '';
    if (sig !== this.carrySig) {
      this.carrySig = sig;
      while (this.carry.children.length) this.carry.remove(this.carry.children[0]);
      if (P.hand) {
        const geo = itemGeo(P.hand.type);
        for (let q = 0; q < P.hand.n; q++) {
          const m = new THREE.Mesh(geo, MAT);
          m.position.set(((q % 2) - 0.5) * 0.18, Math.floor(q / 2) * 0.17, 0);
          m.scale.setScalar(1.05);
          this.carry.add(m);
        }
      }
    }
    // цель действия
    const n = P.near;
    this.ring.visible = !!n && !P.ko && !w.sleeping;
    if (n) {
      this.ring.position.set(n.x, 0.04, n.z);
      this.ring.scale.setScalar(1 + Math.sin(this.t * 6) * 0.06);
    }
    this.progRing.visible = !!P.act && P.act.kind === 'loot';
    if (this.progRing.visible) {
      const f = P.act.t / P.act.dur;
      this.progRing.geometry.dispose();
      this.progRing.geometry = new THREE.RingGeometry(0.72, 0.86, 32, 1, Math.PI / 2, -Math.PI * 2 * f);
      this.progRing.position.set(P.x, 0.05, P.z);
    }
  }

  person(map, key, make) {
    let o = map.get(key);
    if (!o) {
      const m = make();
      this.scene.add(m);
      const sh = blobShadow(0.4, 0.28);
      this.scene.add(sh);
      o = { m, sh, bub: null, carry: null, carrySig: '' };
      map.set(key, o);
    }
    o.alive = true;
    return o;
  }

  sweep(map) {
    for (const [k, o] of map) {
      if (!o.alive) {
        this.scene.remove(o.m);
        this.scene.remove(o.sh);
        if (o.bub) this.scene.remove(o.bub);
        if (o.bar) this.scene.remove(o.bar);
        map.delete(k);
      } else o.alive = false;
    }
  }

  bubble(o, b, y) {
    if (b) {
      if (!o.bub) {
        o.bub = new THREE.Sprite(bubbleTex(b.kind, b.type));
        o.bub.scale.set(0.75, 0.75, 1);
        o.bub.renderOrder = 20;
        this.scene.add(o.bub);
      }
      const mat = bubbleTex(b.kind, b.type);
      if (o.bub.material !== mat) o.bub.material = mat;
      o.bub.position.set(o.m.position.x, y + Math.sin(this.t * 4) * 0.05, o.m.position.z);
      const s = Math.min(1, (2.4 - Math.max(0, b.t - (b.t > 2 ? b.t - 2 : 0))) * 4) * 0.75;
      o.bub.scale.set(0.75, 0.75, 1);
    } else if (o.bub) {
      this.scene.remove(o.bub);
      o.bub = null;
    }
  }

  carryOn(o, type) {
    const sig = type || '';
    if (sig === o.carrySig) return;
    o.carrySig = sig;
    if (o.carry) o.m.userData.hand.remove(o.carry);
    o.carry = null;
    if (type) {
      o.carry = new THREE.Mesh(itemGeo(type), MAT);
      o.carry.scale.setScalar(1.1);
      o.m.userData.hand.add(o.carry);
    }
  }

  updateCustomers(dt) {
    const w = this.w;
    for (const c of w.custs) {
      const o = this.person(this.custM, c.id, () => makeCustomer(c.look));
      o.m.position.set(c.x, 0, c.z);
      o.m.rotation.y = c.dir;
      o.sh.position.set(c.x, 0.02, c.z);
      animPerson(o.m, this.t + c.id, c.moving ? (c.state === 'flee' ? 1.4 : 1) : 0, { seed: c.id, carry: c.got.length > 0 });
      this.carryOn(o, c.got[0]);
      // хочет товар — показываем, пока идёт к полке
      let b = c.bubble;
      if (!b && c.state === 'in' && c.wants.length && w.time % 6 < 2.5) b = { kind: 'want', type: c.wants[0], t: 1 };
      this.bubble(o, b, 2.2 * o.m.scale.y);
    }
    this.sweep(this.custM);
  }

  updateStaff(dt) {
    const w = this.w;
    for (const st of w.staff) {
      if (st.state === 'away') continue;
      const o = this.person(this.staffM, st.s.id, () => makeStaff(st.s.role, st.s.look));
      o.m.position.set(st.x, 0, st.z);
      o.m.rotation.y = st.dir;
      o.sh.position.set(st.x, 0.02, st.z);
      if (st.ko || st.state === 'rest') {
        o.m.rotation.x = st.ko ? -Math.PI / 2 + 0.2 : 0;
        o.m.position.y = st.ko ? 0.25 : 0;
        animPerson(o.m, this.t, 0, {});
      } else {
        o.m.rotation.x = 0;
        animPerson(o.m, this.t + st.s.id * 3, st.moving ? 1 : 0, { seed: st.s.id, carry: !!st.carry, swing: st.swing, work: st.state === 'reg' && w.co && !w.P.atReg });
      }
      this.carryOn(o, st.carry && st.carry.type);
      this.bubble(o, st.ko ? { kind: 'sad', t: 1 } : st.state === 'off' ? { kind: 'wait', t: 1 } : null, 2.3);
    }
    this.sweep(this.staffM);
  }

  updateZombies(dt) {
    const w = this.w;
    const cam = this.g.camera;
    for (const z of w.zs) {
      const o = this.person(this.zM, z.id, () => makeZombie(z.type, z.look));
      const base = o.m.userData.base || (o.m.userData.base = o.m.scale.x);
      o.m.position.set(z.x, 0, z.z);
      o.m.rotation.y = z.dir;
      o.sh.position.set(z.x, 0.02, z.z);
      o.sh.scale.setScalar(base);
      if (z.dead) {
        // исчезает «пуф»
        const k = Math.max(0, 1 - z.dead * 3);
        o.m.scale.setScalar(base * (0.2 + k * 0.8));
        o.m.position.y = z.dead * 0.6;
        o.m.visible = k > 0.05;
        if (o.bar) o.bar.visible = false;
        continue;
      }
      o.m.visible = true;
      const sq = z.hit > 0 ? 1 + z.hit * 1.2 : 1;
      o.m.scale.set(base * sq, base / sq, base * sq);
      if (z.type === 'bloater') o.m.scale.multiplyScalar(1 + Math.sin(this.t * 6 + z.id) * 0.04);
      animZombie(o.m, this.t, z.moving, { seed: z.id, atk: z.atk, scream: z.screamT, spit: z.type === 'spitter' && z.atk > 0, carry: !!z.carry });
      // вор несёт украденное
      const cs = z.carry ? z.carry.type : '';
      if (cs !== (o.zc || '')) {
        o.zc = cs;
        if (o.zcm) o.m.userData.hand.remove(o.zcm);
        o.zcm = null;
        if (cs) {
          o.zcm = new THREE.Mesh(itemGeo(cs), MAT);
          o.zcm.scale.setScalar(1.3);
          o.m.userData.hand.add(o.zcm);
        }
      }
      if (z.stun > 0) o.m.rotation.y += Math.sin(this.t * 30) * 0.2;
      // белая вспышка при ударе
      const flash = z.hit > 0.08;
      if (flash !== o.flash) {
        o.flash = flash;
        o.m.traverse((x) => {
          if (x.isMesh) x.material = flash ? HIT : MAT;
        });
      }
      if (z.hp < z.max) {
        if (!o.bar) {
          o.bar = hpBar(z.type === 'boss' ? 1.6 : 0.7, '#e84a5a');
          this.scene.add(o.bar);
        }
        o.bar.visible = true;
        setBar(o.bar, z.hp / z.max);
        o.bar.position.set(z.x, 1.75 * base + 0.2, z.z);
        o.bar.quaternion.copy(cam.quaternion);
      }
    }
    this.sweep(this.zM);
  }

  updateProj() {
    const w = this.w;
    while (this.projM.length < w.proj.length) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshBasicMaterial({ color: '#f4f0e0' }));
      this.scene.add(m);
      this.projM.push(m);
    }
    this.projM.forEach((m, k) => {
      const p = w.proj[k];
      m.visible = !!p;
      if (p) {
        m.position.set(p.x, p.y, p.z);
        m.material.color.set(p.kind === 'spit' ? '#8ad04a' : p.kind === 'stone' ? '#a8a49a' : '#f2e07a');
        m.scale.setScalar(p.kind === 'spit' ? 2.2 : 1);
      }
    });
  }

  // ---------- частицы ----------
  burst(x, y, z, n, col, o = {}) {
    for (let k = 0; k < n; k++) {
      let m = this.parts.find((p) => !p.on);
      if (!m) {
        if (this.parts.length > 220) break;
        m = { mesh: new THREE.Mesh(this.partGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false })) };
        this.scene.add(m.mesh);
        this.parts.push(m);
      }
      m.on = true;
      m.mesh.visible = true;
      m.mesh.material.color.set(Array.isArray(col) ? col[k % col.length] : col);
      m.mesh.position.set(x + (Math.random() - 0.5) * (o.spread || 0.4), y, z + (Math.random() - 0.5) * (o.spread || 0.4));
      const a = Math.random() * Math.PI * 2,
        sp = (o.speed || 2) * (0.5 + Math.random());
      m.vx = Math.cos(a) * sp;
      m.vz = Math.sin(a) * sp;
      m.vy = (o.up ?? 2) * (0.5 + Math.random());
      m.life = m.max = (o.life || 0.6) * (0.7 + Math.random() * 0.6);
      m.size = (o.size || 0.12) * (0.6 + Math.random() * 0.8);
      m.grav = o.grav ?? 6;
      m.grow = o.grow || 0;
    }
  }

  // лужи слизи плевуна
  updatePuddles(dt) {
    for (const q of this.puddles) {
      if (q.t <= 0) continue;
      q.t -= dt;
      q.m.visible = q.t > 0;
      q.m.material.opacity = Math.min(0.75, q.t);
      q.m.scale.setScalar(Math.min(1, (2.2 - q.t) * 6));
    }
  }

  updateParts(dt) {
    for (const p of this.parts) {
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.on = false;
        p.mesh.visible = false;
        continue;
      }
      p.vy -= p.grav * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y = Math.max(0.05, p.mesh.position.y + p.vy * dt);
      p.mesh.position.z += p.vz * dt;
      const f = p.life / p.max;
      p.mesh.scale.setScalar(p.size * (p.grow ? 1 + (1 - f) * p.grow : 1));
      p.mesh.material.opacity = Math.min(1, f * 2);
    }
  }

  onFx(e) {
    switch (e.t) {
      case 'zdie':
        this.burst(e.x, 0.9, e.z, e.boss ? 26 : 12, ['#e8f0e0', '#c8e0c0', '#ffffff'], { speed: 1.4, up: 1.2, life: 0.7, size: 0.22, grav: -0.5, grow: 1.5, spread: 0.6 });
        if (e.boss) this.shake = 0.6;
        break;
      case 'boom':
        this.burst(e.x, 0.9, e.z, 26, ['#c8e870', '#a8d850', '#ff9ad8', '#fff07a'], { speed: 4, up: 3, life: 0.8, size: 0.16 });
        this.burst(e.x, 0.8, e.z, 10, '#d8f0b0', { speed: 1.5, up: 0.8, life: 0.9, size: 0.4, grav: -0.5, grow: 1.4 });
        this.shake = 0.35;
        break;
      case 'zhit':
        if (e.armor) this.burst(e.x, 1.9, e.z, 5, ['#fff07a', '#ffffff'], { speed: 3, up: 2, life: 0.25, size: 0.05 });
        else this.burst(e.x, 1.1, e.z, 3, ['#ffffff', '#e8f0a0'], { speed: 2, up: 1.5, life: 0.3, size: 0.07 });
        break;
      case 'splat': {
        let q = this.puddles.find((p) => p.t <= 0);
        if (!q) {
          const m = new THREE.Mesh(new THREE.CircleGeometry(0.75, 20), new THREE.MeshBasicMaterial({ color: '#8ad04a', transparent: true, opacity: 0.7, depthWrite: false }));
          m.rotation.x = -Math.PI / 2;
          this.scene.add(m);
          q = { m, t: 0 };
          this.puddles.push(q);
        }
        q.t = 2.2;
        q.m.position.set(e.x, 0.03, e.z);
        this.burst(e.x, 0.3, e.z, 10, ['#8ad04a', '#b8f070'], { speed: 2, up: 2, life: 0.4, size: 0.08 });
        break;
      }
      case 'zscream':
        this.burst(e.x, 1.8, e.z, 14, ['#ffffff', '#f0d0e8'], { speed: 3.5, up: 0.4, life: 0.6, size: 0.1, grav: 0, grow: 2 });
        break;
      case 'heal':
        this.burst(e.x, 1.2, e.z, 12, ['#ff8a9a', '#ffffff', '#a8f07a'], { speed: 0.8, up: 2.2, life: 0.9, size: 0.08, grav: -0.5 });
        break;
      case 'recovered':
      case 'thiefGone':
        this.burst(e.x || 0, 1.2, e.z || 0, 8, ['#f2c84a', '#ffffff'], { speed: 1.4, up: 2.5, life: 0.6, size: 0.07 });
        break;
      case 'barHit':
        this.burst(e.x + (Math.random() - 0.5) * 1.4, 1.2, FRONT_Z + 0.5, 4, ['#d8a86a', '#b8844a'], { speed: 2.2, up: 2.5, life: 0.5, size: 0.08 });
        break;
      case 'barBreak':
        this.burst(e.x, 1.2, FRONT_Z + 0.5, 18, ['#d8a86a', '#b8844a', '#e0b07a'], { speed: 3.5, up: 3.5, life: 0.8, size: 0.12, spread: 1.4 });
        this.shake = 0.3;
        break;
      case 'repair':
        this.burst(e.x, 1.4, FRONT_Z - 0.2, 5, ['#fff07a', '#ffffff'], { speed: 1.2, up: 2, life: 0.4, size: 0.06 });
        break;
      case 'loot':
        this.burst(e.x, 1.2, e.z, 12, ['#ffe27a', '#ffffff', '#8ad0ff'], { speed: 1.6, up: 3, life: 0.7, size: 0.08 });
        break;
      case 'trap':
        this.burst(e.x, 0.4, e.z, 8, ['#c8ccd4', '#ffffff'], { speed: 2.5, up: 2, life: 0.4, size: 0.07 });
        break;
      case 'sale':
        this.burst(REG.x, 1.6, REG.z, e.n > 15 ? 14 : 8, ['#f2c84a', '#ffe27a', '#ffffff'], { speed: 1.2, up: 3, life: 0.6, size: 0.07 });
        break;
      case 'gift':
        this.burst(REG.x, 1.8, REG.z + 0.8, 14, ['#ff6a8a', '#ff9ab0', '#ffffff'], { speed: 1.2, up: 2.5, life: 0.9, size: 0.09, grav: 1 });
        break;
      case 'crafted':
        this.burst(BENCH.x, 1.4, BENCH.z - 0.8, 10, ['#fff07a', '#ffffff', '#8ad0ff'], { speed: 1.2, up: 2.5, life: 0.6, size: 0.07 });
        break;
      case 'slam':
        this.burst(e.x, 0.15, e.z, 18, ['#b8b0a0', '#8a8478'], { speed: 4, up: 1.2, life: 0.5, size: 0.14 });
        this.shake = 0.4;
        break;
      case 'hurt':
        this.shake = Math.max(this.shake, 0.18);
        this.burst(e.x, 1.2, e.z, 5, ['#ff8a9a', '#ffffff'], { speed: 1.8, up: 2, life: 0.35, size: 0.07 });
        break;
      case 'lvl':
        this.burst(this.w.P.x, 1.5, this.w.P.z, 20, ['#ffe27a', '#8ad0ff', '#ff9ab0', '#a8f07a'], { speed: 2.4, up: 4, life: 0.9, size: 0.08 });
        break;
      case 'scavBack':
        this.burst(e.x, 1.5, e.z, 10, ['#ffe27a', '#ffffff'], { speed: 1.4, up: 3, life: 0.6, size: 0.08 });
        break;
    }
  }

  // ---------- камера ----------
  camera(cam, dt, snap = false) {
    const w = this.w,
      P = w.P;
    const portrait = cam.aspect < 1;
    const night = w.phase === 'night';
    let tx = P.x,
      tz = P.z;
    // ночью камера идёт за продавцом по всей стоянке
    if (w.sleeping) {
      tx = -1.6;
      tz = -9.5;
    }
    tx = Math.max(portrait ? -15 : -13, Math.min(portrait ? 15 : 13, tx));
    tz = Math.max(-9.5, Math.min(12, tz));
    const dist = portrait ? 1.32 : 1;
    const ox = 0,
      oy = (portrait ? 15.5 : 12.2) * (night ? 1.08 : 1),
      oz = (portrait ? 11.5 : 10.4) * (night ? 1.05 : 1);
    this.camTgt.set(tx, 0, tz);
    const want = _v.set(tx + ox, oy * (portrait ? 1 : dist), tz + oz * dist);
    if (snap || !this.camInit) {
      this.camPos.copy(want);
      this.camLook = this.camTgt.clone();
      this.camInit = true;
    } else {
      const k = Math.min(1, dt * 4.5);
      this.camPos.lerp(want, k);
      this.camLook.lerp(this.camTgt, k);
    }
    cam.position.copy(this.camPos);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      cam.position.x += (Math.random() - 0.5) * this.shake * 0.6;
      cam.position.y += (Math.random() - 0.5) * this.shake * 0.6;
    }
    cam.lookAt(this.camLook.x, 0.6, this.camLook.z - 0.6);
  }

  toScreen(cam, x, y, z, W, H) {
    _v.set(x, y, z).project(cam);
    return [(_v.x * 0.5 + 0.5) * W, (-_v.y * 0.5 + 0.5) * H, _v.z < 1];
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o.geometry && o.geometry !== this.partGeo) o.geometry.dispose();
    });
  }
}
