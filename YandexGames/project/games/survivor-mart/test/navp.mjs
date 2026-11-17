import { run, done } from './shot.mjs';
const errs = await run({ w: 640, h: 360, debug: { bot: 1, quality: 'low' }, steps: async (page) => {
  await page.click('[data-a="play"]'); await page.waitForTimeout(500); await page.click('[data-open]'); await page.waitForTimeout(300);
  console.log(await page.evaluate(() => { const w = window.__game.w; w.phase = 'dusk';
    const r = (a) => JSON.stringify(a);
    const g=[];for(let z=-2;z>=-6;z-=0.5){let row=z.toFixed(1)+' ';for(let x=-3;x<=3;x+=0.5){const [i,j]=[Math.floor((x+24)/0.5),Math.floor((z+15)/0.5)];row+=String(w.nav.g[j*96+i]).padStart(3);}g.push(row);} return [g.join('\n'), r(w.nav.path(24, 17.2, 0, -4.0, 'p')), r(w.nav.path(24, 18.2, 0, -4.0, 'p')), r(w.nav.path(20, 18.2, 0, -4.0, 'p')), r(w.nav.path(0, 18.2, 0, -4.0, 'p')), r(w.nav.path(0, 10, 0, -4.0, 'p')), r(w.nav.path(24.5, 18.2, 0.5, -4.4, 'p')), r(w.nav.path(23.0, 18.2, 0.5, -4.4, 'p')), r(w.nav.path(24.5, 18.2, -1, -10.4, 'p')), w.nav.okXZ(23.75, 18.25, 'p'), w.nav.okXZ(20, 18, 'p')].join('\n'); }));
} });
done(errs);
