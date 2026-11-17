// Модели: повара-зверята и все предметы (продукты, тарелки, блюда, кастрюли, сковороды)
import * as THREE from 'three';
import { B, MAT } from './gfx.js';
import { CHEFS } from './data.js';

const INK = '#2b2b3a';
const WHITE = '#ffffff';

// ---------- повар ----------
export function makeChef(skinId, apron, opts = {}) {
  const S = CHEFS.find((c) => c.id === skinId) || CHEFS[0];
  const g = new THREE.Group();
  const darker = shade(S.body, -0.25);
  // ноги
  const legs = [-1, 1].map((sx) => {
    const b = new B();
    b.sph(0.1, S.ear === 'none' ? S.beak : darker, { y: 0.07, z: 0.03, sx: 1, sy: 0.75, sz: 1.3 });
    const m = b.mesh();
    m.position.x = sx * 0.13;
    g.add(m);
    return m;
  });
  // туловище с фартуком
  const body = new B();
  body.sph(0.3, S.body, { y: 0.42, sx: 1, sy: 1.08, sz: 0.95 });
  body.sph(0.25, S.belly, { y: 0.4, z: 0.07, sx: 0.95, sy: 1, sz: 0.85 });
  body.sph(0.27, apron, { y: 0.36, z: 0.1, sx: 0.98, sy: 0.85, sz: 0.78 });
  body.box(0.12, 0.05, 0.04, shade(apron, -0.15), { y: 0.36, z: 0.31 }); // карман
  body.torus(0.25, 0.025, apron, { y: 0.62, rx: Math.PI / 2 }); // завязка у шеи
  if (S.id === 'fox' || S.id === 'cat') {
    // хвостик
    body.sph(0.1, S.body, { y: 0.3, z: -0.3, sx: 0.8, sy: 0.8, sz: 1.5, rx: -0.6 });
    if (S.id === 'fox') body.sph(0.07, '#fff4ea', { y: 0.38, z: -0.42 });
  }
  if (S.id === 'bunny') body.sph(0.08, WHITE, { y: 0.32, z: -0.29 });
  const bodyM = body.mesh();
  g.add(bodyM);
  // голова
  const head = new THREE.Group();
  head.position.y = 0.92;
  const hb = new B();
  const isP = S.id === 'penguin';
  hb.sph(0.3, S.body, { sx: 1.05, sy: 0.95, sz: 0.97 });
  if (S.patch) {
    hb.sph(0.07, S.patch, { x: -0.11, y: 0.03, z: 0.23, sx: 1, sy: 1.25, sz: 0.6, rz: 0.4 });
    hb.sph(0.07, S.patch, { x: 0.11, y: 0.03, z: 0.23, sx: 1, sy: 1.25, sz: 0.6, rz: -0.4 });
  }
  if (isP) hb.sph(0.24, S.belly, { y: -0.04, z: 0.1, sx: 1, sy: 0.9, sz: 0.8 });
  // мордочка
  if (S.id !== 'frog' && !isP) hb.sph(0.12, S.belly, { y: -0.07, z: 0.23, sx: 1.2, sy: 0.85, sz: 0.8 });
  if (isP) hb.cone(0.06, 0.12, S.beak, { y: -0.04, z: 0.32, rx: Math.PI / 2 });
  else if (S.id !== 'frog') hb.sph(0.04, S.id === 'bunny' || S.id === 'cat' ? '#ff8fa3' : INK, { y: -0.03, z: 0.33, sx: 1.2, sy: 0.85, sz: 0.8 });
  // полоски котика на лбу
  if (S.id === 'cat') for (const x of [-0.06, 0, 0.06]) hb.sph(0.03, shade(S.body, -0.22), { x, y: 0.16, z: 0.25, sx: 0.6, sy: 1.5, sz: 0.5, rx: -0.5 });
  // глаза
  const ey = S.id === 'frog' ? 0.2 : 0.04;
  for (const sx of [-1, 1]) {
    if (S.id === 'frog') hb.sph(0.1, S.body, { x: sx * 0.13, y: 0.18, z: 0.12 });
    hb.sph(0.048, INK, { x: sx * 0.11, y: ey, z: S.id === 'frog' ? 0.2 : 0.26 });
    hb.sph(0.017, WHITE, { x: sx * 0.11 + 0.015, y: ey + 0.022, z: S.id === 'frog' ? 0.245 : 0.302 });
    // румянец
    hb.sph(0.05, '#ff9aa8', { x: sx * 0.19, y: -0.06, z: 0.21, sx: 1, sy: 0.6, sz: 0.5 });
  }
  // уши
  for (const sx of [-1, 1]) {
    const o = { x: sx * 0.19, y: 0.2 };
    switch (S.ear) {
      case 'cat':
      case 'fox':
        hb.cone(0.11, 0.2, S.body, { x: sx * 0.235, y: 0.2, rz: -sx * 0.6 }, 4);
        hb.cone(0.06, 0.11, S.inner, { x: sx * 0.235, y: 0.19, z: 0.045, rz: -sx * 0.6 }, 4);
        break;
      case 'dog':
        hb.sph(0.1, S.inner, { x: sx * 0.27, y: 0.02, sx: 0.6, sy: 1.5, sz: 0.9, rz: sx * 0.3 });
        break;
      case 'bunny':
        hb.sph(0.07, S.body, { x: sx * 0.11, y: 0.4, sx: 1, sy: 2.6, sz: 0.8, rz: -sx * 0.15 });
        hb.sph(0.04, S.inner, { x: sx * 0.11, y: 0.4, z: 0.04, sx: 1, sy: 2.4, sz: 0.6, rz: -sx * 0.15 });
        break;
      case 'bear':
      case 'panda':
        hb.sph(0.085, S.ear === 'panda' ? S.patch : S.body, { ...o, y: 0.22, sz: 0.7 });
        if (S.ear === 'bear') hb.sph(0.045, S.inner, { ...o, y: 0.22, z: 0.04, sz: 0.5 });
        break;
    }
  }
  const headM = hb.mesh();
  head.add(headM);
  // поварской колпак
  const hat = new B();
  const hy = S.ear === 'bunny' ? 0.17 : 0.2;
  hat.cyl(0.17, 0.17, 0.12, WHITE, { y: hy + 0.06 });
  hat.sph(0.12, WHITE, { y: hy + 0.2, x: -0.08 });
  hat.sph(0.12, WHITE, { y: hy + 0.2, x: 0.08 });
  hat.sph(0.13, WHITE, { y: hy + 0.25 });
  hat.sph(0.11, WHITE, { y: hy + 0.2, z: -0.07 });
  if (opts.hat !== false) {
    const hatM = hat.mesh();
    hatM.rotation.z = -0.12;
    head.add(hatM);
  } else if (opts.cap) {
    // гостю — панамка или шапочка
    const cb = new B();
    cb.hemi(0.27, opts.cap, { y: 0.17, sy: 0.75 });
    cb.cyl(0.36, 0.36, 0.025, opts.cap, { y: 0.17 }, 20);
    cb.sph(0.05, '#ffffff', { y: 0.39 });
    head.add(cb.mesh());
  }
  g.add(head);
  // лапки
  const hands = [-1, 1].map((sx) => {
    const b = new B();
    b.sph(0.085, S.body, {});
    b.sph(0.06, S.belly, { z: 0.04, sz: 0.6 });
    const m = b.mesh();
    m.position.set(sx * 0.31, 0.45, 0.06);
    g.add(m);
    return m;
  });
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { group: g, head, hands, legs, body: bodyM, skin: S.id };
}

// анимация повара: t — время, mv — скорость, hold — что-то в руках, work — режет/моет, act — взмах
export function animChef(ch, t, mv, hold, work, act) {
  const k = Math.min(1, mv / 3);
  const ph = t;
  const sw = Math.sin(ph) * 0.5 * k;
  ch.legs[0].position.z = sw * 0.25;
  ch.legs[1].position.z = -sw * 0.25;
  ch.legs[0].position.y = Math.max(0, Math.sin(ph)) * 0.05 * k;
  ch.legs[1].position.y = Math.max(0, -Math.sin(ph)) * 0.05 * k;
  const bob = Math.abs(Math.sin(ph)) * 0.04 * k;
  ch.body.position.y = bob;
  ch.head.position.y = 0.92 + bob + Math.sin(performance.now() / 600) * 0.008;
  ch.head.rotation.z = Math.sin(ph * 0.5) * 0.06 * k;
  if (work) {
    // режет или моет: лапки ходят вверх-вниз
    const w = performance.now() / 70;
    ch.hands[0].position.set(-0.2, 0.62 + Math.sin(w) * 0.08, 0.34);
    ch.hands[1].position.set(0.2, 0.62 + Math.sin(w + Math.PI) * 0.06, 0.34);
  } else if (hold) {
    ch.hands[0].position.set(-0.22, 0.58, 0.32);
    ch.hands[1].position.set(0.22, 0.58, 0.32);
  } else {
    ch.hands[0].position.set(-0.31, 0.45 + sw * 0.05, 0.06 - sw * 0.15);
    ch.hands[1].position.set(0.31, 0.45 - sw * 0.05, 0.06 + sw * 0.15);
  }
  if (act > 0) {
    ch.hands[0].position.z += act * 0.4;
    ch.hands[1].position.z += act * 0.4;
  }
}

export function shade(hex, k) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + k)));
  return '#' + c.getHexString();
}

// ---------- продукты ----------
// строят в сборщик b модель продукта с основанием в точке (0,0,0)
const BURNT = '#3a3330';
export function ingParts(b, id, st, o = {}) {
  const x = o.x || 0,
    y = o.y || 0,
    z = o.z || 0;
  const s = o.s || 1;
  const P = (dx, dy, dz) => ({ x: x + dx * s, y: y + dy * s, z: z + dz * s, s });
  if (st === 'burnt') {
    b.sph(0.13, BURNT, { ...P(0, 0.07, 0), sy: 0.55 });
    b.sph(0.06, '#555050', { ...P(0.05, 0.11, 0.03) });
    return b;
  }
  switch (id) {
    case 'tomato':
      if (st === 'raw') {
        b.sph(0.14, '#ff4f40', { ...P(0, 0.13, 0), sy: 0.85 });
        b.sph(0.04, '#ff8a7a', { ...P(-0.06, 0.18, 0.08) });
        for (let i = 0; i < 5; i++) b.sph(0.035, '#4caf3a', { ...P(Math.cos((i * Math.PI * 2) / 5) * 0.04, 0.245, Math.sin((i * Math.PI * 2) / 5) * 0.04), sy: 0.4, sx: 1.4 });
        b.cyl(0.012, 0.012, 0.05, '#3d8a2e', P(0, 0.27, 0));
      } else
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI * 2) / 3;
          b.cyl(0.075, 0.075, 0.035, '#ff4f40', { ...P(Math.cos(a) * 0.07, 0.02 + i * 0.01, Math.sin(a) * 0.07) });
          b.cyl(0.05, 0.05, 0.037, '#ff9a80', { ...P(Math.cos(a) * 0.07, 0.022 + i * 0.01, Math.sin(a) * 0.07) });
        }
      break;
    case 'onion':
      if (st === 'raw') {
        b.sph(0.13, '#e5b3ec', { ...P(0, 0.12, 0), sy: 0.9 });
        b.cone(0.05, 0.1, '#d696de', P(0, 0.26, 0));
        b.sph(0.03, '#f6e6c8', { ...P(0, 0.01, 0), sy: 0.5 });
      } else for (let i = 0; i < 3; i++) b.torus(0.055, 0.018, i % 2 ? '#f3dcf5' : '#e5b3ec', { ...P((i - 1) * 0.07, 0.02, (i % 2) * 0.05), rx: Math.PI / 2 });
      break;
    case 'mushroom':
      if (st === 'raw') {
        b.cyl(0.045, 0.055, 0.12, '#f6ead6', P(0, 0.06, 0));
        b.hemi(0.14, '#c8835a', { ...P(0, 0.1, 0), sy: 0.7 });
        b.sph(0.022, '#fff6e8', P(0.05, 0.18, 0.05));
        b.sph(0.018, '#fff6e8', P(-0.06, 0.17, 0.02));
      } else
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI * 2) / 3 + 0.4;
          b.hemi(0.07, '#c8835a', { ...P(Math.cos(a) * 0.07, 0.02, Math.sin(a) * 0.07), sy: 0.5 });
          b.cyl(0.025, 0.025, 0.05, '#f6ead6', P(Math.cos(a) * 0.07, 0.01, Math.sin(a) * 0.07));
        }
      break;
    case 'lettuce':
      if (st === 'raw') {
        b.sph(0.13, '#6fcf4a', { ...P(0, 0.12, 0), sy: 0.85 });
        b.sph(0.09, '#8be05e', { ...P(0.07, 0.15, 0.04) });
        b.sph(0.09, '#5cbf3c', { ...P(-0.07, 0.14, 0.03) });
        b.sph(0.08, '#a8ee7a', { ...P(0, 0.2, -0.03) });
      } else
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5;
          b.sph(0.06, i % 2 ? '#8be05e' : '#5cbf3c', { ...P(Math.cos(a) * 0.07, 0.025, Math.sin(a) * 0.07), sy: 0.35, sx: 1.3 });
        }
      break;
    case 'bun':
      b.cyl(0.13, 0.13, 0.05, '#e8a44e', P(0, 0.025, 0));
      b.hemi(0.14, '#f2b25c', { ...P(0, 0.06, 0), sy: 0.65 });
      for (let i = 0; i < 5; i++) b.sph(0.012, '#fff8e0', { ...P(Math.cos(i * 1.3) * 0.07, 0.14 - (i % 2) * 0.01, Math.sin(i * 1.3) * 0.07), sy: 0.5 });
      break;
    case 'meat':
      if (st === 'raw') {
        b.rbox(0.26, 0.09, 0.18, 0.04, '#f07a7a', P(0, 0.045, 0));
        b.box(0.2, 0.02, 0.03, '#fff0f0', { ...P(0, 0.09, 0.02), ry: 0.2 });
      } else if (st === 'chop') b.cyl(0.11, 0.11, 0.05, '#f59a9a', P(0, 0.025, 0));
      else {
        b.cyl(0.12, 0.12, 0.06, '#8a5232', P(0, 0.03, 0));
        b.cyl(0.1, 0.1, 0.062, '#a5683f', P(0, 0.031, 0));
      }
      break;
    case 'cheese':
      if (st === 'raw') {
        b.cyl(0.15, 0.15, 0.11, '#ffd34a', { ...P(0, 0.055, 0), ry: 0.5 }, 3);
        b.sph(0.025, '#f0b52a', P(0.03, 0.08, 0.06));
        b.sph(0.02, '#f0b52a', P(-0.05, 0.05, 0.02));
      } else b.box(0.19, 0.025, 0.19, '#ffd34a', { ...P(0, 0.013, 0), ry: 0.785 });
      break;
    case 'fish':
      if (st === 'raw') {
        b.sph(0.08, '#7fb8e8', { ...P(0, 0.08, 0), sx: 2.3, sy: 0.9 });
        b.sph(0.06, '#e8f3ff', { ...P(0.02, 0.06, 0), sx: 2, sy: 0.6, sz: 1.2 });
        b.cone(0.07, 0.1, '#5a9ad0', { ...P(-0.22, 0.08, 0), rz: Math.PI / 2, sz: 0.4 });
        b.sph(0.018, INK, P(0.13, 0.1, 0.055));
        b.sph(0.018, INK, P(0.13, 0.1, -0.055));
      } else if (st === 'chop')
        for (let i = 0; i < 2; i++) {
          b.rbox(0.13, 0.05, 0.08, 0.015, '#ff9a6a', P(i * 0.14 - 0.07, 0.025, 0));
          b.box(0.02, 0.052, 0.082, '#ffd8c0', P(i * 0.14 - 0.07, 0.026, 0));
        }
      else {
        b.rbox(0.26, 0.07, 0.12, 0.03, '#e8a64a', P(0, 0.035, 0));
        b.sph(0.03, '#f6c46a', P(0.05, 0.07, 0.02));
      }
      break;
    case 'potato':
      if (st === 'raw') {
        b.sph(0.12, '#c99a5e', { ...P(0, 0.09, 0), sy: 0.75, sx: 1.2 });
        b.sph(0.015, '#8a6436', P(0.06, 0.15, 0.05));
        b.sph(0.015, '#8a6436', P(-0.07, 0.12, 0.04));
      } else
        for (let i = 0; i < 6; i++) b.box(0.035, 0.035, 0.2, st === 'cook' ? '#ffcc4a' : '#f3e2a6', { ...P((i % 3) * 0.045 - 0.045, 0.02 + Math.floor(i / 3) * 0.035, 0), ry: (i - 2.5) * 0.12 });
      break;
    case 'rice':
      if (st === 'raw') {
        b.sph(0.12, '#efe6cc', { ...P(0, 0.11, 0), sy: 1.05 });
        b.cyl(0.05, 0.07, 0.06, '#efe6cc', P(0, 0.24, 0));
        b.torus(0.05, 0.012, '#b3854a', { ...P(0, 0.22, 0), rx: Math.PI / 2 });
        b.box(0.1, 0.06, 0.01, '#ffffff', P(0, 0.1, 0.12));
      } else b.hemi(0.13, '#ffffff', { ...P(0, 0, 0), sy: 0.7 });
      break;
    case 'nori':
      b.box(0.2, 0.015, 0.2, '#2f5a3a', P(0, 0.008, 0));
      b.box(0.18, 0.016, 0.02, '#3d7049', P(0, 0.009, 0.04));
      break;
  }
  return b;
}

// ---------- тарелка с содержимым ----------
const SOUP_COL = { tomato: '#ff5a3c', onion: '#f1d29a', mushroom: '#b07a52' };
export function plateParts(b, plate, dish) {
  b.cyl(0.24, 0.2, 0.04, '#ffffff', { y: 0.02 }, 24);
  b.torus(0.22, 0.02, '#e8eef8', { y: 0.04, rx: Math.PI / 2 });
  if (plate.dirty) {
    b.sph(0.07, '#a88a5a', { x: 0.06, y: 0.04, z: 0.03, sy: 0.15 });
    b.sph(0.05, '#9a7a4a', { x: -0.08, y: 0.04, z: -0.04, sy: 0.15 });
    return b;
  }
  if (plate.soup) {
    b.cyl(0.16, 0.11, 0.13, '#fdfbf6', { y: 0.1 }, 20);
    b.cyl(0.145, 0.145, 0.02, SOUP_COL[plate.soup], { y: 0.155 }, 20);
    b.sph(0.03, plate.soup === 'tomato' ? '#ffd0c0' : '#fff6e0', { x: 0.04, y: 0.165, z: 0.02, sy: 0.3 });
    b.sph(0.025, '#7bd65a', { x: -0.05, y: 0.165, z: -0.03, sy: 0.3 });
    return b;
  }
  const P = plate.parts;
  const has = (k) => P.includes(k);
  // готовые блюда — красиво
  if (dish === 'burger' || dish === 'burger_c' || dish === 'burger_d' || (has('bun:raw') && P.length > 1)) {
    let y = 0.045;
    b.cyl(0.13, 0.13, 0.05, '#e8a44e', { y: y + 0.025 });
    y += 0.05;
    if (has('meat:cook')) {
      b.cyl(0.135, 0.135, 0.06, '#8a5232', { y: y + 0.03 });
      y += 0.06;
    }
    if (has('cheese:chop')) {
      b.box(0.22, 0.02, 0.22, '#ffd34a', { y: y + 0.01, ry: 0.785 });
      y += 0.02;
    }
    if (has('lettuce:chop')) {
      b.cyl(0.155, 0.155, 0.02, '#6fcf4a', { y: y + 0.01 }, 9);
      y += 0.02;
    }
    if (has('tomato:chop')) {
      b.cyl(0.115, 0.115, 0.025, '#ff4f40', { y: y + 0.012 });
      y += 0.025;
    }
    b.hemi(0.14, '#f2b25c', { y, sy: 0.7 });
    for (let i = 0; i < 6; i++) b.sph(0.012, '#fff8e0', { x: Math.cos(i * 1.1) * 0.08, y: y + 0.07 + (i % 2) * 0.01, z: Math.sin(i * 1.1) * 0.08, sy: 0.5 });
    return b;
  }
  if (dish === 'sushi') {
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const o = { x: Math.cos(a) * 0.1, z: Math.sin(a) * 0.1 };
      b.cyl(0.065, 0.065, 0.08, '#2f5a3a', { ...o, y: 0.08 });
      b.cyl(0.052, 0.052, 0.082, '#ffffff', { ...o, y: 0.081 });
      b.cyl(0.024, 0.024, 0.084, '#ff8a5a', { ...o, y: 0.082 });
    }
    return b;
  }
  if (dish === 'onigiri') {
    b.cyl(0.13, 0.13, 0.09, '#ffffff', { y: 0.12, rx: Math.PI / 2, ry: Math.PI / 2 }, 3);
    b.box(0.09, 0.07, 0.1, '#2f5a3a', { y: 0.075, z: 0.0 });
    return b;
  }
  if (dish === 'fries' || dish === 'fishchips') {
    if (has('fish:cook')) {
      b.rbox(0.24, 0.06, 0.11, 0.03, '#e8a64a', { y: 0.075, x: -0.04, z: -0.06, ry: 0.3 });
    }
    b.box(0.13, 0.08, 0.09, '#ff5a4a', { y: 0.085, x: 0.06, z: 0.06 });
    for (let i = 0; i < 6; i++) b.box(0.025, 0.12, 0.025, '#ffcc4a', { x: 0.03 + (i % 3) * 0.03, y: 0.14 + (i % 2) * 0.015, z: 0.05 + Math.floor(i / 3) * 0.03, rz: (i - 2.5) * 0.08 });
    return b;
  }
  if (dish === 'salad' || (has('lettuce:chop') && !has('bun:raw'))) {
    b.cyl(0.17, 0.12, 0.1, '#e9f6ff', { y: 0.09 }, 20);
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05;
      b.sph(0.06, i % 2 ? '#8be05e' : '#5cbf3c', { x: Math.cos(a) * 0.07, y: 0.15, z: Math.sin(a) * 0.07, sy: 0.5, sx: 1.3 });
    }
    if (has('tomato:chop')) for (let i = 0; i < 3; i++) b.sph(0.035, '#ff4f40', { x: Math.cos(i * 2.1) * 0.06, y: 0.18, z: Math.sin(i * 2.1) * 0.06 });
    return b;
  }
  // собираемое: детали по кругу
  const n = P.length;
  P.forEach((p, i) => {
    const [id, st] = p.split(':');
    const a = (i / Math.max(1, n)) * Math.PI * 2;
    const r = n > 1 ? 0.09 : 0;
    ingParts(b, id, st, { x: Math.cos(a) * r, y: 0.04 + (n > 2 ? i * 0.01 : 0), z: Math.sin(a) * r, s: 0.75 });
  });
  return b;
}

// ---------- любой предмет ----------
export function itemMesh(it, dishFn) {
  const b = new B();
  switch (it.k) {
    case 'ing':
      ingParts(b, it.id, it.st);
      break;
    case 'plate':
      plateParts(b, it, dishFn ? dishFn(it) : null);
      break;
    case 'dirty':
      for (let i = 0; i < Math.min(it.n, 6); i++) {
        const pb = plateParts(new B(), { dirty: true, parts: [] });
        b.merge(pb, { y: i * 0.045, ry: i * 0.7 });
      }
      break;
    case 'pot': {
      const burnt = it.burnt;
      b.cyl(0.21, 0.19, 0.22, burnt ? '#4a4448' : '#9aa6b8', { y: 0.11 }, 20);
      b.torus(0.205, 0.02, '#c2ccd8', { y: 0.22, rx: Math.PI / 2 });
      b.box(0.08, 0.04, 0.05, '#4a4a58', { x: 0.25, y: 0.17 });
      b.box(0.08, 0.04, 0.05, '#4a4a58', { x: -0.25, y: 0.17 });
      if (it.n > 0) {
        const col = burnt ? '#2a2420' : it.kind === 'rice' ? (it.done ? '#ffffff' : '#efe6cc') : SOUP_COL[it.ing];
        const lv = it.kind === 'rice' ? 0.15 : 0.08 + (it.n / 3) * 0.1;
        b.cyl(0.185, 0.185, 0.02, col, { y: lv }, 20);
        if (burnt) for (let i = 0; i < 5; i++) b.sph(0.045, i % 2 ? '#141012' : '#3a2a22', { x: Math.cos(i * 1.3) * 0.1, y: lv + 0.015, z: Math.sin(i * 1.3) * 0.1, sy: 0.6 });
        if (it.kind === 'soup' && !burnt) for (let i = 0; i < it.n; i++) b.sph(0.035, shade(col, 0.12), { x: Math.cos(i * 2.1) * 0.08, y: lv + 0.01, z: Math.sin(i * 2.1) * 0.08, sy: 0.5 });
      }
      break;
    }
    case 'pan':
      b.cyl(0.2, 0.17, 0.05, '#3a3a46', { y: 0.025 }, 20);
      b.torus(0.195, 0.018, '#4c4c5a', { y: 0.05, rx: Math.PI / 2 });
      b.cyl(0.025, 0.025, 0.28, '#8a5a3a', { x: 0.32, y: 0.05, rz: Math.PI / 2 });
      if (it.item) ingParts(b, it.item.id, it.item.st, { y: 0.045 });
      break;
    case 'ext':
      b.cyl(0.09, 0.09, 0.4, '#ff4a3a', { y: 0.2 });
      b.sph(0.09, '#ff4a3a', { y: 0.4, sy: 0.6 });
      b.cyl(0.03, 0.03, 0.08, '#333', { y: 0.47 });
      b.box(0.12, 0.025, 0.04, '#333', { y: 0.5, x: 0.04 });
      b.cyl(0.015, 0.015, 0.2, '#222', { x: 0.1, y: 0.36, z: 0.04, rz: 0.4 });
      b.box(0.1, 0.12, 0.01, '#ffffff', { y: 0.22, z: 0.09 });
      break;
  }
  return b.mesh();
}
