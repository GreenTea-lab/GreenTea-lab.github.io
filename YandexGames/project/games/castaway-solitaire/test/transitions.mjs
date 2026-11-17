import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runtime} from './runtime.mjs';
const R=await runtime(),out='test-results/transitions',report=[],errors=[];fs.mkdirSync(out,{recursive:true});
try{
 for(const [name,viewport]of [['desktop',{width:1280,height:800}],['phone',{width:390,height:844}]]){
  const p=await R.browser.newPage({viewport});p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{window.__CS_DEBUG={manual:true};localStorage.setItem('castaway_solitaire_v1',JSON.stringify({level:1001,coins:1000,seen:{coin:1,lock:1,sand:1,keys2:1,wild:1,tableTools:1},settings:{quality:'low'}}));});
  await p.goto(R.base+'/dist-vk-single/index.html');await p.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
  for(const route of ['buildPanel','levels','world','journal','shop','settings','cosmetics','leaderboard','daily']){
   const opening=await p.evaluate(route=>{__game.ui[route]();const m=__game.ui.mod.lastElementChild;return {wrap:m.getAnimations().length,panel:m.querySelector('.panel').getAnimations().length};},route);
   assert.ok(opening.wrap&&opening.panel,route+' enters smoothly');
   await p.waitForTimeout(300);
   await p.evaluate(()=>__game.ui.mod.lastElementChild.close());
   assert.ok(await p.evaluate(()=>document.querySelectorAll('.ui-ghost').length>0));
   assert.equal(await p.locator('#mod .modal').count(),0);
   await p.waitForTimeout(240);assert.equal(await p.locator('.ui-ghost').count(),0);
  }
  await p.evaluate(()=>__game.ui.levels());await p.locator('[data-ch="1"]').click();await p.locator('[data-chnext]').click();await p.locator('[data-map]').click();
  assert.equal(await p.locator('#mod .modal').count(),1);await p.locator('[data-x]').click();
  // Rapid replacements have a single live panel; the fading copies carry no controls or duplicate IDs.
  await p.evaluate(()=>{__game.ui.cosmetics();for(let i=0;i<8;i++)__game.ui.mod.lastElementChild.querySelector('[data-style="'+(i%2?'island':'lagoon')+'"]').click();});
  assert.equal(await p.locator('#mod .modal').count(),1);
  assert.equal(await p.locator('.ui-ghost [data-style]').count(),0);
  const unique=await p.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return new Set(ids).size===ids.length;});assert.ok(unique);
  await p.waitForTimeout(300);assert.equal(await p.locator('.ui-ghost').count(),0);
  await p.evaluate(()=>{__game.ui.closeModals();__game.playLevel(7);for(let k=0;k<90;k++)__game.table.update(.05);});await p.waitForTimeout(350);
  await p.locator('[data-a=pause]').click();await p.waitForTimeout(300);
  const state=await p.evaluate(()=>JSON.stringify(__game.table.g));
  await p.evaluate(()=>__game.ui.mod.lastElementChild.close());
  assert.equal(await p.evaluate(()=>__game.table.hooks.canInput()),false);
  const stock=await p.evaluate(()=>__game.table.stockPos);await p.mouse.click(stock.x,stock.y);
  assert.equal(await p.evaluate(()=>JSON.stringify(__game.table.g)),state);
  await p.waitForTimeout(220);assert.equal(await p.evaluate(()=>__game.table.hooks.canInput()),true);
  await p.evaluate(()=>{window.closedCount=0;const m=__game.ui.modal({title:'Check',body:'',onClose:()=>closedCount++});m.close();m.close();});
  assert.equal(await p.evaluate(()=>closedCount),1);
  await p.waitForTimeout(250);await p.evaluate(()=>{__game.toIsland(false);__game.ui.settings();});await p.waitForTimeout(70);await p.screenshot({path:out+'/'+name+'-enter.png'});
  await p.waitForTimeout(300);await p.close();report.push({name,passed:true});console.log('PASS navigation transitions',name);
 }
 const p=await R.browser.newPage({reducedMotion:'reduce'});await p.goto(R.base+'/dist-vk-single/index.html');await p.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
 const reduced=await p.evaluate(()=>{__game.ui.settings();const m=__game.ui.mod.lastElementChild,n=m.getAnimations().length+m.querySelector('.panel').getAnimations().length;m.close();return {n,ghosts:document.querySelectorAll('.ui-ghost').length,guard:!!__game.ui.transitioning};});
 assert.deepEqual(reduced,{n:0,ghosts:0,guard:false});await p.close();assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/report.json',JSON.stringify({report,reducedMotion:reduced,errors},null,2));console.log('PASS reduced motion and close callbacks');
}finally{await R.close();}
