// Модели из примитивов: продавец, покупатели, персонал, милые зомби, товары, полки, касса, машины, тележки и прочее
import * as THREE from 'three';
import { B, MAT, MAT_GLOW } from './gfx.js';

export const INK = '#2a2430';
const WHITE = '#ffffff';
const BLUSH = '#ff9fa8';

export function shade(hex, k) {
  const c = new THREE.Color(hex);
  if (k < 0) c.lerp(new THREE.Color('#1a1420'), -k);
  else c.lerp(new THREE.Color('#ffffff'), k);
  return '#' + c.getHexString();
}

export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickR = (r, a) => a[(r() * a.length) | 0];

// глаза-бусинки с бликом
function eyes(b, x, y, z, r = 0.05, col = INK) {
  for (const sx of [-1, 1]) {
    b.sph(r, col, { x: sx * x, y, z, sx: 1, sy: 1.15, sz: 0.7 });
    b.sph(r * 0.36, WHITE, { x: sx * x + r * 0.3, y: y + r * 0.42, z: z + r * 0.55 });
  }
}

const SKINS = ['#ffd9c0', '#f6c7a4', '#e8b088', '#c98c66', '#a86f4c', '#ffe2cf'];
const HAIRS = ['#3a2a22', '#6a4430', '#a8683a', '#e8c070', '#c4c0bc', '#2a2a30', '#b84a30'];
const SHIRTS = ['#e8705a', '#5aa8e0', '#7cc06a', '#f2c84a', '#b07ad8', '#ef8fb4', '#5ac0b0', '#e89a4a', '#8a9ab8'];
const PANTS = ['#4a5a7a', '#5a4a3a', '#3a4a3a', '#6a6a72', '#2e3448', '#7a5a4a'];

// ---------- человек ----------
// o: { skin, hair, hairStyle, shirt, jacket, pants, shoe, hat, acc[], apron, role, scale }
export function makePerson(o = {}) {
  const g = new THREE.Group();
  const root = new THREE.Group();
  g.add(root);
  const skin = o.skin || SKINS[0];
  const shirt = o.shirt || '#5aa8e0';
  const pants = o.pants || '#4a5a7a';
  const shoe = o.shoe || '#4a3a30';
  const jacket = o.jacket;
  const acc = o.acc || [];
  // ноги: штанина-капсула, ботинок с подошвой
  const legs = [-1, 1].map((sx) => {
    const b = new B();
    b.caps(0.072, 0.2, pants, { y: -0.15 });
    b.cyl(0.078, 0.078, 0.05, shade(pants, -0.15), { y: -0.27 }, 12); // подвёрнутая штанина
    b.sph(0.08, shoe, { y: -0.32, z: 0.035, sx: 1.05, sy: 0.62, sz: 1.4 });
    b.rbox(0.14, 0.03, 0.24, 0.012, shade(shoe, -0.35), { y: -0.37, z: 0.035 });
    const m = b.mesh();
    m.position.set(sx * 0.1, 0.39, 0);
    root.add(m);
    return m;
  });
  // туловище
  const body = new B();
  const top = jacket || shirt;
  body.rbox(0.42, 0.42, 0.29, 0.12, top, { y: 0.6 });
  body.cyl(0.19, 0.2, 0.1, pants, { y: 0.4 }, 16);
  body.cyl(0.2, 0.2, 0.04, shade(pants, -0.25), { y: 0.44 }, 16); // пояс
  // шея и воротник
  body.cyl(0.07, 0.08, 0.1, skin, { y: 0.84 }, 12);
  if (jacket) {
    // распахнутая куртка: рубашка видна клином спереди, воротник поверх
    body.frus(0.15, 0.02, 0.07, 0.02, 0.36, shirt, { y: 0.62, z: 0.146 });
    body.box(0.012, 0.36, 0.02, shade(jacket, -0.25), { x: -0.085, y: 0.62, z: 0.15, rz: -0.1 });
    body.box(0.012, 0.36, 0.02, shade(jacket, -0.25), { x: 0.085, y: 0.62, z: 0.15, rz: 0.1 });
    body.torus(0.11, 0.035, shade(jacket, -0.12), { y: 0.81, rx: Math.PI / 2 });
    for (const sx of [-1, 1]) body.rbox(0.09, 0.07, 0.02, 0.008, shade(jacket, -0.18), { x: sx * 0.13, y: 0.5, z: 0.15 });
  } else {
    body.torus(0.085, 0.022, shade(shirt, -0.15), { y: 0.81, rx: Math.PI / 2 });
    body.sph(0.016, shade(shirt, -0.3), { y: 0.7, z: 0.148, sz: 0.4 });
    body.sph(0.016, shade(shirt, -0.3), { y: 0.6, z: 0.148, sz: 0.4 });
  }
  if (o.apron) {
    // фартук: нагрудник, лямки на шее, карман с карандашом
    body.rbox(0.36, 0.38, 0.02, 0.01, o.apron, { y: 0.52, z: 0.155 });
    body.rbox(0.26, 0.14, 0.02, 0.01, o.apron, { y: 0.74, z: 0.152 });
    for (const sx of [-1, 1]) body.box(0.03, 0.12, 0.02, o.apron, { x: sx * 0.11, y: 0.84, z: 0.1, rx: -0.5 });
    body.rbox(0.18, 0.08, 0.02, 0.008, shade(o.apron, -0.18), { y: 0.47, z: 0.168 });
    body.cyl(0.012, 0.012, 0.12, '#f2c84a', { x: 0.06, y: 0.52, z: 0.18, rz: 0.2 }, 6);
    body.box(0.4, 0.03, 0.3, shade(o.apron, -0.1), { y: 0.47 });
  }
  if (o.vest) {
    body.rbox(0.45, 0.36, 0.31, 0.11, o.vest, { y: 0.62 });
    for (const y of [0.55, 0.69]) body.rbox(0.455, 0.035, 0.315, 0.012, '#f4f0e0', { y });
  }
  if (o.belt) {
    body.cyl(0.205, 0.205, 0.06, '#6a4a30', { y: 0.45 }, 16);
    body.rbox(0.07, 0.06, 0.03, 0.01, '#c8a050', { y: 0.45, z: 0.205 });
    body.rbox(0.08, 0.1, 0.06, 0.02, '#8a6a40', { x: 0.17, y: 0.42, z: 0.12 });
  }
  if (o.overalls) {
    body.rbox(0.34, 0.26, 0.02, 0.01, o.overalls, { y: 0.52, z: 0.15 });
    for (const sx of [-1, 1]) {
      body.box(0.05, 0.26, 0.02, o.overalls, { x: sx * 0.12, y: 0.72, z: 0.15 });
      body.sph(0.018, '#e8c070', { x: sx * 0.12, y: 0.62, z: 0.162, sz: 0.5 });
    }
    body.cyl(0.2, 0.205, 0.12, o.overalls, { y: 0.42 }, 16);
  }
  if (acc.includes('backpack')) {
    const bc = o.packCol || '#c46a3a';
    body.rbox(0.34, 0.4, 0.18, 0.07, bc, { y: 0.62, z: -0.22 });
    body.rbox(0.26, 0.15, 0.07, 0.03, shade(bc, -0.15), { y: 0.52, z: -0.33 });
    body.cyl(0.065, 0.065, 0.36, '#7a8a5a', { y: 0.86, z: -0.22, rz: Math.PI / 2 }, 12);
    for (const sx of [-1, 1]) body.box(0.04, 0.34, 0.02, shade(bc, -0.3), { x: sx * 0.12, y: 0.64, z: 0.152 });
  }
  if (acc.includes('bigpack')) {
    body.rbox(0.42, 0.56, 0.24, 0.08, '#6a7a4a', { y: 0.72, z: -0.26 });
    body.cyl(0.085, 0.085, 0.46, '#c4544a', { y: 1.06, z: -0.26, rz: Math.PI / 2 }, 12);
    body.box(0.08, 0.48, 0.03, '#8a6a40', { x: 0.13, y: 0.72, z: -0.39 });
    for (const sx of [-1, 1]) body.box(0.04, 0.34, 0.02, '#5a6a3a', { x: sx * 0.12, y: 0.64, z: 0.152 });
  }
  if (acc.includes('scarf')) {
    const sc = o.scarfCol || '#e85a5a';
    body.torus(0.11, 0.045, sc, { y: 0.83, rx: Math.PI / 2 });
    body.rbox(0.08, 0.2, 0.03, 0.012, sc, { x: 0.07, y: 0.72, z: 0.165, rz: 0.12 });
  }
  if (acc.includes('bag')) {
    body.rbox(0.18, 0.2, 0.1, 0.04, '#b8844a', { x: 0.25, y: 0.42, z: 0.04 });
    body.beam([-0.15, 0.8, 0.13], [0.2, 0.5, 0.1], 0.025, '#8a5a30');
  }
  if (acc.includes('radio')) {
    body.rbox(0.08, 0.13, 0.04, 0.015, '#3a3a40', { x: -0.17, y: 0.72, z: 0.165 });
    body.cyl(0.008, 0.008, 0.1, '#3a3a40', { x: -0.19, y: 0.83, z: 0.165 }, 5);
  }
  root.add(body.mesh());
  // руки-капсулы с ладошками
  const sleeve = jacket || shirt;
  const arms = [-1, 1].map((sx) => {
    const b = new B();
    b.caps(0.068, 0.17, sleeve, { y: -0.12 });
    b.cyl(0.07, 0.07, 0.035, shade(sleeve, -0.15), { y: -0.23 }, 12); // манжета
    b.sph(0.062, o.gloves || skin, { y: -0.28 });
    const m = b.mesh();
    m.position.set(sx * 0.255, 0.77, 0);
    m.rotation.z = sx * 0.12;
    root.add(m);
    return m;
  });
  // голова: всё, что на ней, — концентрично (волосы и шапки не протыкают друг друга)
  const head = new THREE.Group();
  head.position.y = 1.1;
  root.add(head);
  const hb = new B();
  const HY = 0.95; // сплющенность головы
  hb.sph(0.25, skin, { sy: HY }, 24);
  for (const sx of [-1, 1]) hb.sph(0.05, skin, { x: sx * 0.24, y: -0.01, sz: 0.6 });
  eyes(hb, 0.09, -0.01, 0.215, 0.042);
  for (const sx of [-1, 1]) hb.sph(0.04, BLUSH, { x: sx * 0.15, y: -0.08, z: 0.19, sy: 0.6, sz: 0.5 });
  hb.sph(0.028, shade(skin, -0.12), { y: -0.06, z: 0.245, sx: 1.2, sy: 0.9, sz: 0.7 });
  hb.box(0.05, 0.012, 0.01, shade(skin, -0.45), { y: -0.135, z: 0.228 }); // улыбка
  const hair = o.hair || HAIRS[0];
  const hatted = !!o.hat && o.hat !== 'goggles';
  // базовая «стрижка»: шапочка, наклонённая назад, — открывает лоб, закрывает затылок
  const cut = (th, tilt, r = 0.262) => hb.shell(r, th, hair, { sy: HY, rx: -tilt }, 24);
  switch (o.hairStyle) {
    case 'short':
      cut(1.3, 0.5);
      if (!hatted) hb.sph(0.1, hair, { x: -0.09, y: 0.17, z: 0.15, sx: 1.4, sy: 0.55, sz: 0.7 }); // чёлка
      break;
    case 'bun':
      cut(1.35, 0.55);
      if (!hatted) hb.sph(0.1, hair, { y: 0.26, z: -0.1 });
      else hb.sph(0.09, hair, { y: 0.02, z: -0.27 });
      break;
    case 'long':
      cut(1.45, 0.55, 0.265);
      hb.rbox(0.44, 0.36, 0.1, 0.05, hair, { y: -0.14, z: -0.17 });
      for (const sx of [-1, 1]) hb.rbox(0.08, 0.3, 0.1, 0.04, hair, { x: sx * 0.21, y: -0.12, z: -0.06 });
      break;
    case 'curly':
      cut(1.35, 0.5, 0.265);
      if (!hatted) for (let k = 0; k < 9; k++) {
        const a = -1.3 + (k / 8) * 2.6;
        hb.sph(0.075, hair, { x: Math.sin(a) * 0.21, y: 0.16 + Math.cos(a) * 0.04, z: Math.cos(a) * 0.12 + 0.02 });
      }
      for (let k = 0; k < 6; k++) hb.sph(0.07, hair, { x: -0.18 + k * 0.072, y: -0.04, z: -0.19 });
      break;
    case 'bald':
      // лысина, бакенбарды и борода
      hb.shell(0.258, 0.8, hair, { sy: HY, rx: -1.95 }, 24); // венчик на затылке
      if (!acc.includes('mask')) hb.sph(0.2, hair, { y: -0.15, z: 0.1, sx: 1.05, sy: 0.5, sz: 0.75 });
      hb.sph(0.028, shade(skin, -0.12), { y: -0.06, z: 0.25, sx: 1.2, sy: 0.9, sz: 0.7 });
      break;
    case 'pony':
      cut(1.35, 0.5);
      hb.sph(0.06, hair, { y: 0.06, z: -0.27 });
      hb.cone(0.065, 0.24, hair, { y: -0.08, z: -0.31, rx: Math.PI + 0.25 }, 10);
      break;
  }
  switch (o.hat) {
    case 'cap':
    case 'capBack': {
      const c = o.hatCol || (o.hat === 'cap' ? '#e8705a' : '#f2a63a');
      const back = o.hat === 'capBack';
      hb.shell(0.282, 1.15, c, { sy: HY, rx: back ? 0.15 : -0.15 }, 24);
      hb.cyl(0.03, 0.03, 0.02, shade(c, 0.3), { y: 0.27 }, 8);
      // козырёк: плоский полукруг, уходит под шапку
      hb.cyl(0.16, 0.16, 0.022, shade(c, -0.15), { y: 0.11, z: back ? -0.27 : 0.27, sz: 0.8, rx: back ? -0.12 : 0.12 }, 16);
      if (back) hb.rbox(0.1, 0.05, 0.02, 0.01, '#ffffff', { y: 0.1, z: 0.25, rx: -0.6 });
      else hb.rbox(0.08, 0.06, 0.02, 0.01, '#ffffff', { y: 0.2, z: 0.21, rx: -0.75 });
      break;
    }
    case 'beanie': {
      const c = o.hatCol || '#5ac0b0';
      hb.shell(0.285, 1.2, c, { sy: HY * 1.06, y: 0.02 }, 24);
      hb.torus(0.252, 0.035, shade(c, -0.15), { y: 0.1, rx: Math.PI / 2 });
      hb.sph(0.065, shade(c, 0.4), { y: 0.32 });
      break;
    }
    case 'visor': {
      const c = o.hatCol || '#4a8ad8';
      hb.torus(0.235, 0.035, c, { y: 0.09, rx: Math.PI / 2 });
      hb.cyl(0.15, 0.15, 0.02, shade(c, -0.2), { y: 0.09, z: 0.24, sz: 0.75, rx: 0.12 }, 16);
      break;
    }
    case 'helmet': {
      const c = o.hatCol || '#5a6a4a';
      hb.shell(0.295, 1.3, c, { sy: HY, rx: -0.1 }, 24);
      hb.torus(0.28, 0.022, shade(c, -0.15), { y: 0.07, z: 0.02, rx: Math.PI / 2 - 0.1 });
      hb.rbox(0.18, 0.04, 0.02, 0.01, '#f2c84a', { y: 0.2, z: 0.235, rx: -0.75 });
      break;
    }
    case 'bandana': {
      const c = o.hatCol || '#e85a5a';
      hb.shell(0.27, 1.1, c, { sy: HY, rx: -0.2 }, 24);
      hb.sph(0.05, c, { y: 0.02, z: -0.27 });
      for (const sx of [-1, 1]) hb.cone(0.04, 0.12, c, { x: sx * 0.04, y: -0.04, z: -0.29, rx: Math.PI - 0.4, rz: sx * 0.3 }, 6);
      for (let k = 0; k < 5; k++) {
        const a = -0.5 + k * 0.25;
        hb.sph(0.014, '#ffffff', { x: Math.sin(a) * 0.17, y: 0.18, z: Math.cos(a) * 0.17 + 0.02 });
      }
      break;
    }
    case 'goggles':
      hb.torus(0.236, 0.02, '#5a4a3a', { y: 0.12, rx: Math.PI / 2 + 0.25 });
      for (const sx of [-1, 1]) {
        hb.cyl(0.06, 0.06, 0.05, '#8a7a5a', { x: sx * 0.085, y: 0.19, z: 0.2, rx: 1.15 }, 14);
        hb.cyl(0.045, 0.045, 0.052, '#7ad0f0', { x: sx * 0.085, y: 0.192, z: 0.202, rx: 1.15 }, 14);
      }
      break;
    case 'straw': {
      hb.cyl(0.42, 0.42, 0.025, '#e8c870', { y: 0.13 }, 24);
      hb.shell(0.272, 1.25, '#e8c870', { sy: HY * 1.05, y: 0.02 }, 24);
      hb.torus(0.25, 0.025, '#c4544a', { y: 0.15, rx: Math.PI / 2 });
      break;
    }
  }
  if (acc.includes('glasses')) {
    for (const sx of [-1, 1]) hb.torus(0.05, 0.01, '#3a3a40', { x: sx * 0.09, y: -0.01, z: 0.24 });
    hb.box(0.06, 0.01, 0.01, '#3a3a40', { y: 0, z: 0.25 });
  }
  if (acc.includes('mask')) {
    hb.shell(0.258, 0.68, '#e8e4dc', { sy: HY, rx: 2.3 }, 20);
  }
  if (acc.includes('mustache')) hb.sph(0.065, o.hair || HAIRS[0], { y: -0.105, z: 0.235, sx: 1.4, sy: 0.4, sz: 0.5 });
  head.add(hb.mesh());
  // точка для ноши в руках
  const hand = new THREE.Group();
  hand.position.set(0, 0.62, 0.32);
  root.add(hand);
  g.userData = { legs, arms, head, root, hand, body };
  if (o.scale) g.scale.setScalar(o.scale);
  return g;
}

// анимация шага: t — время, sp — темп (0 — стоит)
export function animPerson(g, t, sp, o = {}) {
  const U = g.userData;
  const k = Math.min(1, sp);
  const ph = t * 9;
  U.legs[0].rotation.x = Math.sin(ph) * 0.6 * k;
  U.legs[1].rotation.x = -Math.sin(ph) * 0.6 * k;
  U.root.position.y = Math.abs(Math.sin(ph)) * 0.05 * k + (1 - k) * Math.sin(t * 2) * 0.008;
  U.head.rotation.z = Math.sin(t * 1.3 + (o.seed || 0)) * 0.04;
  if (o.carry) {
    U.arms[0].rotation.x = U.arms[1].rotation.x = -1.2;
    U.arms[0].rotation.z = 0.25;
    U.arms[1].rotation.z = -0.25;
  } else if (o.swing > 0) {
    const s = o.swing / 0.25;
    U.arms[1].rotation.x = -2.2 * s + 0.6 * (1 - s);
    U.arms[0].rotation.x = Math.sin(ph) * 0.3 * k;
    U.arms[0].rotation.z = 0.12;
    U.arms[1].rotation.z = -0.12;
  } else if (o.wave) {
    U.arms[1].rotation.x = -2.6;
    U.arms[1].rotation.z = -0.3 + Math.sin(t * 8) * 0.35;
    U.arms[0].rotation.x = 0;
  } else if (o.work) {
    U.arms[0].rotation.x = -1.0 + Math.sin(t * 10) * 0.3;
    U.arms[1].rotation.x = -1.0 - Math.sin(t * 10) * 0.3;
  } else {
    U.arms[0].rotation.x = -Math.sin(ph) * 0.5 * k;
    U.arms[1].rotation.x = Math.sin(ph) * 0.5 * k;
    U.arms[0].rotation.z = 0.12;
    U.arms[1].rotation.z = -0.12;
  }
}

// продавец
export function makeHero() {
  return makePerson({ skin: '#ffd9c0', hair: '#6a4430', hairStyle: 'short', shirt: '#f4ead8', pants: '#3e4a68', apron: '#4aa86a', hat: 'capBack', hatCol: '#f2a63a', belt: false, acc: ['radio'], shoe: '#7a4a30', scale: 1.08 });
}

// покупатель по зерну
export function makeCustomer(seed) {
  const r = rng(seed);
  const acc = [];
  if (r() < 0.45) acc.push('backpack');
  else if (r() < 0.35) acc.push('bag');
  if (r() < 0.25) acc.push('scarf');
  if (r() < 0.18) acc.push('glasses');
  if (r() < 0.12) acc.push('mask');
  const style = pickR(r, ['short', 'bun', 'long', 'curly', 'bald', 'pony', 'short']);
  if (style === 'bald' && r() < 0.5) acc.push('mustache');
  const hat = r() < 0.5 ? pickR(r, ['cap', 'beanie', 'bandana', 'straw', 'goggles']) : null;
  return makePerson({
    skin: pickR(r, SKINS),
    hair: pickR(r, HAIRS),
    hairStyle: style,
    shirt: pickR(r, SHIRTS),
    jacket: r() < 0.45 ? pickR(r, ['#6a7a5a', '#8a5a4a', '#4a5a7a', '#b8844a', '#5a5a64', '#9a4a5a']) : null,
    pants: pickR(r, PANTS),
    hat,
    hatCol: pickR(r, SHIRTS),
    scarfCol: pickR(r, SHIRTS),
    packCol: pickR(r, ['#c46a3a', '#5a7a9a', '#7a8a4a', '#9a5a8a', '#c4a04a']),
    acc,
    scale: 0.92 + r() * 0.16,
  });
}

// персонал по роли
export function makeStaff(role, seed) {
  const r = rng(seed);
  const base = { skin: pickR(r, SKINS), hair: pickR(r, HAIRS), hairStyle: pickR(r, ['short', 'bun', 'curly', 'pony', 'bald', 'long']), pants: pickR(r, PANTS), scale: 1.0 };
  switch (role) {
    case 'cashier':
      return makePerson(Object.assign(base, { shirt: '#f4ead8', vest: null, jacket: '#4a8ad8', hat: 'visor', hatCol: '#4a8ad8', acc: ['glasses'] }));
    case 'stocker':
      return makePerson(Object.assign(base, { shirt: '#f2c84a', overalls: '#5a7a9a', hat: 'beanie', hatCol: '#e8705a', gloves: '#e8c070' }));
    case 'guard':
      return makePerson(Object.assign(base, { shirt: '#6a7a5a', vest: '#4a5a3a', hat: 'helmet', hatCol: '#5a6a4a', belt: true, gloves: '#3a3a40', acc: ['radio'] }));
    default:
      return makePerson(Object.assign(base, { shirt: '#c46a3a', jacket: '#7a6a4a', hat: 'goggles', acc: ['bigpack', 'scarf'], scarfCol: '#e8c070' }));
  }
}

// ---------- зомби (милые, без жути) ----------
const ZSKIN = ['#a8d8a0', '#9ccfa8', '#b4d8a0', '#a0c8b8', '#bcd4a4'];
export function makeZombie(type = 'walker', seed = 1) {
  const r = rng(seed);
  const g = new THREE.Group();
  const root = new THREE.Group();
  g.add(root);
  // ползун лежит: всё тело в наклонённой «оси»
  const crawl = type === 'crawler';
  const pivot = new THREE.Group();
  root.add(pivot);
  if (crawl) {
    pivot.rotation.x = 1.3;
    pivot.position.set(0, 0.2, -0.5);
  }
  const skin = type === 'bloater' ? '#b8c890' : type === 'spitter' ? '#b8d878' : type === 'screamer' ? '#c4d8c0' : pickR(r, ZSKIN);
  const big = { brute: 1.35, boss: 1.9, runner: 0.92, screamer: 1.05, thief: 0.95, hardhat: 1.08 }[type] || 1;
  const shirt =
    { runner: pickR(r, ['#8a6aa8', '#6a8aa8', '#a86a6a']), brute: '#6a7a9a', boss: '#f2a63a', screamer: '#d8a0c0', thief: '#3a3a44', spitter: '#a8b85a', hardhat: '#8a9ab0', crawler: '#b89a7a' }[type] ||
    pickR(r, ['#b89a7a', '#8aa0b8', '#c49a9a', '#a8b088', '#9a8ab0']);
  const pants = type === 'screamer' ? '#7a5a8a' : type === 'hardhat' ? '#4a5a7a' : pickR(r, ['#5a5a6a', '#6a5a48', '#4a5a6a']);
  // ноги
  const legs = [-1, 1].map((sx) => {
    const b = new B();
    if (crawl) {
      // обрывки штанин
      b.caps(0.075, 0.06, pants, { y: -0.06 });
      for (let k = 0; k < 3; k++) b.cone(0.03, 0.07, pants, { x: -0.04 + k * 0.04, y: -0.15, rx: Math.PI }, 4);
    } else {
      b.caps(0.075, 0.2, pants, { y: -0.15 });
      if (sx > 0) b.rbox(0.09, 0.06, 0.02, 0.008, shade(pants, 0.25), { y: -0.18, z: 0.072 }); // заплатка
      if (type === 'hardhat') {
        b.sph(0.085, '#6a4a30', { y: -0.32, z: 0.04, sx: 1.05, sy: 0.65, sz: 1.4 }); // ботинки
        b.rbox(0.15, 0.03, 0.25, 0.012, '#3a2a20', { y: -0.37, z: 0.04 });
      } else b.sph(0.082, skin, { y: -0.33, z: 0.05, sx: 1, sy: 0.55, sz: 1.3 }); // босые
    }
    const m = b.mesh();
    m.position.set(sx * 0.11, 0.39, 0);
    pivot.add(m);
    return m;
  });
  const body = new B();
  if (type === 'bloater') {
    body.sph(0.42, skin, { y: 0.7, sy: 0.95 }, 20);
    for (let k = 0; k < 7; k++) {
      const a = r() * 6.28,
        h = 0.45 + r() * 0.5;
      const rr = Math.sqrt(Math.max(0, 0.42 * 0.42 - ((h - 0.7) / 0.95) ** 2));
      body.sph(0.06 + r() * 0.03, '#d8a8d0', { x: Math.sin(a) * rr, y: h, z: Math.cos(a) * rr, sx: 1, sy: 1, sz: 1 });
    }
    body.cyl(0.36, 0.3, 0.16, shirt, { y: 0.4 }, 18);
  } else {
    const tw = type === 'screamer' ? 0.38 : 0.44;
    body.rbox(tw, 0.44, 0.3, 0.12, shirt, { y: 0.6 });
    // рваный низ рубашки
    for (let k = 0; k < 5; k++) body.cone(0.05, 0.1, shirt, { x: -0.16 + k * 0.08, y: 0.36, z: 0.11, rx: Math.PI }, 4);
    body.cyl(0.19, 0.2, 0.1, pants, { y: 0.4 }, 16);
    body.cyl(0.07, 0.08, 0.1, skin, { y: 0.84 }, 10);
    body.rbox(0.08, 0.08, 0.02, 0.01, shade(shirt, 0.3), { x: -0.1, y: 0.68, z: 0.152, rz: 0.4 });
    // стежки
    for (let k = 0; k < 3; k++) body.box(0.012, 0.06, 0.012, INK, { x: 0.08 + k * 0.04, y: 0.55, z: 0.152 });
    body.box(0.13, 0.012, 0.012, INK, { x: 0.12, y: 0.55, z: 0.153 });
    if (type === 'runner') {
      // худи: карман и капюшон на спине
      body.rbox(0.22, 0.12, 0.02, 0.01, shade(shirt, -0.2), { y: 0.5, z: 0.152 });
      body.shell(0.17, 1.4, shirt, { y: 0.84, z: -0.13, rx: -2.2 }, 16);
    }
    if (type === 'brute' || type === 'boss') {
      const c = type === 'boss' ? '#f2c84a' : '#4a5a7a';
      body.rbox(0.36, 0.3, 0.02, 0.01, c, { y: 0.52, z: 0.152 });
      for (const sx of [-1, 1]) body.box(0.05, 0.26, 0.02, c, { x: sx * 0.12, y: 0.72, z: 0.152 });
      if (type === 'boss') for (const y of [0.55, 0.68]) body.rbox(0.455, 0.035, 0.315, 0.012, '#f4f0e0', { y });
    }
    if (type === 'screamer') {
      // платье-рубаха с оборкой
      body.cyl(0.22, 0.28, 0.2, shirt, { y: 0.36 }, 18);
      body.torus(0.25, 0.025, shade(shirt, 0.3), { y: 0.27, rx: Math.PI / 2 });
    }
    if (type === 'thief') {
      // полосатая кофта и мешок за спиной
      for (const y of [0.48, 0.6, 0.72]) body.rbox(0.445, 0.04, 0.305, 0.015, '#e8e4dc', { y });
      body.sph(0.24, '#c4a070', { y: 0.68, z: -0.3, sy: 1.1 });
      body.cyl(0.05, 0.08, 0.1, '#a8844a', { y: 0.95, z: -0.3 }, 8);
      body.beam([-0.16, 0.82, 0.14], [0.18, 0.46, -0.12], 0.03, '#8a6a40');
    }
    if (type === 'spitter') {
      for (let k = 0; k < 5; k++) body.sph(0.035, '#7ac04a', { x: -0.15 + r() * 0.3, y: 0.45 + r() * 0.3, z: 0.15, sz: 0.4 });
    }
    if (type === 'hardhat') {
      // жилет-светоотражайка, пояс с инструментом
      body.rbox(0.45, 0.36, 0.31, 0.11, '#f28a2a', { y: 0.62 });
      for (const y of [0.55, 0.69]) body.rbox(0.455, 0.035, 0.315, 0.012, '#f4f0e0', { y });
      body.cyl(0.205, 0.205, 0.06, '#5a4a3a', { y: 0.44 }, 16);
      body.beam([0.2, 0.36, 0.08], [0.2, 0.52, 0.08], 0.05, '#c8ccd4', true);
    }
  }
  pivot.add(body.mesh());
  // руки вперёд
  const arms = [-1, 1].map((sx) => {
    const b = new B();
    b.caps(0.07, 0.16, type === 'bloater' ? skin : shirt, { y: -0.1 });
    b.caps(0.064, 0.1, skin, { y: -0.27 });
    if (type === 'hardhat') b.sph(0.07, '#e8c070', { y: -0.37 });
    const m = b.mesh();
    m.position.set(sx * (type === 'bloater' ? 0.42 : type === 'screamer' ? 0.24 : 0.265), type === 'bloater' ? 0.8 : 0.77, 0);
    m.rotation.x = -1.4;
    m.rotation.z = sx * 0.1;
    pivot.add(m);
    return m;
  });
  const head = new THREE.Group();
  head.position.y = type === 'bloater' ? 1.2 : 1.1;
  pivot.add(head);
  const hb = new B();
  const HR = type === 'spitter' ? 0.28 : 0.26;
  hb.sph(HR, skin, { sy: 0.95 }, 22);
  // разные глазки: один большой, другой поменьше
  const big1 = r() < 0.5 ? 1 : -1;
  const ez = type === 'thief' ? 0.03 : 0; // у вора глаза поверх маски
  for (const sx of [-1, 1]) {
    const er = sx === big1 ? 0.085 : 0.065;
    hb.sph(er + 0.018, type === 'thief' ? '#1e1e26' : shade(skin, -0.18), { x: sx * 0.1, y: 0.02, z: HR - 0.07 + ez, sz: 0.5 });
    hb.sph(er, '#fffdf4', { x: sx * 0.1, y: 0.02, z: HR - 0.055 + ez, sz: 0.55 });
    hb.sph(er * 0.38, type === 'spitter' ? '#3a6a20' : INK, { x: sx * 0.1 + sx * 0.012, y: sx === big1 ? 0.01 : -0.01, z: HR - 0.015 + ez });
  }
  if (type === 'screamer') {
    // широко раскрытый рот
    hb.sph(0.075, '#4a2030', { y: -0.13, z: HR - 0.05, sx: 1, sy: 1.3, sz: 0.6 });
    hb.sph(0.04, '#e87a8a', { y: -0.17, z: HR - 0.03, sx: 1.2, sy: 0.6, sz: 0.6 });
  } else if (type === 'spitter') {
    // надутые щёки и капля слюны
    for (const sx of [-1, 1]) hb.sph(0.09, shade(skin, 0.1), { x: sx * 0.14, y: -0.09, z: 0.17 });
    hb.sph(0.04, '#5a8a3a', { y: -0.14, z: HR - 0.02, sx: 1.2, sy: 0.8, sz: 0.6 });
    hb.sph(0.025, '#9ae05a', { x: 0.02, y: -0.21, z: HR - 0.04, sy: 1.5 });
  } else {
    // ротик-зигзаг из стежков и румянец
    for (let k = 0; k < 4; k++) hb.box(0.012, 0.035, 0.012, INK, { x: -0.045 + k * 0.03, y: -0.12, z: HR - 0.025 });
    hb.box(0.11, 0.01, 0.01, INK, { y: -0.12, z: HR - 0.023 });
    for (const sx of [-1, 1]) hb.sph(0.038, '#e8a0b0', { x: sx * 0.16, y: -0.08, z: 0.19, sy: 0.6, sz: 0.5 });
  }
  const HY = 0.95;
  if (type === 'boss') {
    hb.shell(0.29, 1.2, '#f2c84a', { sy: HY, rx: -0.1 }, 24);
    hb.torus(0.275, 0.025, '#e0b030', { y: 0.08, rx: Math.PI / 2 - 0.1 });
    hb.rbox(0.07, 0.05, 0.3, 0.02, '#e0b030', { y: 0.27 });
  } else if (type === 'hardhat') {
    // каска строителя: купол, гребень, козырёк
    hb.shell(0.3, 1.25, '#f2c43a', { sy: HY }, 24);
    hb.cyl(0.33, 0.33, 0.025, '#e0a82a', { y: 0.1, sz: 1.08 }, 24);
    hb.rbox(0.06, 0.05, 0.4, 0.02, '#e0a82a', { y: 0.29 });
  } else if (type === 'brute') {
    hb.shell(0.268, 1.05, '#6a5a48', { sy: HY, rx: -0.4 }, 22);
  } else if (type === 'runner') {
    // капюшон: шапочка, открытая спереди
    hb.shell(0.295, 2.25, shirt, { sy: HY, rx: -Math.PI / 2 - 0.25 }, 22);
    hb.torus(0.2, 0.035, shade(shirt, -0.15), { y: 0.03, z: 0.12, rx: -0.25 });
  } else if (type === 'thief') {
    // шапочка и маска-полоска на глазах
    hb.shell(0.272, 1.15, '#2a2a34', { sy: HY * 1.05, y: 0.01 }, 22);
    hb.torus(0.25, 0.03, '#3a3a48', { y: 0.11, rx: Math.PI / 2 });
    hb.cyl(0.266, 0.266, 0.09, '#1e1e26', { y: 0.025 }, 24);
  } else if (type === 'screamer') {
    // длинные растрёпанные волосы
    const hc = pickR(r, ['#e8e0d0', '#8a7a9a', '#c4a0a0']);
    hb.shell(0.272, 1.5, hc, { sy: HY, rx: -0.6 }, 22);
    hb.rbox(0.46, 0.4, 0.1, 0.05, hc, { y: -0.16, z: -0.18 });
    for (let k = 0; k < 5; k++) hb.cone(0.05, 0.16, hc, { x: -0.16 + k * 0.08, y: -0.38, z: -0.18, rx: Math.PI }, 5);
  } else if (type === 'spitter') {
    for (let k = 0; k < 3; k++) hb.sph(0.03, '#7ac04a', { x: -0.08 + k * 0.08, y: 0.24, z: 0.05 + k * 0.02 });
  } else {
    const hc = pickR(r, ['#6a5a48', '#8a7a5a', '#4a4a50', '#a8683a']);
    for (let k = 0; k < 4; k++) hb.cone(0.05, 0.14, hc, { x: -0.08 + k * 0.05, y: 0.25, z: -0.02 + (k % 2) * 0.04, rz: (k - 1.5) * 0.35 }, 5);
    if (r() < 0.4) {
      // пластырь крестиком
      hb.box(0.1, 0.03, 0.01, '#f2d8b0', { x: -0.14, y: 0.13, z: 0.205, rz: 0.6, rx: -0.5 });
      hb.box(0.1, 0.03, 0.01, '#f2d8b0', { x: -0.14, y: 0.13, z: 0.206, rz: -0.6, rx: -0.5 });
    }
  }
  if (type !== 'hardhat' && type !== 'thief' && type !== 'runner' && type !== 'screamer' && type !== 'boss') {
    // шов на голове
    for (let k = 0; k < 4; k++) hb.box(0.04, 0.01, 0.012, INK, { x: 0.12, y: 0.12 + k * 0.03, z: 0.19 - k * 0.014, rz: 0.4, rx: -0.5 });
  }
  const hm = hb.mesh();
  if (crawl) hm.rotation.x = -1.15; // ползун смотрит вперёд
  head.add(hm);
  head.rotation.z = (r() - 0.5) * 0.3;
  // точка для украденного
  const hand = new THREE.Group();
  hand.position.set(0, 0.55, 0.35);
  pivot.add(hand);
  g.userData = { legs, arms, head, root, type, skin, hand, hm };
  g.scale.setScalar(big);
  return g;
}

export function animZombie(g, t, moving, o = {}) {
  const U = g.userData;
  const ph = t * (U.type === 'runner' || U.type === 'thief' ? 11 : U.type === 'crawler' ? 5 : 6) + (o.seed || 0);
  const k = moving ? 1 : 0.25;
  const atk = o.atk > 0 ? Math.sin((o.atk / 0.35) * Math.PI) : 0;
  if (U.type === 'crawler') {
    // гребёт руками, ноги волочатся
    U.legs[0].rotation.x = U.legs[1].rotation.x = 0.1;
    U.arms[0].rotation.x = -1.6 + Math.sin(ph) * 0.6 * k - atk * 0.5;
    U.arms[1].rotation.x = -1.6 - Math.sin(ph) * 0.6 * k - atk * 0.5;
    U.root.rotation.z = Math.sin(ph) * 0.1 * k;
    U.root.position.y = Math.abs(Math.sin(ph)) * 0.03 * k;
    U.root.position.z = atk * 0.25;
    U.head.rotation.x = Math.sin(t * 1.7 + (o.seed || 0)) * 0.08;
    return;
  }
  U.legs[0].rotation.x = Math.sin(ph) * 0.5 * k;
  U.legs[1].rotation.x = -Math.sin(ph) * 0.5 * k;
  U.root.rotation.z = Math.sin(ph) * 0.08 * k;
  U.root.position.y = Math.abs(Math.sin(ph)) * 0.04 * k;
  if (o.scream > 0) {
    // крик: руки вверх, голова назад
    U.arms[0].rotation.x = U.arms[1].rotation.x = -2.7;
    U.arms[0].rotation.z = -0.5;
    U.arms[1].rotation.z = 0.5;
    U.head.rotation.x = -0.35 + Math.sin(t * 40) * 0.04;
    U.root.position.z = 0;
    return;
  }
  U.arms[0].rotation.z = -0.1;
  U.arms[1].rotation.z = 0.1;
  if (o.carry) {
    U.arms[0].rotation.x = U.arms[1].rotation.x = -1.1;
  } else {
    U.arms[0].rotation.x = -1.4 + Math.sin(ph * 0.5) * 0.15 - atk * 0.6;
    U.arms[1].rotation.x = -1.4 - Math.sin(ph * 0.5) * 0.15 - atk * 0.6;
  }
  U.head.rotation.x = (o.spit > 0 ? -0.3 : 0) + Math.sin(t * 1.7 + (o.seed || 0)) * 0.08;
  U.root.position.z = atk * 0.12;
}

// ---------- товары и материалы ----------
export function itemB(id) {
  const b = new B();
  switch (id) {
    case 'can':
      b.cyl(0.1, 0.1, 0.18, '#c8ccd4', { y: 0.09 }, 14);
      b.cyl(0.102, 0.102, 0.11, '#e8705a', { y: 0.09 }, 14);
      b.cyl(0.103, 0.103, 0.03, '#f2c84a', { y: 0.09 }, 14);
      b.cyl(0.085, 0.085, 0.01, '#a8acb4', { y: 0.185 }, 14);
      break;
    case 'water':
      b.cyl(0.08, 0.08, 0.26, '#8ad0f0', { y: 0.13 }, 12);
      b.cyl(0.082, 0.082, 0.07, '#4a8ad8', { y: 0.12 }, 12);
      b.cone(0.08, 0.06, '#8ad0f0', { y: 0.29 }, 12);
      b.cyl(0.035, 0.035, 0.04, '#4a8ad8', { y: 0.33 }, 10);
      break;
    case 'candle':
      for (const [x, z] of [[-0.05, 0], [0.05, 0.02], [0, -0.06]]) {
        b.cyl(0.04, 0.04, 0.2, '#fff4dc', { x, z, y: 0.1 }, 10);
        b.cyl(0.006, 0.006, 0.03, INK, { x, z, y: 0.215 }, 4);
      }
      b.box(0.2, 0.02, 0.16, '#c4a46a', { y: 0.01 });
      break;
    case 'bandage':
      b.cyl(0.09, 0.09, 0.12, '#fbf8f0', { y: 0.06, rz: 0 }, 14);
      b.cyl(0.03, 0.03, 0.125, '#e8e0d0', { y: 0.06 }, 10);
      b.box(0.08, 0.025, 0.01, '#e84a4a', { y: 0.07, z: 0.092 });
      b.box(0.025, 0.08, 0.01, '#e84a4a', { y: 0.07, z: 0.092 });
      break;
    case 'seeds':
      b.box(0.17, 0.22, 0.03, '#f4e8c8', { y: 0.11 });
      b.sph(0.05, '#6ac04a', { y: 0.13, z: 0.016, sz: 0.2, sx: 0.7 });
      b.sph(0.04, '#e8705a', { x: 0.03, y: 0.07, z: 0.016, sz: 0.2 });
      b.box(0.17, 0.03, 0.032, '#6ac04a', { y: 0.2 });
      break;
    case 'blanket':
      b.rbox(0.28, 0.08, 0.2, 0.03, '#c4544a', { y: 0.04 });
      b.rbox(0.28, 0.08, 0.2, 0.03, '#e8c070', { y: 0.12 });
      b.box(0.285, 0.02, 0.205, '#f4ead8', { y: 0.06 });
      b.box(0.04, 0.17, 0.205, '#3a5a8a', { x: 0.06, y: 0.08 });
      break;
    case 'ration':
      b.rbox(0.26, 0.12, 0.18, 0.02, '#8a9a5a', { y: 0.06 });
      b.box(0.14, 0.01, 0.1, '#f4ead8', { y: 0.125 });
      b.box(0.04, 0.012, 0.04, '#c4544a', { y: 0.13 });
      break;
    case 'flashlight':
      b.cyl(0.045, 0.045, 0.22, '#3a3a44', { y: 0.05, rz: Math.PI / 2 }, 10);
      b.cyl(0.07, 0.05, 0.08, '#f2c84a', { x: 0.14, y: 0.05, rz: Math.PI / 2 }, 12);
      b.cyl(0.06, 0.06, 0.01, '#fff8c0', { x: 0.181, y: 0.05, rz: Math.PI / 2 }, 12);
      b.box(0.03, 0.02, 0.03, '#e8705a', { x: -0.02, y: 0.1 });
      break;
    case 'medkit':
      b.rbox(0.26, 0.17, 0.12, 0.03, '#e8504a', { y: 0.085 });
      b.box(0.1, 0.03, 0.01, '#ffffff', { y: 0.09, z: 0.062 });
      b.box(0.03, 0.1, 0.01, '#ffffff', { y: 0.09, z: 0.062 });
      b.box(0.08, 0.03, 0.03, '#a83a34', { y: 0.18 });
      break;
    case 'tools':
      b.rbox(0.3, 0.12, 0.14, 0.02, '#d84a3a', { y: 0.06 });
      b.box(0.3, 0.02, 0.145, '#a8a8b0', { y: 0.1 });
      b.box(0.14, 0.02, 0.03, '#3a3a40', { y: 0.16 });
      for (const sx of [-1, 1]) b.box(0.02, 0.06, 0.02, '#3a3a40', { x: sx * 0.06, y: 0.13 });
      break;
    case 'gasmask':
      b.sph(0.11, '#4a5a4a', { y: 0.12, sz: 0.8 });
      for (const sx of [-1, 1]) b.cyl(0.04, 0.04, 0.02, '#9ad0e0', { x: sx * 0.045, y: 0.15, z: 0.08, rx: 1.4 }, 10);
      b.cyl(0.045, 0.05, 0.08, '#8a8a7a', { y: 0.06, z: 0.1, rx: 1.0 }, 10);
      break;
    case 'radio':
      b.rbox(0.26, 0.17, 0.1, 0.03, '#7a5a3a', { y: 0.085 });
      b.box(0.1, 0.1, 0.01, '#3a3028', { x: -0.06, y: 0.085, z: 0.052 });
      b.cyl(0.025, 0.025, 0.02, '#f2c84a', { x: 0.07, y: 0.11, z: 0.055, rx: Math.PI / 2 }, 10);
      b.box(0.06, 0.03, 0.01, '#c8e0a0', { x: 0.07, y: 0.05, z: 0.052 });
      b.cyl(0.006, 0.006, 0.24, '#b8b8c0', { x: 0.1, y: 0.28, rz: -0.3 }, 4);
      break;
    case 'scrap':
      b.box(0.22, 0.03, 0.1, '#8a9098', { y: 0.03, ry: 0.4 });
      b.box(0.16, 0.03, 0.08, '#b07a5a', { y: 0.06, x: 0.03, ry: -0.5, rz: 0.2 });
      b.cyl(0.03, 0.03, 0.18, '#6a7078', { y: 0.08, rz: 1.2, ry: 0.8 }, 8);
      b.torus(0.04, 0.012, '#a8aeb8', { y: 0.11, x: -0.06, rx: 1.2 });
      break;
    case 'wood':
      for (let k = 0; k < 3; k++) b.box(0.32, 0.04, 0.08, k % 2 ? '#c4945a' : '#d8a86a', { y: 0.025 + k * 0.045, z: (k - 1) * 0.02, ry: (k - 1) * 0.12 });
      b.box(0.02, 0.01, 0.02, '#5a5a60', { x: 0.1, y: 0.14 });
      break;
    case 'cloth':
      b.cyl(0.06, 0.06, 0.26, '#9a7ad8', { y: 0.06, rz: Math.PI / 2 }, 12);
      b.cyl(0.055, 0.055, 0.24, '#e8a0b0', { y: 0.15, z: 0.02, rz: Math.PI / 2 }, 12);
      break;
    case 'chem':
      b.rbox(0.18, 0.24, 0.1, 0.03, '#5ac0b0', { y: 0.12 });
      b.cyl(0.025, 0.025, 0.05, '#2a2430', { x: 0.05, y: 0.26 }, 8);
      b.box(0.1, 0.08, 0.01, '#f2e04a', { y: 0.12, z: 0.052, rz: 0.78 });
      b.box(0.06, 0.03, 0.04, '#5ac0b0', { x: -0.05, y: 0.25 });
      break;
    case 'parts':
      b.cyl(0.08, 0.08, 0.04, '#c8a04a', { y: 0.02 }, 10);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        b.box(0.035, 0.04, 0.035, '#c8a04a', { x: Math.cos(a) * 0.09, y: 0.02, z: Math.sin(a) * 0.09, ry: -a });
      }
      b.cyl(0.03, 0.03, 0.05, '#6a5030', { y: 0.025 }, 8);
      b.box(0.12, 0.02, 0.08, '#4a8a4a', { x: 0.06, y: 0.06, z: 0.04, ry: 0.4 });
      b.cyl(0.008, 0.008, 0.2, '#e8504a', { x: -0.04, y: 0.07, rz: 1.3, ry: 0.5 }, 4);
      break;
    case 'trap':
      b.cyl(0.18, 0.18, 0.03, '#6a7078', { y: 0.015 }, 16);
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        b.cone(0.025, 0.07, '#a8aeb8', { x: Math.cos(a) * 0.15, y: 0.06, z: Math.sin(a) * 0.15 }, 4);
      }
      b.cyl(0.05, 0.05, 0.03, '#e8504a', { y: 0.04 }, 10);
      break;
    case 'bat':
      b.cyl(0.05, 0.05, 0.16, '#3a3a44', { y: 0.08, rz: Math.PI / 2 }, 12);
      b.cyl(0.051, 0.051, 0.07, '#f2c84a', { x: 0.03, y: 0.08, rz: Math.PI / 2 }, 12);
      b.cyl(0.02, 0.02, 0.02, '#c8ccd4', { x: 0.09, y: 0.08, rz: Math.PI / 2 }, 8);
      break;
  }
  return b;
}
const itemCache = {};
export function itemGeo(id) {
  if (!itemCache[id]) itemCache[id] = itemB(id).geometry();
  return itemCache[id];
}
export function makeItem(id) {
  const m = new THREE.Mesh(itemGeo(id), MAT);
  m.castShadow = true;
  return m;
}

// ---------- мебель лавки ----------
export function makeShelf() {
  const b = new B();
  const W = 1.7,
    D = 0.62;
  const metal = '#8a96a8',
    dark = '#5a6474';
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) b.box(0.05, 1.5, 0.05, dark, { x: sx * (W / 2 - 0.03), y: 0.75, z: sz * (D / 2 - 0.03) });
  for (const y of [0.12, 0.62, 1.12]) {
    b.box(W, 0.04, D, metal, { y });
    b.box(W, 0.07, 0.02, '#e8c070', { y: y - 0.01, z: D / 2 }); // ценник-полоска
  }
  b.box(W, 1.0, 0.02, shade(metal, -0.15), { y: 0.62, z: -D / 2 + 0.01 });
  b.box(W + 0.06, 0.05, D + 0.04, dark, { y: 1.5 });
  return b;
}

export function makeCounter() {
  const b = new B();
  b.box(2.8, 0.9, 0.8, '#b8844a', { y: 0.45 });
  b.box(2.86, 0.06, 0.86, '#8a5a30', { y: 0.92 });
  for (let k = 0; k < 6; k++) b.box(0.02, 0.84, 0.01, '#9a6a3a', { x: -1.2 + k * 0.48, y: 0.45, z: 0.405 });
  b.box(2.8, 0.1, 0.02, '#6a4224', { y: 0.06, z: 0.41 });
  // касса
  b.rbox(0.56, 0.24, 0.4, 0.05, '#5a6a7a', { x: 0.6, y: 1.07, z: -0.05 });
  b.box(0.42, 0.06, 0.24, '#3a4250', { x: 0.6, y: 1.2, z: 0.04, rx: -0.4 });
  b.box(0.3, 0.16, 0.06, '#3a4250', { x: 0.6, y: 1.3, z: -0.18 });
  b.box(0.24, 0.1, 0.01, '#9ae08a', { x: 0.6, y: 1.31, z: -0.146 });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) b.box(0.07, 0.02, 0.05, '#e8e4dc', { x: 0.48 + i * 0.09, y: 1.235, z: -0.04 + j * 0.07, rx: -0.4 });
  // тестер батареек: коробочка со стрелкой и зажимами
  b.rbox(0.4, 0.2, 0.26, 0.04, '#f2c84a', { x: -0.55, y: 1.05, z: 0.05 });
  b.box(0.26, 0.12, 0.01, '#fff8e8', { x: -0.55, y: 1.08, z: 0.185 });
  b.box(0.012, 0.09, 0.012, '#e84a4a', { x: -0.58, y: 1.08, z: 0.192, rz: 0.5 });
  b.box(0.13, 0.04, 0.01, '#6ac04a', { x: -0.49, y: 1.05, z: 0.19 });
  b.box(0.1, 0.04, 0.011, '#e84a4a', { x: -0.62, y: 1.05, z: 0.19 });
  for (const sx of [-1, 1]) {
    b.cyl(0.008, 0.008, 0.3, sx < 0 ? '#e84a4a' : '#3a3a40', { x: -0.55 + sx * 0.12, y: 1.06, z: -0.16, rx: 1.3 }, 4);
    b.box(0.05, 0.03, 0.06, sx < 0 ? '#e84a4a' : '#3a3a40', { x: -0.55 + sx * 0.14, y: 0.97, z: -0.3 });
  }
  // баночка с батарейками и табличка
  b.cyl(0.09, 0.08, 0.16, '#cfe8f0', { x: 1.15, y: 1.03, z: 0.1 }, 12);
  for (let k = 0; k < 4; k++) b.cyl(0.025, 0.025, 0.1, k % 2 ? '#f2c84a' : '#3a3a44', { x: 1.12 + (k % 2) * 0.05, y: 1.05 + k * 0.01, z: 0.08 + ((k >> 1) % 2) * 0.05, rz: 0.4 * k }, 8);
  b.box(0.3, 0.2, 0.02, '#f4ead8', { x: -1.15, y: 1.1, z: 0.25, rx: -0.3 });
  b.box(0.2, 0.03, 0.005, '#4a8a4a', { x: -1.15, y: 1.13, z: 0.262, rx: -0.3 });
  return b;
}

export function makeStorage() {
  const b = new B();
  // стеллаж с коробками у задней стены
  b.box(4.4, 0.12, 1.1, '#a8844a', { y: 0.06 });
  const box = (x, y, z, w, h, d, c) => {
    b.rbox(w, h, d, 0.03, c, { x, y: y + h / 2, z });
    b.box(w + 0.005, 0.05, d * 0.3, '#d8c09a', { x, y: y + h - 0.02, z });
  };
  box(-1.6, 0.12, 0.05, 0.9, 0.6, 0.8, '#c8a06a');
  box(-1.6, 0.72, 0.05, 0.8, 0.5, 0.7, '#d8b07a');
  box(-0.6, 0.12, 0, 0.8, 0.7, 0.9, '#b88a5a');
  box(0.35, 0.12, 0.1, 0.9, 0.5, 0.8, '#d8b07a');
  box(0.35, 0.62, 0.05, 0.7, 0.45, 0.7, '#c8a06a');
  box(1.4, 0.12, 0, 1.0, 0.8, 0.9, '#c4945a');
  box(1.45, 0.92, 0, 0.8, 0.5, 0.75, '#d8b07a');
  box(-0.6, 0.82, 0, 0.6, 0.4, 0.6, '#e0c08a');
  // ящики с надписями-полосками
  for (const [x, y] of [[-1.6, 0.4], [0.35, 0.35], [1.4, 0.5]]) b.box(0.3, 0.08, 0.01, '#5a4a3a', { x, y, z: 0.46 });
  return b;
}

export function makeBench() {
  const b = new B();
  const W = 3.8;
  b.box(W, 0.1, 0.9, '#a8744a', { y: 0.9 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.1, 0.9, 0.1, '#7a5030', { x: sx * (W / 2 - 0.1), y: 0.45, z: sz * 0.35 });
  b.box(W - 0.2, 0.06, 0.8, '#8a5a30', { y: 0.25 });
  // тиски
  b.box(0.2, 0.18, 0.26, '#4a6a9a', { x: 1.4, y: 1.04, z: 0.2 });
  b.cyl(0.02, 0.02, 0.4, '#a8aeb8', { x: 1.4, y: 1.06, z: 0.4, rx: Math.PI / 2 }, 6);
  // перфорированный щит с инструментами
  b.box(W - 0.4, 1.1, 0.06, '#d8b88a', { y: 1.65, z: -0.4 });
  for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) b.cyl(0.015, 0.015, 0.02, '#a88a5a', { x: -1.6 + i * 0.29, y: 1.25 + j * 0.27, z: -0.36, rx: Math.PI / 2 }, 5);
  b.box(0.06, 0.4, 0.04, '#7a5030', { x: -1.2, y: 1.7, z: -0.34 }); // молоток
  b.box(0.2, 0.08, 0.06, '#7a7e88', { x: -1.2, y: 1.92, z: -0.34 });
  b.box(0.5, 0.12, 0.02, '#c8ccd4', { x: -0.4, y: 1.8, z: -0.35 }); // пила
  b.box(0.12, 0.14, 0.04, '#7a5030', { x: -0.7, y: 1.8, z: -0.34 });
  b.torus(0.1, 0.02, '#e8504a', { x: 0.4, y: 1.8, z: -0.34 }); // моток провода
  b.box(0.04, 0.3, 0.03, '#e8b03a', { x: 0.85, y: 1.7, z: -0.34, rz: 0.3 }); // отвёртка
  // на столе: доска, банка гвоздей, лампа
  b.box(0.8, 0.04, 0.2, '#d8a86a', { x: -0.6, y: 0.97, z: 0.05, ry: 0.2 });
  b.cyl(0.08, 0.08, 0.14, '#a8aeb8', { x: 0.3, y: 1.02, z: 0.15 }, 10);
  b.cyl(0.02, 0.02, 0.45, '#3a3a40', { x: -1.5, y: 1.15, z: -0.2, rz: 0.3 }, 6);
  b.cone(0.12, 0.14, '#4aa86a', { x: -1.42, y: 1.36, z: -0.2, rz: -0.6 }, 10);
  return b;
}

export function makeCot() {
  const b = new B();
  b.box(2.0, 0.08, 0.8, '#6a7a5a', { y: 0.4 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.025, 0.025, 0.4, '#5a5a60', { x: sx * 0.9, y: 0.2, z: sz * 0.35, rz: sx * 0.3 }, 5);
  b.rbox(0.5, 0.12, 0.6, 0.05, '#f4ead8', { x: -0.7, y: 0.5 });
  b.rbox(1.3, 0.1, 0.78, 0.05, '#c4544a', { x: 0.3, y: 0.48 });
  b.box(1.3, 0.02, 0.1, '#e8c070', { x: 0.3, y: 0.54, z: 0.1 });
  // генератор рядом
  b.rbox(0.9, 0.6, 0.6, 0.06, '#e8b03a', { x: 1.9, y: 0.35 });
  b.box(0.92, 0.08, 0.62, '#3a3a40', { x: 1.9, y: 0.06 });
  b.cyl(0.12, 0.12, 0.05, '#3a3a40', { x: 1.75, y: 0.66 }, 12);
  b.box(0.3, 0.2, 0.02, '#3a3a40', { x: 2.1, y: 0.4, z: 0.305 });
  b.box(0.04, 0.4, 0.04, '#5a5a60', { x: 2.3, y: 0.85, z: -0.2 });
  return b;
}

// баррикада: доски крест-накрест, k — сколько досок видно (0..1)
export function makeBarricade(w, h) {
  const b = new B();
  const cols = ['#c4945a', '#d8a86a', '#b8844a', '#e0b07a'];
  const n = 5;
  for (let k = 0; k < n; k++) {
    const y = 0.35 + (k / (n - 1)) * (h - 0.6);
    b.box(w + 0.3, 0.16, 0.06, cols[k % 4], { y, rz: (k % 2 ? 1 : -1) * 0.08 });
    for (const sx of [-1, 1]) b.box(0.03, 0.03, 0.02, '#5a5a60', { x: sx * w * 0.42, y: y + 0.02, z: 0.04 });
  }
  b.box(0.16, h * 1.05, 0.06, '#a8744a', { y: h / 2, rz: 0.5, z: 0.04 });
  b.box(0.16, h * 1.05, 0.06, '#b88a5a', { y: h / 2, rz: -0.5, z: 0.06 });
  return b;
}

// ---------- машины и мусор на парковке ----------
// колесо: шина, диск с болтами снаружи (sx — сторона)
function wheel(b, x, y, z, r, sx) {
  b.cyl(r, r, 0.22, '#2e2e36', { x, y, z, rz: Math.PI / 2 }, 18);
  b.cyl(r * 0.8, r * 0.8, 0.225, '#3a3a42', { x, y, z, rz: Math.PI / 2 }, 18); // борт шины
  b.cyl(r * 0.56, r * 0.56, 0.03, '#c8ccd4', { x: x + sx * 0.105, y, z, rz: Math.PI / 2 }, 16);
  b.cyl(r * 0.2, r * 0.2, 0.03, '#8a9098', { x: x + sx * 0.122, y, z, rz: Math.PI / 2 }, 10);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    b.cyl(0.022, 0.022, 0.02, '#6a7078', { x: x + sx * 0.125, y: y + Math.sin(a) * r * 0.36, z: z + Math.cos(a) * r * 0.36, rz: Math.PI / 2 }, 6);
  }
}

// стеклянная кабина-трапеция со стойками и крышей
function cabin(b, W, y0, h, zc, lb, lt, zo, col, glass, wt = 0.42) {
  const wb = W;
  const wT = W - wt;
  b.frus(wb, lb, wT, lt, h, glass, { y: y0 + h / 2, z: zc }, zo);
  const y1 = y0 + h;
  const fb = zc + lb / 2,
    bb = zc - lb / 2,
    ft = zc + zo + lt / 2,
    bt = zc + zo - lt / 2;
  for (const sx of [-1, 1]) {
    b.beam([sx * wb / 2, y0, fb], [sx * wT / 2, y1, ft], 0.075, col); // передняя стойка
    b.beam([sx * wb / 2, y0, bb], [sx * wT / 2, y1, bt], 0.09, col); // задняя
    const zm = (fb + bb) / 2 - 0.05;
    const zmt = (ft + bt) / 2 - 0.05;
    b.beam([sx * wb / 2, y0, zm], [sx * wT / 2, y1, zmt], 0.07, col); // средняя
  }
  b.rbox(wT + 0.06, 0.08, lt + 0.08, 0.035, col, { y: y1 + 0.02, z: zc + zo });
  return y1 + 0.06;
}

export function makeCar(kind, col) {
  if (kind === 'trolley') return makeTrolley();
  if (kind === 'dumpster') return makeDumpster();
  if (kind === 'bins') return makeBins();
  if (kind === 'crates') return makeCrates();
  if (kind === 'vending') return makeVending();
  const b = new B();
  const glass = '#5a7a9a';
  const dark = shade(col, -0.25);
  const L = kind === 'van' ? 5.0 : kind === 'pickup' ? 5.2 : kind === 'hatch' ? 3.6 : 4.3;
  const W = kind === 'van' ? 2.1 : kind === 'pickup' ? 2.0 : 1.86;
  const R = 0.34; // радиус колеса
  const Y0 = 0.3; // низ кузова
  const BH = 0.62; // высота нижней части кузова
  const YT = Y0 + BH; // линия окон
  const wz = L / 2 - (kind === 'hatch' ? 0.62 : 0.82);
  // кузов: низ, днище, арки
  b.rbox(W, BH, L, 0.16, col, { y: Y0 + BH / 2 });
  b.box(W - 0.3, 0.12, L - 0.6, '#2a2a30', { y: Y0 - 0.02 });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.arch(R + 0.08, 0.05, '#1e1e24', { x: sx * (W / 2 - 0.015), y: R, z: sz * wz });
      wheel(b, sx * (W / 2 - 0.08), R, sz * wz, R, sx);
    }
    // молдинг, ручки и швы дверей
    b.box(0.02, 0.05, 2 * wz - 2 * (R + 0.14), dark, { x: sx * (W / 2 + 0.002), y: Y0 + 0.36 });
    b.rbox(0.03, 0.04, 0.16, 0.01, '#c8ccd4', { x: sx * (W / 2 + 0.01), y: Y0 + 0.48, z: 0.25 });
    b.box(0.012, BH - 0.2, 0.012, dark, { x: sx * (W / 2 + 0.003), y: Y0 + BH / 2 + 0.04, z: 0.55 });
    if (kind !== 'hatch') b.box(0.012, BH - 0.2, 0.012, dark, { x: sx * (W / 2 + 0.003), y: Y0 + BH / 2 + 0.04, z: -0.55 });
  }
  if (kind === 'van') {
    // высокий фургон: короб, кабина со стеклом, полоса, багажник
    const bl = L - 1.25;
    const bz = -L / 2 + bl / 2;
    b.rbox(W - 0.04, 1.05, bl, 0.14, col, { y: YT + 0.5, z: bz });
    const top = cabin(b, W - 0.06, YT - 0.02, 0.98, bz + bl / 2 + 0.38, 0.8, 0.12, -0.33, col, glass, 0.16);
    for (const sx of [-1, 1]) b.box(0.02, 0.2, bl - 0.3, '#e8705a', { x: sx * ((W - 0.04) / 2 + 0.005), y: YT + 0.35, z: bz });
    b.box(0.02, 0.62, 0.02, dark, { x: (W - 0.04) / 2 + 0.006, y: YT + 0.45, z: bz + 0.4 });
    for (const sx of [-1, 1]) b.beam([sx * 0.7, YT + 1.03, bz - 1.1], [sx * 0.7, YT + 1.03, bz + 1.1], 0.05, '#5a5a60');
    for (const z of [-0.8, 0, 0.8]) b.box(1.45, 0.04, 0.05, '#5a5a60', { y: YT + 1.07, z: bz + z });
    b.rbox(0.9, 0.3, 0.9, 0.06, '#7a8a5a', { y: YT + 1.25, z: bz - 0.4 });
    b.beam([-0.45, YT + 1.25, bz - 0.4], [0.45, YT + 1.25, bz - 0.4], 0.04, '#c4945a');
    void top;
  } else if (kind === 'pickup') {
    // кабина и открытый кузов с досками
    cabin(b, W - 0.1, YT - 0.02, 0.56, 0.55, 1.9, 1.1, -0.12, col, glass);
    const bz = -L / 2 + 1.1;
    b.box(W - 0.16, 0.02, 2.0, shade(col, -0.45), { y: YT + 0.01, z: bz });
    for (const sx of [-1, 1]) b.rbox(0.08, 0.38, 2.1, 0.03, col, { x: sx * (W / 2 - 0.04), y: YT + 0.17, z: bz });
    b.rbox(W, 0.38, 0.08, 0.03, col, { y: YT + 0.17, z: -L / 2 + 0.04 });
    b.rbox(W - 0.1, 0.38, 0.08, 0.03, col, { y: YT + 0.17, z: bz + 1.05 });
    for (let k = 0; k < 4; k++) b.rbox(0.18, 0.05, 1.6, 0.015, '#c4945a', { x: -0.5 + k * 0.33, y: YT + 0.05 + (k % 2) * 0.05, z: bz, ry: (k - 1.5) * 0.05 });
  } else {
    // легковые: кабина-трапеция
    const hatch = kind === 'hatch';
    const lb = hatch ? 2.3 : 2.35,
      lt = hatch ? 1.55 : 1.3;
    const zc = hatch ? -0.3 : -0.1;
    cabin(b, W - 0.14, YT - 0.02, 0.56, zc, lb, lt, hatch ? -0.3 : -0.08, col, glass);
    if (!hatch) {
      // багажник приоткрыт: тёмный проём и крышка на петлях
      const zh = -L / 2 + 0.98;
      b.box(W - 0.5, 0.02, 0.8, '#2a2a30', { y: YT + 0.005, z: zh - 0.45 });
      const a = 0.85;
      b.rbox(W - 0.42, 0.05, 0.92, 0.02, col, { y: YT + 0.03 + Math.sin(a) * 0.46, z: zh - Math.cos(a) * 0.46, rx: a });
    }
  }
  // фары, фонари, бамперы, номера, решётка
  for (const sx of [-1, 1]) {
    b.rbox(0.32, 0.15, 0.05, 0.04, '#fff4c8', { x: sx * (W / 2 - 0.38), y: Y0 + 0.42, z: L / 2 - 0.005 });
    b.rbox(0.26, 0.13, 0.05, 0.04, '#e84a4a', { x: sx * (W / 2 - 0.34), y: Y0 + 0.42, z: -L / 2 + 0.005 });
    // зеркала на ножке
    const mz = kind === 'van' ? L / 2 - 0.95 : kind === 'pickup' ? 1.35 : kind === 'hatch' ? 0.75 : 1.0;
    b.beam([sx * (W / 2 - 0.05), YT + 0.02, mz], [sx * (W / 2 + 0.1), YT + 0.08, mz], 0.035, dark);
    b.rbox(0.07, 0.12, 0.16, 0.03, dark, { x: sx * (W / 2 + 0.13), y: YT + 0.1, z: mz });
  }
  b.rbox(W - 0.06, 0.16, 0.14, 0.04, '#5a5a64', { y: Y0 + 0.12, z: L / 2 });
  b.rbox(W - 0.06, 0.16, 0.14, 0.04, '#5a5a64', { y: Y0 + 0.12, z: -L / 2 });
  b.box(0.42, 0.12, 0.02, '#f4f0e0', { y: Y0 + 0.13, z: L / 2 + 0.075 });
  b.box(0.42, 0.12, 0.02, '#f4f0e0', { y: Y0 + 0.13, z: -L / 2 - 0.075 });
  b.box(0.08, 0.1, 0.021, '#3a4a8a', { x: -0.16, y: Y0 + 0.13, z: -L / 2 - 0.076 });
  for (let k = 0; k < 3; k++) b.box(W * 0.36, 0.025, 0.02, '#3a3a40', { y: Y0 + 0.36 + k * 0.05, z: L / 2 + 0.005 });
  // ржавые потёки — плоские пятна на борту
  b.rbox(0.02, 0.12, 0.3, 0.008, '#b8744a', { x: W / 2 + 0.002, y: Y0 + 0.2, z: -L / 2 + 0.55 });
  b.rbox(0.02, 0.08, 0.18, 0.008, '#b8744a', { x: -W / 2 - 0.002, y: Y0 + 0.5, z: 0.9 });
  return b;
}

function makeTrolley() {
  const b = new B();
  const m = '#b8c0cc';
  // корзина из прутьев
  for (let k = 0; k < 6; k++) b.box(0.02, 0.5, 0.02, m, { x: -0.33, y: 0.75, z: -0.5 + k * 0.2 });
  for (let k = 0; k < 6; k++) b.box(0.02, 0.5, 0.02, m, { x: 0.33, y: 0.75, z: -0.5 + k * 0.2 });
  for (const y of [0.52, 0.75, 0.98]) {
    for (const sx of [-1, 1]) b.box(0.02, 0.02, 1.02, m, { x: sx * 0.33, y });
    b.box(0.68, 0.02, 0.02, m, { y, z: 0.5 });
    b.box(0.68, 0.02, 0.02, m, { y, z: -0.5 });
  }
  b.box(0.66, 0.02, 1.0, shade(m, -0.15), { y: 0.5 });
  b.cyl(0.03, 0.03, 0.72, '#e8504a', { y: 1.12, z: -0.62, rz: Math.PI / 2 }, 8);
  for (const sx of [-1, 1]) b.box(0.02, 0.24, 0.02, m, { x: sx * 0.33, y: 1.0, z: -0.56, rx: 0.4 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.box(0.02, 0.4, 0.02, '#8a929e', { x: sx * 0.3, y: 0.3, z: sz * 0.42 });
    b.cyl(0.07, 0.07, 0.04, '#2e2e36', { x: sx * 0.3, y: 0.07, z: sz * 0.42, rz: Math.PI / 2 }, 10);
  }
  // в корзине что-то лежит
  b.rbox(0.3, 0.2, 0.3, 0.04, '#d8b07a', { y: 0.62, z: 0.2 });
  b.sph(0.12, '#e8705a', { x: -0.1, y: 0.62, z: -0.2 });
  return b;
}

function makeDumpster() {
  const b = new B();
  const c = '#4a8a6a';
  b.rbox(2.2, 1.1, 1.25, 0.08, c, { y: 0.6 });
  b.box(2.26, 0.12, 1.3, shade(c, -0.2), { y: 1.15 });
  b.box(1.08, 0.06, 1.28, shade(c, -0.3), { x: -0.55, y: 1.25, rz: 0.06 });
  b.box(1.08, 0.06, 1.28, shade(c, -0.3), { x: 0.6, y: 1.45, rz: -0.45 }); // крышка приподнята
  for (const sx of [-1, 1]) b.cyl(0.1, 0.1, 0.08, '#2e2e36', { x: sx * 0.9, y: 0.1, z: 0.5, rz: Math.PI / 2 }, 10);
  b.box(0.5, 0.25, 0.02, '#f4f0e0', { y: 0.7, z: 0.63 });
  // мусор торчит
  b.rbox(0.4, 0.3, 0.3, 0.06, '#3a3a40', { x: 0.4, y: 1.25, z: 0.1 });
  b.box(0.5, 0.05, 0.3, '#d8b07a', { x: 0.3, y: 1.35, z: -0.2, rz: 0.4 });
  return b;
}

function makeBins() {
  const b = new B();
  const cols = ['#5a8ad0', '#6ac04a', '#e8b03a'];
  cols.forEach((c, k) => {
    const x = -0.65 + k * 0.65;
    b.cyl(0.26, 0.22, 0.7, c, { x, y: 0.35 }, 14);
    b.cyl(0.29, 0.29, 0.06, shade(c, -0.2), { x, y: 0.73 }, 14);
    b.box(0.12, 0.04, 0.04, shade(c, -0.3), { x, y: 0.78 });
  });
  b.rbox(0.36, 0.18, 0.3, 0.06, '#3a3a40', { x: 0.75, y: 0.09, z: 0.38 });
  return b;
}

function makeCrates() {
  const b = new B();
  const cr = (x, y, z, s, c) => {
    b.box(s, s, s, c, { x, y: y + s / 2, z });
    for (const k of [-1, 1]) b.box(s + 0.01, 0.06, 0.06, shade(c, -0.25), { x, y: y + s / 2 + k * (s / 2 - 0.05), z: z + s / 2 });
    b.box(0.06, s, 0.01, shade(c, -0.25), { x, y: y + s / 2, z: z + s / 2 + 0.005, rz: 0.78 });
  };
  b.box(1.8, 0.14, 1.4, '#a8844a', { y: 0.07 });
  cr(-0.45, 0.14, 0, 0.75, '#c4945a');
  cr(0.42, 0.14, -0.1, 0.7, '#d8a86a');
  cr(0, 0.86, -0.05, 0.6, '#b8844a');
  return b;
}

function makeVending() {
  const b = new B();
  b.rbox(1.0, 2.0, 0.85, 0.06, '#e84a4a', { y: 1.0 });
  b.box(0.62, 1.3, 0.02, '#a8d8f0', { x: -0.1, y: 1.2, z: 0.43 });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) b.cyl(0.05, 0.05, 0.16, ['#4a8ad8', '#f2c84a', '#6ac04a'][(i + j) % 3], { x: -0.3 + i * 0.2, y: 0.75 + j * 0.3, z: 0.38 }, 8);
  b.box(0.18, 0.5, 0.02, '#3a3a40', { x: 0.36, y: 1.3, z: 0.43 });
  b.box(0.5, 0.15, 0.04, '#3a3a40', { x: -0.1, y: 0.3, z: 0.43 });
  b.box(0.9, 0.2, 0.02, '#ffffff', { y: 1.9, z: 0.43 });
  return b;
}

export function makeLamp() {
  const b = new B();
  b.cyl(0.12, 0.15, 0.2, '#5a5a64', { y: 0.1 }, 10);
  b.cyl(0.06, 0.07, 4.2, '#6a7078', { y: 2.2 }, 10);
  b.box(0.08, 0.08, 1.0, '#6a7078', { y: 4.25, z: 0.45 });
  b.rbox(0.36, 0.14, 0.6, 0.05, '#4a4a54', { y: 4.2, z: 0.9 });
  return b;
}

export function makeTree(seed) {
  const r = rng(seed);
  const b = new B();
  b.cyl(0.14, 0.2, 1.6, '#8a5a3a', { y: 0.8 }, 10);
  const greens = ['#6ab05a', '#7ac06a', '#5aa05a', '#8ac870'];
  const n = 5 + ((r() * 3) | 0);
  for (let k = 0; k < n; k++) {
    const a = r() * 6.28,
      d = 0.3 + r() * 0.5;
    b.sph(0.6 + r() * 0.35, pickR(r, greens), { x: Math.cos(a) * d, y: 2.0 + r() * 0.9, z: Math.sin(a) * d });
  }
  b.sph(0.7, pickR(r, greens), { y: 2.9 });
  // осенние листики
  for (let k = 0; k < 4; k++) b.sph(0.2, '#e8a04a', { x: (r() - 0.5) * 1.6, y: 2.2 + r() * 0.8, z: (r() - 0.5) * 1.6 });
  return b;
}

export function makeBush(seed) {
  const r = rng(seed);
  const b = new B();
  for (let k = 0; k < 5; k++) b.sph(0.32 + r() * 0.15, pickR(r, ['#6ab05a', '#5aa05a', '#7ac06a']), { x: (r() - 0.5) * 0.8, y: 0.3 + r() * 0.15, z: (r() - 0.5) * 0.5 });
  for (let k = 0; k < 3; k++) b.sph(0.06, pickR(r, ['#ff9ab0', '#fff4a0', '#ffffff']), { x: (r() - 0.5) * 0.8, y: 0.55, z: 0.25 + r() * 0.1 });
  return b;
}

export function makeCone() {
  const b = new B();
  b.box(0.42, 0.05, 0.42, '#e86a2a', { y: 0.025 });
  b.cone(0.17, 0.6, '#ff8a3a', { y: 0.35 }, 12);
  b.cyl(0.115, 0.135, 0.09, '#fff4e8', { y: 0.32 }, 12);
  return b;
}

export function makeTire() {
  const b = new B();
  b.torus(0.32, 0.13, '#2e2e36', { y: 0.13, rx: Math.PI / 2 });
  b.torus(0.32, 0.13, '#34343c', { y: 0.36, rx: Math.PI / 2, x: 0.05 });
  return b;
}

export function makeBarrel() {
  const b = new B();
  b.cyl(0.32, 0.32, 0.9, '#4a7ab8', { y: 0.45 }, 14);
  for (const y of [0.2, 0.7]) b.cyl(0.335, 0.335, 0.05, '#3a5a8a', { y }, 14);
  b.cyl(0.05, 0.05, 0.03, '#2a2430', { x: 0.15, y: 0.91 }, 8);
  return b;
}

export function makeRadioTower(stage) {
  const b = new B();
  if (stage <= 0) return b;
  const h = 1.6 + stage * 1.3;
  const m = '#c84a3a',
    w = '#f4f0e0';
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) b.cyl(0.04, 0.05, h, '#8a929e', { x: sx * 0.35, y: h / 2, z: sz * 0.35 }, 6);
  const n = Math.floor(h / 0.65);
  for (let k = 0; k < n; k++) {
    const y = 0.3 + k * 0.65;
    const c = k % 2 ? m : w;
    for (const [x, z, ry] of [[0, -0.35, 0], [0, 0.35, 0], [-0.35, 0, Math.PI / 2], [0.35, 0, Math.PI / 2]]) b.box(0.72, 0.05, 0.05, c, { x, y, z, ry });
    b.box(0.95, 0.04, 0.04, '#8a929e', { y: y + 0.32, z: 0.35, rz: 0.7 });
  }
  if (stage >= 3) {
    b.cyl(0.5, 0.5, 0.08, '#d8dce4', { y: h * 0.7, z: 0.4, rx: 1.2 }, 16);
    b.cyl(0.04, 0.04, 0.3, '#8a929e', { y: h * 0.7, z: 0.55, rx: 1.2 }, 6);
  }
  if (stage >= 5) {
    b.cyl(0.02, 0.02, 1.2, '#8a929e', { y: h + 0.6 }, 6);
    b.sph(0.12, '#ff5a4a', { y: h + 1.2 });
  }
  return b;
}

// воздушный шарик-маркер (лут) — шар с бликом
export function makeSparkle() {
  const b = new B();
  b.sph(0.13, '#ffe27a');
  b.sph(0.05, '#ffffff', { x: 0.04, y: 0.05, z: 0.08 });
  return new THREE.Mesh(b.geometry(), MAT_GLOW);
}
