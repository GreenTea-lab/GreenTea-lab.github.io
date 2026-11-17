import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {MAPS,genMap} from '../src/city.js';
import {SKINS} from '../src/data.js';
import {DEFAULT,sanitizeSave} from '../src/save-schema.js';
import {challengeFor,ensureOffline,festivalInfo,RECIPES,craft,placeDecoration,claimFestival,awardOfflineRun,mapStickers,normalizeOffline,ingredientFor} from '../src/offline.js';
import {Sim,initPhysics,fitOf,DT} from '../src/sim.js';
import {botThink} from '../src/bots.js';
import {RainDirector} from '../src/rain.js';
import {View} from '../src/render.js';
const report={browserRun:false,checks:[],rain:[],dailyRoutes:[]};
function check(name,fn){fn();report.checks.push(name);console.log('PASS',name);}
check('every map has a distinct mastery skin; old stars unlock it retroactively',()=>{
 assert.equal(SKINS.length,46);assert.equal(new Set(SKINS.map(s=>s.id)).size,46);
 const d=DEFAULT();for(const [i,m]of MAPS.entries()){assert.equal(SKINS.filter(s=>s.mastery===m.id).length,1);d.expeditions[i*3+1]=1;}
 ensureOffline(d);assert.equal(d.skins.length,17);ensureOffline(d);assert.equal(d.skins.length,17);
 for(const m of MAPS)assert.deepEqual(mapStickers(d,m.id).owned,[true,false,false]);d.expeditions[2]=3;d.expeditions[3]=3;assert.deepEqual(mapStickers(d,'town').owned,[true,true,false]);d.expeditions[1]=3;assert.deepEqual(mapStickers(d,'town').owned,[true,true,true]);
});
check('recipes spend exact ingredients once, decorate six saved slots and unlock cosmetics',()=>{
 const d=DEFAULT(),o=ensureOffline(d);for(const k in o.pantry)o.pantry[k]=1000;
 for(const r of RECIPES){const before={...o.pantry};assert.equal(craft(d,r.id),true);for(const [k,n]of Object.entries(r.cost))assert.equal(o.pantry[k],before[k]-n);assert.equal(craft(d,r.id),false);}
 for(const s of SKINS.filter(s=>s.craft))assert.ok(d.skins.includes(s.id));
 assert.equal(placeDecoration(d,0,'decor11'),true);assert.equal(placeDecoration(d,7,'decor0'),false);assert.equal(placeDecoration(d,2,'unknown'),false);assert.equal(placeDecoration(d,0,null),true);
 assert.deepEqual(sanitizeSave(d).offline.placements,o.placements);const poor=DEFAULT();assert.equal(craft(poor,'decor0'),false);
});
check('weekly personal event resets on Monday, persists rewards and rejects duplicate claims',()=>{
 const d=DEFAULT(),day='2026-11-17',o=ensureOffline(d,day);assert.equal(festivalInfo(day).id,festivalInfo('2026-11-22').id);assert.notEqual(festivalInfo(day).id,festivalInfo('2026-11-23').id);
 for(let i=0;i<10;i++)awardOfflineRun(d,{mode:'battle',elapsed:120,stats:{eaten:250,trees:10,cars:5},loot:{leaf:50}},day);
 assert.equal(o.season.points,360);assert.equal(o.pantry.leaf,300);const before=d.coins;
 for(let n=1;n<=12;n++){assert.equal(claimFestival(d,n,day),true);assert.equal(claimFestival(d,n,day),false);}assert.equal(d.coins,before+55);const skin=festivalInfo(day).skin;assert.ok(d.skins.includes(skin));
 ensureOffline(d,'2026-11-23');assert.equal(d.offline.season.points,0);assert.ok(d.skins.includes(skin));
});
check('daily reward is once per date and replay keeps the best personal score',()=>{
 const day='2026-11-17',d=DEFAULT(),challenge=challengeFor(day);assert.deepEqual(challengeFor(day),challenge);assert.notEqual(challengeFor('2026-11-18').seed,challenge.seed);
 const run={mode:'daily',elapsed:120,stats:{eaten:challenge.target},challenge,pts:900};assert.equal(awardOfflineRun(d,run,day).dailyReward,true);assert.equal(d.coins,15);run.pts=800;assert.equal(awardOfflineRun(d,run,day).dailyReward,false);assert.equal(d.coins,15);assert.equal(d.offline.daily[day].best,900);
 const before=JSON.stringify(d.offline);awardOfflineRun(d,{...run,mode:'duel',loot:{wood:30}},day);assert.equal(JSON.stringify(d.offline),before);
});
check('malformed expansion saves are bounded and keep only valid cosmetics',()=>{
 const o=normalizeOffline({pantry:{wood:Infinity,leaf:-5,metal:1e300},crafted:['decor0','decor0','bad'],placements:['bad','decor0'],daily:{bad:{}},season:{id:'2026-11-16',points:Infinity,claimed:[1,1,99],goals:{cars:NaN},paid:['cars','unknown']}});
 assert.equal(o.pantry.wood,0);assert.equal(o.pantry.metal,9999);assert.deepEqual(o.crafted,['decor0']);assert.deepEqual(o.placements,[null,'decor0',null,null,null,null]);assert.deepEqual(o.season.claimed,[1]);assert.deepEqual(o.season.paid,['cars']);assert.equal(o.season.points,0);
});
check('materials use original prop semantics, including themed trees and vehicles',()=>{assert.equal(ingredientFor({look:'theme_town_tree',sourceLook:'pine'}),'leaf');assert.equal(ingredientFor({kind:'car'}),'metal');assert.equal(ingredientFor({look:'cupcake'}),'sweet');assert.equal(ingredientFor({sourceLook:'crate'}),'wood');});
check('split renderer uses two scissored cameras on one context and restores its viewport',()=>{
 const saved=globalThis.window;globalThis.window={innerWidth:844,innerHeight:390};let calls=0;const views=[];
 const renderer={setScissorTest(){},setViewport(...v){views.push(v);},setScissor(){},render(){calls++;}};
 const view={renderer,camera:new THREE.PerspectiveCamera(),scene:new THREE.Scene(),splitPlayers:[{x:0,z:0,r:1},{x:50,z:50,r:3}]};View.prototype.render.call(view);assert.equal(calls,2);assert.deepEqual(views,[[0,0,422,390],[422,0,422,390],[0,0,844,390]]);
 globalThis.window={innerWidth:390,innerHeight:844};views.length=0;View.prototype.render.call(view);assert.deepEqual(views,[[0,422,390,422],[0,0,390,422],[0,0,390,844]]);globalThis.window=saved;
});
globalThis.window={__HS_DEBUG:{},innerWidth:844,innerHeight:390};globalThis.document={hidden:false,body:{classList:{add(){},remove(){}}},documentElement:{lang:'ru'}};globalThis.localStorage={getItem(){return null},setItem(){}};
const {Game}=await import('../src/game.js'),{save}=await import('../src/save.js'),{audio}=await import('../src/audio.js'),{sdk}=await import('../src/sdk.js');
for(const k of ['play','setMood','setIntensity'])audio[k]=()=>{};sdk.gameplay=()=>{};sdk.saveData=async()=>{};
await initPhysics();
check('live menu uses no Rapier bodies or steps and bots still grow',()=>{
 const sim=new Sim(genMap('town',4100),{regen:true});sim.attract=true;for(let i=0;i<10;i++)sim.addHole({bot:true,skill:.8,x:sim.map.lines[2],z:(i-5)*5});sim.focus=sim.holes[0];
 sim.world.step=()=>{throw Error('Menu must not advance Rapier');};
 for(let i=0;i<1800;i++){for(const h of sim.holes)if(i%2===0)botThink(sim,h,DT);sim.stepAttract();assert.equal(sim.active.size,0);sim.events.length=0;sim.added.length=0;sim.frozenNow?.splice(0);}
 assert.ok(sim.holes.some(h=>h.pts>0));assert.ok(sim.time>29);sim.free();
});
check('menu camera culls offscreen instances and restores newly visible models',()=>{
 const camera=new THREE.PerspectiveCamera(50,1,.5,600);camera.position.set(0,20,20);camera.lookAt(0,0,0);
 const a={id:1,st:0,rad:1,p:{x:0,y:0,z:0}},b={id:2,st:0,rad:1,p:{x:500,y:0,z:0}};
 const v={camera,attractVisible:new Set(),slots:new Map(),_release(id){this.slots.delete(id);},_add(it){this.slots.set(it.id,it);}};
 View.prototype._cullAttract.call(v,{items:[a,b]});assert.deepEqual([...v.slots.keys()],[1]);camera.position.set(500,20,20);camera.lookAt(500,0,0);View.prototype._cullAttract.call(v,{items:[a,b]});assert.deepEqual([...v.slots.keys()],[2]);
});
function game(){const g=new Game();g.quality='low';g.view={cam:{},setMap(){},frame(){},render(){}};g.ui={showPause(){},showHud(){},toast(){},modalOpen:false,localStick(){},clearLocalSticks(){}};g._quest=()=>{};return g;}
check('two real players start with equal abilities and separate keyboard controls',()=>{
 save.data=DEFAULT();Object.assign(save.data,{tutDone:true,mode:'duel',level:10});save.data.up.size=5;save.data.up.speed=5;const g=game();g.play();assert.equal(g.sim.holes.length,2);assert.equal(g.me.r,g.second.r);assert.equal(g.me.speedBonus,g.second.speedBonus);
 g.keys.add('KeyW');g._steer(g.me);g._steer(g.second,1);assert.equal(g.me.throttle,1);assert.equal(g.second.throttle,0);g.keys.add('ArrowRight');g._steer(g.second,1);assert.equal(g.second.dirX,1);g.pause(true);assert.equal(g.keys.size,0);assert.deepEqual(g.localSticks,[null,null]);g.sim.free();
});
check('daily world seed, spawn and base abilities survive repeated starts',()=>{
 save.data=DEFAULT();save.data.tutDone=true;save.data.up.size=5;const g=game();g.play(null,{daily:true});const snapshot={x:g.me.x,z:g.me.z,r:g.me.r,items:g.sim.map.items};assert.equal(g.sim.regen,false);g.play(null,{daily:true});assert.deepEqual({x:g.me.x,z:g.me.z,r:g.me.r,items:g.sim.map.items},snapshot);assert.equal(g.sim.holes.length,1);g.sim.free();
});
// Real Rapier falls, including long sessions: cap active additions and tombstones.
for(const m of MAPS){
 const sim=new Sim(genMap(m.id,4100),{regen:true,maxBodies:110,iters:2}),h=sim.addHole({me:true,x:sim.map.lines[2],z:0});sim.focus=h;const rain=new RainDirector(sim);let max=0,landed=0;
 for(let i=0;i<3600;i++){rain.step();sim.step();max=Math.max(max,rain.live.size);if(i%60===0)landed=Math.max(landed,[...rain.live].filter(it=>it.st!==2&&it.p.y<2).length);sim.events.length=0;sim.added.length=0;sim.frozenNow?.splice(0);}
 assert.ok(rain.spawned>0,m.id+' rain spawns');assert.ok(max<=36);assert.ok(landed>0,m.id+' rain lands');assert.ok(sim.items.every(it=>[it.p.x,it.p.y,it.p.z].every(Number.isFinite)));report.rain.push({map:m.id,spawned:rain.spawned,maxLive:max,landed});sim.free();
}
// One fixed-seed challenge for each map, using actual legal movement and growth.
const found=new Map();for(let i=0;i<300&&found.size<16;i++){const date=new Date(Date.UTC(2026,10,1+i)).toISOString().slice(0,10),c=challengeFor(date);if(!found.has(c.map))found.set(c.map,c);}
for(const [map,c]of found){const sim=new Sim(genMap(map,c.seed),{regen:false,maxBodies:110,iters:2,seed:c.seed}),h=sim.addHole({me:true,x:sim.map.lines[2],z:0,grow:2});sim.focus=h;let eaten=0,target=null;
 for(let i=0;i<c.time*60&&eaten<c.target;i++){if(!target||target.st===2||i%120===0){target=sim.items.filter(it=>it.st===0&&!it.grp&&fitOf(it)<h.r*.96).sort((a,b)=>Math.hypot(a.p.x-h.x,a.p.z-h.z)-Math.hypot(b.p.x-h.x,b.p.z-h.z))[0];}if(target){const dx=target.p.x-h.x,dz=target.p.z-h.z,L=Math.hypot(dx,dz)||1;h.dirX=dx/L;h.dirZ=dz/L;h.throttle=L<.3?0:1;}sim.step();eaten+=sim.events.filter(e=>e.t==='eat'&&e.h===h).length;sim.events.length=0;sim.added.length=0;sim.frozenNow?.splice(0);}
 assert.ok(eaten>=c.target,map+' challenge reachable');report.dailyRoutes.push({map,eaten,seconds:+sim.time.toFixed(1)});sim.free();}
assert.equal(report.dailyRoutes.length,16);report.checks.push('real object showers on all 16 maps','daily challenge route succeeds on all 16 maps');
fs.mkdirSync('test-results/offline',{recursive:true});fs.writeFileSync('test-results/offline/report.json',JSON.stringify(report,null,2)+'\n');console.log('OFFLINE PASS',report.checks.length,'checks;',report.rain.length,'rain worlds;',report.dailyRoutes.length,'daily routes');
