// Новое в бою: обучение, карточки, сундук/эволюции, новые боссы, арены, бой с боссами
import { run, done } from './shot.mjs';
const out = process.env.OUT || '/tmp/claude-0/shots/';
const port = process.argv[2] === 'port';
const W = port ? 390 : 1280, H = port ? 844 : 720;
const tag = port ? 'pg_' : 'lg_';
const errs = await run({
  w: W, h: H, mobile: port, dpr: port ? 2 : 1, debug: { god: true },
  pre: () => { try { localStorage.clear(); } catch (e) {} },
  steps: async (page) => {
    const G = (f, a) => page.evaluate(f, a);
    const shot = (n) => page.screenshot({ path: out + tag + n + '.png' });
    const start = async (run) => { await G((r) => window.__game.scene.getScene('Menu').startRun(r), run); await page.waitForTimeout(2500); };
    const g = 'window.__game.scene.getScene("Game")';
    await start({ modeId: 'normal', hero: 'h_neon', arena: 'a_grid' });
    await shot('tut');
    // карточки «было → станет»
    await G(() => { const g = window.__game.scene.getScene('Game'); g.weapons = { blaster: 6, nova: 2, orbit: 3 }; g.passives = { power: 2, multishot: 1 }; g.recalc(); g.hud.tut = 2; g.xp = g.need + 1; });
    await page.waitForTimeout(1500);
    await shot('levelup');
    console.log('levelup open', await G(() => window.__game.scene.getScene('Game').levelUpOpen));
    await G(() => { const h = window.__game.scene.getScene('Hud'); h.closeOverlay(); const g = window.__game.scene.getScene('Game'); g.levelUpOpen = false; g.pendingLevels = 0; g.setPause('levelup', false); });
    // сундук с эволюцией
    await G(() => { const g = window.__game.scene.getScene('Game'); g.weapons.blaster = 8; g.openChest(); });
    await page.waitForTimeout(500); await shot('chest_spin');
    await page.waitForTimeout(1600); await shot('chest_evo');
    await G(() => { const h = window.__game.scene.getScene('Hud'); const f = h.chestClose; h.closeOverlay(); f && f(); });
    // сундук с предметами
    await G(() => { const g = window.__game.scene.getScene('Game'); const r0 = Math.random; let c = 0; Math.random = () => (c++ === 0 ? 0.95 : r0()); g.openChest(); Math.random = r0; });
    await page.waitForTimeout(2200); await shot('chest_items');
    await page.reload();
    await page.waitForFunction(() => window.__game && window.__game.scene.isActive('Menu'));
    await G(() => { window.__ns_save.data.tutorialDone = true; });
    // все эволюции разом + Змей
    await start({ modeId: 'normal', hero: 'h_guard', arena: 'a_reef' });
    await G(() => { const g = window.__game.scene.getScene('Game'); for (const w of ['blaster','orbit','nova','lightning','missile','laser']) { g.weapons[w] = 8; g.evo[w] = true; } g.t = 400; g.recalc(); g.spawnBoss('serpent'); });
    await page.waitForTimeout(4000); await shot('evo_serpent');
    console.log('serpent', await G(() => { const g = window.__game.scene.getScene('Game'); return { boss: g.boss && g.boss.type, hp: g.boss && Math.round(g.boss.hp), en: g.enemies.length, pillars: g.pillarSpr.size }; }));
    await G(() => { const g = window.__game.scene.getScene('Game'); g.weapons = { saw: 8, drone: 8, lightning: 8 }; g.evo = { saw: true, drone: true, lightning: true }; g.recalc(); g.spawnBoss('mirror'); });
    await page.waitForTimeout(5000); await shot('evo_mirror');
    console.log('mirror', await G(() => { const g = window.__game.scene.getScene('Game'); return { boss: g.boss && g.boss.type, ms: g.boss && g.boss.ms, en: g.enemies.length }; }));
    await G(() => window.__game.scene.getScene('Game').finishRun());
    await page.waitForTimeout(1500); await shot('over');
    // ядро галактики, бой с боссами
    await G(() => { const h = window.__game.scene.getScene('Hud'); h.closeOverlay(); window.__game.scene.getScene('Game').scene.start('Menu'); h.scene.stop(); });
    await page.waitForTimeout(800);
    await start({ modeId: 'rush', hero: 'h_mech', arena: 'a_core' });
    await page.waitForTimeout(4000); await shot('rush');
    console.log('rush', await G(() => { const g = window.__game.scene.getScene('Game'); return { lvl: g.level, w: g.weapons, boss: g.boss && g.boss.type, ph: g.hud.phaseText.text }; }));
  },
});
done(errs);
