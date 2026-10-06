// Игра: гараж (3D, инструменты: осмотр, мойка, кузов, механика, покраска, тюнинг, продажа), рынок
// объявлений с торгом в чате, покупатели, улучшения, рекорды, подарок дня, обучение, реклама и покупки.
import * as THREE from 'three';
import { sdk } from './sdk.js';
import { save } from './save.js';
import { audio } from './audio.js';
import { iap, priceHTML } from './iap.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import { t, tr, fmtNum, fmtMoney, fmtClock, LANG } from './i18n.js';
import { IC } from './icons.js';
import { Garage } from './garage.js';
import { CarView } from './carview.js';
import { buildCar } from './car.js';
import { MODELS } from './models.js';
import { CARS, CAR, CLASSIC, PAINTS, UPGRADES, UP, TUNING, HIDDEN, xpNeed, MAX_LVL } from './data.js';
import { rng, genCar, genListing, quality, value, jobs, clone, sellerReply, genBuyer, buyerReply, dealerPrice, xpFor, tuneCost, round500 } from './econ.js';

const AD_GAP = 150000;
const MARKET_T = 240000; // обновление рынка, мс
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const money = (n, cls = '') => `<span class="mn ${cls}">${IC.cash}<b>${fmtMoney(n)}</b></span>`;
const dayNum = () => {
  const d = new Date();
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
};
const bar = (v, inv = false) => {
  const p = Math.round(clamp(v, 0, 1) * 100);
  const c = p > 75 ? 'g' : p > 45 ? 'y' : 'r';
  return `<span class="bar ${c}"><u style="width:${p}%"></u></span><em>${p}%</em>`;
};
const AV_COL = { granddad: '#8a6a4a', granny: '#c86a8a', flipper: '#2a2a3a', student: '#3a8ae0', boss: '#1a3a5a', farmer: '#4a8a3a', taxi: '#e8b520', family: '#3ab08a', tuner: '#ff5a2a', collector: '#7a4ab0', dealer: '#5a5a6a' };
const AV_IC = { granddad: '👴', granny: '👵', flipper: '😎', student: '🧑‍🎓', boss: '👔', farmer: '🧑‍🌾', taxi: '🚕', family: '👨‍👩‍👧', tuner: '🔧', collector: '🎩', dealer: '💼' };
const avatar = (type) => `<span class="av" style="background:${AV_COL[type] || '#666'}">${AV_IC[type] || '🙂'}</span>`;
const namesOf = (k) => {
  const v = t(k);
  return Array.isArray(v) ? v : [v];
};

export const IAP_DEFS = {
  cash_small: { grant: () => game && game.addMoney(game.packSize(0), true) },
  cash_medium: { grant: () => game && game.addMoney(game.packSize(1), true) },
  cash_large: { grant: () => game && game.addMoney(game.packSize(2), true) },
  disable_ads: {
    permanent: true,
    grant: () => {
      save.data.noAds = true;
      sdk.noAds = true;
    },
  },
};
let game = null;

const TOOLS = [
  ['info', 'eye'],
  ['wash', 'wash'],
  ['body', 'hammer'],
  ['mech', 'engine'],
  ['paint', 'spray'],
  ['tune', 'rim'],
  ['sell', 'tag'],
];

export class Game {
  constructor() {
    game = this;
    window.__game = this;
    window.__audio = audio;
    window.__GF = { CarView, genCar, rng, quality, value, THREE };
    this.s = save.data;
    const s = this.s;
    this.r = rng((Date.now() ^ 0x5a5a) >>> 0);
    this.touch = matchMedia('(pointer: coarse)').matches;
    this.cv = document.getElementById('cv');
    const q = s.settings.quality === 'auto' ? (this.touch ? 'mid' : 'high') : s.settings.quality;
    this.g = new Garage(this.cv, { quality: q, mobile: this.touch });
    this.g.setSignText(LANG === 'ru' ? 'ГАРАЖ' : 'GARAGE');
    this.tab = 'garage';
    this.tool = 'info';
    this.sel = null;
    this.busy = false;
    this.buyers = [];
    this.buyerT = 0;
    this.thumbs = {};
    this.lastAd = Date.now();
    this.modal = null;
    this.ui = document.getElementById('ui');
    this.panel = document.getElementById('panel');
    this.modalEl = document.getElementById('modal');
    this.toastEl = document.getElementById('toasts');
    this._css();
    this._buildUi();
    this._input();
    if (s.car) this._loadCar();
    this._ensureMarket();
    this.resize();
    addEventListener('resize', () => this.resize());
    iap.onChange(() => this.hudMoney());
    this.render();
    this.last = performance.now();
    requestAnimationFrame((x) => this.loop(x));
    if (!s.tut.welcome) setTimeout(() => this.openWelcome(), 400);
    this.tutHint();
  }

  // ---------- состояние ----------
  bestBase() {
    return CARS.filter((c) => c.lvl <= this.s.lvl).reduce((a, c) => Math.max(a, c.base), 60000);
  }
  packSize(i) {
    return round500(this.bestBase() * [0.5, 2, 6][i]);
  }
  addMoney(n, iapGrant) {
    this.s.money += n;
    this.hudMoney(true);
    save.write();
    if (iapGrant) this.toast('+' + fmtMoney(n), 'good');
  }
  spend(n) {
    if (this.s.money < n) {
      this.toast(t('noMoney'), 'warn');
      audio.play('wrong');
      return false;
    }
    this.s.money -= n;
    this.hudMoney(true);
    return true;
  }
  _loadCar() {
    if (this.view) {
      this.g.setCar(null);
      this.view.dispose();
    }
    this.view = this.s.car ? new CarView(this.s.car) : null;
    this.g.setCar(this.view ? this.view.car : null);
    if (this.view) this.view.dirt0 = this.s.car.dirt;
  }
  q() {
    return this.s.car ? quality(this.s.car) : null;
  }

  // ---------- цикл ----------
  loop(tt) {
    const dt = Math.min(0.05, Math.max(0, (tt - this.last) / 1000));
    this.last = tt;
    try {
      this.update(dt);
      this.g.render();
    } catch (e) {
      console.error(e);
    }
    requestAnimationFrame((x) => this.loop(x));
  }
  update(dt) {
    this.g.update(dt);
    if (this.view) this.view.update(dt);
    if (this.job) this._jobTick(dt);
    // покупатели приходят, пока машина выставлена
    const c = this.s.car;
    if (c && c.listed && !this.busy) {
      this.buyerT -= dt;
      if (this.buyerT <= 0 && this.buyers.length < 3) {
        const B = genBuyer(this.r, c, c.listed.ask, this.s.up);
        B.chat = [{ who: 'them', text: tr(B.instant ? 'instB' : this._hiKey(B), { p: fmtMoney(B.offer) }, B.name) }];
        this.buyers.push(B);
        audio.play('msg');
        this.buyerT = (6 + this.r() * 6) * (1 - 0.15 * (this.s.up.adverts || 0)) * (c.listed.ask > value(c) * 1.2 ? 1.6 : 1);
        if (this.tab === 'garage' && this.tool === 'sell') this.renderPanel();
        else this.badge(true);
      }
    }
    // таймер рынка
    this._mt = (this._mt || 0) - dt;
    if (this._mt <= 0) {
      this._mt = 1;
      if (this.tab === 'market') {
        const el = this.panel.querySelector('.m-timer b');
        if (el) el.textContent = fmtClock((this.s.market.t - Date.now()) / 1000);
        if (Date.now() > this.s.market.t) {
          this._ensureMarket();
          this.renderPanel();
        }
      }
    }
    // мойка: досчитывать остаток грязи
    if (this.tool === 'wash' && this.view && this._washDirty) {
      this._washT = (this._washT || 0) - dt;
      if (this._washT <= 0) {
        this._washT = 0.4;
        this._washDirty = false;
        const left = this.view.dirtLeft();
        this.s.car.dirt = +left.toFixed(3);
        if (left < this.view.dirt0 * 0.06 || left < 0.02) this._washDone();
        const el = this.panel.querySelector('.wash-left');
        if (el) el.innerHTML = this._washHTML();
      }
    }
    // фото объявлений по одному за кадр
    if (this._thumbQ && this._thumbQ.length) this._doThumb(this._thumbQ.shift());
  }
  _hiKey(B) {
    return ['taxi', 'family', 'tuner', 'collector', 'student'].includes(B.type) && this.r() < 0.7 ? 'hiB_' + B.type : 'hiB';
  }

  // ---------- ввод ----------
  _input() {
    const el = this.cv;
    const pts = new Map();
    let downAt = null,
      moved = 0,
      lastPinch = 0;
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
      moved = 0;
      this._washing = this.tool === 'wash' && this.view && this.tab === 'garage' && pts.size === 1 && !!this.g.bodyHit(e.clientX, e.clientY);
    });
    el.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId);
      const dx = e.clientX - p.x,
        dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastPinch) this.g.zoom(lastPinch / d);
        lastPinch = d;
        return;
      }
      if (this._washing) this._washAt(e.clientX, e.clientY);
      else this.g.orbit(dx, dy);
    });
    const up = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      lastPinch = 0;
      if (downAt && moved < 8 && performance.now() - downAt.t < 400 && pts.size === 0) this._tap(e.clientX, e.clientY);
      this._washing = false;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.g.zoom(e.deltaY > 0 ? 1.08 : 0.93);
    }, { passive: false });
  }
  _tap(x, y) {
    if (this.tab !== 'garage' || !this.view || this.busy) return;
    const h = this.g.pick(x, y);
    if (!h) return;
    if (this.tool !== 'body' && this.tool !== 'paint') this.setTool('body');
    this.select(h.panel);
  }
  _washAt(x, y) {
    const h = this.g.bodyHit(x, y);
    if (!h || !h.uv) return;
    const big = (this.s.up.washer || 0) >= 1;
    this.view.rub(h.uv, big);
    this._washDirty = true;
    audio.play('wash', 1);
    if (Math.random() < 0.5) this.g.foam(h.point, big ? 4 : 2);
    if (!this.s.tut.wash && this.s.tut.step === 2) this.tutHint();
  }
  _washHTML() {
    const left = this.view ? this.view.dirtLeft() : 0;
    return `<span class="bar ${left < 0.1 ? 'g' : 'y'}"><u style="width:${Math.round((1 - clamp(left / Math.max(0.01, this.view.dirt0), 0, 1)) * 100)}%"></u></span><em>${esc(t('washLeft', { n: Math.round(left * 100) }))}</em>`;
  }
  _washDone() {
    if (!this.s.car || this.s.car.dirt === 0) return;
    this.s.car.dirt = 0;
    this.view.dirt0 = 0;
    for (const k in this.view.car.mats) this.view.car.mats[k].userData.u.uDirt.value = 0;
    audio.play('done');
    this.toast(t('washed'), 'good');
    if (this.s.tut.step === 2) this.tutNext(3);
    save.write();
    this.renderPanel();
  }

  // ---------- интерфейс ----------
  _buildUi() {
    this.ui.innerHTML = `
      <div class="top">
        <div class="money-box">${IC.cash}<b class="h-money">0</b></div>
        <div class="lvl-box"><span class="lv-n">1</span><div class="lv-t"><b class="lv-name"></b><i><u></u></i></div></div>
        <div class="tb"><button class="hb h-gift hidden">${IC.gift}</button><button class="hb h-shop">${IC.bag}</button><button class="hb h-set">${IC.gear}</button></div>
      </div>
      <div class="tools">${TOOLS.map(([k, ic]) => `<button class="tl" data-tool="${k}">${IC[ic]}<span>${esc(t('tool' + k[0].toUpperCase() + k.slice(1)))}</span><i class="dot hidden"></i></button>`).join('')}</div>
      <nav class="tabs">${[['garage', 'garage', 'tabGarage'], ['market', 'market', 'tabMarket'], ['up', 'up', 'tabUp'], ['rec', 'trophy', 'tabRec']].map(([k, ic, n]) => `<button class="tab" data-tab="${k}">${IC[ic]}<span>${esc(t(n))}</span><i class="dot hidden"></i></button>`).join('')}</nav>
      <div class="hint hidden"></div>`;
    this.ui.querySelectorAll('[data-tool]').forEach((b) => (b.onclick = () => (audio.play('tab'), this.setTool(b.dataset.tool))));
    this.ui.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => (audio.play('tab'), this.setTab(b.dataset.tab))));
    this.ui.querySelector('.h-gift').onclick = () => (audio.play('click'), this.openGift());
    this.ui.querySelector('.h-shop').onclick = () => (audio.play('click'), this.openShop());
    this.ui.querySelector('.h-set').onclick = () => (audio.play('click'), this.openSettings());
    this.hudMoney();
    this.hudLvl();
  }
  hudMoney(pop) {
    const el = this.ui.querySelector('.h-money');
    if (el) el.textContent = fmtMoney(this.s.money);
    if (pop) {
      const b = this.ui.querySelector('.money-box');
      b.classList.remove('pop');
      void b.offsetWidth;
      b.classList.add('pop');
    }
  }
  hudLvl() {
    const s = this.s;
    this.ui.querySelector('.lv-n').textContent = s.lvl;
    const titles = t('lvlT');
    this.ui.querySelector('.lv-name').textContent = titles[Math.min(titles.length - 1, s.lvl)] || '';
    this.ui.querySelector('.lv-t u').style.width = (s.lvl >= MAX_LVL ? 100 : (s.xp / xpNeed(s.lvl)) * 100).toFixed(1) + '%';
    this.ui.querySelector('.h-gift').classList.toggle('hidden', s.gift.last === dayNum());
  }
  badge(on) {
    const d = this.ui.querySelector('[data-tool="sell"] .dot');
    if (d) d.classList.toggle('hidden', !on);
    const d2 = this.ui.querySelector('[data-tab="garage"] .dot');
    if (d2) d2.classList.toggle('hidden', !on || this.tab === 'garage');
  }
  resize() {
    const w = innerWidth,
      h = innerHeight;
    this.port = w / h < 0.85;
    document.body.classList.toggle('port', this.port);
    this.g.resize(w, h);
    this.layout();
  }
  // смещение кадра 3D, чтобы машина не пряталась под панелью
  layout() {
    const w = innerWidth,
      h = innerHeight;
    const cam = this.g.camera;
    if (this.port) {
      const ph = this.panel.offsetHeight || h * 0.45;
      cam.setViewOffset(w, h, 0, (ph - 80) * 0.5, w, h);
    } else {
      const pw = this.panel.offsetWidth || 420;
      cam.setViewOffset(w, h, (pw - 90) * 0.5, 0, w, h);
    }
  }
  setTab(tab) {
    this.tab = tab;
    this.ui.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    document.body.classList.toggle('t-garage', tab === 'garage');
    if (tab !== 'garage') this.highlight(null);
    if (tab === 'market') this._ensureMarket();
    if (tab === 'garage') this.badge(this.buyers.length > 0 && this.tool !== 'sell');
    this.render();
    if (tab === 'market' && this.s.tut.step === 0) this.tutHint();
  }
  setTool(tool) {
    this.tool = tool;
    this.sel = null;
    this.highlight(null);
    const g = this.g;
    if (this.view) {
      const car = this.view.car;
      // капот открыт в механике
      if (car.hoodPivot) car.hoodPivot.userData.target = tool === 'mech' ? (car.hoodPivot.userData.open || 1) * 1.05 : 0;
      this._animHood();
      g.setLift(tool === 'mech' ? 0.55 : 0);
      if (tool === 'mech') audio.play('lift');
    }
    if (tool === 'sell') this.badge(false);
    this.ui.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === tool));
    this.render();
    this.tutHint();
  }
  _animHood() {
    const p = this.view && this.view.car.hoodPivot;
    if (!p) return;
    const target = p.userData.target || 0;
    const step = () => {
      const d = target - p.rotation.z;
      if (Math.abs(d) < 0.005) return (p.rotation.z = target);
      p.rotation.z += d * 0.15;
      requestAnimationFrame(step);
    };
    step();
  }
  highlight(k) {
    if (this.view) this.view.highlight(k);
  }
  select(k) {
    this.sel = k;
    this.highlight(k);
    audio.play('click');
    this.renderPanel();
  }
  render() {
    this.ui.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === this.tab));
    this.ui.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === this.tool));
    document.body.classList.toggle('has-car', !!this.s.car);
    document.body.classList.toggle('t-garage', this.tab === 'garage');
    document.body.classList.toggle('wide-panel', this.tab !== 'garage');
    this.renderPanel();
  }
  renderPanel() {
    const P = this.panel;
    let h = '';
    if (this.tab === 'garage') h = this.s.car ? this._garageHTML() : `<div class="emp">${IC.car}<b>${esc(t('empty'))}</b><p>${esc(t('emptySub'))}</p><button class="btn primary big b-tomarket">${IC.market}<span>${esc(t('toMarket'))}</span></button></div>`;
    else if (this.tab === 'market') h = this._marketHTML();
    else if (this.tab === 'up') h = this._upHTML();
    else h = this._recHTML();
    P.innerHTML = h;
    P.className = 'p-' + this.tab + (this.tab === 'garage' ? ' tool-' + this.tool : '');
    this._bindPanel();
    requestAnimationFrame(() => this.layout());
  }

  // ---------- гараж: панели инструментов ----------
  _carHead() {
    const c = this.s.car;
    const q = this.q();
    const v = value(c, q);
    const pr = v - c.bought - c.spent;
    return `<div class="carhead"><div><b>${esc(t('m_' + c.model))}</b><small>${esc(t('md_' + c.model))} · ${esc(t('year', { n: c.year }))} · ${esc(t('km', { n: fmtNum(c.km) }))}</small></div>
      <div class="fin"><span><small>${esc(t('bought'))}</small>${money(c.bought)}</span><span><small>${esc(t('spent'))}</small>${money(c.spent)}</span><span><small>${esc(t('worth'))}</small>${money(v, 'big')}</span><span><small>${esc(t('profitNow'))}</small>${money(pr, pr >= 0 ? 'pos' : 'neg')}</span></div></div>`;
  }
  _garageHTML() {
    const c = this.s.car;
    const q = this.q();
    const up = this.s.up;
    let body = '';
    switch (this.tool) {
      case 'info':
        body = `<div class="conds">${['body', 'paint', 'engine', 'gearbox', 'suspension', 'brakes', 'interior', 'glass', 'lights', 'tires'].map((k) => `<div class="cr"><span>${esc(t(k))}</span>${bar(q[k])}</div>`).join('')}<div class="cr"><span>${esc(t('dirt'))}</span>${bar(1 - c.dirt)}</div></div>`;
        break;
      case 'wash':
        body = c.dirt > 0 ? `<p class="hintp">${IC.wash}${esc(t('washHint'))}</p><div class="cr wash-left">${this._washHTML()}</div>${(up.washer || 0) >= 2 ? `<button class="btn primary b-autowash">${IC.wash}<span>${esc(t('autoWash'))}</span></button>` : ''}` : `<p class="hintp ok">${IC.check}${esc(t('washed'))}</p>`;
        break;
      case 'body': {
        const list = Object.keys(c.panels).filter((k) => {
          const p = c.panels[k];
          return p.rust > 0.04 || p.dent > 0.04 || p.primer > 0.5 || p.fade > 0.12;
        });
        if (this.sel) {
          const p = c.panels[this.sel];
          const J = jobs(c, up, this.sel);
          body = `<button class="back b-back">‹ ${esc(t('toolBody'))}</button><h3>${esc(t(this.sel))}</h3><div class="tags">${this._tags(p)}</div>${J.length ? J.map((j) => this._jobHTML(j)).join('') : `<p class="hintp ok">${IC.check}${esc(t('allGoodBody'))}</p>`}`;
        } else
          body = `<p class="hintp">${IC.hammer}${esc(t('tapPanel'))}</p>${list.length ? `<div class="plist">${list.map((k) => `<button class="pi" data-panel="${k}"><b>${esc(t(k))}</b><span class="tags">${this._tags(c.panels[k])}</span></button>`).join('')}</div>` : `<p class="hintp ok">${IC.check}${esc(t('allGoodBody'))}</p>`}`;
        break;
      }
      case 'mech': {
        const J = jobs(c, up).filter((j) => ['engine', 'gearbox', 'suspension', 'brakes', 'clean', 'interior', 'glass', 'lights', 'tires'].includes(j.id));
        body = J.length ? J.map((j) => this._jobHTML(j, true)).join('') : `<p class="hintp ok">${IC.check}${esc(t('allGoodMech'))}</p>`;
        break;
      }
      case 'paint': {
        const J = jobs(c, up);
        const all = J.find((j) => j.id === 'paintAll');
        const pol = J.find((j) => j.id === 'polish');
        const lv = up.booth || 0;
        const cur = this._paintPick ?? c.color;
        body = `<p class="hintp">${IC.spray}${esc(t(lv ? 'paintHint' : 'paintPanelHint'))}</p>
          <div class="sw">${PAINTS.map((p) => {
            const lock = (p.m || 0) > Math.max(0, lv - 1) || !lv;
            return `<button class="swc ${p.c === cur ? 'on' : ''} ${lock ? 'lock' : ''} ${p.m ? 'm' + p.m : ''}" data-color="${p.c}" title="${esc(t('c_' + p.k))}" style="--c:#${p.c.toString(16).padStart(6, '0')}">${lock ? IC.lock : ''}</button>`;
          }).join('')}</div>
          <p class="note">${esc(lv < 2 ? t('needBooth2') : lv < 3 ? t('needBooth3') : '')}</p>
          ${all ? this._jobHTML(all) : ''}${pol ? this._jobHTML(pol) : ''}`;
        break;
      }
      case 'tune': {
        if (!up.tuning) body = `<p class="hintp">${IC.lock}${esc(t('tuneLocked'))}</p>`;
        else
          body = `<p class="note">${esc(t('tunerNote'))}</p>` + TUNING.map((tu) => {
            const cur = c.tuned[tu.id];
            const cost = tuneCost(c, tu.id);
            return `<div class="tune"><b>${esc(t('t_' + tu.id))}</b><div class="opts">${tu.opts.map((o) => {
              const lab = typeof o === 'number' && o > 10 ? `<i class="cdot" style="background:#${o.toString(16).padStart(6, '0')}"></i>` : esc(t('o_' + (o === 1 && tu.id === 'stance' ? 'on' : o)));
              return `<button class="btn sm ${cur === o ? 'primary' : 'ghost'}" data-tune="${tu.id}" data-opt="${o}">${lab}</button>`;
            }).join('')}${cur !== undefined ? `<button class="btn sm ghost" data-tune="${tu.id}" data-opt="">${esc(t('remove'))}</button>` : ''}</div><small>${money(cost)}</small></div>`;
          }).join('');
        break;
      }
      case 'sell': {
        const V = value(c, q);
        if (!c.listed) {
          const ask = this._ask ?? round500(V * 1.08);
          this._ask = ask;
          body = `<p class="hintp">${IC.tag}${esc(t('sellHint'))}</p>
            <div class="askrow"><span>${esc(t('askPrice'))}</span><div class="stepper"><button class="st b-am">${IC.minus}</button><b class="ask">${fmtMoney(ask)}</b><button class="st b-ap">${IC.plus}</button></div></div>
            <input type="range" class="askr" min="${round500(V * 0.7)}" max="${round500(V * 1.6)}" step="500" value="${ask}">
            <button class="btn primary big b-list">${IC.tag}<span>${esc(t('listIt'))}</span></button>
            <div class="dealer"><span>${esc(t('dealerOffer', { n: fmtMoney(dealerPrice(c)) }))}</span><button class="btn sm ghost b-dealer">${esc(t('dealerSell'))}</button></div>`;
        } else {
          body = `<div class="askrow"><span>${esc(t('askPrice'))}</span>${money(c.listed.ask, 'big')}</div>
            <div class="buyers">${this.buyers.length ? this.buyers.map((B) => `<div class="buyer" data-b="${B.id}">${avatar(B.type)}<div class="bt"><b>${esc(namesOf('bn')[B.name % namesOf('bn').length])} · ${esc(t('b_' + B.type))}</b><small>${esc(B.chat[B.chat.length - 1].text)}</small></div><div class="bb"><button class="btn sm primary" data-sellto="${B.id}">${esc(t('sellFor', { n: fmtMoney(B.offer) }))}</button><button class="btn sm ghost" data-chat="${B.id}">${IC.chat}</button><button class="btn sm ghost x" data-decline="${B.id}">${IC.close}</button></div></div>`).join('') : `<p class="hintp wait">${IC.clock}${esc(t('waiting'))}</p>`}</div>
            <div class="m-btns"><button class="btn ghost sm b-unlist">${esc(t('unlist'))}</button><button class="btn ghost sm b-dealer">${esc(t('dealerSell'))} · ${fmtMoney(dealerPrice(c))}</button></div>`;
        }
        break;
      }
    }
    return this._carHead() + `<div class="pbody">${body}</div>`;
  }
  _tags(p) {
    const T = [];
    if (p.rust > 0.04) T.push(`<i class="tg r">${esc(t('rustT'))} ${Math.round(p.rust * 100)}%</i>`);
    if (p.dent > 0.04) T.push(`<i class="tg d">${esc(t('dentT'))}</i>`);
    if (p.primer > 0.5) T.push(`<i class="tg p">${esc(t('primerT'))}</i>`);
    else if (p.fade > 0.12) T.push(`<i class="tg f">${esc(t('fadeT'))}</i>`);
    return T.join('');
  }
  _jobHTML(j, withBar) {
    const c = this.s.car;
    const cond = withBar ? c.sys[j.id === 'clean' ? 'interior' : j.id] : null;
    const dis = j.need || j.dim;
    return `<div class="job ${dis ? 'dis' : ''}"><div class="jt"><b>${esc(t('j_' + j.id))}</b>${withBar && cond !== undefined ? `<div class="cr">${bar(cond)}</div>` : ''}<small class="${(j.gainPaint ?? j.gain) > j.cost ? 'gp' : ''}">${j.need ? esc(t(j.need === 'booth' ? 'needBooth' : 'rustFirst')) : j.gainPaint !== undefined ? esc(t('gainPaint', { n: fmtMoney(j.gainPaint) })) : j.gain > 300 ? esc(t('gain', { n: fmtMoney(j.gain) })) : esc(t('noGain'))}</small></div><button class="btn sm ${(j.gainPaint ?? j.gain) > j.cost ? 'primary' : 'ghost'}" data-job="${j.id}" data-part="${j.part || ''}" ${j.need ? 'disabled' : ''}>${money(j.cost)}</button></div>`;
  }

  _bindPanel() {
    const P = this.panel;
    const q = (s) => P.querySelector(s);
    const b = q('.b-tomarket');
    if (b) b.onclick = () => (audio.play('click'), this.setTab('market'));
    P.querySelectorAll('[data-panel]').forEach((e) => (e.onclick = () => this.select(e.dataset.panel)));
    const bk = q('.b-back');
    if (bk) bk.onclick = () => (audio.play('click'), (this.sel = null), this.highlight(null), this.renderPanel());
    P.querySelectorAll('[data-job]').forEach((e) => (e.onclick = () => this.doJob(e.dataset.job, e.dataset.part || null)));
    P.querySelectorAll('[data-color]').forEach(
      (e) =>
        (e.onclick = () => {
          if (e.classList.contains('lock')) return audio.play('wrong'), this.toast(t((this.s.up.booth || 0) ? (PAINTS.find((p) => p.c === +e.dataset.color).m > 1 ? 'needBooth3' : 'needBooth2') : 'needBooth'), 'warn');
          audio.play('click');
          this._paintPick = +e.dataset.color;
          this.renderPanel();
        }),
    );
    P.querySelectorAll('[data-tune]').forEach((e) => (e.onclick = () => this.doTune(e.dataset.tune, e.dataset.opt)));
    const aw = q('.b-autowash');
    if (aw) aw.onclick = () => this.autoWash();
    // продажа
    const r = q('.askr');
    if (r) {
      r.addEventListener('pointerdown', (e) => e.stopPropagation());
      r.oninput = () => {
        this._ask = +r.value;
        q('.ask').textContent = fmtMoney(this._ask);
      };
      const stp = (k) => () => {
        audio.play('click');
        this._ask = clamp(this._ask + k * round500(value(this.s.car) * 0.02), +r.min, +r.max);
        r.value = this._ask;
        q('.ask').textContent = fmtMoney(this._ask);
      };
      q('.b-am').onclick = stp(-1);
      q('.b-ap').onclick = stp(1);
    }
    const bl = q('.b-list');
    if (bl) bl.onclick = () => this.listCar();
    const bu = q('.b-unlist');
    if (bu)
      bu.onclick = () => {
        audio.play('click');
        this.s.car.listed = null;
        this.buyers = [];
        save.write();
        this.renderPanel();
      };
    P.querySelectorAll('.b-dealer').forEach((e) => (e.onclick = () => this.sellCar(dealerPrice(this.s.car), 'dealer')));
    P.querySelectorAll('[data-sellto]').forEach((e) => (e.onclick = () => {
      const B = this.buyers.find((x) => x.id === e.dataset.sellto);
      if (B) this.sellCar(B.offer, B.type);
    }));
    P.querySelectorAll('[data-chat]').forEach((e) => (e.onclick = () => this.openBuyerChat(e.dataset.chat)));
    P.querySelectorAll('[data-decline]').forEach((e) => (e.onclick = () => {
      audio.play('click');
      this.buyers = this.buyers.filter((x) => x.id !== e.dataset.decline);
      this.renderPanel();
    }));
    // рынок
    P.querySelectorAll('[data-lot]').forEach((e) => (e.onclick = () => (audio.play('click'), this.openLot(e.dataset.lot))));
    const rf = q('.b-refresh');
    if (rf)
      rf.onclick = () =>
        this.rewarded(() => {
          this.s.market.t = 0;
          this._ensureMarket();
          this.toast(t('listNew'), 'good');
          this.renderPanel();
        });
    // улучшения
    P.querySelectorAll('[data-up]').forEach((e) => (e.onclick = () => this.buyUpgrade(e.dataset.up)));
    const lb = q('.b-lb');
    if (lb) lb.onclick = () => (audio.play('click'), this.openLb());
  }

  // ---------- работы ----------
  doJob(id, part) {
    if (this.busy || !this.s.car) return;
    const c = this.s.car;
    const J = jobs(c, this.s.up, part).find((j) => j.id === id && (j.part || null) === part);
    if (!J || J.need) return;
    if (!this.spend(J.cost)) return;
    this.busy = true;
    this.highlight(null);
    // эффект на 1.2 с: искры, удары, распыление, ключ
    const car = this.view.car;
    const mesh = part ? car.panels[part] : null;
    const box = new THREE.Box3();
    if (mesh) box.setFromObject(mesh);
    else box.setFromObject(car.body);
    const center = box.getCenter(new THREE.Vector3());
    if (!mesh && ['engine', 'gearbox'].includes(id)) center.copy(car.engine.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(car.shape.L * 0.33, 0.5, 0));
    const kind = id === 'dent' ? 'hammer' : id === 'rust' || id === 'replace' ? 'grind' : id === 'paintPanel' || id === 'paintAll' || id === 'polish' ? 'spray' : id === 'clean' ? 'wash' : 'wrench';
    if (part) this.g.focus({ tyaw: this._yawFor(center) });
    this.job = { t: 0, dur: id === 'paintAll' ? 2.2 : 1.3, kind, center, box, J, id, part };
  }
  _yawFor(p) {
    return Math.atan2(p.x, p.z);
  }
  _jobTick(dt) {
    const j = this.job;
    j.t += dt;
    j.fx = (j.fx || 0) - dt;
    if (j.fx <= 0) {
      j.fx = j.kind === 'hammer' ? 0.22 : 0.12;
      const p = j.center.clone();
      if (j.kind === 'spray' && !j.part) {
        p.set(THREE.MathUtils.lerp(j.box.min.x, j.box.max.x, (j.t / j.dur) % 1), THREE.MathUtils.lerp(j.box.min.y, j.box.max.y, 0.4 + Math.random() * 0.5), (Math.random() < 0.75 === this.g.camera.position.z > 0 ? j.box.max.z : j.box.min.z) * 0.95);
      } else p.add(new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.3));
      if (j.kind === 'grind') {
        this.g.sparks(p, 14);
        audio.play('grind');
      } else if (j.kind === 'hammer') {
        this.g.puff(p, 0xb8b8b8, 2);
        audio.play('hammer');
      } else if (j.kind === 'spray') {
        const col = j.id === 'paintAll' ? this._paintPick ?? this.s.car.color : j.id === 'polish' ? 0xffffff : this.s.car.color;
        this.g.puff(p, col, 4);
        audio.play('spray');
      } else if (j.kind === 'wash') {
        this.g.foam(p, 3);
        audio.play('wash');
      } else audio.play('wrench');
    }
    if (j.t >= j.dur) {
      this.job = null;
      this._finishJob(j);
    }
  }
  _finishJob(j) {
    const c = this.s.car;
    const before = value(c);
    if (j.id === 'paintAll') {
      const col = this._paintPick ?? c.color;
      const p = PAINTS.find((x) => x.c === col);
      j.J.apply(c, col, p ? !!p.m : c.metallic);
      this.view.data = c;
      this.view.rebuildLook();
    } else j.J.apply(c);
    c.spent += j.J.cost;
    this.view.sync(false);
    const after = value(c);
    this.busy = false;
    audio.play('done');
    const d = Math.round(after - before);
    if (d > 0) this.toast('+' + fmtMoney(d) + ' ' + t('worth').toLowerCase(), 'good');
    // обучение
    const st = this.s.tut.step;
    if (st === 3 && ['dent', 'rust', 'replace'].includes(j.id)) this.tutNext(4);
    else if (st === 4 && ['paintPanel', 'paintAll'].includes(j.id)) this.tutNext(5);
    save.write();
    this.renderPanel();
  }
  doTune(id, opt) {
    if (this.busy || !this.s.car) return;
    const c = this.s.car;
    const tu = TUNING.find((x) => x.id === id);
    const val = opt === '' ? undefined : isNaN(+opt) ? opt : +opt;
    if (val !== undefined) {
      if (c.tuned[id] === val) return;
      if (!this.spend(tuneCost(c, id))) return;
      c.spent += tuneCost(c, id);
      c.tuned[id] = val;
    } else delete c.tuned[id];
    // визуально
    const look = c.look;
    if (id === 'rims') look.rim = val;
    if (id === 'rimColor') look.rimColor = val;
    if (id === 'caliper') look.caliper = val;
    if (id === 'spoiler') look.spoiler = val || 0;
    if (id === 'stripes') look.stripes = val || 0;
    if (id === 'stance') look.stance = !!val;
    audio.play('wrench');
    if (['rims', 'rimColor', 'caliper', 'stance'].includes(id)) this._loadCar();
    else this.view.rebuildLook();
    save.write();
    this.renderPanel();
  }
  autoWash() {
    if (!this.view) return;
    audio.play('wash');
    let k = 0;
    const iv = setInterval(() => {
      k++;
      for (let i = 0; i < 30; i++) this.view.rub({ x: Math.random(), y: Math.random() }, true);
      this.g.foam(new THREE.Vector3((Math.random() - 0.5) * 3, 0.6 + Math.random() * 0.6, (Math.random() - 0.5) * 1.6), 4);
      if (k > 16) {
        clearInterval(iv);
        this._washDone();
      }
    }, 90);
  }

  // ---------- рынок ----------
  _ensureMarket() {
    const s = this.s;
    const M = s.market;
    const n = 4 + (s.up.contacts || 0);
    if (!M.list.length || Date.now() > M.t) {
      const keep = M.list.filter((l) => l.chatting);
      M.list = keep;
      while (M.list.length < n) M.list.push(this._newListing());
      M.t = Date.now() + MARKET_T;
      this._thumbQ = [];
    }
    // первая машина в обучении — дешёвая честная «Ласточка»
    if (!s.tut.firstCar && !s.car) {
      s.tut.firstCar = 1;
      const L = genListing(this.r, 1, s.up, { tier: 0, seller: 'granddad' });
      L.car = this._tutorialCar(L.car);
      for (const k of HIDDEN) L.claims[k] = L.car.sys[k];
      L.value = Math.round(value(L.car));
      L.ask = round500(L.value * 1.05);
      L.ask0 = L.ask;
      L.min = round500(L.value * 0.78);
      L.pat = 6;
      L.tutorial = true;
      M.list.unshift(L);
    }
    // находка дня
    if (s.lvl >= 2 && M.findDay !== dayNum()) {
      M.findDay = dayNum();
      M.find = genListing(this.r, s.lvl, s.up, { find: true });
    }
    save.write(false);
  }
  _tutorialCar(car) {
    // гарантированно: грязь, ржавчина на паре деталей, вмятина
    car.model = 'lastochka';
    car.year = 1979;
    car.km = 186000;
    car.dirt = 0.9;
    for (const k in car.panels) Object.assign(car.panels[k], { rust: 0, dent: 0, primer: 0, fade: 0.25 });
    car.panels.doorR.dent = 0.7;
    car.panels.fenderR.rust = 0.45;
    car.panels.quarterL.rust = 0.35;
    car.panels.bumperF.rust = 0.3;
    Object.assign(car.sys, { engine: 0.62, gearbox: 0.8, suspension: 0.55, brakes: 0.6, interior: 0.5, glass: 0.9, lights: 0.6, tires: 0.45 });
    return car;
  }
  _newListing() {
    return genListing(this.r, this.s.lvl, this.s.up);
  }
  _thumb(L, w = 480, h = 300) {
    const key = L.id + ':' + w;
    if (this.thumbs[key]) return this.thumbs[key];
    if (!this._thumbQ) this._thumbQ = [];
    if (!this._thumbQ.some((x) => x.key === key)) this._thumbQ.push({ key, L, w, h });
    return null;
  }
  _doThumb({ key, L, w, h }) {
    const v = new CarView(L.car);
    const img = this.g.photo(v.car.root, w, h, 0.7 + (L.name % 5) * 0.12);
    v.dispose();
    this.thumbs[key] = img;
    this.panel.querySelectorAll(`[data-thumb="${key}"]`).forEach((e) => (e.style.backgroundImage = `url(${img})`));
    if (this.modal) this.modal.el.querySelectorAll(`[data-thumb="${key}"]`).forEach((e) => (e.style.backgroundImage = `url(${img})`));
  }
  _lotCard(L, find) {
    const key = L.id + ':480';
    const img = this._thumb(L);
    const c = L.car;
    const sn = namesOf('n_' + L.seller);
    return `<button class="lot ${find ? 'find' : ''}" data-lot="${L.id}">
      <div class="ph" data-thumb="${key}" style="${img ? `background-image:url(${img})` : ''}">${find ? `<span class="fb">${IC.star}${esc(t('find'))}</span>` : ''}${L.urgent ? `<span class="ub">${esc(t('urgent'))}</span>` : ''}</div>
      <div class="li"><b>${esc(t('m_' + c.model))} <small>${esc(t('year', { n: c.year }))}</small></b><span class="pr">${money(L.ask)}</span><small>${avatar(L.seller)}${esc(t('s_' + L.seller))} ${esc(sn[L.name % sn.length])} · ${esc(t('km', { n: fmtNum(c.km) }))}</small></div></button>`;
  }
  _marketHTML() {
    const M = this.s.market;
    const lots = M.list.map((L) => this._lotCard(L)).join('');
    return `<div class="ph-head"><h2>${IC.market}${esc(t('marketTitle'))}</h2><div class="m-timer">${IC.clock}<span>${esc(t('newIn', { t: '' }))}</span><b>${fmtClock((M.t - Date.now()) / 1000)}</b><button class="btn sm ad b-refresh">${IC.video}<span>${esc(t('refresh'))}</span></button></div></div>
      ${this.s.car ? `<p class="note warnn">${IC.warn}${esc(t('busyGarage'))}</p>` : ''}
      ${M.find && !M.find.done ? `<div class="lots one">${this._lotCard(M.find, true)}</div>` : ''}
      <div class="lots">${lots}</div>`;
  }
  _lot(id) {
    const M = this.s.market;
    if (M.find && M.find.id === id) return M.find;
    return M.list.find((l) => l.id === id);
  }
  _removeLot(id) {
    const M = this.s.market;
    if (M.find && M.find.id === id) M.find.done = true;
    M.list = M.list.filter((l) => l.id !== id);
  }
  openLot(id) {
    const L = this._lot(id);
    if (!L) return;
    const c = L.car;
    const q = quality(c);
    const sees = this.s.up.scanner || L.revealed;
    // оценка: со сканером — честная, иначе по словам продавца
    const est = sees ? value(c) : value({ ...clone(c), sys: { ...c.sys, ...L.claims } });
    const key = L.id + ':640';
    const img = this._thumb(L, 640, 400);
    const row = (k) => {
      const hid = HIDDEN.has(k);
      if (hid && !sees) return `<div class="cr"><span>${esc(t(k))}</span>${bar(L.claims[k])}<i class="q">? ${esc(t('saysSeller'))}</i></div>`;
      return `<div class="cr"><span>${esc(t(k))}</span>${bar(k === 'body' || k === 'paint' ? q[k] : c.sys[k])}</div>`;
    };
    const sn = namesOf('n_' + L.seller);
    const desc = tr('d_' + L.seller, null, L.name);
    this.openModal(
      `<div class="lotph" data-thumb="${key}" style="${img ? `background-image:url(${img})` : ''}"></div>
      <div class="m-title sm"><span>${esc(t('m_' + c.model))}</span><small>${esc(t('md_' + c.model))} · ${esc(t('year', { n: c.year }))} · ${esc(t('km', { n: fmtNum(c.km) }))}</small></div>
      <div class="seller">${avatar(L.seller)}<div><b>${esc(t('s_' + L.seller))} ${esc(sn[L.name % sn.length])}</b><q>${esc(desc)}</q></div></div>
      <div class="conds two">${['body', 'paint', 'engine', 'gearbox', 'suspension', 'brakes', 'interior', 'glass', 'lights', 'tires'].map(row).join('')}</div>
      <div class="estrow"><span>${esc(t('estimate'))}</span>${sees ? money(est, 'big') : `<span class="estq">${esc(t('estimateQ', { n: fmtMoney(round500(est)) }))}</span>`}</div>
      ${!sees ? `<button class="btn ad sm b-mech">${IC.video}<span>${esc(t('mechanic'))}</span></button>` : L.revealed ? `<p class="note">${IC.check}${esc(t('revealed'))}</p>` : ''}
      ${this.s.car ? `<p class="note warnn">${IC.warn}${esc(t('busyGarage'))}</p>` : ''}
      <div class="m-btns"><button class="btn ghost b-haggle" ${this.s.car ? 'disabled' : ''}>${IC.chat}<span>${esc(t('haggle'))}</span></button><button class="btn primary b-buy" ${this.s.car ? 'disabled' : ''}>${esc(t('buyFor', { n: fmtMoney(L.ask) }))}</button></div>`,
      {
        cls: 'lotm',
        onOpen: (m) => {
          const bm = m.querySelector('.b-mech');
          if (bm)
            bm.onclick = () =>
              this.rewarded(() => {
                L.revealed = true;
                save.write(false);
                this.openLot(id);
              });
          m.querySelector('.b-haggle').onclick = () => (audio.play('click'), this.openSellerChat(id));
          m.querySelector('.b-buy').onclick = () => this.buyLot(id, L.ask);
        },
      },
    );
  }
  buyLot(id, price) {
    const L = this._lot(id);
    if (!L || this.s.car) return;
    if (!this.spend(price)) return;
    audio.play('cash');
    const c = L.car;
    c.bought = price;
    c.spent = 0;
    c.listed = null;
    c.tuned = c.tuned || {};
    c.look = c.look || {};
    this.s.car = c;
    this._removeLot(id);
    this.closeModal(true);
    this.buyers = [];
    this._ask = null;
    this._paintPick = null;
    this._loadCar();
    this.tool = 'info';
    this.setTab('garage');
    this.g.focus({ tyaw: 0.85, tpitch: 0.2, tdist: 6.2 });
    if (this.s.tut.step <= 1) this.tutNext(2);
    save.write();
  }

  // ---------- чат ----------
  _chatHTML(msgs, typing) {
    return msgs.map((m) => `<div class="msg ${m.who}">${esc(m.text)}</div>`).join('') + (typing ? `<div class="msg them typing">${esc(t('typing'))}<i></i><i></i><i></i></div>` : '');
  }
  openSellerChat(id) {
    const L = this._lot(id);
    if (!L) return;
    L.chatting = true;
    if (!L.chat) L.chat = [{ who: 'them', text: tr(L.seller === 'flipper' ? 'hiFlip' : L.seller === 'boss' ? 'hiBoss' : 'hiS', { p: fmtMoney(L.ask) }, L.name) }];
    let x = round500(L.ask * 0.8);
    let deal = null;
    const step = round500(L.ask0 * 0.02);
    const sn = namesOf('n_' + L.seller);
    const draw = (m, typing) => {
      m.querySelector('.msgs').innerHTML = this._chatHTML(L.chat, typing);
      m.querySelector('.msgs').scrollTop = 1e6;
      m.querySelector('.cur').textContent = fmtMoney(x);
      const bb = m.querySelector('.b-deal');
      bb.innerHTML = esc(t('buyFor', { n: fmtMoney(deal ?? L.ask) }));
      bb.classList.toggle('pulse', deal !== null);
      m.querySelector('.b-pers').classList.toggle('hidden', !(L.pat <= 1.5 && !L.persuaded && !deal && !L.gone));
      m.querySelectorAll('.offer button, .chips button, .b-off').forEach((b) => (b.disabled = !!L.gone || !!deal));
      m.querySelector('.b-deal').disabled = !!L.gone;
    };
    this.openModal(
      `<div class="chat-h">${avatar(L.seller)}<div><b>${esc(t('s_' + L.seller))} ${esc(sn[L.name % sn.length])}</b><small>${esc(t('m_' + L.car.model))} · ${fmtMoney(L.ask0)}</small></div></div>
      <div class="msgs"></div>
      <div class="offer"><button class="st o-m">${IC.minus}</button><b class="cur"></b><button class="st o-p">${IC.plus}</button><button class="btn primary b-off">${esc(t('offer'))}</button></div>
      <div class="chips">${[10, 20, 30].map((p) => `<button class="chip" data-pc="${p}">−${p}%</button>`).join('')}</div>
      <div class="m-btns"><button class="btn ad sm b-pers hidden">${IC.video}<span>${esc(t('persuade'))}</span></button><button class="btn primary b-deal"></button></div>`,
      {
        cls: 'chatm',
        onOpen: (m) => {
          draw(m);
          if (this.s.tut.step <= 1) this.hintIn(m, t('tut1'));
          m.querySelector('.o-m').onclick = () => ((x = Math.max(500, x - step)), audio.play('click'), draw(m));
          m.querySelector('.o-p').onclick = () => ((x = Math.min(L.ask, x + step)), audio.play('click'), draw(m));
          m.querySelectorAll('[data-pc]').forEach((b) => (b.onclick = () => ((x = round500(L.ask * (1 - b.dataset.pc / 100))), audio.play('click'), draw(m))));
          m.querySelector('.b-off').onclick = () => {
            if (L.gone || deal) return;
            L.chat.push({ who: 'me', text: tr('me', { p: fmtMoney(x) }) });
            audio.play('click');
            draw(m, true);
            setTimeout(() => {
              const a = sellerReply(L, x, this.r);
              if (a.kind === 'accept') {
                deal = a.price;
                L.chat.push({ who: 'them', text: tr('okS') });
                audio.play('deal');
              } else if (a.kind === 'leave') {
                L.gone = true;
                L.chat.push({ who: 'them', text: tr('byeS') });
                audio.play('nope');
                this._removeLot(id);
                save.write(false);
              } else {
                L.chat.push({ who: 'them', text: tr(a.kind === 'insult' ? 'inS' : 'cnS', { p: fmtMoney(a.price) }) });
                audio.play('msg');
                x = Math.min(x, L.ask);
              }
              if (this.modal && this.modal.el === m.parentElement) draw(m);
            }, 700 + Math.random() * 500);
          };
          m.querySelector('.b-pers').onclick = () =>
            this.rewarded(() => {
              L.pat += 2;
              L.persuaded = true;
              L.ask = round500(L.ask * 0.97);
              L.chat.push({ who: 'them', text: tr('cnS', { p: fmtMoney(L.ask) }) });
              draw(m);
            });
          m.querySelector('.b-deal').onclick = () => this.buyLot(id, deal ?? L.ask);
        },
        onClose: () => this.renderPanel(),
      },
    );
  }
  openBuyerChat(bid) {
    const B = this.buyers.find((x) => x.id === bid);
    const c = this.s.car;
    if (!B || !c) return;
    let x = round500(Math.max(B.offer * 1.15, c.listed.ask * 0.95));
    const step = round500(value(c) * 0.02);
    let deal = null;
    const nm = namesOf('bn')[B.name % namesOf('bn').length];
    const draw = (m, typing) => {
      m.querySelector('.msgs').innerHTML = this._chatHTML(B.chat, typing);
      m.querySelector('.msgs').scrollTop = 1e6;
      m.querySelector('.cur').textContent = fmtMoney(x);
      const bb = m.querySelector('.b-deal');
      bb.innerHTML = esc(t('sellFor', { n: fmtMoney(deal ?? B.offer) }));
      bb.classList.toggle('pulse', deal !== null);
      m.querySelector('.b-pers').classList.toggle('hidden', !(B.pat <= 1 && !B.persuaded && !deal && !B.gone));
      m.querySelectorAll('.offer button').forEach((b) => (b.disabled = !!B.gone || !!deal));
      bb.disabled = !!B.gone;
    };
    this.openModal(
      `<div class="chat-h">${avatar(B.type)}<div><b>${esc(nm)} · ${esc(t('b_' + B.type))}</b><small>${esc(t('m_' + c.model))} · ${fmtMoney(c.listed.ask)}</small></div></div>
      <div class="msgs"></div>
      <div class="offer"><button class="st o-m">${IC.minus}</button><b class="cur"></b><button class="st o-p">${IC.plus}</button><button class="btn primary b-off">${esc(t('offer'))}</button></div>
      <div class="m-btns"><button class="btn ad sm b-pers hidden">${IC.video}<span>${esc(t('persuade'))}</span></button><button class="btn primary b-deal"></button></div>`,
      {
        cls: 'chatm',
        onOpen: (m) => {
          draw(m);
          m.querySelector('.o-m').onclick = () => ((x = Math.max(B.offer, x - step)), audio.play('click'), draw(m));
          m.querySelector('.o-p').onclick = () => ((x += step), audio.play('click'), draw(m));
          m.querySelector('.b-off').onclick = () => {
            if (B.gone || deal) return;
            B.chat.push({ who: 'me', text: tr('meB', { p: fmtMoney(x) }) });
            audio.play('click');
            draw(m, true);
            setTimeout(() => {
              const a = buyerReply(B, x, this.r);
              if (a.kind === 'accept') {
                deal = a.price;
                B.offer = a.price;
                B.chat.push({ who: 'them', text: tr('okB') });
                audio.play('deal');
              } else if (a.kind === 'leave') {
                B.gone = true;
                B.chat.push({ who: 'them', text: tr('byeB') });
                audio.play('nope');
                this.buyers = this.buyers.filter((q) => q !== B);
              } else {
                B.chat.push({ who: 'them', text: tr(a.kind === 'insult' ? 'inB' : 'cnB', { p: fmtMoney(a.price) }) });
                audio.play('msg');
              }
              if (this.modal && this.modal.el === m.parentElement) draw(m);
            }, 700 + Math.random() * 500);
          };
          m.querySelector('.b-pers').onclick = () =>
            this.rewarded(() => {
              B.pat += 2;
              B.persuaded = true;
              B.offer = round500(Math.min(B.max, B.offer * 1.04));
              B.chat.push({ who: 'them', text: tr('cnB', { p: fmtMoney(B.offer) }) });
              draw(m);
            });
          m.querySelector('.b-deal').onclick = () => !B.gone && this.sellCar(deal ?? B.offer, B.type);
        },
        onClose: () => this.renderPanel(),
      },
    );
  }

  // ---------- продажа ----------
  listCar() {
    const c = this.s.car;
    audio.play('click');
    c.listed = { ask: this._ask };
    this.buyers = [];
    this.buyerT = 2.5;
    save.write();
    this.renderPanel();
  }
  sellCar(price, type) {
    const c = this.s.car;
    if (!c || this.busy) return;
    this.closeModal(true);
    const profit = price - c.bought - c.spent;
    const xp = xpFor(c, profit);
    const s = this.s;
    s.money += price;
    s.sold++;
    if (profit > 0) s.profit += profit;
    s.best = Math.max(s.best, profit);
    s.history.unshift({ m: c.model, p: profit, y: c.year });
    s.history = s.history.slice(0, 12);
    this.hudMoney(true);
    audio.play('cash');
    // машина уезжает
    const root = this.view.car.root;
    const wheels = this.view.car.wheels;
    let k = 0;
    audio.play('engine');
    const go = () => {
      k += 0.016;
      root.position.x += k * 0.45;
      for (const w of wheels) w.userData.spin.rotation.z -= k * 1.5;
      if (k < 1) requestAnimationFrame(go);
    };
    go();
    const view = this.view;
    s.car = null;
    this.view = null;
    this.buyers = [];
    this._ask = null;
    setTimeout(() => {
      this.g.setCar(null);
      view.dispose();
    }, 1400);
    this.submit();
    let gotXp = xp;
    this.openModal(
      `<div class="m-title">${IC.cash}<span>${esc(t('sold'))}</span></div>
      <div class="fin big"><div><small>${esc(t('soldFor'))}</small>${money(price)}</div><div><small>${esc(t('bought'))}</small>${money(c.bought)}</div><div><small>${esc(t('spent'))}</small>${money(c.spent)}</div><div class="${profit >= 0 ? 'pos' : 'neg'}"><small>${esc(t(profit >= 0 ? 'profit' : 'loss'))}</small>${money(profit)}</div></div>
      <div class="xpline">${IC.star}<b class="xpv">+${xp}</b><span>${esc(t('xp'))}</span></div>
      <div class="m-btns"><button class="btn ad b-x2">${IC.video}<span>${esc(t('bonusX2'))}</span></button><button class="btn primary b-ok">${esc(t('nice'))}</button></div>`,
      {
        noClose: true,
        onOpen: (m) => {
          m.querySelector('.b-x2').onclick = () =>
            this.rewarded(() => {
              m.querySelector('.b-x2').disabled = true;
              gotXp = xp * 2;
              m.querySelector('.xpv').textContent = '+' + gotXp;
              this.toast(t('doubled'), 'good');
            });
          m.querySelector('.b-ok').onclick = () => {
            audio.play('click');
            this.closeModal(true);
            this.addXp(gotXp);
            this.interstitial(() => {
              this.setTab('market');
            });
          };
        },
      },
    );
    if (s.tut.step >= 5 && s.tut.step < 6) this.tutNext(6);
    save.write();
  }
  addXp(n) {
    const s = this.s;
    s.xp += n;
    const was = s.lvl;
    while (s.lvl < MAX_LVL && s.xp >= xpNeed(s.lvl)) {
      s.xp -= xpNeed(s.lvl);
      s.lvl++;
    }
    this.hudLvl();
    save.write();
    if (s.lvl > was) this.openLevelUp(was, s.lvl);
  }
  openLevelUp(a, b) {
    audio.play('level');
    const cars = CARS.filter((c) => c.lvl > a && c.lvl <= b);
    const ups = UPGRADES.filter((u) => u.lvl > a && u.lvl <= b);
    this.openModal(
      `<div class="m-title">${IC.star}<span>${esc(t('levelUp'))}</span></div><div class="biglvl">${b}</div><p class="sub">${esc(t('lvlT')[Math.min(t('lvlT').length - 1, b)])}</p>
      ${cars.length || ups.length ? `<p class="sub">${esc(t('unlocked'))}</p><div class="unl">${cars.map((c) => `<span>${IC.car}${esc(t('m_' + c.id))}</span>`).join('')}${ups.map((u) => `<span>${IC.up}${esc(t('u_' + u.id))}</span>`).join('')}</div>` : ''}
      <div class="m-btns"><button class="btn primary b-ok">${esc(t('nice'))}</button></div>`,
      { onOpen: (m) => (m.querySelector('.b-ok').onclick = () => (audio.play('click'), this.closeModal())) },
    );
  }

  // ---------- улучшения ----------
  _upHTML() {
    const s = this.s;
    return `<div class="ph-head"><h2>${IC.up}${esc(t('upTitle'))}</h2></div><div class="ups">${UPGRADES.map((u) => {
      const cur = s.up[u.id] || 0;
      const lock = s.lvl < u.lvl;
      const max = cur >= u.max;
      return `<div class="upc ${lock ? 'lock' : ''}"><div class="ut"><b>${esc(t('u_' + u.id))}</b><small>${esc(t('ud_' + u.id))}</small><span class="pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < cur ? 'on' : ''}"></i>`).join('')}</span></div>${lock ? `<span class="lk">${IC.lock}${esc(t('upNeed', { n: u.lvl }))}</span>` : max ? `<span class="okl">${IC.check}${esc(t('upMax'))}</span>` : `<button class="btn sm ${s.money >= u.cost[cur] ? 'primary' : 'ghost'}" data-up="${u.id}">${money(u.cost[cur])}</button>`}</div>`;
    }).join('')}</div>`;
  }
  buyUpgrade(id) {
    const u = UP[id];
    const s = this.s;
    const cur = s.up[id] || 0;
    if (cur >= u.max || s.lvl < u.lvl) return;
    if (!this.spend(u.cost[cur])) return;
    s.up[id] = cur + 1;
    audio.play('buy');
    if (id === 'contacts') this._ensureMarket();
    save.write();
    this.renderPanel();
  }

  // ---------- рекорды ----------
  _recHTML() {
    const s = this.s;
    return `<div class="ph-head"><h2>${IC.trophy}${esc(t('recTitle'))}</h2></div>
      <div class="stats"><div><small>${esc(t('statSold'))}</small><b>${s.sold}</b></div><div><small>${esc(t('statProfit'))}</small>${money(s.profit)}</div><div><small>${esc(t('statBest'))}</small>${money(s.best)}</div></div>
      ${s.history.length ? `<h3>${esc(t('history'))}</h3><div class="hist">${s.history.map((h) => `<div class="hr"><span>${IC.car}${esc(t('m_' + h.m))} <small>${h.y}</small></span>${money(h.p, h.p >= 0 ? 'pos' : 'neg')}</div>`).join('')}</div>` : ''}
      <button class="btn primary b-lb">${IC.trophy}<span>${esc(t('leaderboard'))}</span></button>`;
  }
  submit() {
    sdk.submitScore(Math.round(this.s.profit));
  }
  async openLb() {
    const m = this.openModal(`<div class="m-title">${IC.trophy}<span>${esc(t('lbTitle'))}</span></div><p class="sub">${esc(t('lbSub'))}</p><div class="lb"><p class="sub">…</p></div>`, {});
    const res = await sdk.getLeaderboard();
    const box = m.querySelector('.lb');
    if (!box) return;
    if (!res.available) {
      box.innerHTML = `<p class="sub">${esc(t('lbEmpty'))}</p>`;
      return;
    }
    box.innerHTML =
      res.entries.map((e) => `<div class="lbr ${e.me ? 'me' : ''}"><b>${e.rank}</b><span>${esc(e.name || (e.me ? t('you') : '—'))}</span><em>${money(e.score)}</em></div>`).join('') +
      (res.authorized ? '' : `<p class="sub">${esc(t('lbLogin'))}</p><div class="m-btns"><button class="btn primary b-login">${esc(t('login'))}</button></div>`);
    const bl = box.querySelector('.b-login');
    if (bl)
      bl.onclick = async () => {
        if (await sdk.login()) {
          this.submit();
          this.closeModal(true);
          this.openLb();
        }
      };
  }

  // ---------- реклама ----------
  setGameplay() {
    sdk.gameplay(!this.modal && !document.hidden && !sdk.adActive);
  }
  rewarded(onReward) {
    audio.suspend('ad');
    sdk.showRewarded(onReward, () => {
      audio.resume('ad');
      this.setGameplay();
    });
  }
  interstitial(after) {
    if (this.s.noAds || Date.now() - this.lastAd < AD_GAP || this.s.sold < 2) return after && after();
    this.lastAd = Date.now();
    audio.suspend('ad');
    sdk.showInterstitial(() => {
      audio.resume('ad');
      this.setGameplay();
      after && after();
    });
  }

  // ---------- окна ----------
  openModal(html, o = {}) {
    this.closeModal(true);
    const m = document.createElement('div');
    m.className = 'mwrap';
    m.innerHTML = `<div class="mbox ${o.cls || ''}">${o.noClose ? '' : `<button class="mx" aria-label="close">${IC.close}</button>`}${html}</div>`;
    this.modalEl.appendChild(m);
    this.modal = { el: m, o };
    const x = m.querySelector('.mx');
    if (x) x.onclick = () => (audio.play('click'), this.closeModal());
    if (!o.noClose) m.addEventListener('pointerdown', (e) => e.target === m && this.closeModal());
    o.onOpen && o.onOpen(m.querySelector('.mbox'));
    this.setGameplay();
    return m;
  }
  closeModal(silent) {
    if (!this.modal) return;
    const { el, o } = this.modal;
    this.modal = null;
    el.remove();
    if (o.onClose) o.onClose(silent);
    this.setGameplay();
  }
  toast(msg, kind = '') {
    const d = document.createElement('div');
    d.className = 'toast ' + kind;
    d.textContent = msg;
    this.toastEl.appendChild(d);
    while (this.toastEl.children.length > 3) this.toastEl.firstChild.remove();
    setTimeout(() => d.classList.add('out'), 2000);
    setTimeout(() => d.remove(), 2500);
  }
  hintIn(m, text) {
    const h = document.createElement('div');
    h.className = 'inhint';
    h.textContent = text;
    // внутри окна над строкой с ценой: не уезжает за край экрана, когда окно растёт
    const at = m.querySelector('.offer');
    if (at) at.before(h);
    else m.prepend(h);
  }

  // ---------- обучение ----------
  tutNext(step) {
    this.s.tut.step = Math.max(this.s.tut.step || 0, step);
    save.write();
    this.tutHint();
  }
  tutHint() {
    const st = this.s.tut.step || 0;
    const el = this.ui.querySelector('.hint');
    let text = '';
    let glow = null;
    if (st === 0) (text = t('tut0')), (glow = '[data-tab="market"]');
    else if (st === 2 && this.s.car) (text = t('tut2')), (glow = '[data-tool="wash"]');
    else if (st === 3 && this.s.car) (text = t('tut3')), (glow = '[data-tool="body"]');
    else if (st === 4 && this.s.car) (text = t('tut4')), (glow = '[data-tool="body"]');
    else if (st === 5 && this.s.car) (text = t('tut5')), (glow = '[data-tool="sell"]');
    if (st === 2 && this.tool === 'wash') text = '';
    if (st === 0 && this.tab === 'market') text = '';
    el.textContent = text;
    el.classList.toggle('hidden', !text);
    this.ui.querySelectorAll('.glow').forEach((e) => e.classList.remove('glow'));
    if (glow && text) {
      const g = this.ui.querySelector(glow);
      if (g) g.classList.add('glow');
    }
  }
  openWelcome() {
    this.openModal(
      `<div class="m-title">${IC.garage}<span>${esc(t('welcome'))}</span></div><p class="sub big">${esc(t('welcomeText'))}</p><div class="m-btns"><button class="btn primary big b-ok">${esc(t('start'))}</button></div>`,
      {
        noClose: true,
        onOpen: (m) =>
          (m.querySelector('.b-ok').onclick = () => {
            audio.play('click');
            this.s.tut.welcome = 1;
            this.s.tut.step = this.s.tut.step || 0;
            save.write();
            this.closeModal();
            this.tutHint();
          }),
      },
    );
  }

  // ---------- подарок, магазин, настройки ----------
  openGift() {
    const s = this.s;
    const today = dayNum();
    if (s.gift.last === today) return;
    const streak = s.gift.last === today - 1 ? s.gift.streak + 1 : 1;
    const amount = round500(this.bestBase() * 0.06 * (1 + 0.25 * Math.min(streak - 1, 6)));
    this.openModal(
      `<div class="m-title">${IC.gift}<span>${esc(t('gift'))}</span></div><p class="sub">${esc(t('giftDay', { n: streak }))} · ${esc(t('giftText'))}</p><div class="biggift">${money(amount)}</div><div class="m-btns"><button class="btn primary b-take">${esc(t('giftTake'))}</button></div>`,
      {
        onOpen: (m) =>
          (m.querySelector('.b-take').onclick = () => {
            s.gift = { last: today, streak };
            this.addMoney(amount);
            audio.play('cash');
            this.closeModal();
            this.hudLvl();
          }),
      },
    );
  }
  openShop() {
    const render = (m) => {
      const items = iap.items();
      m.innerHTML = `<button class="mx" aria-label="close">${IC.close}</button><div class="m-title">${IC.bag}<span>${esc(t('shop'))}</span></div><div class="list">${
        items.length
          ? items.map((x) => `<div class="row"><div class="ui">${x.p.imageURI ? `<img src="${esc(x.p.imageURI)}" alt="">` : x.id === 'disable_ads' ? IC.video : IC.cash}</div><div class="rt"><b>${esc(x.p.title)}</b><small>${x.id.startsWith('cash') ? money(this.packSize(['cash_small', 'cash_medium', 'cash_large'].indexOf(x.id))) : esc(x.p.description)}</small></div>${x.owned ? `<span class="okl">${esc(t('ownedP'))}</span>` : `<button class="btn sm primary" data-iap="${esc(x.id)}">${priceHTML(x.p)}</button>`}</div>`).join('')
          : `<p class="empty">${esc(t('shopEmpty'))}</p>`
      }</div>`;
      m.querySelector('.mx').onclick = () => this.closeModal();
      m.querySelectorAll('[data-iap]').forEach(
        (b) =>
          (b.onclick = async () => {
            m.querySelectorAll('[data-iap]').forEach((q) => (q.disabled = true));
            await iap.buy(b.dataset.iap);
            if (this.modal) render(m);
          }),
      );
    };
    this.openModal('', { onOpen: render });
  }
  openSettings() {
    const s = this.s.settings;
    const render = (m) => {
      m.innerHTML = `<button class="mx" aria-label="close">${IC.close}</button><div class="m-title">${IC.gear}<span>${esc(t('settings'))}</span></div>
        ${slidersHTML(s, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}
        <div class="srow"><span>${esc(t('quality'))}</span><div class="seg">${['auto', 'low', 'high'].map((q) => `<button data-q="${q}" class="${s.quality === q ? 'on' : ''}">${esc(t('q_' + q))}</button>`).join('')}</div></div>
        <div class="m-btns"><button class="btn primary b-ok">${esc(t('ok'))}</button></div>`;
      m.querySelector('.mx').onclick = () => this.closeModal();
      m.querySelector('.b-ok').onclick = () => this.closeModal();
      bindSliders(m, s, () => save.write());
      m.querySelectorAll('[data-q]').forEach(
        (b) =>
          (b.onclick = () => {
            s.quality = b.dataset.q;
            const hi = s.quality !== 'low';
            const R = this.g.renderer;
            R.setPixelRatio(Math.min(devicePixelRatio || 1, hi ? (this.touch ? 1.5 : 2) : 1));
            R.shadowMap.enabled = hi;
            this.g.key.castShadow = hi;
            this.g.scene.traverse((o) => o.material && (o.material.needsUpdate = true));
            this.resize();
            save.write();
            render(m);
          }),
      );
    };
    this.openModal('', { onOpen: render });
  }
  persist() {
    save.write();
  }
  _css() {
    const st = document.createElement('style');
    st.textContent = volumeCss({ accent: '#ff8a1a', muted: '#7a8496', track: '#2a3040', thumb: '#fff' });
    document.head.appendChild(st);
  }
}
