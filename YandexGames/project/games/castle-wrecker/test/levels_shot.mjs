import { run, done } from './shot.mjs';
const errs = await run({ w: 960, h: 540, debug: { unlockAll: true, maxSteps: 14, speed: 2 }, steps: async (page) => {
  const G = (f, a) => page.evaluate(f, a);
  await G(() => window.__game.setQuality('low'));
  for (let i = 0; i < 30; i++) {
    await G((i) => { const g = window.__game; g.ui.closeModal(); g.s.hints = { aim:1,arc:1,bomb:1,tnt:1,helmet:1,iron:1,cliff:1,split:1,metal:1,fire:1 }; g.startLevel(i); g.introT = 99; document.querySelectorAll('.banner').forEach(e => e.remove()); }, i);
    await page.waitForTimeout(900);
    await G(() => { const g = window.__game; g.ui.closeModal(); document.querySelectorAll('.banner').forEach(e => e.remove()); });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `shots/lv_${String(i + 1).padStart(2, '0')}.png` });
    const info = await G(() => { const g = window.__game; return { st: g.state, en: g.P.enemiesLeft(), n: g.lv.enemies.length, calls: g.scene.renderer.info.render.calls }; });
    if (info.en !== info.n) console.log('L' + (i + 1), 'enemy lost at start', JSON.stringify(info));
  }
}});
done(errs);
const { execSync } = await import('child_process');
execSync(`python3 -c "
from PIL import Image, ImageDraw
W,H=320,180
s=Image.new('RGB',(W*5,H*6))
for i in range(30):
    im=Image.open('shots/lv_%02d.png'%(i+1)).resize((W,H))
    d=ImageDraw.Draw(im); d.text((6,160),'L%d'%(i+1),fill=(255,0,0))
    s.paste(im,((i%5)*W,(i//5)*H))
s.save('shots/sheet_levels.png')"`);
