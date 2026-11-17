import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {pathToFileURL} from 'node:url';import {chromium} from 'playwright';
const out='test-results/stories';fs.mkdirSync(out,{recursive:true});const root=path.resolve('.');
const parent=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><iframe style="width:100vw;height:100vh;border:0"></iframe><script>
const q=new URLSearchParams(location.search);window.calls=[];window.mode='hold';window.pending=null;
window.release=()=>{if(pending){pending();pending=null;}};
addEventListener('message',e=>{
 const m=e.data;if(m?.type!=='vk-connect')return;const {handler,params}=m;calls.push({handler,params});let data={result:true},failed=false;
 if(handler==='SetSupportedHandlers'){if(q.get('support')==='timeout')return;data={supportedHandlers:q.get('support')==='yes'?['VKWebAppShowStoryBox']:[]};failed=q.get('support')==='error';}
 if(handler==='VKWebAppStorageGet')data={keys:params.keys.map(key=>({key,value:''}))};
 if(handler==='VKWebAppCheckNativeAds')data={result:false};
 if(handler==='VKWebAppShowStoryBox'){if(mode==='timeout')return;data={result:mode==='success'};failed=mode==='error';}
 const respond=()=>e.source.postMessage({type:handler+(failed?'Failed':'Result'),data:{...data,request_id:params.request_id,...(failed?{error_type:'client_error'}:{})}},'*');
 if(handler==='VKWebAppShowStoryBox'&&mode==='hold')pending=respond;else setTimeout(respond,5);
});
document.querySelector('iframe').src='/dist-vk/index.html?vk_app_id=98765&vk_platform=desktop_web&vk_client='+(q.get('client')||'vk')+'&vk_language='+(q.get('lang')||'ru');
</script></body></html>`;
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');if(u.pathname==='/parent'){res.setHeader('Content-Type','text/html;charset=utf-8');return res.end(parent);}
 const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.js':'text/javascript','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome'}),errors=[],report=[];
const storyCalls=p=>p.evaluate(()=>calls.filter(c=>c.handler==='VKWebAppShowStoryBox').length);
try{
 for(const [support,client,w,h,lang]of [['yes','vk',390,844,'ru'],['yes','vk',1280,800,'en'],['no','vk',320,568,'ru'],['error','vk',390,844,'ru'],['timeout','vk',390,844,'ru'],['yes','ok',390,844,'ru']]){
  const p=await browser.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.text().includes('[VK] story support'))console.log(m.text());});
  await p.addInitScript(()=>{window.__supportResponses=[];addEventListener('message',e=>{if(e.data?.type?.includes('SupportedHandlers'))window.__supportResponses.push(e.data);});});
  await p.goto(base+'/parent?support='+support+'&client='+client+'&lang='+lang);
  const f=p.frames().find(f=>f.url().includes('/dist-vk/'));assert.ok(f);await f.waitForFunction(()=>window.__PM_BOOT_DONE);
  if(support==='timeout')await p.waitForTimeout(2600);
  await f.evaluate(()=>{__save.data.best=54321;__save.data.bestCalm=12345;__game.startEndless(false);__game.E.score=200;__game.endEndless();});
  if(support==='yes'&&client==='vk'){
    try{await f.waitForFunction(()=>__sdk.canShareRecord(),null,{timeout:4500});}
    catch(e){console.log('Story capability',JSON.stringify(await f.evaluate(()=>({real:__sdk.real,ok:__sdk.ok,id:__sdk.appId,supported:__sdk.storySupported,responses:window.__supportResponses}))),JSON.stringify(await p.evaluate(()=>({search:location.search,calls:calls.filter(c=>c.handler==='SetSupportedHandlers')}))));throw e;}
  }
  const button=f.locator('.result [data-story]');assert.equal(await button.isVisible(),support==='yes'&&client==='vk');assert.equal(await storyCalls(p),0,'Opening a result must never open the editor');
  if(support==='yes'&&client==='vk'){
   const before=await f.evaluate(()=>JSON.stringify(__save.data));await button.click();await p.waitForFunction(()=>calls.some(c=>c.handler==='VKWebAppShowStoryBox'));
   const options=await p.evaluate(()=>calls.find(c=>c.handler==='VKWebAppShowStoryBox').params);
   assert.equal(options.background_type,'image');assert.equal(options.locked,true);assert.deepEqual(options.attachment,{type:'url',text:'play',url:'https://vk.com/app98765'});
   assert.ok(options.blob.startsWith('data:image/png;base64,'));fs.writeFileSync(`${out}/record-${lang}.png`,Buffer.from(options.blob.split(',')[1],'base64'));
   assert.equal(await button.isDisabled(),true);await f.evaluate(()=>document.querySelector('[data-story]').click());assert.equal(await storyCalls(p),1);
   assert.equal(await f.evaluate(()=>JSON.stringify(__save.data)),before,'Sharing must not grant coins or change progress');
   await p.evaluate(()=>release());await button.waitFor({state:'visible'});await f.waitForFunction(()=>!document.querySelector('[data-story]').disabled);
   for(const mode of ['success','error','timeout']){
    await p.evaluate(mode=>window.mode=mode,mode);await button.click();await f.waitForFunction(()=>!document.querySelector('[data-story]').disabled,{timeout:8000});
    assert.equal(await f.evaluate(()=>JSON.stringify(__save.data)),before);
   }
   assert.equal(await f.evaluate(()=>__game.finished),true);assert.equal(await f.evaluate(()=>__sdk.gameplayOn),false);
   await f.locator('.result [data-m]').click();await f.evaluate(()=>__game.ui.leaderboard());await f.locator('[data-story-normal]').waitFor({state:'visible'});assert.equal(await f.locator('[data-story-calm]').isVisible(),true);
   await p.screenshot({path:`${out}/records-${w}.png`,animations:'disabled'});
  }else assert.equal(await storyCalls(p),0);
  const methods=await p.evaluate(()=>calls.map(c=>c.handler));assert.ok(!methods.some(s=>/WallPost|VKWebAppShare$|GetAuthToken|CallAPIMethod|Favorites/.test(s)));
  report.push({support,client,w,h,lang,passed:true});await p.close();
 }
 for(const dir of ['dist-vk-single','dist-single']){
  const p=await browser.newPage();await p.goto(pathToFileURL(path.resolve(dir,'index.html')).href);await p.waitForFunction(()=>window.__PM_BOOT_DONE);
  await p.evaluate(()=>{__game.startEndless(false);__game.E.score=100;__game.endEndless();});assert.equal(await p.locator('[data-story]').isVisible(),false);await p.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/report.json`,JSON.stringify({report,errors,platformResponses:'emulated'},null,2));console.log('PASS stories: user click only, supported VK only, correct image/link, cancellation/error/no response, duplicate guard, no rewards or wall posts, offline/OK hidden');
