// Полный сценарий с мок-SDK: меню, подарок, уровень, победа, x2, поражение, доп. снаряд, магазин, лидерборд
import { run, done } from './shot.mjs';
process.env.MOCK_SDK = 1;

const mob = process.argv[2] === 'm';
const out = mob ? 'shots/flowm_' : 'shots/flow_';
const errs = await run({ w: mob ? 390 : 1280, h: mob ? 844 : 720, mobile: mob, dpr: 1, debug: { maxSteps: 14, speed: 3 }, steps: async (page) => {
  const G = (f, a) => page.evaluate(f, a);
  const click = async (sel) => { const ok = await G((s) => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); if (!ok) console.log('NO ELEMENT', sel); await page.waitForTimeout(400); };
  const waitState = async (st, ms = 60000) => { try { await page.waitForFunction((s) => s.includes(window.__game.state), st, { timeout: ms }); } catch (e) { console.log('TIMEOUT waiting', st, 'state', await G(() => window.__game.state)); } };
  const shootEnemy = async (mode = 'enemy') => {
    const pt = await G((m) => {
      const g = window.__game;
      let p;
      if (m === 'enemy') { const e = [...g.P.objs.values()].find(o => o.kind === 'enemy'); p = e.body.translation(); }
      else { const b = g.box; p = { x: b.cx - b.w / 2 - 2.5, y: 0, z: b.z0 - 1 }; }
      const v = g.scene.camera.position.clone().set(p.x, p.y, p.z).project(g.scene.camera);
      return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight + (g.mobile ? 0 : 0) };
    }, mode);
    await page.mouse.move(pt.x, pt.y); await page.mouse.down(); await page.mouse.move(pt.x + 1, pt.y); await page.mouse.up();
    await page.waitForTimeout(300);
    await waitState(['aim', 'win', 'lose']);
    await page.waitForTimeout(300);
  };
  await G(() => window.__game.setQuality('low'));
  await page.screenshot({ path: out + '1menu.png' });
  await click('.btn.play');
  await page.waitForTimeout(700);
  await page.screenshot({ path: out + '2daily.png' });
  await click('.panel.daily .btn.ad');
  await page.waitForTimeout(1200);
  console.log('gold after daily x3', await G(() => window.__game.s.gold));
  await page.screenshot({ path: out + '3map.png' });
  await click('.lvl');
  await page.waitForTimeout(300);
  await page.mouse.click(200, 300); // пропустить облёт
  await page.waitForTimeout(800);
  await page.screenshot({ path: out + '4hint.png' });
  await click('.hint .btn');
  for (let i = 0; i < 4; i++) { const st = await G(() => window.__game.state); if (st !== 'aim') break; await shootEnemy(); }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out + '5win.png' });
  console.log('after L1', await G(() => JSON.stringify({ state: window.__game.state, stars: window.__game.s.stars.slice(0, 3), gold: window.__game.s.gold })));
  await click('.panel.win .btn.ad');
  await page.waitForTimeout(1500);
  console.log('gold after x2', await G(() => window.__game.s.gold));
  await click('.panel.win .btn.big.green');
  await page.waitForTimeout(600);
  await page.mouse.click(200, 300);
  await page.waitForTimeout(600);
  // уровень 2: мажем все снаряды
  await waitState(['aim']);
  console.log('L2 start', await G(() => JSON.stringify({ state: window.__game.state, li: window.__game.li, modal: window.__game.ui.modalOpen })));
  for (let i = 0; i < 5; i++) { const st = await G(() => window.__game.state); if (st !== 'aim') break; await shootEnemy('miss'); }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out + '6lose.png' });
  console.log('L2 state', await G(() => window.__game.state));
  await click('.panel.lose .btn.ad');
  await page.waitForTimeout(1500);
  console.log('after extra shot', await G(() => JSON.stringify({ state: window.__game.state, ammo: window.__game.ammo, sel: window.__game.sel })));
  await page.screenshot({ path: out + '7extra.png' });
  await shootEnemy();
  await page.waitForTimeout(1000);
  console.log('after extra fire', await G(() => window.__game.state));
  await G(() => { const g = window.__game; g.ui.closeModal(); g.toMenu(); g.s.gold = 5000; g.ui.showMenu(); });
  await click('.menu .row .btn:nth-child(1)');
  await page.waitForTimeout(500);
  await page.screenshot({ path: out + '8shop.png' });
  await click('.skin:nth-child(2) .btn');
  console.log('skin', await G(() => JSON.stringify({ skin: window.__game.s.skin, gold: window.__game.s.gold })));
  await click('.panel .x');
  await click('.menu .row .btn:nth-child(2)');
  await page.waitForTimeout(800);
  await page.screenshot({ path: out + '9lb.png' });
  await click('.panel .x');
  await click('.menu .row .btn:nth-child(3)');
  await page.waitForTimeout(400);
  await page.screenshot({ path: out + '10settings.png' });
  await click('.panel .x');
  // пауза в уровне
  await G(() => window.__game.startLevel(1));
  await page.waitForTimeout(500);
  await page.mouse.click(200, 300);
  await page.waitForTimeout(600);
  await click('.hint .btn');
  await click('.hud .tl .btn');
  await page.screenshot({ path: out + '11pause.png' });
  console.log('paused', await G(() => window.__game.paused));
  await click('.panel.pause .btn.big.green');
  console.log('resumed', await G(() => !window.__game.paused));
  console.log('calls', await G(() => JSON.stringify(window.__calls.reduce((m, c) => { const k = c.split(' ')[0]; m[k] = (m[k] || 0) + 1; return m; }, {}))));
  console.log('setScore', await G(() => window.__calls.filter(c => c.startsWith('setScore')).join(' | ')));
}});
done(errs);
