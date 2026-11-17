import { run, done } from './shot.mjs';
const all = [];
for (const [w, h, mobile, tag] of [[1280, 720, false, 'd'], [400, 800, true, 'm']]) {
  const errs = await run({ w, h, mobile, debug: { unlockAll: true, maxSteps: 14, speed: 1 }, steps: async (page) => {
    const G = (f, a) => page.evaluate(f, a);
    await G(() => { const g = window.__game; g.s.hints = { aim:1,arc:1,bomb:1,tnt:1,helmet:1,iron:1,cliff:1,split:1,metal:1,fire:1 }; g.startLevel(9); g.introT = 99; });
    await page.waitForTimeout(1500);
    await G(() => { window.__game.ui.closeModal(); document.querySelectorAll('.banner').forEach(e => e.remove()); });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `shots/c2_${tag}_0.png` });
    const pt = await G(() => { const g = window.__game; const es = [...g.P.objs.values()].filter(o => o.kind === 'enemy'); const e = es.sort((a, b) => a.body.translation().x - b.body.translation().x)[0]; const p = e.body.translation(); const v = g.scene.camera.position.clone().set(p.x, p.y, p.z).project(g.scene.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; });
    await page.mouse.move(pt.x, pt.y); await page.mouse.down(); await page.mouse.move(pt.x + 1, pt.y);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `shots/c2_${tag}_1.png` });
    await page.mouse.up();
    const t0 = Date.now();
    for (let i = 2; i <= 5; i++) { await page.waitForTimeout(350); await page.screenshot({ path: `shots/c2_${tag}_${i}.png` }); }
    await page.waitForFunction(() => window.__game.state === 'aim' || window.__game.state === 'win', null, { timeout: 120000 });
    console.log(tag, 'back to aim after', ((Date.now() - t0) / 1000).toFixed(1), 's (game time', await G(() => (window.__game.P.time).toFixed(1)), ')');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `shots/c2_${tag}_6.png` });
  }});
  all.push(...errs);
}
done(all);
const { execSync } = await import('child_process');
execSync(`python3 -c "
from PIL import Image
a=[Image.open('shots/c2_d_%d.png'%i).resize((480,270)) for i in range(7)]
b=[Image.open('shots/c2_m_%d.png'%i).resize((135,270)) for i in range(7)]
s=Image.new('RGB',(480*4,270*3),'white')
for i,im in enumerate(a): s.paste(im,((i%4)*480,(i//4)*270))
for i,im in enumerate(b): s.paste(im,(i*135,540))
s.save('shots/sheet_c2.png')"`);
