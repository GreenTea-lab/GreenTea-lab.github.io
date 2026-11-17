// Интерфейс в DOM: меню, карта городов, панель партии, помощники и окна. Всё крупно и контрастно, одним пальцем.
import { IC } from './icons.js';
import { t, fmt, LANG } from './i18n.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { iap, itemHTML } from './iap.js';
import { audio } from './audio.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import { level, CITIES, PER, COUNT, STAGES, ROUND1, ROUTES, cityOf, routeOf, dailyBoard, starsFor } from './levels.js';
import { faceURL, tileURL, canvas, rrect } from './tiles.js';
import { drawCity } from './cities.js';
import { BOOST_PRICE, CUPS, DAILY_COINS, dayKey, daysIn } from './game.js';
import { ACH, achState, achReady } from './ach.js';
import { expansionUI } from './expansion-ui.js';
import { FRAMES as DECOR_FRAMES } from './cosmetics.js';
import { weekOf } from './collection.js';
import { loadCityArt } from './city-art.js';
import {travelUI} from './travel-ui.js';
import {postcardAsset,drawPostcardArt,loadPostcardArt,WEEKLY_THEMES} from './postcard-art.js';
import {TRIPS} from './travel.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const DAILY = [50, 70, 90, 120, 150, 200, 300];
const today = () => dayKey();
const BOOSTS = ['hint', 'undo', 'shuffle'];
const THEME = { accent: '#62816a', track: '#d9ccb0', thumb: '#fbf7ec', muted: '#7b806d' };
const mmssPlain = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const starsHTML = (n, max = 3) => [0, 1, 2].slice(0, max).map((q) => (q < n ? IC.star : IC.starEmpty)).join('');

// открытка города: пейзаж в белой рамке, марка и подпись
const pcCache = {};
// рамки открыток по маршрутам: 0 — обычная, 1 — золотая, дальше самоцветы
const FRAMES = [null, ['#fff1a8', '#e8b440', '#fff4c0', '#c8901e', '#ffe680', '#d8a020'], ['#d6f5e0', '#2e9e5e', '#c8f0d8', '#1f7a44', '#9ee0b8', '#2e9e5e'], ['#dbe8ff', '#3a6ad8', '#cfe0ff', '#1f3f9a', '#a8c4f4', '#3a6ad8'],
  ['#ffd8d8', '#c8323a', '#ffd0d0', '#8a1820', '#f4a0a4', '#c8323a'], ['#ffffff', '#ddd6e8', '#fdfbff', '#c4bad6', '#f4f0fa', '#a89cc0'], ['#fff0c8', '#e88a1e', '#ffe2a8', '#b8600a', '#f8c070', '#e88a1e'],
  ['#efe0ff', '#8a4ad0', '#e6d4ff', '#5a2a9a', '#c8a4f0', '#8a4ad0'], ['#d4fbf6', '#1fa8a0', '#c4f4ee', '#127a74', '#8ee0d8', '#1fa8a0'], ['#f4fbff', '#9cc8e0', '#ffffff', '#7aa8c8', '#e0f2ff', '#5a8ab0']];
export const routeColor = (r) => (FRAMES[r] ? FRAMES[r][5] : '#e0574c');
export function postcardURL(c, w = 640, route = 0, edition = '') {
  const gold = route > 0 ? route : 0;
  const decor=save.data.decor?.frame||'paper';
  const k = c + ':' + w + ':' + LANG + ':' + gold+':'+decor+':'+edition;
  if (pcCache[k]) return pcCache[k];
  const h = Math.round(w * 0.66);
  const cv = canvas(w, h);
  const g = cv.getContext('2d');
  rrect(g, 0, 0, w, h, w * 0.025);
  if (gold) {
    const gr = g.createLinearGradient(0, 0, w, h);
    FRAMES[gold].slice(0, 5).forEach((c, i) => gr.addColorStop(i / 4, c));
    g.fillStyle = gr;
  } else g.fillStyle = '#fffaf0';
  if(decor!=='paper')g.fillStyle=DECOR_FRAMES[decor]?.c[0]||'#fffaf0';
  g.fill();
  if(decor==='airmail'){
    g.save();g.clip();for(let x=-h;x<w+h;x+=w*.08){g.strokeStyle=Math.round(x/(w*.08))%2?'#a94848':'#466f91';g.lineWidth=w*.025;g.beginPath();g.moveTo(x,0);g.lineTo(x+h,h);g.stroke();}g.restore();
  }
  const m = w * (gold ? 0.045 : 0.035);
  const sc = canvas(w - m * 2, h - m * 2);
  if(!drawPostcardArt(sc.getContext('2d'),c,sc.width,sc.height,route,edition))drawCity(sc.getContext('2d'), CITIES[c].id, sc.width, sc.height, { lmx: sc.width * 0.68,variant:route });
  g.save();
  rrect(g, m, m, w - m * 2, h - m * 2, w * 0.012);
  g.clip();
  g.drawImage(sc, m, m);
  g.restore();
  // марка
  const sw = w * 0.13, sh = sw * 1.2, sx = w - m - sw - w * 0.025, sy = m + w * 0.025;
  g.fillStyle = '#fffaf0';
  g.fillRect(sx - 4, sy - 4, sw + 8, sh + 8);
  g.fillStyle = gold ? FRAMES[gold][5] : ['#e0574c', '#3f80c8', '#4f9a3a', '#e9b25f'][c % 4];
  g.fillRect(sx, sy, sw, sh);
  g.fillStyle = 'rgba(255,255,255,.85)';
  g.font = `400 ${sw * 0.42}px Lobster, Georgia, serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(gold === 1 ? '★' : gold ? String(gold + 1) : String(c + 1), sx + sw / 2, sy + sh * 0.42);
  g.font = `800 ${sw * 0.15}px Nunito, Arial`;
  g.fillText(LANG === 'ru' ? 'ПОЧТА' : 'POST', sx + sw / 2, sy + sh * 0.8);
  // зубчики марки
  g.fillStyle = '#fffaf0';
  for (let k = 0; k <= 8; k++) {
    for (const [x, y] of [[sx + (sw * k) / 8, sy - 4], [sx + (sw * k) / 8, sy + sh + 4], [sx - 4, sy + (sh * k) / 8], [sx + sw + 4, sy + (sh * k) / 8]]) {
      g.beginPath();
      g.arc(x, y, 3.2, 0, Math.PI * 2);
      g.fill();
    }
  }
  // подпись
  const special=edition.startsWith('event:')?TRIPS.find(x=>x.id===edition.slice(6)):null;
  const txt = special?(LANG==='ru'?special.ru:special.en):edition?WEEKLY_THEMES[postcardAsset(c,route,edition).index][LANG==='ru'?0:1]:t('greet_' + CITIES[c].id);
  g.font = `400 ${w * (edition ? .052 : .075)}px Lobster, Georgia, serif`;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.lineWidth = w * 0.014;
  g.strokeStyle = 'rgba(60,30,10,.75)';
  g.lineJoin = 'round';
  g.strokeText(txt, m + w * 0.03, h - m - w * 0.04);
  g.fillStyle = '#fff6dc';
  g.fillText(txt, m + w * 0.03, h - m - w * 0.04);
  if(edition){
    g.fillStyle='rgba(255,247,224,.92)';g.fillRect(m+w*.025,m+w*.025,w*.39,w*.065);
    g.font=`800 ${w*.026}px Nunito,Arial`;g.fillStyle='#65543c';g.textAlign='left';
    g.fillText(special?(LANG==='ru'?'7 ДОСТАВЛЕННЫХ ПИСЕМ':'7 LETTERS DELIVERED'):(LANG==='ru'?'НЕДЕЛЯ · ':'WEEK · ')+edition,m+w*.04,m+w*.069);
  }
  if(Object.keys(pcCache).length>100)for(const key of Object.keys(pcCache))delete pcCache[key];
  pcCache[k] = cv.toDataURL('image/jpeg', 0.86);
  return pcCache[k];
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
    root.innerHTML = `<div class="screen"></div><div class="mlayer"></div><div class="tut"></div>`;
    this.scr = root.querySelector('.screen');
    this.ml = root.querySelector('.mlayer');
    this.tutEl = root.querySelector('.tut');
    this.city = null;
    window.addEventListener('cardartready',({detail})=>{
      for(const k of Object.keys(pcCache))delete pcCache[k];
      root.querySelectorAll('img[data-city]').forEach(img=>{const c=+img.dataset.city,v=+img.dataset.variant||0,e=img.dataset.edition||'';if(postcardAsset(c,v,e).key===detail.key)img.src=postcardURL(c,+img.dataset.width||280,v,e);});
    });
    sdk.onAdsChange?.(() => { this.refreshAds(); this.refresh(); });
    sdk.onSocialChange?.(()=>this.refreshStoryButtons());
    window.addEventListener('cityartready',({detail})=>{
      const c=CITIES.findIndex(C=>C.id===detail.id);
      for(const k of Object.keys(pcCache))if(k.startsWith(c+':'))delete pcCache[k];
      root.querySelectorAll(`img[data-city="${c}"]`).forEach(img=>{img.src=postcardURL(c,+img.dataset.width||280,+img.dataset.variant||0,img.dataset.edition||'');});
    });
  }

  // ---------- общее ----------
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
      case 'play': return A.playContinue();
      case 'store': return this.store();
      case 'journey': this.city = null; return this.journey();
      case 'endless': return A.startEndless(!!save.data.endless);
      case 'newEndless': save.data.endless = null; return A.startEndless(false);
      case 'menu': return A.toMenu();
      case 'gift': return this.daily();
      case 'styles': return this.styles();
      case 'album': return this.album();
      case 'lb': return this.leaderboard();
      case 'settings': return this.settings();
      case 'pause': return this.pause();
      case 'how': return this.howTo();
      case 'journal': return this.journal(b?.hasAttribute('data-board-goal')?'mail':'home');
      case 'boardGoal': return this.campaignBrief();
      case 'cprev': this.city = Math.max(0, this.city - 1); return this.journey();
      case 'cnext': this.city = Math.min(STAGES - 1, this.city + 1); return this.journey();
      case 'daily': return this.dailyCal();
      case 'ach': return this.achievements();
      case 'auto': return A.autoFinish();
      case 'level': return A.startLevel(+b.dataset.i);
      case 'boost': return A.useBoost(b.dataset.id);
      case 'pc': return this.postcard(+b.dataset.c, null, false, +b.dataset.g || 0);
    }
  }

  refresh() {
    this.scr.querySelectorAll('.journal-ready').forEach(e=>{const n=this.journalReady();e.textContent=n||'✦';e.classList.toggle('ready',n>0);});
    this.root.querySelectorAll('.cv').forEach((e) => (e.textContent = fmt(save.data.coins)));
    this.root.querySelectorAll('.boost').forEach((b) => {
      const id = b.dataset.id;
      const n = save.data.boosts[id] || 0;
      b.querySelector('.bdg').innerHTML = n > 0 ? `<b>${n}</b>` : save.data.coins >= BOOST_PRICE[id] || !this.canReward() ? `${IC.coin}<b>${BOOST_PRICE[id]}</b>` : `${IC.ad}`;
    });
    const g = this.scr.querySelector('.giftb');
    if (g) g.classList.toggle('ready', save.data.daily.day !== today());
    const ab = this.scr.querySelector('.achb .badge');
    if (ab) {
      const n = achReady(save.data);
      ab.textContent = n;
      ab.style.display = n ? '' : 'none';
    }
  }

  canReward() { return sdk.canReward ? sdk.canReward() : true; }
  refreshStoryButtons(){
    this.root.querySelectorAll('[data-story]').forEach(b=>{b.hidden=!(sdk.canShareRecord?.()&&Number(b.dataset.score)>0);});
  }
  bindStoryButton(button,record){
    if(!button)return;button.dataset.score=String(record.score||0);this.refreshStoryButtons();
    button.onclick=async()=>{
      if(button.disabled||!sdk.canShareRecord?.())return;
      button.disabled=true;audio.suspend('story');
      // An unanswered web cancellation must not leave music muted forever or restart it under the editor.
      const resume=()=>{audio.resume('story');window.removeEventListener('pointerdown',resume,true);window.removeEventListener('keydown',resume,true);};
      window.addEventListener('pointerdown',resume,true);window.addEventListener('keydown',resume,true);
      let result;
      try{result=await sdk.shareRecord(record);}finally{if(result?.status!=='timeout')resume();if(button.isConnected)button.disabled=false;}
    };
  }
  refreshAds() {
    const available = this.canReward();
    this.root.querySelectorAll('[data-reward]').forEach(e => { e.hidden = !available; });
    this.root.querySelectorAll('[data-no-reward]').forEach(e => { e.hidden = available; });
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
  // крупная надпись над полем в начале партии
  banner(text) {
    const el = document.createElement('div');
    el.className = 'banner';
    el.textContent = text;
    if(this.app.view?.L)el.style.top=(this.app.view.L.board.y+8)+'px';
    this.scr.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  // ---------- меню ----------
  menu() {
    this.closeModal();
    this.tutorial(0);
    const d = save.data;
    const cur = save.current(COUNT);
    const c = Math.floor(cur / PER);
    const resume = !!d.endless;
    const dk = dayKey();
    const dDone = d.dc[dk] !== undefined;
    const achN = achReady(d);
    const continuing=d.sessions[d.lastMode];
    const playSub=continuing&&d.lastMode==='trip'?this.tr('Мини-поездка','Mini journey')+' · '+(continuing.spec.step+1)+'/7':continuing&&d.lastMode==='practice'?this.tr('Свободная игра','Free play')+' · '+this.layoutName(continuing.spec.lay):continuing&&d.lastMode==='daily'?t('daily')+' · '+this.dateName(continuing.id):t('c_'+cityOf(continuing?Math.floor(continuing.id/PER):c).id)+' · '+t('levelN',{n:continuing?continuing.id+1:cur+1});
    this.scr.innerHTML = `<div class="menu travel-menu">
      <div class="menu-layout">
        <div class="topbar"><div class="tb-l"><span class="chip star-chip">${IC.star}<b>${save.stars()}</b></span></div><div class="tb-r">${this.coinsChip()}<button class="round" data-a="settings" aria-label="${esc(t('settings'))}">${IC.gear}</button></div></div>
        <header class="brand"><img class="brand-emblem" src="${window.__UI_ART__?.emblem||''}" alt=""><div class="brand-type"><span class="eyebrow">${esc(t('travelAlbum'))}</span><h1>${esc(t('title'))}</h1><span class="brand-caption">${esc(t('brandCaption'))}</span></div></header>
        <section class="menu-controls" aria-label="${esc(t('playNow'))}">
          <div class="menu-intro"><span class="eyebrow">${esc(t('nextStop'))}</span><b>${esc(t('c_'+cityOf(c).id))}</b><span>${esc(t('cityOf20'))}</span></div>
          <div class="mbtns">
            <button class="bigbtn green hero-play" data-a="play">${IC.play}<span class="bt">${esc(t(continuing?'continueGame':'playNow'))}</span><span class="bs">${esc(playSub)}</span></button>
            <div class="map-diary-row"><button class="smallbtn map-link" data-a="journey">${IC.map}${this.tr('Карта','Map')}<span aria-hidden="true">↗</span></button><button class="smallbtn map-link" data-a="journal">${IC.book}${this.tr('Дневник','Journal')}<span class="journal-ready ${this.journalReady()?'ready':''}" aria-hidden="true">${this.journalReady()||'✦'}</span></button></div>
            <div class="mrow">
              <button class="bigbtn half mode-card ${dDone?'complete':''}" data-a="daily">${IC.calendar}<span class="bt">${esc(t('dailyShort'))}</span><span class="bs">${dDone?esc(t('dailyDone')):esc(this.dateName(dk))}</span></button>
              <button class="bigbtn half mode-card" data-a="endless">${IC.infinity}<span class="bt">${esc(t(resume?'continueEndless':'endless'))}</span><span class="bs">${esc(t('yourBest'))} ${fmt((resume?d.endless.calm:d.settings.pace==='calm')?d.bestCalm:d.best)}</span></button>
            </div>
            ${resume?`<button class="smallbtn new-endless" data-a="newEndless">${IC.restart}<span>${esc(t('newEndless'))}</span></button>`:''}
          </div>
          <nav class="tiles" aria-label="${esc(t('collectionNav'))}">
            <button class="tile giftb ${d.daily.day!==today()?'ready':''}" data-a="gift">${IC.gift}<span>${esc(t('gift'))}</span></button>
            <button class="tile achb" data-a="ach">${IC.medal}<span>${esc(t('achs'))}</span><i class="badge" ${achN?'':'style="display:none"'}>${achN}</i></button>
            <button class="tile" data-a="album">${IC.postcard}<span>${esc(t('album'))}</span></button>
            <button class="tile" data-a="styles">${IC.tile}<span>${esc(t('styles'))}</span></button>
            <button class="tile" data-a="store">${IC.shop}<span>${esc(t('shop'))}</span></button>
            <button class="tile" data-a="lb">${IC.trophy}<span>${esc(t('records'))}</span></button>
          </nav>
        </section>
      </div>
    </div>`;
    this.bind(this.scr);
    audio.setMood('menu');
  }

  // ---------- путешествие: города ----------
  cityOpen(c) {
    return save.open(c * PER);
  }
  // ---------- панель партии ----------
  hud() {
    this.closeModal();
    const A = this.app;
    const lvl = A.mode === 'level' || A.mode === 'daily';
    const extra=A.mode==='trip'||A.mode==='practice';
    const title = A.mode==='trip'?`<b>${this.tr('Поездка','Journey')} · ${A.L.step+1}/7</b>`:A.mode==='practice'?`<b>${esc(this.layoutName(A.L.lay))}</b><span class="hcity"> · ${this.tr('Свободная игра','Free play')}</span>`:!lvl ? '' : A.mode === 'daily' ? `<b>${esc(t('daily'))}</b><span class="hcity"> · ${esc(this.dateName(A.L.key))}</span>` : `<b>${esc(t('levelN', { n: A.levelIdx + 1 }))}</b><span class="hcity"> · ${esc(t('c_' + CITIES[A.L.city].id))}</span>`;
    const center = lvl||extra
      ? `<div class="hc"><div class="hl">${title}</div>
         <div class="hl hrow2"><span class="htime">${IC.timer}<b class="tm">0:00</b></span>${lvl?'<span class="mst"></span>':''}<span class="hp">${IC.pairs}<b class="pv"></b></span></div></div>`
      : `<div class="hc"><div class="score" data-v="0">0</div><div class="hl hrow2"><span class="best">${IC.crown}<b class="bv"></b></span><span class="hboard"></span><span class="hp">${IC.pairs}<b class="pv"></b></span></div></div>`;
    const boosts = BOOSTS.map((id) => `<button class="boost" data-a="boost" data-id="${id}">${IC[id]}<span class="bl">${esc(t('b_' + id))}</span><span class="bdg"></span></button>`).join('');
    this.scr.innerHTML = `<div class="hud">
      <div class="hbar"><button class="round" data-a="pause" aria-label="menu">${IC.menu}</button>${center}${this.coinsChip()}</div>
      <div class="helpers">${boosts}</div>
      <button class="board-goal" data-a="journal" data-board-goal></button>
      <div class="board-toolbar"><div class="board-camera"><button data-zoom="minus" aria-label="${this.tr('Уменьшить','Zoom out')}">−</button><button class="zoom-value" data-zoom="reset" title="${this.tr('Показать поле целиком','Fit the whole board')}">100%</button><button data-zoom="plus" aria-label="${this.tr('Увеличить','Zoom in')}">+</button>${A.L?.lay?`<button data-pin="${A.L.lay}" aria-label="${this.tr('В мои расклады','Save to my boards')}">${IC.star}</button>`:''}</div></div>
      <button class="autob" data-a="auto" style="display:none">${IC.check}<span>${esc(t('autoFinish'))}</span></button>
    </div>`;
    this.scr.querySelector('.hud').classList.toggle('notimer', A.sessionCalm||save.data.settings.showTimer === false);
    this.bind(this.scr);
    this.bindTravelControls(this.scr);
    this.layout(A.view.L);
    this.refresh();
    this.hudUpdate();
    this._sec = -1;
    this.tick();
  }

  layout(L) {
    if (!L) return;
    const toolbar=this.scr.querySelector('.board-toolbar');if(toolbar)Object.assign(toolbar.style,{left:L.board.x+'px',top:(L.board.y-36)+'px',width:L.board.w+'px'});
    const h = this.scr.querySelector('.helpers');
    if (h) {
      const r = L.help;
      Object.assign(h.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', flexDirection: r.vert ? 'column' : 'row' });
      h.classList.toggle('vert', r.vert);
    }
    const hb = this.scr.querySelector('.hbar');
    if (hb) {
      hb.style.height = L.hud.h + 'px';
      hb.classList.toggle('port', L.port);
      const center=hb.querySelector('.hc'),goal=this.scr.querySelector('[data-board-goal]');
      if(center&&goal)Object.assign(goal.style,{left:L.hud.centerX+'px',top:(hb.offsetTop+center.offsetTop+center.offsetHeight+8)+'px'});
    }
    if (this.tutStep) this.placeTut();
  }

  hudUpdate() {
    const A = this.app, g = A.game;
    if (!g) return;
    const pv = this.scr.querySelector('.pv');
    if (pv) {
      const n = g.movesList().length;
      pv.textContent = n;
      pv.parentElement.classList.toggle('zero', n === 0);
    }
    if (A.mode === 'endless') {
      const sc = this.scr.querySelector('.score');
      if (sc) this.animNum(sc, A.E.score);
      const b = this.scr.querySelector('.bv');
      if (b) b.textContent = fmt(Math.max(A.sessionCalm?save.data.bestCalm:save.data.best, A.E.score));
      const hb = this.scr.querySelector('.hboard');
      if (hb) hb.textContent = t('boardN', { n: A.E.n });
    }
    this.updateTravelHUD();
  }

  // таймер и звёзды обновляются раз в секунду
  tick() {
    const A = this.app;
    if (A.mode==='endless'||!A.L) return;
    const s = Math.floor(A.elapsed);
    if (s === this._sec) return;
    this._sec = s;
    const tm = this.scr.querySelector('.tm');
    if (tm) tm.textContent = mmss(s);
    const ms = this.scr.querySelector('.mst');
    if (ms) {
      const st = A.sessionCalm?3:starsFor(A.L, s);
      if (ms.dataset.n !== String(st)) {
        ms.dataset.n = st;
        ms.innerHTML = starsHTML(st);
        if (st < 3 && s > 0) {
          ms.classList.remove('bump');
          void ms.offsetWidth;
          ms.classList.add('bump');
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

  // ---------- окна ----------
  modal(html, cls = '', onClose) {
    this.closeModal(false);
    this.modalOpen = true;
    this.scr.inert = true;
    sdk.gameplay(false);
    const m = document.createElement('div');
    m.className = 'modal ' + cls;
    m.innerHTML = `<div class="mpanel">${html}</div>`;
    m.addEventListener('pointerdown', (e) => e.stopPropagation());
    m.addEventListener('pointerup', (e) => e.stopPropagation());
    m.addEventListener('click', (e) => e.stopPropagation());
    this.ml.appendChild(m);
    this.bind(m);
    sdk.refreshAds?.();
    this.refreshAds();
    m.querySelectorAll('[data-x]').forEach((b) =>
      b.addEventListener('click', () => {
        audio.play('click');
        this.closeModal(!onClose);
        onClose && onClose();
      }),
    );
    return m;
  }
  closeModal(resume = true) {
    const was = this.modalOpen;
    this.ml.innerHTML = '';
    this.modalOpen = false;
    this.scr.inert = false;
    const A = this.app;
    if (was && resume) A.syncGameplay();
  }
  head(title, close = true) {
    return `<div class="mhead"><b>${esc(title)}</b>${close ? `<button class="round small" data-x aria-label="close">${IC.close}</button>` : ''}</div>`;
  }

  // знакомство с особыми плитками
  feature(kind) {
    const A = this.app;
    const g = A.game;
    let pics = '';
    if(kind==='repeat'){
      const f=g.tiles.find(tl=>tl.f!=='key').f;
      pics=`<div class="tpics repeat-pics">${Array.from({length:4},()=>`<img src="${tileURL(save.data.style,f,64)}" alt="">`).join('')}</div>`;
    }
    if (kind === 'first') {
      const f = g.tiles.find((tl) => g.selectable(tl.id)).f;
      pics = `<div class="tpics"><img src="${tileURL(save.data.style, f, 64)}" alt=""><span class="peq">+</span><img src="${tileURL(save.data.style, f, 64)}" alt=""></div>`;
    } else if (kind === 'coin') pics = `<div class="tpics"><span class="tcoin"><img src="${tileURL(save.data.style, 'orange', 64)}" alt="">${IC.coin}</span></div>`;
    else if (kind === 'lock') pics = `<div class="tpics"><img src="${tileURL(save.data.style, 'key', 64)}" alt=""><span class="peq">→</span><span class="tlock"><img src="${tileURL(save.data.style, 'pear', 64)}" alt="">${IC.lock}</span></div>`;
    else if(kind!=='repeat') pics = `<div class="tpics"><span class="tback"></span><span class="peq">→</span><img src="${tileURL(save.data.style, 'tulip', 64)}" alt=""></div>`;
    const m = this.modal(`${this.head(t('f_' + kind), false)}<div class="mbody">${pics}<p class="itxt">${esc(t('f_' + kind + '_txt'))}</p>
      ${kind === 'first' ? `<p class="itxt small">${esc(t('f_first_txt2'))}</p>` : ''}
      <button class="bigbtn green" data-go>${IC.play}<span class="bt">${esc(t('start'))}</span></button></div>`, 'intro');
    m.querySelector('[data-go]').onclick = () => {
      audio.play('click');
      this.closeModal();
      save.data.tut[kind] = 1;
      save.write(false);
      if (kind === 'first') this.tutorial(1);
    };
  }

  pause() {
    const A = this.app;
    const d = save.data;
    const m = this.modal(`${this.head(t('pause'))}<div class="mbody">
      <button class="bigbtn green" data-x>${IC.play}<span class="bt">${esc(t('resume'))}</span></button>
      ${slidersHTML(d.settings, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}
      ${this.toggles()}
      ${this.travelOptionsHTML()}
      <div class="row2"><button class="midbtn" data-r>${IC.restart}<span>${esc(t('restart'))}</span></button><button class="midbtn" data-a="how">${IC.book}<span>${esc(t('howTo'))}</span></button></div>
      <button class="midbtn wide" data-m>${IC.home}<span>${esc(A.mode === 'endless' ? t('toMenuSaved') : t('toMenu'))}</span></button>
    </div>`);
    bindSliders(m, d.settings, () => save.write());
    this.bindToggles(m);
    m.querySelector('[data-r]').onclick = () => {
      audio.play('click');
      this.closeModal();
      A.restart();
    };
    m.querySelector('[data-m]').onclick = () => {
      audio.play('click');
      this.closeModal();
      if (A.mode === 'level') {
        this.city = A.L.stage;
        A.toMenu();
        this.journey();
      } else A.toMenu();
    };
  }
  // переключатели: затемнять зажатые, подсвечивать пары, таймер
  toggles() {
    const S = save.data.settings;
    const row = (k, ic, on) => `<button class="toggle ${on ? 'on' : ''}" data-tg="${k}">${ic}<span>${esc(t('tg_' + k))}</span><i class="sw"><i></i></i></button>`;
    return row('dimBlocked', IC.eye, S.dimBlocked !== false) + row('matchGlow', IC.hint, !!S.matchGlow) + row('showTimer', IC.timer, S.showTimer !== false);
  }
  bindToggles(m) {
    m.querySelectorAll('[data-tg]').forEach((b) => {
      b.onclick = () => {
        const S = save.data.settings, k = b.dataset.tg;
        const on = !b.classList.contains('on');
        S[k] = on;
        const v = this.app.view;
        if (k === 'dimBlocked') v.highlightFree = on;
        if (k === 'matchGlow') v.matchGlow = on;
        const hud = this.scr.querySelector('.hud');
        if (k === 'showTimer' && hud) hud.classList.toggle('notimer', this.app.sessionCalm||!on);
        b.classList.toggle('on', on);
        audio.play('click');
        save.write();
      };
    });
    this.bindTravelControls(m);
  }

  settings() {
    const d = save.data;
    const m = this.modal(`${this.head(t('settings'))}<div class="mbody">
      ${slidersHTML(d.settings, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}
      ${this.toggles()}
      ${this.travelOptionsHTML()}
      <button class="midbtn wide" data-a="how">${IC.book}<span>${esc(t('howTo'))}</span></button>
    </div>`);
    bindSliders(m, d.settings, () => save.write());
    this.bindToggles(m);
  }

  howTo() {
    const back = this.app.state === 'play' ? () => this.pause() : null;
    this.modal(`${this.head(t('howTo'))}<div class="mbody how">
      ${[1, 2, 3, 4, 5, 6].map((k) => `<div class="hrow"><span class="hn">${k}</span><p>${esc(t('how' + k))}</p></div>`).join('')}
      <button class="bigbtn green" data-x><span class="bt">${esc(t('ok'))}</span></button>
    </div>`, 'howm', back);
  }

  // ходов нет
  stuck() {
    const A = this.app, g = A.game, d = save.data;
    const freeE = A.mode === 'endless' && A.E.free > 0;
    const freeStart = A.mode === 'level' && A.levelIdx < 3;
    const freeShuffle = freeE || freeStart || A.mode==='trip' || A.mode==='practice';
    const stock = d.boosts.shuffle;
    const needsAd = !freeShuffle && !stock && d.coins < BOOST_PRICE.shuffle;
    const shufTxt = freeShuffle ? t('shuffleFree') : stock > 0 ? t('shuffleStock', { n: stock }) : d.coins >= BOOST_PRICE.shuffle ? t('shuffleCoins', { n: BOOST_PRICE.shuffle }) : t('shuffleAd');
    const m = this.modal(`${this.head(t('noMoves'), false)}<div class="mbody">
      <div class="bicon">${IC.shuffle}</div>
      <p class="itxt">${esc(t('noMovesTxt'))}</p>
      <button class="bigbtn green" data-sh ${needsAd ? 'data-reward' : ''}>${needsAd ? IC.ad : IC.shuffle.replace(/#3f8f3a/g, '#fff')}<span class="bt">${esc(t('b_shuffle'))}</span><span class="bs">${esc(shufTxt)}</span></button>
      ${g.history.length ? `<button class="midbtn wide" data-u>${IC.undo}<span>${esc(t('undoMove'))}</span></button>` : ''}
      <button class="midbtn wide" data-end>${A.mode === 'endless' ? IC.checkInk : IC.restart}<span>${esc(A.mode === 'endless' ? t('finish') : t('restart'))}</span></button>
    </div>`, 'stuckm');
    m.querySelector('[data-sh]').onclick = () => {
      audio.play('click');
      this.closeModal();
      if (freeShuffle) {
        if (freeE) A.E.free--;
        A.useBoost('shuffle', true);
      } else if (stock > 0 || d.coins >= BOOST_PRICE.shuffle) A.useBoost('shuffle');
      else sdk.showRewarded(() => A.useBoost('shuffle', true), () => !A.game.canMove() && setTimeout(() => A.checkStuck(), 300));
    };
    const u = m.querySelector('[data-u]');
    if (u) u.onclick = () => { audio.play('click'); this.closeModal(); A.useBoost('undo'); };
    m.querySelector('[data-end]').onclick = () => {
      audio.play('click');
      this.closeModal();
      if (A.mode === 'endless') A.endEndless();
      else A.restart();
    };
  }

  levelResult(r) {
    const A = this.app;
    const m = this.modal(`${this.head(t('levelDone'), false)}<div class="mbody">
      <div class="bigstars">${[0, 1, 2].map((q) => `<span class="bst ${q < r.stars ? 'on' : ''}" style="animation-delay:${0.2 + q * 0.25}s">${q < r.stars ? IC.star : IC.starEmpty}</span>`).join('')}</div>
      <div class="bestl">${IC.timer}<b>${mmss(r.sec)}</b>${r.stars < 3 ? ` · ${esc(t('for3', { t: mmss(r.L.par.t3) }))}` : ''}</div>
      <div class="earn">${IC.coin}<b>+${r.coins}</b></div>
      ${this.progressHTML(r.L.city,true)}
      ${r.postcard ? `<button class="bigbtn honey pcbtn" data-pc>${IC.postcard}<span class="bt">${esc(r.L.route ? t('newRoutePc', { route: t('rt_' + ROUTES[r.L.route]) }) : t('newPostcard'))}</span><span class="bs">${esc(t('c_' + CITIES[r.L.city].id))}</span></button>` : ''}
      ${r.last ? `<p class="itxt">${esc(t('allDone'))}</p>` : `<button class="bigbtn green" data-next>${IC.play}<span class="bt">${esc(t('next'))}</span><span class="bs">${esc(t('levelN', { n: r.L.idx + 2 }))}${(r.L.idx + 1) % PER === 0 ? ' · ' + esc(t('c_' + cityOf(r.L.stage + 1).id)) : ''}</span></button>`}
      <div class="row2"><button class="midbtn" data-again>${IC.restart}<span>${esc(t('again'))}</span></button><button class="midbtn" data-lv>${IC.map}<span>${esc(t('toMap'))}</span></button></div>
    </div>`, 'result');
    [0, 1, 2].forEach((q) => q < r.stars && setTimeout(() => audio.play('star', q), 250 + q * 250));
    const pc = m.querySelector('[data-pc]');
    if (pc) pc.onclick = () => { audio.play('click'); this.postcard(r.L.city, () => this.levelResult({ ...r, postcard: false }), false, r.cardVariant); };
    if (r.postcard) setTimeout(() => this.modalOpen && m.isConnected && this.postcard(r.L.city, () => this.levelResult({ ...r, postcard: false }), true, r.cardVariant), 900);
    const nx = m.querySelector('[data-next]');
    if (nx) nx.onclick = () => { audio.play('click'); this.closeModal(); A.adBreak(() => A.startLevel(r.L.idx + 1)); };
    m.querySelector('[data-again]').onclick = () => { audio.play('click'); this.closeModal(); A.adBreak(() => A.startLevel(r.L.idx)); };
    m.querySelector('[data-lv]').onclick = () => {
      audio.play('click');
      this.closeModal();
      this.city = Math.floor(Math.min(COUNT - 1, r.L.idx + 1) / PER);
      A.adBreak(() => { A.toMenu(); this.journey(); });
    };
  }

  // открытка города с фактом
  async postcard(c, onClose, fresh, route = 0) {
    await Promise.all([loadCityArt(CITIES[c].id),loadPostcardArt(CITIES[c].id)]);
    if (fresh) audio.play('postcard');
    const title = fresh ? (route ? t('newRoutePc', { route: t('rt_' + ROUTES[route]) }) : t('newPostcard')) : t('c_' + CITIES[c].id) + (route ? ' · ' + t('rt_' + ROUTES[route]) : '');
    const m = this.modal(`${this.head(title)}<div class="mbody">
      <img class="pcimg ${fresh ? 'fresh' : ''}" src="${postcardURL(c, 720, route)}" data-city="${c}" data-width="720" data-variant="${route}" alt="">
      <div class="fact"><b>${esc(t('didYouKnow'))}</b> ${esc(t((route % 2 ? 'fact2_' : 'fact_') + CITIES[c].id))}</div>
      <button class="bigbtn green" data-x><span class="bt">${esc(t('ok'))}</span></button>
    </div>`, 'pcm', onClose);
    return m;
  }

  endlessResult(r) {
    const A = this.app;
    let claimed = false;
    const m = this.modal(`${this.head(r.record ? t('newRecord') : t('gameOver'), false)}<div class="mbody">
      ${r.record ? `<div class="rec">${IC.crown}</div>` : ''}
      <div class="bigscore">${fmt(r.score)}</div>
      <p class="itxt small">${r.calm?this.tr('Спокойный режим','Relaxed mode'):this.tr('На результат','Challenge mode')}</p>
      <div class="bestl">${esc(t('boardsDone', { n: r.boards }))} · ${IC.crown}<b>${fmt(r.best)}</b></div>
      <div class="earn">${IC.coin}<b>+<span class="en">${r.coins}</span></b></div>
      <button class="midbtn wide story-button" data-story hidden>${IC.postcard}<span>${esc(t('recordStory'))}</span></button>
      <button class="midbtn wide blue" data-x2 data-reward>${IC.ad}<span>${esc(t('coinsX2'))}</span></button>
      <button class="bigbtn green" data-again>${IC.restart.replace(/#3b2412/g, '#fff')}<span class="bt">${esc(t('playAgain'))}</span></button>
      <button class="midbtn wide" data-m>${IC.home}<span>${esc(t('toMenu'))}</span></button>
    </div>`, 'result');
    this.bindStoryButton(m.querySelector('[data-story]'),{score:r.best,calm:!!r.calm,city:A.view.city});
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
    m.querySelector('[data-again]').onclick = () => { audio.play('click'); this.closeModal(); A.adBreak(() => A.startEndless(false)); };
    m.querySelector('[data-m]').onclick = () => { audio.play('click'); this.closeModal(); A.adBreak(() => A.toMenu()); };
  }

  needCoins(id, onAd) {
    const m = this.modal(`${this.head(t('b_' + id))}<div class="mbody">
      <div class="bicon">${IC[id]}</div>
      <p class="itxt">${esc(t('d_b_' + id))}</p>
      <p class="itxt small">${esc(t('needCoins', { n: BOOST_PRICE[id] }))}</p>
      <button class="bigbtn green" data-ad data-reward>${IC.ad}<span class="bt">${esc(t('freeForAd'))}</span></button>
      <button class="midbtn wide" data-a="store">${IC.shop}<span>${esc(t('shop'))}</span></button>
    </div>`);
    m.querySelector('[data-ad]').onclick = () => { audio.play('click'); this.closeModal(); onAd(); };
  }

  daily() {
    const d = save.data;
    const td = today();
    const got = d.daily.day === td;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yest = dayKey(yesterday);
    const streak = got ? d.daily.streak : d.daily.day === yest ? (d.daily.streak % 7) + 1 : 1;
    const amount = DAILY[streak - 1];
    const days = DAILY.map((c, k) => `<div class="dday ${k + 1 < streak || (got && k + 1 === streak) ? 'taken' : ''} ${k + 1 === streak ? 'today' : ''}"><small>${esc(t('day', { n: k + 1 }))}</small>${IC.coin}<b>${c}</b></div>`).join('');
    const m = this.modal(`${this.head(t('gift'))}<div class="mbody">
      <div class="days">${days}</div>
      <p class="itxt">${esc(got ? t('giftTaken') : t('giftTxt'))}</p>
      ${got ? '' : `<button class="bigbtn green" data-take>${IC.coin}<span class="bt">${esc(t('take'))} ${amount}</span></button><button class="midbtn wide blue" data-x2 data-reward>${IC.ad}<span>${esc(t('takeX2', { n: amount * 2 }))}</span></button>`}
    </div>`);
    const take = (k) => {
      d.daily = { day: td, streak };
      d.coins += amount * k;
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

  store() {
    const d = save.data;
    const free = Date.now() - (d.freeAt || 0) > 4 * 60 * 1000;
    const items = iap.items();
    const m = this.modal(`${this.head(t('shop'))}<div class="mbody store">
      <div class="iap-item freec" data-reward><div class="iap-ic">${IC.ad}</div><div class="iap-tx"><b>${esc(t('freeCoins'))}</b><small>${esc(free ? t('freeCoinsTxt') : t('freeLater'))}</small></div><button class="iap-buy" data-free ${free ? '' : 'disabled'}>+60 ${IC.coin}</button></div>
      ${items.length ? items.map((x) => itemHTML(x, { owned: t('owned') })).join('') : `<p class="itxt small" data-reward>${esc(t('storeEmpty'))}</p>`}
      <p class="itxt small" data-no-reward>${esc(t('adsUnavailable'))}</p>
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

  leaderboard() {
    // Personal save data only, on every platform; no leaderboard service or login.
    const m=this.modal(`${this.head(t('records'))}<div class="mbody"><p class="itxt small">${esc(t('lbTxt'))}</p><div class="lb"><p class="itxt">${esc(t('lbLocal',{n:fmt(save.data.best)}))}</p><button class="midbtn wide story-button" data-story data-story-normal hidden>${esc(t('recordStory'))}</button><p class="itxt small">${this.tr('Спокойный режим: ','Relaxed mode: ')}${fmt(save.data.bestCalm)}</p><button class="midbtn wide story-button" data-story data-story-calm hidden>${esc(t('calmRecordStory'))}</button></div></div>`,'personal-records');
    this.bindStoryButton(m.querySelector('[data-story-normal]'),{score:save.data.best,calm:false,city:this.app.view.city});
    this.bindStoryButton(m.querySelector('[data-story-calm]'),{score:save.data.bestCalm,calm:true,city:this.app.view.city});
  }

  // ---------- задача дня ----------
  dateName(key) {
    const [y, mo, da] = key.split('-').map(Number);
    return new Date(y, mo - 1, da).toLocaleDateString(LANG === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long' });
  }
  monthName(ym) {
    const s = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1, 1).toLocaleDateString(LANG === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1).replace(' г.', '');
  }
  // календарь месяца: решённые дни отмечены, прошедшие можно догнать
  calendarHTML(ym, sel) {
    const d = save.data, td = dayKey();
    const first = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1, 1);
    const shift = (first.getDay() + 6) % 7; // понедельник первым
    const n = daysIn(ym);
    const wd = Array.from({ length: 7 }, (_, k) => new Date(2024, 0, 1 + k).toLocaleDateString(LANG === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' }).slice(0, 2));
    let cells = wd.map((w) => `<span class="cwd">${esc(w)}</span>`).join('') + '<span></span>'.repeat(shift);
    for (let k = 1; k <= n; k++) {
      const key = `${ym}-${String(k).padStart(2, '0')}`;
      const done = d.dc[key] !== undefined || d.dailyWins[key], future = key > td;
      cells += `<button class="cday ${done ? 'done' : ''} ${key === td ? 'today' : ''} ${key === sel ? 'sel' : ''}" ${future ? 'disabled' : `data-day="${key}"`}>${done ? IC.checkInk : `<b>${k}</b>`}</button>`;
    }
    return `<div class="cal">${cells}</div>`;
  }
  cupsHTML(ym) {
    const d = save.data;
    const solved = Object.keys(d.dailyWins).filter((k) => k.startsWith(ym)).length;
    const got = d.dcCup[ym] || 0;
    return `<div class="cups">${CUPS.map((c, k) => `<div class="cup c${k + 1} ${got > k ? 'on' : ''}">${IC.trophy}<b>${esc(t('cup' + (k + 1)))}</b><small>${esc(t('cupDays', { n: c.days || daysIn(ym) }))}</small><small>${IC.coin}${c.coins}</small></div>`).join('')}</div>
      <p class="itxt small">${esc(t('cupProgress', { n: solved, m: daysIn(ym) }))}</p>`;
  }
  dailyResult(r) {
    const A = this.app;
    const ym = r.B.key.slice(0, 7);
    const m = this.modal(`${this.head(t('dailySolved'), false)}<div class="mbody dailym">
      <div class="bigstars">${[0, 1, 2].map((q) => `<span class="bst ${q < r.stars ? 'on' : ''}" style="animation-delay:${0.2 + q * 0.25}s">${q < r.stars ? IC.star : IC.starEmpty}</span>`).join('')}</div>
      <div class="bestl">${IC.timer}<b>${mmss(r.sec)}</b> · ${esc(this.dateName(r.B.key))}</div>
      <div class="earn">${IC.coin}<b>+${r.coins}</b></div>
      ${r.weekly?`<button class="midbtn honey wide" data-weekly>${IC.postcard}${esc(t('weeklyWon'))}</button>`:''}
      ${r.cup ? `<div class="cupwin c${r.cup}">${IC.trophy}<b>${esc(t('cupWon', { cup: t('cup' + r.cup) }))}</b></div>` : ''}
      ${dayKey().startsWith(ym) ? this.calendarHTML(ym, r.B.key) : ''}
      <button class="bigbtn green" data-x>${IC.home.replace(/#3b2412/g, '#fff')}<span class="bt">${esc(t('toMenu'))}</span></button>
      <button class="midbtn wide" data-cal>${IC.calendar}<span>${esc(t('otherDays'))}</span></button>
    </div>`, 'result', () => A.adBreak(() => A.toMenu()));
    [0, 1, 2].forEach((q) => q < r.stars && setTimeout(() => audio.play('star', q), 250 + q * 250));
    m.querySelectorAll('[data-day]').forEach((b) => (b.onclick = () => { audio.play('click'); this.closeModal(); A.adBreak(() => { A.toMenu(); this.dailyCal(b.dataset.day); }); }));
    m.querySelector('[data-cal]').onclick = () => { audio.play('click'); this.closeModal(); A.adBreak(() => { A.toMenu(); this.dailyCal(); }); };
    const wb=m.querySelector('[data-weekly]');if(wb)wb.onclick=()=>this.weeklyCard(weekOf(r.B.key));
  }

  // ---------- достижения ----------
  achievements(onClose) {
    const d = save.data;
    const rank = (a) => { const s = achState(d, a); return s.claimed ? 2 : s.done ? 0 : 1; };
    const rows = ACH.slice().sort((a, b) => rank(a) - rank(b)).map((a) => {
      const s = achState(d, a);
      const btn = s.claimed ? `<span class="achok">${IC.checkInk}</span>` : s.done ? `<button class="midbtn green" data-claim="${a.id}">${IC.coin}<span>${a.coins}</span></button>` : `<span class="achc">${IC.coin}${a.coins}</span>`;
      return `<div class="achr ${s.claimed ? 'claimed' : s.done ? 'ready' : ''}"><div class="achic">${IC.medal}</div><div class="acht"><b>${esc(t('a_' + a.id))}</b><div class="achbar"><i style="width:${(s.cur / a.goal) * 100}%"></i></div><small>${fmt(s.cur)} / ${fmt(a.goal)}</small></div>${btn}</div>`;
    }).join('');
    const got = ACH.filter((a) => d.ach[a.id]).length;
    const m = this.modal(`${this.head(t('achs'))}<div class="mbody achm"><p class="itxt small">${esc(t('achTxt', { n: got, m: ACH.length }))}</p>${rows}</div>`, 'achmodal',onClose);
    m.querySelectorAll('[data-claim]').forEach((b) => (b.onclick = () => {
      const a = ACH.find((x) => x.id === b.dataset.claim);
      if (!a || d.ach[a.id] || !achState(d, a).done) return;
      d.ach[a.id] = 1;
      d.coins += a.coins;
      save.write();
      audio.play('coin');
      this.toast(t('gotCoins', { n: a.coins }));
      const sc = m.querySelector('.mbody').scrollTop;
      this.achievements(onClose);
      this.ml.querySelector('.mbody').scrollTop = sc;
      this.refresh();
    }));
  }
  achToast(a) {
    const el = document.createElement('div');
    el.className = 'toast ach';
    el.innerHTML = `${IC.medal}<span><small>${esc(t('achNew'))}</small><b>${esc(t('a_' + a.id))}</b></span>`;
    document.body.appendChild(el);
    audio.play('star', 2);
    setTimeout(() => el.remove(), 3200);
    this.refresh();
  }

  // кнопка «Собрать все»: все оставшиеся плитки свободны
  autoBtn(on) {
    const b = this.scr.querySelector('.autob');
    if (!b) return;
    b.style.display = on ? '' : 'none';
    const v = this.app.view, g = this.app.game;
    if (on && v.D && g) {
      // ставим в свободное место под оставшимися плитками или над ними
      let y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9;
      for (const tl of g.tiles) {
        if (!g.alive[tl.id]) continue;
        const p = v.tilePos(tl);
        y0 = Math.min(y0, p.y);
        y1 = Math.max(y1, p.y + v.D.h + v.D.d);
        x0 = Math.min(x0, p.x);
        x1 = Math.max(x1, p.x + v.D.w);
      }
      const L = v.L, bh = 66;
      const bottom = L.help.y - 8;
      const top = L.hud.h + 6;
      const y = bottom - y1 >= bh + 8 ? y1 + 8 : y0 - top >= bh + 8 ? y0 - bh - 8 : bottom - bh;
      b.style.left = (L.port ? v.W / 2 : (x0 + x1) / 2) + 'px';
      b.style.top = y + 'px';
      if(v.zoom>1){b.style.left=(L.board.x+L.board.w/2)+'px';b.style.top=(L.board.y+L.board.h-62)+'px';}
    }
  }

  routeIntro(r) {
    const m = this.modal(`${this.head(t('rt_' + ROUTES[r]), false)}<div class="mbody"><img class="pcimg" src="${postcardURL(0, 560, r)}" alt=""><p class="itxt">${esc(r === 1 ? t('goldIntro') : t('routeIntro', { n: r + 1, route: t('rt_' + ROUTES[r]) }))}</p>
      <button class="bigbtn green" data-x>${IC.play}<span class="bt">${esc(t('start'))}</span></button></div>`, 'intro pcm');
    return m;
  }

  // ---------- обучение на первом уровне: рука показывает пару ----------
  tutorial(step) {
    const el = this.tutEl;
    this.tutStep = step;
    if (!step) {
      el.innerHTML = '';
      el.className = 'tut';
      return;
    }
    const g = this.app.game;
    if (step === 1) {
      const m = g.movesList()[0];
      if (!m) return this.tutorial(0);
      this.tutPair = m;
    }
    el.className = 'tut on';
    el.innerHTML = `<div class="tbox">${esc(t('tut' + step))}</div>${step <= 2 ? `<div class="thand">${IC.hand}</div>` : ''}`;
    this.placeTut();
    if (step === 3) setTimeout(() => this.tutStep === 3 && this.tutorial(0), 4500);
  }
  placeTut() {
    const el = this.tutEl, v = this.app.view, L = v.L;
    const box = el.querySelector('.tbox');
    if (!box || !L || !v.bounds) return;
    const b = v.bounds;
    box.style.left = Math.max(8, b.x) + 'px';
    box.style.width = Math.min(v.W - 16, b.w) + 'px';
    box.style.top = Math.min(v.H - 140, b.y + b.h + 10) + 'px';
    const hand = el.querySelector('.thand');
    if (hand && this.tutPair) {
      const id = this.tutPair[this.tutStep === 1 ? 0 : 1];
      const c = v.tileCenter(id);
      hand.style.left = c.x - 18 + 'px';
      hand.style.top = c.y + 4 + 'px';
    }
  }
  tutTap(id) {
    if (this.tutStep === 1 && this.tutPair && id === this.tutPair[0]) this.tutorial(2);
  }
  tutMatched() {
    if (this.tutStep === 1 || this.tutStep === 2) {
      this.tutorial(3);
      save.data.tut.first = 1;
      save.write(false);
    }
  }
}
Object.assign(UI.prototype,expansionUI,travelUI);
