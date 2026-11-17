// DOM-интерфейс: меню, уровни, улучшения, HUD с метками над постройками, амбар и машина, подсказки, пауза, итоги, лавка
import { IC } from './icons.js';
import { t, fmt, fmtTime, LANG } from './i18n.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { iap, itemHTML } from './iap.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import { LEVELS, ITEMS, ITEM_ORDER, ANIMALS, ANIMAL_ORDER, BUILDINGS, UPGRADES, UP_MAX, UNLOCK, MEDAL_STARS, WELL_PRICE, WELL_CAP, STORE_CAP, TRUCK_CAP, TRUCK_TIME, BUILD_SPEED, MAX_QUEUE } from './data.js';
import { thumb } from './thumbs.js';
import { seasonOf } from './game.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const img = (key, cls = '') => `<img class="${cls}" src="${thumb(key)}" alt="" draggable="false">`;
const goalImg = (k) => (k === 'coins' ? `<i class="gico">${IC.coin}</i>` : img(k, 'gimg'));
const MEDAL_IC = { gold: 'medal1', silver: 'medal2', done: 'medal3' };
const SEASON_COL = ['#9be37a', '#ffd76a', '#ffad6a', '#a8d8ff'];

export class UI {
  constructor(game, root) {
    this.g = game;
    this.root = root;
    this.modalOpen = false;
    this.screen = '';
    this.season = undefined;
    const st = document.createElement('style');
    st.textContent = volumeCss({ accent: '#58b047', track: '#e8d5ba', thumb: '#fffaf0', muted: '#9a7d68' });
    document.head.appendChild(st);
    root.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) {
        audio.unlock();
        audio.play('click');
      }
    });
    this.marks = new Map();
    this.tipShown = {};
    // экраны рисуются в своём слое, окна — поверх, чтобы перерисовка экрана не убивала открытое окно
    this.scr = document.createElement('div');
    this.scr.className = 'scr';
    root.appendChild(this.scr);
  }

  // ---------- общее ----------
  starsChip() {
    return `<div class="chip stars">${IC.star}<b>${save.starsFree()}</b></div>`;
  }
  bankChip() {
    return `<div class="chip bankc" data-a="shop">${IC.bank}<b>${fmt(save.data.bank)}</b>${iap.available() ? '<i class="plus">+</i>' : ''}</div>`;
  }
  bind(root = this.root) {
    root.querySelectorAll('[data-a]').forEach((el) => {
      el.onclick = (e) => {
        e.stopPropagation();
        this.action(el.dataset.a, el.dataset);
      };
    });
  }

  action(a, d) {
    const g = this.g;
    switch (a) {
      case 'play':
        this.openIntro(save.nextLevel());
        break;
      case 'levels':
        this.showLevels();
        break;
      case 'upgrades':
        this.showUpgrades();
        break;
      case 'menu':
        this.closeModal();
        g.showMenu();
        break;
      case 'back':
        this.showMenu();
        break;
      case 'settings':
        this.openSettings();
        break;
      case 'shop':
        this.openShop();
        break;
      case 'records':
        this.openRecords();
        break;
      case 'season':
        this.season = +d.s;
        this.showLevels();
        break;
      case 'level':
        if (save.open(+d.n)) this.openIntro(+d.n);
        else {
          audio.play('deny');
          this.toast(t('locked', { n: +d.n - 1 }));
        }
        break;
      case 'up':
        if (g.buyUpgrade(d.k)) this.showUpgrades();
        else audio.play('deny');
        break;
      case 'buy':
        g.buyAnimal(d.k);
        break;
      case 'pause':
        this.openPause();
        break;
      case 'bank':
        this.openBank();
        break;
      case 'barn':
        if (this.g.state === 'play' && !this.g.paused) this.openBarn();
        break;
      case 'close':
        this.closeModal();
        break;
    }
  }

  refresh() {
    if (this.screen === 'menu') this.showMenu();
    else if (this.screen === 'levels') this.showLevels();
    else if (this.screen === 'upgrades') this.showUpgrades();
    if (this.modalRefresh) this.modalRefresh();
  }

  toast(text, item) {
    const old = this.root.querySelector('.toast');
    if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = (item ? img(item, 'timg') : '') + esc(text);
    this.root.appendChild(el);
    setTimeout(() => el.remove(), 2300);
  }

  // ---------- меню ----------
  showMenu() {
    this.screen = 'menu';
    this.hud = null;
    this.scr.innerHTML = `<div class="layer menu">
      <div class="logo"><div class="sign"><i class="rope l"></i><i class="rope r"></i>
        <div class="logo-t">${esc(t('title'))}</div><div class="logo-s">${esc(t('subtitle'))}</div></div></div>
      <div class="menu-top">${this.starsChip()}${this.bankChip()}</div>
      <div class="menu-c">
        <button class="btn big play green" data-a="play">${IC.play}<span>${esc(save.data.levels[1] ? t('cont') : t('play'))}<small>${esc(t('levelN', { n: save.nextLevel() }))}</small></span></button>
        <div class="row">
          <button class="btn mid wood" data-a="levels">${IC.grid}<span>${esc(t('levels'))}</span></button>
          <button class="btn mid wood" data-a="upgrades">${IC.up2}<span>${esc(t('upgrades'))}</span>${save.starsFree() > 0 && this.canUpgrade() ? '<i class="dot"></i>' : ''}</button>
        </div>
        <div class="row">
          ${iap.available() ? `<button class="btn round" data-a="shop" title="${esc(t('shop'))}">${IC.shop}</button>` : ''}
          <button class="btn round" data-a="records" title="${esc(t('records'))}">${IC.trophy}</button>
          <button class="btn round" data-a="settings" title="${esc(t('settings'))}">${IC.gear}</button>
        </div>
      </div></div>`;
    this.bind();
  }

  canUpgrade() {
    return UPGRADES.some((k) => this.upUnlocked(k) && save.upCost(k) <= save.starsFree());
  }
  upUnlocked(k) {
    return !UNLOCK[k] || save.data.levels[UNLOCK[k] - 1] || UNLOCK[k] <= 1;
  }

  // ---------- уровни ----------
  showLevels() {
    this.screen = 'levels';
    if (this.season === undefined) this.season = seasonOf(save.nextLevel());
    const s = this.season;
    let cards = '';
    for (let n = s * 12 + 1; n <= s * 12 + 12; n++) {
      const L = LEVELS[n - 1];
      const open = save.open(n);
      const rec = save.data.levels[n];
      const goals = Object.keys(L.goals).slice(0, 3).map(goalImg).join('');
      cards += `<button class="lcard ${open ? '' : 'locked'} ${n === save.nextLevel() ? 'cur' : ''}" data-a="level" data-n="${n}">
        <b class="lnum">${n}</b>
        <span class="lgoals">${goals}</span>
        ${open ? (rec ? `<span class="lmedal">${IC[MEDAL_IC[rec.medal]]}<small>${fmtTime(rec.best)}</small></span>` : `<span class="lmedal new">${IC.play}</span>`) : `<span class="llock">${IC.lock}</span>`}
      </button>`;
    }
    const tabs = [0, 1, 2, 3].map((i) => `<button class="tab ${i === s ? 'on' : ''}" style="--c1:${SEASON_COL[i]}" data-a="season" data-s="${i}">${esc(t('season_' + i))}</button>`).join('');
    this.scr.innerHTML = `<div class="layer panel-c">
      <div class="topbar"><button class="btn round small" data-a="back">${IC.back}</button><div class="ttl">${esc(t('levels'))}</div>${this.starsChip()}</div>
      <div class="tabs">${tabs}</div>
      <div class="lgrid season${s}">${cards}</div></div>`;
    this.bind();
  }

  openIntro(n) {
    const L = LEVELS[n - 1];
    const news = Object.entries(UNLOCK)
      .filter(([k, v]) => v === n && n > 1)
      .map(([k]) => (ANIMALS[k] ? t('a_' + k) : t('b_' + k)));
    const goals = Object.entries(L.goals)
      .map(([k, v]) => `<div class="igoal">${goalImg(k)}<b>${k === 'coins' ? fmt(v) : v}</b><small>${esc(k === 'coins' ? t('i_coins') : ANIMALS[k] ? t('a_' + k) : t('i_' + k))}</small></div>`)
      .join('');
    const rec = save.data.levels[n];
    this.modal(
      t('levelN', { n }),
      `<div class="isec"><div class="ihead">${esc(t('goals'))}</div><div class="igoals">${goals}</div></div>
      ${news.length ? `<div class="feat">${IC.star}${esc(t('newThing', { n: news.join(', ') }))}</div>` : ''}
      <div class="itimes"><span class="itime g">${IC.medal1}${esc(fmtTime(L.gold))}</span><span class="itime s">${IC.medal2}${esc(fmtTime(L.silver))}</span>${rec ? `<span class="itime b">${IC[MEDAL_IC[rec.medal]]}${esc(t('best'))}: ${fmtTime(rec.best)}</span>` : ''}</div>
      <div class="icoins">${IC.coin}${esc(t('startCoins'))}: <b>${fmt(L.coins)}</b></div>
      <button class="btn big green" data-go="1">${IC.play}${esc(t('start'))}</button>`,
      (box) => {
        box.querySelector('[data-go]').onclick = () => {
          this.closeModal();
          this.g.startLevel(n);
        };
      },
      'intro',
    );
  }

  // ---------- улучшения ----------
  showUpgrades() {
    this.screen = 'upgrades';
    const rows = UPGRADES.map((k) => {
      const lv = save.data.up[k] || 0;
      const open = this.upUnlocked(k);
      const cost = save.upCost(k);
      const isB = !!BUILDINGS[k];
      const icon = isB ? img(BUILDINGS[k].out, 'upimg') : k === 'well' ? IC.water : k === 'store' ? IC.barn : IC.truck;
      const name = isB ? t('b_' + k) : t('u_' + k);
      let eff = '';
      if (k === 'well') eff = `${t('water')}: ${WELL_CAP[lv]}${lv < UP_MAX ? ' → ' + WELL_CAP[lv + 1] : ''}`;
      else if (k === 'store') eff = `${t('capacity')}: ${STORE_CAP[lv]}${lv < UP_MAX ? ' → ' + STORE_CAP[lv + 1] : ''}`;
      else if (k === 'truck') eff = `${t('capacity')}: ${TRUCK_CAP[lv]}${lv < UP_MAX ? ' → ' + TRUCK_CAP[lv + 1] : ''}`;
      else eff = `${t('speed')}: ${Math.round(100 / BUILD_SPEED[lv])}%${lv < UP_MAX ? ' → ' + Math.round(100 / BUILD_SPEED[lv + 1]) + '%' : ''}`;
      const pips = Array.from({ length: UP_MAX }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
      const btn = !open
        ? `<span class="upg lock">${IC.lock}${UNLOCK[k]}</span>`
        : lv >= UP_MAX
          ? `<span class="upg max">${esc(t('u_max'))}</span>`
          : `<button class="btn upg ${save.starsFree() >= cost ? '' : 'poor'}" data-a="up" data-k="${k}">${IC.star}${cost}</button>`;
      return `<div class="uprow ${open ? '' : 'locked'}"><div class="upic">${icon}</div><div class="uptx"><b>${esc(name)}</b><small>${esc(eff)}</small><div class="pips">${pips}</div></div>${btn}</div>`;
    }).join('');
    this.scr.innerHTML = `<div class="layer panel-c">
      <div class="topbar"><button class="btn round small" data-a="back">${IC.back}</button><div class="ttl">${esc(t('upgrades'))}</div>${this.starsChip()}</div>
      <div class="board"><div class="uphint">${esc(t('u_hint'))}</div>${rows}</div></div>`;
    this.bind();
  }

  // ---------- окна ----------
  modal(title, body, onBind, cls = '') {
    this.closeModal(true);
    const m = document.createElement('div');
    m.className = 'modal ' + cls;
    m.innerHTML = `<div class="mpanel"><div class="mhead"><b>${esc(title)}</b><button class="btn round small" data-x="1">${IC.close}</button></div><div class="mbody">${body}</div></div>`;
    m.addEventListener('pointerdown', (e) => e.stopPropagation());
    m.querySelector('[data-x]').onclick = () => {
      this.closeModal();
    };
    this.root.appendChild(m);
    this.modalEl = m;
    this.modalOpen = true;
    this.bind(m);
    if (onBind) onBind(m.querySelector('.mbody'), m);
    return m;
  }
  closeModal(silent) {
    if (this.modalEl) this.modalEl.remove();
    this.modalEl = null;
    this.modalOpen = false;
    this.modalRefresh = null;
    if (!silent && this.onModalClose) {
      const f = this.onModalClose;
      this.onModalClose = null;
      f();
    }
    if (this.g.state === 'play') sdk.gameplay(!this.g.paused && !this.g.farm.finished);
  }

  openSettings() {
    const st = save.data.settings;
    const q = st.quality;
    this.modal(
      t('settings'),
      `${slidersHTML(st, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}
      <div class="qrow"><span>${esc(t('quality'))}</span><div class="segs">${['auto', 'low', 'high'].map((k) => `<button class="seg ${q === k ? 'on' : ''}" data-q="${k}">${esc(t('q_' + k))}</button>`).join('')}</div></div>`,
      (box) => {
        bindSliders(box, st, () => save.write(false));
        box.querySelectorAll('[data-q]').forEach((b) => {
          b.onclick = () => {
            st.quality = b.dataset.q;
            save.write(false);
            box.querySelectorAll('[data-q]').forEach((x) => x.classList.toggle('on', x === b));
            this.toast(LANG === 'ru' ? 'Применится после перезапуска' : 'Applies after restart');
          };
        });
      },
    );
  }

  openShop() {
    const render = (box) => {
      const items = iap.items();
      box.innerHTML = `<div class="bankbig">${IC.bank}<b>${fmt(save.data.bank)}</b></div><div class="muted c">${esc(t('shopTxt'))}</div><div class="iap-box">${items.map((x) => itemHTML(x, { owned: t('owned') })).join('')}</div>`;
      box.querySelectorAll('.iap-buy[data-id]').forEach((b) => {
        b.onclick = async () => {
          box.querySelectorAll('.iap-buy').forEach((e) => (e.disabled = true));
          const ok = await iap.buy(b.dataset.id);
          if (ok) {
            audio.play('coin');
            this.toast(t('thanks'));
          }
          render(box);
          if (this.screen === 'menu') this.showMenu();
          else if (this.hud) this.refresh();
        };
      });
    };
    this.modal(t('shopTitle'), '', (box) => {
      render(box);
      this.modalRefresh = () => render(box);
    });
  }

  async openRecords() {
    this.modal(t('lb'), `<div class="lb"><div class="lbnote">${esc(t('lbNote'))}</div><div class="lbl">…</div></div>`, async (box) => {
      const res = await sdk.getLeaderboard();
      const el = box.querySelector('.lbl');
      if (!el) return;
      if (!res || !res.entries || !res.entries.length) {
        el.innerHTML = `<div class="muted">${esc(t('noLb'))}</div>`;
      } else {
        el.innerHTML = res.entries.map((e) => `<div class="lbrow ${e.me ? 'me' : ''}"><b>${e.rank}</b><span>${esc(e.name || t('you'))}</span><i>${IC.star}${e.score}</i></div>`).join('');
      }
      if (!sdk.isAuthorized()) {
        const d = document.createElement('div');
        d.className = 'lblogin';
        d.innerHTML = `<span>${esc(t('lbLogin'))}</span><button class="btn mid green">${esc(t('login'))}</button>`;
        d.querySelector('button').onclick = async () => {
          if (await sdk.login()) {
            await sdk.submitScore(save.starsEarned());
            this.openRecords();
          }
        };
        box.appendChild(d);
      }
    });
  }

  // ---------- уровень: HUD ----------
  showHud() {
    this.screen = 'hud';
    this.closeModal(true);
    const f = this.g.farm;
    const L = f.L;
    const shop = ANIMAL_ORDER.filter((k) => L.animals.includes(k))
      .map((k) => `<button class="sbtn" data-a="buy" data-k="${k}" data-tip="shop:${k}">${img(k, 'simg')}<span class="sprice">${IC.coin}${fmt(ANIMALS[k].cost)}</span></button>`)
      .join('');
    const goals = Object.keys(L.goals)
      .map((k) => `<div class="gslip" data-g="${k}">${goalImg(k)}<span class="gnum"><b>0</b>/${k === 'coins' ? fmt(L.goals[k]) : L.goals[k]}</span><i class="gok">${IC.check}</i></div>`)
      .join('');
    this.scr.innerHTML = `<div class="hud ${this.g.lay.portrait ? 'por' : 'land'}">
      <div class="htop">
        <div class="hl">
          <div class="chip money">${IC.coin}<b class="mval">0</b></div>
          <div class="chip timer"><i class="tmed">${IC.medal1}</i><b class="tval">0:00</b></div>
        </div>
        <div class="hshop">${shop}</div>
        <div class="hr">
          <button class="btn round small bankb" data-a="bank">${IC.bank}</button>
          <button class="btn round small" data-a="pause">${IC.pause}</button>
        </div>
      </div>
      <div class="goals"><div class="gtitle">${esc(t('levelN', { n: L.n }))}</div>${goals}</div>
      <div class="marks"></div>
      <button class="tmap" data-a="barn">
        <span class="tmroad"><i class="tmfarm">${IC.barn}</i><i class="tmline"></i><i class="tmcity"><svg viewBox="0 0 32 28" xmlns="http://www.w3.org/2000/svg" stroke="#3a2814" stroke-width="2" stroke-linejoin="round"><rect x="2" y="12" width="9" height="14" fill="#ffd23f"/><path d="M1 13l5.5-6l5.5 6z" fill="#e2574c"/><rect x="11" y="6" width="10" height="20" fill="#9ccfff"/><path d="M10 7l6-5l6 5z" fill="#4f9fe0"/><rect x="21" y="14" width="9" height="12" fill="#ffb0b8"/><path d="M20 15l5.5-5l5.5 5z" fill="#a9703e"/><path d="M14 11h4M14 16h4M14 21h4" stroke-width="1.6"/></svg></i>
          <span class="tmt"><svg viewBox="0 0 54 36" xmlns="http://www.w3.org/2000/svg" stroke="#3a2814" stroke-width="2.5" stroke-linejoin="round"><rect x="2" y="12" width="30" height="14" rx="3" fill="#c98a4e"/><path class="tmbox" d="M6 12l3-7h8l2 7M18 12l2-5h7l2 5" fill="#ffd23f"/><path d="M32 8h10l8 9v9H32z" fill="#4f9fe0"/><path d="M35 11h6l5 6h-11z" fill="#bfe9ff"/><circle cx="12" cy="28" r="5" fill="#3a3a44"/><circle cx="42" cy="28" r="5" fill="#3a3a44"/></svg></span></span>
        <span class="tml"></span>
      </button>
      <div class="floats"></div>
      <div class="tipbox"></div>
      <div class="tarrow">${IC.up2}</div>
    </div>`;
    this.hud = {
      el: this.root.querySelector('.hud'),
      money: this.root.querySelector('.mval'),
      timer: this.root.querySelector('.timer'),
      tval: this.root.querySelector('.tval'),
      tmed: this.root.querySelector('.tmed'),
      marks: this.root.querySelector('.marks'),
      floats: this.root.querySelector('.floats'),
      tipbox: this.root.querySelector('.tipbox'),
      arrow: this.root.querySelector('.tarrow'),
      tmap: this.root.querySelector('.tmap'),
      tmt: this.root.querySelector('.tmt'),
      tml: this.root.querySelector('.tml'),
      tmState: '',
      shop: [...this.root.querySelectorAll('.sbtn')],
      goals: [...this.root.querySelectorAll('.gslip')],
      shownCoins: f.coins,
      medal: '',
    };
    this.marks = new Map();
    this.tip = this.tip.bind(this);
    this.curTip = null;
    this.bind();
  }

  // свободная область под ферму (для камеры)
  insets(state, lay) {
    const w = window.innerWidth,
      h = window.innerHeight;
    if (state !== 'play' || !this.hud) {
      // в меню ферма под вывеской и кнопками
      return lay && lay.portrait ? { top: h * 0.22, bottom: h * 0.2, left: 6, right: 6 } : { top: 90, bottom: 40, left: w * 0.06, right: w * 0.06 };
    }
    const top = this.root.querySelector('.htop').getBoundingClientRect().bottom;
    const gEl = this.root.querySelector('.goals');
    gEl.style.top = top + 8 + 'px';
    const goals = gEl.getBoundingClientRect();
    if (lay.portrait) return { top: Math.max(top, goals.bottom) + 4, bottom: this.root.querySelector('.tmap').getBoundingClientRect().height + 14, left: 4, right: 4 };
    return { top: top + Math.min(44, h * 0.06), bottom: 6, left: goals.right + 6, right: 8 };
  }

  updateHud(dt) {
    const H = this.hud;
    if (!H) return;
    const f = this.g.farm;
    const L = f.L;
    // деньги «докручиваются»
    const d = f.coins - H.shownCoins;
    H.shownCoins += Math.abs(d) < 2 ? d : d * Math.min(1, dt * 8);
    H.money.textContent = fmt(Math.round(H.shownCoins));
    // время и медаль
    const tm = f.finished ? f.finishT : f.t;
    H.tval.textContent = fmtTime(tm);
    const med = tm <= L.gold ? 'gold' : tm <= L.silver ? 'silver' : 'done';
    if (med !== H.medal) {
      H.medal = med;
      H.tmed.innerHTML = IC[MEDAL_IC[med]];
      H.timer.className = 'chip timer ' + med;
    }
    // магазин
    for (const b of H.shop) {
      const k = b.dataset.k;
      b.classList.toggle('poor', f.coins < ANIMALS[k].cost);
    }
    // цели
    for (const el of H.goals) {
      const k = el.dataset.g;
      const v = f.goalProgress(k);
      const need = L.goals[k];
      const s = k === 'coins' ? fmt(Math.min(v, need)) : String(Math.min(v, need));
      const b = el.querySelector('b');
      if (b.textContent !== s) b.textContent = s;
      el.classList.toggle('ok', v >= need);
    }
    this.updateTruckMap();
    this.updateMarks();
    this.updateTip(dt);
  }

  // дорога в город в правом нижнем углу: машина едет туда и обратно
  updateTruckMap() {
    const H = this.hud,
      f = this.g.farm,
      T = f.truck;
    let pos = 0,
      back = false,
      label;
    if (T.state === 'away') {
      const k = Math.min(1, T.t / f.truckTime());
      if (k < 0.5) {
        pos = k / 0.5;
        label = t('tmGo');
      } else {
        pos = 1 - (k - 0.5) / 0.5;
        back = true;
        label = t('tmBack');
      }
    } else {
      const v = f.cargoValue();
      label = v > 0 ? `${IC.coin}${fmt(v)}` : t('tmHome');
    }
    H.tmt.style.left = `calc(${(pos * 100).toFixed(2)}% - ${(pos * 46).toFixed(1)}px)`;
    const st = T.state + (back ? 'b' : '') + label;
    if (st !== H.tmState) {
      H.tmState = st;
      H.tml.innerHTML = label.startsWith('<') ? label : esc(label);
      H.tmt.classList.toggle('back', back);
      H.tmt.classList.toggle('empty', back || T.state === 'home' && f.truckUsed() === 0);
      H.tmap.classList.toggle('away', T.state === 'away');
      H.tmap.classList.toggle('ready', T.state === 'home' && f.truckUsed() > 0);
    }
  }

  goalPulse(item) {
    if (!this.hud) return;
    const el = this.hud.goals.find((g) => g.dataset.g === item);
    if (el) {
      el.classList.remove('pulse');
      void el.offsetWidth;
      el.classList.add('pulse');
    }
  }

  // метки над объектами фермы
  mark(key, html, x, y, z, cls = '') {
    let m = this.marks.get(key);
    if (!m) {
      m = { el: document.createElement('div'), html: null, cls: null };
      m.el.className = 'mk';
      this.hud.marks.appendChild(m.el);
      this.marks.set(key, m);
    }
    m.seen = true;
    if (m.html !== html) {
      m.el.innerHTML = html;
      m.html = html;
    }
    if (m.cls !== cls) {
      m.el.className = 'mk ' + cls;
      m.cls = cls;
    }
    const p = this.g.view.project(x, y, z);
    m.el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`;
    return p;
  }

  updateMarks() {
    const f = this.g.farm;
    const lay = this.g.lay;
    for (const m of this.marks.values()) m.seen = false;
    const bar = (frac, col) => `<span class="mbar"><i style="width:${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%;background:${col}"></i></span>`;
    // колодец
    const W = f.well;
    const cap = f.wellCap();
    if (W.refill > 0) this.mark('well', `<span class="mtag">${IC.water}<b>…</b></span>${bar(1 - W.refill / f.wellTime(), '#4f9fe0')}`, lay.well.x, 2.5, lay.well.z, 'wait');
    else if (W.water <= 0) this.mark('well', `<span class="mtag hot">${IC.water}<b>0</b><em>${IC.coin}${WELL_PRICE}</em></span>`, lay.well.x, 2.5, lay.well.z, 'pulse');
    else this.mark('well', `<span class="mtag">${IC.water}<b>${W.water}</b>/${cap}</span>`, lay.well.x, 2.5, lay.well.z);
    // амбар
    const used = f.storeUsed(),
      sc = f.storeCap();
    this.mark('store', `<span class="mtag ${used >= sc ? 'hot' : ''}">${IC.barn}<b>${used}</b>/${sc}</span>${bar(used / sc, used >= sc ? '#e2574c' : '#58b047')}`, lay.store.x, 3.4, lay.store.z, used >= sc ? 'pulse' : '');
    // машина
    const T = f.truck;
    if (T.state === 'away') {
      const k = T.t / f.truckTime();
      this.mark('truck', `<span class="mtag">${IC.truck}</span>${bar(k, '#4a98dc')}`, lay.truck.x, 1.9, lay.truck.z, 'dim');
    } else if (f.truckUsed() > 0) this.mark('truck', `<span class="mtag go">${IC.coin}<b>${fmt(f.cargoValue())}</b></span>`, lay.truck.x, 1.9, lay.truck.z, 'pulse');
    // мастерские: «сырьё (сколько в амбаре) → товар», полоска работы и очередь
    f.slots.forEach((s, i) => {
      if (!s.kind) return;
      const B = BUILDINGS[s.kind];
      if (!s.built) {
        const poor = f.coins < B.cost;
        this.mark('s' + i, `<span class="mtag price ${poor ? 'poor' : ''}">${img(B.out, 'mimg')}${IC.hammer}<b>${fmt(B.cost)}</b></span>`, s.x, 1.7, s.z);
        return;
      }
      const st = f.stock[B.in] || 0;
      const canLoad = st > 0 && s.queue < MAX_QUEUE;
      const work = s.queue > 0;
      const html = `<span class="wk ${canLoad ? 'ready' : ''} ${!work && !st ? 'idle' : ''}">
          <span class="wkin">${img(B.in, 'mimg')}<b class="${st ? '' : 'no'}">${st}</b></span><i class="wkar">${IC.arrowR}</i>${img(B.out, 'mimg')}
        </span>${work ? `<span class="wkbar">${bar(s.prog, '#ffb020')}${s.queue > 1 ? `<em>+${s.queue - 1}</em>` : ''}</span>` : ''}`;
      this.mark('s' + i, html, s.x, 3.05, s.z, canLoad && !work ? 'pulse' : '');
    });
    // голодные животные
    for (const a of f.animals) {
      if (a.dead || ANIMALS[a.kind].helper || a.state === 'drop') continue;
      if (a.food < 0.3) {
        const st = a.food <= 0;
        this.mark('a' + a.id, `<span class="hung ${st ? 'starve' : ''}">${IC.grass}</span>`, a.x, ANIMALS[a.kind].r * 2 + 0.9, a.z, st ? 'pulse' : '');
      }
    }
    // медведи
    for (const b of f.bears) {
      if (b.gone) continue;
      if (b.state === 'caged') {
        this.mark('b' + b.id, `<span class="mtag">${IC.barn}</span>${bar(b.cageT / 25, b.cageT < 6 ? '#e2574c' : '#ffb020')}`, b.x, 2.2, b.z, b.cageT < 6 ? 'pulse' : '');
      } else if (b.state === 'free' || b.state === 'fall') {
        const y = b.state === 'fall' ? this.g.view.bearY(b) : 0;
        this.mark('b' + b.id, `<span class="mtag hot">${IC.cage}<b>${b.clicks}</b>/${b.need}</span>`, b.x, y + 2.1, b.z, 'pulse');
      }
    }
    for (const [k, m] of this.marks)
      if (!m.seen) {
        m.el.remove();
        this.marks.delete(k);
      }
  }

  float(x, y, z, text, kind) {
    if (!this.hud) return;
    const p = this.g.view.project(x, y, z);
    const el = document.createElement('div');
    el.className = 'float';
    el.innerHTML = (kind === 'coin' ? IC.coin : '') + esc(text);
    el.style.left = Math.max(60, Math.min(window.innerWidth - 60, p.x)) + 'px';
    el.style.top = Math.max(120, p.y) + 'px';
    this.hud.floats.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  // ---------- подсказки со стрелкой ----------
  // target: 'well' | 'store' | 'truck' | 'slot:i' | 'bear:id' | 'field' | 'shop:goose' | null
  tip(target, key, force) {
    if (!this.hud || (this.g.tutor && this.g.tutor.active)) return;
    const once = !force;
    if (once && save.data.tips[key]) return;
    if (force && this.tipShown[key] && performance.now() - this.tipShown[key] < 15000) return;
    this.tipShown[key] = performance.now();
    if (once) {
      save.data.tips[key] = 1;
      save.write(false);
    }
    this.curTip = { target, key, t: 6 };
    const tb = this.hud.tipbox;
    tb.textContent = t(key);
    tb.classList.remove('show');
    void tb.offsetWidth;
    tb.classList.add('show');
  }

  levelTips(n, phase) {
    if (n === 1) this.tip('field', 't1');
    else if (n === 2) this.tip('shop:goose', 't4');
    else if (n === 3) this.tip('slot:0', 't5');
    else if (n === 4) this.tip('store', 't7');
  }

  updateTip(dt) {
    const H = this.hud;
    const c = this.curTip;
    if (!c) {
      H.arrow.style.display = 'none';
      return;
    }
    c.t -= dt;
    if (c.t <= 0) {
      this.curTip = null;
      H.tipbox.classList.remove('show');
      H.arrow.style.display = 'none';
      return;
    }
    const f = this.g.farm;
    const lay = this.g.lay;
    let p = null;
    const tg = c.target || '';
    if (tg === 'well') p = this.g.view.project(lay.well.x, 3.2, lay.well.z);
    else if (tg === 'store') p = this.g.view.project(lay.store.x, 4.3, lay.store.z);
    else if (tg === 'truck') p = this.g.view.project(lay.truck.x, 2.6, lay.truck.z);
    else if (tg === 'field') {
      const F = lay.field;
      p = this.g.view.project((F.x0 + F.x1) / 2, 0.6, (F.z0 + F.z1) / 2 + 0.6);
    } else if (tg.startsWith('slot:')) {
      const s = f.slots[+tg.slice(5)];
      if (s) p = this.g.view.project(s.x, 4.0, s.z);
    } else if (tg.startsWith('bear:')) {
      const b = f.bears.find((x) => x.id === +tg.slice(5));
      if (b && !b.gone) p = this.g.view.project(b.x, (b.state === 'fall' ? this.g.view.bearY(b) : 0) + 3.1, b.z);
    } else if (tg.startsWith('shop:')) {
      const el = H.shop.find((x) => x.dataset.k === tg.slice(5));
      if (el) {
        const r = el.getBoundingClientRect();
        p = { x: r.left - 6, y: r.top + r.height / 2, dir: 'right' };
      }
    }
    if (!p) {
      H.arrow.style.display = 'none';
      return;
    }
    H.arrow.style.display = '';
    // стрелка под табличкой/над объектом с зазором, смотрит на цель
    H.arrow.className = 'tarrow ' + (p.dir || 'down');
    H.arrow.style.transform = `translate(${p.x}px,${p.y}px)`;
  }

  // ---------- амбар и машина ----------
  openBarn() {
    const g = this.g;
    const f = g.farm;
    this.g.pause(true);
    const render = (box) => {
      const T = f.truck;
      const home = T.state === 'home';
      const items = ITEM_ORDER.filter((k) => (f.stock[k] || 0) > 0);
      const cargo = ITEM_ORDER.filter((k) => (T.cargo[k] || 0) > 0);
      const su = f.storeUsed(),
        sc = f.storeCap(),
        tu = f.truckUsed(),
        tc = f.truckCap();
      const row = (k, n, side) =>
        `<button class="irow" data-${side}="${k}" ${home ? '' : 'disabled'}>${img(k, 'iimg')}<span class="iname">${esc(t('i_' + k))}<small>${IC.coin}${fmt(ITEMS[k].price)}</small></span><b class="icnt">×${n}</b>${side === 'l' ? `<span class="iall" data-all="${k}">${esc(t('loadAll'))}</span>` : ''}</button>`;
      box.innerHTML = `<div class="barn2">
        <div class="bcol"><div class="bhead">${IC.barn}<b>${esc(t('store'))}</b><span class="cap">${su}/${sc}</span></div>
          <div class="ilist">${items.length ? items.map((k) => row(k, f.stock[k], 'l')).join('') : `<div class="empty">${esc(t('storeEmpty'))}</div>`}</div></div>
        <div class="bcol truckc"><div class="bhead">${IC.truck}<b>${esc(t('truck'))}</b><span class="cap">${tu}/${tc}</span></div>
          ${home
            ? `<div class="ilist">${cargo.length ? cargo.map((k) => row(k, T.cargo[k], 'u')).join('') : `<div class="empty">${esc(t('truckEmpty'))}</div>`}</div>
              <div class="tsum">${esc(t('sellFor'))}: ${IC.coin}<b>${fmt(f.cargoValue())}</b></div>
              <button class="btn big green go" ${tu ? '' : 'disabled'}>${IC.truck}${esc(t('toTown'))}</button>`
            : `<div class="away">${IC.truck}<b>${esc(t('inTown'))}</b><span class="mbar big"><i style="width:${Math.round((T.t / f.truckTime()) * 100)}%;background:#4a98dc"></i></span></div>`}
        </div></div>`;
      box.querySelectorAll('[data-l]').forEach((b) => {
        b.onclick = (e) => {
          const k = b.dataset.l;
          const all = e.target.closest('[data-all]');
          const n = f.load(k, all ? 999 : 1);
          if (n) audio.play('load');
          else audio.play('deny');
          render(box);
        };
      });
      box.querySelectorAll('[data-u]').forEach((b) => {
        b.onclick = () => {
          if (f.unload(b.dataset.u, 1)) audio.play('click');
          render(box);
        };
      });
      const go = box.querySelector('.go');
      if (go)
        go.onclick = () => {
          if (f.sendTruck()) {
            this.closeModal();
          }
        };
    };
    this.onModalClose = () => this.g.pause(false);
    this.modal(t('store'), '', (box) => render(box), 'barn');
  }

  openBuild(i) {
    const f = this.g.farm;
    const s = f.slots[i];
    const B = BUILDINGS[s.kind];
    const poor = f.coins < B.cost;
    this.g.pause(true);
    this.onModalClose = () => this.g.pause(false);
    this.modal(
      t('b_' + s.kind),
      `<div class="chain">${img(B.in, 'cimg')}<i class="carr">${IC.arrowR}</i>${img(B.out, 'cimg')}</div>
      <div class="cinfo">${esc(t('i_' + B.in))} → ${esc(t('i_' + B.out))} · ${IC.clock}${Math.round(f.buildTime(s.kind) * 10) / 10} c</div>
      <div class="cinfo">${IC.coin}${esc(t('i_' + B.out))}: <b>${ITEMS[B.out].price}</b></div>
      <button class="btn big ${poor ? 'poor' : 'green'}" data-b="1">${IC.hammer}${esc(t('build'))} ${IC.coin}${fmt(B.cost)}</button>`,
      (box) => {
        box.querySelector('[data-b]').onclick = () => {
          const r = f.buildSlot(i);
          if (r === 'ok') this.closeModal();
          else {
            audio.play('deny');
            this.toast(t('needMoney'));
          }
        };
      },
      'build',
    );
  }

  openBank() {
    const g = this.g;
    g.pause(true);
    this.onModalClose = () => g.pause(false);
    const render = (box) => {
      const b = save.data.bank;
      const opts = [500, 2000, 10000].filter((x) => x < b);
      const ad = g.adCoinsAmount();
      box.innerHTML = `<div class="bankbig">${IC.bank}<b>${fmt(b)}</b></div>
        <div class="muted c">${esc(t('bankTxt'))}</div>
        <div class="row">${opts.map((x) => `<button class="btn mid green" data-t="${x}">${esc(t('take', { n: fmt(x) }))}</button>`).join('')}${b > 0 ? `<button class="btn mid green" data-t="${b}">${esc(t('take', { n: fmt(b) }))}</button>` : ''}</div>
        <div class="free ${g.adCoinsTaken ? 'off' : ''}">${IC.ad}<div><b>${esc(t('adCoins'))}</b><small>${esc(g.adCoinsTaken ? t('adOnce') : t('adCoinsTxt', { n: fmt(ad) }))}</small></div>${g.adCoinsTaken ? '' : `<button class="btn mid blue" data-ad="1">${esc(t('watch'))}</button>`}</div>
        ${iap.available() ? `<button class="btn mid wood" data-sh="1">${IC.shop}${esc(t('shop'))}</button>` : ''}`;
      box.querySelectorAll('[data-t]').forEach((x) => {
        x.onclick = () => {
          g.takeBank(+x.dataset.t);
          this.closeModal();
        };
      });
      const a = box.querySelector('[data-ad]');
      if (a)
        a.onclick = () => {
          g.adCoins();
        };
      const sh = box.querySelector('[data-sh]');
      if (sh)
        sh.onclick = () => {
          this.onModalClose = null;
          this.openShop();
          this.onModalClose = () => g.pause(false);
        };
    };
    this.modal(t('bank'), '', (box) => {
      render(box);
      this.modalRefresh = () => render(box);
    });
  }

  openPause() {
    const g = this.g;
    g.pause(true);
    this.onModalClose = () => g.pause(false);
    const st = save.data.settings;
    this.modal(
      t('paused'),
      `${slidersHTML(st, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}
      <div class="col">
        <button class="btn big green" data-r="1">${IC.play}${esc(t('resume'))}</button>
        <div class="row"><button class="btn mid wood" data-rs="1">${IC.restart}${esc(t('restart'))}</button><button class="btn mid wood" data-m="1">${IC.home}${esc(t('menu'))}</button></div>
      </div>`,
      (box) => {
        bindSliders(box, st, () => save.write(false));
        box.querySelector('[data-r]').onclick = () => this.closeModal();
        box.querySelector('[data-rs]').onclick = () => {
          this.onModalClose = null;
          this.closeModal();
          g.afterLevel(() => g.restart());
        };
        box.querySelector('[data-m]').onclick = () => {
          this.onModalClose = null;
          this.closeModal();
          g.afterLevel(() => g.showMenu());
        };
      },
    );
  }

  showWin(w) {
    const g = this.g;
    if (this.hud) {
      this.curTip = null;
      this.hud.tipbox.classList.remove('show');
      this.hud.arrow.style.display = 'none';
    }
    const L = LEVELS[w.n - 1];
    const medName = t(w.medal);
    const render = (box) => {
      box.innerHTML = `<div class="wmedal ${w.medal}">${IC[MEDAL_IC[w.medal]]}<b>${esc(medName)}</b></div>
        <div class="wrow"><span>${IC.clock}${esc(t('yourTime'))}</span><b>${fmtTime(w.tm)}</b></div>
        <div class="wrow small"><span>${IC.medal1}${fmtTime(L.gold)}</span><span>${IC.medal2}${fmtTime(L.silver)}</span></div>
        ${w.gained ? `<div class="wstars">${IC.star}<b>${esc(t('starsGot', { n: w.gained }))}</b></div>` : ''}
        ${w.toBank ? `<div class="free">${IC.bank}<div><b>${esc(t('toBank', { n: fmt(w.toBank * (w.doubled ? 2 : 1)) }))}</b></div>${w.doubled ? IC.check : `<button class="btn mid blue" data-x2="1">${IC.ad}${esc(t('bankX2'))}</button>`}</div>` : ''}
        <div class="col">
          ${w.n < 48 ? `<button class="btn big green" data-nx="1">${IC.fwd}${esc(t('next'))}</button>` : `<div class="feat">${esc(t('allDone'))}</div>`}
          <div class="row"><button class="btn mid wood" data-ag="1">${IC.restart}${esc(t('again'))}</button><button class="btn mid wood" data-mn="1">${IC.home}${esc(t('menu'))}</button></div>
        </div>`;
      const x2 = box.querySelector('[data-x2]');
      if (x2) x2.onclick = () => g.doubleBank();
      const nx = box.querySelector('[data-nx]');
      if (nx)
        nx.onclick = () => {
          this.closeModal(true);
          g.afterLevel(() => {
            g.showMenu();
            this.openIntro(w.n + 1);
          });
        };
      box.querySelector('[data-ag]').onclick = () => {
        this.closeModal(true);
        g.afterLevel(() => g.restart());
      };
      box.querySelector('[data-mn]').onclick = () => {
        this.closeModal(true);
        g.afterLevel(() => g.showMenu());
      };
    };
    this.modal(t('win'), '', (box, m) => {
      render(box);
      this.modalRefresh = () => render(box);
      m.querySelector('[data-x]').style.display = 'none';
      [0, 1, 2].slice(0, MEDAL_STARS[w.medal]).forEach((i) => setTimeout(() => audio.play('star', i), 300 + i * 250));
    }, 'win');
    sdk.gameplay(false);
  }
}
