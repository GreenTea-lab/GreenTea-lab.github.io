// Интерфейс в DOM: меню, настройка партии, панель за столом, окна. Всё крупно и контрастно.
import { IC, suitIcon } from './icons.js';
import { t, fmt, LANG } from './i18n.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { iap, itemHTML } from './iap.js';
import { audio } from './audio.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import { BACKS, BACK_ORDER, CLOTHS, CLOTH_ORDER, backPreview } from './cards.js';
import { clothPreview } from './scene.js';
import { drawAvatar } from './avatars.js';
import { maxPlayers } from './core.js';
import { HINT_PRICE } from './game.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const DAILY = [50, 70, 90, 120, 150, 200, 300];
const today = () => new Date().toISOString().slice(0, 10);
const THEME = { accent: '#3f8f5a', track: '#d9c9a8', thumb: '#fffaf0', muted: '#7a5a3a' };
export const TITLES = [0, 60, 250, 700, 1600, 3500, 7000];

export function titleFor(points) {
  let k = 0;
  for (let i = 0; i < TITLES.length; i++) if (points >= TITLES[i]) k = i;
  return { k, name: t('title' + k), next: TITLES[k + 1] };
}

const avCache = new Map();
function avatarURL(kind, size = 72, cap = false) {
  const key = kind + size + cap;
  if (avCache.has(key)) return avCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  drawAvatar(g, kind, size / 2, size / 2 + (cap ? size * 0.12 : 0), size * (cap ? 0.36 : 0.46), { cap });
  const u = c.toDataURL();
  avCache.set(key, u);
  return u;
}

export class UI {
  constructor(app, root) {
    this.app = app;
    this.root = root;
    this.modalOpen = false;
    this.toasted = {};
    const st = document.createElement('style');
    st.textContent = volumeCss(THEME);
    document.head.appendChild(st);
    root.innerHTML = `<div class="screen"></div><div class="mlayer"></div>`;
    this.scr = root.querySelector('.screen');
    this.ml = root.querySelector('.mlayer');
  }

  coinsChip() {
    return `<button class="chip coins" data-a="store">${IC.coin}<b class="cv">${fmt(save.data.coins)}</b><i class="plus">+</i></button>`;
  }
  bind(el) {
    el.querySelectorAll('[data-a]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.unlock();
        audio.play('click');
        this.act(b.dataset.a, b);
      });
    });
  }
  act(a, b) {
    const A = this.app;
    switch (a) {
      case 'store': return this.store();
      case 'quick': return A.adBreak(() => A.newGame());
      case 'resume': return A.resume();
      case 'setup': return this.setup();
      case 'menu': return A.toMenu();
      case 'gift': return this.daily();
      case 'looks': return this.looks();
      case 'lb': return this.leaderboard();
      case 'settings': return this.settings();
      case 'pause': return this.pause();
      case 'rules': return this.rules();
      case 'main': return A.mainButton();
      case 'hint': return A.useHint();
      case 'transfer': return A.transferButton();
      case 'skip': return A.skipToEnd();
    }
  }

  refresh() {
    this.root.querySelectorAll('.cv').forEach((e) => (e.textContent = fmt(save.data.coins)));
    const h = this.scr.querySelector('.hintb .bdg');
    if (h) h.innerHTML = save.data.hints > 0 ? `<b>${save.data.hints}</b>` : save.data.coins >= HINT_PRICE ? `${IC.coin}<b>${HINT_PRICE}</b>` : IC.ad;
    const g = this.scr.querySelector('.giftb');
    if (g) g.classList.toggle('ready', save.data.daily.day !== today());
  }

  toast(text, long) {
    document.querySelectorAll('.toast').forEach((e) => e.remove());
    const el = document.createElement('div');
    el.className = 'toast' + (long ? ' long' : '');
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), long ? 4600 : 2800);
  }
  tipOnce(k, text) {
    if (this.toasted[k] || save.data.tut[k] || save.data.settings.hints === false) return;
    this.toasted[k] = 1;
    save.data.tut[k] = 1;
    save.write(false);
    this.toast(text, true);
  }
  tip(k) {
    this.tipOnce(k, t(k));
  }

  // ---------- меню ----------
  menu() {
    this.closeModal();
    const d = save.data;
    const T = titleFor(d.points);
    const c = d.cfg;
    const cfgLine = `${t(c.mode)} · ${t('deckN', { n: c.deck })} · ${t('playersN', { n: c.players })}`;
    this.scr.innerHTML = `<div class="menu">
      <div class="topbar"><div class="tb-l"><button class="chip rank" data-a="lb">${IC.medal}<b>${esc(T.name)}</b></button></div><div class="tb-r">${this.coinsChip()}</div></div>
      <div class="logo"><div class="sign"><div class="sign-cards">${suitIcon(0)}${suitIcon(3)}${suitIcon(1)}${suitIcon(2)}</div><div class="sign-t">${esc(t('title'))}</div><div class="sign-s">${esc(t('subtitle'))}</div></div></div>
      <div class="mbtns">
        ${d.cur ? `<button class="bigbtn green" data-a="resume">${IC.play}<span class="bt">${esc(t('continue'))}</span><span class="bs">${esc(t('continueSub'))}</span></button>` : ''}
        <button class="bigbtn ${d.cur ? 'honey' : 'green'}" data-a="quick">${d.cur ? '' : IC.play}<span class="bt">${esc(d.cur ? t('newGame') : t('play'))}</span><span class="bs">${esc(cfgLine)}</span></button>
        <button class="midbtn wide" data-a="setup">${IC.people}<span>${esc(t('setupBtn'))}</span></button>
      </div>
      <div class="tiles">
        <button class="tile giftb ${d.daily.day !== today() ? 'ready' : ''}" data-a="gift">${IC.gift}<span>${esc(t('gift'))}</span></button>
        <button class="tile" data-a="looks">${IC.palette}<span>${esc(t('looks'))}</span></button>
        <button class="tile" data-a="store">${IC.shop}<span>${esc(t('shop'))}</span></button>
        <button class="tile" data-a="lb">${IC.trophy}<span>${esc(t('records'))}</span></button>
        <button class="tile" data-a="rules">${IC.book}<span>${esc(t('rules'))}</span></button>
        <button class="tile" data-a="settings">${IC.gear}<span>${esc(t('settings'))}</span></button>
      </div>
    </div>`;
    this.bind(this.scr);
    this.menuAvoid();
    audio.setMood('menu');
  }

  menuAvoid() {
    requestAnimationFrame(() => {
      const rs = [...this.scr.querySelectorAll('.sign,.mbtns,.tiles,.topbar')].map((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      });
      const v = this.app.view;
      v.avoidExtra = rs;
      // веер тузов под вывеской, если есть место
      const sign = this.scr.querySelector('.sign');
      v.menuFan = null;
      if (v.mode === 'menu') v.rebuild();
      void sign;
    });
  }

  // ---------- настройка партии ----------
  setup() {
    const c = { ...save.data.cfg };
    const render = () => {
      c.players = Math.min(c.players, maxPlayers(c.deck));
      const seg = (key, vals, label) =>
        `<div class="seg"><div class="segl">${esc(label)}</div><div class="segb">${vals
          .map(([v, txt, dis]) => `<button class="sb ${c[key] === v ? 'on' : ''}" data-k="${key}" data-v="${v}" ${dis ? 'disabled' : ''}>${txt}</button>`)
          .join('')}</div></div>`;
      const mp = maxPlayers(c.deck);
      const m = this.modal(`${this.head(t('setupTitle'))}<div class="mbody setup">
        ${seg('mode', [['podkidnoy', esc(t('podkidnoy'))], ['perevodnoy', esc(t('perevodnoy'))]], t('modeL'))}
        <p class="itxt small">${esc(t(c.mode + 'Txt'))}</p>
        ${seg('players', [2, 3, 4, 5, 6].map((n) => [n, String(n), n > mp]), t('playersL'))}
        ${seg('deck', [[24, '24'], [36, '36'], [52, '52']], t('deckL'))}
        ${seg('level', [[0, esc(t('lvl0'))], [1, esc(t('lvl1'))], [2, esc(t('lvl2'))]], t('levelL'))}
        <p class="itxt small">${esc(t('lvlTxt' + c.level))}</p>
        <button class="bigbtn green" data-go>${IC.play}<span class="bt">${esc(t('start'))}</span></button>
      </div>`, 'setupm');
      m.querySelectorAll('.sb').forEach((b) =>
        (b.onclick = () => {
          audio.play('click');
          const k = b.dataset.k;
          c[k] = k === 'mode' ? b.dataset.v : +b.dataset.v;
          render();
        }),
      );
      m.querySelector('[data-go]').onclick = () => {
        audio.play('click');
        this.closeModal();
        save.data.cfg = c;
        save.write();
        this.app.adBreak(() => this.app.newGame(c));
      };
    };
    render();
  }

  // ---------- за столом ----------
  hud() {
    this.closeModal();
    const A = this.app, g = A.game;
    const four = save.data.settings.four;
    this.scr.innerHTML = `<div class="hud">
      <div class="hbar"><div class="hl2"><button class="round" data-a="pause" aria-label="menu">${IC.menu}</button>
        <div class="trump"><span class="tl">${esc(t('trump'))}</span><span class="ts">${suitIcon(g.trump, four)}</span><span class="tm">${esc(t(A.cfg.mode))}</span></div></div>
        ${this.coinsChip()}</div>
      <div class="prompt"><span class="pt"></span></div>
      <button class="actbtn" data-a="main"><span class="ai"></span><span class="at"></span></button>
      <button class="actbtn transfer" data-a="transfer"><span class="ai">${IC.transfer}</span><span class="at">${esc(t('b_transfer'))}</span></button>
      <button class="hintb" data-a="hint">${IC.hint}<span class="hl">${esc(t('hint'))}</span><span class="bdg"></span></button>
      <div class="outbar"><span>${esc(t('othersPlay'))}</span><button class="midbtn green" data-a="skip">${esc(t('skip'))}</button></div>
    </div>`;
    this.bind(this.scr);
    this.layout(A.view.L);
    this.refresh();
    this.updateControls();
  }

  layout(L) {
    if (!L) return;
    const W = L.W;
    const pr = this.scr.querySelector('.prompt');
    const ab = this.scr.querySelector('.actbtn');
    const tb = this.scr.querySelector('.actbtn.transfer');
    const hb = this.scr.querySelector('.hintb');
    const ob = this.scr.querySelector('.outbar');
    if (pr && ab && hb) {
      const handTop = L.handY - L.ch / 2;
      if (L.port) {
        const rowY = handTop - 10;
        const two = this.scr.querySelector('.hud.two');
        const free = W - 20 - (this.app.hintsOn() ? 76 : 0) - 8;
        const bw = two ? Math.min(170, (free - 8) / 2) : Math.min(170, W * 0.42);
        Object.assign(ab.style, { right: '10px', left: 'auto', top: rowY - 60 + 'px', width: bw + 'px', height: '60px' });
        Object.assign(hb.style, { left: '10px', top: rowY - 60 + 'px', width: '66px', height: '60px' });
        Object.assign(pr.style, { left: '8px', right: '8px', top: rowY - 116 + 'px', height: '50px' });
        // «Перевести» рядом с «Беру»; если подсказки выключены, места больше
        const tw = bw;
        if (tb) Object.assign(tb.style, { right: 10 + bw + 8 + 'px', left: 'auto', top: rowY - 60 + 'px', width: tw + 'px', height: '60px' });
      } else {
        const side = Math.max(120, L.handX0 - 24);
        const bw = Math.min(210, side);
        Object.assign(ab.style, { right: '12px', left: 'auto', top: L.handY - 40 + 'px', width: bw + 'px', height: '80px' });
        Object.assign(hb.style, { left: '12px', top: L.handY - 40 + 'px', width: Math.min(130, side) + 'px', height: '80px' });
        Object.assign(pr.style, { left: L.handX0 + 'px', right: W - L.handX1 + 'px', top: handTop - 54 + 'px', height: '46px' });
        if (tb) Object.assign(tb.style, { right: '12px', left: 'auto', top: L.handY - 40 - 96 + 'px', width: bw + 'px', height: '80px' });
      }
    }
    if (ob) Object.assign(ob.style, { top: L.handY - 40 + 'px' });
    if (this.app.state === 'menu') this.menuAvoid();
  }

  hudUpdate() {
    this.refresh();
  }

  // подсказка над рукой и главная кнопка
  updateControls() {
    const A = this.app, g = A.game;
    const pt = this.scr.querySelector('.pt');
    const ab = this.scr.querySelector('.actbtn');
    const hb = this.scr.querySelector('.hintb');
    if (!pt || !ab || !g) return;
    const nm = (p) => A.players[p].name;
    let text = '', btn = null;
    const must = A.humanMust();
    if (g.over) text = '';
    else if (g.out[0]) text = t('pOut');
    else if (g.needAttack()) text = g.attacker === 0 ? t('pYourMove') : t('pMoves', { name: nm(g.attacker) });
    else if (g.needDefense()) {
      if (g.defender === 0) {
        const tr = (A.st.acts || []).some((a) => a.t === 'transfer');
        text = tr ? t('pDefendOrTransfer') : (A.st.acts || []).some((a) => a.t === 'defend') ? t('pDefend') : t('pCantBeat');
        btn = 'take';
      } else text = t('pDefends', { name: nm(g.defender) });
    } else if (g.phase === 'take') {
      if (g.defender === 0) text = t('pYouTake');
      else if (g.throwers().includes(0)) {
        text = t('pThrowTaking', { name: nm(g.defender) });
        btn = 'pass';
      } else text = t('pTakes', { name: nm(g.defender) });
    } else if (g.throwers().includes(0)) {
      text = g.attacker === 0 ? t('pBeatenAttacker') : t('pThrowMore');
      btn = g.attacker === 0 ? 'bito' : 'pass';
    } else text = '';
    pt.textContent = text;
    pt.parentElement.classList.toggle('must', must);
    ab.classList.toggle('show', !!btn);
    ab.classList.remove('take', 'bito', 'pass');
    if (btn) {
      ab.classList.add(btn);
      ab.querySelector('.at').textContent = t('b_' + btn);
      ab.querySelector('.ai').innerHTML = btn === 'take' ? IC.take : IC.done;
    }
    if (hb) hb.classList.toggle('show', must && !g.out[0] && A.hintsOn());
    const tb = this.scr.querySelector('.actbtn.transfer');
    const canTr = !g.over && g.defender === 0 && g.needDefense() && (A.st.acts || []).some((a) => a.t === 'transfer');
    if (tb) tb.classList.toggle('show', canTr);
    const hud = this.scr.querySelector('.hud');
    if (hud.classList.contains('two') !== canTr) {
      hud.classList.toggle('two', canTr);
      this.layout(A.view.L);
    }
    const ob = this.scr.querySelector('.outbar');
    if (ob) ob.classList.toggle('show', !!(g.out[0] && !g.over));
  }

  humanOut(place) {
    this.toast(t('youOutT', { n: place }));
    this.updateControls();
  }

  // ---------- окна ----------
  modal(html, cls = '', onClose) {
    this.closeModal();
    this.modalOpen = true;
    const m = document.createElement('div');
    m.className = 'modal ' + cls;
    m.innerHTML = `<div class="mpanel">${html}</div>`;
    m.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.ml.appendChild(m);
    this.bind(m);
    m.querySelectorAll('[data-x]').forEach((b) =>
      b.addEventListener('click', () => {
        audio.play('click');
        this.closeModal();
        onClose && onClose();
      }),
    );
    return m;
  }
  closeModal() {
    const was = this.modalOpen;
    this.ml.innerHTML = '';
    this.modalOpen = false;
    if (was && this.app.state === 'play') this.app.unpause();
  }
  head(title, close = true) {
    return `<div class="mhead"><b>${esc(title)}</b>${close ? `<button class="round small" data-x aria-label="close">${IC.close}</button>` : ''}</div>`;
  }

  pause() {
    sdk.gameplay(false);
    const A = this.app;
    const d = save.data;
    const m = this.modal(`${this.head(t('pause'))}<div class="mbody">
      <button class="bigbtn green" data-x>${IC.play}<span class="bt">${esc(t('resumeGame'))}</span></button>
      ${slidersHTML(d.settings, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}
      <div class="row2"><button class="midbtn" data-a="rules">${IC.book}<span>${esc(t('rules'))}</span></button><button class="midbtn" data-a="settings">${IC.gear}<span>${esc(t('settings'))}</span></button></div>
      <button class="midbtn wide" data-m>${IC.home}<span>${esc(t('toMenuSaved'))}</span></button>
      <button class="midbtn wide" data-give>${IC.flag}<span>${esc(t('giveUp'))}</span></button>
    </div>`, '', () => sdk.gameplay(true));
    bindSliders(m, d.settings, () => save.write());
    m.querySelector('[data-m]').onclick = () => {
      audio.play('click');
      this.closeModal();
      A.adBreak(() => A.toMenu());
    };
    m.querySelector('[data-give]').onclick = () => {
      audio.play('click');
      const c = this.modal(`${this.head(t('giveUp'))}<div class="mbody"><p class="itxt">${esc(t('giveUpTxt'))}</p>
        <div class="row2"><button class="midbtn" data-no>${esc(t('no'))}</button><button class="midbtn red" data-yes>${esc(t('yesGiveUp'))}</button></div></div>`);
      c.querySelector('[data-no]').onclick = () => this.pause();
      c.querySelector('[data-yes]').onclick = () => {
        audio.play('click');
        this.closeModal();
        save.data.stats.games++;
        save.data.stats.duraks++;
        save.data.streak = 0;
        save.data.cur = null;
        save.write();
        A.game = null;
        A.adBreak(() => A.toMenu());
      };
    };
  }

  settings() {
    const d = save.data;
    const back = this.app.state === 'play' ? () => this.pause() : null;
    const render = () => {
      const opt = (k, vals) => `<div class="segb">${vals.map(([v, txt]) => `<button class="sb ${d.settings[k] === v ? 'on' : ''}" data-k="${k}" data-v="${v}">${esc(txt)}</button>`).join('')}</div>`;
      const m = this.modal(`${this.head(t('settings'))}<div class="mbody setup">
        ${slidersHTML(d.settings, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}
        <div class="seg"><div class="segl">${esc(t('speedL'))}</div>${opt('speed', [['slow', t('slow')], ['normal', t('normal')], ['fast', t('fast')]])}</div>
        <div class="seg"><div class="segl">${esc(t('hintsL'))}</div><div class="segb"><button class="sb ${d.settings.hints !== false ? 'on' : ''}" data-hints="1">${esc(t('on'))}</button><button class="sb ${d.settings.hints === false ? 'on' : ''}" data-hints="0">${esc(t('off'))}</button></div></div>
        <p class="itxt small">${esc(t('hintsTxt'))}</p>
        <div class="seg"><div class="segl">${esc(t('sortL'))}</div>${opt('sort', [['suit', t('bySuit')], ['rank', t('byRank')]])}</div>
        <div class="seg"><div class="segl">${esc(t('fourL'))}</div><div class="segb"><button class="sb ${!d.settings.four ? 'on' : ''}" data-four="0">${suitIcon(1)}${suitIcon(2)}</button><button class="sb ${d.settings.four ? 'on' : ''}" data-four="1">${suitIcon(1, true)}${suitIcon(2, true)}</button></div></div>
        <p class="itxt small">${esc(t('fourTxt'))}</p>
      </div>`, 'setupm', back);
      bindSliders(m, d.settings, () => save.write());
      m.querySelectorAll('[data-k]').forEach((b) =>
        (b.onclick = () => {
          audio.play('click');
          d.settings[b.dataset.k] = b.dataset.v;
          save.write();
          render();
        }),
      );
      m.querySelectorAll('[data-hints]').forEach((b) =>
        (b.onclick = () => {
          audio.play('click');
          d.settings.hints = b.dataset.hints === '1';
          save.write();
          if (this.app.state === 'play') {
            this.layout(this.app.view.L);
            this.updateControls();
          }
          render();
        }),
      );
      m.querySelectorAll('[data-four]').forEach((b) =>
        (b.onclick = () => {
          audio.play('click');
          d.settings.four = b.dataset.four === '1';
          this.app.setLook({});
          if (this.app.state === 'play') {
            const ts = this.scr.querySelector('.trump .ts');
            if (ts) ts.innerHTML = suitIcon(this.app.game.trump, d.settings.four);
          }
          render();
        }),
      );
    };
    render();
  }

  rules() {
    const back = this.app.state === 'play' ? () => this.pause() : null;
    const rows = [1, 2, 3, 4, 5, 6, 7].map((k) => `<div class="hrow"><span class="hn">${k}</span><p>${esc(t('rule' + k))}</p></div>`).join('');
    this.modal(`${this.head(t('rules'))}<div class="mbody how">${rows}
      <div class="hrow trans"><span class="hn">↻</span><p>${esc(t('ruleT'))}</p></div>
      <button class="bigbtn green" data-x><span class="bt">${esc(t('ok'))}</span></button>
    </div>`, 'howm', back);
  }

  needCoins(onAd) {
    const m = this.modal(`${this.head(t('hint'))}<div class="mbody">
      <div class="bicon">${IC.hint}</div>
      <p class="itxt">${esc(t('hintTxt'))}</p>
      <p class="itxt small">${esc(t('needCoins', { n: HINT_PRICE }))}</p>
      <button class="bigbtn green" data-ad>${IC.ad}<span class="bt">${esc(t('freeForAd'))}</span></button>
      <button class="midbtn wide" data-a="store">${IC.shop}<span>${esc(t('shop'))}</span></button>
    </div>`);
    m.querySelector('[data-ad]').onclick = () => {
      audio.play('click');
      this.closeModal();
      onAd();
    };
  }

  result(r) {
    const A = this.app, g = A.game;
    const d = save.data;
    let claimed = false;
    const title = { win: t('rWin'), ok: t('rOk'), lose: t('rLose'), draw: t('rDraw') }[r.kind];
    const sub = { win: t('rWinTxt'), ok: t('rOkTxt', { n: r.place }), lose: t('rLoseTxt'), draw: t('rDrawTxt') }[r.kind];
    // список мест
    const order = [...g.places];
    if (g.durak >= 0) order.push(g.durak);
    const rows = order
      .map((p, i) => {
        const pl = A.players[p];
        const isD = p === g.durak;
        const img = p === 0 ? `<span class="you">${IC.cards}</span>` : `<img src="${avatarURL(pl.kind, 72, isD)}" alt="">`;
        return `<div class="prow ${p === 0 ? 'me' : ''} ${isD ? 'dur' : ''}"><span class="pn">${isD ? IC.jester : i + 1}</span>${img}<span class="pname">${esc(pl.name)}</span><span class="pr">${esc(isD ? t('durak') : t('placeN', { n: i + 1 }))}</span></div>`;
      })
      .join('');
    const T = titleFor(d.points);
    this.refresh();
    const m = this.modal(`${this.head(title, false)}<div class="mbody result">
      ${r.kind === 'lose' ? `<div class="bigic">${IC.jester}</div>` : r.kind === 'draw' ? '' : `<div class="bigic">${IC.medal}</div>`}
      <p class="itxt">${esc(sub)}</p>
      <div class="places">${rows}</div>
      <div class="earn">${IC.coin}<b>+<span class="en">${r.coins}</span></b>${r.points ? `<span class="pts">${IC.star}<b>+${r.points}</b></span>` : ''}</div>
      <div class="bestl">${IC.medal}<span>${esc(T.name)}</span>${T.next ? `<small>${fmt(d.points)} / ${fmt(T.next)}</small>` : ''}</div>
      <button class="midbtn wide blue" data-x2>${IC.ad}<span>${esc(t('coinsX2'))}</span></button>
      <button class="bigbtn green" data-again>${IC.restart.replace(/#3b2412/g, '#fff')}<span class="bt">${esc(t('playAgain'))}</span></button>
      <button class="midbtn wide" data-m>${IC.home}<span>${esc(t('toMenu'))}</span></button>
    </div>`, 'resultm');
    m.querySelector('[data-x2]').onclick = (e) => {
      if (claimed) return;
      audio.play('click');
      sdk.showRewarded(() => {
        claimed = true;
        d.coins += r.coins;
        save.write();
        m.querySelector('.en').textContent = r.coins * 2;
        e.target.closest('button').disabled = true;
        audio.play('coin');
        this.refresh();
      });
    };
    m.querySelector('[data-again]').onclick = () => {
      audio.play('click');
      this.closeModal();
      A.adBreak(() => A.newGame());
    };
    m.querySelector('[data-m]').onclick = () => {
      audio.play('click');
      this.closeModal();
      A.game = null;
      A.adBreak(() => A.toMenu());
    };
  }

  daily() {
    const d = save.data;
    const td = today();
    const got = d.daily.day === td;
    const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const streak = got ? d.daily.streak : d.daily.day === yest ? (d.daily.streak % 7) + 1 : 1;
    const amount = DAILY[streak - 1];
    const days = DAILY.map((c, k) => `<div class="dday ${k + 1 < streak || (got && k + 1 === streak) ? 'taken' : ''} ${k + 1 === streak ? 'today' : ''}"><small>${esc(t('day', { n: k + 1 }))}</small>${IC.coin}<b>${c}</b></div>`).join('');
    const m = this.modal(`${this.head(t('gift'))}<div class="mbody">
      <div class="days">${days}</div>
      <p class="itxt">${esc(got ? t('giftTaken') : t('giftTxt'))}</p>
      ${got ? '' : `<button class="bigbtn green" data-take>${IC.coin}<span class="bt">${esc(t('take'))} ${amount}</span></button><button class="midbtn wide blue" data-x2>${IC.ad}<span>${esc(t('takeX2', { n: amount * 2 }))}</span></button>`}
    </div>`);
    const take = (k) => {
      d.daily = { day: td, streak };
      d.coins += amount * k;
      if (streak === 7) d.hints += 3;
      save.write();
      audio.play('coin');
      this.closeModal();
      this.toast(t('gotCoins', { n: amount * k }));
      this.app.state === 'menu' ? this.menu() : this.refresh();
    };
    const tk = m.querySelector('[data-take]');
    if (tk) tk.onclick = () => take(1);
    const x2 = m.querySelector('[data-x2]');
    if (x2) x2.onclick = () => sdk.showRewarded(() => take(2));
  }

  // рубашки и столы
  looks(tab = 'back') {
    const d = save.data;
    const list = tab === 'back' ? BACK_ORDER : CLOTH_ORDER;
    const defs = tab === 'back' ? BACKS : CLOTHS;
    const own = tab === 'back' ? d.backs : d.cloths;
    const cur = tab === 'back' ? d.back : d.cloth;
    const card = (id) => {
      const has = own.includes(id);
      const on = cur === id;
      const price = defs[id].price;
      const img = tab === 'back' ? backPreview(id, 64) : clothPreview(id, 150, 96);
      const btn = on ? `<span class="sel">${esc(t('selected'))}</span>` : has ? `<button class="midbtn green" data-use="${id}">${esc(t('choose'))}</button>` : `<button class="midbtn honey" data-buy="${id}" ${d.coins < price ? 'disabled' : ''}>${IC.coin}<span>${fmt(price)}</span></button>`;
      return `<div class="scard ${on ? 'on' : ''} ${tab}"><img src="${img}" alt=""><b>${esc(t((tab === 'back' ? 'bk_' : 'cl_') + id))}</b>${btn}</div>`;
    };
    const m = this.modal(`${this.head(t('looks'))}<div class="mbody">
      <div class="stabs"><button class="stab ${tab === 'back' ? 'on' : ''}" data-tab="back">${IC.cards}<span>${esc(t('backs'))}</span></button><button class="stab ${tab === 'cloth' ? 'on' : ''}" data-tab="cloth">${IC.palette}<span>${esc(t('cloths'))}</span></button></div>
      <div class="scards">${list.map(card).join('')}</div></div>`, 'looksm');
    m.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { audio.play('click'); this.looks(b.dataset.tab); }));
    m.querySelectorAll('[data-use]').forEach((b) =>
      (b.onclick = () => {
        audio.play('click');
        this.app.setLook(tab === 'back' ? { back: b.dataset.use } : { cloth: b.dataset.use });
        this.looks(tab);
      }),
    );
    m.querySelectorAll('[data-buy]').forEach((b) =>
      (b.onclick = () => {
        const id = b.dataset.buy;
        const price = defs[id].price;
        if (d.coins < price) return;
        d.coins -= price;
        own.push(id);
        this.app.setLook(tab === 'back' ? { back: id } : { cloth: id });
        audio.play('buy');
        this.looks(tab);
        this.refresh();
      }),
    );
  }

  store() {
    const d = save.data;
    const free = Date.now() - (d.freeAt || 0) > 4 * 60 * 1000;
    const items = iap.items();
    const m = this.modal(`${this.head(t('shop'))}<div class="mbody store">
      <div class="iap-item freec"><div class="iap-ic">${IC.ad}</div><div class="iap-tx"><b>${esc(t('freeCoins'))}</b><small>${esc(free ? t('freeCoinsTxt') : t('freeLater'))}</small></div><button class="iap-buy" data-free ${free ? '' : 'disabled'}>+60 ${IC.coin}</button></div>
      ${items.length ? items.map((x) => itemHTML(x, { owned: t('owned') })).join('') : `<p class="itxt small">${esc(t('storeEmpty'))}</p>`}
    </div>`, 'storem');
    m.querySelector('[data-free]').onclick = () =>
      sdk.showRewarded(() => {
        d.freeAt = Date.now();
        d.coins += 60;
        save.write();
        audio.play('coin');
        this.refresh();
        this.store();
      });
    m.querySelectorAll('.iap-buy[data-id]').forEach((b) =>
      (b.onclick = async () => {
        m.querySelectorAll('.iap-buy').forEach((e) => (e.disabled = true));
        await iap.buy(b.dataset.id);
        if (this.modalOpen) this.store();
      }),
    );
  }

  async leaderboard() {
    const d = save.data, s = d.stats;
    const T = titleFor(d.points);
    const pct = s.games ? Math.round((s.wins / s.games) * 100) : 0;
    const m = this.modal(`${this.head(t('records'))}<div class="mbody">
      <div class="stats">
        <div class="stt big">${IC.medal}<span><b>${esc(T.name)}</b><small>${IC.star}${fmt(d.points)}${T.next ? ' / ' + fmt(T.next) : ''}</small></span></div>
        <div class="stt"><b>${s.games}</b><small>${esc(t('stGames'))}</small></div>
        <div class="stt"><b>${s.wins}</b><small>${esc(t('stWins'))}</small></div>
        <div class="stt"><b>${pct}%</b><small>${esc(t('stPct'))}</small></div>
        <div class="stt"><b>${s.duraks}</b><small>${esc(t('stDuraks'))}</small></div>
        <div class="stt"><b>${s.bestStreak}</b><small>${esc(t('stStreak'))}</small></div>
        <div class="stt"><b>${s.firsts}</b><small>${esc(t('stFirsts'))}</small></div>
      </div>
      <div class="lbt">${esc(t('lbTitle'))}</div>
      <div class="lb">${esc(t('loading'))}</div></div>`, 'lbm');
    const res = await sdk.getLeaderboard();
    const box = m.querySelector('.lb');
    if (!box || !this.modalOpen) return;
    if (!res.available) {
      box.innerHTML = `<p class="itxt small">${esc(t('lbLocal'))}</p>`;
      return;
    }
    let html = res.entries.map((e) => `<div class="lbr ${e.me ? 'me' : ''}"><span class="lbn">${e.rank}</span><span class="lbname">${esc(e.name || t('anon'))}</span><b>${fmt(e.score)}</b></div>`).join('');
    if (!res.authorized) html += `<button class="midbtn wide" data-login>${esc(t('login'))}</button>`;
    box.innerHTML = html || `<p class="itxt">${esc(t('lbEmpty'))}</p>`;
    const lg = box.querySelector('[data-login]');
    if (lg) lg.onclick = async () => { if (await sdk.login()) { sdk.submitScore(save.data.points); this.leaderboard(); } };
  }

  tick() {}
}
