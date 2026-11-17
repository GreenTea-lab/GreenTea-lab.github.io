// Приложение: меню, путь садов (1000 уровней), быстрая игра, судоку дня, «Мой сад», достижения,
// рекорды и статистика, окна, награды, реклама, обучение
import { sdk } from './sdk.js';
import { save } from './save.js';
import { t, fmtTime, LANG } from './i18n.js';
import { audio } from './audio.js';
import { iap, priceHTML } from './iap.js';
import { initVolume, slidersHTML, bindSliders, volumeCss } from './volume.js';
import { IC, logoSVG, coinsArt, NOADS_ART, AD_ART } from './icons.js';
import { Board } from './board.js';
import { Scene } from './scene.js';
import { ITEMS, SEASONS, sceneSVG, iconSVG, earnedCount, need, price } from './garden.js';
import { TIERS, tiersOf, GARDEN_LIST, GARDENS, PER_GARDEN, pathPlan } from './levels.js';
import { achState, claimable } from './achievements.js';
import { transform } from './sudoku.js';
import { Tutorial } from './tutorial.js';
import { SKINS, owns, skinPreview } from './skins.js';
import { RANKS, rankOf, MEDALS, monthCount, medalsEarned, need as medalNeed } from './ranks.js';
import P from './data/puzzles.json';

export const HINT_COST = 50;
const AD_COINS = 50;
const DAILY_COINS = 60;
const AD_GAP = 150000;
const GIFT_COINS = 25;
const PLAN = pathPlan();
const TOTAL = PLAN.length;
const KINDS = ['classic', 'diag', 'mini'];
const DAILY_PLAN = { 1: ['classic', 1], 2: ['classic', 2], 3: ['classic', 2], 4: ['classic', 3], 5: ['classic', 3], 6: ['classic', 4], 0: ['diag', 1] };

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const $ = (s, r = document) => r.querySelector(s);

export const IAP_DEFS = {
  // coins_300 и coins_3000 — товары прошлой версии игры: если они остались в консоли, покупки по-прежнему работают
  coins_300: { grant: () => addCoins(300) },
  coins_1000: { grant: () => addCoins(1000) },
  coins_3500: { grant: () => addCoins(3500) },
  coins_3000: { grant: () => addCoins(3000) },
  coins_10000: { grant: () => addCoins(10000) },
  // «Сад мастера»: без рекламы, все стили поля (и золотой), подарок дня ×2 и подсказка в подарок каждый день
  premium_pass: {
    permanent: true,
    grant: () => {
      save.data.premium = true;
      save.data.noAds = true;
      sdk.noAds = true;
    },
  },
  disable_ads: {
    permanent: true,
    grant: () => {
      save.data.noAds = true;
      sdk.noAds = true;
    },
  },
};
const IAP_ART = { coins_1000: coinsArt(2), coins_3500: coinsArt(4), coins_10000: coinsArt(6), coins_300: coinsArt(2), coins_3000: coinsArt(6), disable_ads: NOADS_ART, premium_pass: `<span class="premart">${IC.crown}</span>` };

const S = { view: 'menu', modal: null, cur: null, lastAd: Date.now(), saveTimer: null, garden: 0, quickKind: 'classic', season: 0 };
let board, scene, tut;

// ---------- монеты и уведомления ----------
function addCoins(n) {
  save.data.coins += n;
  updateCoins(true);
}

function updateCoins(bump) {
  document.querySelectorAll('.cv').forEach((e) => (e.textContent = save.data.coins));
  if (board) board.setCoins(save.data.coins, bump);
  if (bump) audio.play('coin');
}

export function toast(msg, kind = '') {
  const box = $('#toast');
  box.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  box.appendChild(el);
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.remove(), kind === 'long' ? 5000 : 2600);
}

function setGameplay() {
  sdk.gameplay(S.view === 'game' && !S.modal && !document.hidden && !sdk.adActive && !!board && !board.done && !board.paused);
}

function applySettings() {
  const st = save.data.settings;
  document.documentElement.dataset.gtheme = st.theme;
  document.documentElement.dataset.text = String(st.text);
  const bd = document.querySelector('#game .board');
  if (bd) bd.dataset.skin = st.theme !== 'contrast' && owns(save.data, st.skin) ? st.skin : 'paper';
  if (scene) {
    scene.setTheme(st.theme);
    scene.setPetals(st.petals);
  }
  if (board && board.visible) requestAnimationFrame(() => (board.layout(), board.render()));
}

// ---------- окна ----------
function openModal(html, { cls = '', onClose, closable = true } = {}) {
  closeModal(true);
  const root = document.createElement('div');
  root.className = 'modal';
  root.innerHTML = `<div class="sheet ${cls}">${html}</div>`;
  root.querySelectorAll('[data-close]').forEach(
    (b) =>
      (b.onclick = () => {
        audio.play('click');
        closeModal();
      }),
  );
  if (closable) root.addEventListener('pointerdown', (e) => e.target === root && (audio.play('click'), closeModal()));
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

function show(view) {
  S.view = view;
  document.querySelectorAll('#app>.view').forEach((v) => v.classList.toggle('hidden', v.id !== view));
  if (view === 'game') board.show(true);
  else if (tut) tut.stop();
  audio.setMood(view === 'game' ? (S.cur && S.cur.kind === 'classic' && S.cur.tier >= 4 ? 'night' : 'game') : 'menu');
  setGameplay();
}

// ---------- даты ----------
const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayNum = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 86400000);
};

// ---------- описание игры по ключу ----------
// "p:<номер>" — путь, "f:<вид>:<сложность>:<n>" — быстрая игра, "d:<дата>" — судоку дня
const gardenName = (g) => t('g_' + GARDEN_LIST[g].id);
function diffLabel(kind, tier) {
  const name = t('t_' + tiersOf(kind)[tier].id);
  return kind === 'classic' ? name : t('k_' + kind) + ' · ' + name;
}

function gameSpec(key) {
  const [mode, a, b, c] = key.split(':');
  if (mode === 'p') {
    const idx = +a;
    const lv = PLAN[idx];
    return { key, mode, idx, kind: lv.kind, tier: lv.tier, g: lv.g, puzzle: P.path[idx], title: t('levelN', { g: gardenName(lv.g), n: lv.k + 1 }), head: gardenName(lv.g), num: lv.k + 1, short: t('levelShort', { n: idx + 1 }) };
  }
  if (mode === 'f') {
    const kind = a,
      tier = +b,
      n = +c;
    const pool = P.pools[kind][tier];
    const puzzle = transform(pool[n % pool.length], n * 131 + tier * 17 + KINDS.indexOf(kind) * 1009 + 1);
    return { key, mode, kind, tier, n, puzzle, title: t('quick'), short: diffLabel(kind, tier) };
  }
  // судоку дня
  const date = a;
  const dn = dayNum(date);
  const wd = new Date(date + 'T12:00:00').getDay();
  const [kind, tier] = DAILY_PLAN[wd];
  const pool = P.pools[kind][tier];
  const puzzle = transform(pool[((dn % pool.length) + pool.length) % pool.length], dn * 7 + 3);
  return { key, mode: 'd', date, kind, tier, puzzle, title: t('daily'), short: fmtDate(date) };
}

function fmtDate(k) {
  const [, m, d] = k.split('-').map(Number);
  return `${d} ${t('mon' + m)}`;
}

function openGame(key) {
  $('#toast').innerHTML = '';
  const sp = gameSpec(key);
  S.cur = sp;
  const T = tiersOf(sp.kind)[sp.tier];
  board.open({ puzzle: sp.puzzle, title: sp.head || sp.title, diffLabel: (sp.num ? '№ ' + sp.num + ' · ' : '') + t('t_' + T.id), diffIcon: sp.kind !== 'classic' ? IC[sp.kind] : '', color: T.color, restore: save.data.ip[key] });
  save.data.last = key;
  updateCoins();
  show('game');
  if (key === 'p:0' && (!save.data.tutDone || S.forceTut)) {
    S.forceTut = false;
    tut.start();
  }
}

function persist() {
  if (!S.cur || board.done) return;
  save.data.ip[S.cur.key] = board.serialize();
  // храним не больше 8 незаконченных
  const keys = Object.keys(save.data.ip);
  if (keys.length > 8) for (const k of keys.slice(0, keys.length - 8)) if (k !== S.cur.key) delete save.data.ip[k];
  clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(() => save.write(), 700);
}

// ---------- путь ----------
const starsOf = (idx) => +(save.data.path.stars[idx] || 0);
function setStars(idx, n) {
  let s = save.data.path.stars;
  while (s.length <= idx) s += '0';
  save.data.path.stars = s.slice(0, idx) + n + s.slice(idx + 1);
}
function nextPathIdx() {
  const D = save.data;
  for (let i = 0; i <= Math.min(D.path.max, TOTAL - 1); i++) if (!starsOf(i)) return i;
  return Math.min(D.path.max, TOTAL - 1);
}
const gardenOpen = (g) => g * PER_GARDEN <= save.data.path.max;
function gardenStats(g) {
  let solved = 0,
    stars = 0;
  for (let k = 0; k < PER_GARDEN; k++) {
    const s = starsOf(g * PER_GARDEN + k);
    if (s) solved++;
    stars += s;
  }
  return { solved, stars };
}
function gardenRange(g) {
  const ts = PLAN.filter((l) => l.g === g && l.kind === 'classic').map((l) => l.tier);
  const lo = Math.min(...ts),
    hi = Math.max(...ts);
  return lo === hi ? t('t_' + TIERS[lo].id) : `${t('t_' + TIERS[lo].id)} – ${t('t_' + TIERS[hi].id)}`;
}

// ---------- сад ----------
const gardenCount = () => Math.min(ITEMS.length, earnedCount(save.data.solved) + save.data.garden.extra);

// ---------- меню ----------
function continueKey() {
  const D = save.data;
  if (D.last && D.ip[D.last]) return D.last;
  return 'p:' + nextPathIdx();
}

function renderMenu() {
  const el = $('#menu');
  const D = save.data;
  const key = continueKey();
  const sp = gameSpec(key);
  const fresh = !Object.keys(D.ip).length && D.solved === 0;
  const dk = dateKey();
  const dd = !!D.daily.done[dk];
  const got = gardenCount();
  const pathSolved = [...D.path.stars].filter((c) => c > '0').length;
  const ach = claimable({ ...D, gardenCount: got });
  el.innerHTML = `
    <header class="bar">
      <button class="chip m-coins">${IC.coin}<span class="cv">${D.coins}</span></button>
      <div class="sp"></div>
      <button class="ibtn m-gift" aria-label="gift">${IC.gift}${D.gift !== dk ? '<i class="dot g">1</i>' : ''}</button>
      <button class="ibtn m-ach" aria-label="achievements">${IC.medal}${ach ? `<i class="dot">${ach}</i>` : ''}</button>
      <button class="ibtn m-set" aria-label="settings">${IC.gear}</button>
    </header>
    <div class="mwrap">
      <div class="mhead">${logoSVG()}
        <div class="mt">${esc(t('title1'))}<span>${esc(t('title2'))}</span></div>
        <div class="msub">${esc(t('subtitle'))}</div>
      </div>
      <div class="mbtns">
        <button class="btn b-gold m-play">${IC.play}<span>${esc(fresh ? t('start') : t('continue'))}<small>${esc(sp.mode === 'p' ? sp.title : sp.title + ' · ' + sp.short)}</small></span></button>
        <button class="btn b-glass btn-left m-path">${IC.path}<span class="dl">${esc(t('path'))}<span class="gprog"><i><b style="width:${(pathSolved / TOTAL) * 100}%"></b></i>${esc(t('pathProg', { a: pathSolved, b: TOTAL }))}</span></span></button>
        <button class="btn b-glass btn-left m-quick">${IC.bolt}<span class="dl">${esc(t('quick'))}<small>${esc(t('quickSub'))}</small></span></button>
        <button class="btn b-glass btn-left m-daily">${IC.calendar}<span class="dl">${esc(t('daily'))}<small>${esc(dd ? t('dailyDone') : t('dailyReward', { n: DAILY_COINS }))}${D.daily.streak > 1 && !dd ? ' · ' + esc(t('streakShort', { n: D.daily.streak })) : ''}</small></span>${dd ? `<span class="tick">${IC.checkc}</span>` : ''}</button>
        <button class="btn b-glass btn-left m-garden">${IC.tree}<span class="dl">${esc(t('myGarden'))}<span class="gprog"><i><b style="width:${(got / ITEMS.length) * 100}%;background:var(--sakura)"></b></i>${esc(t('gardenProg', { a: got, b: ITEMS.length }))}</span></span></button>
        <div class="row">
          <button class="btn b-glass m-lb">${IC.trophy}<span>${esc(t('records'))}</span></button>
          <button class="btn b-glass m-store">${IC.coin}<span>${esc(t('store'))}</span></button>
        </div>
      </div>
    </div>`;
  const on = (s, fn) =>
    ($(s, el).onclick = () => {
      audio.unlock();
      audio.play('click');
      fn();
    });
  on('.m-play', () => openGame(key));
  on('.m-path', () => (renderPath(), show('path')));
  on('.m-quick', () => (renderQuick(), show('quick')));
  on('.m-daily', openDaily);
  on('.m-garden', () => (renderGarden(), show('garden')));
  on('.m-lb', openRecords);
  on('.m-store', openStore);
  on('.m-coins', openStore);
  on('.m-ach', openAchievements);
  on('.m-gift', openGift);
  on('.m-set', openSettings);
}

// ---------- экраны ----------
function view(id, title, back) {
  const v = document.createElement('div');
  v.id = id;
  v.className = 'view hidden';
  v.innerHTML = `<header class="bar"><button class="backbtn x-back">${IC.back}<span>${esc(t('back'))}</span></button><div class="ttl">${esc(title)}</div><button class="chip x-coins">${IC.coin}<span class="cv">0</span></button></header><div class="scroll"><div class="inner"></div></div>`;
  $('#app').appendChild(v);
  $('.x-back', v).onclick = () => {
    audio.play('click');
    back();
  };
  $('.x-coins', v).onclick = () => {
    audio.play('click');
    openStore();
  };
  return v;
}

const toMenu = () => (renderMenu(), show('menu'));

function buildViews() {
  const menu = document.createElement('div');
  menu.id = 'menu';
  menu.className = 'view';
  $('#app').appendChild(menu);
  view('path', t('path'), toMenu);
  const lv = view('levels', '', () => (renderPath(), show('path')));
  view('quick', t('quick'), toMenu);
  view('garden', t('myGarden'), toMenu);

  $('#path .inner').addEventListener('click', (e) => {
    const b = e.target.closest('[data-g]');
    if (!b) return;
    audio.unlock();
    const g = +b.dataset.g;
    if (!gardenOpen(g)) {
      audio.play('wrong');
      return toast(t('gardenLocked', { g: gardenName(g - 1) }));
    }
    audio.play('click');
    S.garden = g;
    renderLevels();
    show('levels');
  });
  $('.inner', lv).addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    audio.unlock();
    const i = +b.dataset.i;
    if (i > save.data.path.max) {
      audio.play('wrong');
      return toast(t('locked'));
    }
    audio.play('click');
    openGame('p:' + i);
  });
}

function renderPath() {
  let html = `<div class="pathlist">`;
  for (let g = 0; g < GARDENS; g++) {
    const G = GARDEN_LIST[g];
    const open = gardenOpen(g);
    const st = gardenStats(g);
    const cur = open && (g === GARDENS - 1 || !gardenOpen(g + 1));
    html += `<button class="gcard${open ? '' : ' lock'}${cur ? ' cur' : ''}" data-g="${g}" style="--cc:${G.color}">
      <div class="cic">${open ? IC[G.icon] : IC.lock}</div>
      <div class="gtx"><b>${esc(gardenName(g))}</b><small>${esc(t('levelsRange', { a: g * PER_GARDEN + 1, b: (g + 1) * PER_GARDEN }))} · ${esc(gardenRange(g))}</small>
        <span class="gprog"><i><b style="width:${(st.solved / PER_GARDEN) * 100}%;background:var(--cc)"></b></i>${st.solved}/${PER_GARDEN}</span></div>
      <div class="gst">${IC.star}<span>${st.stars}</span></div>
    </button>`;
  }
  html += '</div>';
  $('#path .inner').innerHTML = html;
  updateCoins();
  requestAnimationFrame(() => {
    const cur = $('#path .gcard.cur');
    if (cur) cur.scrollIntoView({ block: 'center' });
  });
}

function renderLevels() {
  const g = S.garden;
  const G = GARDEN_LIST[g];
  const D = save.data;
  $('#levels .ttl').textContent = gardenName(g);
  const st = gardenStats(g);
  let tiles = '';
  for (let k = 0; k < PER_GARDEN; k++) {
    const i = g * PER_GARDEN + k;
    const lv = PLAN[i];
    const s = starsOf(i);
    const lock = i > D.path.max;
    const cur = !lock && !s && i === nextPathIdx();
    const T = tiersOf(lv.kind)[lv.tier];
    const mark = lv.kind === 'diag' ? `<em class="km">${IC.diag}</em>` : lv.kind === 'mini' ? `<em class="km">${IC.mini}</em>` : '';
    const stars = s ? `<span class="st">${[1, 2, 3].map((n) => `<span class="${n <= s ? 'on' : ''}">${IC.star}</span>`).join('')}</span>` : '';
    tiles += `<button class="tile${s ? ' done' : ''}${cur ? ' cur' : ''}${lock ? ' lock' : ''}" data-i="${i}" style="--tc:${T.color}">${lock ? IC.lock : `<span class="n">${i + 1}</span>${stars}`}${mark}${D.ip['p:' + i] && !s ? '<i class="ip"></i>' : ''}<i class="tb"></i></button>`;
  }
  $('#levels .inner').innerHTML = `<section class="chap" style="--cc:${G.color}">
    <div class="chh"><div class="cic">${IC[G.icon]}</div><div><b>${esc(gardenName(g))}</b><small>${esc(gardenRange(g))}</small><small class="chst"><span>${esc(t('solvedOf', { a: st.solved, b: PER_GARDEN }))}</span><span class="sv">${IC.star}${st.stars}/${PER_GARDEN * 3}</span></small></div></div>
    <p class="gdesc">${esc(t('gd_' + G.id))}</p>
    <div class="tiles">${tiles}</div>
    <div class="legend"><span><em class="km">${IC.diag}</em>${esc(t('k_diag'))}</span>${g <= 1 ? `<span><em class="km">${IC.mini}</em>${esc(t('k_mini'))}</span>` : ''}</div>
  </section>`;
  updateCoins();
  requestAnimationFrame(() => {
    const cur = $('#levels .tile.cur');
    if (cur) cur.scrollIntoView({ block: 'center' });
  });
}

// ---------- быстрая игра ----------
function renderQuick() {
  const D = save.data;
  const kind = S.quickKind;
  const tabs = KINDS.map((k) => `<button data-k="${k}" class="${k === kind ? 'on' : ''}">${IC[k === 'classic' ? 'grid' : k]}<span>${esc(t('k_' + k))}</span></button>`).join('');
  const rows = tiersOf(kind)
    .map((T, tier) => {
      const k = kind + ':' + tier;
      const stt = D.stats[k];
      const ipKey = Object.keys(D.ip).find((x) => x.startsWith(`f:${k}:`));
      const info = stt ? t('qStats', { n: stt.n, t: fmtTime(D.best[k] || 0) }) : t('qNone');
      return `<button class="qrow" data-t="${tier}" style="--cc:${T.color}"><i class="qdot"></i><div class="qtx"><b>${esc(t('t_' + T.id))}</b><small>${esc(t('td_' + (kind === 'mini' ? 'mini_' : '') + T.id))}</small><small class="qs">${esc(info)}</small></div><span class="qgo">${ipKey ? `<span>${esc(t('continue'))}</span>` : ''}${IC.next}</span></button>`;
    })
    .join('');
  $('#quick .inner').innerHTML = `<div class="qwrap"><div class="ktabs">${tabs}</div><p class="gdesc">${esc(t('kd_' + kind))}</p><div class="qlist">${rows}</div></div>`;
  $('#quick .ktabs').onclick = (e) => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    audio.play('click');
    S.quickKind = b.dataset.k;
    renderQuick();
  };
  $('#quick .qlist').onclick = (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    audio.unlock();
    audio.play('click');
    const k = kind + ':' + b.dataset.t;
    const ipKey = Object.keys(D.ip).find((x) => x.startsWith(`f:${k}:`));
    openGame(ipKey || `f:${k}:${D.free[k] || 0}`);
  };
  updateCoins();
}

// ---------- судоку дня ----------
function openDaily() {
  const D = save.data;
  const now = new Date();
  const ym = { y: now.getFullYear(), m: now.getMonth() };
  const today = dateKey();
  const render = (root) => {
    const first = new Date(ym.y, ym.m, 1);
    const days = new Date(ym.y, ym.m + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7;
    let cells = '';
    for (let k = 0; k < lead; k++) cells += '<span></span>';
    for (let d = 1; d <= days; d++) {
      const k = dateKey(new Date(ym.y, ym.m, d));
      const fut = k > today;
      const done = D.daily.done[k];
      const ipd = D.ip['d:' + k];
      cells += `<button class="day${k === today ? ' today' : ''}${done ? ' done' : ''}${fut ? ' fut' : ''}" data-d="${k}" ${fut ? 'disabled' : ''}>${done ? `<span class="ds">${IC.star}</span>` : ''}<b>${d}</b>${ipd && !done ? '<i class="ip"></i>' : ''}</button>`;
    }
    const wd = [1, 2, 3, 4, 5, 6, 0].map((n) => `<span>${esc(t('wd' + n))}</span>`).join('');
    const canNext = ym.y < now.getFullYear() || (ym.y === now.getFullYear() && ym.m < now.getMonth());
    const canPrev = ym.y > 2026 || ym.m > 0;
    const tDone = !!D.daily.done[today];
    const tsp = gameSpec('d:' + today);
    // серия прервалась вчера: её можно сохранить, посмотрев рекламу (раз в неделю)
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const y2 = new Date();
    y2.setDate(y2.getDate() - 2);
    const lastSave = D.daily.saved ? (Date.parse(today) - Date.parse(D.daily.saved)) / 864e5 : 99;
    const canSave = !tDone && D.daily.streak >= 3 && D.daily.last === dateKey(y2) && lastSave >= 7;
    $('.sh-b', root).innerHTML = `
      <div class="dtop"><div><b>${esc(t('streakShort', { n: D.daily.streak || 0 }))}</b><small>${esc(t('bestStreak', { n: D.daily.best || 0 }))}</small></div><div class="dtoday"><small>${esc(t('today'))}</small><b>${esc(diffLabel(tsp.kind, tsp.tier))}</b></div></div>
      ${monthMedals(ym)}
      <div class="cal"><div class="calh"><button class="ibtn c-prev" ${canPrev ? '' : 'disabled'}>${IC.back}</button><b>${esc(t('month' + (ym.m + 1)))} ${ym.y}</b><button class="ibtn c-next" ${canNext ? '' : 'disabled'}>${IC.next}</button></div><div class="wds">${wd}</div><div class="days">${cells}</div></div>
      ${canSave ? `<div class="srow col"><div class="sic">${IC.calendar}</div><div class="stx"><b>${esc(t('streakSave', { n: D.daily.streak }))}</b><small>${esc(t('streakSaveDesc'))}</small></div><button class="btn b-gold d-save">${IC.video}<span>${esc(t('watch'))}</span></button></div>` : ''}
      <p class="muted small">${esc(t('dailyNote', { n: DAILY_COINS }))}</p>`;
    const sv = $('.d-save', root);
    if (sv)
      sv.onclick = () => {
        sv.disabled = true;
        audio.suspend('ad');
        let got = false;
        sdk.showRewarded(
          () => (got = true),
          () => {
            audio.resume('ad');
            if (got) {
              // вчерашний день засчитывается как пройденный для серии
              D.daily.last = dateKey(y);
              D.daily.saved = today;
              save.write();
              toast(t('streakSaved'));
              if (root.isConnected) render(root);
            } else if (sv.isConnected) sv.disabled = false;
          },
        );
      };
    $('.sh-f', root).innerHTML = tDone ? `<div class="muted ctr">${esc(t('dailyDoneLong'))}</div>` : `<button class="btn b-gold d-play">${IC.play}<span>${esc(D.ip['d:' + today] ? t('continue') : t('playToday'))}</span></button>`;
    const pl = $('.d-play', root);
    if (pl)
      pl.onclick = () => {
        audio.play('click');
        closeModal(true);
        openGame('d:' + today);
      };
    $('.c-prev', root).onclick = () => {
      audio.play('click');
      if (--ym.m < 0) ((ym.m = 11), ym.y--);
      render(root);
    };
    $('.c-next', root).onclick = () => {
      audio.play('click');
      if (++ym.m > 11) ((ym.m = 0), ym.y++);
      render(root);
    };
    $('.days', root).onclick = (e) => {
      const b = e.target.closest('[data-d]');
      if (!b || b.disabled) return;
      audio.unlock();
      audio.play('click');
      closeModal(true);
      openGame('d:' + b.dataset.d);
    };
  };
  const root = openModal(`${head(t('daily'))}<div class="sh-b"></div><div class="sh-f"></div>`, { cls: 'dailysheet', onClose: () => S.view === 'menu' && renderMenu() });
  render(root);
}

// ---------- мой сад ----------
function renderGarden(fresh = -1) {
  const D = save.data;
  const n = gardenCount();
  D.gardenCount = n;
  if (fresh < 0 && D.garden.seen < n) fresh = n - 1;
  if (fresh >= 0) S.season = ITEMS[fresh].season;
  D.garden.seen = n;
  const si = S.season;
  const left = n < ITEMS.length ? need(n) - D.solved : 0;
  const tabs = SEASONS.map((s, k) => {
    const open = n > k * 12;
    return `<button data-s="${k}" class="${k === si ? 'on' : ''}${open ? '' : ' lock'}">${open ? '' : IC.lock}<span>${esc(t('s_' + s.id))}</span></button>`;
  }).join('');
  const items = SEASONS[si].items
    .map((it, k) => {
      const idx = si * 12 + k;
      return `<div class="gi${idx < n ? '' : ' lock'}">${iconSVG(it.id)}<span>${esc(idx < n ? t('it_' + it.id) : '?')}</span></div>`;
    })
    .join('');
  const buy = n < ITEMS.length ? `<button class="btn b-gold g-buy">${IC.gift}<span>${esc(t('buyItem'))}<small>${IC.coin}${price(n)}</small></span></button>` : '';
  $('#garden .inner').innerHTML = `<div class="gwrap">
    <div class="stabs">${tabs}</div>
    <div class="gscene">${sceneSVG(si, n, fresh)}${n <= si * 12 ? `<div class="glock">${IC.lock}<b>${esc(t('seasonLocked'))}</b></div>` : ''}</div>
    <div class="gnext">${esc(n < ITEMS.length ? (left > 0 ? t('nextItem', { n: left }) : t('nextItemSoon')) : t('allItems', { n: ITEMS.length }))}${buy}</div>
    <div class="glist">${items}</div></div>`;
  $('#garden .stabs').onclick = (e) => {
    const b = e.target.closest('[data-s]');
    if (!b) return;
    audio.play('click');
    S.season = +b.dataset.s;
    renderGarden();
  };
  const bb = $('#garden .g-buy');
  if (bb)
    bb.onclick = () => {
      audio.unlock();
      const cost = price(n);
      if (D.coins < cost) return notEnough(cost, 'notEnoughItem');
      D.coins -= cost;
      D.garden.extra++;
      updateCoins();
      save.write();
      audio.play('item');
      renderGarden(n);
    };
  updateCoins();
  if (fresh >= 0) {
    audio.play('item');
    save.write(false);
  }
}

// ---------- награды ----------
function onComplete({ time, hints, mistakes }) {
  const sp = S.cur;
  const D = save.data;
  const T = tiersOf(sp.kind)[sp.tier];
  const pen = mistakes + hints * 2;
  const stars = pen === 0 ? 3 : pen <= 3 ? 2 : 1;
  let coins = 0,
    points = 0,
    medal = null,
    streak = 0,
    gardenDone = -1;
  const statKey = sp.kind + ':' + sp.tier;
  if (sp.mode === 'p') {
    const old = starsOf(sp.idx);
    if (!old) {
      coins = T.coins + (stars === 3 ? Math.ceil(T.coins * 0.4) : 0);
      points = Math.round(T.points * (stars === 3 ? 1.2 : 1));
      if (PLAN[sp.idx].k === PER_GARDEN - 1) coins += 50;
    } else if (stars > old) coins = 3;
    setStars(sp.idx, Math.max(old, stars));
    D.path.max = Math.max(D.path.max, Math.min(TOTAL - 1, sp.idx + 1));
    const g = PLAN[sp.idx].g;
    if (!old && gardenStats(g).solved === PER_GARDEN) gardenDone = g;
  } else if (sp.mode === 'f') {
    coins = Math.round(T.coins * 0.6) + (stars === 3 ? 3 : 0);
    points = Math.round(T.points * 0.6);
    D.free[statKey] = Math.max(D.free[statKey] || 0, sp.n + 1);
  } else {
    const first = !D.daily.done[sp.date];
    if (first) {
      if (sp.date === dateKey()) {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        D.daily.streak = D.daily.last === dateKey(y) ? D.daily.streak + 1 : D.daily.last === sp.date ? D.daily.streak : 1;
        D.daily.last = sp.date;
        D.daily.best = Math.max(D.daily.best || 0, D.daily.streak);
        coins = DAILY_COINS + (stars === 3 ? 10 : 0) + Math.min(D.daily.streak - 1, 6) * 5;
        points = 300 + (stars === 3 ? 60 : 0);
      } else {
        coins = 20;
        points = 100;
      }
    }
    const ym = sp.date.slice(0, 7);
    const hadMedals = medalsEarned(D.daily.done, ym);
    D.daily.done[sp.date] = Math.max(D.daily.done[sp.date] || 0, stars);
    streak = D.daily.streak;
    // медаль месяца: монеты сразу, медаль видна в календаре
    const nowMedals = medalsEarned(D.daily.done, ym);
    if (nowMedals > hadMedals) {
      medal = MEDALS[nowMedals - 1];
      coins += medal.coins;
      D.daily.medals = D.daily.medals || {};
      D.daily.medals[ym] = nowMedals;
    }
  }
  const record = !!D.best[statKey] && time < D.best[statKey];
  if (!D.best[statKey] || time < D.best[statKey]) D.best[statKey] = Math.floor(time);
  const stt = (D.stats[statKey] = D.stats[statKey] || { n: 0, t: 0 });
  stt.n++;
  stt.t += Math.floor(time);
  const before = gardenCount();
  D.solved++;
  if (stars === 3) D.perfect++;
  D.hintsUsed += hints;
  if (sp.kind === 'diag') D.flags.diag = 1;
  if (sp.kind === 'mini') D.flags.mini = 1;
  if (sp.kind === 'classic' && sp.tier >= 4) D.flags.expert = 1;
  if (sp.kind === 'classic' && sp.tier === 5) D.flags.master = 1;
  if (sp.kind === 'classic' && sp.tier <= 1 && time < 300) D.flags.fast = 1;
  if (sp.kind === 'classic' && sp.tier >= 3 && !hints && !mistakes) D.flags.clean = 1;
  const after = gardenCount();
  D.gardenCount = after;
  delete D.ip[sp.key];
  if (D.last === sp.key) D.last = '';
  if (sp.key === 'p:0') D.tutDone = true;
  D.coins += coins;
  const rankBefore = rankOf(D.score).i;
  D.score += points;
  const rank = rankOf(D.score).i > rankBefore ? rankOf(D.score) : null;
  save.write();
  if (points) sdk.submitScore(D.score);
  updateCoins();
  if (tut) tut.stop();
  setGameplay();
  setTimeout(() => {
    audio.play('win');
    showWin({ stars, coins, points, streak, time, hints, mistakes, record, item: after > before ? ITEMS[after - 1] : null, gardenDone, medal, rank });
  }, 1300);
}

function nextKey() {
  const sp = S.cur;
  if (sp.mode === 'p') return sp.idx + 1 < TOTAL ? 'p:' + (sp.idx + 1) : null;
  if (sp.mode === 'f') return `f:${sp.kind}:${sp.tier}:${save.data.free[sp.kind + ':' + sp.tier]}`;
  return null;
}

function showWin({ stars, coins, points, streak, time, hints, mistakes, record, item, gardenDone, medal, rank }) {
  $('#toast').innerHTML = '';
  const nk = nextKey();
  const title = stars === 3 ? t('winGreat') : stars === 2 ? t('winGood') : t('winOk');
  const gdone = gardenDone >= 0 ? `<div class="gdone" style="--cc:${GARDEN_LIST[gardenDone].color}"><div class="cic">${IC[GARDEN_LIST[gardenDone].icon]}</div><div><b>${esc(t('gardenDone', { g: gardenName(gardenDone) }))}</b><small>${esc(gardenDone + 1 < GARDENS ? t('gardenNext', { g: gardenName(gardenDone + 1) }) : t('pathDone'))}</small></div></div>` : '';
  const root = openModal(
    `<div class="sh-b">
      <h2>${esc(title)}</h2>
      <div class="wsub">${esc(S.cur.title + (S.cur.mode === 'p' ? '' : ' · ' + S.cur.short))}</div>
      <div class="stars">${[1, 2, 3].map((k) => IC.star.replace('class="ic"', `class="ic${k <= stars ? ' on' : ''}" style="animation-delay:${0.15 + k * 0.18}s"`)).join('')}</div>
      <div class="wsub">${esc(t('winSub', { t: fmtTime(time), m: mistakes, h: hints }))}</div>
      <div class="rew">
        ${coins ? `<div>${IC.coin}<span>+<b class="w-cn">${coins}</b></span></div>` : ''}
        ${points ? `<div>${IC.trophy}<span>+${points}</span></div>` : ''}
      </div>
      ${record ? `<div class="wsub"><b>${esc(t('newRecord'))}</b></div>` : ''}
      ${S.cur.mode === 'd' && streak ? `<div class="wsub">${esc(t('streak', { n: streak }))}</div>` : ''}
      ${stars < 3 ? `<div class="wtip">${esc(t('starTip'))}</div>` : ''}
      ${gdone}
      ${rank ? `<div class="newitem rankup"><span class="rk">${IC.crown}</span><div><small>${esc(t('rankNew'))}</small><b>${esc(t('rank_' + rank.id))}</b></div></div>` : ''}
      ${medal ? `<div class="newitem"><span class="mdl" style="--mc:${medal.color}">${IC.medal}</span><div><small>${esc(t('medalNew', { n: medal.coins }))}</small><b>${esc(t('medal_' + medal.id))}</b></div></div>` : ''}
      ${item ? `<div class="newitem">${iconSVG(item.id)}<div><small>${esc(t('newItem'))}</small><b>${esc(t('it_' + item.id))}</b></div></div>` : ''}
    </div>
    <div class="sh-f">
      ${coins ? `<button class="btn b-gold w-x2">${IC.video}<span>${esc(t('double'))}</span></button>` : ''}
      ${nk ? `<button class="btn b-gold w-next">${esc(t('next'))}${IC.next}</button>` : ''}
      ${item ? `<button class="btn b-glass w-garden">${IC.tree}<span>${esc(t('seeGarden'))}</span></button>` : ''}
      <button class="btn b-glass w-list">${esc(S.cur.mode === 'p' ? t('toList') : t('menu'))}</button>
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
          toast(t('doubled'));
        },
        (ok) => {
          audio.resume('ad');
          if (!ok && x2.isConnected) x2.disabled = false;
          setGameplay();
        },
      );
    };
  const go = (fn) => () => {
    audio.play('click');
    closeModal(true);
    afterGame(fn);
  };
  const nb = $('.w-next', root);
  if (nb) nb.onclick = go(() => openGame(nk));
  const gb = $('.w-garden', root);
  if (gb) gb.onclick = go(() => (renderGarden(), show('garden')));
  $('.w-list', root).onclick = go(() => {
    if (S.cur.mode === 'p') {
      S.garden = PLAN[Math.min(TOTAL - 1, S.cur.idx + 1)].g;
      renderLevels();
      show('levels');
    } else toMenu();
  });
}

// полноэкранная реклама в логической паузе между судоку
function afterGame(go) {
  if (save.data.solved < 3 || save.data.noAds || Date.now() - S.lastAd < AD_GAP) return go();
  S.lastAd = Date.now();
  audio.suspend('ad');
  sdk.showInterstitial(() => {
    audio.resume('ad');
    go();
    setGameplay();
  });
}

function backFromGame() {
  if (tut) tut.stop();
  persist();
  save.write();
  if (S.cur && S.cur.mode === 'p') {
    S.garden = PLAN[S.cur.idx].g;
    renderLevels();
    show('levels');
  } else if (S.cur && S.cur.mode === 'f') {
    renderQuick();
    show('quick');
  } else toMenu();
}

// ---------- подсказки: оплата ----------
function hintCost() {
  return { free: save.data.freeHints, cost: HINT_COST };
}
function payHint(cb) {
  const D = save.data;
  if (D.freeHints > 0) {
    D.freeHints--;
  } else {
    if (D.coins < HINT_COST) return notEnough(HINT_COST, 'notEnoughDesc');
    D.coins -= HINT_COST;
  }
  updateCoins();
  save.write();
  cb();
}

// ---------- окна: настройки, магазин, рекорды, достижения ----------
function openSettings() {
  const st = save.data.settings;
  let css = document.getElementById('vol-css');
  if (!css) {
    css = document.createElement('style');
    css.id = 'vol-css';
    document.head.appendChild(css);
  }
  css.textContent = volumeCss({ accent: 'var(--goldD)', muted: 'var(--muted)', track: 'var(--grid)', thumb: '#fff' });
  const seg = (key, opts) => `<div class="seg" data-k="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(st[key]) === String(v) ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
  const tog = (k, title, desc) => `<div class="toggle ${st[k] ? 'on' : ''}" data-t="${k}"><div class="tx"><b>${esc(t(title))}</b><small>${esc(t(desc))}</small></div><div class="sw"></div></div>`;
  const root = openModal(
    `${head(t('settings'))}<div class="sh-b">
      <div class="sect"><div class="lb">${esc(t('textSize'))}</div>${seg('text', [[0, t('textS')], [1, t('textM')], [2, t('textL')]])}</div>
      <div class="sect"><div class="lb">${esc(t('theme'))}</div>${seg('theme', [['night', t('themeNight')], ['dawn', t('themeDawn')], ['contrast', t('themeContrast')]])}</div>
      <div class="sect"><div class="lb">${esc(t('boardStyle'))}</div><button class="btn b-glass s-skin">${skinPreview(save.data.settings.skin)}<span>${esc(t('skin_' + (owns(save.data, st.skin) ? st.skin : 'paper')))}</span></button></div>
      <div class="sect"><div class="lb">${esc(t('inputMode'))}</div>${seg('input', [['cell', t('inputCell')], ['digit', t('inputDigit')]])}<small class="muted">${esc(t('inputDesc'))}</small></div>
      <div class="sect">
      ${tog('autoCheck', 'autoCheck', 'autoCheckDesc')}
      ${tog('hlPeers', 'hlPeers', 'hlPeersDesc')}
      ${tog('hlSame', 'hlSame', 'hlSameDesc')}
      ${tog('timer', 'showTimer', 'showTimerDesc')}
      ${tog('petals', 'petals', 'petalsDesc')}
      </div>
      <div class="sect"><div class="lb">${esc(t('volume'))}</div>${slidersHTML(st, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}</div>
      <div class="sect"><div class="lb">${esc(t('howTo'))}</div><p class="howto">${esc(t('howToText'))}</p><button class="btn b-glass s-tut">${IC.play}<span>${esc(t('tutAgain'))}</span></button></div>
    </div>`,
    {
      onClose: () => {
        save.write();
        if (board.visible) board.render();
        if (S.view === 'menu') renderMenu();
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
      if (k === 'input' && board) board.activeDigit = 0;
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
      }),
  );
  $('.s-skin', root).onclick = () => {
    audio.play('click');
    closeModal(true);
    openStore('skins');
  };
  $('.s-tut', root).onclick = () => {
    audio.play('click');
    closeModal(true);
    S.forceTut = true;
    if (save.data.ip['p:0']) delete save.data.ip['p:0'];
    openGame('p:0');
  };
  bindSliders(root, st, () => save.write(false));
}

function rewardedCoins(btn, after) {
  if (btn) btn.disabled = true;
  audio.suspend('ad');
  sdk.showRewarded(
    () => {
      addCoins(AD_COINS);
      save.write();
      toast(t('got', { n: AD_COINS }));
    },
    () => {
      audio.resume('ad');
      if (btn && btn.isConnected) btn.disabled = false;
      setGameplay();
      after && after();
    },
  );
}

function notEnough(cost, descKey) {
  const root = openModal(
    `${head(t('notEnough'))}<div class="sh-b"><p>${esc(t(descKey, { n: cost }))}</p><p class="muted">${esc(t('youHave', { n: save.data.coins }))}</p></div>
    <div class="sh-f"><button class="btn b-gold ne-ad">${IC.video}<span>${esc(t('watchAd', { n: AD_COINS }))}</span></button>
    ${iap.available() ? `<button class="btn b-glass ne-buy">${IC.coin}<span>${esc(t('buyCoins'))}</span></button>` : ''}</div>`,
  );
  $('.ne-ad', root).onclick = (e) => rewardedCoins(e.currentTarget, () => closeModal());
  const b = $('.ne-buy', root);
  if (b) b.onclick = () => openStore();
}

function openStore(tab = 'coins') {
  const D = save.data;
  const render = (root) => {
    const tabs = `<div class="seg shoptabs"><button data-tab="coins" class="${tab === 'coins' ? 'on' : ''}">${esc(t('coinsTab'))}</button><button data-tab="skins" class="${tab === 'skins' ? 'on' : ''}">${esc(t('skinsTab'))}</button></div>`;
    let body = '';
    if (tab === 'coins') {
      const items = iap.items();
      const prem = items.find((x) => x.id === 'premium_pass');
      const premRow = prem
        ? `<div class="srow col prem"><div class="sic">${IAP_ART.premium_pass}</div><div class="stx"><b>${esc(prem.p.title || t('premTitle'))}</b><ul>${[1, 2, 3, 4].map((k) => `<li>${esc(t('prem' + k))}</li>`).join('')}</ul></div>${prem.owned || D.premium ? `<button class="btn b-glass" disabled>${esc(t('iapOwned'))}</button>` : `<button class="btn b-gold s-buy" data-id="premium_pass">${priceHTML(prem.p)}</button>`}</div>`
        : '';
      const rows = items
        .filter((x) => x.id !== 'premium_pass')
        .map((x) => {
          const art = x.p.imageURI ? `<img src="${esc(x.p.imageURI)}" alt="">` : IAP_ART[x.id] || '';
          const own = x.owned || (x.id === 'disable_ads' && D.premium);
          const btn = own ? `<button class="btn b-glass" disabled>${esc(t('iapOwned'))}</button>` : `<button class="btn b-gold s-buy" data-id="${esc(x.id)}">${priceHTML(x.p)}</button>`;
          return `<div class="srow"><div class="sic">${art}</div><div class="stx"><b>${esc(x.p.title)}</b><small>${esc(x.p.description)}</small></div>${btn}</div>`;
        })
        .join('');
      body = `
      <p class="muted">${esc(t('storeIntro', { n: HINT_COST }))}</p>
      ${premRow}
      <div class="srow col"><div class="sic">${AD_ART}</div><div class="stx"><b>${esc(t('freeCoins'))}</b><small>${esc(t('freeCoinsDesc', { n: AD_COINS }))}</small></div><button class="btn b-gold s-ad">${IC.video}<span>${esc(t('watch'))}</span></button></div>
      ${rows || (sdk.real ? `<p class="muted">${esc(t('iapEmpty'))}</p>` : '')}
      ${D.noAds ? `<p class="muted">${esc(t('noAdsOn'))}</p>` : ''}`;
    } else {
      const cur = D.settings.skin;
      body = `<p class="muted">${esc(t('skinsIntro'))}</p><div class="skins">${SKINS.map((k) => {
        const have = owns(D, k.id);
        let btn;
        if (have) btn = k.id === cur ? `<button class="btn b-glass" disabled>${esc(t('skinOn'))}</button>` : `<button class="btn b-gold k-use" data-k="${k.id}">${esc(t('skinUse'))}</button>`;
        else if (k.premium) btn = `<button class="btn b-glass k-prem">${IC.crown}<span>${esc(t('premShort'))}</span></button>`;
        else btn = `<button class="btn b-gold k-buy" data-k="${k.id}">${IC.coin}<span>${k.price}</span></button>`;
        return `<div class="skin${k.id === cur ? ' on' : ''}">${skinPreview(k.id)}<b>${esc(t('skin_' + k.id))}</b>${btn}</div>`;
      }).join('')}</div>
      ${D.settings.theme === 'contrast' ? `<p class="muted small">${esc(t('skinContrast'))}</p>` : ''}`;
    }
    $('.sh-b', root).innerHTML = tabs + body;
    root.querySelectorAll('.shoptabs button').forEach(
      (b) =>
        (b.onclick = () => {
          audio.play('click');
          tab = b.dataset.tab;
          render(root);
        }),
    );
    const ad = $('.s-ad', root);
    if (ad) ad.onclick = (e) => rewardedCoins(e.currentTarget);
    root.querySelectorAll('.s-buy').forEach(
      (b) =>
        (b.onclick = async () => {
          audio.play('click');
          root.querySelectorAll('.s-buy').forEach((x) => (x.disabled = true));
          const ok = await iap.buy(b.dataset.id);
          if (ok) toast(t('bought'));
          applySettings();
          if (root.isConnected) render(root);
        }),
    );
    root.querySelectorAll('.k-use').forEach(
      (b) =>
        (b.onclick = () => {
          audio.play('click');
          D.settings.skin = b.dataset.k;
          applySettings();
          save.write();
          render(root);
        }),
    );
    root.querySelectorAll('.k-buy').forEach(
      (b) =>
        (b.onclick = () => {
          const k = SKINS.find((x) => x.id === b.dataset.k);
          if (D.coins < k.price) return notEnough(k.price, 'notEnoughSkin');
          D.coins -= k.price;
          D.skins = [...(D.skins || []), k.id];
          D.settings.skin = k.id;
          updateCoins();
          applySettings();
          audio.play('item');
          save.write();
          toast(t('skinBought'));
          render(root);
        }),
    );
    const kp = $('.k-prem', root);
    if (kp)
      kp.onclick = () => {
        audio.play('click');
        tab = 'coins';
        render(root);
        const pr = $('.prem', root);
        if (pr) pr.scrollIntoView({ block: 'center' });
        else toast(t('premSoon'));
      };
  };
  const root = openModal(`${head(t('storeTitle'))}<div class="sh-b"></div>`, { onClose: () => S.view === 'menu' && renderMenu() });
  render(root);
}

// медали месяца в календаре судоку дня
function monthMedals(ym) {
  const key = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}`;
  const n = monthCount(save.data.daily.done, key);
  return `<div class="mmedals">${MEDALS.map((md) => {
    const goal = medalNeed(md, key);
    const got = n >= goal;
    return `<div class="mm${got ? ' got' : ''}" style="--mc:${md.color}">${IC.medal}<b>${esc(t('medal_' + md.id))}</b><small>${got ? esc(t('medalGot')) : `${n}/${goal}`}</small></div>`;
  }).join('')}</div>`;
}

// ---------- подарок дня ----------
function openGift() {
  const D = save.data;
  const today = dateKey();
  const taken = D.gift === today;
  const base = GIFT_COINS * (D.premium ? 2 : 1);
  const root = openModal(
    `${head(t('giftTitle'))}<div class="sh-b"><div class="giftbox">${IC.gift.replace('class="ic"', 'class="ic big"')}
      ${taken ? `<p>${esc(t('giftTaken'))}</p>` : `<div class="gamt">${IC.coin}${base}</div><p class="muted">${esc(t(D.premium ? 'giftDescPrem' : 'giftDesc'))}</p>`}</div></div>
    ${taken ? '' : `<div class="sh-f"><button class="btn b-gold g-x3">${IC.video}<span>${esc(t('giftTriple', { n: base * 3 }))}</span></button><button class="btn b-glass g-take">${esc(t('giftTake', { n: base }))}</button></div>`}`,
    { onClose: () => S.view === 'menu' && renderMenu() },
  );
  if (taken) return;
  const give = (n) => {
    if (D.gift === today) return;
    D.gift = today;
    addCoins(n);
    if (D.premium) D.freeHints++;
    save.write();
    toast(t('got', { n }) + (D.premium ? ' · ' + t('giftHint') : ''));
    closeModal();
  };
  $('.g-take', root).onclick = () => give(base);
  $('.g-x3', root).onclick = (e) => {
    e.currentTarget.disabled = true;
    audio.suspend('ad');
    let got = false;
    sdk.showRewarded(
      () => (got = true),
      () => {
        audio.resume('ad');
        setGameplay();
        if (got) give(base * 3);
        else if (e.currentTarget.isConnected) e.currentTarget.disabled = false;
      },
    );
  };
}

function statsHTML() {
  const D = save.data;
  const R = rankOf(D.score);
  const medalsAll = Object.values(D.daily.medals || {}).reduce((a, b) => a + b, 0);
  let html = `<div class="rankbox"><span class="rk">${IC.crown}</span><div><small>${esc(t('rankTitle'))}</small><b>${esc(t('rank_' + R.id))}</b>${R.next ? `<span class="gprog"><i><b style="width:${R.prog * 100}%"></b></i>${esc(t('rankNext', { n: R.next.score - D.score, r: t('rank_' + R.next.id) }))}</span>` : `<small>${esc(t('rankMax'))}</small>`}</div></div>
  <div class="stsum"><div><b>${D.solved}</b><small>${esc(t('stSolved'))}</small></div><div><b>${D.perfect}</b><small>${esc(t('stPerfect'))}</small></div><div><b>${D.score}</b><small>${esc(t('stPoints'))}</small></div><div><b>${medalsAll}</b><small>${esc(t('stMedals'))}</small></div></div>`;
  for (const kind of KINDS) {
    const rows = tiersOf(kind)
      .map((T, tier) => {
        const k = kind + ':' + tier;
        const s = D.stats[k];
        return `<tr><td><i class="qdot" style="--cc:${T.color}"></i>${esc(t('t_' + T.id))}</td><td>${s ? s.n : 0}</td><td>${s ? fmtTime(D.best[k] || 0) : '—'}</td><td>${s ? fmtTime(s.t / s.n) : '—'}</td></tr>`;
      })
      .join('');
    html += `<div class="sttab"><div class="lb">${esc(t('k_' + kind))}</div><table><tr><th></th><th>${esc(t('stN'))}</th><th>${esc(t('stBest'))}</th><th>${esc(t('stAvg'))}</th></tr>${rows}</table></div>`;
  }
  return html;
}

async function openRecords(tab = 'lb') {
  const root = openModal(`${head(t('records'))}<div class="rtabs seg"><button data-r="lb" class="${tab === 'lb' ? 'on' : ''}">${esc(t('lbTitle'))}</button><button data-r="st" class="${tab === 'st' ? 'on' : ''}">${esc(t('statsTitle'))}</button></div><div class="sh-b"><p class="muted">${esc(t('loading'))}</p></div>`);
  $('.rtabs', root).onclick = (e) => {
    const b = e.target.closest('[data-r]');
    if (!b) return;
    audio.play('click');
    openRecords(b.dataset.r);
  };
  const body = $('.sh-b', root);
  if (tab === 'st') {
    body.innerHTML = statsHTML();
    return;
  }
  const mine = `<p>${esc(t('myScore', { n: save.data.score }))}</p>`;
  if (!sdk.real) {
    body.innerHTML = `${mine}<p class="muted">${esc(t('lbLocal'))}</p>`;
    return;
  }
  const res = await sdk.getLeaderboard();
  if (!root.isConnected) return;
  let html = mine;
  if (res.available && res.entries.length)
    html += `<div class="lb">${res.entries.map((e) => `<div class="lbr${e.me ? ' me' : ''}${e.rank <= 3 ? ' top' : ''}"><span class="rk">${e.rank}</span><span class="nm">${esc(e.me ? t('you') : e.name || t('player'))}</span><span class="sc">${e.score}</span></div>`).join('')}</div>`;
  else html += `<p class="muted">${esc(t('lbEmpty'))}</p>`;
  if (!sdk.isAuthorized()) html += `<p class="muted">${esc(t('lbLogin'))}</p><button class="btn b-gold lb-login">${esc(t('loginBtn'))}</button>`;
  body.innerHTML = html;
  const lg = $('.lb-login', body);
  if (lg)
    lg.onclick = async () => {
      if (await sdk.login()) {
        await sdk.submitScore(save.data.score);
        closeModal(true);
        openRecords();
      }
    };
}

function openAchievements() {
  const D = save.data;
  D.gardenCount = gardenCount();
  const render = (root) => {
    const list = achState(D);
    const done = list.filter((a) => a.claimed).length;
    $('.sh-b', root).innerHTML =
      `<p class="muted">${esc(t('rankTitle'))}: <b>${esc(t('rank_' + rankOf(D.score).id))}</b> · ${esc(t('achProg', { a: done, b: list.length }))}</p>` +
      list
        .map(
          (a) => `<div class="arow${a.claimed ? ' got' : ''}"><div class="aic">${IC[a.icon]}</div><div class="atx"><b>${esc(t('a_' + a.id))}</b><small>${esc(t('ad_' + a.id, { n: a.goal }))}</small>${a.goal > 1 && !a.done ? `<span class="gprog"><i><b style="width:${(a.have / a.goal) * 100}%"></b></i>${a.have}/${a.goal}</span>` : ''}</div>
          ${a.claimed ? `<span class="aok">${IC.checkc}</span>` : a.done ? `<button class="btn b-gold a-claim" data-a="${a.id}">+${a.coins}${IC.coin}</button>` : `<span class="arew">${IC.coin}${a.coins}</span>`}</div>`,
        )
        .join('');
    root.querySelectorAll('.a-claim').forEach(
      (b) =>
        (b.onclick = () => {
          const a = list.find((x) => x.id === b.dataset.a);
          D.ach[a.id] = 1;
          addCoins(a.coins);
          save.write();
          toast(t('got', { n: a.coins }));
          render(root);
        }),
    );
  };
  const root = openModal(`${head(t('achievements'))}<div class="sh-b"></div>`, { onClose: () => S.view === 'menu' && renderMenu() });
  render(root);
}

// ---------- запуск ----------
export function initApp() {
  scene = new Scene();
  applySettings();
  initVolume(save.data.settings);
  sdk.noAds = !!save.data.noAds;
  buildViews();
  board = new Board({
    onBack: backFromGame,
    onComplete,
    onChange: persist,
    toast,
    settings: openSettings,
    store: openStore,
    opt: (k) => save.data.settings[k],
    hintCost,
    payHint,
    blocked: () => !!S.modal || sdk.adActive,
    burst: (x, y, n, sp) => scene.burst(x, y, n, sp),
    onEvent: (name, data) => {
      if (name === 'pause') setGameplay();
      if (tut) tut.event(name, data);
    },
  });
  applySettings(); // стиль поля ставится на уже созданную доску
  tut = new Tutorial({
    board,
    done: () => {
      save.data.tutDone = true;
      save.write();
    },
    play: (n) => audio.play(n),
  });
  iap.onChange(() => updateCoins());
  renderMenu();
  show('menu');
  updateCoins();

  const lay = () => {
    document.body.classList.toggle('wide', innerWidth >= 820 && innerWidth / innerHeight > 1.15);
    if (tut) tut.place();
  };
  lay();
  window.addEventListener('resize', lay);

  const unlock = () => {
    audio.unlock();
    audio.startMusic();
  };
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      audio.suspend('hidden');
      persist();
    } else audio.resume('hidden');
    setGameplay();
  });
  window.addEventListener('blur', () => audio.suspend('blur'));
  window.addEventListener('focus', () => audio.resume('blur'));
  sdk.on('pause', () => {
    audio.suspend('sdk');
    sdk.gameplay(false);
  });
  sdk.on('resume', () => {
    audio.resume('sdk');
    setGameplay();
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener(
    'touchmove',
    (e) => {
      if (!e.target.closest('.scroll,.sh-b,#menu,.sheet.win')) e.preventDefault();
    },
    { passive: false },
  );

  window.__app = { S, save, board, updateCoins, applySettings, openGift, scene, tut, openGame, renderMenu, renderPath, renderLevels, renderQuick, renderGarden, show, closeModal, gameSpec, dateKey, P, PLAN, logoSVG, iconSVG, sceneSVG, openDaily, openAchievements, openRecords, openStore, openSettings, gardenCount, LANG };
}
