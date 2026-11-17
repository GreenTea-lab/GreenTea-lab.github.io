import {sourceLook} from './theme-catalog.js';
// Игра: раунды, управление, события мира → звук и интерфейс
import { EXPEDITIONS, expeditionOpen, expeditionStars } from './expeditions.js';
import { roundCoins } from './economy.js';
import { Sim, initPhysics, DT, R0, radiusFor, scoreForMass, GOLD_COINS } from './sim.js';
import { genMap, MAPS } from './city.js';
import { View } from './render.js';
import { botThink } from './bots.js';
import { UI } from './ui.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { iap } from './iap.js';
import { audio } from './audio.js';
import { SKINS, UPGRADES, ROUND_TIME, BOTS, BOT_TYPES, botLineup } from './data.js';
import { randomName } from './names.js';
import { t } from './i18n.js';
import { ensureDaily, questAdd } from './daily.js';

const TREES = new Set(['tree', 'pine', 'palm', 'sakura', 'snowpine', 'xtree', 'bamboo']);
const DBG = window.__HS_DEBUG || {};

// режимы: битва (2 мин, возрождение), выживание (без возрождения, до последней дыры),
// разрушение (одна дыра, % города), спокойный (без соперников и таймера)
export const MODES = ['battle', 'royale', 'solo', 'zen'];
const ROYALE_TIME = 180;

export const COIN_PACKS = { coins_1000: 1000, coins_3500: 3500, coins_10000: 10000 };

export class Game {
  constructor() {
    this.state = 'boot';
    this.paused = false;
    this.acc = 0;
    this.keys = new Set();
    this.mouse = null;
    this.stick = null;
    this.backgroundHolds = new Set();
  }

  async start(canvas, uiRoot, onProgress = async () => {}) {
    await onProgress(2);
    await Promise.all([initPhysics(), save.load()]);
    this.save = save;
    const d = save.data;
    sdk.noAds = !!d.noAds;
    this.quality = this._quality();
    await onProgress(3);
    this.view = new View(canvas, this.quality);
    this.ui = new UI(this, uiRoot);
    this._input(canvas);
    window.addEventListener('resize', () => this.view.resize());
    await iap.init(
      {
        coins_1000: { grant: () => this._grantCoins(1000) },
        coins_3500: { grant: () => this._grantCoins(3500) },
        coins_10000: { grant: () => this._grantCoins(10000) },
        disable_ads: {
          permanent: true,
          grant: () => {
            save.data.noAds = true;
            sdk.noAds = true;
          },
        },
      },
      () => save.flush(),
    );
    if (save.data.noAds) sdk.noAds = true;
    await onProgress(4);
    this.menu();
    this.last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      try {
        if (!this.manual) this.update(dt);
      } catch (e) {
        console.error(e);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _grantCoins(n) {
    save.data.coins += n;
    this.ui && this.ui.toast(t('coinsBought', { n }));
    this.ui && this.ui.refresh();
  }

  // переключение «быстрой графики» на лету
  setQuality() {
    this.quality = this._quality();
    this.view.setQuality(this.quality);
  }

  _quality() {
    const q = save.data.settings.quality;
    if (q === 'high' || q === 'low') return q === 'high' ? 'high' : 'low';
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820);
    return DBG.quality || (mobile ? 'mid' : 'high');
  }

  // ---------- мир ----------
  _newWorld(mapId, mode, attract) {
    if (this.sim) this.sim.free();
    const seed = this.expedition?.seed || DBG.seed || Math.floor(Math.random() * 1e6);
    const map = genMap(mapId, seed);
    const q = this.quality;
    // город восстанавливается везде, кроме «Разрушения»: там считается доля разрушенного
    const sim = new Sim(map, { maxBodies: q === 'high' ? 320 : q === 'mid' ? 150 : 110, physR: q === 'low' ? 34 : 42, iters: q === 'high' ? 0 : 2, seed, regen: attract || (mode !== 'solo' && mode !== 'expedition'), pickups: attract ? 4 : mode === 'battle' || mode === 'royale' ? 6 : 4 });
    this.sim = sim;
    this.map = map;
    this.mode = mode;
    const d = save.data;
    const up = (id) => UPGRADES.find((u) => u.id === id).val(d.up[id] || 0);
    const rivals = mode === 'battle' || mode === 'royale';
    const spawns = this._spawns(map, attract ? BOTS : rivals ? BOTS + 1 : 1);
    this.me = null;
    if (!attract) {
      const [x, z] = spawns.shift();
      this.me = sim.addHole({ name: t('you'), me: true, x, z, skin: d.skin, sizeBonus: up('size'), speedBonus: up('speed'), suck: up('suck'), grow: mode === 'solo' || mode === 'expedition' ? 2 : 1, noRespawn: mode === 'royale' });
    }
    if (rivals || attract) {
      const used = new Set();
      const lvl = d.level;
      const lineup = botLineup(lvl, spawns.length).sort(() => Math.random() - 0.5);
      spawns.forEach(([x, z], i) => {
        const name = randomName(used);
        used.add(name);
        const skin = SKINS[Math.floor(Math.random() * SKINS.length)].id;
        const type = lineup[i];
        const T = BOT_TYPES[type];
        const j = () => (Math.random() - 0.5) * 0.15;
        const grow = Math.min(0.15, lvl * 0.01);
        sim.addHole({ name, bot: true, x, z, skin, type, skill: Math.min(1, Math.max(0.1, T.skill + j())), aggro: Math.min(1, Math.max(0, T.aggro + j())), fear: T.fear, hunt: T.hunt, lead: T.lead, lazy: T.lazy, likesPlayer: !!T.likesPlayer && !(this.tut && !attract), noRespawn: mode === 'royale' && !attract, sizeBonus: Math.max(0, T.size + grow + j() * 0.5), speedBonus: Math.max(-0.1, T.speed + grow * 0.5) });
      });
    }
    sim.focus = this.me || sim.holes[0];
    this.view.setMap(map, sim);
    this.view.cam.x = sim.focus.x;
    this.view.cam.z = sim.focus.z;
    this.view.cam.dist = 20;
  }

  // точки появления: на дорогах, подальше друг от друга
  _spawns(map, n) {
    const out = [];
    const L = map.lines;
    for (let tries = 0; out.length < n && tries < 400; tries++) {
      const onX = Math.random() < 0.5;
      const a = L[1 + Math.floor(Math.random() * (L.length - 2))];
      const b = (Math.random() * 2 - 1) * (map.span / 2 - 10);
      const [x, z] = onX ? [a, b] : [b, a];
      if (out.every(([px, pz]) => Math.hypot(px - x, pz - z) > 22 - tries * 0.04)) out.push([x, z]);
    }
    while (out.length < n) out.push([(Math.random() - 0.5) * map.span, (Math.random() - 0.5) * map.span]);
    return out;
  }

  menu() {
    this.state = 'menu';
    this.paused = false;
    this.expedition = null;
    this.attractFocus = null;
    this.acc = 0;
    this.menuFrameTime = 0;
    this._newWorld(save.mapOpen(save.data.map) ? save.data.map : 'town', 'battle', true);
    document.body.classList.add('in-menu');
    this.ui.showMenu();
    this.view.frame(1 / 30, this.sim, this.sim.focus);
    this.view.render();
    sdk.gameplay(false);
    audio.setIntensity(0);
    audio.setMood('menu');
  }

  play(expeditionId = null) {
    const d = save.data;
    this.expedition = expeditionId ? EXPEDITIONS.find(l=>l.id===expeditionId && expeditionOpen(l.id,d)) : null;
    if(expeditionId && !this.expedition)return;
    document.body.classList.remove('in-menu');
    if (!this.expedition && !save.mapOpen(d.map)) d.map = 'town';
    if (!MODES.includes(d.mode)) d.mode = 'battle';
    this.state = 'play';
    this.paused = false;
    ensureDaily(d);
    // обучение — в первом раунде, пока не пройдено или не пропущено
    this.tut = d.tutDone ? null : { step: 0, t: 0, x: 0, z: 0 };
    this._newWorld(this.expedition?.map || d.map, this.expedition ? 'expedition' : d.mode, false);
    if (this.tut) {
      this.tut.x = this.me.x;
      this.tut.z = this.me.z;
    }
    const tb = UPGRADES.find((u) => u.id === 'time').val(d.up.time || 0);
    this.time = this.totalTime = this.expedition ? this.expedition.time : d.mode === 'zen' ? 0 : d.mode === 'royale' ? ROYALE_TIME : ROUND_TIME + (d.mode === 'solo' ? tb : 0);
    this.stats = { cars: 0, trees: 0, crates: 0, eaten: 0, kills: 0, maxR: R0, combo: 0, comboT: 0, popPts: 0, popT: 0, keepUsed: false, last30: false, lastTick: 99, nextGrow: Math.floor(this.me.r) + 1, rumbleT: 0, picks: 0, out: 0, gold: 0 };
    this.killer = null;
    this.feed = [];
    this.ui.showHud();
    if (this.tut) this.ui.showTut(this.tut.step);
    else this.ui.toast(t('go'));
    sdk.gameplay(true);
    audio.play('go');
    audio.setMood(this.map.id);
    audio.setIntensity(1);
  }

  pause(on) {
    if (this.state !== 'play' || (!on && (sdk.adActive || document.hidden || this.ui.modalOpen))) return;
    this.keys.clear(); this.mouse=null; this.stick=null;
    this.paused = on;
    sdk.gameplay(!on);
    if (on) this.ui.showPause();
  }

  // ---------- кадр ----------
  update(dt) {
    const sim = this.sim;
    if (!sim || document.hidden || this.paused || sdk.adActive || this.state === 'result') return;
    if(this.state === 'menu'){
      if(this.ui.modalOpen || this.backgroundHolds.size)return;
      this.menuFrameTime = (this.menuFrameTime || 0) + dt;
      if(this.menuFrameTime < 1 / 30)return;
      dt = Math.min(.1, this.menuFrameTime);
      this.menuFrameTime = 0;
    }
    this._adapt(dt);
    // радиус видимой земли вокруг дыры игрока: за ним физики нет
    sim.viewR = this.view.cam.dist * (this.view.portrait ? 0.62 : 0.78) + 6;
    const live = this.state === 'menu' || (this.state === 'play' && !this.paused) || this.state === 'result';
    if (live) {
      const speed = DBG.sub || 1;
      this.acc += dt * speed;
      let n = 0;
      const maxSteps = (this.quality === 'high' ? 3 : 2) * speed;
      // шагов за кадр — по округлению: при 60 Гц с дрожащим dt выходит ровно один шаг, без чередования 0/2 (рывков)
      const want = Math.min(maxSteps, Math.max(0, Math.round(this.acc / DT)));
      for (; n < want; n++) this._step();
      this.acc -= n * DT;
      if (Math.abs(this.acc) > DT * 2) this.acc = 0;
    }
    // камера: в меню следим за самым интересным ботом
    let focus = this.me;
    if (this.state !== 'play' || !focus) {
      if (!this.attractFocus || !this.attractFocus.alive || Math.random() < 0.0015) {
        const alive = sim.holes.filter((h) => h.alive);
        this.attractFocus = alive.sort((a, b) => b.r - a.r)[Math.floor(Math.random() * Math.min(3, alive.length))];
      }
      focus = this.state === 'result' && this.me ? this.me : this.attractFocus;
      if (focus) sim.focus = focus;
    }
    if (this.state === 'play' && this.me && !this.me.alive && this.killer && this.killer.alive) focus = { x: this.killer.x, z: this.killer.z, r: Math.max(this.killer.r, this.me.r) };
    this._events();
    this.view.frame(dt, sim, focus);
    sim.events.length = 0;
    this.view.render();
    this.ui.frame(dt);
  }

  // перемотка для тестов: n шагов без отрисовки
  ff(n) {
    for (let i = 0; i < n; i++) {
      this._step();
      if (this.state !== 'play') break;
      if (i % 30 === 29) {
        this._events();
        this.view.frame(0.5, this.sim, this.me);
        this.sim.events.length = 0;
      }
    }
  }

  _step() {
    const sim = this.sim;
    for (const h of sim.holes) if (h.bot) botThink(sim, h, DT);
    if (this.me && this.state === 'play') {
      if (DBG.auto) {
        this.me.skill = 0.9;
        this.me.aggro = 0.8;
        botThink(sim, this.me, DT);
      } else this._steer(this.me);
    }
    sim.step();
    if (this.state === 'play' && !this.paused) this._tick();
  }

  _tick() {
    const st = this.stats;
    const zen = this.mode === 'zen';
    this.time += zen ? DT : -DT;
    const me = this.me;
    st.maxR = Math.max(st.maxR, me.r);
    if (this.tut) this._tutTick();
    if (this.mode === 'royale' && !st.out && this.sim.holes.every((h) => h === me || !h.alive)) {
      // все соперники проглочены — победа досрочно
      this.end();
      return;
    }
    if (me.alive && me.r >= st.nextGrow) {
      st.nextGrow = Math.floor(me.r) + 1;
      audio.play('grow');
      this.ui.pulseSize();
    }
    if (st.comboT > 0) {
      st.comboT -= DT;
      if (st.comboT <= 0) st.combo = 0;
    }
    if (zen) return;
    if (this.time <= 30 && !st.last30) {
      st.last30 = true;
      this.ui.toast(t('last30'));
      audio.setMood('final');
    }
    const s = Math.ceil(this.time);
    if (s <= 10 && s !== st.lastTick && s > 0) {
      st.lastTick = s;
      audio.play('tick');
    }
    if (this.time <= 0) this.end();
  }

  // шаги обучения: каждый закрывается, когда игрок сделал то, о чём просили (или прошло время)
  _tutTick() {
    const tu = this.tut;
    const me = this.me;
    tu.t += DT;
    const st = this.stats;
    const rivals = this.mode === 'battle' || this.mode === 'royale';
    const done = [
      () => Math.hypot(me.x - tu.x, me.z - tu.z) > 7 || tu.t > 12,
      () => st.eaten >= 12 || tu.t > 16,
      () => me.r >= 1.9 || tu.t > 14,
      () => st.picks > 0 || tu.t > 14,
      () => tu.t > 8,
    ][tu.step];
    if (!done || !done()) return;
    tu.step++;
    tu.t = 0;
    if (tu.step === 4 && !rivals) tu.step++;
    if (tu.step >= 5) {
      this.skipTut();
      this.ui.toast(t('tutDone'));
      audio.play('level');
      return;
    }
    audio.play('beep');
    this.ui.showTut(tu.step);
  }

  skipTut() {
    this.tut = null;
    save.data.tutDone = true;
    save.write();
    this.ui.hideTut();
  }

  _quest(id, n) {
    for (const q of questAdd(save.data, id, n)) {
      this.ui.toast(t('questDone', { q: t('q_' + q.id, { n: q.need }) }));
      audio.play('coin');
    }
  }

  _steer(h) {
    if (!h.alive) {
      h.throttle = 0;
      return;
    }
    let dx = 0, dz = 0, thr = 0;
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) dz -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) dz += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) dx -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) dx += 1;
    if (dx || dz) thr = 1;
    else if (this.stick && this.stick.on) {
      dx = this.stick.dx;
      dz = this.stick.dy;
      thr = Math.min(1, Math.hypot(dx, dz) / 50);
    } else if (this.mouse && this.mouse.inside) {
      const p = this.view.toScreen(h.x, 0, h.z, {});
      dx = this.mouse.x - p.x;
      dz = this.mouse.y - p.y;
      const L = Math.hypot(dx, dz);
      const R = Math.max(30, (h.r / this.view.cam.dist) * window.innerHeight * 0.8);
      thr = Math.max(0, Math.min(1, (L - R * 0.3) / (R * 2)));
    }
    const L = Math.hypot(dx, dz);
    if (L > 0.001) {
      h.dirX = dx / L;
      h.dirZ = dz / L;
    }
    h.throttle = thr;
  }

  // ---------- события ----------
  _events() {
    const sim = this.sim;
    const me = this.me;
    const play = this.state === 'play';
    let breaks = 0;
    for (const e of sim.events) {
      if (e.t === 'eat') {
        if (play && e.h === me) {
          const st = this.stats;
          st.eaten++;
          st.combo++;
          st.comboT = 0.7;
          st.popPts += e.pts || 0;
          const k = e.it.kind, lk = sourceLook(e.it);
          if(['crate','pallet'].includes(lk))st.crates++;
          if (k === 'car') {st.cars++;this._quest('cars', 1);}
          else if (k === 'person' || k === 'animal') this._quest('people', 1);
          else if (k === 'block') this._quest('blocks', 1);
          if (TREES.has(lk)) {st.trees++;this._quest('trees', 1);}
          if (e.it.gold) {
            st.gold++;
            this._quest('gold', 1);
            audio.play('level');
            this.ui.toast(t('goldAte', { n: GOLD_COINS }));
          }
          audio.play(e.it.vol > 20 ? 'bigEat' : 'eat', { size: Math.min(1, e.it.rad / 4), combo: st.combo });
        } else if (this.state === 'menu' && e.h === sim.focus && Math.random() < 0.5) audio.play('eat', { size: Math.min(1, e.it.rad / 4), combo: 0 });
      } else if (e.t === 'break') {
        breaks++;
        if (this._near(e.p)) audio.play('crack', e.big ? 1 : 0.4);
      } else if (e.t === 'boom') {
        if (this._near(e.p)) audio.play('boom');
      } else if (e.t === 'hit') {
        // глухой удар падающей стены
        if (e.d > 3 && this._near(e.p)) audio.play('crack', 0.3);
      } else if (e.t === 'holeEat') {
        if (!play) continue;
        if (e.a === me) {
          this.stats.kills++;
          this._quest('kills', 1);
          audio.play('gulp');
          this.ui.toast(t('youAte', { b: e.b.name, n: e.pts }));
        } else if (e.b === me) {
          this.killer = e.a;
          this.massBefore = e.previousMass;
          this.stats.combo=0;this.stats.comboT=0;this.stats.popPts=0;
          audio.play('eaten');
          if (this.mode === 'royale') {
            // выбыл: место — сколько дыр ещё осталось, плюс один
            this.stats.out = this.sim.holes.filter((h) => h.alive).length + 1;
            this.ui.showOut(e.a.name, this.stats.out, !this.stats.keepUsed);
          } else this.ui.showDeath(e.a.name, !this.stats.keepUsed);
        } else {
          this.ui.feedMsg(t('ate', { a: e.a.name, b: e.b.name }));
          if (this.mode === 'royale') this.ui.feedMsg(t('left', { n: this.sim.holes.filter((h) => h.alive).length }));
        }
      } else if (e.t === 'pick') {
        if (play && e.h === me) {
          this.stats.picks++;
          this._quest('picks', 1);
          audio.play('pick');
          this.ui.toast(t('pk_' + e.type));
        }
      } else if (e.t === 'gold') {
        if (play) {
          audio.play('pick');
          this.ui.toast(t('goldNew'));
        }
      } else if (e.t === 'regen') {
        if (e.big && this._near(e.p)) audio.play('rise');
      } else if (e.t === 'respawn') {
        if (play && e.h === me) {
          audio.play('respawn');
          this.ui.hideDeath();
          this.killer = null;
        }
      }
    }
    if (breaks > 3 && play) audio.play('rumble');
    // всплывающие очки собираются пачкой
    if (play && this.stats) {
      const st = this.stats;
      st.popT -= 1 / 60;
      if (st.popPts > 0 && st.popT <= 0 && me.alive) {
        this.ui.popPoints(me, st.popPts, st.combo);
        st.popPts = 0;
        st.popT = 0.3;
      }
    }
  }

  _near(p) {
    const f = this.sim.focus;
    return f && Math.hypot(p.x - f.x, p.z - f.z) < 30 + f.r * 3;
  }

  // «вернуть размер» за рекламу
  keepSize() {
    const me = this.me;
    if (!me || me.alive || this.stats.keepUsed) return;
    if(!sdk.canReward() || sdk.adActive)return;
    sdk.showRewarded(() => {
      this.stats.keepUsed = true;
      me.mass = this.massBefore;
      me.pts = scoreForMass(me.mass);
      me.respawnT = 0;
      if (this.mode === 'royale' && this.state === 'play') {
        // второй шанс в «Выживании»: возвращаемся в игру
        this.stats.out = 0;
        this.sim.respawn(me);
      }
    },()=>{const button=this.ui.scr.querySelector('#keep');if(button)button.disabled=!!this.stats.keepUsed;});
  }

  // «Выживание»: выбывший игрок сам решает, когда смотреть итоги
  finishOut() {
    if (this.state === 'play') this.end();
  }

  // «Спокойный» режим заканчивается по кнопке
  finishZen() {
    if (this.state === 'play') this.end();
  }

  ranking() {
    // в «Выживании» выше те, кто ещё жив; выбывшие — по времени вылета
    if (this.mode === 'royale' && this.state !== 'menu')
      return [...this.sim.holes].sort((a, b) => (b.alive - a.alive) || (a.alive ? b.pts - a.pts : (b.deadAt || 0) - (a.deadAt || 0)));
    return [...this.sim.holes].sort((a, b) => b.pts - a.pts);
  }

  end() {
    if (this.state !== 'play') return;
    this.state = 'result';
    sdk.gameplay(false);
    const d = save.data;
    const me = this.me;
    const rank = this.ranking();
    const place = this.mode === 'royale' && this.stats.out ? this.stats.out : rank.indexOf(me) + 1;
    const pts = me.pts;
    const recordKey=this.mode+':'+this.map.id;
    if(pts>(d.records[recordKey]?.pts||0))d.records[recordKey]={pts,map:this.map.id,mode:this.mode};
    const res = { mode: this.mode, map: this.map.id, pts, place, eaten: this.stats.eaten, kills: this.stats.kills, maxR: this.stats.maxR, time: this.time };
    // «Спокойный» без таймера — в таблицу рекордов не идёт, у него свой рекорд
    res.newBest = this.mode === 'zen' ? pts > (d.zenBest || 0) : pts > d.best;
    if (res.newBest) {
      if (this.mode === 'zen') d.zenBest = pts;
      else d.best = pts;
    }
    if(this.expedition){
      res.expedition=this.expedition.id;
      res.stars=expeditionStars(this.expedition,this.stats);
      const prev=d.expeditions[res.expedition]||0;
      res.newStars=Math.max(0,res.stars-prev);
      d.expeditions[res.expedition]=Math.max(prev,res.stars);
      if(res.stars>0 && !d.mastery[this.map.id]){
        d.mastery[this.map.id]=true;res.mastery=true;
        const skin=SKINS.find(k=>k.mastery===this.map.id);
        if(skin && !d.skins.includes(skin.id))d.skins.push(skin.id);
      }
    }else if (this.mode === 'solo') {
      res.pct = Math.round(this.sim.progress() * 1000) / 10;
      res.stars = res.pct >= 65 ? 3 : res.pct >= 45 ? 2 : res.pct >= 25 ? 1 : 0;
      const prev = d.solo[this.map.id] || { pct: 0, pts: 0, stars: 0 };
      res.newBest = res.pct > prev.pct;
      d.solo[this.map.id] = { pct: Math.max(prev.pct, res.pct), pts: Math.max(prev.pts, pts), stars: Math.max(prev.stars, res.stars) };
    } else if(this.mode==='battle'||this.mode==='royale') {
      if (place === 1) {
        d.wins++;
        this._quest('win', 1);
      }
    }
    this._quest('rounds', 1);
    this._quest('size', this.stats.maxR);
    if (this.mode === 'solo') this._quest('solo', res.pct);
    res.elapsed=this.mode==='zen'?this.time:Math.max(0,this.totalTime-this.time);
    res.coins = roundCoins({mode:this.mode,pts,place,stars:res.stars||0,newStars:res.newStars||0,elapsed:res.elapsed,gold:this.stats.gold});
    d.coins += res.coins;
    d.rounds++;
    const oldLevel = d.level;
    res.xp = Math.round(Math.sqrt(pts) * (this.mode === 'zen' ? 1.8 : 2.5)) + (this.mode === 'battle' || this.mode === 'royale' ? Math.max(0, 11 - place) * 8 : this.mode === 'solo' ? res.stars * 25 : 0);
    res.levels = save.addXp(res.xp);
    res.maps = MAPS.filter((m) => m.need > oldLevel && m.need <= d.level).map((m) => m.id);
    save.write();
    // Personal records are kept per mode and location.
    if (this.tut) this.skipTut();
    this.ui.hideTut();
    audio.play(place === 1 || (this.mode === 'solo' && res.stars > 0) || this.mode === 'zen' ? 'win' : 'lose');
    audio.setIntensity(0);
    audio.setMood('menu');
    this.lastRes = res;
    this.ui.showResult(res);
  }

  doubleReward() {
    const res = this.lastRes;
    if (!res || res.doubled || sdk.adActive || !sdk.canReward()) return;
    sdk.showRewarded(() => {
      res.doubled = true;
      save.data.coins += res.coins;
      save.write();
      this.ui.showResult(res);
    });
  }

  // после раунда — полноэкранная реклама в логической паузе
  afterRound(next) {
    sdk.showInterstitial(() => (next === 'again' ? this.play(this.lastRes?.expedition || null) : this.menu()));
  }


  continueCity(){
    if(this.state!=='result')return;
    this.expedition=null;this.mode='zen';this.state='play';this.paused=false;this.time=0;
    this.sim.enableRegen();this.me.pts=scoreForMass(this.me.mass);
    this.stats={cars:0,trees:0,crates:0,eaten:0,kills:0,maxR:this.me.r,combo:0,comboT:0,popPts:0,popT:0,keepUsed:false,nextGrow:Math.floor(this.me.r)+1,picks:0,out:0,gold:0};
    this.ui.showHud();sdk.gameplay(true);audio.setMood(this.map.id);audio.setIntensity(1);
  }
  _adapt(dt){
    if(save.data.settings.quality!=='auto' || this.state!=='play' || this.sim.time<6)return;
    this._perfT=(this._perfT||0)+dt;this._perfFrames=(this._perfFrames||0)+1;
    if(this._perfT<5)return;
    const fps=this._perfFrames/this._perfT;
    if(fps<36 && this.quality!=='low'){
      this.quality=this.quality==='high'?'mid':'low';this.view.setQuality(this.quality);
      this.sim.maxBodies=this.quality==='mid'?150:110;
      this.sim.world.numSolverIterations=2;
    }
    this._perfT=0;this._perfFrames=0;
  }

  // ---------- ввод ----------
  _input(canvas) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if ((e.code === 'Escape' || e.code === 'KeyP') && this.state === 'play' && !this.paused) this.pause(true);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') this.mouse = { x: e.clientX, y: e.clientY, inside: true };
    });
    canvas.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && this.mouse) this.mouse.inside = false;
    });
    // плавающий джойстик: появляется под пальцем
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      if (this.stick && this.stick.on) return;
      this.stick = { on: true, id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 };
      this.ui.stick(this.stick);
    });
    window.addEventListener('pointermove', (e) => {
      const s = this.stick;
      if (!s || !s.on || e.pointerId !== s.id) return;
      let dx = e.clientX - s.x0, dy = e.clientY - s.y0;
      const L = Math.hypot(dx, dy);
      const M = 60;
      if (L > M) {
        // база подтягивается за пальцем, чтобы не упираться в край
        s.x0 += (dx / L) * (L - M);
        s.y0 += (dy / L) * (L - M);
        dx = e.clientX - s.x0;
        dy = e.clientY - s.y0;
      }
      s.dx = dx;
      s.dy = dy;
      this.ui.stick(s);
    });
    const up = (e) => {
      const s = this.stick;
      if (!s || e.pointerId !== s.id) return;
      s.on = false;
      this.ui.stick(s);
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }
}

export { radiusFor };
