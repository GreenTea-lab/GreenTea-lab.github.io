// Игровой процесс «Барабана удачи»: туры с соперниками, финал, суперигра, призы, подарки ведущему.
// Сценарий идёт асинхронно (await ведущего, барабана и выбора игрока). Время — игровое: на паузе всё стоит.
import { sdk } from './sdk.js';
import { save } from './save.js';
import { audio } from './audio.js';
import { iap, priceHTML } from './iap.js';
import { UI, esc, norm } from './ui.js';
import { LINES, HOST } from './lines.js';
import { QUESTIONS } from './questions.js';
import { prizeSVG, giftSVG, ICONS } from './art.js';
import { ROSTER } from './roster.js';
import {
  SECTORS, SECTOR_DEG, PRIZES, SUPER_PRIZES, GIFTS, SKINS, FREQ, ALPHABET,
  HINT_COST, COINS_PER_POINTS, SUPER_BONUS, LOSE_COINS, DAILY_COINS, AD_COINS, AD_COINS_GAP, SUPER_TIME, SUPER_LETTERS,
} from './data.js';

class Abort extends Error {}
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
const today = () => new Date().toISOString().slice(0, 10);

export class Game {
  constructor() {
    this.state = 'loading';
    this.ui = new UI(this);
    this.t = 0;
    this.paused = false;
    this.flowId = 0;
    this.waits = [];
    this.pend = null;
    this.lastVar = {};
    this.drum = { a: 0, w: 0, spin: false, onStop: null, sect: -1 };
    this.debug = window.__BU_DEBUG || {};
    this.lastAd = Date.now();
  }

  get S() { return save.data; }
  get studio() { return this.ui.studio; }

  async start() {
    await save.load();
    sdk.noAds = !!this.S.noAds;
    this.ui.init();
    this.applySkin(this.S.skin);
    this.ui.setCoins(this.S.coins);
    // покупки
    await iap.init({
      coins_1000: { grant: () => this.addCoins(1000) },
      coins_3500: { grant: () => this.addCoins(3500) },
      coins_10000: { grant: () => this.addCoins(10000) },
      disable_ads: { permanent: true, grant: () => { this.S.noAds = true; sdk.noAds = true; } },
    }, async () => { this.ui.setCoins(this.S.coins); await save.flush(); });
    if (this.S.noAds) sdk.noAds = true;
    this.last = performance.now();
    const loop = (now) => {
      const dt = Math.max(0, Math.min(0.1, (now - this.last) / 1000)) * (this.debug.speed || 1);
      this.last = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    this.bindDrum();
    this.toMenu(true);
  }

  // ---------- такт ----------
  frame(dt) {
    if (!this.paused) {
      this.t += dt;
      this.updDrum(dt);
      for (const w of [...this.waits]) if (this.t >= w.t) { this.waits.splice(this.waits.indexOf(w), 1); w.res(); }
      if (this.onTick) this.onTick(dt);
      this.studio.update(dt);
    }
    const lvl = audio.voiceLevel();
    const voiced = audio.speaking();
    this.ui.talk(lvl, voiced || this._talkUntil > this.t, voiced);
    this.studio.render();
    this.ui.frame();
  }

  // игровое ожидание; прерывается при выходе из сценария
  wait(sec, skippable = false) {
    const id = this.flowId;
    if (this.ff) sec *= 0.12;
    return new Promise((res, rej) => {
      const w = { t: this.t + sec, res: () => (id === this.flowId ? res() : rej(new Abort())), rej, id, skippable };
      this.waits.push(w);
    });
  }
  check(id) {
    if (id !== this.flowId) throw new Abort();
  }
  abortFlow() {
    this.flowId++;
    audio.stopVoice();
    for (const w of this.waits) w.rej(new Abort());
    this.waits = [];
    if (this.pend) { this.pend.rej(new Abort()); this.pend = null; }
    this.onTick = null;
    this.drum.spin = false;
    this.drum.onStop = null;
    this.ui.closeKeyboard();
    this.ui.setActions('');
    this.ui.sectorBadge('');
  }
  // ждать действия игрока
  ask() {
    const id = this.flowId;
    return new Promise((res, rej) => {
      this.pend = { res: (v) => { this.pend = null; id === this.flowId ? res(v) : rej(new Abort()); }, rej };
    });
  }
  answer(v) {
    if (this.pend) this.pend.res(v);
  }

  // ---------- ведущий ----------
  async say(key, { opt = false } = {}) {
    const id = this.flowId;
    if (opt && (this.ff || this.S.settings.fast)) return;
    if (this.ff) return;
    const vs = LINES[key];
    if (!vs) return;
    let i = rnd(vs.length);
    if (vs.length > 1 && i === this.lastVar[key]) i = (i + 1) % vs.length;
    this.lastVar[key] = i;
    const v = vs[i];
    const text = Array.isArray(v) ? v[0] : v;
    this.ui.bubble(text);
    if (text.length > 34 && Math.random() < 0.7) this.studio.anim('host', 'gesture', Math.min(3, text.length * 0.04));
    const dur = await audio.say(key, i);
    this.check(id);
    const d = dur > 0 ? dur + 0.2 : Math.max(1.2, 0.5 + text.length * 0.045);
    if (!dur) this._talkUntil = this.t + d - 0.3;
    await this.wait(d, true);
  }
  skipLine() {
    audio.stopVoice();
    this._talkUntil = 0;
    const w = this.waits.find((x) => x.skippable);
    if (w) w.t = this.t;
  }
  click() {
    audio.play('click');
  }

  // ---------- барабан ----------
  applySkin(id) {
    const s = SKINS.find((k) => k.id === id) || SKINS[0];
    this.ui.setDrumSkin(s);
    this.ui.setDrumAngle(this.drum.a);
  }
  // сектор под стрелкой (стрелка внизу, 180°)
  sectorAt(a) {
    return Math.floor((((180 - a) % 360) + 360) % 360 / SECTOR_DEG);
  }
  updDrum(dt) {
    const D = this.drum;
    if (D.spin) {
      const k1 = 90, k2 = 0.42;
      D.w = Math.max(0, D.w - (k1 + k2 * D.w) * dt);
      D.a = (D.a + D.w * dt) % 360;
      const s = this.sectorAt(D.a);
      if (s !== D.sect) {
        D.sect = s;
        audio.play('tick', Math.min(1, 0.4 + D.w / 600));
        this.ui.flap();
      }
      if (D.w < 6) {
        D.spin = false;
        const cb = D.onStop;
        D.onStop = null;
        cb && cb(SECTORS[s]);
      }
      this.ui.setDrumAngle(D.a);
      this.studio.setLit(Math.floor(this.t * 6) % 2 === 0);
    } else if (this.state === 'menu') {
      D.a = (D.a + 10 * dt) % 360;
      this.ui.setDrumAngle(D.a);
      this.studio.setLit(Math.floor(this.t * 2) % 2 === 0);
    }
  }
  spin(w0) {
    const D = this.drum;
    if (this.debug.rig !== undefined) {
      const k = SECTORS.indexOf(this.debug.rig);
      D.a = (((180 - (k + 0.5) * SECTOR_DEG) % 360) + 360) % 360;
      this.ui.setDrumAngle(D.a);
      return Promise.resolve(SECTORS[this.sectorAt(D.a)]);
    }
    if (this.ff) {
      D.a = Math.random() * 360;
      this.ui.setDrumAngle(D.a);
      return Promise.resolve(SECTORS[this.sectorAt(D.a)]);
    }
    D.w = w0;
    D.spin = true;
    D.sect = this.sectorAt(D.a);
    audio.play('whoosh');
    const id = this.flowId;
    return new Promise((res, rej) => (D.onStop = (v) => (id === this.flowId ? res(v) : rej(new Abort()))));
  }
  // персонаж толкает барабан, камера смотрит на барабан
  async spinBy(i, w) {
    const st = this.studio;
    if (!this.ff) {
      st.anim(i, 'spin');
      st.lookAll('drum');
      await this.wait(0.38);
      st.shot('drum');
    }
    const v = await this.spin(w);
    if (!this.ff) {
      st.lookAll(i);
      await this.wait(0.25);
    }
    return v;
  }
  // раскрутка пальцем: скорость взмаха → скорость барабана
  bindDrum() {
    const el = this.ui.drumEl;
    let pts = null;
    el.addEventListener('pointerdown', (e) => {
      if (!this.canSpin) return;
      pts = [[e.clientX, e.clientY, performance.now()]];
      try { el.setPointerCapture(e.pointerId); } catch (er) {}
    });
    el.addEventListener('pointermove', (e) => {
      if (!pts) return;
      pts.push([e.clientX, e.clientY, performance.now()]);
      if (pts.length > 8) pts.shift();
    });
    const up = (e) => {
      if (!pts) return;
      const a = pts[0], b = [e.clientX, e.clientY, performance.now()];
      pts = null;
      if (!this.canSpin) return;
      const dt = Math.max(16, b[2] - a[2]) / 1000;
      const v = Math.hypot(b[0] - a[0], b[1] - a[1]) / this.ui.scale / dt;
      let w = Math.min(1500, v * 0.9);
      if (w < 520) w = 560 + Math.random() * 380; // простое касание тоже крутит
      this.answer({ act: 'spin', w });
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', () => (pts = null));
  }

  // ---------- монеты ----------
  addCoins(n) {
    this.S.coins = Math.max(0, this.S.coins + Math.round(n));
    this.ui.setCoins(this.S.coins);
  }

  // ---------- меню ----------
  toMenu(first = false) {
    this.abortFlow();
    this.ff = false;
    this.paused = false;
    this.state = 'menu';
    sdk.gameplay(false);
    audio.setMood('menu');
    this.ui.closeModal();
    this.ui.hideBubble();
    const st = this.studio;
    st.setCast(shuffle(ROSTER).slice(0, 3));
    st.lookAll('cam');
    st.shot('menu', null, first);
    if (!first) st.anim('host', 'wave', 1.6);
    const R = this.S.run;
    const cont = R && R.stage < 5 ? `<button class="btn b-xl red pulse cont" id="mcont">Продолжить<small>${esc(this.stageName(R.stage))}</small></button>
<div class="mrow"><button class="btn b-m blue" id="mplay">Новая игра</button><button class="btn b-m blue" id="mmus">${ICONS.museum}Призы</button></div>
<div class="mrow"><button class="btn b-m blue" id="mgift">${ICONS.gift}Подарки ведущему</button></div>` : `<button class="btn b-xl red pulse" id="mplay">Играть</button>
<div class="mrow"><button class="btn b-m blue" id="mmus">${ICONS.museum}Призы</button><button class="btn b-m blue" id="mgift">${ICONS.gift}Подарки ведущему</button></div>`;
    this.ui.showMenu(`${cont}
<div class="mrow"><button class="btn b-m" id="mshop">${ICONS.shop}Магазин</button><button class="btn b-m" id="mrate">${ICONS.rating}Рейтинг</button></div>
<div class="mrow"><button class="btn b-s ghost" id="mrules">${ICONS.rules}Правила</button><button class="btn b-s ghost" id="mset">${ICONS.sound}Настройки</button></div>`);
    const on = (id, f) => (document.getElementById(id).onclick = () => { this.click(); f(); });
    on('mplay', () => this.newGame());
    if (R) on('mcont', () => this.newGame(true));
    on('mmus', () => this.openMuseum());
    on('mgift', () => this.openGifts());
    on('mshop', () => this.openShop());
    on('mrate', () => this.openRating());
    on('mrules', () => this.openRules());
    on('mset', () => this.openSettings());
    if (first) {
      setTimeout(() => sdk.ready(), 50);
      if (!this.debug.nodaily) setTimeout(() => this.checkDaily(), 600);
    }
    this.menuTalk();
  }
  async menuTalk() {
    const id = ++this.flowId;
    try {
      await this.wait(1.2);
      this.check(id);
      if (this.state === 'menu' && !this.ui.modalOpen) await this.say('menu');
    } catch (e) {
      if (!(e instanceof Abort)) throw e;
    }
  }

  checkDaily() {
    const d = this.S.daily;
    if (d.day === today() || this.state !== 'menu') return;
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const back = !!d.day; // «С возвращением» — только если игрок уже заходил раньше
    d.streak = d.day === y ? Math.min(7, d.streak + 1) : 1;
    d.day = today();
    const n = DAILY_COINS + (d.streak - 1) * 20;
    this.addCoins(n);
    save.write();
    if (back) this.say('daily').catch(() => {});
    const m = this.ui.modal(`${this.ui.head('Подарок студии')}<div class="pb center"><div class="prizebig">${ICONS.gift.replace('<svg', '<svg style="width:200px;height:200px"')}</div>
<p>День ${d.streak} подряд. Ведущий дарит вам монеты!</p><div class="res"><div>${ICONS.coin}+${n}</div></div>
<div class="row"><button class="btn b-m green" id="d2">${ICONS.ad}Удвоить</button><button class="btn b-m" id="dok">Спасибо!</button></div></div>`);
    m.querySelector('#dok').onclick = () => { this.click(); this.ui.closeModal(); };
    m.querySelector('#d2').onclick = () => {
      this.click();
      sdk.showRewarded(() => { this.addCoins(n); save.write(); this.ui.toast(`+${n} монет`); }, () => this.ui.closeModal());
    };
  }

  // ---------- новая игра: три тройки → полуфинал → суперигра ----------
  // Прогресс забега хранится в S.run и переживает выход в меню.
  async newGame(resume = false) {
    this.abortFlow();
    const id = this.flowId;
    this.state = 'play';
    this.ff = false;
    this.ui.closeModal();
    this.ui.showPlay();
    this.ui.hideBubble();
    if (!resume || !this.S.run) {
      this.S.stats.games++;
      this.S.run = { stage: 0, cast: shuffle(ROSTER).slice(0, 9).map((c) => c.id), fin: [], bank: 0 };
      save.write();
    }
    try {
      await this.runLoop();
    } catch (e) {
      if (!(e instanceof Abort)) throw e;
    }
    void id;
  }
  async runLoop() {
    const R = this.S.run;
    while (R.stage < 3) {
      const r = await this.tour(R.stage);
      R.fin[R.stage] = { id: r.winner.id, mine: r.win };
      R.stage++;
      save.write();
      const ch = await this.tourResult(r);
      if (ch === 'menu') return this.toMenu();
      await this.maybeAd();
    }
    if (R.stage === 3) {
      if (!R.fin.some((f) => f.mine)) return this.runOver();
      const r = await this.tour(3);
      if (!r.win) return this.gameOver(r);
      R.stage = 4;
      R.superId = r.winner.id;
      save.write();
      const ch = await this.tourResult(r);
      if (ch === 'menu') return this.toMenu();
    }
    if (R.stage === 4) await this.superGame();
  }
  stageName(stage) {
    return ['Первая тройка', 'Вторая тройка', 'Третья тройка', 'Полуфинал', 'Суперигра'][stage];
  }
  charById(id) {
    return ROSTER.find((c) => c.id === id) || ROSTER[0];
  }

  pickQuestion(stage) {
    const used = new Set(this.S.used);
    const wts = stage === 0 ? [0.65, 0.35, 0] : stage === 1 ? [0.12, 0.55, 0.33] : [0, 0.15, 0.85];
    const r = Math.random();
    let d = r < wts[0] ? 1 : r < wts[0] + wts[1] ? 2 : 3;
    const ok = (q) => q.d === d && !used.has(q.a) && (stage < 2 || (q.a.length >= 6 && q.a.length <= 11));
    let list = QUESTIONS.filter(ok);
    if (!list.length) {
      this.S.used = [];
      list = QUESTIONS.filter((q) => q.d === d);
    }
    const q = pick(list);
    this.S.used.push(q.a);
    if (this.S.used.length > 360) this.S.used.splice(0, this.S.used.length - 360);
    return q;
  }

  // выбор героя тройки: за кого играет игрок
  async pickHero(P) {
    if (this.debug.auto || this.debug.pick !== undefined) return this.debug.pick !== undefined ? this.debug.pick : rnd(3);
    await this.say('pick', { opt: true });
    return new Promise((res) => {
      const m = this.ui.modal(`${this.ui.head('За кого играете?', false)}<div class="pb"><p class="center sm">Выберите героя этой тройки. Вы будете вращать барабан и называть буквы за него.</p><div class="heroes">${P.map((p, i) => `<button class="hero" data-i="${i}"><img src="${this.studio.portrait(p)}" alt=""><b>${esc(p.name)}</b><span>${esc(p.from)}</span><span class="sm">${esc(p.job)}</span></button>`).join('')}</div></div>`, { wide: true });
      m.querySelectorAll('.hero').forEach((b) => {
        b.onpointerenter = () => this.studio.lookAll(+b.dataset.i);
        b.onclick = () => { this.click(); this.ui.closeModal(); res(+b.dataset.i); };
      });
    });
  }

  // ---------- тур (тройка или полуфинал) ----------
  async tour(stage) {
    const id = this.flowId;
    this.ff = false;
    this.state = 'play';
    sdk.gameplay(true);
    audio.setMood(stage < 3 ? 'game' : 'final');
    const R = this.S.run;
    const fin = stage === 3;
    const q = this.pickQuestion(fin ? 1 : 0);
    const defs = fin ? R.fin.map((f) => this.charById(f.id)) : R.cast.slice(stage * 3, stage * 3 + 3).map((c) => this.charById(c));
    const P = defs.map((d, i) => ({ ...d, sub: `${d.from}, ${d.job}`, me: fin ? !!R.fin[i].mine : false, score: 0, out: false, skill: this.debug.win ? 0.01 : fin ? 0.38 + Math.random() * 0.18 : 0.22 + Math.random() * 0.16 }));
    const word = q.a;
    const T = (this.T = { stage, q, word, open: [...word].map(() => false), used: new Set(), yes: new Set(), P, turn: 0, winner: -1, streak: 0, boxes: false, hint: null, spun: false });
    const st = this.studio;
    this.ui.setStageLabel(this.stageName(stage));
    this.ui.qEl.classList.add('hide');
    this.ui.boardEl.classList.add('hide');
    this.ui.playersEl.classList.add('hide');
    this.ui.setActions('');
    st.setCast(defs);
    st.lookAll('cam');
    st.shot('wide');
    for (let k = 0; k < 3; k++) setTimeout(() => st.anim(k, 'wave', 1.6), 500 + k * 400);
    if (stage === 0 && !this.S.run.greeted) {
      await this.say(this.S.seen.hello ? 'hello' : 'hello_first');
      this.S.seen.hello = 1;
      this.S.run.greeted = 1;
    }
    await this.say(fin ? 'meet_final' : 'meet' + (stage + 1));
    if (!fin) {
      const k = await this.pickHero(P);
      this.check(id);
      P[k].me = true;
      st.anim(k, 'cheer', 1.4);
      this.ui.toast(`Вы играете за героя: ${P[k].name}`, 2400);
    }
    this.ui.buildBoard(word);
    this.ui.setPlayers(P);
    this.ui.updatePlayers(P, -1);
    st.lookAll('host');
    await this.say('greet', { opt: true });
    await this.say('task');
    this.ui.setQuestion(q.q);
    audio.play('open');
    await this.wait(0.8);
    // подарок ведущему открывает букву
    if (this.S.bonusLetters > 0 && stage === 0) {
      const L = this.bestHidden();
      if (L) {
        this.S.bonusLetters--;
        save.write();
        this.ui.toast(`Подарок ведущему помог: открыта буква «${L}»`, 2800);
        await this.openLetter(L);
        await this.wait(0.6);
      }
    }
    T.turn = this.debug.first === 'me' ? P.findIndex((p) => p.me) : rnd(3);
    await this.say('first', { opt: true });
    while (T.winner < 0) {
      this.check(id);
      const p = P[T.turn];
      if (p.out) { T.turn = (T.turn + 1) % 3; continue; }
      this.ui.updatePlayers(P, T.turn);
      st.setTurn(T.turn);
      st.lookAll(T.turn);
      if (!this.ff) st.shot('mid', T.turn);
      const again = p.me ? await this.meTurn() : await this.botTurn();
      this.ui.updatePlayers(P, T.turn);
      if (T.winner >= 0) break;
      if (!again) {
        T.streak = 0;
        T.hint = null;
        let n = (T.turn + 1) % 3;
        while (P[n].out) n = (n + 1) % 3;
        T.turn = n;
        await this.wait(0.3);
        if (!this.ff) await this.say('next', { opt: true });
      }
    }
    this.ui.sectorBadge('');
    this.ui.setActions('');
    this.ui.updatePlayers(P, T.winner);
    const w = P[T.winner];
    this.ff = false;
    st.setTurn(T.winner);
    P.forEach((p, k) => st.mood(k, k === T.winner ? 'happy' : 'sad'));
    st.shot('close', T.winner);
    const mine = P.filter((p) => p.me);
    return { win: w.me, stage, score: w.me ? w.score : Math.max(0, ...mine.map((p) => p.score)), winner: w, word };
  }

  hiddenLetters() {
    const T = this.T;
    const s = new Set();
    [...T.word].forEach((ch, i) => { if (!T.open[i]) s.add(norm(ch)); });
    return s;
  }
  bestHidden() {
    const h = [...this.hiddenLetters()].filter((l) => !this.T.used.has(l));
    if (!h.length) return null;
    const cnt = (l) => [...this.T.word].filter((c) => norm(c) === l).length;
    h.sort((a, b) => cnt(b) - cnt(a) || FREQ[b] - FREQ[a]);
    return h[0];
  }

  // открыть все клетки с буквой; возвращает количество
  async openLetter(L) {
    const T = this.T;
    T.used.add(L);
    const idx = [...T.word].map((c, i) => (norm(c) === L && !T.open[i] ? i : -1)).filter((i) => i >= 0);
    if (idx.length) T.yes.add(L);
    for (const i of idx) {
      T.open[i] = true;
      this.ui.openCell(i);
      audio.play('open', i % 3);
      await this.wait(0.38);
    }
    return idx.length;
  }
  complete() {
    return this.T.open.every(Boolean);
  }

  // ---------- ход игрока ----------
  async meTurn() {
    const T = this.T;
    const p = T.P[T.turn];
    if (this.debug.auto) return this.botTurn(this.debug.win ? 1 : 0.55);
    await this.say(T.spun ? 'spin' : 'your_turn', { opt: T.spun });
    T.spun = true;
    for (;;) {
      this.turnButtons();
      this.canSpin = true;
      this.ui.drumEl.style.cursor = 'grab';
      const a = await this.ask();
      this.canSpin = false;
      this.ui.drumEl.style.cursor = '';
      this.ui.setActions('');
      if (a.act === 'hint') { await this.useHint(); continue; }
      if (a.act === 'word') {
        const r = await this.meWord();
        if (r === 'cancel') continue;
        return r;
      }
      this.click();
      const v = await this.spinBy(T.turn, a.w);
      return this.sector(T.turn, v, p);
    }
  }
  turnButtons() {
    const T = this.T;
    const hintTxt = T.hint ? 'Подсказка есть' : this.S.coins >= HINT_COST ? `${ICONS.hint}Помощь зала ${ICONS.coin.replace('<svg', '<svg style="width:30px;height:30px"')}${HINT_COST}` : `${ICONS.ad}Помощь зала`;
    this.ui.setActions(`<button class="btn b-l red pulse" id="aspin">Вращать барабан</button>
<button class="btn b-m blue" id="aword">Назвать слово</button>
<button class="btn b-s" id="ahint"${T.hint ? ' disabled' : ''}>${hintTxt}</button>
<div class="swipehint">Можно раскрутить барабан пальцем</div>`);
    document.getElementById('aspin').onclick = () => this.answer({ act: 'spin', w: 640 + Math.random() * 480 });
    document.getElementById('aword').onclick = () => { this.click(); this.answer({ act: 'word' }); };
    document.getElementById('ahint').onclick = () => { this.click(); this.answer({ act: 'hint' }); };
  }
  // «Помощь зала»: подсвечивает на клавиатуре букву, которая есть в слове
  async useHint() {
    const T = this.T;
    const L = this.bestHidden();
    if (!L) return;
    if (this.S.coins >= HINT_COST) {
      this.addCoins(-HINT_COST);
      save.write();
    } else {
      const ok = await new Promise((r) => sdk.showRewarded(() => r(true), (got) => !got && r(false)));
      if (!ok) return;
    }
    T.hint = L;
    await this.say('hint');
    this.ui.toast(`Зал подсказывает: попробуйте букву «${L}»`, 3000);
  }

  // после сектора
  async sector(i, v, p) {
    const T = this.T;
    const me = p.me && !this.debug.auto;
    if (typeof v === 'number') {
      this.ui.sectorBadge(fmt(v), 'gold');
      if (!this.ff) this.studio.shot('mid', i);
      await this.say('p' + v, { opt: !me });
      return this.letterTurn(i, v, 'pts');
    }
    if (v === 'B') {
      this.ui.sectorBadge('Банкрот', 'dark');
      this.studio.anim(i, 'sad');
      this.studio.shot('close', i);
      audio.play('bankrot');
      p.score = 0;
      this.ui.updatePlayers(T.P, T.turn);
      await this.say('bankrot');
      this.ui.sectorBadge('');
      return false;
    }
    if (v === '0') {
      this.ui.sectorBadge('Ноль', 'dark');
      this.studio.anim(i, 'shrug');
      audio.play('wrong');
      await this.say('zero');
      this.ui.sectorBadge('');
      return false;
    }
    if (v === 'x2') {
      this.ui.sectorBadge('×2');
      await this.say('x2');
      return this.letterTurn(i, 0, 'x2');
    }
    if (v === '+') {
      this.ui.sectorBadge('Плюс', 'gold');
      await this.say('plus');
      let ci;
      if (me) {
        this.ui.setPickable(true);
        this.ui.setActions('<div class="swipehint" style="font-size:28px">Нажмите на любую закрытую клетку табло</div>');
        ci = (await this.ask()).cell;
        this.ui.setPickable(false);
        this.ui.setActions('');
      } else {
        await this.wait(0.8);
        const closed = T.open.map((o, k) => (o ? -1 : k)).filter((k) => k >= 0);
        ci = pick(closed);
      }
      const L = norm(T.word[ci]);
      this.ui.playerSay(i, `Буква <b>${L}</b>`);
      this.studio.anim(i, 'point');
      await this.openLetter(L);
      this.ui.sectorBadge('');
      if (this.complete()) return this.winBy(i);
      T.streak++;
      if (me) await this.maybeBoxes();
      return true;
    }
    if (v === 'P') {
      this.ui.sectorBadge('Приз', 'gold');
      this.studio.shot('mid', i);
      this.studio.anim(i, 'cheer', 1.2);
      audio.play('drumroll');
      await this.say('prize');
      let take;
      if (me) take = await this.askPrize();
      else { await this.wait(0.6); take = Math.random() < 0.15; }
      if (take) {
        const pr = pick(PRIZES);
        p.score = 0;
        this.ui.updatePlayers(T.P, T.turn);
        await this.say(me ? 'prize_take' : 'bot_prize');
        audio.play('prize');
        if (me) {
          this.S.prizes[pr.id] = (this.S.prizes[pr.id] || 0) + 1;
          save.write();
          await this.showPrize(pr, 'Приз в студию!');
        } else {
          this.ui.playerSay(i, `Беру приз! <b>${esc(pr.name)}</b>`, 2400);
          await this.wait(1.6);
        }
        this.ui.sectorBadge('');
        return false;
      }
      this.ui.playerSay(i, 'Играем!');
      await this.say('prize_play', { opt: !me });
      return this.letterTurn(i, 500, 'pts');
    }
    return false;
  }

  askPrize() {
    return new Promise((res) => {
      const m = this.ui.modal(`${this.ui.head('Сектор «Приз»', false)}<div class="pb center"><div class="prizebig">${ICONS.box.replace('<svg', '<svg style="width:240px;height:220px"')}</div>
<p>Приз в чёрном ящике или играем дальше?</p><p class="sm">Возьмёте приз — он попадёт в ваш музей призов, но очки этого тура сгорят, и ход перейдёт сопернику. Играете — называйте букву, каждая угаданная принесёт 500 очков.</p>
<div class="row"><button class="btn b-m blue" id="ptake">Взять приз</button><button class="btn b-m red" id="pplay">Играем!</button></div></div>`);
      m.querySelector('#ptake').onclick = () => { this.click(); this.ui.closeModal(); res(true); };
      m.querySelector('#pplay').onclick = () => { this.click(); this.ui.closeModal(); res(false); };
    });
  }
  showPrize(pr, title) {
    this.ui.confetti();
    return new Promise((res) => {
      const m = this.ui.modal(`${this.ui.head(title, false)}<div class="pb center"><div class="prizebig">${prizeSVG(pr.id)}</div><p style="font-size:40px;color:#ffe48a">${esc(pr.name)}</p><p class="sm">Приз добавлен в ваш музей призов.</p><div class="row"><button class="btn b-m" id="pok">Отлично!</button></div></div>`);
      m.querySelector('#pok').onclick = () => { this.click(); this.ui.closeModal(); res(); };
      if (this.debug.auto) setTimeout(() => { this.ui.closeModal(); res(); }, 300);
    });
  }

  // буква после сектора с очками (mode: 'pts' — очки за каждую букву, 'x2' — удвоение счёта)
  async letterTurn(i, v, mode) {
    const T = this.T;
    const p = T.P[i];
    const me = p.me && !this.debug.auto;
    let L;
    if (me) {
      await this.say('letter', { opt: true });
      const r = await this.askLetter();
      if (r.word) {
        this.ui.sectorBadge('');
        const w = await this.meWord(true);
        return w === 'cancel' ? this.letterTurn(i, v, mode) : w;
      }
      L = r.letter;
    } else {
      this.studio.anim(i, 'think', 1.2);
      await this.wait(0.9);
      const d = this.botDecide(p);
      if (d.word) return this.botWord(i);
      L = d.letter;
    }
    this.ui.sectorBadge('');
    this.ui.playerSay(i, `Буква <b>${L}</b>!`);
    this.studio.anim(i, 'point');
    if (!this.ff) audio.play('drumroll');
    await this.wait(0.9);
    const n = await this.openLetter(L);
    if (n) {
      if (mode === 'x2') p.score = p.score > 0 ? p.score * 2 : 200 * n;
      else p.score += v * n;
      this.ui.updatePlayers(T.P, T.turn);
      if (p.me) this.S.stats.letters += n;
      audio.applause(1.2, 0.7);
      this.studio.applause(1.4);
      this.studio.anim(i, n >= 2 ? 'cheer' : 'nod', n >= 2 ? 1.3 : 0.9);
      if (this.complete()) return this.winBy(i);
      await this.say(n >= 3 ? 'yes3' : n === 2 ? 'yes2' : 'yes', { opt: !me });
      T.streak++;
      if (me) {
        await this.maybeBoxes();
        const left = this.hiddenLetters().size;
        if (left === 1) await this.say('last_one', { opt: true });
        else if (T.open.filter(Boolean).length / T.open.length >= 0.6 && Math.random() < 0.5) await this.say('try_word', { opt: true });
      }
      return true;
    }
    audio.play('wrong');
    this.studio.anim(i, 'shrug');
    if (T.hint === L) T.hint = null;
    await this.say('no');
    return false;
  }

  askLetter() {
    const T = this.T;
    this.ui.keyboard({
      title: 'Назовите букву',
      used: T.used,
      yes: T.yes,
      hint: T.hint,
      onKey: (ch) => { audio.play('key'); this.ui.closeKeyboard(); this.answer({ letter: ch }); },
      extra: '<button class="btn b-s blue" id="kword">Назвать слово целиком</button>',
      bind: (k) => (k.querySelector('#kword').onclick = () => { this.click(); this.ui.closeKeyboard(); this.answer({ word: true }); }),
    });
    return this.ask();
  }

  // игрок называет слово: true — угадал, false — выбыл, 'cancel' — передумал
  async meWord() {
    const T = this.T;
    await this.say('word_ask', { opt: true });
    const s = await this.askWord({ title: 'Назовите слово', cancel: true });
    if (s === null) return 'cancel';
    const ok = [...s].map(norm).join('') === [...T.word].map(norm).join('');
    if (ok) return this.winBy(T.turn);
    audio.play('wrong');
    this.studio.mood(T.turn, 'out');
    await this.say('word_no');
    T.P[T.turn].out = true;
    this.ui.updatePlayers(T.P, T.turn);
    // тур доигрывается без игрока, быстро
    this.ui.toast('Тур продолжается без вас…', 2200);
    this.ff = true;
    return false;
  }

  // ввод слова по клеткам: открытые буквы уже стоят
  askWord({ title, cancel, timer = 0 }) {
    const T = this.T;
    const word = [...T.word];
    const val = word.map((c, i) => (T.open[i] ? c : ''));
    const fixed = word.map((c, i) => T.open[i]);
    let cur = val.findIndex((v, i) => !fixed[i]);
    const ws = Math.min(60, Math.floor((this.ui.port ? 820 : 900) / word.length) - 8);
    const draw = (k) => {
      const line = k.querySelector('.wline');
      line.innerHTML = val.map((v, i) => `<div class="wl${fixed[i] ? ' fix' : ''}${i === cur ? ' cur' : ''}">${esc(v)}</div>`).join('');
      k.querySelector('#wok').disabled = val.some((v) => !v);
    };
    return new Promise((res, rej) => {
      const id = this.flowId;
      const done = (v) => { this.onTick = null; this.ui.closeKeyboard(); this.pend = null; id === this.flowId ? res(v) : rej(new Abort()); };
      this.pend = { res: done, rej };
      const k = this.ui.keyboard({
        title,
        line: `${timer ? '<div class="timer" id="wtimer"></div>' : ''}<div class="wline" style="--ws:${ws}px"></div>`,
        onKey: (ch, b) => {
          audio.play('key');
          if (cur < 0) return;
          val[cur] = ch;
          let n = cur + 1;
          while (n < val.length && fixed[n]) n++;
          cur = n < val.length ? n : -1;
          draw(k);
        },
        extra: `<button class="btn b-s ghost" id="wdel">⌫ Стереть</button>${cancel ? '<button class="btn b-s ghost" id="wcan">Отмена</button>' : ''}<button class="btn b-m green" id="wok">Ответить</button>`,
        bind: (k) => {
          k.querySelector('#wdel').onclick = () => {
            audio.play('key');
            let n = (cur < 0 ? val.length : cur) - 1;
            while (n >= 0 && fixed[n]) n--;
            if (n >= 0) { val[n] = ''; cur = n; }
            draw(k);
          };
          if (cancel) k.querySelector('#wcan').onclick = () => { this.click(); done(null); };
          k.querySelector('#wok').onclick = () => { this.click(); done(val.join('')); };
        },
      });
      draw(k);
      if (timer) {
        let left = timer;
        const te = k.querySelector('#wtimer');
        let lastS = -1;
        const upd = () => {
          const s = Math.ceil(left);
          te.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
          te.classList.toggle('low', s <= 10);
          if (s !== lastS && s <= 10) audio.play('timer', s <= 3 ? 1 : 0);
          lastS = s;
        };
        upd();
        this.onTick = (dt) => {
          left -= dt;
          if (left <= 0) { this.onTick = null; done(val.join('').length === val.length ? val.join('') : ''); return; }
          upd();
        };
      }
    });
  }

  async winBy(i) {
    const T = this.T;
    const p = T.P[i];
    for (let k = 0; k < T.open.length; k++) if (!T.open[k]) { T.open[k] = true; this.ui.openCell(k); audio.play('open', k % 3); await this.wait(0.12); }
    T.winner = i;
    this.ff = false;
    this.ui.updatePlayers(T.P, i);
    this.studio.shot('close', i);
    this.studio.anim(i, 'cheer', 2.4);
    this.studio.clapOthers(i);
    this.studio.applause(3);
    if (p.me) {
      this.S.stats.words++;
      audio.play('win');
      this.ui.confetti();
      await this.say('word_yes');
    } else {
      audio.applause(2, 1);
      await this.say('bot_win');
    }
    return true;
  }

  // ---------- шкатулки: три буквы подряд ----------
  async maybeBoxes() {
    const T = this.T;
    if (T.streak < 3 || T.boxes) return;
    T.boxes = true;
    await this.say('boxes');
    await this.say('box_pick', { opt: true });
    const win = rnd(2);
    const prize = pick([100, 150, 200, 300]);
    const choice = await new Promise((res) => {
      const m = this.ui.modal(`${this.ui.head('Шкатулки', false)}<div class="pb center"><p>В одной шкатулке деньги, другая пустая. Выбирайте!</p><div class="boxes"><button data-b="0">${ICONS.box}</button><button data-b="1">${ICONS.box}</button></div></div>`);
      m.querySelectorAll('.boxes button').forEach((b) => (b.onclick = () => { audio.play('box'); res(+b.dataset.b); }));
    });
    const m = this.ui.modalEl;
    const bs = m.querySelectorAll('.boxes button');
    bs.forEach((b, k) => {
      b.disabled = true;
      b.innerHTML = k === win ? ICONS.money : '<div style="font-size:40px;color:#c8c0ff">пусто</div>';
      b.classList.add('opened');
      if (k === choice) b.style.borderColor = '#fff';
    });
    if (choice === win) {
      this.addCoins(prize);
      save.write();
      audio.play('coin');
      m.querySelector('.pb p').textContent = `Деньги! +${prize} монет`;
      await this.say('box_win');
    } else {
      m.querySelector('.pb p').textContent = 'Увы, шкатулка пустая.';
      await this.say('box_empty');
    }
    await this.wait(0.8);
    this.ui.closeModal();
  }

  // ---------- соперники ----------
  async botTurn(skillOverride) {
    const T = this.T;
    const i = T.turn;
    const p = T.P[i];
    await this.say('spin', { opt: true });
    await this.wait(0.5);
    const v = await this.spinBy(i, 560 + Math.random() * 560);
    if (skillOverride) p.skill = skillOverride;
    return this.sector(i, v, p);
  }
  // решение соперника: назвать слово (если «знает») или букву
  botDecide(p) {
    const T = this.T;
    const r = T.open.filter(Boolean).length / T.open.length;
    const left = this.hiddenLetters().size;
    let pw = p.skill * Math.pow(r, 1.6) * 1.1 + (left <= 1 ? 0.55 : left <= 2 ? 0.18 : 0);
    if (r < 0.34) pw = 0;
    if (this.debug.win && p.me) { const h = [...this.hiddenLetters()].filter((l) => !T.used.has(l)); if (h.length) return { letter: h[0] }; }
    if (this.debug.win && !p.me) { const miss = ALPHABET.filter((l) => !T.used.has(l) && !this.hiddenLetters().has(l)); if (miss.length) return { letter: miss[0] }; }
    if (Math.random() < pw && !p.me) return { word: true };
    const hidden = this.hiddenLetters();
    const cand = ALPHABET.filter((l) => !T.used.has(l));
    const wts = cand.map((l) => (FREQ[l] || 1) * (hidden.has(l) ? 1 + p.skill * 3 : 1));
    let s = wts.reduce((a, b) => a + b, 0) * Math.random();
    for (let k = 0; k < cand.length; k++) { s -= wts[k]; if (s <= 0) return { letter: cand[k] }; }
    return { letter: cand[cand.length - 1] };
  }
  async botWord(i) {
    const T = this.T;
    this.ui.sectorBadge('');
    this.ui.playerSay(i, `Слово: <b>${esc(T.word)}</b>!`, 2600);
    if (!this.ff) audio.play('drumroll');
    await this.wait(1.4);
    return this.winBy(i);
  }

  // ---------- итоги тура ----------
  tourCoins(r) {
    if (r.stage < 3) return r.win ? Math.floor(r.score / 15) + 30 : 20 + Math.floor(r.score / 60);
    return r.win ? Math.floor(r.score / COINS_PER_POINTS) + 120 : LOSE_COINS + Math.floor(r.score / 40);
  }
  // итоги тройки (выиграл или нет — игра идёт дальше) и победы в полуфинале
  async tourResult(r) {
    sdk.gameplay(false);
    const coins = this.tourCoins(r);
    this.addCoins(coins);
    this.S.stats.tours++;
    if (r.win) {
      this.S.run.bank += r.score;
      this.S.bank += r.score;
      if (r.stage === 3) this.S.stats.finals++;
    }
    save.write();
    if (r.win) sdk.submitScore(this.S.bank);
    const last = r.stage === 2;
    const nextTxt = r.stage === 3 ? 'В суперигру!' : last ? 'В полуфинал!' : 'Следующая тройка';
    const w = r.winner;
    if (r.win) await this.say(r.stage === 3 ? 'final_win' : 'tour_win');
    else {
      audio.play('lose');
      await this.say(last ? 'tour_lose' : 'tour_lose_next');
    }
    const ok = this.S.run.fin.filter((f) => f && f.mine).length;
    let title, text;
    if (r.stage === 3) [title, text] = ['Победа в полуфинале!', `Слово: «${r.word}». ${w.name} играет в суперигре за суперприз!`];
    else if (r.win) [title, text] = [`${w.name} в полуфинале!`, `Слово: «${r.word}». Ваш герой проходит в полуфинал.${last ? '' : ' Впереди следующая тройка.'}`];
    else [title, text] = [`Тройку выиграл${w.f ? 'а' : ''} ${w.name}`, `${w.name} отгадал${w.f ? 'а' : ''} слово «${r.word}» и проходит в полуфинал.${last ? (ok ? '' : '') : ' Впереди следующая тройка, сыграйте за другого героя!'}`];
    if (last && !ok) return 'next';
    return this.resultModal({ title, text, coins, score: r.score, next: nextTxt, menu: true, fin: r.stage < 3 });
  }
  // ни один герой игрока не прошёл в полуфинал
  async runOver() {
    sdk.gameplay(false);
    this.S.run = null;
    save.write();
    this.studio.shot('wide');
    await this.say('no_final');
    const ch = await this.resultModal({ title: 'Полуфинал без вас', text: 'Ни один из ваших героев не выиграл свою тройку. Попробуйте ещё раз: барабан обязательно повернётся в вашу сторону!', coins: 0, score: 0 });
    return this.afterGame(ch);
  }
  async gameOver(r) {
    sdk.gameplay(false);
    const coins = this.tourCoins(r);
    this.addCoins(coins);
    this.S.stats.tours++;
    this.S.run = null;
    save.write();
    audio.play('lose');
    await this.say('tour_lose');
    const ch = await this.resultModal({
      title: 'Полуфинал проигран',
      text: `${r.winner.name} отгадал${r.winner.f ? 'а' : ''} слово «${r.word}» и уходит в суперигру. Утешительный приз от студии:`,
      coins,
      score: r.score,
    });
    return this.afterGame(ch);
  }
  // окно итогов; возвращает 'next' | 'again' | 'menu'
  resultModal({ title, text, coins, score, next, menu, fin }) {
    return new Promise((res) => {
      let doubled = false;
      const R = this.S.run;
      const finRow = fin && R ? `<div class="finrow">${[0, 1, 2].map((k) => { const f = R.fin[k]; if (!f) return `<div class="fslot"><span>?</span><small>${k + 1}-я тройка</small></div>`; const d = this.charById(f.id); return `<div class="fslot${f.mine ? ' mine' : ''}"><img src="${this.studio.portrait(d)}" alt=""><small>${esc(d.name)}</small></div>`; }).join('')}</div><p class="sm center">Полуфиналисты${R.fin.some((f) => f && f.mine) ? '. Золотая рамка: ваш герой' : ''}</p>` : '';
      const m = this.ui.modal(`${this.ui.head(title, false)}<div class="pb center"><p>${esc(text)}</p>${finRow}
<div class="res">${score ? `<div>${ICONS.star}${fmt(score)}<small>очков</small></div>` : ''}${coins ? `<div>${ICONS.coin}+<span id="rc">${fmt(coins)}</span><small>монет</small></div>` : ''}</div>
<div class="row">${coins > 0 ? `<button class="btn b-s green" id="r2">${ICONS.ad}Удвоить монеты</button>` : ''}</div>
<div class="row" style="margin-top:18px">${next ? `<button class="btn b-l red pulse" id="rnext">${esc(next)}</button>${menu ? '<button class="btn b-s ghost" id="rmenu">В меню</button>' : ''}` : `<button class="btn b-l red" id="ragain">Ещё раз</button><button class="btn b-m blue" id="rmenu">В меню</button>`}</div></div>`, { wide: !!finRow });
      const b2 = m.querySelector('#r2');
      if (b2) b2.onclick = () => {
        if (doubled) return;
        this.click();
        sdk.showRewarded(() => { doubled = true; this.addCoins(coins); save.write(); m.querySelector('#rc').textContent = fmt(coins * 2); b2.disabled = true; this.ui.toast(`+${coins} монет`); });
      };
      const on = (id, v) => { const e = m.querySelector('#' + id); if (e) e.onclick = () => { this.click(); this.ui.closeModal(); res(v); }; };
      on('rnext', 'next');
      on('ragain', 'again');
      on('rmenu', 'menu');
      if (this.debug.auto) setTimeout(() => { this.ui.closeModal(); res(next ? 'next' : 'menu'); }, 400);
    });
  }
  // после конца игры: реклама в логической паузе, затем новая игра или меню
  async afterGame(ch) {
    await this.maybeAd();
    if (ch === 'again') this.newGame();
    else this.toMenu();
  }
  async maybeAd() {
    if (!sdk.real || this.S.noAds || Date.now() - this.lastAd < 60000) return;
    this.lastAd = Date.now();
    try { await this.say('ad'); } catch (e) {}
    await new Promise((r) => sdk.showInterstitial(r));
  }

  // ---------- суперигра ----------
  async superGame() {
    const id = this.flowId;
    this.state = 'play';
    sdk.gameplay(true);
    audio.setMood('super');
    this.ui.setStageLabel('Суперигра');
    this.ui.playersEl.classList.add('hide');
    this.ui.setActions('');
    const q = this.pickQuestion(2);
    this.T = { stage: 4, q, word: q.a, open: [...q.a].map(() => false), used: new Set(), yes: new Set(), P: [], turn: 0, winner: -1 };
    this.ui.qEl.classList.add('hide');
    const hero = this.charById(this.S.run && this.S.run.superId);
    const st = this.studio;
    st.setCast([null, hero, null]);
    st.setTurn(1);
    st.lookAll('host');
    st.shot('mid', 1);
    this.ui.buildBoard(q.a);
    await this.say('super_intro');
    const sp = this.debug.auto ? SUPER_PRIZES[0] : await new Promise((res) => {
      const m = this.ui.modal(`${this.ui.head('Выберите суперприз', false)}<div class="pb"><div class="grid">${SUPER_PRIZES.map((p) => `<button class="card" data-id="${p.id}">${prizeSVG(p.id)}<span>${esc(p.name)}</span></button>`).join('')}</div></div>`, { wide: true });
      m.querySelectorAll('.card').forEach((c) => (c.onclick = () => { this.click(); this.ui.closeModal(); res(SUPER_PRIZES.find((p) => p.id === c.dataset.id)); }));
    });
    this.check(id);
    await this.say('task');
    this.ui.setQuestion(q.q);
    await this.wait(0.6);
    await this.say('super_letters');
    // выбор трёх букв
    let letters;
    if (this.debug.auto) letters = shuffle(ALPHABET).slice(0, SUPER_LETTERS);
    else {
      const sel = new Set();
      letters = await new Promise((res) => {
        const draw = () => {
          this.ui.keyboard({
            title: `Выберите ${SUPER_LETTERS} буквы (${sel.size} из ${SUPER_LETTERS})`,
            sel,
            onKey: (ch) => { audio.play('key'); sel.has(ch) ? sel.delete(ch) : sel.size < SUPER_LETTERS && sel.add(ch); draw(); },
            extra: `<button class="btn b-m green" id="sok"${sel.size < SUPER_LETTERS ? ' disabled' : ''}>Открыть буквы</button>`,
            bind: (k) => (k.querySelector('#sok').onclick = () => { this.click(); this.ui.closeKeyboard(); res([...sel]); }),
          });
        };
        draw();
      });
    }
    this.check(id);
    st.anim(1, 'point');
    await this.say('super_open');
    for (const L of letters) await this.openLetter(L);
    st.anim(1, 'think', 3);
    await this.wait(0.5);
    let ok = this.complete();
    if (!ok) {
      await this.say('super_time');
      const s = this.debug.auto ? '' : await this.askWord({ title: 'Назовите слово', timer: SUPER_TIME });
      this.check(id);
      ok = !!s && [...s].map(norm).join('') === [...q.a].map(norm).join('');
      if (!s) { audio.play('wrong'); await this.say('timeout'); }
    }
    for (let k = 0; k < this.T.open.length; k++) if (!this.T.open[k]) { this.T.open[k] = true; this.ui.openCell(k); audio.play('open', k % 3); await this.wait(0.12); }
    sdk.gameplay(false);
    let coins;
    const bank = (this.S.run ? this.S.run.bank : 0) + (ok ? 5000 : 0);
    this.S.run = null;
    if (ok) {
      audio.play('win');
      st.anim(1, 'cheer', 3);
      st.mood(1, 'happy');
      st.applause(4);
      st.shot('close', 1);
      await this.say('super_win');
      this.S.prizes[sp.id] = (this.S.prizes[sp.id] || 0) + 1;
      this.S.stats.supers++;
      coins = SUPER_BONUS;
      this.S.bank += 5000;
      this.addCoins(coins);
      save.write();
      sdk.submitScore(this.S.bank);
      await this.showPrize(sp, 'Суперприз ваш!');
    } else {
      audio.play('lose');
      st.mood(1, 'sad');
      await this.say('super_lose');
      coins = 200;
      this.addCoins(coins);
      save.write();
    }
    const ch = await this.resultModal({
      title: ok ? 'Суперигра выиграна!' : 'Суперигра',
      text: ok ? `Слово «${q.a}». ${sp.name} теперь в вашем музее призов!` : `Было загадано слово «${q.a}». Вы дошли до суперигры, это уже победа!`,
      coins,
      score: bank,
    });
    this.afterGame(ch);
  }

  onCell(i) {
    if (this.T && !this.T.open[i] && this.pend && this.ui.boardEl.querySelector('.pick')) {
      this.click();
      this.answer({ cell: i });
    }
  }

  // ---------- пауза ----------
  setPause(on) {
    this.paused = on;
    if (on) audio.suspend('pause');
    else audio.resume('pause');
    if (this.state === 'play') sdk.gameplay(!on);
  }
  pauseMenu() {
    if (this.state !== 'play' || this.paused) return;
    this.click();
    this.setPause(true);
    const keep = this.ui.modalEl;
    if (keep) keep.style.display = 'none';
    const m = document.createElement('div');
    m.id = 'pausem';
    m.style.cssText = 'position:absolute;inset:0;z-index:35;display:flex;align-items:center;justify-content:center;background:rgba(8,6,30,.7)';
    m.innerHTML = `<div class="panel">${this.ui.head('Пауза', false)}<div class="pb"><div class="col"><button class="btn b-l red" id="pgo">Продолжить</button>${this.volHTML()}<button class="btn b-m ghost" id="pmenu">Выйти в меню</button></div></div></div>`;
    m.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.ui.stage.appendChild(m);
    this.bindVol(m);
    const close = () => { m.remove(); if (keep) keep.style.display = ''; };
    m.querySelector('#pgo').onclick = () => { close(); this.setPause(false); this.click(); };
    m.querySelector('#pmenu').onclick = () => { close(); this.setPause(false); this.toMenu(); };
  }

  // ---------- громкость ----------
  volHTML() {
    const st = this.S.settings;
    const row = (k, ic, l, v) => `<label class="vrow"><span class="vi">${ic}</span><span class="vl">${l}</span><input type="range" min="0" max="100" step="5" value="${Math.round(v * 100)}" data-k="${k}"><b>${Math.round(v * 100)}%</b></label>`;
    return `<div class="vol">${row('voiceVol', ICONS.voice, 'Ведущий', st.voiceVol)}${row('musicVol', ICONS.music, 'Музыка', st.musicVol)}${row('sfxVol', ICONS.sound, 'Звуки', st.sfxVol)}</div>`;
  }
  bindVol(root) {
    const st = this.S.settings;
    root.querySelectorAll('.vrow input').forEach((inp) => {
      const out = inp.parentElement.querySelector('b');
      const upd = () => {
        const v = inp.value / 100;
        st[inp.dataset.k] = v;
        out.textContent = inp.value + '%';
        inp.style.setProperty('--p', inp.value + '%');
        this.applyVol();
      };
      inp.style.setProperty('--p', inp.value + '%');
      inp.addEventListener('pointerdown', (e) => e.stopPropagation());
      inp.addEventListener('input', upd);
      inp.addEventListener('change', () => { upd(); if (inp.dataset.k === 'sfxVol') audio.play('coin'); save.write(); });
    });
  }
  applyVol() {
    const st = this.S.settings;
    audio.setMusicVol(st.musicVol);
    audio.setSfxVol(st.sfxVol);
    audio.setVoiceVol(st.voiceVol);
  }
  openSound() {
    this.click();
    const m = this.ui.modal(`${this.ui.head('Громкость')}<div class="pb">${this.volHTML()}</div>`);
    this.bindVol(m);
  }

  // ---------- окна меню ----------
  openSettings() {
    const st = this.S.settings;
    const m = this.ui.modal(`${this.ui.head('Настройки')}<div class="pb">${this.volHTML()}
<div class="setrow"><span>Темп игры</span><div class="seg"><button data-f="0" class="${st.fast ? '' : 'on'}">Обычный</button><button data-f="1" class="${st.fast ? 'on' : ''}">Быстрый</button></div></div>
<p class="sm">В быстром темпе ведущий реже комментирует ходы соперников.</p></div>`);
    this.bindVol(m);
    m.querySelectorAll('.seg button').forEach((b) => (b.onclick = () => { this.click(); st.fast = b.dataset.f === '1'; m.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b)); save.write(); }));
  }

  openRules() {
    this.ui.modal(`${this.ui.head('Правила')}<div class="pb rules">
<h3>Как играть</h3><ul>
<li>Ведущий загадывает слово и читает задание. Буквы слова спрятаны на табло.</li>
<li>Вращайте барабан кнопкой или взмахом пальца. Выпали очки — назовите букву. Есть такая буква — очки за каждую открытую клетку ваши, и вы вращаете снова.</li>
<li>Нет такой буквы — ход переходит к следующему игроку.</li>
<li>Знаете слово — нажмите «Назвать слово». Угадали — победа в туре. Ошиблись — вы выбываете из тура.</li></ul>
<h3>Сектора барабана</h3><ul>
<li><b>Банкрот</b> — все очки этого тура сгорают.</li><li><b>Ноль</b> — ход переходит.</li>
<li><b>Плюс</b> — откройте любую клетку табло.</li><li><b>×2</b> — угадаете букву, и очки удвоятся.</li>
<li><b>Приз</b> — возьмите приз в музей (очки сгорят) или играйте дальше за 500 очков за букву.</li></ul>
<h3>Тройки, полуфинал и суперигра</h3><ul>
<li>Игра идёт как в телестудии: три тройки игроков, затем полуфинал и суперигра.</li>
<li>В каждой тройке вы выбираете героя и играете за него. Победитель тройки проходит в полуфинал.</li>
<li>В полуфинале встречаются победители трёх троек. Если там несколько ваших героев, вы ходите за каждого из них.</li>
<li>Победитель полуфинала играет в суперигру: выбирает суперприз, открывает три буквы и за ${SUPER_TIME} секунд называет слово.</li>
<li>Угадали три буквы подряд — выберите одну из двух шкатулок, в одной деньги.</li>
<li>Прогресс сохраняется: из меню можно продолжить с той тройки, где вы остановились.</li>
<li>«Помощь зала» подскажет букву, которая есть в слове. Подарки ведущему открывают букву в начале следующей игры.</li></ul></div>`, { wide: true });
  }

  openMuseum() {
    this.say('museum').catch(() => {});
    const cards = (list) => list.map((p) => { const n = this.S.prizes[p.id] || 0; return `<div class="card ${n ? 'got' : 'lock'}">${prizeSVG(p.id)}<span>${esc(p.name)}</span><span class="cnt">${n ? '×' + n : '—'}</span></div>`; }).join('');
    const total = Object.values(this.S.prizes).reduce((a, b) => a + b, 0);
    this.ui.modal(`${this.ui.head('Музей призов')}<div class="pb"><p class="center">Призы с сектора «Приз» и суперпризы за победу в суперигре. Всего призов: ${total}.</p>
<h3 style="font-family:var(--logo);font-weight:400;color:var(--gold);font-size:36px;margin:8px 0">Суперпризы</h3><div class="grid">${cards(SUPER_PRIZES)}</div>
<h3 style="font-family:var(--logo);font-weight:400;color:var(--gold);font-size:36px;margin:20px 0 8px">Призы</h3><div class="grid">${cards(PRIZES)}</div></div>`, { wide: true });
  }

  openGifts() {
    const render = () => {
      const m = this.ui.modal(`${this.ui.head('Подарки ведущему')}<div class="pb"><p class="center">По традиции игроки приносят ведущему подарки. За каждый подарок ${esc(HOST)} откроет вам одну букву в начале следующей игры.${this.S.bonusLetters ? ` Букв в запасе: ${this.S.bonusLetters}.` : ''}</p>
<div class="grid">${GIFTS.map((g) => `<div class="card ${this.S.gifts[g.id] ? 'got' : ''}">${giftSVG(g.id)}<span>${esc(g.name)}</span>${this.S.gifts[g.id] ? `<span class="cnt">подарено: ${this.S.gifts[g.id]}</span>` : ''}<button class="btn b-s" data-id="${g.id}"${this.S.coins < g.price ? ' disabled' : ''}>${ICONS.coin}${g.price}</button></div>`).join('')}</div></div>`, { wide: true });
      m.querySelectorAll('.card .btn').forEach((b) => (b.onclick = () => {
        const g = GIFTS.find((x) => x.id === b.dataset.id);
        if (this.S.coins < g.price) return;
        audio.play('buy');
        this.addCoins(-g.price);
        this.S.gifts[g.id] = (this.S.gifts[g.id] || 0) + 1;
        this.S.bonusLetters++;
        save.write();
        render();
        this.say('gift').catch(() => {});
        this.ui.toast(`${g.name} для ведущего! +1 открытая буква`);
      }));
    };
    render();
  }

  openShop() {
    this.click();
    const render = () => {
      const items = iap.items();
      const free = Date.now() - (this.S.freeAdAt || 0) >= AD_COINS_GAP;
      const m = this.ui.modal(`${this.ui.head('Магазин')}<div class="pb">
<div class="row" style="margin-bottom:16px"><button class="btn b-m green" id="sfree"${free ? '' : ' disabled'}>${ICONS.ad}+${AD_COINS} монет за рекламу</button></div>
${items.length ? `<div class="grid" style="margin-bottom:20px">${items.map((x) => `<div class="card ${x.owned ? 'got' : ''}">${x.p.imageURI ? `<img src="${esc(x.p.imageURI)}" style="width:110px;height:110px;object-fit:contain" alt="">` : ICONS.coin.replace('<svg', '<svg style="width:110px;height:110px"')}<span>${esc(x.p.title)}</span><span class="sm">${esc(x.p.description)}</span>${x.owned ? '<span class="cnt">куплено</span>' : `<button class="btn b-s" data-iap="${esc(x.id)}">${priceHTML(x.p)}</button>`}</div>`).join('')}</div>` : ''}
<h3 style="font-family:var(--logo);font-weight:400;color:var(--gold);font-size:36px;margin:8px 0">Барабаны</h3>
<div class="grid">${SKINS.map((s) => { const own = this.S.owned[s.id]; const on = this.S.skin === s.id; return `<div class="card ${on ? 'got' : ''}"><div style="width:130px;height:130px;border-radius:50%;background:conic-gradient(${s.cols.map((c, i) => `${c} ${(i * 100) / s.cols.length}% ${((i + 1) * 100) / s.cols.length}%`).join(',')});border:8px solid ${s.rim};box-shadow:0 0 0 3px #f5c542"></div><span>${esc(s.name)}</span>${on ? '<span class="cnt">выбран</span>' : own ? `<button class="btn b-s blue" data-use="${s.id}">Выбрать</button>` : `<button class="btn b-s" data-buy="${s.id}"${this.S.coins < s.price ? ' disabled' : ''}>${ICONS.coin}${fmt(s.price)}</button>`}</div>`; }).join('')}</div></div>`, { wide: true });
      const fb = m.querySelector('#sfree');
      fb.onclick = () => { this.click(); sdk.showRewarded(() => { this.S.freeAdAt = Date.now(); this.addCoins(AD_COINS); save.write(); this.ui.toast(`+${AD_COINS} монет`); }, () => this.ui.modalEl && render()); };
      m.querySelectorAll('[data-iap]').forEach((b) => (b.onclick = async () => { this.click(); const ok = await iap.buy(b.dataset.iap); if (ok) { audio.play('buy'); this.ui.toast('Спасибо за покупку!'); } if (this.ui.modalEl) render(); }));
      m.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => { const s = SKINS.find((x) => x.id === b.dataset.buy); if (this.S.coins < s.price) return; audio.play('buy'); this.addCoins(-s.price); this.S.owned[s.id] = 1; this.S.skin = s.id; this.applySkin(s.id); save.write(); render(); }));
      m.querySelectorAll('[data-use]').forEach((b) => (b.onclick = () => { this.click(); this.S.skin = b.dataset.use; this.applySkin(this.S.skin); save.write(); render(); }));
    };
    render();
  }

  async openRating() {
    const m = this.ui.modal(`${this.ui.head('Рейтинг')}<div class="pb"><p class="center">Ваш выигрыш за все игры: <b style="color:#ffe48a">${fmt(this.S.bank)}</b> очков</p><div class="lb" id="lbl"><p class="center sm">Загрузка…</p></div></div>`);
    const lb = await sdk.getLeaderboard();
    const box = m.querySelector('#lbl');
    if (!box) return;
    if (!lb.available) {
      box.innerHTML = `<p class="center sm">${lb.local ? 'Таблица рейтинга появится в Яндекс Играх.' : 'Таблица сейчас недоступна.'}</p>`;
      return;
    }
    box.innerHTML = lb.entries.map((e) => `<div class="${e.me ? 'me' : ''}"><span>${e.rank}. ${esc(e.name || 'Игрок')}</span><span>${fmt(e.score)}</span></div>`).join('') +
      (lb.authorized ? '' : '<div class="row" style="margin-top:12px"><button class="btn b-s blue" id="lblog">Войти, чтобы попасть в рейтинг</button></div>');
    const lg = box.querySelector('#lblog');
    if (lg) lg.onclick = async () => { if (await sdk.login()) { sdk.submitScore(this.S.bank); this.openRating(); } };
  }
}
