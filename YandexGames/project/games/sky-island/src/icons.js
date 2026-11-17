// SVG-иконки интерфейса
const s = (body, vb = '0 0 24 24') => `<svg viewBox="${vb}" class="ic" aria-hidden="true">${body}</svg>`;

export const IC = {
  coins: s('<circle cx="12" cy="12.8" r="8.6" fill="#d99a1e"/><circle cx="12" cy="11.6" r="8.6" fill="#ffd25a"/><circle cx="12" cy="11.6" r="5.6" fill="none" stroke="#e8a92a" stroke-width="1.6"/><path d="M9 8.5c1-1 2.4-1.4 3.8-1" stroke="#fff6cf" stroke-width="1.6" fill="none" stroke-linecap="round"/>'),
  wood: s('<rect x="3" y="9" width="18" height="7" rx="3.5" fill="#c58a5a"/><ellipse cx="19" cy="12.5" rx="2.6" ry="3.5" fill="#f2cf9a"/><ellipse cx="19" cy="12.5" rx="1.2" ry="1.7" fill="#d6a46c"/><rect x="4" y="4" width="13" height="5" rx="2.5" fill="#a8703f"/><ellipse cx="16" cy="6.5" rx="2" ry="2.5" fill="#f2cf9a"/>'),
  stone: s('<path d="M3 17l3-8 6-3 7 3 2 8-6 3z" fill="#a8a199"/><path d="M6 9l6-3 7 3-5 3z" fill="#d6d0c8"/><path d="M14 12l5-3 2 8-6 3z" fill="#8f8880"/>'),
  crystals: s('<path d="M12 2l6 6-6 14-6-14z" fill="#8fe6ff"/><path d="M12 2l6 6h-12z" fill="#c9f4ff"/><path d="M12 8v14l6-14z" fill="#5fc8ec"/>'),
  pop: s('<circle cx="9" cy="8" r="3.4" fill="#f3c9a1"/><rect x="5" y="12" width="8" height="8" rx="3" fill="#78a6e3"/><circle cx="16.5" cy="9.5" r="2.8" fill="#f3c9a1"/><rect x="13.3" y="13" width="6.4" height="7" rx="2.6" fill="#f28fb0"/>'),
  cozy: s('<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" fill="#ff8fab"/><path d="M8.5 8.5a2 2 0 012-1" stroke="#ffd4de" stroke-width="1.6" fill="none" stroke-linecap="round"/>'),
  hammer: s('<rect x="10.5" y="9" width="3" height="12" rx="1.5" fill="#c58a5a" transform="rotate(-40 12 15)"/><rect x="5" y="4" width="11" height="6" rx="2" fill="#8a96a8" transform="rotate(-40 10.5 7)"/>'),
  gear: s('<path d="M12 3l1.6 2.4 2.8-.6.8 2.8 2.6 1.2-.9 2.7 1.6 2.4-2.4 1.6.2 2.9-2.9.2-1.4 2.5-2.6-1.3-2.6 1.3-1.4-2.5-2.9-.2.2-2.9L3 14.5l1.6-2.4-.9-2.7 2.6-1.2.8-2.8 2.8.6z" fill="#9aa7bb"/><circle cx="12" cy="12" r="3.2" fill="#fff"/>'),
  trophy: s('<path d="M7 3h10v5a5 5 0 01-10 0z" fill="#ffd25a"/><path d="M7 5H4a3 3 0 003 4M17 5h3a3 3 0 01-3 4" stroke="#e8a92a" stroke-width="1.8" fill="none"/><rect x="10.5" y="12" width="3" height="5" fill="#e8a92a"/><rect x="7" y="17" width="10" height="4" rx="1.5" fill="#c58a5a"/>'),
  scroll: s('<rect x="5" y="3" width="14" height="18" rx="2.5" fill="#fff2cf"/><rect x="5" y="3" width="14" height="18" rx="2.5" fill="none" stroke="#e0b96a" stroke-width="1.6"/><path d="M8 8h8M8 12h8M8 16h5" stroke="#c99a4a" stroke-width="1.8" stroke-linecap="round"/>'),
  clock: s('<circle cx="12" cy="12" r="9" fill="#fff"/><circle cx="12" cy="12" r="9" fill="none" stroke="#78a6e3" stroke-width="2"/><path d="M12 7v5l3 2" stroke="#4a6fa8" stroke-width="2" stroke-linecap="round" fill="none"/>'),
  ad: s('<rect x="2.5" y="5" width="19" height="14" rx="3.5" fill="#fff"/><path d="M10 9v6l5-3z" fill="#f2786b"/>'),
  check: s('<path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  close: s('<path d="M6 6l12 12M18 6L6 18" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>'),
  closeD: s('<path d="M7 7l10 10M17 7L7 17" stroke="#8a93a6" stroke-width="2.8" stroke-linecap="round"/>'),
  rotate: s('<path d="M18.5 9A7 7 0 106 17" stroke="#fff" stroke-width="2.8" fill="none" stroke-linecap="round"/><path d="M19.5 3.5v6h-6" stroke="#fff" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  move: s('<path d="M12 3v18M3 12h18" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  up: s('<path d="M12 4l7 8h-4.5v8h-5v-8H5z" fill="#fff"/>'),
  lock: s('<rect x="5" y="10" width="14" height="11" rx="3" fill="#b8c0cf"/><path d="M8 10V7.5a4 4 0 018 0V10" stroke="#b8c0cf" stroke-width="2.6" fill="none"/><circle cx="12" cy="15.5" r="1.8" fill="#fff"/>'),
  feather: s('<path d="M19 3C11 4 6 10 6 18l2 0c1-5 4-9 8-12-3 3-5 7-6 12 6-2 9-8 9-15z" fill="#b49cf0"/><path d="M6 21l3-6" stroke="#8a74d6" stroke-width="1.8" stroke-linecap="round"/>'),
  star: s('<path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="#ffd25a"/>'),
  gift: s('<rect x="3" y="9" width="18" height="12" rx="2" fill="#f28fb0"/><rect x="2" y="7" width="20" height="4" rx="1.5" fill="#ff9fbd"/><rect x="10.8" y="7" width="2.4" height="14" fill="#ffd25a"/><path d="M12 7c-2-4-6-3-5 0M12 7c2-4 6-3 5 0" stroke="#ffd25a" stroke-width="2" fill="none"/>'),
  plot: s('<path d="M2 14l10-5 10 5-10 5z" fill="#8fd16a"/><path d="M2 14v2l10 5v-2zM22 14v2l-10 5v-2z" fill="#b58a5e"/><path d="M12 3v6" stroke="#f2786b" stroke-width="2" stroke-linecap="round"/><path d="M12 3l5 2-5 2z" fill="#f2786b"/>'),
  music: s('<path d="M9 18V5l11-2v13" stroke="#fff" stroke-width="2.4" fill="none" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="3" fill="#fff"/><circle cx="17.5" cy="16" r="3" fill="#fff"/>'),
  sound: s('<path d="M4 9h4l5-4v14l-5-4H4z" fill="#fff"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>'),
  builder: s('<circle cx="12" cy="8" r="3.5" fill="#f3c9a1"/><path d="M7.5 7a4.5 4.5 0 019 0z" fill="#ffd25a"/><rect x="6.5" y="12" width="11" height="9" rx="3.5" fill="#f5a35c"/>'),
};

export const resIcon = (r) => IC[r] || '';
