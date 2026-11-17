import {save} from './save.js';
import {LANG,t} from './i18n.js';

export function weekState(now=new Date()){
  const d=new Date(now);d.setDate(d.getDate()-((d.getDay()+6)%7));
  const key=[d.getFullYear(),d.getMonth()+1,d.getDate()].join('-');
  if(save.data.weekly.key!==key)save.data.weekly={key,solved:0,clean:0,words:0,claimed:[]};
  return save.data.weekly;
}
export const GOALS=[{id:'solved',n:5,coins:50,label:'goalSolve'},{id:'clean',n:3,coins:40,label:'goalClean'},{id:'words',n:40,coins:60,label:'goalWords'}];
export function recordPuzzle(pz,first){
  if(!first)return;
  const w=weekState();w.solved++;w.words+=pz.entries.length;if(!pz.hints)w.clean++;
}
export function recordWords(entries){
  const book=save.data.notebook[LANG];
  for(const e of entries){
    if(!book.some(x=>x.word===e.word))book.unshift({word:e.word,clue:e.clue,star:false});
  }
  // Keep all favourite words and the 200 most recent discoveries.
  let ordinary=0;save.data.notebook[LANG]=book.filter(x=>x.star||ordinary++<200);
}
export function goalsHTML(esc){
  const w=weekState();
  return `<p class="muted">${esc(t('weeklySub'))}</p>`+GOALS.map(g=>{
    const n=Math.min(g.n,w[g.id]),claimed=w.claimed.includes(g.id);
    return `<div class="goal"><div><b>${esc(t(g.label))}</b><small>${n} / ${g.n} · +${g.coins} ${esc(t('coins'))}</small><progress max="${g.n}" value="${n}"></progress></div><button class="mini claim" data-goal="${g.id}" ${claimed||n<g.n?'disabled':''}>${esc(t(claimed?'claimed':'claim'))}</button></div>`;
  }).join('');
}
export function claimGoal(id){
  const w=weekState(),g=GOALS.find(g=>g.id===id);
  if(!g||w.claimed.includes(id)||w[id]<g.n)return 0;
  w.claimed.push(id);save.data.coins+=g.coins;save.write();return g.coins;
}
