// Холст: веранда, карты (плавные перелёты и переворот), соперники, подсветка целей, реплики.
import { buildScene, drawAnims, roundRect } from './scene.js';
import { CardArt, suitPath, COLORS2 } from './cards.js';
import { drawAvatar } from './avatars.js';
import { suit, rank } from './core.js';
import { t, LANG } from './i18n.js';

const P2 = Math.PI * 2;
const FONT = 'Nunito, "Arial Rounded MT Bold", Arial, sans-serif';
const hash = (n) => {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 13;
  return (x % 1000) / 1000;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class View {
  constructor(cv) {
    this.cv = cv;
    this.g = cv.getContext('2d');
    this.art = new CardArt();
    this.t = 0;
    this.sp = new Map(); // id → спрайт карты
    this.hold = new Map(); // id → время, до которого карта ждёт в колоде (раздача по очереди)
    this.bubbles = [];
    this.fx = [];
    this.cloth = 'felt';
    this.back = 'classic';
    this.four = false;
    this.n = 2;
    this.mode = 'menu';
    this.avoidExtra = [];
  }

  resize(W, H, dpr) {
    this.W = W;
    this.H = H;
    this.dpr = dpr;
    this.cv.width = Math.round(W * dpr);
    this.cv.height = Math.round(H * dpr);
    this.layout();
    this.rebuild();
  }

  setN(n) {
    if (n === this.n) return;
    this.n = n;
    if (this.W) {
      this.layout();
      this.rebuild();
    }
  }

  // ---------- раскладка ----------
  layout() {
    const { W, H } = this;
    const port = H > W * 1.05;
    const L = { W, H, port };
    const n = this.n;
    const opp = n - 1;
    // размеры карт
    let cw, tw;
    if (port) {
      cw = clamp(Math.min(W * 0.225, H * 0.115), 62, 130);
      tw = clamp(Math.min(W * 0.2, H * 0.1), 56, 120);
    } else {
      cw = clamp(Math.min(H * 0.165, W * 0.1), 62, 170);
      tw = clamp(Math.min(H * 0.135, W * 0.085), 56, 150);
    }
    L.cw = cw;
    L.ch = cw * 1.42;
    L.tw = tw;
    L.th = tw * 1.42;
    L.ts = tw / cw; // масштаб карт на столе относительно руки
    const top = port ? 74 : 34; // место под кнопки сверху
    // соперники
    const ar = port ? clamp(Math.min(W / (opp * 2 + 1.6), H * 0.05), 24, 44) : clamp(H * 0.062, 28, 58);
    L.ar = ar;
    const seats = [null];
    const topY = top + ar * 1.55;
    if (port) {
      for (let k = 0; k < opp; k++) {
        const fx = opp === 1 ? 0.5 : 0.13 + (0.74 * k) / (opp - 1);
        const edge = opp >= 4 && (k === 0 || k === opp - 1);
        seats.push({ x: W * fx, y: topY + (edge ? ar * 0.9 : 0), side: 0 });
      }
    } else {
      const sideX = W * 0.07, sideY = H * 0.36;
      const topXs = { 1: [0.5], 2: [0.33, 0.67], 3: [0.5], 4: [0.36, 0.64], 5: [0.3, 0.5, 0.7] }[opp];
      const sides = opp >= 3;
      if (sides) seats.push({ x: sideX, y: sideY, side: -1 });
      for (const fx of topXs) seats.push({ x: W * fx, y: topY, side: 0 });
      if (sides) seats.push({ x: W - sideX, y: sideY, side: 1 });
    }
    for (let i = 1; i < seats.length; i++) {
      const s = seats[i];
      s.r = ar;
      s.bw = ar * 0.95; // ширина рубашки в веере
    }
    L.seats = seats;
    const seatBottom = Math.max(...seats.slice(1).filter((s) => port || !s.side).map((s) => s.y + s.r + clamp(s.r * 0.46, 13, 20) * 2.6));
    // рука игрока
    const handH = L.ch;
    L.handY = H - handH * 0.5 - (port ? 14 : 16); // центр карт руки
    L.handX0 = port ? 8 : W * 0.16;
    L.handX1 = port ? W - 8 : W * 0.84;
    // строка подсказки и кнопки над рукой
    L.promptY = L.handY - handH * 0.5 - (port ? 116 : 44);
    // стол
    if (port) {
      L.deck = { x: W * 0.16, y: seatBottom + L.th * 0.55 };
      L.discard = { x: W * 0.84, y: L.deck.y };
      const ty0 = L.deck.y + L.th * 0.55 + 6, ty1 = L.promptY - 30;
      L.zone = { x: W * 0.03, y: ty0, w: W * 0.94, h: Math.max(L.th * 1.3, ty1 - ty0) };
    } else {
      L.deck = { x: W * 0.17, y: H * 0.47 };
      L.discard = { x: W * 0.83, y: H * 0.47 };
      const ty0 = Math.max(seatBottom + 6, H * 0.2), ty1 = L.promptY - 26;
      L.zone = { x: W * 0.26, y: ty0, w: W * 0.48, h: Math.max(L.th * 1.3, ty1 - ty0) };
    }
    // ячейки пар на столе: 3×2 или 6 в ряд
    const Z = L.zone;
    const pairW = L.tw * 1.32, pairH = L.th * 1.2;
    let cols = 3;
    if (!port && Z.w >= pairW * 6 && Z.h < pairH * 2.1) cols = 6;
    const rows = 6 / cols;
    // масштаб, если не помещается
    const need = Math.max((pairW * cols) / Z.w, (pairH * rows) / Z.h, 1);
    if (need > 1) {
      L.tw /= need;
      L.th /= need;
      L.ts = L.tw / cw;
    }
    L.cols = cols;
    L.pairW = L.tw * 1.32;
    L.pairH = L.th * 1.2;
    // ячейки зависят от числа пар: ряды по центру стола
    L.slotsFor = (cnt) => {
      cnt = Math.max(1, Math.min(6, cnt));
      const nr = Math.ceil(cnt / cols);
      const out = [];
      for (let k = 0; k < cnt; k++) {
        const r = Math.floor(k / cols), inRow = r < nr - 1 ? cols : cnt - r * cols, c = k - r * cols;
        out.push({ x: Z.x + Z.w / 2 + L.pairW * (c - (inRow - 1) / 2) - L.tw * 0.1, y: Z.y + Z.h / 2 + L.pairH * (r - (nr - 1) / 2) - L.th * 0.06 });
      }
      return out;
    };
    L.slots = L.slotsFor(6);
    // зоны, которые нельзя закрывать вещами фона
    const av = [];
    for (const s of seats.slice(1)) av.push({ x: s.x - s.r * 1.9, y: s.y - s.r * 2.2, w: s.r * 3.8, h: s.r * 3.6 + 26 });
    av.push({ x: L.deck.x - L.th * 0.9, y: L.deck.y - L.th * 0.6, w: L.th * 1.8, h: L.th * 1.2 });
    av.push({ x: L.discard.x - L.th * 0.7, y: L.discard.y - L.th * 0.7, w: L.th * 1.4, h: L.th * 1.4 });
    av.push({ x: Z.x, y: Z.y, w: Z.w, h: Z.h });
    if (port) av.push({ x: 0, y: L.deck.y - L.th * 0.7, w: W, h: Z.y - L.deck.y + L.th * 0.7 });
    av.push({ x: L.handX0, y: L.promptY - 34, w: L.handX1 - L.handX0, h: H - L.promptY + 34 });
    av.push({ x: 0, y: 0, w: W, h: top + 4 });
    if (!port) av.push({ x: 0, y: 0, w: 380, h: 80 }, { x: W - 260, y: 0, w: 260, h: 80 }, { x: 0, y: L.handY - 60, w: L.handX0, h: 140 }, { x: L.handX1, y: L.handY - 60, w: W - L.handX1, h: 140 });
    L.avoid = av;
    this.L = L;
    this.art.setup(cw, this.dpr || 1, this.back, this.four, LANG);
    return L;
  }

  rebuild() {
    if (!this.W) return;
    const L = this.L;
    const avoid = this.mode === 'menu' ? this.avoidExtra : L.avoid;
    this.bg = buildScene(this.W, this.H, this.dpr, this.cloth, { avoid });
    this.art.setup(L.cw, this.dpr, this.back, this.four, LANG);
  }

  setLook({ cloth, back, four }) {
    let re = false;
    if (cloth && cloth !== this.cloth) (this.cloth = cloth), (re = true);
    if (back && back !== this.back) this.back = back;
    if (four !== undefined) this.four = four;
    this.art.setup(this.L.cw, this.dpr, this.back, this.four, LANG);
    if (re) this.rebuild();
  }

  // ---------- позиции карт по состоянию игры ----------
  handLayout(ids) {
    const L = this.L;
    const n = ids.length;
    const out = [];
    if (!n) return out;
    const avail = L.handX1 - L.handX0;
    let sp = Math.min(L.cw * 0.8, n > 1 ? (avail - L.cw) / (n - 1) : 0);
    let rows = 1;
    if (sp < L.cw * 0.34 && n > 8) rows = 2;
    const perRow = Math.ceil(n / rows);
    const rowIdx = (i) => (rows === 2 && i >= perRow ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const r = rowIdx(i);
      const inRow = r === 0 ? Math.min(perRow, n) : n - perRow;
      const k = r === 0 ? i : i - perRow;
      const s = Math.min(L.cw * 0.8, inRow > 1 ? (avail - L.cw) / (inRow - 1) : 0);
      const wTot = s * (inRow - 1);
      const x = (L.handX0 + L.handX1) / 2 - wTot / 2 + k * s;
      const u = inRow > 1 ? k / (inRow - 1) - 0.5 : 0;
      const yBase = L.handY - (rows === 2 ? (r === 0 ? L.ch * 0.36 : -L.ch * 0.06) : 0);
      out.push({ x, y: yBase + u * u * L.ch * 0.12, rot: u * 0.12, z: 400 + r * 100 + k });
    }
    return out;
  }

  // целевые положения всех карт
  targets(app) {
    const g = app.game, L = this.L, st = app.st;
    const T = new Map();
    if (!g) return T;
    // колода: верх колоды — последний элемент
    const dk = g.deck;
    dk.forEach((c, i) => {
      if (i === 0) {
        // козырь лежит под колодой поперёк, лицом вверх
        T.set(c, { x: L.deck.x + L.tw * 0.5, y: L.deck.y, rot: Math.PI / 2, s: L.ts, f: 1, z: 10 });
      } else {
        const off = Math.min(i, 12) * 0.5;
        T.set(c, { x: L.deck.x - off, y: L.deck.y - off, rot: 0.04, s: L.ts, f: 0, z: 20 + i });
      }
    });
    // отбой
    g.discard.forEach((c, i) => {
      T.set(c, { x: L.discard.x + (hash(c) - 0.5) * L.tw * 0.3, y: L.discard.y + (hash(c + 7) - 0.5) * L.tw * 0.3, rot: (hash(c + 3) - 0.5) * 1.2, s: L.ts, f: 0, z: 5 + i * 0.01 });
    });
    // стол
    const slots = L.slotsFor(this.slotCount(app));
    g.table.forEach((x, i) => {
      const sl = slots[i];
      T.set(x.a, { x: sl.x, y: sl.y, rot: (hash(x.a) - 0.5) * 0.12, s: L.ts, f: 1, z: 100 + i * 2 });
      if (x.d != null) T.set(x.d, { x: sl.x + L.tw * 0.24, y: sl.y + L.th * 0.16, rot: 0.14 + (hash(x.d) - 0.5) * 0.1, s: L.ts, f: 1, z: 101 + i * 2 });
    });
    // руки соперников: веер рубашек за портретом
    for (let p = 1; p < g.n; p++) {
      const s = L.seats[p];
      const h = g.hands[p];
      const k = h.length;
      const vis = Math.min(k, 10);
      const spread = Math.min(1.3, 0.16 * vis);
      const sc = s.bw / L.cw;
      h.forEach((c, i) => {
        const j = Math.min(i, vis - 1);
        const u = vis > 1 ? j / (vis - 1) - 0.5 : 0;
        const a = u * spread;
        const R = s.r * 0.9;
        T.set(c, { x: s.x + Math.sin(a) * R, y: s.y - s.r * 0.35 - Math.cos(a) * R * 0.55, rot: a, s: sc, f: 0, z: 200 + p * 20 + j });
      });
    }
    // рука игрока
    const mine = app.sortedHand();
    const pos = this.handLayout(mine);
    const legal = st.legal;
    mine.forEach((c, i) => {
      const P = pos[i];
      let y = P.y;
      if (st.sel === c) y -= L.ch * 0.2;
      else if (st.hover === c && legal && legal.has(c)) y -= L.ch * 0.06;
      if (st.hint === c) y -= L.ch * 0.12;
      T.set(c, { x: P.x, y, rot: P.rot, s: 1, f: 1, z: P.z, hand: true });
    });
    // перетаскиваемая карта точно под пальцем
    if (st.drag && st.drag.moved) {
      const d = st.drag;
      const tt = T.get(d.id);
      if (tt) T.set(d.id, { x: d.x - d.ox, y: d.y - d.oy, rot: 0, s: 1, f: 1, z: 900, drag: true });
    }
    return T;
  }

  slotCount(app) {
    const g = app.game, st = app.st;
    const ghost = app.hintsOn() && st.targets && st.targets.some((o) => o.t === 'transfer' || o.t === 'attack') && g.table.length < 6;
    return g.table.length + (ghost ? 1 : 0);
  }

  // мгновенно разложить карты по местам (промо и восстановление)
  snap(app) {
    this.hold.clear();
    for (const [id, tg] of this.targets(app)) this.sp.set(id, { x: tg.x, y: tg.y, rot: tg.rot, s: tg.s, f: tg.f, z: tg.z });
  }

  // карта колоды стартует в колоде; раздача по очереди
  resetCards(g) {
    this.sp.clear();
    this.hold.clear();
    const L = this.L;
    const all = [...g.deck, ...g.hands.flat(), ...g.discard];
    for (const c of all) this.sp.set(c, { x: L.deck.x, y: L.deck.y, rot: 0.04, s: L.ts, f: 0, z: 20 });
    this.bubbles = [];
    this.fx = [];
  }
  // карты из списка поедут с задержкой друг за другом
  stagger(ids, step = 0.08, start = 0) {
    ids.forEach((c, i) => this.hold.set(c, this.t + start + i * step));
  }

  // ---------- реплики и эффекты ----------
  say(p, text, kind = 'info') {
    this.bubbles = this.bubbles.filter((b) => b.p !== p);
    this.bubbles.push({ p, text, kind, t0: this.t, dur: 1.8 });
  }
  floatText(text, x, y, color = '#ffe48a', size = 30) {
    this.fx.push({ t: 'text', text, x, y, color, size, t0: this.t, dur: 1.4 });
  }
  burst(x, y, n = 24) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * P2, v = 120 + Math.random() * 260;
      this.fx.push({ t: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, c: ['#f6c443', '#e0574c', '#72b043', '#3f8fd8', '#ffffff'][i % 5], t0: this.t, dur: 1 + Math.random() * 0.6, r: 3 + Math.random() * 4 });
    }
  }

  // ---------- кадр ----------
  draw(dt, app) {
    this.t += dt;
    const g = this.g, L = this.L, W = this.W, H = this.H;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.bg) g.drawImage(this.bg.canvas, 0, 0, W, H);
    else {
      g.fillStyle = '#3a5a4a';
      g.fillRect(0, 0, W, H);
    }
    if (this.bg) drawAnims(g, this.bg.anims, this.t);
    const game = app.game;
    if (this.mode === 'menu' || !game) {
      this.drawMenuCards(g);
      return;
    }
    const T = this.targets(app);
    // подложки: место колоды и отбоя
    this.drawSlots(g, game, app);
    // движение спрайтов
    const k = 1 - Math.exp(-dt * 11);
    const list = [];
    for (const [id, tg] of T) {
      let s = this.sp.get(id);
      if (!s) {
        s = { x: L.deck.x, y: L.deck.y, rot: 0, s: L.ts, f: 0, z: 20 };
        this.sp.set(id, s);
      }
      const hold = this.hold.get(id);
      if (hold && hold > this.t) {
        list.push(s);
        s.id = id;
        s.moving = false;
        continue;
      }
      if (hold) this.hold.delete(id);
      s.id = id;
      if (tg.drag) {
        s.x = tg.x;
        s.y = tg.y;
        s.rot += (tg.rot - s.rot) * k;
        s.s = tg.s;
      } else {
        s.x += (tg.x - s.x) * k;
        s.y += (tg.y - s.y) * k;
        s.rot += (tg.rot - s.rot) * k;
        s.s += (tg.s - s.s) * k;
      }
      s.f += (tg.f - s.f) * Math.min(1, dt * 9);
      if (Math.abs(tg.f - s.f) < 0.01) s.f = tg.f;
      s.z = tg.z;
      s.moving = Math.hypot(tg.x - s.x, tg.y - s.y) > 6;
      s.drag = !!tg.drag;
      s.hand = !!tg.hand;
      list.push(s);
    }
    list.sort((a, b) => (a.drag ? 2000 : a.moving ? 1000 + a.z * 0.001 : a.z) - (b.drag ? 2000 : b.moving ? 1000 + b.z * 0.001 : b.z));
    // сначала всё, что ниже рук соперников, потом портреты, потом остальное
    let seatsDrawn = false;
    for (const s of list) {
      if (!seatsDrawn && !s.moving && !s.drag && s.z >= 400) {
        this.drawSeats(g, game, app);
        seatsDrawn = true;
      }
      if (!seatsDrawn && (s.moving || s.drag)) {
        this.drawSeats(g, game, app);
        seatsDrawn = true;
      }
      this.drawCard(g, s, app);
    }
    if (!seatsDrawn) this.drawSeats(g, game, app);
    this.drawTargets(g, game, app);
    this.drawBubbles(g, game);
    this.drawFx(g, dt);
  }

  drawCard(g, s, app) {
    const L = this.L;
    const w = L.cw * s.s, h = L.ch * s.s;
    const f = s.f;
    const sx = Math.abs(f * 2 - 1);
    g.save();
    g.translate(s.x, s.y);
    g.rotate(s.rot);
    // тень
    const lift = s.drag ? 10 : s.moving ? 7 : 2;
    g.fillStyle = `rgba(20,10,0,${s.drag || s.moving ? 0.28 : 0.22})`;
    roundRect(g, -w / 2 * sx + lift * 0.4, -h / 2 + lift, w * sx, h, w * 0.09);
    g.fill();
    g.scale(Math.max(0.02, sx), 1);
    const img = f >= 0.5 ? this.art.face(s.id) : this.art.backImg();
    g.drawImage(img, -w / 2, -h / 2, w, h);
    // недоступные карты в руке слегка притушены
    const st = app.st;
    if (s.hand && f >= 0.5 && st.legal && st.dim && app.hintsOn() && !st.legal.has(s.id)) {
      g.fillStyle = 'rgba(40,25,10,.32)';
      roundRect(g, -w / 2, -h / 2, w, h, w * 0.09);
      g.fill();
    }
    if (s.hand && (st.sel === s.id || st.hint === s.id)) {
      g.lineWidth = 4;
      g.strokeStyle = st.hint === s.id ? `rgba(255,214,90,${0.6 + Math.sin(this.t * 6) * 0.35})` : '#ffd35a';
      roundRect(g, -w / 2 - 2, -h / 2 - 2, w + 4, h + 4, w * 0.1);
      g.stroke();
    }
    g.restore();
  }

  drawSlots(g, game, app) {
    const L = this.L;
    // пустая колода: значок козырной масти
    if (!game.deck.length) {
      g.save();
      g.globalAlpha = 0.5;
      g.fillStyle = 'rgba(255,255,255,.18)';
      roundRect(g, L.deck.x - L.tw / 2, L.deck.y - L.th / 2, L.tw, L.th, L.tw * 0.1);
      g.fill();
      g.globalAlpha = 0.85;
      g.fillStyle = (this.four ? ['#d22f3a', '#1d6fd0', '#22883a', '#1f2433'] : COLORS2)[game.trump];
      suitPath(g, game.trump, L.deck.x, L.deck.y, L.tw * 0.55);
      g.fill();
      g.restore();
    }
    // число карт в колоде
    if (game.deck.length > 1) {
      const x = L.deck.x - L.tw * 0.45, y = L.deck.y - L.th * 0.45;
      this.badge(g, x, y, String(game.deck.length - 0), '#2a1a0a');
    }
  }

  badge(g, x, y, text, bg = '#c0392b', r = 15) {
    g.save();
    g.font = `900 ${r * 1.15}px ${FONT}`;
    const w = Math.max(r * 2, g.measureText(text).width + r);
    g.fillStyle = bg;
    roundRect(g, x - w / 2, y - r, w, r * 2, r);
    g.fill();
    g.lineWidth = 2.5;
    g.strokeStyle = '#fff6e3';
    g.stroke();
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, x, y + 1);
    g.restore();
  }

  drawSeats(g, game, app) {
    const L = this.L;
    for (let p = 1; p < game.n; p++) {
      const s = L.seats[p];
      if (!s) continue;
      const pl = app.players[p];
      const att = !game.over && game.attacker === p && !game.out[p];
      const def = !game.over && game.defender === p && !game.out[p];
      const ring = def ? '#3f8fd8' : att ? '#f08a24' : '#fff6e3';
      // свечение того, чей ход
      const act = app.actor === p;
      if (act) {
        const gl = g.createRadialGradient(s.x, s.y, s.r * 0.8, s.x, s.y, s.r * 1.6);
        gl.addColorStop(0, `rgba(255,220,120,${0.45 + Math.sin(this.t * 5) * 0.15})`);
        gl.addColorStop(1, 'rgba(255,220,120,0)');
        g.fillStyle = gl;
        g.beginPath();
        g.arc(s.x, s.y, s.r * 1.6, 0, P2);
        g.fill();
      }
      g.save();
      g.shadowColor = 'rgba(0,0,0,.35)';
      g.shadowBlur = 8;
      g.shadowOffsetY = 3;
      g.beginPath();
      g.arc(s.x, s.y, s.r, 0, P2);
      g.fillStyle = '#000';
      g.fill();
      g.restore();
      drawAvatar(g, pl.kind, s.x, s.y, s.r, { ring, dim: game.out[p] && game.durak !== p, cap: game.over && game.durak === p });
      // имя
      const fs = clamp(s.r * 0.46, 13, 20);
      g.font = `800 ${fs}px ${FONT}`;
      let name = pl.name;
      const maxW = L.port ? Math.min(this.W / Math.max(1, game.n - 1) - 6, 120) : 170;
      while (g.measureText(name).width > maxW - 14 && name.length > 3) name = name.slice(0, -2) + '…';
      const nw = g.measureText(name).width + 16;
      const ny = s.y + s.r + fs * 0.75;
      const nx = clamp(s.x, nw / 2 + 4, this.W - nw / 2 - 4);
      g.fillStyle = 'rgba(255,246,227,.94)';
      roundRect(g, nx - nw / 2, ny - fs * 0.7, nw, fs * 1.4, fs * 0.7);
      g.fill();
      g.fillStyle = '#3b2412';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(name, nx, ny + 1);
      // число карт или место
      if (game.out[p]) {
        const place = game.places.indexOf(p) + 1;
        if (place > 0) this.badge(g, s.x + s.r * 0.8, s.y - s.r * 0.75, place + '', '#3a8a3a', clamp(s.r * 0.36, 11, 16));
      } else if (game.hands[p].length) {
        this.badge(g, s.x + s.r * 0.85, s.y - s.r * 0.7, game.hands[p].length + '', '#8a3a1a', clamp(s.r * 0.36, 11, 16));
      }
      // роль
      if ((att || def) && !game.out[p]) {
        const txt = def ? (game.phase === 'take' ? t('rTake') : t('rDef')) : t('rAtt');
        g.font = `900 ${fs * 0.82}px ${FONT}`;
        const tw = g.measureText(txt).width + 12;
        const ry = ny + fs * 1.15;
        const rx = clamp(s.x, tw / 2 + 4, this.W - tw / 2 - 4);
        g.fillStyle = def ? (game.phase === 'take' ? '#c0392b' : '#2f6fb8') : '#d9761a';
        roundRect(g, rx - tw / 2, ry - fs * 0.5, tw, fs * 1.0, fs * 0.5);
        g.fill();
        g.fillStyle = '#fff';
        g.fillText(txt, rx, ry + 1);
      }
      if (app.thinkP === p && performance.now() > app.thinkFrom) this.drawThinking(g, s);
    }
  }

  // облачко «думает…» с прыгающими точками над портретом
  drawThinking(g, s) {
    const r = clamp(s.r * 0.42, 13, 22);
    const cx = clamp(s.x - s.r * 0.25, r * 1.5, this.W - r * 1.5), cy = Math.max(r, s.y - s.r * 1.35);
    g.save();
    g.fillStyle = '#fffaf0';
    g.strokeStyle = 'rgba(59,36,18,.85)';
    g.lineWidth = 2.5;
    // маленькие кружочки к портрету
    for (const [k, rr] of [[0.55, 0.15], [0.75, 0.22]]) {
      g.beginPath();
      g.arc(s.x + (cx - s.x) * k, s.y + (cy - s.y) * k, r * rr, 0, P2);
      g.fill();
      g.stroke();
    }
    roundRect(g, cx - r * 1.35, cy - r * 0.75, r * 2.7, r * 1.5, r * 0.75);
    g.fill();
    g.stroke();
    g.fillStyle = '#6b4a2a';
    for (let i = 0; i < 3; i++) {
      const b = Math.max(0, Math.sin(this.t * 7 - i * 0.9)) * r * 0.22;
      g.beginPath();
      g.arc(cx + (i - 1) * r * 0.75, cy - b, r * 0.2, 0, P2);
      g.fill();
    }
    g.restore();
  }

  // подсветка целей: карты, которые можно побить выбранной, и место для перевода
  drawTargets(g, game, app) {
    const st = app.st, L = this.L;
    const tg = st.targets;
    if (!tg || !app.hintsOn()) return;
    const slots = L.slotsFor(this.slotCount(app));
    const pulse = 0.55 + Math.sin(this.t * 6) * 0.3;
    for (const o of tg) {
      if (o.t === 'defend') {
        const sl = slots[o.i];
        const hot = st.dropTarget && st.dropTarget.t === 'defend' && st.dropTarget.i === o.i;
        g.save();
        g.translate(sl.x, sl.y);
        g.rotate((hash(game.table[o.i].a) - 0.5) * 0.12);
        g.shadowColor = 'rgba(255,220,100,.9)';
        g.shadowBlur = 14;
        g.lineWidth = hot ? 8 : 6;
        g.strokeStyle = hot ? '#fff3a0' : `rgba(255,214,90,${pulse})`;
        roundRect(g, -L.tw / 2 - 5, -L.th / 2 - 5, L.tw + 10, L.th + 10, L.tw * 0.12);
        g.stroke();
        g.restore();
      } else if (o.t === 'transfer' || o.t === 'attack') {
        const sl = slots[Math.min(5, game.table.length)];
        const hot = st.dropTarget && st.dropTarget.t === o.t;
        g.save();
        g.translate(sl.x, sl.y);
        g.setLineDash([10, 8]);
        g.lineWidth = hot ? 5 : 3.5;
        g.strokeStyle = hot ? '#fff3a0' : `rgba(255,214,90,${pulse})`;
        g.fillStyle = hot ? 'rgba(255,240,160,.22)' : 'rgba(255,240,160,.1)';
        roundRect(g, -L.tw / 2, -L.th / 2, L.tw, L.th, L.tw * 0.1);
        g.fill();
        g.stroke();
        g.setLineDash([]);
        if (o.t === 'transfer') {
          g.fillStyle = '#fff6d8';
          g.font = `900 ${clamp(L.tw * 0.2, 13, 22)}px ${FONT}`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.shadowColor = 'rgba(0,0,0,.6)';
          g.shadowBlur = 4;
          g.fillText(t('transferShort'), 0, 0);
          g.font = `900 ${clamp(L.tw * 0.3, 18, 32)}px ${FONT}`;
          g.fillText('↻', 0, -L.th * 0.25);
        }
        g.restore();
      }
    }
  }

  drawBubbles(g, game) {
    const L = this.L;
    this.bubbles = this.bubbles.filter((b) => this.t - b.t0 < b.dur);
    for (const b of this.bubbles) {
      const u = (this.t - b.t0) / b.dur;
      const a = u < 0.1 ? u / 0.1 : u > 0.8 ? (1 - u) / 0.2 : 1;
      let x, y, below = false;
      if (b.p === 0) {
        x = this.W / 2;
        y = L.promptY - 40;
      } else {
        const s = L.seats[b.p];
        if (!s) continue;
        x = s.x + (s.side === -1 ? s.r * 1.4 : s.side === 1 ? -s.r * 1.4 : 0);
        y = s.side ? s.y - s.r * 0.2 : s.y + s.r * 2.6;
        below = !s.side;
      }
      const fs = clamp(L.ar * 0.55, 17, 26);
      g.save();
      g.globalAlpha = a;
      g.font = `900 ${fs}px ${FONT}`;
      const w = g.measureText(b.text).width + fs * 1.3;
      const h = fs * 1.7;
      x = clamp(x, w / 2 + 6, this.W - w / 2 - 6);
      const sc = 0.85 + Math.min(1, u * 8) * 0.15;
      g.translate(x, y);
      g.scale(sc, sc);
      g.fillStyle = b.kind === 'take' ? '#ffe2dc' : b.kind === 'good' ? '#e6f4d4' : '#fffaf0';
      g.strokeStyle = 'rgba(59,36,18,.85)';
      g.lineWidth = 3;
      roundRect(g, -w / 2, -h / 2, w, h, h / 2);
      g.fill();
      g.stroke();
      // хвостик к портрету
      if (b.p) {
        g.beginPath();
        if (below) {
          g.moveTo(-8, -h / 2 + 1);
          g.lineTo(0, -h / 2 - 10);
          g.lineTo(8, -h / 2 + 1);
        } else {
          const sgn = L.seats[b.p].side === -1 ? -1 : 1;
          g.moveTo((sgn * w) / 2 - 1, -6);
          g.lineTo((sgn * w) / 2 + sgn * 10, 0);
          g.lineTo((sgn * w) / 2 - 1, 6);
        }
        g.fill();
        g.stroke();
        g.fillRect(-10, below ? -h / 2 + 1.5 : -5, 20, below ? 4 : 10);
      }
      g.fillStyle = b.kind === 'take' ? '#a8281c' : '#3b2412';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(b.text, 0, 1);
      g.restore();
    }
  }

  drawFx(g, dt) {
    this.fx = this.fx.filter((f) => this.t - f.t0 < f.dur);
    for (const f of this.fx) {
      const u = (this.t - f.t0) / f.dur;
      if (f.t === 'text') {
        g.save();
        g.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1;
        g.font = `900 ${f.size}px ${FONT}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineWidth = 6;
        g.strokeStyle = 'rgba(59,36,18,.85)';
        const y = f.y - u * 50;
        g.strokeText(f.text, f.x, y);
        g.fillStyle = f.color;
        g.fillText(f.text, f.x, y);
        g.restore();
      } else {
        f.vy += 420 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        g.globalAlpha = 1 - u;
        g.fillStyle = f.c;
        g.beginPath();
        g.arc(f.x, f.y, f.r, 0, P2);
        g.fill();
        g.globalAlpha = 1;
      }
    }
  }

  // меню: веер тузов на столе
  drawMenuCards(g) {
    const L = this.L;
    if (!this.menuFan) return;
    const { x, y, w } = this.menuFan;
    const ids = [14, 16 + 14, 32 + 14, 48 + 14];
    const sc = w / L.cw;
    ids.forEach((c, i) => {
      const u = i / (ids.length - 1) - 0.5;
      const a = u * 0.7 + Math.sin(this.t * 0.8 + i) * 0.01;
      this.drawCard(g, { id: c, x: x + Math.sin(a) * w * 1.2, y: y - Math.cos(a) * w * 0.9 + w * 0.9, rot: a, s: sc, f: 1 }, { st: {} });
    });
  }

  // ---------- попадания ----------
  handAt(app, x, y) {
    const mine = app.sortedHand();
    const pos = this.handLayout(mine);
    const L = this.L;
    for (let i = mine.length - 1; i >= 0; i--) {
      const P = pos[i];
      const s = this.sp.get(mine[i]);
      const cx = s ? s.x : P.x, cy = s ? s.y : P.y;
      // нижний ряд перекрывает верхний — проверяем в порядке z
      if (Math.abs(x - cx) < L.cw / 2 && Math.abs(y - cy) < L.ch / 2) return mine[i];
    }
    // второй проход по верхнему ряду не нужен: порядок уже по z
    return null;
  }
  // карта на столе под точкой (для отбоя)
  tableAt(game, x, y, app) {
    const L = this.L;
    const slots = L.slotsFor(app ? this.slotCount(app) : game.table.length);
    for (let i = game.table.length - 1; i >= 0; i--) {
      const sl = slots[i];
      if (Math.abs(x - sl.x) < L.tw * 0.62 && Math.abs(y - sl.y) < L.th * 0.62) return i;
    }
    return -1;
  }
  // куда можно бросить карту для хода/перевода: вся зона стола над рукой, с запасом
  overTable(x, y) {
    const Z = this.L.zone, L = this.L;
    return x > Z.x - 40 && x < Z.x + Z.w + 40 && y > Z.y - Math.max(60, Z.h * 0.5) && y < L.handY - L.ch * 0.5;
  }
  inZone(x, y) {
    const Z = this.L.zone;
    return x > Z.x - 20 && x < Z.x + Z.w + 20 && y > Z.y - 20 && y < Z.y + Z.h + 30;
  }
  seatPos(p) {
    if (p === 0) return { x: this.W / 2, y: this.L.handY - this.L.ch * 0.3 };
    const s = this.L.seats[p];
    return s ? { x: s.x, y: s.y } : { x: this.W / 2, y: 60 };
  }
}
