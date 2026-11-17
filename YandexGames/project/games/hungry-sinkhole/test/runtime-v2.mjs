import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome'}),errors=[];const out='test-results/runtime-v2';fs.mkdirSync(out,{recursive:true});
try{
 const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36',locale:'ru-RU'});p.on('pageerror',e=>errors.push(e.stack));
 await p.addInitScript(()=>window.__HS_DEBUG={seed:4100});
 await p.route('**/game.js',async route=>{await new Promise(r=>setTimeout(r,700));await p.screenshot({path:out+'/loading-phone.png'});return route.continue();});
 await p.goto(pathToFileURL(path.resolve('dist-vk/index.html')).href);await p.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
 await p.locator('#play').click();await p.waitForFunction(()=>__game.sim.time>1);await p.locator('#tskip').click();
 const cdp=await p.context().newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 await p.keyboard.down('ArrowUp');
 const timing=await p.evaluate(async()=>{const values=[];let prev=performance.now();for(let i=0;i<240;i++){await new Promise(requestAnimationFrame);const t=performance.now();values.push(t-prev);prev=t;}values.sort((a,b)=>a-b);return {frames:values.length,p50:values[120],p95:values[228],p99:values[237],mean:values.reduce((a,b)=>a+b,0)/values.length,quality:__game.quality,active:__game.sim.active.size,calls:__game.view.renderer.info.render.calls,triangles:__game.view.renderer.info.render.triangles};});
 await p.keyboard.up('ArrowUp');await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});await p.screenshot({path:out+'/phone-game.png'});
 const memory=await p.evaluate(()=>{const g=__game;g.manual=true;__save.data.tutDone=true;const a=[];for(let i=0;i<8;i++){g.menu();g.play();g.view.frame(.016,g.sim,g.me);g.view.render();a.push({...g.view.renderer.info.memory});}return a;});
 assert.ok(memory.at(-1).geometries<=memory[2].geometries+2,'Repeated worlds release geometry');assert.ok(memory.at(-1).textures<=memory[2].textures+2,'Repeated worlds release textures');
 // Local rewards are neither displayed nor synthesized.
 await p.evaluate(()=>{__game.menu();__game.ui.openCoins();});assert.equal(await p.locator('#free:visible').count(),0);
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({cpuThrottle:4,timing,memory,errors},null,2)+'\n');console.log(JSON.stringify({timing,memory},null,2));
}finally{await browser.close();}
