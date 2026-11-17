// Рисунки SVG: ведущий-шарж, портреты игроков, барабан, призы, подарки, значки.
import { SECTORS, SECTOR_DEG } from './data.js';

// ---------- Ведущий Леонард Якубчик (шарж: лысина, седые бока, пышные усы, бордовый пиджак, бабочка) ----------
export function hostSVG() {
  return `<svg class="host-svg" viewBox="0 0 320 450" xmlns="http://www.w3.org/2000/svg">
<defs>
<radialGradient id="hSkin" cx=".45" cy=".35" r=".75"><stop offset="0" stop-color="#ffd9bd"/><stop offset=".7" stop-color="#f0b48e"/><stop offset="1" stop-color="#d9946c"/></radialGradient>
<linearGradient id="hJack" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#a3263f"/><stop offset="1" stop-color="#6e1428"/></linearGradient>
<linearGradient id="hMus" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f2efe8"/><stop offset="1" stop-color="#bdb5a8"/></linearGradient>
<linearGradient id="hHair" x1="0" x2="1"><stop offset="0" stop-color="#cfcac2"/><stop offset="1" stop-color="#f1eee8"/></linearGradient>
</defs>
<g class="h-body">
<path d="M22 450C24 372 76 330 160 326C244 330 296 372 298 450Z" fill="url(#hJack)"/>
<path d="M118 330L160 420L202 330L184 326L160 372L136 326Z" fill="#fff8ef"/>
<path d="M112 332L150 418L120 440L84 350Z" fill="#5a0f20"/><path d="M208 332L170 418L200 440L236 350Z" fill="#5a0f20"/>
<path d="M138 352L160 362L182 352L178 376L160 368L142 376Z" fill="#1d1a24"/><circle cx="160" cy="364" r="6" fill="#2b2733"/>
<circle cx="160" cy="402" r="3.5" fill="#d9b84a"/><circle cx="160" cy="424" r="3.5" fill="#d9b84a"/>
<path d="M228 372l22 4-4 12-20-4z" fill="#f5c542"/><path d="M226 370l26 5" stroke="#fff3c0" stroke-width="2"/>
</g>
<rect x="134" y="282" width="52" height="52" rx="18" fill="#e9a882"/>
<g class="h-head">
<path d="M66 196C58 170 64 150 74 150C70 182 74 214 84 240C70 236 66 214 66 196Z" fill="url(#hHair)"/>
<path d="M254 196C262 170 256 150 246 150C250 182 246 214 236 240C250 236 254 214 254 196Z" fill="url(#hHair)"/>
<ellipse cx="72" cy="206" rx="15" ry="22" fill="#eaa680"/><ellipse cx="248" cy="206" rx="15" ry="22" fill="#eaa680"/>
<path d="M74 210c4-8 8-8 8 0" stroke="#c97e5a" stroke-width="3" fill="none"/><path d="M246 210c-4-8-8-8-8 0" stroke="#c97e5a" stroke-width="3" fill="none"/>
<ellipse cx="160" cy="188" rx="88" ry="110" fill="url(#hSkin)"/>
<ellipse cx="128" cy="104" rx="34" ry="16" fill="#fff" opacity=".35" transform="rotate(-18 128 104)"/>
<path d="M80 168C74 140 82 126 90 120C86 140 88 160 96 180C88 180 82 176 80 168Z" fill="url(#hHair)"/>
<path d="M240 168C246 140 238 126 230 120C234 140 232 160 224 180C232 180 238 176 240 168Z" fill="url(#hHair)"/>
<g class="h-brows">
<path d="M104 156c10-14 34-16 46-6c-14-2-32 0-46 10z" fill="#9c958c"/>
<path d="M216 156c-10-14-34-16-46-6c14-2 32 0 46 10z" fill="#9c958c"/>
</g>
<g class="h-eyes">
<ellipse cx="128" cy="180" rx="15" ry="13" fill="#fff"/><ellipse cx="192" cy="180" rx="15" ry="13" fill="#fff"/>
<circle class="h-pup" cx="130" cy="182" r="7.5" fill="#3a2a1e"/><circle class="h-pup" cx="190" cy="182" r="7.5" fill="#3a2a1e"/>
<circle cx="133" cy="179" r="2.6" fill="#fff"/><circle cx="193" cy="179" r="2.6" fill="#fff"/>
<g class="h-lids"><path d="M112 172c8-10 24-10 32 0v-12h-32z" fill="#eaa882"/><path d="M176 172c8-10 24-10 32 0v-12h-32z" fill="#eaa882"/></g>
</g>
<path d="M112 196c8 6 22 6 30 0" stroke="#d9946c" stroke-width="2.5" fill="none" opacity=".7"/>
<path d="M178 196c8 6 22 6 30 0" stroke="#d9946c" stroke-width="2.5" fill="none" opacity=".7"/>
<ellipse cx="104" cy="232" rx="17" ry="11" fill="#ff8f86" opacity=".35"/><ellipse cx="216" cy="232" rx="17" ry="11" fill="#ff8f86" opacity=".35"/>
<g class="h-mouth"><ellipse cx="160" cy="262" rx="24" ry="14" fill="#7a1f24"/><path d="M140 256h40v6h-40z" fill="#fff"/><ellipse cx="160" cy="272" rx="13" ry="5" fill="#e0606a"/></g>
<path d="M136 276c14 12 34 12 48 0" stroke="#c97e5a" stroke-width="3" fill="none" opacity=".6"/>
<ellipse cx="160" cy="216" rx="21" ry="25" fill="#e89a76"/><ellipse cx="153" cy="207" rx="7" ry="9" fill="#ffd2b8" opacity=".75"/>
<g class="h-mus">
<path d="M160 230C142 222 116 222 100 232C88 240 84 256 92 266C98 256 112 252 124 254C136 256 150 254 160 246C170 254 184 256 196 254C208 252 222 256 228 266C236 256 232 240 220 232C204 222 178 222 160 230Z" fill="url(#hMus)"/>
<path d="M104 246c10-6 24-8 36-4M216 246c-10-6-24-8-36-4M120 236c10-4 22-4 32 0M200 236c-10-4-22-4-32 0" stroke="#a89f92" stroke-width="2.4" fill="none" stroke-linecap="round"/>
</g>
</g>
</svg>`;
}

// ---------- Портрет игрока ----------
export function avatarSVG(L, bg = '#2a2f7a') {
  const s = L.skin, h = L.hair;
  const hair = {
    short: `<path d="M27 46c0-18 10-28 23-28s23 10 23 28c-4-8-10-12-23-12s-19 4-23 12z" fill="${h}"/>`,
    bald: `<path d="M27 50c-1-6 1-10 4-12 1 6 2 10 4 14zM73 50c1-6-1-10-4-12-1 6-2 10-4 14z" fill="${h}"/><ellipse cx="44" cy="30" rx="8" ry="4" fill="#fff" opacity=".35"/>`,
    bun: `<circle cx="50" cy="16" r="9" fill="${h}"/><path d="M26 50c0-20 10-30 24-30s24 10 24 30c-4-10-12-16-24-16s-20 6-24 16z" fill="${h}"/>`,
    curly: `<g fill="${h}"><circle cx="30" cy="40" r="9"/><circle cx="38" cy="28" r="10"/><circle cx="50" cy="23" r="10"/><circle cx="62" cy="28" r="10"/><circle cx="70" cy="40" r="9"/></g>`,
    long: `<path d="M24 74c-4-30 4-56 26-56s30 26 26 56c-4-8-6-28-8-36-6 2-30 2-36 0-2 8-4 28-8 36z" fill="${h}"/>`,
    bob: `<path d="M24 62c-2-26 8-44 26-44s28 18 26 44c-3-4-4-18-6-26-8 0-32 0-40 0-2 8-3 22-6 26z" fill="${h}"/>`,
    scarf: `<path d="M22 56c0-24 12-38 28-38s28 14 28 38c-6-10-14-18-28-18s-22 8-28 18z" fill="${L.cloth}"/><g fill="#fff" opacity=".7"><circle cx="38" cy="28" r="2.5"/><circle cx="52" cy="24" r="2.5"/><circle cx="64" cy="30" r="2.5"/><circle cx="30" cy="42" r="2.5"/><circle cx="70" cy="44" r="2.5"/></g>`,
  }[L.style] || '';
  const gl = L.glasses ? `<g fill="none" stroke="#2a2420" stroke-width="2.4"><circle cx="41" cy="50" r="7"/><circle cx="59" cy="50" r="7"/><path d="M48 50h4"/></g>` : '';
  const mus = L.mus ? `<path d="M38 64c4-4 8-4 12-1 4-3 8-3 12 1-4 3-8 3-12 1-4 2-8 2-12-1z" fill="${h}"/>` : '';
  const beard = L.beard ? `<path d="M32 58c2 18 10 24 18 24s16-6 18-24c-4 6-10 8-18 8s-14-2-18-8z" fill="${h}"/>` : '';
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="${bg}"/>
<clipPath id="ac"><circle cx="50" cy="50" r="50"/></clipPath><g clip-path="url(#ac)">
<path d="M14 104c2-20 16-30 36-30s34 10 36 30z" fill="${L.cloth}"/><path d="M42 74h16l-8 10z" fill="#fff" opacity=".85"/>
<rect x="43" y="62" width="14" height="14" rx="5" fill="${s}"/>
${L.style === 'long' || L.style === 'bob' ? hair : ''}
<ellipse cx="50" cy="50" rx="22" ry="25" fill="${s}"/>
<ellipse cx="28" cy="52" rx="4" ry="6" fill="${s}"/><ellipse cx="72" cy="52" rx="4" ry="6" fill="${s}"/>
${L.style === 'long' || L.style === 'bob' ? `<path d="M28 44c4-14 12-20 22-20s18 6 22 20c-8-6-14-8-22-8s-14 2-22 8z" fill="${h}"/>` : hair}
<circle cx="41" cy="51" r="3" fill="#2a2420"/><circle cx="59" cy="51" r="3" fill="#2a2420"/>
<ellipse cx="36" cy="60" rx="5" ry="3" fill="#ff8f86" opacity=".4"/><ellipse cx="64" cy="60" rx="5" ry="3" fill="#ff8f86" opacity=".4"/>
<path d="M44 66c4 4 8 4 12 0" stroke="#8a3a30" stroke-width="2.4" fill="none" stroke-linecap="round"/>
${beard}${mus}${gl}</g></svg>`;
}

// ---------- Барабан ----------
const rad = (d) => ((d - 90) * Math.PI) / 180;
const pt = (r, d) => [r * Math.cos(rad(d)), r * Math.sin(rad(d))];
function arc(r0, r1, a0, a1) {
  const [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a1), [x2, y2] = pt(r0, a1), [x3, y3] = pt(r0, a0);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r1} ${r1} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}A${r0} ${r0} 0 0 0 ${x3.toFixed(1)} ${y3.toFixed(1)}Z`;
}

export function drumSVG(skin) {
  let s = '';
  const n = SECTORS.length;
  let ci = 0;
  for (let i = 0; i < n; i++) {
    const v = SECTORS[i];
    const a0 = i * SECTOR_DEG, a1 = a0 + SECTOR_DEG, m = a0 + SECTOR_DEG / 2;
    let fill, ink, label;
    if (v === 'B') { fill = '#15131c'; ink = '#fff'; label = 'Б'; }
    else if (v === '0') { fill = '#f4f1ea'; ink = '#15131c'; label = '0'; }
    else if (v === 'P') { fill = 'url(#dPrize)'; ink = '#6a1d00'; label = 'П'; }
    else {
      fill = skin.cols[ci % skin.cols.length];
      ink = Array.isArray(skin.ink) ? skin.ink[ci % skin.ink.length] : skin.ink;
      ci++;
      label = v === '+' ? '+' : v === 'x2' ? '×2' : String(v);
    }
    s += `<path d="${arc(96, 452, a0, a1)}" fill="${fill}" stroke="rgba(0,0,0,.35)" stroke-width="3"/>`;
    const big = typeof v !== 'number';
    const fs = big ? (label.length > 1 ? 82 : 104) : label.length > 3 ? 58 : 66;
    s += `<g transform="rotate(${m}) translate(0 ${big ? -312 : -300}) rotate(${big ? 0 : -90})"><text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-family="Rubik,Arial,sans-serif" font-weight="800" font-size="${fs}" fill="${ink}" stroke="rgba(0,0,0,.18)" stroke-width="2" paint-order="stroke">${label}</text></g>`;
  }
  // штырьки на границах секторов
  let pegs = '';
  for (let i = 0; i < n; i++) {
    const [x, y] = pt(440, i * SECTOR_DEG);
    pegs += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" fill="#fff4c8" stroke="#6b4a10" stroke-width="3"/>`;
  }
  let bulbs = '';
  for (let i = 0; i < 36; i++) {
    const [x, y] = pt(474, i * 10 + 5);
    bulbs += `<circle class="bulb${i % 2}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9"/>`;
  }
  return `<svg class="drum-svg" viewBox="-500 -500 1000 1000" xmlns="http://www.w3.org/2000/svg">
<defs><radialGradient id="dHub" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff8d8"/><stop offset=".55" stop-color="${skin.hub}"/><stop offset="1" stop-color="#8a5a10"/></radialGradient>
<linearGradient id="dPrize" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff2a0"/><stop offset=".5" stop-color="#ffc83a"/><stop offset="1" stop-color="#ff9a1a"/></linearGradient>
<radialGradient id="dShade" cx=".5" cy=".5" r=".5"><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient></defs>
<circle r="496" fill="${skin.rim}"/><circle r="496" fill="none" stroke="#f5c542" stroke-width="8"/>
${bulbs}
<circle r="456" fill="#2a1a08"/>
${s}
<circle r="452" fill="url(#dShade)"/>
${pegs}
<circle r="104" fill="url(#dHub)" stroke="#6b4a10" stroke-width="6"/>
<circle r="76" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="4" stroke-dasharray="10 12"/>
<path d="M0 -46L13 -14L47 -14L20 6L30 40L0 20L-30 40L-20 6L-47 -14L-13 -14Z" fill="#d8343c" stroke="#7a1010" stroke-width="4"/>
</svg>`;
}

// стрелка барабана (лежит в той же плоскости, не вращается)
export function pointerSVG() {
  return `<svg class="ptr-svg" viewBox="-500 -500 1000 1000" xmlns="http://www.w3.org/2000/svg"><g class="ptr">
<path d="M0 418L-40 530L40 530Z" fill="#f5c542" stroke="#6b3a00" stroke-width="7" stroke-linejoin="round"/>
<path d="M0 446L-18 512L18 512Z" fill="#d8343c"/></g></svg>`;
}

// ---------- Призы (120×120) ----------
const P = {
  samovar: `<ellipse cx="60" cy="108" rx="34" ry="6" fill="#000" opacity=".2"/><path d="M40 104h40l-6-10H46z" fill="#b8741a"/><path d="M30 60c0-22 14-30 30-30s30 8 30 30c0 18-12 32-30 34-18-2-30-16-30-34z" fill="#e8a83a" stroke="#8a5210" stroke-width="3"/><ellipse cx="48" cy="54" rx="6" ry="14" fill="#fff" opacity=".45"/><path d="M50 30v-8h20v8" fill="#c8862a" stroke="#8a5210" stroke-width="3"/><path d="M54 22v-10h12v10" fill="#555"/><path d="M90 66h14v8H94" fill="#c8862a" stroke="#8a5210" stroke-width="3"/><path d="M30 50c-12 0-14 20-2 22" fill="none" stroke="#8a5210" stroke-width="5"/><path d="M90 50c12 0 14 20 2 22" fill="none" stroke="#8a5210" stroke-width="5"/>`,
  iron: `<path d="M16 86c4-28 26-44 70-44l18 44z" fill="#3a8ac4" stroke="#1d4f78" stroke-width="3"/><path d="M12 86h96v10H12z" fill="#d8dde4" stroke="#7a828c" stroke-width="3"/><path d="M50 42c4-14 14-18 40-18 6 0 10 4 10 10v10" fill="none" stroke="#1d4f78" stroke-width="8" stroke-linecap="round"/><circle cx="48" cy="68" r="7" fill="#ffd23f" stroke="#a87a00" stroke-width="2"/>`,
  vacuum: `<ellipse cx="44" cy="80" rx="30" ry="22" fill="#d8343c" stroke="#7a1010" stroke-width="3"/><circle cx="30" cy="100" r="8" fill="#333"/><circle cx="60" cy="100" r="8" fill="#333"/><path d="M70 74c20 0 26-14 26-40" fill="none" stroke="#555" stroke-width="7"/><path d="M96 34v52" stroke="#888" stroke-width="6"/><path d="M84 86h26v8H84z" fill="#444"/><ellipse cx="34" cy="70" rx="10" ry="5" fill="#fff" opacity=".4"/>`,
  tv: `<rect x="14" y="26" width="92" height="70" rx="12" fill="#8a5a2b" stroke="#4a2a10" stroke-width="3"/><rect x="22" y="34" width="62" height="54" rx="10" fill="#9ec9e8" stroke="#2a3a4a" stroke-width="3"/><path d="M28 40c10-4 30-4 40 0" stroke="#fff" stroke-width="4" opacity=".6" fill="none"/><circle cx="96" cy="46" r="5" fill="#f5c542"/><circle cx="96" cy="62" r="5" fill="#f5c542"/><path d="M40 26L30 8M80 26L90 8" stroke="#333" stroke-width="3"/><path d="M26 96l-4 12M94 96l4 12" stroke="#4a2a10" stroke-width="5"/>`,
  kettle: `<path d="M26 98c-6-40 10-62 34-62s40 22 34 62z" fill="#e23b3b" stroke="#7a1010" stroke-width="3"/><g fill="#fff"><circle cx="46" cy="66" r="5"/><circle cx="64" cy="58" r="5"/><circle cx="74" cy="78" r="5"/><circle cx="50" cy="86" r="5"/></g><path d="M94 68l18-14" stroke="#7a1010" stroke-width="8" stroke-linecap="round"/><path d="M40 38c0-20 40-20 40 0" fill="none" stroke="#333" stroke-width="5"/><ellipse cx="60" cy="36" rx="12" ry="4" fill="#7a1010"/>`,
  grinder: `<path d="M38 50h44v20H38z" fill="#b8c0c8" stroke="#5a646e" stroke-width="3"/><path d="M50 70l-4 30h28l-4-30" fill="#9aa4ae" stroke="#5a646e" stroke-width="3"/><path d="M38 40c0-12 44-12 44 0v10H38z" fill="#c8d0d8" stroke="#5a646e" stroke-width="3"/><path d="M82 60h14l10-20" fill="none" stroke="#5a646e" stroke-width="5"/><circle cx="106" cy="38" r="6" fill="#8a5a2b"/><rect x="30" y="100" width="60" height="8" rx="3" fill="#8a5a2b"/>`,
  teaset: `<path d="M20 70h50c0 22-10 30-25 30S20 92 20 70z" fill="#fff" stroke="#1f4fb5" stroke-width="3"/><path d="M70 76c10 0 10 14 0 14" fill="none" stroke="#1f4fb5" stroke-width="4"/><g fill="#1f4fb5"><circle cx="34" cy="82" r="4"/><circle cx="46" cy="88" r="4"/><circle cx="58" cy="82" r="4"/></g><ellipse cx="45" cy="104" rx="34" ry="6" fill="#fff" stroke="#1f4fb5" stroke-width="3"/><path d="M76 40c0-12 30-12 30 0v26H76z" fill="#fff" stroke="#1f4fb5" stroke-width="3"/><path d="M76 50l-10-8" stroke="#1f4fb5" stroke-width="4"/><circle cx="91" cy="32" r="4" fill="#1f4fb5"/>`,
  clock: `<path d="M30 40L60 14L90 40V96H30Z" fill="#8a5a2b" stroke="#4a2a10" stroke-width="3"/><circle cx="60" cy="66" r="20" fill="#fff8e8" stroke="#4a2a10" stroke-width="3"/><path d="M60 66V52M60 66l10 6" stroke="#333" stroke-width="3" stroke-linecap="round"/><rect x="52" y="26" width="16" height="12" fill="#3a2010"/><circle cx="60" cy="32" r="4" fill="#f5c542"/><path d="M48 96v12M72 96v6" stroke="#f5c542" stroke-width="3"/><circle cx="48" cy="110" r="4" fill="#f5c542"/>`,
  radio: `<rect x="14" y="34" width="92" height="60" rx="10" fill="#c8862a" stroke="#6a4210" stroke-width="3"/><rect x="22" y="42" width="46" height="44" rx="6" fill="#f3e3c3"/><path d="M26 50h38M26 58h38M26 66h38M26 74h38" stroke="#8a6a3a" stroke-width="2"/><rect x="74" y="44" width="26" height="12" rx="3" fill="#fff8d8" stroke="#6a4210" stroke-width="2"/><circle cx="80" cy="74" r="6" fill="#6a4210"/><circle cx="96" cy="74" r="6" fill="#6a4210"/><path d="M84 34l14-20" stroke="#555" stroke-width="3"/>`,
  tape: `<rect x="10" y="38" width="100" height="54" rx="8" fill="#3a3f4a" stroke="#1a1e26" stroke-width="3"/><rect x="24" y="50" width="72" height="30" rx="5" fill="#d8dde4"/><circle cx="42" cy="65" r="9" fill="#333"/><circle cx="78" cy="65" r="9" fill="#333"/><path d="M42 65h36" stroke="#8a5a2b" stroke-width="5"/><path d="M30 38c0-14 60-14 60 0" fill="none" stroke="#1a1e26" stroke-width="5"/><g fill="#f5c542"><rect x="20" y="84" width="10" height="5"/><rect x="34" y="84" width="10" height="5"/><rect x="48" y="84" width="10" height="5"/></g>`,
  camera: `<rect x="14" y="42" width="92" height="56" rx="10" fill="#2a2a30" stroke="#111" stroke-width="3"/><path d="M38 42l8-12h28l8 12" fill="#3a3a44"/><circle cx="60" cy="70" r="22" fill="#555" stroke="#ddd" stroke-width="4"/><circle cx="60" cy="70" r="12" fill="#1a2a4a"/><circle cx="55" cy="65" r="4" fill="#fff" opacity=".7"/><rect x="86" y="48" width="12" height="7" rx="2" fill="#f5c542"/>`,
  sewing: `<path d="M16 96h88v10H16z" fill="#8a5a2b"/><path d="M24 96V44c0-10 6-14 16-14h46c10 0 14 6 14 14v18H44v34z" fill="#1d1d24" stroke="#000" stroke-width="2"/><path d="M48 46h38" stroke="#f5c542" stroke-width="4"/><path d="M30 56c6 4 6 12 0 16" stroke="#f5c542" stroke-width="3" fill="none"/><path d="M90 62v20" stroke="#bbb" stroke-width="3"/><circle cx="100" cy="44" r="10" fill="#555"/>`,
  bike: `<circle cx="30" cy="80" r="20" fill="none" stroke="#333" stroke-width="5"/><circle cx="90" cy="80" r="20" fill="none" stroke="#333" stroke-width="5"/><path d="M30 80L50 50H80L90 80M50 50L60 80H30M60 80L80 50M46 42h14M80 50l-4-14h10" fill="none" stroke="#d8343c" stroke-width="5" stroke-linejoin="round"/>`,
  lamp: `<path d="M38 50L48 20H72L82 50Z" fill="#f5c542" stroke="#a87a00" stroke-width="3"/><path d="M40 50h40" stroke="#c4161c" stroke-width="5" stroke-dasharray="4 4"/><path d="M60 50v52" stroke="#5a3a1a" stroke-width="5"/><ellipse cx="60" cy="104" rx="20" ry="6" fill="#5a3a1a"/><path d="M48 50l-10 40" stroke="#fff6b0" stroke-width="10" opacity=".25"/>`,
  accordion: `<rect x="14" y="40" width="26" height="54" rx="4" fill="#c4161c" stroke="#5a0a0a" stroke-width="3"/><rect x="80" y="40" width="26" height="54" rx="4" fill="#c4161c" stroke="#5a0a0a" stroke-width="3"/><path d="M40 44h40v46H40z" fill="#3a2a1a"/><path d="M45 44v46M52 44v46M59 44v46M66 44v46M73 44v46" stroke="#e8c070" stroke-width="2"/><g fill="#fff"><circle cx="27" cy="52" r="3"/><circle cx="27" cy="62" r="3"/><circle cx="27" cy="72" r="3"/><circle cx="27" cy="82" r="3"/></g><g fill="#f5c542"><circle cx="93" cy="56" r="3"/><circle cx="93" cy="68" r="3"/><circle cx="93" cy="80" r="3"/></g>`,
  carpet: `<rect x="14" y="20" width="92" height="80" rx="4" fill="#9a1a24" stroke="#5a0a10" stroke-width="3"/><rect x="24" y="30" width="72" height="60" fill="none" stroke="#f5c542" stroke-width="4"/><path d="M60 38l16 22-16 22-16-22z" fill="#1f4f8a" stroke="#f5c542" stroke-width="3"/><circle cx="60" cy="60" r="5" fill="#f5c542"/><path d="M18 100v10M28 100v10M38 100v10M48 100v10M58 100v10M68 100v10M78 100v10M88 100v10M98 100v10" stroke="#f5c542" stroke-width="2"/>`,
  car: `<path d="M8 82v-14c0-6 4-10 10-12l14-4 14-18c3-4 6-6 12-6h26c6 0 10 2 14 8l10 16 6 2c6 2 8 6 8 12v16z" fill="#e23b3b" stroke="#6a1010" stroke-width="3"/><path d="M48 50l10-14h22l8 14z" fill="#bfe3f2" stroke="#6a1010" stroke-width="2"/><circle cx="32" cy="84" r="12" fill="#222"/><circle cx="32" cy="84" r="5" fill="#bbb"/><circle cx="92" cy="84" r="12" fill="#222"/><circle cx="92" cy="84" r="5" fill="#bbb"/><rect x="104" y="64" width="8" height="6" rx="2" fill="#fff6b0"/><path d="M16 64h86" stroke="#fff" stroke-width="2" opacity=".5"/>`,
  moto: `<circle cx="26" cy="84" r="16" fill="none" stroke="#222" stroke-width="6"/><circle cx="76" cy="84" r="16" fill="none" stroke="#222" stroke-width="6"/><path d="M26 84l18-26h26l6 26M44 58l-8-10h14" fill="none" stroke="#2c6fd6" stroke-width="7" stroke-linejoin="round"/><path d="M50 58c4-10 20-10 24 0z" fill="#2c6fd6"/><path d="M84 52c14 0 26 10 26 26v6H88" fill="#2c6fd6" stroke="#123a7a" stroke-width="3"/><circle cx="104" cy="92" r="9" fill="#222"/>`,
  boat: `<path d="M8 72h96l-12 22H24z" fill="#fff" stroke="#1f3f7a" stroke-width="3"/><path d="M14 78h86" stroke="#d8343c" stroke-width="5"/><path d="M36 72l8-20h30l10 20z" fill="#bfe3f2" stroke="#1f3f7a" stroke-width="3"/><path d="M104 72h8v14h-8" fill="#444"/><path d="M0 100c10-6 20-6 30 0s20 6 30 0 20-6 30 0 20 6 30 0" stroke="#3a8ac4" stroke-width="5" fill="none"/>`,
};
export const prizeSVG = (id) => `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">${P[id] || ''}</svg>`;

// ---------- Подарки ведущему ----------
const G = {
  pickles: `<rect x="34" y="30" width="52" height="74" rx="12" fill="#d8f0e0" fill-opacity=".7" stroke="#5a8a6a" stroke-width="3"/><rect x="30" y="18" width="60" height="14" rx="4" fill="#d8b42a" stroke="#8a6a10" stroke-width="3"/><g fill="#4a8a2c"><rect x="40" y="40" width="12" height="54" rx="6"/><rect x="56" y="36" width="12" height="60" rx="6"/><rect x="70" y="44" width="11" height="50" rx="5"/></g><path d="M44 50l4 6M60 56l4 6M74 64l3 6" stroke="#8ac85a" stroke-width="2"/>`,
  vobla: `<path d="M14 62c20-24 60-28 84-6l14-12-2 18 2 18-14-12c-24 22-64 18-84-6z" fill="#c8a060" stroke="#6a4a20" stroke-width="3"/><circle cx="30" cy="58" r="4" fill="#222"/><path d="M50 50v24M62 48v28M74 50v24" stroke="#8a6a30" stroke-width="2"/><path d="M60 20v26" stroke="#555" stroke-width="2"/>`,
  jam: `<path d="M32 40h56v56c0 8-6 12-14 12H46c-8 0-14-4-14-12z" fill="#c4161c" stroke="#5a0a0a" stroke-width="3"/><path d="M28 28h64l-6 14H34z" fill="#fff" stroke="#c4161c" stroke-width="3"/><path d="M28 28l8-8h48l8 8" fill="#f0e0e0" stroke="#c4161c" stroke-width="3"/><rect x="42" y="60" width="36" height="22" rx="4" fill="#fff8e8"/><circle cx="60" cy="71" r="6" fill="#e04a60"/>`,
  pie: `<ellipse cx="60" cy="80" rx="48" ry="20" fill="#c8862a"/><path d="M12 76c0-20 22-34 48-34s48 14 48 34c-10 10-28 14-48 14s-38-4-48-14z" fill="#f0b45a" stroke="#8a5210" stroke-width="3"/><path d="M36 60c8 4 16 4 24 0M60 64c8 4 16 4 24 0" stroke="#8a5210" stroke-width="3" fill="none"/><path d="M30 76h60" stroke="#c8862a" stroke-width="3" stroke-dasharray="6 6"/>`,
  socks: `<path d="M26 20h26v52c0 10 6 14 14 20l-10 16c-12-6-30-20-30-38z" fill="#c4161c" stroke="#5a0a0a" stroke-width="3"/><path d="M26 32h26M26 44h26" stroke="#fff" stroke-width="5"/><path d="M66 14h26v52c0 10 6 14 14 20l-10 16c-12-6-30-20-30-38z" fill="#2c6fd6" stroke="#123a7a" stroke-width="3"/><path d="M66 26h26M66 38h26" stroke="#fff" stroke-width="5"/>`,
  honey: `<path d="M26 44c0-10 68-10 68 0v50c0 10-68 10-68 0z" fill="#b8741a" stroke="#6a4210" stroke-width="3"/><path d="M26 58c20 6 48 6 68 0M26 80c20 6 48 6 68 0" stroke="#6a4210" stroke-width="4" fill="none"/><ellipse cx="60" cy="44" rx="34" ry="8" fill="#ffc83a" stroke="#6a4210" stroke-width="3"/><path d="M44 46c0 10 4 14 6 6 2-6 4 10 8 4" stroke="#ffb020" stroke-width="5" fill="none"/>`,
  valenki: `<path d="M18 20h30v60c0 8 6 10 16 12 8 2 10 6 10 12v4H18z" fill="#5a5048" stroke="#2a2420" stroke-width="3"/><path d="M58 14h30v60c0 8 6 10 16 12 8 2 10 6 10 12v4H58z" fill="#7a6e64" stroke="#2a2420" stroke-width="3"/><path d="M18 30h30M58 24h30" stroke="#c4161c" stroke-width="4"/>`,
  painting: `<rect x="12" y="20" width="96" height="80" fill="#c8862a" stroke="#6a4210" stroke-width="4"/><rect x="22" y="30" width="76" height="60" fill="#bfe3f2"/><path d="M22 76l20-20 16 14 14-18 26 24v14H22z" fill="#4a8a2c"/><circle cx="80" cy="44" r="8" fill="#f5c542"/><path d="M22 84c20-6 50-6 76 0v6H22z" fill="#3a8ac4"/>`,
};
export const giftSVG = (id) => `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">${G[id] || ''}</svg>`;

// ---------- Значки интерфейса ----------
export const ICONS = {
  coin: `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#ffd23f" stroke="#a87a00" stroke-width="3"/><circle cx="20" cy="20" r="11" fill="none" stroke="#e0a800" stroke-width="2.5"/><path d="M20 12l2.4 5 5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" fill="#e0a800"/></svg>`,
  pause: `<svg viewBox="0 0 40 40"><rect x="11" y="9" width="6" height="22" rx="2" fill="currentColor"/><rect x="23" y="9" width="6" height="22" rx="2" fill="currentColor"/></svg>`,
  sound: `<svg viewBox="0 0 40 40"><path d="M8 16h6l8-7v22l-8-7H8z" fill="currentColor"/><path d="M27 14c3 3 3 9 0 12M31 10c5 5 5 15 0 20" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  voice: `<svg viewBox="0 0 40 40"><rect x="15" y="6" width="10" height="18" rx="5" fill="currentColor"/><path d="M10 19c0 6 4 10 10 10s10-4 10-10M20 29v6M14 35h12" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  music: `<svg viewBox="0 0 40 40"><path d="M15 28V10l16-4v18" stroke="currentColor" stroke-width="3" fill="none"/><circle cx="11" cy="28" r="5" fill="currentColor"/><circle cx="27" cy="24" r="5" fill="currentColor"/></svg>`,
  close: `<svg viewBox="0 0 40 40"><path d="M11 11l18 18M29 11L11 29" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`,
  star: `<svg viewBox="0 0 40 40"><path d="M20 4l4.7 10.5 11.3 1.1-8.5 7.6 2.5 11.2L20 28.6l-10 5.8 2.5-11.2L4 15.6l11.3-1.1z" fill="#ffd23f" stroke="#a87a00" stroke-width="2"/></svg>`,
  ad: `<svg viewBox="0 0 40 40"><rect x="5" y="9" width="30" height="22" rx="5" fill="currentColor"/><path d="M17 15v10l8-5z" fill="#2a1d6e"/></svg>`,
  trophy: `<svg viewBox="0 0 40 40"><path d="M12 6h16v8a8 8 0 0 1-16 0z" fill="#ffd23f" stroke="#a87a00" stroke-width="2"/><path d="M12 9H6c0 6 3 9 7 9M28 9h6c0 6-3 9-7 9" stroke="#a87a00" stroke-width="2.4" fill="none"/><path d="M17 22h6v6h-6zM12 30h16v5H12z" fill="#ffd23f" stroke="#a87a00" stroke-width="2"/></svg>`,
  gift: `<svg viewBox="0 0 40 40"><rect x="6" y="15" width="28" height="20" rx="2" fill="#d8343c"/><rect x="4" y="11" width="32" height="7" rx="2" fill="#e85a5a"/><path d="M20 11v24" stroke="#ffd23f" stroke-width="4"/><path d="M20 11c-4-8-12-6-9 0zM20 11c4-8 12-6 9 0z" fill="none" stroke="#ffd23f" stroke-width="3"/></svg>`,
  museum: `<svg viewBox="0 0 40 40"><path d="M4 15L20 5l16 10z" fill="#ffd23f" stroke="#a87a00" stroke-width="2"/><path d="M8 17v13M16 17v13M24 17v13M32 17v13" stroke="#fff" stroke-width="4"/><path d="M4 32h32v4H4z" fill="#ffd23f"/></svg>`,
  shop: `<svg viewBox="0 0 40 40"><path d="M6 12h28l-3 20H9z" fill="#2f9e5b" stroke="#16603a" stroke-width="2"/><path d="M14 14V9a6 6 0 0 1 12 0v5" stroke="#16603a" stroke-width="3" fill="none"/></svg>`,
  rules: `<svg viewBox="0 0 40 40"><rect x="8" y="5" width="24" height="30" rx="3" fill="#fff8e8" stroke="#8a6a3a" stroke-width="2"/><path d="M13 13h14M13 19h14M13 25h9" stroke="#8a6a3a" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  hint: `<svg viewBox="0 0 40 40"><path d="M20 5a11 11 0 0 0-6 20v4h12v-4A11 11 0 0 0 20 5z" fill="#ffd23f" stroke="#a87a00" stroke-width="2"/><path d="M15 33h10" stroke="#a87a00" stroke-width="3" stroke-linecap="round"/></svg>`,
  rating: `<svg viewBox="0 0 40 40"><rect x="5" y="20" width="8" height="15" fill="#f5c542"/><rect x="16" y="10" width="8" height="25" fill="#ffd23f"/><rect x="27" y="16" width="8" height="19" fill="#f5c542"/></svg>`,
  back: `<svg viewBox="0 0 40 40"><path d="M24 9L12 20l12 11" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  box: `<svg viewBox="0 0 120 110"><path d="M10 40h100v62H10z" fill="#8a1f3a" stroke="#4a0a1a" stroke-width="4"/><path d="M6 26h108v18H6z" fill="#a3263f" stroke="#4a0a1a" stroke-width="4"/><path d="M52 26h16v76H52z" fill="#f5c542"/><circle cx="60" cy="60" r="9" fill="#ffd23f" stroke="#a87a00" stroke-width="3"/><path d="M14 52h92" stroke="#f5c542" stroke-width="2" opacity=".6"/></svg>`,
  money: `<svg viewBox="0 0 120 80"><g transform="rotate(-8 60 40)"><rect x="14" y="16" width="92" height="48" rx="6" fill="#7ac86a" stroke="#2a6a2a" stroke-width="3"/><circle cx="60" cy="40" r="14" fill="#a8e090" stroke="#2a6a2a" stroke-width="2"/><text x="60" y="47" font-size="20" text-anchor="middle" font-family="Rubik,Arial" font-weight="800" fill="#2a6a2a">₽</text></g></svg>`,
};
