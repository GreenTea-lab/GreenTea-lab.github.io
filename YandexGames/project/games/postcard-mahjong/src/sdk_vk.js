// VK и ОК через официальный VK Bridge. Рекорд — только в редактор историй по нажатию игрока.
import bridge from '@vkontakte/vk-bridge';
import {createRecordStory} from './record-story.js';

const SAVE_KEY = 'postcard_mahjong_v1';
const CHUNK = 2000;
const SAVE_EVERY = 20000;
const AD_GAP = 150000;

class SDK {
  constructor() {
    this.real = false;
    this.lang = 'ru';
    this.adActive = false;
    this.gameplayOn = false;
    this.noAds = false;
    this.lastInterstitial = Date.now();
    this.listeners = { pause: [], resume: [], adstart: [], adend: [], adschange: [], socialchange: [] };
    this.storySupported=false;this.storyBusy=false;
    this.ads = { reward: false, interstitial: false };
    this._adChecks = {};
    this.catalog = [];
    this._written = {};
    this._lastSet = 0;
  }

  async init() {
    if(location.protocol==='file:' || window.__PM_OFFLINE)return;
    const q = new URLSearchParams(location.search);
    this.real = q.has('vk_app_id');
    this.appId=q.get('vk_app_id')||'';
    this.ok = q.get('vk_client') === 'ok';
    // По таблице совместимости ОК NativeAds доступны только в Android-клиенте.
    this.adsSupported = this.real && (!this.ok || q.get('vk_platform') === 'mobile_android');
    this.lang = q.get('vk_language') === 'en' ? 'en' : 'ru';
    if (!this.real) return;
    bridge.subscribe(({ detail }) => {
      if (detail.type === 'VKWebAppViewHide') {
        this._flushPending();
        this._emit('pause');
      }
      if (detail.type === 'VKWebAppViewRestore') this._emit('resume');
      const ins = detail.data?.insets || (detail.type === 'VKWebAppUpdateInsets' && detail.data);
      if (ins && typeof ins.top === 'number') this._insets(ins);
    });
    document.addEventListener('visibilitychange', () => document.hidden && this._flushPending());
    window.addEventListener('pagehide', () => this._flushPending());
    try { await this._send('VKWebAppInit'); }
    catch (e) { console.warn('[VK] init', e); }
    this.refreshAds();
    this.checkStories();
  }

  _send(method, params = {}) {
    let timer;
    return Promise.race([
      bridge.send(method, params),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(method + ' timeout')), 5000); }),
    ]).finally(() => clearTimeout(timer));
  }

  _insets(ins) {
    for (const side of ['top', 'bottom', 'left', 'right']) {
      document.documentElement.style.setProperty('--safe-' + side, `max(env(safe-area-inset-${side}, 0px), ${Math.max(0, Number(ins[side]) || 0)}px)`);
    }
    window.dispatchEvent(new Event('resize'));
  }

  on(ev, fn) { this.listeners[ev].push(fn); }
  _emit(ev) { this.listeners[ev].forEach(fn => fn()); }
  ready() {}
  gameplay(active) { this.gameplayOn = active && !this.adActive; }
  canReward() { return this.ads.reward; }
  onAdsChange(fn) { this.on('adschange', fn); }
  onSocialChange(fn){this.on('socialchange',fn);}
  canShareRecord(){return this.real&&!this.ok&&/^\d+$/.test(this.appId)&&this.storySupported;}
  async checkStories(){
    if(!this.real||this.ok||!/^\d+$/.test(this.appId))return;
    let timer;
    try{
      this.storySupported=await Promise.race([bridge.supportsAsync('VKWebAppShowStoryBox'),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),2500);})])===true;
    }catch(e){this.storySupported=false;console.warn('[VK] story support',e);}finally{clearTimeout(timer);this._emit('socialchange');}
  }
  async shareRecord(record){
    if(!this.canShareRecord()||this.storyBusy)return {status:'unavailable'};
    this.storyBusy=true;
    try{
      const options={background_type:'image',blob:createRecordStory(record),locked:true,attachment:{type:'url',text:'play',url:'https://vk.com/app'+this.appId}};
      // Only opens the editor. Publishing is chosen by the player inside VK.
      // Some web clients never answer on cancellation; the UI releases its button independently.
      const response=await this._send('VKWebAppShowStoryBox',options);
      return {status:response?.result===true?'complete':'cancelled'};
    }catch(e){return {status:e?.message==='VKWebAppShowStoryBox timeout'?'timeout':'cancelled',error:e?.error_data?.error_code};}
    finally{this.storyBusy=false;}
  }
  refreshAds() {
    if (!this.adsSupported || Date.now() - (this._lastAdCheck || 0) < 30000) return;
    this._lastAdCheck = Date.now();
    this._check('reward');
    this._check('interstitial');
  }
  _check(format) {
    if (!this.adsSupported) return Promise.resolve(false);
    if (this._adChecks[format]) return this._adChecks[format];
    return this._adChecks[format] = this._send('VKWebAppCheckNativeAds', { ad_format: format })
      .then(d => d?.result === true, () => false)
      .then(available => {
        this.ads[format] = available;
        this._emit('adschange');
        return available;
      }).finally(() => { delete this._adChecks[format]; });
  }
  async _showAd(format) {
    // Наличие ролика может измениться между открытием окна и нажатием.
    if (!await this._check(format)) return { result: false };
    // У показа нет короткого тайм-аута: игра не должна оживать под роликом.
    return bridge.send('VKWebAppShowNativeAds', { ad_format: format });
  }
  _flushPending() { if (this._pending) this.saveData(this._pending, true); }
  _key(gen, i) { return `${SAVE_KEY}_g${gen}_${i}`; }

  async loadData() {
    if (!this.real) return null;
    try {
      const head = await this._send('VKWebAppStorageGet', { keys: [SAVE_KEY + '_n'] });
      const [gen, n] = (head.keys?.[0]?.value || '').split(':').map(Number);
      if (![0, 1].includes(gen) || !Number.isInteger(n) || n < 1 || n > 100) return null;
      const keys = Array.from({ length: n }, (_, i) => this._key(gen, i));
      const res = await this._send('VKWebAppStorageGet', { keys });
      const map = Object.fromEntries((res.keys || []).map(k => [k.key, k.value]));
      const json = keys.map(k => map[k] || '').join('');
      const data = JSON.parse(json);
      this._gen = gen;
      this._lastJson = json;
      Object.assign(this._written, map);
      return data;
    } catch (e) {
      console.warn('[VK] load', e);
      return null;
    }
  }

  saveData(save, flush = false) {
    if (!this.real) return Promise.resolve();
    this._pending = save;
    this._latestJson = JSON.stringify(save);
    const wait = SAVE_EVERY - (Date.now() - this._lastSet);
    if (!flush && wait > 0) {
      if (!this._saveTimer) this._saveTimer = setTimeout(() => {
        this._saveTimer = null;
        this._flushPending();
      }, wait);
      return Promise.resolve();
    }
    clearTimeout(this._saveTimer);
    this._saveTimer = null;
    this._pending = null;
    this._lastSet = Date.now();
    const json = this._latestJson;
    this._q = (this._q || Promise.resolve()).then(() => this._write(json));
    return this._q;
  }

  async _write(json) {
    if (json === this._lastJson) return;
    try {
      // Два набора: указатель меняется только после полной записи новой версии.
      const gen = this._gen === 0 ? 1 : 0;
      const parts = [];
      for (let i = 0; i < json.length; i += CHUNK) parts.push(json.slice(i, i + CHUNK));
      for (let i = 0; i < parts.length; i++) {
        const key = this._key(gen, i);
        if (this._written[key] === parts[i]) continue;
        await this._send('VKWebAppStorageSet', { key, value: parts[i] });
        this._written[key] = parts[i];
      }
      await this._send('VKWebAppStorageSet', { key: SAVE_KEY + '_n', value: `${gen}:${parts.length}` });
      this._gen = gen;
      this._lastJson = json;
    } catch (e) {
      console.warn('[VK] save', e);
      // Сохраняем последнюю версию для повторной отправки при сворачивании/следующей записи.
      if (!this._pending && this._latestJson === json) this._pending = JSON.parse(json);
    }
  }

  _adStart() {
    this.adActive = true;
    this.gameplay(false);
    this._emit('adstart');
  }
  _adEnd() {
    this.adActive = false;
    this._emit('adend');
  }

  showInterstitial(onDone) {
    if (!this.ads.interstitial || this.noAds || this.adActive || Date.now() - this.lastInterstitial < AD_GAP) {
      onDone?.();
      return;
    }
    this.lastInterstitial = Date.now();
    this._adStart();
    this._showAd('interstitial')
      .catch(e => console.warn('[VK] interstitial', e))
      .finally(() => { this._adEnd(); onDone?.(); });
  }

  showRewarded(onReward, onDone) {
    if (!this.canReward() || this.adActive) { onDone?.(false); return; }
    this._adStart();
    // В локальной VK-сборке награды за несуществующую рекламу не выдаются.
    const show = this._showAd('reward');
    show.then(d => {
      const rewarded = d?.result === true;
      this._adEnd();
      if (rewarded) onReward?.();
      onDone?.(rewarded);
    }, e => {
      console.warn('[VK] reward', e);
      this._adEnd();
      onDone?.(false);
    });
  }

  // Денежные покупки не подключены. Рекорды хранятся только в личном сохранении.
  async initPayments() { return false; }
  product() { return null; }
  currencyImage() { return ''; }
  async purchase() { throw new Error('Payments unavailable'); }
  async getPurchases() { return []; }
  async consume() { return false; }
}

export const sdk = new SDK();
