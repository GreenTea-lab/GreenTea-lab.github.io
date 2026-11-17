// Пошаговое обучение: дед Тимофей с репликой, стрелка на нужный объект.
// Шаг «инфо» ставит игру на паузу и ждёт «Понятно», шаг «действие» ждёт события на ферме.
import { t } from './i18n.js';
import { save } from './save.js';
import { IC } from './icons.js';
import { ANIMALS, BUILDINGS, UNLOCK } from './data.js';
import { audio } from './audio.js';

const low = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// портрет деда: соломенная шляпа, усы, щёки
const FACE = `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" stroke="#3a2814" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
<circle cx="40" cy="44" r="25" fill="#ffd2a8"/>
<path d="M18 50q-2 14 10 20q12 6 24 0q12-6 10-20q-10 8-22 8t-22-8z" fill="#f4f1ea"/>
<path d="M30 52q5-5 10-1q5-4 10 1q-5 5-10 2q-5 3-10-2z" fill="#e8e2d6"/>
<circle cx="31" cy="42" r="3" fill="#3a2814" stroke="none"/><circle cx="49" cy="42" r="3" fill="#3a2814" stroke="none"/>
<path d="M26 36q5-4 10 0M44 36q5-4 10 0" fill="none" stroke-width="2.5"/>
<ellipse cx="24" cy="49" rx="5" ry="3.5" fill="#ff9e9e" stroke="none" opacity=".8"/><ellipse cx="56" cy="49" rx="5" ry="3.5" fill="#ff9e9e" stroke="none" opacity=".8"/>
<circle cx="40" cy="47" r="4.5" fill="#ffb48a"/>
<path d="M4 28q36-12 72 0q-4 6-36 6T4 28z" fill="#f2c45a"/><path d="M18 28q2-20 22-20t22 20" fill="#f6d06c"/><path d="M19 24q21 6 42 0" fill="none" stroke="#e2574c" stroke-width="5"/>
</svg>`;

export class Tutor {
  constructor(game) {
    this.g = game;
    this.queue = [];
    this.cur = null; // { name, steps, i }
    this.flags = {};
    this.el = null;
  }

  get active() {
    return !!this.cur;
  }
  done(name) {
    return !!save.data.tips['tu_' + name];
  }
  mark(name) {
    save.data.tips['tu_' + name] = 1;
    save.write(false);
  }

  // ---------- сценарии ----------
  seq(name) {
    const g = this.g;
    const slotOf = (k) => g.farm.slots.findIndex((s) => s.kind === k);
    const ev = (...names) => ({ ev: names });
    if (name === 'l1')
      return [
        { k: 'tu_l1a', target: 'goals', info: true },
        { k: 'tu_l1b', target: 'field', ...ev('plant') },
        { k: 'tu_l1c', target: 'well', info: true },
        { k: 'tu_l1d', target: 'field', ...ev('lay', 'drop') },
        { k: 'tu_l1e', target: 'item:egg', ...ev('collect', 'catPick') },
        { k: 'tu_l1f', target: 'store', info: true },
        { k: 'tu_l1g', target: null, info: true },
      ];
    if (name === 'l2')
      return [
        { k: 'tu_l2a', target: 'shop:goose', ...ev('buy') },
        { k: 'tu_l2b', target: 'store', flag: 'barn', when: (f) => f.storeUsed() > 0 || f.truckUsed() > 0 },
        { k: 'tu_l2c', target: 'barnrow', cond: (f) => f.truckUsed() > 0, back: 1 },
        { k: 'tu_l2d', target: 'barngo', ...ev('truckGo'), back: 1 },
        { k: 'tu_l2e', target: 'tmap', info: true },
      ];
    if (name === 'l3') {
      const k = 'powder',
        B = BUILDINGS[k],
        i = slotOf(k);
      const v = { b: low(t('b_' + k)), in: low(t('i_' + B.in)), out: low(t('i_' + B.out)) };
      return [
        { k: 'tu_l3a', v, target: 'slot:' + i, ...ev('build') },
        { k: 'tu_l3b', target: 'slot:' + i, info: true },
        { k: 'tu_l3c', v, target: 'slot:' + i, ...ev('load'), when: (f) => (f.stock[B.in] || 0) > 0 },
        { k: 'tu_l3d', v, target: 'item:' + B.out, ...ev('collect', 'catPick'), test: (e) => e.t === 'catPick' || e.item === B.out, when: (f) => f.items.some((x) => !x.gone && x.item === B.out) },
      ];
    }
    if (name === 'l4') return [{ k: 'tu_l4a', target: 'store', info: true }];
    if (name === 'coins') return [{ k: 'tu_coins', target: 'goals', info: true }];
    if (name.startsWith('b_')) {
      const k = name.slice(2),
        B = BUILDINGS[k];
      return [{ k: 'tu_build', v: { b: low(t('b_' + k)), in: low(t('i_' + B.in)), out: low(t('i_' + B.out)) }, target: 'slot:' + slotOf(k), ...ev('build'), test: (e) => g.farm.slots[e.i] && g.farm.slots[e.i].kind === k }];
    }
    if (name.startsWith('a_')) {
      const k = name.slice(2);
      const key = k === 'cat' ? 'tu_cat' : k === 'dog' ? 'tu_dog' : 'tu_animal';
      const v = { a: low(t('a_' + k)), p: ANIMALS[k].product ? low(t('i_' + ANIMALS[k].product)) : '' };
      return [{ k: key, v, target: 'shop:' + k, ...ev('buy'), test: (e) => e.kind === k }];
    }
    if (name === 'bear') {
      const id = this.bearId;
      return [
        { k: 'tu_bear1', target: 'bear:' + id, cond: (f) => !f.bears.some((b) => b.id === id && !b.gone && (b.state === 'free' || b.state === 'fall')) },
        { k: 'tu_bear2', target: 'bear:' + id, cond: (f) => !f.bears.some((b) => b.id === id && !b.gone && b.state === 'caged') },
      ];
    }
    if (name === 'well') return [{ k: 'tu_well', target: 'well', ...ev('wellStart'), cond: (f) => f.well.water > 0 || f.well.refill > 0 }];
    if (name === 'full') return [{ k: 'tu_full', target: 'store', flag: 'barn' }];
    return [];
  }

  // ---------- запуск ----------
  start(n) {
    this.stop();
    this.flags = {};
    if (this.g.debugOff) return;
    const L = this.g.farm.L;
    const list = [];
    if (n === 1) list.push('l1');
    if (n === 2) list.push('l2');
    if (n === 3) list.push('l3');
    if (n === 4) list.push('l4');
    for (const [k, lv] of Object.entries(UNLOCK)) {
      if (lv !== n || n <= 3) continue;
      list.push(BUILDINGS[k] ? 'b_' + k : 'a_' + k);
    }
    if (L.goals.coins) list.push('coins');
    for (const s of list) if (!this.done(s)) this.queue.push(s);
    this.next();
  }
  stop() {
    this.queue = [];
    this.cur = null;
    this.render();
  }
  // событие-триггер для разовых сценариев (медведь, пустой колодец, полный амбар)
  trigger(name) {
    if (this.g.debugOff || this.done(name) || this.queue.includes(name) || (this.cur && this.cur.name === name)) return;
    if (name === 'bear') this.queue.unshift(name);
    else this.queue.push(name);
    if (!this.cur) this.next();
  }
  next() {
    if (this.cur) this.mark(this.cur.name);
    this.cur = null;
    while (this.queue.length) {
      const name = this.queue.shift();
      if (this.done(name)) continue;
      const steps = this.seq(name).filter((s) => !s.target || !s.target.endsWith(':-1'));
      if (!steps.length) {
        this.mark(name);
        continue;
      }
      this.cur = { name, steps, i: 0, shown: false };
      break;
    }
    this.render();
  }
  get step() {
    return this.cur ? this.cur.steps[this.cur.i] : null;
  }
  advance() {
    const c = this.cur;
    if (!c) return;
    if (this.step && this.step.info) this.unpause();
    audio.play('tab');
    c.i++;
    c.shown = false;
    if (c.i >= c.steps.length) this.next();
    else this.render();
  }
  skip() {
    if (this.step && this.step.info) this.unpause();
    // пропуск всего обучения: отмечаем все обучающие сценарии
    for (const s of ['l1', 'l2', 'l3', 'l4', 'coins', 'bear', 'well', 'full', ...Object.keys(UNLOCK).map((k) => (BUILDINGS[k] ? 'b_' : 'a_') + k)]) this.mark(s);
    this.queue = [];
    this.cur = null;
    this.render();
  }
  unpause() {
    if (this.pausedByMe) {
      this.pausedByMe = false;
      if (!this.g.ui.modalOpen) this.g.pause(false);
    }
  }
  flag(name) {
    this.flags[name] = true;
    const s = this.step;
    if (s && s.flag === name && this.cur.shown) this.advance();
  }

  onEvent(e) {
    if (e.t === 'bearDrop') {
      if (!this.done('bear') && !this.queue.includes('bear') && !(this.cur && this.cur.name === 'bear')) this.bearId = e.id;
      this.trigger('bear');
    }
    if (e.t === 'wellEmpty' && this.g.level > 1) this.trigger('well');
    if (e.t === 'storeFull' && this.g.level > 1) this.trigger('full');
    const s = this.step;
    if (!s || !s.ev || !this.cur.shown) return;
    if (s.ev.includes(e.t) && (!s.test || s.test(e))) this.advance();
  }

  update() {
    const c = this.cur;
    if (!c || !this.g.farm) return;
    const f = this.g.farm;
    const s = this.step;
    const barnOpen = !!(this.g.ui.modalEl && this.g.ui.modalEl.classList.contains('barn'));
    // шаги внутри амбара: окно закрыли — возвращаемся к шагу «нажми на амбар»
    if (s.back !== undefined && !barnOpen && f.truck.state === 'home') {
      c.i = s.back;
      c.shown = false;
      this.flags.barn = false;
      this.render();
      return;
    }
    if (!c.shown) {
      if (s.when && !s.when(f)) {
        if (this.el) this.el.classList.add('hide');
        this.unpad();
        this.hideArrow();
        return;
      }
      if (s.flag && this.flags[s.flag] && s.flag !== 'barn') return this.advance();
      c.shown = true;
      this.render();
      if (s.info && !this.g.paused) {
        this.pausedByMe = true;
        this.g.pause(true);
      }
    }
    if (s.cond && s.cond(f)) return this.advance();
    if (s.flag === 'barn' && barnOpen) return this.advance();
    this.place();
  }

  // ---------- отображение ----------
  render() {
    const ui = this.g.ui;
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'tut hide';
      this.arrow = document.createElement('div');
      this.arrow.className = 'tarr2';
      this.arrow.innerHTML = IC.up2;
      this.ring = document.createElement('div');
      this.ring.className = 'tring';
    }
    for (const x of [this.ring, this.arrow, this.el]) if (x.parentNode !== ui.root) ui.root.appendChild(x);
    const s = this.step;
    if (!s || !this.cur.shown) {
      this.el.classList.add('hide');
      this.unpad();
      this.hideArrow();
      return;
    }
    const c = this.cur;
    this.el.className = 'tut' + (s.info ? ' info' : '') + (this.g.lay && this.g.lay.portrait ? ' por' : '');
    this.el.innerHTML = `<div class="tface">${FACE}</div><div class="tbub"><b class="tnm">${esc(t('tu_name'))}${c.steps.length > 1 ? `<small>${c.i + 1}/${c.steps.length}</small>` : ''}</b><p>${esc(t(s.k, s.v))}</p>
      <div class="tbtns">${s.info ? `<button class="btn mid green tok">${IC.check}${esc(t('tu_ok'))}</button>` : ''}<button class="tskip">${esc(t('tu_skip'))}</button></div></div>`;
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    const ok = this.el.querySelector('.tok');
    if (ok) ok.onclick = () => this.advance();
    this.el.querySelector('.tskip').onclick = () => this.skip();
    this.place();
  }
  unpad() {
    const m = this.padM;
    this.padM = null;
    if (!m) return;
    m.classList.remove('tpad');
    m.style.paddingBottom = m.style.paddingLeft = '';
  }
  hideArrow() {
    if (this.arrow) this.arrow.style.display = 'none';
    if (this.ring) this.ring.style.display = 'none';
  }

  // точка, куда смотрит стрелка; dir — куда смотрит остриё
  point(tg) {
    const g = this.g,
      f = g.farm,
      lay = g.lay,
      v = g.view,
      ui = g.ui;
    const W = window.innerWidth,
      H = window.innerHeight;
    const dom = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (!r.width) return null;
      const cx = r.left + r.width / 2;
      const p = r.top + r.height / 2 > H * 0.55 ? { x: cx, y: r.top - 6, dir: 'down' } : { x: cx, y: r.bottom + 6, dir: 'up' };
      p.rect = r;
      return p;
    };
    const side = (x, y, z) => {
      const p = v.project(x, y, z);
      return { x: p.x + 8, y: p.y, dir: 'left' };
    };
    if (!tg) return null;
    if (tg === 'goals') {
      const el = ui.root.querySelector('.goals');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (lay.portrait) return { x: r.left + r.width / 2, y: r.bottom + 6, dir: 'up', rect: r };
      return { x: r.right + 8, y: r.top + Math.min(60, r.height / 2), dir: 'left', rect: r };
    }
    if (tg.startsWith('shop:')) return dom(ui.root.querySelector(`.sbtn[data-k="${tg.slice(5)}"]`));
    if (tg === 'barnrow') return dom(document.querySelector('.modal.barn .irow[data-l]'));
    if (tg === 'barngo') return dom(document.querySelector('.modal.barn .go'));
    if (tg === 'tmap') return dom(ui.root.querySelector('.tmap'));
    if (tg === 'field') {
      const F = lay.field;
      const p = v.project((F.x0 + F.x1) / 2, 0.2, (F.z0 + F.z1) / 2);
      return { x: p.x, y: p.y, dir: 'down' };
    }
    if (tg === 'well') return side(lay.well.x + 0.9, 1.0, lay.well.z);
    if (tg === 'store') return side(lay.store.x + 1.25, 1.0, lay.store.z);
    if (tg.startsWith('slot:')) {
      const s = f.slots[+tg.slice(5)];
      return s ? side(s.x + 1.2, 0.9, s.z) : null;
    }
    if (tg.startsWith('item:')) {
      const k = tg.slice(5);
      const it = f.items.find((x) => !x.gone && !x.carried && x.item === k);
      if (!it) return null;
      const p = v.project(it.x, 0.25, it.z);
      return { x: p.x, y: p.y - 4, dir: 'down' };
    }
    if (tg.startsWith('bear:')) {
      const b = f.bears.find((x) => x.id === +tg.slice(5));
      if (!b || b.gone) return null;
      const y = b.state === 'fall' ? v.bearY(b) : 0;
      return side(b.x + 0.75, y + 0.7, b.z);
    }
    return null;
  }

  place() {
    const s = this.step;
    if (!s || !this.cur || !this.cur.shown) {
      this.unpad();
      return this.hideArrow();
    }
    const H = window.innerHeight;
    const m = this.g.ui.modalOpen && this.g.ui.modalEl;
    if (m) {
      // окно открыто: карточка внизу, окно сдвигаем, чтобы она его не закрывала
      this.el.classList.remove('top');
      this.el.classList.toggle('side', !(this.g.lay && this.g.lay.portrait));
      const r = this.el.getBoundingClientRect();
      if (this.padM && this.padM !== m) this.unpad();
      m.classList.add('tpad');
      if (this.g.lay && this.g.lay.portrait) m.style.paddingBottom = Math.round(H - r.top + 6) + 'px';
      else m.style.paddingLeft = Math.round(r.right + 6) + 'px';
      this.padM = m;
    } else {
      if (this.padM) this.unpad();
      this.el.classList.remove('side');
    }
    const p = this.point(s.target);
    // карточка уходит наверх, если цель внизу экрана
    if (!m) this.el.classList.toggle('top', !!(p && p.y > H * 0.62));
    if (!p) return this.hideArrow();
    this.arrow.style.display = '';
    this.arrow.className = 'tarr2 ' + p.dir;
    this.arrow.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`;
    if (p.rect) {
      const r = p.rect;
      Object.assign(this.ring.style, { display: '', left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' });
    } else this.ring.style.display = 'none';
  }
}
