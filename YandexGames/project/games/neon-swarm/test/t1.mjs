import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/fc31419c-4951-5c39-8720-5e89ab1869b0/scratchpad/';
const errs = await run({
  w: 1280,
  h: 720,
  debug: { bot: true },
  steps: async (page) => {
    await page.screenshot({ path: out + 'd_menu.png' });
    // клик по кнопке ИГРАТЬ (центр, ~55% высоты)
    await page.mouse.click(640, 720 * 0.55);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: out + 'd_game1.png' });
    await page.evaluate(() => (window.__NS_DEBUG.speed = 4));
    await page.waitForTimeout(6000);
    await page.screenshot({ path: out + 'd_game2.png' });
    const info = await page.evaluate(() => {
      const g = window.__game.scene.getScene('Game');
      return { t: g.t, lvl: g.level, kills: g.kills, enemies: g.enemies.length, hp: g.p.hp, levelUpOpen: g.levelUpOpen, fps: window.__game.loop.actualFps };
    });
    console.log(JSON.stringify(info));
  },
});
done(errs);
