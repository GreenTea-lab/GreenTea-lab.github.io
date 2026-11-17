// Интерфейс в DOM: меню, путешествие, панель партии, помощники и окна. Всё крупно и контрастно.
import { IC, SEASON_IC } from './icons.js';
import { t, fmt, LANG } from './i18n.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { iap, itemHTML } from './iap.js';
import { audio } from './audio.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import { level, SEASONS, LENS, STARTS, COUNT, chapterOf } from './levels.js';
import { blockSprite, STYLES, STYLE_ORDER, canvas } from './gfx.js';
import { itemURL } from './items.js';
import { nextDecor } from './table.js';
import { decorURL } from './decor-art.js';
import { SHAPE } from './core.js';
import { BOOST_PRICE, REVIVE_PRICE } from './game.js';
import { dayKey, dailyLevel } from './calendar.js';
import {NEW_SKINS,BOARDS,EFFECTS,material} from './materials.js';
import {MISSION_DEFS,missions,claimMission,weekly,weeklyLevel} from './progress.js';
import {hasDailyWin,personalStats} from './activity.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const STYLE_PRICE = { painted: 0, natural: 1500, pastel: 2500, khokhloma: 4000, knit: 2000, candy: 3000, pebble: 3500, gzhel: 4500, gem: 5500, ebony: 6500 };
NEW_SKINS.forEach((id,i)=>STYLE_PRICE[id]=400+(i%7)*250);
const DAILY = [50, 70, 90, 120, 150, 200, 300];
const today = dayKey;
const BOOSTS = ['hint', 'undo', 'hammer', 'shuffle'];
const THEME = { accent: '#39745a', track: '#c4a06d', thumb: '#f1d19a', muted: '#7a5a3a' };

export class UI {
  constructor(app, root) {
    this.app = app;
    this.root = root;
    this.modalOpen = false;
    this.shown = {};
    this.toasted = {};
    const st = document.createElement('style');
    st.textContent = volumeCss(THEME);
    document.head.appendChild(st);
    root.innerHTML = `<div class="screen"></div><div class="mlayer"></div><div class="tut"></div>`;
    this.scr = root.querySelector('.screen');
    this.ml = root.querySelector('.mlayer');
    this.tutEl = root.querySelector('.tut');
    this.season = null;
  }

  // ---------- общее ----------
  coinsChip() {
    return `<button class="chip coins" data-a="store">${IC.coin}<b class="cv">${fmt(save.data.coins)}</b><i class="plus">+</i></button>`;
  }
  bind(el) {
    el.querySelectorAll('[data-a]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const a = b.dataset.a;
        audio.unlock();
        audio.play('click');
        this.act(a, b);
      });
    });
  }
  act(a, b) {
    if (sdk.adActive || this.app.blocked) return;
    const A = this.app;
    switch (a) {
      case 'store': return this.store();
      case 'classic': return A.startClassic(!!save.data.classic);
      case 'newClassic': save.data.classic = null; return A.startClassic(false);
      case 'journey': return this.levels();
      case 'travelPlay': return A.startLevel(save.data.adventure?.idx ?? save.current(COUNT), { resume: true });
      case 'challenge': return this.challenge();
      case 'winCalendar': return this.winCalendar();
      case 'missions': return this.missions();
      case 'weekly': return this.weekly();
      case 'menu': return A.toMenu();
      case 'gift': return this.daily();
      case 'styles': return this.styles();
      case 'lb': return this.statistics();
      case 'settings': return this.settings();
      case 'pause': return this.pause();
      case 'how': return this.howTo();
      case 'season': this.season = +b.dataset.s; return this.levels();
      case 'level': return A.startLevel(+b.dataset.i);
      case 'boost': return A.useBoost(b.dataset.id);
      case 'cancelHammer': A.st.hammer = false; return this.hammerMode(false);
    }
  }

  refresh() {
    this.root.querySelectorAll('.cv').forEach((e) => (e.textContent = fmt(save.data.coins)));
    this.root.querySelectorAll('.boost').forEach((b) => {
      const id = b.dataset.id;
      const n = save.data.boosts[id] || 0;
      b.querySelector('.bdg').innerHTML = n > 0 ? `<b>${n}</b>` : save.data.coins >= BOOST_PRICE[id] ? `${IC.coin}<b>${BOOST_PRICE[id]}</b>` : `${IC.ad}`;
      b.classList.toggle('on', id === 'hammer' && this.app.st.hammer);
    });
    if (this.app.state === 'menu' && this.scr.querySelector('.menu')) {
      const g = this.scr.querySelector('.giftb');
      if (g) g.classList.toggle('ready', save.data.daily.day !== today());
    }
  }

  toast(text) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
  toastOnce(k, text) {
    if (this.toasted[k] || save.data.tut[k]) return;
    this.toasted[k] = 1;
    save.data.tut[k] = 1;
    save.write(false);
    this.toast(text);
  }

  // ---------- меню ----------
  menu() {
    this.closeModal();
    this.tutorial(0);
    const d = save.data;
    const cur = save.current(COUNT);
    const resume = !!d.classic;
    this.scr.innerHTML = `<div class="menu">
      <div class="topbar"><div class="tb-l"><span class="chip">${IC.star}<b>${save.stars()}</b></span></div><div class="tb-r">${this.coinsChip()}</div></div>
      <div class="logo"><div class="sign"><div class="sign-t">${esc(t('title'))}</div><div class="sign-s">${esc(t('subtitle'))}</div></div></div>
      <div class="mbtns">
        <button class="bigbtn green" data-a="travelPlay"><span class="bt">${esc(t(d.adventure ? 'continueJourney' : 'playJourney'))}</span><span class="bs">${esc(t('levelN', { n: (d.adventure?.idx ?? cur) + 1 }))} · ${esc(t('shortSession'))}</span></button>
        <button class="bigbtn honey" data-a="classic"><span class="bt">${esc(resume ? t('continueClassic') : t('classic'))}</span><span class="bs">${IC.crown}${esc(t('record'))}: ${fmt(d.best)}</span></button>
        ${resume ? `<button class="smallbtn" data-a="newClassic">${IC.restart}${esc(t('newGame'))}</button>` : ''}
      </div>
      <div class="tiles">
        <button class="tile giftb ${d.daily.day !== today() ? 'ready' : ''}" data-a="gift">${IC.gift}<span>${esc(t('gift'))}</span></button>
        <button class="tile" data-a="challenge">${IC.star}<span>${esc(t('challenge'))}</span></button>
        <button class="tile" data-a="journey">${IC.book}<span>${esc(t('chapters'))}</span></button>
        <button class="tile" data-a="styles">${IC.blocks}<span>${esc(t('styles'))}</span></button>
        <button class="tile" data-a="store">${IC.shop}<span>${esc(t('shop'))}</span></button>
        <button class="tile" data-a="settings">${IC.gear}<span>${esc(t('settings'))}</span></button>
      </div>
    </div>`;
    this.bind(this.scr);
    this.menuAvoid();
    audio.setMood('menu');
  }

  // вещи на столе раскладываются вокруг кнопок меню
  menuAvoid() {
    requestAnimationFrame(() => {
      const rs = [...this.scr.querySelectorAll('.sign,.mbtns,.tiles,.topbar')].map((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      });
      const v = this.app.view;
      v.menuAvoid = rs;
      if (v.mode !== 'play') v.rebuild();
    });
  }

  // ---------- путешествие ----------
  levels() {
    this.closeModal();
    const cur = save.current(COUNT);
    if (this.season === null) this.season = chapterOf(cur);
    const s = this.season;
    const S = SEASONS[s];
    this.app.applyDecor(S.id, false, S.id);
    const stars = save.stars();
    const nd = nextDecor(stars);
    const seasonOpen = (k) => save.open(STARTS[k]);
    const tabs = SEASONS.map((x, k) => `<button class="stab ${k === s ? 'on' : ''} ${seasonOpen(k) ? '' : 'locked'}" data-a="season" data-s="${k}">${SEASON_IC[x.bg||x.id]||IC.book}<span>${k+1}. ${esc(t('s_' + x.id))}</span></button>`).join('');
    let cells = '';
    for (let k = 0; k < LENS[s]; k++) {
      const i = STARTS[s] + k;
      const open = save.open(i);
      const lv = save.data.levels[i];
      const st = lv ? lv.stars : 0;
      const L = level(i);
      const goalIc = L.goal.type !== 'items' ? `<span class="lg sc">${esc(t('goal_'+L.goal.type))} ${fmt(L.goal.target)}</span>` : Object.keys(L.goal.items).map((it) => `<img src="${itemURL(it)}" alt="">`).join('');
      cells += `<button class="lvl ${open ? '' : 'locked'} ${lv ? 'done' : ''} ${i === cur ? 'cur' : ''}" ${open ? `data-a="level" data-i="${i}"` : ''}>
        <span class="ln">${i + 1}</span>
        ${open ? `<span class="lgoal">${goalIc}</span><span class="lst">${[0, 1, 2].map((q) => (q < st ? IC.star : IC.starEmpty)).join('')}</span>` : `<span class="llock">${IC.lock}</span>`}
      </button>`;
    }
    this.scr.innerHTML = `<div class="levels">
      <div class="topbar"><div class="tb-l"><button class="round" data-a="menu" aria-label="back">${IC.back}</button><span class="chip">${IC.star}<b>${stars}</b></span></div><div class="tb-r">${this.coinsChip()}</div></div>
      <div class="lpanel">
        <div class="ltitle">${esc(t('journey'))}</div>
        <div class="chapter-summary">${esc(t('chapterRange',{a:STARTS[s]+1,b:STARTS[s]+LENS[s]}))} · ${Object.keys(save.data.levels).filter(i=>+i>=STARTS[s]&&+i<STARTS[s]+LENS[s]).length} / ${LENS[s]}</div>
        <div class="stabs">${tabs}</div>
        ${seasonOpen(s) ? `<div class="lgrid">${cells}</div>` : `<div class="slock">${IC.lock}<span>${esc(t('seasonLocked', { n: STARTS[s] }))}</span></div>`}
        ${nd ? `<div class="decor-next"><span>${esc(t('nextDecor'))}: <b>${esc(t('d_' + nd.id))}</b></span><span class="dn">${IC.star}${stars} / ${nd.stars}</span></div>` : `<div class="decor-next"><b>${esc(t('allDecor'))}</b></div>`}
      </div>
    </div>`;
    this.bind(this.scr);
    this.scr.querySelector('.stab.on')?.scrollIntoView({inline:'center',block:'nearest'});
    const c = this.scr.querySelector('.lvl.cur');
    if (c) c.scrollIntoView({ block: 'nearest' });
  }

  // ---------- панель партии ----------
  hud() {
    this.closeModal();
    const A = this.app, g = A.st.game;
    const adv = A.mode === 'adv';
    let center;
    if (adv) {
      const L = level(A.levelIdx);
      this.shown = {};
      let goals;
      if (L.goal.type === 'items') {
        goals = Object.entries(L.goal.items)
          .map(([it, n]) => {
            this.shown[it] = Math.max(0, n - (g.collected[it] || 0));
            return `<div class="goal" data-it="${it}"><img src="${itemURL(it)}" alt=""><b>${this.shown[it]}</b><i class="ok">${IC.check}</i></div>`;
          })
          .join('');
      } else goals = `<div class="goal gscore"><span>${esc(t('goal_'+L.goal.type))}</span><b class="gsc">${fmt(g.goalValue())} / ${fmt(L.goal.target)}</b></div>`;
      center = `<div class="hc adv"><div class="hl"><span class="hlv">${esc(A.eventRun?t('weekly'):A.dailyRun ? t('challenge') : t('levelN', { n: A.levelIdx + 1 }))} · </span><span class="mv"></span></div></div><div class="goals">${goals}</div>`;
    } else {
      center = `<div class="hc"><div class="score">${fmt(g.score)}</div><div class="best">${IC.crown}<span>${fmt(Math.max(save.data.best, g.score))}</span></div></div>`;
    }
    const boosts = BOOSTS.map((id) => `<button class="boost" data-a="boost" data-id="${id}">${IC[id]}<span class="bl">${esc(t('b_' + id))}</span><span class="bdg"></span></button>`).join('');
    this.scr.innerHTML = `<div class="hud">
      <div class="hbar ${adv ? 'adv' : ''}"><button class="round" data-a="pause" aria-label="menu">${IC.menu}</button>${center}${this.coinsChip()}</div>
      <div class="helpers">${boosts}</div>
      <div class="hammerbar"><span>${esc(t('hammerTip'))}</span><button class="smallbtn" data-a="cancelHammer">${esc(t('cancel'))}</button></div>
    </div>`;
    this.bind(this.scr);
    this.layout(A.view.L);
    this.refresh();
    this.hudUpdate();
  }

  layout(L) {
    if (!L) return;
    const h = this.scr.querySelector('.helpers');
    if (h) {
      const r = L.help;
      Object.assign(h.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', flexDirection: r.vert ? 'column' : 'row' });
      h.classList.toggle('vert', r.vert);
    }
    const hb = this.scr.querySelector('.hbar');
    if (hb) {
      hb.style.height = L.hud.h + 'px';
      Object.assign(hb.style,{top:L.hud.y+'px',left:L.hud.x+'px',width:L.hud.w+'px',right:'auto'});
      hb.classList.toggle('two', L.port);
    }
    const hm = this.scr.querySelector('.hammerbar');
    if (hm) {
      hm.style.left = L.board.x + 'px';
      hm.style.width = L.board.s + 'px';
      hm.style.top = L.board.y - 8 + 'px';
    }
    if (this.app.state === 'menu') this.menuAvoid();
    if (this.tutStep) this.placeTut();
  }

  hudUpdate() {
    const A = this.app, g = A.st.game;
    if (!g) return;
    const sc = this.scr.querySelector('.score');
    if (sc) {
      this.animNum(sc, g.score);
      const b = this.scr.querySelector('.best span');
      if (b) b.textContent = fmt(Math.max(save.data.best, g.score));
    }
    if (A.mode === 'adv') {
      const L = level(A.levelIdx);
      const mv = this.scr.querySelector('.mv');
      if (mv) {
        const st = g.moves <= L.par ? 3 : g.moves <= Math.ceil(L.par * 1.5) ? 2 : 1;
        mv.innerHTML = `${esc(t('moves'))}: <b>${g.moves}</b> <span class="mst">${[0, 1, 2].map((q) => (q < st ? IC.star : IC.starEmpty)).join('')}</span>`;
      }
      const gs = this.scr.querySelector('.gsc');
      if (gs) gs.textContent = `${fmt(Math.min(g.goalValue(), L.goal.target))} / ${fmt(L.goal.target)}`;
      // если ничего не летит — счётчики целей по факту (после отмены хода)
      if (L.goal.type === 'items' && !A.view.fx.items.length) {
        for (const [it, n] of Object.entries(L.goal.items)) {
          this.shown[it] = Math.max(0, n - (g.collected[it] || 0));
          this.setGoal(it);
        }
      }
    }
  }

  animNum(el, to) {
    const from = +(el.dataset.v || 0);
    el.dataset.v = to;
    if (to <= from || to - from > 5000) return (el.textContent = fmt(to));
    const t0 = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / 400);
      el.textContent = fmt(from + (to - from) * u);
      if (u < 1 && +el.dataset.v === to) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  goalPos(it) {
    const e = this.scr.querySelector(`.goal[data-it="${it}"] img`);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  bumpGoal(it) {
    if (this.shown[it] === undefined) return;
    this.shown[it] = Math.max(0, this.shown[it] - 1);
    this.setGoal(it, true);
  }
  setGoal(it, bump) {
    const e = this.scr.querySelector(`.goal[data-it="${it}"]`);
    if (!e) return;
    e.querySelector('b').textContent = this.shown[it];
    e.classList.toggle('done', this.shown[it] === 0);
    if (bump) {
      e.classList.remove('bump');
      void e.offsetWidth;
      e.classList.add('bump');
      if (this.shown[it] === 0) audio.play('goal');
    }
  }

  hammerMode(on) {
    this.scr.querySelector('.hammerbar')?.classList.toggle('show', on);
    this.refresh();
  }

  // ---------- окна ----------
  modal(html, cls = '', onClose) {
    this.closeModal();
    this.modalOpen = true;
    this.app.cancelDrag();
    sdk.gameplay(false);
    const m = document.createElement('div');
    m.className = 'modal ' + cls;
    m.innerHTML = `<div class="mpanel">${html}</div>`;
    m.addEventListener('pointerdown', (e) => e.stopPropagation());
    for (const type of ['pointerup', 'pointermove', 'click']) m.addEventListener(type, e => e.stopPropagation());
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    this.ml.appendChild(m);
    this.bind(m);
    m.querySelectorAll('[data-x]').forEach((b) =>
      b.addEventListener('click', () => {
        audio.play('click');
        this.closeModal();
        onClose && onClose();
      }),
    );
    this.syncAds();
    return m;
  }
  syncAds() {
    const available = sdk.canReward();
    this.root.querySelectorAll('[data-ad],[data-x2],[data-free]').forEach(b => b.hidden = !available);
  }
  closeModal() {
    this.ml.innerHTML = '';
    this.modalOpen = false;
    sdk.gameplay(this.app.state === 'play' && !this.app.finished && !sdk.adActive && !this.app.blocked);
  }
  head(title, close = true) {
    return `<div class="mhead"><b>${esc(title)}</b>${close ? `<button class="round small" data-x aria-label="close">${IC.close}</button>` : ''}</div>`;
  }

  levelIntro(L) {
    const g = this.app.st.game;
    let goal;
    if (L.goal.type === 'items') {
      goal = `<div class="igoal">${Object.entries(L.goal.items).map(([it, n]) => `<div class="ig"><img src="${itemURL(it)}" alt=""><b>${n}</b></div>`).join('')}</div><p class="itxt">${esc(t('taskItems'))}</p>`;
    } else goal = `<div class="igoal"><div class="ig sc">${IC.crown}<b>${fmt(L.goal.target)}</b></div></div><p class="itxt">${esc(t('task_'+L.goal.type, { n: fmt(L.goal.target) }))}</p>`;
    const m = this.modal(`${this.head((this.app.eventRun?t('weekly'):this.app.dailyRun ? t('challenge') : t('levelN', { n: L.idx + 1 })) + ' · ' + t('s_' + L.S.id), false)}<div class="mbody">${goal}
      ${L.idx < 3 ? `<p class="itxt small">${esc(t('firstSteps'))}</p>` : ''}
      ${L.goal.onlyBoard?`<p class="itxt small">${esc(t('deliveryRule'))}</p>`:''}
      ${L.modifier?`<p class="itxt small">${esc(t('mod_'+L.modifier))}</p>`:''}
      <div class="ipar">${IC.star}${IC.star}${IC.star}<span>${esc(t('parTxt', { n: L.par }))}</span></div>
      <button class="bigbtn green" data-go>${IC.play}<span class="bt">${esc(t('start'))}</span></button></div>`, 'intro');
    sdk.gameplay(false);
    m.querySelector('[data-go]').onclick = () => {
      audio.play('click');
      this.closeModal();
      sdk.gameplay(true);
      if (!save.data.tut.adv) {
        save.data.tut.adv = 1;
        save.write(false);
        this.app.applyBoost('hint');
      }
    };
  }

  pause() {
    sdk.gameplay(false);
    const A = this.app;
    const d = save.data;
    const m = this.modal(`${this.head(t('pause'))}<div class="mbody">
      <button class="bigbtn green" data-x>${IC.play}<span class="bt">${esc(t('resume'))}</span></button>
      ${slidersHTML(d.settings, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}
      <div class="row2"><button class="midbtn" data-r>${IC.restart}<span>${esc(t('restart'))}</span></button><button class="midbtn" data-a="how">${IC.book}<span>${esc(t('howTo'))}</span></button></div>
      <button class="midbtn wide" data-m>${IC.home}<span>${esc(A.mode === 'classic' ? t('toMenuSaved') : t('toMenu'))}</span></button>
    </div>`, '', () => sdk.gameplay(true));
    bindSliders(m, d.settings, () => save.write());
    m.querySelector('[data-r]').onclick = () => {
      audio.play('click');
      this.closeModal();
      if (A.mode === 'classic') {
        save.data.classic = null;
        A.adBreak(() => A.startClassic(false));
      } else A.adBreak(() => A.restartLevel());
    };
    m.querySelector('[data-m]').onclick = () => {
      audio.play('click');
      this.closeModal();
      if(A.dailyRun||A.eventRun){const event=!!A.eventRun;A.toMenu();event?this.weekly():this.challenge();return;}
      if (A.mode === 'adv') this.season = chapterOf(A.levelIdx);
      A.mode === 'adv' ? (A.toMenu(), this.levels()) : A.toMenu();
    };
  }

  settings() {
    const d = save.data;
    const m = this.modal(`${this.head(t('settings'))}<div class="mbody">
      ${slidersHTML(d.settings, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}
      <label class="motion-setting"><input type="checkbox" data-motion ${d.settings.ambient !== false ? 'checked' : ''}>${esc(t('ambient'))}</label>
      <button class="midbtn wide" data-a="lb">${IC.trophy}<span>${esc(t('records'))}</span></button>
      <button class="midbtn wide" data-a="how">${IC.book}<span>${esc(t('howTo'))}</span></button>
    </div>`);
    bindSliders(m, d.settings, () => save.write());
    m.querySelector('[data-motion]').onchange = e => { d.settings.ambient = e.target.checked; this.app.view.ambientOn = e.target.checked; save.write(); };
  }

  howTo() {
    const back = this.app.state === 'play' ? () => this.pause() : null;
    this.modal(`${this.head(t('howTo'))}<div class="mbody how">
      <div class="hrow"><span class="hn">1</span><p>${esc(t('how1'))}</p></div>
      <div class="hrow"><span class="hn">2</span><p>${esc(t('how2'))}</p></div>
      <div class="hrow"><span class="hn">3</span><p>${esc(t('how3'))}</p></div>
      <div class="hrow"><span class="hn">4</span><p>${esc(t('how4'))}</p></div>
      <div class="hrow"><span class="hn">5</span><p>${esc(t('how5'))}</p></div>
      <button class="bigbtn green" data-x><span class="bt">${esc(t('ok'))}</span></button>
    </div>`, 'howm', back);
  }

  noSpace() {
    const A = this.app, g = A.st.game;
    const canRevive = A.mode === 'adv' || !A.revived;
    const d = save.data;
    const m = this.modal(`${this.head(t('noSpace'), false)}<div class="mbody">
      <p class="itxt">${esc(A.mode === 'classic' ? t('noSpaceTxt', { n: fmt(g.score) }) : t('noSpaceAdv'))}</p>
      ${canRevive ? `<button class="bigbtn green" data-ad>${IC.ad}<span class="bt">${esc(t('reviveAd'))}</span></button>` : ''}
      ${canRevive && A.mode === 'adv' ? `<button class="midbtn wide" data-c ${d.coins < REVIVE_PRICE ? 'disabled' : ''}>${IC.coin}<span>${esc(t('reviveCoins', { n: REVIVE_PRICE }))}</span></button>` : ''}
      <button class="midbtn wide" data-end>${A.mode === 'classic' ? IC.check.replace('#fff', '#3b2412') : IC.restart}<span>${esc(A.mode === 'classic' ? t('finish') : t('tryAgain'))}</span></button>
      ${A.mode === 'adv' ? `<button class="midbtn wide" data-lv>${IC.home}<span>${esc(t('toLevels'))}</span></button>` : ''}
    </div>`, 'nospace');
    const ad = m.querySelector('[data-ad]');
    if (ad) ad.onclick = () => { audio.play('click'); this.closeModal(); A.revive('ad'); };
    const c = m.querySelector('[data-c]');
    if (c) c.onclick = () => { audio.play('click'); this.closeModal(); A.revive('coins'); this.refresh(); };
    m.querySelector('[data-end]').onclick = () => {
      audio.play('click');
      this.closeModal();
      if (A.mode === 'classic') A.endClassic();
      else A.adBreak(() => A.restartLevel());
    };
    const lv = m.querySelector('[data-lv]');
    if (lv) lv.onclick = () => { audio.play('click'); this.season = chapterOf(A.levelIdx); A.adBreak(() => { A.toMenu(); this.levels(); }); };
  }

  classicResult(r) {
    const A = this.app;
    let claimed = false;
    const m = this.modal(`${this.head(r.record ? t('newRecord') : t('gameOver'), false)}<div class="mbody">
      ${r.record ? `<div class="rec">${IC.crown}</div>` : ''}
      <div class="bigscore">${fmt(r.score)}</div>
      <div class="bestl">${IC.crown}${esc(t('record'))}: <b>${fmt(r.best)}</b></div>
      <div class="earn">${IC.coin}<b>+<span class="en">${r.coins}</span></b></div>
      <button class="midbtn wide blue" data-x2>${IC.ad}<span>${esc(t('coinsX2'))}</span></button>
      <button class="bigbtn green" data-again>${IC.restart.replace(/#3b2412/g, '#fff')}<span class="bt">${esc(t('playAgain'))}</span></button>
      <button class="midbtn wide" data-m>${IC.home}<span>${esc(t('toMenu'))}</span></button>
    </div>`, 'result');
    m.querySelector('[data-x2]').onclick = (e) => {
      if (claimed) return;
      audio.play('click');
      sdk.showRewarded(() => {
        claimed = true;
        save.data.coins += r.coins;
        save.write();
        m.querySelector('.en').textContent = r.coins * 2;
        e.target.closest('button').disabled = true;
        audio.play('coin');
        this.refresh();
      });
    };
    m.querySelector('[data-again]').onclick = () => { audio.play('click'); this.closeModal(); A.adBreak(() => A.startClassic(false)); };
    m.querySelector('[data-m]').onclick = () => { audio.play('click'); this.closeModal(); A.adBreak(() => A.toMenu()); };
  }

  levelResult(r) {
    const A = this.app;
    const decor = r.newDecor.length ? `<div class="newdecor"><div class="decor-reward">${r.newDecor.map(x=>`<img src="${decorURL(x)}" alt="${esc(t('d_'+x))}">`).join('')}</div>${esc(t('newDecor'))}: <b>${r.newDecor.map(x=>esc(t('d_'+x))).join(', ')}</b><p>${esc(t('decorRewardInfo'))}</p><button class="midbtn" data-decor>${esc(t('viewTable'))}</button></div>` : '';
    const m = this.modal(`${this.head(t('levelDone'), false)}<div class="mbody">
      <div class="bigstars">${[0, 1, 2].map((q) => `<span class="bst ${q < r.stars ? 'on' : ''}" style="animation-delay:${0.2 + q * 0.25}s">${q < r.stars ? IC.star : IC.starEmpty}</span>`).join('')}</div>
      <div class="bestl">${esc(t('moves'))}: <b>${r.moves}</b> · ${esc(t('parShort', { n: r.L.par }))}</div>
      <div class="earn">${IC.coin}<b>+${r.coins}</b></div>
      ${decor}
      ${r.last ? `<p class="itxt">${esc(t('allDone'))}</p>` : `<button class="bigbtn green" data-next>${IC.play}<span class="bt">${esc(t('next'))}</span></button>`}
      <div class="row2"><button class="midbtn" data-again>${IC.restart}<span>${esc(t('again'))}</span></button><button class="midbtn" data-lv>${IC.home}<span>${esc(t('toLevels'))}</span></button></div>
    </div>`, 'result');
    [0, 1, 2].forEach((q) => q < r.stars && setTimeout(() => audio.play('star', q), 250 + q * 250));
    m.querySelector('[data-decor]')?.addEventListener('click',()=>A.toMenu());
    const nx = m.querySelector('[data-next]');
    if (nx) nx.onclick = () => { audio.play('click'); this.closeModal(); A.adBreak(() => A.startLevel(r.L.idx + 1)); };
    m.querySelector('[data-again]').onclick = () => { audio.play('click'); this.closeModal(); A.adBreak(() => A.startLevel(r.L.idx)); };
    m.querySelector('[data-lv]').onclick = () => {
      audio.play('click');
      this.closeModal();
      this.season = chapterOf(Math.min(COUNT - 1, r.L.idx + 1));
      A.adBreak(() => { A.toMenu(); this.levels(); });
    };
  }

  challenge() {
    const d=save.data, done=hasDailyWin(today()), count=d.challenge.completed||0;
    const m=this.modal(`${this.head(t('challenge'))}<div class="mbody"><div class="challenge-seal">${IC.star}</div><p class="itxt">${esc(t('challengeText'))}</p><div class="week-stamps">${Array.from({length:7},(_,i)=>`<span class="${i<count%7?'done':''}">${IC.star}</span>`).join('')}</div><p class="itxt small">${esc(t('challengeProgress',{n:count%7}))}</p><p class="itxt">${esc(t(done?'challengeDone':'challengeReward'))}</p><button class="bigbtn green" data-start><span class="bt">${esc(t(done?'again':'playJourney'))}</span></button></div>`,'challengem');
    m.querySelector('.mbody').insertAdjacentHTML('beforeend',`<div class="row2 activity-links"><button class="midbtn" data-a="winCalendar">${esc(t('winCalendar'))}</button><button class="midbtn" data-a="lb">${esc(t('records'))}</button></div><div class="row2"><button class="midbtn" data-a="missions">${esc(t('missions'))}</button><button class="midbtn" data-a="weekly">${esc(t('weekly'))}</button></div>`);this.bind(m);
    m.querySelector('[data-start]').onclick=()=>{this.closeModal();const x=dailyLevel();this.app.startLevel(x.index,{daily:x});};
  }

  challengeResult({coins,bonus,first}) {
    const m=this.modal(`${this.head(t('levelDone'),false)}<div class="mbody"><div class="bigstars">${IC.star}${IC.star}${IC.star}</div><p class="itxt">${esc(t(first?'challengeWin':'challengeDone'))}</p><div class="earn">${IC.coin}<b>+${coins}</b></div>${bonus?`<p class="itxt">${esc(t('challengeBonus'))}</p>`:''}<button class="bigbtn green" data-home><span class="bt">${esc(t('toMenu'))}</span></button></div>`,'result');
    m.querySelector('[data-home]').onclick=()=>this.app.toMenu();
  }

  needCoins(id, onAd) {
    const m = this.modal(`${this.head(t('b_' + id))}<div class="mbody">
      <div class="bicon">${IC[id]}</div>
      <p class="itxt">${esc(t('d_b_' + id))}</p>
      <p class="itxt small">${esc(t('needCoins', { n: BOOST_PRICE[id] }))}</p>
      <button class="bigbtn green" data-ad>${IC.ad}<span class="bt">${esc(t('freeForAd'))}</span></button>
      <button class="midbtn wide" data-a="store">${IC.shop}<span>${esc(t('shop'))}</span></button>
    </div>`);
    m.querySelector('[data-ad]').onclick = () => { audio.play('click'); this.closeModal(); onAd(); };
  }

  daily() {
    const d = save.data;
    const td = today();
    const got = d.daily.day === td;
    const yd = new Date(); yd.setDate(yd.getDate() - 1);
    const yest = dayKey(yd);
    const streak = got ? d.daily.streak : d.daily.day === yest ? (d.daily.streak % 7) + 1 : 1;
    const amount = DAILY[streak - 1];
    const days = DAILY.map((c, k) => `<div class="dday ${k + 1 < streak || (got && k + 1 === streak) ? 'taken' : ''} ${k + 1 === streak ? 'today' : ''}"><small>${esc(t('day', { n: k + 1 }))}</small>${IC.coin}<b>${c}</b></div>`).join('');
    const m = this.modal(`${this.head(t('gift'))}<div class="mbody">
      <div class="days">${days}</div>
      <p class="itxt">${esc(got ? t('giftTaken') : t('giftTxt'))}</p>
      ${got ? '' : `<button class="bigbtn green" data-take>${IC.coin}<span class="bt">${esc(t('take'))} ${amount}</span></button><button class="midbtn wide blue" data-x2>${IC.ad}<span>${esc(t('takeX2', { n: amount * 2 }))}</span></button>`}
    </div>`);
    const take = (k) => {
      if (d.daily.day === td) return;
      d.daily = { day: td, streak };
      d.coins += amount * k;
      // седьмой день — ещё и помощники
      if (streak === 7) BOOSTS.forEach((b) => (d.boosts[b] += 1));
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

  styles(tab='blocks') {
    const d = save.data;
    if(tab!=='blocks')return this.cosmeticsTab(tab);
    const prev = (id) => {
      const c = canvas(280, 110);
      const g = c.getContext('2d');
      [0, 2, 4, 6].forEach((ci, k) => g.drawImage(blockSprite(id, ci, 112), 4 + k * 65, k % 2 ? 14 : 2, 80, 80));
      return c.toDataURL();
    };
    const card = (id) => {
      const own = d.styles.includes(id);
      const on = d.style === id;
      const btn = on ? `<span class="sel">${esc(t('selected'))}</span>` : own ? `<button class="midbtn green" data-use="${id}">${esc(t('choose'))}</button>` : `<button class="midbtn honey" data-buy="${id}" ${d.coins < STYLE_PRICE[id] ? 'disabled' : ''}>${IC.coin}<span>${fmt(STYLE_PRICE[id])}</span></button>`;
      return `<div class="scard ${on ? 'on' : ''}"><img src="${prev(id)}" alt=""><b>${esc(t('st_' + id))}</b>${btn}</div>`;
    };
    const m = this.modal(`${this.head(t('workshop'))}${this.workshopTabs(tab)}<div class="mbody"><p class="itxt small">${esc(t('stylesTxt'))}</p><div class="scards">${STYLE_ORDER.map(card).join('')}</div></div>`, 'stylesm');
    this.bindWorkshop(m);
    m.querySelectorAll('[data-use]').forEach((b) => (b.onclick = () => { audio.play('click'); this.app.setStyle(b.dataset.use); this.styles(); }));
    m.querySelectorAll('[data-buy]').forEach((b) =>
      (b.onclick = () => {
        const id = b.dataset.buy;
        if(d.styles.includes(id))return;
        if (d.coins < STYLE_PRICE[id]) return;
        d.coins -= STYLE_PRICE[id];
        d.styles.push(id);
        this.app.setStyle(id);
        audio.play('buy');
        this.styles();
        this.refresh();
      }),
    );
  }

  workshopTabs(on){return `<div class="work-tabs">${['blocks','boards','effects','album'].map(x=>`<button class="midbtn ${x===on?'honey':''}" data-tab="${x}">${esc(t('tab_'+x))}</button>`).join('')}</div>`;}
  boardThumb(id){return this.app.view.boardPreview(id);}
  bindWorkshop(m){m.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>this.styles(b.dataset.tab));}
  cosmeticsTab(tab){
    const d=save.data,c=d.cosmetics;
    if(tab==='album'){
      const cards=SEASONS.map((s,k)=>{
        const wins=Object.keys(d.levels).filter(i=>+i>=STARTS[k]&&+i<STARTS[k]+LENS[k]).length;
        const marks=[3,Math.ceil(LENS[k]/2),LENS[k]],bg=window.__FB_ART__?.[s.bg||s.id]||'';
        return `<article class="album-card"><img src="${bg}" alt=""><b>${k+1}. ${esc(t('s_'+s.id))}</b><small>${wins} / ${LENS[k]}</small><div class="album-marks">${marks.map((n,j)=>{const key=k+':'+j,got=c.claimed.includes(key);return `<button class="smallbtn" data-medal="${key}" ${wins<n||got?'disabled':''}>${got?'✓':wins>=n?IC.gift:IC.lock}<span>${n}</span></button>`;}).join('')}</div></article>`;
      }).join('');
      const m=this.modal(`${this.head(t('album'))}${this.workshopTabs(tab)}<div class="mbody"><p class="itxt small">${esc(t('albumInfo'))}</p><div class="album-grid">${cards}</div>${d.trophies.length?`<p class="itxt">${esc(t('weeklyTrophies'))}: ${d.trophies.length}</p>`:''}</div>`,'stylesm');this.bindWorkshop(m);
      m.querySelectorAll('[data-medal]').forEach(b=>b.onclick=()=>{
        const [k,j]=b.dataset.medal.split(':').map(Number),key=k+':'+j;
        const wins=Object.keys(d.levels).filter(i=>+i>=STARTS[k]&&+i<STARTS[k]+LENS[k]).length,need=[3,Math.ceil(LENS[k]/2),LENS[k]][j];
        if(wins<need||c.claimed.includes(key))return;
        c.claimed.push(key);d.coins+=[60,120,300][j];
        if(j===2){const skin=NEW_SKINS[k%NEW_SKINS.length];if(!d.styles.includes(skin))d.styles.push(skin);}
        save.write();audio.play('coin');this.styles('album');this.refresh();
      });return;
    }
    const defs=tab==='boards'?BOARDS:EFFECTS,owned=tab==='boards'?'boards':'effects',selected=tab==='boards'?'board':'effect';
    const cards=Object.entries(defs).map(([id,x])=>`<article class="scard"><div class="cosmetic-preview ${tab==='boards'?'board-preview':'effect-preview'}" style="--ca:${x.a||'#735138'};--cb:${x.b||'#331c12'}"><img src="${tab==='boards'?this.boardThumb(id):this.app.view.effectPreview(id)}" alt=""></div><b>${esc(t((tab==='boards'?'board_':'effect_')+id))}</b>${c[selected]===id?`<span class="sel">${esc(t('selected'))}</span>`:`<button class="midbtn ${c[owned].includes(id)?'green':'honey'}" data-cosmetic="${id}" ${!c[owned].includes(id)&&d.coins<x.price?'disabled':''}>${esc(c[owned].includes(id)?t('choose'):fmt(x.price)+' '+t('coinsWord'))}</button>`}</article>`).join('');
    const m=this.modal(`${this.head(t('workshop'))}${this.workshopTabs(tab)}<div class="mbody"><div class="scards">${cards}</div></div>`,'stylesm');this.bindWorkshop(m);
    m.querySelectorAll('[data-cosmetic]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.cosmetic,x=defs[id];if(!x)return;
      if(!c[owned].includes(id)){if(d.coins<x.price)return;d.coins-=x.price;c[owned].push(id);}
      c[selected]=id;save.write();this.app.applyCosmetics();this.styles(tab);this.refresh();
    });
  }

  missions(){
    const m=missions();
    const root=this.modal(`${this.head(t('missions'))}<div class="mbody"><p class="itxt small">${esc(t('missionInfo'))}</p>${MISSION_DEFS.map(x=>`<div class="mission-card"><b>${esc(t('mission_'+x.id))}</b><progress max="${x.target}" value="${Math.min(x.target,m[x.id])}"></progress><span>${Math.min(x.target,m[x.id])} / ${x.target}</span><button class="midbtn honey" data-claim="${x.id}" ${m[x.id]<x.target||m.claimed.includes(x.id)?'disabled':''}>${m.claimed.includes(x.id)?'✓':IC.coin+' '+x.reward}</button></div>`).join('')}</div>`);
    root.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>{if(claimMission(b.dataset.claim)){this.missions();this.refresh();}});
  }
  weekly(){
    const w=weekly(),done=w.stage>=5;
    const m=this.modal(`${this.head(t('weekly'))}<div class="mbody"><p class="itxt">${esc(t('weeklyInfo'))}</p><div class="week-stamps">${Array.from({length:5},(_,i)=>`<span class="${i<w.stage?'done':''}">${IC.star}</span>`).join('')}</div><p class="itxt">${w.stage} / 5</p>${done?`<p class="itxt">${esc(t('weeklyDone'))}</p>`:`<button class="bigbtn green" data-event><span class="bt">${esc(t('playJourney'))}</span></button>`}</div>`);
    m.querySelector('[data-event]')?.addEventListener('click',()=>{const x=weeklyLevel();x.seed=level(x.index).seeds[0];this.closeModal();this.app.startLevel(x.index,{event:x});});
  }
  eventResult(coins){
    const m=this.modal(`${this.head(t('levelDone'),false)}<div class="mbody"><div class="earn">${IC.coin}+${coins}</div><p class="itxt">${weekly().stage>=5?esc(t('weeklyDone')):esc(t('weekly'))+' '+weekly().stage+' / 5'}</p><button class="bigbtn green" data-event-next><span class="bt">${esc(t('next'))}</span></button><button class="midbtn" data-a="menu">${esc(t('toMenu'))}</button></div>`,'result');m.querySelector('[data-event-next]').onclick=()=>{this.app.toMenu();this.weekly();};
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
        if (Date.now() - (d.freeAt || 0) <= 4 * 60 * 1000) return;
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

  formatActivityDate(key,month=false){
    return new Intl.DateTimeFormat(LANG==='ru'?'ru-RU':'en-US',{year:'numeric',month:'long',...(month?{}:{day:'numeric'})}).format(new Date(key+(month?'-01':'')+'T12:00:00'));
  }

  winCalendar(offset=0){
    const now=new Date(),current=today().slice(0,7),activity=save.data.activity;
    const earliest=[activity.since,...Object.keys(activity.days)].sort()[0].slice(0,7);
    const date=new Date(now.getFullYear(),now.getMonth()+Math.min(0,offset),1,12),month=dayKey(date).slice(0,7);
    const start=(date.getDay()+6)%7,total=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
    const wins=personalStats(month).dailyWins;
    const cells=Array.from({length:start},()=>'<span class="cal-empty" aria-hidden="true"></span>');
    for(let n=1;n<=total;n++){
      const key=month+'-'+String(n).padStart(2,'0'),won=hasDailyWin(key),future=key>today(),label=this.formatActivityDate(key)+' — '+t(won?'calWon':future?'calFuture':'calNoWin');
      cells.push(`<div class="cal-day ${won?'won':''} ${future?'future':''} ${key===today()?'today':''}" data-day="${key}" aria-label="${esc(label)}"><b>${n}</b><span aria-hidden="true">${won?IC.star:'·'}</span></div>`);
    }
    const m=this.modal(`${this.head(t('winCalendar'))}<div class="mbody"><div class="activity-nav"><button class="round small" data-cal-prev ${month<=earliest?'disabled':''} aria-label="${esc(t('prevMonth'))}">‹</button><b>${esc(this.formatActivityDate(month,true))}</b><button class="round small" data-cal-next ${month>=current?'disabled':''} aria-label="${esc(t('nextMonth'))}">›</button></div><div class="win-calendar">${t('weekDays').split('|').map(x=>`<span class="cal-weekday">${esc(x)}</span>`).join('')}${cells.join('')}</div><p class="itxt small">${esc(t('monthWins',{n:wins}))}</p><p class="activity-note">${esc(t('calendarLegend'))}</p><button class="bigbtn green" data-play-today><span class="bt">${esc(t('playToday'))}</span></button></div>`,'activity-modal calendar-modal',()=>this.challenge());
    m.querySelector('[data-cal-prev]').onclick=()=>this.winCalendar(offset-1);
    m.querySelector('[data-cal-next]').onclick=()=>this.winCalendar(offset+1);
    m.querySelector('[data-play-today]').onclick=()=>{this.closeModal();const x=dailyLevel();this.app.startLevel(x.index,{daily:x});};
  }

  statistics(mode='day',period=null){
    const current=today(),since=save.data.activity.since,month=mode==='month';
    const earliest=month?since.slice(0,7):since,latest=month?current.slice(0,7):current;
    period=period||latest;if(period<earliest)period=earliest;if(period>latest)period=latest;
    const stats=personalStats(period),fields=['classicBest','wins','dailyWins','classicGames','lines','items','moves'];
    const cards=fields.map(key=>`<article class="stat-card" data-stat="${key}"><b>${fmt(stats[key])}</b><span>${esc(t('stat_'+key))}</span></article>`).join('');
    const m=this.modal(`${this.head(t('personalRecords'))}<div class="mbody"><p class="activity-note">${esc(t('personalOnly'))}</p><div class="activity-tabs">${['day','month'].map(x=>`<button class="midbtn ${mode===x?'honey':''}" data-stats-mode="${x}">${esc(t('period_'+x))}</button>`).join('')}</div><div class="activity-nav"><button class="round small" data-stats-prev ${period<=earliest?'disabled':''} aria-label="${esc(t('previousPeriod'))}">‹</button><b>${esc(this.formatActivityDate(period,month))}</b><button class="round small" data-stats-next ${period>=latest?'disabled':''} aria-label="${esc(t('nextPeriod'))}">›</button></div><div class="stats-grid">${cards}</div><p class="itxt small">${esc(t('allTimeBest',{n:fmt(save.data.best)}))}</p><p class="activity-note">${esc(t('statsRules'))}<br>${esc(t('statsSince',{date:this.formatActivityDate(since)}))}</p></div>`,'activity-modal');
    m.querySelectorAll('[data-stats-mode]').forEach(b=>b.onclick=()=>this.statistics(b.dataset.statsMode));
    const shift=delta=>{const d=new Date(period+(month?'-01':'')+'T12:00:00');month?d.setMonth(d.getMonth()+delta):d.setDate(d.getDate()+delta);this.statistics(mode,dayKey(d).slice(0,month?7:10));};
    m.querySelector('[data-stats-prev]').onclick=()=>shift(-1);m.querySelector('[data-stats-next]').onclick=()=>shift(1);
  }

  // ---------- обучение ----------
  tutorial(step) {
    const el = this.tutEl;
    this.tutStep = step;
    if (!step) {
      el.innerHTML = '';
      el.className = 'tut';
      return;
    }
    el.className = 'tut on';
    el.innerHTML = `<div class="tbox">${esc(t('tut' + step))}</div>${step === 1 ? `<div class="thand">${IC.hand}</div>` : ''}`;
    this.placeTut();
  }
  placeTut() {
    const el = this.tutEl, v = this.app.view, L = v.L;
    const box = el.querySelector('.tbox');
    if (!box || !L) return;
    box.style.left = L.board.x + 'px';
    box.style.width = L.board.s + 'px';
    box.style.top = L.board.y + L.cell * 0.6 + 'px';
    const hand = el.querySelector('.thand');
    if (hand) {
      const from = v.slotCenter(1);
      const to = { x: L.gx + 4.5 * L.cell, y: L.gy + 5.5 * L.cell };
      hand.style.setProperty('--fx', from.x + 'px');
      hand.style.setProperty('--fy', from.y + 'px');
      hand.style.setProperty('--tx', to.x + 'px');
      hand.style.setProperty('--ty', to.y + 'px');
    }
  }
  // вызывается из игры после хода
  tutMove() {
    if (!this.tutStep) return;
    if (this.tutStep === 1) this.tutorial(2);
    else if (this.tutStep === 2) {
      this.tutorial(0);
      save.data.tut.classic = 1;
      save.write();
    }
  }

  tick() {}
}

