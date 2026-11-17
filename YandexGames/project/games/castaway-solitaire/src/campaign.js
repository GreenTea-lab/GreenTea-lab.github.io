// Twenty fifty-level chapters. Every new deal is constructed along a legal route,
// then checked independently through the same Tri rules used by the game.
import {rng,parseShape,computeCovers,SHAPES} from './logic.js';
export const CHAPTERS = [
 ['Первый берег','First shore'],['Тропы Робинзона','Robinson’s trails'],['Пальмовая роща','Palm grove'],['Рыбацкая бухта','Fishing bay'],
 ['Солнечный сад','Sun garden'],['Коралловый мыс','Coral cape'],['Письма с моря','Letters from the sea'],['Бамбуковый лес','Bamboo forest'],
 ['Ветер странствий','Wandering wind'],['Тихая гавань','Quiet harbour'],['Сад фонарей','Lantern garden'],['Лунная тропа','Moonlit path'],
 ['Мастерская мечты','Dream workshop'],['Серебряный прибой','Silver surf'],['Птичий остров','Bird island'],['Капитанский путь','Captain’s route'],
 ['Скрытая лагуна','Hidden lagoon'],['Сокровища берега','Coastal treasures'],['Большое путешествие','The great voyage'],['Остров — наш дом','Our island home'],
];
export const chapterOf=n=>Math.min(19,Math.max(0,Math.floor((n-1)/50)));
export function campaignPlan(n){
 const chapter=chapterOf(n),beat=(n-1)%10,seed=rng(n*190081),family=(n+chapter*7)%8;
 const rows=3+Math.floor(seed()*3),lines=[];
 for(let row=0;row<rows;row++){
  const line=Array(14).fill(' '),offset=(row+family)%2;
  for(let col=0;col<7;col++){
   let on;
   if(family===0)on=col>=3-row&&col<=3+row;
   else if(family===1)on=row%2===0||col%2===0;
   else if(family===2)on=Math.abs(col-3)>=Math.max(0,2-row);
   else if(family===3)on=Math.abs(col-3)<=Math.min(row+1,rows-row+1);
   else if(family===4)on=col%3!==row%3;
   else if(family===5)on=Math.abs(col-3)>=Math.max(0,row-1);
   else if(family===6)on=col===0||col===6||col===3||row===rows-1;
   else on=seed()>.27;
   if(on)line[col*2+offset]='o';
  }
  if(!line.includes('o'))line[6]='o';lines.push(line.join(''));
 }
 // Small geometric changes between chapters; never exceed a readable seven-card row.
 for(let cut=0;cut<1+n%3;cut++){
  const row=Math.floor(seed()*lines.length),chars=lines[row].split(''),slots=chars.map((c,i)=>c==='o'?i:-1).filter(i=>i>=0);
  if(slots.length>2){chars[slots[Math.floor(seed()*slots.length)]]=' ';lines[row]=chars.join('');}
 }
 const shape='voyage-'+n,mirror=n%2===0;SHAPES[shape]=lines;
 const difficulty=beat===0||beat===5?'calm':beat===8||beat===9?'challenge':'steady';
 return {n,chapter,shape,mirror,difficulty,family,lines};
}
export function makeCampaignLevel(n,attempt=0){
 const plan=campaignPlan(n),r=rng(n*7919+4129+attempt*104729),cards=parseShape(plan.lines,plan.mirror);
 computeCovers(cards);
 const left=new Set(cards.map((_,i)=>i)),order=[];
 while(left.size){const free=[...left].filter(i=>cards[i].covers.every(j=>!left.has(j)));const i=free[Math.floor(r()*free.length)];order.push(i);left.delete(i);}
 const pos=new Map(order.map((i,k)=>[i,k]));
 // Key always appears earlier on the legal route than its corresponding locks.
 const locks=plan.difficulty==='calm'?0:1+(plan.chapter%2),sand=plan.difficulty==='challenge'?3:plan.chapter%3===0?0:2;
 for(let group=1;group<=locks;group++){
  const keyAt=2+(group-1)*4,key=order[keyAt];if(key===undefined)continue;cards[key].key=group;
  const locked=order.slice(keyAt+4).filter(i=>!cards[i].key&&!cards[i].lock);
  for(let j=0;j<Math.min(2,locked.length);j++)cards[locked[Math.floor((locked.length-1-j)*.65)]].lock=group;
 }
 let sandy=0;
 for(const i of order){
  const blockers=cards[i].covers,opened=blockers.length?Math.max(...blockers.map(j=>pos.get(j)))+1:0;
  if(sandy<sand&&!cards[i].key&&!cards[i].lock&&pos.get(i)-opened>=3){cards[i].sand=2+(sandy%2);sandy++;}
 }
 order.filter((_,k)=>k%7===3).forEach(i=>cards[i].coin=true);
 const pool=Array.from({length:13},()=>[0,1,2,3]);
 const wrap=k=>(k+12)%13+1;
 const take=rank=>{const list=pool[rank-1];return {rank,suit:list.splice(Math.floor(r()*list.length),1)[0]};};
 const available=()=>pool.map((x,i)=>x.length?i+1:0).filter(Boolean);
 let top=1+Math.floor(r()*13);const waste=take(top),draws=[],solution=[];
 let run=0,nextBreak=plan.difficulty==='challenge'?3:plan.difficulty==='calm'?7:5;
 for(const i of order){
  let adjacent=[wrap(top-1),wrap(top+1)].filter(k=>pool[k-1].length);
  if((run>=nextBreak||!adjacent.length)&&draws.length<13){
   const options=available().filter(k=>[wrap(k-1),wrap(k+1)].some(v=>pool[v-1].length));
   if(options.length){top=options[Math.floor(r()*options.length)];draws.push(take(top));solution.push(-1);run=0;}
  }
  adjacent=[wrap(top-1),wrap(top+1)].filter(k=>pool[k-1].length);
  if(!adjacent.length)throw Error('Campaign rank pool exhausted at '+n);
  top=adjacent[Math.floor(r()*adjacent.length)];Object.assign(cards[i],take(top));solution.push(i);run++;
 }
 const spare=plan.difficulty==='calm'?6:plan.difficulty==='challenge'?3:4,extras=[];
 for(let i=0;i<spare;i++){const a=available();if(a.length)extras.push(take(a[Math.floor(r()*a.length)]));}
 return {n,shape:plan.shape,cards,stock:[...extras,...draws.reverse()],waste,stars:[1,Math.max(2,extras.length-1)],plan,solution,target:draws.length+extras.length};
}
