import {save} from './save.js';import {dayKey} from './calendar.js';
import {STARTS,LENS} from './levels.js';
import {recordMove,recordWin} from './activity.js';
export function weekKey(date=new Date()) {const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());d.setDate(d.getDate()-(d.getDay()+6)%7);return dayKey(d);}
export function missions(){
 const d=save.data;if(d.missions?.day!==dayKey())d.missions={day:dayKey(),lines:0,items:0,wins:0,claimed:[]};return d.missions;
}
export const MISSION_DEFS=[{id:'lines',target:8,reward:40},{id:'items',target:10,reward:60},{id:'wins',target:2,reward:80}];
export function trackMove(ev){const m=missions();m.lines+=ev.n;m.items+=ev.items.length;recordMove(ev);}
export function trackWin(){missions().wins++;recordWin();}
export function claimMission(id){const m=missions(),def=MISSION_DEFS.find(x=>x.id===id);if(!def||m[id]<def.target||m.claimed.includes(id))return false;m.claimed.push(id);save.data.coins+=def.reward;save.write();return true;}
export function weekly(){const d=save.data,key=weekKey();if(d.weekly?.key!==key)d.weekly={key,stage:d.trophies.some(t=>t.key===key)?5:0,run:null};return d.weekly;}
export function weeklyLevel(){const w=weekly();let n=0;for(const c of w.key)n=(n*31+c.charCodeAt(0))>>>0;const chapter=8+(n%12+w.stage)%12;return {key:w.key,stage:w.stage,index:STARTS[chapter]+(n>>>8)%LENS[chapter]};}
