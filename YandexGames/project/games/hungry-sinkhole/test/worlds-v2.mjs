import {sourceLook} from '../src/theme-catalog.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MAPS, genMap} from '../src/city.js';
import {Sim, initPhysics, DT} from '../src/sim.js';
import {EXPEDITIONS, expeditionStars} from '../src/expeditions.js';
import {botThink} from '../src/bots.js';
await initPhysics();
const report={maps:[],missions:EXPEDITIONS.length,regeneration:{},performance:[]};
const trees=new Set(['tree','pine','palm','sakura','snowpine','xtree','bamboo']);
assert.equal(MAPS.length,16);assert.equal(EXPEDITIONS.length,48);
for(const m of MAPS){
 const a=genMap(m.id,4100),b=genMap(m.id,4100);assert.deepEqual(a.items,b.items);
 assert.ok(a.items.length>500);assert.ok(a.items.every(i=>Number.isFinite(i.x)&&Number.isFinite(i.y)&&Number.isFinite(i.z)&&i.size.every(n=>n>0)));
 for(const l of EXPEDITIONS.filter(l=>l.map===m.id)){
  const map=genMap(m.id,l.seed),food=map.items.filter(it=>!it.grp);
  assert.ok(food.length>l.target*1.75,m.id+' enough ungrouped food');
  assert.ok(map.items.filter(it=>it.kind==='car').length>=l.cars,m.id+' cars');
  assert.ok(map.items.filter(it=>trees.has(sourceLook(it))).length>=l.trees,m.id+' trees');
  assert.ok(map.items.filter(it=>['crate','pallet'].includes(sourceLook(it))).length>=l.crates,m.id+' crates');
  assert.equal(expeditionStars(l,{eaten:l.target,cars:l.cars,trees:l.trees,crates:l.crates}),1);
 }
 const sim=new Sim(a,{regen:true,iters:2,maxBodies:110});assert.equal(sim.world.numSolverIterations,2);
 const hole=sim.addHole({me:true,name:'QA',x:0,z:0});sim.focus=hole;
 for(let i=0;i<60;i++)sim.step();
 assert.ok(sim.items.every(i=>[i.p.x,i.p.y,i.p.z].every(Number.isFinite)));
 report.maps.push({id:m.id,items:a.items.length,groups:sim.groups.size,looks:new Set(a.items.map(i=>i.look)).size});sim.free();
}
// Destroy and reconstruct an actual complete building, in safety; blocked respawn waits.
const sim=new Sim(genMap('town',81),{regen:true});
const[gid,g]=sim.groupHome.entries().next().value;
for(const it of [...sim.groups.get(gid)])sim.remove(it);
assert.ok(g.queued);sim.time=100;
const h=sim.addHole({me:true,name:'QA',x:g.x,z:g.z});sim._regenStep();assert.equal(g.alive,0,'no building appears under a hole');
h.x=sim.half+15;h.z=sim.half+15;sim.time=200;
for(let i=0;i<20 && g.queued;i++)sim._regenStep();
assert.equal(g.alive,g.n);assert.equal(g.queued,false);assert.ok(sim.events.some(e=>e.t==='regen'&&e.big));
report.regeneration={blockedNearPlayer:true,reconstructedPieces:g.n};sim.free();
const finite=new Sim(genMap('town',82),{regen:false});
const[finiteId,finiteHome]=finite.groupHome.entries().next().value;
finite.remove(finite.groups.get(finiteId)[0]);
assert.equal(finite.regenQ.length,0);
finite.enableRegen();assert.ok(finiteHome.queued,'finite-to-zen rebuilds older partial damage');
finite.time=200;for(let i=0;i<20&&finiteHome.queued;i++)finite._regenStep();
assert.equal(finiteHome.alive,finiteHome.n);finite.free();
report.regeneration.partialDamage=true;report.regeneration.finiteToZen=true;
// A bounded, reproducible simulation benchmark, excluding GPU draw time.
for(const id of ['town','neoncity','candyland']){
 const sim=new Sim(genMap(id,123),{regen:true,maxBodies:110,iters:2});
 for(let i=0;i<11;i++)sim.addHole({name:'bot'+i,bot:true,skill:.7,aggro:.2,x:-60+(i%4)*40,z:-50+Math.floor(i/4)*40});
 sim.focus=sim.holes[0];const times=[];let rebuilt=0;
 for(let i=0;i<3600;i++){
  const begin=performance.now();for(const h of sim.holes)botThink(sim,h,DT);sim.step();times.push(performance.now()-begin);
  rebuilt+=sim.events.filter(e=>e.t==='regen'&&e.big).length;sim.events.length=0;sim.added.length=0;sim.frozenNow?.splice(0);
 }
 times.sort((a,b)=>a-b);report.performance.push({id,seconds:60,p50:times[1800],p95:times[3420],p99:times[3564],max:times.at(-1),items:sim.items.length,rebuilt});sim.free();
}
fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/worlds-v2.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
