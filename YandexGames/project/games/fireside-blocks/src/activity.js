import {save} from './save.js';
import {dayKey} from './calendar.js';
import {emptyDay,aggregateActivity} from './activity-data.js';
const row=(key=dayKey())=>save.data.activity.days[key]||=emptyDay();
export const recordMove=ev=>{const d=row();d[0]++;d[1]+=ev.n;d[2]+=ev.items.length;};
export const recordItems=n=>{row()[2]+=n;};
export const recordWin=()=>{row()[3]++;};
export const recordClassic=score=>{const d=row();d[4]++;d[5]=Math.max(d[5],score);};
export const hasDailyWin=key=>save.data.activity.days[key]?.[6]===1||save.data.challenge.claimed===key;
export function recordDailyWin(key){const fresh=!hasDailyWin(key);row(key)[6]=1;return fresh;}
export const personalStats=prefix=>aggregateActivity(save.data.activity,prefix);
