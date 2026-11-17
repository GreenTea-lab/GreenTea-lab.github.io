// Frozen v2.0 campaign metadata, used only to resume boards dealt before balance v3.
// Keep star thresholds/layout identifiers stable for these already saved games.
import { positions } from './layouts.js';
import { FACE_ORDER } from './tiles.js';
import { rng } from './core.js';
export const PER=50;
const ids=['moscow','spb','paris','amsterdam','venice','rome','istanbul','cairo','kyoto','rio','london','prague','lisbon','barcelona','vienna','marrakesh','newyork','singapore','sydney','santorini'];
export const CITIES=ids.map(id=>({id}));
export const ROUTES=['first','gold','emerald','sapphire'];
export const STAGES=CITIES.length;
export const COUNT=STAGES*PER;
export const ROUND1=COUNT;
export const cityOf=stage=>CITIES[Math.max(0,Math.min(STAGES-1,stage))];
export const cityIdx=stage=>Math.max(0,Math.min(STAGES-1,stage));
export const routeOf=()=>0;
export const isGold=()=>false;
export const FIRST={coin:3,lock:16,hidden:28};
const EARLY=['mini','rows3','plus','bricks','hill','pillow','window','heart','steps','kremlin'];
const MID=['pyramid','heart','flower','butterfly','ring','tower','bridge','fan','anchor','star','boat','teapot','cat','tree','wave','crown','house'];
const BIG=['castle','turtle','stairs','grand','twin','checker','diamond','dome','pagoda','pyramids'];
const FINALS=['kremlin','spire','eiffel','mill','gondola','colosseum','dome','pyramids','pagoda','palm','tower','castle','boat','flower','crown','dome','stairs','tree','fan','hill'];
export function pickTypes(n,unlocked,R){
  const a=FACE_ORDER.slice(0,Math.min(FACE_ORDER.length,Math.max(n,unlocked)));
  for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a.slice(0,n);
}
export function parTimes(pairs,types,hidden,locks){
  const t3=Math.round((16+pairs*(3.7+types*.09))*(hidden?1.25:1)+(locks?10:0));
  return {t3:Math.ceil(t3/5)*5,t2:Math.ceil(t3*1.8/5)*5};
}
export function legacyLevel(i){
  if(!Number.isInteger(i)||i<0||i>=COUNT)throw new RangeError('Level out of range');
  const c=Math.floor(i/PER),k=i%PER,R=rng(9200+i*7919);
  const chapter=Math.floor(k/10),pool=(chapter>=3 || c>=7&&chapter>=2)?BIG:MID;
  const lay=k===49?FINALS[c]:c===0&&k<10?EARLY[k]:k%10===0?MID[(c+chapter)%MID.length]:pool[Math.floor(R()*pool.length)];
  let pos=positions(lay);
  // Зеркало и разворот разнообразят геометрию при одинаковом названии фигуры.
  if(R()<.5 && !(c===0&&k<3)){const mx=Math.max(...pos.map(p=>p.x));pos=pos.map(p=>({...p,x:mx-p.x}));}
  if(R()<.35 && k>9)pos=pos.map(p=>({...p,x:p.y,y:p.x}));
  const pairs=pos.length/2,types=Math.min(26,Math.ceil(pairs/1.6),c===0&&k<3?3+k:5+Math.floor(c*.65)+chapter*2+(k%3));
  const locks=i>=FIRST.lock&&(k%10===6||k%10===8)?Math.min(8,3+Math.floor(c/4)):0;
  const hidden=i>=FIRST.hidden&&(k%10===4||k%10===9)?Math.min(.4,.15+c*.012):0;
  return {idx:i,city:c,C:CITIES[c],lay,pos,pairs,types:pickTypes(types,Math.min(32,5+i*.35),R),coins:i>=FIRST.coin?1+(k%10===9?1:0):0,locks,hidden,stage:c,route:0,gold:false,final:k===49,par:parTimes(pairs,types,hidden,locks)};
}
const DAILY_POOL=[...MID,...BIG,'eiffel','mill','gondola','colosseum','palm'];

export function dailyBoard(key) {
  let h = 7;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const R = rng(h);
  const lay = DAILY_POOL[Math.floor(R() * DAILY_POOL.length)];
  const pos = positions(lay);
  const pairs = pos.length / 2;
  const types = Math.max(8, Math.min(18, Math.ceil(pairs / 1.6)));
  const city = Math.floor(R() * CITIES.length);
  // по воскресеньям — тайные плитки
  const sunday = new Date(key + 'T12:00:00').getDay() === 0;
  const hidden = sunday ? 0.35 : 0;
  return { key, seed: h, city, lay, pos, pairs, types: pickTypes(types, 32, R), coins: 2, locks: 0, hidden, par: parTimes(pairs, types, hidden, 0) };
}

export function starsFor(L, sec) {
  return sec <= L.par.t3 ? 3 : sec <= L.par.t2 ? 2 : 1;
}

// бесконечный режим: доска n (с 1) — сложность растёт, города сменяют друг друга
const ENDLESS_POOL = [
  ['pillow', 'pyramid', 'heart', 'flower', 'ring', 'butterfly', 'anchor', 'boat'],
  ['fan', 'bridge', 'tower', 'twin', 'eiffel', 'mill', 'gondola', 'colosseum', 'star', 'teapot', 'cat', 'wave'],
  ['checker', 'castle', 'turtle', 'dome', 'kremlin', 'spire', 'pagoda', 'pyramids', 'crown', 'house', 'tree', 'diamond'],
  ['stairs', 'grand', 'turtle', 'castle', 'dome', 'pyramids', 'diamond', 'house'],
];
export function endlessBoard(n, seed) {
  const R = rng(seed + n * 131);
  const tier = Math.min(ENDLESS_POOL.length - 1, Math.floor((n - 1) / 2));
  const lay = ENDLESS_POOL[tier][Math.floor(R() * ENDLESS_POOL[tier].length)];
  const pos = positions(lay);
  const pairs = pos.length / 2;
  const types = Math.max(6, Math.min(32, 8 + n * 2, Math.ceil(pairs / 1.5)));
  return {
    n,
    city: (n - 1) % CITIES.length,
    lay,
    pos,
    pairs,
    types: pickTypes(types, Math.min(32, 10 + n * 3), R),
    coins: 2,
    locks: n >= 3 && n % 2 === 1 ? Math.min(10, 3 + n) : 0,
    hidden: n >= 4 && n % 2 === 0 ? Math.min(0.55, 0.25 + n * 0.03) : 0,
  };
}
