// SVG-иконки интерфейса
const s = (body, vb = '0 0 24 24') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

export const IC = {
  bank: s('<ellipse cx="12" cy="13.5" rx="8.5" ry="6.5" fill="#ff9fb8" stroke="#3b2418" stroke-width="1.6"/><circle cx="19.5" cy="13" r="2.2" fill="#ffb8c9" stroke="#3b2418" stroke-width="1.4"/><circle cx="20" cy="12.6" r=".5" fill="#3b2418"/><circle cx="20" cy="13.8" r=".5" fill="#3b2418"/><path d="M6 19.5v2M15 19.5v2" stroke="#3b2418" stroke-width="2" stroke-linecap="round"/><rect x="9.5" y="7" width="5" height="1.6" rx=".8" fill="#3b2418"/><circle cx="15.5" cy="11.5" r=".9" fill="#3b2418"/><path d="M8 8.5l-1.5-2.5 3 .8" fill="#ff9fb8" stroke="#3b2418" stroke-width="1.2" stroke-linejoin="round"/>'),
  truck: s('<path d="M2 7h11v9H2z" fill="#c98a52" stroke="#3b2418" stroke-width="1.4"/><path d="M13 9.5h4.5l3.5 3.5v3H13z" fill="#4a98dc" stroke="#3b2418" stroke-width="1.4" stroke-linejoin="round"/><path d="M15 11h2.3l1.8 2H15z" fill="#bfe9ff"/><circle cx="6" cy="17" r="2.3" fill="#3a3440" stroke="#fff" stroke-width="1"/><circle cx="17" cy="17" r="2.3" fill="#3a3440" stroke="#fff" stroke-width="1"/>'),
  barn: s('<path d="M3 10l9-6 9 6v11H3z" fill="#d9493e" stroke="#3b2418" stroke-width="1.5" stroke-linejoin="round"/><rect x="8" y="13" width="8" height="8" fill="#b8392f" stroke="#fff" stroke-width="1.2"/><path d="M8 13l8 8M16 13l-8 8" stroke="#fff" stroke-width="1.1"/>'),
  water: s('<path d="M12 3c3.5 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2.5-6 6-11z" fill="#5ab4ec" stroke="#3b2418" stroke-width="1.5"/><path d="M9 14a3 3 0 0 0 3 3" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'),
  grass: s('<path d="M4 20c1-5 2-8 4-10M9 20c0-6 1-10 3-14M14 20c0-5 1.5-8 4-10M19 20c0-3 .5-5 2-7M7 20c0-3-1-5-3-6" fill="none" stroke="#3f9a32" stroke-width="2.6" stroke-linecap="round"/>'),
  hungry: s('<circle cx="12" cy="12" r="10" fill="#fff6c4" stroke="#3b2418" stroke-width="1.6"/><path d="M7 17c.6-3 1.3-5 2.5-6.5M11 17c0-3.5.6-6 2-8.5M15 17c.2-3 1-4.5 2.5-5.5" fill="none" stroke="#3f9a32" stroke-width="2.2" stroke-linecap="round"/>'),
  paw: s('<ellipse cx="12" cy="15.5" rx="4.5" ry="3.8" fill="currentColor"/><circle cx="6.5" cy="10.5" r="2" fill="currentColor"/><circle cx="17.5" cy="10.5" r="2" fill="currentColor"/><circle cx="9.5" cy="6.5" r="2" fill="currentColor"/><circle cx="14.5" cy="6.5" r="2" fill="currentColor"/>'),
  up2: s('<path d="M12 3l7 8h-4.5v9h-5v-9H5z" fill="currentColor"/>'),
  hammer: s('<path d="M4 20l9-9" stroke="#8a5a34" stroke-width="3.2" stroke-linecap="round"/><path d="M10.5 5.5l4-2.5 6.5 6.5-2.5 4z" fill="#8a8f99" stroke="#3b2418" stroke-width="1.4" stroke-linejoin="round"/>'),
  arrowR: s('<path d="M4 12h13M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  arrowL: s('<path d="M20 12H7M12 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  all: s('<path d="M3 12h9M8 7l5 5-5 5M12 7l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 5v14" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>'),
  cage: s('<rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="#3b2418" stroke-width="2"/><path d="M8 4v16M12 4v16M16 4v16" stroke="#8a8f99" stroke-width="2"/>'),
  pause: s('<rect x="6" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/>'),
  play: s('<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>'),
  restart: s('<path d="M12 5a7 7 0 1 1-6.6 4.7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M3.5 4.5l1.9 5.6 5.5-2.1z" fill="currentColor"/>'),
  home: s('<path d="M3.5 11.5L12 4l8.5 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10.5V20h4.5v-5h3v5H18v-9.5" fill="currentColor"/>'),
  coin: s('<circle cx="12" cy="12" r="9.5" fill="#ffd23f" stroke="#c48a00" stroke-width="2"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="#e0a800" stroke-width="1.6"/><path d="M12 8.6v6.8" stroke="#c48a00" stroke-width="2" stroke-linecap="round"/>'),
  cup: s('<path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="#ffc83a"/><path d="M7 5H3.5v1.5A3.5 3.5 0 0 0 7 10M17 5h3.5v1.5A3.5 3.5 0 0 1 17 10" fill="none" stroke="#ffc83a" stroke-width="2"/><path d="M10.5 14h3v3.5h-3zM7.5 18h9v3h-9z" fill="#e09a1a"/>'),
  sound: s('<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  music: s('<path d="M9 17V5l11-2v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="6.5" cy="17.5" r="3" fill="currentColor"/><circle cx="17.5" cy="15.5" r="3" fill="currentColor"/>'),
  gear: s('<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
  trophy: s('<path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H3.5v1.5A3.5 3.5 0 0 0 7 10M17 5h3.5v1.5A3.5 3.5 0 0 1 17 10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.5 14h3v3.5h-3zM7.5 18h9v3h-9z" fill="currentColor"/>'),
  shop: s('<path d="M4 9h16l-1.3 11H5.3z" fill="currentColor"/><path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" stroke-width="2.2"/>'),
  gift: s('<rect x="3" y="9" width="18" height="4" rx="1" fill="currentColor"/><rect x="4.5" y="13" width="15" height="8" rx="1" fill="currentColor"/><path d="M12 9v12" stroke="#fff6" stroke-width="2.2"/><path d="M12 9C10 4 6 4.5 7 7.5 7.6 9 12 9 12 9zM12 9c2-5 6-4.5 5-1.5C16.4 9 12 9 12 9z" fill="none" stroke="currentColor" stroke-width="2"/>'),
  ad: s('<rect x="2.5" y="5" width="19" height="14" rx="3" fill="#fff"/><path d="M10 9v6l5-3z" fill="#ff8a3c"/>'),
  lock: s('<rect x="5" y="10.5" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.4"/>'),
  close: s('<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'),
  check: s('<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
  back: s('<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
  fwd: s('<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
  left: s('<path d="M15.5 4.5L7 12l8.5 7.5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'),
  right: s('<path d="M8.5 4.5L17 12l-8.5 7.5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'),
  car: s('<path d="M3 14.5l1.6-4.6A2.5 2.5 0 0 1 7 8.2h10a2.5 2.5 0 0 1 2.4 1.7l1.6 4.6v3.2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="currentColor"/><path d="M6.5 12.5l1-2.8h9l1 2.8z" fill="#fff8"/><circle cx="7.5" cy="18.5" r="2.4" fill="currentColor" stroke="#fff" stroke-width="1.4"/><circle cx="16.5" cy="18.5" r="2.4" fill="currentColor" stroke="#fff" stroke-width="1.4"/>'),
  flag: s('<path d="M5 21V3.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M6 4h13l-2.5 4.5L19 13H6z" fill="currentColor"/><path d="M9 4h3v3H9zM15 4h3v3h-3zM12 7h3v3h-3zM9 10h3v3H9zM15 10h3v3h-3z" fill="#fff7"/>'),
  drift: s('<path d="M4 17c4-1 6-4 7-8M10 18c4-1 6-4 7-8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M14.5 6.5L19 5l-.8 4.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
  nitro: s('<path d="M13 2L5 13.5h6L10 22l9-12.5h-6z" fill="currentColor"/>'),
  brake: s('<rect x="5" y="5" width="14" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M9 9v6M15 9v6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
  up: s('<path d="M12 5v14M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
  globe: s('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" fill="none" stroke="currentColor" stroke-width="1.8"/>'),
  medal1: s('<path d="M8 2h3l1 5-3 1zM16 2h-3l-1 5 3 1z" fill="#5aa9ff"/><circle cx="12" cy="14" r="7" fill="#ffd23f" stroke="#c48a00" stroke-width="1.6"/><text x="12" y="17.6" font-size="9" text-anchor="middle" font-family="Arial" font-weight="bold" fill="#8a5a00">1</text>'),
  medal2: s('<path d="M8 2h3l1 5-3 1zM16 2h-3l-1 5 3 1z" fill="#ff6b6b"/><circle cx="12" cy="14" r="7" fill="#dfe6ef" stroke="#8a96a8" stroke-width="1.6"/><text x="12" y="17.6" font-size="9" text-anchor="middle" font-family="Arial" font-weight="bold" fill="#5a6678">2</text>'),
  medal3: s('<path d="M8 2h3l1 5-3 1zM16 2h-3l-1 5 3 1z" fill="#7ed957"/><circle cx="12" cy="14" r="7" fill="#f0a868" stroke="#a8622a" stroke-width="1.6"/><text x="12" y="17.6" font-size="9" text-anchor="middle" font-family="Arial" font-weight="bold" fill="#7a4210">3</text>'),
  star: s('<path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" fill="#ffd23f" stroke="#c48a00" stroke-width="1.6" stroke-linejoin="round"/>'),
  starE: s('<path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" fill="rgba(36,50,90,.25)" stroke="rgba(36,50,90,.35)" stroke-width="1.6" stroke-linejoin="round"/>'),
  hat: s('<path d="M7 13.5a4.2 4.2 0 0 1 .6-8.3A4.6 4.6 0 0 1 12 3a4.6 4.6 0 0 1 4.4 2.2 4.2 4.2 0 0 1 .6 8.3V17H7z" fill="currentColor"/><rect x="7" y="18" width="10" height="3" rx="1" fill="currentColor"/>'),
  pot: s('<path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="currentColor"/><path d="M2 10h20M9 7h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M9 5c0-1 1-1 1-2M14 5c0-1 1-1 1-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>'),
  hand: s('<path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11V4a1.5 1.5 0 0 1 3 0v7V5.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6 7-2.6 0-4-1.4-5.4-3.6L3.8 14a1.4 1.4 0 0 1 2.2-1.7z" fill="currentColor"/>'),
  knife: s('<path d="M3 20.5L14.5 9l2.5 2.5L6.5 21z" fill="currentColor" opacity=".55"/><path d="M14 9.5l5.6-5.6a2 2 0 0 1 2.4 2.8L17 11.5z" fill="currentColor"/><path d="M4 13.5c3-3 7-6.5 10-4.5L6 17z" fill="currentColor"/>'),
  swap: s('<path d="M5 8h12M13.5 4.5L17 8l-3.5 3.5M19 16H7M10.5 12.5L7 16l3.5 3.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>'),
  clock: s('<circle cx="12" cy="12" r="9" fill="#fff" stroke="currentColor" stroke-width="2.4"/><path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  grid: s('<rect x="3.5" y="3.5" width="7" height="7" rx="2" fill="currentColor"/><rect x="13.5" y="3.5" width="7" height="7" rx="2" fill="currentColor"/><rect x="3.5" y="13.5" width="7" height="7" rx="2" fill="currentColor"/><rect x="13.5" y="13.5" width="7" height="7" rx="2" fill="currentColor"/>'),
  pan: s('<ellipse cx="10" cy="13" rx="8" ry="5.5" fill="currentColor"/><path d="M17 12.5l5.5-2" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><ellipse cx="10" cy="12" rx="5.5" ry="3" fill="#fff" opacity=".35"/>'),
};

// иконки товаров лавки (и для консоли: рендерятся в PNG 256×256)
const coinAt = (x, y, r = 9) => `<ellipse cx="${x}" cy="${y + 2.4}" rx="${r}" ry="${r * 0.55}" fill="#c48a00"/><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.55}" fill="#ffd23f" stroke="#c48a00" stroke-width="1.6"/><ellipse cx="${x}" cy="${y}" rx="${r * 0.55}" ry="${r * 0.3}" fill="none" stroke="#e8ad00" stroke-width="1.3"/>`;
const stack = (x, y, n, r) => Array.from({ length: n }, (_, i) => coinAt(x, y - i * 4, r)).join('');
export const SHOP_IC = {
  coins_1000: s(stack(32, 44, 3, 13) + stack(18, 50, 1, 11) + `<path d="M46 12l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff6c0"/>`, '0 0 64 64'),
  coins_3500: s(stack(20, 50, 3, 11) + stack(42, 50, 4, 11) + stack(31, 38, 5, 12) + `<path d="M52 8l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff6c0"/>`, '0 0 64 64'),
  coins_10000: s(
    `<path d="M8 30h48v24a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" fill="#b8742e" stroke="#5a3414" stroke-width="2.5"/><path d="M8 30q24-22 48 0" fill="#d48d42" stroke="#5a3414" stroke-width="2.5"/>` +
      stack(22, 30, 2, 10) + stack(40, 29, 3, 10) + stack(31, 24, 2, 10) +
      `<rect x="28" y="36" width="8" height="10" rx="2" fill="#ffd23f" stroke="#5a3414" stroke-width="2"/><path d="M8 42h48" stroke="#5a3414" stroke-width="2.5"/><path d="M54 6l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff6c0"/>`,
    '0 0 64 64',
  ),
  disable_ads: s(
    `<rect x="8" y="14" width="48" height="34" rx="7" fill="#4f9fe0" stroke="#1f4f80" stroke-width="3"/><path d="M27 24v14l12-7z" fill="#fff"/><circle cx="32" cy="31" r="24" fill="none" stroke="#e2574c" stroke-width="6"/><path d="M15 14l34 34" stroke="#e2574c" stroke-width="6" stroke-linecap="round"/>`,
    '0 0 64 64',
  ),
};
