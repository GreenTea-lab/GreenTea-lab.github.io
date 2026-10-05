// Иконка, обложки и витринные баннеры: рисованная сцена (не скриншот), node promo/art.mjs
import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'release/promo/';
fs.mkdirSync(OUT, { recursive: true });
const font = (f) => `data:font/woff2;base64,${fs.readFileSync('static/' + f).toString('base64')}`;
const FONTS = `
@font-face{font-family:S;font-weight:700;src:url(${font('ptsans-cyr-700.woff2')});unicode-range:U+0400-045F}
@font-face{font-family:S;font-weight:700;src:url(${font('ptsans-lat-700.woff2')});unicode-range:U+0000-00FF}
@font-face{font-family:T;font-weight:700;src:url(${font('ptserif-cyr-700.woff2')});unicode-range:U+0400-045F}
@font-face{font-family:T;font-weight:700;src:url(${font('ptserif-lat-700.woff2')});unicode-range:U+0000-00FF}`;

// фрагмент кроссворда: слова [x, y, dir, word, filled]
const GRIDS = {
  ru: [
    [0, 2, 'a', 'КРОССВОРД', 9],
    [3, 0, 'd', 'ЛИСТ', 4],
    [5, 2, 'd', 'ВОЛГА', 5],
    [8, 2, 'd', 'ДОМ', 3],
    [1, 2, 'd', 'РЕПКА', 2],
    [0, 5, 'a', 'ВКУС', 0],
    [4, 6, 'a', 'ЛАПА', 2],
  ],
  en: [
    [0, 2, 'a', 'CROSSWORD', 9],
    [3, 0, 'd', 'BUS', 3],
    [5, 2, 'd', 'WATER', 5],
    [8, 1, 'd', 'ODD', 1],
    [1, 2, 'd', 'RIVER', 2],
    [0, 5, 'a', 'WEST', 0],
    [4, 6, 'a', 'TRIP', 2],
  ],
};

function grid(lang, cs, opts = {}) {
  const words = GRIDS[lang];
  const cells = new Map();
  for (const [x, y, d, w, f] of words)
    [...w].forEach((ch, i) => {
      const k = d === 'a' ? `${x + i},${y}` : `${x},${y + i}`;
      const c = cells.get(k) || { ch, show: false, hl: false, ok: false };
      if (i < f) c.show = true;
      if (w === words[0][3]) c.hl = true;
      if (f === w.length && w !== words[0][3]) c.ok = true;
      cells.set(k, c);
    });
  const starts = {};
  let n = 1;
  [...words].sort((a, b) => a[1] * 100 + a[0] - (b[1] * 100 + b[0])).forEach(([x, y]) => {
    if (!starts[`${x},${y}`]) starts[`${x},${y}`] = n++;
  });
  let s = '';
  for (const [k, c] of cells) {
    const [x, y] = k.split(',').map(Number);
    const fill = c.hl ? '#ffc838' : c.ok ? '#e2f2e5' : '#fffdf8';
    s += `<g transform="translate(${x * cs},${y * cs})"><rect x="0" y="0" width="${cs}" height="${cs}" fill="${fill}" stroke="#2a3246" stroke-width="${cs * 0.06}"/>`;
    if (starts[k] && !opts.noNum) s += `<text x="${cs * 0.1}" y="${cs * 0.3}" font-family="S" font-weight="700" font-size="${cs * 0.24}" fill="#1d2536">${starts[k]}</text>`;
    if (c.show) s += `<text x="${cs / 2}" y="${cs * 0.74}" text-anchor="middle" font-family="S" font-weight="700" font-size="${cs * 0.6}" fill="${c.ok ? '#1a5e4d' : '#1d2536'}">${c.ch}</text>`;
    s += '</g>';
  }
  return { svg: s, w: 9 * cs, h: 7 * cs };
}

const pencil = (len, th) => `<g>
  <rect x="0" y="${-th / 2}" width="${len * 0.78}" height="${th}" fill="#f2b632"/>
  <rect x="0" y="${-th / 2}" width="${len * 0.78}" height="${th / 3}" fill="#f7cb5a"/>
  <rect x="0" y="${th / 6}" width="${len * 0.78}" height="${th / 3}" fill="#d99a1c"/>
  <rect x="${-th * 0.9}" y="${-th / 2}" width="${th * 0.55}" height="${th}" fill="#e98a9a" rx="${th * 0.15}"/>
  <rect x="${-th * 0.38}" y="${-th / 2}" width="${th * 0.38}" height="${th}" fill="#b8bcc6"/>
  <path d="M${len * 0.78} ${-th / 2} L${len} 0 L${len * 0.78} ${th / 2}Z" fill="#f1d6ad"/>
  <path d="M${len * 0.93} ${-th * 0.16} L${len} 0 L${len * 0.93} ${th * 0.16}Z" fill="#2a3246"/>
</g>`;

const cup = (r) => `<g>
  <ellipse cx="0" cy="${r * 0.15}" rx="${r * 1.35}" ry="${r * 1.35}" fill="#e7dcc6"/>
  <circle cx="0" cy="0" r="${r}" fill="#fffdf8" stroke="#2a3246" stroke-width="${r * 0.08}"/>
  <circle cx="0" cy="0" r="${r * 0.76}" fill="#9a5b2e"/>
  <circle cx="${-r * 0.2}" cy="${-r * 0.22}" r="${r * 0.18}" fill="#b77a48" opacity=".7"/>
</g>`;

function scene({ w, h, lang, title, kind }) {
  const bg = `<rect width="${w}" height="${h}" fill="url(#bg)"/>`;
  let body = '';
  if (kind === 'icon') {
    // крупно: пересечение двух слов и карандаш
    const cs = w * 0.17;
    const word = lang === 'ru' ? 'СЛОВО' : 'WORDS';
    const ox = (w - cs * 5) / 2,
      oy = h * 0.46;
    let s = '';
    [...word].forEach((ch, i) => {
      s += `<g transform="translate(${ox + i * cs},${oy})"><rect width="${cs}" height="${cs}" rx="${cs * 0.1}" fill="${i === 2 ? '#ffc838' : '#fffdf8'}" stroke="#2a3246" stroke-width="${cs * 0.07}"/><text x="${cs / 2}" y="${cs * 0.75}" text-anchor="middle" font-family="S" font-weight="700" font-size="${cs * 0.64}" fill="#1d2536">${ch}</text></g>`;
    });
    const v = lang === 'ru' ? ['К', 'Р', null, 'С', 'С'] : ['C', 'R', null, 'S', 'S'];
    v.forEach((ch, j) => {
      if (!ch) return;
      const y = oy + (j - 2) * cs;
      s += `<g transform="translate(${ox + 2 * cs},${y})"><rect width="${cs}" height="${cs}" rx="${cs * 0.1}" fill="#e2f2e5" stroke="#2a3246" stroke-width="${cs * 0.07}"/><text x="${cs / 2}" y="${cs * 0.75}" text-anchor="middle" font-family="S" font-weight="700" font-size="${cs * 0.64}" fill="#1a5e4d">${ch}</text></g>`;
    });
    body = `<g filter="url(#sh)">${s}</g><g transform="translate(${w * 0.6},${h * 0.83}) rotate(-38)" filter="url(#sh)">${pencil(w * 0.42, w * 0.07)}</g>`;
  } else {
    const cs = kind === 'show' ? h * 0.12 : h * 0.086;
    const g = grid(lang, cs);
    const gx = kind === 'show' ? w * 0.55 : w * 0.5 - g.w / 2,
      gy = kind === 'show' ? (h - g.h) / 2 : h * 0.355;
    body = `<g transform="translate(${gx},${gy}) rotate(${kind === 'show' ? -3 : -2},${g.w / 2},${g.h / 2})" filter="url(#sh)">${g.svg}</g>`;
    body += `<g transform="translate(${kind === 'show' ? w * 0.06 : w * 0.06},${kind === 'show' ? h * 0.86 : h * 0.9}) rotate(-14)" filter="url(#sh)">${pencil(h * 0.62, h * 0.05)}</g>`;
    body += `<g transform="translate(${kind === 'show' ? w * 0.47 : w * 0.93},${kind === 'show' ? h * 0.8 : h * 0.84})" filter="url(#sh)">${cup(h * 0.12)}</g>`;
    if (kind === 'show') {
      body += `<text x="${w * 0.07}" y="${h * 0.47}" font-family="T" font-weight="700" font-size="${h * 0.2}" fill="#1d2536">${title[0]}</text>`;
      body += `<text x="${w * 0.075}" y="${h * 0.64}" font-family="T" font-weight="700" font-size="${h * 0.085}" letter-spacing="${h * 0.018}" fill="#1f6e5b">${title[1].toUpperCase()}</text>`;
    } else {
      body += `<text x="${w / 2}" y="${h * 0.2}" text-anchor="middle" font-family="T" font-weight="700" font-size="${h * 0.17}" fill="#1d2536">${title[0]}</text>`;
      body += `<text x="${w / 2}" y="${h * 0.29}" text-anchor="middle" font-family="T" font-weight="700" font-size="${h * 0.065}" letter-spacing="${h * 0.014}" fill="#1f6e5b">${title[1].toUpperCase()}</text>`;
    }
  }
  return `<html><head><style>${FONTS}html,body{margin:0}</style></head><body><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#fbf6ec"/><stop offset="1" stop-color="#e6d8bd"/></radialGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="${h * 0.012}" stdDeviation="${h * 0.014}" flood-color="#5a4320" flood-opacity=".28"/></filter>
    <pattern id="dots" width="${h * 0.05}" height="${h * 0.05}" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="#cbb994" opacity=".5"/></pattern>
  </defs>${bg}<rect width="${w}" height="${h}" fill="url(#dots)"/>${body}</svg></body></html>`;
}

const TITLES = { ru: ['Кроссворды', 'Классика'], en: ['Crosswords', 'Classic'] };
const jobs = [
  ['icon_512', 512, 512, 'ru', 'icon'],
  ['icon_maskable_512', 512, 512, 'ru', 'icon'],
  ['cover_ru_800x470', 800, 470, 'ru', 'cover'],
  ['cover_en_800x470', 800, 470, 'en', 'cover'],
  ['showcase_ru_1560x520', 1560, 520, 'ru', 'show'],
  ['showcase_en_1560x520', 1560, 520, 'en', 'show'],
];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [name, w, h, lang, kind] of jobs) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  let html = scene({ w, h, lang, title: TITLES[lang], kind });
  // maskable: главное — в центральном круге, поэтому сцену чуть уменьшаем
  if (name.includes('maskable')) html = html.replace('<svg width', '<svg style="transform:scale(.8);background:#efe5d2" width').replace('html,body{margin:0}', 'html,body{margin:0;background:#efe3cd}');
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: OUT + name + '.png' });
  await page.close();
  console.log(name);
}
await browser.close();
