import {Vox} from './vox.js';
// Original voxel structures, sharing the island's material palette.
export function worldBuilding(kind,s,C){
 const v=new Vox(),wood=C.wood,stone=C.rockL||0xc8c2ad,cream=0xffedbe,teal=0x378f98,coral=0xe98166;
 v.box(-10,0,-10,10,1,10,C.plank);
 const post=(x,z,h=15)=>v.box(x,2,z,x+1,h,z+1,C.woodD);
 const roof=(color,h=17)=>{for(let k=0;k<7;k++)v.box(-12+k,h+k,-11+k,12-k,h+k,11-k,color);};
 const lantern=(x,z)=>{v.box(x,3,z,x,12,z,C.woodD);v.box(x-1,12,z-1,x+1,14,z+1,0xffd36d);};
 if(s===1){for(const [x,z]of[[-9,-9],[8,-9],[-9,8],[8,8]])post(x,z,6);v.box(-6,2,-5,5,3,4,C.woodL);return v;}
 if(['house','tea','library','museum'].includes(kind)){
  const color=kind==='tea'?0xa9cba0:kind==='library'?0x86bfc7:kind==='museum'?cream:coral;
  v.walls(-9,2,-8,9,15,8,color);v.box(-2,2,8,2,11,8,C.woodD);
  for(const x of[-6,5])v.box(x,7,8,x+2,11,8,0x6aafcb);
  if(s===3)roof(kind==='library'?teal:kind==='museum'?0x8c9cae:C.thatch);
  else v.box(-10,16,-9,10,16,9,C.woodD);
  if(kind==='tea'){v.box(-6,2,11,6,3,13,C.woodD);v.box(-3,4,11,3,5,13,cream);}
  if(kind==='library'){for(let i=0;i<7;i++)v.box(-7+i*2,3,10,-6+i*2,7,11,[teal,coral,cream][i%3]);}
  if(kind==='museum'){v.box(-4,16,9,4,19,10,cream);v.cyl(0,11,2,3,6,0xd5ab4f);}
 }else if(kind==='market'){
  for(const[x,z]of[[-9,-8],[8,-8],[-9,7],[8,7]])post(x,z);
  v.box(-9,2,3,9,8,8,C.woodL);
  for(let x=-11;x<=11;x++)v.box(x,17,-10,x,17,10,x%4<2?teal:cream);
  for(let i=0;i<5;i++)v.box(-7+i*3,9,4,-5+i*3,10,6,i%2?0x8bbdca:0xb4d5dc);
  if(s===3){lantern(-11,11);lantern(10,11);}
 }else if(kind==='kiln'){
  v.cyl(0,0,8,2,11,stone);v.box(-4,2,7,4,8,8,0x4d4742);v.cyl(0,-2,4,12,s===3?26:17,0x9b8e80);
  v.box(-2,3,8,2,5,8,0xffa04d);if(s===3){v.box(9,2,-7,11,8,7,C.woodD);v.box(9,8,-7,11,9,7,C.woodL);}
 }else if(kind==='boathouse'){
  for(const[x,z]of[[-10,-8],[9,-8]])post(x,z,18);if(s===3)roof(teal,19);
  for(let z=-8;z<=8;z++){const w=Math.max(1,Math.round(4*(1-Math.abs(z)/11)));v.box(-w,3,z,w,4,z,coral);v.set(-w,5,z,C.woodD);v.set(w,5,z,C.woodD);}
  v.box(7,2,-7,8,12,-6,C.woodL);v.box(6,12,-7,10,14,-6,cream);
 }else if(kind==='hammock'){
  post(-9,0,21);post(8,0,21);
  for(let x=-8;x<=8;x++){const y=7+Math.round(Math.abs(x)*.55);v.box(x,y,-3,x,y,3,(x+12)%4<2?cream:coral);}
  for(const x of[-9,9])v.sphere(x,22,0,5,C.frond);
  if(s===3){lantern(-9,8);v.box(5,2,7,9,3,9,C.woodL);}
 }else if(kind==='orchard'){
  for(const [x,z]of[[-6,-5],[6,-3],[0,6]]){v.box(x,2,z,x+1,12,z+1,C.trunk);v.sphere(x,15,z,6,C.frond);if(s===3)for(let a=0;a<5;a++)v.set(x+Math.round(Math.cos(a*1.7)*5),14+(a%3),z+Math.round(Math.sin(a*1.7)*5),a%2?0xffbc40:coral);}
 }else if(kind==='mill'){
  v.cyl(0,0,7,2,22,cream);if(s===3)roof(teal,23);
  const h=19;v.cyl(0,8,2,h-2,h+2,C.woodD);
  v.box(-1,h-13,9,1,h+13,9,C.woodL);v.box(-13,h-1,9,13,h+1,9,C.woodL);
  if(s===3){v.box(2,h+3,9,5,h+13,9,cream);v.box(-5,h-13,9,-2,h-3,9,cream);v.box(-13,h+2,9,-3,h+5,9,cream);v.box(3,h-5,9,13,h-2,9,cream);}
 }else if(kind==='fountain'){
  v.cyl(0,0,10,2,5,stone,true);v.cyl(0,0,9,2,3,0x59c7d1);v.cyl(0,0,3,4,11,stone);v.cyl(0,0,6,10,12,stone,true);v.cyl(0,0,5,10,11,0x66dce0);
  if(s===3){v.box(0,12,0,0,22,0,0x92e9ec);for(let x=-4;x<=4;x++)v.set(x,19-Math.round(x*x/5),0,0x92e9ec);}
 }else if(kind==='observatory'){
  v.cyl(0,0,9,2,17,cream);v.sphere(0,19,0,9,teal);v.box(0,22,-2,12,24,1,C.woodD);v.box(11,21,-3,13,25,2,0xb6c6cf);
  if(s===3){v.box(-2,2,9,2,13,9,C.woodD);lantern(-9,10);}
 }else if(kind==='aviary'){
  for(const[x,z]of[[-9,-9],[8,-9],[-9,8],[8,8]])post(x,z,22);
  for(let i=-8;i<=8;i+=4){v.box(i,3,-9,i,20,-9,C.bamboo);v.box(i,3,9,i,20,9,C.bamboo);}
  if(s===3)roof(C.thatch,23);v.box(-7,11,0,7,11,0,C.trunk);
  for(const x of[-5,4]){v.box(x,12,0,x+2,15,2,x<0?coral:teal);v.box(x+1,16,0,x+2,17,1,0xffd968);}
 }else if(kind==='pavilion'){
  for(const[x,z]of[[-8,-8],[7,-8],[-8,7],[7,7]])post(x,z,19);
  v.box(-8,3,4,8,4,7,C.woodL);v.box(-7,3,-7,-4,4,4,C.woodL);if(s===3){roof(coral,21);v.box(-3,28,-3,3,29,3,cream);}
 }else if(kind==='statue'){
  v.box(-7,2,-7,7,5,7,stone);v.box(-5,6,-5,5,8,5,cream);v.box(-3,9,-2,3,18,2,0xd9b85a);v.box(-2,19,-2,2,23,2,0xeacb78);v.box(-8,16,-1,8,18,1,0xd9b85a);
  if(s===3){v.box(-4,24,-3,4,25,3,0xc99a3d);v.box(-10,18,0,-10,28,0,C.woodD);v.box(-9,24,0,-5,28,0,coral);}
 }
 if(s===3&&kind!=='orchard'&&kind!=='fountain')for(const[x,z]of[[-10,9],[10,-9]]){v.box(x-1,2,z-1,x+1,4,z+1,coral);v.set(x,5,z,C.frond);v.set(x,6,z,0xffd76c);}
 return v;
}
