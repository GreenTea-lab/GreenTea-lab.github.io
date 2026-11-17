// Детали машины, которые строятся по форме кузова: бамперы-брусья, салон (сиденья, панель приборов,
// руль, консоль, пол), моторный отсек (моторный щит, брызговики, стаканы стоек, радиатор, мотор с навесным).
// Всё считается от BodyShape, поэтому детали встают на место у любой модели.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- протяжка сечения вдоль горизонтального пути ----------
// path — точки (Vector3) в плоскости xz, prof — замкнутый контур [a — наружу от пути, b — вверх]
export function sweep(path, prof, caps = true) {
  const n = path.length,
    m = prof.length;
  const pos = [],
    uv = [],
    idx = [];
  const up = new THREE.Vector3(0, 1, 0);
  let len = 0;
  for (let i = 0; i < n; i++) {
    const a = path[Math.max(0, i - 1)],
      b = path[Math.min(n - 1, i + 1)];
    const t = new THREE.Vector3().subVectors(b, a).setY(0).normalize();
    const out = new THREE.Vector3().crossVectors(t, up).normalize(); // справа по ходу
    if (i) len += path[i].distanceTo(path[i - 1]);
    for (let j = 0; j < m; j++) {
      const [pa, pb] = prof[j];
      pos.push(path[i].x + out.x * pa, path[i].y + pb, path[i].z + out.z * pa);
      uv.push(len, j / m);
    }
  }
  for (let i = 0; i < n - 1; i++)
    for (let j = 0; j < m; j++) {
      const a = i * m + j,
        b = i * m + ((j + 1) % m),
        c = (i + 1) * m + j,
        d = (i + 1) * m + ((j + 1) % m);
      idx.push(a, c, b, b, c, d);
    }
  if (caps) {
    for (const [i, flip] of [[0, true], [n - 1, false]]) {
      const c = pos.length / 3;
      const p = path[i];
      pos.push(p.x, p.y, p.z);
      uv.push(0, 0);
      for (let j = 0; j < m; j++) {
        const a = i * m + j,
          b = i * m + ((j + 1) % m);
        if (flip) idx.push(c, a, b);
        else idx.push(c, b, a);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// скруглённый прямоугольник-сечение (суперэллипс): полуглубина hd, полувысота hh
export function roundProf(hd, hh, n = 20, p = 0.45, a0 = 0) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2;
    const c = Math.cos(t),
      s = Math.sin(t);
    out.push([a0 + hd * Math.sign(c) * Math.pow(Math.abs(c), p), hh * Math.sign(s) * Math.pow(Math.abs(s), p)]);
  }
  return out;
}

// контур кузова в плане на высоте y у переднего (side=1) или заднего (-1) торца, смещённый наружу на off
// возвращает точки слева направо, концы заходят на борта до xStop
export function endContour(shape, y, side, off, xStop) {
  const L = shape.L;
  const mid = shape.zAt(side > 0 ? L * 0.6 : L * 0.4, y);
  const zSide = shape.zAt(xStop, y);
  const face = [];
  const K = 14;
  const zLim = Math.min(zSide, mid) * 0.96;
  for (let k = 0; k <= K; k++) {
    const z = zLim * Math.sin((Math.PI / 2) * (k / K));
    face.push(shape.endPoint(y, z, side).p);
  }
  // борт: от последней точки торца до xStop
  const xLast = face[face.length - 1].x;
  const sideP = [];
  const S = 6;
  for (let k = 1; k <= S; k++) {
    const x = lerp(xLast, xStop, k / S);
    if (side > 0 ? x >= xLast : x <= xLast) continue;
    sideP.push(new THREE.Vector3(x, y, shape.zAt(x, y)));
  }
  const half = face.concat(sideP); // от центра к борту (z ≥ 0)
  const pts = [];
  for (let i = half.length - 1; i > 0; i--) pts.push(new THREE.Vector3(half[i].x, y, -half[i].z));
  for (const p of half) pts.push(p.clone());
  // смещение по нормали контура в плане
  const res = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(pts.length - 1, i + 1)];
    const t = new THREE.Vector3().subVectors(b, a).setY(0).normalize();
    // наружу: для переднего торца обход слева направо (z растёт) — наружу это +x, т.е. (t.z, 0, -t.x)·side
    const nrm = new THREE.Vector3(t.z, 0, -t.x).multiplyScalar(side > 0 ? 1 : -1);
    return p.clone().addScaledVector(nrm, off);
  });
  // для заднего торца переворачиваем, чтобы обход шёл «правой рукой» наружу
  return side > 0 ? res : res.reverse();
}

// ---------- бампер-брус (ретро, внедорожники) ----------
export function barBumper(shape, spec, side, mat, S) {
  const y = spec.bumpH[side > 0 ? 1 : 0];
  const heavy = spec.bumperColor === 'black';
  const hd = heavy ? 0.032 : 0.024; // полуглубина
  const hh = heavy ? 0.06 : 0.042; // полувысота
  const gap = 0.012;
  const ax = side > 0 ? shape.axF : shape.axR;
  const xStop = side > 0 ? Math.max(ax + shape.archR + 0.08, shape.L * 0.9) : Math.min(ax - shape.archR - 0.08, shape.L * 0.1);
  const path = endContour(shape, y, side, gap + hd, xStop);
  const g = new THREE.Group();
  const bar = new THREE.Mesh(sweep(path, roundProf(hd, hh, 22, 0.42)), mat);
  bar.castShadow = true;
  g.add(bar);
  // резиновая вставка по брусу (у хромированных)
  if (!heavy) {
    const strip = new THREE.Mesh(sweep(endContour(shape, y + 0.004, side, gap + hd * 2 + 0.002, xStop - side * 0.03), roundProf(0.005, 0.011, 10, 0.5)), S.black);
    g.add(strip);
  }
  // клыки у хромированных брусьев и кронштейны к кузову
  const clips = [-0.55, 0.55];
  for (const k of clips) {
    const z = k * shape.zAt(side > 0 ? shape.L * 0.9 : shape.L * 0.1, y);
    const q = shape.endPoint(y, z, side);
    const br = new THREE.Mesh(new THREE.BoxGeometry(gap + 0.02, 0.03, 0.05), S.darkMetal);
    br.position.copy(q.p).addScaledVector(q.n, gap / 2);
    br.position.y = y - 0.01;
    g.add(br);
    if (!heavy && spec.overriders) {
      const o = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.16, 0.05, 2, 0.02), mat);
      o.position.copy(q.p).addScaledVector(q.n, gap + hd * 2 + 0.01);
      o.position.y = y + 0.02;
      g.add(o);
    }
  }
  g.userData.bar = bar;
  return g;
}

// ---------- салон ----------
let GAUGE = null;
function gaugeTex() {
  if (GAUGE) return GAUGE;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#0b0c0e';
  x.fillRect(0, 0, 256, 128);
  for (const [cx, r] of [[70, 50], [186, 50]]) {
    x.fillStyle = '#16181c';
    x.beginPath();
    x.arc(cx, 64, r, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = '#c8ccd2';
    x.lineWidth = 3;
    x.stroke();
    x.strokeStyle = '#e8eaee';
    for (let k = 0; k <= 10; k++) {
      const a = Math.PI * 0.75 + (k / 10) * Math.PI * 1.5;
      x.lineWidth = k % 2 ? 1.5 : 3;
      x.beginPath();
      x.moveTo(cx + Math.cos(a) * r * 0.78, 64 + Math.sin(a) * r * 0.78);
      x.lineTo(cx + Math.cos(a) * r * 0.92, 64 + Math.sin(a) * r * 0.92);
      x.stroke();
    }
    x.strokeStyle = '#ff5a2a';
    x.lineWidth = 3;
    const a = Math.PI * (cx < 100 ? 1.05 : 0.95);
    x.beginPath();
    x.moveTo(cx, 64);
    x.lineTo(cx + Math.cos(a) * r * 0.8, 64 + Math.sin(a) * r * 0.8);
    x.stroke();
  }
  GAUGE = new THREE.CanvasTexture(c);
  GAUGE.colorSpace = THREE.SRGBColorSpace;
  return GAUGE;
}

// кресло: начало координат — задний край подушки по центру на её верхней поверхности, перед в +x
function seatGroup(fab, trim, o) {
  const g = new THREE.Group();
  const { w, cl, bh, head, sport, bench } = o;
  const cush = new THREE.Mesh(new RoundedBoxGeometry(cl, 0.12, w, 3, 0.045), fab);
  cush.position.set(cl / 2, -0.06, 0);
  cush.rotation.z = 0.07;
  g.add(cush);
  const back = new THREE.Group();
  const bb = new THREE.Mesh(new RoundedBoxGeometry(0.12, bh, w * (sport ? 0.92 : 0.98), 3, 0.045), fab);
  bb.position.set(-0.02, bh / 2, 0);
  back.add(bb);
  if (sport) {
    for (const s of [-1, 1]) {
      const bol = new THREE.Mesh(new RoundedBoxGeometry(0.16, bh * 0.75, 0.08, 2, 0.035), fab);
      bol.position.set(0.0, bh * 0.4, s * (w / 2 - 0.02));
      back.add(bol);
    }
  }
  if (head) {
    const hr = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.16, Math.min(0.26, w * 0.55), 3, 0.04), fab);
    hr.position.set(-0.02, bh + 0.11, 0);
    back.add(hr);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 6), trim);
      post.position.set(-0.02, bh + 0.02, s * 0.06);
      back.add(post);
    }
  }
  back.rotation.z = bench ? 0.22 : 0.26; // спинка откинута назад
  g.add(back);
  // ножки пассажирской скамьи
  if (o.leg > 0.02)
    for (const s2 of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(cl * 0.7, o.leg, 0.04), trim);
      leg.position.set(cl * 0.5, -0.12 - o.leg / 2, s2 * w * 0.38);
      g.add(leg);
    }
  // салазки
  if (!bench) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(cl * 0.85, 0.05, w * 0.7), trim);
    rail.position.set(cl * 0.45, -0.145, 0);
    g.add(rail);
  }
  g.traverse((m) => m.isMesh && ((m.castShadow = true), (m.receiveShadow = true)));
  return g;
}

export function interior(shape, spec, look, S) {
  const s = spec;
  const L = shape.L;
  const g = new THREE.Group();
  const col = look.interior ?? s.interior ?? 0x3a3a40;
  const fab = new THREE.MeshStandardMaterial({ color: col, roughness: 0.92 });
  const dashM = new THREE.MeshStandardMaterial({ color: 0x1c1d21, roughness: 0.78 });
  const carpet = new THREE.MeshStandardMaterial({ color: 0x232327, roughness: 1 });
  const trim = S.black;
  const G = s.glass;
  const xWs = G.wsB * L;
  const van = G.wsB > 0.9; // кабина над мотором
  const floorY = s.sill + 0.03;
  // внутренняя полуширина салона
  const inW = (x) => Math.max(0.25, shape.W(x) * 0.9 - 0.07);
  // ---- панель приборов ----
  const dashD = van ? 0.3 : 0.42;
  const xDr = xWs - dashD; // задняя кромка панели
  const beltW = shape.belt(xWs);
  const dTop = Math.min(beltW + 0.04, shape.T(xDr) - 0.12);
  const dBot = Math.max(floorY + 0.18, dTop - 0.36);
  const wD = inW(xDr);
  {
    const sh = new THREE.Shape();
    // боковой профиль (x, y), выдавливается по ширине
    sh.moveTo(xDr, dBot);
    sh.lineTo(xDr - 0.02, dTop - 0.06);
    sh.quadraticCurveTo(xDr - 0.02, dTop, xDr + 0.06, dTop);
    const xf = Math.min(xWs, s.parts.hood * L) - 0.035;
    sh.lineTo(xf, Math.min(dTop - 0.02, shape.T(xf) - 0.04));
    sh.lineTo(xf, dBot - 0.06);
    sh.lineTo(xDr, dBot);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: wD * 2, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 6 });
    geo.translate(0, 0, -wD);
    const d = new THREE.Mesh(geo, dashM);
    d.castShadow = d.receiveShadow = true;
    g.add(d);
  }
  // ---- водитель: левый руль ----
  const seats = s.seats ?? (s.doors === 4 ? 5 : 4);
  // передние кресла: задний край подушки
  const x0 = xDr - (van ? 0.6 : 0.7);
  const headAt = (x) => shape.T(x) - 0.06; // потолок
  const seatH = (x) => clamp(headAt(x - 0.1) - floorY - 0.98, 0.1, 0.3);
  const cTop = floorY + seatH(x0);
  const inF = inW(x0);
  const sw = clamp(inF * 0.82, 0.36, 0.5);
  const zDrv = -clamp(inF * 0.5, sw / 2 + 0.06, inF - sw / 2 - 0.02);
  const room = (x, top) => headAt(x - 0.12) - top; // место над подушкой до потолка
  const mkFront = (z) => {
    const r = room(x0, cTop);
    const bh = clamp(r - 0.24, 0.36, 0.6);
    const sg = seatGroup(fab, trim, { w: sw, cl: 0.48, bh, head: r - bh > 0.3, sport: !!s.aPillar });
    sg.position.set(x0, cTop, z);
    return sg;
  };
  g.add(mkFront(zDrv), mkFront(-zDrv));
  // ---- руль ----
  {
    const wheel = new THREE.Group();
    const rimM = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.55 });
    const R = 0.17;
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.016, 8, 32), rimM));
    for (const a of [Math.PI / 2 + 0.0, Math.PI * 1.17, Math.PI * 1.83]) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(R, 0.03, 0.012), rimM);
      sp.position.set(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, 0);
      sp.rotation.z = a;
      wheel.add(sp);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.04, 16), rimM);
    hub.rotation.x = Math.PI / 2;
    wheel.add(hub);
    const col2 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.34, 10), dashM);
    col2.rotation.x = Math.PI / 2;
    col2.position.z = -0.17;
    wheel.add(col2);
    const xw = xDr - 0.1;
    const yw = Math.min(dTop - 0.05, cTop + 0.42);
    wheel.position.set(xw, yw, zDrv);
    // плоскость руля смотрит на водителя (−x) и вверх
    wheel.rotation.set(0, -Math.PI / 2, -0.42, 'ZYX');
    wheel.traverse((m) => m.isMesh && (m.castShadow = true));
    g.add(wheel);
    // щиток приборов под козырьком
    const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshBasicMaterial({ map: gaugeTex() }));
    cl.position.set(xDr - 0.021, dTop - 0.09, zDrv);
    cl.rotation.y = -Math.PI / 2;
    g.add(cl);
    const visor = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.05, 0.3, 2, 0.02), dashM);
    visor.position.set(xDr + 0.0, dTop + 0.005, zDrv);
    g.add(visor);
  }
  // ---- консоль и рычаги ----
  {
    const cx0 = x0 + 0.1,
      cx1 = xDr + 0.02;
    const con = new THREE.Mesh(new RoundedBoxGeometry(cx1 - cx0, 0.16, 0.18, 2, 0.03), dashM);
    con.position.set((cx0 + cx1) / 2, floorY + 0.08, 0);
    g.add(con);
    const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.18, 6), S.darkMetal);
    lever.position.set(cx0 + (cx1 - cx0) * 0.55, floorY + 0.24, 0);
    lever.rotation.z = 0.2;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), trim);
    knob.position.set(lever.position.x - 0.017, floorY + 0.33, 0);
    g.add(lever, knob);
  }
  // ---- задний ряд ----
  let rearFrom = x0 - 0.15;
  // где кончается салон сзади
  const sedan = G.rwB > 0 && G.rwB < G.rwT && s.parts.trunk > G.rwB - 0.02;
  const xRL = sedan ? G.rwB * L - 0.08 : Math.max(s.parts.trunk * L, G.sr * L - 0.05) + 0.28;
  if (seats > 2 && van) {
    // микроавтобус: ряды пассажирских скамей до самой кормы, над арками — уже
    const track = s.W - s.wheel.w / 2 - (s.wheel.inset ?? 0.05);
    for (let xr = x0 - 0.86; xr > xRL + 0.2; xr -= 0.8) {
      const top = floorY + seatH(xr) + 0.04;
      const r = room(xr, top);
      const bh = clamp(r - 0.2, 0.4, 0.66);
      const overArch = [shape.axF, shape.axR].some((a) => Math.abs(xr - 0.2 - a) < shape.archR + 0.2);
      const w = overArch ? Math.min(inW(xr) * 1.9, 2 * (track - s.wheel.w / 2 - 0.1)) : inW(xr) * 1.9;
      const bench = seatGroup(fab, trim, { w, cl: 0.44, bh, head: false, bench: true, leg: top - floorY - 0.12 });
      bench.position.set(xr, top, 0);
      g.add(bench);
      rearFrom = xr - 0.12;
    }
  } else if (seats > 2) {
    const xr = Math.max(x0 - 0.84, xRL + 0.22);
    if (x0 - xr > 0.44) {
      const top = floorY + seatH(xr) + 0.02;
      const r = room(xr, top);
      const bh = clamp(r - 0.22, 0.3, 0.56);
      const bench = seatGroup(fab, trim, { w: inW(xr) * 1.9, cl: 0.46, bh, head: false, bench: true });
      bench.position.set(xr, top, 0);
      g.add(bench);
      // подголовники на скамье, если влезают
      if (r - bh > 0.28)
        for (const z of [-0.36, 0.36].map((v) => v * inW(xr))) {
          const hr = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.14, 0.22, 2, 0.035), fab);
          hr.position.set(xr - 0.04 - Math.sin(0.22) * bh, top + Math.cos(0.22) * bh + 0.08, z);
          hr.rotation.z = 0.22;
          g.add(hr);
        }
      rearFrom = xr - 0.12;
    }
  }
  // полка за задним сиденьем (седаны)
  if (sedan) {
    const yS = shape.belt(xRL) - 0.02;
    const x1 = rearFrom - Math.sin(0.22) * 0.4;
    const len = Math.max(0.12, x1 - (xRL - 0.12));
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(len, 0.02, inW(xRL) * 2), dashM);
    shelf.position.set(xRL - 0.12 + len / 2, yS, 0);
    g.add(shelf);
  }
  // ---- пол с тоннелем ----
  {
    const fx0 = Math.min(rearFrom, x0) - 0.25,
      fx1 = xWs - 0.05;
    const fw = inW((fx0 + fx1) / 2);
    const fl = new THREE.Mesh(new THREE.BoxGeometry(fx1 - fx0, 0.02, fw * 2), carpet);
    fl.position.set((fx0 + fx1) / 2, floorY, 0);
    fl.receiveShadow = true;
    const tun = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, fx1 - fx0, 12, 1, false, 0, Math.PI), carpet);
    tun.rotation.z = Math.PI / 2;
    tun.position.set((fx0 + fx1) / 2, floorY, 0);
    g.add(fl, tun);
  }
  // кожух мотора между кресел у фургона с мотором под кабиной
  if (van) {
    const hump = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.36, 0.36, 3, 0.06), fab);
    hump.position.set(x0 + 0.3, floorY + 0.18, 0);
    g.add(hump);
  }
  return g;
}

// высота верхней поверхности кузова над точкой (x, z) по сечению
export function topAt(shape, x, z) {
  const p = shape.section(x);
  const az = Math.abs(z);
  // идём от центра верха наружу, пока z растёт
  for (let i = p.length - 1; i > 0; i--) {
    const a = p[i],
      b = p[i - 1];
    if (b[0] < a[0] - 1e-6) break;
    if (b[0] >= az) {
      const t = (az - a[0]) / Math.max(1e-6, b[0] - a[0]);
      return lerp(a[1], b[1], t);
    }
  }
  return shape.belt(x);
}

// ---------- моторный отсек ----------
export function engineBay(shape, spec, look, S, innerPaint, track) {
  const s = spec;
  const L = shape.L;
  const g = new THREE.Group();
  const xFw = s.parts.hood * L - 0.015; // моторный щит под задней кромкой капота
  const xRad = Math.min(s.parts.bf * L, L - 0.12) - 0.05; // радиатор за решёткой
  const bl = xRad - xFw;
  const yBot = s.sill + 0.06;
  const zIn = track - s.wheel.w / 2 - 0.06 - 0.012; // внутренняя стенка подкрылка
  const blockM = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.55, metalness: 0.7 });
  const coverM = new THREE.MeshStandardMaterial({ color: look.engineColor ?? 0x9a1a1a, roughness: 0.35, metalness: 0.5 });
  const alu = new THREE.MeshStandardMaterial({ color: 0x9a9ea4, roughness: 0.4, metalness: 0.9 });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x1e1f22, roughness: 0.7 });
  const add = (m, x, y, z) => {
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  // высота внутренней поверхности капота над точкой (x, z) — всё в отсеке держим ниже неё
  const hood = (x, z = 0) => topAt(shape, x, z) - 0.035;
  const hoodY = (x) => hood(x, 0);
  // стенка поперёк машины (x = const), верх повторяет сечение капота
  const crossWall = (x, zMax, y0, inset, th, mat) => {
    const sh = new THREE.Shape();
    const N = 10;
    sh.moveTo(-zMax, y0);
    for (let k = 0; k <= N; k++) {
      const z = -zMax + (2 * zMax * k) / N;
      sh.lineTo(z, Math.max(y0 + 0.02, hood(x, z) - inset));
    }
    sh.lineTo(zMax, y0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false });
    geo.rotateY(Math.PI / 2);
    geo.translate(x - th / 2, 0, 0);
    return add(new THREE.Mesh(geo, mat), 0, 0, 0);
  };
  // полуширина отсека в сечении x на высотах y0…y1: не шире zIn и не выходит из кузова на скруглённом носу
  const zw = (x, y0, y1 = y0, cap = zIn) => {
    let z = cap;
    for (let k = 0; k <= 4; k++) {
      const y = lerp(y0, y1, k / 4);
      if (y > shape.B(x) + 0.02) z = Math.min(z, shape.zAt(x, y) - 0.035);
    }
    return Math.max(0.05, z);
  };
  // мотор под кабиной (фургон): в «отсеке» только радиатор
  const mid = bl < 0.45;
  if (!mid) {
    // дно отсека по контуру кузова в плане
    {
      const sh = new THREE.Shape();
      const N = 10;
      sh.moveTo(xFw - 0.02, -zw(xFw, yBot));
      for (let k = 0; k <= N; k++) {
        const x = xFw - 0.02 + ((bl + 0.04) * k) / N;
        sh.lineTo(x, -zw(x, yBot));
      }
      for (let k = N; k >= 0; k--) {
        const x = xFw - 0.02 + ((bl + 0.04) * k) / N;
        sh.lineTo(x, zw(x, yBot));
      }
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.015, bevelEnabled: false });
      geo.rotateX(Math.PI / 2);
      add(new THREE.Mesh(geo, S.under), 0, yBot - 0.003, 0);
    }
    // моторный щит и короб под лобовым стеклом
    // щит во всю ширину кузова: иначе сбоку от него в щель видна обшивка двери
    const wFw = Math.min(shape.W(xFw) - 0.03, zIn + 0.12);
    crossWall(xFw, wFw, yBot, 0.012, 0.02, innerPaint);
    {
      // выше арки колеса — до самого борта
      const dx = xFw - shape.axF;
      const yArch = Math.abs(dx) < shape.archR ? s.wheel.R + Math.sqrt(shape.archR ** 2 - dx * dx) + 0.03 : yBot;
      const yU = Math.max(yBot, yArch);
      if (hood(xFw, wFw) - 0.03 > yU) crossWall(xFw, zw(xFw, yU, hood(xFw, wFw), shape.W(xFw) - 0.02) + 0.01, yU, 0.012, 0.02, innerPaint);
    }
    const cowl = crossWall(xFw + 0.05, wFw - 0.02, hoodY(xFw + 0.05) - 0.07, 0.012, 0.08, plastic);
    cowl.castShadow = false;
    // брызговики (внутренние крылья) с верхней полкой до борта и стаканы стоек
    const yA0 = Math.max(yBot + 0.15, shape.belt((xFw + xRad) / 2) - 0.035);
    const yAt = (x) => Math.max(yBot + 0.1, Math.min(yA0, hood(x, zIn + 0.02) - 0.02));
    const zA = (x) => zw(x, yBot, yAt(x));
    for (const sd of [-1, 1]) {
      // стенка брызговика: вертикальная лента, у носа заворачивает внутрь по контуру кузова
      {
        const N = 16,
          pos = [],
          idx = [];
        for (let k = 0; k <= N; k++) {
          const x = xFw + (bl * k) / N;
          const z = sd * zA(x);
          pos.push(x, yBot, z, x, yAt(x), z);
          if (k) {
            const a = (k - 1) * 2;
            idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        add(new THREE.Mesh(geo, innerPaint), 0, 0, 0);
      }
      // полка: гладкая лента от брызговика до борта по всей длине
      {
        const M = 20,
          pos = [],
          idx = [];
        for (let k = 0; k <= M; k++) {
          const x = xFw + ((bl + 0.05) * k) / M; // до передней панели, без щели в углу
          const y = yAt(Math.min(x, xRad));
          const zi = zA(Math.min(x, xRad));
          const zo = Math.max(zi + 0.005, shape.zAt(x, y) - 0.01);
          pos.push(x, y, sd * zi, x, y, sd * zo);
          if (k) {
            const a = (k - 1) * 2;
            idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        add(new THREE.Mesh(geo, innerPaint), 0, 0, 0);
      }
      if (shape.axF > xFw + 0.12 && shape.axF < xRad + 0.1) {
        const xt = clamp(shape.axF, xFw + 0.12, xRad - 0.12);
        const zt = sd * (zA(xt) - 0.075);
        const yTop = Math.min(yAt(xt) + 0.03, hood(xt, Math.abs(zt)) - 0.04);
        const y0 = s.wheel.R + shape.archR * 0.6;
        if (yTop > y0 + 0.04) {
          const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, yTop - y0, 16), innerPaint);
          add(tw, xt, (yTop + y0) / 2, zt);
          add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 10), S.darkMetal), xt, yTop + 0.005, zt);
        }
      }
    }
  }
  // передняя панель (рамка радиатора) в цвет кузова: закрывает тёмные углы между крыльями и радиатором
  if (!mid) {
    const xP = xRad + 0.045;
    const dx = xP - shape.axF;
    const yArch = Math.abs(dx) < shape.archR ? s.wheel.R + Math.sqrt(shape.archR ** 2 - dx * dx) + 0.03 : yBot;
    crossWall(xP, Math.min(zIn, zw(xP, yBot, hood(xP, zIn) - 0.012)), yBot, 0.014, 0.015, innerPaint);
    if (hood(xP, zIn) - 0.04 > yArch) crossWall(xP, zw(xP, yArch, hood(xP, zIn) - 0.012, shape.W(xP) - 0.02) + 0.01, Math.max(yBot, yArch), 0.014, 0.015, innerPaint);
  }
  // радиатор с рамкой, вентилятор с кожухом
  let radW = Math.min(zIn * 1.7, 0.75);
  let yRadT = Math.max(yBot + 0.2, hood(xRad, radW / 2) - 0.05);
  radW = Math.min(radW, 2 * (zw(xRad + 0.02, yBot + 0.02, yRadT) - 0.01));
  yRadT = Math.max(yBot + 0.2, hood(xRad, radW / 2) - 0.05);
  const radH = yRadT - yBot - 0.04;
  add(new THREE.Mesh(new THREE.BoxGeometry(0.04, radH, radW), S.radiator), xRad, yBot + 0.02 + radH / 2, 0);
  crossWall(xRad + 0.01, Math.min(zw(xRad + 0.035, yRadT - 0.02, yRadT + 0.05), radW / 2 + 0.1), yRadT - 0.02, 0.01, 0.05, plastic);
  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(radH, radW) * 0.42, Math.min(radH, radW) * 0.46, 0.05, 24, 1, true), plastic);
  shroud.rotation.z = Math.PI / 2;
  add(shroud, xRad - 0.045, yBot + 0.02 + radH / 2, 0);
  const fan = new THREE.Group();
  for (let k = 0; k < 6; k++) {
    const bl2 = new THREE.Mesh(new THREE.BoxGeometry(0.01, Math.min(radH, radW) * 0.38, 0.06), plastic);
    bl2.position.y = Math.min(radH, radW) * 0.19;
    const arm = new THREE.Group();
    arm.add(bl2);
    arm.rotation.x = (k / 6) * Math.PI * 2;
    bl2.rotation.y = 0.5;
    fan.add(arm);
  }
  add(fan, xRad - 0.05, yBot + 0.02 + radH / 2, 0);
  if (mid) {
    g.userData = { block: new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), blockM), cover: null, center: new THREE.Vector3(xRad - 0.2, yBot + 0.3, 0) };
    return g;
  }
  // ---- мотор ----
  const ex = (xFw + xRad) / 2 - 0.03;
  const roomH = hoodY(ex) - yBot - 0.05;
  const lx = clamp(bl * 0.5, 0.3, 0.6);
  const lz = clamp(zIn * 0.95, 0.34, 0.56);
  const h = clamp(Math.min(roomH * 0.55, roomH - 0.24), 0.1, 0.4);
  // блок и поддон
  const block = add(new THREE.Mesh(new RoundedBoxGeometry(lx, h, lz * 0.7, 3, 0.03), blockM), ex, yBot + 0.08 + h / 2, 0);
  add(new THREE.Mesh(new RoundedBoxGeometry(lx * 0.9, 0.08, lz * 0.55, 2, 0.02), S.darkMetal), ex, yBot + 0.05, 0);
  // клапанная крышка с рёбрами
  const yC = yBot + 0.08 + h;
  const cover = add(new THREE.Mesh(new RoundedBoxGeometry(lx * 1.02, 0.07, lz * 0.5, 3, 0.025), coverM), ex, yC + 0.03, 0);
  for (let k = 0; k < 5; k++) add(new THREE.Mesh(new THREE.BoxGeometry(lx * 0.9, 0.012, 0.012), coverM), ex, yC + 0.07, -lz * 0.18 + (k * lz * 0.36) / 4);
  // крышка маслозаливной горловины
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.025, 12), plastic), ex + lx * 0.25, yC + 0.075, lz * 0.1);
  // впуск: трубы с одной стороны, выпуск — с другой
  const nCyl = 4;
  for (let k = 0; k < nCyl; k++) {
    const xk = ex - lx * 0.36 + (k * lx * 0.72) / (nCyl - 1);
    const run = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 12, Math.PI / 2), alu);
    run.rotation.y = -Math.PI / 2;
    add(run, xk, yC - 0.06, lz * 0.3);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8), S.darkMetal);
    pipe.rotation.x = 0.5;
    add(pipe, xk, yC - 0.1, -lz * 0.38);
  }
  add(new THREE.Mesh(new RoundedBoxGeometry(lx * 0.95, 0.06, 0.07, 2, 0.02), alu), ex, yC + 0.02, lz * 0.44);
  // воздушный фильтр: «блин» у ретро, короб у современных
  const retro = s.bumper === 'bar';
  const yAF = Math.min(hood(ex, 0.15) - 0.05, yC + 0.16);
  if (retro) {
    const af = add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.07, 32), S.darkMetal), ex, yAF, 0.02);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 10), alu), ex, yAF + 0.045, 0.02);
    af.userData.filter = true;
  } else {
    add(new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.12, 0.26, 3, 0.03), plastic), xFw + 0.18, yAF - 0.02, zIn - 0.2);
    const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.24, 12), plastic);
    duct.rotation.x = Math.PI / 2;
    add(duct, xFw + 0.18, yAF - 0.03, zIn * 0.35);
  }
  // навесное спереди мотора: шкивы и ремень, генератор
  const xFront = ex + lx / 2 + 0.03;
  const pul = [[yBot + 0.15, 0, 0.07], [yBot + 0.08 + h * 0.85, -lz * 0.22, 0.05], [yBot + 0.08 + h * 0.65, lz * 0.25, 0.055]];
  for (const [y, z, r] of pul) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 18), alu);
    p.rotation.z = Math.PI / 2;
    add(p, xFront, y, z);
  }
  {
    const pts = pul.map(([y, z]) => new THREE.Vector3(xFront, y, z));
    const belt = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 24, 0.008, 4, true), S.hose);
    add(belt, 0, 0, 0);
    const alt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 14), alu);
    alt.rotation.z = Math.PI / 2;
    add(alt, xFront - 0.07, pul[2][0], pul[2][1]);
  }
  // аккумулятор у брызговика, клеммы
  const bx = xFw + 0.16,
    bz = -(zIn - 0.12);
  const bH = Math.min(0.17, roomH * 0.45, hood(bx, Math.abs(bz) + 0.08) - yBot - 0.08);
  add(new THREE.Mesh(new RoundedBoxGeometry(0.2, bH, 0.15, 2, 0.01), S.battery), bx, yBot + 0.02 + bH / 2, bz);
  const bt = yBot + 0.02 + bH + 0.012;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.025, 8), S.redT), bx + 0.06, bt, bz + 0.04);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.025, 8), S.black), bx - 0.06, bt, bz + 0.04);
  // бачки: охлаждающая жидкость, омыватель, тормозная
  const tankM = new THREE.MeshPhysicalMaterial({ color: 0xf0ece0, roughness: 0.35, transmission: 0, transparent: true, opacity: 0.88 });
  add(new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.13, 0.1, 2, 0.02), tankM), xRad - 0.18, Math.min(hood(xRad - 0.18, zIn - 0.05) - 0.08, yBot + 0.24), zIn - 0.1);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 10), new THREE.MeshStandardMaterial({ color: 0x2a6ad0, roughness: 0.5 })), xRad - 0.18, Math.min(hood(xRad - 0.18, zIn - 0.05) - 0.01, yBot + 0.315), zIn - 0.1);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 12), tankM), xFw + 0.08, Math.min(hood(xFw + 0.08, zIn - 0.22) - 0.07, yBot + 0.32), -(zIn - 0.25));
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10), new THREE.MeshStandardMaterial({ color: 0xe8c020, roughness: 0.5 })), xFw + 0.08, Math.min(hood(xFw + 0.08, zIn - 0.22) - 0.02, yBot + 0.37), -(zIn - 0.25));
  // патрубки к радиатору
  for (const [y0, y1, z] of [[yC - 0.04, yRadT - 0.08, lz * 0.1], [yBot + 0.12, yBot + 0.1, -lz * 0.15]]) {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(ex + lx / 2 - 0.02, y0, z), new THREE.Vector3((ex + lx / 2 + xRad) / 2, (y0 + y1) / 2 + 0.03, z * 1.3), new THREE.Vector3(xRad - 0.03, y1, z * 1.6)]);
    add(new THREE.Mesh(new THREE.TubeGeometry(c, 12, 0.022, 8), S.hose), 0, 0, 0);
  }
  // щуп масла (жёлтое кольцо)
  add(new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 12), new THREE.MeshStandardMaterial({ color: 0xf0c020, roughness: 0.4 })), ex - lx * 0.3, yC + 0.04, -lz * 0.3);
  g.userData = { block, cover, center: new THREE.Vector3(ex, yC, 0) };
  return g;
}

// нормаль/слияние — для совместимости
export { mergeGeometries };

// ---------- каркас капота изнутри: рамка по краю и косынки, повторяет форму капота ----------
export function hoodFrame(shape, spec, mat) {
  const L = shape.L;
  const x0 = spec.parts.hood * L + 0.07,
    x1 = Math.min(spec.parts.bf * L, L - 0.1) - 0.07;
  if (x1 - x0 < 0.25) return null;
  const zE = (x) => {
    let z = 0;
    for (const p of shape.section(x)) if (p[2] >= 4) z = Math.max(z, p[0]);
    return Math.max(0.12, z - 0.08);
  };
  const P = (x, z) => new THREE.Vector3(x, topAt(shape, x, z) - 0.008, z);
  const prof = [[-0.024, -0.02], [0.024, -0.02], [0.024, 0], [-0.024, 0]];
  const N = 12;
  const loop = [];
  for (let k = 0; k <= N; k++) {
    const x = lerp(x0, x1, k / N);
    loop.push(P(x, -zE(x)));
  }
  for (let k = 1; k <= 6; k++) loop.push(P(x1, lerp(-zE(x1), zE(x1), k / 6)));
  for (let k = N - 1; k >= 0; k--) {
    const x = lerp(x0, x1, k / N);
    loop.push(P(x, zE(x)));
  }
  for (let k = 1; k <= 6; k++) loop.push(P(x0, lerp(zE(x0), -zE(x0), k / 6)));
  const parts = [sweep(loop, prof, false)];
  for (const sd of [-1, 1]) {
    const d = [];
    for (let k = 0; k <= N; k++) {
      const x = lerp(x0, x1, k / N);
      d.push(P(x, sd * zE(x) * (1 - (2 * k) / N)));
    }
    parts.push(sweep(d, prof, true));
  }
  const m = new THREE.Mesh(mergeGeometries(parts.map((g) => g.toNonIndexed())), mat);
  m.castShadow = true;
  return m;
}
