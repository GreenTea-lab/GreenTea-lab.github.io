// Кости домино: геометрия, текстуры точек для каждого набора, объекты костей
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { TILES } from './rules.js';
import { TILE_SETS } from './data.js';

export const TW = 1; // ширина кости
export const TL = 2; // длина
export const TH = 0.42; // толщина

// расположение точек на половинке (координаты -1..1)
const P = 0.52;
export const PIPS = [
  [],
  [[0, 0]],
  [[-P, -P], [P, P]],
  [[-P, -P], [0, 0], [P, P]],
  [[-P, -P], [P, -P], [-P, P], [P, P]],
  [[-P, -P], [P, -P], [0, 0], [-P, P], [P, P]],
  [[-P, -P], [-P, 0], [-P, P], [P, -P], [P, 0], [P, P]],
];

const shade = (hex, k) => {
  const c = new THREE.Color(hex);
  if (k > 0) c.lerp(new THREE.Color('#ffffff'), k);
  else c.lerp(new THREE.Color('#000000'), -k);
  return '#' + c.getHexString();
};

// рисует одну половинку кости (квадрат s×s) в 2D-контексте: точки «вдавлены», внизу — половина разделительной линии
export function drawHalf(g, x, y, s, v, set, { divider = 'bottom', bg = null } = {}) {
  if (bg) {
    g.fillStyle = bg;
    g.fillRect(x, y, s, s);
  }
  const col = set.pips ? set.pips[v] : set.pip;
  const r = s * 0.105;
  for (const [px, py] of PIPS[v]) {
    const cx = x + s / 2 + px * s * 0.34;
    const cy = y + s / 2 + py * s * 0.34;
    // светлый ободок снизу-справа и тень сверху-слева — точка выглядит углублённой
    g.beginPath();
    g.arc(cx + r * 0.1, cy + r * 0.12, r * 1.12, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fill();
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    const gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    gr.addColorStop(0, shade(col, -0.35));
    gr.addColorStop(0.7, col);
    gr.addColorStop(1, shade(col, 0.12));
    g.fillStyle = gr;
    g.fill();
  }
  if (set.edge) {
    g.strokeStyle = set.edge;
    g.lineWidth = s * 0.03;
    const m = s * 0.07;
    g.beginPath();
    if (divider === 'bottom') {
      g.moveTo(x + m, y + s);
      g.lineTo(x + m, y + m);
      g.lineTo(x + s - m, y + m);
      g.lineTo(x + s - m, y + s);
    } else if (divider === 'none') {
      g.rect(x + m, y + m, s - 2 * m, s - 2 * m);
    }
    g.stroke();
  }
  if (divider === 'bottom') {
    g.fillStyle = set.line;
    g.fillRect(x + s * 0.12, y + s - s * 0.022, s * 0.76, s * 0.022);
  }
}

function woodCanvas(base, w = 256, h = 512, seed = 3) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * w;
    g.strokeStyle = `rgba(${90 + rnd() * 40},${50 + rnd() * 20},20,${0.06 + rnd() * 0.12})`;
    g.lineWidth = 1 + rnd() * 3;
    g.beginPath();
    g.moveTo(x, 0);
    for (let yy = 0; yy <= h; yy += 32) g.lineTo(x + Math.sin(yy * 0.02 + i) * 6 * rnd(), yy);
    g.stroke();
  }
  return c;
}

// атлас 4×2 половинок для набора (значения 0..6)
function atlasFor(set) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S * 4;
  c.height = S * 2;
  const g = c.getContext('2d');
  for (let v = 0; v < 7; v++) drawHalf(g, (v % 4) * S, Math.floor(v / 4) * S, S, v, set);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// геометрия половинки со своими UV для каждого значения
const halfGeo = [];
for (let v = 0; v < 7; v++) {
  const g = new THREE.PlaneGeometry(0.9, 0.9);
  g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv;
  const u0 = (v % 4) / 4,
    v0 = 1 - (Math.floor(v / 4) + 1) / 2;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) / 4, v0 + uv.getY(i) / 2);
  halfGeo.push(g);
}
const bodyGeo = new RoundedBoxGeometry(TW, TH, TL, 3, 0.12);
const pinGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.03, 16);
const PIN = { brass: '#c9a24a', gold: '#e2b84a', silver: '#cfd4da' };

export class TileKit {
  constructor() {
    this.cache = {};
    this.tiles = [];
    for (let id = 0; id < 28; id++) this.tiles.push(this._make(id));
    this.setSkin('ivory');
  }
  _mats(setId) {
    if (this.cache[setId]) return this.cache[setId];
    const set = TILE_SETS.find((s) => s.id === setId) || TILE_SETS[0];
    const body = { color: new THREE.Color(set.body), roughness: set.rough ?? 0.32, metalness: 0 };
    if (set.wood) {
      const t = new THREE.CanvasTexture(woodCanvas(set.body));
      t.colorSpace = THREE.SRGBColorSpace;
      body.map = t;
      body.color = new THREE.Color('#ffffff');
    }
    const face = new THREE.MeshStandardMaterial({
      map: atlasFor(set),
      transparent: true,
      roughness: 0.4,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const pin = set.pin !== 'none' ? new THREE.MeshStandardMaterial({ color: PIN[set.pin], metalness: 0.85, roughness: 0.3 }) : null;
    return (this.cache[setId] = { set, body, face, pin });
  }
  _make(id) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial());
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData.tile = id;
    g.add(body);
    const [a, b] = TILES[id];
    const ha = new THREE.Mesh(halfGeo[a]);
    ha.position.set(0, TH / 2 + 0.003, -0.45);
    const hb = new THREE.Mesh(halfGeo[b]);
    hb.position.set(0, TH / 2 + 0.003, 0.45);
    hb.rotation.y = Math.PI;
    ha.renderOrder = hb.renderOrder = 2;
    g.add(ha, hb);
    const pin = new THREE.Mesh(pinGeo);
    pin.position.set(0, TH / 2 + 0.006, 0);
    g.add(pin);
    g.userData = { id, body, ha, hb, pin };
    return g;
  }
  setSkin(setId) {
    this.skin = setId;
    const m = this._mats(setId);
    for (const t of this.tiles) {
      const u = t.userData;
      const bm = u.body.material;
      bm.color.copy(m.body.color);
      bm.map = m.body.map || null;
      bm.roughness = m.body.roughness;
      bm.metalness = 0;
      bm.needsUpdate = true;
      u.ha.material = m.face;
      u.hb.material = m.face;
      u.pin.visible = !!m.pin;
      if (m.pin) u.pin.material = m.pin;
    }
    this.set = m.set;
  }
  // подсветка: 0 — обычная, 1 — ходовая (тёплое свечение), -1 — неходовая (приглушена)
  glow(id, k, t = 0) {
    const bm = this.tiles[id].userData.body.material;
    if (k > 0) {
      const dark = this._mats(this.skin).body.color.getHSL({}).l < 0.3;
      // на тёмных наборах жёлтое свечение даёт грязно-оливковый цвет: там ходовую кость выделяет подъём и затемнение остальных
      const a = dark ? 0 : 0.2 * (0.75 + 0.25 * Math.sin(t * 5));
      bm.emissive.setRGB(a, a * 0.78, a * 0.1);
    }
    else if (k < 0) bm.emissive.setRGB(-0.0, -0.0, 0);
    else bm.emissive.setRGB(0, 0, 0);
    const dim = k < 0;
    if (bm.userData.dim !== dim) {
      bm.userData.dim = dim;
      const m = this._mats(this.skin);
      bm.color.copy(m.body.color);
      if (dim) bm.color.multiplyScalar(0.72);
      this.tiles[id].userData.ha.material = this.tiles[id].userData.hb.material = dim ? this._dimFace() : m.face;
    }
  }
  _dimFace() {
    const m = this._mats(this.skin);
    if (!m.faceDim) {
      m.faceDim = m.face.clone();
      m.faceDim.color = new THREE.Color(0.72, 0.72, 0.72);
    }
    return m.faceDim;
  }
}

// «призрак» — куда ляжет кость (полупрозрачная светящаяся кость)
export function makeGhost() {
  const m = new THREE.MeshBasicMaterial({ color: '#fff27a', transparent: true, opacity: 0.7, depthWrite: false });
  const mesh = new THREE.Mesh(bodyGeo, m);
  mesh.scale.set(1.04, 0.5, 1.04);
  return mesh;
}
