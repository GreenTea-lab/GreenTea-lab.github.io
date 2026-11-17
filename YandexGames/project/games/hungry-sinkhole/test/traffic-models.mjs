import fs from 'node:fs';
import assert from 'node:assert/strict';
import {MAPS,genMap,CAR_SIZE,PROPS} from '../src/city.js';
import {Sim,initPhysics,DT} from '../src/sim.js';
import {makeModels} from '../src/models.js';
import {lanePose,footprintOverlap} from '../src/traffic.js';
await initPhysics();const report={models:[],traffic:[],physicsGuard:false};
const models=makeModels();
for(const[id,g]of Object.entries(models)){
  g.computeBoundingBox();const pos=g.attributes.position,normal=g.attributes.normal,col=g.attributes.color,tint=g.attributes.aTint;
  const count=g.index?.count||pos.count;
  assert.ok(pos.count>0&&count%3===0,id+' triangles');
  for(const attr of [pos,normal,col,tint]){assert.equal(attr.count,pos.count,id+' attribute sizes');assert.ok(attr.array.every(Number.isFinite),id+' finite geometry');}
  const size=CAR_SIZE[id]||PROPS[id]?.size||(id.startsWith('person')?[.55,1.7,.45]:null);
  const bounds=g.boundingBox,extent=[bounds.max.x-bounds.min.x,bounds.max.y-bounds.min.y,bounds.max.z-bounds.min.z];
  if(size&&!g.userData.fitCollider)assert.ok(Math.abs(bounds.min.y+size[1]/2)<.025,id+' rests on ground');
  if(CAR_SIZE[id])assert.ok(extent.every((n,i)=>n<=size[i]+.025),id+' collider encloses model');
  report.models.push({id,triangles:count/3,vertices:pos.count,extent:extent.map(n=>+n.toFixed(3)),overhang:size?extent.map((n,i)=>+(n/size[i]).toFixed(2)):null});
}
assert.ok(report.models.length>=88);
for(const m of MAPS)for(const seed of [4100,11,81]){
  const map=genMap(m.id,seed),sim=new Sim(map,{regen:false}),cars=sim.items.filter(it=>it.kind==='car'&&it.agent);
  const travelled=new Map(cars.map(it=>[it.id,0]));let maxStep=0;
  const lastMoved=new Map(cars.map(it=>[it.id,0]));
  for(const it of sim.items.filter(it=>it.kind==='car'))assert.equal(sim._trafficBlocked(it,{...it.p,yaw:Math.atan2(2*it.q.w*it.q.y,1-2*it.q.y*it.q.y)}),false,m.id+' clean spawn '+it.look);
  for(let tick=0;tick<5400;tick++){
    const old=cars.map(it=>({x:it.p.x,z:it.p.z}));sim.tick++;sim.time+=DT;sim._agents();
    for(let i=0;i<cars.length;i++){
      const it=cars[i],distance=Math.hypot(it.p.x-old[i].x,it.p.z-old[i].z);maxStep=Math.max(maxStep,distance);travelled.set(it.id,travelled.get(it.id)+distance);
      if(distance>.001)lastMoved.set(it.id,tick);
      assert.ok(distance<.5,m.id+' no road teleport: '+distance);
      if(tick%30===0)assert.equal(sim._trafficBlocked(it,{...it.p,yaw:it.agent.yaw}),false,m.id+' car does not enter a wall');
    }
  }
  const moving=[...travelled.values()].filter(n=>n>25).length;
  const finalIdle=Math.max(0,...[...lastMoved.values()].map(t=>(5399-t)/60));
  assert.ok(finalIdle<20,m.id+' no long final standstill: '+finalIdle+'s');
  if(cars.length)assert.ok(moving>=cars.length*.95,m.id+' traffic keeps moving '+moving+'/'+cars.length);
  report.traffic.push({map:m.id,seed,cars:cars.length,moving,seconds:90,maxStep,finalIdle});sim.free();console.log('TRAFFIC',m.id,seed,moving+'/'+cars.length,maxStep.toFixed(3),'idle',finalIdle.toFixed(1));
}
const sim=new Sim(genMap('town',19),{}),car=sim.items.find(it=>it.agent?.type==='car'),wall=sim.items.find(it=>it.grp&&it.p.y<2);
const before={...car.p};sim.activate(car);car.body.setTranslation({x:wall.p.x,y:car.size[1]/2,z:wall.p.z},true);sim._sync();
assert.ok(Math.hypot(car.p.x-before.x,car.p.z-before.z)<.001,'physics restores last safe car pose');
car.body.setTranslation({x:wall.p.x,y:car.size[1]/2,z:wall.p.z},true);car.body.sleep();sim.freeze(car);
assert.ok(Math.hypot(car.p.x-before.x,car.p.z-before.z)<.001,'sleeping car cannot freeze inside a wall');report.physicsGuard=true;sim.free();
fs.mkdirSync('test-results/traffic-models',{recursive:true});fs.writeFileSync('test-results/traffic-models/report.json',JSON.stringify(report,null,2)+'\n');console.log('MODELS',report.models.length,'PASS');
