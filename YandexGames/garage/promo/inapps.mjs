// Иконки покупок 256x256 и CSV для групповой загрузки в консоль. node promo/inapps.mjs
import { chromium } from 'playwright';
import fs from 'fs';
// пачка купюр в перспективе: x, y — центр, s — масштаб
const bill = (x, y, s, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><rect x="-46" y="-6" width="92" height="30" rx="5" fill="#3a8a4a"/><rect x="-46" y="-14" width="92" height="30" rx="5" fill="#7ad08a" stroke="#2f7a3e" stroke-width="3"/><rect x="-38" y="-8" width="76" height="18" rx="3" fill="none" stroke="#3f9a52" stroke-width="2.5"/><circle cy="1" r="7" fill="#3f9a52"/><rect x="-8" y="-15" width="16" height="32" fill="#f5d24a" stroke="#c8901a" stroke-width="2"/></g>`;
const coin = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="5" rx="22" ry="22" fill="#c8901a"/><circle r="22" fill="#ffc82a" stroke="#c8901a" stroke-width="3"/><circle r="14" fill="none" stroke="#ffe27a" stroke-width="3"/></g>`;
const small = `${bill(128, 162, 1.35, -6)}${bill(128, 132, 1.35, 4)}${coin(186, 92, 1)}`;
const case_ = `<rect x="58" y="76" width="140" height="30" rx="10" fill="none" stroke="#5a3418" stroke-width="12"/><rect x="34" y="96" width="188" height="118" rx="16" fill="#8a5428" stroke="#5a3418" stroke-width="6"/><rect x="34" y="138" width="188" height="10" fill="#5a3418"/><rect x="112" y="128" width="32" height="30" rx="5" fill="#ffc82a" stroke="#c8901a" stroke-width="4"/>${bill(96, 92, 0.9, -12)}${bill(162, 88, 0.9, 10)}`;
const safe = `<rect x="40" y="56" width="176" height="164" rx="14" fill="#5a6474" stroke="#2c323c" stroke-width="6"/><rect x="56" y="72" width="144" height="132" rx="8" fill="#3a404c"/>${bill(128, 176, 1.25)}${bill(128, 148, 1.25)}${bill(128, 120, 1.25)}${bill(128, 92, 1.25)}${coin(70, 206, 0.9)}${coin(186, 208, 0.9)}${coin(128, 214, 0.9)}`;
const noads = `<rect x="44" y="70" width="168" height="116" rx="20" fill="#ff8a1a"/><path d="M110 100v56l46-28z" fill="#fff"/><circle cx="128" cy="128" r="96" fill="none" stroke="#ff4a5a" stroke-width="20"/><path d="M60 196L196 60" stroke="#ff4a5a" stroke-width="20" stroke-linecap="round"/>`;
export const ITEMS = [
  { id: 'cash_small', price: 19, ru: 'Пачка денег', en: 'Wad of cash', dru: 'Деньги на ремонт и покупку машин. Сумма растёт вместе с вашим гаражом.', den: 'Cash for repairs and buying cars. The amount grows with your garage.', svg: small },
  { id: 'cash_medium', price: 59, ru: 'Чемодан денег', en: 'Case of cash', dru: 'В 4 раза больше пачки. Сумма растёт вместе с вашим гаражом.', den: '4 times the wad. The amount grows with your garage.', svg: case_ },
  { id: 'cash_large', price: 149, ru: 'Сейф денег', en: 'Safe of cash', dru: 'В 12 раз больше пачки — хватит на машину мечты.', den: '12 times the wad — enough for a dream car.', svg: safe },
  { id: 'disable_ads', price: 99, ru: 'Без рекламы', en: 'No ads', dru: 'Навсегда отключает полноэкранную рекламу. Реклама за награду остаётся по желанию.', den: 'Permanently removes full-screen ads. Optional rewarded ads stay available.', svg: noads },
];
if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = 'release/inapps';
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
  for (const it of ITEMS) {
    await page.setContent(`<html><body style="margin:0;width:256px;height:256px;background:radial-gradient(circle at 50% 35%,#3a3f4c,#16181e)"><svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">${it.svg}</svg></body></html>`);
    await page.screenshot({ path: `${dir}/${it.id}.png` });
  }
  await browser.close();
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  fs.writeFileSync(`${dir}/inapps.csv`, ['id,price,title_ru,title_en,description_ru,description_en', ...ITEMS.map((it) => [it.id, it.price, q(it.ru), q(it.en), q(it.dru), q(it.den)].join(','))].join('\n') + '\n');
  console.log('inapps:', ITEMS.length, 'icons + csv');
}
