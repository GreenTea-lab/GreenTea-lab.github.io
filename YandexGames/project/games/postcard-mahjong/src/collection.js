// Коллекция и календарь не зависят от DOM: один расчёт для карты, наград и сохранения.
export const CARD_STEPS = [3, 10, 25, 50];
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function weekOf(key = dateKey()) {
  const d = new Date(key + 'T12:00:00');
  d.setDate(d.getDate() - (d.getDay()+6)%7);
  return dateKey(d);
}
export function weekDays(week) {
  return Array.from({length:7},(_,i)=>{const d=new Date(week+'T12:00:00');d.setDate(d.getDate()+i);return dateKey(d);});
}
export function weeklyState(data, week = weekOf()) {
  const days=weekDays(week), completed=days.filter(k=>data.dailyWins?.[k] || data.dc?.[k] !== undefined);
  return { week, days, completed, count:completed.length, goal:4, claimed:!!data.weeklyCards?.[week] };
}
export function claimWeek(data, week) {
  const s=weeklyState(data,week);
  if(s.count<s.goal || s.claimed) return false;
  data.weeklyCards[week]={claimed:Date.now(),city:Math.abs(Math.round(new Date(week+'T12:00:00').getTime()/604800000))%20};
  data.coins+=150;
  return true;
}
export const cardKey=(city,variant)=>`${city}:${variant}`;
export function cityProgress(data, city, per=50) {
  let count=0;
  for(let i=city*per;i<(city+1)*per;i++) if(data.levels[i]?.stars>0) count++;
  const next=CARD_STEPS.findIndex((n,v)=>count<n && !data.postcards?.[cardKey(city,v)]);
  return {count,next,goal:next<0?per:CARD_STEPS[next],from:next<=0?0:CARD_STEPS[next-1]};
}
export function unlockCards(data,city) {
  const {count}=cityProgress(data,city), added=[];
  CARD_STEPS.forEach((n,v)=>{const key=cardKey(city,v);if(count>=n&&!data.postcards[key]){data.postcards[key]=true;added.push(v);}});
  return added;
}
