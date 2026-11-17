// Раздел «Клуб эрудитов»: меню, список, игра, прохождение, сохранение прогресса
import { run, done } from './shot.mjs';
const O = 'test/out/adult_';
const res = await run({ w: 390, h: 844, mobile: true, dpr: 2, steps: async (page) => {
  await page.evaluate(() => { const a = window.__app; a.save.data.tutDone = true; a.show('menu'); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: O + 'menu.png' });
  await page.click('.m-adult'); await page.waitForTimeout(800);
  await page.screenshot({ path: O + 'list.png' });
  await page.click('.tile.cur'); await page.waitForTimeout(900);
  await page.screenshot({ path: O + 'game.png' });
  const solve = () => page.evaluate(() => {
    const g = window.__app.game, pz = g.pz;
    for (const e of pz.entries) { if (pz.solved.has(e.id)) continue; g.selectEntry(e.id, true); for (const i of e.cells) if (!pz.locked(i)) { g.sel = i; g.type(pz.cells[i].ch); } }
  });
  console.log('mode', await page.evaluate(() => window.__app.S.mode), 'title', await page.evaluate(() => document.querySelector('#game .g-ttl')?.textContent));
  await solve(); await page.waitForTimeout(1600);
  await page.screenshot({ path: O + 'win.png' });
  console.log('save', JSON.stringify(await page.evaluate(() => { const p = window.__app.save.data.p.ru; return { main: p.cur, ad: p.ad.cur, adStars: p.ad.stars }; })));
  await page.click('.w-next'); await page.waitForTimeout(900);
  console.log('next level', await page.evaluate(() => window.__app.S.lvl + ' ' + window.__app.S.mode));
  await page.click('#game .backbtn'); await page.waitForTimeout(600);
  console.log('back view', await page.evaluate(() => window.__app.S.view + ' ' + window.__app.S.list));
  await page.screenshot({ path: O + 'list2.png' });
} });
done(res);
