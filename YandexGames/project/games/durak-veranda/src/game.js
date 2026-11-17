// Контроллер: партия, ходы игрока (нажатие или перетаскивание), боты по очереди, награды, реклама.
import { Game, suit, rank, maxPlayers } from './core.js';
import { botAction, hintFor } from './bot.js';
import { View } from './view.js';
import { UI } from './ui.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { iap } from './iap.js';
import { audio } from './audio.js';
import { t, LANG } from './i18n.js';
import { KINDS } from './avatars.js';

const AD_GAP = 150 * 1000;
export const HINT_PRICE = 25;
export const LVL_MULT = [1, 1.6, 2.4];
// множитель «раздумий» ботов: обычная скорость похожа на живого игрока
const SPEED = { slow: 1.45, normal: 1, fast: 0.55 };

const NAMES = {
  ru: ['Михалыч', 'Тётя Валя', 'Серёга', 'Людмила', 'Петрович', 'Галина', 'Николай', 'Светик', 'Дядя Толя', 'Ольга', 'Виктор', 'Нина', 'Ромашка', 'Кузьмич', 'Танюша', 'Борис', 'Зоя', 'Генка', 'Марина', 'Степаныч'],
  en: ['Mike', 'Aunt Val', 'Steve', 'Linda', 'Uncle Bob', 'Grace', 'Nick', 'Sally', 'Tony', 'Olivia', 'Victor', 'Nina', 'Daisy', 'Frank', 'Tanya', 'Boris', 'Zoe', 'Gary', 'Marina', 'Pete'],
};
// масти в руке чередуются по цвету, козыри справа
const SUIT_ORDER = [3, 0, 2, 1];

export class App {
  constructor() {
    this.save = save;
    this.state = 'menu';
    this.game = null;
    this.players = [];
    this.st = { legal: null, dim: false, sel: null, hover: null, hint: null, targets: null, drag: null, dropTarget: null };
    this.actor = -1;
    this.lastAd = Date.now();
    this.dbg = window.__DK_DEBUG || {};
    this.timer = null;
  }

  async start(cv, root) {
    await save.load();
    sdk.noAds = !!save.data.noAds;
    this.view = new View(cv);
    const d = save.data;
    this.view.cloth = d.cloth;
    this.view.back = d.back;
    this.view.four = d.settings.four;
    this.ui = new UI(this, root);
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
      if (!this.dbg.freeze) this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  frame(dt) {
    this.view.draw(dt, this);
    this.ui.tick && this.ui.tick(dt);
  }

  addCoins(n) {
    save.data.coins += n;
    save.write();
    this.ui.refresh();
  }

  // ---------- партия ----------
  makePlayers(n, lvl) {
    const names = [...NAMES[LANG === 'ru' ? 'ru' : 'en']];
    const kinds = [...KINDS];
    const pick = (a) => a.splice(Math.floor(Math.random() * a.length), 1)[0];
    const ps = [{ name: t('you'), kind: 'cat', lvl: -1 }];
    for (let i = 1; i < n; i++) ps.push({ name: pick(names), kind: pick(kinds), lvl });
    return ps;
  }

  newGame(cfg) {
    cfg = { ...save.data.cfg, ...(cfg || {}) };
    cfg.players = Math.min(cfg.players, maxPlayers(cfg.deck));
    save.data.cfg = cfg;
    const g = new Game({ players: cfg.players, deck: cfg.deck, mode: cfg.mode, seed: this.dbg.seed ?? ((Math.random() * 1e9) | 0) });
    this.cfg = cfg;
    this.players = this.makePlayers(cfg.players, cfg.level);
    this.begin(g, true);
  }

  resume() {
    const c = save.data.cur;
    if (!c) return this.newGame();
    try {
      this.cfg = c.cfg;
      this.players = c.players;
      this.begin(Game.fromJSON(c.g), false);
    } catch (e) {
      save.data.cur = null;
      this.newGame();
    }
  }

  begin(g, fresh) {
    clearTimeout(this.timer);
    this.game = g;
    this.state = 'play';
    this.turbo = false;
    this.finished = false;
    this.st = { legal: null, dim: false, sel: null, hover: null, hint: null, targets: null, drag: null, dropTarget: null };
    const v = this.view;
    v.mode = 'play';
    v.setN(g.n);
    v.layout();
    v.rebuild();
    v.resetCards(g);
    this.ui.hud();
    sdk.gameplay(true);
    audio.setMood(g.deck.length ? 'game' : 'tense');
    let wait = 0.6;
    if (fresh) {
      // раздача по кругу, как за настоящим столом
      const order = [];
      for (let k = 0; k < 6; k++) for (let p = 0; p < g.n; p++) if (g.hands[p][k] != null) order.push(g.hands[p][k]);
      v.stagger(order, 0.07, 0.25);
      audio.play('shuffle');
      for (let i = 0; i < order.length; i += 2) setTimeout(() => audio.play('deal'), 250 + i * 70);
      wait = 0.6 + order.length * 0.07;
      setTimeout(() => this.announceFirst(), wait * 1000);
      wait += 1.0;
      if (!save.data.tut.first) setTimeout(() => this.ui.tip('tipTrump'), wait * 1000 - 300);
    }
    this.saveCur();
    this.busyUntil = performance.now() + wait * 1000;
    this.schedule();
  }

  announceFirst() {
    const g = this.game;
    if (!g || g.over) return;
    audio.play('flip');
    const suitName = t('suit' + g.trump);
    if (g.firstCard >= 0) {
      const who = g.attacker === 0 ? t('youFirst') : t('firstIs', { name: this.players[g.attacker].name });
      this.ui.toast(t('trumpIs', { s: suitName }) + '\n' + who);
    } else this.ui.toast(t('trumpIs', { s: suitName }));
  }

  toMenu() {
    clearTimeout(this.timer);
    if (this.game && !this.game.over) this.saveCur(true);
    this.state = 'menu';
    this.game = null;
    this.view.mode = 'menu';
    sdk.gameplay(false);
    audio.setMood('menu');
    this.ui.menu();
  }

  saveCur(cloud) {
    const g = this.game;
    if (!g) return;
    save.data.cur = g.over ? null : { g: g.toJSON(), players: this.players, cfg: this.cfg };
    save.write(!!cloud);
  }

  // рука игрока в удобном порядке
  sortedHand() {
    const g = this.game;
    if (!g) return [];
    const tr = g.trump;
    const byRank = save.data.settings.sort === 'rank';
    const so = SUIT_ORDER.filter((s) => s !== tr);
    const key = (c) => {
      const s = suit(c), r = rank(c);
      if (s === tr) return 1000 + r;
      return byRank ? r * 10 + so.indexOf(s) : so.indexOf(s) * 100 + r;
    };
    return [...g.hands[0]].sort((a, b) => key(a) - key(b));
  }

  // ---------- очередь ходов ----------
  delay() {
    const base = SPEED[save.data.settings.speed] || SPEED.normal;
    return this.turbo ? 0.22 : base;
  }

  // сколько бот «думает» перед ходом, с разбросом, как живой человек
  thinkTime(p) {
    if (this.turbo) return 0.22;
    const g = this.game;
    const k = SPEED[save.data.settings.speed] || 1;
    const R = (a, b) => a + Math.random() * (b - a);
    let s;
    if (g.needAttack()) s = R(1.3, 2.4) + (g.bout === 0 ? 0.6 : 0);
    else if (g.needDefense() && p === g.defender) s = R(1.2, 2.2) + 0.35 * (g.undefended() - 1);
    else s = R(0.9, 1.7);
    if (Math.random() < 0.12) s += R(0.6, 1.4); // иногда задумывается подольше
    return s * k;
  }

  nextBot() {
    const g = this.game;
    if (!g || g.over) return null;
    if (g.needAttack()) return g.attacker !== 0 ? g.attacker : null;
    if (g.needDefense()) return g.defender !== 0 ? g.defender : null;
    for (const p of g.throwers()) if (p !== 0) return p;
    return null;
  }

  schedule() {
    clearTimeout(this.timer);
    const g = this.game;
    if (!g || this.state !== 'play') return;
    this.refreshHuman();
    if (g.over) return;
    const p = this.nextBot();
    this.actor = p ?? (this.humanMust() ? 0 : -1);
    if (p == null) return;
    const g2 = g;
    let d = this.thinkTime(p) * 1000;
    const busy = Math.max(0, (this.busyUntil || 0) - performance.now());
    d += busy;
    this.thinkP = p;
    this.thinkFrom = performance.now() + busy + 350;
    this.timer = setTimeout(() => {
      if (this.game !== g2 || this.ui.modalOpen && !this.turbo) return this.ui.modalOpen ? (this.waitModal = true) : null;
      this.botTurn(p);
    }, d);
  }

  // после закрытия окна паузы — продолжить очередь
  unpause() {
    if (this.waitModal) {
      this.waitModal = false;
      this.schedule();
    }
  }

  botTurn(p) {
    this.thinkP = -1;
    const g = this.game;
    if (!g || g.over) return;
    let a = botAction(g, p, this.players[p].lvl);
    if (!a && p !== g.defender && g.table.length) a = { t: 'pass' };
    if (!a || !this.act(p, a)) {
      // на всякий случай: защитник берёт, подкидывающий пасует
      if (p === g.defender && g.needDefense()) this.act(p, { t: 'take' });
      else if (g.table.length) this.act(p, { t: 'pass' });
    }
  }

  humanMust() {
    const g = this.game;
    if (!g || g.over || g.out[0]) return false;
    if (g.needAttack()) return g.attacker === 0;
    if (g.needDefense()) return g.defender === 0;
    return g.throwers().includes(0);
  }

  // ---------- действие любого игрока ----------
  act(p, a) {
    const g = this.game, v = this.view;
    const ev = g.apply(p, a);
    if (!ev) return false;
    const st = this.st;
    st.sel = null;
    st.targets = null;
    st.hint = null;
    st.dropTarget = null;
    let busy = 0;
    for (const e of ev) {
      switch (e.t) {
        case 'attack':
          audio.play('card');
          break;
        case 'defend':
          audio.play('beat');
          break;
        case 'transfer':
          audio.play('transfer');
          v.say(p, t('sayTransfer'), 'good');
          break;
        case 'take':
          audio.play('takeSay');
          v.say(p, t('sayTake'), 'take');
          if (p === 0) this.ui.tipOnce('tipTaking', t('tipTaking'));
          break;
        case 'pass':
          if (e.bito) v.say(p, t('sayBito'), 'good');
          break;
        case 'beaten':
          setTimeout(() => audio.play('sweep'), 250);
          busy = Math.max(busy, 0.75);
          break;
        case 'pickup':
          setTimeout(() => audio.play('pickup'), 200);
          busy = Math.max(busy, 0.75);
          break;
        case 'draw': {
          const ids = e.list.map((x) => x[1]);
          v.stagger(ids, 0.08, 0.55);
          ids.forEach((_, i) => i % 2 === 0 && setTimeout(() => audio.play('deal'), 550 + i * 80));
          busy = Math.max(busy, 0.6 + ids.length * 0.08);
          if (!g.deck.length) setTimeout(() => audio.setMood('tense'), 600);
          break;
        }
        case 'out': {
          const pos = v.seatPos(e.p);
          setTimeout(() => {
            if (e.p === 0) {
              audio.play('win');
              v.burst(pos.x, pos.y, 40);
            } else audio.play('out');
            v.floatText(t('placeN', { n: e.place }), pos.x, pos.y - 20, '#bff0a8', 30);
            if (e.p) v.say(e.p, t('sayOut'), 'good');
          }, 700);
          if (e.p === 0 && !g.over) {
            this.turbo = true;
            setTimeout(() => this.ui.humanOut(e.place), 900);
          }
          break;
        }
        case 'end':
          this.finished = true;
          setTimeout(() => this.finish(), Math.max(busy, 0.8) * 1000 + 900);
          break;
      }
    }
    this.busyUntil = performance.now() + busy * 1000;
    this.saveCur(ev.some((e) => e.t === 'beaten' || e.t === 'pickup'));
    this.ui.hudUpdate();
    this.schedule();
    return true;
  }

  // ---------- ход игрока ----------
  refreshHuman() {
    const g = this.game, st = this.st;
    if (!g) return;
    const acts = g.over || g.out[0] ? [] : g.actions(0);
    st.acts = acts;
    st.legal = new Set(acts.filter((a) => a.c != null).map((a) => a.c));
    st.dim = this.humanMust();
    if (st.sel != null && !st.legal.has(st.sel)) {
      st.sel = null;
      st.targets = null;
    }
    this.ui.updateControls();
  }

  optionsFor(c) {
    return (this.st.acts || []).filter((a) => a.c === c);
  }

  hintsOn() {
    return save.data.settings.hints !== false;
  }

  humanAct(a) {
    if (!this.game || this.game.over) return false;
    if (this.busy()) {
      // карты ещё летят: ход выполнится сразу после анимации
      const g = this.game;
      clearTimeout(this.queued);
      this.queued = setTimeout(() => this.game === g && this.humanAct(a), Math.max(60, (this.busyUntil || 0) - 250 - performance.now() + 20));
      return true;
    }
    const ok = this.act(0, a);
    if (ok && !save.data.tut.first) {
      save.data.tut.first = 1;
      save.write(false);
    }
    return ok;
  }

  busy() {
    return performance.now() < (this.busyUntil || 0) - 250;
  }

  tapCard(c) {
    const st = this.st;
    const opts = this.optionsFor(c);
    if (!opts.length) {
      audio.play('deny');
      this.explainDeny(c);
      return;
    }
    if (opts.length === 1) {
      this.humanAct(opts[0]);
      return;
    }
    if (st.sel === c) {
      st.sel = null;
      st.targets = null;
      return;
    }
    st.sel = c;
    st.targets = opts;
    audio.play('pick');
    this.ui.tipOnce('tipChoose', t('tipChoose'));
  }

  explainDeny(c) {
    const g = this.game;
    if (g.over || g.out[0]) return;
    if (g.defender === 0 && g.needDefense()) this.ui.toast(t('denyBeat'));
    else if (g.needAttack() && g.attacker !== 0) this.ui.toast(t('denyWait'));
    else if (g.table.length && g.defender !== 0) this.ui.toast(g.table.length >= g.limit() ? t('denyLimit') : t('denyRank'));
  }

  // нажатие по столу при выбранной карте
  tapTable(x, y) {
    const st = this.st, g = this.game, v = this.view;
    if (st.sel == null || !st.targets) return false;
    const i = v.tableAt(g, x, y, this);
    let a = null;
    if (i >= 0) a = st.targets.find((o) => o.t === 'defend' && o.i === i);
    if (!a && v.overTable(x, y)) a = st.targets.find((o) => o.t === 'transfer' || o.t === 'attack');
    if (a) {
      this.humanAct(a);
      return true;
    }
    return false;
  }

  dropTargetAt(c, x, y) {
    const g = this.game, v = this.view;
    const opts = this.optionsFor(c);
    if (!opts.length) return null;
    const i = v.tableAt(g, x, y, this);
    if (i >= 0) {
      const d = opts.find((o) => o.t === 'defend' && o.i === i);
      if (d) return d;
    }
    if (!v.overTable(x, y)) return null;
    const tr = opts.find((o) => o.t === 'transfer' || o.t === 'attack');
    if (tr && i < 0) return tr;
    const defs = opts.filter((o) => o.t === 'defend');
    if (defs.length === 1) return defs[0];
    return tr || null;
  }

  bindInput(cv) {
    const pos = (e) => ({ x: e.clientX, y: e.clientY });
    cv.addEventListener('pointerdown', (e) => {
      audio.unlock();
      if (this.state !== 'play' || this.ui.modalOpen || !this.game) return;
      try {
        cv.setPointerCapture(e.pointerId);
      } catch (err) {}
      this.down(pos(e));
    });
    cv.addEventListener('pointermove', (e) => {
      if (this.state !== 'play' || !this.game) return;
      this.move(pos(e), e.pointerType === 'mouse');
    });
    cv.addEventListener('pointerup', (e) => {
      if (this.state !== 'play' || !this.game) return;
      this.up(pos(e));
    });
    cv.addEventListener('pointercancel', () => {
      this.st.drag = null;
      this.st.dropTarget = null;
    });
  }

  down(p) {
    const st = this.st, v = this.view;
    const c = v.handAt(this, p.x, p.y);
    if (c != null) {
      const s = v.sp.get(c);
      // точка захвата сохраняется: карта едет ровно под пальцем
      st.drag = { id: c, sx: p.x, sy: p.y, x: p.x, y: p.y, ox: p.x - (s ? s.x : p.x), oy: p.y - (s ? s.y : p.y), moved: false, t0: performance.now() };
      return;
    }
    if (this.tapTable(p.x, p.y)) return;
    if (st.sel != null) {
      st.sel = null;
      st.targets = null;
    }
  }

  move(p, mouse) {
    const st = this.st, v = this.view;
    const d = st.drag;
    if (mouse && !d) st.hover = v.handAt(this, p.x, p.y);
    if (!d) return;
    d.x = p.x;
    d.y = p.y;
    if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 12) {
      if (!st.legal || !st.legal.has(d.id)) {
        st.drag = null;
        return;
      }
      d.moved = true;
      st.sel = null;
      st.targets = this.optionsFor(d.id);
      audio.play('pick');
    }
    if (d.moved) st.dropTarget = this.dropTargetAt(d.id, p.x, p.y);
  }

  up(p) {
    const st = this.st;
    const d = st.drag;
    st.drag = null;
    if (!d) return;
    if (!d.moved) {
      this.tapCard(d.id);
      return;
    }
    const a = this.dropTargetAt(d.id, p.x, p.y);
    st.dropTarget = null;
    st.targets = null;
    if (!a || !this.humanAct(a)) audio.play('back');
  }

  // кнопка «Перевести»: самой младшей подходящей картой, козырь — в последнюю очередь
  transferButton() {
    const g = this.game;
    const tr = (this.st.acts || []).filter((a) => a.t === 'transfer');
    if (!tr.length) return;
    const val = (c) => (c >> 4 === g.trump ? 100 : 0) + (c & 15);
    tr.sort((a, b) => val(a.c) - val(b.c));
    this.humanAct(tr[0]);
  }

  // кнопки «Беру» / «Бито» / «Пас»
  mainButton() {
    const g = this.game;
    if (!g || g.over || this.busy()) return;
    if (g.defender === 0 && g.needDefense()) return this.humanAct({ t: 'take' });
    if (g.table.length && g.defender !== 0) return this.humanAct({ t: 'pass' });
  }

  // ---------- подсказка ----------
  useHint() {
    const g = this.game;
    if (!g || g.over || !this.humanMust()) {
      this.ui.toast(t('hintWait'));
      return;
    }
    const d = save.data;
    const show = () => {
      const a = hintFor(g, 0);
      if (!a) return;
      audio.play('hint');
      if (a.c != null) {
        this.st.hint = a.c;
        if (a.t === 'defend' || a.t === 'transfer') {
          this.st.sel = a.c;
          this.st.targets = [a];
        }
      }
      this.ui.toast(a.t === 'take' ? t('hintTake') : a.t === 'pass' ? (g.phase === 'attack' && !g.undefended() && g.attacker === 0 ? t('hintBito') : t('hintPass')) : a.t === 'transfer' ? t('hintTransfer') : t('hintCard'));
    };
    if (d.hints > 0) {
      d.hints--;
      save.write();
      show();
    } else if (d.coins >= HINT_PRICE) {
      d.coins -= HINT_PRICE;
      save.write();
      show();
    } else return this.ui.needCoins(() => sdk.showRewarded(show));
    this.ui.refresh();
  }

  // ---------- конец партии ----------
  // игрок вышел — досыграть без показа
  skipToEnd() {
    const g = this.game;
    if (!g || g.over) return;
    clearTimeout(this.timer);
    let guard = 0;
    while (!g.over && guard++ < 3000) {
      const p = this.nextBot();
      if (p == null) break;
      let a = botAction(g, p, this.players[p].lvl);
      if (!a && p !== g.defender && g.table.length) a = { t: 'pass' };
      if (!a || !g.apply(p, a)) {
        if (p === g.defender && g.needDefense()) g.apply(p, { t: 'take' });
        else g.apply(p, { t: 'pass' });
      }
    }
    if (g.over && !this.finished) {
      this.finished = true;
      this.finish();
    }
  }

  finish() {
    const g = this.game;
    if (!g || this.state !== 'play') return;
    sdk.gameplay(false);
    clearTimeout(this.timer);
    const d = save.data;
    const n = g.n, lvl = this.cfg.level;
    const mult = LVL_MULT[lvl] * (this.cfg.mode === 'perevodnoy' ? 1.1 : 1);
    let points = 0, coins = 5, kind;
    const place = g.places.indexOf(0);
    if (g.durak === 0) kind = 'lose';
    else if (g.durak < 0) {
      kind = 'draw';
      points = Math.round(3 * mult);
      coins = 12;
    } else {
      kind = place === 0 ? 'win' : 'ok';
      const base = 10 * mult * (n - 1);
      points = Math.round((base * (n - 1 - Math.max(0, place))) / (n - 1));
      coins = 15 + points;
    }
    d.stats.games++;
    if (kind === 'win' || kind === 'ok') d.stats.wins++;
    if (kind === 'win') d.stats.firsts++;
    if (kind === 'lose') d.stats.duraks++;
    d.streak = kind === 'lose' ? 0 : kind === 'draw' ? d.streak : d.streak + 1;
    d.stats.bestStreak = Math.max(d.stats.bestStreak, d.streak);
    d.points += points;
    d.coins += coins;
    d.cur = null;
    save.write();
    if (points) sdk.submitScore(d.points);
    audio.setMood(kind === 'lose' ? 'menu' : 'win');
    audio.play(kind === 'lose' ? 'lose' : kind === 'draw' ? 'draw' : 'fanfare');
    if (kind === 'win' || kind === 'ok') this.view.burst(this.view.W / 2, this.view.H * 0.45, 60);
    this.ui.result({ kind, place: place + 1, points, coins, n });
  }

  // полноэкранная реклама между партиями
  adBreak(cb) {
    if (Date.now() - this.lastAd < AD_GAP || save.data.noAds) return cb();
    this.lastAd = Date.now();
    sdk.showInterstitial(cb);
  }

  setLook(o) {
    Object.assign(save.data, o);
    save.write();
    this.view.setLook({ cloth: save.data.cloth, back: save.data.back, four: save.data.settings.four });
  }
}
