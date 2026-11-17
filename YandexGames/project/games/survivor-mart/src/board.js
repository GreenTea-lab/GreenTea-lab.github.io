// Планшет управления: план дня, персонал, вылазки, цены, постройки, снаряжение, навыки
import { IC } from './icons.js';
import { t, fmt } from './i18n.js';
import { save } from './save.js';
import { audio } from './audio.js';
import { GOOD_IDS, GOODS, LOCS, ROLES, WAGE, TRAIN_COST, WEAPONS, BUILD, BUILD_IDS, SKILLS, ENTRIES, isHorde, isBoss, START_SHELVES, SHELF_SLOTS, nightCount, dayZCount, newZombiesOn } from './data.js';
import { itemThumb, staffThumb, zombieThumb } from './thumbs.js';
import { perks, wageOf, barMax, PRICE_MULT } from './world.js';
import { esc, img } from './ui.js';
import { guideTitle } from './guide.js';

const TABS = ['plan', 'staff', 'trips', 'prices', 'build', 'gear', 'skills'];
const TAB_IC = { plan: 'clock', staff: 'staff', trips: 'map', prices: 'tag', build: 'hammer', gear: 'weapon', skills: 'skill' };
const BUILD_IC = { shelves: 'shelf', sign: 'tag', walls: 'shield', beds: 'staff', bench: 'bench', register: 'register', radio: 'tower' };
const WEAP_SVG = {
  pin: '<svg viewBox="0 0 32 32" stroke="#2a2430" stroke-width="2.2" stroke-linejoin="round"><rect x="5" y="13" width="22" height="6" rx="3" fill="#e0b07a" transform="rotate(-30 16 16)"/><path d="M5 22l-2 1M27 10l2-1" stroke-width="3.5"/></svg>',
  bat: '<svg viewBox="0 0 32 32" stroke="#2a2430" stroke-width="2.2" stroke-linejoin="round"><path d="M6 27l-2-2 16-16c3-3 6-3 7-2s1 4-2 7z" fill="#c4945a"/><path d="M4 25l3 3" stroke-width="3.5"/></svg>',
  sling: '<svg viewBox="0 0 32 32" stroke="#2a2430" stroke-width="2.4" stroke-linejoin="round" fill="none"><path d="M16 29V17M16 17L9 5M16 17l7-12" stroke="#a8744a" stroke-width="3.6"/><path d="M9 6c3 6 11 6 14 0" stroke="#e8504a"/></svg>',
  shovel: '<svg viewBox="0 0 32 32" stroke="#2a2430" stroke-width="2.2" stroke-linejoin="round"><path d="M18 14L6 26" stroke="#a8744a" stroke-width="3.5"/><path d="M17 15l-3-3 8-8c3-1 6 2 5 5z" fill="#8a96a8"/><path d="M4 24l4 4" stroke-width="3.5"/></svg>',
  nailgun: '<svg viewBox="0 0 32 32" stroke="#2a2430" stroke-width="2.2" stroke-linejoin="round"><rect x="4" y="9" width="22" height="9" rx="2" fill="#f2a63a"/><path d="M10 18l-2 9h6l2-9" fill="#3a3a40"/><path d="M26 13h3" stroke-width="3"/></svg>',
  axe: '<svg viewBox="0 0 32 32" stroke="#2a2430" stroke-width="2.2" stroke-linejoin="round"><path d="M22 6L6 26" stroke="#a8744a" stroke-width="3.5"/><path d="M18 6c4-3 9-1 10 3l-6 6c-1-4-2-6-4-9z" fill="#e84a3a"/></svg>',
};

export class Board {
  constructor(ui) {
    this.ui = ui;
    this.tab = 'plan';
    this.mode = 'morning';
  }

  open(mode = 'morning', tab) {
    this.mode = mode;
    if (tab) this.tab = tab;
    else if (mode === 'morning') this.tab = 'plan';
    this.render();
  }

  get g() {
    return this.ui.g;
  }

  render() {
    const ui = this.ui;
    const s = save.data;
    const tabs = TABS.map((k) => `<button class="ktab ${this.tab === k ? 'on' : ''}" data-tab="${k}">${IC[TAB_IC[k]]}<span>${esc(t('tab_' + k))}</span>${k === 'skills' && s.sp > 0 ? `<i class="dot">${s.sp}</i>` : ''}</button>`).join('');
    // обучение на планшете (второе утро)
    const T = s.tut;
    let tb = null;
    if (this.mode === 'morning' && s.day >= 2 && !T.skip) {
      if (this.tab === 'staff') T.b_staff = 1;
      if (this.tab === 'trips') T.b_trips = 1;
      const scav = s.staff.some((st) => st.role === 'scav');
      tb = !T.b_plan
        ? { id: 'b_plan', hl: null, txt: t('tb_plan'), ok: 1 }
        : !T.b_staff
          ? { id: 'b_staff', hl: '[data-tab="staff"]', txt: t('tb_staff') }
          : scav && !T.b_trips
            ? { id: 'b_trips', hl: '[data-tab="trips"]', txt: t('tb_trips') }
            : !T.b_guide
              ? { id: 'b_guide', hl: '[data-a="guide"]', txt: t('tb_guide'), ok: 1 }
              : !T.b_open
                ? { id: 'b_open', hl: '[data-open]', txt: t('tb_open') }
                : null;
    }
    const tbHTML = tb ? `<div class="tutb">${esc(tb.txt)}<div class="row">${tb.ok ? `<button class="btn mid green" data-tbn="1">${esc(t('gotIt'))}</button>` : ''}<button class="tutskip" data-tbs="1">${esc(t('tutSkip'))}</button></div></div>` : '';
    const body = tbHTML + this['tab_' + this.tab]();
    const go = this.mode === 'morning' ? `<button class="btn big green open" data-open="1">${IC.door}<span>${esc(t('openShop'))}</span></button>` : `<button class="btn big green open" data-close="1">${IC.play}<span>${esc(t('backToShop'))}</span></button>`;
    const sc = this.ui.root.querySelector('.kbody');
    const keep = sc && this.ui.screen === 'board' && this._lastTab === this.tab ? sc.scrollTop : 0;
    this._lastTab = this.tab;
    ui.set(
      `<div class="topbar"><div class="tb-l">${ui.chips()}</div><div class="tb-r"><div class="daychip">${IC.sun}<b>${esc(t('dayN', { n: s.day }))}</b></div><button class="btn round small" data-a="guide" title="${esc(guideTitle())}">${IC.book}</button><button class="btn round small" data-a="settings">${IC.gear}</button></div></div>
      <div class="ws-c"><div class="ws-panel">
        <div class="ktabs">${tabs}</div>
        <div class="kbody">${body}</div>
        <div class="kfoot">${go}</div>
      </div></div>`,
      'board'
    );
    const R = ui.root;
    const nb = R.querySelector('.kbody');
    if (nb) nb.scrollTop = keep;
    R.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => {
      this.tab = b.dataset.tab;
      audio.play('select');
      this.render();
    }));
    const op = R.querySelector('[data-open]');
    if (op)
      op.onclick = () => {
        if (s.day >= 2) T.b_open = 1;
        this.g.openShop();
      };
    if (tb && tb.hl) {
      const h = R.querySelector(tb.hl);
      if (h) h.classList.add('tut-hl');
    }
    const tn = R.querySelector('[data-tbn]');
    if (tn)
      tn.onclick = () => {
        T[tb.id] = 1;
        save.write();
        this.render();
      };
    const ts = R.querySelector('[data-tbs]');
    if (ts)
      ts.onclick = () => {
        T.skip = 1;
        save.write();
        this.render();
      };
    const cl = R.querySelector('[data-close]');
    if (cl) cl.onclick = () => this.g.resumeFromBoard();
    this['bind_' + this.tab] && this['bind_' + this.tab](R);
  }

  pay(cost, mats) {
    const s = save.data;
    if (s.bat < cost) {
      this.ui.poor && this.ui.poor();
      audio.play('deny');
      this.ui.toast(t('notEnough'));
      return false;
    }
    if (mats) for (const [k, n] of Object.entries(mats)) if ((s.stock[k] || 0) < n) {
      audio.play('deny');
      this.ui.toast(t('notEnoughMats'));
      return false;
    }
    s.bat -= cost;
    if (mats) for (const [k, n] of Object.entries(mats)) s.stock[k] -= n;
    save.write();
    return true;
  }

  matsHTML(mats) {
    const s = save.data;
    return Object.entries(mats || {})
      .map(([k, n]) => `<span class="rin ${s.stock[k] >= n ? '' : 'lack'}">${img(itemThumb(k))}<b>${n}</b></span>`)
      .join('');
  }

  // ---------- план дня ----------
  tab_plan() {
    const s = save.data;
    const d = s.day;
    const pk = perks(s.skills);
    const horde = isHorde(d);
    const fc = isBoss(d) ? t('fcBoss') : horde ? t('fcHorde', { n: nightCount(d) }) : t('fcQuiet', { n: nightCount(d) });
    const nz = newZombiesOn(d);
    const dz = dayZCount(d);
    const fcNew = nz.length ? `<div class="zrow">${nz.map((k) => `<img src="${zombieThumb(k)}" alt="" title="${esc(t('zn_' + k))}">`).join('')}<small>${esc(t('fcNew', { n: nz.map((k) => t('zn_' + k)).join(', ') }))}</small></div>` : '';
    const fcDay = dz >= 0.3 ? `<small>${esc(t(dz >= 2 ? 'fcDayMany' : 'fcDay'))}</small>` : '';
    const nextH = horde ? '' : t('fcNext', { n: [1, 2, 3].map((k) => d + k).find((x) => isHorde(x)) - d });
    const wages = s.staff.reduce((a, st) => a + wageOf(st, pk), 0);
    const unpaid = s.staff.filter((st) => st.unpaid).length;
    // баррикады
    let need = 0;
    const bars = ENTRIES.map((e) => {
      const max = barMax(e, s.build, pk);
      const v = s.barr[e.id];
      const hp = v < 0 ? max : Math.min(max, v);
      need += Math.ceil(((max - hp) / 25) * pk.repairCost);
      return `<span class="bchip ${hp / max < 0.4 ? 'bad' : ''}">${IC.shield}${esc(t('e_' + e.id))} <b>${Math.round((hp / max) * 100)}%</b></span>`;
    }).join('');
    const scavs = s.staff.filter((st) => st.role === 'scav');
    const crateReady = s.crateDay !== d;
    const tips = [];
    if (d <= 3 && !s.staff.length) tips.push(t('tipHire'));
    if (s.sp > 0) tips.push(t('tipSkill', { n: s.sp }));
    if (s.stock.trap > 0) tips.push(t('tipTrap', { n: s.stock.trap }));
    return `<div class="card fc ${horde ? 'horde' : ''}">${horde ? IC.zombie : IC.moon}<div><b>${esc(t('tonight'))}</b><small>${esc(fc)} ${esc(nextH)}</small>${fcDay}${fcNew}</div></div>
      <div class="card"><div class="ctl">${IC.shield}<b>${esc(t('barricades'))}</b></div><div class="bchips">${bars}</div>
        ${need > 0 ? `<button class="btn mid blue" data-fix="1" ${s.stock.wood > 0 ? '' : 'disabled'}>${IC.plank}${esc(t('fixAll', { n: Math.min(need, s.stock.wood), m: s.stock.wood }))}</button>` : `<small class="muted">${esc(t('barOk'))}</small>`}</div>
      <div class="card"><div class="ctl">${IC.staff}<b>${esc(t('team'))}</b></div>
        ${s.staff.length ? `<small>${esc(t('wagesPaid', { n: wages }))}${unpaid ? ' · ' + esc(t('unpaidN', { n: unpaid })) : ''}</small>` : `<small class="muted">${esc(t('noStaff'))}</small>`}
        ${scavs.map((st) => `<small>${IC.map} ${esc(st.name)}: ${esc(st.hurt ? t('resting') : st.loc ? t('loc_' + st.loc) : t('noTrip'))}</small>`).join('')}
      </div>
      <div class="free ${crateReady ? '' : 'off'}">${IC.crate}<div><b>${esc(t('crate'))}</b><small>${esc(t('crateSub'))}</small></div><button class="btn mid green" data-crate="1" ${crateReady ? '' : 'disabled'}>${IC.ad}${esc(t('watchAd'))}</button></div>
      ${tips.map((x) => `<div class="tipline">${esc(x)}</div>`).join('')}`;
  }

  bind_plan(R) {
    const s = save.data;
    const fx = R.querySelector('[data-fix]');
    if (fx)
      fx.onclick = () => {
        const pk = perks(s.skills);
        for (const e of ENTRIES) {
          const max = barMax(e, s.build, pk);
          let hp = s.barr[e.id] < 0 ? max : Math.min(max, s.barr[e.id]);
          while (hp < max && s.stock.wood > 0) {
            hp = Math.min(max, hp + 25 / pk.repairCost);
            s.stock.wood--;
          }
          s.barr[e.id] = hp >= max ? -1 : Math.round(hp);
        }
        save.write();
        audio.play('repair');
        this.render();
      };
    const cr = R.querySelector('[data-crate]');
    if (cr)
      cr.onclick = () => {
        cr.disabled = true;
        this.g.rewarded(() => {
          const got = this.g.crateLoot();
          s.crateDay = s.day;
          save.write();
          audio.play('buy');
          this.ui.toast(t('crateGot'));
          this.render();
          const box = document.createElement('div');
          box.className = 'toast items';
          box.innerHTML = this.ui.gotHTML(got);
          document.body.appendChild(box);
          setTimeout(() => box.remove(), 2600);
        });
      };
  }

  // ---------- персонал ----------
  tab_staff() {
    const s = save.data;
    const pk = perks(s.skills);
    const cap = 1 + s.build.beds;
    const card = (st, hired) => {
      const w = WAGE[st.lvl];
      const stars = Array.from({ length: 5 }, (_, k) => `<i class="${k < st.lvl ? 'on' : ''}"></i>`).join('');
      let status = '';
      if (hired) {
        if (st.hurt) status = `<em class="bad">${esc(t('resting'))}</em>`;
        else if (st.unpaid) status = `<em class="bad">${esc(t('unpaid'))}</em>`;
      }
      const btns = hired
        ? `${st.lvl < 5 ? `<button class="btn upg ${s.bat < TRAIN_COST[st.lvl + 1] ? 'poor' : ''}" data-train="${st.id}">${IC.up}<b>${fmt(TRAIN_COST[st.lvl + 1])}</b>${IC.bat}</button>` : ''}<button class="btn round small fire" data-fire="${st.id}" title="${esc(t('fire'))}">${IC.close}</button>`
        : `<button class="btn upg ${s.bat < w * 3 || s.staff.length >= cap ? 'poor' : ''}" data-hire="${st.id}">${esc(t('hire'))} <b>${fmt(w * 3)}</b>${IC.bat}</button>`;
      return `<div class="srow2">${img(staffThumb(st.role, st.look), 'sface')}<div class="uptx"><b>${esc(st.name)} <em>${esc(t('role_' + st.role))}</em></b><small>${esc(t('role_' + st.role + '_d'))}</small><div class="pips">${stars}</div><small>${esc(t('wage', { n: Math.round(w * pk.wage) }))} ${status}</small></div><div class="sbtn">${btns}</div></div>`;
    };
    return `<div class="ihead">${esc(t('myTeam', { n: s.staff.length, m: cap }))}</div>
      ${s.staff.length ? s.staff.map((st) => card(st, true)).join('') : `<div class="muted">${esc(t('noStaff'))}</div>`}
      <div class="ihead">${esc(t('candidates'))}</div>
      ${s.staff.length >= cap ? `<div class="tipline">${esc(t('needBeds'))}</div>` : ''}
      ${s.cand.map((c) => card(c, false)).join('') || `<div class="muted">${esc(t('noCand'))}</div>`}`;
  }

  bind_staff(R) {
    const s = save.data;
    R.querySelectorAll('[data-hire]').forEach((b) => (b.onclick = () => {
      const c = s.cand.find((x) => x.id === +b.dataset.hire);
      if (!c) return;
      if (s.staff.length >= 1 + s.build.beds) {
        audio.play('deny');
        this.ui.toast(t('needBeds'));
        return;
      }
      if (!this.pay(WAGE[c.lvl] * 3)) return;
      s.cand = s.cand.filter((x) => x !== c);
      if (c.role === 'scav') c.loc = 'market';
      s.staff.push(c);
      save.write();
      audio.play('buy');
      this.g.refreshStaff && this.g.refreshStaff();
      this.render();
    }));
    R.querySelectorAll('[data-train]').forEach((b) => (b.onclick = () => {
      const st = s.staff.find((x) => x.id === +b.dataset.train);
      if (!st || st.lvl >= 5) return;
      if (!this.pay(TRAIN_COST[st.lvl + 1])) return;
      st.lvl++;
      save.write();
      audio.play('upgrade');
      this.render();
    }));
    R.querySelectorAll('[data-fire]').forEach((b) => (b.onclick = () => {
      const st = s.staff.find((x) => x.id === +b.dataset.fire);
      if (!st) return;
      this.ui.confirm(t('fire'), t('fireQ', { n: st.name }), t('fireYes'), () => {
        s.staff = s.staff.filter((x) => x !== st);
        save.write();
        this.g.refreshStaff && this.g.refreshStaff();
        this.render();
      });
    }));
  }

  // ---------- вылазки ----------
  tab_trips() {
    const s = save.data;
    const scavs = s.staff.filter((st) => st.role === 'scav');
    const away = this.mode === 'pause';
    const cards = LOCS.map((L) => {
      const open = !!s.locs[L.id];
      const loot = Object.keys(L.loot)
        .map((k) => (k === 'bat' ? `<span class="li">${IC.bat}</span>` : `<span class="li">${img(itemThumb(k))}</span>`))
        .join('');
      const here = scavs.filter((st) => st.loc === L.id);
      const send = open ? scavs.filter((st) => st.loc !== L.id).map((st) => `<button class="btn chipbtn" data-send="${st.id}" data-loc="${L.id}">${IC.map}${esc(st.name)}</button>`).join('') : '';
      return `<div class="loc ${open ? '' : 'locked'}">
        <div class="lochead"><b>${esc(t('loc_' + L.id))}</b><span class="danger" title="${esc(t('danger'))}">${IC.zombie}${Math.round(L.danger * 100)}%</span></div>
        <div class="lloot">${loot}</div>
        ${open ? `<div class="lhere">${here.map((st) => `<span class="who">${img(staffThumb('scav', st.look), 'wf')}${esc(st.name)}</span>`).join('') || `<small class="muted">${esc(t('nobodyHere'))}</small>`}</div>${send ? `<div class="lsend">${send}</div>` : ''}` : `<button class="btn upg ${s.bat < L.cost ? 'poor' : ''}" data-unlock="${L.id}">${IC.lock}${esc(t('unlockPath'))} <b>${fmt(L.cost)}</b>${IC.bat}</button>`}
      </div>`;
    }).join('');
    return `<div class="tipline">${esc(scavs.length ? (away ? t('tripsNext') : t('tripsHow')) : t('tripsNoScav'))}</div><div class="locs">${cards}</div>`;
  }

  bind_trips(R) {
    const s = save.data;
    R.querySelectorAll('[data-unlock]').forEach((b) => (b.onclick = () => {
      const L = LOCS.find((l) => l.id === b.dataset.unlock);
      if (!this.pay(L.cost)) return;
      s.locs[L.id] = 1;
      save.write();
      audio.play('buy');
      this.render();
    }));
    R.querySelectorAll('[data-send]').forEach((b) => (b.onclick = () => {
      const st = s.staff.find((x) => x.id === +b.dataset.send);
      if (!st) return;
      st.loc = b.dataset.loc;
      save.write();
      audio.play('select');
      this.render();
    }));
  }

  // ---------- цены ----------
  tab_prices() {
    const s = save.data;
    const rows = GOOD_IDS.filter((id) => GOODS[id].day <= s.day + 1 || s.stock[id] > 0)
      .map((id) => {
        const pl = s.prices[id] ?? 1;
        const onShelf = s.shelves.filter((x) => x.type === id).reduce((a, x) => a + x.n, 0);
        const segs = [0, 1, 2].map((k) => `<button class="seg ${pl === k ? 'on' : ''} p${k}" data-pr="${id}" data-k="${k}">${Math.max(1, Math.round(GOODS[id].p * PRICE_MULT[k]))}</button>`).join('');
        return `<div class="prow">${img(itemThumb(id), 'pi')}<div class="uptx"><b>${esc(t('it_' + id))}</b><small>${esc(t('inStock', { n: s.stock[id], m: onShelf }))}</small></div><div class="segs">${segs}</div></div>`;
      })
      .join('');
    return `<div class="tipline">${esc(t('pricesHow'))}</div><div class="plegend"><span class="p0">${esc(t('cheap'))}</span><span class="p1">${esc(t('normal'))}</span><span class="p2">${esc(t('pricey'))}</span></div>${rows}`;
  }

  bind_prices(R) {
    const s = save.data;
    R.querySelectorAll('[data-pr]').forEach((b) => (b.onclick = () => {
      s.prices[b.dataset.pr] = +b.dataset.k;
      save.write();
      audio.play('select');
      this.render();
    }));
  }

  // ---------- постройки ----------
  tab_build() {
    const s = save.data;
    return BUILD_IDS.map((id) => {
      const B = BUILD[id];
      const lvl = s.build[id] || 0;
      const pips = Array.from({ length: B.max }, (_, k) => `<i class="${k < lvl ? 'on' : ''}"></i>`).join('');
      const cost = B.cost[lvl];
      const mats = B.mats && B.mats[lvl];
      let val = '';
      if (id === 'shelves') val = `${Math.min(SHELF_SLOTS.length, START_SHELVES + lvl)}`;
      if (id === 'beds') val = `${1 + lvl}`;
      if (id === 'sign') val = `+${lvl * 16}%`;
      if (id === 'walls') val = `${barMax(ENTRIES[0], s.build, perks(s.skills))}`;
      if (id === 'bench' || id === 'register') val = `${lvl + 1}`;
      if (id === 'radio') val = `${lvl}/5`;
      const btn = lvl >= B.max ? `<button class="btn upg max" disabled>${esc(t('maxed'))}</button>` : `<button class="btn upg ${s.bat < cost ? 'poor' : ''}" data-bd="${id}">${IC.up}<b>${fmt(cost)}</b>${IC.bat}</button>`;
      return `<div class="uprow ${id === 'radio' ? 'radio' : ''}"><div class="upic">${IC[BUILD_IC[id]]}</div><div class="uptx"><b>${esc(t('b_' + id))} <em>${esc(val)}</em></b><small>${esc(t('b_' + id + '_d'))}</small>${mats ? `<div class="rins">${this.matsHTML(mats)}</div>` : ''}<div class="pips">${pips}</div></div>${btn}</div>`;
    }).join('');
  }

  bind_build(R) {
    const s = save.data;
    R.querySelectorAll('[data-bd]').forEach((b) => (b.onclick = () => {
      const id = b.dataset.bd;
      const B = BUILD[id];
      const lvl = s.build[id] || 0;
      if (lvl >= B.max) return;
      if (!this.pay(B.cost[lvl], B.mats && B.mats[lvl])) return;
      s.build[id] = lvl + 1;
      if (id === 'walls') for (const e of ENTRIES) if (s.barr[e.id] >= 0) s.barr[e.id] += 50; // чуть подлатать
      save.write();
      audio.play('upgrade');
      this.g.onBuilt && this.g.onBuilt(id);
      this.render();
    }));
  }

  // ---------- снаряжение ----------
  tab_gear() {
    const s = save.data;
    const rows = WEAPONS.map((W) => {
      const own = s.weapons.includes(W.id);
      const on = s.weapon === W.id;
      const st = `${t('dmg')} ${W.dmg} · ${W.ranged ? t('ranged') : t('melee')} · ${t('speed')} ${(1 / W.cd).toFixed(1)}/${t('sec')}${W.arc ? ' · ' + t('arc') : ''}`;
      const btn = on
        ? `<span class="wear">${IC.check}${esc(t('equipped'))}</span>`
        : own
          ? `<button class="btn upg" data-eq="${W.id}">${esc(t('equip'))}</button>`
          : `<button class="btn upg ${s.bat < W.cost ? 'poor' : ''}" data-wb="${W.id}"><b>${fmt(W.cost)}</b>${IC.bat}</button>`;
      return `<div class="uprow ${on ? 'sel' : ''}"><div class="upic">${WEAP_SVG[W.id]}</div><div class="uptx"><b>${esc(t('w_' + W.id))}</b><small>${esc(st)}</small>${!own ? `<div class="rins">${this.matsHTML(W.mats)}</div>` : ''}</div>${btn}</div>`;
    }).join('');
    return `${rows}<div class="card"><div class="ctl">${IC.trap}<b>${esc(t('traps'))}: ${s.stock.trap}</b></div><small>${esc(t('trapsHow'))}</small></div>`;
  }

  bind_gear(R) {
    const s = save.data;
    R.querySelectorAll('[data-eq]').forEach((b) => (b.onclick = () => {
      s.weapon = b.dataset.eq;
      save.write();
      audio.play('select');
      this.g.onWeapon && this.g.onWeapon();
      this.render();
    }));
    R.querySelectorAll('[data-wb]').forEach((b) => (b.onclick = () => {
      const W = WEAPONS.find((w) => w.id === b.dataset.wb);
      if (!this.pay(W.cost, W.mats)) return;
      s.weapons.push(W.id);
      s.weapon = W.id;
      save.write();
      audio.play('buy');
      this.g.onWeapon && this.g.onWeapon();
      this.render();
    }));
  }

  // ---------- навыки ----------
  tab_skills() {
    const s = save.data;
    const cols = Object.keys(SKILLS)
      .map((br) => {
        const lvl = s.skills[br];
        const nodes = Array.from({ length: SKILLS[br] }, (_, k) => {
          const st = k < lvl ? 'on' : k === lvl ? (s.sp > 0 ? 'can' : 'next') : 'off';
          return `<button class="snode ${st}" ${st === 'can' ? `data-sk="${br}"` : 'disabled'}><b>${esc(t(`sk_${br}${k}`))}</b><small>${esc(t(`sk_${br}${k}_d`))}</small></button>`;
        }).join('<i class="slink"></i>');
        return `<div class="scol"><div class="shead">${esc(t('br_' + br))}</div>${nodes}</div>`;
      })
      .join('');
    return `<div class="tipline">${esc(s.sp > 0 ? t('spHave', { n: s.sp }) : t('spNone'))}</div><div class="sgrid2">${cols}</div>`;
  }

  bind_skills(R) {
    const s = save.data;
    R.querySelectorAll('[data-sk]').forEach((b) => (b.onclick = () => {
      if (s.sp <= 0) return;
      s.sp--;
      s.skills[b.dataset.sk]++;
      save.write();
      audio.play('upgrade');
      this.g.onSkill && this.g.onSkill();
      this.render();
    }));
  }
}
