// Рисованные иконки (SVG), один стиль: толстый тёмный контур, тёплые цвета
const S = (body, vb = '0 0 32 32') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const IC = {
  key: S(`<circle cx="9" cy="16" r="6" fill="#e0b048" stroke="#2a1a0c" stroke-width="2.4"/><circle cx="9" cy="16" r="2.2" fill="#2a1a0c"/><path d="M15 16h13M24 16v5M28 16v4" fill="none" stroke="#2a1a0c" stroke-width="5"/><path d="M15 16h13M24 16v5M28 16v4" fill="none" stroke="#e0b048" stroke-width="2.4"/>`),
  keyEmpty: S(`<circle cx="9" cy="16" r="6" fill="none" stroke="#8a7a68" stroke-width="2.2" stroke-dasharray="3 2.5"/><path d="M15 16h13M24 16v5M28 16v4" fill="none" stroke="#8a7a68" stroke-width="2.2" stroke-dasharray="3 2.5"/>`),
  torch: S(`<path d="M5 13h12l6-4v14l-6-4H5z" fill="#4a4a50" stroke="#151418" stroke-width="2"/><rect x="8" y="14" width="5" height="4" rx="1" fill="#c8a040"/><path d="M25 10l4-2M25 16h5M25 22l4 2" stroke="#ffe0a0" stroke-width="2.2"/>`),
  torchOff: S(`<path d="M5 13h12l6-4v14l-6-4H5z" fill="#3a3a40" stroke="#151418" stroke-width="2"/><rect x="8" y="14" width="5" height="4" rx="1" fill="#6a5a3a"/><path d="M4 26L28 6" stroke="#c84a3a" stroke-width="2.6"/>`),
  bolt: S(`<path d="M18 3L7 18h8l-2 11 12-16h-8z" fill="#fff0b0" stroke="#2a1a0c" stroke-width="2"/>`),
  hand: S(`<path d="M10 17V8a2 2 0 014 0v7V6a2 2 0 014 0v9V8a2 2 0 014 0v10c0 6-3 10-8 10s-7-3-9-7l-2-4a2 2 0 013-2l2 3z" fill="#e8d4b8" stroke="#2a1a0c" stroke-width="2"/>`),
  door: S(`<rect x="8" y="4" width="16" height="25" rx="1" fill="#7a5234" stroke="#2a1a0c" stroke-width="2"/><rect x="11" y="7" width="10" height="8" fill="#5a3a24"/><rect x="11" y="17" width="10" height="9" fill="#5a3a24"/><circle cx="20" cy="17" r="1.4" fill="#e0b048"/>`),
  wardrobe: S(`<rect x="6" y="3" width="20" height="26" rx="1" fill="#5a3a24" stroke="#2a1a0c" stroke-width="2"/><path d="M16 4v24" stroke="#2a1a0c" stroke-width="1.6"/><path d="M9 8h5M9 10.5h5M9 13h5M18 8h5M18 10.5h5M18 13h5" stroke="#1a100a" stroke-width="1.4"/><circle cx="14" cy="17" r="1.2" fill="#e0b048"/><circle cx="18" cy="17" r="1.2" fill="#e0b048"/>`),
  run: S(`<circle cx="20" cy="6" r="3.2" fill="#e8d4b8" stroke="#2a1a0c" stroke-width="2"/><path d="M12 13l6-2 3 5 5 1M18 11l-3 8 5 4-2 6M15 19l-6 3" fill="none" stroke="#e8d4b8" stroke-width="3.6"/><path d="M12 13l6-2 3 5 5 1M18 11l-3 8 5 4-2 6M15 19l-6 3" fill="none" stroke="#2a1a0c" stroke-width="1.2"/>`),
  pause: S(`<rect x="9" y="7" width="5" height="18" rx="1.5" fill="#e8dcc0"/><rect x="18" y="7" width="5" height="18" rx="1.5" fill="#e8dcc0"/>`),
  coin: S(`<circle cx="16" cy="16" r="12" fill="#e0b048" stroke="#2a1a0c" stroke-width="2.4"/><circle cx="16" cy="16" r="8" fill="none" stroke="#a87a20" stroke-width="1.6"/><path d="M13 12a4 4 0 106 0M16 10v12" fill="none" stroke="#7a5214" stroke-width="2"/>`),
  lock: S(`<path d="M10 14v-4a6 6 0 0112 0v4" fill="none" stroke="#2a1a0c" stroke-width="3"/><rect x="7" y="14" width="18" height="14" rx="2" fill="#c8a040" stroke="#2a1a0c" stroke-width="2.4"/><circle cx="16" cy="20" r="2" fill="#2a1a0c"/><path d="M16 21v3" stroke="#2a1a0c" stroke-width="2"/>`),
  check: S(`<path d="M6 17l6 6L26 8" fill="none" stroke="#5a8a3a" stroke-width="4"/>`),
  gear: S(`<path d="M16 3l3 3 4-1 1 4 4 2-2 4 2 4-4 2-1 4-4-1-3 3-3-3-4 1-1-4-4-2 2-4-2-4 4-2 1-4 4 1z" fill="#8a8070" stroke="#2a1a0c" stroke-width="2"/><circle cx="16" cy="16" r="4" fill="#2a1a0c"/>`),
  trophy: S(`<path d="M10 5h12v6a6 6 0 01-12 0z" fill="#e0b048" stroke="#2a1a0c" stroke-width="2"/><path d="M10 7H5c0 5 3 7 6 7M22 7h5c0 5-3 7-6 7" fill="none" stroke="#2a1a0c" stroke-width="2"/><path d="M16 17v5M11 27h10l-1-5h-8z" fill="#c8902c" stroke="#2a1a0c" stroke-width="2"/>`),
  bag: S(`<path d="M6 12h20l-2 16H8z" fill="#8a5a3a" stroke="#2a1a0c" stroke-width="2"/><path d="M11 12V9a5 5 0 0110 0v3" fill="none" stroke="#2a1a0c" stroke-width="2.4"/><circle cx="16" cy="20" r="3" fill="#e0b048" stroke="#2a1a0c" stroke-width="1.4"/>`),
  moon: S(`<path d="M20 4a12 12 0 1 0 8 18A10 10 0 0 1 20 4z" fill="#e8dcc0" stroke="#2a1a0c" stroke-width="2"/><circle cx="12" cy="15" r="1.6" fill="#b0a488"/><circle cx="15" cy="22" r="1.2" fill="#b0a488"/>`),
  back: S(`<path d="M20 6L9 16l11 10" fill="none" stroke="#e8dcc0" stroke-width="4"/>`),
  close: S(`<path d="M8 8l16 16M24 8L8 24" stroke="#2a1a0c" stroke-width="3.6"/>`),
  plus: S(`<path d="M16 7v18M7 16h18" stroke="#fff" stroke-width="4.5"/>`),
  ad: S(`<rect x="3" y="7" width="26" height="18" rx="4" fill="#3a6a4a" stroke="#2a1a0c" stroke-width="2"/><path d="M13 11v10l9-5z" fill="#fff"/>`),
  map: S(`<path d="M4 7l8-3 8 3 8-3v21l-8 3-8-3-8 3z" fill="#e8dcc0" stroke="#2a1a0c" stroke-width="2"/><path d="M12 4v21M20 7v21" stroke="#2a1a0c" stroke-width="1.6"/><path d="M7 14l3 2M23 18l2-3" stroke="#a83a2a" stroke-width="2"/>`),
  skull: S(`<path d="M16 4C9 4 5 9 5 15c0 4 2 6 4 7v4h14v-4c2-1 4-3 4-7 0-6-4-11-11-11z" fill="#e8dcc0" stroke="#2a1a0c" stroke-width="2"/><circle cx="11.5" cy="15" r="3" fill="#2a1a0c"/><circle cx="20.5" cy="15" r="3" fill="#2a1a0c"/><path d="M16 19l-1.5 3h3z" fill="#2a1a0c"/>`),
};
