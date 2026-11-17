// 1000 уровней: вход в 3-й маршрут, финал города, последний уровень, альбом. MOCK_SDK=1 node test/flow3.mjs
import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/shots/';
const errs = await run({ w: 1280, h: 720, steps: async (page) => {
  const ev = (f, a) => page.evaluate(f, a);
  const L = (s) => console.log(s);
  const solveAll = () => ev(() => { const A = window.__game; for (let k = 0; k < 500 && !A.finished; k++) { const g = A.game; if (!g.canMove()) { A.applyBoost('shuffle'); continue; } const h = g.hint(); A.elapsed += 3; A.pair(h.pair[0], h.pair[1]); } return { left: A.game.left, finished: A.finished }; });
  await ev(() => { const d = window.__save.data; d.tut = { first: 1, coin: 1, lock: 1, hidden: 1, gold: 1 }; for (let i = 0; i < 200; i++) d.levels[i] = { stars: 3, time: 30 }; window.__game.toMenu(); });
  L('menu: ' + (await ev(() => document.querySelector('[data-a="journey"] .bs').textContent)));
  await page.screenshot({ path: out + 'r_menu.png' });
  await ev(() => window.__game.ui.act('journey'));
  await page.waitForTimeout(300);
  L('journey: ' + (await ev(() => document.querySelector('.ctitle').textContent.replace(/\s+/g, ' ').trim())));
  await page.screenshot({ path: out + 'r_journey.png' });
  await ev(() => document.querySelector('.lvl.cur').click());
  await page.waitForTimeout(500);
  L('route intro: ' + (await ev(() => document.querySelector('.modal.intro .itxt').textContent)));
  await page.screenshot({ path: out + 'r_intro.png' });
  await ev(() => document.querySelector('.modal [data-x]').click());
  await page.waitForTimeout(1200);
  L('201 solve: ' + JSON.stringify(await solveAll()));
  await page.waitForTimeout(1500);
  // финал Москвы 3-го маршрута
  await ev(() => { const d = window.__save.data; for (let i = 200; i < 209; i++) d.levels[i] = { stars: 2, time: 60 }; window.__game.ui.closeModal(); window.__game.startLevel(209); });
  await page.waitForTimeout(800);
  L('210 solve: ' + JSON.stringify(await solveAll()));
  await page.waitForTimeout(3600);
  L('modals: ' + (await ev(() => [...document.querySelectorAll('.modal')].map((m) => m.className + ':' + (m.querySelector('.mhead b')||{}).textContent).join(' | '))));
  L('postcard: ' + (await ev(() => (document.querySelector('.modal.pcm .mhead b')||{}).textContent)));
  await page.screenshot({ path: out + 'r_pc.png' });
  // последний, 1000-й
  await ev(() => { const d = window.__save.data; for (let i = 0; i < 999; i++) d.levels[i] = d.levels[i] || { stars: 1, time: 90 }; window.__game.ui.closeModal(); window.__game.startLevel(999); });
  await page.waitForTimeout(1000);
  L('1000 solve: ' + JSON.stringify(await solveAll()));
  await page.waitForTimeout(3600);
  await ev(() => { const x = document.querySelector('.modal.pcm [data-x]'); x && x.click(); });
  await page.waitForTimeout(500);
  L('last result text: ' + (await ev(() => (document.querySelector('.modal .itxt') || {}).textContent)));
  await page.screenshot({ path: out + 'r_last.png' });
  await ev(() => { window.__game.ui.closeModal(); window.__game.toMenu(); window.__game.ui.album(); });
  await page.waitForTimeout(800);
  L('album: ' + (await ev(() => document.querySelector('.albumm .itxt').textContent)) + ' sections=' + (await ev(() => document.querySelectorAll('.albumm .sect').length)));
  await ev(() => document.querySelector('.albumm .mbody').scrollTop = 1500);
  await page.screenshot({ path: out + 'r_album.png' });
  await ev(() => { window.__game.ui.closeModal(); window.__game.ui.achievements(); });
  await page.waitForTimeout(300);
  L('ach ready: ' + (await ev(() => document.querySelectorAll('[data-claim]').length)) + ' save size KB: ' + (await ev(() => (JSON.stringify(window.__save.data).length / 1024).toFixed(1))));
} });
done(errs);
