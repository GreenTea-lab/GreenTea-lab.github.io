// Контактный лист предметов на брусках разных цветов → /tmp/claude-0/items.png
import { run, done } from './shot.mjs';
const errs = await run({ w: 1400, h: 900, dpr: 1, steps: async (page) => {
  await page.evaluate(() => {
    const G = window.__gfx;
    document.getElementById('ui').style.display = 'none';
    const cv = document.createElement('canvas');
    const ids = G.ITEM_IDS, cols = 8, S = 150;
    cv.width = cols * S; cv.height = Math.ceil(ids.length / cols) * S;
    cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99';
    const g = cv.getContext('2d');
    ids.forEach((id, i) => {
      const x = (i % cols) * S, y = Math.floor(i / cols) * S;
      g.drawImage(G.blockSprite('painted', i % 7, S), x, y, S, S);
      const is = S * 0.74;
      g.drawImage(G.itemSprite(id, is), x + (S - is) / 2, y + (S - is) / 2 - 2, is, is);
    });
    document.body.appendChild(cv);
  });
  await page.screenshot({ path: '/tmp/claude-0/items.png', clip: { x: 0, y: 0, width: 1200, height: 450 } });
} });
done(errs);
