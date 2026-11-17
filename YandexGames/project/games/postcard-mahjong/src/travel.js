// Travel progression is independent of rendering and platform SDKs.
import {dateKey,weekOf} from './collection.js';
import {LAYOUTS,positions} from './layouts.js';
import {CITIES,level,pickTypes,parTimes} from './levels.js';
import {rng} from './core.js';

export const QUESTS=[
  {id:'boards',goal:2,coins:20,ru:'Завершите 2 расклада',en:'Finish 2 boards'},
  {id:'pairs',goal:18,coins:25,ru:'Найдите 18 пар',en:'Match 18 pairs'},
  {id:'letters',goal:3,coins:30,ru:'Соберите 3 конверта',en:'Collect 3 envelopes'},
];
export const TRIPS=[
  {id:'paris-evening',city:2,ru:'Вечерний Париж',en:'An evening in Paris',intro:['Зажглись фонари на набережной. Помоги доставить семь писем, пока город готовится ко сну.','The riverside lamps are glowing. Deliver seven letters as the city settles down for the night.']},
  {id:'kyoto-garden',city:8,ru:'Сад тихих писем',en:'The garden of quiet letters',intro:['В саду Киото потерялись письма о весне. Найди конверты среди лепестков и открой запечатанные плитки.','Letters about spring have gone missing in a Kyoto garden. Find envelopes among the petals and reveal the sealed tiles.']},
  {id:'venice-lanterns',city:4,ru:'Фонари Венеции',en:'The lanterns of Venice',intro:['У каждого моста — свой адрес. Пройди семь остановок вдоль каналов и собери вечернюю открытку.','Every bridge has its own address. Follow seven stops along the canals to collect an evening postcard.']},
  {id:'moscow-lilac',city:0,ru:'Сиреневая почта',en:'The lilac post',intro:['В старом московском дворике нашлась сумка с письмами. Давай разнесём их и найдём самый уютный вид на город.','A bag of letters has turned up in an old Moscow courtyard. Deliver them and find the cosiest view of the city.']},
];
export const TRIP_STEPS=['clear','mail','seals','clear','mail','seals','clear'];
export const DIFFICULTIES={easy:{ru:'Легко',en:'Easy',pairCopies:1,hidden:0,locks:0},normal:{ru:'Обычно',en:'Normal',pairCopies:2,hidden:0,locks:0},hard:{ru:'Сложно',en:'Hard',pairCopies:3,hidden:.28,locks:3}};
export const validLayout=id=>typeof id==='string'&&Object.prototype.hasOwnProperty.call(LAYOUTS,id);
export const validDifficulty=id=>typeof id==='string'&&Object.prototype.hasOwnProperty.call(DIFFICULTIES,id);
export const validTrip=id=>TRIPS.some(t=>t.id===id);
export const tripById=id=>TRIPS.find(t=>t.id===id);
export function weekNumber(key=dateKey()){
  // UTC calendar arithmetic: no daylight-saving changes in weekly selection.
  const w=weekOf(key);return Math.floor((Date.parse(w+'T12:00:00Z')-Date.parse('2026-11-09T12:00:00Z'))/604800000);
}
export const activeTrip=(key=dateKey())=>TRIPS[((weekNumber(key)%TRIPS.length)+TRIPS.length)%TRIPS.length];
export function availableTrips(key=dateKey()){
  const n=Math.max(0,weekNumber(key));return TRIPS.filter((_,i)=>n>=TRIPS.length||i<=n);
}
export function tripBoard(id,step){
  const trip=tripById(id);if(!trip||!Number.isInteger(step)||step<0||step>=7)throw new Error('Unknown trip board');
  const layouts=['rows3','pillow','pyramid','heart','flower','bridge','star'];
  const seed=72001+TRIPS.indexOf(trip)*19001+step*733,R=rng(seed),pos=positions(layouts[step]);
  return {trip:id,step,city:trip.city,lay:layouts[step],pos,seed,pairs:pos.length/2,types:pickTypes(6+step,20,R),coins:0,locks:0,hidden:TRIP_STEPS[step]==='seals'?.75:0,par:parTimes(pos.length/2,8,0,0),kind:TRIP_STEPS[step]};
}
export function practiceBoard(lay,difficulty,seed){
  if(!validLayout(lay)||!validDifficulty(difficulty))throw new Error('Unknown practice board');
  const d=DIFFICULTIES[difficulty],pos=positions(lay),R=rng(seed);
  const pairs=pos.length/2,types=Math.min(32,Math.ceil((pairs-(d.locks?1:0))/d.pairCopies));
  return {lay,difficulty,seed,city:Math.abs(seed)%CITIES.length,pos,pairs,types:pickTypes(types,32,R),pairCopies:d.pairCopies,coins:0,locks:d.locks,hidden:d.hidden,par:parTimes(pairs,types,d.hidden,d.locks)};
}
export function knownLayouts(data){
  const seen=new Set(['mini','rows3','heart','pillow','flower',...(data.library?.seen||[])]);
  const last=Object.keys(data.levels||{}).reduce((n,i)=>Math.max(n,+i+1),0);
  for(let i=0;i<=Math.min(999,last);i++)seen.add(level(i).lay);
  return [...seen].filter(validLayout);
}

const dict=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
const integer=n=>Number.isFinite(n)?Math.max(0,Math.floor(n)):0;
export function normalizeTravel(data){
  data.settings.pace=['calm','challenge'].includes(data.settings.pace)?data.settings.pace:'challenge';
  data.settings.zoom=Number.isFinite(data.settings.zoom)?Math.max(1,Math.min(2.5,data.settings.zoom)):1;
  data.bestCalm=integer(data.bestCalm);
  const p=dict(data.postOffice);
  data.postOffice={day:typeof p.day==='string'?p.day:'',counts:{},claimed:{},tokens:Array.isArray(p.tokens)?p.tokens.filter(x=>typeof x==='string').slice(-300):[],stamps:{}};
  for(const q of QUESTS){data.postOffice.counts[q.id]=Math.min(q.goal,integer(p.counts?.[q.id]));data.postOffice.claimed[q.id]=p.claimed?.[q.id]===true;}
  for(const [day,v]of Object.entries(dict(p.stamps)))if(/^\d{4}-\d{2}-\d{2}$/.test(day)&&v)data.postOffice.stamps[day]=true;
  const lib=dict(data.library);data.library={favorites:[...new Set(Array.isArray(lib.favorites)?lib.favorites:[])].filter(validLayout),seen:[...new Set(Array.isArray(lib.seen)?lib.seen:[])].filter(validLayout),records:{}};
  for(const [key,r]of Object.entries(dict(lib.records))){const [lay,diff]=key.split(':');if(validLayout(lay)&&validDifficulty(diff)&&r&&typeof r==='object')data.library.records[key]={wins:integer(r.wins),calmWins:integer(r.calmWins),best:Number.isFinite(r.best)&&r.best>=0?r.best:null};}
  const trips=dict(data.tripProgress);data.tripProgress={};
  for(const [id,r]of Object.entries(trips)){if(!validTrip(id)||!r||typeof r!=='object')continue;data.tripProgress[id]={wins:[...new Set(Array.isArray(r.wins)?r.wins:[])].filter(n=>Number.isInteger(n)&&n>=0&&n<7),claimed:r.claimed===true};}
  data.letters=Object.fromEntries(Object.entries(dict(data.letters)).filter(([id,v])=>CITIES.some(c=>c.id===id)&&v===true));
  data.travelStats={wins:integer(data.travelStats?.wins),letters:integer(data.travelStats?.letters)};
}
export function postalState(data,key=dateKey()){
  if(data.postOffice.day!==key){data.postOffice.day=key;data.postOffice.counts={boards:0,pairs:0,letters:0};data.postOffice.claimed={};data.postOffice.tokens=[];}
  return data.postOffice;
}
export function postalProgress(data,type,amount,token,key=dateKey()){
  const p=postalState(data,key),q=QUESTS.find(q=>q.id===type);if(!q||p.counts[type]>=q.goal)return false;
  const mark=type+':'+token;if(p.tokens.includes(mark))return false;
  p.tokens.push(mark);p.tokens=p.tokens.slice(-300);p.counts[type]=Math.min(q.goal,(p.counts[type]||0)+amount);return true;
}
export function claimPostal(data,id,key=dateKey()){
  const p=postalState(data,key),q=QUESTS.find(q=>q.id===id);
  if(!q||p.claimed[id]||p.counts[id]<q.goal)return false;
  p.claimed[id]=true;data.coins+=q.coins;
  if(QUESTS.every(q=>p.claimed[q.id])&&!p.stamps[key]){p.stamps[key]=true;data.coins+=50;}
  return true;
}
export function mailTiles(game){
  const candidates=game.tiles.filter(t=>t.f!=='key').map(t=>t.id),R=rng((game.opts?.seed||1)+7387);
  for(let i=candidates.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
  return candidates.slice(0,Math.min(4,candidates.length));
}
export function tripGoal(game,B,marked,sealed=[]){
  if(B.kind==='mail')return {kind:'mail',goal:Math.min(3,marked.length),value:marked.filter(i=>!game.alive[i]).length};
  if(B.kind==='seals'){
    const ids=sealed,goal=Math.min(6,ids.length);
    if(goal)return {kind:'seals',goal,value:ids.filter(i=>game.tiles[i].seen||!game.alive[i]).length};
  }
  return {kind:'clear',goal:game.tiles.length/2,value:(game.tiles.length-game.left)/2};
}
