import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/fc31419c-4951-5c39-8720-5e89ab1869b0/scratchpad/';
const errs = await run({ w: 960, h: 540, debug: { bot: true, god: true, sub: 30, autoPick: true, smartPick: true }, steps: async (page) => {
  await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game'));
  const t0 = Date.now(); let shot = false;
  while (Date.now() - t0 < 200000) {
    await page.waitForTimeout(3000);
    const i = await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); return { t: Math.round(g.t), lvl: g.level, kills: g.kills, en: g.enemies.length, bosses: g.bosses, bossHp: g.boss ? Math.round(g.boss.hp) : null, items: g.items.length, bonus: g.bonusCrystals, w: Object.entries(g.weapons).map(([k,v])=>k[0]+v).join('') }; });
    console.log(JSON.stringify(i));
    if (i.bossHp && !shot) { shot = true; await page.screenshot({ path: out + 'long_boss.png' }); }
    if (i.t > 660) break;
  }
}});
done(errs);
