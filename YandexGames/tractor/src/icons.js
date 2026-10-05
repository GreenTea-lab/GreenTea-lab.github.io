// SVG-иконки интерфейса фермы
const sv = (body, vb = '0 0 24 24') => `<svg class="ic" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
const st = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';

export const IC = {
  back: sv(`<path d="M15 5l-7 7 7 7" ${st}/>`),
  close: sv(`<path d="M6 6l12 12M18 6L6 18" ${st} stroke-width="2.6"/>`),
  gear: sv(`<circle cx="12" cy="12" r="3.2" ${st}/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5" ${st}/><circle cx="12" cy="12" r="6.6" ${st}/>`),
  coin: sv(`<circle cx="12" cy="12" r="9.6" fill="#f6c94a" stroke="#b07d12" stroke-width="1.6"/><circle cx="12" cy="12" r="6.6" fill="none" stroke="#d9a326" stroke-width="1.4"/><path d="M12 8.2v7.6M9.8 10.2c0-1.2 4.4-1.4 4.4.3 0 1.8-4.4 1.2-4.4 3 0 1.6 4.4 1.4 4.4.2" fill="none" stroke="#9a6a08" stroke-width="1.5" stroke-linecap="round"/>`),
  star: sv(`<path d="M12 2.6l2.85 5.9 6.45.85-4.7 4.5 1.2 6.4L12 17.2l-5.8 3.05 1.2-6.4-4.7-4.5 6.45-.85z" fill="currentColor"/>`),
  cart: sv(`<path d="M3 4h2.5l2.2 10.5h10.8L21 7H6.6" ${st}/><circle cx="9.5" cy="19" r="1.7" fill="currentColor"/><circle cx="17" cy="19" r="1.7" fill="currentColor"/>`),
  orders: sv(`<rect x="5" y="4" width="14" height="17" rx="2" ${st}/><path d="M9 3h6v3H9zM8.5 10.5h7M8.5 14h7M8.5 17.5h4.5" ${st}/>`),
  lock: sv(`<rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" ${st}/>`),
  play: sv(`<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>`),
  trophy: sv(`<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8.5 20.5h7M9.5 17.5h5" ${st}/>`),
  video: sv(`<rect x="2.5" y="5.5" width="13.5" height="13" rx="2.5" ${st}/><path d="M16 10.5l5.5-3.2v9.4L16 13.5" ${st}/><path d="M7.5 9.3v5.4l4.3-2.7z" fill="currentColor"/>`),
  bolt: sv(`<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" fill="currentColor"/>`),
  music: sv(`<path d="M9 17V5l11-2v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="6.5" cy="17.5" r="3" fill="currentColor"/><circle cx="17.5" cy="15.5" r="3" fill="currentColor"/>`),
  sound: sv(`<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`),
  trailer: sv(`<path d="M2.5 8h14v8h-14zM16.5 13h4" ${st}/><circle cx="7" cy="18" r="2.2" fill="currentColor"/><path d="M4.5 8c1.5-2.5 8-2.5 10 0" fill="#f1cf5c" stroke="currentColor" stroke-width="1.6"/>`),
  plow: sv(`<path d="M3 7h18M7 7v5M12 7v5M17 7v5" ${st}/><path d="M5 12l3 6 1.5-6zM10 12l3 6 1.5-6zM15 12l3 6 1.5-6z" fill="currentColor"/>`),
  seed: sv(`<path d="M5 6h14l-2 7H7z" fill="currentColor"/><path d="M8 14v4M12 14v5M16 14v4" ${st}/>`),
  harvest: sv(`<path d="M3 15h18l-1.5 4h-15zM6 15V9M12 15V7M18 15V9" ${st}/><circle cx="12" cy="9" r="5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2.5 2"/>`),
};

// значки культур (цветные)
export const CROP_IC = {
  wheat: sv(`<path d="M12 22V8" stroke="#b8902e" stroke-width="2" stroke-linecap="round"/>${[0, 1, 2, 3].map((k) => `<ellipse cx="${k % 2 ? 14.6 : 9.4}" cy="${6 + k * 3}" rx="2.4" ry="3.6" fill="#f1cf5c" stroke="#c9a23a" transform="rotate(${k % 2 ? 30 : -30} ${k % 2 ? 14.6 : 9.4} ${6 + k * 3})"/>`).join('')}<ellipse cx="12" cy="4.2" rx="2" ry="3" fill="#f1cf5c" stroke="#c9a23a"/>`),
  corn: sv(`<path d="M7 21c2-6 0-10 3-14M17 21c-2-6 0-10-3-14" stroke="#5fae4a" stroke-width="2.4" fill="none" stroke-linecap="round"/><ellipse cx="12" cy="11" rx="3.6" ry="7.5" fill="#f6d743" stroke="#c9a316"/><path d="M10 7v8M12 6v10M14 7v8" stroke="#d9b21e" stroke-width="1"/>`),
  sunflower: sv(`${[...Array(10)].map((_, k) => `<ellipse cx="12" cy="4.5" rx="2" ry="3.6" fill="#ffc531" transform="rotate(${k * 36} 12 10)"/>`).join('')}<circle cx="12" cy="10" r="4" fill="#6b4425"/><path d="M12 15v7" stroke="#5fae4a" stroke-width="2"/>`),
  carrot: sv(`<path d="M15 9L6 21l-1-1L13 7z" fill="#f2843a" stroke="#c9601e"/><path d="M14 8l3-5M15 9l5-2M14.5 8.5l4-3" stroke="#5fae4a" stroke-width="2" stroke-linecap="round"/>`),
  pumpkin: sv(`<ellipse cx="12" cy="14" rx="9" ry="7" fill="#f08a2a" stroke="#c9601e"/><path d="M12 7c-2 2-2 12 0 14M12 7c2 2 2 12 0 14M7 9c-2 3-2 8 0 11M17 9c2 3 2 8 0 11" stroke="#d9701e" fill="none"/><path d="M12 7c0-2 1-3 3-4" stroke="#5a7a2e" stroke-width="2" fill="none" stroke-linecap="round"/>`),
};

export function coinsArt(n) {
  const pos = [[32, 40], [18, 46], [46, 46], [32, 24], [16, 30], [48, 30]].slice(0, n).reverse();
  return `<svg viewBox="0 0 64 64">${pos.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="#f6c94a" stroke="#b07d12" stroke-width="2.2"/><circle cx="${x}" cy="${y}" r="8.5" fill="none" stroke="#d9a326" stroke-width="1.8"/>`).join('')}</svg>`;
}
export const NOADS_ART = `<svg viewBox="0 0 64 64"><rect x="10" y="17" width="44" height="30" rx="6" fill="#3f9d4a"/><path d="M28 25v14l11-7z" fill="#fff"/><circle cx="32" cy="32" r="25" fill="none" stroke="#e2453c" stroke-width="5.5"/><path d="M14.5 49.5L49.5 14.5" stroke="#e2453c" stroke-width="5.5" stroke-linecap="round"/></svg>`;
export const AD_ART = `<svg viewBox="0 0 64 64"><rect x="6" y="14" width="40" height="36" rx="7" fill="#3f9d4a"/><path d="M46 27l12-7v24l-12-7z" fill="#3f9d4a"/><path d="M21 24v16l12-8z" fill="#fff"/><circle cx="48" cy="48" r="11" fill="#f6c94a" stroke="#b07d12" stroke-width="2.2"/></svg>`;

// маленький трактор для карточек магазина
export function tractorArt(body, rim) {
  return `<svg viewBox="0 0 64 48"><rect x="8" y="22" width="34" height="12" rx="3" fill="${body}"/><rect x="30" y="8" width="18" height="18" rx="2" fill="${body}"/><rect x="33" y="11" width="12" height="10" rx="1" fill="#a9d8f0"/><rect x="12" y="14" width="3" height="8" fill="#3b3a40"/><circle cx="42" cy="36" r="10" fill="#2e2c30"/><circle cx="42" cy="36" r="5" fill="${rim}"/><circle cx="14" cy="38" r="7" fill="#2e2c30"/><circle cx="14" cy="38" r="3.5" fill="${rim}"/></svg>`;
}
