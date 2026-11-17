import fs from 'node:fs';
import {balancedLevelV3} from '../src/balanced-levels-v3.js';
import {Game,rng} from '../src/core.js';
import {positions} from '../src/layouts.js';
import {auditDeal} from './balance-model.mjs';

const families=[['Арки','Arches'],['Дворики','Courtyards'],['Каналы','Canals'],['Бульвары','Boulevards'],['Террасы','Terraces'],['Веера','Fans'],['Розетки','Rosettes'],['Островки','Islets'],['Лестницы','Stairways'],['Силуэты','Skylines']];
const themes=[['Башни Москвы','Moscow towers'],['Мосты Петербурга','Petersburg bridges'],['Парижские прогулки','Paris promenades'],['Каналы Амстердама','Amsterdam canals'],['Венецианские острова','Venetian islands'],['Римские аркады','Roman arcades'],['Купола Стамбула','Istanbul domes'],['Каирские оазисы','Cairo oases'],['Сады Киото','Kyoto gardens'],['Волны Рио','Rio waves'],['Лондонские кварталы','London quarters'],['Пражские дворики','Prague courtyards'],['Лестницы Лиссабона','Lisbon stairways'],['Мозаика Барселоны','Barcelona mosaic'],['Венский вальс','Viennese waltz'],['Узоры Марракеша','Marrakesh patterns'],['Манхэттен','Manhattan'],['Сады Сингапура','Singapore gardens'],['Паруса Сиднея','Sydney sails'],['Террасы Санторини','Santorini terraces']];
export function canonical(pos){
  return Array.from({length:8},(_,n)=>{
    const a=pos.map(p=>{let x=p.x,y=p.y;if(n&1)[x,y]=[y,x];if(n&2)x=-x;if(n&4)y=-y;return {x,y,z:p.z};});
    const mx=Math.min(...a.map(p=>p.x)),my=Math.min(...a.map(p=>p.y));
    return a.map(p=>[p.x-mx,p.y-my,p.z].join(',')).sort().join(';');
  }).sort()[0];
}
function shape(family,total,layers,R){
  const w=6+Math.floor(R()*3),h=5+Math.floor(R()*3),cx=(w-1)/2,cy=(h-1)/2;
  const p=1+Math.floor(R()*3),phase=Math.floor(R()*3),roof=Array.from({length:w},()=>2+Math.floor(R()*(h-1)));
  let base=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    let yes;
    switch(family){
      case 0:yes=y<2||x<2||x>=w-2||(y===h-1&&x>1&&x<w-2&&p===2);break;
      case 1:yes=x<2||x>=w-2||y<1+p%2||y>=h-2;break;
      case 2:yes=x<2||x>=w-2||y===phase+1||y===h-2;break;
      case 3:yes=(x+phase)%3!==1||y===p||y===h-1;break;
      case 4:yes=x>=Math.max(0,y-p)&&x<w-Math.max(0,h-y-4);break;
      case 5:yes=Math.abs(x-cx)<=Math.min(cx,(y+phase+1)*.65)||y===h-1;break;
      case 6:yes=Math.abs(x-cx)/(cx+.1)+Math.abs(y-cy)/(cy+.1)<1.35||(Math.abs(x-cx)>cx-1&&y===Math.floor(cy));break;
      case 7:yes=x<3||x>=w-3||y===p||y===h-2;break;
      case 8:yes=x+y>=p+1&&x+y<=w+h-3-(p%2)&&Math.abs(x-y-phase)<w-2;break;
      default:yes=y>=h-roof[x];
    }
    if(yes)base.push({x:x*2,y:y*2,z:0});
  }
  // Outline remains recognisable: remove edge cells before the interior.
  const minimum=Math.ceil(total/layers),maximum=Math.min(total-(layers-1)*2,Math.ceil(total*(layers===2?.82:.58)));
  if(base.length<minimum)return null;
  const noise=new Map(base.map(p=>[p.x+','+p.y,R()]));
  const axis=R()<.5?'x':'y',focus=R()<.5?0:(axis==='x'?w-1:h-1)*2;
  base.sort((a,b)=>{
    const score=t=>Math.abs(t.x-cx*2)*.25+Math.abs(t.y-cy*2)*.2+noise.get(t.x+','+t.y)*1.8;
    return score(a)-score(b);
  });
  base=base.slice(0,Math.max(minimum,Math.min(base.length,maximum)));
  const out=base.slice();let previous=base,remaining=total-base.length;
  for(let z=1;z<layers;z++){
    const left=layers-z,quota=left===1?remaining:Math.min(previous.length,Math.max(Math.ceil(remaining/left),Math.round(remaining*.63)));
    if(quota>previous.length||quota<2)return null;
    const points=previous.map(t=>({...t,z}));
    const scores=new Map(points.map(t=>[t.x+','+t.y,
      family===2||family===7?Math.abs(t.x-cx*2)*-.18+Math.abs(t.y-cy*2)*.3+R()*2:
      family===4||family===8?Math.abs(t[axis]-focus)*.3+R()*2:
      Math.abs(t.x-cx*2)*(.25+R()*.2)+Math.abs(t.y-cy*2)*.3+R()*2]));
    points.sort((a,b)=>scores.get(a.x+','+a.y)-scores.get(b.x+','+b.y));
    previous=points.slice(0,quota);out.push(...previous);remaining-=quota;
  }
  return remaining===0?out:null;
}
function encode(pos){
  return Array.from({length:1+Math.max(...pos.map(p=>p.z))},(_,z)=>{
    const a=pos.filter(p=>p.z===z),maxX=Math.max(...a.map(p=>p.x))/2,maxY=Math.max(...a.map(p=>p.y))/2;
    return {r:Array.from({length:maxY+1},(_,y)=>Array.from({length:maxX+1},(_,x)=>a.some(p=>p.x===x*2&&p.y===y*2)?'#':'.').join('')),ox:0,oy:0};
  });
}
const layouts={},meta={},index=[],seen=new Set(),report=[];
for(let i=0;i<1000;i++){
  const L=balancedLevelV3(i),c=L.city,k=i%50;
  if(i<11){index.push(L.lay);seen.add(canonical(L.pos));continue;}
  const family=(k*3+Math.floor(k/10)*2+c*7)%10;
  let chosen,tries=0;
  for(;tries<900;tries++){
    const R=rng(3728191+i*7919+tries*104729),layers=L.tier==='easy'?2:k===49||L.pairs>=30?4:3;
    const pos=shape(family,L.pairs*2,layers,R);if(!pos)continue;
    const fingerprint=canonical(pos);if(seen.has(fingerprint))continue;
    try{
      const opts={...L,pos};
      const g=new Game({...opts,seed:80903+i});
      if(g.tiles.filter(t=>t.hidden&&!t.seen).length!==L.hiddenCount)continue;
      if(L.tier!=='easy'){
        const range=L.tier==='normal'?[i<50?.66:.5,.97]:[.1,.72];let possible=false;
        for(let n=0;n<12;n++){
          const a=auditDeal(new Game({...opts,seed:(950003+i*104729+n*15485863)>>>0}),16,90101+n);
          if(a.clearRate>=range[0]&&a.clearRate<=range[1]){possible=true;break;}
        }
        if(!possible)continue;
      }
      chosen={pos,fingerprint};break;
    }catch{}
  }
  if(!chosen)throw Error('Could not design level '+(i+1));
  const id='route-'+L.C.id+'-'+String(k+1).padStart(2,'0');
  layouts[id]=encode(chosen.pos);meta[id]={city:c,family,name:families[family],theme:themes[c]};index.push(id);seen.add(chosen.fingerprint);
  report.push({level:i+1,city:c,family:families[family][0],pairs:L.pairs,layers:layouts[id].length,tries:tries+1});
  if((i+1)%50===0)console.log('Designed',i+1,'levels;',seen.size,'distinct shapes');
}
fs.writeFileSync('src/route-layouts.js','// Generated by tools/variety-layouts.mjs. Variations are tested geometry, not just mirror/rotation.\nexport const ROUTE_LAYOUTS='+JSON.stringify(layouts)+';\nexport const ROUTE_LAYOUT_META='+JSON.stringify(meta)+';\nexport const ROUTE_LAYOUT_INDEX='+JSON.stringify(index)+';\n');
fs.mkdirSync('test-results/variety',{recursive:true});fs.writeFileSync('test-results/variety/design.json',JSON.stringify({newLayouts:Object.keys(layouts).length,canonicalShapes:seen.size,families,themes,levels:report},null,2));
console.log('PASS designed',Object.keys(layouts).length,'new layouts;',seen.size,'canonical geometries (mirror/rotation ignored)');
