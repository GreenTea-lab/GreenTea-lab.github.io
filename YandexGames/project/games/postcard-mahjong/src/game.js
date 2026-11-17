// Контроллер: экраны, касания (тап по плитке — тап по паре), уровни путешествия, бесконечный режим, помощники, реклама.
import { Game } from './core.js';
import { View } from './view.js';
import { UI } from './ui.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { iap } from './iap.js';
import { audio } from './audio.js';
import { t, fmt } from './i18n.js';
import { level, starsFor, endlessBoard, dailyBoard, CITIES, PER, COUNT, FIRST, STAGES, ROUND1, cityIdx } from './levels.js';
import { ACH, achState } from './ach.js';
import { setFaceSet, FACE_ORDER } from './tiles.js';
import { unlockCards, weekOf, claimWeek } from './collection.js';
import { loadCityArt, cityFormat } from './city-art.js';
import { bounded } from './async.js';
import { travelGame } from './travel-game.js';
import {bindBoardInput} from './board-input.js';
import {legacyLevel} from './legacy-levels.js';
import {balancedLevelV3} from './balanced-levels-v3.js';
import {campaignGoal} from './campaign-goals.js';

export const BOOST_PRICE = { hint: 30, undo: 40, shuffle: 60 };
const AD_GAP = 150 * 1000;
const COMBO_GAP = 4; // секунды между парами для серии
export const DAILY_COINS = 50;
export const CUPS = [{ days: 7, coins: 100 }, { days: 15, coins: 200 }, { days: 0, coins: 400 }]; // 0 — все дни месяца
// дата по местному времени: ГГГГ-ММ-ДД
export const dayKey = (dt = new Date()) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
export const daysIn = (ym) => new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();

export class App {
  constructor() {
    this.save = save;
    this.state = 'menu';
    this.st = { sel: -1, hint: null };
    this.lastAd = Date.now();
    this.dbg = window.__PM_DEBUG || {};
    this.elapsed = 0;
    this.background = new Set();
  }

  get blocked() {
    return this.ui.modalOpen || this.background.size > 0 || document.hidden || sdk.adActive;
  }

  syncGameplay() {
    sdk.gameplay(this.state === 'play' && !!this.game && !this.finished && !this.blocked);
  }

  async start(cv, root) {
    await save.load();
    window.__PM_BOOT_STAGE?.('city');
    const firstCity=CITIES[cityIdx(Math.floor(save.current(COUNT)/PER))].id;
    await bounded(Promise.all([loadCityArt(firstCity),loadCityArt(firstCity,true,cityFormat(innerWidth,innerHeight))]),4000);
    sdk.noAds = !!save.data.noAds;
    setFaceSet(save.data.faces);
    // уже доступные награды не объявляем тостом, их видно по значку в меню
    this.achSeen = new Set(ACH.filter((a) => achState(save.data, a).done).map((a) => a.id));
    this.view = new View(cv);
    this.view.style = save.data.style;
    Object.assign(this.view,save.data.decor);
    this.view.highlightFree = save.data.settings.dimBlocked !== false;
    this.view.matchGlow = !!save.data.settings.matchGlow;
    this.view.city = cityIdx(Math.min(STAGES - 1, Math.floor(save.current(COUNT) / PER)));
    this.ui = new UI(this, root);
    window.addEventListener('cityartready',()=>this.view.bgCache.clear());
    window.addEventListener('cardartready',()=>this.view.bgCache.clear());
    const rs = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.view.resize(window.innerWidth, window.innerHeight, dpr);
      this.ui.layout(this.view.L);
    };
    window.addEventListener('resize', () => {
      clearTimeout(this._rt);
      this._rt = setTimeout(rs, 60);
    });
    rs();
    this.bindInput(cv);
    iap.init(
      {
        coins_1000: { grant: () => this.addCoins(1000) },
        coins_3500: { grant: () => this.addCoins(3500) },
        coins_10000: { grant: () => this.addCoins(10000) },
        disable_ads: { permanent: true, grant: () => { save.data.noAds = true; sdk.noAds = true; } },
      },
      () => save.flush(),
    );
    iap.onChange((id, restoring) => {
      if (!restoring) {
        audio.play('buy');
        this.ui.toast(id === 'disable_ads' ? t('noAdsDone') : t('bought'));
      }
      this.ui.refresh();
    });
    if (save.data.noAds) sdk.noAds = true;
    this.ui.menu();
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  frame(dt) {
    if (this.dbg.freeze) return;
    if (this.state === 'play' && this.game && !this.finished && !this.blocked) {
      this.elapsed += dt;
      this.ui.tick();
    }
    this.view.draw(dt, this.st);
  }

  addCoins(n) {
    save.data.coins += n;
    save.write();
    this.ui.refresh();
  }

  setCity(c) {
    loadCityArt(CITIES[c].id);
    loadCityArt(CITIES[c].id,true,cityFormat(innerWidth,innerHeight));
    if (this.view.city === c) return;
    this.view.city = c;
  }
  setMode(m) {
    if (this.view.mode === m) return;
    this.view.mode = m;
    this.view.bgCache.clear();
  }

  // ---------- старт ----------
  checkpoint(cloud=true) {
    if(this.state!=='play'||!this.game||this.finished)return;
    if(this.mode==='endless'){this.saveEndless();return;}
    if(this.mode==='trip'||this.mode==='practice'){this.checkpointTravel(cloud);return;}
    if(this.mode!=='level'&&this.mode!=='daily')return;
    save.data.sessions[this.mode]={id:this.mode==='level'?this.levelIdx:this.L.key,game:this.game.toJSON(),elapsed:this.elapsed,used:this.used,combo:this.combo,lastPair:this.lastPair,sel:this.st.sel,balanceVersion:this.mode==='level'?(this.L.balanceVersion||2):undefined,...this.travelSnapshot()};
    save.data.lastMode=this.mode;
    save.write(cloud);
  }

  resumeValues(snapshot) {
    if(!snapshot)return;
    this.travelResume(snapshot);
    this.elapsed=Math.max(0,Number(snapshot.elapsed)||0);
    this.used=Math.max(0,Number(snapshot.used)||0);
    this.combo=Number(snapshot.combo)||0;
    this.lastPair=Number.isFinite(snapshot.lastPair)?snapshot.lastPair:-99;
    this.st.sel=Number.isInteger(snapshot.sel)&&snapshot.sel>=0&&snapshot.sel<this.game.tiles.length&&this.game.selectable(snapshot.sel)?snapshot.sel:-1;
    this.ui._sec=-1;this.ui.tick();this.ui.hudUpdate();this.checkAuto();
  }

  snapshotGame(json) {
    const g=Game.fromJSON(json);
    if(g.tiles.some(t=>!FACE_ORDER.includes(t.f)&&t.f!=='key'))throw new Error('Unknown saved tile');
    return g;
  }

  playContinue() {
    const mode=save.data.lastMode,s=save.data.sessions[mode];
    if(s&&mode==='trip')return this.startTrip(s.spec.trip,s.spec.step);
    if(s&&mode==='practice')return this.startPractice(s.spec.lay,s.spec.difficulty);
    if(s&&mode==='daily')return this.startDaily(s.id);
    if(s&&mode==='level')return this.startLevel(s.id);
    return this.startLevel(save.current(COUNT));
  }

  startLevel(i, resume=true) {
    this.checkpoint();
    let L = level(i);
    this.mode = 'level';
    this.levelIdx = i;
    let snapshot=resume&&save.data.sessions.level?.id===i?save.data.sessions.level:null,g;
    try {if(snapshot)g=this.snapshotGame(snapshot.game);}catch(e){snapshot=null;}
    if(!g || !g.left){
      snapshot=null;
      const seed=this.dbg.seed??L.seeds[Math.floor(Math.random()*L.seeds.length)];
      g=new Game({...L,seed});
    }else if(snapshot.balanceVersion!==L.balanceVersion){
      // Already dealt boards keep their tiles and original star thresholds.
      L=snapshot.balanceVersion===3?balancedLevelV3(i):legacyLevel(i);
    }
    this.L = L;
    this.begin(g, L.city);
    this.resumeValues(snapshot);
    this.checkpoint(false);
    audio.setMood(CITIES[L.city].id);
    // начало нового маршрута: короткое вступление
    const tk = L.route === 1 ? 'gold' : 'route' + L.route;
    if (L.route && L.idx === L.route * ROUND1 && !save.data.tut[tk]) {
      save.data.tut[tk] = 1;
      save.write(false);
      return this.ui.routeIntro(L.route);
    }
    // знакомство с новыми плитками
    const intro = snapshot?null:i === 0 && !save.data.tut.first ? 'first' : i === FIRST.coin ? 'coin' : i === FIRST.repeat ? 'repeat' : i === FIRST.lock ? 'lock' : i === FIRST.hidden ? 'hidden' : null;
    if (intro && !save.data.tut[intro]) this.ui.feature(intro);
    else if(!snapshot&&L.mission&&L.mission!=='clear'&&!save.data.tut['campaign_'+L.mission])this.ui.campaignBrief(true);
    else this.ui.banner(t('levelN', { n: i + 1 }) + ' · ' + t('c_' + CITIES[L.city].id)+(L.tier?' · '+t('difficulty_'+L.tier):''));
  }

  // задача дня: одна раскладка на всех в этот день
  startDaily(key,resume=true) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(key)||key>dayKey())return;
    this.checkpoint();
    const B = dailyBoard(key);
    this.mode = 'daily';
    this.levelIdx = -1;
    this.L = B;
    let snapshot=resume&&save.data.sessions.daily?.id===key?save.data.sessions.daily:null,g;
    try {if(snapshot)g=this.snapshotGame(snapshot.game);}catch(e){snapshot=null;}
    if(!g||!g.left){snapshot=null;g=new Game({ pos: B.pos, types: B.types, seed: B.seed, coins: B.coins, locks: 0, hidden: B.hidden });}
    this.begin(g, B.city);
    this.resumeValues(snapshot);
    this.checkpoint(false);
    audio.setMood(CITIES[B.city].id);
    this.ui.banner(t('daily') + ' · ' + this.ui.dateName(key));
  }

  // начать текущую партию заново
  restart() {
    if (this.mode === 'trip') return this.adBreak(()=>this.startTrip(this.L.trip,this.L.step,false));
    if (this.mode === 'practice') return this.adBreak(()=>this.startPractice(this.L.lay,this.L.difficulty,false));
    if (this.mode === 'endless') {
      save.data.endless = null;
      this.adBreak(() => this.startEndless(false));
    } else if (this.mode === 'daily') this.adBreak(() => this.startDaily(this.L.key,false));
    else this.adBreak(() => this.startLevel(this.levelIdx,false));
  }

  startEndless(resume) {
    this.checkpoint();
    this.mode = 'endless';
    this.levelIdx = -1;
    const d = save.data;
    let E = resume && d.endless;
    let g = null;
    if (E) {
      try {
        g = this.snapshotGame(E.game);
      } catch (e) {
        g = null;
      }
    }
    if (!g) {
      E = { n: 1, score: 0, seed: this.dbg.seed ?? ((Math.random() * 1e9) | 0), free: 1 };
      g = this.endlessGame(E);
    }
    this.E = E;
    this.L=endlessBoard(E.n,E.seed);
    this.begin(g, endlessBoard(E.n, E.seed).city);
    this.resumeValues(E);
    audio.setMood('endless');
    this.ui.banner(t('boardN', { n: E.n }));
  }
  endlessGame(E) {
    const B = endlessBoard(E.n, E.seed);
    return new Game({ pos: B.pos, types: B.types, seed: E.seed + E.n * 97, coins: B.coins, locks: B.locks, hidden: B.hidden });
  }

  begin(g, city) {
    this.game = g;
    this.st.sel = -1;
    this.st.hint = null;
    this.finished = false;
    this.elapsed = 0;
    this.combo = 0;
    this.lastPair = -99;
    this.used = 0;
    this.auto = false;
    this.state = 'play';
    this.setCity(city);
    this.setMode('play');
    this.view.setGame(g);
    this.travelBegin();
    this.view.intro();
    this.ui.tutorial(0);
    this.ui.hud();
    this.ui.autoBtn(false);
    this.syncGameplay();
    if (!g.canMove()) setTimeout(() => this.checkStuck(), 800);
  }

  toMenu() {
    this.checkpoint();
    this.state = 'menu';
    this.game = null;
    this.view.game = null;
    this.st.sel = -1;
    sdk.gameplay(false);
    this.setMode('menu');
    this.setCity(cityIdx(Math.min(STAGES - 1, Math.floor(save.current(COUNT) / PER))));
    audio.setMood('menu');
    this.ui.menu();
  }

  // ---------- ввод ----------
  bindInput(cv) {
    bindBoardInput(this,cv);
  }

  tap(x, y) {
    const g = this.game, v = this.view, st = this.st;
    if (!g || this.finished) return;
    const id = v.hit(x, y);
    if (id < 0) {
      if (st.sel >= 0) {
        st.sel = -1;
        audio.play('back');
      }
      return;
    }
    if (!g.selectable(id)) {
      v.shake(id);
      audio.play('deny');
      if (g.locked(id)) this.ui.toastOnce('lockTip', t('lockTip'));
      else this.ui.toastOnce('blockedTip', t('blockedTip'));
      return;
    }
    if (st.sel === id) {
      st.sel = -1;
      audio.play('back');
      return;
    }
    if (st.sel >= 0 && g.tiles[st.sel].f === g.tiles[id].f && g.selectable(st.sel)) {
      this.pair(st.sel, id);
      return;
    }
    st.sel = id;
    audio.play('pick');
    this.ui.tutTap(id);
  }

  pair(a, b) {
    if(this.finished||!this.game)return;
    const g = this.game, v = this.view, st = this.st;
    const ev = g.match(a, b);
    if (!ev) return;
    this.travelPair(a,b);
    st.sel = -1;
    st.hint = null;
    // серия: пары подряд без долгих раздумий
    this.combo = this.elapsed - this.lastPair <= COMBO_GAP ? this.combo + 1 : 1;
    this.lastPair = this.elapsed;
    const S = save.data.stats;
    S.pairs++;
    if (!this.auto && this.combo > S.combo) S.combo = this.combo;
    const c = v.matched(a, b, ev.f);
    audio.play('match', { combo: this.combo, flower: ev.f });
    if (this.mode === 'endless') {
      const E = this.E;
      const pts = Math.round((10 + (this.sessionCalm?0:5 * Math.min(this.combo - 1, 8))) * (1 + (E.n - 1) * 0.25));
      E.score += pts;
      v.text('+' + pts, c.x, c.y - v.D.h * 0.3, { delay: 0.25 });
    }
    if (!this.sessionCalm&&this.combo >= 3) v.text(t('combo', { n: this.combo }), c.x, c.y - v.D.h * 0.9, { delay: 0.3, color: '#bff0a8', size: v.tw * 0.36 });
    if (ev.coin) {
      save.data.coins += 5;
      setTimeout(() => {
        audio.play('coin');
        v.sparkle(c.x, c.y);
        v.text('+5', c.x, c.y, { color: '#ffe48a', delay: 0 });
        this.ui.refresh();
      }, 280);
    }
    if (ev.key) {
      setTimeout(() => {
        audio.play('unlock');
        g.tiles.forEach((tl) => tl.lock && g.alive[tl.id] && v.pop(tl.id));
      }, 300);
    }
    ev.opened.forEach((i, k) => v.flip(i, 0.15 + k * 0.05));
    if (ev.opened.length) setTimeout(() => audio.play('flip'), 150);
    this.ui.hudUpdate();
    this.ui.tutMatched();
    if (this.mode==='trip'&&this.tripSatisfied())ev.done=true;
    if(this.mode==='level'&&campaignGoal(g,this.L,this.missionIds).done)ev.done=true;
    if (ev.done) {
      this.finished = true;
      this.ui.autoBtn(false);
      this.mode === 'trip'?this.finishTrip():this.mode==='practice'?this.finishPractice():this.mode === 'endless' ? this.endlessCleared() : this.mode === 'daily' ? this.finishDaily() : this.finishLevel();
    } else if (!g.canMove()) setTimeout(() => this.checkStuck(), 650);
    else this.checkAuto();
    if (this.mode === 'endless') this.saveEndless();
    else this.checkpoint();
  }

  // все оставшиеся плитки открыты и свободны: можно собрать их одной кнопкой
  canAuto() {
    const g = this.game;
    if (!g || this.finished || this.auto || g.left < 4 || g.keysAlive()) return false;
    for (const tl of g.tiles) if (g.alive[tl.id] && (!g.selectable(tl.id) || g.faceOf(tl.id) === null)) return false;
    return true;
  }
  checkAuto() {
    this.ui.autoBtn(this.canAuto());
  }
  autoFinish() {
    if (!this.canAuto()) return;
    this.auto = true;
    this.st.sel = -1;
    this.ui.autoBtn(false);
    const step = () => {
      if (this.state !== 'play' || !this.game || this.finished) return (this.auto = false);
      if (this.blocked) return setTimeout(step, 250);
      const m = this.game.movesList()[0];
      if (!m) return (this.auto = false);
      this.pair(m[0], m[1]);
      setTimeout(step, 170);
    };
    step();
  }

  checkStuck() {
    const g = this.game;
    if (this.state !== 'play' || !g || this.finished || g.canMove() || this.ui.modalOpen) return;
    audio.play('nospace');
    this.ui.stuck();
  }

  saveEndless() {
    const E = this.E;
    if (!E) return;
    E.game = this.game.toJSON();
    Object.assign(E,{elapsed:this.elapsed,used:this.used,combo:this.combo,lastPair:this.lastPair,...this.travelSnapshot()});
    save.data.endless = this.finished && !this.game.left ? save.data.endless : { ...E };
    if (E.score > save.data.best) save.data.bestPending = E.score;
    save.write();
  }

  // ---------- конец уровня ----------
  showResult(render) {
    const game=this.game;
    const show=()=>{if(this.game!==game||!this.finished||this.state!=='play')return;if(this.blocked){setTimeout(show,200);return;}render();};
    setTimeout(show,350);
  }

  finishLevel() {
    this.travelWin();
    const L = this.L, d = save.data;
    sdk.gameplay(false);
    const sec = Math.round(this.elapsed);
    const stars = this.sessionCalm?3:starsFor(L, sec);
    const prev = d.levels[this.levelIdx];
    const first = !prev;
    if (!prev || prev.stars < stars || (prev.stars === stars && sec < prev.time)) d.levels[this.levelIdx] = { stars: Math.max(stars, prev ? prev.stars : 0), time: prev ? Math.min(prev.time || 9999, sec) : sec };
    const coins = first ? 20 + stars * 10 : 5 + stars * 2;
    d.coins += coins;
    if (!this.used && first) d.stats.noHelp++;
    save.data.sessions.level=null;
    const cards=unlockCards(d,L.city);
    const postcard=cards.length>0;
    save.write();
    audio.play('win');
    this.showResult(()=>this.ui.levelResult({ L, stars, sec, coins, postcard, cardVariant:cards[0]??0, best: d.levels[L.idx].time, last: L.idx >= COUNT - 1 }));
    this.achCheck();
  }

  finishDaily() {
    this.travelWin();
    const B = this.L, d = save.data;
    sdk.gameplay(false);
    const sec = Math.round(this.elapsed);
    const stars = this.sessionCalm?3:starsFor(B, sec);
    const oldTime=d.dc[B.key];
    const first = !d.dailyWins[B.key] && oldTime === undefined;
    d.dc[B.key] = typeof oldTime==='number' ? Math.min(oldTime,sec) : sec;
    d.dailyWins[B.key]=true;
    d.sessions.daily=null;
    const weekly=claimWeek(d,weekOf(B.key));
    let coins = first ? DAILY_COINS : 5;
    if (first) d.stats.daily++;
    // кубок месяца
    const ym = B.key.slice(0, 7);
    const solved = Object.keys(d.dailyWins).filter((k) => k.startsWith(ym)).length;
    const had = d.dcCup[ym] || 0;
    let cup = had;
    CUPS.forEach((c, k) => solved >= (c.days || daysIn(ym)) && (cup = Math.max(cup, k + 1)));
    let cupCoins = 0;
    for (let k = had; k < cup; k++) cupCoins += CUPS[k].coins;
    d.dcCup[ym] = cup;
    coins += cupCoins;
    d.coins += coins;
    // храним только текущий и прошлый месяц
    const prev = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 2, 1);
    const keep = [ym, dayKey(prev).slice(0, 7)];
    for (const k of Object.keys(d.dc)) if (!keep.includes(k.slice(0, 7)) && k.slice(0, 7) !== dayKey().slice(0, 7)) delete d.dc[k];
    save.write();
    audio.play('win');
    this.showResult(()=>this.ui.dailyResult({ B, sec, stars, coins, first, weekly, cup: cup > had ? cup : 0 }));
    this.achCheck();
  }

  // новые достижения: короткое сообщение, награду забирают в окне «Награды»
  achCheck() {
    const fresh = ACH.filter((a) => !this.achSeen.has(a.id) && achState(save.data, a).done);
    fresh.forEach((a, k) => {
      this.achSeen.add(a.id);
      setTimeout(() => this.ui.achToast(a), 900 + k * 3400);
    });
  }

  // доска бесконечного режима собрана: бонус и следующая
  endlessCleared() {
    this.travelWin();
    const E = this.E, v = this.view;
    const bonus = 100 * E.n;
    E.score += bonus;
    save.data.coins += 10;
    save.data.stats.boards = Math.max(save.data.stats.boards, E.n);
    audio.play('win');
    v.text(t('boardBonus', { n: fmt(bonus) }), v.W / 2, v.H * 0.45, { size: Math.min(54, v.W * 0.08), dur: 1.6, color: '#ffe48a' });
    this.ui.hudUpdate();
    const next = () => {
      if (this.state !== 'play' || this.mode !== 'endless' || this.E !== E) return;
      if (this.blocked) { setTimeout(next, 250); return; }
      E.n++;
      E.free = 1;
      const g = this.endlessGame(E);
      this.L=endlessBoard(E.n,E.seed);
      this.begin(g, endlessBoard(E.n, E.seed).city);
      this.saveEndless();
      this.ui.banner(t('boardN', { n: E.n }));
    };
    setTimeout(next, 1500);
  }

  endEndless() {
    const E = this.E, d = save.data;
    this.finished = true;
    sdk.gameplay(false);
    const bestKey=this.sessionCalm?'bestCalm':'best';
    const record = E.score > d[bestKey];
    if (record) {
      d[bestKey] = E.score;
    }
    const coins = Math.max(5, Math.floor(E.score / 60));
    d.coins += coins;
    d.endless = null;
    delete d.bestPending;
    d.games = (d.games || 0) + 1;
    save.write();
    audio.play(record ? 'record' : 'lose');
    this.ui.endlessResult({ score: E.score, best: d[bestKey], record, coins, boards: E.n - 1,calm:this.sessionCalm });
    this.achCheck();
  }

  adBreak(cb) {
    if (Date.now() - this.lastAd < AD_GAP || save.data.noAds) return cb();
    this.lastAd = Date.now();
    sdk.showInterstitial(cb);
  }

  // ---------- помощники ----------
  useBoost(id, free) {
    const g = this.game;
    if (!g || this.finished) return;
    const can = { hint: () => g.canMove(), undo: () => g.history.length > 0, shuffle: () => g.left > 1 }[id]();
    if (!can) {
      audio.play('deny');
      this.ui.toast(t('cant_' + id));
      return;
    }
    const d = save.data;
    const pay = (src) => {
      this.used++;
      if (src === 'stock') d.boosts[id]--;
      else if (src === 'coins') d.coins -= BOOST_PRICE[id];
      save.write();
      this.applyBoost(id);
      this.ui.refresh();
    };
    if (free) return pay('free');
    if (d.boosts[id] > 0) return pay('stock');
    if (d.coins >= BOOST_PRICE[id]) return pay('coins');
    this.ui.needCoins(id, () => sdk.showRewarded(() => pay('ad')));
  }

  applyBoost(id) {
    const g = this.game, v = this.view, st = this.st;
    if (id === 'hint') {
      const h = g.hint();
      if (!h) return;
      st.hint = { pair: h.pair, until: v.t + 6 };
      v.focusPair(h.pair);this.ui.updateTravelHUD();
      st.sel = -1;
      audio.play('hint');
    } else if (id === 'undo') {
      const h = g.undo();
      if (!h) return;
      st.sel = -1;
      st.hint = null;
      v.pop(h.a);
      v.pop(h.b);
      audio.play('undo');
      if (this.mode === 'endless') {
        // отмена не возвращает очки серии, но и не отнимает — честно
      }
    } else if (id === 'shuffle') {
      const revealed=this.mode==='level'&&this.L.mission==='seals'?this.missionIds.filter(i=>g.tiles[i].seen):[];
      const r = g.shuffle();
      revealed.forEach(i=>{if(g.alive[i])g.tiles[i].seen=true;});
      st.sel = -1;
      st.hint = null;
      if (r.moved.length) {
        v.fit();
        r.moved.forEach(({ i, from }) => v.moveFrom(i, from));
      }
      g.tiles.forEach((tl, k) => g.alive[tl.id] && !r.moved.length && v.flip(tl.id, (k % 12) * 0.02));
      audio.play('shuffle');
      if (!g.canMove()) setTimeout(() => this.checkStuck(), 700);
    }
    this.ui.hudUpdate();
    this.checkAuto();
    if (this.mode === 'endless') this.saveEndless();
    else this.checkpoint();
  }

  setDecor(kind,id) {
    save.data.decor[kind]=id;
    this.view[kind]=id;
    this.view.bgCache.clear();
    save.write();
  }

  setFaces(f) {
    save.data.faces = f;
    setFaceSet(f);
    save.write();
  }

  setStyle(id) {
    save.data.style = id;
    this.view.style = id;
    save.write();
  }
}
Object.assign(App.prototype,travelGame);
