import {UPGRADES,SKINS,XP_LEVEL} from './data.js';
import {MAPS} from './city.js';
import {normalizeDaily} from './daily.js';
import {offlineDefault,normalizeOffline,ensureOffline} from './offline.js';

export const DEFAULT = () => ({
  v: 1,
  ts: 0,
  coins: 0,
  level: 1,
  xp: 0,
  skins: ['classic'],
  skin: 'classic',
  adSkins: {},
  up: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
  best: 0,
  solo: {}, // карта → { pct, pts, stars }
  map: 'town',
  mode: 'battle',
  settings: { musicVol: 0.7, sfxVol: 0.9, quality: 'auto' },
  noAds: false,
  freeAdAt: 0,
  rounds: 0,
  wins: 0,
  tutDone: false,
  daily: null, // задания дня: { day, q: [...] }
  gift: { last: '', streak: 0 },
  zenBest: 0,
  expeditions: {},
  records: {},
  mastery: {},
  offline: offlineDefault(),
});

const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const number=(value,fallback=0,max=1e12,min=0)=>typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
const integer=(value,fallback=0,max=1e12,min=0)=>Math.floor(number(value,fallback,max,min));
export const saveTimestamp=value=>plain(value)?integer(value.ts,0,Number.MAX_SAFE_INTEGER):0;
export const isSaveSnapshot=value=>plain(value)&&['coins','level','skins','up','records','expeditions'].some(k=>Object.prototype.hasOwnProperty.call(value,k))&&(!Object.prototype.hasOwnProperty.call(value,'coins')||Number.isFinite(value.coins))&&(!Object.prototype.hasOwnProperty.call(value,'level')||Number.isFinite(value.level));

// Storage failures must not turn XP loops, upgrades, lists or gifts into NaN/crashes.
export function sanitizeSave(raw){
  const d=DEFAULT();if(!plain(raw))return d;
  for(const key of Object.keys(d))if(Object.prototype.hasOwnProperty.call(raw,key))d[key]=raw[key];
  d.v=1;d.ts=saveTimestamp(raw);
  d.level=integer(d.level,1,10000,1);d.xp=integer(d.xp,0,XP_LEVEL(d.level)-1);
  for(const key of ['coins','best','zenBest','freeAdAt'])d[key]=integer(d[key]);
  for(const key of ['rounds','wins'])d[key]=integer(d[key],0,1e9);
  d.tutDone=raw.tutDone===undefined?d.rounds>0:raw.tutDone===true;d.noAds=raw.noAds===true;
  const knownSkin=id=>SKINS.some(s=>s.id===id);
  d.skins=[...new Set(['classic',...(Array.isArray(d.skins)?d.skins.filter(knownSkin):[])])];
  if(!d.skins.includes(d.skin))d.skin='classic';
  const settings=plain(d.settings)?d.settings:{};
  d.settings={musicVol:number(settings.musicVol,settings.music===false?0:.7,1),sfxVol:number(settings.sfxVol,settings.sfx===false?0:.9,1),quality:['auto','high','low'].includes(settings.quality)?settings.quality:'auto'};
  const up=plain(d.up)?d.up:{};d.up=Object.fromEntries(UPGRADES.map(u=>[u.id,integer(up[u.id],0,u.max)]));
  const mapIds=new Set(MAPS.map(m=>m.id)),modes=new Set(['battle','royale','solo','zen','rain','duel']);
  if(!mapIds.has(d.map))d.map='town';if(!modes.has(d.mode))d.mode='battle';
  const solo=plain(d.solo)?d.solo:{};d.solo={};
  for(const [id,v]of Object.entries(solo))if(mapIds.has(id)&&plain(v))d.solo[id]={pct:number(v.pct,0,100),pts:integer(v.pts),stars:integer(v.stars,0,3)};
  const expeditions=plain(d.expeditions)?d.expeditions:{};d.expeditions={};
  for(const [id,v]of Object.entries(expeditions))if(/^\d+$/.test(id)&&+id>=1&&+id<=MAPS.length*3)d.expeditions[id]=integer(v,0,3);
  const records=plain(d.records)?d.records:{};d.records={};
  for(const v of Object.values(records))if(plain(v)&&mapIds.has(v.map)&&(modes.has(v.mode)||v.mode==='expedition'||v.mode==='daily'))d.records[v.mode+':'+v.map]={map:v.map,mode:v.mode,pts:integer(v.pts)};
  const mastery=plain(d.mastery)?d.mastery:{};d.mastery=Object.fromEntries(Object.entries(mastery).filter(([id,v])=>mapIds.has(id)&&v===true));
  const ads=plain(d.adSkins)?d.adSkins:{};d.adSkins=Object.fromEntries(Object.entries(ads).filter(([id])=>knownSkin(id)).map(([id,n])=>[id,integer(n,0,100)]));
  const gift=plain(d.gift)?d.gift:{};d.gift={last:typeof gift.last==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(gift.last)?gift.last:'',streak:integer(gift.streak,0,7)};
  d.daily=normalizeDaily(d.daily);
  d.offline=normalizeOffline(d.offline);ensureOffline(d);
  return d;
}

