import {sourceLook} from '../src/theme-catalog.js';
// Exercise the real movement, growth and swallowing rules using a greedy route.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Sim,initPhysics,DT,fitOf} from '../src/sim.js';
import {genMap} from '../src/city.js';
import {EXPEDITIONS,expeditionStars} from '../src/expeditions.js';
const trees=new Set(['tree','pine','palm','sakura','snowpine','xtree','bamboo']);
await initPhysics();const report=[];
for(const level of EXPEDITIONS){
 const map=genMap(level.map,level.seed),sim=new Sim(map,{maxBodies:110,iters:2,regen:false,seed:level.seed,pickups:4});
 const h=sim.addHole({name:'Route',me:true,x:map.lines[2],z:0,grow:2});sim.focus=h;
 const st={eaten:0,cars:0,trees:0,crates:0};let target=null;const visited=new Map();
 for(let i=0;i<level.time*60;i++){
  if(!target || target.st===2 || i%120===0){
   let best=Infinity;target=null;
   for(const it of sim.items){if(it.st!==0||it.grp||fitOf(it)>h.r*.96)continue;
    let distance=Math.hypot(it.p.x-h.x,it.p.z-h.z);
    if((visited.get(it.id)||0)>300)distance+=80;
    if(st.eaten>=level.target && ((st.cars<level.cars&&it.kind==='car') || (st.trees<level.trees&&trees.has(sourceLook(it))) || (st.crates<level.crates&&['crate','pallet'].includes(sourceLook(it)))))distance*=.12;
    if(distance<best){best=distance;target=it;}
   }
  }
  if(target){visited.set(target.id,(visited.get(target.id)||0)+1);const dx=target.p.x-h.x,dz=target.p.z-h.z,len=Math.hypot(dx,dz)||1;h.dirX=dx/len;h.dirZ=dz/len;h.throttle=len<.3?0:1;}
  sim.step();
  for(const e of sim.events)if(e.t==='eat'&&e.h===h){st.eaten++;if(e.it.kind==='car')st.cars++;if(trees.has(sourceLook(e.it)))st.trees++;if(['crate','pallet'].includes(sourceLook(e.it)))st.crates++;}
  sim.events.length=0;sim.added.length=0;sim.frozenNow?.splice(0);
  if(expeditionStars(level,st)===3)break;
 }
 const stars=expeditionStars(level,st);report.push({id:level.id,map:level.map,stars,...st,seconds:Math.round(sim.time)});sim.free();
 console.log(level.id,level.map,stars,st.eaten,st.cars,st.trees);
}
fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/expedition-routes.json',JSON.stringify(report,null,2)+'\n');
assert.ok(report.every(r=>r.stars>=1),'Every mission has an executable route with no upgrades');
