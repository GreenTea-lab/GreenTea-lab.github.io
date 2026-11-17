// Rebuild both campaigns together. An answer can be consumed once per language.
import fs from 'node:fs';
import {generate,hashStr,rng} from '../src/gen.js';
const COUNT=1000, VERSION=2;
const shuffle=(a,R)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function curated(lang,adult=false){
  const files=adult?[`words_${lang}_adult.txt`]:[1,2,3].map(i=>`words_${lang}_${i}.txt`).concat([2,3].map(i=>`words_${lang}_new_${i}.txt`));
  const out=new Map();
  for(const [k,f]of files.entries())for(const line of fs.readFileSync('tools/'+f,'utf8').split(/\r?\n/)){
    if(!line.trim()||line.startsWith('#'))continue;
    const [raw,clue]=line.split('|'),word=raw.toUpperCase().replace(/Ё/g,'Е');
    if(clue&&!out.has(word))out.set(word,{word,clue,tier:adult?3:Math.min(3,k+1),rank:adult?2000:1000+k*100,source:'original'});
  }
  return [...out.values()];
}
const report={version:VERSION,languages:{}};
fs.mkdirSync('test-results',{recursive:true});
for(const lang of ['ru','en']){
  const expanded=JSON.parse(fs.readFileSync(`tools/dictionaries/${lang}-bank.json`,'utf8')).map(([word,clue,rank,source])=>({word,clue,rank,tier:rank<25000?1:rank<100000?2:3,source}));
  const common=curated(lang),expert=curated(lang,true),reserved=new Set(expert.map(w=>w.word));
  const dict=new Map(expanded.map(w=>[w.word,w]));
  for(const w of [...common,...expert])dict.set(w.word,w);
  const bank=[...dict.values()].sort((a,b)=>a.rank-b.rank||a.word.localeCompare(b.word));
  const intro=JSON.parse(fs.readFileSync(`src/data/legacy-${lang}.json`,'utf8')).levels[0];
  const introWords=new Set(intro.e.map(e=>e[3]));
  const dailyReserved=new Set([...common.filter(w=>w.tier===1&&w.word.length<=7).slice(-40),...expanded.filter(w=>w.rank>3000&&w.rank<20000&&w.word.length<=9).filter((_,i)=>i%3===0).slice(0,200)].map(w=>w.word).filter(w=>!introWords.has(w)));
  const used=new Set(),out={version:VERSION,levels:[],adult:[]};
  const expertNames=new Set(expert.map(w=>w.word));
  const allStats={dictionary:bank.length};
  for(const mode of ['levels','adult']){
    const adult=mode==='adult';
    const source=(adult?[...expert,...bank.filter(w=>!expertNames.has(w.word))]:bank.filter(w=>!reserved.has(w.word))).filter(w=>!dailyReserved.has(w.word));
    for(let i=0;i<COUNT;i++){
      if(!adult&&i===0){out.levels.push(intro);intro.e.forEach(e=>used.add(e[3]));continue;}
      const phase=i%15;
      const target=adult?8+(phase>3?1:0)+(phase>10?1:0):i<5?5:i<30?6:7+(i>180?1:0)+(phase>10?1:0);
      const baseMax=adult?13+(i>350?1:0):i<5?7:i<30?9:i<150?11:12;
      let result=null;
      for(let attempt=0;attempt<24&&!result;attempt++){
        const R=rng(hashStr(`${lang}:${mode}:unique:${i}:${attempt}`));
        const max=baseMax+Math.floor(attempt/8);
        const lenLimit=i<5&&!adult?6:i<30&&!adult?7:adult?12:11;
        const candidates=source.filter(w=>!used.has(w.word)&&w.word.length<=Math.min(max-1,lenLimit)&&(!(i<30&&!adult)||w.source==='original'&&w.tier===1));
        const window=attempt<8?400:attempt<16?1000:2000;
        const pool=shuffle(candidates.slice(0,window),R).slice(0,140);
        const n=Math.max(adult?7:5,target-Math.floor(attempt/12));
        result=generate(pool,{target:n,maxW:max,maxH:max,tries:5,seed:hashStr(`${lang}:${mode}:${i}:${attempt}`)});
      }
      if(!result)throw Error(`Unique dictionary exhausted: ${lang}/${mode}/${i+1}`);
      const L={w:result.w,h:result.h,e:result.entries.map(e=>[e.x,e.y,e.dir,e.word,e.clue])};
      for(const e of L.e){if(used.has(e[3]))throw Error('Repeated answer: '+e[3]);used.add(e[3]);}
      out[mode].push(L);
      if((i+1)%100===0)console.log(lang,mode,i+1,'unique words',used.size);
    }
    const list=out[mode];
    allStats[mode]={count:list.length,words:list.reduce((n,L)=>n+L.e.length,0),minWords:Math.min(...list.map(L=>L.e.length)),maxWords:Math.max(...list.map(L=>L.e.length)),maxGrid:Math.max(...list.flatMap(L=>[L.w,L.h]))};
  }
  out.bank=bank.filter(w=>!used.has(w.word)&&w.word.length<=9).slice(0,3000).map(w=>[w.word,w.clue,w.tier]);
  const usedSources=bank.filter(w=>used.has(w.word)).map(w=>[w.word,w.clue,w.source]);
  fs.writeFileSync(`src/data/${lang}.json`,JSON.stringify(out));
  fs.writeFileSync(`tools/dictionaries/${lang}-used.json`,JSON.stringify(usedSources));
  allStats.unique=used.size;allStats.repeated=0;allStats.dailyReserve=out.bank.length;
  report.languages[lang]=allStats;
}
fs.writeFileSync('test-results/level-generation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
