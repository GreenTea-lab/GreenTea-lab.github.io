import {achReady} from './ach.js';
import {QUESTS} from './travel.js';
import {dateKey,weekOf,weeklyState} from './collection.js';

// Badges count claimable rewards, never unread letters or automatically granted prizes.
export function journalRewards(data,today=dateKey()){
  const p=data.postOffice||{},mail=p.day===today?QUESTS.filter(q=>!p.claimed?.[q.id]&&(p.counts?.[q.id]||0)>=q.goal).length:0;
  const achievements=achReady(data),weekly=[];
  const monday=new Date(weekOf(today)+'T12:00:00');
  for(let i=0;i<8;i++){
    const d=new Date(monday);d.setDate(d.getDate()-i*7);const key=dateKey(d),w=weeklyState(data,key);
    if(!w.claimed&&w.count>=w.goal)weekly.push(key);
  }
  const total=mail+achievements+weekly.length;
  return {mail,achievements,weekly,total,tabs:{home:total,mail,trips:0,letters:0,shelf:0}};
}
