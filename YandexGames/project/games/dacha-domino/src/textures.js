// Процедурные текстуры: скатерти, дерево, трава, листва, снег, тень от листвы
import * as THREE from 'three';

export function rnd(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}
export function tex(c, repeat = [1, 1], srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}

// клеёнка в красно-белую клетку с мелкими цветочками
export function oilcloth() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#fbf6ee';
  g.fillRect(0, 0, 512, 512);
  const n = 4,
    s = 512 / n;
  g.fillStyle = 'rgba(206,40,48,0.55)';
  for (let i = 0; i < n; i++) {
    g.fillRect(i * s, 0, s / 2, 512);
    g.fillRect(0, i * s, 512, s / 2);
  }
  // тонкая «ткань» и ромашки на белых клетках
  const r = rnd(5);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const x = i * s + s * 0.75,
        y = j * s + s * 0.75;
      g.fillStyle = 'rgba(255,255,255,0.9)';
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        g.beginPath();
        g.ellipse(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 7, 4, a, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#f2b636';
      g.beginPath();
      g.arc(x, y, 5, 0, Math.PI * 2);
      g.fill();
    }
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = `rgba(0,0,0,${r() * 0.04})`;
    g.fillRect(r() * 512, r() * 512, 2, 2);
  }
  return tex(c, [7.5, 6]);
}

// доски: base — цвет, вдоль оси x
export function planks(base, { w = 1024, h = 1024, rows = 8, seed = 1, dark = 0.18, gap = 'rgba(40,22,10,0.55)' } = {}) {
  const [c, g] = canvas(w, h);
  const r = rnd(seed);
  const col = new THREE.Color(base);
  const rh = h / rows;
  for (let i = 0; i < rows; i++) {
    const k = 0.9 + r() * 0.2;
    const cc = col.clone().multiplyScalar(k);
    g.fillStyle = '#' + cc.getHexString();
    g.fillRect(0, i * rh, w, rh);
    // волокна
    for (let j = 0; j < 40; j++) {
      const y = i * rh + r() * rh;
      g.strokeStyle = `rgba(60,30,10,${0.04 + r() * dark * 0.5})`;
      g.lineWidth = 1 + r() * 2.5;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 64) g.lineTo(x, y + Math.sin(x * 0.01 + j) * 3 * r());
      g.stroke();
    }
    // сучки
    if (r() < 0.6) {
      const x = r() * w,
        y = i * rh + rh * (0.3 + r() * 0.4);
      for (let k2 = 5; k2 > 0; k2--) {
        g.strokeStyle = `rgba(70,35,12,${0.1 + 0.05 * k2})`;
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(x, y, k2 * 7, k2 * 3, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
    // стыки досок
    g.fillStyle = gap;
    g.fillRect(0, i * rh, w, 3);
    const cut = r() * w;
    g.fillRect(cut, i * rh, 3, rh);
  }
  return c;
}

export function felt() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#2f7a4a';
  g.fillRect(0, 0, 512, 512);
  const r = rnd(9);
  for (let i = 0; i < 26000; i++) {
    const v = r();
    g.fillStyle = v < 0.5 ? `rgba(0,30,10,${0.08 + r() * 0.1})` : `rgba(160,230,170,${0.04 + r() * 0.07})`;
    g.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1 + r() * 2);
  }
  return tex(c, [4, 4]);
}

// белая скатерть с кружевной каймой (одна текстура на весь стол)
export function lace(W, D) {
  const k = 48;
  const [c, g] = canvas(Math.round(W * k), Math.round(D * k));
  const w = c.width,
    h = c.height;
  g.fillStyle = '#fbf8f1';
  g.fillRect(0, 0, w, h);
  // тканый узор
  g.strokeStyle = 'rgba(160,140,110,0.08)';
  for (let x = 0; x < w; x += 6) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, h);
    g.stroke();
  }
  // кайма с вышивкой
  const m = 1.2 * k;
  g.strokeStyle = 'rgba(190,170,140,0.6)';
  g.lineWidth = 3;
  g.strokeRect(m, m, w - 2 * m, h - 2 * m);
  g.strokeRect(m + 10, m + 10, w - 2 * m - 20, h - 2 * m - 20);
  const flower = (x, y, s, col) => {
    g.fillStyle = col;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.beginPath();
      g.ellipse(x + Math.cos(a) * s, y + Math.sin(a) * s, s * 0.8, s * 0.45, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#e8b84a';
    g.beginPath();
    g.arc(x, y, s * 0.45, 0, Math.PI * 2);
    g.fill();
  };
  const step = 1.6 * k;
  for (let x = m + step / 2; x < w - m; x += step) {
    flower(x, m / 2 + 4, 9, 'rgba(200,70,80,0.75)');
    flower(x, h - m / 2 - 4, 9, 'rgba(200,70,80,0.75)');
  }
  for (let y = m + step / 2; y < h - m; y += step) {
    flower(m / 2 + 4, y, 9, 'rgba(70,110,190,0.7)');
    flower(w - m / 2 - 4, y, 9, 'rgba(70,110,190,0.7)');
  }
  // ажурные дырочки по краю
  g.fillStyle = 'rgba(150,130,100,0.35)';
  for (let x = 8; x < w; x += 18) {
    g.beginPath();
    g.arc(x, 6, 4, 0, Math.PI * 2);
    g.arc(x, h - 6, 4, 0, Math.PI * 2);
    g.fill();
  }
  for (let y = 8; y < h; y += 18) {
    g.beginPath();
    g.arc(6, y, 4, 0, Math.PI * 2);
    g.arc(w - 6, y, 4, 0, Math.PI * 2);
    g.fill();
  }
  // центральный медальон
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    flower(w / 2 + Math.cos(a) * 3 * k, h / 2 + Math.sin(a) * 3 * k, 7, 'rgba(210,190,160,0.45)');
  }
  const t = tex(c, [1, 1]);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// ситец: синий с мелкими цветочками
export function chintz() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#2c5aa0';
  g.fillRect(0, 0, 512, 512);
  const r = rnd(21);
  for (let i = 0; i < 60; i++) {
    const x = r() * 512,
      y = r() * 512,
      s = 5 + r() * 4;
    const cols = ['#ffffff', '#ffe27a', '#ff9fb0'];
    g.fillStyle = cols[i % 3];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + i;
      for (const dx of [0, 512, -512])
        for (const dy of [0, 512, -512]) {
          g.beginPath();
          g.arc(x + dx + Math.cos(a) * s, y + dy + Math.sin(a) * s, s * 0.62, 0, Math.PI * 2);
          g.fill();
        }
    }
    g.fillStyle = '#f2a33a';
    for (const dx of [0, 512, -512])
      for (const dy of [0, 512, -512]) {
        g.beginPath();
        g.arc(x + dx, y + dy, s * 0.45, 0, Math.PI * 2);
        g.fill();
      }
    g.fillStyle = '#6fbf5a';
    g.beginPath();
    g.ellipse(x + s * 1.8, y + s * 0.6, s * 0.9, s * 0.4, 0.6, 0, Math.PI * 2);
    g.fill();
  }
  return tex(c, [5, 4]);
}

// трава: base — основной цвет; leaves — опавшие листья; flowers — цветочки
export function grass({ base = '#5f9e3c', seed = 2, leaves = 0, flowers = 1, snow = false } = {}) {
  const [c, g] = canvas(512, 512);
  const r = rnd(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);
  const col = new THREE.Color(base);
  for (let i = 0; i < (snow ? 2500 : 9000); i++) {
    const x = r() * 512,
      y = r() * 512;
    const k = 0.75 + r() * 0.5;
    const cc = col.clone().multiplyScalar(k);
    g.strokeStyle = '#' + cc.getHexString();
    g.lineWidth = snow ? 3 : 1.5;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 6, y - 4 - r() * 8);
    g.stroke();
  }
  if (snow) {
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgba(150,175,210,${0.05 + r() * 0.08})`;
      g.beginPath();
      g.ellipse(r() * 512, r() * 512, 20 + r() * 40, 8 + r() * 14, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }
  for (let i = 0; i < flowers * 50; i++) {
    const x = r() * 512,
      y = r() * 512;
    const cols = ['#ffffff', '#ffe066', '#ff8fb1', '#b9a2ff'];
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      g.beginPath();
      g.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.4, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#f4b23a';
    g.beginPath();
    g.arc(x, y, 1.8, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < leaves; i++) {
    const x = r() * 512,
      y = r() * 512,
      a = r() * 6.28;
    const cols = ['#e2741f', '#f2b13a', '#c4441e', '#a8601e', '#e8c04a'];
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.beginPath();
    g.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(90,40,10,0.5)';
    g.beginPath();
    g.moveTo(-9, 0);
    g.lineTo(9, 0);
    g.stroke();
    g.restore();
  }
  return tex(c, [40, 40]);
}

// пятна тени от листвы (альфа-маска)
export function dapple() {
  const [c, g] = canvas(512, 512);
  g.clearRect(0, 0, 512, 512);
  const r = rnd(77);
  for (let i = 0; i < 70; i++) {
    const x = r() * 512,
      y = r() * 512,
      s = 20 + r() * 50;
    const gr = g.createRadialGradient(x, y, 0, x, y, s);
    gr.addColorStop(0, 'rgba(0,0,0,0.5)');
    gr.addColorStop(0.6, 'rgba(0,0,0,0.25)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    for (const dx of [0, 512, -512])
      for (const dy of [0, 512, -512]) {
        g.beginPath();
        g.arc(x + dx, y + dy, s, 0, Math.PI * 2);
        g.fill();
      }
  }
  // солнечные «зайчики» — дырочки в тени
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 90; i++) {
    const x = r() * 512,
      y = r() * 512,
      s = 4 + r() * 12;
    const gr = g.createRadialGradient(x, y, 0, x, y, s);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, s, 0, Math.PI * 2);
    g.fill();
  }
  const t = tex(c, [1, 1]);
  return t;
}

// мягкое пятно (для свечения огоньков, пара, светлячков)
export function glowTex() {
  const [c, g] = canvas(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

// мягкая круглая тень под предметами
export function blobTex() {
  const [c, g] = canvas(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)');
  gr.addColorStop(0.6, 'rgba(0,0,0,0.25)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// листок блокнота со счётом «Мы / Они»
export function notepad(lang) {
  const [c, g] = canvas(256, 340);
  g.fillStyle = '#fffdf4';
  g.fillRect(0, 0, 256, 340);
  g.strokeStyle = 'rgba(80,130,200,0.35)';
  g.lineWidth = 2;
  for (let y = 46; y < 340; y += 24) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(256, y);
    g.stroke();
  }
  g.strokeStyle = 'rgba(220,80,80,0.5)';
  g.beginPath();
  g.moveTo(128, 20);
  g.lineTo(128, 330);
  g.stroke();
  g.fillStyle = '#3a4a7a';
  g.font = '700 30px Caveat, cursive';
  g.textAlign = 'center';
  g.fillText(lang === 'ru' ? 'Мы' : 'Us', 64, 38);
  g.fillText(lang === 'ru' ? 'Они' : 'Them', 192, 38);
  const a = [12, 27, 27, 41],
    b = [0, 18, 33, 33];
  g.font = '700 26px Caveat, cursive';
  a.forEach((v, i) => g.fillText(String(v), 64, 68 + i * 24));
  b.forEach((v, i) => g.fillText(String(v), 192, 68 + i * 24));
  // перечёркнутые «палочки»
  g.strokeStyle = '#3a4a7a';
  g.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.moveTo(40, 66 + i * 24 - 8);
    g.lineTo(88, 66 + i * 24 - 8);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
