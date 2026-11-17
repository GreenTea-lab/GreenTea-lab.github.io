// DOM-интерфейс: меню, настройка партии, таблички игроков, панель хода, карточки владений,
// аукцион, обмен, имущество, карточки «Шанс»/«Казна», итоги, магазин, настройки, рейтинг
import { IC } from './icons.js';
import { t, fmt, money, moneyS } from './i18n.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { iap, itemHTML } from './iap.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import { CELLS, GROUPS, GROUP_CELLS, GROUP_ORDER, TOKENS, PLACES, HOUSES, AD_COINS, AD_COOLDOWN, DAILY, TRANSPORT_RENT, JAIL_FINE, AD_START_BONUS, ROUND_LIMITS, GO_SALARY, HOUSE_RULES } from './data.js';
import * as Bot from './bot.js';
import { dailyQuests, achievements, claimable, claim } from './quests.js';
import { makeToken, makeHouse, makeHotel } from './models.js';
import { paintBackground } from './backgrounds.js';
import * as R from './rules.js';
import * as THREE from 'three';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const today = () => new Date().toISOString().slice(0, 10);
const DIFF = ['easy', 'mid', 'hard'];
const cname = (i) => t('c_' + CELLS[i].key);
const ccolor = (i) => (CELLS[i].group ? GROUPS[CELLS[i].group].color : CELLS[i].type === 'transport' ? '#3a4a44' : '#8a9a94');

export class UI {
  constructor(game, root) {
    this.g = game;
    this.root = root;
    this.screen = '';
    this.modalOpen = false;
    const st = document.createElement('style');
    st.textContent = volumeCss({ accent: '#c8282a', track: '#e6dcc4', thumb: '#fffaf0', muted: '#7a8a82' });
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

  // ---------- общее ----------
  thumb(kind, id) {
    const k = kind + ':' + id;
    if (this._thumbs[k]) return this._thumbs[k];
    let url;
    if (kind === 'token') url = this.g.s3.snapshot(makeToken(id, '#c8282a'), { dist: 2.5, h: 0.35, look: 0.42 });
    else if (kind === 'house') {
      const grp = new THREE.Group();
      const h = makeHouse(id);
      h.position.set(-0.45, 0, 0.25);
      const H = makeHotel(id);
      H.position.set(0.25, 0, -0.15);
      grp.add(h, H);
      const pl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.1), new THREE.MeshStandardMaterial({ color: '#d4ecd6' }));
      pl.position.y = -0.03;
      grp.add(pl);
      url = this.g.s3.snapshot(grp, { dist: id === 'modern' ? 3.6 : 2.8, h: 0.4, look: id === 'modern' ? 0.5 : 0.25 });
    } else url = paintBackground(id, 320, 200).toDataURL('image/jpeg', 0.85);
    this._thumbs[k] = url;
    return url;
  }
  coinsChip() {
    return `<button class="chip hit" data-a="shop">${IC.coin}<b class="coinsN">${fmt(save.data.coins)}</b><i class="plus">+</i></button>`;
  }
  refreshTop() {
    this.root.querySelectorAll('.coinsN').forEach((c) => (c.textContent = fmt(save.data.coins)));
  }
  bind(el, handlers) {
    el.querySelectorAll('[data-a]').forEach((b) => {
      const a = b.dataset.a;
      if (handlers[a]) b.onclick = (e) => handlers[a](b, e);
    });
  }
  toast(text, ms = 2200) {
    const d = document.createElement('div');
    d.className = 'toast' + (this.screen === 'match' ? ' low' : '');
    d.textContent = text;
    this.tst.appendChild(d);
    while (this.tst.children.length > 3) this.tst.firstChild.remove();
    setTimeout(() => d.classList.add('out'), ms);
    setTimeout(() => d.remove(), ms + 400);
  }
  modal({ title, body, wide = false, close = true, onClose, cls = '', head = '' }) {
    this.modalOpen = true;
    const wrap = document.createElement('div');
    wrap.className = 'modal ' + cls;
    wrap.innerHTML = `<div class="panel ${wide ? 'wide' : ''}">${head}${
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
    return wrap;
  }
  closeModals() {
    this.mod.innerHTML = '';
    this.modalOpen = false;
  }

  // свободная от интерфейса область экрана (для камеры)
  freeRegion() {
    const W = window.innerWidth,
      H = window.innerHeight;
    const port = H > W * 1.1;
    if (this.screen === 'match') {
      const top = port ? 128 : 78;
      const bot = port ? 108 : 96;
      return { x0: port ? 0.01 : 0.02, x1: port ? 0.99 : 0.98, y0: top / H, y1: 1 - bot / H };
    }
    if (this.screen === 'home') {
      return port ? { x0: 0.02, x1: 0.98, y0: 0.2, y1: 0.72 } : { x0: 0.3, x1: 0.98, y0: 0.08, y1: 0.98 };
    }
    return { x0: 0, x1: 1, y0: 0, y1: 1 };
  }
  frame() {}

  // ---------- главный экран ----------
  home() {
    this.screen = 'home';
    this.closeModals();
    const d = save.data;
    this.scr.innerHTML = `
      <div class="top"><div class="tl">${this.coinsChip()}</div><div class="tr"><button class="btn round sm hit" data-a="lb" aria-label="${esc(t('lbT'))}">${IC.trophy}</button><button class="btn round sm hit" data-a="settings" aria-label="${esc(t('settings'))}">${IC.gear}</button></div></div>
      <div class="homebox">
        <div class="logo"><b>${esc(t('title'))}</b><i>${esc(t('subtitle'))}</i></div>
        <div class="menu">
          ${d.cur ? `<button class="btn big hit pulse" data-a="cont">${IC.play}<span>${esc(t('continue'))}</span></button><button class="btn mid sand hit" data-a="new">${esc(t('newGame'))}</button>` : `<button class="btn big hit pulse" data-a="new">${IC.play}<span>${esc(t('play'))}</span></button>`}
          <div class="row"><button class="btn mid green hit" data-a="shop">${IC.shop}<span>${esc(t('shop'))}</span></button><button class="btn mid sea hit" data-a="quests">${IC.star}<span>${esc(t('questsB'))}</span>${claimable() ? `<i class="badge">${claimable()}</i>` : ''}</button><button class="btn mid sand hit" data-a="rules">${IC.book}<span>${esc(t('rules'))}</span></button></div>
          <div class="stats">${esc(t('stats', { a: d.stats.games, b: d.stats.wins }))} · ${esc(t('rating', { n: d.rating }))}</div>
        </div>
      </div>`;
    this.bind(this.scr, {
      cont: () => this.g.continueGame(),
      new: () => this.setup(),
      shop: () => this.shop(),
      rules: () => this.rules(),
      settings: () => this.settings(),
      lb: () => this.leaderboard(),
      quests: () => this.quests(),
    });
    this.g.updateRegion && this.g.updateRegion();
    if (d.daily.day !== today()) setTimeout(() => this.screen === 'home' && !this.modalOpen && this.daily(), 600);
  }

  daily() {
    const d = save.data;
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const streak = d.daily.day === y ? Math.min(d.daily.streak + 1, DAILY.length) : 1;
    const amount = DAILY[streak - 1];
    const days = DAILY.map((v, k) => `<div class="day ${k + 1 < streak ? 'got' : k + 1 === streak ? 'now' : ''}"><small>${esc(t('dayN', { n: k + 1 }))}</small>${IC.coin}<b>${v}</b></div>`).join('');
    const m = this.modal({ title: t('dailyT'), body: `<div class="days">${days}</div><div class="row"><button class="btn big green" data-a="take">${esc(t('take', { n: amount }))}</button></div>`, close: false });
    this.bind(m, {
      take: () => {
        d.daily = { day: today(), streak };
        d.coins += amount;
        audio.play('gift');
        save.write();
        this.refreshTop();
        m.close();
      },
    });
  }

  // ---------- новая партия ----------
  setup() {
    const d = save.data;
    const L = { ...d.last, rules: { ...(d.last.rules || {}) } };
    let bonus = false;
    const owned = TOKENS.filter((x) => d.owned[x.id]);
    const seg = (key, opts) => `<div class="seg" data-k="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${L[key] === v ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
    const body = `
      <div class="setrow"><span>${esc(t('players'))}</span>${seg('n', [[2, '2'], [3, '3'], [4, '4']])}</div>
      <div class="setrow"><span>${esc(t('humans'))}</span>${seg('h', [[1, '1'], [2, '2'], [3, '3'], [4, '4']])}</div>
      <div class="setnote">${esc(t('humansNote'))}</div>
      <div class="setrow" data-diff><span>${esc(t('rivals'))}</span>${seg('diff', DIFF.map((k, i) => [i, t(k)]))}</div>
      <div class="setrow"><span>${esc(t('length'))}</span>${seg('limit', ROUND_LIMITS.map((n, i) => [i, n ? t('rounds', { n }) : t('toEnd')]))}</div>
      <div class="setnote">${esc(t('lengthNote'))}</div>
      <div class="setrow col0"><span>${esc(t('houseRules'))}</span></div>
      <div class="hrules">${HOUSE_RULES.map((k) => `<button class="hrule ${L.rules[k] ? 'on' : ''}" data-r="${k}"><i>${IC.check}</i><span><b>${esc(t('hr_' + k))}</b><small>${esc(t('hr_' + k + 'N'))}</small></span></button>`).join('')}</div>
      <div class="setrow col0"><span>${esc(t('yourToken'))}</span></div>
      <div class="tokpick">${owned.map((x) => `<button class="tok ${d.token === x.id ? 'on' : ''}" data-t="${x.id}"><img src="${this.thumb('token', x.id)}" alt=""><small>${esc(t('t_' + x.id))}</small></button>`).join('')}</div>
      <div class="row gap"><button class="btn mid sea" data-a="bonus">${IC.film}<span>${esc(t('adBonus', { n: moneyS(AD_START_BONUS) }))}</span></button></div>
      <div class="row"><button class="btn big" data-a="go">${IC.play}<span>${esc(t('start'))}</span></button></div>`;
    const m = this.modal({ title: t('setupT'), body, wide: true });
    // людей не больше игроков; без ботов сила соперников и бонус за рекламу не нужны
    const sync = () => {
      if (L.h > L.n) L.h = L.n;
      m.querySelectorAll('[data-k="h"] button').forEach((x) => x.classList.toggle('on', +x.dataset.v === L.h));
      m.querySelectorAll('[data-k="h"] button').forEach((x) => (x.disabled = +x.dataset.v > L.n));
      m.querySelector('[data-diff]').style.display = L.h === L.n ? 'none' : '';
      m.querySelector('[data-a="bonus"]').parentElement.style.display = L.h > 1 ? 'none' : '';
    };
    m.querySelectorAll('.seg').forEach((s) =>
      s.querySelectorAll('button').forEach((b) => {
        b.onclick = () => {
          L[s.dataset.k] = +b.dataset.v;
          s.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
          sync();
        };
      })
    );
    m.querySelectorAll('.hrule').forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.r;
        L.rules[k] = !L.rules[k];
        b.classList.toggle('on', L.rules[k]);
      };
    });
    m.querySelectorAll('.tok').forEach((b) => {
      b.onclick = () => {
        d.token = b.dataset.t;
        m.querySelectorAll('.tok').forEach((x) => x.classList.toggle('on', x === b));
      };
    });
    sync();
    const start = () => {
      m.close();
      this.g.newGame(L);
      if (bonus && this.g.M) {
        this.g.M.players[0].money += AD_START_BONUS;
        this.g.M.adBonus = true;
        this.refreshPlayers();
        this.toast(t('adBonusDone', { n: money(AD_START_BONUS) }));
      }
    };
    this.bind(m, {
      bonus: (b) => {
        b.disabled = true;
        sdk.showRewarded(
          () => {
            bonus = true;
            audio.play('gift');
          },
          (ok) => {
            if (ok) start();
            else b.disabled = false;
          }
        );
      },
      go: start,
    });
  }

  // ---------- экран партии ----------
  match() {
    this.screen = 'match';
    this.closeModals();
    const M = this.g.M;
    this.scr.innerHTML = `
      <div class="plates">${M.players.map((p) => `<div class="plate hit" data-p="${p.idx}" style="--pc:${p.color}"><div class="pav"><img src="${this.thumb('token', p.token)}" alt=""></div><div class="pinfo"><b>${esc(p.name)}</b><span class="pm"></span><span class="pst"></span></div></div>`).join('')}</div>
      <div class="hud-r"><div class="roundl"></div><div class="potl" hidden></div><button class="btn round sm hit" data-a="pause" aria-label="${esc(t('pause'))}">${IC.pause}</button><button class="btn round sm hit camr" data-a="camreset" aria-label="${esc(t('camReset'))}" hidden>⟲</button></div>
      <div class="dres"></div>
      <div class="bar"></div>`;
    this.bind(this.scr, { pause: () => this.pauseMenu(), camreset: () => this.g.resetCam() });
    this.scr.querySelectorAll('.plate').forEach((el) => (el.onclick = () => !this.modalOpen && this.playerInfo(+el.dataset.p)));
    this.bar = this.scr.querySelector('.bar');
    this.refreshPlayers();
    if (!save.data.seen.cam && !this.needCoach('intro')) {
      save.data.seen.cam = 1;
      setTimeout(() => this.toast(t('tipCam'), 4500), 800);
    }
  }
  camBtn(on) {
    const b = this.scr && this.scr.querySelector('.camr');
    if (b) b.hidden = !on;
  }
  plate(i) {
    return this.scr.querySelector(`.plate[data-p="${i}"]`);
  }
  refreshPlayers() {
    const M = this.g.M;
    if (!M || this.screen !== 'match') return;
    for (const p of M.players) {
      const el = this.plate(p.idx);
      if (!el) continue;
      el.querySelector('.pm').textContent = p.out ? '—' : moneyS(p.money);
      const st = [];
      if (p.inJail) st.push('🔒');
      if (p.free.length) st.push('🔑');
      const props = R.ownedBy(M, p.idx).length;
      if (props) st.push(`🏠${props}`);
      el.querySelector('.pst').textContent = st.join(' ');
      el.classList.toggle('out', p.out);
      el.classList.toggle('active', M.cur === p.idx && !M.over);
    }
    const rl = this.scr.querySelector('.roundl');
    if (rl) rl.textContent = M.limit ? t('roundOf', { n: M.round, m: M.limit }) : t('round', { n: M.round });
    const pl = this.scr.querySelector('.potl');
    if (pl) {
      pl.hidden = !(M.rules && M.rules.pot);
      pl.textContent = t('potL', { n: moneyS(M.pot || 0) });
    }
  }
  setActive(i) {
    this.refreshPlayers();
    void i;
  }
  money(i, delta, why) {
    const el = this.plate(i);
    if (!el || !delta) return;
    const f = document.createElement('div');
    f.className = 'mfloat ' + (delta > 0 ? 'plus' : 'minus');
    f.textContent = (delta > 0 ? '+' : '−') + moneyS(Math.abs(delta)).replace(/^-/, '');
    el.appendChild(f);
    setTimeout(() => f.remove(), 1500);
    if (why) this.toast(why, 1400);
    this.refreshPlayers();
  }
  say(i, text) {
    const el = this.plate(i);
    if (!el) return;
    const s = document.createElement('div');
    s.className = 'say';
    s.textContent = text;
    el.appendChild(s);
    setTimeout(() => s.remove(), 2000);
  }
  flash(i, text, cls) {
    const el = this.plate(i);
    if (el) {
      el.classList.add('fl-' + cls);
      setTimeout(() => el.classList.remove('fl-' + cls), 1200);
    }
    const s = document.createElement('div');
    s.className = 'stamp ' + cls;
    s.innerHTML = `<span>${esc(text)}</span>`;
    this.fx.appendChild(s);
    setTimeout(() => s.remove(), 1900);
  }
  diceResult(a, b) {
    const el = this.scr.querySelector('.dres');
    if (!el) return;
    el.innerHTML = `<b>${a}</b><i>+</i><b>${b}</b><i>=</i><em>${a + b}</em>`;
    el.classList.remove('on');
    void el.offsetWidth;
    el.classList.add('on');
    clearTimeout(this._dt);
    this._dt = setTimeout(() => el.classList.remove('on'), 2200);
  }

  // нижняя панель хода
  setBar(html, handlers) {
    if (!this.bar) return;
    this.bar.innerHTML = html;
    this.bind(this.bar, handlers);
  }
  clearBar() {
    if (this.bar) this.bar.innerHTML = '';
  }
  sideBtns() {
    return `<button class="btn mid sand hit" data-a="manage">${IC.house}<span>${esc(t('manage'))}</span></button><button class="btn mid sand hit" data-a="trade">${IC.trade}<span>${esc(t('trade'))}</span></button>`;
  }
  autoOn() {
    return save.data.settings.auto !== false && !(this.g.M && this.g.M.hot);
  }
  preRoll(P, again) {
    return new Promise((res) => {
      if (this.autoOn()) {
        // бросок выполняется сам, если игрок не успел нажать кнопку
        let left = again ? 900 : 1700;
        const tick = () => {
          const b = this.bar && this.bar.querySelector('[data-a="roll"]');
          if (!b) return;
          if (this.g.paused || this.modalOpen) left = Math.max(left, 600);
          else left -= 100;
          if (left <= 0) b.click();
          else setTimeout(tick, 100);
        };
        setTimeout(tick, 100);
      }
      this.setBar(`${this.sideBtns()}<button class="btn big hit pulse" data-a="roll">${IC.dice}<span>${esc(again ? t('rollAgain') : t('roll'))}</span></button>`, {
        roll: () => {
          this.clearBar();
          res();
        },
        manage: () => this.manage(),
        trade: () => this.trade(),
      });
    });
  }
  postRoll(P) {
    return new Promise((res) => {
      // нечем управлять — ход заканчивается сам
      if (this.autoOn() && P && !R.ownedBy(this.g.M, P.idx).length) {
        setTimeout(res, 700);
        return;
      }
      this.setBar(`${this.sideBtns()}<button class="btn big green hit" data-a="end">${IC.end}<span>${esc(t('endTurn'))}</span></button>`, {
        end: () => {
          this.clearBar();
          res();
        },
        manage: () => this.manage(),
        trade: () => this.trade(),
      });
    });
  }

  // ---------- карточка владения ----------
  deedHTML(i) {
    const c = CELLS[i];
    const M = this.g.M;
    const o = M && M.own[i];
    let rows = '';
    if (c.type === 'city') {
      const L = t('rentList');
      rows = c.rent.map((r, k) => `<tr class="${o && o.h === k && !o.m ? 'cur' : ''}"><td>${esc(L[k])}</td><td>${esc(money(r))}</td></tr>`).join('');
      rows += `<tr class="note"><td colspan="2">${esc(t('rentSet'))}</td></tr>`;
      rows += `<tr class="note"><td colspan="2">${esc(t('houseCost', { n: money(GROUPS[c.group].house) }))}</td></tr>`;
    } else if (c.type === 'transport') {
      rows = `<tr class="note"><td colspan="2">${esc(t('trRent', { a: money(TRANSPORT_RENT[0]), b: money(TRANSPORT_RENT[1]), c: money(TRANSPORT_RENT[2]), d: money(TRANSPORT_RENT[3]) }))}</td></tr>`;
    } else rows = `<tr class="note"><td colspan="2">${esc(t('utRent'))}</td></tr>`;
    rows += `<tr class="note"><td colspan="2">${esc(t('mortgageV', { n: money(c.mortgage) }))}</td></tr>`;
    let own = t('noOwner');
    if (o) own = t('owner', { n: this.g.nm(M.players[o.o]) }) + (o.m ? ' · ' + t('mortgaged') : '');
    const head = c.type === 'city' ? `<div class="dh" style="background:${GROUPS[c.group].color};color:${['yellow', 'sky'].includes(c.group) ? '#1d2a24' : '#fff'}">` : `<div class="dh dark">`;
    return `<div class="deed">${head}<b>${esc(cname(i))}</b><small>${esc(money(c.price))}</small></div><table>${rows}</table><div class="down">${esc(own)}</div></div>`;
  }
  cellInfo(i) {
    this.modal({ title: '', body: this.deedHTML(i), cls: 'deedm' });
  }
  askBuy(i) {
    const c = CELLS[i];
    const P = this.g.M.players[this.g.me()];
    return new Promise((res) => {
      const can = P.money >= c.price;
      const m = this.modal({
        title: '',
        close: false,
        cls: 'deedm',
        body: `${this.deedHTML(i)}${this.tipsHTML(this.buyAdvice(i))}<div class="row"><button class="btn mid sand" data-a="auc">${IC.hammer}<span>${esc(t('auction'))}</span></button><button class="btn mid green" data-a="buy" ${can ? '' : 'disabled'}>${esc(can ? t('buyFor', { n: money(c.price) }) : t('noMoney'))}</button></div>`,
      });
      this.bind(m, {
        buy: () => {
          m.close();
          res('buy');
        },
        auc: () => {
          m.close();
          res('auction');
        },
      });
    });
  }

  askJail(P) {
    return new Promise((res) => {
      const m = this.modal({
        title: t('jailT'),
        close: false,
        body: `<p>${esc(t('jailTxt', { n: 3 - P.jail }))}</p><div class="col">
          <button class="btn mid" data-a="pay" ${P.money >= JAIL_FINE ? '' : 'disabled'}>${esc(t('jailPay', { n: money(JAIL_FINE) }))}</button>
          ${P.free.length ? `<button class="btn mid green" data-a="card">${IC.key}<span>${esc(t('jailCard'))}</span></button>` : ''}
          <button class="btn mid sea" data-a="roll">${IC.dice}<span>${esc(t('jailRoll'))}</span></button>
          ${!this.g.M.hot && !this.g.M.jailAd ? `<button class="btn mid sand" data-a="ad">${IC.film}<span>${esc(t('jailAd'))}</span></button>` : ''}</div>`,
      });
      const go = (v) => () => {
        m.close();
        res(v);
      };
      this.bind(m, {
        pay: go('pay'),
        card: go('card'),
        roll: go('roll'),
        ad: (b) => {
          b.disabled = true;
          audio.suspend('ad');
          sdk.showRewarded(null, (ok) => {
            audio.resume('ad');
            if (ok) go('ad')();
            else b.disabled = false;
          });
        },
      });
    });
  }

  // ---------- аукцион ----------
  auctionOpen(A) {
    const me = this.g.me();
    const fair = me >= 0 && this.hints() ? Math.round(Bot.cellWorth(this.g.M, me, A.i) / 10) * 10 : 0;
    this._auc = this.modal({ title: t('auctionT'), close: false, cls: 'aucm', body: `<div class="aucw">${this.deedHTML(A.i)}<div class="aucr"><p class="small">${esc(t('auctionTxt'))}</p>${fair ? this.tipsHTML([{ c: '', s: t('advFair', { n: moneyS(fair) }) }]) : ''}<div class="abid"></div><div class="alist"></div><div class="actl"></div></div></div>` });
    this.auctionUpdate(A);
  }
  auctionUpdate(A) {
    const m = this._auc;
    if (!m) return;
    const M = this.g.M;
    const nm = (i) => this.g.nm(M.players[i]);
    m.querySelector('.abid').innerHTML = `<b>${esc(money(A.bid))}</b><small>${esc(t('leader', { n: A.leader >= 0 ? nm(A.leader) : t('nobody') }))}</small>`;
    const last = {};
    for (const e of A.log) last[e.idx] = e;
    m.querySelector('.alist').innerHTML = M.players
      .filter((p) => !p.out)
      .map((p) => {
        const e = last[p.idx];
        const st = !A.active.has(p.idx) ? t('pass') : e && e.bid ? money(e.bid) : '…';
        return `<div class="arow ${A.leader === p.idx ? 'lead' : ''} ${A.active.has(p.idx) ? '' : 'gone'}" style="--pc:${p.color}"><i></i><span>${esc(nm(p.idx))}</span><b>${esc(st)}</b></div>`;
      })
      .join('');
  }
  auctionTurn(A, step) {
    const P = this.g.M.players[this.g.me()];
    const m = this._auc;
    return new Promise((res) => {
      const opts = [step, step * 5, step * 10].map((s) => A.bid + s).filter((v, k, a) => a.indexOf(v) === k);
      const ctl = m.querySelector('.actl');
      const who = this.g.M.hot ? `<p class="small center">${esc(t('turnOf', { n: P.name }))}</p>` : '';
      ctl.innerHTML = `${who}<div class="row">${opts.map((v) => `<button class="btn sm2" data-v="${v}" ${P.money >= v ? '' : 'disabled'}>${esc(moneyS(v))}</button>`).join('')}<button class="btn sm2 sand" data-v="pass">${esc(t('pass'))}</button></div>`;
      ctl.querySelectorAll('button').forEach((b) => {
        b.onclick = () => {
          ctl.innerHTML = '';
          res(b.dataset.v === 'pass' ? 'pass' : +b.dataset.v);
        };
      });
    });
  }
  auctionClose() {
    if (this._auc) this._auc.close();
    this._auc = null;
  }

  // ---------- карточки «Шанс» / «Казна» ----------
  cardText(card) {
    const key = card.k + '_card';
    return t(key, { n: money(card.n || GO_SALARY), a: money(card.house || 0), b: money(card.hotel || 0) });
  }
  showCard(card, P) {
    return new Promise((res) => {
      const who = this.g.nm(P);
      const m = this.modal({
        title: '',
        close: false,
        cls: 'cardm',
        body: `<div class="gcard ${card.deck}"><div class="gch">${card.deck === 'chance' ? '?' : '₽'}<b>${esc(t(card.deck))}</b></div><p>${esc(this.cardText(card))}</p><small>${esc(who)}</small></div>${P.bot ? '' : `<div class="row"><button class="btn mid" data-a="ok">${esc(t('ok'))}</button></div>`}`,
      });
      const done = () => {
        m.close();
        res();
      };
      if (P.bot) setTimeout(done, 1900 * this.g.spd);
      else this.bind(m, { ok: done });
    });
  }

  // ---------- имущество ----------
  propsHTML(debt) {
    const M = this.g.M;
    const p = this.g.me();
    const mine = R.ownedBy(M, p);
    if (!mine.length) return `<p>${esc(t('noProps'))}</p>`;
    const groups = [...GROUP_ORDER, 'transport', 'util'];
    let html = `<p class="small">${esc(t('buildHint'))}</p>`;
    for (const g of groups) {
      const cells = mine.filter((i) => (CELLS[i].group || CELLS[i].type) === g);
      if (!cells.length) continue;
      const full = GROUP_CELLS[g] && R.hasSet(M, p, g);
      html += `<div class="pgrp ${full ? 'full' : ''}">`;
      for (const i of cells) {
        const o = M.own[i];
        const hs = o.h === 5 ? `<span class="hh hotel">${esc(t('hotel'))}</span>` : o.h ? `<span class="hh">${'⌂'.repeat(o.h)}</span>` : '';
        const btn = (a, label, on) => `<button class="btn sm2 ${a === 'build' ? 'green' : a === 'unmortgage' ? 'sea' : 'sand'}" data-act="${a}" data-i="${i}" ${on ? '' : 'disabled'}>${esc(label)}</button>`;
        let btns = '';
        if (CELLS[i].type === 'city' && full && !debt) btns += btn('build', `+ ${t('build')} ${moneyS(R.houseCost(i))}`, R.canBuild(M, p, i));
        if (o.h) btns += btn('sell', `${t('sellH')} +${moneyS(R.houseCost(i) / 2)}`, R.canSell(M, p, i));
        if (o.m) {
          if (!debt) btns += btn('unmortgage', `${t('unmortgage')} ${moneyS(R.unmortgageCost(i))}`, R.canUnmortgage(M, p, i));
        } else if (!o.h) btns += btn('mortgage', `${t('mortgage')} +${moneyS(CELLS[i].mortgage)}`, R.canMortgage(M, p, i));
        html += `<div class="prow ${o.m ? 'mort' : ''}"><i style="background:${ccolor(i)}"></i><button class="pname" data-info="${i}">${esc(cname(i))}</button>${hs}<div class="pbtns">${btns}</div></div>`;
      }
      html += '</div>';
    }
    return html;
  }
  bindProps(root, refresh) {
    root.querySelectorAll('[data-act]').forEach((b) => {
      b.onclick = () => {
        if (this.g.act(b.dataset.act, +b.dataset.i)) refresh();
      };
    });
    root.querySelectorAll('[data-info]').forEach((b) => (b.onclick = () => this.cellInfo(+b.dataset.info)));
  }
  manage() {
    const P = this.g.M.players[this.g.me()];
    const m = this.modal({ title: t('myProps'), wide: true, body: `<div class="mymoney"></div><div class="plist"></div>` });
    const refresh = () => {
      m.querySelector('.mymoney').textContent = money(P.money);
      m.querySelector('.plist').innerHTML = this.propsHTML(false);
      this.bindProps(m, refresh);
    };
    refresh();
  }
  raiseFunds(P, need, hopeless = false) {
    return new Promise((res) => {
      const m = this.modal({
        title: t('debtT', { n: money(need) }),
        wide: true,
        close: false,
        body: `<p class="small">${esc(t('debtTxt'))}</p><div class="mymoney"></div><div class="plist"></div><div class="row"><button class="btn mid sand" data-a="bk">${esc(t('bankrupt'))}</button><button class="btn mid green" data-a="pay">${esc(t('pay'))}</button></div>`,
      });
      const refresh = () => {
        m.querySelector('.mymoney').textContent = `${money(P.money)} / ${money(need)}`;
        m.querySelector('.plist').innerHTML = this.propsHTML(true);
        m.querySelector('[data-a="pay"]').disabled = P.money < need;
        this.bindProps(m, refresh);
      };
      refresh();
      void hopeless;
      this.bind(m, {
        pay: () => {
          if (P.money >= need) {
            m.close();
            res();
          }
        },
        bk: () => {
          const c = this.modal({ title: t('bankrupt'), body: `<p>${esc(t('bankruptQ'))}</p><div class="row"><button class="btn mid sand" data-a="no">${esc(t('decline'))}</button><button class="btn mid" data-a="yes">${esc(t('bankrupt'))}</button></div>` });
          this.bind(c, {
            no: () => c.close(),
            yes: () => {
              c.close();
              m.close();
              res();
            },
          });
        },
      });
    });
  }

  // ---------- обмен ----------
  trade(pre) {
    const M = this.g.M;
    const me = this.g.me();
    const rivals = M.players.filter((p) => p.idx !== me && !p.out);
    if (!rivals.length) return;
    const T = { a: me, b: rivals.some((p) => p.idx === pre) ? pre : rivals[0].idx, cellsA: [], cellsB: [], moneyA: 0, moneyB: 0 };
    const m = this.modal({ title: t('tradeT'), wide: true, body: `<div class="trw"></div>` });
    const chips = (p, sel) =>
      R.ownedBy(M, p)
        .filter((i) => R.tradable(M, p, i))
        .map((i) => `<button class="tchip ${sel.includes(i) ? 'on' : ''} ${M.own[i].m ? 'mort' : ''}" data-c="${i}" data-p="${p}"><i style="background:${ccolor(i)}"></i>${esc(cname(i))}</button>`)
        .join('') || '<small class="muted">—</small>';
    const stepper = (k, v, max) => `<div class="mstep" data-k="${k}"><button data-d="-100">−100</button><button data-d="-10">−10</button><b>${esc(moneyS(v))}</b><button data-d="10">+10</button><button data-d="100">+100</button><small>/ ${esc(moneyS(max))}</small></div>`;
    const render = () => {
      const B = M.players[T.b];
      m.querySelector('.trw').innerHTML = `
        <div class="setrow"><span>${esc(t('tradeWith'))}</span><div class="seg">${rivals.map((p) => `<button data-b="${p.idx}" class="${T.b === p.idx ? 'on' : ''}">${esc(p.name)}</button>`).join('')}</div></div>
        <div class="tcols"><div class="tcol"><h4>${esc(t('youGive'))}</h4><div class="tchips">${chips(me, T.cellsA)}</div>${stepper('moneyA', T.moneyA, M.players[me].money)}</div>
        <div class="tcol"><h4>${esc(t('youTake'))} · ${esc(B.name)}</h4><div class="tchips">${chips(T.b, T.cellsB)}</div>${stepper('moneyB', T.moneyB, B.money)}</div></div>
        ${this.tipsHTML(this.tradeAdvice(T))}
        <div class="row"><button class="btn mid green" data-a="go" ${T.cellsA.length + T.cellsB.length + T.moneyA + T.moneyB > 0 ? '' : 'disabled'}>${IC.trade}<span>${esc(t('propose'))}</span></button></div>`;
      m.querySelectorAll('[data-b]').forEach(
        (b) =>
          (b.onclick = () => {
            T.b = +b.dataset.b;
            T.cellsB = [];
            T.moneyB = 0;
            render();
          })
      );
      m.querySelectorAll('.tchip').forEach(
        (b) =>
          (b.onclick = () => {
            const arr = +b.dataset.p === me ? T.cellsA : T.cellsB;
            const i = +b.dataset.c;
            const k = arr.indexOf(i);
            if (k >= 0) arr.splice(k, 1);
            else arr.push(i);
            render();
          })
      );
      m.querySelectorAll('.mstep').forEach((s) =>
        s.querySelectorAll('button').forEach(
          (b) =>
            (b.onclick = () => {
              const k = s.dataset.k;
              const max = k === 'moneyA' ? M.players[me].money : M.players[T.b].money;
              T[k] = Math.max(0, Math.min(Math.floor(max / 10) * 10, T[k] + +b.dataset.d));
              render();
            })
        )
      );
      this.bind(m, {
        go: async (btn) => {
          btn.disabled = true;
          const ok = await this.g.proposeTrade({ ...T, cellsA: [...T.cellsA], cellsB: [...T.cellsB] });
          if (ok) m.close();
          else btn.disabled = false;
        },
      });
    };
    render();
  }
  askOffer(tr) {
    const M = this.g.M;
    const A = M.players[tr.a];
    const list = (cells, mny) => [...cells.map((i) => `<div class="ochip"><i style="background:${ccolor(i)}"></i>${esc(cname(i))}</div>`), mny ? `<div class="ochip money">${esc(money(mny))}</div>` : ''].join('') || '—';
    return new Promise((res) => {
      const m = this.modal({
        title: t('offerT', { n: A.name }),
        close: false,
        body: `<p>${esc(t('offerTxt', { n: A.name }))}</p><div class="tcols"><div class="tcol"><h4>${esc(t('youTake'))}</h4>${list(tr.cellsA, tr.moneyA)}</div><div class="tcol"><h4>${esc(t('youGive'))}</h4>${list(tr.cellsB, tr.moneyB)}</div></div>${this.tipsHTML(this.offerAdvice(tr))}<div class="row"><button class="btn mid sand" data-a="no">${esc(t('decline'))}</button><button class="btn mid green" data-a="yes">${esc(t('accept'))}</button></div>`,
      });
      m.querySelectorAll('.ochip').forEach((c) => void c);
      this.bind(m, {
        yes: () => {
          m.close();
          res(true);
        },
        no: () => {
          m.close();
          res(false);
        },
      });
    });
  }

  // ---------- итоги ----------
  results({ st, place, coins, win, hot }) {
    const M = this.g.M;
    this.clearBar();
    const rows = st
      .map((idx, k) => {
        const p = M.players[idx];
        return `<div class="rrow ${p.bot || M.hot ? '' : 'me'}" style="--pc:${p.color}"><em>${k + 1}</em><img src="${this.thumb('token', p.token)}" alt=""><span>${esc(this.g.nm(p))}</span><b>${esc(p.out ? t('bankrupt') : moneyS(R.worth(M, idx)))}</b></div>`;
      })
      .join('');
    const m = this.modal({
      title: hot ? t('gameOver') : win ? t('youWin') : t('gameOver'),
      close: false,
      wide: true,
      body: `<p class="center">${esc(hot ? t('winName', { n: M.players[st[0]].name }) + ' ' + t('hotNote') : win ? t('winYou') : t('youPlace', { n: place }))}</p><div class="resg"><div><div class="rlist">${rows}</div>
        ${coins ? `<div class="res"><div>${IC.coin}<b class="rc">+${coins}</b></div></div><div class="row"><button class="btn mid sea" data-a="x2">${IC.film}<span>${esc(t('x2'))}</span></button></div>` : ''}
        <div class="row"><button class="btn mid sand" data-a="menu">${IC.home}<span>${esc(t('menu'))}</span></button><button class="btn mid green" data-a="again">${IC.play}<span>${esc(t('again'))}</span></button></div></div><div>${this.chartHTML(st)}</div></div>`,
    });
    this.refreshTop();
    this.bind(m, {
      x2: (b) => {
        b.disabled = true;
        sdk.showRewarded(() => {
          save.data.coins += coins;
          save.write();
          audio.play('gift');
          const rc = m.querySelector('.rc');
          if (rc) rc.textContent = '+' + coins * 2;
          this.refreshTop();
        });
      },
      menu: () => this.g.interstitial(() => this.g.toHome()),
      again: () =>
        this.g.interstitial(() => {
          this.g.toHome();
          this.setup();
        }),
    });
  }

  // ---------- пауза ----------
  pauseMenu() {
    if (this.mod.querySelector('.pausem')) return;
    this.g.paused = true;
    sdk.gameplay(false);
    const st = save.data.settings;
    const m = this.modal({
      title: t('pause'),
      cls: 'pausem',
      onClose: () => {
        this.g.paused = false;
        save.write();
        if (this.g.state === 'match') sdk.gameplay(true);
        this.g.updateRegion();
      },
      body: `${slidersHTML(st, { music: t('music'), sound: t('sound') }, { music: IC.music, sound: IC.sound })}${this.optRows()}
        <div class="col"><button class="btn mid green" data-a="resume">${IC.play}<span>${esc(t('resume'))}</span></button><button class="btn mid sand" data-a="rules">${IC.book}<span>${esc(t('rules'))}</span></button><button class="btn mid sand" data-a="quit">${IC.home}<span>${esc(t('quit'))}</span></button><button class="btn sm2 sand" data-a="give">${IC.flag}<span>${esc(t('surrender'))}</span></button></div><p class="small center">${esc(t('quitNote'))}</p>`,
    });
    bindSliders(m, st, () => save.write());
    this.bindOpts(m);
    this.bind(m, {
      resume: () => m.close(),
      rules: () => this.rules(),
      quit: () => {
        this.g.paused = false;
        this.g.quitToMenu();
      },
      give: () => {
        this.g.paused = false;
        m.remove();
        this.modalOpen = false;
        this.g.surrender();
      },
    });
  }
  optRows() {
    const st = save.data.settings;
    const sp = st.speed || 0;
    return `<div class="setrow"><span>${esc(t('speed'))}</span><div class="seg" data-o="speed">${['speedN', 'speedF', 'speedVF'].map((k, i) => `<button data-v="${i}" class="${sp === i ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div></div>
      <div class="setrow"><span>${esc(t('hintsO'))}</span><div class="seg" data-o="hints"><button data-v="1" class="${st.hints !== false ? 'on' : ''}">${esc(t('onT'))}</button><button data-v="0" class="${st.hints === false ? 'on' : ''}">${esc(t('offT'))}</button></div></div>
      <div class="setrow"><span>${esc(t('autoRoll'))}</span><div class="seg" data-o="auto"><button data-v="1" class="${st.auto !== false ? 'on' : ''}">${esc(t('onT'))}</button><button data-v="0" class="${st.auto === false ? 'on' : ''}">${esc(t('offT'))}</button></div></div>
      <div class="setrow"><span>${esc(t('camera'))}</span><div class="seg" data-o="cam"><button data-v="follow" class="${st.cam !== 'fixed' ? 'on' : ''}">${esc(t('camFollow'))}</button><button data-v="fixed" class="${st.cam === 'fixed' ? 'on' : ''}">${esc(t('camFixed'))}</button></div></div>`;
  }
  bindOpts(m) {
    const st = save.data.settings;
    m.querySelectorAll('[data-o]').forEach((s) =>
      s.querySelectorAll('button').forEach(
        (b) =>
          (b.onclick = () => {
            if (s.dataset.o === 'speed') st.speed = +b.dataset.v;
            else if (s.dataset.o === 'hints') {
              st.hints = b.dataset.v === '1';
              // включили подсказки снова — обучение можно пройти заново
              if (st.hints) save.data.tut = {};
            }
            else if (s.dataset.o === 'auto') st.auto = b.dataset.v === '1';
            else st.cam = b.dataset.v;
            s.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
            save.write();
          })
      )
    );
  }

  settings() {
    const st = save.data.settings;
    const m = this.modal({ title: t('settingsT'), body: `${slidersHTML(st, { music: t('music'), sound: t('sound') }, { music: IC.music, sound: IC.sound })}${this.optRows()}`, onClose: () => save.write() });
    bindSliders(m, st, () => save.write());
    this.bindOpts(m);
  }
  rules() {
    this.modal({ title: t('rules'), wide: true, body: `<div class="rules">${t('rulesHTML')}</div>` });
  }

  async leaderboard() {
    const m = this.modal({ title: t('lbT'), body: `<div class="lb">…</div>` });
    const r = await sdk.getLeaderboard();
    const box = m.querySelector('.lb');
    if (!box) return;
    if (!r.available) {
      box.innerHTML = `<p class="center">${esc(t('lbLocal'))}</p><p class="center">${esc(t('rating', { n: save.data.rating }))}</p>`;
      return;
    }
    box.innerHTML =
      r.entries.map((e) => `<div class="rrow ${e.me ? 'me' : ''}"><em>${e.rank}</em><span>${esc(e.name || t('anon'))}</span><b>${fmt(e.score)}</b></div>`).join('') +
      (r.authorized ? '' : `<p class="center small">${esc(t('lbLogin'))}</p><div class="row"><button class="btn mid" data-a="login">${esc(t('login'))}</button></div>`);
    this.bind(box, {
      login: async () => {
        if (await sdk.login()) {
          sdk.submitScore(save.data.rating);
          m.close();
          this.leaderboard();
        }
      },
    });
  }

  // ---------- магазин ----------
  shop(tab = 'tokens') {
    const d = save.data;
    const m = this.modal({ title: t('shopT'), wide: true, cls: 'shopm', head: '', body: `<div class="tabs"></div><div class="shopb"></div>` });
    const tabs = [
      ['tokens', t('tokens')],
      ['places', t('places')],
      ['houses', t('houseStyles')],
      ['coins', t('coinsFor')],
    ];
    const render = () => {
      m.querySelector('.tabs').innerHTML = tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-tab="${k}">${esc(l)}</button>`).join('') + `<div class="tcoins">${this.coinsChip()}</div>`;
      m.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => ((tab = b.dataset.tab), render())));
      m.querySelector('.tcoins .chip').onclick = () => ((tab = 'coins'), render());
      const box = m.querySelector('.shopb');
      if (tab === 'coins') {
        const wait = Math.max(0, d.freeAdAt + AD_COOLDOWN - Date.now());
        const mm = Math.ceil(wait / 60000);
        box.innerHTML = `<div class="iap-list2"><div class="iap-item"><div class="iap-ic">${IC.film}</div><div class="iap-tx"><b>${esc(t('freeCoins', { n: AD_COINS }))}</b></div><button class="iap-buy" data-a="ad" ${wait ? 'disabled' : ''}>${esc(wait ? t('freeCoinsWait', { n: mm }) : '▶')}</button></div>${
          iap.available() ? iap.items().map((x) => itemHTML(x, { owned: t('owned') })).join('') : `<div class="iap-empty">${esc(t('iapEmpty'))}</div>`
        }</div>`;
        this.bind(box, {
          ad: (b) => {
            b.disabled = true;
            sdk.showRewarded(() => {
              d.freeAdAt = Date.now();
              d.coins += AD_COINS;
              audio.play('gift');
              save.write();
              this.refreshTop();
              render();
            });
          },
        });
        box.querySelectorAll('.iap-buy[data-id]').forEach((b) => {
          b.onclick = async () => {
            box.querySelectorAll('.iap-buy').forEach((e) => (e.disabled = true));
            const ok = await iap.buy(b.dataset.id);
            if (ok) audio.play('buy');
            this.refreshTop();
            render();
          };
        });
        return;
      }
      const list = tab === 'tokens' ? TOKENS : tab === 'places' ? PLACES : HOUSES;
      const cur = tab === 'tokens' ? d.token : tab === 'places' ? d.place : d.houses;
      const kind = tab === 'tokens' ? 'token' : tab === 'places' ? 'place' : 'house';
      const pre = tab === 'tokens' ? 't_' : tab === 'places' ? 'p_' : 'h_';
      box.innerHTML = `<div class="sgrid ${tab}">${list
        .map((x) => {
          const own = d.owned[x.id] || x.price === 0;
          const btn = cur === x.id ? `<button class="btn sm2 sand" disabled>${esc(t('inUse'))}</button>` : own ? `<button class="btn sm2 green" data-use="${x.id}">${esc(t('use'))}</button>` : `<button class="btn sm2" data-buy="${x.id}" ${d.coins >= x.price ? '' : 'disabled'}>${IC.coin}<span>${fmt(x.price)}</span></button>`;
          return `<div class="sitem ${cur === x.id ? 'on' : ''}"><img src="${this.thumb(kind, x.id)}" alt=""><b>${esc(t(pre + x.id))}</b>${btn}</div>`;
        })
        .join('')}</div>`;
      const apply = (id) => {
        if (tab === 'tokens') d.token = id;
        else if (tab === 'places') this.g.setPlace(id);
        else this.g.setHouses(id);
        save.write();
      };
      box.querySelectorAll('[data-use]').forEach((b) => (b.onclick = () => (apply(b.dataset.use), render())));
      box.querySelectorAll('[data-buy]').forEach(
        (b) =>
          (b.onclick = () => {
            const x = list.find((q) => q.id === b.dataset.buy);
            if (d.coins < x.price) return;
            d.coins -= x.price;
            d.owned[x.id] = 1;
            audio.play('buy');
            apply(x.id);
            save.flush();
            this.refreshTop();
            render();
          })
      );
    };
    render();
  }

  // ---------- обучение ----------
  hints() {
    return save.data.settings.hints !== false;
  }
  needCoach(key) {
    const d = save.data;
    if (!this.hints() || d.tut.skip || d.tut[key]) return false;
    return !(window.__MG_DEBUG && window.__MG_DEBUG.allbots);
  }
  coach(key, vars) {
    return new Promise((res) => {
      const d = save.data;
      d.tut[key] = 1;
      const m = this.modal({
        title: t('tipT'),
        close: false,
        cls: 'coachm',
        body: `<div class="coach"><div class="cic">${IC.book}</div><p>${t('tut_' + key, vars)}</p></div><div class="row"><button class="btn sm2 sand" data-a="skip">${esc(t('tutSkip'))}</button><button class="btn mid green" data-a="ok">${esc(t('gotIt'))}</button></div>`,
      });
      const done = () => {
        m.close();
        save.write();
        res();
      };
      this.bind(m, {
        ok: done,
        skip: () => {
          d.tut.skip = 1;
          done();
        },
      });
    });
  }

  // ---------- советы ----------
  tipsHTML(list) {
    if (!this.hints() || !list || !list.length) return '';
    return `<div class="tips">${list.map((x) => `<div class="tip ${x.c}">${esc(x.s)}</div>`).join('')}</div>`;
  }
  buyAdvice(i) {
    const M = this.g.M;
    const p = this.g.me();
    const c = CELLS[i];
    const P = M.players[p];
    const out = [];
    if (c.type === 'city') {
      const g = GROUP_CELLS[c.group];
      const mine = g.filter((k) => R.owner(M, k) === p).length;
      const others = [...new Set(g.map((k) => R.owner(M, k)).filter((o) => o >= 0 && o !== p))];
      if (mine === g.length - 1) out.push({ c: 'good', s: t('advSet') });
      else {
        for (const o of others) if (g.filter((k) => R.owner(M, k) === o).length === g.length - 1) out.push({ c: 'good', s: t('advBlock', { n: this.g.nm(M.players[o]) }) });
        if (!out.length && mine > 0 && !others.length) out.push({ c: 'good', s: t('advMine', { a: mine, b: g.length }) });
        if (!out.length && others.length > 1) out.push({ c: '', s: t('advSplit') });
        if (!out.length && !mine && !others.length) out.push({ c: '', s: t('advFirst', { n: g.length }) });
      }
    } else if (c.type === 'transport') {
      const n = R.ownedBy(M, p).filter((k) => CELLS[k].type === 'transport').length;
      out.push({ c: n ? 'good' : '', s: t('advTr', { n: n + 1 }) });
    }
    if (P.money >= c.price && P.money - c.price < 100) out.push({ c: 'warn', s: t('advLow') });
    return out;
  }
  // что станет после обмена: кто соберёт группы
  setsNote(T, out) {
    const M = this.g.M;
    const gA = R.newSets(M, T.a, T.cellsA, T.cellsB);
    const gB = R.newSets(M, T.b, T.cellsB, T.cellsA);
    const nm = (i) => this.g.nm(M.players[i]);
    for (const g of gA) out.push({ c: 'good', s: t('advGetsSet', { n: nm(T.a), g: t('g_' + g) }) });
    for (const g of gB) out.push({ c: 'warn', s: t('advGetsSet', { n: nm(T.b), g: t('g_' + g) }) });
  }
  tradeAdvice(T) {
    const M = this.g.M;
    const out = [];
    if (!T.cellsA.length && !T.cellsB.length && !T.moneyA && !T.moneyB) return out;
    if (M.players[T.b].bot) out.push(Bot.acceptTrade(M, T.b, T) ? { c: 'good', s: t('advYes', { n: M.players[T.b].name }) } : { c: 'warn', s: t('advNo', { n: M.players[T.b].name }) });
    this.setsNote(T, out);
    return out;
  }
  offerAdvice(tr) {
    const M = this.g.M;
    const me = tr.b;
    const out = [];
    const { mine } = Bot.tradeScore(M, me, tr);
    out.push(mine > 0 ? { c: 'good', s: t('advGood') } : { c: 'warn', s: t('advBad') });
    // с точки зрения получателя: a — тот, кто предлагает
    const gA = R.newSets(M, tr.a, tr.cellsA, tr.cellsB);
    for (const g of gA) out.push({ c: 'warn', s: t('advGetsSet', { n: M.players[tr.a].name, g: t('g_' + g) }) });
    for (const g of R.newSets(M, me, tr.cellsB, tr.cellsA)) out.push({ c: 'good', s: t('advGetsSet', { n: this.g.nm(M.players[me]), g: t('g_' + g) }) });
    return out;
  }

  // ---------- соперник: что у него есть ----------
  playerInfo(idx) {
    const M = this.g.M;
    if (!M) return;
    const P = M.players[idx];
    const cells = R.ownedBy(M, idx);
    const groups = [...GROUP_ORDER, 'transport', 'util'];
    let list = '';
    for (const g of groups) {
      const all = GROUP_CELLS[g] || CELLS.filter((c) => c.type === g).map((c) => c.i);
      const has = all.filter((i) => cells.includes(i));
      if (!has.length) continue;
      const full = has.length === all.length;
      list += `<div class="pgrp ${full ? 'full' : ''}">${has
        .map((i) => {
          const o = M.own[i];
          const hs = o.h === 5 ? `<span class="hh hotel">${esc(t('hotel'))}</span>` : o.h ? `<span class="hh">${'⌂'.repeat(o.h)}</span>` : '';
          return `<div class="prow ${o.m ? 'mort' : ''}"><i style="background:${ccolor(i)}"></i><button class="pname" data-info="${i}">${esc(cname(i))}</button>${hs}<small class="muted">${full ? '' : `${has.length}/${all.length}`}</small></div>`;
        })
        .join('')}</div>`;
    }
    const st = [];
    if (P.inJail) st.push(t('inJail'));
    if (P.free.length) st.push(t('cards', { n: P.free.length }));
    const canTrade = idx !== this.g.me() && !P.out && !M.over && this.bar && this.bar.querySelector('[data-a="trade"]');
    const m = this.modal({
      title: this.g.nm(P),
      wide: true,
      body: `<div class="pinfo2" style="--pc:${P.color}"><img src="${this.thumb('token', P.token)}" alt=""><div><b>${esc(P.out ? t('bankrupt') : money(P.money))}</b><small>${esc(t('worth'))}: ${esc(moneyS(R.worth(M, idx)))}${st.length ? ' · ' + esc(st.join(' · ')) : ''}</small></div></div>${list || `<p class="center">${esc(t('noPropsP'))}</p>`}${
        canTrade ? `<div class="row"><button class="btn mid green" data-a="tr">${IC.trade}<span>${esc(t('tradeWithN', { n: P.name }))}</span></button></div>` : ''
      }`,
    });
    m.querySelectorAll('[data-info]').forEach((b) => (b.onclick = () => this.cellInfo(+b.dataset.info)));
    this.bind(m, {
      tr: () => {
        m.close();
        this.trade(idx);
      },
    });
  }

  // ---------- график капитала в итогах ----------
  chartHTML(st) {
    const M = this.g.M;
    const H = M.hist || [];
    if (H.length < 2) return '';
    const W = 320,
      Hh = 130,
      pad = 6;
    const max = Math.max(1, ...H.flat());
    const x = (k) => pad + ((W - pad * 2) * k) / (H.length - 1);
    const y = (v) => Hh - pad - ((Hh - pad * 2) * v) / max;
    let grid = '';
    for (let k = 1; k <= 3; k++) grid += `<path d="M0 ${y((max * k) / 4)}H${W}" stroke="#ddd0b0" stroke-width="1" stroke-dasharray="4 4"/>`;
    const lines = M.players
      .map((p) => {
        const pts = H.map((r, k) => `${x(k).toFixed(1)},${y(r[p.idx] || 0).toFixed(1)}`).join(' ');
        return `<polyline points="${pts}" fill="none" stroke="${p.color}" stroke-width="${p.bot ? 2.5 : 4}" stroke-linejoin="round" stroke-linecap="round"/>`;
      })
      .join('');
    const rows = st
      .map((idx) => {
        const p = M.players[idx];
        const s = M.stats;
        return `<tr style="--pc:${p.color}"><td><i></i>${esc(this.g.nm(p))}</td><td>${esc(moneyS(s.rentGot[idx] || 0))}</td><td>${esc(moneyS(s.rentPaid[idx] || 0))}</td><td>${s.built[idx] || 0}</td></tr>`;
      })
      .join('');
    return `<div class="chart"><h4>${esc(t('chartT'))}</h4><svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none">${grid}${lines}</svg><small class="muted">${esc(t('chartN', { n: H.length - 1 }))}</small></div>
      <table class="stt"><tr><th></th><th>${esc(t('stRentGot'))}</th><th>${esc(t('stRentPaid'))}</th><th>${esc(t('stBuilt'))}</th></tr>${rows}</table>`;
  }

  // ---------- задания и достижения ----------
  questDone(d) {
    const name = t(d.id);
    audio.play('gift');
    this.toast((d.kind === 'quest' ? t('questDone') : t('achDone')) + ': ' + name, 2600);
  }
  quests() {
    const m = this.modal({ title: t('questsT'), wide: true, body: `<div class="qbox"></div>`, onClose: () => this.screen === 'home' && this.home() });
    const render = () => {
      const q = dailyQuests();
      const a = achievements();
      const item = (x, kind) => {
        const ready = x.p >= x.n && !x.got;
        const pr = x.ev === 'rent' ? `${moneyS(x.p)} / ${moneyS(x.n)}` : `${fmt(x.p)} / ${fmt(x.n)}`;
        const btn = x.got ? `<span class="qgot">${IC.check}</span>` : `<button class="btn sm2 ${ready ? 'green' : 'sand'}" data-k="${kind}" data-id="${x.id}" ${ready ? '' : 'disabled'}>${IC.coin}<span>${x.c}</span></button>`;
        return `<div class="qrow ${x.got ? 'got' : ''} ${ready ? 'ready' : ''}"><div class="qtx"><b>${esc(t(x.id))}</b><div class="qbar"><i style="width:${Math.round((100 * x.p) / x.n)}%"></i></div><small>${esc(pr)}</small></div>${btn}</div>`;
      };
      m.querySelector('.qbox').innerHTML = `<h4 class="qh">${esc(t('dailyQ'))}</h4><p class="small">${esc(t('dailyQN'))}</p>${q.map((x) => item(x, 'quest')).join('')}<h4 class="qh">${esc(t('achT'))}</h4>${a.map((x) => item(x, 'ach')).join('')}`;
      m.querySelectorAll('[data-k]').forEach(
        (b) =>
          (b.onclick = () => {
            const n = claim(b.dataset.k, b.dataset.id);
            if (n) {
              audio.play('gift');
              save.write();
              this.refreshTop();
              this.toast('+' + n, 1200);
            }
            render();
          })
      );
    };
    render();
  }
}
