import { drawFace, drawBack, BACK_ORDER } from '../../src/cards.js';
import { drawAvatar, KINDS } from '../../src/avatars.js';
import { buildScene, clothPreview, DECOR_ORDER } from '../../src/scene.js';
import { card } from '../../src/core.js';
window.go = async (which) => {
  await document.fonts.ready;
  const c = document.getElementById('c');
  const g = c.getContext('2d');
  if (which === 'cards') {
    c.width = 1400; c.height = 900;
    g.fillStyle = '#2f7a4a'; g.fillRect(0, 0, 1400, 900);
    const w = 110, h = Math.round(w * 1.42);
    const list = [card(0, 6), card(1, 7), card(2, 8), card(3, 9), card(0, 10), card(1, 11), card(2, 12), card(3, 13), card(0, 14), card(3, 14), card(1, 13), card(0, 12)];
    list.forEach((id, i) => { g.save(); g.translate(20 + (i % 6) * 125, 20 + Math.floor(i / 6) * 175); drawFace(g, id, w, h, { lang: i < 6 ? 'ru' : 'en', four: i > 8 }); g.restore(); });
    BACK_ORDER.forEach((b, i) => { g.save(); g.translate(20 + i * 125, 380); drawBack(g, b, w, h); g.restore(); });
    KINDS.forEach((k, i) => drawAvatar(g, k, 70 + i * 140, 680, 55, { cap: i === 8 }));
    // мелкие карты в руке с перекрытием
    for (let i = 0; i < 8; i++) { g.save(); g.translate(800 + i * 40, 30); drawFace(g, card(i % 4, 6 + i), 80, 114, { lang: 'ru' }); g.restore(); }
  } else {
    const [W, H] = which === 'scene' ? [1280, 720] : [390, 844];
    c.width = W; c.height = H;
    const s = buildScene(W, H, 1, window.cloth || 'felt', { avoid: [{ x: W * 0.15, y: H * 0.05, w: W * 0.7, h: H * 0.9 }] });
    g.drawImage(s.canvas, 0, 0);
  }
};
