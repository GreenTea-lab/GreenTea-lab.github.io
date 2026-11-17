import { Game, rng } from '../src/core.js';
import { level, COUNT } from '../src/levels.js';
import { playOut, planSet } from '../src/bot.js';
import { dailyLevel, dayKey } from '../src/calendar.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const results=[];
for(let i=0;i<COUNT;i++){
 const L=level(i),runs=i<3?20:2,row={level:i+1,runs,wins:0,moves:[]};
 for(let n=0;n<runs;n++){
  const g=new Game({seed:77+n*101+i,board:L.board,level:L,mode:'adv'});g.refill();
  const res=playOut(g,{maxMoves:150,quality:i<3?.8:1,R:rng(n+5)});
  if(res.win){row.wins++;row.moves.push(res.moves);}
 }
 results.push(row);if(i%20===0)console.log('Checked',i+1,'/',COUNT);
}
const daily=[];
for(let n=0;n<30;n++){
 const date=new Date(2026,10,15+n),cfg=dailyLevel(dayKey(date)),L=level(cfg.index);
 const g=new Game({seed:cfg.seed,board:L.board,level:L,mode:'adv'});g.refill();
 daily.push({date:cfg.key,level:cfg.index+1,...playOut(g,{maxMoves:150,quality:1})});
}
// После сохранения остаются те же фигуры и следующий ход генератора.
const L=level(0),g=new Game({seed:1234,board:L.board,level:L,mode:'adv'});g.refill();
for(let n=0;n<4;n++){const p=planSet(g,{beam:3})[0];g.place(p.slot,p.x,p.y);}
const restored=Game.fromJSON(JSON.parse(JSON.stringify(g.toJSON())),L);
assert.deepEqual(JSON.parse(JSON.stringify(restored.toJSON())),JSON.parse(JSON.stringify(g.toJSON())));
for(let n=0;n<20;n++)assert.equal(g.R(),restored.R());
assert.throws(()=>Game.fromJSON({b:[]},L));
const report={date:'2026-11-15',results,daily,snapshot:true};
fs.mkdirSync('test-results/balance',{recursive:true});fs.writeFileSync('test-results/balance/report.json',JSON.stringify(report,null,2));
console.log('First 3:',results.slice(0,3).map(x=>({level:x.level,wins:x.wins,runs:x.runs,median:x.moves.sort((a,b)=>a-b)[x.moves.length>>1]})));
console.log('Campaign:',results.reduce((s,x)=>s+x.wins,0),'/',results.reduce((s,x)=>s+x.runs,0),'Daily:',daily.filter(x=>x.win).length,'/',daily.length);
assert.ok(results.slice(0,3).every(x=>x.wins/x.runs>=.9),'First levels too hard');
assert.ok(daily.filter(x=>x.win).length>=27,'Daily puzzles too hard');
