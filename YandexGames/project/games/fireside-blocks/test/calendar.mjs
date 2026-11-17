import{chromium}from'playwright';import{pathToFileURL}from'node:url';import path from'node:path';import assert from'node:assert/strict';
const b=await chromium.launch({channel:'chrome'}),p=await b.newPage();
try{
 await p.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);await p.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
 for(const mode of ['weekly','challenge']){
  await p.evaluate(mode=>{__game.toMenu();__game.ui[mode]();},mode);
  await p.locator(mode==='weekly'?'[data-event]':'[data-start]').click();await p.locator('[data-go]').click();
  const flag=mode==='weekly'?'eventRun':'dailyRun',before=await p.evaluate(flag=>JSON.stringify(__game[flag]),flag);
  await p.locator('[data-a=pause]').click();await p.locator('[data-r]').click();await p.locator('[data-go]').click();
  assert.equal(await p.evaluate(flag=>JSON.stringify(__game[flag]),flag),before);assert.equal(await p.evaluate(()=>Object.keys(__save.data.levels).length),0);
 }
 await p.evaluate(()=>{__game.toMenu();__game.ui.weekly();});await p.locator('[data-event]').click();await p.locator('[data-go]').click();
 await p.evaluate(()=>{__save.data.weekly.run=null;__game.eventRun.key='2000-01-01';__game.saveAdventure();});assert.equal(await p.evaluate(()=>__save.data.weekly.run),null);
 await p.evaluate(()=>{const key=__save.data.weekly.key;__save.data.trophies.push({key,scene:'autumn'});__save.data.weekly.key='old';__game.toMenu();__game.ui.weekly();});
 assert.equal(await p.evaluate(()=>__save.data.weekly.stage),5);assert.equal(await p.locator('[data-event]').count(),0);
 console.log('PASS restart identity, expired week, trophy deduplication');
}finally{await b.close();}
