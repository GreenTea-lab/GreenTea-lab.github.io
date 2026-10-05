// «Мой сад»: предметы открываются за решённые судоку. Каждый предмет — SVG в квадрате 100×100,
// низ предмета — точка (50, 100). В сцене он ставится по координатам и масштабу.

const L = {
  lantern: `<path d="M38 100h24l-3-8H41z" fill="#8c8a9a"/><rect x="45" y="70" width="10" height="22" fill="#9a98a8"/><path d="M34 70h32l-4-6H38z" fill="#8c8a9a"/><rect x="38" y="46" width="24" height="18" rx="2" fill="#a6a4b4"/><rect x="43" y="50" width="14" height="10" fill="#ffd27a"/><circle cx="50" cy="55" r="14" fill="#ffd27a" opacity=".25"/><path d="M28 46h44L50 30z" fill="#7c7a8c"/><circle cx="50" cy="27" r="4" fill="#7c7a8c"/>`,
  stones: `<ellipse cx="50" cy="98" rx="46" ry="5" fill="#000" opacity=".2"/><path d="M14 98c-2-14 8-24 20-24s18 10 16 24z" fill="#8f90a3"/><path d="M44 98c0-22 10-34 22-34s20 14 18 34z" fill="#a3a4b6"/><path d="M78 98c0-8 5-14 10-14s9 6 8 14z" fill="#7e7f92"/><path d="M50 72c6-6 18-6 24 0" stroke="#7fb383" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M20 80c4-4 10-4 14 0" stroke="#7fb383" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  bonsai: `<path d="M28 100h44l4-14H24z" fill="#5a3a5e"/><rect x="22" y="82" width="56" height="5" rx="2" fill="#6d4a72"/><path d="M50 84c-2-12 6-18 2-28-3-8-12-10-14-18M52 60c6-4 14-4 18-10" stroke="#5b3a2a" stroke-width="6" fill="none" stroke-linecap="round"/><ellipse cx="34" cy="36" rx="18" ry="10" fill="#4f9a6a"/><ellipse cx="70" cy="46" rx="16" ry="9" fill="#5aa874"/><ellipse cx="52" cy="24" rx="15" ry="9" fill="#62b07c"/><ellipse cx="40" cy="33" rx="9" ry="4" fill="#7cc792"/>`,
  bamboo: `<g stroke-linecap="round"><path d="M30 100V8M50 100V2M70 100V14" stroke="#5fa86a" stroke-width="8"/><path d="M26 30h8M26 58h8M26 82h8M46 22h8M46 50h8M46 78h8M66 40h8M66 66h8" stroke="#3f7f4c" stroke-width="3"/></g><g fill="#78c07e"><path d="M34 26c10-6 18-6 24-2-8 4-16 4-24 2z"/><path d="M54 18c10-8 20-8 26-4-9 6-18 6-26 4z"/><path d="M66 36c-10-6-20-4-26 2 10 2 18 2 26-2z"/><path d="M30 54c-10-6-18-4-24 0 8 4 16 4 24 0z"/></g>`,
  pond: `<ellipse cx="50" cy="88" rx="49" ry="12" fill="#1c3f6b"/><ellipse cx="50" cy="86" rx="44" ry="9" fill="#2c5f93"/><path d="M14 86c10-3 22-3 32 0M54 90c10-3 20-3 30 0" stroke="#7fb3e6" stroke-width="1.2" fill="none" opacity=".7"/><g transform="translate(30 84) rotate(-10)"><ellipse rx="8" ry="3" fill="#ff8a3d"/><path d="M-8 0l-5-3v6z" fill="#ff8a3d"/><circle cx="2" cy="-1" r="1.4" fill="#fff"/></g><g transform="translate(66 88) rotate(170)"><ellipse rx="7" ry="2.8" fill="#fff"/><ellipse cx="2" rx="3" ry="2" fill="#ff6a3a"/><path d="M-7 0l-5-3v6z" fill="#fff"/></g><ellipse cx="80" cy="82" rx="7" ry="2.5" fill="#4f9a6a"/><circle cx="82" cy="80" r="2" fill="#f3a7ba"/>`,
  bridge: `<path d="M4 90C20 56 80 56 96 90" stroke="#c7432f" stroke-width="7" fill="none"/><path d="M8 82C24 52 76 52 92 82" stroke="#e05a43" stroke-width="3" fill="none"/><g stroke="#c7432f" stroke-width="3"><path d="M18 74v-14M34 64v-14M50 61v-14M66 64v-14M82 74v-14"/></g><path d="M14 62C30 40 70 40 86 62" stroke="#e05a43" stroke-width="3.5" fill="none"/><path d="M4 90h8M88 90h8" stroke="#8a2c20" stroke-width="5"/>`,
  sakura: `<path d="M48 100c2-20-2-34-10-46M50 70c8-10 16-14 26-16M44 60c-8-6-16-8-24-6" stroke="#4a2f3a" stroke-width="7" fill="none" stroke-linecap="round"/><g fill="#f3a7ba"><circle cx="30" cy="40" r="18"/><circle cx="56" cy="30" r="22"/><circle cx="78" cy="44" r="16"/><circle cx="20" cy="54" r="12"/></g><g fill="#f9cbd6"><circle cx="50" cy="24" r="10"/><circle cx="74" cy="38" r="7"/><circle cx="28" cy="34" r="8"/></g>`,
  maple: `<path d="M50 100V56M50 74l-14-12M50 66l12-10" stroke="#4a2f2a" stroke-width="6" fill="none" stroke-linecap="round"/><g fill="#d9472f"><circle cx="34" cy="44" r="17"/><circle cx="62" cy="36" r="20"/><circle cx="48" cy="22" r="14"/></g><g fill="#f07a3a"><circle cx="70" cy="50" r="11"/><circle cx="28" cy="30" r="9"/><circle cx="56" cy="28" r="8"/></g>`,
  torii: `<path d="M6 16c30 6 58 6 88 0v8c-30 6-58 6-88 0z" fill="#d6452f"/><rect x="12" y="30" width="76" height="7" fill="#d6452f"/><rect x="46" y="24" width="8" height="8" fill="#b23a28"/><rect x="22" y="22" width="9" height="78" fill="#d6452f"/><rect x="69" y="22" width="9" height="78" fill="#d6452f"/><rect x="19" y="92" width="15" height="8" fill="#2b2530"/><rect x="66" y="92" width="15" height="8" fill="#2b2530"/>`,
  teahouse: `<rect x="18" y="58" width="64" height="38" fill="#e8d6b0"/><rect x="18" y="94" width="64" height="6" fill="#5b3a2a"/><g stroke="#5b3a2a" stroke-width="2"><path d="M34 58v36M50 58v36M66 58v36M18 76h64"/></g><rect x="40" y="70" width="20" height="24" fill="#ffd27a" opacity=".85"/><path d="M4 60L50 30l46 30z" fill="#3a3550"/><path d="M8 60h84" stroke="#2a2640" stroke-width="5" stroke-linecap="round"/><path d="M44 30l6-8 6 8z" fill="#3a3550"/>`,
  pagoda: `<rect x="40" y="76" width="20" height="24" fill="#6a2f3a"/><path d="M14 78h72l-10-10H24z" fill="#3a3550"/><rect x="42" y="56" width="16" height="14" fill="#7a3542"/><path d="M20 58h60l-9-9H29z" fill="#3a3550"/><rect x="44" y="38" width="12" height="12" fill="#7a3542"/><path d="M26 40h48l-8-8H34z" fill="#3a3550"/><rect x="48.5" y="10" width="3" height="22" fill="#e3b45a"/><circle cx="50" cy="10" r="3" fill="#e3b45a"/>`,
  waterfall: `<path d="M8 100c-2-30 8-62 26-70h32c18 8 28 40 26 70z" fill="#5b5d73"/><path d="M40 30h20v70H40z" fill="#7fc0ea"/><path d="M44 30v70M50 30v70M56 30v70" stroke="#d6efff" stroke-width="1.5" opacity=".8"/><ellipse cx="50" cy="98" rx="24" ry="5" fill="#d6efff" opacity=".7"/><path d="M8 100c4-20 14-30 24-34M92 100c-4-20-14-30-24-34" stroke="#4a4c60" stroke-width="5" fill="none"/>`,
  lanterns: `<path d="M2 18C30 34 70 34 98 18" stroke="#2b2530" stroke-width="2" fill="none"/><g><rect x="18" y="26" width="2" height="6" fill="#2b2530"/><ellipse cx="19" cy="42" rx="9" ry="11" fill="#e0533c"/><ellipse cx="19" cy="42" rx="5" ry="9" fill="#ffb26b" opacity=".6"/><rect x="15" y="52" width="8" height="3" fill="#2b2530"/></g><g><rect x="49" y="31" width="2" height="6" fill="#2b2530"/><ellipse cx="50" cy="48" rx="10" ry="12" fill="#e0533c"/><ellipse cx="50" cy="48" rx="5.5" ry="10" fill="#ffb26b" opacity=".6"/><rect x="46" y="59" width="8" height="3" fill="#2b2530"/></g><g><rect x="80" y="26" width="2" height="6" fill="#2b2530"/><ellipse cx="81" cy="42" rx="9" ry="11" fill="#e0533c"/><ellipse cx="81" cy="42" rx="5" ry="9" fill="#ffb26b" opacity=".6"/><rect x="77" y="52" width="8" height="3" fill="#2b2530"/></g><circle cx="50" cy="48" r="20" fill="#ffb26b" opacity=".18"/>`,
  cranes: `<g fill="#f4f1ea"><path d="M10 60c10-4 18-2 24 4 6-12 18-18 30-16-10 4-18 12-22 20 8 0 14 2 18 6-12 0-24-2-32-6-6 2-12 0-18-8z"/><path d="M56 30c8-3 14-2 19 3 5-9 14-14 23-12-8 3-14 9-17 15 6 0 11 2 14 5-9 0-19-2-25-5-5 2-10 0-14-6z"/></g><circle cx="12" cy="60" r="2" fill="#d6452f"/><circle cx="58" cy="30" r="1.6" fill="#d6452f"/>`,
  fireflies: `<g fill="#f6ec8a"><circle cx="12" cy="70" r="2.4"/><circle cx="28" cy="52" r="1.8"/><circle cx="44" cy="76" r="2.2"/><circle cx="58" cy="46" r="2"/><circle cx="74" cy="66" r="2.6"/><circle cx="88" cy="50" r="1.8"/><circle cx="36" cy="34" r="1.6"/><circle cx="66" cy="26" r="1.8"/></g><g fill="#f6ec8a" opacity=".25"><circle cx="12" cy="70" r="7"/><circle cx="44" cy="76" r="6"/><circle cx="74" cy="66" r="7"/><circle cx="58" cy="46" r="6"/></g>`,
  moon: `<circle cx="50" cy="50" r="40" fill="#f6e7c1" opacity=".18"/><circle cx="50" cy="50" r="30" fill="#f6e7c1"/><circle cx="40" cy="42" r="6" fill="#e2cfa2" opacity=".6"/><circle cx="60" cy="58" r="4.5" fill="#e2cfa2" opacity=".6"/><circle cx="56" cy="38" r="3" fill="#e2cfa2" opacity=".6"/>`,
};

// порядок открытия и место в сцене (x, y — низ предмета, s — масштаб)
export const ITEMS = [
  { id: 'lantern', x: 700, y: 505, s: 1.5 },
  { id: 'stones', x: 365, y: 528, s: 1.4 },
  { id: 'bonsai', x: 815, y: 512, s: 1.15 },
  { id: 'bamboo', x: 905, y: 535, s: 2.3 },
  { id: 'pond', x: 560, y: 478, s: 2.7 },
  { id: 'bridge', x: 560, y: 486, s: 1.9 },
  { id: 'sakura', x: 130, y: 505, s: 2.5 },
  { id: 'maple', x: 300, y: 380, s: 1.7 },
  { id: 'torii', x: 650, y: 340, s: 1.6 },
  { id: 'teahouse', x: 860, y: 372, s: 1.9 },
  { id: 'pagoda', x: 160, y: 330, s: 2.2 },
  { id: 'waterfall', x: 440, y: 350, s: 1.7 },
  { id: 'lanterns', x: 520, y: 255, s: 2.2 },
  { id: 'cranes', x: 300, y: 170, s: 1.3 },
  { id: 'fireflies', x: 460, y: 440, s: 3.2 },
  { id: 'moon', x: 860, y: 190, s: 1.5 },
];

// сколько решённых нужно для k-го предмета: 1, 4, 8, 12 ...
export const need = (k) => (k === 0 ? 1 : k * 4);
export const unlockedCount = (solved) => ITEMS.filter((_, k) => solved >= need(k)).length;

export const iconSVG = (id) => `<svg viewBox="0 0 100 100" aria-hidden="true">${L[id]}</svg>`;

export function sceneSVG(count, freshIdx = -1) {
  const shown = ITEMS.map((it, k) => ({ ...it, k })).filter((it) => it.k < count);
  shown.sort((a, b) => a.y - b.y);
  // грабли по песку: волнистые линии
  let sand = '';
  for (let k = 0; k < 9; k++) {
    const y = 330 + k * 26;
    sand += `<path d="M0 ${y}C150 ${y - 8} 300 ${y + 8} 500 ${y}S850 ${y - 8} 1000 ${y}" stroke="#d9cdb0" stroke-width="2" fill="none" opacity=".55"/>`;
  }
  const items = shown
    .map((it) => `<g transform="translate(${it.x - 50 * it.s} ${it.y - 100 * it.s}) scale(${it.s})"><g class="it${it.k === freshIdx ? ' fresh' : ''}">${L[it.id]}</g></g>`)
    .join('');
  return `<svg viewBox="0 0 1000 560" xmlns="http://www.w3.org/2000/svg" role="img">
    <defs><linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121735"/><stop offset="1" stop-color="#2c3270"/></linearGradient></defs>
    <rect width="1000" height="560" fill="url(#gs)"/>
    <g fill="#fff" opacity=".6"><circle cx="80" cy="60" r="1.5"/><circle cx="220" cy="110" r="1.2"/><circle cx="420" cy="50" r="1.4"/><circle cx="640" cy="90" r="1.2"/><circle cx="760" cy="40" r="1.6"/><circle cx="930" cy="120" r="1.1"/><circle cx="350" cy="190" r="1"/></g>
    <path d="M0 300C120 250 260 270 380 240S640 230 760 260 920 250 1000 270V560H0z" fill="#232a5c"/>
    <path d="M0 330C200 300 400 320 600 305S900 300 1000 315V560H0z" fill="#e9dfc7"/>
    ${sand}
    <path d="M430 560C470 500 520 470 600 440" stroke="#cbbd9b" stroke-width="22" fill="none" stroke-dasharray="26 18" stroke-linecap="round" opacity=".7"/>
    ${items}
  </svg>`;
}
