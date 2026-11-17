// Лист всех плиток обоих наборов: node test/faces.mjs → /tmp/claude-0/shots/faces_*.png
import { run, done } from './shot.mjs';
const errs = await run({ w: 1100, h: 620, steps: async (page) => {
  for (const set of ['classic', 'fruit']) {
    await page.evaluate((set) => {
      const T = window.__lib.tiles;
      T.setFaceSet(set);
      document.body.innerHTML = '<div id="sheet" style="position:fixed;inset:0;background:#3a6a4a;display:flex;flex-wrap:wrap;gap:6px;padding:10px;z-index:999"></div>';
      const sh = document.getElementById('sheet');
      for (const f of [...T.FACE_ORDER, 'key']) { const im = new Image(); im.src = T.tileURL('ivory', f, 96); sh.appendChild(im); }
    }, set);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `/tmp/claude-0/shots/faces_${set}.png` });
  }
} });
done(errs);
