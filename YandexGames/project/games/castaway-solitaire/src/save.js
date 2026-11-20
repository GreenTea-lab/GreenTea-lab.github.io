// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';
import { PROJECTS, START_COINS } from './data.js';
import { restoreDecor } from './decor.js';

const KEY = 'castaway_solitaire_v1';

const DEFAULT = () => ({
  v: 2,
  expansion:0,
  journal:{chapters:[]},
  harvestWins:0,
  ts: 0,
  coins: START_COINS,
  starsSpent: 0,
  levels: {}, // n → { stars, best }
  level: 1, // следующий уровень
  stages: Object.fromEntries(PROJECTS.map((p) => [p.id, 0])),
  settings: { musicVol: 0.7, sfxVol: 0.8, quality: 'auto', hints: true },
  noAds: false,
  daily: { day: '', streak: 0 },
  freeAdAt: 0,
  seen: {}, // показанные объяснения механик
  plays: 0,
  wins: 0,
  decor: [],
  trimmedGrass: [],
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
    const def = DEFAULT();
    const d = Object.assign(DEFAULT(), pick || {});
    d.v=2;
    d.settings = Object.assign(def.settings, d.settings || {});
    d.stages = Object.assign(def.stages, d.stages || {});
    d.decor = restoreDecor(d.decor);
    d.trimmedGrass = Array.isArray(d.trimmedGrass) ? [...new Set(d.trimmedGrass.filter(key=>typeof key==='string'&&/^-?\d{1,2},-?\d{1,2}$/.test(key)))].slice(0,7000) : [];
    d.levels = d.levels && typeof d.levels === 'object' ? d.levels : {};
    d.daily = Object.assign(def.daily, d.daily || {});
    d.seen = d.seen || {};
    const count=(value,fallback=0)=>Number.isFinite(value)?Math.max(0,Math.floor(value)):fallback;
    d.coins=count(d.coins,START_COINS);
    d.expansion=Math.min(5,count(d.expansion));d.harvestWins=count(d.harvestWins);
    d.level=count(d.level,1)||1;d.plays=count(d.plays);d.wins=count(d.wins);
    for(const p of PROJECTS)d.stages[p.id]=Math.min(3,count(d.stages[p.id]));
    d.levels=Object.fromEntries(Object.entries(d.levels).filter(([n,l])=>/^\d+$/.test(n)&&+n>0&&l&&typeof l==='object').map(([n,l])=>[n,{stars:Math.min(3,count(l.stars)),best:count(l.best)}]));
    d.starsSpent=Math.min(count(d.starsSpent),Object.values(d.levels).reduce((s,l)=>s+l.stars,0));
    if(typeof d.seen!=='object'||Array.isArray(d.seen))d.seen={};
    this.data = d;
  },

  write(cloud = true) {
    this.data.ts = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {}
    if (cloud) sdk.saveData(this.data);
  },

  async flush() {
    this.data.ts = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {}
    await sdk.saveData(this.data, true);
  },

  resetPreview() {
    if(location.protocol!=='file:')return;
    const {settings,noAds}=this.data;
    this.data={...DEFAULT(),settings,noAds};
    this.write(false);
    location.reload();
  },

  starsEarned() {
    return Object.values(this.data.levels).reduce((a, l) => a + (l.stars || 0), 0);
  },
  stars() {
    return this.starsEarned() - this.data.starsSpent;
  },
  total() {
    return Object.values(this.data.levels).reduce((a, l) => a + (l.best || 0), 0);
  },
  built() {
    return Object.values(this.data.stages).reduce((a, b) => a + b, 0);
  },
};
