import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildLevel,Tri,solveSeeing,solveFair,rng,MAIN_LEVELS} from '../src/logic.js';
import {findRoute} from '../src/navigation.js';
const results=[],geometries=new Set(),unique=new Set();
for(let n=1;n<=MAIN_LEVELS;n++){
 const def=buildLevel(n);let proven=false;
 if(n<=60){proven=solveSeeing(def,20000).won;for(let k=0;k<80&&!proven;k++)proven=solveFair(def,rng(n*997+k),1).won;}
 else{const g=new Tri(def);for(const i of def.solution){assert.ok(i<0?g.draw():g.play(i),`Legal action in level ${n}`);}proven=g.won();}
 assert.ok(proven,`Demonstrated winning route ${n}`);
 assert.ok(def.cards.every(c=>c.rank>=1&&c.rank<=13&&c.suit>=0&&c.suit<4));
 const fair=Array.from({length:24},(_,i)=>solveFair(def,rng(n*191+i),.5).won).filter(Boolean).length;
 if(n>60)assert.ok(fair>0,`Independent bot sample ${n}`);
 geometries.add(JSON.stringify(def.cards.map(c=>[c.x,c.row])));unique.add(JSON.stringify([def.cards,def.stock,def.waste]));
 results.push({n,cards:def.cards.length,stock:def.stock.length,fairWins:fair,outOf:24,difficulty:def.plan?.difficulty||'legacy'});
}
assert.equal(unique.size,1000);assert.ok(geometries.size>800);
for(const n of [1001,1100]){const d=buildLevel(n),g=new Tri(d);for(const i of d.solution)i<0?g.draw():g.play(i);assert.ok(g.won());}
const valid=(x,z)=>Math.abs(x)<5&&Math.abs(z)<5&&!(Math.abs(x)<.8&&z<2);
const route=findRoute({x:-3,z:0},{x:3,z:0},valid);assert.ok(route.length>0&&route.every(p=>valid(p.x,p.z)));assert.ok(route.some(p=>p.z>=2));
assert.deepEqual(findRoute({x:0,z:0},{x:3,z:0},()=>false),[]);
fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/logic.json',JSON.stringify({levels:1000,unique:unique.size,geometries:geometries.size,results},null,2));
console.log(`PASS: 1000 solvable, unique deals; ${geometries.size} layouts; 24000 independent fair-bot runs; endless levels and navigation`);
