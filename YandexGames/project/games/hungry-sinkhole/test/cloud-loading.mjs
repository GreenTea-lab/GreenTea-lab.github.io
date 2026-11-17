import './remote-browser.mjs';
if(process.platform!=='linux')throw new Error('Cloud checks require Linux');
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';import {chromium} from 'playwright';
const out='test-results/audit/loading';fs.mkdirSync(out,{recursive:true});const report={checks:[],errors:[]},b=await chromium.launch({});
const url=pathToFileURL(path.resolve('dist-vk/index.html')).href;
const check=(name,value)=>{report.checks.push({name,passed:!!value});assert.ok(value,name);console.log('PASS',name);};
try{
 for(const [name,width,height]of [['desktop',1440,900],['phone',390,844],['small',320,568],['landscape',844,390]]){
  const p=await b.newPage({viewport:{width,height},locale:'ru-RU'});p.on('pageerror',e=>report.errors.push(e.stack));let release;const gate=new Promise(r=>release=r);await p.route('**/game.js',async route=>{await gate;await route.continue().catch(()=>{});});
  await p.goto(url,{waitUntil:'commit'});await p.locator('.load-panel').waitFor();await p.evaluate(()=>document.fonts.ready);
  const bounds=await p.locator('.load-brand,.load-panel,.load-scene,.load-footer').evaluateAll(els=>els.map(e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};}));check('loader fits '+name,bounds.every(b=>b.x>=-2&&b.y>=0&&b.x+b.w<=width+2&&b.y+b.h<=height));await p.screenshot({path:out+'/'+name+'.png'});await p.close();release();
 }
 const p=await b.newPage({viewport:{width:390,height:844},locale:'ru-RU',reducedMotion:'reduce'});p.on('pageerror',e=>report.errors.push(e.stack));await p.addInitScript(()=>{window.__HS_DEBUG={quality:'low',seed:4100};window.__loadStages=[];new MutationObserver(()=>{const l=document.getElementById('loader');if(l&&__loadStages.at(-1)!==+l.dataset.stage)__loadStages.push(+l.dataset.stage);}).observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['data-stage']});});
 let release;const gate=new Promise(r=>release=r);await p.route('**/game.js',async route=>{await gate;await route.continue();});await p.goto(url,{waitUntil:'commit'});await p.locator('.load-panel').waitFor();check('reduced motion disables loader orbit',await p.locator('.load-orbit').evaluate(e=>getComputedStyle(e).animationName)==='none');release();await p.waitForFunction(()=>window.__game?.sim&&!document.querySelector('#loader'),null,{timeout:90000});
 const stages=await p.evaluate(()=>__loadStages);check('all six loading stages are reached',JSON.stringify(stages)===JSON.stringify([0,1,2,3,4,5]));await p.close();
 const e=await b.newPage({viewport:{width:390,height:844},locale:'ru-RU'});await e.route('**/game.js',route=>route.abort('failed'));await e.goto(url);await e.locator('#load-retry:visible').waitFor();check('bundle failure offers retry',(await e.locator('#lt').textContent()).includes('Не удалось'));await e.screenshot({path:out+'/error.png'});await e.close();
 const single=await b.newPage();single.on('pageerror',e=>report.errors.push(e.stack));await single.addInitScript(()=>window.__HS_DEBUG={quality:'low'});await single.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);await single.waitForFunction(()=>window.__game?.sim&&!document.querySelector('#loader'),null,{timeout:90000});check('single-file VK build starts',true);await single.close();check('no page errors in successful loads',report.errors.length===0);
}finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');await b.close();}
