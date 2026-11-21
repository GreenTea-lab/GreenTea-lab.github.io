import {Vox, jitter} from './vox.js';
import {C} from './models.js';

const linen=0xffe6b5, coral=0xe87260, blue=0x54aeb0, navy=0x335e76, gold=0xe2aa52;
const clay=0xbb644a, basalt=0x637679, silver=0xb6c9bd, plum=0xae73b3, oak=0xdca374;
const timber=(x,y,z)=>jitter(z%3===0?C.woodD:C.woodL,x,y,z,.055);
const brass=(x,y,z)=>jitter(y%3===0?0xa77445:gold,x,y,z,.05);
const leg=(v,x,z,height)=>v.box(x,0,z,x+1,height,z+1,C.woodD);

function pot(v,r=4){
  v.cyl(0,0,r-1,0,1,clay).cyl(0,0,r,2,3,clay)
    .cyl(0,0,r+.5,4,4,linen,true).cyl(0,0,r-1,4,4,C.soilD);
}

function blooms(v,x,y,z,shade){
  v.set(x,y,z,gold);
  for(const [dx,dz] of [[0,-1],[-1,0],[1,0],[0,1]])v.set(x+dx,y,z+dz,shade);
  v.set(x,y-1,z+1,shade);
}

export function monstera(){
  const v=new Vox();
  pot(v,4);
  for(const [x,z,h] of [[-3,0,11],[2,-2,13],[2,3,10]]){
    for(let y=4;y<=h;y++)v.set(Math.round(x*(y-4)/(h-4)),y,Math.round(z*(y-4)/(h-4)),C.frondD);
    v.cyl(x,z,3,h,h,(xx,y,zz)=>xx===x?C.frondL:(xx+zz)%3?C.frond:0x438d61);
    v.set(x-2,h,z+1,null).set(x+2,h,z-1,null).set(x,h+1,z,C.grassL);
  }
  return v;
}

export function orchids(){
  const v=new Vox();
  pot(v,3);
  for(const [x,h,z] of [[-2,10,-1],[0,14,1],[2,11,0]]){
    v.box(x,4,z,x,h,z,C.frondD);
    v.box(x-1,6,z+1,x+1,6,z+1,C.frondL);
    blooms(v,x,h,z,x%2?0xfaadb8:plum);
    v.set(x,h+1,z,0xffcbe6);
  }
  return v;
}

export function strelitzia(){
  const v=new Vox();
  for(const [x,z,h] of [[-2,0,8],[1,-2,12],[3,2,10]]){
    v.box(x,0,z,x,h,z,C.frondD);
    for(let i=0;i<4;i++)v.box(x-i,3+i,z-1,x-i,3+i,z+1,i%2?C.frond:C.frondL);
    v.box(x, h,z,x+3,h,z,navy);
    for(let i=0;i<4;i++)v.set(x+i,h+i,z,i===3?linen:i%2?gold:coral);
  }
  return v;
}

export function bananaTree(){
  const v=new Vox();
  v.cyl(0,0,2,0,0,C.soilD);
  for(let y=1;y<17;y++)v.cyl(y>=12?1:0,0,1,y,y,y%3?0x92a853:0x707b49);
  for(let s=0;s<6;s++){
    const a=s*Math.PI/3;
    for(let i=0;i<9;i++){
      const x=1+Math.sin(a)*i,z=Math.cos(a)*i,y=16+Math.round(Math.sin(i*.42)*2-i*.3);
      v.set(x,y,z,C.frondL).set(x+Math.cos(a),y,z-Math.sin(a),C.frond).set(x-Math.cos(a),y,z+Math.sin(a),C.frondD);
    }
  }
  v.box(0,12,1,2,13,2,gold).box(1,11,1,2,11,3,0xffcf64);
  return v;
}

export function lotusPlanter(){
  const v=new Vox();
  v.cyl(0,0,5,0,1,basalt).cyl(0,0,5,2,3,silver,true).cyl(0,0,4,2,2,blue);
  for(const [x,z,c] of [[-2,1,coral],[2,-1,0xfcaae2]]){
    v.cyl(x,z,1.6,3,3,C.frond);
    blooms(v,x,4,z,c);
    v.set(x,5,z,linen);
  }
  v.set(0,3,-2,0xa5e7db);
  return v;
}

export function beachParasol(shade){
  const v=new Vox();
  v.cyl(0,-2,2,0,0,basalt);
  v.box(0,1,-2,0,11,-2,C.woodD);
  v.box(-4,0,2,4,0,6,(x,y,z)=>z%2?linen:shade);
  for(let ring=0;ring<4;ring++){
    const r=6-ring*1.6;
    v.cyl(0,-2,r,9+ring,9+ring,(x,y,z)=>Math.floor((Math.atan2(x,z+2)+Math.PI)*4/Math.PI)%2?shade:linen,ring<3);
  }
  for(const [x,z] of [[0,4],[5,1],[-5,1],[0,-8]])v.set(x,8,z,linen);
  return v;
}

export function surfRack(){
  const v=new Vox();
  for(const x of [-5,4])leg(v,x,-2,8);
  v.box(-6,5,-1,6,5,0,C.woodD);
  for(const [x,c,tilt] of [[-4,coral,0],[0,blue,1],[4,gold,2]]){
    for(let y=0;y<13-tilt;y++){
      const half=y===0||y>=10-tilt?0:1,z=2-Math.floor(y/5);
      v.box(x-half,y,z,x+half,y,z,(xx)=>xx===x&&y>2&&y<9?linen:c);
    }
  }
  return v;
}

export function shoreCanoe(){
  const v=new Vox();
  for(let z=-10;z<=10;z++){
    const w=Math.round(3*Math.cos(z*Math.PI/22));
    v.box(-w,1,z,w,1,z,blue);
    v.set(-w,2,z,navy).set(w,2,z,navy);
    v.set(-w,3,z,linen).set(w,3,z,linen);
  }
  for(const z of [-5,4])v.box(-3,0,z,3,0,z,C.woodD).box(-2,2,z,2,2,z,oak);
  v.box(-1,4,-6,1,4,-3,C.woodL).box(1,3,-3,1,3,7,C.woodD);
  return v;
}


export function sandCastle(){
  const v=new Vox();
  v.cyl(0,0,6,0,0,C.sandW).box(-4,1,-3,4,3,3,C.sandD);
  for(const [x,z] of [[-4,-3],[-4,3],[4,-3],[4,3]]){
    v.cyl(x,z,2,1,5,C.sandD).cyl(x,z,1.5,6,6,linen,true);
    v.set(x,7,z,C.sand);
  }
  v.box(-1,1,3,1,2,3,0xa27c58).cyl(0,0,2,4,6,C.sand);
  v.box(0,7,0,0,11,0,C.woodD).box(1,9,0,3,11,0,blue);
  v.set(2,10,0,linen);
  return v;
}

export function lifesaver(){
  const v=new Vox();
  v.box(-2,0,-1,2,0,1,basalt);
  v.box(0,1,0,0,11,0,C.woodD);
  for(let x=-4;x<=4;x++)for(let y=-4;y<=4;y++){
    const r=x*x+y*y;
    if(r>=8&&r<=22)v.set(x,y+8,1,(Math.abs(x)<=1||Math.abs(y)<=1)?coral:linen);
  }
  v.box(-3,3,-1,3,4,-1,navy).set(0,12,0,gold);
  return v;
}

export function teaTable(){
  const v=new Vox();
  for(const [x,z] of [[-4,-4],[4,-4],[-4,4],[4,4]])leg(v,x,z,4);
  v.cyl(0,0,6,5,5,timber);
  v.box(-1,5,-5,1,5,5,blue);
  v.cyl(1,-1,2,6,7,0x88b6af).cyl(1,-1,1,8,8,gold)
    .set(-1,7,-1,blue).set(3,7,-1,blue);
  for(const [x,z] of [[-3,2],[3,2]])v.cyl(x,z,1,6,6,linen).set(x,7,z,0xca8f62);
  return v;
}

export function hammock(){
  const v=new Vox();
  for(const x of [-8,7]){
    v.box(x,0,0,x+1,12,1,C.trunkD);
    v.box(x,10,-1,x+1,11,2,C.rope);
    v.set(x,13,0,brass(x,13,0));
  }
  for(let x=-7;x<=7;x++){
    const y=5+Math.round(x*x/10);
    v.box(x,y,-2,x,y,3,(x,y,z)=>z%3?linen:coral);
    v.set(x,y,-3,blue).set(x,y,4,blue);
  }
  return v;
}

export function pergola(){
  const v=new Vox();
  for(const [x,z] of [[-7,-5],[6,-5],[-7,4],[6,4]])leg(v,x,z,13);
  for(const x of [-7,6])v.box(x,14,-6,x+1,14,6,C.woodD);
  for(const z of [-5,-3,-1,1,3,5])v.box(-8,15,z,8,15,z,C.woodL);
  for(let i=0;i<9;i++){
    const x=-7+Math.floor(i*.62),y=7+i,z=-4+Math.floor(i/3);
    v.set(x,y,z,C.frondD).set(x+1,y,z,C.frond).set(x,y+1,z+1,C.frondL);
    if(i%3===0)v.set(x+1,y+1,z,plum);
  }
  v.box(-6,4,-4,5,4,-2,timber).box(-6,0,-4,-5,3,-3,C.woodD).box(4,0,-4,5,3,-3,C.woodD);
  return v;
}

export function picnic(){
  const v=new Vox();
  v.box(-6,0,-5,6,0,5,(x,y,z)=>(Math.floor((x+6)/2)+Math.floor((z+5)/2))%2?coral:linen);
  v.box(1,1,-3,4,2,-1,clay).box(1,2,-3,4,2,-1,oak);
  v.box(2,3,-2,3,3,-2,gold).box(-4,1,-2,-2,1,0,navy).set(-3,2,-1,linen);
  v.cyl(0,2,1.7,1,1,linen).set(0,2,2,coral).set(1,2,2,gold);
  return v;
}

export function flowerCart(){
  const v=new Vox();
  v.box(-6,3,-3,5,4,3,timber);
  v.box(-6,4,-3,5,6,-3,clay).box(-6,4,3,5,6,3,clay);
  for(const z of [-4,4])for(let x=-3;x<=3;x++)for(let y=0;y<=6;y++){
    const rr=x*x+(y-3)**2;
    if(rr>=5&&rr<=11||x===0||y===3)v.set(x-1,y,z,rr<2?gold:C.woodD);
  }
  v.box(5,4,-2,8,5,-2,C.woodL).box(5,4,2,8,5,2,C.woodL).box(4,0,0,4,3,0,C.woodD);
  for(const [x,z,h,c] of [[-4,0,10,plum],[0,1,9,coral],[3,-1,11,gold]]){
    v.box(x,4,z,x,h,z,C.frondD).set(x+1,h-2,z,C.frondL);
    blooms(v,x,h,z,c);
  }
  return v;
}

function lanternFrame(v,x,y,z,shade=C.lamp){
  v.box(x-1,y,z-1,x+1,y,z+1,C.woodD)
    .box(x-1,y+1,z-1,x+1,y+2,z+1,shade)
    .box(x-2,y+3,z-2,x+2,y+3,z+2,navy)
    .set(x,y+4,z,gold);
}

export function doubleLantern(){
  const v=new Vox();
  v.cyl(0,0,2,0,1,basalt).box(0,2,0,0,15,0,navy);
  v.box(-4,13,0,4,13,0,brass).set(0,16,0,gold);
  for(const x of [-4,4])lanternFrame(v,x,8,0);
  return v;
}

export function paperLanterns(){
  const v=new Vox();
  leg(v,-7,0,12);leg(v,6,0,12);
  for(let x=-7;x<=7;x++){
    const y=10+Math.round(x*x/22);
    v.set(x,y,0,C.rope);
    if(x%4===0){
      v.set(x,y-1,0,gold);
      v.cyl(x,0,1.6,y-4,y-2,x===0?C.lamp:coral);
      v.set(x,y-5,0,linen);
    }
  }
  return v;
}

export function beaconLantern(){
  const v=new Vox();
  v.cyl(0,0,3,0,1,basalt);
  for(let y=2;y<11;y++)v.cyl(0,0,y<6?2:1.5,y,y,y%5<2?coral:linen);
  v.cyl(0,0,2,11,11,navy);
  v.cyl(0,0,1.8,12,14,C.lamp).cyl(0,0,2.2,15,15,navy).cyl(0,0,1,16,16,brass);
  return v;
}

export function treasure(){
  const v=new Vox();
  v.box(-4,0,-3,4,1,3,C.woodD).walls(-4,2,-3,4,4,3,timber);
  for(const x of [-3,3])v.box(x,0,4,x,4,4,brass);
  for(let y=4;y<=9;y++)v.box(-4,y,-3-Math.floor((y-4)/2),4,y,-3-Math.floor((y-4)/2),(x)=>x%3===0?gold:C.woodL);
  v.cyl(-1,0,2,2,3,gold).set(-2,4,1,linen).set(2,4,1,blue).set(3,3,-1,coral);
  v.set(0,4,4,0x8c6745);
  return v;
}

export function compass(){
  const v=new Vox();
  v.cyl(0,0,6,0,0,basalt).cyl(0,0,5,1,1,linen);
  for(let n=0;n<8;n++){
    const angle=n*Math.PI/4;
    for(let i=0;i<=5;i++)v.set(Math.cos(angle)*i,1,Math.sin(angle)*i,n===2?coral:n%2?gold:navy);
  }
  v.cyl(0,0,1,2,2,gold);
  return v;
}

export function messageBottle(){
  const v=new Vox();
  v.cyl(0,0,3,0,1,basalt).cyl(0,0,2.5,2,6,0x59ab8c)
    .cyl(0,0,1,7,9,0x79cdb1).cyl(0,0,1,10,10,oak);
  v.box(-1,3,2,1,4,2,linen).box(-1,5,-1,1,5,-1,0x9ce6cb)
    .set(0,4,3,coral).set(2,6,0,0xb5eacc);
  return v;
}

export function windChimes(){
  const v=new Vox();
  v.cyl(0,0,2,0,0,basalt);
  v.box(0,1,0,0,14,0,C.woodD).box(0,14,0,7,14,0,C.woodL);
  for(const [x,z,y] of [[3,-1,7],[4,1,5],[6,-1,8],[7,1,6]]){
    v.box(x,12,z,x,13,z,C.rope).box(x,y,z,x,11,z,brass);
    v.set(x,y,z,silver);
  }
  v.box(4,14,-2,7,14,2,navy);
  return v;
}

export function woodenWhale(){
  const v=new Vox();
  v.cyl(0,0,4,0,1,basalt);
  v.box(0,2,1,0,5,1,C.woodD);
  v.sphere(0,7,2,3,blue).sphere(0,7,-1,2,navy).box(0,7,-6,0,8,-2,blue);
  v.box(-3,9,-6,3,9,-5,blue).set(-3,10,-6,navy).set(3,10,-6,navy);
  for(const x of [-2,2])v.set(x,8,4,navy).set(x,6,3,linen).set(x*1.5,6,1,blue);
  v.set(0,10,1,linen).set(0,11,1,blue);
  return v;
}
