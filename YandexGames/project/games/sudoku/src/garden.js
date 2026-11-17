// «Мой сад»: четыре сезона по 12 предметов. Предметы открываются за решённые судоку,
// следующий можно открыть раньше за монеты. Каждый предмет — SVG в квадрате 100×100, низ — точка (50, 100).

const L = {
  // ---------- весна ----------
  lantern: `<path d="M38 100h24l-3-8H41z" fill="#8c8a9a"/><rect x="45" y="70" width="10" height="22" fill="#9a98a8"/><path d="M34 70h32l-4-6H38z" fill="#8c8a9a"/><rect x="38" y="46" width="24" height="18" rx="2" fill="#a6a4b4"/><rect x="43" y="50" width="14" height="10" fill="#ffd27a"/><circle cx="50" cy="55" r="14" fill="#ffd27a" opacity=".25"/><path d="M28 46h44L50 30z" fill="#7c7a8c"/><circle cx="50" cy="27" r="4" fill="#7c7a8c"/>`,
  stones: `<ellipse cx="50" cy="98" rx="46" ry="5" fill="#000" opacity=".2"/><path d="M14 98c-2-14 8-24 20-24s18 10 16 24z" fill="#8f90a3"/><path d="M44 98c0-22 10-34 22-34s20 14 18 34z" fill="#a3a4b6"/><path d="M78 98c0-8 5-14 10-14s9 6 8 14z" fill="#7e7f92"/><path d="M50 72c6-6 18-6 24 0" stroke="#7fb383" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M20 80c4-4 10-4 14 0" stroke="#7fb383" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  bonsai: `<path d="M28 100h44l4-14H24z" fill="#5a3a5e"/><rect x="22" y="82" width="56" height="5" rx="2" fill="#6d4a72"/><path d="M50 84c-2-12 6-18 2-28-3-8-12-10-14-18M52 60c6-4 14-4 18-10" stroke="#5b3a2a" stroke-width="6" fill="none" stroke-linecap="round"/><ellipse cx="34" cy="36" rx="18" ry="10" fill="#4f9a6a"/><ellipse cx="70" cy="46" rx="16" ry="9" fill="#5aa874"/><ellipse cx="52" cy="24" rx="15" ry="9" fill="#62b07c"/><ellipse cx="40" cy="33" rx="9" ry="4" fill="#7cc792"/>`,
  bamboo: `<g stroke-linecap="round"><path d="M30 100V8M50 100V2M70 100V14" stroke="#5fa86a" stroke-width="8"/><path d="M26 30h8M26 58h8M26 82h8M46 22h8M46 50h8M46 78h8M66 40h8M66 66h8" stroke="#3f7f4c" stroke-width="3"/></g><g fill="#78c07e"><path d="M34 26c10-6 18-6 24-2-8 4-16 4-24 2z"/><path d="M54 18c10-8 20-8 26-4-9 6-18 6-26 4z"/><path d="M66 36c-10-6-20-4-26 2 10 2 18 2 26-2z"/><path d="M30 54c-10-6-18-4-24 0 8 4 16 4 24 0z"/></g>`,
  pond: `<ellipse cx="50" cy="88" rx="49" ry="12" fill="#1c3f6b"/><ellipse cx="50" cy="86" rx="44" ry="9" fill="#2c5f93"/><path d="M14 86c10-3 22-3 32 0M54 90c10-3 20-3 30 0" stroke="#7fb3e6" stroke-width="1.2" fill="none" opacity=".7"/><g transform="translate(30 84) rotate(-10)"><ellipse rx="8" ry="3" fill="#ff8a3d"/><path d="M-8 0l-5-3v6z" fill="#ff8a3d"/><circle cx="2" cy="-1" r="1.4" fill="#fff"/></g><g transform="translate(66 88) rotate(170)"><ellipse rx="7" ry="2.8" fill="#fff"/><ellipse cx="2" rx="3" ry="2" fill="#ff6a3a"/><path d="M-7 0l-5-3v6z" fill="#fff"/></g><ellipse cx="80" cy="82" rx="7" ry="2.5" fill="#4f9a6a"/><circle cx="82" cy="80" r="2" fill="#f3a7ba"/>`,
  bridge: `<path d="M4 90C20 56 80 56 96 90" stroke="#c7432f" stroke-width="7" fill="none"/><path d="M8 82C24 52 76 52 92 82" stroke="#e05a43" stroke-width="3" fill="none"/><g stroke="#c7432f" stroke-width="3"><path d="M18 74v-14M34 64v-14M50 61v-14M66 64v-14M82 74v-14"/></g><path d="M14 62C30 40 70 40 86 62" stroke="#e05a43" stroke-width="3.5" fill="none"/><path d="M4 90h8M88 90h8" stroke="#8a2c20" stroke-width="5"/>`,
  sakura: `<path d="M48 100c2-20-2-34-10-46M50 70c8-10 16-14 26-16M44 60c-8-6-16-8-24-6" stroke="#4a2f3a" stroke-width="7" fill="none" stroke-linecap="round"/><g fill="#f3a7ba"><circle cx="30" cy="40" r="18"/><circle cx="56" cy="30" r="22"/><circle cx="78" cy="44" r="16"/><circle cx="20" cy="54" r="12"/></g><g fill="#f9cbd6"><circle cx="50" cy="24" r="10"/><circle cx="74" cy="38" r="7"/><circle cx="28" cy="34" r="8"/></g>`,
  azalea: `<ellipse cx="50" cy="96" rx="44" ry="5" fill="#000" opacity=".15"/><g fill="#4f8f5a"><ellipse cx="30" cy="80" rx="24" ry="17"/><ellipse cx="66" cy="78" rx="28" ry="20"/><ellipse cx="48" cy="66" rx="22" ry="16"/></g><g fill="#e9579a">${[[22, 74], [36, 64], [52, 58], [66, 66], [80, 74], [44, 80], [60, 82], [30, 86], [74, 86]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5"/>`).join('')}</g><g fill="#f7a1c8">${[[24, 72], [54, 56], [82, 72], [46, 78]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4"/>`).join('')}</g>`,
  butterflies: `<g transform="translate(30 50) rotate(-12)"><ellipse cx="-7" cy="-4" rx="8" ry="6" fill="#ffd27a"/><ellipse cx="7" cy="-4" rx="8" ry="6" fill="#ffd27a"/><ellipse cx="-5" cy="5" rx="5" ry="4" fill="#ffb24a"/><ellipse cx="5" cy="5" rx="5" ry="4" fill="#ffb24a"/><rect x="-1.2" y="-8" width="2.4" height="16" rx="1.2" fill="#3a2a2a"/></g><g transform="translate(70 34) rotate(14) scale(.8)"><ellipse cx="-7" cy="-4" rx="8" ry="6" fill="#bfe3ff"/><ellipse cx="7" cy="-4" rx="8" ry="6" fill="#bfe3ff"/><ellipse cx="-5" cy="5" rx="5" ry="4" fill="#8fc6f0"/><ellipse cx="5" cy="5" rx="5" ry="4" fill="#8fc6f0"/><rect x="-1.2" y="-8" width="2.4" height="16" rx="1.2" fill="#3a2a2a"/></g><path d="M30 60c6 14 14 22 30 24M70 44c-4 12 0 24 10 34" stroke="#fff" stroke-width="1.2" stroke-dasharray="2 4" fill="none" opacity=".5"/>`,
  torii: `<path d="M6 16c30 6 58 6 88 0v8c-30 6-58 6-88 0z" fill="#d6452f"/><rect x="12" y="30" width="76" height="7" fill="#d6452f"/><rect x="46" y="24" width="8" height="8" fill="#b23a28"/><rect x="22" y="22" width="9" height="78" fill="#d6452f"/><rect x="69" y="22" width="9" height="78" fill="#d6452f"/><rect x="19" y="92" width="15" height="8" fill="#2b2530"/><rect x="66" y="92" width="15" height="8" fill="#2b2530"/>`,
  teahouse: `<rect x="18" y="58" width="64" height="38" fill="#e8d6b0"/><rect x="18" y="94" width="64" height="6" fill="#5b3a2a"/><g stroke="#5b3a2a" stroke-width="2"><path d="M34 58v36M50 58v36M66 58v36M18 76h64"/></g><rect x="40" y="70" width="20" height="24" fill="#ffd27a" opacity=".85"/><path d="M4 60L50 30l46 30z" fill="#3a3550"/><path d="M8 60h84" stroke="#2a2640" stroke-width="5" stroke-linecap="round"/><path d="M44 30l6-8 6 8z" fill="#3a3550"/>`,
  cranes: `<g fill="#f4f1ea"><path d="M10 60c10-4 18-2 24 4 6-12 18-18 30-16-10 4-18 12-22 20 8 0 14 2 18 6-12 0-24-2-32-6-6 2-12 0-18-8z"/><path d="M56 30c8-3 14-2 19 3 5-9 14-14 23-12-8 3-14 9-17 15 6 0 11 2 14 5-9 0-19-2-25-5-5 2-10 0-14-6z"/></g><circle cx="12" cy="60" r="2" fill="#d6452f"/><circle cx="58" cy="30" r="1.6" fill="#d6452f"/>`,
  // ---------- лето ----------
  iris: `<g stroke="#3f8f4c" stroke-width="3.5" stroke-linecap="round" fill="none"><path d="M30 100c0-20-4-34-10-48M50 100V40M70 100c0-20 4-34 10-48M40 100c-2-14-8-22-14-28M60 100c2-14 8-22 14-28"/></g>${[[20, 48], [50, 34], [80, 48]].map(([x, y]) => `<g transform="translate(${x} ${y})"><path d="M0 0c-10-4-12-14-4-16 2 6 4 10 4 16z" fill="#6a4fc4"/><path d="M0 0c10-4 12-14 4-16-2 6-4 10-4 16z" fill="#6a4fc4"/><path d="M0 0c-4-10-2-18 0-20 2 2 4 10 0 20z" fill="#8a6fe0"/><path d="M-2-6h4" stroke="#ffd27a" stroke-width="2"/></g>`).join('')}`,
  hydrangea: `<ellipse cx="50" cy="96" rx="42" ry="5" fill="#000" opacity=".15"/><g fill="#3f7f4c"><ellipse cx="30" cy="84" rx="18" ry="12"/><ellipse cx="70" cy="84" rx="18" ry="12"/><ellipse cx="50" cy="86" rx="20" ry="11"/></g>${[[28, 66, '#7aa6e8'], [52, 58, '#9a8ae0'], [74, 68, '#e08ac0']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="16" fill="${c}"/><g fill="#fff" opacity=".45">${[[-6, -6], [5, -7], [-8, 4], [3, 3], [8, 8], [-2, 10]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="2.6"/>`).join('')}</g>`).join('')}`,
  frog: `<ellipse cx="50" cy="96" rx="40" ry="6" fill="#4f9a6a"/><ellipse cx="50" cy="92" rx="36" ry="5" fill="#62b07c"/><ellipse cx="50" cy="78" rx="18" ry="14" fill="#6cbf5a"/><circle cx="40" cy="64" r="7" fill="#6cbf5a"/><circle cx="60" cy="64" r="7" fill="#6cbf5a"/><circle cx="40" cy="63" r="4" fill="#fff"/><circle cx="60" cy="63" r="4" fill="#fff"/><circle cx="40.5" cy="63.5" r="2.2" fill="#1d2b1d"/><circle cx="60.5" cy="63.5" r="2.2" fill="#1d2b1d"/><ellipse cx="36" cy="77" rx="3" ry="2" fill="#f3a7ba" opacity=".7"/><ellipse cx="64" cy="77" rx="3" ry="2" fill="#f3a7ba" opacity=".7"/><ellipse cx="50" cy="86" rx="10" ry="5" fill="#a6dc8f"/>`,
  basin: `<ellipse cx="50" cy="98" rx="40" ry="4" fill="#000" opacity=".2"/><path d="M22 96c0-18 12-30 28-30s28 12 28 30z" fill="#8f90a3"/><ellipse cx="50" cy="68" rx="24" ry="6" fill="#7e7f92"/><ellipse cx="50" cy="68" rx="18" ry="4" fill="#5aa0d8"/><path d="M92 40H58l-6 6" stroke="#a6823a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M52 48v14" stroke="#9fd2ff" stroke-width="2.4" stroke-dasharray="3 3"/><path d="M88 40v58" stroke="#8a6a2a" stroke-width="4"/><circle cx="20" cy="94" r="7" fill="#7fb383"/>`,
  wisteria: `<path d="M4 18c30-8 62-8 92 0" stroke="#5b3a2a" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M14 18v82M86 18v82" stroke="#5b3a2a" stroke-width="5"/><g fill="#4f9a6a"><ellipse cx="30" cy="20" rx="14" ry="5"/><ellipse cx="70" cy="20" rx="14" ry="5"/></g>${[24, 38, 52, 66, 80].map((x, k) => `<g fill="${k % 2 ? '#b49ae8' : '#9a7ad6'}">${[0, 1, 2, 3, 4, 5].map((j) => `<circle cx="${x + (j % 2 ? 2 : -2)}" cy="${26 + j * 7}" r="${4.6 - j * 0.5}"/>`).join('')}</g>`).join('')}`,
  waterfall: `<path d="M8 100c-2-30 8-62 26-70h32c18 8 28 40 26 70z" fill="#5b5d73"/><path d="M40 30h20v70H40z" fill="#7fc0ea"/><path d="M44 30v70M50 30v70M56 30v70" stroke="#d6efff" stroke-width="1.5" opacity=".8"/><ellipse cx="50" cy="98" rx="24" ry="5" fill="#d6efff" opacity=".7"/><path d="M8 100c4-20 14-30 24-34M92 100c-4-20-14-30-24-34" stroke="#4a4c60" stroke-width="5" fill="none"/>`,
  lotus: `<ellipse cx="50" cy="92" rx="48" ry="9" fill="#2c5f93"/><ellipse cx="26" cy="90" rx="14" ry="4" fill="#4f9a6a"/><ellipse cx="78" cy="92" rx="12" ry="3.5" fill="#4f9a6a"/><g transform="translate(52 86)"><path d="M0 0c-14-2-20-10-18-16 8 2 14 8 18 16z" fill="#f7a6c4"/><path d="M0 0c14-2 20-10 18-16-8 2-14 8-18 16z" fill="#f7a6c4"/><path d="M0 0c-8-8-8-20-2-26 4 6 6 16 2 26z" fill="#fbc6da"/><path d="M0 0c8-8 8-20 2-26-4 6-6 16-2 26z" fill="#fbc6da"/><circle cy="-6" r="3" fill="#ffd27a"/></g>`,
  deer: `<ellipse cx="50" cy="98" rx="30" ry="3" fill="#000" opacity=".2"/><g fill="#c98a4a"><rect x="30" y="74" width="5" height="25" rx="2"/><rect x="40" y="76" width="5" height="23" rx="2"/><rect x="58" y="76" width="5" height="23" rx="2"/><rect x="66" y="74" width="5" height="25" rx="2"/><ellipse cx="50" cy="70" rx="24" ry="12"/><path d="M68 66l8-20h10l-4 10-8 14z"/></g><ellipse cx="84" cy="48" rx="8" ry="6" fill="#c98a4a"/><g fill="#fff" opacity=".85"><circle cx="40" cy="66" r="2"/><circle cx="50" cy="63" r="2"/><circle cx="58" cy="68" r="2"/><circle cx="46" cy="72" r="1.6"/></g><path d="M80 42l-4-10M80 36l-6-2M86 42l4-10M88 36l5-3" stroke="#7a5a2a" stroke-width="2.2" stroke-linecap="round"/><circle cx="87" cy="47" r="1.4" fill="#2b2530"/><path d="M26 66c-4-2-6 2-4 4" stroke="#c98a4a" stroke-width="3" fill="none"/>`,
  lanterns: `<path d="M2 18C30 34 70 34 98 18" stroke="#2b2530" stroke-width="2" fill="none"/>${[[19, 42, 11], [50, 48, 12], [81, 42, 11]].map(([x, y, r]) => `<rect x="${x - 1}" y="${y - r - 6}" width="2" height="6" fill="#2b2530"/><ellipse cx="${x}" cy="${y}" rx="${r - 2}" ry="${r}" fill="#e0533c"/><ellipse cx="${x}" cy="${y}" rx="${r / 2}" ry="${r - 2}" fill="#ffb26b" opacity=".6"/><rect x="${x - 4}" y="${y + r - 1}" width="8" height="3" fill="#2b2530"/>`).join('')}<circle cx="50" cy="48" r="20" fill="#ffb26b" opacity=".18"/>`,
  fireflies: `<g fill="#f6ec8a"><circle cx="12" cy="70" r="2.4"/><circle cx="28" cy="52" r="1.8"/><circle cx="44" cy="76" r="2.2"/><circle cx="58" cy="46" r="2"/><circle cx="74" cy="66" r="2.6"/><circle cx="88" cy="50" r="1.8"/><circle cx="36" cy="34" r="1.6"/><circle cx="66" cy="26" r="1.8"/></g><g fill="#f6ec8a" opacity=".25"><circle cx="12" cy="70" r="7"/><circle cx="44" cy="76" r="6"/><circle cx="74" cy="66" r="7"/><circle cx="58" cy="46" r="6"/></g>`,
  pagoda: `<rect x="40" y="76" width="20" height="24" fill="#6a2f3a"/><path d="M14 78h72l-10-10H24z" fill="#3a3550"/><rect x="42" y="56" width="16" height="14" fill="#7a3542"/><path d="M20 58h60l-9-9H29z" fill="#3a3550"/><rect x="44" y="38" width="12" height="12" fill="#7a3542"/><path d="M26 40h48l-8-8H34z" fill="#3a3550"/><rect x="48.5" y="10" width="3" height="22" fill="#e3b45a"/><circle cx="50" cy="10" r="3" fill="#e3b45a"/>`,
  chime: `<path d="M50 4v14" stroke="#2b2530" stroke-width="2"/><path d="M34 44c0-16 7-26 16-26s16 10 16 26z" fill="#bfe3ff" opacity=".9"/><path d="M36 38c4-4 8-4 12 0s8 4 12 0" stroke="#e0533c" stroke-width="2.4" fill="none"/><ellipse cx="50" cy="44" rx="16" ry="3" fill="#8fc6f0"/><path d="M50 44v20" stroke="#2b2530" stroke-width="1.4"/><path d="M42 64h16l-2 30H44z" fill="#fff7e6"/><path d="M46 72c4 4 6 10 2 16" stroke="#3c7fc0" stroke-width="1.6" fill="none"/>`,
  // ---------- осень ----------
  maple: `<path d="M50 100V56M50 74l-14-12M50 66l12-10" stroke="#4a2f2a" stroke-width="6" fill="none" stroke-linecap="round"/><g fill="#d9472f"><circle cx="34" cy="44" r="17"/><circle cx="62" cy="36" r="20"/><circle cx="48" cy="22" r="14"/></g><g fill="#f07a3a"><circle cx="70" cy="50" r="11"/><circle cx="28" cy="30" r="9"/><circle cx="56" cy="28" r="8"/></g>`,
  ginkgo: `<path d="M50 100V40M50 70l-16-14M50 58l14-12" stroke="#5b3a2a" stroke-width="6" fill="none" stroke-linecap="round"/><g fill="#f2c230"><path d="M50 4c22 0 34 16 34 30 0 14-16 22-34 22S16 48 16 34 28 4 50 4z"/></g><g fill="#ffd95a"><circle cx="34" cy="30" r="8"/><circle cx="58" cy="20" r="7"/><circle cx="68" cy="40" r="6"/></g><g fill="#f2c230"><path d="M20 92c4-4 8-4 10 0-4 2-6 2-10 0zM70 96c4-4 8-4 10 0-4 2-6 2-10 0z"/></g>`,
  chrys: `<path d="M26 100h48l-4-16H30z" fill="#7a4a2a"/><rect x="24" y="82" width="52" height="5" rx="2" fill="#8f5a32"/><path d="M50 82V60M36 82l-6-18M64 82l6-18" stroke="#3f7f4c" stroke-width="3"/>${[[50, 52, '#f2c230', 14], [28, 60, '#f07a3a', 11], [72, 60, '#f7f1e6', 11]].map(([x, y, c, r]) => `<g transform="translate(${x} ${y})">${[...Array(12)].map((_, k) => `<ellipse cx="0" cy="${-r * 0.6}" rx="${r * 0.22}" ry="${r * 0.55}" fill="${c}" transform="rotate(${k * 30})"/>`).join('')}<circle r="${r * 0.3}" fill="#c9962c"/></g>`).join('')}`,
  susuki: `<g stroke="#b59a6a" stroke-width="2.4" fill="none" stroke-linecap="round"><path d="M30 100c0-30 4-50 12-66M44 100c2-28 8-50 20-68M56 100c4-24 14-42 28-52M38 100c-6-24-14-40-24-50"/></g><g fill="#efe3c6"><path d="M42 34c-4-8-2-18 4-24 2 8 0 16-4 24z"/><path d="M64 32c0-10 6-18 14-20-2 8-6 16-14 20z"/><path d="M84 48c2-8 8-14 14-14-2 6-6 12-14 14z"/><path d="M14 50c-6-6-8-14-6-20 6 4 8 12 6 20z"/></g>`,
  tanuki: `<ellipse cx="50" cy="98" rx="26" ry="3" fill="#000" opacity=".2"/><path d="M28 98c0-24 10-40 22-40s22 16 22 40z" fill="#9a6a3a"/><ellipse cx="50" cy="84" rx="14" ry="12" fill="#e8d2a6"/><circle cx="50" cy="48" r="16" fill="#9a6a3a"/><path d="M36 40l-2-12 10 6zM64 40l2-12-10 6z" fill="#7a4a2a"/><ellipse cx="43" cy="48" rx="6" ry="5" fill="#4a2f22"/><ellipse cx="57" cy="48" rx="6" ry="5" fill="#4a2f22"/><circle cx="43" cy="48" r="2" fill="#fff"/><circle cx="57" cy="48" r="2" fill="#fff"/><ellipse cx="50" cy="56" rx="4" ry="2.6" fill="#2b2530"/><path d="M34 34h32l-6-10H40z" fill="#c9a24a"/><rect x="62" y="70" width="12" height="16" rx="3" fill="#b0503a"/>`,
  persimmon: `<path d="M48 100c2-18-2-30-8-40M50 72c8-8 16-10 24-10M46 62c-8-4-14-4-20-2" stroke="#4a2f2a" stroke-width="6" fill="none" stroke-linecap="round"/><g fill="#6a8a3a"><ellipse cx="32" cy="44" rx="18" ry="10"/><ellipse cx="66" cy="40" rx="20" ry="12"/><ellipse cx="50" cy="28" rx="14" ry="9"/></g>${[[30, 52], [58, 50], [72, 48], [44, 38], [62, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="#f07a2a"/><path d="M${x - 3} ${y - 5}h6" stroke="#3f6a2a" stroke-width="2"/>`).join('')}`,
  mushrooms: `<ellipse cx="50" cy="98" rx="40" ry="3" fill="#000" opacity=".2"/><rect x="26" y="74" width="10" height="24" rx="4" fill="#f4ecdc"/><path d="M14 76c0-14 8-22 17-22s17 8 17 22z" fill="#d9472f"/><g fill="#fff"><circle cx="24" cy="66" r="3"/><circle cx="34" cy="62" r="2.4"/><circle cx="40" cy="70" r="2.6"/></g><rect x="60" y="80" width="8" height="18" rx="3" fill="#f4ecdc"/><path d="M52 82c0-10 6-16 12-16s12 6 12 16z" fill="#c98a4a"/><path d="M70 90c4-6 10-6 14 0" stroke="#7fb383" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  owl: `<path d="M10 92h80" stroke="#5b3a2a" stroke-width="6" stroke-linecap="round"/><path d="M30 92c0-24 8-44 20-44s20 20 20 44z" fill="#9a7a5a"/><ellipse cx="50" cy="76" rx="12" ry="14" fill="#d9c4a0"/><path d="M34 52l-2-12 10 8zM66 52l2-12-10 8z" fill="#7a5a3a"/><circle cx="43" cy="58" r="7" fill="#fff"/><circle cx="57" cy="58" r="7" fill="#fff"/><circle cx="43" cy="58" r="3.4" fill="#2b2530"/><circle cx="57" cy="58" r="3.4" fill="#2b2530"/><path d="M47 64l3 5 3-5z" fill="#e3b45a"/><path d="M42 80l2 3 2-3M50 82l2 3 2-3M58 80l2 3 2-3" stroke="#9a7a5a" stroke-width="1.4" fill="none"/>`,
  cat: `<ellipse cx="50" cy="98" rx="34" ry="3" fill="#000" opacity=".2"/><path d="M18 98c0-14 12-22 30-22s34 6 34 22z" fill="#f4ecdc"/><path d="M78 96c8 0 14-4 12-10" stroke="#f4ecdc" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="32" cy="80" r="13" fill="#f4ecdc"/><path d="M22 72l-2-10 8 6zM40 70l4-9 2 10z" fill="#f4ecdc"/><path d="M23 70l-1-5 4 3z" fill="#f3a7ba"/><path d="M26 82c2 2 4 2 6 0M34 82c2 2 4 2 6 0" stroke="#2b2530" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="33" cy="86" r="1.2" fill="#f3a7ba"/><ellipse cx="62" cy="84" rx="8" ry="5" fill="#e08a3a" opacity=".85"/><ellipse cx="48" cy="90" rx="6" ry="4" fill="#3a3550" opacity=".7"/>`,
  leaves: `${[[14, 20, 20, '#d9472f'], [40, 46, -30, '#f07a3a'], [70, 18, 50, '#f2c230'], [86, 60, 10, '#d9472f'], [24, 76, -60, '#f2c230'], [58, 84, 30, '#f07a3a']].map(([x, y, a, c]) => `<g transform="translate(${x} ${y}) rotate(${a}) scale(.5)"><path d="M0 -14l3 6 6-3-1 7 7 1-5 5 4 4-7 1v6l-7-3-7 3v-6l-7-1 4-4-5-5 7-1-1-7 6 3z" fill="${c}"/></g>`).join('')}`,
  moon: `<circle cx="50" cy="50" r="40" fill="#f6e7c1" opacity=".18"/><circle cx="50" cy="50" r="30" fill="#f6e7c1"/><circle cx="40" cy="42" r="6" fill="#e2cfa2" opacity=".6"/><circle cx="60" cy="58" r="4.5" fill="#e2cfa2" opacity=".6"/><circle cx="56" cy="38" r="3" fill="#e2cfa2" opacity=".6"/>`,
  rabbit: `<ellipse cx="50" cy="98" rx="24" ry="3" fill="#000" opacity=".2"/><ellipse cx="48" cy="84" rx="20" ry="14" fill="#f4f1ea"/><circle cx="64" cy="70" r="11" fill="#f4f1ea"/><ellipse cx="60" cy="48" rx="4" ry="14" fill="#f4f1ea" transform="rotate(-10 60 48)"/><ellipse cx="70" cy="50" rx="4" ry="13" fill="#f4f1ea" transform="rotate(12 70 50)"/><ellipse cx="60" cy="48" rx="1.8" ry="9" fill="#f3a7ba" transform="rotate(-10 60 48)"/><circle cx="68" cy="68" r="1.8" fill="#c7432f"/><circle cx="30" cy="84" r="5" fill="#fff"/><path d="M74 88h14l-2 10H76z" fill="#a6a4b4"/><circle cx="81" cy="86" r="5" fill="#fff"/><circle cx="76" cy="84" r="3" fill="#fff"/>`,
  // ---------- зима ----------
  pine: `<rect x="46" y="74" width="8" height="26" fill="#5b3a2a"/><path d="M50 4L22 40h12L16 62h14L10 84h80L70 62h14L66 40h12z" fill="#2f6a4a"/><g fill="#fff"><path d="M50 4l-10 13c4 2 8-1 10 2 2-3 6 0 10-2z"/><path d="M30 46c6 2 10-2 14 0s10-2 14 0 10-2 12 0l-4-6H34z" opacity=".9"/><path d="M20 70c8 2 14-2 20 0s14-2 20 0 12-2 20 0l-5-8H26z" opacity=".9"/><path d="M10 84h80l-4-6c-6 2-12-2-18 0s-14-2-20 0-14-2-20 0z"/></g>`,
  snowlantern: `<ellipse cx="50" cy="98" rx="30" ry="3" fill="#fff" opacity=".6"/><path d="M42 100l-6-24h28l-6 24z" fill="#8c8a9a"/><path d="M28 78l8-6h28l8 6z" fill="#7c7a8c"/><rect x="40" y="58" width="20" height="14" fill="#a6a4b4"/><rect x="44" y="61" width="12" height="8" fill="#ffd27a"/><circle cx="50" cy="65" r="12" fill="#ffd27a" opacity=".25"/><path d="M18 58c10-12 54-12 64 0z" fill="#7c7a8c"/><path d="M16 58c6-10 22-14 34-14s28 4 34 14c-4-2-8 0-12-2s-8 2-12 0-8 2-12 0-8 2-12 0-8 2-12 0z" fill="#fff"/><circle cx="50" cy="40" r="5" fill="#fff"/>`,
  camellia: `<ellipse cx="50" cy="96" rx="40" ry="5" fill="#fff" opacity=".5"/><g fill="#2f6a4a"><ellipse cx="30" cy="76" rx="22" ry="18"/><ellipse cx="68" cy="74" rx="24" ry="20"/><ellipse cx="50" cy="58" rx="22" ry="16"/></g>${[[28, 66], [54, 52], [72, 70], [44, 80], [66, 86]].map(([x, y]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cy="-4" rx="4" ry="5" fill="#d6304a" transform="rotate(${a})"/>`).join('')}<circle r="2.4" fill="#ffd27a"/></g>`).join('')}<g fill="#fff"><path d="M14 64c6-6 22-8 30-4-10 0-20 2-30 4zM48 44c8-4 18-4 22 0-8 0-14 0-22 0z"/></g>`,
  plum: `<path d="M48 100c2-16-4-26-12-34M44 74c10-6 20-8 30-18M40 70c-10-8-20-12-28-12M62 62c4-10 4-20 0-28" stroke="#3a2a36" stroke-width="5" fill="none" stroke-linecap="round"/>${[[30, 60], [20, 58], [70, 56], [62, 34], [64, 44], [36, 66], [54, 64], [80, 50], [14, 58]].map(([x, y], k) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<circle cy="-3" r="2.6" fill="${k % 3 ? '#e86aa6' : '#f7f1e6'}" transform="rotate(${a})"/>`).join('')}<circle r="1.3" fill="#ffd27a"/></g>`).join('')}`,
  snowman: `<ellipse cx="50" cy="98" rx="26" ry="3" fill="#fff" opacity=".5"/><circle cx="50" cy="80" r="20" fill="#fafafa"/><circle cx="50" cy="48" r="15" fill="#fafafa"/><path d="M36 44c4-12 24-12 28 0z" fill="#d6452f"/><circle cx="44" cy="48" r="2" fill="#2b2530"/><circle cx="56" cy="48" r="2" fill="#2b2530"/><ellipse cx="44" cy="55" rx="3" ry="2" fill="#f3a7ba" opacity=".7"/><ellipse cx="56" cy="55" rx="3" ry="2" fill="#f3a7ba" opacity=".7"/><path d="M30 76l-14-8M70 76l14-8" stroke="#6a4a2a" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="76" r="2.2" fill="#2b2530"/><circle cx="50" cy="86" r="2.2" fill="#2b2530"/>`,
  crane: `<ellipse cx="50" cy="98" rx="20" ry="3" fill="#fff" opacity=".5"/><path d="M48 98V72M56 98V72" stroke="#2b2530" stroke-width="2.2"/><path d="M30 64c8-14 30-16 40-6 6 6 2 16-10 16H40c-8 0-12-4-10-10z" fill="#fafafa"/><path d="M30 64c-6 2-10 8-8 12 6-2 10-6 12-10z" fill="#2b2530"/><path d="M64 60c4-12 4-26 0-36" stroke="#fafafa" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M64 34c0-8-2-12 0-14" stroke="#2b2530" stroke-width="5" stroke-linecap="round"/><circle cx="64" cy="22" r="5" fill="#fafafa"/><circle cx="64" cy="18" r="2.4" fill="#d6304a"/><path d="M68 23l12 2-12 1z" fill="#c9a24a"/>`,
  kamakura: `<ellipse cx="50" cy="98" rx="46" ry="4" fill="#fff" opacity=".5"/><path d="M8 98c0-34 18-56 42-56s42 22 42 56z" fill="#f4f6fb"/><path d="M34 98c0-14 7-24 16-24s16 10 16 24z" fill="#ffcf6a"/><path d="M34 98c0-14 7-24 16-24s16 10 16 24z" fill="#ffb24a" opacity=".5"/><ellipse cx="50" cy="96" rx="22" ry="6" fill="#ffd27a" opacity=".35"/><path d="M20 70c8-10 20-14 30-14" stroke="#dce4f2" stroke-width="3" fill="none"/>`,
  monkey: `<ellipse cx="50" cy="94" rx="44" ry="8" fill="#7fb3e6" opacity=".6"/><ellipse cx="50" cy="92" rx="40" ry="6" fill="#bfe3ff" opacity=".6"/><path d="M28 92c0-20 10-32 22-32s22 12 22 32z" fill="#a8886a"/><circle cx="50" cy="52" r="16" fill="#a8886a"/><ellipse cx="50" cy="56" rx="11" ry="10" fill="#f0a08a"/><circle cx="45" cy="53" r="1.8" fill="#2b2530"/><circle cx="55" cy="53" r="1.8" fill="#2b2530"/><path d="M46 60c2 1.4 6 1.4 8 0" stroke="#2b2530" stroke-width="1.4" fill="none"/><circle cx="34" cy="52" r="4" fill="#f0a08a"/><circle cx="66" cy="52" r="4" fill="#f0a08a"/><path d="M36 40c6-6 22-6 28 0" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/><g fill="#fff" opacity=".5"><circle cx="20" cy="70" r="3"/><circle cx="80" cy="66" r="2"/><circle cx="74" cy="78" r="2.4"/></g>`,
  bell: `<rect x="10" y="10" width="80" height="8" rx="3" fill="#3a3550"/><path d="M18 18v82M82 18v82" stroke="#3a3550" stroke-width="6"/><path d="M34 70c0-24 6-38 16-38s16 14 16 38z" fill="#5a7a5a"/><rect x="30" y="68" width="40" height="6" rx="2" fill="#4a6a4a"/><path d="M50 18v14" stroke="#2b2530" stroke-width="3"/><g fill="#7a9a7a"><circle cx="44" cy="46" r="1.6"/><circle cx="50" cy="46" r="1.6"/><circle cx="56" cy="46" r="1.6"/><circle cx="44" cy="52" r="1.6"/><circle cx="50" cy="52" r="1.6"/><circle cx="56" cy="52" r="1.6"/></g><path d="M12 10c10-8 66-8 76 0" fill="#fff"/>`,
  snowbunny: `<ellipse cx="50" cy="98" rx="30" ry="4" fill="#fff" opacity=".5"/><path d="M20 98c0-18 14-28 30-28s30 10 30 28z" fill="#fafafa"/><g fill="#3f8f4c"><ellipse cx="40" cy="64" rx="5" ry="11" transform="rotate(-18 40 64)"/><ellipse cx="54" cy="62" rx="5" ry="12" transform="rotate(14 54 62)"/></g><circle cx="38" cy="84" r="3" fill="#d6304a"/><circle cx="54" cy="84" r="3" fill="#d6304a"/>`,
  ducks: `<ellipse cx="50" cy="92" rx="48" ry="9" fill="#9fc6e8"/><ellipse cx="50" cy="90" rx="44" ry="6" fill="#cfe6fa"/><g transform="translate(34 82)"><ellipse rx="12" ry="7" fill="#e08a3a"/><circle cx="-9" cy="-8" r="6" fill="#6a4fc4"/><path d="M-15-8l-5 1 5 2z" fill="#d6304a"/><path d="M-6-10c4-2 6 0 6 4" stroke="#fff" stroke-width="2" fill="none"/><path d="M2-6l8-6 2 6z" fill="#e08a3a"/></g><g transform="translate(66 84)"><ellipse rx="11" ry="6.5" fill="#9a8a7a"/><circle cx="-8" cy="-7" r="5.5" fill="#8a7a6a"/><path d="M-13-7l-5 1 5 2z" fill="#c9a24a"/><circle cx="-9" cy="-8" r="1" fill="#fff"/></g>`,
  wintermoon: `<circle cx="50" cy="50" r="42" fill="#cfe0ff" opacity=".16"/><circle cx="50" cy="50" r="28" fill="#eef3ff"/><circle cx="42" cy="44" r="5" fill="#d6e0f5"/><circle cx="58" cy="58" r="4" fill="#d6e0f5"/><g fill="#fff"><circle cx="12" cy="20" r="1.6"/><circle cx="90" cy="30" r="1.4"/><circle cx="84" cy="86" r="1.6"/><circle cx="16" cy="80" r="1.2"/></g>`,
};

// сезоны: фон сцены и предметы с местами (x, y — низ предмета, s — масштаб)
export const SEASONS = [
  {
    id: 'spring',
    sky: ['#3b2f6b', '#8a5a8f', '#e7a3a8'],
    hill: '#6c4f86',
    ground: ['#eadfc9', '#d9cdb0'],
    items: [
      { id: 'lantern', x: 700, y: 505, s: 1.5 },
      { id: 'stones', x: 365, y: 528, s: 1.4 },
      { id: 'bonsai', x: 815, y: 512, s: 1.15 },
      { id: 'bamboo', x: 920, y: 535, s: 2.3 },
      { id: 'pond', x: 560, y: 478, s: 2.7 },
      { id: 'bridge', x: 560, y: 486, s: 1.9 },
      { id: 'sakura', x: 130, y: 505, s: 2.5 },
      { id: 'azalea', x: 250, y: 470, s: 1.3 },
      { id: 'butterflies', x: 420, y: 330, s: 1.2 },
      { id: 'torii', x: 650, y: 345, s: 1.5 },
      { id: 'teahouse', x: 860, y: 372, s: 1.8 },
      { id: 'cranes', x: 300, y: 190, s: 1.3 },
    ],
  },
  {
    id: 'summer',
    sky: ['#2f6fb0', '#6fb1df', '#cfe9f2'],
    hill: '#3f8a6a',
    ground: ['#bfdc9a', '#a8c983'],
    items: [
      { id: 'iris', x: 120, y: 530, s: 1.4 },
      { id: 'hydrangea', x: 330, y: 535, s: 1.4 },
      { id: 'frog', x: 470, y: 520, s: 0.8 },
      { id: 'basin', x: 760, y: 530, s: 1.2 },
      { id: 'wisteria', x: 900, y: 470, s: 1.9 },
      { id: 'waterfall', x: 220, y: 380, s: 1.7 },
      { id: 'lotus', x: 590, y: 470, s: 2.6 },
      { id: 'deer', x: 410, y: 430, s: 1.2 },
      { id: 'lanterns', x: 640, y: 270, s: 2.0 },
      { id: 'fireflies', x: 500, y: 470, s: 3.0 },
      { id: 'pagoda', x: 800, y: 330, s: 2.0 },
      { id: 'chime', x: 360, y: 230, s: 0.9 },
    ],
  },
  {
    id: 'autumn',
    sky: ['#3a2a5a', '#b25a5a', '#f2b07a'],
    hill: '#7a3f4a',
    ground: ['#e9d2a6', '#d8bb88'],
    items: [
      { id: 'maple', x: 140, y: 505, s: 2.4 },
      { id: 'ginkgo', x: 880, y: 500, s: 2.3 },
      { id: 'chrys', x: 360, y: 530, s: 1.1 },
      { id: 'susuki', x: 560, y: 520, s: 1.5 },
      { id: 'tanuki', x: 700, y: 530, s: 1.0 },
      { id: 'persimmon', x: 300, y: 380, s: 1.8 },
      { id: 'mushrooms', x: 470, y: 535, s: 0.8 },
      { id: 'owl', x: 690, y: 360, s: 1.0 },
      { id: 'cat', x: 790, y: 540, s: 1.0 },
      { id: 'moon', x: 800, y: 200, s: 1.6 },
      { id: 'rabbit', x: 470, y: 400, s: 1.0 },
      { id: 'leaves', x: 450, y: 250, s: 1.6 },
    ],
  },
  {
    id: 'winter',
    sky: ['#0d1230', '#1f2a5c', '#3d4f8a'],
    hill: '#33406f',
    ground: ['#eef3fb', '#dce4f2'],
    items: [
      { id: 'pine', x: 130, y: 520, s: 2.4 },
      { id: 'snowlantern', x: 690, y: 530, s: 1.3 },
      { id: 'camellia', x: 330, y: 535, s: 1.3 },
      { id: 'plum', x: 880, y: 505, s: 2.0 },
      { id: 'snowman', x: 480, y: 530, s: 1.1 },
      { id: 'crane', x: 590, y: 520, s: 1.2 },
      { id: 'kamakura', x: 260, y: 400, s: 1.5 },
      { id: 'monkey', x: 440, y: 410, s: 1.3 },
      { id: 'bell', x: 760, y: 380, s: 1.4 },
      { id: 'snowbunny', x: 800, y: 545, s: 0.7 },
      { id: 'ducks', x: 600, y: 420, s: 1.6 },
      { id: 'wintermoon', x: 840, y: 200, s: 1.6 },
    ],
  },
];

export const ITEMS = SEASONS.flatMap((s, si) => s.items.map((it, k) => ({ ...it, season: si, key: s.id + '_' + it.id, n: si * 12 + k })));

// сколько решённых нужно для k-го предмета: 1, 2, 4, 6, 10 … (чем дальше, тем реже)
export const need = (k) => (k < 4 ? [1, 2, 4, 6][k] : Math.round(1 + 1.5 * k + 0.17 * k * k));
// цена досрочного открытия следующего предмета
export const price = (k) => 150 + k * 25;
export const earnedCount = (solved) => ITEMS.filter((_, k) => solved >= need(k)).length;

export const iconSVG = (id) => `<svg viewBox="0 0 100 100" aria-hidden="true">${L[id]}</svg>`;

// сцена сезона si; count — сколько предметов открыто всего, fresh — номер нового (анимация)
export function sceneSVG(si, count, fresh = -1) {
  const S = SEASONS[si];
  const shown = S.items.map((it, k) => ({ ...it, n: si * 12 + k })).filter((it) => it.n < count);
  shown.sort((a, b) => a.y - b.y);
  let sand = '';
  for (let k = 0; k < 9; k++) {
    const y = 330 + k * 26;
    sand += `<path d="M0 ${y}C150 ${y - 8} 300 ${y + 8} 500 ${y}S850 ${y - 8} 1000 ${y}" stroke="${S.ground[1]}" stroke-width="2" fill="none" opacity=".6"/>`;
  }
  let deco = '';
  if (si === 0 || si === 3) deco = `<g fill="#fff" opacity=".6">${[[80, 60], [220, 110], [420, 50], [640, 90], [760, 40], [930, 120], [350, 190]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4"/>`).join('')}</g>`;
  if (si === 1) deco = `<g fill="#fff" opacity=".85"><ellipse cx="180" cy="90" rx="70" ry="16"/><ellipse cx="220" cy="80" rx="40" ry="16"/><ellipse cx="760" cy="130" rx="80" ry="14"/><ellipse cx="800" cy="120" rx="40" ry="14"/></g><circle cx="900" cy="70" r="34" fill="#fff4c2"/>`;
  if (si === 2) deco = `<circle cx="160" cy="120" r="40" fill="#ffd9a0" opacity=".5"/>`;
  const snow = si === 3 ? `<g fill="#fff" opacity=".75">${[...Array(40)].map((_, k) => `<circle cx="${(k * 97) % 1000}" cy="${(k * 53) % 300}" r="${1 + (k % 3)}"/>`).join('')}</g>` : '';
  const items = shown.map((it) => `<g transform="translate(${it.x - 50 * it.s} ${it.y - 100 * it.s}) scale(${it.s})"><g class="it${it.n === fresh ? ' fresh' : ''}">${L[it.id]}</g></g>`).join('');
  return `<svg viewBox="0 0 1000 560" xmlns="http://www.w3.org/2000/svg" role="img">
    <defs><linearGradient id="gs${si}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${S.sky[0]}"/><stop offset=".6" stop-color="${S.sky[1]}"/><stop offset="1" stop-color="${S.sky[2]}"/></linearGradient></defs>
    <rect width="1000" height="560" fill="url(#gs${si})"/>${deco}
    <path d="M0 300C120 250 260 270 380 240S640 230 760 260 920 250 1000 270V560H0z" fill="${S.hill}"/>
    <path d="M0 330C200 300 400 320 600 305S900 300 1000 315V560H0z" fill="${S.ground[0]}"/>
    ${sand}
    <path d="M430 560C470 500 520 470 600 440" stroke="${S.ground[1]}" stroke-width="22" fill="none" stroke-dasharray="26 18" stroke-linecap="round" opacity=".9"/>
    ${items}${snow}
  </svg>`;
}
