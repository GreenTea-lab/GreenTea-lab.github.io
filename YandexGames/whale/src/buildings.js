// Рисунки зданий городка на спине кита. Каждое: (ctx, w, t, tier, night) — рисуется вверх от (0,0), ширина w.
// tier — сколько порогов пройдено (0..10): здание растёт, появляются флажки, золото, искры.
const TAU = Math.PI * 2;

function rr(x, X, Y, W, H, r) {
  x.beginPath();
  x.moveTo(X + r, Y);
  x.arcTo(X + W, Y, X + W, Y + H, r);
  x.arcTo(X + W, Y + H, X, Y + H, r);
  x.arcTo(X, Y + H, X, Y, r);
  x.arcTo(X, Y, X + W, Y, r);
  x.closePath();
}
const OL = 'rgba(40,30,60,.55)';
function fillS(x, c, lw) {
  x.fillStyle = c;
  x.fill();
  x.strokeStyle = OL;
  x.lineWidth = lw;
  x.stroke();
}
function win(x, X, Y, W, H, night, lw) {
  rr(x, X, Y, W, H, W * 0.2);
  fillS(x, night ? '#ffd86a' : '#9fd8f6', lw * 0.7);
  if (night) {
    const g = x.createRadialGradient(X + W / 2, Y + H / 2, 0, X + W / 2, Y + H / 2, W * 2);
    g.addColorStop(0, 'rgba(255,215,110,.35)');
    g.addColorStop(1, 'rgba(255,215,110,0)');
    x.fillStyle = g;
    x.fillRect(X - W * 2, Y - W * 2, W * 5, H + W * 4);
  }
}
function roof(x, X, Y, W, H, c, lw) {
  x.beginPath();
  x.moveTo(X - W * 0.08, Y);
  x.lineTo(X + W / 2, Y - H);
  x.lineTo(X + W * 1.08, Y);
  x.closePath();
  fillS(x, c, lw);
}
function flag(x, X, Y, h, c, t, lw) {
  x.strokeStyle = '#6a4a3a';
  x.lineWidth = lw;
  x.beginPath();
  x.moveTo(X, Y);
  x.lineTo(X, Y - h);
  x.stroke();
  const f = Math.sin(t * 5 + X) * h * 0.08;
  x.beginPath();
  x.moveTo(X, Y - h);
  x.quadraticCurveTo(X + h * 0.3, Y - h + f, X + h * 0.55, Y - h * 0.86 + f);
  x.lineTo(X, Y - h * 0.72);
  x.closePath();
  x.fillStyle = c;
  x.fill();
}
function star(x, X, Y, r, c) {
  x.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.45 : r;
    x.lineTo(X + Math.cos(a) * rad, Y + Math.sin(a) * rad);
  }
  x.closePath();
  x.fillStyle = c;
  x.fill();
}

const DRAW = {
  // палатка с лимонадом
  lemon(x, w, t, tier, night, lw) {
    const h = w * 0.62;
    rr(x, -w * 0.42, -h * 0.55, w * 0.84, h * 0.55, w * 0.06);
    fillS(x, '#f6e2b0', lw);
    // стойки
    x.fillStyle = '#b07a4a';
    x.fillRect(-w * 0.4, -h * 1.05, w * 0.06, h * 0.55);
    x.fillRect(w * 0.34, -h * 1.05, w * 0.06, h * 0.55);
    // полосатый навес
    for (let i = 0; i < 6; i++) {
      x.beginPath();
      const X = -w * 0.5 + (i * w) / 6;
      x.moveTo(X, -h * 1.05);
      x.lineTo(X + w / 6, -h * 1.05);
      x.lineTo(X + w / 6, -h * 0.82);
      x.quadraticCurveTo(X + w / 12, -h * 0.68, X, -h * 0.82);
      x.closePath();
      x.fillStyle = i % 2 ? '#fff6dc' : '#ffcc33';
      x.fill();
    }
    x.strokeStyle = OL;
    x.lineWidth = lw;
    x.strokeRect(-w * 0.5, -h * 1.05, w, h * 0.23);
    // лимон
    x.beginPath();
    x.ellipse(0, -h * 0.3, w * 0.13, w * 0.1, 0, 0, TAU);
    fillS(x, '#ffe14a', lw * 0.8);
    x.fillStyle = '#7ac04a';
    x.beginPath();
    x.ellipse(w * 0.1, -h * 0.4, w * 0.05, w * 0.025, -0.6, 0, TAU);
    x.fill();
    // кувшин
    rr(x, -w * 0.34, -h * 0.72, w * 0.14, h * 0.17, w * 0.03);
    fillS(x, 'rgba(255,240,140,.9)', lw * 0.7);
  },
  // рыбная лавка
  fish(x, w, t, tier, night, lw) {
    const h = w * 0.7;
    rr(x, -w * 0.42, -h, w * 0.84, h, w * 0.05);
    fillS(x, '#e8b07a', lw);
    for (let i = 1; i < 4; i++) {
      x.strokeStyle = 'rgba(120,70,30,.25)';
      x.lineWidth = lw * 0.6;
      x.beginPath();
      x.moveTo(-w * 0.42, -h * (i / 4));
      x.lineTo(w * 0.42, -h * (i / 4));
      x.stroke();
    }
    roof(x, -w * 0.48, -h, w * 0.96, h * 0.55, '#3a8fd8', lw);
    rr(x, -w * 0.14, -h * 0.55, w * 0.28, h * 0.55, w * 0.04);
    fillS(x, '#8a5a3a', lw * 0.8);
    win(x, -w * 0.36, -h * 0.75, w * 0.16, w * 0.16, night, lw);
    win(x, w * 0.2, -h * 0.75, w * 0.16, w * 0.16, night, lw);
    // рыбка-вывеска
    const fy = -h * 1.62 + Math.sin(t * 2) * w * 0.02;
    x.beginPath();
    x.ellipse(0, fy, w * 0.16, w * 0.08, 0, 0, TAU);
    x.moveTo(-w * 0.14, fy);
    x.lineTo(-w * 0.26, fy - w * 0.07);
    x.lineTo(-w * 0.26, fy + w * 0.07);
    x.closePath();
    fillS(x, '#ff8a5a', lw * 0.8);
    x.fillStyle = '#222';
    x.beginPath();
    x.arc(w * 0.08, fy - w * 0.015, w * 0.018, 0, TAU);
    x.fill();
  },
  // маяк
  light(x, w, t, tier, night, lw) {
    const h = w * 1.9;
    x.beginPath();
    x.moveTo(-w * 0.3, 0);
    x.lineTo(-w * 0.2, -h * 0.82);
    x.lineTo(w * 0.2, -h * 0.82);
    x.lineTo(w * 0.3, 0);
    x.closePath();
    fillS(x, '#fbf6ee', lw);
    x.save();
    x.clip();
    x.fillStyle = '#e8463a';
    for (let i = 0; i < 4; i++) x.fillRect(-w, -h * (0.12 + i * 0.2), w * 2, h * 0.09);
    x.restore();
    rr(x, -w * 0.26, -h * 0.86, w * 0.52, h * 0.05, w * 0.02);
    fillS(x, '#4a5a7a', lw);
    rr(x, -w * 0.16, -h, w * 0.32, h * 0.14, w * 0.04);
    fillS(x, night ? '#fff0a0' : '#bfe8ff', lw);
    x.beginPath();
    x.moveTo(-w * 0.2, -h);
    x.lineTo(0, -h * 1.12);
    x.lineTo(w * 0.2, -h);
    x.closePath();
    fillS(x, '#e8463a', lw);
    // луч
    const a = Math.sin(t * 1.2) * 0.8;
    const g = x.createLinearGradient(0, -h * 0.93, Math.cos(a) * w * 3, -h * 0.93 + Math.sin(a) * w * 0.4);
    g.addColorStop(0, `rgba(255,245,180,${night ? 0.6 : 0.3})`);
    g.addColorStop(1, 'rgba(255,245,180,0)');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(0, -h * 0.93);
    x.lineTo(Math.cos(a) * w * 3, -h * 0.93 + Math.sin(a) * w * 0.4 - w * 0.25);
    x.lineTo(Math.cos(a) * w * 3, -h * 0.93 + Math.sin(a) * w * 0.4 + w * 0.25);
    x.closePath();
    x.fill();
  },
  // пекарня
  bakery(x, w, t, tier, night, lw) {
    const h = w * 0.78;
    rr(x, -w * 0.44, -h, w * 0.88, h, w * 0.05);
    fillS(x, '#fff1d6', lw);
    roof(x, -w * 0.5, -h, w, h * 0.5, '#c8643a', lw);
    // труба с дымом
    rr(x, w * 0.18, -h * 1.45, w * 0.12, h * 0.3, w * 0.02);
    fillS(x, '#a85a3a', lw);
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.4 + i / 4) % 1;
      x.fillStyle = `rgba(255,255,255,${0.7 * (1 - k)})`;
      x.beginPath();
      x.arc(w * 0.24 + Math.sin(k * 5 + i) * w * 0.05 + k * w * 0.15, -h * 1.5 - k * w * 0.6, w * (0.05 + k * 0.08), 0, TAU);
      x.fill();
    }
    // витрина и козырёк
    win(x, -w * 0.36, -h * 0.62, w * 0.3, w * 0.24, night, lw);
    rr(x, w * 0.06, -h * 0.58, w * 0.24, h * 0.58, w * 0.04);
    fillS(x, '#8a5a3a', lw * 0.8);
    for (let i = 0; i < 5; i++) {
      x.beginPath();
      x.rect(-w * 0.44 + (i * w * 0.88) / 5, -h * 0.8, (w * 0.88) / 5, h * 0.1);
      x.fillStyle = i % 2 ? '#fff' : '#ff8aa0';
      x.fill();
    }
    // крендель
    x.strokeStyle = '#d8902a';
    x.lineWidth = w * 0.045;
    x.beginPath();
    x.arc(-w * 0.05, -h * 1.12, w * 0.07, 0, TAU);
    x.stroke();
  },
  // мельница
  mill(x, w, t, tier, night, lw) {
    const h = w * 1.25;
    x.beginPath();
    x.moveTo(-w * 0.32, 0);
    x.lineTo(-w * 0.22, -h);
    x.lineTo(w * 0.22, -h);
    x.lineTo(w * 0.32, 0);
    x.closePath();
    fillS(x, '#f0d8b0', lw);
    roof(x, -w * 0.28, -h, w * 0.56, h * 0.28, '#8a5ac8', lw);
    win(x, -w * 0.08, -h * 0.62, w * 0.16, w * 0.2, night, lw);
    rr(x, -w * 0.1, -h * 0.25, w * 0.2, h * 0.25, w * 0.04);
    fillS(x, '#8a5a3a', lw * 0.8);
    // лопасти
    x.save();
    x.translate(0, -h * 0.98);
    x.rotate(t * 1.4);
    for (let i = 0; i < 4; i++) {
      x.rotate(TAU / 4);
      rr(x, -w * 0.06, -w * 0.72, w * 0.12, w * 0.62, w * 0.02);
      fillS(x, '#fff8ea', lw * 0.8);
      x.strokeStyle = 'rgba(120,90,60,.4)';
      x.beginPath();
      x.moveTo(0, -w * 0.12);
      x.lineTo(0, -w * 0.7);
      x.stroke();
    }
    x.beginPath();
    x.arc(0, 0, w * 0.07, 0, TAU);
    fillS(x, '#6a4a3a', lw);
    x.restore();
  },
  // карусель
  carousel(x, w, t, tier, night, lw) {
    const h = w * 0.9;
    rr(x, -w * 0.48, -h * 0.14, w * 0.96, h * 0.14, w * 0.04);
    fillS(x, '#ffb3c8', lw);
    for (const X of [-0.36, 0, 0.36]) {
      x.fillStyle = '#e8c45a';
      x.fillRect(w * X - w * 0.015, -h * 0.75, w * 0.03, h * 0.62);
    }
    // лошадки вверх-вниз
    for (let i = 0; i < 3; i++) {
      const X = w * (-0.36 + i * 0.36),
        Y = -h * 0.42 + Math.sin(t * 3 + i * 2) * h * 0.08;
      x.beginPath();
      x.ellipse(X, Y, w * 0.1, w * 0.06, 0, 0, TAU);
      fillS(x, ['#fff', '#ffd86a', '#bfe8ff'][i], lw * 0.7);
      x.beginPath();
      x.arc(X + w * 0.09, Y - w * 0.05, w * 0.04, 0, TAU);
      fillS(x, ['#fff', '#ffd86a', '#bfe8ff'][i], lw * 0.7);
    }
    // шатёр
    x.beginPath();
    x.moveTo(-w * 0.52, -h * 0.72);
    x.quadraticCurveTo(0, -h * 1.4, w * 0.52, -h * 0.72);
    x.closePath();
    fillS(x, '#ff6a8a', lw);
    x.save();
    x.clip();
    for (let i = 0; i < 6; i++) {
      x.beginPath();
      x.moveTo(0, -h * 1.2);
      x.lineTo(-w * 0.52 + (i * w) / 5.5, -h * 0.72);
      x.lineTo(-w * 0.52 + ((i + 0.5) * w) / 5.5, -h * 0.72);
      x.closePath();
      x.fillStyle = '#fff2f6';
      x.fill();
    }
    x.restore();
    for (let i = 0; i < 7; i++) {
      x.beginPath();
      x.arc(-w * 0.48 + (i * w * 0.96) / 6, -h * 0.72, w * 0.05, 0, Math.PI);
      fillS(x, i % 2 ? '#ffd86a' : '#ff6a8a', lw * 0.6);
    }
    flag(x, 0, -h * 1.05, h * 0.35, '#ffd23a', t, lw);
  },
  // ракушечный банк
  bank(x, w, t, tier, night, lw) {
    const h = w * 0.8;
    rr(x, -w * 0.48, -h * 0.12, w * 0.96, h * 0.12, w * 0.02);
    fillS(x, '#e6e0ee', lw);
    for (let i = 0; i < 4; i++) {
      rr(x, -w * 0.38 + i * w * 0.24, -h * 0.78, w * 0.1, h * 0.66, w * 0.02);
      fillS(x, '#fbf8ff', lw * 0.8);
    }
    x.beginPath();
    x.moveTo(-w * 0.52, -h * 0.78);
    x.lineTo(0, -h * 1.15);
    x.lineTo(w * 0.52, -h * 0.78);
    x.closePath();
    fillS(x, '#f2ecff', lw);
    // ракушка
    x.save();
    x.translate(0, -h * 0.92);
    x.beginPath();
    x.moveTo(-w * 0.1, w * 0.04);
    x.quadraticCurveTo(0, -w * 0.16, w * 0.1, w * 0.04);
    x.closePath();
    fillS(x, '#ffb07a', lw * 0.7);
    x.restore();
    if (night) win(x, -w * 0.05, -h * 0.6, w * 0.1, w * 0.1, night, lw);
  },
  // оранжерея
  garden(x, w, t, tier, night, lw) {
    const h = w * 0.8;
    x.beginPath();
    x.moveTo(-w * 0.46, 0);
    x.lineTo(-w * 0.46, -h * 0.45);
    x.arc(0, -h * 0.45, w * 0.46, Math.PI, 0);
    x.lineTo(w * 0.46, 0);
    x.closePath();
    x.fillStyle = night ? 'rgba(180,240,200,.55)' : 'rgba(200,245,255,.65)';
    x.fill();
    x.save();
    x.clip();
    // растения
    for (let i = 0; i < 6; i++) {
      const X = -w * 0.36 + i * w * 0.145;
      x.fillStyle = i % 2 ? '#4ab05a' : '#2f9a4a';
      x.beginPath();
      x.ellipse(X, -h * 0.25, w * 0.08, h * (0.25 + (i % 3) * 0.1), 0, 0, TAU);
      x.fill();
      x.fillStyle = ['#ff6a8a', '#ffd23a', '#c86aff'][i % 3];
      x.beginPath();
      x.arc(X, -h * (0.45 + (i % 3) * 0.1), w * 0.04, 0, TAU);
      x.fill();
    }
    x.restore();
    x.strokeStyle = OL;
    x.lineWidth = lw;
    x.beginPath();
    x.moveTo(-w * 0.46, 0);
    x.lineTo(-w * 0.46, -h * 0.45);
    x.arc(0, -h * 0.45, w * 0.46, Math.PI, 0);
    x.lineTo(w * 0.46, 0);
    x.closePath();
    x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.8)';
    x.lineWidth = lw * 0.8;
    for (const a of [-0.6, 0, 0.6]) {
      x.beginPath();
      x.moveTo(0, -h * 0.45);
      x.lineTo(Math.sin(a) * w * 0.46, -h * 0.45 - Math.cos(a) * w * 0.46);
      x.stroke();
    }
  },
  // обсерватория
  observ(x, w, t, tier, night, lw) {
    const h = w * 0.85;
    rr(x, -w * 0.36, -h * 0.55, w * 0.72, h * 0.55, w * 0.04);
    fillS(x, '#e8e4f8', lw);
    x.beginPath();
    x.arc(0, -h * 0.55, w * 0.36, Math.PI, 0);
    x.closePath();
    fillS(x, '#cfd4f2', lw);
    // щель и телескоп
    x.save();
    x.translate(0, -h * 0.75);
    x.rotate(-0.6 + Math.sin(t * 0.5) * 0.15);
    rr(x, -w * 0.06, -w * 0.5, w * 0.12, w * 0.4, w * 0.03);
    fillS(x, '#5a5a8a', lw);
    x.restore();
    win(x, -w * 0.1, -h * 0.4, w * 0.2, w * 0.2, night, lw);
    if (night) for (let i = 0; i < 3; i++) star(x, w * (0.3 + i * 0.1), -h * (1.2 + (i % 2) * 0.2), w * 0.05 * (1 + Math.sin(t * 3 + i) * 0.3), '#fff6a0');
  },
  // ратуша-замок
  castle(x, w, t, tier, night, lw) {
    const h = w * 1.1;
    rr(x, -w * 0.4, -h * 0.6, w * 0.8, h * 0.6, w * 0.03);
    fillS(x, '#f6efe0', lw);
    for (const X of [-0.42, 0.26]) {
      rr(x, w * X, -h * 0.95, w * 0.16, h * 0.95, w * 0.02);
      fillS(x, '#efe6d2', lw);
      x.beginPath();
      x.moveTo(w * X - w * 0.03, -h * 0.95);
      x.lineTo(w * X + w * 0.08, -h * 1.22);
      x.lineTo(w * X + w * 0.19, -h * 0.95);
      x.closePath();
      fillS(x, '#4a7ad8', lw);
      flag(x, w * X + w * 0.08, -h * 1.22, h * 0.2, '#ff5a6a', t, lw);
    }
    // зубцы
    for (let i = 0; i < 5; i++) {
      rr(x, -w * 0.24 + i * w * 0.1, -h * 0.68, w * 0.06, h * 0.08, w * 0.01);
      fillS(x, '#f6efe0', lw * 0.7);
    }
    x.beginPath();
    x.moveTo(-w * 0.1, 0);
    x.lineTo(-w * 0.1, -h * 0.25);
    x.arc(0, -h * 0.25, w * 0.1, Math.PI, 0);
    x.lineTo(w * 0.1, 0);
    x.closePath();
    fillS(x, '#8a5a3a', lw);
    win(x, -w * 0.06, -h * 0.5, w * 0.12, w * 0.12, night, lw);
    // часы
    x.beginPath();
    x.arc(0, -h * 0.82, w * 0.08, 0, TAU);
    fillS(x, '#fff', lw * 0.7);
  },
  // причал дирижаблей
  airship(x, w, t, tier, night, lw) {
    const h = w * 1.2;
    x.fillStyle = '#7a8aa0';
    x.fillRect(-w * 0.03, -h * 0.8, w * 0.06, h * 0.8);
    rr(x, -w * 0.3, -h * 0.2, w * 0.6, h * 0.2, w * 0.03);
    fillS(x, '#c8d0e0', lw);
    const by = -h * 1.05 + Math.sin(t * 1.5) * w * 0.04;
    x.strokeStyle = 'rgba(80,80,100,.6)';
    x.lineWidth = lw * 0.6;
    x.beginPath();
    x.moveTo(0, -h * 0.8);
    x.lineTo(0, by + w * 0.18);
    x.stroke();
    x.beginPath();
    x.ellipse(0, by, w * 0.5, w * 0.2, 0, 0, TAU);
    fillS(x, '#ffb03a', lw);
    x.save();
    x.clip();
    x.fillStyle = '#ff7a3a';
    for (let i = -2; i <= 2; i++) x.fillRect(i * w * 0.2 - w * 0.04, by - w * 0.3, w * 0.08, w * 0.6);
    x.restore();
    x.beginPath();
    x.ellipse(0, by, w * 0.5, w * 0.2, 0, 0, TAU);
    x.strokeStyle = OL;
    x.lineWidth = lw;
    x.stroke();
    rr(x, -w * 0.12, by + w * 0.17, w * 0.24, w * 0.1, w * 0.03);
    fillS(x, '#8a5a3a', lw * 0.7);
    // хвост
    x.beginPath();
    x.moveTo(-w * 0.46, by);
    x.lineTo(-w * 0.62, by - w * 0.14);
    x.lineTo(-w * 0.62, by + w * 0.14);
    x.closePath();
    fillS(x, '#ff7a3a', lw * 0.8);
  },
  // радужный фонтан
  rainbow(x, w, t, tier, night, lw) {
    const h = w * 0.9;
    const cols = ['#ff5a6a', '#ffa03a', '#ffe03a', '#5ad06a', '#4aa8ff', '#9a6aff'];
    cols.forEach((c, i) => {
      x.strokeStyle = c;
      x.lineWidth = w * 0.05;
      x.globalAlpha = 0.85;
      x.beginPath();
      x.arc(0, -h * 0.3, w * (0.46 - i * 0.05), Math.PI, 0);
      x.stroke();
    });
    x.globalAlpha = 1;
    x.beginPath();
    x.ellipse(0, -h * 0.08, w * 0.4, w * 0.1, 0, 0, TAU);
    fillS(x, '#cfe8ff', lw);
    rr(x, -w * 0.06, -h * 0.5, w * 0.12, h * 0.42, w * 0.03);
    fillS(x, '#e8e4f8', lw);
    for (let i = 0; i < 8; i++) {
      const k = (t * 0.9 + i / 8) % 1;
      const a = (i / 8) * TAU;
      x.fillStyle = `rgba(150,210,255,${1 - k})`;
      x.beginPath();
      x.arc(Math.cos(a) * w * 0.25 * k, -h * 0.55 - Math.sin(k * Math.PI) * h * 0.3, w * 0.035, 0, TAU);
      x.fill();
    }
  },
};

// рисует здание: x, y — точка основания; w — ширина
export function drawBuilding(ctx, id, X, Y, w, tier, t, night) {
  const fn = DRAW[id];
  if (!fn) return;
  const grow = 1 + Math.min(tier, 6) * 0.06;
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(grow, grow);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const lw = Math.max(1, w * 0.035);
  fn(ctx, w, t, tier, night, lw);
  // знаки роста: флажок, золотая звезда, искры
  if (tier >= 2 && id !== 'carousel' && id !== 'castle') flag(ctx, w * 0.4, -w * 0.05, w * 0.42, ['#ff5a6a', '#4aa8ff', '#5ad06a'][tier % 3], t, lw);
  if (tier >= 4) star(ctx, -w * 0.42, -w * 0.18, w * 0.11, '#ffd23a');
  if (tier >= 6)
    for (let i = 0; i < 3; i++) {
      const a = t * 2 + i * 2.1;
      star(ctx, Math.cos(a) * w * 0.5, -w * 0.6 + Math.sin(a) * w * 0.3, w * 0.05 * (1 + Math.sin(t * 6 + i)), 'rgba(255,240,150,.9)');
    }
  ctx.restore();
}

// пустой участок под стройку
export function drawPlot(ctx, X, Y, w, t) {
  ctx.save();
  ctx.translate(X, Y);
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.setLineDash([w * 0.08, w * 0.06]);
  ctx.lineWidth = Math.max(1.5, w * 0.04);
  ctx.beginPath();
  ctx.ellipse(0, -w * 0.05, w * 0.42, w * 0.12, 0, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  const b = Math.sin(t * 3) * w * 0.03;
  ctx.fillStyle = '#b07a4a';
  ctx.fillRect(-w * 0.02, -w * 0.5 + b, w * 0.04, w * 0.45);
  rr(ctx, -w * 0.18, -w * 0.62 + b, w * 0.36, w * 0.2, w * 0.04);
  ctx.fillStyle = '#fff6dc';
  ctx.fill();
  ctx.strokeStyle = OL;
  ctx.lineWidth = Math.max(1, w * 0.03);
  ctx.stroke();
  ctx.fillStyle = '#e8743a';
  ctx.font = `800 ${w * 0.2}px Rubik, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', 0, -w * 0.52 + b);
  ctx.restore();
}

// высота здания относительно ширины (для подсказок над ним)
export const B_H = { lemon: 0.7, fish: 1.25, light: 2.15, bakery: 1.5, mill: 2, carousel: 1.35, bank: 0.95, garden: 0.85, observ: 1.2, castle: 1.4, airship: 1.4, rainbow: 0.9 };
