// Игра вдвоём на одной клавиатуре: WASD двигает первого повара, стрелки — второго
import { run, done } from './shot.mjs';
process.env.MOCK_SDK = '1';
const errs = await run({
  w: 1280, h: 720, debug: { seed: 5 },
  pre: `localStorage.setItem('kitchen_rush_save_v1', JSON.stringify({coins:5000,daily:{day:new Date().toISOString().slice(0,10)}}))`,
  steps: async (page) => {
    await page.evaluate(() => __game.ui.closeModal());
    await page.click('[data-a=play]');
    await page.waitForTimeout(300);
    await page.click('.lcard[data-i="0"]');
    await page.waitForTimeout(400);
    await page.click('[data-mode=coop]');
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'shots/coop_intro.png' });
    await page.click('[data-go]');
    await page.waitForFunction(() => __game.k && __game.k.started, null, { timeout: 60000 });
    const pos = () => page.evaluate(() => __game.k.chefs.map((c) => [+c.x.toFixed(2), +c.z.toFixed(2), c.hold ? c.hold.k + ':' + (c.hold.id || c.hold.ing || '') : null]));
    console.log('t', await page.evaluate(() => __game.k.t));
    console.log('coop', await page.evaluate(() => __game.coop), 'start', JSON.stringify(await pos()));
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(700);
    await page.keyboard.up('KeyD');
    console.log('after D', JSON.stringify(await pos()));
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(700);
    await page.keyboard.up('ArrowLeft');
    console.log('after Left', JSON.stringify(await pos()));
    await page.keyboard.down('ArrowUp');
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(1500);
    await page.keyboard.up('ArrowUp');
    await page.keyboard.up('KeyW');
    console.log('after both up', JSON.stringify(await pos()));
    // ставим второго повара к ящику с помидорами, первого к соседней доске
    await page.evaluate(() => {
      const k = __game.k;
      const cr = k.tiles.find((t) => t.type === 'crate' && t.z === 0) || k.tiles.find((t) => t.type === 'crate');
      const c = k.chefs[1];
      c.x = cr.x + 0.5; c.z = cr.z + 1.5; c.dir = Math.PI;
      const c0 = k.chefs[0];
      c0.x = cr.x + 1.5; c0.z = cr.z + 1.5; c0.dir = Math.PI;
    });
    await page.waitForTimeout(800);
    console.log('targets', await page.evaluate(() => __game.k.chefs.map((c) => { const t = __game.k.targetTile(c); return t && t.type + '@' + t.x + ',' + t.z; }).join(' ')));
    await page.keyboard.down('Enter');
    await page.waitForTimeout(400);
    await page.keyboard.up('Enter');
    await page.waitForTimeout(400);
    console.log('P2 Enter', JSON.stringify(await pos()));
    await page.evaluate(() => { const k = __game.k; k.chefs[0].x -= 1; k.chefs[1].x += 1; });
    await page.waitForTimeout(800);
    await page.keyboard.down('Space');
    await page.waitForTimeout(400);
    await page.keyboard.up('Space');
    await page.waitForTimeout(300);
    console.log('after pick', JSON.stringify(await pos()));
    await page.screenshot({ path: 'shots/coop_play.png' });
  },
});
done(errs);
