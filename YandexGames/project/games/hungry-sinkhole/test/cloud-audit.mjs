import './remote-browser.mjs';
if(process.platform!=='linux')throw new Error('Cloud checks require Linux');
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['build.mjs'],{stdio:'inherit'});
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {MAPS} from '../src/city.js';
const out='test-results/audit';fs.mkdirSync(out,{recursive:true});
const report={environment:{platform:process.platform},errors:[],consoleErrors:[],checks:[],memory:[],performance:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
report.environment.browser=browser.version();
const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ru-RU',userAgent:'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/142.0.0.0 Mobile Safari/537.36'});
p.on('pageerror',e=>report.errors.push(e.stack));p.on('console',m=>{if(m.type()==='warning'&&/shader|GL_INVALID|WebGL.*error/i.test(m.text()))report.errors.push(m.text());});p.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
const screenshot=p.screenshot.bind(p);p.screenshot=options=>screenshot({animations:'disabled',...options});
const flush=()=>fs.writeFileSync(out+'/cloud-report.json',JSON.stringify(report,null,2)+'\n');
const check=(name,value)=>{report.checks.push({name,passed:!!value});flush();assert.ok(value,name);console.log('PASS',name);};
try{
 await p.addInitScript(()=>{window.__HS_DEBUG={seed:4100,auto:true};localStorage.setItem('hungry_sinkhole_save_v1',JSON.stringify({level:30,tutDone:true,coins:1000,rounds:0}));});
 await p.goto(pathToFileURL(path.resolve('dist-vk/index.html')).href);
 await p.waitForFunction(()=>window.__game?.sim&&!document.querySelector('#loader'),null,{timeout:90000});
 report.environment.gpu=await p.evaluate(()=>{const r=__game.view.renderer,gl=r.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return {vendor:e&&gl.getParameter(e.UNMASKED_VENDOR_WEBGL),renderer:e&&gl.getParameter(e.UNMASKED_RENDERER_WEBGL),version:gl.getParameter(gl.VERSION),dpr:devicePixelRatio};});flush();
 // All maps twice, same seed/order and quality: first cycle establishes the cache baseline.
 for(let cycle=1;cycle<=2;cycle++)for(const {id}of MAPS){
  await p.evaluate(id=>{const g=__game;g.manual=true;__save.data.map=id;__save.data.mode='battle';g.quality='low';g.view.setQuality('low');g.play();g.backgroundHolds.clear();g.paused=false;g.view.frame(.016,g.sim,g.me);g.view.render();},id);
  await p.waitForTimeout(150);
  const state=await p.evaluate(()=>{const g=__game;return {map:g.map.id,...g.view.renderer.info.memory,glError:g.view.renderer.getContext().getError(),programs:g.view.renderer.info.programs.length,slots:g.view.slots.size,poolInstances:[...g.view.pools.values()].reduce((n,p)=>n+p.n,0),bodies:g.sim.world.bodies.len(),active:g.sim.active.size};});
  report.memory.push({cycle,...state});flush();
  if(cycle===1)await p.screenshot({path:out+'/map-'+id+'.png'});
  console.log('MAP',cycle,id,JSON.stringify(state));
 }
 const last=report.memory.at(-1),first=report.memory[MAPS.length-1];
 check('all maps have no WebGL errors',report.memory.every(s=>s.glError===0));
 check('second complete map cycle has stable geometry/texture/program counts',last.geometries<=first.geometries+2&&last.textures<=first.textures+2&&last.programs<=first.programs+2);
 // Dense pools: remove half of one real rendered pool, then validate every remaining owner/matrix.
 const dense=await p.evaluate(()=>{const g=__game;g.manual=true;const pool=[...g.view.pools.values()].sort((a,b)=>b.n-a.n)[0],before=pool.n,removed=new Set();const snapshots=new Map(pool.owners.map(o=>[o,Array.from(pool.mesh.instanceMatrix.array.slice(o.i*16,o.i*16+16))]));for(const o of [...pool.owners].filter((_,i)=>i%2===0)){removed.add(o);pool.release(o.i);g.view.slots.delete(o.it.id);g.view.rising.delete(o);}let valid=true;for(const o of pool.owners)valid&&=pool.owners[o.i]===o&&snapshots.get(o).every((v,j)=>v===pool.mesh.instanceMatrix.array[o.i*16+j]);g.view.render();return {before,after:pool.n,count:pool.mesh.count,valid,removed:removed.size};});
 report.dense=dense;check('GPU pool compaction preserves survivors and removes instances',dense.valid&&dense.count===dense.after&&dense.before-dense.after===dense.removed);await p.screenshot({path:out+'/pool-compacted.png'});
 // Use actual menu controls for all four regular modes on the small phone.
 await p.setViewportSize({width:320,height:568});
 for(const mode of ['battle','royale','solo','zen']){
  await p.evaluate(()=>{__game.menu();__game.manual=false;});await p.locator('[data-m="'+mode+'"]').click();await p.locator('#play').click();await p.waitForFunction(()=>__game.sim.time>.1);
  check('UI launches '+mode,await p.evaluate(m=>__game.mode===m,mode));await p.screenshot({path:out+'/small-'+mode+'.png'});
 }
 // Verify slider output and thumb fit the panel on every requested layout.
 for(const [name,width,height]of [['small',320,568],['phone',390,844],['desktop',1440,900],['landscape',844,390]]){
  await p.setViewportSize({width,height});await p.locator('#pause').click();
  const bounds=await p.locator('.vol-row').evaluateAll(rows=>rows.map(row=>{const panel=row.closest('.mpanel').getBoundingClientRect(),b=row.getBoundingClientRect(),input=row.querySelector('input').getBoundingClientRect(),value=row.querySelector('.vol-v').getBoundingClientRect();return {panel:{left:panel.left,right:panel.right},row:{left:b.left,right:b.right},inputWidth:input.width,valueRight:value.right};}));
  check('volume controls fit '+name,bounds.every(b=>b.row.left>=b.panel.left&&b.valueRight<=b.panel.right&&b.inputWidth>=26));
  await p.screenshot({path:out+'/volume-'+name+'.png'});await p.locator('#res').click();
 }
 await p.setViewportSize({width:320,height:568});
 // Platform hold cannot be bypassed by play/resume; focus restoration presents pause UI.
 await p.evaluate(()=>__sdk._emit('pause'));const held=await p.evaluate(()=>__game.sim.time);await p.waitForTimeout(400);check('platform hold stops simulation',await p.evaluate(t=>__game.sim.time===t,held));
 await p.evaluate(()=>__game.pause(false));check('manual resume cannot bypass platform hold',await p.evaluate(()=>__game.paused));
 await p.evaluate(()=>__sdk._emit('resume'));check('platform resume shows explicit pause UI',await p.locator('#res').isVisible());await p.screenshot({path:out+'/small-platform-pause.png'});await p.locator('#res').click();
 // Real hole-vs-hole death, UI, reset and physical respawn.
 await p.evaluate(()=>{__save.data.mode='battle';__game.play();const g=__game,h=g.me,k=g.sim.holes.find(o=>o!==h);h.mass=100;h.r=3;h.pts=100;h.shield=0;k.mass=10000;k.r=15;k.shield=0;k.x=h.x;k.z=h.z;g.sim._holesEatHoles();g._events();g.sim.events.length=0;g.manual=true;});
 const death=await p.evaluate(()=>({alive:__game.me.alive,mass:__game.me.mass,pts:__game.me.pts,r:__game.me.r}));report.death=death;check('real death clears mass and score',!death.alive&&death.mass===0&&death.pts===0);await p.screenshot({path:out+'/small-death.png'});
 await p.evaluate(()=>{const g=__game;g.sim.respawn(g.me);g._events();g.sim.events.length=0;g.view.frame(.016,g.sim,g.me);g.view.render();});check('respawn starts with reset size',await p.evaluate(()=>__game.me.alive&&__game.me.mass===0));
 // Expedition -> continue city -> immediate end: no old-score rewards.
 await p.evaluate(()=>{__game.play(1);__game.me.mass=10000;__game.me.pts=100000;__game.stats.eaten=100;__game.end();});await p.locator('#freewalk').click();
 const continuation=await p.evaluate(()=>{const g=__game,coins=__save.data.coins,xp=__save.data.xp,rounds=__save.data.rounds;g.end();return {mode:g.mode,regen:g.sim.regen,coins:g.lastRes.coins,xp:g.lastRes.xp,roundsDelta:__save.data.rounds-rounds,coinDelta:__save.data.coins-coins,xpDelta:__save.data.xp-xp};});report.continuation=continuation;check('continuation cannot award old mass',continuation.regen&&continuation.coins===0&&continuation.xp===0&&continuation.roundsDelta===0);await p.screenshot({path:out+'/small-continuation-result.png'});
 // Show the new skyline at an angle, with the same materials and geometry as gameplay.
 await p.setViewportSize({width:1100,height:650});
 for(const id of ['town','metro','neoncity']){
  const landmark=await p.evaluate(id=>{
   const g=__game;g.manual=true;__save.data.map=id;__save.data.mode='zen';g.play();
   const l=g.map.landmarks.find(it=>it.type==='skyscraper'),v=g.view;
   v.frame(.016,g.sim,g.me);
   v.camera.position.set(l.x+85,l.height*.86,l.z+115);
   v.camera.lookAt(l.x,l.height*.46,l.z);
   v.render();
   return {id,height:l.height,floors:l.floors,glError:v.renderer.getContext().getError()};
  },id);
  check('skyscraper draws without WebGL errors on '+id,landmark.glError===0);
  await p.screenshot({path:out+'/skyline-'+id+'.png'});
 }
 // Frame interval benchmark: production render on EVERY frame, no manual/synthetic loop.
 await p.setViewportSize({width:390,height:844});const cdp=await p.context().newCDPSession(p);
 for(const rate of [1,4])for(const map of ['town','metro','neoncity','aurora']){
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
  await p.evaluate(map=>{const g=__game;__save.data.map=map;__save.data.mode='battle';__save.data.settings.quality='auto';g.quality='mid';g.view.setQuality('mid');g.play();g.backgroundHolds.clear();g.paused=false;g.manual=false;},map);
  await p.waitForTimeout(2000);await cdp.send('Emulation.setCPUThrottlingRate',{rate});
  const result=await p.evaluate(async()=>{const g=__game,start=performance.now(),samples=[];let previous=start;while(performance.now()-start<15000){await new Promise(requestAnimationFrame);const now=performance.now(),i=g.view.renderer.info;samples.push({dt:now-previous,calls:i.render.calls,triangles:i.render.triangles,active:g.sim.active.size,bodies:g.sim.world.bodies.len(),quality:g.quality,limit:g.sim.maxBodies,simTime:g.sim.time});previous=now;}const ordered=samples.map(x=>x.dt).sort((a,b)=>a-b),pct=p=>ordered[Math.max(0,Math.ceil(ordered.length*p)-1)],max=k=>Math.max(...samples.map(s=>s[k]));return {durationMs:performance.now()-start,frames:samples.length,p50:pct(.5),p95:pct(.95),p99:pct(.99),callsMax:max('calls'),trianglesMax:max('triangles'),activeMax:max('active'),bodiesMax:max('bodies'),qualities:[...new Set(samples.map(s=>s.quality))],physicsLimits:[...new Set(samples.map(s=>s.limit))],simSeconds:samples.at(-1).simTime-samples[0].simTime,samples};});
  report.performance.push({map,cpuThrottle:rate,...result});flush();console.log('PERF',map,rate,JSON.stringify({...result,samples:undefined}));await p.screenshot({path:out+'/perf-'+map+'-'+rate+'x.png'});
 }
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});check('no page/shader/console errors',report.errors.length===0&&report.consoleErrors.length===0);
}finally{flush();await browser.close();}
