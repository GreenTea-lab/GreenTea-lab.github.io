// Предметы на брусках: объёмные рисунки с естественными бликами, без светлой каймы.
// Рисуются в единичных координатах (предмет умещается примерно в -1..1), без подложек и кружков.
import { mix, canvas } from './gfx.js';
import {itemArt} from './item-art.js';

const P2 = Math.PI * 2;
const dk = (c, t = 0.62) => mix(c, '#2a1206', t);
const lt = (c, t = 0.45) => mix(c, '#ffffff', t);

const lin = (g, x0, y0, x1, y1, stops) => {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
};
const rad = (g, x, y, r0, x1, y1, r1, stops) => {
  const gr = g.createRadialGradient(x, y, r0, x1, y1, r1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
};
const ell = (g, x, y, rx, ry, rot = 0) => {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, P2);
};
const circ = (g, x, y, r) => {
  g.beginPath();
  g.arc(x, y, r, 0, P2);
};
// залить и обвести контуром тёмного оттенка
const paint = (g, fill, line, w = 0.065) => {
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = line;
  g.lineWidth = w;
  g.stroke();
};
const shine = (g, x, y, rx, ry, rot = -0.5, a = 0.55) => {
  ell(g, x, y, rx, ry, rot);
  g.fillStyle = `rgba(255,255,255,${a})`;
  g.fill();
};
// тень на правой/нижней стороне внутри текущего контура
const shadeSide = (g, a = 0.2, col = '60,10,0') => {
  g.save();
  g.clip();
  g.fillStyle = `rgba(${col},${a})`;
  g.beginPath();
  g.moveTo(0.1, -2);
  g.lineTo(2, -2);
  g.lineTo(2, 2);
  g.lineTo(-0.35, 2);
  g.closePath();
  g.fill();
  g.restore();
};
const poly = (g, pts, k = 1) => {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)));
  g.closePath();
};
// звезда со скруглёнными лучами: контур и заливка
function roundStar(g, n, ro, ri, rot, fill, mid, line, round = 0.12) {
  const p = () => {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i * Math.PI) / n;
      const r = i % 2 ? ri : ro;
      i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
  };
  p();
  g.strokeStyle = line;
  g.lineWidth = round * 2 + 0.07;
  g.stroke();
  g.strokeStyle = mid;
  g.lineWidth = round * 2;
  g.stroke();
  p();
  g.fillStyle = fill;
  g.fill();
}
const quad = (a, b, c, t) => {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]];
};

const ART = {
  // ---------- осень ----------
  leaf(g) {
    const pts = [[0, -1], [0.2, -0.58], [0.6, -0.78], [0.5, -0.3], [0.97, -0.14], [0.56, 0.12], [0.64, 0.5], [0.2, 0.34], [0.06, 0.66], [-0.06, 0.66], [-0.2, 0.34], [-0.64, 0.5], [-0.56, 0.12], [-0.97, -0.14], [-0.5, -0.3], [-0.6, -0.78], [-0.2, -0.58]];
    // черешок
    g.beginPath();
    g.moveTo(0, 0.5);
    g.quadraticCurveTo(0.04, 0.85, -0.1, 1.0);
    g.strokeStyle = '#4a2410';
    g.lineWidth = 0.17;
    g.stroke();
    g.strokeStyle = '#a0582a';
    g.lineWidth = 0.09;
    g.stroke();
    poly(g, pts, 0.96);
    g.fillStyle = lin(g, -0.5, -0.9, 0.6, 0.7, [[0, '#ffd84a'], [0.45, '#f39a24'], [1, '#c8331a']]);
    g.fill();
    g.strokeStyle = '#7a2410';
    g.lineWidth = 0.07;
    g.stroke();
    shadeSide(g, 0.16);
    poly(g, pts, 0.96);
    g.save();
    g.clip();
    g.strokeStyle = 'rgba(255,238,160,.8)';
    g.lineWidth = 0.04;
    g.beginPath();
    g.moveTo(0, 0.7);
    g.lineTo(0, -0.7);
    for (const sx of [-1, 1]) {
      g.moveTo(0, 0.25);
      g.lineTo(sx * 0.58, 0.38);
      g.moveTo(0, 0.0);
      g.lineTo(sx * 0.78, -0.1);
      g.moveTo(0, -0.22);
      g.lineTo(sx * 0.5, -0.62);
    }
    g.stroke();
    g.restore();
    shine(g, -0.3, -0.45, 0.07, 0.16, 0.6, 0.45);
  },
  acorn(g) {
    // орех
    g.beginPath();
    g.moveTo(0, 0.98);
    g.bezierCurveTo(-0.62, 0.7, -0.66, 0.1, -0.6, -0.12);
    g.lineTo(0.6, -0.12);
    g.bezierCurveTo(0.66, 0.1, 0.62, 0.7, 0, 0.98);
    g.closePath();
    paint(g, lin(g, -0.5, 0, 0.6, 0.9, [[0, '#f2c274'], [0.5, '#cf8a3a'], [1, '#8f5220']]), '#5a2f10');
    shadeSide(g, 0.14);
    shine(g, -0.28, 0.32, 0.09, 0.3, 0.12, 0.5);
    // шапочка
    g.beginPath();
    g.moveTo(-0.82, -0.08);
    g.bezierCurveTo(-0.92, -0.62, -0.5, -0.9, 0, -0.9);
    g.bezierCurveTo(0.5, -0.9, 0.92, -0.62, 0.82, -0.08);
    g.quadraticCurveTo(0, 0.12, -0.82, -0.08);
    g.closePath();
    g.fillStyle = lin(g, 0, -0.9, 0, 0.1, [[0, '#a8703a'], [1, '#6a3d18']]);
    g.fill();
    g.save();
    g.clip();
    // чешуйки шапочки
    g.strokeStyle = 'rgba(40,18,4,.55)';
    g.lineWidth = 0.04;
    for (let r = 0; r < 4; r++) {
      const y = -0.75 + r * 0.2;
      for (let c = -5; c <= 5; c++) {
        const x = c * 0.27 + (r % 2) * 0.135;
        g.beginPath();
        g.arc(x, y, 0.13, 0.15, Math.PI - 0.15);
        g.stroke();
      }
    }
    g.fillStyle = 'rgba(255,230,180,.2)';
    ell(g, -0.28, -0.6, 0.3, 0.12, -0.3);
    g.fill();
    g.restore();
    g.beginPath();
    g.moveTo(-0.82, -0.08);
    g.bezierCurveTo(-0.92, -0.62, -0.5, -0.9, 0, -0.9);
    g.bezierCurveTo(0.5, -0.9, 0.92, -0.62, 0.82, -0.08);
    g.quadraticCurveTo(0, 0.12, -0.82, -0.08);
    g.closePath();
    g.strokeStyle = '#4a2410';
    g.lineWidth = 0.07;
    g.stroke();
    // плодоножка
    g.beginPath();
    g.moveTo(0, -0.88);
    g.quadraticCurveTo(0.04, -1.0, 0.16, -1.04);
    g.strokeStyle = '#4a2410';
    g.lineWidth = 0.15;
    g.stroke();
    g.strokeStyle = '#8a5a2a';
    g.lineWidth = 0.07;
    g.stroke();
  },
  mushroom(g) {
    // травка
    g.strokeStyle = '#3f7a2a';
    g.lineWidth = 0.07;
    g.beginPath();
    [-0.55, -0.4, 0.4, 0.55].forEach((x) => {
      g.moveTo(x, 0.95);
      g.quadraticCurveTo(x + Math.sign(x) * 0.02, 0.8, x + Math.sign(x) * 0.12, 0.72);
    });
    g.stroke();
    // ножка
    g.beginPath();
    g.moveTo(-0.3, 0.0);
    g.bezierCurveTo(-0.28, 0.5, -0.4, 0.78, -0.42, 0.92);
    g.quadraticCurveTo(0, 1.04, 0.42, 0.92);
    g.bezierCurveTo(0.4, 0.78, 0.28, 0.5, 0.3, 0.0);
    g.closePath();
    paint(g, lin(g, -0.4, 0, 0.4, 0, [[0, '#fff4de'], [0.6, '#f0dcb8'], [1, '#c8a878']]), '#6a4a2a');
    // юбочка
    g.beginPath();
    ell(g, 0, 0.12, 0.34, 0.09);
    paint(g, '#f3e2c2', '#6a4a2a', 0.05);
    // шляпка
    g.beginPath();
    g.moveTo(-0.98, 0.08);
    g.bezierCurveTo(-1.0, -0.6, -0.5, -0.98, 0, -0.98);
    g.bezierCurveTo(0.5, -0.98, 1.0, -0.6, 0.98, 0.08);
    g.quadraticCurveTo(0, 0.28, -0.98, 0.08);
    g.closePath();
    g.fillStyle = rad(g, -0.3, -0.5, 0.05, 0, -0.1, 1.2, [[0, '#ff7a5c'], [0.55, '#e0372a'], [1, '#a31a18']]);
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = 'rgba(70,0,0,.2)';
    ell(g, 0, 0.18, 1.1, 0.2);
    g.fill();
    // пятна
    g.fillStyle = '#fffdf4';
    g.strokeStyle = 'rgba(120,70,50,.45)';
    g.lineWidth = 0.025;
    [[-0.52, -0.2, 0.17, 0.13], [0.0, -0.58, 0.2, 0.15], [0.52, -0.22, 0.15, 0.12], [-0.05, -0.08, 0.1, 0.08], [-0.78, 0.0, 0.09, 0.07], [0.8, -0.02, 0.09, 0.07], [0.3, -0.32, 0.07, 0.06]].forEach(([x, y, rx, ry]) => {
      ell(g, x, y, rx, ry, 0.2);
      g.fill();
      g.stroke();
    });
    g.restore();
    g.beginPath();
    g.moveTo(-0.98, 0.08);
    g.bezierCurveTo(-1.0, -0.6, -0.5, -0.98, 0, -0.98);
    g.bezierCurveTo(0.5, -0.98, 1.0, -0.6, 0.98, 0.08);
    g.quadraticCurveTo(0, 0.28, -0.98, 0.08);
    g.closePath();
    g.strokeStyle = '#6a1210';
    g.lineWidth = 0.07;
    g.stroke();
    shine(g, -0.46, -0.66, 0.2, 0.07, -0.55, 0.5);
  },
  // ---------- зима ----------
  snowflake(g) {
    const glow = rad(g, 0, 0, 0.1, 0, 0, 1.05, [[0, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']]);
    g.fillStyle = glow;
    circ(g, 0, 0, 1.05);
    g.fill();
    const arms = (w, col) => {
      g.strokeStyle = col;
      g.lineWidth = w;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        g.save();
        g.rotate((k * Math.PI) / 3);
        g.moveTo(0, 0);
        g.lineTo(0, -0.92);
        for (const [y, l] of [[-0.66, 0.3], [-0.38, 0.22]]) {
          g.moveTo(0, y);
          g.lineTo(l * 0.8, y - l * 0.75);
          g.moveTo(0, y);
          g.lineTo(-l * 0.8, y - l * 0.75);
        }
        g.restore();
      }
      g.stroke();
    };
    arms(0.25, '#1f4f9a');
    arms(0.14, '#7fb9f5');
    arms(0.05, '#f2faff');
    // ромбики на концах
    for (let k = 0; k < 6; k++) {
      g.save();
      g.rotate((k * Math.PI) / 3);
      poly(g, [[0, -1.0], [0.1, -0.9], [0, -0.78], [-0.1, -0.9]]);
      paint(g, '#e4f3ff', '#1f4f9a', 0.05);
      g.restore();
    }
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      k ? g.lineTo(Math.cos(a) * 0.2, Math.sin(a) * 0.2) : g.moveTo(Math.cos(a) * 0.2, Math.sin(a) * 0.2);
    }
    g.closePath();
    paint(g, '#ffffff', '#2a6ac0', 0.05);
  },
  mitten(g) {
    const body = () => {
      g.beginPath();
      g.moveTo(-0.52, 0.5);
      g.lineTo(-0.58, -0.18);
      g.bezierCurveTo(-0.6, -0.78, -0.2, -0.98, 0.1, -0.98);
      g.bezierCurveTo(0.5, -0.98, 0.6, -0.55, 0.52, -0.1);
      g.bezierCurveTo(0.75, -0.32, 1.02, -0.28, 0.98, 0.04);
      g.bezierCurveTo(0.94, 0.3, 0.66, 0.42, 0.52, 0.42);
      g.lineTo(0.52, 0.5);
      g.closePath();
    };
    body();
    g.fillStyle = lin(g, -0.6, -1, 0.8, 0.5, [[0, '#ff6a5a'], [0.5, '#e03c34'], [1, '#a9231f']]);
    g.fill();
    g.save();
    g.clip();
    // вязка «ёлочкой»
    g.strokeStyle = 'rgba(255,200,190,.28)';
    g.lineWidth = 0.035;
    for (let y = -1; y < 0.5; y += 0.12) {
      for (let x = -0.7; x < 1.05; x += 0.12) {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + 0.06, y + 0.1);
        g.lineTo(x + 0.12, y);
        g.stroke();
      }
    }
    // узор: снежинки-ромбы
    g.fillStyle = '#fff4e6';
    [[-0.12, -0.55], [-0.12, -0.1], [-0.12, 0.28]].forEach(([x, y]) => {
      poly(g, [[x, y - 0.15], [x + 0.13, y], [x, y + 0.15], [x - 0.13, y]]);
      g.fill();
    });
    g.fillRect(-0.62, -0.32, 1.2, 0.05);
    g.fillRect(-0.62, 0.1, 1.2, 0.05);
    g.restore();
    body();
    g.strokeStyle = '#6a1412';
    g.lineWidth = 0.07;
    g.stroke();
    // манжета
    g.beginPath();
    g.moveTo(-0.62, 0.42);
    g.lineTo(0.62, 0.42);
    g.lineTo(0.58, 0.9);
    g.lineTo(-0.58, 0.9);
    g.closePath();
    g.fillStyle = lin(g, 0, 0.42, 0, 0.9, [[0, '#fff6e6'], [1, '#e8d2b0']]);
    g.fill();
    g.strokeStyle = 'rgba(120,80,40,.5)';
    g.lineWidth = 0.035;
    g.beginPath();
    for (let x = -0.5; x <= 0.5; x += 0.14) {
      g.moveTo(x, 0.46);
      g.lineTo(x * 0.96, 0.88);
    }
    g.stroke();
    g.beginPath();
    g.moveTo(-0.62, 0.42);
    g.lineTo(0.62, 0.42);
    g.lineTo(0.58, 0.9);
    g.lineTo(-0.58, 0.9);
    g.closePath();
    g.strokeStyle = '#6a4a2a';
    g.lineWidth = 0.07;
    g.stroke();
    shine(g, -0.3, -0.62, 0.08, 0.2, 0.35, 0.4);
  },
  ornament(g) {
    // шапочка и петля
    g.beginPath();
    g.arc(0, -0.95, 0.15, Math.PI * 0.1, Math.PI * 2.9);
    g.strokeStyle = '#7a5a10';
    g.lineWidth = 0.1;
    g.stroke();
    g.strokeStyle = '#f2c94c';
    g.lineWidth = 0.04;
    g.stroke();
    roundRectPath(g, -0.2, -0.84, 0.4, 0.22, 0.05);
    paint(g, lin(g, -0.2, 0, 0.2, 0, [[0, '#ffe58a'], [0.5, '#e0aa28'], [1, '#a8780f']]), '#6a4a08', 0.05);
    // шар
    circ(g, 0, 0.12, 0.8);
    g.fillStyle = rad(g, -0.3, -0.25, 0.06, 0, 0.12, 0.85, [[0, '#ff8a78'], [0.5, '#d92a2c'], [1, '#8f1018']]);
    g.fill();
    g.save();
    g.clip();
    // золотая лента с точками
    g.beginPath();
    g.moveTo(-0.9, -0.02);
    g.quadraticCurveTo(0, 0.42, 0.9, -0.02);
    g.lineTo(0.9, 0.2);
    g.quadraticCurveTo(0, 0.64, -0.9, 0.2);
    g.closePath();
    g.fillStyle = lin(g, 0, 0, 0, 0.5, [[0, '#ffe58a'], [1, '#d99a1c']]);
    g.fill();
    g.fillStyle = '#fff6d0';
    for (let i = -3; i <= 3; i++) {
      const x = i * 0.24;
      circ(g, x, 0.2 + (0.42 - 0.02) * 0.5 * (1 - Math.pow(x / 0.9, 2)) * 0.55 + 0.02, 0.04);
      g.fill();
    }
    g.fillStyle = 'rgba(60,0,10,.22)';
    ell(g, 0.35, 0.55, 0.8, 0.5, -0.5);
    g.fill();
    g.restore();
    circ(g, 0, 0.12, 0.8);
    g.strokeStyle = '#5a0a12';
    g.lineWidth = 0.07;
    g.stroke();
    shine(g, -0.36, -0.28, 0.12, 0.2, 0.7, 0.7);
    shine(g, 0.4, 0.62, 0.05, 0.03, -0.6, 0.35);
  },
  // ---------- весна ----------
  tulip(g) {
    // стебель и листья
    g.beginPath();
    g.moveTo(0, 0.0);
    g.quadraticCurveTo(0.04, 0.5, 0, 1.0);
    g.strokeStyle = '#1f5a1a';
    g.lineWidth = 0.2;
    g.stroke();
    g.strokeStyle = '#5aa83a';
    g.lineWidth = 0.1;
    g.stroke();
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.moveTo(0, 0.95);
      g.bezierCurveTo(sx * 0.2, 0.55, sx * 0.62, 0.35, sx * 0.72, -0.08);
      g.bezierCurveTo(sx * 0.46, 0.18, sx * 0.14, 0.42, 0, 0.95);
      g.closePath();
      paint(g, lin(g, 0, 0.9, sx * 0.7, 0, [[0, '#2f7a2a'], [1, '#7cc95a']]), '#1f5a1a', 0.05);
    }
    // лепестки: задние, затем передний
    const petal = (cx, rot, w, col1, col2) => {
      g.save();
      g.translate(cx, 0.02);
      g.rotate(rot);
      g.beginPath();
      g.moveTo(0, 0.02);
      g.bezierCurveTo(-w * 0.9, -0.1, -w, -0.65, -w * 0.15, -0.98);
      g.bezierCurveTo(0, -0.88, 0, -0.88, w * 0.15, -0.98);
      g.bezierCurveTo(w, -0.65, w * 0.9, -0.1, 0, 0.02);
      g.closePath();
      paint(g, lin(g, 0, -1, 0, 0.05, [[0, col1], [1, col2]]), '#7a0f30', 0.06);
      g.restore();
    };
    petal(-0.3, -0.28, 0.42, '#ff8fb0', '#d81f58');
    petal(0.3, 0.28, 0.42, '#ff8fb0', '#d81f58');
    petal(0, 0, 0.5, '#ffb0c8', '#e83a70');
    g.strokeStyle = 'rgba(160,20,60,.4)';
    g.lineWidth = 0.035;
    g.beginPath();
    g.moveTo(0, -0.8);
    g.quadraticCurveTo(0.02, -0.4, 0, -0.05);
    g.stroke();
    shine(g, -0.18, -0.55, 0.06, 0.25, 0.1, 0.5);
  },
  daisy(g) {
    for (let k = 0; k < 14; k++) {
      g.save();
      g.rotate((k * P2) / 14);
      g.beginPath();
      g.moveTo(0, -0.28);
      g.bezierCurveTo(-0.17, -0.5, -0.15, -0.88, 0, -0.98);
      g.bezierCurveTo(0.15, -0.88, 0.17, -0.5, 0, -0.28);
      g.closePath();
      paint(g, lin(g, 0, -1, 0, -0.28, [[0, '#ffffff'], [1, '#ece4ce']]), 'rgba(120,96,60,.75)', 0.04);
      g.strokeStyle = 'rgba(150,120,80,.3)';
      g.lineWidth = 0.025;
      g.beginPath();
      g.moveTo(0, -0.36);
      g.lineTo(0, -0.86);
      g.stroke();
      g.restore();
    }
    circ(g, 0, 0, 0.34);
    paint(g, rad(g, -0.1, -0.1, 0.02, 0, 0, 0.36, [[0, '#ffe25a'], [0.7, '#f5b01e'], [1, '#c87e0a']]), '#8a560a', 0.06);
    g.fillStyle = 'rgba(120,70,10,.55)';
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4, rr = 0.05 + (i % 4) * 0.065;
      circ(g, Math.cos(a) * rr, Math.sin(a) * rr, 0.022);
      g.fill();
    }
    shine(g, -0.12, -0.14, 0.08, 0.04, -0.6, 0.55);
  },
  ladybug(g) {
    // ножки
    g.strokeStyle = '#1e1816';
    g.lineWidth = 0.08;
    g.beginPath();
    for (const sx of [-1, 1]) {
      [[-0.2, -0.35, -0.5], [0.12, -0.12, 0.05], [0.4, 0.5, 0.58]].forEach(([y, ex, ey], i) => {
        g.moveTo(sx * 0.55, y + 0.12);
        g.lineTo(sx * (0.8 + i * 0.03), y + (i - 1) * 0.12);
        g.lineTo(sx * (0.95 + i * 0.02), ey + 0.25);
      });
    }
    g.stroke();
    // усики
    g.beginPath();
    g.moveTo(-0.1, -0.7);
    g.quadraticCurveTo(-0.2, -0.95, -0.38, -0.92);
    g.moveTo(0.1, -0.7);
    g.quadraticCurveTo(0.2, -0.95, 0.38, -0.92);
    g.stroke();
    // голова
    g.beginPath();
    g.ellipse(0, -0.58, 0.34, 0.26, 0, 0, P2);
    paint(g, lin(g, 0, -0.85, 0, -0.3, [[0, '#4a423c'], [1, '#1a1412']]), '#0c0806', 0.05);
    g.fillStyle = '#fff';
    ell(g, -0.15, -0.6, 0.07, 0.09, 0.3);
    g.fill();
    ell(g, 0.15, -0.6, 0.07, 0.09, -0.3);
    g.fill();
    // панцирь
    g.beginPath();
    g.ellipse(0, 0.16, 0.74, 0.8, 0, 0, P2);
    g.fillStyle = rad(g, -0.25, -0.25, 0.05, 0, 0.16, 0.9, [[0, '#ff7a64'], [0.55, '#e0302a'], [1, '#9a1612']]);
    g.fill();
    g.strokeStyle = '#4a0c0a';
    g.lineWidth = 0.07;
    g.stroke();
    g.save();
    g.beginPath();
    g.ellipse(0, 0.16, 0.74, 0.8, 0, 0, P2);
    g.clip();
    g.strokeStyle = '#1e1816';
    g.lineWidth = 0.07;
    g.beginPath();
    g.moveTo(0, -0.64);
    g.lineTo(0, 1.0);
    g.stroke();
    g.fillStyle = '#1e1816';
    [[-0.38, -0.1, 0.14], [0.38, -0.1, 0.14], [-0.42, 0.4, 0.13], [0.42, 0.4, 0.13], [-0.16, 0.7, 0.1], [0.16, 0.7, 0.1], [0, 0.12, 0.0]].forEach(([x, y, r]) => {
      if (r) {
        circ(g, x, y, r);
        g.fill();
      }
    });
    g.restore();
    shine(g, -0.36, -0.28, 0.13, 0.07, -0.7, 0.6);
  },
  // ---------- лето ----------
  strawberry(g) {
    g.beginPath();
    g.moveTo(0, 0.98);
    g.bezierCurveTo(-0.5, 0.78, -1.0, 0.18, -0.86, -0.3);
    g.bezierCurveTo(-0.78, -0.62, -0.3, -0.62, 0, -0.52);
    g.bezierCurveTo(0.3, -0.62, 0.78, -0.62, 0.86, -0.3);
    g.bezierCurveTo(1.0, 0.18, 0.5, 0.78, 0, 0.98);
    g.closePath();
    g.fillStyle = rad(g, -0.3, -0.2, 0.05, 0, 0.1, 1.1, [[0, '#ff6a6e'], [0.5, '#e22a34'], [1, '#a50f1c']]);
    g.fill();
    g.strokeStyle = '#5a0710';
    g.lineWidth = 0.07;
    g.stroke();
    g.save();
    g.clip();
    // семечки в шахматном порядке
    for (let r = 0; r < 6; r++) {
      const y = -0.3 + r * 0.22;
      const n = r < 5 ? 4 - Math.floor(r / 3) + (r % 2) : 1;
      const wd = 0.78 - r * 0.1;
      for (let c = 0; c < n; c++) {
        const x = n === 1 ? 0 : -wd + (c * 2 * wd) / (n - 1);
        g.beginPath();
        g.ellipse(x, y, 0.045, 0.07, 0, 0, P2);
        g.fillStyle = '#ffe58a';
        g.fill();
        g.strokeStyle = 'rgba(120,20,10,.5)';
        g.lineWidth = 0.02;
        g.stroke();
      }
    }
    g.fillStyle = 'rgba(70,0,10,.22)';
    ell(g, 0.5, 0.35, 0.55, 0.9, 0.3);
    g.fill();
    g.restore();
    shine(g, -0.46, -0.1, 0.09, 0.22, 0.35, 0.5);
    // чашелистики
    for (let k = 0; k < 7; k++) {
      g.save();
      g.translate(0, -0.52);
      g.rotate(-1.35 + k * 0.45);
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(-0.14, -0.1, -0.12, -0.34, 0, -0.46);
      g.bezierCurveTo(0.12, -0.34, 0.14, -0.1, 0, 0);
      g.closePath();
      paint(g, lin(g, 0, 0, 0, -0.46, [[0, '#2f7a2a'], [1, '#6cbf48']]), '#1f5a1a', 0.045);
      g.restore();
    }
    g.beginPath();
    g.moveTo(0, -0.52);
    g.quadraticCurveTo(0.05, -0.85, 0.16, -0.98);
    g.strokeStyle = '#1f5a1a';
    g.lineWidth = 0.14;
    g.stroke();
    g.strokeStyle = '#5aa83a';
    g.lineWidth = 0.07;
    g.stroke();
  },
  cherry(g) {
    // черешки
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-0.42, 0.18);
    g.bezierCurveTo(-0.34, -0.3, -0.1, -0.7, 0.3, -0.92);
    g.moveTo(0.42, 0.12);
    g.bezierCurveTo(0.38, -0.3, 0.34, -0.7, 0.3, -0.92);
    g.strokeStyle = '#3a4a14';
    g.lineWidth = 0.13;
    g.stroke();
    g.strokeStyle = '#7fa83a';
    g.lineWidth = 0.06;
    g.stroke();
    // листок
    g.beginPath();
    g.moveTo(0.3, -0.92);
    g.bezierCurveTo(0.5, -1.1, 0.95, -1.0, 1.02, -0.72);
    g.bezierCurveTo(0.7, -0.62, 0.42, -0.74, 0.3, -0.92);
    g.closePath();
    paint(g, lin(g, 0.3, -1, 1, -0.7, [[0, '#3f8f35'], [1, '#86cf5a']]), '#1f5a1a', 0.05);
    g.strokeStyle = 'rgba(230,255,200,.6)';
    g.lineWidth = 0.025;
    g.beginPath();
    g.moveTo(0.32, -0.9);
    g.quadraticCurveTo(0.65, -0.88, 0.95, -0.76);
    g.stroke();
    // ягоды
    [[-0.44, 0.5], [0.44, 0.44]].forEach(([x, y]) => {
      circ(g, x, y, 0.46);
      g.fillStyle = rad(g, x - 0.16, y - 0.18, 0.03, x, y, 0.5, [[0, '#ff5a6a'], [0.5, '#c4122a'], [1, '#6a0816']]);
      g.fill();
      g.strokeStyle = '#4a0610';
      g.lineWidth = 0.07;
      g.stroke();
      g.beginPath();
      g.arc(x, y - 0.42, 0.1, 0.1, Math.PI - 0.1);
      g.strokeStyle = 'rgba(60,0,10,.5)';
      g.lineWidth = 0.05;
      g.stroke();
      shine(g, x - 0.17, y - 0.17, 0.09, 0.16, 0.6, 0.65);
    });
  },
  butterfly(g) {
    const wing = (sx) => {
      g.save();
      g.scale(sx, 1);
      // верхнее крыло
      g.beginPath();
      g.moveTo(0.06, -0.1);
      g.bezierCurveTo(0.3, -0.95, 0.98, -1.0, 1.0, -0.5);
      g.bezierCurveTo(1.02, -0.1, 0.5, 0.1, 0.06, 0.0);
      g.closePath();
      paint(g, rad(g, 0.12, -0.05, 0.05, 0.7, -0.5, 0.95, [[0, '#ffd84a'], [0.5, '#f6962a'], [1, '#d4501a']]), '#2a1608', 0.07);
      // нижнее крыло
      g.beginPath();
      g.moveTo(0.06, 0.0);
      g.bezierCurveTo(0.6, -0.04, 0.84, 0.4, 0.58, 0.72);
      g.bezierCurveTo(0.36, 0.92, 0.08, 0.6, 0.06, 0.0);
      g.closePath();
      paint(g, rad(g, 0.1, 0.1, 0.05, 0.4, 0.4, 0.7, [[0, '#ffe58a'], [0.6, '#f6b02e'], [1, '#e0701e']]), '#2a1608', 0.07);
      // узор: тёмная кайма и белые пятна
      g.fillStyle = 'rgba(40,20,8,.75)';
      [[0.86, -0.42, 0.1], [0.66, -0.78, 0.08]].forEach(([x, y, r]) => {
        circ(g, x, y, r);
        g.fill();
      });
      g.fillStyle = '#fffaf0';
      [[0.86, -0.42, 0.05], [0.66, -0.78, 0.04], [0.52, 0.55, 0.05]].forEach(([x, y, r]) => {
        circ(g, x, y, r);
        g.fill();
      });
      g.strokeStyle = 'rgba(70,30,10,.55)';
      g.lineWidth = 0.03;
      g.beginPath();
      g.moveTo(0.1, -0.08);
      g.quadraticCurveTo(0.5, -0.4, 0.82, -0.62);
      g.moveTo(0.1, -0.02);
      g.quadraticCurveTo(0.45, 0.05, 0.86, -0.15);
      g.moveTo(0.1, 0.05);
      g.quadraticCurveTo(0.35, 0.3, 0.5, 0.6);
      g.stroke();
      g.restore();
    };
    wing(-1);
    wing(1);
    // усики
    g.beginPath();
    g.moveTo(-0.04, -0.5);
    g.quadraticCurveTo(-0.22, -0.9, -0.42, -0.92);
    g.moveTo(0.04, -0.5);
    g.quadraticCurveTo(0.22, -0.9, 0.42, -0.92);
    g.strokeStyle = '#2a1608';
    g.lineWidth = 0.05;
    g.stroke();
    g.fillStyle = '#2a1608';
    circ(g, -0.42, -0.92, 0.06);
    g.fill();
    circ(g, 0.42, -0.92, 0.06);
    g.fill();
    // тельце
    g.beginPath();
    g.ellipse(0, 0.05, 0.11, 0.56, 0, 0, P2);
    paint(g, lin(g, -0.1, 0, 0.1, 0, [[0, '#6a4a30'], [1, '#2a1a10']]), '#150a04', 0.04);
    g.beginPath();
    g.arc(0, -0.5, 0.12, 0, P2);
    paint(g, '#4a3220', '#150a04', 0.04);
    g.strokeStyle = 'rgba(255,220,170,.25)';
    g.lineWidth = 0.02;
    g.beginPath();
    for (let y = -0.25; y < 0.5; y += 0.14) {
      g.moveTo(-0.1, y);
      g.lineTo(0.1, y);
    }
    g.stroke();
  },
  // ---------- берег моря ----------
  shell(g) {
    const cx = 0, cy = 0.62, n = 7, a0 = Math.PI * 1.08, da = (Math.PI * 0.84) / n;
    const P = (a, k = 1) => [cx + Math.cos(a) * 0.98 * k, cy + Math.sin(a) * 1.56 * k];
    // ушки у основания
    g.beginPath();
    g.moveTo(-0.5, 0.74);
    g.lineTo(-0.28, 0.56);
    g.lineTo(0.28, 0.56);
    g.lineTo(0.5, 0.74);
    g.lineTo(0.3, 0.9);
    g.lineTo(-0.3, 0.9);
    g.closePath();
    paint(g, lin(g, 0, 0.55, 0, 0.9, [[0, '#ffe2cc'], [1, '#e8a58c']]), '#8a4a3a', 0.06);
    for (let i = 0; i < n; i++) {
      const s0 = a0 + i * da, s1 = s0 + da, m = (s0 + s1) / 2;
      const p0 = P(s0), p1 = P(s1), pm = P(m, 1.1);
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(p0[0], p0[1]);
      g.quadraticCurveTo(pm[0], pm[1], p1[0], p1[1]);
      g.closePath();
      const base = i % 2 ? ['#ffd9c2', '#f2ac92'] : ['#ffeadb', '#f5bda4'];
      paint(g, lin(g, cx, cy, pm[0], pm[1], [[0, base[1]], [1, base[0]]]), '#8a4a3a', 0.055);
    }
    // тонкие линии роста
    g.strokeStyle = 'rgba(150,80,60,.35)';
    g.lineWidth = 0.03;
    for (const k of [0.45, 0.7]) {
      g.beginPath();
      for (let i = 0; i <= n; i++) {
        const p = P(a0 + i * da, k);
        i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
      }
      g.stroke();
    }
    shine(g, -0.32, -0.45, 0.08, 0.28, 0.4, 0.45);
  },
  starfish(g) {
    roundStar(g, 5, 0.9, 0.42, -Math.PI / 2, lin(g, -0.6, -0.9, 0.6, 0.8, [[0, '#ffb35a'], [1, '#e8602a']]), '#f27a38', '#7a2a10', 0.13);
    // лучевые линии и бугорки
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + (k * P2) / 5;
      const ca = Math.cos(a), sa = Math.sin(a);
      g.strokeStyle = 'rgba(255,225,170,.7)';
      g.lineWidth = 0.04;
      g.beginPath();
      g.moveTo(ca * 0.12, sa * 0.12);
      g.lineTo(ca * 0.78, sa * 0.78);
      g.stroke();
      g.fillStyle = 'rgba(255,238,200,.85)';
      for (let q = 0; q < 5; q++) {
        const rr = 0.22 + q * 0.13;
        for (const o of [-1, 1]) {
          circ(g, ca * rr - sa * o * (0.09 - q * 0.012), sa * rr + ca * o * (0.09 - q * 0.012), 0.026);
          g.fill();
        }
      }
    }
    g.fillStyle = 'rgba(150,50,10,.55)';
    circ(g, 0, 0, 0.05);
    g.fill();
    shine(g, -0.28, -0.4, 0.09, 0.2, 0.5, 0.4);
  },
  anchor(g) {
    const metal = (fn, wo, wm) => {
      fn();
      g.strokeStyle = '#13243f';
      g.lineWidth = wo;
      g.stroke();
      fn();
      g.strokeStyle = '#3d5f95';
      g.lineWidth = wm;
      g.stroke();
      fn();
      g.strokeStyle = 'rgba(190,215,250,.7)';
      g.lineWidth = wm * 0.3;
      g.translate(-wm * 0.2, -wm * 0.2);
      g.stroke();
      g.translate(wm * 0.2, wm * 0.2);
    };
    // верхнее кольцо
    metal(() => circ(g, 0, -0.78, 0.18), 0.2, 0.1);
    // перекладина
    metal(() => {
      g.beginPath();
      g.moveTo(-0.5, -0.48);
      g.lineTo(0.5, -0.48);
    }, 0.24, 0.14);
    // веретено
    metal(() => {
      g.beginPath();
      g.moveTo(0, -0.6);
      g.lineTo(0, 0.78);
    }, 0.26, 0.16);
    // дуга с лапами
    metal(() => {
      g.beginPath();
      g.moveTo(-0.84, 0.2);
      g.quadraticCurveTo(-0.7, 0.92, 0, 0.9);
      g.quadraticCurveTo(0.7, 0.92, 0.84, 0.2);
    }, 0.24, 0.14);
    // лапы-«ушки»
    for (const sx of [-1, 1]) {
      poly(g, [[sx * 0.98, 0.06], [sx * 0.64, 0.3], [sx * 0.86, 0.34]]);
      paint(g, '#3d5f95', '#13243f', 0.06);
    }
    // верёвка вокруг веретена
    g.strokeStyle = '#5a3a14';
    g.lineWidth = 0.17;
    g.beginPath();
    g.moveTo(-0.17, -0.3);
    g.bezierCurveTo(0.3, -0.3, 0.3, -0.05, -0.17, -0.05);
    g.bezierCurveTo(0.3, -0.05, 0.3, 0.2, -0.17, 0.2);
    g.stroke();
    g.strokeStyle = '#d9b070';
    g.lineWidth = 0.09;
    g.stroke();
    g.strokeStyle = 'rgba(120,80,30,.6)';
    g.lineWidth = 0.025;
    g.setLineDash([0.05, 0.07]);
    g.stroke();
    g.setLineDash([]);
  },
  // ---------- ярмарка ----------
  bagel(g) {
    const ring = () => {
      g.beginPath();
      g.arc(0, 0, 0.96, 0, P2);
      g.moveTo(0.34, 0);
      g.arc(0, 0, 0.34, 0, P2, true);
    };
    ring();
    g.fillStyle = rad(g, -0.3, -0.35, 0.1, 0, 0, 1.05, [[0, '#f8d490'], [0.55, '#d99a48'], [1, '#a05e20']]);
    g.fill('evenodd');
    g.save();
    ring();
    g.clip('evenodd');
    // подрумянивание
    g.fillStyle = 'rgba(120,60,10,.25)';
    ell(g, 0.45, 0.5, 0.9, 0.5, -0.7);
    g.fill();
    // мак и кунжут
    let z = 7;
    const rnd = () => ((z = (z * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 46; i++) {
      const a = rnd() * P2, rr = 0.42 + rnd() * 0.5;
      g.fillStyle = i % 3 ? '#fff0c8' : '#3a2616';
      ell(g, Math.cos(a) * rr, Math.sin(a) * rr, 0.035, 0.02, a + 1.4);
      g.fill();
    }
    g.restore();
    ring();
    g.strokeStyle = '#6a3a10';
    g.lineWidth = 0.07;
    g.stroke();
    // внутренний край: тень дырки
    g.beginPath();
    g.arc(0, 0, 0.34, Math.PI * 0.9, Math.PI * 1.9);
    g.strokeStyle = 'rgba(70,30,0,.4)';
    g.lineWidth = 0.05;
    g.stroke();
    g.beginPath();
    g.arc(0, 0, 0.8, Math.PI * 1.05, Math.PI * 1.45);
    g.strokeStyle = 'rgba(255,245,210,.75)';
    g.lineWidth = 0.07;
    g.stroke();
  },
  gingerbread(g) {
    const heart = (k = 1) => {
      g.beginPath();
      g.moveTo(0, 0.92 * k);
      g.bezierCurveTo(-0.5 * k, 0.55 * k, -1.04 * k, 0.1 * k, -0.98 * k, -0.34 * k);
      g.bezierCurveTo(-0.92 * k, -0.84 * k, -0.2 * k, -0.9 * k, 0, -0.4 * k);
      g.bezierCurveTo(0.2 * k, -0.9 * k, 0.92 * k, -0.84 * k, 0.98 * k, -0.34 * k);
      g.bezierCurveTo(1.04 * k, 0.1 * k, 0.5 * k, 0.55 * k, 0, 0.92 * k);
      g.closePath();
    };
    heart();
    paint(g, lin(g, -0.6, -0.8, 0.6, 0.8, [[0, '#d98f4a'], [0.5, '#b96a2a'], [1, '#8a4818']]), '#4a2208');
    g.save();
    heart();
    g.clip();
    g.fillStyle = 'rgba(255,220,160,.18)';
    ell(g, -0.4, -0.5, 0.5, 0.18, -0.4);
    g.fill();
    g.restore();
    // глазурь по краю
    heart(0.8);
    g.strokeStyle = '#fffaf0';
    g.lineWidth = 0.075;
    g.setLineDash([0.16, 0.1]);
    g.stroke();
    g.setLineDash([]);
    heart(0.8);
    g.strokeStyle = 'rgba(160,110,70,.35)';
    g.lineWidth = 0.02;
    g.stroke();
    // завиток глазури и конфетки
    g.beginPath();
    g.moveTo(-0.3, -0.05);
    g.bezierCurveTo(-0.3, -0.28, 0.1, -0.28, 0.1, -0.05);
    g.bezierCurveTo(0.1, 0.15, -0.12, 0.15, -0.12, 0.0);
    g.bezierCurveTo(-0.12, -0.1, 0.0, -0.1, 0.0, -0.02);
    g.strokeStyle = '#fffaf0';
    g.lineWidth = 0.07;
    g.stroke();
    [[-0.5, -0.38, '#e8343a'], [0.5, -0.4, '#3f9a45'], [0.38, 0.12, '#e8343a'], [-0.36, 0.3, '#3f9a45'], [0.0, 0.52, '#e8343a']].forEach(([x, y, c]) => {
      circ(g, x, y, 0.075);
      paint(g, c, dk(c), 0.03);
      shine(g, x - 0.02, y - 0.02, 0.025, 0.015, -0.5, 0.7);
    });
  },
  honey(g) {
    // банка
    g.beginPath();
    g.moveTo(-0.5, -0.38);
    g.lineTo(-0.5, -0.2);
    g.bezierCurveTo(-0.84, -0.1, -0.86, 0.2, -0.82, 0.56);
    g.bezierCurveTo(-0.8, 0.85, -0.7, 0.96, -0.5, 0.96);
    g.lineTo(0.5, 0.96);
    g.bezierCurveTo(0.7, 0.96, 0.8, 0.85, 0.82, 0.56);
    g.bezierCurveTo(0.86, 0.2, 0.84, -0.1, 0.5, -0.2);
    g.lineTo(0.5, -0.38);
    g.closePath();
    paint(g, lin(g, -0.8, 0, 0.8, 0, [[0, '#ffd86a'], [0.4, '#f5a81e'], [1, '#c8700a']]), '#6a3a06');
    g.save();
    g.clip();
    g.fillStyle = 'rgba(100,40,0,.18)';
    g.fillRect(0.35, -0.4, 0.6, 1.5);
    // этикетка
    roundRectPath(g, -0.48, 0.2, 0.96, 0.52, 0.1);
    paint(g, lin(g, 0, 0.2, 0, 0.72, [[0, '#fff8e6'], [1, '#f0dcb4']]), '#8a5a1a', 0.045);
    // сердечко на этикетке
    g.beginPath();
    g.moveTo(0, 0.6);
    g.bezierCurveTo(-0.2, 0.5, -0.24, 0.34, -0.12, 0.32);
    g.bezierCurveTo(-0.05, 0.31, 0, 0.36, 0, 0.4);
    g.bezierCurveTo(0, 0.36, 0.05, 0.31, 0.12, 0.32);
    g.bezierCurveTo(0.24, 0.34, 0.2, 0.5, 0, 0.6);
    g.fillStyle = '#e0573c';
    g.fill();
    g.restore();
    shine(g, -0.62, 0.02, 0.06, 0.2, 0.1, 0.6);
    // тканевая крышка с резинкой
    g.beginPath();
    g.moveTo(-0.62, -0.34);
    for (let i = 0; i <= 8; i++) g.quadraticCurveTo(-0.62 + (i + 0.5) * 0.155, -0.18 + (i % 2 ? 0.0 : 0.04), -0.62 + (i + 1) * 0.155, -0.34);
    g.bezierCurveTo(0.62, -0.7, -0.62, -0.7, -0.62, -0.34);
    g.closePath();
    g.fillStyle = '#fff6e8';
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = '#e0573c';
    for (let i = -4; i < 5; i++) for (let j = -2; j < 3; j++) if ((i + j) % 2 === 0) g.fillRect(i * 0.17, -0.7 + j * 0.17 + 0.2, 0.17, 0.17);
    g.restore();
    g.beginPath();
    g.moveTo(-0.62, -0.34);
    for (let i = 0; i <= 8; i++) g.quadraticCurveTo(-0.62 + (i + 0.5) * 0.155, -0.18 + (i % 2 ? 0.0 : 0.04), -0.62 + (i + 1) * 0.155, -0.34);
    g.bezierCurveTo(0.62, -0.7, -0.62, -0.7, -0.62, -0.34);
    g.closePath();
    g.strokeStyle = '#7a2a18';
    g.lineWidth = 0.06;
    g.stroke();
    // ленточка
    g.beginPath();
    g.moveTo(-0.52, -0.3);
    g.quadraticCurveTo(0, -0.18, 0.52, -0.3);
    g.strokeStyle = '#8a5a2a';
    g.lineWidth = 0.1;
    g.stroke();
    // капелька мёда
    g.beginPath();
    g.moveTo(0.22, -0.26);
    g.bezierCurveTo(0.2, -0.0, 0.32, 0.0, 0.3, -0.26);
    g.closePath();
    paint(g, '#f5a81e', '#a8600a', 0.04);
  },
  // ---------- сказочный лес ----------
  owl(g) {
    // ушки
    for (const sx of [-1, 1]) {
      poly(g, [[sx * 0.7, -0.92], [sx * 0.34, -0.6], [sx * 0.76, -0.4]]);
      paint(g, '#7a4a24', '#3a1c08', 0.06);
    }
    // тело
    g.beginPath();
    g.ellipse(0, 0.1, 0.86, 0.9, 0, 0, P2);
    paint(g, rad(g, -0.3, -0.4, 0.05, 0, 0.1, 1.0, [[0, '#c48a50'], [0.6, '#8e5a2c'], [1, '#5a3418']]), '#3a1c08');
    // крылья
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.ellipse(sx * 0.7, 0.28, 0.2, 0.52, sx * -0.2, 0, P2);
      paint(g, '#6a3f1e', '#3a1c08', 0.05);
    }
    // живот
    g.beginPath();
    g.ellipse(0, 0.5, 0.46, 0.42, 0, 0, P2);
    g.fillStyle = lin(g, 0, 0.1, 0, 0.9, [[0, '#f6e2b8'], [1, '#dcb888']]);
    g.fill();
    g.strokeStyle = 'rgba(120,70,30,.55)';
    g.lineWidth = 0.035;
    for (let r = 0; r < 3; r++) for (let c = -1; c <= 1; c++) {
      g.beginPath();
      g.arc(c * 0.22 + (r % 2) * 0.11, 0.34 + r * 0.17, 0.08, 0.2, Math.PI - 0.2);
      g.stroke();
    }
    // лицевой диск и глаза
    for (const sx of [-1, 1]) {
      circ(g, sx * 0.34, -0.22, 0.34);
      paint(g, '#fff6dc', '#3a1c08', 0.06);
      circ(g, sx * 0.34, -0.22, 0.2);
      g.fillStyle = '#f2a424';
      g.fill();
      circ(g, sx * 0.34, -0.22, 0.12);
      g.fillStyle = '#1a0e06';
      g.fill();
      circ(g, sx * 0.3, -0.27, 0.045);
      g.fillStyle = '#fff';
      g.fill();
    }
    // клюв
    poly(g, [[-0.1, -0.1], [0.1, -0.1], [0, 0.12]]);
    paint(g, '#f09a2a', '#7a4208', 0.05);
    // лапки
    g.strokeStyle = '#7a4208';
    g.lineWidth = 0.05;
    g.fillStyle = '#f09a2a';
    for (const sx of [-1, 1]) for (const o of [-0.1, 0.02, 0.14]) {
      g.beginPath();
      g.arc(sx * 0.3 + o, 0.98, 0.07, Math.PI, 0);
      g.fill();
      g.stroke();
    }
  },
  pinecone(g) {
    const body = () => {
      g.beginPath();
      g.moveTo(0, -0.98);
      g.bezierCurveTo(0.34, -0.8, 0.7, -0.4, 0.72, 0.1);
      g.bezierCurveTo(0.74, 0.62, 0.4, 0.98, 0, 0.98);
      g.bezierCurveTo(-0.4, 0.98, -0.74, 0.62, -0.72, 0.1);
      g.bezierCurveTo(-0.7, -0.4, -0.34, -0.8, 0, -0.98);
      g.closePath();
    };
    body();
    g.fillStyle = '#5a3418';
    g.fill();
    g.save();
    body();
    g.clip();
    // чешуйки снизу вверх, чтобы верхние перекрывали нижние
    for (let r = 8; r >= 0; r--) {
      const y = -0.78 + r * 0.22;
      const w = 0.38 + 0.4 * Math.sin(Math.min(1, (y + 1) / 1.35) * Math.PI * 0.55);
      const n = Math.max(2, Math.round(w * 4.4));
      for (let c = 0; c < n; c++) {
        const x = (c - (n - 1) / 2) * (w * 2 / n) + (r % 2 ? w / n : 0) - (r % 2 ? w / n / 2 : 0);
        const sw = (w * 2) / n * 0.62;
        g.beginPath();
        g.moveTo(x - sw, y - 0.06);
        g.quadraticCurveTo(x - sw * 1.1, y + 0.3, x, y + 0.34);
        g.quadraticCurveTo(x + sw * 1.1, y + 0.3, x + sw, y - 0.06);
        g.closePath();
        g.fillStyle = lin(g, x, y - 0.06, x, y + 0.34, [[0, '#d09a5a'], [0.55, '#a8683a'], [1, '#7a4420']]);
        g.fill();
        g.strokeStyle = '#3a1c08';
        g.lineWidth = 0.045;
        g.stroke();
        g.fillStyle = 'rgba(255,230,180,.35)';
        ell(g, x - sw * 0.2, y + 0.04, sw * 0.4, 0.04, -0.2);
        g.fill();
      }
    }
    g.fillStyle = 'rgba(40,15,0,.2)';
    ell(g, 0.5, 0.2, 0.5, 1.1, 0.1);
    g.fill();
    g.restore();
    body();
    g.strokeStyle = '#3a1c08';
    g.lineWidth = 0.07;
    g.stroke();
    // еловая веточка сверху
    g.strokeStyle = '#2a5a22';
    g.lineWidth = 0.07;
    g.beginPath();
    g.moveTo(0, -0.96);
    g.lineTo(0, -1.05);
    g.stroke();
  },
  fern(g) {
    const A = [-0.3, 1.0], B = [-0.5, -0.1], C = [0.38, -0.98];
    // главный стебель
    g.beginPath();
    g.moveTo(A[0], A[1]);
    g.quadraticCurveTo(B[0], B[1], C[0], C[1]);
    g.strokeStyle = '#1f4a1a';
    g.lineWidth = 0.14;
    g.stroke();
    g.strokeStyle = '#4a9a38';
    g.lineWidth = 0.07;
    g.stroke();
    const N = 11;
    for (let i = 1; i <= N; i++) {
      const t = 0.12 + (i / N) * 0.86;
      const p = quad(A, B, C, t), p2 = quad(A, B, C, Math.min(1, t + 0.02));
      const ang = Math.atan2(p2[1] - p[1], p2[0] - p[0]);
      const len = 0.78 * (1 - t * 0.78) + 0.08;
      for (const sx of [-1, 1]) {
        g.save();
        g.translate(p[0], p[1]);
        g.rotate(ang + sx * 1.05);
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(len * 0.3, -len * 0.2, len * 0.8, -len * 0.16, len, 0);
        g.bezierCurveTo(len * 0.8, len * 0.16, len * 0.3, len * 0.2, 0, 0);
        g.closePath();
        paint(g, lin(g, 0, 0, len, 0, [[0, '#2f7a2a'], [1, i % 2 ? '#8cd45a' : '#6cbf48']]), '#1f4a1a', 0.04);
        g.strokeStyle = 'rgba(220,255,190,.45)';
        g.lineWidth = 0.02;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(len * 0.9, 0);
        g.stroke();
        g.restore();
      }
    }
  },
  // ---------- звёздная ночь ----------
  star(g) {
    const p = (k, rot = -Math.PI / 2) => {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = rot + (i * Math.PI) / 5, r = i % 2 ? 0.46 * k : 0.98 * k;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      return pts;
    };
    roundStar(g, 5, 0.9, 0.46, -Math.PI / 2, '#ffd23a', '#f5b820', '#7a4a08', 0.1);
    // грани: чередование светлых и тёмных треугольников
    const pts = p(0.9);
    for (let i = 0; i < 10; i++) {
      const a = pts[i], b = pts[(i + 1) % 10];
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.closePath();
      g.fillStyle = i % 2 ? 'rgba(255,248,190,.55)' : 'rgba(210,120,10,.28)';
      g.fill();
    }
    g.strokeStyle = 'rgba(150,80,5,.4)';
    g.lineWidth = 0.025;
    g.beginPath();
    pts.forEach(([x, y], i) => i % 2 === 0 && (g.moveTo(0, 0), g.lineTo(x * 0.95, y * 0.95)));
    g.stroke();
    // искорка
    g.fillStyle = '#fff';
    poly(g, [[0.62, -0.78], [0.67, -0.66], [0.8, -0.62], [0.67, -0.58], [0.62, -0.46], [0.57, -0.58], [0.44, -0.62], [0.57, -0.66]]);
    g.fill();
  },
  moon(g) {
    const R = 0.92, cx = 0.42, cy = -0.1, r = 0.76;
    const d = Math.hypot(cx, cy);
    const a = (R * R - r * r + d * d) / (2 * d), h = Math.sqrt(Math.max(0, R * R - a * a));
    const ux = cx / d, uy = cy / d;
    const I2 = [ux * a - uy * h, uy * a + ux * h], I1 = [ux * a + uy * h, uy * a - ux * h];
    const ang = (p, ox = 0, oy = 0) => Math.atan2(p[1] - oy, p[0] - ox);
    const crescent = () => {
      g.beginPath();
      g.moveTo(I1[0], I1[1]);
      g.arc(0, 0, R, ang(I1), ang(I2), true);
      g.arc(cx, cy, r, ang(I2, cx, cy), ang(I1, cx, cy), false);
      g.closePath();
    };
    // небольшое свечение
    g.fillStyle = rad(g, -0.3, 0, 0.5, -0.2, 0, 1.15, [[0, 'rgba(255,240,170,.28)'], [1, 'rgba(255,240,170,0)']]);
    circ(g, -0.2, 0, 1.15);
    g.fill();
    crescent();
    paint(g, lin(g, -0.9, -0.6, 0.3, 0.8, [[0, '#fff8c8'], [0.6, '#f6d870'], [1, '#d9a838']]), '#6a4a10');
    g.save();
    crescent();
    g.clip();
    g.fillStyle = 'rgba(160,110,30,.3)';
    [[-0.62, -0.3, 0.1], [-0.46, 0.3, 0.14], [-0.8, 0.1, 0.07], [-0.2, 0.62, 0.07]].forEach(([x, y, rr]) => {
      circ(g, x, y, rr);
      g.fill();
    });
    g.restore();
    // спящее личико
    g.strokeStyle = '#6a4a10';
    g.lineWidth = 0.045;
    g.beginPath();
    g.arc(-0.5, -0.02, 0.07, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
    g.fillStyle = 'rgba(240,120,100,.45)';
    ell(g, -0.62, 0.12, 0.07, 0.045);
    g.fill();
    // звёздочки рядом
    g.fillStyle = '#fff6c0';
    [[0.68, -0.6, 0.12], [0.8, 0.4, 0.08], [0.45, 0.78, 0.06]].forEach(([x, y, k]) => {
      poly(g, [[0, -1], [0.26, -0.26], [1, 0], [0.26, 0.26], [0, 1], [-0.26, 0.26], [-1, 0], [-0.26, -0.26]], k);
      g.save();
      g.translate(x, y);
      poly(g, [[0, -1], [0.26, -0.26], [1, 0], [0.26, 0.26], [0, 1], [-0.26, 0.26], [-1, 0], [-0.26, -0.26]], k);
      g.fill();
      g.strokeStyle = '#8a6a10';
      g.lineWidth = 0.03;
      g.stroke();
      g.restore();
    });
  },
  lantern(g) {
    // свечение
    g.fillStyle = rad(g, 0, 0.1, 0.1, 0, 0.1, 1.15, [[0, 'rgba(255,230,120,.65)'], [1, 'rgba(255,200,80,0)']]);
    circ(g, 0, 0.1, 1.15);
    g.fill();
    // ручка
    g.beginPath();
    g.arc(0, -0.82, 0.32, Math.PI, 0);
    g.strokeStyle = '#3a2208';
    g.lineWidth = 0.14;
    g.stroke();
    g.strokeStyle = '#b8862a';
    g.lineWidth = 0.06;
    g.stroke();
    // стекло
    g.beginPath();
    g.moveTo(-0.5, -0.5);
    g.lineTo(0.5, -0.5);
    g.bezierCurveTo(0.78, -0.2, 0.78, 0.5, 0.5, 0.74);
    g.lineTo(-0.5, 0.74);
    g.bezierCurveTo(-0.78, 0.5, -0.78, -0.2, -0.5, -0.5);
    g.closePath();
    paint(g, rad(g, 0, 0.15, 0.05, 0, 0.1, 0.95, [[0, '#fffbc8'], [0.45, '#ffd048'], [1, '#e08a1c']]), '#5a3408');
    // пламя
    g.beginPath();
    g.moveTo(0, -0.28);
    g.bezierCurveTo(0.26, 0.02, 0.2, 0.4, 0, 0.46);
    g.bezierCurveTo(-0.2, 0.4, -0.26, 0.02, 0, -0.28);
    g.fillStyle = '#ff8a22';
    g.fill();
    g.beginPath();
    g.moveTo(0, -0.04);
    g.bezierCurveTo(0.12, 0.14, 0.1, 0.38, 0, 0.4);
    g.bezierCurveTo(-0.1, 0.38, -0.12, 0.14, 0, -0.04);
    g.fillStyle = '#fff3a0';
    g.fill();
    // рамка
    g.strokeStyle = '#4a2c0a';
    g.lineWidth = 0.07;
    g.beginPath();
    g.moveTo(-0.22, -0.5);
    g.bezierCurveTo(-0.34, -0.1, -0.34, 0.4, -0.22, 0.74);
    g.moveTo(0.22, -0.5);
    g.bezierCurveTo(0.34, -0.1, 0.34, 0.4, 0.22, 0.74);
    g.stroke();
    // крышка и основание
    roundRectPath(g, -0.62, -0.68, 1.24, 0.2, 0.08);
    paint(g, lin(g, 0, -0.68, 0, -0.48, [[0, '#e0b04a'], [1, '#9a6a14']]), '#4a2c0a', 0.06);
    roundRectPath(g, -0.6, 0.72, 1.2, 0.22, 0.08);
    paint(g, lin(g, 0, 0.72, 0, 0.94, [[0, '#e0b04a'], [1, '#8a5a10']]), '#4a2c0a', 0.06);
    shine(g, -0.48, 0.02, 0.05, 0.28, 0.1, 0.6);
  },
};

function roundRectPath(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export const ITEM_IDS = Object.keys(ART);

// рисует предмет в точке (cx, cy), r — «радиус» предмета в пикселях
export function drawItem(g, id, cx, cy, r) {
  const f = ART[id];
  if (!f) return;
  g.save();
  g.translate(cx, cy);
  g.scale(r, r);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  f(g);
  g.restore();
}

// Предмет лежит на бруске: исходный прозрачный рисунок и короткая тёплая тень.
const itemCache = new Map();
export function itemSprite(id, S) {
  S = Math.round(S);
  const k = id + S;
  if (itemCache.has(k)) return itemCache.get(k);
  const art = canvas(S, S);
  const image=itemArt(id);
  if(image)art.getContext('2d').drawImage(image,S*.02,0,S*.96,S*.96);
  else drawItem(art.getContext('2d'), id, S / 2, S / 2 - S * 0.01, S * 0.4);
  const c = canvas(S, S);
  const g = c.getContext('2d');
  g.shadowColor = 'rgba(45,21,9,.48)';
  g.shadowBlur = Math.max(0.5, S * 0.018);
  g.shadowOffsetY = S * 0.025;
  g.drawImage(art, 0, 0);
  itemCache.set(k, c);
  return c;
}
const urlCache = {};
export function itemURL(id) {
  if (!urlCache[id]) urlCache[id] = itemSprite(id, 96).toDataURL();
  return urlCache[id];
}
