// Приложение: меню, список кроссвордов, кроссворд дня, окна, награды, реклама, рекорды, магазин
import { sdk } from './sdk.js';
import { save } from './save.js';
import { t, LANG } from './i18n.js';
import { audio } from './audio.js';
import { iap, priceHTML } from './iap.js';
import { initVolume, slidersHTML, bindSliders, volumeCss } from './volume.js';
import { IC, coinsArt, NOADS_ART, AD_ART } from './icons.js';
import { GameView, COST } from './game.js';
import { Puzzle } from './puzzle.js';
import {dailyPuzzle} from './daily.js';
import { confetti } from './fx.js';
import { Scene, THUMB_W, THUMB_H } from './location-scene.js';
import {LEVELS_PER_LOCATION,CLASSIC_LOCATIONS,SCHOLAR_LOCATIONS,locationFor,locationTitle} from './locations.js';
import RU from './data/ru.json';
import EN from './data/en.json';
import {weekState,recordPuzzle,recordWords,goalsHTML,claimGoal} from './journal.js';

const DATA = { ru: RU, en: EN };
const PER_CH = LEVELS_PER_LOCATION;
const AD_COINS = 30;
const DAILY_COINS = 50;
const AD_GAP = 150000; // не чаще раза в 2,5 минуты

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const $ = (s, r = document) => r.querySelector(s);

export const IAP_DEFS = {
  coins_300: { grant: () => addCoins(300) },
  coins_1000: { grant: () => addCoins(1000) },
  coins_3000: { grant: () => addCoins(3000) },
  disable_ads: {
    permanent: true,
    grant: () => {
      save.data.noAds = true;
      sdk.noAds = true;
    },
  },
};
const IAP_ART = { coins_300: coinsArt(2), coins_1000: coinsArt(4), coins_3000: coinsArt(6), disable_ads: NOADS_ART };

function addCoins(n) {
  save.data.coins += n;
  updateCoins(true);
}

const S = {
  view: 'menu',
  modal: null,
  mode: null, // 'level' | 'adult' | 'daily'
  list: 'main', // какой список открыт на экране уровней: 'main' | 'adult'
  lvl: 0,
  pz: null,
  lastAd: Date.now(),
  tut: 0,
  saveTimer: null,
  sdkPaused: false,
};

const prog = () => save.data.p[LANG];
const levels = () => DATA[LANG].levels;
const adultLevels = () => DATA[LANG].adult || [];
// прогресс текущего режима: основной или «Клуб эрудитов»
const track = (mode = S.mode) => (mode === 'adult' ? prog().ad : prog());
const listOf = (mode = S.mode) => (mode === 'adult' ? adultLevels() : levels());
let game;
let scene;

// ---------- общие элементы ----------
function updateCoins(bump) {
  document.querySelectorAll('.cv').forEach((e) => (e.textContent = save.data.coins));
  if (game) game.setCoins(save.data.coins, bump);
  if (bump) audio.play('coin');
}

export function toast(msg, kind = '') {
  const box = $('#toast');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  box.innerHTML = '';
  box.appendChild(el);
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.remove(), 2600);
}

function setGameplay() {
  sdk.gameplay(S.view === 'game' && !S.modal && !document.hidden && !sdk.adActive && !S.sdkPaused && !S.pz?.complete());
}

function applySettings() {
  const st = save.data.settings;
  document.documentElement.dataset.theme = st.theme;
  document.documentElement.dataset.text = String(st.text);
  document.documentElement.dataset.backdrop=st.backdrop;
  if(scene)scene.reduced=!st.motion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  syncScene();
  if (game) requestAnimationFrame(() => game.layout());
}

function openModal(html, { cls = '', onClose, closable = true } = {}) {
  closeModal(true);
  const root = document.createElement('div');
  root.className = 'modal';
  root.innerHTML = `<div class="sheet ${cls}">${html}</div>`;
  const close = () => {
    audio.play('click');
    closeModal();
  };
  root.querySelectorAll('[data-close]').forEach((b) => (b.onclick = close));
  root.addEventListener('pointerdown', e=>e.stopPropagation());
  root.addEventListener('click', e=>{e.stopPropagation();if(closable && e.target===root){e.preventDefault();close();}});
  document.body.appendChild(root);
  S.modal = { root, onClose };
  setGameplay();
  return root;
}

function closeModal(silent) {
  if (!S.modal) return;
  const m = S.modal;
  S.modal = null;
  m.root.remove();
  if (!silent && m.onClose) m.onClose();
  setGameplay();
}

const head = (title) => `<div class="sh-h"><b>${esc(title)}</b><button class="xbtn" data-close aria-label="close">${IC.close}</button></div>`;

// фон: в кроссворде главы — пейзаж этой главы, на остальных экранах — базовый
function syncScene() {
  if (!scene) return;
  const on = S.view === 'game' && save.data.settings.scenes;
  const location = on && S.mode !== 'daily' ? locationFor(S.lvl,S.mode) : null;
  scene.set(location?.id, save.data.settings.theme);
}

function show(view) {
  S.view = view;
  document.body.dataset.view=view;
  syncScene();
  document.querySelectorAll('#app>.view').forEach((v) => v.classList.toggle('hidden', v.id !== view));
  if (view === 'game') game.show(true);
  audio.setMood(view === 'game' ? 'game' : 'menu');
  setGameplay();
}

// ---------- логотип ----------
function logoSVG() {
  // два слова, пересекающихся по общей букве
  const [h, v, hx, vy] = LANG === 'ru' ? ['КРОСС', 'СЛОВО', 3, 0] : ['CROSS', 'WORDS', 2, 1];
  const s = 46,
    pad = 6;
  const cells = [];
  [...h].forEach((ch, i) => cells.push({ x: i, y: vy, ch, hl: i === hx }));
  [...v].forEach((ch, j) => j !== vy && cells.push({ x: hx, y: j, ch, hl: false, v: true }));
  const W = h.length * s + pad * 2,
    H = v.length * s + pad * 2;
  const body = cells
    .map(
      (c) =>
        `<g transform="translate(${pad + c.x * s},${pad + c.y * s})"><rect x="1.5" y="1.5" width="${s - 3}" height="${s - 3}" rx="5" fill="${c.hl ? '#ffc838' : c.v ? '#e2f2e5' : '#fffaf0'}" stroke="#2a3246" stroke-width="3"/><text x="${s / 2}" y="${s / 2 + 10}" text-anchor="middle" font-family="PT Sans,Arial" font-weight="700" font-size="29" fill="#1d2536">${c.ch}</text></g>`,
    )
    .join('');
  return `<svg class="logo" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

// ---------- меню ----------
function buildMenu() {
  const el = document.createElement('div');
  el.id = 'menu';
  el.className = 'view';
  document.getElementById('app').appendChild(el);
}

function renderMenu() {
  const el = $('#menu');
  const p = prog();
  const n = levels().length;
  const allDone = p.cur >= n;
  const d = dailyState();
  const contLabel = p.cur === 0 && !p.ip ? t('start') : t('continue');
  el.innerHTML = `
    <header class="bar">
      <button class="chip m-coins">${IC.coin}<span class="cv">${save.data.coins}</span><i class="plus">+</i></button>
      <button class="ibtn m-set" aria-label="settings">${IC.gear}</button>
    </header>
    <div class="mwrap">
      ${logoSVG()}
      <div class="mt">${esc(t('title1'))}<span>${esc(t('title2'))}</span></div>
      <div class="msub">${esc(t('subtitle'))}</div>
      <div class="edition">${esc(t('campaignSize'))}</div>
      <div class="mbtns">
        <button class="btn b-main m-play">${IC.play}<span>${esc(contLabel)}${allDone ? '' : `<small>${esc(t('levelN', { n: p.cur + 1 }))}</small>`}</span></button>
        <button class="btn b-plain btn-daily m-daily">${IC.calendar}<span class="dl">${esc(t('daily'))}<small class="${d.done ? 'done' : ''}">${esc(d.done ? t('dailyDone') : t('dailyReward', { n: DAILY_COINS }))}</small></span>${d.done ? `<span class="tick">${IC.checkc}</span>` : ''}</button>
        <div class="row">
          <button class="btn b-plain m-levels">${IC.grid}<span>${esc(t('levelsShort'))}</span></button>
          <button class="btn b-plain m-adult">${IC.books}<span>${esc(t('adultShort'))}</span></button>
        </div>
        <button class="btn b-plain m-journal">${IC.quill}<span>${esc(t('journal'))}<small>${esc(t('journalSub'))}</small></span></button>
        <div class="row">
          <button class="btn b-plain m-lb">${IC.trophy}<span>${esc(t('records'))}</span></button>
          <button class="btn b-plain m-store">${IC.coin}<span>${esc(t('store'))}</span></button>
        </div>
      </div>
    </div>`;
  const on = (s, fn) =>
    ($(s, el).onclick = () => {
      audio.unlock();
      audio.play('click');
      fn();
    });
  on('.m-play', () => (allDone ? toast(t('allDone')) : openLevel(p.cur)));
  on('.m-daily', openDaily);
  on('.m-levels', () => {
    S.list = 'main';
    renderLevels();
    show('levels');
  });
  on('.m-adult', () => {
    S.list = 'adult';
    renderLevels();
    show('levels');
  });
  on('.m-lb', openLeaderboard);
  on('.m-store', openStore);
  on('.m-coins', openStore);
  on('.m-set', openSettings);
  on('.m-journal', openJournal);
}

// ---------- список кроссвордов ----------
function buildLevels() {
  const el = document.createElement('div');
  el.id = 'levels';
  el.className = 'view hidden';
  el.innerHTML = `<header class="bar"><button class="backbtn l-back">${IC.back}<span>${esc(t('back'))}</span></button><div class="ttl">${esc(t('levels'))}</div><button class="chip l-coins">${IC.coin}<span class="cv">0</span><i class="plus">+</i></button></header><div class="scroll"><div class="chs"></div></div>`;
  document.getElementById('app').appendChild(el);
  $('.l-back', el).onclick = () => {
    audio.play('click');
    renderMenu();
    show('menu');
  };
  $('.l-coins', el).onclick = () => {
    audio.play('click');
    openStore();
  };
  $('.chs', el).addEventListener('click', (e) => {
    const tl = e.target.closest('.tile');
    if (!tl) return;
    audio.unlock();
    const i = +tl.dataset.i;
    if (i > track(S.list === 'adult' ? 'adult' : 'level').cur) {
      audio.play('wrong');
      return toast(t('locked'));
    }
    audio.play('click');
    openLevel(i, S.list === 'adult' ? 'adult' : 'level');
  });
}

function renderLevels() {
  const el = $('#levels');
  const adult = S.list === 'adult';
  const p = track(adult ? 'adult' : 'level');
  const L = listOf(adult ? 'adult' : 'level');
  const chs = Math.ceil(L.length / PER_CH);
  $('.ttl', el).textContent = adult ? t('adultShort') : t('levels');
  let html = `<form class="jump-form"><label>${esc(t('jump'))} <input type="number" min="1" max="${L.length}" value="${Math.min(p.cur+1,L.length)}" aria-label="${esc(t('jump'))}"></label><button class="mini" type="submit">${esc(t('go'))}</button><span>${Math.min(p.cur,L.length)} / ${L.length}</span></form>`;
  for (let c = 0; c < chs; c++) {
    const location=(adult?SCHOLAR_LOCATIONS:CLASSIC_LOCATIONS)[c];
    const from = c * PER_CH,
      to = Math.min(L.length, from + PER_CH);
    let solved = 0,
      tiles = '';
    for (let i = from; i < to; i++) {
      const st = p.stars[i] || 0;
      if (st) solved++;
      const lock = i > p.cur;
      const cur = i === p.cur;
      const stars = st ? `<span class="st">${[1, 2, 3].map((k) => `<span style="color:${k <= st ? 'var(--gold)' : 'var(--line)'}">${IC.star}</span>`).join('')}</span>` : '';
      tiles += `<button class="tile${st ? ' done' : ''}${cur ? ' cur' : ''}${lock ? ' lock' : ''}" data-i="${i}">${lock ? IC.lock : `<span>${i + 1}</span>${stars}`}${p.ip && p.ip.lvl === i && !st ? '<i class="ip"></i>' : ''}</button>`;
    }
    const art = scene.thumb(location.id, THUMB_W, THUMB_H);
    const name = locationTitle(location,LANG);
    const sub = t('chapterRange',{a:from+1,b:to});
    const cnt = t('solvedOf', { a: solved, b: to - from });
    const active=c===Math.min(chs-1,Math.floor(p.cur/PER_CH));
    html += `<details class="chap location-chapter" data-location="${location.id}" style="--cc:${location.color}" ${active?'open':''}><summary><div class="chart"><img src="${art}" loading="lazy" alt=""></div><div class="chh"><div class="cic">${IC[location.icon]||IC.quill}</div><div><b>${esc(name)}</b><small>${esc(sub)} · ${esc(cnt)}</small></div><span class="chapter-chevron">${IC.next}</span></div></summary><div class="tiles">${tiles}</div></details>`;
  }
  $('.chs', el).innerHTML = html;
  $('.jump-form',el).onsubmit=e=>{e.preventDefault();const n=Math.floor(+$('input',e.currentTarget).value)-1;if(n<0||n>=L.length)return;if(n>p.cur){toast(t('jumpLocked'));const tile=$('.tile[data-i="'+n+'"]',el);if(tile){tile.closest('details').open=true;tile.scrollIntoView({block:'center'});}return;}openLevel(n,adult?'adult':'level');};
  updateCoins();
  requestAnimationFrame(() => {
    const cur = $('.tile.cur', el);
    if (cur) cur.scrollIntoView({ block: 'center' });
  });
}

// ---------- кроссворд ----------
function openLevel(i, mode = 'level') {
  $('#toast').innerHTML = '';
  const L = listOf(mode)[i];
  if (!L) return;
  const p = track(mode);
  const pz = new Puzzle(p.ip?.lvl===i && p.ip.puz ? p.ip.puz : L);
  if (p.ip && p.ip.lvl === i) pz.restore(p.ip);
  S.mode = mode;
  S.list = mode === 'adult' ? 'adult' : 'main';
  S.lvl = i;
  S.pz = pz;
  game.open(pz, t(mode === 'adult' ? 'adultN' : 'levelN', { n: i + 1 }));
  game.setLocation(locationTitle(locationFor(i,mode),LANG));
  updateCoins();
  show('game');
  startTutorial();
}

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dailyState() {
  const d = save.data.archive[LANG+':'+dateKey()]||{};
  const key = dateKey();
  if (d.date !== key || d.lang !== LANG || !d.puz) return { done: false, fresh: true };
  return { done: d.done, fresh: false };
}

function makeDaily(key) { return dailyPuzzle(DATA[LANG].bank,key,LANG); }

function openDaily(key = dateKey()) {
  if(typeof key!=='string')key=dateKey();
  // One independent puzzle, progress and reward per language and calendar date.
  const id=LANG+':'+key;
  let d=save.data.archive[id];
  if(!d) d=save.data.archive[id]={date:key,lang:LANG,puz:makeDaily(key),ip:null,done:false};
  if(!d.puz)d.puz=makeDaily(key);
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-35);
  for(const item of Object.values(save.data.archive))if(item.date<dateKey(cutoff)&&item!==d){delete item.puz;delete item.ip;}
  save.data.daily=d;
  save.write();
  const pz = new Puzzle(d.puz);
  if (d.ip) pz.restore(d.ip);
  if (d.done) {
    // уже решён — показываем решённым
    pz.cells.forEach((c, i) => c && (pz.letters[i] = c.ch));
    pz.refresh();
  }
  S.mode = 'daily';
  S.pz = pz;
  game.open(pz, key===dateKey()?t('daily'):t('dailyArchive',{date:key.slice(8)+'.'+key.slice(5,7)}));
  updateCoins();
  show('game');
}

function persistProgress(pz) {
  if (pz.complete()) return;
  const ip = pz.serialize();
  if (S.mode !== 'daily') track().ip = { lvl: S.lvl, ...ip, puz:{w:pz.w,h:pz.h,e:pz.entries.map(e=>[e.x,e.y,e.dir,e.word,e.clue])} };
  else save.data.daily.ip = ip;
  clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(() => save.write(), 600);
}

function onComplete(pz) {
  if(pz._awarded)return;pz._awarded=true;
  clearTimeout(S.saveTimer);
  setGameplay();
  const stars = pz.stars();
  const n = pz.entries.length;
  let coins, points;
  let streak = 0;
  let isFirst=false;
  if (S.mode !== 'daily') {
    const p = track();
    const first = !p.stars[S.lvl];
    isFirst=first;
    const k = S.mode === 'adult' ? 1.5 : 1; // трудный раздел щедрее
    coins = first ? Math.round((8 + n + (stars === 3 ? 10 : stars === 2 ? 4 : 0)) * k) : 5;
    points = first ? Math.round((n * 10 + stars * 15) * k) : 0;
    p.stars[S.lvl] = Math.max(p.stars[S.lvl] || 0, stars);
    if (p.ip && p.ip.lvl === S.lvl) p.ip = null;
    while (p.stars[p.cur]) p.cur++;
    if (S.mode === 'level' && S.lvl === 0) save.data.tutDone = true;
  } else {
    const d = save.data.daily;
    const first = !d.done;
    isFirst=first;
    coins = first ? DAILY_COINS + (stars === 3 ? 10 : 0) : 0;
    points = first ? 150 + stars * 15 : 0;
    if (first) {
      if(d.date===dateKey()){
        const y = new Date();y.setDate(y.getDate()-1);
        const yesterday=save.data.archive[LANG+':'+dateKey(y)];
        d.streak=yesterday?.done?(yesterday.streak||1)+1:1;
      }
    }
    d.done = true;
    d.ip = null;
    streak = d.streak||0;
  }
  if(isFirst)save.data.solvedWords += n;
  recordPuzzle(pz,isFirst);
  save.data.coins += coins;
  save.data.score += points;
  save.write();
  updateCoins();
  setTimeout(() => {
    if(S.pz!==pz||S.view!=='game')return;
    audio.play('win');
    confetti();
    showWin({ stars, coins, points, streak, hints: pz.hints });
  }, 700);
}

function showWin({ stars, coins, points, streak, hints }) {
  $('#toast').innerHTML = '';
  removeTip();
  const daily = S.mode === 'daily';
  const hasNext = !daily && S.lvl + 1 < listOf().length;
  const title = stars === 3 ? t('winGreat') : stars === 2 ? t('winGood') : t('winOk');
  const root = openModal(
    `<div class="sh-b">
      <h2>${esc(title)}</h2>
      <div class="wsub">${esc(daily ? t('winDaily') : t('winTitle'))} · ${esc(hints ? t('hintsUsed', { n: hints }) : t('noHints'))}</div>
      <div class="stars">${[1, 2, 3].map((k) => IC.star.replace('class="ic"', `class="ic${k <= stars ? ' on' : ''}" style="animation-delay:${0.2 + k * 0.18}s"`)).join('')}</div>
      <div class="rew">
        <div class="w-c">${IC.coin}<span>+<b class="w-cn">${coins}</b></span></div>
        ${points ? `<div class="pt">${IC.trophy}<span>+${points}</span></div>` : ''}
      </div>
      ${daily && streak ? `<div class="wsub">${esc(t('streak', { n: streak }))}</div>` : ''}
      <div class="wsub">${esc(t('totalScore'))}: <b>${save.data.score}</b></div>
    </div>
    <div class="sh-f">
      ${coins && sdk.canReward() ? `<button class="btn b-gold w-x2">${IC.video}<span>${esc(t('double'))}</span></button>` : ''}
      ${hasNext ? `<button class="btn b-main w-next">${esc(t('next'))}${IC.next}</button>` : ''}
      <button class="btn b-plain w-list">${esc(daily ? t('menu') : t('toLevels'))}</button>
    </div>`,
    { cls: 'win', closable: false },
  );
  const x2 = $('.w-x2', root);
  if (x2)
    x2.onclick = () => {
      x2.disabled = true;
      audio.suspend('ad');
      sdk.showRewarded(
        () => {
          addCoins(coins);
          save.write();
          $('.w-cn', root).textContent = coins * 2;
          x2.remove();
          toast(t('doubled'), 'good');
        },
        (ok) => {
          audio.resume('ad');
          if (!ok && x2.isConnected) x2.disabled = false;
          setGameplay();
        },
      );
    };
  const next = $('.w-next', root);
  if (next)
    next.onclick = () => {
      audio.play('click');
      closeModal(true);
      const m = S.mode;
      afterLevel(() => openLevel(S.lvl + 1, m));
    };
  $('.w-list', root).onclick = () => {
    audio.play('click');
    closeModal(true);
    afterLevel(() => {
      if (daily) {
        renderMenu();
        show('menu');
      } else {
        renderLevels();
        show('levels');
      }
    });
  };
}

// полноэкранная реклама в логической паузе между кроссвордами
function afterLevel(go) {
  const solved = Object.keys(prog().stars).length + Object.keys(prog().ad.stars).length;
  if (solved < 3 || save.data.noAds || Date.now() - S.lastAd < AD_GAP) return go();
  S.lastAd = Date.now();
  audio.suspend('ad');
  sdk.showInterstitial(() => {
    audio.resume('ad');
    go();
    setGameplay();
  });
}

function backFromGame() {
  removeTip();
  if (S.pz && !S.pz.complete()) persistProgress(S.pz);
  save.write();
  if (S.mode === 'daily') {
    renderMenu();
    show('menu');
  } else {
    renderLevels();
    show('levels');
  }
}

// ---------- обучение ----------
function startTutorial() {
  removeTip();
  if (save.data.tutDone || S.mode !== 'level' || S.lvl !== 0) return (S.tut = 0);
  S.tut = 1;
  game.sel = null;
  game.render();
  // шаг 1: вопрос-приглашение в строке вопроса подсвечивается
  $('#game .cluebar').classList.add('pulse');
}

// at: 'tools' — подсказка поверх кнопок, стрелка вниз (к клавиатуре); 'kbd' — поверх клавиатуры, стрелка вверх (к кнопкам)
function showTip(text, ok, at) {
  removeTip();
  const d = document.createElement('div');
  d.className = 'tipbox ' + (at === 'kbd' ? 'upa' : 'dn');
  d.innerHTML = `<span>${esc(text)}</span>${ok ? `<button>${esc(t('tutOk'))}</button>` : ''}`;
  if (ok)
    d.querySelector('button').onclick = () => {
      audio.play('click');
      removeTip();
      save.data.tutDone = true;
      S.tut = 0;
      save.write();
    };
  document.body.appendChild(d);
  const place = () => {
    const tools = $('#game .tools').getBoundingClientRect();
    const kbd = $('#game .kbd').getBoundingClientRect();
    const h = d.offsetHeight;
    d.style.left = tools.left + tools.width / 2 + 'px';
    d.style.maxWidth = Math.max(tools.width, 280) + 'px';
    d.style.top = (at === 'kbd' ? kbd.top + 10 : tools.bottom - h - 4) + 'px';
  };
  place();
  d._place = place;
}

function removeTip() {
  document.querySelectorAll('.tipbox').forEach((e) => e.remove());
  const cb = $('#game .cluebar');
  if (cb) cb.classList.remove('pulse');
}

// ---------- окна ----------
function openClues() {
  const pz = S.pz;
  if (!pz) return;
  const e = game.cur();
  const item = (x) => `<button class="q${pz.solved.has(x.id) ? ' done' : ''}${e && e.id === x.id ? ' on' : ''}" data-id="${x.id}"><b>${x.num}</b><span>${esc(x.clue)}</span></button>`;
  const root = openModal(
    `${head(t('allClues'))}<div class="sh-b"><h3>${esc(t('across'))}</h3>${pz.entries.filter((x) => x.dir === 'a').map(item).join('')}<h3>${esc(t('down'))}</h3>${pz.entries.filter((x) => x.dir === 'd').map(item).join('')}</div>`,
    { cls: 'qlist' },
  );
  root.querySelectorAll('.q').forEach(
    (b) =>
      (b.onclick = () => {
        closeModal(true);
        game.selectEntry(+b.dataset.id);
      }),
  );
  const on = $('.q.on', root);
  if (on) on.scrollIntoView({ block: 'center' });
}

function openSettings() {
  const st = save.data.settings;
  let css = document.getElementById('vol-css');
  if (!css) {
    css = document.createElement('style');
    css.id = 'vol-css';
    document.head.appendChild(css);
  }
  css.textContent = volumeCss({ accent: 'var(--accent)', muted: 'var(--muted)', track: 'var(--line)', thumb: 'var(--card)' });
  const seg = (key, opts) => `<div class="seg" data-k="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(st[key]) === String(v) ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
  const root = openModal(
    `${head(t('settings'))}<div class="sh-b">
      <div class="sect"><div class="lb">${esc(t('textSize'))}</div>${seg('text', [[0, t('textS')], [1, t('textM')], [2, t('textL')]])}</div>
      <div class="sect"><div class="lb">${esc(t('theme'))}</div>${seg('theme', [['light', t('themeLight')], ['contrast', t('themeContrast')], ['dark', t('themeDark')]])}</div>
      <div class="sect"><div class="lb">${esc(t('backdrop'))}</div>${seg('backdrop',[['paper',t('paper')],['reading',t('readingRoom')]])}</div>
      <div class="sect"><div class="toggle ${st.motion ? 'on' : ''}" data-t="motion"><div class="tx"><b>${esc(t('motion'))}</b><small>${esc(t('motionDesc'))}</small></div><div class="sw"></div></div></div>
      <div class="sect"><div class="toggle ${st.scenes ? 'on' : ''}" data-t="scenes"><div class="tx"><b>${esc(t('scenes'))}</b><small>${esc(t('scenesDesc'))}</small></div><div class="sw"></div></div></div>
      <div class="sect"><div class="toggle ${st.autoCheck ? 'on' : ''}" data-t="autoCheck"><div class="tx"><b>${esc(t('autoCheck'))}</b><small>${esc(t('autoCheckDesc'))}</small></div><div class="sw"></div></div></div>
      <div class="sect"><div class="lb">${esc(t('volume'))}</div>${slidersHTML(st, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}</div>
      <div class="sect"><div class="lb">${esc(t('howTo'))}</div><p class="howto">${esc(t('howToText'))}</p></div>
      <button class="mini credits">${esc(t('credits'))}</button>
    </div>`,
    {
      onClose: () => {
        save.write();
        if (game.visible) game.render();
      },
    },
  );
  root.querySelectorAll('.seg').forEach((sg) =>
    sg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      audio.play('click');
      const k = sg.dataset.k;
      st[k] = k === 'text' ? +b.dataset.v : b.dataset.v;
      sg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      applySettings();
      save.write(false);
    }),
  );
  root.querySelectorAll('.toggle').forEach(
    (tg) =>
      (tg.onclick = () => {
        audio.play('click');
        st[tg.dataset.t] = !st[tg.dataset.t];
        tg.classList.toggle('on', st[tg.dataset.t]);
        applySettings();
        save.write(false);
        if (game.visible) game.render();
      }),
  );
  bindSliders(root, st, () => save.write(false));
  $('.credits',root).onclick=()=>openModal(`${head(t('credits'))}<div class="sh-b credits-body">${document.getElementById('third-party-notices')?.innerHTML||''}</div>`);
}

function rewardedCoins(btn, after) {
  if(!sdk.canReward()){toast(t('adUnavailable'));return;}
  if (btn) btn.disabled = true;
  audio.suspend('ad');
  sdk.showRewarded(
    () => {
      addCoins(AD_COINS);
      save.write();
      toast(t('got', { n: AD_COINS }), 'good');
    },
    () => {
      audio.resume('ad');
      if (btn && btn.isConnected) btn.disabled = false;
      setGameplay();
      after && after();
    },
  );
}

function notEnough(cost) {
  const root = openModal(
    `${head(t('notEnough'))}<div class="sh-b"><p>${esc(t('notEnoughDesc', { n: cost }))}</p></div>
    <div class="sh-f">${sdk.canReward()?`<button class="btn b-gold ne-ad">${IC.video}<span>${esc(t('watchAd', { n: AD_COINS }))}</span></button>`:`<p class="muted">${esc(t('noAdsAvailable'))}</p>`}
    ${iap.available() ? `<button class="btn b-plain ne-buy">${IC.coin}<span>${esc(t('buyCoins'))}</span></button>` : ''}</div>`,
  );
  const ad=$('.ne-ad',root);if(ad)ad.onclick = (e) => rewardedCoins(e.currentTarget, () => closeModal());
  const b = $('.ne-buy', root);
  if (b) b.onclick = () => openStore();
}

function openStore() {
  const render = (root) => {
    const items = iap.items();
    const rows = items
      .map((x) => {
        const art = x.p.imageURI ? `<img src="${esc(x.p.imageURI)}" alt="">` : IAP_ART[x.id] || '';
        const btn = x.owned ? `<button class="btn b-ghost" disabled>${esc(t('iapOwned'))}</button>` : `<button class="btn b-main s-buy" data-id="${esc(x.id)}">${priceHTML(x.p)}</button>`;
        return `<div class="srow"><div class="sic">${art}</div><div class="stx"><b>${esc(x.p.title)}</b><small>${esc(x.p.description)}</small></div>${btn}</div>`;
      })
      .join('');
    $('.sh-b', root).innerHTML = `
      ${sdk.canReward()?`<div class="srow col"><div class="sic">${AD_ART}</div><div class="stx"><b>${esc(t('freeCoins'))}</b><small>${esc(t('freeCoinsDesc', { n: AD_COINS }))}</small></div><button class="btn b-gold s-ad">${IC.video}<span>${esc(t('watch'))}</span></button></div>`:`<p class="muted">${esc(t('noAdsAvailable'))}</p><button class="btn b-plain s-goals">${IC.quill}<span>${esc(t('goals'))}</span></button>`}
      ${rows}
      ${save.data.noAds ? `<p class="muted">${esc(t('noAdsOn'))}</p>` : ''}`;
    const ad=$('.s-ad',root);if(ad)ad.onclick = (e) => rewardedCoins(e.currentTarget);
    const goals=$('.s-goals',root);if(goals)goals.onclick=()=>openJournal('goals');
    root.querySelectorAll('.s-buy').forEach(
      (b) =>
        (b.onclick = async () => {
          audio.play('click');
          root.querySelectorAll('.s-buy').forEach((x) => (x.disabled = true));
          const ok = await iap.buy(b.dataset.id);
          if (ok) toast(t('bought'), 'good');
          if (root.isConnected) render(root);
        }),
    );
  };
  const root = openModal(`${head(t('storeTitle'))}<div class="sh-b"></div>`, { onClose: () => S.view === 'menu' && renderMenu() });
  render(root);
}

function personalRecord(){
  const p=prog();const values=[...Object.values(p.stars),...Object.values(p.ad.stars)];
  const days=Object.values(save.data.archive).filter(d=>d.lang===LANG&&d.done).length;
  return {score:save.data.score,words:save.data.solvedWords,solved:values.length+days,stars:values.reduce((a,b)=>a+b,0)};
}
function openLeaderboard() {
  const record=personalRecord();
  const root=openModal(`${head(t('lbTitle'))}<div class="sh-b"><div class="record-hero">${IC.trophy}<strong>${record.score.toLocaleString()}</strong><span>${esc(t('totalScore'))}</span></div><div class="record-grid">${[['recordSolved',record.solved],['recordWords',record.words],['recordStars',record.stars]].map(([label,n])=>`<div><b>${n}</b><span>${esc(t(label))}</span></div>`).join('')}</div>${sdk.canShareRecord?.()&&record.score>0?`<button class="btn b-main share-record">${IC.quill}<span>${esc(t('story'))}</span></button>`:''}</div>`);
  const btn=$('.share-record',root);if(btn)btn.onclick=async()=>{btn.disabled=true;audio.suspend('story');try{const r=await sdk.shareRecord(record);if(r.status!=='complete')toast(t(r.status==='unavailable'?'storyUnavailable':'storyCancelled'));}finally{audio.resume('story');btn.disabled=false;}};
}

function openJournal(tab='goals'){
  if(!['goals','archive','notebook'].includes(tab))tab='goals';
  const root=openModal(`${head(t('journal'))}<div class="journal-tabs">${['goals','archive','notebook'].map(k=>`<button class="mini ${k===tab?'on':''}" data-tab="${k}">${esc(t(k))}</button>`).join('')}</div><div class="sh-b journal-body"></div>`,{cls:'journal',onClose:()=>{if(S.view==='menu')renderMenu();}});
  root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>openJournal(b.dataset.tab));
  const body=$('.journal-body',root);
  if(tab==='goals'){
    body.innerHTML=goalsHTML(esc);
    body.querySelectorAll('.claim').forEach(b=>b.onclick=()=>{const n=claimGoal(b.dataset.goal);if(n){updateCoins(true);openJournal('goals');}});
  }else if(tab==='archive'){
    let html=`<p class="muted">${esc(t('archiveSub'))}</p><div class="calendar-grid">`;
    for(let i=0;i<30;i++){const d=new Date();d.setDate(d.getDate()-i);const key=dateKey(d),done=save.data.archive[LANG+':'+key]?.done;html+=`<button class="calendar-day ${done?'done':''}" data-date="${key}"><b>${d.getDate()}</b><small>${d.toLocaleDateString(LANG==='ru'?'ru-RU':'en-US',{month:'short'})}</small><span>${done?'✓':i===0?'●':'○'}</span></button>`;}
    body.innerHTML=html+'</div>';
    body.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{closeModal(true);openDaily(b.dataset.date);});
  }else{
    const book=save.data.notebook[LANG];
    body.innerHTML=`<p class="muted">${esc(t('notebookEmpty'))}</p><label class="book-filter"><input type="checkbox"> ${esc(t('favoritesOnly'))}</label><div class="wordbook">${book.map(x=>`<div class="word-row ${x.star?'starred':''}"><div><b>${esc(x.word)}</b><span>${esc(x.clue)}</span></div><button class="word-star" data-word="${esc(x.word)}" aria-label="${esc(t('favoritesOnly'))}" aria-pressed="${x.star}">${x.star?'★':'☆'}</button></div>`).join('')}</div>`;
    body.querySelector('input').onchange=e=>body.querySelector('.wordbook').classList.toggle('only-starred',e.target.checked);
    body.querySelectorAll('[data-word]').forEach(b=>b.onclick=()=>{const x=book.find(x=>x.word===b.dataset.word);x.star=!x.star;b.textContent=x.star?'★':'☆';b.setAttribute('aria-pressed',String(x.star));b.closest('.word-row').classList.toggle('starred',x.star);save.write();});
  }
}

// ---------- запуск ----------
export function initApp() {
  scene = new Scene();
  applySettings();
  initVolume(save.data.settings);
  sdk.noAds = !!save.data.noAds;
  buildMenu();
  buildLevels();
  game = new GameView({
    coins: () => save.data.coins,
    spend: (n) => {
      save.data.coins -= n;
      updateCoins();
      save.write();
    },
    onBack: backFromGame,
    onComplete,
    onChange: persistProgress,
    notEnough,
    toast,
    openClues,
    settings: openSettings,
    store: openStore,
    autoCheck: () => save.data.settings.autoCheck,
    blocked: () => !!S.modal || sdk.adActive || S.sdkPaused || document.hidden,
    onSelect: () => {
      if (S.tut === 1) {
        S.tut = 2;
        showTip(t('tut2'), false, 'tools');
      }
    },
    onWord: (entries) => {
      recordWords(entries);
      if (S.tut === 1 || S.tut === 2) {
        S.tut = 3;
        showTip(t('tut3'), true, 'kbd');
      }
    },
  });
  iap.onChange(() => {
    updateCoins();
  });
  renderMenu();
  show('menu');
  updateCoins();

  // раскладка: широкий экран — панель справа
  const lay = () => {
    const wide = innerWidth >= 860 && innerWidth / innerHeight > 1.15;
    document.body.classList.toggle('wide', wide);
    requestAnimationFrame(() => game.layout());
    const tip = $('.tipbox');
    if (tip && tip._place) requestAnimationFrame(tip._place);
  };
  lay();
  window.addEventListener('resize', lay);

  // звук и пауза
  const unlock = () => {
    audio.unlock();
    audio.startMusic();
  };
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      audio.suspend('hidden');
      if (S.pz) persistProgress(S.pz);
      clearTimeout(S.saveTimer);save.write();sdk.saveData(save.data,true);
    } else audio.resume('hidden');
    setGameplay();
  });
  window.addEventListener('blur', () => audio.suspend('blur'));
  window.addEventListener('focus', () => audio.resume('blur'));
  window.addEventListener('pagehide',()=>{if(S.pz)persistProgress(S.pz);clearTimeout(S.saveTimer);save.write();sdk.saveData(save.data,true);});
  sdk.on('pause', () => {
    S.sdkPaused=true;
    audio.suspend('sdk');
    sdk.gameplay(false);
  });
  sdk.on('resume', () => {
    S.sdkPaused=false;
    audio.resume('sdk');
    setGameplay();
  });
  // запрет контекстного меню и выделения
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => {
    if (!e.target.closest('.scroll,.sh-b,#menu,.cl ol,.boardbox.zoomed')) e.preventDefault();
  }, { passive: false });

  // отладка и тесты
  window.__app = { S, save, sdk, game, scene, openLevel, openDaily, renderMenu, show, levels, dateKey, closeModal, openSettings,openJournal,personalRecord };
}
