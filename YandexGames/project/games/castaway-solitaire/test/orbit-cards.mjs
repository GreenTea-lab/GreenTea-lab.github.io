import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runtime} from './runtime.mjs';
const R=await runtime(),out='test-results/orbit-cards',report=[],errors=[];
fs.mkdirSync(out,{recursive:true});
try{
 for(const [name,viewport]of [['wide',{width:1280,height:800}],['phone',{width:390,height:844}]]){
  const p=await R.browser.newPage({viewport});p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{window.__CS_DEBUG={manual:true};localStorage.setItem('castaway_solitaire_v1',JSON.stringify({coins:1000,level:1001,levels:Object.fromEntries(Array.from({length:1000},(_,i)=>[i+1,{stars:3,best:1000}])),settings:{quality:'low'},seen:{coin:1,lock:1,sand:1,keys2:1,wild:1,tableTools:1}}));});
  await p.goto(R.base+'/dist-vk-single/index.html');await p.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
  for(let tier=0;tier<=5;tier++){
   if(tier)assert.ok(await p.evaluate(()=>{__game.toIsland(false);return __game.expandIsland();}));
   await p.evaluate(()=>{__game.playLevel(7);for(let i=0;i<90;i++)__game.table.update(.05);});
   const check=await p.evaluate(()=>{
    const I=__game.island,T=__game.table,state=JSON.stringify(T.g),samples=[];
    document.documentElement.dataset.motion='on';I.tableOrbit=0;I.applyCam();let previous=I.camera.position.clone(),maxStep=0;
    for(let i=0;i<225;i++){
     I.update(1);const pos=I.camera.position;maxStep=Math.max(maxStep,pos.distanceTo(previous));previous.copy(pos);
     if(i%5===0)samples.push({x:pos.x,z:pos.z,ground:I.ground(pos.x,pos.z)});
    }
    const angle=I.tableOrbit;document.documentElement.dataset.motion='off';I.update(.1);const frozen=I.camera.position.clone();I.update(5);
    return {samples,maxStep,frozen:frozen.distanceTo(I.camera.position)<1e-8&&angle===I.tableOrbit,stateSame:JSON.stringify(T.g)===state,resolution:T.dpr,textureResolution:T.art.dpr};
   });
   assert.ok(check.samples.every(s=>s.ground<=.3),'Camera remains outside the island');assert.ok(check.maxStep<2,'Smooth camera increments');
   for(const [sx,sz]of [[1,1],[-1,1],[-1,-1],[1,-1]])assert.ok(check.samples.some(s=>s.x*sx>0&&s.z*sz>0),'Complete orbit');
   assert.ok(check.frozen&&check.stateSame);assert.ok(check.resolution>=2&&check.textureResolution>=2);
   report.push({name,tier,...check});
   if(tier===0||tier===5){await p.evaluate(()=>{document.documentElement.dataset.motion='on';__game.island.tableOrbit=Math.PI*.45;__game.island.applyCam();__game.island.render();__game.table.render();});await p.screenshot({path:`${out}/${name}-coast-${tier}.png`});}
  }
  if(name==='wide'){
   await p.evaluate(()=>{
    const T=__game.table;document.querySelector('#ui').innerHTML='';const cv=T.cv;cv.width=1440;cv.height=740;cv.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:100';const ctx=cv.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#20465c';ctx.fillRect(0,0,1440,740);T.cw=140;T.ch=196;T.art.setSize(140,2);
    for(let i=0;i<16;i++){const img=i===15?T.art.wild():i===14?T.art.back():T.art.face(i%13+1,i%4);T.drawCard(ctx,img,110+(i%8)*174,145+Math.floor(i/8)*300);}
   });await p.screenshot({path:out+'/card-gallery.png'});
  }
  await p.close();console.log('PASS full orbit and card quality',name);
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({report,errors},null,2));
}finally{await R.close();}
