// Статичная сцена: парковка, дорога, лавка (стены, вывеска, мебель), машины, деревья, фон города
import * as THREE from 'three';
import { B, MAT, MAT_GLOW, GRAD } from './gfx.js';
import { SHOP, ENTRIES, FRONT_Z, WALL_T, REG, LOOT_SPOTS, SHELF_SLOTS, ROAD, LOT } from './data.js';
import { DECOR } from './nav.js';
import { makeCounter, makeStorage, makeBench, makeCot, makeCar, makeLamp, makeTree, makeBush, makeCone, makeTire, makeBarrel, makeShelf, makeBarricade, makeRadioTower, shade, rng } from './models.js';
import { LANG } from './i18n.js';

const WALL_H = 2.9;

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}
const toon = (map, o = {}) => new THREE.MeshToonMaterial(Object.assign({ map, gradientMap: GRAD }, o));

// ---------- земля: асфальт парковки, разметка, трещины, дорога, тротуар, газон ----------
const GX0 = -34,
  GZ0 = -26,
  GW = 68,
  GH = 62,
  PPM = 22;
function groundTex() {
  return canvasTex(GW * PPM, GH * PPM, (g, W, H) => {
    const X = (x) => (x - GX0) * PPM,
      Z = (z) => (z - GZ0) * PPM;
    const r = rng(7);
    // газон
    g.fillStyle = '#8cc46a';
    g.fillRect(0, 0, W, H);
    for (let k = 0; k < 2600; k++) {
      g.fillStyle = r() < 0.5 ? 'rgba(110,170,80,.5)' : 'rgba(160,210,110,.45)';
      g.fillRect(r() * W, r() * H, 3 + r() * 5, 3 + r() * 5);
    }
    // асфальт парковки
    const lot = [X(LOT.x0), Z(LOT.z0), X(LOT.x1) - X(LOT.x0), Z(LOT.z1) - Z(LOT.z0)];
    g.fillStyle = '#7d8290';
    g.fillRect(...lot);
    for (let k = 0; k < 9000; k++) {
      const v = 110 + ((r() * 40) | 0);
      g.fillStyle = `rgba(${v},${v + 4},${v + 14},.35)`;
      g.fillRect(lot[0] + r() * lot[2], lot[1] + r() * lot[3], 2 + r() * 3, 2 + r() * 3);
    }
    // пятна и лужи
    for (let k = 0; k < 14; k++) {
      g.fillStyle = 'rgba(60,62,74,.25)';
      g.beginPath();
      g.ellipse(lot[0] + r() * lot[2], lot[1] + r() * lot[3], 20 + r() * 40, 12 + r() * 20, r() * 3, 0, 7);
      g.fill();
    }
    // бордюр
    g.strokeStyle = '#c8c8c0';
    g.lineWidth = 10;
    g.strokeRect(...lot);
    // разметка мест: ряды по бокам
    g.strokeStyle = 'rgba(250,250,240,.85)';
    g.lineWidth = 5;
    const rowsX = [[-20.6, -12.4], [12.4, 20.6]];
    for (const [a, b2] of rowsX)
      for (let z = -10; z <= 12; z += 2.8) {
        g.beginPath();
        g.moveTo(X(a), Z(z));
        g.lineTo(X(b2), Z(z));
        g.stroke();
      }
    // разметка по центру внизу
    for (let x = -11; x <= 11; x += 2.7) {
      if (Math.abs(x) < 3.5) continue;
      g.beginPath();
      g.moveTo(X(x), Z(6.5));
      g.lineTo(X(x), Z(11.5));
      g.stroke();
    }
    // жёлтые стрелки и пунктир проезда
    g.strokeStyle = 'rgba(250,210,80,.85)';
    g.lineWidth = 6;
    g.setLineDash([24, 18]);
    g.beginPath();
    g.moveTo(X(0), Z(13.6));
    g.lineTo(X(0), Z(-0.6));
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = 'rgba(250,250,240,.8)';
    for (const z of [9, 3.5]) {
      g.beginPath();
      g.moveTo(X(-1.4), Z(z));
      g.lineTo(X(-0.9), Z(z - 1.0));
      g.lineTo(X(-0.4), Z(z));
      g.lineTo(X(-0.75), Z(z));
      g.lineTo(X(-0.75), Z(z + 0.9));
      g.lineTo(X(-1.05), Z(z + 0.9));
      g.lineTo(X(-1.05), Z(z));
      g.closePath();
      g.fill();
    }
    // буква P
    g.font = `bold ${PPM * 2.4}px Arial`;
    g.fillStyle = 'rgba(250,250,240,.5)';
    g.fillText('P', X(-17.5), Z(-0.5));
    // трещины с травой
    for (let k = 0; k < 26; k++) {
      let x = lot[0] + r() * lot[2],
        z = lot[1] + r() * lot[3];
      g.strokeStyle = 'rgba(50,52,62,.6)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x, z);
      const n = 4 + ((r() * 6) | 0);
      for (let q = 0; q < n; q++) {
        x += (r() - 0.5) * 50;
        z += (r() - 0.5) * 50;
        g.lineTo(x, z);
        if (r() < 0.4) {
          g.fillStyle = 'rgba(110,170,80,.85)';
          g.fillRect(x - 3, z - 3, 6, 6);
        }
      }
      g.stroke();
    }
    // люк
    for (const [mx, mz] of [[6.5, 10.5], [-8, 0.5]]) {
      g.fillStyle = '#5a5e68';
      g.beginPath();
      g.arc(X(mx), Z(mz), PPM * 0.55, 0, 7);
      g.fill();
      g.strokeStyle = '#484c56';
      g.lineWidth = 3;
      for (let q = -2; q <= 2; q++) {
        g.beginPath();
        g.moveTo(X(mx) - PPM * 0.4, Z(mz) + q * 6);
        g.lineTo(X(mx) + PPM * 0.4, Z(mz) + q * 6);
        g.stroke();
      }
    }
    // тротуар
    g.fillStyle = '#c8c4b8';
    g.fillRect(X(-34), Z(14.2), W, (ROAD.z0 - 14.2) * PPM);
    g.fillRect(X(-34), Z(ROAD.z1), W, 1.6 * PPM);
    g.strokeStyle = 'rgba(150,146,136,.7)';
    g.lineWidth = 2;
    for (let x = -34; x < 34; x += 1.2) {
      g.beginPath();
      g.moveTo(X(x), Z(14.2));
      g.lineTo(X(x), Z(ROAD.z0));
      g.moveTo(X(x), Z(ROAD.z1));
      g.lineTo(X(x), Z(ROAD.z1 + 1.6));
      g.stroke();
    }
    // дорога
    g.fillStyle = '#5e6270';
    g.fillRect(X(-34), Z(ROAD.z0), W, (ROAD.z1 - ROAD.z0) * PPM);
    for (let k = 0; k < 5000; k++) {
      const v = 80 + ((r() * 30) | 0);
      g.fillStyle = `rgba(${v},${v + 4},${v + 14},.35)`;
      g.fillRect(r() * W, Z(ROAD.z0) + r() * (ROAD.z1 - ROAD.z0) * PPM, 3, 3);
    }
    g.strokeStyle = 'rgba(250,210,80,.9)';
    g.lineWidth = 6;
    g.setLineDash([40, 30]);
    g.beginPath();
    g.moveTo(0, Z((ROAD.z0 + ROAD.z1) / 2));
    g.lineTo(W, Z((ROAD.z0 + ROAD.z1) / 2));
    g.stroke();
    g.setLineDash([]);
    // зебра у въезда
    g.fillStyle = 'rgba(250,250,240,.85)';
    for (let k = 0; k < 7; k++) g.fillRect(X(-3 + k * 0.9), Z(ROAD.z0 + 0.3), 0.5 * PPM, (ROAD.z1 - ROAD.z0 - 0.6) * PPM);
    // палая листва
    for (let k = 0; k < 220; k++) {
      g.fillStyle = ['#e8a04a', '#d8763a', '#f2c84a'][k % 3];
      g.beginPath();
      g.ellipse(r() * W, r() * H, 4, 2.5, r() * 3, 0, 7);
      g.fill();
    }
  });
}

function floorTex() {
  return canvasTex(512, 512, (g, W, H) => {
    const n = 8,
      s = W / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        g.fillStyle = (i + j) % 2 ? '#e8dcc4' : '#c8b898';
        g.fillRect(i * s, j * s, s, s);
      }
    const r = rng(3);
    for (let k = 0; k < 600; k++) {
      g.fillStyle = 'rgba(120,100,70,.12)';
      g.fillRect(r() * W, r() * H, 2 + r() * 3, 2 + r() * 3);
    }
    g.strokeStyle = 'rgba(90,70,50,.25)';
    g.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath();
      g.moveTo(i * s, 0);
      g.lineTo(i * s, H);
      g.moveTo(0, i * s);
      g.lineTo(W, i * s);
      g.stroke();
    }
  }, [4, 2.25]);
}

function brickTex() {
  return canvasTex(256, 256, (g, W, H) => {
    g.fillStyle = '#d8c8b0';
    g.fillRect(0, 0, W, H);
    const r = rng(11);
    const bw = 64,
      bh = 28;
    for (let j = 0; j < H / bh + 1; j++)
      for (let i = -1; i < W / bw + 1; i++) {
        const x = i * bw + (j % 2 ? bw / 2 : 0);
        const v = r();
        g.fillStyle = v < 0.33 ? '#c86a4a' : v < 0.66 ? '#d87a56' : '#b85e44';
        g.fillRect(x + 3, j * bh + 3, bw - 6, bh - 6);
      }
  }, [1, 1]);
}

// вывеска «ЛАВКА ВЫЖИВШИХ» на картоне
function signTex() {
  return canvasTex(1024, 256, (g, W, H) => {
    g.fillStyle = '#d8b07a';
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(160,120,70,.25)';
    for (let x = 0; x < W; x += 14) g.fillRect(x, 0, 6, H);
    // скотч по углам
    g.fillStyle = 'rgba(240,235,210,.8)';
    for (const [x, y, a] of [[40, 30, -0.6], [W - 40, 30, 0.6], [40, H - 30, 0.6], [W - 40, H - 30, -0.6]]) {
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillRect(-50, -14, 100, 28);
      g.restore();
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `128px "Rubik Dirt", Neucha, sans-serif`;
    g.lineWidth = 10;
    g.strokeStyle = '#2a2430';
    g.fillStyle = '#e8503a';
    const t = LANG === 'en' ? 'SURVIVOR MART' : 'ЛАВКА ВЫЖИВШИХ';
    g.save();
    g.translate(W / 2, H / 2 - 10);
    g.rotate(-0.02);
    const sc = Math.min(1, (W - 80) / g.measureText(t).width);
    g.scale(sc, sc);
    g.strokeText(t, 0, 0);
    g.fillText(t, 0, 0);
    g.restore();
    g.font = '40px Neucha, sans-serif';
    g.fillStyle = '#2a2430';
    g.fillText(LANG === 'en' ? 'batteries accepted • open daily' : 'принимаем батарейки • открыто каждый день', W / 2, H - 34);
  });
}

function posterTex(kind) {
  return canvasTex(128, 160, (g, W, H) => {
    g.fillStyle = kind === 0 ? '#f4ead8' : kind === 1 ? '#a8d8f0' : '#f2c84a';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#2a2430';
    g.lineWidth = 5;
    g.strokeRect(4, 4, W - 8, H - 8);
    g.fillStyle = '#2a2430';
    g.font = '22px Neucha, sans-serif';
    g.textAlign = 'center';
    if (kind === 0) {
      // батарейка со звёздочкой
      g.fillStyle = '#3a3a44';
      g.fillRect(40, 40, 48, 80);
      g.fillStyle = '#f2c84a';
      g.fillRect(40, 40, 48, 30);
      g.fillStyle = '#c8ccd4';
      g.fillRect(56, 30, 16, 10);
      g.fillStyle = '#2a2430';
      g.fillText('100%', W / 2, 145);
    } else if (kind === 1) {
      g.fillStyle = '#6ac04a';
      g.beginPath();
      g.arc(64, 70, 34, 0, 7);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(52, 64, 8, 0, 7);
      g.arc(76, 64, 8, 0, 7);
      g.fill();
      g.strokeStyle = '#e84a4a';
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(20, 20);
      g.lineTo(108, 120);
      g.stroke();
      g.fillStyle = '#2a2430';
      g.fillText(LANG === 'en' ? 'NO ZOMBIES' : 'БЕЗ ЗОМБИ', W / 2, 145);
    } else {
      g.fillStyle = '#e84a4a';
      g.fillRect(50, 35, 28, 80);
      g.fillRect(24, 61, 80, 28);
      g.fillStyle = '#2a2430';
      g.fillText(LANG === 'en' ? 'FIRST AID' : 'АПТЕЧКИ', W / 2, 145);
    }
  });
}

// ---------- фон: городские дома вокруг ----------
function cityRing(group, windowsLit) {
  const r = rng(21);
  const blocks = new B(),
    lit = new B(),
    dim = new B();
  const cols = ['#c8b8a8', '#a8b8c8', '#d8c8a0', '#b8a8b8', '#c8c0b0', '#a8c0b0'];
  const place = (x, z, w, d, h, ry) => {
    const c = cols[(r() * cols.length) | 0];
    blocks.box(w, h, d, c, { x, y: h / 2, z, ry });
    blocks.box(w + 0.2, 0.25, d + 0.2, shade(c, -0.25), { x, y: h + 0.12, z, ry });
    // окна
    const fx = Math.cos(ry),
      fz = -Math.sin(ry);
    const nx = Math.max(1, Math.floor(w / 1.6)),
      ny = Math.max(1, Math.floor((h - 1) / 1.5));
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < ny; j++) {
        const ox = (i - (nx - 1) / 2) * 1.6;
        const wx = x + fx * ox + Math.sin(ry) * (d / 2 + 0.02),
          wz = z + fz * ox + Math.cos(ry) * (d / 2 + 0.02);
        const on = r() < 0.32;
        (on ? lit : dim).box(0.7, 0.8, 0.05, on ? '#ffd88a' : '#5a6a7a', { x: wx, y: 1.2 + j * 1.5, z: wz, ry });
        if (!on && r() < 0.3) blocks.box(0.85, 0.12, 0.07, '#b8844a', { x: wx, y: 1.2 + j * 1.5, z: wz, ry: ry, rz: 0.3 }); // заколочено
      }
  };
  // за забором (север)
  for (let x = -40; x <= 40; x += 7 + r() * 3) place(x, -24 - r() * 4, 6 + r() * 2, 5, 7 + r() * 8, 0);
  // за дорогой (юг)
  for (let x = -40; x <= 40; x += 7.5 + r() * 3) if (Math.abs(x - 14) > 4) place(x, 30 + r() * 3, 6 + r() * 2, 5, 4 + r() * 6, Math.PI);
  // по бокам
  for (let z = -18; z <= 24; z += 7 + r() * 2) {
    place(-33 - r() * 3, z, 5, 6, 4 + r() * 6, -Math.PI / 2);
    place(33 + r() * 3, z, 5, 6, 4 + r() * 6, Math.PI / 2);
  }
  const m = blocks.mesh(MAT, false);
  m.receiveShadow = false;
  group.add(m);
  group.add(dim.mesh(MAT, false));
  const L = new THREE.Mesh(lit.geometry(), MAT_GLOW);
  group.add(L);
  windowsLit.push(L);
  // холмы далеко
  const hills = new B();
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2;
    hills.sph(12 + r() * 8, r() < 0.5 ? '#7aa86a' : '#6a9a6a', { x: Math.cos(a) * 70, y: -4, z: Math.sin(a) * 70, sy: 0.6 });
  }
  group.add(hills.mesh(MAT, false));
}

export function buildScene(quality, opts = {}) {
  const group = new THREE.Group();
  const out = { group, lampHeads: [], lampPools: [], windowsLit: [], front: [], fadeMats: [], shelves: [], barricades: [], doors: [], tower: null, spots: {} };
  // земля
  const gt = groundTex();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GW, GH), toon(gt));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(GX0 + GW / 2, 0, GZ0 + GH / 2);
  ground.receiveShadow = true;
  group.add(ground);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshToonMaterial({ color: '#86ba66', gradientMap: GRAD }));
  far.rotation.x = -Math.PI / 2;
  far.position.y = -0.02;
  group.add(far);
  cityRing(group, out.windowsLit);

  const S = SHOP;
  // пол лавки
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(S.x1 - S.x0, FRONT_Z - S.z0), toon(floorTex()));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.012, (S.z0 + FRONT_Z) / 2);
  floor.receiveShadow = true;
  group.add(floor);
  // коврик у входа
  const deco = new B();
  deco.box(2.2, 0.02, 1.2, '#c4544a', { y: 0.02, z: FRONT_Z - 0.75 });
  deco.box(2.0, 0.022, 1.0, '#e8c070', { y: 0.021, z: FRONT_Z - 0.75 });
  // стены из кирпича
  const bt = brickTex();
  const wallMat = (len) => {
    const t = bt.clone();
    t.needsUpdate = true;
    t.repeat.set(len / 1.6, WALL_H / 0.7);
    return toon(t);
  };
  const wall = (x, z, w, d, h = WALL_H, y0 = 0, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || wallMat(Math.max(w, d)));
    m.position.set(x, y0 + h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };
  wall(0, S.z0 - WALL_T / 2, S.x1 - S.x0 + WALL_T * 2, WALL_T);
  wall(S.x0 - WALL_T / 2, (S.z0 + FRONT_Z) / 2, WALL_T, FRONT_Z - S.z0 + WALL_T * 2);
  wall(S.x1 + WALL_T / 2, (S.z0 + FRONT_Z) / 2, WALL_T, FRONT_Z - S.z0 + WALL_T * 2);
  // карниз по верху стен
  const trim = new B();
  trim.box(S.x1 - S.x0 + 0.9, 0.18, 0.5, '#8a5a40', { y: WALL_H + 0.09, z: S.z0 - WALL_T / 2 });
  for (const sx of [-1, 1]) trim.box(0.5, 0.18, FRONT_Z - S.z0 + 0.9, '#8a5a40', { x: sx * (S.x1 + WALL_T / 2), y: WALL_H + 0.09, z: (S.z0 + FRONT_Z) / 2 });
  // передняя стена — отдельно, она тает, когда продавец внутри
  const fmat = wallMat(4);
  fmat.transparent = true;
  out.fadeMats.push(fmat);
  const fz = FRONT_Z + WALL_T / 2;
  const segs = [];
  let x = S.x0 - WALL_T;
  const ents = [...ENTRIES].sort((a, b) => a.x - b.x);
  for (const e of ents) {
    segs.push([x, e.x - e.w / 2]);
    x = e.x + e.w / 2;
  }
  segs.push([x, S.x1 + WALL_T]);
  for (const [a, b2] of segs) out.front.push(wall((a + b2) / 2, fz, b2 - a, WALL_T, WALL_H, 0, fmat));
  for (const e of ENTRIES) {
    if (e.door) out.front.push(wall(e.x, fz, e.w, WALL_T, WALL_H - 2.3, 2.3, fmat));
    else {
      out.front.push(wall(e.x, fz, e.w, WALL_T, 0.85, 0, fmat));
      out.front.push(wall(e.x, fz, e.w, WALL_T, WALL_H - 2.2, 2.2, fmat));
    }
  }
  // наружный декор фасада: рамы окон, козырёк-маркиза, вывеска, гирлянда
  const fb = new B();
  for (const e of ENTRIES) {
    const top = e.door ? 2.3 : 2.2,
      bot = e.door ? 0 : 0.85;
    for (const sx of [-1, 1]) fb.box(0.12, top - bot + 0.12, 0.12, '#f4ead8', { x: e.x + sx * (e.w / 2 + 0.02), y: (top + bot) / 2, z: FRONT_Z + WALL_T + 0.04 });
    fb.box(e.w + 0.3, 0.12, 0.14, '#f4ead8', { x: e.x, y: top + 0.04, z: FRONT_Z + WALL_T + 0.05 });
    if (!e.door) fb.box(e.w + 0.3, 0.1, 0.3, '#f4ead8', { x: e.x, y: bot, z: FRONT_Z + WALL_T + 0.1 });
    // ящик с цветами под окном
    if (!e.door) {
      fb.box(e.w, 0.24, 0.3, '#8a5a3a', { x: e.x, y: bot - 0.18, z: FRONT_Z + WALL_T + 0.18 });
      for (let k = 0; k < 6; k++) fb.sph(0.09, ['#ff8ab0', '#fff07a', '#ffffff', '#ff9a5a'][k % 4], { x: e.x - 0.8 + k * 0.32, y: bot + 0.0, z: FRONT_Z + WALL_T + 0.2 });
    }
  }
  // маркиза в полоску
  const aw = new B();
  for (let k = 0; k < 16; k++) aw.box(1.0, 0.05, 1.3, k % 2 ? '#f4ead8' : '#4aa86a', { x: S.x0 + 0.5 + k * 1.0, y: 2.55, z: FRONT_Z + WALL_T + 0.62, rx: 0.42 });
  for (let k = 0; k < 16; k++) aw.cone(0.5, 0.2, k % 2 ? '#f4ead8' : '#4aa86a', { x: S.x0 + 0.5 + k * 1.0, y: 2.22, z: FRONT_Z + WALL_T + 1.22, rx: Math.PI }, 3);
  const amat = MAT.clone();
  amat.transparent = true;
  out.fadeMats.push(amat);
  const awm = new THREE.Mesh(aw.geometry(), amat);
  awm.castShadow = true;
  group.add(awm);
  out.front.push(awm);
  const fbm = new THREE.Mesh(fb.geometry(), amat);
  group.add(fbm);
  out.front.push(fbm);
  // вывеска на крыше
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.1), toon(signTex(), { side: THREE.DoubleSide, transparent: true }));
  sign.position.set(0, WALL_H + 1.25, FRONT_Z + WALL_T + 0.1);
  sign.rotation.x = -0.12;
  group.add(sign);
  out.sign = sign;
  out.front.push(sign);
  const sb = new B();
  for (const sx of [-1, 1]) sb.box(0.12, 1.4, 0.12, '#6a4a30', { x: sx * 3.6, y: WALL_H + 0.6, z: FRONT_Z + WALL_T - 0.05 });
  const sbm = new THREE.Mesh(sb.geometry(), amat);
  group.add(sbm);
  out.front.push(sbm);
  // гирлянда лампочек под маркизой
  const bulbs = new B();
  for (let k = 0; k < 30; k++) {
    const t = k / 29;
    const xx = S.x0 + 0.3 + t * (S.x1 - S.x0 - 0.6);
    bulbs.sph(0.07, ['#fff07a', '#ff9ab0', '#8ad0ff', '#a8f07a'][k % 4], { x: xx, y: 2.08 - Math.sin(t * Math.PI * 8) ** 2 * 0.12, z: FRONT_Z + WALL_T + 1.15 });
  }
  const bm = new THREE.Mesh(bulbs.geometry(), MAT_GLOW);
  group.add(bm);
  out.bulbs = bm;
  // внутренний декор
  const inner = new B();
  // плакаты и часы — на задней стене
  inner.cyl(0.32, 0.32, 0.05, '#f4ead8', { x: -0.4, y: 2.2, z: S.z0 + 0.03, rx: Math.PI / 2 }, 20);
  inner.torus(0.32, 0.03, '#3a3a40', { x: -0.4, y: 2.2, z: S.z0 + 0.06 });
  inner.box(0.02, 0.2, 0.02, '#3a3a40', { x: -0.4, y: 2.27, z: S.z0 + 0.08 });
  inner.box(0.15, 0.02, 0.02, '#3a3a40', { x: -0.33, y: 2.2, z: S.z0 + 0.08 });
  // меловая доска с ценами
  inner.box(1.4, 0.9, 0.05, '#3a4a40', { x: 2.2, y: 2.0, z: S.z0 + 0.03 });
  inner.box(1.5, 1.0, 0.04, '#8a5a3a', { x: 2.2, y: 2.0, z: S.z0 + 0.01 });
  for (let k = 0; k < 4; k++) inner.box(0.9 - (k % 2) * 0.3, 0.04, 0.01, '#f4f0e0', { x: 2.1, y: 2.25 - k * 0.17, z: S.z0 + 0.06 });
  // растения в горшках
  for (const [px, pz] of [[-7.5, -3.5], [7.5, -3.5], [-7.5, -8.0]]) {
    inner.cyl(0.22, 0.17, 0.35, '#c46a3a', { x: px, y: 0.17, z: pz }, 12);
    for (let k = 0; k < 6; k++) inner.sph(0.17, k % 2 ? '#5aa05a' : '#7ac06a', { x: px + Math.cos(k) * 0.14, y: 0.5 + (k % 3) * 0.1, z: pz + Math.sin(k) * 0.14 });
  }
  // холодильник у левой стены
  inner.rbox(0.8, 1.9, 0.7, 0.06, '#e8f0f4', { x: -7.5, y: 0.95, z: -5.6 });
  inner.box(0.04, 0.5, 0.06, '#a8aeb8', { x: -7.05, y: 1.3, z: -5.35 });
  inner.box(0.02, 0.02, 0.6, '#c8ccd4', { x: -7.08, y: 1.0, z: -5.6 });
  // вешалка «касса»
  inner.box(1.0, 0.36, 0.04, '#f2c84a', { x: REG.x, y: 2.5, z: REG.z });
  inner.box(0.02, 0.4, 0.02, '#5a5a60', { x: REG.x - 0.4, y: 2.85, z: REG.z });
  inner.box(0.02, 0.4, 0.02, '#5a5a60', { x: REG.x + 0.4, y: 2.85, z: REG.z });
  group.add(deco.mesh());
  group.add(inner.mesh());
  group.add(trim.mesh());
  // плакаты (текстуры)
  [[-3.2, 0], [-5.2, 1], [6.4, 2]].forEach(([px, k]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), toon(posterTex(k)));
    p.position.set(px, 1.9, S.z0 + 0.04);
    p.rotation.z = (k - 1) * 0.06;
    group.add(p);
  });
  // ночник-лампа внутри
  const lampIn = new B();
  for (const lx of [-4, 0, 4]) {
    lampIn.cyl(0.01, 0.01, 0.6, '#3a3a40', { x: lx, y: 2.6, z: -7.5 }, 4);
    lampIn.cone(0.25, 0.2, '#4aa86a', { x: lx, y: 2.25, z: -7.5 }, 12);
  }
  group.add(lampIn.mesh(MAT, false));
  const bulbIn = new B();
  for (const lx of [-4, 0, 4]) bulbIn.sph(0.09, '#fff4c0', { x: lx, y: 2.15, z: -7.5 });
  group.add(new THREE.Mesh(bulbIn.geometry(), MAT_GLOW));
  // мебель
  const counter = makeCounter().mesh();
  counter.position.set(REG.x, 0, REG.z);
  group.add(counter);
  const st = makeStorage().mesh();
  st.position.set(5.7, 0, -11.4);
  group.add(st);
  const bench = makeBench().mesh();
  bench.position.set(-5.75, 0, -11.45);
  group.add(bench);
  const cot = makeCot().mesh();
  cot.position.set(-1.6, 0, -11.55);
  group.add(cot);
  // полки (каркасы; товар на них рисует вид)
  const shelfGeo = makeShelf().geometry();
  out.shelfGeo = shelfGeo;
  // радиовышка рядом с лавкой
  out.towerPos = [9.6, -10.8];
  // проёмы: баррикады и дверь
  for (const e of ENTRIES) {
    const h = e.door ? 2.3 : 1.35;
    const bar = new THREE.Mesh(makeBarricade(e.w, h).geometry(), MAT);
    bar.castShadow = true;
    bar.position.set(e.x, e.door ? 0 : 0.85, FRONT_Z + WALL_T + 0.08);
    group.add(bar);
    out.barricades.push(bar);
  }
  // створки двери (днём распахнуты внутрь)
  const doorB = new B();
  doorB.box(0.98, 2.2, 0.06, '#5aa8a0', { x: 0.49, y: 1.1 });
  doorB.box(0.7, 0.9, 0.065, '#a8d8f0', { x: 0.49, y: 1.5 });
  doorB.box(0.06, 0.16, 0.08, '#f2c84a', { x: 0.85, y: 1.0, z: 0.04 });
  const dg = doorB.geometry();
  for (const sx of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(sx * 1.0, 0, FRONT_Z + 0.15);
    const d = new THREE.Mesh(dg, MAT);
    d.castShadow = true;
    d.scale.x = -sx;
    piv.add(d);
    group.add(piv);
    out.doors.push(piv);
  }
  // места поиска
  for (const L of LOOT_SPOTS) {
    const m = makeCar(L.kind, L.col || '#e8705a').mesh();
    m.position.set(L.x, 0, L.z);
    m.rotation.y = L.ry;
    group.add(m);
    out.spots[L.id] = m;
  }
  // фонари
  const lampGeo = makeLamp().geometry();
  for (const [lx, lz] of DECOR.lamps) {
    const m = new THREE.Mesh(lampGeo, MAT);
    m.castShadow = true;
    m.position.set(lx, 0, lz);
    m.rotation.y = lx < 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(m);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff4c0' }));
    const off = lx < 0 ? 0.9 : -0.9;
    head.position.set(lx + off, 4.08, lz);
    group.add(head);
    out.lampHeads.push(head);
    // мягкое пятно света на асфальте
    const pool = new THREE.Mesh(new THREE.CircleGeometry(3.2, 28), new THREE.MeshBasicMaterial({ color: '#ffe8a0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(lx + off, 0.03, lz);
    group.add(pool);
    out.lampPools.push(pool);
  }
  DECOR.trees.forEach(([tx, tz], k) => {
    const m = makeTree(k + 5).mesh();
    m.position.set(tx, 0, tz);
    m.rotation.y = k;
    m.scale.setScalar(1.1 + (k % 3) * 0.12);
    group.add(m);
  });
  // деревья подальше, за пределами парковки
  for (let k = 0; k < 16; k++) {
    const m = makeTree(k + 40).mesh();
    const sx = k % 2 ? 1 : -1;
    m.position.set(sx * (24.5 + (k % 3) * 1.6), 0, -12 + k * 2.4);
    m.scale.setScalar(1.2 + (k % 4) * 0.1);
    group.add(m);
  }
  DECOR.bushes.forEach(([bx, bz], k) => {
    const m = makeBush(k + 9).mesh();
    m.position.set(bx, 0, bz);
    group.add(m);
  });
  const coneGeo = makeCone().geometry();
  DECOR.cones.forEach(([cx, cz], k) => {
    const m = new THREE.Mesh(coneGeo, MAT);
    m.position.set(cx, 0, cz);
    if (k === 2) {
      m.rotation.z = Math.PI / 2;
      m.position.y = 0.18;
    }
    m.castShadow = true;
    group.add(m);
  });
  for (const [tx, tz] of DECOR.tires) {
    const m = makeTire().mesh();
    m.position.set(tx, 0, tz);
    group.add(m);
  }
  for (const [bx, bz] of DECOR.barrels) {
    const m = makeBarrel().mesh();
    m.position.set(bx, 0, bz);
    group.add(m);
  }
  // парапет вдоль тротуара и забор сзади
  const fence = new B();
  for (const [a, b2] of [[-21.6, -3.2], [3.2, 21.6]]) {
    fence.box(b2 - a, 0.5, 0.4, '#c8c0b0', { x: (a + b2) / 2, y: 0.25, z: 14.1 });
    fence.box(b2 - a + 0.1, 0.08, 0.5, '#a8a090', { x: (a + b2) / 2, y: 0.52, z: 14.1 });
  }
  for (let fx = -23.5; fx <= 23.5; fx += 2.5) {
    fence.box(0.12, 2.0, 0.12, '#6a7078', { x: fx, y: 1.0, z: -14.15 });
  }
  for (let fx = -23.5; fx < 23.5; fx += 2.5) {
    for (const y of [0.5, 1.9]) fence.box(2.5, 0.06, 0.06, '#6a7078', { x: fx + 1.25, y, z: -14.15 });
    // сетка-рабица ромбами
    for (let k = 0; k < 6; k++) {
      fence.box(0.02, 1.5, 0.02, '#9aa0a8', { x: fx + 0.2 + k * 0.4, y: 1.2, z: -14.15, rz: 0.5 });
      fence.box(0.02, 1.5, 0.02, '#9aa0a8', { x: fx + 0.2 + k * 0.4, y: 1.2, z: -14.15, rz: -0.5 });
    }
  }
  // остановка и рекламный щит за дорогой
  const [bsx, bsz] = DECOR.busStop;
  fence.box(3.2, 0.1, 1.4, '#4a8ad8', { x: bsx, y: 2.4, z: bsz });
  for (const sx of [-1, 1]) fence.box(0.1, 2.4, 0.1, '#6a7078', { x: bsx + sx * 1.5, y: 1.2, z: bsz - 0.5 });
  fence.box(3.0, 1.8, 0.05, '#cfe8f0', { x: bsx, y: 1.4, z: bsz - 0.6 });
  fence.box(2.6, 0.12, 0.45, '#b8844a', { x: bsx, y: 0.5, z: bsz - 0.3 });
  const [bbx, bbz] = DECOR.billboard;
  for (const sx of [-1, 1]) fence.box(0.2, 3.5, 0.2, '#6a7078', { x: bbx + sx * 2, y: 1.75, z: bbz });
  fence.box(5.2, 2.6, 0.2, '#f4ead8', { x: bbx, y: 4.6, z: bbz });
  fence.box(4.8, 2.2, 0.21, '#f2a63a', { x: bbx, y: 4.6, z: bbz });
  fence.sph(0.7, '#4aa86a', { x: bbx - 1.2, y: 4.6, z: bbz + 0.15, sz: 0.2 });
  fence.box(2.2, 0.3, 0.22, '#f4ead8', { x: bbx + 0.8, y: 4.9, z: bbz });
  fence.box(1.6, 0.3, 0.22, '#f4ead8', { x: bbx + 0.6, y: 4.3, z: bbz });
  // кустики травы в трещинах
  const r = rng(5);
  for (let k = 0; k < 70; k++) {
    const gx = LOT.x0 + r() * (LOT.x1 - LOT.x0),
      gz = 0 + r() * 13.5;
    if (Math.abs(gx) < 3.5 && gz < 8) continue;
    for (let q = 0; q < 3; q++) fence.cone(0.05, 0.22 + r() * 0.12, r() < 0.5 ? '#6ab05a' : '#8ac870', { x: gx + (r() - 0.5) * 0.2, y: 0.11, z: gz + (r() - 0.5) * 0.2, rz: (r() - 0.5) * 0.6 }, 4);
  }
  group.add(fence.mesh());
  return out;
}

export { WALL_H };
