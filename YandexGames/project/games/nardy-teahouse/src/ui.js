// DOM-интерфейс: главное меню, выбор соперника, HUD партии, итоги, стили, магазин, настройки, правила, рекорды, подарок дня
import { IC, AVATARS, ME, dieSVG } from './icons.js';
import { t, fmt, LANG } from './i18n.js';
import { save, WIN_COINS, AD_COINS, AD_COOLDOWN, DAILY } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { iap, itemHTML } from './iap.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import { SKINS, find } from './skins.js';
import { woodCanvas, checkerTopCanvas, diceFaceCanvas, canvas, shade } from './textures.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const today = () => new Date().toISOString().slice(0, 10);

export class UI {
  constructor(game, root) {
    this.g = game;
    this.root = root;
    this.modalOpen = false;
    this.screen = '';
    const st = document.createElement('style');
    st.textContent = volumeCss({ accent: '#8f2428', track: '#e6d2a8', thumb: '#fbf1dc', muted: '#8a6a4a' });
    document.head.appendChild(st);
    root.innerHTML = '<div class="safe" id="scr"></div><div id="mod"></div><div id="tst"></div>';
    this.scr = root.querySelector('#scr');
    this.mod = root.querySelector('#mod');
    this.tst = root.querySelector('#tst');
    root.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) {
        audio.unlock();
        audio.play('click');
      }
    });
    this.thumbs = {};
  }
  tt(k, v) {
    return t(k, v);
  }

  // ---------- общие ----------
  coinsChip() {
    return `<button class="chip hit" data-a="shop">${IC.coin}<b id="coinsN">${fmt(save.data.coins)}</b><i class="plus">+</i></button>`;
  }
  refreshTop() {
    const c = this.root.querySelector('#coinsN');
    if (c) c.textContent = fmt(save.data.coins);
    this.root.querySelectorAll('.coinsN').forEach((e) => (e.textContent = fmt(save.data.coins)));
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
    this.tst.innerHTML = '';
    this.tst.appendChild(d);
    clearTimeout(this._tt);
    this._tt = setTimeout(() => d.remove(), ms);
  }
  modal({ title, body, ribbon, ribbonCls = '', wide = false, close = true, onClose, cls = '' }) {
    this.modalOpen = true;
    const wrap = document.createElement('div');
    wrap.className = 'modal ' + cls;
    wrap.innerHTML = `<div class="panel ${wide ? 'wide' : ''}"><i class="orn tl"></i><i class="orn tr"></i><i class="orn bl"></i><i class="orn br"></i>${ribbon ? `<div class="ribbon ${ribbonCls}">${esc(ribbon)}</div>` : ''}${
      title || close ? `<div class="ph"><h2>${esc(title || '')}</h2>${close ? `<button class="btn round sm" data-x="1" aria-label="close">${IC.close}</button>` : ''}</div>` : ''
    }<div class="pb">${body}</div></div>`;
    this.mod.appendChild(wrap);
    const done = () => {
      if (!wrap.parentNode) return;
      wrap.remove();
      this.modalOpen = this.mod.children.length > 0;
      onClose && onClose();
    };
    wrap.close = done;
    const x = wrap.querySelector('[data-x]');
    if (x) x.onclick = done;
    if (close) wrap.addEventListener('pointerdown', (e) => e.target === wrap && done());
    audio.play('open');
    return wrap;
  }
  closeModals() {
    this.mod.innerHTML = '';
    this.modalOpen = false;
  }

  // ---------- главное меню ----------
  home() {
    this.screen = 'home';
    const d = save.data;
    const daily = d.daily.day !== today();
    const cur = d.cur;
    this.scr.innerHTML = `
      <div class="top">
        <div class="tl">${this.coinsChip()}</div>
        <div class="tr">
          ${daily ? `<button class="btn round hit pulse" data-a="daily" aria-label="gift">${IC.gift}</button>` : ''}
          <button class="btn round hit" data-a="lb" aria-label="records">${IC.trophy}</button>
          <button class="btn round hit" data-a="rules" aria-label="rules">${IC.book}</button>
          <button class="btn round hit" data-a="settings" aria-label="settings">${IC.gear}</button>
        </div>
      </div>
      <div class="logo"><b>${esc(t('title').split(':')[0])}</b><i>${esc((t('title').split(':')[1] || '').trim())}</i></div>
      <div class="menu-bottom">
        ${cur ? `<button class="btn big gold hit cont" data-a="cont">${IC.play}<span><b>${esc(t('continue'))}</b><small>${esc(t('contSub', { mode: t(cur.mode), bot: t('bot' + cur.level) }))}</small></span></button>` : ''}
        <div class="modes">
          <button class="mode hit" data-a="long"><span class="mi">${miniBoard('long')}</span><span class="mt"><b>${esc(t('long'))}</b><small>${esc(t('longD'))}</small></span><span class="go">${IC.arrow}</span></button>
          <button class="mode hit" data-a="short"><span class="mi">${miniBoard('short')}</span><span class="mt"><b>${esc(t('short'))}</b><small>${esc(t('shortD'))}</small></span><span class="go">${IC.arrow}</span></button>
        </div>
        <div class="sub">
          <button class="btn mid sand hit" data-a="style">${IC.brush}<span>${esc(t('style'))}</span></button>
          <button class="btn mid sand hit" data-a="shop">${IC.bag}<span>${esc(t('shop'))}</span></button>
        </div>
      </div>`;
    this.bind(this.scr, {
      shop: () => this.shop(),
      daily: () => this.daily(),
      lb: () => this.leaderboard(),
      rules: () => this.rules(save.data.last.mode),
      settings: () => this.settings(),
      cont: () => this.g.continueGame(),
      long: () => this.chooseBot('long'),
      short: () => this.chooseBot('short'),
      style: () => this.style(),
    });
    this.tip('');
  }

  chooseBot(mode) {
    const st = save.data.stats[mode];
    const last = save.data.last.level;
    const body = `<div class="bots">${[0, 1, 2]
      .map(
        (i) => `<button class="bot hit ${i === last ? 'on' : ''}" data-lv="${i}">
        <span class="av">${AVATARS[i]}</span>
        <span class="bt"><b>${esc(t('bot' + i))}</b><em class="lv lv${i}">${esc(t('lvl' + i))}</em><small>${esc(t('bot' + i + 'd'))}</small>
        <span class="rw">${IC.coin}<b>${WIN_COINS[i]}</b><span class="rec">${esc(t('record', { w: st[i][0], l: st[i][1] }))}</span></span></span>
      </button>`
      )
      .join('')}</div>${save.data.cur ? `<p class="warn">${esc(t('toMenuSub'))}</p>` : ''}`;
    const m = this.modal({ title: t(mode), body, wide: true });
    m.querySelector('.warn') && m.querySelector('.warn').remove();
    m.querySelectorAll('.bot').forEach((b) => (b.onclick = () => this.g.newGame(mode, +b.dataset.lv)));
  }

  // ---------- HUD партии ----------
  hud() {
    this.screen = 'game';
    const lv = this.g.level;
    this.scr.innerHTML = `
      <div class="pcard opp" id="opp"><span class="av">${AVATARS[lv]}</span><span class="pt"><b>${esc(t('bot' + lv))}</b><small class="lv lv${lv}">${esc(t('lvl' + lv))}</small><span class="pp" id="oppP"></span></span><span class="think" id="think"><i></i><i></i><i></i></span><span class="pdice" id="oppD"></span></div>
      <div class="pcard me" id="me"><span class="av">${ME}</span><span class="pt"><b>${esc(sdk.playerName() || t('you'))}</b><span class="pp" id="meP"></span></span><span class="pdice" id="meD"></span></div>
      <button class="btn round hit pausebtn" data-a="pause" aria-label="pause">${IC.pause}</button>
      <div class="acts" id="acts">
        <div class="act"><button class="btn round hit" data-a="undo" id="bUndo">${IC.undo}</button><span>${esc(t('undo'))}</span></div>
        <div class="act"><button class="btn round hit" data-a="hint" id="bHint">${IC.bulb}<i class="cnt" id="hintN"></i></button><span>${esc(t('hint'))}</span></div>
        <button class="btn big hit rollbtn" data-a="roll" id="bRoll">${IC.dice}<span>${esc(t('roll'))}</span></button>
        <button class="btn big green hit rollbtn" data-a="done" id="bDone" style="display:none">${IC.check}<span>${esc(t('done'))}</span></button>
      </div>
      <div class="status" id="st"><span></span></div>`;
    this.bind(this.scr, {
      pause: () => this.pause(),
      undo: () => this.g.match.undo(),
      hint: () => this.g.hint(),
      roll: () => this.g.match.roll(),
      done: () => this.g.match.confirm(),
    });
    this.status('');
    this.hudUpdate();
    this.phase('idle');
    this.g.updateInsets();
  }
  layoutChanged() {
    if (this.screen === 'game') requestAnimationFrame(() => this.g.updateInsets());
  }
  // свободная от HUD область (px)
  insets() {
    const W = innerWidth;
    const H = innerHeight;
    if (this.screen !== 'game') return { top: 0, bottom: 0, left: 0, right: 0 };
    const r = (id) => {
      const e = this.root.querySelector(id);
      return e ? e.getBoundingClientRect() : null;
    };
    const opp = r('#opp');
    const me = r('#me');
    const acts = r('#acts');
    const st = r('#st');
    const pz = r('.pausebtn');
    if (!opp || !me || !acts) return { top: 0, bottom: 0, left: 0, right: 0 };
    if (this.g.portrait) {
      return { top: Math.max(opp.bottom, st.bottom) + 4, bottom: H - Math.min(me.top, acts.top) + 4, left: 4, right: 4 };
    }
    return { top: st.bottom + 2, bottom: 4, left: Math.max(opp.right, me.right) + 6, right: W - Math.min(acts.left, pz.left) + 6 };
  }
  status(k, v) {
    this._st = [k, v];
    this.drawStatus();
  }
  drawStatus() {
    const el = this.root.querySelector('#st span');
    if (!el) return;
    const [k, v] = this._st || ['', null];
    const tip = this.tutKey();
    const txt = tip ? t(tip) : k ? t(k, { bot: t('bot' + this.g.level), ...(v || {}) }) : '';
    el.textContent = txt;
    el.parentElement.classList.toggle('empty', !txt);
    el.parentElement.classList.toggle('tut', !!tip);
  }
  phase(p) {
    const q = (id) => this.root.querySelector(id);
    if (!q('#bRoll')) return;
    const m = this.g.match;
    const rollable = p === 'roll' || p === 'opening';
    q('#bRoll').style.display = p === 'confirm' ? 'none' : '';
    q('#bRoll').disabled = !rollable;
    q('#bRoll').classList.toggle('pulse', rollable);
    q('#bDone').style.display = p === 'confirm' ? '' : 'none';
    q('#think').classList.toggle('on', p === 'bot');
    q('#opp').classList.toggle('active', m.cur === 1);
    q('#me').classList.toggle('active', m.cur === 0);
    this.hudUpdate();
    this.updateTip();
  }
  hudUpdate(x) {
    const q = (id) => this.root.querySelector(id);
    if (!q('#meP')) return;
    const m = this.g.match;
    if (!m.s) return;
    const sp = save.data.settings.pips;
    const line = (p) => {
      const parts = [];
      if (sp) parts.push(esc(t('pips', { n: m.pips(p) })));
      if (m.s.off[p]) parts.push(esc(t('offN', { n: m.s.off[p] })));
      return parts.join('<br>');
    };
    q('#meP').innerHTML = line(0);
    q('#oppP').innerHTML = line(1);
    // кубики у карточки текущего игрока
    const dice = (p) => {
      if (x && x.opening) return dieSVG(x.opening[p]);
      const tr = m.turn;
      if (!tr || tr.p !== p) return '';
      const [a, b] = tr.roll;
      if (a === b) {
        const left = tr.dice.length;
        return [0, 1, 2, 3].map((i) => dieSVG(a, i >= left)).join('');
      }
      return dieSVG(a, !tr.dice.includes(a)) + dieSVG(b, !tr.dice.includes(b));
    };
    q('#meD').innerHTML = dice(0);
    q('#oppD').innerHTML = dice(1);
    const u = q('#bUndo');
    u.disabled = !m.canUndo();
    const h = q('#bHint');
    h.disabled = m.phase !== 'move';
    q('#hintN').innerHTML = m.hints > 0 ? m.hints : IC.film;
    q('#hintN').classList.toggle('ad', m.hints <= 0);
  }
  // обучение в первой партии: подсказка выводится в строке состояния
  tutKey() {
    const g = this.g;
    const m = g.match;
    if (!g.tut || m.cur !== 0 || (m.myTurns || 0) > 3) return '';
    if (m.phase === 'roll' || m.phase === 'opening') return 'tut1';
    if (m.phase === 'move') return m.sel ? 'tut3' : m.turn && m.turn.steps.length ? 'tut4' : 'tut2';
    return '';
  }
  updateTip() {
    this.drawStatus();
  }
  tip() {}

  pause() {
    if (this.g.state !== 'game' || this.modalOpen) return;
    this.g.setPaused(true);
    const m = this.modal({
      title: t('pause'),
      body: `<div class="col">
        <button class="btn big green hit" data-a="res">${esc(t('resume'))}</button>
        <button class="btn mid sand hit" data-a="rules">${IC.book}<span>${esc(t('rules'))}</span></button>
        <div class="vol-wrap">${slidersHTML(save.data.settings, { music: t('music'), sound: t('sound') }, { music: IC.music, sound: IC.sound })}</div>
        <div class="row">
          <button class="btn mid sand hit" data-a="menu">${IC.home}<span>${esc(t('toMenu'))}</span></button>
          <button class="btn mid wine hit" data-a="give">${IC.flag}<span>${esc(t('giveUp'))}</span></button>
        </div></div>`,
      onClose: () => this.g.setPaused(false),
    });
    bindSliders(m, save.data.settings, () => save.write());
    this.bind(m, {
      res: () => m.close(),
      rules: () => this.rules(this.g.mode),
      menu: () => {
        this.closeModals();
        this.g.toMenu(true);
      },
      give: () => this.confirmBox(t('giveUpQ'), () => {
        this.closeModals();
        this.g.paused = false;
        this.g.match.resign();
      }),
    });
  }
  confirmBox(text, yes) {
    const m = this.modal({
      title: '',
      body: `<p class="center">${esc(text)}</p><div class="row"><button class="btn mid wine hit" data-a="y">${esc(t('yes'))}</button><button class="btn mid sand hit" data-a="n">${esc(t('no'))}</button></div>`,
    });
    this.bind(m, { y: () => (m.close(), yes()), n: () => m.close() });
  }

  // ---------- итог партии ----------
  end({ won, mult, coins, points, resign }) {
    this.tip('');
    const lv = this.g.level;
    const kind = mult === 3 ? (won ? 'kokc' : 'kokcL') : mult === 2 ? (won ? 'mars' : 'marsL') : won ? 'oin' : '';
    const st = save.data.stats[this.g.mode][lv];
    const body = `<div class="endav">${AVATARS[lv]}</div>
      <p class="center big2">${esc(won ? t('winSub', { bot: t('bot' + lv) }) : t('loseSub', { bot: t('bot' + lv) }))}</p>
      ${kind && !resign ? `<p class="center kind ${won ? 'good' : ''}">${esc(t(kind))}</p>` : ''}
      <div class="res">${coins ? `<div>${IC.coin}<b class="cn">+${fmt(coins)}</b></div>` : ''}${points ? `<div>${IC.trophy}<b>${esc(t('pointsN', { n: points }))}</b></div>` : ''}</div>
      <p class="center small">${esc(t('record', { w: st[0], l: st[1] }))}</p>
      <div class="col">
        ${won ? `<button class="btn big gold hit" data-a="x2">${IC.film}<span>${esc(t('x2'))}</span></button>` : ''}
        <div class="row"><button class="btn big green hit" data-a="again">${esc(t('again'))}</button><button class="btn big sand hit" data-a="menu">${esc(t('menu'))}</button></div>
      </div>`;
    const m = this.modal({ ribbon: won ? t('win') : t('lose'), ribbonCls: won ? 'green' : 'wine', body, close: false, cls: won ? 'win' : '' });
    this.bind(m, {
      x2: (b) => {
        b.disabled = true;
        this.g.doubleReward(coins, () => {
          b.remove();
          const cn = m.querySelector('.cn');
          if (cn) cn.textContent = '+' + fmt(coins * 2);
        });
      },
      again: () => {
        this.closeModals();
        this.g.again();
      },
      menu: () => {
        this.closeModals();
        this.g.toMenu(true);
      },
    });
    if (won) this.confetti();
  }
  confetti() {
    const box = document.createElement('div');
    box.className = 'confetti';
    const cols = ['#e0b24e', '#8f2428', '#1f6f6a', '#fbf1dc', '#c4692a'];
    for (let i = 0; i < 46; i++) {
      const s = document.createElement('i');
      s.style.left = Math.random() * 100 + '%';
      s.style.background = cols[i % cols.length];
      s.style.animationDelay = Math.random() * 0.8 + 's';
      s.style.animationDuration = 2.2 + Math.random() * 1.6 + 's';
      box.appendChild(s);
    }
    this.root.insertBefore(box, this.mod);
    setTimeout(() => box.remove(), 4800);
  }

  // ---------- стили ----------
  thumb(kind, S) {
    const key = kind + S.id;
    if (this.thumbs[key]) return this.thumbs[key];
    const c = canvas(160, 110);
    const g = c.getContext('2d');
    if (kind === 'board') {
      g.drawImage(woodCanvas(160, 110, S.frame, 3, { sx: 0.02, sy: 0.12 }), 0, 0);
      g.drawImage(woodCanvas(64, 86, S.field, 5, { sx: 0.02, sy: 0.1 }), 12, 12);
      g.drawImage(woodCanvas(64, 86, S.field, 6, { sx: 0.02, sy: 0.1 }), 84, 12);
      for (let i = 0; i < 12; i++) {
        const x = (i < 6 ? 12 : 84) + (i % 6) * 10.6 + 5.3;
        for (const top of [1, 0]) {
          g.beginPath();
          const y0 = top ? 12 : 98;
          g.moveTo(x - 5, y0);
          g.lineTo(x, top ? 46 : 64);
          g.lineTo(x + 5, y0);
          g.fillStyle = (i + top) % 2 ? S.pA : S.pB;
          g.fill();
          g.strokeStyle = S.line;
          g.lineWidth = 0.8;
          g.stroke();
        }
      }
      g.fillStyle = S.metal;
      g.fillRect(77, 12, 6, 86);
    } else if (kind === 'checkers') {
      const draw = (cols, x, y) => {
        g.beginPath();
        g.ellipse(x, y + 7, 34, 26, 0, 0, Math.PI * 2);
        g.fillStyle = shade(cols[0], -0.35);
        g.fill();
        g.save();
        g.beginPath();
        g.ellipse(x, y, 34, 26, 0, 0, Math.PI * 2);
        g.clip();
        g.drawImage(checkerTopCanvas(cols, 128, S.sheen), x - 34, y - 34, 68, 68);
        g.restore();
        g.strokeStyle = 'rgba(0,0,0,.35)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.ellipse(x, y, 34, 26, 0, 0, Math.PI * 2);
        g.stroke();
      };
      draw(S.b, 104, 60);
      draw(S.w, 56, 46);
    } else {
      g.save();
      g.translate(50, 56);
      g.rotate(-0.2);
      g.drawImage(diceFaceCanvas(5, S, 96), -36, -36, 72, 72);
      g.restore();
      g.save();
      g.translate(112, 50);
      g.rotate(0.25);
      g.drawImage(diceFaceCanvas(3, S, 96), -30, -30, 60, 60);
      g.restore();
    }
    return (this.thumbs[key] = c.toDataURL());
  }
  style(tab = 'board') {
    const render = () => {
      const list = SKINS[tab];
      const eq = save.data.eq[tab];
      const pre = tab === 'board' ? 'b_' : tab === 'checkers' ? 'c_' : 'd_';
      return `<div class="tabs">${['board', 'checkers', 'dice']
        .map((k) => `<button class="tab hit ${k === tab ? 'on' : ''}" data-tab="${k}">${k === 'board' ? IC.board : k === 'checkers' ? IC.checker : IC.dice}<span>${esc(t(k === 'board' ? 'boards' : k))}</span></button>`)
        .join('')}</div>
        <div class="sgrid">${list
          .map((S) => {
            const own = this.g.owns(tab, S.id);
            const on = eq === S.id;
            const btn = on
              ? `<span class="eqd">${IC.check}${esc(t('equipped'))}</span>`
              : own
              ? `<button class="btn mid sea hit" data-eq="${S.id}">${esc(t('equip'))}</button>`
              : `<button class="btn mid gold hit" data-buy="${S.id}" ${save.data.coins < S.price ? 'data-poor="1"' : ''}>${IC.coin}<b>${fmt(S.price)}</b></button>`;
            return `<div class="sitem ${on ? 'on' : ''}"><img src="${this.thumb(tab, S)}" alt=""><b>${esc(t(pre + S.id))}</b>${btn}</div>`;
          })
          .join('')}</div>`;
    };
    const m = this.modal({ title: t('style'), body: '', wide: true, onClose: () => this.refreshTop() });
    const pb = m.querySelector('.pb');
    const draw = () => {
      pb.innerHTML = `<div class="coinline">${IC.coin}<b class="coinsN">${fmt(save.data.coins)}</b></div>` + render();
      pb.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => ((tab = b.dataset.tab), draw())));
      pb.querySelectorAll('[data-eq]').forEach((b) => (b.onclick = () => (this.g.equip(tab, b.dataset.eq), draw())));
      pb.querySelectorAll('[data-buy]').forEach(
        (b) =>
          (b.onclick = () => {
            if (b.dataset.poor) {
              this.toast(t('needCoins'));
              audio.play('deny');
              return this.shop();
            }
            if (this.g.buySkin(tab, b.dataset.buy)) {
              this.toast(t('newStyle'));
              draw();
              this.refreshTop();
            }
          })
      );
    };
    draw();
  }

  // ---------- магазин ----------
  shop() {
    const items = iap.items();
    const wait = Math.max(0, (save.data.freeAdAt || 0) + AD_COOLDOWN - Date.now());
    const mm = Math.ceil(wait / 60000);
    const body = `<div class="coinline">${IC.coin}<b class="coinsN">${fmt(save.data.coins)}</b></div>
      <button class="btn big gold hit adbtn" data-a="ad" ${wait ? 'disabled' : ''}>${IC.film}<span>${esc(wait ? t('adWait', { t: mm + (LANG === 'ru' ? ' мин' : ' min') }) : t('adCoins', { n: AD_COINS }))}</span></button>
      <div class="iaps">${items.length ? items.map((x) => itemHTML(x, { owned: t('noAdsOwned') })).join('') : `<p class="center small">${esc(t('shopEmpty'))}</p>`}</div>`;
    const m = this.modal({ title: t('shop'), body, onClose: () => this.refreshTop() });
    this.bind(m, {
      ad: (b) => {
        b.disabled = true;
        this.g.adCoins(() => {
          m.close();
          this.refreshTop();
        });
      },
    });
    m.querySelectorAll('.iap-buy[data-id]').forEach(
      (b) =>
        (b.onclick = async () => {
          m.querySelectorAll('.iap-buy').forEach((e) => (e.disabled = true));
          const ok = await iap.buy(b.dataset.id);
          m.close();
          if (ok) {
            audio.play('buy');
            this.toast(t('thanks'));
          }
          this.refreshTop();
        })
    );
  }

  // ---------- настройки ----------
  settings() {
    const s = save.data.settings;
    const seg = (k, a, b, va = true, vb = false) => `<div class="seg" data-k="${k}"><button class="${s[k] === va ? 'on' : ''}" data-v="1">${esc(t(a))}</button><button class="${s[k] === vb ? 'on' : ''}" data-v="0">${esc(t(b))}</button></div>`;
    const q = this.g.quality === 'low' ? 'low' : 'high';
    const body = `${slidersHTML(s, { music: t('music'), sound: t('sound') }, { music: IC.music, sound: IC.sound })}
      <div class="setrow"><span>${esc(t('quality'))}</span><div class="seg" data-k="quality"><button class="${q === 'high' ? 'on' : ''}" data-v="high">${esc(t('qHigh'))}</button><button class="${q === 'low' ? 'on' : ''}" data-v="low">${esc(t('qLow'))}</button></div></div>
      <div class="setrow"><span>${esc(t('showPips'))}</span>${seg('pips', 'on', 'off')}</div>
      <div class="setrow"><span>${esc(t('autoroll'))}</span>${seg('autoroll', 'on', 'off')}</div>
      <div class="setrow"><span>${esc(t('confirm'))}</span>${seg('confirm', 'on', 'off')}</div>
      <p class="center small">${esc(t('stats', { g: save.data.games, w: save.data.wins }))}</p>`;
    const m = this.modal({ title: t('settings'), body });
    bindSliders(m, s, () => save.write());
    m.querySelectorAll('.seg').forEach((sg) => {
      sg.querySelectorAll('button').forEach((b) => {
        b.onclick = () => {
          const k = sg.dataset.k;
          if (k === 'quality') {
            s.quality = b.dataset.v;
            this.g.setQuality(b.dataset.v);
          } else s[k] = b.dataset.v === '1';
          save.write();
          sg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
          if (this.screen === 'game') this.hudUpdate();
        };
      });
    });
  }

  // ---------- правила ----------
  rules(mode = 'long') {
    const draw = () => `<div class="tabs">${['long', 'short'].map((k) => `<button class="tab hit ${k === mode ? 'on' : ''}" data-tab="${k}"><span>${esc(t(k))}</span></button>`).join('')}</div>
      <ol class="rules">${t(mode === 'long' ? 'rulesLong' : 'rulesShort').map((x) => `<li>${esc(x)}</li>`).join('')}</ol><p class="tipline">${esc(t('rulesTip'))}</p>`;
    const m = this.modal({ title: t('rules'), body: draw(), wide: true });
    const pb = m.querySelector('.pb');
    const bindTabs = () => pb.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => ((mode = b.dataset.tab), (pb.innerHTML = draw()), bindTabs())));
    bindTabs();
  }

  // ---------- рекорды ----------
  async leaderboard() {
    const m = this.modal({ title: t('lbTitle'), body: `<p class="center small">…</p>` });
    const pb = m.querySelector('.pb');
    const mine = `<p class="center">${IC.trophy ? '' : ''}${esc(t('myPoints', { n: fmt(save.data.score) }))}</p>`;
    const r = await sdk.getLeaderboard();
    if (!r.available) {
      pb.innerHTML = mine + `<p class="center small">${esc(t(r.local ? 'lbLocal' : 'lbEmpty'))}</p>`;
      return;
    }
    const rows = r.entries.map((e) => `<div class="lbr ${e.me ? 'me' : ''}"><span class="rk">${e.rank}</span><span class="nm">${esc(e.name || '—')}</span><b>${fmt(e.score)}</b></div>`).join('');
    pb.innerHTML = mine + `<div class="lb">${rows || `<p class="center small">${esc(t('lbEmpty'))}</p>`}</div>` + (r.authorized ? '' : `<div class="row"><button class="btn mid sea hit" data-a="login">${esc(t('login'))}</button></div><p class="center small">${esc(t('lbLogin'))}</p>`);
    this.bind(pb, {
      login: async () => {
        if (await sdk.login()) {
          sdk.submitScore(save.data.score);
          m.close();
          this.leaderboard();
        }
      },
    });
  }

  // ---------- подарок дня ----------
  daily() {
    const d = save.data;
    const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const streak = d.daily.day === yest ? d.daily.streak % 7 : 0;
    const body = `<p class="center small">${esc(t('dailySub'))}</p><div class="days">${DAILY.map(
      (c, i) => `<div class="day ${i < streak ? 'got' : ''} ${i === streak ? 'now' : ''} ${i === 6 ? 'last' : ''}"><span>${esc(t('day', { n: i + 1 }))}</span>${IC.coin}<b>${c}</b></div>`
    ).join('')}</div><div class="row"><button class="btn big gold hit" data-a="take">${esc(t('take'))}</button></div>`;
    const m = this.modal({ title: t('daily'), body });
    this.bind(m, {
      take: () => {
        d.daily = { day: today(), streak: streak + 1 };
        this.g.addCoins(DAILY[streak]);
        audio.play('gift');
        m.close();
        this.home();
        this.toast('+' + DAILY[streak]);
      },
    });
  }
}

// маленькая доска для карточки режима: расстановка длинных или коротких нард
function miniBoard(mode) {
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const x = (i < 6 ? 6 : 52) + (i % 6) * 7 + 3.5;
    pts.push(`<path d="M${x - 3.3} 6L${x} 30L${x + 3.3} 6z" fill="${i % 2 ? '#3b2618' : '#7b2330'}"/><path d="M${x - 3.3} 74L${x} 50L${x + 3.3} 74z" fill="${i % 2 ? '#7b2330' : '#3b2618'}"/>`);
  }
  const ch = (x, y, w) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${w ? '#f2e8d3' : '#2d221c'}" stroke="#3a2314" stroke-width=".8"/>`;
  let c = '';
  if (mode === 'long') {
    for (let k = 0; k < 5; k++) c += ch(91.5, 9.5 + k * 6.4, 1) + ch(9.5, 70.5 - k * 6.4, 0);
  } else {
    const col = (i, top, n, w) => {
      const x = (i < 6 ? 6 : 52) + (i % 6) * 7 + 3.5;
      for (let k = 0; k < n; k++) c += ch(x, top ? 9.5 + k * 6.4 : 70.5 - k * 6.4, w);
    };
    col(11, 0, 2, 0); col(0, 0, 5, 1); col(4, 0, 3, 0); col(6, 0, 5, 0);
    col(11, 1, 2, 1); col(0, 1, 5, 0); col(4, 1, 3, 1); col(6, 1, 5, 1);
  }
  return `<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="98" height="78" rx="5" fill="#5b3a22" stroke="#3a2314" stroke-width="2"/><rect x="5" y="5" width="43" height="70" fill="#e2c391"/><rect x="52" y="5" width="43" height="70" fill="#e2c391"/>${pts.join('')}${c}</svg>`;
}
