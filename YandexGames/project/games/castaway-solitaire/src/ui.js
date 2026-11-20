import {WILDLIFE,wildlifeUnlocked} from './wildlife.js';
import {enter,leave,motionEnabled} from './transitions.js';
import {CHAPTERS,chapterOf} from './campaign.js';
import {EXPANSIONS} from './world-data.js';
import {worldState,nextExpansion,canExpand,chapterProgress,TASKS,claimTask,claimChapter,harvestReady,harvest} from './progression.js';
// DOM-интерфейс: остров (главный экран), стройка, уровни, HUD партии, окна итогов, магазин, настройки
import { CardArt } from './cards.js';
import { IC } from './icons.js';
import { t, fmt, LANG } from './i18n.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { iap, itemHTML } from './iap.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import { PROJECTS, TOTAL_STEPS, COST, AD_COINS, AD_COOLDOWN, DAILY } from './data.js';
import { MAIN_LEVELS } from './logic.js';
import { THEMES, BACKS, cosmeticState, selectCosmetic, applyCosmetics } from './cosmetics.js';
import { projThumb } from './thumbs.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const starsHTML = (n) => [0, 1, 2].map((i) => (i < n ? IC.star : IC.starE)).join('');
const today = () => new Date().toISOString().slice(0, 10);

export class UI {
  constructor(game, root) {
    this.g = game;
    this.root = root;
    this.screen = '';
    this.modalOpen = false;
    const st = document.createElement('style');
    st.textContent = volumeCss({ accent: '#22a7c9', track: '#ead8b6', thumb: '#fff9ec', muted: '#9b8166' });
    document.head.appendChild(st);
    root.innerHTML = '<div class="safe" id="scr"></div><div id="bub"></div><div id="ui-fx"></div><div id="mod"></div><div id="tst"></div>';
    this.scr = root.querySelector('#scr');
    this.bub = root.querySelector('#bub');
    this.mod = root.querySelector('#mod');
    this.fx = root.querySelector('#ui-fx');
    this.tst = root.querySelector('#tst');
    sdk.onAdsChange(()=>{ if(this.modalOpen) this.mod.querySelectorAll('[data-a=adcoins],[data-a=ad],[data-a=x2]').forEach(b=>b.hidden=!sdk.canReward()); });
    root.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) {
        audio.unlock();
        audio.play('click');
      }
    });
  }

  // ---------- общие ----------
  changeScreen(html){
    leave(this.scr,this.fx);
    this.scr.innerHTML=html;
    enter(this.scr);
  }
  guardTransition(){
    if(!motionEnabled())return;
    this.transitioning=true;
    if(!this.guard){this.guard=document.createElement('div');this.guard.className='ui-transition-guard';this.fx.appendChild(this.guard);}
    clearTimeout(this._guardTimer);
    this._guardTimer=setTimeout(()=>{this.guard?.remove();this.guard=null;this.transitioning=false;},160);
  }
  coinsChip() {
    return `<button class="chip hit" data-a="shop">${IC.coin}<b id="coinsN">${fmt(save.data.coins)}</b><i class="plus">+</i></button>`;
  }
  starsChip() {
    return `<button class="chip hit" data-a="build">${IC.star}<b id="starsN">${fmt(save.stars())}</b></button>`;
  }
  refreshTop() {
    const c = this.root.querySelector('#coinsN');
    if (c) c.textContent = fmt(save.data.coins);
    const s = this.root.querySelector('#starsN');
    if (s) s.textContent = fmt(save.stars());
    const b = this.root.querySelector('#buildBadge');
    if (b) {
      const n = this.affordable();
      b.style.display = n ? '' : 'none';
      b.textContent = n;
    }
    const jb=this.root.querySelector('#journalBadge');
    if(jb){const j=worldState(),q=j.daily;const ready=TASKS.some(x=>q[x.id]>=x.goal&&!q.claimed.includes(x.id))||CHAPTERS.some((_,ch)=>!j.chapters.includes(ch)&&chapterProgress(ch).count===50)||harvestReady();jb.style.display=ready?'':'none';}
    this.refreshBoost && this.refreshBoost();
  }
  bind(el, handlers) {
    el.querySelectorAll('[data-a]').forEach((b) => {
      const a = b.dataset.a;
      if (handlers[a]) b.onclick = (e) => handlers[a](b, e);
    });
  }
  common() {
    return {
      shop: () => this.shop(),
      build: () => this.buildPanel(),
    };
  }
  toast(text, ms = 2600) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = text;
    // на главном экране — под названием игры, чтобы не закрывать его
    const logo = this.root.querySelector('.logo');
    if (logo && logo.offsetHeight) d.style.top = Math.round(logo.getBoundingClientRect().bottom + 10) + 'px';
    this.tst.innerHTML = '';
    this.tst.appendChild(d);
    clearTimeout(this._tt);
    this._tt = setTimeout(() => d.remove(), ms);
  }
  modal({ title, body, ribbon, ribbonCls = '', wide = false, close = true, onClose, cls = '' }) {
    this.modalOpen = true;
    this.g.table.queued=null;
    sdk.gameplay(false);
    const wrap = document.createElement('div');
    wrap.className = 'modal ' + cls;
    wrap.innerHTML = `<div class="panel ${wide ? 'wide' : ''}">${ribbon ? `<div class="ribbon ${ribbonCls}">${esc(ribbon)}</div>` : ''}${
      title || close ? `<div class="ph"><h2>${esc(title || '')}</h2>${close ? `<button class="btn round" data-x="1" aria-label="close">${IC.close}</button>` : ''}</div>` : ''
    }<div class="pb">${body}</div></div>`;
    this.mod.appendChild(wrap);
    enter(wrap,true);
    let closed=false;
    const done = () => {
      if(closed||!wrap.isConnected)return;
      closed=true;
      leave(wrap,this.fx,true);
      wrap.remove();
      this.guardTransition();
      this.modalOpen = this.mod.children.length > 0;
      onClose && onClose();
      sdk.gameplay(this.g.state==='level' && !this.g.paused && !this.modalOpen);
    };
    wrap.close = done;
    const x = wrap.querySelector('[data-x]');
    if (x) x.onclick = done;
    if (close) wrap.addEventListener('pointerdown', (e) => e.target === wrap && done());
    return wrap;
  }
  closeModals() {
    if(this.mod.children.length){for(const wrap of this.mod.children)leave(wrap,this.fx,true);this.guardTransition();}
    this.mod.innerHTML = '';
    this.modalOpen = false;
  }

  // ---------- остров ----------
  projects(){return PROJECTS.filter(p=>(p.tier||0)<=(save.data.expansion||0));}
  affordable() {
    const s = save.stars();
    return this.projects().filter((p) => {
      const st = save.data.stages[p.id];
      return st < 3 && p.cost[st] <= s;
    }).length;
  }
  // что строить дальше: первая доступная по цене, иначе самая дешёвая недостроенная
  nextProject() {
    const s = save.stars();
    let best = null;
    for (const p of this.projects()) {
      const st = save.data.stages[p.id];
      if (st >= 3) continue;
      const c = p.cost[st];
      if (c <= s) return { p, cost: c, ok: true };
      if (!best || c < best.cost) best = { p, cost: c, ok: false };
    }
    return best;
  }
  home() {
    this.screen = 'home';
    const d = save.data;
    const daily = d.daily.day !== today();
    const lvl = d.level;
    this.changeScreen(`
      <div class="top">
        <div class="tl">${this.coinsChip()}${this.starsChip()}</div>
      </div>
      <div class="rcol"><button class="btn round hit" data-a="journal" aria-label="${LANG==='ru'?'Журнал острова':'Island journal'}">${IC.journal}<span class="badge" id="journalBadge" style="display:none">!</span></button><button class="btn round hit" data-a="cosmetics" aria-label="${LANG==='ru'?'Оформление':'Appearance'}">${IC.appearance}</button><button class="btn round hit" data-a="settings" aria-label="settings">${IC.gear}</button><button class="btn round hit" data-a="lb" aria-label="records">${IC.trophy}</button>${daily ? `<button class="btn round hit pulse" data-a="daily" aria-label="gift">${IC.gift}</button>` : ''}</div>
      <div class="logo"><b>${esc(t('title'))}</b><i>${esc(t('subtitle'))}</i></div>
      <div class="voyage-strip"><div><small>${LANG==='ru'?'Глава':'Chapter'} ${chapterOf(lvl)+1} / 20</small><b>${esc(CHAPTERS[chapterOf(lvl)][LANG==='ru'?0:1])}</b><span>${chapterProgress(chapterOf(lvl)).count} / 50 · ${LANG==='ru'?'Берег':'Coast'} ${save.data.expansion||0}/5</span></div><button class="btn mid sea" data-a="world">${IC.palm}${LANG==='ru'?'Расширить':'Expand'}</button></div>
      <div class="bottom">
        <div class="side"><button class="btn round hit" data-a="build" style="position:relative">${IC.hammer}<span class="badge" id="buildBadge" style="display:none"></span></button><span>${esc(t('build'))}</span></div>
        <button class="btn big hit pulse" data-a="play" style="flex-direction:column;gap:0;height:76px;line-height:1.05">${esc(t('play'))}<small>${esc(t('levelN', { n: lvl }))}</small></button>
        <div class="side"><button class="btn round hit" data-a="levels">${IC.cards}</button><span>${esc(t('levels'))}</span></div>
      </div>`);
    this.bind(this.scr, {
      ...this.common(),
      play: () => this.g.playLevel(save.data.level),
      levels: () => this.levels(),
      world: () => this.world(),
      journal: () => this.journal(),
      cosmetics: () => this.cosmetics(),
      settings: () => this.settings(),
      lb: () => this.leaderboard(),
      daily: () => this.daily(),
    });
    this.refreshTop();
    this.bub.innerHTML = '';
    this._bubKey = '';
    if(!save.data.seen.tableTools){save.data.seen.tableTools=1;save.write(false);this.toast(LANG==='ru'?'Фон партии — ваш остров. Масштаб и кнопка «Фон» находятся над картами.':'Your island is the game scene. Card size and Scene are above the cards.',5000);}
  }
  // постройки для меток над островом: все, на которые хватает звёзд (до 4), иначе самая дешёвая
  bubbleList() {
    const st = save.stars();
    const open = this.projects().filter((p) => save.data.stages[p.id] < 3).map((p) => ({ p, cost: p.cost[save.data.stages[p.id]] }));
    const ok = open.filter((o) => o.cost <= st).sort((x, y) => x.cost - y.cost).slice(0, 4).map((o) => ({ ...o, ok: true }));
    if (ok.length) return ok;
    const n = this.nextProject();
    return n ? [n] : [];
  }
  // метки над постройками (вызывается каждый кадр на острове)
  updateBubble() {
    if (this.screen !== 'home' || this.modalOpen) {
      if (this.bub.innerHTML) this.bub.innerHTML = '';
      this._bubKey = '';
      return;
    }
    const list = this.bubbleList();
    const key = list.map((n) => n.p.id + n.cost + n.ok).join();
    if (key !== this._bubKey) {
      this._bubKey = key;
      this.bub.innerHTML = list
        .map((n) => `<button class="bubble hit ${n.ok ? 'ok' : ''}" data-id="${n.p.id}">${n.ok ? IC.hammer : ''}<span>${esc(t('p_' + n.p.id))}</span><span class="cost">${IC.star}${n.cost}</span></button>`)
        .join('');
      this.bub.querySelectorAll('.bubble').forEach((b) => (b.onclick = () => this.project(b.dataset.id)));
    }
    const bs = this.bub.children;
    list.forEach((n, i) => {
      const b = bs[i];
      if (!b) return;
      const sp = this.g.island.spots[n.p.id];
      const stg = save.data.stages[n.p.id];
      const h = n.p.id === 'lookout' || n.p.id === 'beacon' ? (stg ? 4.6 : 1.4) : stg ? 1.8 : 1.3;
      const pt = this.g.island.project(sp.x, sp.y + h, sp.z);
      // не даём метке уйти за край экрана, а стрелка всё равно смотрит на площадку
      const hw = b.offsetWidth / 2 + 8;
      const x = Math.max(hw, Math.min(window.innerWidth - hw, pt.x));
      b.style.left = x + 'px';
      b.style.top = pt.y + 'px';
      b.style.setProperty('--ax', Math.max(-hw + 22, Math.min(hw - 22, pt.x - x)) + 'px');
      b.style.display = pt.vis ? '' : 'none';
    });
  }

  // ---------- стройка ----------
  buildPanel() {
    const body = () => {
      const s = save.stars();
      return `<div class="row"><button class="btn mid sea" data-a="world">${IC.palm}${LANG==='ru'?'Новые берега':'New shores'}</button></div><p class="center" style="margin-top:12px">${esc(t('starsHint'))}</p><div class="plist">${this.projects().map((p) => {
        const st = save.data.stages[p.id];
        const done = st >= 3;
        const cost = done ? 0 : p.cost[st];
        const can = !done && cost <= s;
        return `<div class="pitem ${can ? 'can' : ''}"><div class="pic"><img src="${projThumb(p.id, Math.max(1, Math.min(3, st + (done ? 0 : 1))))}" alt=""></div>
          <div class="tx"><b>${esc(t('p_' + p.id))}</b><small>${esc(done ? t('done') : t('p_' + p.id + '_' + (st + 1)))}</small><div class="dots">${[0, 1, 2].map((i) => `<i class="${i < st ? 'on' : ''}"></i>`).join('')}</div></div>
          ${done ? `<span class="donetag">${IC.check.replace('#fff', '#3f9a36')}</span>` : `<button class="btn mid ${can ? 'green' : 'sand'}" data-b="${p.id}" ${can ? '' : 'disabled'}><span class="cost">${IC.star}${cost}</span></button>`}</div>`;
      }).join('')}</div>`;
    };
    const m = this.modal({ title: t('buildT'), body: body(), wide: true });
    this.bind(m,{world:()=>{m.close();this.world();}});
    m.querySelectorAll('[data-b]').forEach((b) => {
      b.onclick = () => {
        m.close();
        this.g.build(b.dataset.b);
      };
    });
  }
  project(id) {
    const p = PROJECTS.find((q) => q.id === id);
    const st = save.data.stages[id];
    const s = save.stars();
    if (st >= 3) {
      this.toast(t('p_' + id + '_3'));
      return;
    }
    const cost = p.cost[st];
    const can = cost <= s;
    audio.play('open');
    const m = this.modal({
      title: t('p_' + id),
      body: `<div class="col" style="align-items:center"><img src="${projThumb(id, st + 1)}" style="width:150px;height:150px" alt="">
        <p class="center" style="margin:0">${esc(t('stage', { a: st + 1, b: 3 }))}: <b>${esc(t('p_' + id + '_' + (st + 1)))}</b></p>
        ${can ? '' : `<p class="center" style="margin:0">${esc(t('needStars', { n: cost }))} · ${IC.star.replace('<svg', '<svg style="display:inline-block;width:22px;height:22px;vertical-align:-4px"')} ${s}</p>`}
        <div class="row">${can ? `<button class="btn big green" data-a="go">${IC.hammer}${esc(t('buildBtn'))} <span class="cost">${IC.star}${cost}</span></button>` : `<button class="btn big" data-a="play">${esc(t('play'))}</button>`}</div></div>`,
    });
    this.bind(m, {
      go: () => {
        m.close();
        this.g.build(id);
      },
      play: () => {
        m.close();
        this.g.playLevel(save.data.level);
      },
    });
  }

  // ---------- уровни ----------
  levels(chapter=null) {
    const d=save.data,ru=LANG==='ru';
    if(chapter===null){
      const m=this.modal({title:ru?'Карта путешествия · 1000 уровней':'Voyage map · 1000 levels',wide:true,body:'<div class="chapter-grid">'+CHAPTERS.map((names,i)=>{const p=chapterProgress(i),open=i*50<d.level;return '<button class="chapter-card '+(open?'':'locked')+'" data-ch="'+i+'"><small>'+(i*50+1)+'–'+(i*50+50)+'</small><b>'+esc(names[ru?0:1])+'</b><span>'+p.count+'/50 · ★ '+p.stars+'/150</span><i style="--progress:'+p.count*2+'%"></i></button>';}).join('')+'</div>'});
      m.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{m.close();this.levels(+b.dataset.ch);});return;
    }
    chapter=Math.max(0,Math.min(19,chapter));let h='';
    for(let n=chapter*50+1;n<=chapter*50+50;n++){
      const L=d.levels[n],open=n<=d.level;
      h+=open?'<button class="lv '+(n===d.level?'cur':'')+'" data-n="'+n+'">'+n+'<span class="s">'+starsHTML(L?L.stars:0)+'</span></button>':'<div class="lv lock"><small>'+n+'</small>'+IC.lock+'</div>';
    }
    const m=this.modal({title:CHAPTERS[chapter][ru?0:1],wide:true,body:'<div class="chapter-nav"><button class="btn mid sand" data-chprev '+(chapter?'':'disabled')+'>‹</button><button class="btn mid sea" data-map>'+(ru?'Карта глав':'Chapter map')+'</button><button class="btn mid sand" data-chnext '+(chapter<19?'':'disabled')+'>›</button></div><div class="lgrid voyage-levels">'+h+'</div>'});
    m.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{m.close();this.g.playLevel(+b.dataset.n);});
    m.querySelector('[data-map]').onclick=()=>{m.close();this.levels();};
    for(const [sel,delta] of [['[data-chprev]',-1],['[data-chnext]',1]])m.querySelector(sel).onclick=()=>{m.close();this.levels(chapter+delta);};
  }

  // ---------- партия ----------
  hud(n) {
    this.screen = 'hud';
    this.bub.innerHTML = '';
    this.changeScreen(`
      <div class="top hud-top">
        <div class="tl"><button class="btn round hit" data-a="pause" aria-label="pause">${IC.pause}</button></div>
        <div class="hud-c"><b>${esc(t('levelN', { n }))}</b><span class="hs" id="hs">${starsHTML(3)}</span><small id="sc">0</small></div>
        <div class="tr">${this.coinsChip()}</div>
      </div>
      <div class="play-toolbar"><div class="card-zoom"><span>${LANG==='ru'?'Карты':'Cards'}</span><button class="zoom-button" data-scale-step="-5" aria-label="${LANG==='ru'?'Уменьшить карты':'Smaller cards'}">−</button><input type="range" min="70" max="140" value="100" id="cardScale" aria-label="${LANG==='ru'?'Размер карт':'Card size'}"><output id="cardScaleValue">100%</output><button class="zoom-button" data-scale-step="5" aria-label="${LANG==='ru'?'Увеличить карты':'Larger cards'}">+</button></div><button class="scene-button" data-a="scene">${IC.scene}<span>${LANG==='ru'?'Фон':'Scene'}</span></button></div>
      <div class="boost l"><button class="btn round hit" data-a="undo" id="bUndo" aria-label="undo">${IC.undo}</button><span class="lab" id="lUndo"></span></div>
      <div class="boost r"><button class="btn round hit" data-a="joker" id="bJoker" aria-label="wild">${IC.wild}</button><span class="lab">${IC.coin}${COST.joker}</span></div>
      <div id="tip"></div>`);
    this.bind(this.scr, {
      shop: () => this.shop(),
      scene: () => this.cosmetics(),
      pause: () => this.pause(),
      undo: () => this.g.undo(),
      joker: () => this.g.joker(),
    });
    this.scr.querySelector('#cardScale').oninput=e=>this.g.setCardScale(e.target.value);
    this.scr.querySelectorAll('[data-scale-step]').forEach(b=>b.onclick=()=>this.g.setCardScale((this.g.table.cardScale||100)+Number(b.dataset.scaleStep)));
    this.refreshBoost = () => {
      const l = this.root.querySelector('#lUndo');
      if (l) l.innerHTML = this.g.freeUndo > 0 ? esc(t('free')) : `${IC.coin}${COST.undo}`;
    };
    this.refreshBoost();

  }
  fieldTop(){const bar=this.scr.querySelector('.play-toolbar');return bar?bar.getBoundingClientRect().bottom+10:0;}
  scaleState({value,max}){
    const input=this.scr.querySelector('#cardScale');if(!input)return;
    input.max=max;input.value=value;this.scr.querySelector('#cardScaleValue').textContent=Math.round(value)+'%';
    this.scr.querySelector('[data-scale-step="-5"]').disabled=value<=70;this.scr.querySelector('[data-scale-step="5"]').disabled=value>=max;
    input.title=LANG==='ru'?'Размер ограничен экраном, чтобы все карты оставались видны.':'Maximum size fits every card on your screen.';
  }
  hudState(s) {
    const hs = this.root.querySelector('#hs');
    if (!hs) return;
    if (hs.dataset.n !== String(s.stars)) {
      hs.dataset.n = s.stars;
      hs.innerHTML = starsHTML(s.stars);
    }
    this.root.querySelector('#sc').textContent = fmt(s.score);
    const u = this.root.querySelector('#bUndo');
    if (u) u.disabled = !s.canUndo;
  }
  tip(text) {
    const el = this.root.querySelector('#tip');
    if (!el) return;
    if (el.dataset.t === (text || '')) return;
    el.dataset.t = text || '';
    el.innerHTML = text ? `<div class="tip">${esc(text)}${text === t('tut1') ? `<strong>${esc(t('tutExample'))}</strong>` : ''}</div>` : '';
  }
  tipBottom(texts) {
    let b = 0;
    for (const x of texts) {
      this.tip(x);
      const el = this.root.querySelector('#tip .tip');
      // offset*, а не getBoundingClientRect: у подсказки идёт анимация масштаба
      if (el) b = Math.max(b, (el.offsetParent ? el.offsetParent.getBoundingClientRect().top : 0) + el.offsetTop + el.offsetHeight);
    }
    this.tip('');
    return b;
  }
  mechanic(key, onClose) {
    const m = this.modal({
      title: t('m_' + key + 'T'),
      body: `<div class="col" style="align-items:center">${this.mechPic(key)}<p class="center">${esc(t('m_' + key))}</p><button class="btn big sea" data-a="ok">${esc(t('ok'))}</button></div>`,
      close: false,
      onClose,
    });
    this.bind(m, { ok: () => m.close() });
  }
  mechPic(key) {
    const card = (inner, extra = '') => `<svg viewBox="0 0 80 112" style="width:96px;height:134px"><rect x="3" y="3" width="74" height="106" rx="9" fill="#fffdf6" stroke="#3a2a1e" stroke-width="3"/><text x="20" y="38" font-family="Nunito,Arial" font-weight="900" font-size="30" fill="#d8343f" text-anchor="middle">7</text>${inner}</svg>${extra}`;
    if (key === 'lock') return `<div class="row">${card(`<g transform="translate(18 50)">${IC.lock.replace('<svg', '<svg width="44" height="44"')}</g>`)}${card(`<g transform="translate(18 50)">${IC.key.replace('<svg', '<svg width="44" height="44"')}</g>`)}</div>`;
    if (key === 'keys2') return `<div class="row">${card(`<g transform="translate(18 50)">${IC.key.replace('<svg', '<svg width="44" height="44"').replace('#ffd34a', '#7ec8ff')}</g>`)}${card(`<g transform="translate(18 50)">${IC.lock.replace('<svg', '<svg width="44" height="44"').replace('#ffd34a', '#7ec8ff')}</g>`)}</div>`;
    if (key === 'sand') return card(`<path d="M5 109V72q15-14 35-10t35 8v39z" fill="#f2d892" stroke="#c99a48" stroke-width="2"/><circle cx="40" cy="90" r="12" fill="#fff" stroke="#c99a48" stroke-width="3"/><text x="40" y="96" text-anchor="middle" font-family="Nunito,Arial" font-weight="900" font-size="17" fill="#7a5520">2</text>`);
    if (key === 'coin') return card(`<g transform="translate(40 82)"><circle r="14" fill="#ffc93a" stroke="#c98a10" stroke-width="3"/></g>`);
    if (key === 'wild') return `<div style="width:96px;height:96px">${IC.wild}</div>`;
    return '';
  }
  pause() {
    if (this.modalOpen) return;
    this.g.setPaused(true);
    const st = save.data.settings;
    const m = this.modal({
      title: t('pause'),
      body: `<div class="col">${slidersHTML(st, { music: t('music'), sound: t('sound') }, { music: IC.music, sound: IC.sound })}
        <button class="btn big green" data-a="resume">${IC.play}${esc(t('resume'))}</button>
        <div class="row"><button class="btn mid sea" data-a="retry">${esc(t('retry'))}</button><button class="btn mid sand" data-a="island">${esc(t('toIsland'))}</button></div></div>`,
      onClose: () => this.g.setPaused(false),
    });
    bindSliders(m, st, () => save.write(false));
    this.bind(m, {
      resume: () => m.close(),
      retry: () => {
        m.close();
        this.g.retry(false);
      },
      island: () => {
        m.close();
        this.g.toIsland(false);
      },
    });
  }
  stuck(left, adOk) {
    const m = this.modal({
      title: t('stuckT'),
      body: `<div class="col"><p class="center" style="margin-top:0">${esc(t('stuckS', { n: left }))}</p>
        <button class="btn big green" data-a="buy">${esc(t('more5'))} · <span class="cost">${IC.coin}${COST.more5}</span></button>
        ${adOk && sdk.canReward() ? `<button class="btn big sea" data-a="ad">${IC.film}${esc(t('more5Ad'))}</button>` : ''}
        <button class="btn mid sand" data-a="give">${esc(t('giveUp'))}</button></div>`,
      close: false,
    });
    this.bind(m, {
      buy: () => {
        if (save.data.coins < COST.more5) {
          this.noCoins();
          return;
        }
        m.close();
        this.g.more5(false);
      },
      ad: () => {
        m.close();
        this.g.more5(true);
      },
      give: () => {
        m.close();
        this.g.lose();
      },
    });
  }
  win(r) {
    const { n, stars, score, best, coins, canBuild, firstProject } = r;
    const projectName = firstProject && t('p_' + firstProject);
    const m = this.modal({
      ribbon: t('win'),
      ribbonCls: 'green',
      body: `<div class="stars3">${[0, 1, 2].map((i) => `<i style="animation-delay:${0.25 + i * 0.3}s">${i < stars ? IC.star : IC.starE}</i>`).join('')}</div>
        <p class="center" style="margin:0 0 6px">${esc(t('winSub', { n: r.left }))}</p>
        <div class="res"><div>${esc(t('score'))}: <b>${fmt(score)}</b>${best ? `<small>${esc(t('best'))} ${fmt(best)}</small>` : ''}</div><div>${IC.coin}<b id="wc">+${fmt(coins)}</b></div></div>
        <div class="col">${sdk.canReward()?`<button class="btn mid sea" data-a="x2">${IC.film}${esc(t('x2'))}</button>`:''}
        ${firstProject ? `<p class="center first-build-note">${esc(t('firstBuildHint', {name: projectName}))}</p>
          <button class="btn big green first-build-button" data-a="first-build">${IC.hammer}${esc(t('firstBuild', {name: projectName}))}</button>
          <button class="btn mid sand" data-a="next">${esc(t('next'))}</button>`
          : `<div class="row"><button class="btn big sand ${canBuild ? 'pulse' : ''}" data-a="island" style="position:relative">${IC.palm}${esc(t('toIsland'))}${canBuild ? '<span class="badge">!</span>' : ''}</button><button class="btn big green" data-a="next">${esc(t('next'))}</button></div>`}</div>`,
      close: false,
    });
    [0, 1, 2].forEach((i) => i < stars && setTimeout(() => audio.play('star', i), 250 + i * 300));
    this.bind(m, {
      'first-build': () => {
        m.close();
        this.g.toIsland(false, firstProject);
      },
      x2: (b) => {
        b.disabled = true;
        this.g.doubleReward(coins, () => {
          const w = m.querySelector('#wc');
          if (w) w.textContent = '+' + fmt(coins * 2);
          b.remove();
        }, (ok)=>{if(!ok)b.disabled=false;});
      },
      island: () => {
        m.close();
        this.g.toIsland(true);
      },
      next: () => {
        m.close();
        this.g.nextLevel(n);
      },
    });
  }
  lose(n) {
    const m = this.modal({
      ribbon: t('lose'),
      ribbonCls: 'sea',
      body: `<div class="col" style="margin-top:26px"><p class="center">${esc(t('loseSub'))}</p>
        <div class="row"><button class="btn big sand" data-a="island">${IC.palm}${esc(t('toIsland'))}</button><button class="btn big" data-a="retry">${esc(t('retry'))}</button></div></div>`,
      close: false,
    });
    this.bind(m, {
      island: () => {
        m.close();
        this.g.toIsland(true);
      },
      retry: () => {
        m.close();
        this.g.retry(true);
      },
    });
  }
  noCoins() {
    const m = this.modal({
      title: t('noCoins'),
      body: `<div class="col"><div style="width:90px;height:90px;align-self:center">${IC.bag}</div>${this.adRow()}<button class="btn big green" data-a="shop">${IC.shop}${esc(t('getCoins'))}</button></div>`,
    });
    this.bindAd(m);
    this.bind(m, {
      shop: () => {
        m.close();
        this.shop();
      },
    });
  }

  // ---------- магазин ----------
  adRow() {
    if(!sdk.canReward())return `<p class="center">${LANG==='ru'?'Монеты можно получить за уровни и ежедневный подарок.':'Earn coins by completing levels and collecting the daily gift.'}</p>`;
    const wait = save.data.freeAdAt + AD_COOLDOWN - Date.now();
    if (wait > 0) {
      const s = Math.ceil(wait / 1000);
      return `<button class="btn big sea" disabled>${IC.film}${esc(t('adWait', { n: Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') }))}</button>`;
    }
    return `<button class="btn big sea" data-a="adcoins">${IC.film}${esc(t('adCoins', { n: AD_COINS }))}</button>`;
  }
  bindAd(m) {
    const b = m.querySelector('[data-a="adcoins"]');
    if (!b) return;
    b.onclick = () => {
      b.disabled = true;
      this.g.adCoins(() => {
        const nb = document.createElement('div');
        nb.innerHTML = this.adRow();
        b.replaceWith(nb.firstChild);
        this.bindAd(m);
      });
    };
  }
  shop() {
    const txt = { owned: t('owned') };
    const render = () => {
      const items = iap.items();
      return `<div class="col">${this.adRow()}${items.length ? items.map((x) => itemHTML(x, txt)).join('') : `<p class="center">${esc(t('storeEmpty'))}</p>`}</div>`;
    };
    const m = this.modal({ title: t('storeT'), body: render() });
    const wire = () => {
      this.bindAd(m);
      m.querySelectorAll('.iap-buy[data-id]').forEach((b) => {
        b.onclick = async () => {
          m.querySelectorAll('.iap-buy').forEach((e) => (e.disabled = true));
          const ok = await iap.buy(b.dataset.id);
          if (ok) audio.play('buy');
          const pb = m.querySelector('.pb');
          if (pb) {
            pb.innerHTML = render();
            enter(pb);
            wire();
          }
          this.refreshTop();
        };
      });
    };
    wire();
  }

  // ---------- подарок дня ----------
  daily() {
    const d = save.data.daily;
    if(d.day===today())return;
    const yest = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const streak = d.day === yest ? d.streak % DAILY.length : 0;
    const m = this.modal({
      title: t('daily'),
      body: `<div class="days">${DAILY.map((c, i) => `<div class="day ${i < streak ? 'got' : ''} ${i === streak ? 'now' : ''} ${i === DAILY.length - 1 ? 'last' : ''}"><span>${esc(i === streak ? t('dailyToday') : t('dailyDay', { n: i + 1 }))}</span>${i === DAILY.length - 1 ? IC.bag : IC.coin}<b>${c}</b></div>`).join('')}</div>
        <div class="row"><button class="btn big green" data-a="take">${IC.gift}${esc(t('dailyTake'))}</button></div>`,
    });
    this.bind(m, {
      take: () => {
        if(d.day===today())return;
        save.data.coins += DAILY[streak];
        d.day = today();
        d.streak = streak + 1;
        save.write();
        audio.play('gift');
        m.close();
        this.toast('+' + DAILY[streak] + ' ' + t('coins').toLowerCase());
        this.home();
      },
    });
  }

  // ---------- настройки и рекорды ----------
  settings() {
    const st = save.data.settings;
    const m = this.modal({
      title: t('settings'),
      body: `<div class="col">${slidersHTML(st, { music: t('music'), sound: t('sound') }, { music: IC.music, sound: IC.sound })}
        <div class="setrow"><span>${esc(t('hints'))}</span><div class="seg"><button data-h="1" class="${st.hints ? 'on' : ''}">${esc(t('on'))}</button><button data-h="0" class="${st.hints ? '' : 'on'}">${esc(t('off'))}</button></div></div>
        <div class="setrow"><span>${esc(t('quality'))}</span><div class="seg"><button data-q="high" class="${this.g.quality !== 'low' ? 'on' : ''}">${esc(t('qHigh'))}</button><button data-q="low" class="${this.g.quality === 'low' ? 'on' : ''}">${esc(t('qLow'))}</button></div></div></div>`,
    });
    const appearance=document.createElement('button');appearance.className='btn mid sea';appearance.dataset.appearance='1';appearance.innerHTML=IC.scene+(LANG==='ru'?'Фон партии и оформление':'Game scene and appearance');m.querySelector('.pb').appendChild(appearance);appearance.onclick=()=>{m.close();this.cosmetics();};
    bindSliders(m, st, () => save.write(false));
    m.querySelectorAll('[data-h]').forEach((b) => (b.onclick = () => {
      st.hints = b.dataset.h === '1';
      save.write(false);
      m.querySelectorAll('[data-h]').forEach((x) => x.classList.toggle('on', x === b));
    }));
    m.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => {
      st.quality = b.dataset.q;
      save.write(false);
      m.querySelectorAll('[data-q]').forEach((x) => x.classList.toggle('on', x === b));
      this.g.setQuality(b.dataset.q);
    }));
  }
  world() {
    const ru=LANG==='ru',tier=save.data.expansion||0,next=nextExpansion();
    const body='<p class="center">'+(ru?'Открывайте новые участки суши и развивайте свой остров. Каждое расширение добавляет три постройки.':'Open new stretches of land. Each coast adds three new buildings.')+'</p><div class="districts">'+EXPANSIONS.map(e=>{
      const owned=e.id<=tier,current=e.id===tier+1,ready=current&&canExpand();
      const projects=PROJECTS.filter(p=>p.tier===e.id);
      const progress=projects.reduce((sum,p)=>sum+(save.data.stages[p.id]||0),0);
      return '<div class="district '+(owned?'owned':'')+'"><div class="district-mark">'+(owned?IC.palm:IC.lock)+'</div><div><small>'+(ru?'Берег ':'Coast ')+e.id+'</small><b>'+esc(ru?e.ru:e.en)+'</b><p>'+projects.map(p=>esc(t('p_'+p.id))).join(' · ')+'</p><span>'+(owned?(ru?'Построено этапов: ':'Stages built: ')+progress+'/9':(ru?'Пройдите уровень ':'Complete level ')+e.level+' · ★ '+e.stars)+'</span></div>'+(current?'<button class="btn mid '+(ready?'green':'sand')+'" data-expand '+(ready?'':'disabled')+'>'+(ru?'Открыть':'Open')+'</button>':owned?'<span class="district-done">'+IC.check+'</span>':'')+'</div>';
    }).join('')+'</div>'+(next?'<p class="center">'+(ru?'Ваши свободные звёзды: ':'Your available stars: ')+save.stars()+'</p>':'<p class="center">'+(ru?'Все берега открыты. Теперь остров — настоящий дом!':'Every coast is open. This island is a real home!')+'</p>');
    const m=this.modal({title:ru?'Новые берега':'New shores',wide:true,body});
    const expand=m.querySelector('[data-expand]');if(expand)expand.onclick=()=>{m.close();if(this.g.expandIsland())this.toast(ru?'Новый берег открыт!':'New coast opened!');this.world();};
  }
  journal() {
    const ru=LANG==='ru',j=worldState(),q=j.daily;
    const tasks=TASKS.map(task=>{
      const claimed=q.claimed.includes(task.id),ready=q[task.id]>=task.goal;
      return '<div class="task-card"><div><b>'+esc(ru?task.ru:task.en)+'</b><small>'+Math.min(task.goal,q[task.id])+'/'+task.goal+' · '+task.coins+' '+(ru?'монет':'coins')+'</small></div><button class="btn mid '+(ready&&!claimed?'green':'sand')+'" data-task="'+task.id+'" '+(ready&&!claimed?'':'disabled')+'>'+(claimed?(ru?'Получено':'Claimed'):(ru?'Забрать':'Claim'))+'</button></div>';
    }).join('');
    const ready=harvestReady();
    const finds=CHAPTERS.map((names,ch)=>{const done=j.chapters.includes(ch),p=chapterProgress(ch),ready=p.count===50;return '<button class="find-card '+(done?'collected':'')+'" data-find="'+ch+'" '+(ready&&!done?'':'disabled')+'><span>'+(['✦','⚓','❖','✿','☼'][ch%5])+'</span><b>'+esc(names[ru?0:1])+'</b><small>'+(done?(ru?'В коллекции':'Collected'):ready?(ru?'Забрать находку':'Claim discovery'):p.count+'/50')+'</small></button>';}).join('');
    const m=this.modal({title:ru?'Дневник Робинзона':'Robinson’s journal',wide:true,body:'<div class="population-summary"><b>'+(ru?'Обитатели острова':'Island neighbours')+'</b><span>'+(ru?'Жители: ':'Residents: ')+this.g.island.walkers.length+' / 12 · '+(ru?'Животные: ':'Animals: ')+this.g.island.population.animals+'</span><small>'+(ru?'Новые жители и животные приходят после улучшений.':'Upgrades bring new neighbours and animals.')+'</small></div><div class="wildlife-list">'+WILDLIFE.map(d=>'<div class="'+(wildlifeUnlocked(d,save.data.stages)?'arrived':'')+'"><b>'+esc(ru?d.ru:d.en)+'</b><small>'+(wildlifeUnlocked(d,save.data.stages)?(ru?'На острове':'On the island'):esc(t('p_'+d.requires[0]))+' · '+(ru?'этап ':'stage ')+d.requires[1])+'</small></div>').join('')+'</div><h3>'+(ru?'Поручения на сегодня':'Today’s requests')+'</h3><div class="task-list">'+tasks+'</div><h3>'+(ru?'Урожай сада':'Garden harvest')+'</h3><div class="task-card"><div><b>'+(ru?'Корзина фруктов':'Fruit basket')+'</b><small>'+(ru?'Постройте сад. Новый урожай после трёх побед.':'Build the garden. New fruit after three wins.')+'</small></div><button class="btn mid '+(ready?'green':'sand')+'" data-harvest '+(ready?'':'disabled')+'>'+(ru?'Собрать':'Harvest')+'</button></div><h3>'+(ru?'Находки путешествия · ':'Voyage discoveries · ')+j.chapters.length+'/20</h3><p class="center">'+(ru?'Завершите 50 уровней главы, чтобы получить находку и монеты.':'Complete all 50 levels of a chapter for a discovery and coins.')+'</p><div class="find-grid">'+finds+'</div>'});
    const refresh=coins=>{if(coins)this.toast('+'+coins);m.close();this.refreshTop();this.journal();};
    m.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>refresh(claimTask(b.dataset.task)));
    m.querySelectorAll('[data-find]').forEach(b=>b.onclick=()=>refresh(claimChapter(+b.dataset.find)));
    m.querySelector('[data-harvest]').onclick=()=>refresh(harvest());
  }
  islandThumbnail(){
    try{this.g.island.render();const cv=document.createElement('canvas');cv.width=256;cv.height=160;const source=this.g.c3,k=Math.max(256/source.width,160/source.height);cv.getContext('2d').drawImage(source,(256-source.width*k)/2,(160-source.height*k)/2,source.width*k,source.height*k);return cv.toDataURL();}catch{return '';}
  }
  cosmetics() {
    const c=cosmeticState(),ru=LANG==='ru';
    const items=(list,kind)=>list.map(item=>{
      const owned=c.owned.includes(item.id),active=c[kind]===item.id;
      let card; if(kind==='back'){const art=new CardArt();art.setSize(80,1);art.backColors=item.colors;art.backStyle=item.id;card=art.back().toDataURL();}
      const swatch=kind==='theme'?(item.id==='island'?'<img class="theme-preview" src="'+this.islandThumbnail()+'" alt="">':'<span class="theme-preview '+item.id+'"></span>'):'<img class="back-preview-art" src="'+card+'" alt="">';
      return '<button class="cosmetic '+(active?'selected':'')+'" data-kind="'+kind+'" data-style="'+item.id+'" aria-pressed="'+active+'">'+swatch+'<b>'+esc(ru?item.ru:item.en)+'</b><small>'+(active?(ru?'Выбрано':'Selected'):owned?(ru?'Выбрать':'Select'):IC.coin+item.price)+'</small></button>';
    }).join('');
    const m=this.modal({title:ru?'Сундук оформления':'Style chest',wide:true,body:'<p class="center">'+(ru?'По умолчанию за картами виден ваш остров со всеми улучшениями. Фон можно сменить здесь, в настройках или кнопкой «Фон» над картами.':'Your own upgraded island is the default scene. Change it here, in Settings or with Scene above your cards.')+'</p><h3>'+(ru?'Фон стола':'Table scene')+'</h3><div class="cosmetic-grid">'+items(THEMES,'theme')+'</div><h3>'+(ru?'Рубашки карт':'Card backs')+'</h3><div class="cosmetic-grid">'+items(BACKS,'back')+'</div><button class="btn mid sand motion-toggle">'+(ru?'Анимация фона: ':'Background motion: ')+(c.motion?(ru?'вкл.':'on'):(ru?'выкл.':'off'))+'</button>'});
    m.querySelectorAll('[data-style]').forEach(b=>b.onclick=()=>{
      if(!selectCosmetic(b.dataset.style,b.dataset.kind,this.g)){this.toast(t('noCoins'));return;}
      this.refreshTop();m.close();this.cosmetics();
    });
    m.querySelector('.motion-toggle').onclick=()=>{c.motion=!c.motion;save.write();applyCosmetics(this.g);m.close();this.cosmetics();};
  }
  async leaderboard() {
    const ru=LANG==='ru',score=save.total(),levels=Object.keys(save.data.levels).length;
    const m=this.modal({title:ru?'Мои результаты':'My records',body:
      '<div class="record-total">'+IC.trophy+'<b>'+fmt(score)+'</b><small>'+(ru?'Личный суммарный результат':'Your total personal score')+'</small></div><div class="record-details"><span>'+(ru?'Уровней пройдено':'Levels completed')+'<b>'+levels+'</b></span><span>'+(ru?'Звёзд заработано':'Stars earned')+'<b>'+save.starsEarned()+'</b></span><span>'+(ru?'Этапов построено':'Building stages')+'<b>'+save.built()+'/'+TOTAL_STEPS+'</b></span></div>'+(score?'':'<p class="center">'+(ru?'Пройдите первый уровень, чтобы установить рекорд.':'Complete your first level to set a record.')+'</p>')+(score&&sdk.canShareRecord()?'<button class="btn mid sea" data-story>'+IC.trophy+(ru?'Рекорд в историю':'Record to story')+'</button>':'')});
    const button=m.querySelector('[data-story]');
    if(button)button.onclick=async()=>{button.disabled=true;const result=await sdk.shareRecord({score,levels});button.disabled=false;if(result.status!=='complete')this.toast(ru?'История не опубликована.':'Story was not published.');};
  }

}
export { LANG };
