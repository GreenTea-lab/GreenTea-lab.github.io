import fs from 'node:fs';
import assert from 'node:assert/strict';
import {makeModels} from '../src/models.js';
import {POLISHED_MODELS} from '../src/model-details.js';
import {EXTRA_PROPS,EXTRA_CARS} from '../src/model-catalog.js';
import {THEMED_PROPS} from '../src/theme-catalog.js';
import {MAPS,genMap,CAR_SIZE} from '../src/city.js';
import {Sim,initPhysics} from '../src/sim.js';
const models=makeModels(),newIds=Object.keys({...EXTRA_PROPS,...EXTRA_CARS,...THEMED_PROPS});
const baseline=JSON.parse(fs.readFileSync('test/fixtures/models-2.0.1.json')).models;
assert.equal(Object.keys(models).length,312);assert.equal(newIds.length,224);assert.equal(POLISHED_MODELS.length,88);
const changed=[];
for(const old of baseline){const g=models[old.id];assert.ok(g.userData.polished&&g.userData.details,old.id+' individual polish');assert.ok((g.index?.count||g.attributes.position.count)/3>old.triangles,old.id+' has actual new geometry');changed.push(old.id);}
for(const[id,g]of Object.entries(models)){
 assert.ok(g.attributes.aTint.array.every(v=>v>=0&&v<=1),id+' valid tint weights');
 const h=g.boundingBox.max.y-g.boundingBox.min.y;
 assert.ok(h>0);for(const attr of Object.values(g.attributes))assert.ok(attr.array.every(Number.isFinite),id+' finite mesh');
 if(newIds.includes(id)){const spec=g.userData.fitCollider?[1,1,1]:EXTRA_PROPS[id]?.size||EXTRA_CARS[id],b=g.boundingBox;assert.ok(Math.abs(b.min.y+spec[1]/2)<.025,id+' ground alignment');
  assert.ok([b.max.x-b.min.x,h,b.max.z-b.min.z].every((n,i)=>n<=spec[i]+.05),id+' physical bounds');}
}
const triangles=Object.values(models).reduce((sum,g)=>sum+(g.index?.count||g.attributes.position.count)/3,0);assert.ok(triangles<180000,'mesh budget');
const vertices=Object.values(models).reduce((sum,g)=>sum+g.attributes.position.count,0),sourceVertices=Object.values(models).reduce((sum,g)=>sum+g.userData.sourceVertices,0);
assert.ok(vertices<sourceVertices*.65,'indexed vertex budget');
for(const[id,g]of Object.entries(models))assert.ok(g.index.array.every(i=>i<g.attributes.position.count),id+' valid indices');
const seen=new Set(),maps=[];
for(const m of MAPS){const map=genMap(m.id,4100),items=map.items.filter(it=>newIds.includes(it.look));items.forEach(it=>seen.add(it.look));assert.ok(items.length>=20,m.id+' new props in the actual map');maps.push({map:m.id,items:items.length,kinds:[...new Set(items.map(it=>it.look))]});}
assert.deepEqual(newIds.filter(id=>!seen.has(id)),[],'every new model is used');
await initPhysics();
// Swallow one of every new prop using the real simulation, including vehicle variants.
const sim=new Sim(genMap('town',7),{regen:true}),hole=sim.addHole({me:true,name:'QA',mass:20000,x:0,z:0});
for(const id of newIds){const spec=EXTRA_PROPS[id]||THEMED_PROPS[id],size=spec?.size||CAR_SIZE[id],it=sim.addItem({kind:spec?'prop':'car',look:id,size,shape:spec?.shape||'box',mat:'prop',x:0,y:size[1]/2,z:0});const score=hole.pts;sim._eat(it,hole);assert.equal(it.st,2);assert.ok(hole.pts>score,id+' adds mass');}
sim.free();
// Exercise the full eat -> delayed regeneration lifecycle for every new model,
// using real generated item specs in an otherwise clear map.
const samples=new Map();for(const m of MAPS)for(const it of genMap(m.id,4100).items)if(newIds.includes(it.look)&&!samples.has(it.look))samples.set(it.look,it);
for(const[id,spec]of samples){
 const map=genMap('town',7);map.items=[spec];const s=new Sim(map,{regen:true});
 const h=s.addHole({me:true,name:'QA',mass:20000,x:spec.x,z:spec.z}),it=s.items[0];s._eat(it,h);
 assert.equal(s.regenQ.length,1,id+' queued after eating');s.time=200;s._regenStep();
 for(const o of s.items.filter(o=>o.st!==2))assert.ok(Math.hypot(o.p.x-h.x,o.p.z-h.z)>h.r+o.footR+4,id+' never regrows under the player');
 h.alive=false;s.time=300;s._regenStep();assert.ok(s.items.some(o=>o.look===id&&o.st!==2),id+' regenerates');s.free();
}
const report={models:312,existingDetailed:changed,newIds,triangles,vertices,sourceVertices,maps,swallowing:true,regenerated:samples.size};fs.mkdirSync('test-results/model-expansion',{recursive:true});fs.writeFileSync('test-results/model-expansion/report.json',JSON.stringify(report,null,2)+'\n');console.log('MODEL EXPANSION PASS',312,'models;',triangles,'triangles;',vertices+'/'+sourceVertices,'vertices;',maps.length,'maps');
