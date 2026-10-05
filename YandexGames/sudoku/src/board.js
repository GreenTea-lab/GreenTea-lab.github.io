// Экран судоку: доска, цифры, заметки, отмена, подсказка, подсветка, анимации решённых групп
import { IC } from './icons.js';
import { t, fmtTime } from './i18n.js';
import { audio } from './audio.js';
import { ROW, COL, BOX, UNITS, PEERS, parse, solve } from './sudoku.js';

export const HINT_COST = 30;
const bit = (d) => 1 << (d - 1);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export class Board {
  // app: { coins, spend, onBack, onComplete, onChange, notEnough, toast, settings, store, blocked, autoCheck, onSelect, onPlace, burst }
  constructor(app) {
    this.app = app;
    this.el = document.createElement('div');
    this.el.id = 'game';
    this.el.className = 'view hidden';
    this.el.innerHTML = `
      <header class="bar">
        <button class="backbtn g-back">${IC.back}<span>${esc(t('menu'))}</span></button>
        <div class="ttl g-ttl"></div>
        <button class="chip g-coins">${IC.coin}<span class="cv">0</span></button>
        <button class="ibtn g-set" aria-label="settings">${IC.gear}</button>
      </header>
      <div class="gbody">
        <div class="gleft">
          <div class="info"><span class="pill diff g-diff"></span><span class="pill g-time">${IC.clock}<span>0:00</span></span><span class="pill mist g-mist">${IC.cross}<span>0</span></span></div>
          <div class="boardbox"><div class="board"></div></div>
        </div>
        <div class="gright">
          <div class="tools">
            <button class="tool t-undo"><span class="tr">${IC.undo}</span><span class="tl">${esc(t('undo'))}</span></button>
            <button class="tool t-erase"><span class="tr">${IC.erase}</span><span class="tl">${esc(t('erase'))}</span></button>
            <button class="tool t-notes"><span class="tr">${IC.brush}<span class="badge">${esc(t('off'))}</span></span><span class="tl">${esc(t('notes'))}</span></button>
            <button class="tool t-hint"><span class="tr">${IC.bulb}<span class="cost">${IC.coin}${HINT_COST}</span></span><span class="tl">${esc(t('hint'))}</span></button>
          </div>
          <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button class="num" data-d="${d}">${d}<small></small></button>`).join('')}</div>
        </div>
      </div>`;
    document.getElementById('app').appendChild(this.el);
    this.q = (s) => this.el.querySelector(s);
    this.boardEl = this.q('.board');
    this.box = this.q('.boardbox');
    this.boardEl.innerHTML = [...Array(81)].map((_, i) => `<div class="cell r${ROW(i)} c${COL(i)}" data-i="${i}"><span class="v"></span><span class="nt"></span></div>`).join('');
    this.cells = [...this.boardEl.children];
    this.nums = [...this.el.querySelectorAll('.num')];
    this._bind();
  }

  _bind() {
    const tap = (sel, fn) =>
      this.q(sel).addEventListener('click', (e) => {
        audio.unlock();
        fn(e);
      });
    tap('.g-back', () => (audio.play('click'), this.app.onBack()));
    tap('.g-coins', () => (audio.play('click'), this.app.store()));
    tap('.g-set', () => (audio.play('click'), this.app.settings()));
    tap('.t-undo', () => this.undo());
    tap('.t-erase', () => this.erase());
    tap('.t-notes', () => this.toggleNotes());
    tap('.t-hint', () => this.hint());
    this.boardEl.addEventListener('pointerdown', (e) => {
      const c = e.target.closest('.cell');
      if (!c) return;
      e.preventDefault();
      audio.unlock();
      this.select(+c.dataset.i, true);
    });
    this.q('.pad').addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.num');
      if (!b) return;
      e.preventDefault();
      audio.unlock();
      b.classList.add('down');
      setTimeout(() => b.classList.remove('down'), 110);
      this.input(+b.dataset.d);
    });
    window.addEventListener('keydown', (e) => this._key(e));
    new ResizeObserver(() => this.layout()).observe(this.box);
    setInterval(() => this._tick(), 250);
  }

  get visible() {
    return !this.el.classList.contains('hidden');
  }
  show(on) {
    this.el.classList.toggle('hidden', !on);
    if (on) requestAnimationFrame(() => this.layout());
  }
  setCoins(n, bump) {
    const c = this.q('.g-coins');
    c.querySelector('.cv').textContent = n;
    if (bump) {
      c.classList.remove('bump');
      void c.offsetWidth;
      c.classList.add('bump');
    }
  }

  // st: { puzzle (строка), title, diffLabel, color, restore? }
  open(st) {
    this.givens = parse(st.puzzle);
    this.sol = solve(this.givens);
    this.vals = this.givens.slice();
    this.notes = new Array(81).fill(0);
    this.hist = [];
    this.hints = 0;
    this.mistakes = 0;
    this.time = 0;
    this.sel = null;
    this.notesMode = false;
    this.done = false;
    this.unitsDone = new Set();
    this.revealed = new Set();
    const r = st.restore;
    if (r && r.v && r.v.length === 81) {
      for (let i = 0; i < 81; i++) if (!this.givens[i] && r.v[i] !== '.') this.vals[i] = +r.v[i];
      if (r.n) r.n.forEach((m, i) => (this.notes[i] = m || 0));
      this.hints = r.h || 0;
      this.mistakes = r.m || 0;
      this.time = r.t || 0;
    }
    for (let u = 0; u < 27; u++) if (this._unitOk(u)) this.unitsDone.add(u);
    this.boardEl.classList.remove('won');
    this.q('.g-ttl').textContent = st.title;
    const dp = this.q('.g-diff');
    dp.textContent = st.diffLabel;
    dp.style.setProperty('--cc', st.color);
    this._notesBtn();
    this.render();
    this.layout();
    this._lastTick = performance.now();
  }

  serialize() {
    return { v: this.vals.map((v) => v || '.').join(''), n: this.notes.slice(), h: this.hints, m: this.mistakes, t: Math.floor(this.time) };
  }

  layout() {
    if (!this.visible) return;
    const W = this.box.clientWidth - 14,
      H = this.box.clientHeight - 14;
    if (W <= 0 || H <= 0) return;
    const side = Math.floor(Math.min(W, H, 720) / 9) * 9;
    const cs = side / 9;
    this.boardEl.style.width = side + 'px';
    this.boardEl.style.height = side + 'px';
    this.boardEl.style.fontSize = Math.round(cs * 0.6) + 'px';
    this.boardEl.style.setProperty('--nf', Math.max(8, Math.round(cs * 0.27)) + 'px');
    this.boardEl.querySelectorAll('.nt').forEach((n) => (n.style.fontSize = Math.max(8, Math.round(cs * 0.27)) + 'px'));
  }

  _tick() {
    const now = performance.now();
    const dt = (now - (this._lastTick || now)) / 1000;
    this._lastTick = now;
    if (!this.visible || this.done || this.app.blocked() || document.hidden || !this.givens) return;
    this.time += Math.min(dt, 1);
    const el = this.q('.g-time span');
    const s = fmtTime(this.time);
    if (el.textContent !== s) el.textContent = s;
  }

  render() {
    const sel = this.sel;
    const sv = sel !== null ? this.vals[sel] : 0;
    const peers = new Set(sel !== null ? PEERS[sel] : []);
    const auto = this.app.autoCheck();
    for (let i = 0; i < 81; i++) {
      const c = this.cells[i];
      const v = this.vals[i];
      const g = !!this.givens[i];
      c.classList.toggle('g', g);
      c.classList.toggle('sel', i === sel);
      c.classList.toggle('peer', peers.has(i));
      c.classList.toggle('same', !!sv && v === sv && i !== sel);
      c.classList.toggle('bad', !g && !!v && auto && v !== this.sol[i]);
      c.firstChild.textContent = v || '';
      const nt = c.lastChild;
      const m = v ? 0 : this.notes[i];
      if (nt._m !== m || nt._hl !== sv) {
        nt._m = m;
        nt._hl = sv;
        nt.innerHTML = m ? [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<i class="${d === sv ? 'hl' : ''}">${m & bit(d) ? d : ''}</i>`).join('') : '';
      }
    }
    // счётчики цифр
    const cnt = new Array(10).fill(0);
    for (let i = 0; i < 81; i++) if (this.vals[i] && this.vals[i] === this.sol[i]) cnt[this.vals[i]]++;
    this.nums.forEach((b, k) => {
      const left = 9 - cnt[k + 1];
      b.classList.toggle('full', left <= 0);
      b.lastChild.textContent = left > 0 ? left : '';
    });
    this.q('.g-mist span').textContent = this.mistakes;
    this.q('.g-time').classList.toggle('hidden', !this.app.showTimer());
  }

  select(i, user) {
    if (this.done) return;
    this.sel = i;
    if (user) audio.play('select');
    this.render();
    this.app.onSelect && this.app.onSelect();
  }

  _push(rec) {
    this.hist.push(rec);
    if (this.hist.length > 300) this.hist.shift();
  }

  input(d) {
    if (this.done) return;
    const i = this.sel;
    if (i === null) return this.app.toast(t('selectCell'));
    if (this.givens[i]) return this.app.toast(t('given'));
    if (this.revealed.has(i)) return;
    if (this.vals[i] && this.vals[i] === this.sol[i] && !this.notesMode) {
      // верную цифру не трогаем случайным нажатием
      if (this.vals[i] === d) return;
    }
    if (this.notesMode) {
      if (this.vals[i]) return;
      this._push({ i, v: 0, n: this.notes[i], peers: [] });
      this.notes[i] ^= bit(d);
      audio.play('note');
      this.render();
      this.app.onChange();
      return;
    }
    const rec = { i, v: this.vals[i], n: this.notes[i], peers: [] };
    if (this.vals[i] === d) {
      this.vals[i] = 0;
      this._push(rec);
      audio.play('erase');
      this.render();
      this.app.onChange();
      return;
    }
    this.vals[i] = d;
    this.notes[i] = 0;
    const ok = d === this.sol[i];
    if (ok) {
      // убираем эту цифру из заметок в строке, столбце и квадрате
      for (const p of PEERS[i])
        if (this.notes[p] & bit(d)) {
          rec.peers.push([p, this.notes[p]]);
          this.notes[p] &= ~bit(d);
        }
    } else this.mistakes++;
    this._push(rec);
    audio.play(ok || !this.app.autoCheck() ? 'place' : 'wrong');
    const c = this.cells[i];
    c.classList.remove('pop');
    void c.offsetWidth;
    c.classList.add('pop');
    this.render();
    if (ok) this._checkUnits(i, d);
    this.app.onPlace && this.app.onPlace(ok);
    this.app.onChange();
  }

  erase() {
    const i = this.sel;
    if (this.done || i === null || this.givens[i]) return;
    if (!this.vals[i] && !this.notes[i]) return;
    if (this.vals[i] && this.vals[i] === this.sol[i] && this._lockedOk(i)) return;
    this._push({ i, v: this.vals[i], n: this.notes[i], peers: [] });
    this.vals[i] = 0;
    this.notes[i] = 0;
    audio.play('erase');
    this.render();
    this.app.onChange();
  }

  // верные цифры, открытые подсказкой, стереть нельзя
  _lockedOk(i) {
    return !!(this.revealed && this.revealed.has(i));
  }

  undo() {
    if (this.done) return;
    const r = this.hist.pop();
    if (!r) return;
    this.vals[r.i] = r.v;
    this.notes[r.i] = r.n;
    for (const [p, m] of r.peers) this.notes[p] = m;
    this.sel = r.i;
    audio.play('erase');
    this.render();
    this.app.onChange();
  }

  toggleNotes() {
    this.notesMode = !this.notesMode;
    audio.play('click');
    this._notesBtn();
  }
  _notesBtn() {
    const b = this.q('.t-notes');
    b.classList.toggle('on', this.notesMode);
    b.querySelector('.badge').textContent = t(this.notesMode ? 'on' : 'off');
    this.q('.pad').classList.toggle('notes', this.notesMode);
  }

  hint() {
    if (this.done) return;
    let i = this.sel;
    if (i !== null && (this.givens[i] || this.vals[i] === this.sol[i])) i = null;
    if (i === null) {
      // клетка с наименьшим числом вариантов
      let best = -1,
        bn = 10;
      for (let k = 0; k < 81; k++) {
        if (this.vals[k] === this.sol[k]) continue;
        let m = 0x1ff;
        for (const p of PEERS[k]) if (this.vals[p] && this.vals[p] === this.sol[p]) m &= ~bit(this.vals[p]);
        let n = 0;
        for (let d = 1; d <= 9; d++) if (m & bit(d)) n++;
        if (n < bn) ((bn = n), (best = k));
      }
      i = best;
    }
    if (i < 0) return;
    if (this.app.coins() < HINT_COST) return this.app.notEnough(HINT_COST);
    this.app.spend(HINT_COST);
    this.hints++;
    const d = this.sol[i];
    const rec = { i, v: this.vals[i], n: this.notes[i], peers: [] };
    this.vals[i] = d;
    this.notes[i] = 0;
    for (const p of PEERS[i])
      if (this.notes[p] & bit(d)) {
        rec.peers.push([p, this.notes[p]]);
        this.notes[p] &= ~bit(d);
      }
    this._push(rec);
    this.revealed = this.revealed || new Set();
    this.revealed.add(i);
    this.sel = i;
    audio.play('hint');
    const c = this.cells[i];
    c.classList.remove('hint');
    void c.offsetWidth;
    c.classList.add('hint');
    this.render();
    this._checkUnits(i, d);
    this.app.onChange();
  }

  _unitOk(u) {
    return UNITS[u].every((i) => this.vals[i] && this.vals[i] === this.sol[i]);
  }

  _checkUnits(i, d) {
    const fresh = [ROW(i), 9 + COL(i), 18 + BOX(i)].filter((u) => !this.unitsDone.has(u) && this._unitOk(u));
    fresh.forEach((u) => this.unitsDone.add(u));
    const all = this.vals.every((v, k) => v === this.sol[k]);
    if (all) return this._win();
    if (fresh.length) {
      audio.play('unit');
      for (const u of fresh)
        UNITS[u].forEach((k, n) => {
          const c = this.cells[k];
          c.classList.remove('wave');
          void c.offsetWidth;
          c.style.animationDelay = n * 0.045 + 's';
          c.classList.add('wave');
          setTimeout(() => (c.style.animationDelay = ''), 1300);
        });
      const u = fresh[fresh.length - 1];
      const mid = UNITS[u][4];
      const r = this.cells[mid].getBoundingClientRect();
      this.app.burst(r.left + r.width / 2, r.top + r.height / 2, 14);
    }
    // все девять одинаковых цифр на месте
    let n = 0;
    for (let k = 0; k < 81; k++) if (this.vals[k] === d && this.sol[k] === d) n++;
    if (n === 9 && !fresh.length) this.app.toast(t('digitDone', { d }));
  }

  _win() {
    this.done = true;
    this.sel = null;
    this.render();
    this.cells.forEach((c, k) => (c.style.animationDelay = (ROW(k) + COL(k)) * 0.05 + 's'));
    this.boardEl.classList.add('won');
    setTimeout(() => this.cells.forEach((c) => (c.style.animationDelay = '')), 2200);
    const r = this.boardEl.getBoundingClientRect();
    this.app.burst(r.left + r.width / 2, r.top + r.height / 2, 60, 2.2);
    this.app.onComplete({ time: this.time, hints: this.hints, mistakes: this.mistakes });
  }

  move(dx, dy) {
    if (this.sel === null) return this.select(40, true);
    const r = (ROW(this.sel) + dy + 9) % 9,
      c = (COL(this.sel) + dx + 9) % 9;
    this.select(r * 9 + c, true);
  }

  _key(e) {
    if (!this.visible || this.app.blocked() || e.ctrlKey || e.metaKey || e.altKey) {
      if (this.visible && !this.app.blocked() && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.undo();
      }
      return;
    }
    audio.unlock();
    const k = e.key;
    if (/^[1-9]$/.test(k)) {
      e.preventDefault();
      const b = this.nums[+k - 1];
      b.classList.add('down');
      setTimeout(() => b.classList.remove('down'), 110);
      return this.input(+k);
    }
    const map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (map[k]) {
      e.preventDefault();
      return this.move(...map[k]);
    }
    if (k === 'Backspace' || k === 'Delete' || k === '0') {
      e.preventDefault();
      return this.erase();
    }
    const low = k.toLowerCase();
    if (low === 'n' || low === 'т' || low === ' ') {
      e.preventDefault();
      return this.toggleNotes();
    }
    if (low === 'u' || low === 'г') {
      e.preventDefault();
      return this.undo();
    }
  }
}
