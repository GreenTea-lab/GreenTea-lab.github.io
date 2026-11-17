// Проверка уровней: каждая последовательность букв длиной >= 2 должна быть словом из списка
import fs from 'fs';
import {Puzzle} from '../src/puzzle.js';
let bad = 0;
for (const lang of ['ru', 'en']) {
  const data = JSON.parse(fs.readFileSync(`src/data/${lang}.json`, 'utf8'));
  for(const mode of ['levels','adult'])if(data[mode]?.length!==1000){console.error(lang,mode,'expected 1000 levels');bad++;}
  const answers=new Set();
  const levels = [...data.levels, ...(data.adult || [])];
  levels.forEach((L, li) => {
    const g = Array.from({ length: L.h }, () => Array(L.w).fill(null));
    const set = new Set();
    for (const [x, y, d, w] of L.e) {
      const answer=w.toUpperCase().replace(/Ё/g,'Е');
      if(answers.has(answer)){bad++;console.error(lang,li+1,'повтор ответа',answer);}answers.add(answer);
      if(!Number.isInteger(x)||!Number.isInteger(y)||!['a','d'].includes(d)||x<0||y<0||x+(d==='a'?w.length:1)>L.w||y+(d==='d'?w.length:1)>L.h)throw Error('Out-of-bounds entry '+lang+'/'+li);
      set.add(`${x},${y},${d}`);
      for (let i = 0; i < w.length; i++) {
        const cx = x + (d === 'a' ? i : 0), cy = y + (d === 'd' ? i : 0);
        if (g[cy][cx] && g[cy][cx] !== w[i]) { bad++; console.log(lang, li + 1, 'конфликт', w); }
        g[cy][cx] = w[i];
      }
    }
    const runs = [];
    for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
      if (!g[y][x]) continue;
      if ((x === 0 || !g[y][x - 1]) && g[y][x + 1]) runs.push(`${x},${y},a`);
      if ((y === 0 || !g[y - 1][x]) && g[y + 1] && g[y + 1][x]) runs.push(`${x},${y},d`);
    }
    for (const r of runs) if (!set.has(r)) { bad++; console.log(lang, li + 1, 'лишнее слово в', r); }
    if (runs.length !== set.size) { bad++; console.log(lang, li + 1, 'runs', runs.length, 'entries', set.size); }
    const occupied=g.flat().filter(Boolean).length,visited=new Set(),queue=[];
    outer:for(let y=0;y<L.h;y++)for(let x=0;x<L.w;x++)if(g[y][x]){queue.push([x,y]);visited.add(x+','+y);break outer;}
    while(queue.length){const [x,y]=queue.pop();for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=a+','+b;if(g[b]?.[a]&&!visited.has(k)){visited.add(k);queue.push([a,b]);}}}
    if(visited.size!==occupied){bad++;console.error(lang,li+1,'disconnected grid');}
    const pz=new Puzzle(L);pz.cells.forEach((c,i)=>{if(c)pz.setLetter(i,c.ch);});pz.refresh();
    if(!pz.complete()||pz.stars()!==3){bad++;console.error(lang,li+1,'cannot complete through game model');}
    if (process.argv[2] == li + 1 && lang === (process.argv[3] || 'ru')) console.log(g.map((r) => r.map((c) => c || '·').join(' ')).join('\n'));
  });
  for(const [w]of data.bank)if(answers.has(w)){bad++;console.error('Daily bank intersects campaigns:',lang,w);}
  console.log(lang,'уникальных ответов в двух режимах:',answers.size);
}
console.log(bad ? `ОШИБОК: ${bad}` : 'уровни корректны');
if(bad)process.exitCode=1;
