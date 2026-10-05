// SVG-иконки интерфейса рыбалки
const sv = (body, vb = '0 0 24 24') => `<svg class="ic" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
const st = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';

export const IC = {
  close: sv(`<path d="M6 6l12 12M18 6L6 18" ${st} stroke-width="2.6"/>`),
  back: sv(`<path d="M15 5l-7 7 7 7" ${st}/>`),
  gear: sv(`<circle cx="12" cy="12" r="3.2" ${st}/><path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5" ${st}/><circle cx="12" cy="12" r="6.6" ${st}/>`),
  coin: sv(`<circle cx="12" cy="12" r="9.6" fill="#f6c94a" stroke="#b07d12" stroke-width="1.6"/><circle cx="12" cy="12" r="6.6" fill="none" stroke="#d9a326" stroke-width="1.4"/><path d="M7.5 12.2c1.6-2.2 4.6-2.6 7-.6l1.8-1.3v3.6l-1.8-1.3c-2.4 2-5.4 1.6-7-.4z" fill="#a8740c"/>`),
  star: sv(`<path d="M12 2.6l2.85 5.9 6.45.85-4.7 4.5 1.2 6.4L12 17.2l-5.8 3.05 1.2-6.4-4.7-4.5 6.45-.85z" fill="currentColor"/>`),
  lock: sv(`<rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" ${st}/>`),
  check: sv(`<path d="M5 12.5l4.5 4.5L19 7.5" ${st} stroke-width="3"/>`),
  play: sv(`<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>`),
  video: sv(`<rect x="2.5" y="5.5" width="13.5" height="13" rx="2.5" ${st}/><path d="M16 10.5l5.5-3.2v9.4L16 13.5" ${st}/><path d="M7.5 9.3v5.4l4.3-2.7z" fill="currentColor"/>`),
  trophy: sv(`<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8.5 20.5h7M9.5 17.5h5" ${st}/>`),
  music: sv(`<path d="M9 17V5l11-2v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="6.5" cy="17.5" r="3" fill="currentColor"/><circle cx="17.5" cy="15.5" r="3" fill="currentColor"/>`),
  sound: sv(`<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`),
  map: sv(`<path d="M3 6.5l5.5-2.5 7 2.5L21 4v13.5L15.5 20l-7-2.5L3 20z" ${st}/><path d="M8.5 4v13.5M15.5 6.5V20" ${st}/>`),
  book: sv(`<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z" ${st}/><path d="M6.5 9c1.4-1.3 3-1.3 2.6 0-.4 1.3-1.4 1.4-2.6 0zM6.3 9l-.8-.8M6.3 9l-.8.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`),
  bag: sv(`<path d="M5 8h14l-1.2 12H6.2z" ${st}/><path d="M9 10V7a3 3 0 0 1 6 0v3" ${st}/>`),
  gift: sv(`<rect x="3.5" y="9" width="17" height="11.5" rx="1.5" ${st}/><path d="M2.5 9h19M12 9v11.5M12 9c-1.5-4-6-5-6-2s6 2 6 2zM12 9c1.5-4 6-5 6-2s-6 2-6 2z" ${st}/>`),
  tasks: sv(`<rect x="5" y="4" width="14" height="17" rx="2" ${st}/><path d="M9 3h6v3H9zM8.5 11l1.5 1.5 3-3M8.5 16.5h7" ${st}/>`),
  bucket: sv(`<path d="M4.5 8h15l-1.8 12.5H6.3z" ${st}/><path d="M4.5 8C4.5 3 19.5 3 19.5 8" ${st}/><path d="M9.5 12.5c1.6-1.6 4-1.6 5.4 0-1.4 1.6-3.8 1.6-5.4 0zM9.3 12.5l-1.3-1M9.3 12.5l-1.3 1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`),
  smoke: sv(`<path d="M5 21V11l7-5 7 5v10z" ${st}/><path d="M9 21v-5h6v5M15 7V3.5h2.5V9" ${st}/><path d="M17 1.5c1 .5.5 1.3 1.5 1.8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`),
  sun: sv(`<circle cx="12" cy="12" r="4.6" fill="#ffc83a"/><path d="M12 2v2.6M12 19.4V22M22 12h-2.6M4.6 12H2M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8M19.1 19.1l-1.8-1.8M6.7 6.7L4.9 4.9" fill="none" stroke="#ffb020" stroke-width="2" stroke-linecap="round"/>`),
  cloud: sv(`<path d="M7 18.5a4.5 4.5 0 0 1-.4-9 6 6 0 0 1 11.4 1.6A3.7 3.7 0 0 1 17.6 18.5z" fill="#cfd8e0" stroke="#8a9aa8" stroke-width="1.4"/>`),
  rain: sv(`<path d="M7 14a4 4 0 0 1-.4-8 5.5 5.5 0 0 1 10.4 1.4A3.3 3.3 0 0 1 16.7 14z" fill="#b8c4ce" stroke="#7a8a98" stroke-width="1.4"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3" stroke="#4a9ad8" stroke-width="2" stroke-linecap="round"/>`),
  fog: sv(`<path d="M7 11.5a4 4 0 0 1-.4-8 5.5 5.5 0 0 1 10.4 1.4A3.3 3.3 0 0 1 16.7 11.5z" fill="#d6dde2" stroke="#9aa6b0" stroke-width="1.3"/><path d="M3.5 15h14M6.5 18.5h14M4.5 21.5h10" stroke="#9aa6b0" stroke-width="2" stroke-linecap="round"/>`),
  moon: sv(`<path d="M15.5 3.5a8.5 8.5 0 1 0 5 13.5 7 7 0 0 1-5-13.5z" fill="#f2e6a8" stroke="#c8b860" stroke-width="1.3"/>`),
  dawn: sv(`<path d="M5.5 16a6.5 6.5 0 0 1 13 0z" fill="#ffb04a"/><path d="M2 16.5h20M12 3v3.5M4.5 7.5l2.2 2.2M19.5 7.5l-2.2 2.2" fill="none" stroke="#f08a2a" stroke-width="2" stroke-linecap="round"/><path d="M5 20h14" stroke="#6aa8d8" stroke-width="2" stroke-linecap="round"/>`),
  stars: sv(`<path d="M12 3l1.9 4.6 4.9.4-3.7 3.2 1.1 4.8L12 13.5 7.8 16l1.1-4.8L5.2 8l4.9-.4z" fill="#f2d66a" stroke="#c8a830" stroke-width="1"/><path d="M19 15l.7 1.6 1.7.2-1.3 1.1.4 1.7-1.5-.9-1.5.9.4-1.7-1.3-1.1 1.7-.2zM5 16l.5 1.1 1.2.1-.9.8.3 1.2L5 18.6l-1.1.6.3-1.2-.9-.8 1.2-.1z" fill="#f2d66a"/>`),
  clock: sv(`<circle cx="12" cy="12" r="9" ${st}/><path d="M12 7v5.5l3.5 2" ${st}/>`),
  clover: sv(`<g fill="#4caf50"><circle cx="8.5" cy="8.5" r="3.6"/><circle cx="15.5" cy="8.5" r="3.6"/><circle cx="8.5" cy="15" r="3.6"/><circle cx="15.5" cy="15" r="3.6"/></g><path d="M12 12c1 4 3 7 5.5 9" fill="none" stroke="#2e7d32" stroke-width="1.8" stroke-linecap="round"/>`),
  paw: sv(`<g fill="currentColor"><ellipse cx="12" cy="16" rx="5" ry="4"/><circle cx="6" cy="10.5" r="2.2"/><circle cx="9.5" cy="6.5" r="2.2"/><circle cx="14.5" cy="6.5" r="2.2"/><circle cx="18" cy="10.5" r="2.2"/></g>`),
  hand: sv(`<path d="M9.5 13V5.2a1.6 1.6 0 0 1 3.2 0V11l4.6.9c1.2.2 2 1.4 1.8 2.6l-.9 5.3c-.2 1-1 1.7-2 1.7h-5.5c-.7 0-1.3-.3-1.7-.9l-3.3-4.7a1.6 1.6 0 0 1 2.4-2.1z" fill="#fff" stroke="#2a3a48" stroke-width="1.6" stroke-linejoin="round"/>`),
  plus: sv(`<path d="M12 5v14M5 12h14" ${st} stroke-width="3"/>`),
  fish: sv(`<path d="M3 12c3-4.5 9-5.5 13-2l4-3v10l-4-3c-4 3.5-10 2.5-13-2z" fill="currentColor"/><circle cx="7.5" cy="11.3" r="1.2" fill="#fff"/>`),
  // наживка
  worm: sv(`<path d="M4 15c2-4 5-4 6-1s3 3 4.5 0 4.5-3 5.5 1" fill="none" stroke="#e07a8a" stroke-width="3.6" stroke-linecap="round"/><path d="M8 13.4v2.2M12 14.7v2.2M16 13v2.2" stroke="#c0566a" stroke-width="1.2"/>`),
  maggot: sv(`<g fill="#f3ead2" stroke="#b8a77a" stroke-width="1.2"><ellipse cx="7.5" cy="9" rx="4" ry="2.4" transform="rotate(-25 7.5 9)"/><ellipse cx="15" cy="10" rx="4" ry="2.4" transform="rotate(20 15 10)"/><ellipse cx="11" cy="16" rx="4" ry="2.4" transform="rotate(-5 11 16)"/></g>`),
  corn: sv(`<path d="M12 3c4 2 5 9 1.5 16h-3C7 12 8 5 12 3z" fill="#f6cd3a" stroke="#c89a14" stroke-width="1.3"/><path d="M10 7.5h4M9.5 10.5h5M9.6 13.5h4.8M10.3 16.5h3.4M12 4v14" stroke="#c89a14" stroke-width="1"/><path d="M10.5 19c-3-1-5-4-5.5-8 3 1.5 4.5 4 5.5 8zM13.5 19c3-1 5-4 5.5-8-3 1.5-4.5 4-5.5 8z" fill="#6bb04a"/>`),
  spinner: sv(`<path d="M12 2.5v4" stroke="#8a9aa8" stroke-width="1.6"/><path d="M12 6.5c4 2.5 4 8 0 11-4-3-4-8.5 0-11z" fill="#d8dee4" stroke="#7a8a98" stroke-width="1.3"/><path d="M12 8.5c1.8 1.6 1.8 5 0 6.8" fill="none" stroke="#e8463a" stroke-width="1.6"/><path d="M12 17.5v2.5M10 21.5l2-1.5 2 1.5" fill="none" stroke="#4a5a68" stroke-width="1.5" stroke-linecap="round"/>`),
  jig: sv(`<path d="M12 2.5v5" stroke="#8a9aa8" stroke-width="1.6"/><circle cx="12" cy="11.5" r="4.5" fill="#ffd23a" stroke="#c8961a" stroke-width="1.4"/><circle cx="10.5" cy="10" r="1.3" fill="#fff8d0"/><path d="M12 16v3.5c0 1.5 2.5 1.5 2.5 0" fill="none" stroke="#4a5a68" stroke-width="1.5" stroke-linecap="round"/><path d="M5 6l1.2 1.2M19 6l-1.2 1.2M4 12h1.6M18.4 12H20" stroke="#ffcc3a" stroke-width="1.6" stroke-linecap="round"/>`),
  // снасти
  rod: sv(`<path d="M4 20L20 3.5" stroke="#8a5a2a" stroke-width="2.2" stroke-linecap="round"/><path d="M4 20l3.5-3.6" stroke="#3a2a1a" stroke-width="3.6" stroke-linecap="round"/><circle cx="9" cy="17" r="2.3" fill="#9aa8b4" stroke="#5a6a78" stroke-width="1.1"/><path d="M20 3.5c1 4 1 9-1 13" fill="none" stroke="#fff" stroke-width="1"/><path d="M18.4 16.5l.6 3.2" stroke="#e4382c" stroke-width="2.6" stroke-linecap="round"/>`),
  reel: sv(`<circle cx="12" cy="12" r="7" fill="#b8c4ce" stroke="#5a6a78" stroke-width="1.6"/><circle cx="12" cy="12" r="3.4" fill="#7a8a98"/><path d="M12 12l6.5-6.5" stroke="#3a4a58" stroke-width="2" stroke-linecap="round"/><circle cx="19" cy="5" r="2" fill="#e4382c"/>`),
  line: sv(`<circle cx="12" cy="12" r="8" fill="#e8f2f8" stroke="#6a9ab8" stroke-width="1.5"/><circle cx="12" cy="12" r="3" fill="#6a9ab8"/><path d="M6 9.5c3-1.3 9-1.3 12 0M5.4 13c3.5-1.2 9.7-1.2 13.2 0M7 16.4c3-1 7-1 10 0" fill="none" stroke="#9ac0d8" stroke-width="1.1"/>`),
};

// значок наживки и снасти по id
export const baitIc = (id) => IC[id] || IC.worm;
export const gearIc = (id) => ({ rod: IC.rod, reel: IC.reel, line: IC.line, net: IC.bucket, smoker: IC.smoke })[id];
export const weatherIc = (w, part) => (w === 'sun' && part === 'night' ? IC.stars : IC[w]);
export const partIc = (p) => (p === 'night' ? IC.moon : p === 'day' ? IC.sun : IC.dawn);
