// Скриншоты новых экранов: node test/v2_ui.mjs [land|port]
import { run, done } from './shot.mjs';
const out = process.env.OUT || '/tmp/claude-0/shots/';
const port = process.argv[2] === 'port';
const W = port ? 390 : 1280, H = port ? 844 : 720;
const tag = port ? 'p_' : 'l_';
const errs = await run({
  w: W, h: H, mobile: port, dpr: port ? 2 : 1, debug: { },
  pre: () => { try { localStorage.clear(); } catch (e) {} },
  steps: async (page) => {
    const G = (f, a) => page.evaluate(f, a);
    const shot = (n) => page.screenshot({ path: out + tag + n + '.png' });
    // немного прогресса, чтобы экраны были не пустыми
    await G(() => {
      const s = window.__ns_save.data;
      s.crystals = 950; s.best = { score: 48210, time: 1012, kills: 3400, level: 61 }; s.stars.normal = 3; s.hardUnlocked = true;
      s.ach = { first: 1, t5: 1, t10: 1, boss1: 1, kills1k: 1 }; s.stats.evos = { blaster: 1, nova: 1 }; s.stats.bosses = { boss: 2, pulsar: 1 };
    });
    const menu = window => 0;
    const panel = async (p) => { await G((p) => { const m = window.__game.scene.getScene('Menu'); m.go(p); }, p); await page.waitForTimeout(500); await shot('m_' + (p || 'main')); };
    await panel(null);
    for (const p of ['prep', 'ach', 'daily', 'challenge', 'rush', 'settings', 'shop']) await panel(p);
    await G(() => { const m = window.__game.scene.getScene('Menu'); m.tab = 'evo'; m.go('ach'); m.tab = 'evo'; m.layout(); });
    await page.waitForTimeout(400); await shot('m_evo');
    // заблокированный герой в подготовке
    await G(() => { const s = window.__ns_save.data; s.sel.hero = 'h_wreck'; s.sel.arena = 'a_reef'; s.sel.diff = 't2'; window.__game.scene.getScene('Menu').go('prep'); });
    await page.waitForTimeout(400); await shot('m_prep_locked');
  },
});
done(errs);
