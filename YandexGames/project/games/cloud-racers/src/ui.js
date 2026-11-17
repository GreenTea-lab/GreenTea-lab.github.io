// DOM-интерфейс: меню, трассы, гараж, HUD заезда, пауза, результаты, настройки, магазин
import * as THREE from 'three';
import { IC } from './icons.js';
import { t, fmt, fmtTime, LANG } from './i18n.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { input } from './input.js';
import { iap, itemHTML } from './iap.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import { CARS, PAINTS, carStats, upgradeCost, MAX_UP } from './cars.js';
import { TRACKS, THEMES, LAPS, buildTrack } from './tracks.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const THEME_COL = { meadow: ['#8ee06a', '#4fae3e'], beach: ['#ffd98a', '#f0a050'], snow: ['#cfe6ff', '#7aa8e8'], night: ['#8a7ae8', '#3a2f8a'] };
const FREE_COINS = 150;

export class UI {
  constructor(game, root) {
    this.g = game;
    this.root = root;
    this.modalOpen = false;
    this.screen = '';
    const st = document.createElement('style');
    st.textContent = volumeCss({ accent: '#ff8a3c', track: '#d6e4f5', thumb: '#fff', muted: '#6a7a99' });
    document.head.appendChild(st);
    // общий клик-звук
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
        <div class="chip coins" data-a="store">${IC.coin}<b>${fmt(s.coins)}</b>${iap.available() ? '<i class="plus">+</i>' : ''}</div>
        <div class="chip cups">${IC.cup}<b>${fmt(s.cups)}</b></div>
      </div>
      <div class="tb-r"><button class="btn round small" data-a="settings">${IC.gear}</button></div>
    </div>`;
  }

  set(html, screen) {
    this.screen = screen;
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
    const g = this.g;
    switch (a) {
      case 'back':
        this.menu();
        break;
      case 'play':
        this.tracks();
        break;
      case 'garage':
        this.garage();
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
      case 'theme':
        this.themeIdx = +el.dataset.i;
        this.tracks();
        break;
      case 'track': {
        const i = +el.dataset.i;
        if (i >= save.data.unlocked) {
          audio.play('error');
          this.toast(t('locked', { n: i }));
          return;
        }
        g.startRace(i);
        break;
      }
    }
  }

  refresh() {
    if (this.screen === 'menu') this.menu();
    else if (this.screen === 'garage') this.garage();
    else if (this.screen === 'tracks') this.tracks();
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
    this.g.toMenu();
    const s = save.data;
    const giftReady = s.daily.day !== today();
    this.set(
      `${this.topbar(false)}
      <div class="menu-c">
        <div class="logo"><div class="logo-t">${esc(t('title'))}</div></div>
        <div class="spacer"></div>
        <button class="btn big play" data-a="play">${IC.flag}<span>${esc(t('play'))}</span></button>
        <div class="row">
          <button class="btn big blue" data-a="garage">${IC.car}<span>${esc(t('garage'))}</span></button>
        </div>
        <div class="row small-row">
          <button class="btn round" data-a="lb" title="${esc(t('leaderboard'))}">${IC.trophy}</button>
          ${iap.available() ? `<button class="btn round" data-a="store" title="${esc(t('shop'))}">${IC.shop}</button>` : ''}
          <button class="btn round gift ${giftReady ? 'ready' : ''}" data-a="gift" title="${esc(t('daily'))}">${IC.gift}</button>
        </div>
        <div class="online">${IC.globe}<span>${esc(t('online'))}</span></div>
      </div>`,
      'menu'
    );
    if (giftReady && !this._giftShown) {
      this._giftShown = true;
      setTimeout(() => this.screen === 'menu' && this.daily(), 600);
    }
  }

  // ---------- выбор трассы ----------
  tracks() {
    const s = save.data;
    if (this.themeIdx === undefined) this.themeIdx = Math.min(3, Math.floor((s.unlocked - 1) / 3));
    const th = THEMES[this.themeIdx];
    const tabs = THEMES.map((x, i) => {
      const open = i * 3 < s.unlocked;
      return `<button class="tab ${i === this.themeIdx ? 'on' : ''} ${open ? '' : 'locked'}" data-a="theme" data-i="${i}" style="--c1:${THEME_COL[x][0]};--c2:${THEME_COL[x][1]}">${open ? '' : IC.lock}<span>${esc(t('theme_' + x))}</span></button>`;
    }).join('');
    let cards = '';
    for (let k = 0; k < 3; k++) {
      const i = this.themeIdx * 3 + k;
      const locked = i >= s.unlocked;
      const rec = s.tracks[i];
      const medal = rec && rec.place <= 3 ? IC['medal' + rec.place] : '';
      cards += `<button class="tcard ${locked ? 'locked' : ''}" data-a="track" data-i="${i}" style="--c1:${THEME_COL[th][0]};--c2:${THEME_COL[th][1]}">
        <canvas class="tmap" data-i="${i}" width="180" height="120"></canvas>
        <div class="tname">${esc(t('trackN', { n: i + 1 }))}</div>
        ${locked ? `<div class="tlock">${IC.lock}<small>${esc(t('locked', { n: i }))}</small></div>` : `<div class="tinfo">${rec ? `<span>${IC.flag}${fmtTime(rec.best)}</span>${medal ? `<i class="medal">${medal}</i>` : `<span>${esc(t('place', { n: rec.place }))}</span>`}` : `<span class="muted">${esc(t('noRecord'))}</span>`}</div>`}
      </button>`;
    }
    this.set(
      `${this.topbar(true)}
      <div class="panel-c">
        <div class="ttl">${esc(t('tracks'))}</div>
        <div class="tabs">${tabs}</div>
        <div class="tcards">${cards}</div>
      </div>`,
      'tracks'
    );
    this.root.querySelectorAll('canvas.tmap').forEach((c) => drawMap(c, +c.dataset.i, th));
  }

  // ---------- гараж ----------
  garage() {
    const s = save.data;
    if (this.gIdx === undefined) this.gIdx = CARS.findIndex((c) => c.id === s.car);
    const car = CARS[this.gIdx];
    const own = s.cars[car.id];
    const st = carStats(car.id, own ? own.up : [0, 0, 0, 0]);
    this.g.showMenuCar(car.id, own ? own.paint : PAINTS[car.paint]);
    const bars = [0, 1, 2, 3]
      .map((k) => {
        const lvl = own ? own.up[k] : 0;
        const v = st.s[k];
        const cost = upgradeCost(car.id, k, lvl);
        const btn = !own ? '' : lvl >= MAX_UP ? `<button class="btn upg max" disabled>${esc(t('maxed'))}</button>` : `<button class="btn upg ${s.coins < cost ? 'poor' : ''}" data-up="${k}">${IC.up}<b>${fmt(cost)}</b>${IC.coin}</button>`;
        return `<div class="stat"><div class="sl"><span>${esc(t('st' + k))}</span><i>${'●'.repeat(lvl)}${'○'.repeat(MAX_UP - lvl)}</i></div><div class="bar"><b style="width:${Math.min(100, v * 9)}%"></b></div>${btn}</div>`;
      })
      .join('');
    const paints = own
      ? `<div class="paints"><span>${esc(t('paint'))}</span>${PAINTS.map((p) => `<button class="paint ${own.paint === p ? 'on' : ''}" data-p="${p}" style="background:${p}"></button>`).join('')}</div>`
      : '';
    let main;
    if (!own) main = `<button class="btn big green buy ${s.coins < car.price ? 'poor' : ''}" data-buy="1">${esc(t('buyCar'))} <b>${fmt(car.price)}</b>${IC.coin}</button>`;
    else if (s.car === car.id) main = `<button class="btn big sel" disabled>${IC.check}${esc(t('selected'))}</button>`;
    else main = `<button class="btn big green" data-sel="1">${esc(t('select'))}</button>`;
    this.set(
      `${this.topbar(true)}
      <div class="garage-c">
        <div class="car-nav">
          <button class="btn round" data-nav="-1">${IC.back}</button>
          <div class="car-name"><b>${esc(t('car_' + car.id))}</b><small>${esc(t('power', { n: st.power }))}</small></div>
          <button class="btn round" data-nav="1">${IC.fwd}</button>
        </div>
        <div class="gspace"></div>
        <div class="gpanel">
          ${bars}
          ${paints}
          <div class="gmain">${main}</div>
        </div>
      </div>`,
      'garage'
    );
    const R = this.root;
    R.querySelectorAll('[data-nav]').forEach((b) => (b.onclick = () => {
      this.gIdx = (this.gIdx + +b.dataset.nav + CARS.length) % CARS.length;
      this.garage();
    }));
    R.querySelectorAll('[data-up]').forEach((b) => (b.onclick = () => {
      const k = +b.dataset.up;
      const lvl = own.up[k];
      const cost = upgradeCost(car.id, k, lvl);
      if (s.coins < cost) {
        audio.play('error');
        this.toast(t('notEnough'));
        if (iap.available()) this.store();
        return;
      }
      s.coins -= cost;
      own.up[k]++;
      save.write();
      audio.play('upgrade');
      this.garage();
    }));
    R.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => {
      own.paint = b.dataset.p;
      save.write();
      audio.play('select');
      this.garage();
    }));
    const buy = R.querySelector('[data-buy]');
    if (buy)
      buy.onclick = () => {
        if (!this.g.buyCar(car.id)) {
          audio.play('error');
          this.toast(t('notEnough'));
          if (iap.available()) this.store();
          return;
        }
        audio.play('buy');
        this.garage();
      };
    const sel = R.querySelector('[data-sel]');
    if (sel)
      sel.onclick = () => {
        s.car = car.id;
        save.write();
        audio.play('select');
        this.garage();
      };
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
    this._modalClose = close;
    return m;
  }

  closeModal() {
    if (this._modal) this._modal.remove();
    this._modal = null;
    this.modalOpen = false;
  }

  settings(inRace) {
    const s = save.data;
    const q = s.settings.quality || 'auto';
    const qs = ['high', 'mid', 'low'].map((k) => `<button class="seg ${q === k || (q === 'auto' && this.g.quality === k) ? 'on' : ''}" data-q="${k}">${esc(t('q' + k))}</button>`).join('');
    const m = this.modal(
      t('settings'),
      `${slidersHTML(s.settings, { music: t('music'), sound: t('sound'), engine: t('engine') }, { music: IC.music, sfx: IC.sound, engine: IC.engine })}
      <div class="qrow"><span>${esc(t('quality'))}</span><div class="segs">${qs}</div></div>
      <div class="ctrl"><b>${esc(t('controls'))}</b><small>${esc(input.isTouch ? t('ctrlTouch') : t('ctrlKeys'))}</small></div>`,
      () => {
        save.write();
        if (inRace) this.pause();
      }
    );
    bindSliders(m, s.settings, () => save.write());
    m.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => {
      this.g.setQuality(b.dataset.q);
      m.querySelectorAll('[data-q]').forEach((x) => x.classList.toggle('on', x === b));
    }));
  }

  async leaderboard() {
    const m = this.modal(t('leaderboard'), `<div class="lb"><div class="muted">${esc(t('loading'))}</div></div>`);
    const res = await sdk.getLeaderboard();
    const box = m.querySelector('.lb');
    if (!box) return;
    if (!res.available) {
      box.innerHTML = `<div class="muted">${esc(t('lbOffline'))}</div>`;
      return;
    }
    let html = res.entries.length
      ? res.entries.map((e) => `<div class="lbrow ${e.me ? 'me' : ''}"><b>${e.rank}</b><span>${esc(e.name || '—')}</span><i>${IC.cup}${fmt(e.score)}</i></div>`).join('')
      : `<div class="muted">${esc(t('lbEmpty'))}</div>`;
    if (!res.authorized) html += `<div class="lblogin"><span>${esc(t('lbLogin'))}</span><button class="btn mid green" data-login="1">${esc(t('lbLoginBtn'))}</button></div>`;
    box.innerHTML = html;
    const lg = box.querySelector('[data-login]');
    if (lg)
      lg.onclick = async () => {
        if (await sdk.login()) {
          await sdk.submitScore(save.data.cups);
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
          this.store();
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

  // ---------- заезд ----------
  searching() {
    this.closeModal();
    this.set(`<div class="search"><div class="spin"></div><b>${esc(t('searching'))}</b></div>`, 'searching');
  }

  raceHud(race) {
    const touch = input.isTouch;
    this.set(
      `<div class="hud ${touch ? 'touch' : ''}">
        <div class="h-tl"><div class="pos"><b id="hpos">10</b><small>/10</small></div><div class="lapb" id="hlap"></div></div>
        <div class="h-tc"><div class="time" id="htime">0:00.00</div></div>
        <div class="h-tr"><button class="btn round small" id="hpause">${IC.pause}</button></div>
        <canvas id="mmap" width="150" height="150"></canvas>
        <div class="labels" id="labels"></div>
        <div class="h-bc">
          <div class="speed"><b id="hspd">0</b><small>${esc(t('kmh'))}</small></div>
          <div class="nbar"><i id="hnit"></i><span>${IC.nitro}</span></div>
        </div>
        <div class="count" id="hcount"></div>
        <div class="banner-box" id="hbanner"></div>
        <div class="hint" id="hhint"></div>
        <div class="wrong" id="hwrong">${esc(t('wrongWay'))}</div>
        ${
          touch
            ? `<div class="tc tc-l"><button class="tbtn" data-k="left">${IC.left}</button><button class="tbtn" data-k="right">${IC.right}</button></div>
        <div class="tc tc-r"><button class="tbtn small" data-k="brake">${IC.brake}</button><button class="tbtn nit" data-k="nitro">${IC.nitro}<i id="tnit"></i></button><button class="tbtn drift" data-k="drift">${IC.drift}<small>${esc(t('drift'))}</small></button></div>`
            : `<div class="keys-hint">← → · ${esc(t('drift'))}: Space · ${esc(t('nitro'))}: Shift</div>`
        }
      </div>`,
      'race'
    );
    this.root.querySelectorAll('.tbtn').forEach((b) => input.bind(b, b.dataset.k));
    this.root.querySelector('#hpause').onclick = () => this.pause();
    this.el = {
      pos: this.root.querySelector('#hpos'),
      lap: this.root.querySelector('#hlap'),
      time: this.root.querySelector('#htime'),
      spd: this.root.querySelector('#hspd'),
      nit: this.root.querySelector('#hnit'),
      tnit: this.root.querySelector('#tnit'),
      wrong: this.root.querySelector('#hwrong'),
      labels: this.root.querySelector('#labels'),
      map: this.root.querySelector('#mmap'),
      nitBtn: this.root.querySelector('.tbtn.nit'),
    };
    this.labelEls = race.opps.map((o) => {
      const d = document.createElement('div');
      d.className = 'nlabel' + (o.kind === 'ghost' ? ' g' : '');
      d.textContent = o.name;
      this.el.labels.appendChild(d);
      return d;
    });
    this.mapBase = mapImage(race.T, 150);
  }

  hud(race) {
    const e = this.el;
    if (!e || !e.pos) return;
    const p = race.player;
    const place = race.place;
    if (e._place !== place) {
      e._place = place;
      e.pos.textContent = place;
      e.pos.parentElement.classList.toggle('top', place <= 3);
    }
    const L = race.T.n;
    const lap = Math.max(1, Math.min(LAPS, Math.floor(p.sTotal / L) + 1));
    const lt = t('lapN', { n: lap, m: LAPS });
    if (e._lap !== lt) e.lap.textContent = e._lap = lt;
    e.time.textContent = fmtTime(Math.max(0, race.finished ? race.time : race.t));
    e.spd.textContent = Math.round(p.speed * 3.6);
    const nw = (p.nitroT > 0 ? p.nitroT / race.stats.nitroTime : p.nitro) * 100;
    e.nit.style.width = nw + '%';
    e.nit.parentElement.classList.toggle('full', p.nitro >= 1);
    if (e.tnit) {
      e.tnit.style.height = nw + '%';
      e.nitBtn.classList.toggle('full', p.nitro >= 1);
    }
    e.wrong.classList.toggle('show', p.wrongT > 1);
    // подписи над соперниками
    const cam = this.g.camera;
    const v = new THREE.Vector3();
    const W = this.g.w,
      H = this.g.h;
    // подписи только у четырёх ближайших соперников
    const near = race.opps.map((o, k) => [o._dist ?? 1e9, k]).sort((a, b) => a[0] - b[0]).slice(0, 4).map((x) => x[1]);
    // ближние в приоритете: подпись, налезающая на уже поставленную, прячется
    const placed = [];
    const order = race.opps.map((o, k) => k).sort((a, b) => (race.opps[a]._dist ?? 1e9) - (race.opps[b]._dist ?? 1e9));
    order.forEach((k) => {
      const o = race.opps[k];
      const el = this.labelEls[k];
      if (!el) return;
      if (o._dist === undefined || o._dist > 50 || o._dist < 4 || race.t < -3 || !near.includes(k)) {
        if (el._v) el.style.display = 'none';
        el._v = false;
        return;
      }
      v.set(o._x, o._y + 2.6, o._z).project(cam);
      if (v.z > 1 || v.x < -1.1 || v.x > 1.1 || v.y < -1 || v.y > 1) {
        if (el._v) el.style.display = 'none';
        el._v = false;
        return;
      }
      const sx = ((v.x + 1) / 2) * W,
        sy = ((1 - v.y) / 2) * H;
      if (!el._w) {
        el.style.display = 'block';
        el._w = el.offsetWidth || 70;
        el._v = true;
      }
      if (placed.some((r) => Math.abs(r[0] - sx) < (r[2] + el._w) / 2 + 4 && Math.abs(r[1] - sy) < 22)) {
        if (el._v) el.style.display = 'none';
        el._v = false;
        return;
      }
      placed.push([sx, sy, el._w]);
      if (!el._v) el.style.display = 'block';
      el._v = true;
      el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`;
      el.style.opacity = Math.max(0.3, 1 - o._dist / 70);
    });
    this.minimap(race);
  }

  minimap(race) {
    const c = this.el.map;
    if (!c) return;
    const g = c.getContext('2d');
    const m = this.mapBase;
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(m.img, 0, 0);
    const dot = (x, z, col, r) => {
      g.fillStyle = col;
      g.beginPath();
      g.arc(m.ox + x * m.k, m.oz + z * m.k, r, 0, Math.PI * 2);
      g.fill();
    };
    for (const o of race.opps) if (o._x !== undefined) dot(o._x, o._z, o.paint, 3.2);
    const p = race.player;
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    dot(p.x, p.z, '#fff', 5.5);
    dot(p.x, p.z, race.paint, 4);
  }

  count(n) {
    const el = this.root.querySelector('#hcount');
    if (!el) return;
    el.textContent = n > 0 ? n : t('go');
    el.className = 'count show ' + (n > 0 ? '' : 'go');
    clearTimeout(this._ct);
    this._ct = setTimeout(() => (el.className = 'count'), n > 0 ? 900 : 1100);
  }

  banner(text) {
    const el = this.root.querySelector('#hbanner');
    if (!el) return;
    el.innerHTML = `<div class="banner">${esc(text)}</div>`;
  }

  hint(text) {
    const el = this.root.querySelector('#hhint');
    if (!el) return;
    el.textContent = text;
    el.className = 'hint show';
    clearTimeout(this._ht);
    this._ht = setTimeout(() => (el.className = 'hint'), 4500);
  }

  pause() {
    const g = this.g;
    if (!g.race || g.race.finished) return;
    g.pause(true);
    const m = this.modal(
      t('pause'),
      `<div class="col">
        <button class="btn big green" data-r="resume">${IC.play}${esc(t('resume'))}</button>
        <button class="btn big blue" data-r="restart">${IC.restart}${esc(t('restart'))}</button>
        <button class="btn big" data-r="menu">${IC.home}${esc(t('menu'))}</button>
        ${slidersHTML(save.data.settings, { music: t('music'), sound: t('sound'), engine: t('engine') }, { music: IC.music, sfx: IC.sound, engine: IC.engine })}
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
      sdk.mpDiscard();
      g.startRace(g.race.idx);
    };
    m.querySelector('[data-r=menu]').onclick = () => {
      this.closeModal();
      sdk.mpDiscard();
      this.menu();
    };
  }

  results(res) {
    const s = save.data;
    const rows = res.rows
      .map((r, i) => `<div class="rrow ${r.you ? 'me' : ''}"><b>${i + 1}</b><i class="pc" style="background:${esc(r.paint)}"></i><span>${esc(r.name)}</span><em>${fmtTime(r.time)}</em></div>`)
      .join('');
    const medal = res.place <= 3 ? `<div class="rmedal">${IC['medal' + res.place]}</div>` : '';
    const notes = [];
    if (res.record) notes.push(t('newRecord'));
    if (res.unlocked !== null && res.unlocked !== undefined) {
      const newTheme = res.unlocked % 3 === 0;
      notes.push(newTheme ? t('unlockedTheme', { n: t('theme_' + TRACKS[res.unlocked].theme) }) : t('unlockedTrack'));
    }
    const canNext = res.idx + 1 < TRACKS.length && res.idx + 1 < s.unlocked;
    this.set(
      `<div class="results">
        <div class="rhead">${medal}<div class="rplace ${res.place <= 3 ? 'top' : ''}">${esc(t('place', { n: res.place }))}</div><div class="rtime">${IC.flag}${fmtTime(res.time)}</div></div>
        ${notes.map((n) => `<div class="rnote">${esc(n)}</div>`).join('')}
        <div class="rtable">${rows}</div>
        <div class="rrew"><div class="chip big-chip">${IC.coin}<b id="rcoins">+${fmt(res.coins)}</b></div><div class="chip big-chip">${IC.cup}<b>${res.cupsD >= 0 ? '+' : ''}${res.cupsD}</b></div>
          <button class="btn mid blue" id="rx2">${IC.ad}${esc(t('x2'))}</button></div>
        <div class="row">
          <button class="btn big" data-r="menu">${IC.home}</button>
          <button class="btn big blue" data-r="again">${IC.restart}${esc(t('again'))}</button>
          ${canNext ? `<button class="btn big green" data-r="next">${esc(t('next'))}${IC.fwd}</button>` : ''}
        </div>
      </div>`,
      'resultsL'
    );
    const R = this.root;
    const x2 = R.querySelector('#rx2');
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
    R.querySelector('[data-r=menu]').onclick = () => go(() => this.menu());
    R.querySelector('[data-r=again]').onclick = () => go(() => this.g.startRace(res.idx));
    const nx = R.querySelector('[data-r=next]');
    if (nx)
      nx.onclick = () =>
        go(() => {
          this.themeIdx = Math.floor((res.idx + 1) / 3);
          this.g.startRace(res.idx + 1);
        });
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// схема трассы для карточки
function drawMap(c, idx, theme) {
  const T = buildTrack(idx);
  const g = c.getContext('2d');
  let minx = 1e9,
    maxx = -1e9,
    minz = 1e9,
    maxz = -1e9;
  for (let i = 0; i < T.n; i++) {
    minx = Math.min(minx, T.x[i]);
    maxx = Math.max(maxx, T.x[i]);
    minz = Math.min(minz, T.z[i]);
    maxz = Math.max(maxz, T.z[i]);
  }
  const k = Math.min((c.width - 24) / (maxx - minx), (c.height - 24) / (maxz - minz));
  const ox = c.width / 2 - ((minx + maxx) / 2) * k,
    oz = c.height / 2 - ((minz + maxz) / 2) * k;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  const path = () => {
    g.beginPath();
    for (let i = 0; i <= T.n; i += 3) {
      const j = i % T.n;
      const x = ox + T.x[j] * k,
        z = oz + T.z[j] * k;
      i ? g.lineTo(x, z) : g.moveTo(x, z);
    }
    g.closePath();
  };
  path();
  g.strokeStyle = 'rgba(0,0,0,.25)';
  g.lineWidth = 11;
  g.stroke();
  path();
  g.strokeStyle = '#fff';
  g.lineWidth = 7;
  g.stroke();
  path();
  g.strokeStyle = THEME_COL[theme][1];
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = '#222';
  g.fillRect(ox + T.x[0] * k - 4, oz + T.z[0] * k - 4, 8, 8);
}

// фон миникарты
function mapImage(T, size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  let minx = 1e9,
    maxx = -1e9,
    minz = 1e9,
    maxz = -1e9;
  for (let i = 0; i < T.n; i++) {
    minx = Math.min(minx, T.x[i]);
    maxx = Math.max(maxx, T.x[i]);
    minz = Math.min(minz, T.z[i]);
    maxz = Math.max(maxz, T.z[i]);
  }
  const k = Math.min((size - 20) / (maxx - minx), (size - 20) / (maxz - minz));
  const ox = size / 2 - ((minx + maxx) / 2) * k,
    oz = size / 2 - ((minz + maxz) / 2) * k;
  g.lineJoin = 'round';
  g.beginPath();
  for (let i = 0; i <= T.n; i += 3) {
    const j = i % T.n;
    const x = ox + T.x[j] * k,
      z = oz + T.z[j] * k;
    i ? g.lineTo(x, z) : g.moveTo(x, z);
  }
  g.closePath();
  g.strokeStyle = 'rgba(20,30,60,.45)';
  g.lineWidth = 9;
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.95)';
  g.lineWidth = 5;
  g.stroke();
  g.fillStyle = '#222';
  g.fillRect(ox + T.x[0] * k - 3, oz + T.z[0] * k - 3, 6, 6);
  return { img: c, k, ox, oz };
}

export { LANG };
