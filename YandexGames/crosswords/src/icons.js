// SVG-иконки интерфейса (currentColor)
const sv = (body, vb = '0 0 24 24') => `<svg class="ic" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
const st = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';

export const IC = {
  back: sv(`<path d="M15 5l-7 7 7 7" ${st}/>`),
  prev: sv(`<path d="M15 5l-7 7 7 7" ${st} stroke-width="2.6"/>`),
  next: sv(`<path d="M9 5l7 7-7 7" ${st} stroke-width="2.6"/>`),
  close: sv(`<path d="M6 6l12 12M18 6L6 18" ${st} stroke-width="2.6"/>`),
  gear: sv(`<circle cx="12" cy="12" r="3.2" ${st}/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5" ${st}/><circle cx="12" cy="12" r="6.6" ${st}/>`),
  coin: sv(`<circle cx="12" cy="12" r="9.5" fill="#f1c232" stroke="#a8740c" stroke-width="1.6"/><circle cx="12" cy="12" r="6.4" fill="none" stroke="#a8740c" stroke-width="1.3"/><path d="M10 9.2h3.2a1.7 1.7 0 0 1 0 3.4H10m0-3.4v6m0-2.6h3.6" fill="none" stroke="#8a5e06" stroke-width="1.5" stroke-linecap="round"/>`),
  star: sv(`<path d="M12 2.6l2.85 5.9 6.45.85-4.7 4.5 1.2 6.4L12 17.2l-5.8 3.05 1.2-6.4-4.7-4.5 6.45-.85z" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>`),
  lock: sv(`<rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" ${st}/>`),
  bulb: sv(`<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" ${st}/>`),
  book: sv(`<path d="M3.5 5.5c2.8-1.2 5.6-1.2 8.5.5 2.9-1.7 5.7-1.7 8.5-.5v13c-2.8-1.2-5.6-1.2-8.5.5-2.9-1.7-5.7-1.7-8.5-.5z" ${st}/><path d="M12 6v13" ${st}/>`),
  check: sv(`<path d="M4.5 12.5l4.8 4.8L19.5 7" ${st} stroke-width="2.8"/>`),
  checkc: sv(`<circle cx="12" cy="12" r="9.5" fill="currentColor"/><path d="M7.5 12.3l3 3 6-6.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`),
  list: sv(`<path d="M9 6.5h11M9 12h11M9 17.5h11" ${st}/><circle cx="4.6" cy="6.5" r="1.4" fill="currentColor"/><circle cx="4.6" cy="12" r="1.4" fill="currentColor"/><circle cx="4.6" cy="17.5" r="1.4" fill="currentColor"/>`),
  calendar: sv(`<rect x="3.5" y="5" width="17" height="15.5" rx="2.5" ${st}/><path d="M3.5 10h17M8 3v4M16 3v4" ${st}/><rect x="7" y="13" width="3.2" height="3.2" rx=".6" fill="currentColor"/>`),
  trophy: sv(`<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8.5 20.5h7M9.5 17.5h5" ${st}/>`),
  grid: sv(`<rect x="3.5" y="3.5" width="7" height="7" rx="1" ${st}/><rect x="13.5" y="3.5" width="7" height="7" rx="1" ${st}/><rect x="3.5" y="13.5" width="7" height="7" rx="1" ${st}/><rect x="13.5" y="13.5" width="7" height="7" rx="1" fill="currentColor" stroke="currentColor" stroke-width="2.2"/>`),
  play: sv(`<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`),
  video: sv(`<rect x="2.5" y="5.5" width="13.5" height="13" rx="2.5" ${st}/><path d="M16 10.5l5.5-3.2v9.4L16 13.5" ${st}/><path d="M7.5 9.3v5.4l4.3-2.7z" fill="currentColor"/>`),
  bs: sv(`<path d="M9 5.5h10.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H9L3 12z" ${st}/><path d="M11.5 9.5l5 5M16.5 9.5l-5 5" ${st}/>`),
  plus: sv(`<path d="M12 5v14M5 12h14" ${st} stroke-width="3"/>`),
  noads: sv(`<rect x="3" y="6" width="18" height="12" rx="2.5" ${st}/><path d="M10 9.3v5.4l4.3-2.7z" fill="currentColor"/><path d="M4 20L20 4" ${st}/>`),
  // главы
  sprout: sv(`<path d="M12 21v-9M12 12c0-4 3-6.5 7.5-6.5 0 4.5-3 6.5-7.5 6.5zM12 14.5C12 11 9.5 9 5 9c0 3.8 2.5 5.5 7 5.5z" ${st}/>`),
  lamp: sv(`<path d="M8 3.5h8l3 8H5zM12 11.5V19M8 20.5h8" ${st}/>`),
  flower: sv(`<circle cx="12" cy="9" r="2.2" fill="currentColor"/><path d="M12 6.8c-1.6-3.4 1.6-4.9 2.4-2.6.9-2.3 4.1-.8 2.4 2.6M12 11.2v9.3M12 16c-2.5 0-4.5-1.5-5-4M12 17.5c2.5 0 4.5-1.5 5-4" ${st}/><circle cx="8.6" cy="7.2" r="2" ${st}/><circle cx="15.4" cy="7.2" r="2" ${st}/>`),
  wave: sv(`<path d="M2.5 9c2.4 0 2.4-2 4.75-2S9.6 9 12 9s2.4-2 4.75-2S19.1 9 21.5 9M2.5 14c2.4 0 2.4-2 4.75-2S9.6 14 12 14s2.4-2 4.75-2 2.35 2 4.75 2M2.5 19c2.4 0 2.4-2 4.75-2S9.6 19 12 19s2.4-2 4.75-2 2.35 2 4.75 2" ${st}/>`),
  leaf: sv(`<path d="M5 19c0-9 5-14.5 15-15 0 10-5.5 15-15 15zM5 19l8-8" ${st}/>`),
  snow: sv(`<path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5M9.5 4l2.5 2 2.5-2M9.5 20l2.5-2 2.5 2" ${st}/>`),
  books: sv(`<rect x="3.5" y="4" width="4.5" height="16.5" rx="1" ${st}/><rect x="9" y="6.5" width="4.5" height="14" rx="1" ${st}/><path d="M15.2 7.6l3.9-1.1 3.4 13.1-3.9 1z" ${st}/>`),
  quill: sv(`<path d="M20 3.5C11 4.5 6 10 4.5 20.5 9 14 14.5 11.5 20 3.5zM4.5 20.5L10 15M9 11.5h5" ${st}/>`),
  music: sv(`<path d="M9 17V5l11-2v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="6.5" cy="17.5" r="3" fill="currentColor"/><circle cx="17.5" cy="15.5" r="3" fill="currentColor"/>`),
  sound: sv(`<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`),
  help: sv(`<circle cx="12" cy="12" r="9.5" ${st}/><path d="M9.3 9.3a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9v.6" ${st}/><circle cx="12" cy="17.3" r="1.3" fill="currentColor"/>`),
};

// стопка монет для магазина
export function coinsArt(n) {
  const pos = [[32, 40], [18, 46], [46, 46], [32, 24], [16, 30], [48, 30]].slice(0, n).reverse();
  return `<svg viewBox="0 0 64 64">${pos
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="#f1c232" stroke="#a8740c" stroke-width="2.2"/><circle cx="${x}" cy="${y}" r="8" fill="none" stroke="#a8740c" stroke-width="1.6"/>`)
    .join('')}</svg>`;
}

export const NOADS_ART = `<svg viewBox="0 0 64 64"><rect x="10" y="17" width="44" height="30" rx="6" fill="#2c5a96"/><path d="M28 25v14l11-7z" fill="#fff"/><circle cx="32" cy="32" r="25" fill="none" stroke="#c3382d" stroke-width="5.5"/><path d="M14.5 49.5L49.5 14.5" stroke="#c3382d" stroke-width="5.5" stroke-linecap="round"/></svg>`;

export const AD_ART = `<svg viewBox="0 0 64 64"><rect x="6" y="14" width="40" height="36" rx="7" fill="#1f6e5b"/><path d="M46 27l12-7v24l-12-7z" fill="#1f6e5b"/><path d="M21 24v16l12-8z" fill="#fff"/><circle cx="48" cy="48" r="11" fill="#f1c232" stroke="#a8740c" stroke-width="2.2"/><path d="M48 43v10M43 48h10" stroke="#8a5e06" stroke-width="2.6" stroke-linecap="round"/></svg>`;
