// Наклейки по форме кузова: фары, фонари, решётки, поворотники, молдинги. Участок поверхности кузова
// вырезается выпуклым контуром (в проекции вдоль оси), слегка поднимается над краской и покрывается
// нарисованной текстурой — поэтому детали точно повторяют изгиб кузова и выглядят аккуратно.
import * as THREE from 'three';

// контуры в 2D
export function rrect(cx, cy, w, h, r, n = 5) {
  r = Math.min(r, w / 2, h / 2);
  const pts = [];
  const corner = (x, y, a0) => {
    for (let k = 0; k <= n; k++) {
      const a = a0 + (k / n) * (Math.PI / 2);
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
  };
  corner(cx + w / 2 - r, cy + h / 2 - r, 0);
  corner(cx - w / 2 + r, cy + h / 2 - r, Math.PI / 2);
  corner(cx - w / 2 + r, cy - h / 2 + r, Math.PI);
  corner(cx + w / 2 - r, cy - h / 2 + r, (Math.PI * 3) / 2);
  return pts;
}
export function circle(cx, cy, r, n = 32) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}
// выпуклая оболочка (для произвольных контуров фар)
export function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [],
    up = [];
  for (const q of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
// обход против часовой стрелки
function ccw(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i],
      q = poly[(i + 1) % poly.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a < 0 ? poly.slice().reverse() : poly;
}

// g — сетка кузова (rows, nrm), cls — классы ячеек; o: { axis: '+x'|'-x'|'+z'|'-z', poly, off, L }
export function decalGeo(g, cls, o) {
  const poly = ccw(o.poly);
  const NXc = g.rows.length - 1;
  const ax = o.axis;
  const L = o.L;
  const proj = (v) => (ax === '+y' ? [v.x, v.z] : ax === '+x' || ax === '-x' ? [ax === '+x' ? -v.z : v.z, v.y] : [ax === '+z' ? v.x : -v.x, v.y]);
  const okN = (n, v) => {
    if (ax === '+x') return n.x > 0.15 && v.x > L * 0.55;
    if (ax === '-x') return n.x < -0.15 && v.x < L * 0.45;
    if (ax === '+z') return n.z > 0.2;
    if (ax === '+y') return n.y > 0.35;
    return n.z < -0.2;
  };
  let minA = Infinity,
    minB = Infinity,
    maxA = -Infinity,
    maxB = -Infinity;
  for (const [a, b] of poly) {
    minA = Math.min(minA, a);
    maxA = Math.max(maxA, a);
    minB = Math.min(minB, b);
    maxB = Math.max(maxB, b);
  }
  const P = [],
    N = [],
    U = [];
  const off = o.off ?? 0.003;
  const clipTri = (tri) => {
    let pts = tri;
    for (let e = 0; e < poly.length && pts.length; e++) {
      const A = poly[e],
        B = poly[(e + 1) % poly.length];
      const side = (q) => (B[0] - A[0]) * (q.p2[1] - A[1]) - (B[1] - A[1]) * (q.p2[0] - A[0]);
      const out = [];
      for (let i = 0; i < pts.length; i++) {
        const c = pts[i],
          d = pts[(i + 1) % pts.length];
        const sc = side(c),
          sd = side(d);
        if (sc >= 0) out.push(c);
        if (sc >= 0 !== sd >= 0) {
          const t = sc / (sc - sd);
          out.push({
            p: c.p.clone().lerp(d.p, t),
            n: c.n.clone().lerp(d.n, t),
            p2: [c.p2[0] + (d.p2[0] - c.p2[0]) * t, c.p2[1] + (d.p2[1] - c.p2[1]) * t],
          });
        }
      }
      pts = out;
    }
    for (let i = 1; i + 1 < pts.length; i++)
      for (const q of [pts[0], pts[i], pts[i + 1]]) {
        const n = q.n.clone().normalize();
        const p = q.p.clone().addScaledVector(n, off);
        P.push(p.x, p.y, p.z);
        N.push(n.x, n.y, n.z);
        U.push((q.p2[0] - minA) / (maxA - minA), (q.p2[1] - minB) / (maxB - minB));
      }
  };
  const V = (i, j) => {
    const r = g.rows[i][j],
      n = g.nrm[i][j];
    const p = new THREE.Vector3(r.x, r.y, r.z);
    return { p, n: n.clone(), p2: proj(p) };
  };
  for (let i = 0; i < NXc; i++)
    for (let j = 0; j < g.M - 1; j++) {
      const c = cls[i][j];
      if (!c || c === 'under' || c.startsWith('glass')) continue;
      const a = V(i, j),
        b = V(i + 1, j),
        cc = V(i, j + 1),
        d = V(i + 1, j + 1);
      const nn = a.n.clone().add(d.n);
      if (!okN(nn.normalize(), a.p)) continue;
      const qa = [a, b, cc, d];
      if (Math.max(...qa.map((q) => q.p2[0])) < minA || Math.min(...qa.map((q) => q.p2[0])) > maxA) continue;
      if (Math.max(...qa.map((q) => q.p2[1])) < minB || Math.min(...qa.map((q) => q.p2[1])) > maxB) continue;
      // треугольники с той же ориентацией, что и кузов
      for (const tri of [[a, b, cc], [cc, b, d]]) {
        // при проекции вид может зеркалиться — порядок вершин сохраняем как в кузове
        clipTri(tri);
      }
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  return geo;
}

// ---------- нарисованные текстуры ----------
const TEX = {};
function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  draw(x, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const rr = (x, X, Y, W, H, R) => {
  x.beginPath();
  x.roundRect(X, Y, W, H, R);
};
export function tex(kind) {
  if (TEX[kind]) return TEX[kind];
  let t;
  switch (kind) {
    case 'headRound':
      t = canvas(128, 128, (x, w) => {
        const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.18, '#f4f6fa');
        g.addColorStop(0.2, '#8a9098');
        g.addColorStop(0.5, '#e8ecf2');
        g.addColorStop(0.85, '#b8bec8');
        g.addColorStop(1, '#6a7078');
        x.fillStyle = g;
        x.fillRect(0, 0, w, w);
        x.strokeStyle = 'rgba(255,255,255,.55)';
        x.lineWidth = 1.5;
        for (let k = 1; k < 7; k++) {
          x.beginPath();
          x.arc(64, 64, 14 + k * 7, 0, Math.PI * 2);
          x.stroke();
        }
        x.strokeStyle = 'rgba(120,130,140,.35)';
        for (let k = 0; k < 10; k++) {
          x.beginPath();
          x.moveTo(64 - 60, 20 + k * 9);
          x.lineTo(64 + 60, 20 + k * 9);
          x.stroke();
        }
      });
      break;
    case 'headRect':
      t = canvas(256, 96, (x, w, h) => {
        const g = x.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#dfe4ec');
        g.addColorStop(0.5, '#ffffff');
        g.addColorStop(1, '#a8b0bc');
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
        x.strokeStyle = 'rgba(110,120,135,.45)';
        x.lineWidth = 2;
        for (let k = 1; k < 16; k++) {
          x.beginPath();
          x.moveTo((k * w) / 16, 0);
          x.lineTo((k * w) / 16, h);
          x.stroke();
        }
        for (let k = 1; k < 5; k++) {
          x.beginPath();
          x.moveTo(0, (k * h) / 5);
          x.lineTo(w, (k * h) / 5);
          x.stroke();
        }
        const rg = x.createRadialGradient(w * 0.3, h / 2, 2, w * 0.3, h / 2, h * 0.42);
        rg.addColorStop(0, '#fff');
        rg.addColorStop(0.5, '#cfd6e0');
        rg.addColorStop(1, 'rgba(160,170,185,0)');
        x.fillStyle = rg;
        x.fillRect(0, 0, w, h);
      });
      break;
    case 'headSport':
      t = canvas(256, 96, (x, w, h) => {
        x.fillStyle = '#1a1c20';
        x.fillRect(0, 0, w, h);
        const g = x.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#3a3e46');
        g.addColorStop(1, '#101114');
        x.fillStyle = g;
        rr(x, 4, 4, w - 8, h - 8, 18);
        x.fill();
        for (const cx of [w * 0.3, w * 0.62]) {
          const rg = x.createRadialGradient(cx, h * 0.5, 2, cx, h * 0.5, h * 0.34);
          rg.addColorStop(0, '#ffffff');
          rg.addColorStop(0.35, '#e8eef8');
          rg.addColorStop(0.62, '#9aa4b4');
          rg.addColorStop(0.7, '#2a2e36');
          rg.addColorStop(1, '#1a1c20');
          x.fillStyle = rg;
          x.beginPath();
          x.arc(cx, h * 0.5, h * 0.34, 0, Math.PI * 2);
          x.fill();
          x.strokeStyle = '#c8ccd4';
          x.lineWidth = 3;
          x.stroke();
        }
        // ходовые огни
        x.fillStyle = '#eaf4ff';
        rr(x, w * 0.08, h * 0.8, w * 0.84, 6, 3);
        x.fill();
      });
      break;
    case 'tail':
      t = canvas(256, 96, (x, w, h) => {
        x.fillStyle = '#5a0006';
        x.fillRect(0, 0, w, h);
        const segs = [['#c8101a', 0.6], ['#c8101a', 0.25], ['#f4f4f4', 0.15]];
        let X = 0;
        for (const [c, f] of segs) {
          const g = x.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, c === '#f4f4f4' ? '#ffffff' : '#ff3a3a');
          g.addColorStop(0.5, c);
          g.addColorStop(1, c === '#f4f4f4' ? '#c8c8c8' : '#7a0008');
          x.fillStyle = g;
          x.fillRect(X + 3, 4, w * f - 6, h - 8);
          // рифление
          x.strokeStyle = 'rgba(255,255,255,.18)';
          x.lineWidth = 2;
          for (let k = 6; k < w * f - 6; k += 9) {
            x.beginPath();
            x.moveTo(X + k, 6);
            x.lineTo(X + k, h - 6);
            x.stroke();
          }
          X += w * f;
        }
      });
      break;
    case 'tailRound':
      t = canvas(128, 128, (x, w) => {
        const g = x.createRadialGradient(64, 54, 4, 64, 64, 64);
        g.addColorStop(0, '#ff8080');
        g.addColorStop(0.35, '#e01a22');
        g.addColorStop(1, '#6a0008');
        x.fillStyle = g;
        x.fillRect(0, 0, w, w);
        x.strokeStyle = 'rgba(255,200,200,.35)';
        for (let k = 1; k < 6; k++) {
          x.beginPath();
          x.arc(64, 64, k * 10, 0, Math.PI * 2);
          x.stroke();
        }
      });
      break;
    case 'amber':
      t = canvas(64, 32, (x, w, h) => {
        const g = x.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#ffd27a');
        g.addColorStop(0.5, '#ff9a1a');
        g.addColorStop(1, '#b85a00');
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
        x.strokeStyle = 'rgba(255,255,255,.3)';
        for (let k = 4; k < w; k += 6) {
          x.beginPath();
          x.moveTo(k, 0);
          x.lineTo(k, h);
          x.stroke();
        }
      });
      break;
    case 'grilleChrome':
      t = canvas(256, 64, (x, w, h) => {
        x.fillStyle = '#0c0c0e';
        x.fillRect(0, 0, w, h);
        for (let k = 0; k < 6; k++) {
          const y = 5 + k * ((h - 10) / 5.5);
          const g = x.createLinearGradient(0, y, 0, y + 6);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.5, '#9aa0a8');
          g.addColorStop(1, '#e8ecf0');
          x.fillStyle = g;
          x.fillRect(4, y, w - 8, 5);
        }
        x.strokeStyle = '#e8ecf0';
        x.lineWidth = 5;
        x.strokeRect(2.5, 2.5, w - 5, h - 5);
      });
      break;
    case 'grilleBars':
      t = canvas(256, 64, (x, w, h) => {
        x.fillStyle = '#0a0a0c';
        x.fillRect(0, 0, w, h);
        for (let k = 0; k < 5; k++) {
          const y = 6 + k * ((h - 12) / 4.5);
          x.fillStyle = '#2c2e34';
          x.fillRect(3, y, w - 6, 5);
          x.fillStyle = '#4a4e56';
          x.fillRect(3, y, w - 6, 1.5);
        }
      });
      break;
    case 'grilleMesh':
      t = canvas(256, 64, (x, w, h) => {
        x.fillStyle = '#060607';
        x.fillRect(0, 0, w, h);
        x.strokeStyle = '#3a3c42';
        x.lineWidth = 2;
        const s = 9;
        for (let r = 0; r * s * 0.86 < h + s; r++)
          for (let c = 0; c * s * 1.5 < w + s; c++) {
            const cx = c * s * 1.5,
              cy = r * s * 0.86 * 2 + (c % 2) * s * 0.86;
            x.beginPath();
            for (let k = 0; k < 6; k++) {
              const a = (k / 6) * Math.PI * 2;
              x.lineTo(cx + Math.cos(a) * s * 0.9, cy + Math.sin(a) * s * 0.9);
            }
            x.closePath();
            x.stroke();
          }
      });
      break;
    case 'trim':
      t = canvas(64, 16, (x, w, h) => {
        const g = x.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.45, '#a8aeb6');
        g.addColorStop(0.55, '#6a7078');
        g.addColorStop(1, '#f0f2f4');
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
      });
      break;
    case 'backGlass':
      t = canvas(64, 64, (x, w, h) => {
        const g = x.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#3a4a58');
        g.addColorStop(0.5, '#141c24');
        g.addColorStop(1, '#0a0e12');
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
      });
      break;
    case 'stripe':
      t = canvas(16, 16, (x) => {
        x.fillStyle = '#ffffff';
        x.fillRect(0, 0, 16, 16);
      });
      break;
    case 'rubber':
      t = canvas(16, 16, (x) => {
        x.fillStyle = '#141416';
        x.fillRect(0, 0, 16, 16);
      });
      break;
  }
  TEX[kind] = t;
  return t;
}

const MAT = {};
export function decalMat(kind) {
  if (MAT[kind]) return MAT[kind];
  const lamp = kind.startsWith('head');
  const tail = kind.startsWith('tail') || kind === 'amber';
  const chrome = kind === 'grilleChrome' || kind === 'trim';
  if (kind === 'backGlass') {
    const g = new THREE.MeshPhysicalMaterial({ map: tex(kind), roughness: 0.04, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    MAT[kind] = g;
    return g;
  }
  if (kind === 'stripe') {
    const g = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    MAT[kind] = g;
    return g;
  }
  const m = new THREE.MeshPhysicalMaterial({
    map: tex(kind),
    roughness: lamp ? 0.12 : tail ? 0.2 : chrome ? 0.18 : 0.55,
    metalness: lamp ? 0.6 : chrome ? 0.9 : 0.1,
    clearcoat: lamp || tail ? 1 : 0,
    clearcoatRoughness: 0.03,
    emissiveMap: lamp || tail ? tex(kind) : null,
    emissive: lamp ? 0x404040 : tail ? 0x2a0a0a : 0x000000,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  MAT[kind] = m;
  return m;
}
