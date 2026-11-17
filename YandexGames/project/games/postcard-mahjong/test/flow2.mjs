// Новое: старое сохранение, задача дня и кубок, награды, золотой маршрут, классика, «собрать все». MOCK_SDK=1 node test/flow2.mjs
import { run, done } from './shot.mjs';
const out = '/tmp/claude-0/shots/';
// сохранение прошлой версии (без новых полей): 100 уровней пройдены
const old = { v: 1, ts: 1, coins: 777, best: 1500, games: 3, levels: Object.fromEntries(Array.from({ length: 100 }, (_, i) => [i, { stars: i % 3 + 1, time: 40 }])), boosts: { hint: 1, undo: 0, shuffle: 2 }, style: 'jade', styles: ['ivory', 'jade'], settings: { musicVol: 0.5, sfxVol: 0.8, dimBlocked: true }, noAds: false, daily: { day: '', streak: 0 }, endless: null, tut: { first: 1, coin: 1, lock: 1, hidden: 1 }, freeAt: 0 };
const errs = await run({
  w: 1280, h: 720,
  pre: `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('postcard_mahjong_save_v1', ${JSON.stringify(JSON.stringify(old))}); }`,
  steps: async (page) => {
    const ev = (f, a) => page.evaluate(f, a);
    const L = (s) => console.log(s);
    const solveAll = () => ev(() => {
      const A = window.__game;
      for (let k = 0; k < 400 && !A.finished; k++) {
        const g = A.game;
        if (!g.canMove()) { A.applyBoost('shuffle'); continue; }
        const h = g.hint();
        A.elapsed += 3; // как будто человек думает пару секунд
        const c1 = A.view.tileCenter(h.pair[0]), c2 = A.view.tileCenter(h.pair[1]);
        A.tap(c1.x, c1.y); A.tap(c2.x, c2.y);
      }
      return { left: A.game.left, finished: A.finished };
    });
    const d0 = await ev(() => { const d = window.__save.data; return { coins: d.coins, style: d.style, levels: Object.keys(d.levels).length, faces: d.faces, stats: d.stats, timer: d.settings.showTimer }; });
    L('old save loaded: ' + JSON.stringify(d0));
    L('menu journey: ' + (await ev(() => document.querySelector('[data-a="journey"] .bs').textContent)));
    L('ach ready badge: ' + (await ev(() => document.querySelector('.achb .badge').textContent)));
    await page.screenshot({ path: out + 'g_menu_old.png' });
    // золотой маршрут: первый уровень показывает вступление
    await ev(() => window.__game.ui.act('journey'));
    await page.waitForTimeout(300);
    L('journey stage: ' + (await ev(() => document.querySelector('.ctitle').textContent.replace(/\s+/g, ' ').trim())));
    await ev(() => document.querySelector('.lvl.cur').click());
    await page.waitForTimeout(500);
    L('gold intro: ' + (await ev(() => !!document.querySelector('.modal.intro'))));
    await page.screenshot({ path: out + 'g_goldintro.png' });
    await ev(() => document.querySelector('.modal [data-x]').click());
    await page.waitForTimeout(1500);
    L('level 101 solve: ' + JSON.stringify(await solveAll()));
    await page.waitForTimeout(1200);
    L('result: ' + (await ev(() => document.querySelector('.modal .mhead b').textContent)) + ' gameplay=' + (await ev(() => window.__calls.filter((c) => c.startsWith('gp.')).slice(-1)[0])));
    // золотая открытка на 110
    await ev(() => { const d = window.__save.data; for (let i = 100; i < 109; i++) d.levels[i] = { stars: 3, time: 50 }; window.__game.ui.closeModal(); window.__game.startLevel(109); });
    await page.waitForTimeout(800);
    L('level 110 solve: ' + JSON.stringify(await solveAll()));
    await page.waitForTimeout(3600);
    L('gold postcard modal: ' + (await ev(() => !!document.querySelector('.modal.pcm'))) + ' fact: ' + (await ev(() => (document.querySelector('.fact') || {}).textContent)));
    await page.screenshot({ path: out + 'g_goldcard.png' });
    // задача дня через меню и календарь
    await ev(() => { window.__game.ui.closeModal(); window.__game.toMenu(); });
    await page.mouse.click(...(await ev(() => { const r = document.querySelector('[data-a="daily"]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })));
    await page.waitForTimeout(400);
    L('daily modal: ' + (await ev(() => !!document.querySelector('.modal.dcm'))) + ' days clickable=' + (await ev(() => document.querySelectorAll('.cday[data-day]').length)));
    await ev(() => document.querySelector('.modal [data-go]').click());
    await page.waitForTimeout(1500);
    const key = await ev(() => window.__game.L.key);
    const lay1 = await ev(() => window.__game.L.lay + '/' + window.__game.game.tiles.map((t) => t.f).join(',').length);
    L('daily key=' + key + ' mode=' + (await ev(() => window.__game.mode)) + ' hud=' + (await ev(() => document.querySelector('.hl').textContent.trim())));
    // та же раскладка у «другого игрока»: повторная генерация с тем же днём
    const same = await ev(() => { const A = window.__game; const f1 = A.game.tiles.map((t) => t.f).join(); A.startDaily(A.L.key); return f1 === A.game.tiles.map((t) => t.f).join(); });
    L('daily deterministic: ' + same);
    // включаем «собрать все» — нажимаем мышью
    await ev(() => { const A = window.__game; for (let k = 0; k < 300 && !A.canAuto() && !A.finished; k++) { const g = A.game; if (!g.canMove()) { A.applyBoost('shuffle'); continue; } const h = g.hint(); A.elapsed += 3; A.pair(h.pair[0], h.pair[1]); } });
    await page.waitForTimeout(500);
    const ab = await ev(() => { const b = document.querySelector('.autob'); if (!b || b.style.display === 'none') return null; const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    L('auto button shown: ' + !!ab);
    await page.screenshot({ path: out + 'g_auto.png' });
    if (ab) await page.mouse.click(...ab);
    await page.waitForTimeout(4500);
    L('daily finished: ' + (await ev(() => window.__game.finished)) + ' result=' + (await ev(() => !!document.querySelector('.modal.result'))) + ' dc=' + JSON.stringify(await ev(() => window.__save.data.dc)) + ' stats.daily=' + (await ev(() => window.__save.data.stats.daily)));
    await page.screenshot({ path: out + 'g_dailyres.png' });
    // кубок: 7 решённых дней в месяце
    const cup = await ev(() => {
      const A = window.__game, d = window.__save.data, ym = A.L.key.slice(0, 7);
      for (let k = 1; k <= 6; k++) d.dc[`${ym}-${String(k + 20).padStart(2, '0')}`] = 100;
      delete d.dc[A.L.key]; d.dcCup = {}; d.stats.daily = 6;
      const c0 = d.coins;
      A.ui.closeModal(); A.startDaily(A.L.key); A.finished = true; A.finishDaily();
      return { cup: d.dcCup[ym], coins: d.coins - c0 };
    });
    L('cup after 7 days: ' + JSON.stringify(cup) + ' (ожидается 1 и 50+100)');
    await page.waitForTimeout(500);
    await page.screenshot({ path: out + 'g_cup.png' });
    // награды: забрать первую
    await ev(() => { window.__game.ui.closeModal(); window.__game.toMenu(); window.__game.ui.achievements(); });
    await page.waitForTimeout(300);
    const before = await ev(() => window.__save.data.coins);
    await ev(() => document.querySelector('[data-claim]').click());
    await page.waitForTimeout(300);
    L('claim: coins +' + ((await ev(() => window.__save.data.coins)) - before) + ' claimed=' + JSON.stringify(await ev(() => window.__save.data.ach)));
    await ev(() => document.querySelector('[data-claim]') && document.querySelector('[data-claim]').click());
    await page.screenshot({ path: out + 'g_ach.png' });
    // классика сохраняется и переживает перезагрузку
    await ev(() => { window.__game.ui.closeModal(); window.__game.ui.styles(); document.querySelector('[data-face="classic"]').click(); });
    await page.waitForTimeout(200);
    await page.reload();
    await page.waitForFunction(() => window.__game && window.__game.ui && !document.getElementById('loader'));
    L('after reload: faces=' + (await ev(() => window.__save.data.faces)) + ' set=' + (await ev(() => window.__lib.tiles.getFaceSet())) + ' ach=' + JSON.stringify(await ev(() => window.__save.data.ach)) + ' daily=' + (await ev(() => window.__save.data.stats.daily)));
    // настройки: таймер выкл, подсветка пар вкл
    await ev(() => { window.__game.ui.settings(); document.querySelector('[data-tg="showTimer"]').click(); document.querySelector('[data-tg="matchGlow"]').click(); window.__game.ui.closeModal(); window.__game.startLevel(3); });
    await page.waitForTimeout(1500);
    await ev(() => { const A = window.__game, g = A.game; const f = {}; let pick = null; for (const t of g.tiles) if (g.selectable(t.id)) { if (f[t.f] !== undefined) { pick = f[t.f]; break; } f[t.f] = t.id; } const c = A.view.tileCenter(pick); A.tap(c.x, c.y); });
    await page.waitForTimeout(300);
    L('timer hidden: ' + (await ev(() => getComputedStyle(document.querySelector('.htime')).display === 'none')) + ' glow=' + (await ev(() => window.__game.view.matchGlow)));
    await page.screenshot({ path: out + 'g_glow.png' });
  },
});
done(errs);
