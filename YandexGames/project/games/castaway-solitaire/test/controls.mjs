import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runtime} from './runtime.mjs';
const R=await runtime(),out='test-results/controls',errors=[],report=[];fs.mkdirSync(out,{recursive:true});
try{
 for(const cfg of [{name:'desktop',w:1280,h:800},{name:'phone',w:390,h:844,mobile:true},{name:'small',w:320,h:568,mobile:true},{name:'landscape-en',w:844,h:390,mobile:true,lang:'en'}]){
  const c=await R.browser.newContext({viewport:{width:cfg.w,height:cfg.h},locale:'ru-RU',isMobile:!!cfg.mobile,hasTouch:!!cfg.mobile});
  await c.addInitScript(()=>{window.__CS_DEBUG={manual:true};localStorage.setItem('castaway_solitaire_v1',JSON.stringify({settings:{quality:'low'},seen:{tableTools:1},cosmetics:{theme:'lagoon',owned:['island','lagoon','sea'],back:'sea'}}));});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(R.base+'/parent?lang='+(cfg.lang||'ru'));
  const f=p.frames().find(f=>f.url().includes('dist-vk'));await f.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
  assert.equal(await f.evaluate(()=>document.documentElement.dataset.theme),'island');
  await f.locator('[data-a=play]').click();await f.evaluate(()=>{for(let k=0;k<90;k++)__game.table.update(.05);__game.island.update(.05);__game.island.render();__game.table.render();});await f.waitForTimeout(350);
  const gameplay=await f.evaluate(()=>JSON.stringify(__game.table.g));
  const header=await f.locator('.hud-top').evaluate(e=>[...e.querySelectorAll('button,.hud-c')].map(n=>{const r=n.getBoundingClientRect();return {x:r.x,right:r.right,bottom:r.bottom};}));assert.ok(header.every(r=>r.x>=-1&&r.right<=cfg.w+1),'Header fits');
  const bar=await f.locator('.play-toolbar').boundingBox();assert.ok(bar.x>=0&&bar.x+bar.width<=cfg.w+1&&bar.y>=0&&bar.y+bar.height<=cfg.h);
  for(const value of [70,100,Number(await f.locator('#cardScale').getAttribute('max'))]){
   await f.locator('#cardScale').fill(String(value));
   assert.equal(await f.evaluate(()=>JSON.stringify(__game.table.g)),gameplay);
   const bounds=await f.evaluate(()=>{const t=__game.table;return {scale:t.cardScale,fit:t.sprites.every(s=>s.x-t.cw/2>=-1&&s.x+t.cw/2<=innerWidth+1&&s.y-t.ch/2>=t.topRes-1&&s.y+t.ch/2<t.stockPos.y-t.ch/2),top:t.topRes};});assert.ok(bounds.fit,JSON.stringify({cfg,value,bounds}));
  }
  await f.evaluate(()=>__game.table.render());await p.screenshot({path:`${out}/${cfg.name}-cards.png`});
  await f.locator('[data-a=scene]').click();assert.equal(await f.evaluate(()=>__sdk.gameplayOn),false);
  await f.locator('[data-style=lagoon]').click();assert.equal(await f.evaluate(()=>document.documentElement.dataset.theme),'lagoon');await f.locator('[data-x]').click();
  await f.locator('[data-a=pause]').click();const snapshot=await f.evaluate(()=>JSON.stringify(__game.table.g));await f.locator('[data-k=music]').fill('25');await f.page().keyboard.press('Space');assert.ok(await f.evaluate(()=>__game.paused));assert.equal(await f.evaluate(()=>JSON.stringify(__game.table.g)),snapshot);await f.locator('[data-a=resume]').click();
  await f.evaluate(()=>{__game.toIsland(false);__game.ui.settings();});await f.locator('[data-appearance]').click();await f.waitForTimeout(350);await p.screenshot({path:`${out}/${cfg.name}-settings.png`});
  const ids=await f.locator('svg defs [id]').evaluateAll(nodes=>nodes.map(n=>n.id));assert.equal(new Set(ids).size,ids.length,'SVG gradients keep independent IDs');
  await c.close();report.push({name:cfg.name,passed:true});console.log('PASS controls',cfg.name);
 }
 // A real upgrade spawns its companion once and restores it on a fresh page.
 const c=await R.browser.newContext({viewport:{width:1280,height:800}}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.__CS_DEBUG={};localStorage.setItem('castaway_solitaire_v1',JSON.stringify({level:61,levels:Object.fromEntries(Array.from({length:60},(_,i)=>[i+1,{stars:3,best:100}])),stages:{hut:1},settings:{quality:'low',cardScale:85},seen:{tableTools:1}}));});
 await p.goto(R.base+'/dist-vk-single/index.html');await p.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
 assert.equal(await p.evaluate(()=>__game.island.landAnimals.filter(w=>w.species==='dog').length),0);
 await p.evaluate(()=>__game.ui.project('hut'));await p.locator('[data-a=go]').click();await p.waitForTimeout(900);assert.equal(await p.evaluate(()=>__game.island.landAnimals.filter(w=>w.species==='dog').length),1);
 await p.evaluate(()=>__game.expandIsland());await p.evaluate(()=>{__save.data.stages.boathouse=1;__game.island.setStages(__save.data.stages);__game.ui.project('boathouse');});await p.locator('[data-a=go]').click();await p.waitForTimeout(900);assert.equal(await p.evaluate(()=>__game.island.walkers.filter(w=>w.id==='fisher').length),1);
 await p.evaluate(()=>{__game.island.setStages(__save.data.stages);__game.setCardScale(85);});assert.equal(await p.evaluate(()=>__game.island.walkers.filter(w=>w.id==='fisher').length),1);
 const restored=await c.newPage();await restored.goto(R.base+'/dist-vk-single/index.html');await restored.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
 assert.equal(await restored.evaluate(()=>__save.data.settings.cardScale),85);assert.equal(await restored.evaluate(()=>__game.island.landAnimals.filter(w=>w.species==='dog').length),1);assert.equal(await restored.evaluate(()=>__game.island.walkers.filter(w=>w.id==='fisher').length),1);await c.close();
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({report,upgradeSpawns:true,persistence:true,errors},null,2));console.log('PASS controls, upgrades and persistence');
}finally{await R.close();}
