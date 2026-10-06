// Игра: тапы по киту, здания на спине, улучшения, рост кита, острова с карточками, чайки,
// мега-фонтан, попутный ветер, миграция с жемчугом, цели, офлайн-доход, подарки, реклама и покупки
import { sdk } from './sdk.js';
import { save } from './save.js';
import { audio } from './audio.js';
import { iap, priceHTML } from './iap.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import { t, fmt, fmtTime, LANG } from './i18n.js';
import { IC } from './icons.js';
import { Scene } from './scene.js';
import { drawBuilding } from './buildings.js';
import {
  BUILDINGS, B, STAGES, UPGRADES, UP_ORDER, BIOMES, GOALS, GIFTS,
  bCost, bulkCost, maxAfford, bIncome, baseIncome, globalMul, tapValue, upCost, speed, islandDist, gullGap, offlineCap, fountDur,
  migrateIsland, pearlsGain, freshRun, goalDone, milestonesOf, nextMilestone, rollCards, giftState, giftShells, dayNum,
} from './data.js';

const AD_GAP = 180000;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shellsHTML = (n) => `<span class="cn">${IC.shell}<b>${fmt(n)}</b></span>`;

// покупки: сундуки ракушек считаются от текущего дохода
const chest = (h, min) => () => {
  const s = save.data;
  const n = Math.max(baseIncome(s) * 3600 * h, min);
  s.shells += n;
  if (game) game.toast('+' + fmt(n), 'good');
};
export const IAP_DEFS = {
  shells_2h: { grant: chest(2, 5000) },
  shells_8h: { grant: chest(8, 30000) },
  shells_24h: { grant: chest(24, 150000) },
  disable_ads: {
    permanent: true,
    grant: () => {
      save.data.noAds = true;
      sdk.noAds = true;
    },
  },
};
let game = null;

export class Game {
  constructor() {
    game = this;
    window.__game = this;
    this.s = save.data;
    this.cv = document.getElementById('cv');
    this.scene = new Scene(this.cv);
    this.ui = document.getElementById('ui');
    this.menuEl = document.getElementById('menu');
    this.modalEl = document.getElementById('modal');
    this.toastEl = document.getElementById('toasts');
    this.menu = true;
    this.modal = null;
    this.queue = [];
    this.lastAd = Date.now();
    this.fount = 0;
    this.mega = 0;
    this.windEnd = 0;
    this.gullT = 20;
    this.goalT = 0;
    this.saveT = 0;
    this.lbT = 0;
    this.tab = 'town';
    this._icons = {};
    this._injectCss();
    this.scene.stage = this.s.stage;
    this.applyScene();
    this.resize();
    addEventListener('resize', () => this.resize());
    this._buildHud();
    this._buildMenu();
    this._input();
    iap.onChange(() => this.hud(true));
    this.offlineGain();
    this.last = performance.now();
    requestAnimationFrame((tt) => this.loop(tt));
  }

  biome() {
    return BIOMES[(this.s.migr || 0) % BIOMES.length];
  }
  applyScene() {
    const S = this.scene;
    S.setState({ stage: this.s.stage, biome: this.biome(), counts: this.s.b });
    (S.slots || []).forEach((q) => (q.avail = B[q.id].stage <= this.s.stage));
    audio.setMood(this.menu ? 'menu' : this.biome() === 'night' ? 'night' : 'day');
  }

  resize() {
    const W = innerWidth,
      H = innerHeight;
    const port = W / H < 0.9;
    document.body.classList.toggle('port', port);
    let R;
    if (this.menu) R = { x: 0, y: 0, w: W, h: H };
    else if (port) {
      // сцена под шкалами, над панелью
      const top = Math.min(132, H * 0.17);
      R = { x: 0, y: top, w: W, h: H * 0.56 - top };
    }
    else {
      const pw = clamp(W * 0.34, 330, 460);
      R = { x: 0, y: 0, w: W - pw, h: H };
    }
    const rs = document.documentElement.style;
    rs.setProperty('--pw', this.menu || port ? '0px' : W - R.w + 'px');
    rs.setProperty('--ph', this.menu || !port ? '0px' : H - R.h - R.y + 'px');
    rs.setProperty('--rw', R.w + 'px');
    this.scene.resize(W, H, Math.min(devicePixelRatio || 1, 2), R);
    this.applyScene();
  }

  // ---------- экономика ----------
  boost() {
    return (Date.now() < this.windEnd ? 2 : 1) * (this.mega > 0 ? 2 : 1);
  }
  inc() {
    return baseIncome(this.s) * this.boost();
  }
  earn(n) {
    const s = this.s;
    s.shells += n;
    s.run += n;
    s.all += n;
  }

  // ---------- цикл ----------
  loop(tt) {
    const dt = Math.min(0.1, Math.max(0, (tt - this.last) / 1000));
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
    const s = this.s;
    const S = this.scene;
    // доход идёт всегда, даже в меню и при открытых окнах
    this.earn(this.inc() * dt);
    if (!this.menu) {
      // путь к острову (пока открыто окно острова — кит ждёт)
      if (!(this.modal && this.modal.o.island)) {
        s.miles += speed(s) * dt * (Date.now() < this.windEnd ? 1.5 : 1);
        const d = islandDist(s.island + 1);
        S.islandK = clamp(s.miles / d, 0, 1);
        if (s.miles >= d) this.arrive();
      }
      // мега-фонтан
      if (this.mega > 0) {
        this.mega -= dt;
        S.mega = this.mega;
        if (this.mega <= 0) {
          this.fount = 0;
          S.mega = 0;
        }
      } else this.fount = Math.max(0, this.fount - dt * 0.09);
      // чайки
      if (!S.gull && !this.modal) {
        this.gullT -= dt;
        if (this.gullT <= 0) {
          S.gull = { p: 0, dur: 11 };
          this.gullT = gullGap(s) * (0.8 + Math.random() * 0.4);
          audio.play('gull');
        }
      }
    }
    S.speedK = this.menu ? 0.6 : (Date.now() < this.windEnd ? 1.8 : 1) * (0.8 + 0.1 * s.stage);
    this.goalT -= dt;
    if (this.goalT <= 0) {
      this.goalT = 1;
      this.checkGoals();
    }
    this.saveT -= dt;
    if (this.saveT <= 0) {
      this.saveT = 15;
      save.write();
    }
    this.hudT = (this.hudT || 0) - dt;
    if (this.hudT <= 0) {
      this.hudT = 0.2;
      this.hud();
    }
  }

  // ---------- тап ----------
  tap(px, py) {
    const s = this.s;
    const S = this.scene;
    if (S.hitGull(px, py)) return this.catchGull();
    const mega = this.mega > 0;
    const v = tapValue(s, this.inc()) * (mega ? 5 : 1);
    this.earn(v);
    s.taps++;
    S.tap(px, py, '+' + fmt(v), mega);
    audio.play('tap', Math.random());
    if (!mega) {
      this.fount = Math.min(1, this.fount + 0.045);
      if (this.fount >= 1) this.startMega();
    }
    if (s.tut === 0 && s.shells >= 15) {
      s.tut = 1;
      this.hud(true);
    }
  }
  startMega() {
    this.mega = fountDur(this.s);
    this.fount = 1;
    this.scene.mega = this.mega;
    audio.play('mega');
    this.toast(t('megaOn'), 'mega');
  }
  catchGull() {
    const s = this.s;
    const S = this.scene;
    const G = S.gull;
    S.gull = null;
    s.gulls++;
    S.burst(G.x, G.y, 26);
    audio.play('gift');
    if (this.mega <= 0 && Math.random() < 0.3) {
      this.startMega();
      return;
    }
    const v = Math.max(this.inc() * 45 * (1 + 0.25 * (s.up.gull || 0)), tapValue(s, this.inc()) * 25, 20);
    this.earn(v);
    S.float(G.x, G.y + 30, '+' + fmt(v), '#ffe27a');
    this.toast(t('gullGift') + ' +' + fmt(v), 'good');
  }

  // ---------- покупки в игре ----------
  buyCount(id) {
    const m = this.s.buy;
    if (m === 'max') return Math.max(1, maxAfford(this.s, id));
    return m;
  }
  buyB(id) {
    const s = this.s;
    if (B[id].stage > s.stage) return;
    const k = this.buyCount(id);
    const c = bulkCost(s, id, k);
    if (s.shells < c) {
      audio.play('wrong');
      return;
    }
    const before = milestonesOf(s.b[id] || 0);
    s.shells -= c;
    s.b[id] = (s.b[id] || 0) + k;
    const first = before === 0 && (s.b[id] || 0) === k;
    this.scene.counts = s.b;
    this.scene.buildFx(id);
    if (milestonesOf(s.b[id]) > before) {
      audio.play('milestone');
      this.toast(`${t('b_' + id)} ×2!`, 'good');
    } else audio.play('buy');
    if (s.tut === 1 && id === 'lemon') {
      s.tut = 2;
      setTimeout(() => {
        if (this.s.tut === 2) {
          this.s.tut = 3;
          this.hud(true);
        }
      }, 7000);
    }
    if (first) save.write();
    this.renderPanel(true);
  }
  buyUp(id) {
    const s = this.s;
    const l = s.up[id] || 0;
    if (l >= UPGRADES[id].max) return;
    const c = upCost(id, l);
    if (s.shells < c) return audio.play('wrong');
    s.shells -= c;
    s.up[id] = l + 1;
    audio.play('milestone');
    save.write();
    this.renderPanel(true);
  }
  grow() {
    const s = this.s;
    if (s.stage >= 6) return;
    const c = STAGES[s.stage].cost;
    if (s.shells < c) return audio.play('wrong');
    s.shells -= c;
    s.stage++;
    this.applyScene();
    this.scene.burst(this.scene.cx, this.scene.cy - this.scene.Hb, 40);
    audio.play('stage');
    this.toast(t('stageUp', { s: t('stage' + s.stage) }), 'mega');
    this.toast(t('newSlots'), 'tip');
    save.write();
    this.renderPanel(true);
  }

  // ---------- острова ----------
  arrive() {
    const s = this.s;
    s.miles = 0;
    s.island++;
    s.islandsAll++;
    this.scene.islandK = 0;
    audio.play('island');
    this.submit();
    save.write();
    this.openIsland(rollCards(s));
  }
  cardText(c) {
    const p = Math.round(c.v * 100);
    const b = c.id ? t('b_' + c.id) : '';
    return { name: t('c_' + c.k, { b }), desc: t('cd_' + c.k, { p, b, m: c.v }) };
  }
  openIsland(cards) {
    const s = this.s;
    const html = `<div class="m-title">${IC.island}<span>${esc(t('islandTitle', { n: s.island }))}</span></div><p class="sub">${esc(t('islandSub'))}</p>
      <div class="cards">${cards
        .map((c, i) => {
          const T = this.cardText(c);
          return `<button class="card k-${c.k}" data-card="${i}"><div class="ci">${IC['c_' + c.k]}</div><b>${esc(T.name)}</b><small>${esc(T.desc)}</small></button>`;
        })
        .join('')}</div>
      <div class="m-btns"><button class="btn ad b-reroll">${IC.video}<span>${esc(t('reroll'))}</span></button></div>`;
    this.openModal(html, {
      island: true,
      noClose: true,
      onOpen: (m) => {
        m.querySelectorAll('[data-card]').forEach(
          (b) =>
            (b.onclick = () => {
              const c = cards[+b.dataset.card];
              if (c.k === 'chest') {
                const v = Math.max(baseIncome(s) * 60 * c.v, 100);
                this.earn(v);
                this.toast('+' + fmt(v), 'good');
              } else s.cards.push(c);
              audio.play('card');
              save.write();
              this.closeModal();
              this.renderPanel(true);
              if (s.islandsAll >= 2) this.interstitial();
            }),
        );
        m.querySelector('.b-reroll').onclick = () => this.rewarded(() => this.openIsland(rollCards(s)));
      },
    });
  }

  // ---------- миграция ----------
  canMigrate() {
    return this.s.island >= migrateIsland(this.s) && pearlsGain(this.s) >= 1;
  }
  openMigrate() {
    const s = this.s;
    const g = pearlsGain(s);
    const next = BIOMES[(s.migr + 1) % BIOMES.length];
    this.openModal(
      `<div class="m-title">${IC.pearl}<span>${esc(t('migrate'))}</span></div>
      <div class="ocean o-${next}"></div>
      <p class="wish">${esc(t('migrateDesc', { o: t('o_' + next), n: g, p: g * 10 }))}</p>
      <div class="m-btns"><button class="btn ghost b-no">${esc(t('close'))}</button><button class="btn primary b-go">${IC.whale}<span>${esc(t('migrateGo'))}</span></button></div>`,
      {
        onOpen: (m) => {
          m.querySelector('.b-no').onclick = () => this.closeModal();
          m.querySelector('.b-go').onclick = () => this.migrate();
        },
      },
    );
  }
  migrate() {
    const s = this.s;
    const g = pearlsGain(s);
    if (g < 1) return;
    s.pearls += g;
    s.pearlsEver += g;
    s.migr++;
    freshRun(s);
    this.scene.stage = 0;
    this.applyScene();
    this.mega = 0;
    this.fount = 0;
    this.closeModal(true);
    audio.play('migrate');
    this.scene.burst(this.scene.cx, this.scene.cy - this.scene.Hb, 60);
    this.toast(t('migrateDone'), 'mega');
    this.toast(t('ocean', { o: t('o_' + this.biome()) }), 'tip');
    save.write();
    this.submit();
    this.renderPanel(true);
    this.interstitial();
  }

  // ---------- цели ----------
  checkGoals() {
    const s = this.s;
    let n = 0;
    for (const g of GOALS) {
      if (s.goals[g.id]) continue;
      if (goalDone(s, g)) {
        s.goals[g.id] = 1;
        n++;
      }
    }
    if (n) {
      audio.play('goal');
      this.toast(t('goalDone') + (n > 1 ? ` ×${n}` : ''), 'good');
      save.write();
    }
  }
  goalText(g) {
    switch (g.k) {
      case 'b':
        return t('g_b', { b: t('b_' + g.b), n: g.n });
      case 'taps':
        return t('g_taps', { n: fmt(g.n) });
      case 'isl':
        return t('g_isl', { n: g.n });
      case 'stage':
        return t('g_stage', { s: t('stage' + g.n) });
      case 'migr':
        return t('g_migr', { n: g.n });
      case 'gulls':
        return t('g_gulls', { n: g.n });
      case 'all':
        return t('g_all', { n: fmt(g.n) });
    }
    return '';
  }
  openGoals() {
    const s = this.s;
    const done = GOALS.filter((g) => s.goals[g.id]).length;
    const list = GOALS.slice().sort((a, b) => (s.goals[a.id] ? 1 : 0) - (s.goals[b.id] ? 1 : 0));
    this.openModal(
      `<div class="m-title">${IC.goals}<span>${esc(t('goals'))}</span></div><p class="sub">${esc(t('goalsSub', { a: done, b: GOALS.length }))}</p>
      <div class="list goals">${list.map((g) => `<div class="row ${s.goals[g.id] ? 'done' : ''}"><div class="gi">${s.goals[g.id] ? IC.check : g.k === 'b' ? `<img src="${this.bIcon(g.b, 0)}" alt="">` : IC.goals}</div><div class="rt"><b>${esc(this.goalText(g))}</b></div><span class="gp">+2%</span></div>`).join('')}</div>`,
      { cls: 'tall' },
    );
  }

  // ---------- офлайн и подарок ----------
  offlineGain() {
    const s = this.s;
    const ts = save.loadedTs;
    if (!ts) return;
    const cap = offlineCap(s);
    const sec = Math.min((Date.now() - ts) / 1000, cap.hours * 3600);
    if (sec < 60) return;
    const v = baseIncome(s) * sec * cap.rate;
    if (v < 1) return;
    this.offline = { v, sec };
  }
  showOffline(after) {
    const O = this.offline;
    this.offline = null;
    if (!O) return after && after();
    this.openModal(
      `<div class="m-title">${esc(t('offTitle'))}</div>
      <p class="sub">${esc(t('offText'))} · ${fmtTime(O.sec)}</p>
      <div class="big-n">${shellsHTML(O.v)}</div>
      <div class="m-btns"><button class="btn ghost b-take">${esc(t('offTake'))}</button><button class="btn ad b-x2">${IC.video}<span>${esc(t('offX2'))}</span></button></div>`,
      {
        noClose: true,
        onOpen: (m) => {
          const take = (k) => {
            this.earn(O.v * k);
            this.scene.float(this.scene.cx, this.scene.cy - this.scene.Hb * 1.4, '+' + fmt(O.v * k), '#ffe27a');
            audio.play('gift');
            this.closeModal(true);
            after && after();
          };
          m.querySelector('.b-take').onclick = () => take(1);
          m.querySelector('.b-x2').onclick = () => this.rewarded(() => take(2));
        },
      },
    );
  }
  openGift(after) {
    const s = this.s;
    const G = giftState(s.login);
    const cells = GIFTS.map((g, i) => {
      const cls = i < G.idx ? 'past' : i === G.idx ? (G.can ? 'today' : 'past') : '';
      return `<div class="gday ${cls} ${i === 6 ? 'big' : ''}"><small>${esc(t('giftDay', { n: i + 1 }))}</small>${IC.shell}<b>${esc(t('minIncome', { m: g.m }))}</b>${g.pearl ? `<b class="pp">${IC.pearl}${esc(t('pearl1'))}</b>` : ''}${i < G.idx || (!G.can && i === G.idx) ? `<i class="gok">${IC.check}</i>` : ''}</div>`;
    }).join('');
    this.openModal(
      `<div class="m-title">${IC.gift}<span>${esc(t('giftTitle'))}</span></div><p class="sub">${esc(t('giftHint'))}</p><div class="gcal">${cells}</div>
      <div class="m-btns">${G.can ? `<button class="btn primary b-take">${IC.gift}<span>${esc(t('giftTake'))} · ${fmt(giftShells(s, GIFTS[G.idx].m))}</span></button>` : `<p class="sub">${esc(t('giftTomorrow'))}</p>`}</div>`,
      {
        onClose: after,
        onOpen: (m) => {
          const b = m.querySelector('.b-take');
          if (b)
            b.onclick = () => {
              const g = GIFTS[G.idx];
              const v = giftShells(s, g.m);
              this.earn(v);
              if (g.pearl) (s.pearls++, s.pearlsEver++);
              s.login = { last: dayNum(), streak: G.idx + 1 };
              audio.play('gift');
              this.scene.float(this.scene.cx, this.scene.cy - this.scene.Hb * 1.4, '+' + fmt(v), '#ffe27a');
              save.write();
              this.closeModal();
            };
        },
      },
    );
  }

  // ---------- реклама ----------
  setGameplay() {
    sdk.gameplay(!this.menu && !this.modal && !document.hidden && !sdk.adActive);
  }
  rewarded(onReward) {
    audio.suspend('ad');
    sdk.showRewarded(onReward, () => {
      audio.resume('ad');
      this.setGameplay();
    });
  }
  interstitial(after) {
    if (this.s.noAds || Date.now() - this.lastAd < AD_GAP) return after && after();
    this.lastAd = Date.now();
    audio.suspend('ad');
    sdk.showInterstitial(() => {
      audio.resume('ad');
      this.setGameplay();
      after && after();
    });
  }
  wind() {
    if (Date.now() < this.windEnd) return;
    this.rewarded(() => {
      this.windEnd = Date.now() + 300000;
      audio.play('mega');
      this.toast(t('windDesc'), 'mega');
    });
  }
  submit() {
    if (Date.now() - this.lbT < 3000) return;
    this.lbT = Date.now();
    sdk.submitScore(this.s.islandsAll);
  }

  // ---------- ввод ----------
  _input() {
    this.cv.addEventListener('pointerdown', (e) => {
      if (this.menu || this.modal) return;
      this.tap(e.clientX, e.clientY);
    });
    addEventListener('keydown', (e) => {
      if (this.menu || this.modal || e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        const S = this.scene;
        this.tap(S.cx, S.cy - S.Hb * 0.3);
      }
    });
  }

  // ---------- интерфейс ----------
  bIcon(id, tier) {
    const k = id + tier;
    if (this._icons[k]) return this._icons[k];
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#7ad06a';
    x.beginPath();
    x.ellipse(64, 112, 52, 12, 0, 0, Math.PI * 2);
    x.fill();
    const tall = { light: 0.55, mill: 0.62, airship: 0.75, castle: 0.78, fish: 0.86, bakery: 0.82 }[id] || 1;
    drawBuilding(x, id, 64, 112, 84 * tall, tier, 1, false);
    return (this._icons[k] = c.toDataURL());
  }

  _buildHud() {
    this.ui.innerHTML = `
      <div class="money"><div class="m1">${IC.shell}<b class="h-shells">0</b></div><div class="m2 h-ps"></div></div>
      <div class="meters">
        <div class="meter fnt"><span>${IC.drop}</span><i><u class="h-fount"></u></i><em class="h-fl">${esc(t('fountain'))}</em></div>
        <div class="meter isl"><span>${IC.island}</span><i><u class="h-isl"></u></i><em class="h-il"></em></div>
      </div>
      <button class="windb h-wind">${IC.wind}<span class="h-wl">${esc(t('wind'))}</span><i>${IC.video}</i></button>
      <div class="tbtns">
        <button class="tb h-gift hidden">${IC.gift}</button>
        <button class="tb h-goals">${IC.goals}<i class="dot hidden"></i></button>
        <button class="tb h-shop">${IC.bag}</button>
        <button class="tb h-set">${IC.gear}</button>
      </div>
      <div class="tutb hidden"></div>
      <div id="panel">
        <div class="ptabs">
          <button class="ptab" data-tab="town">${IC.c_bld}<span>${esc(t('tab_town'))}</span></button>
          <button class="ptab" data-tab="up">${IC.up}<span>${esc(t('tab_up'))}</span></button>
          <button class="ptab" data-tab="whale">${IC.whale}<span>${esc(t('tab_whale'))}</span><i class="dot hidden"></i></button>
        </div>
        <div class="bmode"></div>
        <div class="plist"></div>
      </div>`;
    const q = (s) => this.ui.querySelector(s);
    this.el = { shells: q('.h-shells'), ps: q('.h-ps'), fount: q('.h-fount'), fl: q('.h-fl'), isl: q('.h-isl'), il: q('.h-il'), wind: q('.h-wind'), wl: q('.h-wl'), gift: q('.h-gift'), goalsDot: q('.h-goals .dot'), whaleDot: q('[data-tab="whale"] .dot'), tut: q('.tutb'), list: q('.plist'), bmode: q('.bmode') };
    const on = (s, fn) =>
      (q(s).onclick = (e) => {
        e.stopPropagation();
        audio.play('click');
        fn();
      });
    on('.h-gift', () => this.openGift());
    on('.h-goals', () => this.openGoals());
    on('.h-shop', () => this.openShop());
    on('.h-set', () => this.openSettings());
    on('.h-wind', () => this.wind());
    this.ui.querySelectorAll('.ptab').forEach(
      (b) =>
        (b.onclick = () => {
          audio.play('click');
          this.tab = b.dataset.tab;
          this.renderPanel(true);
        }),
    );
    this.renderPanel(true);
    this.hud(true);
  }

  // список вкладки; dyn — только обновить цифры и доступность
  renderPanel(full) {
    const s = this.s;
    const L = this.el.list;
    this.ui.querySelectorAll('.ptab').forEach((b) => b.classList.toggle('on', b.dataset.tab === this.tab));
    this.el.bmode.classList.toggle('hidden', this.tab !== 'town');
    if (full) {
      this.el.bmode.innerHTML = [1, 10, 100, 'max'].map((m) => `<button class="bm ${s.buy === m ? 'on' : ''}" data-m="${m}">${m === 'max' ? esc(t('buyMax')) : '×' + m}</button>`).join('');
      this.el.bmode.querySelectorAll('.bm').forEach(
        (b) =>
          (b.onclick = () => {
            s.buy = b.dataset.m === 'max' ? 'max' : +b.dataset.m;
            audio.play('click');
            this.renderPanel(true);
          }),
      );
    }
    if (this.tab === 'town') {
      if (full) {
        const open = BUILDINGS.filter((b) => b.stage <= s.stage);
        const next = BUILDINGS.find((b) => b.stage > s.stage);
        L.innerHTML =
          open.map((b) => `<button class="row bld" data-b="${b.id}"><img class="bi" alt=""><div class="rt"><b>${esc(t('b_' + b.id))} <em class="cnt"></em></b><small class="inc"></small><i class="ms"><u></u></i><small class="msn"></small></div><span class="cost"><small class="k"></small><span class="c"></span></span></button>`).join('') +
          (next ? `<div class="row locked"><img class="bi" src="${this.bIcon(next.id, 0)}" alt=""><div class="rt"><b>???</b><small>${esc(t('lockedStage'))}</small></div>${IC.lock}</div>` : '');
        L.querySelectorAll('[data-b]').forEach((b) => (b.onclick = () => this.buyB(b.dataset.b)));
      }
      L.querySelectorAll('[data-b]').forEach((row) => {
        const id = row.dataset.b;
        const n = s.b[id] || 0;
        const tier = milestonesOf(n);
        const img = row.querySelector('.bi');
        if (img.dataset.t !== String(tier)) {
          img.src = this.bIcon(id, tier);
          img.dataset.t = tier;
        }
        const k = this.buyCount(id);
        const c = bulkCost(s, id, k);
        row.querySelector('.cnt').textContent = n ? '· ' + n : '';
        const one = B[id].inc * Math.pow(2, tier) * globalMul(s) * (1 + s.cards.filter((q) => q.k === 'bld' && q.id === id).reduce((a, q) => a + q.v, 0));
        row.querySelector('.inc').textContent = t('each', { n: fmt(one) });
        const nm = nextMilestone(n);
        const prev = [0, 10, 25, 50, 100, 150, 200, 250, 300, 400, 500].filter((x) => x <= n).pop() || 0;
        row.querySelector('.ms u').style.width = nm ? (((n - prev) / (nm - prev)) * 100).toFixed(0) + '%' : '100%';
        row.querySelector('.msn').textContent = nm ? t('toX2', { n: nm - n }) : '';
        row.querySelector('.k').textContent = '×' + k;
        row.querySelector('.c').innerHTML = shellsHTML(c);
        row.classList.toggle('can', s.shells >= c);
      });
    } else if (this.tab === 'up') {
      if (full) {
        L.innerHTML = UP_ORDER.map((id) => `<button class="row up" data-u="${id}"><div class="ui">${{ tap: IC.c_tap, fount: IC.drop, wind: IC.c_speed, gull: IC.c_gull, night: IC.c_night }[id]}</div><div class="rt"><b>${esc(t('u_' + id))} <em class="lv"></em></b><small class="d"></small></div><span class="cost"><span class="c"></span></span></button>`).join('');
        L.querySelectorAll('[data-u]').forEach((b) => (b.onclick = () => this.buyUp(b.dataset.u)));
      }
      L.querySelectorAll('[data-u]').forEach((row) => {
        const id = row.dataset.u;
        const l = s.up[id] || 0;
        const max = l >= UPGRADES[id].max;
        const c = upCost(id, l);
        row.querySelector('.lv').textContent = '· ' + t('lvlN', { n: l });
        const off = offlineCap({ ...s, up: { ...s.up, night: l + (max ? 0 : 1) } });
        row.querySelector('.d').textContent = t('ud_' + id, { n: id === 'fount' ? fountDur({ up: { fount: l + (max ? 0 : 1) } }) : (l + (max ? 0 : 1)) * 15, h: off.hours, p: Math.round(off.rate * 100) });
        row.querySelector('.c').innerHTML = max ? esc(t('max')) : shellsHTML(c);
        row.classList.toggle('can', !max && s.shells >= c);
        row.classList.toggle('maxed', max);
      });
    } else {
      // кит: рост, миграция, бонусы островов
      const need = migrateIsland(s);
      const g = pearlsGain(s);
      const key = [s.stage, s.island, g, s.cards.length, s.pearls, Math.floor(s.shells >= (STAGES[s.stage] || {}).cost)].join();
      if (full || key !== this._whaleKey) {
        this._whaleKey = key;
        const nextSt = STAGES[s.stage];
        const cardsHTML = s.cards.length
          ? `<div class="cardsmall">${s.cards.map((c) => `<span title="${esc(this.cardText(c).desc)}">${IC['c_' + c.k]}<small>${esc(this.cardText(c).desc)}</small></span>`).join('')}</div>`
          : '';
        L.innerHTML = `
          <div class="wbox"><div class="wi">${IC.whale}</div><div class="rt"><b>${esc(t('stage' + s.stage))}</b><small>${esc(t('whaleMul', { n: STAGES[s.stage - 1].mul }))}</small><small>${esc(t('ocean', { o: t('o_' + this.biome()) }))}</small><small>${IC.pearl} ${esc(t('pearls', { n: s.pearls, p: s.pearls * 10 }))}</small></div></div>
          ${nextSt ? `<button class="row grow ${s.shells >= nextSt.cost ? 'can' : ''}" data-grow="1"><div class="ui">${IC.up}</div><div class="rt"><b>${esc(t('grow'))}: «${esc(t('stage' + (s.stage + 1)))}»</b><small>${esc(t('growDesc', { p: Math.round((STAGES[s.stage].mul / STAGES[s.stage - 1].mul - 1) * 100) }))}</small></div><span class="cost"><span class="c">${shellsHTML(nextSt.cost)}</span></span></button>` : `<div class="row"><div class="rt"><b>${esc(t('maxStage'))}</b></div></div>`}
          <div class="mig ${this.canMigrate() ? 'ready' : ''}"><div class="rt"><b>${IC.pearl} ${esc(t('migrate'))}</b><small>${esc(s.island < need ? t('migrateNeed', { n: need }) : g < 1 ? t('migrateNone') : t('migrateDesc', { o: t('o_' + BIOMES[(s.migr + 1) % BIOMES.length]), n: g, p: g * 10 }))}</small><i class="ms"><u style="width:${Math.min(100, (s.island / need) * 100).toFixed(0)}%"></u></i><small>${s.island} / ${need}</small></div>${this.canMigrate() ? `<button class="btn primary sm b-mig">${esc(t('migrateGo'))}</button>` : ''}</div>
          ${s.cards.length ? `<p class="lbl">${esc(t('cardsNow'))}</p>${cardsHTML}` : ''}`;
        const gb = L.querySelector('[data-grow]');
        if (gb) gb.onclick = () => this.grow();
        const mb = L.querySelector('.b-mig');
        if (mb)
          mb.onclick = () => {
            audio.play('click');
            this.openMigrate();
          };
      }
      const gb = L.querySelector('[data-grow]');
      if (gb && STAGES[s.stage]) gb.classList.toggle('can', s.shells >= STAGES[s.stage].cost);
    }
  }

  hud(force) {
    if (!this.el) return;
    const s = this.s;
    const e = this.el;
    this.ui.classList.toggle('hidden', this.menu);
    e.shells.textContent = fmt(s.shells);
    e.ps.textContent = t('perSec', { n: fmt(this.inc()) });
    e.fount.style.width = (this.mega > 0 ? (this.mega / fountDur(s)) * 100 : this.fount * 100).toFixed(0) + '%';
    e.fount.parentElement.parentElement.classList.toggle('on', this.mega > 0);
    e.fl.textContent = this.mega > 0 ? t('megaOn') : t('fountain');
    const d = islandDist(s.island + 1);
    e.isl.style.width = ((s.miles / d) * 100).toFixed(1) + '%';
    e.il.textContent = `${t('toIsland', { n: s.island + 1 })}: ${t('miles', { n: Math.max(0, Math.ceil(d - s.miles)) })}`;
    const wl = this.windEnd - Date.now();
    e.wind.classList.toggle('on', wl > 0);
    e.wl.textContent = wl > 0 ? t('windLeft', { t: fmtTime(wl / 1000) }) : t('wind');
    e.gift.classList.toggle('hidden', !giftState(s.login).can);
    e.whaleDot.classList.toggle('hidden', !(this.canMigrate() || (STAGES[s.stage] && s.shells >= STAGES[s.stage].cost)));
    // подсказки обучения
    const tk = s.tut;
    if (force || tk !== this._tut) {
      this._tut = tk;
      const msg = tk === 0 ? t('tut1') : tk === 1 ? t('tut2') : tk === 2 ? t('tut3') : '';
      e.tut.classList.toggle('hidden', !msg);
      e.tut.className = 'tutb t' + tk + (msg ? '' : ' hidden');
      e.tut.innerHTML = msg ? `${tk === 0 ? IC.hand : ''}<span>${esc(msg)}</span>` : '';
      this.ui.querySelector('[data-b="lemon"]')?.classList.toggle('hint', tk === 1);
    }
    this.renderPanel(false);
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
    if (x)
      x.onclick = () => {
        audio.play('click');
        this.closeModal();
      };
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
    if (!this.modal && this.queue.length) this.queue.shift()();
    this.setGameplay();
  }
  toast(msg, kind = '') {
    const d = document.createElement('div');
    d.className = 'toast ' + kind;
    d.textContent = msg;
    this.toastEl.appendChild(d);
    while (this.toastEl.children.length > 3) this.toastEl.firstChild.remove();
    setTimeout(() => d.classList.add('out'), 2300);
    setTimeout(() => d.remove(), 2800);
  }

  openShop() {
    const render = (m) => {
      const items = iap.items();
      const desc = { shells_2h: 2, shells_8h: 8, shells_24h: 24 };
      m.innerHTML = `<button class="mx" aria-label="close">${IC.close}</button><div class="m-title">${IC.bag}<span>${esc(t('shop'))}</span></div><div class="list">${
        items.length
          ? items
              .map(
                (x) => `<div class="row"><div class="ui">${x.p.imageURI ? `<img src="${esc(x.p.imageURI)}" alt="">` : x.id === 'disable_ads' ? IC.video : IC.shell}</div><div class="rt"><b>${esc(x.p.title)}</b><small>${esc(x.p.description)}</small>${desc[x.id] ? `<small class="now">${shellsHTML(Math.max(baseIncome(this.s) * 3600 * desc[x.id], { 2: 5000, 8: 30000, 24: 150000 }[desc[x.id]]))}</small>` : ''}</div>${x.owned ? `<span class="okl">${esc(t('ownedP'))}</span>` : `<button class="btn sm primary" data-iap="${esc(x.id)}">${priceHTML(x.p)}</button>`}</div>`,
              )
              .join('')
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
    const s = this.s;
    this.openModal(
      `<div class="m-title">${IC.gear}<span>${esc(t('settings'))}</span></div>
      ${slidersHTML(s.settings, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}
      <p class="sub">${esc(t('islandsAll', { n: s.islandsAll }))} · ${IC.pearl} ${s.pearls}</p>
      <div class="m-btns"><button class="btn ghost b-menu">${esc(t('toMenu'))}</button><button class="btn primary b-ok">${esc(t('ok'))}</button></div>`,
      {
        onOpen: (m) => {
          bindSliders(m, s.settings, () => save.write());
          m.querySelector('.b-ok').onclick = () => this.closeModal();
          m.querySelector('.b-menu').onclick = () => {
            this.closeModal(true);
            this.toMenu();
          };
        },
      },
    );
  }

  async openLb() {
    const m = this.openModal(`<div class="m-title">${IC.trophy}<span>${esc(t('lbTitle'))}</span></div><p class="sub">${esc(t('lbSub'))}</p><div class="lb"><p class="sub">…</p></div>`, {});
    const res = await sdk.getLeaderboard();
    const box = m.querySelector('.lb');
    if (!box) return;
    if (!res.available) {
      box.innerHTML = `<p class="sub">${esc(t('lbEmpty'))}</p><p class="sub">${esc(t('islandsAll', { n: this.s.islandsAll }))}</p>`;
      return;
    }
    box.innerHTML =
      res.entries.map((e) => `<div class="lbr ${e.me ? 'me' : ''}"><b>${e.rank}</b><span>${esc(e.name || (e.me ? t('you') : '—'))}</span><em>${IC.island} ${e.score}</em></div>`).join('') +
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
    this.menuEl.querySelector('.m-lb').onclick = () => (audio.play('click'), this.openLb());
    this.menuEl.querySelector('.m-set').onclick = () => (audio.play('click'), this.openSettings());
  }
  toMenu() {
    this.menu = true;
    this.menuEl.classList.remove('hidden');
    this.resize();
    this.hud(true);
    this.setGameplay();
  }
  startPlay() {
    const go = () => {
      this.menu = false;
      this.menuEl.classList.add('hidden');
      this.resize();
      this.hud(true);
      this.renderPanel(true);
      // сначала офлайн-доход, потом подарок за вход
      this.showOffline(() => {
        if (giftState(this.s.login).can && (this.s.tut >= 3 || this.s.all > 1000)) this.openGift();
      });
      this.setGameplay();
    };
    if (this.played) this.interstitial(go);
    else go();
    this.played = true;
  }

  persist() {
    save.write();
  }

  _injectCss() {
    const st = document.createElement('style');
    st.textContent = volumeCss({ accent: '#ff8a3a', muted: '#6a7a9a', track: '#dde4f4', thumb: '#fff' });
    document.head.appendChild(st);
  }
}
