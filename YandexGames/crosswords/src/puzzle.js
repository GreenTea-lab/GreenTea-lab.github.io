// Модель кроссворда: сетка, слова, введённые буквы, подсказки, проверка
export class Puzzle {
  // data: { w, h, e: [[x, y, dir, word, clue], ...] }
  constructor(data) {
    this.w = data.w;
    this.h = data.h;
    this.cells = new Array(this.w * this.h).fill(null);
    this.entries = [];
    const starts = [...new Set(data.e.map(([x, y]) => y * 100 + x))].sort((a, b) => a - b);
    data.e.forEach(([x, y, dir, word, clue], id) => {
      const e = { id, x, y, dir, word, clue, num: starts.indexOf(y * 100 + x) + 1, cells: [] };
      for (let i = 0; i < word.length; i++) {
        const cx = x + (dir === 'a' ? i : 0),
          cy = y + (dir === 'd' ? i : 0);
        const idx = cy * this.w + cx;
        if (!this.cells[idx]) this.cells[idx] = { idx, x: cx, y: cy, ch: word[i], a: null, d: null, num: 0 };
        this.cells[idx][dir] = id;
        e.cells.push(idx);
      }
      this.entries.push(e);
    });
    for (const e of this.entries) this.cells[e.cells[0]].num = e.num;
    this.entries.sort((a, b) => (a.dir === b.dir ? a.num - b.num : a.dir === 'a' ? -1 : 1));
    this.byId = {};
    for (const e of this.entries) this.byId[e.id] = e;
    this.letters = new Array(this.w * this.h).fill('');
    this.revealed = new Set();
    this.wrong = new Set();
    this.solved = new Set();
    this.hints = 0;
  }

  cell(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.cells[y * this.w + x];
  }

  locked(idx) {
    // открытые подсказкой буквы и буквы разгаданных слов менять нельзя
    if (this.revealed.has(idx)) return true;
    const c = this.cells[idx];
    return (c.a !== null && this.solved.has(c.a)) || (c.d !== null && this.solved.has(c.d));
  }

  entryOf(idx, dir) {
    const c = this.cells[idx];
    if (!c) return null;
    const id = c[dir] !== null ? c[dir] : c[dir === 'a' ? 'd' : 'a'];
    return this.byId[id];
  }

  filled(e) {
    return e.cells.every((i) => this.letters[i]);
  }
  correct(e) {
    return e.cells.every((i) => this.letters[i] === this.cells[i].ch);
  }

  // обновляет список разгаданных слов; возвращает новые разгаданные
  refresh() {
    const fresh = [];
    for (const e of this.entries) {
      if (this.solved.has(e.id)) continue;
      if (this.correct(e)) {
        this.solved.add(e.id);
        fresh.push(e);
      }
    }
    return fresh;
  }

  complete() {
    return this.solved.size === this.entries.length;
  }

  allFilled() {
    return this.cells.every((c, i) => !c || this.letters[i]);
  }

  setLetter(idx, ch) {
    if (this.locked(idx)) return false;
    this.letters[idx] = ch;
    this.wrong.delete(idx);
    return true;
  }

  isWrong(idx) {
    return !!this.letters[idx] && this.letters[idx] !== this.cells[idx].ch;
  }

  // отмечает неверные буквы; возвращает их количество
  check() {
    this.wrong.clear();
    this.cells.forEach((c, i) => {
      if (c && this.isWrong(i)) this.wrong.add(i);
    });
    return this.wrong.size;
  }

  reveal(idx) {
    this.letters[idx] = this.cells[idx].ch;
    this.revealed.add(idx);
    this.wrong.delete(idx);
  }

  // клетка для подсказки «буква»: выбранная, если она не открыта, иначе первая неверная/пустая в слове
  hintCell(e, sel) {
    const ok = (i) => !this.locked(i) && this.letters[i] !== this.cells[i].ch;
    if (sel !== null && e.cells.includes(sel) && ok(sel)) return sel;
    return e.cells.find(ok) ?? null;
  }

  serialize() {
    return {
      l: this.letters.map((c) => c || '.').join(''),
      r: [...this.revealed],
      h: this.hints,
    };
  }

  restore(s) {
    if (!s || !s.l || s.l.length !== this.letters.length) return;
    // восстанавливаем только буквы, которые ложатся в клетки этой сетки
    for (let i = 0; i < s.l.length; i++) if (this.cells[i] && s.l[i] !== '.') this.letters[i] = s.l[i];
    for (const i of s.r || []) if (this.cells[i]) this.reveal(i);
    this.hints = s.h || 0;
    this.refresh();
  }

  stars() {
    return this.hints === 0 ? 3 : this.hints <= 3 ? 2 : 1;
  }
}
