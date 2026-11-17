// Frozen v2.1 metadata for balanceVersion 3 saved boards.
// Кампания: 20 городов по 50 уровней, всего 1000. Коллекция — четыре открытки города.
import { positions } from './layouts.js';
import { FACE_ORDER } from './tiles.js';
import { rng } from './core.js';
const CAMPAIGN_SEEDS=[];
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
export const FIRST={coin:3,repeat:11,lock:16,hidden:25};
export const BALANCE_VERSION=3;
const FIRST_CITY=[
  'mini','rows3','plus','bricks','hill','pillow','butterfly','anchor','ring','window',
  'pillow','flower','heart','boat','anchor','pyramid','window','heart','star','gondola',
  'flower','pyramid','gondola','teapot','heart','pillow','window','star','gondola','teapot',
  'heart','star','tree','crown','gondola','teapot','tower','pagoda','house','dome',
  'gondola','cat','tower','pagoda','tree','house','dome','diamond','pyramids','kremlin',
];
export const RHYTHM=['easy','normal','normal','hard','easy','normal','normal','hard','normal','hard'];
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
function expandFinal(pos,targetPairs){
  const out=pos.map(p=>({...p}));
  if(out.length>=targetPairs*2)return out;
  const base=out.filter(p=>p.z===0),minX=Math.min(...base.map(p=>p.x)),maxX=Math.max(...base.map(p=>p.x)),minY=Math.min(...base.map(p=>p.y)),maxY=Math.max(...base.map(p=>p.y));
  const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
  for(let ring=0;out.length<targetPairs*2&&ring<12;ring++){
    const candidates=[];
    for(let y=minY-ring*2;y<=maxY+ring*2;y+=2)for(let x=minX;x<=maxX;x+=2){
      if(!out.some(p=>p.z===0&&Math.abs(p.x-x)<2&&Math.abs(p.y-y)<2))candidates.push({x,y,z:0});
    }
    candidates.sort((a,b)=>Math.abs(a.y-cy)+Math.abs(a.x-cx)-Math.abs(b.y-cy)-Math.abs(b.x-cx)||a.y-b.y||a.x-b.x);
    for(const p of candidates){if(out.length>=targetPairs*2)break;out.push(p);}
  }
  return out;
}

export function balancedLevelV3(i){
  if(!Number.isInteger(i)||i<0||i>=COUNT)throw new RangeError('Level out of range');
  const c=Math.floor(i/PER),k=i%PER,R=rng(9200+i*7919);
  const chapter=Math.floor(k/10),slot=k%10;
  let tier=c===0&&k<11?'easy':RHYTHM[slot];
  if(c===0&&(k===16||k===25))tier='easy';
  if(k===49)tier='hard';
  let lay;
  if(c===0)lay=FIRST_CITY[k];
  else if(k===49)lay=FINALS[c];
  else {
    const all=[...new Set([...MID,...BIG,...FINALS])];
    const lower=tier==='easy'?Math.min(25,14+Math.floor(c*.5)+Math.floor(chapter*.4)):tier==='normal'?18+Math.min(8,Math.floor(c*.35))+Math.floor(chapter/2):23+Math.min(14,Math.floor(c*.65))+Math.floor(chapter/2);
    const upper=tier==='easy'?Math.min(25,lower+5):tier==='normal'?Math.min(37,lower+8):Math.min(50,lower+12);
    const pool=all.filter(id=>{const ps=positions(id);return ps.length/2>=lower&&ps.length/2<=upper&&(tier!=='easy'||Math.max(...ps.map(p=>p.z))<=1);});
    lay=pool[Math.floor(R()*pool.length)]||'wave';
  }
  const finalePairs=33+Math.floor(c*.6);
  if(k===49&&c>2&&positions(lay).length/2<finalePairs-10){
    const larger=['twin','checker','castle','turtle','stairs','grand'].filter(id=>positions(id).length/2>=finalePairs-5&&positions(id).length/2<=finalePairs+6);
    lay=larger[Math.floor(R()*larger.length)]||'castle';
  }
  if(i===COUNT-1)lay='grand';
  let pos=positions(lay);
  if(k===49)pos=expandFinal(pos,finalePairs);
  // Зеркало и разворот разнообразят геометрию при одинаковом названии фигуры.
  if(R()<.5 && !(c===0&&k<3)){const mx=Math.max(...pos.map(p=>p.x));pos=pos.map(p=>({...p,x:mx-p.x}));}
  if(R()<.35 && k>9)pos=pos.map(p=>({...p,x:p.y,y:p.x}));
  const pairs=pos.length/2,pairCopies=tier==='easy'?1:tier==='normal'?2:3;
  let locks=0,hiddenCount=0;
  if(c===0){
    if(k===16)locks=2;
    else if(k>16&&[18,19,23,31,33,36,38,39,43,45,46,47,48,49].includes(k))locks=k<30?2:3;
    if(k===25)hiddenCount=3;
    else if(k>25&&[26,28,29,32,35,36,38,39,42,43,46,47,48,49].includes(k))hiddenCount=k<35?4:k<45?5:6;
  }else if(tier!=='easy'){
    locks=(slot===3||slot===6||slot===9)?Math.min(7,2+Math.floor(c/4)+(tier==='hard'?1:0)):0;
    hiddenCount=(slot===2||slot===7||slot===9)?Math.min(14,3+Math.floor(c/2)+(tier==='hard'?2:0)):0;
  }
  const faceCount=Math.min(32,Math.ceil((pairs-(locks?1:0))/pairCopies)),types=pickTypes(faceCount,32,R);
  const hidden=hiddenCount/Math.max(1,pos.filter(p=>p.z===0).length);
  // Every profile has its own time allowance, including depth and repeated-face decisions.
  const layers=1+Math.max(...pos.map(p=>p.z)),base=parTimes(pairs,faceCount,hiddenCount>0,locks);
  const t3=Math.ceil((base.t3+(layers-1)*5+(pairCopies-1)*pairs*.35)/5)*5;
  const record=CAMPAIGN_SEEDS[i],seeds=record?.[0]||[950003+i*104729];
  return {idx:i,city:c,C:CITIES[c],lay,pos,pairs,types,coins:i>=FIRST.coin?1+(k===49?1:0):0,locks,hidden,hiddenCount,pairCopies,tier,balanceVersion:BALANCE_VERSION,seeds,stage:c,route:0,gold:false,final:k===49,par:{t3,t2:Math.ceil(t3*1.8/5)*5}};
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
