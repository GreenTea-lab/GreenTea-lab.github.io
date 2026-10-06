// SVG-иконки интерфейса
const sv = (body, vb = '0 0 24 24') => `<svg class="ic" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
const st = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
export const IC = {
  close: sv(`<path d="M6 6l12 12M18 6L6 18" ${st} stroke-width="2.8"/>`),
  gear: sv(`<circle cx="12" cy="12" r="3.2" ${st}/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5" ${st}/><circle cx="12" cy="12" r="6.6" ${st}/>`),
  coin: sv(`<circle cx="12" cy="12" r="9.6" fill="#ffc82a" stroke="#c8901a" stroke-width="1.8"/><circle cx="12" cy="12" r="6.4" fill="none" stroke="#ffe27a" stroke-width="1.6"/><rect x="10.6" y="7.6" width="2.8" height="8.8" rx="1.2" fill="#c8901a"/>`),
  star: sv(`<path d="M12 2.6l2.85 5.9 6.45.85-4.7 4.5 1.2 6.4L12 17.2l-5.8 3.05 1.2-6.4-4.7-4.5 6.45-.85z" fill="currentColor"/>`),
  play: sv(`<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>`),
  pause: sv(`<rect x="6.5" y="5" width="4" height="14" rx="1.4" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.4" fill="currentColor"/>`),
  restart: sv(`<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5M4.5 4.5v4h4" ${st}/>`),
  grid: sv(`<rect x="4" y="4" width="6.5" height="6.5" rx="1.6" fill="currentColor"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" fill="currentColor"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" fill="currentColor"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" fill="currentColor"/>`),
  shirt: sv(`<path d="M8 3.5L3 6.5l2 4 2-1v11h10v-11l2 1 2-4-5-3c-.5 1.6-2 2.6-4 2.6S8.5 5.1 8 3.5z" fill="currentColor"/>`),
  bag: sv(`<path d="M5 8h14l-1.2 12H6.2z" ${st}/><path d="M9 10V7a3 3 0 0 1 6 0v3" ${st}/>`),
  trophy: sv(`<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8.5 20.5h7M9.5 17.5h5" ${st}/>`),
  video: sv(`<rect x="2.5" y="5.5" width="13.5" height="13" rx="2.5" ${st}/><path d="M16 10.5l5.5-3.2v9.4L16 13.5" ${st}/><path d="M7.5 9.3v5.4l4.3-2.7z" fill="currentColor"/>`),
  lock: sv(`<rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" ${st}/>`),
  check: sv(`<path d="M5 12.5l4.5 4.5L19 7.5" ${st} stroke-width="3"/>`),
  up: sv(`<path d="M12 19V6M6 11.5L12 5.5l6 6" ${st} stroke-width="3"/>`),
  skip: sv(`<path d="M5 5.5v13l9-6.5zM16 5.5v13" fill="currentColor" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>`),
  gift: sv(`<rect x="3.5" y="9" width="17" height="11.5" rx="1.5" ${st}/><path d="M2.5 9h19M12 9v11.5M12 9c-1.5-4-6-5-6-2s6 2 6 2zM12 9c1.5-4 6-5 6-2s-6 2-6 2z" ${st}/>`),
  music: sv(`<path d="M9 17V5l11-2v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="6.5" cy="17.5" r="3" fill="currentColor"/><circle cx="17.5" cy="15.5" r="3" fill="currentColor"/>`),
  sound: sv(`<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`),
  flag: sv(`<path d="M5 21V3.5M5 4h11l-2.5 4L16 12H5" ${st}/>`),
  clock: sv(`<circle cx="12" cy="12" r="9" ${st}/><path d="M12 7v5.5l3.5 2" ${st}/>`),
};
