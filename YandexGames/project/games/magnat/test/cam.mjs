// вращение/зум поля, авто-бросок, окно настройки партии
import { run, done } from './shot.mjs';
const errs = await run({ w: 1280, h: 720, debug: { turbo: 1 }, steps: async (page) => {
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelectorAll('#mod .modal').forEach((m) => m.close && m.close()));
  await page.waitForTimeout(1500); await page.evaluate(() => document.querySelectorAll('#mod .modal').forEach((m) => m.close && m.close())); await page.waitForTimeout(500); await page.click('[data-a="new"]'); await page.waitForTimeout(600);
  await page.screenshot({ path: 'shots/c_setup.png' });
  await page.click('[data-k="h"] [data-v="3"]'); await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/c_setup3.png' });
  await page.click('[data-k="h"] [data-v="1"]');
  await page.click('[data-a="go"]'); await page.waitForTimeout(1500);
  const v0 = await page.evaluate(() => JSON.stringify(window.__game.s3.goal));
  await page.mouse.move(640, 300); await page.mouse.down(); await page.mouse.move(800, 340, { steps: 8 }); await page.mouse.up();
  await page.mouse.move(640, 300); await page.mouse.wheel(0, -300);
  await page.waitForTimeout(1500);
  const v1 = await page.evaluate(() => JSON.stringify([window.__game.s3.goal, window.__game.s3.free]));
  console.log(v0, '\n', v1);
  await page.screenshot({ path: 'shots/c_free.png' });
  // авто-бросок: ждём без нажатия
  const pos0 = await page.evaluate(() => window.__game.M.players[0].pos);
  await page.waitForTimeout(9000);
  console.log('pos', pos0, '->', await page.evaluate(() => window.__game.M.players[0].pos));
  await page.click('.camr'); await page.waitForTimeout(1500);
  console.log('free after reset', await page.evaluate(() => window.__game.s3.free));
  await page.screenshot({ path: 'shots/c_reset.png' });
} });
done(errs);
