import {Vox, jitter} from './vox.js';

export function voyageMonument(stage,C){
  const v=new Vox();
  const stone=0x607477, ivory=0xe8dfc6, teal=0x478e8d, bronze=0xbc8051, gold=0xe2b376;
  const masonry=(x,y,z)=>jitter(y%3===0?stone:0x78908c,x,y,z,.055);
  v.cyl(0,0,10,0,0,stone);
  v.cyl(0,0,9,1,2,masonry);
  v.cyl(0,0,8,3,3,ivory);
  v.box(-3,0,8,3,1,10,ivory);
  v.box(-3,2,8,3,2,9,stone);
  for(const side of [-1,1])for(let i=1;i<=7;i++){
    v.set(i*side,4,0,i>5?gold:teal);
    v.set(0,4,i*side,i>5?gold:teal);
    if(i<6){
      v.set(i*side,4,i,stone);
      v.set(i*side,4,-i,stone);
    }
  }
  v.cyl(0,0,2,4,4,gold);
  if(stage===1)return v;

  // A cast-bronze ship rises out of two stepped sea-glass waves.
  v.cyl(0,0,4,4,5,stone);
  for(let z=-6;z<=6;z++){
    const curl=Math.round(2*Math.sin((z+6)*.37)),height=7+curl;
    v.box(-3,4,z,-2,height,z,teal);
    v.set(-2,height+1,z,0x8db8ae);
    v.box(2,4,z,3,7-curl,z,teal);
    v.set(2,8-curl,z,0x8db8ae);
  }
  for(let z=-7;z<=7;z++){
    const half=Math.max(1,3-Math.floor(Math.abs(z)/2.4));
    const crest=11+Math.max(0,Math.abs(z)-4);
    v.box(-1,8,z,1,9,z,0x8e6950);
    v.box(-half,10,z,half,crest-1,z,bronze);
    v.box(-half,crest,z,half,crest,z,gold);
  }
  v.box(0,11,0,1,20,0,bronze);
  for(let y=13;y<=19;y++){
    const end=5-Math.floor((y-13)/2);
    v.box(0,y,1,0,y,end,y%3===0?gold:bronze);
  }
  if(stage<3)return v;

  v.box(0,20,0,0,27,0,gold);
  for(let x=0;x<=9;x++){
    const gutter=Math.round(Math.sin(x*.68)*2),top=26-Math.floor(x/4);
    for(let y=top-4;y<=top;y++)v.set(x,y,gutter,y===top-2?ivory:0xb76452);
  }
  v.set(0,28,0,gold);
  for(const x of [-6,6]){
    v.box(x-1,4,-4,x+1,5,-2,stone);
    v.set(x,6,-3,C.lamp);
  }
  v.box(-2,3,8,2,4,8,bronze);
  for(const x of [-1,0,1])v.set(x,4,9,gold);
  return v;
}
