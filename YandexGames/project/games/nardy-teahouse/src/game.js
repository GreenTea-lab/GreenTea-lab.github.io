// Игра: меню ↔ партия, награды, стили, реклама, покупки, ввод на доске, игровой цикл
import { Scene3D } from './scene3d.js';
import { Match } from './match.js';
import { UI } from './ui.js';
import { save, WIN_COINS, WIN_POINTS, AD_COINS } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { iap } from './iap.js';
import { IC } from './icons.js';
import { find, SKINS } from './skins.js';
import { isRace, newGame, fromJSON } from './rules.js';

const MIN_AD_GAP = 75 * 1000;

export class Game {
  async start(cv, uiRoot) {
    await save.load();
    const d = save.data;
    sdk.noAds = !!d.noAds;
    this.mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(innerWidth, innerHeight) < 900);
    this.quality = d.settings.quality === 'low' ? 'low' : d.settings.quality === 'high' ? 'high' : this.mobile ? 'mid' : 'high';
    this.cv = cv;
    this.sc = new Scene3D(cv, this.quality);
    this.sc.onSound = (n, p) => audio.play(n, p);
    this.applySkins();
    this.match = new Match(this.sc, {
      status: (k, v) => this.ui.status(k, v),
      phase: (p) => this.onPhase(p),
      hud: (x) => this.ui.hudUpdate(x),
      end: (r) => this.onEnd(r),
      sound: (n) => audio.play(n),
      save: (snap) => {
        save.data.cur = snap;
        save.write();
      },
      settings: () => save.data.settings,
    });
    this.ui = new UI(this, uiRoot);
    this.state = 'menu';
    this.paused = false;
    this.lastAd = Date.now();
    await iap.init(
      {
        coins_1000: { grant: () => this.addCoins(1000), icon: IC.coin },
        coins_3500: { grant: () => this.addCoins(3500), icon: IC.bag },
        coins_10000: { grant: () => this.addCoins(10000), icon: IC.bag },
        disable_ads: {
          permanent: true,
          icon: IC.noads,
          grant: () => {
            save.data.noAds = true;
            sdk.noAds = true;
          },
        },
      },
      () => save.flush()
    );
    if (save.data.noAds) sdk.noAds = true;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.boardInput();
    window.addEventListener('keydown', (e) => this.key(e));
    this.menuBoard();
    this.ui.home();
    audio.setIntensity(0);
    this.last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (!(window.__NB_DEBUG && window.__NB_DEBUG.manual)) this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // в меню на доске стоит начальная расстановка и лежат кубики
  menuBoard() {
    const c = save.data.cur;
    this.sc.layout(c ? fromJSON(c.s) : newGame(save.data.last.mode));
    this.sc.highlight({});
    this.sc.showTrail([]);
    this.sc.placeDice([6, 5], 0);
  }
  applySkins() {
    const e = save.data.eq;
    this.sc.setBoardSkin(find('board', e.board));
    this.sc.setCheckerSkin(find('checkers', e.checkers));
    this.sc.setDiceSkin(find('dice', e.dice));
  }
  addCoins(n) {
    save.data.coins += n;
    save.write();
    this.ui && this.ui.refreshTop();
  }

  resize() {
    const w = innerWidth;
    const h = innerHeight;
    this.portrait = h > w * 1.05;
    document.body.classList.toggle('portrait', this.portrait);
    document.body.classList.toggle('land', !this.portrait);
    this.sc.resize(w, h);
    this.ui && this.ui.layoutChanged();
    this.updateInsets();
  }
  // свободная от интерфейса часть экрана — под доску
  updateInsets() {
    if (!this.ui) return;
    const ins = this.ui.insets();
    this.sc.insets = ins;
    this.sc.invalidateCam();
  }
  setQuality(q) {
    this.quality = q === 'low' ? 'low' : 'high';
    const r = this.sc.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.quality === 'low' ? 1 : 2));
    r.shadowMap.enabled = this.quality !== 'low';
    this.sc.scene.traverse((o) => o.material && (Array.isArray(o.material) ? o.material.forEach((m) => (m.needsUpdate = true)) : (o.material.needsUpdate = true)));
    this.resize();
  }

  // ---------- ввод на доске: касание и перетаскивание ----------
  boardInput() {
    const c = this.cv;
    let down = null;
    c.addEventListener('pointerdown', (e) => {
      audio.unlock();
      if (this.state !== 'game' || this.paused || this.ui.modalOpen) return;
      const loc = this.sc.pick(e.clientX, e.clientY);
      down = { x: e.clientX, y: e.clientY, loc, id: e.pointerId, drag: null, src: this.match.canDrag(loc) };
      try {
        c.setPointerCapture(e.pointerId);
      } catch (er) {}
    });
    c.addEventListener('pointermove', (e) => {
      if (!down || down.id !== e.pointerId) return;
      const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (!down.drag && down.src && dist > 14) {
        if (this.match.sel !== down.src) this.match.select(down.src);
        down.drag = this.sc.dragGrab(down.src);
      }
      if (down.drag) this.sc.dragTo(down.drag, e.clientX, e.clientY);
    });
    const up = (e) => {
      if (!down || down.id !== e.pointerId) return;
      const d = down;
      down = null;
      const loc = this.sc.pick(e.clientX, e.clientY);
      if (d.drag) {
        if (this.match.isTarget(loc)) this.match.moveTo(this.match.norm(loc));
        else {
          this.sc.snapBack(d.src, d.drag);
          this.match.paint();
        }
        return;
      }
      if (e.type === 'pointercancel') return;
      this.match.tap(loc || d.loc);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
  }
  key(e) {
    if (this.state !== 'game' || this.ui.modalOpen) return;
    if (e.key === 'Escape') this.ui.pause();
    if (e.key === ' ' || e.key === 'Enter') {
      if (this.match.phase === 'confirm') this.match.confirm();
      else this.match.roll();
    }
    if ((e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') && this.match.canUndo()) this.match.undo();
  }

  // ---------- партия ----------
  newGame(mode, level) {
    const d = save.data;
    d.last = { mode, level };
    d.cur = null;
    save.write();
    this.begin({ mode, level });
  }
  continueGame() {
    const c = save.data.cur;
    if (!c) return;
    this.begin({ mode: c.mode, level: c.level, snap: c });
  }
  begin(o) {
    this.ui.closeModals();
    this.state = 'game';
    this.mode = o.mode;
    this.level = o.level;
    this.paused = false;
    this.endMood = false;
    this.tut = !save.data.seen.tut;
    this.ui.hud();
    this.sc.setView('game');
    this.updateInsets();
    this.match.start(o);
    audio.setMood('game');
    audio.setIntensity(1);
    sdk.gameplay(true);
  }
  setPaused(p) {
    this.paused = p;
    sdk.gameplay(!p && this.state === 'game');
  }
  onPhase(p) {
    this.ui.phase(p);
    // ближе к концу — музыка развязки
    if (!this.endMood && this.match.s && isRace(this.match.s)) {
      this.endMood = true;
      audio.setMood('end');
    }
  }
  hint() {
    const m = this.match;
    if (m.phase !== 'move') return;
    if (m.hints > 0) {
      if (m.hint()) this.ui.toast(this.ui.tt('hintShown'), 1800);
      this.ui.hudUpdate();
      return;
    }
    sdk.showRewarded(() => {
      m.hints += 1;
      if (m.hint()) this.ui.toast(this.ui.tt('hintShown'), 1800);
      this.ui.hudUpdate();
    });
  }
  onEnd(r) {
    sdk.gameplay(false);
    const d = save.data;
    const won = r.winner === 0;
    const mode = this.mode;
    const lv = this.level;
    d.cur = null;
    d.games++;
    d.stats[mode][lv][won ? 0 : 1]++;
    let coins = 0;
    let points = 0;
    if (won) {
      d.wins++;
      coins = WIN_COINS[lv] * r.mult;
      points = WIN_POINTS[lv] * r.mult;
      d.coins += coins;
      d.score += points;
      sdk.submitScore(d.score);
    } else {
      // утешительные монеты за доигранную партию
      coins = r.resign ? 0 : 10;
      d.coins += coins;
    }
    d.seen.tut = 1;
    save.write();
    audio.play(won ? 'win' : 'lose');
    this.ui.end({ won, mult: r.mult, coins, points, resign: r.resign });
  }
  doubleReward(coins, done) {
    sdk.showRewarded(() => {
      this.addCoins(coins);
      audio.play('coin');
      done();
    });
  }
  adCoins(done) {
    sdk.showRewarded(
      () => {
        save.data.freeAdAt = Date.now();
        this.addCoins(AD_COINS);
        audio.play('coin');
        done && done();
      },
      () => done && done()
    );
  }
  interstitial(then) {
    if (Date.now() - this.lastAd < MIN_AD_GAP || save.data.games < 2) return then();
    this.lastAd = Date.now();
    sdk.showInterstitial(then);
  }
  again() {
    this.interstitial(() => this.newGame(this.mode, this.level));
  }
  toMenu(ad) {
    const go = () => {
      if (this.match.phase !== 'over' && this.state === 'game') {
        save.data.cur = save.data.cur || this.match.snapshot();
        save.write();
      }
      this.match.stop();
      this.state = 'menu';
      this.paused = false;
      sdk.gameplay(false);
      this.sc.setView('menu');
      audio.setIntensity(0);
      audio.setMood('menu');
      this.menuBoard();
      this.ui.home();
    };
    ad ? this.interstitial(go) : go();
  }

  // ---------- стили ----------
  owns(kind, id) {
    return save.data.owned[kind].includes(id);
  }
  buySkin(kind, id) {
    const it = SKINS[kind].find((x) => x.id === id);
    if (!it || this.owns(kind, id)) return false;
    if (save.data.coins < it.price) return false;
    save.data.coins -= it.price;
    save.data.owned[kind].push(id);
    this.equip(kind, id);
    audio.play('buy');
    return true;
  }
  equip(kind, id) {
    if (!this.owns(kind, id)) return;
    save.data.eq[kind] = id;
    save.write();
    const S = find(kind, id);
    if (kind === 'board') this.sc.setBoardSkin(S);
    else if (kind === 'checkers') this.sc.setCheckerSkin(S);
    else this.sc.setDiceSkin(S);
  }

  // ---------- кадр ----------
  frame(dt) {
    if (window.__NB_DEBUG && window.__NB_DEBUG.speed) dt *= window.__NB_DEBUG.speed;
    if (this.state === 'game' && !this.paused) this.match.update(dt);
    this.sc.update(this.paused ? 0 : dt);
    this.sc.render();
  }
}
