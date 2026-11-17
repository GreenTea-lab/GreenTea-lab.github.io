// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';
import {COUNT} from './levels.js';
import {STYLE_ORDER} from './gfx.js';
import {BOARDS,EFFECTS} from './materials.js';
import {normalizeActivity} from './activity-data.js';
import {dayKey} from './calendar.js';

const KEY = 'fireside_blocks_save_v1';
const record=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
const count=(x,fallback=0)=>Number.isSafeInteger(x)&&x>=0?x:fallback;
const list=x=>Array.isArray(x)?x:[];
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)?x:'';
const own=(items,allowed,base)=>[...new Set([base,...list(items).filter(id=>Object.prototype.hasOwnProperty.call(allowed,id))])];

const DEFAULT = () => ({
  v: 1,
  ts: 0,
  coins: 150,
  best: 0,
  games: 0,
  levels: {}, // idx → { stars }
  boosts: { hint: 2, undo: 2, hammer: 1, shuffle: 1 },
  style: 'painted',
  styles: ['painted'],
  settings: { musicVol: 0.6, sfxVol: 0.9 },
  noAds: false,
  daily: { day: '', streak: 0 },
  classic: null, // незаконченная классическая партия
  adventure: null,
  challenge: { claimed: '', completed: 0, run: null },
  cosmetics:{board:'walnut',boards:['walnut'],effect:'sparks',effects:['sparks'],claimed:[]},
  trophies:[],
  tut: {},
  freeAt: 0,
  seenDecor: 3,
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
    const d = Object.assign(DEFAULT(), record(pick));
    const def = DEFAULT();
    const previousSettings=record(d.settings);
    d.settings = Object.assign({},def.settings, previousSettings);
    for(const [key,legacy]of [['musicVol','music'],['sfxVol','sfx']])if(typeof previousSettings[key]!=='number'&&typeof previousSettings[legacy]==='boolean')d.settings[key]=previousSettings[legacy]?def.settings[key]:0;
    for(const key of ['musicVol','sfxVol'])if(key in d.settings&&(!Number.isFinite(d.settings[key])||d.settings[key]<0||d.settings[key]>1))delete d.settings[key];
    d.boosts = Object.fromEntries(Object.entries(def.boosts).map(([id,n])=>[id,count(record(d.boosts)[id],n)]));
    for(const key of ['coins','best','games'])d[key]=count(d[key],def[key]);
    d.levels=Object.fromEntries(Object.entries(record(d.levels)).filter(([i,l])=>Number.isInteger(+i)&&+i>=0&&+i<COUNT&&Number.isInteger(l?.stars)&&l.stars>=1&&l.stars<=3).map(([i,l])=>[+i,{stars:l.stars}]));
    d.styles = list(d.styles).filter(id=>STYLE_ORDER.includes(id));
    if (!d.styles.includes('painted')) d.styles.unshift('painted');
    if (!d.styles.includes(d.style)) d.style = 'painted';
    d.daily = {day:date(d.daily?.day),streak:Math.min(7,count(d.daily?.streak))};
    if(d.daily.day&&!d.daily.streak)d.daily={day:'',streak:0};
    d.tut = record(d.tut);
    d.challenge = Object.assign({},def.challenge, record(d.challenge));
    d.challenge.claimed=date(d.challenge.claimed);
    d.cosmetics=Object.assign({},def.cosmetics,record(d.cosmetics));
    for(const key of ['boards','effects','claimed'])if(!Array.isArray(d.cosmetics[key]))d.cosmetics[key]=def.cosmetics[key];
    d.cosmetics.boards=own(d.cosmetics.boards,BOARDS,'walnut');d.cosmetics.effects=own(d.cosmetics.effects,EFFECTS,'sparks');
    d.cosmetics.claimed=d.cosmetics.claimed.filter(x=>typeof x==='string'&&/^\d+:[012]$/.test(x));
    if(!d.cosmetics.boards.includes(d.cosmetics.board))d.cosmetics.board='walnut';
    if(!d.cosmetics.effects.includes(d.cosmetics.effect))d.cosmetics.effect='sparks';
    d.trophies=list(d.trophies).filter(x=>x&&date(x.key)&&typeof x.scene==='string');
    if(d.missions){const m=record(d.missions);d.missions={day:date(m.day),lines:count(m.lines),items:count(m.items),wins:count(m.wins),claimed:list(m.claimed).filter(id=>['lines','items','wins'].includes(id))};}
    if(d.weekly){const w=record(d.weekly);d.weekly={key:date(w.key),stage:Math.min(5,count(w.stage)),run:w.run||null};}
    if (!Number.isSafeInteger(d.challenge.completed) || d.challenge.completed < 0) d.challenge.completed = 0;
    d.activity=normalizeActivity(d.activity,d.challenge.claimed,dayKey());
    if (d.adventure && (!Number.isInteger(d.adventure.idx) || d.adventure.idx < 0 || d.adventure.idx >= COUNT || !d.adventure.game)) d.adventure = null;
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
