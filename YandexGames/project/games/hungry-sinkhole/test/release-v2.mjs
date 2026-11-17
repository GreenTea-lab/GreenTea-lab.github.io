import './remote-browser.mjs';
import {chromium} from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const out=path.resolve('test-results/release-v2');fs.mkdirSync(out,{recursive:true});
const parent=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;overflow:hidden"><iframe style="width:100vw;height:100vh;border:0"></iframe><script>
const q=new URLSearchParams(location.search);window.calls=[];window.store={};window.adResult=true;window.storyMode='success';window.holdAds=false;window.releaseAd=null;
addEventListener('message',e=>{const m=e.data;if(m?.type!=='vk-connect')return;const{handler,params}=m;calls.push({handler,params});let data={result:true},fail=false;
if(handler==='SetSupportedHandlers')data={supportedHandlers:q.get('support')==='no'?[]:['VKWebAppShowStoryBox']};
if(handler==='VKWebAppStorageGet')data={keys:params.keys.map(key=>({key,value:store[key]||''}))};
if(handler==='VKWebAppStorageSet')store[params.key]=params.value;
if(handler==='VKWebAppShowNativeAds')data={result:adResult};
if(handler==='VKWebAppCheckNativeAds')data={result:q.get('ads')!=='no'};
if(handler==='VKWebAppShowStoryBox'){data={result:storyMode==='success'};fail=storyMode==='error';}
const respond=()=>e.source.postMessage({type:handler+(fail?'Failed':'Result'),data:{...data,request_id:params.request_id,...(fail?{error_type:'client_error',error_data:{error_code:1}}:{})}},'*');
if(handler==='VKWebAppShowNativeAds'&&holdAds)releaseAd=respond;else setTimeout(respond,5);
});document.querySelector('iframe').src='/dist-vk/index.html?vk_app_id=123&vk_language='+(q.get('lang')||'ru')+'&vk_platform='+(q.get('platform')||'desktop_web')+'&vk_client='+(q.get('client')||'vk');</script>`;
const root=path.resolve('.');
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(u.pathname==='/parent'){res.setHeader('Content-Type','text/html;charset=utf-8');return res.end(parent);}if(u.pathname==='/favicon.ico'){res.writeHead(204);return res.end();}const f=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});const errors=[],report=[];
const loaded=async p=>{await p.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.__game?.ui&&!document.querySelector('iframe').contentDocument.querySelector('#loader'),null,{timeout:60000});return p.frames().find(f=>f.url().includes('/dist-vk/'));};
try{
 for(const cfg of [{name:'desktop',w:1440,h:900},{name:'phone',w:390,h:844,mobile:true,platform:'mobile_android'},{name:'small',w:320,h:568,mobile:true,client:'ok',platform:'mobile_iphone'},{name:'landscape',w:844,h:390,mobile:true,lang:'en'},{name:'unsupported',w:1280,h:720,support:'no',ads:'no'}]){
  const ctx=await browser.newContext({viewport:{width:cfg.w,height:cfg.h},hasTouch:!!cfg.mobile,isMobile:!!cfg.mobile,locale:'ru-RU'});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(cfg.name+':'+e.stack));
  await p.goto(base+'/parent?'+new URLSearchParams(cfg));const f=await loaded(p);await p.screenshot({path:out+'/'+cfg.name+'-menu.png'});
  const btn=f.locator('#play'),bounds=await btn.boundingBox();assert.ok(bounds.y>=0&&bounds.y+bounds.height<=cfg.h,'Play button fits '+cfg.name);
  if(cfg.h>cfg.w){const title=await f.locator('.logo').boundingBox(),modes=await f.locator('.modes').boundingBox();assert.ok(title.y+title.height<=modes.y,'Title does not overlap modes '+cfg.name);}
  await btn.click();await f.waitForFunction(()=>__game.state==='play'&&__game.sim.time>.1);await p.screenshot({path:out+'/'+cfg.name+'-play.png'});
  if(cfg.mobile){await f.waitForFunction(()=>document.querySelectorAll('#board .lb-row').length===5);await f.locator('#board-toggle').click();}
  await f.waitForFunction(()=>document.querySelectorAll('#board .lb-row').length>=10);
  assert.ok(await f.locator('#board .lb-row').count()>=10,'Whole top 10 is visible');
  await f.locator('#pause').click();const time=await f.evaluate(()=>__game.time);
  const slider=f.locator('[data-k=music]');await slider.fill('25');await slider.dispatchEvent('change');await slider.click();
  await p.waitForTimeout(300);assert.equal(await f.evaluate(()=>__game.time),time);assert.ok(await f.evaluate(()=>__game.paused&&__game.ui.modalOpen));
  await p.screenshot({path:out+'/'+cfg.name+'-pause.png'});await f.locator('#res').click();assert.equal(await f.evaluate(()=>__game.paused),false);
  await f.evaluate(()=>{__save.data.tutDone=true;__game.skipTut();__game.stats.eaten=70;__game.me.pts=600;__game.end();});
  await p.screenshot({path:out+'/'+cfg.name+'-result.png'});
  if(cfg.client==='ok'||cfg.support==='no'){assert.equal(await f.locator('.story:visible').count(),0);}else{
   await f.waitForFunction(()=>__sdk.canShareRecord());await f.locator('.story').click();await p.waitForFunction(()=>calls.some(c=>c.handler==='VKWebAppShowStoryBox'));
   const options=await p.evaluate(()=>calls.find(c=>c.handler==='VKWebAppShowStoryBox').params);assert.equal(options.attachment.url,'https://vk.com/app123');assert.ok(options.blob.startsWith('data:image/png;base64,'));fs.writeFileSync(out+'/story-'+cfg.name+'.png',Buffer.from(options.blob.split(',')[1],'base64'));
   await p.evaluate(()=>storyMode='cancel');await f.locator('.story').click();await f.waitForFunction(()=>!__sdk.storyBusy);
   await p.evaluate(()=>storyMode='error');await f.locator('.story').click();await f.waitForFunction(()=>!__sdk.storyBusy);
  }
  await f.locator('#menu').click();await p.waitForTimeout(700);if(await f.locator('#gtake').isVisible())await f.locator('#gtake').click();await f.locator('#expeditions').click();await p.screenshot({path:out+'/'+cfg.name+'-expeditions.png'});await f.locator('[data-exp="1"]').click();
  assert.equal(await f.evaluate(()=>__game.mode),'expedition');assert.equal(await f.evaluate(()=>__game.sim.regen),false);
  await f.evaluate(()=>{__game.stats.eaten=70;__game.me.pts=700;__game.end();});assert.equal(await f.evaluate(()=>__save.data.expeditions[1]),3);
  await f.locator('#freewalk').click();assert.equal(await f.evaluate(()=>__game.mode),'zen');assert.equal(await f.evaluate(()=>__game.sim.regen),true);
  await f.evaluate(()=>__save.flush());assert.ok(await p.evaluate(()=>Object.keys(store).length)>0);
  assert.equal(await p.evaluate(()=>calls.some(c=>/WallPost|AddToFavorites|Leaderboard/.test(c.handler))),false);
  report.push({name:cfg.name,passed:true});await ctx.close();console.log('PASS',cfg.name);
 }
 // Actual ad hold: the simulation remains stopped until a confirmed response.
 const ctx=await browser.newContext({viewport:{width:1280,height:800}}),p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.stack));await p.goto(base+'/parent');const f=await loaded(p);
 await f.waitForFunction(()=>__sdk.canReward());await f.locator('#play').click();await p.evaluate(()=>holdAds=true);
 await f.evaluate(()=>{window.rewardCount=0;__sdk.showRewarded(()=>rewardCount++);__sdk.showRewarded(()=>rewardCount++);});await p.waitForFunction(()=>releaseAd!==null);
 const t=await f.evaluate(()=>__game.time);await p.waitForTimeout(5500);assert.equal(await f.evaluate(()=>__game.time),t);assert.equal(await f.evaluate(()=>__audio.ctx?.state==='running'),false);
 await p.evaluate(()=>{holdAds=false;releaseAd();});await f.waitForFunction(()=>!__sdk.adActive);assert.equal(await f.evaluate(()=>rewardCount),1);
 await p.evaluate(()=>adResult=false);await f.evaluate(()=>__sdk.showRewarded(()=>rewardCount++));await f.waitForFunction(()=>!__sdk.adActive);assert.equal(await f.evaluate(()=>rewardCount),1);
 await f.evaluate(()=>__game.menu());await f.locator('#snd').click();await f.locator('[data-k=sfx]').fill('40');await f.locator('.mx').click();assert.equal(await f.evaluate(()=>__game.state),'menu');
 await ctx.close();report.push({name:'ad-hold-cancel-double',passed:true});
 assert.deepEqual(errors,[]);console.log('NO PAGE ERRORS');
}finally{fs.writeFileSync(out+'/report.json',JSON.stringify({report,errors},null,2)+'\n');await browser.close();server.close();}
