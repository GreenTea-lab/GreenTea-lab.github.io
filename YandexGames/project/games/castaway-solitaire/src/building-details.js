import {jitter} from './vox.js';

export const copper=0xae7853, moss=0x849452, glazed=0x77bfce, canvas=0xf9e8c4;
const palette=(colors,weight=.035)=>(x,y,z)=>jitter(colors[(x+z+y+512)%colors.length],x,y,z,weight);

export function windowFrame(v,x,y,z,width,height,C){
  v.box(x-1,y-1,z,x+width,y+height,z,C.woodD);
  v.box(x,y,z+1,x+width-1,y+height-1,z+1,palette([glazed,0x94cbd2,0x629aaf]));
  v.box(x+Math.floor(width/2),y,z+1,x+Math.floor(width/2),y+height-1,z+1,C.woodL);
  v.box(x-1,y-1,z+1,x+width,y-1,z+1,C.woodL);
  v.set(x,y+height-1,z+1,0xc2e2df);
}

export function tiledRoof(v,w,d,y,C,shade,hips=false){
  const tile=palette([shade,shade,C.thatchD,shade]);
  const shell=(x,yy,z)=>(x+Math.floor(yy/2))%5===0?C.woodD:tile(x,yy,z);
  for(let row=0;row<=d;row++){
    const inset=hips?Math.floor(row*.61):0;
    const left=-w+inset,right=w-inset;
    for(const z of new Set([-d+row,d-row])){
      v.box(left,y+row,z,right,y+row,z,shell);
      if(row<d)v.box(left,y+row,z,left,y+row+1,z,C.woodD);
      if(row<d)v.box(right,y+row,z,right,y+row+1,z,C.woodD);
    }
    if(hips)for(const x of [left,right])v.box(x,y+row,-d+row,x,y+row,d-row,tile);
    else if(row<d)for(const x of [left+1,right-1])v.box(x,y+row,-d+row,x,y+row,d-row,C.plank);
  }
}

function cobbles(v,x0,x1,z0,z1,C){
  for(let z=z0;z<=z1;z+=2)for(let x=x0+((z-z0)%4?1:0);x<=x1;x+=2){
    v.box(x,0,z,Math.min(x+1,x1),0,Math.min(z+1,z1),palette([C.rockL,C.rock,0xbbaba0,0xc3bca9]));
  }
}

function trimHut(v,s,C){
  if(s===1){
    v.box(-7,1,-3,-6,1,4,C.woodL);
    v.box(-6,1,4,4,1,4,(x)=>x%3===0?C.red:canvas);
    for(const x of [-8,8])v.box(x,6,-5,x,7,-4,C.rope);
    v.box(5,0,3,7,1,4,C.woodD);
    v.set(6,2,4,C.yellow);
    for(let z=-4;z<7;z+=2)v.set(9,Math.round(10-(z+6)*.45),z,C.frondL);
    return;
  }
  const w=s===3?10:8,d=s===3?8:7;
  for(const x of [-w,w])v.box(x,5,d+1,x,11,d+1,C.trunkD);
  for(const x of [-3,3])v.box(x,5,d+1,x,10,d+1,C.woodD);
  v.box(-3,10,d+1,3,10,d+1,C.woodD);
  windowFrame(v,-w+2,7,d+1,3,3,C);
  if(s===3){
    v.box(-2,5,d+4,2,5,d+5,0x677f64);
    v.box(-2,5,d+5,2,5,d+5,canvas);
    v.set(0,11,d+1,C.lamp);
  }
}

function trimFire(v,s,C){
  for(const [x,z] of [[-4,0],[4,0],[0,-4],[0,4]]){
    v.set(x,0,z,C.rockD);
    v.set(x,1,z,C.rockL);
  }
  if(s>=2){
    for(const [x,z] of [[-4,8],[5,5]]){
      v.box(x-2,0,z-1,x+2,0,z+1,C.trunkD);
      v.box(x-2,1,z-1,x+2,1,z+1,palette([C.woodL,canvas,C.redD]));
    }
    v.box(4,2,-3,5,2,-2,C.iron);
    v.set(4,3,-2,C.woodL);
  }
  if(s===3){
    v.box(-13,6,-4,-2,8,-4,(x,y)=>y===8?C.woodL:(x+13)%4<2?0x417d78:canvas);
    for(const x of [-11,-5])v.set(x,5,-4,C.lamp);
  }
}

function trimWater(v,s,C){
  const rocks=palette([C.rockD,C.rock,C.rockL]);
  if(s===1){
    v.cyl(0,0,3,2,2,C.iron,true);v.cyl(0,0,3,5,5,C.iron,true);
    v.box(-3,3,0,-1,4,0,C.woodL);
    v.set(-3,3,1,copper);
  }else if(s===2){
    for(let z=-3;z>=-18;z--){
      const y=5+Math.round((-3-z)*.35);
      v.set(-1,y,z,C.bambooD);v.set(1,y,z,C.bamboo);
      if(z%4===0)v.set(0,y,z,C.water);
    }
    cobbles(v,-3,3,-2,3,C);
  }else{
    v.cyl(0,0,5,0,0,rocks,true);
    v.cyl(0,0,4.8,4,4,rocks,true);
    v.box(-5,10,-1,5,10,1,C.woodD);
    v.box(-6,12,4,6,12,4,palette([C.woodD,C.woodL,C.thatch]));
    v.set(-4,11,2,C.lamp);
  }
}

function trimGarden(v,s,C){
  for(const [x,z] of s===1?[[-9,-5]]:[[-9,-5],[2,-5],[-9,2]]){
    v.box(x,1,z-2,x,4,z-2,C.woodD);
    v.box(x-1,3,z-2,x+1,4,z-2,C.woodL);
    v.set(x,4,z-1,s===1?C.frondL:C.orange);
  }
  if(s>=2){
    v.box(1,0,-1,3,1,1,C.iron);
    v.set(2,1,0,C.water);v.set(3,2,1,copper);
  }
  if(s===3){
    cobbles(v,-1,1,3,7,C);
    for(const x of [-4,4]){
      v.box(x,1,7,x,5,7,C.woodD);v.set(x,5,7,C.lamp);
    }
  }
}

function trimPier(v,s,C){
  const length=[0,43,61,73][s];
  for(let z=4;z<length-7;z+=9){
    for(const x of [-3,3]){
      v.box(x,1,z,x,s===1?2:4,z,C.woodD);
      v.set(x,2,z,C.rope);
      if(s>=2)for(let k=1;k<=7;k++)v.set(x,3-(k>=3&&k<=5?1:0),z+k,C.rope);
    }
  }
  if(s>=2){
    for(const z of [length-7,length-3])v.box(-6,1,z,-6,3,z,C.woodD);
    v.box(-6,3,length-7,-6,3,length-3,C.woodL);
  }
  if(s===3){
    v.box(-3,2,length-13,1,2,length-10,C.redD);
    v.box(-3,3,length-13,1,3,length-13,canvas);
    for(const x of [8,12])v.set(x,0,length-16,C.woodL);
  }
}

function trimLookout(v,s,C){
  for(const x of [-1,1])for(let y=3;y<(s===1?24:30);y+=5)v.set(x,y,2,C.woodD);
  v.box(-4,0,2,4,0,3,palette([C.woodL,C.woodD]));
  if(s>=2){
    for(const x of [-6,6]){
      v.box(x,29,-6,x,30,6,C.woodD);
      v.set(x,34,6,C.lamp);
    }
    for(let x=-6;x<=6;x++)v.set(x,32,6,x%3===0?C.rope:C.woodL);
  }
  if(s===3){
    v.box(-6,31,-5,-2,31,-3,(x)=>x%2?canvas:C.redD);
    v.box(-6,32,-5,-2,32,-5,C.redD);
    v.set(-4,34,0,glazed);
  }
}

function trimWorkshop(v,s,C){
  v.box(-7,0,-5,7,0,3,palette([C.wood,C.woodL,C.plank]));
  v.box(-1,5,1,2,6,2,C.iron);v.set(1,6,2,C.redD);
  for(const x of [-6,6])v.box(x,2,-2,x,3,2,C.woodD);
  if(s>=2){
    for(const x of [-10,10])v.box(x,3,-7,x,7,-7,C.woodL);
    v.box(-9,9,-6,9,9,-6,C.woodD);
    for(let x=-7;x<=7;x+=3)v.set(x,6,-5,x%2?C.iron:copper);
    for(let x=-12;x<=12;x++)v.set(x,12,10,x%3?C.woodL:0x557c60);
  }
  if(s===3){
    v.box(13,2,2,16,2,6,palette([C.iron,C.woodL]));
    v.box(-8,0,9,-5,1,9,C.iron);v.set(-6,2,9,C.woodL);
  }
}

function trimFarm(v,s,C){
  v.box(-11,0,-8,11,0,8,(x,y,z)=>{
    if((z+9)%5===0&&x>1)return C.soilD;
    return (x+z)%7===0?moss:C.soil;
  });
  v.box(12,1,-2,12,3,2,C.woodD);
  v.box(12,2,-1,12,2,1,C.woodL);
  if(s>=2){
    v.box(-8,0,2,-6,0,4,palette([C.rock,C.rockL]));
    v.box(-7,2,5,-7,2,6,C.water);
    v.set(-5,2,6,copper);
  }
  if(s===3){
    v.box(3,2,7,8,2,8,C.woodL);
    for(const x of [3,8])v.set(x,7,7,C.lamp);
    v.box(3,6,7,4,8,7,C.woodD);
    v.set(4,7,7,glazed);
  }
}

function trimBeacon(v,s,C){
  if(s===1){
    v.box(4,1,4,7,1,7,C.woodD);
    v.set(6,3,6,copper);
    for(const x of [-3,3])v.set(x,0,4,C.rockL);
    return;
  }
  const radius=s===3?27:18;
  for(let angle=0;angle<12;angle++){
    const a=angle*Math.PI/6,x=Math.round(Math.cos(a)*(radius-1)),z=Math.round(Math.sin(a)*(radius-1));
    v.set(x,8,z,angle%3===0?C.lamp:C.rockL);
    if(angle%3===1){
      v.box(x-1,6,z-1,x+1,6,z+1,C.rockD);
      v.set(x,7,z,moss);v.set(x,8,z,C.grassL);
    }
  }
  const edge=radius+3;
  v.box(-5,6,radius-2,5,8,radius+1,null);
  for(let z=radius-2;z<=edge;z++){
    const level=Math.max(1,5-(z-radius+2));
    if(level<5)v.box(-4,level+1,z,4,5,z,null);
    v.box(-4,0,z,4,level,z,C.rockL);
  }
  for(const x of [-6,6]){
    v.box(x,4,radius-1,x,8,radius-1,C.rockD);
    v.set(x,9,radius-1,C.lamp);
  }
  if(s===3){
    for(const x of [-4,4])v.box(x,7,14,x,14,14,C.rockL);
    v.box(-4,14,14,4,14,14,C.rockL);
    v.box(-2,10,15,2,10,15,C.woodL);
    v.cyl(0,0,10,47,47,C.rockL,true);
  }
}

function trimShip(v,s,C){
  for(const x of [-15,-8,0,8,15]){
    v.box(x,0,-6,x+1,1,-5,C.woodD);v.box(x,0,5,x+1,1,6,C.woodD);
    if(s===1){
      v.box(x,2,-5,x,3,-5,C.woodL);
      v.box(x,2,5,x,3,5,C.woodL);
    }
  }
  if(s>=2){
    for(const x of [-12,-7,0,6,12]){
      v.set(x,10,-7,C.woodL);v.set(x,10,7,C.woodL);
    }
  }
  if(s===3){
    v.box(9,13,-3,16,13,3,palette([C.woodD,C.woodL]));
    for(const x of [-11,13])for(const z of [-5,5])v.box(x,12,z,x,15,z,C.woodD);
    for(let x=-10;x<=12;x++)if(x%4===0)for(const z of [-6,6])v.set(x,11,z,copper);
    v.box(-8,39,1,8,39,1,C.woodD);
    for(let y=17;y<=42;y++)v.set(-2,y,3,y%4===0?C.blue:canvas);
  }
}

export const coreDetails={
  hut:trimHut,fire:trimFire,water:trimWater,garden:trimGarden,pier:trimPier,
  lookout:trimLookout,workshop:trimWorkshop,farm:trimFarm,beacon:trimBeacon,ship:trimShip,
};
