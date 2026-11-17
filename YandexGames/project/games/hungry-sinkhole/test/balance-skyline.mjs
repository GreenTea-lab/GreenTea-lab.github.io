import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Sim,initPhysics,scoreForMass} from '../src/sim.js';
import {genMap,MAPS,PROPS,CAR_SIZE} from '../src/city.js';
import {THEMED_PROPS} from '../src/theme-catalog.js';
import {foodMassFor} from '../src/food-balance.js';
await initPhysics();
const report={checks:[],objects:[],skylines:[],browserRun:false};
const check=(name,fn)=>{fn();report.checks.push(name);console.log('PASS',name);};
const empty=()=>({...genMap('town',1),items:[]});
const sim=new Sim(empty(),{regen:false});
for(const look of ['cone','crate','bench','lamp','tree','palm','umbrella','parasol','fountain','xtree','container']){
 const p=PROPS[look],it=sim.addItem({...p,look,kind:'prop',mat:p.mat||'prop',x:30,y:20,z:30});
 assert.ok(it.foodMass>0&&it.foodMass<=it.vol);
 report.objects.push({look,oldPoints:+(it.vol*10).toFixed(1),newPoints:+(it.foodMass*10).toFixed(1),reductionPercent:+((1-it.foodMass/it.vol)*100).toFixed(1)});
}
for(const [look,pts]of [['car',40],['bus',150],['truck',120]]){
 const it=sim.addItem({kind:'car',look,shape:'box',size:CAR_SIZE[look],pts,mat:'prop',x:30,y:20,z:30});report.objects.push({look,oldPoints:it.vol*10,newPoints:it.foodMass*10});
}
check('small food stays useful; sparse large props lose inflated collider rewards',()=>{
 for(const id of ['cone','crate','bench','lamp']){const r=report.objects.find(o=>o.look===id);assert.equal(r.newPoints,r.oldPoints);}
 for(const id of ['tree','palm','umbrella','parasol','fountain','xtree','container','bus','truck']){const r=report.objects.find(o=>o.look===id);assert.ok(r.newPoints<r.oldPoints*.85,id);}
 for(const [look,p]of Object.entries(THEMED_PROPS)){const it=sim.addItem({...p,kind:'prop',look,mat:'prop',x:30,y:20,z:30});assert.ok(Number.isFinite(it.foodMass)&&it.foodMass>0&&it.foodMass<=it.vol,look);}
});
check('collider geometry and physical mass remain independent of growth rewards',()=>{
 const a=sim.addItem({kind:'block',look:'plain',shape:'box',size:[12,1,6],mat:'concrete',x:30,y:20,z:30}),b=sim.addItem({kind:'block',look:'plain',shape:'box',size:[12,1,6],mat:'concrete',foodMass:1,x:50,y:20,z:50});sim.activate(a);sim.activate(b);assert.equal(a.body.mass(),b.body.mass());assert.deepEqual(a.size,b.size);assert.ok(a.foodMass<a.vol*.5);
});
check('repeated fragmentation conserves nutrition; scores and x2 use the same budget',()=>{
 const s=new Sim(empty(),{regen:false,maxBodies:110});const h=s.addHole({me:true,mass:10000,x:0,z:0});s.focus=h;
 const root=s.addItem({kind:'block',look:'plain',shape:'box',size:[12,1,6],mat:'concrete',x:0,y:20,z:0});s.activate(root);const budget=root.foodMass,volume=root.vol;
 s.chunkBudget=20;s.breakItem(root);const children=s.items.filter(i=>i.st===1);assert.equal(children.length,3);
 for(const it of children){s.chunkBudget=20;s.breakItem(it);}const leaves=s.items.filter(i=>i.st===1);assert.equal(leaves.length,9);
 assert.ok(Math.abs(leaves.reduce((v,i)=>v+i.foodMass,0)-budget)<1e-9);assert.ok(Math.abs(leaves.reduce((v,i)=>v+i.vol,0)-volume)<1e-9);
 const before=h.mass;h.grow=2;h.eff.x2=3;for(const it of leaves)s._eat(it,h);assert.ok(Math.abs(h.mass-before-budget*4)<1e-8);assert.equal(h.pts,scoreForMass(h.mass));s.free();
});
check('dust cannot award the original solid volume after a reward reduction',()=>{
 const s=new Sim(empty(),{regen:false});const h=s.addHole({mass:100,x:0,z:0});s.phys=[h];const it=s.addItem({kind:'block',look:'plain',shape:'box',size:[12,1,6],mat:'concrete',x:0,y:20,z:0});s.activate(it);s.chunkBudget=0;const n=it.foodMass;s.breakItem(it);assert.equal(h.mass,100+n*.5);s.free();
});
sim.free();
for(const m of MAPS)for(const seed of [4100,11,81]){
 const map=genMap(m.id,seed),s=new Sim(map,{regen:true,iters:2,maxBodies:110});
 const expected={town:1,metro:2,neoncity:2}[m.id]||0;assert.equal(map.landmarks.length,expected);
 for(const l of map.landmarks){const group=s.groups.get(l.group);assert.equal(group.length,l.parts);assert.ok(l.height>=60&&l.height<95);assert.ok(l.floors>=16);assert.ok(group.length<=128,'bounded whole-building activation');assert.ok(group.every(it=>[it.p.x,it.p.y,it.p.z,it.foodMass].every(Number.isFinite)));report.skylines.push({map:m.id,seed,...l});}
 assert.ok(s.items.every(it=>Number.isFinite(it.foodMass)&&it.foodMass>=0&&it.foodMass<=it.vol));s.free();
}
report.checks.push('all 16 maps and 3 seeds have bounded valid rewards and appropriate skylines');
check('Rapier keeps towers standing near a small hole and swallows them for a large one',()=>{
 for (const id of ['town','metro','neoncity']) {
  const map=genMap(id,4100), landmark=map.landmarks[0];
  map.items=map.items.filter(it=>it.grp===landmark.group);
  const s=new Sim(map,{regen:true,iters:2,maxBodies:110});
  const h=s.addHole({me:true,x:landmark.x,z:landmark.z});s.focus=h;
  const parts=s.groups.get(landmark.group), home=s.groupHome.get(landmark.group);
  const budget=parts.reduce((n,it)=>n+it.foodMass,0);
  for(let i=0;i<120;i++)s.step();
  assert.ok(parts.every(it=>it.st===0),id+' stays upright at starting size');
  const previousMass=h.mass=1800;
  for(let i=0;i<900&&home.alive;i++){
   s.step();s.events.length=s.added.length=0;s.frozenNow?.splice(0);
  }
  assert.equal(home.alive,0,id+' is swallowed by the large hole');
  assert.ok(h.mass>previousMass&&h.mass<=previousMass+budget+1e-8,id+' stays within its reward budget');
  h.alive=false;s.time=200;s._regenStep();
  const rebuilt=s.groups.get(landmark.group);
  assert.equal(home.queued,false,id+' rebuilds');
  assert.deepEqual(rebuilt.map(it=>it.size),parts.map(it=>it.size));
  assert.ok(Math.abs(rebuilt.reduce((n,it)=>n+it.foodMass,0)-budget)<1e-8);
  s.free();
 }
});
check('invalid nutrition cannot create NaN or exceed a fragment volume',()=>{assert.equal(foodMassFor({foodMass:Infinity},1),1);assert.equal(foodMassFor({foodMass:1e300},1),1);assert.equal(foodMassFor({},NaN),0);});
fs.mkdirSync('test-results/balance-skyline',{recursive:true});fs.writeFileSync('test-results/balance-skyline/report.json',JSON.stringify(report,null,2)+'\n');console.table(report.objects);console.log('BALANCE / SKYLINE PASS',report.checks.length,'checks;',report.skylines.length,'landmarks');
