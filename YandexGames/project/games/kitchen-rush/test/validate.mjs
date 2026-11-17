// Проверка карт уровней: размеры, доступность станций, нужные для меню продукты
import { LEVELS, parseLevel, RECIPES, CRATE, ING } from '../src/data.js';
let bad = 0;
const walk = (c) => '.i12'.includes(c);
LEVELS.forEach((L, i) => {
  const P = parseLevel(i);
  const lens = new Set(L.map.map((r) => r.length));
  const err = (m) => { console.log(`L${i + 1}: ${m}`); bad++; };
  if (lens.size > 1) err('row lengths ' + [...lens]);
  // регионы пола
  const reg = {};
  let rid = 0;
  const regs = [];
  for (let z = 0; z < P.H; z++) for (let x = 0; x < P.W; x++) {
    if (!walk(P.at(x, z)) || reg[x + ',' + z] !== undefined) continue;
    const q = [[x, z]]; reg[x + ',' + z] = rid; let n = 0;
    while (q.length) { const [a, b] = q.pop(); n++; for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) { const k = (a+dx)+','+(b+dz); if (walk(P.at(a+dx,b+dz)) && reg[k] === undefined) { reg[k] = rid; q.push([a+dx,b+dz]); } } }
    regs.push(n); rid++;
  }
  // станции: к каким регионам примыкают
  const st = {};
  for (let z = 0; z < P.H; z++) for (let x = 0; x < P.W; x++) {
    const c = P.at(x, z);
    if (walk(c) || c === ' ') continue;
    const adj = new Set();
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) { const r = reg[(x+dx)+','+(z+dz)]; if (r !== undefined) adj.add(r); }
    (st[c] = st[c] || []).push({ x, z, adj: [...adj] });
    if (!adj.size && !'c<>^v'.includes(c)) err(`station ${c} at ${x},${z} unreachable`);
  }
  const need = new Set();
  let needPot = false, needPan = false, needBoard = false;
  for (const r of L.menu) {
    const R = RECIPES[r];
    if (!R) err('no recipe ' + r);
    if (R.soup) { need.add(R.soup); needPot = needBoard = true; }
    for (const p of R.parts || []) { const [id, s] = p.split(':'); need.add(id); if (s === 'chop') needBoard = true; if (s === 'cook') { if (ING[id].pan) { needPan = needBoard = true; } else needPot = true; } }
  }
  const crates = Object.keys(st).filter((c) => CRATE[c]).map((c) => CRATE[c]);
  for (const n of need) if (!crates.includes(n)) err('missing crate ' + n);
  if (needPot && !st.s) err('no pot');
  if (needPan && !st.f) err('no pan');
  if (needBoard && !st.x) err('no board');
  for (const c of 'pwg') if (!st[c]) err('no ' + c);
  if (L.dirty && (!st.d || !st.k)) err('dirty without d/k');
  if (!L.dirty && (st.d || st.k)) err('d/k without dirty');
  if (L.fire && !st.e) err('fire without extinguisher');
  const s1 = st['1'], s2 = st['2'];
  console.log(`L${i + 1} ${P.W}x${P.H} regions=${regs.join('/')} menu=${L.menu.join(',')}`);
});
console.log(bad ? bad + ' problems' : 'ALL OK');
