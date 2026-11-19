// Экран судоку: поле (9×9, диагональное, 6×6), цифры, заметки, отмена, умная подсказка, пауза,
// ввод «сначала клетка» или «сначала цифра», подсветка, анимации решённых групп
import { IC } from './icons.js';
import { t, fmtTime } from './i18n.js';
import { audio } from './audio.js';
import { geom, kindOf, parse, solve, bit } from './sudoku.js';
import { makeHint } from './hints.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export class Board {
  // app: { onBack, onComplete, onChange, toast, settings, store, blocked, opt(key), hintCost(), payHint(cb), onEvent(name, data), burst }
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
          <div class="info"><span class="pill diff g-diff"></span><button class="pill g-time" aria-label="pause">${IC.pause}<span>0:00</span></button><span class="pill mist g-mist">${IC.cross}<span>0</span></span></div>
          <div class="boardbox"><div class="board"></div><svg class="diagsvg" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M2 2L98 98M98 2L2 98"/></svg>
            <div class="pausecover hidden"><div>${IC.pause}<b>${esc(t('paused'))}</b><button class="btn b-gold g-resume">${IC.play}<span>${esc(t('resume'))}</span></button></div></div>
          </div>
        </div>
        <div class="gright">
          <div class="tools">
            <button class="tool t-undo"><span class="tr">${IC.undo}</span><span class="tl">${esc(t('undo'))}</span></button>
            <button class="tool t-erase"><span class="tr">${IC.erase}</span><span class="tl">${esc(t('erase'))}</span></button>
            <button class="tool t-notes"><span class="tr">${IC.brush}<span class="badge">${esc(t('off'))}</span></span><span class="tl">${esc(t('notes'))}</span></button>
            <button class="tool t-hint"><span class="tr">${IC.bulb}<span class="cost"></span></span><span class="tl">${esc(t('hint'))}</span></button>
          </div>
          <div class="pad"></div>
          <div class="hintpanel hidden"></div>
        </div>
      </div>`;
    document.getElementById('app').appendChild(this.el);
    this.q = (s) => this.el.querySelector(s);
    this.boardEl = this.q('.board');
    this.box = this.q('.boardbox');
    this.padEl = this.q('.pad');
    this.hintEl = this.q('.hintpanel');
    this.G = null;
    this.activeDigit = 0;
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
    tap('.g-time', () => (audio.play('click'), this.setPaused(!this.paused)));
    tap('.g-resume', () => (audio.play('click'), this.setPaused(false)));
    tap('.t-undo', () => this.undo());
    tap('.t-erase', () => this.erase());
    tap('.t-notes', () => this.toggleNotes());
    tap('.t-hint', () => this.hint());
    this.boardEl.addEventListener('pointerdown', (e) => {
      const c = e.target.closest('.cell');
      if (!c) return;
      e.preventDefault();
      audio.unlock();
      this.tapCell(+c.dataset.i);
    });
    this.padEl.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('.num');
      if (!b) return;
      e.preventDefault();
      audio.unlock();
      this._press(b);
      this.tapDigit(+b.dataset.d);
    });
    window.addEventListener('keydown', (e) => this._key(e));
    new ResizeObserver(() => this.layout()).observe(this.box);
    setInterval(() => this._tick(), 250);
  }

  _press(b) {
    b.classList.add('down');
    setTimeout(() => b.classList.remove('down'), 110);
  }

  get visible() {
    return !this.el.classList.contains('hidden');
  }
  show(on) {
    this.el.classList.toggle('hidden', !on);
    if (on) { this.layout(); requestAnimationFrame(() => this.layout()); }
  }
  setCoins(n, bump) {
    const c = this.q('.g-coins');
    c.querySelector('.cv').textContent = n;
    if (bump) {
      c.classList.remove('bump');
      void c.offsetWidth;
      c.classList.add('bump');
    }
    this.updateHintCost();
  }
  updateHintCost() {
    const c = this.app.hintCost && this.app.hintCost();
    if (!c) return;
    this.q('.t-hint .cost').innerHTML = c.free ? `<span class="free">${esc(t('freeN', { n: c.free }))}</span>` : `${IC.coin}${c.cost}`;
  }

  // st: { puzzle, title, diffLabel, color, restore? }
  open(st) {
    const kind = kindOf(st.puzzle);
    const G = (this.G = geom(kind));
    this.kind = kind;
    this.givens = parse(st.puzzle.slice(0, G.size));
    this.sol = solve(G, this.givens);
    this.vals = this.givens.slice();
    this.notes = new Array(G.size).fill(0);
    this.hist = [];
    this.hints = 0;
    this.mistakes = 0;
    this.time = 0;
    this.sel = null;
    this.notesMode = false;
    this.done = false;
    this.paused = false;
    this.activeDigit = 0;
    this.unitsDone = new Set();
    this.revealed = new Set();
    this.hintShown = null;
    this.guide = null;
    const r = st.restore;
    if (r && r.v && r.v.length === G.size) {
      for (let i = 0; i < G.size; i++) if (!this.givens[i] && r.v[i] !== '.') this.vals[i] = +r.v[i];
      if (r.n) r.n.forEach((m, i) => (this.notes[i] = m || 0));
      this.hints = r.h || 0;
      this.mistakes = r.m || 0;
      this.time = r.t || 0;
      if (r.r) r.r.forEach((i) => this.revealed.add(i));
    }
    for (let u = 0; u < G.units.length; u++) if (this._unitOk(u)) this.unitsDone.add(u);
    this._build();
    this.boardEl.classList.remove('won');
    this.q('.g-ttl').textContent = st.title;
    const dp = this.q('.g-diff');
    dp.innerHTML = (st.diffIcon || '') + `<span class="dt">${esc(st.diffLabel)}</span>`;
    dp.title = st.diffLabel;
    dp.style.setProperty('--cc', st.color);
    this.q('.pausecover').classList.add('hidden');
    this.closeHint(true);
    this._notesBtn();
    this.render();
    this.layout();
    this.updateHintCost();
    this._lastTick = performance.now();
  }

  _build() {
    const G = this.G;
    this.boardEl.style.gridTemplateColumns = `repeat(${G.N},1fr)`;
    this.boardEl.style.gridTemplateRows = `repeat(${G.N},1fr)`;
    this.boardEl.dataset.n = G.N;
    let html = '';
    for (let i = 0; i < G.size; i++) {
      const r = G.row(i),
        c = G.col(i);
      const rc = c === G.N - 1 ? 'rn' : (c + 1) % G.BC === 0 ? 'rt' : '';
      const bc = r === G.N - 1 ? 'bn' : (r + 1) % G.BR === 0 ? 'bt' : '';
      const dg = this.kind === 'diag' && (r === c || r + c === G.N - 1) ? ' dg' : '';
      html += `<div class="cell ${rc} ${bc}${dg}" data-i="${i}"><span class="v"></span><span class="nt"></span></div>`;
    }
    this.boardEl.innerHTML = html;
    this.cells = [...this.boardEl.children];
    this.q('.diagsvg').classList.toggle('hidden', this.kind !== 'diag');
    this.padEl.innerHTML = [...Array(G.N)].map((_, k) => `<button class="num" data-d="${k + 1}">${k + 1}<small></small></button>`).join('');
    this.padEl.dataset.n = G.N;
    this.nums = [...this.padEl.children];
  }

  serialize() {
    return { v: this.vals.map((v) => v || '.').join(''), n: this.notes.slice(), h: this.hints, m: this.mistakes, t: Math.floor(this.time), r: [...this.revealed] };
  }

  layout() {
    if (!this.visible || !this.G) return;
    const W = this.box.clientWidth - 14,
      H = this.box.clientHeight - 14;
    if (W <= 0 || H <= 0) return;
    const N = this.G.N;
    const side = Math.floor(Math.min(W, H, 760) / N) * N;
    const cs = side / N;
    const bs = this.boardEl.style;
    bs.width = bs.height = side + 'px';
    bs.fontSize = Math.round(cs * 0.6) + 'px';
    bs.setProperty('--nf', Math.max(8, Math.round(cs * (N === 6 ? 0.24 : 0.27))) + 'px');
    const d = this.q('.diagsvg');
    const br = this.boardEl.getBoundingClientRect(),
      bb = this.box.getBoundingClientRect();
    Object.assign(d.style, { left: br.left - bb.left + 'px', top: br.top - bb.top + 'px', width: side + 'px', height: side + 'px' });
  }

  _tick() {
    const now = performance.now();
    const dt = (now - (this._lastTick || now)) / 1000;
    this._lastTick = now;
    if (!this.visible || this.done || this.paused || this.app.blocked() || document.hidden || !this.G) return;
    this.time += Math.min(dt, 1);
    const el = this.q('.g-time span');
    const s = fmtTime(this.time);
    if (el.textContent !== s) el.textContent = s;
  }

  setPaused(on) {
    if (this.done) on = false;
    this.paused = on;
    this.q('.pausecover').classList.toggle('hidden', !on);
    this.boardEl.classList.toggle('blur', on);
    this.q('.g-time').classList.toggle('on', on);
    this.app.onEvent && this.app.onEvent('pause', on);
  }

  render() {
    const G = this.G;
    const sel = this.sel;
    const opt = this.app.opt;
    const digitMode = opt('input') === 'digit';
    const sv = digitMode && this.activeDigit ? this.activeDigit : sel !== null ? this.vals[sel] : 0;
    const peers = new Set(sel !== null && opt('hlPeers') ? G.peers[sel] : []);
    const auto = opt('autoCheck');
    const sameOn = opt('hlSame');
    // подсветка подсказки или шага обучения
    const H = this.hintShown || this.guide;
    const area = new Set(H ? H.area : []),
      focus = new Set(H && H.focus ? H.focus : []),
      elim = new Set(H && H.elim ? H.elim : []);
    for (let i = 0; i < G.size; i++) {
      const c = this.cells[i];
      const v = this.vals[i];
      const g = !!this.givens[i];
      let conflict = false;
      if (v && !g && !auto) for (const p of G.peers[i]) if (this.vals[p] === v) conflict = true;
      const cl = c.classList;
      cl.toggle('g', g);
      cl.toggle('sel', i === sel);
      cl.toggle('peer', peers.has(i));
      cl.toggle('same', sameOn && !!sv && v === sv && i !== sel);
      cl.toggle('bad', !g && !!v && ((auto && v !== this.sol[i]) || conflict));
      cl.toggle('rev', this.revealed.has(i));
      cl.toggle('h-area', area.has(i));
      cl.toggle('h-focus', focus.has(i));
      cl.toggle('h-elim', elim.has(i));
      cl.toggle('h-target', !!H && H.target === i);
      const vt = v || '';
      if (c.firstChild.textContent !== String(vt)) c.firstChild.textContent = vt;
      const nt = c.lastChild;
      const m = v ? 0 : this.notes[i];
      const hl = sameOn ? sv : 0;
      if (nt._m !== m || nt._hl !== hl) {
        nt._m = m;
        nt._hl = hl;
        nt.innerHTML = m ? [...Array(G.N)].map((_, k) => `<i class="${k + 1 === hl ? 'hl' : ''}">${m & bit(k + 1) ? k + 1 : ''}</i>`).join('') : '';
      }
    }
    // счётчики цифр
    const cnt = new Array(G.N + 1).fill(0);
    for (let i = 0; i < G.size; i++) if (this.vals[i] && this.vals[i] === this.sol[i]) cnt[this.vals[i]]++;
    this.nums.forEach((b, k) => {
      const left = G.N - cnt[k + 1];
      b.classList.toggle('full', left <= 0);
      b.classList.toggle('act', digitMode && this.activeDigit === k + 1);
      b.lastChild.textContent = left > 0 ? left : '';
    });
    this.q('.g-mist span').textContent = this.mistakes;
    this.q('.g-time span').textContent = fmtTime(this.time);
    this.q('.g-time').classList.toggle('notimer', !opt('timer'));
  }

  // ---------- ввод ----------
  tapCell(i) {
    if (this.done || this.paused || this.app.blocked()) return;
    if (this.hintShown && i !== this.hintShown.target) this.closeHint();
    const digitMode = this.app.opt('input') === 'digit';
    if (digitMode) {
      this.sel = i;
      if (this.vals[i] && (this.givens[i] || this.vals[i] === this.sol[i] || !this.activeDigit)) {
        // нажали на цифру на поле — она становится активной
        this.activeDigit = this.vals[i];
        audio.play('select');
        this.render();
        this.app.onEvent && this.app.onEvent('select', i);
        return;
      }
      if (this.activeDigit) {
        this.input(this.activeDigit);
        return;
      }
      audio.play('select');
      this.render();
      this.app.onEvent && this.app.onEvent('select', i);
      return;
    }
    this.select(i, true);
  }

  tapDigit(d) {
    if (this.done || this.paused || this.app.blocked()) return;
    if (this.app.opt('input') === 'digit') {
      this.activeDigit = this.activeDigit === d ? 0 : d;
      audio.play('select');
      this.render();
      this.app.onEvent && this.app.onEvent('digit', d);
      return;
    }
    this.input(d);
  }

  select(i, user) {
    if (this.done) return;
    this.sel = i;
    if (user) audio.play('select');
    this.render();
    this.app.onEvent && this.app.onEvent('select', i);
  }

  _push(rec) {
    this.hist.push(rec);
    if (this.hist.length > 400) this.hist.shift();
  }

  input(d) {
    if (this.done || this.paused || this.app.blocked()) return;
    const i = this.sel;
    if (i === null) return this.app.toast(t(this.app.opt('input') === 'digit' ? 'selectCellD' : 'selectCell'));
    if (this.givens[i]) return this.app.toast(t('given'));
    if (this.revealed.has(i)) return;
    // верную цифру не трогаем случайным нажатием
    if (this.vals[i] && this.vals[i] === this.sol[i] && !this.notesMode && this.vals[i] === d) return;
    if (this.notesMode) {
      if (this.vals[i]) return;
      this._push({ i, v: 0, n: this.notes[i], peers: [] });
      this.notes[i] ^= bit(d);
      audio.play('note');
      this.render();
      this.app.onChange();
      this.app.onEvent && this.app.onEvent('note', i);
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
    if (ok && this.app.opt('autoNotes') !== false) this._clearPeerNotes(i, d, rec);
    else this.mistakes++;
    this._push(rec);
    if (this.hintShown && i === this.hintShown.target) this.closeHint(true);
    audio.play(ok || !this.app.opt('autoCheck') ? 'place' : 'wrong');
    const c = this.cells[i];
    c.classList.remove('pop');
    void c.offsetWidth;
    c.classList.add('pop');
    this.render();
    if (ok) this._checkUnits(i, d);
    this.app.onEvent && this.app.onEvent('place', { i, ok });
    this.app.onChange();
  }

  // убираем эту цифру из заметок соседей
  _clearPeerNotes(i, d, rec) {
    for (const p of this.G.peers[i])
      if (this.notes[p] & bit(d)) {
        rec.peers.push([p, this.notes[p]]);
        this.notes[p] &= ~bit(d);
      }
  }

  erase() {
    const i = this.sel;
    if (this.done || this.paused || this.app.blocked() || i === null || this.givens[i]) return;
    if (!this.vals[i] && !this.notes[i]) return;
    if (this.revealed.has(i)) return;
    if (this.vals[i] && this.vals[i] === this.sol[i] && this.app.opt('autoCheck')) return this.app.toast(t('alreadyOk'));
    this._push({ i, v: this.vals[i], n: this.notes[i], peers: [] });
    this.vals[i] = 0;
    this.notes[i] = 0;
    audio.play('erase');
    this.render();
    this.app.onChange();
  }

  undo() {
    if (this.done || this.paused || this.app.blocked()) return;
    const r = this.hist.pop();
    if (!r) return;
    this.vals[r.i] = r.v;
    this.notes[r.i] = r.n;
    for (const [p, m] of r.peers) this.notes[p] = m;
    if (r.rev) this.revealed.delete(r.i);
    this.sel = r.i;
    this.unitsDone = new Set([...this.unitsDone].filter((u) => this._unitOk(u)));
    audio.play('erase');
    this.render();
    this.app.onChange();
  }

  toggleNotes() {
    if (this.done || this.paused || this.app.blocked()) return;
    this.notesMode = !this.notesMode;
    audio.play('click');
    this._notesBtn();
    this.app.onEvent && this.app.onEvent('notes', this.notesMode);
  }
  _notesBtn() {
    const b = this.q('.t-notes');
    b.classList.toggle('on', this.notesMode);
    b.querySelector('.badge').textContent = t(this.notesMode ? 'on' : 'off');
    this.padEl.classList.toggle('notes', this.notesMode);
  }

  // ---------- умная подсказка ----------
  hint() {
    if (this.done || this.paused || this.app.blocked()) return;
    if (this.hintShown) return this.applyHint();
    const h = makeHint(this);
    if (!h) return;
    // та же подсказка, что была закрыта без применения, показывается бесплатно
    const same = this._lastHint && this._lastHint.target === h.target && this._lastHint.kind === h.kind && !this.vals[h.target] === !this._lastHint.filled;
    const show = () => {
      this._lastHint = { target: h.target, kind: h.kind, filled: !!this.vals[h.target] };
      this.hints++;
      this.showHint(h);
      this.app.onChange();
    };
    if (same) return this.showHint(h);
    this.app.payHint(show);
  }

  showHint(h) {
    this.hintShown = h;
    this.sel = h.target;
    audio.play('hint');
    const act = h.kind === 'error' ? t('hFix') : t('hPut', { d: h.digit });
    this.hintEl.innerHTML = `<div class="hp-t">${IC.bulb}<b>${esc(t(h.kind === 'error' ? 'hErrTitle' : 'hTitle'))}</b></div>
      ${h.pre ? `<p class="hp-pre"><em>${esc(t('hStep1'))}</em>${esc(h.pre)}</p><p><em>${esc(t('hStep2'))}</em>${esc(h.text)}</p>` : `<p>${esc(h.text)}</p>`}
      <div class="hp-b"><button class="btn b-gold hp-ok">${esc(act)}</button><button class="btn b-glass hp-x">${esc(t('hThink'))}</button></div>`;
    this.hintEl.querySelector('.hp-ok').onclick = () => (audio.unlock(), this.applyHint());
    this.hintEl.querySelector('.hp-x').onclick = () => (audio.play('click'), this.closeHint());
    this.hintEl.classList.remove('hidden');
    this.el.querySelector('.gright').classList.add('hinting');
    this.render();
    this.app.onEvent && this.app.onEvent('hint', h);
  }

  closeHint(silent) {
    this.hintShown = null;
    this.hintEl.classList.add('hidden');
    this.el.querySelector('.gright').classList.remove('hinting');
    if (!silent) this.render();
  }

  applyHint() {
    if (this.done || this.paused || this.app.blocked()) return;
    const h = this.hintShown;
    if (!h) return;
    this.closeHint(true);
    this._lastHint = null;
    const i = h.target;
    const d = this.sol[i];
    const rec = { i, v: this.vals[i], n: this.notes[i], peers: [], rev: true };
    this.vals[i] = d;
    this.notes[i] = 0;
    this._clearPeerNotes(i, d, rec);
    this._push(rec);
    this.revealed.add(i);
    this.sel = i;
    audio.play('place');
    const c = this.cells[i];
    c.classList.remove('hint');
    void c.offsetWidth;
    c.classList.add('hint');
    this.render();
    this._checkUnits(i, d);
    this.app.onChange();
  }

  // ---------- решённые группы и победа ----------
  _unitOk(u) {
    return this.G.units[u].every((i) => this.vals[i] && this.vals[i] === this.sol[i]);
  }

  _checkUnits(i, d) {
    const G = this.G;
    const fresh = G.unitsOf[i].filter((u) => !this.unitsDone.has(u) && this._unitOk(u));
    fresh.forEach((u) => this.unitsDone.add(u));
    const all = this.vals.every((v, k) => v === this.sol[k]);
    if (all) return this._win();
    if (fresh.length) {
      audio.play('unit');
      for (const u of fresh)
        G.units[u].forEach((k, n) => {
          const c = this.cells[k];
          c.classList.remove('wave');
          void c.offsetWidth;
          c.style.animationDelay = n * 0.045 + 's';
          c.classList.add('wave');
          setTimeout(() => (c.style.animationDelay = ''), 1300);
        });
      const u = fresh[fresh.length - 1];
      const mid = G.units[u][G.N >> 1];
      const r = this.cells[mid].getBoundingClientRect();
      this.app.burst(r.left + r.width / 2, r.top + r.height / 2, 14);
    }
    let n = 0;
    for (let k = 0; k < G.size; k++) if (this.vals[k] === d && this.sol[k] === d) n++;
    if (n === G.N) {
      if (this.activeDigit === d) this.activeDigit = 0;
      if (!fresh.length) this.app.toast(t('digitDone', { d }));
    }
  }

  _win() {
    this.done = true;
    this.sel = null;
    this.activeDigit = 0;
    this.closeHint(true);
    this.render();
    const G = this.G;
    this.cells.forEach((c, k) => (c.style.animationDelay = (G.row(k) + G.col(k)) * 0.05 + 's'));
    this.boardEl.classList.add('won');
    setTimeout(() => this.cells.forEach((c) => (c.style.animationDelay = '')), 2200);
    const r = this.boardEl.getBoundingClientRect();
    this.app.burst(r.left + r.width / 2, r.top + r.height / 2, 60, 2.2);
    this.app.onComplete({ time: this.time, hints: this.hints, mistakes: this.mistakes });
  }

  move(dx, dy) {
    const N = this.G.N;
    if (this.sel === null) return this.select((N * N) >> 1, true);
    const r = (this.G.row(this.sel) + dy + N) % N,
      c = (this.G.col(this.sel) + dx + N) % N;
    this.select(r * N + c, true);
  }

  _key(e) {
    if (!this.visible || this.app.blocked() || !this.G) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      return this.undo();
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    audio.unlock();
    const k = e.key;
    if (/^[1-9]$/.test(k) && +k <= this.G.N) {
      e.preventDefault();
      this._press(this.nums[+k - 1]);
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
    if (low === 'h' || low === 'р') {
      e.preventDefault();
      return this.hint();
    }
    if (k === 'Escape' && this.hintShown) return this.closeHint();
    if (low === 'p' || low === 'з') {
      e.preventDefault();
      return this.setPaused(!this.paused);
    }
  }
}
