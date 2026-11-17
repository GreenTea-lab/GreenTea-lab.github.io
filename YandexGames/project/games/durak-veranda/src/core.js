// Правила дурака: подкидной и переводной, 2–6 игроков, колода 24/36/52.
// Карта — число: масть * 16 + достоинство (2..14, где 11 В, 12 Д, 13 К, 14 Т). Масти: 0 ♥, 1 ♦, 2 ♣, 3 ♠.
export const suit = (c) => c >> 4;
export const rank = (c) => c & 15;
export const card = (s, r) => s * 16 + r;

export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export const LOW = { 24: 9, 36: 6, 52: 2 };
export const maxPlayers = (deck) => Math.min(6, Math.floor(deck / 6));

export function makeDeck(size, R) {
  const d = [];
  for (let s = 0; s < 4; s++) for (let r = LOW[size]; r <= 14; r++) d.push(card(s, r));
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// бьёт ли карта b карту a при козыре tr
export const beats = (b, a, tr) => (suit(b) === suit(a) ? rank(b) > rank(a) : suit(b) === tr && suit(a) !== tr);

export class Game {
  constructor(o = {}) {
    if (o.json) return this;
    this.n = o.players || 2;
    this.size = o.deck || 36;
    this.mode = o.mode || 'podkidnoy';
    this.seed = o.seed ?? 1;
    const R = rng(this.seed);
    this.deck = makeDeck(this.size, R); // последний элемент — верх колоды, нулевой — козырь под колодой
    this.hands = Array.from({ length: this.n }, () => []);
    this.out = Array(this.n).fill(false);
    this.places = []; // порядок выхода
    this.table = []; // [{a, d}]
    this.discard = [];
    this.known = Array.from({ length: this.n }, () => []); // карты на руках, которые все видели (взятые)
    this.passed = Array(this.n).fill(false);
    this.phase = 'attack'; // 'attack' | 'take'
    this.over = false;
    this.durak = -1;
    this.bout = 0;
    this.trumpCard = this.deck[0];
    this.trump = suit(this.trumpCard);
    // раздача по 6 карт; если колода кончилась (36 карт на шестерых) — козырь у последнего
    for (let k = 0; k < 6; k++) for (let p = 0; p < this.n; p++) if (this.deck.length) this.hands[p].push(this.deck.pop());
    if (!this.deck.length) this.known[(this.n - 1) % this.n].push(this.trumpCard);
    // первым ходит игрок с младшим козырем
    let first = o.first ?? -1, low = 99;
    if (first < 0) {
      for (let p = 0; p < this.n; p++) for (const c of this.hands[p]) if (suit(c) === this.trump && rank(c) < low) (low = rank(c)), (first = p);
      this.firstCard = first >= 0 ? card(this.trump, low) : -1;
      if (first < 0) first = Math.floor(R() * this.n);
    }
    this.attacker = first;
    this.defender = this.nextActive(first);
    this.defStart = this.hands[this.defender].length;
    this.mainAttacker = first;
  }

  toJSON() {
    const o = {};
    for (const k of ['n', 'size', 'mode', 'seed', 'deck', 'hands', 'out', 'places', 'table', 'discard', 'known', 'passed', 'phase', 'over', 'durak', 'bout', 'trumpCard', 'trump', 'attacker', 'defender', 'defStart', 'firstCard']) o[k] = this[k];
    return JSON.parse(JSON.stringify(o));
  }
  static fromJSON(o) {
    const g = new Game({ json: true });
    Object.assign(g, JSON.parse(JSON.stringify(o)));
    return g;
  }
  clone() {
    return Game.fromJSON(this.toJSON());
  }

  active(p) {
    return !this.out[p];
  }
  nextActive(p) {
    for (let k = 1; k <= this.n; k++) {
      const q = (p + k) % this.n;
      if (!this.out[q]) return q;
    }
    return p;
  }
  activeCount() {
    return this.out.filter((x) => !x).length;
  }
  undefended() {
    return this.table.filter((x) => x.d == null).length;
  }
  ranksOnTable() {
    const s = new Set();
    for (const x of this.table) {
      s.add(rank(x.a));
      if (x.d != null) s.add(rank(x.d));
    }
    return s;
  }
  limit() {
    return Math.min(6, this.defStart);
  }

  // может ли игрок сейчас подкинуть / сходить картой c
  canAttack(p, c) {
    if (this.over || p === this.defender || this.out[p]) return false;
    if (!this.hands[p].includes(c)) return false;
    if (!this.table.length) return p === this.attacker;
    if (this.table.length >= this.limit()) return false;
    if (this.phase === 'attack' && this.undefended() + 1 > this.hands[this.defender].length) return false;
    return this.ranksOnTable().has(rank(c));
  }
  canThrowAny(p) {
    return this.hands[p].some((c) => this.canAttack(p, c));
  }
  canDefend(c, i) {
    if (this.over || this.phase !== 'attack') return false;
    const x = this.table[i];
    return !!x && x.d == null && this.hands[this.defender].includes(c) && beats(c, x.a, this.trump);
  }
  // перевод: ни одна карта ещё не побита, все карты на столе одного достоинства
  canTransfer(c) {
    if (this.mode !== 'perevodnoy' || this.over || this.phase !== 'attack' || !this.table.length) return false;
    if (!this.hands[this.defender].includes(c)) return false;
    if (this.table.some((x) => x.d != null)) return false;
    const r = rank(this.table[0].a);
    if (rank(c) !== r || this.table.some((x) => rank(x.a) !== r)) return false;
    const nd = this.nextActive(this.defender);
    if (nd === this.defender) return false;
    if (this.table.length + 1 > Math.min(6, this.hands[nd].length)) return false;
    return true;
  }

  // кто должен что-то сделать: нужен ход атакующего, ответ защитника, или ждём подкидывающих
  needAttack() {
    return !this.over && !this.table.length;
  }
  needDefense() {
    return !this.over && this.phase === 'attack' && this.undefended() > 0;
  }
  // игроки, которые ещё могут подкинуть и не сказали «пас»
  throwers() {
    if (this.over || !this.table.length) return [];
    const res = [];
    for (let k = 0; k < this.n; k++) {
      const p = (this.attacker + k) % this.n;
      if (p === this.defender || this.out[p] || this.passed[p]) continue;
      if (this.canThrowAny(p)) res.push(p);
    }
    return res;
  }

  // ---------- действия; каждое возвращает массив событий или null ----------
  attack(p, c) {
    if (!this.canAttack(p, c)) return null;
    this.hands[p].splice(this.hands[p].indexOf(c), 1);
    this.forget(p, c);
    this.table.push({ a: c, d: null });
    this.passed.fill(false);
    return [{ t: 'attack', p, c }, ...this.settle()];
  }
  defend(c, i) {
    if (!this.canDefend(c, i)) return null;
    const p = this.defender;
    this.hands[p].splice(this.hands[p].indexOf(c), 1);
    this.forget(p, c);
    this.table[i].d = c;
    this.passed.fill(false);
    return [{ t: 'defend', p, c, i }, ...this.settle()];
  }
  transfer(c) {
    if (!this.canTransfer(c)) return null;
    const p = this.defender;
    this.hands[p].splice(this.hands[p].indexOf(c), 1);
    this.forget(p, c);
    this.table.push({ a: c, d: null });
    this.attacker = p;
    this.defender = this.nextActive(p);
    this.defStart = this.hands[this.defender].length;
    this.passed.fill(false);
    return [{ t: 'transfer', p, c, to: this.defender }, ...this.settle()];
  }
  take() {
    if (this.over || this.phase !== 'attack' || !this.undefended()) return null;
    this.phase = 'take';
    this.passed.fill(false);
    return [{ t: 'take', p: this.defender }, ...this.settle()];
  }
  pass(p) {
    if (this.over || p === this.defender || !this.table.length || this.passed[p]) return null;
    this.passed[p] = true;
    return [{ t: 'pass', p, bito: this.phase === 'attack' && !this.undefended() && p === this.attacker }, ...this.settle()];
  }

  forget(p, c) {
    const i = this.known[p].indexOf(c);
    if (i >= 0) this.known[p].splice(i, 1);
  }

  // проверка конца кона: все побито (или защитник берёт) и подкидывать больше некому
  settle() {
    if (!this.table.length) return [];
    const def = this.defender;
    if (this.phase === 'attack') {
      if (this.undefended()) return [];
      if (this.hands[def].length && this.throwers().length) return [];
      return this.endBout(false);
    }
    if (this.throwers().length) return [];
    return this.endBout(true);
  }

  endBout(took) {
    const ev = [];
    const def = this.defender;
    const cards = [];
    for (const x of this.table) {
      cards.push(x.a);
      if (x.d != null) cards.push(x.d);
    }
    this.table = [];
    if (took) {
      this.hands[def].push(...cards);
      this.known[def].push(...cards);
      ev.push({ t: 'pickup', p: def, cards });
    } else {
      this.discard.push(...cards);
      ev.push({ t: 'beaten', cards });
    }
    // добор: главный атакующий, остальные по кругу, защитник последним
    const order = [];
    for (let k = 0; k < this.n; k++) {
      const p = (this.attacker + k) % this.n;
      if (p !== def && !this.out[p]) order.push(p);
    }
    if (!this.out[def]) order.push(def);
    const drawn = [];
    for (const p of order) {
      while (this.hands[p].length < 6 && this.deck.length) {
        const c = this.deck.pop();
        if (c === this.trumpCard) this.known[p].push(c);
        this.hands[p].push(c);
        drawn.push([p, c]);
      }
    }
    if (drawn.length) ev.push({ t: 'draw', list: drawn });
    // вышедшие
    if (!this.deck.length) {
      for (const p of order) {
        if (!this.out[p] && !this.hands[p].length) {
          this.out[p] = true;
          this.places.push(p);
          ev.push({ t: 'out', p, place: this.places.length });
        }
      }
    }
    this.bout++;
    this.phase = 'attack';
    this.passed.fill(false);
    const left = [];
    for (let p = 0; p < this.n; p++) if (!this.out[p]) left.push(p);
    if (left.length <= 1) {
      this.over = true;
      this.durak = left.length ? left[0] : -1;
      ev.push({ t: 'end', durak: this.durak });
      return ev;
    }
    // следующий ход: отбился — ходит защитник; взял — следующий за ним
    let na = took ? this.nextActive(def) : this.out[def] ? this.nextActive(def) : def;
    this.attacker = na;
    this.defender = this.nextActive(na);
    this.defStart = this.hands[this.defender].length;
    ev.push({ t: 'turn', attacker: this.attacker, defender: this.defender });
    return ev;
  }

  // все допустимые действия игрока p
  actions(p) {
    const res = [];
    if (this.over || this.out[p]) return res;
    if (p === this.defender) {
      if (this.phase === 'attack') {
        for (const c of this.hands[p]) {
          this.table.forEach((x, i) => {
            if (x.d == null && beats(c, x.a, this.trump)) res.push({ t: 'defend', c, i });
          });
          if (this.canTransfer(c)) res.push({ t: 'transfer', c });
        }
        if (this.undefended()) res.push({ t: 'take' });
      }
      return res;
    }
    for (const c of this.hands[p]) if (this.canAttack(p, c)) res.push({ t: 'attack', c });
    if (this.table.length && !this.passed[p]) res.push({ t: 'pass' });
    return res;
  }

  apply(p, a) {
    switch (a.t) {
      case 'attack': return this.attack(p, a.c);
      case 'defend': return p === this.defender ? this.defend(a.c, a.i) : null;
      case 'transfer': return p === this.defender ? this.transfer(a.c) : null;
      case 'take': return p === this.defender ? this.take() : null;
      case 'pass': return this.pass(p);
    }
    return null;
  }
}
