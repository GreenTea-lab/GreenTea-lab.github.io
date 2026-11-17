import { run, done } from './shot.mjs';
const all = [];
for (const [w, h, mobile, tag] of [[1280, 720, false, 'd'], [400, 800, true, 'm']]) {
  const errs = await run({ w, h, mobile, debug: { unlockAll: true, maxSteps: 14 }, steps: async (page) => {
    const G = (f, a) => page.evaluate(f, a);
    await G(() => { const g = window.__game; g.s.hints = { aim:1,arc:1,bomb:1,tnt:1,helmet:1,iron:1,cliff:1,split:1,metal:1,fire:1 }; g.startLevel(9); g.introT = 99; });
    await page.waitForTimeout(1500);
    await G(() => { window.__game.ui.closeModal(); document.querySelectorAll('.banner').forEach(e => e.remove()); });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `shots/vm_${tag}_aim.png` });
    const pt = await G(() => { const g = window.__game; const e = [...g.P.objs.values()].find(o => o.kind === 'enemy'); const p = e.body.translation(); const v = g.scene.camera.position.clone().set(p.x, p.y, p.z).project(g.scene.camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; });
    await page.mouse.move(pt.x, pt.y); await page.mouse.down(); await page.mouse.move(pt.x + 1, pt.y);
    await page.waitForTimeout(300);
    await page.mouse.up();
    for (let i = 1; i <= 3; i++) { await page.waitForTimeout(120); await page.screenshot({ path: `shots/vm_${tag}_fire${i}.png` }); }
  }});
  all.push(...errs);
}
done(all);
const { execSync } = await import('child_process');
execSync(`python3 -c "
from PIL import Image
a=[Image.open('shots/vm_d_%s.png'%n).resize((480,270)) for n in ['aim','fire1','fire2','fire3']]
b=[Image.open('shots/vm_m_%s.png'%n).resize((135,270)) for n in ['aim','fire1','fire2','fire3']]
s=Image.new('RGB',(480*4,270+270),'white')
for i,im in enumerate(a): s.paste(im,(i*480,0))
for i,im in enumerate(b): s.paste(im,(i*135,270))
s.save('shots/sheet_vm.png')"`);
