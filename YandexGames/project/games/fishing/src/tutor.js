// Пошаговое обучение: табличка с текстом, стрелка с зазором к нужной кнопке или месту на воде,
// подсветка цели, счётчик шагов и кнопка «Пропустить». Игровые шаги ждут действия игрока.
import { t } from './i18n.js';
import { SPECIES_ORDER } from './data.js';
import { audio } from './audio.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const GAP = 78; // зазор между табличкой и целью, в нём стрелка
const GAPL = 62; // то же, когда табличка слева
const PAD = 10; // отступ стрелки от таблички и от цели

// названия кнопок подставляются в тексты, чтобы совпадали с интерфейсом
const names = () => ({
  hook: t('hook'),
  pull: t('pull'),
  net: t('net'),
  bait: t('bait'),
  shop: t('shop'),
  quests: t('quests'),
  atlas: t('atlas'),
  map: t('map'),
  tension: t('tension'),
  distance: t('distance'),
  settings: t('settings'),
  n: SPECIES_ORDER.length,
});

export class Tutor {
  constructor(game) {
    this.g = game;
    this.i = -1;
    this.rectT = 0;
    this.el = document.createElement('div');
    this.el.id = 'tutor';
    this.el.className = 'hidden';
    this.el.innerHTML = `<div class="t-ring"></div><div class="t-arr"><svg></svg></div>
      <div class="t-card"><div class="t-top"><span class="t-n"></span><button class="t-skip"></button></div><p class="t-txt"></p><div class="t-btns"><button class="btn primary sm t-next"></button></div></div>`;
    document.body.appendChild(this.el);
    const q = (s) => this.el.querySelector(s);
    this.card = q('.t-card');
    this.ring = q('.t-ring');
    this.arr = q('.t-arr');
    this.svg = q('.t-arr svg');
    this.txt = q('.t-txt');
    this.num = q('.t-n');
    this.skipB = q('.t-skip');
    this.nextB = q('.t-next');
    this.card.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.skipB.onclick = () => {
      audio.play('click');
      this.finish(true);
    };
    this.nextB.onclick = () => {
      audio.play('click');
      this.go(this.i + 1);
    };
    const S = () => game.scene;
    const dom = (sel) => () => {
      const e = game.ui.querySelector(sel);
      if (!e || e.offsetParent === null) return null;
      const r = e.getBoundingClientRect();
      return r.width ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
    };
    const ph = () => game.phase;
    // место на воде, куда удобно забросить
    const spot = () => {
      const s = S(),
        L = s.L;
      const y = L.nearY - 0.42 * (L.nearY - L.farY);
      const x = s.port ? s.W * 0.66 : s.W * 0.56;
      const r = 34 * L.S * s.k(y);
      return { x: x - r, y: y - r * 0.6, w: r * 2, h: r * 1.2, round: true };
    };
    const float = () => {
      const F = S().float;
      if (!F) return null;
      const r = 26 * S().L.S * S().k(F.y);
      return { x: F.x - r, y: F.y - r * 1.9, w: r * 2, h: r * 2.4, round: true };
    };
    this.steps = [
      { k: 'tt_intro', next: true },
      { k: 'tt_cast', target: spot, live: true, done: () => ph() === 'cast' || ph() === 'wait' || ph() === 'bite' },
      { k: 'tt_wait', target: float, live: true, done: () => ph() === 'bite' || ph() === 'fight', back: () => ph() === 'idle' },
      { k: 'tt_hook', target: dom('.actbtn.bite'), done: () => ph() === 'fight', back: () => ph() === 'idle' },
      { k: 'tt_fight', target: dom('.act .fight'), done: () => ph() === 'land' || ph() === 'catch', back: () => ph() === 'idle' },
      { k: 'tt_net', target: dom('.h-net'), next: true, wait: () => ph() === 'idle' },
      { k: 'tt_bait', target: dom('.h-bait'), next: true },
      { k: 'tt_shop', target: dom('.h-shop'), next: true },
      { k: 'tt_quests', target: dom('.h-quests'), next: true },
      { k: 'tt_atlas', target: dom('.h-atlas'), next: true },
      { k: 'tt_map', target: dom('.h-map'), next: true },
      { k: 'tt_env', target: dom('.h-env'), next: true },
      { k: 'tt_set', target: dom('.h-set'), next: true },
      { k: 'tt_end', next: true, last: true },
    ];
    this.CAST = 1;
    this.NET = 5;
  }

  get on() {
    return this.i >= 0;
  }
  // шаг «Подсечь»: пока он на экране, рыба не срывается
  holdBite() {
    return this.on && this.steps[this.i].k === 'tt_hook';
  }

  start() {
    if (this.on) return;
    this.go(this.g.s.stats.caught > 0 ? this.NET : 0);
  }
  go(i) {
    if (i >= this.steps.length) return this.finish(false);
    this.i = i;
    const st = this.steps[i];
    this.txt.textContent = t(st.k, names());
    this.num.textContent = `${i + 1} / ${this.steps.length}`;
    this.skipB.textContent = t('tt_skip');
    this.skipB.style.visibility = st.last ? 'hidden' : '';
    this.nextB.textContent = t(st.last ? 'tt_go' : 'tt_next');
    this.nextB.parentElement.style.display = st.next ? '' : 'none';
    this.card.classList.remove('pop');
    void this.card.offsetWidth;
    this.card.classList.add('pop');
    this.size = null;
    this.rect = null;
    this.rectT = 0;
    this.g.hud(true);
  }
  finish(skipped) {
    this.i = -1;
    this.el.classList.add('hidden');
    this.g.s.tutDone = true;
    this.g.persist();
    this.g.hud(true);
    if (skipped) this.g.toast(t('tt_skipped'), 'tip');
  }
  restart() {
    this.i = -1;
    this.g.s.tutDone = false;
    this.go(0);
  }

  update(dt) {
    if (!this.on) return;
    const g = this.g;
    const st = this.steps[this.i];
    if (st.done && st.done()) return this.go(this.i + 1);
    if (st.back && st.back()) return this.go(this.CAST);
    const hide = g.phase === 'menu' || !!g.modal || (!!st.wait && !st.wait());
    this.el.classList.toggle('hidden', hide);
    if (hide) return;
    // цель: DOM-кнопки перемеряем редко, точки на сцене — каждый кадр
    this.rectT -= dt;
    if (!st.target) this.rect = null;
    else if (st.live || this.rectT <= 0 || !this.rect) {
      this.rect = st.target();
      this.rectT = 0.3;
    }
    this.place();
  }

  place() {
    const W = innerWidth,
      H = innerHeight;
    const r = this.rect;
    // кнопки в правой колонке: табличка слева от кнопки (на узком экране — уже), чтобы стрелка не задевала соседние кнопки
    const sideBtn = r && r.x + r.w / 2 > W * 0.7 && r.w < 130;
    const wantW = sideBtn ? Math.min(360, W - 24, Math.floor(r.x - GAPL - 8)) : 0;
    const cardW = wantW >= 210 ? wantW : 0;
    if (cardW !== this.cardW) {
      this.cardW = cardW;
      this.card.style.width = cardW ? cardW + 'px' : '';
      this.size = null;
    }
    if (!this.size) this.size = { w: this.card.offsetWidth, h: this.card.offsetHeight };
    const { w: cw, h: ch } = this.size;
    let x, y, side;
    if (!r) {
      x = (W - cw) / 2;
      y = (H - ch) / 2;
      side = null;
    } else {
      const cx = r.x + r.w / 2,
        cy = r.y + r.h / 2;
      const fitsV = (yy) => yy >= 8 && yy + ch <= H - 8;
      const order = cardW ? ['left', 'down', 'up'] : cy > H * 0.5 ? ['up', 'down', 'left'] : ['down', 'up', 'left'];
      for (const s of order) {
        if (s === 'up' && fitsV(r.y - GAP - ch)) {
          side = s;
          y = r.y - GAP - ch;
        } else if (s === 'down' && fitsV(r.y + r.h + GAP)) {
          side = s;
          y = r.y + r.h + GAP;
        } else if (s === 'left' && r.x - GAPL - cw >= 8) {
          side = s;
          x = r.x - GAPL - cw;
          y = clamp(cy - ch / 2, 8, H - ch - 8);
        }
        if (side) break;
      }
      if (!side) {
        side = 'up';
        y = clamp(r.y - GAP - ch, 8, H - ch - 8);
      }
      if (side !== 'left') x = clamp(cx - cw / 2, 8, W - cw - 8);
    }
    this.card.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    if (!r) {
      this.ring.style.display = this.arr.style.display = 'none';
      return;
    }
    // подсветка цели
    const p = 6;
    this.ring.style.display = '';
    this.ring.style.transform = `translate(${(r.x - p).toFixed(1)}px,${(r.y - p).toFixed(1)}px)`;
    this.ring.style.width = r.w + p * 2 + 'px';
    this.ring.style.height = r.h + p * 2 + 'px';
    this.ring.style.borderRadius = r.round ? '50%' : '22px';
    // стрелка между табличкой и целью, с зазором с обеих сторон
    let ax, ay, bx, by;
    const cx = r.x + r.w / 2,
      cy = r.y + r.h / 2;
    if (side === 'left') {
      ax = x + cw;
      ay = clamp(cy, y + 20, y + ch - 20);
      bx = r.x - p;
      by = cy;
    } else {
      ax = clamp(cx, x + 26, x + cw - 26);
      ay = side === 'up' ? y + ch : y;
      bx = cx;
      by = side === 'up' ? r.y - p : r.y + r.h + p;
    }
    const d = Math.hypot(bx - ax, by - ay);
    const len = Math.round(clamp(d - PAD * 2, 24, 90));
    const ang = Math.atan2(by - ay, bx - ax) - Math.PI / 2;
    const mx = (ax + bx) / 2,
      my = (ay + by) / 2;
    this.arr.style.display = '';
    this.arr.style.transform = `translate(${(mx - 17).toFixed(1)}px,${(my - len / 2).toFixed(1)}px) rotate(${ang.toFixed(3)}rad)`;
    if (this._len !== len) {
      this._len = len;
      this.arr.style.height = len + 'px';
      this.svg.setAttribute('viewBox', `0 0 34 ${len}`);
      this.svg.setAttribute('height', len);
      this.svg.innerHTML = `<path d="M17 3 V${len - 16}" stroke="#fff" stroke-width="11" stroke-linecap="round"/><path d="M5 ${len - 20} L17 ${len - 3} L29 ${len - 20} Z" fill="#fff" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
        <path d="M17 3 V${len - 16}" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"/><path d="M7 ${len - 19} L17 ${len - 5} L27 ${len - 19} Z" fill="var(--accent)" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>`;
    }
  }
}

export const tutorCss = `
#tutor{position:fixed;inset:0;z-index:45;pointer-events:none}
#tutor.hidden{display:none}
#tutor .t-card{position:absolute;left:0;top:0;width:min(360px,calc(100vw - 24px));box-sizing:border-box;padding:12px 16px 14px;border-radius:20px;background:var(--panel);border:3px solid var(--accent);box-shadow:0 10px 30px rgba(20,40,60,.3);pointer-events:auto;will-change:transform}
#tutor .t-card.pop{animation:tpop .3s cubic-bezier(.3,1.4,.6,1)}
#tutor .t-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}
#tutor .t-n{font-size:14px;color:var(--muted)}
#tutor .t-skip{min-height:36px;padding:0 12px;border-radius:12px;background:#fff;border:2px solid var(--line);font-size:15px;color:var(--muted);font-weight:800}
#tutor .t-txt{margin:2px 0 0;font-size:18px;line-height:1.3;color:var(--ink);font-weight:700}
#tutor .t-btns{display:flex;justify-content:flex-end;margin-top:10px}
#tutor .t-next{min-width:130px}
#tutor .t-ring{position:absolute;left:0;top:0;border:4px solid var(--accent);box-shadow:0 0 0 4px rgba(255,255,255,.7);animation:tring 1.2s ease-in-out infinite;box-sizing:border-box;will-change:transform}
#tutor .t-arr{position:absolute;left:0;top:0;width:34px;transform-origin:50% 50%;will-change:transform}
#tutor .t-arr svg{display:block;width:34px;animation:tbob .9s ease-in-out infinite alternate;filter:drop-shadow(0 2px 3px rgba(20,40,60,.3))}
@keyframes tpop{from{opacity:0;scale:.9}to{opacity:1;scale:1}}
@keyframes tring{50%{opacity:.45}}
@keyframes tbob{from{translate:0 -5px}to{translate:0 5px}}
@media (max-height:520px){#tutor .t-txt{font-size:16px}#tutor .t-card{padding:10px 14px 12px}}
`;
