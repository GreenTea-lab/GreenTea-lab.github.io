// Мир трассы: небо, парящий остров, полотно дороги, бортики, опоры, старт, ускорители, монеты и декор
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { nearest, pointAt, rng, STEP } from './tracks.js';

export const PALETTE = {
  meadow: {
    skyTop: 0x4fb6f5, skyBot: 0xd9f2ff, fog: 0xcdeeff, hemiS: 0xd6efff, hemiG: 0x7aa860, hemi: 1.15, sun: 0xfff6e0, sunI: 1.5,
    g1: 0x86d35e, g2: 0x63b94b, shoulder: 0xc9b98a, road: 0x6c708a, road2: 0x63677f, curb: [0xff6b6b, 0xfafafa], rail: [0xffcf5a, 0xff7aa2], dash: 0xffffff,
    rock1: 0x9a7354, rock2: 0x7a6a62, rockBot: 0x5f5866, hills: 6,
  },
  beach: {
    skyTop: 0x5aa8f0, skyBot: 0xffe1bd, fog: 0xffe8cc, hemiS: 0xffeedd, hemiG: 0xd9b67a, hemi: 1.15, sun: 0xffe6c4, sunI: 1.5,
    g1: 0xf5dca4, g2: 0xeac987, shoulder: 0xe0c08a, road: 0x76708a, road2: 0x6d6780, curb: [0xff8a5c, 0xfafafa], rail: [0x4ecdc4, 0xffffff], dash: 0xffffff,
    rock1: 0xc49a6c, rock2: 0xa47e5c, rockBot: 0x7e6a6a, hills: 4,
  },
  snow: {
    skyTop: 0x7fa8e0, skyBot: 0xeef5ff, fog: 0xe4eefc, hemiS: 0xeaf3ff, hemiG: 0x9fb2cc, hemi: 1.05, sun: 0xffffff, sunI: 1.25,
    g1: 0xf6f9ff, g2: 0xdde8f7, shoulder: 0xc7d3e6, road: 0x5f6985, road2: 0x58617b, curb: [0x5aa9ff, 0xfafafa], rail: [0xff6b6b, 0xffffff], dash: 0xffffff,
    rock1: 0x9db0c8, rock2: 0x7f93b0, rockBot: 0x5d6a88, hills: 9,
  },
  night: {
    skyTop: 0x0a1238, skyBot: 0x40327a, fog: 0x2b2660, hemiS: 0x8a9cff, hemiG: 0x2a3a50, hemi: 0.75, sun: 0xb8c8ff, sunI: 0.55,
    g1: 0x3b7a64, g2: 0x2f6553, shoulder: 0x4e5a7a, road: 0x40445f, road2: 0x3a3e57, curb: [0xa78bfa, 0xff8fd0], rail: [0x7ad7ff, 0xff8fd0], dash: 0xfff2a8,
    rock1: 0x5a4e7a, rock2: 0x463d66, rockBot: 0x2f2a4e, hills: 6,
  },
};

function noise2(x, z, s = 0) {
  return (
    Math.sin(x * 0.031 + 1.7 + s) * Math.cos(z * 0.027 + 0.3 + s * 0.7) * 0.55 +
    Math.sin((x + z) * 0.053 + s * 1.3) * 0.28 +
    Math.cos((x - z * 0.7) * 0.09 + s * 2.1) * 0.17
  );
}
const smooth = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// геометрия с вершинными цветами для сборки префабов
function part(geo, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  g.applyMatrix4(m);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
const prefab = (parts) => mergeGeometries(parts);

const GEO = {
  ico: new THREE.IcosahedronGeometry(1, 1),
  ico0: new THREE.IcosahedronGeometry(1, 0),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone: new THREE.ConeGeometry(1, 1, 10),
  box: new THREE.BoxGeometry(1, 1, 1),
  sph: new THREE.SphereGeometry(1, 14, 10),
  dode: new THREE.DodecahedronGeometry(1, 0),
};

// префабы декора; r — радиус занимаемого места
function prefabs(theme) {
  const P = {};
  const trunk = 0x8a5a3c;
  P.tree = { r: 3, geo: prefab([part(GEO.cyl, trunk, 0, 1.2, 0, 0.32, 2.4, 0.32), part(GEO.ico, 0xffffff, 0, 3.6, 0, 2.1, 2.0, 2.1), part(GEO.ico, 0xffffff, 0.8, 4.6, 0.3, 1.3, 1.3, 1.3)]), colors: [0x6cc24a, 0x58b03e, 0x8ad35c, 0x4fa36a] };
  P.bush = { r: 1.6, geo: prefab([part(GEO.ico, 0xffffff, 0, 0.6, 0, 1.3, 1.0, 1.3), part(GEO.ico, 0xffffff, 0.8, 0.5, 0.2, 0.9, 0.8, 0.9)]), colors: [0x6cc24a, 0x7fd05a, 0x58b03e] };
  P.flowers = {
    r: 1.2,
    geo: prefab([
      part(GEO.sph, 0xff8fb8, 0, 0.25, 0, 0.25, 0.22, 0.25),
      part(GEO.sph, 0xfff0a0, 0.5, 0.22, 0.3, 0.22, 0.2, 0.22),
      part(GEO.sph, 0xb59bff, -0.4, 0.22, 0.4, 0.22, 0.2, 0.22),
      part(GEO.sph, 0xffffff, 0.1, 0.22, -0.5, 0.22, 0.2, 0.22),
      part(GEO.sph, 0xff9f6b, -0.5, 0.22, -0.3, 0.2, 0.18, 0.2),
    ]),
    colors: [0xffffff],
  };
  P.rock = { r: 1.6, geo: prefab([part(GEO.dode, 0xffffff, 0, 0.5, 0, 1.3, 0.9, 1.1), part(GEO.dode, 0xffffff, 1.0, 0.3, 0.4, 0.6, 0.5, 0.6)]), colors: [0xa8a4b0, 0x9a96a6, 0xb6b0a8] };
  P.house = {
    r: 4,
    geo: prefab([
      part(GEO.box, 0xfff4e0, 0, 1.4, 0, 3.6, 2.8, 3.0),
      part(GEO.cone, 0xffffff, 0, 3.7, 0, 3.0, 1.9, 3.0, 0, Math.PI / 4, 0),
      part(GEO.box, 0x8a5a3c, 0, 0.8, 1.51, 0.8, 1.6, 0.05),
      part(GEO.box, 0x7fc8ff, -1.1, 1.7, 1.51, 0.7, 0.7, 0.05),
      part(GEO.box, 0x7fc8ff, 1.1, 1.7, 1.51, 0.7, 0.7, 0.05),
      part(GEO.box, 0xc07050, 1.0, 4.1, 0.3, 0.4, 1.2, 0.4),
    ]),
    colors: [0xff8a7a, 0x7ab8ff, 0xffc75a, 0x9ad97a],
    roofOnly: true,
  };
  P.palm = {
    r: 2.4,
    geo: prefab([
      part(GEO.cyl, 0xb08a5a, 0, 1.0, 0, 0.26, 2.0, 0.26, 0, 0, 0.08),
      part(GEO.cyl, 0xa07a4a, 0.15, 2.9, 0, 0.22, 2.0, 0.22, 0, 0, 0.16),
      part(GEO.cyl, 0xb08a5a, 0.45, 4.7, 0, 0.19, 1.8, 0.19, 0, 0, 0.24),
      ...[0, 1, 2, 3, 4, 5].map((k) => {
        const a = (k / 6) * Math.PI * 2;
        return part(GEO.sph, 0xffffff, 0.6 + Math.cos(a) * 1.5, 5.4, Math.sin(a) * 1.5, 1.7, 0.18, 0.55, 0, -a, -0.35);
      }),
      part(GEO.sph, 0x7a5a30, 0.55, 5.45, 0.2, 0.25, 0.25, 0.25),
    ]),
    colors: [0x56c26a, 0x6ad07a, 0x48b060],
  };
  P.umbrella = {
    r: 2,
    geo: prefab([part(GEO.cyl, 0xf5f5f5, 0, 1.2, 0, 0.06, 2.4, 0.06), part(GEO.cone, 0xffffff, 0, 2.5, 0, 1.6, 0.6, 1.6), part(GEO.box, 0xffffff, 1.2, 0.15, 0.2, 1.8, 0.12, 0.8)]),
    colors: [0xff6b6b, 0x4ecdc4, 0xffd166, 0xa78bfa],
  };
  P.shell = { r: 1, geo: prefab([part(GEO.sph, 0xffd0c0, 0, 0.15, 0, 0.45, 0.25, 0.4), part(GEO.sph, 0xffffff, 0.8, 0.12, 0.3, 0.3, 0.18, 0.3)]), colors: [0xffffff, 0xffd8e8] };
  P.pine = {
    r: 2.4,
    geo: prefab([
      part(GEO.cyl, trunk, 0, 0.6, 0, 0.3, 1.2, 0.3),
      part(GEO.cone, 0xffffff, 0, 2.0, 0, 2.0, 2.4, 2.0),
      part(GEO.cone, 0xffffff, 0, 3.4, 0, 1.55, 2.0, 1.55),
      part(GEO.cone, 0xffffff, 0, 4.6, 0, 1.05, 1.7, 1.05),
      part(GEO.cone, 0xf8fbff, 0, 5.3, 0, 0.55, 0.7, 0.55),
      part(GEO.cone, 0xf8fbff, 0, 3.0, 0, 1.7, 0.4, 1.7),
    ]),
    colors: [0x3e9a6a, 0x4aa877, 0x358a60],
  };
  P.snowman = {
    r: 1.6,
    geo: prefab([
      part(GEO.sph, 0xffffff, 0, 0.8, 0, 0.9, 0.85, 0.9),
      part(GEO.sph, 0xffffff, 0, 1.95, 0, 0.62, 0.6, 0.62),
      part(GEO.sph, 0xffffff, 0, 2.8, 0, 0.42, 0.42, 0.42),
      part(GEO.cone, 0xff8a3a, 0, 2.8, 0.5, 0.08, 0.4, 0.08, Math.PI / 2, 0, 0),
      part(GEO.sph, 0x2d2f38, -0.15, 2.92, 0.36, 0.06, 0.06, 0.06),
      part(GEO.sph, 0x2d2f38, 0.15, 2.92, 0.36, 0.06, 0.06, 0.06),
      part(GEO.cyl, 0xff6b6b, 0, 2.4, 0, 0.5, 0.18, 0.5),
    ]),
    colors: [0xffffff],
  };
  P.crystal = { r: 1.4, geo: prefab([part(GEO.ico0, 0xffffff, 0, 1.0, 0, 0.5, 1.3, 0.5), part(GEO.ico0, 0xffffff, 0.5, 0.6, 0.2, 0.3, 0.8, 0.3, 0, 0, 0.4)]), colors: [0x9fd8ff, 0xc7b8ff] };
  P.glowTree = {
    r: 3,
    geo: prefab([part(GEO.cyl, 0x5a4a6a, 0, 1.2, 0, 0.3, 2.4, 0.3), part(GEO.ico, 0xffffff, 0, 3.5, 0, 2.0, 1.9, 2.0), part(GEO.ico, 0xffffff, -0.7, 4.4, 0.2, 1.2, 1.2, 1.2)]),
    colors: [0x4a8cc8, 0x7a5ac8, 0x3a9a9a],
  };
  P.mushroom = {
    r: 1.4,
    geo: prefab([part(GEO.cyl, 0xf0e8ff, 0, 0.5, 0, 0.22, 1.0, 0.22), part(GEO.sph, 0xffffff, 0, 1.05, 0, 0.8, 0.45, 0.8), part(GEO.cyl, 0xf0e8ff, 0.9, 0.3, 0.4, 0.14, 0.6, 0.14), part(GEO.sph, 0xffffff, 0.9, 0.62, 0.4, 0.5, 0.3, 0.5)]),
    colors: [0xff7ad0, 0x7ad7ff, 0xffd166],
    emissive: true,
  };
  const sets = {
    meadow: [['tree', 0.34], ['bush', 0.2], ['flowers', 0.22], ['rock', 0.1], ['house', 0.06]],
    beach: [['palm', 0.4], ['umbrella', 0.12], ['shell', 0.18], ['rock', 0.14], ['bush', 0.1], ['house', 0.04]],
    snow: [['pine', 0.52], ['snowman', 0.08], ['rock', 0.14], ['crystal', 0.14], ['house', 0.06]],
    night: [['glowTree', 0.34], ['mushroom', 0.3], ['crystal', 0.16], ['rock', 0.12], ['house', 0.06]],
  };
  return { P, set: sets[theme] };
}

// текстура «шахматки»
function checkerTex(cols = 8, rows = 2) {
  const c = document.createElement('canvas');
  c.width = cols * 16;
  c.height = rows * 16;
  const g = c.getContext('2d');
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    g.fillStyle = (i + j) % 2 ? '#222633' : '#ffffff';
    g.fillRect(i * 16, j * 16, 16, 16);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function boostTex() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#2fd0ff');
  gr.addColorStop(1, '#7a6bff');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#fff6a8';
  for (let k = 0; k < 2; k++) {
    const y = k * 64 + 14;
    g.beginPath();
    g.moveTo(8, y + 34);
    g.lineTo(32, y + 8);
    g.lineTo(56, y + 34);
    g.lineTo(56, y + 50);
    g.lineTo(32, y + 24);
    g.lineTo(8, y + 50);
    g.closePath();
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glowTex(color = '255,240,190') {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${color},1)`);
  gr.addColorStop(0.35, `rgba(${color},.45)`);
  gr.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class World {
  constructor(T, quality = 'high') {
    this.T = T;
    this.q = quality;
    this.pal = PALETTE[T.theme];
    this.root = new THREE.Group();
    this.anim = [];
    this.R = rng(T.def.seed * 13 + 1);
    this.build();
  }

  dispose() {
    this.root.traverse((o) => {
      if (o.geometry && !Object.values(GEO).includes(o.geometry)) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    });
  }

  build() {
    this.sky();
    this.island();
    this.road();
    this.rails();
    this.pillars();
    this.start();
    this.boosts();
    this.coins();
    this.decor();
    this.clouds();
    if (this.T.theme === 'night') this.lanterns();
    if (this.T.theme === 'snow') this.snow();
    if (this.T.theme !== 'night') this.balloons();
    this.stands();
  }

  sky() {
    const p = this.pal;
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { top: { value: new THREE.Color(p.skyTop) }, bot: { value: new THREE.Color(p.skyBot) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.25,0.0,1.0); gl_FragColor = vec4(mix(bot, top, pow(h,0.8)),1.0);\n#include <colorspace_fragment>\n}',
    });
    const s = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), mat);
    s.renderOrder = -10;
    this.skyMesh = s;
    this.root.add(s);
    if (this.T.theme === 'night') {
      const n = 700;
      const pos = new Float32Array(n * 3);
      const R = rng(99);
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2,
          y = 0.1 + R() * 0.9;
        const r = Math.sqrt(1 - y * y);
        pos[i * 3] = Math.cos(a) * r * 1500;
        pos[i * 3 + 1] = y * 1500 - 100;
        pos[i * 3 + 2] = Math.sin(a) * r * 1500;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const st = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }));
      this.root.add(st);
      // луна
      const moon = new THREE.Mesh(new THREE.SphereGeometry(40, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false }));
      moon.position.set(-500, 600, -900);
      this.root.add(moon);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('255,246,216'), fog: false, transparent: true, opacity: 0.5, depthWrite: false }));
      halo.scale.set(260, 260, 1);
      halo.position.copy(moon.position);
      this.root.add(halo);
    } else {
      const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(this.T.theme === 'beach' ? '255,220,170' : '255,250,225'), fog: false, transparent: true, depthWrite: false }));
      sun.scale.set(420, 420, 1);
      sun.position.set(600, 700, -1000);
      this.root.add(sun);
    }
  }

  // ---------- остров ----------
  groundH(x, z) {
    const near = nearest(this.T, x, z);
    const hill = smooth(this.T.halfW + 10, this.T.halfW + 45, near.d);
    const h = (noise2(x, z, this.T.def.seed) * 0.5 + 0.5) * this.pal.hills * hill;
    return { h, d: near.d, i: near.i };
  }

  island() {
    const T = this.T;
    const SEG = this.q === 'low' ? 96 : 140;
    const RINGS = this.q === 'low' ? 22 : 32;
    // контур острова
    const rim = new Float32Array(SEG);
    for (let i = 0; i < T.n; i += 2) {
      const a = Math.atan2(T.z[i], T.x[i]);
      const r = Math.hypot(T.x[i], T.z[i]);
      const k = Math.round(((a + Math.PI) / (Math.PI * 2)) * SEG) % SEG;
      for (let j = -3; j <= 3; j++) {
        const kk = (k + j + SEG) % SEG;
        rim[kk] = Math.max(rim[kk], r);
      }
    }
    const rim2 = new Float32Array(SEG);
    for (let k = 0; k < SEG; k++) {
      let s = 0;
      for (let j = -4; j <= 4; j++) s += rim[(k + j + SEG) % SEG];
      const a = (k / SEG) * Math.PI * 2 - Math.PI;
      rim2[k] = s / 9 + 48 + noise2(Math.cos(a) * 200, Math.sin(a) * 200, 5) * 14;
    }
    this.rim = rim2;
    this.SEG = SEG;
    const p = this.pal;
    const c1 = new THREE.Color(p.g1),
      c2 = new THREE.Color(p.g2),
      cs = new THREE.Color(p.shoulder);
    const pos = [],
      col = [],
      idx = [];
    const tmp = new THREE.Color();
    pos.push(0, this.groundH(0, 0).h, 0);
    tmp.copy(c1);
    col.push(tmp.r, tmp.g, tmp.b);
    for (let r = 1; r <= RINGS; r++) {
      const f = r / RINGS;
      for (let k = 0; k < SEG; k++) {
        const a = (k / SEG) * Math.PI * 2 - Math.PI;
        const R = rim2[k] * Math.pow(f, 0.85);
        const x = Math.cos(a) * R,
          z = Math.sin(a) * R;
        const g = this.groundH(x, z);
        const edge = smooth(0.94, 1, f);
        pos.push(x, g.h - edge * 1.2, z);
        const n = noise2(x * 2.3, z * 2.3, 3) * 0.5 + 0.5;
        tmp.copy(c1).lerp(c2, n);
        if (g.d < T.halfW + 4) tmp.lerp(cs, 0.65 * (1 - smooth(T.halfW + 1, T.halfW + 4, g.d)));
        col.push(tmp.r, tmp.g, tmp.b);
      }
    }
    for (let k = 0; k < SEG; k++) idx.push(0, 1 + ((k + 1) % SEG), 1 + k);
    for (let r = 1; r < RINGS; r++)
      for (let k = 0; k < SEG; k++) {
        const a = 1 + (r - 1) * SEG + k,
          b = 1 + (r - 1) * SEG + ((k + 1) % SEG);
        const c = a + SEG,
          d = b + SEG;
        idx.push(a, b, d, a, d, c);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    this.root.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })));
    // нижняя скала
    const layers = [
      [0, 1.0, p.g2],
      [-2.5, 1.0, p.rock1],
      [-9, 0.9, p.rock1],
      [-20, 0.7, p.rock2],
      [-34, 0.45, p.rock2],
      [-48, 0.18, p.rockBot],
      [-56, 0.02, p.rockBot],
    ];
    const sp = [],
      sc = [],
      si = [];
    layers.forEach(([y, s, c], li) => {
      const cc = new THREE.Color(c);
      for (let k = 0; k < SEG; k++) {
        const a = (k / SEG) * Math.PI * 2 - Math.PI;
        const jitter = li === 0 ? 0 : noise2(k * 9, li * 17, 2) * 6 * s;
        const R = rim2[k] * s + jitter;
        sp.push(Math.cos(a) * R, y - 1.2 + (li ? noise2(k * 5, li * 3, 7) * 2.5 : 0), Math.sin(a) * R);
        const d = 0.9 + noise2(k * 7, li, 1) * 0.12;
        sc.push(cc.r * d, cc.g * d, cc.b * d);
      }
    });
    for (let l = 0; l < layers.length - 1; l++)
      for (let k = 0; k < SEG; k++) {
        const a = l * SEG + k,
          b = l * SEG + ((k + 1) % SEG),
          c = a + SEG,
          d = b + SEG;
        si.push(a, d, b, a, c, d);
      }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
    sg.setIndex(si);
    sg.computeVertexNormals();
    this.root.add(new THREE.Mesh(sg, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  }

  insideIsland(x, z, margin = 6) {
    const a = Math.atan2(z, x);
    const k = Math.round(((a + Math.PI) / (Math.PI * 2)) * this.SEG) % this.SEG;
    return Math.hypot(x, z) < this.rim[k] - margin;
  }

  // ---------- дорога ----------
  road() {
    const T = this.T,
      p = this.pal;
    const pos = [],
      col = [],
      nor = [];
    const C = (c) => new THREE.Color(c);
    const quad = (a, b, c, d, color, ny = 1) => {
      // a,b — ближний край; c,d — дальний; порядок против часовой при взгляде сверху
      for (const v of [a, b, c, a, c, d]) {
        pos.push(v[0], v[1], v[2]);
        col.push(color.r, color.g, color.b);
        nor.push(0, ny, 0);
      }
    };
    const P = (i, d, dy = 0) => [T.x[i] + T.nx[i] * d, T.y[i] + dy, T.z[i] + T.nz[i] * d];
    const roadA = C(p.road),
      roadB = C(p.road2),
      curbA = C(p.curb[0]),
      curbB = C(p.curb[1]),
      dash = C(p.dash),
      under = C(p.road).multiplyScalar(0.6);
    const hw = T.halfW;
    const n = T.n;
    const S = 2;
    for (let i = 0; i < n; i += S) {
      const j = (i + S) % n;
      const seg = i / S;
      const rc = seg % 6 < 3 ? roadA : roadB;
      // полотно
      quad(P(i, -hw + 0.9, 0.02), P(j, -hw + 0.9, 0.02), P(j, hw - 0.9, 0.02), P(i, hw - 0.9, 0.02), rc);
      // бордюры
      const cc = Math.floor(seg / 2) % 2 ? curbA : curbB;
      quad(P(i, hw - 0.9, 0.05), P(j, hw - 0.9, 0.05), P(j, hw + 0.3, 0.05), P(i, hw + 0.3, 0.05), cc);
      quad(P(i, -hw - 0.3, 0.05), P(j, -hw - 0.3, 0.05), P(j, -hw + 0.9, 0.05), P(i, -hw + 0.9, 0.05), cc);
      // разметка
      if (seg % 4 < 2 && i > 6 && i < n - 24) quad(P(i, -0.18, 0.04), P(j, -0.18, 0.04), P(j, 0.18, 0.04), P(i, 0.18, 0.04), dash);
      // нижняя плита
      quad(P(i, hw + 0.9, -0.9), P(j, hw + 0.9, -0.9), P(j, -hw - 0.9, -0.9), P(i, -hw - 0.9, -0.9), under, -1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    this.root.add(m);
  }

  rails() {
    const T = this.T,
      p = this.pal;
    const pos = [],
      col = [];
    const A = new THREE.Color(p.rail[0]),
      B = new THREE.Color(p.rail[1]);
    const hw = T.halfW;
    const n = T.n;
    const S = 2;
    const H = 0.75,
      W = 0.5;
    const tri = (a, b, c, cl) => {
      for (const v of [a, b, c]) {
        pos.push(v[0], v[1], v[2]);
        col.push(cl.r, cl.g, cl.b);
      }
    };
    const box = (i, j, d0, cl) => {
      const P = (k, d, y) => [T.x[k] + T.nx[k] * d, T.y[k] + y, T.z[k] + T.nz[k] * d];
      const sgn = Math.sign(d0);
      const din = d0,
        dout = d0 + sgn * W;
      const a0 = P(i, din, -0.9),
        a1 = P(i, din, H),
        b0 = P(j, din, -0.9),
        b1 = P(j, din, H);
      const c0 = P(i, dout, -0.9),
        c1 = P(i, dout, H),
        d0_ = P(j, dout, -0.9),
        d1 = P(j, dout, H);
      // внутренняя, верх, наружная (двусторонний материал)
      tri(a0, b0, b1, cl);
      tri(a0, b1, a1, cl);
      const top = cl.clone().multiplyScalar(1.08);
      tri(a1, b1, d1, top);
      tri(a1, d1, c1, top);
      const out = cl.clone().multiplyScalar(0.8);
      tri(c0, d0_, d1, out);
      tri(c0, d1, c1, out);
    };
    for (let i = 0; i < n; i += S) {
      const j = (i + S) % n;
      const cl = Math.floor(i / S / 2) % 2 ? A : B;
      box(i, j, hw + 0.3, cl);
      box(i, j, -hw - 0.3, cl);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: this.T.theme === 'night' ? 0x302040 : 0x000000 }));
    this.root.add(m);
  }

  pillars() {
    const T = this.T;
    const list = [];
    for (let i = 0; i < T.n; i += 14) {
      if (T.y[i] < 1.6) continue;
      for (const s of [-1, 1]) {
        const x = T.x[i] + T.nx[i] * s * T.halfW * 0.55,
          z = T.z[i] + T.nz[i] * s * T.halfW * 0.55;
        list.push([x, T.y[i] - 0.9, z]);
      }
    }
    if (!list.length) return;
    const geo = new THREE.CylinderGeometry(0.7, 0.9, 1, 10).translate(0, 0.5, 0);
    const mat = new THREE.MeshLambertMaterial({ color: this.T.theme === 'night' ? 0x8a84b8 : 0xf0ece4 });
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    const m = new THREE.Matrix4();
    list.forEach(([x, top, z], k) => {
      const base = this.groundH(x, z).h - 0.5;
      m.compose(new THREE.Vector3(x, base, z), new THREE.Quaternion(), new THREE.Vector3(1, Math.max(0.5, top - base), 1));
      im.setMatrixAt(k, m);
    });
    this.root.add(im);
  }

  start() {
    const T = this.T;
    const hw = T.halfW;
    const o = pointAt(T, 0, 0);
    const ang = Math.atan2(o.tx, o.tz);
    // линия старта
    const tex = checkerTex(Math.round(hw * 2), 2);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2 - 1.8, 2).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: tex }));
    line.position.set(o.x, o.y + 0.06, o.z);
    line.rotation.y = ang;
    this.root.add(line);
    // разметка стартовой решётки
    const gm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
    for (let k = 0; k < 10; k++) {
      const s = -4 - Math.floor(k / 2) * 4 + 1.2;
      const d = k % 2 ? -3 : 3;
      const q = pointAt(T, s, d);
      const mk = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.3).rotateX(-Math.PI / 2), gm);
      mk.position.set(q.x, q.y + 0.05, q.z);
      mk.rotation.y = Math.atan2(q.tx, q.tz);
      this.root.add(mk);
    }
    // арка
    const gate = new THREE.Group();
    gate.position.set(o.x, o.y, o.z);
    gate.rotation.y = ang;
    const postM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const accent = new THREE.MeshLambertMaterial({ color: this.pal.rail[0] });
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 7.4, 12), postM);
      post.position.set(s * (hw + 1.4), 3.7, 0);
      gate.add(post);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 10), accent);
      cap.position.set(s * (hw + 1.4), 7.6, 0);
      gate.add(cap);
    }
    const ban = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 2.8, 1.6, 0.5), [accent, accent, accent, accent, new THREE.MeshLambertMaterial({ map: checkerTex(16, 2) }), new THREE.MeshLambertMaterial({ map: checkerTex(16, 2) })]);
    ban.position.set(0, 6.6, 0);
    gate.add(ban);
    // огни отсчёта
    this.lights = [];
    for (let k = 0; k < 3; k++) {
      const m = new THREE.MeshBasicMaterial({ color: 0x44404a });
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), m);
      b.position.set((1 - k) * 1.3, 5.4, -0.1);
      gate.add(b);
      const box = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 0.4), new THREE.MeshLambertMaterial({ color: 0x2d2f38 }));
      if (k === 0) {
        box.position.set(0, 5.4, 0.1);
        gate.add(box);
      }
      this.lights.push(m);
    }
    this.root.add(gate);
  }

  // 0..3 — сколько огней горит; 4 — зелёный
  setLights(n) {
    if (!this.lights) return;
    this.lights.forEach((m, k) => m.color.set(n >= 4 ? 0x5dff7a : k < n ? 0xff4a4a : 0x44404a));
  }

  boosts() {
    const T = this.T;
    const tex = boostTex();
    tex.repeat.set(1, 2);
    this.boostTex = tex;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95 });
    for (const b of T.boosts) {
      const q = pointAt(T, b.i * STEP, b.d);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 6).rotateX(-Math.PI / 2), mat);
      m.position.set(q.x, q.y + 0.07, q.z);
      m.rotation.y = Math.atan2(q.tx, q.tz) + Math.PI;
      this.root.add(m);
    }
  }

  coins() {
    const T = this.T;
    const geo = new THREE.CylinderGeometry(0.62, 0.62, 0.16, 18).rotateX(Math.PI / 2);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x7a5200, emissiveIntensity: 0.6 });
    const im = new THREE.InstancedMesh(geo, mat, T.coins.length);
    this.coinPos = T.coins.map((c) => {
      const q = pointAt(T, c.i * STEP, c.d);
      return new THREE.Vector3(q.x, q.y + 1.1, q.z);
    });
    this.coinTaken = new Uint8Array(T.coins.length);
    this.coinMesh = im;
    this.root.add(im);
    this.updateCoins(0);
  }

  updateCoins(t) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, t * 2.6, 0));
    const one = new THREE.Vector3(1, 1, 1),
      zero = new THREE.Vector3(0, 0, 0);
    this.coinPos.forEach((p, k) => {
      const v = p.clone();
      v.y += Math.sin(t * 3 + k * 0.7) * 0.12;
      m.compose(v, q, this.coinTaken[k] ? zero : one);
      this.coinMesh.setMatrixAt(k, m);
    });
    this.coinMesh.instanceMatrix.needsUpdate = true;
  }

  resetCoins() {
    this.coinTaken.fill(0);
  }

  decor() {
    const T = this.T;
    const { P, set } = prefabs(T.theme);
    const total = this.q === 'low' ? 170 : this.q === 'mid' ? 260 : 360;
    const R = this.R;
    const placed = [];
    const byType = {};
    let tries = 0;
    let maxR = 0;
    for (const v of this.rim) maxR = Math.max(maxR, v);
    while (placed.length < total && tries++ < total * 30) {
      const x = (R() * 2 - 1) * maxR,
        z = (R() * 2 - 1) * maxR;
      if (!this.insideIsland(x, z, 5)) continue;
      let u = R(),
        type = set[0][0];
      for (const [t, w] of set) {
        if (u < w) {
          type = t;
          break;
        }
        u -= w;
      }
      const pf = P[type];
      const g = this.groundH(x, z);
      // не ставим под трассой и рядом с ней (над эстакадами тоже)
      if (g.d < T.halfW + 3.5 + pf.r) continue;
      if (placed.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < (p.r + pf.r) ** 2)) continue;
      placed.push({ x, z, r: pf.r });
      (byType[type] = byType[type] || []).push({ x, y: g.h - 0.1, z, s: 0.8 + R() * 0.5, a: R() * Math.PI * 2, c: pf.colors[Math.floor(R() * pf.colors.length)] });
    }
    for (const [type, list] of Object.entries(byType)) {
      const pf = P[type];
      const mat = pf.emissive
        ? new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x402060, emissiveIntensity: 1 })
        : new THREE.MeshLambertMaterial({ vertexColors: true });
      const im = new THREE.InstancedMesh(pf.geo, mat, list.length);
      const m = new THREE.Matrix4();
      list.forEach((o, k) => {
        m.compose(new THREE.Vector3(o.x, o.y, o.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, o.a, 0)), new THREE.Vector3(o.s, o.s, o.s));
        im.setMatrixAt(k, m);
        im.setColorAt(k, new THREE.Color(o.c));
      });
      this.root.add(im);
    }
    // ночью — светлячки над деревьями
    if (T.theme === 'night') {
      const n = 160;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const o = placed[Math.floor(R() * placed.length)] || { x: 0, z: 0 };
        pos[i * 3] = o.x + (R() - 0.5) * 8;
        pos[i * 3 + 1] = 1 + R() * 6;
        pos[i * 3 + 2] = o.z + (R() - 0.5) * 8;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex('255,240,150'), size: 1.4, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff08a }));
      this.root.add(pts);
      this.anim.push((t) => (pts.position.y = Math.sin(t * 0.8) * 0.4));
    }
  }

  clouds() {
    const R = rng(this.T.def.seed + 77);
    const n = this.q === 'low' ? 26 : 44;
    const puffs = [];
    let maxR = 0;
    for (const v of this.rim) maxR = Math.max(maxR, v);
    for (let c = 0; c < n; c++) {
      const a = R() * Math.PI * 2;
      const below = c < n * 0.55;
      const r = below ? maxR * (0.6 + R() * 1.4) : maxR * (1.5 + R() * 2.2);
      const y = below ? -30 - R() * 70 : -20 + R() * 80;
      const s = 10 + R() * 16;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      const k = 4 + Math.floor(R() * 4);
      for (let i = 0; i < k; i++) puffs.push([x + (R() - 0.5) * s * 2.4, y + (R() - 0.3) * s * 0.5, z + (R() - 0.5) * s * 1.4, s * (0.5 + R() * 0.6)]);
    }
    const night = this.T.theme === 'night';
    const mat = new THREE.MeshLambertMaterial({ color: night ? 0x6a6aa8 : 0xffffff, emissive: night ? 0x1a1840 : 0x404650, flatShading: false });
    const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), mat, puffs.length);
    const m = new THREE.Matrix4();
    puffs.forEach(([x, y, z, s], k) => {
      m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(s, s * 0.62, s));
      im.setMatrixAt(k, m);
    });
    this.cloudMesh = im;
    this.root.add(im);
    this.anim.push((t) => (im.rotation.y = t * 0.004));
  }

  balloons() {
    const R = rng(this.T.def.seed + 5);
    const cols = [0xff6b6b, 0xffd166, 0x4ecdc4, 0xa78bfa, 0xff8fd0];
    let maxR = 0;
    for (const v of this.rim) maxR = Math.max(maxR, v);
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const c = cols[i % cols.length];
      const env = new THREE.Mesh(new THREE.SphereGeometry(5, 18, 14), new THREE.MeshLambertMaterial({ color: c }));
      env.scale.set(1, 1.15, 1);
      g.add(env);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(5.05, 4.2, 2, 18, 1, true), new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      band.position.y = -1.2;
      g.add(band);
      const basket = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 2), new THREE.MeshLambertMaterial({ color: 0xa0703c }));
      basket.position.y = -8.4;
      g.add(basket);
      const a = R() * Math.PI * 2,
        r = maxR * (0.7 + R() * 0.9);
      g.position.set(Math.cos(a) * r, 30 + R() * 40, Math.sin(a) * r);
      this.root.add(g);
      const y0 = g.position.y,
        ph = R() * 6;
      this.anim.push((t) => {
        g.position.y = y0 + Math.sin(t * 0.4 + ph) * 2;
        g.rotation.y = t * 0.05 + ph;
      });
    }
  }

  lanterns() {
    const T = this.T;
    const poles = [];
    for (let i = 10; i < T.n; i += 26) {
      const s = (i / 26) % 2 ? 1 : -1;
      const d = s * (T.halfW + 1.6);
      poles.push([T.x[i] + T.nx[i] * d, T.y[i], T.z[i] + T.nz[i] * d]);
    }
    const pg = new THREE.CylinderGeometry(0.12, 0.16, 4.2, 8).translate(0, 2.1, 0);
    const pm = new THREE.InstancedMesh(pg, new THREE.MeshLambertMaterial({ color: 0x3a3a5a }), poles.length);
    const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff0b0 }), poles.length);
    const m = new THREE.Matrix4();
    const gpos = new Float32Array(poles.length * 3);
    poles.forEach(([x, y, z], k) => {
      const base = Math.min(y - 0.9, this.groundH(x, z).h);
      const top = y + 4.2;
      m.compose(new THREE.Vector3(x, base, z), new THREE.Quaternion(), new THREE.Vector3(1, (top - base) / 4.2, 1));
      pm.setMatrixAt(k, m);
      m.compose(new THREE.Vector3(x, top + 0.3, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      bm.setMatrixAt(k, m);
      gpos.set([x, top + 0.3, z], k * 3);
    });
    this.root.add(pm, bm);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(gpos, 3));
    this.root.add(new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex('255,230,160'), size: 7, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe8a0 })));
  }

  snow() {
    const n = this.q === 'low' ? 500 : 1100;
    const pos = new Float32Array(n * 3);
    const R = rng(5);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (R() - 0.5) * 120;
      pos[i * 3 + 1] = R() * 50;
      pos[i * 3 + 2] = (R() - 0.5) * 120;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex('255,255,255'), size: 0.45, transparent: true, depthWrite: false, color: 0xffffff }));
    pts.frustumCulled = false;
    this.root.add(pts);
    this.snowPts = pts;
  }

  stands() {
    const T = this.T;
    const s0 = -30,
      len = 40;
    const side = -1;
    const R = rng(3);
    const stepM = new THREE.MeshLambertMaterial({ color: 0xf2efe8 });
        const crowd = [];
    const g = new THREE.Group();
    for (let s = s0; s < s0 + len; s += 4) {
      const q = pointAt(T, s, side * (T.halfW + 6));
      const ang = Math.atan2(q.tx, q.tz);
      for (let r = 0; r < 4; r++) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 4.1), stepM);
        const px = q.x + (T.nx[q.i] * side) * r * 1.6,
          pz = q.z + (T.nz[q.i] * side) * r * 1.6;
        const base = Math.min(q.y, this.groundH(px, pz).h) - 0.4;
        const h = q.y - base + 0.4 + r * 0.8;
        st.scale.y = h / 0.8;
        st.position.set(px, base + h / 2, pz);
        st.rotation.y = ang;
        g.add(st);
        for (let c = 0; c < 3; c++) if (R() < 0.85) crowd.push([px + q.tx * (c - 1) * 1.2, base + h + 0.45, pz + q.tz * (c - 1) * 1.2]);
      }
      // флажки над трибуной
      const fx = q.x + T.nx[q.i] * side * 6.6,
        fz = q.z + T.nz[q.i] * side * 6.6;
      const fb = Math.min(q.y, this.groundH(fx, fz).h) - 0.4;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, q.y - fb + 6.5, 6), stepM);
      pole.position.set(fx, (q.y + 6.5 + fb) / 2, fz);
      g.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshLambertMaterial({ color: [0xff6b6b, 0xffd166, 0x4ecdc4, 0xa78bfa][Math.floor(R() * 4)], side: THREE.DoubleSide }));
      flag.position.set(fx + q.tx * 0.7, q.y + 6.0, fz + q.tz * 0.7);
      flag.rotation.y = ang + Math.PI / 2;
      g.add(flag);
    }
    this.root.add(g);
    const cols = [0xff6b6b, 0xffd166, 0x4ecdc4, 0xa78bfa, 0xff8fd0, 0x5aa9ff, 0x7ed957];
    const im = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.28, 0.4, 4, 8), new THREE.MeshLambertMaterial(), crowd.length);
    const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.24, 10, 8), new THREE.MeshLambertMaterial({ color: 0xffd9b8 }), crowd.length);
    crowd.forEach((p, k) => im.setColorAt(k, new THREE.Color(cols[k % cols.length])));
    this.root.add(im, head);
    const m = new THREE.Matrix4();
    const one = new THREE.Vector3(1, 1, 1);
    const q0 = new THREE.Quaternion();
    this.crowd = { im, head, crowd };
    this.cheer = 0.2;
    this.anim.push((t) => {
      crowd.forEach((p, k) => {
        const j = Math.max(0, Math.sin(t * (6 + (k % 5)) + k)) * 0.25 * this.cheer;
        m.compose(new THREE.Vector3(p[0], p[1] + j, p[2]), q0, one);
        im.setMatrixAt(k, m);
        m.compose(new THREE.Vector3(p[0], p[1] + j + 0.55, p[2]), q0, one);
        head.setMatrixAt(k, m);
      });
      im.instanceMatrix.needsUpdate = true;
      head.instanceMatrix.needsUpdate = true;
    });
  }

  update(dt, t, cam) {
    if (this.boostTex) this.boostTex.offset.y = -t * 1.6;
    this.updateCoins(t);
    if (this.snowPts) {
      const a = this.snowPts.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        let y = a.getY(i) - dt * 3.2;
        if (y < -5) y += 55;
        a.setY(i, y);
        a.setX(i, a.getX(i) + Math.sin(t + i) * dt * 0.4);
      }
      a.needsUpdate = true;
      this.snowPts.position.set(cam.position.x, cam.position.y - 20, cam.position.z);
    }
    if (this.skyMesh) this.skyMesh.position.copy(cam.position);
    for (const f of this.anim) f(t, dt);
  }
}
