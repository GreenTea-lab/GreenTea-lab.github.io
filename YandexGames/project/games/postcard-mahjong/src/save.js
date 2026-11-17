// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';
import { MATS, FRAMES, EFFECTS, FACE_SETS, SKIN_PRICE } from './cosmetics.js';
import { unlockCards } from './collection.js';
import {normalizeTravel,validTrip,validLayout,validDifficulty} from './travel.js';

const KEY = 'postcard_mahjong_save_v1';

const DEFAULT = () => ({
  v: 2,
  ts: 0,
  coins: 200,
  best: 0,
  games: 0,
  levels: {}, // idx → { stars, time }
  boosts: { hint: 3, undo: 3, shuffle: 2 },
  style: 'ivory',
  styles: ['ivory'],
  settings: { musicVol: 0.6, sfxVol: 0.9, dimBlocked: true, showTimer: true, matchGlow: false },
  faces: 'fruit', // рисунки на плитках: фрукты и цветы или классика
  dc: {}, // задачи дня: 'ГГГГ-ММ-ДД' → время решения, хранятся последние два месяца
  dcCup: {}, // кубки месяца: 'ГГГГ-ММ' → 1 бронза, 2 серебро, 3 золото (уже выданные)
  ach: {}, // полученные награды за достижения
  stats: { pairs: 0, daily: 0, combo: 0, boards: 0, noHelp: 0 },
  noAds: false,
  daily: { day: '', streak: 0 },
  endless: null, // незаконченный бесконечный забег
  tut: {},
  freeAt: 0,
  campaignVersion: 2,
  postcards: {},
  weeklyCards: {},
  dailyWins: {},
  sessions: {level:null,daily:null,trip:null,practice:null},
  lastMode: 'level',
  decor: {mat:'felt',frame:'paper',effect:'sparkles'},
  owned: {mat:['felt'],frame:['paper'],effect:['sparkles'],faces:['fruit','classic']},
});

export const save = {
  data: DEFAULT(),

  async load() {
    let local = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) local = JSON.parse(raw);
    } catch (e) {}
    let cloud = null;
    try {
      cloud = await sdk.loadData();
    } catch (e) {}
    let pick = local;
    if (cloud && (!local || (cloud.ts || 0) >= (local.ts || 0))) pick = cloud;
    const d = Object.assign(DEFAULT(), pick || {});
    const def = DEFAULT();
    d.settings = Object.assign({...def.settings}, d.settings || {});
    d.boosts = Object.assign({...def.boosts}, d.boosts || {});
    d.levels = d.levels && typeof d.levels === 'object' ? d.levels : {};
    d.levels=Object.fromEntries(Object.entries(d.levels).filter(([i,l])=>/^\d+$/.test(i)&&+i<1000&&l&&Number.isFinite(l.stars)&&l.stars>=1).map(([i,l])=>[i,{stars:Math.min(3,Math.floor(l.stars)),time:Number.isFinite(l.time)?Math.max(0,l.time):0}]));
    for(const key of ['coins','best','games'])d[key]=Number.isFinite(d[key])?Math.max(0,Math.floor(d[key])):def[key];
    for(const key of ['hint','undo','shuffle'])d.boosts[key]=Number.isFinite(d.boosts[key])?Math.max(0,Math.floor(d.boosts[key])):def.boosts[key];
    for(const key of ['musicVol','sfxVol'])d.settings[key]=Number.isFinite(d.settings[key])?Math.max(0,Math.min(1,d.settings[key])):def.settings[key];
    d.styles = Array.isArray(d.styles) ? d.styles.filter(id=>id in SKIN_PRICE) : def.styles;
    if (!d.styles.includes('ivory')) d.styles.unshift('ivory');
    if (!d.styles.includes(d.style)) d.style = 'ivory';
    d.daily = d.daily || { day: '', streak: 0 };
    d.tut = d.tut || {};
    d.stats = Object.assign({...def.stats}, d.stats || {});
    for (const k of ['dc', 'dcCup', 'ach']) d[k] = d[k] && typeof d[k] === 'object' ? d[k] : {};
    d.sessions = {level:null,daily:null,trip:null,practice:null,...(d.sessions || {})};
    if(!['level','daily','trip','practice'].includes(d.lastMode))d.lastMode='level';
    for(const mode of ['level','daily']){
      const s=d.sessions[mode];
      if(!s||typeof s!=='object'||!s.game||(mode==='level'?(!Number.isInteger(s.id)||s.id<0||s.id>=1000):!/^\d{4}-\d{2}-\d{2}$/.test(s.id)))d.sessions[mode]=null;
    }
    const trip=d.sessions.trip,practice=d.sessions.practice;
    if(!trip?.game||!validTrip(trip.spec?.trip)||!Number.isInteger(trip.spec?.step)||trip.spec.step<0||trip.spec.step>6)d.sessions.trip=null;
    if(!practice?.game||!validLayout(practice.spec?.lay)||!validDifficulty(practice.spec?.difficulty)||!Number.isFinite(practice.spec?.seed))d.sessions.practice=null;
    normalizeTravel(d);
    d.decor = {mat:'felt',frame:'paper',effect:'sparkles',...(d.decor||{})};
    d.owned = {mat:['felt'],frame:['paper'],effect:['sparkles'],faces:['fruit','classic'],...(d.owned||{})};
    for(const [kind,catalog] of Object.entries({mat:MATS,frame:FRAMES,effect:EFFECTS,faces:FACE_SETS})) {
      const first=Object.keys(catalog)[0];
      d.owned[kind]=Array.isArray(d.owned[kind])?d.owned[kind].filter(id=>catalog[id]):[first];
      if(!d.owned[kind].includes(first))d.owned[kind].unshift(first);
      if(kind!=='faces'&&!d.owned[kind].includes(d.decor[kind]))d.decor[kind]=first;
    }
    for(const k of ['postcards','weeklyCards','dailyWins'])d[k]=d[k]&&typeof d[k]==='object'?d[k]:{};
    d.dc=Object.fromEntries(Object.entries(d.dc).filter(([k,v])=>/^\d{4}-\d{2}-\d{2}$/.test(k)&&Number.isFinite(v)&&v>=0));
    d.weeklyCards=Object.fromEntries(Object.entries(d.weeklyCards).filter(([k,v])=>/^\d{4}-\d{2}-\d{2}$/.test(k)&&v&&Number.isInteger(v.city)&&v.city>=0&&v.city<20));
    d.postcards=Object.fromEntries(Object.entries(d.postcards).filter(([k,v])=>/^(?:[0-9]|1[0-9]):[0-3]$/.test(k)&&v));
    for(const key of Object.keys(d.stats))if(!Number.isFinite(d.stats[key]))d.stats[key]=0;
    d.daily={day:typeof d.daily.day==='string'?d.daily.day:'',streak:Number.isFinite(d.daily.streak)?Math.max(0,Math.min(7,Math.floor(d.daily.streak))):0};
    for(const key of Object.keys(d.dc))d.dailyWins[key]=true;
    if(pick && pick.campaignVersion !== 2){
      // Индексы пройденных уровней и звёзды сохраняем; уже полученные старые открытки тоже.
      for(let r=0;r<10;r++)for(let c=0;c<10;c++)if(d.levels[r*100+c*10+9])d.postcards[`${c}:${Math.min(3,r)}`]=true;
    }
    for(let c=0;c<20;c++)unlockCards(d,c);
    d.campaignVersion=2;d.v=2;
    if(!FACE_SETS[d.faces]||!d.owned.faces.includes(d.faces))d.faces='fruit';
    this.data = d;
  },

  write(cloud = true) {
    this.data.ts = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {}
    if (cloud) sdk.saveData(this.data);
  },

  // немедленная запись в облако (после покупки, до consumePurchase)
  async flush() {
    this.data.ts = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {}
    await sdk.saveData(this.data, true);
  },

  stars() {
    return Object.values(this.data.levels).reduce((a, l) => a + (l.stars || 0), 0);
  },
  // открыт ли уровень: первый всегда, дальше — если пройден предыдущий
  open(i) {
    return i === 0 || !!(this.data.levels[i - 1] && this.data.levels[i - 1].stars > 0);
  },
  // первый непройденный уровень
  current(count) {
    for (let i = 0; i < count; i++) if (!this.data.levels[i]) return i;
    return count - 1;
  },
};
