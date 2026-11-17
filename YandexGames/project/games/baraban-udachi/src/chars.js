// 3D-персонажи: люди, звери, пришельцы, робот. Всё собирается из примитивов (без внешних моделей).
// Скелет: ноги, торс, руки на плечевых шарнирах, голова на шее. Анимации — позы, которые плавно смешиваются.
import * as THREE from 'three';

// ---------- общие геометрии и материалы ----------
const SPH = new THREE.SphereGeometry(1, 22, 16);
const cache = new Map();
const geo = (k, f) => cache.get(k) || (cache.set(k, f()), cache.get(k));
const caps = (r, l) => geo(`c${r}_${l}`, () => new THREE.CapsuleGeometry(r, l, 6, 16));
const cone = (r, h, s = 20) => geo(`k${r}_${h}_${s}`, () => new THREE.ConeGeometry(r, h, s));
const cyl = (a, b, h, s = 24) => geo(`y${a}_${b}_${h}_${s}`, () => new THREE.CylinderGeometry(a, b, h, s));
const tor = (r, t, arc = Math.PI * 2) => geo(`t${r}_${t}_${arc}`, () => new THREE.TorusGeometry(r, t, 12, 32, arc));
const box = (x, y, z) => geo(`b${x}_${y}_${z}`, () => new THREE.BoxGeometry(x, y, z));
const cap = (r, th) => geo(`h${r}_${th}`, () => new THREE.SphereGeometry(r, 28, 16, 0, Math.PI * 2, 0, th));
const mats = new Map();
export function mat(c, o = {}) {
  const k = `${c}|${o.r ?? 0.62}|${o.m ?? 0}|${o.e || ''}|${o.ei ?? 1}`;
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.62, metalness: o.m ?? 0, emissive: o.e || 0x000000, emissiveIntensity: o.ei ?? 1 }));
  return mats.get(k);
}
const BLACK = () => mat('#15121c', { r: 0.25 });
const WHITE = () => mat('#ffffff', { r: 0.3 });
function add(p, g, m, pos, sc, rot) {
  const o = new THREE.Mesh(g, m);
  if (pos) o.position.set(pos[0], pos[1], pos[2]);
  if (sc !== undefined) typeof sc === 'number' ? o.scale.setScalar(sc) : o.scale.set(sc[0], sc[1], sc[2]);
  if (rot) o.rotation.set(rot[0], rot[1], rot[2]);
  o.castShadow = true;
  p.add(o);
  return o;
}
// точка на передней поверхности сферы радиуса R
const onS = (R, x, y, out = 0) => [x, y, Math.sqrt(Math.max(0, R * R - x * x - y * y)) + out];
const shade = (hex, k) => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return '#' + c.getHexString();
};

// ---------- глаза, рот, брови ----------
function eye(face, R, x, y, o = {}) {
  const g = new THREE.Group();
  const p = onS(R, x, y, -0.02);
  g.position.set(p[0], p[1], p[2]);
  g.lookAt(new THREE.Vector3(p[0] * 2.2, p[1] * 1.6, p[2] * 3));
  const s = o.s || 1;
  if (o.black) {
    add(g, SPH, mat('#0c0a14', { r: 0.12 }), [0, 0, 0.01], [0.085 * s * (o.w || 1), 0.11 * s * (o.h || 1), 0.05 * s], o.tilt ? [0, 0, o.tilt] : null);
    add(g, SPH, WHITE(), [0.025 * s, 0.035 * s, 0.05 * s], 0.018 * s);
  } else {
    add(g, SPH, WHITE(), [0, 0, 0], [0.078 * s, 0.088 * s, 0.05 * s]);
    if (o.iris) add(g, SPH, mat(o.iris, { r: 0.3 }), [0, -0.004, 0.034 * s], [0.052 * s, 0.056 * s, 0.024 * s]);
    add(g, SPH, mat('#1a1420', { r: 0.2 }), [0, -0.006 * s, 0.042 * s], [0.042 * s, 0.047 * s, 0.022 * s]);
    add(g, SPH, WHITE(), [0.016 * s, 0.018 * s, 0.06 * s], 0.014 * s);
  }
  face.add(g);
  return g;
}
function mouthM(face, R, y, w = 1, col = '#5a1822') {
  const p = onS(R, 0, y, -0.012);
  const m = add(face, SPH, mat(col, { r: 0.5 }), p, [0.062 * w, 0.02, 0.03]);
  m.userData.base = 0.02;
  return m;
}
function brows(face, R, y, col, sp = 0.13) {
  for (const s of [1, -1]) add(face, box(0.1, 0.022, 0.03), mat(col), onS(R, sp * s, y, -0.004), 1, [-0.25, 0, 0.06 * s]);
}
function cheeks(face, R, col = '#ff9a9a', y = -0.1, x = 0.2) {
  for (const s of [1, -1]) add(face, SPH, mat(col, { r: 0.8 }), onS(R, x * s, y, -0.03), [0.06, 0.04, 0.03]);
}
function whiskers(face, R, y) {
  const m = mat('#3a3040');
  for (const s of [1, -1]) for (const k of [-1, 1]) add(face, box(0.17, 0.006, 0.006), m, [0.2 * s, y + k * 0.025, R * 0.82], 1, [0, 0.35 * s, k * 0.14 * s]);
}

// ---------- головы по видам ----------
const HEADS = {
  human(f, d, R, fur, out) {
    add(f, SPH, fur, [0, 0, 0], R);
    for (const s of [1, -1]) add(f, SPH, fur, [R * 0.96 * s, -0.02, -0.02], [0.05, 0.08, 0.045]);
    add(f, SPH, mat(shade(d.skin, 0.93)), onS(R, 0, -0.04, 0.005), [0.042, 0.04, 0.038]);
    out.eyes = [eye(f, R, -0.125, 0.04, { s: 0.92, iris: d.iris || '#6b4a2e' }), eye(f, R, 0.125, 0.04, { s: 0.92, iris: d.iris || '#6b4a2e' })];
    brows(f, R, 0.15, shade(d.hair || '#4a3426', 0.85));
    cheeks(f, R, '#ffa79a');
    out.mouth = mouthM(f, R, -0.15, 0.9);
    hair(f, d, R);
    if (d.mus) add(f, caps(0.03, 0.12), mat(d.hair), onS(R, 0, -0.1, 0.01), 1, [0, 0, Math.PI / 2]);
    if (d.beard) add(f, SPH, mat(d.hair, { r: 0.9 }), [0, -0.2, 0.12], [0.24, 0.2, 0.22]);
  },
  cat(f, d, R, fur, out) {
    add(f, SPH, fur, [0, 0, 0], [R * 1.06, R * 0.96, R]);
    for (const s of [1, -1]) {
      add(f, cone(0.12, 0.24, 4), fur, [0.2 * s, 0.33, -0.02], 1, [0, Math.PI / 4, -0.38 * s]);
      add(f, cone(0.07, 0.15, 4), mat('#ffb3c1'), [0.19 * s, 0.32, 0.04], 1, [0, Math.PI / 4, -0.38 * s]);
      add(f, SPH, mat(d.skin2 || '#fff'), onS(R, 0.055 * s, -0.09, -0.04), [0.08, 0.065, 0.06]);
    }
    add(f, SPH, mat('#ff8fa3', { r: 0.4 }), onS(R, 0, -0.04, 0.02), [0.035, 0.026, 0.03]);
    whiskers(f, R, -0.09);
    out.eyes = [eye(f, R, -0.13, 0.06, { iris: d.iris || '#7fc243' }), eye(f, R, 0.13, 0.06, { iris: d.iris || '#7fc243' })];
    out.mouth = mouthM(f, R, -0.16, 0.7);
  },
  dog(f, d, R, fur, out) {
    add(f, SPH, fur, [0, 0, 0], R);
    for (const s of [1, -1]) add(f, SPH, mat(d.ear || shade(d.skin, 0.7)), [0.33 * s, 0.02, -0.02], [0.08, 0.2, 0.13], [0, 0, 0.25 * s]);
    add(f, SPH, mat(d.skin2 || shade(d.skin, 1.15)), [0, -0.1, 0.27], [0.16, 0.12, 0.13]);
    add(f, SPH, BLACK(), [0, -0.05, 0.4], [0.055, 0.04, 0.04]);
    out.eyes = [eye(f, R, -0.12, 0.08), eye(f, R, 0.12, 0.08)];
    brows(f, R, 0.19, shade(d.skin, 0.6));
    out.mouth = add(f, SPH, mat('#5a1822'), [0, -0.17, 0.36], [0.05, 0.015, 0.03]);
    out.mouth.userData.base = 0.015;
  },
  bear(f, d, R, fur, out) {
    add(f, SPH, fur, [0, 0, 0], R);
    const earC = mat(d.ear || d.skin);
    for (const s of [1, -1]) {
      add(f, SPH, earC, [0.25 * s, 0.27, -0.02], [0.11, 0.11, 0.07]);
      add(f, SPH, mat(d.skin2 || shade(d.skin, 1.3)), [0.25 * s, 0.27, 0.03], [0.06, 0.06, 0.04]);
    }
    if (d.patch) for (const s of [1, -1]) add(f, SPH, mat(d.patch), onS(R, 0.13 * s, 0.03, -0.03), [0.085, 0.11, 0.05], [0, 0, 0.5 * s]);
    add(f, SPH, mat(d.skin2 || shade(d.skin, 1.3)), [0, -0.1, 0.28], [0.15, 0.11, 0.11]);
    add(f, SPH, BLACK(), [0, -0.055, 0.385], [0.05, 0.035, 0.035]);
    out.eyes = [eye(f, R, -0.13, 0.05, { s: d.patch ? 0.8 : 0.9 }), eye(f, R, 0.13, 0.05, { s: d.patch ? 0.8 : 0.9 })];
    out.mouth = add(f, SPH, mat('#5a1822'), [0, -0.165, 0.37], [0.045, 0.014, 0.03]);
    out.mouth.userData.base = 0.014;
  },
  fox(f, d, R, fur, out) {
    add(f, SPH, fur, [0, 0, 0], [R * 1.05, R * 0.95, R]);
    for (const s of [1, -1]) {
      add(f, cone(0.13, 0.3, 4), fur, [0.2 * s, 0.36, -0.03], 1, [0, Math.PI / 4, -0.3 * s]);
      add(f, cone(0.07, 0.18, 4), mat('#fff3e6'), [0.19 * s, 0.33, 0.03], 1, [0, Math.PI / 4, -0.3 * s]);
      add(f, SPH, mat('#fff8ee'), onS(R, 0.13 * s, -0.13, -0.05), [0.12, 0.09, 0.08]);
    }
    add(f, cone(0.12, 0.26, 20), fur, [0, -0.1, 0.4], 1, [Math.PI / 2, 0, 0]);
    add(f, SPH, mat('#fff8ee'), [0, -0.14, 0.38], [0.08, 0.05, 0.1]);
    add(f, SPH, BLACK(), [0, -0.085, 0.53], 0.035);
    out.eyes = [eye(f, R, -0.13, 0.07, { iris: '#b8761a' }), eye(f, R, 0.13, 0.07, { iris: '#b8761a' })];
    out.mouth = add(f, SPH, mat('#5a1822'), [0, -0.18, 0.4], [0.04, 0.012, 0.03]);
    out.mouth.userData.base = 0.012;
  },
  rabbit(f, d, R, fur, out) {
    add(f, SPH, fur, [0, 0, 0], R);
    for (const s of [1, -1]) {
      add(f, caps(0.075, 0.32), fur, [0.11 * s, 0.5, -0.03], 1, [0, 0, -0.14 * s]);
      add(f, caps(0.04, 0.26), mat('#ffb3c1'), [0.112 * s, 0.5, 0.025], [1, 1, 0.5], [0, 0, -0.14 * s]);
      add(f, SPH, mat(d.skin2 || '#fff'), onS(R, 0.055 * s, -0.09, -0.04), [0.075, 0.06, 0.06]);
    }
    add(f, SPH, mat('#ff8fa3'), onS(R, 0, -0.04, 0.02), [0.032, 0.025, 0.03]);
    add(f, box(0.06, 0.05, 0.02), WHITE(), onS(R, 0, -0.17, 0.015));
    whiskers(f, R, -0.09);
    out.eyes = [eye(f, R, -0.13, 0.07), eye(f, R, 0.13, 0.07)];
    out.mouth = mouthM(f, R, -0.14, 0.6);
  },
  pig(f, d, R, fur, out) {
    add(f, SPH, fur, [0, 0, 0], [R * 1.05, R, R]);
    for (const s of [1, -1]) add(f, cone(0.1, 0.18, 4), fur, [0.22 * s, 0.3, 0.04], 1, [0.7, Math.PI / 4, -0.3 * s]);
    add(f, cyl(0.11, 0.11, 0.1), mat(shade(d.skin, 1.08)), [0, -0.07, 0.37], 1, [Math.PI / 2, 0, 0]);
    for (const s of [1, -1]) add(f, SPH, mat('#8a3a4a'), [0.035 * s, -0.07, 0.42], [0.022, 0.03, 0.01]);
    out.eyes = [eye(f, R, -0.14, 0.09, { s: 0.85 }), eye(f, R, 0.14, 0.09, { s: 0.85 })];
    cheeks(f, R, '#ff7f9a', -0.08, 0.22);
    out.mouth = mouthM(f, R, -0.2, 0.7);
  },
  frog(f, d, R, fur, out) {
    add(f, SPH, fur, [0, -0.03, 0], [R * 1.18, R * 0.82, R]);
    for (const s of [1, -1]) {
      add(f, SPH, fur, [0.16 * s, 0.2, 0.14], 0.13);
      const e = eye(f, 0.0, 0, 0);
      e.position.set(0.16 * s, 0.24, 0.24);
      e.lookAt(0.16 * s * 2, 0.3, 3);
      e.scale.setScalar(1.25);
      (out.eyes = out.eyes || []).push(e);
    }
    add(f, SPH, mat(d.skin2 || '#d9f2a0'), [0, -0.14, 0.18], [0.3, 0.12, 0.2]);
    cheeks(f, R, '#ff9a9a', -0.06, 0.26);
    const m = add(f, SPH, mat('#5a1822'), [0, -0.1, 0.355], [0.15, 0.014, 0.03]);
    m.userData.base = 0.014;
    out.mouth = m;
  },
  owl(f, d, R, fur, out) {
    add(f, SPH, fur, [0, 0, 0], R);
    for (const s of [1, -1]) {
      add(f, cone(0.07, 0.18, 4), fur, [0.2 * s, 0.33, 0], 1, [0, 0, -0.3 * s]);
      add(f, SPH, mat(d.skin2 || '#f2e2c4'), onS(R, 0.13 * s, 0.03, -0.06), [0.14, 0.14, 0.08]);
    }
    out.eyes = [eye(f, R, -0.13, 0.03, { s: 1.25, iris: '#f2b01e' }), eye(f, R, 0.13, 0.03, { s: 1.25, iris: '#f2b01e' })];
    add(f, cone(0.05, 0.13, 12), mat('#e8a02a'), [0, -0.08, 0.36], 1, [Math.PI / 2 + 0.5, 0, 0]);
    out.mouth = add(f, SPH, mat('#5a1822'), [0, -0.17, 0.33], [0.035, 0.01, 0.02]);
    out.mouth.userData.base = 0.01;
  },
  penguin(f, d, R, fur, out) {
    add(f, SPH, fur, [0, 0, 0], R);
    add(f, SPH, mat('#ffffff'), [0, -0.03, 0.12], [0.29, 0.27, 0.26]);
    out.eyes = [eye(f, R, -0.12, 0.06), eye(f, R, 0.12, 0.06)];
    add(f, cone(0.06, 0.16, 12), mat('#f2a02a'), [0, -0.06, 0.4], 1, [Math.PI / 2, 0, 0]);
    cheeks(f, R, '#ffb0c0', -0.08, 0.19);
    out.mouth = add(f, SPH, mat('#5a1822'), [0, -0.15, 0.35], [0.04, 0.012, 0.02]);
    out.mouth.userData.base = 0.012;
  },
  mouse(f, d, R, fur, out) {
    add(f, SPH, fur, [0, 0, 0], R);
    for (const s of [1, -1]) {
      add(f, SPH, fur, [0.3 * s, 0.28, -0.04], [0.18, 0.18, 0.04]);
      add(f, SPH, mat('#ffb3c1'), [0.3 * s, 0.28, -0.01], [0.12, 0.12, 0.03]);
    }
    add(f, SPH, fur, [0, -0.08, 0.3], [0.12, 0.09, 0.1]);
    add(f, SPH, mat('#ff7f9a'), [0, -0.06, 0.4], 0.035);
    whiskers(f, R, -0.08);
    out.eyes = [eye(f, R, -0.12, 0.06, { black: 1, s: 0.8 }), eye(f, R, 0.12, 0.06, { black: 1, s: 0.8 })];
    cheeks(f, R, '#ffa0b4', -0.1, 0.2);
    out.mouth = add(f, SPH, mat('#5a1822'), [0, -0.15, 0.37], [0.035, 0.01, 0.02]);
    out.mouth.userData.base = 0.01;
  },
  lion(f, d, R, fur, out) {
    const mane = mat(d.mane || '#b5561c', { r: 0.9 });
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      add(f, SPH, mane, [Math.cos(a) * 0.36, Math.sin(a) * 0.36 + 0.02, -0.08], 0.15);
    }
    add(f, SPH, fur, [0, 0, 0], R * 0.95);
    for (const s of [1, -1]) add(f, SPH, fur, [0.25 * s, 0.27, 0.02], [0.08, 0.08, 0.05]);
    add(f, SPH, mat(d.skin2 || '#ffe2a8'), [0, -0.1, 0.26], [0.15, 0.11, 0.11]);
    add(f, SPH, mat('#5a3020'), [0, -0.05, 0.36], [0.05, 0.035, 0.03]);
    out.eyes = [eye(f, R * 0.95, -0.12, 0.05, { iris: '#b8761a' }), eye(f, R * 0.95, 0.12, 0.05, { iris: '#b8761a' })];
    brows(f, R * 0.95, 0.15, '#8a4a1a');
    out.mouth = add(f, SPH, mat('#5a1822'), [0, -0.165, 0.35], [0.045, 0.014, 0.03]);
    out.mouth.userData.base = 0.014;
  },
  elephant(f, d, R, fur, out) {
    add(f, SPH, fur, [0, 0, 0], R);
    for (const s of [1, -1]) {
      add(f, SPH, fur, [0.36 * s, 0.02, -0.04], [0.05, 0.27, 0.23], [0, 0.5 * s, 0]);
      add(f, SPH, mat('#e8a8b8'), [0.37 * s, 0.02, 0.0], [0.03, 0.2, 0.17], [0, 0.5 * s, 0]);
    }
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.04, 0.3), new THREE.Vector3(0, -0.22, 0.42), new THREE.Vector3(0, -0.4, 0.44), new THREE.Vector3(0, -0.48, 0.54)]);
    add(f, geo('trunk', () => new THREE.TubeGeometry(curve, 16, 0.065, 12)), fur);
    for (const s of [1, -1]) add(f, cone(0.03, 0.14, 10), mat('#fffbee'), [0.1 * s, -0.2, 0.33], 1, [Math.PI / 2 + 0.6, 0, 0]);
    out.eyes = [eye(f, R, -0.14, 0.07, { s: 0.85 }), eye(f, R, 0.14, 0.07, { s: 0.85 })];
    cheeks(f, R, '#ff9ab0', -0.06, 0.22);
    out.mouth = add(f, SPH, mat('#5a1822'), [0, -0.19, 0.29], [0.04, 0.012, 0.03]);
    out.mouth.userData.base = 0.012;
  },
  raccoon(f, d, R, fur, out) {
    add(f, SPH, fur, [0, 0, 0], [R * 1.05, R * 0.95, R]);
    for (const s of [1, -1]) {
      add(f, cone(0.1, 0.18, 4), fur, [0.22 * s, 0.31, -0.02], 1, [0, Math.PI / 4, -0.4 * s]);
      add(f, SPH, mat('#2a2630'), onS(R, 0.13 * s, 0.04, -0.035), [0.11, 0.075, 0.05], [0, 0, -0.25 * s]);
      add(f, SPH, mat('#f4f0ea'), onS(R, 0.15 * s, 0.15, -0.035), [0.07, 0.03, 0.04]);
    }
    add(f, SPH, mat('#f4f0ea'), [0, -0.11, 0.27], [0.13, 0.1, 0.11]);
    add(f, SPH, BLACK(), [0, -0.07, 0.38], [0.045, 0.032, 0.032]);
    out.eyes = [eye(f, R, -0.13, 0.04, { s: 0.85 }), eye(f, R, 0.13, 0.04, { s: 0.85 })];
    out.mouth = add(f, SPH, mat('#5a1822'), [0, -0.17, 0.36], [0.04, 0.012, 0.03]);
    out.mouth.userData.base = 0.012;
  },
  hedgehog(f, d, R, fur, out) {
    const sp = mat(d.spikes || '#6a4a30', { r: 0.8 });
    const up = new THREE.Vector3(0, 1, 0);
    for (let k = 0; k < 70; k++) {
      // спираль по задней и верхней части головы
      const y = 1 - (k / 69) * 1.7, r = Math.sqrt(Math.max(0, 1 - y * y)), a = k * 2.399;
      const dir = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      if (dir.z > 0.25 && dir.y < 0.55) continue;
      const s = add(f, cone(0.07, 0.24, 6), sp, [dir.x * 0.33, dir.y * 0.33, dir.z * 0.33 - 0.03]);
      s.quaternion.setFromUnitVectors(up, dir.clone().add(new THREE.Vector3(0, 0.15, -0.35)).normalize());
    }
    add(f, SPH, fur, [0, 0, 0], R * 0.97);
    add(f, SPH, fur, [0, -0.08, 0.3], [0.1, 0.08, 0.12]);
    add(f, SPH, BLACK(), [0, -0.06, 0.42], 0.04);
    for (const s of [1, -1]) add(f, SPH, fur, [0.24 * s, 0.2, 0.05], [0.06, 0.06, 0.04]);
    out.eyes = [eye(f, R * 0.97, -0.12, 0.06, { black: 1, s: 0.75 }), eye(f, R * 0.97, 0.12, 0.06, { black: 1, s: 0.75 })];
    cheeks(f, R, '#ffa0a0', -0.08, 0.2);
    out.mouth = add(f, SPH, mat('#5a1822'), [0, -0.15, 0.34], [0.035, 0.01, 0.02]);
    out.mouth.userData.base = 0.01;
  },
  alien(f, d, R, fur, out) {
    add(f, SPH, fur, [0, 0.02, 0], [R, R * 1.15, R * 0.95]);
    out.eyes = [eye(f, R, -0.14, 0.02, { black: 1, s: 1.3, tilt: 0.45 }), eye(f, R, 0.14, 0.02, { black: 1, s: 1.3, tilt: -0.45 })];
    const glow = mat('#fff27a', { e: '#ffe23a', ei: 1.4 });
    for (const s of [1, -1]) {
      add(f, cyl(0.012, 0.012, 0.28, 8), fur, [0.12 * s, 0.48, 0], 1, [0, 0, -0.3 * s]);
      add(f, SPH, glow, [0.16 * s, 0.62, 0], 0.05);
    }
    out.mouth = mouthM(f, R, -0.2, 0.6);
  },
  cyclops(f, d, R, fur, out) {
    add(f, SPH, fur, [0, 0, 0], R);
    for (const s of [1, -1]) add(f, cone(0.05, 0.14, 12), mat('#fff3d6'), [0.15 * s, 0.33, 0], 1, [0, 0, -0.35 * s]);
    out.eyes = [eye(f, R, 0, 0.07, { s: 2.0, iris: '#38c7a8' })];
    cheeks(f, R, '#ff9ad0', -0.12, 0.2);
    out.mouth = mouthM(f, R, -0.18, 1.2);
  },
  robot(f, d, R, fur, out) {
    const metal = mat(d.skin, { r: 0.3, m: 0.75 });
    add(f, box(0.62, 0.52, 0.52), metal, [0, 0, 0]);
    add(f, box(0.5, 0.34, 0.03), mat('#0d1424', { r: 0.2 }), [0, 0.0, 0.262]);
    const glow = mat('#6af2ff', { e: '#3ae0ff', ei: 1.6 });
    const e1 = new THREE.Group(), e2 = new THREE.Group();
    e1.position.set(-0.12, 0.04, 0.28);
    e2.position.set(0.12, 0.04, 0.28);
    add(e1, SPH, glow, [0, 0, 0], [0.06, 0.06, 0.02]);
    add(e2, SPH, glow, [0, 0, 0], [0.06, 0.06, 0.02]);
    f.add(e1, e2);
    out.eyes = [e1, e2];
    out.mouth = add(f, box(0.16, 1, 0.02), glow, [0, -0.09, 0.28], [1, 0.02, 1]);
    out.mouth.userData.base = 0.02;
    out.mouth.userData.robot = 1;
    for (const s of [1, -1]) add(f, cyl(0.07, 0.07, 0.06), mat('#d8343c', { r: 0.4, m: 0.3 }), [0.33 * s, 0, 0], 1, [0, 0, Math.PI / 2]);
    add(f, cyl(0.015, 0.015, 0.2, 8), metal, [0, 0.36, 0]);
    add(f, SPH, mat('#ff4a4a', { e: '#ff2a2a', ei: 1.2 }), [0, 0.48, 0], 0.05);
  },
};

function hair(f, d, R) {
  const h = mat(d.hair || '#4a3426', { r: 0.85 });
  const st = d.style || 'short';
  if (st === 'bald') {
    for (const s of [1, -1]) add(f, SPH, h, [0.31 * s, 0.03, -0.1], [0.07, 0.11, 0.14]);
    return;
  }
  if (st === 'scarf') {
    const c = mat(d.scarf || '#c23a3a', { r: 0.8 });
    const t = add(f, cap(R * 1.06, 1.5), c, [0, 0.02, -0.02], 1, [-0.5, 0, 0]);
    add(f, cone(0.08, 0.14, 12), c, [0, -0.32, 0.12], 1, [Math.PI, 0, 0]);
    return t;
  }
  add(f, cap(R * 1.05, st === 'bob' || st === 'long' ? 1.45 : 1.15), h, [0, 0.0, -0.01], 1, [-0.42, 0, 0]);
  if (st === 'bun') add(f, SPH, h, [0, 0.33, -0.18], 0.13);
  if (st === 'long') add(f, caps(0.25, 0.28), h, [0, -0.18, -0.14], [1.15, 1, 0.6]);
  if (st === 'curly') for (let k = 0; k < 9; k++) { const a = (k / 8) * Math.PI; add(f, SPH, h, [Math.cos(a) * 0.32, Math.sin(a) * 0.24 + 0.12, -0.04], 0.11); }
  if (st === 'bob') for (const s of [1, -1]) add(f, SPH, h, [0.3 * s, -0.12, -0.02], [0.1, 0.17, 0.2]);
}

// ---------- аксессуары ----------
function accessories(c, d, R) {
  const { face, torso } = c;
  for (const a of d.acc || []) {
    if (a === 'glasses') {
      const m = mat('#2a2230', { r: 0.3, m: 0.4 });
      for (const s of [1, -1]) add(face, tor(0.075, 0.011), m, onS(R, 0.125 * s, 0.04, 0.03));
      add(face, box(0.08, 0.012, 0.012), m, onS(R, 0, 0.05, 0.035));
    }
    if (a === 'bow' || a === 'tux') {
      const m = mat(d.bowc || '#c4161c', { r: 0.5 });
      for (const s of [1, -1]) add(torso, cone(0.06, 0.12, 4), m, [0.06 * s, 0.6, 0.24], [1, 1, 0.6], [0, 0, (Math.PI / 2) * s]);
      add(torso, SPH, m, [0, 0.6, 0.255], 0.03);
    }
    if (a === 'tux') {
      add(torso, SPH, mat('#fffaf2'), [0, 0.42, 0.17], [0.12, 0.22, 0.09]);
      for (const s of [1, -1]) add(torso, box(0.07, 0.34, 0.02), mat(shade(d.top, 0.65)), [0.1 * s, 0.42, 0.23], 1, [0, 0.25 * s, 0.22 * s]);
    }
    if (a === 'tie') add(torso, box(0.07, 0.26, 0.02), mat(d.tiec || '#2c63d0'), [0, 0.45, 0.255], 1, [0.18, 0, 0]);
    if (a === 'beads') add(torso, tor(0.17, 0.025), mat('#fff8f0', { r: 0.2, m: 0.1 }), [0, 0.64, 0.03], 1, [Math.PI / 2 - 0.3, 0, 0]);
    if (a === 'scarf') {
      const m = mat(d.scarfc || '#d8343c', { r: 0.9 });
      add(torso, tor(0.17, 0.06), m, [0, 0.66, 0], 1, [Math.PI / 2, 0, 0]);
      add(torso, caps(0.05, 0.18), m, [0.1, 0.5, 0.2], 1, [0.2, 0, 0.2]);
    }
    if (a === 'hat') {
      const m = mat(d.hatc || '#3a2a22', { r: 0.7 });
      add(face, cyl(0.2, 0.22, 0.24), m, [0, R + 0.05, -0.02], 1, [-0.1, 0, 0.08]);
      add(face, cyl(0.33, 0.33, 0.02, 32), m, [0, R - 0.06, -0.01], 1, [-0.1, 0, 0.08]);
    }
    if (a === 'cap') {
      const m = mat(d.capc || '#2c63d0', { r: 0.7 });
      add(face, cap(R * 1.04, 1.2), m, [0, 0.03, 0], 1, [-0.2, 0, 0]);
      add(face, cyl(0.2, 0.2, 0.02, 24), m, [0, 0.2, 0.3], [1, 1, 0.8], [0.3, 0, 0]);
    }
    if (a === 'flower') {
      add(face, SPH, mat('#ffd23a'), [0.22, 0.24, 0.2], 0.035);
      for (let k = 0; k < 5; k++) { const t = (k / 5) * Math.PI * 2; add(face, SPH, mat('#ff6fa8'), [0.22 + Math.cos(t) * 0.05, 0.24 + Math.sin(t) * 0.05, 0.19], 0.035); }
    }
    if (a === 'ribbon') {
      const m = mat(d.ribc || '#ff4a8a');
      for (const s of [1, -1]) add(face, cone(0.06, 0.12, 4), m, [0.16 + 0.06 * s, 0.32, 0.05], [1, 1, 0.6], [0, 0, (Math.PI / 2) * s]);
    }
    if (a === 'medal') {
      add(torso, cyl(0.06, 0.06, 0.015), mat('#f5c542', { r: 0.25, m: 0.8 }), [0.12, 0.42, 0.24], 1, [Math.PI / 2 - 0.2, 0, 0]);
    }
    if (a === 'apron') add(torso, box(0.34, 0.4, 0.02), mat(d.apronc || '#ffffff'), [0, 0.28, 0.24], 1, [0.1, 0, 0]);
  }
}

// ---------- сборка персонажа ----------
export function buildChar(d) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const robot = d.kind === 'robot';
  const fur = robot ? mat(d.skin, { r: 0.3, m: 0.75 }) : mat(d.skin, { r: d.kind === 'human' ? 0.55 : 0.8 });
  const top = mat(d.top || '#3f6fb5');
  const pants = robot ? fur : mat(d.pants || shade(d.top || '#3f6fb5', 0.55));
  const shoe = mat(d.shoes || '#3a2a22', { r: 0.45 });
  const hand = d.hands ? mat(d.hands) : fur;
  const legs = [];
  for (const s of [1, -1]) {
    const leg = new THREE.Group();
    leg.position.set(0.13 * s, 0.6, 0);
    body.add(leg);
    add(leg, caps(0.1, 0.3), d.legs ? mat(d.legs) : pants, [0, -0.26, 0]);
    add(leg, SPH, shoe, [0, -0.54, 0.06], [0.12, 0.08, 0.17]);
    legs.push(leg);
  }
  const torso = new THREE.Group();
  torso.position.set(0, 0.6, 0);
  body.add(torso);
  if (d.dress) add(torso, cyl(0.24, 0.4, 0.46, 28), top, [0, -0.02, 0]);
  add(torso, caps(0.27, 0.28), top, [0, 0.33, 0], [1.05, 1, 0.88]);
  if (d.belly) add(torso, SPH, mat(d.belly), [0, 0.3, 0.12], [0.19, 0.24, 0.15]);
  add(torso, cyl(0.1, 0.11, 0.14), fur, [0, 0.69, 0]);
  const arms = [];
  for (const s of [1, -1]) {
    const arm = new THREE.Group();
    arm.position.set(0.31 * s, 0.58, 0);
    torso.add(arm);
    add(arm, caps(0.075, 0.28), d.bare ? fur : top, [0, -0.19, 0]);
    add(arm, SPH, hand, [0, -0.42, 0], 0.085);
    arms.push(arm);
  }
  const neck = new THREE.Group();
  neck.position.set(0, 0.72, 0);
  torso.add(neck);
  const head = new THREE.Group();
  neck.add(head);
  const face = new THREE.Group();
  face.position.set(0, 0.3, 0);
  head.add(face);
  const R = 0.36;
  const out = {};
  (HEADS[d.kind] || HEADS.human)(face, d, R, fur, out);
  // улыбка: видна, пока рот закрыт
  let smile = null;
  if (out.mouth && !out.mouth.userData.robot) {
    const m = out.mouth;
    const tilt = Math.asin(Math.max(-0.9, Math.min(0.9, -m.position.y / 0.36)));
    smile = add(face, tor(Math.max(0.035, m.scale.x * 0.75), 0.012, Math.PI), mat('#5a1822', { r: 0.5 }), [m.position.x, m.position.y + 0.03, m.position.z + 0.018], 1, [tilt, 0, Math.PI]);
  }
  const c = { root, body, torso, head, face, armL: arms[0], armR: arms[1], legL: legs[0], legR: legs[1], eyes: out.eyes || [], mouth: out.mouth, smile };
  accessories(c, d, R);
  if (d.tail) {
    const t = add(torso, caps(0.06, 0.4), mat(d.tail), [0, 0.05, -0.32], 1, [-0.9, 0, 0]);
    t.castShadow = true;
  }
  root.scale.setScalar((d.scale || 1) * 1.3);
  return c;
}

// ---------- анимации ----------
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (x) => x * x * (3 - 2 * x);
const DUR = { spin: 1.1, cheer: 2.2, sad: 2, wave: 1.8, clap: 1.6, think: 2.4, point: 1, bow: 1.4, nod: 0.9, shrug: 1.3, gesture: 1.4 };
// поза: aLx aLz aRx aRz — руки, tx ty — наклон и поворот корпуса, hx hz — голова, jump — подпрыгивание
const IDLE = { aLx: 0, aLz: 0.12, aRx: 0, aRz: -0.12, tx: 0, ty: 0, hx: 0, hz: 0, jump: 0 };
const GEST = {
  spin: (p) => ({ aRx: -1.25 - Math.sin(p * Math.PI) * 0.2, aRz: lerp(-0.7, 0.55, smooth(Math.min(1, p * 1.4))), ty: lerp(0.35, -0.3, smooth(Math.min(1, p * 1.4))), tx: 0.18, hx: 0.25 }),
  cheer: (p, t) => ({ aLz: 2.6 + Math.sin(t * 9) * 0.15, aRz: -2.6 - Math.sin(t * 9) * 0.15, aLx: -0.2, aRx: -0.2, jump: Math.abs(Math.sin(t * 7)) * 0.16, hx: -0.15 }),
  sad: () => ({ hx: 0.45, tx: 0.14, aLz: 0.04, aRz: -0.04, aLx: 0.1, aRx: 0.1 }),
  wave: (p, t) => ({ aRz: -2.45 + Math.sin(t * 10) * 0.3, aRx: -0.25, hz: 0.08 }),
  clap: (p, t) => {
    const o = Math.abs(Math.sin(t * 13));
    return { aLx: -1.15, aRx: -1.15, aLz: -0.28 - o * 0.2, aRz: 0.28 + o * 0.2 };
  },
  think: (p, t) => ({ aRx: -2.3, aRz: 0.55, hz: 0.14 + Math.sin(t * 2) * 0.04, hx: -0.1 }),
  point: () => ({ aRx: -1.9, aRz: -0.15, hx: -0.05 }),
  bow: () => ({ tx: 0.45, hx: 0.3, aLx: -0.3, aRx: -0.3 }),
  nod: (p) => ({ hx: Math.sin(p * Math.PI * 2) * 0.22 }),
  shrug: () => ({ aLz: 0.6, aRz: -0.6, aLx: -0.6, aRx: -0.6, hz: 0.15 }),
  gesture: (p, t) => ({ aRx: -1.0 + Math.sin(t * 4) * 0.25, aRz: -0.35, aLx: -0.7 - Math.sin(t * 4 + 1) * 0.2, aLz: 0.35, hz: Math.sin(t * 2.5) * 0.06 }),
};
const MOODS = {
  sad: GEST.sad,
  out: () => ({ hx: 0.4, tx: 0.1, aLz: 0.05, aRz: -0.05 }),
  happy: (p, t) => ({ jump: Math.max(0, Math.sin(t * 5)) * 0.04, aLz: 0.3, aRz: -0.3 }),
  host: (p, t) => ({ aLx: -0.9, aLz: 0.25, aRx: -0.5, aRz: -0.2 }),
};

export class Char {
  constructor(def) {
    this.def = def;
    Object.assign(this, buildChar(def));
    this.t = Math.random() * 10;
    this.blinkIn = 1 + Math.random() * 3;
    this.blinkT = 0;
    this.talkT = 0;
    this.level = -1; // уровень голоса (ведущий), -1 — нет
    this.cur = null;
    this.mood = null;
    this.moodW = 0;
    this.yaw = 0;
    this.lookAt = null; // мировая точка
    this.pose = { ...IDLE };
    this.appear = 1;
  }
  play(name, dur) {
    if (!GEST[name]) return;
    this.cur = { name, t: 0, dur: dur || DUR[name] };
  }
  setMood(m) {
    if (m !== this.mood) {
      this.prevMood = this.mood;
      this.mood = m;
      this.moodW = 0;
    }
  }
  talk(sec) {
    this.talkT = Math.max(this.talkT, sec);
  }
  update(dt) {
    this.t += dt;
    const t = this.t;
    // поза: покой → настроение → жест
    const P = { ...IDLE };
    P.aLz += Math.sin(t * 1.3) * 0.03;
    P.aRz -= Math.sin(t * 1.3 + 1) * 0.03;
    P.hz = Math.sin(t * 0.7) * 0.04;
    this.moodW = Math.min(1, this.moodW + dt * 3);
    if (this.mood && MOODS[this.mood]) {
      const m = MOODS[this.mood](0, t);
      for (const k in m) P[k] = lerp(P[k], m[k], this.moodW);
    }
    if (this.cur) {
      const c = this.cur;
      c.t += dt;
      const p = Math.min(1, c.t / c.dur);
      const w = Math.min(1, Math.min(c.t, c.dur - c.t) / 0.22);
      const g = GEST[c.name](p, t);
      for (const k in g) P[k] = lerp(P[k], g[k], Math.max(0, w));
      if (c.t >= c.dur) this.cur = null;
    }
    // сглаживание (чтобы смены поз не дёргались)
    const k = 1 - Math.exp(-dt * 14);
    for (const key in P) this.pose[key] = lerp(this.pose[key], P[key], k);
    const q = this.pose;
    this.armL.rotation.set(q.aLx, 0, q.aLz);
    this.armR.rotation.set(q.aRx, 0, q.aRz);
    this.torso.rotation.set(q.tx, q.ty, 0);
    this.torso.position.y = 0.6 + Math.sin(t * 2.1) * 0.008;
    this.body.position.y = q.jump;
    // взгляд: голова поворачивается к точке
    let yaw = 0;
    if (this.lookAt) {
      const wp = new THREE.Vector3();
      this.root.getWorldPosition(wp);
      const dx = this.lookAt.x - wp.x, dz = this.lookAt.z - wp.z;
      yaw = Math.atan2(dx, dz) - this.root.rotation.y;
      while (yaw > Math.PI) yaw -= Math.PI * 2;
      while (yaw < -Math.PI) yaw += Math.PI * 2;
      yaw = Math.max(-0.9, Math.min(0.9, yaw));
    }
    this.yaw = lerp(this.yaw, yaw, 1 - Math.exp(-dt * 5));
    this.head.rotation.set(q.hx, this.yaw - q.ty * 0.5, q.hz);
    // моргание
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blinkT = 0.13;
      this.blinkIn = 2 + Math.random() * 3.5;
    }
    this.blinkT = Math.max(0, this.blinkT - dt);
    const ey = this.blinkT > 0 ? 0.12 : 1;
    for (const e of this.eyes) e.scale.y = e.userData.sy0 === undefined ? ((e.userData.sy0 = e.scale.y), ey * e.scale.y) : ey * e.userData.sy0;
    // рот
    if (this.mouth) {
      this.talkT = Math.max(0, this.talkT - dt);
      let open = 0;
      if (this.level >= 0) open = Math.min(1, this.level * 1.6);
      else if (this.talkT > 0) open = 0.35 + 0.65 * Math.abs(Math.sin(t * 17)) * (0.6 + 0.4 * Math.sin(t * 5.3));
      const b = this.mouth.userData.base;
      if (this.mouth.userData.robot) this.mouth.scale.y = b + open * 0.05;
      else {
        this.mouth.scale.y = b + open * 0.06;
        this.mouth.visible = !this.smile || open > 0.08;
        if (this.smile) this.smile.visible = open <= 0.08;
      }
    }
    // появление
    if (this.appear < 1) {
      this.appear = Math.min(1, this.appear + dt * 2.2);
      const a = Math.max(0, this.appear);
      const s = a < 1 ? 1 + Math.sin(a * Math.PI) * 0.18 * (1 - a) - (1 - smooth(a)) * 0.9 : 1;
      this.body.scale.setScalar(Math.max(0.01, s));
    }
  }
}
