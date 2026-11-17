// Classical signs in jade, enamel and brass. Exact counts and Hanzi paths stay deterministic.
// В углу у мастей крупная цифра: так плитки легче различать на телефоне.
import { HANZI } from './hanzi.js';

// порядок появления повторяет FACE_ORDER: первыми идут самые непохожие плитки
export const CLASSIC_ORDER = ['dr', 'c5', 'b3', 'm1', 'E', 'c2', 'b7', 'm6', 'S', 'c8', 'b5', 'm3', 'W', 'c4', 'b2', 'm9', 'N', 'c7', 'b9', 'm4', 'c3', 'b1', 'm7', 'c9', 'b6', 'm2', 'c6', 'b4', 'm8', 'c1', 'b8', 'm5'];
const NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const WIND = { E: '東', S: '南', W: '西', N: '北' };
const paths = {};
const P = (ch) => paths[ch] || (paths[ch] = new Path2D(HANZI[ch]));

// иероглиф в прямоугольнике (x, y, размер em)
function glyph(g,ch,x,y,size,fill){
  g.save();g.translate(x,y);g.scale(size/100,size/100);
  const lacquer=g.createLinearGradient(10,0,80,100);lacquer.addColorStop(0,fill);lacquer.addColorStop(.36,fill);lacquer.addColorStop(.6,fill==='#a63f32'?'#c5654a':'#416b64');lacquer.addColorStop(1,fill);
  g.shadowColor='rgba(75,54,26,.3)';g.shadowOffsetY=1.5;g.shadowBlur=1;g.strokeStyle='#bda26b';g.lineWidth=2.2;g.lineJoin='round';g.stroke(P(ch));g.fillStyle=lacquer;g.fill(P(ch));g.shadowBlur=0;g.shadowOffsetY=0;g.restore();
}

// маленькая цифра-индекс в углу
function corner(g,n,color){
  g.save();g.font='bold 20px Georgia,serif';g.textAlign='center';g.textBaseline='middle';g.lineWidth=2.4;g.strokeStyle='#fff7e4';g.lineJoin='round';g.strokeText(String(n),11,12);g.fillStyle=color;g.fillText(String(n),11,12);g.restore();
}

// ---------- точки ----------
const DOT_COLORS={b:['#82b0c9','#234e73'],g:['#8fbaa0','#28604d'],r:['#e2a17b','#963e32']};
function dot(g,x,y,r,c){
 const [light,dark]=DOT_COLORS[c],rim=g.createLinearGradient(x-r,y-r,x+r,y+r);rim.addColorStop(0,'#f7e4a7');rim.addColorStop(.45,'#ae9052');rim.addColorStop(1,'#d6bc79');
 g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=rim;g.fill();g.strokeStyle='#927746';g.lineWidth=Math.max(.45,r*.055);g.stroke();
 const glass=g.createRadialGradient(x-r*.35,y-r*.4,.2,x,y,r);glass.addColorStop(0,light);glass.addColorStop(.5,dark);glass.addColorStop(1,dark);g.beginPath();g.arc(x,y,r*.79,0,Math.PI*2);g.fillStyle=glass;g.fill();
 g.beginPath();g.arc(x,y,r*.49,0,Math.PI*2);g.lineWidth=Math.max(.5,r*.09);g.strokeStyle='#d9c387';g.stroke();
 g.beginPath();g.arc(x,y,r*.19,0,Math.PI*2);g.fillStyle='#eedaa4';g.fill();g.beginPath();g.arc(x-r*.22,y-r*.28,r*.14,0,Math.PI*2);g.fillStyle='rgba(255,255,245,.66)';g.fill();
}
function dots(g, n) {
  const L = [];
  const add = (pts, r, c) => pts.forEach(([x, y], k) => L.push([x, y, r, typeof c === 'string' ? c : c[k]]));
  if (n === 1) {
    dot(g, 50, 52, 30, 'r');
    dot(g, 50, 52, 14, 'g');
    return;
  }
  if (n === 2) add([[50, 30], [50, 72]], 17, ['g', 'b']);
  if (n === 3) add([[26, 24], [50, 51], [74, 78]], 14, ['b', 'r', 'g']);
  if (n === 4) add([[30, 30], [70, 30], [30, 72], [70, 72]], 15, ['b', 'g', 'g', 'b']);
  if (n === 5) add([[28, 27], [72, 27], [50, 51], [28, 75], [72, 75]], 13.5, ['b', 'g', 'r', 'g', 'b']);
  if (n === 6) add([[32, 22], [68, 22], [32, 52], [68, 52], [32, 80], [68, 80]], 12.5, ['g', 'g', 'r', 'r', 'r', 'r']);
  if (n === 7) add([[24, 16], [50, 28], [76, 40], [32, 62], [68, 62], [32, 86], [68, 86]], 10.5, ['g', 'g', 'g', 'r', 'r', 'r', 'r']);
  if (n === 8) add([[32, 14], [68, 14], [32, 38], [68, 38], [32, 62], [68, 62], [32, 86], [68, 86]], 10.5, 'b');
  if (n === 9) add([[22, 22], [50, 22], [78, 22], [22, 52], [50, 52], [78, 52], [22, 82], [50, 82], [78, 82]], 11, ['b', 'b', 'b', 'r', 'r', 'r', 'g', 'g', 'g']);
  for (const [x, y, r, c] of L) dot(g, x, y, r, c);
}

// ---------- бамбук ----------
function stick(g,x,y,h,c='g'){
 const col=c==='r'?['#db9472','#9c4435']:c==='b'?['#79aac0','#315779']:['#96c1a1','#2e634d'],w=11;
 g.beginPath();g.roundRect(x-w/2,y-h/2,w,h,3);const gr=g.createLinearGradient(x-w/2,0,x+w/2,0);gr.addColorStop(0,col[1]);gr.addColorStop(.35,col[0]);gr.addColorStop(.7,col[1]);gr.addColorStop(1,col[1]);g.fillStyle=gr;g.fill();g.strokeStyle='#8d9365';g.lineWidth=.85;g.stroke();
 g.strokeStyle='#d4bd83';g.lineWidth=1.2;for(const yy of [y-h*.32,y,y+h*.32]){g.beginPath();g.moveTo(x-w*.55,yy);g.quadraticCurveTo(x,yy+1.3,x+w*.55,yy);g.stroke();}
 g.strokeStyle='rgba(255,255,232,.55)';g.lineWidth=.7;g.beginPath();g.moveTo(x-w*.18,y-h*.42);g.lineTo(x-w*.18,y+h*.42);g.stroke();
}
function bamboo(g, n) {
  if (n === 1) {
    // один толстый стебель с листьями
    g.save();
    g.translate(50, 52);
    for (const [a, l] of [[-0.9, 30], [0.8, 28], [-2.3, 24], [2.2, 26]]) {
      g.save();
      g.rotate(a);
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(l * 0.5, -9, l, 0);
      g.quadraticCurveTo(l * 0.5, 9, 0, 0);
      g.fillStyle = '#6b9871';
      g.fill();
      g.lineWidth = 1.2;
      g.strokeStyle = '#a18e58';
      g.stroke();
      g.restore();
    }
    g.restore();
    g.save();
    g.translate(50, 52);
    g.scale(1.9, 1.05);
    stick(g, 0, 0, 72, 'g');
    g.restore();
    return;
  }
  const H = 36;
  const rows = {
    2: [[[50, 30, 'b']], [[50, 74, 'g']]],
    3: [[[50, 28, 'b']], [[34, 74, 'g'], [66, 74, 'g']]],
    4: [[[34, 30, 'b'], [66, 30, 'g']], [[34, 74, 'g'], [66, 74, 'b']]],
    5: [[[28, 30, 'g'], [72, 30, 'b']], [[50, 52, 'r']], [[28, 74, 'b'], [72, 74, 'g']]],
    6: [[[26, 30, 'g'], [50, 30, 'g'], [74, 30, 'g']], [[26, 74, 'b'], [50, 74, 'b'], [74, 74, 'b']]],
    7: [[[50, 18, 'r']], [[26, 52, 'g'], [50, 52, 'b'], [74, 52, 'g']], [[26, 84, 'g'], [50, 84, 'b'], [74, 84, 'g']]],
    8: [[[20, 30, 'g'], [40, 30, 'g'], [60, 30, 'g'], [80, 30, 'g']], [[20, 74, 'b'], [40, 74, 'b'], [60, 74, 'b'], [80, 74, 'b']]],
    9: [[[26, 18, 'r'], [50, 18, 'b'], [74, 18, 'g']], [[26, 52, 'r'], [50, 52, 'b'], [74, 52, 'g']], [[26, 86, 'r'], [50, 86, 'b'], [74, 86, 'g']]],
  }[n];
  const h = n === 7 || n === 9 ? 27 : n === 5 ? 25 : n === 8 ? 38 : H + 4;
  for (const row of rows) for (const [x, y, c] of row) stick(g, x, y, h, c);
}

// ---------- знаки (цифра + 萬) ----------
function chars(g, n) {
  glyph(g, NUM[n - 1], 27, -2, 46, '#254f4b');
  glyph(g, '萬', 21, 42, 58, '#a63f32');
}

function seal(g){
  const glow=g.createRadialGradient(40,37,4,50,50,44);glow.addColorStop(0,'rgba(255,252,233,.45)');glow.addColorStop(1,'rgba(190,158,91,.1)');g.beginPath();g.arc(50,50,43,0,Math.PI*2);g.fillStyle=glow;g.fill();g.lineWidth=1.15;g.strokeStyle='#c6ac70';g.stroke();g.beginPath();g.arc(50,50,39.5,0,Math.PI*2);g.lineWidth=.65;g.strokeStyle='#dbc794';g.stroke();
  for(let i=0;i<8;i++){const a=i*Math.PI/4;g.beginPath();g.moveTo(50+Math.cos(a)*40,50+Math.sin(a)*40);g.lineTo(50+Math.cos(a)*43,50+Math.sin(a)*43);g.stroke();}
}

export function drawClassic(g, id) {
  const s = id[0], n = +id.slice(1);
  if (id === 'dr') {
    seal(g);glyph(g, '中', 13, 13, 74, '#a63f32');
    return;
  }
  if (WIND[id]) {
    seal(g);glyph(g, WIND[id], 13, 13, 74, '#254f4b');
    return;
  }
  if (s === 'm') chars(g, n);
  else {
    // масть чуть уменьшена, чтобы цифра в углу ничего не закрывала
    g.save();
    g.translate(11, 9);
    g.scale(0.87, 0.87);
    if (s === 'c') dots(g, n);
    else bamboo(g, n);
    g.restore();
  }
  corner(g, n, s === 'c' ? '#315779' : s === 'b' ? '#2e634d' : '#a63f32');
}

export const CLASSIC_COLOR = { c: '#4a9ae8', b: '#5cc06a', m: '#e0463a', d: '#e0463a', E: '#4a5a8a', S: '#4a5a8a', W: '#4a5a8a', N: '#4a5a8a' };
