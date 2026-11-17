// Скриншоты экранов: node test/look.mjs <w> <h> <m|d> <prefix>
import { run, done } from './shot.mjs';
const [w, h, mob, pre = 'L'] = process.argv.slice(2);
const M = mob === 'm';
const out = `/tmp/claude-0/${pre}_`;
const errs = await run({ w: +w, h: +h, mobile: M, dpr: 1, debug: { speed: 30 }, locale: process.env.LOC || 'ru-RU', steps: async (p) => {
  await p.waitForTimeout(800);
  await p.screenshot({ path: out + 'home.png' });
  await p.click('[data-a="long"]');
  await p.waitForTimeout(400);
  await p.screenshot({ path: out + 'bots.png' });
  await p.click('.bot[data-lv="2"]');
  for (let i = 0; i < 60; i++) {
    const ph = await p.evaluate(() => window.__game.match.phase);
    if (ph === 'move') break;
    if (ph === 'roll' || ph === 'opening') await p.evaluate(() => window.__game.match.roll());
    await p.waitForTimeout(1200);
  }
  await p.evaluate(() => { const m = window.__game.match; if (m.phase === 'move' && !m.sel) m.select([...m.movable][0]); });
  await p.waitForTimeout(800);
  await p.screenshot({ path: out + 'game.png' });
  await p.evaluate(() => window.__game.ui.pause());
  await p.waitForTimeout(1200);
  await p.screenshot({ path: out + 'pause.png' });
  await p.evaluate(() => { window.__game.ui.closeModals(); window.__game.setPaused(false); window.__game.match.stop(); window.__game.onEnd({ winner: 0, mult: 2 }); });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out + 'end.png' });
  await p.evaluate(() => { window.__game.ui.closeModals(); window.__game.toMenu(false); window.__game.ui.style('checkers'); });
  await p.waitForTimeout(800);
  await p.screenshot({ path: out + 'style.png' });
  await p.evaluate(() => { window.__game.ui.closeModals(); window.__game.ui.rules('short'); });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: out + 'rules.png' });
}});
done(errs);
