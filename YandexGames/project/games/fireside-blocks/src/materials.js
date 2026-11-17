export const NEW_SKINS = ['stained','copper','marble','ceramic','denim','patchwork','cosmos','pearl','embroidery','rosewood','frost','bamboo','mosaic','honeycomb'];
export const BOARDS={
 walnut:{a:'#7a4826',b:'#4a2812',cell:'#d8b98a',price:0,pattern:'wood'},
 birch:{a:'#e5c99b',b:'#9f7449',cell:'#f3dfbe',price:450,pattern:'bamboo'},
 porcelain:{a:'#eef0e6',b:'#688da0',cell:'#d9e8e7',price:900,pattern:'ceramic'},
 jade:{a:'#4f9e8e',b:'#204f50',cell:'#d7e0b6',price:1200,pattern:'marble'},
 rose:{a:'#b76577',b:'#633750',cell:'#edc6bb',price:1400,pattern:'embroidery'},
 midnight:{a:'#343c67',b:'#151b32',cell:'#b7bfd4',price:1800,pattern:'cosmos'},
 honey:{a:'#d7a346',b:'#805121',cell:'#f1d79b',price:1700,pattern:'honeycomb'},
 glacier:{a:'#98ced7',b:'#476d8b',cell:'#d4e7ed',price:2200,pattern:'frost'},
};
export const EFFECTS={sparks:{item:'star',price:0},leaves:{item:'leaf',price:250},snow:{item:'snowflake',price:400},flowers:{item:'daisy',price:550},butterflies:{item:'butterfly',price:750},moons:{item:'moon',price:950}};

// Различимые материалы продолжают исходную Canvas-графику, без растровых подмен.
export function material(g,S,id,base){
 const line=(color,w)=>{g.strokeStyle=color;g.lineWidth=S*w;};
 g.save();
 if(id==='stained'||id==='mosaic'){
  const colors=id==='stained'?['#ffdc86','#8bd7bd','#a6b8eb','#ed98ad']:['#f4d9a7','#b9d1d1','#a0b581','#eaa47c'];
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){
   const u=S/4;g.fillStyle=colors[(x*3+y)%4];g.globalAlpha=.55;g.fillRect(x*u+S*.015,y*u+S*.015,u-S*.03,u-S*.03);
   g.globalAlpha=1;line(id==='stained'?'#705b3c':'#f3e2c8',.018);g.strokeRect(x*u,y*u,u,u);
  }
 }else if(id==='marble'||id==='pearl'||id==='rosewood'){
  for(let n=0;n<7;n++){line(id==='rosewood'?'#3f1d1b55':n%2?'#ffffff77':'#243c5044',n%3?.012:.025);g.beginPath();g.moveTo(-S*.1,n*S*.18);g.bezierCurveTo(S*.4,(n-1)*S*.18,S*.4,(n+2)*S*.18,S*1.1,(n+.5)*S*.18);g.stroke();}
 }else if(id==='copper'){
  for(let y=0;y<7;y++)for(let x=0;x<7;x++){
   const cx=(x+.5+(y%2)*.25)*S/7,cy=(y+.5)*S/7,r=S*.048;
   const d=g.createRadialGradient(cx-r*.4,cy-r*.45,r*.08,cx,cy,r);
   d.addColorStop(0,'#3e211a66');d.addColorStop(.55,'#794c3530');d.addColorStop(.85,'#ffe4a455');d.addColorStop(1,'#a1704544');
   g.fillStyle=d;g.beginPath();g.ellipse(cx,cy,r,r*.85,0,0,7);g.fill();
  }
 }else if(id==='denim'||id==='embroidery'||id==='patchwork'){
  if(id==='patchwork'){for(let y=0;y<3;y++)for(let x=0;x<3;x++){g.fillStyle=['#e4bc77','#8bc1bb','#dc9894','#b3a4cd'][(x+2*y)%4];g.globalAlpha=.7;g.fillRect(x*S/3,y*S/3,S/3,S/3);}g.globalAlpha=1;}
  line('#fff0d2bb',.018);g.setLineDash([S*.045,S*.035]);g.strokeRect(S*.17,S*.17,S*.66,S*.66);g.setLineDash([]);
  if(id==='embroidery'){g.translate(S/2,S/2);line('#fff4d5',.028);for(let n=0;n<8;n++){g.rotate(Math.PI/4);g.beginPath();g.ellipse(0,-S*.14,S*.045,S*.12,0,0,7);g.stroke();}}
  else {line('#ffffff22',.008);for(let y=0;y<S;y+=S*.045){g.beginPath();g.moveTo(0,y);g.lineTo(S,y-S*.15);g.stroke();}}
 }else if(id==='cosmos'){
  line('#efda8fcc',.012);g.beginPath();g.moveTo(S*.2,S*.7);g.lineTo(S*.37,S*.27);g.lineTo(S*.75,S*.4);g.lineTo(S*.63,S*.8);g.stroke();
  g.fillStyle='#fff0a7';for(const[x,y]of[[.2,.7],[.37,.27],[.75,.4],[.63,.8]]){g.beginPath();g.arc(x*S,y*S,S*.026,0,7);g.fill();}
 }else if(id==='bamboo'){
  line('#233e2255',.025);for(let x=0;x<S;x+=S*.17){g.beginPath();g.moveTo(x,0);g.lineTo(x,S);g.stroke();}line('#fbefbd88',.03);for(const y of [.25,.7]){g.beginPath();g.moveTo(0,y*S);g.lineTo(S,y*S);g.stroke();}
 }else if(id==='honeycomb'){
  line('#fff2b888',.025);const r=S*.14;for(let y=0;y<5;y++)for(let x=0;x<5;x++){g.beginPath();for(let n=0;n<6;n++){const a=n*Math.PI/3,xx=(x*.24+(y%2)*.12)*S+Math.cos(a)*r,yy=y*.21*S+Math.sin(a)*r;n?g.lineTo(xx,yy):g.moveTo(xx,yy);}g.closePath();g.stroke();}
 }else if(id==='frost'){
  line('#ffffffaa',.018);for(let n=0;n<6;n++){g.save();g.translate(S/2,S/2);g.rotate(n*Math.PI/3);g.beginPath();g.moveTo(0,0);g.lineTo(0,-S*.34);g.moveTo(-S*.08,-S*.22);g.lineTo(0,-S*.15);g.lineTo(S*.08,-S*.22);g.stroke();g.restore();}
 }else if(id==='ceramic'){
  line('#fff5d8bb',.025);g.strokeRect(S*.18,S*.18,S*.64,S*.64);g.beginPath();g.arc(S*.5,S*.5,S*.18,0,7);g.stroke();
 }
 g.restore();
}
