// Игра: заброс, поклёвка, вываживание, улов, садок и коптильня, магазин, атлас, водоёмы,
// ежедневные задания и подарки, кот Мурзик, реклама и покупки
import { sdk } from './sdk.js';
import { save } from './save.js';
import { audio } from './audio.js';
import { iap, priceHTML } from './iap.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import { t, fishName, fmtNum, fmtW, fmtTime, LANG } from './i18n.js';
import { IC, baitIc, gearIc, weatherIc, partIc } from './icons.js';
import { Scene } from './scene.js';
import { drawFish, fishImg } from './fishart.js';
import { SPECIES, SPECIES_ORDER, LOCATIONS, BAITS, BAIT_ORDER, GEAR, GEAR_ORDER, SMOKE_MIN, SMOKE_MUL, WEATHER, xpNeed, dayPart, rollFish, fishPrice, fishXp, fightRatio, fightStep } from './data.js';
import { dayNum, weatherAt, weatherNext, fishOfDay, makeQuests, questEvent, GIFTS, giftState, CHEST } from './daily.js';

const AD_GAP = 180000;
const FREE_GAP = 300000;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const coinsHTML = (n) => `<span class="cn">${IC.coin}<b>${fmtNum(n)}</b></span>`;

export const IAP_DEFS = {
  coins_1000: { grant: () => game && game.addCoins(1000, true) },
  coins_5000: { grant: () => game && game.addCoins(5000, true) },
  coins_15000: { grant: () => game && game.addCoins(15000, true) },
  disable_ads: {
    permanent: true,
    grant: () => {
      save.data.noAds = true;
      sdk.noAds = true;
    },
  },
};
let game = null;

const stars = (r) => `<span class="stars r${r}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < r ? 'on' : ''}">${IC.star}</i>`).join('')}</span>`;

export class Game {
  constructor() {
    game = this;
    window.__game = this;
    window.__drawFish = drawFish;
    this.s = save.data;
    this.cv = document.getElementById('cv');
    this.scene = new Scene(this.cv);
    this.ui = document.getElementById('ui');
    this.menuEl = document.getElementById('menu');
    this.modalEl = document.getElementById('modal');
    this.toastEl = document.getElementById('toasts');
    this.phase = 'menu';
    this.modal = null;
    this.queue = [];
    this.holding = false;
    this.lastAd = Date.now();
    this.bubT = 12;
    this.catT = 70 + Math.random() * 60;
    this.catLife = 0;
    this.envT = 0;
    this.hudT = 0;
    this.lbT = 0;
    this.smokeSeen = new Set();
    this.env = {};
    this._injectCss();
    this.refreshDaily();
    this.refreshEnv(true);
    this.resize();
    addEventListener('resize', () => this.resize());
    this._buildHud();
    this._buildMenu();
    this._input();
    iap.onChange(() => {
      this.s.noAds = this.s.noAds || iap.owned.has('disable_ads');
      this.hud(true);
    });
    this.last = performance.now();
    requestAnimationFrame((tt) => this.loop(tt));
  }

  // ---------- окружение: время суток, погода, рыба дня ----------
  refreshEnv(force) {
    const now = Date.now();
    const o = window.__env || {};
    const part = o.part || dayPart(new Date(now).getHours());
    const weather = o.weather || weatherAt(now);
    const fd = fishOfDay(this.s.loc, dayNum(now));
    const changed = part !== this.env.part || weather !== this.env.weather || fd !== this.env.fd || this.env.loc !== this.s.loc;
    this.env = { part, weather, fd, loc: this.s.loc };
    if (changed || force) {
      this.scene.setEnv(this.s.loc, part, weather, this.s.char || 'm');
      this.scene.rodLvl = this.s.gear.rod;
      audio.setMood(this.phase === 'menu' ? 'menu' : part === 'night' ? 'night' : 'day');
      if (this.ui) this.hud(true);
    }
  }
  biteRating() {
    const { part, weather } = this.env;
    let r = 3;
    if (weather === 'cloud' || weather === 'rain') r++;
    if (weather === 'rain' && part !== 'day') r++;
    if (part === 'morning' || part === 'evening') r++;
    if (part === 'day' && weather === 'sun') r--;
    return clamp(r, 2, 5);
  }

  refreshDaily() {
    const d = dayNum();
    if (this.s.daily.day !== d) {
      this.s.daily = { day: d, quests: makeQuests(d, this.s.lvl, this.s.locs), chest: false };
      save.write(false);
    }
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.scene.resize(innerWidth, innerHeight, dpr);
    document.body.classList.toggle('port', innerWidth / innerHeight < 0.85);
  }

  // ---------- главный цикл ----------
  loop(tt) {
    const dt = Math.min(0.05, Math.max(0, (tt - this.last) / 1000));
    this.last = tt;
    try {
      this.update(dt);
      this.scene.draw(dt);
    } catch (e) {
      console.error(e);
    }
    requestAnimationFrame((x) => this.loop(x));
  }

  update(dt) {
    this.envT -= dt;
    if (this.envT <= 0) {
      this.envT = 10;
      this.refreshEnv();
      this.refreshDaily();
      this.checkSmoke();
    }
    const play = this.phase !== 'menu';
    const S = this.scene;
    // пузыри — хорошее место
    if (play && !this.modal) {
      if (S.bubbles) {
        S.bubbles.life -= dt;
        if (S.bubbles.life <= 0) S.bubbles = null;
      } else if (this.phase === 'idle' || this.phase === 'wait') {
        this.bubT -= dt;
        if (this.bubT <= 0) this.spawnBubbles();
      }
      // кот
      if (S.cat.on) {
        this.catLife -= dt;
        if (this.catLife <= 0) S.cat.on = false;
      } else if (this.phase === 'idle' || this.phase === 'wait') {
        this.catT -= dt;
        if (this.catT <= 0) {
          S.cat.on = true;
          this.catLife = 90;
          this.catT = rnd(240, 420);
          audio.play('meow');
        }
      }
      // звуки природы
      if (Math.random() < dt * 0.06) audio.play(this.env.part === 'night' ? 'frog' : 'bird');
      if (this.env.weather === 'rain' && Math.random() < dt * 0.8) audio.play('drip');
    }
    const ph = this.phase;
    if (ph === 'cast') this._updCast(dt);
    else if (ph === 'wait') this._updWait(dt);
    else if (ph === 'bite') this._updBite(dt);
    else if (ph === 'fight') this._updFight(dt);
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.25;
      this.hud();
    }
  }

  spawnBubbles() {
    const S = this.scene;
    const L = S.L;
    const reach = GEAR.rod.reach[this.s.gear.rod];
    const d = rnd(0.25, reach * 0.95);
    const y = L.nearY - d * (L.nearY - L.farY);
    const x = rnd(L.pierEnd + 90 * L.S, S.W - 70 * L.S);
    S.bubbles = { x, y, life: 22 };
    this.bubT = rnd(14, 26);
    if (!this.s.bubSeen) {
      this.s.bubSeen = true;
      this.toast(t('h_bubbles'), 'tip');
    }
  }

  // ---------- заброс ----------
  netCap() {
    return GEAR.net.val[this.s.gear.net];
  }
  tryCast(x, y) {
    if (this.s.keep.length >= this.netCap()) {
      this.toast(t('h_full'), 'warn');
      audio.play('wrong');
      this.pulse('.h-net');
      return;
    }
    const S = this.scene;
    const reach = GEAR.rod.reach[this.s.gear.rod];
    const p = S.castPoint(x, y, reach);
    if (!p) return;
    if (p.clamped && !this._farTold) {
      this._farTold = true;
      this.toast(t('tooFar'), 'tip');
    }
    const B = S.bubbles;
    const k = S.k(p.y);
    const onBub = !!(B && Math.hypot(B.x - p.x, (B.y - p.y) * 2.2) < 70 * S.L.S * k);
    this.cast = { x: p.x, y: p.y, d: p.d, bubbles: onBub, t: 0 };
    S.float = null;
    S.castAnim = 0.55;
    S.pose = 'idle';
    this.phase = 'cast';
    this.s.stats.casts++;
    audio.play('cast');
    this.hud(true);
  }
  _updCast(dt) {
    const C = this.cast;
    const S = this.scene;
    C.t += dt;
    if (C.t > 0.22) {
      const p = clamp((C.t - 0.22) / 0.5, 0, 1);
      const tip = S.tip || { x: C.x, y: C.y };
      if (!C.from) C.from = { x: tip.x, y: tip.y };
      const h = (120 + 120 * C.d) * S.L.S;
      S.float = { x: C.from.x + (C.x - C.from.x) * p, y: C.from.y + (C.y - C.from.y) * p - Math.sin(p * Math.PI) * h, st: 'air' };
      if (p >= 1) {
        S.float = { x: C.x, y: C.y, st: 'water' };
        S.splash(C.x, C.y, 0.45);
        audio.play('plop');
        this.phase = 'wait';
        this.startWait();
      }
    }
  }
  startWait() {
    const C = this.cast;
    const W = WEATHER[this.env.weather];
    const part = this.env.part;
    let w = rnd(3, 7.5) * BAITS[this.s.cur].bite * W.wait * (C.bubbles ? 0.55 : 1) * (this.s.luck > 0 ? 0.75 : 1) * (part === 'morning' || part === 'evening' ? 0.85 : 1);
    if (!this.s.tutDone) w = 2.6;
    this.waitT = w;
    this.nibbles = [];
    if (this.s.tutDone) {
      const n = Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) this.nibbles.push(rnd(0.8, Math.max(1, w - 0.8)));
      this.nibbles.sort((a, b) => b - a);
    }
    this.nibT = 0;
  }
  _updWait(dt) {
    const S = this.scene;
    this.waitT -= dt;
    const F = S.float;
    if (F.st === 'nibble') {
      F.p += dt / 0.35;
      if (F.p >= 1) F.st = 'water';
    }
    if (this.nibbles.length && this.waitT <= this.nibbles[0]) {
      this.nibbles.shift();
      F.st = 'nibble';
      F.p = 0;
      S.ripple(F.x, F.y, 0.6);
      audio.play('nibble');
    }
    if (this.waitT <= 0) {
      F.st = 'bite';
      S.pose = 'bite';
      S.ripple(F.x, F.y, 1.2);
      S.splash(F.x, F.y, 0.25);
      this.biteT = this.s.tutDone ? 1.6 : 4;
      this.phase = 'bite';
      audio.play('bite');
      try {
        navigator.vibrate && navigator.vibrate(60);
      } catch (e) {}
      this.hud(true);
    }
  }
  _updBite(dt) {
    this.biteT -= dt;
    if (this.biteT <= 0) {
      this.useBait();
      this.toast(t('missed'));
      audio.play('wrong');
      this.reset();
    }
  }
  reset() {
    const S = this.scene;
    S.float = null;
    S.fish = null;
    S.pose = 'idle';
    S.tension = 0;
    this.holding = false;
    this.phase = 'idle';
    this.hud(true);
  }
  useBait() {
    const b = this.s.cur;
    if (b === 'worm') return;
    this.s.bait[b] = Math.max(0, (this.s.bait[b] || 0) - 1);
    if (this.s.bait[b] <= 0) {
      this.s.cur = 'worm';
      this.toast(t('baitOut'), 'tip');
    }
  }

  // ---------- подсечка и вываживание ----------
  hook() {
    const C = this.cast;
    const loc = LOCATIONS[this.s.loc];
    const luck = this.s.luck > 0;
    const f = rollFish({ loc, bait: this.s.cur, part: this.env.part, weather: this.env.weather, d: C.d, bubbles: C.bubbles, luck, fishDay: this.env.fd });
    if (window.__forceFish) Object.assign(f, window.__forceFish);
    this.useBait();
    if (luck) this.s.luck--;
    const ratio = fightRatio(f.id, f.w, this.s.gear.rod, loc.pow) * (this.s.tutDone ? 1 : 0.5);
    this.fight = { ...f, p: 0, T: 0, ratio, rush: 0, warn: 0, next: rnd(1.2, 2.4), side: Math.random() < 0.5 ? -1 : 1, sway: 0 };
    const S = this.scene;
    S.float.st = 'fight';
    S.fish = { show: true, id: f.id, x: S.float.x, y: S.float.y, ang: 0, sz: clamp(60 + Math.sqrt(f.w) * 30, 60, 170) };
    S.pose = 'fight';
    S.splash(S.float.x, S.float.y, 0.8);
    audio.play('hook');
    audio.play('splash', 0.7);
    this.phase = 'fight';
    this.hud(true);
  }
  _updFight(dt) {
    const F = this.fight;
    const S = this.scene;
    const L = S.L;
    const ev = fightStep(F, this.holding, dt, this.s.gear);
    if (ev === 'rush') {
      audio.play('splash', 0.8);
      S.splash(S.fish.x, S.fish.y, 0.9);
    }
    const rush = F.rush > 0;
    if (rush && Math.random() < dt * 6) S.splash(S.fish.x, S.fish.y, 0.5);
    if (this.holding) audio.play('reel');
    if (F.T > 0.8 && this.holding) audio.play('tense');
    // положение рыбы: от места заброса к мосткам, с вилянием
    const C = this.cast;
    const ex = L.pierEnd + 50 * L.S,
      ey = L.deckY + 26 * L.S;
    F.sway += dt * (rush ? 3.2 : 1.2);
    const lat = Math.sin(F.sway) * 60 * L.S * (1 - F.p * 0.7) + (rush ? F.side * 30 * L.S : 0);
    const px = C.x + (ex - C.x) * F.p + lat,
      py = C.y + (ey - C.y) * F.p;
    const ox = S.fish.x;
    S.fish.x += (px - S.fish.x) * Math.min(1, dt * 5);
    S.fish.y += (py - S.fish.y) * Math.min(1, dt * 5);
    S.fish.ang = Math.atan2(S.fish.y - py, (S.fish.x - ox) * 3 + 0.001);
    S.float.x = S.fish.x;
    S.float.y = S.fish.y;
    S.tension = F.T;
    if (F.T >= 1) return this.lineBreak();
    if (F.p >= 1) return this.land();
  }

  lineBreak() {
    const F = this.fight;
    audio.play('break');
    this.scene.splash(this.scene.fish.x, this.scene.fish.y, 1);
    this.reset();
    this.openModal(
      `<div class="m-title warn">${esc(t('broke'))}</div>
      <div class="brk"><img src="${fishImg(F.id, 200, true)}" alt=""><p>${esc(t('brokeText'))}</p></div>
      <div class="m-btns"><button class="btn ad b-ad">${IC.video}<span>${esc(t('brokeAd'))}</span></button><button class="btn ghost b-ok">${esc(t('brokeOk'))}</button></div>`,
      {
        cls: 'small',
        onOpen: (m) => {
          m.querySelector('.b-ok').onclick = () => this.closeModal();
          m.querySelector('.b-ad').onclick = () =>
            this.rewarded(() => {
              this.closeModal(true);
              this.caught(F);
            });
        },
      },
    );
  }

  land() {
    const F = this.fight;
    const S = this.scene;
    this.phase = 'land';
    this.holding = false;
    S.splash(S.fish.x, S.fish.y, 1);
    audio.play('splash', 1);
    const L = S.L;
    const sz = S.fish.sz * S.L.S;
    S.jump = { id: F.id, t: 0, dur: 0.8, x0: S.fish.x, y0: S.fish.y, x1: L.fx + 60 * L.S, y1: L.deckY - 110 * L.S, h: 90 * L.S, s0: sz * 0.8, s1: Math.min(sz, 150 * L.S), cb: () => setTimeout(() => this.caught(F), 150) };
    S.fish = null;
    S.float = null;
    S.pose = 'joy';
    S.tension = 0;
  }

  // рыба поймана: цена, опыт, атлас, задания
  caught(F) {
    const S = this.scene;
    S.jump = null;
    S.pose = 'joy';
    this.phase = 'catch';
    const loc = LOCATIONS[this.s.loc];
    const Sp = SPECIES[F.id];
    const fishDay = F.id === this.env.fd;
    const price = fishPrice(F.id, F.w, loc) * (fishDay ? 2 : 1);
    const a = this.s.atlas[F.id] || { n: 0, best: 0 };
    const isNew = a.n === 0;
    const isRec = !isNew && F.w > a.best;
    a.n++;
    a.best = Math.max(a.best, F.w);
    this.s.atlas[F.id] = a;
    const st = this.s.stats;
    st.caught++;
    st.grams += Math.round(F.w * 1000);
    if (Sp.r === 5) st.legends++;
    const xp = fishXp(F.id, F.w);
    this.s.xp += xp;
    const fin = questEvent(this.s.daily.quests, { t: 'catch', id: F.id, w: F.w, bubbles: this.cast && this.cast.bubbles });
    if (this.cast && this.cast.bubbles) S.bubbles = null;
    this.s.tutDone = true;
    const fish = { id: F.id, w: F.w, p: price };
    save.write();
    if (st.caught % 5 === 0) this.submit();
    audio.play(Sp.r >= 5 ? 'legend' : Sp.r >= 3 || isNew ? 'rare' : 'catch');
    const badges = [];
    if (Sp.r === 5) badges.push(`<span class="badge gold">${esc(t('legend'))}</span>`);
    if (isNew) badges.push(`<span class="badge new">${esc(t('newSpecies'))}</span>`);
    if (isRec) badges.push(`<span class="badge rec">${esc(t('record'))}</span>`);
    if (fishDay) badges.push(`<span class="badge day">${esc(t('fishDayBadge'))}</span>`);
    const after = () => {
      fin.forEach(() => this.toast(t('questDone'), 'good'));
      if (fin.length) audio.play('quest');
      this.checkLevel();
    };
    if (F.id === 'goldfish') return this.wish(fish, badges, after);
    this.openModal(
      `<div class="m-title">${esc(t('catchTitle'))}</div>
      <div class="badges">${badges.join('')}</div>
      <canvas class="fishcv"></canvas>
      <div class="c-name">${esc(fishName(F.id))}</div>
      <div class="c-row">${stars(Sp.r)}<span class="rname r${Sp.r}">${esc(t('r' + Sp.r))}</span></div>
      <div class="c-info"><div><small>${esc(t('weight'))}</small><b>${esc(fmtW(F.w))}</b></div><div><small>${esc(t('price'))}</small>${coinsHTML(price)}</div><div><small>XP</small><b>+${xp}</b></div></div>
      <div class="m-btns"><button class="btn primary b-keep">${IC.bucket}<span>${esc(t('toNet'))}</span></button></div>`,
      {
        cls: 'catch' + (Sp.r >= 4 ? ' big' : ''),
        onOpen: (m) => {
          this._drawFishCv(m.querySelector('.fishcv'), F.id);
          if (Sp.r >= 3) this.confetti(m);
          m.querySelector('.b-keep').onclick = () => {
            this.s.keep.push(fish);
            save.write();
            this.closeModal();
            after();
          };
        },
        onClose: () => {
          if (!this.s.keep.includes(fish) && this.phase === 'catch') {
            this.s.keep.push(fish);
            save.write();
            after();
          }
          this.reset();
        },
      },
    );
  }

  _drawFishCv(cv, id) {
    const Sp = SPECIES[id];
    const ar = Math.max(0.5, Sp.h * 2.1);
    const w = Math.round(Math.min(380, innerWidth * 0.78, (innerHeight * 0.26) / ar));
    const h = Math.round(w * ar);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = w * dpr;
    cv.height = h * dpr;
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    const x = cv.getContext('2d');
    x.scale(dpr, dpr);
    let tt = 0;
    const draw = () => {
      if (!cv.isConnected) return;
      tt += 1 / 60;
      x.clearRect(0, 0, w, h);
      drawFish(x, id, w / 2, h * (Sp.r === 5 ? 0.56 : 0.52) + Math.sin(tt * 2) * 3, w * 0.9, { wig: Math.sin(tt * 4) * 0.35 });
      requestAnimationFrame(draw);
    };
    draw();
  }

  // золотая рыбка исполняет желание
  wish(fish, badges, after) {
    const coins = 1500 + 150 * this.s.lvl;
    this.openModal(
      `<div class="m-title gold">${esc(t('wishTitle'))}</div>
      <div class="badges">${badges.join('')}</div>
      <canvas class="fishcv"></canvas>
      <p class="wish">${esc(t(this.s.char === 'f' ? 'wishTextF' : 'wishText'))}</p>
      <div class="m-col">
        <button class="btn primary b-c">${IC.coin}<span>${esc(t('wishCoins', { n: fmtNum(coins) }))}</span></button>
        <button class="btn green b-l">${IC.clover}<span>${esc(t('wishLuck', { n: 25 }))}</span></button>
        <button class="btn ghost b-k">${IC.bucket}<span>${esc(t('wishKeep'))} · ${fmtNum(fish.p)}</span></button>
      </div>`,
      {
        cls: 'catch big',
        onOpen: (m) => {
          this._drawFishCv(m.querySelector('.fishcv'), fish.id);
          this.confetti(m);
          const done = (fn) => () => {
            fn();
            save.write();
            this.closeModal(true);
            this.reset();
            this.toast(t('wishDone'), 'good');
            audio.play('gift');
            after();
          };
          m.querySelector('.b-c').onclick = done(() => this.addCoins(coins));
          m.querySelector('.b-l').onclick = done(() => (this.s.luck += 25));
          m.querySelector('.b-k').onclick = done(() => this.s.keep.push(fish));
        },
        onClose: () => {
          this.reset();
          after();
        },
      },
    );
  }

  // ---------- уровни ----------
  checkLevel() {
    let up = false;
    const unlocked = [];
    while (this.s.xp >= xpNeed(this.s.lvl)) {
      this.s.xp -= xpNeed(this.s.lvl);
      this.s.lvl++;
      up = true;
      LOCATIONS.forEach((L) => L.lvl === this.s.lvl && unlocked.push(t('loc_' + L.id)));
      BAIT_ORDER.forEach((b) => BAITS[b].lvl === this.s.lvl && b !== 'jig' && unlocked.push(t('bait_' + b)));
    }
    if (!up) return;
    const bonus = this.s.lvl * 40;
    this.addCoins(bonus);
    this.submit();
    save.write();
    audio.play('level');
    const show = () =>
      this.openModal(
        `<div class="m-title">${esc(t('levelUp'))}</div>
        <div class="lv-big">${this.s.lvl}</div>
        <p class="lv-sub">${esc(t('bonus', { n: fmtNum(bonus) }))}</p>
        ${unlocked.length ? `<p class="lv-un">${esc(t('unlocked', { s: unlocked.join(', ') }))}</p>` : ''}
        <div class="m-btns"><button class="btn primary b-ok">${esc(t('great'))}</button></div>`,
        { cls: 'small lvup', onOpen: (m) => (this.confetti(m), (m.querySelector('.b-ok').onclick = () => this.closeModal())) },
      );
    if (this.modal) this.queue.push(show);
    else show();
  }

  addCoins(n, iapGrant) {
    this.s.coins += n;
    if (!iapGrant) this.s.stats.earned += n;
    this.hud(true);
    this.flyCoins();
  }

  // ---------- реклама ----------
  setGameplay() {
    sdk.gameplay(this.phase !== 'menu' && !this.modal && !document.hidden && !sdk.adActive);
  }
  rewarded(onReward) {
    audio.suspend('ad');
    this.holding = false;
    sdk.showRewarded(onReward, () => {
      audio.resume('ad');
      this.setGameplay();
    });
  }
  interstitial(after) {
    if (this.s.noAds || Date.now() - this.lastAd < AD_GAP || this.s.sales < 2) return after && after();
    this.lastAd = Date.now();
    audio.suspend('ad');
    this.holding = false;
    sdk.showInterstitial(() => {
      audio.resume('ad');
      this.setGameplay();
      after && after();
    });
  }
  submit() {
    if (Date.now() - this.lbT < 5000) return;
    this.lbT = Date.now();
    sdk.submitScore(this.s.stats.grams);
  }

  // ---------- ввод ----------
  _input() {
    const cv = this.cv;
    const down = (e) => {
      if (this.phase === 'menu' || this.modal) return;
      const x = e.clientX,
        y = e.clientY;
      const S = this.scene;
      const cb = S.catBox;
      if (S.cat.on && cb && x > cb.x && x < cb.x + cb.w && y > cb.y && y < cb.y + cb.h && (this.phase === 'idle' || this.phase === 'wait')) return this.openCat();
      this.press(x, y);
    };
    cv.addEventListener('pointerdown', down);
    const up = () => (this.holding = false);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
    addEventListener('blur', up);
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        if (this.phase === 'menu' || this.modal) return;
        e.preventDefault();
        const S = this.scene;
        const L = S.L;
        const reach = GEAR.rod.reach[this.s.gear.rod];
        this.press(S.W * 0.62, L.nearY - reach * 0.7 * (L.nearY - L.farY), true);
      }
    });
    addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'Enter') this.holding = false;
    });
  }
  // нажатие по воде / кнопке действия
  press(x, y, key) {
    const ph = this.phase;
    if (ph === 'idle') this.tryCast(x, y);
    else if (ph === 'wait') {
      const F = this.scene.float;
      if (F && F.st === 'nibble') {
        this.toast(t('early'), 'tip');
        audio.play('wrong');
      } else if (!key) this.tryCast(x, y);
    } else if (ph === 'bite') this.hook();
    else if (ph === 'fight') this.holding = true;
  }

  // ---------- HUD ----------
  _buildHud() {
    this.ui.innerHTML = `
      <div class="top-l">
        <button class="lvl h-lvl" aria-label="level"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" class="ring-bg"/><circle cx="24" cy="24" r="20" class="ring"/></svg><b></b></button>
        <div class="coins h-coins">${IC.coin}<b></b></div>
      </div>
      <button class="env h-env"></button>
      <div class="side">
        <button class="sb h-gift hidden">${IC.gift}<span>${esc(t('gift'))}</span></button>
        <button class="sb h-quests">${IC.tasks}<span>${esc(t('quests'))}</span><i class="dot"></i></button>
        <button class="sb h-atlas">${IC.book}<span>${esc(t('atlas'))}</span></button>
        <button class="sb h-map">${IC.map}<span>${esc(t('map'))}</span></button>
        <button class="sb h-shop">${IC.bag}<span>${esc(t('shop'))}</span></button>
      </div>
      <button class="gearb h-set" aria-label="settings">${IC.gear}</button>
      <div class="buffs"></div>
      <div class="bottom">
        <button class="bb h-net">${IC.bucket}<b class="net-n"></b><span>${esc(t('net'))}</span><i class="smk hidden">${IC.smoke}</i></button>
        <div class="act"></div>
        <button class="bb h-bait"><span class="bait-ic"></span><b class="bait-n"></b><span class="bait-l">${esc(t('bait'))}</span></button>
      </div>`;
    const q = (s) => this.ui.querySelector(s);
    this.el = {
      lvl: q('.h-lvl b'),
      ring: q('.h-lvl .ring'),
      coins: q('.h-coins b'),
      env: q('.h-env'),
      gift: q('.h-gift'),
      quests: q('.h-quests'),
      net: q('.net-n'),
      smk: q('.smk'),
      baitIc: q('.bait-ic'),
      baitN: q('.bait-n'),
      act: q('.act'),
      buffs: q('.buffs'),
    };
    const on = (s, fn) =>
      (q(s).onclick = (e) => {
        e.stopPropagation();
        audio.play('click');
        fn();
      });
    on('.h-gift', () => this.openGift());
    on('.h-quests', () => this.openQuests());
    on('.h-atlas', () => this.openAtlas());
    on('.h-map', () => this.openMap());
    on('.h-shop', () => this.openShop());
    on('.h-set', () => this.openSettings());
    on('.h-net', () => this.openNet());
    on('.h-bait', () => this.openBait());
    on('.h-env', () => this.openForecast());
    on('.h-lvl', () => this.openAtlas());
    // кнопка действия: подсечь / тянуть
    this.el.act.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.actbtn');
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      if (this.phase === 'bite') this.hook();
      else if (this.phase === 'fight') this.holding = true;
    });
    this.ui.addEventListener('pointerdown', (e) => {
      if (e.target === this.ui || e.target.classList.contains('bottom') || e.target.classList.contains('side') || e.target.classList.contains('act')) {
        if (!this.modal && this.phase !== 'menu') this.press(e.clientX, e.clientY);
      }
    });
    this.hud(true);
  }

  hud(force) {
    if (!this.el) return;
    const s = this.s;
    const e = this.el;
    const S = this.scene;
    const ph = this.phase;
    this.ui.classList.toggle('hidden', ph === 'menu');
    e.lvl.textContent = s.lvl;
    const need = xpNeed(s.lvl);
    const c = 2 * Math.PI * 20;
    e.ring.style.strokeDasharray = `${(c * clamp(s.xp / need, 0, 1)).toFixed(1)} ${c.toFixed(1)}`;
    e.coins.textContent = fmtNum(s.coins);
    // окружение
    const envKey = [this.env.part, this.env.weather, this.env.fd, LANG].join();
    if (force || envKey !== this._envKey) {
      this._envKey = envKey;
      const r = this.biteRating();
      e.env.innerHTML = `<span class="e1">${partIc(this.env.part)}<b>${esc(t('p_' + this.env.part))}</b>${weatherIc(this.env.weather, this.env.part)}<b>${esc(t('w_' + this.env.weather))}</b></span><span class="e2">${esc(t('bite'))} <i class="dots">${'●'.repeat(r)}<u>${'●'.repeat(5 - r)}</u></i> · ${esc(t('fishDay'))}: <b>${esc(fishName(this.env.fd))}</b> ×2</span>`;
    }
    // садок и коптильня
    const cap = this.netCap();
    e.net.textContent = `${s.keep.length}/${cap}`;
    e.net.parentElement.classList.toggle('full', s.keep.length >= cap);
    const ready = s.smoke.some((x) => x.end <= Date.now());
    e.smk.classList.toggle('hidden', !ready);
    S.bucketFull = s.keep.length > 0;
    // наживка
    const b = s.cur;
    if (e._bait !== b + (s.bait[b] || 0)) {
      e._bait = b + (s.bait[b] || 0);
      e.baitIc.innerHTML = baitIc(b);
      e.baitN.textContent = b === 'worm' ? t('infinite') : s.bait[b] || 0;
    }
    // задания и подарок
    const qn = s.daily.quests.filter((x) => x.done && !x.claimed).length + (s.daily.quests.every((x) => x.claimed) && !s.daily.chest ? 1 : 0);
    this.el.quests.classList.toggle('has', qn > 0);
    e.gift.classList.toggle('hidden', !giftState(s.login).can);
    // удача
    const bk = s.luck;
    if (e._luck !== bk) {
      e._luck = bk;
      e.buffs.innerHTML = bk > 0 ? `<span class="buff">${IC.clover}${esc(t('luck', { n: bk }))}</span>` : '';
    }
    // панель действия
    const F = this.fight;
    let key = ph;
    if (ph === 'fight') key += F.T > 0.78 ? 'hi' : F.warn > 0 || F.rush > 0 ? 'rush' : 'ok';
    if (ph === 'idle') key += s.keep.length >= cap ? 'full' : s.tutDone ? '' : 'tut';
    if (force || key !== e._act) {
      e._act = key;
      let h = '';
      if (ph === 'idle') h = s.keep.length >= cap ? `<div class="hint warn">${esc(t('h_full'))}</div>` : `<div class="hint">${IC.hand}<span>${esc(t('h_cast'))}${s.tutDone ? '' : `<small>${esc(t('h_castFar'))}</small>`}</span></div>`;
      else if (ph === 'wait' || ph === 'cast') h = `<div class="hint soft"><span>${esc(t(s.tutDone ? 'h_wait' : 'h_waitTut'))}</span></div>`;
      else if (ph === 'bite') h = `<button class="actbtn bite">${esc(t('hook'))}</button>`;
      else if (ph === 'fight') {
        const msg = F.T > 0.78 ? t('h_release') : F.warn > 0 || F.rush > 0 ? t('h_rush') : t('h_fight');
        h = `<div class="fight"><div class="fmsg ${F.T > 0.78 || F.rush > 0 || F.warn > 0 ? 'hot' : ''}">${esc(msg)}</div>
          <div class="bars"><div class="bar t"><small>${esc(t('tension'))}</small><i><u></u></i></div><div class="bar p"><small>${esc(t('distance'))}</small><i><u></u></i></div></div>
          <button class="actbtn pull">${IC.reel}<span>${esc(t('pull'))}</span></button></div>`;
      }
      e.act.innerHTML = h;
      e.tbar = e.act.querySelector('.bar.t u');
      e.pbar = e.act.querySelector('.bar.p u');
      e.pullB = e.act.querySelector('.actbtn.pull');
    }
    if (ph === 'fight' && e.tbar) {
      e.tbar.style.width = (F.T * 100).toFixed(0) + '%';
      e.tbar.style.background = F.T > 0.78 ? '#e5483a' : F.T > 0.5 ? '#f2b33a' : '#4caf50';
      e.pbar.style.width = (F.p * 100).toFixed(0) + '%';
      e.pullB.classList.toggle('down', this.holding);
    }
  }

  // ---------- окна ----------
  openModal(html, o = {}) {
    this.closeModal(true);
    const m = document.createElement('div');
    m.className = 'mwrap';
    m.innerHTML = `<div class="mbox ${o.cls || ''}"><button class="mx" aria-label="close">${IC.close}</button>${html}</div>`;
    this.modalEl.appendChild(m);
    this.modal = { el: m, o };
    this.holding = false;
    m.querySelector('.mx').onclick = () => {
      audio.play('click');
      this.closeModal();
    };
    m.addEventListener('pointerdown', (e) => {
      if (e.target === m) this.closeModal();
    });
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
    if (!silent && this.queue.length && !this.modal) this.queue.shift()();
    this.setGameplay();
    this.hud(true);
  }
  tabs(list, cur) {
    return `<div class="tabs">${list.map(([k, label]) => `<button class="tab ${k === cur ? 'on' : ''}" data-tab="${k}">${label}</button>`).join('')}</div>`;
  }

  toast(msg, kind = '') {
    const d = document.createElement('div');
    d.className = 'toast ' + kind;
    d.textContent = msg;
    this.toastEl.appendChild(d);
    while (this.toastEl.children.length > 3) this.toastEl.firstChild.remove();
    setTimeout(() => d.classList.add('out'), 2400);
    setTimeout(() => d.remove(), 2900);
  }
  pulse(sel) {
    const el = this.ui.querySelector(sel);
    if (!el) return;
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
  }
  flyCoins() {
    const to = this.ui.querySelector('.h-coins');
    if (!to || this.phase === 'menu') return;
    const r = to.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      const c = document.createElement('div');
      c.className = 'flyc';
      c.innerHTML = IC.coin;
      c.style.left = innerWidth / 2 + rnd(-60, 60) + 'px';
      c.style.top = innerHeight / 2 + rnd(-40, 40) + 'px';
      document.body.appendChild(c);
      const dx = r.left + 14 - parseFloat(c.style.left),
        dy = r.top + 14 - parseFloat(c.style.top);
      c.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(.6)`, opacity: 0.9 }], { duration: 650 + i * 70, easing: 'cubic-bezier(.5,0,.8,.6)' }).onfinish = () => {
        c.remove();
        if (i === 0) audio.play('coin');
      };
    }
  }
  confetti(m) {
    const box = document.createElement('div');
    box.className = 'confetti';
    const cols = ['#f6c94a', '#f08a2a', '#4caf50', '#4a9ad8', '#e5483a'];
    for (let i = 0; i < 26; i++) {
      const p = document.createElement('i');
      p.style.left = rnd(5, 95) + '%';
      p.style.background = cols[i % 5];
      p.style.animationDelay = rnd(0, 0.5) + 's';
      p.style.animationDuration = rnd(1.4, 2.4) + 's';
      box.appendChild(p);
    }
    m.appendChild(box);
  }

  // ---------- садок и коптильня ----------
  openNet(tab = 'net') {
    const s = this.s;
    this.checkSmoke();
    const slots = GEAR.smoker.val[s.gear.smoker];
    const render = (m) => {
      const now = Date.now();
      const total = s.keep.reduce((a, f) => a + f.p, 0);
      let body = '';
      if (tab === 'net') {
        const free = s.smoke.length < slots;
        body = s.keep.length
          ? `<div class="list">${s.keep
              .map(
                (f, i) => `<div class="row"><img class="fi" src="${fishImg(f.id, 96)}" alt=""><div class="rt"><b>${esc(fishName(f.id))}</b><small>${esc(fmtW(f.w))}</small></div>${coinsHTML(f.p)}<button class="btn sm ghost" data-smoke="${i}" ${free ? '' : 'disabled'}>${IC.smoke}<span>${esc(t('toSmoke'))}</span></button></div>`,
              )
              .join('')}</div>
            <div class="m-btns"><button class="btn primary b-sell">${esc(t('sellAll'))} ${coinsHTML(total)}</button><button class="btn ad b-x2">${IC.video}<span>${esc(t('sellX2'))}</span> ${coinsHTML(total * 2)}</button></div>`
          : `<p class="empty">${esc(t('netEmpty'))}</p>`;
      } else {
        const rows = [];
        for (let i = 0; i < slots; i++) {
          const f = s.smoke[i];
          if (!f) rows.push(`<div class="row slot free"><div class="sm-ic">${IC.smoke}</div><div class="rt"><b>${esc(t('smokeFree'))}</b></div></div>`);
          else {
            const left = (f.end - now) / 1000;
            const tot = SMOKE_MIN[SPECIES[f.id].r] * 60;
            rows.push(
              `<div class="row slot"><img class="fi smoked" src="${fishImg(f.id, 96)}" alt=""><div class="rt"><b>${esc(fishName(f.id))}</b><small>${left > 0 ? esc(t('smokeLeft', { t: fmtTime(left) })) : esc(t('smokeReady'))}</small><i class="pb"><u style="width:${(100 * clamp(1 - left / tot, 0, 1)).toFixed(0)}%"></u></i></div>${coinsHTML(f.p)}${left > 0 ? `<button class="btn sm ad" data-fast="${i}">${IC.video}<span>${esc(t('smokeFast'))}</span></button>` : ''}</div>`,
            );
          }
        }
        const readySum = s.smoke.filter((f) => f.end <= now).reduce((a, f) => a + f.p, 0);
        body = `<p class="hintp">${esc(t('smokeHint'))}</p><div class="list">${rows.join('')}</div>${readySum ? `<div class="m-btns"><button class="btn primary b-take">${esc(t('smokeTake', { n: '' }))} ${coinsHTML(readySum)}</button></div>` : ''}`;
      }
      m.innerHTML = `<button class="mx" aria-label="close">${IC.close}</button><div class="m-title">${esc(tab === 'net' ? t('net') : t('smoker'))}</div>${this.tabs(
        [
          ['net', `${IC.bucket}<span>${esc(t('net'))} ${s.keep.length}/${this.netCap()}</span>`],
          ['smoke', `${IC.smoke}<span>${esc(t('smoker'))} ${s.smoke.length}/${slots}</span>`],
        ],
        tab,
      )}${body}`;
      m.querySelector('.mx').onclick = () => this.closeModal();
      m.querySelectorAll('.tab').forEach((b) => (b.onclick = () => ((tab = b.dataset.tab), audio.play('click'), render(m))));
      m.querySelectorAll('[data-smoke]').forEach(
        (b) =>
          (b.onclick = () => {
            const f = s.keep.splice(+b.dataset.smoke, 1)[0];
            s.smoke.push({ id: f.id, w: f.w, p: Math.round(f.p * SMOKE_MUL), end: Date.now() + SMOKE_MIN[SPECIES[f.id].r] * 60000 });
            const fin = questEvent(s.daily.quests, { t: 'smoke' });
            if (fin.length) (this.toast(t('questDone'), 'good'), audio.play('quest'));
            audio.play('click');
            save.write();
            render(m);
          }),
      );
      m.querySelectorAll('[data-fast]').forEach(
        (b) =>
          (b.onclick = () =>
            this.rewarded(() => {
              const f = s.smoke[+b.dataset.fast];
              if (f) f.end = Date.now();
              save.write();
              if (this.modal) render(m);
            })),
      );
      const sell = (mul) => {
        const sum = s.keep.reduce((a, f) => a + f.p, 0) * mul;
        if (!sum) return;
        s.keep = [];
        s.sales++;
        s.stats.sold++;
        this.addCoins(sum);
        const fin = questEvent(s.daily.quests, { t: 'sell', n: sum });
        if (fin.length) (this.toast(t('questDone'), 'good'), audio.play('quest'));
        this.toast(mul > 1 ? t('doubled') + ' +' + fmtNum(sum) : t('sold', { n: fmtNum(sum) }), 'good');
        audio.play('sell');
        this.submit();
        save.write();
        this._soldNow = mul === 1;
        render(m);
      };
      const bs = m.querySelector('.b-sell');
      if (bs) bs.onclick = () => sell(1);
      const bx = m.querySelector('.b-x2');
      if (bx) bx.onclick = () => this.rewarded(() => sell(2));
      const bt = m.querySelector('.b-take');
      if (bt) bt.onclick = () => this.takeSmoked(() => render(m));
    };
    this._soldNow = false;
    this.openModal('', {
      cls: 'wide',
      onOpen: (m) => {
        render(m);
        this._netTimer = setInterval(() => this.modal && tab === 'smoke' && render(m), 1000);
      },
      onClose: () => {
        clearInterval(this._netTimer);
        if (this._soldNow) this.interstitial();
      },
    });
  }
  takeSmoked(after) {
    const now = Date.now();
    const ready = this.s.smoke.filter((f) => f.end <= now);
    if (!ready.length) return;
    const sum = ready.reduce((a, f) => a + f.p, 0);
    this.s.smoke = this.s.smoke.filter((f) => f.end > now);
    this.addCoins(sum);
    const fin = questEvent(this.s.daily.quests, { t: 'sell', n: sum });
    if (fin.length) (this.toast(t('questDone'), 'good'), audio.play('quest'));
    this.toast(t('smokedGot', { n: fmtNum(sum) }), 'good');
    audio.play('sell');
    save.write();
    after && after();
  }
  checkSmoke() {
    const now = Date.now();
    let fresh = false;
    for (const f of this.s.smoke)
      if (f.end <= now && !this.smokeSeen.has(f.end + f.id)) {
        this.smokeSeen.add(f.end + f.id);
        fresh = true;
      }
    if (fresh && this.phase !== 'menu' && this._smokeToldAt !== now) {
      this._smokeToldAt = now;
      this.toast(t('smokeReadyToast'), 'good');
      this.pulse('.h-net');
    }
  }

  // ---------- наживка ----------
  openBait() {
    const s = this.s;
    const html = `<div class="m-title">${esc(t('bait'))}</div><div class="list">${BAIT_ORDER.map((b) => {
      const B = BAITS[b];
      const locked = s.lvl < B.lvl && b !== 'jig';
      const n = b === 'worm' ? t('infinite') : s.bait[b] || 0;
      const can = b === 'worm' || (s.bait[b] || 0) > 0;
      return `<div class="row ${s.cur === b ? 'sel' : ''}"><div class="bi">${baitIc(b)}</div><div class="rt"><b>${esc(t('bait_' + b))} <em>×${n}</em></b><small>${esc(t('bd_' + b))}</small></div>${
        locked ? `<span class="lockl">${IC.lock}${esc(t('fromLvl', { n: B.lvl }))}</span>` : can ? (s.cur === b ? `<span class="okl">${IC.check}</span>` : `<button class="btn sm primary" data-use="${b}">${esc(t('ok'))}</button>`) : `<button class="btn sm ghost" data-buy="${b}">${IC.plus}</button>`
      }</div>`;
    }).join('')}</div>`;
    this.openModal(html, {
      cls: 'wide',
      onOpen: (m) => {
        m.querySelectorAll('[data-use]').forEach(
          (b) =>
            (b.onclick = () => {
              s.cur = b.dataset.use;
              audio.play('click');
              save.write();
              this.closeModal();
            }),
        );
        m.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => this.openShop('bait')));
      },
    });
  }

  // ---------- магазин ----------
  openShop(tab = 'gear') {
    const s = this.s;
    const render = (m) => {
      let body = '';
      if (tab === 'gear') {
        body = `<div class="list">${GEAR_ORDER.map((k) => {
          const G = GEAR[k];
          const lv = s.gear[k];
          const max = lv >= G.cost.length - 1;
          const nm = k === 'rod' || k === 'reel' || k === 'line' ? t(k + Math.min(lv + (max ? 0 : 1), 5)) : '';
          const desc = k === 'net' ? t('d_net', { n: G.val[Math.min(lv + (max ? 0 : 1), G.val.length - 1)] }) : k === 'smoker' ? t('d_smoker', { n: G.val[Math.min(lv + (max ? 0 : 1), G.val.length - 1)] }) : t('d_' + k);
          const cost = max ? 0 : G.cost[lv + 1];
          return `<div class="row"><div class="bi">${gearIc(k)}</div><div class="rt"><b>${esc(t('gear_' + k))}${nm ? ' · ' + esc(nm) : ''}</b><small>${esc(desc)}</small><span class="lvls">${G.cost.map((_, i) => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</span></div>${
            max ? `<span class="okl">${esc(t('maxLvl'))}</span>` : `<button class="btn sm ${s.coins >= cost ? 'primary' : 'ghost'}" data-gear="${k}">${coinsHTML(cost)}</button>`
          }</div>`;
        }).join('')}</div>`;
      } else if (tab === 'bait') {
        body = `<div class="list">${BAIT_ORDER.filter((b) => b !== 'worm').map((b) => {
          const B = BAITS[b];
          const locked = s.lvl < B.lvl;
          return `<div class="row"><div class="bi">${baitIc(b)}</div><div class="rt"><b>${esc(t('bait_' + b))} <em>${esc(t('pack', { n: B.pack }))}</em></b><small>${esc(t('bd_' + b))} · ${esc(t('have', { n: s.bait[b] || 0 }))}</small></div>${
            locked ? `<span class="lockl">${IC.lock}${esc(t('fromLvl', { n: B.lvl }))}</span>` : `<button class="btn sm ${s.coins >= B.cost ? 'primary' : 'ghost'}" data-bait="${b}">${coinsHTML(B.cost)}</button>`
          }</div>`;
        }).join('')}</div>`;
      } else {
        const wait = s.freeAt - Date.now();
        const free = 100 + 40 * s.lvl;
        const items = iap.items();
        body = `<div class="list">
          <div class="row"><div class="bi">${IC.coin}</div><div class="rt"><b>${esc(t('freeCoins'))}</b><small>${esc(t('freeCoinsDesc', { n: free }))}</small></div>${wait > 0 ? `<span class="okl">${esc(t('freeWait', { t: fmtTime(wait / 1000) }))}</span>` : `<button class="btn sm ad s-ad">${IC.video}<span>+${free}</span></button>`}</div>
          ${items.map((x) => `<div class="row"><div class="bi">${x.p.imageURI ? `<img src="${esc(x.p.imageURI)}" alt="">` : x.id === 'disable_ads' ? IC.video : IC.coin}</div><div class="rt"><b>${esc(x.p.title)}</b><small>${esc(x.p.description)}</small></div>${x.owned ? `<span class="okl">${esc(t('owned'))}</span>` : `<button class="btn sm primary" data-iap="${esc(x.id)}">${priceHTML(x.p)}</button>`}</div>`).join('')}
          ${items.length ? '' : `<p class="empty">${esc(t('shopEmpty'))}</p>`}
        </div>`;
      }
      m.innerHTML = `<button class="mx" aria-label="close">${IC.close}</button><div class="m-title">${esc(t('shop'))} <span class="mc">${coinsHTML(s.coins)}</span></div>${this.tabs(
        [
          ['gear', `${IC.rod}<span>${esc(t('tab_gear'))}</span>`],
          ['bait', `${IC.worm}<span>${esc(t('tab_bait'))}</span>`],
          ['coins', `${IC.coin}<span>${esc(t('tab_coins'))}</span>`],
        ],
        tab,
      )}${body}`;
      m.querySelector('.mx').onclick = () => this.closeModal();
      m.querySelectorAll('.tab').forEach((b) => (b.onclick = () => ((tab = b.dataset.tab), audio.play('click'), render(m))));
      m.querySelectorAll('[data-gear]').forEach(
        (b) =>
          (b.onclick = () => {
            const k = b.dataset.gear;
            const cost = GEAR[k].cost[s.gear[k] + 1];
            if (s.coins < cost) return this.toast(t('notEnough'), 'warn'), audio.play('wrong');
            s.coins -= cost;
            s.gear[k]++;
            this.scene.rodLvl = s.gear.rod;
            audio.play('sell');
            this.toast(t('bought'), 'good');
            save.write();
            render(m);
          }),
      );
      m.querySelectorAll('[data-bait]').forEach(
        (b) =>
          (b.onclick = () => {
            const k = b.dataset.bait;
            const B = BAITS[k];
            if (s.coins < B.cost) return this.toast(t('notEnough'), 'warn'), audio.play('wrong');
            s.coins -= B.cost;
            s.bait[k] = (s.bait[k] || 0) + B.pack;
            s.cur = k;
            audio.play('sell');
            this.toast(t('bought'), 'good');
            save.write();
            render(m);
          }),
      );
      const sa = m.querySelector('.s-ad');
      if (sa)
        sa.onclick = () =>
          this.rewarded(() => {
            s.freeAt = Date.now() + FREE_GAP;
            this.addCoins(100 + 40 * s.lvl);
            save.write();
            if (this.modal) render(m);
          });
      m.querySelectorAll('[data-iap]').forEach(
        (b) =>
          (b.onclick = async () => {
            m.querySelectorAll('[data-iap]').forEach((x) => (x.disabled = true));
            await iap.buy(b.dataset.iap);
            this.hud(true);
            if (this.modal) render(m);
          }),
      );
    };
    this.openModal('', { cls: 'wide', onOpen: render });
  }

  // ---------- атлас ----------
  openAtlas() {
    const s = this.s;
    let li = s.loc;
    const total = SPECIES_ORDER.length;
    const got = SPECIES_ORDER.filter((id) => s.atlas[id]).length;
    const render = (m) => {
      const L = LOCATIONS[li];
      const cards = L.fish
        .map((id) => {
          const a = s.atlas[id];
          const S = SPECIES[id];
          const baits = S.baits.length ? S.baits.map((b) => t('bait_' + b)).join(', ') : t('bait_jig');
          return `<div class="card ${a ? '' : 'unk'} r${S.r}"><img src="${fishImg(id, 150, !a)}" alt=""><b>${esc(a ? fishName(id) : t('unknown'))}</b>${stars(S.r)}<small>${a ? esc(t('best', { w: fmtW(a.best) })) + '<br>' + esc(t('times', { n: a.n })) : esc(t('bestTime', { t: t('t_' + S.time) }))}</small><small class="bt">${esc(t('likes', { b: baits }))}</small></div>`;
        })
        .join('');
      m.innerHTML = `<button class="mx" aria-label="close">${IC.close}</button><div class="m-title">${esc(t('atlas'))}</div>
        <p class="sub">${esc(t('caught', { a: got, b: total }))} · ${esc(t('totalCatch', { w: fmtW(s.stats.grams / 1000) }))}</p>
        ${this.tabs(LOCATIONS.map((x, i) => [String(i), `${s.locs.includes(i) ? '' : IC.lock}<span>${esc(t('loc_' + x.id))}</span>`]), String(li))}
        <div class="grid">${cards}</div>`;
      m.querySelector('.mx').onclick = () => this.closeModal();
      m.querySelectorAll('.tab').forEach((b) => (b.onclick = () => ((li = +b.dataset.tab), audio.play('click'), render(m))));
    };
    this.openModal('', { cls: 'wide tall', onOpen: render });
  }

  // ---------- водоёмы ----------
  locThumb(i) {
    const k = i + this.env.part + this.env.weather;
    this._thumbs = this._thumbs || {};
    if (this._thumbs[k]) return this._thumbs[k];
    const c = document.createElement('canvas');
    const S = new Scene(c);
    S.resize(360, 200, 1);
    S.setEnv(i, this.env.part, this.env.weather, this.s.char || 'm');
    S.rodLvl = this.s.gear.rod;
    S.draw(0.016);
    return (this._thumbs[k] = c.toDataURL('image/jpeg', 0.82));
  }
  openMap() {
    const s = this.s;
    const render = (m) => {
      const rows = LOCATIONS.map((L, i) => {
        const open = s.locs.includes(i);
        const n = L.fish.filter((id) => s.atlas[id]).length;
        let btn;
        if (i === s.loc) btn = `<span class="okl">${IC.check}${esc(t('here'))}</span>`;
        else if (open) btn = `<button class="btn sm primary" data-go="${i}">${esc(t('fishHere'))}</button>`;
        else if (s.lvl < L.lvl) btn = `<span class="lockl">${IC.lock}${esc(t('fromLvl', { n: L.lvl }))}</span>`;
        else btn = `<button class="btn sm ${s.coins >= L.cost ? 'primary' : 'ghost'}" data-buy="${i}">${esc(t('openFor'))} ${coinsHTML(L.cost)}</button>`;
        return `<div class="loc ${open ? '' : 'locked'} ${i === s.loc ? 'cur' : ''}"><img src="${this.locThumb(i)}" alt=""><div class="lt"><b>${esc(t('loc_' + L.id))}</b><small>${esc(t('speciesOf', { a: n, b: L.fish.length }))}</small><small>${esc(t('fishDay'))}: ${esc(fishName(fishOfDay(i)))} ×2</small></div>${btn}</div>`;
      }).join('');
      m.innerHTML = `<button class="mx" aria-label="close">${IC.close}</button><div class="m-title">${esc(t('map'))}</div><div class="locs">${rows}</div>`;
      m.querySelector('.mx').onclick = () => this.closeModal();
      m.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => this.goLoc(+b.dataset.go)));
      m.querySelectorAll('[data-buy]').forEach(
        (b) =>
          (b.onclick = () => {
            const i = +b.dataset.buy;
            const L = LOCATIONS[i];
            if (s.coins < L.cost) return this.toast(t('notEnough'), 'warn'), audio.play('wrong');
            s.coins -= L.cost;
            s.locs.push(i);
            audio.play('level');
            this.toast(t('locOpened'), 'good');
            save.write();
            this.goLoc(i);
          }),
      );
    };
    this.openModal('', { cls: 'wide tall', onOpen: render });
  }
  goLoc(i) {
    this.s.loc = i;
    save.write();
    this.closeModal(true);
    this.reset();
    this.scene.bubbles = null;
    this.refreshEnv(true);
    this.interstitial();
  }

  // ---------- прогноз ----------
  openForecast() {
    const { part, weather } = this.env;
    const r = this.biteRating();
    this.openModal(
      `<div class="m-title">${esc(t('forecast'))}</div>
      <div class="fc"><div class="fcr">${partIc(part)}<div><b>${esc(t('p_' + part))}</b><small>${esc(t('pd_' + part))}</small></div></div>
      <div class="fcr">${weatherIc(weather, part)}<div><b>${esc(t('w_' + weather))}</b><small>${esc(t('wd_' + weather))}</small><small class="mut">${esc(t('weatherNext', { t: fmtTime(weatherNext() / 1000) }))}</small></div></div>
      <div class="fcr"><span class="dots big">${'●'.repeat(r)}<u>${'●'.repeat(5 - r)}</u></span><div><b>${esc(t('bite'))}</b></div></div>
      <div class="fcr"><img class="fi" src="${fishImg(this.env.fd, 96)}" alt=""><div><b>${esc(t('fishDay'))}: ${esc(fishName(this.env.fd))}</b><small>${esc(t('fishDayBadge'))}</small></div></div></div>
      <div class="m-btns"><button class="btn primary b-ok">${esc(t('ok'))}</button></div>`,
      { cls: 'small', onOpen: (m) => (m.querySelector('.b-ok').onclick = () => this.closeModal()) },
    );
  }

  // ---------- задания ----------
  qText(q) {
    switch (q.k) {
      case 'catch':
        return t('q_catch', { n: q.n });
      case 'species':
        return t('q_species', { s: fishName(q.s), l: t('loc_' + LOCATIONS[q.loc].id) });
      case 'weight':
        return t('q_weight', { w: fmtW(q.x) });
      case 'sell':
        return t('q_sell', { n: fmtNum(q.n) });
      case 'smoke':
        return t('q_smoke', { n: q.n });
      case 'bubbles':
        return t('q_bubbles', { n: q.n });
      case 'pred':
        return t('q_pred', { n: q.n });
      case 'cat':
        return t('q_cat');
    }
    return '';
  }
  openQuests() {
    const s = this.s;
    const render = (m) => {
      const D = s.daily;
      const all = D.quests.every((q) => q.claimed);
      const next = new Date();
      next.setHours(24, 0, 0, 0);
      const rows = D.quests
        .map(
          (q, i) => `<div class="row q ${q.claimed ? 'claimed' : ''}"><div class="bi">${q.k === 'species' ? `<img src="${fishImg(q.s, 80)}" alt="">` : q.k === 'cat' ? IC.paw : q.k === 'smoke' ? IC.smoke : q.k === 'sell' ? IC.coin : q.k === 'bubbles' ? IC.fish : IC.tasks}</div><div class="rt"><b>${esc(this.qText(q))}</b><i class="pb"><u style="width:${((100 * q.got) / q.n).toFixed(0)}%"></u></i><small>${q.k === 'sell' ? fmtNum(q.got) + ' / ' + fmtNum(q.n) : q.got + ' / ' + q.n}</small></div>${
            q.claimed ? `<span class="okl">${IC.check}</span>` : q.done ? `<button class="btn sm primary" data-claim="${i}">${coinsHTML(q.r)}</button>` : `<span class="rew">${coinsHTML(q.r)}</span>`
          }</div>`,
        )
        .join('');
      const chestRow = `<div class="row chest ${D.chest ? 'claimed' : ''}"><div class="bi">${IC.gift}</div><div class="rt"><b>${esc(t('chest'))}</b><small>${esc(t('chestDesc'))}</small><span class="rewi">${this.rewardHTML(CHEST)}</span></div>${D.chest ? `<span class="okl">${IC.check}</span>` : all ? `<button class="btn sm primary b-chest">${esc(t('claim'))}</button>` : `<span class="lockl">${IC.lock}</span>`}</div>`;
      m.innerHTML = `<button class="mx" aria-label="close">${IC.close}</button><div class="m-title">${esc(t('questsDay'))}</div><p class="sub">${esc(t('questsNew', { t: fmtTime((next - Date.now()) / 1000) }))}</p><div class="list">${rows}${chestRow}</div>`;
      m.querySelector('.mx').onclick = () => this.closeModal();
      m.querySelectorAll('[data-claim]').forEach(
        (b) =>
          (b.onclick = () => {
            const q = D.quests[+b.dataset.claim];
            q.claimed = true;
            this.addCoins(q.r);
            s.xp += Math.round(q.r / 4);
            audio.play('quest');
            save.write();
            render(m);
            this.checkLevel();
          }),
      );
      const bc = m.querySelector('.b-chest');
      if (bc)
        bc.onclick = () => {
          D.chest = true;
          this.grant(CHEST);
          audio.play('gift');
          this.confetti(m);
          save.write();
          render(m);
        };
    };
    this.openModal('', { cls: 'wide', onOpen: render });
  }
  rewardHTML(R) {
    return Object.entries(R)
      .map(([k, n]) => (k === 'coins' ? coinsHTML(n) : `<span class="cn">${baitIc(k)}<b>×${n}</b></span>`))
      .join(' ');
  }
  grant(R, mul = 1) {
    for (const [k, n] of Object.entries(R)) {
      if (k === 'coins') this.addCoins(Math.round(n * mul));
      else this.s.bait[k] = (this.s.bait[k] || 0) + n;
    }
    this.hud(true);
  }

  // ---------- подарок за вход ----------
  giftMul() {
    return 1 + 0.15 * (this.s.lvl - 1);
  }
  openGift(after) {
    const s = this.s;
    let G = giftState(s.login);
    const render = (m) => {
      const idx = G.idx;
      const cells = GIFTS.map((g, i) => {
        const R = g.coins ? { ...g, coins: Math.round(g.coins * this.giftMul()) } : g;
        const cls = i < idx ? 'past' : i === idx ? (G.can ? 'today' : 'past') : '';
        return `<div class="gday ${cls} ${i === 6 ? 'big' : ''}"><small>${esc(t('giftDay', { n: i + 1 }))}</small><div class="gr">${this.rewardHTML(R)}</div>${i < idx || (!G.can && i === idx) ? `<i class="gok">${IC.check}</i>` : ''}</div>`;
      }).join('');
      m.innerHTML = `<button class="mx" aria-label="close">${IC.close}</button><div class="m-title">${esc(t('giftTitle'))}</div>
        ${G.broken ? `<p class="sub warn">${esc(t('streakLost', { n: G.lost }))}</p>` : `<p class="sub">${esc(t('giftHint'))}</p>`}
        <div class="gcal">${cells}</div>
        <div class="m-btns">${G.can ? `<button class="btn primary b-take">${IC.gift}<span>${esc(t('giftTake'))}</span></button>` : `<p class="sub">${esc(t('giftTomorrow'))}</p>`}${G.can && G.broken ? `<button class="btn ad b-save">${IC.video}<span>${esc(t('streakSave'))}</span></button>` : ''}</div>`;
      m.querySelector('.mx').onclick = () => this.closeModal();
      const bt = m.querySelector('.b-take');
      if (bt)
        bt.onclick = () => {
          const g = GIFTS[G.idx];
          this.grant(g, this.giftMul());
          s.login = { last: dayNum(), streak: G.idx + 1 };
          audio.play('gift');
          this.confetti(m);
          save.write();
          G = giftState(s.login);
          render(m);
        };
      const bs = m.querySelector('.b-save');
      if (bs)
        bs.onclick = () =>
          this.rewarded(() => {
            // серия продолжается с того дня, на котором прервалась
            G = { can: true, idx: G.lost % 7, broken: false };
            if (this.modal) render(m);
          });
    };
    this.openModal('', { cls: 'wide', onOpen: render, onClose: after });
  }

  // ---------- кот ----------
  openCat() {
    const s = this.s;
    const S = this.scene;
    audio.play('meow');
    const fish = s.keep.length ? s.keep.reduce((a, f) => (f.w < a.w ? f : a), s.keep[0]) : null;
    this.openModal(
      `<div class="m-title">${esc(t('catTitle'))}</div>
      <p class="wish">${esc(fish ? t('catText', { f: fishName(fish.id) + ' ' + fmtW(fish.w) }) : t('catTextNo'))}</p>
      <div class="m-btns">${fish ? `<button class="btn primary b-feed">${IC.fish}<span>${esc(t('catFeed'))}</span></button>` : ''}<button class="btn ghost b-pet">${IC.paw}<span>${esc(t('catPet'))}</span></button></div>`,
      {
        cls: 'small',
        onOpen: (m) => {
          const pet = () => {
            S.cat.pet = 1.5;
            const cb = S.catBox;
            if (cb) S.hearts(cb.x + cb.w / 2, cb.y + 10);
            audio.play('purr');
          };
          m.querySelector('.b-pet').onclick = () => {
            this.closeModal();
            pet();
          };
          const bf = m.querySelector('.b-feed');
          if (bf)
            bf.onclick = () => {
              s.keep.splice(s.keep.indexOf(fish), 1);
              s.luck += 10;
              const fin = questEvent(s.daily.quests, { t: 'cat' });
              if (fin.length) (this.toast(t('questDone'), 'good'), audio.play('quest'));
              save.write();
              this.closeModal();
              pet();
              this.toast(t('catLuck', { n: s.luck }), 'good');
              setTimeout(() => (S.cat.on = false), 4000);
            };
        },
      },
    );
  }

  // ---------- настройки и меню ----------
  openSettings() {
    const s = this.s;
    const render = (m) => {
      m.innerHTML = `<button class="mx" aria-label="close">${IC.close}</button><div class="m-title">${esc(t('settings'))}</div>
        ${slidersHTML(s.settings, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}
        <div class="setc"><b>${esc(t('character'))}</b><div class="chars">${this.charBtns()}</div></div>
        <div class="m-btns"><button class="btn ghost b-menu">${esc(t('toMenu'))}</button><button class="btn primary b-ok">${esc(t('ok'))}</button></div>`;
      m.querySelector('.mx').onclick = () => this.closeModal();
      bindSliders(m, s.settings, () => save.write());
      m.querySelector('.b-ok').onclick = () => this.closeModal();
      m.querySelector('.b-menu').onclick = () => {
        this.closeModal(true);
        this.toMenu();
      };
      this.bindChars(m, () => render(m));
    };
    this.openModal('', { cls: 'small', onOpen: render });
  }
  charImg(c) {
    const k = 'char' + c;
    this._thumbs = this._thumbs || {};
    if (this._thumbs[k]) return this._thumbs[k];
    const cv = document.createElement('canvas');
    const S = new Scene(cv);
    S.resize(220, 220, 2);
    S.setEnv(0, 'day', 'sun', c);
    S.L.fx = 70;
    S.L.deckY = 200;
    S.L.S = 1.15;
    S.L.pierEnd = 180;
    S.cat.on = false;
    S.draw(0.016);
    return (this._thumbs[k] = cv.toDataURL('image/jpeg', 0.85));
  }
  charBtns() {
    return ['m', 'f'].map((c) => `<button class="charb ${this.s.char === c ? 'on' : ''}" data-char="${c}"><img src="${this.charImg(c)}" alt=""><b>${esc(t(c === 'm' ? 'charM' : 'charF'))}</b></button>`).join('');
  }
  bindChars(m, after) {
    m.querySelectorAll('[data-char]').forEach(
      (b) =>
        (b.onclick = () => {
          this.s.char = b.dataset.char;
          this.scene.char = this.s.char;
          audio.play('click');
          save.write();
          after && after();
        }),
    );
  }

  _buildMenu() {
    this.menuEl.innerHTML = `<div class="mn">
      <h1><span>${esc(t('title1'))}</span><span>${esc(t('title2'))}</span></h1>
      <p>${esc(t('subtitle'))}</p>
      <button class="btn primary big m-play">${IC.play}<span>${esc(t('play'))}</span></button>
      <div class="mrow"><button class="btn ghost m-lb">${IC.trophy}<span>${esc(t('records'))}</span></button><button class="btn ghost m-set">${IC.gear}<span>${esc(t('settings'))}</span></button></div>
    </div>`;
    this.menuEl.querySelector('.m-play').onclick = () => {
      audio.play('click');
      this.startPlay();
    };
    this.menuEl.querySelector('.m-lb').onclick = () => {
      audio.play('click');
      this.openLb();
    };
    this.menuEl.querySelector('.m-set').onclick = () => {
      audio.play('click');
      this.openSettings();
    };
  }
  toMenu() {
    this.reset();
    this.phase = 'menu';
    this.menuEl.classList.remove('hidden');
    audio.setMood('menu');
    this.hud(true);
    this.setGameplay();
  }
  startPlay() {
    const go = () => {
      this.menuEl.classList.add('hidden');
      this.phase = 'idle';
      this.refreshEnv(true);
      audio.setMood(this.env.part === 'night' ? 'night' : 'day');
      this.hud(true);
      this.checkSmoke();
      // подарок за вход — сразу при первом входе за день
      if (giftState(this.s.login).can) this.openGift(() => this._tut());
      else this._tut();
      this.setGameplay();
    };
    if (!this.s.char) return this.chooseChar(go);
    if (this.played) this.interstitial(go);
    else go();
    this.played = true;
  }
  _tut() {
    if (this.s.tutDone || this._tutShown) return;
    this._tutShown = true;
    this.openModal(
      `<div class="m-title">${esc(t('tutTitle'))}</div>
      <div class="tut"><div>${IC.hand}<p>${esc(t('tut1'))}</p></div><div><span class="tb">!</span><p>${esc(t('tut2'))}</p></div><div>${IC.reel}<p>${esc(t('tut3'))}</p></div></div>
      <div class="m-btns"><button class="btn primary tut-ok">${esc(t('tutGo'))}</button></div>`,
      { cls: 'small', onOpen: (m) => (m.querySelector('.tut-ok').onclick = () => this.closeModal()) },
    );
  }
  chooseChar(after) {
    this.openModal(`<div class="m-title">${esc(t('whoTitle'))}</div><div class="chars big">${this.charBtns()}</div><p class="sub">${esc(t('charHint'))}</p>`, {
      cls: 'small',
      onOpen: (m) =>
        this.bindChars(m, () => {
          this.closeModal(true);
          after();
        }),
    });
  }

  async openLb() {
    const m = this.openModal(`<div class="m-title">${esc(t('lbTitle'))}</div><div class="lb"><p class="sub">…</p></div>`, { cls: 'small' });
    const res = await sdk.getLeaderboard();
    const box = m.querySelector('.lb');
    if (!box) return;
    if (!res.available) {
      box.innerHTML = `<p class="sub">${esc(t('lbEmpty'))}</p><p class="sub">${esc(t('totalCatch', { w: fmtW(this.s.stats.grams / 1000) }))}</p>`;
      return;
    }
    box.innerHTML =
      res.entries.map((e) => `<div class="lbr ${e.me ? 'me' : ''}"><b>${e.rank}</b><span>${esc(e.name || (e.me ? t('you') : '—'))}</span><em>${esc(fmtW(e.score / 1000))}</em></div>`).join('') +
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
    st.textContent = volumeCss({ accent: '#f08a2a', muted: '#6a7f8c', track: '#e3dccb', thumb: '#fff' });
    document.head.appendChild(st);
  }
}
