// DOM-интерфейс: меню, карта уровней, HUD, окна
import * as THREE from 'three';
import { t, fmt } from './i18n.js';
import { IC, AMMO_IC } from './icons.js';
import { audio } from './audio.js';
import { sdk } from './sdk.js';
import { LEVELS } from './levels.js';
import { AMMO_ORDER, SKIN_LIST, SKIN_PRICES, BOOSTER_PRICE } from './game.js';
import { SKINS } from './models.js';
import { iap, itemHTML } from './iap.js';
import { slidersHTML, bindSliders, volumeCss } from './volume.js';

const h = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

export class UI {
  constructor(game, root) {
    this.g = game;
    this.root = root;
    this.modalOpen = false;
    this.floaters = [];
    this.layer = h('div', 'layer');
    this.floatLayer = h('div', 'floats');
    root.append(this.layer, this.floatLayer);
    this.tmpV = new THREE.Vector3();
    const st = document.createElement('style');
    st.textContent = volumeCss({ accent: '#53a63c', track: '#e3cfa0', thumb: '#fff6dc', muted: '#8a6a40' });
    document.head.appendChild(st);
  }

  btn(cls, html, fn, sound = 'click') {
    const b = h('button', 'btn ' + cls, html);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.unlock();
      if (sound) audio.play(sound);
      fn && fn(e);
    });
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    return b;
  }

  goldChip() {
    const c = h('div', 'chip gold', `${IC.gold}<b>${fmt(this.g.s.gold)}</b>`);
    this._gold = c.querySelector('b');
    // по нажатию на золото открывается лавка (если окно лавки ещё не открыто)
    c.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this._modal && this._modal.querySelector('.panel.shop')) return;
      if (this.g.state !== 'menu') return;
      audio.play('click');
      this.shopModal();
    });
    return c;
  }
  refreshGold() {
    this.root.querySelectorAll('.chip.gold b').forEach((e) => (e.textContent = fmt(this.g.s.gold)));
  }

  clear() {
    this.layer.innerHTML = '';
    this.hud = null;
  }

  // ---------- главное меню ----------
  showMenu() {
    this.clear();
    this.closeModal();
    const s = this.g.s;
    const scr = h('div', 'screen menu');
    const top = h('div', 'topbar');
    top.append(h('div', 'chip stars', `${IC.star}<b>${s.stars.reduce((a, b) => a + b, 0)}/${LEVELS.length * 3}</b>`), this.goldChip());
    const logo = h('div', 'logo', `<div class="logo-t">${t('title')}</div>`);
    const play = this.btn('big green play', `${IC.play}<span>${t('play')}</span>`, () => this.g.toMap());
    const row = h('div', 'row');
    row.append(
      this.btn('round', IC.shop, () => this.shopModal()),
      this.btn('round', IC.trophy, () => this.leaderboardModal()),
      this.btn('round', IC.gear, () => this.settingsModal()),
    );
    scr.append(top, logo, play, row);
    this.layer.append(scr);
  }

  // ---------- карта уровней ----------
  showMap(world) {
    this.clear();
    this.closeModal();
    this.world = world;
    const g = this.g;
    const scr = h('div', 'screen map');
    const top = h('div', 'topbar');
    top.append(this.btn('round small', IC.back, () => g.toMenu()));
    const title = h('div', 'world-title');
    const prev = this.btn('arrow', '‹', () => this.showMap((world + 2) % 3));
    const next = this.btn('arrow', '›', () => this.showMap((world + 1) % 3));
    const stars = g.s.stars.slice(world * 10, world * 10 + 10).reduce((a, b) => a + b, 0);
    title.append(prev, h('div', 'wt', `<div>${t('world' + world)}</div><small>${IC.star} ${stars}/30</small>`), next);
    top.append(title, this.goldChip());
    const grid = h('div', 'levels w' + world);
    const cur = g.nextLevel();
    for (let i = world * 10; i < world * 10 + 10; i++) {
      const open = g.unlocked(i);
      const st = g.s.stars[i];
      const b = this.btn(
        'lvl' + (open ? '' : ' locked') + (i === cur ? ' current' : '') + (LEVELS[i].boss ? ' boss' : ''),
        `${LEVELS[i].boss ? `<i class="crown">${IC.crown}</i>` : ''}<span class="n">${open ? i + 1 : IC.lock}</span><span class="st">${[0, 1, 2].map((k) => `<i class="${k < st ? 'on' : ''}">${IC.star}</i>`).join('')}</span>`,
        () => {
          if (!open) {
            audio.play('error');
            return;
          }
          g.startLevel(i);
        },
      );
      grid.append(b);
    }
    scr.append(top, grid);
    if (!g.unlocked(world * 10)) scr.append(h('div', 'world-lock', `${IC.lock}<div>${t('locked')}</div>`));
    if (g.s.daily !== todayKey()) scr.append(this.btn('round gift', IC.gift, () => this.dailyModal()));
    this.layer.append(scr);
  }

  // ---------- HUD ----------
  showHUD() {
    this.clear();
    this.closeModal();
    const g = this.g;
    const hud = (this.hud = h('div', 'hud'));
    const tl = h('div', 'tl');
    tl.append(this.btn('round small', IC.pause, () => this.pauseModal()), (this.hLevel = h('div', 'lvl-label')));
    this.hScore = h('div', 'score');
    this.hEnemies = h('div', 'chip enemies');
    const tr = h('div', 'tr');
    tr.append(this.hEnemies);
    const bottom = h('div', 'bottom');
    this.hArc = this.btn('tool arc', '', () => g.toggleArc(), null);
    this.hAmmo = h('div', 'ammo');
    this.hLook = this.btn('tool look', `${IC.eye}<span>${t('look')}</span>`, () => g.toggleLook(), 'select');
    bottom.append(this.hArc, this.hAmmo, this.hLook);
    this.hFlight = h('div', 'flight-hint');
    hud.append(tl, this.hScore, tr, bottom, this.hFlight);
    this.layer.append(hud);
  }

  setActive(on) {
    if (this.hud) this.hud.classList.toggle('busy', !on);
  }

  updateHUD(d) {
    if (!this.hud) return;
    this.hLevel.textContent = t('level', { n: d.level + 1 });
    this.hScore.innerHTML = `<small>${t('score')}</small>${fmt(d.score)}`;
    this.hEnemies.innerHTML = `${IC.goblin}<b>${d.enemies}</b>`;
    this.hArc.innerHTML = `${d.arc === 'high' ? IC.arcHigh : IC.arcLow}<span>${t(d.arc === 'high' ? 'arcHigh' : 'arcLow')}</span>`;
    this.hArc.classList.toggle('on', d.arc === 'high');
    this.hLook.classList.toggle('on', !!d.look);
    const a = this.hAmmo;
    a.innerHTML = '';
    for (const k of AMMO_ORDER) {
      if (d.ammo[k] === undefined) continue;
      const b = this.btn('am' + (d.sel === k ? ' sel' : '') + (d.ammo[k] ? '' : ' empty'), `${AMMO_IC[k]}<b>${d.ammo[k]}</b>`, () => this.g.selectAmmo(k), null);
      b.title = t('ammo_' + k);
      a.append(b);
    }
    const boost = this.btn('am boost', `${AMMO_IC.iron}<i class="plus">${IC.plus}</i>${d.boost ? `<b>${d.boost}</b>` : ''}`, () => this.g.useBooster(), 'click');
    a.append(boost);
  }

  flightHint(text) {
    if (!this.hFlight) return;
    this.hFlight.textContent = text || '';
    this.hFlight.classList.toggle('show', !!text);
  }

  banner(title, sub) {
    const b = h('div', 'banner', `<div class="bt">${title}</div><div class="bs">${sub || ''}</div>`);
    this.root.append(b);
    setTimeout(() => b.remove(), 2600);
  }

  toast(text) {
    const e = h('div', 'toast', text);
    this.root.append(e);
    setTimeout(() => e.remove(), 1800);
  }

  floaterWorld(p, text, cls) {
    const e = h('div', 'floater ' + cls, text);
    this.floatLayer.append(e);
    this.floaters.push({ e, p: new THREE.Vector3(p.x, p.y + 0.6, p.z), t: 0 });
  }

  frame(dt) {
    if (!this.floaters.length) return;
    const cam = this.g.scene.camera;
    const W = window.innerWidth;
    const H = window.innerHeight;
    this.floaters = this.floaters.filter((f) => {
      f.t += dt;
      if (f.t > 1.3) {
        f.e.remove();
        return false;
      }
      f.p.y += dt * 1.2;
      const v = this.tmpV.copy(f.p).project(cam);
      if (v.z > 1) {
        f.e.style.opacity = 0;
        return true;
      }
      f.e.style.transform = `translate(${((v.x + 1) / 2) * W}px, ${((1 - v.y) / 2) * H}px) translate(-50%,-50%) scale(${f.t < 0.15 ? 0.6 + f.t * 2.6 : 1})`;
      f.e.style.opacity = f.t > 0.9 ? (1.3 - f.t) / 0.4 : 1;
      return true;
    });
  }

  // ---------- окна ----------
  modal(cls, build, opts = {}) {
    this.closeModal();
    this.modalOpen = true;
    const bg = h('div', 'modal-bg');
    const p = h('div', 'panel ' + cls);
    if (opts.title) p.append(h('div', 'ribbon', opts.title));
    if (opts.close !== false)
      p.append(
        this.btn('x', IC.close, () => {
          this.closeModal();
          opts.onClose && opts.onClose();
        }),
      );
    if (opts.scroll) {
      const body = h('div', 'pbody');
      p.append(body);
      build(body);
    } else build(p);
    bg.append(p);
    bg.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.root.append(bg);
    this._modal = bg;
    this._rebuild = () => this.modal(cls, build, opts);
    return p;
  }
  closeModal() {
    if (this._modal) this._modal.remove();
    this._modal = null;
    this.modalOpen = false;
    if (this._unpause) {
      const f = this._unpause;
      this._unpause = null;
      f();
    }
  }
  refreshModal() {
    if (this._modal && this._rebuild) {
      const u = this._unpause;
      this._unpause = null;
      this._rebuild();
      this._unpause = u;
    }
    this.refreshGold();
  }

  pauseModal() {
    const g = this.g;
    if (g.state === 'menu' || g.result) return;
    g.pause(true);
    this.modal(
      'pause',
      (p) => {
        const col = h('div', 'col');
        col.append(
          this.btn('big green', `${IC.play}<span>${t('resume')}</span>`, () => this.closeModal()),
          this.btn('big', `${IC.restart}<span>${t('restart')}</span>`, () => {
            this.closeModal();
            g.restart();
          }),
          this.btn('big', `${IC.map}<span>${t('map')}</span>`, () => {
            this.closeModal();
            g.exitToMap();
          }),
        );
        p.append(col, this.toggles());
      },
      { title: t('pause') },
    );
    this._unpause = () => g.pause(false);
  }

  // ползунки громкости музыки и звуков
  toggles() {
    const g = this.g;
    const box = h('div', 'vol-wrap', slidersHTML(g.s.settings, { music: t('music'), sound: t('sound') }, { music: IC.music, sfx: IC.sound }));
    bindSliders(box, g.s.settings, () => g.save());
    return box;
  }

  winModal(w) {
    const g = this.g;
    this.modal(
      'win',
      (p) => {
        const st = h('div', 'stars-big');
        for (let k = 0; k < 3; k++) {
          const s = h('i', k < w.stars ? 'on' : '', IC.star);
          if (k < w.stars && !w.shown) {
            s.classList.add('pop');
            s.style.animationDelay = 0.25 + k * 0.35 + 's';
            setTimeout(() => audio.play('star', k), 250 + k * 350);
          }
          st.append(s);
        }
        p.append(st);
        p.append(h('div', 'big-score', fmt(w.score)));
        if (w.bonus) p.append(h('div', 'line', `${t('bonusShots')}: +${fmt(w.bonus)}`));
        p.append(h('div', 'line ' + (w.newBest ? 'best' : ''), w.newBest ? t('newBest') : t('best', { n: fmt(w.best) })));
        const gold = h('div', 'reward', `${IC.gold}<b>+${fmt(w.doubled ? w.gold * 2 : w.gold)}</b>`);
        p.append(gold);
        if (!w.doubled) p.append(this.btn('ad', `${IC.ad}<span>${t('x2')}</span>`, () => g.doubleGold()));
        const row = h('div', 'row');
        row.append(
          this.btn('round', IC.map, () => g.exitToMap()),
          this.btn('round', IC.restart, () => g.restart()),
          this.btn('big green', `<span>${t('next')}</span>${IC.play}`, () => g.next()),
        );
        p.append(row);
        w.shown = true;
      },
      { title: t('win'), close: false },
    );
  }

  loseModal({ canAd }) {
    const g = this.g;
    this.modal(
      'lose',
      (p) => {
        p.append(h('div', 'lose-ic', IC.goblin));
        p.append(h('div', 'sub', t('loseSub')));
        if (canAd) p.append(this.btn('ad big', `${IC.ad}<span>${t('extraShot')}</span>`, () => g.extraShot()));
        const row = h('div', 'row');
        row.append(this.btn('round', IC.map, () => g.exitToMap()), this.btn('big green', `${IC.restart}<span>${t('restart')}</span>`, () => g.restart()));
        p.append(row);
      },
      { title: t('lose'), close: false },
    );
  }

  hint(key, done) {
    const g = this.g;
    g.pause(true);
    const e = h('div', 'hint ' + key, `<div class="ht">${t('hint_' + key)}</div>`);
    if (key === 'aim') e.prepend(h('div', 'hand', '<i></i>'));
    const ok = this.btn('green', t('ok'), () => {
      e.remove();
      g.pause(false);
      this.modalOpen = false;
      done && done();
    });
    e.append(ok);
    this.modalOpen = true;
    this.root.append(e);
  }

  newAmmo(type, done) {
    const g = this.g;
    g.pause(true);
    this.modal(
      'newammo',
      (p) => {
        p.append(h('div', 'ammo-big', AMMO_IC[type]));
        p.append(h('div', 'big-name', t('ammo_' + type)));
        const hk = { bomb: 'hint_bomb', iron: 'hint_iron', split: 'hint_split', fire: 'hint_fire' }[type];
        if (hk) p.append(h('div', 'sub', t(hk)));
        p.append(
          this.btn('big green', t('ok'), () => {
            this.closeModal();
          }),
        );
      },
      { title: t('newAmmo'), close: false },
    );
    this._unpause = () => {
      g.pause(false);
      if (type === 'bomb' || type === 'split' || type === 'iron' || type === 'fire') g.s.hints[type] = 1;
      done && done();
    };
  }

  shopModal() {
    const g = this.g;
    this.modal(
      'shop',
      (p) => {
        p.append(this.goldChip());
        if (iap.available()) {
          // сокровищница: товары за портальную валюту из каталога консоли
          p.append(h('div', 'sec', t('treasury')));
          const box = h('div', 'iap-box', iap.items().map((x) => itemHTML(x, { owned: t('iapOwned') })).join(''));
          box.querySelectorAll('.iap-buy[data-id]').forEach((b) => {
            b.addEventListener('pointerdown', (e) => e.stopPropagation());
            b.addEventListener('click', async (e) => {
              e.stopPropagation();
              audio.play('click');
              box.querySelectorAll('.iap-buy').forEach((x) => (x.disabled = true));
              await g.buyIap(b.dataset.id);
            });
          });
          p.append(box);
        }
        p.append(h('div', 'sec', t('skins')));
        const grid = h('div', 'skins');
        for (const id of SKIN_LIST) {
          const S = SKINS[id];
          const owned = g.s.skins.includes(id);
          const eq = g.s.skin === id;
          const card = h('div', 'skin' + (eq ? ' eq' : ''));
          card.append(
            h(
              'div',
              'sw',
              `<i style="background:#${S.wood.toString(16).padStart(6, '0')}"></i><i style="background:#${S.dark.toString(16).padStart(6, '0')}"></i><i style="background:#${S.metal.toString(16).padStart(6, '0')}"></i><i style="background:#${S.accent.toString(16).padStart(6, '0')}"></i>`,
            ),
          );
          card.append(h('div', 'nm', t('skin_' + id)));
          card.append(
            this.btn(
              eq ? 'small done' : owned ? 'small' : 'small gold-btn',
              eq ? `${IC.check}` : owned ? t('equip') : `${IC.gold}<b>${fmt(SKIN_PRICES[id])}</b>`,
              () => {
                if (!eq && g.buySkin(id)) this.refreshModal();
              },
              null,
            ),
          );
          grid.append(card);
        }
        p.append(grid);
        p.append(h('div', 'sec', t('boosters')));
        const b = h('div', 'booster');
        b.append(h('div', 'bi', AMMO_IC.iron), h('div', 'bt', `<b>${t('boosterIron')}</b><small>${t('boosterIronSub')}</small><small>${t('owned', { n: g.s.boost })}</small>`));
        const bb = h('div', 'col');
        bb.append(this.btn('small gold-btn', `${IC.gold}<b>${BOOSTER_PRICE}</b>`, () => g.buyBooster(false), null), this.btn('small ad', `${IC.ad}<b>+1</b>`, () => g.buyBooster(true)));
        b.append(bb);
        p.append(b);
      },
      { title: t('shop'), scroll: true },
    );
  }

  boosterModal() {
    const g = this.g;
    const wasPaused = g.paused;
    g.pause(true);
    this.modal(
      'boostm',
      (p) => {
        p.append(h('div', 'ammo-big', AMMO_IC.iron));
        p.append(h('div', 'sub', t('boosterIronSub')));
        const row = h('div', 'row');
        row.append(
          this.btn('big gold-btn', `${IC.gold}<b>${BOOSTER_PRICE}</b>`, () => {
            g.buyBooster(false);
            if (g.s.boost > 0) {
              this.closeModal();
              g.useBooster();
            }
          }, null),
          this.btn('big ad', `${IC.ad}<span>+1</span>`, () => {
            g.rewarded(() => {
              g.s.boost++;
              this.closeModal();
              g.useBooster();
            });
          }),
        );
        p.append(row);
        p.append(this.goldChip());
      },
      { title: t('boosterIron') },
    );
    this._unpause = () => g.pause(wasPaused);
  }

  settingsModal() {
    const g = this.g;
    this.modal(
      'settings',
      (p) => {
        p.append(this.toggles());
        const q = g.s.settings.quality;
        p.append(h('div', 'sec', t('quality')));
        const row = h('div', 'row qual');
        for (const k of ['auto', 'high', 'mid', 'low']) {
          row.append(
            this.btn('small' + (q === k ? ' sel' : ''), t('q' + k), () => {
              g.s.settings.quality = k;
              g.setQuality(k === 'auto' ? (g.mobile ? 'mid' : 'high') : k);
              g.save();
              this.refreshModal();
            }),
          );
        }
        p.append(row);
      },
      { title: t('settings') },
    );
  }

  async leaderboardModal() {
    const g = this.g;
    const p = this.modal('lb', (p) => p.append(h('div', 'sub', '...')), { title: t('leaderboard') });
    const res = await sdk.getLeaderboard();
    if (!this._modal || !p.isConnected) return;
    p.querySelectorAll('.sub,.lb-list,.btn.big').forEach((e) => e.remove());
    p.append(h('div', 'sub', t('total', { n: fmt(g.totalScore()) })));
    if (!res.available) {
      p.append(h('div', 'sub', t('lbOffline')));
      return;
    }
    const list = h('div', 'lb-list');
    if (!res.entries.length) list.append(h('div', 'sub', t('lbEmpty')));
    for (const e of res.entries) list.append(h('div', 'lb-row' + (e.me ? ' me' : ''), `<b>${e.rank}</b><span>${escapeHtml(e.name || '—')}</span><i>${fmt(e.score)}</i>`));
    p.append(list);
    if (!res.authorized)
      p.append(
        this.btn('big green', t('lbLoginBtn'), async () => {
          if (await sdk.login()) {
            sdk.submitScore(g.totalScore());
            this.leaderboardModal();
          }
        }),
      );
  }

  dailyModal() {
    const g = this.g;
    if (g.s.daily === todayKey()) return;
    this.modal(
      'daily',
      (p) => {
        p.append(h('div', 'gift-big', IC.gift));
        p.append(h('div', 'sub', t('dailySub')));
        p.append(h('div', 'reward', `${IC.gold}<b>+100</b>`));
        const row = h('div', 'row');
        row.append(this.btn('big', t('take'), () => g.takeDaily(false)), this.btn('big ad', `${IC.ad}<span>${t('takeX3')}</span>`, () => g.takeDaily(true)));
        p.append(row);
      },
      { title: t('daily') },
    );
  }
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
