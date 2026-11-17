// Кэшируемые миниатюры: воздушная перспектива, группы разных масштабов и фактуры.
import { rng } from './core.js';
import { MATS } from './cosmetics.js';
const PALS={moscow:['#829fb5','#f4d9ba','#bd7255','#477d77'],spb:['#7d8ea9','#f5d3bd','#c5a886','#557e91'],paris:['#b78c9b','#ffe0b4','#c89477','#4d8580'],amsterdam:['#78a8bb','#f5dfbd','#a4614e','#467d84'],venice:['#b1a0b1','#ffe2b4','#d38d73','#4c9497'],rome:['#7babb8','#ffe1b5','#c78c60','#7d985e'],istanbul:['#796d98','#f6be9b','#ae867b','#4c7993'],cairo:['#99bac1','#ffe7b6','#cc9c67','#68a1a3'],kyoto:['#ada8b4','#ffe6d7','#b38774','#5d8b7a'],rio:['#79adba','#ecdfbd','#c2aa7c','#478f8d'],london:['#748da5','#e9d5b8','#ad9879','#557e84'],prague:['#a78c9b','#ffe2bb','#b87961','#6c8b85'],lisbon:['#82afba','#ffdfad','#d09a6c','#5b9392'],barcelona:['#939ab7','#ffe1b5','#dca073','#67877d'],vienna:['#9ca8b8','#f9e5c8','#c3ac8c','#779080'],marrakesh:['#9ea2bc','#ffdcad','#c78364','#698b7e'],newyork:['#7a899f','#f5d4b2','#ad9690','#557e8d'],singapore:['#8c9db4','#f8d9b8','#9faeac','#41877f'],sydney:['#82b7c1','#f8e8cb','#d9c9a7','#47989f'],santorini:['#7fb2c4','#ffdfbd','#f5e8da','#3989a6']};
export const SCENERY_IDS=Object.keys(PALS);
function grad(g,x,y,X,Y,colors){const a=g.createLinearGradient(x,y,X,Y);colors.forEach((c,i)=>a.addColorStop(i/(colors.length-1),c));return a;}
function poly(g,p,c){g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle=c;g.fill();}
function ell(g,x,y,rx,ry,c){g.beginPath();g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);g.fillStyle=c;g.fill();}
function block(g,x,y,w,h,front,roof='#6d7372',d=w*.23){
  poly(g,[[x+w,y-h],[x+w+d,y-h-d*.5],[x+w+d,y-d*.5],[x+w,y]],grad(g,x+w,y-h,x+w+d,y,[front,'#586368']));
  g.fillStyle=grad(g,x,y-h,x+w,y,[front,front,'#9d8c7c']);g.fillRect(x,y-h,w,h);
  poly(g,[[x,y-h],[x+d,y-h-d*.5],[x+w+d,y-h-d*.5],[x+w,y-h]],roof);
  g.fillStyle='rgba(255,246,211,.45)';g.fillRect(x,y-h,w,1.5);
  const cols=Math.max(1,Math.floor(w/13)),rows=Math.max(1,Math.floor(h/17));
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const wx=x+(c+.35)*w/cols,wy=y-h+(r+.26)*h/rows,ww=w/cols*.3,hh=h/rows*.4;g.fillStyle='#617580';g.fillRect(wx,wy,ww,hh);g.fillStyle='rgba(246,218,167,.7)';g.fillRect(wx+ww*.55,wy,ww*.4,hh);g.fillStyle='rgba(255,245,225,.55)';g.fillRect(wx-1,wy+hh,ww+2,1.2);}
  g.strokeStyle='rgba(90,67,51,.1)';g.lineWidth=.6;for(let yy=y-h+8;yy<y;yy+=8){g.beginPath();g.moveTo(x,yy);g.lineTo(x+w,yy);g.stroke();}
}
function tree(g,R,x,y,s,green){
  ell(g,x+s*.2,y+s*.04,s*.6,s*.12,'rgba(29,46,43,.17)');g.strokeStyle='#6c5948';g.lineWidth=s*.09;g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+s*.1,y-s*.4,x-s*.15,y-s*.7,x,y-s*1.1);g.stroke();
  for(let i=0;i<45;i++){
    const a=R()*Math.PI*2,r=Math.sqrt(R())*s*.46,xx=x+Math.cos(a)*r,yy=y-s*.85+Math.sin(a)*r*.75,rr=s*(.09+R()*.12);
    const leaf=g.createRadialGradient(xx-rr*.4,yy-rr*.5,rr*.1,xx,yy,rr);
    leaf.addColorStop(0,i%4===0?'#c4c68d':'#9eaf80');leaf.addColorStop(.4,i%3===0?'#869b72':green);leaf.addColorStop(1,'#4c6a58');
    ell(g,xx,yy,rr,rr*.85,leaf);
  }
}
function arch(g,x,y,w,h,c){g.beginPath();g.moveTo(x,y);g.lineTo(x,y-h+w*.5);g.arc(x+w*.5,y-h+w*.5,w*.5,Math.PI,0);g.lineTo(x+w,y);g.closePath();g.fillStyle=c;g.fill();}
function landmark(g,id,x,y,s){
  g.save();g.translate(x,y);g.scale(s,s);
  const b=(x,y,w,h,c='#d7c4a4',r)=>block(g,x,y,w,h,c,r);
  if(id==='london'){
    b(-9,0,18,66,'#c8ae7f','#6c7270');b(-11,-54,22,9,'#d3bc91');poly(g,[[-10,-67],[0,-84],[10,-67]],'#5c7975');b(-1,-83,2,9,'#7c8d85');ell(g,0,-48,6.5,6.5,'#fff3d3');g.strokeStyle='#665c4e';g.lineWidth=1;g.beginPath();g.moveTo(0,-53);g.lineTo(0,-48);g.lineTo(4,-46);g.stroke();b(12,0,30,24,'#c4aa80');
  }else if(id==='prague'){
    b(-35,0,70,22,'#c9ac8c','#bd715a');for(const xx of [-29,-12,22]){b(xx,-5,11,47,'#d4b797');poly(g,[[xx-2,-52],[xx+5.5,-70],[xx+13,-52]],'#5d8178');}arch(g,-7,0,14,19,'#657977');
  }else if(id==='lisbon'){
    for(let i=0;i<5;i++)b(-34+i*13,-i*3,13,24+i*4,['#ead4ae','#dca581','#c7d3c5'][i%3],'#b87d60');b(-21,13,33,14,'#ecc456','#e6e1c7');g.fillStyle='#5a7680';g.fillRect(-17,-9,25,6);for(const xx of [-15,6])ell(g,xx,15,3,3,'#5b5c58');
  }else if(id==='barcelona'){
    for(let i=0;i<6;i++){const xx=-30+i*11,hh=43+(i===2||i===3?19:i%2*9);b(xx,0,8,hh,'#d9b68c','#d9b68c');poly(g,[[xx,-hh],[xx+4,-hh-14],[xx+8,-hh]],'#b58d69');ell(g,xx+4,-hh-14,1.8,2.8,'#a7b2a4');}b(-28,0,61,22,'#d2ad85');arch(g,-7,0,14,21,'#7a8176');
  }else if(id==='vienna'){
    b(-40,0,80,30,'#ead9b7','#8d9a91');b(-15,0,30,43,'#f0dfbd','#8a9c91');poly(g,[[-19,-43],[0,-57],[19,-43]],'#b9b49a');for(let i=-31;i<=31;i+=12){g.fillStyle='#fff0cf';g.fillRect(i,-26,3,26);}ell(g,0,-60,6,6,'#839b8f');
  }else if(id==='marrakesh'){
    b(-7,0,14,65,'#ce956f','#98a38b');b(-5,-65,10,9,'#dab18d');poly(g,[[-5,-75],[0,-83],[5,-75]],'#a98460');b(-42,0,28,26,'#d49a7b');b(16,0,29,18,'#dcaa85');arch(g,-33,0,12,19,'#765b54');
  }else if(id==='newyork'){
    b(-34,0,20,45,'#b5af9d','#88959a');b(-10,0,22,70,'#c2bbaa','#89979b');b(-5,-70,12,10,'#d1c7b2');b(0,-80,3,14,'#8a9194');b(17,0,22,55,'#aaa99f','#788c95');
  }else if(id==='singapore'){
    for(const xx of [-31,-4,23])b(xx,0,11,45,'#b7cdc8','#8bada8');g.fillStyle='#c6d9ce';g.beginPath();g.ellipse(1,-47,44,6,-.06,0,Math.PI*2);g.fill();for(const xx of [-49,47]){g.strokeStyle='#698d80';g.lineWidth=2;g.beginPath();g.moveTo(xx,0);g.lineTo(xx,-23);g.stroke();ell(g,xx,-25,11,4,'#7c9f89');}
  }else if(id==='sydney'){
    poly(g,[[-45,0],[-34,-3],[42,-3],[50,4],[-45,4]],'#b7ac98');for(let i=0;i<4;i++){const xx=-37+i*20;g.beginPath();g.moveTo(xx,0);g.quadraticCurveTo(xx+4,-23-i%2*10,xx+22,-38-i%2*9);g.quadraticCurveTo(xx+27,-12,xx+19,0);g.fillStyle=grad(g,xx,-40,xx+24,0,['#fff2d5','#d7cbb3']);g.fill();g.strokeStyle='#b6b6a7';g.lineWidth=.7;g.stroke();}
  }else{
    for(let i=0;i<6;i++)b(-35+i*13,(i%3)*4,14,18+(i%3)*4,'#f6eee0','#deded2');b(-10,-13,21,23,'#fff3df','#d8e0dd');g.beginPath();g.arc(.5,-36,11,Math.PI,0);g.fillStyle='#5a9db2';g.fill();b(-1,-47,2,7,'#ddd8c8');
  }g.restore();
}
export function drawScenery(g,id,W,H,opts,landmarks){
  let P=PALS[id]||PALS.moscow;
  if(opts.variant===2)P=['#777492','#f3bfa7',P[2],'#537c8e'];
  if(opts.variant===3)P=['#c4aa8e','#fff0bd',P[2],P[3]];
  const R=rng(389+SCENERY_IDS.indexOf(id)*179),port=W/H<.9,s=Math.min(W,H)/100;
  const horizon=H*(port?.27:.48),water=['spb','amsterdam','venice','istanbul','rio','london','prague','lisbon','singapore','sydney','santorini'].includes(id);
  g.fillStyle=grad(g,0,0,0,horizon*1.5,[P[0],P[1],'#f6e9ce']);g.fillRect(0,0,W,H);
  const sun=g.createRadialGradient(W*.23,H*.14,0,W*.23,H*.14,s*27);sun.addColorStop(0,'rgba(255,240,200,.85)');sun.addColorStop(.3,'rgba(255,235,198,.28)');sun.addColorStop(1,'rgba(255,235,198,0)');g.fillStyle=sun;g.fillRect(0,0,W,horizon);ell(g,W*.23,H*.14,s*3,s*3,'#fff0c7');
  for(let layer=0;layer<3;layer++){const yy=horizon-s*(10-layer*4);g.beginPath();g.moveTo(0,horizon+40);for(let x=0;x<=W+10;x+=10)g.lineTo(x,yy-Math.sin(x/W*5+layer*2)*s*(4-layer));g.lineTo(W,horizon+40);g.closePath();g.fillStyle=['#c6c9bf','#b1beb1','#99ac9e'][layer];g.globalAlpha=.36+layer*.1;g.fill();g.globalAlpha=1;}
  for(let i=0;i<4;i++){g.globalAlpha=.12;ell(g,W*(.12+i*.25),horizon-s*10,s*15,s*2,'#fff7dc');}g.globalAlpha=1;
  // Две группы с просветами, разным масштабом и высотой, вместо сплошного ряда.
  for(const group of [{x:.07,y:-3,scale:.48,n:3},{x:.48,y:0,scale:.7,n:2}])for(let i=0;i<group.n;i++){const ss=s*group.scale;block(g,W*group.x+i*ss*12,horizon+ss*group.y,ss*(8+R()*4),ss*(12+R()*9),P[2],'#7c8d83');}
  const lx=opts.lmx??W*(port?.73:.78),ly=horizon+s*1.5;
  const bounds={moscow:[50,50],spb:[66,58],paris:[28,54],amsterdam:[50,42],venice:[64,57],rome:[58,28],istanbul:[70,50],cairo:[62,31],kyoto:[44,55],rio:[58,36],london:[65,94],prague:[90,76],lisbon:[88,60],barcelona:[82,90],vienna:[95,70],marrakesh:[95,90],newyork:[90,96],singapore:[110,60],sydney:[105,55],santorini:[100,60]}[id]||[90,90];
  const scale=Math.max(.1,Math.min(s*(port?.72:1.05),(ly-H*(port?.15:.08))/bounds[1],(W-lx-s*2)/(bounds[0]/2)));
  ell(g,lx+scale*4,ly+scale*2,scale*28,scale*3,'rgba(54,62,63,.14)');g.save();g.shadowColor='rgba(49,58,65,.16)';g.shadowBlur=s*1.3;g.shadowOffsetX=s*.8;g.shadowOffsetY=s*.3;
  const model=document.createElement('canvas');model.width=W;model.height=H;const mg=model.getContext('2d');
  if(landmarks[id])landmarks[id](mg,lx,ly,scale);else landmark(mg,id,lx,ly,scale);
  // Фасады получают направленный свет, кладку и мелкую фактуру на собственном слое.
  mg.globalCompositeOperation='source-atop';mg.fillStyle=grad(mg,lx-scale*35,ly-scale*60,lx+scale*35,ly,['rgba(255,237,184,.3)','rgba(255,255,255,0)','rgba(28,43,54,.23)']);mg.fillRect(0,0,W,H);
  mg.strokeStyle='rgba(74,57,48,.075)';mg.lineWidth=Math.max(.4,s*.12);
  for(let yy=Math.max(0,ly-scale*85),row=0;yy<ly+scale*2;yy+=scale*2,row++){
    mg.beginPath();mg.moveTo(lx-scale*55,yy);mg.lineTo(lx+scale*55,yy);mg.stroke();
    for(let xx=lx-scale*55+(row%2)*scale*2;xx<lx+scale*55;xx+=scale*4){mg.beginPath();mg.moveTo(xx,yy);mg.lineTo(xx,yy+scale*2);mg.stroke();}
  }
  for(let i=0;i<800;i++){mg.fillStyle=i%2?'rgba(255,245,214,.07)':'rgba(64,52,44,.04)';mg.fillRect(lx+(R()-.5)*scale*100,ly-R()*scale*85,s*.18,s*.22);}
  g.drawImage(model,0,0);g.restore();
  if(water){g.fillStyle=grad(g,0,horizon,0,H*.73,[P[3],'#8fa9a1','#b0bcb0']);g.fillRect(0,horizon+s*3,W,H*.55);for(let i=0;i<100;i++){const yy=horizon+s*(3+R()*15),xx=lx+(R()-.5)*s*43;g.strokeStyle=i%3?'rgba(248,222,183,.18)':'rgba(57,94,103,.14)';g.lineWidth=s*.3;g.beginPath();g.moveTo(xx,yy);g.lineTo(xx+s*(1+R()*6),yy);g.stroke();}}
  // Изогнутая набережная ведёт взгляд от переднего плана к городу.
  g.beginPath();g.moveTo(0,H*.66);g.bezierCurveTo(W*.12,H*.52,W*.52,H*.73,W,H*.57);g.lineTo(W,H);g.lineTo(0,H);g.closePath();g.fillStyle=grad(g,0,H*.6,0,H,['#d5c3a3','#9f8d71']);g.fill();g.strokeStyle='rgba(247,232,198,.8)';g.lineWidth=s*1.6;g.beginPath();g.moveTo(0,H*.66);g.bezierCurveTo(W*.12,H*.52,W*.52,H*.73,W,H*.57);g.stroke();
  g.save();g.beginPath();g.rect(0,H*.7,W,H*.3);g.clip();g.strokeStyle='rgba(97,80,62,.15)';g.lineWidth=Math.max(.6,s*.15);for(let i=-10;i<=10;i++){g.beginPath();g.moveTo(W*.55,H*.58);g.lineTo(W*.55+i*W*.14,H);g.stroke();}for(let t=.1;t<1;t+=.09){const y=H*.62+H*.38*t*t;g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}g.restore();
  // Асимметричные растения: крупная кулиса слева, малое кашпо справа.
  tree(g,R,W*.035,H*.69,s*21,id==='kyoto'?'#c893a2':'#65866b');tree(g,R,W*.14,H*.67,s*13,id==='kyoto'?'#dab0b2':'#819471');if(port)tree(g,R,W*1.03,H*.72,s*16,'#607e69');
  const px=W*.9,py=H*.91;ell(g,px+s,py+s*2,s*8,s*1.5,'rgba(47,49,40,.2)');poly(g,[[px-s*4,py-s*5],[px+s*4,py-s*5],[px+s*3,py+s],[px-s*3,py+s]],grad(g,px-s*4,py-s*5,px+s*4,py,['#c3916f','#805a47']));for(let i=0;i<9;i++)ell(g,px+Math.cos(i*.8)*s*4,py-s*6+Math.sin(i*.8)*s*2,s*2.3,s*1.1,i%2?'#789b7b':'#4f796b');
  for(let i=0;i<1700;i++){g.fillStyle=i%3?'rgba(255,245,218,.035)':'rgba(47,48,54,.025)';g.fillRect(R()*W,R()*H,1+R()*s*.25,1+R()*s*.16);}
  const v=g.createRadialGradient(W*.5,H*.45,Math.min(W,H)*.3,W*.5,H*.5,Math.max(W,H)*.8);v.addColorStop(0,'rgba(37,40,38,0)');v.addColorStop(1,'rgba(34,45,42,.28)');g.fillStyle=v;g.fillRect(0,0,W,H);
}
export function drawMat(g,b,id='felt'){
  const M=MATS[id]||MATS.felt,p=Math.min(20,b.w*.045),x=b.x-p,y=b.y-p,w=b.w+p*2,h=b.h+p*2,r=Math.min(26,w*.06),R=rng(211);
  g.save();g.shadowColor='rgba(29,35,29,.4)';g.shadowBlur=24;g.shadowOffsetY=14;g.beginPath();g.roundRect(x-5,y-5,w+10,h+12,r+4);g.fillStyle='#6e5240';g.fill();g.shadowBlur=0;g.shadowOffsetY=0;g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=grad(g,x,y,x+w,y+h,M.c);g.fill();g.clip();
  for(let i=0;i<650;i++){g.fillStyle=i%2?'rgba(255,255,255,.06)':'rgba(0,0,0,.04)';g.fillRect(x+R()*w,y+R()*h,M.texture==='linen'?2:.8,1+R()*3);}
  if(M.texture==='marble'){g.strokeStyle='rgba(96,104,106,.12)';g.lineWidth=1;for(let i=0;i<7;i++){g.beginPath();g.moveTo(x+R()*w,y);g.bezierCurveTo(x+R()*w,y+h*.3,x+R()*w,y+h*.6,x+R()*w,y+h);g.stroke();}}
  if(M.texture==='linen'){g.strokeStyle='rgba(255,255,255,.1)';g.lineWidth=.6;for(let xx=x;xx<x+w;xx+=5){g.beginPath();g.moveTo(xx,y);g.lineTo(xx,y+h);g.stroke();}}
  g.restore();g.save();g.beginPath();g.roundRect(x+6,y+6,w-12,h-12,Math.max(2,r-4));g.strokeStyle=M.accent;g.globalAlpha=.6;g.setLineDash([3,4]);g.lineWidth=1;g.stroke();g.restore();
}
