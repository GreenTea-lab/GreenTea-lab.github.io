// Иконки покупок 256x256 и CSV для групповой загрузки в консоль. node promo/inapps.mjs
import { chromium } from 'playwright';
import fs from 'fs';
const shell = (x, y, s, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M-30 10C-30-14-16-32 0-32S30-14 30 10c-8 8-18 12-30 12s-22-4-30-12z" fill="#ffb88a" stroke="#c8653a" stroke-width="4" stroke-linejoin="round"/><path d="M0 22V-30M0 22L-14-24M0 22l14-46M0 22L-24-6M0 22L24-6" fill="none" stroke="#c8653a" stroke-width="3"/></g>`;
const pile = (n) => [[128, 150, 1.3, 0], [80, 178, 1, -20], [176, 178, 1, 18], [104, 116, 0.9, -10], [154, 112, 0.9, 12], [128, 196, 1.1, 5]].slice(0, n).reverse().map((p) => shell(...p)).join('');
const chestSvg = `<rect x="44" y="120" width="168" height="96" rx="12" fill="#c8843a" stroke="#7a4a1a" stroke-width="6"/><path d="M44 120c0-36 30-56 84-56s84 20 84 56z" fill="#e8a04a" stroke="#7a4a1a" stroke-width="6"/><rect x="112" y="110" width="32" height="40" rx="6" fill="#ffd23a" stroke="#7a4a1a" stroke-width="5"/>${shell(90, 74, 0.7, -20)}${shell(166, 70, 0.7, 20)}`;
const noads = `<rect x="44" y="70" width="168" height="116" rx="20" fill="#3a8ae0"/><path d="M110 100v56l46-28z" fill="#fff"/><circle cx="128" cy="128" r="96" fill="none" stroke="#ff5a6a" stroke-width="20"/><path d="M60 196L196 60" stroke="#ff5a6a" stroke-width="20" stroke-linecap="round"/>`;
export const ITEMS = [
  { id: 'shells_2h', price: 19, ru: 'Мешочек ракушек', en: 'Bag of shells', dru: 'Ракушки: доход вашего городка за 2 часа.', den: 'Shells: your town income for 2 hours.', svg: pile(3), grant: 'доход за 2 ч (не меньше 5 000)' },
  { id: 'shells_8h', price: 59, ru: 'Сундук ракушек', en: 'Chest of shells', dru: 'Ракушки: доход вашего городка за 8 часов.', den: 'Shells: your town income for 8 hours.', svg: pile(6), grant: 'доход за 8 ч (не меньше 30 000)' },
  { id: 'shells_24h', price: 149, ru: 'Сокровищница', en: 'Treasure trove', dru: 'Ракушки: доход вашего городка за целые сутки.', den: 'Shells: your town income for a whole day.', svg: chestSvg, grant: 'доход за 24 ч (не меньше 150 000)' },
  { id: 'disable_ads', price: 99, ru: 'Без рекламы', en: 'No ads', dru: 'Навсегда отключает полноэкранную рекламу. Реклама за награду остаётся по желанию.', den: 'Permanently removes full-screen ads. Optional rewarded ads stay available.', svg: noads, grant: 'постоянная, не консумируется' },
];
if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = 'release/inapps';
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
  for (const it of ITEMS) {
    await page.setContent(`<html><body style="margin:0;width:256px;height:256px;background:radial-gradient(circle at 50% 35%,#e6f6ff,#5aa8e8)"><svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">${it.svg}</svg></body></html>`);
    await page.screenshot({ path: `${dir}/${it.id}.png` });
  }
  await browser.close();
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  fs.writeFileSync(`${dir}/inapps.csv`, ['id,price,title_ru,title_en', ...ITEMS.map((it) => [it.id, it.price, q(it.ru), q(it.en)].join(','))].join('\n') + '\n');
  console.log('inapps:', ITEMS.length, 'icons + csv');
}
