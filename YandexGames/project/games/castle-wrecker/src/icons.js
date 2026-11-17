// SVG-иконки интерфейса
const s = (body, vb = '0 0 24 24') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

export const IC = {
  pause: s('<rect x="6" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2" fill="currentColor"/>'),
  play: s('<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>'),
  restart: s('<path d="M12 5a7 7 0 1 1-6.6 4.7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M3.5 4.5l1.9 5.6 5.5-2.1z" fill="currentColor"/>'),
  map: s('<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M9 4v14M15 6v14" stroke="currentColor" stroke-width="2"/>'),
  star: s('<path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.2 6.1 20.5l1.3-6.6L2.5 9.3l6.6-.8z" fill="currentColor"/>'),
  gold: s('<circle cx="12" cy="12" r="9.5" fill="#f2c230" stroke="#a87a10" stroke-width="2"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="#a87a10" stroke-width="1.6"/><path d="M12 8.5v7" stroke="#a87a10" stroke-width="1.6"/>'),
  sound: s('<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  music: s('<path d="M9 17V5l11-2v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="6.5" cy="17.5" r="3" fill="currentColor"/><circle cx="17.5" cy="15.5" r="3" fill="currentColor"/>'),
  gear: s('<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.5 5.2v-3.4l-2.4-.6a6.5 6.5 0 0 0-.7-1.6l1.3-2.1-2.4-2.4-2.1 1.3a6.5 6.5 0 0 0-1.6-.7L12.1 2h-3.4l-.6 2.4a6.5 6.5 0 0 0-1.6.7L4.4 3.8 2 6.2l1.3 2.1a6.5 6.5 0 0 0-.7 1.6L.2 10.4" fill="none"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
  trophy: s('<path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H3.5v1.5A3.5 3.5 0 0 0 7 10M17 5h3.5v1.5A3.5 3.5 0 0 1 17 10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.5 14h3v3.5h-3zM7.5 18h9v3h-9z" fill="currentColor"/>'),
  shop: s('<path d="M4 9h16l-1.3 11H5.3z" fill="currentColor"/><path d="M8.5 9V7a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" stroke-width="2.2"/>'),
  gift: s('<rect x="3" y="9" width="18" height="4" rx="1" fill="currentColor"/><rect x="4.5" y="13" width="15" height="8" rx="1" fill="currentColor"/><path d="M12 9v12" stroke="#fff6" stroke-width="2.2"/><path d="M12 9C10 4 6 4.5 7 7.5 7.6 9 12 9 12 9zM12 9c2-5 6-4.5 5-1.5C16.4 9 12 9 12 9z" fill="none" stroke="currentColor" stroke-width="2"/>'),
  ad: s('<rect x="2.5" y="5" width="19" height="14" rx="3" fill="currentColor"/><path d="M10 9v6l5-3z" fill="#fff"/>'),
  lock: s('<rect x="5" y="10.5" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.4"/>'),
  close: s('<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'),
  check: s('<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
  plus: s('<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>'),
  back: s('<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
  eye: s('<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/>'),
  arcLow: s('<path d="M3 18C8 10 15 8.5 21 10" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0.1 4.2"/><circle cx="3.5" cy="18" r="2.2" fill="currentColor"/><path d="M18 7l3.5 3-4 1.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  arcHigh: s('<path d="M3 19C6 4 17 2 20.5 17" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="0.1 4.2"/><circle cx="3.2" cy="19" r="2.2" fill="currentColor"/><path d="M17.5 15.5l3 3 1.4-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'),
  goblin: s('<path d="M2 9l5 1.5M22 9l-5 1.5" stroke="#4f9a35" stroke-width="3" stroke-linecap="round"/><rect x="6" y="5" width="12" height="14" rx="3" fill="#74c24f"/><rect x="8" y="10" width="3" height="2.6" fill="#fff"/><rect x="13" y="10" width="3" height="2.6" fill="#fff"/><rect x="9.5" y="10.6" width="1.5" height="2" fill="#222"/><rect x="13" y="10.6" width="1.5" height="2" fill="#222"/><rect x="8.5" y="15" width="7" height="1.8" fill="#3a1a12"/>'),
  crown: s('<path d="M3 18l1.5-10 4.5 4.5L12 5l3 7.5L19.5 8 21 18z" fill="#f2c230" stroke="#a87a10" stroke-width="1.4" stroke-linejoin="round"/>'),
  trophyGold: s('<path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="#f2c230"/><path d="M7 5H3.5v1.5A3.5 3.5 0 0 0 7 10M17 5h3.5v1.5A3.5 3.5 0 0 1 17 10" fill="none" stroke="#f2c230" stroke-width="2"/><path d="M10.5 14h3v3.5h-3zM7.5 18h9v3h-9z" fill="#c8961a"/>'),
};

// иконки снарядов
export const AMMO_IC = {
  stone: s('<circle cx="12" cy="12" r="8.5" fill="#a39f95" stroke="#6d6a62" stroke-width="2"/><circle cx="9" cy="9" r="2" fill="#c4c0b6"/><circle cx="14.5" cy="14" r="1.5" fill="#86827a"/>'),
  iron: s('<circle cx="12" cy="12" r="8.5" fill="#4a4f58" stroke="#2a2d33" stroke-width="2"/><circle cx="9" cy="9" r="2.4" fill="#8a909a"/>'),
  bomb: s('<circle cx="11" cy="13.5" r="7.5" fill="#2a2a30" stroke="#111" stroke-width="1.5"/><rect x="13.5" y="4.5" width="4" height="4" rx="1" transform="rotate(45 15.5 6.5)" fill="#6a6a70"/><path d="M17 5c1-2 3-2 3.5-1" stroke="#a07a40" stroke-width="1.6" fill="none"/><circle cx="21" cy="3.5" r="1.8" fill="#ffd040"/><circle cx="8.5" cy="11" r="1.8" fill="#6a6a78"/>'),
  split: s('<circle cx="8" cy="9" r="4.5" fill="#8a7a5a" stroke="#5a4e38" stroke-width="1.5"/><circle cx="16" cy="9" r="4.5" fill="#8a7a5a" stroke="#5a4e38" stroke-width="1.5"/><circle cx="12" cy="16" r="4.5" fill="#8a7a5a" stroke="#5a4e38" stroke-width="1.5"/><path d="M8 9h8M12 9v7" stroke="#e8c040" stroke-width="1.4"/>'),
  fire: s('<path d="M12 2.5c1 4 6 5.5 6 11a6 6 0 0 1-12 0c0-3 1.5-4.5 2.5-5.5.3 2 1.2 3 2 3C10 8 11 5 12 2.5z" fill="#ff7a20" stroke="#c84010" stroke-width="1.4"/><path d="M12 11c.5 2 3 2.6 3 5a3 3 0 0 1-6 0c0-1.3.8-2 1.3-2.5.2.9.6 1.3 1 1.3-.3-1.5.2-2.8.7-3.8z" fill="#ffe060"/>'),
};
