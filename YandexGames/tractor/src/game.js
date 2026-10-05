// Игра: цикл, трактор и поля, продажа и заказы, уровни, подсказки, метки, камера, интерфейс и окна
import * as THREE from 'three';
import { sdk } from './sdk.js';
import { save } from './save.js';
import { t, fmtTime, fmtNum } from './i18n.js';
import { audio } from './audio.js';
import { iap, priceHTML } from './iap.js';
import { initVolume, slidersHTML, bindSliders, volumeCss } from './volume.js';
import { IC, CROP_IC, coinsArt, NOADS_ART, AD_ART, tractorArt } from './icons.js';
import { World, UNLOAD } from './world.js';
import { Field } from './fields.js';
import { Tractor } from './tractor.js';
import { Input } from './input.js';
import { CROPS, CROP_IDS, FIELDS, FIELD_D, ST, UPGRADES, upCost, TRACTORS, xpNeed, makeOrder } from './econ.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const $ = (s, r = document) => r.querySelector(s);
const TOOL_OF = { plow: 'plow', seed: 'seed', harvest: 'harvest' };
const AD_GAP = 180000;
const CAM_YAW = Math.PI + 0.5; // камера со стороны полей смотрит на усадьбу
const isTouch = matchMedia('(pointer: coarse)').matches;

export const IAP_DEFS = {
  coins_2000: { grant: () => game && game.addCoins(2000) },
  coins_8000: { grant: () => game && game.addCoins(8000) },
  coins_25000: { grant: () => game && game.addCoins(25000) },
  disable_ads: {
    permanent: true,
    grant: () => {
      save.data.noAds = true;
      sdk.noAds = true;
    },
  },
};
const IAP_ART = { coins_2000: coinsArt(2), coins_8000: coinsArt(4), coins_25000: coinsArt(6), disable_ads: NOADS_ART };
let game = null;

export class Game {
  constructor() {
    game = this;
    this.s = save.data;
    const st = this.s.settings;
    const q = st.quality === 'auto' ? (isTouch ? 'mid' : 'high') : st.quality === 'low' ? 'low' : 'high';
    this.canvas = document.getElementById('c');
    this.world = new World(this.canvas, q);
    this.fields = FIELDS.map((d, i) => new Field(this.world, d, i));
    this.fields.forEach((f, i) => {
      f.restore(this.s.fields[i]);
      f.setOwned(f.owned || !!(this.s.fields[i] && this.s.fields[i].o));
    });
    this.tractor = new Tractor(this.world);
    if (this.s.pos) {
      this.tractor.x = this.s.pos.x;
      this.tractor.z = this.s.pos.z;
      this.tractor.h = this.s.pos.h;
    }
    this.applyStats();
    this.input = new Input(this.canvas);
    this.modal = null;
    this.menu = true;
    this.lastAd = Date.now();
    this.played = false;
    this.unloadT = -1;
    this.camDist = 24;
    this.camPos = new THREE.Vector3();
    this.focus = new THREE.Vector3(this.tractor.x, 0, this.tractor.z);
    this.orbit = 0;
    this._pts = [];
    this._v = new THREE.Vector3();
    this.mooT = 8;
    if (this.s.orders.length < 3) while (this.s.orders.length < 3) this.s.orders.push(makeOrder(this.s.lvl, Math.random, this.s.orders.map((o) => o.crop)));
    this._arrow();
    this._hud();
    this._menu();
    this.resize();
    addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('wheel', (e) => {
      this.camDist = Math.max(14, Math.min(40, this.camDist + Math.sign(e.deltaY) * 2));
    }, { passive: true });
    this.last = performance.now();
    this.saveT = 0;
    this.tickT = 0;
    this.hintT = 0;
    this.fps = { t: 0, n: 0, done: st.quality !== 'auto' };
    requestAnimationFrame((n) => this.loop(n));
    window.__game = this;
  }

  // ---------- характеристики ----------
  applyStats() {
    const s = this.s,
      tr = TRACTORS.find((x) => x.id === s.tr) || TRACTORS[0];
    this.tractor.setLook(tr);
    this.tractor.maxSpeed = UPGRADES.speed.val(s.upg.speed) + tr.speed;
    this.tractor.setWidth(UPGRADES.width.val(s.upg.width) + tr.width);
    this.tractor.cap = UPGRADES.cap.val(s.upg.cap);
    this.growMul = UPGRADES.grow.val(s.upg.grow);
    this.tractor.load = this.loadTotal();
    this.tractor.setLoadColor(this.mainCrop());
  }
  loadTotal() {
    return Object.values(this.s.load).reduce((a, b) => a + b, 0);
  }
  mainCrop() {
    let best = null,
      bq = 0;
    for (const [c, q] of Object.entries(this.s.load)) if (q > bq) ((bq = q), (best = c));
    return best;
  }

  addCoins(n, fromX, fromY) {
    this.s.coins += n;
    this.updateHud(true);
    audio.play('coin');
    if (fromX !== undefined) this.fly(`+${fmtNum(n)}`, fromX, fromY);
  }

  // ---------- главный цикл ----------
  loop(now) {
    requestAnimationFrame((n) => this.loop(n));
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (document.hidden) return;
    const w = this.world,
      tr = this.tractor;
    if (this.menu) {
      this.orbit += dt * 0.06;
      const c = w.camera;
      c.position.set(Math.sin(this.orbit) * 46, 26, 16 + Math.cos(this.orbit) * 46);
      c.lookAt(0, 0, 14);
      w.update(dt, { x: 0, z: 14 });
      tr.update(dt, 0, 0, 0, w);
      w.render();
      return;
    }
    // ввод → направление в мире (камера смотрит под фиксированным углом)
    const inp = this.modal ? { x: 0, y: 0, m: 0 } : this.input.get();
    const fx = Math.sin(CAM_YAW),
      fz = Math.cos(CAM_YAW);
    let dx = -Math.cos(CAM_YAW) * inp.x + fx * inp.y,
      dz = Math.sin(CAM_YAW) * inp.x + fz * inp.y,
      mag = inp.m;
    // автопилот для промо-роликов и тестов: направление сразу в мировых осях
    if (this.autoDir) [dx, dz, mag] = this.autoDir;
    tr.update(dt, dx, dz, mag, w);
    // поле под трактором и орудие
    const f = this.fields.find((fl) => fl.owned && fl.contains(tr.x, tr.z, 2.2));
    this.curField = f;
    let working = false;
    if (f) {
      const need = f.need();
      if (need) {
        if (need === 'seed' && f.doneN === 0) f.setCrop(this.s.seed);
        if (tr.setTool(TOOL_OF[need])) audio.play('tool');
        if (Math.abs(tr.v) > 0.3) working = this.work(f, need);
      }
    }
    this.full = tr.load >= tr.cap - 0.01;
    audio.engine(this.s.settings.engine, Math.abs(tr.v), working);
    // разгрузка в амбаре
    const du = Math.hypot(tr.x - UNLOAD.x, tr.z - UNLOAD.z);
    if (this.unloadT < 0 && du < UNLOAD.r && tr.load > 0.5) this.unloadT = 0;
    if (this.unloadT >= 0) {
      this.unloadT += dt;
      tr.load = this.loadTotal() * Math.max(0, 1 - this.unloadT / 1.1);
      if (this.unloadT > 1.1) {
        this.unloadT = -1;
        this.sell();
      }
    }
    // рост полей
    this.tickT -= dt;
    if (this.tickT <= 0) {
      this.tickT = 0.3;
      const n = Date.now();
      for (const fl of this.fields) if (fl.tick(n) === 'ripe') audio.play('ripe');
    }
    // животные иногда подают голос
    this.mooT -= dt;
    if (this.mooT <= 0) {
      this.mooT = 10 + Math.random() * 12;
      const dc = Math.hypot(tr.x - w.pen.x, tr.z - w.pen.z);
      if (dc < 22) audio.play('moo');
      else if (Math.hypot(tr.x - 8, tr.z + 2) < 14) audio.play('cluck');
    }
    this.hintT -= dt;
    if (this.hintT <= 0) {
      this.hintT = 0.25;
      this.updateHint();
      this.updateHud();
      audio.setMood(w.dayK < 0.3 ? 'night' : 'game');
    }
    // камера
    this.focus.lerp(this._v.set(tr.x + Math.sin(tr.h) * tr.v * 0.6, 0, tr.z + Math.cos(tr.h) * tr.v * 0.6), Math.min(1, dt * 3));
    const pitch = 0.95;
    const cam = w.camera;
    // в вертикальном экране отодвигаем камеру, чтобы поле влезало по ширине
    const dist = this.camDist * (cam.aspect < 1 ? Math.min(1.7, 1 / Math.sqrt(cam.aspect) * 0.95) : 1);
    const want = this._v.set(this.focus.x - fx * dist * Math.cos(pitch), dist * Math.sin(pitch), this.focus.z - fz * dist * Math.cos(pitch));
    if (this.snapCam) {
      this.snapCam = false;
      cam.position.copy(want);
    } else cam.position.lerp(want, Math.min(1, dt * 4));
    cam.lookAt(this.focus.x, 0.5, this.focus.z);
    if (this.camHook) this.camHook(cam);
    // стрелка-подсказка
    if (this.arrow.visible) {
      this.arrow.rotation.y += dt * 2;
      this.arrow.position.y = this.arrowY + Math.sin(now / 250) * 0.5;
    }
    w.update(dt, this.focus);
    w.render();
    this.labels();
    this.saveT -= dt;
    if (this.saveT <= 0) {
      this.saveT = 4;
      this.persist();
    }
    this.autoQuality(dt);
  }

  work(f, need) {
    const tr = this.tractor;
    if (need === 'harvest' && this.full) return false;
    const n = f.work(tr.toolPoints(this._pts));
    if (!n) return false;
    tr.workFx(this.world, f.crop);
    if (need === 'harvest') this.addLoad(f.crop, (n * CROPS[f.crop].yield) / f.total);
    if (f.progress() >= 0.93) this.finish(f, need);
    return true;
  }

  addLoad(crop, q) {
    const tr = this.tractor;
    const room = Math.max(0, tr.cap - this.loadTotal());
    q = Math.min(q, room);
    if (q <= 0) return;
    this.s.load[crop] = (this.s.load[crop] || 0) + q;
    tr.load = this.loadTotal();
    tr.setLoadColor(this.mainCrop());
  }

  finish(f, need) {
    if (need === 'harvest') this.addLoad(f.crop, ((f.total - f.doneN) * CROPS[f.crop].yield) / f.total);
    f.advance(Date.now(), this.growMul);
    audio.play('done');
    const xp = need === 'harvest' ? 6 : 3;
    this.s.xp += xp;
    const p = this.screenOf(f.x, 2, f.z);
    if (p) this.fly(`+${xp}`, p.x, p.y, IC.star);
    this.checkLevel();
    this.persist(true);
  }

  // продажа: сначала в заказы, остальное по обычной цене
  sell() {
    const s = this.s;
    let sale = 0,
      bonus = 0,
      qty = 0;
    for (const [crop, q0] of Object.entries(s.load)) {
      let q = Math.floor(q0 + 1e-6);
      qty += q;
      for (let i = 0; i < s.orders.length; i++) {
        const o = s.orders[i];
        if (o.crop !== crop || q <= 0) continue;
        const take = Math.min(q, o.qty - o.got);
        o.got += take;
        q -= take;
        if (o.got >= o.qty) {
          bonus += o.reward;
          s.xp += o.xp;
          this.toast(t('orderDone', { n: fmtNum(o.reward) }), IC.orders);
          s.orders[i] = makeOrder(s.lvl, Math.random, s.orders.map((x) => x.crop));
        }
      }
      sale += Math.round(q * CROPS[crop].price);
    }
    s.load = {};
    this.tractor.load = 0;
    s.xp += qty;
    s.harvested += qty;
    s.sales++;
    const total = sale + bonus;
    if (total > 0) {
      s.earned += total;
      const p = this.screenOf(UNLOAD.x, 3, UNLOAD.z);
      this.addCoins(total, p && p.x, p && p.y);
      audio.play('sell');
      if (sale > 0) this.saleToast(sale);
      sdk.submitScore(s.earned);
    }
    this.checkLevel();
    this.persist(true);
  }

  saleToast(sale) {
    const el = this.toast(t('sold', { n: fmtNum(sale) }), IC.coin, 6000, `${IC.video}<span>${esc(t('soldX2'))}</span>`);
    const b = el.querySelector('button');
    b.onclick = () => {
      el.remove();
      this.rewarded(() => {
        this.addCoins(sale);
        this.s.earned += sale;
        this.toast(t('doubled'), IC.coin);
        this.persist(true);
      });
    };
  }

  checkLevel() {
    const s = this.s;
    let up = false;
    while (s.xp >= xpNeed(s.lvl)) {
      s.xp -= xpNeed(s.lvl);
      s.lvl++;
      up = true;
    }
    if (up) this.levelUp();
    this.updateHud();
  }

  // ---------- подсказки и стрелка ----------
  _arrow() {
    const head = new THREE.ConeGeometry(0.75, 1.3, 12);
    head.rotateX(Math.PI);
    const shaft = new THREE.CylinderGeometry(0.28, 0.28, 1.2, 10);
    shaft.translate(0, 1.2, 0);
    const g = new THREE.Group();
    const m = new THREE.MeshLambertMaterial({ color: 0xffd23a, emissive: 0x5a4200 });
    g.add(new THREE.Mesh(head, m), new THREE.Mesh(shaft, m));
    this.arrow = g;
    this.arrow.visible = false;
    this.world.scene.add(this.arrow);
    this.arrowY = 6;
  }

  task() {
    const tr = this.tractor,
      s = this.s;
    const own = this.fields.filter((f) => f.owned);
    const near = (list) => list.sort((a, b) => Math.hypot(a.x - tr.x, a.z - tr.z) - Math.hypot(b.x - tr.x, b.z - tr.z))[0];
    const ripe = own.filter((f) => f.stage === ST.RIPE);
    if (tr.load > 0.5 && (this.full || !ripe.length)) return { key: this.full ? 'h_full' : 'h_unload', x: UNLOAD.x, z: UNLOAD.z, barn: true, ic: IC.trailer };
    // трактор уже на поле, где есть работа, — подсказка про это поле
    const cf = this.curField;
    if (cf && cf.need() && !(cf.need() === 'harvest' && this.full)) {
      const n = cf.need();
      return { key: n === 'plow' ? 'h_plow' : n === 'seed' ? 'h_seed' : 'h_harvest', f: cf, ic: IC[n], c: t('c_' + (cf.doneN ? cf.crop : s.seed)) };
    }
    if (ripe.length) return { key: 'h_harvest', f: near(ripe), ic: IC.harvest };
    const plowed = own.filter((f) => f.stage === ST.PLOWED);
    if (plowed.length) return { key: 'h_seed', f: near(plowed), ic: IC.seed, c: t('c_' + s.seed) };
    const wild = own.filter((f) => f.stage === ST.WILD || f.stage === ST.STUBBLE);
    if (wild.length) return { key: 'h_plow', f: near(wild), ic: IC.plow };
    const buy = this.fields.find((f) => !f.owned && f.def.cost <= s.coins);
    if (buy) return { key: 'h_buy', f: buy, ic: IC.coin };
    const grow = own.filter((f) => f.stage === ST.GROWING).sort((a, b) => a.t0 + a.dur - (b.t0 + b.dur))[0];
    return { key: 'h_wait', f: grow, ic: IC.cart, wait: true };
  }

  updateHint() {
    const k = this.task();
    const txt = k.key === 'h_seed' ? t('h_seed', { c: k.c }) : t(k.key);
    const el = this.ui.hint;
    if (el._k !== txt) {
      el._k = txt;
      el.innerHTML = `${k.ic}<span>${esc(txt)}</span>`;
    }
    const tr = this.tractor;
    let show = !k.wait && !!(k.f || k.barn);
    if (k.f && k.f.contains(tr.x, tr.z, 1)) show = false;
    if (k.barn && Math.hypot(tr.x - k.x, tr.z - k.z) < UNLOAD.r) show = false;
    this.arrow.visible = show;
    if (show) {
      const x = k.f ? k.f.x : k.x,
        z = k.f ? k.f.z : k.z;
      this.arrow.position.x = x;
      this.arrow.position.z = z;
      this.arrowY = k.barn ? 5 : 4.5;
    }
  }

  // ---------- метки над полями ----------
  screenOf(x, y, z) {
    const v = this._v.set(x, y, z).project(this.world.camera);
    if (v.z > 1) return null;
    return { x: ((v.x + 1) / 2) * innerWidth, y: ((1 - v.y) / 2) * innerHeight };
  }

  labels() {
    const now = Date.now();
    this.fields.forEach((f, i) => {
      const el = this.ui.labels[i];
      const p = this.screenOf(f.x, 2.6, f.z - FIELD_D / 2 + 2);
      if (!p || p.x < -80 || p.x > innerWidth + 80 || p.y < 150 || p.y > innerHeight - 40) {
        el.style.display = 'none';
        return;
      }
      el.style.display = '';
      el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%,-100%)`;
      let html = '',
        key = '';
      const pr = Math.round(f.progress() * 100);
      if (!f.owned) {
        const can = this.s.coins >= f.def.cost;
        key = 'L' + can;
        html = `<div class="pl">${IC.lock}<span>${fmtNum(f.def.cost)}</span>${IC.coin}</div><button class="lb${can ? ' gold' : ''}" data-buy="${i}">${IC.cart}${esc(t('f_buy'))}</button>`;
      } else if (f.stage === ST.GROWING) {
        const left = f.timeLeft(now);
        key = 'G' + Math.ceil(left) + f.crop;
        html = `<div class="pl">${CROP_IC[f.crop]}<span>${fmtTime(left)}</span><i><u style="width:${Math.round(f.growK(now) * 100)}%"></u></i></div>${left > 6 ? `<button class="lb" data-grow="${i}">${IC.video}${esc(t('f_speed'))}</button>` : ''}`;
      } else if (f.stage === ST.RIPE) {
        key = 'R' + pr + f.crop;
        html = `<div class="pl ripe">${CROP_IC[f.crop]}<span>${esc(t('f_ripe'))}</span>${pr ? `<i><u style="width:${pr}%"></u></i>` : ''}</div>`;
      } else if (f.stage === ST.PLOWED) {
        key = 'P' + pr + this.s.seed;
        html = `<div class="pl">${IC.seed}<span>${esc(t('f_seed'))}</span>${pr ? `<i><u style="width:${pr}%"></u></i>` : CROP_IC[f.doneN ? f.crop : this.s.seed]}</div>`;
      } else {
        key = 'W' + pr;
        html = `<div class="pl">${IC.plow}<span>${esc(t('f_plow'))}</span>${pr ? `<i><u style="width:${pr}%"></u></i>` : ''}</div>`;
      }
      if (el._k !== key) {
        el._k = key;
        el.innerHTML = html;
      }
    });
  }

  buyField(i) {
    const f = this.fields[i];
    if (f.owned) return;
    if (this.s.coins < f.def.cost) {
      audio.play('wrong');
      this.toast(t('notEnough'), IC.coin);
      return this.openShop('coins');
    }
    this.s.coins -= f.def.cost;
    f.setOwned(true);
    audio.play('done');
    this.toast(t('boughtField'), IC.star);
    this.updateHud(true);
    this.persist(true);
  }

  growNow(i) {
    const f = this.fields[i];
    this.rewarded(() => {
      if (f.stage !== ST.GROWING) return;
      f.t0 = Date.now() - f.dur - 1;
      f.tick(Date.now());
      audio.play('ripe');
      this.persist(true);
    });
  }

  // ---------- сохранение ----------
  persist(now) {
    const s = this.s,
      tr = this.tractor;
    s.fields = this.fields.map((f) => f.serialize());
    s.pos = { x: +tr.x.toFixed(2), z: +tr.z.toFixed(2), h: +tr.h.toFixed(3) };
    save.write(true);
  }

  autoQuality(dt) {
    const f = this.fps;
    if (f.done) return;
    f.t += dt;
    f.n++;
    if (f.t > 6) {
      f.done = true;
      const fps = f.n / f.t;
      if (fps < 32) {
        this.world.renderer.setPixelRatio(1);
        if (fps < 22) {
          this.world.renderer.shadowMap.enabled = false;
          this.world.sun.castShadow = false;
          this.world.scene.traverse((o) => o.material && (o.material.needsUpdate = true));
        }
        this.resize();
      }
    }
  }

  resize() {
    this.world.resize(innerWidth, innerHeight);
  }

  // ---------- реклама ----------
  setGameplay() {
    sdk.gameplay(!this.menu && !this.modal && !document.hidden && !sdk.adActive);
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
    if (this.s.noAds || Date.now() - this.lastAd < AD_GAP || this.s.sales < 3) return after && after();
    this.lastAd = Date.now();
    audio.suspend('ad');
    this.input.release();
    sdk.showInterstitial(() => {
      audio.resume('ad');
      this.setGameplay();
      after && after();
    });
  }

  // ---------- интерфейс ----------
  _hud() {
    const ui = document.getElementById('ui');
    ui.innerHTML = `
      <div class="hud hidden">
        <div class="top">
          <button class="chip b3d h-coins">${IC.coin}<span class="cv">0</span></button>
          <div class="lvl b3d pe"><b class="lv">1</b><i><u></u></i></div>
          <div class="sp"></div>
          <button class="ib b3d h-orders" aria-label="orders">${IC.orders}<em class="badge hidden"></em></button>
          <button class="ib b3d g h-shop" aria-label="shop">${IC.cart}</button>
          <button class="ib b3d h-set" aria-label="settings">${IC.gear}</button>
        </div>
        <div class="hint"></div>
        <div class="labels"></div>
        <div class="bot">
          <div class="tool b3d"></div>
          <div class="load b3d">${IC.trailer}<i><u></u></i><span class="lq">0</span></div>
          <div class="sp"></div>
          <button class="seedbtn b3d h-seed"></button>
        </div>
      </div>`;
    const q = (s) => ui.querySelector(s);
    this.ui = { root: q('.hud'), hint: q('.hint'), tool: q('.tool'), load: q('.load'), seed: q('.h-seed'), labels: [] };
    const lb = q('.labels');
    for (let i = 0; i < this.fields.length; i++) {
      const d = document.createElement('div');
      d.className = 'lbl';
      lb.appendChild(d);
      this.ui.labels.push(d);
    }
    lb.addEventListener('pointerdown', (e) => e.stopPropagation());
    lb.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      audio.play('click');
      if (b.dataset.buy !== undefined) this.buyField(+b.dataset.buy);
      if (b.dataset.grow !== undefined) this.growNow(+b.dataset.grow);
    });
    const on = (s, fn) =>
      (q(s).onclick = (e) => {
        e.stopPropagation();
        audio.unlock();
        audio.play('click');
        fn();
      });
    on('.h-coins', () => this.openShop('coins'));
    on('.h-shop', () => this.openShop('up'));
    on('.h-orders', () => this.openOrders());
    on('.h-set', () => this.openSettings());
    on('.h-seed', () => this.openSeeds());
    ui.querySelectorAll('button').forEach((b) => b.addEventListener('pointerdown', (e) => e.stopPropagation()));
    this.updateHud();
  }

  updateHud(bump) {
    const s = this.s,
      tr = this.tractor;
    document.querySelectorAll('.cv').forEach((e) => (e.textContent = fmtNum(s.coins)));
    if (bump) {
      const c = $('.h-coins');
      c.classList.remove('bump');
      void c.offsetWidth;
      c.classList.add('bump');
    }
    $('#ui .lv').textContent = s.lvl;
    $('#ui .lvl u').style.width = Math.min(100, (s.xp / xpNeed(s.lvl)) * 100) + '%';
    const tk = tr.tool || 'none';
    if (this.ui.tool._k !== tk) {
      this.ui.tool._k = tk;
      this.ui.tool.innerHTML = `${tr.tool ? IC[tr.tool] : IC.trailer}<span>${esc(t('t_' + tk))}</span>`;
    }
    const L = Math.floor(tr.load),
      cap = tr.cap;
    this.ui.load.querySelector('u').style.width = Math.min(100, (tr.load / cap) * 100) + '%';
    this.ui.load.querySelector('.lq').textContent = `${L}/${cap}`;
    this.ui.load.classList.toggle('full', this.full);
    const sk = s.seed;
    if (this.ui.seed._k !== sk) {
      this.ui.seed._k = sk;
      this.ui.seed.innerHTML = `${CROP_IC[sk]}<span>${esc(t('c_' + sk))}<small>${esc(t('seeds'))}</small></span>`;
    }
    const done = s.orders.filter((o) => (s.load[o.crop] || 0) >= o.qty - o.got).length;
    const bd = $('.h-orders .badge');
    bd.classList.toggle('hidden', !done);
    bd.textContent = done;
  }

  toast(msg, icon = '', ms = 2600, btn = '') {
    const box = $('#toast');
    while (box.children.length > 2) box.firstChild.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `${icon}<span>${esc(msg)}</span>${btn ? `<button>${btn}</button>` : ''}`;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    box.appendChild(el);
    setTimeout(() => el.remove(), ms);
    return el;
  }

  fly(text, x, y, icon = IC.coin) {
    const el = document.createElement('div');
    el.className = 'fly';
    el.innerHTML = `${icon}<span>${esc(text)}</span>`;
    el.style.left = x - 30 + 'px';
    el.style.top = y - 20 + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  // ---------- окна ----------
  openModal(title, body, { cls = '', onClose, tabs = '' } = {}) {
    this.closeModal(true);
    this.input.release();
    const root = document.createElement('div');
    root.className = 'modal';
    root.innerHTML = `<div class="sheet ${cls}">${title ? `<div class="sh-h"><b>${esc(title)}</b><button class="xb" data-close aria-label="close">${IC.close}</button></div>` : ''}${tabs}<div class="sh-b">${body}</div></div>`;
    root.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => (audio.play('click'), this.closeModal())));
    root.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.target === root) (audio.play('click'), this.closeModal());
    });
    document.body.appendChild(root);
    this.modal = { root, onClose };
    this.setGameplay();
    return root;
  }
  closeModal(silent) {
    if (!this.modal) return;
    const m = this.modal;
    this.modal = null;
    m.root.remove();
    if (!silent && m.onClose) m.onClose();
    this.setGameplay();
  }

  openSeeds() {
    const s = this.s;
    const rows = CROP_IDS.map((id) => {
      const c = CROPS[id],
        lock = c.lvl > s.lvl;
      return `<div class="row${s.seed === id ? ' sel' : ''}${lock ? ' lockd' : ''}"><div class="ri">${CROP_IC[id]}</div><div class="rt"><b>${esc(t('c_' + id))}</b><small>${esc(t('growTime', { t: fmtTime(c.grow * this.growMul) }))} · ${esc(t('pricePer', { n: c.price }))}</small></div>${lock ? `<span class="btn w">${IC.lock}${esc(t('lockedLvl', { n: c.lvl }))}</span>` : `<button class="btn ${s.seed === id ? 'w' : 'g'}" data-id="${id}">${esc(s.seed === id ? t('selected') : t('select'))}</button>`}</div>`;
    }).join('');
    const root = this.openModal(t('seedPick'), rows);
    root.querySelectorAll('[data-id]').forEach(
      (b) =>
        (b.onclick = () => {
          audio.play('click');
          s.seed = b.dataset.id;
          this.updateHud();
          this.persist();
          this.closeModal();
        }),
    );
  }

  openOrders() {
    const s = this.s;
    const rows = s.orders
      .map((o) => `<div class="row ord"><div class="ri">${CROP_IC[o.crop]}</div><div class="rt"><b>${esc(t('cl_' + o.client))}</b><small>${esc(t('c_' + o.crop))}: ${o.got} / ${o.qty}</small><div class="bar"><u style="width:${(o.got / o.qty) * 100}%"></u></div></div><div class="rw">${IC.coin}${fmtNum(o.reward)}</div></div>`)
      .join('');
    this.openModal(t('orders'), `<p class="muted">${esc(t('ordersSub'))}</p>${rows}`);
  }

  openShop(tab = 'up') {
    const tabs = `<div class="tabs">${['up', 'tr', 'coins'].map((k) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${esc(t('tab_' + k))}</button>`).join('')}</div>`;
    const root = this.openModal(t('shop'), '', { tabs });
    const body = $('.sh-b', root);
    const render = (k) => {
      tab = k;
      root.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === k));
      const s = this.s;
      if (k === 'up') {
        const IC_UP = { speed: IC.bolt, width: IC.plow, cap: IC.trailer, grow: CROP_IC.wheat };
        body.innerHTML = Object.keys(UPGRADES)
          .map((id) => {
            const l = s.upg[id],
              U = UPGRADES[id],
              max = l >= U.max;
            const v = id === 'grow' ? Math.round((1 - U.val(l)) * 100) : id === 'cap' ? U.val(l) : U.val(l).toFixed(1);
            const cost = upCost(id, l);
            return `<div class="row"><div class="ri">${IC_UP[id]}</div><div class="rt"><b>${esc(t('up_' + id))}</b><small>${esc(t('up_' + id + '_d', { v }))}</small><div class="lv">${[...Array(U.max)].map((_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</div></div>${max ? `<span class="btn w">${esc(t('maxed'))}</span>` : `<button class="btn ${s.coins >= cost ? 'g' : 'w'}" data-up="${id}">${IC.coin}${fmtNum(cost)}</button>`}</div>`;
          })
          .join('');
        body.querySelectorAll('[data-up]').forEach(
          (b) =>
            (b.onclick = () => {
              const id = b.dataset.up,
                cost = upCost(id, s.upg[id]);
              if (s.coins < cost) return (audio.play('wrong'), render('coins'));
              s.coins -= cost;
              s.upg[id]++;
              audio.play('done');
              this.applyStats();
              this.updateHud(true);
              this.persist(true);
              render('up');
            }),
        );
      } else if (k === 'tr') {
        body.innerHTML = TRACTORS.map((tr) => {
          const own = s.tractors.includes(tr.id),
            sel = s.tr === tr.id;
          const desc = tr.cost ? t('tr_d', { s: tr.speed, w: tr.width }) : t('tr_base');
          const btn = sel ? `<span class="btn w">${esc(t('selected'))}</span>` : own ? `<button class="btn g" data-sel="${tr.id}">${esc(t('select'))}</button>` : `<button class="btn ${s.coins >= tr.cost ? 'g' : 'w'}" data-buytr="${tr.id}">${IC.coin}${fmtNum(tr.cost)}</button>`;
          return `<div class="row${sel ? ' sel' : ''}"><div class="ri">${tractorArt('#' + tr.body.toString(16).padStart(6, '0'), '#' + tr.rim.toString(16).padStart(6, '0'))}</div><div class="rt"><b>${esc(t('tr_' + tr.id))}</b><small>${esc(desc)}</small></div>${btn}</div>`;
        }).join('');
        body.querySelectorAll('[data-sel]').forEach(
          (b) =>
            (b.onclick = () => {
              audio.play('click');
              s.tr = b.dataset.sel;
              this.applyStats();
              this.persist(true);
              render('tr');
            }),
        );
        body.querySelectorAll('[data-buytr]').forEach(
          (b) =>
            (b.onclick = () => {
              const tr = TRACTORS.find((x) => x.id === b.dataset.buytr);
              if (s.coins < tr.cost) return (audio.play('wrong'), render('coins'));
              s.coins -= tr.cost;
              s.tractors.push(tr.id);
              s.tr = tr.id;
              audio.play('level');
              this.applyStats();
              this.updateHud(true);
              this.persist(true);
              render('tr');
            }),
        );
      } else {
        const free = 100 + s.lvl * 60;
        const rows = iap
          .items()
          .map((x) => {
            const art = x.p.imageURI ? `<img src="${esc(x.p.imageURI)}" alt="">` : IAP_ART[x.id] || '';
            const btn = x.owned ? `<span class="btn w">${esc(t('iapOwned'))}</span>` : `<button class="btn g" data-iap="${esc(x.id)}">${priceHTML(x.p)}</button>`;
            return `<div class="row"><div class="ri">${art}</div><div class="rt"><b>${esc(x.p.title)}</b><small>${esc(x.p.description)}</small></div>${btn}</div>`;
          })
          .join('');
        body.innerHTML = `<div class="row"><div class="ri">${AD_ART}</div><div class="rt"><b>${esc(t('freeCoins'))}</b><small>${esc(t('freeCoinsDesc', { n: free }))}</small></div><button class="btn y s-ad">${IC.video}${esc(t('watch'))}</button></div>${rows || (sdk.real ? `<p class="muted">${esc(t('iapEmpty'))}</p>` : '')}${s.noAds ? `<p class="muted">${esc(t('noAdsOn'))}</p>` : ''}`;
        $('.s-ad', body).onclick = (e) => {
          e.currentTarget.disabled = true;
          this.rewarded(() => {
            this.addCoins(free);
            this.toast(t('got', { n: free }), IC.coin);
            this.persist(true);
          });
          setTimeout(() => root.isConnected && render('coins'), 400);
        };
        body.querySelectorAll('[data-iap]').forEach(
          (b) =>
            (b.onclick = async () => {
              body.querySelectorAll('[data-iap]').forEach((x) => (x.disabled = true));
              const ok = await iap.buy(b.dataset.iap);
              if (ok) this.toast(t('bought'), IC.star);
              this.updateHud(true);
              if (root.isConnected) render('coins');
            }),
        );
      }
    };
    root.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => (audio.play('click'), render(b.dataset.tab))));
    render(tab);
  }

  levelUp() {
    const s = this.s;
    audio.play('level');
    const bonus = s.lvl * 50;
    s.coins += bonus;
    const crops = CROP_IDS.filter((c) => CROPS[c].lvl === s.lvl);
    for (let i = 0; i < s.orders.length; i++) if (!s.orders[i].got && Math.random() < 0.5) s.orders[i] = makeOrder(s.lvl, Math.random, s.orders.map((o) => o.crop));
    const root = this.openModal(
      '',
      `<h2>${esc(t('levelUp'))}</h2><p class="lbl0">${esc(t('levelN', { n: s.lvl }))}</p>
      ${crops.length ? `<div class="crops">${crops.map((c) => CROP_IC[c]).join('')}</div><p>${esc(t('unlocked', { s: crops.map((c) => t('c_' + c)).join(', ') }))}</p>` : ''}
      <p class="lbl0">${IC.coin.replace('class="ic"', 'class="ic" style="display:inline-block;vertical-align:-6px;width:28px;height:28px"')} +${fmtNum(bonus)}</p>
      <button class="btn g big lv-ok">${esc(t('great'))}</button>`,
      { cls: 'lvup', onClose: () => this.interstitial() },
    );
    $('.sh-b', root).classList.add('lvup');
    $('.lv-ok', root).onclick = () => (audio.play('click'), this.closeModal());
    this.updateHud(true);
  }

  openSettings(fromMenu) {
    const st = this.s.settings;
    let css = document.getElementById('vol-css');
    if (!css) {
      css = document.createElement('style');
      css.id = 'vol-css';
      document.head.appendChild(css);
    }
    css.textContent = volumeCss({ accent: '#4caf50', muted: '#7d6a58', track: '#e2cfa9', thumb: '#fff' });
    const root = this.openModal(
      t('settings'),
      `<div class="lbl0">${esc(t('volume'))}</div>${slidersHTML(st, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}
      <div class="tg ${st.engine ? 'on' : ''}" data-t="engine"><span>${esc(t('engine'))}</span><div class="sw"></div></div>
      <div class="lbl0">${esc(t('quality'))}</div><div class="seg">${['auto', 'low', 'high'].map((q) => `<button data-q="${q}" class="${st.quality === q ? 'on' : ''}">${esc(t('q_' + q))}</button>`).join('')}</div>
      <div class="lbl0">${esc(t('howTo'))}</div><p class="muted">${esc(t('howToText'))}</p>
      ${fromMenu ? '' : `<button class="btn w s-menu">${IC.back}${esc(t('back'))}</button>`}`,
      { onClose: () => save.write(false) },
    );
    bindSliders(root, st, () => save.write(false));
    root.querySelectorAll('.tg').forEach(
      (tg) =>
        (tg.onclick = () => {
          audio.play('click');
          st[tg.dataset.t] = !st[tg.dataset.t];
          tg.classList.toggle('on', st[tg.dataset.t]);
          save.write(false);
        }),
    );
    root.querySelectorAll('[data-q]').forEach(
      (b) =>
        (b.onclick = () => {
          audio.play('click');
          st.quality = b.dataset.q;
          root.querySelectorAll('[data-q]').forEach((x) => x.classList.toggle('on', x === b));
          const r = this.world.renderer,
            hi = st.quality !== 'low';
          r.setPixelRatio(Math.min(devicePixelRatio || 1, hi ? (isTouch ? 1.5 : 2) : 1));
          r.shadowMap.enabled = hi;
          this.world.sun.castShadow = hi;
          this.world.scene.traverse((o) => o.material && (o.material.needsUpdate = true));
          this.fps.done = true;
          this.resize();
          save.write(false);
        }),
    );
    const mb = $('.s-menu', root);
    if (mb)
      mb.onclick = () => {
        audio.play('click');
        this.closeModal(true);
        this.showMenu();
      };
  }

  async openLeaderboard() {
    const root = this.openModal(t('lbTitle'), `<p class="muted">…</p>`);
    const body = $('.sh-b', root);
    const mine = `<p class="lbl0">${esc(t('myScore', { n: fmtNum(this.s.earned) }))}</p>`;
    if (!sdk.real) return (body.innerHTML = `${mine}<p class="muted">${esc(t('lbLocal'))}</p>`);
    const res = await sdk.getLeaderboard();
    if (!root.isConnected) return;
    let html = mine;
    if (res.available && res.entries.length) html += `<div class="lb">${res.entries.map((e) => `<div class="lbr${e.me ? ' me' : ''}"><span class="rk">${e.rank}</span><span class="nm">${esc(e.me ? t('you') : e.name || t('player'))}</span><span class="sc">${fmtNum(e.score)}</span></div>`).join('')}</div>`;
    else html += `<p class="muted">${esc(t('lbEmpty'))}</p>`;
    if (!sdk.isAuthorized()) html += `<p class="muted">${esc(t('lbLogin'))}</p><button class="btn g lb-login">${esc(t('loginBtn'))}</button>`;
    body.innerHTML = html;
    const lg = $('.lb-login', body);
    if (lg)
      lg.onclick = async () => {
        if (await sdk.login()) {
          await sdk.submitScore(this.s.earned);
          this.closeModal(true);
          this.openLeaderboard();
        }
      };
  }

  // ---------- меню ----------
  _menu() {
    const el = document.createElement('div');
    el.id = 'menu';
    el.innerHTML = `<div class="ttl"><b>${esc(t('title1'))}</b><span>${esc(t('title2'))}</span></div>
      <div class="sub">${esc(t('subtitle'))}</div>
      <button class="btn g big play b3d">${IC.play}${esc(t('play'))}</button>
      <div class="mb"><button class="btn w m-lb">${IC.trophy}${esc(t('records'))}</button><button class="btn w m-set">${IC.gear}${esc(t('settings'))}</button></div>`;
    document.body.appendChild(el);
    this.menuEl = el;
    $('.play', el).onclick = () => {
      audio.unlock();
      audio.startMusic();
      audio.play('click');
      this.startPlay();
    };
    $('.m-lb', el).onclick = () => (audio.unlock(), audio.play('click'), this.openLeaderboard());
    $('.m-set', el).onclick = () => (audio.unlock(), audio.play('click'), this.openSettings(true));
    audio.setMood('menu');
  }

  showMenu() {
    this.menu = true;
    this.menuEl.classList.remove('hidden');
    this.ui.root.classList.add('hidden');
    this.arrow.visible = false;
    audio.setMood('menu');
    audio.engine(false, 0, false);
    this.persist(true);
    this.setGameplay();
  }

  startPlay() {
    const go = () => {
      this.menu = false;
      this.menuEl.classList.add('hidden');
      this.ui.root.classList.remove('hidden');
      this.focus.set(this.tractor.x, 0, this.tractor.z);
      this.snapCam = true;
      audio.setMood('game');
      this.setGameplay();
      if (!this.s.tutDone) {
        const root = this.openModal('', `<p class="lbl0" style="text-align:center;font-size:18px;line-height:1.4">${esc(isTouch ? t('tut') : t('tutDesk'))}</p><button class="btn g big tut-ok">${IC.play}${esc(t('ok'))}</button>`, { onClose: () => ((this.s.tutDone = true), save.write()) });
        $('.tut-ok', root).onclick = () => (audio.play('click'), this.closeModal());
      }
    };
    if (this.played) this.interstitial(go);
    else go();
    this.played = true;
  }
}
