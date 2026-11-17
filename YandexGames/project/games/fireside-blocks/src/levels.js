// Путешествие по временам года: 4 главы по 15 уровней.
// Уровень: стартовая раскладка (узор из старых брусков) + цель: собрать предметы или набрать очки.
import { N, rng, emptyBoard } from './core.js';
import { PAR } from './par.js';
import { SALT } from './salt.js';
import { TUNING } from './campaign-tuning.js';

export const SEASONS = [
  { id: 'autumn', items: ['leaf', 'acorn', 'mushroom'] },
  { id: 'winter', items: ['snowflake', 'mitten', 'ornament'] },
  { id: 'spring', items: ['tulip', 'daisy', 'ladybug'] },
  { id: 'summer', items: ['strawberry', 'cherry', 'butterfly'] },
  { id: 'sea', items: ['shell', 'starfish', 'anchor'] },
  { id: 'fair', items: ['bagel', 'gingerbread', 'honey'] },
  { id: 'forest', items: ['owl', 'pinecone', 'fern'] },
  { id: 'night', items: ['star', 'moon', 'lantern'] },
  { id: 'orchard', items: ['leaf','cherry','butterfly'] },
  { id: 'bakery', bg:'fair', items:['bagel','gingerbread','honey'] },
  { id: 'tea', items:['tulip','daisy','butterfly'] },
  { id: 'greenhouse', bg:'spring', items:['tulip','ladybug','fern'] },
  { id: 'library', items:['star','owl','lantern'] },
  { id: 'mountain', bg:'winter', items:['snowflake','mitten','pinecone'] },
  { id: 'river', bg:'sea', items:['shell','anchor','starfish'] },
  { id: 'lavender', items:['butterfly','daisy','ladybug'] },
  { id: 'workshop', items:['ornament','star','gingerbread'] },
  { id: 'festival', bg:'fair', items:['honey','bagel','lantern'] },
  { id: 'aurora', items:['snowflake','star','moon'] },
  { id: 'observatory', bg:'night', items:['moon','star','owl'] },
];
// длина глав: первые четыре по 15 уровней (как раньше), новые по 20
export const LENS = [15,15,15,15,20,20,20,20,70,70,70,70,70,70,70,70,70,70,80,80];
export const STARTS = LENS.map((_, k) => LENS.slice(0, k).reduce((a, b) => a + b, 0));
export const COUNT = LENS.reduce((a, b) => a + b, 0);
export const chapterOf = (idx) => {
  let c = 0;
  STARTS.forEach((s, k) => idx >= s && (c = k));
  return c;
};
const OLD = 60; // уровни до этого номера считаются как раньше, чтобы сохранения и нормы ходов не поехали

// узоры (цифра — цвет бруска, «.» — пусто); полные ряды/столбцы потом разбиваются
const MASKS = [
  ['........', '........', '..1111..', '..1..1..', '..1..1..', '..1111..', '........', '........'],
  ['22....22', '2......2', '........', '........', '........', '........', '2......2', '22....22'],
  ['........', '.33..33.', '3333333.', '3333333.', '.33333..', '..333...', '...3....', '........'],
  ['...4....', '..444...', '.44444..', '4444444.', '.5...5..', '.5.5.5..', '.5...5..', '.55555..'],
  ['1.1.1.1.', '........', '.2.2.2.2', '........', '3.3.3.3.', '........', '.4.4.4.4', '........'],
  ['66....66', '66....66', '........', '...00...', '...00...', '........', '66....66', '66....66'],
  ['0.......', '00......', '000.....', '0000....', '00000...', '000000..', '0000000.', '........'],
  ['........', '.111111.', '.1....1.', '.1.22.1.', '.1.22.1.', '.1....1.', '.111111.', '........'],
  ['5......5', '.5....5.', '..5..5..', '...55...', '...55...', '..5..5..', '.5....5.', '5......5'],
  ['........', '3333333.', '........', '.4444444', '........', '3333333.', '........', '.4444444'],
  ['...22...', '...22...', '...22...', '22222222', '22222222', '...22...', '...22...', '...22...'],
  ['11...111', '1.....11', '........', '..666...', '..666...', '........', '11.....1', '111...11'],
  ['...00...', '..0..0..', '.0....0.', '0......0', '0......0', '.0....0.', '..0..0..', '...00...'],
  ['........', '..5555..', '.5....5.', '.5.55.5.', '.5.55.5.', '.5....5.', '..5555..', '........'],
  ['44....44', '4......4', '..3333..', '..3..3..', '..3..3..', '..3333..', '4......4', '44....44'],
  ['6666....', '6666....', '6666....', '6666....', '....1111', '....1111', '....1111', '....1111'],
  ['11......', '11..22..', '....22..', '..33....', '..33..44', '......44', '55......', '55..66..'],
  ['........', '.222222.', '.2....2.', '.2.33.2.', '.2.33.2.', '.2....2.', '.222222.', '........'],
  ['00......', '.11.....', '..22....', '...33...', '....44..', '.....55.', '......66', '.......0'],
  ['4.4.4.4.', '44444444', '.4.4.4.4', '........', '3.3.3.3.', '33333333', '.3.3.3.3', '........'],
  ['.5..5..5', '5..5..5.', '..5..5..', '.5..5..5', '5..5..5.', '..5..5..', '.5..5..5', '5..5..5.'],
  ['11111...', '1....2..', '1.22.2..', '1.2..2..', '1.2.22..', '1.2.....', '11222222', '........'],
  ['...66...', '..6666..', '.666666.', '66666666', '66666666', '.666666.', '..6666..', '...66...'],
  ['00......', '000.....', '.000....', '..000...', '...000..', '....000.', '.....000', '......00'],
];

function transform(cells, t) {
  // t: 0..7 — повороты и отражения
  return cells.map(([x, y]) => {
    let a = x, b = y;
    if (t & 1) a = N - 1 - a;
    if (t & 2) b = N - 1 - b;
    if (t & 4) [a, b] = [b, a];
    return [a, b];
  });
}

const cache = {};
export function level(idx) {
  if (!cache[idx]) cache[idx] = make(idx, TUNING[idx]?.salt ?? SALT[idx] ?? 0);
  return cache[idx];
}
// salt — запасной вариант раскладки: подбирается ботом (test/salt.mjs), если сидом получился слишком тугой уровень
export function make(idx, salt = 0) {
  const season = chapterOf(idx);
  const k = idx - STARTS[season];
  const S = SEASONS[season];
  if (idx >= 140) return makeExpanded(idx, salt, season, k, S);
  // до 60-го уровня шкала прежняя; дальше сложность продолжает расти до 1.5
  const diff = idx < OLD ? idx / (OLD - 1) : 1 + (0.5 * (idx - OLD + 1)) / (140 - OLD);
  const R = rng(1000 + idx * 31 + salt * 7919);
  const board = emptyBoard();
  // узор: первые уровни — лёгкие, потом плотнее
  let mi;
  if (idx < 3) mi = [0, 1, 7][idx];
  else mi = (idx * 7 + season * 3) % (idx < OLD ? 16 : MASKS.length);
  const mask = MASKS[mi];
  let cells = [];
  mask.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && cells.push([x, y, +ch])));
  const tr = idx < 3 ? 0 : (R() * 8) | 0;
  const pos = transform(cells.map(([x, y]) => [x, y]), tr);
  // на ранних уровнях убираем часть брусков, на поздних добавляем россыпь
  const keep = Math.min(1, 0.55 + diff * 0.8);
  pos.forEach(([x, y], j) => {
    if (idx >= 3 && R() > keep) return;
    board[y * N + x] = { c: cells[j][2] % 7 };
  });
  const extra = Math.floor(Math.min(diff, 1) * 7);
  for (let e = 0; e < extra; e++) {
    const i = (R() * N * N) | 0;
    if (!board[i]) board[i] = { c: (R() * 7) | 0 };
  }
  breakLines(board, R);
  // цель
  let goal;
  const scoreLevel = k % 5 === 4;
  if (scoreLevel) {
    goal = { type: 'score', target: Math.round((300 + diff * 1000 + k * 10) / 50) * 50 };
  } else {
    const late = idx >= OLD;
    const types = idx < 4 ? 1 : idx < 15 ? (k % 3 === 2 ? 2 : 1) : idx < 35 ? 2 : late ? (k % 4 === 0 ? 2 : 3) : k % 4 === 3 ? 3 : 2;
    // в новых главах предметов чуть больше, но на три вида: так цель выполнима, а не упирается в один редкий предмет
    let total = Math.round(4 + Math.min(diff, 1) * 13 + (k % 5) * 0.6 + (late ? (diff - 1) * 4 - 3 : 0));
    if (idx < 3) total = 3;
    if (late && types === 2) total -= 3;
    const its = S.items.slice(0).sort(() => R() - 0.5).slice(0, types);
    goal = { type: 'items', items: {} };
    let left = total;
    its.forEach((it, j) => {
      const n = j === its.length - 1 ? left : Math.max(2, Math.round(total / its.length));
      goal.items[it] = n;
      left -= n;
    });
    // часть предметов уже лежит на брусках поля
    const filled = board.map((c, i) => (c ? i : -1)).filter((i) => i >= 0).sort(() => R() - 0.5);
    let f = 0;
    for (const [it, n] of Object.entries(goal.items)) {
      const onBoard = Math.min(n, Math.ceil(n * (0.75 - diff * 0.25)));
      for (let q = 0; q < onBoard && f < filled.length; q++) board[filled[f++]].it = it;
    }
  }
  const L = { idx, season, S, k, diff, board, goal, itemsOnPieces: 0.3 + diff * 0.1, par: PAR[idx] || 30 };
  if (idx === 0) {
    // Первая победа за две линии: фигуры сразу подходят к очевидным пробелам.
    board.fill(null);
    for(let x=0;x<N;x++) {
      if(x<3||x>5)board[5*N+x]={c:3};
      if(x!==2&&x!==3)board[7*N+x]={c:4};
    }
    board[5*N].it='acorn';board[7*N].it='acorn';board[7*N+7].it='acorn';
    L.goal={type:'items',items:{acorn:3}};
    L.startingTray=[{s:'i3h',c:0},{s:'o2',c:2},{s:'dot',c:5}];
    L.par=6;
  }
  if (idx === 1) {
    board.fill(null);
    for(let y=0;y<N;y++){
      if(y!==2&&y!==3)board[y*N]={c:3};
      if(y<4||y>6)board[y*N+7]={c:4};
    }
    board[0].it='leaf';board[7].it='leaf';board[N+7].it='leaf';
    L.goal={type:'items',items:{leaf:3}};
    L.startingTray=[{s:'o2',c:1},{s:'i3v',c:3},{s:'i2h',c:0}];
    L.par=6;
  }
  if (idx === 2) {
    board.fill(null);
    for(let n=0;n<N;n++)if(n!==3&&n!==4){board[3*N+n]={c:5};board[n*N+3]={c:4};}
    for(const i of [3*N,3*N+7,3,7*N+3])board[i].it='mushroom';
    L.goal={type:'items',items:{mushroom:4}};
    L.startingTray=[{s:'o2',c:2},{s:'i2v',c:0},{s:'dot',c:5}];
    L.par=5;
  }
  return L;
}

// Волны сложности: передышка, знакомство с задачей, затем более плотная композиция.
function makeExpanded(idx,salt,season,k,S){
  const R=rng(55111+idx*113+salt*7919),board=emptyBoard();
  const wave=k%10,diff=.35+wave*.045+Math.min(.2,(season-8)*.016);
  const mask=MASKS[(idx*11+salt*3)%MASKS.length],tr=(R()*8)|0;
  const filled=[];mask.forEach((row,y)=>[...row].forEach((c,x)=>{if(c!=='.')filled.push([x,y,+c]);}));
  const ps=transform(filled.map(c=>c.slice(0,2)),tr);
  ps.forEach(([x,y],j)=>{if(R()<.55+diff*.25)board[y*N+x]={c:filled[j][2]%7};});
  for(let n=0;n<2+wave%4;n++){const i=(R()*64)|0;if(!board[i])board[i]={c:(R()*7)|0};}
  breakLines(board,R);
  const type=['items','lines','score','delivery','items','combo','items','lines','score','delivery'][wave];
  let goal;
  if(type==='score')goal={type,target:250+Math.floor(diff*200)+(k%3)*50};
  else if(type==='lines')goal={type,target:3+(wave>5?2:0)+(season>14?1:0)};
  else if(type==='combo')goal={type,target:2+(season>13?1:0)};
  else {
    const items={},its=type==='delivery'?[S.items[k%3]]:S.items.slice(0,k%3===0?1:2);
    its.forEach((it,j)=>items[it]=type==='delivery'?3+(k%3):3+((wave+j)%4));
    goal={type:'items',items,onlyBoard:type==='delivery'};
    const spots=board.map((b,i)=>b?i:-1).filter(i=>i>=0).sort(()=>R()-.5);
    let n=0;for(const [it,count]of Object.entries(items))for(let q=0;q<(goal.onlyBoard?count:Math.ceil(count*.6));q++){
      if(n>=spots.length){const empty=board.findIndex(b=>!b);board[empty]={c:(R()*7)|0};spots.push(empty);}
      board[spots[n++]].it=it;
    }
  }
  return {idx,season,S,k,diff,board,goal,variant:type,itemsOnPieces:.48,par:TUNING[idx]?.par||24,
    seeds:TUNING[idx]?.seeds,modifier:k%14===6?'small':k%14===10?'long':null};
}

// в стартовой раскладке не должно быть уже собранных линий
function breakLines(board, R) {
  for (let pass = 0; pass < 3; pass++) {
    for (let r = 0; r < N; r++) {
      let f = true;
      for (let c = 0; c < N && f; c++) f = !!board[r * N + c];
      if (f) board[r * N + ((R() * N) | 0)] = null;
    }
    for (let c = 0; c < N; c++) {
      let f = true;
      for (let r = 0; r < N && f; r++) f = !!board[r * N + c];
      if (f) board[((R() * N) | 0) * N + c] = null;
    }
  }
}

// звёзды по числу ходов: 3 — не больше «нормы», 2 — до полутора норм, 1 — прошёл
export function starsFor(L, moves) {
  if (moves <= L.par) return 3;
  if (moves <= Math.ceil(L.par * 1.5)) return 2;
  return 1;
}
