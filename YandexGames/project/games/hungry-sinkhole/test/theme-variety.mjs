import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {MAPS,genMap} from '../src/city.js';
import {makeModels} from '../src/models.js';
import {ROLES,themeId,MODEL_OWNER,sourceLook} from '../src/theme-catalog.js';
import {EXPEDITIONS} from '../src/expeditions.js';
import {Sim,initPhysics} from '../src/sim.js';
const models=makeModels(),presence=new Map(),samples=[];
for(const m of MAPS)for(const seed of new Set([4100,11,81,...EXPEDITIONS.filter(l=>l.map===m.id).map(l=>l.seed)])){
 const map=genMap(m.id,seed),items=map.items.filter(i=>!i.grp&&(models[i.look]||i.look==='person'));
 const kinds=new Set(items.flatMap(i=>i.look==='person'?['person0','person1','person2','person3']:[i.look]));
 for(const k of kinds){if(!presence.has(k))presence.set(k,new Set());presence.get(k).add(m.id);}
 samples.push({map:m.id,seed,items,kinds});
}
const report={maps:[],geometry:{},semanticRegeneration:false};
// Establish exclusivity from actual generated maps, including actors and vehicles.
for(const s of samples){
 const unique=k=>presence.get(k)?.size===1&&presence.get(k).has(s.map);
 const uniqueItems=s.items.filter(i=>unique(i.look)).length,uniqueKinds=[...s.kinds].filter(unique).length;
 assert.ok(uniqueItems/s.items.length>=.75,s.map+' majority of placed models are exclusive');
 assert.ok(uniqueKinds/s.kinds.size>.5,s.map+' majority of distinct model kinds are exclusive');
 for(const role of ROLES)assert.ok(s.kinds.has(themeId(s.map,role)),s.map+' includes '+role);
 for(const k of s.kinds)if(MODEL_OWNER[k])assert.equal(MODEL_OWNER[k],s.map,k+' belongs to its world');
 report.maps.push({map:s.map,seed:s.seed,models:s.items.length,exclusiveModels:uniqueItems,exclusivePercent:+(100*uniqueItems/s.items.length).toFixed(1),kinds:s.kinds.size,exclusiveKinds:uniqueKinds,exclusiveKindsPercent:+(100*uniqueKinds/s.kinds.size).toFixed(1)});
}
// Geometry comparisons ignore colours and vertex indexing: renamed/recoloured copies fail.
for(const role of ROLES){const hashes=new Set();for(const m of MAPS){
 const g=models[themeId(m.id,role)],p=g.attributes.position,coords=[];
 for(let i=0;i<(g.index?.count||p.count);i++){const j=g.index?g.index.getX(i):i;coords.push(Math.round(p.getX(j)*1e5),Math.round(p.getY(j)*1e5),Math.round(p.getZ(j)*1e5));}
 const hash=crypto.createHash('sha256').update(JSON.stringify(coords)).digest('hex');assert.ok(!hashes.has(hash),m.id+' '+role+' unique shape, not just paint');hashes.add(hash);
 assert.ok(g.boundingBox.min.toArray().every(v=>v>=-.501)&&g.boundingBox.max.toArray().every(v=>v<=.501));
 }report.geometry[role]=hashes.size;}
await initPhysics();
const sim=new Sim(genMap('aurora',11),{regen:true});
const it=sim.items.find(i=>i.sourceLook==='crate');assert.ok(it,'themed cargo preserves crate meaning');
const home=it.home;sim.remove(it);sim.time=300;sim._regenStep();
const rebuilt=sim.items.find(i=>i!==it&&i.home===home);assert.ok(rebuilt);assert.equal(sourceLook(rebuilt),'crate');assert.equal(rebuilt.look,it.look);sim.free();report.semanticRegeneration=true;
fs.mkdirSync('test-results/theme-variety',{recursive:true});fs.writeFileSync('test-results/theme-variety/report.json',JSON.stringify(report,null,2)+'\n');
console.log('THEME VARIETY PASS',report.maps.length,'worlds;',Object.values(report.geometry).reduce((a,b)=>a+b,0),'different meshes');
console.table(MAPS.map(m=>report.maps.find(r=>r.map===m.id&&r.seed===4100)));
