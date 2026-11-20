import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {runtime} from './runtime.mjs';
const out='test-results/living';fs.mkdirSync(out,{recursive:true});
await build({entryPoints:['test/scene-audit.js'],bundle:true,format:'iife',outfile:out+'/audit.js'});
const R=await runtime(),errors=[],report=[];
try{
 const p=await R.browser.newPage({viewport:{width:1280,height:800},locale:'ru-RU'});p.on('pageerror',e=>errors.push(e.message));
 p.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|shader error/i.test(m.text()))errors.push(m.text());});
 await p.addInitScript(()=>{window.__CS_DEBUG={manual:true};localStorage.setItem('castaway_solitaire_v1',JSON.stringify({coins:1000,level:1001,levels:Object.fromEntries(Array.from({length:1000},(_,i)=>[i+1,{stars:3,best:1000}])),stages:{},settings:{quality:'low'},seen:{coin:1,lock:1,sand:1,keys2:1,wild:1,tableTools:1}}));});
 await p.goto(R.base+'/dist-vk-single/index.html');await p.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));await p.addScriptTag({url:R.base+'/'+out+'/audit.js'});
 assert.equal(await p.evaluate(()=>document.documentElement.dataset.theme),'island');
 const starting=await p.evaluate(()=>{const I=__game.island;I.update(.05);I.render();__game.ui.home();document.documentElement.dataset.motion='off';return {people:I.walkers.length,crabs:I.crabs.length,gulls:I.gulls.length,turtles:I.turtles.length,land:I.landAnimals.map(w=>w.species),total:I.population.animals+I.gulls.length};});
 assert.deepEqual(starting,{people:2,crabs:1,gulls:1,turtles:0,land:['crab'],total:2});
 assert.ok(await p.evaluate(()=>{
   const [a,b]=__game.island.walkers;
   return Math.hypot(a.x-b.x,a.z-b.z)>6;
 }));
 await p.screenshot({path:out+'/starting-island.png'});report.push({starting});
 let previousAnimals=0,previousPeople=0;
 for(let tier=0;tier<=5;tier++){
  if(tier)assert.ok(await p.evaluate(()=>__game.expandIsland()));
  for(let stage=0;stage<=3;stage++){
   const audit=await p.evaluate(stage=>{const I=__game.island,stages=Object.fromEntries(Object.keys(I.spots).map(id=>[id,stage]));__save.data.stages=stages;I.setStages(stages);I.update(.05);return auditIsland(I);},stage);
   report.push({tier,stage,audit});assert.ok(audit.trees>=10,`Trees restored on coast ${tier}: ${audit.trees}`);assert.deepEqual(audit.overlaps,[],`Models ${tier}/${stage}`);assert.deepEqual(audit.buried,[],`Terrain ${tier}/${stage}`);assert.deepEqual(audit.decor,[],`Decoration ${tier}/${stage}`);
  }
  const inhabitants=await p.evaluate(()=>{
    const I=__game.island, xs=I.walkers.map(w=>w.x),zs=I.walkers.map(w=>w.z);
    const types=[...I.landAnimals.map(w=>w.species),...I.gulls.map(w=>w.userData.species),...I.turtles.map(w=>w.userData.species)];
    return {people:I.walkers.length,animals:types.length,types,
      spreadX:Math.max(...xs)-Math.min(...xs),spreadZ:Math.max(...zs)-Math.min(...zs),grids:I.navCache.size};
  });
  assert.equal(inhabitants.types.length,new Set(inhabitants.types).size);
  assert.ok(inhabitants.people>=previousPeople&&inhabitants.animals>=previousAnimals);previousPeople=inhabitants.people;previousAnimals=inhabitants.animals;
  assert.ok(inhabitants.grids<=4,JSON.stringify(inhabitants));
  if(tier===5)assert.ok(inhabitants.spreadX>=17&&inhabitants.spreadZ>=9,JSON.stringify(inhabitants));
  const motion=await p.evaluate(seconds=>{
   const I=__game.island,stats=I.allActors().map(w=>({id:w.id,species:w.species||'person',distance:0,minX:w.x,maxX:w.x,minZ:w.z,maxZ:w.z,invalid:0,buried:0,jumps:0}));let minTurtleDot=1,turtleCollisions=0;
   const times=[],busy=[],runners=new Set();
   I.update(.05);
   for(let k=0;k<seconds*20;k++){
    const old=I.allActors().map(w=>({x:w.x,z:w.z})),turtles=I.turtles.map(m=>m.position.clone());
    const start=performance.now();
    I.update(.05);
    times.push(performance.now()-start);
    let moving=0;
    I.allActors().forEach((w,i)=>{const s=stats[i],d=Math.hypot(w.x-old[i].x,w.z-old[i].z);s.distance+=d;s.minX=Math.min(s.minX,w.x);s.maxX=Math.max(s.maxX,w.x);s.minZ=Math.min(s.minZ,w.z);s.maxZ=Math.max(s.maxZ,w.z);if(!(w.species?I.faunaWalkable(w.x,w.z,w.radius+.06):I.walkable(w.x,w.z)))s.invalid++;if(w.m.position.y<I.ground(w.x,w.z)-.001)s.buried++;if(d>(w.speed||.9)*.05+.003)s.jumps++;
     if(d>.005&&!w.species){moving++;if(w.running)runners.add(w.id);}
    });
    if(k>100)busy.push(moving);
    I.turtles.forEach((m,i)=>{const dx=m.position.x-turtles[i].x,dz=m.position.z-turtles[i].z,len=Math.hypot(dx,dz);minTurtleDot=Math.min(minTurtleDot,(dx*Math.sin(m.rotation.y)+dz*Math.cos(m.rotation.y))/len);if(I.ground(m.position.x,m.position.z)>.2||I.staticEntries.some(b=>m.position.x>b.minX-.6&&m.position.x<b.maxX+.6&&m.position.z>b.minZ-.6&&m.position.z<b.maxZ+.6))turtleCollisions++;});
   }
   times.sort((a,b)=>a-b);
   return {stats,minTurtleDot,turtleCollisions,updateP95:times[Math.floor(times.length*.95)],updateP99:times[Math.floor(times.length*.99)],
    typicalMoving:busy.reduce((sum,n)=>sum+n,0)/busy.length,runners:[...runners]};
  },tier===0||tier===5?180:30);
  report.push({tier,inhabitants,motion});fs.writeFileSync(out+'/progress.json',JSON.stringify(report,null,2));
  assert.ok(motion.stats.every(s=>s.invalid===0&&s.buried===0&&s.jumps===0),JSON.stringify(motion));assert.ok(motion.stats.filter(s=>s.species==='crab').every(s=>s.distance>(tier===0||tier===5?8:1)),JSON.stringify(motion.stats));assert.ok(motion.minTurtleDot>.995);assert.equal(motion.turtleCollisions,0);
  if(tier===5){
    assert.ok(motion.typicalMoving>=20,JSON.stringify(motion));
    assert.ok(motion.runners.length>=6,JSON.stringify(motion.runners));
    console.log('Town movement',JSON.stringify({typicalMoving:motion.typicalMoving,runners:motion.runners,updateP95:motion.updateP95}));
  }
  console.log('PASS coast',tier,inhabitants);
 }
 assert.equal(previousPeople,38);
 assert.ok(report.some(r=>r.inhabitants?.types.includes('squirrel')),'Orchard attracts a squirrel');
 assert.ok(report.some(r=>r.inhabitants?.types.includes('monkey')),'Garden attracts monkeys');
 const details=await p.evaluate(()=>{
   const I=__game.island,{beacon,fountain,windmill,smokehouse,fire}=I.projObjs;
   const matrix=object=>object.grp.children.find(c=>c.isInstancedMesh).instanceMatrix.array[13];
   const droplets=matrix(fountain),smoke=matrix(smokehouse),embers=matrix(fire);
   const blades=windmill.model.children.find(c=>c.isGroup);
   const angle=blades.rotation.z;
   I.update(.05);
   I.render();
   return {
     landmark:beacon.area.maxY-I.spots.beacon.y,
     terrace:beacon.area.maxX-beacon.area.minX,
     lights:beacon.glows.length,
     beam:beacon.grp.children.some(c=>c.isGroup&&c!==beacon.model),
     rotations:new Set(Object.values(I.spots).map(s=>s.rot)).size,
     moving:[droplets!==matrix(fountain),smoke!==matrix(smokehouse),embers!==matrix(fire),angle!==blades.rotation.z],
     lines:I.walkers.every(w=>w.lines.ru.length>=7&&w.lines.en.length>=7),
     gait:I.allActors().every(w=>w.m.children[0].geometry.attributes.actorJoint.array.some(n=>n!==0)),
     batch:I.residentBatch.strides.some(n=>Math.abs(n)>.01)
   };
 });
 assert.ok(details.landmark>=6&&details.terrace>=6&&details.rotations>=12,JSON.stringify(details));
 assert.equal(details.lights,1);
 assert.equal(details.beam,false);
 assert.deepEqual(details.moving,[true,true,true,true]);
 assert.ok(details.lines&&details.gait&&details.batch,JSON.stringify(details));
 await p.evaluate(()=>{const I=__game.island;I.camT=null;I.cam.dist=I.baseDist()*1.06;I.update(.05);I.render();__game.ui.home();document.documentElement.dataset.motion='off';});await p.screenshot({path:out+'/populated-island.png'});
 const crowd=await p.evaluate(()=>{
   const I=__game.island,{mesh}=I.residentBatch;
   for(const w of I.walkers)for(const rise of [.55,.7,.4]){
     const {x,y}=I.project(w.x,w.m.position.y+rise,w.z);
     if(document.elementFromPoint(x,y)?.id==='c'&&I.pickIsland(x,y)?.actor===w){
       return {instances:mesh.instanceCount,drawn:mesh._multiDrawCount,x,y};
     }
   }
 });
 assert.ok(crowd&&crowd.instances===38&&crowd.drawn>=20,JSON.stringify(crowd));
 await p.mouse.click(crowd.x,crowd.y);
 assert.ok(await p.locator('.actor-speech').count());
 // Scale changes layout only, keeping card order and all gameplay state intact.
 await p.evaluate(()=>__game.playLevel(1));await p.evaluate(()=>{for(let i=0;i<80;i++)__game.table.update(.05);__game.island.update(.05);__game.island.render();__game.table.render();});
 const state=await p.evaluate(()=>JSON.stringify(__game.table.g)),width=await p.evaluate(()=>__game.table.cw);
 await p.locator('[data-scale-step="-5"]').click();assert.ok(await p.evaluate(()=>__game.table.cw)<width);assert.equal(await p.evaluate(()=>JSON.stringify(__game.table.g)),state);
 await p.locator('#cardScale').fill('80');await p.evaluate(()=>__game.table.render());await p.screenshot({path:out+'/island-behind-cards.png'});
 assert.equal(await p.locator('#shade').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
 await p.locator('[data-a=scene]').click();await p.locator('[data-style=lagoon]').click();assert.equal(await p.evaluate(()=>document.documentElement.dataset.theme),'lagoon');await p.locator('[data-x]').click();
 await p.locator('[data-a=scene]').click();await p.locator('[data-style=island]').click();await p.locator('[data-x]').click();
 await p.evaluate(()=>{__game.toIsland(false);__game.ui.settings();});assert.ok(await p.locator('[data-appearance]').isVisible());await p.locator('[data-appearance]').click();await p.waitForTimeout(350);await p.screenshot({path:out+'/scene-settings.png'});
 await p.evaluate(()=>{document.querySelector('#ui').innerHTML='<div style="background:#fff5df;display:grid;grid-template-columns:repeat(8,1fr);gap:18px;padding:30px;height:100vh;align-items:center">'+Object.entries(__icons).map(([key,svg])=>'<div style="display:flex;align-items:center;flex-direction:column;gap:8px"><div style="width:70px;height:70px">'+svg+'</div><span>'+key+'</span></div>').join('')+'</div>';});await p.screenshot({path:out+'/icons.png'});await p.close();
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({report,errors},null,2));console.log('PASS living island, spatial audit and card controls');
}finally{await R.close();}
