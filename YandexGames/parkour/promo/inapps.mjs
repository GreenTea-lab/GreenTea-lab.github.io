// Иконки покупок 256x256 и CSV для групповой загрузки в консоль. node promo/inapps.mjs
import { chromium } from 'playwright';
import fs from 'fs';
const coin = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="6" rx="30" ry="30" fill="#c8901a"/><circle r="30" fill="#ffc82a" stroke="#c8901a" stroke-width="4"/><circle r="20" fill="none" stroke="#ffe27a" stroke-width="4"/><rect x="-5" y="-14" width="10" height="28" rx="4" fill="#c8901a"/></g>`;
const pile = (pts) => pts.map((p) => coin(...p)).join('');
const bag = `<path d="M70 110c-20 30-26 70-10 92 14 18 122 18 136 0 16-22 10-62-10-92z" fill="#c8843a" stroke="#7a4a1a" stroke-width="6" stroke-linejoin="round"/><path d="M92 112l-14-36c20 8 80 8 100 0l-14 36z" fill="#e8a04a" stroke="#7a4a1a" stroke-width="6" stroke-linejoin="round"/><rect x="86" y="104" width="84" height="14" rx="7" fill="#ffd23a" stroke="#7a4a1a" stroke-width="5"/>${coin(128, 160, 1.1)}`;
const chest = `${pile([[84, 82, 0.8], [172, 80, 0.8], [128, 66, 0.9]])}<rect x="44" y="120" width="168" height="96" rx="12" fill="#c8843a" stroke="#7a4a1a" stroke-width="6"/><path d="M44 120c0-36 30-56 84-56s84 20 84 56z" fill="#e8a04a" stroke="#7a4a1a" stroke-width="6"/><rect x="112" y="110" width="32" height="40" rx="6" fill="#ffd23a" stroke="#7a4a1a" stroke-width="5"/>`;
const noads = `<rect x="44" y="70" width="168" height="116" rx="20" fill="#3a8ae0"/><path d="M110 100v56l46-28z" fill="#fff"/><circle cx="128" cy="128" r="96" fill="none" stroke="#ff5a6a" stroke-width="20"/><path d="M60 196L196 60" stroke="#ff5a6a" stroke-width="20" stroke-linecap="round"/>`;
export const ITEMS = [
  { id: 'coins_500', price: 19, ru: 'Горсть монет', en: 'Handful of coins', dru: '500 монет на новые скины.', den: '500 coins for new skins.', svg: pile([[96, 160, 1], [160, 160, 1], [128, 110, 1.05]]), grant: '+500 монет' },
  { id: 'coins_2000', price: 59, ru: 'Мешок монет', en: 'Bag of coins', dru: '2000 монет на новые скины.', den: '2000 coins for new skins.', svg: bag, grant: '+2000 монет' },
  { id: 'coins_6000', price: 149, ru: 'Сундук монет', en: 'Chest of coins', dru: '6000 монет — хватит на самый дорогой скин.', den: '6000 coins — enough for the priciest skin.', svg: chest, grant: '+6000 монет' },
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
