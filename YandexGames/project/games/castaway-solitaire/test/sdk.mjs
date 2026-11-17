import { run, done } from './shot.mjs';
const O = '/tmp/claude-0/';
const errs = await run({ w: 1280, h: 720, locale: 'en-US', pre: () => {
  window.__MOCK_LANG = 'en';
  window.__MOCK_CATALOG = [{ id: 'coins_1000', title: '1000 coins', price: 19 }, { id: 'coins_3500', title: '3500 coins', price: 59 }, { id: 'coins_10000', title: '10000 coins', price: 149 }, { id: 'disable_ads', title: 'No ads', price: 99 }];
  localStorage.setItem('castaway_solitaire_v1', JSON.stringify({ plays: 5, seen: { wild: 1, coin: 1 } }));
}, steps: async (p) => {
  const coins = () => p.evaluate(() => window.__game.constructor && JSON.parse(localStorage.getItem('castaway_solitaire_v1') || '{}').coins);
  await p.screenshot({ path: O + 'e_home.png' });
  await p.click('[data-a="daily"]'); await p.waitForTimeout(600);
  await p.screenshot({ path: O + 'e_daily.png' });
  await p.click('[data-a="take"]'); await p.waitForTimeout(800);
  await p.click('[data-a="shop"]'); await p.waitForTimeout(800);
  await p.screenshot({ path: O + 'e_shop.png' });
  const c0 = await coins();
  await p.click('.iap-buy[data-id="coins_1000"]'); await p.waitForTimeout(1200);
  const c1 = await coins();
  await p.click('.iap-buy[data-id="disable_ads"]'); await p.waitForTimeout(1200);
  await p.click('[data-a="adcoins"]'); await p.waitForTimeout(1200);
  const c2 = await coins();
  console.log('COINS', c0, c1, c2, 'noAds', await p.evaluate(() => JSON.parse(localStorage.getItem('castaway_solitaire_v1')).noAds));
  await p.screenshot({ path: O + 'e_shop2.png' });
  await p.evaluate(() => { const ui = window.__game.ui; ui.closeAll ? ui.closeAll() : document.querySelectorAll('[data-x]').forEach((b) => b.click()); });
  await p.waitForTimeout(500);
  await p.click('[data-a="lb"]'); await p.waitForTimeout(1200);
  await p.screenshot({ path: O + 'e_lb.png' });
  await p.evaluate(() => document.querySelectorAll('[data-x]').forEach((b) => b.click()));
  await p.click('[data-a="settings"]'); await p.waitForTimeout(600);
  await p.screenshot({ path: O + 'e_set.png' });
  await p.evaluate(() => document.querySelectorAll('[data-x]').forEach((b) => b.click()));
  await p.evaluate(() => window.__game.playLevel(4));
  await p.waitForTimeout(1500);
  if (await p.$('[data-a="ok"]')) { await p.screenshot({ path: O + 'e_mech.png' }); await p.click('[data-a="ok"]'); }
  await p.waitForFunction(() => { const t = window.__game.table; return t.g && t.busy === 0 && t.sprites.some((s) => s.face); }, null, { timeout: 60000 });
  // бот: играет, иначе тянет
  for (let k = 0; k < 3000; k++) {
    const r = await p.evaluate(() => { const tb = window.__game.table; if (window.__game.ui.modalOpen) return 'm'; if (tb.busy) return 'b'; for (let i = 0; i < tb.g.cards.length; i++) if (tb.g.playable(i)) { tb.play(i); return 'p'; } if (tb.g.stock.length) { tb.draw(); return 'd'; } return 'e'; });
    if (r === 'm') break;
    if (k === 6) await p.screenshot({ path: O + 'e_lvl.png' });
    await p.waitForTimeout(r === 'b' ? 80 : 150);
  }
  await p.waitForTimeout(2500);
  await p.screenshot({ path: O + 'e_end.png' });
  const x2 = await p.$('[data-a="x2"]');
  if (x2) { await x2.click(); await p.waitForTimeout(1200); await p.click('[data-a="next"]'); }
  else await p.click('[data-a="retry"]');
  await p.waitForTimeout(2000);
  console.log('CALLS', await p.evaluate(() => window.__calls.join(', ')));
}});
done(errs);
