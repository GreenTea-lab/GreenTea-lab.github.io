import assert from 'node:assert/strict';
globalThis.window={__HS_DEBUG:{}};
const {Game}=await import('../src/game.js');const {save}=await import('../src/save.js');
const original=performance.now;let now=0;performance.now=()=>now;
try{
 const g=new Game(),changes=[];g.state='play';g.quality='high';g.sim={time:0,maxBodies:320,world:{numSolverIterations:4}};g.view={setQuality:q=>changes.push(q)};g._worldStartedAt=g._perfAt=0;g._perfFrames=0;save.data.settings.quality='auto';
 for(now=1000;now<=5000;now+=1000)g._adapt(.1);assert.deepEqual(changes,[],'initial shaders have a wall-clock warmup');
 for(now=6000;now<=16000;now+=1000)g._adapt(.1);
 assert.deepEqual(changes,['mid','low']);assert.equal(g.sim.maxBodies,110);assert.equal(g.sim.world.numSolverIterations,2);assert.equal(g.sim.time,0,'adaptation works even when simulation hardly advances');
 save.data.settings.quality='high';g.quality='high';now=30000;g._adapt(.1);assert.equal(g.quality,'high','explicit user quality is preserved');console.log('PASS wall-clock warmup, stalled simulation, both quality transitions, physics budgets, manual quality');
}finally{performance.now=original;}
