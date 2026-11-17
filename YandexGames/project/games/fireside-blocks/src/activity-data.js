// Компактная запись дня: ходы, линии, предметы, победы, партии классики,
// рекорд завершённой классики, победа в задаче этого дня (0/1).
export const ACTIVITY_FIELDS=['moves','lines','items','wins','classicGames','classicBest','dailyWins'];
export const emptyDay=()=>[0,0,0,0,0,0,0];
export function isDayKey(key){
 if(typeof key!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(key))return false;
 const d=new Date(key+'T12:00:00');return Number.isFinite(+d)&&d.getFullYear()===+key.slice(0,4)&&d.getMonth()+1===+key.slice(5,7)&&d.getDate()===+key.slice(8);
}
export function normalizeActivity(raw,lastWin,today){
 const days={};
 for(const [key,row]of Object.entries(raw?.days&&typeof raw.days==='object'&&!Array.isArray(raw.days)?raw.days:{})){
  if(!isDayKey(key)||!Array.isArray(row))continue;
  days[key]=ACTIVITY_FIELDS.map((_,i)=>i===6?row[i]===1?1:0:Number.isSafeInteger(row[i])&&row[i]>=0?row[i]:0);
 }
 // Старое сохранение достоверно знает только последнюю дату победы.
 if(isDayKey(lastWin)){days[lastWin]||=emptyDay();days[lastWin][6]=1;}
 return {since:isDayKey(raw?.since)?raw.since:today,days};
}
export function aggregateActivity(activity,prefix){
 const result=emptyDay();
 for(const [date,row]of Object.entries(activity.days))if(date.startsWith(prefix))for(let i=0;i<result.length;i++)result[i]=i===5?Math.max(result[i],row[i]):result[i]+row[i];
 return Object.fromEntries(ACTIVITY_FIELDS.map((key,i)=>[key,result[i]]));
}
