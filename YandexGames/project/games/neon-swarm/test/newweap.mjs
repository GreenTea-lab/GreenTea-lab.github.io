// Новые оружия и пассивки: лазер, диски, дроны, мультивыстрел, крит, пробивание
import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/fc31419c-4951-5c39-8720-5e89ab1869b0/scratchpad/';
const errs = await run({ w: 1280, h: 720, debug: { god: true, sub: 2, autoPick: true, smartPick: true }, steps: async (page) => {
  await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const g = window.__game.scene.getScene('Game');
    g.hud.hideHint();
    g.t = 240;
    Object.assign(g.weapons, { blaster: 3, laser: 3, saw: 3, drone: 3 });
    Object.assign(g.passives, { multishot: 1, crit: 2, pierce: 1 });
    g.recalc();
    for (let i = 0; i < 60; i++) g.spawnEnemy(g.pickType());
  });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: out + 'nw1.png' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out + 'nw2.png' });
  const r = await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); return { kills: g.kills, saws: g.saws.length, drones: g.drones.length, bullets: g.bullets.length, beams: g.beams.length, t: Math.round(g.t) }; });
  console.log(JSON.stringify(r));
  // карточки улучшений: проверяем, что новые пункты показываются
  await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); g.weapons = { blaster: 1 }; g.passives = {}; g.recalc(); g.setPause('levelup', true); g.hud.showLevelUp([{ kind: 'w', id: 'laser', lvl: 1, color: 0xff3355 }, { kind: 'p', id: 'multishot', lvl: 1, color: 0x31f6ff }, { kind: 'w', id: 'drone', lvl: 1, color: 0x4d7cff }]); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: out + 'nw3.png' });
  // частота «+1 снаряд»: сколько раз за 200 повышений предлагают бластер или мультивыстрел
  const freq = await page.evaluate(() => {
    const g = window.__game.scene.getScene('Game');
    g.weapons = { blaster: 1, orbit: 2, nova: 1 }; g.passives = { power: 1, swift: 1 };
    let b = 0, m = 0;
    for (let i = 0; i < 200; i++) { const o = g.buildOptions(); if (o.some((x) => x.id === 'blaster')) b++; if (o.some((x) => x.id === 'multishot')) m++; }
    return { blaster: b / 2, multishot: m / 2 };
  });
  console.log('доля окон с бластером/мультивыстрелом, %', JSON.stringify(freq));
}});
done(errs);
