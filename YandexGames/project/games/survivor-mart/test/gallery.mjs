// Галерея моделей крупным планом: node test/gallery.mjs <spec,spec,...> <name> [views]
// spec: hero | staff:cashier | cust:11 | zombie:walker | car:sedan
import { run, done } from './shot.mjs';
import fs from 'fs';
const specs = (process.argv[2] || 'car:sedan').split(',');
const name = process.argv[3] || 'g';
const out = 'shots/gal';
fs.mkdirSync(out, { recursive: true });
const VIEWS = { f: [0.35, 0.3, 1], s: [1, 0.25, 0.05], b: [-0.5, 0.45, -1], t: [0.02, 1, 0.25], q: [0.8, 0.6, 0.8] };
const views = (process.argv[4] || 'fsb').split('');
const errs = await run({
  w: 1400, h: 800, debug: { quality: 'high' },
  steps: async (page) => {
    await page.addStyleTag({ content: '#ui,.modal{display:none!important}' });
    for (const v of views) {
      await page.evaluate(([sp, view]) => window.__gallery(sp, view), [specs, VIEWS[v]]);
      await page.screenshot({ path: `${out}/${name}_${v}.png` });
    }
  },
});
done(errs);
