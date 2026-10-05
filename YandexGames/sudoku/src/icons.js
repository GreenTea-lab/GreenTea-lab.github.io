// SVG-иконки интерфейса (currentColor), логотип и монета «мон» с квадратным отверстием
const sv = (body, vb = '0 0 24 24') => `<svg class="ic" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
const st = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';

export const IC = {
  back: sv(`<path d="M15 5l-7 7 7 7" ${st}/>`),
  next: sv(`<path d="M9 5l7 7-7 7" ${st} stroke-width="2.6"/>`),
  close: sv(`<path d="M6 6l12 12M18 6L6 18" ${st} stroke-width="2.6"/>`),
  gear: sv(`<circle cx="12" cy="12" r="3.2" ${st}/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5" ${st}/><circle cx="12" cy="12" r="6.6" ${st}/>`),
  // старинная монета мон с квадратным отверстием
  coin: sv(`<circle cx="12" cy="12" r="9.6" fill="#e3b45a" stroke="#8f6418" stroke-width="1.5"/><circle cx="12" cy="12" r="7.2" fill="none" stroke="#a87a26" stroke-width="1"/><rect x="9.3" y="9.3" width="5.4" height="5.4" fill="#5a3d0c" stroke="#8f6418" stroke-width="1"/>`),
  star: sv(`<path d="M12 2.6l2.85 5.9 6.45.85-4.7 4.5 1.2 6.4L12 17.2l-5.8 3.05 1.2-6.4-4.7-4.5 6.45-.85z" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>`),
  lock: sv(`<rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" ${st}/>`),
  undo: sv(`<path d="M9 7L4 12l5 5" ${st}/><path d="M4.5 12H15a5 5 0 0 1 0 10h-2" ${st}/>`),
  erase: sv(`<path d="M8.5 19.5L3.8 14.8a1.8 1.8 0 0 1 0-2.6l8.4-8.4a1.8 1.8 0 0 1 2.6 0l5.4 5.4a1.8 1.8 0 0 1 0 2.6L13.5 19.5zM8.5 19.5H20M7.5 9.5l7 7" ${st}/>`),
  brush: sv(`<path d="M14.5 4.5l5 5L10 19c-1.6 1.6-4.4 1.8-6.5 1.5.3-2.1-.1-4.9 1.5-6.5z" ${st}/><path d="M12 7l5 5" ${st}/>`),
  bulb: sv(`<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" ${st}/>`),
  clock: sv(`<circle cx="12" cy="12" r="8.5" ${st}/><path d="M12 7.5V12l3 2" ${st}/>`),
  cross: sv(`<path d="M7 7l10 10M17 7L7 17" ${st} stroke-width="2.8"/>`),
  play: sv(`<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`),
  video: sv(`<rect x="2.5" y="5.5" width="13.5" height="13" rx="2.5" ${st}/><path d="M16 10.5l5.5-3.2v9.4L16 13.5" ${st}/><path d="M7.5 9.3v5.4l4.3-2.7z" fill="currentColor"/>`),
  calendar: sv(`<rect x="3.5" y="5" width="17" height="15.5" rx="2.5" ${st}/><path d="M3.5 10h17M8 3v4M16 3v4" ${st}/><circle cx="12" cy="15" r="2" fill="currentColor"/>`),
  trophy: sv(`<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8.5 20.5h7M9.5 17.5h5" ${st}/>`),
  checkc: sv(`<circle cx="12" cy="12" r="9.5" fill="currentColor"/><path d="M7.5 12.3l3 3 6-6.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`),
  infinity: sv(`<path d="M12 12c-2-3-4-4.5-6-4.5a4.5 4.5 0 0 0 0 9c2 0 4-1.5 6-4.5s4-4.5 6-4.5a4.5 4.5 0 0 1 0 9c-2 0-4-1.5-6-4.5z" ${st}/>`),
  grid: sv(`<rect x="3.5" y="3.5" width="17" height="17" rx="2" ${st}/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" ${st} stroke-width="1.6"/>`),
  music: sv(`<path d="M9 17V5l11-2v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="6.5" cy="17.5" r="3" fill="currentColor"/><circle cx="17.5" cy="15.5" r="3" fill="currentColor"/>`),
  sound: sv(`<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`),
  // сады
  blossom: sv(`<g fill="currentColor">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="12" cy="6.6" rx="3" ry="4.4" transform="rotate(${a} 12 12)"/>`).join('')}</g><circle cx="12" cy="12" r="2.2" fill="#ffe7a8"/>`),
  fan: sv(`<path d="M12 20L3.5 9.5a11 11 0 0 1 17 0z" fill="currentColor" opacity=".9"/><path d="M12 20L7.2 6.6M12 20V5.5M12 20l4.8-13.4" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/><circle cx="12" cy="20" r="1.6" fill="currentColor"/>`),
  maple: sv(`<path d="M12 2.5l1.6 4.2 3.1-1.4-.6 3.6 4.4-.6-2.4 3.4 2.4 1.6-4.4 1.2.8 2.6-4.2-1.6L12 21.5l-.7-6-4.2 1.6.8-2.6-4.4-1.2 2.4-1.6-2.4-3.4 4.4.6-.6-3.6 3.1 1.4z" fill="currentColor"/>`),
  snow: sv(`<path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5M9.5 4l2.5 2 2.5-2M9.5 20l2.5-2 2.5 2M4 10.6l3.2.6-1 3M20 13.4l-3.2-.6 1-3" ${st}/>`),
  tree: sv(`<path d="M12 21v-6" ${st}/><circle cx="8" cy="10" r="4.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="5" fill="currentColor"/><circle cx="12" cy="13" r="3.5" fill="currentColor"/>`),
};

export const CH = {
  easy: { color: '#d97893', icon: 'blossom' },
  medium: { color: '#3f9b8a', icon: 'fan' },
  hard: { color: '#cf6a33', icon: 'maple' },
  expert: { color: '#5b84c8', icon: 'snow' },
};

// логотип: золотое энсо, внутри квадрат 3×3 с цифрами и цветок сакуры
export function logoSVG() {
  const nums = [5, '', 3, '', 7, '', 9, '', 1];
  let cells = '';
  nums.forEach((n, k) => {
    const x = 62 + (k % 3) * 26,
      y = 62 + Math.floor(k / 3) * 26;
    cells += `<rect x="${x}" y="${y}" width="26" height="26" fill="${k === 4 ? '#ffd56b' : '#f7efdf'}" stroke="#2b2530" stroke-width="1.6"/>`;
    if (n) cells += `<text x="${x + 13}" y="${y + 20}" text-anchor="middle" font-family="Noto Serif,Georgia,serif" font-weight="700" font-size="19" fill="#211d29">${n}</text>`;
  });
  const petals = [0, 72, 144, 216, 288].map((a) => `<ellipse cx="166" cy="45" rx="7" ry="11" fill="#f3a7ba" transform="rotate(${a} 166 56)"/>`).join('');
  return `<svg class="logo" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <path d="M100 18c48 0 82 36 82 80 0 46-36 84-84 84-46 0-80-36-80-80 0-34 20-62 48-74" fill="none" stroke="#e3b45a" stroke-width="13" stroke-linecap="round"/>
    <path d="M100 18c48 0 82 36 82 80" fill="none" stroke="#f3cf85" stroke-width="5" stroke-linecap="round" opacity=".7"/>
    <rect x="60" y="60" width="82" height="82" rx="3" fill="#f7efdf"/>${cells}<rect x="61" y="61" width="78" height="78" fill="none" stroke="#2b2530" stroke-width="3.5"/>
    ${petals}<circle cx="166" cy="56" r="4" fill="#ffe7a8"/>
  </svg>`;
}

export function coinsArt(n) {
  const pos = [[32, 40], [18, 46], [46, 46], [32, 24], [16, 30], [48, 30]].slice(0, n).reverse();
  return `<svg viewBox="0 0 64 64">${pos.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="#e3b45a" stroke="#8f6418" stroke-width="2.2"/><rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="#5a3d0c"/>`).join('')}</svg>`;
}
export const NOADS_ART = `<svg viewBox="0 0 64 64"><rect x="10" y="17" width="44" height="30" rx="6" fill="#2c3270"/><path d="M28 25v14l11-7z" fill="#fff"/><circle cx="32" cy="32" r="25" fill="none" stroke="#d6452f" stroke-width="5.5"/><path d="M14.5 49.5L49.5 14.5" stroke="#d6452f" stroke-width="5.5" stroke-linecap="round"/></svg>`;
export const AD_ART = `<svg viewBox="0 0 64 64"><rect x="6" y="14" width="40" height="36" rx="7" fill="#2c3270"/><path d="M46 27l12-7v24l-12-7z" fill="#2c3270"/><path d="M21 24v16l12-8z" fill="#fff"/><circle cx="48" cy="48" r="11" fill="#e3b45a" stroke="#8f6418" stroke-width="2.2"/><rect x="44" y="44" width="8" height="8" fill="#5a3d0c"/></svg>`;
