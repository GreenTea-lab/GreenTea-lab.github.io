import {Vox, jitter} from './vox.js';
import {windowFrame,tiledRoof,canvas,copper} from './building-details.js';
import {voyageMonument} from './voyage-monument.js';
const teal=0x378f98, coral=0xe98166, ivory=0xffedbe, slate=0x718ba1;

function stackedBoards(v,x,z,C){
  for(let y=2;y<=4;y++)v.box(x+y%2,y,z,x+6-y%2,y,z+2,y===3?C.woodD:C.woodL);
  for(const xx of [x+1,x+5])v.box(xx,2,z-1,xx,5,z+3,C.rope);
}

function paintedSign(v,x,y,z,color,C){
  v.box(x-3,y,z,x+3,y+3,z,C.woodD);
  v.box(x-2,y+1,z+1,x+2,y+2,z+1,color);
  v.box(x-1,y+1,z+1,x+1,y+1,z+1,canvas);
}

function firstStage(v,kind,C){
  const pole=(x,z,h)=>v.box(x,2,z,x+1,h,z+1,C.woodD);
  switch(kind){
    case 'house': case 'library': case 'museum': {
      const accent=kind==='house'?coral:kind==='library'?teal:0xc99f61;
      for(const [x,z] of [[-8,-7],[7,-7],[-8,6],[7,6]])pole(x,z,8);
      v.box(-8,5,-7,8,6,-7,accent);v.box(-8,7,-7,8,8,-7,C.woodL);
      v.box(-8,2,-6,-8,5,5,accent);stackedBoards(v,-4,1,C);
      paintedSign(v,5,4,7,accent,C);
      break;
    }
    case 'tea': case 'market': {
      const color=kind==='tea'?coral:teal;
      for(const x of [-7,6])for(const z of [1,6])pole(x,z,9);
      v.box(-8,5,1,8,5,8,C.woodL);
      v.box(-8,10,0,8,10,7,(x)=>x%4<2?color:canvas);
      for(const x of [-5,0,5])v.box(x,6,4,x+1,7,5,kind==='tea'?ivory:0x88bed0);
      break;
    }
    case 'boathouse':
      for(const x of [-6,6])v.box(x,2,-8,x+1,3,8,C.woodD);
      for(let i=-7;i<=7;i++){
        const w=Math.max(1,4-Math.floor(Math.abs(i)/2));
        v.set(0,3,i,C.woodD);
        v.box(-w,4,i,-w,5,i,coral);v.box(w,4,i,w,5,i,coral);
      }
      stackedBoards(v,3,5,C);break;
    case 'kiln':
      v.cyl(0,-1,7,2,5,C.rock,true);
      v.box(-3,2,5,3,5,6,C.rockD);
      v.box(-2,2,6,2,3,7,C.woodD);
      stackedBoards(v,3,7,C);break;
    case 'orchard':
      for(const [x,z] of [[-5,-5],[5,-3],[0,5]]){
        v.cyl(x,z,3,2,2,C.soil);
        v.box(x,3,z,x,7,z,C.trunk);
        v.sphere(x,8,z,2,C.frondL);
        v.box(x-2,3,z,x-2,7,z,C.woodL);
        v.box(x-2,5,z,x,5,z,C.rope);
      }
      break;
    case 'hammock':
      for(const x of [-7,6])pole(x,0,12);
      for(let x=-6;x<=6;x++){const y=6+Math.floor(x*x/9);v.box(x,y,0,x,y,2,x%4<2?teal:ivory);}
      v.box(-3,2,-7,3,3,-5,C.woodL);
      break;
    case 'mill': case 'observatory': {
      const color=kind==='mill'?ivory:slate;
      v.cyl(0,0,7,2,6,color,true);
      v.box(-2,2,6,2,4,7,C.woodD);
      for(const x of [-6,5])pole(x,-5,10);
      v.box(-6,10,-5,6,10,-5,C.woodL);
      stackedBoards(v,-8,5,C);break;
    }
    case 'fountain':
      v.cyl(0,0,9,2,3,C.rockD,true);
      v.cyl(0,0,8,2,2,0x6ec5cd);
      v.cyl(0,0,2,3,5,C.rockL);
      v.set(0,6,0,copper);break;
    case 'aviary':
      pole(-7,0,12);pole(6,0,12);
      v.box(-7,11,0,7,11,0,C.woodL);
      v.box(-1,9,0,2,13,3,C.woodD);
      v.box(-2,14,-1,3,14,4,teal);
      v.set(0,11,3,C.dark);break;
    case 'pavilion':
      for(const [x,z] of [[-8,-7],[7,-7],[-8,6],[7,6]])pole(x,z,12);
      v.box(-8,12,-7,8,12,7,C.woodL);
      v.box(-6,3,5,6,4,7,C.woodL);
      v.box(-5,2,5,-4,2,5,C.woodD);v.box(4,2,5,5,2,5,C.woodD);
      break;
  }
}
function millBlades(v,s,C,y,z){
 v.box(-1,y-13,z,1,y+13,z,C.woodL);
 v.box(-13,y-1,z,13,y+1,z,C.woodL);
 if(s===3){
  const canvas=0xffedbe;
  v.box(2,y+3,z,5,y+13,z,canvas);v.box(-5,y-13,z,-2,y-3,z,canvas);
  v.box(-13,y+2,z,-3,y+5,z,canvas);v.box(3,y-5,z,13,y-2,z,canvas);
 }
}

export function windmillRotor(s,C){
 const v=new Vox();
 millBlades(v,s,C,0,0);
 return v;
}

// Original voxel structures, sharing the island's material palette.
export function worldBuilding(kind,s,C,live=false){
 if(kind==='statue')return voyageMonument(s,C);
 const v=new Vox(),stone=C.rockL,cream=ivory;
 const masonry=['kiln','mill','fountain','observatory','museum'].includes(kind);
 v.box(-10,0,-10,10,1,10,(x,y,z)=>{
   const seam=masonry?(z+(x%4<2?1:0))%3===0:z%3===0;
   return jitter(masonry?(seam?C.rock:stone):(seam?C.woodD:C.plank),x,y,z,.055);
 });
 const post=(x,z,h=15)=>v.box(x,2,z,x+1,h,z+1,C.woodD);
 const roof=(color,h=17)=>tiledRoof(v,12,8,h,C,color,true);
 const lantern=(x,z)=>{
   v.box(x,2,z,x,10,z,C.woodD);
   v.box(x-1,10,z-1,x+1,10,z+1,C.iron);
   v.box(x-1,11,z-1,x+1,12,z+1,C.lamp);
   v.box(x-1,13,z-1,x+1,13,z+1,C.woodD);
 };
 if(s===1){firstStage(v,kind,C);return v;}
 if(['house','tea','library','museum'].includes(kind)){
  const color=kind==='tea'?0xa9cba0:kind==='library'?0x86bfc7:kind==='museum'?cream:coral;
  v.walls(-9,2,-8,9,15,8,(x,y,z)=>jitter((y===2||y===14)?C.woodL:color,x,y,z,.04));
  for(const x of [-9,9])for(const z of [-8,8])v.box(x,2,z,x,15,z,C.woodD);
  v.box(-3,2,8,3,11,8,C.woodD);
  v.box(-2,3,9,2,10,9,kind==='house'?teal:C.woodL);
  v.set(1,6,10,copper);
  for(const x of [-7,4])windowFrame(v,x,7,8,3,4,C);
  if(s===3)roof(kind==='library'?teal:kind==='museum'?slate:kind==='tea'?0xc46650:C.thatch);
  else v.box(-10,16,-9,10,16,9,(x,y,z)=>z%3===0?C.woodD:C.woodL);
  if(kind==='house'){
    v.box(-6,2,10,6,2,12,C.woodL);
    for(const x of [-7,7])v.box(x,2,9,x,6,12,C.woodD);
    if(s===3){v.box(6,19,-5,8,25,-3,C.rockD);v.box(5,25,-6,9,25,-2,stone);}
  }
  if(kind==='tea'){
    v.box(-6,2,11,6,3,13,C.woodD);v.box(-3,4,11,3,5,13,cream);
    for(const x of [-2,2])v.set(x,6,12,x<0?teal:coral);
    if(s===3)v.box(-8,12,9,8,12,12,(x)=>x%4<2?coral:canvas);
  }
  if(kind==='library'){
    for(let i=0;i<7;i++)v.box(-7+i*2,3,10,-6+i*2,6+i%3,11,[teal,coral,cream][i%3]);
    paintedSign(v,0,12,9,teal,C);
    if(s===3)v.box(-8,9,-7,-8,13,6,slate);
  }
  if(kind==='museum'){
    paintedSign(v,0,15,9,copper,C);v.cyl(0,11,2,3,6,0xd5ab4f);
    if(s===3)for(const x of [-7,7]){v.box(x-1,2,10,x+1,12,11,stone);v.box(x-2,12,9,x+2,13,12,cream);}
  }
 }else if(kind==='market'){
  for(const[x,z]of[[-9,-8],[8,-8],[-9,7],[8,7]])post(x,z);
  v.box(-9,2,3,9,8,8,C.woodL);
  for(let z=-10;z<=10;z++){
    const y=20-Math.floor(Math.abs(z)/2);
    v.box(-11,y,z,11,y,z,(x)=>x%4<2?teal:cream);
    if(Math.abs(z)===10)v.box(-11,y-1,z,11,y-1,z,(x)=>x%4<2?teal:cream);
  }
  for(let i=0;i<5;i++){
    const x=-7+i*3;
    v.box(x,9,4,x+1,10,6,0x7fbbca);v.set(x+1,10,4,0xe3e8d3);v.set(x,9,7,teal);
  }
  v.box(-9,5,9,9,5,9,C.woodD);
  if(s===3){lantern(-10,9);lantern(10,9);paintedSign(v,0,12,9,teal,C);}
 }else if(kind==='kiln'){
  const brick=(x,y,z)=>jitter([(y%3===0?C.rockD:stone),0xbb947b,0xb2a497][Math.abs(x*y+z)%3],x,y,z,.08);
  v.cyl(0,0,8,2,11,brick);v.box(-4,2,7,4,8,8,0x4d4742);
  const h=s===3?26:17;
  v.cyl(0,-2,4,12,h,brick);v.cyl(0,-2,5,h-1,h,C.rockD,true);
  v.box(-2,3,8,2,5,8,0xffa04d);
  for(const x of [-1,1])v.box(x,3,9,x,7,9,C.iron);
  if(s===3){v.box(9,2,-7,11,8,7,C.woodD);v.box(9,8,-7,11,9,7,C.woodL);stackedBoards(v,-10,6,C);}
 }else if(kind==='boathouse'){
  for(const[x,z]of[[-10,-8],[9,-8],[-10,7],[9,7]])post(x,z,18);
  if(s===3)roof(teal,19);
  for(let z=-8;z<=8;z++){const w=Math.max(1,Math.round(4*(1-Math.abs(z)/11)));v.box(-w,3,z,w,4,z,coral);v.set(-w,5,z,C.woodD);v.set(w,5,z,C.woodD);}
  v.box(7,2,-7,8,12,-6,C.woodL);v.box(6,12,-7,10,14,-6,cream);
  v.box(-10,8,-7,-7,9,7,C.woodL);
  for(const z of [-5,0,5])v.box(-8,3,z,-8,12,z,C.woodD);
  if(s===3){paintedSign(v,0,15,8,teal,C);v.set(-7,10,3,C.lamp);}
 }else if(kind==='hammock'){
  post(-9,0,21);post(8,0,21);
  for(let x=-8;x<=8;x++){const y=7+Math.round(Math.abs(x)*.55);v.box(x,y,-3,x,y,3,(x+12)%4<2?cream:coral);}
  for(const x of[-9,8]){
    v.sphere(x,21,0,4,(xx,y,z)=>y>20?C.frond:C.frondD);
    for(let n=0;n<5;n++)for(let i=3;i<6;i++){
      const a=n*1.256;v.set(x+Math.sin(a)*i,22-(i-3),Math.cos(a)*i,i%2?C.frondL:C.frond);
    }
    v.box(x,11,0,x,13,0,C.rope);
  }
  if(s===3){lantern(-9,8);v.box(5,2,7,9,3,9,C.woodL);v.box(5,4,7,9,4,9,teal);}
 }else if(kind==='orchard'){
  for(const [x,z]of[[-6,-5],[6,-3],[0,6]]){
    v.cyl(x,z,3,2,2,C.soil);v.box(x,3,z,x+1,12,z+1,C.trunk);
    v.sphere(x,14,z,5,C.frondD);v.sphere(x-2,16,z,4,C.frond);v.sphere(x+2,15,z,4,C.frondL);
    if(s===3)for(let a=0;a<9;a++)v.set(x+Math.round(Math.cos(a*1.7)*5),13+(a%4),z+Math.round(Math.sin(a*1.7)*4),a%2?0xffbc40:coral);
  }
  if(s===3){v.box(-7,2,4,-3,4,8,C.woodD);v.box(-6,4,5,-4,4,7,0xffbd54);}
 }else if(kind==='mill'){
  v.cyl(0,0,7,2,22,(x,y,z)=>y%5===0?C.rock:cream);
  v.box(-2,2,7,2,9,7,C.woodD);windowFrame(v,-1,12,6,2,3,C);
  if(s===3)roof(teal,23);
  const h=19;v.cyl(0,8,2,h-2,h+2,C.woodD);
  if(!live)millBlades(v,s,C,h,9);
 }else if(kind==='fountain'){
  v.cyl(0,0,10,2,5,(x,y,z)=>y===5?stone:y===4?teal:C.rock,true);
  v.cyl(0,0,9,2,3,0x59c7d1);v.cyl(0,0,3,4,11,stone);
  v.cyl(0,0,6,10,12,(x,y,z)=>y===11?0x85b8c0:stone,true);v.cyl(0,0,5,10,11,0x66dce0);
  v.cyl(0,0,1,12,12,stone);
  if(s===3)for(const [x,z] of [[-7,-7],[-7,7],[7,-7],[7,7]]){
    v.box(x-1,2,z-1,x+1,4,z+1,C.rockD);v.set(x,5,z,C.lamp);
  }
  if(s===3&&!live){v.box(0,13,0,0,22,0,0x92e9ec);for(let x=-4;x<=4;x++)v.set(x,19-Math.round(x*x/5),0,0x92e9ec);}
 }else if(kind==='observatory'){
  v.cyl(0,0,9,2,17,(x,y,z)=>y%4===0?stone:cream);
  v.sphere(0,19,0,9,(x,y,z)=>Math.abs(x)<=1||Math.abs(z)<=1?0x9cbbb9:y>25?slate:teal);
  v.box(0,22,-2,12,24,1,C.woodD);v.box(11,21,-3,13,25,2,0xb6c6cf);
  v.box(13,22,-2,13,24,1,0x415e81);v.set(13,24,0,0xa4e4e4);
  for(const x of [-5,3])windowFrame(v,x,10,7,2,3,C);
  if(s===3){v.box(-2,2,9,2,13,9,C.woodD);lantern(-9,10);paintedSign(v,0,14,9,slate,C);}
 }else if(kind==='aviary'){
  for(const[x,z]of[[-9,-9],[8,-9],[-9,8],[8,8]])post(x,z,22);
  for(let i=-8;i<=8;i+=4){v.box(i,3,-9,i,20,-9,C.bamboo);v.box(i,3,9,i,20,9,C.bamboo);}
  for(const z of [-5,0,5])for(const x of [-9,9])v.box(x,3,z,x,19,z,C.bambooD);
  for(const y of [6,16])for(const x of [-9,9])v.box(x,y,-9,x,y,9,C.rope);
  if(s===3)roof(C.thatch,23);v.box(-7,11,0,7,11,0,C.trunk);
  for(const x of[-5,4]){v.box(x,12,0,x+2,15,2,x<0?coral:teal);v.box(x+1,16,0,x+2,17,1,0xffd968);}
 }else if(kind==='pavilion'){
  for(const[x,z]of[[-8,-8],[7,-8],[-8,7],[7,7]])post(x,z,19);
  v.box(-8,3,4,8,4,7,C.woodL);v.box(-7,3,-7,-4,4,4,C.woodL);if(s===3){roof(coral,21);v.box(-3,28,-3,3,29,3,cream);}
  for(const x of [-7,7])v.box(x,5,-7,x,5,7,C.woodL);
  for(let i=-7;i<=7;i+=2)v.box(i,15+Math.round(i*i/14),8,i,17+Math.round(i*i/14),8,i%4===1?coral:teal);
  if(s===3){lantern(-8,7);lantern(8,7);}
 }
 if(s===3&&kind!=='orchard'&&kind!=='fountain')for(const[x,z]of[[-10,9],[10,-9]]){v.box(x-1,2,z-1,x+1,4,z+1,coral);v.set(x,5,z,C.frond);v.set(x,6,z,0xffd76c);}
 return v;
}
