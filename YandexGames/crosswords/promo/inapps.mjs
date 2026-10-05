// Иконки покупок 256x256 и CSV для групповой загрузки в консоль. node promo/inapps.mjs
import { chromium } from 'playwright';
import fs from 'fs';
const NOADS_RU = 'Навсегда отключает полноэкранную рекламу между кроссвордами. Реклама за награду остаётся по желанию.';
const NOADS_EN = 'Permanently removes full-screen ads between crosswords. Optional rewarded ads stay available.';
const coins = (n) =>
  [[128, 156], [78, 176], [178, 176], [128, 100], [72, 122], [184, 122]]
    .slice(0, n)
    .reverse()
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="46" fill="#f1c232" stroke="#a8740c" stroke-width="7"/><circle cx="${x}" cy="${y}" r="28" fill="none" stroke="#a8740c" stroke-width="5"/>`)
    .join('');
const noads = `<rect x="44" y="70" width="168" height="116" rx="20" fill="#2c5a96"/><path d="M110 100v56l46-28z" fill="#fff"/><circle cx="128" cy="128" r="96" fill="none" stroke="#c3382d" stroke-width="20"/><path d="M60 196L196 60" stroke="#c3382d" stroke-width="20" stroke-linecap="round"/>`;
export const ITEMS = [
  { id: 'coins_300', price: 19, ru: '300 монет', en: '300 coins', dru: 'Монеты для подсказок: открыть букву или целое слово.', den: 'Coins for hints: reveal a letter or a whole word.', svg: coins(2), grant: 'монеты +300' },
  { id: 'coins_1000', price: 59, ru: '1 000 монет', en: '1,000 coins', dru: 'Мешочек монет: хватит на много подсказок.', den: 'A pouch of coins for plenty of hints.', svg: coins(4), grant: 'монеты +1000' },
  { id: 'coins_3000', price: 149, ru: '3 000 монет', en: '3,000 coins', dru: 'Сундучок монет для самых трудных кроссвордов.', den: 'A chest of coins for the toughest crosswords.', svg: coins(6), grant: 'монеты +3000' },
  { id: 'disable_ads', price: 99, ru: 'Без рекламы', en: 'No ads', dru: NOADS_RU, den: NOADS_EN, svg: noads, grant: 'постоянная, не консумируется' },
];
if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = 'release/inapps';
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
  for (const it of ITEMS) {
    await page.setContent(`<html><body style="margin:0;width:256px;height:256px;background:radial-gradient(circle at 50% 40%,#fbf6ec,#e2d3b5)"><svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">${it.svg}</svg></body></html>`);
    await page.screenshot({ path: `${dir}/${it.id}.png` });
  }
  await browser.close();
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  fs.writeFileSync(`${dir}/inapps.csv`, ['id,price,title_ru,title_en', ...ITEMS.map((it) => [it.id, it.price, q(it.ru), q(it.en)].join(','))].join('\n') + '\n');
  console.log('inapps:', ITEMS.length, 'icons + csv');
}
