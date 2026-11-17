// SVG-иконки и портреты соперников (рисованные, тёплый контур)
const O = '#3a2314';
const sv = (body, vb = '0 0 48 48') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;
export const IC = {
  coin: sv(`<circle cx="24" cy="24" r="18" fill="#f2c14e" stroke="${O}" stroke-width="3"/><circle cx="24" cy="24" r="11.5" fill="none" stroke="#c48a1c" stroke-width="2.5"/><path d="M24 15l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6-5-2.9-5 2.9 1.2-5.6-4.2-3.8 5.6-.6z" fill="#fff0b8" stroke="#c48a1c" stroke-width="1.5"/>`),
  star: sv(`<path d="M24 4l6 12.5 13.6 2-9.8 9.6 2.3 13.6L24 35.3l-12.1 6.4 2.3-13.6-9.8-9.6 13.6-2z" fill="#f2c14e" stroke="${O}" stroke-width="3"/>`),
  close: sv(`<path d="M14 14l20 20M34 14L14 34" stroke="${O}" stroke-width="5.5"/>`),
  pause: sv(`<rect x="14" y="12" width="7" height="24" rx="2.5" fill="${O}"/><rect x="27" y="12" width="7" height="24" rx="2.5" fill="${O}"/>`),
  gear: sv(`<path d="M24 6l4 1 1 5 4 2 4-3 4 4-3 4 2 4 5 1v6l-5 1-2 4 3 4-4 4-4-3-4 2-1 5h-6l-1-5-4-2-4 3-4-4 3-4-2-4-5-1v-6l5-1 2-4-3-4 4-4 4 3 4-2 1-5z" fill="#f4e3c1" stroke="${O}" stroke-width="3"/><circle cx="24" cy="24" r="6" fill="#c9973c" stroke="${O}" stroke-width="3"/>`),
  trophy: sv(`<path d="M15 8h18v9a9 9 0 0 1-18 0z" fill="#f2c14e" stroke="${O}" stroke-width="3"/><path d="M15 11H8a6 6 0 0 0 7 8M33 11h7a6 6 0 0 1-7 8" fill="none" stroke="${O}" stroke-width="3"/><path d="M24 26v7M16 40h16l-2-7H18z" fill="#c9973c" stroke="${O}" stroke-width="3"/>`),
  gift: sv(`<rect x="8" y="20" width="32" height="20" rx="3" fill="#b8343a" stroke="${O}" stroke-width="3"/><rect x="6" y="14" width="36" height="8" rx="3" fill="#d24a4f" stroke="${O}" stroke-width="3"/><path d="M24 14v26" stroke="#f2c14e" stroke-width="5"/><path d="M24 14c-4-8-12-6-9-1 2 2 9 1 9 1zM24 14c4-8 12-6 9-1-2 2-9 1-9 1z" fill="#f2c14e" stroke="${O}" stroke-width="2.5"/>`),
  film: sv(`<rect x="6" y="11" width="36" height="26" rx="5" fill="#2f8f8a" stroke="${O}" stroke-width="3"/><path d="M20 18l10 6-10 6z" fill="#fff" stroke="${O}" stroke-width="2.5"/>`),
  music: sv(`<path d="M18 34V12l20-5v22" fill="none" stroke="${O}" stroke-width="4"/><circle cx="13" cy="35" r="6" fill="#f2c14e" stroke="${O}" stroke-width="3"/><circle cx="33" cy="30" r="6" fill="#f2c14e" stroke="${O}" stroke-width="3"/>`),
  sound: sv(`<path d="M8 19h8l10-8v26l-10-8H8z" fill="#f2c14e" stroke="${O}" stroke-width="3"/><path d="M32 17a9 9 0 0 1 0 14M36 12a15 15 0 0 1 0 24" fill="none" stroke="${O}" stroke-width="3.5"/>`),
  undo: sv(`<path d="M18 11L8 21l10 10" fill="none" stroke="${O}" stroke-width="5"/><path d="M9 21h17a11 11 0 0 1 0 22h-6" fill="none" stroke="${O}" stroke-width="5"/>`),
  bulb: sv(`<path d="M24 6a13 13 0 0 0-8 23c2 2 3 4 3 7h10c0-3 1-5 3-7A13 13 0 0 0 24 6z" fill="#ffe08a" stroke="${O}" stroke-width="3"/><path d="M19 40h10M20 44h8" stroke="${O}" stroke-width="3"/><path d="M19 18a6 6 0 0 1 5-4" stroke="#fff" stroke-width="3" fill="none"/>`),
  check: sv(`<path d="M10 25l9 9 19-20" fill="none" stroke="#fff" stroke-width="6"/>`),
  lock: sv(`<path d="M15 22v-6a9 9 0 0 1 18 0v6" fill="none" stroke="${O}" stroke-width="4"/><rect x="10" y="21" width="28" height="21" rx="4" fill="#f2c14e" stroke="${O}" stroke-width="3"/><circle cx="24" cy="30" r="3" fill="${O}"/>`),
  book: sv(`<path d="M6 10c6-2 12-2 18 2v28c-6-4-12-4-18-2z" fill="#f4e3c1" stroke="${O}" stroke-width="3"/><path d="M42 10c-6-2-12-2-18 2v28c6-4 12-4 18-2z" fill="#fbefd6" stroke="${O}" stroke-width="3"/><path d="M11 17c3-1 6-1 9 1M11 23c3-1 6-1 9 1M28 18c3-2 6-2 9-1M28 24c3-2 6-2 9-1" stroke="#b08a5a" stroke-width="2"/>`),
  brush: sv(`<path d="M30 6l12 12-16 16-12-12z" fill="#2f8f8a" stroke="${O}" stroke-width="3"/><path d="M14 22l12 12c-2 6-8 9-16 8-2 0-3-1-3-3 1-8 3-14 7-17z" fill="#c9973c" stroke="${O}" stroke-width="3"/>`),
  noads: sv(`<rect x="6" y="11" width="36" height="26" rx="5" fill="#d24a4f" stroke="${O}" stroke-width="3"/><path d="M14 31l20-14" stroke="#fff" stroke-width="5"/>`),
  bag: sv(`<path d="M10 20c0-6 6-8 14-8s14 2 14 8v14c0 6-6 8-14 8s-14-2-14-8z" fill="#c9973c" stroke="${O}" stroke-width="3"/><path d="M17 12l-3-6h20l-3 6" fill="#a8742a" stroke="${O}" stroke-width="3"/><circle cx="24" cy="28" r="6" fill="#f2c14e" stroke="${O}" stroke-width="2.5"/>`),
  dice: sv(`<rect x="7" y="7" width="34" height="34" rx="8" fill="#fbf3e2" stroke="${O}" stroke-width="3"/><circle cx="16" cy="16" r="3.4" fill="${O}"/><circle cx="24" cy="24" r="3.4" fill="#b8343a"/><circle cx="32" cy="32" r="3.4" fill="${O}"/>`),
  board: sv(`<rect x="4" y="9" width="40" height="30" rx="4" fill="#7a5233" stroke="${O}" stroke-width="3"/><rect x="8" y="13" width="14" height="22" fill="#e8cf9e"/><rect x="26" y="13" width="14" height="22" fill="#e8cf9e"/><path d="M9 13l2.5 9 2.5-9M15 13l2.5 9 2.5-9M27 13l2.5 9 2.5-9M33 13l2.5 9 2.5-9M9 35l2.5-9 2.5 9M15 35l2.5-9 2.5 9M27 35l2.5-9 2.5 9M33 35l2.5-9 2.5 9" fill="#8c2b33"/>`),
  checker: sv(`<ellipse cx="24" cy="30" rx="16" ry="8" fill="#2d221c" stroke="${O}" stroke-width="2.5"/><ellipse cx="24" cy="26" rx="16" ry="8" fill="#f2e8d3" stroke="${O}" stroke-width="2.5"/><ellipse cx="24" cy="26" rx="9" ry="4.5" fill="none" stroke="#cdbb98" stroke-width="2"/>`),
  flag: sv(`<path d="M12 42V6" stroke="${O}" stroke-width="4"/><path d="M12 8h24l-5 7 5 7H12z" fill="#fbf3e2" stroke="${O}" stroke-width="3"/>`),
  home: sv(`<path d="M7 23L24 8l17 15" fill="none" stroke="${O}" stroke-width="4"/><path d="M12 20v20h24V20" fill="#f4e3c1" stroke="${O}" stroke-width="3"/><rect x="20" y="28" width="8" height="12" fill="#c9973c" stroke="${O}" stroke-width="2.5"/>`),
  arrow: sv(`<path d="M10 24h26M26 13l11 11-11 11" fill="none" stroke="#fff" stroke-width="5.5"/>`),
  play: sv(`<path d="M16 10l22 14-22 14z" fill="#fff" stroke="${O}" stroke-width="3"/>`),
};

// портреты: кожа, волосы, головной убор
const face = (o) => sv(
  `<defs><clipPath id="cl${o.id}"><circle cx="40" cy="40" r="38"/></clipPath></defs>
  <circle cx="40" cy="40" r="38" fill="${o.bg}"/>
  <g clip-path="url(#cl${o.id})">
    <path d="M10 82c2-16 14-24 30-24s28 8 30 24z" fill="${o.shirt}" stroke="${O}" stroke-width="2.5"/>
    ${o.collar || ''}
    <ellipse cx="40" cy="40" rx="17" ry="19" fill="${o.skin}" stroke="${O}" stroke-width="2.5"/>
    <ellipse cx="23" cy="42" rx="4" ry="5" fill="${o.skin}" stroke="${O}" stroke-width="2.5"/>
    <ellipse cx="57" cy="42" rx="4" ry="5" fill="${o.skin}" stroke="${O}" stroke-width="2.5"/>
    ${o.hair || ''}
    <ellipse cx="33" cy="41" rx="2.6" ry="3.2" fill="${O}"/>
    <ellipse cx="47" cy="41" rx="2.6" ry="3.2" fill="${O}"/>
    <circle cx="34" cy="40" r=".9" fill="#fff"/><circle cx="48" cy="40" r=".9" fill="#fff"/>
    <ellipse cx="29" cy="48" rx="3.4" ry="2" fill="#f08a7a" opacity=".55"/>
    <ellipse cx="51" cy="48" rx="3.4" ry="2" fill="#f08a7a" opacity=".55"/>
    ${o.brows || ''}
    ${o.beard || ''}
    ${o.hat || ''}
  </g>
  <circle cx="40" cy="40" r="38" fill="none" stroke="${O}" stroke-width="3"/>`,
  '0 0 80 80'
);

export const AVATARS = [
  // Тёма: мальчишка в кепке
  face({ id: 0, bg: '#9ed4cf', shirt: '#e8833a', skin: '#f6d2b0',
    hair: `<path d="M24 36c2-10 9-14 16-14s14 4 16 14c-4-5-10-7-16-7s-12 2-16 7z" fill="#8a5a32" stroke="${O}" stroke-width="2"/>`,
    hat: `<path d="M22 32c0-10 8-16 18-16s18 6 18 16c-6-3-12-4-18-4s-12 1-18 4z" fill="#2f6fb8" stroke="${O}" stroke-width="2.5"/><path d="M40 28c8 0 16 2 22 6-1 2-3 2-5 1-5-2-11-3-17-3z" fill="#245a96" stroke="${O}" stroke-width="2"/><circle cx="40" cy="16.5" r="2.2" fill="#f2c14e" stroke="${O}" stroke-width="1.5"/>`,
    brows: `<path d="M30 35l6-1M44 34l6 1" stroke="${O}" stroke-width="2"/>`,
    beard: `<path d="M35 51c3 3 7 3 10 0" fill="none" stroke="${O}" stroke-width="2.4"/>` }),
  // Михалыч: усы, кепка-восьмиклинка
  face({ id: 1, bg: '#f2c98a', shirt: '#4f6b8f', skin: '#efc39b',
    collar: `<path d="M30 58l10 9 10-9" fill="#f4ead8" stroke="${O}" stroke-width="2"/>`,
    hair: `<path d="M23 44c-1-4 0-8 2-10M57 44c1-4 0-8-2-10" stroke="#9a8f86" stroke-width="3" fill="none"/>`,
    hat: `<path d="M21 34c0-11 9-16 19-16s19 5 19 16c-6-3-12-4-19-4s-13 1-19 4z" fill="#6b5b4a" stroke="${O}" stroke-width="2.5"/><path d="M22 33c6-3 12-4 18-4s12 1 18 4l-1 3c-5-2-11-3-17-3s-12 1-17 3z" fill="#57493b" stroke="${O}" stroke-width="2"/><path d="M40 18v11M30 21l4 9M50 21l-4 9" stroke="#57493b" stroke-width="1.6"/>`,
    brows: `<path d="M29 35l7 0M44 35l7 0" stroke="#7d7268" stroke-width="2.6"/>`,
    beard: `<path d="M30 51c4-3 7-3 10-1 3-2 6-2 10 1-3 2-7 2-10 0-3 2-7 2-10 0z" fill="#8f8378" stroke="${O}" stroke-width="2"/><path d="M36 56c3 1.5 5 1.5 8 0" fill="none" stroke="${O}" stroke-width="2"/>` }),
  // Аксакал: седая борода, тюбетейка
  face({ id: 2, bg: '#c7a7d6', shirt: '#2f5f57', skin: '#e9b98f',
    collar: `<path d="M26 60c4 8 9 12 14 12s10-4 14-12" fill="none" stroke="#e0b24e" stroke-width="3"/>`,
    hair: `<path d="M23 42c-1-6 1-10 3-12M57 42c1-6-1-10-3-12" stroke="#f1ede6" stroke-width="4" fill="none"/>`,
    hat: `<path d="M24 30c0-8 7-12 16-12s16 4 16 12z" fill="#1f2a44" stroke="${O}" stroke-width="2.5"/><path d="M26 27h28" stroke="#e0b24e" stroke-width="2"/><path d="M31 23l2 3 2-3M39 21l1 4 1-4M45 23l2 3 2-3" stroke="#f4ead8" stroke-width="1.6" fill="none"/>`,
    brows: `<path d="M28 35c3-2 6-2 8 0M44 35c2-2 5-2 8 0" stroke="#f1ede6" stroke-width="3" fill="none"/>`,
    beard: `<path d="M24 46c2 14 9 22 16 22s14-8 16-22c-4 4-9 5-16 5s-12-1-16-5z" fill="#f4f1eb" stroke="${O}" stroke-width="2.3"/><path d="M33 50c3-2 5-2 7 0 2-2 4-2 7 0" fill="#f4f1eb" stroke="${O}" stroke-width="2"/><path d="M36 55c2 1 6 1 8 0" stroke="#c9c3b8" stroke-width="2" fill="none"/>` }),
];

export const ME = sv(`<circle cx="40" cy="40" r="38" fill="#f4e3c1"/><circle cx="40" cy="33" r="13" fill="#c9973c" stroke="${O}" stroke-width="3"/><path d="M16 70c3-14 13-20 24-20s21 6 24 20" fill="#c9973c" stroke="${O}" stroke-width="3"/><circle cx="40" cy="40" r="38" fill="none" stroke="${O}" stroke-width="3"/>`, '0 0 80 80');

// 2D-кубик для интерфейса
export function dieSVG(v, used = false, col = '#fbf3e2', pip = '#2b1a12') {
  const P = { 1: [[24, 24]], 2: [[15, 15], [33, 33]], 3: [[14, 14], [24, 24], [34, 34]], 4: [[15, 15], [33, 15], [15, 33], [33, 33]], 5: [[14, 14], [34, 14], [24, 24], [14, 34], [34, 34]], 6: [[15, 13], [33, 13], [15, 24], [33, 24], [15, 35], [33, 35]] }[v] || [];
  return sv(`<rect x="4" y="4" width="40" height="40" rx="9" fill="${col}" stroke="${O}" stroke-width="3" opacity="${used ? 0.45 : 1}"/>${P.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="${v === 1 ? '#b8343a' : pip}" opacity="${used ? 0.45 : 1}"/>`).join('')}`);
}
