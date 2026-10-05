// Приложение: меню, сады (кампания), свободная игра, судоку дня, «Мой сад», окна, награды, реклама
import { sdk } from './sdk.js';
import { save, DIFFS } from './save.js';
import { t, fmtTime } from './i18n.js';
import { audio } from './audio.js';
import { iap, priceHTML } from './iap.js';
import { initVolume, slidersHTML, bindSliders, volumeCss } from './volume.js';
import { IC, CH, logoSVG, coinsArt, NOADS_ART, AD_ART } from './icons.js';
import { Board, HINT_COST } from './board.js';
import { Scene } from './scene.js';
import { ITEMS, sceneSVG, iconSVG, unlockedCount, need } from './garden.js';
import P from './data/puzzles.json';

const PER_CH = 30;
const AD_COINS = 40;
const DAILY_COINS = 50;
const AD_GAP = 150000;
const COINS = { easy: 12, medium: 18, hard: 28, expert: 45 };
const FREE_COINS = { easy: 6, medium: 9, hard: 14, expert: 22 };
const POINTS = { easy: 100, medium: 200, hard: 350, expert: 600 };

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

const S = { view: 'menu', modal: null, cur: null, lastAd: Date.now(), tut: 0, saveTimer: null };
let board, scene;

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
  toast._t = setTimeout(() => el.remove(), 2600);
}

function setGameplay() {
  sdk.gameplay(S.view === 'game' && !S.modal && !document.hidden && !sdk.adActive && !(board && board.done));
}

function applySettings() {
  const st = save.data.settings;
  document.documentElement.dataset.theme = st.theme;
  document.documentElement.dataset.text = String(st.text);
  if (scene) {
    scene.setTheme(st.theme);
    scene.setPetals(st.petals);
  }
  if (board) requestAnimationFrame(() => board.layout());
}

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
  audio.setMood(view === 'game' ? 'game' : 'menu');
  setGameplay();
}

const chTitle = (d) => t('ch_' + d);
const dayNum = (d = new Date()) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 86400000);
const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ---------- описание игры по ключу ----------
// ключ: "lvl:<d>:<i>" | "free:<d>:<i>" | "daily:<date>"
function gameSpec(key) {
  const [mode, a, b] = key.split(':');
  if (mode === 'daily') {
    const n = dayNum(new Date(a + 'T12:00:00'));
    const idx = ((n % P.daily.length) + P.daily.length) % P.daily.length;
    return { key, mode, d: idx % 2 ? 'hard' : 'medium', puzzle: P.daily[idx], title: t('daily') };
  }
  const i = +b;
  if (mode === 'lvl') return { key, mode, d: a, i, puzzle: P[a][i], title: t('levelN', { ch: chTitle(a), n: i + 1 }) };
  const pool = P[a].slice(PER_CH);
  return { key, mode, d: a, i, puzzle: pool[i % pool.length], title: t('freeTitle', { d: t('d_' + a) }) };
}

function openGame(key) {
  $('#toast').innerHTML = '';
  const sp = gameSpec(key);
  S.cur = sp;
  board.open({ puzzle: sp.puzzle, title: sp.title, diffLabel: t('d_' + sp.d), color: CH[sp.d].color, restore: save.data.ip[key] });
  save.data.last = key;
  updateCoins();
  show('game');
  startTutorial();
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

// ---------- меню ----------
function continueKey() {
  const ip = save.data.ip;
  if (save.data.last && ip[save.data.last]) return save.data.last;
  for (const d of DIFFS) if (save.data.ch[d].cur < PER_CH) return `lvl:${d}:${save.data.ch[d].cur}`;
  return `free:expert:${save.data.ch.expert.free}`;
}

function renderMenu() {
  const el = $('#menu');
  const key = continueKey();
  const sp = gameSpec(key);
  const fresh = !Object.keys(save.data.ip).length && save.data.solved === 0;
  const dk = dateKey();
  const dd = save.data.daily.date === dk && save.data.daily.done;
  const got = unlockedCount(save.data.solved);
  el.innerHTML = `
    <header class="bar">
      <button class="chip m-coins">${IC.coin}<span class="cv">${save.data.coins}</span></button>
      <button class="ibtn m-set" aria-label="settings">${IC.gear}</button>
    </header>
    <div class="mwrap">
      ${logoSVG()}
      <div class="mt">${esc(t('title1'))}<span>${esc(t('title2'))}</span></div>
      <div class="msub">${esc(t('subtitle'))}</div>
      <div class="mbtns">
        <button class="btn b-gold m-play">${IC.play}<span>${esc(fresh ? t('start') : t('continue'))}<small>${esc(sp.title)}</small></span></button>
        <button class="btn b-glass btn-left m-daily">${IC.calendar}<span class="dl">${esc(t('daily'))}<small>${esc(dd ? t('dailyDone') : t('dailyReward', { n: DAILY_COINS }))}</small></span>${dd ? `<span class="tick">${IC.checkc}</span>` : ''}</button>
        <button class="btn b-glass btn-left m-gardens">${IC.grid}<span class="dl">${esc(t('gardens'))}<small>${esc(DIFFS.map((d) => t('d_' + d)).join(' · '))}</small></span></button>
        <button class="btn b-glass btn-left m-garden">${IC.tree}<span class="dl">${esc(t('myGarden'))}<span class="gprog"><i><b style="width:${(got / ITEMS.length) * 100}%"></b></i>${esc(t('gardenProg', { a: got, b: ITEMS.length }))}</span></span></button>
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
  on('.m-daily', () => openGame('daily:' + dk));
  on('.m-gardens', () => (renderGardens(), show('gardens')));
  on('.m-garden', () => (renderGarden(), show('garden')));
  on('.m-lb', openLeaderboard);
  on('.m-store', openStore);
  on('.m-coins', openStore);
  on('.m-set', openSettings);
}

// ---------- сады (уровни) ----------
function buildViews() {
  const app = document.getElementById('app');
  const menu = document.createElement('div');
  menu.id = 'menu';
  menu.className = 'view';
  app.appendChild(menu);
  const gs = document.createElement('div');
  gs.id = 'gardens';
  gs.className = 'view hidden';
  gs.innerHTML = `<header class="bar"><button class="backbtn x-back">${IC.back}<span>${esc(t('back'))}</span></button><div class="ttl">${esc(t('gardens'))}</div><button class="chip x-coins">${IC.coin}<span class="cv">0</span></button></header><div class="scroll"><div class="chs"></div></div>`;
  app.appendChild(gs);
  const gd = document.createElement('div');
  gd.id = 'garden';
  gd.className = 'view hidden';
  gd.innerHTML = `<header class="bar"><button class="backbtn x-back">${IC.back}<span>${esc(t('back'))}</span></button><div class="ttl">${esc(t('myGarden'))}</div><button class="chip x-coins">${IC.coin}<span class="cv">0</span></button></header><div class="gwrap"></div>`;
  app.appendChild(gd);
  for (const v of [gs, gd]) {
    $('.x-back', v).onclick = () => {
      audio.play('click');
      renderMenu();
      show('menu');
    };
    $('.x-coins', v).onclick = () => {
      audio.play('click');
      openStore();
    };
  }
  $('.chs', gs).addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    audio.unlock();
    const [mode, d, i] = b.dataset.k.split(':');
    if (mode === 'lvl' && +i > save.data.ch[d].cur) {
      audio.play('wrong');
      return toast(t('locked'));
    }
    audio.play('click');
    openGame(b.dataset.k);
  });
}

function renderGardens() {
  let html = '';
  for (const d of DIFFS) {
    const c = save.data.ch[d];
    let solved = 0,
      tiles = '';
    for (let i = 0; i < PER_CH; i++) {
      const st = c.stars[i] || 0;
      if (st) solved++;
      const lock = i > c.cur,
        cur = i === c.cur;
      const stars = st ? `<span class="st">${[1, 2, 3].map((k) => `<span style="color:${k <= st ? 'var(--gold)' : 'var(--glass)'}">${IC.star}</span>`).join('')}</span>` : '';
      tiles += `<button class="tile${st ? ' done' : ''}${cur ? ' cur' : ''}${lock ? ' lock' : ''}" data-k="lvl:${d}:${i}">${lock ? IC.lock : `<span>${i + 1}</span>${stars}`}${save.data.ip['lvl:' + d + ':' + i] && !st ? '<i class="ip"></i>' : ''}</button>`;
    }
    const best = save.data.best[d];
    html += `<section class="chap" style="--cc:${CH[d].color}"><div class="chh"><div class="cic">${IC[CH[d].icon]}</div><div><b>${esc(chTitle(d))}</b><small>${esc(t('d_' + d))} · ${esc(t('solvedOf', { a: solved, b: PER_CH }))}${best ? ' · ' + esc(t('best', { t: fmtTime(best) })) : ''}</small></div></div><div class="tiles">${tiles}</div>
      <button class="btn b-glass freebtn" data-k="free:${d}:${c.free}">${IC.infinity}<span>${esc(t('free'))}<small>${esc(t('freeSub'))}</small></span></button></section>`;
  }
  $('#gardens .chs').innerHTML = html;
  updateCoins();
  requestAnimationFrame(() => {
    const cur = $('#gardens .tile.cur');
    if (cur) cur.scrollIntoView({ block: 'center' });
  });
}

// ---------- мой сад ----------
function renderGarden() {
  const n = unlockedCount(save.data.solved);
  const fresh = save.data.seenItems < n ? n - 1 : -1;
  save.data.seenItems = n;
  const left = n < ITEMS.length ? need(n) - save.data.solved : 0;
  $('#garden .gwrap').innerHTML = `
    <div class="gscene">${sceneSVG(n, fresh)}</div>
    <div class="gnext">${esc(n < ITEMS.length ? t('nextItem', { n: left }) : t('allItems'))}</div>
    <div class="glist">${ITEMS.map((it, k) => `<div class="gi${k < n ? '' : ' lock'}">${iconSVG(it.id)}<span>${esc(k < n ? t('it_' + it.id) : '?')}</span></div>`).join('')}</div>`;
  updateCoins();
  if (fresh >= 0) {
    audio.play('item');
    save.write(false);
  }
}

// ---------- награды ----------
function onComplete({ time, hints, mistakes }) {
  const sp = S.cur;
  const pen = mistakes + hints * 2;
  const stars = pen === 0 ? 3 : pen <= 3 ? 2 : 1;
  let coins = 0,
    points = 0,
    streak = 0;
  const D = save.data;
  if (sp.mode === 'lvl') {
    const c = D.ch[sp.d];
    const first = !c.stars[sp.i];
    coins = first ? COINS[sp.d] + (stars === 3 ? 10 : 0) : 5;
    points = first ? Math.round(POINTS[sp.d] * (stars === 3 ? 1.2 : 1)) : 0;
    c.stars[sp.i] = Math.max(c.stars[sp.i] || 0, stars);
    while (c.stars[c.cur]) c.cur++;
  } else if (sp.mode === 'free') {
    coins = FREE_COINS[sp.d] + (stars === 3 ? 5 : 0);
    points = Math.round(POINTS[sp.d] * (stars === 3 ? 1.2 : 1));
    D.ch[sp.d].free = sp.i + 1;
  } else {
    const first = !(D.daily.date === sp.key.slice(6) && D.daily.done);
    if (first) {
      coins = DAILY_COINS + (stars === 3 ? 10 : 0);
      points = 300 + (stars === 3 ? 60 : 0);
      const y = new Date();
      y.setDate(y.getDate() - 1);
      D.daily.streak = D.daily.last === dateKey(y) ? D.daily.streak + 1 : 1;
      D.daily.last = sp.key.slice(6);
      D.daily.date = sp.key.slice(6);
      D.daily.done = true;
    }
    streak = D.daily.streak;
  }
  const record = !D.best[sp.d] || time < D.best[sp.d];
  if (record) D.best[sp.d] = Math.floor(time);
  const before = unlockedCount(D.solved);
  D.solved++;
  const after = unlockedCount(D.solved);
  delete D.ip[sp.key];
  if (D.last === sp.key) D.last = '';
  if (sp.mode === 'lvl' && sp.d === 'easy' && sp.i === 0) D.tutDone = true;
  D.coins += coins;
  D.score += points;
  save.write();
  if (points) sdk.submitScore(D.score);
  updateCoins();
  removeTip();
  setGameplay();
  setTimeout(() => {
    audio.play('win');
    showWin({ stars, coins, points, streak, time, hints, mistakes, record, item: after > before ? ITEMS[after - 1] : null });
  }, 1300);
}

function nextKey() {
  const sp = S.cur;
  if (sp.mode === 'lvl') return sp.i + 1 < PER_CH ? `lvl:${sp.d}:${sp.i + 1}` : `free:${sp.d}:${save.data.ch[sp.d].free}`;
  if (sp.mode === 'free') return `free:${sp.d}:${save.data.ch[sp.d].free}`;
  return null;
}

function showWin({ stars, coins, points, streak, time, hints, mistakes, record, item }) {
  $('#toast').innerHTML = '';
  const nk = nextKey();
  const title = stars === 3 ? t('winGreat') : stars === 2 ? t('winGood') : t('winOk');
  const root = openModal(
    `<div class="sh-b">
      <h2>${esc(title)}</h2>
      <div class="wsub">${esc(t('winSub', { t: fmtTime(time), m: mistakes, h: hints }))}</div>
      <div class="stars">${[1, 2, 3].map((k) => IC.star.replace('class="ic"', `class="ic${k <= stars ? ' on' : ''}" style="animation-delay:${0.15 + k * 0.18}s"`)).join('')}</div>
      <div class="rew">
        ${coins ? `<div>${IC.coin}<span>+<b class="w-cn">${coins}</b></span></div>` : ''}
        ${points ? `<div>${IC.trophy}<span>+${points}</span></div>` : ''}
      </div>
      ${record ? `<div class="wsub"><b>${esc(t('newRecord'))}</b></div>` : ''}
      ${S.cur.mode === 'daily' && streak ? `<div class="wsub">${esc(t('streak', { n: streak }))}</div>` : ''}
      ${item ? `<div class="newitem">${iconSVG(item.id)}<div><small>${esc(t('newItem'))}</small><b>${esc(t('it_' + item.id))}</b></div></div>` : ''}
    </div>
    <div class="sh-f">
      ${coins ? `<button class="btn b-gold w-x2">${IC.video}<span>${esc(t('double'))}</span></button>` : ''}
      ${nk ? `<button class="btn b-gold w-next">${esc(t('next'))}${IC.next}</button>` : ''}
      ${item ? `<button class="btn b-glass w-garden">${IC.tree}<span>${esc(t('seeGarden'))}</span></button>` : ''}
      <button class="btn b-glass w-list">${esc(S.cur.mode === 'daily' ? t('menu') : t('toList'))}</button>
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
    if (S.cur.mode === 'daily') {
      renderMenu();
      show('menu');
    } else {
      renderGardens();
      show('gardens');
    }
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
  removeTip();
  persist();
  save.write();
  if (S.cur && S.cur.mode !== 'daily') {
    renderGardens();
    show('gardens');
  } else {
    renderMenu();
    show('menu');
  }
}

// ---------- обучение ----------
function startTutorial() {
  removeTip();
  S.tut = 0;
  if (save.data.tutDone || S.cur.key !== 'lvl:easy:0') return;
  S.tut = 1;
  showTip(t('tut1'), false);
}

function showTip(text, ok, at = 'tools') {
  removeTip();
  const d = document.createElement('div');
  d.className = 'tipbox';
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
    // поверх кнопок (шаги 1–2) или поверх цифр (шаг 3), чтобы не закрывать доску
    const tools = $('#game .tools').getBoundingClientRect();
    const pad = $('#game .pad').getBoundingClientRect();
    d.style.left = tools.left + tools.width / 2 + 'px';
    d.style.maxWidth = Math.max(tools.width, 280) + 'px';
    d.style.top = (at === 'pad' ? pad.top : tools.top - 2) + 'px';
  };
  place();
  d._place = place;
}

function removeTip() {
  document.querySelectorAll('.tipbox').forEach((e) => e.remove());
}

// ---------- окна ----------
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
  const tog = (k, title, desc) => `<div class="sect"><div class="toggle ${st[k] ? 'on' : ''}" data-t="${k}"><div class="tx"><b>${esc(t(title))}</b><small>${esc(t(desc))}</small></div><div class="sw"></div></div></div>`;
  const root = openModal(
    `${head(t('settings'))}<div class="sh-b">
      <div class="sect"><div class="lb">${esc(t('textSize'))}</div>${seg('text', [[0, t('textS')], [1, t('textM')], [2, t('textL')]])}</div>
      <div class="sect"><div class="lb">${esc(t('theme'))}</div>${seg('theme', [['night', t('themeNight')], ['dawn', t('themeDawn')], ['contrast', t('themeContrast')]])}</div>
      ${tog('autoCheck', 'autoCheck', 'autoCheckDesc')}
      ${tog('timer', 'showTimer', 'showTimerDesc')}
      ${tog('petals', 'petals', 'petalsDesc')}
      <div class="sect"><div class="lb">${esc(t('volume'))}</div>${slidersHTML(st, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}</div>
      <div class="sect"><div class="lb">${esc(t('howTo'))}</div><p class="howto">${esc(t('howToText'))}</p></div>
    </div>`,
    {
      onClose: () => {
        save.write();
        if (board.visible) board.render();
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
        if (board.visible) board.render();
      }),
  );
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

function notEnough(cost) {
  const root = openModal(
    `${head(t('notEnough'))}<div class="sh-b"><p>${esc(t('notEnoughDesc', { n: cost }))}</p></div>
    <div class="sh-f"><button class="btn b-gold ne-ad">${IC.video}<span>${esc(t('watchAd', { n: AD_COINS }))}</span></button>
    ${iap.available() ? `<button class="btn b-glass ne-buy">${IC.coin}<span>${esc(t('buyCoins'))}</span></button>` : ''}</div>`,
  );
  $('.ne-ad', root).onclick = (e) => rewardedCoins(e.currentTarget, () => closeModal());
  const b = $('.ne-buy', root);
  if (b) b.onclick = () => openStore();
}

function openStore() {
  const render = (root) => {
    const rows = iap
      .items()
      .map((x) => {
        const art = x.p.imageURI ? `<img src="${esc(x.p.imageURI)}" alt="">` : IAP_ART[x.id] || '';
        const btn = x.owned ? `<button class="btn b-glass" disabled>${esc(t('iapOwned'))}</button>` : `<button class="btn b-gold s-buy" data-id="${esc(x.id)}">${priceHTML(x.p)}</button>`;
        return `<div class="srow"><div class="sic">${art}</div><div class="stx"><b>${esc(x.p.title)}</b><small>${esc(x.p.description)}</small></div>${btn}</div>`;
      })
      .join('');
    $('.sh-b', root).innerHTML = `
      <div class="srow col"><div class="sic">${AD_ART}</div><div class="stx"><b>${esc(t('freeCoins'))}</b><small>${esc(t('freeCoinsDesc', { n: AD_COINS }))}</small></div><button class="btn b-gold s-ad">${IC.video}<span>${esc(t('watch'))}</span></button></div>
      ${rows || (sdk.real ? `<p class="muted">${esc(t('iapEmpty'))}</p>` : '')}
      ${save.data.noAds ? `<p class="muted">${esc(t('noAdsOn'))}</p>` : ''}`;
    $('.s-ad', root).onclick = (e) => rewardedCoins(e.currentTarget);
    root.querySelectorAll('.s-buy').forEach(
      (b) =>
        (b.onclick = async () => {
          audio.play('click');
          root.querySelectorAll('.s-buy').forEach((x) => (x.disabled = true));
          const ok = await iap.buy(b.dataset.id);
          if (ok) toast(t('bought'));
          if (root.isConnected) render(root);
        }),
    );
  };
  const root = openModal(`${head(t('storeTitle'))}<div class="sh-b"></div>`, { onClose: () => S.view === 'menu' && renderMenu() });
  render(root);
}

async function openLeaderboard() {
  const root = openModal(`${head(t('lbTitle'))}<div class="sh-b"><p class="muted">${esc(t('loading'))}</p></div>`);
  const body = $('.sh-b', root);
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
        openLeaderboard();
      }
    };
}

// ---------- запуск ----------
export function initApp() {
  scene = new Scene();
  applySettings();
  initVolume(save.data.settings);
  sdk.noAds = !!save.data.noAds;
  buildViews();
  board = new Board({
    coins: () => save.data.coins,
    spend: (n) => {
      save.data.coins -= n;
      updateCoins();
      save.write();
    },
    onBack: backFromGame,
    onComplete,
    onChange: persist,
    notEnough,
    toast,
    settings: openSettings,
    store: openStore,
    autoCheck: () => save.data.settings.autoCheck,
    showTimer: () => save.data.settings.timer,
    blocked: () => !!S.modal || sdk.adActive,
    burst: (x, y, n, sp) => scene.burst(x, y, n, sp),
    onSelect: () => {
      if (S.tut === 1) {
        S.tut = 2;
        showTip(t('tut2'), false);
      }
    },
    onPlace: (ok) => {
      if (ok && S.tut && S.tut < 3) {
        S.tut = 3;
        showTip(t('tut3'), true, 'pad');
      }
    },
  });
  iap.onChange(() => updateCoins());
  renderMenu();
  show('menu');
  updateCoins();

  const lay = () => {
    document.body.classList.toggle('wide', innerWidth >= 820 && innerWidth / innerHeight > 1.15);
    const tip = $('.tipbox');
    if (tip && tip._place) requestAnimationFrame(tip._place);
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
  document.addEventListener('touchmove', (e) => {
    if (!e.target.closest('.scroll,.sh-b,#menu,.gwrap')) e.preventDefault();
  }, { passive: false });

  window.__app = { S, save, board, scene, openGame, renderMenu, renderGardens, renderGarden, show, closeModal, gameSpec, dateKey, P, logoSVG, iconSVG, sceneSVG };
}
