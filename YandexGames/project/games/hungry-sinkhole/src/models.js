// Модели реквизита из простых фигур с цветами вершин. Атрибут aTint = 1 у деталей,
// которые перекрашиваются цветом экземпляра (кузов машины, футболка, ящик контейнера).
// Каждая модель строится от земли (y = 0) и в конце центрируется по высоте коллайдера.
import * as THREE from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PROPS, CAR_SIZE } from './city.js';
import { B } from './model-builder.js';
import {polishModel} from './model-details.js';
import {EXTRA_MODELS,vehicleVariant} from './model-expansion.js';
import {makeThemeModels} from './theme-models.js';


const WHEEL = 0x2a2a30;
const RIM = 0xd8dce4;
const GLASS = 0x9fd0f0;
const SKIN = [0xf6d2b0, 0xe8b890, 0xc08860, 0x8a5a3a];

function wheels(b, xs, zs, r, w) {
  for (const x of xs)
    for (const z of zs) {
      b.cyl(r, r, w, x, r, z, WHEEL, 0, 12, 0, 0, Math.PI / 2);
      b.cyl(r * 0.55, r * 0.55, w + 0.02, x, r, z, RIM, 0, 8, 0, 0, Math.PI / 2);
      // спицы
      for (let k = 0; k < 3; k++) b.box(w + 0.03, r * 0.95, 0.04, x, r, z, 0xa8acb4, 0, (k * Math.PI) / 3, 0, 0);
    }
}

const M = {
  cactus(){const b=new B();b.cyl(.25,.32,2.6,0,1.3,0,0x66b87a);for(const s of [-1,1]){b.box(.7,.28,.3,s*.35,1.4+s*.3,0,0x4c9d68);b.cyl(.15,.17,.8,s*.65,1.7+s*.3,0,0x66b87a);}b.ball(.2,0,2.7,0,0xffa6c8);return b.done(3.2);},
  crystal(){const b=new B();b.cyl(.05,.48,1.8,0,1.3,0,0xb3edee,1,5);b.cone(.48,.6,0,2.1,0,0xe8ffff,0,5);b.cone(.25,1.1,.35,.6,.2,0x76c0d6,1,5);return b.done(2.4);},
  mushroom(){const b=new B();b.cyl(.18,.3,.9,0,.45,0,0xffe4b2);b.ball(.7,0,1,0,0xe87380,0,1,.55,1);for(const x of [-.3,.3])b.ball(.13,x,1.25,0,0xfff7e7);return b.done(1.4);},
  pumpkin(){const b=new B();for(let i=0;i<7;i++){const a=i*Math.PI*2/7;b.ball(.31,Math.cos(a)*.23,.44,Math.sin(a)*.23,0xf2a03a,0,.85,1.4,.85);}b.cyl(.08,.1,.22,0,.9,0,0x5d8d52);return b.done(1);},
  lollipop(){const b=new B();b.cyl(.065,.065,2,0,1,0,0xffedcd);b.ball(.55,0,2.2,0,0xff83bb,0,1,1,.38);b.torus(.3,.065,0,2.2,.22,0xfff5d9);b.ball(.12,0,2.2,.23,0xfff5d9);return b.done(2.8);},
  car() {
    const b = new B();
    wheels(b, [-0.82, 0.82], [-1.25, 1.25], 0.34, 0.24);
    b.box(1.76, 0.6, 3.9, 0, 0.62, 0, 0xffffff, 1);
    b.box(1.5, 0.52, 2.0, 0, 1.17, -0.2, 0xffffff, 1);
    b.box(1.52, 0.42, 1.7, 0, 1.17, -0.2, GLASS);
    b.box(1.4, 0.44, 0.06, 0, 1.15, 0.82, GLASS, 0, -0.5, 0, 0);
    b.box(1.4, 0.4, 0.06, 0, 1.15, -1.22, GLASS, 0, 0.5, 0, 0);
    b.box(1.6, 0.18, 0.08, 0, 0.5, 1.96, 0xd8dce4);
    b.box(1.6, 0.18, 0.08, 0, 0.5, -1.96, 0xd8dce4);
    for (const x of [-0.6, 0.6]) {
      b.box(0.34, 0.16, 0.05, x, 0.74, 1.95, 0xfff6c0);
      b.box(0.3, 0.14, 0.05, x, 0.74, -1.95, 0xff4a3a);
      b.box(0.1, 0.08, 0.18, x * 1.55, 1.05, 0.55, 0xffffff, 1);
    }
    b.box(0.5, 0.12, 0.04, 0, 0.5, 2.0, 0xffffff);
    return b.done(1.5);
  },
  van() {
    const b = new B();
    wheels(b, [-0.9, 0.9], [-1.5, 1.5], 0.38, 0.26);
    b.box(1.96, 1.6, 4.5, 0, 1.2, 0, 0xffffff, 1);
    b.box(1.98, 0.6, 0.9, 0, 1.55, 1.8, GLASS);
    b.box(1.8, 0.62, 0.06, 0, 1.5, 2.26, GLASS);
    b.box(2.0, 0.18, 0.08, 0, 0.6, 2.28, 0xd8dce4);
    for (const x of [-0.65, 0.65]) b.box(0.36, 0.18, 0.05, x, 0.85, 2.27, 0xfff6c0);
    b.box(2.0, 0.25, 3.2, 0, 1.4, -0.6, 0xffffff);
    return b.done(2.2);
  },
  bus() {
    const b = new B();
    wheels(b, [-1.1, 1.1], [-3, 3], 0.48, 0.3);
    b.box(2.46, 2.5, 8.9, 0, 1.6, 0, 0xffffff, 1);
    b.box(2.48, 0.9, 8.0, 0, 2.05, -0.2, GLASS);
    b.box(2.2, 1.2, 0.06, 0, 2.0, 4.46, GLASS);
    for (let k = -3; k <= 3; k++) b.box(2.5, 0.9, 0.1, 0, 2.05, k * 1.1, 0xffffff, 1);
    b.box(2.5, 0.3, 8.9, 0, 0.6, 0, 0x3a3a44);
    b.box(1.6, 0.3, 0.05, 0, 2.95, 4.46, 0x2a2a30);
    b.box(1.2, 0.2, 0.06, 0, 2.95, 4.47, 0xffd24a);
    for (const x of [-0.85, 0.85]) b.box(0.4, 0.2, 0.05, x, 0.95, 4.46, 0xfff6c0);
    b.box(2.1, 0.18, 1.6, 0, 2.9, -1.5, 0xd8dce4);
    return b.done(3.1);
  },
  truck() {
    const b = new B();
    wheels(b, [-1.05, 1.05], [-2.6, -1.4, 2.3], 0.46, 0.3);
    b.box(2.3, 2.0, 1.9, 0, 1.45, 2.45, 0xffffff, 1);
    b.box(2.32, 0.8, 1.2, 0, 1.85, 2.6, GLASS);
    b.box(2.0, 0.85, 0.06, 0, 1.8, 3.41, GLASS);
    b.box(2.4, 2.4, 4.6, 0, 1.75, -1.1, 0xeeeeee);
    for (let k = 0; k < 9; k++) b.box(2.42, 2.3, 0.06, 0, 1.75, -3.2 + k * 0.5, 0xd8dce4);
    b.box(2.4, 0.3, 6.9, 0, 0.55, 0, 0x3a3a44);
    for (const x of [-0.8, 0.8]) b.box(0.4, 0.2, 0.05, x, 0.8, 3.41, 0xfff6c0);
    return b.done(3);
  },
  person(v = 0) {
    const b = new B();
    const skin = SKIN[v % 4];
    b.box(0.17, 0.75, 0.2, -0.11, 0.38, 0, [0x3a4a7a, 0x4a3a2a, 0x2a2a30, 0x6a7a8a][v % 4]);
    b.box(0.17, 0.75, 0.2, 0.11, 0.38, 0, [0x3a4a7a, 0x4a3a2a, 0x2a2a30, 0x6a7a8a][v % 4]);
    b.box(0.2, 0.08, 0.28, -0.11, 0.04, 0.04, 0x2a2a2a);
    b.box(0.2, 0.08, 0.28, 0.11, 0.04, 0.04, 0x2a2a2a);
    b.box(0.5, 0.58, 0.3, 0, 1.02, 0, 0xffffff, 1);
    b.box(0.13, 0.5, 0.15, -0.32, 1.02, 0, 0xffffff, 1, 0, 0, 0.12);
    b.box(0.13, 0.5, 0.15, 0.32, 1.02, 0, 0xffffff, 1, 0, 0, -0.12);
    b.ball(0.08, -0.35, 0.74, 0, skin);
    b.ball(0.08, 0.35, 0.74, 0, skin);
    b.ball(0.22, 0, 1.47, 0, skin, 0, 1, 1.05, 1);
    b.ball(0.23, 0, 1.56, -0.03, [0x3a2616, 0xd8b060, 0x1a1a1a, 0x8a4a2a][(v + 1) % 4], 0, 1.03, 0.7, 1.05);
    b.ball(0.035, -0.08, 1.49, 0.2, 0x1a1a1a);
    b.ball(0.035, 0.08, 1.49, 0.2, 0x1a1a1a);
    b.ball(0.04, -0.13, 1.42, 0.18, 0xff9a9a);
    b.ball(0.04, 0.13, 1.42, 0.18, 0xff9a9a);
    if (v === 2) b.box(0.3, 0.32, 0.12, 0, 1.0, -0.21, 0x3a6a4a);
    return b.done(1.7);
  },
  knight() {
    const b = new B();
    b.box(0.17, 0.75, 0.2, -0.11, 0.38, 0, 0x8a8e98);
    b.box(0.17, 0.75, 0.2, 0.11, 0.38, 0, 0x8a8e98);
    b.box(0.52, 0.6, 0.32, 0, 1.02, 0, 0xc0c4cc);
    b.box(0.5, 0.45, 0.34, 0, 0.95, 0, 0xffffff, 1);
    b.ball(0.24, 0, 1.48, 0, 0xc0c4cc, 0, 1, 1.1, 1);
    b.box(0.3, 0.05, 0.05, 0, 1.48, 0.23, 0x2a2a30);
    b.cone(0.06, 0.3, 0, 1.78, 0, 0xffffff, 1);
    b.box(0.06, 1.0, 0.06, 0.38, 1.0, 0.1, 0xd8dce4);
    b.ball(0.2, -0.36, 1.0, 0.12, 0xffffff, 1, 0.3, 1, 1);
    return b.done(1.7);
  },
  peasant() {
    const b = new B();
    const skin = SKIN[0];
    b.box(0.17, 0.6, 0.2, -0.11, 0.3, 0, 0x6a4a2a);
    b.box(0.17, 0.6, 0.2, 0.11, 0.3, 0, 0x6a4a2a);
    b.cyl(0.24, 0.32, 0.7, 0, 0.85, 0, 0xffffff, 1, 8);
    b.box(0.5, 0.06, 0.34, 0, 0.82, 0, 0x6a4a2a);
    b.ball(0.22, 0, 1.45, 0, skin);
    b.cyl(0.32, 0.32, 0.04, 0, 1.6, 0, 0xe0c070, 0, 12);
    b.cone(0.18, 0.18, 0, 1.7, 0, 0xe0c070, 0, 10);
    b.ball(0.035, -0.08, 1.47, 0.2, 0x1a1a1a);
    b.ball(0.035, 0.08, 1.47, 0.2, 0x1a1a1a);
    return b.done(1.7);
  },
  dog() {
    const b = new B();
    for (const x of [-0.1, 0.1]) for (const z of [-0.25, 0.25]) b.box(0.08, 0.25, 0.08, x, 0.13, z, 0xc8925a);
    b.box(0.26, 0.22, 0.6, 0, 0.34, 0, 0xc8925a);
    b.box(0.22, 0.22, 0.24, 0, 0.47, 0.34, 0xc8925a);
    b.box(0.12, 0.1, 0.12, 0, 0.42, 0.5, 0xe8c8a0);
    b.box(0.07, 0.14, 0.06, -0.09, 0.62, 0.3, 0x8a5a3a);
    b.box(0.07, 0.14, 0.06, 0.09, 0.62, 0.3, 0x8a5a3a);
    b.box(0.05, 0.05, 0.25, 0, 0.45, -0.38, 0xc8925a, 0, -0.6, 0, 0);
    b.ball(0.03, -0.06, 0.52, 0.46, 0x1a1a1a);
    b.ball(0.03, 0.06, 0.52, 0.46, 0x1a1a1a);
    return b.done(0.55);
  },
  sheep() {
    const b = new B();
    for (const x of [-0.18, 0.18]) for (const z of [-0.3, 0.3]) b.box(0.1, 0.3, 0.1, x, 0.15, z, 0x3a3a3a);
    b.ball(0.38, 0, 0.55, 0, 0xffffff, 0, 0.9, 0.75, 1.3);
    for (let k = 0; k < 6; k++) b.ball(0.16, Math.cos(k) * 0.25, 0.75, Math.sin(k * 1.3) * 0.3, 0xf8f8f8);
    b.box(0.22, 0.26, 0.26, 0, 0.62, 0.52, 0x3a3a3a);
    b.ball(0.03, -0.07, 0.68, 0.66, 0xffffff);
    b.ball(0.03, 0.07, 0.68, 0.66, 0xffffff);
    return b.done(0.9);
  },
  cow() {
    const b = new B();
    for (const x of [-0.28, 0.28]) for (const z of [-0.65, 0.65]) b.box(0.16, 0.6, 0.16, x, 0.3, z, 0xffffff);
    b.box(0.86, 0.66, 1.6, 0, 0.88, 0, 0xffffff);
    b.box(0.87, 0.4, 0.5, 0, 0.95, -0.3, 0x2a2a2a);
    b.box(0.6, 0.3, 0.3, 0.14, 1.0, 0.45, 0x2a2a2a);
    b.box(0.44, 0.44, 0.5, 0, 1.12, 0.95, 0xffffff);
    b.box(0.4, 0.2, 0.12, 0, 0.98, 1.22, 0xffb0b0);
    b.cone(0.05, 0.16, -0.18, 1.4, 0.95, 0xf0e8d0);
    b.cone(0.05, 0.16, 0.18, 1.4, 0.95, 0xf0e8d0);
    b.ball(0.12, 0, 0.52, -0.2, 0xffb0b0);
    return b.done(1.4);
  },
  tree() {
    const b = new B();
    b.cyl(0.14, 0.2, 1.9, 0, 0.95, 0, 0x8a5a3a, 0, 8);
    b.ball(1.05, 0, 2.7, 0, 0x5cb85c, 0, 1, 0.85, 1);
    b.ball(0.7, 0.55, 3.3, 0.2, 0x6cc86a, 0, 1, 0.85, 1);
    b.ball(0.65, -0.5, 3.15, -0.35, 0x4ea84e, 0, 1, 0.85, 1);
    b.ball(0.55, 0.1, 3.85, -0.1, 0x7ad478, 0, 1, 0.85, 1);
    for (let k = 0; k < 4; k++) b.ball(0.07, Math.cos(k * 1.7) * 0.85, 2.6 + (k % 2) * 0.6, Math.sin(k * 1.7) * 0.85, 0xff6a5a);
    return b.done(4.6);
  },
  pine() {
    const b = new B();
    b.cyl(0.12, 0.18, 1.2, 0, 0.6, 0, 0x7a4a2a, 0, 8);
    b.cone(1.05, 1.8, 0, 1.8, 0, 0x2e8a5a, 0, 9);
    b.cone(0.85, 1.6, 0, 2.8, 0, 0x37a066, 0, 9);
    b.cone(0.62, 1.4, 0, 3.75, 0, 0x45b072, 0, 9);
    b.cone(0.38, 1.0, 0, 4.6, 0, 0x55c080, 0, 9);
    return b.done(5.2);
  },
  palm() {
    const b = new B();
    for (let k = 0; k < 6; k++) b.cyl(0.16 - k * 0.01, 0.18 - k * 0.01, 0.8, k * 0.06, 0.4 + k * 0.78, 0, 0xb08a5a, 0, 7);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      b.box(0.4, 0.06, 1.5, 0.36 + Math.sin(a) * 0.7, 4.95, Math.cos(a) * 0.7, 0x4cb860, 0, 0.45, a, 0);
    }
    for (let k = 0; k < 3; k++) b.ball(0.12, 0.36 + Math.cos(k * 2) * 0.15, 4.75, Math.sin(k * 2) * 0.15, 0x7a5a2a);
    return b.done(5.6);
  },
  bush() {
    const b = new B();
    b.ball(0.55, 0, 0.45, 0, 0x4ea84e, 0, 1.1, 0.8, 1.1);
    b.ball(0.4, 0.35, 0.55, 0.2, 0x5cb85c);
    b.ball(0.38, -0.3, 0.5, -0.2, 0x5cb85c);
    for (let k = 0; k < 5; k++) b.ball(0.06, Math.cos(k * 1.3) * 0.55, 0.65 + (k % 2) * 0.15, Math.sin(k * 1.3) * 0.5, [0xffffff, 0xff8ac0, 0xffd24a][k % 3]);
    return b.done(1.0);
  },
  lamp() {
    const b = new B();
    b.cyl(0.16, 0.2, 0.3, 0, 0.15, 0, 0x3a4250, 0, 8);
    b.cyl(0.06, 0.08, 4.1, 0, 2.2, 0, 0x4a5260, 0, 8);
    b.box(0.08, 0.08, 0.7, 0, 4.2, 0.3, 0x4a5260);
    b.box(0.3, 0.12, 0.45, 0, 4.15, 0.6, 0x3a4250);
    b.box(0.24, 0.06, 0.38, 0, 4.07, 0.6, 0xfff2b0);
    b.box(0.3, 0.4, 0.05, 0, 3.0, 0.08, 0x3a6ac8);
    return b.done(4.6);
  },
  bench() {
    const b = new B();
    for (const x of [-0.75, 0.75]) {
      b.box(0.08, 0.45, 0.6, x, 0.22, 0, 0x3a4250);
      b.box(0.08, 0.5, 0.08, x, 0.65, -0.28, 0x3a4250);
    }
    for (let k = 0; k < 3; k++) b.box(1.8, 0.06, 0.16, 0, 0.47, -0.2 + k * 0.19, 0xc8864a);
    for (let k = 0; k < 2; k++) b.box(1.8, 0.14, 0.05, 0, 0.62 + k * 0.18, -0.3, 0xc8864a);
    return b.done(0.9);
  },
  hydrant() {
    const b = new B();
    b.cyl(0.18, 0.2, 0.6, 0, 0.3, 0, 0xe84a3a, 0, 10);
    b.ball(0.18, 0, 0.62, 0, 0xe84a3a);
    b.cyl(0.07, 0.07, 0.42, 0, 0.42, 0, 0xffd24a, 0, 8, 0, 0, Math.PI / 2);
    b.cyl(0.05, 0.05, 0.08, 0, 0.8, 0, 0xffd24a, 0, 8);
    b.cyl(0.22, 0.22, 0.06, 0, 0.03, 0, 0xc83a2a, 0, 10);
    return b.done(0.8);
  },
  bin() {
    const b = new B();
    b.cyl(0.28, 0.24, 0.8, 0, 0.4, 0, 0x4a8a5a, 0, 12);
    b.cyl(0.31, 0.31, 0.1, 0, 0.85, 0, 0x3a7a4a, 0, 12);
    b.box(0.2, 0.06, 0.06, 0, 0.92, 0, 0x2a5a3a);
    for (let k = 0; k < 4; k++) b.box(0.03, 0.6, 0.5, 0, 0.42, 0, 0x3a7a4a, 0, 0, (k * Math.PI) / 4, 0);
    return b.done(0.95);
  },
  mailbox() {
    const b = new B();
    b.box(0.08, 0.8, 0.08, 0, 0.4, 0, 0x6a4a2a);
    b.box(0.4, 0.35, 0.45, 0, 0.95, 0, 0x3a6ac8);
    b.cyl(0.2, 0.2, 0.45, 0, 1.12, 0, 0x3a6ac8, 0, 10, Math.PI / 2, 0, 0);
    b.box(0.04, 0.22, 0.06, 0.22, 1.12, 0.1, 0xe84a3a);
    return b.done(1.2);
  },
  cone() {
    const b = new B();
    b.box(0.45, 0.05, 0.45, 0, 0.025, 0, 0xff7a2a);
    b.cone(0.18, 0.7, 0, 0.4, 0, 0xff7a2a, 0, 10);
    b.cyl(0.11, 0.14, 0.12, 0, 0.42, 0, 0xffffff, 0, 10);
    return b.done(0.75);
  },
  barrel() {
    const b = new B();
    b.cyl(0.37, 0.37, 1.1, 0, 0.55, 0, 0xe84a3a, 0, 12);
    for (const y of [0.15, 0.55, 0.95]) b.cyl(0.38, 0.38, 0.06, 0, y, 0, 0xb83a2a, 0, 12);
    b.box(0.3, 0.3, 0.02, 0, 0.55, 0.37, 0xffd24a);
    b.box(0.08, 0.2, 0.03, 0, 0.58, 0.38, 0x1a1a1a);
    return b.done(1.1);
  },
  pump() {
    const b = new B();
    b.box(0.85, 0.15, 0.55, 0, 0.07, 0, 0x9aa4b0);
    b.box(0.7, 1.6, 0.45, 0, 0.95, 0, 0xffffff);
    b.box(0.72, 0.4, 0.47, 0, 1.6, 0, 0xe84a3a);
    b.box(0.4, 0.3, 0.02, 0, 1.15, 0.23, 0x2a3a4a);
    b.box(0.3, 0.12, 0.02, 0, 1.15, 0.24, 0x7ad478);
    b.box(0.1, 0.4, 0.15, 0.38, 0.9, 0, 0x2a2a30);
    return b.done(1.9);
  },
  tlight() {
    const b = new B();
    b.cyl(0.07, 0.09, 4.0, 0, 2.0, 0, 0x3a4250, 0, 8);
    b.box(0.3, 0.9, 0.3, 0, 3.6, 0.2, 0x2a2a30);
    b.ball(0.09, 0, 3.88, 0.36, 0xff4a3a);
    b.ball(0.09, 0, 3.6, 0.36, 0xffd24a);
    b.ball(0.09, 0, 3.32, 0.36, 0x6ae06a);
    return b.done(4.2);
  },
  busstop() {
    const b = new B();
    for (const x of [-1.5, 1.5]) b.box(0.08, 2.5, 0.08, x, 1.25, -0.6, 0x5a6470);
    b.box(3.2, 0.1, 1.4, 0, 2.55, 0, 0x3a6ac8);
    b.box(3.0, 2.0, 0.04, 0, 1.3, -0.62, 0xbfe6ff);
    b.box(0.04, 2.0, 1.1, -1.5, 1.3, -0.1, 0xbfe6ff);
    b.box(2.0, 0.08, 0.4, 0, 0.5, -0.4, 0xc8864a);
    b.box(0.9, 1.3, 0.05, 0.9, 1.3, -0.58, 0xffd24a);
    b.box(0.7, 1.1, 0.06, 0.9, 1.3, -0.58, 0xff8ac0);
    return b.done(2.6);
  },
  pot() {
    const b = new B();
    b.cyl(0.4, 0.3, 0.55, 0, 0.27, 0, 0xc86a4a, 0, 12);
    b.ball(0.38, 0, 0.7, 0, 0x5cb85c, 0, 1, 0.8, 1);
    for (let k = 0; k < 5; k++) b.ball(0.07, Math.cos(k * 1.25) * 0.28, 0.85, Math.sin(k * 1.25) * 0.28, 0xff6a8a);
    return b.done(1.0);
  },
  umbrella() {
    const b = new B();
    b.cyl(0.04, 0.04, 2.3, 0, 1.15, 0, 0xd8d8d8, 0, 6);
    for (let k = 0; k < 8; k++) b._add(new THREE.ConeGeometry(1.1, 0.45, 2, 1, false, (k * Math.PI) / 4, Math.PI / 4), k % 2 ? 0xffffff : 0xe84a3a, 0, 0, 2.18, 0);
    b.cyl(0.6, 0.6, 0.05, 0, 0.75, 0, 0xffffff, 0, 12);
    b.cyl(0.05, 0.05, 0.75, 0, 0.37, 0, 0x9aa4b0, 0, 6);
    for (let k = 0; k < 3; k++) b.box(0.4, 0.45, 0.4, Math.cos(k * 2.1) * 0.95, 0.22, Math.sin(k * 2.1) * 0.95, 0x8a5a3a);
    return b.done(2.4);
  },
  slide() {
    const b = new B();
    for (const x of [-0.5, 0.5]) for (const z of [-1.4, -0.5]) b.box(0.08, 2.2, 0.08, x, 1.1, z, 0xffd24a);
    b.box(1.1, 0.1, 1.0, 0, 1.6, -0.95, 0x3a8ae8);
    b.box(0.9, 0.08, 2.4, 0, 0.9, 0.5, 0xff6a3a, 0, 0.6, 0, 0);
    for (let k = 0; k < 5; k++) b.box(0.9, 0.06, 0.08, 0, 0.3 + k * 0.3, -1.55, 0x3a8ae8);
    b.cone(0.75, 0.6, 0, 2.5, -0.95, 0xe84a3a, 0, 4, 0, Math.PI / 4, 0);
    return b.done(2.4);
  },
  swing() {
    const b = new B();
    for (const x of [-1.4, 1.4]) {
      b.box(0.1, 2.5, 0.1, x, 1.2, 0.38, 0x3a8ae8, 0, -0.3, 0, 0);
      b.box(0.1, 2.5, 0.1, x, 1.2, -0.38, 0x3a8ae8, 0, 0.3, 0, 0);
    }
    b.box(2.9, 0.1, 0.1, 0, 2.35, 0, 0xe84a3a);
    for (const x of [-0.6, 0.6]) {
      b.box(0.03, 1.6, 0.03, x - 0.2, 1.5, 0, 0x9aa4b0);
      b.box(0.03, 1.6, 0.03, x + 0.2, 1.5, 0, 0x9aa4b0);
      b.box(0.5, 0.06, 0.25, x, 0.7, 0, 0xffd24a);
    }
    return b.done(2.4);
  },
  fountain() {
    const b = new B();
    b.cyl(2.2, 2.2, 0.6, 0, 0.3, 0, 0xd8d0c4, 0, 20);
    b.cyl(1.95, 1.95, 0.62, 0, 0.33, 0, 0x6ac0f0, 0, 20);
    b.cyl(0.35, 0.45, 1.3, 0, 0.9, 0, 0xd8d0c4, 0, 12);
    b.cyl(0.9, 0.7, 0.2, 0, 1.6, 0, 0xd8d0c4, 0, 14);
    b.cyl(0.8, 0.8, 0.22, 0, 1.63, 0, 0x8ad4f8, 0, 14);
    b.cone(0.18, 0.6, 0, 2.0, 0, 0xbfeaff, 0, 8);
    for (let k = 0; k < 8; k++) b.ball(0.08, Math.cos(k * 0.785) * 0.9, 1.4, Math.sin(k * 0.785) * 0.9, 0xbfeaff);
    return b.done(2.2);
  },
  statue() {
    const b = new B();
    b.box(1.6, 1.4, 1.6, 0, 0.7, 0, 0xc8c0b0);
    b.box(1.7, 0.15, 1.7, 0, 1.45, 0, 0xd8d0c4);
    b.box(0.6, 0.12, 0.02, 0, 0.9, 0.81, 0xc8a050);
    const bronze = 0x6aa890;
    b.box(0.2, 0.9, 0.25, -0.15, 1.95, 0, bronze);
    b.box(0.2, 0.9, 0.25, 0.15, 1.95, 0, bronze);
    b.box(0.6, 0.85, 0.35, 0, 2.8, 0, bronze);
    b.box(0.16, 0.8, 0.16, 0.42, 3.4, 0, bronze, 0, 0, 0, -0.4);
    b.box(0.16, 0.6, 0.16, -0.38, 2.75, 0, bronze);
    b.ball(0.25, 0, 3.45, 0, bronze);
    b.cone(0.1, 0.3, 0.6, 3.9, 0, 0xffd24a);
    return b.done(4.2);
  },
  kiosk() {
    const b = new B();
    b.box(2.5, 2.2, 1.9, 0, 1.1, 0, 0xffffff, 1);
    b.box(2.0, 0.9, 0.05, 0, 1.4, 0.96, 0xbfe6ff);
    b.box(2.6, 0.15, 0.6, 0, 1.0, 1.15, 0xc8864a);
    for (let k = 0; k < 6; k++) b.box(0.43, 0.08, 0.6, -1.08 + k * 0.43, 2.35, 1.1, k % 2 ? 0xffffff : 0xe84a3a, 0, -0.3, 0, 0);
    b.box(2.7, 0.3, 2.1, 0, 2.6, 0, 0xffffff, 1);
    b.box(1.4, 0.4, 0.08, 0, 2.6, 1.06, 0xffd24a);
    for (let k = 0; k < 5; k++) b.ball(0.08, -0.6 + k * 0.3, 1.18, 1.2, [0xff6a3a, 0xffd24a, 0x7ad478, 0xff8ac0, 0x6ac0f0][k]);
    return b.done(2.8);
  },
  crate() {
    const b = new B();
    b.box(1.2, 1.2, 1.2, 0, 0.6, 0, 0xc8964a);
    for (const s of [-1, 1]) {
      b.box(1.22, 0.12, 0.12, 0, 0.6 + s * 0.5, 0.56, 0x9a6a3a);
      b.box(1.22, 0.12, 0.12, 0, 0.6 + s * 0.5, -0.56, 0x9a6a3a);
      b.box(0.12, 1.22, 0.12, s * 0.55, 0.6, 0.56, 0x9a6a3a);
      b.box(0.12, 1.22, 0.12, s * 0.55, 0.6, -0.56, 0x9a6a3a);
    }
    b.box(1.22, 0.12, 0.12, 0, 0.6, 0.57, 0x9a6a3a, 0, 0, 0, 0.78);
    return b.done(1.2);
  },
  pallet() {
    const b = new B();
    b.box(1.4, 0.15, 1.2, 0, 0.08, 0, 0xc8964a);
    b.box(1.2, 0.8, 1.0, 0, 0.55, 0, 0xffffff, 0);
    b.box(1.22, 0.82, 1.02, 0, 0.55, 0, 0xd8e8f0);
    b.box(1.24, 0.1, 1.04, 0, 0.75, 0, 0xc8a050);
    return b.done(1.0);
  },
  forklift() {
    const b = new B();
    wheels(b, [-0.55, 0.55], [-0.8, 0.6], 0.3, 0.22);
    b.box(1.2, 0.8, 1.9, 0, 0.75, -0.1, 0xffc22a);
    b.box(1.1, 0.5, 0.6, 0, 1.4, -0.8, 0xffc22a);
    for (const x of [-0.5, 0.5]) {
      b.box(0.06, 1.2, 0.06, x, 1.75, 0.0, 0x2a2a30);
      b.box(0.08, 2.2, 0.08, x, 1.1, 1.0, 0x3a3a40);
      b.box(0.12, 0.06, 0.9, x * 0.6, 0.2, 1.5, 0x3a3a40);
    }
    b.box(1.1, 0.06, 1.2, 0, 2.35, -0.3, 0x2a2a30);
    b.box(0.5, 0.3, 0.5, 0, 1.3, -0.2, 0x2a2a30);
    return b.done(2.2);
  },
  bollard() {
    const b = new B();
    b.cyl(0.2, 0.24, 0.6, 0, 0.3, 0, 0x3a4250, 0, 10);
    b.ball(0.22, 0, 0.6, 0, 0x3a4250);
    b.cyl(0.25, 0.25, 0.08, 0, 0.45, 0, 0xffd24a, 0, 10);
    return b.done(0.7);
  },
  buoy() {
    const b = new B();
    b.cyl(0.45, 0.35, 0.8, 0, 0.4, 0, 0xff6a2a, 0, 12);
    b.cyl(0.46, 0.46, 0.2, 0, 0.45, 0, 0xffffff, 0, 12);
    b.cone(0.25, 0.5, 0, 1.05, 0, 0xff6a2a, 0, 8);
    b.ball(0.08, 0, 1.33, 0, 0xffe070);
    return b.done(1.4);
  },
  hay() {
    const b = new B();
    b.cyl(0.7, 0.7, 1.2, 0, 0.6, 0, 0xe8c860, 0, 14, Math.PI / 2, 0, 0);
    b.cyl(0.5, 0.5, 1.22, 0, 0.6, 0, 0xd8b048, 0, 12, Math.PI / 2, 0, 0);
    b.torus(0.7, 0.04, 0, 0.6, 0.3, 0xa8803a, 0, 0, 0, 0);
    b.torus(0.7, 0.04, 0, 0.6, -0.3, 0xa8803a, 0, 0, 0, 0);
    return b.done(1.2);
  },
  cart() {
    const b = new B();
    for (const x of [-0.75, 0.75]) {
      b.cyl(0.5, 0.5, 0.1, x, 0.5, -0.3, 0x8a5a3a, 0, 12, 0, 0, Math.PI / 2);
      b.cyl(0.12, 0.12, 0.14, x, 0.5, -0.3, 0x5a3a26, 0, 8, 0, 0, Math.PI / 2);
    }
    b.box(1.4, 0.12, 2.0, 0, 0.75, 0, 0xc8964a);
    for (const x of [-0.68, 0.68]) b.box(0.06, 0.5, 2.0, x, 1.0, 0, 0xa87a3a);
    b.box(1.4, 0.5, 0.06, 0, 1.0, -0.98, 0xa87a3a);
    b.box(0.08, 0.08, 1.2, -0.4, 0.75, 1.5, 0x8a5a3a);
    b.box(0.08, 0.08, 1.2, 0.4, 0.75, 1.5, 0x8a5a3a);
    b.ball(0.5, 0, 1.15, -0.1, 0xe8c860, 0, 1.3, 0.6, 1.6);
    for (let k = 0; k < 4; k++) b.ball(0.13, -0.4 + k * 0.27, 1.25, 0.4, [0xe84a3a, 0x7ad478, 0xffa03a][k % 3]);
    return b.done(1.5);
  },
  well() {
    const b = new B();
    b.cyl(0.95, 1.0, 0.9, 0, 0.45, 0, 0xb8b0a0, 0, 14);
    b.cyl(0.75, 0.75, 0.92, 0, 0.47, 0, 0x2a4a6a, 0, 14);
    for (const x of [-0.8, 0.8]) b.box(0.12, 1.6, 0.12, x, 1.6, 0, 0x7a4a2a);
    b.cyl(0.08, 0.08, 1.7, 0, 2.1, 0, 0x7a4a2a, 0, 6, 0, 0, Math.PI / 2);
    b.box(2.0, 0.08, 1.3, 0, 2.55, -0.3, 0x9a5a3a, 0, -0.5, 0, 0);
    b.box(2.0, 0.08, 1.3, 0, 2.55, 0.3, 0x9a5a3a, 0, 0.5, 0, 0);
    b.cyl(0.18, 0.15, 0.3, 0, 1.4, 0, 0x8a6a3a, 0, 8);
    return b.done(2.8);
  },
  stall() {
    const b = new B();
    for (const x of [-1.4, 1.4]) for (const z of [-0.8, 0.8]) b.box(0.08, 2.4, 0.08, x, 1.2, z, 0x7a4a2a);
    b.box(2.9, 0.9, 1.7, 0, 0.45, 0, 0xc8964a);
    for (let k = 0; k < 6; k++) b.box(0.48, 0.08, 1.9, -1.2 + k * 0.48, 2.45, 0, k % 2 ? 0xffffff : 0xffffff, k % 2 ? 0 : 1, 0.15, 0, 0);
    const fruit = [0xe84a3a, 0xffd24a, 0x7ad478, 0xff8a3a, 0xa86ae0];
    for (let k = 0; k < 10; k++) b.ball(0.12, -1.2 + (k % 5) * 0.6, 0.98, -0.3 + Math.floor(k / 5) * 0.6, fruit[k % 5]);
    return b.done(2.6);
  },
  torch() {
    const b = new B();
    b.cyl(0.06, 0.08, 2.0, 0, 1.0, 0, 0x5a3a26, 0, 6);
    b.cyl(0.14, 0.08, 0.25, 0, 2.1, 0, 0x3a3a3a, 0, 8);
    b.cone(0.12, 0.35, 0, 2.38, 0, 0xffa82a, 0, 7);
    b.cone(0.07, 0.22, 0, 2.38, 0, 0xfff0a0, 0, 7);
    return b.done(2.4);
  },
  bike() {
    const b = new B();
    for (const z of [-0.55, 0.55]) {
      b.torus(0.33, 0.04, 0, 0.36, z, 0x2a2a30, 0, 0, Math.PI / 2, 0);
      b.box(0.02, 0.6, 0.02, 0, 0.36, z, 0xc8ccd4);
    }
    b.box(0.05, 0.05, 1.0, 0, 0.6, 0, 0xffffff, 1, 0.3, 0, 0);
    b.box(0.05, 0.5, 0.05, 0, 0.6, -0.2, 0xffffff, 1);
    b.box(0.1, 0.05, 0.25, 0, 0.88, -0.2, 0x2a2a30);
    b.box(0.5, 0.04, 0.04, 0, 0.92, 0.45, 0x2a2a30);
    return b.done(1.0);
  },
  fence() {
    const b = new B();
    for (let k = 0; k < 5; k++) {
      b.box(0.12, 0.9, 0.06, -0.8 + k * 0.4, 0.45, 0, 0xffffff);
      b.cone(0.085, 0.14, -0.8 + k * 0.4, 0.97, 0, 0xffffff, 0, 4, 0, Math.PI / 4, 0);
    }
    b.box(2.0, 0.08, 0.05, 0, 0.3, -0.04, 0xf0f0f0);
    b.box(2.0, 0.08, 0.05, 0, 0.7, -0.04, 0xf0f0f0);
    return b.done(1.0);
  },
  hedge() {
    const b = new B();
    b.box(2.0, 1.0, 0.8, 0, 0.5, 0, 0x4a9a4a);
    for (let k = 0; k < 4; k++) b.ball(0.32, -0.75 + k * 0.5, 0.95, 0, 0x5cb85c, 0, 1, 0.6, 1.2);
    return b.done(1.1);
  },
  sign() {
    const b = new B();
    b.box(0.08, 1.6, 0.08, -0.3, 0.8, 0, 0x5a6470);
    b.box(0.08, 1.6, 0.08, 0.3, 0.8, 0, 0x5a6470);
    b.box(0.9, 1.0, 0.12, 0, 2.1, 0, 0xffffff, 1);
    b.box(0.75, 0.15, 0.13, 0, 2.3, 0, 0xffffff);
    b.box(0.6, 0.12, 0.13, 0, 2.0, 0, 0xffffff);
    return b.done(2.6);
  },
  ac() {
    const b = new B();
    b.box(1.2, 0.85, 0.9, 0, 0.42, 0, 0xd8dce4);
    b.cyl(0.32, 0.32, 0.05, 0, 0.86, 0, 0x5a6470, 0, 14);
    for (let k = 0; k < 3; k++) b.box(0.62, 0.02, 0.06, 0, 0.88, 0, 0x8a96a4, 0, (k * Math.PI) / 3, 0);
    for (let k = 0; k < 6; k++) b.box(1.0, 0.04, 0.02, 0, 0.15 + k * 0.1, 0.46, 0x8a96a4);
    return b.done(0.9);
  },
  tank() {
    const b = new B();
    for (const x of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) b.box(0.1, 0.8, 0.1, x, 0.4, z, 0x5a6470);
    b.cyl(0.8, 0.8, 1.2, 0, 1.4, 0, 0x8ab4d0, 0, 14);
    b.cone(0.82, 0.3, 0, 2.15, 0, 0x6a8aa0, 0, 14);
    return b.done(2.2);
  },
  antenna() {
    const b = new B();
    b.box(0.5, 0.1, 0.5, 0, 0.05, 0, 0x5a6470);
    b.cyl(0.04, 0.05, 2.5, 0, 1.3, 0, 0x8a96a4, 0, 6);
    for (let k = 0; k < 3; k++) b.box(0.6 - k * 0.15, 0.03, 0.03, 0, 1.5 + k * 0.4, 0, 0x8a96a4);
    b.ball(0.08, 0, 2.55, 0, 0xff4a3a);
    return b.done(2.6);
  },
  billboard() {
    const b = new B();
    for (const x of [-1.6, 1.6]) b.box(0.2, 2.0, 0.2, x, 1.0, 0, 0x5a6470);
    b.box(5.0, 2.6, 0.2, 0, 3.3, 0, 0xffffff);
    b.box(4.7, 2.3, 0.22, 0, 3.3, 0, 0xffd24a);
    b.ball(0.8, -1.2, 3.3, 0.12, 0xff6a3a, 0, 1, 1, 0.1);
    b.box(2.2, 0.35, 0.24, 0.9, 3.7, 0, 0x2a2a30);
    b.box(1.8, 0.25, 0.24, 0.7, 3.0, 0, 0x3a6ac8);
    return b.done(4.6);
  },
  flowers() {
    const b = new B();
    b.box(1.8, 0.4, 0.9, 0, 0.2, 0, 0xc8b8a4);
    b.box(1.7, 0.1, 0.8, 0, 0.4, 0, 0x6a4a2a);
    const cols = [0xff6a8a, 0xffd24a, 0xff8a3a, 0xc86ae0, 0xffffff];
    for (let k = 0; k < 12; k++) {
      const x = -0.7 + (k % 6) * 0.28, z = -0.2 + Math.floor(k / 6) * 0.4;
      b.box(0.03, 0.15, 0.03, x, 0.5, z, 0x4caf50);
      b.ball(0.08, x, 0.58, z, cols[k % 5]);
    }
    return b.done(0.6);
  },
  table() {
    const b = new B();
    b.cyl(0.6, 0.6, 0.06, 0, 0.75, 0, 0xffffff, 0, 12);
    b.cyl(0.05, 0.05, 0.75, 0, 0.37, 0, 0x5a6470, 0, 6);
    for (let k = 0; k < 2; k++) {
      const x = k ? 0.6 : -0.6;
      b.box(0.4, 0.05, 0.4, x, 0.45, 0, 0xe84a3a);
      b.box(0.4, 0.4, 0.05, x * 1.3, 0.65, 0, 0xe84a3a);
    }
    return b.done(0.9);
  },
  dumpster() {
    const b = new B();
    b.box(2.0, 1.2, 1.2, 0, 0.7, 0, 0x3a7a4a);
    b.box(2.04, 0.1, 1.24, 0, 1.33, 0, 0x2a5a3a, 0, 0.1, 0, 0);
    for (const x of [-0.8, 0.8]) b.cyl(0.1, 0.1, 0.1, x, 0.1, 0.5, 0x2a2a30, 0, 8, 0, 0, Math.PI / 2);
    b.box(0.5, 0.3, 0.02, 0, 0.8, 0.61, 0xffffff);
    return b.done(1.4);
  },
  phone() {
    const b = new B();
    b.box(1.0, 2.3, 1.0, 0, 1.15, 0, 0xe84a3a);
    b.box(0.8, 1.5, 0.04, 0, 1.1, 0.5, 0xbfe6ff);
    for (let k = 0; k < 4; k++) b.box(0.8, 0.04, 0.05, 0, 0.55 + k * 0.38, 0.51, 0xe84a3a);
    b.box(0.7, 0.2, 0.04, 0, 2.05, 0.51, 0xffffff);
    b.box(1.05, 0.1, 1.05, 0, 2.35, 0, 0xc83a2a);
    return b.done(2.4);
  },
  anchor() {
    const b = new B();
    b.box(0.2, 1.5, 0.2, 0, 1.0, 0, 0x3a4250);
    b.torus(0.25, 0.06, 0, 1.85, 0, 0x3a4250);
    b.box(1.0, 0.15, 0.15, 0, 1.45, 0, 0x3a4250);
    b.torus(0.6, 0.1, 0, 0.6, 0, 0x3a4250, 0, 0, Math.PI, 12);
    b.cone(0.15, 0.3, -0.62, 0.65, 0, 0x3a4250, 0, 4);
    b.cone(0.15, 0.3, 0.62, 0.65, 0, 0x3a4250, 0, 4);
    return b.done(2.0);
  },
  // ---------- курорт ----------
  sunbed() {
    const b = new B();
    for (const x of [-0.3, 0.3]) for (const z of [-0.8, 0.6]) b.box(0.05, 0.3, 0.05, x, 0.15, z, 0xd8d8d8);
    b.box(0.7, 0.06, 1.5, 0, 0.32, -0.1, 0xffffff, 1);
    b.box(0.7, 0.06, 0.6, 0, 0.55, 0.85, 0xffffff, 1, -0.75, 0, 0);
    for (let k = 0; k < 4; k++) b.box(0.72, 0.065, 0.12, 0, 0.33, -0.7 + k * 0.4, 0xffffff);
    b.box(0.5, 0.1, 0.3, 0, 0.7, 1.0, 0xfff6e0, 0, -0.75, 0, 0);
    return b.done(0.9);
  },
  lifeguard() {
    const b = new B();
    for (const x of [-0.8, 0.8]) for (const z of [-0.8, 0.8]) b.box(0.14, 2.4, 0.14, x * 0.85, 1.2, z * 0.85, 0xffffff, 0, z * 0.08, 0, -x * 0.08);
    b.box(1.9, 0.12, 1.9, 0, 2.45, 0, 0xc8864a);
    b.box(1.8, 1.1, 1.8, 0, 3.05, 0, 0xffffff, 1);
    b.box(1.82, 0.5, 1.4, 0, 3.15, 0, GLASS);
    b.box(2.2, 0.14, 2.2, 0, 3.67, 0, 0xe84a3a, 0, 0.12, 0, 0);
    b.box(0.6, 0.12, 1.4, 0, 1.2, 1.3, 0xc8864a, 0, -0.8, 0, 0);
    b.box(0.06, 1.0, 0.06, 0.95, 4.2, 0.95, 0x9aa4b0);
    b.box(0.6, 0.35, 0.03, 1.25, 4.5, 0.95, 0xe84a3a);
    b.torus(0.25, 0.08, 0, 2.9, 0.92, 0xff6a3a);
    return b.done(4.6);
  },
  surfboard() {
    const b = new B();
    b.ball(0.32, 0, 1.0, 0, 0xffffff, 1, 1, 3.1, 0.18, 12);
    b.ball(0.08, 0, 1.0, 0.04, 0xffd24a, 0, 1, 10, 0.7);
    b.box(0.6, 0.12, 0.4, 0, 0.06, 0, 0xe8d4a0);
    return b.done(2.0);
  },
  beachball() {
    const b = new B();
    const cols = [0xe84a3a, 0xffffff, 0x3a8ae8, 0xffd24a, 0xffffff, 0x5cc06a];
    for (let k = 0; k < 6; k++) b._add(new THREE.SphereGeometry(0.4, 12, 8, (k * Math.PI) / 3, Math.PI / 3), cols[k], 0, 0, 0.4, 0);
    b.ball(0.08, 0, 0.8, 0, 0xffffff);
    return b.done(0.8);
  },
  sandcastle() {
    const b = new B();
    const S = 0xe8c47a;
    b.box(1.4, 0.5, 1.4, 0, 0.25, 0, S);
    for (const x of [-0.6, 0.6]) for (const z of [-0.6, 0.6]) {
      b.cyl(0.24, 0.28, 0.9, x, 0.45, z, S, 0, 8);
      b.cone(0.26, 0.3, x, 1.05, z, 0xf2d290, 0, 8);
    }
    b.cyl(0.35, 0.4, 1.1, 0, 0.8, 0, S, 0, 10);
    b.box(0.03, 0.4, 0.03, 0, 1.55, 0, 0x8a5a3a);
    b.box(0.25, 0.15, 0.02, 0.13, 1.68, 0, 0xe84a3a);
    b.box(0.3, 0.35, 0.05, 0, 0.4, 0.7, 0x8a6a3a);
    return b.done(1.8);
  },
  crab() {
    const b = new B();
    const C = 0xf05a3a;
    b.ball(0.26, 0, 0.18, 0, C, 0, 1.2, 0.5, 0.9);
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) b.box(0.32, 0.04, 0.04, s * 0.32, 0.1, -0.12 + k * 0.12, C, 0, 0, 0, s * 0.5);
      b.box(0.04, 0.16, 0.04, s * 0.32, 0.25, 0.2, C, 0, 0.5, 0, 0);
      b.ball(0.1, s * 0.34, 0.32, 0.3, C, 0, 1, 0.7, 1.2);
      b.box(0.02, 0.12, 0.02, s * 0.08, 0.32, 0.18, 0x3a2a2a);
      b.ball(0.04, s * 0.08, 0.4, 0.18, 0xffffff);
      b.ball(0.022, s * 0.08, 0.41, 0.21, 0x1a1a1a);
    }
    return b.done(0.45);
  },
  icecart() {
    const b = new B();
    wheels(b, [-0.75], [0], 0.32, 0.12);
    wheels(b, [0.75], [0], 0.32, 0.12);
    b.box(1.5, 0.9, 1.0, 0, 0.85, 0, 0xffffff, 1);
    b.box(1.52, 0.2, 1.02, 0, 0.45, 0, 0x8ad0f0);
    b.box(1.0, 0.3, 0.02, 0, 0.9, 0.51, 0xff8ac0);
    for (const x of [-0.65, 0.65]) b.cyl(0.03, 0.03, 1.3, x, 1.95, 0, 0xd8d8d8, 0, 6);
    for (let k = 0; k < 8; k++) b._add(new THREE.ConeGeometry(1.0, 0.5, 2, 1, false, (k * Math.PI) / 4, Math.PI / 4), k % 2 ? 0xffffff : 0xff8ac0, 0, 0, 2.7, 0);
    b.cone(0.18, 0.4, 0, 1.55, 0.2, 0xe8b860, 0, 8, Math.PI, 0, 0);
    b.ball(0.2, 0, 1.8, 0.2, 0xffd0e0);
    b.ball(0.16, 0, 2.0, 0.2, 0x8a5a3a);
    return b.done(2.95);
  },
  parasol() {
    const b = new B();
    b.cyl(0.04, 0.04, 2.4, 0, 1.2, 0, 0xf0f0f0, 0, 6);
    for (let k = 0; k < 8; k++) b._add(new THREE.ConeGeometry(1.15, 0.5, 2, 1, false, (k * Math.PI) / 4, Math.PI / 4), 0xffffff, k % 2, 0, 2.3, 0);
    b.ball(0.06, 0, 2.58, 0, 0xffffff);
    b.cyl(0.2, 0.25, 0.08, 0, 0.04, 0, 0xd8c8a0, 0, 8);
    return b.done(2.6);
  },
  // ---------- зима ----------
  snowman() {
    const b = new B();
    b.ball(0.6, 0, 0.55, 0, 0xffffff, 0, 1, 0.9, 1);
    b.ball(0.44, 0, 1.3, 0, 0xffffff);
    b.ball(0.32, 0, 1.92, 0, 0xffffff);
    b.cone(0.06, 0.32, 0, 1.92, 0.42, 0xff8a2a, 0, 8, Math.PI / 2, 0, 0);
    for (const x of [-0.11, 0.11]) b.ball(0.045, x, 2.02, 0.28, 0x1a1a1a);
    for (let k = 0; k < 3; k++) b.ball(0.05, 0, 1.1 + k * 0.17, 0.42, 0x1a1a1a);
    b.torus(0.3, 0.08, 0, 1.66, 0, 0xffffff, 1, Math.PI / 2, 0, 0);
    b.box(0.16, 0.4, 0.06, 0.2, 1.45, 0.32, 0xffffff, 1);
    b.cyl(0.24, 0.24, 0.05, 0, 2.2, 0, 0x2a2a30, 0, 12);
    b.cyl(0.17, 0.17, 0.32, 0, 2.38, 0, 0x2a2a30, 0, 12);
    for (const s of [-1, 1]) b.box(0.05, 0.05, 0.75, s * 0.62, 1.4, 0, 0x6a4a2a, 0, 0, s * 1.2, s * 0.5);
    return b.done(2.6);
  },
  xtree() {
    const b = new B();
    b.cyl(0.2, 0.25, 0.8, 0, 0.4, 0, 0x7a4a2a, 0, 8);
    b.cone(2.0, 2.6, 0, 2.0, 0, 0x2e8a5a, 0, 10);
    b.cone(1.6, 2.4, 0, 3.4, 0, 0x37a066, 0, 10);
    b.cone(1.1, 2.0, 0, 4.7, 0, 0x45b072, 0, 10);
    b.cone(0.65, 1.5, 0, 5.8, 0, 0x55c080, 0, 10);
    const cols = [0xe84a3a, 0xffd24a, 0x3a8ae8, 0xff8ac0, 0xffffff];
    for (let k = 0; k < 26; k++) {
      const y = 1.2 + (k / 26) * 4.8, r = 1.85 * (1 - (y - 1) / 5.6) + 0.1;
      const a = k * 2.4;
      b.ball(0.13, Math.cos(a) * r, y, Math.sin(a) * r, cols[k % 5]);
    }
    for (let k = 0; k < 5; k++) b.box(0.18, 0.5, 0.06, 0, 6.8, 0, 0xffd24a, 0, 0, (k * Math.PI) / 5, 0);
    b.ball(0.16, 0, 6.8, 0, 0xffe070);
    for (let k = 0; k < 5; k++) b.box(0.6, 0.45, 0.6, Math.cos(k * 1.26) * 1.6, 0.22, Math.sin(k * 1.26) * 1.6, cols[(k + 2) % 5]);
    return b.done(7.2);
  },
  snowpine() {
    const b = new B();
    b.cyl(0.12, 0.18, 1.2, 0, 0.6, 0, 0x7a4a2a, 0, 8);
    const lv = [[1.05, 1.8, 1.8], [0.85, 1.6, 2.8], [0.62, 1.4, 3.75], [0.38, 1.0, 4.6]];
    for (const [r, h, y] of lv) {
      b.cone(r, h, 0, y, 0, 0x2e7a5a, 0, 9);
      b.cone(r * 0.75, h * 0.45, 0, y + h * 0.28, 0, 0xffffff, 0, 9);
    }
    return b.done(5.2);
  },
  sled() {
    const b = new B();
    for (const x of [-0.3, 0.3]) {
      b.box(0.05, 0.05, 1.5, x, 0.04, 0, 0x9aa4b0);
      b.box(0.05, 0.25, 0.05, x, 0.18, 0.75, 0x9aa4b0, 0, 0.6, 0, 0);
      for (const z of [-0.5, 0.4]) b.box(0.05, 0.25, 0.05, x, 0.17, z, 0x9aa4b0);
    }
    b.box(0.75, 0.06, 1.3, 0, 0.32, 0, 0xffffff, 1);
    for (let k = 0; k < 5; k++) b.box(0.76, 0.065, 0.06, 0, 0.32, -0.55 + k * 0.27, 0x8a5a3a);
    return b.done(0.5);
  },
  penguin() {
    const b = new B();
    b.ball(0.26, 0, 0.42, 0, 0x2a2a3a, 0, 1, 1.5, 0.9);
    b.ball(0.2, 0, 0.4, 0.07, 0xffffff, 0, 1, 1.45, 0.9);
    b.ball(0.17, 0, 0.88, 0, 0x2a2a3a);
    b.cone(0.06, 0.16, 0, 0.86, 0.2, 0xffa02a, 0, 6, Math.PI / 2, 0, 0);
    for (const x of [-0.07, 0.07]) {
      b.ball(0.035, x, 0.94, 0.14, 0xffffff);
      b.ball(0.02, x, 0.94, 0.16, 0x1a1a1a);
      b.box(0.12, 0.04, 0.18, x * 1.6, 0.02, 0.06, 0xffa02a);
    }
    for (const s of [-1, 1]) b.box(0.05, 0.4, 0.16, s * 0.27, 0.45, 0, 0x2a2a3a, 0, 0, 0, s * 0.25);
    b.torus(0.15, 0.04, 0, 0.74, 0, 0xffffff, 1, Math.PI / 2, 0, 0);
    return b.done(1.05);
  },
  gift() {
    const b = new B();
    b.box(0.9, 0.8, 0.9, 0, 0.4, 0, 0xffffff, 1);
    b.box(0.92, 0.82, 0.16, 0, 0.4, 0, 0xffd24a);
    b.box(0.16, 0.82, 0.92, 0, 0.4, 0, 0xffd24a);
    b.torus(0.14, 0.05, -0.1, 0.9, 0, 0xffd24a, 0, 0, 0, 0.5);
    b.torus(0.14, 0.05, 0.1, 0.9, 0, 0xffd24a, 0, 0, 0, -0.5);
    return b.done(1.0);
  },
  // ---------- парк аттракционов ----------
  horse() {
    const b = new B();
    b.cyl(0.04, 0.04, 2.6, 0, 1.3, 0, 0xffd24a, 0, 6);
    b.box(0.32, 0.36, 0.9, 0, 0.95, 0, 0xffffff, 1);
    b.box(0.26, 0.5, 0.26, 0, 1.25, 0.45, 0xffffff, 1, 0.4, 0, 0);
    b.box(0.22, 0.22, 0.4, 0, 1.45, 0.62, 0xffffff, 1);
    for (const x of [-0.1, 0.1]) for (const z of [-0.35, 0.35]) b.box(0.07, 0.4, 0.07, x, 0.6, z, 0xffffff, 1, z > 0 ? -0.4 : 0.4, 0, 0);
    b.box(0.34, 0.06, 0.35, 0, 1.15, -0.05, 0xe84a3a);
    b.box(0.06, 0.32, 0.4, 0, 1.45, 0.38, 0xffd24a);
    b.box(0.05, 0.3, 0.06, 0, 0.95, -0.5, 0xffd24a, 0, 0.6, 0, 0);
    return b.done(2.6);
  },
  bumper() {
    const b = new B();
    b.box(1.4, 0.35, 2.0, 0, 0.3, 0, 0xffffff, 1);
    b.cyl(0.8, 0.8, 0.22, 0, 0.18, 0, 0x2a2a30, 0, 14);
    b.box(1.0, 0.45, 0.7, 0, 0.6, -0.3, 0xffffff, 1);
    b.box(0.9, 0.12, 0.6, 0, 0.53, 0.15, 0x3a3a44);
    b.cyl(0.03, 0.03, 1.6, 0, 1.3, -0.65, 0x9aa4b0, 0, 6);
    b.ball(0.07, 0, 2.1, -0.65, 0xffd24a);
    b.cyl(0.18, 0.18, 0.04, 0, 0.85, 0.35, 0x2a2a30, 0, 10, 0.5, 0, 0);
    return b.done(2.15);
  },
  popcorn() {
    const b = new B();
    wheels(b, [-0.6, 0.6], [0.35], 0.25, 0.1);
    b.box(1.2, 0.8, 0.8, 0, 0.7, 0, 0xe84a3a);
    b.box(1.0, 0.9, 0.7, 0, 1.55, 0, 0xbfe6ff);
    b.box(0.95, 0.4, 0.65, 0, 1.3, 0, 0xfff2b0);
    for (let k = 0; k < 10; k++) b.ball(0.07, -0.35 + (k % 5) * 0.17, 1.55 + Math.floor(k / 5) * 0.08, -0.1 + (k % 2) * 0.2, 0xfff8e0);
    b.box(1.25, 0.14, 0.85, 0, 2.06, 0, 0xffd24a);
    b.box(1.0, 0.3, 0.04, 0, 2.3, 0, 0xe84a3a);
    b.box(0.8, 0.12, 0.05, 0, 2.3, 0.01, 0xffffff);
    return b.done(2.5);
  },
  balloons() {
    const b = new B();
    b.box(0.5, 0.5, 0.5, 0, 0.25, 0, 0xffffff, 1);
    const cols = [0xe84a3a, 0xffd24a, 0x3a8ae8, 0x5cc06a, 0xff8ac0, 0x9a6ae0, 0xff8a3a];
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9, r = k ? 0.42 : 0;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = 2.2 + (k % 3) * 0.25;
      b.box(0.015, y - 0.5, 0.015, x / 2, (y + 0.5) / 2, z / 2, 0xffffff, 0, z * 0.25, 0, -x * 0.25);
      b.ball(0.26, x, y, z, cols[k], 0, 1, 1.2, 1);
    }
    return b.done(2.9);
  },
  candy() {
    const b = new B();
    b.cyl(0.05, 0.05, 1.6, 0, 0.8, 0, 0xffffff, 0, 6);
    b.torus(0.32, 0.12, 0, 1.9, 0, 0xffffff, 1, 0, 0, 0, 14);
    b.torus(0.16, 0.12, 0, 1.9, 0, 0xffffff, 0, 0, 0, 0, 12);
    b.cyl(0.12, 0.12, 0.24, 0, 1.9, 0, 0xffffff, 1, 10, Math.PI / 2, 0, 0);
    b.box(0.5, 0.12, 0.5, 0, 0.06, 0, 0x9aa4b0);
    return b.done(2.4);
  },
  gondola() {
    const b = new B();
    b.box(0.06, 0.5, 0.06, 0, 1.35, 0, 0x5a6470);
    b.box(1.3, 0.1, 0.1, 0, 1.58, 0, 0x5a6470);
    b.box(1.3, 0.55, 1.3, 0, 0.3, 0, 0xffffff, 1);
    b.box(1.32, 0.45, 1.0, 0, 0.82, 0, GLASS);
    for (const x of [-0.6, 0.6]) b.box(0.08, 0.5, 1.3, x, 0.82, 0, 0xffffff, 1);
    b.box(1.4, 0.18, 1.4, 0, 1.12, 0, 0xffffff, 1);
    return b.done(1.6);
  },
  // ---------- сакура ----------
  sakura() {
    const b = new B();
    b.cyl(0.14, 0.22, 1.8, 0, 0.9, 0, 0x5a3a3a, 0, 8);
    b.box(0.1, 1.0, 0.1, 0.35, 2.0, 0, 0x5a3a3a, 0, 0, 0, -0.6);
    b.box(0.1, 1.0, 0.1, -0.3, 2.0, 0.1, 0x5a3a3a, 0, 0, 0, 0.6);
    const P = [0xffc8dc, 0xffb0cc, 0xffd8e6, 0xff9ec0];
    b.ball(1.1, 0, 3.0, 0, P[0], 0, 1.25, 0.75, 1.25);
    b.ball(0.75, 0.85, 2.85, 0.3, P[1], 0, 1, 0.75, 1);
    b.ball(0.75, -0.85, 2.9, -0.2, P[2], 0, 1, 0.75, 1);
    b.ball(0.65, 0.1, 3.55, -0.5, P[3], 0, 1, 0.75, 1);
    b.ball(0.6, -0.2, 3.5, 0.6, P[1], 0, 1, 0.75, 1);
    for (let k = 0; k < 8; k++) b.ball(0.08, Math.cos(k * 0.8) * 1.4, 2.4 + (k % 3) * 0.35, Math.sin(k * 0.8) * 1.3, 0xffffff);
    return b.done(4.2);
  },
  slantern() {
    const b = new B();
    const S = 0xb8b0a4;
    b.box(0.7, 0.2, 0.7, 0, 0.1, 0, S);
    b.cyl(0.14, 0.18, 0.7, 0, 0.55, 0, S, 0, 8);
    b.box(0.55, 0.12, 0.55, 0, 0.95, 0, S);
    b.box(0.45, 0.4, 0.45, 0, 1.21, 0, S);
    b.box(0.3, 0.25, 0.46, 0, 1.23, 0, 0xffe9a0);
    b.box(0.46, 0.25, 0.3, 0, 1.23, 0, 0xffe9a0);
    b.cone(0.55, 0.35, 0, 1.58, 0, S, 0, 4, 0, Math.PI / 4, 0);
    b.ball(0.08, 0, 1.8, 0, S);
    return b.done(1.9);
  },
  plantern() {
    const b = new B();
    b.box(0.08, 2.4, 0.08, 0, 1.2, 0, 0x3a2a2a);
    b.box(0.6, 0.08, 0.08, 0.26, 2.35, 0, 0x3a2a2a);
    b.box(0.02, 0.2, 0.02, 0.5, 2.22, 0, 0x2a2a2a);
    b.ball(0.24, 0.5, 1.88, 0, 0xffffff, 1, 1, 1.35, 1);
    b.cyl(0.12, 0.12, 0.06, 0.5, 2.18, 0, 0x2a2a2a, 0, 8);
    b.cyl(0.12, 0.12, 0.06, 0.5, 1.56, 0, 0x2a2a2a, 0, 8);
    b.box(0.3, 0.06, 0.3, 0, 0.03, 0, 0x5a5a5a);
    return b.done(2.4);
  },
  bamboo() {
    const b = new B();
    for (let k = 0; k < 5; k++) {
      const x = Math.cos(k * 1.3) * 0.3, z = Math.sin(k * 1.3) * 0.3, h = 2.4 + (k % 3) * 0.5;
      for (let s = 0; s < 4; s++) b.cyl(0.06, 0.07, h / 4 - 0.03, x, (h / 4) * (s + 0.5), z, 0x7ab84a, 0, 6);
      for (let s = 1; s < 4; s++) b.cyl(0.075, 0.075, 0.04, x, (h / 4) * s, z, 0x5a9a3a, 0, 6);
      b.box(0.08, 0.02, 0.4, x + 0.15, h - 0.2, z, 0x5cb85c, 0, 0, k, 0.4);
      b.box(0.08, 0.02, 0.4, x - 0.12, h - 0.5, z, 0x5cb85c, 0, 0, k + 2, -0.4);
    }
    return b.done(3.4);
  },
  cat() {
    const b = new B();
    for (const x of [-0.07, 0.07]) for (const z of [-0.18, 0.18]) b.box(0.06, 0.18, 0.06, x, 0.09, z, 0xffffff, 1);
    b.box(0.2, 0.18, 0.46, 0, 0.26, 0, 0xffffff, 1);
    b.box(0.2, 0.18, 0.18, 0, 0.38, 0.27, 0xffffff, 1);
    for (const x of [-0.06, 0.06]) {
      b.cone(0.045, 0.1, x, 0.51, 0.27, 0xffffff, 1, 4);
      b.ball(0.025, x, 0.41, 0.36, 0x6ad040);
    }
    b.ball(0.02, 0, 0.36, 0.37, 0xff8aa0);
    b.box(0.04, 0.04, 0.32, 0, 0.42, -0.3, 0xffffff, 1, 0.9, 0, 0);
    return b.done(0.55);
  },
  koi() {
    const b = new B();
    b.cyl(1.0, 1.0, 0.3, 0, 0.15, 0, 0x9a948a, 0, 14);
    b.cyl(0.88, 0.88, 0.31, 0, 0.16, 0, 0x5ab0d8, 0, 14);
    for (let k = 0; k < 3; k++) b.ball(0.12, Math.cos(k * 2.1) * 0.45, 0.3, Math.sin(k * 2.1) * 0.45, [0xff6a2a, 0xffffff, 0xffa040][k], 0, 0.6, 0.3, 1.4);
    return b.done(0.35);
  },
  container() {
    return null; // контейнер рисуется блоком с текстурой
  },
};

// человечки трёх видов (одежда перекрашивается)
export const PERSON_VARIANTS = 4;

let cache = null;
export function makeModels() {
  if (cache) return cache;
  cache = {};
  for (const k of Object.keys(M)) {
    if (k === 'person') {
      for (let v = 0; v < PERSON_VARIANTS; v++) cache['person' + v] = polishModel('person'+v,M.person(v),1.7);
      continue;
    }
    const g = M[k]();
    if (g) cache[k] = polishModel(k,g,CAR_SIZE[k]?.[1]||PROPS[k]?.size[1]||1.7);
  }
  for(const[id,make]of Object.entries(EXTRA_MODELS))cache[id]=polishModel(id,make(),PROPS[id].size[1]);
  for(const[id,base]of Object.entries({taxi:'car',policecar:'car',ambulance:'van',delivery:'van'}))cache[id]=polishModel(id,vehicleVariant(id,M[base](),CAR_SIZE[base][1],CAR_SIZE[id][1]),CAR_SIZE[id][1]);
  Object.assign(cache,makeThemeModels());
  // Share identical vertices including normals, colour and tint: hard edges and
  // paint boundaries remain intact, while every instance reuses less GPU data.
  for(const[id,raw]of Object.entries(cache)){
    const indexed=mergeVertices(raw,1e-6);
    indexed.userData={...raw.userData,sourceVertices:raw.attributes.position.count};
    indexed.computeBoundingBox();indexed.computeBoundingSphere();cache[id]=indexed;raw.dispose();
  }
  return cache;
}

export { PROPS };
