// Фасады и материалы, нарисованные кодом. У каждой текстуры две карты: цвет и маска окраски
// (белое в маске перекрашивается цветом дома, чёрное — окна, рамы, двери — остаётся как есть).
import * as THREE from 'three';

const PPM = 40; // пикселей на метр

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// холст: координаты в метрах, y снизу вверх (как на стене)
function painter(tw, th) {
  const W = Math.round(tw * PPM), H = Math.round(th * PPM);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const m = document.createElement('canvas');
  m.width = W;
  m.height = H;
  const g = c.getContext('2d');
  const mg = m.getContext('2d');
  mg.fillStyle = '#fff';
  mg.fillRect(0, 0, W, H);
  const P = {
    c, m, g, mg, W, H, tw, th,
    // прямоугольник: x, y (низ), w, h в метрах; tint — перекрашивать ли
    rect(x, y, w, h, col, tint = false) {
      const X = x * PPM, Y = H - (y + h) * PPM;
      g.fillStyle = col;
      g.fillRect(X, Y, w * PPM, h * PPM);
      mg.fillStyle = tint ? '#fff' : '#000';
      mg.fillRect(X, Y, w * PPM, h * PPM);
    },
    grad(x, y, w, h, c0, c1, tint = false) {
      const X = x * PPM, Y = H - (y + h) * PPM;
      const gr = g.createLinearGradient(X, Y, X + w * PPM * 0.4, Y + h * PPM);
      gr.addColorStop(0, c0);
      gr.addColorStop(1, c1);
      g.fillStyle = gr;
      g.fillRect(X, Y, w * PPM, h * PPM);
      mg.fillStyle = tint ? '#fff' : '#000';
      mg.fillRect(X, Y, w * PPM, h * PPM);
    },
    // только цвет (маска не меняется) — оттенки на перекрашиваемой стене
    shade(x, y, w, h, col) {
      g.fillStyle = col;
      g.fillRect(x * PPM, H - (y + h) * PPM, w * PPM, h * PPM);
    },
    circle(x, y, r, col, tint = false) {
      g.fillStyle = col;
      g.beginPath();
      g.arc(x * PPM, H - y * PPM, r * PPM, 0, Math.PI * 2);
      g.fill();
      mg.fillStyle = tint ? '#fff' : '#000';
      mg.beginPath();
      mg.arc(x * PPM, H - y * PPM, r * PPM, 0, Math.PI * 2);
      mg.fill();
    },
    // арка: прямоугольник с полукруглым верхом
    arch(x, y, w, h, col, tint = false) {
      const r = w / 2;
      P.rect(x, y, w, h - r, col, tint);
      P.circle(x + r, y + h - r, r, col, tint);
    },
  };
  return P;
}

const WALL = '#f2f2f2';

// окно с рамой, крестом, подоконником и бликом
function windowAt(P, x, y, w, h, o = {}) {
  const fr = o.frame || '#ffffff';
  P.shade(x-.12,y-.13,w+.27,h+.22,'rgba(30,44,60,.24)');
  P.rect(x - 0.08, y - 0.08, w + 0.16, h + 0.16, fr);
  P.shade(x-.07,y+h+.035,w+.14,.025,'rgba(255,255,255,.6)');
  P.grad(x, y, w, h, o.g0 || '#b8e2ed', o.g1 || '#5d8eb1');
  P.shade(x,y,w,.055,'rgba(23,49,73,.2)');
  P.shade(x,y,.035,h,'rgba(23,49,73,.16)');
  // блик
  P.g.fillStyle = 'rgba(255,255,255,.35)';
  P.g.beginPath();
  const X = x * PPM, Y = P.H - (y + h) * PPM;
  P.g.moveTo(X + w * PPM * 0.15, Y + h * PPM);
  P.g.lineTo(X + w * PPM * 0.45, Y + h * PPM);
  P.g.lineTo(X + w * PPM * 0.85, Y);
  P.g.lineTo(X + w * PPM * 0.55, Y);
  P.g.fill();
  if (o.cross !== false) {
    P.rect(x + w / 2 - 0.04, y, 0.08, h, fr);
    P.rect(x, y + h * 0.62, w, 0.07, fr);
  }
  // шторки внутри
  if (o.curtain) {
    P.rect(x + 0.02, y + 0.02, w * 0.18, h - 0.04, o.curtain);
    P.rect(x + w * 0.8 - 0.02, y + 0.02, w * 0.18, h - 0.04, o.curtain);
  }
  if (o.sill !== false) P.rect(x - 0.16, y - 0.16, w + 0.32, 0.1, o.sillCol || '#e8e2d8');
  if (o.shutters) {
    P.rect(x - 0.08 - 0.42, y - 0.04, 0.36, h + 0.08, o.shutters);
    P.rect(x + w + 0.14, y - 0.04, 0.36, h + 0.08, o.shutters);
    for (let k = 0; k < 6; k++) {
      P.rect(x - 0.46, y + (h * (k + 0.5)) / 6, 0.28, 0.03, 'rgba(0,0,0,.18)');
      P.rect(x + w + 0.18, y + (h * (k + 0.5)) / 6, 0.28, 0.03, 'rgba(0,0,0,.18)');
    }
  }
  if (o.flowers) {
    P.rect(x - 0.05, y - 0.38, w + 0.1, 0.24, '#8a5a3a');
    const R = rng(Math.round(x * 100 + y * 7));
    for (let k = 0; k < 7; k++) P.circle(x + (w * (k + 0.5)) / 7, y - 0.12 + R() * 0.08, 0.09, ['#ff6a8a', '#ffd24a', '#ff8a3a', '#c86ae0'][k % 4]);
    for (let k = 0; k < 7; k++) P.circle(x + (w * (k + 0.2)) / 7, y - 0.2, 0.07, '#4caf50');
  }
}

function door(P, x, y, w, h, col, o = {}) {
  P.shade(x-.14,y,w+.3,h+.15,'rgba(29,39,52,.25)');
  P.rect(x - 0.1, y, w + 0.2, h + 0.1, o.frame || '#ffffff');
  P.rect(x, y, w, h, col);
  // филёнки
  P.rect(x + w * 0.15, y + h * 0.55, w * 0.7, h * 0.32, 'rgba(255,255,255,.14)');
  P.rect(x + w * 0.15, y + h * 0.1, w * 0.7, h * 0.36, 'rgba(0,0,0,.1)');
  if (o.glass) P.grad(x + w * 0.2, y + h * 0.6, w * 0.6, h * 0.28, '#bfe6ff', '#6aa8dc');
  P.circle(x + w * 0.82, y + h * 0.48, 0.05, '#ffd24a');
  P.rect(x - 0.3, y - 0.02, w + 0.6, 0.14, '#b8b0a4');
}

// горизонтальная обшивка (на перекрашиваемой стене)
function siding(P) {
  P.rect(0, 0, P.tw, P.th, WALL, true);
  for (let y = 0; y < P.th; y += 0.24) {
    P.shade(0, y, P.tw, 0.03, 'rgba(0,0,0,.08)');
    P.shade(0, y + 0.03, P.tw, 0.02, 'rgba(255,255,255,.2)');
  }
  P.shade(0, 0, P.tw, 0.35, 'rgba(0,0,0,.08)');
}

function bricks(P, base = '#e8e8e8', mortar = '#d6d0c8') {
  P.rect(0, 0, P.tw, P.th, mortar);
  const R = rng(P.W * 13 + P.H);
  const bh = 0.15, bw = 0.42;
  for (let row = 0, y = 0; y < P.th; row++, y += bh) {
    for (let x = row % 2 ? -bw / 2 : 0; x < P.tw; x += bw) {
      const k = 0.88 + R() * 0.12;
      const v = Math.round(232 * k);
      P.rect(Math.max(0, x + 0.02), y + 0.02, bw - 0.04, bh - 0.03, `rgb(${v},${v},${v})`, true);
    }
  }
}

function stones(P) {
  P.rect(0, 0, P.tw, P.th, '#bdb5a8');
  const R = rng(P.W * 7 + P.H * 3);
  const bh = 0.5;
  for (let row = 0, y = 0; y < P.th; row++, y += bh) {
    let x = row % 2 ? -0.35 : 0;
    while (x < P.tw) {
      const bw = 0.6 + R() * 0.5;
      const k = 0.85 + R() * 0.15;
      const v = Math.round(236 * k);
      P.rect(Math.max(0, x + 0.04), y + 0.04, bw - 0.08, bh - 0.08, `rgb(${v},${v},${v - 4})`, true);
      P.shade(Math.max(0, x + 0.04), y + bh - 0.12, bw - 0.08, 0.06, 'rgba(255,255,255,.25)');
      x += bw;
    }
  }
}

function noise(P, amt = 0.05, seed = 1) {
  const R = rng(seed);
  for (let i = 0; i < (P.W * P.H) / 30; i++) {
    const a = R() * amt;
    P.g.fillStyle = R() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
    P.g.fillRect(R() * P.W, R() * P.H, 2, 2);
  }
}

function awning(P, x, y, w, h) {
  const n = Math.max(4, Math.round(w / 0.4));
  for (let k = 0; k < n; k++) P.rect(x + (w * k) / n, y, w / n, h, k % 2 ? '#ffffff' : '#f0f0f0', k % 2 === 0);
  // фестоны снизу
  for (let k = 0; k < n; k++) P.circle(x + (w * (k + 0.5)) / n, y, w / n / 2, k % 2 ? '#ffffff' : '#f0f0f0', k % 2 === 0);
  P.rect(x, y + h - 0.06, w, 0.06, 'rgba(0,0,0,.25)');
}

const LOOKS = {
  house: { tw: 3, th: 3, fit: true, draw(P) {
    siding(P);
    windowAt(P, 0.95, 1.0, 1.1, 1.3, { shutters: '#5a7f5a', flowers: true, curtain: '#fff3d0' });
  } },
  houseDoor: { tw: 3, th: 3, fit: true, draw(P) {
    siding(P);
    door(P, 1.0, 0.1, 1.0, 2.15, '#b8584a', { glass: true });
    P.rect(2.25, 1.9, 0.18, 0.3, '#3a3a3a');
    P.circle(2.34, 2.0, 0.08, '#ffe9a0');
  } },
  brick: { tw: 3, th: 3, fit: true, draw(P) {
    bricks(P);
    P.rect(0.82, 2.38, 1.36, 0.16, '#e8e2d8');
    windowAt(P, 0.9, 1.0, 1.2, 1.35, { curtain: '#ffe0e0' });
  } },
  brickDoor: { tw: 3, th: 3, fit: true, draw(P) {
    bricks(P);
    door(P, 0.95, 0.1, 1.1, 2.2, '#3a5a8a', { glass: true });
  } },
  shop: { tw: 3.2, th: 3, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    noise(P, 0.04, 3);
    P.rect(0.2, 0.25, 2.8, 1.85, '#3a3a44');
    P.grad(0.28, 0.32, 2.64, 1.71, '#cfeaff', '#7ab4e0');
    P.rect(1.56, 0.32, 0.08, 1.71, '#3a3a44');
    // товары за стеклом
    const cols = ['#ff7a5a', '#ffd24a', '#7ad67a', '#7aa8ff', '#ff9ad0'];
    for (let k = 0; k < 8; k++) P.rect(0.4 + k * 0.32, 0.36, 0.22, 0.25 + (k % 3) * 0.12, cols[k % 5]);
    P.rect(0.32, 0.32, 2.56, 0.05, '#ffffff');
    awning(P, 0.05, 2.15, 3.1, 0.55);
    P.rect(0.1, 2.72, 3.0, 0.22, '#ffffff');
  } },
  shopDoor: { tw: 3.2, th: 3, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    P.rect(0.95, 0.05, 1.3, 2.1, '#3a3a44');
    P.grad(1.02, 0.1, 0.56, 1.98, '#cfeaff', '#7ab4e0');
    P.grad(1.62, 0.1, 0.56, 1.98, '#cfeaff', '#7ab4e0');
    P.rect(1.48, 0.9, 0.06, 0.4, '#d0d0d0');
    P.rect(1.66, 0.9, 0.06, 0.4, '#d0d0d0');
    P.rect(0.35, 1.1, 0.42, 0.55, '#ffffff');
    P.rect(0.4, 1.15, 0.32, 0.45, '#ff6a5a');
    awning(P, 0.05, 2.15, 3.1, 0.55);
    P.rect(0.1, 2.72, 3.0, 0.22, '#ffffff');
  } },
  flat: { tw: 3.6, th: 3, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    noise(P, 0.035, 5);
    P.shade(0, 0, P.tw, 0.05, 'rgba(0,0,0,.18)');
    P.shade(0, 0, 0.04, P.th, 'rgba(0,0,0,.14)');
    windowAt(P, 0.35, 1.0, 1.2, 1.4, { cross: true, curtain: '#ffeccc' });
    // балкон
    P.rect(1.95, 0.05, 1.4, 2.25, '#5a7290');
    P.grad(2.05, 0.95, 1.2, 1.25, '#a8d8f4', '#6aa0d0');
    P.rect(1.85, 0.0, 1.6, 1.0, '#d8dde4');
    for (let k = 0; k < 9; k++) P.rect(1.9 + k * 0.19, 0.05, 0.05, 0.9, '#9aa4b0');
    P.rect(1.85, 0.92, 1.6, 0.08, '#8a94a0');
    P.circle(2.3, 1.1, 0.16, '#5cb85c');
  } },
  flatDoor: { tw: 3.6, th: 3, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    noise(P, 0.035, 6);
    door(P, 1.25, 0.1, 1.1, 2.1, '#7a5a3a', { glass: true });
    P.rect(1.0, 2.35, 1.6, 0.18, '#9aa4b0');
    P.rect(2.55, 1.7, 0.3, 0.2, '#3a6ac8');
    P.circle(0.7, 2.0, 0.1, '#ffe9a0');
  } },
  glass: { tw: 1.7, th: 4.5, fit: true, draw(P) {
    P.grad(0, 0, P.tw, P.th, '#ffffff', '#c8d4e0', true);
    P.g.fillStyle = 'rgba(255,255,255,.45)';
    P.g.fillRect(P.W * 0.15, 0, P.W * 0.18, P.H);
    P.rect(0, 0, P.tw, 0.55, '#5a6470');
    P.rect(0, 0, 0.06, P.th, '#8a96a4');
    P.rect(0, 2.4, P.tw, 0.05, '#8a96a4');
    P.rect(0, P.th - 0.06, P.tw, 0.06, '#8a96a4');
  } },
  office: { tw: 2, th: 4, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    noise(P, 0.03, 8);
    P.grad(0, 1.0, P.tw, 2.2, '#9fd0f0', '#4a7fb8');
    P.rect(0, 1.0, P.tw, 0.06, '#d8dde4');
    P.rect(0, 3.14, P.tw, 0.06, '#d8dde4');
    P.rect(0.97, 1.0, 0.06, 2.2, '#d8dde4');
    P.g.fillStyle = 'rgba(255,255,255,.3)';
    P.g.fillRect(P.W * 0.1, P.H - 3.2 * PPM, P.W * 0.2, 2.2 * PPM);
  } },
  lobby: { tw: 3.4, th: 4.5, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    P.grad(0.15, 0.1, 3.1, 3.6, '#d8f0ff', '#7ab0dc');
    P.rect(1.66, 0.1, 0.08, 3.6, '#c8ccd4');
    P.rect(0.15, 3.7, 3.1, 0.1, '#c8ccd4');
    for (let k = 0; k < 3; k++) P.circle(0.6 + k * 1.1, 0.5, 0.25, '#5cb85c');
  } },
  lobbyDoor: { tw: 3.4, th: 4.5, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    P.grad(0.15, 0.1, 3.1, 3.6, '#d8f0ff', '#7ab0dc');
    P.rect(0.9, 0.05, 1.6, 2.6, '#c8ccd4');
    P.grad(1.0, 0.1, 1.4, 2.45, '#e8f8ff', '#9ac8ec');
    P.rect(1.66, 0.1, 0.08, 2.45, '#c8ccd4');
    P.rect(0.6, 2.9, 2.2, 0.5, '#ffffff');
    P.rect(0.7, 3.0, 2.0, 0.3, '#3a6ac8');
  } },
  metalwall: { tw: 4, th: 3.5, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    for (let x = 0; x < P.tw; x += 0.2) {
      P.shade(x, 0, 0.06, P.th, 'rgba(0,0,0,.12)');
      P.shade(x + 0.06, 0, 0.04, P.th, 'rgba(255,255,255,.25)');
    }
    P.rect(0.6, 2.4, 2.8, 0.6, '#5a6470');
    P.grad(0.65, 2.45, 2.7, 0.5, '#bfe0f4', '#7ab0d4');
  } },
  gate: { tw: 4, th: 3.5, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    P.rect(0.4, 0, 3.2, 3.0, '#8a929c');
    for (let y = 0.1; y < 3; y += 0.18) P.rect(0.4, y, 3.2, 0.04, '#6a727c');
    for (let k = 0; k < 8; k++) {
      P.rect(0.4 + k * 0.4, 3.0, 0.2, 0.18, '#ffcc22');
      P.rect(0.6 + k * 0.4, 3.0, 0.2, 0.18, '#222222');
    }
  } },
  timber: { tw: 2.6, th: 3, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    noise(P, 0.04, 11);
    const B = '#5a3a26';
    P.rect(0, 0, P.tw, 0.2, B);
    P.rect(0, P.th - 0.2, P.tw, 0.2, B);
    P.rect(0, 0, 0.18, P.th, B);
    P.rect(0, 1.45, P.tw, 0.14, B);
    // косые подкосы
    const g = P.g;
    g.strokeStyle = B;
    g.lineWidth = 0.14 * PPM;
    g.beginPath();
    g.moveTo(0.1 * PPM, P.H - 0.2 * PPM);
    g.lineTo(0.7 * PPM, P.H - 1.45 * PPM);
    g.moveTo(P.W - 0.1 * PPM, P.H - 0.2 * PPM);
    g.lineTo(P.W - 0.7 * PPM, P.H - 1.45 * PPM);
    g.stroke();
    P.mg.strokeStyle = '#000';
    P.mg.lineWidth = 0.14 * PPM;
    P.mg.beginPath();
    P.mg.moveTo(0.1 * PPM, P.H - 0.2 * PPM);
    P.mg.lineTo(0.7 * PPM, P.H - 1.45 * PPM);
    P.mg.moveTo(P.W - 0.1 * PPM, P.H - 0.2 * PPM);
    P.mg.lineTo(P.W - 0.7 * PPM, P.H - 1.45 * PPM);
    P.mg.stroke();
    windowAt(P, 0.85, 1.75, 0.9, 0.9, { frame: '#5a3a26', g0: '#ffe9a8', g1: '#e0b860', shutters: '#3a6a8a', sill: false });
  } },
  timberDoor: { tw: 2.6, th: 3, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    noise(P, 0.04, 12);
    const B = '#5a3a26';
    P.rect(0, P.th - 0.2, P.tw, 0.2, B);
    P.rect(0, 0, 0.18, P.th, B);
    P.rect(0, 2.4, P.tw, 0.14, B);
    P.arch(0.75, 0.05, 1.1, 2.2, B);
    P.arch(0.83, 0.05, 0.94, 2.1, '#8a5a36');
    for (let k = 1; k < 4; k++) P.rect(0.83 + k * 0.235, 0.05, 0.03, 1.6, '#6a4226');
    P.circle(1.55, 1.0, 0.06, '#2a2a2a');
  } },
  stone: { tw: 3, th: 3, fit: false, draw(P) {
    stones(P);
  } },
  castleDoor: { tw: 3.5, th: 3, fit: true, draw(P) {
    stones(P);
    P.arch(0.9, 0, 1.7, 2.7, '#6a5a4a');
    P.arch(1.0, 0, 1.5, 2.6, '#8a5a36');
    for (let k = 1; k < 5; k++) P.rect(1.0 + k * 0.3, 0, 0.04, 2.0, '#6a4226');
    for (const y of [0.5, 1.6]) P.rect(1.0, y, 1.5, 0.1, '#3a3a3a');
  } },
  barn: { tw: 3.4, th: 4, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    for (let x = 0; x < P.tw; x += 0.3) P.shade(x, 0, 0.04, P.th, 'rgba(0,0,0,.15)');
    P.rect(0.4, 2.2, 0.9, 0.9, '#ffffff');
    P.rect(0.48, 2.28, 0.74, 0.74, '#5a3a26');
  } },
  barnDoor: { tw: 3.4, th: 4, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    for (let x = 0; x < P.tw; x += 0.3) P.shade(x, 0, 0.04, P.th, 'rgba(0,0,0,.15)');
    P.rect(0.3, 0, 2.8, 3.0, '#ffffff');
    P.rect(0.42, 0, 2.56, 2.88, '#c8443a');
    const g = P.g;
    g.strokeStyle = '#fff';
    g.lineWidth = 0.12 * PPM;
    g.beginPath();
    g.moveTo(0.42 * PPM, P.H);
    g.lineTo(2.98 * PPM, P.H - 2.88 * PPM);
    g.moveTo(2.98 * PPM, P.H);
    g.lineTo(0.42 * PPM, P.H - 2.88 * PPM);
    g.stroke();
    P.rect(1.66, 0, 0.08, 2.88, '#ffffff');
  } },
  bigDoor: { tw: 3.6, th: 3, fit: true, draw(P) {
    bricks(P);
    P.rect(0.6, 2.4, 2.4, 0.2, '#e8e2d8');
    P.rect(0.8, 0.05, 2.0, 2.3, '#ffffff');
    P.grad(0.9, 0.1, 0.85, 2.15, '#cfeaff', '#7ab4e0');
    P.grad(1.85, 0.1, 0.85, 2.15, '#cfeaff', '#7ab4e0');
    P.rect(0.5, 0, 2.6, 0.12, '#b8b0a4');
  } },
  // курортный отель: белые балконы с полосатыми маркизами
  hotel: { tw: 3.2, th: 3, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    noise(P, 0.03, 21);
    P.rect(0.4, 0.35, 2.4, 2.1, '#5a7290');
    P.grad(0.5, 0.45, 1.05, 1.9, '#bfeaff', '#6ab0e0');
    P.grad(1.65, 0.45, 1.05, 1.9, '#bfeaff', '#6ab0e0');
    awning(P, 0.25, 2.3, 2.7, 0.5);
    P.rect(0.15, 0.0, 2.9, 0.9, '#ffffff');
    for (let k = 0; k < 13; k++) P.rect(0.2 + k * 0.22, 0.06, 0.06, 0.78, '#dfe6ee');
    P.rect(0.15, 0.84, 2.9, 0.08, '#c8d0d8');
    P.circle(0.6, 1.05, 0.18, '#5cb85c');
  } },
  hotelDoor: { tw: 3.2, th: 3, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    noise(P, 0.03, 22);
    P.rect(0.6, 0.05, 2.0, 2.3, '#3a3a44');
    P.grad(0.68, 0.1, 0.88, 2.18, '#cfeaff', '#7ab4e0');
    P.grad(1.64, 0.1, 0.88, 2.18, '#cfeaff', '#7ab4e0');
    awning(P, 0.3, 2.35, 2.6, 0.5);
    P.rect(0.4, 2.88, 2.4, 0.1, '#ffd24a');
  } },
  // шале из брёвен
  chalet: { tw: 2.8, th: 3, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    for (let y = 0; y < P.th; y += 0.3) {
      P.shade(0, y, P.tw, 0.06, 'rgba(60,30,10,.28)');
      P.shade(0, y + 0.2, P.tw, 0.05, 'rgba(255,255,255,.18)');
    }
    windowAt(P, 0.85, 1.0, 1.1, 1.2, { frame: '#ffffff', g0: '#ffe9a8', g1: '#e0a850', shutters: '#b8463a', sillCol: '#ffffff' });
    P.rect(0.6, 2.42, 1.6, 0.1, '#ffffff');
  } },
  chaletDoor: { tw: 2.8, th: 3, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    for (let y = 0; y < P.th; y += 0.3) {
      P.shade(0, y, P.tw, 0.06, 'rgba(60,30,10,.28)');
      P.shade(0, y + 0.2, P.tw, 0.05, 'rgba(255,255,255,.18)');
    }
    door(P, 0.9, 0.1, 1.0, 2.15, '#b8463a', { glass: true });
    P.circle(0.45, 2.3, 0.22, '#3a8a4a');
    P.circle(0.45, 2.3, 0.12, WALL, true);
    P.circle(0.45, 2.3, 0.05, '#e84a3a');
  } },
  // японский дом: тёмные балки и бумажные окна
  shoji: { tw: 2.4, th: 3, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    noise(P, 0.03, 31);
    const D = '#4a3428';
    P.rect(0, 0, P.tw, 0.5, D);
    P.rect(0, P.th - 0.25, P.tw, 0.25, D);
    P.rect(0, 0, 0.16, P.th, D);
    P.rect(0.45, 0.85, 1.5, 1.6, D);
    P.rect(0.52, 0.92, 1.36, 1.46, '#fff6e2');
    for (let k = 1; k < 4; k++) P.rect(0.52 + k * 0.34, 0.92, 0.03, 1.46, D);
    for (let k = 1; k < 4; k++) P.rect(0.52, 0.92 + k * 0.365, 1.36, 0.03, D);
  } },
  shojiDoor: { tw: 2.4, th: 3, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    noise(P, 0.03, 32);
    const D = '#4a3428';
    P.rect(0, P.th - 0.25, P.tw, 0.25, D);
    P.rect(0, 0, 0.16, P.th, D);
    P.rect(0.35, 0.0, 1.7, 2.35, D);
    P.rect(0.42, 0.06, 0.76, 2.22, '#fff6e2');
    P.rect(1.22, 0.06, 0.76, 2.22, '#fff6e2');
    for (let k = 1; k < 5; k++) {
      P.rect(0.42, 0.06 + k * 0.44, 0.76, 0.03, D);
      P.rect(1.22, 0.06 + k * 0.44, 0.76, 0.03, D);
    }
    // норэн над входом
    P.rect(0.3, 1.75, 1.8, 0.55, '#3a5a9a');
    P.rect(1.18, 1.75, 0.04, 0.55, '#2a3a6a');
    P.circle(0.75, 2.02, 0.13, '#ffffff');
  } },
  // полосатый шатёр цирка
  tent: { tw: 2, th: 2, fit: false, draw(P) {
    for (let k = 0; k < 4; k++) P.rect(k * 0.5, 0, 0.5, P.th, k % 2 ? '#ffffff' : '#f0f0f0', k % 2 === 0);
  } },
  plain: { tw: 2, th: 2, fit: false, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    noise(P, 0.05, 2);
  } },
  roof: { tw: 1, th: 1, fit: false, draw(P) {
    P.rect(0, 0, P.tw, P.th, '#e8e8e8', true);
    const R = rng(4);
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 4; k++) {
        const x = k * 0.25 + (row % 2) * 0.125, y = row * 0.25;
        const v = Math.round(225 + R() * 25);
        P.rect(x + 0.01, y + 0.03, 0.23, 0.21, `rgb(${v},${v},${v})`, true);
        P.rect(x + 0.235 - 0.25, y + 0.03, 0.01, 0.21, `rgb(${v},${v},${v})`, true);
        P.shade(x + 0.01, y + 0.03, 0.23, 0.04, 'rgba(0,0,0,.18)');
      }
  } },
  canopy: { tw: 2, th: 0.6, fit: false, draw(P) {
    P.rect(0, 0, P.tw, P.th, '#ffffff', true);
    P.rect(0, 0.18, P.tw, 0.24, '#e84a3a');
  } },
  cabin: { tw: 2, th: 2, fit: true, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    P.grad(0.2, 0.7, 1.6, 1.0, '#bfe6ff', '#6aa8dc');
  } },
  lamp: { tw: 1, th: 2, fit: false, draw(P) {
    P.grad(0, 0, P.tw, P.th, '#fffbe0', '#ffe070');
    for (let x = 0; x < 1; x += 0.25) P.rect(x, 0, 0.04, P.th, '#3a3a3a');
  } },
  cone: { tw: 1, th: 1, fit: false, draw(P) {
    LOOKS.roof.draw(P);
  } },
  container: { tw: 2.5, th: 2.6, fit: false, draw(P) {
    P.rect(0, 0, P.tw, P.th, WALL, true);
    for (let x = 0; x < P.tw; x += 0.25) {
      P.shade(x, 0, 0.07, P.th, 'rgba(0,0,0,.14)');
      P.shade(x + 0.07, 0, 0.04, P.th, 'rgba(255,255,255,.22)');
    }
    P.shade(0, 0, P.tw, 0.12, 'rgba(0,0,0,.25)');
    P.shade(0, P.th - 0.12, P.tw, 0.12, 'rgba(0,0,0,.2)');
  } },
};

export const LOOK_NAMES = Object.keys(LOOKS);

let cache = null;
export function makeLooks() {
  if (cache) return cache;
  cache = {};
  for (const [k, L] of Object.entries(LOOKS)) {
    const P = painter(L.tw, L.th);
    L.draw(P);
    const map = new THREE.CanvasTexture(P.c);
    map.colorSpace = THREE.SRGBColorSpace;
    const mask = new THREE.CanvasTexture(P.m);
    for (const t of [map, mask]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
    }
    cache[k] = { map, mask, tw: L.tw, th: L.th, fit: L.fit };
  }
  return cache;
}
