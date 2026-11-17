// Контроллер игры: состояние, действия игрока, таймеры, жители, шары, погода, сохранения
import * as THREE from 'three';
import * as E from './econ.js';
import { World, cellPos } from './world.js';
import { Controls } from './controls.js';
import { UI } from './ui.js';
import { audio } from './audio.js';
import { sdk } from './sdk.js';
import { t as tr, fmt, fmtTime } from './i18n.js';
import { iap } from './iap.js';
import { Tutorial } from './tut.js';
import { GOALS, goalProgress, makeDaily, dayKey, dailyProgress, STREAK } from './tasks.js';

const SAVE_KEY = 'sky_islet_save_v2'; // v2: новый старт с пустого острова и обучением
const OFFLINE_EFF = 0.5;

export class Game {
  constructor() {
    this.debug = window.__SI_DEBUG || null;
  }

  // ---------- Сохранения ----------
  serialize() {
    return JSON.stringify(this.s, (k, v) => (k.startsWith('_') ? undefined : v));
  }
  async load() {
    let local = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) local = JSON.parse(raw);
    } catch (e) {}
    let cloud = null;
    try {
      cloud = await sdk.loadData();
    } catch (e) {}
    let pick = local;
    if (cloud && (!local || (cloud.ts || 0) >= (local.ts || 0))) pick = cloud;
    const s = E.newState();
    if (pick && pick.v !== 2) pick = null; // старые сохранения (v1) не переносим
    if (pick) Object.assign(s, pick);
    s.stats = s.stats || {};
    s.settings = Object.assign(E.newState().settings, s.settings || {});
    s.tut = s.tut || {};
    s.goal = s.goal || 0;
    s.level = E.islandLevel(s);
    this.s = s;
    this.isNew = !pick;
  }
  save(cloud = false) {
    this.s.ts = Date.now();
    const data = this.serialize();
    try {
      localStorage.setItem(SAVE_KEY, data);
    } catch (e) {}
    if (cloud) {
      this.lastCloud = Date.now();
      sdk.saveData(JSON.parse(data));
    }
  }

  // немедленное сохранение в облако (после покупки, до consumePurchase)
  async saveNow() {
    this.s.ts = Date.now();
    const data = this.serialize();
    try {
      localStorage.setItem(SAVE_KEY, data);
    } catch (e) {}
    this.lastCloud = Date.now();
    await sdk.saveData(JSON.parse(data), true);
  }

  // ---------- Покупки ----------
  async initIap() {
    // «Без рекламы» запоминается и в сохранении — на случай, если getPurchases() не ответит
    if (this.s.noAds) sdk.noAds = true;
    const cr = (n) => () => {
      this.s.crystals += n;
    };
    const icon = (k) => `<svg viewBox="0 0 24 24">${[[12, 12, 7], [6, 15, 4.5], [18, 15, 4.5], [12, 5, 3.5]].slice(0, k + 1).map(([x, y, r]) => `<path d="M${x} ${y - r}l${r * 0.8} ${r}-${r * 0.8} ${r}-${r * 0.8}-${r}z" fill="#a68cf0" stroke="#7f66d1" stroke-width="1.2"/>`).join('')}</svg>`;
    this.iapDefs = {
      crystals_60: { grant: cr(60), icon: icon(1) },
      crystals_220: { grant: cr(220), icon: icon(2) },
      crystals_650: { grant: cr(650), icon: icon(3) },
      disable_ads: {
        permanent: true,
        grant: () => {
          this.s.noAds = true;
          sdk.noAds = true;
        },
        icon: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="3" fill="#6aa8ec"/><path d="M10 9v6l5-3z" fill="#fff"/><circle cx="12" cy="12" r="10" fill="none" stroke="#f2786b" stroke-width="2.4"/><path d="M5 19L19 5" stroke="#f2786b" stroke-width="2.4"/></svg>',
      },
    };
    let restored = 0;
    iap.onChange((id, restoring) => {
      if (restoring && !this.iapDefs[id].permanent) restored++;
    });
    await iap.init(this.iapDefs, () => this.saveNow());
    if (restored) setTimeout(() => this.ui.toast(tr('iapRestored')), 1500);
  }

  async buyIap(id) {
    const ok = await iap.buy(id);
    if (ok) {
      audio.play('chest');
      this.ui.toast(tr('iapThanks'));
    }
    return ok;
  }

  // ---------- Запуск ----------
  async start(canvas) {
    await this.load();
    const q = this.s.settings.quality;
    this.quality = q === 'auto' ? (/(Android|iPhone|iPad|Mobile)/i.test(navigator.userAgent) ? 'mid' : 'high') : q;
    this.world = new World(canvas, this.quality);
    this.ctl = new Controls(canvas, this.world.camera, (x, y) => this.onTap(x, y), (x, y) => this.onHover(x, y));
    this.ui = new UI(this);
    this.tut = new Tutorial(this);
    await this.initIap();
    this.people = [];
    this.mode = null; // режим расстановки
    this.sel = null; // выбранный объект
    this.nextBalloon = Date.now() + 40000;
    this.nextRain = Date.now() + 240000 + Math.random() * 200000;
    this.lastInter = Date.now();
    this.lastSave = Date.now();
    this.lastCloud = Date.now();
    this.fpsS = { t: 0, n: 0, checked: false };

    // у нового игрока сутки начинаются с утра
    if (this.s.dayOffset === undefined) {
      const phase = (Date.now() / 1000) % 360;
      this.s.dayOffset = 360 * 0.04 - phase;
    }
    this.world.dayOffset = this.debug && this.debug.dayOffset !== undefined ? this.debug.dayOffset : this.s.dayOffset;
    this.rebuildIsland();
    this.world.sync(this.s, Date.now());
    const portrait = window.innerHeight > window.innerWidth;
    this.ctl.tDist = this.ctl.dist = Math.min(this.ctl.maxDist, (portrait ? 13 : 8) + this.world.bounds * (portrait ? 2.2 : 1.5));
    this.onResize();
    window.addEventListener('resize', () => this.onResize());

    // офлайн-доход и ежедневная награда
    const away = (Date.now() - (this.s.ts || Date.now())) / 1000;
    this.completeBuilds(true);
    if (!this.isNew && away > 120) this.offline(away);
    this.checkDaily();

    this.last = performance.now();
    this.econAcc = 0;
    this.uiAcc = 0;
    requestAnimationFrame((t) => this.loop(t));
    sdk.gameplay(true);
    audio.setIntensity(1);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.save(true);
        sdk.gameplay(false);
      } else {
        sdk.gameplay(true);
        this.last = performance.now();
        this.lastEcon = Date.now();
        const away2 = (Date.now() - this.s.ts) / 1000;
        if (away2 > 120) this.offline(away2);
      }
    });
    window.addEventListener('pagehide', () => this.save(true));
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.world.resize(w, h);
    this.W = w;
    this.H = h;
  }

  rebuildIsland() {
    this.world.buildIsland(this.s.plots);
    this.ctl.bbox = this.world.bbox;
    this.ctl.maxDist = 22 + this.world.bounds * 2.2;
    this.ctl.minDist = 5;
    this.world.setGhostPlots(this.ghostPlots());
  }

  ghostPlots() {
    const owned = new Set(this.s.plots);
    const out = [];
    const seen = new Set();
    for (const p of this.s.plots) {
      const [x, z] = p.split(',').map(Number);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const px = x + dx;
        const pz = z + dz;
        const k = px + ',' + pz;
        if (px < 0 || pz < 0 || px >= E.PLOTS || pz >= E.PLOTS || owned.has(k) || seen.has(k)) continue;
        seen.add(k);
        const biome = E.plotBiome(px, pz);
        out.push({ px, pz, biome, locked: E.BIOMES[biome].unlock > this.s.level });
      }
    }
    this.ghosts = out;
    return out;
  }

  // ---------- Главный цикл ----------
  loop(tms) {
    requestAnimationFrame((t) => this.loop(t));
    if (this.paused) {
      // пауза по сигналу платформы (game_api_pause): мир не обновляется
      this.last = tms;
      return;
    }
    let dt = (tms - this.last) / 1000;
    this.last = tms;
    if (dt > 1) dt = 0.016;
    const now = Date.now();
    const s = this.s;
    const rain = now < (s.rainUntil || 0);
    // ночью играет спокойная ночная музыка
    if (now - (this.moodT || 0) > 4000) {
      this.moodT = now;
      audio.setMood(this.world.night > 0.6 ? 'night' : 'game');
    }

    // экономика по реальному времени, шагами по 0.25 с
    const real = Math.min(30, Math.max(0, (now - (this.lastEcon || now)) / 1000));
    this.lastEcon = now;
    this.econAcc += real * (this.debug && this.debug.speed ? this.debug.speed : 1);
    while (this.econAcc >= 0.25) {
      this.econAcc -= 0.25;
      const before = s.coins;
      this.rates = E.tick(s, 0.25, { rain });
      s.stats.earnedAll = (s.stats.earnedAll || 0) + Math.max(0, s.coins - before);
    }
    this.completeBuilds();
    this.checkLevel();

    // погода
    if (now > this.nextRain && !rain) {
      s.rainUntil = now + 90000;
      this.nextRain = now + 420000 + Math.random() * 300000;
      this.ui.toast(tr('rain'));
    }
    audio.setRain(rain);
    // воздушный шар
    if (now > this.nextBalloon && !this.world.balloon) {
      this.world.spawnBalloon();
      this.nextBalloon = now + 100000 + Math.random() * 80000 - Math.min(40000, E.bonusLvl(s, 'offline') * 4000);
    }
    this.updatePeople(dt);
    this.tut.update();

    this.ctl.update(dt);
    this.world.update(dt, now, rain);
    this.world.render();

    this.uiAcc += dt;
    if (this.uiAcc > 0.2) {
      this.uiAcc = 0;
      this.ui.update();
    }
    this.ui.frame(dt);

    if (now - this.lastSave > 5000) {
      this.lastSave = now;
      this.save(now - this.lastCloud > 60000);
    }
    this.autoQuality(dt);
  }

  // автоснижение качества на слабых устройствах
  autoQuality(dt) {
    if (this.s.settings.quality !== 'auto' || this.fpsS.checked || this.debug) return;
    const f = this.fpsS;
    f.t += dt;
    f.n++;
    if (f.t > 6) {
      const fps = f.n / f.t;
      f.checked = true;
      if (fps < 32 && this.quality !== 'low') {
        const r = this.world.renderer;
        r.setPixelRatio(1);
        if (fps < 22) {
          r.shadowMap.enabled = false;
          this.world.sun.castShadow = false;
          this.world.scene.traverse((o) => o.material && (o.material.needsUpdate = true));
        }
        this.onResize();
      }
    }
  }

  // ---------- Стройка ----------
  completeBuilds(silent = false) {
    const now = Date.now();
    let changed = false;
    for (const b of this.s.buildings) {
      if (b.build && b.build <= now) {
        b.build = 0;
        changed = true;
        if (!silent) {
          audio.play('done');
          this.ui.floatAt(cellPos(b.x, b.z).add(new THREE.Vector3(0, 1.2, 0)), `<b>${tr('b_' + b.type)} ${tr('lvl')} ${b.lvl}</b>`, 'done');
          this.world.bump('b' + b.id);
        }
      }
    }
    if (changed) {
      this.world.sync(this.s, now);
      this.s._resT = 0;
      if (this.sel) this.ui.showSheet(this.sel);
    }
  }

  freeBuilders() {
    return this.s.builders - E.busyBuilders(this.s, Date.now());
  }

  cellFree(x, z, ignore) {
    if (x < 0 || z < 0 || x >= E.GRID || z >= E.GRID) return false;
    const pk = Math.floor(x / E.PLOT) + ',' + Math.floor(z / E.PLOT);
    if (!this.s.plots.includes(pk)) return false;
    for (const b of this.s.buildings) if (b !== ignore && b.x === x && b.z === z) return false;
    for (const d of this.s.decor) if (d !== ignore && d.x === x && d.z === z) return false;
    return true;
  }

  objAt(x, z) {
    return this.s.buildings.find((b) => b.x === x && b.z === z) || this.s.decor.find((d) => d.x === x && d.z === z) || null;
  }

  // оплата с докупкой материалов на рынке
  tryPay(cost) {
    const s = this.s;
    if (E.canAfford(s, cost)) {
      E.pay(s, cost);
      return true;
    }
    if (E.canAffordEx(s, cost)) {
      const extra = E.shortfall(s, cost);
      E.payEx(s, cost);
      this.ui.toast(tr('needMarket', { n: fmt(extra) }));
      return true;
    }
    audio.play('error');
    this.ui.toast(tr('notEnough'));
    return false;
  }

  // начало расстановки
  startPlace(kind, type, moving = null) {
    this.deselect();
    const c = this.ctl.target;
    let best = null;
    let bd = 1e9;
    for (let x = 0; x < E.GRID; x++)
      for (let z = 0; z < E.GRID; z++) {
        if (!this.cellFree(x, z, moving)) continue;
        const p = cellPos(x, z);
        const d = (p.x - c.x) ** 2 + (p.z - c.z) ** 2;
        if (d < bd) {
          bd = d;
          best = [x, z];
        }
      }
    if (!best) {
      this.ui.toast(tr('noSpace'));
      return;
    }
    if (moving) {
      best = [moving.x, moving.z];
    }
    this.mode = { kind, type, x: best[0], z: best[1], r: moving ? moving.r || 0 : 0, moving };
    this.refreshGhost();
    this.ui.showPlaceBar(this.mode);
  }

  refreshGhost() {
    const m = this.mode;
    if (!m) {
      this.world.setGhost(null);
      this.world.highlight(null);
      return;
    }
    const ok = this.cellFree(m.x, m.z, m.moving) || (m.moving && m.moving.x === m.x && m.moving.z === m.z);
    m.ok = ok;
    if (m.moving && !m.hiddenKey) {
      const k = m.kind === 'b' ? 'b' + m.moving.id : 'd' + m.moving.x + ',' + m.moving.z;
      m.hiddenKey = k;
      this.world.hideObj(k, true);
    }
    this.world.setGhost(m.kind, m.type, m.x, m.z, m.r, ok);
  }

  rotatePlace() {
    if (!this.mode) return;
    this.mode.r = (this.mode.r + 1) % 4;
    this.refreshGhost();
    audio.play('click');
  }

  cancelPlace() {
    if (this.mode && this.mode.hiddenKey) this.world.hideObj(this.mode.hiddenKey, false);
    this.mode = null;
    this.refreshGhost();
    this.ui.hidePlaceBar();
  }

  confirmPlace() {
    const m = this.mode;
    const s = this.s;
    if (!m) return;
    if (!m.ok) {
      audio.play('error');
      this.ui.toast(tr('noSpace'));
      return;
    }
    if (m.moving) {
      const o = m.moving;
      const oldKey = m.kind === 'b' ? null : 'd' + o.x + ',' + o.z;
      o.x = m.x;
      o.z = m.z;
      o.r = m.r;
      if (oldKey) this.world.removeObj(oldKey);
      else this.world.removeObj('b' + o.id);
      this.mode = null;
      this.refreshGhost();
      this.ui.hidePlaceBar();
      this.world.sync(s, Date.now());
      audio.play('place');
      return;
    }
    if (m.kind === 'b') {
      const d = E.BUILDINGS[m.type];
      if (d.unique && E.countType(s, m.type)) return;
      if (this.freeBuilders() <= 0) {
        audio.play('error');
        this.ui.toast(tr('noBuilders'));
        return;
      }
      const cost = E.costOf(m.type, 1, E.countType(s, m.type));
      if (!this.tryPay(cost)) return;
      const b = { id: s.nextId++, type: m.type, x: m.x, z: m.z, r: m.r, lvl: 1, build: Date.now() + E.buildTime(1, s) * 1000 };
      s.buildings.push(b);
      s.stats.builds = (s.stats.builds || 0) + 1;
      audio.play('build');
      // продолжаем расставлять тот же тип? нет — выходим
      this.mode = null;
      this.refreshGhost();
      this.ui.hidePlaceBar();
    } else {
      const cost = E.decorCost(m.type, E.decorCount(s, m.type));
      if (!this.tryPay(cost)) return;
      s.decor.push({ type: m.type, x: m.x, z: m.z, r: m.r });
      s.stats.decorPlaced = (s.stats.decorPlaced || 0) + 1;
      audio.play('place');
      this.ui.floatAt(cellPos(m.x, m.z).add(new THREE.Vector3(0, 0.8, 0)), `+${E.DECOR[m.type].cozy} <span class="ico">${this.ui.icon('cozy')}</span>`, 'cozy');
      // для декора остаёмся в режиме расстановки — удобно ставить несколько
      const next = this.nearestFree(m.x, m.z);
      if (next && E.canAffordEx(s, E.decorCost(m.type, E.decorCount(s, m.type)))) {
        m.x = next[0];
        m.z = next[1];
        this.refreshGhost();
        this.ui.showPlaceBar(m);
      } else {
        this.mode = null;
        this.refreshGhost();
        this.ui.hidePlaceBar();
      }
    }
    s._resT = 0;
    this.world.sync(s, Date.now());
    this.save();
  }

  nearestFree(x0, z0) {
    let best = null;
    let bd = 1e9;
    for (let x = 0; x < E.GRID; x++)
      for (let z = 0; z < E.GRID; z++) {
        if (!this.cellFree(x, z)) continue;
        const d = (x - x0) ** 2 + (z - z0) ** 2;
        if (d < bd) {
          bd = d;
          best = [x, z];
        }
      }
    return best;
  }

  upgrade(b) {
    const s = this.s;
    if (b.lvl >= E.MAX_LVL || (b.build && b.build > Date.now())) return;
    if (this.freeBuilders() <= 0) {
      audio.play('error');
      this.ui.toast(tr('noBuilders'));
      return;
    }
    const cost = E.costOf(b.type, b.lvl + 1);
    if (!this.tryPay(cost)) return;
    b.lvl++;
    b.build = Date.now() + E.buildTime(b.lvl, s) * 1000;
    s.stats.upgrades = (s.stats.upgrades || 0) + 1;
    audio.play('build');
    this.world.sync(s, Date.now());
    this.ui.showSheet(b);
    this.save();
  }

  speedCost(b) {
    const rem = (b.build - Date.now()) / 1000;
    return Math.max(1, Math.ceil(rem / 120));
  }

  speedUp(b, how) {
    if (!b.build || b.build <= Date.now()) return;
    if (how === 'ad') {
      this.rewarded(() => {
        b.build = Date.now() - 1;
        this.completeBuilds();
      });
    } else {
      const c = this.speedCost(b);
      if (this.s.crystals < c) {
        audio.play('error');
        this.ui.toast(tr('notEnough'));
        return;
      }
      this.s.crystals -= c;
      b.build = Date.now() - 1;
      this.completeBuilds();
    }
  }

  removeDecor(d) {
    const s = this.s;
    const i = s.decor.indexOf(d);
    if (i < 0) return;
    s.decor.splice(i, 1);
    const c = E.decorCost(d.type, E.decorCount(s, d.type));
    if (c.coins) s.coins += Math.floor(c.coins * 0.5);
    this.deselect();
    this.world.sync(s, Date.now());
    audio.play('pop');
  }

  buyBuilder() {
    const c = E.builderCost(this.s.builders);
    if (this.s.builders >= 5) return;
    if (this.s.crystals < c) {
      audio.play('error');
      this.ui.toast(tr('notEnough'));
      return;
    }
    this.s.crystals -= c;
    this.s.builders++;
    audio.play('levelup');
    this.ui.closeModal();
    this.save(true);
  }

  buyPlot(g) {
    const s = this.s;
    const cost = E.plotCost(s.plots.length);
    if (!E.canAfford(s, cost)) {
      audio.play('error');
      this.ui.toast(tr('notEnough'));
      return;
    }
    E.pay(s, cost);
    s.plots.push(g.px + ',' + g.pz);
    s.stats.plots = (s.stats.plots || 0) + 1;
    audio.play('plot');
    this.rebuildIsland();
    this.world.sync(s, Date.now());
    this.ctl.focus((g.px + 0.5) * E.PLOT - E.GRID / 2, (g.pz + 0.5) * E.PLOT - E.GRID / 2);
    this.ui.closeModal();
    this.save(true);
  }

  // ---------- Ввод ----------
  ndc(x, y) {
    const r = this.world.canvas.getBoundingClientRect();
    return [((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1];
  }

  onHover(x, y) {
    if (!this.mode) return;
    const [nx, ny] = this.ndc(x, y);
    const c = this.world.pickCell(nx, ny);
    if (!c) return;
    if (c.x !== this.mode.x || c.z !== this.mode.z) {
      if (c.x < 0 || c.z < 0 || c.x >= E.GRID || c.z >= E.GRID) return;
      this.mode.x = c.x;
      this.mode.z = c.z;
      this.refreshGhost();
      this.ui.showPlaceBar(this.mode);
    }
  }

  onTap(x, y) {
    audio.unlock();
    audio.startMusic();
    const [nx, ny] = this.ndc(x, y);
    if (this.world.pickBalloon(nx, ny)) return this.catchBalloon();
    const c = this.world.pickCell(nx, ny);
    if (this.mode) {
      if (!c) return;
      if (c.x === this.mode.x && c.z === this.mode.z && this.mode.ok) return this.confirmPlace();
      if (c.x < 0 || c.z < 0 || c.x >= E.GRID || c.z >= E.GRID) return;
      this.mode.x = c.x;
      this.mode.z = c.z;
      this.refreshGhost();
      this.ui.showPlaceBar(this.mode);
      return;
    }
    const p = this.world.pickPerson(nx, ny, this.people);
    if (p) return this.tapPerson(p);
    if (!c) return this.deselect();
    const o = this.objAt(c.x, c.z);
    if (o) return this.select(o);
    // участок?
    const px = Math.floor(c.x / E.PLOT);
    const pz = Math.floor(c.z / E.PLOT);
    const g = this.ghosts.find((gg) => gg.px === px && gg.pz === pz);
    if (g) return this.ui.plotModal(g);
    this.deselect();
  }

  select(o) {
    this.sel = o;
    const isB = o.id !== undefined;
    this.world.highlight(o.x, o.z, isB ? 0xffffff : 0xffe0f0);
    this.world.bump(isB ? 'b' + o.id : 'd' + o.x + ',' + o.z);
    audio.play('click');
    this.ui.showSheet(o);
  }

  deselect() {
    this.sel = null;
    if (!this.mode) this.world.highlight(null);
    this.ui.hideSheet();
  }

  // ---------- Жители ----------
  updatePeople(dt) {
    const s = this.s;
    const pop = this.rates ? this.rates.pop : 0;
    // жители появляются, только когда есть готовые дома
    const want = pop > 0 ? Math.min(40, 1 + Math.floor(Math.sqrt(pop) * 1.6)) : 0;
    while (this.people.length < want) this.people.push(this.newPerson(this.people.length));
    if (this.people.length > want) this.people.length = want;
    const list = [];
    for (const p of this.people) {
      if (p.wait > 0) p.wait -= dt;
      else if (!p.path.length) this.pickTarget(p);
      else {
        const [tx, tz] = p.path[0];
        const dx = tx - p.x;
        const dz = tz - p.z;
        const d = Math.hypot(dx, dz);
        const step = p.speed * dt;
        if (d <= step) {
          p.x = tx;
          p.z = tz;
          p.path.shift();
          if (!p.path.length) p.wait = 1 + Math.random() * 3;
        } else {
          p.x += (dx / d) * step;
          p.z += (dz / d) * step;
          p.rot = Math.atan2(dx, dz);
        }
      }
      p.cd = Math.max(0, p.cd - dt);
      const moving = p.wait <= 0 && p.path.length;
      list.push({ x: p.x + p.ox, z: p.z + p.oz, y: moving ? Math.abs(Math.sin(performance.now() / 120 + p.ph)) * 0.05 : 0, rot: p.rot, variant: p.variant, ready: p.cd <= 0 });
    }
    this.world.setPeople(list);
  }

  newPerson(i) {
    const cells = this.walkCells();
    // новый житель выходит из дома
    const homes = this.s.buildings.filter((b) => E.BUILDINGS[b.type].pop && E.effLvl(b) > 0);
    let c = null;
    if (homes.length) {
      const h = homes[Math.floor(Math.random() * homes.length)];
      const near = cells.filter(([x, z]) => Math.abs(x - h.x) + Math.abs(z - h.z) <= 2);
      if (near.length) c = near[Math.floor(Math.random() * near.length)];
    }
    c = c || cells[Math.floor(Math.random() * cells.length)] || [12, 12];
    return { x: c[0], z: c[1], ox: (Math.random() - 0.5) * 0.5, oz: (Math.random() - 0.5) * 0.5, path: [], wait: Math.random() * 2, speed: 0.7 + Math.random() * 0.4, rot: 0, variant: i % 4, ph: Math.random() * 6, cd: 0 };
  }

  walkCells() {
    const out = [];
    for (const p of this.s.plots) {
      const [px, pz] = p.split(',').map(Number);
      for (let x = px * E.PLOT; x < (px + 1) * E.PLOT; x++) for (let z = pz * E.PLOT; z < (pz + 1) * E.PLOT; z++) if (this.cellFree(x, z)) out.push([x, z]);
    }
    return out;
  }

  pickTarget(p) {
    const s = this.s;
    let target;
    if (s.buildings.length && Math.random() < 0.6) {
      const b = s.buildings[Math.floor(Math.random() * s.buildings.length)];
      target = [b.x, b.z];
    } else {
      const cells = this.walkCells();
      target = cells[Math.floor(Math.random() * cells.length)];
    }
    if (!target) return;
    p.path = this.bfs([Math.round(p.x), Math.round(p.z)], target);
    if (!p.path.length) p.wait = 1;
  }

  bfs(from, to) {
    const N = E.GRID;
    const key = (x, z) => x * N + z;
    const prev = new Map();
    const q = [from];
    prev.set(key(...from), null);
    const tk = key(...to);
    while (q.length) {
      const [x, z] = q.shift();
      if (key(x, z) === tk) break;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const nz = z + dz;
        const k = key(nx, nz);
        if (prev.has(k)) continue;
        if (!(k === tk || this.cellFree(nx, nz))) continue;
        prev.set(k, [x, z]);
        q.push([nx, nz]);
      }
      if (prev.size > 700) break;
    }
    if (!prev.has(tk)) return [];
    const path = [];
    let cur = to;
    while (cur && key(...cur) !== key(...from)) {
      path.unshift(cur);
      cur = prev.get(key(...cur));
    }
    // к зданию подходим до соседней клетки
    if (path.length && !this.cellFree(to[0], to[1])) path.pop();
    return path;
  }

  tapPerson(p) {
    const s = this.s;
    if (p.cd > 0) return;
    p.cd = 25;
    p.wait = 1.2;
    p.path = [];
    s.stats.taps = (s.stats.taps || 0) + 1;
    const inc = this.rates ? this.rates.coins : 1;
    const pos = cellPos(p.x + p.ox, p.z + p.oz).add(new THREE.Vector3(0, 0.9, 0));
    if (Math.random() < 0.1) {
      s.crystals += 1;
      this.ui.floatAt(pos, `+1 <span class="ico">${this.ui.icon('crystals')}</span>`, 'cr');
    } else {
      const c = Math.max(5, Math.round(inc * 15));
      s.coins += c;
      this.ui.floatAt(pos, `+${fmt(c)} <span class="ico">${this.ui.icon('coins')}</span>`, 'coin');
    }
    audio.play('resident');
  }

  // ---------- Шар с сундуком ----------
  catchBalloon() {
    const s = this.s;
    this.world.balloon.popped = true;
    s.stats.balloons = (s.stats.balloons || 0) + 1;
    audio.play('balloon');
    const inc = this.rates ? this.rates.coins : 1;
    const reward = { coins: Math.max(50, Math.round(inc * (60 + Math.random() * 90))) };
    if (Math.random() < 0.25) reward.crystals = 2 + Math.floor(Math.random() * 3);
    this.ui.chestModal(reward);
  }

  give(reward, k = 1) {
    const s = this.s;
    for (const r in reward) s[r] = (s[r] || 0) + reward[r] * k;
    audio.play('coin');
  }

  // ---------- Уровень острова ----------
  checkLevel() {
    const s = this.s;
    const L = E.islandLevel(s);
    if (L > s.level) {
      const old = s.level;
      s.level = L;
      this.world.setGhostPlots(this.ghostPlots());
      const unlocked = [];
      for (const t of E.BUILD_ORDER) if (E.BUILDINGS[t].unlock > old && E.BUILDINGS[t].unlock <= L) unlocked.push({ kind: 'b', type: t });
      for (const t of E.DECOR_ORDER) if (E.DECOR[t].unlock > old && E.DECOR[t].unlock <= L) unlocked.push({ kind: 'd', type: t });
      const biomes = E.BIOME_ORDER.filter((b) => E.BIOMES[b].unlock > old && E.BIOMES[b].unlock <= L);
      const reward = { crystals: 3 + L };
      this.give(reward);
      audio.play('levelup');
      this.ui.levelModal(L, unlocked, biomes, reward);
      sdk.submitScore(Math.floor(s.best));
      this.save(true);
    }
  }

  afterLevelModal() {
    // полноэкранная реклама — редко, в естественной паузе
    if (this.s.level >= 3 && Date.now() - this.lastInter > 180000) {
      this.lastInter = Date.now();
      this.interstitial();
    }
  }

  // ---------- Офлайн ----------
  offline(sec) {
    const s = this.s;
    const cap = E.offlineHours(s) * 3600;
    const t = Math.min(sec, cap);
    const before = { coins: s.coins, wood: s.wood, stone: s.stone, crystals: s.crystals };
    // симулируем шагами по минуте, завершая стройки по пути
    const start = Date.now() - sec * 1000;
    let simT = 0;
    const tmp = JSON.parse(this.serialize());
    while (simT < t) {
      const dt = Math.min(60, t - simT);
      const now = start + simT * 1000;
      for (const b of tmp.buildings) if (b.build && b.build <= now) b.build = 0;
      E.tick(tmp, dt, {});
      simT += dt;
    }
    const gain = {};
    for (const r of ['coins', 'wood', 'stone', 'crystals']) gain[r] = Math.max(0, (tmp[r] - before[r]) * OFFLINE_EFF);
    this.completeBuilds(true);
    this.ui.offlineModal(t, gain);
  }

  // ---------- Ежедневное ----------
  checkDaily() {
    const s = this.s;
    const today = dayKey();
    if (!s.daily || s.daily.day !== today) {
      s.daily = makeDaily(s, this.rates ? this.rates.coins : E.rates(s).coins);
    }
    if (s.streak.last !== today) {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      s.streak.day = s.streak.last === dayKey(y) ? (s.streak.day % 7) + 1 : 1;
      s.streak.last = today;
      s.streak.claimed = false;
      if (!this.isNew) this.pendingStreak = true;
    }
    if (this.pendingStreak && !this.ui.modalOpen) {
      this.pendingStreak = false;
      this.ui.streakModal();
    }
  }

  streakReward(day) {
    const r = STREAK[day - 1];
    const inc = E.rates(this.s).coins;
    const out = {};
    if (r.coinsMin) out.coins = Math.max(100, Math.round(inc * 60 * r.coinsMin));
    if (r.crystals) out.crystals = r.crystals;
    return out;
  }

  claimGoal() {
    const s = this.s;
    const g = GOALS[s.goal];
    if (!g || goalProgress(s, g) < g.n) return;
    this.give(g.reward);
    this.ui.floatScreen(g.reward);
    s.goal++;
    this.save();
  }

  claimDaily(i) {
    const s = this.s;
    const tk = s.daily.tasks[i];
    if (tk.claimed || dailyProgress(s, tk) < tk.n) return;
    tk.claimed = true;
    this.give(tk.reward);
    this.ui.floatScreen(tk.reward);
    this.save();
  }

  // ---------- Переселение ----------
  migrate() {
    const s = this.s;
    if (E.featherGain(s) < 1) return;
    sdk.submitScore(Math.floor(s.best));
    this.s = E.migrate(s);
    this.s.level = 1;
    this.s.goal = GOALS.length; // обучение уже пройдено
    this.people = [];
    for (const k of [...this.world.objs.keys()]) this.world.removeObj(k);
    this.rebuildIsland();
    this.world.sync(this.s, Date.now());
    this.ctl.focus(0, 0);
    this.ui.closeModal();
    this.deselect();
    audio.play('plot');
    this.save(true);
    this.interstitial();
  }

  // ---------- Реклама ----------
  rewarded(onReward) {
    audio.suspend('ad');
    sdk.gameplay(false);
    sdk.showRewarded(null, (ok) => {
      audio.resume('ad');
      sdk.gameplay(true);
      if (ok) onReward();
      else this.ui.toast(tr('adFail'));
    });
  }
  interstitial() {
    audio.suspend('ad');
    sdk.gameplay(false);
    sdk.showInterstitial(() => {
      audio.resume('ad');
      sdk.gameplay(true);
    });
  }
}
