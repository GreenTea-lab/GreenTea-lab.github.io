// Интерфейс в DOM: меню, HUD, окна скинов, улучшений, рекордов, итоги раунда
import { EXPEDITIONS, expeditionOpen } from './expeditions.js';
import { t, fmt, fmtTime, LANG } from './i18n.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { iap, itemHTML } from './iap.js';
import { audio } from './audio.js';
import { SKINS, UPGRADES, XP_LEVEL } from './data.js';
import { MAPS } from './city.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';
import { canEatHole } from './sim.js';
import { pickIcon, PICK_COL } from './render.js';
import { ensureDaily, questsReady, giftReady, giftDay, takeGift, GIFTS } from './daily.js';
import { MODES } from './game.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

// ---------- иконки ----------
const I = {
  coin: '<svg viewBox="0 0 32 32"><circle cx="16" cy="17" r="12" fill="#c8901a"/><circle cx="16" cy="15" r="12" fill="#ffc93c" stroke="#1d2240" stroke-width="2.5"/><circle cx="16" cy="15" r="7.5" fill="none" stroke="#e8a422" stroke-width="2"/><path d="M13 11h6M16 11v8" stroke="#c8801a" stroke-width="2.4" stroke-linecap="round"/><path d="M9 10a8 8 0 0 1 5-4" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/></svg>',
  skin: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="12" ry="7" fill="#1d2240"/><ellipse cx="16" cy="17" rx="12" ry="7" fill="none" stroke="#ff6aa8" stroke-width="3.5" stroke-dasharray="5 4"/><ellipse cx="16" cy="17" rx="7" ry="3.5" fill="#000"/><circle cx="25" cy="8" r="3" fill="#ffc93c" stroke="#1d2240" stroke-width="1.5"/></svg>',
  up: '<svg viewBox="0 0 32 32"><path d="M16 4 27 15h-6v12H11V15H5z" fill="#4cd07a" stroke="#1d2240" stroke-width="2.5" stroke-linejoin="round"/><path d="M13 16v8" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/></svg>',
  cup: '<svg viewBox="0 0 32 32"><path d="M9 5h14v8a7 7 0 0 1-14 0z" fill="#ffc93c" stroke="#1d2240" stroke-width="2.5"/><path d="M9 8H4c0 5 3 7 6 7M23 8h5c0 5-3 7-6 7" fill="none" stroke="#1d2240" stroke-width="2.5"/><path d="M13 21h6v4h-6zM10 27h12" stroke="#1d2240" stroke-width="2.5" fill="#ffc93c"/></svg>',
  sound: '<svg viewBox="0 0 32 32"><path d="M5 12h5l7-6v20l-7-6H5z" fill="#fffaf0" stroke="#1d2240" stroke-width="2.5" stroke-linejoin="round"/><path d="M21 11c2 2 2 8 0 10M24 8c4 4 4 12 0 16" fill="none" stroke="#1d2240" stroke-width="2.5" stroke-linecap="round"/></svg>',
  pause: '<svg viewBox="0 0 32 32"><rect x="8" y="7" width="6" height="18" rx="2" fill="#1d2240"/><rect x="18" y="7" width="6" height="18" rx="2" fill="#1d2240"/></svg>',
  play: '<svg viewBox="0 0 32 32"><path d="M9 6v20l18-10z" fill="#fffaf0" stroke="#1d2240" stroke-width="2.5" stroke-linejoin="round"/></svg>',
  lock: '<svg viewBox="0 0 32 32"><rect x="7" y="14" width="18" height="13" rx="3" fill="#ffc93c" stroke="#1d2240" stroke-width="2.5"/><path d="M11 14v-3a5 5 0 0 1 10 0v3" fill="none" stroke="#1d2240" stroke-width="2.5"/><circle cx="16" cy="20" r="2" fill="#1d2240"/></svg>',
  star: '<svg viewBox="0 0 32 32"><path d="m16 3 4 8.5 9 1.2-6.6 6.3 1.7 9L16 23.6 7.9 28l1.7-9L3 12.7l9-1.2z" fill="#ffc93c" stroke="#1d2240" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  starOff: '<svg viewBox="0 0 32 32"><path d="m16 3 4 8.5 9 1.2-6.6 6.3 1.7 9L16 23.6 7.9 28l1.7-9L3 12.7l9-1.2z" fill="#3a3f5c" stroke="#1d2240" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  crown: '<svg viewBox="0 0 32 32"><path d="M4 11l6 5 6-9 6 9 6-5-3 15H7z" fill="#ffc93c" stroke="#1d2240" stroke-width="2.4" stroke-linejoin="round"/><circle cx="16" cy="19" r="2.2" fill="#ff5a4e"/></svg>',
  ad: '<svg viewBox="0 0 32 32"><rect x="4" y="7" width="24" height="18" rx="4" fill="#fffaf0" stroke="#1d2240" stroke-width="2.5"/><path d="M13 11v10l8-5z" fill="#ff5a4e"/></svg>',
  home: '<svg viewBox="0 0 32 32"><path d="M5 15 16 5l11 10v12H19v-7h-6v7H5z" fill="#fffaf0" stroke="#1d2240" stroke-width="2.5" stroke-linejoin="round"/></svg>',
  again: '<svg viewBox="0 0 32 32"><path d="M25 16a9 9 0 1 1-3-6.7" fill="none" stroke="#fffaf0" stroke-width="3.5" stroke-linecap="round"/><path d="M23 4v6h-6" fill="none" stroke="#fffaf0" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 32 32"><path d="M9 9l14 14M23 9 9 23" stroke="#1d2240" stroke-width="3.5" stroke-linecap="round"/></svg>',
  plus: '<svg viewBox="0 0 32 32"><path d="M16 8v16M8 16h16" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>',
  clock: '<svg viewBox="0 0 32 32"><circle cx="16" cy="17" r="11" fill="#fffaf0" stroke="#1d2240" stroke-width="2.5"/><path d="M16 11v6l4 3" stroke="#1d2240" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M12 4h8" stroke="#1d2240" stroke-width="2.5" stroke-linecap="round"/></svg>',
  task: '<svg viewBox="0 0 32 32"><rect x="6" y="5" width="20" height="24" rx="3" fill="#fffaf0" stroke="#1d2240" stroke-width="2.5"/><rect x="11" y="3" width="10" height="5" rx="2" fill="#ffc93c" stroke="#1d2240" stroke-width="2"/><path d="m10 15 2.5 2.5L17 13M10 23h12" stroke="#3fc777" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M19 17h3" stroke="#1d2240" stroke-width="2.4" stroke-linecap="round"/></svg>',
  gift: '<svg viewBox="0 0 32 32"><rect x="5" y="13" width="22" height="15" rx="2" fill="#ff5a4e" stroke="#1d2240" stroke-width="2.5"/><rect x="3" y="9" width="26" height="6" rx="2" fill="#ff7a6e" stroke="#1d2240" stroke-width="2.5"/><path d="M16 9v19" stroke="#ffc93c" stroke-width="4"/><path d="M16 9c-3-6-9-5-7-1 1 2 5 1 7 1zm0 0c3-6 9-5 7-1-1 2-5 1-7 1z" fill="#ffc93c" stroke="#1d2240" stroke-width="2"/></svg>',
  flag: '<svg viewBox="0 0 32 32"><path d="M8 4v25" stroke="#1d2240" stroke-width="3" stroke-linecap="round"/><path d="M9 6h16l-4 5 4 5H9z" fill="#3fc777" stroke="#1d2240" stroke-width="2.5" stroke-linejoin="round"/></svg>',
  hole: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="13" ry="8" fill="#fffaf0" stroke="#1d2240" stroke-width="2.2"/><ellipse cx="16" cy="18" rx="10" ry="5.5" fill="#1d2240"/></svg>',
};
// карты: маленькие картинки-превью
const MAP_ART = {
  beach: '<svg viewBox="0 0 120 70"><rect width="120" height="70" fill="#aee4ff"/><circle cx="100" cy="14" r="8" fill="#ffd24a"/><rect y="40" width="120" height="12" fill="#4ab8e8"/><path d="M0 44q10-4 20 0t20 0 20 0 20 0 20 0 20 0" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/><rect y="52" width="120" height="18" fill="#f4e0a8"/><rect x="66" y="10" width="34" height="34" fill="#fff0d8" stroke="#1d2240" stroke-width="2"/><path d="M70 17h26M70 25h26M70 33h26" stroke="#5c9fd6" stroke-width="4"/><path d="M14 62V30" stroke="#b08a5a" stroke-width="3"/><path d="M14 30c-10 0-14 6-14 6M14 30c10 0 14 6 14 6M14 30c-6-6-12-4-12-4M14 30c6-6 12-4 12-4" stroke="#4cb860" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M34 46h28l-14-10z" fill="#e8473f" stroke="#1d2240" stroke-width="2" stroke-linejoin="round"/><path d="M48 46v14" stroke="#1d2240" stroke-width="2"/><rect x="38" y="60" width="22" height="5" rx="2" fill="#3f8fe8" stroke="#1d2240" stroke-width="1.5"/><circle cx="94" cy="61" r="5" fill="#ffd24a" stroke="#1d2240" stroke-width="1.5"/></svg>',
  winter: '<svg viewBox="0 0 120 70"><rect width="120" height="70" fill="#dce8f4"/><rect y="52" width="120" height="18" fill="#f6fafd"/><rect x="12" y="32" width="30" height="22" fill="#c8905a" stroke="#1d2240" stroke-width="2"/><path d="M8 34 27 18l19 16z" fill="#fff" stroke="#1d2240" stroke-width="2" stroke-linejoin="round"/><rect x="22" y="38" width="9" height="8" fill="#ffe9a8" stroke="#1d2240" stroke-width="1.5"/><path d="M62 54 74 18l12 36z" fill="#2e8a5a" stroke="#1d2240" stroke-width="2" stroke-linejoin="round"/><circle cx="74" cy="17" r="3" fill="#ffd24a"/><circle cx="70" cy="34" r="2.2" fill="#e8473f"/><circle cx="78" cy="42" r="2.2" fill="#3f8fe8"/><circle cx="71" cy="48" r="2.2" fill="#ffd24a"/><circle cx="100" cy="50" r="7" fill="#fff" stroke="#1d2240" stroke-width="2"/><circle cx="100" cy="38" r="5" fill="#fff" stroke="#1d2240" stroke-width="2"/><path d="M100 39h5" stroke="#ff8a2a" stroke-width="2"/><rect x="95" y="29" width="10" height="5" fill="#2a2a30"/><g fill="#fff"><circle cx="8" cy="10" r="1.6"/><circle cx="30" cy="6" r="1.6"/><circle cx="52" cy="14" r="1.6"/><circle cx="92" cy="8" r="1.6"/><circle cx="112" cy="22" r="1.6"/><circle cx="50" cy="40" r="1.6"/></g></svg>',
  fair: '<svg viewBox="0 0 120 70"><rect width="120" height="70" fill="#c8e4ff"/><rect y="56" width="120" height="14" fill="#8fd16a"/><circle cx="36" cy="30" r="22" fill="none" stroke="#ff6a8a" stroke-width="3"/><path d="M36 8v44M14 30h44M20 14l32 32M52 14 20 46" stroke="#1d2240" stroke-width="1.2" opacity=".5"/><path d="M28 58 36 30l8 28" stroke="#3f8fe8" stroke-width="3" fill="none"/><g stroke="#1d2240" stroke-width="1.2"><rect x="32" y="5" width="8" height="6" fill="#ffd24a"/><rect x="10" y="27" width="8" height="6" fill="#5cc06a"/><rect x="54" y="27" width="8" height="6" fill="#9a6ae0"/><rect x="32" y="49" width="8" height="6" fill="#e8473f"/></g><path d="M70 56V40h40v16" fill="#fff" stroke="#1d2240" stroke-width="2"/><path d="M66 41 90 20l24 21z" fill="#e8473f" stroke="#1d2240" stroke-width="2" stroke-linejoin="round"/><path d="M78 41 90 20l12 21" fill="#fff" opacity=".8"/><path d="M90 20v-8" stroke="#1d2240" stroke-width="1.5"/><path d="M90 12h7l-7 3z" fill="#ffd24a"/><circle cx="110" cy="12" r="5" fill="#ff7ab0" stroke="#1d2240" stroke-width="1.2"/><path d="M110 17v14" stroke="#1d2240"/></svg>',
  japan: '<svg viewBox="0 0 120 70"><rect width="120" height="70" fill="#f6e4ee"/><circle cx="96" cy="16" r="9" fill="#ff8a7a" opacity=".8"/><rect y="56" width="120" height="14" fill="#9cc878"/><g stroke="#1d2240" stroke-width="2" stroke-linejoin="round"><rect x="50" y="44" width="18" height="12" fill="#f0e0c8"/><path d="M42 45h34l-5-5H47z" fill="#3a3e4a"/><rect x="52" y="32" width="14" height="8" fill="#f0e0c8"/><path d="M45 33h28l-4-5H49z" fill="#3a3e4a"/><rect x="54" y="21" width="10" height="7" fill="#f0e0c8"/><path d="M48 22h22l-4-5H52z" fill="#3a3e4a"/></g><path d="M59 17V6" stroke="#d8b040" stroke-width="2.5"/><g stroke="#1d2240" stroke-width="2"><path d="M12 56V30M30 56V30" stroke="#e8442a" stroke-width="4"/><path d="M6 28h30" stroke="#2a2a30" stroke-width="4"/><path d="M9 35h24" stroke="#e8442a" stroke-width="3"/></g><path d="M96 56V40" stroke="#5a3a3a" stroke-width="3"/><circle cx="96" cy="36" r="11" fill="#ffc8dc"/><circle cx="88" cy="40" r="7" fill="#ffb0cc"/><circle cx="104" cy="40" r="7" fill="#ffd8e6"/><g fill="#ffb0cc"><circle cx="20" cy="12" r="1.8"/><circle cx="78" cy="10" r="1.8"/><circle cx="112" cy="54" r="1.8"/><circle cx="40" cy="50" r="1.8"/></g></svg>',
  town: '<svg viewBox="0 0 120 70"><rect width="120" height="70" fill="#9fd8ff"/><rect y="52" width="120" height="18" fill="#8fd16a"/><rect y="58" width="120" height="7" fill="#5d6270"/><rect x="10" y="30" width="26" height="24" fill="#f4d8b0" stroke="#1d2240" stroke-width="2"/><path d="M7 31 23 18l16 13z" fill="#d0563f" stroke="#1d2240" stroke-width="2" stroke-linejoin="round"/><rect x="19" y="40" width="7" height="12" fill="#b8584a"/><rect x="44" y="22" width="30" height="32" fill="#c8e0f0" stroke="#1d2240" stroke-width="2"/><rect x="48" y="27" width="8" height="7" fill="#5c9fd6"/><rect x="62" y="27" width="8" height="7" fill="#5c9fd6"/><rect x="48" y="39" width="8" height="7" fill="#5c9fd6"/><rect x="62" y="39" width="8" height="7" fill="#5c9fd6"/><circle cx="90" cy="38" r="10" fill="#5cb85c" stroke="#1d2240" stroke-width="2"/><rect x="88" y="46" width="4" height="8" fill="#8a5a3a"/><rect x="98" y="48" width="16" height="7" rx="2" fill="#e8473f" stroke="#1d2240" stroke-width="1.5"/></svg>',
  port: '<svg viewBox="0 0 120 70"><rect width="120" height="70" fill="#c4e4f4"/><rect y="50" width="120" height="20" fill="#5ab0e0"/><rect y="46" width="80" height="8" fill="#a4a8b0"/><rect x="6" y="34" width="22" height="12" fill="#d84a3a" stroke="#1d2240" stroke-width="2"/><rect x="6" y="22" width="22" height="12" fill="#3a7fd8" stroke="#1d2240" stroke-width="2"/><rect x="30" y="34" width="22" height="12" fill="#f2b62a" stroke="#1d2240" stroke-width="2"/><path d="M62 46V10h4v36M58 12h40" stroke="#f2b62a" stroke-width="4" fill="none"/><path d="M62 46V10h4v36" stroke="#1d2240" stroke-width="1.5" fill="none"/><rect x="90" y="12" width="3" height="20" fill="#1d2240"/><path d="M84 54h32l-5 8H89z" fill="#fff" stroke="#1d2240" stroke-width="2"/><rect x="94" y="46" width="12" height="8" fill="#e84a3a" stroke="#1d2240" stroke-width="1.5"/></svg>',
  metro: '<svg viewBox="0 0 120 70"><rect width="120" height="70" fill="#d0dcf4"/><rect y="60" width="120" height="10" fill="#5d6270"/><rect x="8" y="20" width="22" height="40" fill="#8fc8f0" stroke="#1d2240" stroke-width="2"/><rect x="34" y="6" width="26" height="54" fill="#b8b0f0" stroke="#1d2240" stroke-width="2"/><rect x="64" y="16" width="20" height="44" fill="#9ad8d0" stroke="#1d2240" stroke-width="2"/><rect x="88" y="28" width="24" height="32" fill="#f0d0a0" stroke="#1d2240" stroke-width="2"/><path d="M38 12h18M38 20h18M38 28h18M38 36h18M38 44h18M12 28h14M12 36h14M12 44h14M68 24h12M68 32h12M68 40h12M92 36h16M92 44h16" stroke="#fff" stroke-width="2.5" opacity=".7"/><rect x="46" y="1" width="2" height="6" fill="#1d2240"/></svg>',
  castle: '<svg viewBox="0 0 120 70"><rect width="120" height="70" fill="#c8ecff"/><rect y="54" width="120" height="16" fill="#9ad46a"/><rect x="30" y="26" width="60" height="30" fill="#e0d8c8" stroke="#1d2240" stroke-width="2"/><rect x="18" y="18" width="16" height="38" fill="#e0d8c8" stroke="#1d2240" stroke-width="2"/><rect x="86" y="18" width="16" height="38" fill="#e0d8c8" stroke="#1d2240" stroke-width="2"/><path d="M15 19 26 4l11 15zM83 19 94 4l11 15z" fill="#4f6fb0" stroke="#1d2240" stroke-width="2" stroke-linejoin="round"/><path d="M52 56V44a8 8 0 0 1 16 0v12z" fill="#8a5a36" stroke="#1d2240" stroke-width="2"/><path d="M30 26v-5h6v5M42 26v-5h6v5M54 26v-5h6v5M66 26v-5h6v5M78 26v-5h6v5" fill="#e0d8c8" stroke="#1d2240" stroke-width="2"/><path d="M26 4V0l8 2-8 2" fill="#ff5a4e"/></svg>',
};

export class UI {
  constructor(game, root) {
    this.g = game;
    this.root = root;
    this.screen = '';
    this.modalOpen = false;
    this.labels = new Map();
    this.pops = [];
    this._tmp = {};
    this.hudT = 0;
    const css = document.createElement('style');
    css.textContent = volumeCss({ accent: '#ffc93c', track: '#3a3f5c', thumb: '#fffaf0', muted: '#b8bdd8' });
    document.head.appendChild(css);
    // подписи и очки под экранами интерфейса, чтобы не лезли поверх кнопок меню
    root.innerHTML = '<div class="layer" id="lbl"></div><div class="layer" id="pops"><div id="garrow"></div></div><div class="layer" id="scr"></div><div id="stick"><i></i></div>';
    this.scr = root.querySelector('#scr');
    this.lbl = root.querySelector('#lbl');
    this.popL = root.querySelector('#pops');
    this.stickEl = root.querySelector('#stick');
    this.garrow = root.querySelector('#garrow');
    this.garrow.innerHTML = `<i></i>${this._pickImg('gold')}`;
    this.garrow.style.display = 'none';
    iap.onChange(() => this.refresh());
    sdk.onAdsChange(()=>this._adButtons());
    sdk.onSocialChange(()=>this._storyButtons());
    new MutationObserver(()=>{this._adButtons();this._storyButtons();}).observe(document.body,{childList:true,subtree:true});
  }

  click() {
    audio.play('click');
  }

  _btn(sel, fn) {
    this.scr.querySelectorAll(sel).forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.click();
        fn(b, e);
      }),
    );
  }

  refresh() {
    if (this.screen === 'menu') this._menuTop();
    const c = document.querySelector('.coins b');
    if (c) c.textContent = fmt(save.data.coins);
    if (this.modalRefresh) this.modalRefresh();
  }

  // ---------- меню ----------
  showMenu() {
    this.closeModal();
    this.screen = 'menu';
    this._clearLabels();
    this.stickEl.style.display = 'none';
    const d = save.data;
    const touch = matchMedia('(pointer:coarse)').matches;
    this.scr.innerHTML = `
      <div class="topbar"><div class="tb-l" id="lvl"></div><div class="tb-r"><button class="round" id="quests">${I.task}<i class="badge" id="qbadge"></i></button><button class="chip coins" id="coins">${I.coin}<b>${fmt(d.coins)}</b><i class="plus">${I.plus}</i></button><button class="round" id="snd">${I.sound}</button></div></div>
      <div class="logo"><div class="logo-in"><div class="logo-t">${esc(t('title'))}</div><div class="logo-sub">${esc(t('subtitle'))}</div></div></div>
      <div class="menu-c">
        <div class="world-count">${esc(t('mapCount'))}</div>
        <div class="modes">${MODES.map((m) => `<button class="mode ${d.mode === m ? 'on' : ''}" data-m="${m}"><b>${esc(t('mode_' + m))}</b><small>${esc(t('mode_' + m + '_d'))}</small></button>`).join('')}</div>
        <div class="maps">${MAPS.map((m) => this._mapCard(m)).join('')}</div>
        <button class="expedition-entry" id="expeditions">${I.flag}<span><b>${esc(t('expeditions'))}</b><small>${esc(t('expeditionD'))}</small></span><i>›</i></button>
        <button class="btn big play" id="play">${I.play}<span>${esc(t('play'))}</span></button>
        <div class="row side">
          <button class="btn mid violet" id="skins">${I.skin}<span>${esc(t('skins'))}</span></button>
          <button class="btn mid green" id="ups">${I.up}<span>${esc(t('upgrades'))}</span></button>
          <button class="btn mid blue" id="lb">${I.cup}<span>${esc(t('records'))}</span></button>
        </div>
        <div class="hint">${esc(touch ? t('howToTouch') : t('howTo'))}</div>
      </div>`;
    this._menuTop();
    this._btn('#expeditions',()=>this.openExpeditions());
    this._btn('.mode', (b) => {
      d.mode = b.dataset.m;
      save.write(false);
      this.scr.querySelectorAll('.mode').forEach((x) => x.classList.toggle('on', x === b));
      this.scr.querySelector('.maps').innerHTML = MAPS.map((m) => this._mapCard(m)).join('');
      this._bindMaps();
    });
    this._bindMaps();
    this._btn('#play', () => this.g.play());
    this._btn('#skins', () => this.openSkins());
    this._btn('#ups', () => this.openUpgrades());
    this._btn('#lb', () => this.openRecords());
    this._btn('#coins', () => this.openCoins());
    this._btn('#snd', () => this.openSound());
    this._btn('#quests', () => this.openQuests());
    // подарок дня — один раз за заход, начиная со второго раунда (первый раз игрок сразу играет)
    if (d.rounds > 0 && giftReady(d) && !this.giftShown) {
      this.giftShown = true;
      setTimeout(() => this.screen === 'menu' && !this.modalOpen && this.openGift(), 600);
    }
  }

  _mapCard(m) {
    const d = save.data;
    const open = save.mapOpen(m.id);
    const sel = d.map === m.id;
    let sub = '';
    if (!open) sub = `<span class="mlock">${I.lock}${esc(t('lockedLvl', { n: m.need }))}</span>`;
    else if (d.mode === 'solo') {
      const s = d.solo[m.id];
      sub = `<span class="mstars">${[1, 2, 3].map((k) => (s && s.stars >= k ? I.star : I.starOff)).join('')}</span>`;
    }
    return `<button class="mcard ${sel ? 'on' : ''} ${open ? '' : 'locked'}" data-id="${m.id}"><div class="mart">${window.__HS_MAPS__?.[m.id] ? `<img src="${window.__HS_MAPS__[m.id]}" alt="" loading="lazy">` : MAP_ART[m.id] || MAP_ART.town}</div><b>${esc(t('map_' + m.id))}</b>${sub}</button>`;
  }

  _bindMaps() {
    const strip = this.scr.querySelector('.maps');
    // колесо мыши листает ленту карт вбок; выбранная карта всегда на виду
    if (!strip.dataset.wheel) {
      strip.dataset.wheel = '1';
      strip.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && strip.scrollWidth > strip.clientWidth) {
          strip.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      }, { passive: false });
    }
    const on = strip.querySelector('.mcard.on');
    if (on) strip.scrollLeft += on.getBoundingClientRect().left - strip.getBoundingClientRect().left - (strip.clientWidth - on.offsetWidth) / 2;
    this.scr.querySelectorAll('.mcard').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!save.mapOpen(b.dataset.id)) {
          audio.play('deny');
          this.toast(t('lockedLvl', { n: MAPS.find((m) => m.id === b.dataset.id).need }));
          return;
        }
        this.click();
        if (save.data.map === b.dataset.id) return;
        save.data.map = b.dataset.id;
        save.write(false);
        this.scr.querySelectorAll('.mcard').forEach((x) => x.classList.toggle('on', x === b));
        // фон меню — выбранный город
        this.g.menu();
      }),
    );
  }

  _menuTop() {
    const el = this.scr.querySelector('#lvl');
    if (!el) return;
    const d = save.data;
    const need = XP_LEVEL(d.level);
    el.innerHTML = `<div class="lvl"><div class="lvl-n">${d.level}</div><div class="lvl-b"><small>${esc(t('level'))}</small><div class="bar"><i style="width:${Math.round((d.xp / need) * 100)}%"></i></div></div></div>`;
    const c = this.scr.querySelector('#coins b');
    if (c) c.textContent = fmt(d.coins);
    ensureDaily(d);
    const b = this.scr.querySelector('#qbadge');
    if (b) {
      const n = questsReady(d) + (giftReady(d) && d.rounds > 0 ? 1 : 0);
      b.textContent = n ? String(n) : '';
      b.style.display = n ? '' : 'none';
    }
  }

  // ---------- HUD ----------
  showHud() {
    this.closeModal();
    this.screen = 'hud';
    this._clearLabels();
    const mode = this.g.mode;
    const solo = mode === 'solo' || mode === 'expedition';
    const zen = mode === 'zen';
    this.scr.innerHTML = `
      <div class="hud-time"><div class="htime">${I.clock}<b id="time">${fmtTime(this.g.time)}</b></div><div class="feed" id="feed"></div></div>
      <div class="hud-me"><div class="chip pts">${I.hole}<b id="pts">0</b></div>${mode === 'royale' ? '<div class="left" id="left"></div>' : ''}${mode === 'solo' ? `<div class="prog"><div class="bar big"><i id="pct"></i></div><small id="pctT">0%</small></div>` : ''}<div class="effs" id="effs"></div></div>
      <div class="hud-r"><div class="row r2">${zen ? `<button class="round small" id="fin">${I.flag}</button>` : ''}<button class="round small" id="pause">${I.pause}</button></div>${solo || zen ? '' : '<div class="lboard" id="board"></div>'}</div>
      <div class="mission-hud" id="mission"></div><div class="world-hint">${esc(t(solo?'finiteHint':mode==='battle'||mode==='royale'?'scoreHint':'regenHint'))}</div>
      <div class="tut" id="tut"></div>
      <div class="death" id="death"></div>`;
    this._btn('#pause', () => this.g.pause(true));
    this._btn('#fin', () => this.g.finishZen());
    this.boardKey = '';
    this.effKey = '';
  }

  // ---------- обучение ----------
  showTut(step) {
    const el = this.scr.querySelector('#tut');
    if (!el) return;
    const touch = matchMedia('(pointer:coarse)').matches;
    const key = ['tut0' + (touch ? 't' : ''), 'tut1', 'tut2', 'tut3', 'tut4'][step];
    el.innerHTML = `<div class="tcard"><div class="tstep">${esc(t('tutStep', { n: step + 1 }))}</div><b>${esc(t(key))}</b><button class="tskip" id="tskip">${esc(t('tutSkip'))}</button></div>`;
    el.querySelector('#tskip').addEventListener('click', (e) => {
      e.stopPropagation();
      this.click();
      this.g.skipTut();
    });
  }
  hideTut() {
    const el = this.scr.querySelector('#tut');
    if (el) el.innerHTML = '';
  }

  frame(dt) {
    const g = this.g;
    // подписи над дырами
    // на экране итогов подписи и очки не должны лезть поверх карточки
    const hide = this.screen === 'result' ? 'none' : '';
    if (this.lbl.style.display !== hide) this.lbl.style.display = this.popL.style.display = hide;
    if (g.sim && (this.screen === 'hud' || this.screen === 'menu')) this._labels();
    this._goldArrow();
    // всплывающие очки
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      p.t += dt;
      if (p.t > 1.1) {
        p.el.remove();
        this.pops.splice(i, 1);
        continue;
      }
      const s = g.view.toScreen(p.h.x, 0, p.h.z, this._tmp);
      p.el.style.transform = `translate(${s.x}px,${s.y - 40 - p.t * 60}px) translate(-50%,-50%) scale(${Math.min(1, p.t * 6) * (1 + p.big)})`;
      p.el.style.opacity = String(Math.min(1, (1.1 - p.t) * 3));
    }
    if (this.screen !== 'hud' || !g.me) return;
    this.hudT -= dt;
    if (this.hudT > 0) return;
    this.hudT = 0.1;
    if(g.expedition){const l=g.expedition,st=g.stats,el=this.scr.querySelector('#mission');
      const goal=(key,n,v)=>'<span class="'+(v>=n?'done':'')+'">'+esc(t(key,{n:v+' / '+n}))+'</span>';
      const html='<b>'+esc(t('expedition',{n:l.id}))+'</b>'+goal('target',l.target,st.eaten)+(l.cars?goal('targetCars',l.cars,st.cars):'')+(l.trees?goal('targetTrees',l.trees,st.trees):'')+(l.crates?goal('targetCrates',l.crates,st.crates):'')+'<small>'+esc(t('missionStars',{a:Math.ceil(l.target*1.35),b:Math.ceil(l.target*1.75)}))+'</small>';
      if(el && html!==this._missionHTML){el.innerHTML=html;this._missionHTML=html;}
    }
    const time = this.scr.querySelector('#time');
    if (time) {
      time.textContent = fmtTime(g.time);
      time.parentElement.classList.toggle('hurry', g.time <= 30);
    }
    const pts = this.scr.querySelector('#pts');
    if (pts) pts.textContent = fmt(g.me.pts);
    // действующие бонусы с обратным отсчётом
    const effs = this.scr.querySelector('#effs');
    if (effs) {
      const on = Object.entries(g.me.eff).filter(([, v]) => v > 0 && g.me.alive);
      const key = on.map(([k, v]) => k + Math.ceil(v)).join(',');
      if (key !== this.effKey) {
        this.effKey = key;
        effs.innerHTML = on.map(([k, v]) => `<div class="eff" style="--c:${PICK_COL[k]}">${this._pickImg(k)}<span>${esc(t('pk_' + k + '_s'))}</span><b>${Math.ceil(v)}</b></div>`).join('');
      }
    }
    const left = this.scr.querySelector('#left');
    if (left) left.textContent = t('left', { n: g.sim.holes.filter((h) => h.alive).length });
    const pct = this.scr.querySelector('#pct');
    if (pct) {
      const v = g.sim.progress() * 100;
      pct.style.width = Math.min(100, v / 0.65) + '%';
      this.scr.querySelector('#pctT').textContent = v.toFixed(1) + '%';
    }
    const board = this.scr.querySelector('#board');
    if (board) {
      const rank = g.ranking();
      const top = rank.slice(0, 10);
      const mi = rank.indexOf(g.me);
      if (mi >= 10) top.push(g.me);
      const key = top.map((h) => h.id + ':' + h.pts + ':' + h.alive).join(',');
      if (key !== this.boardKey) {
        this.boardKey = key;
        board.innerHTML = top
          .map((h) => {
            const i = rank.indexOf(h);
            const sk = SKINS.find((s) => s.id === h.skin) || SKINS[0];
            return `<div class="lb-row ${h === g.me ? 'me' : ''} ${h.alive ? '' : 'dead'}"><span class="lb-i">${i === 0 ? I.crown : i + 1}</span><span class="lb-dot" style="background:${hex(sk.rim[0])}"></span><span class="lb-n">${esc(h === g.me ? t('you') : h.name)}</span><b>${fmt(h.pts)}</b></div>`;
          })
          .join('');
      }
    }
    const death = this.scr.querySelector('#death');
    if (death && death.dataset.on === '1') {
      const n = Math.max(0, Math.ceil(g.me.respawnT));
      const c = death.querySelector('.cd');
      if (c) c.textContent = t('respawnIn', { n });
    }
  }

  // стрелка у края экрана показывает, где золотая цель
  _goldArrow() {
    const g = this.g, G = g.sim && g.sim.gold;
    const a = this.garrow;
    if (this.screen !== 'hud' || !G || G.st === 2 || !g.me || !g.me.alive) {
      if (a.style.display !== 'none') a.style.display = 'none';
      return;
    }
    const s = g.view.toScreen(G.p.x, G.p.y, G.p.z, this._tmp);
    const W = window.innerWidth, H = window.innerHeight;
    if (s.vis && s.x > 40 && s.x < W - 40 && s.y > 70 && s.y < H - 40) {
      if (a.style.display !== 'none') a.style.display = 'none';
      return;
    }
    a.style.display = '';
    const cx = W / 2, cy = H / 2;
    let dx = s.x - cx, dy = s.y - cy;
    // за камерой проекция переворачивается
    if (!s.vis && this._tmp.vis === false && Math.hypot(dx, dy) < 1) dy = 1;
    const k = Math.min((W / 2 - 44) / Math.max(1, Math.abs(dx)), (H / 2 - 74) / Math.max(1, Math.abs(dy)));
    const x = cx + dx * k, y = cy + dy * k;
    a.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
    a.firstChild.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  }

  _labels() {
    const g = this.g;
    const seen = new Set();
    for (const h of g.sim.holes) {
      if (!h.alive) continue;
      const s = g.view.toScreen(h.x, 0, h.z + h.r + 0.6, this._tmp);
      if (!s.vis) continue;
      seen.add(h.id);
      let el = this.labels.get(h.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'hlabel' + (h.me ? ' me' : h.type === 'hunter' ? ' hunter' : h.type === 'pro' ? ' pro' : '');
        this.lbl.appendChild(el);
        this.labels.set(h.id, el);
      }
      const txt = h.me ? t('you') : h.name;
      // в бою подпись подсказывает: красная — опасна, зелёная — можно съесть
      const me = this.screen === 'hud' && g.me && g.me.alive && !h.me ? g.me : null;
      const cls = 'hlabel' + (h.me ? ' me' : me && canEatHole(h, me) ? ' danger' : me && canEatHole(me, h) ? ' prey' : h.type === 'hunter' ? ' hunter' : h.type === 'pro' ? ' pro' : '');
      if (el.className !== cls) el.className = cls;
      if (el.dataset.t !== txt) {
        el.textContent = txt;
        el.dataset.t = txt;
      }
      el.style.transform = `translate(${s.x}px,${s.y + 4}px) translate(-50%,0)`;
    }
    for (const [id, el] of this.labels)
      if (!seen.has(id)) {
        el.remove();
        this.labels.delete(id);
      }
  }

  _clearLabels() {
    for (const el of this.labels.values()) el.remove();
    this.labels.clear();
    for (const p of this.pops) p.el.remove();
    this.pops = [];
  }

  popPoints(h, n, combo) {
    if (this.pops.length > 8) return;
    const el = document.createElement('div');
    el.className = 'pop' + (combo >= 8 ? ' hot' : '');
    el.textContent = '+' + fmt(n);
    this.popL.appendChild(el);
    this.pops.push({ el, h, t: 0, big: Math.min(0.5, n / 400) });
  }

  pulseSize() {
    const el = this.scr.querySelector('.hud-me .pts');
    if (!el) return;
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
  }

  feedMsg(s) {
    const f = this.scr.querySelector('#feed');
    if (!f) return;
    const el = document.createElement('div');
    el.textContent = s;
    f.prepend(el);
    while (f.children.length > 3) f.lastChild.remove();
    setTimeout(() => el.remove(), 3500);
  }

  showDeath(name, canKeep) {
    const el = this.scr.querySelector('#death');
    if (!el) return;
    el.dataset.on = '1';
    el.innerHTML = `<div class="dcard"><b>${esc(t('eatenBy', { a: name }))}</b><div class="cd"></div>${canKeep ? `<button class="btn mid green" id="keep">${I.ad}<span>${esc(t('keepSize'))}</span></button><small>${esc(t('keepSizeD'))}</small>` : ''}</div>`;
    const k = el.querySelector('#keep');
    if (k)
      k.addEventListener('click', (e) => {
        e.stopPropagation();
        this.click();
        k.disabled = true;
        this.g.keepSize();
      });
  }

  // «Выживание»: игрок выбыл
  showOut(name, place, canRevive) {
    const el = this.scr.querySelector('#death');
    if (!el) return;
    el.dataset.on = '0';
    el.innerHTML = `<div class="dcard"><b>${esc(t('eatenBy', { a: name }))}</b><div class="cd">${esc(t('outPlace', { n: place }))}</div><div class="row">${canRevive ? `<button class="btn mid green" id="keep">${I.ad}<span>${esc(t('revive'))}</span></button>` : ''}<button class="btn mid violet" id="outres">${I.cup}<span>${esc(t('toResult'))}</span></button></div></div>`;
    const k = el.querySelector('#keep');
    if (k)
      k.addEventListener('click', (e) => {
        e.stopPropagation();
        this.click();
        k.disabled = true;
        this.g.keepSize();
      });
    el.querySelector('#outres').addEventListener('click', (e) => {
      e.stopPropagation();
      this.click();
      this.g.finishOut();
    });
  }

  hideDeath() {
    const el = this.scr.querySelector('#death');
    if (!el) return;
    el.dataset.on = '0';
    el.innerHTML = '';
  }

  stick(s) {
    const el = this.stickEl;
    if (!s.on || this.screen !== 'hud') {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'block';
    el.style.transform = `translate(${s.x0}px,${s.y0}px)`;
    el.firstChild.style.transform = `translate(${s.dx}px,${s.dy}px)`;
  }

  // ---------- пауза ----------
  showPause() {
    this.modal(t('pause'), `<div class="col">${slidersHTML(save.data.settings, { music: t('music'), sound: t('sounds') })}${this._fastToggle()}<div class="row"><button class="btn big green" id="res">${I.play}<span>${esc(t('resume'))}</span></button></div>${this.g.mode === 'zen' ? `<div class="row"><button class="btn mid green" id="zfin">${I.flag}<span>${esc(t('finish'))}</span></button></div>` : ''}<div class="row"><button class="btn mid blue" id="rst">${I.again}<span>${esc(t('restart'))}</span></button><button class="btn mid violet" id="men">${I.home}<span>${esc(t('menu'))}</span></button></div></div>`, () => this.g.pause(false));
    const m = this.mroot;
    bindSliders(m, save.data.settings, () => save.write());
    this._bindFast(m);
    const on = (id, fn) =>
      m.querySelector(id).addEventListener('click', (e) => {
        e.stopPropagation();
        this.click();
        fn();
      });
    on('#res', () => {
      this.closeModal();
      this.g.pause(false);
    });
    if (m.querySelector('#zfin'))
      on('#zfin', () => {
        this.closeModal();
        this.g.paused = false;
        this.g.finishZen();
      });
    on('#rst', () => {
      this.closeModal();
      this.g.state = 'result';
      this.g.afterRound('again');
    });
    on('#men', () => {
      this.closeModal();
      this.g.state = 'result';
      this.g.afterRound('menu');
    });
  }

  _fastToggle() {
    const fast = save.data.settings.quality === 'low';
    return `<label class="tgl"><input type="checkbox" id="fast" ${fast ? 'checked' : ''}><span>${esc(t('quality'))}: ${esc(t('q_low'))}</span></label>`;
  }
  _bindFast(m) {
    const f = m.querySelector('#fast');
    if (!f) return;
    f.addEventListener('change', () => {
      save.data.settings.quality = f.checked ? 'low' : 'auto';
      save.write();
      this.g.setQuality();
    });
  }

  // ---------- итоги ----------
  showResult(res) {
    this.closeModal();
    this.screen = 'result';
    this.stickEl.style.display = 'none';
    const solo = res.mode === 'solo' || res.mode === 'expedition';
    const zen = res.mode === 'zen';
    const head = res.expedition
      ? '<div class="rstars">'+[1,2,3].map(k=>'<span class="st lg">'+(res.stars>=k?I.star:I.starOff)+'</span>').join('')+'</div><b class="rtitle">'+esc(t(res.stars?'missionWin':'missionFail'))+'</b>'
      : zen
      ? `<div class="rzen">${I.flag}</div><b class="rtitle">${esc(t('zenResult', { n: fmtTime(res.time) }))}</b>`
      : solo
      ? `<div class="rstars">${[1, 2, 3].map((k) => `<span class="st lg ${res.stars >= k ? 'pop' : ''}" style="animation-delay:${k * 0.25}s">${res.stars >= k ? I.star : I.starOff}</span>`).join('')}</div><b class="rtitle">${esc(t('soloResult', { n: res.pct }))}</b>`
      : `<div class="rplace ${res.place === 1 ? 'gold' : ''}">${res.place === 1 ? I.crown : ''}<b>${res.place}</b></div><b class="rtitle">${esc(res.place === 1 ? t('place1') : t('placeN', { n: res.place }))}</b>`;
    const rank = this.g.ranking();
    const table = solo || zen
      ? ''
      : `<div class="rtable">${rank
          .slice(0, 10)
          .map((h, i) => `<div class="lb-row ${h === this.g.me ? 'me' : ''}"><span class="lb-i">${i === 0 ? I.crown : i + 1}</span><span class="lb-n">${esc(h === this.g.me ? t('you') : h.name)}</span><b>${fmt(h.pts)}</b></div>`)
          .join('')}</div>`;
    const lv = res.levels.length ? `<div class="rlvl">${esc(t('levelUp', { n: res.levels[res.levels.length - 1] }))}</div>` : '';
    const mp = res.maps.length ? `<div class="rlvl">${esc(t('mapOpen', { n: t('map_' + res.maps[0]) }))}</div>` : '';
    this.scr.innerHTML = `<div class="result"><div class="rcard">
      ${head}
      ${res.newBest ? `<div class="newbest">${esc(t('newBest'))}</div>` : ''}
      <div class="rstats"><div><small>${esc(t('points'))}</small><b>${fmt(res.pts)}</b></div><div><small>${esc(t('eatenCount'))}</small><b>${fmt(res.eaten)}</b></div>${solo || zen ? '' : `<div><small>${esc(t('kills'))}</small><b>${res.kills}</b></div>`}<div><small>${esc(t('bestSize'))}</small><b>${res.maxR.toFixed(1)} м</b></div></div>
      ${table}
      <div class="rreward"><span>${esc(t('reward'))}</span><span class="chip">${I.coin}<b>+${fmt(res.coins * (res.doubled ? 2 : 1))}</b></span>${res.doubled ? '' : `<button class="btn mid green" id="x2">${I.ad}<span>${esc(t('x2'))}</span></button>`}</div>
      ${lv}${mp}
      ${res.mastery?'<div class="rlvl">'+esc(t('masteryReward'))+'</div>':''}
      ${res.expedition && res.stars && res.expedition<EXPEDITIONS.length?'<button class="btn mid green" id="nextmission">'+I.flag+'<span>'+esc(t('nextMission'))+'</span></button>':''}
      ${solo?'<button class="btn mid blue" id="freewalk">'+I.hole+'<span>'+esc(t('freeWalk'))+'</span></button>':''}
      <button class="btn mid blue story" hidden>${I.cup}<span>${esc(t('story'))}</span></button>
      <div class="row"><button class="btn big" id="again">${I.again}<span>${esc(t('again'))}</span></button><button class="btn mid violet" id="menu">${I.home}<span>${esc(t('menu'))}</span></button></div>
    </div></div>`;
    if (LANG === 'en') this.scr.querySelectorAll('.rstats b').forEach((b) => (b.textContent = b.textContent.replace(' м', ' m')));
    this._btn('#nextmission',()=>this.g.play(res.expedition+1));
    this._btn('#freewalk',()=>this.g.continueCity());
    this._btn('.story',b=>this._share(b,res));
    this._btn('#x2', () => this.g.doubleReward());
    this._btn('#again', () => this.g.afterRound('again'));
    this._btn('#menu', () => this.g.afterRound('menu'));
    if (res.levels.length) audio.play('level');
  }

  // ---------- окна ----------
  modal(title, body, onClose) {
    this.closeModal();
    this.modalOpen = true;
    const m = document.createElement('div');
    m.className = 'modal';
    m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-label',title);
    m.innerHTML = `<div class="mpanel"><div class="mhead"><b>${esc(title)}</b><button class="round small mx">${I.x}</button></div><div class="mbody">${body}</div></div>`;
    m.addEventListener('pointerdown', (e) => e.stopPropagation());
    const close = () => {
      this.closeModal();
      onClose && onClose();
    };
    m.querySelector('.mx').addEventListener('click', () => {
      this.click();
      close();
    });
    m.addEventListener('click', (e) => {e.stopPropagation();if(e.target===m && !this.g.paused)close();});
    document.body.appendChild(m);
    this.mroot = m;
    return m;
  }

  closeModal() {
    if (this.mroot) this.mroot.remove();
    this.mroot = null;
    this.modalOpen = false;
    this.modalRefresh = null;
  }

  openSkins() {
    const render = () => {
      const d = save.data;
      return `<div class="skins">${SKINS.map((s) => {
        const own = d.skins.includes(s.id);
        const cur = d.skin === s.id;
        const P = 360 / 6, n = s.rim.length;
        const ringCss = n > 1 ? `repeating-conic-gradient(${s.rim.map((c, i) => `${hex(c)} ${(i * P) / n}deg ${((i + 1) * P) / n}deg`).join(',')})` : hex(s.rim[0]);
        let btn;
        if (cur) btn = `<button class="sbtn on" disabled>${esc(t('chosen'))}</button>`;
        else if (own) btn = `<button class="sbtn" data-pick="${s.id}">${esc(t('choose'))}</button>`;
        else if(s.mastery)btn='<button class="sbtn reward-lock" disabled>'+I.lock+'<small>'+esc(t('masteryNeed',{map:t('map_'+s.mastery)}))+'</small></button>';
        else if (s.ad) btn = `<button class="sbtn ad" data-ad="${s.id}">${I.ad}${esc(t('watchAd', { a: d.adSkins[s.id] || 0, b: s.ad }))}</button>`;
        else btn = `<button class="sbtn buy ${d.coins < s.price ? 'poor' : ''}" data-buy="${s.id}">${I.coin}${fmt(s.price)}</button>`;
        return `<div class="skin ${cur ? 'cur' : ''}"><div class="sprev" style="--ring:${ringCss};--wall:${hex(s.wall)};--glow:${hex(s.glow)}"><i></i></div><b>${esc(t((s.mastery?'skin_':'sk_') + s.id))}</b>${btn}</div>`;
      }).join('')}</div>`;
    };
    const m = this.modal(t('skins'), render());
    const bind = () => {
      m.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => this._skin('pick', b.dataset.pick, m, render, bind)));
      m.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => this._skin('buy', b.dataset.buy, m, render, bind)));
      m.querySelectorAll('[data-ad]').forEach((b) => b.addEventListener('click', () => this._skin('ad', b.dataset.ad, m, render, bind)));
    };
    bind();
  }

  _skin(act, id, m, render, bind) {
    const d = save.data;
    const s = SKINS.find((x) => x.id === id);
    const redraw = () => {
      m.querySelector('.mbody').innerHTML = render();
      bind();
      this.refresh();
    };
    if (act === 'pick') {
      this.click();
      d.skin = id;
      save.write();
      redraw();
    } else if (act === 'buy') {
      if(s.mastery)return;
      if (d.coins < s.price) {
        audio.play('deny');
        this.toast(t('notEnough'));
        return;
      }
      d.coins -= s.price;
      d.skins.push(id);
      d.skin = id;
      audio.play('buy');
      save.write();
      redraw();
    } else {
      sdk.showRewarded(() => {
        d.adSkins[id] = (d.adSkins[id] || 0) + 1;
        if (d.adSkins[id] >= s.ad) {
          d.skins.push(id);
          d.skin = id;
          audio.play('buy');
        }
        save.write();
        redraw();
      });
    }
  }

  openUpgrades() {
    const render = () => {
      const d = save.data;
      return `<div class="ups">${UPGRADES.map((u) => {
        const l = d.up[u.id] || 0;
        const maxed = l >= u.max;
        const cost = u.cost(l);
        return `<div class="upr"><div class="upi">${I.up}</div><div class="upt"><b>${esc(t('up_' + u.id))}</b><small>${esc(t('up_' + u.id + '_d'))}</small><div class="pips">${Array.from({ length: u.max }, (_, k) => `<i class="${k < l ? 'on' : ''}"></i>`).join('')}</div></div>${
          maxed ? `<button class="sbtn on" disabled>${esc(t('max'))}</button>` : `<button class="sbtn buy ${d.coins < cost ? 'poor' : ''}" data-up="${u.id}">${I.coin}${fmt(cost)}</button>`
        }</div>`;
      }).join('')}</div>`;
    };
    const m = this.modal(t('upgrades'), render());
    const bind = () =>
      m.querySelectorAll('[data-up]').forEach((b) =>
        b.addEventListener('click', () => {
          const d = save.data;
          const u = UPGRADES.find((x) => x.id === b.dataset.up);
          const l = d.up[u.id] || 0;
          const cost = u.cost(l);
          if (d.coins < cost) {
            audio.play('deny');
            this.toast(t('notEnough'));
            return;
          }
          d.coins -= cost;
          d.up[u.id] = l + 1;
          audio.play('upgrade');
          save.write();
          m.querySelector('.mbody').innerHTML = render();
          bind();
          this.refresh();
        }),
      );
    bind();
  }

  async openRecords() {
    const d = save.data;
    const solo = MAPS.map((mp) => {
      const s = d.solo[mp.id];
      return `<div class="lb-row"><span class="lb-n">${esc(t('map_' + mp.id))}</span><span class="mstars sm">${[1, 2, 3].map((k) => (s && s.stars >= k ? I.star : I.starOff)).join('')}</span><b>${s ? s.pct + '%' : '—'}</b></div>`;
    }).join('');
    const m = this.modal(t('records'), `<div class="col"><div class="mybest">${I.cup}<b>${esc(t('myBest', { n: fmt(d.best) }))}</b></div><div class="lbx" id="lbx">${esc(t('loading'))}</div><div class="subt">${esc(t('mode_solo'))}</div><div class="rtable">${solo}</div></div>`);
    const box=m.querySelector('#lbx');
    const entries=Object.values(d.records).filter(r=>r.pts>0).sort((a,b)=>b.pts-a.pts);
    box.innerHTML='<div class="muted small">'+esc(t('personalOnly'))+'</div>'+entries.map(r=>'<div class="lb-row"><span>'+esc(t('mode_'+r.mode))+' · '+esc(t('map_'+r.map))+'</span><b>'+fmt(r.pts)+'</b></div>').join('')+'<button class="btn mid blue story" hidden>'+I.cup+'<span>'+esc(t('story'))+'</span></button>';
    const button=box.querySelector('.story');button.addEventListener('click',()=>this._share(button,entries[0]||{pts:d.best,map:d.map}));
  }

  openCoins() {
    const d = save.data;
    const free = 120;
    const render = () => {
      const items = iap.items();
      const cards = items.map((x) => itemHTML(x, { owned: t('owned') })).join('');
      const ready = Date.now() - (d.freeAdAt || 0) > 60000;
      return `<div class="col"><div class="iap-item free"><div class="iap-ic">${I.coin}</div><div class="iap-tx"><b>+${free}</b><small>${esc(t('coins'))}</small></div><button class="iap-buy" id="free" ${ready ? '' : 'disabled'}>${I.ad}<span>${esc(t('freeCoins', { n: free }))}</span></button></div>${cards || `<div class="muted">${esc(t('storeEmpty'))}</div>`}</div>`;
    };
    const m = this.modal(t('storeTitle'), render());
    const bind = () => {
      const f = m.querySelector('#free');
      if (f)
        f.addEventListener('click', () => {
          f.disabled = true;
          sdk.showRewarded(() => {
            d.coins += free;
            d.freeAdAt = Date.now();
            audio.play('coin');
            save.write();
            this.refresh();
          },()=>{if(f.isConnected)f.disabled=Date.now()-(d.freeAdAt||0)<60000;});
        });
      m.querySelectorAll('.iap-buy[data-id]').forEach((b) =>
        b.addEventListener('click', async () => {
          m.querySelectorAll('.iap-buy').forEach((x) => (x.disabled = true));
          const ok = await iap.buy(b.dataset.id);
          if (ok && b.dataset.id === 'disable_ads') this.toast(t('noAdsBought'));
          if (ok) audio.play('buy');
          if (this.mroot === m) {
            m.querySelector('.mbody').innerHTML = render();
            bind();
          }
          this.refresh();
        }),
      );
    };
    bind();
    this.modalRefresh = () => {
      if (this.mroot !== m) return;
      m.querySelector('.mbody').innerHTML = render();
      bind();
    };
  }


  _art(id){const group=MAPS.find(m=>m.id===id)?.art || (['winter'].includes(id)?'aurora':id==='japan'||id==='castle'?'garden':'city');return window.__HS_ART__?.[group]||'';}
  _adButtons(){
    const available=sdk.canReward();
    document.querySelectorAll('#free,#gx2,#x2,#keep,[data-ad]').forEach(b=>{b.hidden=!available;b.setAttribute('aria-hidden',String(!available));});
  }
  _storyButtons(){document.querySelectorAll('.story').forEach(b=>{b.hidden=!sdk.canShareRecord() || !(this.g.lastRes?.pts || save.data.best || Object.keys(save.data.records).length);});}
  async _share(b,record){
    b.disabled=true;const r=await sdk.shareRecord(record);b.disabled=false;
    if(r.status==='cancelled')this.toast(t('storyCancel'));
    if(r.status==='timeout'||r.status==='unavailable')this.toast(t('storyUnavailable'));
  }
  openExpeditions(){
    const d=save.data;
    const content=MAPS.map(mp=>'<section class="exp-world"><h3>'+esc(t('map_'+mp.id))+'</h3><div class="exp-levels">'+EXPEDITIONS.filter(l=>l.map===mp.id).map(l=>{
      const stars=d.expeditions[l.id]||0,open=expeditionOpen(l.id,d);
      return '<button class="exp-level" data-exp="'+l.id+'" '+(!open?'disabled':'')+'><b>'+l.id+'</b><span>'+[1,2,3].map(k=>stars>=k?'★':'☆').join('')+'</span><small>'+esc(t('target',{n:l.target}))+'</small>'+(!open?I.lock:'')+'</button>';
    }).join('')+'</div></section>').join('');
    const m=this.modal(t('expeditions'),'<div class="expedition-list">'+content+'</div>');
    m.querySelectorAll('[data-exp]').forEach(b=>b.addEventListener('click',()=>{this.closeModal();this.g.play(Number(b.dataset.exp));}));
    m.querySelector('[data-exp="'+(EXPEDITIONS.find(l=>expeditionOpen(l.id,d)&&!(d.expeditions[l.id]>0))?.id||1)+'"]')?.scrollIntoView({block:'center'});
  }

  openSound() {
    const m = this.modal(t('sound'), `<div class="col">${slidersHTML(save.data.settings, { music: t('music'), sound: t('sounds') })}${this._fastToggle()}<button class="btn mid blue" id="retut">${esc(t('tutAgain'))}</button></div>`);
    bindSliders(m, save.data.settings, () => save.write());
    this._bindFast(m);
    const r = m.querySelector('#retut');
    r.addEventListener('click', () => {
      this.click();
      save.data.tutDone = false;
      save.write();
      r.disabled = true;
      this.toast(t('tutNext'));
    });
  }

  _pickImg(k) {
    if (!this._pk) this._pk = {};
    if (!this._pk[k]) this._pk[k] = pickIcon(k, 64).toDataURL();
    return `<img src="${this._pk[k]}" alt="">`;
  }

  // ---------- задания дня ----------
  openQuests() {
    const d = save.data;
    ensureDaily(d);
    const render = () => {
      const gift = d.rounds > 0 && giftReady(d);
      const qs = d.daily.q
        .map((q, i) => {
          const done = q.n >= q.need;
          const btn = q.got ? `<button class="sbtn on" disabled>${esc(t('taken'))}</button>` : done ? `<button class="sbtn buy" data-q="${i}">${I.coin}+${q.reward}</button>` : `<span class="qrew">${I.coin}${q.reward}</span>`;
          return `<div class="upr ${done && !q.got ? 'ready' : ''}"><div class="upi">${I.task}</div><div class="upt"><b>${esc(t('q_' + q.id, { n: q.need }))}</b><div class="bar"><i style="width:${Math.round((q.n / q.need) * 100)}%"></i></div><small>${fmt(q.n)} / ${fmt(q.need)}</small></div>${btn}</div>`;
        })
        .join('');
      return `<div class="col">${gift ? `<button class="btn mid green" id="ogift">${I.gift}<span>${esc(t('giftTitle'))}</span></button>` : ''}<div class="ups">${qs}</div><div class="muted small">${esc(t('questsNew'))}</div></div>`;
    };
    const m = this.modal(t('quests'), render());
    const bind = () => {
      m.querySelectorAll('[data-q]').forEach((b) =>
        b.addEventListener('click', () => {
          const q = d.daily.q[+b.dataset.q];
          if (!q || q.got || q.n < q.need) return;
          q.got = true;
          d.coins += q.reward;
          audio.play('coin');
          save.write();
          m.querySelector('.mbody').innerHTML = render();
          bind();
          this.refresh();
        }),
      );
      const g = m.querySelector('#ogift');
      if (g)
        g.addEventListener('click', () => {
          this.click();
          this.openGift();
        });
    };
    bind();
  }

  // ---------- подарок дня ----------
  openGift() {
    const d = save.data;
    if (!giftReady(d)) return;
    const k = giftDay(d);
    const days = GIFTS.map((n, i) => `<div class="gday ${i < k ? 'past' : i === k ? 'now' : ''}"><small>${esc(t('day', { n: i + 1 }))}</small>${i === GIFTS.length - 1 ? I.gift : I.coin}<b>${n}</b></div>`).join('');
    const m = this.modal(t('giftTitle'), `<div class="col"><div class="gdays">${days}</div><div class="muted small">${esc(t('giftD'))}</div><div class="row"><button class="btn mid green" id="gx2">${I.ad}<span>${esc(t('giftX2', { n: GIFTS[k] * 2 }))}</span></button><button class="btn mid blue" id="gtake">${I.coin}<span>${esc(t('giftTake', { n: GIFTS[k] }))}</span></button></div></div>`);
    const take = (mul) => {
      if (!giftReady(d)) return;
      const n = takeGift(d) * mul;
      d.coins += n;
      audio.play('buy');
      save.write();
      this.closeModal();
      this.toast(t('coinsBought', { n }));
      this.refresh();
    };
    m.querySelector('#gtake').addEventListener('click', () => take(1));
    m.querySelector('#gx2').addEventListener('click', (e) => {
      e.currentTarget.disabled = true;
      const b=e.currentTarget;const normal=m.querySelector('#gtake');normal.disabled=true;
      sdk.showRewarded(() => take(2),()=>{if(b.isConnected){b.disabled=false;normal.disabled=false;}});
    });
  }

  toast(s) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = s;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2300);
  }
}
