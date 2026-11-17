// Экономика: генерация машин и объявлений, оценка стоимости, список работ с ценами, торг с продавцом
// и покупателем, опыт за сделку. Без DOM и 3D — проверяется симуляцией (tools/balance.mjs).
import { CARS, CAR, CLASSIC, PANEL_W, SYSTEMS, HIDDEN, QW, SELLERS, BUYERS, TUNING, PAINTS } from './data.js';

export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const R = (r, a, b) => a + (b - a) * r();
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
export const round500 = (v) => Math.max(500, Math.round(v / 500) * 500);
const PANELS = Object.keys(PANEL_W);

// ---------- машина ----------
// tier: 0 — развалюха, 1 — уставшая, 2 — приличная
export function genCar(r, model, tier) {
  const m = CAR[model];
  const T = [[0.15, 0.5], [0.4, 0.75], [0.68, 0.94]][tier];
  const panels = {};
  const rustBase = tier === 0 ? R(r, 0.25, 0.65) : tier === 1 ? R(r, 0.05, 0.35) : R(r, 0, 0.12);
  for (const k of PANELS) {
    const low = k.startsWith('quarter') || k.startsWith('door') || k.startsWith('fender') || k.startsWith('bumper');
    let rust = clamp(rustBase * (low ? R(r, 0.7, 1.4) : R(r, 0.1, 0.7)) + (r() < 0.12 ? 0.3 : 0), 0, 0.95);
    if (rust < 0.06) rust = 0;
    const dent = r() < (tier === 0 ? 0.35 : tier === 1 ? 0.22 : 0.08) ? R(r, 0.35, 1) : 0;
    panels[k] = { rust: +rust.toFixed(2), dent: +dent.toFixed(2), fade: +clamp(R(r, T[0], T[1]) * -1 + 1 - 0.05, 0, 0.9).toFixed(2), primer: 0, seed: Math.floor(r() * 1e6) };
    // иногда деталь уже заменена «гаражом» и стоит в грунте
    if (tier < 2 && r() < 0.06) Object.assign(panels[k], { rust: 0, dent: 0, primer: 1 });
  }
  const sys = {};
  for (const s of SYSTEMS) sys[s] = +clamp(R(r, T[0], T[1]) + (r() < 0.2 ? -0.25 : 0), 0.05, 0.98).toFixed(2);
  const pc = r() < 0.75 ? pick(r, PAINTS.slice(0, 8)) : pick(r, PAINTS.slice(8, 14));
  const year = Math.round(R(r, m.years[0], m.years[1]));
  return {
    model,
    year,
    color: pc.c,
    orig: pc.c,
    metallic: !!pc.m,
    km: Math.round((2026 - year) * R(r, 6000, 16000) * (tier === 2 ? 0.6 : 1) / 1000) * 1000,
    panels,
    sys,
    dirt: +R(r, tier === 0 ? 0.75 : 0.35, 1).toFixed(2),
    look: {},
    tuned: {},
    seed: Math.floor(r() * 1e9),
  };
}

// состояние по системам 0..1 и общее Q
export function quality(car) {
  let bw = 0,
    body = 0,
    paint = 0;
  let prim = 0,
    nonPrim = 0;
  for (const k in car.panels) {
    const p = car.panels[k];
    const w = PANEL_W[k] || 1;
    bw += w;
    body += w * (1 - clamp(Math.max(p.rust, p.dent * 0.75), 0, 1));
    paint += w * (1 - p.fade) * (1 - p.primer * 0.8) * (1 - p.rust * 0.5);
    if (p.primer > 0.5) prim += w;
    else nonPrim += w;
  }
  body /= bw;
  paint /= bw;
  // пёстрая машина (часть деталей в грунте) смотрится хуже
  if (prim > 0 && nonPrim > 0) paint *= 0.88;
  const c = { body, paint, ...car.sys };
  let Q = 0;
  for (const k in QW) Q += QW[k] * c[k];
  c.Q = Q;
  c.mech = (c.engine + c.gearbox + c.suspension + c.brakes) / 4;
  c.comfort = (c.interior + c.glass + (1 - car.dirt) + body) / 4;
  return c;
}
export function tuningValue(car) {
  let v = 0;
  for (const t of TUNING) if (car.tuned && car.tuned[t.id]) v += t.val;
  return v * CAR[car.model].base;
}
// рыночная стоимость (для обычного покупателя)
export function value(car, q = quality(car)) {
  const m = CAR[car.model];
  const yt = (car.year - m.years[0]) / Math.max(1, m.years[1] - m.years[0]);
  const ageK = CLASSIC.has(car.model) ? 1.06 - yt * 0.1 : 0.94 + yt * 0.12;
  const kmK = clamp(1.08 - (car.km / 400000) * 0.3, 0.8, 1.08);
  const clean = 1 + 0.04 * (1 - car.dirt);
  return m.base * ageK * kmK * clean * (0.15 + 0.85 * Math.pow(q.Q, 1.7)) + tuningValue(car) * 0.5;
}

// ---------- объявления ----------
// level — уровень игрока, up — улучшения, opts.find — «находка дня»
export function genListing(r, level, up = {}, opts = {}) {
  const pool = CARS.filter((c) => c.lvl <= level);
  let model;
  if (opts.find) model = pick(r, pool.filter((c) => CLASSIC.has(c.id)).concat(pool.length ? [] : [CARS[0]])).id;
  else {
    const w = pool.map((c) => 1 + (c.lvl >= level - 3 ? 2.5 : 0));
    let x = r() * w.reduce((a, b) => a + b, 0);
    model = pool[pool.length - 1].id;
    for (let i = 0; i < pool.length; i++) {
      x -= w[i];
      if (x <= 0) {
        model = pool[i].id;
        break;
      }
    }
  }
  const tier = opts.find ? 0 : opts.tier ?? (r() < 0.45 ? 0 : r() < 0.75 ? 1 : 2);
  const car = genCar(r, model, tier);
  const st = opts.find ? SELLERS.find((s) => s.id === 'granny') : opts.seller ? SELLERS.find((s) => s.id === opts.seller) : pick(r, SELLERS);
  const V = value(car);
  const deal = 1 - 0.03 * (up.contacts || 0);
  let ask = V * R(r, st.ask[0], st.ask[1]) * deal;
  let min = V * R(r, st.min[0], st.min[1]) * deal;
  if (opts.find) {
    ask = V * 0.7;
    min = V * 0.55;
  }
  ask = round500(ask);
  min = Math.min(round500(min), ask - 500);
  // что продавец говорит о скрытых системах
  const claims = {};
  for (const s of HIDDEN) {
    const a = car.sys[s];
    claims[s] = r() < st.honest ? a : Math.max(a, R(r, 0.72, 0.95));
  }
  const urgent = st.id === 'student' && r() < 0.5;
  return { id: Math.floor(r() * 1e9).toString(36), car, seller: st.id, name: Math.floor(r() * 1e6), ask, ask0: ask, min, pat: Math.round(R(r, st.pat[0], st.pat[1])), give: st.give, claims, tier, urgent, find: !!opts.find, value: Math.round(V) };
}

// ---------- работы ----------
// список доступных работ над машиной: { id, kind, part, cost, gain, apply(car) }
export function jobs(car, up = {}, sel = null) {
  const B = CAR[car.model].base;
  const k = 0.62 * (1 - 0.08 * (up.tools || 0));
  const out = [];
  const add = (j) => {
    j.cost = round500(j.cost * k);
    out.push(j);
  };
  const panels = sel ? [sel] : Object.keys(car.panels);
  for (const name of panels) {
    const p = car.panels[name];
    const w = PANEL_W[name] || 1;
    if (p.dent > 0.04) add({ id: 'dent', part: name, cost: B * 0.011 * w * (0.4 + p.dent), apply: (c) => Object.assign(c.panels[name], { dent: 0, primer: Math.max(c.panels[name].primer, 1) }) });
    if (p.rust > 0.04 && p.rust <= 0.7) add({ id: 'rust', part: name, cost: B * 0.015 * w * (0.3 + p.rust), apply: (c) => Object.assign(c.panels[name], { rust: 0, primer: 1 }) });
    if (p.rust > 0.3 || p.dent > 0.55) add({ id: 'replace', part: name, cost: B * 0.042 * w, apply: (c) => Object.assign(c.panels[name], { rust: 0, dent: 0, fade: 0, primer: 1 }) });
    if ((p.primer > 0.5 || p.fade > 0.12) && p.rust < 0.05) add({ id: 'paintPanel', part: name, cost: B * 0.012 * w, apply: (c) => Object.assign(c.panels[name], { primer: 0, fade: up.booth ? 0 : 0.1 }) });
  }
  if (!sel) {
    const P = Object.values(car.panels);
    const rusty = P.some((p) => p.rust > 0.04);
    const needPaint = P.some((p) => p.primer > 0.5 || p.fade > 0.08);
    add({ id: 'paintAll', cost: B * 0.075, need: up.booth ? (rusty ? 'rustFirst' : null) : 'booth', dim: !needPaint, apply: (c, color, metallic) => {
      for (const q of Object.values(c.panels)) Object.assign(q, { primer: 0, fade: 0 });
      if (color !== undefined) {
        c.color = color;
        c.metallic = !!metallic;
      }
    } });
    if (P.some((p) => p.fade > 0.15 && p.primer < 0.5)) add({ id: 'polish', cost: B * 0.008, apply: (c) => Object.values(c.panels).forEach((q) => q.primer < 0.5 && (q.fade = Math.max(0, +(q.fade - 0.35).toFixed(2)))) });
    const S = car.sys;
    const sysJob = (id, rate, extra = 0.01) => S[id] < 0.97 && add({ id, cost: B * (rate * (1 - S[id]) + extra), apply: (c) => (c.sys[id] = 1) });
    sysJob('engine', 0.22);
    sysJob('gearbox', 0.11);
    sysJob('suspension', 0.08);
    sysJob('brakes', 0.035, 0.004);
    if (S.interior < 0.75) add({ id: 'clean', cost: B * 0.012, apply: (c) => (c.sys.interior = Math.min(0.85, +(c.sys.interior + 0.25).toFixed(2))) });
    sysJob('interior', 0.06);
    if (S.glass < 0.95) add({ id: 'glass', cost: B * 0.03, apply: (c) => (c.sys.glass = 1) });
    if (S.lights < 0.95) add({ id: 'lights', cost: B * 0.018, apply: (c) => (c.sys.lights = 1) });
    if (S.tires < 0.95) add({ id: 'tires', cost: B * 0.03, apply: (c) => (c.sys.tires = 1) });
  }
  // оценка прироста стоимости; для кузовных работ — с учётом покраски детали после ремонта
  const v0 = value(car);
  for (const j of out) {
    const c = clone(car);
    j.apply(c);
    j.gain = Math.round(value(c) - v0);
    if (j.part && ['dent', 'rust', 'replace'].includes(j.id)) {
      Object.assign(c.panels[j.part], { primer: 0, fade: up.booth ? 0 : 0.1 });
      j.gainPaint = Math.round(value(c) - v0);
    }
  }
  return out;
}
export const clone = (o) => JSON.parse(JSON.stringify(o));

// тюнинг
export function tuneCost(car, id) {
  const t = TUNING.find((q) => q.id === id);
  return round500(CAR[car.model].base * t.cost);
}

// ---------- торг ----------
// продавец: предложение игрока x → ответ { kind: 'accept'|'counter'|'insult'|'leave', price }
export function sellerReply(L, x, r) {
  if (x >= L.ask * 0.995) return { kind: 'accept', price: Math.min(x, L.ask) };
  if (x < L.min * 0.55) {
    L.pat -= 2;
    if (L.pat <= 0) return { kind: 'leave' };
    return { kind: 'insult', price: L.ask };
  }
  if (x >= L.min) {
    const p = 0.3 + (0.7 * (x - L.min)) / Math.max(1, L.ask - L.min);
    if (r() < p) return { kind: 'accept', price: x };
  }
  L.pat -= x >= L.min ? 0.5 : 1;
  if (L.pat <= 0) return { kind: 'leave' };
  const na = round500(Math.max(L.min, L.ask - (L.ask - x) * L.give * (x >= L.min ? 0.9 : 0.55)));
  if (na - x <= L.ask * 0.025) return { kind: 'accept', price: Math.max(x, L.min) };
  L.ask = Math.min(L.ask, na);
  return { kind: 'counter', price: L.ask };
}

// цена машины для конкретного покупателя
export function buyerValue(car, type, q = quality(car)) {
  const V = value(car, q);
  const tv = tuningValue(car);
  switch (type) {
    case 'taxi':
      return V * (0.72 + 0.45 * q.mech);
    case 'family':
      return V * (0.72 + 0.45 * q.comfort);
    case 'tuner':
      return V + tv * 1.1;
    case 'collector': {
      if (!CLASSIC.has(car.model)) return V * 0.9;
      let v = V * (0.8 + 0.65 * Math.pow(q.Q, 3)) - tv * 1.6;
      if (car.color === car.orig) v *= 1.08;
      return v;
    }
    case 'student':
      return V * 0.9;
    default:
      return V;
  }
}
// новый покупатель на выставленную машину
export function genBuyer(r, car, ask, up = {}) {
  const types = BUYERS.filter((b) => b.id !== 'dealer' && (b.id !== 'collector' || CLASSIC.has(car.model)) && (b.id !== 'tuner' || tuningValue(car) > 0 || r() < 0.4));
  const t = pick(r, types);
  const max = buyerValue(car, t.id) * R(r, t.k[0], t.k[1]) * (1 + 0.025 * (up.adverts || 0));
  let offer = round500(Math.min(ask, max * R(r, 0.72, 0.88)));
  const instant = ask <= max * 0.92;
  if (instant) offer = ask;
  return { id: Math.floor(r() * 1e9).toString(36), type: t.id, name: Math.floor(r() * 1e6), max: Math.round(max), offer, pat: Math.round(R(r, 2, 4)), give: R(r, 0.3, 0.55), instant };
}
// игрок называет цену c покупателю
export function buyerReply(B, c, r) {
  if (c <= B.offer) return { kind: 'accept', price: c };
  if (c > B.max * 1.35) {
    B.pat -= 2;
    if (B.pat <= 0) return { kind: 'leave' };
    return { kind: 'insult', price: B.offer };
  }
  if (c <= B.max) {
    const p = 0.3 + (0.7 * (B.max - c)) / Math.max(1, B.max - B.offer);
    if (r() < p) return { kind: 'accept', price: c };
  }
  B.pat -= 1;
  if (B.pat <= 0) return { kind: 'leave' };
  const no = round500(Math.min(B.max, B.offer + (c - B.offer) * B.give));
  if (c - no <= c * 0.02) return { kind: 'accept', price: Math.min(c, Math.round(B.max)) };
  B.offer = Math.max(B.offer, no);
  return { kind: 'counter', price: B.offer };
}
// перекупщик забирает сразу
export const dealerPrice = (car) => round500(value(car) * 0.76);

// опыт за сделку
export function xpFor(car, profit) {
  const B = CAR[car.model].base;
  return Math.round(10 + Math.max(0, (profit / B) * 60) + quality(car).Q * 6);
}
