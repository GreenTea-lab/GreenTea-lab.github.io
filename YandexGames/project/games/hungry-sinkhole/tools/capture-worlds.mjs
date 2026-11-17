import '../test/remote-browser.mjs';
import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {MAPS} from '../src/city.js';
fs.mkdirSync('static/maps',{recursive:true});fs.mkdirSync('test-results/world-art',{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try{
 const p=await browser.newPage({viewport:{width:1000,height:650},locale:'ru-RU'});const errors=[];p.on('pageerror',e=>errors.push(e.stack));
 await p.addInitScript(()=>window.__HS_DEBUG={seed:4100,quality:'high'});
 await p.goto(pathToFileURL(path.resolve('dist-vk/index.html')).href);await p.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
 await p.evaluate(()=>{__game.manual=true;__save.data.level=30;__save.data.tutDone=true;});
 const memory=[];
 for(const m of MAPS){
  await p.evaluate(id=>{const g=__game;g.ui.closeModal();__save.data.map=id;__save.data.mode='zen';g.play();g.view.camFix={dist:74,pitch:1.03};g.view.cam.x=0;g.view.cam.z=0;g.me.x=0;g.me.z=0;g.me.r=5;for(let i=0;i<8;i++){g.view.frame(.016,g.sim,g.me);g.view.render();}document.querySelector('#ui').style.visibility='hidden';document.querySelectorAll('.toast').forEach(e=>e.remove());},m.id);
  await p.waitForTimeout(100);await p.screenshot({path:'test-results/world-art/'+m.id+'.png'});
  const result=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=320;c.height=208;c.getContext('2d').drawImage(document.querySelector('#c'),0,0,320,208);return c.toDataURL('image/webp',.85).split(',')[1];});
  fs.writeFileSync('static/maps/'+m.id+'.webp',Buffer.from(result,'base64'));
  memory.push(await p.evaluate(()=>({map:__save.data.map,...__game.view.renderer.info.memory})));
  await p.evaluate(()=>__game.menu());console.log('CAPTURE',m.id);
 }
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync('test-results/world-art/report.json',JSON.stringify({memory,errors},null,2)+'\n');
}finally{await browser.close();}
