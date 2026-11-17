// Интерфейс в DOM: меню, ночи, лавка, рекорды, настройки, HUD, пауза с планом дома, итоги
import { t, lang } from './i18n.js';
import { IC } from './icons.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { iap, priceHTML } from './iap.js';
import { slidersHTML, bindSliders } from './volume.js';
import { UPGRADES, COLORS, NIGHTS, STORE_BONUS } from './data.js';
import { ROOMS, DOORS, EXIT, W, H } from './map.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmtT = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const NEW_ROOMS = { 2: ['r_bed1', 'r_bed2'], 3: ['r_library', 'r_study'], 4: ['r_kids', 'r_pantry'], 5: ['r_cellar'] };

export class UI {
  constructor(game, root) {
    this.g = game;
    this.root = root;
    this.screen = '';
    this.modalOpen = false;
    root.innerHTML = `<div id="vig"></div><div id="slats"></div><div id="scare"></div><div id="white"></div><div class="layer" id="L"></div><div id="toasts"></div>`;
    this.L = root.querySelector('#L');
    this.vig = root.querySelector('#vig');
    this.slats = root.querySelector('#slats');
    this.scareEl = root.querySelector('#scare');
    this.white = root.querySelector('#white');
    this.toasts = root.querySelector('#toasts');
    this.nightmare = false;
    // захват мыши
    game.input.onLockChange = () => this.updateLockHint();
    game.input.onStick = (s) => this._stick(s);
  }

  click() {
    audio.play('click');
  }

  coinsChip() {
    return `<button class="chip coins" data-a="store">${IC.coin}<b>${save.data.coins}</b><i class="plus">${IC.plus}</i></button>`;
  }

  refresh() {
    this.root.querySelectorAll('.coins b').forEach((e) => (e.textContent = save.data.coins));
    if (this.screen === 'shop') this.showShop(this.shopTab);
  }

  // ---------- меню ----------
  showMenu() {
    this.screen = 'menu';
    this.closeModal();
    this.vig.className = 'menu';
    this.slats.classList.remove('on');
    const n = this.g.nextNight();
    const allDone = save.done(5);
    this.L.innerHTML = `
      <div class="topbar"><div></div>${this.coinsChip()}</div>
      <div class="logo"><div class="logo-t">${esc(t('title'))}</div><div class="logo-s">${esc(t('sub'))}</div></div>
      <div class="menu-list">
        <button class="brass play" data-a="play">${IC.torch}<span>${esc(t('play'))}<small>${esc(t('cont', { n }))}${allDone ? ' ✓' : ''}</small></span></button>
        <button class="mitem" data-a="nights">${IC.moon}<span>${esc(t('nights'))}</span></button>
        <button class="mitem" data-a="shop">${IC.bag}<span>${esc(t('shop'))}</span></button>
        <button class="mitem" data-a="records">${IC.trophy}<span>${esc(t('records'))}</span></button>
        <button class="mitem" data-a="settings">${IC.gear}<span>${esc(t('settings'))}</span></button>
      </div>`;
    this._bind(this.L, {
      play: () => this.showIntro(n, false),
      nights: () => this.showNights(),
      shop: () => this.showShop('up'),
      records: () => this.showRecords(),
      settings: () => this.showSettings(),
      store: () => this.showShop('coins'),
    });
  }

  _bind(el, map) {
    el.querySelectorAll('[data-a]').forEach((b) => {
      const f = map[b.dataset.a];
      if (f)
        b.onclick = (e) => {
          e.stopPropagation();
          audio.unlock();
          this.click();
          f(b);
        };
    });
  }

  // ---------- выбор ночи ----------
  showNights() {
    this.screen = 'nights';
    const nmOpen = save.nightmareOpen();
    const book = this.nightmare ? save.data.nm : save.data.nights;
    let cards = '';
    for (let i = 1; i <= 5; i++) {
      const open = save.open(i) && (!this.nightmare || nmOpen);
      const rec = book[i];
      cards += `<button class="note ${open ? '' : 'locked'} ${rec && rec.done ? 'done' : ''}" data-a="n" data-n="${i}" style="--r:${[-2.5, 1.8, -1, 2.4, -1.6][i - 1]}deg">
        <span class="tape"></span>
        <b class="nn">${i}</b><span class="nl">${esc(t('night'))}</span>
        <span class="nk">${Array.from({ length: NIGHTS[i].keys }, () => IC.key).join('')}</span>
        ${open ? (rec && rec.done ? `<span class="nb">${IC.check}${esc(t('best'))}: ${rec.best}</span>` : `<span class="nb new">…</span>`) : `<span class="nlock">${IC.lock}</span>`}
      </button>`;
    }
    this.L.innerHTML = `
      <div class="topbar"><button class="round" data-a="back">${IC.back}</button>${this.coinsChip()}</div>
      <div class="panel-c">
        <div class="ttl">${esc(t('nights'))}</div>
        <div class="notes">${cards}</div>
        <label class="nm ${nmOpen ? '' : 'off'}"><input type="checkbox" ${this.nightmare ? 'checked' : ''} ${nmOpen ? '' : 'disabled'}><span class="sw"></span><span>${IC.skull}<b>${esc(t('nightmare'))}</b><small>${esc(nmOpen ? t('nightmareOn') : t('nightmareLocked'))}</small></span></label>
      </div>`;
    this._bind(this.L, { back: () => this.showMenu(), store: () => this.showShop('coins') });
    this.L.querySelectorAll('.note').forEach((b) => {
      b.onclick = () => {
        audio.unlock();
        const n = +b.dataset.n;
        if (b.classList.contains('locked')) {
          audio.play('deny');
          this.toast(t('locked'));
          return;
        }
        this.click();
        this.showIntro(n, this.nightmare);
      };
    });
    const cb = this.L.querySelector('.nm input');
    if (cb)
      cb.onchange = () => {
        this.nightmare = cb.checked;
        this.click();
        this.showNights();
      };
  }

  // записка перед ночью
  showIntro(n, nightmare) {
    const k = NIGHTS[n].keys;
    const rooms = (NEW_ROOMS[n] || []).map((r) => t(r)).join(', ');
    const ctrl = this.g.mobile ? t('ctrlTouch') : t('ctrlPC');
    this.modal(
      `<div class="paper intro">
        <div class="pin"></div>
        <div class="ph">${esc(t('nightN', { n }))}${nightmare ? ` · <span class="red">${esc(t('nightmare'))}</span>` : ''}</div>
        <p class="hand">${esc(t('note' + n))}</p>
        <div class="goal">${IC.key}<span>${esc(t(k >= 5 ? 'goal5' : 'goal', { k }))}</span></div>
        ${rooms ? `<div class="newr">${esc(t('newRooms', { r: rooms }))}</div>` : ''}
        <div class="ctrl">${ctrl}</div>
        <div class="row"><button class="ghost" data-a="x">${esc(t('back'))}</button><button class="brass" data-a="go">${IC.torch}<span>${esc(t('start'))}</span></button></div>
      </div>`,
      { x: () => this.closeModal(), go: () => (this.closeModal(), this.g.startNight(n, nightmare), this.g.input.requestLock()) },
    );
  }

  // ---------- лавка ----------
  showShop(tab = 'up') {
    this.screen = 'shop';
    this.shopTab = tab;
    const d = save.data;
    let body = '';
    if (tab === 'up') {
      body = UPGRADES.map((u) => {
        const lv = d.up[u.id];
        const maxed = lv >= u.max;
        const cost = maxed ? 0 : u.cost[lv];
        return `<div class="srow"><div class="si">${{ battery: IC.torch, stamina: IC.run, quiet: IC.hand, beam: IC.moon, flash: IC.bolt }[u.id]}</div>
          <div class="st"><b>${esc(t('up_' + u.id))}</b><small>${esc(t('up_' + u.id + '_d'))}</small><span class="pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span></div>
          ${maxed ? `<span class="maxed">${esc(t('max'))}</span>` : `<button class="buy ${d.coins >= cost ? '' : 'poor'}" data-a="up" data-id="${u.id}">${IC.coin}${cost}</button>`}</div>`;
      }).join('');
    } else if (tab === 'col') {
      body = `<div class="swatches">${COLORS.map((c) => {
        const own = d.colors.includes(c.id);
        const on = d.color === c.id;
        const hex = '#' + c.c.toString(16).padStart(6, '0');
        return `<button class="sw-c ${on ? 'on' : ''}" data-a="col" data-id="${c.id}"><span class="beam" style="--c:${hex}"></span><b>${esc(t('col_' + c.id))}</b><small>${on ? esc(t('equipped')) : own ? esc(t('equip')) : `${IC.coin}${c.cost}`}</small></button>`;
      }).join('')}</div>`;
    } else {
      const items = iap.items();
      const wait = Math.max(0, (d.freeAdAt || 0) - Date.now());
      body = `<button class="srow freead" data-a="free" ${wait ? 'disabled' : ''}><div class="si">${IC.ad}</div><div class="st"><b>${esc(wait ? t('freeWait', { m: Math.ceil(wait / 60000) }) : t('freeCoins', { n: STORE_BONUS }))}</b></div></button>`;
      body += items.length
        ? items.map((x) => `<div class="srow"><div class="si">${x.p.imageURI ? `<img src="${esc(x.p.imageURI)}" alt="">` : x.id === 'disable_ads' ? IC.ad : IC.coin}</div><div class="st"><b>${esc(x.p.title)}</b><small>${esc(x.p.description)}</small></div>${x.owned ? `<span class="maxed">${esc(t('owned'))}</span>` : `<button class="buy" data-a="iap" data-id="${esc(x.id)}">${priceHTML(x.p)}</button>`}</div>`).join('')
        : `<div class="empty">${esc(t('storeEmpty'))}</div>`;
    }
    this.L.innerHTML = `
      <div class="topbar"><button class="round" data-a="back">${IC.back}</button>${this.coinsChip()}</div>
      <div class="panel-c">
        <div class="ttl">${esc(t('shop'))}</div>
        <div class="tabs"><button class="tab ${tab === 'up' ? 'on' : ''}" data-a="tu">${esc(t('upgrades'))}</button><button class="tab ${tab === 'col' ? 'on' : ''}" data-a="tc">${esc(t('colors'))}</button><button class="tab ${tab === 'coins' ? 'on' : ''}" data-a="tm">${esc(t('buyCoins'))}</button></div>
        <div class="paper shop">${body}</div>
      </div>`;
    this._bind(this.L, {
      back: () => this.showMenu(),
      store: () => this.showShop('coins'),
      tu: () => this.showShop('up'),
      tc: () => this.showShop('col'),
      tm: () => this.showShop('coins'),
      up: (b) => {
        const u = UPGRADES.find((q) => q.id === b.dataset.id);
        const lv = d.up[u.id];
        if (d.coins < u.cost[lv]) return this.poor();
        d.coins -= u.cost[lv];
        d.up[u.id]++;
        save.write();
        audio.play('buy');
        this.showShop('up');
      },
      col: (b) => {
        const c = COLORS.find((q) => q.id === b.dataset.id);
        if (!d.colors.includes(c.id)) {
          if (d.coins < c.cost) return this.poor();
          d.coins -= c.cost;
          d.colors.push(c.id);
          audio.play('buy');
        }
        d.color = c.id;
        if (this.g.player) this.g.player.setColor(c.c);
        save.write();
        this.showShop('col');
      },
      free: () => {
        sdk.showRewarded(() => {
          d.freeAdAt = Date.now() + 3 * 60000;
          this.g.addCoins(STORE_BONUS);
          audio.play('coin');
        }, () => this.screen === 'shop' && this.showShop('coins'));
      },
      iap: async (b) => {
        this.L.querySelectorAll('.buy').forEach((e) => (e.disabled = true));
        const ok = await iap.buy(b.dataset.id);
        if (ok) audio.play('buy');
        this.showShop('coins');
      },
    });
  }

  poor() {
    audio.play('deny');
    this.toast(t('notEnough'));
  }

  // ---------- рекорды ----------
  async showRecords() {
    this.screen = 'records';
    const draw = (inner) => {
      this.L.innerHTML = `
        <div class="topbar"><button class="round" data-a="back">${IC.back}</button>${this.coinsChip()}</div>
        <div class="panel-c"><div class="ttl">${esc(t('lbTitle'))}</div><div class="paper lb">${inner}<div class="lbme">${esc(t('lbYou', { n: save.total() }))}</div></div></div>`;
      this._bind(this.L, { back: () => this.showMenu(), store: () => this.showShop('coins'), login: async () => (await sdk.login()) && this.showRecords() });
    };
    draw(`<div class="empty">${esc(t('loading'))}</div>`);
    const lb = await sdk.getLeaderboard();
    if (this.screen !== 'records') return;
    let inner = '';
    if (lb.available && lb.entries.length) inner = `<ol>${lb.entries.map((e) => `<li class="${e.me ? 'me' : ''}"><i>${e.rank}</i><span>${esc(e.name || '???')}</span><b>${e.score}</b></li>`).join('')}</ol>`;
    else inner = `<div class="empty">${esc(t('lbEmpty'))}</div>`;
    if (!lb.local && !lb.authorized) inner += `<div class="row"><span class="muted">${esc(t('lbLogin'))}</span><button class="ghost" data-a="login">${esc(t('lbLoginBtn'))}</button></div>`;
    draw(inner);
  }

  // ---------- настройки ----------
  settingsHTML() {
    const st = save.data.settings;
    return `${slidersHTML(st, { music: t('music'), sound: t('sound') }, { music: IC.moon, sfx: IC.bolt })}
      <label class="vol-row"><span class="vol-ic">${IC.hand}</span><span class="vol-l">${esc(t('sens'))}</span><input class="sens" type="range" min="40" max="200" step="10" value="${Math.round((st.sens || 1) * 100)}"><b class="vol-v">${Math.round((st.sens || 1) * 100)}%</b></label>
      <div class="qrow"><span>${esc(t('quality'))}</span>${['auto', 'low', 'high'].map((q) => `<button class="tab ${st.quality === q ? 'on' : ''}" data-q="${q}">${esc(t('q_' + q))}</button>`).join('')}</div>`;
  }
  bindSettings(el) {
    const st = save.data.settings;
    bindSliders(el, st, () => save.write());
    const s = el.querySelector('.sens');
    s.style.setProperty('--p', ((s.value - 40) / 160) * 100 + '%');
    s.oninput = () => {
      st.sens = s.value / 100;
      this.g.input.sens = st.sens;
      s.parentElement.querySelector('.vol-v').textContent = s.value + '%';
      s.style.setProperty('--p', ((s.value - 40) / 160) * 100 + '%');
    };
    s.onchange = () => save.write();
    s.onpointerdown = (e) => e.stopPropagation();
    el.querySelectorAll('[data-q]').forEach((b) => {
      b.onclick = () => {
        st.quality = b.dataset.q;
        save.write();
        this.click();
        this.g.applyQuality();
        el.querySelectorAll('[data-q]').forEach((x) => x.classList.toggle('on', x === b));
      };
    });
  }
  showSettings() {
    this.modal(`<div class="paper set"><div class="ph">${esc(t('settings'))}</div>${this.settingsHTML()}<div class="row"><button class="brass" data-a="x"><span>${esc(t('close'))}</span></button></div></div>`, { x: () => this.closeModal() });
    this.bindSettings(this.M);
  }

  // ---------- модальные окна ----------
  modal(html, actions) {
    this.closeModal();
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = html;
    m.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.root.appendChild(m);
    this.M = m;
    this.modalOpen = true;
    this._bind(m, actions);
    return m;
  }
  closeModal() {
    if (this.M) this.M.remove();
    this.M = null;
    this.modalOpen = false;
  }

  toast(text) {
    const e = document.createElement('div');
    e.className = 'toast';
    e.textContent = text;
    this.toasts.appendChild(e);
    while (this.toasts.children.length > 2) this.toasts.firstChild.remove();
    setTimeout(() => e.remove(), 3200);
  }

  // ---------- HUD ----------
  showHud() {
    this.screen = 'hud';
    this.closeModal();
    this.vig.className = 'play';
    this.scareEl.className = '';
    this.white.style.opacity = 0;
    const g = this.g;
    const mob = g.mobile;
    this.L.innerHTML = `
      <div class="hud-tl">
        <div class="bat" id="hbat"><span class="bico"><i id="hbf"></i></span><b id="hbp">100%</b></div>
        <div class="hkeys" id="hkeys"></div>
      </div>
      <button class="round pause" data-a="pause">${IC.pause}</button>
      <div class="cross"></div>
      <div class="prompt" id="prompt"></div>
      <div class="stam" id="stam"><i></i></div>
      <div class="lockhint" id="lockhint">${esc(t('clickToLook'))}</div>
      ${mob ? `<div class="joy" id="joy"><i></i></div>
      <div class="mbtns">
        <button class="mb act" id="bact" data-a="act">${IC.hand}<small></small></button>
        <button class="mb" data-a="light" id="blight">${IC.torch}</button>
        <button class="mb" data-a="flash" id="bflash">${IC.bolt}<i class="cd"></i></button>
        <button class="mb run" id="brun">${IC.run}</button>
      </div>` : ''}`;
    this._bind(this.L, {
      pause: () => this.pause(),
      act: () => g.act(),
      light: () => g.player.toggleLight(g),
      flash: () => g.doFlash(),
    });
    const run = this.L.querySelector('#brun');
    if (run) {
      run.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        g.input.runHeld = true;
      });
      const up = () => (g.input.runHeld = false);
      run.addEventListener('pointerup', up);
      run.addEventListener('pointercancel', up);
      run.addEventListener('pointerleave', up);
    }
    // правая кнопка мыши — вспышка
    if (!this._ctx) {
      this._ctx = true;
      window.addEventListener('mousedown', (e) => {
        if (e.button === 2 && g.state === 'play' && !g.paused) g.doFlash();
      });
    }
    this._keyHud = '';
    this.updateHud();
    this.updateLockHint();
  }

  hideHud() {
    this.L.innerHTML = '';
  }

  updateLockHint() {
    const h = this.L.querySelector('#lockhint');
    if (!h) return;
    const g = this.g;
    h.style.display = !g.mobile && !g.input.locked && g.state === 'play' && !g.paused ? '' : 'none';
    // курсор отпущен клавишей Esc — открыть паузу (требование: игра не идёт без управления)
    if (!g.mobile && !g.input.locked && g.state === 'play' && !g.paused && this._wasLocked) this.pause();
    this._wasLocked = g.input.locked;
  }

  updateHud() {
    const g = this.g,
      p = g.player;
    if (!p || this.screen !== 'hud') return;
    const pct = Math.round((p.battery / p.batMax) * 100);
    const bf = this.L.querySelector('#hbf');
    if (bf) {
      bf.style.width = pct + '%';
      bf.style.background = pct < 15 ? '#c8443a' : pct < 35 ? '#d8a040' : '#8ac860';
      this.L.querySelector('#hbp').textContent = pct + '%';
      this.L.querySelector('#hbat').classList.toggle('off', !p.lightOn);
    }
    const kh = `${g.keys}/${g.cfg.keys}`;
    if (kh !== this._keyHud) {
      this._keyHud = kh;
      this.L.querySelector('#hkeys').innerHTML = Array.from({ length: g.cfg.keys }, (_, i) => `<span class="${i < g.keys ? 'got' : ''}">${i < g.keys ? IC.key : IC.keyEmpty}</span>`).join('');
    }
    const st = this.L.querySelector('#stam');
    const sp = p.stamina / p.staMax;
    st.classList.toggle('show', sp < 0.98);
    st.classList.toggle('tired', p.exhausted);
    st.firstChild.style.width = sp * 100 + '%';
    const bl = this.L.querySelector('#blight');
    if (bl) bl.innerHTML = p.lightOn ? IC.torch : IC.torchOff;
    const bfl = this.L.querySelector('#bflash');
    if (bfl) bfl.classList.toggle('cool', p.flashCd > 0 || p.battery < 12);
    // виньетка темнеет, когда Жилец близко
    const m = g.monster;
    const md = Math.hypot(m.pos.x - p.pos.x, m.pos.z - p.pos.z);
    this.vig.style.setProperty('--d', Math.max(0, 1 - md / 9).toFixed(2));
  }

  setAction(tg) {
    const pr = this.L.querySelector('#prompt');
    if (!pr) return;
    const key = tg ? tg.kind + tg.label : '';
    if (key === this._act) return;
    this._act = key;
    const ic = tg ? { door: IC.door, hide: IC.wardrobe, leave: IC.wardrobe, exit: IC.key }[tg.kind] : '';
    pr.innerHTML = tg && !this.g.mobile ? `<kbd>E</kbd>${ic}<span>${esc(tg.label)}</span>` : '';
    pr.classList.toggle('show', !!tg && !this.g.mobile);
    const b = this.L.querySelector('#bact');
    if (b) {
      b.classList.toggle('show', !!tg);
      b.innerHTML = tg ? `${ic}<small>${esc(tg.label)}</small>` : IC.hand;
    }
  }

  setHidden(v) {
    this.slats.classList.toggle('on', v);
  }

  pulse(id) {
    const e = this.L.querySelector(id === 'keys' ? '#hkeys' : '#hbat');
    if (!e) return;
    e.classList.remove('pulse');
    void e.offsetWidth;
    e.classList.add('pulse');
  }

  _stick(s) {
    const j = this.L.querySelector('#joy');
    if (!j) return;
    if (!s) {
      j.classList.remove('on');
      return;
    }
    j.classList.add('on');
    j.style.left = s.ox + 'px';
    j.style.top = s.oy + 'px';
    let dx = s.x - s.ox,
      dy = s.y - s.oy;
    const l = Math.hypot(dx, dy);
    if (l > 55) (dx *= 55 / l), (dy *= 55 / l);
    j.firstChild.style.transform = `translate(${dx}px,${dy}px)`;
  }

  // ---------- пауза и план дома ----------
  pause() {
    const g = this.g;
    if (g.state !== 'play' || g.paused) return;
    g.setPaused(true);
    this.modal(
      `<div class="paper pausep"><div class="ph">${esc(t('pause'))} · ${esc(t('nightN', { n: g.night }))}</div>
        <div class="mapw"><canvas id="map" width="840" height="420"></canvas><div class="mapt">${IC.map}${esc(t('map'))}</div></div>
        ${this.settingsHTML()}
        <div class="row"><button class="ghost" data-a="menu">${esc(t('menu'))}</button><button class="brass" data-a="go">${IC.torch}<span>${esc(t('resume'))}</span></button></div></div>`,
      {
        go: () => this.resume(),
        menu: () => {
          this.closeModal();
          g.paused = false;
          g.afterRound(() => g.toMenu());
        },
      },
    );
    this.bindSettings(this.M);
    this.drawMap(this.M.querySelector('#map'));
  }
  resume() {
    this.closeModal();
    this.g.setPaused(false);
    this.g.input.requestLock();
    this.updateLockHint();
  }

  drawMap(cv) {
    const g = this.g,
      w = g.world;
    const c = cv.getContext('2d');
    const s = 20;
    c.fillStyle = '#e4d6b8';
    c.fillRect(0, 0, cv.width, cv.height);
    // карандашная сетка
    c.strokeStyle = 'rgba(80,60,40,.08)';
    for (let x = 0; x < cv.width; x += 10) c.strokeRect(x, 0, 0, cv.height);
    for (let y = 0; y < cv.height; y += 10) c.strokeRect(0, y, cv.width, 0);
    ROOMS.forEach((r, i) => {
      const open = w.open[i];
      c.fillStyle = open ? 'rgba(120,90,60,.18)' : 'rgba(40,30,20,.45)';
      c.fillRect(r.x * s, r.y * s, r.w * s, r.h * s);
      c.strokeStyle = '#3a2a1a';
      c.lineWidth = 3;
      c.strokeRect(r.x * s, r.y * s, r.w * s, r.h * s);
      if (r.type !== 'hall' && r.type !== 'foyer') {
        c.fillStyle = open ? '#3a2a1a' : '#e4d6b8';
        c.font = `${lang === 'ru' ? 15 : 14}px "Marck Script", cursive`;
        c.textAlign = 'center';
        const name = { living: lang === 'ru' ? 'гостиная' : 'living', bath: lang === 'ru' ? 'ванная' : 'bath', dining: lang === 'ru' ? 'столовая' : 'dining', kitchen: lang === 'ru' ? 'кухня' : 'kitchen', bed1: t('r_bed1'), bed2: t('r_bed2'), library: t('r_library'), study: t('r_study'), kids: t('r_kids'), pantry: t('r_pantry'), cellar: t('r_cellar') }[r.id] || '';
        c.fillText(open ? name : '✕', (r.x + r.w / 2) * s, (r.y + r.h / 2) * s + 5);
      }
    });
    for (const d of DOORS) {
      const o = w.doorAt(d.x, d.y);
      c.fillStyle = o && o.boarded ? '#8a2a1a' : '#e4d6b8';
      c.fillRect(d.x * s + 3, d.y * s + 3, s - 6, s - 6);
    }
    // выход
    c.fillStyle = '#c89a30';
    c.fillRect(EXIT.x * s, EXIT.y * s, EXIT.w * s, s * 0.6);
    // шкафы
    c.fillStyle = 'rgba(60,40,20,.7)';
    for (const h of w.hides) c.fillRect(h.x * s - 6, h.z * s - 6, 12, 12);
    // игрок
    const p = g.player;
    c.save();
    c.translate(p.pos.x * s, p.pos.z * s);
    c.rotate(-p.yaw);
    c.fillStyle = '#c8443a';
    c.beginPath();
    c.moveTo(0, -11);
    c.lineTo(7, 7);
    c.lineTo(0, 3);
    c.lineTo(-7, 7);
    c.fill();
    c.restore();
    void W;
    void H;
  }

  // ---------- скример и итоги ----------
  scare() {
    this.hideHud();
    this.closeModal();
    this.slats.classList.remove('on');
    this.scareEl.className = 'on';
  }

  whiteout(v) {
    this.white.style.opacity = Math.min(1, v);
  }

  showCaught(canSecond) {
    this.screen = 'over';
    this.scareEl.className = 'after';
    const g = this.g;
    this.L.innerHTML = `<div class="over"><div class="caught">${esc(t('caught'))}</div><div class="csub">${esc(t('caughtTxt'))}</div>
      <div class="ckeys">${IC.key}<b>${g.keys}/${g.cfg.keys}</b></div>
      ${canSecond ? `<button class="brass second" data-a="second">${IC.ad}<span>${esc(t('secondChance'))}<small>${esc(t('secondTxt'))}</small></span></button>` : ''}
      <div class="row"><button class="ghost" data-a="menu">${esc(t('menu'))}</button><button class="ghost" data-a="retry">${esc(t('retry'))}</button></div></div>`;
    audio.play('lose');
    this._bind(this.L, {
      second: () => g.secondChance(),
      retry: () => g.afterRound(() => g.startNight(g.night, g.nightmare)),
      menu: () => g.afterRound(() => g.toMenu()),
    });
  }

  showWin(r) {
    this.screen = 'over';
    this.white.style.transition = 'opacity 1.2s';
    setTimeout(() => (this.white.style.opacity = 0.0), 50);
    setTimeout(() => (this.white.style.transition = ''), 1300);
    this.scareEl.className = '';
    this.vig.className = 'menu';
    const g = this.g;
    const hasNext = !r.nightmare && r.n < 5;
    this.L.innerHTML = `<div class="over win"><div class="paper res">
      <div class="pin"></div>
      <div class="ph">${esc(t('escaped'))}</div>
      <div class="hand">${esc(r.all ? t('allDone') : t('dawnTxt'))}</div>
      <div class="stats">
        <span>${esc(t('time'))}</span><b>${fmtT(r.secs)}</b>
        <span>${esc(t('keysFound'))}</span><b>${r.keys}</b>
        <span>${esc(t('charge'))}</span><b>${r.bat}%</b>
        ${r.clean ? `<span>${esc(t('noCatch'))}</span><b>✓</b>` : ''}
      </div>
      <div class="score">${esc(t('score'))}: <b>${r.score}</b>${r.record ? `<em>${esc(t('record'))}</em>` : ''}</div>
      <div class="coinsrow">${IC.coin}<b>+${r.coins}</b><button class="ghost dbl" data-a="dbl">${IC.ad}${esc(t('double'))}</button></div>
      <div class="row"><button class="ghost" data-a="menu">${esc(t('menu'))}</button>${hasNext ? `<button class="brass" data-a="next">${IC.torch}<span>${esc(t('next'))}</span></button>` : ''}</div>
    </div></div>`;
    [0, 1, 2].forEach((i) => setTimeout(() => audio.play('star', i), 600 + i * 220));
    this._bind(this.L, {
      dbl: (b) => {
        b.disabled = true;
        g.doubleCoins(r.coins, () => {
          b.remove();
          this.L.querySelector('.coinsrow b').textContent = '+' + r.coins * 2;
          audio.play('coin');
        });
      },
      next: () => g.afterRound(() => (g.toMenu(), this.showIntro(r.n + 1, false))),
      menu: () => g.afterRound(() => g.toMenu()),
    });
  }
}
