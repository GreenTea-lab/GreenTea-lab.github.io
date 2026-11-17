// DOM-интерфейс: меню, уровни, мастерская (улучшения и костюмы), HUD, мини-карта, подсказки, пауза, итоги, настройки, магазин
import { IC } from './icons.js';
import { t, fmt, fmtTime, LANG } from './i18n.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { input } from './input.js';
import { iap, itemHTML } from './iap.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import { LEVELS, WORLDS, WORLD_COL, PER_WORLD, UPGRADES, UP_MAX, UP_COST, COSTUMES, BOSS, stats } from './data.js';
import { kidThumb, enemyThumb } from './thumbs.js';
import { CS, WALK } from './map.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const FREE_COINS = 150;
const today = () => new Date().toISOString().slice(0, 10);
const img = (src, cls = '') => (src ? `<img class="${cls}" src="${src}" alt="">` : `<i class="${cls} empty"></i>`);
const UP_IC = { bag: 'bucket', shoes: 'shoe', dash: 'dash', lantern: 'lantern', magnet: 'magnet' };

function starsHTML(n, cls = '') {
  let h = '';
  for (let i = 0; i < 3; i++) h += `<i class="st ${cls} ${i < n ? 'on' : ''}">${i < n ? IC.star : IC.starE}</i>`;
  return h;
}

// какие враги встречаются на уровне
function levelEnemies(L) {
  const out = [];
  if (L.boss) out.push(L.boss);
  for (const k of ['ghost', 'skel', 'jack', 'spider', 'witch']) if (L.en[k]) out.push(k);
  if (L.events.includes('bats')) out.push('bat');
  return out;
}

export class UI {
  constructor(game, root) {
    this.g = game;
    this.root = root;
    this.modalOpen = false;
    this.screen = '';
    this.worldIdx = undefined;
    const st = document.createElement('style');
    st.textContent = volumeCss({ accent: '#ff8a2a', track: '#4a3f66', thumb: '#fff6e8', muted: '#b8a8d8' });
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
    if (screen !== 'hud' && this.g.state === 'play') this.g.toMenu();
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
      case 'back':
        this.menu();
        break;
      case 'play':
        this.levels();
        break;
      case 'shop2':
        this.workshop(el.dataset.tab);
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
    // окно поверх экрана не пересобираем: иначе магазин закроется прямо во время покупки
    if (this.modalOpen) {
      const c = document.querySelector('.chip.coins b');
      if (c) c.textContent = fmt(save.data.coins);
      return;
    }
    if (this.screen === 'menu') this.menu();
    else if (this.screen === 'workshop') this.workshop();
    else if (this.screen === 'levels') this.levels();
    const c = document.querySelector('.chip.coins b');
    if (c) c.textContent = fmt(save.data.coins);
  }

  toast(text) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = text;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2200);
  }

  // ---------- главное меню ----------
  menu() {
    if (this.g.state !== 'menu') this.g.toMenu();
    const s = save.data;
    const giftReady = s.daily.day !== today();
    this.set(
      `${this.topbar(false)}
      <div class="menu-c">
        <div class="logo"><div class="logo-in"><div class="logo-t">${esc(t('title'))}</div><div class="logo-sub">${esc(t('subtitle'))}</div><i class="logo-p">${IC.pumpkin}</i><i class="logo-b">${IC.bat}</i></div></div>
        <div class="spacer"></div>
        <button class="btn big play" data-a="play">${IC.play}<span>${esc(t('play'))}</span></button>
        <div class="row">
          <button class="btn big blue" data-a="shop2" data-tab="up">${IC.up}<span>${esc(t('upgrades'))}</span></button>
          <button class="btn big violet" data-a="shop2" data-tab="cos">${IC.hat}<span>${esc(t('costumes'))}</span></button>
        </div>
        <div class="row small-row">
          <button class="btn round" data-a="lb" title="${esc(t('leaderboard'))}">${IC.trophy}</button>
          <button class="btn round" data-a="store" title="${esc(t('shop'))}">${IC.shop}</button>
          <button class="btn round gift ${giftReady ? 'ready' : ''}" data-a="gift" title="${esc(t('daily'))}">${IC.gift}</button>
        </div>
      </div>`,
      'menu'
    );
    if (giftReady && !this._giftShown && s.plays > 0) {
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
    const th = WORLDS[W];
    const tabs = WORLDS.map((x, i) => {
      const open = save.open(i * PER_WORLD);
      return `<button class="tab ${i === W ? 'on' : ''} ${open ? '' : 'locked'}" data-a="world" data-i="${i}" style="--c1:${WORLD_COL[x][0]};--c2:${WORLD_COL[x][1]}">${open ? '' : IC.lock}<span>${esc(t('w_' + x))}</span></button>`;
    }).join('');
    let cards = '';
    for (let k = 0; k < PER_WORLD; k++) {
      const i = W * PER_WORLD + k;
      const L = LEVELS[i];
      const open = save.open(i);
      const rec = s.levels[i];
      const ens = levelEnemies(L)
        .slice(0, 3)
        .map((e) => img(enemyThumb(e), 'eimg'))
        .join('');
      cards += `<button class="lcard ${open ? '' : 'locked'} ${L.boss ? 'boss' : ''}" data-a="level" data-i="${i}" style="--c1:${WORLD_COL[th][0]};--c2:${WORLD_COL[th][1]}">
        <div class="lnum">${i + 1}</div>
        ${L.boss ? `<div class="lboss">${esc(t('boss'))}</div>` : ''}
        <div class="lens">${ens}</div>
        ${open ? `<div class="lstars">${starsHTML(rec ? rec.stars : 0)}</div><div class="lbest">${rec && rec.best ? `${IC.candy}<b>${fmt(rec.best)}</b>` : `<span class="muted">${esc(t('noRecord'))}</span>`}</div>` : `<div class="llock">${IC.lock}</div>`}
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

  // окно перед уровнем: цели, враги, особенности
  intro(i) {
    const L = LEVELS[i];
    const rec = save.data.levels[i];
    const ens = levelEnemies(L)
      .map((e) => `<div class="enemy">${img(enemyThumb(e), 'eimg')}<div><b>${esc(t('e_' + e))}</b><small>${esc(t('e_' + e + '_d', { n: L.boss ? BOSS[L.boss].hp : '' }))}</small></div></div>`)
      .join('');
    const goals = L.boss
      ? `<div class="goal">${starsHTML(1, 'sm')}<b>${esc(t('goalBoss'))}</b></div><div class="goal">${starsHTML(2, 'sm')}${IC.candy}<b>${fmt(L.goal[1])}</b></div><div class="goal">${starsHTML(3, 'sm')}${IC.candy}<b>${fmt(L.goal[2])}</b></div>`
      : L.goal.map((v, k) => `<div class="goal">${starsHTML(k + 1, 'sm')}${IC.candy}<b>${fmt(v)}</b></div>`).join('');
    const m = this.modal(
      t('levelN', { n: i + 1 }) + ' · ' + t('w_' + L.world),
      `<div class="itask">${esc(L.boss ? t('taskBoss', { n: BOSS[L.boss].hp }) : t('task'))}</div>
      <div class="igoals"><div class="itime">${IC.clock}<b>${fmtTime(L.time)}</b></div>${goals}</div>
      <div class="isec"><div class="ihead">${esc(t('whoIsThere'))}</div><div class="enemies">${ens}</div></div>
      ${rec && rec.best ? `<div class="muted">${esc(t('best'))}: ${fmt(rec.best)}</div>` : ''}
      <button class="btn big green" data-go="1">${IC.play}${esc(t('start'))}</button>`,
      null,
      'intro'
    );
    m.querySelector('[data-go]').onclick = () => {
      this.closeModal();
      this.g.startLevel(i);
    };
  }

  // ---------- мастерская: улучшения и костюмы ----------
  workshop(tab) {
    if (tab) this.wTab = tab;
    if (!this.wTab) this.wTab = 'up';
    const s = save.data;
    let body = '';
    if (this.wTab === 'up') {
      const st0 = stats(s.up);
      body = UPGRADES.map((u) => {
        const lvl = s.up[u] || 0;
        const cost = UP_COST[lvl];
        const pips = Array.from({ length: UP_MAX }, (_, k) => `<i class="${k < lvl ? 'on' : ''}"></i>`).join('');
        const val = { bag: st0.bag, shoes: '+' + lvl * 5 + '%', dash: st0.dashCd.toFixed(1) + t('sec'), lantern: st0.lantern + t('sec'), magnet: '+' + lvl * 30 + '%' }[u];
        const btn = lvl >= UP_MAX ? `<button class="btn upg max" disabled>${esc(t('maxed'))}</button>` : `<button class="btn upg ${s.coins < cost ? 'poor' : ''}" data-up="${u}">${IC.up}<b>${fmt(cost)}</b>${IC.coin}</button>`;
        return `<div class="uprow"><div class="upic">${IC[UP_IC[u]]}</div><div class="uptx"><b>${esc(t('up_' + u))} <em>${esc(val)}</em></b><small>${esc(t('up_' + u + '_d'))}</small><div class="pips">${pips}</div></div>${btn}</div>`;
      }).join('');
    } else {
      body = `<div class="cgrid">${COSTUMES.map((c) => {
        const own = s.costumes.includes(c.id);
        const on = s.costume === c.id;
        const foot = on ? `<span class="wear">${IC.check}${esc(t('wearing'))}</span>` : own ? `<span class="muted">${esc(t('choose'))}</span>` : `<span class="price ${s.coins < c.price ? 'poor' : ''}"><b>${fmt(c.price)}</b>${IC.coin}</span>`;
        return `<button class="ccard ${own ? '' : 'notown'} ${on ? 'sel' : ''}" data-cos="${c.id}">${img(kidThumb(c.id), 'cimg')}<b>${esc(t('c_' + c.id))}</b>${foot}</button>`;
      }).join('')}</div>`;
    }
    this.set(
      `${this.topbar(true)}
      <div class="ws-c">
        <div class="ws-panel">
          <div class="ktabs"><button class="ktab ${this.wTab === 'up' ? 'on' : ''}" data-tab="up">${IC.up}${esc(t('upgrades'))}</button><button class="ktab ${this.wTab === 'cos' ? 'on' : ''}" data-tab="cos">${IC.hat}${esc(t('costumes'))}</button></div>
          <div class="kbody">${body}</div>
        </div>
      </div>`,
      'workshop'
    );
    const R = this.root;
    R.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => this.workshop(b.dataset.tab)));
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
      this.workshop();
    }));
    R.querySelectorAll('[data-cos]').forEach((b) => (b.onclick = () => {
      const id = b.dataset.cos;
      const c = COSTUMES.find((x) => x.id === id);
      if (!s.costumes.includes(id)) {
        if (s.coins < c.price) return this.poor();
        s.coins -= c.price;
        s.costumes.push(id);
        audio.play('buy');
      } else audio.play('select');
      s.costume = id;
      save.write();
      this.g.buildMenuScene();
      this.workshop();
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
      <div class="ctrl"><b>${esc(t('howTo'))}</b><small>${esc(t('howToTxt'))}</small><small>${esc(input.isTouch ? t('ctrlTouch') : t('ctrlKeys'))}</small></div>`,
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
      box.innerHTML = `<div class="muted">${esc(t('lbOffline'))}</div><div class="lbrow me"><b>—</b><span>${esc(t('you'))}</span><i>${fmt(save.total())}</i></div>`;
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
    if (s.daily.day === today()) return this.toast(t('dailyDone'));
    const amount = 120 + Math.min(6, s.daily.streak || 0) * 20;
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
  hud() {
    const touch = input.isTouch;
    const w = this.g.w;
    const L = w.lv;
    this.set(
      `<div class="hud ${touch ? 'touch' : ''}">
        <div class="h-tl">
          <div class="bagchip" id="hbag">${IC.bucket}<div class="bagtx"><b id="hbagn">0</b><small>/${w.st.bag}</small></div><div class="bagbar"><i id="hbagbar"></i></div></div>
          <div class="pwchip" id="hpw">${IC.lantern}<div class="pwbar"><i id="hpwbar"></i></div></div>
        </div>
        <div class="h-tc">
          <div class="goalbar" id="hgoal">${IC.cauldron}<div class="gtrack"><i id="hgfill"></i>${L.boss ? '' : L.goal.map((v, k) => `<span class="gmark" style="left:${(v / L.goal[2]) * 100}%">${IC.star}</span>`).join('')}</div><b id="hbank">0</b></div>
          ${L.boss ? `<div class="bossbar" id="hboss"><span>${esc(t('e_' + L.boss))}</span><div class="bhp" id="hbhp"></div></div>` : ''}
        </div>
        <div class="h-tr">
          <div class="timer" id="htime">${IC.clock}<b>0:00</b></div>
          <button class="btn round small" id="hpause">${IC.pause}</button>
        </div>
        <canvas class="minimap" id="hmap"></canvas>
        <div class="homearrow" id="harrow">${IC.cauldron}<i></i></div>
        <div class="banner-box" id="hbanner"></div>
        <div class="hint" id="hhint"></div>
        ${
          touch
            ? `<div class="jzone" id="jzone"><div class="jbase" id="jbase"><div class="jknob" id="jknob"></div></div></div>
        <button class="dashbtn" id="bdash">${IC.dash}<i class="cd" id="bdcd"></i></button>`
            : `<div class="keys-hint">${esc(t('keysShort'))}</div>`
        }
      </div>`,
      'hud'
    );
    const R = this.root;
    if (touch) {
      input.bindJoy(R.querySelector('#jzone'), R.querySelector('#jbase'), R.querySelector('#jknob'));
      input.bindDash(R.querySelector('#bdash'));
    }
    R.querySelector('#hpause').onclick = () => this.pause();
    this.el = {
      bagn: R.querySelector('#hbagn'),
      bag: R.querySelector('#hbag'),
      bagbar: R.querySelector('#hbagbar'),
      pw: R.querySelector('#hpw'),
      pwbar: R.querySelector('#hpwbar'),
      bank: R.querySelector('#hbank'),
      gfill: R.querySelector('#hgfill'),
      time: R.querySelector('#htime'),
      timeB: R.querySelector('#htime b'),
      bhp: R.querySelector('#hbhp'),
      map: R.querySelector('#hmap'),
      arrow: R.querySelector('#harrow'),
      dcd: R.querySelector('#bdcd'),
      floats: R.querySelector('#floats'),
      hint: R.querySelector('#hhint'),
    };
    this.mapBase = null;
    this.mapT = 0;
    this._stars = -1;
    this.tut = { step: 0, t: 0, done: {} };
    this.hint('');
    if (w.t < 0.1) {
      this.banner(L.boss ? t('e_' + L.boss) : t('levelN', { n: L.idx + 1 }), true);
    }
  }

  banner(text, big) {
    const b = this.root.querySelector('#hbanner');
    if (!b) return;
    b.innerHTML = `<div class="banner ${big ? 'big' : ''}">${esc(text)}</div>`;
    clearTimeout(this._bt);
    this._bt = setTimeout(() => (b.innerHTML = ''), big ? 1500 : 1700);
  }

  hint(text) {
    const h = this.el && this.el.hint;
    if (!h) return;
    if (h._t === text) return;
    h._t = text;
    h.textContent = text;
    h.classList.toggle('on', !!text);
  }

  // всплывающая надпись над точкой мира
  float(x, y, z, text, cls = '') {
    const g = this.g;
    if (!g.view || !this.el) return;
    const [sx, sy, ok] = g.view.toScreen(g.camera, x, y, z, g.w_, g.h_);
    if (!ok) return;
    const d = document.createElement('div');
    d.className = 'fl ' + cls;
    d.textContent = text;
    d.style.left = sx + 'px';
    d.style.top = sy + 'px';
    this.el.floats.appendChild(d);
    setTimeout(() => d.remove(), 1100);
  }

  onFx(e, w) {
    if (this.screen !== 'hud') return;
    switch (e.t) {
      case 'treat':
        this.float(e.x, 2.4, e.z, t('treat') + ' +' + e.n, 'good');
        break;
      case 'trick':
        this.float(e.x, 2.4, e.z, t('trickTxt'), 'bad');
        break;
      case 'bank':
        this.float(w.cauldron.x, 3.2, w.cauldron.z, '+' + (e.n + e.bonus), 'bank');
        if (e.bonus) setTimeout(() => this.float(w.cauldron.x, 3.9, w.cauldron.z, (e.full ? t('fullBag') + ' ' : t('bonus') + ' ') + '+' + e.bonus, 'bonus'), 250);
        break;
      case 'hurt':
        if (e.lose) this.float(e.x, 2, e.z, '-' + e.lose, 'bad');
        break;
      case 'catch':
        this.float(e.x, 2, e.z, '+' + e.n, 'good');
        break;
      case 'full':
        this.float(w.p.x, 2.2, w.p.z, t('bagFull'), 'warn');
        break;
      case 'power':
        this.banner(t('powerOn'));
        break;
      case 'bats':
        if (!w.lv.boss) this.banner(t('evBats'));
        break;
      case 'rain':
        this.banner(t('evRain'));
        this.rainAt = { x: e.x, z: e.z, t: w.t };
        break;
      case 'party':
        this.banner(t('evParty'));
        break;
      case 'midnight':
        this.banner(t('midnight'), true);
        break;
      case 'bossHit':
        this.float(e.x, 3.5, e.z, t('bossHit'), 'good');
        break;
      case 'bossDown':
        this.banner(t('bossDown'), true);
        break;
    }
  }

  hudUpdate(w, v) {
    const e = this.el;
    if (this.screen !== 'hud' || !e) return;
    const P = w.p;
    const left = Math.max(0, w.time - w.t);
    const tl = fmtTime(left);
    if (e._t !== tl) {
      e._t = tl;
      e.timeB.textContent = tl;
      e.time.classList.toggle('low', left <= 30);
    }
    if (e._b !== P.bag) {
      e._b = P.bag;
      e.bagn.textContent = P.bag;
      e.bagbar.style.width = (P.bag / w.st.bag) * 100 + '%';
      e.bag.classList.toggle('full', P.bag >= w.st.bag);
    }
    if (e._k !== w.banked) {
      e._k = w.banked;
      e.bank.textContent = fmt(w.banked);
      const top = w.lv.boss ? w.lv.goal[2] : w.lv.goal[2];
      e.gfill.style.width = Math.min(100, (w.banked / top) * 100) + '%';
      const st = w.lv.boss ? 0 : w.stars();
      if (this._stars >= 0 && st > this._stars) {
        audio.play('star', st);
        this.banner(t('starGot', { n: st }));
      }
      this._stars = st;
    }
    const pw = P.powerT > 0;
    e.pw.classList.toggle('on', pw);
    if (pw) e.pwbar.style.width = (P.powerT / w.st.lantern) * 100 + '%';
    if (e.bhp && w.boss) {
      const sig = w.boss.hp;
      if (e._h !== sig) {
        e._h = sig;
        e.bhp.innerHTML = Array.from({ length: w.boss.max }, (_, k) => `<i class="${k < w.boss.hp ? 'on' : ''}"></i>`).join('');
      }
    }
    if (e.dcd) {
      const f = P.dashCd / w.st.dashCd;
      e.dcd.style.height = f * 100 + '%';
    }
    this.tutorial(w);
    // стрелка к котлу, если ведёрко почти полное и котла не видно
    const g = this.g;
    const [sx, sy, ok] = v.toScreen(g.camera, w.cauldron.x, 1.5, w.cauldron.z, g.w_, g.h_);
    const off = !ok || sx < 30 || sy < 60 || sx > g.w_ - 30 || sy > g.h_ - 30;
    const need = P.bag >= w.st.bag * 0.7 || (P.bag > 0 && left < 15 && !w.lv.boss);
    if (need && off) {
      const cx = g.w_ / 2,
        cy = g.h_ / 2;
      let dx = sx - cx,
        dy = sy - cy;
      if (!ok) (dx = -dx), (dy = -dy);
      const a = Math.atan2(dy, dx);
      const rx = g.w_ / 2 - 46,
        ry = g.h_ / 2 - 70;
      const k = Math.min(rx / Math.abs(Math.cos(a) || 1e-6), ry / Math.abs(Math.sin(a) || 1e-6));
      e.arrow.style.transform = `translate(${cx + Math.cos(a) * k}px,${cy + Math.sin(a) * k}px)`;
      e.arrow.querySelector('i').style.transform = `rotate(${a}rad)`;
      e.arrow.classList.add('on');
    } else e.arrow.classList.remove('on');
    this.mapT -= 1 / 60;
    if (this.mapT <= 0) {
      this.mapT = 0.08;
      this.minimap(w);
    }
  }

  // ---------- мини-карта ----------
  minimap(w) {
    const cv = this.el.map;
    const m = w.map;
    const small = this.g.w_ < 700 || this.g.h_ < 500;
    const k = Math.max(3, Math.floor((small ? 96 : 150) / Math.max(m.W, m.H)));
    const W = m.W * k,
      H = m.H * k;
    if (!this.mapBase) {
      cv.width = W;
      cv.height = H;
      const b = document.createElement('canvas');
      b.width = W;
      b.height = H;
      const g = b.getContext('2d');
      g.fillStyle = 'rgba(30,22,52,.85)';
      g.fillRect(0, 0, W, H);
      for (let j = 0; j < m.H; j++)
        for (let i = 0; i < m.W; i++) {
          if (m.grid[j * m.W + i] !== WALK) continue;
          g.fillStyle = '#8f84b8';
          g.fillRect(i * k, j * k, k, k);
        }
      const hb = m.home;
      g.fillStyle = '#ffb43a';
      g.beginPath();
      g.arc(hb.cx * k, hb.cy * k, k * 1.1, 0, 7);
      g.fill();
      this.mapBase = b;
    }
    const g = cv.getContext('2d');
    g.clearRect(0, 0, W, H);
    g.drawImage(this.mapBase, 0, 0);
    const dot = (x, z, r, c) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc((x / CS) * k, (z / CS) * k, r, 0, 7);
      g.fill();
    };
    for (const h of w.houses) if (h.lit) dot(h.x, h.z, k * 0.55, '#ff6aa8');
    for (const L of w.lanterns) if (L.on) dot(L.x, L.z, k * 0.6, '#fff2a0');
    if (this.rainAt && w.t - this.rainAt.t < 18) dot(this.rainAt.x, this.rainAt.z, k * (0.7 + Math.sin(w.t * 8) * 0.25), '#7ad0ff');
    for (const e of w.enemies) {
      if (e.dead > 0 || e.type === 'witch' || (e.type === 'spider' && e.phase === 'up')) continue;
      dot(e.x, e.z, e.type === 'boss' ? k : k * 0.45, w.power ? '#8ab8ff' : e.type === 'boss' ? '#ff4a6a' : '#f4f0ff');
    }
    const P = w.p;
    g.save();
    g.translate((P.x / CS) * k, (P.z / CS) * k);
    g.rotate(-P.dir + Math.PI);
    g.fillStyle = '#9be15d';
    g.strokeStyle = '#1a1028';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, -k * 1.1);
    g.lineTo(k * 0.8, k * 0.8);
    g.lineTo(-k * 0.8, k * 0.8);
    g.closePath();
    g.fill();
    g.stroke();
    g.restore();
  }

  // ---------- обучение по ходу уровня ----------
  tutorial(w) {
    const L = w.lv;
    const T = this.tut;
    const P = w.p;
    const touch = input.isTouch;
    const done = save.data.tut;
    let msg = '';
    if (L.tut && !done.basic) {
      if (T.step === 0) {
        msg = touch ? t('t_moveT') : t('t_move');
        if (P.moving) (T.step = 1), (T.t = w.t);
      } else if (T.step === 1) {
        msg = t('t_house');
        if (w.knocks > 0) T.step = 2;
      } else if (T.step === 2) {
        msg = t('t_bank');
        if (w.banked > 0) (T.step = 3), (T.t = w.t);
      } else if (T.step === 3) {
        msg = t('t_ghost');
        if (w.t - T.t > 5) (T.step = 4), (T.t = w.t);
      } else if (T.step === 4) {
        msg = touch ? t('t_dashT') : t('t_dash');
        if (w.t - T.t > 6) {
          T.step = 5;
          done.basic = 1;
          save.write();
        }
      }
    }
    const once = (key, cond, text, dur = 5) => {
      if (done[key] === 2) return;
      if (!T.done[key] && cond) T.done[key] = w.t;
      if (T.done[key] !== undefined && w.t - T.done[key] < dur) msg = msg || text;
      else if (T.done[key] !== undefined && !done[key]) {
        done[key] = 2;
        save.write();
      }
    };
    if (!msg) {
      if (L.tutLantern) once('lantern', w.t > 2, t('t_lantern'), 6);
      if (L.tutBats) once('bats', w.bats.length > 0, t('t_bats'), 4);
      if (L.tutTrick) once('trick', w.t > 1, t('t_trick'), 6);
      if (L.tutSkel) once('skel', w.t > 1, t('t_skel'), 6);
      if (L.tutSpider) once('spider', w.t > 1, t('t_spider'), 6);
      if (L.tutJack) once('jack', w.t > 1, t('t_jack'), 6);
      if (L.tutWitch) once('witch', w.t > 1, t('t_witch'), 6);
      if (L.boss) once('boss_' + L.boss, w.t > 0.5, t('t_boss', { n: BOSS[L.boss].hp }), 7);
    }
    if (!msg && P.bag >= w.st.bag) msg = t('bagFullGo');
    this.hint(msg);
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
      <div class="row"><button class="btn mid blue" data-re="1">${IC.restart}${esc(t('restart'))}</button><button class="btn mid" data-m="1">${IC.home}${esc(t('menu'))}</button></div>`,
      () => g.pause(false),
      'pausem'
    );
    bindSliders(m, s.settings, () => save.write());
    m.querySelector('[data-r]').onclick = () => {
      this.closeModal();
      g.pause(false);
    };
    m.querySelector('[data-re]').onclick = () => {
      this.closeModal();
      g.adBreak(() => g.startLevel(g.levelIdx));
    };
    m.querySelector('[data-m]').onclick = () => {
      this.closeModal();
      g.adBreak(() => this.menu());
    };
  }

  // ---------- не хватило конфет / время вышло ----------
  lose(w) {
    const g = this.g;
    const need = w.lv.boss ? 0 : Math.max(0, w.lv.goal[0] - w.banked);
    const m = this.modal(
      t('timeUp'),
      `<div class="lose-ic">${IC.ghost}</div>
      <div class="itask">${esc(w.lv.boss ? t('bossEscaped') : t('needMore', { n: need }))}</div>
      <button class="btn big green" data-more="1">${IC.ad}${esc(t('more20'))}</button>
      <button class="btn mid" data-res="1">${esc(t('giveUp'))}</button>`,
      false,
      'losem'
    );
    m.querySelector('[data-more]').onclick = () => {
      this.closeModal();
      g.rewarded(
        () => g.addTime(),
        (ok) => {
          if (!ok) g.finishLevel();
        }
      );
    };
    m.querySelector('[data-res]').onclick = () => {
      this.closeModal();
      g.finishLevel();
    };
  }

  // ---------- итоги ----------
  results(r) {
    const g = this.g;
    const L = LEVELS[r.idx];
    const next = r.idx + 1 < LEVELS.length && save.open(r.idx + 1);
    let doubled = false;
    const m = this.modal(
      r.w.won ? t('levelDone') : t('levelFail'),
      `<div class="rstars">${starsHTML(r.stars, 'lg')}</div>
      <div class="rbank">${IC.cauldron}<b>${fmt(r.w.banked)}</b><small>${esc(t('inCauldron'))}</small></div>
      ${r.newBest ? `<div class="newbest">${esc(t('newBest'))}</div>` : ''}
      <div class="rstats"><span>${IC.ghost}${esc(t('caught'))}: <b>${r.w.caught}</b></span><span>${IC.home}${esc(t('treats'))}: <b>${r.w.knocks}</b></span></div>
      <div class="rcoins">${IC.coin}<b id="rcn">+${fmt(r.coins)}</b>${r.coins > 0 ? `<button class="btn mid blue" data-x2="1">${IC.ad}x2</button>` : ''}</div>
      ${r.unlocked ? `<div class="unl">${esc(t(r.idx + 1 < LEVELS.length && (r.idx + 1) % PER_WORLD === 0 ? 'unlockedWorld' : 'unlockedLevel', { n: t('w_' + LEVELS[r.idx + 1].world) }))}</div>` : ''}
      <div class="row">
        <button class="btn mid" data-m="1">${IC.home}${esc(t('menu'))}</button>
        <button class="btn mid blue" data-re="1">${IC.restart}${esc(t('again'))}</button>
        ${next ? `<button class="btn mid green" data-n="1">${esc(t('next'))}${IC.next}</button>` : ''}
      </div>`,
      false,
      'resm'
    );
    // звёзды по одной
    m.querySelectorAll('.st.lg').forEach((s, k) => {
      if (k < r.stars) {
        s.classList.add('pop');
        s.style.animationDelay = 0.25 + k * 0.3 + 's';
        setTimeout(() => audio.play('star', k), 250 + k * 300);
      }
    });
    const x2 = m.querySelector('[data-x2]');
    if (x2)
      x2.onclick = () => {
        if (doubled) return;
        x2.disabled = true;
        g.rewarded(() => {
          doubled = true;
          save.data.coins += r.coins;
          save.write();
          audio.play('coin');
          const c = m.querySelector('#rcn');
          if (c) c.textContent = '+' + fmt(r.coins * 2);
          x2.remove();
        });
      };
    m.querySelector('[data-m]').onclick = () => {
      this.closeModal();
      g.adBreak(() => this.menu());
    };
    m.querySelector('[data-re]').onclick = () => {
      this.closeModal();
      g.adBreak(() => g.startLevel(r.idx));
    };
    const n = m.querySelector('[data-n]');
    if (n)
      n.onclick = () => {
        this.closeModal();
        this.worldIdx = Math.floor((r.idx + 1) / PER_WORLD);
        g.adBreak(() => {
          this.levels();
          this.intro(r.idx + 1);
        });
      };
  }
}
