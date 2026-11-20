import {worldState,expandWorld,recordVoyageWin} from './progression.js';
// Игра: остров ↔ партия, стройка, награды, реклама, покупки, ввод на острове, игровой цикл
import { Island } from './island.js';
import { Table } from './table.js';
import { UI } from './ui.js';
import { save } from './save.js';
import { sdk } from './sdk.js';
import { audio } from './audio.js';
import { iap } from './iap.js';
import { t,LANG } from './i18n.js';
import { IC } from './icons.js';
import { buildLevel, rng, MAIN_LEVELS } from './logic.js';
import { PROJECTS, COST, FREE_UNDO, WIN_COINS, AD_COINS } from './data.js';
import { initThumbs } from './thumbs.js';
import { applyCosmetics } from './cosmetics.js';
import { DECOR_BY_ID, DECOR_LIMIT, GRASS_LIMIT } from './decor.js';

const MIN_AD_GAP = 150 * 1000;

export class Game {
  async start(c3, cT, uiRoot) {
    await save.load();
    const d = save.data;
    audio.setPacks(d.settings.musicPack, d.settings.soundPack);
    worldState();
    sdk.noAds = !!d.noAds;
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches);
    this.quality = d.settings.quality === 'low' ? 'low' : d.settings.quality === 'high' ? 'high' : mobile ? 'mid' : 'high';
    this.c3 = c3;
    this.island = new Island(c3, this.quality,d.expansion,d.decor,d.trimmedGrass);
    initThumbs(this.island.renderer);
    if(this.island.setStages(d.stages)) save.write();
    this.shade = document.getElementById('shade');
    this.cT = cT;
    this.table = new Table(cT, {
      topBoundary:()=>this.ui?.fieldTop()||0,
      onScale:(state)=>this.ui?.scaleState(state),
      canInput: () => !this.paused && !this.adBlocked && !sdk.adActive && !this.ui?.modalOpen && !this.ui?.transitioning,
      onChange: (s) => this.ui.hudState(s),
      onWin: (r) => this.onWin(r),
      onStuck: () => this.onStuck(),
      onMove: (r) => this.onMove(r),
      onBlocked: (k) => this.ui.toast(t(k === 'lock' ? 'blockedLock' : 'blockedSand'), 1600),
    });
    this.table.requestedScale=Math.min(140,Math.max(70,Number(d.settings.cardScale)||100));
    this.table.setWildLabel(t('wild'));
    this.table.streakLabel = t('streak');
    this.ui = new UI(this, uiRoot);
    this.state = 'island';
    this.paused = false;
    this.lastAd = Date.now();
    // покупки
    await iap.init(
      {
        coins_1000: { grant: () => this.addCoins(1000), icon: IC.coin },
        coins_3500: { grant: () => this.addCoins(3500), icon: IC.bag },
        coins_10000: { grant: () => this.addCoins(10000), icon: IC.bag },
        disable_ads: {
          permanent: true,
          icon: IC.noads,
          grant: () => {
            save.data.noAds = true;
            sdk.noAds = true;
          },
        },
      },
      () => save.flush()
    );
    if (save.data.noAds) sdk.noAds = true;
    this.resize();
    this.island.setMode('island');
    window.addEventListener('resize', () => this.resize());
    this.islandInput();
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.decorSelection && !this.ui.modalOpen) {
        this.cancelDecor();
        return;
      }
      if(e.target.closest?.('button,input,textarea,select'))return;
      if(this.paused || sdk.adActive)return;
      if (e.key === 'Escape' && this.state === 'level' && !this.ui.modalOpen && !this.paused && !sdk.adActive) this.ui.pause();
      if ((e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') && this.state === 'level' && !this.ui.modalOpen) this.undo();
      if ((e.key === ' ' || e.key === 'Enter') && this.state === 'level' && !this.ui.modalOpen && this.table.g && !this.table.busy) this.table.draw();
    });
    applyCosmetics(this);
    this.ui.home();
    audio.setIntensity(0);
    this.last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      // для записи промо-ролика кадры шагаются вручную из теста
      if (!(window.__CS_DEBUG && window.__CS_DEBUG.manual)) this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  addCoins(n) {
    save.creditCoins(n);
    save.write();
    this.ui && this.ui.refreshTop();
  }

  resize() {
    const w = innerWidth;
    const h = innerHeight;
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1,2), 2.5);
    this.island.resize(w, h);
    // отступы безопасной зоны (вырез экрана)
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:var(--safe-top, env(safe-area-inset-top));bottom:var(--safe-bottom, env(safe-area-inset-bottom));visibility:hidden';
    document.body.appendChild(probe);
    const r = probe.getBoundingClientRect();
    this.table.safe = { top: r.top || 0, bottom: Math.max(0, h - r.bottom) || 0 };
    probe.remove();
    // нижние кнопки бустеров по бокам не должны налезать на колоду
    this.table.resize(w, h, dpr);
    if (this.state === 'island' && !this.island.camT) this.island.cam.dist = Math.min(this.island.cam.dist, this.island.baseDist() * 1.5);
  }
  setCardScale(value){
    if(this.table.busy){this.ui.scaleState({value:this.table.cardScale||100,max:this.table.maxScale||111});return false;}
    this.table.requestedScale=Math.max(70,Math.min(140,Number(value)||100));
    save.data.settings.cardScale=this.table.requestedScale;save.write();if(this.table.g)this.table.layout(true);return true;
  }
  setQuality(q) {
    this.quality = q === 'low' ? 'low' : 'high';
    this.island.quality = this.quality;
    this.island.applyRenderQuality();
    this.resize();
  }
  setPaused(p) {
    this.paused = p;
    if (p && this.table) this.table.queued=null;
    sdk.gameplay(!p && this.state === 'level');
  }

  // ---------- ввод на острове ----------
  islandInput() {
    const c = this.c3;
    const pts = new Map();
    let moved = 0;
    let downT = 0;
    let pinch = null;
    let multiTouch = false;
    c.addEventListener('pointerdown', (e) => {
      audio.unlock();
      if (this.state !== 'island' || this.ui.modalOpen || this.ui.transitioning || sdk.adActive) return;
      c.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = 0;
      downT = performance.now();
      multiTouch = pts.size > 1;
      if (pts.size === 1 && e.button === 0 && this.decorSelection && !this.decorPoint) {
        this.previewSelectedDecor(this.island.pickGround(e.clientX,e.clientY),false);
      }
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      }
    });
    c.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (this.state !== 'island' || this.ui.modalOpen || this.ui.transitioning) return;
      const orbit=e.pointerType==='touch'||(e.buttons&2)!==0;
      const aiming=this.decorSelection&&pts.size<2&&(e.buttons&2)===0&&!e.shiftKey;
      if(aiming && !this.decorPoint){
        this.previewSelectedDecor(this.island.pickGround(e.clientX,e.clientY),false);
      }
      if(!p)return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (pts.size === 1) {
        if(!aiming){
          if(orbit&&!e.shiftKey)this.island.drag(dx,dy);
          else this.island.pan(dx,dy);
        }
      } else if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        this.island.zoom(pinch.d / Math.max(10, d));
        this.island.pan(cx - pinch.cx, cy - pinch.cy);
        pinch = { d, cx, cy };
      }
    });
    const up = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (e.type === 'pointerup' && this.state === 'island' && !multiTouch && moved < 10 && performance.now() - downT < 450 && pts.size === 0 && !this.ui.modalOpen && !this.ui.transitioning) {
        if (this.decorSelection && e.button === 0) {
          this.previewSelectedDecor(this.island.pickGround(e.clientX, e.clientY));
          return;
        }
        if(e.button!==0)return;
        const target=this.island.pickIsland(e.clientX,e.clientY);
        if(target?.actor)this.interactActor(target.actor);
        else if(target?.id)this.ui.project(target.id);
      }
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', () => {
      if(this.decorSelection && !this.decorPoint && !pts.size)this.previewSelectedDecor(null,false);
    });
    c.addEventListener('wheel', (e) => {
      if (this.state !== 'island' || this.ui.modalOpen || this.ui.transitioning) return;
      e.preventDefault();
      this.island.zoom(e.deltaY > 0 ? 1.1 : 0.9);
    }, { passive: false });
  }

  expandIsland() {
    if(this.state!=='island'||!expandWorld())return false;
    this.cancelDecor();
    clearTimeout(this.camBack);this.island.dispose();
    this.island=new Island(this.c3,this.quality,save.data.expansion,save.data.decor,save.data.trimmedGrass);initThumbs(this.island.renderer);const stored=this.island.setStages(save.data.stages);this.resize();this.island.setMode('island');
    save.write();
    if(stored)this.decorStoredNotice(stored);
    audio.play('build');this.ui.home();return true;
  }
  canPlaceItem(def) {
    const inventory=save.data.decor;
    const grass=!!def.groundCover;
    return inventory.some(item=>item.type===def.id&&item.x===null) ||
      (save.data.coins>=def.coins && inventory.filter(item=>!!DECOR_BY_ID[item.type].groundCover===grass).length<(grass?GRASS_LIMIT:DECOR_LIMIT));
  }
  chooseDecor(type,removing=false) {
    const def = DECOR_BY_ID[type];
    if (!def || this.state !== 'island') return false;
    if(!removing&&!this.canPlaceItem(def))return false;
    this.decorSelection = type;
    this.decorPoint = null;
    this.decorAim = null;
    this.decorTurn = save.data.decor.find(item=>item.type===type&&item.x===null)?.turn || 0;
    this.decorRemoving=removing;
    this.island.showDecorGrid(def,this.decorTurn,removing);
    this.ui.placingDecor(def);
    return true;
  }
  cancelDecor() {
    this.decorSelection = null;
    this.decorPoint = null;
    this.decorAim = null;
    this.island.hideDecorGrid();
    this.ui.placingDecor(null);
  }
  previewSelectedDecor(point,lock=true) {
    const def = DECOR_BY_ID[this.decorSelection];
    if (!def) return;
    const previous=this.decorAim;
    if(!lock&&previous?.x===point?.x&&previous?.z===point?.z)return;
    this.decorAim=point;
    if(lock)this.decorPoint=point;
    const valid = this.island.previewDecor(point);
    this.ui.placingDecor(def, point ? valid ? 'ready' : 'blocked' : 'select');
  }
  unlockDecorPoint() {
    this.decorPoint=null;
    const def=DECOR_BY_ID[this.decorSelection];
    if(def)this.ui.placingDecor(def,this.decorAim?'aim':'select');
  }
  rotateSelectedDecor() {
    const def=DECOR_BY_ID[this.decorSelection];
    if(!def||!this.decorPoint||this.decorRemoving)return;
    this.decorTurn=(this.decorTurn+1)%4;
    this.island.showDecorGrid(def,this.decorTurn);
    this.previewSelectedDecor(this.decorPoint);
  }
  placeSelectedDecor(point) {
    const def = DECOR_BY_ID[this.decorSelection];
    if (!def || this.state !== 'island' || !point || point!==this.decorPoint) return false;
    if(this.decorRemoving){
      if(!this.island.removeGrass(point.x,point.z))return false;
      save.data.trimmedGrass=[...this.island.trimmedGrass];
      save.write();
      this.chooseDecor('grass',true);
      audio.play('decor');
      return true;
    }
    const inventory = save.data.decor;
    const owned = inventory.find(item => item.type === def.id && item.x === null);
    const id = owned?.id ?? Math.max(0, ...inventory.map(item => item.id)) + 1;
    if (!this.canPlaceItem(def)) {
      this.cancelDecor();
      return false;
    }
    const item = {id,type:def.id,...point,turn:this.decorTurn};
    if (!item || !this.island.installDecor(item)) {
      this.previewSelectedDecor(point);
      return false;
    }
    if (owned) inventory[inventory.indexOf(owned)]=item;
    else {
      inventory.push(item);
      save.data.coins -= def.coins;
    }
    save.write();
    this.cancelDecor();
    this.ui.refreshTop();
    audio.play('decor');
    return true;
  }
  storeDecor(id) {
    const item = save.data.decor.find(piece => piece.id === id);
    if (!item || !this.island.storeDecor(id)) return false;
    item.x = item.z = null;
    save.write();
    return true;
  }
  decorStoredNotice(count) {
    this.ui.toast(LANG==='ru'?`Декор убран на склад из-за стройки (${count})`:`Decor moved to storage for construction (${count})`,3800);
  }
  interactActor(actor) {
    const lines=actor.lines?.[LANG] || (LANG==='ru'?['Привет!','Рад тебя видеть.','Здесь хорошо жить!']:['Hello!','Good to see you!','I like it here!']);
    const reactions={
      crab:['Клац!','Click-clack!'], parrot:['Кар-р!','Squawk!'], gull:['Кья-а!','Scree!'], turtle:['Плюх!','Splash!'],
      monkey:['У-у-а!','Ooh-ah!'], hedgehog:['Фыр-фыр!','Snuffle!'], dog:['Гав!','Woof!'],
      rabbit:['Фру-фру!','Sniff!'], goat:['Ме-е!','Baa!'], chicken:['Ко-ко!','Cluck!'],
      deer:['Ф-фу!','Huff!'], squirrel:['Цок-цок!','Chit-chit!'], duck:['Кря!','Quack!'],
    };
    const text=actor.species ? reactions[actor.species]?.[LANG==='ru'?0:1] : lines[(actor.said||0)%lines.length];
    actor.said=(actor.said||0)+1;
    actor.tapped=this.island.time;
    audio.actorSound(actor.species);
    this.ui.actorSpeech(actor.m,text||'♪');
  }
  // ---------- стройка ----------
  build(id) {
    const p = PROJECTS.find((q) => q.id === id);
    const d = save.data;
    if(!p||(p.tier||0)>(d.expansion||0))return;
    const st = d.stages[id];
    if (st >= 3) return;
    const cost = p.cost[st];
    if (save.stars() < cost) {
      this.ui.toast(t('needStars', { n: cost }));
      return;
    }
    this.cancelDecor();
    d.starsSpent += cost;
    d.stages[id] = st + 1;
    const stored = this.island.storeDecorForProject(id,st+1);
    save.write();
    this.island.focus(id);
    setTimeout(() => {
      const extra = this.island.setStages(d.stages,id);
      if(extra)save.write();
      audio.play('build');
      this.ui.toast(t('p_' + id + '_' + (st + 1)) + ' — ' + t('done'));
      const arrivals=this.island.lastArrivals;
      if(arrivals.length)setTimeout(()=>this.ui.toast((LANG==='ru'?'На острове появились: ':'New island arrivals: ')+arrivals.map(p=>LANG==='ru'?p.ru:p.en).join(', '),4000),1800);
      if (id === 'ship' && st + 1 === 3) setTimeout(() => this.ui.toast(t('shipDone'), 4000), 1800);
      if (stored+extra) setTimeout(()=>this.decorStoredNotice(stored+extra),arrivals.length?5700:2200);
      this.ui.refreshTop();
    }, 700);
    // через пару секунд камера возвращается к общему виду
    clearTimeout(this.camBack);
    this.camBack = setTimeout(() => this.state === 'island' && this.island.setMode('island'), 6000);
  }

  // ---------- партия ----------
  playLevel(n) {
    this.cancelDecor();
    this.ui.closeModals();
    this.n = n;
    const def = buildLevel(n);
    this.def = def;
    this.state = 'level';
    this.setPaused(false);
    this.freeUndo = FREE_UNDO;
    this.adMore = true;
    this.island.setMode('table');
    this.shade.classList.add('on');
    this.cT.classList.add('on');
    this.ui.hud(n);
    this.table.dim = false;
    const tut = n === 1 && !save.data.levels[1];
    // место под подсказку обучения: меряем обе фразы, карты начинаются ниже самой высокой
    const topMin = tut ? this.ui.tipBottom([t('tut1'), t('tut2')]) + 10 : 0;
    this.table.start(def, { tut, topMin });
    save.data.plays++;
    audio.setIntensity(1);
    sdk.gameplay(true);
    this.tutStep = n === 1 && !save.data.levels[1] ? 1 : 0;
    // объяснение новых механик
    const seen = save.data.seen;
    const queue = [];
    // джокер объясняем, когда он впервые выпадет из колоды, а не до начала игры
    if (def.cards.some((c) => c.coin) && !seen.coin) queue.push('coin');
    if (def.cards.some((c) => c.lock) && !seen.lock) queue.push('lock');
    if (def.cards.some((c) => c.lock === 2) && !seen.keys2) queue.push('keys2');
    if (def.cards.some((c) => c.sand) && !seen.sand) queue.push('sand');
    const session=this.table.g;
    const next = () => {
      if(this.state!=='level'||this.table.g!==session||this.table.over)return;
      const k = queue.shift();
      if (!k) {
        this.setPaused(false);
        return;
      }
      this.explain(k,next,session);
    };
    if (queue.length) setTimeout(next, 1100);
    this.updateTip();
  }
  explain(key,done,session) {
    if(this.state!=='level'||this.table.g!==session||this.table.over)return;
    if(this.ui.modalOpen){setTimeout(()=>this.explain(key,done,session),250);return;}
    save.data.seen[key]=1;save.write(false);this.setPaused(true);
    this.ui.mechanic(key,()=>{if(this.state==='level'&&this.table.g===session)done();});
  }
  updateTip() {
    if (!this.tutStep || this.state !== 'level') return this.ui.tip('');
    const g = this.table.g;
    if (!g) return;
    this.ui.tip(g.anyPlayable() ? t('tut1') : t('tut2'));
  }
  onMove(r) {
    const top = this.table.g && this.table.g.top();
    if (r.draw && top && top.rank === 0 && !save.data.seen.wild) {
      const session=this.table.g;
      setTimeout(()=>this.explain('wild',()=>this.setPaused(false),session),450);
    }
    if (this.tutStep) {
      this.tutStep++;
      if (this.tutStep > 8) {
        this.tutStep = 0;
        this.table.tut = 0;
      }
      this.updateTip();
    }
  }
  undo() {
    if (this.state !== 'level' || this.paused || this.ui.modalOpen || sdk.adActive) return;
    const tb = this.table;
    if (!tb.g || !tb.g.canUndo() || tb.busy) return;
    if (this.freeUndo > 0) {
      if (tb.undo()) this.freeUndo--;
    } else {
      if (save.data.coins < COST.undo) return this.ui.noCoins();
      if (tb.undo()) {
        save.data.coins -= COST.undo;
        save.write();
      }
    }
    this.ui.refreshTop();
  }
  joker() {
    if (this.state !== 'level' || this.paused) return;
    const tb = this.table;
    if (!tb.g || tb.busy || tb.over) return;
    if (save.data.coins < COST.joker) return this.ui.noCoins();
    if (tb.joker()) {
      save.data.coins -= COST.joker;
      save.write();
      this.ui.refreshTop();
    }
  }
  onStuck() {
    sdk.gameplay(false);
    this.ui.tip('');
    this.ui.stuck(this.table.g.remaining(), this.adMore && sdk.canReward());
  }
  // 5 дополнительных карт; первая обязательно подходит к одной из открытых
  more5(ad) {
    if (sdk.adActive || !this.table.g || this.state!=='level') return;
    const session=this.table.g;
    const give = () => {
      if(this.table.g!==session || this.state!=='level') return;
      const g = this.table.g;
      const r = rng(Date.now() & 0xffff);
      const list = [];
      for (let i = 0; i < 5; i++) list.push({ rank: 1 + Math.floor(r() * 13), suit: Math.floor(r() * 4) });
      const free = g.cards.map((c, i) => i).filter((i) => g.free(i));
      if (free.length) {
        const c = g.cards[free[Math.floor(r() * free.length)]];
        list[4] = { rank: c.rank === 13 ? 12 : c.rank + 1, suit: Math.floor(r() * 4) };
      }
      this.table.addCards(list);
      sdk.gameplay(true);
    };
    if (ad) {
      this.adMore = false;
      sdk.showRewarded(give, (ok) => {
        if (!ok && this.table.g===session) { this.adMore=true; this.onStuck(); }
      });
    } else {
      save.data.coins -= COST.more5;
      save.write();
      this.ui.refreshTop();
      give();
    }
  }
  onWin(r) {
    sdk.gameplay(false);
    const d = save.data;
    const n = this.n;
    const prev = d.levels[n] || { stars: 0, best: 0 };
    const reward = WIN_COINS(r.stars, n) + r.coins;
    const firstCoins = reward>0 && !d.seen.earnedCoins;
    d.levels[n] = { stars: Math.max(prev.stars, r.stars), best: Math.max(prev.best, r.score) };
    d.level = Math.max(d.level, n + 1);
    save.creditCoins(reward);
    d.wins++;
    recordVoyageWin(this.table.g.cards.length,r.best);
    save.write();
    sdk.submitScore(save.total());
    this.ui.tip('');
    this.ui.refreshTop();
    const available = this.ui.nextProject();
    const firstProject = available?.ok && !Object.values(d.stages).some(stage => stage > 0)
      ? available.p.id : null;
    this.ui.win({ n, stars: r.stars, score: r.score, best: prev.best > r.score ? prev.best : 0,
      coins: reward, left: r.left, canBuild: available?.ok, firstProject, firstCoins });
  }
  doubleReward(coins, done, finished) {
    sdk.showRewarded(() => {
      this.addCoins(coins);
      audio.play('coin');
      done();
    }, finished);
  }
  adCoins(done) {
    sdk.showRewarded(() => {
      save.data.freeAdAt = Date.now();
      this.addCoins(AD_COINS);
      audio.play('coin');
    }, () => done && done());
  }
  lose() {
    audio.play('lose');
    this.ui.tip('');
    this.ui.lose(this.n);
  }
  // полноэкранная реклама только в паузе между уровнями
  interstitial(then) {
    if (Date.now() - this.lastAd < MIN_AD_GAP || save.data.plays < 3) return then();
    this.lastAd = Date.now();
    sdk.showInterstitial(then);
  }
  nextLevel(n) {
    this.interstitial(() => this.playLevel(n + 1));
  }
  retry(ad) {
    const go = () => this.playLevel(this.n);
    ad ? this.interstitial(go) : go();
  }
  toIsland(ad, projectId = null) {
    const go = () => {
      this.table.stop();
      this.state = 'island';
      sdk.gameplay(false);
      this.shade.classList.remove('on');
      this.cT.classList.remove('on');
      this.island.setMode('island');
      audio.setIntensity(0);
      this.ui.home();
      if (projectId) {
        this.island.focus(projectId);
        this.ui.project(projectId);
        return;
      }
      // подсказать, что можно строить
      if (this.ui.affordable() > 0) setTimeout(() => this.ui.toast(t('canBuild') + ': ' + this.ui.bubbleList().map((n) => t('p_' + n.p.id)).join(', '), 3600), 900);
    };
    ad ? this.interstitial(go) : go();
  }

  // ---------- кадр ----------
  frame(dt) {
    const lvl = this.state === 'level';
    const visible = !lvl || document.documentElement.dataset.theme === 'island';
    const limited = lvl && this.quality !== 'high';
    if (visible) {
      this.islandElapsed = (this.islandElapsed || 0) + dt;
      if (!limited || this.islandElapsed >= 1 / 30 - 0.002) {
        this.island.update(this.islandElapsed);
        this.island.render();
        this.islandElapsed = 0;
      }
    } else this.islandElapsed = 0;
    if (lvl && !this.paused && !this.ui.modalOpen && !sdk.adActive) this.table.update(dt);
    if (lvl) this.table.render();
    if (lvl && this.tutStep) this.updateTipThrottled(dt);
    if (!lvl) this.ui.updateBubble();
  }
  updateTipThrottled(dt) {
    this._tipT = (this._tipT || 0) + dt;
    if (this._tipT > 0.5) {
      this._tipT = 0;
      this.updateTip();
    }
  }
}
export { MAIN_LEVELS };
