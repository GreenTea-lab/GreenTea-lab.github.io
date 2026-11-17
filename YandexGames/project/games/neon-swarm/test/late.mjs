// Визуальная проверка поздней игры: события, элита, победа, меню хардкора
import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/fc31419c-4951-5c39-8720-5e89ab1869b0/scratchpad/';
const errs = await run({
  w: 960, h: 540,
  debug: { god: true, sub: 4, autoPick: true, smartPick: true },
  steps: async (page) => {
    await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game'));
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const g = window.__game.scene.getScene('Game');
      g.t = 1150;
      g.nextBoss = 99999; g.nextSwarm = 99999; g.nextEvent = 99999;
      g.hud.hideHint();
    });
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      const g = window.__game.scene.getScene('Game');
      g.runEvent('elites'); g.runEvent('lancers'); g.runEvent('bombers'); g.runEvent('snipers');
      g.strikeVolley();
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: out + 'late_ev.png' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: out + 'late_ev2.png' });
    // уровень после полной прокачки
    await page.evaluate(() => {
      const g = window.__game.scene.getScene('Game');
      for (const k of ['blaster','orbit','nova','lightning','missile']) g.weapons[k] = 5;
      for (const k of ['vitality','regen','swift','magnet','power','haste','area','armor','wisdom']) g.passives[k] = 5;
      g.recalc();
      g.setPause('levelup', true); g.hud.showLevelUp(g.buildOptions());
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: out + 'late_lvl.png' });
    await page.evaluate(() => {
      const g = window.__game.scene.getScene('Game');
      g.hud.closeOverlay(); g.levelUpOpen = false; g.pendingLevels = 0; g.setPause('levelup', false);
      g.t = 1799;
    });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: out + 'late_win.png' });
    const st = await page.evaluate(() => ({ won: window.__game.scene.getScene('Game').won, unlocked: window.__ns_save.data.hardUnlocked }));
    console.log(JSON.stringify(st));
    await page.evaluate(() => window.__game.scene.getScene('Game').continueEndless());
    await page.evaluate(() => { const g = window.__game.scene.getScene('Hud'); g.closeOverlay(); });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: out + 'late_endless.png' });
    await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); g.finishRun(); });
    await page.waitForTimeout(800);
    await page.screenshot({ path: out + 'late_over.png' });
    await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); g.scene.start('Menu'); g.scene.stop('Hud'); });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: out + 'late_menu.png' });
  },
});
done(errs);
