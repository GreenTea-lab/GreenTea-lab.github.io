import {BUILD,VS} from './models.js';
import {PROJECTS} from './data.js';
const cache=new Map();
export const intersects=(a,b,pad=0)=>a.minX<b.maxX+pad&&a.maxX>b.minX-pad&&a.minZ<b.maxZ+pad&&a.maxZ>b.minZ-pad;
export function footprint(p){
 if(cache.has(p.id))return cache.get(p.id);
 const b={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity,minY:Infinity,maxY:-Infinity};
 for(let stage=1;stage<=3;stage++){
  const v=BUILD[p.id](stage),c=Math.cos(p.rot),s=Math.sin(p.rot);
  for(const x of [v.minX*VS,(v.maxX+1)*VS])for(const z of [v.minZ*VS,(v.maxZ+1)*VS]){
   const rx=x*c+z*s,rz=-x*s+z*c;b.minX=Math.min(b.minX,rx);b.maxX=Math.max(b.maxX,rx);b.minZ=Math.min(b.minZ,rz);b.maxZ=Math.max(b.maxZ,rz);
  }
  b.minY=Math.min(b.minY,v.minY*VS);b.maxY=Math.max(b.maxY,(v.maxY+1)*VS);
 }
 const marker=Math.round(p.r*8)*VS,c=Math.cos(p.rot),s=Math.sin(p.rot);
 for(const x of[-marker,marker+VS])for(const z of[-marker,marker+VS]){
  const rx=x*c+z*s,rz=-x*s+z*c;b.minX=Math.min(b.minX,rx);b.maxX=Math.max(b.maxX,rx);b.minZ=Math.min(b.minZ,rz);b.maxZ=Math.max(b.maxZ,rz);
 }
 cache.set(p.id,b);return b;
}
export const movedBox=(b,x,z)=>({...b,minX:b.minX+x,maxX:b.maxX+x,minZ:b.minZ+z,maxZ:b.maxZ+z});
export const contains=(b,x,z,pad=0)=>x>b.minX-pad&&x<b.maxX+pad&&z>b.minZ-pad&&z<b.maxZ+pad;
export function planSites(tier,shape){
 const placed={},reserved=[];
 for(const p of PROJECTS.filter(p=>(p.tier||0)<=tier)){
  const b=footprint(p);let best=null;
  let anchor=p.pos;
  if(p.id==='pier'){
   let shore=2;while(shore<16&&shape(p.pos[0],shore+.25)>.025)shore+=.25;
   anchor=[p.pos[0],shore-2];
  }
  // Search whole footprints, not just the model's pivot point.
  for(let ring=0;ring<=24&&!best;ring++){
   const radius=ring*.5,angles=ring?Math.max(12,ring*8):1;
   for(let k=0;k<angles;k++){
    const a=k/angles*Math.PI*2,x=Math.round((anchor[0]+Math.cos(a)*radius)*2)/2,z=Math.round((anchor[1]+Math.sin(a)*radius)*2)/2,box=movedBox(b,x,z);
    if(box.minX< -22||box.maxX>22||box.minZ< -17||box.maxZ>17||reserved.some(q=>intersects(box,q,.4)))continue;
    const samples=[[x,z],[box.minX,box.minZ],[box.maxX,box.minZ],[box.minX,box.maxZ],[box.maxX,box.maxZ]];
    if(samples.some(([xx,zz])=>shape(xx,zz)<(p.water?-.22:.055)))continue;
    // Keep every ordinary building off the central rocky hill.
    if(p.id!=='beacon'&&samples.some(([xx,zz])=>Math.hypot(xx+2.5,zz+6.5)<5.4))continue;
    best={x,z,rot:p.rot,r:p.r,box};break;
   }
  }
  if(!best)throw Error('No clear site for '+p.id+' at coast '+tier);
  placed[p.id]=best;reserved.push(best.box);
 }
 return placed;
}
