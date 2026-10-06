// Игра: меню, уровни, игровой цикл (физика с фиксированным шагом), камера, подсказки, финиш со звёздами,
// скины, магазин, подарок дня, реклама и покупки
import { sdk } from './sdk.js';
import { save } from './save.js';
import { audio } from './audio.js';
import { iap, priceHTML } from './iap.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import { t, fmtNum, fmtTime, LANG } from './i18n.js';
import { IC } from './icons.js';
import { World } from './world.js';
import { Input } from './input.js';
import { genLevel, starsFor, THEMES, SKINS, LEVELS, themeOf } from './data.js';
import { initLevel, tickLevel, makePlayer, stepPlayer, respawn, pathYaw } from './physics.js';

const AD_GAP = 150000;
const STEP = 1 / 120;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const coinsHTML = (n) => `<span class="cn">${IC.coin}<b>${fmtNum(n)}</b></span>`;
const dayNum = () => {
  const d = new Date();
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
};
const stars3 = (n, cls = '') => `<span class="stars ${cls}">${[0, 1, 2].map((i) => `<i class="${i < n ? 'on' : ''}">${IC.star}</i>`).join('')}</span>`;

export const IAP_DEFS = {
  coins_500: { grant: () => game && game.addCoins(500) },
  coins_2000: { grant: () => game && game.addCoins(2000) },
  coins_6000: { grant: () => game && game.addCoins(6000) },
  disable_ads: {
    permanent: true,
    grant: () => {
      save.data.noAds = true;
      sdk.noAds = true;
    },
  },
};
let game = null;
const HINTS = { bounce: 'tutBounce', moving: 'tutMove', fade: 'tutFade', sweeper: 'tutSweep', disc: 'tutDisc', lift: 'tutLift', pillars: 'tutPillars' };

export class Game {
  constructor() {
    game = this;
    window.__game = this;
    window.__audio = audio;
    this.s = save.data;
    const st = this.s.settings;
    this.touch = matchMedia('(pointer: coarse)').matches;
    const q = st.quality === 'auto' ? (this.touch ? 'mid' : 'high') : st.quality === 'low' ? 'low' : 'high';
    this.cv = document.getElementById('cv');
    this.world = new World(this.cv, q);
    this.input = new Input(this.cv);
    this.ui = document.getElementById('hud');
    this.menuEl = document.getElementById('menu');
    this.modalEl = document.getElementById('modal');
    this.toastEl = document.getElementById('toasts');
    this.state = 'menu';
    this.modal = null;
    this.view = { yaw: 0, pitch: 0.4, snap: true };
    this.acc = 0;
    this.lastAd = Date.now();
    this.fps = { t: 0, n: 0, done: st.quality !== 'auto' };
    this._injectCss();
    this._buildHud();
    this._buildMenu();
    this.world.setSkin(SKINS.find((k) => k.id === this.s.skin) || SKINS[0]);
    this.loadLevel(clamp(this.s.last || 1, 1, LEVELS));
    this.resize();
    addEventListener('resize', () => this.resize());
    iap.onChange(() => this.hudCoins());
    this.last = performance.now();
    requestAnimationFrame((tt) => this.loop(tt));
  }

  resize() {
    this.world.resize(innerWidth, innerHeight);
    document.body.classList.toggle('port', innerWidth / innerHeight < 0.8);
    document.body.classList.toggle('touch', this.touch || this.input.touch);
  }

  // ---------- уровень ----------
  loadLevel(L) {
    this.L = L;
    const lv = (this.lv = genLevel(L));
    initLevel(lv);
    this.world.build(lv);
    this.P = makePlayer(lv);
    respawn(this.P, lv);
    this.view.yaw = this.P.yaw;
    this.view.pitch = 0.4;
    this.view.snap = true;
    this.time = 0;
    this.started = false;
    this.got = 0;
    this.maxId = 0;
    this.finished = false;
    this.hintQ = [];
    this.hinted = new Set();
    audio.setMood(this.state === 'menu' ? 'menu' : ['neon', 'space', 'volcano'].includes(lv.theme.id) ? 'night' : 'day');
    this.hud(true);
  }
  startLevel(L) {
    const go = () => {
      this.closeModal(true);
      this.state = 'play';
      this.menuEl.classList.add('hidden');
      this.s.last = L;
      this.loadLevel(L);
      audio.setMood(['neon', 'space', 'volcano'].includes(this.lv.theme.id) ? 'night' : 'day');
      this.input.enabled = true;
      this.hud(true);
      this.banner();
      this.setGameplay();
      save.write(false);
    };
    go();
  }
  banner() {
    const th = this.lv.theme;
    const b = document.createElement('div');
    b.className = 'banner';
    const first = (this.L - 1) % 5 === 0 && ['ice', 'volcano', 'space'].includes(th.id);
    b.innerHTML = `<b>${esc(t('levelN', { n: this.L }))}</b><span>${esc(t('w_' + th.id))}</span>${first ? `<small>${esc(t('wd_' + th.id))}</small>` : ''}`;
    document.body.appendChild(b);
    setTimeout(() => b.classList.add('out'), 2200);
    setTimeout(() => b.remove(), 2800);
    if (this.L === 1) {
      const m = this.touch || this.input.touch;
      this.hintQ.push(t(m ? 'tut1m' : 'tut1'), t(m ? 'tut2m' : 'tut2'), t(m ? 'tut3m' : 'tut3'));
      this.hintT = 2.6;
    }
  }

  // ---------- цикл ----------
  loop(tt) {
    const dt = Math.min(0.05, Math.max(0, (tt - this.last) / 1000));
    this.last = tt;
    try {
      this.update(dt);
      this.world.render();
    } catch (e) {
      console.error(e);
    }
    requestAnimationFrame((x) => this.loop(x));
  }

  update(dt) {
    const P = this.P;
    const lv = this.lv;
    const play = this.state === 'play' && !this.modal;
    if (play) {
      const st = this.s.settings;
      // камера: свайп/мышь, клавиши Q/E, автоповорот за бегом
      const [cx, cy] = this.input.takeCam();
      this.view.yaw -= cx * 0.0058 * st.sens;
      this.view.pitch = clamp(this.view.pitch + cy * 0.004 * st.sens, 0.08, 1.15);
      this.view.yaw += this.input.keyCam() * 2.4 * dt;
      const ap = this.autopilot; // демо-режим для промо-видео: решения принимает бот
      const mv = ap ? { x: 0, y: 1, m: 1 } : this.input.move();
      const sp = Math.hypot(P.vx, P.vz);
      if (st.autoCam && mv.m > 0.2 && sp > 2 && performance.now() - this.input.lastCam > 1300 && !this.input.keyCam()) {
        const want = Math.atan2(P.vx, P.vz);
        const d = wrap(want - this.view.yaw);
        if (Math.abs(d) < 2.4) this.view.yaw += d * Math.min(1, dt * 1.3);
      }
      const fx = Math.sin(this.view.yaw),
        fz = Math.cos(this.view.yaw);
      const wx = fx * mv.y - fz * mv.x,
        wz = fz * mv.y + fx * mv.x;
      let jump = this.input.takeJump();
      if (!this.started && (mv.m > 0 || jump)) this.started = true;
      if (this.started) this.time += dt;
      this.acc += dt;
      while (this.acc >= STEP) {
        this.acc -= STEP;
        tickLevel(lv, STEP);
        const ev = stepPlayer(P, lv, ap ? ap(P, lv) : { x: wx, z: wz, jump, held: this.input.jumpHeld }, STEP);
        jump = false;
        if (ev.length) this.events(ev);
        if (this.finished) break;
      }
      if (P.ground) this.maxId = Math.max(this.maxId, P.ground.id);
      // подсказки по новым препятствиям
      const near = lv.plats[Math.min(lv.plats.length - 1, (P.ground ? P.ground.id : this.maxId) + 1)];
      if (near && HINTS[near.seg] && !this.s.tut[near.seg] && !this.hinted.has(near.seg)) {
        this.hinted.add(near.seg);
        this.s.tut[near.seg] = 1;
        this.hintQ.push(t(HINTS[near.seg]));
        if (!(this.hintT > 0)) this.hintT = 0.01;
      }
      if (this.hintT > 0) {
        this.hintT -= dt;
        if (this.hintT <= 0 && this.hintQ.length) {
          this.hint(this.hintQ.shift());
          this.hintT = this.hintQ.length ? 3.2 : 0;
        }
      }
      this.autoQuality(dt);
    } else {
      // меню и окна: уровень живёт, камера медленно облетает старт
      this.acc += dt;
      while (this.acc >= STEP) {
        this.acc -= STEP;
        tickLevel(lv, STEP);
        if (this.state === 'menu') stepPlayer(P, lv, { x: 0, z: 0, jump: false, held: false }, STEP);
      }
      if (this.state === 'menu') {
        this.view.yaw += dt * 0.18;
        this.view.pitch = 0.32;
      }
    }
    this.world.update(dt, P, { ...this.view, zoom: this.state === 'menu' ? 0.95 : 1 });
    this.view.snap = false;
    this.hudT = (this.hudT || 0) - dt;
    if (this.hudT <= 0) {
      this.hudT = 0.1;
      this.hud();
    }
  }

  events(ev) {
    const P = this.P;
    const W = this.world;
    for (const e of ev) {
      if (e === 'jump') {
        audio.play('jump');
        W.puff(P.x, P.y, P.z, 5);
      } else if (e === 'land' || e === 'landHard') {
        audio.play('land', e === 'landHard' ? 1.4 : 0.8);
        W.land = e === 'landHard' ? 1 : 0.6;
        if (e === 'landHard') W.puff(P.x, P.y, P.z, 8);
      } else if (e === 'coin') {
        audio.play('coin');
        this.got++;
        this.s.coins++;
        W.sparkle(P.x, P.y + 0.9, P.z);
        this.hudCoins();
      } else if (e === 'cp') {
        audio.play('cp');
        W.sparkle(P.x, P.y + 1, P.z, 0x6aff8a, 16);
        this.toast(t('cp'), 'good');
        if (!this.s.tut.cp) {
          this.s.tut.cp = 1;
          this.hint(t('cpHint'));
        }
        save.write();
      } else if (e === 'bounce') {
        audio.play('bounce');
        W.bounceFx(P.last);
      } else if (e === 'hit') audio.play('hit');
      else if (e === 'crack') audio.play('crack');
      else if (e === 'fall') {
        audio.play('fall');
        this.view.yaw = P.yaw;
        this.view.snap = true;
        const f = document.getElementById('flash');
        f.classList.remove('on');
        void f.offsetWidth;
        f.classList.add('on');
      } else if (e === 'finish' && !this.finished) this.finish();
    }
  }

  // ---------- финиш ----------
  finish() {
    this.finished = true;
    const s = this.s;
    const L = this.L;
    const lv = this.lv;
    const time = this.time;
    const stars = starsFor(time, lv.par);
    const prevBest = s.best[L];
    const rec = !prevBest || time < prevBest;
    if (rec) s.best[L] = time;
    s.stars[L] = Math.max(s.stars[L] || 0, stars);
    s.max = Math.max(s.max, Math.min(LEVELS, L + 1));
    if (L >= LEVELS) s.max = LEVELS;
    const bonus = 10 + L * 2 + stars * 5;
    s.coins += bonus;
    const earned = bonus + this.got;
    s.last = Math.min(LEVELS, L + 1);
    this.submit();
    save.write();
    audio.play('finish');
    this.world.confetti(this.P.x, this.P.y, this.P.z);
    this.input.release();
    this.state = 'finish';
    this.setGameplay();
    setTimeout(() => this.showFinish({ time, stars, rec, earned, prevBest }), 700);
  }
  showFinish(r) {
    const L = this.L;
    let doubled = false;
    this.openModal(
      `<div class="m-title">${IC.flag}<span>${esc(t('finish'))}</span></div>
      <div class="bigstars">${[0, 1, 2].map((i) => `<i class="${i < r.stars ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.25}s">${IC.star}</i>`).join('')}</div>
      ${r.rec && r.prevBest ? `<div class="badge">${esc(t('newBest'))}</div>` : ''}
      <div class="fin">
        <div><small>${esc(t('time'))}</small><b>${fmtTime(r.time)}</b></div>
        <div><small>${esc(t('best'))}</small><b>${fmtTime(this.s.best[L])}</b></div>
        <div><small>${esc(t('coins'))}</small><b class="earn">${coinsHTML(r.earned)}</b></div>
        <div><small>${esc(t('falls'))}</small><b>${this.P.deaths}</b></div>
      </div>
      ${r.stars < 3 ? `<p class="sub">${esc(t('parHint', { t: fmtTime(this.lv.par) }))}</p>` : ''}
      <div class="m-btns"><button class="btn ad b-x2">${IC.video}<span>${esc(t('x2'))}</span></button><button class="btn primary b-next">${IC.play}<span>${esc(L >= LEVELS ? t('toMenu') : t('next'))}</span></button></div>
      <div class="m-btns"><button class="btn ghost sm b-again">${IC.restart}<span>${esc(t('restart'))}</span></button><button class="btn ghost sm b-menu">${IC.grid}<span>${esc(t('levels'))}</span></button></div>`,
      {
        noClose: true,
        onOpen: (m) => {
          [0, 1, 2].forEach((i) => i < r.stars && setTimeout(() => audio.play('star', 1 + i * 0.12), 250 + i * 250));
          m.querySelector('.b-x2').onclick = () =>
            this.rewarded(() => {
              if (doubled) return;
              doubled = true;
              this.addCoins(r.earned);
              m.querySelector('.earn').innerHTML = coinsHTML(r.earned * 2);
              m.querySelector('.b-x2').disabled = true;
              this.toast(t('doubled'), 'good');
            });
          m.querySelector('.b-next').onclick = () => {
            audio.play('click');
            if (L >= LEVELS) {
              this.closeModal(true);
              this.interstitial(() => this.toMenu());
              if (L >= LEVELS) this.toast(t('allDone'), 'good');
            } else this.interstitial(() => this.startLevel(L + 1));
          };
          m.querySelector('.b-again').onclick = () => (audio.play('click'), this.startLevel(L));
          m.querySelector('.b-menu').onclick = () => {
            audio.play('click');
            this.closeModal(true);
            this.interstitial(() => {
              this.toMenu();
              this.openLevels();
            });
          };
        },
      },
    );
  }

  // ---------- реклама ----------
  setGameplay() {
    sdk.gameplay(this.state === 'play' && !this.modal && !document.hidden && !sdk.adActive);
  }
  rewarded(onReward) {
    audio.suspend('ad');
    this.input.release();
    sdk.showRewarded(onReward, () => {
      audio.resume('ad');
      this.setGameplay();
    });
  }
  interstitial(after) {
    if (this.s.noAds || Date.now() - this.lastAd < AD_GAP || this.L < 3) return after && after();
    this.lastAd = Date.now();
    audio.suspend('ad');
    this.input.release();
    sdk.showInterstitial(() => {
      audio.resume('ad');
      this.setGameplay();
      after && after();
    });
  }
  submit() {
    const total = Object.values(this.s.stars).reduce((a, b) => a + b, 0);
    sdk.submitScore(total);
  }
  addCoins(n) {
    this.s.coins += n;
    this.hudCoins();
    save.write();
  }

  // авто-качество: если кадров мало — меньше пикселей, потом без теней
  autoQuality(dt) {
    const f = this.fps;
    if (f.done) return;
    f.t += dt;
    f.n++;
    if (f.t > 6) {
      const fps = f.n / f.t;
      const r = this.world.renderer;
      if (fps < 35) r.setPixelRatio(1);
      if (fps < 24) {
        r.shadowMap.enabled = false;
        this.world.sun.castShadow = false;
      }
      f.done = true;
    }
  }

  // ---------- HUD ----------
  _buildHud() {
    this.ui.innerHTML = `
      <div class="hl"><b class="h-lvl"></b><small class="h-w"></small></div>
      <div class="hc"><span class="h-time">${IC.clock}<b>0:00.0</b></span><span class="h-coins">${IC.coin}<b>0</b></span></div>
      <button class="hb h-pause" aria-label="pause">${IC.pause}</button>
      <div class="prog"><i><u></u></i>${IC.flag}</div>
      <button class="skipb hidden">${IC.video}<span>${esc(t('skip'))}</span></button>
      <button class="jumpb" aria-label="jump">${IC.up}</button>
      <div class="hint hidden"></div>`;
    const q = (s) => this.ui.querySelector(s);
    this.el = { lvl: q('.h-lvl'), w: q('.h-w'), time: q('.h-time b'), coins: q('.h-coins b'), prog: q('.prog u'), skip: q('.skipb'), hint: q('.hint') };
    q('.h-pause').onclick = () => (audio.play('click'), this.openPause());
    q('.skipb').onclick = () => this.skipLevel();
    this.input.bindJump(q('.jumpb'));
    addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.state === 'play') this.modal ? this.closeModal() : this.openPause();
    });
  }
  hud(force) {
    const e = this.el;
    if (!e) return;
    this.ui.classList.toggle('hidden', this.state === 'menu');
    if (force) {
      e.lvl.textContent = t('levelN', { n: this.L });
      e.w.textContent = t('w_' + this.lv.theme.id);
    }
    e.time.textContent = fmtTime(this.time || 0);
    e.prog.style.width = ((this.maxId / Math.max(1, this.lv.plats.length - 1)) * 100).toFixed(1) + '%';
    e.skip.classList.toggle('hidden', !(this.P.deaths >= 8 && this.L < LEVELS && this.state === 'play'));
    this.hudCoins();
  }
  hudCoins() {
    if (this.el) this.el.coins.textContent = fmtNum(this.s.coins);
    const mc = this.menuEl.querySelector('.m-coins b');
    if (mc) mc.textContent = fmtNum(this.s.coins);
  }
  hint(msg) {
    const h = this.el.hint;
    h.textContent = msg;
    h.classList.remove('hidden', 'out');
    clearTimeout(this._hintTO);
    this._hintTO = setTimeout(() => h.classList.add('out'), 2900);
  }
  skipLevel() {
    this.rewarded(() => {
      const L = this.L;
      this.s.max = Math.max(this.s.max, Math.min(LEVELS, L + 1));
      this.s.stars[L] = this.s.stars[L] || 0;
      save.write();
      this.startLevel(Math.min(LEVELS, L + 1));
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
    this.input.release();
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
    if (!silent && o.onClose) o.onClose();
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

  openPause() {
    if (this.state !== 'play') return;
    const s = this.s;
    this.openModal(
      `<div class="m-title">${IC.pause}<span>${esc(t('pause'))}</span></div>
      <p class="sub">${esc(t('levelN', { n: this.L }))} · ${esc(t('w_' + this.lv.theme.id))}</p>
      <div class="m-col">
        <button class="btn primary b-res">${IC.play}<span>${esc(t('resume'))}</span></button>
        <button class="btn ghost b-rst">${IC.restart}<span>${esc(t('restart'))}</span></button>
        ${this.L < LEVELS ? `<button class="btn ad b-skip">${IC.video}<span>${esc(t('skip'))}</span></button>` : ''}
        <button class="btn ghost b-menu">${IC.grid}<span>${esc(t('toMenu'))}</span></button>
      </div>
      ${slidersHTML(s.settings, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}`,
      {
        onOpen: (m) => {
          bindSliders(m, s.settings, () => save.write());
          m.querySelector('.b-res').onclick = () => (audio.play('click'), this.closeModal());
          m.querySelector('.b-rst').onclick = () => (audio.play('click'), this.startLevel(this.L));
          const sk = m.querySelector('.b-skip');
          if (sk) sk.onclick = () => this.skipLevel();
          m.querySelector('.b-menu').onclick = () => {
            audio.play('click');
            this.closeModal(true);
            this.toMenu();
          };
        },
      },
    );
  }

  _buildMenu() {
    this.menuEl.innerHTML = `
      <div class="mtop"><span class="m-coins">${IC.coin}<b>0</b></span><button class="hb m-gift hidden">${IC.gift}</button><button class="hb m-set">${IC.gear}</button></div>
      <div class="mn">
        <div class="mt"><h1><span>${esc(t('title1'))}</span><span>${esc(t('title2'))}</span></h1>
        <p>${esc(t('subtitle'))}</p></div>
        <div class="mb"><button class="btn primary big m-play">${IC.play}<span class="m-pl"></span></button>
        <div class="mrow">
          <button class="btn ghost m-lv">${IC.grid}<span>${esc(t('levels'))}</span></button>
          <button class="btn ghost m-sk">${IC.shirt}<span>${esc(t('skins'))}</span></button>
          <button class="btn ghost m-sh">${IC.bag}<span>${esc(t('shop'))}</span></button>
          <button class="btn ghost m-lb">${IC.trophy}<span>${esc(t('records'))}</span></button>
        </div></div>
      </div>`;
    const q = (s) => this.menuEl.querySelector(s);
    q('.m-play').onclick = () => (audio.play('click'), this.startLevel(clamp(this.s.last || 1, 1, this.s.max)));
    q('.m-lv').onclick = () => (audio.play('click'), this.openLevels());
    q('.m-sk').onclick = () => (audio.play('click'), this.openSkins());
    q('.m-sh').onclick = () => (audio.play('click'), this.openShop());
    q('.m-lb').onclick = () => (audio.play('click'), this.openLb());
    q('.m-set').onclick = () => (audio.play('click'), this.openSettings());
    q('.m-gift').onclick = () => (audio.play('click'), this.openGift());
    this.menuRefresh();
  }
  menuRefresh() {
    const q = (s) => this.menuEl.querySelector(s);
    q('.m-pl').textContent = `${t('play')} · ${t('levelN', { n: clamp(this.s.last || 1, 1, this.s.max) })}`;
    q('.m-gift').classList.toggle('hidden', this.s.gift.last === dayNum());
    this.hudCoins();
  }
  toMenu() {
    this.closeModal(true);
    this.state = 'menu';
    this.input.enabled = false;
    this.input.release();
    this.menuEl.classList.remove('hidden');
    this.loadLevel(clamp(this.s.last || 1, 1, LEVELS));
    audio.setMood('menu');
    this.menuRefresh();
    this.hud(true);
    this.setGameplay();
  }

  openLevels() {
    const s = this.s;
    const total = Object.values(s.stars).reduce((a, b) => a + b, 0);
    const worlds = THEMES.map((th, w) => {
      const cells = [];
      for (let i = 1; i <= 5; i++) {
        const L = w * 5 + i;
        const open = L <= s.max;
        cells.push(`<button class="lvc ${open ? '' : 'lock'} ${L === s.last ? 'cur' : ''}" data-l="${L}" ${open ? '' : 'disabled'}><b>${L}</b>${open ? stars3(s.stars[L] || 0) : IC.lock}</button>`);
      }
      const locked = w * 5 + 1 > s.max;
      return `<div class="world w-${th.id} ${locked ? 'locked' : ''}"><div class="wh"><b>${esc(t('w_' + th.id))}</b>${locked ? `<small>${esc(t('lockedWorld', { n: w * 5 }))}</small>` : ''}</div><div class="lvg">${cells.join('')}</div></div>`;
    }).join('');
    this.openModal(`<div class="m-title">${IC.grid}<span>${esc(t('levels'))}</span></div><p class="sub">${IC.star} ${esc(t('totalStars', { a: total, b: LEVELS * 3 }))}</p><div class="worlds">${worlds}</div>`, {
      cls: 'wide tall',
      onOpen: (m) => m.querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => (audio.play('click'), this.startLevel(+b.dataset.l)))),
    });
  }

  skinIcon(k) {
    this._sk = this._sk || {};
    if (this._sk[k.id]) return this._sk[k.id];
    const c = document.createElement('canvas');
    c.width = c.height = 120;
    const x = c.getContext('2d');
    const hex = (n) => '#' + n.toString(16).padStart(6, '0');
    // тело
    x.fillStyle = hex(k.body);
    x.beginPath();
    x.ellipse(60, 86, 26, 28, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#fff';
    x.fillRect(42, 80, 36, 6);
    // голова
    x.fillStyle = '#ffd8b8';
    x.beginPath();
    x.arc(60, 46, 24, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = '#1a1a2a';
    x.beginPath();
    x.arc(51, 47, 3.6, 0, Math.PI * 2);
    x.arc(69, 47, 3.6, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = 'rgba(255,120,120,.5)';
    x.beginPath();
    x.arc(45, 55, 4, 0, Math.PI * 2);
    x.arc(75, 55, 4, 0, Math.PI * 2);
    x.fill();
    const hc = hex(k.hatC || 0x333333);
    x.fillStyle = hc;
    switch (k.hat) {
      case 'cap':
        x.beginPath();
        x.arc(60, 40, 24, Math.PI, 0);
        x.fill();
        x.fillRect(60, 36, 30, 6);
        break;
      case 'leaf':
        x.beginPath();
        x.ellipse(66, 18, 12, 6, -0.5, 0, Math.PI * 2);
        x.fill();
        break;
      case 'ears':
      case 'bunny':
        for (const s of [-1, 1]) {
          x.beginPath();
          if (k.hat === 'ears') {
            x.moveTo(60 + s * 8, 30);
            x.lineTo(60 + s * 22, 12);
            x.lineTo(60 + s * 22, 34);
          } else x.ellipse(60 + s * 10, 12, 6, 18, s * 0.15, 0, Math.PI * 2);
          x.fill();
        }
        break;
      case 'bow':
        x.beginPath();
        x.ellipse(52, 22, 9, 6, 0, 0, Math.PI * 2);
        x.ellipse(68, 22, 9, 6, 0, 0, Math.PI * 2);
        x.fill();
        break;
      case 'band':
        x.fillRect(36, 34, 48, 7);
        break;
      case 'crown':
        x.beginPath();
        x.moveTo(44, 26);
        x.lineTo(44, 10);
        x.lineTo(52, 18);
        x.lineTo(60, 6);
        x.lineTo(68, 18);
        x.lineTo(76, 10);
        x.lineTo(76, 26);
        x.closePath();
        x.fill();
        break;
      case 'helmet':
        x.strokeStyle = 'rgba(150,210,255,.9)';
        x.lineWidth = 4;
        x.fillStyle = 'rgba(190,230,255,.35)';
        x.beginPath();
        x.arc(60, 46, 31, 0, Math.PI * 2);
        x.fill();
        x.stroke();
        break;
      case 'top':
        x.fillRect(46, 2, 28, 22);
        x.fillRect(36, 22, 48, 5);
        x.fillStyle = '#ff3a3a';
        x.fillRect(46, 18, 28, 4);
        break;
    }
    return (this._sk[k.id] = c.toDataURL());
  }
  openSkins() {
    const s = this.s;
    const render = (m) => {
      m.innerHTML = `<button class="mx" aria-label="close">${IC.close}</button><div class="m-title">${IC.shirt}<span>${esc(t('skins'))}</span></div><p class="sub">${coinsHTML(s.coins)}</p>
        <div class="skg">${SKINS.map((k) => {
          const own = s.skins.includes(k.id);
          const sel = s.skin === k.id;
          const btn = sel ? `<span class="okl">${IC.check}${esc(t('selected'))}</span>` : own ? `<button class="btn sm primary" data-sel="${k.id}">${esc(t('select'))}</button>` : k.ad ? `<button class="btn sm ad" data-ad="${k.id}">${IC.video}<span>${esc(t('forAd'))}</span></button>` : `<button class="btn sm ${s.coins >= k.price ? 'primary' : 'ghost'}" data-buy="${k.id}">${coinsHTML(k.price)}</button>`;
          return `<div class="skc ${sel ? 'sel' : ''}"><img src="${this.skinIcon(k)}" alt=""><b>${esc(t('skin_' + k.id))}</b>${btn}</div>`;
        }).join('')}</div>`;
      m.querySelector('.mx').onclick = () => this.closeModal();
      const pick = (id) => {
        s.skin = id;
        this.world.setSkin(SKINS.find((k) => k.id === id));
        save.write();
        render(m);
      };
      m.querySelectorAll('[data-sel]').forEach((b) => (b.onclick = () => (audio.play('click'), pick(b.dataset.sel))));
      m.querySelectorAll('[data-buy]').forEach(
        (b) =>
          (b.onclick = () => {
            const k = SKINS.find((q) => q.id === b.dataset.buy);
            if (s.coins < k.price) return this.toast(t('notEnough'), 'warn'), audio.play('wrong');
            s.coins -= k.price;
            s.skins.push(k.id);
            audio.play('buy');
            this.toast(t('bought'), 'good');
            pick(k.id);
          }),
      );
      m.querySelectorAll('[data-ad]').forEach(
        (b) =>
          (b.onclick = () =>
            this.rewarded(() => {
              const id = b.dataset.ad;
              if (!s.skins.includes(id)) s.skins.push(id);
              audio.play('buy');
              if (this.modal) pick(id);
            })),
      );
    };
    this.openModal('', { cls: 'wide', onOpen: render });
  }

  openShop() {
    const render = (m) => {
      const items = iap.items();
      m.innerHTML = `<button class="mx" aria-label="close">${IC.close}</button><div class="m-title">${IC.bag}<span>${esc(t('shop'))}</span></div><p class="sub">${coinsHTML(this.s.coins)}</p><div class="list">${
        items.length
          ? items.map((x) => `<div class="row"><div class="ui">${x.p.imageURI ? `<img src="${esc(x.p.imageURI)}" alt="">` : x.id === 'disable_ads' ? IC.video : IC.coin}</div><div class="rt"><b>${esc(x.p.title)}</b><small>${esc(x.p.description)}</small></div>${x.owned ? `<span class="okl">${esc(t('ownedP'))}</span>` : `<button class="btn sm primary" data-iap="${esc(x.id)}">${priceHTML(x.p)}</button>`}</div>`).join('')
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

  openGift() {
    const s = this.s;
    const today = dayNum();
    if (s.gift.last === today) return;
    const streak = s.gift.last === today - 1 ? s.gift.streak + 1 : 1;
    const amount = 50 + 25 * Math.min(streak - 1, 6);
    this.openModal(
      `<div class="m-title">${IC.gift}<span>${esc(t('gift'))}</span></div><p class="sub">${esc(t('giftDay', { n: streak }))} · ${esc(t('giftText'))}</p><div class="biggift">${coinsHTML(amount)}</div>
      <div class="m-btns"><button class="btn primary b-take">${esc(t('giftTake'))}</button></div>`,
      {
        onOpen: (m) =>
          (m.querySelector('.b-take').onclick = () => {
            s.gift = { last: today, streak };
            this.addCoins(amount);
            audio.play('buy');
            this.closeModal();
            this.menuRefresh();
          }),
      },
    );
  }

  openSettings() {
    const s = this.s.settings;
    const render = (m) => {
      m.innerHTML = `<button class="mx" aria-label="close">${IC.close}</button><div class="m-title">${IC.gear}<span>${esc(t('settings'))}</span></div>
        ${slidersHTML(s, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}
        <label class="srow"><span>${esc(t('sens'))}</span><input type="range" class="sens" min="40" max="200" step="10" value="${Math.round(s.sens * 100)}"><b>${Math.round(s.sens * 100)}%</b></label>
        <div class="srow"><span>${esc(t('autoCam'))}</span><div class="seg"><button data-ac="1" class="${s.autoCam ? 'on' : ''}">${esc(t('on'))}</button><button data-ac="0" class="${s.autoCam ? '' : 'on'}">${esc(t('off'))}</button></div></div>
        <div class="srow"><span>${esc(t('quality'))}</span><div class="seg">${['auto', 'low', 'high'].map((q) => `<button data-q="${q}" class="${s.quality === q ? 'on' : ''}">${esc(t('q_' + q))}</button>`).join('')}</div></div>
        <div class="m-btns"><button class="btn primary b-ok">${esc(t('ok'))}</button></div>`;
      m.querySelector('.mx').onclick = () => this.closeModal();
      m.querySelector('.b-ok').onclick = () => this.closeModal();
      bindSliders(m, s, () => save.write());
      const sens = m.querySelector('.sens');
      sens.addEventListener('pointerdown', (e) => e.stopPropagation());
      sens.oninput = () => {
        s.sens = sens.value / 100;
        sens.nextElementSibling.textContent = sens.value + '%';
        save.write(false);
      };
      m.querySelectorAll('[data-ac]').forEach((b) => (b.onclick = () => ((s.autoCam = b.dataset.ac === '1'), save.write(), render(m))));
      m.querySelectorAll('[data-q]').forEach(
        (b) =>
          (b.onclick = () => {
            s.quality = b.dataset.q;
            const hi = s.quality !== 'low';
            const r = this.world.renderer;
            r.setPixelRatio(Math.min(devicePixelRatio || 1, hi ? (this.touch ? 1.5 : 2) : 1));
            r.shadowMap.enabled = hi;
            this.world.sun.castShadow = hi;
            this.world.scene.traverse((o) => o.material && (o.material.needsUpdate = true));
            this.fps.done = s.quality !== 'auto';
            this.resize();
            save.write();
            render(m);
          }),
      );
    };
    this.openModal('', { onOpen: render });
  }

  async openLb() {
    const m = this.openModal(`<div class="m-title">${IC.trophy}<span>${esc(t('lbTitle'))}</span></div><p class="sub">${esc(t('lbSub'))}</p><div class="lb"><p class="sub">…</p></div>`, {});
    const res = await sdk.getLeaderboard();
    const box = m.querySelector('.lb');
    if (!box) return;
    const total = Object.values(this.s.stars).reduce((a, b) => a + b, 0);
    if (!res.available) {
      box.innerHTML = `<p class="sub">${esc(t('lbEmpty'))}</p><p class="sub">${IC.star} ${esc(t('totalStars', { a: total, b: LEVELS * 3 }))}</p>`;
      return;
    }
    box.innerHTML =
      res.entries.map((e) => `<div class="lbr ${e.me ? 'me' : ''}"><b>${e.rank}</b><span>${esc(e.name || (e.me ? t('you') : '—'))}</span><em>${IC.star} ${e.score}</em></div>`).join('') +
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

  persist() {
    save.write();
  }

  _injectCss() {
    const st = document.createElement('style');
    st.textContent = volumeCss({ accent: '#ff7a2a', muted: '#6a7a9a', track: '#dde4f4', thumb: '#fff' });
    document.head.appendChild(st);
  }
}
