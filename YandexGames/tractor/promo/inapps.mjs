// Иконки покупок 256x256 и CSV для групповой загрузки в консоль. node promo/inapps.mjs
import { chromium } from 'playwright';
import fs from 'fs';
const NOADS_RU = 'Навсегда отключает полноэкранную рекламу. Реклама за награду остаётся по желанию.';
const NOADS_EN = 'Permanently removes full-screen ads. Optional rewarded ads stay available.';
const coins = (n) =>
  [[128, 156], [78, 176], [178, 176], [128, 100], [72, 122], [184, 122]]
    .slice(0, n)
    .reverse()
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="46" fill="#f6c94a" stroke="#b07d12" stroke-width="7"/><circle cx="${x}" cy="${y}" r="30" fill="none" stroke="#d9a326" stroke-width="5"/>`)
    .join('');
const noads = `<rect x="44" y="70" width="168" height="116" rx="20" fill="#3f9d4a"/><path d="M110 100v56l46-28z" fill="#fff"/><circle cx="128" cy="128" r="96" fill="none" stroke="#c3382d" stroke-width="20"/><path d="M60 196L196 60" stroke="#c3382d" stroke-width="20" stroke-linecap="round"/>`;
export const ITEMS = [
  { id: 'coins_2000', price: 19, ru: '2 000 монет', en: '2,000 coins', dru: 'Монеты на улучшения, поля и тракторы.', den: 'Coins for upgrades, fields and tractors.', svg: coins(2), grant: 'монеты +2000' },
  { id: 'coins_8000', price: 59, ru: '8 000 монет', en: '8,000 coins', dru: 'Мешок монет: хватит на новое поле и мотор.', den: 'A bag of coins: enough for a new field and an engine.', svg: coins(4), grant: 'монеты +8000' },
  { id: 'coins_25000', price: 149, ru: '25 000 монет', en: '25,000 coins', dru: 'Сундук монет на золотой трактор и большую ферму.', den: 'A chest of coins for the golden tractor and a big farm.', svg: coins(6), grant: 'монеты +25000' },
  { id: 'disable_ads', price: 99, ru: 'Без рекламы', en: 'No ads', dru: 'Навсегда отключает полноэкранную рекламу. Реклама за награду остаётся по желанию.', den: 'Permanently removes full-screen ads. Optional rewarded ads stay available.', svg: noads, grant: 'постоянная, не консумируется' },
];
if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = 'release/inapps';
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
  for (const it of ITEMS) {
    await page.setContent(`<html><body style="margin:0;width:256px;height:256px;background:radial-gradient(circle at 50% 35%,#d9f2ff,#8fd16a)"><svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">${it.svg}</svg></body></html>`);
    await page.screenshot({ path: `${dir}/${it.id}.png` });
  }
  await browser.close();
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  fs.writeFileSync(`${dir}/inapps.csv`, ['id,price,title_ru,title_en', ...ITEMS.map((it) => [it.id, it.price, q(it.ru), q(it.en)].join(','))].join('\n') + '\n');
  console.log('inapps:', ITEMS.length, 'icons + csv');
}
