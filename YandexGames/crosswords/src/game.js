// Экран кроссворда: сетка, вопрос, подсказки, клавиатура, ввод с клавиатуры компьютера
import { IC } from './icons.js';
import { t, lettersWord, LANG, KEYBOARDS, CODE_RU } from './i18n.js';
import { audio } from './audio.js';

export const COST = { letter: 20, word: 50 };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export class GameView {
  // app: { coins(), spend(n) -> bool, onBack(), onComplete(pz), onChange(pz), notEnough(cost), toast(msg, kind), openClues(), settings(), store(), autoCheck() }
  constructor(app) {
    this.app = app;
    this.pz = null;
    this.sel = null;
    this.dir = 'a';
    this.el = document.createElement('div');
    this.el.id = 'game';
    this.el.className = 'view hidden';
    this.el.innerHTML = `
      <header class="bar">
        <button class="backbtn g-back">${IC.back}<span>${esc(t('menu'))}</span></button>
        <div class="ttl g-ttl"></div>
        <button class="chip g-coins">${IC.coin}<span class="cv">0</span><i class="plus">+</i></button>
        <button class="ibtn g-set" aria-label="settings">${IC.gear}</button>
      </header>
      <div class="gbody">
        <div class="gleft"><div class="boardbox"><div class="board"></div></div></div>
        <div class="gright">
          <div class="cluebar">
            <button class="nav cb-prev" aria-label="prev">${IC.prev}</button>
            <div class="cb-main"><div class="cb-meta"></div><div class="cb-text"></div></div>
            <button class="nav cb-next" aria-label="next">${IC.next}</button>
          </div>
          <div class="cluelists">
            <div class="cl"><h3>${esc(t('across'))}</h3><ol class="cl-a"></ol></div>
            <div class="cl"><h3>${esc(t('down'))}</h3><ol class="cl-d"></ol></div>
          </div>
          <div class="tools">
            <button class="tool t-letter"><span class="tr">${IC.bulb}<span class="cost">${IC.coin}${COST.letter}</span></span><span class="tl">${esc(t('hintLetter'))}</span></button>
            <button class="tool t-word"><span class="tr">${IC.book}<span class="cost">${IC.coin}${COST.word}</span></span><span class="tl">${esc(t('hintWord'))}</span></button>
            <button class="tool t-check"><span class="tr">${IC.check}</span><span class="tl">${esc(t('check'))}</span></button>
            <button class="tool t-list"><span class="tr">${IC.list}</span><span class="tl">${esc(t('clues'))}</span></button>
          </div>
          <div class="kbd"></div>
        </div>
      </div>`;
    document.getElementById('app').appendChild(this.el);
    this.q = (s) => this.el.querySelector(s);
    this.board = this.q('.board');
    this.box = this.q('.boardbox');
    this._bind();
  }

  _bind() {
    const tap = (sel, fn) => this.q(sel).addEventListener('click', (e) => {
      audio.unlock();
      fn(e);
    });
    tap('.g-back', () => {
      audio.play('click');
      this.app.onBack();
    });
    tap('.g-coins', () => {
      audio.play('click');
      this.app.store();
    });
    tap('.g-set', () => {
      audio.play('click');
      this.app.settings();
    });
    tap('.cb-prev', () => this.stepEntry(-1));
    tap('.cb-next', () => this.stepEntry(1));
    tap('.cb-main', () => {
      // нажатие на вопрос на телефоне открывает список всех вопросов
      if (!document.body.classList.contains('wide')) this.app.openClues();
    });
    tap('.t-letter', () => this.hint('letter'));
    tap('.t-word', () => this.hint('word'));
    tap('.t-check', () => this.check());
    tap('.t-list', () => {
      audio.play('click');
      this.app.openClues();
    });
    this.board.addEventListener('pointerdown', (e) => {
      const c = e.target.closest('.cell');
      if (!c) return;
      e.preventDefault();
      audio.unlock();
      this.tapCell(+c.dataset.i);
    });
    const kb = this.q('.kbd');
    // клавиатура реагирует на нажатие сразу, без задержки click
    kb.addEventListener('pointerdown', (e) => {
      const k = e.target.closest('.key');
      if (!k) return;
      e.preventDefault();
      audio.unlock();
      k.classList.add('down');
      setTimeout(() => k.classList.remove('down'), 110);
      if (k.dataset.k === 'bs') this.backspace();
      else this.type(k.dataset.k);
    });
    this.q('.cluelists').addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      audio.unlock();
      this.selectEntry(+li.dataset.id);
    });
    window.addEventListener('keydown', (e) => this._key(e));
    new ResizeObserver(() => this.layout()).observe(this.box);
  }

  _buildKeyboard() {
    if (this._kbLang === LANG) return;
    this._kbLang = LANG;
    const rows = KEYBOARDS[LANG];
    this.q('.kbd').innerHTML = rows
      .map((r, i) => `<div class="krow">${[...r].map((ch) => `<button class="key" data-k="${ch}">${ch}</button>`).join('')}${i === rows.length - 1 ? `<button class="key bs" data-k="bs" aria-label="backspace">${IC.bs}</button>` : ''}</div>`)
      .join('');
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

  open(pz, title) {
    this.pz = pz;
    this._buildKeyboard();
    this.q('.g-ttl').textContent = title;
    this.board.style.gridTemplateColumns = `repeat(${pz.w}, var(--cs))`;
    this.board.style.gridTemplateRows = `repeat(${pz.h}, var(--cs))`;
    this.board.innerHTML = pz.cells
      .map((c) => (c ? `<div class="cell" data-i="${c.idx}" style="grid-column:${c.x + 1};grid-row:${c.y + 1}">${c.num ? `<span class="n">${c.num}</span>` : ''}<span class="l"></span></div>` : ''))
      .join('');
    this.cellEls = {};
    this.board.querySelectorAll('.cell').forEach((el) => (this.cellEls[el.dataset.i] = el));
    this._renderLists();
    this.sel = null;
    // первое неразгаданное слово
    const first = pz.entries.find((e) => !pz.solved.has(e.id));
    if (first) this.selectEntry(first.id, true);
    this.render();
    this.layout();
  }

  layout() {
    if (!this.pz || !this.visible) return;
    const W = this.box.clientWidth - 8,
      H = this.box.clientHeight - 8;
    if (W <= 0 || H <= 0) return;
    const cs = Math.max(12, Math.floor(Math.min((W - (this.pz.w + 1) * 2) / this.pz.w, (H - (this.pz.h + 1) * 2) / this.pz.h, 76)));
    this.board.style.setProperty('--cs', cs + 'px');
    this.board.style.fontSize = Math.round(cs * 0.6) + 'px';
    this.board.querySelectorAll('.n').forEach((n) => (n.style.fontSize = Math.max(9, Math.round(cs * 0.27)) + 'px'));
  }

  _renderLists() {
    const pz = this.pz;
    const li = (e) => `<li data-id="${e.id}"><b>${e.num}</b><span>${esc(e.clue)}</span></li>`;
    this.q('.cl-a').innerHTML = pz.entries.filter((e) => e.dir === 'a').map(li).join('');
    this.q('.cl-d').innerHTML = pz.entries.filter((e) => e.dir === 'd').map(li).join('');
  }

  cur() {
    if (this.sel === null || !this.pz) return null;
    return this.pz.entryOf(this.sel, this.dir);
  }

  render() {
    const pz = this.pz;
    if (!pz) return;
    const e = this.cur();
    const inWord = new Set(e ? e.cells : []);
    const auto = this.app.autoCheck();
    for (const c of pz.cells) {
      if (!c) continue;
      const el = this.cellEls[c.idx];
      const L = pz.letters[c.idx];
      const ok = (c.a !== null && pz.solved.has(c.a)) || (c.d !== null && pz.solved.has(c.d));
      el.querySelector('.l').textContent = L;
      el.classList.toggle('w', inWord.has(c.idx));
      el.classList.toggle('s', c.idx === this.sel);
      el.classList.toggle('ok', ok);
      el.classList.toggle('rev', pz.revealed.has(c.idx));
      el.classList.toggle('bad', pz.wrong.has(c.idx) || (auto && pz.isWrong(c.idx)));
    }
    // вопрос
    const meta = this.q('.cb-meta'),
      txt = this.q('.cb-text');
    if (e) {
      meta.textContent = `${e.num} · ${t(e.dir === 'a' ? 'across' : 'down')} · ${e.word.length} ${lettersWord(e.word.length)}`;
      txt.textContent = e.clue;
      txt.classList.remove('tip');
    } else {
      meta.textContent = '';
      txt.textContent = t('tapCell');
      txt.classList.add('tip');
    }
    // списки
    this.el.querySelectorAll('.cluelists li').forEach((li) => {
      const id = +li.dataset.id;
      li.classList.toggle('done', pz.solved.has(id));
      li.classList.toggle('on', !!e && e.id === id);
    });
    const on = this.el.querySelector('.cluelists li.on');
    if (on && document.body.classList.contains('wide')) {
      const ol = on.parentElement;
      if (on.offsetTop < ol.scrollTop || on.offsetTop + on.offsetHeight > ol.scrollTop + ol.clientHeight) ol.scrollTop = on.offsetTop - ol.clientHeight / 3;
    }
  }

  tapCell(idx) {
    const c = this.pz.cells[idx];
    if (!c) return;
    if (idx === this.sel) {
      // повторное нажатие — смена направления
      if (c.a !== null && c.d !== null) this.dir = this.dir === 'a' ? 'd' : 'a';
    } else {
      this.sel = idx;
      if (c[this.dir] === null) this.dir = this.dir === 'a' ? 'd' : 'a';
      // если в этом направлении слово уже разгадано, а в другом нет — переключаемся
      const o = this.dir === 'a' ? 'd' : 'a';
      if (c[o] !== null && this.pz.solved.has(c[this.dir]) && !this.pz.solved.has(c[o])) this.dir = o;
    }
    audio.play('select');
    this.render();
    this.app.onSelect && this.app.onSelect();
  }

  selectEntry(id, silent) {
    const e = this.pz.byId[id];
    if (!e) return;
    this.dir = e.dir;
    this.sel = e.cells.find((i) => !this.pz.letters[i]) ?? e.cells.find((i) => !this.pz.locked(i)) ?? e.cells[0];
    if (!silent) {
      audio.play('select');
      this.app.onSelect && this.app.onSelect();
    }
    this.render();
  }

  // следующее/предыдущее неразгаданное слово
  stepEntry(d) {
    const list = this.pz.entries;
    const e = this.cur();
    let i = e ? list.indexOf(e) : -1;
    for (let k = 0; k < list.length; k++) {
      i = (i + d + list.length) % list.length;
      if (!this.pz.solved.has(list[i].id)) return this.selectEntry(list[i].id);
    }
  }

  type(ch) {
    const pz = this.pz;
    if (!pz || pz.complete()) return;
    const e = this.cur();
    if (!e) {
      this.app.toast(t('tapCell'));
      return;
    }
    let idx = this.sel;
    if (pz.locked(idx)) {
      // выбранная клетка закрыта — пишем в следующую свободную в слове
      const pos = e.cells.indexOf(idx);
      idx = e.cells.slice(pos).find((i) => !pz.locked(i)) ?? e.cells.find((i) => !pz.locked(i));
      if (idx === undefined) return this.stepEntry(1);
    }
    pz.setLetter(idx, ch);
    audio.play('key');
    const pop = this.cellEls[idx];
    pop.classList.remove('pop');
    void pop.offsetWidth;
    pop.classList.add('pop');
    const solvedNow = pz.refresh();
    if (this.app.autoCheck() && pz.isWrong(idx)) audio.play('wrong');
    // курсор — на следующую клетку слова
    const pos = e.cells.indexOf(idx);
    const rest = e.cells.slice(pos + 1).filter((i) => !pz.locked(i));
    const nextEmpty = rest.find((i) => !pz.letters[i]);
    if (rest.length) this.sel = nextEmpty ?? rest[0];
    else this.sel = idx;
    this._afterChange(solvedNow, e);
  }

  backspace() {
    const pz = this.pz;
    if (!pz || pz.complete() || this.sel === null) return;
    const e = this.cur();
    let idx = this.sel;
    if (pz.letters[idx] && !pz.locked(idx)) {
      pz.setLetter(idx, '');
    } else {
      const pos = e.cells.indexOf(idx);
      const prev = e.cells
        .slice(0, pos)
        .reverse()
        .find((i) => !pz.locked(i));
      if (prev === undefined) return;
      this.sel = prev;
      pz.setLetter(prev, '');
    }
    audio.play('erase');
    this.app.onChange(pz);
    this.render();
  }

  _afterChange(solvedNow, e) {
    const pz = this.pz;
    if (solvedNow.length) {
      audio.play('word');
      for (const s of solvedNow)
        s.cells.forEach((i, k) => {
          const el = this.cellEls[i];
          el.classList.remove('pop', 'win');
          void el.offsetWidth;
          el.style.animationDelay = k * 0.05 + 's';
          el.classList.add('win');
          setTimeout(() => (el.style.animationDelay = ''), 1100 + k * 50);
        });
      this.app.onWord && this.app.onWord(solvedNow);
    }
    this.app.onChange(pz);
    if (pz.complete()) {
      this.sel = null;
      this.render();
      this.app.onComplete(pz);
      return;
    }
    // слово разгадано — переходим к следующему
    if (e && pz.solved.has(e.id)) this.stepEntry(1);
    else if (pz.allFilled()) this.app.toast(t('hasErrors'), 'bad');
    this.render();
  }

  hint(kind) {
    const pz = this.pz;
    if (!pz || pz.complete()) return;
    const e = this.cur();
    if (!e) return this.app.toast(t('selectFirst'));
    if (pz.solved.has(e.id)) return this.app.toast(t('alreadyOpen'));
    const cost = COST[kind];
    if (this.app.coins() < cost) {
      audio.play('click');
      return this.app.notEnough(cost);
    }
    let cells;
    if (kind === 'letter') {
      const i = pz.hintCell(e, this.sel);
      if (i === null) return;
      cells = [i];
      pz.hints += 1;
    } else {
      cells = e.cells.filter((i) => !pz.locked(i) && pz.letters[i] !== pz.cells[i].ch);
      pz.hints += 3;
    }
    this.app.spend(cost);
    for (const i of cells) pz.reveal(i);
    audio.play('hint');
    for (const i of cells) {
      const el = this.cellEls[i];
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    }
    if (kind === 'letter' && cells[0] === this.sel) {
      const rest = e.cells.filter((i) => !pz.locked(i) && !pz.letters[i]);
      if (rest.length) this.sel = rest[0];
    }
    this._afterChange(pz.refresh(), e);
  }

  check() {
    const pz = this.pz;
    if (!pz || pz.complete()) return;
    const n = pz.check();
    if (n) {
      audio.play('wrong');
      this.app.toast(t('errorsFound', { n }), 'bad');
    } else {
      audio.play('star');
      this.app.toast(pz.allFilled() ? t('noErrors') : t('fillMore'), 'good');
    }
    this.render();
  }

  // перемещение стрелками по сетке
  move(dx, dy) {
    const pz = this.pz;
    if (this.sel === null) {
      const first = pz.entries[0];
      return this.selectEntry(first.id);
    }
    const c = pz.cells[this.sel];
    const nd = dx ? 'a' : 'd';
    if (this.dir !== nd && c[nd] !== null) {
      this.dir = nd;
      return this.render();
    }
    let x = c.x + dx,
      y = c.y + dy;
    while (x >= 0 && y >= 0 && x < pz.w && y < pz.h) {
      const n = pz.cell(x, y);
      if (n) {
        this.sel = n.idx;
        if (n[this.dir] === null) this.dir = this.dir === 'a' ? 'd' : 'a';
        audio.play('select');
        return this.render();
      }
      x += dx;
      y += dy;
    }
  }

  _key(e) {
    if (!this.visible || !this.pz || this.app.blocked()) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    let ch = null;
    if (LANG === 'ru') {
      if (/^[а-яёА-ЯЁ]$/.test(k)) ch = k.toUpperCase().replace('Ё', 'Е');
      else if (CODE_RU[e.code] && /^[\x20-\x7e]$/.test(k)) ch = CODE_RU[e.code];
    } else if (/^[a-zA-Z]$/.test(k)) ch = k.toUpperCase();
    audio.unlock();
    if (ch) {
      e.preventDefault();
      if (KEYBOARDS[LANG].join('').includes(ch)) this.type(ch);
      return;
    }
    switch (k) {
      case 'Backspace':
      case 'Delete':
        e.preventDefault();
        return this.backspace();
      case 'ArrowLeft':
        e.preventDefault();
        return this.move(-1, 0);
      case 'ArrowRight':
        e.preventDefault();
        return this.move(1, 0);
      case 'ArrowUp':
        e.preventDefault();
        return this.move(0, -1);
      case 'ArrowDown':
        e.preventDefault();
        return this.move(0, 1);
      case 'Tab':
      case 'Enter':
        e.preventDefault();
        return this.stepEntry(e.shiftKey ? -1 : 1);
      case ' ':
        e.preventDefault();
        if (this.sel !== null) this.tapCell(this.sel);
        return;
    }
  }
}
