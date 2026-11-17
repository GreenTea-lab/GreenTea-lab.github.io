// DOM-интерфейс поверх 3D-сцены
import { iap, itemHTML } from './iap.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import * as THREE from 'three';
import * as E from './econ.js';
import { IC } from './icons.js';
import { t as tr, fmt, fmtRate, fmtTime } from './i18n.js';
import { audio } from './audio.js';
import { sdk } from './sdk.js';
import { cellPos } from './world.js';
import { GOALS, goalProgress, dailyProgress, STREAK } from './tasks.js';

const $ = (sel, root = document) => root.querySelector(sel);
const VOL_IC = {
  music: '<svg viewBox="0 0 24 24"><path d="M9 17V5l11-2v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><circle cx="6.5" cy="17.5" r="3" fill="currentColor"/><circle cx="17.5" cy="15.5" r="3" fill="currentColor"/></svg>',
  sfx: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const RES = ['coins', 'wood', 'stone', 'crystals'];

export class UI {
  constructor(game) {
    this.g = game;
    this.root = $('#ui');
    this.thumbs = {};
    this.labels = new Map();
    this.floaters = [];
    this.modalOpen = false;
    this.tab = 'house';
    const css = document.createElement('style');
    css.textContent = volumeCss({ accent: '#72c66a', track: '#ece4d6', thumb: '#ffffff', muted: '#8a93a6' }) + '.modal .vol-box{margin:10px 0 14px;text-align:left}';
    document.head.appendChild(css);
    this.build();
  }

  icon(n) {
    return IC[n] || '';
  }

  costHTML(cost, s = this.g.s) {
    return Object.entries(cost)
      .map(([r, v]) => `<span class="cost ${(s[r] || 0) >= v ? '' : 'short'}">${IC[r]}${fmt(v)}</span>`)
      .join('');
  }

  // ---------- каркас ----------
  build() {
    const r = this.root;
    r.innerHTML = '';
    // верх
    const top = el('div', 'top');
    this.resEl = {};
    const res = el('div', 'res');
    for (const k of RES) {
      const c = el('div', 'chip chip-' + k, `${IC[k]}<div class="cv"><b>0</b><small></small></div>`);
      if (k === 'crystals') c.addEventListener('click', () => this.crystalModal());
      res.appendChild(c);
      this.resEl[k] = c;
    }
    top.appendChild(res);
    const right = el('div', 'tr');
    this.lvlEl = el('div', 'lvl', `<div class="lvn">1</div><div class="lvbar"><i></i></div>`);
    this.lvlEl.addEventListener('click', () => this.islandModal());
    right.appendChild(this.lvlEl);
    const btns = el('div', 'tbtns');
    this.tasksBtn = this.iconBtn('scroll', () => this.tasksModal(), 'tasks');
    btns.append(this.tasksBtn, this.iconBtn('trophy', () => this.lbModal()), this.iconBtn('gear', () => this.settingsModal()));
    right.appendChild(btns);
    top.appendChild(right);
    r.appendChild(top);
    // вторая строка: жители и уют
    const stats = el('div', 'stats');
    this.popEl = el('div', 'chip small', `${IC.pop}<b>0</b>`);
    this.cozyEl = el('div', 'chip small cozy', `${IC.cozy}<b>x1</b>`);
    this.cozyEl.addEventListener('click', () => this.toast(tr('cozyHint')));
    this.featherEl = el('div', 'chip small hidden', `${IC.feather}<b>0</b>`);
    stats.append(this.popEl, this.cozyEl, this.featherEl);
    r.appendChild(stats);
    // цель обучения
    this.goalEl = el('div', 'goal hidden');
    this.goalEl.addEventListener('click', () => this.g.claimGoal());
    r.appendChild(this.goalEl);
    // низ
    const bottom = el('div', 'bottom');
    this.buildBtn = el('button', 'big green', `${IC.hammer}<span>${tr('build')}</span>`);
    this.buildBtn.addEventListener('click', () => {
      audio.unlock();
      audio.startMusic();
      audio.play('click');
      this.toggleDrawer();
    });
    this.buildersEl = el('button', 'builders', `${IC.builder}<b>2/2</b>`);
    this.buildersEl.addEventListener('click', () => this.buildersModal());
    bottom.append(this.buildersEl, this.buildBtn);
    r.appendChild(bottom);
    // выдвижное меню стройки
    this.drawer = el('div', 'drawer hidden');
    r.appendChild(this.drawer);
    // карточка выбранного
    this.sheet = el('div', 'sheet hidden');
    r.appendChild(this.sheet);
    // панель расстановки
    this.placeBar = el('div', 'placebar hidden');
    r.appendChild(this.placeBar);
    // метки в мире и всплывашки
    this.labelLayer = el('div', 'labels');
    r.appendChild(this.labelLayer);
    this.toasts = el('div', 'toasts');
    r.appendChild(this.toasts);
    this.modalWrap = el('div', 'modal-wrap hidden');
    this.modalWrap.addEventListener('click', (e) => {
      if (e.target === this.modalWrap && this.modalClosable) this.closeModal();
    });
    r.appendChild(this.modalWrap);
  }

  iconBtn(icon, fn, badge) {
    const b = el('button', 'ibtn', IC[icon] + (badge ? '<i class="badge hidden"></i>' : ''));
    b.addEventListener('click', () => {
      audio.unlock();
      audio.startMusic();
      audio.play('click');
      fn();
    });
    return b;
  }

  // ---------- обновление ----------
  update() {
    const g = this.g;
    const s = g.s;
    const r = g.rates || E.rates(s);
    for (const k of RES) {
      const c = this.resEl[k];
      c.querySelector('b').textContent = fmt(s[k]);
      const rate = r[k] || 0;
      c.querySelector('small').textContent = rate > 0.001 && k !== 'crystals' ? '+' + fmtRate(rate) + tr('perSec') : '';
    }
    this.popEl.querySelector('b').textContent = fmt(r.pop);
    this.popEl.classList.toggle('warn', r.workK < 0.999);
    this.cozyEl.querySelector('b').textContent = 'x' + E.cozyMult(s).toFixed(2).replace('.', ',');
    this.featherEl.classList.toggle('hidden', !s.feathers);
    this.featherEl.querySelector('b').textContent = s.feathers;
    // уровень
    const L = s.level;
    const xp = E.islandXP(s);
    const a = E.xpFor(L);
    const b = E.xpFor(L + 1);
    this.lvlEl.querySelector('.lvn').textContent = L;
    this.lvlEl.querySelector('i').style.width = Math.min(100, ((xp - a) / (b - a)) * 100) + '%';
    // строители
    const busy = E.busyBuilders(s, Date.now());
    this.buildersEl.querySelector('b').textContent = `${s.builders - busy}/${s.builders}`;
    this.buildersEl.classList.toggle('none', busy >= s.builders);
    // цель
    const goal = GOALS[s.goal];
    if (goal && !g.mode && !(g.tut && g.tut.active)) {
      const p = goalProgress(s, goal);
      const done = p >= goal.n;
      this.goalEl.classList.remove('hidden');
      this.goalEl.classList.toggle('done', done);
      const html = `<div class="gt">${IC.star}<span>${this.goalText(goal)}</span></div><div class="gp"><div class="pb"><i style="width:${(p / goal.n) * 100}%"></i></div><span>${p}/${goal.n}</span></div>${done ? `<div class="gclaim">${tr('claim')} ${this.rewardHTML(goal.reward)}</div>` : ''}`;
      if (this.goalEl._h !== html) {
        this.goalEl.innerHTML = html;
        this.goalEl._h = html;
      }
    } else this.goalEl.classList.add('hidden');
    // значок заданий
    const ready = s.daily ? s.daily.tasks.filter((tk) => !tk.claimed && dailyProgress(s, tk) >= tk.n).length : 0;
    const badge = this.tasksBtn.querySelector('.badge');
    badge.classList.toggle('hidden', !ready);
    badge.textContent = ready;
    // живые данные в открытых панелях
    if (this.sheetObj && !this.sheet.classList.contains('hidden')) this.refreshSheetLive();
    if (!this.drawer.classList.contains('hidden')) this.refreshDrawerAfford();
  }

  goalText(gl) {
    if (gl.type === 'build') return tr('t_build', { b: tr('b_' + gl.arg) }) + (gl.n > 1 ? ' ×' + gl.n : '');
    if (gl.type === 'lvl') return tr('t_lvl', { b: tr('b_' + gl.arg), n: gl.n });
    if (gl.type === 'decor') return tr('t_decor', { n: gl.n });
    if (gl.type === 'level') return tr('t_level', { n: gl.n });
    if (gl.type === 'plot') return tr('t_plot');
    if (gl.type === 'balloon') return tr('t_balloon', { n: gl.n });
    return '';
  }

  rewardHTML(r) {
    return Object.entries(r)
      .map(([k, v]) => `<span class="cost">${IC[k]}${fmt(v)}</span>`)
      .join('');
  }

  // каждый кадр: метки над зданиями и всплывашки
  frame(dt) {
    const g = this.g;
    const now = Date.now();
    const seen = new Set();
    const W = g.W;
    const H = g.H;
    // таймеры строек
    for (const b of g.s.buildings) {
      if (!b.build || b.build <= now) continue;
      const k = 'bt' + b.id;
      seen.add(k);
      let L = this.labels.get(k);
      if (!L) {
        L = el('div', 'wl timer', '');
        L.addEventListener('click', () => g.select(b));
        this.labelLayer.appendChild(L);
        this.labels.set(k, L);
      }
      const total = E.buildTime(b.lvl, g.s) * 1000;
      const k2 = 1 - (b.build - now) / total;
      const html = `${IC.hammer}<span>${fmtTime((b.build - now) / 1000)}</span><i style="width:${Math.max(0, Math.min(1, k2)) * 100}%"></i>`;
      if (L._h !== html) {
        L.innerHTML = html;
        L._h = html;
      }
      this.place(L, cellPos(b.x, b.z).add(new THREE.Vector3(0, 1.6, 0)), W, H);
    }
    // цены участков
    if (g.ghosts && !g.mode) {
      for (const gp of g.ghosts) {
        const k = 'pl' + gp.px + ',' + gp.pz;
        seen.add(k);
        let L = this.labels.get(k);
        if (!L) {
          L = el('div', 'wl plot', '');
          L.addEventListener('click', () => this.plotModal(gp));
          this.labelLayer.appendChild(L);
          this.labels.set(k, L);
        }
        const cost = E.plotCost(g.s.plots.length);
        const html = gp.locked ? `${IC.lock}<span>${tr('lvl')} ${E.BIOMES[gp.biome].unlock}</span>` : `${IC.plot}<span class="${g.s.coins >= cost.coins ? '' : 'short'}">${fmt(cost.coins)}</span>`;
        if (L._h !== html) {
          L.innerHTML = html;
          L._h = html;
        }
        L.classList.toggle('locked', gp.locked);
        this.place(L, new THREE.Vector3((gp.px + 0.5) * E.PLOT - E.GRID / 2, 0.3, (gp.pz + 0.5) * E.PLOT - E.GRID / 2), W, H);
      }
    }
    for (const [k, L] of this.labels) {
      if (!seen.has(k)) {
        L.remove();
        this.labels.delete(k);
      }
    }
    // всплывающие тексты
    for (const f of this.floaters) {
      f.t += dt;
      const p = this.g.world.project(f.pos.clone().add(new THREE.Vector3(0, f.t * 0.6, 0)), W, H);
      f.el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;
      f.el.style.opacity = Math.min(1, 2.2 - f.t * 1.4);
    }
    this.floaters = this.floaters.filter((f) => {
      if (f.t > 1.6) {
        f.el.remove();
        return false;
      }
      return true;
    });
  }

  place(L, pos, W, H) {
    const p = this.g.world.project(pos, W, H);
    L.style.display = p.vis ? '' : 'none';
    L.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
  }

  floatAt(pos, html, cls = '') {
    const e = el('div', 'floater ' + cls, html);
    this.labelLayer.appendChild(e);
    this.floaters.push({ el: e, pos: pos.clone(), t: 0 });
  }

  floatScreen(reward) {
    const e = el('div', 'bigfloat', this.rewardHTML(reward));
    this.root.appendChild(e);
    setTimeout(() => e.remove(), 1600);
  }

  toast(text) {
    const e = el('div', 'toast', text);
    this.toasts.appendChild(e);
    setTimeout(() => e.classList.add('out'), 2400);
    setTimeout(() => e.remove(), 2900);
    while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
  }

  // ---------- меню стройки ----------
  toggleDrawer(force) {
    const open = force ?? this.drawer.classList.contains('hidden');
    if (open) {
      this.g.deselect();
      this.renderDrawer();
      this.drawer.classList.remove('hidden');
    } else this.drawer.classList.add('hidden');
  }

  thumb(kind, type) {
    const k = kind + type;
    if (!this.thumbs[k]) this.thumbs[k] = this.g.world.thumbnail(kind, type, 3);
    return this.thumbs[k];
  }

  renderDrawer() {
    const s = this.g.s;
    const d = this.drawer;
    d.innerHTML = '';
    const tabs = el('div', 'tabs');
    for (const tb of [...E.KINDS, 'decor']) {
      const b = el('button', 'tab' + (tb === this.tab ? ' on' : ''), tr('cat_' + tb));
      b.addEventListener('click', () => {
        this.tab = tb;
        audio.play('click');
        this.renderDrawer();
      });
      tabs.appendChild(b);
    }
    const x = el('button', 'tabx', IC.closeD);
    x.addEventListener('click', () => this.toggleDrawer(false));
    tabs.appendChild(x);
    d.appendChild(tabs);
    const list = el('div', 'cards');
    this.cardEls = [];
    if (this.tab === 'decor') {
      for (const type of E.DECOR_ORDER) {
        const dd = E.DECOR[type];
        const locked = dd.unlock > s.level;
        const cost = E.decorCost(type, E.decorCount(s, type));
        const c = el('div', 'card' + (locked ? ' locked' : ''));
        c.innerHTML = `<img src="${this.thumb('d', type)}" alt=""><div class="cn">${tr('d_' + type)}</div><div class="cs">${IC.cozy}+${dd.cozy}</div><div class="cc">${locked ? IC.lock + tr('locked', { n: dd.unlock }) : this.costHTML(cost)}</div>`;
        if (!locked)
          c.addEventListener('click', () => {
            audio.play('click');
            this.toggleDrawer(false);
            this.g.startPlace('d', type);
          });
        list.appendChild(c);
        this.cardEls.push({ c, cost, locked });
      }
    } else {
      for (const type of E.BUILD_ORDER) {
        const bd = E.BUILDINGS[type];
        if (bd.kind !== this.tab) continue;
        const locked = bd.unlock > s.level;
        const have = E.countType(s, type);
        const uniqueDone = bd.unique && have > 0;
        const cost = E.costOf(type, 1, have);
        const c = el('div', 'card' + (locked ? ' locked' : '') + (uniqueDone ? ' owned' : ''));
        c.dataset.type = type;
        c.innerHTML = `<img src="${this.thumb('b', type)}" alt=""><div class="cn">${tr('b_' + type)}${have && !bd.unique ? ` <small>×${have}</small>` : ''}</div><div class="cd">${tr('bd_' + type)}</div><div class="cc">${locked ? IC.lock + tr('locked', { n: bd.unlock }) : uniqueDone ? IC.check.replace('#fff', '#7cc96a') : this.costHTML(cost)}</div>`;
        if (!locked && !uniqueDone)
          c.addEventListener('click', () => {
            audio.play('click');
            this.toggleDrawer(false);
            this.g.startPlace('b', type);
          });
        list.appendChild(c);
        this.cardEls.push({ c, cost, locked: locked || uniqueDone });
      }
    }
    d.appendChild(list);
  }

  refreshDrawerAfford() {
    const s = this.g.s;
    for (const ce of this.cardEls || []) {
      if (ce.locked) continue;
      ce.c.classList.toggle('poor', !E.canAffordEx(s, ce.cost));
      ce.c.querySelectorAll('.cost').forEach((x, i) => {
        const [r, v] = Object.entries(ce.cost)[i] || [];
        if (r) x.classList.toggle('short', (s[r] || 0) < v);
      });
    }
  }

  // ---------- панель расстановки ----------
  showPlaceBar(m) {
    const s = this.g.s;
    const cost = m.moving ? null : m.kind === 'b' ? E.costOf(m.type, 1, E.countType(s, m.type)) : E.decorCost(m.type, E.decorCount(s, m.type));
    const name = m.kind === 'b' ? tr('b_' + m.type) : tr('d_' + m.type);
    const html = `<div class="pinfo"><b>${name}</b>${cost ? `<div>${this.costHTML(cost)}</div>` : ''}<small>${tr('tapCell')}</small></div>
      <button class="rb gray" data-a="cancel">${IC.close}</button>
      <button class="rb blue" data-a="rot">${IC.rotate}</button>
      <button class="rb green ${m.ok ? '' : 'dis'}" data-a="ok">${IC.check}</button>`;
    if (this.placeBar._h !== html) {
      this.placeBar.innerHTML = html;
      this.placeBar._h = html;
      this.placeBar.querySelectorAll('button').forEach((b) =>
        b.addEventListener('click', () => {
          const a = b.dataset.a;
          if (a === 'cancel') this.g.cancelPlace();
          else if (a === 'rot') this.g.rotatePlace();
          else this.g.confirmPlace();
        })
      );
    }
    this.placeBar.classList.remove('hidden');
    this.buildBtn.parentElement.classList.add('hidden');
    this.goalEl.classList.add('hidden');
  }

  hidePlaceBar() {
    this.placeBar.classList.add('hidden');
    this.placeBar._h = null;
    this.buildBtn.parentElement.classList.remove('hidden');
  }

  // ---------- карточка объекта ----------
  showSheet(o) {
    this.sheetObj = o;
    this.drawer.classList.add('hidden');
    this.renderSheet();
    this.sheet.classList.remove('hidden');
  }

  hideSheet() {
    this.sheetObj = null;
    this.sheet.classList.add('hidden');
  }

  renderSheet() {
    const g = this.g;
    const s = g.s;
    const o = this.sheetObj;
    if (!o) return;
    const isB = o.id !== undefined;
    const now = Date.now();
    let html = '';
    if (isB) {
      const d = E.BUILDINGS[o.type];
      const building = o.build && o.build > now;
      const L = E.effLvl(o);
      html += `<div class="sh-h"><img src="${g.world.thumbnail('b', o.type, Math.max(1, Math.min(10, o.lvl)))}"><div><b>${tr('b_' + o.type)}</b><span class="lv">${tr('lvl')} ${building ? L + ' → ' + o.lvl : o.lvl}</span><small>${tr('bd_' + o.type)}</small></div><button class="x">${IC.closeD}</button></div>`;
      html += `<div class="sh-stats">${this.statsHTML(o.type, Math.max(1, L), building ? null : Math.min(E.MAX_LVL, o.lvl + 1))}</div>`;
      if (building) {
        const c = g.speedCost(o);
        html += `<div class="sh-b"><div class="bt">${IC.hammer}<span class="live-t">${fmtTime((o.build - now) / 1000)}</span></div>
          <button class="btn yellow" data-a="ad">${IC.ad}${tr('speedAd')}</button>
          <button class="btn blue" data-a="cr">${tr('speedCr', { n: '' })}${IC.crystals}<span class="live-c">${c}</span></button></div>`;
      } else if (o.lvl >= E.MAX_LVL) {
        html += `<div class="sh-b"><div class="max">${IC.star}${tr('maxLevel')}</div><button class="btn gray sm" data-a="move">${IC.move}</button></div>`;
      } else {
        const cost = E.costOf(o.type, o.lvl + 1);
        html += `<div class="sh-b"><button class="btn green wide" data-a="up">${IC.up}<span>${tr('upgrade')}</span><span class="cl">${this.costHTML(cost)}</span><small>${IC.clock}${fmtTime(E.buildTime(o.lvl + 1, s))}</small></button>
          <button class="btn gray sm" data-a="move">${IC.move}</button></div>`;
      }
    } else {
      const d = E.DECOR[o.type];
      html += `<div class="sh-h"><img src="${this.thumb('d', o.type)}"><div><b>${tr('d_' + o.type)}</b><span class="lv">${IC.cozy} +${d.cozy}</span><small>${tr('cozyHint')}</small></div><button class="x">${IC.closeD}</button></div>`;
      html += `<div class="sh-b"><button class="btn blue" data-a="move">${IC.move}${tr('move')}</button><button class="btn red" data-a="rm">${IC.close}${tr('remove')}</button></div>`;
    }
    this.sheet.innerHTML = html;
    this.sheet.querySelector('.x').addEventListener('click', () => g.deselect());
    this.sheet.querySelectorAll('[data-a]').forEach((b) =>
      b.addEventListener('click', () => {
        audio.play('click');
        const a = b.dataset.a;
        if (a === 'up') g.upgrade(o);
        else if (a === 'ad') g.speedUp(o, 'ad');
        else if (a === 'cr') g.speedUp(o, 'cr');
        else if (a === 'move') g.startPlace(isB ? 'b' : 'd', o.type, o);
        else if (a === 'rm') g.removeDecor(o);
      })
    );
    this.sheetKey = `${o.lvl}_${o.build ? 1 : 0}`;
  }

  refreshSheetLive() {
    const o = this.sheetObj;
    const now = Date.now();
    if (`${o.lvl}_${o.build && o.build > now ? 1 : 0}` !== this.sheetKey) return this.renderSheet();
    const lt = this.sheet.querySelector('.live-t');
    if (lt && o.build) lt.textContent = fmtTime((o.build - now) / 1000);
    const lc = this.sheet.querySelector('.live-c');
    if (lc && o.build) lc.textContent = this.g.speedCost(o);
    // доступность улучшения
    const up = this.sheet.querySelector('[data-a="up"]');
    if (up) {
      const cost = E.costOf(o.type, o.lvl + 1);
      up.classList.toggle('poor', !E.canAffordEx(this.g.s, cost));
      up.querySelectorAll('.cost').forEach((x, i) => {
        const [r, v] = Object.entries(cost)[i] || [];
        if (r) x.classList.toggle('short', (this.g.s[r] || 0) < v);
      });
    }
  }

  statsHTML(type, L, N) {
    const d = E.BUILDINGS[type];
    const s = this.g.s;
    const mult = E.globalMult(s);
    const row = (icon, label, a, b) => `<div class="st">${IC[icon] || ''}<span>${label}</span><b>${a}${b !== undefined && b !== null ? ` <em>→ ${b}</em>` : ''}</b></div>`;
    let h = '';
    if (d.out)
      for (const k in d.out) {
        const v = (lv) => fmtRate(d.out[k] * E.prodMult(lv) * (k === 'crystals' ? 1 : mult) * (k === 'crystals' ? 3600 : 1)) + (k === 'crystals' ? '/' + tr('hours') : tr('perSec'));
        h += row(k, tr(k), v(L), N ? v(N) : null);
      }
    if (d.pop) h += row('pop', tr('residents'), fmt(Math.round(d.pop * E.popMult(L))), N ? fmt(Math.round(d.pop * E.popMult(N))) : null);
    if (d.work) h += row('builder', tr('workers'), E.workNeed(d, L), N ? E.workNeed(d, N) : null);
    if (d.trade) h += row('coins', tr('sells'), fmtRate(d.trade * E.prodMult(L)) + tr('perSec'), N ? fmtRate(d.trade * E.prodMult(N)) + tr('perSec') : null);
    if (d.bonus) {
      const f = { income: (l) => '+' + l * 8 + '%', offline: (l) => 2 + l + tr('hours'), cozy: (l) => '+' + l * 8 + '%', all: (l) => '+' + l * 15 + '%' }[d.bonus];
      h += row('star', tr('bonus'), f(L), N ? f(N) : null);
    }
    if (d.cozy) h += row('cozy', tr('cozy'), '+' + d.cozy * L, N ? '+' + d.cozy * N : null);
    return h;
  }

  // ---------- модальные окна ----------
  modal(html, { closable = true, cls = '' } = {}) {
    this.modalWrap.innerHTML = '';
    const m = el('div', 'modal ' + cls, html);
    if (closable) {
      const x = el('button', 'mx', IC.closeD);
      x.addEventListener('click', () => this.closeModal());
      m.appendChild(x);
    }
    this.modalWrap.appendChild(m);
    this.modalWrap.classList.remove('hidden');
    this.modalOpen = true;
    this.modalClosable = closable;
    return m;
  }

  closeModal() {
    this.modalWrap.classList.add('hidden');
    this.modalWrap.innerHTML = '';
    this.modalOpen = false;
    if (this.onModalClose) {
      const f = this.onModalClose;
      this.onModalClose = null;
      f();
    }
    if (this.g.pendingStreak) {
      this.g.pendingStreak = false;
      setTimeout(() => this.streakModal(), 300);
    }
  }

  on(m, sel, fn) {
    const e = m.querySelector(sel);
    if (e)
      e.addEventListener('click', () => {
        audio.play('click');
        fn();
      });
  }

  offlineModal(sec, gain) {
    const items = Object.entries(gain).filter(([, v]) => v >= 1);
    if (!items.length) return;
    const m = this.modal(
      `<h2>${tr('offlineTitle')}</h2><p>${tr('offlineDesc', { t: fmtTime(sec) })}</p><div class="rewards">${items.map(([k, v]) => `<div class="rw">${IC[k]}<b>+${fmt(v)}</b></div>`).join('')}</div>
      <div class="mb"><button class="btn green" data-a="take">${tr('take')}</button><button class="btn yellow" data-a="x2">${IC.ad}${tr('takeX2')}</button></div>`,
      { closable: false }
    );
    const give = (k) => {
      for (const [r, v] of items) this.g.s[r] += v * k;
      audio.play('coin');
      this.closeModal();
    };
    this.on(m, '[data-a="take"]', () => give(1));
    this.on(m, '[data-a="x2"]', () => this.g.rewarded(() => give(2)));
  }

  chestModal(reward) {
    const m = this.modal(
      `<div class="bigicon">${IC.gift}</div><h2>${tr('chestTitle')}</h2><div class="rewards">${this.rewardHTML(reward)}</div>
      <div class="mb"><button class="btn green" data-a="take">${tr('take')}</button><button class="btn yellow" data-a="x3">${IC.ad}${tr('chestX3')}</button></div>`,
      { closable: false }
    );
    audio.play('chest');
    this.on(m, '[data-a="take"]', () => {
      this.g.give(reward);
      this.closeModal();
    });
    this.on(m, '[data-a="x3"]', () =>
      this.g.rewarded(() => {
        this.g.give(reward, 3);
        this.floatScreen(Object.fromEntries(Object.entries(reward).map(([k, v]) => [k, v * 3])));
        this.closeModal();
      })
    );
  }

  levelModal(L, unlocked, biomes, reward) {
    const items = unlocked.map((u) => `<div class="un"><img src="${this.thumb(u.kind, u.type)}"><span>${u.kind === 'b' ? tr('b_' + u.type) : tr('d_' + u.type)}</span></div>`).join('');
    const bi = biomes.map((b) => `<div class="un biome">${IC.plot}<span>${tr('biome_' + b)}</span></div>`).join('');
    const m = this.modal(
      `<div class="lvbig">${L}</div><h2>${tr('levelUp')}</h2>${items || bi ? `<h3>${tr('unlocks')}</h3><div class="unl">${bi}${items}</div>` : ''}<h3>${tr('reward')}</h3><div class="rewards">${this.rewardHTML(reward)}</div><div class="mb"><button class="btn green" data-a="ok">${tr('ok')}</button></div>`,
      { closable: false, cls: 'celebrate' }
    );
    this.onModalClose = () => this.g.afterLevelModal();
    this.on(m, '[data-a="ok"]', () => this.closeModal());
    if (!this.drawer.classList.contains('hidden')) this.renderDrawer();
  }

  plotModal(gp) {
    const g = this.g;
    if (gp.locked) {
      this.toast(tr('plotLocked', { b: tr('biome_' + gp.biome), n: E.BIOMES[gp.biome].unlock }));
      return;
    }
    const cost = E.plotCost(g.s.plots.length);
    const m = this.modal(`<div class="bigicon">${IC.plot}</div><h2>${tr('buyPlot')}</h2><p>${tr('biome_' + gp.biome)}</p><div class="mb"><button class="btn green" data-a="buy">${this.costHTML(cost)}</button></div>`);
    this.on(m, '[data-a="buy"]', () => g.buyPlot(gp));
  }

  streakModal() {
    const g = this.g;
    const s = g.s;
    if (s.streak.claimed) return;
    const day = s.streak.day;
    const cells = STREAK.map((r, i) => {
      const rw = g.streakReward(i + 1);
      return `<div class="sd ${i + 1 < day ? 'past' : i + 1 === day ? 'now' : ''}"><small>${tr('streakDay', { n: i + 1 })}</small>${this.rewardHTML(rw)}</div>`;
    }).join('');
    const m = this.modal(`<h2>${tr('streakTitle')}</h2><div class="streak">${cells}</div><div class="mb"><button class="btn green" data-a="take">${tr('take')}</button></div>`, { closable: false });
    this.on(m, '[data-a="take"]', () => {
      const rw = g.streakReward(day);
      g.give(rw);
      s.streak.claimed = true;
      this.floatScreen(rw);
      this.closeModal();
      g.save(true);
    });
  }

  tasksModal() {
    const g = this.g;
    const s = g.s;
    const goal = GOALS[s.goal];
    let html = `<h2>${tr('tasks')}</h2>`;
    if (goal) {
      const p = goalProgress(s, goal);
      html += `<h3>${tr('goals')}</h3>${this.taskRow(this.goalText(goal), p, goal.n, goal.reward, 'goal')}`;
    }
    html += `<h3>${tr('daily')}</h3>`;
    s.daily.tasks.forEach((tk, i) => {
      const txt = tk.type === 'earn' ? tr('t_earn', { n: fmt(tk.n) }) : tk.type === 'build' ? tr('t_build', { b: '…' }).replace(': …', '') + ' ×' + tk.n : tr('t_' + tk.type, { n: tk.n });
      html += this.taskRow(txt, dailyProgress(s, tk), tk.n, tk.reward, i, tk.claimed);
    });
    const m = this.modal(html);
    m.querySelectorAll('[data-claim]').forEach((b) =>
      b.addEventListener('click', () => {
        const k = b.dataset.claim;
        if (k === 'goal') g.claimGoal();
        else g.claimDaily(+k);
        this.tasksModal();
      })
    );
  }

  taskRow(text, p, n, reward, id, claimed = false) {
    const done = p >= n;
    return `<div class="task ${claimed ? 'claimed' : ''}"><div class="tt">${text}<div class="pb"><i style="width:${(Math.min(p, n) / n) * 100}%"></i></div></div><div class="tr">${this.rewardHTML(reward)}${claimed ? `<span class="ok">${IC.check.replace('#fff', '#7cc96a')}</span>` : `<button class="btn ${done ? 'green' : 'gray dis'} sm" ${done ? `data-claim="${id}"` : ''}>${done ? tr('claim') : `${Math.min(p, n)}/${n}`}</button>`}</div></div>`;
  }

  buildersModal() {
    const s = this.g.s;
    const c = E.builderCost(s.builders);
    const m = this.modal(
      `<div class="bigicon">${IC.builder}</div><h2>${tr('builders')}: ${s.builders}</h2>${s.builders < 5 ? `<div class="mb"><button class="btn blue" data-a="buy">${tr('buyBuilder')} <span class="cost">${IC.crystals}${c}</span></button></div>` : ''}`
    );
    this.on(m, '[data-a="buy"]', () => this.g.buyBuilder());
  }

  crystalModal() {
    const n = 5;
    const shop = iap.available() ? `<h3>${tr('treasury')}</h3><div class="iap-box">${iap.items().map((x) => itemHTML(x, { owned: tr('iapOwned') })).join('')}</div>` : '';
    const m = this.modal(`<div class="bigicon">${IC.crystals}</div><h2>${tr('shop')}</h2><p>${tr('freeCrystals', { n })}</p><div class="mb"><button class="btn yellow" data-a="ad">${IC.ad}${tr('watchAd')}</button></div>${shop}`);
    m.querySelectorAll('.iap-buy[data-id]').forEach((b) =>
      b.addEventListener('click', async () => {
        audio.play('click');
        m.querySelectorAll('.iap-buy').forEach((x) => (x.disabled = true));
        await this.g.buyIap(b.dataset.id);
        if (this.modalOpen) this.crystalModal();
      })
    );
    this.on(m, '[data-a="ad"]', () =>
      this.g.rewarded(() => {
        this.g.give({ crystals: n });
        this.floatScreen({ crystals: n });
        this.closeModal();
      })
    );
  }

  islandModal() {
    const g = this.g;
    const s = g.s;
    const gain = E.featherGain(s);
    const m = this.modal(
      `<div class="lvbig">${s.level}</div><h2>${tr('level')}</h2>
      <div class="rewards"><div class="rw">${IC.star}<b>${fmt(Math.floor(s.best))}</b><small>${tr('value')}</small></div><div class="rw">${IC.feather}<b>${s.feathers}</b><small>${tr('feathers')}</small></div></div>
      <h3>${tr('migrate')}</h3><p class="small">${tr('migrateDesc')}</p>
      ${gain >= 1 ? `<p><b>${tr('migrateGain', { n: gain })}</b> ${IC.feather}</p><div class="mb"><button class="btn purple" data-a="mig">${IC.feather}${tr('migrateBtn')}</button></div>` : `<p class="small muted">${tr('migrateNotYet')}</p>`}`
    );
    this.on(m, '[data-a="mig"]', () => g.migrate());
  }

  settingsModal() {
    const g = this.g;
    const st = g.s.settings;
    const row = (k, label, val) => `<button class="srow" data-k="${k}"><span>${label}</span><b>${val}</b></button>`;
    const m = this.modal(`<h2>${tr('settings')}</h2>${slidersHTML(st, { music: tr('music'), sound: tr('sound') }, VOL_IC)}${row('quality', tr('quality'), tr('q_' + st.quality))}`);
    bindSliders(m, st, () => g.save());
    m.querySelectorAll('[data-k="quality"]').forEach((b) =>
      b.addEventListener('click', () => {
        const order = ['auto', 'high', 'mid', 'low'];
        st.quality = order[(order.indexOf(st.quality) + 1) % 4];
        this.toast(tr('quality') + ': ' + tr('q_' + st.quality) + ' — ↻');
        audio.play('click');
        g.save();
        this.settingsModal();
      })
    );
  }


  async lbModal() {
    const m = this.modal(`<h2>${tr('leaderboard')}</h2><div class="lb">${tr('loading')}</div>`);
    const res = await sdk.getLeaderboard();
    const box = m.querySelector('.lb');
    if (!box) return;
    let rows = res.entries;
    if (!res.available) {
      const best = Math.floor(this.g.s.best);
      rows = best > 0 ? [{ rank: 1, name: tr('you'), score: best, me: true }] : [];
      if (!rows.length) {
        box.textContent = res.local ? tr('lbEmpty') : tr('lbUnavailable');
        return;
      }
    }
    box.innerHTML = rows.length
      ? rows.map((r) => `<div class="lbr ${r.me ? 'me' : ''}"><span>#${r.rank}</span><span class="nm">${(r.name || tr('player')).slice(0, 18)}</span><b>${fmt(r.score)}</b></div>`).join('')
      : tr('lbEmpty');
    if (res.available && !res.authorized) {
      const b = el('button', 'btn yellow', tr('lbLoginBtn'));
      b.addEventListener('click', async () => {
        if (await sdk.login()) {
          await sdk.submitScore(Math.floor(this.g.s.best));
          this.lbModal();
        }
      });
      const p = el('p', 'small', tr('lbLogin'));
      box.append(p, b);
    }
  }
}
