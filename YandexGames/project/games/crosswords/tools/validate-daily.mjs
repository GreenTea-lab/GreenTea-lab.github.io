import fs from 'node:fs';
import assert from 'node:assert/strict';
import {dailyPuzzle} from '../src/daily.js';
import {Puzzle} from '../src/puzzle.js';
const report={};
for(const lang of ['ru','en']){
  const data=JSON.parse(fs.readFileSync('src/data/'+lang+'.json','utf8'));
  const campaign=new Set([...data.levels,...data.adult].flatMap(L=>L.e.map(e=>e[3])));
  const counts=[];let maxMs=0;
  for(let day=0;day<365;day++){
    const key=new Date(Date.UTC(2026,0,1)+day*86400000).toISOString().slice(0,10),start=performance.now();
    const L=dailyPuzzle(data.bank,key,lang);maxMs=Math.max(maxMs,performance.now()-start);
    assert(L.e.length>=6);assert.equal(new Set(L.e.map(e=>e[3])).size,L.e.length);
    assert(L.e.every(e=>!campaign.has(e[3])));
    const p=new Puzzle(L);p.cells.forEach((c,i)=>{if(c)p.setLetter(i,c.ch);});p.refresh();assert(p.complete());counts.push(L.e.length);
    if(day%100===0)console.log(lang,'daily date',day+1);
  }
  report[lang]={dates:365,minWords:Math.min(...counts),maxWords:Math.max(...counts),maxMs:Math.round(maxMs),campaignOverlap:0};
}
fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/daily-generation.json',JSON.stringify(report,null,2));console.log(report);
