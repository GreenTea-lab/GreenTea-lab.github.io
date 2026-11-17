// Обёртка над VK Bridge для VK Игр. Тот же интерфейс, что у sdk.js (Яндекс), подставляется при сборке dist-vk.
// Что отличается от Яндекса:
// - покупки за голоса требуют своего сервера для уведомлений об оплате, поэтому в VK-версии магазина нет;
// - показываем личный рекорд из сохранения, без отдельного сервиса рейтинга;
// - сохранения — VKWebAppStorageSet: значение до 4096 символов, поэтому режем на куски.
import bridge from '@vkontakte/vk-bridge';
import { createRecordStory } from './story.js';

const SAVE_KEY = 'ns_save';
const CHUNK = 2000; // с запасом под лимит VK на длину значения
const SAVE_EVERY = 20000; // не чаще раза в 20 с (лимит VK — 1000 запросов в час)
const INTERSTITIAL_GAP = 90000; // межэкранная реклама не чаще раза в 90 с

class SDK {
  constructor() {
    this.real = false;
    this.lang = 'ru';
    this.adActive = false;
    this.listeners = { pause: [], resume: [] };
    this.gameplayOn = false;
    this.lastInterstitial = Date.now(); // сразу после запуска межэкранную рекламу не показываем
    this.payments = null;
    this.catalog = [];
    this.noAds = false;
    this.player = null;
    this._written = {};
    this.storySupported = false;
  }

  async init() {
    // язык из параметров запуска VK (основной язык игры — русский)
    try {
      const q = new URLSearchParams(location.search);
      this.lang = q.get('vk_language') === 'en' ? 'en' : 'ru';
      this.real = q.has('vk_app_id') || q.has('sign');
      this.appId = q.get('vk_app_id') || '';
      // игра открыта в Одноклассниках: там нет «Добавить в избранное»
      this.ok = q.get('vk_client') === 'ok';
      this.platform = q.get('vk_platform') || '';
    } catch (e) {}
    try {
      await Promise.race([bridge.send('VKWebAppInit'), new Promise((r) => setTimeout(r, 3000))]);
    } catch (e) {
      console.warn('[VK] init', e);
    }
    // Проверяем возможности клиента заранее, чтобы открыть редактор прямо по нажатию.
    if (this.real && !this.ok) {
      let timeout;
      try {
        this.storySupported = await Promise.race([
          bridge.supportsAsync('VKWebAppShowStoryBox'),
          new Promise((resolve) => { timeout = setTimeout(() => resolve(false), 2000); }),
        ]);
      } catch (e) {
        this.storySupported = false;
      } finally {
        clearTimeout(timeout);
      }
    }
    // свернули/развернули игру — пауза музыки и игры
    document.addEventListener('visibilitychange', () => document.hidden && this._flushPending());
    bridge.subscribe((e) => {
      const t = e && e.detail && e.detail.type;
      if (t === 'VKWebAppViewHide') {
        this._flushPending();
        this._emit('pause');
      }
      if (t === 'VKWebAppViewRestore') this._emit('resume');
      // безопасные зоны в приложении VK (вырез экрана, панели): игра не заходит под них
      const ins = e.detail.data && (e.detail.data.insets || (t === 'VKWebAppUpdateInsets' && e.detail.data));
      if (ins && typeof ins.top === 'number') this._insets(ins);
    });
    if (this.real) {
      this._check('reward');
      this._check('interstitial');
      // предзагрузка по таймеру, как советует документация
      setInterval(() => {
        if (!this.adActive) {
          this._check('reward');
          this._check('interstitial');
        }
      }, 30000);
    }
  }

  _insets(ins) {
    const st = document.documentElement.style;
    for (const [k, v] of [['--sat', ins.top], ['--sab', ins.bottom], ['--sal', ins.left], ['--sar', ins.right]]) {
      const side = { '--sat': 'top', '--sab': 'bottom', '--sal': 'left', '--sar': 'right' }[k];
      st.setProperty(k, 'max(env(safe-area-inset-' + side + ', 0px), ' + Math.max(0, v || 0) + 'px)');
    }
    window.dispatchEvent(new Event('resize'));
  }

  // при сворачивании и закрытии сразу отправляем отложенное сохранение
  _flushPending() {
    if (this._pending) this.saveData(this._pending, true);
  }

  _check(format) {
    bridge.send('VKWebAppCheckNativeAds', { ad_format: format }).catch(() => {});
  }

  on(ev, fn) {
    this.listeners[ev].push(fn);
  }
  _emit(ev) {
    this.listeners[ev].forEach((f) => f());
  }

  ready() {}

  // ---------- Соцфункции VK и вибрация ----------
  canSocial() {
    return this.real;
  }
  canFavorite() {
    return this.real && !this.ok;
  }
  // Истории доступны только в клиентах VK, которые поддерживают редактор.
  canShare() {
    return this.real && !this.ok && this.storySupported;
  }
  // вибрация: в VK — в приложениях для Android и iOS, в Одноклассниках — только на iOS
  canVibrate() {
    if (!this.real) return false;
    return this.ok ? /iphone|ipad/.test(this.platform) : /^mobile_(android|iphone|ipad)/.test(this.platform);
  }
  async invite() {
    try {
      await bridge.send('VKWebAppShowInviteBox', {});
      return true;
    } catch (e) {
      console.warn('[VK] invite', e);
      return false;
    }
  }
  async share(record) {
    if (!this.canShare()) return false;
    try {
      const options = { background_type: 'image', blob: createRecordStory(record), locked: true };
      if (/^\d+$/.test(this.appId)) {
        options.attachment = { type: 'url', text: 'play', url: 'https://vk.com/app' + this.appId };
      }
      const response = await bridge.send('VKWebAppShowStoryBox', options);
      return response?.result === true;
    } catch (e) {
      console.warn('[VK] story', e);
      return false;
    }
  }
  async addFavorite() {
    try {
      await bridge.send('VKWebAppAddToFavorites', {});
      return true;
    } catch (e) {
      console.warn('[VK] favorites', e);
      return false;
    }
  }
  haptic(kind = 'light') {
    if (!this.real) return;
    bridge.send('VKWebAppTapticImpactOccurred', { style: kind }).catch(() => {});
  }

  gameplay(active) {
    if (this.adActive) this._gpTouched = true;
    this.gameplayOn = active;
  }

  // ---------- Сохранения ----------
  // Сохранение режется на куски и пишется попеременно в два набора ключей (g0/g1).
  // Заголовок ns_save_n = "набор:число кусков" пишется последним, поэтому если игру закрыли
  // посреди записи, заголовок всё ещё указывает на прежний целый набор. Старый формат
  // (ns_save_0.., заголовок без двоеточия) по-прежнему читается.
  _key(gen, i) {
    return gen < 0 ? SAVE_KEY + '_' + i : SAVE_KEY + '_g' + gen + '_' + i;
  }

  async loadData() {
    if (!this.real) return null;
    try {
      const head = await bridge.send('VKWebAppStorageGet', { keys: [SAVE_KEY + '_n'] });
      const hv = String((head.keys && head.keys[0] && head.keys[0].value) || '');
      const [gen, n] = hv.includes(':') ? hv.split(':').map(Number) : [-1, +hv || 0];
      if (!n) return null;
      const keys = Array.from({ length: n }, (_, i) => this._key(gen, i));
      const res = await bridge.send('VKWebAppStorageGet', { keys });
      const map = Object.fromEntries((res.keys || []).map((k) => [k.key, k.value]));
      const json = keys.map((k) => map[k] || '').join('');
      keys.forEach((k) => (this._written[k] = map[k]));
      this._written[SAVE_KEY + '_n'] = hv;
      this._gen = gen;
      this._lastJson = json;
      return JSON.parse(json);
    } catch (e) {
      console.warn('[VK] load', e);
      return null;
    }
  }

  saveData(save, flush = false) {
    if (!this.real) return Promise.resolve();
    this._pending = save;
    const wait = SAVE_EVERY - (Date.now() - (this._lastSet || 0));
    if (!flush && wait > 0) {
      if (!this._saveTimer)
        this._saveTimer = setTimeout(() => {
          this._saveTimer = null;
          if (this._pending) this.saveData(this._pending);
        }, wait);
      return Promise.resolve();
    }
    this._pending = null;
    this._lastSet = Date.now();
    const json = JSON.stringify(save);
    // записи идут строго по очереди: таймер и сворачивание игры не перемешают куски двух сохранений
    this._q = (this._q || Promise.resolve()).then(() => this._write(json));
    return this._q;
  }

  async _write(json) {
    if (json === this._lastJson) return;
    try {
      const gen = this._gen === 0 ? 1 : 0;
      const parts = [];
      for (let i = 0; i < json.length; i += CHUNK) parts.push(json.slice(i, i + CHUNK));
      for (let i = 0; i < parts.length; i++) {
        const key = this._key(gen, i);
        if (this._written[key] === parts[i]) continue;
        await bridge.send('VKWebAppStorageSet', { key, value: parts[i] });
        this._written[key] = parts[i];
      }
      const head = gen + ':' + parts.length;
      await bridge.send('VKWebAppStorageSet', { key: SAVE_KEY + '_n', value: head });
      this._written[SAVE_KEY + '_n'] = head;
      this._gen = gen;
      this._lastJson = json;
    } catch (e) {
      console.warn('[VK] save', e);
    }
  }

  // ---------- Реклама ----------
  _adPause() {
    const was = this.gameplayOn;
    this._gpTouched = false;
    if (was) this.gameplay(false);
    this.adActive = true;
    return () => {
      if (was && !this._gpTouched && !this.gameplayOn) this.gameplay(true);
    };
  }

  // межэкранная реклама: только при переходе между экранами, не сразу после запуска и не чаще раза в 90 с
  showInterstitial(onDone) {
    if (!this.real || this.noAds || this.adActive || Date.now() - this.lastInterstitial < INTERSTITIAL_GAP) {
      onDone && onDone();
      return;
    }
    const resume = this._adPause();
    const finish = () => {
      this.adActive = false;
      resume();
      onDone && onDone();
    };
    bridge
      .send('VKWebAppShowNativeAds', { ad_format: 'interstitial' })
      .then((d) => {
        if (d && d.result) this.lastInterstitial = Date.now();
      })
      .catch((e) => console.warn('[VK] interstitial error', e))
      .finally(finish);
  }

  // реклама за награду — только по кнопке игрока, награда только если VK подтвердил показ
  showRewarded(onReward, onDone) {
    // второй запрос, пока первый ролик ещё идёт, не отправляем
    if (this.adActive) {
      onDone && onDone(false);
      return;
    }
    let rewarded = false;
    let closed = false;
    const resume = this._adPause();
    const finish = () => {
      // площадка может прислать и ошибку, и закрытие — награду выдаём один раз
      if (closed) return;
      closed = true;
      this.adActive = false;
      resume();
      if (rewarded) onReward && onReward();
      onDone && onDone(rewarded);
    };
    if (!this.real) {
      fakeAd(() => {
        rewarded = true;
        finish();
      });
      return;
    }
    // если ролика пока нет, VK загружает его по запросу; одна повторная попытка через 1,5 с
    const show = (retry) =>
      bridge
        .send('VKWebAppShowNativeAds', { ad_format: 'reward' })
        .then((d) => {
          rewarded = !!(d && d.result);
          if (!rewarded) console.warn('[VK] reward ad: result', d);
        })
        .catch((e) => {
          console.warn('[VK] reward ad error', e);
          if (retry) return new Promise((r) => setTimeout(r, 1500)).then(() => show(false));
        });
    show(true).finally(finish);
  }

  // ---------- Покупки (в VK-версии нет: нужен сервер для уведомлений об оплате) ----------
  async initPayments() {
    return false;
  }
  product() {
    return null;
  }
  currencyImage() {
    return '';
  }
  purchase() {
    return Promise.reject(new Error('no payments'));
  }
  async getPurchases() {
    return [];
  }
  async consume() {
    return false;
  }

  // ---------- Личный рекорд хранится вместе с прогрессом игрока ----------
  personalRecordsOnly() {
    return true;
  }
  isAuthorized() {
    return this.real;
  }
  async submitScore() {
    return false;
  }
  async getLeaderboard() {
    return { available: false, local: true, entries: [] };
  }
  async login() {
    return false;
  }
}

function fakeAd(done) {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;inset:0;z-index:99;background:rgba(5,2,20,.92);color:#31f6ff;display:flex;align-items:center;justify-content:center;flex-direction:column;font:20px "Russo One",sans-serif;gap:12px';
  el.innerHTML = '<div>Тестовая реклама</div><div style="font-size:14px;color:#9aa7c7">(в VK Играх здесь будет настоящая)</div>';
  document.body.appendChild(el);
  setTimeout(() => {
    el.remove();
    done();
  }, 1200);
}

export const sdk = new SDK();
