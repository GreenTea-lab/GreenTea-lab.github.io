import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Island} from '../src/island.js';
import {planSites} from '../src/spatial.js';
import {PROJECTS} from '../src/data.js';
import * as models from '../src/models.js';
import {worldScale} from '../src/world-data.js';
import {auditIsland} from './scene-audit.js';
import { WILDLIFE } from '../src/wildlife.js';
import { wildlifeGeometry } from '../src/wildlife-rig.js';
import { endResidentActivity,planResidentActivity,updateResidentActivity } from '../src/resident-activities.js';
import { DECOR,DECOR_FILTERS,restoreDecor } from '../src/decor.js';
const {BUILD,PEOPLE}=models;

function makeIsland(expansion){
  const I=Object.assign(Object.create(Island.prototype),{
    expansion,rx:15*worldScale(expansion),rz:11*worldScale(expansion),
    scene:new THREE.Scene(),mat:new THREE.MeshLambertMaterial(),glowMat:new THREE.MeshBasicMaterial(),
    glowTex:new THREE.Texture(),puffTex:new THREE.Texture(),
    staticEntries:[],projObjs:{},projectAreas:new Map(),builtAreas:[],walkers:[],stages:{},
    playerDecor:new Map(),trimmedGrass:new Set(),navCache:new Map(),navTerrain:new Uint8Array(30000),
    sun:{shadow:{}},oceanU:{time:{value:0}},applyCam(){},clouds:[],gulls:[],anims:[],fx:[],time:0,
  });
  I.sitePlan=planSites(expansion,(x,z)=>I.shapeF(x,z));
  I.buildTerrain();
  I.placeSpots();
  I.makeDecor();
  return I;
}

assert.equal(PEOPLE.length,25);
for(const {id} of PROJECTS){
  const stages=[1,2,3].map(stage=>BUILD[id](stage));
  assert.equal(new Set(stages.map(v=>v.m.size)).size,3,`${id} has distinct stages`);
}
for(const species of ['crab',...WILDLIFE.map(({id})=>id).filter(id=>id!=='turtle')]){
  const geometry=wildlifeGeometry(models[species](),species);
  const joints=geometry.getAttribute('actorJoint').array,index=geometry.index.array;
  assert.ok(joints.some((value,i)=>i%4===2&&value!==0),`${species} has moving limbs`);
  for(let i=0;i<index.length;i+=3)for(let component=0;component<4;component++){
    const value=joints[index[i]*4+component];
    if(value!==joints[index[i+1]*4+component]||value!==joints[index[i+2]*4+component]){
      assert.fail(`${species} triangle crosses different joints and could stretch`);
    }
  }
  geometry.dispose();
}
let island;
for(let tier=0;tier<=5;tier++){
  island=makeIsland(tier);
  const {beacon,pier}=island.spots;
  assert.ok(!island.spots.beach,'Beach upgrades do not require a flattened lot');
  assert.equal(beacon.y,5,'The lighthouse sits above the slope');
  const climb=[];
  for(let x=-3.25;x<=3.75;x+=.5)for(let z=2.75;z<=5.75;z+=.5){
    const xx=beacon.x+x,zz=beacon.z+z;
    if(island.summitTrail(xx,zz)!==null)climb.push({x:xx,z:zz,y:island.ground(xx,zz)});
  }
  const reached=climb.filter(p=>p.y===1);
  for(let start=0;start<reached.length;start++){
    const {x,y,z}=reached[start];
    for(const point of climb)if(Math.abs(point.x-x)+Math.abs(point.z-z)===.5&&Math.abs(point.y-y)<=.5&&!reached.includes(point))reached.push(point);
  }
  assert.ok(reached.some(p=>p.y>=4.5),`Coast ${tier} has a continuous approach from the foothill to the lighthouse`);
  assert.ok(island.shapeF(pier.x,pier.z+4)<0,'The pier extends into the sea');
  const terrainHeights=Array.from(island.hv),attrs=island.terrain.geometry.getAttribute('color').array;
  const originalColors=Float32Array.from(attrs);
  let previous=0;
  for(let stage=0;stage<=3;stage++){
    for(const project of PROJECTS)if(island.spots[project.id])island.placeProject(project,stage,false);
    island.stages.beach=stage;
    island.refreshShore(stage);
    if(stage){
      const quadrants=new Set(),modifications=[0,0,0,0];
      const quadrant=({x,z})=>(x<0?2:0)+(z<0?1:0);
      for(const tile of island.shoreTiles){
        if(Math.abs(attrs[tile.vertex*3]-originalColors[tile.vertex*3])>.015)modifications[quadrant(tile)]++;
      }
      for(const {x,z} of island.shoreEntries)quadrants.add((Math.round(Math.atan2(x/island.rx,z/island.rz)*2/Math.PI)+4)%4);
      assert.ok(modifications.every(count=>count>25),`Sand changes in all quadrants on coast ${tier}`);
      assert.equal(quadrants.size,4,`Beach furniture appears around coast ${tier}, stage ${stage}: ${JSON.stringify(island.shoreEntries.map(({x,z})=>[x,z]))}`);
      assert.ok(island.shoreEntries.length>previous,`Coast ${tier} beach furniture at stage ${stage}: ${previous} → ${island.shoreEntries.length}`);
      if(stage===3)assert.ok(island.shoreEntries.some(entry=>entry.maxY-entry.base>=1.24),`Coast ${tier} has a beach pavilion`);
      previous=island.shoreEntries.length;
      assert.deepEqual(Array.from(island.hv),terrainHeights,'Beach upgrades preserve the terrain profile');
    }
    for(const time of [.05,1.9,3.4,6.7,10.1,13.7]){
      island.projObjs.windmill?.animate?.(time);
      const {overlaps,buried,decor,trees}=auditIsland(island);
      assert.ok(trees>=10);
      assert.deepEqual({overlaps,buried,decor},{overlaps:[],buried:[],decor:[]},`Coast ${tier}, stage ${stage}`);
    }
  }
  console.log(`Coast ${tier}: land, beach and all building stages passed`);
}

island.builtAreas=Object.values(island.projObjs).map(p=>p.area);
island.stages=Object.fromEntries(PROJECTS.map(({id})=>[id,3]));
island.landAnimals=[];
island.turtles=[island.makeTurtle(0)];
island.makeBirds();
const animatedParts=[...island.gulls,...island.turtles].flatMap(root=>{
  const parts=[];
  root.traverse(object=>parts.push({object,scale:object.scale.clone()}));
  return parts;
});
island.makeActorShadows();
island.updatePeople(Object.fromEntries(PROJECTS.map(({id})=>[id,3])));
assert.equal(island.walkers.length,25);
assert.ok(island.walkers.every(w=>!island.nearResident(w)));
const [a,b,c]=island.walkers;
const road=island.navigation(a).points.find(p=>!island.nearResident(a,p)&&island.navigation(a).has(p.x+.5,p.z));
for(const w of [a,b,c]){
  Object.assign(w,road,{wait:9});
  w.m.position.set(road.x,island.ground(road.x,road.z),road.z);
}
for(let frame=0;frame<60;frame++)island.update(.05);
assert.ok(animatedParts.every(({object,scale})=>object.scale.equals(scale)),'Flying and swimming do not rescale wings, head or flippers');
assert.ok([a,b,c].every(w=>!island.nearResident(w)),'Stacked residents separate even while idle');

let farthest=0,moving=0;
const activities=new Set();
const totals=new Map(island.walkers.map(w=>[w,0]));
for(let frame=0;frame<1500;frame++){
  const old=island.walkers.map(({x,z})=>({x,z}));
  island.update(.05);
  for(const [i,w] of island.walkers.entries()){
    const distance=Math.hypot(w.x-old[i].x,w.z-old[i].z);
    assert.ok(distance<=w.speed*.05+.001,'Residents never teleport around traffic');
    assert.ok(island.walkable(w.x,w.z),'Residents stay on accessible land');
    assert.ok(!island.nearResident(w),'Passing residents keep space between models');
    totals.set(w,totals.get(w)+distance);
    if(w.activity?.started!=null)activities.add(w.activity.id);
    if(frame>200&&distance>.005)moving++;
    farthest=Math.max(farthest,distance);
  }
}
const stuck=[...totals].filter(([,distance])=>distance<=3).map(([w,distance])=>({id:w.id,x:w.x,z:w.z,distance,grid:island.navigation(w).has(w.x,w.z)}));
assert.deepEqual(stuck,[],'No resident is stuck');
assert.ok(activities.size>=3,`Residents perform several jobs: ${[...activities]}`);
for(const w of island.walkers){endResidentActivity(island,w);w.route=[];}
for(const [resident,job,site] of [
  ['yanek','repair','workshop'],['rita','water','garden'],['stefan','fish','pier'],
  ['reader','read','library'],['felix','music','pavilion'],
]){
  const w=island.walkers.find(w=>w.id===resident),grid=island.navigation(w);
  // Keep the fixture near its usual workplace and clear of another resident.
  const spot=island.spots[site],target={x:spot.x,z:spot.z};
  const distance=p=>(p.x-target.x)**2+(p.z-target.z)**2;
  const start=grid.points.filter(p=>!island.nearResident(w,p)).sort((a,b)=>distance(a)-distance(b))[0];
  Object.assign(w,start,{nextActivity:0,activityCycle:0});
  assert.ok(planResidentActivity(island,w,grid));
  const task=w.activity;
  assert.equal(task.id,job,`The ${resident} job follows their role`);
  assert.ok(w.route.length>1&&island.walkable(task.point.x,task.point.z));
  Object.assign(w,task.point);
  assert.ok(updateResidentActivity(island,w,.05));
  const props=task.prop.group;
  assert.ok(!w.m.visible&&props.parent===island.scene,'Tools are drawn alongside batched residents');
  island.time+=.55;
  assert.ok(updateResidentActivity(island,w,.05));
  assert.notEqual(w.m.gait.value.y,0,'The working arm moves independently');
  assert.equal(w.m.gait.value.x,0,'The feet stay planted during a task');
  if(task.water){
    const p=task.prop.positions;
    assert.ok(island.ground(p.getX(2),p.getZ(2))<.3,'The fishing line reaches water');
  }
  island.time+=task.job.seconds;
  assert.equal(updateResidentActivity(island,w,.05),false);
  assert.equal(props.parent,null);
  assert.equal(w.activity,null);
}
island.updatePeople({});
assert.equal(island.walkers.length,2);
assert.equal(island.residentBatch,null);
assert.ok(island.walkers.every(w=>w.m.visible),'Returning to the first stage shows its residents');
const early=makeIsland(0);
early.landAnimals=[];
early.turtles=[];
early.makeActorShadows();
early.updatePeople({});
const earlyJobs=new Set();
for(let frame=0;frame<900;frame++){
  early.update(.05);
  for(const w of early.walkers)if(w.activity?.started!=null)earlyJobs.add(w.activity.id);
}
assert.ok(earlyJobs.size>0&&[...earlyJobs].every(job=>job==='wood'||job==='shell'),'Starting residents only use activities available before construction');
assert.equal(new Set(DECOR.map(def=>def.id)).size,43,'The catalog has 43 unique decorative objects');
for(const def of DECOR){
  assert.ok(DECOR_FILTERS.some(([section])=>section===def.section)&&def.ru&&def.en);
  for(const turn of [0,1]){
    const shape=early.decorShape(def,turn);
    let position;
    for(let x=-13.75;x<=13.75&&!position;x+=.5)for(let z=-9.75;z<=9.75;z+=.5){
      if(early.decorPlacement(shape,x,z)){position={x,z};break;}
    }
    assert.ok(position,`${def.id} has a valid starting-island placement at rotation ${turn}`);
    const [stored]=restoreDecor([{id:1,type:def.id,turn,...position}]);
    assert.ok(early.installDecor(stored),`${def.id} reloads and produces render geometry`);
    assert.equal(early.playerDecor.get(1).entry.blocks,!(def.groundCover||def.walkable));
    assert.ok(early.storeDecor(1));
  }
}
console.log('All 43 decorations can be stored, restored and placed at two rotations');
console.log(`Population, traffic and resident activities passed (${(moving/1299).toFixed(1)} residents moving per frame, up to ${farthest.toFixed(3)} m per step)`);
