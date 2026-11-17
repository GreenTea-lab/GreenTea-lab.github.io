import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
export async function runtime(){
 const root=path.resolve('.');
 const parent=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe style="border:0;width:100vw;height:100vh"></iframe><script>
 const q=new URLSearchParams(location.search);window.log=[];window.store=JSON.parse(sessionStorage.cloud||'{}');window.adCheck=q.get('ads')||'true';window.adResult=true;window.holdAds=false;window.heldAd=null;window.failKey='';window.storyResult=true;
 window.releaseAd=()=>{let fn=heldAd;heldAd=null;fn?.();};
 addEventListener('message',e=>{
  if(e.data?.type!=='vk-connect')return;const {handler,params}=e.data;log.push({handler,params});let data={result:true},fail=false;
  if(handler==='SetSupportedHandlers')data={supportedHandlers:q.get('stories')==='false'?[]:['VKWebAppShowStoryBox']};
  if(handler==='VKWebAppStorageGet')data={keys:params.keys.map(key=>({key,value:store[key]||''}))};
  if(handler==='VKWebAppStorageSet'){if(params.key===failKey)fail=true;else{store[params.key]=params.value;sessionStorage.cloud=JSON.stringify(store);}}
  if(handler==='VKWebAppCheckNativeAds'){fail=adCheck==='error';data={result:adCheck==='true'};if(adCheck==='timeout')return;}
  if(handler==='VKWebAppShowNativeAds'){fail=adResult==='error';data={result:adResult===true};}
  if(handler==='VKWebAppShowStoryBox'){fail=storyResult==='error';data={result:storyResult===true};}
  const send=()=>e.source.postMessage({type:handler+(fail?'Failed':'Result'),data:{...data,request_id:params.request_id,...(fail?{error_type:'client_error',error_data:{error_code:1}}:{})}},'*');
  if(handler==='VKWebAppShowNativeAds'&&holdAds)heldAd=send;else setTimeout(send,5);
 });
 document.querySelector('iframe').src='/dist-vk/index.html?vk_app_id=123&vk_language='+(q.get('lang')||'ru')+'&vk_platform='+(q.get('platform')||'desktop_web')+'&vk_client='+(q.get('client')||'vk');
 </script>`;
 const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/parent'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(parent);}
  if(u.pathname==='/favicon.ico'){res.writeHead(204);return res.end();}
  const f=path.resolve(root,'.'+decodeURIComponent(u.pathname));
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.woff2':'font/woff2','.webp':'image/webp'})[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
 return {browser,base:`http://127.0.0.1:${server.address().port}`,close:async()=>{await browser.close();server.close();}};
}
