import {Vox, jitter} from './vox.js';

const coral=0xe57655, navy=0x397b92, linen=0xffefd1;
const timber=C=>(x,y,z)=>jitter(z%3===0?C.woodD:C.woodL,x,y,z,.065);

function landing(C){
  const v=new Vox();
  v.box(-5,0,-6,5,0,7,timber(C));
  for(const x of [-5,4])v.box(x,0,1,x+1,4,2,C.woodD);
  v.box(-5,1,-4,-5,7,-4,C.woodD);
  v.box(-5,6,-4,-1,8,-4,navy);
  v.box(-4,7,-3,-2,7,-3,linen);
  return v;
}

function changingHut(C,stage){
  const v=new Vox();
  v.box(-13,0,-9,-6,1,-3,timber(C));
  v.walls(-13,2,-9,-6,7,-3,(x,y)=>y===7?C.woodL:x%3===0?navy:linen);
  v.box(-11,2,-3,-8,6,-3,(x)=>x%2?coral:linen);
  v.set(-9,4,-2,C.woodD);
  v.roofX(-14,-5,-10,-2,8,(stage===1?C.thatch:navy),C.woodD);
  return new Vox().merge(v,10,0,6);
}

function lounger(C,color){
    const v=new Vox(),x=0,z=-2;
    v.box(x,0,z,x,8,z,C.woodD);
    for(let ring=0;ring<3;ring++){
      const radius=5-ring*2;
      v.cyl(x,z,radius,8+ring,8+ring,(xx,y,zz)=>{
        const stripe=Math.floor((Math.atan2(zz-z,xx-x)+Math.PI)*3/Math.PI);
        return stripe%2?color:linen;
      },ring<2);
    }
    v.set(x,11,z,linen);
    v.box(x-2,0,z+1,x+2,1,z+5,C.woodD);
    v.box(x-2,2,z+2,x+2,2,z+5,(xx)=>xx%2?linen:color);
    v.box(x-2,3,z+1,x+2,3,z+2,color);
    v.box(x-1,4,z+1,x+1,4,z+1,linen);
    return v;
}

function pavilion(C){
  const v=new Vox();
  v.box(4,0,-10,14,1,-3,timber(C));
  for(const [x,z] of [[4,-10],[14,-10],[4,-3],[14,-3]]){
    v.box(x,2,z,x,11,z,C.woodD);
    v.set(x,3,z,navy);
    v.set(x,10,z,linen);
  }
  v.box(6,2,-8,12,4,-7,navy);
  v.box(5,5,-8,13,5,-6,C.woodL);
  for(const x of [7,9,11])v.set(x,6,-7,x===9?coral:C.teal);
  for(let i=0;i<4;i++){
    const color=(x,y,z)=>x%4<2?coral:linen;
    v.box(3+i,12+i,-11+i,15-i,12+i,-11+i,color);
    v.box(3+i,12+i,-2-i,15-i,12+i,-2-i,color);
  }
  for(const x of [4,14])v.set(x,10,-2,C.lamp);
  return new Vox().merge(v,-9,0,6);
}

export function beachFixtures(stage,C){
  const parts=[
    {id:'landing',model:landing(C),blocks:false,supports:[[-4,-5],[4,-5],[-4,6],[4,6]]},
    {id:'hut',model:changingHut(C,stage),blocks:true,supports:[[-3,-3],[4,-3],[-3,3],[4,3]]},
  ];
  if(stage>=2)parts.push({
    id:'lounger',model:lounger(C,coral),alternate:lounger(C,navy),blocks:true,
    supports:[[0,-2],[-2,2],[2,2],[-2,0],[2,0]],
  });
  if(stage>=3)parts.push({
    id:'pavilion',model:pavilion(C),blocks:true,supports:[[-5,-4],[5,-4],[-5,3],[5,3]],
  });
  return parts;
}

export function beachAccent(kind,C){
  const v=new Vox();
  if(kind==='landing'||kind==='hut'){
    v.box(-2,0,-2,2,0,2,timber(C));
    for(const x of [-2,2]){
      v.box(x,1,1,x,3,1,C.woodD);
      v.set(x,3,1,C.rope);
    }
    v.box(-2,2,1,2,2,1,C.rope);
  }else if(kind==='lounger'){
    v.box(-2,0,-2,2,0,2,x=>x%2?coral:linen);
    v.box(-1,1,-2,0,1,-2,navy);
    v.set(2,0,2,C.rope);
  }else{
    v.box(-1,0,-1,1,1,1,C.woodD);
    v.box(0,2,0,0,5,0,C.woodD);
    v.set(0,6,0,C.lamp);
    v.set(0,7,0,navy);
  }
  return v;
}

export function beachModel(stage,C){
  const v=new Vox();
  const layout={landing:[0,0],hut:[-11,1],lounger:[12,4],pavilion:[5,-13]};
  for(const part of beachFixtures(stage,C)){
    const [x,z]=layout[part.id];
    v.merge(part.model,x,0,z);
  }
  return v;
}
