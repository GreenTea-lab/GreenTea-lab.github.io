import '../test/remote-browser.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const out='test-results/traffic-models';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});const errors=[];
try{
  const p=await browser.newPage({viewport:{width:1200,height:800},locale:'ru-RU'});p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await p.addInitScript(()=>window.__HS_DEBUG={seed:4100,quality:'high'});await p.goto(pathToFileURL(path.resolve('dist-vk/index.html')).href);await p.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
  await p.evaluate(()=>{__game.manual=true;__save.data.level=30;__save.data.tutDone=true;});
  for(const map of ['town','port','oasis','neoncity']){
    await p.evaluate(map=>{const g=__game;__save.data.map=map;__save.data.mode='zen';g.play();g.view.camFix={dist:29,pitch:1.05};g.me.x=g.map.lines[3]+2;g.me.z=g.map.lines[3]+1;g.view.cam.x=g.me.x;g.view.cam.z=g.me.z;for(let i=0;i<8;i++){g.view.frame(.016,g.sim,g.me);g.view.render();}document.getElementById('ui').style.visibility='hidden';document.querySelectorAll('.toast').forEach(e=>e.remove());},map);
    await p.screenshot({path:out+'/surfaces-'+map+'.png'});
  }
  if(errors.length)throw Error(errors.join('\n'));console.log('SURFACES: 4 maps, no shader errors');
}finally{await browser.close();}
