import './remote-browser.mjs';
if(process.platform!=='linux')throw new Error('Cloud checks require Linux');
import {chromium} from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const out=path.resolve('test-results/audit/ads');fs.mkdirSync(out,{recursive:true});
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
const browser=await chromium.launch({}),report={checks:[],errors:[]};
const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});p.on('pageerror',e=>report.errors.push(e.stack));
const check=(name,value)=>{report.checks.push({name,passed:!!value});assert.ok(value,name);console.log('PASS',name);};
try{
 await p.goto(base+'/parent');await p.waitForFunction(()=>document.querySelector('iframe')?.contentWindow?.__game?.ui&&!document.querySelector('iframe').contentDocument.querySelector('#loader'),null,{timeout:90000});
 const f=p.frames().find(f=>f.url().includes('/dist-vk/'));await f.waitForFunction(()=>__sdk.canReward());
 await f.evaluate(()=>{const g=__game;g.quality='low';g.view.setQuality('low');__save.data.tutDone=true;g.play();g.time=60;g.me.pts=1000;g.end();});
 const firstCalls=await p.evaluate(()=>calls.filter(c=>c.handler==='VKWebAppShowNativeAds').length);
 await f.locator('#menu').click();check('first result transition has no interstitial',(await p.evaluate(()=>calls.filter(c=>c.handler==='VKWebAppShowNativeAds').length))===firstCalls);
 await f.evaluate(()=>{__game.ui.giftShown=true;__game.ui.closeModal();__game.play();__game.time=60;__game.me.pts=1000;__game.end();});
 await p.evaluate(()=>{holdAds=true;releaseAd=null;});
 const before=await f.evaluate(()=>({coins:__save.data.coins,reward:__game.lastRes.coins}));
 await f.locator('#x2').click();await p.waitForFunction(()=>releaseAd!==null);
 // Dispatch repeated user clicks on the same still-visible button, while the ad is held.
 await f.locator('#x2').dispatchEvent('click');await f.locator('#x2').dispatchEvent('click');
 const shows=await p.evaluate(()=>calls.filter(c=>c.handler==='VKWebAppShowNativeAds').length);
 check('repeated reward-button clicks request one ad',shows===firstCalls+1);
 await p.evaluate(()=>{holdAds=false;releaseAd();});await f.waitForFunction(()=>!__sdk.adActive);
 check('reward confirmed once',await f.evaluate(b=>__save.data.coins===b.coins+b.reward&&__game.lastRes.doubled,before));await p.screenshot({path:out+'/reward-confirmed.png'});
 // Late reward after entering a new round must not credit the stale result.
 await f.evaluate(()=>{__game.play();__game.time=60;__game.me.pts=1000;__game.end();});await p.evaluate(()=>{holdAds=true;releaseAd=null;});await f.locator('#x2').click();await p.waitForFunction(()=>releaseAd!==null);
 const staleCoins=await f.evaluate(()=>{__game.play();return __save.data.coins;});await p.evaluate(()=>{holdAds=false;releaseAd();});await f.waitForFunction(()=>!__sdk.adActive);
 check('late ad response does not award another round',await f.evaluate(c=>__save.data.coins===c,staleCoins));check('no page errors',report.errors.length===0);
}finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();server.close();}
