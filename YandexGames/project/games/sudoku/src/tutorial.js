// Пошаговое обучение на первом уровне: правила, первый ход, заметки, подсказка. На каждом шаге — «Пропустить обучение».
import { t } from './i18n.js';
import { Solver } from './sudoku.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export class Tutorial {
  constructor({ board, done, play }) {
    this.b = board;
    this.onDone = done;
    this.play = play;
    this.active = false;
    this.box = null;
  }

  start() {
    this.active = true;
    this.step = 0;
    this.render();
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this._clear();
    if (this.box) this.box.remove();
    this.box = null;
  }

  finish() {
    this.stop();
    this.onDone();
  }

  _clear() {
    document.querySelectorAll('.glow').forEach((e) => e.classList.remove('glow'));
    if (this.b.guide) {
      this.b.guide = null;
      this.b.render();
    }
  }

  // первый ход: «одиночка» в квадрате, иначе любая простая
  _target() {
    const B = this.b;
    const g = B.vals.map((v, i) => (v && v === B.sol[i] ? v : 0));
    const S = new Solver(B.G, g);
    const st = S.next(1);
    if (!st || !st.place) return null;
    return { i: st.place[0], d: st.place[1], area: st.tech === 'naked' ? [] : st.cells, tech: st.tech };
  }

  render() {
    this._clear();
    const B = this.b;
    const digitMode = B.app.opt('input') === 'digit';
    let text = '',
      btn = '',
      glow = null;
    switch (this.step) {
      case 0:
        text = t(B.G.N === 6 ? 'tut0mini' : 'tut0');
        btn = t('tutNext');
        break;
      case 1: {
        this.tg = this._target();
        if (!this.tg) return this.go(3);
        const { i, d, area, tech } = this.tg;
        B.guide = { area, target: i };
        B.render();
        text = (tech === 'naked' ? t('tut1n', { d }) : t('tut1', { d })) + ' ' + (digitMode ? t('tut1d', { d }) : t('tut1c'));
        if (digitMode) glow = B.nums[d - 1];
        break;
      }
      case 2: {
        const { i, d, area } = this.tg;
        B.guide = { area, target: i };
        B.render();
        text = digitMode ? t('tut2d') : t('tut2', { d });
        glow = digitMode ? B.cells[i] : B.nums[d - 1];
        break;
      }
      case 3:
        text = t('tut3');
        btn = t('tutNext');
        break;
      case 4:
        text = t('tut4');
        glow = B.q('.t-notes');
        break;
      case 5:
        text = t('tut5');
        btn = t('tutNext');
        glow = B.q('.t-notes');
        break;
      case 6:
        text = t('tut6');
        btn = t('tutOk');
        glow = B.q('.t-hint');
        break;
      case 7:
        text = t('tut7');
        btn = t('tutStart');
        break;
    }
    if (glow) glow.classList.add('glow');
    if (!this.box) {
      this.box = document.createElement('div');
      this.box.className = 'tipbox';
      document.body.appendChild(this.box);
    }
    const last = this.step === 7;
    this.box.innerHTML = `<div class="tp-n">${esc(t('tutStep', { a: this.step + 1, b: 8 }))}</div><p>${esc(text)}</p><div class="tp-b">${last ? '' : `<button class="tp-skip">${esc(t('tutSkip'))}</button>`}${btn ? `<button class="tp-ok">${esc(btn)}</button>` : ''}</div>`;
    const ok = this.box.querySelector('.tp-ok');
    if (ok)
      ok.onclick = () => {
        this.play('click');
        if (last) this.finish();
        else this.go(this.step + 1);
      };
    const sk = this.box.querySelector('.tp-skip');
    if (sk)
      sk.onclick = () => {
        this.play('click');
        this.finish();
      };
    this.box.classList.remove('anim');
    void this.box.offsetWidth;
    this.box.classList.add('anim');
    this.place();
  }

  go(n) {
    this.step = n;
    this.render();
  }

  event(name, data) {
    if (!this.active) return;
    const B = this.b;
    const digitMode = B.app.opt('input') === 'digit';
    switch (this.step) {
      case 1:
        if (!digitMode && name === 'select' && data === this.tg.i) this.go(2);
        if (digitMode && name === 'digit' && B.activeDigit === this.tg.d) this.go(2);
        if (name === 'place' && data.ok && data.i === this.tg.i) this.go(3);
        break;
      case 2:
        if (name === 'place') {
          if (data.ok && data.i === this.tg.i) this.go(3);
          else if (!data.ok) B.app.toast(t('tutWrong', { d: this.tg.d }));
        }
        if (!digitMode && name === 'select' && data !== this.tg.i) this.go(1);
        break;
      case 4:
        if (name === 'notes' && data) this.go(5);
        break;
      case 5:
        if (name === 'notes' && !data) this.go(6);
        break;
      case 6:
        if (name === 'hint') this.go(7);
        break;
    }
  }

  // окно не закрывает нужную клетку: над кнопками, если цель вверху поля, иначе — сверху поля
  place() {
    if (!this.box) return;
    const B = this.b;
    const tools = B.q('.tools').getBoundingClientRect();
    const br = B.boardEl.getBoundingClientRect();
    const wide = document.body.classList.contains('wide');
    const s = this.box.style;
    if (wide) {
      const gr = B.q('.gright').getBoundingClientRect();
      s.left = gr.left + gr.width / 2 + 'px';
      s.maxWidth = gr.width + 'px';
      s.top = Math.max(8, tools.top - 10) + 'px';
      s.transform = 'translate(-50%,-100%)';
      if (tools.top - 10 < 190) {
        // мало места над кнопками — поверх нижней части поля
        s.left = br.left + br.width / 2 + 'px';
        s.maxWidth = br.width + 'px';
        s.top = br.bottom - 8 + 'px';
      }
      return;
    }
    s.left = innerWidth / 2 + 'px';
    s.maxWidth = '';
    const tg = this.step <= 2 && this.tg ? this.tg.i : -1;
    const lowTarget = tg >= 0 && B.G.row(tg) >= B.G.N / 2;
    if (lowTarget) {
      s.top = br.top + 4 + 'px';
      s.transform = 'translate(-50%,0)';
    } else {
      s.top = tools.top - 6 + 'px';
      s.transform = 'translate(-50%,-100%)';
    }
  }
}
