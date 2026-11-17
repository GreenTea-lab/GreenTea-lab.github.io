import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Sim,initPhysics,radiusFor,scoreForMass} from '../src/sim.js';
import {genMap} from '../src/city.js';
import {roundCoins} from '../src/economy.js';
await initPhysics();
const sim=new Sim(genMap('town',432),{regen:false});
const a=sim.addHole({name:'Large',mass:900,x:0,z:0}),b=sim.addHole({name:'Small',mass:150,x:0,z:0});
assert.equal(b.pts,scoreForMass(150));sim._holesEatHoles();
assert.equal(b.alive,false);assert.equal(b.mass,0);assert.equal(b.pts,0);assert.equal(b.r,radiusFor(0));
assert.equal(a.pts,scoreForMass(a.mass));
const death=sim.events.find(e=>e.t==='holeEat');assert.equal(death.previousMass,150);
// Objects still falling after death must not rebuild the victim's points.
const food=sim.items.find(it=>!it.grp);sim._eat(food,b);assert.equal(b.pts,0);assert.equal(b.mass,0);
sim.respawn(b);assert.equal(b.pts,0);assert.equal(b.mass,0);
const food2=sim.items.find(it=>it.st!==2&&!it.grp);sim._eat(food2,b);assert.equal(b.pts,scoreForMass(b.mass));assert.ok(b.pts>0);
// A growth boost changes mass and score together.
const mass=b.mass,base=sim.items.find(it=>it.st!==2&&!it.grp);b.eff.x2=5;sim._eat(base,b);assert.ok(Math.abs(b.mass-mass-base.foodMass*2)<1e-7);assert.equal(b.pts,scoreForMass(b.mass));sim.free();
const cases=[0,1000,10000,100000,1e12].map(pts=>({pts,battleFirst:roundCoins({mode:'battle',pts,place:1,elapsed:120}),battleLast:roundCoins({mode:'battle',pts,place:11,elapsed:120}),zen:roundCoins({mode:'zen',pts,elapsed:120})}));
for(const row of cases){assert.ok(row.battleFirst<=42);assert.ok(row.battleLast<=30);}
assert.equal(roundCoins({mode:'battle',pts:0,elapsed:0}),0);
assert.equal(roundCoins({mode:'zen',pts:1e12,elapsed:0}),0);
assert.ok(roundCoins({mode:'expedition',pts:10000,newStars:3,elapsed:120})>roundCoins({mode:'expedition',pts:10000,newStars:0,elapsed:120}));
fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/economy-v2.json',JSON.stringify({deathReset:true,noPosthumousPoints:true,massScore:true,cases},null,2)+'\n');console.log(cases);
