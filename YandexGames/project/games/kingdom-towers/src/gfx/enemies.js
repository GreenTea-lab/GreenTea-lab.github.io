// Враги: вид сбоку, смотрят вправо, 2 кадра анимации. Холст 128x128, земля на y=116
import { INK, css, light, dark, ell, circ, poly, paint, line, eye, addTex, rr } from '../art.js';

const legs = (ctx, f, xs, y0, len, w, color) => {
  xs.forEach((x, i) => {
    const off = (i % 2 === f ? 1 : -1) * 6;
    rr(ctx, x + off - w / 2, y0, w, len, w / 2);
    paint(ctx, color, 3, { flat: true });
  });
};

function goblin(ctx, f) {
  legs(ctx, f, [54, 72], 92, 22, 11, 0x3f7d2c);
  // тело
  ell(ctx, 64, 84, 22, 20);
  paint(ctx, 0x6fbf3f);
  // набедренная повязка
  poly(ctx, [[44, 88], [84, 88], [80, 102], [48, 102]]);
  paint(ctx, 0x8b5a2b, 3);
  // кинжал
  line(ctx, [[84, 84], [104, 70]], INK, 9);
  line(ctx, [[84, 84], [104, 70]], 0xcfd6de, 5);
  circ(ctx, 84, 85, 6);
  paint(ctx, 0x6fbf3f, 3, { flat: true });
  // уши
  poly(ctx, [[48, 44], [18, 30], [46, 56]]);
  paint(ctx, 0x6fbf3f, 3.5);
  poly(ctx, [[88, 42], [112, 24], [92, 56]]);
  paint(ctx, 0x6fbf3f, 3.5);
  // голова
  circ(ctx, 68, 50, 24);
  paint(ctx, 0x7fd14a, 4, { box: [0, 26, 0, 74] });
  eye(ctx, 62, 46, 7, 1);
  eye(ctx, 80, 46, 7, 1);
  // рот
  ctx.beginPath();
  ctx.arc(74, 60, 9, 0.2, Math.PI - 0.6);
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.stroke();
  poly(ctx, [[72, 63], [76, 63], [74, 68]]);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

function orc(ctx, f) {
  legs(ctx, f, [52, 76], 90, 26, 14, 0x4a5a2a);
  ell(ctx, 64, 80, 30, 26);
  paint(ctx, 0x5f9a3a);
  // ремни
  line(ctx, [[44, 62], [82, 98]], INK, 11);
  line(ctx, [[44, 62], [82, 98]], 0x7a4a24, 7);
  rr(ctx, 36, 90, 56, 10, 4);
  paint(ctx, 0x7a4a24, 3, { flat: true });
  rr(ctx, 58, 88, 12, 14, 3);
  paint(ctx, 0xc7cdd6, 2.5, { flat: true });
  // топор
  line(ctx, [[92, 98], [104, 40]], INK, 10);
  line(ctx, [[92, 98], [104, 40]], 0x8b5a2b, 6);
  ctx.beginPath();
  ctx.moveTo(102, 40);
  ctx.quadraticCurveTo(124, 46, 118, 66);
  ctx.lineTo(100, 56);
  ctx.closePath();
  paint(ctx, 0xc7cdd6, 3.5);
  circ(ctx, 92, 84, 8);
  paint(ctx, 0x5f9a3a, 3, { flat: true });
  // голова
  rr(ctx, 46, 22, 44, 42, 18);
  paint(ctx, 0x6aa842, 4, { box: [0, 22, 0, 64] });
  eye(ctx, 62, 38, 6, 1, true);
  eye(ctx, 78, 38, 6, 1, true);
  // челюсть и клыки
  rr(ctx, 58, 50, 28, 12, 5);
  paint(ctx, 0x4f8a32, 3, { flat: true });
  poly(ctx, [[61, 52], [66, 52], [63, 42]]);
  paint(ctx, 0xfff3d6, 2.5, { flat: true });
  poly(ctx, [[78, 52], [83, 52], [81, 42]]);
  paint(ctx, 0xfff3d6, 2.5, { flat: true });
}

function wolf(ctx, f) {
  // хвост
  ctx.beginPath();
  ctx.moveTo(30, 74);
  ctx.quadraticCurveTo(6, 64, 10, 44);
  ctx.quadraticCurveTo(22, 62, 36, 66);
  ctx.closePath();
  paint(ctx, 0x7d808c, 3.5);
  // ноги
  [[38, 0], [50, 1], [80, 0], [92, 1]].forEach(([x, i]) => {
    const off = (i === f ? 1 : -1) * 7;
    rr(ctx, x + off - 5, 80, 10, 32, 5);
    paint(ctx, 0x6c6f7a, 3, { flat: true });
  });
  // тело
  ell(ctx, 64, 76, 38, 20);
  paint(ctx, 0x8d909c);
  ell(ctx, 66, 86, 24, 8);
  ctx.fillStyle = css(0xc9ccd4);
  ctx.fill();
  // голова
  poly(ctx, [[92, 46], [98, 26], [106, 46]]);
  paint(ctx, 0x8d909c, 3.5);
  ell(ctx, 100, 60, 18, 16);
  paint(ctx, 0x8d909c);
  ell(ctx, 116, 66, 11, 8);
  paint(ctx, 0xb4b7c0, 3.5);
  circ(ctx, 124, 63, 3.5);
  ctx.fillStyle = INK;
  ctx.fill();
  // глаз
  ell(ctx, 102, 54, 5, 4);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  circ(ctx, 104, 54, 2);
  ctx.fillStyle = INK;
  ctx.fill();
  line(ctx, [[96, 48], [108, 51]], INK, 3);
}

function bat(ctx, f) {
  const up = f === 0;
  const wing = (dir) => {
    ctx.beginPath();
    const x0 = 64 + dir * 10;
    ctx.moveTo(x0, 60);
    const tipY = up ? 18 : 92;
    ctx.quadraticCurveTo(64 + dir * 40, up ? 22 : 96, 64 + dir * 58, tipY);
    ctx.quadraticCurveTo(64 + dir * 46, up ? 46 : 76, 64 + dir * 36, up ? 50 : 82);
    ctx.quadraticCurveTo(64 + dir * 28, up ? 56 : 74, 64 + dir * 20, up ? 58 : 80);
    ctx.quadraticCurveTo(64 + dir * 14, 66, x0, 70);
    ctx.closePath();
    paint(ctx, 0x6b3fa0, 3.5);
  };
  wing(-1);
  wing(1);
  // уши
  poly(ctx, [[54, 50], [50, 30], [62, 46]]);
  paint(ctx, 0x8a5cc4, 3);
  poly(ctx, [[74, 50], [78, 30], [66, 46]]);
  paint(ctx, 0x8a5cc4, 3);
  circ(ctx, 64, 62, 18);
  paint(ctx, 0x8a5cc4);
  eye(ctx, 58, 58, 5, 1);
  eye(ctx, 72, 58, 5, 1);
  poly(ctx, [[60, 70], [63, 70], [61.5, 76]]);
  ctx.fillStyle = '#fff';
  ctx.fill();
  poly(ctx, [[66, 70], [69, 70], [67.5, 76]]);
  ctx.fill();
}

function skeleton(ctx, f) {
  legs(ctx, f, [54, 74], 88, 26, 8, 0xe9e4d4);
  // позвоночник и рёбра
  rr(ctx, 46, 56, 34, 38, 10);
  paint(ctx, 0x3a3340, 3, { flat: true });
  for (let i = 0; i < 3; i++) line(ctx, [[50, 64 + i * 9], [76, 64 + i * 9]], 0xe9e4d4, 5);
  line(ctx, [[63, 58], [63, 92]], 0xe9e4d4, 5);
  // череп
  circ(ctx, 64, 36, 20);
  paint(ctx, 0xf3eedf, 4, { box: [0, 16, 0, 56] });
  rr(ctx, 56, 46, 20, 12, 4);
  paint(ctx, 0xf3eedf, 3, { flat: true });
  for (let i = 0; i < 3; i++) line(ctx, [[60 + i * 6, 47], [60 + i * 6, 56]], INK, 2);
  ell(ctx, 60, 34, 5, 6);
  ctx.fillStyle = INK;
  ctx.fill();
  ell(ctx, 74, 34, 5, 6);
  ctx.fill();
  circ(ctx, 74, 34, 1.8);
  ctx.fillStyle = '#ff5a4f';
  ctx.fill();
  circ(ctx, 60, 34, 1.8);
  ctx.fill();
  // щит
  circ(ctx, 88, 74, 24);
  paint(ctx, 0x6f8fb3, 4, { box: [0, 50, 0, 98] });
  circ(ctx, 88, 74, 17);
  ctx.lineWidth = 3;
  ctx.strokeStyle = css(0xd9e2ec);
  ctx.stroke();
  circ(ctx, 88, 74, 6);
  paint(ctx, 0xffc93c, 3, { flat: true });
}

function shaman(ctx, f) {
  legs(ctx, f, [54, 74], 92, 22, 12, 0x4a5a2a);
  // мантия
  poly(ctx, [[44, 60], [84, 60], [92, 104], [36, 104]]);
  paint(ctx, 0x9c3f3a, 4);
  line(ctx, [[40, 96], [88, 96]], 0xffc93c, 4);
  // посох
  line(ctx, [[98, 108], [98, 30]], INK, 9);
  line(ctx, [[98, 108], [98, 30]], 0x8b5a2b, 5);
  const g = ctx.createRadialGradient(98, 26, 0, 98, 26, 20);
  g.addColorStop(0, 'rgba(220,255,200,1)');
  g.addColorStop(0.4, 'rgba(120,230,90,0.9)');
  g.addColorStop(1, 'rgba(120,230,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(74, 2, 48, 48);
  circ(ctx, 98, 26, 8);
  paint(ctx, 0x8cf06a, 3, { flat: true });
  // голова
  circ(ctx, 64, 44, 20);
  paint(ctx, 0x6aa842, 4, { box: [0, 24, 0, 64] });
  // перья
  [[-16, 0xe5483f], [-6, 0xffc93c], [4, 0x4aa3ff], [14, 0xe5483f]].forEach(([dx, c]) => {
    poly(ctx, [[64 + dx - 4, 28], [64 + dx + 4, 28], [64 + dx * 1.4, 6]]);
    paint(ctx, c, 2.5, { flat: true });
  });
  rr(ctx, 46, 24, 36, 10, 4);
  paint(ctx, 0xffc93c, 3, { flat: true });
  eye(ctx, 60, 44, 5.5, 1);
  eye(ctx, 74, 44, 5.5, 1);
  // раскраска
  line(ctx, [[54, 54], [62, 54]], 0xffffff, 3);
  line(ctx, [[72, 54], [80, 54]], 0xffffff, 3);
}

function troll(ctx, f) {
  legs(ctx, f, [48, 80], 86, 30, 18, 0x5a6b7d);
  ell(ctx, 64, 74, 42, 34);
  paint(ctx, 0x7f93a8);
  ell(ctx, 66, 84, 26, 20);
  ctx.fillStyle = css(0xa9b8c6);
  ctx.fill();
  // дубина
  line(ctx, [[100, 100], [114, 34]], INK, 16);
  line(ctx, [[100, 100], [114, 34]], 0x8b5a2b, 11);
  ell(ctx, 114, 34, 11, 16, 0.2);
  paint(ctx, 0x9c6b3f, 3.5);
  circ(ctx, 98, 88, 11);
  paint(ctx, 0x7f93a8, 3.5, { flat: true });
  // голова
  circ(ctx, 72, 34, 16);
  paint(ctx, 0x8ea2b6, 4);
  ell(ctx, 88, 40, 9, 6, 0.3);
  paint(ctx, 0x8ea2b6, 3);
  eye(ctx, 68, 30, 4.5, 1, true);
  eye(ctx, 80, 30, 4.5, 1, true);
}

function ogre(ctx, f) {
  legs(ctx, f, [46, 82], 88, 28, 20, 0x8a5a3a);
  ell(ctx, 64, 72, 46, 38);
  paint(ctx, 0xd9a066);
  ell(ctx, 66, 84, 30, 22);
  ctx.fillStyle = css(0xeec08f);
  ctx.fill();
  // пояс
  rr(ctx, 20, 92, 90, 10, 4);
  paint(ctx, 0x6b3a1e, 3, { flat: true });
  rr(ctx, 58, 90, 14, 14, 3);
  paint(ctx, 0xffc93c, 3, { flat: true });
  // шипастая дубина
  line(ctx, [[104, 104], [118, 28]], INK, 16);
  line(ctx, [[104, 104], [118, 28]], 0x8b5a2b, 11);
  ell(ctx, 117, 30, 12, 18, 0.15);
  paint(ctx, 0x9c6b3f, 3.5);
  [[-10, -10], [10, -6], [-8, 10], [12, 12]].forEach(([dx, dy]) => {
    poly(ctx, [[117 + dx * 0.8, 30 + dy * 0.8], [117 + dx * 1.5 + 3, 30 + dy * 1.5], [117 + dx * 0.8 + 4, 30 + dy * 0.8 + 3]]);
    paint(ctx, 0xd9e2ec, 2, { flat: true });
  });
  circ(ctx, 102, 86, 12);
  paint(ctx, 0xd9a066, 3.5, { flat: true });
  // голова со шлемом
  circ(ctx, 70, 34, 20);
  paint(ctx, 0xe0aa72, 4);
  ctx.beginPath();
  ctx.arc(70, 30, 21, Math.PI, 0);
  ctx.closePath();
  paint(ctx, 0x8a8f99, 4);
  poly(ctx, [[50, 26], [36, 6], [56, 18]]);
  paint(ctx, 0xfff3d6, 3);
  poly(ctx, [[90, 26], [104, 6], [84, 18]]);
  paint(ctx, 0xfff3d6, 3);
  eye(ctx, 66, 38, 5, 1, true);
  eye(ctx, 80, 38, 5, 1, true);
  line(ctx, [[66, 50], [82, 48]], INK, 3.5);
}

function dragon(ctx, f) {
  const up = f === 0;
  // хвост
  ctx.beginPath();
  ctx.moveTo(34, 74);
  ctx.quadraticCurveTo(10, 84, 4, 62);
  ctx.lineTo(16, 70);
  ctx.quadraticCurveTo(22, 72, 36, 64);
  ctx.closePath();
  paint(ctx, 0xc93b32, 3.5);
  // дальнее крыло
  ctx.beginPath();
  ctx.moveTo(56, 62);
  ctx.lineTo(up ? 40 : 34, up ? 8 : 108);
  ctx.lineTo(up ? 76 : 80, up ? 30 : 92);
  ctx.closePath();
  paint(ctx, 0x8e2a24, 3.5, { flat: true });
  // тело
  ell(ctx, 58, 72, 30, 20);
  paint(ctx, 0xd9443a);
  ell(ctx, 60, 80, 20, 9);
  ctx.fillStyle = css(0xffd27a);
  ctx.fill();
  // шея и голова
  ctx.beginPath();
  ctx.moveTo(78, 64);
  ctx.quadraticCurveTo(92, 44, 100, 40);
  ctx.lineTo(104, 54);
  ctx.quadraticCurveTo(94, 62, 84, 78);
  ctx.closePath();
  paint(ctx, 0xd9443a, 3.5);
  ell(ctx, 106, 44, 15, 11);
  paint(ctx, 0xe0524a);
  poly(ctx, [[100, 34], [96, 18], [106, 32]]);
  paint(ctx, 0xfff3d6, 2.5);
  eye(ctx, 108, 40, 4.5, 1, true);
  circ(ctx, 119, 46, 2);
  ctx.fillStyle = INK;
  ctx.fill();
  // ближнее крыло с перепонками
  {
    const tip = up ? [58, 4] : [54, 120];
    const pts = up ? [[74, 22], [90, 34], [96, 52]] : [[70, 108], [86, 96], [96, 80]];
    ctx.beginPath();
    ctx.moveTo(52, 64);
    ctx.lineTo(tip[0], tip[1]);
    let prev = tip;
    for (const pt of pts) {
      ctx.quadraticCurveTo((prev[0] + pt[0]) / 2 + (up ? 2 : 2), (prev[1] + pt[1]) / 2 + (up ? 8 : -8), pt[0], pt[1]);
      prev = pt;
    }
    ctx.quadraticCurveTo(80, 64, 70, 66);
    ctx.closePath();
    paint(ctx, 0xa8322b, 3.5, { flat: true });
    for (const pt of pts) line(ctx, [[54, 64], [tip[0] + (pt[0] - tip[0]) * 0.2, tip[1] + (pt[1] - tip[1]) * 0.2], pt], 0x6e1f1a, 2.5);
  }
  // лапы
  rr(ctx, 46, 86, 9, 16, 4);
  paint(ctx, 0xc93b32, 3, { flat: true });
  rr(ctx, 64, 86, 9, 16, 4);
  paint(ctx, 0xc93b32, 3, { flat: true });
}

const DRAW = { goblin, orc, wolf, bat, skeleton, shaman, troll, ogre, dragon };

export function makeEnemyTextures(scene) {
  for (const [id, fn] of Object.entries(DRAW)) {
    for (let f = 0; f < 2; f++) addTex(scene, `en_${id}_${f}`, 128, 128, (ctx) => fn(ctx, f));
  }
}
