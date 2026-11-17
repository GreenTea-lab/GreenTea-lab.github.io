// Модели: ребёнок в костюмах, призраки, мыши, скелеты, тыквоголовые, пауки, ведьмы, боссы, конфеты, фонари
import * as THREE from 'three';
import { B, MAT, MAT_GLOW } from './gfx.js';

export const INK = '#2a2238';
const WHITE = '#ffffff';
const SKIN = '#ffd9c0';
const BLUSH = '#ff9fb0';

export function shade(hex, k) {
  const c = new THREE.Color(hex);
  if (k < 0) c.lerp(new THREE.Color('#1a1028'), -k);
  else c.lerp(new THREE.Color('#ffffff'), k);
  return '#' + c.getHexString();
}

// глаза-бусинки с бликом
function eyes(b, x, y, z, r = 0.05, col = INK) {
  for (const sx of [-1, 1]) {
    b.sph(r, col, { x: sx * x, y, z, sx: 1, sy: 1.15, sz: 0.7 });
    b.sph(r * 0.36, WHITE, { x: sx * x + r * 0.3, y: y + r * 0.42, z: z + r * 0.55 });
  }
}

// ---------- ребёнок в костюме ----------
// части: legs[2], body, head, armL, armR, bucket (+ candy внутри), wings (для костюма летучей мыши)
export function makeKid(costume = 'pumpkin') {
  const g = new THREE.Group();
  const root = new THREE.Group();
  g.add(root);
  const C = {
    pumpkin: { body: '#ff8a2a', leg: '#3f7a3a', shoe: '#5a3a2a' },
    ghost: { body: '#f6f4ff', leg: '#7a86b8', shoe: '#4a4f7a' },
    witch: { body: '#7c4dc4', leg: '#2f2a3a', shoe: '#3a2440', stripe: '#ff9a3c' },
    cat: { body: '#3a3348', leg: '#3a3348', shoe: '#2a2236' },
    vampire: { body: '#2e2840', leg: '#2e2840', shoe: '#1c1828' },
    mummy: { body: '#efe6cf', leg: '#e2d6b8', shoe: '#b8a888' },
    skeleton: { body: '#2b2738', leg: '#2b2738', shoe: '#1c1828' },
    bat: { body: '#5b4a86', leg: '#3d3260', shoe: '#2a2246' },
  }[costume] || {};
  // ноги
  const legs = [-1, 1].map((sx) => {
    const b = new B();
    b.cyl(0.07, 0.065, 0.2, C.leg, { y: 0.14 });
    if (costume === 'witch') for (const y of [0.08, 0.16]) b.cyl(0.073, 0.073, 0.035, C.stripe, { y });
    if (costume === 'skeleton') b.box(0.03, 0.18, 0.02, '#f2efe6', { y: 0.14, z: 0.068 });
    if (costume === 'mummy') b.torus(0.07, 0.015, shade(C.leg, -0.1), { y: 0.12, rx: Math.PI / 2 });
    b.sph(0.09, C.shoe, { y: 0.05, z: 0.035, sx: 0.95, sy: 0.6, sz: 1.3 });
    const m = b.mesh();
    m.position.x = sx * 0.1;
    root.add(m);
    return m;
  });
  // туловище
  const body = new B();
  switch (costume) {
    case 'pumpkin':
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        body.sph(0.17, k % 2 ? '#ff8a2a' : '#f57a1c', { x: Math.sin(a) * 0.12, y: 0.42, z: Math.cos(a) * 0.12, sx: 0.8, sy: 1.15, sz: 0.8 });
      }
      body.sph(0.26, '#ff9333', { y: 0.42, sy: 0.95 });
      // рожица на животе
      body.cone(0.035, 0.05, '#7a3a10', { x: -0.07, y: 0.47, z: 0.25, rx: 1.4 }, 3);
      body.cone(0.035, 0.05, '#7a3a10', { x: 0.07, y: 0.47, z: 0.25, rx: 1.4 }, 3);
      body.box(0.14, 0.03, 0.02, '#7a3a10', { y: 0.38, z: 0.26 });
      break;
    case 'ghost':
      body.cone(0.33, 0.62, C.body, { y: 0.48 }, 18);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2;
        body.sph(0.08, C.body, { x: Math.sin(a) * 0.29, y: 0.2, z: Math.cos(a) * 0.29 });
      }
      break;
    case 'witch':
      body.cone(0.3, 0.55, C.body, { y: 0.47 }, 14);
      body.cyl(0.29, 0.31, 0.05, '#ff9a3c', { y: 0.22 }, 14);
      body.sph(0.035, '#ffd84a', { y: 0.5, z: 0.18 });
      body.box(0.06, 0.06, 0.02, '#ffd84a', { y: 0.38, z: 0.24, rz: 0.78 });
      // метла за спиной
      body.cyl(0.02, 0.02, 0.8, '#a8703a', { y: 0.5, z: -0.24, rx: 0.25, rz: 0.5 });
      body.cone(0.09, 0.22, '#e8c26a', { x: -0.27, y: 0.18, z: -0.33, rx: 0.25, rz: 0.5 + Math.PI }, 8);
      break;
    case 'cat':
      body.sph(0.24, C.body, { y: 0.43, sy: 1.05 });
      body.sph(0.16, '#5a5068', { y: 0.4, z: 0.12, sy: 1.2, sz: 0.7 });
      // хвост
      for (let k = 0; k < 6; k++) body.sph(0.05, C.body, { x: Math.sin(k * 0.5) * 0.08, y: 0.3 + k * 0.07, z: -0.24 - k * 0.05 });
      body.sph(0.06, '#ff9aa8', { y: 0.67, z: 0.17, sx: 1.4, sy: 0.4, sz: 0.5 });
      break;
    case 'vampire':
      body.sph(0.23, C.body, { y: 0.43, sy: 1.08 });
      body.box(0.1, 0.24, 0.05, '#f2efe6', { y: 0.47, z: 0.2 });
      body.box(0.1, 0.05, 0.04, '#c4243a', { y: 0.58, z: 0.23 });
      // плащ
      body.cone(0.34, 0.6, '#1c1828', { y: 0.44, z: -0.05, sz: 0.75 }, 14);
      body.cone(0.32, 0.58, '#c4243a', { y: 0.44, z: -0.03, sz: 0.7 }, 14);
      body.box(0.6, 0.18, 0.04, '#1c1828', { y: 0.7, z: -0.12, rx: -0.3 });
      break;
    case 'mummy':
      body.sph(0.24, C.body, { y: 0.43, sy: 1.08 });
      for (let k = 0; k < 6; k++) body.torus(0.22 - Math.abs(k - 2.5) * 0.02, 0.022, k % 2 ? '#e2d6b8' : '#f7f0de', { y: 0.27 + k * 0.06, rx: Math.PI / 2 + (k % 2 ? 0.15 : -0.12) });
      body.box(0.04, 0.2, 0.02, '#f7f0de', { x: 0.24, y: 0.28, z: 0.08, rz: 0.4 });
      break;
    case 'skeleton':
      body.sph(0.23, C.body, { y: 0.43, sy: 1.08 });
      for (let k = 0; k < 3; k++) body.box(0.26 - k * 0.04, 0.03, 0.02, '#f2efe6', { y: 0.52 - k * 0.07, z: 0.21 });
      body.box(0.03, 0.24, 0.02, '#f2efe6', { y: 0.45, z: 0.225 });
      body.box(0.16, 0.05, 0.02, '#f2efe6', { y: 0.29, z: 0.2 });
      break;
    case 'bat':
      body.sph(0.23, C.body, { y: 0.43, sy: 1.08 });
      body.sph(0.15, '#8a78b8', { y: 0.42, z: 0.12, sy: 1.2, sz: 0.7 });
      break;
  }
  const bodyM = body.mesh();
  root.add(bodyM);
  // руки
  const arms = [-1, 1].map((sx) => {
    const b = new B();
    const sleeve = costume === 'ghost' ? C.body : costume === 'pumpkin' ? '#3f7a3a' : costume === 'mummy' ? '#efe6cf' : C.body;
    b.sph(0.065, sleeve, { y: -0.08, sy: 1.6 });
    b.sph(0.055, costume === 'ghost' || costume === 'mummy' ? sleeve : costume === 'skeleton' ? '#f2efe6' : SKIN, { y: -0.2 });
    const m = b.mesh();
    m.position.set(sx * 0.25, 0.56, 0);
    m.rotation.z = sx * 0.25;
    root.add(m);
    return m;
  });
  // голова
  const head = new THREE.Group();
  head.position.y = 0.88;
  const hb = new B();
  const faceY = -0.02;
  if (costume === 'ghost') {
    hb.sph(0.3, C.body, { sy: 0.95 });
    hb.cone(0.36, 0.3, C.body, { y: -0.22 }, 18);
    // прорези для глаз
    for (const sx of [-1, 1]) {
      hb.sph(0.065, INK, { x: sx * 0.11, y: 0.02, z: 0.26, sx: 0.9, sy: 1.2, sz: 0.5 });
      hb.sph(0.022, WHITE, { x: sx * 0.11 + 0.02, y: 0.05, z: 0.3 });
    }
    hb.sph(0.04, INK, { y: -0.1, z: 0.27, sx: 1, sy: 0.8, sz: 0.5 });
  } else {
    hb.sph(0.28, SKIN, { sy: 0.95 });
    eyes(hb, 0.1, faceY, 0.24, 0.048);
    for (const sx of [-1, 1]) hb.sph(0.045, BLUSH, { x: sx * 0.17, y: faceY - 0.08, z: 0.21, sx: 1, sy: 0.6, sz: 0.5 });
    hb.sph(0.025, '#c46a5a', { y: faceY - 0.1, z: 0.26, sx: 1.3, sy: 0.6, sz: 0.5 });
  }
  switch (costume) {
    case 'pumpkin':
      // шапочка-тыква
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        hb.sph(0.15, k % 2 ? '#ff8a2a' : '#f57a1c', { x: Math.sin(a) * 0.12, y: 0.16, z: Math.cos(a) * 0.12 - 0.02, sx: 0.9, sy: 0.75, sz: 0.9 });
      }
      hb.sph(0.27, '#ff9333', { y: 0.17, z: -0.02, sy: 0.6 });
      hb.cyl(0.03, 0.04, 0.12, '#4a7a2a', { y: 0.38, rz: 0.2 });
      hb.sph(0.07, '#5fa83a', { x: 0.08, y: 0.36, sx: 1.4, sy: 0.4, sz: 0.9, rz: -0.4 });
      // волосы-чёлка
      hb.sph(0.08, '#8a5030', { x: -0.12, y: 0.12, z: 0.2, sx: 1.2, sy: 0.6, sz: 0.6 });
      break;
    case 'witch':
      hb.sph(0.29, '#ff9a3c', { y: 0.06, z: -0.05, sy: 0.85 });
      for (const sx of [-1, 1]) hb.sph(0.1, '#ff9a3c', { x: sx * 0.24, y: -0.12, z: -0.04, sy: 1.6 });
      hb.cyl(0.42, 0.42, 0.04, '#3a2458', { y: 0.18 }, 20);
      hb.cone(0.22, 0.5, '#4a2e72', { y: 0.44, rz: 0.12 }, 14);
      hb.cyl(0.215, 0.23, 0.06, '#ff9a3c', { y: 0.23 }, 14);
      hb.box(0.07, 0.07, 0.02, '#ffd84a', { y: 0.23, z: 0.22 });
      break;
    case 'cat':
      hb.sph(0.29, C.body, { y: 0.1, z: -0.05, sy: 0.8 });
      for (const sx of [-1, 1]) {
        hb.cone(0.1, 0.2, C.body, { x: sx * 0.17, y: 0.3, rz: -sx * 0.3 }, 4);
        hb.cone(0.055, 0.11, '#ff9aa8', { x: sx * 0.17, y: 0.29, z: 0.04, rz: -sx * 0.3 }, 4);
        // усы
        for (const dy of [-0.02, 0.02]) hb.box(0.14, 0.008, 0.008, INK, { x: sx * 0.22, y: faceY - 0.08 + dy, z: 0.2, rz: sx * dy * 4 });
      }
      hb.sph(0.03, '#ff7a8a', { y: faceY - 0.05, z: 0.27 });
      break;
    case 'vampire':
      hb.sph(0.29, '#2a2236', { y: 0.1, z: -0.05, sy: 0.75 });
      hb.cone(0.07, 0.12, '#2a2236', { y: 0.2, z: 0.22, rx: Math.PI + 0.5 }, 4);
      for (const sx of [-1, 1]) hb.cone(0.014, 0.05, WHITE, { x: sx * 0.035, y: faceY - 0.14, z: 0.25, rx: Math.PI }, 6);
      break;
    case 'mummy':
      for (let k = 0; k < 5; k++) hb.torus(0.26 - Math.abs(k - 2) * 0.04, 0.03, k % 2 ? '#e2d6b8' : '#f7f0de', { y: 0.14 - k * 0.07 + (k === 2 ? 0.2 : 0), rx: Math.PI / 2 + (k % 2 ? 0.2 : -0.15) });
      hb.sph(0.27, '#efe6cf', { y: 0.09, z: -0.03, sy: 0.75 });
      hb.box(0.4, 0.06, 0.05, '#f7f0de', { y: -0.13, z: 0.2, rz: 0.1 });
      break;
    case 'skeleton':
      hb.sph(0.285, '#f2efe6', { sy: 0.95, z: 0.005 });
      for (const sx of [-1, 1]) hb.sph(0.07, INK, { x: sx * 0.1, y: 0.0, z: 0.23, sx: 1, sy: 1.1, sz: 0.5 });
      for (const sx of [-1, 1]) hb.sph(0.024, WHITE, { x: sx * 0.1 + 0.02, y: 0.03, z: 0.27 });
      hb.cone(0.03, 0.05, INK, { y: -0.08, z: 0.26, rx: -1.2 }, 3);
      for (let k = -2; k <= 2; k++) hb.box(0.02, 0.05, 0.02, INK, { x: k * 0.035, y: -0.16, z: 0.24 });
      break;
    case 'bat':
      hb.sph(0.29, C.body, { y: 0.1, z: -0.05, sy: 0.78 });
      for (const sx of [-1, 1]) {
        hb.cone(0.08, 0.24, C.body, { x: sx * 0.15, y: 0.32, rz: -sx * 0.25 }, 5);
        hb.cone(0.04, 0.13, '#ff9aa8', { x: sx * 0.15, y: 0.3, z: 0.035, rz: -sx * 0.25 }, 5);
      }
      for (const sx of [-1, 1]) hb.cone(0.014, 0.05, WHITE, { x: sx * 0.035, y: faceY - 0.14, z: 0.25, rx: Math.PI }, 6);
      break;
  }
  const headM = hb.mesh();
  head.add(headM);
  root.add(head);
  // крылья для костюма мыши
  let wings = null;
  if (costume === 'bat') {
    wings = [-1, 1].map((sx) => {
      const b = new B();
      b.box(0.36, 0.26, 0.02, '#4a3a76', { x: sx * 0.18, y: 0.0 });
      for (let k = 0; k < 3; k++) b.sph(0.06, '#4a3a76', { x: sx * (0.08 + k * 0.12), y: -0.13, sz: 0.3 });
      b.cyl(0.015, 0.015, 0.38, '#2f2650', { x: sx * 0.18, y: 0.12, rz: Math.PI / 2 });
      const m = b.mesh();
      m.position.set(sx * 0.1, 0.55, -0.18);
      root.add(m);
      return m;
    });
  }
  // ведёрко-тыква с конфетами
  const bucket = new THREE.Group();
  const bb = new B();
  bb.cyl(0.13, 0.11, 0.18, '#ff8a2a', { y: 0.09 }, 14);
  bb.torus(0.13, 0.015, '#f07018', { y: 0.18, rx: Math.PI / 2 });
  bb.cone(0.025, 0.04, '#5a2a08', { x: -0.045, y: 0.12, z: 0.12, rx: 1.4 }, 3);
  bb.cone(0.025, 0.04, '#5a2a08', { x: 0.045, y: 0.12, z: 0.12, rx: 1.4 }, 3);
  bb.box(0.08, 0.018, 0.01, '#5a2a08', { y: 0.06, z: 0.125 });
  bb.torus(0.11, 0.01, INK, { y: 0.2, rx: 0, sy: 1.2 });
  bucket.add(bb.mesh());
  const fill = new B();
  const cc = ['#ff5a7a', '#7ad0ff', '#ffd84a', '#9be15d', '#c58bff'];
  for (let k = 0; k < 7; k++) fill.sph(0.05, cc[k % cc.length], { x: Math.sin(k * 2.4) * 0.06, y: (k % 3) * 0.02, z: Math.cos(k * 2.4) * 0.06 });
  const fillM = fill.mesh();
  fillM.position.y = 0.1;
  bucket.add(fillM);
  bucket.position.set(0.3, 0.2, 0.08);
  root.add(bucket);
  g.userData = { root, legs, body: bodyM, head, arms, bucket, fill: fillM, wings, costume };
  return g;
}

// анимация ребёнка: t — время, mv — 0..1 скорость, bag — 0..1 заполнение, dash
export function animKid(k, t, mv, bag, o = {}) {
  const U = k.userData;
  const ph = t * 13;
  const sw = Math.sin(ph) * 0.55 * mv;
  U.legs[0].rotation.x = sw;
  U.legs[1].rotation.x = -sw;
  U.arms[0].rotation.x = -sw * 0.8;
  U.arms[1].rotation.x = 0.3;
  U.root.position.y = Math.abs(Math.sin(ph)) * 0.06 * mv + (o.hurt ? Math.abs(Math.sin(t * 30)) * 0.05 : 0);
  U.root.rotation.z = Math.sin(ph) * 0.05 * mv;
  U.head.rotation.z = Math.sin(t * 2) * 0.05;
  U.head.rotation.x = o.dash ? 0.25 : 0;
  U.root.rotation.x = o.dash ? 0.3 : 0;
  U.bucket.rotation.z = Math.sin(ph) * 0.15 * mv;
  U.fill.visible = bag > 0.02;
  U.fill.position.y = 0.02 + Math.min(1, bag) * 0.12;
  U.fill.scale.setScalar(0.6 + Math.min(1, bag) * 0.5);
  if (U.wings) {
    const f = Math.sin(t * (mv > 0.1 ? 14 : 4)) * 0.5;
    U.wings[0].rotation.y = f;
    U.wings[1].rotation.y = -f;
  }
}

// ---------- призрак ----------
export function makeGhost(opts = {}) {
  const g = new THREE.Group();
  const b = new B();
  const c = WHITE;
  b.sph(0.42, c, { y: 0.95, sy: 1.0 });
  b.cyl(0.42, 0.5, 0.55, c, { y: 0.62 }, 20);
  // волнистый подол
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    b.sph(0.13, c, { x: Math.sin(a) * 0.42, y: 0.34, z: Math.cos(a) * 0.42, sy: 1.2 });
  }
  // ручки
  for (const sx of [-1, 1]) b.sph(0.11, c, { x: sx * 0.46, y: 0.78, z: 0.08, sx: 1.4, sy: 0.8, rz: sx * 0.5 });
  const bodyM = new THREE.Mesh(b.geometry(), new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: MAT.gradientMap, transparent: true, opacity: 0.93, color: opts.tint || '#ffffff' }));
  bodyM.castShadow = true;
  g.add(bodyM);
  const f = new B();
  eyes(f, 0.14, 1.0, 0.36, 0.075);
  for (const sx of [-1, 1]) f.sph(0.06, BLUSH, { x: sx * 0.24, y: 0.88, z: 0.32, sx: 1, sy: 0.6, sz: 0.5 });
  f.sph(0.05, '#6a3a5a', { y: 0.84, z: 0.39, sx: 1, sy: 1.2, sz: 0.5 });
  if (opts.party) {
    f.cone(0.13, 0.32, '#ff5a9a', { y: 1.5, z: -0.05, rz: 0.2 }, 10);
    f.sph(0.05, '#ffd84a', { x: -0.07, y: 1.67, z: -0.05 });
    f.cyl(0.13, 0.13, 0.03, '#ffd84a', { y: 1.36, z: -0.05, rz: 0.2 }, 10);
  }
  const face = f.mesh(MAT, false);
  g.add(face);
  // испуганная рожица (с фонарём)
  const s = new B();
  for (const sx of [-1, 1]) s.box(0.12, 0.035, 0.03, INK, { x: sx * 0.14, y: 1.02, z: 0.39, rz: sx * 0.35 });
  for (let k = 0; k < 5; k++) s.sph(0.025, INK, { x: -0.12 + k * 0.06, y: 0.85 + (k % 2) * 0.03, z: 0.4 });
  const scared = s.mesh(MAT, false);
  scared.visible = false;
  g.add(scared);
  g.userData = { body: bodyM, face, scared, mat: bodyM.material };
  return g;
}

// ---------- летучая мышь ----------
export function makeBat() {
  const g = new THREE.Group();
  const b = new B();
  b.sph(0.22, '#5b4a86', { sy: 1.05 });
  b.sph(0.14, '#8a78b8', { z: 0.1, sy: 0.9, sz: 0.6 });
  for (const sx of [-1, 1]) {
    b.cone(0.07, 0.18, '#5b4a86', { x: sx * 0.12, y: 0.22, rz: -sx * 0.3 }, 5);
    b.cone(0.035, 0.1, '#ff9aa8', { x: sx * 0.12, y: 0.2, z: 0.03, rz: -sx * 0.3 }, 5);
    b.cone(0.012, 0.045, WHITE, { x: sx * 0.04, y: -0.1, z: 0.19, rx: Math.PI }, 5);
  }
  eyes(b, 0.08, 0.04, 0.18, 0.045, '#ffe34a');
  const bm = b.mesh();
  g.add(bm);
  const wings = [-1, 1].map((sx) => {
    const w = new B();
    for (let k = 0; k < 3; k++) {
      w.box(0.2, 0.16 - k * 0.03, 0.02, '#4a3a76', { x: sx * (0.12 + k * 0.16), y: 0.02 - k * 0.02 });
      w.sph(0.07, '#4a3a76', { x: sx * (0.12 + k * 0.16), y: -0.07 - k * 0.02, sz: 0.3 });
    }
    w.cyl(0.014, 0.014, 0.5, '#2f2650', { x: sx * 0.25, y: 0.1, rz: Math.PI / 2 - sx * 0.1 });
    const m = w.mesh();
    m.position.x = sx * 0.12;
    g.add(m);
    return m;
  });
  g.userData = { wings, body: bm };
  return g;
}

// ---------- скелет ----------
export function makeSkel(scale = 1, crown = false) {
  const g = new THREE.Group();
  const root = new THREE.Group();
  g.add(root);
  const bone = '#f2efe6',
    dk = '#cfc8b6';
  const legs = [-1, 1].map((sx) => {
    const b = new B();
    b.cyl(0.035, 0.035, 0.32, bone, { y: 0.2 });
    b.sph(0.05, bone, { y: 0.36 });
    b.sph(0.07, dk, { y: 0.04, z: 0.04, sx: 1, sy: 0.6, sz: 1.4 });
    const m = b.mesh();
    m.position.x = sx * 0.1;
    root.add(m);
    return m;
  });
  const b = new B();
  b.cyl(0.03, 0.03, 0.42, bone, { y: 0.58 });
  for (let k = 0; k < 4; k++) b.torus(0.15 - k * 0.018, 0.022, bone, { y: 0.74 - k * 0.07, rx: Math.PI / 2, sx: 1, sy: 0.75 });
  b.sph(0.12, bone, { y: 0.42, sy: 0.5 });
  if (crown) {
    // плащ короля
    b.cone(0.38, 0.75, '#7a2a6a', { y: 0.55, z: -0.1, sz: 0.7 }, 14);
    b.torus(0.2, 0.05, '#ffd84a', { y: 0.86, rx: Math.PI / 2 });
  }
  root.add(b.mesh());
  const arms = [-1, 1].map((sx) => {
    const a = new B();
    a.cyl(0.03, 0.03, 0.3, bone, { y: -0.15 });
    a.sph(0.05, bone, { y: -0.31 });
    if (crown && sx > 0) {
      a.cyl(0.025, 0.025, 0.7, '#a8703a', { y: -0.25, z: 0.05 });
      a.sph(0.07, '#ff5a7a', { y: 0.12, z: 0.05 });
    }
    const m = a.mesh();
    m.position.set(sx * 0.2, 0.82, 0);
    m.rotation.z = sx * 0.3;
    root.add(m);
    return m;
  });
  const head = new THREE.Group();
  head.position.y = 1.08;
  const h = new B();
  h.sph(0.28, bone, { sy: 0.92 });
  h.box(0.26, 0.1, 0.2, bone, { y: -0.2, z: 0.06 });
  for (const sx of [-1, 1]) {
    h.sph(0.085, INK, { x: sx * 0.11, y: 0.0, z: 0.22, sx: 1, sy: 1.1, sz: 0.55 });
    h.sph(0.03, '#9be15d', { x: sx * 0.11, y: 0.01, z: 0.27 });
  }
  h.cone(0.035, 0.06, INK, { y: -0.1, z: 0.26, rx: -1.3 }, 3);
  for (let k = -2; k <= 2; k++) h.box(0.025, 0.06, 0.02, INK, { x: k * 0.045, y: -0.2, z: 0.165 });
  if (crown) {
    h.cyl(0.22, 0.2, 0.14, '#ffd84a', { y: 0.27 }, 10);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      h.cone(0.05, 0.12, '#ffd84a', { x: Math.sin(a) * 0.2, y: 0.39, z: Math.cos(a) * 0.2 }, 6);
    }
    h.sph(0.04, '#ff5a7a', { y: 0.28, z: 0.21 });
  }
  head.add(h.mesh());
  root.add(head);
  g.scale.setScalar(scale);
  g.userData = { root, legs, arms, head };
  return g;
}

// ---------- тыквоголовый ----------
export function makePumpkin(scale = 1, crown = false) {
  const g = new THREE.Group();
  const root = new THREE.Group();
  g.add(root);
  const b = new B();
  // ножки-лианы
  for (const sx of [-1, 1]) b.cyl(0.05, 0.06, 0.25, '#3f7a3a', { x: sx * 0.16, y: 0.12 });
  for (const sx of [-1, 1]) b.sph(0.08, '#2f5a2a', { x: sx * 0.16, y: 0.03, z: 0.05, sy: 0.6, sz: 1.3 });
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    b.sph(0.3, k % 2 ? '#ff8a2a' : '#f2761a', { x: Math.sin(a) * 0.22, y: 0.62, z: Math.cos(a) * 0.22, sx: 0.75, sy: 1.0, sz: 0.75 });
  }
  b.sph(0.46, '#ff9333', { y: 0.62, sy: 0.82 });
  b.cyl(0.06, 0.08, 0.2, '#5a7a2a', { y: 1.06, rz: 0.25 });
  b.sph(0.12, '#5fa83a', { x: 0.14, y: 1.02, sx: 1.4, sy: 0.35, sz: 0.9, rz: -0.4 });
  // завиток лианы
  b.torus(0.07, 0.015, '#5fa83a', { x: -0.12, y: 1.05, ry: 0.5 });
  if (crown) {
    b.cyl(0.3, 0.27, 0.16, '#ffd84a', { y: 1.12 }, 10);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      b.cone(0.06, 0.16, '#ffd84a', { x: Math.sin(a) * 0.27, y: 1.27, z: Math.cos(a) * 0.27 }, 6);
      b.sph(0.035, k % 2 ? '#7ad0ff' : '#ff5a7a', { x: Math.sin(a) * 0.29, y: 1.12, z: Math.cos(a) * 0.29 });
    }
  }
  root.add(b.mesh());
  // светящаяся вырезанная рожица (дружелюбная)
  const f = new B();
  for (const sx of [-1, 1]) f.cone(0.08, 0.11, '#ffd24a', { x: sx * 0.15, y: 0.72, z: 0.4, rx: Math.PI / 2 - 0.25, ry: 0 }, 3);
  f.cone(0.035, 0.05, '#ffd24a', { y: 0.62, z: 0.44, rx: Math.PI / 2 - 0.2 }, 3);
  // улыбка из нескольких зубчиков
  for (let k = -2; k <= 2; k++) f.box(0.07, 0.05 + (k % 2 ? 0 : 0.03), 0.04, '#ffb43a', { x: k * 0.07, y: 0.5 - Math.abs(k) * -0.012 + Math.abs(k) * 0.012, z: 0.42 - Math.abs(k) * 0.02, ry: -k * 0.15 });
  const face = f.mesh(MAT_GLOW, false);
  root.add(face);
  g.scale.setScalar(scale);
  g.userData = { root, face };
  return g;
}

// ---------- паук ----------
export function makeSpider() {
  const g = new THREE.Group();
  const body = new THREE.Group();
  const b = new B();
  b.sph(0.32, '#2e2640', { sy: 0.9 });
  b.sph(0.22, '#3a3052', { y: -0.04, z: 0.26, sy: 0.85 });
  // пушок
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    b.sph(0.07, '#3a3052', { x: Math.sin(a) * 0.3, y: 0.08, z: Math.cos(a) * 0.3 - 0.04 });
  }
  b.sph(0.09, '#ff5a9a', { y: 0.2, z: -0.18, sy: 0.5 });
  for (const sx of [-1, 1]) {
    b.sph(0.085, WHITE, { x: sx * 0.09, y: 0.04, z: 0.43 });
    b.sph(0.045, INK, { x: sx * 0.085, y: 0.02, z: 0.5 });
    b.sph(0.015, WHITE, { x: sx * 0.085 + 0.015, y: 0.04, z: 0.535 });
  }
  for (const sx of [-1, 1]) b.sph(0.04, BLUSH, { x: sx * 0.17, y: -0.06, z: 0.42, sz: 0.4 });
  // ножки
  for (const sx of [-1, 1])
    for (let k = 0; k < 4; k++) {
      const a = -0.6 + k * 0.42;
      b.cyl(0.025, 0.025, 0.42, '#2e2640', { x: sx * (0.3 + 0.12), y: 0.05, z: Math.sin(a) * 0.3, rz: sx * 1.0, ry: -sx * a });
      b.cyl(0.022, 0.02, 0.36, '#2e2640', { x: sx * 0.62, y: -0.15, z: Math.sin(a) * 0.42, rz: sx * 0.35, ry: -sx * a });
    }
  body.add(b.mesh());
  g.add(body);
  // нить
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 4), new THREE.MeshBasicMaterial({ color: '#d8d2ea', transparent: true, opacity: 0.7 }));
  g.add(thread);
  g.userData = { body, thread };
  return g;
}

// ---------- ведьма на метле ----------
export function makeWitch(scale = 1, queen = false) {
  const g = new THREE.Group();
  const root = new THREE.Group();
  g.add(root);
  const b = new B();
  const dress = queen ? '#3a1f5e' : '#6b3fa6';
  // метла
  b.cyl(0.035, 0.035, 1.5, '#a8703a', { rx: Math.PI / 2, y: 0.0 });
  b.cone(0.17, 0.42, '#e8c26a', { z: -0.86, rx: -Math.PI / 2 }, 10);
  b.torus(0.08, 0.02, '#8a5a2a', { z: -0.65 });
  // платье
  b.cone(0.3, 0.55, dress, { y: 0.28, z: -0.05 }, 12);
  b.cyl(0.29, 0.3, 0.05, '#9be15d', { y: 0.03, z: -0.05 }, 12);
  for (const sx of [-1, 1]) {
    b.cyl(0.05, 0.05, 0.25, '#2f2a3a', { x: sx * 0.12, y: 0.0, z: 0.12, rx: 1.2 });
    for (const y of [0.0]) b.cyl(0.055, 0.055, 0.05, '#ff9a3c', { x: sx * 0.12, y, z: 0.17, rx: 1.2 });
    b.sph(0.07, '#3a2440', { x: sx * 0.12, y: -0.08, z: 0.26, sz: 1.4 });
    b.sph(0.06, dress, { x: sx * 0.22, y: 0.42, z: 0.12, sy: 1.5, rx: 0.8 });
    b.sph(0.05, '#bde8a8', { x: sx * 0.12, y: 0.3, z: 0.3 });
  }
  // голова
  b.sph(0.25, '#bde8a8', { y: 0.78 });
  b.sph(0.27, queen ? '#e8e2f2' : '#ff7a3a', { y: 0.84, z: -0.06, sy: 0.85 });
  for (const sx of [-1, 1]) b.sph(0.09, queen ? '#e8e2f2' : '#ff7a3a', { x: sx * 0.21, y: 0.66, z: -0.06, sy: 1.8 });
  eyes(b, 0.09, 0.78, 0.22, 0.042);
  for (const sx of [-1, 1]) b.sph(0.04, BLUSH, { x: sx * 0.15, y: 0.71, z: 0.2, sz: 0.5 });
  b.sph(0.03, '#9bd088', { y: 0.74, z: 0.26, sz: 1.6 });
  b.cyl(0.42, 0.42, 0.04, '#2a1840', { y: 0.95 }, 20);
  b.cone(0.22, 0.55, queen ? '#2a1840' : '#3a2458', { y: 1.22, z: -0.04, rx: -0.25 }, 14);
  b.cyl(0.215, 0.23, 0.06, '#9be15d', { y: 1.0 }, 14);
  if (queen) {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      b.cone(0.05, 0.13, '#ffd84a', { x: Math.sin(a) * 0.24, y: 1.1, z: Math.cos(a) * 0.24 }, 6);
    }
    b.cone(0.5, 0.7, '#5a2a8a', { y: 0.35, z: -0.25, sz: 0.5, rx: -0.3 }, 14);
  }
  // котик на метле
  b.sph(0.12, '#2a2236', { z: -0.45, y: 0.12 });
  b.sph(0.1, '#2a2236', { z: -0.38, y: 0.27 });
  for (const sx of [-1, 1]) b.cone(0.04, 0.08, '#2a2236', { x: sx * 0.06, y: 0.37, z: -0.38 }, 4);
  for (const sx of [-1, 1]) b.sph(0.02, '#ffe34a', { x: sx * 0.04, y: 0.28, z: -0.29 });
  root.add(b.mesh());
  g.scale.setScalar(scale);
  g.userData = { root };
  return g;
}

// ---------- Большой Бу ----------
export function makeBigBoo() {
  const g = makeGhost({ tint: '#f3eeff' });
  const c = new B();
  c.cyl(0.26, 0.23, 0.18, '#ffd84a', { y: 1.42 }, 10);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    c.cone(0.06, 0.16, '#ffd84a', { x: Math.sin(a) * 0.24, y: 1.58, z: Math.cos(a) * 0.24 }, 6);
  }
  c.sph(0.045, '#ff5a7a', { y: 1.44, z: 0.25 });
  // язык
  c.sph(0.07, '#ff7a9a', { y: 0.8, z: 0.4, sx: 1, sy: 0.6, sz: 0.7 });
  g.add(c.mesh(MAT, false));
  g.scale.setScalar(2.1);
  return g;
}

// ---------- конфеты ----------
// фантик: центр + два хвостика (для InstancedMesh)
export function candyGeo() {
  const b = new B();
  b.sph(0.13, WHITE, { sx: 1.25, sy: 0.9, sz: 0.9 });
  b.cone(0.1, 0.13, WHITE, { x: 0.2, rz: Math.PI / 2 }, 6);
  b.cone(0.1, 0.13, WHITE, { x: -0.2, rz: -Math.PI / 2 }, 6);
  return b.geometry();
}
// леденец на палочке (стоит 5)
export function lollyGeo() {
  const b = new B();
  b.cyl(0.26, 0.26, 0.08, WHITE, { y: 0.45, rx: Math.PI / 2 }, 20);
  b.cyl(0.025, 0.025, 0.45, '#f2efe6', { y: 0.12 });
  return b.geometry();
}
export const CANDY_COL = ['#ff5a7a', '#7ad0ff', '#ffd84a', '#9be15d', '#c58bff', '#ff9a3c'];

// спираль для леденца
export function lollyTopMesh() {
  const b = new B();
  for (let k = 0; k < 14; k++) {
    const a = k * 0.9,
      r = 0.03 + k * 0.016;
    b.sph(0.035, k % 2 ? '#ffffff' : '#ff5a7a', { x: Math.cos(a) * r, y: 0.45 + Math.sin(a) * r, z: 0.045, sz: 0.4 });
  }
  return b.mesh(MAT, false);
}

// ---------- волшебный фонарь ----------
export function makeLantern() {
  const g = new THREE.Group();
  const b = new B();
  b.cyl(0.2, 0.24, 0.07, '#4a3a5e', { y: 0.05 }, 8);
  b.cyl(0.16, 0.2, 0.06, '#4a3a5e', { y: 0.62 }, 8);
  b.cone(0.18, 0.18, '#4a3a5e', { y: 0.74 }, 8);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    b.cyl(0.02, 0.02, 0.56, '#2f2640', { x: Math.sin(a) * 0.17, y: 0.34, z: Math.cos(a) * 0.17 });
  }
  b.torus(0.08, 0.018, '#2f2640', { y: 0.88 });
  g.add(b.mesh());
  const gl = new B();
  gl.sph(0.14, '#fff4b0', { y: 0.34, sy: 1.5 });
  const core = gl.mesh(MAT_GLOW, false);
  g.add(core);
  g.userData = { core };
  return g;
}

// кость (снаряд короля скелетов)
export function makeBone() {
  const b = new B();
  b.cyl(0.04, 0.04, 0.5, '#f2efe6', { rz: Math.PI / 2 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.sph(0.07, '#f2efe6', { x: sx * 0.26, z: sz * 0.05 });
  return b.mesh();
}

// котёл с конфетами
export function makeCauldron() {
  const g = new THREE.Group();
  const b = new B();
  b.sph(1.15, '#3a3150', { y: 1.0, sy: 0.85 });
  b.torus(1.0, 0.13, '#4e4468', { y: 1.72, rx: Math.PI / 2 });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    b.cyl(0.1, 0.07, 0.5, '#2a2238', { x: Math.sin(a) * 0.7, y: 0.2, z: Math.cos(a) * 0.7, rz: Math.sin(a) * 0.2, rx: -Math.cos(a) * 0.2 });
  }
  // полоски-заклёпки
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    b.sph(0.05, '#6a5e8a', { x: Math.sin(a) * 1.1, y: 1.35, z: Math.cos(a) * 1.1 });
  }
  for (const sx of [-1, 1]) b.torus(0.2, 0.04, '#4e4468', { x: sx * 1.12, y: 1.45, ry: Math.PI / 2 });
  // дрова под котлом
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    b.cyl(0.08, 0.08, 0.9, '#7a4a2a', { x: Math.sin(a) * 0.35, y: 0.1, z: Math.cos(a) * 0.35, rz: Math.PI / 2, ry: a });
  }
  g.add(b.mesh());
  // гора конфет внутри
  const c = new B();
  c.cyl(0.98, 0.98, 0.1, '#ff9ad0', { y: 1.66 }, 20);
  const cc = CANDY_COL;
  for (let k = 0; k < 26; k++) {
    const a = k * 2.4,
      r = 0.15 + ((k * 37) % 80) / 100;
    c.sph(0.12, cc[k % cc.length], { x: Math.cos(a) * r, y: 1.72 + ((k * 13) % 5) * 0.03, z: Math.sin(a) * r, sx: 1.3, sy: 0.8 });
  }
  const pile = c.mesh(MAT, false);
  g.add(pile);
  // огонь
  const f = new B();
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    f.cone(0.16, 0.45, k % 2 ? '#ffb43a' : '#ff7a2a', { x: Math.sin(a) * 0.25, y: 0.35, z: Math.cos(a) * 0.25 }, 6);
  }
  f.cone(0.2, 0.55, '#ffe07a', { y: 0.38 }, 6);
  const fire = f.mesh(MAT_GLOW, false);
  g.add(fire);
  g.userData = { pile, fire };
  return g;
}
