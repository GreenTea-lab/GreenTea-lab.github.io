// Значки интерфейса (SVG), рисованные «от руки» под тёплый деревянный стиль
const S = (body, vb = '0 0 48 48') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const INK = '#3b2412';

export const IC = {
  coin: S(`<circle cx="24" cy="24" r="19" fill="#f6c443" stroke="#9a6514" stroke-width="3.5"/><circle cx="24" cy="24" r="12.5" fill="none" stroke="#d99a1c" stroke-width="3"/><path d="M24 16v16" stroke="#9a6514" stroke-width="4"/><path d="M14 14a14 14 0 0 1 8-4" stroke="#fff3c0" stroke-width="3" fill="none"/>`),
  star: S(`<path d="M24 4.5l5.9 12.2 13.3 1.9-9.6 9.3 2.3 13.2L24 34.8l-11.9 6.3 2.3-13.2-9.6-9.3 13.3-1.9z" fill="#f6c443" stroke="#9a6514" stroke-width="3"/><path d="M17 17l4-1" stroke="#fff3c0" stroke-width="3"/>`),
  starEmpty: S(`<path d="M24 4.5l5.9 12.2 13.3 1.9-9.6 9.3 2.3 13.2L24 34.8l-11.9 6.3 2.3-13.2-9.6-9.3 13.3-1.9z" fill="#d9c3a0" stroke="#9a7a55" stroke-width="3"/>`),
  crown: S(`<path d="M7 36l-2-22 11 9 8-14 8 14 11-9-2 22z" fill="#f6c443" stroke="#9a6514" stroke-width="3"/><rect x="7" y="36" width="34" height="6" rx="2" fill="#e0a93a" stroke="#9a6514" stroke-width="3"/>`),
  pause: S(`<rect x="13" y="11" width="8" height="26" rx="3" fill="${INK}"/><rect x="27" y="11" width="8" height="26" rx="3" fill="${INK}"/>`),
  menu: S(`<path d="M11 15h26M11 24h26M11 33h26" stroke="${INK}" stroke-width="5"/>`),
  back: S(`<path d="M28 11L15 24l13 13" stroke="${INK}" stroke-width="6" fill="none"/>`),
  close: S(`<path d="M14 14l20 20M34 14L14 34" stroke="${INK}" stroke-width="6"/>`),
  play: S(`<path d="M16 10l22 14-22 14z" fill="#fff" stroke="#fff" stroke-width="4"/>`),
  hint: S(`<path d="M24 6a13 13 0 0 0-7 24c1.5 1 2 2.5 2 4v2h10v-2c0-1.5.5-3 2-4a13 13 0 0 0-7-24z" fill="#ffe27a" stroke="#9a6514" stroke-width="3"/><rect x="19" y="38" width="10" height="5" rx="2" fill="#a8a29a" stroke="#6a6258" stroke-width="2.5"/><path d="M19 15a7 7 0 0 1 5-3" stroke="#fff" stroke-width="3" fill="none"/>`),
  undo: S(`<path d="M18 13L8 22l10 9" stroke="#2f6fb8" stroke-width="6" fill="none"/><path d="M9 22h18a11 11 0 0 1 0 22h-6" stroke="#2f6fb8" stroke-width="6" fill="none"/>`),
  hammer: S(`<path d="M27 21L11 39a3.5 3.5 0 0 0 5 5l18-16z" fill="#c98a4a" stroke="#6a3a14" stroke-width="3"/><path d="M20 12l9-6 13 13-6 9z" fill="#9aa3ad" stroke="#4a525c" stroke-width="3"/><path d="M24 9l14 14" stroke="#cfd6de" stroke-width="2.5"/>`),
  shuffle: S(`<path d="M38 18a15 15 0 0 0-27-3" stroke="#3f8f3a" stroke-width="5.5" fill="none"/><path d="M39 8v11H28" stroke="#3f8f3a" stroke-width="5.5" fill="none"/><path d="M10 30a15 15 0 0 0 27 3" stroke="#3f8f3a" stroke-width="5.5" fill="none"/><path d="M9 40V29h11" stroke="#3f8f3a" stroke-width="5.5" fill="none"/>`),
  ad: S(`<rect x="5" y="11" width="38" height="26" rx="6" fill="#4a90e2" stroke="#1f5fa8" stroke-width="3"/><path d="M20 17v14l12-7z" fill="#fff"/>`),
  gift: S(`<rect x="7" y="20" width="34" height="22" rx="3" fill="#e0574c" stroke="#7a2a20" stroke-width="3"/><rect x="5" y="13" width="38" height="9" rx="2.5" fill="#ef7a6a" stroke="#7a2a20" stroke-width="3"/><path d="M24 13v29" stroke="#f6c443" stroke-width="6"/><path d="M24 13c-4-8-13-8-12-2 1 4 8 3 12 2zM24 13c4-8 13-8 12-2-1 4-8 3-12 2z" fill="#f6c443" stroke="#9a6514" stroke-width="2.5"/>`),
  shop: S(`<path d="M9 18h30l-3 22H12z" fill="#e0a85a" stroke="#6a3a14" stroke-width="3"/><path d="M17 18a7 7 0 0 1 14 0" stroke="#6a3a14" stroke-width="3.5" fill="none"/><circle cx="24" cy="29" r="5" fill="#f6c443" stroke="#9a6514" stroke-width="2.5"/>`),
  trophy: S(`<path d="M15 7h18v10a9 9 0 0 1-18 0z" fill="#f6c443" stroke="#9a6514" stroke-width="3"/><path d="M15 10H8a7 7 0 0 0 7 8M33 10h7a7 7 0 0 1-7 8" stroke="#9a6514" stroke-width="3" fill="none"/><path d="M24 26v8" stroke="#9a6514" stroke-width="4"/><rect x="14" y="34" width="20" height="8" rx="2" fill="#a86a3a" stroke="#5a3214" stroke-width="3"/>`),
  gear: S(`<path d="M24 6l3.5 4.5 5.6-1.2.9 5.7 5 2.8-2.5 5.2 2.5 5.2-5 2.8-.9 5.7-5.6-1.2L24 42l-3.5-4.5-5.6 1.2-.9-5.7-5-2.8 2.5-5.2L9 19.8l5-2.8.9-5.7 5.6 1.2z" fill="#c9b08a" stroke="${INK}" stroke-width="3"/><circle cx="24" cy="24" r="6" fill="#fff5e1" stroke="${INK}" stroke-width="3"/>`),
  sound: S(`<path d="M8 19h7l9-8v26l-9-8H8z" fill="#c9b08a" stroke="${INK}" stroke-width="3"/><path d="M31 17a9 9 0 0 1 0 14M35 12a15 15 0 0 1 0 24" stroke="${INK}" stroke-width="3.5" fill="none"/>`),
  music: S(`<path d="M18 34V12l20-4v22" stroke="${INK}" stroke-width="3.5" fill="none"/><ellipse cx="13" cy="35" rx="6" ry="5" fill="#c9b08a" stroke="${INK}" stroke-width="3"/><ellipse cx="33" cy="31" rx="6" ry="5" fill="#c9b08a" stroke="${INK}" stroke-width="3"/>`),
  lock: S(`<rect x="10" y="21" width="28" height="21" rx="5" fill="#c9a06a" stroke="#5a3214" stroke-width="3"/><path d="M16 21v-5a8 8 0 0 1 16 0v5" stroke="#5a3214" stroke-width="4" fill="none"/><circle cx="24" cy="31" r="3" fill="#5a3214"/>`),
  check: S(`<path d="M10 25l9 9 19-20" stroke="#fff" stroke-width="6" fill="none"/>`),
  blocks: S(`<rect x="6" y="24" width="17" height="17" rx="4" fill="#e0574c" stroke="#7a2a20" stroke-width="2.5"/><rect x="25" y="24" width="17" height="17" rx="4" fill="#3f8fd8" stroke="#1f4f88" stroke-width="2.5"/><rect x="15" y="6" width="17" height="17" rx="4" fill="#f3c13a" stroke="#8a6a10" stroke-width="2.5"/>`),
  book: S(`<path d="M24 12c-5-4-12-4-17-2v28c5-2 12-2 17 2 5-4 12-4 17-2V10c-5-2-12-2-17 2z" fill="#fff5e1" stroke="${INK}" stroke-width="3"/><path d="M24 12v28" stroke="${INK}" stroke-width="3"/>`),
  home: S(`<path d="M8 23L24 9l16 14" stroke="${INK}" stroke-width="4.5" fill="none"/><path d="M12 21v19h24V21" fill="#e0a85a" stroke="${INK}" stroke-width="3.5"/><rect x="20" y="28" width="8" height="12" fill="#7a4826"/>`),
  restart: S(`<path d="M38 24a14 14 0 1 1-4-10" stroke="${INK}" stroke-width="5" fill="none"/><path d="M36 6v10H26" stroke="${INK}" stroke-width="5" fill="none"/>`),
  leaf: S(`<path d="M24 6c10 6 14 18 4 30-2 2-6 2-8 0C10 24 14 12 24 6z" fill="#e8742a" stroke="#7a2a10" stroke-width="3"/><path d="M24 12v30" stroke="#7a2a10" stroke-width="3"/>`),
  snow: S(`<path d="M24 5v38M7.5 14.5l33 19M7.5 33.5l33-19" stroke="#3d8ad6" stroke-width="4"/><path d="M18 9l6 5 6-5M18 39l6-5 6 5" stroke="#3d8ad6" stroke-width="3" fill="none"/>`),
  flower: S(`<g fill="#ec6f9a" stroke="#8a2a4a" stroke-width="2.5"><circle cx="24" cy="13" r="7"/><circle cx="34" cy="21" r="7"/><circle cx="30" cy="33" r="7"/><circle cx="18" cy="33" r="7"/><circle cx="14" cy="21" r="7"/></g><circle cx="24" cy="24" r="6" fill="#f6c443" stroke="#9a6514" stroke-width="2.5"/>`),
  sun: S(`<circle cx="24" cy="24" r="9" fill="#f6c443" stroke="#9a6514" stroke-width="3"/><g stroke="#e0a020" stroke-width="4"><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M38 10l-4 4M14 34l-4 4"/></g>`),
  hand: S(`<path d="M20 44c-5-2-9-8-11-13-1-3 2-5 4-3l4 4V10a3.5 3.5 0 0 1 7 0v13-3a3.5 3.5 0 0 1 7 0v3-1a3.5 3.5 0 0 1 7 0v3a3.5 3.5 0 0 1 7 0v9c0 7-4 12-9 13z" fill="#fff5e1" stroke="${INK}" stroke-width="2.8"/>`, '0 0 52 48'),
};
IC.wave = S(`<path d="M4 20c5-7 9-7 14 0s9 7 14 0 8-5 12-1" stroke="#2a8fb8" stroke-width="4.5" fill="none"/><path d="M4 32c5-7 9-7 14 0s9 7 14 0 8-5 12-1" stroke="#5ac0d0" stroke-width="4.5" fill="none"/>`);
IC.flags = S(`<path d="M4 10q20 10 40 0" stroke="#4a3220" stroke-width="2.5" fill="none"/><path d="M8 13l6 14 5-12z" fill="#e0453a" stroke="#7a2a18" stroke-width="2"/><path d="M20 17l6 14 5-13z" fill="#f6c443" stroke="#9a6514" stroke-width="2"/><path d="M31 18l6 14 5-14z" fill="#3f8fd8" stroke="#1f4f88" stroke-width="2"/>`);
IC.tree = S(`<path d="M24 5l11 15h-6l9 12H10l9-12h-6z" fill="#3f8f45" stroke="#1d5a2a" stroke-width="3"/><rect x="21" y="32" width="6" height="10" rx="1.5" fill="#8a5a2a" stroke="#4a2c10" stroke-width="2.5"/>`);
IC.moon = S(`<path d="M30 6a18 18 0 1 0 12 28A15 15 0 0 1 30 6z" fill="#f6d870" stroke="#9a7a20" stroke-width="3"/><path d="M38 8l1.5 3.5L43 13l-3.5 1.5L38 18l-1.5-3.5L33 13l3.5-1.5z" fill="#fff6c0"/>`);
export const SEASON_IC = { autumn: IC.leaf, winter: IC.snow, spring: IC.flower, summer: IC.sun, sea: IC.wave, fair: IC.flags, forest: IC.tree, night: IC.moon };
