import { FACE_ORDER, bodySprite, faceSprite, tileDims, badgeSprite, STYLE_ORDER } from '../../src/tiles.js';
const c = document.getElementById('c'); const g = c.getContext('2d');
g.fillStyle = '#3a6a8a'; g.fillRect(0, 0, c.width, c.height);
const list = [...FACE_ORDER, 'key'];
const draw = (w, x0, y0, cols, style) => {
  const D = tileDims(w);
  list.forEach((f, i) => {
    const x = x0 + (i % cols) * (D.w + D.d + 4), y = y0 + Math.floor(i / cols) * (D.h + D.d + 4);
    g.drawImage(bodySprite(style, w), x, y);
    const fs = Math.round(w * 0.86);
    g.drawImage(faceSprite(f, fs), x + (D.w - fs) / 2, y + (D.h - fs) / 2);
  });
};
draw(90, 10, 10, 11, 'ivory');
draw(46, 10, 400, 17, 'ivory');
STYLE_ORDER.forEach((s, k) => { const x = 900 + k * 70; g.drawImage(bodySprite(s, 60), x, 420); g.drawImage(faceSprite('apple', 52), x + 4, 430); });
g.drawImage(bodySprite('ivory', 60, 'back'), 900, 520);
g.drawImage(badgeSprite('coin', 30), 1000, 520); g.drawImage(badgeSprite('lock', 40), 1040, 520);
window.done = true;
