// Отрисовка: город на фоне, стопка плиток с объёмом и тенями, выделение, подсказка, анимации снятия пар и частицы.
import { bodySprite, faceSprite, faceSize, badgeSprite, tileDims, canvas, faceColor, isFlower, getFaceSet, clearSpriteCache } from './tiles.js';
import { drawCity } from './cities.js';
import { CITIES } from './levels.js';
import { drawMat } from './scenery.js';
import { EFFECTS } from './cosmetics.js';
import {drawPostcardArt} from './postcard-art.js';

const ease = (u) => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);

export class View {
  constructor(cv) {
    this.cv = cv;
    this.g = cv.getContext('2d');
    this.t = 0;
    this.city = 0;
    this.style = 'ivory';
    this.mode = 'menu';
    this.highlightFree = true;
    this.fx = { ghosts: [], parts: [], texts: [], rings: [] };
    this.bgCache = new Map();
    this.anim = new Map(); // id → { kind, t0, ... }
    this.zoom=1;this.panX=0;this.panY=0;this.mailIds=new Set();
    this.goalIds=new Set();this.campaignKind='';
  }

  resize(W, H, dpr) {
    this.W = W;
    this.H = H;
    this.dpr = dpr;
    this.cv.width = Math.round(W * dpr);
    this.cv.height = Math.round(H * dpr);
    this.bgCache.clear();
    clearSpriteCache();
    this.layout();
  }

  layout() {
    // CSS max()/env() вычисляем через размеры probe: parseFloat('max(...)') не подходит.
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:var(--safe-top,0px) var(--safe-right,0px) var(--safe-bottom,0px) var(--safe-left,0px)';
    document.body.appendChild(probe);
    const ps = getComputedStyle(probe);
    const inset = Object.fromEntries(['Top', 'Right', 'Bottom', 'Left'].map(s => [s.toLowerCase(), parseFloat(ps['padding' + s]) || 0]));
    probe.remove();
    const W = this.W - inset.left - inset.right, H = this.H - inset.top - inset.bottom;
    const port = W / H < 1.05;
    const compact=H<500,hud=port?Math.min(138,Math.max(130,H*.16)):(compact?84:96);
    const help=compact?64:(port?Math.min(104,Math.max(86,H*.12)):84);
    const helpWidth=Math.min(W-(port?20:32),port?440:460),margin=port?6:18;
    const L = {
      port,
      hud:{h:hud,centerX:inset.left+W/2},
      help:{x:(W-helpWidth)/2,y:H-help-12,w:helpWidth,h:help,vert:false},
      board:{x:margin,y:hud+4,w:W-margin*2,h:H-hud-help-28}
    };
    L.hud.h += inset.top;
    L.help.x += inset.left;
    L.help.y += inset.top;
    L.board.x += inset.left;
    L.board.y += inset.top;
    L.board.y+=38;L.board.h-=38;
    this.L = L;
    this.fit();
  }

  // уместить плитки текущей партии в прямоугольник поля
  fit() {
    const g = this.game;
    const L = this.L;
    if (!g || !L) return;
    const T = g.tiles;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, zm = 0;
    for (const t of T) {
      x0 = Math.min(x0, t.x);
      x1 = Math.max(x1, t.x + 2);
      y0 = Math.min(y0, t.y);
      y1 = Math.max(y1, t.y + 2);
      zm = Math.max(zm, t.z);
    }
    const sx = (x1 - x0) / 2, sy = (y1 - y0) / 2;
    const k = 0.13 * (zm + 1);
    let w = Math.min(L.board.w / (sx + k), L.board.h / (sy * 1.28 + k));
    w = Math.min(w, L.port ? 96 : 104);
    w = Math.floor(w * this.dpr) / this.dpr;
    const D = tileDims(w);
    const bw = sx * D.w + D.d * (zm + 1), bh = sy * D.h + D.d * (zm + 1);
    this.tw = w;
    this.D = D;
    this.ox = L.board.x + (L.board.w - bw) / 2 - x0 * (D.w / 2) + D.d * zm;
    this.oy = L.board.y + (L.board.h - bh) / 2 - y0 * (D.h / 2) + D.d * zm;
    this.bounds = { x: L.board.x + (L.board.w - bw) / 2, y: L.board.y + (L.board.h - bh) / 2, w: bw, h: bh };
    this.order = T.slice().sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x).map((t) => t.id);
    this.dw = Math.round(w * this.dpr);
    this.clampPan();
  }

  matrix(){const b=this.L.board,z=this.zoom||1;return {z,x:(b.x+b.w/2)*(1-z)+this.panX,y:(b.y+b.h/2)*(1-z)+this.panY};}
  project(x,y){const m=this.matrix();return {x:x*m.z+m.x,y:y*m.z+m.y};}
  unproject(x,y){const m=this.matrix();return {x:(x-m.x)/m.z,y:(y-m.y)/m.z};}
  cameraJSON(){return {zoom:this.zoom,x:this.panX,y:this.panY};}
  setZoom(value,anchor){
    if(!Number.isFinite(value))value=1;
    const before=anchor&&this.L?this.unproject(anchor.x,anchor.y):null;
    const oldBucket=Math.ceil(this.zoom*2);this.zoom=Math.max(1,Math.min(2.5,value));
    if(before){const after=this.project(before.x,before.y);this.panX+=anchor.x-after.x;this.panY+=anchor.y-after.y;}
    if(oldBucket!==Math.ceil(this.zoom*2))clearSpriteCache();
    this.clampPan();
  }
  pan(x,y,absolute=false){if(!Number.isFinite(x))x=0;if(!Number.isFinite(y))y=0;this.panX=absolute?x:this.panX+x;this.panY=absolute?y:this.panY+y;this.clampPan();}
  clampPan(){
    if(!this.L||!this.bounds)return;
    if(this.zoom<=1){this.panX=0;this.panY=0;return;}
    const b=this.L.board,r=this.bounds,z=this.zoom;
    for(const [p,lo,len,origin,size]of [['panX',b.x,b.w,r.x,r.w],['panY',b.y,b.h,r.y,r.h]]){
      const base=(lo+len/2)*(1-z),min=lo+len-12-(origin+size)*z-base,max=lo+12-origin*z-base;
      this[p]=min>max?0:Math.max(min,Math.min(max,this[p]||0));
    }
  }
  focusPair(pair){
    if(this.zoom<=1)return;
    const ps=pair.map(i=>{const p=this.tilePos(this.game.tiles[i]);return {x:p.x+this.D.w/2,y:p.y+this.D.h/2};}),b=this.L.board;
    this.setZoom(Math.min(this.zoom,(b.w-40)/(Math.abs(ps[0].x-ps[1].x)+this.D.w),(b.h-40)/(Math.abs(ps[0].y-ps[1].y)+this.D.h)));
    const p=this.project((ps[0].x+ps[1].x)/2,(ps[0].y+ps[1].y)/2);
    this.pan(b.x+b.w/2-p.x,b.y+b.h/2-p.y);
  }

  setGame(g) {
    this.bgCache.clear();
    this.game = g;
    this.anim.clear();
    this.fx = { ghosts: [], parts: [], texts: [], rings: [] };
    this.fit();
  }

  tilePos(t) {
    const D = this.D;
    return { x: this.ox + (t.x * D.w) / 2 - t.z * D.d, y: this.oy + (t.y * D.h) / 2 - t.z * D.d };
  }
  tileCenter(i) {
    const t = this.game.tiles[i];
    const p = this.tilePos(t);
    return this.project(p.x + this.D.w / 2,p.y + this.D.h / 2);
  }

  // верхняя плитка под точкой
  hit(px, py) {
    const g = this.game;
    if (!g) return -1;
    const b=this.L.board;if(px<b.x||px>b.x+b.w||py<b.y||py>b.y+b.h)return -1;
    const original=this.unproject(px,py);px=original.x;py=original.y;
    const D = this.D;
    for (let k = this.order.length - 1; k >= 0; k--) {
      const t = g.tiles[this.order[k]];
      if (!g.alive[t.id]) continue;
      const p = this.tilePos(t);
      if (px >= p.x && px <= p.x + D.w + D.d * 0.5 && py >= p.y && py <= p.y + D.h + D.d * 0.5) return t.id;
    }
    return -1;
  }

  // ---------- эффекты ----------
  intro() {
    const g = this.game;
    this.order.forEach((id, k) => this.anim.set(id, { kind: 'drop', t0: this.t + 0.12 + k * Math.min(0.012, 0.9 / this.order.length) + g.tiles[id].z * 0.08 }));
  }
  shake(i) {
    this.anim.set(i, { kind: 'shake', t0: this.t });
  }
  flip(i, delay = 0) {
    this.anim.set(i, { kind: 'flip', t0: this.t + delay });
  }
  pop(i) {
    this.anim.set(i, { kind: 'pop', t0: this.t });
  }
  moveFrom(i, from) {
    const t = this.game.tiles[i];
    const D = this.D;
    const fp = { x: this.ox + (from.x * D.w) / 2 - from.z * D.d, y: this.oy + (from.y * D.h) / 2 - from.z * D.d };
    this.anim.set(i, { kind: 'move', t0: this.t, fx: fp.x, fy: fp.y });
  }
  // пара снята: плитки слетаются к середине и рассыпаются лепестками или брызгами
  matched(a, b, f) {
    const g = this.game;
    const pa = this.tilePos(g.tiles[a]), pb = this.tilePos(g.tiles[b]);
    const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2 - this.D.h * 0.15;
    for (const [id, p] of [[a, pa], [b, pb]]) this.fx.ghosts.push({ f, hidden: false, x: p.x, y: p.y, tx: mx + (id === a ? -1 : 1) * this.D.w * 0.52, ty: my, t0: this.t, z: g.tiles[id].z });
    const cx = mx + this.D.w / 2, cy = my + this.D.h / 2;
    setTimeout(() => this.burst(cx, cy, f), 260);
    return { x: cx, y: cy };
  }
  burst(x, y, f) {
    const col = faceColor(f) || '#fff';
    const flower = getFaceSet() === 'fruit' && isFlower(f);
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      const sp = this.tw * (1.6 + Math.random() * 2.2);
      this.fx.parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - this.tw * 1.2, t0: this.t, life: 0.8 + Math.random() * 0.5,
        c: (EFFECTS[this.effect]||EFFECTS.sparkles).c[i%3], kind: this.effect==='petals'?'petal':this.effect==='fireflies'?'star':this.effect==='confetti'?'confetti':flower?'petal':'drop', r: this.tw * (0.07 + Math.random() * 0.06), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10,
      });
    }
    this.fx.rings.push({ x, y, t0: this.t, c: col });
  }
  text(s, x, y, o = {}) {
    this.fx.texts.push({ s, x, y, t0: this.t + (o.delay || 0), dur: o.dur || 1.1, size: o.size || this.tw * 0.42, color: o.color || '#fff7dc', rise: o.rise || this.tw * 0.8 });
  }
  sparkle(x, y, c = '#ffe48a') {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, sp = this.tw * (1 + Math.random() * 1.5);
      this.fx.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t0: this.t, life: 0.6, c, kind: 'star', r: this.tw * 0.08, rot: 0, vr: 4 });
    }
  }

  // ---------- фон ----------
  bg() {
    const id = CITIES[this.city].id;
    const k = id + (this.mode === 'play' ? ':p' : ':m')+':'+this.mat+':'+(this.mode==='play'?this.tripEdition||'':'');
    if (!this.bgCache.has(k)) {
      const c = canvas(this.cv.width, this.cv.height);
      if(!(this.mode==='play'&&this.tripEdition&&drawPostcardArt(c.getContext('2d'),this.city,c.width,c.height,0,this.tripEdition)))drawCity(c.getContext('2d'), id, c.width, c.height, { responsive:true });
      if(this.mode==='play'&&this.bounds){const cg=c.getContext('2d');cg.save();cg.scale(this.dpr,this.dpr);drawMat(cg,this.bounds,this.mat);cg.restore();}
      if(this.bgCache.size>3)this.bgCache.clear();
      this.bgCache.set(k, c);
    }
    return this.bgCache.get(k);
  }

  // ---------- кадр ----------
  draw(dt, st) {
    this.t += dt;
    const g = this.g, dpr = this.dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.bg(), 0, 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.mode === 'play' && this.game){
      const b=this.L.board,m=this.matrix();g.save();g.beginPath();g.rect(b.x,b.y,b.w,b.h);g.clip();g.translate(m.x,m.y);g.scale(m.z,m.z);
      this.drawBoard(st);this.drawFx(dt);g.restore();
    }else this.drawFx(dt);
  }

  drawBoard(st) {
    const g = this.g, game = this.game, D = this.D, dpr = this.dpr;
    // мягкая подложка под поле, чтобы плитки читались на любом городе
    const b = this.bounds;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const rad = g.createRadialGradient(cx, cy, Math.min(b.w, b.h) * 0.2, cx, cy, Math.max(b.w, b.h) * 0.75);
    rad.addColorStop(0, 'rgba(255,248,230,.32)');
    rad.addColorStop(0.7, 'rgba(255,248,230,.14)');
    rad.addColorStop(1, 'rgba(255,248,230,0)');
    g.fillStyle = rad;
    g.fillRect(b.x - b.w * 0.4, b.y - b.h * 0.4, b.w * 1.8, b.h * 1.8);

    const scale=Math.ceil(this.zoom*2)/2,rdpr=dpr*scale,renderWidth=Math.round(this.dw*scale);
    const body = bodySprite(this.style, renderWidth);
    const back = bodySprite(this.style, renderWidth, 'back');
    const bw = body.width / rdpr, bh = body.height / rdpr;
    const coin = badgeSprite('coin', Math.round(D.w * 0.42 * dpr));
    const lock = badgeSprite('lock', Math.round(D.w * 0.5 * dpr));
    const keys = game.keysAlive();
    const hint = st.hint && this.t < st.hint.until ? st.hint : null;
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 7);
    // подсветка пар к выбранной плитке (по желанию в настройках)
    const selF = this.matchGlow && st.sel >= 0 && game.alive[st.sel] ? game.faceOf(st.sel) : null;
    for (const id of this.order) {
      if (!game.alive[id]) continue;
      const tl = game.tiles[id];
      let { x, y } = this.tilePos(tl);
      let sc = 1, sx = 1, alpha = 1;
      const an = this.anim.get(id);
      if (an) {
        const u = this.t - an.t0;
        if (an.kind === 'drop') {
          if (u < 0) continue;
          const e = ease(u / 0.38);
          y -= (1 - e) * D.h * 0.9;
          alpha = Math.min(1, u / 0.2);
          if (u > 0.38) this.anim.delete(id);
        } else if (an.kind === 'shake') {
          x += Math.sin(u * 50) * D.w * 0.06 * Math.max(0, 1 - u / 0.35);
          if (u > 0.35) this.anim.delete(id);
        } else if (an.kind === 'pop') {
          sc = 1 + 0.18 * Math.sin(Math.min(1, u / 0.3) * Math.PI);
          alpha = Math.min(1, u / 0.15);
          if (u > 0.3) this.anim.delete(id);
        } else if (an.kind === 'flip') {
          if (u >= 0) {
            sx = Math.abs(Math.cos(Math.min(1, u / 0.4) * Math.PI));
            if (u > 0.4) this.anim.delete(id);
          }
        } else if (an.kind === 'move') {
          const e = ease(u / 0.45);
          x = an.fx + (x - an.fx) * e;
          y = an.fy + (y - an.fy) * e;
          if (u > 0.45) this.anim.delete(id);
        }
      }
      const sel = st.sel === id;
      const isHint = hint && (hint.pair[0] === id || hint.pair[1] === id);
      if (sel) y -= D.d * 0.6;
      g.save();
      g.globalAlpha = alpha;
      if (sc !== 1 || sx !== 1) {
        g.translate(x + D.w / 2, y + D.h / 2);
        g.scale(sc * sx, sc);
        g.translate(-x - D.w / 2, -y - D.h / 2);
      }
      // тень
      g.fillStyle = 'rgba(30,15,5,.22)';
      g.beginPath();
      g.roundRect(x + D.d * 0.9, y + D.d * 1.1, D.w, D.h, D.r);
      g.fill();
      const face = game.faceOf(id);
      const fsz=faceSize(renderWidth,undefined,face),fs=fsz/rdpr;
      const showBack = !face || (an && an.kind === 'flip' && this.t - an.t0 < 0.2 && this.t >= an.t0);
      g.drawImage(showBack ? back : body, x, y, bw, bh);
      if (!showBack) g.drawImage(faceSprite(face, fsz), x + (D.w - fs) / 2, y + (D.h - fs) / 2, fs, fs);
      if(!showBack&&this.mailIds.has(id)){
        const ew=D.w*.3,eh=ew*.68,ex=x+D.w*.06,ey=y+D.h-eh-D.w*.05;
        g.fillStyle='#fff5d8';g.strokeStyle='#96723e';g.lineWidth=Math.max(.7,D.w*.018);g.fillRect(ex,ey,ew,eh);g.strokeRect(ex,ey,ew,eh);g.beginPath();g.moveTo(ex,ey);g.lineTo(ex+ew/2,ey+eh*.62);g.lineTo(ex+ew,ey);g.stroke();g.fillStyle='#ae5548';g.beginPath();g.arc(ex+ew/2,ey+eh*.62,ew*.08,0,Math.PI*2);g.fill();
      }
      if (!showBack && tl.coin) g.drawImage(coin, x + D.w - coin.width / dpr * 0.82, y - coin.height / dpr * 0.18, coin.width / dpr, coin.height / dpr);
      if(this.goalIds.has(id)&&(this.campaignKind==='seals'||this.campaignKind==='unlock')){
        const gx=x+D.w*.81,gy=y+D.h*.83,r=D.w*.12;
        g.fillStyle=this.campaignKind==='seals'?(tl.seen?'#597b5c':'#ac5145'):'#bc8a3a';g.strokeStyle='#fff4d7';g.lineWidth=Math.max(.8,D.w*.024);
        g.beginPath();g.arc(gx,gy,r,0,Math.PI*2);g.fill();g.stroke();
        g.strokeStyle='#fff6df';g.lineWidth=Math.max(.8,D.w*.025);g.beginPath();
        if(this.campaignKind==='seals'){g.moveTo(gx-r*.45,gy);g.lineTo(gx-r*.05,gy+r*.35);g.lineTo(gx+r*.5,gy-r*.4);}
        else {g.arc(gx,gy-r*.2,r*.42,Math.PI,0);g.moveTo(gx-r*.5,gy+r*.1);g.lineTo(gx+r*.5,gy+r*.1);g.lineTo(gx+r*.5,gy+r*.55);g.lineTo(gx-r*.5,gy+r*.55);g.closePath();}
        g.stroke();
      }
      const locked = tl.lock && keys;
      const free = game.free(id);
      if (locked) {
        g.fillStyle = 'rgba(80,90,110,.32)';
        g.beginPath();
        g.roundRect(x, y, D.w, D.h, D.r);
        g.fill();
        g.strokeStyle = 'rgba(70,80,95,.85)';
        g.lineWidth = Math.max(1.5, D.w * 0.05);
        g.setLineDash([D.w * 0.09, D.w * 0.05]);
        g.beginPath();
        g.moveTo(x + D.w * 0.1, y + D.h * 0.15);
        g.lineTo(x + D.w * 0.9, y + D.h * 0.85);
        g.moveTo(x + D.w * 0.9, y + D.h * 0.15);
        g.lineTo(x + D.w * 0.1, y + D.h * 0.85);
        g.stroke();
        g.setLineDash([]);
        g.drawImage(lock, x + (D.w - lock.width / dpr) / 2, y + (D.h - lock.height / dpr) / 2, lock.width / dpr, lock.height / dpr);
      } else if (!free && this.highlightFree) {
        g.fillStyle = 'rgba(29,49,40,.26)';
        g.beginPath();
        g.roundRect(x, y, D.w, D.h, D.r);
        g.fill();
      }
      if (selF && !sel && !isHint && game.faceOf(id) === selF && game.selectable(id)) {
        g.lineWidth = Math.max(2.5, D.w * 0.07);
        g.strokeStyle = `rgba(221,190,113,${0.5 + 0.4 * pulse})`;
        g.beginPath();
        g.roundRect(x - 1, y - 1, D.w + 2, D.h + 2, D.r);
        g.stroke();
      }
      if (sel || isHint) {
        g.lineWidth = Math.max(2.5, D.w * 0.055);
        g.strokeStyle = sel ? '#e2bd6a' : `rgba(159,211,151,${0.65 + 0.35 * pulse})`;
        g.shadowColor = sel ? 'rgba(243,208,127,.9)' : 'rgba(162,216,154,.9)';
        g.shadowBlur = D.w * 0.15;
        g.beginPath();
        g.roundRect(x - 1, y - 1, D.w + 2, D.h + 2, D.r);
        g.stroke();
        g.shadowBlur = 0;
        if (sel) {
          g.fillStyle = 'rgba(255,220,120,.18)';
          g.fill();
        }
      }
      g.restore();
    }
  }

  drawFx(dt) {
    const g = this.g, D = this.D, dpr = this.dpr, fx = this.fx;
    // летящие плитки снятой пары
    if (fx.ghosts.length && D) {
      const body = bodySprite(this.style, this.dw);
      fx.ghosts = fx.ghosts.filter((q) => this.t - q.t0 < 0.42);
      for (const q of fx.ghosts) {
        const fsz=faceSize(this.dw,undefined,q.f),fs=fsz/dpr;
        const u = (this.t - q.t0) / 0.42;
        const e = ease(Math.min(1, u / 0.62));
        const x = q.x + (q.tx - q.x) * e, y = q.y + (q.ty - q.y) * e - Math.sin(Math.min(1, u / 0.62) * Math.PI) * D.h * 0.25;
        const sc = u < 0.62 ? 1 + 0.08 * e : 1.08 * (1 - (u - 0.62) / 0.38);
        g.save();
        g.globalAlpha = u < 0.62 ? 1 : 1 - (u - 0.62) / 0.38;
        g.translate(x + D.w / 2, y + D.h / 2);
        g.scale(sc, sc);
        g.translate(-D.w / 2, -D.h / 2);
        g.drawImage(body, 0, 0, body.width / dpr, body.height / dpr);
        g.drawImage(faceSprite(q.f, fsz), (D.w - fs) / 2, (D.h - fs) / 2, fs, fs);
        g.restore();
      }
    }
    // кольца
    fx.rings = fx.rings.filter((r) => this.t - r.t0 < 0.5);
    for (const r of fx.rings) {
      const u = (this.t - r.t0) / 0.5;
      g.strokeStyle = r.c;
      g.globalAlpha = 1 - u;
      g.lineWidth = (this.tw || 40) * 0.1 * (1 - u) + 1;
      g.beginPath();
      g.arc(r.x, r.y, (this.tw || 40) * (0.3 + u * 1.3), 0, Math.PI * 2);
      g.stroke();
      g.globalAlpha = 1;
    }
    // частицы
    fx.parts = fx.parts.filter((p) => this.t - p.t0 < p.life);
    for (const p of fx.parts) {
      const u = (this.t - p.t0) / p.life;
      p.vy += (this.tw || 40) * 6 * dt;
      p.vx *= 1 - dt * 1.5;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      g.save();
      g.globalAlpha = 1 - u * u;
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.c;
      g.beginPath();
      if (p.kind === 'confetti')g.rect(-p.r,-p.r*.4,p.r*2,p.r*.8);
      else if (p.kind === 'petal') g.ellipse(0, 0, p.r * 1.6, p.r * 0.8, 0, 0, Math.PI * 2);
      else if (p.kind === 'star') {
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4, rr = i % 2 ? p.r * 0.4 : p.r * 1.3;
          g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        g.closePath();
      } else g.arc(0, 0, p.r, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    // всплывающие надписи
    fx.texts = fx.texts.filter((q) => this.t - q.t0 < q.dur);
    for (const q of fx.texts) {
      const u = (this.t - q.t0) / q.dur;
      if (u < 0) continue;
      const sc = u < 0.15 ? 0.6 + (u / 0.15) * 0.4 : 1;
      g.save();
      g.globalAlpha = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
      g.translate(q.x, q.y - q.rise * ease(u));
      g.scale(sc, sc);
      g.font = `900 ${q.size}px Nunito, Arial, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = q.size * 0.22;
      g.strokeStyle = '#4a2a10';
      g.strokeText(q.s, 0, 0);
      g.fillStyle = q.color;
      g.fillText(q.s, 0, 0);
      g.restore();
    }
  }
}
