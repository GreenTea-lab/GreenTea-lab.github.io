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
import { generate, hashStr } from './gen.js';
import { confetti } from './fx.js';
import RU from './data/ru.json';
import EN from './data/en.json';

const DATA = { ru: RU, en: EN };
const PER_CH = 15;
const CH_COLORS = ['#4f9a5e', '#d08a2e', '#c8566e', '#2f7fb0', '#b4602e', '#5f93c4', '#7d5fb2', '#1f6e5b'];
const CH_ICONS = ['sprout', 'lamp', 'flower', 'wave', 'leaf', 'snow', 'books', 'quill'];
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
  mode: null, // 'level' | 'daily'
  lvl: 0,
  pz: null,
  lastAd: Date.now(),
  tut: 0,
  saveTimer: null,
};

const prog = () => save.data.p[LANG];
const levels = () => DATA[LANG].levels;
let game;

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
  sdk.gameplay(S.view === 'game' && !S.modal && !document.hidden && !sdk.adActive);
}

function applySettings() {
  const st = save.data.settings;
  document.documentElement.dataset.theme = st.theme;
  document.documentElement.dataset.text = String(st.text);
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
  if (closable) root.addEventListener('pointerdown', (e) => e.target === root && close());
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
      <div class="mbtns">
        <button class="btn b-main m-play">${IC.play}<span>${esc(contLabel)}${allDone ? '' : `<small>${esc(t('levelN', { n: p.cur + 1 }))}</small>`}</span></button>
        <button class="btn b-plain btn-daily m-daily">${IC.calendar}<span class="dl">${esc(t('daily'))}<small class="${d.done ? 'done' : ''}">${esc(d.done ? t('dailyDone') : t('dailyReward', { n: DAILY_COINS }))}</small></span>${d.done ? `<span class="tick">${IC.checkc}</span>` : ''}</button>
        <button class="btn b-plain m-levels">${IC.grid}<span>${esc(t('levels'))}</span></button>
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
    renderLevels();
    show('levels');
  });
  on('.m-lb', openLeaderboard);
  on('.m-store', openStore);
  on('.m-coins', openStore);
  on('.m-set', openSettings);
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
    if (i > prog().cur) {
      audio.play('wrong');
      return toast(t('locked'));
    }
    audio.play('click');
    openLevel(i);
  });
}

function renderLevels() {
  const el = $('#levels');
  const p = prog();
  const L = levels();
  const chs = Math.ceil(L.length / PER_CH);
  let html = '';
  for (let c = 0; c < chs; c++) {
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
    html += `<section class="chap" style="--cc:${CH_COLORS[c % CH_COLORS.length]}"><div class="chh"><div class="cic">${IC[CH_ICONS[c % CH_ICONS.length]]}</div><div><b>${esc(t('ch' + c))}</b><small>${esc(t('chapterN', { n: c + 1 }))} · ${esc(t('solvedOf', { a: solved, b: to - from }))}</small></div></div><div class="tiles">${tiles}</div></section>`;
  }
  $('.chs', el).innerHTML = html;
  updateCoins();
  requestAnimationFrame(() => {
    const cur = $('.tile.cur', el);
    if (cur) cur.scrollIntoView({ block: 'center' });
  });
}

// ---------- кроссворд ----------
function openLevel(i) {
  $('#toast').innerHTML = '';
  const L = levels()[i];
  if (!L) return;
  const pz = new Puzzle(L);
  const p = prog();
  if (p.ip && p.ip.lvl === i) pz.restore(p.ip);
  S.mode = 'level';
  S.lvl = i;
  S.pz = pz;
  game.open(pz, t('levelN', { n: i + 1 }));
  updateCoins();
  show('game');
  startTutorial();
}

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dailyState() {
  const d = save.data.daily;
  const key = dateKey();
  if (d.date !== key || d.lang !== LANG || !d.puz) return { done: false, fresh: true };
  return { done: d.done, fresh: false };
}

function makeDaily(key) {
  const bank = DATA[LANG].bank.map(([word, clue, tier]) => ({ word, clue: clue.split('|')[0], tier }));
  const seed = hashStr(key + ':' + LANG);
  let r = seed;
  const rnd = () => ((r = (r * 1664525 + 1013904223) >>> 0) / 4294967296);
  const mix = [0.35, 0.45, 0.2];
  const pool = [];
  for (let k = 0; k < 3; k++) {
    const list = bank.filter((w) => w.tier === k + 1 && w.word.length <= 10).sort(() => rnd() - 0.5);
    pool.push(...list.slice(0, Math.round(50 * mix[k])));
  }
  const res = generate(pool, { target: 10, maxW: 10, maxH: 10, tries: 40, seed }) || generate(pool, { target: 8, maxW: 10, maxH: 10, tries: 40, seed: seed + 1 });
  return { w: res.w, h: res.h, e: res.entries.map((e) => [e.x, e.y, e.dir, e.word, e.clue]) };
}

function openDaily() {
  const d = save.data.daily;
  const key = dateKey();
  if (d.date !== key || d.lang !== LANG || !d.puz) {
    d.date = key;
    d.lang = LANG;
    d.puz = makeDaily(key);
    d.ip = null;
    d.done = false;
    save.write();
  }
  const pz = new Puzzle(d.puz);
  if (d.ip) pz.restore(d.ip);
  if (d.done) {
    // уже решён — показываем решённым
    pz.cells.forEach((c, i) => c && (pz.letters[i] = c.ch));
    pz.refresh();
  }
  S.mode = 'daily';
  S.pz = pz;
  game.open(pz, t('daily'));
  updateCoins();
  show('game');
}

function persistProgress(pz) {
  if (pz.complete()) return;
  const ip = pz.serialize();
  if (S.mode === 'level') prog().ip = { lvl: S.lvl, ...ip };
  else save.data.daily.ip = ip;
  clearTimeout(S.saveTimer);
  S.saveTimer = setTimeout(() => save.write(), 600);
}

function onComplete(pz) {
  const stars = pz.stars();
  const n = pz.entries.length;
  let coins, points;
  let streak = 0;
  save.data.solvedWords += n;
  if (S.mode === 'level') {
    const p = prog();
    const first = !p.stars[S.lvl];
    coins = first ? 8 + n + (stars === 3 ? 10 : stars === 2 ? 4 : 0) : 5;
    points = first ? n * 10 + stars * 15 : 0;
    p.stars[S.lvl] = Math.max(p.stars[S.lvl] || 0, stars);
    if (p.ip && p.ip.lvl === S.lvl) p.ip = null;
    while (p.stars[p.cur]) p.cur++;
    if (S.lvl === 0) save.data.tutDone = true;
  } else {
    const d = save.data.daily;
    const first = !d.done;
    coins = first ? DAILY_COINS + (stars === 3 ? 10 : 0) : 0;
    points = first ? 150 + stars * 15 : 0;
    if (first) {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      d.streak = d.last === dateKey(y) ? d.streak + 1 : 1;
      d.last = d.date;
    }
    d.done = true;
    d.ip = null;
    streak = d.streak;
  }
  save.data.coins += coins;
  save.data.score += points;
  save.write();
  if (points) sdk.submitScore(save.data.score);
  updateCoins();
  setTimeout(() => {
    audio.play('win');
    confetti();
    showWin({ stars, coins, points, streak, hints: pz.hints });
  }, 700);
}

function showWin({ stars, coins, points, streak, hints }) {
  $('#toast').innerHTML = '';
  removeTip();
  const daily = S.mode === 'daily';
  const hasNext = !daily && S.lvl + 1 < levels().length;
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
      ${coins ? `<button class="btn b-gold w-x2">${IC.video}<span>${esc(t('double'))}</span></button>` : ''}
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
      afterLevel(() => openLevel(S.lvl + 1));
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
  const solved = Object.keys(prog().stars).length;
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
      <div class="sect"><div class="toggle ${st.autoCheck ? 'on' : ''}" data-t="autoCheck"><div class="tx"><b>${esc(t('autoCheck'))}</b><small>${esc(t('autoCheckDesc'))}</small></div><div class="sw"></div></div></div>
      <div class="sect"><div class="lb">${esc(t('volume'))}</div>${slidersHTML(st, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound })}</div>
      <div class="sect"><div class="lb">${esc(t('howTo'))}</div><p class="howto">${esc(t('howToText'))}</p></div>
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
        save.write(false);
        if (game.visible) game.render();
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
    <div class="sh-f"><button class="btn b-gold ne-ad">${IC.video}<span>${esc(t('watchAd', { n: AD_COINS }))}</span></button>
    ${iap.available() ? `<button class="btn b-plain ne-buy">${IC.coin}<span>${esc(t('buyCoins'))}</span></button>` : ''}</div>`,
  );
  $('.ne-ad', root).onclick = (e) => rewardedCoins(e.currentTarget, () => closeModal());
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
          if (ok) toast(t('bought'), 'good');
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
    html += `<div class="lb">${res.entries
      .map((e) => `<div class="lbr${e.me ? ' me' : ''}${e.rank <= 3 ? ' top' : ''}"><span class="rk">${e.rank}</span><span class="nm">${esc(e.me ? t('you') : e.name || t('player'))}</span><span class="sc">${e.score}</span></div>`)
      .join('')}</div>`;
  else html += `<p class="muted">${esc(t('lbEmpty'))}</p>`;
  if (!sdk.isAuthorized()) html += `<p class="muted">${esc(t('lbLogin'))}</p><button class="btn b-main lb-login">${esc(t('loginBtn'))}</button>`;
  body.innerHTML = html;
  const lg = $('.lb-login', body);
  if (lg)
    lg.onclick = async () => {
      const ok = await sdk.login();
      if (ok) {
        await sdk.submitScore(save.data.score);
        closeModal(true);
        openLeaderboard();
      }
    };
}

// ---------- запуск ----------
export function initApp() {
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
    blocked: () => !!S.modal || sdk.adActive,
    onSelect: () => {
      if (S.tut === 1) {
        S.tut = 2;
        showTip(t('tut2'), false, 'tools');
      }
    },
    onWord: () => {
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
  // запрет контекстного меню и выделения
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => {
    if (!e.target.closest('.scroll,.sh-b,#menu,.cl ol')) e.preventDefault();
  }, { passive: false });

  // отладка и тесты
  window.__app = { S, save, game, openLevel, openDaily, renderMenu, show, levels, dateKey, closeModal };
}
