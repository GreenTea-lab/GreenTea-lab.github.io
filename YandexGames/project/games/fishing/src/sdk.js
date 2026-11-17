// Обёртка над SDK Яндекс Игр. Если SDK недоступен (локально) — работает заглушка.
const LB_NAME = 'score';

class SDK {
  constructor() {
    this.ysdk = null;
    this.player = null;
    this.real = false;
    this.lang = (navigator.language || 'ru').slice(0, 2);
    this.adActive = false;
    this.listeners = { pause: [], resume: [] };
    this.gameplayOn = false;
    this.lastInterstitial = 0;
    this.payments = null;
    this.catalog = [];
    this.noAds = false; // куплено «Без рекламы» — полноэкранная реклама не показывается
  }

  async init() {
    // ждём загрузку /sdk.js не дольше 3 секунд
    const start = Date.now();
    while (typeof window.YaGames === 'undefined' && Date.now() - start < 3000) {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (typeof window.YaGames === 'undefined') {
      console.log('[SDK] Яндекс SDK не найден — локальный режим');
      return;
    }
    try {
      this.ysdk = await window.YaGames.init();
      this.real = true;
      try {
        this.lang = this.ysdk.environment.i18n.lang || this.lang;
      } catch (e) {}
      this.ysdk.on && this.ysdk.on('game_api_pause', () => this._emit('pause'));
      this.ysdk.on && this.ysdk.on('game_api_resume', () => this._emit('resume'));
      try {
        this.player = await this.ysdk.getPlayer({ scopes: false });
      } catch (e) {
        console.warn('[SDK] getPlayer', e);
      }
    } catch (e) {
      console.warn('[SDK] init error', e);
      this.ysdk = null;
      this.real = false;
    }
  }

  on(ev, fn) {
    this.listeners[ev].push(fn);
  }
  _emit(ev) {
    this.listeners[ev].forEach((f) => f());
  }

  ready() {
    try {
      this.ysdk && this.ysdk.features.LoadingAPI && this.ysdk.features.LoadingAPI.ready();
    } catch (e) {}
  }

  gameplay(active) {
    if (this.adActive) this._gpTouched = true;
    if (active === this.gameplayOn) return;
    this.gameplayOn = active;
    try {
      const api = this.ysdk && this.ysdk.features.GameplayAPI;
      if (api) active ? api.start() : api.stop();
    } catch (e) {}
  }

  // ---------- Сохранения ----------
  async loadData() {
    if (this.player) {
      try {
        const d = await this.player.getData();
        return d && d.save ? d.save : null;
      } catch (e) {
        console.warn('[SDK] getData', e);
      }
    }
    return null;
  }

  // flush = true — отправить сразу (после покупок, до consumePurchase)
  // обычные сохранения не чаще раза в 4 с (лимит платформы — 100 вызовов за 5 минут)
  async saveData(save, flush = false) {
    if (!this.player) return;
    this._pending = save;
    const wait = 4000 - (Date.now() - (this._lastSet || 0));
    if (!flush && wait > 0) {
      if (!this._saveTimer) this._saveTimer = setTimeout(() => {
        this._saveTimer = null;
        if (this._pending) this.saveData(this._pending);
      }, wait);
      return;
    }
    this._pending = null;
    this._lastSet = Date.now();
    try {
      await this.player.setData({ save }, flush);
    } catch (e) {
      console.warn('[SDK] setData', e);
    }
  }

  // ---------- Реклама ----------
  // на время рекламы разметка геймплея останавливается (GameplayAPI.stop) и восстанавливается после,
  // если игра сама не поменяла её за это время
  _adPause() {
    const was = this.gameplayOn;
    this._gpTouched = false;
    if (was) this.gameplay(false);
    this.adActive = true;
    return () => {
      if (was && !this._gpTouched && !this.gameplayOn) this.gameplay(true);
    };
  }

  showInterstitial(onDone) {
    if (!this.ysdk || this.noAds) {
      // локально или после покупки «Без рекламы» полноэкранной рекламы нет
      onDone && onDone();
      return;
    }
    const resume = this._adPause();
    const finish = () => {
      this.adActive = false;
      resume();
      onDone && onDone();
    };
    try {
      this.ysdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => {},
          onClose: () => finish(),
          onError: () => finish(),
          onOffline: () => finish(),
        },
      });
    } catch (e) {
      finish();
    }
  }

  // onReward вызывается, если игрок досмотрел; onDone — всегда в конце
  showRewarded(onReward, onDone) {
    let rewarded = false;
    const resume = this._adPause();
    const finish = () => {
      this.adActive = false;
      resume();
      if (rewarded) onReward && onReward();
      onDone && onDone(rewarded);
    };
    if (!this.ysdk) {
      // заглушка: имитация рекламы
      fakeAd(() => {
        rewarded = true;
        finish();
      });
      return;
    }
    try {
      this.ysdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => {},
          onRewarded: () => {
            rewarded = true;
          },
          onClose: () => finish(),
          onError: () => finish(),
        },
      });
    } catch (e) {
      finish();
    }
  }

  // ---------- Внутриигровые покупки ----------
  async initPayments() {
    if (!this.ysdk) return false;
    try {
      this.payments = this.ysdk.getPayments ? await this.ysdk.getPayments({ signed: false }) : this.ysdk.payments;
    } catch (e) {
      console.warn('[SDK] getPayments', e);
      this.payments = null;
    }
    if (!this.payments) return false;
    try {
      this.catalog = (await this.payments.getCatalog()) || [];
    } catch (e) {
      console.warn('[SDK] getCatalog', e);
      this.catalog = [];
    }
    return this.catalog.length > 0;
  }

  product(id) {
    return this.catalog.find((p) => p.id === id) || null;
  }

  // иконка портальной валюты берётся из SDK (требование 1.13.2)
  currencyImage(p, size = 'svg') {
    try {
      return p && p.getPriceCurrencyImage ? p.getPriceCurrencyImage(size) : '';
    } catch (e) {
      return '';
    }
  }

  // бросает исключение, если игрок закрыл окно оплаты
  purchase(id) {
    return this.payments.purchase({ id });
  }

  async getPurchases() {
    if (!this.payments) return [];
    try {
      return (await this.payments.getPurchases()) || [];
    } catch (e) {
      console.warn('[SDK] getPurchases', e);
      return [];
    }
  }

  async consume(token) {
    try {
      await this.payments.consumePurchase(token);
      return true;
    } catch (e) {
      console.warn('[SDK] consumePurchase', e);
      return false;
    }
  }

  // ---------- Лидерборд ----------
  isAuthorized() {
    try {
      return !!(this.player && this.player.isAuthorized && this.player.isAuthorized());
    } catch (e) {
      return false;
    }
  }

  async submitScore(score) {
    if (!this.ysdk) return;
    try {
      if (!this.isAuthorized()) return;
      if (this.ysdk.leaderboards && this.ysdk.leaderboards.setScore) {
        await this.ysdk.leaderboards.setScore(LB_NAME, Math.floor(score));
      } else {
        const lb = await this.ysdk.getLeaderboards();
        await lb.setLeaderboardScore(LB_NAME, Math.floor(score));
      }
    } catch (e) {
      console.warn('[SDK] setScore', e);
    }
  }

  async getLeaderboard() {
    if (!this.ysdk) return { available: false, local: true, entries: [] };
    try {
      const opts = { quantityTop: 10, includeUser: this.isAuthorized(), quantityAround: 1 };
      let res;
      if (this.ysdk.leaderboards && this.ysdk.leaderboards.getEntries) {
        res = await this.ysdk.leaderboards.getEntries(LB_NAME, opts);
      } else {
        const lb = await this.ysdk.getLeaderboards();
        res = await lb.getLeaderboardEntries(LB_NAME, opts);
      }
      const entries = (res.entries || []).map((e) => ({
        rank: e.rank,
        score: e.score,
        name: (e.player && e.player.publicName) || '',
        me: res.userRank && e.rank === res.userRank,
      }));
      return { available: true, entries, authorized: this.isAuthorized() };
    } catch (e) {
      console.warn('[SDK] getEntries', e);
      return { available: false, entries: [] };
    }
  }

  async login() {
    if (!this.ysdk) return false;
    try {
      await this.ysdk.auth.openAuthDialog();
      this.player = await this.ysdk.getPlayer({ scopes: false });
      return this.isAuthorized();
    } catch (e) {
      return false;
    }
  }
}

// Имитация рекламного ролика для локального запуска
function fakeAd(done) {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;inset:0;z-index:99;background:rgba(20,28,48,.94);color:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;font:700 24px "PT Sans",Arial,sans-serif;gap:12px;text-align:center;padding:20px';
  const ru = document.documentElement.lang !== 'en';
  el.innerHTML = ru ? '<div>Тестовая реклама</div><div style="font-size:16px;opacity:.75">(в Яндекс Играх здесь будет настоящая)</div>' : '<div>Test ad</div><div style="font-size:16px;opacity:.75">(a real ad will play on Yandex Games)</div>';
  document.body.appendChild(el);
  setTimeout(() => {
    el.remove();
    done();
  }, 1200);
}

export const sdk = new SDK();
