// 3D-модели: фишки (металл с цветной подставкой), дома и отели трёх стилей, кубики, колоды карточек
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([x, y]) => V2(x, y)), seg);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, s = 20) => new THREE.CylinderGeometry(rt, rb, h, s);
function mesh(geo, mat, x = 0, y = 0, z = 0, r = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (r.x) m.rotation.x = r.x;
  if (r.y) m.rotation.y = r.y;
  if (r.z) m.rotation.z = r.z;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export const MAT = {
  pewter: new THREE.MeshStandardMaterial({ color: '#d4d7dd', metalness: 0.9, roughness: 0.28 }),
  dark: new THREE.MeshStandardMaterial({ color: '#4a4e55', metalness: 0.8, roughness: 0.35 }),
  gold: new THREE.MeshStandardMaterial({ color: '#f2c14e', metalness: 0.95, roughness: 0.22 }),
  ruby: new THREE.MeshStandardMaterial({ color: '#d0213a', metalness: 0.2, roughness: 0.15 }),
};

// ---------- фишки (вперёд по +x) ----------
function shapeExtrude(pts, depth, bevel = 0.02) {
  const sh = new THREE.Shape(pts.map(([x, y]) => V2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -depth / 2);
  return g;
}

const BUILD = {
  car(m) {
    const g = new THREE.Group();
    g.add(mesh(new RoundedBoxGeometry(0.86, 0.2, 0.44, 3, 0.07), m, 0, 0.22, 0));
    g.add(mesh(new RoundedBoxGeometry(0.46, 0.2, 0.38, 3, 0.07), m, -0.06, 0.38, 0));
    g.add(mesh(box(0.06, 0.14, 0.32), MAT.dark, 0.17, 0.38, 0));
    for (const [x, z] of [[0.27, 0.22], [-0.27, 0.22], [0.27, -0.22], [-0.27, -0.22]]) g.add(mesh(cyl(0.11, 0.11, 0.08, 18), MAT.dark, x, 0.13, z, { x: Math.PI / 2 }));
    for (const z of [0.12, -0.12]) g.add(mesh(new THREE.SphereGeometry(0.04, 10, 8), MAT.gold, 0.43, 0.24, z));
    return g;
  },
  doll(m) {
    const g = new THREE.Group();
    g.add(mesh(lathe([[0, 0.02], [0.24, 0.02], [0.3, 0.16], [0.3, 0.34], [0.22, 0.52], [0.17, 0.6], [0.2, 0.7], [0.19, 0.84], [0.1, 0.94], [0, 0.96]]), m));
    // лицо и платок
    const face = mesh(new THREE.SphereGeometry(0.11, 18, 12), new THREE.MeshStandardMaterial({ color: '#f6e2d0', roughness: 0.6 }), 0.13, 0.75, 0);
    face.scale.set(0.5, 1, 1);
    g.add(face);
    g.add(mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 24), MAT.gold, 0, 0.62, 0, { x: Math.PI / 2 }));
    const apron = mesh(new THREE.SphereGeometry(0.16, 16, 10, 0, Math.PI), MAT.gold, 0.18, 0.32, 0, { y: Math.PI / 2 });
    apron.scale.set(1, 1.3, 0.55);
    g.add(apron);
    return g;
  },
  boat(m) {
    const g = new THREE.Group();
    const hull = mesh(shapeExtrude([[-0.42, 0.24], [0.5, 0.24], [0.34, 0.04], [-0.36, 0.04]], 0.3, 0.04), m);
    g.add(hull);
    g.add(mesh(box(0.34, 0.14, 0.24), m, -0.08, 0.34, 0));
    g.add(mesh(cyl(0.025, 0.025, 0.72), MAT.dark, 0.06, 0.6, 0));
    const sail = mesh(shapeExtrude([[0, 0], [0, 0.56], [0.34, 0.02]], 0.02, 0.01), m, 0.09, 0.4, 0);
    g.add(sail);
    const sail2 = mesh(shapeExtrude([[0, 0], [0, 0.44], [-0.28, 0.02]], 0.02, 0.01), m, 0.03, 0.42, 0);
    g.add(sail2);
    g.add(mesh(new THREE.ConeGeometry(0.06, 0.1, 3), MAT.ruby, 0.1, 1.0, 0, { z: -Math.PI / 2 }));
    return g;
  },
  plane(m) {
    const g = new THREE.Group();
    g.add(mesh(cyl(0.05, 0.12, 0.42), m, 0, 0.21, 0));
    const p = new THREE.Group();
    p.position.y = 0.5;
    p.rotation.z = 0.18;
    p.add(mesh(new THREE.CapsuleGeometry(0.1, 0.62, 6, 14), m, 0, 0, 0, { z: Math.PI / 2 }));
    p.add(mesh(new RoundedBoxGeometry(0.26, 0.04, 0.96, 2, 0.02), m, 0.02, 0, 0));
    p.add(mesh(new RoundedBoxGeometry(0.14, 0.03, 0.38, 2, 0.012), m, -0.36, 0.02, 0));
    p.add(mesh(shapeExtrude([[0, 0], [-0.16, 0.24], [-0.08, 0.24], [0.1, 0]], 0.03, 0.01), m, -0.3, 0.05, 0));
    p.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), MAT.dark, 0.44, 0, 0));
    p.add(mesh(box(0.02, 0.3, 0.04), MAT.dark, 0.48, 0, 0));
    g.add(p);
    return g;
  },
  rocket(m) {
    const g = new THREE.Group();
    g.add(mesh(lathe([[0, 0.12], [0.12, 0.12], [0.16, 0.3], [0.16, 0.62], [0.12, 0.84], [0.05, 0.98], [0, 1.02]]), m));
    for (let k = 0; k < 3; k++) {
      const f = mesh(shapeExtrude([[0, 0], [0.18, -0.06], [0.18, 0.08], [0, 0.32]], 0.03, 0.01), m);
      const piv = new THREE.Group();
      piv.rotation.y = (k * Math.PI * 2) / 3;
      f.position.set(0.13, 0.12, 0);
      piv.add(f);
      g.add(piv);
    }
    g.add(mesh(new THREE.TorusGeometry(0.16, 0.02, 8, 24), MAT.gold, 0, 0.62, 0, { x: Math.PI / 2 }));
    g.add(mesh(new THREE.SphereGeometry(0.06, 14, 10), MAT.ruby, 0.14, 0.52, 0));
    g.add(mesh(new THREE.ConeGeometry(0.09, 0.14, 14), MAT.gold, 0, 0.05, 0, { x: Math.PI }));
    return g;
  },
  samovar(m) {
    const g = new THREE.Group();
    g.add(mesh(lathe([[0, 0.02], [0.2, 0.02], [0.12, 0.1], [0.12, 0.16], [0.27, 0.24], [0.3, 0.42], [0.26, 0.56], [0.15, 0.62], [0.15, 0.68], [0.2, 0.7], [0, 0.72]]), MAT.gold));
    g.add(mesh(cyl(0.04, 0.05, 0.22), m, 0, 0.82, 0));
    g.add(mesh(new THREE.SphereGeometry(0.05, 12, 8), m, 0, 0.95, 0));
    for (const s of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.09, 0.02, 8, 14, Math.PI), m, 0, 0.48, s * 0.3, { y: s > 0 ? 0 : Math.PI, x: Math.PI / 2 * 0 }));
    g.add(mesh(cyl(0.02, 0.03, 0.2), m, 0.3, 0.3, 0, { z: Math.PI / 2.5 }));
    g.add(mesh(new THREE.SphereGeometry(0.03, 8, 6), MAT.dark, 0.38, 0.34, 0));
    return g;
  },
  train(m) {
    const g = new THREE.Group();
    g.add(mesh(cyl(0.15, 0.15, 0.56, 22), m, 0.08, 0.32, 0, { z: Math.PI / 2 }));
    g.add(mesh(new RoundedBoxGeometry(0.28, 0.4, 0.36, 2, 0.04), m, -0.3, 0.36, 0));
    g.add(mesh(new RoundedBoxGeometry(0.36, 0.05, 0.42, 2, 0.02), MAT.dark, -0.3, 0.58, 0));
    g.add(mesh(cyl(0.08, 0.05, 0.2), MAT.dark, 0.24, 0.54, 0));
    g.add(mesh(cyl(0.07, 0.07, 0.04), m, 0.36, 0.32, 0, { z: Math.PI / 2 }));
    g.add(mesh(box(0.86, 0.06, 0.3), MAT.dark, -0.02, 0.15, 0));
    for (const x of [-0.3, -0.06, 0.18]) for (const z of [0.17, -0.17]) g.add(mesh(cyl(0.1, 0.1, 0.05, 18), MAT.gold, x, 0.12, z, { x: Math.PI / 2 }));
    g.add(mesh(new THREE.ConeGeometry(0.12, 0.12, 4), m, 0.42, 0.14, 0, { z: -Math.PI / 2 }));
    return g;
  },
  balalaika(m) {
    const g = new THREE.Group();
    g.add(mesh(cyl(0.2, 0.26, 0.06, 24), m, 0, 0.03, 0));
    const body = new THREE.Group();
    body.position.set(0, 0.06, 0);
    body.rotation.z = -0.12;
    body.add(mesh(shapeExtrude([[-0.26, 0], [0.26, 0], [0.04, 0.46], [-0.04, 0.46]], 0.1, 0.05), MAT.gold, 0, 0.02, 0));
    body.add(mesh(new THREE.CircleGeometry(0.06, 16), MAT.dark, 0, 0.18, 0.11));
    body.add(mesh(box(0.06, 0.46, 0.05), m, 0, 0.7, 0.02));
    body.add(mesh(shapeExtrude([[-0.07, 0], [0.07, 0], [0.05, 0.14], [-0.05, 0.14]], 0.04, 0.01), m, 0, 0.92, 0.02));
    g.add(body);
    return g;
  },
  crown(m) {
    const g = new THREE.Group();
    const G = MAT.gold;
    g.add(mesh(cyl(0.3, 0.26, 0.24, 28), G, 0, 0.22, 0));
    g.add(mesh(new THREE.TorusGeometry(0.29, 0.035, 8, 28), G, 0, 0.34, 0, { x: Math.PI / 2 }));
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      g.add(mesh(new THREE.ConeGeometry(0.07, 0.24, 8), G, Math.cos(a) * 0.27, 0.46, Math.sin(a) * 0.27));
      g.add(mesh(new THREE.SphereGeometry(0.035, 10, 8), MAT.pewter, Math.cos(a) * 0.27, 0.59, Math.sin(a) * 0.27));
      g.add(mesh(new THREE.SphereGeometry(0.045, 10, 8), k % 2 ? MAT.ruby : new THREE.MeshStandardMaterial({ color: '#2c7be0', roughness: 0.15 }), Math.cos(a + 0.5) * 0.3, 0.22, Math.sin(a + 0.5) * 0.3));
    }
    g.add(mesh(new THREE.SphereGeometry(0.13, 16, 12), MAT.ruby, 0, 0.36, 0));
    g.add(mesh(cyl(0.025, 0.025, 0.2), G, 0, 0.56, 0));
    g.add(mesh(box(0.14, 0.03, 0.03), G, 0, 0.62, 0));
    g.position.y = -0.08;
    const o = new THREE.Group();
    o.add(g);
    return o;
  },
};

// фишка: модель на цветной подставке; userData.ring — подставка (цвет игрока)
export function makeToken(id, color) {
  const root = new THREE.Group();
  const ringMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 });
  const base = mesh(cyl(0.36, 0.4, 0.09, 32), ringMat, 0, 0.045, 0);
  root.add(base);
  root.add(mesh(new THREE.TorusGeometry(0.36, 0.022, 8, 32), MAT.pewter, 0, 0.09, 0, { x: Math.PI / 2 }));
  const model = (BUILD[id] || BUILD.car)(MAT.pewter);
  model.position.y = 0.09;
  model.scale.setScalar(0.92);
  root.add(model);
  root.scale.setScalar(1.25);
  root.userData = { id, ring: ringMat, model };
  return root;
}
export const TOKEN_IDS = Object.keys(BUILD);

// ---------- дома ----------
const HM = {
  classicH: new THREE.MeshStandardMaterial({ color: '#2fa457', roughness: 0.45 }),
  classicR: new THREE.MeshStandardMaterial({ color: '#1f7d40', roughness: 0.45 }),
  hotel: new THREE.MeshStandardMaterial({ color: '#d8312c', roughness: 0.45 }),
  hotelR: new THREE.MeshStandardMaterial({ color: '#a8221e', roughness: 0.45 }),
  wood: new THREE.MeshStandardMaterial({ color: '#b5773f', roughness: 0.75 }),
  woodD: new THREE.MeshStandardMaterial({ color: '#7a4a24', roughness: 0.8 }),
  roofT: new THREE.MeshStandardMaterial({ color: '#c8432f', roughness: 0.6 }),
  glass: new THREE.MeshStandardMaterial({ color: '#7fb8e6', roughness: 0.08, metalness: 0.6 }),
  glassD: new THREE.MeshStandardMaterial({ color: '#2e4a6e', roughness: 0.15, metalness: 0.7 }),
  frame: new THREE.MeshStandardMaterial({ color: '#e8edf2', roughness: 0.4, metalness: 0.3 }),
  win: new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffcf6a', emissiveIntensity: 0.25, roughness: 0.4 }),
};
function roof(w, h, d, mat) {
  // двускатная крыша вдоль x
  const sh = new THREE.Shape([V2(-w / 2, 0), V2(w / 2, 0), V2(0, h)]);
  const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return new THREE.Mesh(g, mat);
}
export function makeHouse(style) {
  const g = new THREE.Group();
  if (style === 'terem') {
    g.add(mesh(box(0.3, 0.24, 0.3), HM.wood, 0, 0.12, 0));
    for (let k = 0; k < 3; k++) g.add(mesh(box(0.31, 0.015, 0.31), HM.woodD, 0, 0.05 + k * 0.075, 0));
    const r = roof(0.38, 0.26, 0.36, HM.roofT);
    r.position.y = 0.24;
    r.castShadow = true;
    g.add(r);
    g.add(mesh(box(0.08, 0.08, 0.01), HM.win, 0, 0.14, 0.155));
  } else if (style === 'modern') {
    g.add(mesh(box(0.24, 0.5, 0.24), HM.glass, 0, 0.25, 0));
    for (let k = 1; k < 5; k++) g.add(mesh(box(0.25, 0.012, 0.25), HM.frame, 0, k * 0.1, 0));
    g.add(mesh(box(0.27, 0.03, 0.27), HM.frame, 0, 0.51, 0));
  } else {
    g.add(mesh(box(0.28, 0.22, 0.28), HM.classicH, 0, 0.11, 0));
    const r = roof(0.34, 0.18, 0.32, HM.classicR);
    r.position.y = 0.22;
    r.castShadow = true;
    g.add(r);
  }
  return g;
}
export function makeHotel(style) {
  const g = new THREE.Group();
  if (style === 'terem') {
    g.add(mesh(box(0.6, 0.3, 0.36), HM.wood, 0, 0.15, 0));
    const r = roof(0.68, 0.22, 0.42, HM.roofT);
    r.position.y = 0.3;
    r.castShadow = true;
    g.add(r);
    g.add(mesh(box(0.22, 0.34, 0.22), HM.wood, 0, 0.47, 0));
    g.add(mesh(lathe([[0, 0], [0.13, 0], [0.16, 0.08], [0.12, 0.17], [0.04, 0.26], [0, 0.32]], 18), MAT.gold, 0, 0.64, 0));
    for (const x of [-0.18, 0.18]) g.add(mesh(box(0.09, 0.1, 0.01), HM.win, x, 0.16, 0.185));
  } else if (style === 'modern') {
    g.add(mesh(box(0.42, 1.0, 0.36), HM.glassD, 0, 0.5, 0));
    for (let k = 1; k < 10; k++) g.add(mesh(box(0.43, 0.014, 0.37), HM.win, 0, k * 0.1, 0));
    g.add(mesh(box(0.3, 0.12, 0.26), HM.frame, 0, 1.06, 0));
    g.add(mesh(cyl(0.012, 0.02, 0.3, 8), HM.frame, 0, 1.27, 0));
  } else {
    g.add(mesh(box(0.66, 0.34, 0.38), HM.hotel, 0, 0.17, 0));
    const r = roof(0.72, 0.22, 0.42, HM.hotelR);
    r.position.y = 0.34;
    r.castShadow = true;
    g.add(r);
  }
  return g;
}

// ---------- кубики ----------
function pipFace(n) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fbfaf6';
  g.fillRect(0, 0, 128, 128);
  const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[n];
  for (const [x, y] of P) {
    const gr = g.createRadialGradient(64 + x * 32 - 3, 64 + y * 32 - 3, 2, 64 + x * 32, 64 + y * 32, 13);
    gr.addColorStop(0, n === 1 ? '#e5484d' : '#3a3a3a');
    gr.addColorStop(1, n === 1 ? '#a51d24' : '#0d0d0d');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(64 + x * 32, 64 + y * 32, n === 1 ? 17 : 12, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
// грани BoxGeometry: +x, -x, +y, -y, +z, -z
const FACE_VAL = [3, 4, 1, 6, 2, 5];
let dieMats = null;
export function makeDie() {
  if (!dieMats) dieMats = FACE_VAL.map((v) => new THREE.MeshStandardMaterial({ map: pipFace(v), roughness: 0.35 }));
  const m = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.9, 0.9, 4, 0.14), dieMats);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
// поворот, при котором сверху значение v
const E = new THREE.Euler();
export function dieQuat(v, yaw = 0) {
  const q = new THREE.Quaternion();
  const r = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0] }[v];
  q.setFromEuler(E.set(r[0], r[1], r[2]));
  const y = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  return y.multiply(q);
}

// ---------- стопки карточек ----------
export function makeDeck(kind, label) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  const g = c.getContext('2d');
  const col = kind === 'chance' ? '#f39324' : '#4b8fd6';
  g.fillStyle = col;
  g.fillRect(0, 0, 512, 320);
  g.strokeStyle = '#fff';
  g.lineWidth = 8;
  g.strokeRect(18, 18, 476, 284);
  g.fillStyle = 'rgba(255,255,255,.18)';
  for (let k = -320; k < 512; k += 40) {
    g.beginPath();
    g.moveTo(k, 320);
    g.lineTo(k + 320, 0);
    g.lineTo(k + 340, 0);
    g.lineTo(k + 20, 320);
    g.fill();
  }
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '900 120px "Playfair Display", Georgia, serif';
  g.fillText(kind === 'chance' ? '?' : '₽', 256, 130);
  g.font = '600 58px Oswald, Arial, sans-serif';
  g.fillText(label.toUpperCase(), 256, 245);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const side = new THREE.MeshStandardMaterial({ color: '#f4efe2', roughness: 0.8 });
  const top = new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.32, 1.88), [side, side, top, side, side, side]);
  m.castShadow = true;
  m.receiveShadow = true;
  // торцы «стопки»: тонкие линии
  return m;
}
