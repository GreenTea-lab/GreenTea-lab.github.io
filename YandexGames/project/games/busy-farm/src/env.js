// Окрестности фермы: луг, дорога, пруд, деревья, кусты, цветы, домик фермера, мельница, холмы, облака
import * as THREE from 'three';
import { B, MAT } from './gfx.js';
import { flowerGeo } from './models.js';

const P = Math.PI;

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// занятые прямоугольники, где декора быть не должно
function blocked(lay) {
  const R = [];
  const F = lay.field;
  R.push([F.x0 - 0.9, F.z0 - 0.9, F.x1 + 0.9, F.z1 + 0.9]);
  for (const s of lay.slots) R.push([s.x - 1.7, s.z - 1.5, s.x + 1.7, s.z + 1.6]);
  R.push([lay.well.x - 1.1, lay.well.z - 1.1, lay.well.x + 1.1, lay.well.z + 1.3]);
  R.push([lay.store.x - 1.7, lay.store.z - 1.6, lay.store.x + 1.7, lay.store.z + 1.7]);
  // дорога
  R.push([lay.truck.x - 1.6, lay.road.z - 1.2, 60, lay.road.z + 1.2]);
  return R;
}
const inRects = (R, x, z, pad = 0) => R.some(([a, b, c, d]) => x > a - pad && x < c + pad && z > b - pad && z < d + pad);

export function buildEnv(scene, lay) {
  const rnd = rng(lay.portrait ? 77 : 41);
  const R = blocked(lay);
  const root = new THREE.Group();
  scene.add(root);
  const V = lay.view;
  const cx = (V.x0 + V.x1) / 2,
    cz = (V.z0 + V.z1) / 2;

  // ---- земля: большой луг с пятнами цвета ----
  const size = 90;
  const gg = new THREE.PlaneGeometry(size, size, 90, 90);
  gg.rotateX(-P / 2);
  const pos = gg.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c1 = new THREE.Color('#9ad46e'),
    c2 = new THREE.Color('#86c65c'),
    c3 = new THREE.Color('#a9dc7c'),
    tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx,
      z = pos.getZ(i) + cz;
    const n = Math.sin(x * 0.35) * Math.cos(z * 0.41) + Math.sin(x * 0.13 + z * 0.17) * 0.8;
    tmp.copy(c1).lerp(n > 0 ? c3 : c2, Math.min(1, Math.abs(n) * 0.6));
    col[i * 3] = tmp.r;
    col[i * 3 + 1] = tmp.g;
    col[i * 3 + 2] = tmp.b;
  }
  gg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const ground = new THREE.Mesh(gg, MAT);
  ground.position.set(cx, 0, cz);
  ground.receiveShadow = true;
  root.add(ground);

  const b = new B(); // всё статичное склеиваем в один меш

  // ---- пастбище под полем и изгородь ----
  const F = lay.field;
  const fw = F.x1 - F.x0,
    fd = F.z1 - F.z0;
  b.rbox(fw + 0.5, 0.04, fd + 0.5, 0.2, '#c6e58c', { x: (F.x0 + F.x1) / 2, y: 0.02, z: (F.z0 + F.z1) / 2 });
  // мелкие камушки и травинки по пастбищу
  for (let i = 0; i < 40; i++) {
    const x = F.x0 + rnd() * fw,
      z = F.z0 + rnd() * fd;
    if (rnd() < 0.5) b.sph(0.05 + rnd() * 0.04, '#b7c98a', { x, y: 0.04, z, sy: 0.4 });
    else b.cone(0.03, 0.12, '#a7d474', { x, y: 0.08, z }, 4);
  }
  // изгородь: столбики и две жерди, с калиткой у склада
  const fence = (x0, z0, x1, z1, gapAt) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(2, Math.round(len / 1.1));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t,
        z = z0 + (z1 - z0) * t;
      if (gapAt && Math.hypot(x - gapAt.x, z - gapAt.z) < 0.8) continue;
      b.rbox(0.13, 0.62, 0.13, 0.04, '#d8a56a', { x, y: 0.31, z });
      b.cone(0.09, 0.08, '#c48e55', { x, y: 0.66, z }, 4);
    }
    for (let i = 0; i < n; i++) {
      const ta = i / n,
        tb = (i + 1) / n;
      const xa = x0 + (x1 - x0) * ta,
        za = z0 + (z1 - z0) * ta,
        xb = x0 + (x1 - x0) * tb,
        zb = z0 + (z1 - z0) * tb;
      const mx = (xa + xb) / 2,
        mz = (za + zb) / 2;
      if (gapAt && Math.hypot(mx - gapAt.x, mz - gapAt.z) < 0.9) continue;
      const l = Math.hypot(xb - xa, zb - za);
      const ry = -Math.atan2(zb - za, xb - xa);
      b.box(l, 0.07, 0.05, '#e8b97e', { x: mx, y: 0.48, z: mz, ry });
      b.box(l, 0.07, 0.05, '#e8b97e', { x: mx, y: 0.25, z: mz, ry });
    }
  };
  const e = 0.35;
  const door = lay.store.door;
  fence(F.x0 - e, F.z0 - e, F.x1 + e, F.z0 - e);
  fence(F.x1 + e, F.z0 - e, F.x1 + e, F.z1 + e);
  fence(F.x1 + e, F.z1 + e, F.x0 - e, F.z1 + e, door);
  fence(F.x0 - e, F.z1 + e, F.x0 - e, F.z0 - e, door);

  // ---- дорога для машины: от стоянки направо за край ----
  const rz = lay.road.z;
  const rx0 = lay.truck.x - 1.4;
  b.rbox(70, 0.03, 1.6, 0.1, '#e4c590', { x: rx0 + 35, y: 0.016, z: rz });
  for (let x = rx0; x < rx0 + 40; x += 0.7) {
    b.sph(0.06 + rnd() * 0.05, '#cfae78', { x: x + rnd() * 0.4, y: 0.03, z: rz + (rnd() - 0.5) * 1.2, sy: 0.35 });
  }
  // тропинка от склада к стоянке
  b.rbox(Math.abs(lay.truck.x - lay.store.x) + 1.2, 0.025, 0.9, 0.1, '#e8cf9e', { x: (lay.truck.x + lay.store.x) / 2, y: 0.014, z: lay.portrait ? lay.store.z + 0.4 : rz });
  if (!lay.portrait) b.rbox(0.9, 0.025, Math.abs(rz - lay.store.z), 0.1, '#e8cf9e', { x: lay.store.x + 0.3, y: 0.015, z: (rz + lay.store.z) / 2 });
  // почтовый ящик и указатель «В город» у дороги
  const sx = lay.truck.x + 2.4,
    sz = rz - 1.15;
  b.box(0.08, 0.9, 0.08, '#a8683a', { x: sx, y: 0.45, z: sz });
  b.rbox(0.9, 0.26, 0.06, 0.04, '#fff3c8', { x: sx + 0.25, y: 0.82, z: sz });
  b.cone(0.16, 0.2, '#fff3c8', { x: sx + 0.78, y: 0.82, z: sz, rz: -P / 2 }, 3);
  b.box(0.06, 0.6, 0.06, '#8a5a34', { x: sx - 0.7, y: 0.3, z: sz });
  b.rbox(0.36, 0.24, 0.24, 0.08, '#4a98dc', { x: sx - 0.7, y: 0.66, z: sz });
  b.box(0.04, 0.16, 0.04, '#e2483e', { x: sx - 0.5, y: 0.8, z: sz + 0.05 });

  // ---- пруд с кувшинками ----
  const pond = findSpot(R, rnd, V, 2.2, lay.portrait ? [V.x0 - 2.5, V.z1 - 1] : [V.x0 - 1.2, V.z0 + 0.6]);
  if (pond) {
    b.cyl(1.9, 2.0, 0.05, '#7fb0d0', { x: pond.x, y: 0.02, z: pond.z, sz: 0.7 }, 28);
    b.cyl(1.7, 1.7, 0.06, '#69b8e8', { x: pond.x, y: 0.03, z: pond.z, sz: 0.68 }, 28);
    for (let i = 0; i < 4; i++) {
      const a = rnd() * P * 2;
      const lx = pond.x + Math.cos(a) * 1.0,
        lz = pond.z + Math.sin(a) * 0.6;
      b.cyl(0.22, 0.22, 0.02, '#5fb84a', { x: lx, y: 0.07, z: lz }, 10);
      if (i % 2) b.sph(0.07, '#ffb3d0', { x: lx, y: 0.1, z: lz, sy: 0.6 });
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * P * 2;
      b.sph(0.12 + rnd() * 0.1, i % 3 ? '#b9b0a4' : '#a39a8e', { x: pond.x + Math.cos(a) * 1.95, y: 0.05, z: pond.z + Math.sin(a) * 1.35, sy: 0.55 });
    }
    for (let i = 0; i < 5; i++) {
      const a = P * 0.15 + i * 0.25;
      b.cyl(0.02, 0.02, 0.7, '#5a9a3c', { x: pond.x + Math.cos(a) * 1.9, y: 0.35, z: pond.z + Math.sin(a) * 1.3 });
      b.cyl(0.05, 0.05, 0.18, '#8a5a34', { x: pond.x + Math.cos(a) * 1.9, y: 0.66, z: pond.z + Math.sin(a) * 1.3 });
    }
    R.push([pond.x - 2.2, pond.z - 1.6, pond.x + 2.2, pond.z + 1.6]);
  }

  // ---- домик фермера и мельница сзади ----
  const home = { x: lay.portrait ? V.x1 + 2.2 : V.x0 + 1.4, z: lay.portrait ? V.z0 - 1 : V.z0 - 2.2 };
  farmhouse(b, home.x, home.z);
  R.push([home.x - 2.2, home.z - 2, home.x + 2.2, home.z + 2]);
  const mill = { x: lay.portrait ? V.x0 - 1.8 : V.x1 - 2.5, z: lay.portrait ? V.z0 + 1.5 : V.z0 - 2.6 };
  const blades = windmill(b, mill.x, mill.z);
  root.add(blades);
  R.push([mill.x - 1.4, mill.z - 1.4, mill.x + 1.4, mill.z + 1.4]);

  // ---- деревья, кусты, тюки сена, тыквы ----
  const trees = [];
  for (let i = 0; i < 420 && trees.length < 70; i++) {
    const x = cx + (rnd() - 0.5) * 46,
      z = cz + (rnd() - 0.5) * 40;
    if (inRects(R, x, z, 0.8)) continue;
    // внутри видимой зоны деревья реже
    const inside = x > V.x0 && x < V.x1 && z > V.z0 && z < V.z1;
    if (inside && rnd() < 0.75) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 1.6)) continue;
    trees.push({ x, z });
    const k = rnd();
    if (k < 0.45) tree(b, x, z, rnd);
    else if (k < 0.65) pine(b, x, z, rnd);
    else if (k < 0.85) bush(b, x, z, rnd);
    else if (k < 0.93) hay(b, x, z, rnd);
    else pumpkins(b, x, z, rnd);
  }

  // ---- холмы на горизонте ----
  for (let i = 0; i < 9; i++) {
    const x = cx - 30 + i * 7.5 + rnd() * 3,
      z = V.z0 - 13 - rnd() * 4;
    b.sph(5 + rnd() * 3, i % 2 ? '#86c065' : '#7ab65c', { x, y: -1.5, z, sy: 0.45 }, 18);
    if (i % 3 === 0) tree(b, x + 1, z + 2, rnd, 1.3);
  }

  const mesh = b.mesh();
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);

  // ---- цветы (инстансы) ----
  const fg = flowerGeo();
  const N = 260;
  const flowers = new THREE.InstancedMesh(fg, MAT, N);
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    sc = new THREE.Vector3(),
    pv = new THREE.Vector3();
  const fcols = ['#ffffff', '#ffd23f', '#ff8fb1', '#b9a0ff', '#ffb36b'];
  let k = 0;
  for (let i = 0; i < 2000 && k < N; i++) {
    const x = cx + (rnd() - 0.5) * 40,
      z = cz + (rnd() - 0.5) * 34;
    if (inRects(R, x, z, 0.2)) continue;
    pv.set(x, 0, z);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6);
    sc.setScalar(0.9 + rnd() * 0.8);
    m.compose(pv, q, sc);
    flowers.setMatrixAt(k, m);
    flowers.setColorAt(k, new THREE.Color(fcols[k % fcols.length]));
    k++;
  }
  flowers.count = k;
  root.add(flowers);

  // ---- облака (плывут, тени не отбрасывают) ----
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    const cb = new B();
    const n = 4 + Math.floor(rnd() * 3);
    for (let j = 0; j < n; j++) cb.sph(0.8 + rnd() * 0.6, '#ffffff', { x: j * 0.9 - n * 0.45, y: rnd() * 0.4, z: rnd() * 0.6, sy: 0.65 }, 12);
    const cm = cb.mesh(MAT, false);
    cm.receiveShadow = false;
    cm.position.set(cx - 20 + rnd() * 40, 7 + rnd() * 2, V.z0 - 8 - rnd() * 8);
    cm.userData.v = 0.25 + rnd() * 0.3;
    root.add(cm);
    clouds.push(cm);
  }
  // бабочки над лугом
  const flies = [];
  for (let i = 0; i < 6; i++) {
    const fb = new B();
    const c = ['#ffd23f', '#ff8fb1', '#9fd4f5'][i % 3];
    fb.sph(0.07, c, { x: 0.06, sx: 1, sy: 0.15, sz: 0.8 });
    fb.sph(0.07, c, { x: -0.06, sx: 1, sy: 0.15, sz: 0.8 });
    fb.cyl(0.012, 0.012, 0.1, '#3b2418', { rx: P / 2 });
    const fm = fb.mesh(MAT, false);
    const home = findSpot(R, rnd, V, 0.5, null) || { x: cx, z: cz };
    fm.userData = { hx: home.x, hz: home.z, ph: rnd() * 10 };
    root.add(fm);
    flies.push(fm);
  }

  return {
    root,
    update(dt, t) {
      blades.rotation.z += dt * 0.8;
      for (const c of clouds) {
        c.position.x += c.userData.v * dt;
        if (c.position.x > cx + 26) c.position.x = cx - 26;
      }
      for (const f of flies) {
        const u = f.userData;
        const tt = t * 0.6 + u.ph;
        f.position.set(u.hx + Math.sin(tt) * 1.5, 0.6 + Math.sin(tt * 3.1) * 0.2, u.hz + Math.cos(tt * 0.8) * 1.2);
        f.rotation.y = tt;
        f.scale.x = 0.6 + Math.abs(Math.sin(t * 18 + u.ph)) * 0.5;
      }
    },
  };
}

function findSpot(R, rnd, V, r, prefer) {
  if (prefer && !inRects(R, prefer[0], prefer[1], r)) return { x: prefer[0], z: prefer[1] };
  for (let i = 0; i < 300; i++) {
    const x = V.x0 - 3 + rnd() * (V.x1 - V.x0 + 6),
      z = V.z0 - 3 + rnd() * (V.z1 - V.z0 + 6);
    if (!inRects(R, x, z, r)) return { x, z };
  }
  return null;
}

function tree(b, x, z, rnd, s = 1) {
  const h = (1.1 + rnd() * 0.5) * s;
  b.cyl(0.13 * s, 0.18 * s, h, '#9a6a44', { x, y: h / 2, z });
  const g = ['#5fb84a', '#6cc455', '#56a843'];
  b.sph(0.85 * s, g[0], { x, y: h + 0.5 * s, z }, 12);
  b.sph(0.6 * s, g[1], { x: x + 0.45 * s, y: h + 0.3 * s, z: z + 0.2 * s }, 10);
  b.sph(0.6 * s, g[2], { x: x - 0.4 * s, y: h + 0.35 * s, z: z - 0.1 * s }, 10);
  b.sph(0.5 * s, g[1], { x, y: h + 1.05 * s, z: z + 0.1 * s }, 10);
  if (rnd() < 0.5) for (let i = 0; i < 4; i++) b.sph(0.08 * s, '#ff5a4a', { x: x + Math.cos(i * 1.7) * 0.6 * s, y: h + 0.4 * s + (i % 2) * 0.3 * s, z: z + Math.sin(i * 1.7) * 0.6 * s + 0.2 * s });
}
function pine(b, x, z, rnd) {
  b.cyl(0.1, 0.13, 0.5, '#8a5a34', { x, y: 0.25, z });
  b.cone(0.75, 1.0, '#3f9a52', { x, y: 0.9, z }, 9);
  b.cone(0.58, 0.85, '#48a85c', { x, y: 1.4, z }, 9);
  b.cone(0.4, 0.7, '#52b466', { x, y: 1.85, z }, 9);
}
function bush(b, x, z, rnd) {
  b.sph(0.45, '#5fb84a', { x, y: 0.3, z, sy: 0.8 }, 10);
  b.sph(0.35, '#6cc455', { x: x + 0.35, y: 0.25, z: z + 0.1, sy: 0.8 }, 10);
  b.sph(0.3, '#56a843', { x: x - 0.3, y: 0.22, z: z + 0.15, sy: 0.8 }, 10);
  if (rnd() < 0.6) for (let i = 0; i < 5; i++) b.sph(0.05, rnd() < 0.5 ? '#ff6f91' : '#ffffff', { x: x + Math.cos(i * 1.3) * 0.4, y: 0.35 + (i % 2) * 0.12, z: z + Math.sin(i * 1.3) * 0.3 + 0.15 });
}
function hay(b, x, z, rnd) {
  b.cyl(0.4, 0.4, 0.7, '#f2cf6a', { x, y: 0.4, z, rz: P / 2, ry: rnd() * P }, 16);
  b.torus(0.4, 0.025, '#d9a94a', { x, y: 0.4, z, ry: rnd() });
}
function pumpkins(b, x, z, rnd) {
  for (let i = 0; i < 3; i++) {
    const px = x + (i - 1) * 0.5,
      pz = z + rnd() * 0.3;
    const r = 0.18 + rnd() * 0.1;
    b.sph(r, '#ff9a3a', { x: px, y: r * 0.8, z: pz, sy: 0.8 }, 12);
    b.cyl(0.03, 0.03, 0.12, '#5a8a3a', { x: px, y: r * 1.6, z: pz });
  }
  b.sph(0.2, '#5fb84a', { x, y: 0.05, z: z - 0.4, sy: 0.3 });
}
function farmhouse(b, x, z) {
  b.rbox(3.0, 0.2, 2.4, 0.06, '#b9ada0', { x, y: 0.1, z });
  b.rbox(2.8, 1.6, 2.2, 0.06, '#fff4dc', { x, y: 1.0, z });
  const roofGeo = new THREE.CylinderGeometry(0.0001, 1, 1, 4, 1);
  roofGeo.rotateY(P / 4);
  b.add(roofGeo, '#5a8fd8', { x, y: 2.3, z, sx: 2.4, sy: 1.1, sz: 1.9 });
  b.rbox(3.2, 0.1, 2.6, 0.04, '#3f74bd', { x, y: 1.82, z });
  b.rbox(0.55, 0.95, 0.06, 0.05, '#9c6640', { x, y: 0.67, z: z + 1.12 });
  for (const s of [-1, 1]) {
    b.rbox(0.5, 0.5, 0.05, 0.04, '#ffffff', { x: x + s * 0.9, y: 1.1, z: z + 1.11 });
    b.box(0.4, 0.4, 0.06, '#9fd8f5', { x: x + s * 0.9, y: 1.1, z: z + 1.11 });
    b.box(0.12, 0.5, 0.06, '#5a8fd8', { x: x + s * 0.9 + s * 0.33, y: 1.1, z: z + 1.12 });
  }
  b.rbox(3.0, 0.08, 0.8, 0.03, '#c98a52', { x, y: 0.22, z: z + 1.5 });
  b.cyl(0.18, 0.2, 0.9, '#c96a4a', { x: x + 0.7, y: 2.6, z: z - 0.3 });
  // скамейка и лейка
  b.box(0.9, 0.06, 0.3, '#c98a52', { x: x - 0.9, y: 0.45, z: z + 1.6 });
  b.box(0.06, 0.25, 0.25, '#a8683a', { x: x - 1.3, y: 0.32, z: z + 1.6 });
  b.box(0.06, 0.25, 0.25, '#a8683a', { x: x - 0.5, y: 0.32, z: z + 1.6 });
  b.cyl(0.12, 0.14, 0.22, '#58b047', { x: x + 1.2, y: 0.37, z: z + 1.6 });
}
function windmill(b, x, z) {
  b.cyl(0.55, 0.85, 3.0, '#f1e6d4', { x, y: 1.5, z }, 12);
  b.cone(0.75, 0.9, '#e2574c', { x, y: 3.4, z }, 12);
  b.rbox(0.4, 0.6, 0.05, 0.05, '#9c6640', { x, y: 0.4, z: z + 0.82, rx: -0.12 });
  b.box(0.3, 0.3, 0.05, '#9fd8f5', { x, y: 1.9, z: z + 0.66, rx: -0.12 });
  const bl = new B();
  bl.cyl(0.12, 0.12, 0.3, '#8a5a34', { rx: P / 2 });
  for (let i = 0; i < 4; i++) {
    const a = (i * P) / 2;
    bl.box(0.1, 1.6, 0.04, '#a8683a', { x: Math.sin(a) * 0.8, y: Math.cos(a) * 0.8, rz: -a });
    bl.box(0.4, 1.2, 0.02, '#fff8ea', { x: Math.sin(a) * 0.95 + Math.cos(a) * 0.22, y: Math.cos(a) * 0.95 - Math.sin(a) * 0.22, z: 0.02, rz: -a });
  }
  const m = bl.mesh();
  m.position.set(x, 3.0, z + 0.85);
  return m;
}
