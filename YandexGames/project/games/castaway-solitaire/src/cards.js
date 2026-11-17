// Рисование карт на canvas: лицо, рубашка, джокер, значки (замок, ключ, песок, монета). Кэш по размеру.
export const RANKS = ['★', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const RED = '#d8343f';
export const BLACK = '#262b40';
const FONT = 'Nunito, "Arial Rounded MT Bold", Arial, sans-serif';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// масти рисуем путями: 0 ♥, 1 ♦, 2 ♣, 3 ♠
export function suitPath(ctx, s, cx, cy, size) {
  const k = size / 2;
  ctx.beginPath();
  if (s === 0) {
    ctx.moveTo(cx, cy + k * 0.9);
    ctx.bezierCurveTo(cx - k * 1.25, cy + k * 0.05, cx - k * 0.95, cy - k * 1.0, cx, cy - k * 0.42);
    ctx.bezierCurveTo(cx + k * 0.95, cy - k * 1.0, cx + k * 1.25, cy + k * 0.05, cx, cy + k * 0.9);
  } else if (s === 1) {
    ctx.moveTo(cx, cy - k);
    ctx.quadraticCurveTo(cx + k * 0.35, cy - k * 0.3, cx + k * 0.78, cy);
    ctx.quadraticCurveTo(cx + k * 0.35, cy + k * 0.3, cx, cy + k);
    ctx.quadraticCurveTo(cx - k * 0.35, cy + k * 0.3, cx - k * 0.78, cy);
    ctx.quadraticCurveTo(cx - k * 0.35, cy - k * 0.3, cx, cy - k);
  } else if (s === 2) {
    const r = k * 0.42;
    ctx.arc(cx, cy - k * 0.45, r, 0, Math.PI * 2);
    ctx.moveTo(cx - k * 0.45 + r, cy + k * 0.12);
    ctx.arc(cx - k * 0.45, cy + k * 0.12, r, 0, Math.PI * 2);
    ctx.moveTo(cx + k * 0.45 + r, cy + k * 0.12);
    ctx.arc(cx + k * 0.45, cy + k * 0.12, r, 0, Math.PI * 2);
    // ножка рисуется по часовой, как и круги, иначе в месте пересечения получается дырка
    ctx.moveTo(cx + k * 0.1, cy);
    ctx.quadraticCurveTo(cx + k * 0.12, cy + k * 0.7, cx + k * 0.36, cy + k * 0.95);
    ctx.lineTo(cx - k * 0.36, cy + k * 0.95);
    ctx.quadraticCurveTo(cx - k * 0.12, cy + k * 0.7, cx - k * 0.1, cy);
  } else {
    ctx.moveTo(cx, cy - k);
    ctx.bezierCurveTo(cx + k * 0.3, cy - k * 0.55, cx + k * 1.2, cy - k * 0.1, cx + k * 0.75, cy + k * 0.42);
    ctx.bezierCurveTo(cx + k * 0.45, cy + k * 0.75, cx + k * 0.12, cy + k * 0.5, cx + k * 0.08, cy + k * 0.35);
    ctx.lineTo(cx + k * 0.32, cy + k * 0.95);
    ctx.lineTo(cx - k * 0.32, cy + k * 0.95);
    ctx.lineTo(cx - k * 0.08, cy + k * 0.35);
    ctx.bezierCurveTo(cx - k * 0.12, cy + k * 0.5, cx - k * 0.45, cy + k * 0.75, cx - k * 0.75, cy + k * 0.42);
    ctx.bezierCurveTo(cx - k * 1.2, cy - k * 0.1, cx - k * 0.3, cy - k * 0.55, cx, cy - k);
  }
  ctx.closePath();
}

function raisedSuit(ctx,s,cx,cy,size){
  ctx.save();
  const g=ctx.createLinearGradient(cx-size*.4,cy-size*.5,cx+size*.4,cy+size*.5);
  g.addColorStop(0,s<2?'#f7797d':'#69738e');
  g.addColorStop(.45,s<2?'#df3448':'#303b57');
  g.addColorStop(1,s<2?'#a61932':'#172137');
  suitPath(ctx,s,cx,cy,size);ctx.fillStyle=g;
  ctx.shadowColor=s<2?'#811d3840':'#13203945';ctx.shadowBlur=size*.035;ctx.shadowOffsetY=size*.025;ctx.fill();
  ctx.shadowColor='transparent';ctx.lineWidth=Math.max(.45,size*.012);ctx.strokeStyle=s<2?'#aa20394d':'#15203a55';ctx.stroke();ctx.restore();
}

export class CardArt {
  constructor() {
    this.cache = new Map();
    this.w = 0;
    this.dpr = 1;
  }
  setSize(w, dpr) {
    w = Math.round(w);
    if (w === this.w && dpr === this.dpr) return;
    this.w = w;
    this.h = Math.round(w * 1.4);
    this.dpr = dpr;
    this.cache.clear();
  }
  canvas(pad=0) {
    const c = document.createElement('canvas');
    c.width = Math.ceil((this.w+pad*2) * this.dpr);
    c.height = Math.ceil((this.h+pad*2) * this.dpr);
    const ctx = c.getContext('2d');
    ctx.scale(this.dpr, this.dpr);
    ctx.translate(pad,pad);
    return [c, ctx];
  }
  shadow(){
    if(this.cache.has('shadow'))return this.cache.get('shadow');
    const pad=this.w*.14+6,[c,ctx]=this.canvas(pad);
    ctx.fillStyle='#172c3a38';ctx.shadowColor='#0b233e70';ctx.shadowBlur=this.w*.085;ctx.shadowOffsetY=this.w*.055;
    rr(ctx,1,1,this.w-2,this.h-2,this.w*.1);ctx.fill();
    this.cache.set('shadow',c);return c;
  }
  base(ctx, fill, stroke = 'rgba(60,50,40,.28)') {
    const { w, h } = this;
    const r = w * 0.1,depth=Math.max(2,w*.035);
    const edge=ctx.createLinearGradient(0,h-depth*3,w,h);
    edge.addColorStop(0,'#ded1b7');edge.addColorStop(.5,'#b8a17c');edge.addColorStop(1,'#826d52');
    ctx.fillStyle=edge;rr(ctx,.5,depth,w-1,h-depth-.5,r);ctx.fill();
    ctx.fillStyle = fill;
    rr(ctx, 0.5, 0.5, w - 1, h - depth - 1, r);
    ctx.fill();
    ctx.lineWidth = Math.max(1, w * 0.018);
    ctx.strokeStyle = stroke;
    ctx.stroke();
    const bevel=ctx.createLinearGradient(0,0,w,h);
    bevel.addColorStop(0,'#ffffff');bevel.addColorStop(.45,'#ffffffb0');bevel.addColorStop(1,'#b7a38180');
    ctx.strokeStyle=bevel;ctx.lineWidth=Math.max(1,w*.017);
    rr(ctx,2,2,w-4,h-depth-4,Math.max(1,r-1));ctx.stroke();
    ctx.strokeStyle='#b9a98635';ctx.lineWidth=Math.max(.5,w*.006);
    rr(ctx,w*.045,w*.045,w*.91,h-depth-w*.09,r*.72);ctx.stroke();
  }
  face(rank, suit) {
    const key = 'f' + rank + '_' + suit;
    if (this.cache.has(key)) return this.cache.get(key);
    const [c, ctx] = this.canvas();
    const { w, h } = this;
    if (rank === 0) return this.wild();
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(.45, '#fffdf5');
    g.addColorStop(1, '#e9dfca');
    this.base(ctx, g);
    const col = suit < 2 ? RED : BLACK;
    ctx.fillStyle = col;
    const label = RANKS[rank];
    // крупный индекс слева сверху: виден, даже когда карта прикрыта
    const fs = w * (label === '10' ? 0.4 : 0.46);
    ctx.font = `900 ${fs}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const ix = w * 0.27;
    ctx.save();ctx.shadowColor='#5f4e3528';ctx.shadowOffsetY=w*.008;ctx.shadowBlur=w*.012;
    ctx.fillText(label, ix, w * 0.44);ctx.restore();
    raisedSuit(ctx,suit,w*.72,w*.27,w*.32);
    // центр: большая масть или буква для картинок
    if (rank >= 11) {
      // картинка: цветная рамка-«портрет», головной убор и крупная буква
      const px = w * 0.12, py = h * 0.37, pw = w * 0.76, ph = h * 0.56;
      const portrait=ctx.createLinearGradient(px,py,px+pw,py+ph);
      portrait.addColorStop(0,suit<2?'#fff0e8':'#f1f4ff');portrait.addColorStop(1,suit<2?'#eec8b8':'#bfcbe2');
      ctx.fillStyle = portrait;
      rr(ctx, px, py, pw, ph, w * 0.07);
      ctx.fill();
      ctx.lineWidth = w * 0.022;
      ctx.strokeStyle = suit < 2 ? 'rgba(216,52,63,.45)' : 'rgba(38,43,64,.35)';
      ctx.stroke();
      ctx.fillStyle = col;
      for (const [sx, sy] of [[px + w * 0.1, py + w * 0.1], [px + pw - w * 0.1, py + ph - w * 0.1]]) {
        suitPath(ctx, suit, sx, sy, w * 0.11);
        ctx.fill();
      }
      ctx.font = `900 ${w * 0.42}px ${FONT}`;
      ctx.fillText(label, w / 2, py + ph * 0.9);
      const cx = w / 2, cy = py + ph * 0.3, u = w * 0.1;
      ctx.lineJoin = 'round';
      ctx.lineWidth = w * 0.022;
      ctx.strokeStyle = '#b07a12';
      const gold=ctx.createLinearGradient(0,cy-u,0,cy+u);
      gold.addColorStop(0,'#fff4b4');gold.addColorStop(.4,'#ffcd4c');gold.addColorStop(1,'#c18416');ctx.fillStyle = gold;
      ctx.beginPath();
      if (rank === 13) {
        // корона короля
        ctx.moveTo(cx - 1.9 * u, cy + 0.9 * u);
        ctx.lineTo(cx - 2.1 * u, cy - 0.7 * u);
        ctx.lineTo(cx - 1 * u, cy + 0.1 * u);
        ctx.lineTo(cx, cy - 1.1 * u);
        ctx.lineTo(cx + 1 * u, cy + 0.1 * u);
        ctx.lineTo(cx + 2.1 * u, cy - 0.7 * u);
        ctx.lineTo(cx + 1.9 * u, cy + 0.9 * u);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff3c4';
        for (const [x, y] of [[-2.1, -0.7], [0, -1.1], [2.1, -0.7]]) {
          ctx.beginPath();
          ctx.arc(cx + x * u, cy + y * u, 0.28 * u, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.fillStyle = suit < 2 ? '#d8343f' : '#3a6fd8';
        ctx.beginPath();
        ctx.arc(cx, cy + 0.35 * u, 0.3 * u, 0, Math.PI * 2);
        ctx.fill();
      } else if (rank === 12) {
        // диадема королевы
        ctx.moveTo(cx - 2 * u, cy + 0.8 * u);
        ctx.quadraticCurveTo(cx - 1.6 * u, cy - 0.4 * u, cx, cy - 1 * u);
        ctx.quadraticCurveTo(cx + 1.6 * u, cy - 0.4 * u, cx + 2 * u, cy + 0.8 * u);
        ctx.quadraticCurveTo(cx, cy + 0.3 * u, cx - 2 * u, cy + 0.8 * u);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = suit < 2 ? '#d8343f' : '#3a6fd8';
        ctx.beginPath();
        ctx.ellipse(cx, cy - 0.15 * u, 0.32 * u, 0.42 * u, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff3c4';
        for (const x of [-1.15, 1.15]) {
          ctx.beginPath();
          ctx.arc(cx + x * u, cy + 0.15 * u, 0.2 * u, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // берет валета с пером
        ctx.fillStyle = suit < 2 ? '#d8343f' : '#3d4a7a';
        ctx.strokeStyle = suit < 2 ? '#8e1f28' : '#1f2640';
        ctx.ellipse(cx, cy + 0.4 * u, 2 * u, 0.9 * u, -0.08, Math.PI * 0.95, Math.PI * 2.05);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f5c03c';
        ctx.strokeStyle = '#b07a12';
        rr(ctx, cx - 1.9 * u, cy + 0.35 * u, 3.8 * u, 0.5 * u, 0.2 * u);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#7ed957';
        ctx.strokeStyle = '#3f9a36';
        ctx.beginPath();
        ctx.moveTo(cx + 0.9 * u, cy + 0.2 * u);
        ctx.quadraticCurveTo(cx + 2.6 * u, cy - 0.6 * u, cx + 2.4 * u, cy - 1.6 * u);
        ctx.quadraticCurveTo(cx + 1.4 * u, cy - 0.9 * u, cx + 0.9 * u, cy + 0.2 * u);
        ctx.fill();
        ctx.stroke();
      }
    } else {
      raisedSuit(ctx,suit,w/2,h*.66,w*.58);
    }
    this.cache.set(key, c);
    return c;
  }
  wild() {
    const key = 'wild';
    if (this.cache.has(key)) return this.cache.get(key);
    const [c, ctx] = this.canvas();
    const { w, h } = this;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#fff3c4');
    g.addColorStop(1, '#ffd36e');
    this.base(ctx, g, '#d39a22');
    // радуга-звезда
    const cols = ['#ff6b6b', '#ffb347', '#ffe066', '#7ed957', '#5ec8f2', '#a98bff'];
    cols.forEach((cc, i) => {
      ctx.fillStyle = cc;
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.58, w * (0.4 - i * 0.055), Math.PI, 0);
      ctx.fill();
    });
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.58, w * 0.08, Math.PI, 0);
    ctx.fill();
    star(ctx, w / 2, h * 0.3, w * 0.2, '#ffffff', '#d39a22', w * 0.03);
    ctx.fillStyle = '#9a6a12';
    ctx.font = `900 ${w * 0.16}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(this.wildLabel || 'WILD', w / 2, h * 0.82);
    this.cache.set(key, c);
    return c;
  }
  back() {
    const key = 'back';
    if (this.cache.has(key)) return this.cache.get(key);
    const [c, ctx] = this.canvas();
    const { w, h } = this;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, this.backColors?.[0] || '#2fb6c7');
    g.addColorStop(1, this.backColors?.[1] || '#1d86b0');
    this.base(ctx, '#ffffff');
    ctx.save();
    const m = w * 0.07;
    rr(ctx, m, m, w - m * 2, h - m * 2 - Math.max(2,w*.035), w * 0.06);
    ctx.clip();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const gloss=ctx.createLinearGradient(0,0,w,h);
    gloss.addColorStop(0,'#ffffff45');gloss.addColorStop(.45,'#ffffff00');gloss.addColorStop(1,'#061f422c');
    ctx.fillStyle=gloss;ctx.fillRect(0,0,w,h);
    // волны
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = w * 0.035;
    for (let y = h * 0.62; y < h; y += w * 0.13) {
      ctx.beginPath();
      for (let x = -w * 0.1; x <= w * 1.1; x += w * 0.05) {
        const yy = y + Math.sin((x / w) * Math.PI * 4) * w * 0.035;
        x <= -w * 0.1 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    if(this.backStyle && this.backStyle!=='sea') {
      const cx=w*.5,cy=h*.45,r=w*.29;
      ctx.strokeStyle='#ffe6aa';ctx.fillStyle='#ffe6aa';ctx.lineWidth=w*.018;
      ctx.beginPath();ctx.arc(cx,cy,r*1.15,0,Math.PI*2);ctx.stroke();
      if(this.backStyle==='royal') {
        // Brass compass rose on a captain's deck.
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4-Math.PI/2,rad=i%2?r*.65:r;
          ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad);
          ctx.lineTo(cx+Math.cos(a+.45)*r*.23,cy+Math.sin(a+.45)*r*.23);
          ctx.lineTo(cx,cy);ctx.closePath();ctx.fillStyle=i%2?'#d6b176':'#fff4c9';ctx.fill();
        }
        ctx.beginPath();ctx.arc(cx,cy,r*.13,0,Math.PI*2);ctx.fill();
      }else if(this.backStyle==='coral') {
        // A scallop shell with distinct radiating ribs.
        ctx.beginPath();ctx.moveTo(cx,cy+r*.7);ctx.arc(cx,cy,r,Math.PI,Math.PI*2);ctx.closePath();ctx.fill();
        ctx.strokeStyle='#b84767';
        for(let i=0;i<7;i++){const a=Math.PI+i*Math.PI/6;ctx.beginPath();ctx.moveTo(cx,cy+r*.55);ctx.lineTo(cx+Math.cos(a)*r*.88,cy+Math.sin(a)*r*.88);ctx.stroke();}
      }else{
        // A pair of palm leaves.
        for(const sign of [-1,1]){ctx.save();ctx.translate(cx,cy+r*.7);ctx.rotate(sign*.38);ctx.beginPath();ctx.ellipse(0,-r*.75,r*.34,r*.95,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#37785d';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-r*1.5);ctx.stroke();ctx.restore();}
      }
      ctx.restore();this.cache.set(key,c);return c;
    }
    // солнце и островок с пальмой
    ctx.fillStyle = '#ffd86b';
    ctx.beginPath();
    ctx.arc(w * 0.66, h * 0.3, w * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3dca0';
    ctx.beginPath();
    ctx.ellipse(w * 0.42, h * 0.6, w * 0.28, w * 0.07, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#8a6240';
    ctx.lineWidth = w * 0.045;
    ctx.beginPath();
    ctx.moveTo(w * 0.4, h * 0.58);
    ctx.quadraticCurveTo(w * 0.36, h * 0.44, w * 0.44, h * 0.34);
    ctx.stroke();
    ctx.fillStyle = '#4fbf55';
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (1.05 + i * 0.22);
      ctx.beginPath();
      ctx.ellipse(w * 0.44 + Math.cos(a) * w * 0.12, h * 0.34 + Math.sin(a) * w * 0.05 + w * 0.03, w * 0.13, w * 0.04, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    this.cache.set(key, c);
    return c;
  }
}

export function star(ctx, cx, cy, r, fill, stroke, lw = 2) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.48 : r;
    ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

// значки поверх карты
export function drawLock(ctx, cx, cy, s, open = false) {
  ctx.save();
  ctx.lineWidth = s * 0.16;
  ctx.strokeStyle = '#6b5a3a';
  ctx.beginPath();
  if (open) ctx.arc(cx + s * 0.18, cy - s * 0.12, s * 0.28, Math.PI, Math.PI * 1.9);
  else ctx.arc(cx, cy - s * 0.12, s * 0.28, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#f2b52f';
  rr(ctx, cx - s * 0.42, cy - s * 0.1, s * 0.84, s * 0.62, s * 0.12);
  ctx.fill();
  ctx.lineWidth = s * 0.07;
  ctx.strokeStyle = '#a8741a';
  ctx.stroke();
  ctx.fillStyle = '#6b4a12';
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.14, s * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - s * 0.035, cy + s * 0.14, s * 0.07, s * 0.18);
  ctx.restore();
}

export function drawKey(ctx, cx, cy, s, color = '#f2b52f') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.6);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#a8741a';
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.arc(-s * 0.3, 0, s * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-s * 0.1, -s * 0.07, s * 0.6, s * 0.14);
  ctx.strokeRect(-s * 0.1, -s * 0.07, s * 0.6, s * 0.14);
  ctx.fillRect(s * 0.3, 0, s * 0.1, s * 0.2);
  ctx.fillRect(s * 0.42, 0, s * 0.08, s * 0.15);
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath();
  ctx.arc(-s * 0.3, 0, s * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawCoin(ctx, cx, cy, r) {
  ctx.save();
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#fff2a8');
  g.addColorStop(1, '#f0b429');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = r * 0.16;
  ctx.strokeStyle = '#c98a10';
  ctx.stroke();
  ctx.fillStyle = '#c98a10';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
  ctx.lineWidth = r * 0.12;
  ctx.stroke();
  ctx.restore();
}

// куча песка, закрывающая нижнюю часть карты
export function drawSand(ctx, x, y, w, h, n) {
  ctx.save();
  const top = y + h * (n >= 3 ? 0.18 : n === 2 ? 0.34 : 0.52);
  const g = ctx.createLinearGradient(0, top, 0, y + h);
  g.addColorStop(0, '#f6e2a8');
  g.addColorStop(1, '#e2c27c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.02, y + h - w * 0.06);
  ctx.quadraticCurveTo(x + w * 0.05, top + h * 0.12, x + w * 0.3, top + h * 0.04);
  ctx.quadraticCurveTo(x + w * 0.5, top - h * 0.06, x + w * 0.72, top + h * 0.05);
  ctx.quadraticCurveTo(x + w * 0.96, top + h * 0.14, x + w * 0.98, y + h - w * 0.06);
  ctx.quadraticCurveTo(x + w * 0.98, y + h, x + w * 0.88, y + h);
  ctx.lineTo(x + w * 0.12, y + h);
  ctx.quadraticCurveTo(x + w * 0.02, y + h, x + w * 0.02, y + h - w * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,120,50,.35)';
  ctx.lineWidth = Math.max(1, w * 0.02);
  ctx.stroke();
  // песчинки и ракушка
  ctx.fillStyle = 'rgba(170,130,60,.45)';
  for (let i = 0; i < 9; i++) ctx.fillRect(x + w * (0.15 + ((i * 37) % 70) / 100), top + h * (0.15 + ((i * 53) % 50) / 100), w * 0.03, w * 0.03);
  ctx.fillStyle = '#f59ab5';
  ctx.beginPath();
  ctx.arc(x + w * 0.7, top + h * 0.2, w * 0.06, Math.PI, 0);
  ctx.fill();
  // счётчик
  const cx = x + w / 2;
  const cy = y + h * 0.78;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c99a48';
  ctx.lineWidth = w * 0.04;
  ctx.stroke();
  ctx.fillStyle = '#7a5520';
  ctx.font = `900 ${w * 0.24}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), cx, cy + w * 0.01);
  ctx.restore();
}

export { rr };
