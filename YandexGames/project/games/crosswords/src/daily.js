import {generate,hashStr} from './gen.js';
export function dailyPuzzle(rows,key,lang){
  const bank=rows.map(([word,clue,tier])=>({word,clue:clue.split('|')[0],tier}));
  const seed=hashStr(key+':'+lang);let r=seed;
  const rnd=()=>((r=(r*1664525+1013904223)>>>0)/4294967296);
  const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  const mix=[.35,.45,.2],pool=[];
  for(let k=0;k<3;k++)pool.push(...shuffle(bank.filter(w=>w.tier===k+1&&w.word.length<=10)).slice(0,Math.round(50*mix[k])));
  const res=generate(pool,{target:10,maxW:10,maxH:10,tries:40,seed})||generate(pool,{target:8,maxW:10,maxH:10,tries:40,seed:seed+1})||generate(bank.slice(0,300),{target:6,maxW:12,maxH:12,tries:80,seed:seed+2});
  if(!res)throw Error('Daily puzzle could not be generated');
  return {w:res.w,h:res.h,e:res.entries.map(e=>[e.x,e.y,e.dir,e.word,e.clue])};
}
