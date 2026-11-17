// Игра: партия, ходы людей и ботов, анимации фишек и кубиков, камера, награды
import * as THREE from 'three';
import * as R from './rules.js';
import * as Bot from './bot.js';
import { Scene3D } from './scene.js';
import { UI } from './ui.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { iap } from './iap.js';
import { pickBots } from './avatars.js';
import { t, money } from './i18n.js';
import { CELLS, PCOLORS, TOKENS, PLACES, GO_SALARY, JAIL_FINE, JAIL, WIN_COINS, PLACE_COINS, RATING, ROUND_LIMITS, GROUP_CELLS, TRANSPORT, SPEEDS } from './data.js';
import { track } from './quests.js';
import { cellGeo } from './board.js';

const DBG = window.__MG_DEBUG || {};
const ABORT = { abort: true };
const pick = (a, r = Math.random) => a[Math.floor(r() * a.length)];

export class Game {
  constructor() {
    this.state = 'boot';
    this.flow = 0;
    this.paused = false;
    this.M = null;
  }

  async start(canvas, uiRoot) {
    await save.load();
    const d = save.data;
    this.s3 = new Scene3D(canvas);
    this.s3.setBackground(d.place);
    this.ui = new UI(this, uiRoot);
    sdk.noAds = !!d.noAds;
    await iap.init(
      {
        coins_1000: { grant: () => this.addCoins(1000) },
        coins_3500: { grant: () => this.addCoins(3500) },
        coins_10000: { grant: () => this.addCoins(10000) },
        disable_ads: {
          permanent: true,
          grant: () => {
            save.data.noAds = true;
            sdk.noAds = true;
          },
        },
      },
      () => save.flush()
    );
    iap.onChange(() => this.ui.refreshTop());
    window.addEventListener('resize', () => this.onResize());
    this.bindCamera(canvas);
    this.onResize();
    this.toHome();
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000) * (DBG.turbo || 1);
      last = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    if (!DBG.manual) requestAnimationFrame(loop); // manual: кадры шагает промо-ролик
  }

  addCoins(n) {
    save.data.coins += n;
    this.ui.refreshTop();
  }

  onResize() {
    this.s3.resize();
    this.updateRegion();
  }
  updateRegion() {
    this.s3.setRegion(this.ui.freeRegion());
    if (this.state !== 'match' || !this.followOn()) this.s3.overview();
  }

  frame(dt) {
    if (!this.paused) this.s3.update(dt);
    if (this.state === 'home') this.s3.goal.yaw = Math.sin(this.s3.t * 0.1) * 0.35;
    this.s3.render();
    this.ui.frame && this.ui.frame();
  }

  // ожидание с учётом паузы и выхода из партии
  async aw(p) {
    const f = this.flow;
    const r = await p;
    if (f !== this.flow) throw ABORT;
    while (this.paused) {
      await new Promise((res) => setTimeout(res, 100));
      if (f !== this.flow) throw ABORT;
    }
    return r;
  }
  wait(sec) {
    return this.aw(this.s3.anim(sec, () => {}));
  }
  get spd() {
    return SPEEDS[save.data.settings.speed || 0] || SPEEDS[0]; // боты ходят неспешно, чтобы успевать следить
  }
  followOn() {
    return save.data.settings.cam !== 'fixed';
  }
  // игрок за экраном, чей сейчас выбор (в игре с друзьями их несколько)
  me() {
    const M = this.M;
    if (!M) return -1;
    const a = this.actor;
    if (a != null && M.players[a] && !M.players[a].bot) return a;
    return M.players.findIndex((p) => !p.bot);
  }
  // как называть игрока в сообщениях
  isYou(P) {
    return !P.bot && !(this.M && this.M.hot);
  }
  nm(P) {
    return this.isYou(P) ? t('you') : P.name;
  }

  // вращение и приближение поля: перетаскивание, колесо, щипок
  bindCamera(canvas) {
    const ptr = new Map();
    let pinch = 0;
    const dist = () => {
      const [a, b] = [...ptr.values()];
      return Math.hypot(a[0] - b[0], a[1] - b[1]);
    };
    canvas.addEventListener('pointerdown', (e) => {
      ptr.set(e.pointerId, [e.clientX, e.clientY]);
      this._down = [e.clientX, e.clientY];
      if (ptr.size === 2) pinch = dist();
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { void err; }
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = ptr.get(e.pointerId);
      if (!p || this.state !== 'match' || this.ui.modalOpen) return;
      const dx = e.clientX - p[0],
        dy = e.clientY - p[1];
      p[0] = e.clientX;
      p[1] = e.clientY;
      if (ptr.size === 1) {
        if (!this._down || Math.hypot(e.clientX - this._down[0], e.clientY - this._down[1]) < 8) return;
        this.s3.userRotate(dx, dy);
      } else if (ptr.size === 2) {
        const d = dist();
        if (pinch > 0 && d > 0) this.s3.userZoom(pinch / d);
        pinch = d;
      }
    });
    const end = (e) => {
      ptr.delete(e.pointerId);
      pinch = 0;
    };
    canvas.addEventListener('pointerup', (e) => {
      end(e);
      this.onTap(e);
    });
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (this.state !== 'match' || this.ui.modalOpen) return;
        this.s3.userZoom(Math.exp(Math.max(-120, Math.min(120, e.deltaY)) * 0.0018));
      },
      { passive: false }
    );
    this.s3.onFree = (on) => {
      this.ui.camBtn(on);
      if (on && !save.data.seen.cam) {
        save.data.seen.cam = 1;
      }
    };
  }
  resetCam() {
    this.s3.free = false;
    this.ui.camBtn(false);
    this.s3.overview();
  }

  onTap(e) {
    if (!this._down || Math.hypot(e.clientX - this._down[0], e.clientY - this._down[1]) > 12) return;
    if (this.state !== 'match' || this.ui.modalOpen) return;
    const i = this.s3.pick(e.clientX, e.clientY);
    if (i >= 0 && CELLS[i].price) {
      audio.play('select');
      this.ui.cellInfo(i);
    }
  }

  // ---------- главный экран ----------
  toHome() {
    this.flow++;
    this.paused = false;
    this.s3.anims.length = 0;
    this.state = 'home';
    this.M = null;
    sdk.gameplay(false);
    audio.setIntensity(0);
    this.s3.hideDice();
    this.s3.highlight(-1);
    this.clearBoard();
    // витрина: фишки на поле, несколько домов и отель
    const demo = ['car', save.data.token === 'car' ? 'doll' : save.data.token, 'boat', 'plane'];
    this.s3.setTokens(demo.map((tk, k) => ({ token: tk, color: PCOLORS[k] })));
    [[0, 0], [1, 6], [2, 16], [3, 24]].forEach(([k, i]) => {
      const tk = this.s3.tokens[k];
      tk.position.copy(this.s3.tokenSpot(i, 0, 1));
      this.s3.faceToken(tk, i);
    });
    const style = save.data.houses;
    [[37, 2], [39, 5], [21, 3], [23, 3], [24, 3], [1, 1], [3, 2]].forEach(([i, n]) => this.s3.setBuildings(i, n, style));
    [[37, 0], [39, 0], [21, 1], [23, 1], [24, 1], [1, 2], [3, 2], [5, 3], [15, 3]].forEach(([i, k]) => this.s3.setMark(i, PCOLORS[k], false));
    this.ui.home();
    this.updateRegion();
    this.s3.overview(true);
  }

  clearBoard() {
    for (const i in this.s3.buildings) this.s3.setBuildings(+i, 0);
    for (const i in this.s3.marks) this.s3.setMark(+i, null);
    this.s3.setTokens([]);
  }

  setPlace(id) {
    save.data.place = id;
    this.s3.setBackground(id);
    const P = PLACES.find((p) => p.id === id);
    audio.setMood(P ? P.mood : 'game');
    if (this.state !== 'match') audio.setIntensity(0);
  }
  setHouses(id) {
    save.data.houses = id;
    for (const i in this.s3.buildings) {
      const b = this.s3.buildings[i];
      this.s3.setBuildings(+i, 0);
      this.s3.setBuildings(+i, b.n, id);
    }
  }

  // ---------- новая партия ----------
  newGame({ n, diff, limit, h = 1, rules = {} }) {
    h = Math.max(1, Math.min(n, h));
    save.data.last = { n, diff, limit, h, rules: { ...rules } };
    const mine = save.data.token;
    const others = TOKENS.map((x) => x.id).filter((x) => x !== mine);
    const seed = Date.now() % 100000;
    const bots = pickBots(n - h, seed);
    const r = R.rng(seed);
    const toks = [...others].sort(() => r() - 0.5);
    const players = [{ name: h > 1 ? t('playerN', { n: 1 }) : t('you'), bot: false, token: mine, color: PCOLORS[0], av: 0, g: 'm' }];
    for (let k = 1; k < h; k++) players.push({ name: t('playerN', { n: k + 1 }), bot: false, token: toks[k - 1], color: PCOLORS[k], av: k % 4, g: 'm' });
    bots.forEach((b, k) => players.push({ name: b.name, bot: true, token: toks[h - 1 + k], color: PCOLORS[h + k], av: b.av, g: b.g }));
    if (DBG.allbots) players.forEach((p) => (p.bot = true));
    const M = R.newMatch({ players, diff, limit: ROUND_LIMITS[limit] ?? 15, seed, rules });
    M.hot = h > 1;
    if (M.rules.quick) R.dealStart(M, R.rng(seed + 11));
    R.snapshot(M);
    save.data.cur = M;
    save.write();
    this.enterMatch(M);
  }

  continueGame() {
    if (save.data.cur) this.enterMatch(save.data.cur);
  }

  enterMatch(M) {
    // партии из старых сохранений
    M.rules = M.rules || {};
    M.pot = M.pot || 0;
    M.hist = M.hist || [];
    M.sets = M.sets || {};
    if (!M.hist.length) R.snapshot(M);
    this.flow++;
    this.s3.anims.length = 0;
    this.paused = false;
    this.actor = null;
    this.M = M;
    this.state = 'match';
    this.botR = R.rng(M.seed + M.round * 7 + M.cur);
    this.clearBoard();
    this.s3.setTokens(M.players);
    M.players.forEach((p) => {
      if (p.out) this.s3.tokens[p.idx].visible = false;
    });
    this.placeTokens();
    for (const i in M.own) this.syncCell(+i);
    this.ui.match();
    this.updateRegion();
    this.s3.overview(true);
    audio.setIntensity(1);
    const P = PLACES.find((p) => p.id === save.data.place);
    audio.setMood(this.lastRounds() ? 'final' : P ? P.mood : 'game');
    sdk.gameplay(true);
    this.runLoop().catch((e) => {
      if (e !== ABORT) console.error(e);
    });
  }

  lastRounds() {
    const M = this.M;
    return M && M.limit && M.round > M.limit - 3;
  }

  // поставить все фишки по местам
  placeTokens(skip = -1) {
    const M = this.M;
    const by = {};
    M.players.forEach((p) => {
      if (p.out) return;
      const k = p.pos === JAIL ? (p.inJail ? 'J' : 'V') : p.pos;
      (by[k] = by[k] || []).push(p.idx);
    });
    for (const k in by) {
      const list = by[k];
      list.forEach((idx, slot) => {
        if (idx === skip) return;
        const p = M.players[idx];
        const tk = this.s3.tokens[idx];
        const to = this.s3.tokenSpot(p.pos, slot, list.length, p.inJail);
        tk.position.copy(to);
        this.s3.faceToken(tk, p.pos);
      });
    }
  }

  syncCell(i) {
    const o = this.M.own[i];
    if (!o) {
      this.s3.setMark(i, null);
      this.s3.setBuildings(i, 0);
      return;
    }
    this.s3.setMark(i, this.M.players[o.o].color, o.m);
    this.s3.setBuildings(i, o.h, save.data.houses);
  }
  syncAll() {
    for (let i = 0; i < 40; i++) if (CELLS[i].price) this.syncCell(i);
  }

  persist() {
    if (!this.M) return;
    save.data.cur = this.M.over ? null : JSON.parse(JSON.stringify(this.M));
    save.write();
  }

  // ---------- цикл партии ----------
  async runLoop() {
    const M = this.M;
    if (M.round === 1 && M.cur === 0 && M.players.some((p) => !p.bot)) await this.coach('intro');
    while (!M.over) {
      const P = M.players[M.cur];
      if (!P.out) await this.turn(P);
      if (this.checkEnd()) break;
      const was = M.round;
      R.nextPlayer(M);
      if (M.round !== was) R.snapshot(M);
      if (M.limit && M.round > M.limit) {
        M.round = M.limit;
        await this.finish();
        return;
      }
      if (this.lastRounds()) audio.setMood('final');
      this.persist();
    }
  }

  checkEnd() {
    const M = this.M;
    if (M.over) return true;
    // все люди выбыли — дальше играть некому (в отладочной партии одних ботов людей нет вовсе)
    const humans = M.players.some((p) => !p.bot);
    if (R.alive(M).length <= 1 || (humans && !M.players.some((p) => !p.bot && !p.out))) {
      this.finish();
      return true;
    }
    return false;
  }

  async turn(P) {
    const M = this.M;
    const human = !P.bot;
    this.ui.setActive(P.idx);
    this.s3.overview();
    if (human) {
      this.actor = P.idx;
      audio.play('turn');
    }
    if (human && M.hot) {
      this.ui.toast(t('turnOf', { n: P.name }), 1400);
      await this.wait(1.2);
    }
    await this.wait(human ? 0.2 : 0.45 * this.spd);
    // боты в начале хода иногда предлагают обмен
    if (P.bot) await this.botTrade(P);
    let again = true;
    while (again && !P.out) {
      again = false;
      if (P.inJail) {
        const res = await this.jailTurn(P);
        if (res !== 'free') break;
      }
      if (human) {
        await this.coach('roll');
        await this.aw(this.ui.preRoll(P, M.doubles > 0));
      }
      const [a, b] = this.roll();
      await this.showDice(a, b);
      if (a === b) {
        M.doubles++;
        if (M.doubles >= 3) {
          this.ui.toast(t('threeDoubles'));
          await this.goJail(P);
          break;
        }
      }
      await this.moveBy(P, a + b);
      await this.resolve(P, a + b);
      if (a === b && !P.inJail && !P.out) {
        again = true;
        audio.play('doubles');
        this.ui.toast(!this.isYou(P) ? `${P.name}: ${t('doubles').toLowerCase()}` : t('doubles'));
        await this.wait(0.5 * this.spd);
      }
    }
    if (P.out) return;
    if (human) {
      if (R.ownedBy(M, P.idx).length) await this.coach('end');
      await this.aw(this.ui.postRoll(P));
    }
    else await this.botManage(P);
    this.s3.hideDice();
  }

  roll() {
    if (DBG.dice && DBG.dice.length) return DBG.dice.shift();
    return [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
  }

  async showDice(a, b) {
    audio.play('shake');
    const p = this.s3.rollDice(a, b);
    // стук кубиков
    for (const d of [0.25, 0.5, 0.7, 0.85]) setTimeout(() => audio.play('dice', 1 - d * 0.6), d * 1000);
    await this.aw(p);
    this.ui.diceResult(a, b);
    await this.wait(0.25 * this.spd);
  }

  // ---------- перемещение ----------
  async hop(P, to, dur) {
    const tk = this.s3.tokens[P.idx];
    const from = tk.position.clone();
    const end = this.s3.tokenSpot(to, 0, 1, false);
    this.s3.faceToken(tk, to);
    await this.aw(
      this.s3.anim(dur, (k) => {
        tk.position.lerpVectors(from, end, k);
        tk.position.y = Math.sin(k * Math.PI) * 0.7;
      })
    );
  }
  async moveBy(P, n) {
    const back = n < 0;
    const steps = Math.abs(n);
    const dur = (P.bot ? 0.17 : 0.2) * (P.bot ? this.spd : 1);
    for (let s = 0; s < steps; s++) {
      const next = (P.pos + (back ? 39 : 1)) % 40;
      if (this.followOn()) this.s3.focus(next);
      await this.hop(P, next, dur);
      P.pos = next;
      audio.play('step', s % 4);
      if (next === 0 && !back) {
        // «Двойная зарплата»: точно на «Старт» — вдвое больше
        const exact = this.M.rules.go2 && s === steps - 1;
        const sum = exact ? GO_SALARY * 2 : GO_SALARY;
        this.gain(P, sum, t(exact ? 'exactGo' : 'passGo', { n: money(sum) }));
        this.track(P, 'go');
      }
    }
    audio.play('land');
    this.placeTokens();
    this.ui.refreshPlayers();
  }
  async moveTo(P, to, collect = true) {
    let n = (to - P.pos + 40) % 40;
    if (!collect && n) {
      // без «Старта»: лететь прямо
      await this.flyTo(P, to);
      return;
    }
    await this.moveBy(P, n);
  }
  async flyTo(P, to, jailed = false) {
    const tk = this.s3.tokens[P.idx];
    const from = tk.position.clone();
    const end = this.s3.tokenSpot(to, 0, 1, jailed);
    if (this.followOn()) this.s3.focus(to);
    await this.aw(
      this.s3.anim(0.8 * Math.max(0.6, this.spd), (k) => {
        tk.position.lerpVectors(from, end, k);
        tk.position.y = Math.sin(k * Math.PI) * 3;
        tk.rotation.y += 0.2;
      })
    );
    P.pos = to;
    this.s3.faceToken(tk, to);
    this.placeTokens();
  }
  async goJail(P) {
    audio.play('jail');
    this.ui.flash(P.idx, t('goJail'), 'bad');
    P.inJail = true;
    P.jail = 0;
    this.M.doubles = 0;
    await this.flyTo(P, JAIL, true);
    this.ui.refreshPlayers();
    await this.wait(0.3 * this.spd);
    if (!P.bot) await this.coach('jail');
  }

  // ---------- тюрьма ----------
  async jailTurn(P) {
    const M = this.M;
    let ch;
    if (P.bot) {
      ch = Bot.jailChoice(M, P.idx);
      await this.wait(0.4 * this.spd);
    } else ch = await this.aw(this.ui.askJail(P));
    if (ch === 'ad') {
      M.jailAd = true;
      P.inJail = false;
      this.ui.flash(P.idx, t('freed'), 'good');
      audio.play('gift');
      this.placeTokens();
      return 'free';
    }
    if (ch === 'card' && P.free.length) {
      R.returnFree(M, P.idx);
      P.inJail = false;
      this.ui.flash(P.idx, t('freed'), 'good');
      audio.play('gift');
      this.placeTokens();
      return 'free';
    }
    if (ch === 'pay') {
      if (!(await this.charge(P, -1, JAIL_FINE, true))) return 'out';
      P.inJail = false;
      this.ui.flash(P.idx, t('freed'), 'good');
      this.placeTokens();
      return 'free';
    }
    // бросок на дубль
    const [a, b] = this.roll();
    await this.showDice(a, b);
    P.jail++;
    if (a === b) {
      P.inJail = false;
      this.ui.flash(P.idx, t('freed'), 'good');
      audio.play('doubles');
      this.placeTokens();
      await this.moveBy(P, a + b);
      await this.resolve(P, a + b);
      return 'moved';
    }
    if (P.jail >= 3) {
      if (!(await this.charge(P, -1, JAIL_FINE, true))) return 'out';
      P.inJail = false;
      this.placeTokens();
      await this.moveBy(P, a + b);
      await this.resolve(P, a + b);
      return 'moved';
    }
    audio.play('deny');
    this.ui.toast(!this.isYou(P) ? `${P.name} ${t('inJail')}` : t('jailT'));
    await this.wait(0.4 * this.spd);
    return 'stay';
  }

  // ---------- клетка ----------
  async resolve(P, dice, card = null) {
    const M = this.M;
    const i = P.pos;
    const c = CELLS[i];
    if (c.price) {
      const o = M.own[i];
      if (!o) await this.offerBuy(P, i);
      else if (o.o !== P.idx && !o.m) {
        let d = dice;
        if (card === 'nearest' && c.type === 'util') {
          const [a, b] = this.roll();
          await this.showDice(a, b);
          d = a + b;
        }
        const rent = R.rent(M, i, d, card);
        const owner = M.players[o.o];
        if (rent > 0) {
          this.s3.highlight(i);
          const ok = await this.charge(P, o.o, rent);
          this.s3.highlight(-1);
          if (ok) {
            M.stats.rentPaid[P.idx] += rent;
            M.stats.rentGot[o.o] += rent;
            this.track(owner, 'rent', rent);
            if (rent >= 1000) this.track(owner, 'bigrent');
            if (!P.bot) await this.coach('rent');
            if (owner.bot && Math.random() < 0.5) this.ui.say(o.o, pick(t('sayRent')));
            if (P.bot && Math.random() < 0.35) setTimeout(() => this.ui.say(P.idx, pick(t('sayPay'))), 700);
          }
        }
      }
    } else if (c.type === 'tax') {
      this.ui.toast(`${t('c_' + c.key)}: ${money(c.amount)}`);
      await this.charge(P, -1, c.amount, true);
    } else if (c.type === 'park') {
      if (M.rules.pot && M.pot > 0) {
        const n = M.pot;
        M.pot = 0;
        audio.play('gift');
        this.ui.flash(P.idx, t('potWin'), 'good');
        this.gain(P, n, t('potGot', { a: this.nm(P), n: money(n) }));
        await this.wait(0.5 * this.spd);
      }
    } else if (c.type === 'card') {
      await this.drawCard(P, c.deck);
    } else if (c.type === 'tojail') {
      await this.goJail(P);
    }
  }

  async offerBuy(P, i) {
    const M = this.M;
    const c = CELLS[i];
    let buy;
    this.s3.highlight(i);
    if (P.bot) {
      buy = Bot.wantBuy(M, P.idx, i, this.botR);
      await this.wait(0.45 * this.spd);
    } else {
      await this.coach('buy');
      buy = (await this.aw(this.ui.askBuy(i))) === 'buy';
    }
    if (buy && P.money >= c.price) {
      P.money -= c.price;
      M.own[i] = { o: P.idx, h: 0, m: false };
      audio.play('cash');
      this.ui.money(P.idx, -c.price);
      this.syncCell(i);
      this.ui.toast(!this.isYou(P) ? t('bought', { a: P.name, b: t('c_' + c.key) }) : t('youBought', { n: t('c_' + c.key) }));
      if (P.bot && Math.random() < 0.25) this.ui.say(P.idx, pick(t('says')));
      this.ui.refreshPlayers();
      this.track(P, 'buy');
      await this.wait(0.3 * this.spd);
      if (!P.bot) {
        if (c.group) await this.coach('group');
        await this.gotNew(P);
      }
    } else {
      await this.auction(i);
    }
    this.s3.highlight(-1);
  }

  // ---------- аукцион ----------
  async auction(i) {
    const M = this.M;
    const order = [];
    for (let k = 1; k <= M.players.length; k++) {
      const idx = (M.cur + k) % M.players.length;
      if (!M.players[idx].out) order.push(idx);
    }
    const A = { i, bid: 0, leader: -1, active: new Set(order), log: [] };
    const human = this.actor;
    if (order.some((k) => !M.players[k].bot)) await this.coach('auction');
    this.ui.auctionOpen(A);
    const step = (b) => (b < 100 ? 10 : b < 300 ? 20 : 50);
    const maxes = {};
    for (const idx of order) if (M.players[idx].bot) maxes[idx] = Bot.auctionMax(M, idx, i, this.botR);
    let guard = 400;
    while (guard-- > 0) {
      let anyone = false;
      for (const idx of order) {
        if (!A.active.has(idx) || idx === A.leader) continue;
        if (A.active.size <= 1 && A.leader >= 0) break;
        const P = M.players[idx];
        const next = A.bid + step(A.bid);
        if (P.money < next) {
          A.active.delete(idx);
          A.log.push({ idx, pass: true });
          this.ui.auctionUpdate(A);
          continue;
        }
        if (P.bot) {
          await this.wait(0.35 * this.spd);
          if (maxes[idx] >= next) {
            A.bid = next;
            A.leader = idx;
            A.log.push({ idx, bid: next });
            audio.play('bid');
            anyone = true;
          } else {
            A.active.delete(idx);
            A.log.push({ idx, pass: true });
          }
        } else {
          this.actor = idx;
          const r = await this.aw(this.ui.auctionTurn(A, step(A.bid)));
          if (r === 'pass') {
            A.active.delete(idx);
            A.log.push({ idx, pass: true });
          } else {
            A.bid = r;
            A.leader = idx;
            A.log.push({ idx, bid: r });
            audio.play('bid');
            anyone = true;
          }
        }
        this.ui.auctionUpdate(A);
      }
      const rest = [...A.active].filter((x) => x !== A.leader);
      if (A.leader >= 0 && rest.length === 0) break;
      if (A.active.size === 0) break;
      if (!anyone && A.leader < 0) break;
    }
    await this.wait(0.3);
    audio.play('gavel');
    if (A.leader >= 0) {
      const P = M.players[A.leader];
      P.money -= A.bid;
      M.own[i] = { o: A.leader, h: 0, m: false };
      this.syncCell(i);
      this.ui.money(A.leader, -A.bid);
      this.ui.toast(t('wonAuction', { a: this.nm(P), b: t('c_' + CELLS[i].key), c: money(A.bid) }));
      this.track(P, 'auction');
      this.track(P, 'buy');
    } else this.ui.toast(t('noBids'));
    this.ui.refreshPlayers();
    await this.wait(0.7 * this.spd);
    this.ui.auctionClose();
    this.actor = human;
    if (A.leader >= 0 && !M.players[A.leader].bot) await this.gotNew(M.players[A.leader]);
  }

  // ---------- деньги ----------
  gain(P, n, why) {
    P.money += n;
    audio.play('coin');
    this.ui.money(P.idx, n, why);
    this.ui.refreshPlayers();
  }
  // списать n у P в пользу to (-1 — банк). Если не хватает — продажа и залог, иначе банкротство. Возвращает true, если заплатил.
  // pot — платёж банку попадает в копилку парка (если включено правило)
  async charge(P, to, n, pot = false) {
    const M = this.M;
    if (P.money < n) {
      if (P.bot) {
        const acts = Bot.raise(M, P.idx, n);
        for (const a of acts) this.syncCell(a.i);
        if (acts.length) {
          audio.play('pay');
          await this.wait(0.4 * this.spd);
        }
      } else {
        const prev = this.actor;
        this.actor = P.idx;
        await this.aw(this.ui.raiseFunds(P, n, R.liquid(M, P.idx) < n));
        this.actor = prev;
      }
    }
    if (P.money < n) {
      await this.bankrupt(P, to);
      return false;
    }
    P.money -= n;
    if (to >= 0) M.players[to].money += n;
    else if (pot && M.rules.pot) M.pot += n;
    audio.play('pay');
    this.ui.money(P.idx, -n);
    if (to >= 0) this.ui.money(to, n);
    this.ui.refreshPlayers();
    await this.wait(0.35 * this.spd);
    return true;
  }

  async bankrupt(P, to) {
    const M = this.M;
    R.bankrupt(M, P.idx, to);
    audio.play('bankrupt');
    this.syncAll();
    this.ui.flash(P.idx, !this.isYou(P) ? t('isBankrupt', { n: P.name }) : t('youBankrupt'), 'bad');
    this.ui.toast(!this.isYou(P) ? t('isBankrupt', { n: P.name }) : t('youBankrupt'), 3000);
    const tk = this.s3.tokens[P.idx];
    await this.aw(this.s3.anim(0.6, (k) => tk.scale.setScalar(Math.max(0.01, 1 - k))));
    tk.visible = false;
    this.ui.refreshPlayers();
    await this.wait(0.6);
  }

  // ---------- карточки ----------
  async drawCard(P, deck) {
    const M = this.M;
    if (!P.bot) await this.coach('card');
    const card = R.draw(M, deck);
    audio.play('card');
    const d = this.s3.decks[deck];
    this.aw(this.s3.anim(0.4, (k) => (d.position.y = 0.16 + Math.sin(k * Math.PI) * 0.3)));
    await this.aw(this.ui.showCard(card, P));
    switch (card.a) {
      case 'move':
        await this.moveTo(P, card.to);
        await this.resolve(P, 7);
        break;
      case 'nearest': {
        const to = R.nearest(P.pos, card.kind);
        await this.moveTo(P, to);
        await this.resolve(P, 7, 'nearest');
        break;
      }
      case 'gain':
        this.gain(P, card.n);
        break;
      case 'pay':
        await this.charge(P, -1, card.n, true);
        break;
      case 'free':
        P.free.push({ deck, id: card.id });
        audio.play('gift');
        this.ui.refreshPlayers();
        break;
      case 'back':
        await this.moveBy(P, -card.n);
        await this.resolve(P, 7);
        break;
      case 'jail':
        await this.goJail(P);
        break;
      case 'repair': {
        const { h, H } = R.housesOf(M, P.idx);
        const sum = h * card.house + H * card.hotel;
        if (sum > 0) await this.charge(P, -1, sum, true);
        break;
      }
      case 'payeach':
        for (const q of R.alive(M)) {
          if (q.idx === P.idx || P.out) continue;
          await this.charge(P, q.idx, card.n);
        }
        break;
      case 'collect':
        for (const q of R.alive(M)) {
          if (q.idx === P.idx) continue;
          await this.charge(q, P.idx, card.n);
        }
        break;
    }
  }

  // ---------- действия игрока с имуществом (из интерфейса) ----------
  act(kind, i) {
    const M = this.M;
    const p = this.me();
    if (p < 0) return false;
    if (kind === 'build' && R.canBuild(M, p, i)) {
      R.build(M, p, i);
      audio.play('build');
      this.s3.setBuildings(i, M.own[i].h, save.data.houses, true);
      this.ui.money(p, -R.houseCost(i));
      this.track(M.players[p], M.own[i].h === 5 ? 'hotel' : 'house');
    } else if (kind === 'sell' && R.canSell(M, p, i)) {
      R.sell(M, p, i);
      audio.play('coin');
      this.syncCell(i);
      this.ui.money(p, R.houseCost(i) / 2);
    } else if (kind === 'mortgage' && R.canMortgage(M, p, i)) {
      R.mortgage(M, p, i);
      audio.play('coin');
      this.syncCell(i);
      this.ui.money(p, CELLS[i].mortgage);
    } else if (kind === 'unmortgage' && R.canUnmortgage(M, p, i)) {
      const cost = R.unmortgageCost(i);
      R.unmortgage(M, p, i);
      audio.play('cash');
      this.syncCell(i);
      this.ui.money(p, -cost);
    } else {
      audio.play('deny');
      return false;
    }
    this.ui.refreshPlayers();
    return true;
  }

  // обмен, предложенный игроком
  async proposeTrade(tr) {
    const M = this.M;
    const B = M.players[tr.b];
    await new Promise((r) => setTimeout(r, 500));
    const ok = B.bot ? Bot.acceptTrade(M, tr.b, tr) : await this.aw(this.ui.askOffer({ ...tr, from: M.players[tr.a] }));
    if (ok) {
      R.doTrade(M, tr);
      audio.play('trade');
      this.syncAll();
      this.ui.refreshPlayers();
      if (B.bot) this.ui.say(tr.b, t('says')[1]);
      this.track(M.players[tr.a], 'trade');
      this.gotNew(M.players[tr.a]).catch(() => {});
      if (!B.bot) {
        this.track(B, 'trade');
        this.gotNew(B).catch(() => {});
      }
    } else {
      audio.play('deny');
    }
    this.ui.toast(ok ? t('accepted', { n: B.name }) : t('declined', { n: B.name }));
    return ok;
  }

  // ---------- боты ----------
  async botManage(P) {
    const M = this.M;
    // долги после хода не остаются, но на всякий случай
    const acts = Bot.manage(M, P.idx, this.botR);
    for (const a of acts) {
      if (a.a === 'build') {
        this.s3.setBuildings(a.i, M.own[a.i].h, save.data.houses, true);
        audio.play('build');
        await this.wait(0.22 * this.spd);
      } else this.syncCell(a.i);
    }
    if (acts.length) this.ui.refreshPlayers();
  }

  async botTrade(P) {
    const M = this.M;
    M.offers = M.offers || {};
    const tr = Bot.proposeTrade(M, P.idx, this.botR);
    if (!tr) return;
    const key = `${tr.a}-${tr.b}-${tr.cellsB.join(',')}`;
    if (M.offers[key] && M.round - M.offers[key] < 4) return;
    M.offers[key] = M.round;
    const target = M.players[tr.b];
    let ok;
    if (target.bot) ok = Bot.acceptTrade(M, tr.b, tr);
    else {
      if (M.lastHumanOffer && M.round - M.lastHumanOffer < 2) return;
      M.lastHumanOffer = M.round;
      ok = await this.aw(this.ui.askOffer(tr));
    }
    if (ok) {
      R.doTrade(M, tr);
      audio.play('trade');
      this.syncAll();
      this.ui.toast(t('tradeDone', { a: P.name, b: this.nm(target) }));
      this.ui.refreshPlayers();
      if (!target.bot) {
        this.track(target, 'trade');
        await this.gotNew(target);
      }
      await this.wait(0.6 * this.spd);
      // сразу строиться не будем — это сделает конец хода
    }
  }

  // ---------- конец партии ----------
  async finish() {
    const M = this.M;
    if (M.over) return;
    M.over = true;
    sdk.gameplay(false);
    R.snapshot(M);
    const st = R.standings(M);
    if (M.hot) {
      save.data.cur = null;
      save.write();
      audio.play('win');
      audio.setIntensity(0);
      this.s3.overview();
      this.ui.results({ st, place: 1, coins: 0, win: true, hot: true });
      return;
    }
    const me = this.me();
    const place = st.indexOf(me) + 1;
    const win = place === 1;
    const coins = win ? WIN_COINS[M.diff] : PLACE_COINS[place - 1] || 0;
    save.data.coins += coins;
    save.data.stats.games++;
    const meP = M.players[me];
    if (meP) {
      this.track(meP, 'game');
      if (win) this.track(meP, 'win');
      if (win && M.diff === 2) this.track(meP, 'winHard');
    }
    if (win) {
      save.data.stats.wins++;
      save.data.rating += RATING[M.diff];
      sdk.submitScore(save.data.rating);
    }
    save.data.cur = null;
    save.write();
    audio.play(win ? 'win' : 'lose');
    audio.setIntensity(0);
    this.s3.overview();
    this.ui.results({ st, place, coins, win });
  }

  // выход из партии: сохраняется, если не закончена
  quitToMenu() {
    if (this.M && !this.M.over) this.persist();
    this.toHome();
  }
  surrender() {
    const M = this.M;
    if (!M || M.over) return;
    const me = M.players[this.me()];
    R.bankrupt(M, me.idx, -1);
    this.syncAll();
    this.s3.tokens[me.idx].visible = false;
    this.flow++;
    if (M.hot && !this.checkEnd()) {
      // в игре с друзьями выбывает только сдавшийся, остальные продолжают
      if (M.cur === me.idx) R.nextPlayer(M);
      this.persist();
      this.enterMatch(M);
      return;
    }
    this.finish();
  }

  // ---------- задания, достижения, обучение ----------
  // считаем только партии с ботами и только действия человека
  track(P, ev, n = 1) {
    const M = this.M;
    if (!M || M.hot || !P || P.bot || DBG.allbots) return;
    const done = track(ev, n);
    for (const d of done) this.ui.questDone(d);
  }
  // проверка новых полных групп и всех четырёх транспортов у игрока
  async gotNew(P) {
    const M = this.M;
    if (!M || P.bot) return;
    let fresh = null;
    for (const g in GROUP_CELLS) {
      const k = P.idx + ':' + g;
      if (!M.sets[k] && R.hasSet(M, P.idx, g)) {
        M.sets[k] = 1;
        this.track(P, 'set');
        if (g === 'blue') this.track(P, 'blue');
        fresh = g;
      }
    }
    if (!M.sets[P.idx + ':tr4'] && TRANSPORT.every((i) => R.owner(M, i) === P.idx)) {
      M.sets[P.idx + ':tr4'] = 1;
      this.track(P, 'tr4');
    }
    if (fresh) {
      if (this.ui.needCoach('build')) await this.coach('build', { g: t('g_' + fresh) });
      else this.ui.toast(t('tipBuild', { g: t('g_' + fresh) }), 3500);
    }
  }
  async coach(key, vars) {
    if (!this.ui.needCoach(key)) return;
    await this.aw(this.ui.coach(key, vars));
  }

  // реклама между партиями
  interstitial(then) {
    sdk.showInterstitial(then);
  }
}

void THREE;
void cellGeo;
void GROUP_CELLS;
