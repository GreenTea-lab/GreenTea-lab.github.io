// Bounded Node checks. No browser, WebGL context, audio device or network is opened.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {Pool} from '../src/instance-pool.js';
import {DEFAULT,sanitizeSave} from '../src/save-schema.js';
import {ensureDaily,today,takeGift} from '../src/daily.js';
import {Sim,initPhysics,DT,radiusFor,scoreForMass} from '../src/sim.js';
import {genMap} from '../src/city.js';
globalThis.window={__HS_DEBUG:{}};globalThis.document={hidden:false,documentElement:{lang:'ru'}};
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const {Game}=await import('../src/game.js'),{View}=await import('../src/render.js'),{save}=await import('../src/save.js'),{sdk}=await import('../src/sdk.js'),{audio}=await import('../src/audio.js');
for(const name of ['play','setIntensity','setMood'])audio[name]=()=>{};sdk.gameplay=()=>{};sdk.saveData=async()=>{};
const report={browserRun:false,checks:[],physics:[]};
function check(name,fn){fn();report.checks.push(name);console.log('PASS',name);}
check('malformed save fields recover without losing valid coins or stars',()=>{
 const d=sanitizeSave({coins:1200,level:8,xp:1e308,expeditions:42,records:7,up:{size:999},gift:{streak:'bad'},settings:{music:false,quality:'broken'},solo:{town:{pct:35,pts:400,stars:2}}});
 assert.equal(d.coins,1200);assert.equal(d.level,8);assert.ok(d.xp<2000);assert.equal(d.up.size,5);assert.deepEqual(d.expeditions,{});assert.equal(d.gift.streak,0);assert.equal(d.settings.musicVol,0);assert.equal(d.solo.town.stars,2);assert.equal(d.settings.quality,'auto');
 assert.deepEqual(sanitizeSave(null),DEFAULT());
 const clean=sanitizeSave({expeditions:{1:3,48:2,999:3},records:{bad:null,a:{map:'town',mode:'expedition',pts:42}},skins:['classic','classic','invalid'],daily:{day:today(),q:[null]}});
 assert.deepEqual(clean.expeditions,{'1':3,'48':2});assert.equal(clean.records['expedition:town'].pts,42);assert.deepEqual(clean.skins,['classic','cityBrick','cyber']);ensureDaily(clean);assert.equal(clean.daily.q.length,3);assert.ok(Number.isFinite(takeGift(clean)));
});
storage.set('hungry_sinkhole_save_v1',JSON.stringify({coins:90,ts:20,records:7,up:{speed:1e308}}));sdk.loadData=async()=>({coins:100,ts:30,expeditions:3});await save.load();
check('cloud/local load uses validation; invalid XP inputs do not hang',()=>{assert.equal(save.data.coins,100);assert.deepEqual(save.data.expeditions,{});assert.deepEqual(save.addXp(Infinity),[]);assert.deepEqual(save.addXp(NaN),[]);});
for(const cloud of [42,[],{}, {ts:999,coins:'broken',level:'broken'}]){sdk.loadData=async()=>cloud;await save.load();assert.equal(save.data.coins,90,'malformed cloud snapshot does not erase a valid local profile');}
report.checks.push('malformed cloud responses preserve the valid local profile');
const world=new THREE.Group(),pool=new Pool({world},new THREE.BoxGeometry(),new THREE.MeshBasicMaterial(),8),owners=[];
for(let i=0;i<40;i++){const o={id:i};pool.alloc(o);owners.push(o);pool.mesh.setMatrixAt(o.i,new THREE.Matrix4().makeTranslation(i,i*2,i*3));pool.mesh.setColorAt(o.i,new THREE.Color(i/40,.4,.5));}
check('dense instance removal preserves owners, colours and matrices',()=>{
 for(const o of owners.filter(o=>o.id%3!==0))pool.release(o.i);
 assert.equal(pool.mesh.count,14);assert.equal(pool.n,14);assert.equal(world.children.length,1);
 for(const o of pool.owners){const m=new THREE.Matrix4(),c=new THREE.Color();pool.mesh.getMatrixAt(o.i,m);pool.mesh.getColorAt(o.i,c);assert.equal(m.elements[12],o.id);assert.ok(Math.abs(c.r-o.id/40)<1e-6);}
 while(pool.n)pool.release(0);assert.equal(pool.mesh.count,0);
});
check('sinking animation moves the displayed snapshot and then releases it',()=>{
 const item={id:1,p:{x:0,y:.5,z:0},q:{x:0,y:0,z:0,w:1},size:[1,1,1]},snapshot={...item,p:{...item.p}},slot={p:pool,it:item};pool.alloc(slot);
 const view={time:0,slots:new Map([[1,slot]]),pools:new Map([['p',pool]]),rising:new Set(),ghosts:[],holes:new Map(),fx:{update(){}},_set:View.prototype._set,_picks(){},_goldMark(){},_camera(){}};
 const sim={time:1,events:[{t:'sink',it:snapshot}],added:[],active:[],agents:[],holes:[]};View.prototype.frame.call(view,.1,sim,null);
 assert.equal(slot.it,snapshot);assert.ok(slot.it.p.y<.5);assert.equal(item.p.y,.5);const matrix=new THREE.Matrix4();pool.mesh.getMatrixAt(slot.i,matrix);assert.ok(matrix.elements[13]<.5);
 sim.events=[];for(let i=0;i<8;i++)View.prototype.frame.call(view,.1,sim,null);assert.equal(pool.mesh.count,0);assert.equal(view.ghosts.length,0);
});
function game(){const g=new Game();g.state='play';g.view={};g.ui={modalOpen:false,showPause(){},showHud(){},hideTut(){},showResult(){},scr:{querySelector:()=>null}};g._quest=()=>{};return g;}
check('resize redraws a paused world without advancing the simulation',()=>{
 let renders=0;window.innerWidth=844;window.innerHeight=390;
 const view={map:{id:'town'},renderer:{setSize(){}},camera:new THREE.PerspectiveCamera(),_camera(){},render(){renders++;}};
 View.prototype.resize.call(view);assert.equal(renders,1);assert.equal(view.camera.aspect,844/390);assert.equal(view.camera.fov,36);
 window.innerWidth=390;window.innerHeight=844;View.prototype.resize.call(view);assert.equal(renders,2);assert.equal(view.camera.fov,50);
});
check('newly rebuilt sinking objects cannot update a recycled instance',()=>{
 const item={id:2,p:{x:0,y:.5,z:0},q:{x:0,y:0,z:0,w:1},size:[1,1,1],born:0,riseH:2},snapshot={...item,p:{...item.p}},slot={p:pool,it:item};pool.alloc(slot);
 const view={time:0,slots:new Map([[2,slot]]),pools:new Map([['p',pool]]),rising:new Set([slot]),ghosts:[],holes:new Map(),fx:{update(){}},_set:View.prototype._set,_picks(){},_goldMark(){},_camera(){}};
 const sim={time:.1,events:[{t:'sink',it:snapshot}],added:[],active:[],agents:[],holes:[]};
 for(let i=0;i<9;i++){View.prototype.frame.call(view,.1,sim,null);sim.events=[];}
 assert.equal(pool.n,0);assert.equal(view.rising.size,0);
});
check('platform pause holds stop both gameplay and manual unpause',()=>{
 const g=game();g.sim={time:1};g.backgroundHolds.add('sdk');g.update(.02);g.paused=true;g.pause(false);assert.equal(g.paused,true);
 g.backgroundHolds.clear();g.pause(false);assert.equal(g.paused,false);
});
check('first round has no interstitial; transitions are single-use',()=>{
 const g=game();g.state='result';g.sim={};let ads=0,menus=0,plays=0,done;
 g.menu=()=>menus++;g.play=()=>plays++;sdk.showInterstitial=cb=>{ads++;done=cb;};
 save.data=DEFAULT();save.data.rounds=1;g.afterRound('menu');assert.equal(ads,0);assert.equal(menus,1);
 save.data.rounds=2;g.afterRound('again');g.afterRound('menu');assert.equal(ads,1);done();assert.equal(plays,1);
});
check('late ad callbacks cannot restore another round or award twice',()=>{
 const g=game();g.state='result';g.lastRes={coins:20};save.data=DEFAULT();save.data.coins=100;let reward;sdk.canReward=()=>true;sdk.adActive=false;sdk.showRewarded=cb=>reward=cb;
 g.doubleReward();const stale=reward;g.lastRes={coins:30};stale();assert.equal(save.data.coins,100);
 g.doubleReward();reward();reward();assert.equal(save.data.coins,130);
 g.state='play';g.me={alive:false,mass:0};g.massBefore=100;g.stats={keepUsed:false};g.sim={};g.keepSize();g.sim={};reward();assert.equal(g.me.mass,0);assert.equal(g.stats.keepUsed,false);
});
check('restart uses the current expedition rather than an old result',()=>{
 const g=game();g.state='result';g.sim={};g.expedition={id:5};g.lastRes={expedition:2};let restarted;
 g.play=id=>restarted=id;save.data.rounds=0;g.afterRound('again');assert.equal(restarted,5);
 g.state='result';g.expedition=null;g.afterRound('again');assert.equal(restarted,null);
});
await initPhysics();
const empty=()=>({id:'qa',half:50,span:80,items:[],lines:[-40,0,40],roads:{nodes:[]},blocks:[]});
for(const scenario of ['small object falls','large object stays','ground supports objects']){
 const sim=new Sim(empty(),{maxBodies:30,iters:2}),h=sim.addHole({me:true,mass:scenario==='small object falls'?100:0,x:0,z:0});sim.focus=h;
 const big=scenario==='large object stays',size=big?[12,2,12]:[.5,.5,.5],it=sim.addItem({kind:'prop',look:'crate',shape:'box',size,mat:'prop',x:scenario==='ground supports objects'?15:0,y:size[1]/2,z:0});
 if(scenario==='ground supports objects')sim.activate(it);
 for(let i=0;i<180;i++){sim.step();sim.events.length=0;sim.added.length=0;sim.frozenNow?.splice(0);}
 if(scenario==='small object falls'){assert.equal(it.st,2);assert.equal(h.pts,scoreForMass(h.mass));assert.ok(h.mass>100);}else {assert.notEqual(it.st,2);assert.ok(it.p.y>=size[1]/2-.06);}
 assert.ok(sim.items.every(i=>[i.p.x,i.p.y,i.p.z].every(Number.isFinite)));report.physics.push({scenario,passed:true,steps:180});sim.free();
}
const sim=new Sim(genMap('town',19),{regen:true,iters:2}),a=sim.addHole({mass:900,x:0,z:0}),b=sim.addHole({mass:150,x:0,z:0});sim._holesEatHoles();
check('death clears mass and score; falling food cannot credit a dead hole',()=>{assert.equal(b.alive,false);assert.equal(b.mass,0);assert.equal(b.pts,0);assert.equal(b.r,radiusFor(0));sim._eat(sim.items.find(i=>!i.grp),b);assert.equal(b.mass,0);});
const car=sim.items.find(i=>i.agent?.type==='car'),wall=sim.items.find(i=>i.grp&&i.p.y<2),previous={...car.p};sim.activate(car);car.body.setTranslation({x:wall.p.x,y:car.size[1]/2,z:wall.p.z},true);sim._sync();
check('physical car displacement cannot place it inside a wall',()=>assert.ok(Math.hypot(car.p.x-previous.x,car.p.z-previous.z)<.001));
a.alive=false;b.alive=false;
const [gid,home]=sim.groupHome.entries().next().value;sim.remove(sim.groups.get(gid)[0]);sim.time=300;for(let i=0;i<20&&home.queued;i++)sim._regenStep();
check('partially destroyed building rebuilds completely',()=>{assert.equal(home.alive,home.n);assert.equal(sim.groups.get(gid).length,home.n);});sim.free();
check('continuing a city cannot repeatedly award old mass XP/coins/rounds',()=>{
 save.data=DEFAULT();const g=game(),h={mass:10000,pts:100000,r:radiusFor(10000),alive:true};g.me=h;g.map={id:'town'};g.sim={holes:[h],enableRegen(){}};g.state='result';g.continueCity();g.end();assert.equal(g.lastRes.coins,0);assert.equal(g.lastRes.xp,0);assert.equal(save.data.rounds,0);assert.equal(save.data.xp,0);
});
pool.mesh.dispose();pool.geo.dispose();pool.mat.dispose();
fs.mkdirSync('test-results/audit',{recursive:true});fs.writeFileSync('test-results/audit/core.json',JSON.stringify(report,null,2)+'\n');console.log('CORE AUDIT PASS',report.checks.length,'checks;',report.physics.length,'physical scenarios; no browser launched');
