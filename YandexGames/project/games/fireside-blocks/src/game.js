// Контроллер игры: экраны, ввод (перетаскивание одним пальцем или «нажми — поставь»), ходы, помощники, реклама.
import { N, SHAPE, Game as Core, canPlace, wouldClear, fits } from './core.js';
import { View } from './view.js';
import { UI } from './ui.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { iap } from './iap.js';
import { audio } from './audio.js';
import { t, fmt } from './i18n.js';
import { level, starsFor, SEASONS, COUNT } from './levels.js';
import { hint as botHint, planSet } from './bot.js';
import { unlockedDecor, DECOR } from './table.js';
import { STYLES } from './gfx.js';
import {trackMove,trackWin,weekly} from './progress.js';
import {recordClassic,recordDailyWin,recordItems} from './activity.js';
import {preloadRoom} from './room-background.js';

export const BOOST_PRICE = { hint: 30, undo: 50, hammer: 70, shuffle: 90 };
export const REVIVE_PRICE = 150;
const AD_GAP = 150 * 1000; // не чаще раза в 2,5 минуты

const realSeason = () => ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'][new Date().getMonth()];

export class App {
  constructor() {
    this.save = save;
    this.state = 'menu';
    this.st = { game: null, drag: null, preview: null, hint: null, selected: -1, hover: -1, hammer: false, appear: [0, 0, 0], fits: [true, true, true], ret: null };
    this.lastAd = Date.now();
    this.dbg = window.__FB_DEBUG || {};
    this.blocked = false;
  }

  async start(cv, root) {
    await save.load();
    await preloadRoom(unlockedDecor(save.stars()),innerWidth,innerHeight);
    sdk.noAds = !!save.data.noAds;
    this.view = new View(cv);
    window.addEventListener('backgroundready', () => this.view.W && this.view.rebuild());
    this.view.style = save.data.style;
    this.applyCosmetics();
    this.view.ambientOn = save.data.settings.ambient !== false;
    this.ui = new UI(this, root);
    this.applyDecor(realSeason(), false, 'hearth');
    const rs = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.view.resize(window.innerWidth, window.innerHeight, dpr);
      this.ui.layout(this.view.L);
    };
    window.addEventListener('resize', () => {
      clearTimeout(this._rt);
      this._rt = setTimeout(rs, 60);
    });
    rs();
    this.bindInput(cv);
    // покупки
    await iap.init(
      {
        coins_1000: { grant: () => this.addCoins(1000) },
        coins_3500: { grant: () => this.addCoins(3500) },
        coins_10000: { grant: () => this.addCoins(10000) },
        disable_ads: { permanent: true, grant: () => { save.data.noAds = true; sdk.noAds = true; } },
      },
      () => save.flush(),
    );
    iap.onChange((id, restoring) => {
      if (!restoring) {
        audio.play('buy');
        this.ui.toast(id === 'disable_ads' ? t('noAdsDone') : t('bought'));
      }
      this.ui.refresh();
    });
    if (save.data.noAds) sdk.noAds = true;
    this.ui.menu();
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  frame(dt) {
    if (this.dbg.freeze) return; // промо-рендер ведёт кадры сам
    const v = this.view;
    if (this.state === 'play' && this.st.game) {
      // плавное затемнение поля, когда места нет
      const target = this.noSpace ? 1 : 0;
      v.dim += (target - v.dim) * Math.min(1, dt * 4);
    } else v.dim = 0;
    v.draw(dt, this.st);
    this.ui.tick && this.ui.tick(dt);
  }

  // ---------- фон ----------
  // scene — id главы путешествия: тогда вместо стола рисуется фон главы
  applyDecor(season, force, scene = null) {
    scene=SEASONS.find(s=>s.id===scene)?.bg || scene;
    const ids = scene==='hearth' ? unlockedDecor(save.stars()) : [];
    const v = this.view;
    const changed = force || season !== v.season || scene !== v.scene || ids.join() !== v.decor.join();
    v.season = season;
    v.scene = scene;
    v.decor = ids;
    if (changed && v.W) v.rebuild();
  }
  setViewMode(m) {
    if (this.view.rebuildNeeded) {
      this.view.rebuildNeeded = false;
      this.view.mode = m;
      if (this.view.W) this.view.rebuild();
      return;
    }
    if (this.view.mode === m) return;
    this.view.mode = m;
    if (this.view.W) this.view.rebuild();
  }

  // ---------- монеты и помощники ----------
  addCoins(n) {
    save.data.coins += n;
    save.write();
    this.ui.refresh();
  }

  // ---------- старт партии ----------
  startClassic(resume) {
    this.dailyRun = null;
    this.eventRun = null;
    this.mode = 'classic';
    this.levelIdx = -1;
    const d = save.data;
    let g;
    if (resume && d.classic) {
      try {
        g = Core.fromJSON(d.classic, null);
      } catch (e) {
        g = null;
      }
    }
    if (!g) {
      g = new Core({ seed: this.dbg.seed ?? ((Math.random() * 1e9) | 0), mode: 'classic' });
      if (!d.tut.classic) this.tutorialBoard(g);
      else g.refill();
    }
    this.revived = false;
    this.begin(g, realSeason());
    audio.setMood('classic');
    if (!d.tut.classic) this.ui.tutorial(1);
  }

  // первая партия: два почти собранных ряда и подходящая фигура
  tutorialBoard(g) {
    for (let x = 0; x < N; x++) {
      if (x < 3 || x > 5) g.board[5 * N + x] = { c: 3 };
      if (x !== 2 && x !== 3) g.board[7 * N + x] = { c: 4 };
    }
    g.board[6 * N + 0] = { c: 1 };
    g.board[6 * N + 7] = { c: 0 };
    g.tray = [{ s: 'o2', c: 2 }, { s: 'i3h', c: 0 }, { s: 'c1', c: 5 }];
  }

  startLevel(i, options = {}) {
    if (!Number.isInteger(i) || i < 0 || i >= COUNT) return;
    this.dailyRun = options.daily || null;
    this.eventRun = options.event || null;
    this.mode = 'adv';
    this.levelIdx = i;
    const L = level(i);
    let g;
    const saved = this.eventRun ? weekly().run : this.dailyRun ? save.data.challenge.run : options.resume ? save.data.adventure : null;
    if (saved?.idx === i && (!this.dailyRun || saved.key === this.dailyRun.key) && (!this.eventRun || saved.key===this.eventRun.key)) {
      try { g = Core.fromJSON(saved.game, L); } catch (_) {}
    }
    if (!g) {
      g = new Core({ seed: this.dailyRun?.seed ?? this.eventRun?.seed ?? this.dbg.seed ?? (L.seeds ? L.seeds[Math.floor(Math.random()*L.seeds.length)] : i * 7777 + Math.floor(Math.random() * 1000)), board: L.board, level: L, mode: 'adv' });
      g.refill();
    }
    this.revived = false;
    this.begin(g, L.S.id);
    audio.setMood(L.S.id);
    this.ui.levelIntro(L);
    this.saveAdventure();
  }

  restartLevel(){
    const options={daily:this.dailyRun,event:this.eventRun};
    if(this.eventRun)weekly().run=null;
    else if(this.dailyRun)save.data.challenge.run=null;
    else save.data.adventure=null;
    this.startLevel(this.levelIdx,options);
  }

  begin(g, season) {
    this.round = (this.round || 0) + 1;
    this.st.game = g;
    this.st.drag = null;
    this.st.preview = null;
    this.st.hint = null;
    this.st.selected = -1;
    this.st.hammer = false;
    this.st.ret = null;
    this.noSpace = false;
    this.finished = false;
    this.state = 'play';
    const adv = this.mode === 'adv';
    if (this.view.advHud !== adv) {
      this.view.advHud = adv;
      this.view.layout();
      this.view.rebuildNeeded = true;
    }
    const chapter=SEASONS.find(s=>s.id===season);
    this.applyDecor(season, false, adv ? chapter?.bg || season : null);
    this.setViewMode('play');
    this.view.fx = { pops: [], fly: [], parts: [], texts: [], items: [], flashes: [] };
    this.st.appear = [this.view.t, this.view.t, this.view.t];
    this.updateFits();
    this.ui.hud();
    sdk.gameplay(true);
    if (!g.canAny()) setTimeout(() => this.checkStuck(), 300);
  }

  toMenu() {
    this.saveAdventure();
    this.round = (this.round || 0) + 1;
    this.state = 'menu';
    this.st.game = null;
    this.st.drag = null;
    sdk.gameplay(false);
    this.applyDecor(realSeason(), false, 'hearth');
    this.setViewMode('menu');
    audio.setMood('menu');
    this.ui.menu();
  }

  updateFits() {
    const g = this.st.game;
    this.st.fits = g.tray.map((p) => !p || fits(g.board, SHAPE[p.s]));
  }

  // ---------- ввод ----------
  bindInput(cv) {
    const pos = (e) => ({ x: e.clientX, y: e.clientY });
    cv.addEventListener('pointerdown', (e) => {
      if (!this.canInput()) return;
      audio.unlock();
      try {
        cv.setPointerCapture(e.pointerId);
      } catch (err) {}
      this.down(pos(e), e.pointerType !== 'mouse');
    });
    cv.addEventListener('pointermove', (e) => {
      if (!this.canInput()) return;
      this.move(pos(e), e.pointerType !== 'mouse');
    });
    const up = (e) => {
      if (!this.canInput()) return this.cancelDrag();
      this.up(pos(e));
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', (e) => this.cancelDrag());
  }

  down(p, touch) {
    if (!this.canInput()) return;
    const v = this.view, st = this.st, g = st.game;
    if (this.busyUntil && v.t < this.busyUntil) return;
    if (st.hammer) {
      const i = v.cellAt(p.x, p.y);
      if (i >= 0 && g.board[i]) this.doSmash(i);
      return;
    }
    const s = v.slotAt(p.x, p.y);
    if (s >= 0 && g.tray[s]) {
      st.hint = st.hint && st.hint.slot === s ? st.hint : null;
      const c = v.slotCenter(s);
      const sh = SHAPE[g.tray[s].s];
      // на сенсорном экране нижний ряд фигуры встаёт под кончик пальца:
      // блок ложится в ту клетку, на которую показывает палец, а остальная фигура видна над ним
      const lift = touch ? v.L.cell * (sh.h / 2 - 0.45) : 0;
      st.drag = { slot: s, t0: v.t, sx: c.x, sy: c.y, cx: p.x, cy: p.y - lift, lift, px: p.x, py: p.y, down: performance.now(), moved: false, wasSel: st.selected === s };
      st.selected = -1;
      audio.play('pick');
      this.calcPreview();
      return;
    }
    // режим «выбрал фигуру — нажми на клетку»
    if (st.selected >= 0 && v.cellAt(p.x, p.y) >= 0) {
      this.tapPlace(p);
      return;
    }
    if (st.selected >= 0) {
      st.selected = -1;
      st.preview = null;
    }
  }

  move(p, touch) {
    if (!this.canInput()) return;
    const st = this.st, v = this.view;
    st.hover = v.cellAt(p.x, p.y);
    if (st.drag) {
      const d = st.drag;
      d.cx = p.x;
      d.cy = p.y - d.lift;
      if (Math.hypot(p.x - d.px, p.y - d.py) > 14) d.moved = true;
      this.calcPreview();
    } else if (st.selected >= 0 && !touch) {
      // подсказка места под курсором для выбранной фигуры
      this.calcPreviewAt(st.selected, p.x, p.y);
    }
  }

  up(p) {
    if (!this.canInput()) return this.cancelDrag();
    const st = this.st, v = this.view, g = st.game;
    const d = st.drag;
    if (!d) return;
    st.drag = null;
    const quick = !d.moved && performance.now() - d.down < 450;
    if (quick) {
      // короткое нажатие — выбрать фигуру (повторное — снять выбор)
      st.selected = d.wasSel ? -1 : d.slot;
      st.preview = null;
      if (st.selected >= 0) this.ui.toastOnce('tapHint', t('tapHint'));
      return;
    }
    const pv = st.preview;
    st.preview = null;
    if (pv && pv.ok) {
      this.placeAt(d.slot, pv.x, pv.y);
    } else {
      st.ret = { slot: d.slot, p: g.tray[d.slot], x: d.cx, y: d.cy, t0: v.t };
      setTimeout(() => (st.ret = null), 190);
      audio.play('back');
    }
  }

  cancelDrag() {
    this.st.drag = null;
    this.st.preview = null;
  }

  canInput() {
    return this.state === 'play' && !this.finished && !this.ui.modalOpen && !sdk.adActive && !this.blocked && !document.hidden;
  }

  // позиция фигуры по центру точки → ближайшее допустимое место (с «магнитом» на 1 клетку)
  snap(slot, cx, cy) {
    const g = this.st.game, L = this.view.L;
    const sh = SHAPE[g.tray[slot].s];
    const fx = (cx - (sh.w * L.cell) / 2 - L.gx) / L.cell;
    const fy = (cy - (sh.h * L.cell) / 2 - L.gy) / L.cell;
    const bx = Math.round(fx), by = Math.round(fy);
    // слишком далеко от поля
    if (fx < -1.6 || fy < -1.6 || fx > N - sh.w + 1.6 || fy > N - sh.h + 1.6) return null;
    let best = null, bd = 1e9;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = bx + dx, y = by + dy;
      if (!canPlace(g.board, sh, x, y)) continue;
      const dist = Math.hypot(x - fx, y - fy);
      if (dist < bd && dist < 1.05) {
        bd = dist;
        best = [x, y];
      }
    }
    return best;
  }

  calcPreview() {
    const d = this.st.drag;
    if (!d) return;
    this.calcPreviewAt(d.slot, d.cx, d.cy);
  }
  calcPreviewAt(slot, cx, cy) {
    const st = this.st, g = st.game;
    const p = g.tray[slot];
    if (!p) return (st.preview = null);
    const sh = SHAPE[p.s];
    const s = this.snap(slot, cx, cy);
    if (!s) return (st.preview = null);
    const [x, y] = s;
    const cells = sh.cells.map(([dx, dy]) => (y + dy) * N + x + dx);
    const lines = wouldClear(g.board, sh, x, y);
    st.preview = { ok: true, x, y, cells, color: p.c, lines: lines.rows.length + lines.cols.length ? lines : null };
  }

  tapPlace(p) {
    const st = this.st;
    const slot = st.selected;
    const s = this.snap(slot, p.x, p.y);
    if (!s) {
      audio.play('deny');
      return;
    }
    st.selected = -1;
    st.preview = null;
    this.placeAt(slot, s[0], s[1]);
  }

  // ---------- ход ----------
  placeAt(slot, x, y) {
    if (!this.canInput()) return;
    const st = this.st, g = st.game, v = this.view, L = v.L;
    const ev = g.place(slot, x, y);
    if (!ev) {
      audio.play('deny');
      return;
    }
    trackMove(ev);
    st.hint = null;
    audio.play('drop');
    v.addPops(ev.cells);
    const sh = ev.shape;
    const cx = L.gx + (x + sh.w / 2) * L.cell, cy = L.gy + (y + sh.h / 2) * L.cell;
    if (ev.n) {
      audio.play('clear', { lines: ev.n, combo: ev.combo });
      v.addClear(ev.cleared, { x: cx, y: cy });
      const words = ['', t('pr1'), t('pr2'), t('pr3'), t('pr4'), t('pr5')];
      const w = ev.allClear ? t('allClear') : ev.n >= 2 || ev.combo >= 3 ? words[Math.min(5, ev.n + (ev.combo >= 3 ? 1 : 0))] : '';
      const bx = L.gx + (L.cell * N) / 2, by = L.gy + (L.cell * N) / 2;
      if (w) {
        v.addText(w, bx, by - L.cell * 0.4, { big: true, size: L.cell * (ev.allClear ? 1.05 : 0.95), color: '#ffe48a', dur: 1.4, rise: L.cell * 0.5, delay: 0.1 });
        audio.play(ev.allClear ? 'allclear' : 'praise');
      }
      if (ev.combo >= 2) v.addText(t('combo', { n: ev.combo }), bx, by + L.cell * 0.7, { size: L.cell * 0.55, color: '#bff0a8', dur: 1.2, rise: L.cell * 0.4, delay: 0.2 });
      v.addText('+' + fmt(ev.gained), cx, cy, { size: L.cell * 0.62, dur: 1.0 });
      // предметы летят к цели
      ev.items.forEach(([i, it], k) => {
        const r = v.cellRect(i);
        const to = this.ui.goalPos(it) || { x: v.W / 2, y: 40 };
        v.addItemFly(it, { x: r.x + r.s / 2, y: r.y + r.s / 2 }, to, 0.15 + k * 0.06, () => {
          audio.play('item', k);
          this.ui.bumpGoal(it);
        });
      });
    }
    if (ev.refilled) {
      st.appear = [v.t + 0.15, v.t + 0.22, v.t + 0.29];
      setTimeout(() => audio.play('new'), 150);
    }
    this.updateFits();
    this.ui.hudUpdate();
    this.ui.tutMove();
    if (this.mode === 'classic') this.saveClassic();
    else this.saveAdventure();
    this.afterMove(ev.n ? 0.75 : 0.25);
  }

  afterMove(delay) {
    const g = this.st.game;
    const round = this.round;
    if (this.mode === 'adv' && g.won()) {
      this.finished = true;
      sdk.gameplay(false);
      setTimeout(() => { if (round === this.round) this.finishLevel(); }, delay * 1000 + 600);
      return;
    }
    if (!g.canAny()) {
      this.busyUntil = this.view.t + delay;
      setTimeout(() => { if (round === this.round) this.checkStuck(); }, delay * 1000 + 250);
    }
  }

  checkStuck() {
    const g = this.st.game;
    if (this.state !== 'play' || !g || this.finished || g.canAny()) return;
    this.noSpace = true;
    audio.play('nospace');
    sdk.gameplay(false);
    const round = this.round;
    setTimeout(() => { if (round === this.round && this.noSpace) this.ui.noSpace(); }, 900);
  }

  saveAdventure() {
    const g = this.st.game;
    if (this.mode !== 'adv' || !g || this.finished || g.won()) return;
    const snap = { idx: this.levelIdx, game: g.toJSON() };
    if (this.eventRun) {if(weekly().key===this.eventRun.key)weekly().run={...snap,key:this.eventRun.key};}
    else if (this.dailyRun) save.data.challenge.run = { ...snap, key: this.dailyRun.key };
    else save.data.adventure = snap;
    save.write();
  }

  saveClassic() {
    const g = this.st.game;
    save.data.classic = g.canAny() ? g.toJSON() : null;
    if (g.score > save.data.best) save.data.bestPending = g.score;
    save.write();
  }

  // ---------- продолжение после «нет места» ----------
  revive(how) {
    const g = this.st.game;
    const go = () => {
      const beforeItems=Object.values(g.collected).reduce((a,n)=>a+n,0);
      const removed = g.revive();
      recordItems(Object.values(g.collected).reduce((a,n)=>a+n,0)-beforeItems);
      this.revived = true;
      this.noSpace = false;
      this.view.addClear(removed, null);
      this.st.appear = [this.view.t, this.view.t + 0.07, this.view.t + 0.14];
      audio.play('revive');
      this.updateFits();
      this.ui.hudUpdate();
      sdk.gameplay(true);
      if (this.mode === 'classic') this.saveClassic();
      else this.saveAdventure();
      if (this.mode === 'adv' && g.won()) this.afterMove(0.5);
    };
    if (how === 'coins') {
      if (save.data.coins < REVIVE_PRICE) return false;
      save.data.coins -= REVIVE_PRICE;
      save.write();
      go();
      return true;
    }
    sdk.showRewarded(go, ok => { if (!ok && this.st.game === g && this.noSpace) this.ui.noSpace(); });
    return true;
  }

  // ---------- конец классической партии ----------
  endClassic() {
    if(this._awardedRound===this.round)return;
    this._awardedRound=this.round;
    const g = this.st.game;
    const d = save.data;
    this.finished = true;
    sdk.gameplay(false);
    const record = g.score > d.best;
    if (record) {
      d.best = g.score;
    }
    const coins = Math.max(5, Math.floor(g.score / 40));
    d.coins += coins;
    d.games++;
    recordClassic(g.score);
    d.classic = null;
    delete d.bestPending;
    save.write();
    audio.play(record ? 'record' : 'lose');
    this.ui.classicResult({ score: g.score, best: d.best, record, coins });
  }

  // ---------- конец уровня ----------
  finishLevel() {
    if (this._awardedRound === this.round) return;
    this._awardedRound = this.round;
    const g = this.st.game;
    const L = level(this.levelIdx);
    const d = save.data;
    trackWin();
    if(this.eventRun){
      const w=weekly(),fresh=w.key===this.eventRun.key&&w.stage===this.eventRun.stage&&w.stage<5;
      let coins=0;
      if(fresh){w.stage++;w.run=null;coins=w.stage===5?250:50;d.coins+=coins;
        if(w.stage===5){d.trophies.push({key:w.key,scene:SEASONS[L.season].bg||L.S.id});if(!d.cosmetics.effects.includes('butterflies'))d.cosmetics.effects.push('butterflies');}}
      save.write();this.ui.eventResult(coins);return;
    }
    if (this.dailyRun) {
      const first = recordDailyWin(this.dailyRun.key);
      let bonus = false, coins = 0;
      if (first) {
        if(this.dailyRun.key>d.challenge.claimed)d.challenge.claimed = this.dailyRun.key;
        d.challenge.completed++;
        bonus = d.challenge.completed % 7 === 0;
        coins = 80 + (bonus ? 300 : 0);
        d.coins += coins;
        if (bonus) for (const k of ['hint','undo','hammer','shuffle']) d.boosts[k]++;
      }
      d.challenge.run = null; save.write(); audio.play('win');
      this.ui.challengeResult({coins,bonus,first});
      return;
    }
    d.adventure = null;
    const stars = starsFor(L, g.moves);
    const prev = d.levels[this.levelIdx];
    const before = save.stars();
    const decorBefore = unlockedDecor(before);
    const first = !prev;
    if (!prev || prev.stars < stars) d.levels[this.levelIdx] = { stars };
    const coins = first ? 30 + stars * 10 : 10;
    d.coins += coins;
    const after = save.stars();
    const newDecor = unlockedDecor(after).filter((x) => !decorBefore.includes(x));
    if(newDecor.length)preloadRoom(unlockedDecor(after),innerWidth,innerHeight);
    save.write();
    audio.play('win');
    this.ui.levelResult({ L, stars, moves: g.moves, coins, newDecor, starsTotal: after, last: this.levelIdx >= COUNT - 1 });
    if (newDecor.length) setTimeout(() => this.applyDecor(L.S.id, true, L.S.id), 400);
  }

  // реклама между партиями: только в логических паузах и не слишком часто
  adBreak(cb) {
    if (this.mode === 'adv' && this.levelIdx < 3) return cb();
    if (Date.now() - this.lastAd < AD_GAP || save.data.noAds) return cb();
    this.lastAd = Date.now();
    sdk.showInterstitial(cb);
  }

  // ---------- помощники ----------
  // возвращает true, если помощник применён
  useBoost(id) {
    const g = this.st.game;
    if (!g || !this.canInput()) return;
    if (this.st.hammer && id === 'hammer') {
      this.st.hammer = false;
      this.ui.hammerMode(false);
      return;
    }
    const can = {
      hint: () => g.canAny(),
      undo: () => g.history.length > 0,
      hammer: () => g.board.some(Boolean),
      shuffle: () => true,
    }[id]();
    if (!can) {
      audio.play('deny');
      this.ui.toast(t('cant_' + id));
      return;
    }
    const d = save.data;
    const pay = (src) => {
      if (src === 'stock') d.boosts[id]--;
      else if (src === 'coins') d.coins -= BOOST_PRICE[id];
      save.write();
      this.applyBoost(id);
      this.ui.refresh();
    };
    if (d.boosts[id] > 0) return pay('stock');
    if (d.coins >= BOOST_PRICE[id]) return pay('coins');
    this.ui.needCoins(id, () => sdk.showRewarded(() => pay('ad')));
  }

  applyBoost(id) {
    const st = this.st, g = st.game, v = this.view;
    if (id === 'hint') {
      const h = botHint(g);
      if (!h) return;
      const sh = SHAPE[g.tray[h.slot].s];
      st.hint = { slot: h.slot, cells: sh.cells.map(([dx, dy]) => (h.y + dy) * N + h.x + dx) };
      audio.play('hint');
    } else if (id === 'undo') {
      g.undo();
      this.noSpace = false;
      st.hint = null;
      audio.play('undo');
      this.updateFits();
      this.ui.hudUpdate();
      if (this.mode === 'classic') this.saveClassic();
    } else if (id === 'hammer') {
      st.hammer = true;
      this.ui.hammerMode(true);
    } else if (id === 'shuffle') {
      g.reroll();
      this.noSpace = false;
      st.hint = null;
      st.appear = [v.t, v.t + 0.07, v.t + 0.14];
      audio.play('shuffle');
      this.updateFits();
      if (this.mode === 'classic') this.saveClassic();
    }
    this.saveAdventure();
  }

  doSmash(i) {
    const st = this.st, g = st.game, v = this.view;
    const b = g.smash(i);
    if (!b) return;
    st.hammer = false;
    this.ui.hammerMode(false);
    audio.play('hammer');
    v.addClear([[i, b.c]], null);
    if (b.it) {
      recordItems(1);
      const r = v.cellRect(i);
      v.addItemFly(b.it, { x: r.x + r.s / 2, y: r.y + r.s / 2 }, this.ui.goalPos(b.it) || { x: v.W / 2, y: 40 }, 0.1, () => this.ui.bumpGoal(b.it));
    }
    this.noSpace = false;
    this.updateFits();
    this.ui.hudUpdate();
    if (this.mode === 'classic') this.saveClassic();
    else this.saveAdventure();
    this.afterMove(0.3);
  }

  // смена набора брусков
  setStyle(id) {
    save.data.style = id;
    this.view.style = id;
    save.write();
  }

  applyCosmetics(){
    if(!this.view)return;const d=save.data.cosmetics;
    this.view.boardStyle=d.board;this.view.effect=d.effect;
    if(this.view.W)this.view.rebuild();
  }
}

export { STYLES, DECOR, SEASONS, level, COUNT };
