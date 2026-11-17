// Снаряды, эффекты и иконки интерфейса
import { INK, css, light, dark, ell, circ, poly, paint, line, addTex, rr } from '../art.js';

function star(ctx, cx, cy, R, r, n = 5) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const rad = i % 2 ? r : R;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function coin(ctx, cx, cy, r) {
  circ(ctx, cx, cy + r * 0.12, r);
  ctx.fillStyle = css(0xb7791f);
  ctx.fill();
  ctx.lineWidth = r * 0.14;
  ctx.strokeStyle = INK;
  ctx.stroke();
  circ(ctx, cx, cy, r);
  paint(ctx, 0xffc93c, r * 0.14, { box: [0, cy - r, 0, cy + r] });
  circ(ctx, cx, cy, r * 0.65);
  ctx.lineWidth = r * 0.1;
  ctx.strokeStyle = css(0xd99a1e);
  ctx.stroke();
  ell(ctx, cx - r * 0.35, cy - r * 0.4, r * 0.22, r * 0.13, -0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fill();
}

function heart(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.4, cy, cx - s * 0.9, cy - s * 1.1, cx, cy - s * 0.4);
  ctx.bezierCurveTo(cx + s * 0.9, cy - s * 1.1, cx + s * 1.4, cy, cx, cy + s * 0.9);
  ctx.closePath();
}

function gem(ctx, cx, cy, s, color = 0x4fd1ff) {
  poly(ctx, [[cx - s, cy - s * 0.3], [cx - s * 0.5, cy - s * 0.85], [cx + s * 0.5, cy - s * 0.85], [cx + s, cy - s * 0.3], [cx, cy + s]]);
  paint(ctx, color, s * 0.12, { box: [0, cy - s, 0, cy + s] });
  line(ctx, [[cx - s, cy - s * 0.3], [cx + s, cy - s * 0.3]], 'rgba(255,255,255,0.6)', s * 0.06);
  line(ctx, [[cx - s * 0.5, cy - s * 0.85], [cx - s * 0.25, cy - s * 0.3], [cx, cy + s]], 'rgba(255,255,255,0.5)', s * 0.05);
  line(ctx, [[cx + s * 0.5, cy - s * 0.85], [cx + s * 0.25, cy - s * 0.3], [cx, cy + s]], 'rgba(0,0,0,0.2)', s * 0.05);
}

export function makeMiscTextures(scene) {
  // ---------- снаряды ----------
  addTex(scene, 'pr_arrow', 52, 14, (ctx) => {
    line(ctx, [[6, 7], [42, 7]], INK, 5);
    line(ctx, [[6, 7], [42, 7]], 0xd9b07a, 2.5);
    poly(ctx, [[40, 2], [50, 7], [40, 12]]);
    paint(ctx, 0xc7cdd6, 2, { flat: true });
    poly(ctx, [[4, 2], [12, 7], [4, 12], [8, 7]]);
    paint(ctx, 0xffffff, 1.5, { flat: true });
  });
  addTex(scene, 'pr_ball', 32, 32, (ctx) => {
    circ(ctx, 16, 16, 11);
    paint(ctx, 0x34373d, 3);
    circ(ctx, 12, 12, 3.5);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
  });
  addTex(scene, 'pr_magic', 48, 48, (ctx) => {
    const g = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(220,160,255,1)');
    g.addColorStop(0.6, 'rgba(155,93,229,0.55)');
    g.addColorStop(1, 'rgba(155,93,229,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 48, 48);
  });
  addTex(scene, 'pr_shard', 40, 24, (ctx) => {
    poly(ctx, [[4, 12], [16, 4], [38, 12], [16, 20]]);
    paint(ctx, 0xbfe6f5, 2.5, { box: [0, 4, 0, 20] });
    line(ctx, [[10, 11], [32, 11]], 0xffffff, 2);
  });
  addTex(scene, 'pr_bolt', 80, 16, (ctx) => {
    line(ctx, [[6, 8], [66, 8]], INK, 6);
    line(ctx, [[6, 8], [66, 8]], 0xd9b07a, 3);
    poly(ctx, [[64, 2], [78, 8], [64, 14]]);
    paint(ctx, 0xc7cdd6, 2.5, { flat: true });
    poly(ctx, [[4, 1], [16, 8], [4, 15]]);
    paint(ctx, 0xe5483f, 2, { flat: true });
  });
  addTex(scene, 'meteor', 96, 96, (ctx) => {
    const g = ctx.createRadialGradient(56, 40, 4, 48, 48, 48);
    g.addColorStop(0, 'rgba(255,240,150,1)');
    g.addColorStop(0.4, 'rgba(255,140,40,0.9)');
    g.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 96, 96);
    circ(ctx, 56, 40, 18);
    paint(ctx, 0x7a4a2a, 4);
    circ(ctx, 50, 36, 4);
    ctx.fillStyle = css(0x5a3518);
    ctx.fill();
    circ(ctx, 62, 46, 3);
    ctx.fill();
  });

  // ---------- эффекты ----------
  addTex(scene, 'puff', 64, 64, (ctx) => {
    [[32, 36, 18], [20, 30, 12], [44, 28, 13], [34, 22, 12]].forEach(([x, y, r]) => {
      circ(ctx, x, y, r);
      ctx.fillStyle = '#fff';
      ctx.fill();
    });
  });
  addTex(scene, 'spark', 24, 24, (ctx) => {
    const g = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 24, 24);
  });
  addTex(scene, 'shadow', 64, 24, (ctx) => {
    const g = ctx.createRadialGradient(32, 12, 2, 32, 12, 30);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.scale(1, 0.4);
    ctx.fillRect(0, 0, 64, 60);
  });
  addTex(scene, 'iceblock', 96, 96, (ctx) => {
    rr(ctx, 10, 14, 76, 74, 14);
    ctx.fillStyle = 'rgba(170,230,255,0.55)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke();
    line(ctx, [[22, 30], [36, 22]], 'rgba(255,255,255,0.9)', 5);
    line(ctx, [[22, 44], [28, 40]], 'rgba(255,255,255,0.8)', 4);
  });
  addTex(scene, 'healfx', 32, 32, (ctx) => {
    rr(ctx, 12, 4, 8, 24, 3);
    rr(ctx, 4, 12, 24, 8, 3);
    ctx.fillStyle = css(0x8cf06a);
    ctx.fill();
  });
  addTex(scene, 'ring', 256, 256, (ctx) => {
    circ(ctx, 128, 128, 120);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.setLineDash([16, 10]);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.stroke();
  });
  addTex(scene, 'crater', 128, 64, (ctx) => {
    ell(ctx, 64, 32, 56, 26);
    ctx.fillStyle = 'rgba(40,20,10,0.45)';
    ctx.fill();
  });

  // ---------- иконки 96x96 ----------
  const icon = (key, draw) => addTex(scene, 'ic_' + key, 96, 96, draw);
  icon('coin', (ctx) => coin(ctx, 48, 46, 34));
  icon('heart', (ctx) => {
    heart(ctx, 48, 52, 34);
    paint(ctx, 0xe5483f, 5, { box: [0, 14, 0, 86] });
    ell(ctx, 34, 36, 8, 5, -0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
  });
  icon('star', (ctx) => {
    star(ctx, 48, 50, 40, 18);
    paint(ctx, 0xffc93c, 5, { box: [0, 10, 0, 90] });
  });
  icon('starEmpty', (ctx) => {
    star(ctx, 48, 50, 40, 18);
    paint(ctx, 0x6b5a4a, 5, { flat: true });
  });
  icon('gem', (ctx) => gem(ctx, 48, 50, 36));
  icon('skull', (ctx) => {
    circ(ctx, 48, 42, 30);
    paint(ctx, 0xf3eedf, 5);
    rr(ctx, 34, 60, 28, 18, 6);
    paint(ctx, 0xf3eedf, 4, { flat: true });
    ell(ctx, 37, 42, 8, 9);
    ctx.fillStyle = INK;
    ctx.fill();
    ell(ctx, 59, 42, 8, 9);
    ctx.fill();
  });
  icon('flag', (ctx) => {
    line(ctx, [[26, 88], [26, 10]], INK, 9);
    line(ctx, [[26, 88], [26, 10]], 0x8b5a2b, 5);
    ctx.beginPath();
    ctx.moveTo(28, 12);
    ctx.quadraticCurveTo(50, 2, 82, 18);
    ctx.lineTo(80, 54);
    ctx.quadraticCurveTo(50, 40, 28, 50);
    ctx.closePath();
    paint(ctx, 0xe5483f, 5, { box: [0, 6, 0, 54] });
    star(ctx, 54, 30, 10, 4.5);
    ctx.fillStyle = css(0xffc93c);
    ctx.fill();
  });
  icon('pause', (ctx) => {
    rr(ctx, 24, 18, 18, 60, 6);
    paint(ctx, 0xffffff, 5, { flat: true });
    rr(ctx, 54, 18, 18, 60, 6);
    paint(ctx, 0xffffff, 5, { flat: true });
  });
  icon('play', (ctx) => {
    poly(ctx, [[28, 16], [80, 48], [28, 80]]);
    paint(ctx, 0xffffff, 5, { flat: true });
  });
  icon('speed1', (ctx) => {
    poly(ctx, [[30, 18], [72, 48], [30, 78]]);
    paint(ctx, 0xffffff, 5, { flat: true });
  });
  icon('speed2', (ctx) => {
    poly(ctx, [[12, 18], [48, 48], [12, 78]]);
    paint(ctx, 0xffffff, 5, { flat: true });
    poly(ctx, [[46, 18], [82, 48], [46, 78]]);
    paint(ctx, 0xffffff, 5, { flat: true });
  });
  icon('music', (ctx) => {
    line(ctx, [[38, 72], [38, 18], [74, 10], [74, 62]], INK, 11);
    line(ctx, [[38, 72], [38, 18], [74, 10], [74, 62]], 0xffffff, 6);
    ell(ctx, 30, 72, 12, 9, -0.4);
    paint(ctx, 0xffffff, 4.5, { flat: true });
    ell(ctx, 66, 64, 12, 9, -0.4);
    paint(ctx, 0xffffff, 4.5, { flat: true });
  });
  icon('sound', (ctx) => {
    poly(ctx, [[14, 36], [32, 36], [52, 18], [52, 78], [32, 60], [14, 60]]);
    paint(ctx, 0xffffff, 5, { flat: true });
    ctx.beginPath();
    ctx.arc(54, 48, 16, -0.8, 0.8);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(54, 48, 30, -0.8, 0.8);
    ctx.stroke();
  });
  icon('meteor', (ctx) => {
    ctx.save();
    ctx.translate(48, 48);
    ctx.rotate(-0.7);
    ctx.beginPath();
    ctx.moveTo(-40, -12);
    ctx.quadraticCurveTo(-10, -26, 14, -18);
    ctx.lineTo(14, 18);
    ctx.quadraticCurveTo(-10, 26, -40, 12);
    ctx.quadraticCurveTo(-24, 0, -40, -12);
    ctx.closePath();
    paint(ctx, 0xff8a2a, 4, { box: [0, -26, 0, 26] });
    ctx.restore();
    circ(ctx, 62, 34, 20);
    paint(ctx, 0x7a4a2a, 5);
    circ(ctx, 56, 30, 4.5);
    ctx.fillStyle = css(0x5a3518);
    ctx.fill();
  });
  icon('freeze', (ctx) => {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      const dx = Math.cos(a) * 36;
      const dy = Math.sin(a) * 36;
      line(ctx, [[48 - dx, 48 - dy], [48 + dx, 48 + dy]], INK, 12);
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      const dx = Math.cos(a) * 36;
      const dy = Math.sin(a) * 36;
      line(ctx, [[48 - dx, 48 - dy], [48 + dx, 48 + dy]], 0xbfe6f5, 6);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = 48 + Math.cos(a) * 26;
      const y = 48 + Math.sin(a) * 26;
      line(ctx, [[x + Math.cos(a + 2.4) * 9, y + Math.sin(a + 2.4) * 9], [x, y], [x + Math.cos(a - 2.4) * 9, y + Math.sin(a - 2.4) * 9]], 0xffffff, 4);
    }
    circ(ctx, 48, 48, 9);
    paint(ctx, 0xffffff, 4, { flat: true });
  });
  icon('up', (ctx) => {
    poly(ctx, [[48, 10], [84, 50], [62, 50], [62, 86], [34, 86], [34, 50], [12, 50]]);
    paint(ctx, 0x5cc451, 5, { box: [0, 10, 0, 86] });
  });
  icon('sell', (ctx) => {
    coin(ctx, 52, 52, 30);
    poly(ctx, [[8, 22], [30, 6], [30, 16], [44, 16], [44, 28], [30, 28], [30, 38]]);
    paint(ctx, 0xe5483f, 4, { flat: true });
  });
  icon('lock', (ctx) => {
    ctx.beginPath();
    ctx.arc(48, 40, 18, Math.PI, 0);
    ctx.lineWidth = 16;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 9;
    ctx.strokeStyle = css(0xb8bec8);
    ctx.stroke();
    rr(ctx, 22, 40, 52, 44, 8);
    paint(ctx, 0xffc93c, 5, { box: [0, 40, 0, 84] });
    circ(ctx, 48, 58, 6);
    ctx.fillStyle = INK;
    ctx.fill();
    rr(ctx, 45, 60, 6, 14, 2);
    ctx.fill();
  });
  icon('range', (ctx) => {
    circ(ctx, 48, 48, 34);
    ctx.lineWidth = 12;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#e5483f';
    ctx.stroke();
    circ(ctx, 48, 48, 16);
    ctx.lineWidth = 12;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    circ(ctx, 48, 48, 5);
    ctx.fillStyle = '#e5483f';
    ctx.fill();
  });
  icon('chest', (ctx) => {
    rr(ctx, 14, 40, 68, 44, 6);
    paint(ctx, 0x9c6234, 5, { box: [0, 40, 0, 84] });
    ctx.beginPath();
    ctx.moveTo(14, 44);
    ctx.quadraticCurveTo(14, 16, 48, 16);
    ctx.quadraticCurveTo(82, 16, 82, 44);
    ctx.closePath();
    paint(ctx, 0xb7743f, 5, { box: [0, 16, 0, 44] });
    rr(ctx, 12, 38, 72, 10, 3);
    paint(ctx, 0xffc93c, 4, { flat: true });
    rr(ctx, 40, 42, 16, 18, 4);
    paint(ctx, 0xffc93c, 4, { flat: true });
  });
  icon('bag', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(36, 26);
    ctx.quadraticCurveTo(10, 54, 18, 76);
    ctx.quadraticCurveTo(48, 90, 78, 76);
    ctx.quadraticCurveTo(86, 54, 60, 26);
    ctx.closePath();
    paint(ctx, 0xc98f4e, 5, { box: [0, 26, 0, 86] });
    poly(ctx, [[34, 14], [62, 14], [58, 28], [38, 28]]);
    paint(ctx, 0xc98f4e, 4, { flat: true });
    rr(ctx, 34, 24, 28, 7, 3);
    paint(ctx, 0x8b5a2b, 3, { flat: true });
    coin(ctx, 48, 60, 13);
  });
  icon('close', (ctx) => {
    line(ctx, [[24, 24], [72, 72]], INK, 18);
    line(ctx, [[72, 24], [24, 72]], INK, 18);
    line(ctx, [[24, 24], [72, 72]], 0xffffff, 10);
    line(ctx, [[72, 24], [24, 72]], 0xffffff, 10);
  });
  icon('check', (ctx) => {
    line(ctx, [[18, 50], [40, 72], [80, 26]], INK, 18);
    line(ctx, [[18, 50], [40, 72], [80, 26]], 0xffffff, 10);
  });
  icon('home', (ctx) => {
    poly(ctx, [[48, 12], [86, 46], [74, 46], [74, 84], [22, 84], [22, 46], [10, 46]]);
    paint(ctx, 0xffffff, 5, { flat: true });
    rr(ctx, 40, 58, 16, 26, 3);
    paint(ctx, 0x8b5a2b, 4, { flat: true });
  });
  icon('retry', (ctx) => {
    ctx.beginPath();
    ctx.arc(48, 50, 28, -0.6, Math.PI * 1.45);
    ctx.lineWidth = 16;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    poly(ctx, [[62, 10], [86, 30], [58, 38]]);
    paint(ctx, 0xffffff, 4.5, { flat: true });
  });
  icon('map', (ctx) => {
    poly(ctx, [[10, 22], [34, 14], [62, 22], [86, 14], [86, 76], [62, 84], [34, 76], [10, 84]]);
    paint(ctx, 0xf3dfb0, 5, { box: [0, 14, 0, 84] });
    line(ctx, [[34, 14], [34, 76]], 0xc9a76a, 3);
    line(ctx, [[62, 22], [62, 84]], 0xc9a76a, 3);
    ctx.setLineDash([6, 6]);
    line(ctx, [[18, 70], [40, 48], [58, 60], [76, 32]], 0xe5483f, 4);
    ctx.setLineDash([]);
    line(ctx, [[70, 26], [82, 38]], 0xe5483f, 5);
    line(ctx, [[82, 26], [70, 38]], 0xe5483f, 5);
  });
  icon('trophy', (ctx) => {
    ctx.beginPath();
    ctx.moveTo(26, 14);
    ctx.lineTo(70, 14);
    ctx.lineTo(66, 44);
    ctx.quadraticCurveTo(48, 64, 30, 44);
    ctx.closePath();
    paint(ctx, 0xffc93c, 5, { box: [0, 14, 0, 60] });
    ctx.beginPath();
    ctx.arc(22, 30, 11, Math.PI * 0.5, Math.PI * 1.6);
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(74, 30, 11, Math.PI * 1.4, Math.PI * 0.5);
    ctx.stroke();
    rr(ctx, 42, 56, 12, 14, 2);
    paint(ctx, 0xd99a1e, 4, { flat: true });
    rr(ctx, 28, 68, 40, 14, 4);
    paint(ctx, 0x8b5a2b, 4, { flat: true });
  });
  icon('ad', (ctx) => {
    rr(ctx, 10, 20, 76, 56, 12);
    paint(ctx, 0xffffff, 5, { flat: true });
    poly(ctx, [[38, 32], [64, 48], [38, 64]]);
    paint(ctx, 0xe5483f, 4, { flat: true });
  });
  icon('crown', (ctx) => {
    poly(ctx, [[12, 70], [18, 26], [34, 46], [48, 18], [62, 46], [78, 26], [84, 70]]);
    paint(ctx, 0xffc93c, 5, { box: [0, 18, 0, 70] });
    rr(ctx, 12, 66, 72, 14, 4);
    paint(ctx, 0xd99a1e, 4, { flat: true });
    circ(ctx, 48, 56, 6);
    paint(ctx, 0xe5483f, 3, { flat: true });
  });
  icon('swords', (ctx) => {
    [[1, 0xc7cdd6], [-1, 0xc7cdd6]].forEach(([d]) => {
      ctx.save();
      ctx.translate(48, 48);
      ctx.scale(d, 1);
      ctx.rotate(-Math.PI / 4);
      rr(ctx, -6, -40, 12, 56, 4);
      paint(ctx, 0xc7cdd6, 4, { flat: true });
      rr(ctx, -16, 14, 32, 8, 3);
      paint(ctx, 0xffc93c, 3.5, { flat: true });
      rr(ctx, -5, 20, 10, 18, 3);
      paint(ctx, 0x8b5a2b, 3.5, { flat: true });
      ctx.restore();
    });
  });

  // крупная монета для всплывающих наград
  addTex(scene, 'coin', 40, 40, (ctx) => coin(ctx, 20, 19, 15));
  addTex(scene, 'gemsmall', 40, 40, (ctx) => gem(ctx, 20, 21, 15));
}

export { coin as drawCoin, star as drawStar, gem as drawGem, heart as drawHeart };
