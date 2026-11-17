// DOM-интерфейс: главный экран, выбор режима, таблички игроков, итоги кона и партии, магазин, настройки
import { IC } from './icons.js';
import { t, fmt, LANG } from './i18n.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { iap, itemHTML } from './iap.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import { TILE_SETS, TABLES, PLACES, AD_COINS, AD_COOLDOWN, DAILY, TARGETS, HINT_ROUNDS } from './data.js';
import { avatarSVG } from './avatars.js';
import { PIPS } from './tiles.js';
import * as TX from './textures.js';
import { TILES, handPips, team } from './rules.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const today = () => new Date().toISOString().slice(0, 10);
const DIFF = ['easy', 'mid', 'hard'];

// маленькая кость в SVG (для окон итогов и магазина)
export function tileSVG(a, b, set, { w = 26, horiz = false, back = false } = {}) {
  const s = set || TILE_SETS[0];
  const W = 40,
    H = 80;
  let body = `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="7" fill="${back ? '#e9dfcc' : s.body}" stroke="#3b2b20" stroke-width="3"/>`;
  if (!back) {
    body += `<path d="M7 ${H / 2}h${W - 14}" stroke="${s.line}" stroke-width="2.4"/>`;
    const half = (v, oy, flip) => {
      let out = '';
      const col = s.pips ? s.pips[v] : s.pip;
      for (const [px, py] of PIPS[v]) {
        const x = W / 2 + (flip ? -px : px) * 10.5,
          y = oy + (flip ? -py : py) * 10.5;
        out += `<circle cx="${x}" cy="${y}" r="3.6" fill="${col}"/>`;
      }
      return out;
    };
    body += half(a, H / 4 + 1, false) + half(b, (3 * H) / 4 - 1, true);
    if (s.pin && s.pin !== 'none') body += `<circle cx="${W / 2}" cy="${H / 2}" r="2.6" fill="${s.pin === 'silver' ? '#cfd4da' : '#d6ad4c'}"/>`;
  }
  const vb = horiz ? `0 0 ${H} ${W}` : `0 0 ${W} ${H}`;
  const g = horiz ? `<g transform="rotate(-90) translate(-${W} 0)">${body}</g>` : body;
  const hh = horiz ? w : w * 2,
    ww = horiz ? w * 2 : w;
  return `<svg class="tsvg" width="${ww}" height="${hh}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
}

export class UI {
  constructor(game, root) {
    this.g = game;
    this.root = root;
    this.screen = '';
    this.modalOpen = false;
    const st = document.createElement('style');
    st.textContent = volumeCss({ accent: '#5b9b3c', track: '#eadcc2', thumb: '#fff8e8', muted: '#9a8670' });
    document.head.appendChild(st);
    root.innerHTML = '<div class="safe" id="scr"></div><div id="fx"></div><div id="mod"></div><div id="tst"></div>';
    this.scr = root.querySelector('#scr');
    this.fx = root.querySelector('#fx');
    this.mod = root.querySelector('#mod');
    this.tst = root.querySelector('#tst');
    root.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) {
        audio.unlock();
        audio.play('click');
      }
    });
    this._thumbs = {};
  }

  safeBottom() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--sab');
    return parseFloat(v) || 0;
  }

  // ---------- общие ----------
  coinsChip() {
    return `<button class="chip hit" data-a="shop">${IC.coin}<b id="coinsN">${fmt(save.data.coins)}</b><i class="plus">+</i></button>`;
  }
  refreshTop() {
    this.root.querySelectorAll('#coinsN').forEach((c) => (c.textContent = fmt(save.data.coins)));
  }
  bind(el, handlers) {
    el.querySelectorAll('[data-a]').forEach((b) => {
      const a = b.dataset.a;
      if (handlers[a]) b.onclick = (e) => handlers[a](b, e);
    });
  }
  toast(text, ms = 2400) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = text;
    if (this.screen === 'match') d.classList.add('low');
    this.tst.innerHTML = '';
    this.tst.appendChild(d);
    clearTimeout(this._tt);
    this._tt = setTimeout(() => d.remove(), ms);
  }
  modal({ title, body, ribbon, ribbonCls = '', wide = false, close = true, onClose, cls = '' }) {
    this.modalOpen = true;
    const wrap = document.createElement('div');
    wrap.className = 'modal ' + cls;
    wrap.innerHTML = `<div class="panel ${wide ? 'wide' : ''}">${ribbon ? `<div class="ribbon ${ribbonCls}">${esc(ribbon)}</div>` : ''}${
      title || close ? `<div class="ph"><h2>${esc(title || '')}</h2>${close ? `<button class="btn round sm" data-x="1" aria-label="close">${IC.close}</button>` : ''}</div>` : ''
    }<div class="pb">${body}</div></div>`;
    this.mod.appendChild(wrap);
    const done = () => {
      wrap.remove();
      this.modalOpen = this.mod.children.length > 0;
      onClose && onClose();
    };
    wrap.close = done;
    const x = wrap.querySelector('[data-x]');
    if (x) x.onclick = done;
    if (close) wrap.addEventListener('pointerdown', (e) => e.target === wrap && done());
    return wrap;
  }
  closeModals() {
    this.mod.innerHTML = '';
    this.modalOpen = false;
  }

  // ---------- главный экран ----------
  modeLine(c = save.data.last) {
    const mode = c.mode === 'goat' ? t('goat') : t('classic') + ' · ' + t('nPlayers', { n: c.n });
    return `${mode} · ${t(DIFF[c.diff] + 'S')} · ${t('toN', { n: c.target })}`;
  }
  home() {
    this.screen = 'home';
    this.fx.innerHTML = '';
    const d = save.data;
    const daily = d.daily.day !== today();
    const cur = d.cur;
    this.scr.innerHTML = `
      <div class="top"><div class="tl">${this.coinsChip()}</div></div>
      <div class="rcol"><button class="btn round hit" data-a="settings" aria-label="settings">${IC.gear}</button><button class="btn round hit" data-a="lb" aria-label="records">${IC.trophy}</button><button class="btn round hit" data-a="rules" aria-label="rules">${IC.book}</button>${daily ? `<button class="btn round hit pulse" data-a="daily" aria-label="gift">${IC.gift}</button>` : ''}</div>
      <div class="logo"><b>${esc(t('title'))}</b><i>${esc(t('subtitle'))}</i></div>
      <div class="bottom">
        <div class="side"><button class="btn round hit" data-a="mode">${IC.people}</button><span>${esc(t('mode'))}</span></div>
        <div class="col mid-col">
          ${cur ? `<button class="btn big green hit pulse" data-a="cont"><span class="bl">${esc(t('continue'))}<small>${esc(this.modeLine(cur.m))}</small></span></button>` : `<button class="btn big hit pulse" data-a="play"><span class="bl">${esc(t('play'))}<small>${esc(this.modeLine())}</small></span></button>`}
          ${cur ? `<button class="btn mid sand hit" data-a="newGame">${esc(t('newGame'))}</button>` : ''}
        </div>
        <div class="side"><button class="btn round hit" data-a="shop2">${IC.shop}</button><span>${esc(t('shop'))}</span></div>
      </div>`;
    this.bind(this.scr, {
      shop: () => this.shop('coins'),
      shop2: () => this.shop('tiles'),
      play: () => this.g.newMatch(save.data.last),
      cont: () => this.g.continueMatch(),
      newGame: () => this.setup(),
      mode: () => this.setup(),
      settings: () => this.settings(),
      lb: () => this.leaderboard(),
      rules: () => this.rules(),
      daily: () => this.daily(),
    });
    this.refreshTop();
  }

  boardMargins(hm) {
    const W = window.innerWidth,
      H = window.innerHeight;
    if (!hm) {
      // главный экран: стол между логотипом и кнопками
      const top = Math.min(H * 0.3, 210);
      return { t: top, b: Math.min(H * 0.24, 150), l: 20, r: 20 };
    }
    const M = this.g.M;
    const n = M ? M.m.n : 2;
    const portrait = W < H * 0.9;
    const side = n === 4 && !portrait ? Math.min(150, W * 0.13) : 14;
    const top = (portrait ? 108 : 100) + (n >= 3 && W < 560 ? 14 : 0);
    return { t: top, b: hm.h + 66, l: side, r: side };
  }

  // ---------- выбор режима ----------
  setup() {
    const c = { ...save.data.last };
    const render = () => {
      const seg = (key, vals, label) =>
        `<div class="setrow"><span>${esc(label)}</span><div class="seg">${vals.map(([v, txt]) => `<button class="${c[key] === v ? 'on' : ''}" data-k="${key}" data-v="${v}">${txt}</button>`).join('')}</div></div>`;
      return `<div class="modes">
          <button class="mcard ${c.mode === 'goat' ? 'on' : ''}" data-m="goat"><div class="mpic">${goatPic()}</div><b>${esc(t('goat'))}</b><small>${esc(t('goatD'))}</small></button>
          <button class="mcard ${c.mode === 'classic' ? 'on' : ''}" data-m="classic"><div class="mpic">${classicPic()}</div><b>${esc(t('classic'))}</b><small>${esc(t('classicD'))}</small></button>
        </div>
        ${c.mode === 'classic' ? seg('n', [[2, '2'], [3, '3'], [4, '4']], t('players')) : ''}
        ${seg('diff', [[0, esc(t('easy'))], [1, esc(t('mid'))], [2, esc(t('hard'))]], t('rivals'))}
        ${seg('target', TARGETS.map((v) => [v, esc(t('toN', { n: v }))]), t('length'))}
        <div class="row" style="margin-top:12px"><button class="btn big" data-a="go"><span class="bl">${esc(t('play'))}</span></button></div>`;
    };
    const m = this.modal({ title: t('modeT'), body: render(), wide: true });
    const pb = m.querySelector('.pb');
    const wire = () => {
      pb.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => {
        c.mode = b.dataset.m;
        audio.play('select');
        pb.innerHTML = render();
        wire();
      }));
      pb.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => {
        c[b.dataset.k] = +b.dataset.v;
        pb.innerHTML = render();
        wire();
      }));
      const go = pb.querySelector('[data-a="go"]');
      go.onclick = () => {
        m.close();
        if (save.data.cur) save.data.cur = null;
        this.g.newMatch(c);
      };
    };
    wire();
  }

  // ---------- партия: таблички, кнопки ----------
  seatPos(p) {
    const M = this.g.M;
    const n = M.m.n;
    const W = window.innerWidth,
      H = window.innerHeight;
    const portrait = W < H * 0.9;
    if (p === 0) return { x: W / 2, y: H - 40, cls: 'me' };
    const topY = 10;
    if (n === 2) return { x: W / 2, y: topY, cls: 'ptop' };
    if (n === 3) return { x: p === 1 ? W * 0.28 : W * 0.72, y: topY, cls: 'ptop' };
    if (portrait) return { x: [0, W * 0.18, W * 0.5, W * 0.82][p], y: topY, cls: 'ptop' };
    if (p === 2) return { x: W / 2, y: topY, cls: 'ptop' };
    return { x: p === 1 ? 12 : W - 12, y: H * 0.3, cls: p === 1 ? 'left' : 'right' };
  }
  // центр аватара на экране (для анимаций)
  seatScreen(p) {
    const el = this.scr.querySelector(`.plate[data-p="${p}"] .av`);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    const s = this.seatPos(p);
    return { x: s.x, y: s.y + 30 };
  }
  boneScreen() {
    const el = this.scr.querySelector('[data-a="bone"]');
    if (el && el.offsetWidth) {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: window.innerWidth - 60, y: window.innerHeight - 120 };
  }

  matchHUD() {
    this.screen = 'match';
    this.closeModals();
    const M = this.g.M;
    const n = M.m.n;
    let plates = '';
    for (let p = 1; p < n; p++) plates += `<div class="plate" data-p="${p}"></div>`;
    this.scr.innerHTML = `${plates}
      <div class="hudbar">
        <button class="btn round sm hit" data-a="menu" aria-label="menu">${IC.menu}</button>
        <div class="meplate" data-p="0"></div>
        <div class="hb-r">
          ${M.m.mode === 'classic' ? `<button class="bonebtn hit" data-a="bone">${IC.bone}<b id="boneN">0</b></button>` : ''}
          <button class="btn round sm hit" data-a="score" aria-label="score">${IC.note}</button>
        </div>
      </div>
      <div class="turnban" id="turnban"></div>
      <div id="marks"></div>`;
    this.bind(this.scr, {
      menu: () => this.pauseMenu(),
      score: () => this.scoreSheet(),
      bone: () => this.g.humanDraw(),
    });
    this.updatePlates();
  }

  plateHTML(p) {
    const M = this.g.M;
    const pl = M.players[p];
    const r = M.r;
    const cnt = r ? r.hands[p].length : 7;
    const goat = M.m.mode === 'goat';
    const mate = goat && p === 2;
    const sc = goat ? '' : `<span class="psc">${fmt(M.m.scores[p])}</span>`;
    const backs = Array.from({ length: Math.min(cnt, 14) }, () => '<i></i>').join('');
    return `<div class="av ${goat ? (team(p) === 0 ? 'tmA' : 'tmB') : ''}">${avatarSVG(pl.av, pl.g)}</div>
      <div class="pinfo"><b>${esc(pl.name)}</b>${mate ? `<span class="tag">${esc(t('partner'))}</span>` : ''}<div class="backs">${backs}<em>${cnt}</em></div></div>${sc}`;
  }

  updatePlates() {
    const M = this.g.M;
    if (!M || this.screen !== 'match') return;
    const r = M.r;
    for (let p = 1; p < M.m.n; p++) {
      const el = this.scr.querySelector(`.plate[data-p="${p}"]`);
      if (!el) continue;
      const pos = this.seatPos(p);
      el.className = 'plate ' + pos.cls + (r && r.turn === p && !r.over ? ' active' : '') + (M.m.n >= 3 && window.innerWidth < 560 ? ' tight' : '');
      if (pos.cls === 'ptop') {
        el.style.left = pos.x + 'px';
        el.style.top = `calc(${pos.y}px + env(safe-area-inset-top))`;
        el.style.right = '';
      } else if (pos.cls === 'left') {
        el.style.left = pos.x + 'px';
        el.style.top = pos.y + 'px';
      } else {
        el.style.left = '';
        el.style.right = '12px';
        el.style.top = pos.y + 'px';
      }
      const key = JSON.stringify([r ? r.hands[p].length : 7, M.m.scores, r && r.turn === p]);
      if (el.dataset.key !== key) {
        el.dataset.key = key;
        el.innerHTML = this.plateHTML(p);
      }
    }
    // моя табличка: очки / счёт пары
    const me = this.scr.querySelector('.meplate');
    if (me) {
      const goat = M.m.mode === 'goat';
      const sc = M.m.scores;
      me.classList.toggle('active', !!(r && r.turn === 0 && !r.over));
      me.innerHTML = goat
        ? `<span class="tA">${esc(t('us'))} <b>${sc[0]}</b></span><span class="sep">:</span><span class="tB"><b>${sc[1]}</b> ${esc(t('them'))}</span><span class="lim">${esc(t('toN', { n: M.m.target }))}</span>`
        : `<span class="tA">${esc(t('you'))} <b>${sc[0]}</b></span><span class="lim">${esc(t('toN', { n: M.m.target }))}</span>`;
    }
    const bn = this.scr.querySelector('#boneN');
    if (bn && r) bn.textContent = r.bone.length;
    const bb = this.scr.querySelector('[data-a="bone"]');
    if (bb && r) bb.classList.toggle('empty', !r.bone.length);
  }

  myTurn(on) {
    const b = this.scr.querySelector('#turnban');
    if (!b) return;
    if (on) {
      b.textContent = t('yourTurn');
      b.className = 'turnban on';
    } else b.className = 'turnban';
    this.updatePlates();
  }
  needDraw(on) {
    const bb = this.scr.querySelector('[data-a="bone"]');
    if (bb) bb.classList.toggle('pulse', on);
    const b = this.scr.querySelector('#turnban');
    if (b) {
      if (on) {
        b.textContent = t('needDraw');
        b.className = 'turnban on warn';
      } else if (b.classList.contains('warn')) b.className = 'turnban';
    }
    this.updatePlates();
  }

  // маркеры выбора стороны
  markers(list) {
    const el = this.scr.querySelector('#marks');
    if (!el) return;
    el.innerHTML = list.map((m) => `<button class="mark hit" data-side="${m.side}" aria-label="${m.side}">${IC.down}</button>`).join('');
    el.querySelectorAll('.mark').forEach((b) => (b.onclick = (e) => {
      e.stopPropagation();
      this.g.chooseSide(b.dataset.side);
    }));
    if (list.length && !save.data.seen.choice) {
      save.data.seen.choice = 1;
      save.write(false);
      this.tip(t('tipChoice'), 4200);
    }
  }
  frame() {
    const el = this.scr.querySelector('#marks');
    if (el && el.children.length) {
      const pos = this.g.markerScreens();
      [...el.children].forEach((b, i) => {
        const p = pos[i];
        if (!p) return;
        b.style.left = p.x + 'px';
        b.style.top = p.y + 'px';
      });
    }
  }

  tip(text, ms = 3600) {
    const d = document.createElement('div');
    d.className = 'tip';
    d.textContent = text;
    this.fx.appendChild(d);
    setTimeout(() => d.remove(), ms);
  }

  roundStartTip() {
    const M = this.g.M;
    if (!save.data.seen.first) {
      save.data.seen.first = 1;
      save.write(false);
      this.tip(M.m.mode === 'goat' ? t('tipGoat') : t('tipClassic'), 5200);
    } else if (!save.data.seen.nohint && (save.data.settings.hints || 'auto') === 'auto' && save.data.stats.rounds >= HINT_ROUNDS) {
      // подсказки только что выключились сами — один раз объясняем
      save.data.seen.nohint = 1;
      save.write(false);
      this.tip(t('tipNoHints'), 6000);
    }
  }

  bubble(p, text) {
    const s = p === 0 ? { x: window.innerWidth / 2, y: window.innerHeight - this.g.handMetrics().h - 80 } : this.seatScreen(p);
    const d = document.createElement('div');
    d.className = 'say' + (p === 0 ? ' me' : '');
    d.textContent = text;
    const pos = p === 0 ? null : this.seatPos(p);
    d.style.left = Math.max(70, Math.min(window.innerWidth - 70, s.x + (pos && pos.cls === 'left' ? 60 : pos && pos.cls === 'right' ? -60 : 0))) + 'px';
    d.style.top = s.y + (p === 0 ? 0 : 44) + 'px';
    this.fx.appendChild(d);
    setTimeout(() => d.remove(), 1700);
  }

  stamp(text, cls) {
    const d = document.createElement('div');
    d.className = 'stamp ' + (cls || '');
    d.innerHTML = `<span>${esc(text)}</span>`;
    this.fx.appendChild(d);
    setTimeout(() => d.remove(), 1900);
  }

  // ---------- итоги кона ----------
  roundModal(res, r, coins, next) {
    const M = this.g.M;
    const m = M.m;
    const goat = m.mode === 'goat';
    const set = TILE_SETS.find((s) => s.id === save.data.skin);
    let title, cls;
    const myWin = goat ? res.win === 0 : res.win === 0;
    if (res.win === -1) {
      title = t('draw');
      cls = 'sea';
    } else if (myWin) {
      title = res.fish ? t('fishWin') : t('roundWin');
      cls = 'green';
    } else {
      title = res.fish ? t('fishLose') : t('roundLose');
      cls = '';
    }
    const rows = M.players
      .map((pl, p) => {
        const h = r.hands[p];
        const tiles = h.map((id) => tileSVG(TILES[id][0], TILES[id][1], set, { w: 15 })).join('');
        return `<div class="rrow ${goat ? (team(p) === 0 ? 'tA' : 'tB') : ''}"><div class="av sm">${avatarSVG(pl.av || 77, pl.g, pl.me)}</div><b class="nm">${esc(pl.name)}</b><div class="rt">${tiles || `<span class="out">${esc(t('empty'))}</span>`}</div><span class="pp">${handPips(h)}</span></div>`;
      })
      .join('');
    let line;
    if (goat) {
      line = res.loser >= 0 ? t('goatAdd', { n: res.points, who: res.loser === 0 ? t('us') : t('them') }) : t('noPoints');
    } else {
      line = res.win >= 0 ? t('classicAdd', { n: res.points, who: M.players[res.win].name }) : t('noPoints');
    }
    const body = `<div class="rlist">${rows}</div><p class="center rline">${esc(line)}</p>${this.sheetHTML(true)}
      ${coins ? `<div class="res"><div>${IC.coin}<b>+${coins}</b></div></div>` : ''}
      <div class="row"><button class="btn big ${m.done ? 'green' : ''}" data-a="next"><span class="bl">${esc(m.done ? t('results') : t('nextRound'))}</span></button></div>`;
    const md = this.modal({ ribbon: title, ribbonCls: cls, body, close: false, wide: true, cls: 'roundm' });
    this.refreshTop();
    md.querySelector('[data-a="next"]').onclick = () => {
      md.close();
      next();
    };
    if (window.__DD_DEBUG && window.__DD_DEBUG.bot) setTimeout(() => md.isConnected && md.querySelector('[data-a="next"]').click(), 400);
  }

  // блокнот со счётом (рукописный)
  sheetHTML(compact = false) {
    const M = this.g.M;
    const m = M.m;
    const goat = m.mode === 'goat';
    const heads = goat ? [t('us'), t('them')] : M.players.map((p) => p.name.split(' ')[0]);
    const rows = m.rounds.slice(compact ? -4 : 0);
    const off = compact ? Math.max(0, m.rounds.length - 4) : 0;
    const body = rows
      .map((rd, i) => `<tr><td class="k">${off + i + 1}${rd.fish ? ' 🐟' : ''}</td>${rd.s.map((v, j) => `<td class="${rd.add[j] ? 'up' : ''}">${v}</td>`).join('')}</tr>`)
      .join('');
    return `<div class="sheet"><table><tr><th></th>${heads.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${body || `<tr><td></td>${heads.map(() => '<td>0</td>').join('')}</tr>`}</table><div class="lim">${esc(goat ? t('goatLimit', { n: m.target }) : t('classicLimit', { n: m.target }))}</div></div>`;
  }
  scoreSheet() {
    this.g.setPause(true);
    this.modal({ title: t('scoreT'), body: this.sheetHTML(false), onClose: () => this.g.setPause(false) });
  }

  // ---------- итоги партии ----------
  matchModal(won, coins, rating) {
    const M = this.g.M;
    const goat = M.m.mode === 'goat';
    const title = won ? t('victory') : goat ? t('goats') : t('defeat');
    const sub = won ? (goat ? t('goatWinSub') : t('classicWinSub')) : goat ? t('goatLoseSub') : t('classicLoseSub', { n: M.players[M.m.done.win].name });
    const body = `<div class="bigpic">${won ? cupPic() : goat ? goatFace() : cupPic(true)}</div><p class="center">${esc(sub)}</p>
      <div class="res"><div>${IC.coin}<b id="mcoins">+${coins}</b></div>${rating ? `<div>${IC.trophy}<b>+${rating}</b><small>${esc(t('rating'))}</small></div>` : ''}</div>
      <div class="col">
        <button class="btn mid sea" data-a="x2">${IC.film}${esc(t('x2', { n: coins }))}</button>
        <div class="row"><button class="btn mid sand" data-a="menu">${IC.home}${esc(t('toMenu'))}</button><button class="btn big" data-a="again"><span class="bl">${esc(t('again'))}</span></button></div>
      </div>`;
    const md = this.modal({ ribbon: title, ribbonCls: won ? 'green' : '', body, close: false, cls: 'matchm' });
    this.refreshTop();
    const go = (fn) => {
      md.close();
      sdk.showInterstitial(fn);
    };
    this.bind(md, {
      x2: (b) => {
        b.disabled = true;
        this.g.doubleReward(coins, (ok) => {
          if (ok) {
            md.querySelector('#mcoins').textContent = '+' + coins * 2;
            audio.play('coin');
            b.remove();
          } else b.disabled = false;
        });
      },
      menu: () => go(() => this.g.toHome()),
      again: () => go(() => this.g.newMatch(save.data.last)),
    });
    if (window.__DD_DEBUG && window.__DD_DEBUG.bot) setTimeout(() => md.isConnected && md.querySelector('[data-a="menu"]').click(), 600);
  }

  // ---------- пауза ----------
  pauseMenu() {
    this.g.setPause(true);
    const m = this.modal({
      title: t('pause'),
      body: `<div class="col">
        <button class="btn big green" data-a="resume"><span class="bl">${esc(t('resume'))}</span></button>
        ${slidersHTML(save.data.settings, { music: t('music'), sound: t('sound') }, { music: IC.music, sound: IC.sound })}
        <div class="row"><button class="btn mid sand" data-a="rules">${IC.book}${esc(t('rules'))}</button><button class="btn mid sand" data-a="exit">${IC.home}${esc(t('toMenu'))}</button></div>
        <p class="center small">${esc(t('savedNote'))}</p></div>`,
      onClose: () => this.g.setPause(false),
    });
    bindSliders(m, save.data.settings, () => save.write());
    this.bind(m, {
      resume: () => m.close(),
      rules: () => this.rules(),
      exit: () => {
        this.closeModals();
        this.g.setPause(false);
        this.g.leaveMatch();
      },
    });
  }

  // ---------- настройки ----------
  settings() {
    const st = save.data.settings;
    const render = () => `<div class="col">${slidersHTML(st, { music: t('music'), sound: t('sound') }, { music: IC.music, sound: IC.sound })}
      <div class="setrow"><span>${esc(t('speed'))}</span><div class="seg"><button class="${!st.fast ? 'on' : ''}" data-f="0">${esc(t('normal'))}</button><button class="${st.fast ? 'on' : ''}" data-f="1">${esc(t('fast'))}</button></div></div>
      <div class="setrow"><span>${esc(t('highlight'))}</span><div class="seg">${['auto', 'on', 'off'].map((k) => `<button class="${(st.hints || 'auto') === k ? 'on' : ''}" data-h="${k}">${esc(t(k))}</button>`).join('')}</div></div>
      <div class="setnote">${esc(t('hintsNote', { n: HINT_ROUNDS }))}</div>
      <div class="stats">${esc(t('statsL', { m: save.data.stats.matches, w: save.data.stats.wins, f: save.data.stats.fish }))}</div></div>`;
    const m = this.modal({ title: t('settings'), body: render() });
    const wire = () => {
      bindSliders(m, st, () => save.write());
      m.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => {
        st.fast = b.dataset.f === '1';
        save.write();
        m.querySelector('.pb').innerHTML = render();
        wire();
      }));
      m.querySelectorAll('[data-h]').forEach((b) => (b.onclick = () => {
        st.hints = b.dataset.h;
        save.write();
        m.querySelector('.pb').innerHTML = render();
        wire();
      }));
    };
    wire();
  }

  rules() {
    this.modal({ title: t('rules'), wide: true, body: `<div class="rules">${t('rulesHTML')}</div>` });
  }

  // ---------- магазин ----------
  thumb(kind, id) {
    const key = kind + id;
    if (this._thumbs[key]) return this._thumbs[key];
    let html = '';
    if (kind === 'tiles') {
      const s = TILE_SETS.find((x) => x.id === id);
      html = `<div class="tthumb" style="background:${s.wood ? '#e9d2b0' : '#efe4cc'}">${tileSVG(6, 3, s, { w: 30 })}${tileSVG(5, 1, s, { w: 30 })}${tileSVG(2, 4, s, { w: 30 })}</div>`;
    } else if (kind === 'tables') {
      let c;
      if (id === 'oilcloth') c = TX.oilcloth().image;
      else if (id === 'felt') c = TX.felt().image;
      else if (id === 'lace') c = TX.lace(8, 6).image;
      else if (id === 'chintz') c = TX.chintz().image;
      else if (id === 'walnut') c = TX.planks('#6b3e22', { rows: 6, seed: 11, dark: 0.3, w: 256, h: 256 });
      else c = TX.planks('#c8925a', { rows: 6, seed: 4, w: 256, h: 256 });
      html = `<div class="tthumb" style="background-image:url(${c.toDataURL('image/jpeg', 0.8)})"></div>`;
    } else html = `<div class="tthumb">${placePic(id)}</div>`;
    return (this._thumbs[key] = html);
  }

  shop(tab = 'tiles') {
    const lists = { tiles: TILE_SETS, tables: TABLES, places: PLACES };
    const cur = { tiles: save.data.skin, tables: save.data.table, places: save.data.place };
    const render = () => {
      const tabs = ['tiles', 'tables', 'places', 'coins'].map((k) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${esc(t('tab_' + k))}</button>`).join('');
      let body = '';
      if (tab === 'coins') {
        const items = iap.items();
        const wait = Math.max(0, AD_COOLDOWN - (Date.now() - (save.data.freeAdAt || 0)));
        body = `<div class="iap-item free"><div class="iap-ic">${IC.film}</div><div class="iap-tx"><b>${esc(t('freeCoins', { n: AD_COINS }))}</b><small>${esc(wait ? t('adWait', { m: Math.ceil(wait / 60000) }) : t('watchAd'))}</small></div><button class="iap-buy" data-a="ad" ${wait ? 'disabled' : ''}>${IC.coin}+${AD_COINS}</button></div>`;
        body += items.length ? items.map((x) => itemHTML(x, { owned: t('owned') })).join('') : `<p class="center small">${esc(t('noStore'))}</p>`;
      } else {
        body = `<div class="sgrid">${lists[tab]
          .map((it) => {
            const own = save.data.owned[it.id];
            const on = cur[tab] === it.id;
            const btn = on
              ? `<button class="btn sm2 sand" disabled>${IC.check.replace('#fff', '#5b9b3c')}${esc(t('chosen'))}</button>`
              : own
                ? `<button class="btn sm2 sea" data-use="${it.id}">${esc(t('choose'))}</button>`
                : `<button class="btn sm2 ${save.data.coins >= it.price ? 'green' : 'sand'}" data-buy="${it.id}">${IC.coin}${fmt(it.price)}</button>`;
            return `<div class="scard ${on ? 'on' : ''}">${this.thumb(tab, it.id)}<b>${esc(t(tab.slice(0, -1) + '_' + it.id))}</b>${btn}</div>`;
          })
          .join('')}</div>`;
      }
      return `<div class="tabs">${tabs}</div><div class="shopb">${body}</div>`;
    };
    const m = this.modal({ title: t('shop'), body: render(), wide: true, cls: 'shopm' });
    const pb = m.querySelector('.pb');
    const wire = () => {
      pb.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => {
        tab = b.dataset.tab;
        pb.innerHTML = render();
        wire();
      }));
      pb.querySelectorAll('[data-use]').forEach((b) => (b.onclick = () => {
        this.useItem(tab, b.dataset.use);
        cur[tab] = b.dataset.use;
        pb.innerHTML = render();
        wire();
      }));
      pb.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => {
        const it = lists[tab].find((x) => x.id === b.dataset.buy);
        if (save.data.coins < it.price) {
          audio.play('deny');
          this.toast(t('noCoins'));
          tab = 'coins';
          pb.innerHTML = render();
          wire();
          return;
        }
        save.data.coins -= it.price;
        save.data.owned[it.id] = 1;
        audio.play('buy');
        this.useItem(tab, it.id);
        cur[tab] = it.id;
        save.flush();
        this.refreshTop();
        pb.innerHTML = render();
        wire();
      }));
      const ad = pb.querySelector('[data-a="ad"]');
      if (ad)
        ad.onclick = () => {
          ad.disabled = true;
          sdk.showRewarded(
            () => {
              save.data.coins += AD_COINS;
              save.data.freeAdAt = Date.now();
              save.write();
              audio.play('coin');
              this.refreshTop();
            },
            () => {
              pb.innerHTML = render();
              wire();
            }
          );
        };
      pb.querySelectorAll('.iap-buy[data-id]').forEach((b) => (b.onclick = async () => {
        pb.querySelectorAll('.iap-buy').forEach((e) => (e.disabled = true));
        const ok = await iap.buy(b.dataset.id);
        if (ok) {
          audio.play('buy');
          this.refreshTop();
        }
        pb.innerHTML = render();
        wire();
      }));
    };
    wire();
  }
  useItem(tab, id) {
    if (tab === 'tiles') this.g.applySkin(id);
    else if (tab === 'tables') this.g.applyTable(id);
    else this.g.applyPlace(id);
  }

  // ---------- рекорды ----------
  async leaderboard() {
    const m = this.modal({ title: t('lbT'), body: `<p class="center">…</p>` });
    const res = await sdk.getLeaderboard();
    const pb = m.querySelector('.pb');
    let html = `<p class="center small">${esc(t('lbHint', { n: fmt(save.data.rating) }))}</p>`;
    if (!res.available) html += `<p class="center">${esc(sdk.real ? t('lbEmpty') : t('lbLocal'))}</p>`;
    else {
      html += `<div class="lb">${res.entries.map((e) => `<div class="lbr ${e.me ? 'me' : ''}"><span class="rk">${e.rank}</span><span class="nm">${esc(e.name || t('anon'))}</span><b>${fmt(e.score)}</b></div>`).join('') || `<p class="center">${esc(t('lbEmpty'))}</p>`}</div>`;
      if (!res.authorized) html += `<div class="row" style="margin-top:12px"><button class="btn mid sea" data-a="login">${esc(t('lbLogin'))}</button></div>`;
    }
    pb.innerHTML = html;
    const lg = pb.querySelector('[data-a="login"]');
    if (lg)
      lg.onclick = async () => {
        if (await sdk.login()) {
          sdk.submitScore(save.data.rating);
          m.close();
          this.leaderboard();
        }
      };
  }

  // ---------- подарок дня ----------
  daily() {
    const d = save.data.daily;
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = d.day === yest ? (d.streak % DAILY.length) + 1 : 1;
    const gift = DAILY[streak - 1];
    const cells = DAILY.map((v, i) => `<div class="day ${i + 1 < streak ? 'got' : i + 1 === streak ? 'now' : ''} ${i === 6 ? 'last' : ''}"><small>${esc(t('dayN', { n: i + 1 }))}</small>${IC.coin}<b>${v}</b></div>`).join('');
    const m = this.modal({
      title: t('dailyT'),
      body: `<div class="days">${cells}</div><div class="row"><button class="btn big green" data-a="take"><span class="bl">${esc(t('take', { n: gift }))}</span></button><button class="btn mid sea" data-a="take2">${IC.film}×2</button></div>`,
    });
    const take = (mult) => {
      d.day = today();
      d.streak = streak;
      save.data.coins += gift * mult;
      save.flush();
      audio.play('gift');
      this.refreshTop();
      m.close();
      this.home();
    };
    this.bind(m, {
      take: () => take(1),
      take2: (b) => {
        b.disabled = true;
        sdk.showRewarded(
          () => take(2),
          (ok) => !ok && (b.disabled = false)
        );
      },
    });
  }
}

// ---------- картинки ----------
function goatPic() {
  return `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="14" width="80" height="52" rx="10" fill="#d9a46a" stroke="#3b2b20" stroke-width="3"/>
  ${[[60, 6, '#5aa0d8'], [60, 74, '#5aa0d8'], [10, 40, '#e8665a'], [110, 40, '#e8665a']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="7" fill="${c}" stroke="#3b2b20" stroke-width="3"/>`).join('')}
  <g transform="translate(46 30)"><rect width="12" height="22" rx="3" fill="#fff8e8" stroke="#3b2b20" stroke-width="2"/><rect x="16" width="12" height="22" rx="3" fill="#fff8e8" stroke="#3b2b20" stroke-width="2"/></g></svg>`;
}
function classicPic() {
  return `<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="14" width="80" height="52" rx="10" fill="#d9a46a" stroke="#3b2b20" stroke-width="3"/>
  ${[[60, 6], [60, 74]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="7" fill="${['#5aa0d8', '#f0b43c'][i]}" stroke="#3b2b20" stroke-width="3"/>`).join('')}
  <g transform="translate(30 26)">${[0, 1, 2].map((i) => `<rect x="${i * 8}" y="${i * 3}" width="12" height="22" rx="3" fill="#eadfcc" stroke="#3b2b20" stroke-width="2"/>`).join('')}</g>
  <g transform="translate(66 30)"><rect width="22" height="12" rx="3" fill="#fff8e8" stroke="#3b2b20" stroke-width="2"/></g></svg>`;
}
function cupPic(sad) {
  return `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg"><g opacity="${sad ? 0.55 : 1}"><path d="M38 14h44v22a22 22 0 0 1-44 0z" fill="#ffd34a" stroke="#3b2b20" stroke-width="4"/><path d="M38 20H26a12 12 0 0 0 14 16M82 20h12a12 12 0 0 1-14 16" fill="none" stroke="#3b2b20" stroke-width="4"/><path d="M60 58v14M44 88h32l-4-16H48z" fill="#e3a72a" stroke="#3b2b20" stroke-width="4"/><path d="M50 22l4 0" stroke="#fff6c0" stroke-width="4" stroke-linecap="round"/></g>${sad ? '' : '<g fill="#ff7a7a"><circle cx="20" cy="20" r="3"/><circle cx="100" cy="16" r="3"/><circle cx="104" cy="54" r="3"/><circle cx="14" cy="58" r="3"/></g>'}</svg>`;
}
function goatFace() {
  return `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg"><path d="M40 26c-8-14-22-16-28-10 8 0 16 6 22 16M80 26c8-14 22-16 28-10-8 0-16 6-22 16" fill="#e8dcc6" stroke="#3b2b20" stroke-width="4"/><ellipse cx="60" cy="50" rx="26" ry="30" fill="#fff8ec" stroke="#3b2b20" stroke-width="4"/><path d="M34 40c-10 0-16 4-18 8 8 2 14 0 20-4M86 40c10 0 16 4 18 8-8 2-14 0-20-4" fill="#fff8ec" stroke="#3b2b20" stroke-width="4"/><circle cx="50" cy="46" r="4" fill="#3b2b20"/><circle cx="70" cy="46" r="4" fill="#3b2b20"/><ellipse cx="60" cy="64" rx="10" ry="7" fill="#ffc9c9" stroke="#3b2b20" stroke-width="3"/><path d="M60 80c-2 10-6 14-10 16 6 0 10-2 10-6 0 4 4 6 10 6-4-2-8-6-10-16" fill="#e8dcc6" stroke="#3b2b20" stroke-width="3"/></svg>`;
}
function placePic(id) {
  const P = {
    summer: { sky: '#bfe3f2', g: '#67a540', sun: '#ffd34a', deco: '<circle cx="18" cy="56" r="4" fill="#ff7a8a"/><circle cx="30" cy="60" r="4" fill="#ffd34a"/><circle cx="96" cy="58" r="4" fill="#fff"/>' },
    evening: { sky: '#2a3460', g: '#3e6a34', sun: '#f6efd0', deco: '<path d="M4 18q28 14 56 0t56 0" fill="none" stroke="#222" stroke-width="1.5"/>' + [10, 24, 38, 52, 66, 80, 94, 108].map((x, i) => `<circle cx="${x}" cy="${20 + Math.sin(i) * 3}" r="3" fill="${['#ffd27a', '#ff8a6a', '#8ad0ff', '#b8ff8a'][i % 4]}"/>`).join('') },
    autumn: { sky: '#f2dcb8', g: '#9a8a3c', sun: '#ffb04a', deco: '<ellipse cx="22" cy="60" rx="7" ry="5" fill="#e57a1e"/><ellipse cx="98" cy="58" rx="6" ry="4.5" fill="#e57a1e"/><path d="M40 30l4 3M70 22l4 3M90 36l4 3" stroke="#e2741f" stroke-width="4" stroke-linecap="round"/>' },
    winter: { sky: '#c9d8ea', g: '#eef3f8', sun: '#fff4e6', deco: '<circle cx="98" cy="54" r="7" fill="#fff" stroke="#9ab" stroke-width="1"/><circle cx="98" cy="44" r="5" fill="#fff" stroke="#9ab" stroke-width="1"/>' + [12, 30, 50, 70, 88, 106].map((x, i) => `<circle cx="${x}" cy="${10 + (i % 3) * 9}" r="1.8" fill="#fff"/>`).join('') },
  }[id];
  return `<svg viewBox="0 0 120 76" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="76" fill="${P.sky}"/><circle cx="100" cy="16" r="9" fill="${P.sun}"/><rect y="48" width="120" height="28" fill="${P.g}"/>
  <path d="M30 26h60l6 8H24z" fill="#c74a3a" stroke="#3b2b20" stroke-width="2"/><rect x="30" y="34" width="4" height="26" fill="#f4efe4" stroke="#3b2b20" stroke-width="1.5"/><rect x="86" y="34" width="4" height="26" fill="#f4efe4" stroke="#3b2b20" stroke-width="1.5"/>
  <rect x="26" y="58" width="68" height="6" fill="#c79a64" stroke="#3b2b20" stroke-width="1.5"/><rect x="44" y="46" width="32" height="5" rx="1" fill="#e8d9b8" stroke="#3b2b20" stroke-width="1.5"/><rect x="48" y="51" width="3" height="8" fill="#7a4f2e"/><rect x="69" y="51" width="3" height="8" fill="#7a4f2e"/>${P.deco}</svg>`;
}
