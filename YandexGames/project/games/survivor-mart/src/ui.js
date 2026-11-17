// DOM-интерфейс: меню, HUD дня и ночи, касса с проверкой батареек, склад, верстак, итоги ночи, настройки, магазин, рекорды
import { IC } from './icons.js';
import { t, fmt, LANG } from './i18n.js';
const tr = t;
import { save } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { input } from './input.js';
import { iap, itemHTML } from './iap.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import { GOOD_IDS, MATS, RECIPES, GOODS, xpNeed, isHorde, isBoss, LOCS, Z_IDS, STORAGE, REG_SPOT, BENCH, COT, ENTRIES, FRONT_Z, WALL_T, SHELF_SLOTS } from './data.js';
import { itemThumb, staffThumb, zombieThumb } from './thumbs.js';
import { H0, H1, PRICE_MULT, hourTxt } from './world.js';
import { Board } from './board.js';
import { guideBody, guideTitle, guideChapters } from './guide.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const img = (src, cls = '') => (src ? `<img class="${cls}" src="${src}" alt="">` : `<i class="${cls} empty"></i>`);
const FREE_BAT = 120;
const today = () => new Date().toISOString().slice(0, 10);

export function repTier(r) {
  return r < 20 ? 0 : r < 40 ? 1 : r < 60 ? 2 : r < 80 ? 3 : 4;
}

// батарейка в стиле игры: номинал определяет размер
export function batSVG(v, st, charge) {
  const big = v >= 20 ? 'car' : v >= 10 ? '9v' : v >= 5 ? 'd' : v >= 2 ? 'c' : 'aa';
  const body = { aa: '#3a3a44', c: '#4a6ab8', d: '#c4544a', '9v': '#4aa86a', car: '#5a5a64' }[big];
  const cap = { aa: '#f2c84a', c: '#f2c84a', d: '#f2e04a', '9v': '#f4ead8', car: '#e84a3a' }[big];
  let shape;
  if (big === 'car') shape = `<rect x="6" y="18" width="52" height="38" rx="5" fill="${body}"/><rect x="12" y="11" width="9" height="8" fill="#c8ccd4"/><rect x="43" y="11" width="9" height="8" fill="#c8ccd4"/><rect x="6" y="18" width="52" height="10" fill="${cap}"/>`;
  else if (big === '9v') shape = `<rect x="14" y="14" width="36" height="44" rx="5" fill="${body}"/><rect x="20" y="7" width="8" height="8" rx="2" fill="#c8ccd4"/><rect x="36" y="7" width="8" height="8" rx="4" fill="#c8ccd4"/><rect x="14" y="14" width="36" height="12" fill="${cap}"/>`;
  else {
    const w = { aa: 22, c: 30, d: 36 }[big];
    const x = 32 - w / 2;
    shape = `<rect x="${x}" y="12" width="${w}" height="46" rx="5" fill="${body}"/><rect x="${x}" y="12" width="${w}" height="16" rx="5" fill="${cap}"/><rect x="${28}" y="6" width="8" height="7" rx="1.5" fill="#c8ccd4"/>`;
  }
  const lab = `<text x="32" y="48" text-anchor="middle" font-family="Nunito,Arial" font-weight="900" font-size="14" fill="#fff" stroke="#2a2430" stroke-width="3" paint-order="stroke">${v}</text>`;
  return `<svg viewBox="0 0 64 64" stroke="#2a2430" stroke-width="3" stroke-linejoin="round">${shape}${lab}</svg>`;
}

export class UI {
  constructor(game, root) {
    this.g = game;
    this.root = root;
    this.modalOpen = false;
    this.screen = '';
    this.board = new Board(this);
    const st = document.createElement('style');
    st.textContent = volumeCss({ accent: '#4aa86a', track: '#a88a5a', thumb: '#fff8e8', muted: '#7a6248' });
    document.head.appendChild(st);
    root.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) {
        audio.unlock();
        audio.play('click');
      }
    });
  }

  // ---------- общие элементы ----------
  chips(store = true) {
    const s = save.data;
    return `<div class="chip bat ${store ? 'tap' : ''}" ${store ? 'data-a="store"' : ''}>${IC.bat}<b id="cbat">${fmt(s.bat)}</b>${store ? '<i class="plus">+</i>' : ''}</div>
      <div class="chip rep" title="${esc(t('rep'))}">${IC.rep}<b id="crep">${Math.round(s.rep)}</b><small id="creptier">${esc(t('tier' + repTier(s.rep)))}</small></div>
      <div class="chip lvl">${IC.star}<b id="clvl">${s.lvl}</b><span class="xpbar"><i id="cxp" style="width:${(s.xp / xpNeed(s.lvl)) * 100}%"></i></span></div>`;
  }

  set(html, screen) {
    this.closeModal();
    this.screen = screen;
    this.el = null;
    this.root.innerHTML = `<div class="layer ${screen}">${html}</div><div class="floats" id="floats"></div>`;
    this.bind(this.root);
  }

  bind(root) {
    root.querySelectorAll('[data-a]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.action(el.dataset.a, el);
      });
    });
  }

  action(a, el) {
    switch (a) {
      case 'play':
        this.g.play();
        break;
      case 'settings':
        this.settings(false);
        break;
      case 'lb':
        this.leaderboard();
        break;
      case 'store':
        this.store();
        break;
      case 'gift':
        this.daily();
        break;
      case 'guide':
        if (this.screen === 'board') {
          save.data.tut.b_guide = 1;
          save.write();
          this.guide(() => this.board.render());
        } else this.guide();
        break;
    }
  }

  refresh() {
    const s = save.data;
    const q = (id) => document.getElementById(id);
    if (q('cbat')) q('cbat').textContent = fmt(s.bat);
    if (q('crep')) q('crep').textContent = Math.round(s.rep);
    if (q('creptier')) q('creptier').textContent = t('tier' + repTier(s.rep));
    if (q('clvl')) q('clvl').textContent = s.lvl;
    if (q('cxp')) q('cxp').style.width = (s.xp / xpNeed(s.lvl)) * 100 + '%';
    if (this.modalOpen) return;
    if (this.screen === 'menu') this.menu();
    else if (this.screen === 'board') this.board.render();
  }

  toast(text) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = text;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2400);
  }

  // ---------- главное меню ----------
  menu() {
    const s = save.data;
    const giftReady = s.daily.day !== today();
    const started = s.day > 1 || s.stats.served > 0;
    this.set(
      `<div class="topbar"><div class="tb-l">${this.chips()}</div><div class="tb-r"><button class="btn round small" data-a="guide" title="${esc(guideTitle())}">${IC.book}</button><button class="btn round small" data-a="settings">${IC.gear}</button></div></div>
      <div class="menu-c">
        <div class="logo"><div class="logo-in"><div class="logo-t">${esc(t('title'))}</div><div class="logo-sub">${esc(t('subtitle'))}</div><i class="logo-b">${IC.bat}</i><i class="logo-z">${IC.zombie}</i></div></div>
        <div class="spacer"></div>
        <button class="btn big play" data-a="play">${IC.play}<span>${esc(started ? t('continueDay', { n: s.day }) : t('play'))}</span></button>
        <div class="row small-row">
          <button class="btn round" data-a="lb" title="${esc(t('leaderboard'))}">${IC.trophy}</button>
          <button class="btn round" data-a="store" title="${esc(t('store'))}">${IC.shop}</button>
          <button class="btn round gift ${giftReady ? 'ready' : ''}" data-a="gift" title="${esc(t('daily'))}">${IC.gift}</button>
        </div>
      </div>`,
      'menu'
    );
    if (giftReady && !this._giftShown && s.stats.days > 0) {
      this._giftShown = true;
      setTimeout(() => this.screen === 'menu' && !this.modalOpen && this.daily(), 600);
    }
  }

  // ---------- модальные окна ----------
  modal(title, body, onClose, cls = '') {
    this.closeModal();
    const m = document.createElement('div');
    m.className = 'modal ' + cls;
    m.innerHTML = `<div class="mpanel"><div class="mhead"><b>${esc(title)}</b>${onClose !== false ? `<button class="btn round small mx">${IC.close}</button>` : ''}</div><div class="mbody">${body}</div></div>`;
    document.body.appendChild(m);
    this.modalOpen = true;
    const close = () => {
      this.closeModal();
      onClose && onClose();
    };
    m._close = close;
    const x = m.querySelector('.mx');
    if (x) x.onclick = close;
    m.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) {
        audio.unlock();
        audio.play('click');
      }
      // тап мимо нижней шторки закрывает её
      if (cls.includes('sheet') && e.target === m && onClose !== false) close();
      e.stopPropagation();
    });
    this._modal = m;
    return m;
  }

  closeModal() {
    if (this._modal) this._modal.remove();
    this._modal = null;
    this.modalOpen = false;
  }

  confirm(title, text, yes, onYes) {
    const m = this.modal(title, `<div class="itask">${esc(text)}</div><div class="row"><button class="btn mid" data-n="1">${esc(t('no'))}</button><button class="btn mid red" data-y="1">${esc(yes)}</button></div>`, () => {});
    m.querySelector('[data-n]').onclick = () => this.closeModal();
    m.querySelector('[data-y]').onclick = () => {
      this.closeModal();
      onYes();
    };
  }

  settings(inGame) {
    const s = save.data;
    const q = s.settings.quality || 'auto';
    const qs = ['high', 'mid', 'low'].map((k) => `<button class="seg ${q === k || (q === 'auto' && this.g.quality === k) ? 'on' : ''}" data-q="${k}">${esc(t('q' + k))}</button>`).join('');
    const m = this.modal(
      t('settings'),
      `${slidersHTML(s.settings, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}
      <div class="qrow"><span>${esc(t('quality'))}</span><div class="segs">${qs}</div></div>
      <div class="ctrl"><b>${esc(t('howTo'))}</b><small>${esc(t('howToTxt'))}</small><small>${esc(input.isTouch ? t('ctrlTouch') : t('ctrlKeys'))}</small></div>
      <button class="btn mid" data-guide="1">${IC.book}${esc(guideTitle())}</button>
      <button class="btn mid blue" data-tut="1">${IC.star}${esc(t('tutAgain'))}</button>
      ${inGame ? '' : `<button class="btn mid red" data-new="1">${esc(t('newGame'))}</button>`}`,
      () => {
        save.write();
        if (inGame) this.pause();
      }
    );
    bindSliders(m, s.settings, () => save.write());
    m.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => {
      this.g.setQuality(b.dataset.q);
      m.querySelectorAll('[data-q]').forEach((x) => x.classList.toggle('on', x === b));
    }));
    m.querySelector('[data-guide]').onclick = () => this.guide(() => this.settings(inGame));
    m.querySelector('[data-tut]').onclick = () => {
      const z = Object.fromEntries(Object.entries(s.tut).filter(([k]) => k.startsWith('z_')));
      s.tut = z;
      save.write();
      this.toast(t('tutAgainOk'));
    };
    const nb = m.querySelector('[data-new]');
    if (nb)
      nb.onclick = () =>
        this.confirm(t('newGame'), t('newGameQ'), t('newGameYes'), () => {
          save.reset();
          this.g.buildMenuScene(true);
          this.menu();
        });
  }

  async leaderboard() {
    const m = this.modal(t('leaderboard'), `<div class="muted lbnote">${esc(t('lbNote'))}</div><div class="lb"><div class="muted">${esc(t('loading'))}</div></div>`);
    const res = await sdk.getLeaderboard();
    const box = m.querySelector('.lb');
    if (!box || this._modal !== m) return;
    if (!res.available) {
      box.innerHTML = `<div class="muted">${esc(t('lbOffline'))}</div><div class="lbrow me"><b>—</b><span>${esc(t('you'))}</span><i>${fmt(save.data.earned)}</i></div>`;
      return;
    }
    let html = res.entries.length
      ? res.entries.map((e) => `<div class="lbrow ${e.me ? 'me' : ''}"><b>${e.rank}</b><span>${esc(e.name || t('anon'))}</span><i>${fmt(e.score)}</i></div>`).join('')
      : `<div class="muted">${esc(t('lbEmpty'))}</div>`;
    if (!res.authorized) html += `<div class="lblogin"><span>${esc(t('lbLogin'))}</span><button class="btn mid green" data-login="1">${esc(t('lbLoginBtn'))}</button></div>`;
    box.innerHTML = html;
    const lg = box.querySelector('[data-login]');
    if (lg)
      lg.onclick = async () => {
        if (await sdk.login()) {
          await sdk.submitScore(save.data.earned);
          this.leaderboard();
        }
      };
  }

  store(onClose) {
    const s = save.data;
    const freeReady = Date.now() - (s.freeAdAt || 0) > 180000;
    const items = iap.items();
    const list = items.length ? `<div class="iap-box">${items.map((x) => itemHTML(x, { owned: t('iapOwned') })).join('')}</div>` : `<div class="muted">${esc(t('iapEmpty'))}</div>`;
    const m = this.modal(
      t('store'),
      `<div class="free ${freeReady ? '' : 'off'}">${IC.bat}<div><b>${esc(t('freeBat'))}</b><small>${esc(t('freeBatSub', { n: FREE_BAT }))}</small></div><button class="btn mid green" data-free="1" ${freeReady ? '' : 'disabled'}>${IC.ad}${esc(t('watchAd'))}</button></div>${list}`,
      () => {
        this.refresh();
        onClose && onClose();
      }
    );
    const f = m.querySelector('[data-free]');
    if (f)
      f.onclick = () => {
        f.disabled = true;
        this.g.rewarded(() => {
          s.bat += FREE_BAT;
          s.freeAdAt = Date.now();
          save.write();
          audio.play('coin');
          this.toast('+' + FREE_BAT);
          if (this._modal === m) this.store(onClose);
        });
      };
    m.querySelectorAll('.iap-buy[data-id]').forEach((b) => (b.onclick = async () => {
      m.querySelectorAll('.iap-buy').forEach((e) => (e.disabled = true));
      const ok = await iap.buy(b.dataset.id);
      if (ok) audio.play('buy');
      if (this._modal === m) this.store(onClose);
    }));
  }

  daily() {
    const s = save.data;
    if (s.daily.day === today()) return this.toast(t('dailyDone'));
    const amount = 80 + Math.min(6, s.daily.streak || 0) * 20;
    const take = (mult) => {
      if (s.daily.day === today()) return;
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      s.daily.streak = s.daily.day === y ? (s.daily.streak || 0) + 1 : 1;
      s.daily.day = today();
      s.bat += amount * mult;
      save.write();
      audio.play('coin');
      this.closeModal();
      this.toast('+' + amount * mult);
      this.refresh();
    };
    const m = this.modal(
      t('daily'),
      `<div class="gift-big">${IC.gift}</div><div class="gamount">${IC.bat}<b>${fmt(amount)}</b></div><small class="muted">${esc(t('dailySub'))}</small>
      <div class="row"><button class="btn mid green" data-take="1">${esc(t('take'))}</button><button class="btn mid blue" data-x3="1">${IC.ad}${esc(t('takeX3'))}</button></div>`,
      () => this.refresh()
    );
    m.querySelector('[data-take]').onclick = () => take(1);
    m.querySelector('[data-x3]').onclick = () => this.g.rewarded(() => take(3));
  }

  // ---------- HUD ----------
  hud() {
    const touch = input.isTouch;
    const w = this.g.w;
    this.set(
      `<div class="hud ${touch ? 'touch' : ''}">
        <div class="h-tl">
          <div class="chiprow">${this.chips(false)}</div>
          <div class="hprow"><div class="hpbar" id="hhp"><i id="hhpf"></i><span>${IC.heart}</span></div>
          <button class="healbtn" id="bheal" title="${esc(t('healBtn'))}">${IC.medkit}<b id="bhealn">0</b>${touch ? '' : '<kbd>H</kbd>'}</button></div>
          <div class="carry" id="hcarry"></div>
          <div class="craftq" id="hcraft"></div>
        </div>
        <div class="h-tc">
          <div class="clock" id="hclock"><span id="hcicon">${IC.sun}</span><div><small id="hday">${esc(t('dayN', { n: w.day }))}</small><b id="htime">8:00</b></div></div>
          <div class="wavebar" id="hwave"></div>
        </div>
        <div class="h-tr">
          <button class="btn round small" id="hpause">${IC.pause}</button>
        </div>
        <div class="tutbox" id="htut"></div>
        <div class="sleepov" id="hsleep"><div class="sleepc"><div class="zzz">Z<i>z</i><i>z</i></div><b id="hsleept"></b><small>${esc(t('sleepSub'))}</small><button class="btn mid" id="bwake">${IC.sun}${esc(t('wakeUp'))}</button></div></div>
        <div class="banner-box" id="hbanner"></div>
        <div class="hint" id="hhint"></div>
        <div class="co" id="hco"></div>
        <div class="offarrow" id="harrow"><span id="harrowi">${IC.register}</span><i></i></div>
        ${
          touch
            ? `<div class="jzone" id="jzone"><div class="jbase" id="jbase"><div class="jknob" id="jknob"></div></div></div>
        <button class="actbtn" id="bact"><span id="bacti">${IC.hand}</span><small id="bactl"></small></button>`
            : `<div class="keys-hint">${esc(t('keysShort'))}</div><div class="actkey" id="bact"><span id="bacti">${IC.hand}</span><small id="bactl"></small></div>`
        }
      </div>`,
      'hud'
    );
    const R = this.root;
    if (touch) {
      input.bindJoy(R.querySelector('#jzone'), R.querySelector('#jbase'), R.querySelector('#jknob'));
      input.bindAct(R.querySelector('#bact'));
    } else R.querySelector('#bact').onclick = () => (input.actTap = true);
    R.querySelector('#hpause').onclick = () => this.pause();
    const hb = R.querySelector('#bheal');
    hb.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      input.healTap = true;
    });
    R.querySelector('#bwake').onclick = () => this.g.w && this.g.w.wake('self');
    const q = (id) => R.querySelector('#' + id);
    this.el = {
      hp: q('hhp'), hpf: q('hhpf'), carry: q('hcarry'), craft: q('hcraft'), clock: q('hclock'), cicon: q('hcicon'), day: q('hday'), time: q('htime'), wave: q('hwave'),
      hint: q('hhint'), co: q('hco'), act: q('bact'), acti: q('bacti'), actl: q('bactl'), floats: q('floats'), arrow: q('harrow'), arrowi: q('harrowi'),
      heal: q('bheal'), healn: q('bhealn'), tut: q('htut'), sleep: q('hsleep'), sleept: q('hsleept'),
    };
    this.coSig = '';
    this.tut = { t: 0 };
    this.hint('');
  }

  banner(text, big, sub) {
    const b = this.root.querySelector('#hbanner');
    if (!b) return;
    b.innerHTML = `<div class="banner ${big ? 'bb' : ''}">${esc(text)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
    clearTimeout(this._bt);
    this._bt = setTimeout(() => (b.innerHTML = ''), 2300);
  }

  hint(text) {
    const h = this.el && this.el.hint;
    if (!h) return;
    if (h._t === text) return;
    h._t = text;
    h.textContent = text;
    h.classList.toggle('on', !!text);
  }

  float(x, y, z, text, cls = '') {
    const g = this.g;
    if (!g.view || !this.el) return;
    const [sx, sy, ok] = g.view.toScreen(g.camera, x, y, z, g.w_, g.h_);
    if (!ok) return;
    const d = document.createElement('div');
    d.className = 'fl ' + cls;
    d.innerHTML = text;
    d.style.left = sx + 'px';
    d.style.top = sy + 'px';
    this.el.floats.appendChild(d);
    setTimeout(() => d.remove(), 1300);
  }

  gotHTML(got) {
    return Object.entries(got)
      .map(([k, n]) => `<span class="gi">${k === 'bat' ? IC.bat : img(itemThumb(k))}+${n}</span>`)
      .join('');
  }

  onFx(e, w) {
    if (this.screen !== 'hud') return;
    switch (e.t) {
      case 'ui':
        if (e.what === 'storage') this.storage();
        if (e.what === 'bench') {
          this._benchSeen = 1;
          this.bench();
        }
        break;
      case 'loot':
        this.float(e.x, 2.2, e.z, this.gotHTML(e.got), 'good items');
        break;
      case 'sale':
        this.float(e.x, 2.2, e.z, `+${e.n} ${IC.bat}`, 'bank');
        if (e.tip) setTimeout(() => this.float(e.x, 2.9, e.z, t('tip') + ' +' + e.tip, 'bonus'), 300);
        break;
      case 'scammed':
        this.float(5.6, 2.6, -6.6, t('scammed', { n: e.n }), 'bad');
        this.toast(t('scammedTip'));
        break;
      case 'need':
        this.toast(t('need_' + e.what));
        audio.play('deny');
        break;
      case 'crafted':
        this.float(e.x, 2.0, e.z, this.gotHTML({ [e.id]: e.n }), 'good items');
        break;
      case 'scavBack':
        this.toast(t(e.hurt ? 'scavHurt' : 'scavBack', { n: e.name }));
        this.float(e.x, 2.4, e.z, this.gotHTML(e.got), 'good items');
        break;
      case 'lvl':
        this.banner(t('lvlUp', { n: e.n }), false, t('lvlUpSub'));
        break;
      case 'closing':
        this.banner(t('closing'));
        break;
      case 'dusk':
        this.banner(t('duskT'), true, t('duskSub'));
        break;
      case 'night':
        this.banner(e.boss ? t('bossNight') : e.horde ? t('hordeNight') : t('nightT'), true, e.horde ? t('hordeSub') : t('nightSub'));
        break;
      case 'wave':
        if (e.of > 1) this.banner(t('waveN', { n: e.n, of: e.of }));
        break;
      case 'barBreak':
        this.banner(t('barBreak'));
        break;
      case 'hurt':
        this.float(e.x, 2.2, e.z, '-' + Math.round(e.n), 'bad');
        break;
      case 'zhit':
        if (e.n >= 20) this.float(e.x, 2.0, e.z, e.n, 'dmg');
        break;
      case 'staffKo':
        this.toast(t('staffKo', { n: e.name }));
        break;
      case 'ko':
        setTimeout(() => this.ko(), 700);
        break;
      case 'gift':
        this.float(e.x, 2.4, e.z, t('thanks'), 'bonus');
        break;
      case 'trap':
        this.float(e.x, 1.4, e.z, t('snap'), 'warn');
        break;
      case 'dayZombie':
        this.banner(t('dayZ'), false, t('dayZSub'));
        break;
      case 'dawnSoon':
        this.toast(t('dawnSoon'));
        break;
      case 'wake':
        if (e.why !== 'self') this.banner(t('wake_' + e.why), false, t('wakeSub'));
        break;
      case 'heal':
        this.float(e.x, 2.2, e.z, '+' + e.n + ' ' + IC.heart, 'good');
        break;
      case 'steal':
        this.float(e.x, 2.2, e.z, `-1 ${img(itemThumb(e.type))}`, 'bad items');
        this.toast(t('stealT'));
        break;
      case 'thief':
        this.float(e.x, 2.3, e.z, t('thiefT'), 'warn');
        break;
      case 'thiefGone':
        this.toast(t('thiefGone', { n: e.n }));
        break;
      case 'recovered':
        this.float(e.x, 2.2, e.z, `+${e.n} ${img(itemThumb(e.type))}`, 'good items');
        break;
      case 'zscream':
        this.float(e.x, 2.4, e.z, '!!', 'warn');
        break;
    }
  }

  hudUpdate(w, v) {
    const e = this.el;
    if (this.screen !== 'hud' || !e) return;
    const s = save.data;
    const P = w.P;
    // часы
    const night = w.phase === 'night' || w.phase === 'dawn';
    const tl = hourTxt(w.phase === 'dawn' ? 30 : w.hour);
    if (e._t !== tl) {
      e._t = tl;
      e.time.textContent = tl;
      e.cicon.innerHTML = night || w.hour >= 19.5 ? IC.moon : IC.sun;
      e.clock.classList.toggle('late', (!night && w.hour >= H1 - 1) || (night && w.hour >= 29));
      e.day.textContent = night ? t('nightN', { n: w.day }) : t('dayN', { n: w.day });
    }
    // зомби рядом и в лавке
    const alive = w.zs.filter((z) => !z.dead);
    const inside = alive.filter((z) => w.inside(z.x, z.z)).length;
    const showW = night || alive.length > 0;
    const ws = showW ? `${alive.length}:${inside}:${w.wave}` : '';
    if (e._w !== ws) {
      e._w = ws;
      e.wave.innerHTML = showW ? `${IC.zombie}<b>${alive.length}</b>${inside ? `<small class="in">${esc(t('zInside', { n: inside }))}</small>` : w.waves > 1 && night ? `<small>${esc(t('waveShort', { n: Math.max(1, w.wave), of: w.waves }))}</small>` : ''}` : '';
      e.wave.classList.toggle('on', showW);
      e.wave.classList.toggle('alarm', inside > 0);
    }
    // аптечка
    const nh = (s.stock.bandage || 0) + (s.stock.medkit || 0);
    const hs = nh + ':' + (P.hp < P.max ? 1 : 0) + (night ? 1 : 0);
    if (e._h !== hs) {
      e._h = hs;
      e.healn.textContent = nh;
      e.heal.classList.toggle('on', P.hp < P.max || night);
      e.heal.classList.toggle('zero', nh === 0);
    }
    // сон
    if (w.sleeping) e.sleept.textContent = hourTxt(w.hour);
    if (e._sl !== w.sleeping) {
      e._sl = w.sleeping;
      e.sleep.classList.toggle('on', w.sleeping);
    }
    // деньги, репутация, уровень
    const sig = s.bat + ':' + Math.round(s.rep) + ':' + s.lvl + ':' + s.xp;
    if (e._s !== sig) {
      e._s = sig;
      this.refresh();
    }
    // здоровье
    const hpk = P.hp / P.max;
    if (e._hp !== Math.round(hpk * 100)) {
      e._hp = Math.round(hpk * 100);
      e.hpf.style.width = hpk * 100 + '%';
      e.hp.classList.toggle('low', hpk < 0.35);
      e.hp.classList.toggle('on', hpk < 0.999 || night);
    }
    // ноша
    const cs = P.hand ? P.hand.type + P.hand.n : '';
    if (e._c !== cs) {
      e._c = cs;
      e.carry.innerHTML = P.hand ? `${img(itemThumb(P.hand.type))}<b>×${P.hand.n}</b><small>${esc(t('it_' + P.hand.type))}</small>` : '';
      e.carry.classList.toggle('on', !!P.hand);
    }
    // очередь верстака
    const q = s.crafting;
    const qs = q.length ? q.map((c) => c.id).join(',') + ':' + Math.ceil(q[0].left) : '';
    if (e._q !== qs) {
      e._q = qs;
      const R = q.length && RECIPES.find((r) => r.id === q[0].id);
      e.craft.innerHTML = q.length ? `${IC.bench}${q.map((c, k) => `<span class="cq ${k ? '' : 'cur'}">${img(itemThumb(c.id))}${k ? '' : `<i style="width:${(1 - q[0].left / R.time) * 100}%"></i>`}</span>`).join('')}` : '';
      e.craft.classList.toggle('on', q.length > 0);
    }
    // кнопка действия
    const n = P.near;
    const A = n ? this.actInfo(n, w) : null;
    const as = A ? A.ic + A.l : '';
    if (e._a !== as) {
      e._a = as;
      e.act.classList.toggle('on', !!A);
      if (A) {
        e.acti.innerHTML = IC[A.ic];
        e.actl.textContent = A.l;
      }
    }
    if (P.act && P.act.kind === 'loot') e.act.style.setProperty('--p', P.act.t / P.act.dur);
    else e.act.style.setProperty('--p', 0);
    this.checkout(w);
    this.offArrow(w, v);
    this.tutorial(w);
  }

  actInfo(n, w) {
    const P = w.P;
    switch (n.kind) {
      case 'storage':
        return { ic: 'box', l: P.hand ? t('a_store2') : t('a_store') };
      case 'bench':
        return { ic: 'bench', l: t('a_bench') };
      case 'shelf': {
        const sh = w.shelves[n.ref];
        if (P.hand) return { ic: 'shelf', l: t('a_put') };
        return sh.n > 0 ? { ic: 'hand', l: t('a_takeBack') } : { ic: 'shelf', l: t('a_shelfEmpty') };
      }
      case 'loot':
        return { ic: 'search', l: t('a_loot') };
      case 'cot':
        return { ic: 'bed', l: t('a_sleep') };
      case 'repair':
        return { ic: 'plank', l: t('a_repair', { n: save.data.stock.wood }) };
      case 'trap':
        return { ic: 'trap', l: t('a_trap', { n: save.data.stock.trap }) };
    }
    return null;
  }

  // стрелка к кассе, если в очереди ждут, а касса за краем экрана
  offArrow(w, v) {
    const e = this.el;
    const g = this.g;
    const waiting = w.phase !== 'night' && w.queue.length > 0 && !w.P.atReg && !w.staff.some((s) => s.s.role === 'cashier' && s.state === 'reg');
    // цель обучения важнее кассы
    const tg = this.tutPos || (waiting ? { x: 5.6, z: -7.6, ic: 'register' } : null);
    let show = false;
    if (tg) {
      const ic = tg.ic || 'star';
      if (e._ai !== ic) {
        e._ai = ic;
        e.arrowi.innerHTML = IC[ic] || IC.star;
      }
      const [sx, sy, ok] = v.toScreen(g.camera, tg.x, 1.2, tg.z, g.w_, g.h_);
      const off = !ok || sx < 30 || sy < 70 || sx > g.w_ - 30 || sy > g.h_ - 40;
      if (off) {
        show = true;
        // стрелка ходит по рамке ниже часов и плашки обучения, выше нижних кнопок
        const tc = this.root.querySelector('.h-tc');
        let top = tc ? tc.getBoundingClientRect().bottom + 36 : 110;
        if (e.tut.classList.contains('on')) top = Math.max(top, e.tut.getBoundingClientRect().bottom + 36);
        const bot = g.h_ - (input.isTouch ? 150 : 70);
        const cx = g.w_ / 2,
          cy = (top + bot) / 2;
        let dx = sx - cx,
          dy = sy - cy;
        if (!ok) (dx = -dx), (dy = -dy);
        const a = Math.atan2(dy, dx);
        const rx = g.w_ / 2 - 46,
          ry = Math.max(20, (bot - top) / 2);
        const k = Math.min(rx / Math.abs(Math.cos(a) || 1e-6), ry / Math.abs(Math.sin(a) || 1e-6));
        e.arrow.style.transform = `translate(${cx + Math.cos(a) * k}px,${cy + Math.sin(a) * k}px)`;
        e.arrow.querySelector('i').style.transform = `rotate(${a}rad)`;
      }
    }
    e.arrow.classList.toggle('on', show);
  }

  // ---------- касса ----------
  checkout(w) {
    const e = this.el;
    const co = w.co;
    const show = co && w.P.atReg && !w.P.ko;
    const sig = show ? co.c.id + ':' + co.bats.map((b) => b.st + (b.swapped ? 's' : '')).join('') + ':' + co.testing : '';
    if (sig === this.coSig) return;
    this.coSig = sig;
    if (!show) {
      e.co.classList.remove('on');
      e.co.innerHTML = '';
      return;
    }
    const items = co.items.map((it) => `<span class="coit">${img(itemThumb(it.type))}<b>${it.price}</b></span>`).join('');
    let body;
    if (co.needy) {
      body = `<div class="cotxt">${esc(t('needyTxt'))}</div>
        <div class="row"><button class="btn mid green" data-co="gift">${IC.heart}${esc(t('giveFree'))}</button><button class="btn mid" data-co="refuse">${esc(t('refuse'))}</button></div>`;
    } else {
      const bats = co.bats
        .map((b, k) => {
          const st = co.testing === k ? 'testing' : b.st;
          const lab = st === 'ok' ? `<em class="ok">${Math.round(b.charge * 100)}%</em>` : st === 'bad' ? `<em class="bad">${Math.round(b.charge * 100)}%</em>` : st === 'testing' ? '<em class="scan"></em>' : '<em>?</em>';
          const tell = w.pk.tell && b.dead && b.st === '?' ? 'tell' : '';
          return `<button class="cobat ${st} ${tell} ${b.swapped ? 'swapped' : ''}" data-b="${k}">${batSVG(b.v)}${lab}${st === 'bad' ? `<i class="ret">${esc(t('giveBack'))}</i>` : ''}</button>`;
        })
        .join('');
      const anyBad = co.bats.some((b) => b.st === 'bad');
      const unchecked = co.bats.some((b) => b.st === '?');
      body = `<div class="cobats">${bats}</div>
        <div class="cotip">${esc(anyBad ? t('coBad') : unchecked ? t('coTest') : t('coAllOk'))}</div>
        <button class="btn mid green coacc" data-co="acc" ${anyBad || co.testing >= 0 ? 'disabled' : ''}>${IC.check}${esc(t('accept'))} <b>${co.total}</b>${IC.bat}</button>`;
    }
    e.co.innerHTML = `<div class="cohead"><span>${img(staffThumb('cust', co.c.look), 'cofc')}</span><div class="coits">${items}</div><div class="cotot">${IC.bat}<b>${co.total}</b></div></div>${body}`;
    e.co.classList.add('on');
    e.co.querySelectorAll('[data-b]').forEach((b) =>
      b.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const k = +b.dataset.b;
        const bt = co.bats[k];
        if (bt.st === '?') w.testBattery(k);
        else if (bt.st === 'bad') w.rejectBattery(k);
      })
    );
    e.co.querySelectorAll('[data-co]').forEach((b) =>
      b.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        audio.play('click');
        const a = b.dataset.co;
        if (a === 'acc') w.acceptPay();
        if (a === 'gift') w.giftNeedy();
        if (a === 'refuse') w.refuseNeedy();
      })
    );
  }

  // ---------- склад ----------
  storage() {
    const w = this.g.w;
    if (!w) return;
    const s = save.data;
    const P = w.P;
    const goods = GOOD_IDS.filter((id) => s.stock[id] > 0);
    const cells = goods.length
      ? goods.map((id) => `<button class="scell" data-take="${id}">${img(itemThumb(id))}<b>${s.stock[id]}</b><small>${esc(t('it_' + id))}</small></button>`).join('')
      : `<div class="muted">${esc(t('storeEmpty'))}</div>`;
    const mats = [...MATS, 'trap'].map((id) => `<span class="mcell ${s.stock[id] ? '' : 'zero'}">${img(itemThumb(id))}<b>${s.stock[id]}</b></span>`).join('');
    const m = this.modal(
      t('storage'),
      `${P.hand ? `<button class="btn mid blue" data-ret="1">${img(itemThumb(P.hand.type), 'bi')}${esc(t('returnHand', { n: P.hand.n }))}</button>` : ''}
      <div class="sgrid">${cells}</div>
      <div class="ihead">${esc(t('materials'))}</div><div class="mrow">${mats}</div>`,
      () => {},
      'sheet'
    );
    m.querySelectorAll('[data-take]').forEach((b) => (b.onclick = () => {
      w.takeFromStorage(b.dataset.take);
      this.closeModal();
      audio.play('pick');
    }));
    const r = m.querySelector('[data-ret]');
    if (r)
      r.onclick = () => {
        w.returnHand();
        this.storage();
      };
  }

  // ---------- верстак ----------
  bench() {
    const w = this.g.w;
    if (!w) return;
    const s = save.data;
    const lvl = s.build.bench;
    const rows = RECIPES.map((R) => {
      const open = R.lvl <= lvl;
      const ins = Object.entries(R.in)
        .map(([k, n]) => `<span class="rin ${s.stock[k] >= n ? '' : 'lack'}">${img(itemThumb(k))}<b>${s.stock[k]}/${n}</b></span>`)
        .join('');
      const can = open && Object.entries(R.in).every(([k, n]) => s.stock[k] >= n) && s.crafting.length < 4;
      return `<div class="rrow ${open ? '' : 'locked'}"><div class="rout">${img(itemThumb(R.id))}${R.out > 1 ? `<i>×${R.out}</i>` : ''}</div>
        <div class="rtx"><b>${esc(t('it_' + R.id))}</b><div class="rins">${open ? ins : `<small>${IC.lock}${esc(t('benchNeed', { n: R.lvl + 1 }))}</small>`}</div></div>
        ${open ? `<button class="btn mid green" data-cr="${R.id}" ${can ? '' : 'disabled'}>${IC.hammer}<small>${Math.ceil(R.time / w.pk.craftSp)}${esc(t('sec'))}</small></button>` : ''}</div>`;
    }).join('');
    const queue = s.crafting.length ? `<div class="bq">${s.crafting.map((c) => img(itemThumb(c.id))).join('')}<small>${esc(t('queue', { n: s.crafting.length }))}</small></div>` : '';
    const m = this.modal(t('benchT', { n: lvl + 1 }), `${queue}<div class="rlist">${rows}</div>`, () => {}, 'sheet bench');
    m.querySelectorAll('[data-cr]').forEach((b) => (b.onclick = () => {
      if (w.craft(b.dataset.cr)) audio.play('craft');
      const sc = m.querySelector('.rlist').scrollTop;
      this.bench();
      const nl = this._modal && this._modal.querySelector('.rlist');
      if (nl) nl.scrollTop = sc;
    }));
  }

  // ---------- обучение: шаги с указателями ----------
  tutSteps() {
    const near = (w, list) => {
      const P = w.P;
      let best = null,
        bd = 1e9;
      for (const p of list) {
        const d = Math.hypot(p.x - P.x, p.z - P.z);
        if (d < bd) (bd = d), (best = p);
      }
      return best;
    };
    const spotsLeft = (w) => w.spots.filter((sp) => !sp.done).map((sp) => ({ x: sp.L.ix, z: sp.L.iz, ic: 'search' }));
    const isDay = (w) => w.phase === 'day';
    const T = input.isTouch;
    const t = (k) => tr(k, { act: tr(T ? 'btnActT' : 'btnActK'), tap: tr(T ? 'tapT' : 'tapK'), guide: tr(T ? 'guideT' : 'guideK') });
    return [
      { id: 'move', when: (w) => isDay(w) && w.day === 1, done: (w) => Math.hypot(w.P.x - this.tut.x0, w.P.z - this.tut.z0) > 2.5, text: () => t(input.isTouch ? 't_moveT' : 't_moveK') },
      { id: 'take', when: (w) => isDay(w) && w.day === 1, done: (w) => !!w.P.hand, at: () => ({ x: STORAGE.x, z: STORAGE.z, ic: 'box' }), text: () => t('t_take') },
      {
        id: 'shelf', when: (w) => isDay(w) && w.day === 1, done: (w) => !w.P.hand && w.shelves.some((sh) => sh.n > 0),
        at: (w) => {
          const k = w.shelves.findIndex((sh, i) => i < w.nShelves && (sh.type === (w.P.hand && w.P.hand.type) || sh.n === 0));
          const [x, z] = SHELF_SLOTS[Math.max(0, k)];
          return { x, z: z + 0.9, ic: 'shelf' };
        },
        text: (w) => (w.P.hand ? t('t_shelf') : t('t_take')),
      },
      { id: 'reg', when: (w) => isDay(w) && w.day === 1, done: (w) => !!(w.co && w.P.atReg), at: () => ({ x: REG_SPOT.x, z: REG_SPOT.z, ic: 'register' }), text: (w) => (w.queue.length ? t('t_reg') : t('t_wait')) },
      { id: 'test', when: (w) => !!(w.co && w.P.atReg && !w.co.needy), done: (w) => !w.co || w.co.bats.every((b) => b.st !== '?') || w.co.bats.some((b) => b.st === 'bad'), dom: '.cobat:not(.ok):not(.bad)', text: () => t('t_test') },
      { id: 'bad', when: (w) => !!(w.co && w.P.atReg && w.co.bats.some((b) => b.st === 'bad')), done: (w) => !w.co || !w.co.bats.some((b) => b.st === 'bad'), dom: '.cobat.bad', text: () => t('t_bad') },
      { id: 'acc', when: (w) => !!(w.co && w.P.atReg && !w.co.needy && w.co.bats.every((b) => b.st === 'ok')), done: (w) => w.sum.served > 0, dom: '.coacc', text: () => t('t_acc') },
      { id: 'loot', when: (w) => isDay(w) && w.sum.served > 0 && !w.co, done: (w) => w.spots.some((sp) => sp.done), at: (w) => near(w, spotsLeft(w)), text: () => t('t_loot') },
      { id: 'bench', when: (w) => isDay(w) && w.sum.served > 0 && !w.co, done: () => this._benchSeen, at: () => ({ x: BENCH.x, z: BENCH.z, ic: 'bench' }), text: () => t('t_bench') },
      { id: 'dusk', when: (w) => w.phase === 'dusk', done: (w) => w.phase !== 'dusk', text: () => t('t_dusk'), timer: 7 },
      { id: 'night', when: (w) => w.phase === 'night', done: () => false, text: () => t('t_night'), timer: 7 },
      {
        id: 'fight', when: (w) => w.phase === 'night' && w.zs.some((z) => !z.dead), done: (w) => w.sum.kills > 0,
        at: (w) => near(w, w.zs.filter((z) => !z.dead).map((z) => ({ x: z.x, z: z.z, ic: 'weapon', obj: true }))), text: () => t('t_fight'),
      },
      { id: 'heal', when: (w) => w.P.hp < w.P.max * 0.6 && !w.P.ko && (save.data.stock.bandage || 0) + (save.data.stock.medkit || 0) > 0, done: (w) => w.P.hp >= w.P.max * 0.6, dom: '#bheal', text: () => t(input.isTouch ? 't_healT' : 't_healK') },
      {
        id: 'repair', when: (w) => w.phase === 'night' && w.barr.some((b) => b.hp < b.max * 0.75), done: (w) => !!(w.P.act && w.P.act.kind === 'repair') || w.sum.repaired > 0,
        at: (w) => {
          const b = w.barr.filter((b) => b.hp < b.max * 0.75).sort((a, c) => a.hp / a.max - c.hp / c.max)[0];
          const out = w.P.z > FRONT_Z;
          return { x: b.e.x, z: out ? FRONT_Z + WALL_T + 0.6 : FRONT_Z - 0.6, ic: 'plank' };
        },
        text: () => t('t_repair'),
      },
      { id: 'nloot', when: (w) => w.phase === 'night' && w.sum.kills > 0 && spotsLeft(w).length > 0, done: (w) => w.sum.nightLoot > 0, at: (w) => near(w, spotsLeft(w)), text: () => t('t_nloot') },
      { id: 'sleep', when: (w) => w.phase === 'night' && (w.hour >= 22 || w.sum.kills >= 3), done: (w) => w.sleeping || w.phase !== 'night', at: () => ({ x: COT.x, z: COT.z, ic: 'bed' }), text: () => t('t_sleep') },
      { id: 'dayz', when: (w) => w.phase === 'day' && w.zs.some((z) => !z.dead), done: (w) => !w.zs.some((z) => !z.dead), at: (w) => near(w, w.zs.filter((z) => !z.dead).map((z) => ({ x: z.x, z: z.z, ic: 'zombie', obj: true }))), text: () => t('t_dayz') },
    ];
  }

  tutorial(w) {
    const s = save.data;
    const T = s.tut;
    const e = this.el;
    const v = this.g.view;
    const tut = this.tut;
    if (tut.x0 === undefined) (tut.x0 = w.P.x), (tut.z0 = w.P.z);
    // новые виды зомби: карточка один раз
    if (!this.modalOpen && this.g.state === 'play' && !this.g.paused) {
      const nz = w.zs.find((z) => !z.dead && !T['z_' + z.type] && Math.hypot(z.x - w.P.x, z.z - w.P.z) < 16);
      if (nz) return this.zombieCard(nz.type);
    }
    let cur = null;
    const steps = this._steps || (this._steps = this.tutSteps());
    if (!T.skip && !w.P.ko && !w.sleeping) {
      for (const st of steps) {
        if (T[st.id] || !st.when(w)) continue;
        // шаг с таймером закрывается сам
        if (st.timer) {
          if (tut.id !== st.id) tut.t0 = w.time;
          if (w.time - tut.t0 > st.timer) {
            T[st.id] = 1;
            continue;
          }
        }
        if (st.done(w)) {
          T[st.id] = 1;
          save.write();
          audio.play('select');
          continue;
        }
        cur = st;
        break;
      }
    }
    // плашка
    const n = cur ? steps.findIndex((x) => x.id === cur.id) + 1 : 0;
    const sig = cur ? cur.id + ':' + cur.text(w) : '';
    if (tut.sig !== sig) {
      tut.sig = sig;
      tut.id = cur && cur.id;
      if (cur) {
        e.tut.innerHTML = `<div class="tuthead"><span>${IC.star}${esc(t('tutN', { n, m: steps.length }))}</span><button class="tutskip" data-skip="1">${esc(t('tutSkip'))}</button></div><div class="tuttxt">${esc(cur.text(w))}</div>`;
        e.tut.classList.add('on');
        e.tut.querySelector('[data-skip]').addEventListener('pointerdown', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          this.confirm(t('tutSkipQ'), t('tutSkipTxt'), t('tutSkipYes'), () => {
            T.skip = 1;
            save.write();
          });
        });
      } else {
        e.tut.classList.remove('on');
        e.tut.innerHTML = '';
      }
    }
    // указатели: в мире и на кнопках
    const at = cur && cur.at ? cur.at(w) : null;
    this.tutPos = at;
    if (v) v.tutTarget = at;
    const dom = cur && cur.dom ? this.root.querySelector(cur.dom) : null;
    if (tut.dom !== dom) {
      if (tut.dom) tut.dom.classList.remove('tut-hl');
      if (dom) dom.classList.add('tut-hl');
      tut.dom = dom;
    }
    this.hint('');
  }

  zombieCard(type) {
    const s = save.data;
    s.tut['z_' + type] = 1;
    save.write();
    this.g.pause(true);
    const m = this.modal(
      t('zNew'),
      `<div class="zcard"><img src="${zombieThumb(type)}" alt=""><div><b>${esc(t('zn_' + type))}</b><small>${esc(t('zd_' + type))}</small></div></div>
      <div class="tipline">${esc(t('zt_' + type))}</div>
      <button class="btn big green" data-k="1">${IC.check}${esc(t('gotIt'))}</button>`,
      () => this.g.pause(false),
      'zcardm'
    );
    m.querySelector('[data-k]').onclick = () => {
      this.closeModal();
      this.g.pause(false);
    };
  }

  // ---------- гайд по всей игре ----------
  guide(onClose, ch) {
    const g = this.g;
    const inPlay = g.state === 'play' && !g.paused;
    if (inPlay) g.pause(true);
    this._gch = ch || this._gch || 'ctrl';
    const chips = guideChapters().map((c) => `<button class="gchip ${c.k === this._gch ? 'on' : ''}" data-gch="${c.k}">${IC[c.ic] || ''}<span>${esc(c.name)}</span></button>`).join('');
    const m = this.modal(
      guideTitle(),
      `<div class="gch">${chips}</div><div class="gbody">${guideBody(this._gch)}</div>`,
      () => {
        if (onClose) onClose();
        else if (inPlay) g.pause(false);
      },
      'guidem'
    );
    const body = m.querySelector('.gbody');
    m.querySelectorAll('[data-gch]').forEach((b) => (b.onclick = () => {
      this._gch = b.dataset.gch;
      m.querySelectorAll('[data-gch]').forEach((x) => x.classList.toggle('on', x === b));
      body.innerHTML = guideBody(this._gch);
      body.scrollTop = 0;
      b.scrollIntoView({ block: 'nearest', inline: 'center' });
    }));
    const on = m.querySelector('.gchip.on');
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  // ---------- пауза ----------
  pause() {
    const g = this.g;
    if (g.state !== 'play') return;
    g.pause(true);
    const s = save.data;
    const m = this.modal(
      t('pause'),
      `${slidersHTML(s.settings, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}
      <div class="row"><button class="btn big green" data-r="1">${IC.play}${esc(t('resume'))}</button></div>
      <div class="row"><button class="btn mid blue" data-b="1">${IC.map}${esc(t('manage'))}</button><button class="btn mid" data-m="1">${IC.home}${esc(t('menu'))}</button></div>
      <div class="row"><button class="btn mid" data-gd="1">${IC.book}${esc(guideTitle())}</button></div>
      <small class="muted">${esc(t('pauseNote'))}</small>`,
      () => g.pause(false),
      'pausem'
    );
    bindSliders(m, s.settings, () => save.write());
    m.querySelector('[data-r]').onclick = () => {
      this.closeModal();
      g.pause(false);
    };
    m.querySelector('[data-b]').onclick = () => {
      this.closeModal();
      this.board.open('pause');
    };
    m.querySelector('[data-gd]').onclick = () => this.guide(() => this.pause());
    m.querySelector('[data-m]').onclick = () => {
      this.closeModal();
      g.w && g.w.persist();
      g.adBreak(() => g.toMenu());
    };
  }

  // ---------- продавец без сознания ----------
  ko() {
    const g = this.g;
    if (!g.w || !g.w.P.ko) return;
    g.pause(true);
    const m = this.modal(
      t('koT'),
      `<div class="lose-ic">${IC.zombie}</div><div class="itask">${esc(t('koTxt'))}</div>
      <button class="btn big green" data-rv="1">${IC.ad}${esc(t('revive'))}</button>
      <button class="btn mid" data-wt="1">${esc(t('waitDawn'))}</button>`,
      false,
      'losem'
    );
    m.querySelector('[data-rv]').onclick = () => {
      this.closeModal();
      g.rewarded(
        () => {
          g.w.revive();
        },
        (ok) => {
          g.pause(false);
          if (!ok) this.ko();
        }
      );
    };
    m.querySelector('[data-wt]').onclick = () => {
      this.closeModal();
      g.pause(false);
      g.w.surrender();
    };
  }

  // ---------- итоги ночи ----------
  summary(w, onNext) {
    const g = this.g;
    const s = save.data;
    const S = w.sum;
    const dRep = Math.round(s.rep - S.rep0);
    const drops = Object.keys(S.drops).length ? `<div class="srow"><span>${IC.zombie}${esc(t('drops'))}</span><div class="gl">${this.gotHTML(S.drops)}</div></div>` : '';
    const scav = S.scav.map((x) => `<div class="srow"><span>${IC.map}${esc(x.name)} · ${esc(t('loc_' + x.loc))}${x.hurt ? ` <em class="bad">${esc(t('hurt'))}</em>` : ''}</span><div class="gl">${this.gotHTML(x.got)}</div></div>`).join('');
    let doubled = false;
    const m = this.modal(
      t('dawnT', { n: w.day }),
      `<div class="sumbig">${IC.bat}<b>+${fmt(S.sales)}</b><small>${esc(t('salesToday'))}</small>${S.sales > 0 ? `<button class="btn mid blue" data-x2="1">${IC.ad}x2</button>` : ''}</div>
      <div class="sstats">
        <span>${IC.shop}${esc(t('served'))}: <b>${S.served}</b></span>
        <span>${IC.box}${esc(t('itemsSold'))}: <b>${S.items}</b></span>
        <span>${IC.zombie}${esc(t('kills'))}: <b>${S.kills}</b></span>
        <span>${IC.search}${esc(t('caught'))}: <b>${S.caught}</b></span>
        ${S.scammed ? `<span class="bad">${IC.bat}${esc(t('scammedSum'))}: <b>-${S.scammed}</b></span>` : ''}
        ${S.stolen ? `<span class="bad">${IC.box}${esc(t('stolenSum'))}: <b>-${S.stolen}</b></span>` : ''}
        ${S.nightLoot ? `<span>${IC.search}${esc(t('nightLootSum'))}: <b>${S.nightLoot}</b></span>` : ''}
        ${S.slept ? `<span>${IC.bed}${esc(t('sleptYes'))}</span>` : ''}
        <span>${IC.rep}${esc(t('rep'))}: <b class="${dRep >= 0 ? 'good' : 'bad'}">${dRep >= 0 ? '+' : ''}${dRep}</b></span>
      </div>
      ${S.lostBat ? `<div class="warnbox">${esc(t('lostNight', { n: S.lostBat, m: S.lostItems }))}</div>` : ''}
      ${drops}${scav}
      ${s.lvl > S.lvl0 ? `<div class="unl">${esc(t('lvlUpSum', { n: s.lvl }))}</div>` : ''}
      <button class="btn big green" data-n="1">${IC.sun}${esc(t('nextDay'))}</button>`,
      false,
      'resm'
    );
    const x2 = m.querySelector('[data-x2]');
    if (x2)
      x2.onclick = () => {
        if (doubled) return;
        x2.disabled = true;
        g.rewarded(() => {
          doubled = true;
          s.bat += S.sales;
          s.earned += S.sales;
          save.write();
          audio.play('coin');
          const c = m.querySelector('.sumbig b');
          if (c) c.textContent = '+' + fmt(S.sales * 2);
          x2.remove();
        });
      };
    m.querySelector('[data-n]').onclick = () => {
      this.closeModal();
      onNext();
    };
  }

  ending(onClose) {
    const m = this.modal(
      t('endT'),
      `<div class="gift-big">${IC.tower}</div><div class="itask">${esc(t('endTxt'))}</div><div class="gamount">${IC.bat}<b>+1000</b></div>
      <button class="btn big green" data-k="1">${esc(t('endGo'))}</button>`,
      false,
      'resm'
    );
    m.querySelector('[data-k]').onclick = () => {
      this.closeModal();
      onClose();
    };
  }
}
