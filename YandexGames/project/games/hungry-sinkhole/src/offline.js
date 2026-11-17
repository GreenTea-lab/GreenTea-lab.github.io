// Personal collections and calendar events, stored in this player's profile.
import {MAPS} from './city.js';
import {SKINS} from './data.js';
import {today} from './daily.js';
export const INGREDIENTS=['leaf','wood','metal','sweet'];
export const RECIPES=Array.from({length:12},(_,i)=>({id:'decor'+i,style:i%4,shape:Math.floor(i/4),cost:{[INGREDIENTS[i%4]]:8+Math.floor(i/4)*4,[INGREDIENTS[(i+1)%4]]:4+Math.floor(i/4)*2}}));
export const FESTIVAL_SKINS=['festivalBloom','festivalSun','festivalMoon','festivalFrost'];
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const num=(v,max=1e6)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
export const offlineDefault=()=>({pantry:Object.fromEntries(INGREDIENTS.map(k=>[k,0])),crafted:[],placements:Array(6).fill(null),daily:{},season:null});
export function normalizeOffline(raw){
 const d=offlineDefault();if(!plain(raw))return d;
 for(const k of INGREDIENTS)d.pantry[k]=num(raw.pantry?.[k],9999);
 d.crafted=[...new Set((Array.isArray(raw.crafted)?raw.crafted:[]).filter(id=>RECIPES.some(r=>r.id===id)))];
 d.placements=Array.from({length:6},(_,i)=>d.crafted.includes(raw.placements?.[i])?raw.placements[i]:null);
 if(plain(raw.daily))for(const day of Object.keys(raw.daily).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k)).sort().slice(-14)){const v=raw.daily[day];if(plain(v))d.daily[day]={best:num(v.best),eaten:num(v.eaten),done:v.done===true};}
 const s=raw.season;
 if(plain(s)&&/^\d{4}-\d{2}-\d{2}$/.test(s.id))d.season={id:s.id,points:num(s.points,360),claimed:[...new Set((Array.isArray(s.claimed)?s.claimed:[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=12))],goals:Object.fromEntries(['eaten','trees','cars','rounds'].map(k=>[k,num(s.goals?.[k])])),paid:[...new Set((Array.isArray(s.paid)?s.paid:[]).filter(k=>['eaten','trees','cars','rounds'].includes(k)))]};
 return d;
}
export function challengeFor(day=today()){
 let seed=2166136261;for(const c of day)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
 return {day,seed:seed||1,map:MAPS[seed%MAPS.length].id,time:120,target:75};
}
export function festivalInfo(day=today()){
 const date=new Date(day+'T12:00:00Z'),weekday=(date.getUTCDay()+6)%7;date.setUTCDate(date.getUTCDate()-weekday);
 const id=date.toISOString().slice(0,10),week=Math.floor(date.getTime()/604800000);date.setUTCDate(date.getUTCDate()+7);
 return {id,style:((week%4)+4)%4,ends:date.toISOString().slice(0,10),skin:FESTIVAL_SKINS[((week%4)+4)%4]};
}
export const FESTIVAL_GOALS=[{id:'eaten',need:1200,points:40},{id:'trees',need:60,points:30},{id:'cars',need:30,points:30},{id:'rounds',need:6,points:40}];
export function ensureOffline(d,day=today()){
 if(!d.offline)d.offline=offlineDefault();const info=festivalInfo(day);
 if(d.offline.season?.id!==info.id)d.offline.season={id:info.id,points:0,claimed:[],goals:{eaten:0,trees:0,cars:0,rounds:0},paid:[]};
 for(const [i,m]of MAPS.entries())if(d.mastery[m.id]||[1,2,3].some(n=>d.expeditions[i*3+n]>0)){d.mastery[m.id]=true;const s=SKINS.find(s=>s.mastery===m.id);if(s&&!d.skins.includes(s.id))d.skins.push(s.id);}
 return d.offline;
}
export function mapStickers(d,map){const i=MAPS.findIndex(m=>m.id===map),stars=[1,2,3].reduce((s,n)=>s+(d.expeditions[i*3+n]||0),0);return {stars,owned:[stars>=1,stars>=5,stars>=9]};}
export function ingredientFor(it){
 const look=it.sourceLook||it.look||'';
 if(/tree|pine|palm|sakura|bamboo/i.test(look))return 'leaf';
 if(it.kind==='car'||/metal|bin|lamp|bike|robot|scooter/i.test(look))return 'metal';
 if(/candy|cake|macaron|cupcake|donut|lollipop|icecream/i.test(look))return 'sweet';
 if(/crate|pallet|bench|barrel|table|wood/i.test(look))return 'wood';
 return null;
}
export function craft(d,id){const o=ensureOffline(d),r=RECIPES.find(x=>x.id===id);if(!r||o.crafted.includes(id)||Object.entries(r.cost).some(([k,n])=>o.pantry[k]<n))return false;
 for(const [k,n]of Object.entries(r.cost))o.pantry[k]-=n;o.crafted.push(id);const i=o.placements.indexOf(null);if(i>=0)o.placements[i]=id;
 for(const [n,skin]of [[4,'artisanLeaf'],[8,'artisanCopper'],[12,'artisanCandy']])if(o.crafted.length>=n&&!d.skins.includes(skin))d.skins.push(skin);
 return true;
}
export function placeDecoration(d,slot,id){const o=ensureOffline(d);if(!Number.isInteger(slot)||slot<0||slot>=6||(id!==null&&!o.crafted.includes(id)))return false;o.placements[slot]=id;return true;}
export function claimFestival(d,tier,day=today()){
 const o=ensureOffline(d,day),s=o.season;if(!Number.isInteger(tier)||tier<1||tier>12||s.points<tier*30||s.claimed.includes(tier))return false;
 s.claimed.push(tier);if(tier===12){const skin=festivalInfo(day).skin;if(!d.skins.includes(skin))d.skins.push(skin);}else d.coins+=5;
 return true;
}
export function awardOfflineRun(d,{mode,elapsed,stats,loot={},challenge=null,pts=0},day=today()){
 const o=ensureOffline(d,day);if(mode==='duel'||elapsed<10)return {points:0,loot:{},dailyReward:false};
 const earned={};for(const k of INGREDIENTS){earned[k]=Math.min(30,num(loot[k]));o.pantry[k]=Math.min(9999,o.pantry[k]+earned[k]);}
 const s=o.season,before=s.points;s.points+=Math.min(40,Math.floor(num(stats.eaten)/5));
 for(const g of FESTIVAL_GOALS){s.goals[g.id]=Math.min(g.need,s.goals[g.id]+(g.id==='rounds'?(stats.continuation?0:1):num(stats[g.id])));if(s.goals[g.id]>=g.need&&!s.paid.includes(g.id)){s.paid.push(g.id);s.points+=g.points;}}
 s.points=Math.min(360,s.points);let dailyReward=false;
 if(challenge){const prev=o.daily[challenge.day]||{best:0,eaten:0,done:false},won=stats.eaten>=challenge.target;
  dailyReward=won&&!prev.done;o.daily[challenge.day]={best:Math.max(prev.best,pts),eaten:Math.max(prev.eaten,num(stats.eaten)),done:prev.done||won};if(dailyReward)d.coins+=15;
  const days=Object.keys(o.daily).sort();for(const old of days.slice(0,-14))delete o.daily[old];
 }
 return {points:s.points-before,loot:earned,dailyReward};
}
