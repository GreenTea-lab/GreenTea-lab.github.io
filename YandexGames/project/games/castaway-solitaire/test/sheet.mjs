import { run, done } from './shot.mjs';
const errs = await run({ w: 1100, h: 700, steps: async (p) => {
  await p.evaluate(() => {
    const art = window.__game.table.art;
    art.setSize(140, 1);
    const c = document.createElement('canvas'); c.width = 1100; c.height = 700;
    c.style.cssText = 'position:fixed;inset:0;z-index:99;background:#3a8fb5';
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const list = [[13, 0], [12, 1], [11, 2], [13, 3], [12, 2], [11, 0], [1, 1], [10, 3], [7, 0], [0, 0], ['b']];
    list.forEach(([r, s], k) => { const im = r === 'b' ? art.back() : art.face(r, s); ctx.drawImage(im, 20 + (k % 6) * 175, 20 + Math.floor(k / 6) * 240, 140, 140 * im.height / im.width); });
  });
  await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/claude-0/sheet.png' });
}});
done(errs);
