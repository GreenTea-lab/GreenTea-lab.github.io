import fs from 'node:fs';import assert from 'node:assert/strict';
import {make,COUNT} from '../src/levels.js';import {Game} from '../src/core.js';import {playOut} from '../src/bot.js';
const tuning={},rows=[];
for(let i=140;i<COUNT;i++){
 let found;
 for(let salt=0;salt<16&&!found;salt++){
  const L=make(i,salt),wins=[];
  for(let n=0;n<10&&wins.length<3;n++){
   const seed=i*7777+37+n*101,g=new Game({seed,board:L.board,level:L,mode:'adv'});g.refill();
   const r=playOut(g,{maxMoves:45,quality:1});if(r.win)wins.push({seed,moves:r.moves});
  }
  if(wins.length===3){const mv=wins.map(x=>x.moves).sort((a,b)=>a-b);found={salt,par:Math.ceil(mv[1]*1.2)+2,seeds:wins.map(x=>x.seed)};rows.push({level:i+1,type:L.variant,modifier:L.modifier,...found,moves:mv});}
 }
 assert.ok(found,'Could not calibrate level '+(i+1));tuning[i]=found;
 if(i%100===0)console.log('Calibrated',i+1,'/',COUNT);
}
fs.writeFileSync('src/campaign-tuning.js','// 3 проверенных сида на каждый новый уровень; tools/calibrate-campaign.mjs\nexport const TUNING = '+JSON.stringify(tuning)+';\n');
fs.mkdirSync('test-results/expansion',{recursive:true});fs.writeFileSync('test-results/expansion/calibration.json',JSON.stringify({rows},null,2));console.log('Done:',rows.length,'new levels');
