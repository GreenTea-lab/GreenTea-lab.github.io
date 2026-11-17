// Процедурные текстуры на canvas: обои, паркет, плитка, камень, ковры, картины, окно в ночь
import * as THREE from 'three';

export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

function cv(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

const cache = {};
function tex(key, make, repeat = true) {
  if (cache[key]) return cache[key];
  const c = make();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return (cache[key] = t);
}

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
function shade(c, k) {
  const r = Math.min(255, Math.max(0, ((c >> 16) & 255) * k));
  const g = Math.min(255, Math.max(0, ((c >> 8) & 255) * k));
  const b = Math.min(255, Math.max(0, (c & 255) * k));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

// мелкий шум поверх (старение)
function grime(g, w, h, R, amt = 0.08, n = 900) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(0,0,0,${R() * amt})`;
    const s = 1 + R() * 3;
    g.fillRect(R() * w, R() * h, s, s);
  }
  for (let i = 0; i < n / 3; i++) {
    g.fillStyle = `rgba(255,255,255,${R() * amt * 0.5})`;
    g.fillRect(R() * w, R() * h, 1, 1);
  }
}

// пятна сырости
function stains(g, w, h, R, k = 3) {
  for (let i = 0; i < k; i++) {
    const x = R() * w,
      y = R() * h,
      r = 20 + R() * 60;
    const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r);
    gr.addColorStop(0, 'rgba(60,40,10,0.10)');
    gr.addColorStop(0.85, 'rgba(60,40,10,0.06)');
    gr.addColorStop(1, 'rgba(60,40,10,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.fill();
  }
}

// ---------- обои: узоры разного типа (дамаск, полосы, цветы, ромбы) ----------
export function wallpaper(kind, base, ink, seed = 1) {
  return tex(`wp${kind}${base}${ink}${seed}`, () => {
    const S = 256;
    const [c, g] = cv(S);
    const R = rng(seed);
    g.fillStyle = hex(base);
    g.fillRect(0, 0, S, S);
    g.fillStyle = hex(ink);
    g.strokeStyle = hex(ink);
    if (kind === 'stripe') {
      for (let x = 0; x < S; x += 64) {
        g.globalAlpha = 0.55;
        g.fillRect(x + 6, 0, 18, S);
        g.globalAlpha = 0.35;
        g.fillRect(x + 30, 0, 3, S);
        g.fillRect(x + 38, 0, 3, S);
        // мелкие цветочки в полосе
        g.globalAlpha = 0.45;
        for (let y = 16; y < S; y += 32) {
          for (let a = 0; a < 5; a++) {
            g.beginPath();
            g.arc(x + 50 + Math.cos(a * 1.26) * 4, y + Math.sin(a * 1.26) * 4, 2.6, 0, 7);
            g.fill();
          }
        }
      }
    } else if (kind === 'damask') {
      g.globalAlpha = 0.5;
      const motif = (cx, cy, s) => {
        g.save();
        g.translate(cx, cy);
        g.scale(s, s);
        g.beginPath();
        g.moveTo(0, -30);
        g.bezierCurveTo(14, -18, 18, -4, 0, 30);
        g.bezierCurveTo(-18, -4, -14, -18, 0, -30);
        g.fill();
        g.lineWidth = 3;
        for (const sx of [-1, 1]) {
          g.beginPath();
          g.moveTo(0, 10);
          g.bezierCurveTo(sx * 22, 0, sx * 28, -20, sx * 14, -26);
          g.stroke();
          g.beginPath();
          g.arc(sx * 14, -26, 4, 0, 7);
          g.fill();
          g.beginPath();
          g.moveTo(0, 20);
          g.bezierCurveTo(sx * 20, 26, sx * 26, 14, sx * 22, 6);
          g.stroke();
        }
        g.restore();
      };
      for (const [x, y] of [[64, 64], [192, 64], [0, 192], [128, 192], [256, 192]]) motif(x, y, 1.3);
      g.globalAlpha = 0.3;
      for (const [x, y] of [[0, 0], [128, 0], [256, 0], [64, 128 + 2], [192, 128 + 2], [0, 256], [128, 256], [256, 256]]) {
        g.beginPath();
        g.arc(x, y, 5, 0, 7);
        g.fill();
      }
    } else if (kind === 'flower') {
      g.globalAlpha = 0.5;
      for (let i = 0; i < 14; i++) {
        const x = ((i * 73) % 256) + (i % 2) * 20,
          y = ((i * 151) % 256);
        for (const [dx, dy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) {
          for (let a = 0; a < 6; a++) {
            g.beginPath();
            g.ellipse(x + dx + Math.cos(a * 1.05) * 7, y + dy + Math.sin(a * 1.05) * 7, 6, 3.5, a * 1.05, 0, 7);
            g.fill();
          }
          g.globalAlpha = 0.25;
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(x + dx, y + dy + 10);
          g.quadraticCurveTo(x + dx + 12, y + dy + 22, x + dx + 4, y + dy + 34);
          g.stroke();
          g.globalAlpha = 0.5;
        }
      }
    } else if (kind === 'diamond') {
      g.globalAlpha = 0.35;
      g.lineWidth = 2;
      for (let i = -4; i < 8; i++) {
        g.beginPath();
        g.moveTo(i * 64, 0);
        g.lineTo(i * 64 + 256, 256);
        g.stroke();
        g.beginPath();
        g.moveTo(i * 64, 256);
        g.lineTo(i * 64 + 256, 0);
        g.stroke();
      }
      g.globalAlpha = 0.5;
      for (let x = 0; x <= 256; x += 64) for (let y = 0; y <= 256; y += 64) {
        g.beginPath();
        g.arc(x, y, 4, 0, 7);
        g.fill();
        g.beginPath();
        g.arc(x + 32, y + 32, 2.5, 0, 7);
        g.fill();
      }
    } else if (kind === 'kids') {
      // детская: звёздочки и месяцы
      g.globalAlpha = 0.55;
      const star = (x, y, r) => {
        g.beginPath();
        for (let a = 0; a < 10; a++) {
          const rr = a % 2 ? r * 0.45 : r;
          g.lineTo(x + Math.cos(a * 0.628 - 1.57) * rr, y + Math.sin(a * 0.628 - 1.57) * rr);
        }
        g.fill();
      };
      for (let i = 0; i < 10; i++) star((i * 97) % 256, (i * 61 + 20) % 256, 7 + (i % 3) * 2);
      for (let i = 0; i < 4; i++) {
        const x = (i * 131 + 40) % 256,
          y = (i * 89 + 90) % 256;
        g.beginPath();
        g.arc(x, y, 12, 0, 7);
        g.fill();
        g.globalCompositeOperation = 'destination-out';
        g.beginPath();
        g.arc(x + 6, y - 4, 11, 0, 7);
        g.fill();
        g.globalCompositeOperation = 'source-over';
      }
    }
    g.globalAlpha = 1;
    // потёртость, разводы, затемнение снизу
    stains(g, S, S, R, 2);
    grime(g, S, S, R, 0.07, 700);
    return c;
  });
}

// ---------- паркет / доски ----------
export function planks(base = 0x6b4a2e, seed = 3) {
  return tex(`pl${base}${seed}`, () => {
    const S = 512;
    const [c, g] = cv(S);
    const R = rng(seed);
    const rows = 8,
      h = S / rows;
    for (let r = 0; r < rows; r++) {
      let x = -R() * 200;
      while (x < S) {
        const len = 140 + R() * 220;
        const k = 0.78 + R() * 0.4;
        g.fillStyle = shade(base, k);
        g.fillRect(x, r * h, len, h);
        // волокна
        g.globalAlpha = 0.18;
        for (let i = 0; i < 14; i++) {
          g.strokeStyle = R() < 0.5 ? 'rgba(0,0,0,.7)' : 'rgba(255,220,180,.4)';
          g.lineWidth = 0.6 + R() * 1.4;
          const yy = r * h + 3 + R() * (h - 6);
          g.beginPath();
          g.moveTo(x, yy);
          g.bezierCurveTo(x + len * 0.3, yy + (R() - 0.5) * 6, x + len * 0.6, yy + (R() - 0.5) * 6, x + len, yy + (R() - 0.5) * 4);
          g.stroke();
        }
        // сучок
        if (R() < 0.3) {
          g.globalAlpha = 0.35;
          g.fillStyle = 'rgba(30,15,5,1)';
          g.beginPath();
          g.ellipse(x + R() * len, r * h + h / 2, 6 + R() * 5, 3 + R() * 2, 0, 0, 7);
          g.fill();
        }
        g.globalAlpha = 1;
        g.fillStyle = 'rgba(0,0,0,.55)';
        g.fillRect(x, r * h, 2, h);
        // гвоздики
        g.fillStyle = 'rgba(20,20,20,.6)';
        g.fillRect(x + 8, r * h + 6, 3, 3);
        g.fillRect(x + 8, r * h + h - 9, 3, 3);
        x += len;
      }
      g.fillStyle = 'rgba(0,0,0,.6)';
      g.fillRect(0, r * h, S, 2);
    }
    grime(g, S, S, R, 0.1, 1500);
    stains(g, S, S, R, 3);
    return c;
  });
}

// ---------- плитка: шахматка или мелкая белая ----------
export function tiles(a = 0xd8d2c4, b = 0x2a2a2e, n = 8, seed = 5) {
  return tex(`ti${a}${b}${n}`, () => {
    const S = 512;
    const [c, g] = cv(S);
    const R = rng(seed);
    const s = S / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const k = 0.88 + R() * 0.18;
      g.fillStyle = shade((i + j) % 2 ? b : a, k);
      g.fillRect(i * s, j * s, s, s);
      // блик
      g.fillStyle = 'rgba(255,255,255,.06)';
      g.fillRect(i * s + 4, j * s + 4, s * 0.5, 3);
      // трещинка
      if (R() < 0.12) {
        g.strokeStyle = 'rgba(0,0,0,.35)';
        g.lineWidth = 1;
        g.beginPath();
        let x = i * s + R() * s,
          y = j * s;
        g.moveTo(x, y);
        for (let q = 0; q < 4; q++) g.lineTo((x += (R() - 0.5) * 18), (y += s / 4));
        g.stroke();
      }
    }
    g.strokeStyle = 'rgba(40,36,30,.8)';
    g.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      g.beginPath();
      g.moveTo(i * s, 0);
      g.lineTo(i * s, S);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i * s);
      g.lineTo(S, i * s);
      g.stroke();
    }
    grime(g, S, S, R, 0.12, 1200);
    stains(g, S, S, R, 4);
    return c;
  });
}

// ---------- камень (подвал) ----------
export function stone(seed = 7) {
  return tex(`st${seed}`, () => {
    const S = 512;
    const [c, g] = cv(S);
    const R = rng(seed);
    g.fillStyle = '#3a3630';
    g.fillRect(0, 0, S, S);
    const rows = 7,
      h = S / rows;
    for (let r = 0; r < rows; r++) {
      let x = -(r % 2) * 40;
      while (x < S) {
        const w = 60 + R() * 70;
        const k = 0.75 + R() * 0.5;
        g.fillStyle = shade(0x6a6458, k);
        g.beginPath();
        g.roundRect(x + 3, r * h + 3, w - 6, h - 6, 10);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,.07)';
        g.fillRect(x + 8, r * h + 6, w - 20, 4);
        for (let i = 0; i < 20; i++) {
          g.fillStyle = `rgba(0,0,0,${R() * 0.2})`;
          g.fillRect(x + R() * w, r * h + R() * h, 3, 3);
        }
        // мох
        if (R() < 0.25) {
          g.fillStyle = 'rgba(60,90,40,.35)';
          g.beginPath();
          g.ellipse(x + R() * w, r * h + h - 8, 14, 5, 0, 0, 7);
          g.fill();
        }
        x += w;
      }
    }
    grime(g, S, S, R, 0.15, 1500);
    return c;
  });
}

// ---------- потолок: штукатурка с трещинами ----------
export function plaster(base = 0x8a8478, seed = 9) {
  return tex(`pc${base}${seed}`, () => {
    const S = 256;
    const [c, g] = cv(S);
    const R = rng(seed);
    g.fillStyle = hex(base);
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,255,255'},${R() * 0.06})`;
      g.fillRect(R() * S, R() * S, 2, 2);
    }
    g.strokeStyle = 'rgba(30,25,20,.35)';
    for (let k = 0; k < 3; k++) {
      let x = R() * S,
        y = R() * S;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      for (let i = 0; i < 12; i++) g.lineTo((x += (R() - 0.5) * 30), (y += (R() - 0.5) * 30));
      g.stroke();
    }
    stains(g, S, S, R, 3);
    return c;
  });
}

// ---------- текстура дерева для мебели (светлая, тонируется цветом вершин) ----------
export function woodGrain(seed = 11) {
  return tex(`wg${seed}`, () => {
    const S = 256;
    const [c, g] = cv(S);
    const R = rng(seed);
    g.fillStyle = '#c8b8a4';
    g.fillRect(0, 0, S, S);
    for (let i = 0; i < 60; i++) {
      g.strokeStyle = R() < 0.6 ? `rgba(70,45,25,${0.1 + R() * 0.2})` : `rgba(255,240,220,${R() * 0.2})`;
      g.lineWidth = 0.5 + R() * 2;
      const y = R() * S;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= S; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 3 + (R() - 0.5) * 2);
      g.stroke();
    }
    for (let k = 0; k < 2; k++) {
      const x = R() * S,
        y = R() * S;
      g.strokeStyle = 'rgba(60,35,15,.3)';
      for (let r = 2; r < 12; r += 3) {
        g.beginPath();
        g.ellipse(x, y, r * 2, r, 0, 0, 7);
        g.stroke();
      }
    }
    grime(g, S, S, R, 0.08, 500);
    return c;
  });
}

// ---------- ткань (плетение) ----------
export function fabric(seed = 13) {
  return tex(`fb${seed}`, () => {
    const S = 128;
    const [c, g] = cv(S);
    const R = rng(seed);
    g.fillStyle = '#d0d0d0';
    g.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 2) {
      g.fillStyle = `rgba(0,0,0,${0.04 + R() * 0.06})`;
      g.fillRect(0, y, S, 1);
    }
    for (let x = 0; x < S; x += 2) {
      g.fillStyle = `rgba(255,255,255,${0.03 + R() * 0.05})`;
      g.fillRect(x, 0, 1, S);
    }
    grime(g, S, S, R, 0.1, 300);
    return c;
  });
}

// ---------- ковёр с орнаментом ----------
export function rug(base, ink, seed = 15) {
  return tex(`rg${base}${ink}${seed}`, () => {
    const W = 256,
      H = 384;
    const [c, g] = cv(W, H);
    const R = rng(seed);
    g.fillStyle = hex(base);
    g.fillRect(0, 0, W, H);
    g.strokeStyle = hex(ink);
    g.fillStyle = hex(ink);
    g.lineWidth = 6;
    g.strokeRect(14, 14, W - 28, H - 28);
    g.lineWidth = 2;
    g.strokeRect(26, 26, W - 52, H - 52);
    // кайма из ромбиков
    for (let y = 40; y < H - 30; y += 22) for (const x of [20, W - 20]) {
      g.beginPath();
      g.moveTo(x, y - 6);
      g.lineTo(x + 5, y);
      g.lineTo(x, y + 6);
      g.lineTo(x - 5, y);
      g.fill();
    }
    // центральный медальон
    g.save();
    g.translate(W / 2, H / 2);
    for (let r = 80; r > 10; r -= 18) {
      g.globalAlpha = 0.5 + (r % 36) / 80;
      g.beginPath();
      g.moveTo(0, -r * 1.3);
      g.lineTo(r, 0);
      g.lineTo(0, r * 1.3);
      g.lineTo(-r, 0);
      g.closePath();
      g.stroke();
    }
    g.globalAlpha = 0.8;
    for (let a = 0; a < 8; a++) {
      g.rotate(Math.PI / 4);
      g.beginPath();
      g.ellipse(0, -30, 6, 16, 0, 0, 7);
      g.fill();
    }
    g.restore();
    g.globalAlpha = 1;
    grime(g, W, H, R, 0.15, 900);
    // бахрома
    g.fillStyle = 'rgba(230,220,190,.8)';
    for (let x = 4; x < W; x += 6) {
      g.fillRect(x, 0, 2, 8);
      g.fillRect(x, H - 8, 2, 8);
    }
    return c;
  }, false);
}

// ---------- картины: портреты с жутковатыми глазами, пейзажи ----------
export function painting(kind, seed = 1) {
  return tex(`pt${kind}${seed}`, () => {
    const W = 160,
      H = 200;
    const [c, g] = cv(W, H);
    const R = rng(seed + 100);
    if (kind === 'portrait') {
      const bg = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, 140);
      bg.addColorStop(0, ['#4a3a2a', '#2e3a30', '#3a2a36'][seed % 3]);
      bg.addColorStop(1, '#120c08');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      // плечи
      g.fillStyle = ['#1a1410', '#22201c', '#2a1418'][seed % 3];
      g.beginPath();
      g.ellipse(W / 2, H + 20, 70, 70, 0, 0, 7);
      g.fill();
      // воротник
      g.fillStyle = '#d8cfc0';
      g.beginPath();
      g.moveTo(W / 2 - 22, H - 52);
      g.lineTo(W / 2, H - 30);
      g.lineTo(W / 2 + 22, H - 52);
      g.fill();
      // шея и голова
      g.fillStyle = '#b8a48c';
      g.fillRect(W / 2 - 10, H - 80, 20, 30);
      g.beginPath();
      g.ellipse(W / 2, 80, 30, 38, 0, 0, 7);
      g.fill();
      // волосы
      g.fillStyle = ['#2a1a10', '#4a3a2a', '#0e0a08'][seed % 3];
      g.beginPath();
      g.ellipse(W / 2, 62, 33, 24, 0, Math.PI, 0);
      g.fill();
      if (seed % 2) {
        g.fillRect(W / 2 - 33, 62, 10, 50);
        g.fillRect(W / 2 + 23, 62, 10, 50);
      }
      // глаза — тёмные, без зрачков
      g.fillStyle = '#100808';
      g.beginPath();
      g.ellipse(W / 2 - 11, 80, 6, 4, 0, 0, 7);
      g.ellipse(W / 2 + 11, 80, 6, 4, 0, 0, 7);
      g.fill();
      g.fillStyle = 'rgba(255,240,220,.7)';
      g.fillRect(W / 2 - 12, 79, 2, 2);
      g.fillRect(W / 2 + 10, 79, 2, 2);
      g.strokeStyle = '#6a4a3a';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(W / 2 - 7, 102);
      g.lineTo(W / 2 + 7, 102);
      g.stroke();
    } else if (kind === 'landscape') {
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#2a3a4a');
      sky.addColorStop(0.6, '#6a6a5a');
      sky.addColorStop(1, '#2a2a1e');
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#e8e0c0';
      g.beginPath();
      g.arc(110, 50, 14, 0, 7);
      g.fill();
      g.fillStyle = '#1e2418';
      g.beginPath();
      g.moveTo(0, 140);
      for (let x = 0; x <= W; x += 10) g.lineTo(x, 130 + Math.sin(x * 0.05 + seed) * 12);
      g.lineTo(W, H);
      g.lineTo(0, H);
      g.fill();
      // одинокий дом на холме
      g.fillStyle = '#0e0e0a';
      g.fillRect(40, 108, 26, 22);
      g.beginPath();
      g.moveTo(36, 110);
      g.lineTo(53, 94);
      g.lineTo(70, 110);
      g.fill();
      g.fillStyle = '#e8c070';
      g.fillRect(48, 114, 5, 6);
    } else {
      // натюрморт / цветы
      g.fillStyle = '#1e1810';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#4a3020';
      g.fillRect(0, 150, W, 50);
      g.fillStyle = '#5a6a7a';
      g.beginPath();
      g.ellipse(W / 2, 135, 22, 26, 0, 0, 7);
      g.fill();
      for (let i = 0; i < 7; i++) {
        g.fillStyle = ['#8a2a2a', '#c09040', '#e0d8c0', '#6a2a4a'][i % 4];
        g.beginPath();
        g.arc(W / 2 + Math.cos(i) * 30, 80 + Math.sin(i * 2) * 20, 12, 0, 7);
        g.fill();
      }
    }
    // кракелюр и лак
    g.strokeStyle = 'rgba(0,0,0,.25)';
    g.lineWidth = 0.6;
    for (let i = 0; i < 40; i++) {
      const x = R() * W,
        y = R() * H;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (R() - 0.5) * 20, y + (R() - 0.5) * 20);
      g.stroke();
    }
    const v = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 130);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,.6)');
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);
    return c;
  }, false);
}

// ---------- вид из окна: ночное небо, луна, деревья, забор ----------
export function nightWindow(seed = 1) {
  return tex(`nw${seed}`, () => {
    const W = 128,
      H = 192;
    const [c, g] = cv(W, H);
    const R = rng(seed + 40);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0a1424');
    sky.addColorStop(0.65, '#1c3048');
    sky.addColorStop(1, '#283c50');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(220,230,255,${0.3 + R() * 0.6})`;
      g.fillRect(R() * W, R() * H * 0.6, 1, 1);
    }
    if (seed % 2) {
      const mx = 30 + R() * 70,
        my = 30 + R() * 30;
      const gl = g.createRadialGradient(mx, my, 4, mx, my, 40);
      gl.addColorStop(0, 'rgba(220,230,255,.5)');
      gl.addColorStop(1, 'rgba(220,230,255,0)');
      g.fillStyle = gl;
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#e8eef8';
      g.beginPath();
      g.arc(mx, my, 11, 0, 7);
      g.fill();
      g.fillStyle = 'rgba(150,160,180,.4)';
      g.beginPath();
      g.arc(mx - 3, my + 2, 3, 0, 7);
      g.arc(mx + 4, my - 3, 2, 0, 7);
      g.fill();
    }
    // облака
    g.fillStyle = 'rgba(40,55,75,.7)';
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.ellipse(R() * W, 20 + R() * 70, 30 + R() * 20, 6 + R() * 4, 0, 0, 7);
      g.fill();
    }
    // деревья-силуэты
    g.fillStyle = '#05080c';
    for (let i = 0; i < 3; i++) {
      const x = R() * W,
        base = H - 30 - R() * 20;
      g.fillRect(x - 2, base - 50, 4, 80);
      g.lineWidth = 2;
      g.strokeStyle = '#05080c';
      for (let b = 0; b < 7; b++) {
        const y = base - 50 + b * 8;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (b % 2 ? 1 : -1) * (12 + R() * 14), y - 10 - R() * 10);
        g.stroke();
      }
    }
    // земля и забор
    g.fillRect(0, H - 26, W, 26);
    for (let x = 2; x < W; x += 10) {
      g.fillRect(x, H - 44, 4, 20);
      g.beginPath();
      g.moveTo(x, H - 44);
      g.lineTo(x + 2, H - 49);
      g.lineTo(x + 4, H - 44);
      g.fill();
    }
    g.fillRect(0, H - 38, W, 2);
    // капли дождя на стекле
    for (let i = 0; i < 26; i++) {
      g.fillStyle = 'rgba(180,200,230,.25)';
      const x = R() * W,
        y = R() * H;
      g.beginPath();
      g.ellipse(x, y, 1.4, 2.2, 0, 0, 7);
      g.fill();
      g.fillRect(x - 0.5, y, 1, 4 + R() * 10);
    }
    return c;
  }, false);
}

// пятно лунного света на полу
export function moonPool() {
  return tex('moonpool', () => {
    const [c, g] = cv(128);
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, 'rgba(150,180,255,.55)');
    gr.addColorStop(1, 'rgba(150,180,255,0)');
    g.fillStyle = gr;
    // переплёт окна — крест
    g.fillRect(8, 0, 52, 60);
    g.fillRect(68, 0, 52, 60);
    g.fillRect(8, 68, 52, 60);
    g.fillRect(68, 68, 52, 60);
    return c;
  }, false);
}

// мягкое круглое пятно (пыль, блик, свечение)
export function glow(color = '255,255,255') {
  return tex('glow' + color, () => {
    const [c, g] = cv(64);
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${color},1)`);
    gr.addColorStop(0.3, `rgba(${color},.45)`);
    gr.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return c;
  }, false);
}

// паутина
export function cobweb() {
  return tex('web', () => {
    const [c, g] = cv(128);
    g.strokeStyle = 'rgba(230,230,230,.55)';
    g.lineWidth = 1;
    for (let a = 0; a <= 8; a++) {
      const ang = (a / 8) * (Math.PI / 2);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(ang) * 128, Math.sin(ang) * 128);
      g.stroke();
    }
    for (let r = 14; r < 128; r += 14) {
      g.beginPath();
      for (let a = 0; a <= 8; a++) {
        const ang = (a / 8) * (Math.PI / 2);
        const rr = r + Math.sin(a * 3) * 3;
        const x = Math.cos(ang) * rr,
          y = Math.sin(ang) * rr;
        a ? g.quadraticCurveTo(Math.cos(ang - 0.1) * (rr - 4), Math.sin(ang - 0.1) * (rr - 4), x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
    return c;
  }, false);
}

// записка с каракулями (на стенах)
export function scribble(seed = 1) {
  return tex('scr' + seed, () => {
    const [c, g] = cv(128, 96);
    const R = rng(seed + 300);
    g.fillStyle = '#d8cca8';
    g.fillRect(0, 0, 128, 96);
    g.strokeStyle = 'rgba(40,20,20,.75)';
    g.lineWidth = 1.4;
    for (let y = 16; y < 88; y += 12) {
      g.beginPath();
      let x = 10;
      g.moveTo(x, y);
      while (x < 110 - R() * 30) {
        x += 3;
        g.lineTo(x, y + Math.sin(x * 0.9 + R()) * 2.5);
      }
      g.stroke();
    }
    grime(g, 128, 96, R, 0.15, 200);
    return c;
  }, false);
}
