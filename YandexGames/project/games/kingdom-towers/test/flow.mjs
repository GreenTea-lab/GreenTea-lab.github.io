import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/-home-claude/fc31419c-4951-5c39-8720-5e89ab1869b0/scratchpad/tdf_';
const errs = await run({ w: 390, h: 844, mobile: true, dpr: 2, debug: {}, steps: async (page) => {
  const G = (f, a) => page.evaluate(f, a);
  const cdp = await page.context().newCDPSession(page);
  const tap = async (x, y) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await page.waitForTimeout(60);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(250);
  };
  const dpr = 2;
  const btnPos = (scene, text) => G(({ scene, text }) => {
    const s = window.__game.scene.getScene(scene);
    const all = s.children.list.filter(o => o.type === 'Container');
    for (const c of all) for (const ch of c.list) if (ch.type === 'Text' && ch.text.includes(text)) return [c.x, c.y];
    return null;
  }, { scene, text });
  // меню -> ИГРАТЬ
  let p = await btnPos('Menu', 'ИГРАТЬ'); await tap(p[0] / dpr, p[1] / dpr);
  await page.waitForTimeout(500);
  console.log('levels active', await G(() => window.__game.scene.isActive('Levels')));
  p = await btnPos('Levels', '1'); await tap(p[0] / dpr, p[1] / dpr);
  await page.waitForTimeout(1200);
  console.log('game active', await G(() => window.__game.scene.isActive('Game')));
  await page.screenshot({ path: out + '1tut.png' });
  // клетка из подсказки
  const cell = await G(() => { const h = window.__game.scene.getScene('Hud'); const r = h.tipL.items.find(o => o.texture && o.texture.key === 'ring'); return [r.x, r.y]; });
  await tap(cell[0] / dpr, cell[1] / dpr);
  await page.waitForTimeout(300);
  const opts = await G(() => window.__game.scene.getScene('Hud').menuBtns.map(m => [m.btn.c.x, m.btn.c.y]));
  console.log('menu opts', opts.length);
  await tap(opts[0][0] / dpr, opts[0][1] / dpr);
  await page.screenshot({ path: out + '2select.png' });
  const opts2 = await G(() => window.__game.scene.getScene('Hud').menuBtns.map(m => [m.btn.c.x, m.btn.c.y]));
  await tap(opts2[0][0] / dpr, opts2[0][1] / dpr);
  console.log('towers', await G(() => window.__game.scene.getScene('Game').towers.size), 'gold', await G(() => window.__game.scene.getScene('Game').gold));
  await page.screenshot({ path: out + '3built.png' });
  p = await G(() => window.__game.scene.getScene('Hud').waveBtnPos);
  await tap(p[0] / dpr, p[1] / dpr);
  await page.waitForTimeout(800);
  console.log('wave', await G(() => window.__game.scene.getScene('Game').waveIdx));
  // закрыть карточку нового врага
  if (await G(() => !!window.__game.scene.getScene('Hud').overlay)) { await page.waitForTimeout(500); await tap(195, 422); }
  console.log('paused', await G(() => window.__game.scene.getScene('Game').scene.isPaused()));
  await page.waitForTimeout(4000);
  await page.screenshot({ path: out + '4wave.png' });
  // тап по башне -> улучшить
  const tw = await G(() => { const g = window.__game.scene.getScene('Game'); const t = [...g.towers.values()][0]; g.gold = 999; return g.toScreen(t.cx + 0.5, t.cy + 0.5); });
  await tap(tw[0] / dpr, tw[1] / dpr);
  const up = await G(() => window.__game.scene.getScene('Hud').menuBtns.map(m => [m.btn.c.x, m.btn.c.y]));
  await tap(up[0][0] / dpr, up[0][1] / dpr);
  console.log('tower lvl', await G(() => [...window.__game.scene.getScene('Game').towers.values()][0].lvl));
  await page.screenshot({ path: out + '5upgrade.png' });
  // поражение -> продолжить за рекламу
  await G(() => { const g = window.__game.scene.getScene('Game'); g.lives = 0; g.onDefeat(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out + '6continue.png' });
  p = await btnPos('Hud', 'ПРОДОЛЖИТЬ'); await tap(p[0] / dpr, p[1] / dpr);
  await page.waitForTimeout(2000);
  console.log('after continue', await G(() => { const g = window.__game.scene.getScene('Game'); return { lives: g.lives, paused: g.scene.isPaused(), ended: g.ended }; }));
  // победа -> далее
  await G(() => { const g = window.__game.scene.getScene('Game'); g.waveIdx = g.waves.length - 1; g.spawnList = []; g.enemies.forEach(e => e.alive && g.kill(e)); g.enemies = []; });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out + '7victory.png' });
  p = await btnPos('Hud', 'ДАЛЕЕ'); await tap(p[0] / dpr, p[1] / dpr);
  await page.waitForTimeout(1500);
  console.log('next level', await G(() => window.__game.scene.getScene('Game').lvl), 'stars', await G(() => JSON.stringify(JSON.parse(localStorage.getItem('kingdom_towers_save_v1')).stars)));
  await page.screenshot({ path: out + '8level2.png' });
}});
done(errs);
