// Лист всех наборов брусков → /tmp/claude-0/skins.png
import { run, done } from './shot.mjs';
const errs = await run({ w: 1100, h: 800, dpr: 1, steps: async (page) => {
  await page.evaluate(() => {
    const G = window.__gfx;
    document.getElementById('ui').style.display = 'none';
    const S = 64, cv = document.createElement('canvas');
    cv.width = 8 * S + 10; cv.height = G.STYLE_ORDER.length * (S + 4);
    cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99;background:#8a5a30';
    const g = cv.getContext('2d');
    G.STYLE_ORDER.forEach((id, r) => { for (let c = 0; c < 8; c++) g.drawImage(G.blockSprite(id, c, S), 5 + c * S, r * (S + 4), S, S); });
    document.body.appendChild(cv);
  });
  await page.screenshot({ path: '/tmp/claude-0/skins.png', clip: { x: 0, y: 0, width: 530, height: 700 } });
} });
done(errs);
