// Иконки покупок 256x256 и CSV для групповой загрузки в консоль. node promo/inapps.mjs
import { chromium } from 'playwright';
import fs from 'fs';
const coins = (n) =>
  [[128, 160], [78, 180], [178, 180], [128, 104], [72, 126], [184, 126]]
    .slice(0, n)
    .reverse()
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="46" fill="#f6c94a" stroke="#b07d12" stroke-width="7"/><circle cx="${x}" cy="${y}" r="30" fill="none" stroke="#d9a326" stroke-width="5"/><path d="M${x - 20} ${y + 1}c8-11 23-13 35-3l9-6.5v18l-9-6.5c-12 10-27 8-35-2z" fill="#a8740c"/>`)
    .join('');
const noads = `<rect x="44" y="70" width="168" height="116" rx="20" fill="#3a8fc8"/><path d="M110 100v56l46-28z" fill="#fff"/><circle cx="128" cy="128" r="96" fill="none" stroke="#e5483a" stroke-width="20"/><path d="M60 196L196 60" stroke="#e5483a" stroke-width="20" stroke-linecap="round"/>`;
export const ITEMS = [
  { id: 'coins_1000', price: 19, ru: '1 000 монет', en: '1,000 coins', dru: 'Монеты на снасти, наживку и новые водоёмы.', den: 'Coins for tackle, bait and new fishing spots.', svg: coins(2), grant: 'монеты +1000' },
  { id: 'coins_5000', price: 59, ru: '5 000 монет', en: '5,000 coins', dru: 'Мешок монет: хватит на новую удочку и катушку.', den: 'A bag of coins: enough for a new rod and reel.', svg: coins(4), grant: 'монеты +5000' },
  { id: 'coins_15000', price: 149, ru: '15 000 монет', en: '15,000 coins', dru: 'Сундук монет на золотые снасти и дальние водоёмы.', den: 'A chest of coins for golden tackle and distant spots.', svg: coins(6), grant: 'монеты +15000' },
  { id: 'disable_ads', price: 99, ru: 'Без рекламы', en: 'No ads', dru: 'Навсегда отключает полноэкранную рекламу. Реклама за награду остаётся по желанию.', den: 'Permanently removes full-screen ads. Optional rewarded ads stay available.', svg: noads, grant: 'постоянная, не консумируется' },
];
if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = 'release/inapps';
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
  for (const it of ITEMS) {
    await page.setContent(`<html><body style="margin:0;width:256px;height:256px;background:radial-gradient(circle at 50% 35%,#e6f6ff,#6fb0d0)"><svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">${it.svg}</svg></body></html>`);
    await page.screenshot({ path: `${dir}/${it.id}.png` });
  }
  await browser.close();
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  fs.writeFileSync(`${dir}/inapps.csv`, ['id,price,title_ru,title_en', ...ITEMS.map((it) => [it.id, it.price, q(it.ru), q(it.en)].join(','))].join('\n') + '\n');
  console.log('inapps:', ITEMS.length, 'icons + csv');
}
