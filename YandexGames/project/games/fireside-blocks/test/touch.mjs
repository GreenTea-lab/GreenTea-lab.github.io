// Перетаскивание пальцем: нижний ряд фигуры ложится в клетку под пальцем.
// Пробуем разные фигуры и разные точки касания внутри целевой клетки.
import { run, done } from './shot.mjs';
let bad = 0;
const errs = await run({ w: 390, h: 844, mobile: true, dpr: 2, steps: async (page) => {
  await page.evaluate(() => { window.__save.data.tut.classic = 1; });
  const res = await page.evaluate(() => {
    const out = [];
    const g = window.__game, C = window.__gfx.core;
    const cv = document.getElementById('c');
    const fire = (type, x, y) => cv.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerType: 'touch', pointerId: 7, bubbles: true }));
    for (let seed = 1; seed <= 12; seed++) for (const off of [-0.35, 0, 0.35]) {
      g.dbg.seed = seed;
      g.startClassic(false);
      const v = g.view, L = v.L;
      const slot = g.st.game.tray.findIndex(Boolean);
      const sh = C.SHAPE[g.st.game.tray[slot].s];
      const X = 2, Y = 3;
      // палец в клетке нижнего ряда фигуры, по центру фигуры по горизонтали
      const fx = L.gx + (X + sh.w / 2) * L.cell + off * L.cell * 0.5;
      const fy = L.gy + (Y + sh.h - 0.5 + off) * L.cell;
      const c = v.slotCenter(slot);
      fire('pointerdown', c.x, c.y);
      for (let k = 1; k <= 6; k++) fire('pointermove', c.x + (fx - c.x) * k / 6, c.y + (fy - c.y) * k / 6);
      const pv = g.st.preview ? [g.st.preview.x, g.st.preview.y] : null;
      fire('pointerup', fx, fy);
      out.push({ shape: sh.id, off, preview: pv, ok: !!pv && pv[0] === X && pv[1] === Y, moves: g.st.game.moves });
    }
    return out;
  });
  for (const r of res) if (!r.ok || r.moves !== 1) { bad++; console.log('MISS', JSON.stringify(r)); }
  console.log(`touch: ${res.length - bad}/${res.length} точно в цель`);
} });
if (bad) errs.push(`touch misses: ${bad}`);
done(errs);
