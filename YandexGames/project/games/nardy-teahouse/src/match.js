// Партия: очередь ходов, бросок кубиков, ввод игрока (выбор шашки, цели, перетаскивание), ходы бота, отмена, подсказка
import { newGame, startTurn, legalSteps, playStep, undoTurnStep, endTurn, result, clone, pips, toJSON, fromJSON, absOf } from './rules.js';
import { choose } from './bot.js';

const ME = 0;
const BOT = 1;
// для промо можно задать заранее выпадающие кубики: window.__NB_DEBUG.dice = [5, 3, ...]
const r6 = () => {
  const q = typeof window !== 'undefined' && window.__NB_DEBUG && window.__NB_DEBUG.dice;
  if (q && q.length) return q.shift();
  return 1 + Math.floor(Math.random() * 6);
};
const cloneTurn = (t) => ({ p: t.p, roll: t.roll.slice(), dice: t.dice.slice(), head: t.head, steps: t.steps.slice() });

export class Match {
  constructor(scene, cb) {
    this.sc = scene;
    this.cb = cb; // { status(key, vars), phase(ph), hud(), end(res), sound(n), save(snap), settings() }
    this.timers = [];
    this.phase = 'idle';
  }

  // ---------- запуск ----------
  start({ mode, level, snap }) {
    this.timers = [];
    this.mode = mode;
    this.level = level;
    this.hints = 3;
    this.myTurns = 0;
    this.trail = [];
    this.sel = null;
    this.targets = new Map();
    this.movable = new Set();
    if (snap) {
      this.s = fromJSON(snap.s);
      this.hints = snap.hints ?? 3;
      this.sc.layout(this.s);
      this.sc.hideDice();
      this.cur = snap.cur;
      this.later(0.6, () => this.beginTurn());
    } else {
      this.s = newGame(mode);
      this.sc.layout(this.s);
      this.sc.hideDice();
      this.cur = -1;
      this.setPhase('opening');
      this.cb.status('st_opening');
      if (this.cb.settings().autoroll) this.later(0.8, () => this.phase === 'opening' && this.roll());
    }
    this.sc.highlight({});
    this.sc.showTrail([]);
    this.cb.hud();
  }
  stop() {
    this.timers = [];
    this.phase = 'idle';
    this.sc.highlight({});
    this.sc.showTrail([]);
  }
  snapshot() {
    return { mode: this.mode, level: this.level, s: toJSON(this.s), cur: this.cur, hints: this.hints };
  }

  later(sec, fn) {
    this.timers.push({ t: sec, fn });
  }
  update(dt) {
    if (!this.timers.length) return;
    const list = this.timers;
    this.timers = [];
    for (const x of list) {
      x.t -= dt;
      if (x.t <= 0) x.fn();
      else this.timers.push(x);
    }
  }
  setPhase(p) {
    this.phase = p;
    this.cb.phase(p);
  }
  get busy() {
    return this.sc.anims.length > 0 || this.stepping;
  }

  // ---------- ход ----------
  beginTurn() {
    if (this.phase === 'over') return;
    this.sc.highlight({});
    this.turn = null;
    this.cb.save(this.snapshot());
    this.cb.hud();
    if (this.cur === ME) {
      this.myTurns = (this.myTurns || 0) + 1;
      this.setPhase('roll');
      this.cb.status('st_roll');
      this.cb.sound('turn');
      if (this.cb.settings().autoroll) this.later(0.7, () => this.phase === 'roll' && this.roll());
    } else this.botTurn();
  }

  // кнопка «Бросить»
  roll() {
    if (this.phase === 'opening') {
      if (this.busy) return;
      const a = r6();
      let b = r6();
      this.setPhase('openingRoll');
      this.cb.status('st_opening');
      this.sc.throwDice([a], 0, null, false, 0);
      this.sc.throwDice([b], 1, () => {
        this.cb.hud({ opening: [a, b] });
        if (a === b) {
          this.cb.status('st_tie');
          this.later(1.3, () => {
            this.setPhase('opening');
            this.roll();
          });
          return;
        }
        this.cur = a > b ? ME : BOT;
        this.cb.status(a > b ? 'st_youFirst' : 'st_botFirst');
        this.cb.sound(a > b ? 'good' : 'turn');
        this.later(1.5, () => {
          this.sc.hideDice();
          this.cb.hud({ opening: null });
          this.beginTurn();
        });
      }, false, 1);
      return;
    }
    if (this.phase !== 'roll' || this.busy) return;
    const a = r6();
    const b = r6();
    this.setPhase('rolling');
    this.cb.status('');
    this.sc.throwDice([a, b], 0, () => {
      this.turn = startTurn(this.s, ME, a, b);
      this.cb.hud();
      if (a === b) this.cb.status('diceDouble');
      this.afterHumanStep(true);
    });
  }

  // пересчёт законных ходов игрока
  afterHumanStep(first = false) {
    const legal = legalSteps(this.s, ME, this.turn);
    this.legal = legal;
    this.sel = null;
    this.targets = new Map();
    this.movable = new Set(legal.map((m) => this.loc(ME, m.from)));
    this.updateDice();
    if (!legal.length) {
      this.sc.highlight({});
      if (!this.turn.steps.length) {
        this.setPhase('noMove');
        this.cb.status('st_noMove');
        this.cb.sound('deny');
        this.later(1.6, () => this.finishTurn());
        return;
      }
      if (this.cb.settings().confirm) {
        this.setPhase('confirm');
        this.cb.status('st_confirm');
        return;
      }
      this.setPhase('ending');
      this.cb.status('');
      this.later(0.35, () => this.finishTurn());
      return;
    }
    this.setPhase('move');
    if (!first || this.turn.roll[0] !== this.turn.roll[1]) this.cb.status(this.s.bar[ME] ? 'st_bar' : 'st_pick');
    // единственный источник — сразу выбран
    if (this.movable.size === 1) this.select([...this.movable][0]);
    else this.paint();
    this.cb.hud();
  }
  updateDice() {
    const t = this.turn;
    if (!t) return;
    const [a, b] = t.roll;
    if (a === b) {
      const left = t.dice.length;
      this.sc.setDiceUsed([left <= 2, left === 0]);
    } else this.sc.setDiceUsed([!t.dice.includes(a), !t.dice.includes(b)]);
  }

  loc(p, t) {
    return this.sc.locOf(this.mode, p, t);
  }
  // позиция дорожки игрока по месту на доске
  trackAt(loc) {
    if (!loc) return null;
    if (loc === 'bar' || loc === 'bar0') return -1;
    if (loc.startsWith('tray') || loc === 'off0') return 24;
    if (loc[0] === 'a') return 23 - +loc.slice(1);
    return null;
  }
  norm(loc) {
    if (!loc) return null;
    if (loc === 'bar') return 'bar0';
    if (loc.startsWith('tray')) return 'off0';
    return loc;
  }

  // цели для выбранной шашки: одиночные шаги и суммы кубиков одной шашкой
  computeTargets(fromT) {
    const res = new Map();
    const q = [{ s: clone(this.s), turn: cloneTurn(this.turn), pos: fromT, path: [] }];
    while (q.length) {
      const n = q.shift();
      const steps = legalSteps(n.s, ME, n.turn).filter((m) => m.from === n.pos);
      for (const m of steps) {
        const path = n.path.concat([{ from: m.from, to: m.to, d: m.d }]);
        const key = this.loc(ME, m.to);
        if (!res.has(key)) res.set(key, path);
        if (m.to < 24 && path.length < 4) {
          const s2 = clone(n.s);
          const t2 = cloneTurn(n.turn);
          playStep(s2, t2, m);
          q.push({ s: s2, turn: t2, pos: m.to, path });
        }
      }
    }
    return res;
  }
  select(loc) {
    this.sel = loc;
    this.targets = this.computeTargets(this.trackAt(loc));
    this.hinted = null;
    this.cb.status('st_target');
    this.cb.sound('select');
    this.paint();
  }
  deselect() {
    this.sel = null;
    this.targets = new Map();
    this.hinted = null;
    this.cb.status(this.s.bar[ME] ? 'st_bar' : 'st_pick');
    this.paint();
  }
  paint() {
    const t = this.hinted ? [this.hinted] : [...this.targets.keys()];
    this.sc.highlight({ targets: t, movable: this.sel ? [this.sel] : [...this.movable], sel: this.sel });
  }

  // касание доски
  tap(raw) {
    if (this.phase === 'opening' || this.phase === 'roll') {
      if (raw) this.roll();
      return;
    }
    if (this.phase !== 'move' || this.busy) return;
    const loc = this.norm(raw);
    if (loc && this.targets.has(loc)) return this.moveTo(loc);
    if (loc && this.movable.has(loc)) {
      if (this.sel === loc && this.movable.size > 1) return this.deselect();
      return this.select(loc);
    }
    if (this.sel && this.movable.size > 1) this.deselect();
    else this.cb.sound('deny');
  }
  canDrag(raw) {
    const loc = this.norm(raw);
    return this.phase === 'move' && !this.busy && loc && this.movable.has(loc) ? loc : null;
  }
  isTarget(raw) {
    return this.targets.has(this.norm(raw));
  }

  // выполнить путь до цели (один или несколько шагов одной шашкой)
  moveTo(loc) {
    const path = this.targets.get(loc);
    if (!path) return;
    this.sel = null;
    this.targets = new Map();
    this.hinted = null;
    this.sc.highlight({});
    this.stepping = true;
    this.setPhase('animating');
    const run = (i) => {
      if (i >= path.length) {
        this.stepping = false;
        this.cb.hud();
        this.afterHumanStep();
        return;
      }
      const want = path[i];
      const m = legalSteps(this.s, ME, this.turn).find((x) => x.from === want.from && x.to === want.to && x.d === want.d);
      if (!m) {
        this.stepping = false;
        this.afterHumanStep();
        return;
      }
      this.doStep(ME, m, () => run(i + 1));
    };
    run(0);
  }
  doStep(p, m, done) {
    const st = playStep(this.s, this.turn, m);
    const from = this.loc(p, m.from);
    const to = this.loc(p, m.to);
    if (st.hit) {
      this.cb.sound('hit');
      this.sc.move(to, 'bar' + (1 - p), null, 0.5);
    }
    this.sc.move(from, to, () => {
      this.cb.hud();
      done && done();
    }, p === BOT ? 0.5 : 0.4);
    this.updateDice();
    return st;
  }

  canUndo() {
    return (this.phase === 'move' || this.phase === 'confirm') && this.turn && this.turn.steps.length > 0 && !this.busy;
  }
  undo() {
    if (!this.canUndo()) return;
    const st = undoTurnStep(this.s, this.turn);
    const from = this.loc(ME, st.from);
    const to = this.loc(ME, st.to);
    this.stepping = true;
    this.sc.highlight({});
    this.sc.move(to, from, () => {
      if (st.hit) this.sc.move('bar' + BOT, to, null, 0.35);
      this.stepping = false;
      this.cb.sound('undo');
      this.afterHumanStep();
    }, 0.3);
  }
  confirm() {
    if (this.phase !== 'confirm') return;
    this.setPhase('ending');
    this.finishTurn();
  }

  // подсказка: лучший ход «мастера» из текущей позиции
  hint() {
    if (this.phase !== 'move' || this.busy) return false;
    const steps = choose(this.s, ME, cloneTurn(this.turn), 2);
    if (!steps.length) return false;
    const first = steps[0];
    const fromLoc = this.loc(ME, first.from);
    this.select(fromLoc);
    // цель — куда эта шашка придёт по совету (может быть сумма кубиков)
    let pos = first.from;
    for (const st of steps) if (st.from === pos) pos = st.to;
    const to = this.loc(ME, pos);
    this.hinted = this.targets.has(to) ? to : this.loc(ME, first.to);
    this.hints--;
    this.paint();
    this.cb.sound('hint');
    return true;
  }

  // ---------- конец хода ----------
  finishTurn() {
    if (this.phase === 'over') return;
    if (this.turn) endTurn(this.s, this.turn);
    this.sc.highlight({});
    const p = this.cur;
    const r = result(this.s, p);
    this.cb.hud();
    if (r) {
      this.setPhase('over');
      this.later(0.6, () => this.cb.end({ winner: p, mult: r }));
      return;
    }
    this.cur = 1 - p;
    this.turn = null;
    this.later(this.cur === BOT ? 0.35 : 0.2, () => {
      if (this.cur === ME) this.sc.hideDice();
      this.beginTurn();
    });
  }

  // ---------- ход бота ----------
  botTurn() {
    this.setPhase('bot');
    this.cb.status('st_bot');
    this.later(0.55, () => {
      const a = r6();
      const b = r6();
      this.sc.throwDice([a, b], 1, () => {
        this.turn = startTurn(this.s, BOT, a, b);
        this.cb.hud();
        this.later(0.35, () => {
          const steps = choose(this.s, BOT, cloneTurn(this.turn), this.level);
          if (!steps.length) {
            this.cb.status('st_botNoMove');
            this.later(1.4, () => this.finishTurn());
            return;
          }
          const trail = [];
          const run = (i) => {
            if (this.phase === 'over' || this.phase === 'idle') return;
            if (i >= steps.length) {
              this.sc.showTrail(trail);
              this.later(0.45, () => this.finishTurn());
              return;
            }
            const want = steps[i];
            const m = legalSteps(this.s, BOT, this.turn).find((x) => x.from === want.from && x.to === want.to && x.d === want.d);
            if (!m) {
              this.later(0.3, () => this.finishTurn());
              return;
            }
            trail.push(this.loc(BOT, m.from), this.loc(BOT, m.to));
            this.doStep(BOT, m, () => this.later(0.18, () => run(i + 1)));
          };
          this.sc.showTrail([]);
          run(0);
        });
      });
    });
  }

  // сдача партии
  resign() {
    this.stop();
    this.phase = 'over';
    this.cb.end({ winner: BOT, mult: 1, resign: true });
  }

  pips(p) {
    return pips(this.s, p);
  }
  // для промо: абсолютный пункт по дорожке
  abs(p, t) {
    return absOf(this.mode, p, t);
  }
}
