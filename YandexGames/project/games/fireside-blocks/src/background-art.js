// Изображения загружаются по обращению. Процедурные сцены остаются резервом.
const cache = new Map();
export function background(id, W, H) {
  const key = id === 'hearth' && H > W * 1.15 ? 'hearth-phone' : id;
  const url = window.__FB_ART__?.[key];
  if (!url) return null;
  if (!cache.has(key)) {
    const img = new Image();
    cache.set(key, img);
    img.onload = () => window.dispatchEvent(new Event('backgroundready'));
    img.src = url;
  }
  const img = cache.get(key);
  return img.complete && img.naturalWidth ? img : null;
}
export function paintBackground(g, W, H, id, img) {
  g.save();
  // Вид сверху можно повернуть вместе с телефоном: сохраняется весь декор по краям.
  if (id !== 'hearth' && H > W * 1.15) {
    g.translate(W, 0); g.rotate(Math.PI / 2);
    g.drawImage(img, 0, 0, H, W);
  } else g.drawImage(img, 0, 0, W, H);
  g.restore();
}
export function ambientArt(g, W, H, t, id, avoid = []) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const free = (x,y) => !avoid.some(r=>x>r.x-8&&x<r.x+(r.w??r.s)+8&&y>r.y-8&&y<r.y+(r.h??r.s)+8);
  g.save();
  if (id === 'hearth') {
    const portrait = H > W * 1.15;
    const x = W * (portrait ? .5 : .875), y = H * (portrait ? .16 : .54);
    const r = Math.min(W,H)*.46;
    const glow=g.createRadialGradient(x,y,0,x,y,r);
    const a=.08+.025*Math.sin(t*4.1)+.018*Math.sin(t*7.3);
    glow.addColorStop(0,`rgba(255,177,63,${a})`);glow.addColorStop(1,'rgba(255,170,50,0)');
    g.fillStyle=glow;g.fillRect(0,0,W,H);
    for(let i=0;i<8;i++){
      const life=(t*.18+i*.137)%1,px=x+Math.sin(i*5.7+t)*W*.025,py=y-life*H*.1;
      if(!free(px,py))continue;
      g.fillStyle=`rgba(255,220,133,${(1-life)*.6})`;g.beginPath();g.arc(px,py,1.2,0,Math.PI*2);g.fill();
    }
  } else {
    const snow=id==='winter',firefly=id==='forest'||id==='night';
    for(let i=0;i<(snow?24:12);i++){
      const side=i%2, x=(side?W*.94:W*.04)+Math.sin(t*.3+i*2.3)*W*.035;
      const y=((i*.173*H+t*(snow?12:5))%(H+24))-12;
      if(!free(x,y))continue;
      g.globalAlpha=firefly?.2+.55*Math.pow(Math.sin(t*.7+i),2):.45;
      g.fillStyle=snow?'#fff7ed':firefly?'#ffdf89':id==='autumn'?'#f2ac45':'#fff0ba';
      if(id==='autumn'){g.save();g.translate(x,y);g.rotate(t*.3+i);g.beginPath();g.ellipse(0,0,3,6,0,0,7);g.fill();g.restore();}
      else {g.beginPath();g.arc(x,y,snow?1.8:firefly?2.1:1.4,0,7);g.fill();}
    }
    if(id==='sea'){
      g.globalAlpha=.1+.04*Math.sin(t*.8);g.strokeStyle='#fff';g.lineWidth=3;
      g.beginPath();for(let x=0;x<=W;x+=12)g.lineTo(x,H*.075+Math.sin(x*.018+t*.6)*4);g.stroke();
    }
  }
  g.restore();
}
