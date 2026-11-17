import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runtime} from './runtime.mjs';
const R=await runtime(),out='test-results/art';fs.mkdirSync(out,{recursive:true});
try{
 for(const phone of [false,true]){
  const page=await R.browser.newPage({viewport:phone?{width:390,height:844}:{width:1280,height:800}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(R.base+'/dist-vk-single/index.html');await page.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
  await page.locator('[data-a=play]').click();await page.waitForTimeout(1800);
  for(const theme of ['lagoon','sunset','moon']){
   await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
   const url=await page.locator('#shade').evaluate(e=>getComputedStyle(e).backgroundImage.match(/url\("?(.*?)"?\)/)?.[1]);
   assert.ok(url?.startsWith('data:image/webp;'));
   assert.ok(await page.evaluate(async u=>{const i=new Image();i.src=u;await i.decode();return i.naturalWidth>0;},url));
   await page.screenshot({path:`${out}/${theme}-${phone?'phone':'wide'}.png`});
  }
  await page.evaluate(()=>{__game.toIsland(false);__game.ui.cosmetics();});await page.waitForTimeout(400);
  await page.screenshot({path:`${out}/styles-${phone?'phone':'wide'}.png`});
  assert.deepEqual(errors,[]);await page.close();
 }
 const page=await R.browser.newPage();await page.addInitScript(()=>{
  window.__CS_DEBUG={};window.YaGames={init:async()=>({environment:{i18n:{lang:'ru'}},on(){},getPlayer:async()=>({getData:async()=>({}),setData:async()=>{}}),adv:{showRewardedVideo({callbacks:c}){window.__adCallbacks=c;}}})};
 });
 await page.goto(R.base+'/dist/index.html');await page.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
 await page.evaluate(()=>{window.__grants=0;__audio.unlock();__sdk.showRewarded(()=>__grants++);__sdk.showRewarded(()=>__grants++);});
 await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>__audio.ctx.state),'suspended');
 await page.evaluate(()=>{__adCallbacks.onRewarded();__adCallbacks.onClose();__adCallbacks.onClose();});await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>__grants),1);assert.equal(await page.evaluate(()=>__audio.suspendReasons.has('ad')),false);await page.close();
 console.log('PASS: six embedded backgrounds, desktop/phone screenshots, Yandex ad callbacks');
}finally{await R.close();}
