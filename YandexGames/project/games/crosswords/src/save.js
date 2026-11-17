// Сохранения: localStorage + облако Яндекса (берётся более свежая версия)
import { sdk } from './sdk.js';
import LEGACY_RU from './data/legacy-ru.json';
import LEGACY_EN from './data/legacy-en.json';

const KEY = 'crosswords_save_v1';

const PROG = () => ({ stars: {}, cur: 0, ip: null, ad: { stars: {}, cur: 0, ip: null } });

const DEFAULT = () => ({
  v: 2,
  ts: 0,
  coins: 100,
  score: 0,
  solvedWords: 0,
  noAds: false,
  tutDone: false,
  settings: { musicVol: 0.45, sfxVol: 0.8, text: 0, theme: 'light', autoCheck: false, scenes: true, backdrop:'reading', motion:true },
  archive: {},
  notebook: {ru:[],en:[]},
  weekly: {key:'',solved:0,clean:0,words:0,claimed:[]},
  p: { ru: PROG(), en: PROG() },
  daily: { date: '', lang: '', puz: null, ip: null, done: false, streak: 0, last: '' },
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
    const D = DEFAULT();
    this.data = Object.assign(D, pick || {});
    this.data.settings = Object.assign(DEFAULT().settings, this.data.settings || {});
    this.data.p = Object.assign({ ru: PROG(), en: PROG() }, this.data.p || {});
    for (const k of ['ru', 'en']) {
      this.data.p[k] = Object.assign(PROG(), this.data.p[k] || {});
      this.data.p[k].ad = Object.assign({ stars: {}, cur: 0, ip: null }, this.data.p[k].ad || {});
    }
    this.data.daily = Object.assign(DEFAULT().daily, this.data.daily || {});
    this.data.archive = this.data.archive && typeof this.data.archive==='object' ? this.data.archive : {};
    this.data.notebook = Object.assign({ru:[],en:[]},this.data.notebook||{});
    this.data.weekly = Object.assign(DEFAULT().weekly,this.data.weekly||{});
    if(this.data.v<2){
      for(const [lang,legacy]of [['ru',LEGACY_RU],['en',LEGACY_EN]]){
        for(const [track,levels]of [[this.data.p[lang],legacy.levels],[this.data.p[lang].ad,legacy.adult]]){
          const ip=track.ip;if(ip&&!ip.puz&&levels[ip.lvl])ip.puz=levels[ip.lvl];
        }
      }
      this.data.v=2;
    }
    const d=this.data.daily;
    if(d.date&&d.lang&&d.puz&&!this.data.archive[d.lang+':'+d.date])this.data.archive[d.lang+':'+d.date]=d;
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
};
