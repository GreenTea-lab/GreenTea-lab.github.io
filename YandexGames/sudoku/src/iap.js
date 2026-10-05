// Внутриигровые покупки Яндекс Игр: каталог, покупка, обработка необработанных платежей,
// постоянные покупки («Без рекламы») и окно магазина в DOM (общий код для всех игр).
import { sdk } from './sdk.js';

// defs: { [id]: { permanent?: true, grant(restoring), icon?: '<svg…>' } }
// persist: async () => { … setData(…, true) } — сохранить прогресс сразу, до consumePurchase
export const iap = {
  defs: {},
  order: [],
  owned: new Set(),
  ready: false,
  busy: false,
  persist: async () => {},
  listeners: [],

  async init(defs, persist) {
    this.defs = defs;
    this.order = Object.keys(defs);
    this.persist = persist;
    this.ready = await sdk.initPayments();
    if (!sdk.payments) return;
    // обязательная проверка необработанных платежей при запуске (требование 1.13.1)
    const list = await sdk.getPurchases();
    for (const p of list) await this._apply(p, true);
  },

  available() {
    return this.ready && this.items().length > 0;
  },

  // товары из каталога консоли в порядке, заданном игрой
  items() {
    if (!this.ready) return [];
    return this.order
      .map((id) => ({ id, def: this.defs[id], p: sdk.product(id), owned: this.owned.has(id) }))
      .filter((x) => x.p);
  },

  onChange(fn) {
    this.listeners.push(fn);
  },

  async buy(id) {
    if (this.busy || !sdk.payments) return false;
    if (this.defs[id] && this.defs[id].permanent && this.owned.has(id)) return false;
    this.busy = true;
    try {
      const p = await sdk.purchase(id);
      await this._apply(p, false);
      return true;
    } catch (e) {
      // игрок закрыл окно оплаты или платёж не прошёл
      console.warn('[IAP] purchase', e);
      return false;
    } finally {
      this.busy = false;
    }
  },

  async _apply(p, restoring) {
    const def = this.defs[p.productID];
    if (!def) return;
    if (def.permanent) {
      // постоянные покупки не консумируются: восстанавливаются через getPurchases()
      this.owned.add(p.productID);
      def.grant(restoring);
      // флаг пишется и в сохранение: если getPurchases() однажды не ответит, реклама всё равно не вернётся
      await this.persist();
    } else {
      def.grant(restoring);
      await this.persist();
      await sdk.consume(p.purchaseToken);
    }
    this.listeners.forEach((f) => f(p.productID, restoring));
  },
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// цена: число + иконка портальной валюты из SDK (требования 1.13.2 и 1.13.4)
export function priceHTML(p) {
  const img = sdk.currencyImage(p, 'svg');
  return `<span class="iap-price"><b>${esc(p.priceValue)}</b>${img ? `<img src="${esc(img)}" alt="${esc(p.priceCurrencyCode)}">` : `<i>${esc(p.priceCurrencyCode)}</i>`}</span>`;
}

// карточка товара: иконка из консоли или своя, название и описание из каталога
export function itemHTML(x, txt) {
  const icon = x.p.imageURI ? `<img src="${esc(x.p.imageURI)}" alt="">` : x.def.icon || '';
  const btn = x.owned ? `<button class="iap-buy owned" disabled>${esc(txt.owned)}</button>` : `<button class="iap-buy" data-id="${esc(x.id)}">${priceHTML(x.p)}</button>`;
  return `<div class="iap-item"><div class="iap-ic">${icon}</div><div class="iap-tx"><b>${esc(x.p.title)}</b><small>${esc(x.p.description)}</small></div>${btn}</div>`;
}

// окно магазина поверх canvas (для игр на Phaser)
// theme: { bg, panel, border, ink, muted, accent, accentInk, font }
export function openStore({ title, txt, theme, onClose, onBought }) {
  closeStore();
  injectCss(theme);
  const root = document.createElement('div');
  root.id = 'iap-store';
  const render = () => {
    const items = iap.items();
    root.innerHTML = `<div class="iap-panel"><div class="iap-head"><b>${esc(title)}</b><button class="iap-x" aria-label="close">✕</button></div><div class="iap-list">${
      items.length ? items.map((x) => itemHTML(x, txt)).join('') : `<div class="iap-empty">${esc(txt.empty)}</div>`
    }</div></div>`;
    root.querySelector('.iap-x').onclick = () => {
      closeStore();
      onClose && onClose();
    };
    root.querySelectorAll('.iap-buy[data-id]').forEach((b) => {
      b.onclick = async () => {
        root.querySelectorAll('.iap-buy').forEach((e) => (e.disabled = true));
        const ok = await iap.buy(b.dataset.id);
        if (ok && onBought) onBought(b.dataset.id);
        if (document.getElementById('iap-store')) render();
      };
    });
  };
  root.addEventListener('pointerdown', (e) => e.stopPropagation());
  root.addEventListener('click', (e) => {
    if (e.target === root) {
      closeStore();
      onClose && onClose();
    }
  });
  document.body.appendChild(root);
  render();
}

export function closeStore() {
  const e = document.getElementById('iap-store');
  if (e) e.remove();
}

function injectCss(T) {
  let st = document.getElementById('iap-css');
  if (!st) {
    st = document.createElement('style');
    st.id = 'iap-css';
    document.head.appendChild(st);
  }
  st.textContent = `
#iap-store{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);font-family:${T.font};-webkit-user-select:none;user-select:none;touch-action:none}
#iap-store .iap-panel{width:min(520px,94vw);max-height:90vh;display:flex;flex-direction:column;background:${T.panel};border:3px solid ${T.border};border-radius:18px;box-shadow:0 10px 40px rgba(0,0,0,.5);color:${T.ink};overflow:hidden}
#iap-store .iap-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;font-size:22px;border-bottom:2px solid ${T.border}}
#iap-store .iap-x{width:40px;height:40px;border-radius:50%;border:2px solid ${T.border};background:transparent;color:${T.ink};font-size:20px;cursor:pointer}
#iap-store .iap-list{overflow-y:auto;padding:10px 12px 14px;display:flex;flex-direction:column;gap:10px;touch-action:pan-y}
#iap-store .iap-item{display:flex;align-items:center;gap:12px;padding:10px;border-radius:14px;background:${T.bg};border:2px solid ${T.border}}
#iap-store .iap-ic{width:58px;height:58px;flex:none;display:flex;align-items:center;justify-content:center}
#iap-store .iap-ic img,#iap-store .iap-ic svg{width:58px;height:58px;object-fit:contain}
#iap-store .iap-tx{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0}
#iap-store .iap-tx b{font-size:17px}
#iap-store .iap-tx small{font-size:13px;color:${T.muted};line-height:1.25}
#iap-store .iap-buy{flex:none;min-width:96px;height:46px;padding:0 12px;border-radius:12px;border:0;background:${T.accent};color:${T.accentInk};font:inherit;font-size:18px;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.3)}
#iap-store .iap-buy:disabled{opacity:.6;cursor:default}
#iap-store .iap-buy.owned{background:transparent;border:2px solid ${T.border};color:${T.muted};font-size:14px}
#iap-store .iap-empty{padding:30px 10px;text-align:center;color:${T.muted}}
.iap-price{display:inline-flex;align-items:center;gap:5px}
.iap-price img{width:20px;height:20px}
.iap-price i{font-style:normal;font-size:.8em}`;
}
