// Подсказки ходов: авто (первые коны) / выключены после, настройки; скорость ботов
import { run, done } from './shot.mjs';
const O = '/tmp/claude-0/-home-claude/f598f527-a7c2-5e7d-86ce-d82e94cc8820/scratchpad/h_';
const errs = await run({ w: 1280, h: 720, locale: 'ru-RU', debug: { seed: 7 }, steps: async (p) => {
  for (const rounds of [0, 5]) {
    await p.evaluate((rounds) => { const d = window.__save.data; d.stats.rounds = rounds; d.seen = { first: 1, choice: 1 }; window.__game.newMatch({ mode: 'goat', n: 4, target: 51, diff: 1 }); }, rounds);
    const t0 = Date.now();
    let bots = 0;
    await p.waitForFunction(() => { const g = window.__game; return g.M && g.M.r && g.M.r.turn === 0 && !g.busy && g.M.r.board && g.M.r.left; }, null, { timeout: 120000 }).catch(() => {});
    await p.waitForTimeout(1500);
    const info = await p.evaluate(() => { const g = window.__game; return { hints: g.hintsOn, raised: g.M.r.hands[0].map((id) => +g.tiles[id].position.y.toFixed(2)), moves: g._dbgMoves ? g._dbgMoves() : null }; });
    console.log('rounds', rounds, JSON.stringify(info), 'wait', Date.now() - t0);
    await p.screenshot({ path: O + 'r' + rounds + '.png' });
    await p.evaluate(() => window.__game.leaveMatch());
    await p.waitForTimeout(800);
  }
  await p.evaluate(() => { window.__save.data.cur = null; document.querySelectorAll('[data-x]').forEach((b) => b.click()); });
  await p.click('[data-a="settings"]').catch(async () => p.evaluate(() => window.__game.ui.settings()));
  await p.waitForTimeout(700);
  await p.screenshot({ path: O + 'set.png' });
}});
done(errs);
