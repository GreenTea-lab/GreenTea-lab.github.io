// DOM-интерфейс: меню, уровни, кухня (улучшения и повара), HUD, подсказки, пауза, итоги, настройки, магазин
import * as THREE from 'three';
import { IC } from './icons.js';
import { t, fmt, fmtTime, LANG } from './i18n.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { input } from './input.js';
import { iap, itemHTML } from './iap.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import { ING, LEVELS, THEMES, THEME_COL, RECIPES, UPGRADES, UP_MAX, UP_COST, CHEFS, APRON, SOUP_N } from './data.js';
import { thumb, chefThumb } from './thumbs.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const FREE_COINS = 150;
const PER_WORLD = 5;
const img = (src, cls = '') => (src ? `<img class="${cls}" src="${src}" alt="">` : `<i class="${cls} empty"></i>`);

// что нужно для блюда: продукты (ключи картинок) и чем их готовить
// tool: chop — нарезать, pot — варить в кастрюле, pan — жарить на сковороде
function recipeParts(r) {
  const R = RECIPES[r];
  if (R.soup) return Array(SOUP_N).fill({ key: R.soup + ':chop', tool: 'pot' });
  return R.parts.map((p) => {
    const [id, st] = p.split(':');
    const I = ING[id];
    const tool = st === 'cook' ? (I.pan ? 'pan' : 'pot') : st === 'chop' ? 'chop' : null;
    return { key: id + ':' + st, tool };
  });
}

// шаги готовки по порядку: резать → варить/жарить
function recipeTools(r) {
  const R = RECIPES[r];
  const set = new Set();
  if (R.soup) set.add('chop').add('pot');
  else
    for (const p of R.parts) {
      const [id, st] = p.split(':');
      if (st === 'chop' || (st === 'cook' && ING[id].chop)) set.add('chop');
      if (st === 'cook') set.add(ING[id].pan ? 'pan' : 'pot');
    }
  return ['chop', 'pot', 'pan'].filter((x) => set.has(x));
}
const TOOL_IC = () => ({ chop: IC.knife, pot: IC.pot, pan: IC.pan });
const partHTML = (p, cls) => `<span class="part">${img(thumb(p.key), cls)}${p.tool && p.tool !== 'chop' ? `<i class="tbadge ${p.tool}">${TOOL_IC()[p.tool]}</i>` : ''}</span>`;
const toolsHTML = (r) => `<div class="tools">${recipeTools(r).map((x) => `<span class="tool ${x}">${TOOL_IC()[x]}<em>${esc(t('how_' + x))}</em></span>`).join('')}</div>`;

function starsHTML(n, cls = '') {
  let h = '';
  for (let i = 0; i < 3; i++) h += `<i class="st ${cls} ${i < n ? 'on' : ''}">${i < n ? IC.star : IC.starE}</i>`;
  return h;
}

export class UI {
  constructor(game, root) {
    this.g = game;
    this.root = root;
    this.modalOpen = false;
    this.screen = '';
    this.worldIdx = undefined;
    const st = document.createElement('style');
    st.textContent = volumeCss({ accent: '#ef5a3c', track: '#e8d5ba', thumb: '#fffaf0', muted: '#9a7d68' });
    document.head.appendChild(st);
    root.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) {
        audio.unlock();
        audio.play('click');
      }
    });
  }

  // ---------- общие элементы ----------
  topbar(back) {
    const s = save.data;
    return `<div class="topbar">
      <div class="tb-l">${back ? `<button class="btn round small" data-a="back">${IC.back}</button>` : ''}
        <div class="chip coins" data-a="store">${IC.coin}<b>${fmt(s.coins)}</b><i class="plus">+</i></div>
        <div class="chip stars">${IC.star}<b>${save.stars()}</b><small>/${LEVELS.length * 3}</small></div>
      </div>
      <div class="tb-r"><button class="btn round small" data-a="settings">${IC.gear}</button></div>
    </div>`;
  }

  set(html, screen) {
    if (screen !== 'hud' && screen !== 'results' && this.g.state === 'play') this.g.toMenu();
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
      case 'back':
        this.menu();
        break;
      case 'play':
        this.levels();
        break;
      case 'kitchen':
        this.kitchen();
        break;
      case 'settings':
        this.settings();
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
      case 'world':
        this.worldIdx = +el.dataset.i;
        this.levels();
        break;
      case 'level': {
        const i = +el.dataset.i;
        if (!save.open(i)) {
          audio.play('error');
          this.toast(t('locked', { n: i }));
          return;
        }
        this.intro(i);
        break;
      }
    }
  }

  refresh() {
    if (this.screen === 'menu') this.menu();
    else if (this.screen === 'kitchen') this.kitchen();
    else if (this.screen === 'levels') this.levels();
    const c = document.querySelector('.chip.coins b');
    if (c) c.textContent = fmt(save.data.coins);
  }

  toast(text) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = text;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2000);
  }

  // ---------- главное меню ----------
  menu() {
    if (this.g.state !== 'menu') this.g.toMenu();
    const s = save.data;
    const giftReady = s.daily.day !== today();
    this.set(
      `${this.topbar(false)}
      <div class="menu-c">
        <div class="logo"><div class="sign"><i class="rope l"></i><i class="rope r"></i><div class="logo-t">${esc(t('title'))}</div><div class="logo-s">${IC.hat}</div></div></div>
        <div class="spacer"></div>
        <button class="btn big play" data-a="play">${IC.play}<span>${esc(t('play'))}</span></button>
        <div class="row">
          <button class="btn big blue" data-a="kitchen">${IC.hat}<span>${esc(t('kitchen'))}</span></button>
        </div>
        <div class="row small-row">
          <button class="btn round" data-a="lb" title="${esc(t('leaderboard'))}">${IC.trophy}</button>
          <button class="btn round" data-a="store" title="${esc(t('shop'))}">${IC.shop}</button>
          <button class="btn round gift ${giftReady ? 'ready' : ''}" data-a="gift" title="${esc(t('daily'))}">${IC.gift}</button>
        </div>
      </div>`,
      'menu'
    );
    if (giftReady && !this._giftShown) {
      this._giftShown = true;
      setTimeout(() => this.screen === 'menu' && !this.modalOpen && this.daily(), 600);
    }
  }

  // ---------- уровни ----------
  levels() {
    const s = save.data;
    if (this.worldIdx === undefined) {
      let last = 0;
      for (let i = 0; i < LEVELS.length; i++) if (save.open(i)) last = i;
      this.worldIdx = Math.floor(last / PER_WORLD);
    }
    const W = this.worldIdx;
    const th = THEMES[W];
    const tabs = THEMES.map((x, i) => {
      const open = save.open(i * PER_WORLD);
      return `<button class="tab ${i === W ? 'on' : ''} ${open ? '' : 'locked'}" data-a="world" data-i="${i}" style="--c1:${THEME_COL[x][0]};--c2:${THEME_COL[x][1]}">${open ? '' : IC.lock}<span>${esc(t('theme_' + x))}</span></button>`;
    }).join('');
    let cards = '';
    for (let k = 0; k < PER_WORLD; k++) {
      const i = W * PER_WORLD + k;
      if (i >= LEVELS.length) break;
      const open = save.open(i);
      const rec = s.levels[i];
      const dishes = LEVELS[i].menu.map((r) => img(thumb('dish:' + r), 'dimg')).join('');
      cards += `<button class="lcard ${open ? '' : 'locked'}" data-a="level" data-i="${i}" style="--c1:${THEME_COL[th][0]};--c2:${THEME_COL[th][1]}">
        <div class="lnum">${i + 1}</div>
        <div class="ldish">${dishes}</div>
        ${open ? `<div class="lstars">${starsHTML(rec ? rec.stars : 0)}</div><div class="lbest">${rec && rec.best ? `${esc(t('best'))}: <b>${fmt(rec.best)}</b>` : `<span class="muted">${esc(t('noRecord'))}</span>`}</div>` : `<div class="llock">${IC.lock}</div>`}
      </button>`;
    }
    this.set(
      `${this.topbar(true)}
      <div class="panel-c">
        <div class="ttl">${esc(t('levels'))}</div>
        <div class="tabs">${tabs}</div>
        <div class="lcards">${cards}</div>
      </div>`,
      'levels'
    );
  }

  // окно перед уровнем: меню, цели, особенности
  intro(i) {
    const L = LEVELS[i];
    const rec = save.data.levels[i];
    const menu = L.menu
      .map((r) => {
        const parts = recipeParts(r)
          .map((p) => partHTML(p, 'pimg'))
          .join('<span class="plus-s">+</span>');
        const how = RECIPES[r].soup ? t('how_soup') : '';
        return `<div class="rcp">${img(thumb('dish:' + r), 'rimg')}<div class="rtx"><b>${esc(t('r_' + r))}</b><div class="rparts">${parts}</div>${toolsHTML(r)}${how ? `<small>${esc(how)}</small>` : ''}</div></div>`;
      })
      .join('');
    const feats = [];
    const has = (ch) => L.map.some((row) => row.includes(ch));
    if (isSplit(L.map)) feats.push('f_split');
    if (L.dirty) feats.push('f_dirty');
    if (L.fire) feats.push('f_fire');
    else if (L.menu.some((r) => recipeTools(r).some((x) => x === 'pot' || x === 'pan'))) feats.push('f_burn');
    if (has('i')) feats.push('f_ice');
    if (/[<>^v]/.test(L.map.join(''))) feats.push('f_belt');
    const goals = L.stars.map((v, k) => `<div class="goal">${starsHTML(k + 1, 'sm')}<b>${fmt(v)}</b></div>`).join('');
    const m = this.modal(
      t('levelN', { n: i + 1 }) + ' · ' + t('theme_' + L.theme),
      `<div class="isec"><div class="ihead">${esc(t('menuToday'))}</div>${menu}</div>
      ${feats.length ? `<div class="feats">${feats.map((f) => `<div class="feat">${esc(t(f))}</div>`).join('')}</div>` : ''}
      <div class="igoals"><div class="itime">${IC.clock}<b>${fmtTime(L.time)}</b></div>${goals}</div>
      ${rec && rec.best ? `<div class="muted">${esc(t('best'))}: ${fmt(rec.best)}</div>` : ''}
      ${input.isTouch ? '' : `<div class="mode"><span>${esc(t('mode'))}</span><div class="segs">${['solo', 'coop'].map((x) => `<button class="seg ${(save.data.settings.coop ? 'coop' : 'solo') === x ? 'on' : ''}" data-mode="${x}">${esc(t(x))}</button>`).join('')}</div></div>
      <div class="coopkeys ${save.data.settings.coop ? '' : 'off'}"><div><i class="apdot" style="--ap:${APRON[0]}"></i>${esc(t('keysP1'))}</div><div><i class="apdot" style="--ap:${APRON[1]}"></i>${esc(t('keysP2'))}</div></div>`}
      <button class="btn big green" data-go="1">${IC.play}${esc(t('start'))}</button>`,
      null,
      'intro'
    );
    m.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => {
      save.data.settings.coop = b.dataset.mode === 'coop';
      save.write();
      m.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('on', x === b));
      m.querySelector('.coopkeys').classList.toggle('off', !save.data.settings.coop);
    }));
    m.querySelector('[data-go]').onclick = () => this.g.startLevel(i, !!save.data.settings.coop);
  }

  // ---------- кухня: улучшения и повара ----------
  kitchen(tab) {
    if (tab) this.kTab = tab;
    if (!this.kTab) this.kTab = 'up';
    if (this.kSlot === undefined) this.kSlot = 0;
    const s = save.data;
    this.g.showMenuChefs();
    let body = '';
    if (this.kTab === 'up') {
      body = UPGRADES.map((u) => {
        const lvl = s.up[u] || 0;
        const cost = UP_COST[lvl];
        const pips = Array.from({ length: UP_MAX }, (_, k) => `<i class="${k < lvl ? 'on' : ''}"></i>`).join('');
        const btn = lvl >= UP_MAX ? `<button class="btn upg max" disabled>${esc(t('maxed'))}</button>` : `<button class="btn upg ${s.coins < cost ? 'poor' : ''}" data-up="${u}">${IC.up}<b>${fmt(cost)}</b>${IC.coin}</button>`;
        return `<div class="uprow"><div class="upic up-${u}">${upIcon(u)}</div><div class="uptx"><b>${esc(t('up_' + u))}</b><small>${esc(t('up_' + u + '_d'))}</small><div class="pips">${pips}</div></div>${btn}</div>`;
      }).join('');
    } else {
      const slots = [0, 1].map((k) => `<button class="seg slot ${this.kSlot === k ? 'on' : ''}" data-slot="${k}" style="--ap:${APRON[k]}"><i class="apdot"></i>${esc(t('chef' + (k + 1)))}</button>`).join('');
      const cards = CHEFS.map((c) => {
        const own = s.chefs.includes(c.id);
        const inSlot = s.pick.indexOf(c.id);
        let foot;
        if (!own) foot = `<span class="price ${s.coins < c.price ? 'poor' : ''}"><b>${fmt(c.price)}</b>${IC.coin}</span>`;
        else if (inSlot >= 0) foot = `<span class="inslot" style="--ap:${APRON[inSlot]}"><i class="apdot"></i>${esc(t('chef' + (inSlot + 1)))}</span>`;
        else foot = `<span class="muted">${esc(t('choose'))}</span>`;
        return `<button class="ccard ${own ? '' : 'notown'} ${inSlot === this.kSlot ? 'sel' : ''}" data-chef="${c.id}">${img(chefThumb(c.id), 'cimg')}<b>${esc(t('chef_' + c.id))}</b>${foot}</button>`;
      }).join('');
      body = `<div class="segs slots">${slots}</div><div class="cgrid">${cards}</div>`;
    }
    this.set(
      `${this.topbar(true)}
      <div class="kitchen-c">
        <div class="kspace"></div>
        <div class="kpanel">
          <div class="ktabs"><button class="ktab ${this.kTab === 'up' ? 'on' : ''}" data-tab="up">${IC.up}${esc(t('upgrades'))}</button><button class="ktab ${this.kTab === 'chefs' ? 'on' : ''}" data-tab="chefs">${IC.hat}${esc(t('chefs'))}</button></div>
          <div class="kbody">${body}</div>
        </div>
      </div>`,
      'kitchen'
    );
    const R = this.root;
    R.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => this.kitchen(b.dataset.tab)));
    R.querySelectorAll('[data-up]').forEach((b) => (b.onclick = () => {
      const u = b.dataset.up;
      const lvl = s.up[u] || 0;
      const cost = UP_COST[lvl];
      if (lvl >= UP_MAX) return;
      if (s.coins < cost) return this.poor();
      s.coins -= cost;
      s.up[u] = lvl + 1;
      save.write();
      audio.play('upgrade');
      this.kitchen();
    }));
    R.querySelectorAll('[data-slot]').forEach((b) => (b.onclick = () => {
      this.kSlot = +b.dataset.slot;
      this.kitchen();
    }));
    R.querySelectorAll('[data-chef]').forEach((b) => (b.onclick = () => {
      const id = b.dataset.chef;
      const c = CHEFS.find((x) => x.id === id);
      if (!s.chefs.includes(id)) {
        if (s.coins < c.price) return this.poor();
        s.coins -= c.price;
        s.chefs.push(id);
        audio.play('buy');
      } else audio.play('select');
      // поставить в выбранный фартук; если он уже во втором — поменять местами
      const other = 1 - this.kSlot;
      if (s.pick[other] === id) s.pick[other] = s.pick[this.kSlot];
      s.pick[this.kSlot] = id;
      save.write();
      this.kitchen();
    }));
  }

  poor() {
    audio.play('error');
    this.toast(t('notEnough'));
    this.store();
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
    const x = m.querySelector('.mx');
    if (x) x.onclick = close;
    m.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) {
        audio.unlock();
        audio.play('click');
      }
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

  settings(inGame) {
    const s = save.data;
    const q = s.settings.quality || 'auto';
    const qs = ['high', 'mid', 'low'].map((k) => `<button class="seg ${q === k || (q === 'auto' && this.g.quality === k) ? 'on' : ''}" data-q="${k}">${esc(t('q' + k))}</button>`).join('');
    const m = this.modal(
      t('settings'),
      `${slidersHTML(s.settings, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}
      <div class="qrow"><span>${esc(t('quality'))}</span><div class="segs">${qs}</div></div>
      <div class="ctrl"><b>${esc(t('controls'))}</b><small>${esc(input.isTouch ? t('ctrlTouch') : t('ctrlKeys'))}</small></div>`,
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
  }

  async leaderboard() {
    const m = this.modal(t('leaderboard'), `<div class="muted lbnote">${esc(t('lbNote'))}</div><div class="lb"><div class="muted">${esc(t('loading'))}</div></div>`);
    const res = await sdk.getLeaderboard();
    const box = m.querySelector('.lb');
    if (!box || this._modal !== m) return;
    if (!res.available) {
      box.innerHTML = `<div class="muted">${esc(t('lbOffline'))}</div>`;
      return;
    }
    let html = res.entries.length
      ? res.entries.map((e) => `<div class="lbrow ${e.me ? 'me' : ''}"><b>${e.rank}</b><span>${esc(e.name || '—')}</span><i>${fmt(e.score)}</i></div>`).join('')
      : `<div class="muted">${esc(t('lbEmpty'))}</div>`;
    if (!res.authorized) html += `<div class="lblogin"><span>${esc(t('lbLogin'))}</span><button class="btn mid green" data-login="1">${esc(t('lbLoginBtn'))}</button></div>`;
    box.innerHTML = html;
    const lg = box.querySelector('[data-login]');
    if (lg)
      lg.onclick = async () => {
        if (await sdk.login()) {
          await sdk.submitScore(save.total());
          this.leaderboard();
        }
      };
  }

  store() {
    const s = save.data;
    const freeReady = Date.now() - (s.freeAdAt || 0) > 180000;
    const items = iap.items();
    const list = items.length ? `<div class="iap-box">${items.map((x) => itemHTML(x, { owned: t('iapOwned') })).join('')}</div>` : `<div class="muted">${esc(t('iapEmpty'))}</div>`;
    const m = this.modal(
      t('store'),
      `<div class="free ${freeReady ? '' : 'off'}">${IC.coin}<div><b>${esc(t('freeCoins'))}</b><small>${esc(t('freeCoinsSub', { n: FREE_COINS }))}</small></div><button class="btn mid green" data-free="1" ${freeReady ? '' : 'disabled'}>${IC.ad}${esc(t('watchAd'))}</button></div>${list}`,
      () => this.refresh()
    );
    const f = m.querySelector('[data-free]');
    if (f)
      f.onclick = () => {
        f.disabled = true;
        this.g.rewarded(() => {
          s.coins += FREE_COINS;
          s.freeAdAt = Date.now();
          save.write();
          audio.play('coin');
          this.toast('+' + FREE_COINS);
          if (this._modal === m) this.store();
        });
      };
    m.querySelectorAll('.iap-buy[data-id]').forEach((b) => (b.onclick = async () => {
      m.querySelectorAll('.iap-buy').forEach((e) => (e.disabled = true));
      const ok = await iap.buy(b.dataset.id);
      if (ok) audio.play('buy');
      if (this._modal === m) this.store();
    }));
  }

  daily() {
    const s = save.data;
    if (s.daily.day === today()) return;
    const amount = 200 + Math.min(6, s.daily.streak || 0) * 25;
    const take = (mult) => {
      if (s.daily.day === today()) return;
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      s.daily.streak = s.daily.day === y ? (s.daily.streak || 0) + 1 : 1;
      s.daily.day = today();
      s.coins += amount * mult;
      save.write();
      audio.play('coin');
      this.closeModal();
      this.toast('+' + amount * mult);
      this.refresh();
    };
    const m = this.modal(
      t('daily'),
      `<div class="gift-big">${IC.gift}</div><div class="gamount">${IC.coin}<b>${fmt(amount)}</b></div><small class="muted">${esc(t('dailySub'))}</small>
      <div class="row"><button class="btn mid green" data-take="1">${esc(t('take'))}</button><button class="btn mid blue" data-x3="1">${IC.ad}${esc(t('takeX3'))}</button></div>`,
      () => this.refresh()
    );
    m.querySelector('[data-take]').onclick = () => take(1);
    m.querySelector('[data-x3]').onclick = () => this.g.rewarded(() => take(3));
  }

  // ---------- HUD уровня ----------
  levelHud(k) {
    const touch = input.isTouch;
    this.set(
      `<div class="hud ${touch ? 'touch' : ''}">
        <div class="orders" id="orders"></div>
        <div class="h-tr">
          <div class="hrow"><div class="score"><small>${esc(t('score'))}</small><b id="hscore">0</b><i class="combo" id="hcombo"></i></div><div class="timer" id="htime"><b>0:00</b></div><button class="btn round small" id="hpause">${IC.pause}</button></div>
          <div class="hstars" id="hstars"></div>
        </div>
        <div class="ovl" id="ovl"></div>
        <div class="count" id="hcount"></div>
        <div class="banner-box" id="hbanner"></div>
        <div class="hint" id="hhint"></div>
        ${
          touch
            ? `<div class="jzone" id="jzone"><div class="jbase" id="jbase"><div class="jknob" id="jknob"></div></div></div>
        <div class="tc-r"><button class="tbtn sw" id="bsw">${IC.swap}<small>${esc(t('bSwitch'))}</small></button><button class="tbtn act" id="bact">${IC.knife}<small>${esc(t('bAct'))}</small></button><button class="tbtn pick" id="bpick">${IC.hand}<small>${esc(t('bPick'))}</small></button></div>`
            : this.g.coop
              ? `<div class="keys-hint coop"><span><i class="apdot" style="--ap:${APRON[0]}"></i>${esc(t('keysP1'))}</span><span><i class="apdot" style="--ap:${APRON[1]}"></i>${esc(t('keysP2'))}</span></div>`
              : `<div class="keys-hint">${esc(t('keysShort'))}</div>`
        }
      </div>`,
      'hud'
    );
    const R = this.root;
    if (touch) {
      input.bindJoy(R.querySelector('#jzone'), R.querySelector('#jbase'), R.querySelector('#jknob'));
      input.bindBtn(R.querySelector('#bpick'), 'pick');
      input.bindBtn(R.querySelector('#bact'), 'act');
      input.bindBtn(R.querySelector('#bsw'), 'sw');
    }
    R.querySelector('#hpause').onclick = () => this.pause();
    this.el = {
      orders: R.querySelector('#orders'),
      time: R.querySelector('#htime'),
      timeB: R.querySelector('#htime b'),
      score: R.querySelector('#hscore'),
      combo: R.querySelector('#hcombo'),
      stars: R.querySelector('#hstars'),
      ovl: R.querySelector('#ovl'),
      floats: R.querySelector('#floats'),
    };
    this.cards = new Map();
    this.ovEls = new Map();
    this.tut = { mode: k.L.tut || null, step: 0, t: 0, shown: '', switched: false };
    this._stars = -1;
    this.hint('');
  }

  hud(k, view) {
    const e = this.el;
    if (this.screen !== 'hud' || !e) return;
    // время
    const tl = fmtTime(k.timeLeft);
    if (e._t !== tl) {
      e._t = tl;
      e.timeB.textContent = tl;
      e.time.classList.toggle('low', k.started && k.timeLeft <= 30);
      e.time.style.setProperty('--p', (k.timeLeft / k.L.time) * 100 + '%');
    }
    if (e._s !== k.score) {
      e._s = k.score;
      e.score.textContent = fmt(k.score);
    }
    const cb = k.combo > 1 ? 'x' + k.combo : '';
    if (e._c !== cb) {
      e._c = cb;
      e.combo.textContent = cb;
      e.combo.classList.toggle('on', !!cb);
    }
    const st = k.stars();
    if (st !== this._stars) {
      if (this._stars >= 0 && st > this._stars) audio.play('star', st);
      this._stars = st;
      const next = k.L.stars[st];
      e.stars.innerHTML = starsHTML(st, 'sm') + (next !== undefined ? `<small>${fmt(next)}</small>` : '');
    }
    this.orders(k);
    this.overlays(view);
  }

  orders(k) {
    const box = this.el.orders;
    const ids = new Set(k.orders.map((o) => o.id));
    for (const [id, c] of this.cards) {
      if (!ids.has(id) && !c.leaving) {
        c.leaving = true;
        c.el.classList.add(c.served ? 'served' : 'gone');
        const m = this.cards;
        setTimeout(() => {
          c.el.remove();
          m.delete(id);
        }, 450);
      }
    }
    for (const o of k.orders) {
      let c = this.cards.get(o.id);
      if (!c) {
        const el = document.createElement('div');
        el.className = 'ocard new';
        const parts = recipeParts(o.r)
          .map((p) => partHTML(p, 'opimg'))
          .join('');
        el.style.setProperty('--rot', ((o.id * 37) % 5) - 2 + 'deg');
        el.innerHTML = `<i class="clip"></i><div class="obar"><i></i></div><img class="odish" src="${thumb('dish:' + o.r)}" alt=""><div class="oname">${esc(t('r_' + o.r))}</div><div class="oparts">${parts}</div>${toolsHTML(o.r)}`;
        box.appendChild(el);
        c = { el, bar: el.querySelector('.obar i'), f: -1 };
        this.cards.set(o.id, c);
        setTimeout(() => el.classList.remove('new'), 30);
      }
      const f = Math.max(0, o.left / o.pat);
      const q = Math.round(f * 200) / 200;
      if (q !== c.f) {
        c.f = q;
        c.bar.style.width = q * 100 + '%';
        c.bar.style.background = q > 0.5 ? '#5ccc4e' : q > 0.25 ? '#ffb030' : '#ff5a4a';
        c.el.classList.toggle('hurry', q <= 0.25);
      }
    }
  }

  overlays(view) {
    if (!view) return;
    const list = view.overlays(this.g.camera, this.g.w, this.g.h);
    const seen = new Set();
    for (const o of list) {
      seen.add(o.key);
      let el = this.ovEls.get(o.key);
      if (!el) {
        el = document.createElement('div');
        el.className = 'ov';
        el._sig = '';
        this.el.ovl.appendChild(el);
        this.ovEls.set(o.key, el);
      }
      const sig = (o.icons || []).join('|').length + ':' + (o.icons || []).map((x) => (x ? x.length : 0)).join(',') + ':' + o.warn + ':' + o.done + ':' + (o.bar !== null && o.bar !== undefined);
      if (sig !== el._sig) {
        el._sig = sig;
        const icons = o.icons && o.icons.length ? `<div class="ovi">${o.icons.map((x) => (x ? `<img src="${x}" alt="">` : '<i></i>')).join('')}${o.done && !o.warn ? `<b class="ok">${IC.check}</b>` : ''}</div>` : '';
        const bar = o.bar !== null && o.bar !== undefined ? '<div class="ovb"><i></i></div>' : '';
        const warn = o.warn === 'x' ? '<b class="ovx">✕</b>' : o.warn ? '<b class="ovw">!</b>' : '';
        el.innerHTML = icons + bar + warn;
        el._bar = el.querySelector('.ovb i');
      }
      if (el._bar) {
        el._bar.style.width = Math.max(0, Math.min(1, o.bar)) * 100 + '%';
        el._bar.style.background = o.col;
      }
      el.style.transform = `translate(${o.pos[0].toFixed(1)}px,${o.pos[1].toFixed(1)}px) translate(-50%,-100%)`;
    }
    for (const [key, el] of this.ovEls)
      if (!seen.has(key)) {
        el.remove();
        this.ovEls.delete(key);
      }
  }

  // всплывающий текст над точкой кухни
  float(text, x, z, cls = '', y = 1.3) {
    const v = new THREE.Vector3(x, y, z).project(this.g.camera);
    const sx = ((v.x + 1) / 2) * this.g.w,
      sy = ((1 - v.y) / 2) * this.g.h;
    const d = document.createElement('div');
    d.className = 'float ' + cls;
    d.textContent = text;
    d.style.left = sx + 'px';
    d.style.top = sy + 'px';
    (this.el && this.el.floats ? this.el.floats : document.body).appendChild(d);
    setTimeout(() => d.remove(), 1400);
  }

  events(k, view) {
    if (this.screen !== 'hud') return;
    for (const e of k.events) {
      const X = e.x !== undefined ? view.wx(e.x) : 0,
        Z = e.z !== undefined ? view.wz(e.z) : 0;
      if (e.type === 'serve') {
        const c = this.cards.get(e.oid);
        if (c) c.served = true;
        this.float('+' + (e.value + e.tip), X, Z, 'f-big');
        if (e.tip > 0) setTimeout(() => this.float(t('tipN', { n: e.tip }), X, Z, 'f-tip', 1.0), 250);
        if (e.combo > 1) setTimeout(() => this.float(t('combo', { n: e.combo }), X, Z, 'f-combo', 1.7), 120);
      } else if (e.type === 'wrong') this.float(t('wrongDish'), X, Z, 'f-bad');
      else if (e.type === 'burnt') this.float(t('burntTxt'), X, Z, 'f-bad', 1.6);
      else if (e.type === 'miss') {
        this.toastHud(t('missed') + ' −10');
      } else if (e.type === 'rush') this.banner(t('rush'));
    }
  }

  toastHud(text) {
    const d = document.createElement('div');
    d.className = 'hmiss';
    d.textContent = text;
    if (this.el && this.el.floats) this.el.floats.appendChild(d);
    setTimeout(() => d.remove(), 1600);
  }

  count(n) {
    const el = this.root.querySelector('#hcount');
    if (!el) return;
    el.textContent = n > 0 ? t('ready') : t('go');
    el.className = 'count show ' + (n > 0 ? '' : 'go');
    clearTimeout(this._ct);
    this._ct = setTimeout(() => (el.className = 'count'), n > 0 ? 2100 : 1100);
  }

  banner(text) {
    const el = this.root.querySelector('#hbanner');
    if (!el) return;
    el.innerHTML = `<div class="banner">${esc(text)}</div>`;
  }

  hint(text) {
    const el = this.root.querySelector('#hhint');
    if (!el) return;
    if (el._t === text) return;
    el._t = text;
    if (text) {
      el.textContent = text;
      el.className = 'hint show';
    } else el.className = 'hint';
  }

  // ---------- обучение ----------
  tutorial(k) {
    const T = this.tut;
    if (!T || !T.mode || !k.started || this.screen !== 'hud') return;
    T.t = k.t;
    if (k.events.some((e) => e.type === 'switch')) T.switched = true;
    const touch = input.isTouch;
    const tx = (key) => t(touch && t(key + 'T') !== key + 'T' ? key + 'T' : key);
    if (T.mode !== 'basic') {
      // короткая подсказка в начале уровня
      this.hint(T.t < 7 ? t('t_' + T.mode) : '');
      if (T.t >= 7) T.mode = null;
      return;
    }
    const tiles = k.tiles;
    const anyIng = (st) => tiles.some((q) => q.item && q.item.k === 'ing' && q.item.st === st) || k.chefs.some((c) => c.hold && c.hold.k === 'ing' && c.hold.st === st);
    const pot = tiles.find((q) => q.item && q.item.k === 'pot');
    const potN = pot ? pot.item.n : 0;
    const soupPlate = k.chefs.some((c) => c.hold && c.hold.k === 'plate' && c.hold.soup) || tiles.some((q) => q.item && q.item.k === 'plate' && q.item.soup);
    const steps = [
      () => (k.chefs[k.active].hold && k.chefs[k.active].hold.k === 'ing') || anyIng('chop') || potN > 0,
      () => tiles.some((q) => q.type === 'board' && q.item && q.item.k === 'ing') || anyIng('chop') || potN > 0,
      () => anyIng('chop') || potN > 0,
      () => potN > 0,
      () => T.switched || this.g.coop || potN >= SOUP_N,
      () => potN >= SOUP_N,
      () => soupPlate || k.served > 0,
      () => k.served > 0,
    ];
    const texts = [tx('t_crate'), t('t_board'), tx('t_chop'), t('t_pot'), tx('t_switch'), t('t_more'), t('t_plate'), t('t_serve')];
    while (T.step < steps.length && steps[T.step]()) T.step++;
    if (T.step < steps.length) this.hint(texts[T.step]);
    else {
      if (!T.doneT) T.doneT = T.t;
      this.hint(T.t - T.doneT < 4 ? t('t_done') : '');
      if (T.t - T.doneT >= 4) T.mode = null;
    }
  }

  // ---------- пауза ----------
  pause() {
    const g = this.g;
    if (!g.k || g.k.finished || this.screen !== 'hud') return;
    g.pause(true);
    const m = this.modal(
      t('pause'),
      `<div class="col">
        <button class="btn big green" data-r="resume">${IC.play}${esc(t('resume'))}</button>
        <button class="btn big blue" data-r="restart">${IC.restart}${esc(t('restart'))}</button>
        <button class="btn big" data-r="menu">${IC.home}${esc(t('menu'))}</button>
        ${slidersHTML(save.data.settings, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}
        <div class="ctrl"><b>${esc(t('controls'))}</b><small>${esc(input.isTouch ? t('ctrlTouch') : t('ctrlKeys'))}</small></div>
      </div>`,
      () => g.pause(false)
    );
    bindSliders(m, save.data.settings, () => save.write());
    m.querySelector('[data-r=resume]').onclick = () => {
      this.closeModal();
      g.pause(false);
    };
    m.querySelector('[data-r=restart]').onclick = () => {
      this.closeModal();
      g.startLevel(g.k.idx);
    };
    m.querySelector('[data-r=menu]').onclick = () => {
      this.closeModal();
      this.menu();
    };
  }

  // ---------- итоги ----------
  results(res) {
    const s = save.data;
    const L = LEVELS[res.idx];
    const canNext = res.idx + 1 < LEVELS.length && save.open(res.idx + 1);
    const notes = [];
    if (res.best && res.score > 0) notes.push(t('newBest'));
    if (res.unlocked) {
      const nw = (res.idx + 1) % PER_WORLD === 0;
      notes.push(nw ? t('unlockedWorld', { n: t('theme_' + LEVELS[res.idx + 1].theme) }) : t('unlockedLevel'));
    }
    const big = [0, 1, 2].map((i) => `<i class="bstar s${i}" data-i="${i}">${IC.starE}<b>${IC.star}</b></i>`).join('');
    this.set(
      `<div class="results">
        <div class="rpanel receipt">
          <div class="rhead"><b>${esc(t('title'))}</b><span>${esc(t('theme_' + L.theme))} · ${esc(t('levelN', { n: res.idx + 1 }))}</span></div>
          <div class="bstars">${big}</div>
          <div class="rscore"><span>${esc(t('total'))}</span><b id="rsc">0</b></div>
          ${notes.map((n) => `<div class="rnote">${esc(n)}</div>`).join('')}
          ${res.stars === 0 ? `<div class="rneed">${esc(t('needStar'))} <b>${fmt(L.stars[0])}</b></div>` : ''}
          <div class="rstats">
            <div><span>${esc(t('served'))}</span><b>${res.served}</b></div>
            <div><span>${esc(t('missedN'))}</span><b>${res.missed}</b></div>
            <div><span>${esc(t('tips'))}</span><b>${fmt(res.tips)}</b></div>
          </div>
          <div class="rrew"><div class="chip big-chip">${IC.coin}<b id="rcoins">+${fmt(res.coins)}</b></div>
            ${res.coins > 0 ? `<button class="btn mid blue" id="rx2">${IC.ad}${esc(t('x2'))}</button>` : ''}</div>
          <div class="row rbtns">
            <button class="btn big" data-r="levels">${IC.grid}</button>
            <button class="btn big blue" data-r="again">${IC.restart}<span>${esc(t('again'))}</span></button>
            ${canNext ? `<button class="btn big green" data-r="next"><span>${esc(t('next'))}</span>${IC.fwd}</button>` : ''}
          </div>
        </div>
      </div>`,
      'results'
    );
    const R = this.root;
    // счёт набегает, звёзды загораются по очереди
    const sc = R.querySelector('#rsc');
    const t0 = performance.now();
    const dur = 1100;
    let lit = 0;
    const tick = () => {
      if (!sc.isConnected) return;
      const p = Math.min(1, (performance.now() - t0) / dur);
      const v = Math.round(res.score * (1 - Math.pow(1 - p, 3)));
      sc.textContent = fmt(v);
      while (lit < res.stars && v >= L.stars[lit]) {
        R.querySelector(`.bstar.s${lit}`).classList.add('on');
        audio.play('star', lit + 1);
        lit++;
      }
      if (p < 1) requestAnimationFrame(tick);
      else audio.play(res.stars > 0 ? 'win' : 'lose');
    };
    requestAnimationFrame(tick);
    const x2 = R.querySelector('#rx2');
    if (x2)
      x2.onclick = () => {
        x2.disabled = true;
        this.g.rewarded(() => {
          s.coins += res.coins;
          save.write();
          audio.play('coin');
          R.querySelector('#rcoins').textContent = '+' + fmt(res.coins * 2);
          x2.remove();
        });
      };
    const go = (fn) => this.g.maybeInterstitial(fn);
    R.querySelector('[data-r=levels]').onclick = () =>
      go(() => {
        this.worldIdx = Math.floor((canNext ? res.idx + 1 : res.idx) / PER_WORLD);
        this.levels();
      });
    R.querySelector('[data-r=again]').onclick = () => go(() => this.g.startLevel(res.idx));
    const nx = R.querySelector('[data-r=next]');
    if (nx)
      nx.onclick = () =>
        go(() => {
          this.worldIdx = Math.floor((res.idx + 1) / PER_WORLD);
          this.levels();
          this.intro(res.idx + 1);
        });
  }
}

// повара стоят в разных частях кухни (нельзя дойти друг до друга)
function isSplit(map) {
  const H = map.length;
  const at = (x, z) => (map[z] && map[z][x]) || ' ';
  const walk = (c) => c === '.' || c === 'i' || c === '1' || c === '2';
  let sx = -1,
    sz = -1;
  map.forEach((row, z) => {
    const x = row.indexOf('1');
    if (x >= 0) (sx = x), (sz = z);
  });
  if (sx < 0) return false;
  const seen = new Set([sx + ',' + sz]);
  const q = [[sx, sz]];
  while (q.length) {
    const [x, z] = q.pop();
    if (at(x, z) === '2') return false;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx,
        nz = z + dz;
      if (nz < 0 || nz >= H || seen.has(nx + ',' + nz) || !walk(at(nx, nz))) continue;
      seen.add(nx + ',' + nz);
      q.push([nx, nz]);
    }
  }
  return true;
}

function upIcon(u) {
  return { knife: IC.knife, shoes: IC.fwd, stove: IC.pot, patience: IC.clock, tips: IC.coin }[u] || IC.up;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export { LANG };
