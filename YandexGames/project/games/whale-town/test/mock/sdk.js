// Мок SDK Яндекс Игр для проверки интеграции
window.__calls = [];
(function () {
  const log = (n, a) => window.__calls.push(n + (a !== undefined ? ' ' + JSON.stringify(a) : ''));
  let data = {};
  const handlers = {};
  const player = {
    isAuthorized: () => true,
    getData: async () => { log('getData'); return data; },
    setData: async (d) => { log('setData'); data = d; },
    getName: () => 'Тест',
  };
  const ysdk = {
    environment: { i18n: { lang: 'tr' } },
    features: {
      LoadingAPI: { ready: () => log('ready') },
      GameplayAPI: { start: () => log('gp.start'), stop: () => log('gp.stop') },
    },
    on: (e, f) => { handlers[e] = f; log('on', e); },
    getPlayer: async (o) => { log('getPlayer'); return player; },
    adv: {
      showFullscreenAdv: ({ callbacks }) => { log('fullscreen'); callbacks.onOpen && callbacks.onOpen(); setTimeout(() => callbacks.onClose(true), 300); },
      showRewardedVideo: ({ callbacks }) => { log('rewarded'); handlers.game_api_pause && handlers.game_api_pause(); callbacks.onOpen(); setTimeout(() => { callbacks.onRewarded(); callbacks.onClose(); handlers.game_api_resume && handlers.game_api_resume(); }, 300); },
    },
    leaderboards: {
      setScore: async (n, s) => log('setScore', [n, s]),
      getEntries: async (n, o) => { log('getEntries', n); return { userRank: 2, entries: [ { rank: 1, score: 99999, player: { publicName: 'Анна' } }, { rank: 2, score: 5000, player: { publicName: 'Тест' } }, { rank: 3, score: 4000, player: { publicName: '' } } ] }; },
    },
    auth: { openAuthDialog: async () => log('auth') },
    isAvailableMethod: async () => true,
  };
  window.YaGames = { init: async () => { log('init'); return ysdk; } };
})();

// ---- платежи (мок): каталог из window.__MOCK_CATALOG, неконсумированные покупки живут в localStorage ----
(function () {
  const log = (n, a) => window.__calls.push(n + (a !== undefined ? ' ' + JSON.stringify(a) : ''));
  const KEY = '__mock_purchases';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
  const store = (l) => localStorage.setItem(KEY, JSON.stringify(l));
  const coin = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#ffcc00" stroke="#c89400" stroke-width="2"/><text x="10" y="14" font-size="11" text-anchor="middle" font-family="Arial" font-weight="bold" fill="#7a5a00">Я</text></svg>');
  let n = 0;
  const payments = {
    getCatalog: async () => { log('getCatalog'); return (window.__MOCK_CATALOG || []).map((c) => ({ id: c.id, title: c.title, description: c.description || '', imageURI: '', price: c.price + ' YAN', priceValue: String(c.price), priceCurrencyCode: 'YAN', getPriceCurrencyImage: () => coin })); },
    purchase: async ({ id }) => {
      log('purchase', id);
      await new Promise((r) => setTimeout(r, 200));
      if (window.__MOCK_CANCEL) throw new Error('rejected');
      const p = { productID: id, purchaseToken: 'tok_' + Date.now() + '_' + (n++), developerPayload: '' };
      const l = load(); l.push(p); store(l);
      return p;
    },
    getPurchases: async () => { log('getPurchases'); return load(); },
    consumePurchase: async (t) => { log('consume', t.split('_')[0]); store(load().filter((p) => p.purchaseToken !== t)); },
  };
  const orig = window.YaGames.init;
  window.YaGames.init = async () => { const y = await orig(); y.getPayments = async () => { log('getPayments'); return payments; }; return y; };
})();
