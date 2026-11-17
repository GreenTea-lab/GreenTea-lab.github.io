// уровень, выбранный снаряд, выстрел по врагу, серия кадров
import { run, done } from './shot.mjs';
const lvl = +process.argv[2] - 1, ammo = process.argv[3] || 'stone', arc = process.argv[4] || 'low';
const mob = process.argv[5] === 'm';
const tag = `L${lvl + 1}_${ammo}${mob ? '_m' : ''}`;
const errs = await run({ w: mob ? 400 : 1280, h: mob ? 800 : 720, mobile: mob, debug: { unlockAll: true, maxSteps: 12 }, steps: async (page) => {
  await page.evaluate(([l, a, arc]) => { const g = window.__game; g.s.hints = { aim:1,arc:1,bomb:1,tnt:1,helmet:1,iron:1,cliff:1,split:1,metal:1,fire:1 }; g.startLevel(l); g.introT = 99; g.ammo[a] = (g.ammo[a] || 0) + 1; g.arc = arc; }, [lvl, ammo, arc]);
  await page.waitForTimeout(1200);
  await page.evaluate((a) => { const g = window.__game; g.ui.closeModal(); g.selectAmmo(a); }, ammo);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `shots/${tag}_0.png` });
  const pt = await page.evaluate(() => {
    const g = window.__game; const es = [...g.P.objs.values()].filter(o => o.kind === 'enemy');
    const e = es[Math.floor(es.length / 2)];
    const p = e.body.translation(); const v = g.scene.camera.position.clone().set(p.x, p.y, p.z).project(g.scene.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
  });
  await page.mouse.move(pt.x, pt.y); await page.mouse.down(); await page.mouse.move(pt.x + 1, pt.y + 1);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `shots/${tag}_1.png` });
  await page.mouse.up();
  for (let i = 2; i < 8; i++) {
    await page.waitForTimeout(i < 5 ? 450 : 900);
    if (ammo === 'split' && i === 3) await page.evaluate(() => window.__game.tapAction());
    await page.screenshot({ path: `shots/${tag}_${i}.png` });
  }
  console.log(await page.evaluate(() => { const g = window.__game; return JSON.stringify({ state: g.state, enemies: g.P && g.P.enemiesLeft(), score: g.P && g.P.score, calls: g.scene.renderer.info.render.calls, tris: g.scene.renderer.info.render.triangles }); }));
}});
done(errs);
const { execSync } = await import('child_process');
execSync(`python3 -c "
from PIL import Image
W,H=${mob ? '200,400' : '480,270'}
ims=[Image.open('shots/${tag}_%d.png'%i).resize((W,H)) for i in range(8)]
s=Image.new('RGB',(W*4,H*2))
for i,im in enumerate(ims): s.paste(im,((i%4)*W,(i//4)*H))
s.save('shots/sheet_${tag}.png')"`);
