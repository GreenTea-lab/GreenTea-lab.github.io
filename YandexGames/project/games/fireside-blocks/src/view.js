// Отрисовка на canvas: стол, поле, лоток с фигурами, перетаскивание, эффекты.
import { N, SHAPE } from './core.js';
import { canvas, grain, roundRect, mix, blockSprite, STYLES } from './gfx.js';
import { itemSprite } from './items.js';
import { buildTable, drawAnims } from './table.js';
import { drawAmbient } from './scenes.js';
import {BOARDS,EFFECTS,material} from './materials.js';

const ease = (t) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const back = (t) => {
  t = Math.max(0, Math.min(1, t));
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

export class View {
  constructor(cv) {
    this.cv = cv;
    this.g = cv.getContext('2d');
    this.style = 'painted';
    this.season = 'autumn';
    this.scene = null;
    this.sceneAnim = null;
    this.decor = ['cup', 'scatter', 'glasses'];
    this.fx = { pops: [], fly: [], parts: [], texts: [], items: [], flashes: [] };
    this.t = 0;
    this.dim = 0; // затемнение поля при «нет места»
    this.mode = 'menu'; // menu — только стол; play — поле и лоток
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

  layout() {
    const probe = document.createElement('div');
    probe.style.cssText='position:fixed;visibility:hidden;padding:var(--safe-top,env(safe-area-inset-top,0px)) var(--safe-right,env(safe-area-inset-right,0px)) var(--safe-bottom,env(safe-area-inset-bottom,0px)) var(--safe-left,env(safe-area-inset-left,0px))';
    document.body.appendChild(probe);
    const css=getComputedStyle(probe), inset={top:parseFloat(css.paddingTop)||0,right:parseFloat(css.paddingRight)||0,bottom:parseFloat(css.paddingBottom)||0,left:parseFloat(css.paddingLeft)||0};
    probe.remove();
    const W = this.W-inset.left-inset.right, H = this.H-inset.top-inset.bottom;
    const L = {};
    const port = W / H < 0.9;
    L.port = port;
    if (port) {
      const hudH = this.advHud ? Math.max(138, Math.min(176, H * 0.17)) : Math.max(96, Math.min(160, H * 0.135));
      const helpH = Math.max(92, Math.min(128, H * 0.12));
      const rem = H - hudH - helpH;
      let bs = Math.min(W - 20, rem * 0.66, 620);
      let th = Math.min(bs * 0.44, rem - bs - 16);
      const gap = Math.max(8, (rem - bs - th) / 3);
      const by = hudH + gap * 0.9;
      L.board = { x: (W - bs) / 2, y: by, s: bs };
      const tw = Math.min(W - 16, bs + 40);
      L.tray = { x: (W - tw) / 2, y: by + bs + gap * 1.1, w: tw, h: th, vert: false };
      L.help = { x: (W - Math.min(W - 16, 560)) / 2, y: H - helpH + 4, w: Math.min(W - 16, 560), h: helpH - 12, vert: false };
      L.hud = { x: 0, y: 0, w: W, h: hudH };
    } else {
      const hudH = this.advHud ? Math.max(104, Math.min(140, H * 0.15)) : Math.max(74, Math.min(130, H * 0.12));
      let bs = Math.min(H - hudH - 28, W * 0.5, 820);
      const tw = Math.max(150, bs * 0.4);
      const hw = Math.max(104, Math.min(150, bs * 0.2));
      const gap = Math.max(16, bs * 0.05);
      let total = hw + gap + bs + gap + tw;
      if (total > W - 20) {
        bs *= (W - 20 - hw - tw - 2 * gap) / bs;
        total = hw + gap + bs + gap + tw;
      }
      const x0 = (W - total) / 2;
      const by = hudH + (H - hudH - bs) / 2 - 4;
      L.board = { x: x0 + hw + gap, y: by, s: bs };
      L.tray = { x: x0 + hw + gap + bs + gap, y: by, w: tw, h: bs, vert: true };
      L.help = { x: x0, y: by + bs * 0.08, w: hw, h: bs * 0.84, vert: true };
      L.hud = { x: 0, y: 0, w: W, h: hudH };
    }
    for(const r of [L.board,L.tray,L.help,L.hud]){r.x+=inset.left;r.y+=inset.top;}
    L.cell = L.board.s / (N + 0.76);
    L.frame = L.cell * 0.38;
    L.gx = L.board.x + L.frame;
    L.gy = L.board.y + L.frame;
    const t = L.tray;
    L.slots = [0, 1, 2].map((i) =>
      t.vert ? { x: t.x, y: t.y + (i * t.h) / 3, w: t.w, h: t.h / 3 } : { x: t.x + (i * t.w) / 3, y: t.y, w: t.w / 3, h: t.h },
    );
    L.tcell = Math.min(L.cell * 0.66, Math.min(L.slots[0].w, L.slots[0].h) / 5.5);
    this.L = L;
  }

  // фон и рамка поля пересобираются при смене размера, сезона, набора вещей
  rebuild() {
    const L = this.L;
    const avoid = this.mode === 'play' ? [L.hud, L.board, L.tray, L.help] : this.menuAvoid || [];
    const tb = buildTable(this.W, this.H, this.dpr, this.season, this.decor, avoid, this.scene);
    this.bg = tb.canvas;
    this.anims = tb.anims;
    this.roomState=tb.roomState||null;
    this.sceneAnim = tb.scene || null;
    this.boardImg = this.mode === 'play' ? this.buildBoard() : null;
    this.trayImg = this.mode === 'play' ? this.buildTray() : null;
  }

  boardPreview(id,asCanvas=false) {
    const view=Object.create(View.prototype);
    view.boardStyle=id;view.dpr=1;view.L={board:{s:256},cell:256/8.76,frame:256/8.76*.38};
    const c=view.buildBoard();return asCanvas?c:c.toDataURL();
  }

  effectPreview(id) {
    const view=Object.create(View.prototype),c=canvas(280,112);
    view.style=this.style;view.dpr=1;view.L={cell:50};view.t=.2;
    view.fx={fly:[],items:[],parts:Array.from({length:7},(_,i)=>({x:30+i*36,y:58-Math.sin(i)*20,vx:0,vy:0,rot:i*.7,vr:0,t0:0,life:1,c:i,size:id==='sparks'?18:34,kind:id==='sparks'?'chip':'collectible',item:EFFECTS[id]?.item}))};
    view.fx.parts.push({x:140,y:25,vy:0,t0:0,life:.8,size:12,kind:'spark'});
    view.drawFx(c.getContext('2d'),0);return c.toDataURL();
  }

  buildBoard() {
    const theme=BOARDS[this.boardStyle]||BOARDS.walnut;
    const L = this.L, d = this.dpr;
    const s = L.board.s;
    const c = canvas((s + 40) * d, (s + 40) * d);
    const g = c.getContext('2d');
    g.scale(d, d);
    g.translate(20, 20);
    // тень доски на столе
    g.fillStyle = 'rgba(25,10,2,.45)';
    roundRect(g, 4, 10, s, s, L.frame * 0.9);
    g.filter = 'blur(8px)';
    g.fill();
    g.filter = 'none';
    // рамка из ореха
    const fr = g.createLinearGradient(0, 0, s, s);
    fr.addColorStop(0, theme.a);
    fr.addColorStop(1, theme.b);
    g.fillStyle = fr;
    roundRect(g, 0, 0, s, s, L.frame * 0.9);
    g.fill();
    g.save();
    roundRect(g, 0, 0, s, s, L.frame * 0.9);
    g.clip();
    grain(g, 0, 0, s, s, { seed: 41, color: '#1e0c02', alpha: 0.3, dir: 'h', density: 0.9, scale: s / 500 });
    if(theme.pattern!=='wood'){g.globalAlpha=.35;material(g,s,theme.pattern,theme.a);g.globalAlpha=1;}
    g.restore();
    g.strokeStyle = 'rgba(255,220,170,.25)';
    g.lineWidth = 2;
    roundRect(g, 1.5, 1.5, s - 3, s - 3, L.frame * 0.85);
    g.stroke();
    // углубление под клетки
    const f = L.frame;
    const inner = s - f * 2;
    g.fillStyle = '#3a1e0c';
    roundRect(g, f - 3, f - 3, inner + 6, inner + 6, L.cell * 0.18);
    g.fill();
    // клетки — светлые вставки из берёзы с тенью сверху
    const cs = L.cell;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const px = f + x * cs, py = f + y * cs;
      const pad = cs * 0.045;
      const tone = (x + y) % 2 ? theme.cell : mix(theme.cell,theme.b,.06);
      const gr = g.createLinearGradient(px, py, px, py + cs);
      gr.addColorStop(0, mix(tone, '#5a3518', 0.22));
      gr.addColorStop(0.18, tone);
      gr.addColorStop(1, mix(tone, '#fff5e0', 0.1));
      g.fillStyle = gr;
      roundRect(g, px + pad, py + pad, cs - pad * 2, cs - pad * 2, cs * 0.12);
      g.fill();
      g.save();
      roundRect(g, px + pad, py + pad, cs - pad * 2, cs - pad * 2, cs * 0.12);
      g.clip();
      grain(g, px, py, cs, cs, { seed: x * 9 + y * 71, color: '#6a4222', alpha: 0.14, dir: 'h', knots: false, density: 0.8, scale: cs / 60 });
      g.restore();
    }
    // латунные уголки
    for (const [cx, cy] of [[f * 0.5, f * 0.5], [s - f * 0.5, f * 0.5], [f * 0.5, s - f * 0.5], [s - f * 0.5, s - f * 0.5]]) {
      g.beginPath();
      g.arc(cx, cy, f * 0.24, 0, Math.PI * 2);
      const br = g.createRadialGradient(cx - f * 0.08, cy - f * 0.08, 0, cx, cy, f * 0.24);
      br.addColorStop(0, '#fbe3a0');
      br.addColorStop(1, '#9a6a24');
      g.fillStyle = br;
      g.fill();
    }
    return c;
  }

  buildTray() {
    const theme=BOARDS[this.boardStyle]||BOARDS.walnut;
    const L = this.L, d = this.dpr, t = L.tray;
    const c = canvas((t.w + 30) * d, (t.h + 30) * d);
    const g = c.getContext('2d');
    g.scale(d, d);
    g.translate(15, 15);
    g.fillStyle = 'rgba(25,10,2,.4)';
    g.filter = 'blur(7px)';
    roundRect(g, 3, 8, t.w, t.h, 18);
    g.fill();
    g.filter = 'none';
    const gr = g.createLinearGradient(0, 0, 0, t.h);
    gr.addColorStop(0, theme.a);
    gr.addColorStop(1, theme.b);
    g.fillStyle = gr;
    roundRect(g, 0, 0, t.w, t.h, 18);
    g.fill();
    const b = 7;
    g.fillStyle = mix(theme.cell,'#fff4de',.22);
    roundRect(g, b, b, t.w - b * 2, t.h - b * 2, 13);
    g.fill();
    g.save();
    roundRect(g, b, b, t.w - b * 2, t.h - b * 2, 13);
    g.clip();
    grain(g, b, b, t.w - b * 2, t.h - b * 2, { seed: 77, color: '#8a5a2a', alpha: 0.2, dir: t.vert ? 'v' : 'h', scale: 1.3 });
    const ish = g.createLinearGradient(0, b, 0, b + 14);
    ish.addColorStop(0, 'rgba(60,30,10,.35)');
    ish.addColorStop(1, 'rgba(60,30,10,0)');
    g.fillStyle = ish;
    g.fillRect(0, b, t.w, 14);
    g.restore();
    // перегородки
    g.fillStyle = '#7a4826';
    for (let i = 1; i < 3; i++) {
      if (t.vert) roundRect(g, b, (i * t.h) / 3 - 3, t.w - b * 2, 6, 3);
      else roundRect(g, (i * t.w) / 3 - 3, b, 6, t.h - b * 2, 3);
      g.fill();
    }
    return c;
  }

  cellRect(i) {
    const L = this.L;
    return { x: L.gx + (i % N) * L.cell, y: L.gy + Math.floor(i / N) * L.cell, s: L.cell };
  }
  cellAt(px, py) {
    const L = this.L;
    const x = Math.floor((px - L.gx) / L.cell), y = Math.floor((py - L.gy) / L.cell);
    if (x < 0 || y < 0 || x >= N || y >= N) return -1;
    return y * N + x;
  }
  slotAt(px, py) {
    const L = this.L;
    for (let i = 0; i < 3; i++) {
      const s = L.slots[i];
      if (px >= s.x && px <= s.x + s.w && py >= s.y && py <= s.y + s.h) return i;
    }
    return -1;
  }
  slotCenter(i) {
    const s = this.L.slots[i];
    return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
  }

  // ---------- кадр ----------
  draw(dt, st) {
    this.t += dt;
    const g = this.g, d = this.dpr, L = this.L;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.bg, 0, 0);
    g.setTransform(d, 0, 0, d, 0, 0);
    const motion=this.ambientOn !== false && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (motion) drawAnims(g, this.anims, this.t);
    if (this.sceneAnim && motion) drawAmbient(g, this.W, this.H, this.t, this.sceneAnim);
    else if (!this.sceneAnim && motion && this.mode === 'play') {
      // классика: отблески камина за кадром, тёплый свет слева мерцает
      const k = 0.1 + 0.035 * Math.sin(this.t * 6.1) + 0.025 * Math.sin(this.t * 10.7);
      const r = Math.max(this.W, this.H) * 0.8;
      const gr = g.createRadialGradient(0, this.H * 0.55, 0, 0, this.H * 0.55, r);
      gr.addColorStop(0, `rgba(255,150,60,${k})`);
      gr.addColorStop(1, 'rgba(255,150,60,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, this.W, this.H);
    }
    if (this.mode !== 'play' || !st || !st.game) return;
    const game = st.game;
    g.drawImage(this.boardImg, L.board.x - 20, L.board.y - 20, L.board.s + 40, L.board.s + 40);
    // подсветка будущих линий: бруски в них перекрашиваются в цвет фигуры
    const hl = st.preview && st.preview.lines;
    const hlSet = new Set();
    if (hl) {
      hl.rows.forEach((r) => { for (let c = 0; c < N; c++) hlSet.add(r * N + c); });
      hl.cols.forEach((c) => { for (let r = 0; r < N; r++) hlSet.add(r * N + c); });
    }
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 7);
    // бруски поля
    const now = this.t;
    for (let i = 0; i < N * N; i++) {
      const b = game.board[i];
      if (!b) continue;
      const r = this.cellRect(i);
      let k = 1;
      const pop = this.fx.pops.find((p) => p.i === i);
      if (pop) {
        const u = (now - pop.t0) / 0.22;
        k = u < 1 ? 0.75 + 0.25 * back(u) : 1;
      }
      const col = hlSet.has(i) ? st.preview.color : b.c;
      this.block(g, col, r.x + r.s / 2, r.y + r.s / 2, r.s * k, b.it);
      if (hlSet.has(i)) {
        g.fillStyle = `rgba(255,248,215,${0.18 + pulse * 0.2})`;
        roundRect(g, r.x + r.s * 0.05, r.y + r.s * 0.05, r.s * 0.9, r.s * 0.88, r.s * 0.16);
        g.fill();
      }
    }
    this.fx.pops = this.fx.pops.filter((p) => now - p.t0 < 0.3);
    // тень-призрак фигуры
    if (st.preview && st.preview.cells) {
      for (const i of st.preview.cells) {
        const r = this.cellRect(i);
        g.globalAlpha = 0.45;
        this.block(g, st.preview.color, r.x + r.s / 2, r.y + r.s / 2, r.s, null);
        g.globalAlpha = 1;
        g.strokeStyle = 'rgba(255,250,230,.9)';
        g.lineWidth = Math.max(2, r.s * 0.05);
        roundRect(g, r.x + r.s * 0.08, r.y + r.s * 0.08, r.s * 0.84, r.s * 0.82, r.s * 0.14);
        g.stroke();
      }
    }
    // подсказка: мигающий контур
    if (st.hint) {
      const a = 0.35 + 0.45 * pulse;
      for (const i of st.hint.cells) {
        const r = this.cellRect(i);
        g.strokeStyle = `rgba(255,236,120,${a})`;
        g.lineWidth = Math.max(3, r.s * 0.08);
        roundRect(g, r.x + r.s * 0.08, r.y + r.s * 0.08, r.s * 0.84, r.s * 0.84, r.s * 0.16);
        g.stroke();
        g.fillStyle = `rgba(255,236,120,${a * 0.35})`;
        g.fill();
      }
    }
    // молоток: подсветка блока под курсором
    if (st.hammer && st.hover >= 0 && game.board[st.hover]) {
      const r = this.cellRect(st.hover);
      g.strokeStyle = `rgba(255,90,60,${0.6 + 0.4 * pulse})`;
      g.lineWidth = Math.max(3, r.s * 0.09);
      roundRect(g, r.x + r.s * 0.04, r.y + r.s * 0.04, r.s * 0.92, r.s * 0.92, r.s * 0.18);
      g.stroke();
    }
    // затемнение «нет места»
    if (this.dim > 0) {
      g.fillStyle = `rgba(40,20,8,${this.dim * 0.45})`;
      roundRect(g, L.gx, L.gy, L.cell * N, L.cell * N, L.cell * 0.2);
      g.fill();
    }
    // лоток
    const t = L.tray;
    g.drawImage(this.trayImg, t.x - 15, t.y - 15, t.w + 30, t.h + 30);
    for (let s = 0; s < 3; s++) {
      const p = game.tray[s];
      if (!p) continue;
      if ((st.drag && st.drag.slot === s) || (st.ret && st.ret.slot === s)) continue;
      const c = this.slotCenter(s);
      const sh = SHAPE[p.s];
      const ok = st.fits ? st.fits[s] : true;
      let ts = this.trayCell(s, sh);
      let cy = c.y;
      const ap = st.appear && st.appear[s];
      let alpha = ok ? 1 : 0.38;
      if (ap) {
        const u = (now - ap) / 0.35;
        if (u < 1) {
          ts *= 0.4 + 0.6 * back(u);
          alpha *= Math.min(1, u * 2);
        }
      }
      if (st.selected === s) {
        cy -= 6;
        g.fillStyle = 'rgba(255,236,150,.45)';
        const sl = L.slots[s];
        roundRect(g, sl.x + 10, sl.y + 10, sl.w - 20, sl.h - 20, 14);
        g.fill();
      }
      if (st.hint && st.hint.slot === s) {
        const sl = L.slots[s];
        g.strokeStyle = `rgba(255,220,90,${0.4 + 0.5 * pulse})`;
        g.lineWidth = 4;
        roundRect(g, sl.x + 10, sl.y + 10, sl.w - 20, sl.h - 20, 14);
        g.stroke();
      }
      g.globalAlpha = alpha;
      this.piece(g, p, c.x, cy, ts);
      g.globalAlpha = 1;
    }
    // эффекты сбора
    this.drawFx(g, dt);
    // фигура в руке
    if (st.drag) {
      const p = game.tray[st.drag.slot];
      if (p) {
        const u = ease((now - st.drag.t0) / 0.12);
        const t0 = this.trayCell(st.drag.slot, SHAPE[p.s]);
        const ts = t0 + (L.cell * 0.98 - t0) * u;
        const x = st.drag.sx + (st.drag.cx - st.drag.sx) * u;
        const y = st.drag.sy + (st.drag.cy - st.drag.sy) * u;
        g.save();
        g.shadowColor = 'rgba(20,8,0,.45)';
        g.shadowBlur = 18;
        g.shadowOffsetY = 10;
        this.piece(g, p, x, y, ts);
        g.restore();
      }
    }
    // возврат фигуры в лоток
    if (st.ret) {
      const u = ease((now - st.ret.t0) / 0.18);
      const p = st.ret.p;
      const c = this.slotCenter(st.ret.slot);
      const t1 = this.trayCell(st.ret.slot, SHAPE[p.s]);
      const ts = L.cell * 0.98 + (t1 - L.cell * 0.98) * u;
      this.piece(g, p, st.ret.x + (c.x - st.ret.x) * u, st.ret.y + (c.y - st.ret.y) * u, ts);
    }
    this.drawTexts(g);
  }

  // размер клетки фигуры в лотке: маленькие фигуры крупнее, длинные — чтобы влезли
  trayCell(slot, sh) {
    const L = this.L, sl = L.slots[slot];
    return Math.min(L.cell * 0.64, (sl.w - 18) / Math.max(sh.w, 3.2), (sl.h - 18) / Math.max(sh.h, 3.2));
  }

  block(g, ci, cx, cy, s, it) {
    const img = blockSprite(this.style, ci, s * this.dpr);
    g.drawImage(img, cx - s / 2, cy - s / 2, s, s);
    if (it) {
      const is = s * 0.84;
      g.drawImage(itemSprite(it, is * this.dpr), cx - is / 2, cy - is / 2 - s * 0.02, is, is);
    }
  }

  piece(g, p, cx, cy, cs) {
    const sh = SHAPE[p.s];
    const x0 = cx - (sh.w * cs) / 2, y0 = cy - (sh.h * cs) / 2;
    sh.cells.forEach(([dx, dy], k) => {
      const it = p.it && p.it[0] === k ? p.it[1] : null;
      this.block(g, p.c, x0 + dx * cs + cs / 2, y0 + dy * cs + cs / 2, cs, it);
    });
  }

  // ---------- эффекты ----------
  addPops(cells) {
    for (const i of cells) this.fx.pops.push({ i, t0: this.t });
  }
  // разлетающиеся бруски собранных линий: волна от места установки
  addClear(cleared, origin) {
    const L = this.L;
    const ox = origin ? origin.x : L.gx + (L.cell * N) / 2, oy = origin ? origin.y : L.gy + (L.cell * N) / 2;
    for (const [i, c] of cleared) {
      const r = this.cellRect(i);
      const cx = r.x + r.s / 2, cy = r.y + r.s / 2;
      const dist = Math.hypot(cx - ox, cy - oy) / L.cell;
      const delay = dist * 0.035;
      this.fx.fly.push({ x: cx, y: cy, c, t0: this.t + delay, s: r.s });
      for (let k = 0; k < (this.effect&&this.effect!=='sparks'?2:4); k++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (60 + Math.random() * 160) * (L.cell / 50);
        this.fx.parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120 * (L.cell / 50), t0: this.t + delay, life: 0.7 + Math.random() * 0.4, c, size: L.cell * (this.effect&&this.effect!=='sparks'?.35:.1+Math.random()*.12), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, kind: this.effect&&this.effect!=='sparks'?'collectible':'chip',item:EFFECTS[this.effect]?.item });
      }
      if (Math.random() < 0.5) this.fx.parts.push({ x: cx + (Math.random() - 0.5) * r.s, y: cy + (Math.random() - 0.5) * r.s, vx: 0, vy: -30, t0: this.t + delay, life: 0.6, size: L.cell * 0.22, kind: 'spark' });
    }
  }
  addText(text, x, y, opts = {}) {
    this.fx.texts.push({ text, x, y, t0: this.t + (opts.delay || 0), size: opts.size || this.L.cell * 0.7, color: opts.color || '#fff6dc', dur: opts.dur || 1.1, rise: opts.rise ?? this.L.cell * 0.9, big: !!opts.big });
  }
  addItemFly(id, from, to, delay, onDone) {
    this.fx.items.push({ id, x0: from.x, y0: from.y, x1: to.x, y1: to.y, t0: this.t + delay, dur: 0.75, onDone, done: false });
  }

  drawFx(g, dt) {
    const now = this.t;
    const style = this.style;
    this.fx.fly = this.fx.fly.filter((f) => {
      const u = (now - f.t0) / 0.38;
      if (u < 0) {
        this.block(g, f.c, f.x, f.y, f.s, null);
        return true;
      }
      if (u >= 1) return false;
      const k = u < 0.25 ? 1 + u * 0.6 : 1.15 * (1 - ease((u - 0.25) / 0.75));
      g.save();
      g.translate(f.x, f.y);
      g.rotate(u * 0.6);
      g.globalAlpha = 1 - Math.max(0, u - 0.6) / 0.4;
      this.block(g, f.c, 0, 0, f.s * k, null);
      if (u < 0.3) {
        g.fillStyle = `rgba(255,255,240,${0.7 * (1 - u / 0.3)})`;
        roundRect(g, (-f.s * k) / 2, (-f.s * k) / 2, f.s * k, f.s * k, f.s * 0.18);
        g.fill();
      }
      g.restore();
      return true;
    });
    this.fx.parts = this.fx.parts.filter((p) => {
      const age = now - p.t0;
      if (age < 0) return true;
      if (age > p.life) return false;
      const u = age / p.life;
      if (p.kind === 'chip'||p.kind==='collectible') {
        p.vy += 520 * dt * (this.L.cell / 50);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.globalAlpha = 1 - u;
        g.fillStyle = (STYLES[style] || STYLES.painted).cols[p.c] || '#d9a868';
        if(p.kind==='collectible')g.drawImage(itemSprite(p.item,Math.max(16,p.size*this.dpr)),-p.size/2,-p.size/2,p.size,p.size);
        else g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        g.restore();
      } else {
        const s = p.size * Math.sin(u * Math.PI);
        p.y += p.vy * dt;
        g.save();
        g.translate(p.x, p.y);
        g.fillStyle = 'rgba(255,248,200,.95)';
        g.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2, rr = k % 2 ? s * 0.25 : s;
          k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(rr, 0);
        }
        g.fill();
        g.restore();
      }
      return true;
    });
    this.fx.items = this.fx.items.filter((f) => {
      const u = (now - f.t0) / f.dur;
      const s = this.L.cell * 0.7;
      if (u < 0) {
        g.drawImage(itemSprite(f.id, s * this.dpr), f.x0 - s / 2, f.y0 - s / 2, s, s);
        return true;
      }
      if (u >= 1) {
        if (!f.done) {
          f.done = true;
          f.onDone && f.onDone();
        }
        return false;
      }
      const e = ease(u);
      const x = f.x0 + (f.x1 - f.x0) * e;
      const y = f.y0 + (f.y1 - f.y0) * e - Math.sin(u * Math.PI) * this.L.cell * 2;
      const k = 1 + Math.sin(u * Math.PI) * 0.5 - u * 0.3;
      g.drawImage(itemSprite(f.id, s * k * this.dpr), x - (s * k) / 2, y - (s * k) / 2, s * k, s * k);
      return true;
    });
  }

  drawTexts(g) {
    const now = this.t;
    this.fx.texts = this.fx.texts.filter((t) => {
      const u = (now - t.t0) / t.dur;
      if (u < 0) return true;
      if (u >= 1) return false;
      const k = t.big ? (u < 0.2 ? back(u / 0.2) : 1) : 1;
      g.save();
      g.translate(t.x, t.y - ease(u) * t.rise);
      g.scale(k, k);
      g.globalAlpha = u > 0.75 ? 1 - (u - 0.75) / 0.25 : 1;
      g.font = `${t.big ? '400' : '900'} ${t.size}px ${t.big ? 'Kurale, Georgia, serif' : 'Nunito, sans-serif'}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = t.size * 0.2;
      g.strokeStyle = '#4a2410';
      g.strokeText(t.text, 0, 0);
      g.fillStyle = t.color;
      g.fillText(t.text, 0, 0);
      g.restore();
      return true;
    });
  }

  busy() {
    return this.fx.fly.length > 0 || this.fx.items.length > 0;
  }
}
