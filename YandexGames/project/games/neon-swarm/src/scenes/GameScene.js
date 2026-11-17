// Основная игровая сцена
import { WEAPONS, PASSIVES, ENEMIES, COLORS, OVERCHARGE, xpNeed, EVOLVE, MODES, threatMode, DAILY_MODE, RUSH_MODE, RUSH_BOSSES, CAMPAIGN, campaignMode, EVENT_MODE } from '../data.js';
import { activeEvent, eventRunEnd, SKINS } from '../events.js';
import { meta } from '../meta.js';
import { TS } from '../textures.js';
import { audio } from '../audio.js';
import { sdk } from '../sdk.js';
import { save } from '../save.js';
import { t as tr } from '../i18n.js';
import { fmtTime } from '../ui.js';
import { track } from '../analytics.js';

const Phaser = window.Phaser;
// доля кристаллов за убийства, время и боссов (награды за победу и звёзды считаются отдельно)
const CRYSTAL_RATE = 0.6;
// разгон начала: первые WARM_T секунд враги появляются чаще и быстрее подходят издалека, к концу эффект плавно сходит на нет
const WARM_T = 150;
const CELL = 64;
const MAX_R = 56;
const ADD = 1; // Phaser.BlendModes.ADD
const PCELL = 520; // размер клетки для колонн арены
const ZONE_R0 = 1100; // сужающаяся зона: радиус в начале цикла
const ZONE_R1 = 450; // и в конце

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.debug = window.__NS_DEBUG || null;
    this.t = 0;
    this.kills = 0;
    this.level = 1;
    this.xp = 0;
    this.need = xpNeed(1);
    this.bosses = 0;
    this.bossIdx = 0;
    this.nextBoss = 180;
    this.nextSwarm = 70;
    this.warnedBoss = false;
    this.warnedSwarm = false;
    this.boss = null;
    this.ended = false;
    this.dead = false;
    this.pendingLevels = 0;
    this.levelUpOpen = false;
    this.freeRevives = save.shopLvl('m_revive');
    this.adReviveUsed = false;
    this.rerolls = save.shopLvl('m_reroll');
    this.bonusCrystals = 0;
    this.pickupStreak = 0;
    this.pickupStreakT = 0;
    this.spawnAcc = 0;
    this.pauseReasons = new Set();

    // режим, герой, арена
    const run = this.registry.get('run') || { modeId: 'normal' };
    this.run = run;
    this.modeId = run.modeId;
    this.camp = run.modeId === 'campaign' ? CAMPAIGN[run.level || 0] : null;
    this.mode = run.modeId === 'campaign' ? campaignMode(run.level || 0) : run.modeId === 'quick' ? MODES.quick : run.modeId === 'calm' ? MODES.calm : run.modeId === 'threat' ? threatMode(run.threat || 1) : run.modeId === 'daily' ? DAILY_MODE : run.modeId === 'rush' ? RUSH_MODE : run.modeId === 'event' ? EVENT_MODE : MODES.normal;
    this.win = this.mode.win;
    this.hard = !!this.mode.threat;
    this.heroDef = meta.hero(run.hero);
    this.arenaDef = meta.arena(run.arena);
    this.arenaId = this.arenaDef.id;
    this.mut = run.mut || (this.camp && this.camp.mut) || null;
    if (this.mode.firstBoss) this.nextBoss = this.mode.firstBoss;
    this.registry.set('arenaDef', this.arenaDef);
    this.reduceFx = !!save.data.reduceFx;
    this.evo = {};
    this.chestsOpened = 0;
    this.chestAdUsed = false;
    this.stars = 0;
    this.rushKills = 0;
    this.metaT = 1;
    this.pzones = [];
    this.orbs2 = [];
    this.mills = [];
    this.pillars = new Map();
    this.pillarSpr = new Map();
    this.won = false;
    this.winGoals = null;
    // поля, которые раньше ставились «по ходу» и переживали перезапуск сцены
    this.giftChest = false;
    this.startChestDone = false;
    this.campIntro = false;
    this.result = null;
    this.winBonus = 0;
    this.openingDone = false;
    this.finale = false;
    this.finaleStrikeT = 0;
    this.xpTotal = 0;
    this.eliteLife = [];
    this.endless = false;
    this.oc = { oc_dmg: 0, oc_cd: 0, oc_hp: 0, oc_area: 0 };
    this.overcharge = 0;
    this.nextEvent = 450; // в «эффективном» времени te()
    this.evType = null;
    this.evLast = null;
    this.strikes = [];
    this.zones = [];
    this.tele = [];
    this.phaseShown = 0;
    this.dmgTaken = 0;
    // правила арен и новые враги
    this.walls = [];
    this.windLines = [];
    this.wind = { x: 0, y: 0 };
    this.shieldList = [];
    this.zone = this.arenaDef.rule === 'shrink' ? { x: 0, y: 0, r: ZONE_R0, t: 0 } : null;
    this.zoneWarnT = 0;
    this.zoneOut = false;
    this.wallHurtT = -9;
    this.easy = !!save.data.settings.easyMove;
    this.simple = !!save.data.settings.simpleHud;
    this.achLater = [];
    // праздник: в каждом забеге падают жетоны события
    this.evA = activeEvent();
    this.evTok = 0;

    this.weapons = { [this.heroDef.weapon]: 1 };
    this.wstate = {};
    this.passives = {};
    this.st = {};
    this.recalc();

    this.pools = {};
    this.enemies = [];
    this.bullets = [];
    this.ebullets = [];
    this.gems = [];
    this.items = [];
    this.missiles = [];
    this.orbs = [];
    this.bolts = [];
    this.beams = [];
    this.saws = [];
    this.drones = [];
    this.emitters = {};
    this.grid = new Map();
    this.gridArrs = [];

    // игрок
    const p = (this.p = { x: 0, y: 0, hp: this.st.maxHp, inv: 0, vx: 0, vy: 0 });
    p.glow = this.add.image(0, 0, 'glow').setTint(this.heroDef.color).setBlendMode(ADD).setAlpha(0.35).setScale(1.6).setDepth(3);
    p.spr = this.add.image(0, 0, 'player').setScale(1 / TS).setDepth(4);
    p.ring = this.add.image(0, 0, 'playerRing').setScale(1 / TS).setDepth(4).setBlendMode(ADD).setTint(this.heroDef.color);
    if (this.heroDef.id !== 'h_neon') p.spr.setTint(0xffffff, 0xffffff, this.heroDef.color, this.heroDef.color);
    // праздничный облик меняет кольцо вокруг ядра
    const sk = save.data.skin && save.data.skins && save.data.skins[save.data.skin] && SKINS[save.data.skin] ? save.data.skin : null;
    p.ringSpin = 2.5;
    if (sk) {
      p.ring.setTexture('ring_' + sk).clearTint();
      p.ringSpin = SKINS[sk].spin;
    }
    // тёмная арена: всё, кроме круга у фонаря, в темноте (пули врагов видны поверх)
    this.darkImg = this.arenaDef.rule === 'dark' ? this.add.image(0, 0, 'darkMask').setDepth(5.5) : null;
    this.magnetRing = this.add.image(0, 0, 'ring').setTint(COLORS.blue).setAlpha(0.035).setDepth(1).setBlendMode(ADD);

    this.fxGfx = this.add.graphics().setDepth(8).setBlendMode(ADD);
    this.hpGfx = this.add.graphics().setDepth(9);

    const cam = this.cameras.main;
    cam.startFollow(p.spr, false, 0.12, 0.12);
    this.applyZoom();

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,ESC,P');
    this.keys.ESC.on('down', () => this.openPause());
    this.keys.P.on('down', () => this.openPause());

    // события приложения
    this.onHidden = () => {
      if (!this.ended && !this.dead && !this.levelUpOpen) this.openPause();
    };
    this.onSdkPause = () => this.setPause('sdk', true);
    this.onSdkResume = () => this.setPause('sdk', false);
    this.game.events.on('app-hidden', this.onHidden);
    this.game.events.on('sdk-pause', this.onSdkPause);
    this.game.events.on('sdk-resume', this.onSdkResume);
    this.scale.on('resize', this.applyZoom, this);
    this.events.once('shutdown', () => {
      this.game.events.off('app-hidden', this.onHidden);
      this.game.events.off('sdk-pause', this.onSdkPause);
      this.game.events.off('sdk-resume', this.onSdkResume);
      this.scale.off('resize', this.applyZoom, this);
      sdk.gameplay(false);
    });

    this.scene.launch('Hud', { game: this });
    this.hud = this.scene.get('Hud');
    audio.setMood('game');
    audio.setIntensity(1);
    sdk.gameplay(true);
    if (!save.data.runs) track('first_run');
    track('run_start', { mode: this.modeId, level: this.camp ? this.mode.level + 1 : undefined });
    save.data.runs++;
    if (this.mut === 'mu_bosses') this.nextBoss = 90;
    if (this.arenaDef.earlyStrikes) this.nextEvent = 240;
    if (this.mode.rush) {
      // бой с боссами: босс за боссом, без роёв и событий; стартовая сила вместо долгой прокачки
      this.nextBoss = 4;
      this.nextSwarm = 1e9;
      this.nextEvent = 1e9;
      for (let i = 0; i < 16; i++) {
        const opts = this.buildOptions();
        // до трёх видов оружия, дальше качаем уже взятое
        const few = Object.keys(this.weapons).length < 3;
        this.applyUpgrade(opts.find((o) => o.kind === 'w' && (few || o.lvl > 1)) || opts.find((o) => o.kind !== 'w') || opts[0]);
        this.level++;
      }
      this.need = xpNeed(this.level);
      this.p.hp = this.st.maxHp;
    }
  }

  shake(d, k) {
    if (!this.reduceFx) this.cameras.main.shake(d, k);
  }
  flashCam(d, r, g, b) {
    if (!this.reduceFx) this.cameras.main.flash(d, r, g, b);
  }

  applyZoom() {
    const { width, height } = this.scale;
    const z = Math.sqrt(width * height) / 830;
    this.cameras.main.setZoom(Math.max(0.35, Math.min(3, z)));
  }

  // ---------- Пауза ----------
  setPause(reason, on) {
    if (on) this.pauseReasons.add(reason);
    else this.pauseReasons.delete(reason);
    const paused = this.pauseReasons.size > 0;
    if (paused && !this.scene.isPaused()) this.scene.pause();
    if (!paused && this.scene.isPaused()) this.scene.resume();
    sdk.gameplay(!paused && !this.ended);
  }

  openPause() {
    // поверх окна сундука, победы или воскрешения меню паузы не открываем: иначе «Продолжить» закрыло бы
    // то окно, а его причина паузы осталась бы, и игра зависла бы без кнопок
    if (this.ended || this.dead || this.levelUpOpen || ['menu', 'chest', 'win', 'dead', 'levelup'].some((r) => this.pauseReasons.has(r))) return;
    this.setPause('menu', true);
    this.hud.showPause();
  }
  closePause() {
    this.setPause('menu', false);
  }

  // ---------- Характеристики ----------
  recalc() {
    const P = this.passives;
    const sh = (id) => save.shopLvl(id);
    const st = this.st;
    const oldMax = st.maxHp;
    st.maxHp = Math.round((100 + 20 * (P.vitality || 0)) * (1 + 0.08 * sh('m_hp')));
    st.regen = 0.5 * (P.regen || 0);
    st.speed = 215 * (1 + 0.08 * (P.swift || 0)) * (1 + 0.04 * sh('m_speed'));
    st.magnet = 110 * (1 + 0.35 * (P.magnet || 0)) * (1 + 0.12 * sh('m_magnet'));
    st.dmg = (1 + 0.1 * (P.power || 0)) * (1 + 0.05 * sh('m_dmg'));
    st.cd = Math.pow(0.93, P.haste || 0) * Math.pow(0.97, sh('m_cd'));
    st.area = 1 + 0.12 * (P.area || 0);
    st.armor = 1 - Math.min(0.6, 0.06 * (P.armor || 0) + 0.03 * sh('m_armor'));
    st.xp = (1 + 0.1 * (P.wisdom || 0)) * (1 + 0.06 * sh('m_xp'));
    st.multi = P.multishot || 0;
    st.crit = 0.06 * (P.crit || 0);
    st.pierce = P.pierce || 0;
    st.gold = 1 + 0.1 * sh('m_gold');
    // сверхзаряд (бесконечные улучшения поздней игры)
    const oc = this.oc || {};
    st.maxHp = Math.round(st.maxHp * (1 + 0.08 * (oc.oc_hp || 0)));
    st.dmg *= 1 + 0.06 * (oc.oc_dmg || 0);
    st.cd = Math.max(st.cd * 0.6, st.cd * Math.pow(0.97, oc.oc_cd || 0));
    st.area = Math.min(st.area + 0.5, st.area * (1 + 0.04 * (oc.oc_area || 0)));
    // бонусы героя и правила испытания дня
    const hm = (this.heroDef && this.heroDef.mod) || {};
    st.maxHp = Math.round(st.maxHp * (1 + (hm.hp || 0)));
    st.armor = Math.max(0.35, st.armor - (hm.armor || 0));
    st.area *= 1 + (hm.area || 0);
    st.cd *= 1 - (hm.cd || 0);
    st.magnet *= 1 + (hm.magnet || 0);
    st.xp *= 1 + (hm.xp || 0);
    st.dmg *= 1 + (hm.dmg || 0);
    st.regen += hm.regen || 0;
    st.speed *= 1 + (hm.speed || 0);
    if (this.mut === 'mu_glass') {
      st.dmg *= 1.5;
      st.maxHp = Math.round(st.maxHp * 0.6);
    }
    if (this.mut === 'mu_magnet') st.magnet *= 3;
    if (this.mut === 'mu_fast') st.xp *= 1.25;
    if (this.evo && this.evo.drone) st.magnet *= 1.5;
    if (this.p && oldMax && st.maxHp > oldMax) this.p.hp += st.maxHp - oldMax;
  }

  // ---------- Пулы спрайтов ----------
  img(key, depth = 3, blend = 0) {
    const pool = this.pools[key] || (this.pools[key] = []);
    let s = pool.pop();
    if (!s) {
      s = this.add.image(0, 0, key);
    }
    s.setActive(true).setVisible(true).setDepth(depth).setScale(1 / TS).setAlpha(1).setRotation(0).clearTint();
    s.setBlendMode(blend);
    return s;
  }
  free(s) {
    s.setActive(false).setVisible(false);
    (this.pools[s.texture.key] || (this.pools[s.texture.key] = [])).push(s);
  }

  emitter(color) {
    let em = this.emitters[color];
    if (!em) {
      em = this.add.particles(0, 0, 'spark', {
        lifespan: { min: 220, max: 520 },
        speed: { min: 60, max: 280 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: color,
        blendMode: 'ADD',
        emitting: false,
      });
      em.setDepth(7);
      this.emitters[color] = em;
    }
    return em;
  }
  burst(x, y, color, n) {
    const load = this.enemies.length > 180 ? 0.5 : 1;
    this.emitter(color).explode(Math.max(1, Math.round(n * load)), x, y);
  }

  // ---------- Сетка для коллизий ----------
  buildGrid() {
    const g = this.grid;
    for (const arr of g.values()) {
      arr.length = 0;
      this.gridArrs.push(arr);
    }
    g.clear();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const k = (((e.x / CELL) | 0) & 0xffff) * 65536 + (((e.y / CELL) | 0) & 0xffff);
      let a = g.get(k);
      if (!a) {
        a = this.gridArrs.pop() || [];
        g.set(k, a);
      }
      a.push(e);
    }
  }

  query(x, y, r, fn) {
    const x0 = ((x - r - MAX_R) / CELL) | 0;
    const x1 = ((x + r + MAX_R) / CELL) | 0;
    const y0 = ((y - r - MAX_R) / CELL) | 0;
    const y1 = ((y + r + MAX_R) / CELL) | 0;
    for (let cx = x0 - 1; cx <= x1; cx++) {
      for (let cy = y0 - 1; cy <= y1; cy++) {
        const a = this.grid.get((cx & 0xffff) * 65536 + (cy & 0xffff));
        if (!a) continue;
        for (let i = 0; i < a.length; i++) {
          const e = a[i];
          if (!e.alive) continue;
          const dx = e.x - x;
          const dy = e.y - y;
          const rr = r + e.r;
          if (dx * dx + dy * dy < rr * rr) {
            if (fn(e)) return;
          }
        }
      }
    }
  }

  nearest(x, y, maxD) {
    let best = null;
    let bd = maxD * maxD;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  // точка сразу за краем видимой области: враги появляются у края экрана, а не далеко за ним
  edgePoint(margin = 40) {
    const v = this.cameras.main.worldView;
    if (!v.width) {
      const a = Math.random() * Math.PI * 2;
      return [this.p.x + Math.cos(a) * 500, this.p.y + Math.sin(a) * 500];
    }
    const x0 = v.x - margin;
    const y0 = v.y - margin;
    const w = v.width + 2 * margin;
    const h = v.height + 2 * margin;
    let r = Math.random() * 2 * (w + h);
    if (r < w) return [x0 + r, y0];
    r -= w;
    if (r < h) return [x0 + w, y0 + r];
    r -= h;
    if (r < w) return [x0 + w - r, y0 + h];
    r -= w;
    return [x0, y0 + h - r];
  }

  viewRadius() {
    const v = this.cameras.main.worldView;
    return Math.sqrt(v.width * v.width + v.height * v.height) / 2;
  }

  // ---------- Враги ----------
  // «Эффективное» время сложности: в хардкоре угроза растёт быстрее и стартует выше
  te() {
    // в бою с боссами сила врагов растёт с каждым побеждённым боссом, а не со временем
    if (this.mode.rush) return this.mode.teAdd + this.rushKills * 100 + this.t * 0.15;
    return this.t * this.mode.teMul + this.mode.teAdd;
  }

  // фаза забега для HUD и объявлений: 0 — до 10 мин, 1 — овердрайв, 2 — критическая, 3 — бесконечность
  threat() {
    const W = this.win || 1800;
    if (this.mode.rush) return this.rushKills >= 6 ? 2 : this.rushKills >= 3 ? 1 : 0;
    return this.t >= W ? 3 : this.t >= W * (2 / 3) ? 2 : this.t >= W / 3 ? 1 : 0;
  }

  // После 10 минут здоровье врагов растёт медленнее — сложность держится на количестве и новых угрозах
  // К 10-й минуте игрок обычно прокачан полностью, поэтому дальше враги крепнут быстрее,
  // а сложность создают плотность толпы, элита и события — экран заполняется, а не пустеет
  hpMul(boss = false) {
    const m = this.te() / 60;
    let h;
    if (m <= 10) h = 1 + m * 0.22 + m * m * 0.035;
    else if (boss) h = 6.7 + (m - 10) * 0.9;
    else h = 6.7 * Math.pow(1.14, Math.min(10, m - 10)) * Math.pow(1.19, Math.max(0, m - 20)); // мягче в 10–20 мин, круче к финалу
    if (this.win && this.t > this.win) h *= Math.pow(1.06, (this.t - this.win) / 60);
    return h * this.mode.hp * (this.mut === 'mu_swarm' ? 0.7 : 1);
  }

  // 1 в начале забега, к WARM_T секундам плавно падает до 0. В бое с боссами не нужен: там сразу идёт поток врагов
  warm() {
    return this.mode.rush ? 0 : Math.max(0, 1 - this.t / WARM_T);
  }

  dmgMul() {
    let d = 1 + this.te() / 650 + Math.max(0, this.te() - 1200) / 400;
    if (this.win && this.t > this.win) d *= Math.pow(1.05, (this.t - this.win) / 60);
    return d * this.mode.dmg;
  }

  pickType() {
    const m = this.te() / 60;
    const w = [
      ['drone', 10],
      ['dart', m > 0.75 ? 3 + m : 0],
      ['brute', m > 1.5 ? 1.5 + m * 0.5 : 0],
      ['shooter', m > 2.5 ? 1.2 + Math.min(m, 16) * 0.3 : 0],
      ['splitter', m > 3.5 ? 1.5 + m * 0.2 : 0],
      ['lancer', m > 6 ? 1.5 + (m - 6) * 0.3 : 0],
      ['bomber', m > 9 ? 1.2 + (m - 9) * 0.25 : 0],
      ['sniper', m > 13 ? 1 + (m - 13) * 0.12 : 0],
      ['spinner', m > 5 ? 1.2 + (m - 5) * 0.15 : 0],
      ['gunner', m > 8 ? 1.1 + (m - 8) * 0.14 : 0],
      ['burster', m > 11 ? 1 + (m - 11) * 0.12 : 0],
      ['shieldman', m > 4 ? 0.8 + (m - 4) * 0.12 : 0],
      ['medic', m > 5.5 ? 0.7 + (m - 5.5) * 0.1 : 0],
    ];
    let sum = 0;
    for (const [, v] of w) sum += v;
    let r = Math.random() * sum;
    for (const [k, v] of w) {
      r -= v;
      if (r <= 0) return k;
    }
    return 'drone';
  }

  spawnEnemy(type, x, y, hpScale = 1, elite = null) {
    const d = ENEMIES[type];
    if (x === undefined) [x, y] = this.edgePoint(40 + Math.random() * 50);
    const T = this.te();
    const m = T / 60;
    // элитные враги: крупнее, крепче, быстрее, с аурой; появляются после 10-й минуты
    if (elite === null) elite = !d.boss && m > 10 && Math.random() < Math.min(0.3, 0.04 + (m - 10) * 0.013);
    const fin = this.finale ? (this.mode === MODES.calm || this.mode === MODES.quick ? 1.2 : 1.5) : 1;
    const hp = d.hp * this.hpMul(!!d.boss) * hpScale * (elite ? 4 : 1) * fin;
    const e = {
      type,
      x,
      y,
      hp,
      maxHp: hp,
      r: d.r * (elite ? 1.35 : 1),
      speed: d.speed * (0.9 + Math.random() * 0.2) * (1 + Math.min(0.35, T / 1200)) * (elite ? 1.12 : 1) * (this.mut === 'mu_fast' && !d.boss ? 1.25 : 1),
      dmg: d.dmg * this.dmgMul() * (elite ? 1.4 : 1),
      xp: d.xp * (elite ? 5 : 1),
      elite,
      color: d.color,
      kx: 0,
      ky: 0,
      flash: 0,
      orbT: -9,
      alive: true,
      boss: !!d.boss,
      born: this.t,
      shootT: 1.5 + Math.random() * 2,
      rot: (Math.random() - 0.5) * 3,
      spr: this.img('e_' + type, d.boss ? 4 : 3),
    };
    e.spr.setPosition(x, y);
    if (elite) {
      e.spr.setScale(1.35 / TS);
      e.aura = this.img('glow', 2, ADD).setTint(d.color).setAlpha(0.6).setScale((e.r * 3.4) / 128);
      e.aura.setPosition(x, y);
    }
    if (type === 'lancer') {
      e.rot = 0;
      e.ls = 'walk';
      e.lt = 0.8 + Math.random() * 1.5;
    } else if (type === 'bomber') {
      e.fuse = -1;
    } else if (type === 'serpent') {
      // хвост из сегментов: они повторяют путь головы
      e.heading = Math.atan2(this.p.y - y, this.p.x - x);
      e.trail = [];
      e.segs = [];
      for (let i = 0; i < 12; i++) e.segs.push(this.img('e_seg', 3).setPosition(x, y));
      e.rot = 0;
    } else if (type === 'mirror') {
      e.ms = 'idle';
      e.mt = 3;
      e.cycle = 0;
      e.rot = 0.4;
    } else if (type === 'shieldman' || type === 'medic') {
      // держатся ровно, чтобы щит и сердце было легко узнать
      e.rot = 0;
      e.shootT = 2 + Math.random();
      // при первой встрече подсказываем, чем опасен новый враг
      const tips = (save.data.tips = save.data.tips || {});
      if (!tips[type] && this.hud) {
        tips[type] = true;
        this.hud.warn(tr('tip_' + type), d.color);
      }
    } else if (type === 'warden') {
      e.rot = 0.3;
      e.cageN = 0;
    }
    this.enemies.push(e);
    return e;
  }

  // убрать врага без награды (взрыв камикадзе)
  removeEnemy(e) {
    e.alive = false;
    this.free(e.spr);
    this.freeSegs(e);
    if (e.aura) this.free(e.aura);
    e.aura = null;
  }

  freeSegs(e) {
    if (!e.segs) return;
    for (const sg of e.segs) this.free(sg);
    e.segs = null;
  }

  spawnBoss(forceType) {
    const a = Math.random() * Math.PI * 2;
    const R = this.viewRadius() + 40;
    const bx = this.p.x + Math.cos(a) * R;
    const by = this.p.y + Math.sin(a) * R;
    const order = this.arenaDef.order;
    const kind = forceType || order[this.bossIdx % order.length];
    const e = this.spawnEnemy(kind, bx, by, (1 + this.bossIdx * 0.2) * (this.mode.rush ? 0.55 : 1), false);
    // после 20-й минуты босс приходит с элитной свитой
    if (this.te() >= 1200) {
      const n = 3 + Math.min(5, Math.floor((this.te() - 1200) / 240));
      const kinds = ['brute', 'lancer', 'splitter', 'shooter'];
      for (let i = 0; i < n; i++) {
        const b = (i / n) * Math.PI * 2;
        this.spawnEnemy(kinds[i % kinds.length], bx + Math.cos(b) * 90, by + Math.sin(b) * 90, 1, true);
      }
    }
    e.bt = 3;
    e.state = 'chase';
    e.st2 = 6;
    e.spin = 0;
    this.bossIdx++;
    this.boss = e;
    audio.play('boss');
    audio.setMood('boss');
    this.shake(400, 0.006);
  }

  spawnSwarm() {
    const n = Math.min(44, 22 + Math.floor(this.t / 12));
    const R = this.viewRadius() + 30;
    const type = this.t > 300 ? 'dart' : 'drone';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.spawnEnemy(type, this.p.x + Math.cos(a) * R, this.p.y + Math.sin(a) * R, 0.8, false);
    }
  }

  // ---------- События поздней игры ----------
  pickEvent() {
    const m = this.te() / 60;
    const list = ['strike', 'lancers', 'elites', 'bombers'];
    if (m > 13) list.push('snipers', 'strike');
    if (m > 20) list.push('strike', 'elites');
    let ev;
    do ev = list[(Math.random() * list.length) | 0];
    while (ev === this.evLast && list.length > 1);
    this.evLast = ev;
    return ev;
  }

  runEvent(ev) {
    const m = this.te() / 60;
    const p = this.p;
    const R = this.viewRadius() + 30;
    const around = (n, type, elite, r = R) => {
      const off = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * Math.PI * 2;
        this.spawnEnemy(type, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1, elite);
      }
    };
    if (ev === 'strike') {
      // несколько залпов орбитального удара, каждый целится туда, где игрок сейчас
      const volleys = Math.min(5, 1 + Math.floor(Math.max(0, m - 7) / 6));
      for (let i = 0; i < volleys; i++) this.strikes.push(this.t + i * 1.1);
    } else if (ev === 'lancers') {
      // клин таранов с одной стороны
      const n = Math.min(18, 6 + Math.floor(m / 3));
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / (n - 1) - 0.5) * 1.3;
        const e = this.spawnEnemy('lancer', p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, 1, i % 4 === 0 && m > 12);
        e.lt = 0.4 + Math.random() * 0.5;
      }
    } else if (ev === 'elites') {
      const n = Math.min(14, 3 + Math.floor(m / 4));
      const kinds = ['brute', 'splitter', 'shooter', 'dart', 'lancer'];
      const off = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * Math.PI * 2;
        const e = this.spawnEnemy(kinds[i % kinds.length], p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, 1, true);
        // вожак отряда несёт сундук
        if (i === 0) {
          e.chest = true;
          e.aura.setTint(COLORS.yellow).setAlpha(0.9);
        }
      }
    } else if (ev === 'bombers') {
      around(Math.min(30, 10 + Math.floor(m / 2)), 'bomber', false);
    } else if (ev === 'snipers') {
      around(Math.min(14, 4 + Math.floor(m / 5)), 'sniper', m > 18);
    }
  }

  strikeVolley() {
    const p = this.p;
    const m = this.te() / 60;
    const n = Math.min(14, 4 + Math.floor(m / 4));
    const T = 1.35;
    // одна зона точно под игроком (с упреждением), остальные — вокруг
    this.zones.push({ x: p.x + p.vx * 0.5, y: p.y + p.vy * 0.5, r: 100, t: T, T });
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 120 + Math.random() * 360;
      this.zones.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: 80 + Math.random() * 40, t: T + Math.random() * 0.3, T: T + 0.3 });
    }
    audio.play('warn');
  }

  updateZones(dt) {
    while (this.strikes.length && this.t >= this.strikes[0]) {
      this.strikes.shift();
      this.strikeVolley();
    }
    if (!this.zones.length) return;
    const p = this.p;
    let boom = 0;
    for (const z of this.zones) {
      z.t -= dt;
      if (z.t > 0) continue;
      boom++;
      // взрыв: бьёт и игрока, и врагов
      this.ringFx(z.x, z.y, z.r, COLORS.red, 0.4);
      this.burst(z.x, z.y, COLORS.orange, 14);
      const dx = p.x - z.x;
      const dy = p.y - z.y;
      const zm = this.te() / 60;
      if (dx * dx + dy * dy < (z.r + 10) * (z.r + 10)) this.hurt(this.st.maxHp * Math.min(0.6, 0.25 + 0.008 * Math.max(0, zm - 8)) * Math.max(0.6, this.mode.dmg), true);
      const dmg = 120 * this.hpMul();
      this.query(z.x, z.y, z.r, (e) => {
        if (!e.boss) this.damage(e, e.elite ? dmg * 0.5 : dmg);
      });
    }
    if (boom) {
      this.zones = this.zones.filter((z) => z.t > 0);
      audio.play('nova');
      this.shake(120, 0.004);
    }
  }

  explodeBomber(e) {
    const R = 115;
    this.ringFx(e.x, e.y, R, e.color, 0.35);
    this.burst(e.x, e.y, e.color, 22);
    audio.play('explode');
    const dx = this.p.x - e.x;
    const dy = this.p.y - e.y;
    if (dx * dx + dy * dy < (R + 13) * (R + 13)) this.hurt(e.dmg * 2.5);
    this.removeEnemy(e);
  }

  // последняя минута перед 30:00: двойной поток, крепче враги, два босса, частые удары
  updateFinale(dt) {
    if (!this.win || this.mode.noFinale) return;
    const start = this.win - 60;
    if (this.t < start || this.t >= this.win) {
      this.finale = false;
      return;
    }
    if (!this.finale) {
      this.finale = true;
      this.finaleStrikeT = 2;
      this.hud.warn(tr('finalWarn'), COLORS.red);
      audio.play('boss');
      this.shake(600, 0.01);
      // в спокойном режиме и испытании дня в финале один босс
      this.spawnBoss('pulsar');
      const b1 = this.boss;
      if (this.win >= 1800) this.spawnBoss('hive');
      this.boss = this.boss || b1;
    }
    this.finaleStrikeT -= dt;
    if (this.finaleStrikeT <= 0) {
      this.finaleStrikeT = this.win >= 1800 ? 4.5 : 7;
      this.strikes.push(this.t, this.t + 0.9);
    }
  }

  // объявления фаз и победа на 30:00
  updatePhases() {
    const ph = this.threat();
    if (ph > this.phaseShown) {
      this.phaseShown = ph;
      if (ph === 1) {
        this.hud.warn(tr('phase1'), COLORS.pink);
        audio.play('warn');
      } else if (ph === 2) {
        this.hud.warn(tr('phase2'), COLORS.red);
        audio.play('warn');
        this.shake(500, 0.008);
      }
    }
    // вехи забега: звёзды на 5/10/15… минуте
    const S = this.mode.stars;
    while (this.stars < S.length && this.t >= S[this.stars]) {
      this.stars++;
      const bonus = Math.round(10 * this.stars * this.mode.reward);
      this.bonusCrystals += bonus;
      if (this.stars < S.length || !this.win) this.hud.milestone(this.stars, S.length, bonus);
    }
    if (!this.won && this.win && this.t >= this.win) this.winRun();
    if (!this.won && this.mode.rush && this.rushKills >= RUSH_BOSSES) this.winRun();
  }

  // текущее значение цели кампании
  goalValue(type) {
    if (type === 'kills') return this.kills;
    if (type === 'bosses') return this.bosses;
    if (type === 'level') return this.level;
    if (type === 'chests') return this.chestsOpened;
    if (type === 'evo') return Object.keys(this.evo).length;
    if (type === 'hp') return Math.round((100 * Math.max(0, this.p.hp)) / this.st.maxHp);
    return 0;
  }

  winRun() {
    if (!save.data.stats.wins) track('first_win', { mode: this.modeId });
    track('win', { mode: this.modeId });
    this.won = true;
    meta.live(this);
    this.winBonus = Math.round(150 * this.mode.reward);
    // первая победа в испытании дня — отдельная награда
    if (this.mode.daily && !save.data.dailyRun.won) this.winBonus += 100;
    this.bonusCrystals += this.winBonus;
    if (this.modeId === 'normal') save.data.hardUnlocked = true;
    // цепочка режимов: победа в быстром открывает спокойный, в спокойном — обычный (выбор переключается сам)
    if (this.modeId === 'quick' && save.data.sel.diff === 'quick') save.data.sel.diff = 'calm';
    if (this.modeId === 'calm' && save.data.sel.diff === 'calm') save.data.sel.diff = 'normal';
    if (this.mode.threat) save.data.threatWon = Math.max(save.data.threatWon || 0, this.mode.threat);
    save.write();
    for (const b of this.ebullets) b.life = 0;
    this.zones = [];
    this.strikes = [];
    this.ringFx(this.p.x, this.p.y, 600, COLORS.cyan, 0.8);
    this.flashCam(400, 80, 255, 255);
    audio.play('levelup');
    if (this.debug && this.debug.autoEnd) {
      this.endless = true;
      return;
    }
    // звёзды уровня кампании считаются в момент победы: дальше можно играть бесконечно, их это не испортит
    if (this.camp) this.winGoals = this.camp.goals.map(([type]) => this.goalValue(type));
    // после победы в любом режиме можно завершить забег или играть дальше без конца
    this.setPause('win', true);
    this.hud.showWin();
  }

  continueEndless() {
    this.endless = true;
    this.p.inv = 2;
    this.setPause('win', false);
    this.hud.warn(tr('endlessWarn'), COLORS.purple);
    audio.play('boss');
  }

  damage(e, dmg, kx = 0, ky = 0) {
    if (!e.alive) return;
    // рядом со щитоносцем враги получают вдвое меньше урона
    if (e.shT > this.t) dmg *= 0.5;
    // критический удар: двойной урон и золотая вспышка
    if (this.st.crit && Math.random() < this.st.crit) {
      dmg *= 2;
      this.burst(e.x, e.y, COLORS.yellow, 4);
    }
    e.hp -= dmg;
    e.flash = 0.07;
    e.spr.setTintFill(0xffffff);
    if (!e.boss) {
      const kb = e.type === 'brute' ? 0.4 : 1;
      e.kx += kx * kb;
      e.ky += ky * kb;
    }
    audio.play('hit');
    if (e.hp <= 0) this.kill(e);
  }

  kill(e) {
    e.alive = false;
    this.free(e.spr);
    this.freeSegs(e);
    if (e.aura) {
      this.free(e.aura);
      e.aura = null;
    }
    this.kills++;
    this.burst(e.x, e.y, e.color, e.boss ? 60 : 9);
    audio.play(e.boss ? 'explode' : 'kill');
    // опыт
    if (e.xp >= 20) this.dropGem(e.x, e.y, e.xp, 'gem3');
    else if (e.xp >= 5) this.dropGem(e.x, e.y, e.xp, 'gem2');
    else this.dropGem(e.x, e.y, e.xp, 'gem1');
    if (e.type === 'splitter') {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const c = this.spawnEnemy('dart', e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 18, 0.7, false);
        c.kx = Math.cos(a) * 200;
        c.ky = Math.sin(a) * 200;
      }
    }
    if (e.chest) this.spawnItem('chest', e.x, e.y);
    // праздничные жетоны: с боссов пачкой, с элиты часто, с обычных врагов изредка; на праздничной арене вдвое чаще
    if (this.evA) {
      const k = this.arenaId === this.evA.ev.arena ? 2 : 1;
      if (e.boss) for (let i = 0; i < 5 * k; i++) this.spawnItem('token', e.x + (Math.random() - 0.5) * 90, e.y + (Math.random() - 0.5) * 90, this.evA.ev.token);
      else if (Math.random() < (e.elite ? 0.2 : 0.01) * k) this.spawnItem('token', e.x, e.y, this.evA.ev.token);
    }
    if (e.type === 'warden') for (const w of this.walls) w.life = Math.min(w.life, 0.3);
    if (e.boss) {
      this.bosses++;
      this.vib('medium');
      meta.onBoss(e.type);
      if (this.mode.rush) {
        this.rushKills++;
        this.nextBoss = this.t + 5;
      }
      if (this.boss === e) this.boss = this.enemies.find((o) => o.alive && o.boss && o !== e) || null;
      audio.setMood('game');
      this.shake(500, 0.012);
      this.flashCam(200, 255, 80, 120);
      this.spawnItem('chest', e.x, e.y);
      for (let i = 0; i < 8; i++) this.dropGem(e.x + (Math.random() - 0.5) * 80, e.y + (Math.random() - 0.5) * 80, 5, 'gem2');
    } else if (e.elite) {
      this.burst(e.x, e.y, 0xffffff, 12);
      (this.eliteLife || (this.eliteLife = [])).push(this.t - e.born);
      const r = Math.random();
      if (r < 0.06) this.spawnItem('heal', e.x, e.y);
      else if (r < 0.09) this.spawnItem('magnetItem', e.x, e.y);
    } else {
      const r = Math.random();
      if (r < 0.004) this.spawnItem('heal', e.x, e.y);
      else if (r < 0.0065) this.spawnItem('magnetItem', e.x, e.y);
    }
  }

  // ---------- Опыт и предметы ----------
  dropGem(x, y, v, key) {
    if (this.gems.length > 320) {
      // объединяем с существующим кристаллом, чтобы не плодить объекты
      const g = this.gems[(Math.random() * this.gems.length) | 0];
      g.v += v;
      if (g.v >= 20 && g.spr.texture.key !== 'gem3') {
        this.free(g.spr);
        g.spr = this.img('gem3', 1);
        g.spr.setPosition(g.x, g.y);
      }
      return;
    }
    const spr = this.img(key, 1);
    spr.setPosition(x, y);
    this.gems.push({ x, y, v, spr, pull: false, sp: 0 });
  }

  spawnItem(type, x, y, key = type) {
    const spr = this.img(key, 2);
    spr.setPosition(x, y);
    this.items.push({ type, x, y, spr, t: 0 });
  }

  collectItem(it) {
    const p = this.p;
    if (it.type === 'heal') {
      p.hp = Math.min(this.st.maxHp, p.hp + this.st.maxHp * 0.3);
      this.burst(p.x, p.y, COLORS.green, 20);
      audio.play('levelup');
      this.hud.floatText('+HP', COLORS.green);
    } else if (it.type === 'magnetItem') {
      for (const g of this.gems) g.pull = true;
      audio.play('chest');
      this.burst(p.x, p.y, COLORS.blue, 20);
    } else if (it.type === 'token') {
      this.evTok++;
      audio.play('pickup', 8);
      this.burst(p.x, p.y, this.evA ? this.evA.ev.color : COLORS.yellow, 8);
    } else if (it.type === 'chest') {
      this.vib('medium');
      this.bonusCrystals += 30;
      audio.play('chest');
      this.burst(p.x, p.y, COLORS.yellow, 40);
      p.hp = Math.min(this.st.maxHp, p.hp + this.st.maxHp * 0.25);
      this.openChest();
    }
  }

  // ---------- Сундук: эволюция или 1/3/5 улучшений ----------
  evoReady() {
    return Object.keys(this.weapons).filter((w) => this.weapons[w] >= WEAPONS[w].max && !this.evo[w] && this.passives[EVOLVE[w].pass]);
  }

  openChest(again = false) {
    if (!again) {
      this.chestsOpened++;
      meta.onChest();
    }
    const res = { items: [], evo: null, crystals: 30 };
    // за первый сундук 30 кристаллов начисляются при подборе, за повторный (за рекламу) — здесь
    if (again) this.bonusCrystals += res.crystals;
    const ready = this.evoReady();
    if (ready.length) {
      const w = ready[(Math.random() * ready.length) | 0];
      this.evolve(w);
      res.evo = w;
    } else {
      const r = Math.random();
      const n = r < 0.6 ? 1 : r < 0.9 ? 3 : 5;
      for (let i = 0; i < n; i++) {
        const opts = this.buildOptions();
        // в сундуке оружие и пассивки важнее лечения
        const o = opts.find((x) => x.kind === 'w' || x.kind === 'p') || opts[0];
        this.applyUpgrade(o);
        res.items.push(o);
      }
    }
    if (this.debug && this.debug.autoPick) return res;
    this.setPause('chest', true);
    this.hud.showChest(res, () => this.setPause('chest', false));
    return res;
  }

  evolve(w) {
    this.evo[w] = true;
    meta.onEvolve(w);
    this.recalc();
    this.ringFx(this.p.x, this.p.y, 520, EVOLVE[w].color, 0.7);
    this.flashCam(300, 255, 230, 120);
    audio.play('boss');
  }

  // ---------- Повышение уровня ----------
  buildOptions() {
    const pool = [];
    const ownedW = Object.keys(this.weapons).length;
    for (const [id, w] of Object.entries(WEAPONS)) {
      const lvl = this.weapons[id] || 0;
      // новых видов оружия больше, а без лимита слотов их стало бы слишком много: максимум 6 одновременно
      if (!lvl && ownedW >= 6) continue;
      const wt = id === 'blaster' ? 2.2 : lvl ? 1.3 : ownedW < 3 ? 2.2 : 1;
      if (lvl < w.max) pool.push({ kind: 'w', id, lvl: lvl + 1, color: w.color, weight: wt });
    }
    for (const [id, pdef] of Object.entries(PASSIVES)) {
      const lvl = this.passives[id] || 0;
      if (lvl < pdef.max) pool.push({ kind: 'p', id, lvl: lvl + 1, color: pdef.color, weight: id === 'multishot' ? 1.6 : lvl ? 1 : 0.8 });
    }
    const out = [];
    while (out.length < 3 && pool.length) {
      let sum = pool.reduce((a, o) => a + o.weight, 0);
      let r = Math.random() * sum;
      let idx = 0;
      for (; idx < pool.length; idx++) {
        r -= pool[idx].weight;
        if (r <= 0) break;
      }
      out.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
    }
    // всё прокачано — предлагаем сверхзаряд (бесконечный рост силы) и лечение
    if (out.length < 3) {
      const ids = Object.keys(OVERCHARGE).sort(() => Math.random() - 0.5);
      const need = pool.length || out.length ? 3 - out.length : 2;
      for (let i = 0; i < need; i++) {
        const id = ids[i];
        out.push({ kind: 'oc', id, lvl: this.oc[id] + 1, color: OVERCHARGE[id].color });
      }
    }
    if (out.length < 3) out.push({ kind: 'heal', id: 'heal', color: COLORS.green });
    return out;
  }

  tryLevelUp() {
    if (this.levelUpOpen || this.dead || this.ended || this.pendingLevels <= 0) return;
    if (this.pauseReasons.size > 0) return;
    if (this.debug && this.debug.autoPick) {
      const opts = this.buildOptions();
      this.levelUpOpen = true;
      // бот берёт пассивку для эволюции, если оружие уже прокачано, иначе оружие
      const evp = opts.find((o) => o.kind === 'p' && Object.keys(EVOLVE).some((k) => EVOLVE[k].pass === o.id && (this.weapons[k] || 0) >= 5 && !this.passives[o.id]));
      const w = evp || opts.find((o) => o.kind === 'w') || (this.p.hp < this.st.maxHp * 0.5 && opts.find((o) => o.kind === 'heal')) || opts.find((o) => o.kind === 'oc');
      this.chooseUpgrade(this.debug.smartPick && w ? w : opts[(Math.random() * opts.length) | 0]);
      return;
    }
    this.levelUpOpen = true;
    this.vib('light');
    this.setPause('levelup', true);
    audio.play('levelup');
    this.hud.showLevelUp(this.buildOptions());
  }

  chooseUpgrade(o) {
    this.applyUpgrade(o);
    this.pendingLevels--;
    this.levelUpOpen = false;
    this.setPause('levelup', false);
    this.burst(this.p.x, this.p.y, o.color || COLORS.cyan, 24);
    if (this.pendingLevels > 0 && !(this.debug && this.debug.autoPick)) this.time.delayedCall(250, () => this.tryLevelUp());
  }

  applyUpgrade(o) {
    if (o.kind === 'w') {
      this.weapons[o.id] = o.lvl;
    } else if (o.kind === 'p') {
      this.passives[o.id] = o.lvl;
      this.recalc();
    } else if (o.kind === 'oc') {
      this.oc[o.id]++;
      this.overcharge++;
      this.recalc();
      if (o.id === 'oc_hp') this.p.hp = Math.min(this.st.maxHp, this.p.hp + this.st.maxHp * 0.3);
    } else if (o.kind === 'heal') {
      this.p.hp = Math.min(this.st.maxHp, this.p.hp + this.st.maxHp * 0.3);
    } else if (o.kind === 'gold') {
      this.bonusCrystals += 25;
    }
  }

  // ---------- Урон игроку / смерть ----------
  hurt(dmg, big = false) {
    const p = this.p;
    if ((p.inv > 0 && !big) || this.dead || this.ended || (this.debug && this.debug.god)) return;
    this.dmgTaken += dmg * this.st.armor;
    p.hp -= dmg * this.st.armor;
    p.inv = 0.55;
    this.shake(140, 0.007);
    audio.play('hurt');
    this.hud.hurtFlash();
    this.burst(p.x, p.y, COLORS.red, 10);
    if (p.hp <= 0) this.die();
  }

  // лёгкая вибрация телефона (можно выключить в настройках)
  vib(kind) {
    if (save.data.settings.vibro !== false) sdk.haptic(kind);
  }

  die() {
    this.vib('heavy');
    this.dead = true;
    this.p.hp = 0;
    this.burst(this.p.x, this.p.y, COLORS.cyan, 60);
    audio.play('explode');
    this.shake(500, 0.015);
    this.setPause('dead', true);
    if (this.debug && this.debug.autoEnd) return this.finishRun();
    const canFree = this.freeRevives > 0;
    const canAd = !this.adReviveUsed;
    if (canFree || canAd) this.hud.showRevive(canFree);
    else this.finishRun();
  }

  revive(free) {
    if (this.ended || !this.dead) return;
    if (free) this.freeRevives--;
    else this.adReviveUsed = true;
    const p = this.p;
    p.hp = this.st.maxHp * (free ? 1 : 0.7);
    p.inv = 2.5;
    this.dead = false;
    // зачищаем пространство вокруг
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 420) {
        if (e.boss) {
          e.kx = (dx / d) * 300;
          e.ky = (dy / d) * 300;
        } else this.kill(e);
      }
    }
    for (const b of this.ebullets) b.life = 0;
    // орбитальные удары и зоны тоже убираем, иначе они добивали сразу после воскрешения
    this.zones = [];
    this.strikes = [];
    this.walls = [];
    // в сужающейся зоне воскресаем в центре круга
    if (this.zone) Object.assign(this.zone, { x: p.x, y: p.y, r: Math.max(this.zone.r, 700) });
    this.ringFx(p.x, p.y, 420, COLORS.cyan, 0.5);
    audio.play('revive');
    this.setPause('dead', false);
  }

  finishRun() {
    if (this.ended) return;
    // достижения «продержись N минут» проверяем ещё раз: обычная проверка идёт раз в секунду и могла не успеть
    meta.live(this);
    this.ended = true;
    this.dead = true;
    sdk.gameplay(false);
    audio.play('gameover');
    const time = Math.floor(this.t);
    const mul = this.mode.reward;
    const score = Math.round((this.kills * 10 + time * 5 + this.bosses * 1000 + this.level * 50 + (this.won ? 25000 : 0)) * mul);
    // в поздней игре убийств очень много — их вклад в кристаллы постепенно снижается
    const killC = Math.min(this.kills, 8000) / 6 + Math.max(0, this.kills - 8000) / 24;
    const d = save.data;
    // кампания: звёзды за уровень (1 — продержался, ещё по одной за каждую цель), награда за новые звёзды
    let camp = null;
    if (this.camp) {
      const i = this.mode.level;
      const val = (type, k) => (this.winGoals ? this.winGoals[k] : this.goalValue(type));
      const goals = this.camp.goals.map(([type, n], k) => ({ type, n, v: val(type, k), ok: this.won && val(type, k) >= n }));
      const stars = this.won ? 1 + goals.filter((x) => x.ok).length : 0;
      const prev = (d.camp && d.camp[i]) || 0;
      d.camp = d.camp || {};
      if (stars > prev) d.camp[i] = stars;
      const newStars = Math.max(0, stars - prev);
      const bonus = (prev === 0 && stars > 0 ? 20 + 5 * i : 0) + newStars * 10;
      this.bonusCrystals += bonus;
      camp = { i, stars, prev, newStars, bonus, goals, next: stars > 0 && i + 1 < CAMPAIGN.length };
      if (stars > 0 && prev === 0) track('camp_clear', { level: i + 1 });
      if (stars > 0) d.campSel = Math.min(CAMPAIGN.length - 1, Math.max(d.campSel || 0, i + 1));
    }
    track('run_end', { mode: this.modeId, won: this.won, time });
    // праздник: валюта и счётчики заданий события
    let tokens = 0;
    if (this.evA) {
      tokens = this.evTok;
      eventRunEnd(this.evA, { tokens, kills: this.kills, bosses: this.bosses, time, won: this.won, holiday: this.arenaId === this.evA.ev.arena });
    }
    // арены с особыми правилами дают больше кристаллов
    const crystals = Math.floor((killC + time / 8 + this.bosses * 30) * CRYSTAL_RATE * this.st.gold * mul * (this.arenaDef.reward || 1)) + this.bonusCrystals;
    // общий лидерборд — только для спокойного, обычного режима и угроз
    const ranked = !this.mode.daily && !this.mode.rush;
    const best = d.best;
    let record = false;
    if (ranked) {
      record = score > best.score;
      if (record) Object.assign(best, { score, time, kills: this.kills, level: this.level });
    }
    if (this.mode.threat) d.bestThreat[this.mode.threat] = Math.max(d.bestThreat[this.mode.threat] || 0, time);
    if (this.modeId === 'quick' || this.modeId === 'calm' || this.modeId === 'normal') d.stars[this.modeId] = Math.max(d.stars[this.modeId] || 0, this.stars);
    let dailyRecord = false;
    if (this.mode.daily) {
      meta.dailyChallenge();
      dailyRecord = score > d.dailyRun.best;
      d.dailyRun.best = Math.max(d.dailyRun.best, score);
    }
    if (this.mode.rush) d.rushBest = Math.max(d.rushBest || 0, this.rushKills);
    meta.onRunEnd(this);
    if (this.mode.daily && this.won) d.dailyRun.won = true;
    d.crystals += crystals;
    d.tutorialDone = true;
    save.write();
    if (record) sdk.submitScore(score);
    this.result = {
      time,
      score,
      kills: this.kills,
      level: this.level,
      crystals,
      record: record || dailyRecord,
      doubled: false,
      won: this.won,
      hard: this.hard,
      modeId: this.modeId,
      mode: this.mode,
      stars: this.stars,
      rushKills: this.rushKills,
      camp,
      tokens,
      event: this.mode.event ? this.evA : null,
      ach: [...this.achLater, ...meta.takeFresh()],
    };
    this.hud.showGameOver(this.result);
  }

  doubleCrystals() {
    if (!this.result || this.result.doubled) return;
    this.result.doubled = true;
    save.data.crystals += this.result.crystals;
    this.result.crystals *= 2;
    save.write();
  }

  // ---------- Эффекты ----------
  ringFx(x, y, radius, color, dur = 0.35) {
    const s = this.img('ring', 6, ADD);
    s.setPosition(x, y).setTint(color).setScale(0.05).setAlpha(0.9);
    this.tweens.add({
      targets: s,
      scale: (radius * 2) / 232,
      alpha: 0,
      duration: dur * 1000,
      ease: 'Cubic.Out',
      onComplete: () => this.free(s),
    });
  }

  // ---------- Основной цикл ----------
  update(time, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05);
    const n = (this.debug && this.debug.sub) || 1;
    for (let i = 0; i < n; i++) {
      if (this.dead || !this.hud || !this.hud.ready || this.pauseReasons.size) return;
      this.step(n > 1 ? 1 / 30 : dt);
    }
  }

  step(dt) {
    this.t += dt;
    const p = this.p;
    const st = this.st;

    // --- движение игрока ---
    let mx = 0;
    let my = 0;
    const k = this.keys;
    if (k.A.isDown || k.LEFT.isDown) mx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) mx += 1;
    if (k.W.isDown || k.UP.isDown) my -= 1;
    if (k.S.isDown || k.DOWN.isDown) my += 1;
    const ml = Math.hypot(mx, my);
    if (ml > 0) {
      mx /= ml;
      my /= ml;
    } else if (this.hud.joy.active) {
      mx = this.hud.joy.x;
      my = this.hud.joy.y;
    } else if (this.debug && this.debug.bot && !(this.debug.afkAfter && this.t > this.debug.afkAfter)) {
      [mx, my] = this.botMove();
    } else if (this.debug && this.debug.afk) {
      mx = 0;
      my = 0;
    }
    // лёгкое управление: герой сам отходит от пуль, ударов и стен
    if (this.easy) {
      const [ex, ey] = this.dodgeVec();
      mx += ex;
      my += ey;
      const el = Math.hypot(mx, my);
      if (el > 1) {
        mx /= el;
        my /= el;
      }
    }
    p.vx = mx * st.speed;
    p.vy = my * st.speed;
    p.x += (p.vx + this.wind.x) * dt;
    p.y += (p.vy + this.wind.y) * dt;
    if (this.arenaDef.pillars) this.pushOut(p, 14);
    p.inv -= dt;
    p.hp = Math.min(st.maxHp, p.hp + st.regen * dt);
    p.spr.setPosition(p.x, p.y);
    p.glow.setPosition(p.x, p.y);
    p.ring.setPosition(p.x, p.y).rotation += dt * p.ringSpin;
    p.spr.setAlpha(p.inv > 0 ? 0.55 + 0.45 * Math.sin(this.t * 40) : 1);
    this.magnetRing.setPosition(p.x, p.y).setScale((st.magnet * 2) / 232);

    // --- события ---
    if (!this.warnedBoss && this.t > this.nextBoss - 3) {
      this.warnedBoss = true;
      this.hud.warn(tr('bossWarn'), COLORS.red);
      audio.play('warn');
    }
    if (this.mode.rush) {
      // следующий босс приходит только после победы над текущим
      if (this.t >= this.nextBoss && !this.boss && (this.endless || this.rushKills + 1 <= RUSH_BOSSES)) {
        this.spawnBoss();
        this.nextBoss = 1e9;
        this.warnedBoss = false;
      }
    } else if (this.t >= this.nextBoss) {
      this.spawnBoss();
      const T = this.te();
      this.nextBoss += this.mut === 'mu_bosses' ? 90 : T < 600 ? 180 : T < 1200 ? 150 : 120;
      this.warnedBoss = false;
    }
    // подарок новичку: в быстром режиме на первой минуте рядом падает сундук, чтобы сразу увидеть прокачку
    // кампания: в начале уровня напоминаем, сколько держаться
    if (this.camp && !this.campIntro && this.t > 1) {
      this.campIntro = true;
      this.hud.warn(tr('campIntro').replace('{n}', this.mode.level + 1).replace('{t}', fmtTime(this.win)), COLORS.cyan);
    }
    if ((this.modeId === 'quick' || (this.camp && this.mode.level < 4)) && !this.giftChest && this.t >= 45) {
      this.giftChest = true;
      this.spawnItem('chest', this.p.x + 150, this.p.y - 90);
      this.items[this.items.length - 1].gift = true;
      this.hud.warn(tr('giftChest'), COLORS.yellow);
    }
    // сундук на старт, купленный в праздничном магазине
    if (!this.startChestDone && this.t >= 4) {
      this.startChestDone = true;
      if ((save.data.startChest || 0) > 0) {
        save.data.startChest--;
        save.write(false);
        this.spawnItem('chest', this.p.x - 150, this.p.y - 90);
        this.hud.warn(tr('startChest'), COLORS.yellow);
      }
    }
    if (!this.warnedSwarm && this.t > this.nextSwarm - 2.5) {
      this.warnedSwarm = true;
      this.hud.warn(tr('swarmWarn'), COLORS.pink);
      audio.play('warn');
    }
    if (this.t >= this.nextSwarm) {
      this.spawnSwarm();
      this.nextSwarm += this.te() < 600 ? 150 : 110;
      this.warnedSwarm = false;
    }
    // события поздней игры: орбитальный удар, тараны, элита, камикадзе, снайперы
    const TE = this.te();
    if (!this.evType && TE > this.nextEvent - 2.5) {
      this.evType = this.pickEvent();
      this.hud.warn(tr('ev_' + this.evType), this.evType === 'strike' ? COLORS.red : COLORS.orange);
      audio.play('warn');
    }
    if (TE >= this.nextEvent && this.evType) {
      this.runEvent(this.evType);
      this.evType = null;
      const m = TE / 60;
      this.nextEvent += Math.max(this.win && this.t > this.win ? 12 : 16, 40 - (m - 7.5) * 1.1);
    }
    this.updatePhases();
    this.updateFinale(dt);
    this.updateZones(dt);
    this.updateArena(dt);
    this.updateWalls(dt);
    if (this.dead) return;

    // --- спавн ---
    // первая стайка появляется почти сразу, чтобы начало не было пустым
    if (!this.openingDone && this.t > 0.8) {
      this.openingDone = true;
      for (let i = 0; i < 6; i++) this.spawnEnemy('drone');
    }
    const TT = this.te();
    const m = TT / 60;
    // после 10 минут поток врагов не упирается в потолок, а продолжает расти
    const rate = (Math.min(14, 1.6 + TT * 0.02 + m * m * 0.1) + (m > 10 ? Math.min(16, (m - 10) * 0.8) : 0)) * (this.finale ? (this.mode === MODES.calm || this.mode === MODES.quick ? 1.6 : 2.4) : 1) * this.mode.rate * (this.mut === 'mu_swarm' ? 1.5 : this.mut === 'mu_magnet' ? 1.2 : 1);
    let maxAlive = Math.min(280, 45 + TT * 0.55) + (m > 10 ? Math.min(120, (m - 10) * 7) : 0) + (this.finale ? 60 : 0);
    if (this.mode.rush) maxAlive = Math.min(maxAlive, 140);
    this.spawnAcc += rate * (1 + 0.6 * this.warm()) * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc--;
      if (this.enemies.length < maxAlive) this.spawnEnemy(this.pickType());
    }

    this.updateEnemies(dt);
    if (this.arenaDef.pillars) this.updatePillars();
    this.buildGrid();
    this.updateWeapons(dt);
    this.updatePZones(dt);
    this.updateBullets(dt);
    this.updateSaws(dt);
    this.updateGems(dt);
    this.updateFx(dt);

    // уборка мёртвых
    if (this.enemies.some((e) => !e.alive)) this.enemies = this.enemies.filter((e) => e.alive);

    // полоска здоровья под игроком
    const hg = this.hpGfx;
    hg.clear();
    const w = 44;
    const ratio = Math.max(0, p.hp / st.maxHp);
    hg.fillStyle(0x000000, 0.6).fillRect(p.x - w / 2 - 1, p.y + 26, w + 2, 6);
    hg.fillStyle(ratio > 0.3 ? COLORS.green : COLORS.red, 1).fillRect(p.x - w / 2, p.y + 27, w * ratio, 4);

    // повышение уровня
    while (this.xp >= this.need) {
      this.xp -= this.need;
      this.level++;
      this.need = xpNeed(this.level);
      this.pendingLevels++;
    }
    if (this.pendingLevels > 0) this.tryLevelUp();

    // достижения по ходу забега (раз в секунду)
    this.metaT -= dt;
    if (this.metaT <= 0) {
      this.metaT = 1;
      meta.live(this);
      // в простом интерфейсе достижения показываем в конце забега, чтобы не отвлекали
      for (const id of meta.takeFresh()) this.simple ? this.achLater.push(id) : this.hud.achToast(id);
    }
    this.hud.tutorialStep && this.hud.tutorialStep();

    this.registry.set('view', this.cameras.main.worldView);
    this.registry.set('zoom', this.cameras.main.zoom);
  }

  updateEnemies(dt) {
    const p = this.p;
    const warm = this.warm();
    this.tele.length = 0;
    this.shieldList.length = 0;
    const despawn = this.viewRadius() + 380;
    const decay = Math.exp(-7 * dt);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      let dx = p.x - e.x;
      let dy = p.y - e.y;
      let d = Math.hypot(dx, dy) || 1;
      if (d > despawn && !e.boss) {
        // перенос врага, отставшего от игрока
        [e.x, e.y] = this.edgePoint(60);
        continue;
      }
      const nx = dx / d;
      const ny = dy / d;
      let vx = nx * e.speed;
      let vy = ny * e.speed;

      if (e.type === 'shooter') {
        if (d < 230) {
          vx = -nx * e.speed * 0.6 + -ny * e.speed * 0.5;
          vy = -ny * e.speed * 0.6 + nx * e.speed * 0.5;
        } else if (d < 300) {
          vx = -ny * e.speed * 0.7;
          vy = nx * e.speed * 0.7;
        }
        e.shootT -= dt;
        if (e.shootT <= 0 && d < 560) {
          e.shootT = 2.6;
          this.enemyShot(e.x, e.y, nx, ny, 240, e.dmg);
        }
      } else if (e.type === 'lancer') {
        // таран: подходит, замирает с прицельной линией и делает рывок
        e.lt -= dt;
        if (e.ls === 'aim') {
          vx = 0;
          vy = 0;
          this.tele.push(e);
          if (e.lt <= 0) {
            e.ls = 'dash';
            e.lt = 0.5;
          }
        } else if (e.ls === 'dash') {
          vx = e.dvx;
          vy = e.dvy;
          if (e.lt <= 0) {
            e.ls = 'walk';
            e.lt = 1.8 + Math.random() * 1.2;
          }
        } else if (e.lt <= 0 && d < 340) {
          e.ls = 'aim';
          e.lt = 0.7;
          const sp = 560 * (e.elite ? 1.15 : 1);
          e.dvx = nx * sp;
          e.dvy = ny * sp;
        }
        e.spr.rotation = e.ls === 'walk' ? Math.atan2(ny, nx) : Math.atan2(e.dvy, e.dvx);
      } else if (e.type === 'bomber') {
        // камикадзе: у игрока поджигает фитиль и взрывается
        if (e.fuse < 0 && d < 80) e.fuse = 0.75;
        if (e.fuse >= 0) {
          vx *= 0.3;
          vy *= 0.3;
          e.fuse -= dt;
          e.flash = 0.03;
          e.spr.setTintFill(Math.floor(e.fuse * 14) % 2 ? 0xffffff : 0xff3300);
          this.tele.push(e);
          if (e.fuse <= 0) {
            this.explodeBomber(e);
            continue;
          }
        }
      } else if (e.type === 'sniper') {
        // держит дистанцию и стреляет веером
        if (d < 360) {
          vx = -nx * e.speed;
          vy = -ny * e.speed;
        } else if (d < 470) {
          vx = -ny * e.speed * 0.8;
          vy = nx * e.speed * 0.8;
        }
        e.shootT -= dt;
        if (e.shootT <= 0 && d < 640) {
          e.shootT = 2.3;
          const a0 = Math.atan2(ny, nx);
          const k = e.elite ? 2 : 1;
          for (let i = -k; i <= k; i++) this.enemyShot(e.x, e.y, Math.cos(a0 + i * 0.2), Math.sin(a0 + i * 0.2), 320, e.dmg);
        }
      } else if (e.type === 'spinner') {
        // крест из 4 (у элиты 8) пуль, каждый залп повёрнут
        if (d < 260) {
          vx = -ny * e.speed;
          vy = nx * e.speed;
        }
        e.shootT -= dt;
        if (e.shootT <= 0 && d < 620) {
          e.shootT = 2.2;
          e.spinA = (e.spinA || 0) + 0.4;
          const k = e.elite ? 8 : 4;
          for (let i = 0; i < k; i++) {
            const a = e.spinA + (i / k) * Math.PI * 2;
            this.enemyShot(e.x, e.y, Math.cos(a), Math.sin(a), 210, e.dmg);
          }
        }
      } else if (e.type === 'gunner') {
        // очереди: 3 залпа по 3 пули веером в игрока
        if (d < 300) {
          vx = -nx * e.speed * 0.5 - ny * e.speed * 0.6;
          vy = -ny * e.speed * 0.5 + nx * e.speed * 0.6;
        }
        e.shootT -= dt;
        if (e.shootT <= 0 && d < 600) {
          e.burst = (e.burst || 0) + 1;
          const a0 = Math.atan2(ny, nx);
          for (let i = -1; i <= 1; i++) this.enemyShot(e.x, e.y, Math.cos(a0 + i * 0.18), Math.sin(a0 + i * 0.18), 290, e.dmg);
          if (e.burst >= (e.elite ? 5 : 3)) {
            e.burst = 0;
            e.shootT = 3.2;
          } else e.shootT = 0.16;
        }
      } else if (e.type === 'burster') {
        // кольцо пуль во все стороны
        e.shootT -= dt;
        if (e.shootT <= 0 && d < 520) {
          e.shootT = 3;
          const k = e.elite ? 16 : 10;
          const off = Math.random();
          for (let i = 0; i < k; i++) {
            const a = ((i + off) / k) * Math.PI * 2;
            this.enemyShot(e.x, e.y, Math.cos(a), Math.sin(a), 170, e.dmg);
          }
        }
      } else if (e.type === 'shieldman') {
        // щитоносец медленно идёт к игроку и прикрывает соседей
        this.shieldList.push(e);
        this.query(e.x, e.y, 150, (o) => {
          if (o !== e && !o.boss) o.shT = this.t + 0.2;
        });
      } else if (e.type === 'medic') {
        // лекарь держится позади и каждые 3 секунды лечит врагов рядом
        if (d < 300) {
          vx = -nx * e.speed;
          vy = -ny * e.speed;
        } else if (d < 380) {
          vx = -ny * e.speed * 0.6;
          vy = nx * e.speed * 0.6;
        }
        e.shootT -= dt;
        if (e.shootT <= 0) {
          e.shootT = 3.2;
          let n = 0;
          this.query(e.x, e.y, 170, (o) => {
            if (o === e || o.hp >= o.maxHp) return;
            o.hp = Math.min(o.maxHp, o.hp + o.maxHp * (o.boss ? 0.03 : 0.3));
            if (n++ < 6) this.bolts.push({ pts: [[e.x, e.y], [o.x, o.y]], life: 0.25, color: e.color });
          });
          if (n) this.ringFx(e.x, e.y, 170, e.color, 0.4);
        }
      } else if (e.type === 'warden') {
        // Страж лабиринта: ставит стены вокруг игрока, между ними стреляет тройками
        const rage = e.hp < e.maxHp * 0.5;
        // подходит на среднюю дистанцию и держится там, чтобы оружие игрока доставало
        if (d < 240) {
          vx = -ny * e.speed;
          vy = nx * e.speed;
        }
        e.bt -= dt;
        e.st2 -= dt;
        if (e.st2 <= 0) {
          e.st2 = rage ? 9 : 11;
          this.buildCage(e, rage);
        }
        if (e.bt <= 0) {
          e.bt = rage ? 1.6 : 2.2;
          const a0 = Math.atan2(ny, nx);
          for (let i = -1; i <= 1; i++) this.enemyShot(e.x, e.y, Math.cos(a0 + i * 0.16), Math.sin(a0 + i * 0.16), 240, e.dmg * 0.4);
        }
      } else if (e.type === 'pulsar') {
        // Пульсар: спиральные очереди пуль, между ними призывает дронов
        e.bt -= dt;
        e.st2 -= dt;
        const rage = e.hp < e.maxHp * 0.5 ? 1.5 : 1;
        if (e.bt < 3) {
          vx *= 0.3;
          vy *= 0.3;
          e.fireT = (e.fireT || 0) - dt;
          if (e.fireT <= 0) {
            e.fireT = 0.11 / rage;
            e.spin += 0.33;
            const arms = 3 + Math.min(3, Math.floor(this.bossIdx / 3));
            for (let i = 0; i < arms; i++) {
              const a = e.spin + (i / arms) * Math.PI * 2;
              this.enemyShot(e.x, e.y, Math.cos(a), Math.sin(a), 190, e.dmg * 0.55);
            }
          }
          if (e.bt <= 0) e.bt = 6;
        }
        if (e.st2 <= 0) {
          e.st2 = 8 / rage;
          // не больше 8 дронов сразу, иначе оружие бьёт только по ним, а босс живёт вечно
          const alive = this.enemies.filter((o) => o.alive && o.owner === e).length;
          for (let i = 0; i < Math.min(6, 8 - alive); i++) {
            const a = (i / 6) * Math.PI * 2;
            const m = this.spawnEnemy('drone', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70, 2, false);
            if (m) m.owner = e;
          }
          this.ringFx(e.x, e.y, 120, e.color, 0.4);
        }
      } else if (e.type === 'hive') {
        // Улей: веера пуль в игрока и рой из сот; на половине здоровья звереет
        e.bt -= dt;
        e.st2 -= dt;
        const rage = e.hp < e.maxHp * 0.5;
        if (rage && !e.raged) {
          e.raged = true;
          e.speed *= 1.5;
          this.hud.warn(tr('bossName_hive') + '!', COLORS.yellow);
        }
        if (e.bt <= 0) {
          e.bt = rage ? 1.5 : 2.5;
          const a0 = Math.atan2(ny, nx);
          for (const w of [0, 0.12]) for (let i = -2; i <= 2; i++) this.enemyShot(e.x, e.y, Math.cos(a0 + i * 0.22 + w), Math.sin(a0 + i * 0.22 + w), 230 - w * 400, e.dmg * 0.6);
          audio.play('nova');
        }
        if (e.st2 <= 0) {
          e.st2 = rage ? 4 : 6.5;
          const kinds = ['dart', 'dart', 'splitter', 'drone'];
          for (let i = 0; i < 7; i++) {
            const a = Math.random() * Math.PI * 2;
            this.spawnEnemy(kinds[i % kinds.length], e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, 1.5, false);
          }
        }
      } else if (e.type === 'serpent') {
        // Змей: петляет к игроку, хвост повторяет путь, сегменты стреляют в стороны
        const rage = e.hp < e.maxHp * 0.5;
        const want = Math.atan2(ny, nx) + Math.sin(this.t * 1.7) * 0.7;
        const diff = Phaser.Math.Angle.Wrap(want - e.heading);
        e.heading += Phaser.Math.Clamp(diff, -2 * dt, 2 * dt);
        const sp = e.speed * (rage ? 1.3 : 1);
        vx = Math.cos(e.heading) * sp;
        vy = Math.sin(e.heading) * sp;
        e.spr.rotation = e.heading;
        e.trail.unshift(e.x, e.y);
        const gap = 7; // кадров между сегментами
        if (e.trail.length > (e.segs.length + 1) * gap * 2) e.trail.length = (e.segs.length + 1) * gap * 2;
        e.bt -= dt;
        const fire = e.bt <= 0;
        if (fire) e.bt = rage ? 2.4 : 3.4;
        for (let i = 0; i < e.segs.length; i++) {
          const k = Math.min(e.trail.length - 2, (i + 1) * gap * 2);
          if (k < 0) continue;
          const sx = e.trail[k];
          const sy = e.trail[k + 1];
          e.segs[i].setPosition(sx, sy).setScale((1 - i * 0.035) / TS);
          const ddx = p.x - sx;
          const ddy = p.y - sy;
          if (ddx * ddx + ddy * ddy < 33 * 33) this.hurt(e.dmg * 0.7);
          if (fire && i % 2 === 0) {
            const a = e.heading + (i % 4 === 0 ? 1 : -1) * Math.PI / 2;
            this.enemyShot(sx, sy, Math.cos(a), Math.sin(a), 170, e.dmg * 0.5);
          }
        }
        if (fire) audio.play('nova');
      } else if (e.type === 'mirror') {
        // Зеркало: прыгает к игроку, рисует прицельные лучи крестом, затем бьёт; призывает двойников
        const rage = e.hp < e.maxHp * 0.5;
        e.mt -= dt;
        vx *= 0.6;
        vy *= 0.6;
        if (e.ms === 'idle' && e.mt <= 0) {
          e.ms = 'out';
          e.mt = 0.35;
        } else if (e.ms === 'out') {
          e.spr.setAlpha(Math.max(0.1, e.mt / 0.35));
          if (e.mt <= 0) {
            const a = Math.random() * Math.PI * 2;
            e.x = p.x + Math.cos(a) * 270;
            e.y = p.y + Math.sin(a) * 270;
            e.ms = 'aim';
            e.mt = rage ? 0.8 : 1.05;
            const n = rage ? 3 : 2;
            const a0 = Math.random() * Math.PI;
            e.lines = [];
            for (let i = 0; i < n; i++) e.lines.push(a0 + (i / n) * Math.PI);
            this.ringFx(e.x, e.y, 90, e.color, 0.3);
          }
        } else if (e.ms === 'aim') {
          e.spr.setAlpha(1);
          vx = 0;
          vy = 0;
          this.tele.push(e);
          if (e.mt <= 0) {
            // залп: лучи по линиям прицела
            for (const a of e.lines) {
              const cx = Math.cos(a);
              const cy = Math.sin(a);
              const rx = p.x - e.x;
              const ry = p.y - e.y;
              if (Math.abs(rx * cy - ry * cx) < 30) this.hurt(e.dmg * 1.1);
              this.beams.push({ x1: e.x - cx * 1500, y1: e.y - cy * 1500, x2: e.x + cx * 1500, y2: e.y + cy * 1500, w: 16, life: 0.3, T: 0.3, color: e.color });
            }
            audio.play('laser');
            this.shake(150, 0.005);
            e.cycle++;
            if (e.cycle % 2 === 0) {
              for (let i = 0; i < (rage ? 4 : 3); i++) {
                const a = (i / 3) * Math.PI * 2;
                this.spawnEnemy('mirrorling', e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60, 1, false);
              }
            }
            e.ms = 'idle';
            e.mt = rage ? 2.2 : 3.2;
          }
        }
      } else if (e.boss) {
        e.bt -= dt;
        if (e.state === 'dash') {
          vx = e.dvx;
          vy = e.dvy;
          e.dashT -= dt;
          if (e.dashT <= 0) e.state = 'chase';
        } else if (e.state === 'charge') {
          vx = 0;
          vy = 0;
          e.dashT -= dt;
          e.spr.setTint(0xffaaaa);
          if (e.dashT <= 0) {
            e.state = 'dash';
            e.dashT = 0.75;
            e.dvx = nx * 470;
            e.dvy = ny * 470;
            e.spr.clearTint();
          }
        }
        if (e.bt <= 0 && e.state === 'chase') {
          e.bt = Math.max(2, 3.4 - this.bossIdx * 0.2);
          if (Math.random() < 0.5 && d < 700) {
            e.state = 'charge';
            e.dashT = 0.5;
          } else {
            const n = 14 + this.bossIdx * 2;
            const off = Math.random();
            for (let i = 0; i < n; i++) {
              const a = ((i + off) / n) * Math.PI * 2;
              this.enemyShot(e.x, e.y, Math.cos(a), Math.sin(a), 200, e.dmg * 0.6);
            }
            audio.play('nova');
          }
        }
      }

      // разталкивание
      const a = this.grid.get((((e.x / CELL) | 0) & 0xffff) * 65536 + (((e.y / CELL) | 0) & 0xffff));
      if (a && a.length > 1) {
        let c = 0;
        for (let i = 0; i < a.length && c < 6; i++) {
          const o = a[i];
          if (o === e || !o.alive) continue;
          const ox = e.x - o.x;
          const oy = e.y - o.y;
          const rr = e.r + o.r;
          const dd = ox * ox + oy * oy;
          if (dd < rr * rr && dd > 0.01) {
            const dl = Math.sqrt(dd);
            const push = ((rr - dl) / rr) * 160;
            vx += (ox / dl) * push;
            vy += (oy / dl) * push;
            c++;
          }
        }
      }

      // разгон начала: издалека враги подходят быстрее, а рядом с героем двигаются как обычно, поэтому увернуться не сложнее
      if (warm > 0 && !e.boss) {
        const far = Math.hypot(p.x - e.x, p.y - e.y) - 280;
        if (far > 0) {
          const k = 1 + 1.2 * warm * Math.min(1, far / 220);
          vx *= k;
          vy *= k;
        }
      }
      // ветер сносит и врагов (боссов не трогает)
      const wk = e.boss ? 0 : 0.7;
      e.x += (vx + e.kx + this.wind.x * wk) * dt;
      e.y += (vy + e.ky + this.wind.y * wk) * dt;
      if (this.arenaDef.pillars && !e.boss) this.pushOut(e, e.r);
      e.kx *= decay;
      e.ky *= decay;
      e.spr.setPosition(e.x, e.y);
      if (e.aura) e.aura.setPosition(e.x, e.y);
      e.spr.rotation += e.rot * dt;
      if (e.flash > 0) {
        e.flash -= dt;
        if (e.flash <= 0) e.spr.clearTint();
      }
      // касание игрока
      dx = p.x - e.x;
      dy = p.y - e.y;
      const rr = e.r + 13;
      if (dx * dx + dy * dy < rr * rr) this.hurt(e.dmg);
    }
  }

  enemyShot(x, y, nx, ny, speed, dmg) {
    const spr = this.img('ebullet', 6, ADD);
    spr.setPosition(x, y);
    this.ebullets.push({ x, y, vx: nx * speed, vy: ny * speed, dmg, life: 4.5, spr });
  }

  // ---------- Оружие ----------
  updateWeapons(dt) {
    const p = this.p;
    const st = this.st;
    for (const id in this.weapons) {
      const lvl = this.weapons[id] - 1;
      const W = WEAPONS[id];
      const s = this.wstate[id] || (this.wstate[id] = { t: 0.3, a: 0, pend: 0 });
      if (id === 'blaster') {
        s.t -= dt;
        if (s.t <= 0) {
          const tgt = this.nearest(p.x, p.y, 700);
          if (tgt) {
            const ev = this.evo.blaster;
            s.t = W.cd[lvl] * st.cd * (ev ? 0.55 : 1);
            const n = W.count[lvl] + st.multi;
            const base = Math.atan2(tgt.y - p.y, tgt.x - p.x);
            for (let i = 0; i < n; i++) {
              // центральные снаряды летят точно в цель (два — параллельно с небольшим зазором),
              // остальные — веером по бокам; раньше при двух снарядах оба уходили мимо
              const k = i - (n - 1) / 2;
              let a = base;
              let off = 0;
              if (n % 2 === 0) {
                if (Math.abs(k) === 0.5) off = k * 12;
                else a = base + (k - Math.sign(k) * 0.5) * 0.16;
              } else a = base + k * 0.15;
              const ox = p.x + Math.cos(base + Math.PI / 2) * off;
              const oy = p.y + Math.sin(base + Math.PI / 2) * off;
              const spr = this.img('bolt', 5, ADD);
              spr.setPosition(ox, oy).setRotation(a);
              if (ev) spr.setTint(COLORS.pink).setScale(1.25 / TS);
              this.bullets.push({
                x: ox,
                y: oy,
                vx: Math.cos(a) * W.speed,
                vy: Math.sin(a) * W.speed,
                dmg: W.dmg[lvl] * st.dmg * (ev ? 1.25 : 1),
                pierce: W.pierce[lvl] + st.pierce + (ev ? 2 : 0),
                life: 1.2,
                r: 7,
                hit: [],
                spr,
              });
            }
            audio.play('shoot');
          } else s.t = 0.1;
        }
      } else if (id === 'orbit') {
        const n = W.count[lvl];
        while (this.orbs.length < n) this.orbs.push(this.img('orb', 5, ADD));
        s.a += W.rot[lvl] * dt;
        const R = W.radius[lvl] * st.area;
        const ev = this.evo.orbit;
        const dmg = W.dmg[lvl] * st.dmg * (ev ? 1.3 : 1);
        const orbHit = (ox, oy, a) =>
          this.query(ox, oy, 13 * st.area, (e) => {
            if (this.t - e.orbT >= W.hitCd) {
              e.orbT = this.t;
              this.damage(e, dmg, Math.cos(a) * 160, Math.sin(a) * 160);
            }
          });
        for (let i = 0; i < n; i++) {
          const a = s.a + (i / n) * Math.PI * 2;
          const ox = p.x + Math.cos(a) * R;
          const oy = p.y + Math.sin(a) * R;
          this.orbs[i].setPosition(ox, oy).setScale((0.9 + 0.1 * Math.sin(this.t * 10 + i)) / TS * st.area);
          orbHit(ox, oy, a);
        }
        // Кольцо Сатурна: второе кольцо крутится навстречу
        if (ev) {
          while (this.orbs2.length < n) this.orbs2.push(this.img('orb', 5, ADD).setTint(COLORS.yellow));
          for (let i = 0; i < n; i++) {
            const a = -s.a * 1.3 + (i / n) * Math.PI * 2;
            const ox = p.x + Math.cos(a) * R * 1.65;
            const oy = p.y + Math.sin(a) * R * 1.65;
            this.orbs2[i].setPosition(ox, oy).setScale((1.1 / TS) * st.area);
            orbHit(ox, oy, a);
          }
        }
      } else if (id === 'nova') {
        s.t -= dt;
        if (s.t <= 0) {
          s.t = W.cd[lvl] * st.cd;
          this.novaPulse(W, lvl);
          if (W.pulses[lvl] > 1) s.pend = 0.28;
        }
        if (s.pend > 0) {
          s.pend -= dt;
          if (s.pend <= 0) this.novaPulse(W, lvl);
        }
      } else if (id === 'lightning') {
        s.t -= dt;
        if (s.t <= 0) {
          s.t = W.cd[lvl] * st.cd;
          for (let k = 0; k < W.strikes[lvl]; k++) this.lightning(W, lvl);
        }
        // Гроза: удар с неба по врагам на всём экране
        if (this.evo.lightning) {
          s.t2 = (s.t2 ?? 2) - dt;
          if (s.t2 <= 0) {
            s.t2 = 3 * st.cd;
            this.thunder(W, lvl);
          }
        }
      } else if (id === 'missile') {
        s.t -= dt;
        if (s.t <= 0) {
          s.t = W.cd[lvl] * st.cd;
          for (let i = 0; i < W.count[lvl] + st.multi + (this.evo.missile ? 2 : 0); i++) {
            const a = Math.random() * Math.PI * 2;
            const spr = this.img('missile', 5, ADD);
            spr.setPosition(p.x, p.y);
            this.missiles.push({ x: p.x, y: p.y, a, sp: 260, life: 3.2, tgt: null, retarget: 0, lvl, spr, trail: 0 });
          }
          audio.play('missile');
        }
      } else if (id === 'laser') {
        s.t -= dt;
        if (s.t <= 0) {
          const tgt = this.nearest(p.x, p.y, 650);
          if (tgt) {
            s.t = W.cd[lvl] * st.cd;
            const n = W.beams[lvl] + st.multi;
            const base = Math.atan2(tgt.y - p.y, tgt.x - p.x);
            for (let i = 0; i < n; i++) {
              const a = base + (i - (n - 1) / 2) * 0.32;
              this.laserBeam(a, W, lvl, 1);
              // Призма: каждый луч расходится ещё на два
              if (this.evo.laser) {
                this.laserBeam(a + 0.45, W, lvl, 0.6);
                this.laserBeam(a - 0.45, W, lvl, 0.6);
              }
            }
            audio.play('laser');
          } else s.t = 0.15;
        }
      } else if (id === 'saw') {
        s.t -= dt;
        if (s.t <= 0) {
          s.t = W.cd[lvl] * st.cd;
          const n = W.count[lvl] + st.multi;
          const tgt = this.nearest(p.x, p.y, 600);
          const base = tgt ? Math.atan2(tgt.y - p.y, tgt.x - p.x) : Math.random() * Math.PI * 2;
          for (let i = 0; i < n; i++) {
            const a = base + (i - (n - 1) / 2) * 0.55 + (n > 1 ? 0 : 0);
            const spr = this.img('saw', 2, ADD);
            const sc = W.size[lvl] * Math.min(st.area, 1.5);
            // полупрозрачные и под врагами, чтобы не закрывать обзор
            spr.setPosition(p.x, p.y).setScale((sc * 0.8) / TS).setAlpha(0.5);
            this.saws.push({ x: p.x, y: p.y, a, d: 0, dist: W.dist[lvl] * st.area, back: false, sp: 560, dmg: W.dmg[lvl] * st.dmg, r: 15 * sc, spr, hits: new Map(), life: 4 });
          }
          audio.play('saw');
        }
        // Жернова: три больших диска постоянно кружат вокруг ядра
        if (this.evo.saw) {
          const k = 3;
          while (this.mills.length < k) this.mills.push(this.img('saw', 2, ADD).setAlpha(0.55).setTint(COLORS.cyan));
          s.ma = (s.ma || 0) + dt * 2.6;
          const R = 150 * Math.min(st.area, 1.6);
          const dmg = W.dmg[lvl] * st.dmg;
          for (let i = 0; i < k; i++) {
            const a = s.ma + (i / k) * Math.PI * 2;
            const mx = p.x + Math.cos(a) * R;
            const my = p.y + Math.sin(a) * R;
            this.mills[i].setPosition(mx, my).setScale(1.5 / TS).rotation += dt * 16;
            this.query(mx, my, 26, (e) => {
              if (this.t - (e.millT || -9) >= 0.3) {
                e.millT = this.t;
                this.damage(e, dmg, Math.cos(a) * 120, Math.sin(a) * 120);
              }
            });
          }
        }
      } else if (id === 'drone') {
        const evd = this.evo.drone;
        const n = W.count[lvl] + st.multi + (evd ? 2 : 0);
        while (this.drones.length < n) this.drones.push({ spr: this.img('drone', 5, ADD), t: Math.random() * 0.3 });
        s.a += dt * 1.6;
        for (let i = 0; i < this.drones.length; i++) {
          const dr = this.drones[i];
          if (i >= n) {
            dr.spr.setVisible(false);
            continue;
          }
          const a = s.a + (i / n) * Math.PI * 2;
          const dx = p.x + Math.cos(a) * 64;
          const dy = p.y + Math.sin(a) * 64;
          dr.spr.setVisible(true).setPosition(dx, dy).setRotation(a + Math.PI / 2);
          dr.t -= dt;
          if (dr.t <= 0) {
            const tgt = this.nearest(dx, dy, 600);
            if (tgt) {
              dr.t = W.cd[lvl] * st.cd * (evd ? 0.7 : 1);
              const ang = Math.atan2(tgt.y - dy, tgt.x - dx);
              const spr = this.img('bolt', 5, ADD);
              spr.setPosition(dx, dy).setRotation(ang).setTint(evd ? COLORS.green : COLORS.blue).setScale(0.7 / TS);
              this.bullets.push({ x: dx, y: dy, vx: Math.cos(ang) * W.speed, vy: Math.sin(ang) * W.speed, dmg: W.dmg[lvl] * st.dmg, pierce: st.pierce + (evd ? 1 : 0), life: 1, r: 6, hit: [], spr });
              audio.play('drone');
            } else dr.t = 0.15;
          }
        }
      }
    }
  }

  // лазерный луч: мгновенно бьёт всех врагов на отрезке
  laserBeam(a, W, lvl, k = 1) {
    const p = this.p;
    const ev = this.evo.laser;
    const L = W.len * this.st.area;
    const w = W.width[lvl] * this.st.area * (ev ? 1.3 : 1) * (k < 1 ? 0.7 : 1);
    const cx = Math.cos(a);
    const cy = Math.sin(a);
    const dmg = W.dmg[lvl] * this.st.dmg * k * (ev ? 1.2 : 1);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const rx = e.x - p.x;
      const ry = e.y - p.y;
      const along = rx * cx + ry * cy;
      if (along < 0 || along > L) continue;
      const perp = Math.abs(rx * cy - ry * cx);
      if (perp < w + e.r) {
        this.damage(e, dmg, cx * 120, cy * 120);
        this.burst(e.x, e.y, W.color, 2);
      }
    }
    this.beams.push({ x1: p.x, y1: p.y, x2: p.x + cx * L, y2: p.y + cy * L, w, life: 0.22, T: 0.22, color: ev ? COLORS.purple : W.color });
  }

  // диски летят наружу и возвращаются к ядру
  updateSaws(dt) {
    const p = this.p;
    const W = WEAPONS.saw;
    for (const sw of this.saws) {
      sw.life -= dt;
      if (!sw.back) {
        const step = sw.sp * dt * Math.max(0.35, 1 - sw.d / sw.dist);
        sw.x += Math.cos(sw.a) * step;
        sw.y += Math.sin(sw.a) * step;
        sw.d += step;
        if (sw.d >= sw.dist * 0.97) sw.back = true;
      } else {
        const dx = p.x - sw.x;
        const dy = p.y - sw.y;
        const d = Math.hypot(dx, dy) || 1;
        const v = 620 * dt;
        if (d < v + 10) sw.life = 0;
        else {
          sw.x += (dx / d) * v;
          sw.y += (dy / d) * v;
        }
      }
      sw.spr.setPosition(sw.x, sw.y).rotation += dt * 14;
      this.query(sw.x, sw.y, sw.r, (e) => {
        const last = sw.hits.get(e) || -9;
        if (this.t - last >= W.hitCd) {
          sw.hits.set(e, this.t);
          this.damage(e, sw.dmg, Math.cos(sw.a) * 90, Math.sin(sw.a) * 90);
        }
      });
      if (sw.life <= 0) this.free(sw.spr);
    }
    if (this.saws.some((s) => s.life <= 0)) this.saws = this.saws.filter((s) => s.life > 0);
  }

  novaPulse(W, lvl) {
    const p = this.p;
    const ev = this.evo.nova;
    const R = W.radius[lvl] * this.st.area * (ev ? 1.25 : 1);
    const dmg = W.dmg[lvl] * this.st.dmg * (ev ? 1.4 : 1);
    this.ringFx(p.x, p.y, R, ev ? COLORS.orange : W.color);
    // Сверхновая оставляет горящий круг
    if (ev) this.pzones.push({ x: p.x, y: p.y, r: R * 0.55, t: 1.5, T: 1.5, tick: 0.2, dmg: dmg * 0.35 });
    audio.play('nova');
    this.query(p.x, p.y, R, (e) => {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      this.damage(e, dmg, (dx / d) * 380, (dy / d) * 380);
    });
  }

  lightning(W, lvl) {
    const p = this.p;
    const cands = [];
    const r2 = W.range * W.range;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy < r2) cands.push(e);
    }
    if (!cands.length) return;
    let cur = cands[(Math.random() * cands.length) | 0];
    const pts = [[p.x, p.y]];
    const hit = new Set();
    const dmg = W.dmg[lvl] * this.st.dmg;
    for (let k = 0; k <= W.chains[lvl] && cur; k++) {
      hit.add(cur);
      pts.push([cur.x, cur.y]);
      const cx = cur.x;
      const cy = cur.y;
      this.burst(cx, cy, W.color, 5);
      this.damage(cur, dmg);
      let next = null;
      let bd = Infinity;
      this.query(cx, cy, W.chainRange, (e) => {
        if (hit.has(e)) return;
        const d = (e.x - cx) ** 2 + (e.y - cy) ** 2;
        if (d < bd) {
          bd = d;
          next = e;
        }
      });
      cur = next;
    }
    this.bolts.push({ pts, life: 0.16, color: W.color });
    audio.play('zap');
  }

  // Гроза: молнии с неба по случайным врагам на экране
  thunder(W, lvl) {
    const v = this.cameras.main.worldView;
    const cands = this.enemies.filter((e) => e.alive && e.x > v.x && e.x < v.right && e.y > v.y && e.y < v.bottom);
    const dmg = W.dmg[lvl] * this.st.dmg * 1.5;
    for (let i = 0; i < 10 && cands.length; i++) {
      const e = cands.splice((Math.random() * cands.length) | 0, 1)[0];
      this.bolts.push({ pts: [[e.x + (Math.random() - 0.5) * 60, e.y - 320], [e.x, e.y]], life: 0.2, color: COLORS.white });
      this.burst(e.x, e.y, COLORS.yellow, 6);
      this.damage(e, dmg);
    }
    audio.play('zap');
    this.shake(100, 0.003);
  }

  explode(x, y, lvl, mini = false) {
    const W = WEAPONS.missile;
    const R = W.radius[lvl] * this.st.area * (mini ? 0.55 : 1);
    const dmg = W.dmg[lvl] * this.st.dmg * (mini ? 0.5 : 1);
    this.ringFx(x, y, R, mini ? COLORS.red : W.color, 0.3);
    this.burst(x, y, W.color, mini ? 5 : 14);
    if (!mini) audio.play('mboom');
    // Залп: кассетные мини-взрывы вокруг
    if (!mini && this.evo.missile) {
      const a0 = Math.random() * Math.PI * 2;
      for (let i = 0; i < 3; i++) {
        const a = a0 + (i / 3) * Math.PI * 2;
        this.explode(x + Math.cos(a) * R * 0.9, y + Math.sin(a) * R * 0.9, lvl, true);
      }
    }
    this.query(x, y, R, (e) => {
      const dx = e.x - x;
      const dy = e.y - y;
      const d = Math.hypot(dx, dy) || 1;
      this.damage(e, dmg, (dx / d) * 250, (dy / d) * 250);
    });
  }

  updateBullets(dt) {
    const p = this.p;
    // пули игрока
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life > 0) {
        this.query(b.x, b.y, b.r, (e) => {
          if (b.hit.includes(e)) return false;
          b.hit.push(e);
          this.damage(e, b.dmg, b.vx * 0.12, b.vy * 0.12);
          this.burst(b.x, b.y, COLORS.cyan, 3);
          if (b.pierce-- <= 0) {
            b.life = 0;
            return true;
          }
          return false;
        });
      }
      if (b.life <= 0) this.free(b.spr);
      else b.spr.setPosition(b.x, b.y);
    }
    if (this.bullets.length) this.bullets = this.bullets.filter((b) => b.life > 0);

    // ракеты
    for (const mi of this.missiles) {
      mi.life -= dt;
      mi.retarget -= dt;
      if ((!mi.tgt || !mi.tgt.alive) && mi.retarget <= 0) {
        mi.tgt = this.nearest(mi.x, mi.y, 650);
        mi.retarget = 0.25;
      }
      if (mi.tgt && mi.tgt.alive) {
        const want = Math.atan2(mi.tgt.y - mi.y, mi.tgt.x - mi.x);
        let diff = Phaser.Math.Angle.Wrap(want - mi.a);
        mi.a += Phaser.Math.Clamp(diff, -6 * dt, 6 * dt);
      }
      mi.sp = Math.min(560, mi.sp + 500 * dt);
      mi.x += Math.cos(mi.a) * mi.sp * dt;
      mi.y += Math.sin(mi.a) * mi.sp * dt;
      mi.spr.setPosition(mi.x, mi.y).setRotation(mi.a);
      mi.trail -= dt;
      if (mi.trail <= 0) {
        mi.trail = 0.05;
        this.emitter(COLORS.orange).explode(1, mi.x - Math.cos(mi.a) * 8, mi.y - Math.sin(mi.a) * 8);
      }
      let boom = mi.life <= 0;
      if (!boom)
        this.query(mi.x, mi.y, 8, () => {
          boom = true;
          return true;
        });
      if (boom) {
        mi.life = 0;
        this.explode(mi.x, mi.y, mi.lvl);
        this.free(mi.spr);
      }
    }
    if (this.missiles.length) this.missiles = this.missiles.filter((m) => m.life > 0);

    // пули врагов
    for (const b of this.ebullets) {
      b.x += (b.vx + this.wind.x * 0.5) * dt;
      b.y += (b.vy + this.wind.y * 0.5) * dt;
      b.life -= dt;
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      if (b.life > 0 && dx * dx + dy * dy < 17 * 17) {
        this.hurt(b.dmg);
        b.life = 0;
      }
      if (b.life <= 0) this.free(b.spr);
      else b.spr.setPosition(b.x, b.y);
    }
    if (this.ebullets.length) this.ebullets = this.ebullets.filter((b) => b.life > 0);
  }

  updateGems(dt) {
    const p = this.p;
    // в разгоне начала кристаллы опыта притягиваются издалека: врагов больше, и опыт не должен оставаться на краю экрана
    const mag = this.st.magnet * (1 + 1.5 * this.warm());
    const mag2 = mag * mag;
    this.pickupStreakT -= dt;
    if (this.pickupStreakT <= 0) this.pickupStreak = 0;
    for (const g of this.gems) {
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d2 = dx * dx + dy * dy;
      if (g.pull || d2 < mag2) {
        g.pull = true;
        g.sp = Math.min(1100, g.sp + 1500 * dt);
        const d = Math.sqrt(d2) || 1;
        g.x += (dx / d) * g.sp * dt;
        g.y += (dy / d) * g.sp * dt;
        g.spr.setPosition(g.x, g.y);
        if (d < 20) {
          this.xp += g.v * this.st.xp;
          this.xpTotal = (this.xpTotal || 0) + g.v * this.st.xp;
          g.v = -1;
          this.free(g.spr);
          this.pickupStreak++;
          this.pickupStreakT = 0.4;
          audio.play('pickup', this.pickupStreak);
        }
      }
    }
    if (this.gems.some((g) => g.v < 0)) this.gems = this.gems.filter((g) => g.v >= 0);

    for (const it of this.items) {
      it.t += dt;
      it.spr.setScale((1 + 0.12 * Math.sin(it.t * 5)) / TS);
      let dx = p.x - it.x;
      let dy = p.y - it.y;
      if (it.type === 'token' && dx * dx + dy * dy < mag2) it.pull = true;
      if (it.pull) {
        // жетон тянется магнитом, как кристалл опыта
        const d = Math.hypot(dx, dy) || 1;
        it.x += (dx / d) * 700 * dt;
        it.y += (dy / d) * 700 * dt;
        it.spr.setPosition(it.x, it.y);
        dx = p.x - it.x;
        dy = p.y - it.y;
      } else if (it.gift) {
        // подарочный сундук сам плывёт к игроку
        const d = Math.hypot(dx, dy) || 1;
        it.x += (dx / d) * 150 * dt;
        it.y += (dy / d) * 150 * dt;
        it.spr.setPosition(it.x, it.y);
        dx = p.x - it.x;
        dy = p.y - it.y;
      }
      if (dx * dx + dy * dy < 30 * 30 && !this.dead && !this.ended && !this.pauseReasons.size) {
        it.done = true;
        this.free(it.spr);
        this.collectItem(it);
      }
    }
    if (this.items.some((i) => i.done)) this.items = this.items.filter((i) => !i.done);
  }

  updateFx(dt) {
    const g = this.fxGfx;
    g.clear();
    this.drawArenaFx(g, dt);
    // зоны орбитального удара
    for (const z of this.zones) {
      const k = 1 - Math.max(0, z.t) / z.T;
      const blink = 0.55 + 0.45 * Math.sin(this.t * 22);
      g.fillStyle(COLORS.red, 0.08 + 0.12 * k);
      g.fillCircle(z.x, z.y, z.r);
      g.fillStyle(COLORS.orange, 0.22 * blink);
      g.fillCircle(z.x, z.y, z.r * k);
      g.lineStyle(3, COLORS.red, 0.6 + 0.4 * blink);
      g.strokeCircle(z.x, z.y, z.r);
    }
    for (const z of this.pzones) {
      const k = z.t / z.T;
      g.fillStyle(COLORS.orange, 0.06 * k);
      g.fillCircle(z.x, z.y, z.r);
      g.lineStyle(2, COLORS.orange, 0.45 * k);
      g.strokeCircle(z.x, z.y, z.r);
    }
    // прицельные линии таранов и радиус камикадзе
    for (const e of this.tele) {
      if (!e.alive) continue;
      if (e.type === 'mirror') {
        const blink = 0.4 + 0.4 * Math.sin(this.t * 30);
        for (const a of e.lines) {
          const cx = Math.cos(a) * 1500;
          const cy = Math.sin(a) * 1500;
          g.lineStyle(26, e.color, 0.12);
          g.lineBetween(e.x - cx, e.y - cy, e.x + cx, e.y + cy);
          g.lineStyle(2, 0xffffff, blink);
          g.lineBetween(e.x - cx, e.y - cy, e.x + cx, e.y + cy);
        }
      } else if (e.type === 'lancer') {
        const L = 0.5 * Math.hypot(e.dvx, e.dvy);
        const a = 0.35 + 0.5 * (1 - e.lt / 0.7);
        g.lineStyle(6, e.color, a * 0.35);
        g.lineBetween(e.x, e.y, e.x + (e.dvx / Math.hypot(e.dvx, e.dvy)) * L, e.y + (e.dvy / Math.hypot(e.dvx, e.dvy)) * L);
        g.lineStyle(2, 0xffffff, a);
        g.lineBetween(e.x, e.y, e.x + (e.dvx / Math.hypot(e.dvx, e.dvy)) * L, e.y + (e.dvy / Math.hypot(e.dvx, e.dvy)) * L);
      } else {
        const k = 1 - Math.max(0, e.fuse) / 0.75;
        g.lineStyle(3, e.color, 0.4 + 0.5 * k);
        g.strokeCircle(e.x, e.y, 115);
        g.fillStyle(e.color, 0.1 + 0.15 * k);
        g.fillCircle(e.x, e.y, 115 * k);
      }
    }
    for (const b of this.bolts) {
      b.life -= dt;
      if (b.life <= 0) continue;
      const a = Math.min(1, b.life / 0.1);
      for (let pass = 0; pass < 2; pass++) {
        g.lineStyle(pass ? 1.5 : 5, pass ? 0xffffff : b.color, pass ? a : a * 0.6);
        g.beginPath();
        g.moveTo(b.pts[0][0], b.pts[0][1]);
        for (let i = 1; i < b.pts.length; i++) {
          const [x0, y0] = b.pts[i - 1];
          const [x1, y1] = b.pts[i];
          const segs = 4;
          for (let s = 1; s <= segs; s++) {
            const f = s / segs;
            const j = s === segs ? 0 : (Math.random() - 0.5) * 22;
            g.lineTo(x0 + (x1 - x0) * f + j, y0 + (y1 - y0) * f + j);
          }
        }
        g.strokePath();
      }
    }
    if (this.bolts.length) this.bolts = this.bolts.filter((b) => b.life > 0);
    // лазерные лучи
    for (const bm of this.beams) {
      bm.life -= dt;
      if (bm.life <= 0) continue;
      const k = bm.life / bm.T;
      g.lineStyle(bm.w * 2.2 * k, bm.color, 0.35 * k);
      g.lineBetween(bm.x1, bm.y1, bm.x2, bm.y2);
      g.lineStyle(bm.w * k, bm.color, 0.85 * k);
      g.lineBetween(bm.x1, bm.y1, bm.x2, bm.y2);
      g.lineStyle(Math.max(1.5, bm.w * 0.3 * k), 0xffffff, k);
      g.lineBetween(bm.x1, bm.y1, bm.x2, bm.y2);
    }
    if (this.beams.length) this.beams = this.beams.filter((b) => b.life > 0);
  }

  // ---------- Особые правила арен ----------
  updateArena(dt) {
    const rule = this.arenaDef.rule;
    const p = this.p;
    if (rule === 'wind') {
      // ветер медленно меняет направление и дует порывами
      const a = this.t * 0.06 + Math.sin(this.t * 0.11) * 1.6;
      const sp = (40 + 30 * Math.max(0, Math.sin(this.t * 0.33))) * (this.arenaDef.snow ? 0.6 : 1);
      this.wind.x = Math.cos(a) * sp;
      this.wind.y = Math.sin(a) * sp;
    } else if (rule === 'dark' && this.darkImg) {
      // фонарь растёт вместе с областью действия
      const L = 300 * Math.min(1.5, this.st.area);
      this.darkImg.setPosition(p.x, p.y).setScale(L / 90);
    } else if (this.zone) {
      // круг сжимается 60 секунд, держится 10, затем переезжает к игроку и снова становится большим
      const z = this.zone;
      z.t += dt;
      z.r = z.t < 60 ? ZONE_R0 - (ZONE_R0 - ZONE_R1) * (z.t / 60) : ZONE_R1;
      if (z.t >= 70) {
        Object.assign(z, { x: p.x, y: p.y, r: ZONE_R0, t: 0 });
        this.hud.warn(tr('zoneMoved'), COLORS.cyan);
      }
      const out = Math.hypot(p.x - z.x, p.y - z.y) > z.r;
      this.zoneOut = out;
      this.zoneWarnT -= dt;
      if (out && !(this.debug && this.debug.god)) {
        p.hp -= this.st.maxHp * 0.03 * dt;
        if (this.zoneWarnT <= 0) {
          this.zoneWarnT = 4;
          this.hud.warn(tr('zoneBack'), COLORS.red);
          audio.play('warn');
        }
        if (p.hp <= 0) this.die();
      }
    }
  }

  // Страж лабиринта: квадрат из стен вокруг игрока с одним-двумя проходами
  buildCage(e, rage) {
    const p = this.p;
    const S = rage ? 260 : 300;
    const n = 4;
    const sides = [
      [-S, -S, S, -S],
      [S, -S, S, S],
      [S, S, -S, S],
      [-S, S, -S, -S],
    ];
    // проходы на двух случайных сторонах
    const open = new Set();
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 2; i++) open.add(order[i] * n + ((Math.random() * n) | 0));
    sides.forEach(([x1, y1, x2, y2], si) => {
      for (let k = 0; k < n; k++) {
        if (open.has(si * n + k)) continue;
        const a = k / n;
        const b = (k + 1) / n;
        this.walls.push({ x1: p.x + x1 + (x2 - x1) * a, y1: p.y + y1 + (y2 - y1) * a, x2: p.x + x1 + (x2 - x1) * b, y2: p.y + y1 + (y2 - y1) * b, warn: 1, life: 4.5, dmg: e.dmg * 0.3, color: e.color });
      }
    });
    e.cageN++;
    if (e.cageN === 1) this.hud.warn(tr('cageWarn'), e.color);
    audio.play('warn');
  }

  // ближайшая точка стены и расстояние до неё
  wallDist(w, x, y) {
    const dx = w.x2 - w.x1;
    const dy = w.y2 - w.y1;
    const L2 = dx * dx + dy * dy || 1;
    const k = Math.max(0, Math.min(1, ((x - w.x1) * dx + (y - w.y1) * dy) / L2));
    const cx = w.x1 + dx * k;
    const cy = w.y1 + dy * k;
    return [cx, cy, Math.hypot(x - cx, y - cy)];
  }

  updateWalls(dt) {
    if (!this.walls.length) return;
    const p = this.p;
    for (const w of this.walls) {
      if (w.warn > 0) {
        w.warn -= dt;
        continue;
      }
      w.life -= dt;
      const [cx, cy, d] = this.wallDist(w, p.x, p.y);
      const R = 18;
      if (d < R) {
        // стена не пускает игрока и обжигает
        const k = d > 0.01 ? (R - d) / d : 1;
        p.x += (p.x - cx) * k;
        p.y += (p.y - cy) * k;
        // обжигает не чаще раза в секунду, чтобы игрок, прижатый к стене, успел уйти
        if (this.t - this.wallHurtT >= 1) {
          this.wallHurtT = this.t;
          this.hurt(w.dmg);
        }
      }
    }
    this.walls = this.walls.filter((w) => w.life > 0);
  }

  // лёгкое управление: куда отойти от опасности (пули, удары, рывки, стены, край зоны)
  dodgeVec() {
    const p = this.p;
    let fx = 0;
    let fy = 0;
    for (const b of this.ebullets) {
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 130 * 130 || b.vx * dx + b.vy * dy <= 0) continue;
      // уходим вбок от линии полёта пули
      const vl = Math.hypot(b.vx, b.vy) || 1;
      const px = -b.vy / vl;
      const py = b.vx / vl;
      const side = dx * px + dy * py >= 0 ? 1 : -1;
      const w = 1 - Math.sqrt(d2) / 130;
      fx += px * side * w * 1.6;
      fy += py * side * w * 1.6;
    }
    for (const z of this.zones) {
      const dx = p.x - z.x;
      const dy = p.y - z.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < z.r + 30) {
        fx += (dx / d) * 1.5;
        fy += (dy / d) * 1.5;
      }
    }
    for (const e of this.tele) {
      if (!e.alive) continue;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      if (e.type === 'mirror') {
        for (const a of e.lines) {
          const px = -Math.sin(a);
          const py = Math.cos(a);
          const dist = dx * px + dy * py;
          if (Math.abs(dist) < 60) {
            fx += px * (dist >= 0 ? 1 : -1) * 1.5;
            fy += py * (dist >= 0 ? 1 : -1) * 1.5;
          }
        }
      } else if (e.type === 'bomber' && d < 150) {
        fx += (dx / d) * 1.2;
        fy += (dy / d) * 1.2;
      } else if (e.type === 'lancer' && d < 420) {
        const l = Math.hypot(e.dvx, e.dvy) || 1;
        const px = -e.dvy / l;
        const py = e.dvx / l;
        const side = dx * px + dy * py;
        if (Math.abs(side) < 50) {
          fx += px * (side >= 0 ? 1 : -1) * 1.2;
          fy += py * (side >= 0 ? 1 : -1) * 1.2;
        }
      }
    }
    for (const w of this.walls) {
      const [cx, cy, d] = this.wallDist(w, p.x, p.y);
      if (d < 50) {
        fx += ((p.x - cx) / (d || 1)) * (1 - d / 50) * 1.5;
        fy += ((p.y - cy) / (d || 1)) * (1 - d / 50) * 1.5;
      }
    }
    if (this.zone) {
      const z = this.zone;
      const dx = z.x - p.x;
      const dy = z.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > z.r - 60) {
        fx += (dx / d) * 1.2;
        fy += (dy / d) * 1.2;
      }
    }
    return [fx, fy];
  }

  // совет для простого интерфейса: какое улучшение лучше взять
  recommend(opts) {
    const evp = opts.findIndex((o) => o.kind === 'p' && Object.keys(EVOLVE).some((k) => EVOLVE[k].pass === o.id && this.weapons[k] && !this.evo[k] && !this.passives[o.id]));
    if (evp >= 0) return evp;
    if (this.p.hp < this.st.maxHp * 0.35) {
      const h = opts.findIndex((o) => o.kind === 'heal');
      if (h >= 0) return h;
    }
    let best = -1;
    opts.forEach((o, i) => {
      if (o.kind === 'w' && o.lvl > 1 && (best < 0 || o.lvl > opts[best].lvl)) best = i;
    });
    if (best >= 0) return best;
    const nw = opts.findIndex((o) => o.kind === 'w' && Object.keys(this.weapons).length < 4);
    if (nw >= 0) return nw;
    const pp = opts.findIndex((o) => o.kind === 'p');
    return pp >= 0 ? pp : 0;
  }

  // рисунок правил арен и новых врагов (вызывается из updateFx)
  drawArenaFx(g, dt) {
    // щиты щитоносцев
    for (const e of this.shieldList) {
      if (!e.alive) continue;
      g.fillStyle(e.color, 0.05);
      g.fillCircle(e.x, e.y, 150);
      g.lineStyle(2, e.color, 0.35);
      g.strokeCircle(e.x, e.y, 150);
    }
    // стены Стража: сначала тонкий пунктир-предупреждение, потом яркая стена
    for (const w of this.walls) {
      if (w.warn > 0) {
        const blink = 0.3 + 0.4 * Math.sin(this.t * 24);
        g.lineStyle(3, w.color, blink);
        g.lineBetween(w.x1, w.y1, w.x2, w.y2);
      } else {
        const k = Math.min(1, w.life / 0.4);
        g.lineStyle(16, w.color, 0.3 * k);
        g.lineBetween(w.x1, w.y1, w.x2, w.y2);
        g.lineStyle(6, w.color, 0.9 * k);
        g.lineBetween(w.x1, w.y1, w.x2, w.y2);
        g.lineStyle(2, 0xffffff, k);
        g.lineBetween(w.x1, w.y1, w.x2, w.y2);
      }
    }
    // ветер: штрихи (на снежной арене — снежинки) летят по ветру
    if (this.arenaDef.rule === 'wind') {
      const v = this.cameras.main.worldView;
      if (v.width) {
        const N = this.reduceFx ? 20 : 46;
        while (this.windLines.length < N) this.windLines.push({ x: v.x + Math.random() * v.width, y: v.y + Math.random() * v.height, l: 0.5 + Math.random() });
        const ws = Math.hypot(this.wind.x, this.wind.y) || 1;
        const ux = this.wind.x / ws;
        const uy = this.wind.y / ws;
        const snow = this.arenaDef.snow;
        for (const w of this.windLines) {
          w.x += this.wind.x * (snow ? 1.2 : 3.2) * w.l * dt;
          w.y += (this.wind.y * (snow ? 1.2 : 3.2) + (snow ? 40 : 0)) * w.l * dt;
          if (w.x < v.x - 60 || w.x > v.right + 60 || w.y < v.y - 60 || w.y > v.bottom + 60) {
            w.x = v.x + Math.random() * v.width;
            w.y = v.y + Math.random() * v.height;
          }
          if (snow) {
            g.fillStyle(0xffffff, 0.55 * w.l);
            g.fillCircle(w.x, w.y, 2 + 2 * w.l);
          } else {
            g.lineStyle(2, this.arenaDef.grid, 0.3 * w.l);
            g.lineBetween(w.x, w.y, w.x - ux * 50 * w.l, w.y - uy * 50 * w.l);
          }
        }
      }
    }
    // сужающаяся зона и стрелка к ней, если игрок снаружи
    if (this.zone) {
      const z = this.zone;
      const blink = 0.6 + 0.4 * Math.sin(this.t * 6);
      g.lineStyle(18, COLORS.red, 0.12);
      g.strokeCircle(z.x, z.y, z.r + 9);
      g.lineStyle(5, COLORS.red, 0.75 * blink);
      g.strokeCircle(z.x, z.y, z.r);
      if (this.zoneOut) {
        const p = this.p;
        const a = Math.atan2(z.y - p.y, z.x - p.x);
        const ax = p.x + Math.cos(a) * 70;
        const ay = p.y + Math.sin(a) * 70;
        g.fillStyle(COLORS.cyan, 0.9);
        g.fillTriangle(ax + Math.cos(a) * 18, ay + Math.sin(a) * 18, ax + Math.cos(a + 2.4) * 14, ay + Math.sin(a + 2.4) * 14, ax + Math.cos(a - 2.4) * 14, ay + Math.sin(a - 2.4) * 14);
      }
    }
  }

  // ---------- Колонны арены: детерминированно по клеткам бесконечного поля ----------
  pillarAt(cx, cy) {
    const key = cx * 100003 + cy;
    let pl = this.pillars.get(key);
    if (pl !== undefined) return pl;
    pl = null;
    // клетка старта всегда пустая
    if (Math.abs(cx) > 0 || Math.abs(cy) > 0) {
      let h = (Math.imul(cx, 374761393) + Math.imul(cy, 668265263)) ^ 0x5bd1e995;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      const r1 = ((h >>> 0) % 10000) / 10000;
      const r2 = (((h >>> 8) * 7) % 1000) / 1000;
      const r3 = (((h >>> 4) * 13) % 1000) / 1000;
      if (r1 < this.arenaDef.pillars) pl = { x: (cx + 0.2 + r2 * 0.6) * PCELL, y: (cy + 0.2 + r3 * 0.6) * PCELL, r: 34 + r2 * 26 };
    }
    this.pillars.set(key, pl);
    return pl;
  }

  pushOut(o, r) {
    const cx0 = Math.floor(o.x / PCELL);
    const cy0 = Math.floor(o.y / PCELL);
    for (let cx = cx0 - 1; cx <= cx0 + 1; cx++)
      for (let cy = cy0 - 1; cy <= cy0 + 1; cy++) {
        const pl = this.pillarAt(cx, cy);
        if (!pl) continue;
        const dx = o.x - pl.x;
        const dy = o.y - pl.y;
        const rr = pl.r + r;
        const d2 = dx * dx + dy * dy;
        if (d2 < rr * rr) {
          const d = Math.sqrt(d2) || 1;
          o.x = pl.x + (dx / d) * rr;
          o.y = pl.y + (dy / d) * rr;
        }
      }
  }

  updatePillars() {
    const v = this.cameras.main.worldView;
    if (!v.width) return;
    const x0 = Math.floor((v.x - 80) / PCELL);
    const x1 = Math.floor((v.right + 80) / PCELL);
    const y0 = Math.floor((v.y - 80) / PCELL);
    const y1 = Math.floor((v.bottom + 80) / PCELL);
    const seen = new Set();
    for (let cx = x0; cx <= x1; cx++)
      for (let cy = y0; cy <= y1; cy++) {
        const pl = this.pillarAt(cx, cy);
        if (!pl) continue;
        const key = cx * 100003 + cy;
        seen.add(key);
        if (!this.pillarSpr.has(key)) {
          const tex = this.arenaDef.pillarTex;
          const spr = this.img(tex || 'pillar', 2).setPosition(pl.x, pl.y).setScale(pl.r / (tex ? 40 : 46) / TS);
          if (!tex) spr.setTint(this.arenaDef.pillarColor);
          this.pillarSpr.set(key, spr);
        }
      }
    for (const [key, spr] of this.pillarSpr)
      if (!seen.has(key)) {
        this.free(spr);
        this.pillarSpr.delete(key);
      }
    // старые клетки забываем, чтобы карта не росла бесконечно
    if (this.pillars.size > 4000) this.pillars.clear();
  }

  // горящие круги Сверхновой
  updatePZones(dt) {
    if (!this.pzones.length) return;
    for (const z of this.pzones) {
      z.t -= dt;
      z.tick -= dt;
      if (z.tick <= 0) {
        z.tick = 0.4;
        this.query(z.x, z.y, z.r, (e) => this.damage(e, z.dmg));
      }
    }
    this.pzones = this.pzones.filter((z) => z.t > 0);
  }

  // Простой бот для автотестов: убегает от ближайших врагов и идёт к кристаллам
  botMove() {
    const p = this.p;
    let fx = 0;
    let fy = 0;
    for (const e of this.enemies) {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 260 * 260) {
        const d = Math.sqrt(d2) || 1;
        const w = (e.boss ? 4 : 1) / (d * d);
        fx += dx * w * 1000;
        fy += dy * w * 1000;
      }
    }
    // хвост Змея тоже опасен
    if (this.boss && this.boss.segs) {
      for (const sg of this.boss.segs) {
        const dx = p.x - sg.x;
        const dy = p.y - sg.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 140 * 140) {
          const d = Math.sqrt(d2) || 1;
          fx += (dx / (d * d)) * 2500;
          fy += (dy / (d * d)) * 2500;
        }
      }
    }
    for (const b of this.ebullets) {
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 150 * 150) {
        const d = Math.sqrt(d2) || 1;
        fx += (dx / (d * d)) * 1500;
        fy += (dy / (d * d)) * 1500;
      }
    }
    for (const z of this.zones) {
      const dx = p.x - z.x;
      const dy = p.y - z.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < z.r + 50) {
        fx += (dx / d) * 6;
        fy += (dy / d) * 6;
      }
    }
    for (const e of this.tele) {
      if (!e.alive) continue;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      if (e.type === 'mirror') {
        for (const a of e.lines) {
          const px = -Math.sin(a);
          const py = Math.cos(a);
          const dist = dx * px + dy * py;
          if (Math.abs(dist) < 70) {
            const side = dist >= 0 ? 1 : -1;
            fx += px * side * 6;
            fy += py * side * 6;
          }
        }
      } else if (e.type === 'bomber' && d < 160) {
        fx += (dx / d) * 5;
        fy += (dy / d) * 5;
      } else if (e.type === 'lancer') {
        // уходим перпендикулярно линии рывка
        const l = Math.hypot(e.dvx, e.dvy) || 1;
        const px = -e.dvy / l;
        const py = e.dvx / l;
        const side = dx * px + dy * py >= 0 ? 1 : -1;
        fx += px * side * 3;
        fy += py * side * 3;
      }
    }
    let g = null;
    let gd = Infinity;
    for (const gg of this.gems) {
      const d = (gg.x - p.x) ** 2 + (gg.y - p.y) ** 2;
      if (d < gd) {
        gd = d;
        g = gg;
      }
    }
    if (g) {
      const dx = g.x - p.x;
      const dy = g.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      fx += (dx / d) * 1.2;
      fy += (dy / d) * 1.2;
    }
    // стены Стража и край сужающейся зоны
    if (this.walls.length || this.zone) {
      const [ex, ey] = this.dodgeVec();
      fx += ex * 4;
      fy += ey * 4;
    }
    if (this.zone) {
      // у края круга бот сразу идёт к центру
      const z = this.zone;
      const d = Math.hypot(z.x - p.x, z.y - p.y) || 1;
      if (d > z.r - 60) return [(z.x - p.x) / d, (z.y - p.y) / d];
      if (d > z.r - 160) {
        fx += ((z.x - p.x) / d) * 30;
        fy += ((z.y - p.y) / d) * 30;
      }
    }
    // слабое притяжение к центру, чтобы не уходить бесконечно
    fx += -p.x * 0.0004;
    fy += -p.y * 0.0004;
    const l = Math.hypot(fx, fy);
    return l > 0.05 ? [fx / l, fy / l] : [0, 0];
  }
}
