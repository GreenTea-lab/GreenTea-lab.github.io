// Настоящая VK-сборка в Chrome; ответы внешней платформы эмулируются родителем iframe.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('.');
const out = path.resolve('test-results/moderation');
fs.mkdirSync(out, { recursive: true });
const parent = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;overflow:hidden">
<iframe id="f" style="width:100vw;height:100vh;border:0"></iframe>
<script>
const q = new URLSearchParams(location.search);
window.log = []; window.store = JSON.parse(sessionStorage.getItem('cloud') || '{}');
window.adResult = true; window.heldAd = null; window.holdAds = false; window.failKey = '';
window.adCheck = q.get('ads') || 'true';
window.releaseAd = () => { if (heldAd) { const f = heldAd; heldAd = null; f(); } };
addEventListener('message', e => {
  const m = e.data; if (m?.type !== 'vk-connect') return;
  const {handler, params} = m; log.push({handler, params});
  let data = { result: true }, failed = false;
  if (handler === 'VKWebAppStorageGet') data = {keys: params.keys.map(key => ({key, value: store[key] || ''}))};
  if (handler === 'VKWebAppStorageSet') {
    if (params.value.length > 4096 || params.key === failKey) failed = true;
    else { store[params.key] = params.value; sessionStorage.setItem('cloud', JSON.stringify(store)); }
  }
  if (handler === 'VKWebAppShowNativeAds') { failed = adResult === 'error'; data = {result: adResult === true}; }
  if (handler === 'VKWebAppCheckNativeAds') { failed = adCheck === 'error'; data = {result: adCheck === 'true'}; }
  const respond = () => e.source.postMessage({type: handler + (failed ? 'Failed' : 'Result'), data: {...data, request_id: params.request_id, ...(failed ? {error_type:'client_error',error_data:{error_code:1,error_reason:'test'}} : {})}}, '*');
  if (handler === 'VKWebAppShowNativeAds' && holdAds) heldAd = respond;
  else setTimeout(respond, handler === 'VKWebAppCheckNativeAds' && adCheck === 'timeout' ? 6000 : 5);
});
document.querySelector('iframe').src = '/dist-vk/index.html?vk_app_id=123&vk_language=' + (q.get('lang') || 'ru') + '&vk_platform=' + (q.get('platform') || 'desktop_web') + '&vk_client=' + (q.get('client') || 'vk') + '&sign=test';
</script></body></html>`;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/parent') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); return res.end(parent); }
  if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.woff2':'font/woff2'})[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : process.platform === 'win32' ? {channel:'chrome'} : {}) });
const errors = [], report = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function loaded(page){
 const f=page.frames().find(f=>f.url().includes('/dist-vk/index.html'));
 assert.ok(f);await f.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
 await f.evaluate(()=>window.dispatchEvent(new Event('focus')));
 return f;
}
async function solve(f){
 await f.evaluate(()=>{
  const A=__game;
  for(let n=0;n<150&&!A.finished;n++){
   const p=__plan(A.st.game,{beam:3})[0];
   if(!p)throw new Error('No solution: '+A.levelIdx);
   A.placeAt(p.slot,p.x,p.y);
  }
  if(!A.st.game.won())throw new Error('Not won');
 });
 await f.waitForSelector('.result');
}
async function stopped(f){
 const before=await f.evaluate(()=>JSON.stringify(__game.st.game.toJSON()));
 await f.evaluate(()=>{const A=__game,p=__plan(A.st.game,{beam:1})[0];if(p)A.placeAt(p.slot,p.x,p.y);});
 assert.equal(await f.evaluate(()=>JSON.stringify(__game.st.game.toJSON())),before);
 assert.equal(await f.evaluate(()=>__sdk.gameplayOn),false);
}
try{
 for(const cfg of [
  {name:'vk-desktop',w:1440,h:900}, {name:'vk-phone',w:390,h:844,mobile:true,platform:'mobile_android'},
  {name:'vk-ios',w:390,h:844,mobile:true,platform:'mobile_iphone'},
  {name:'ok-small',w:320,h:568,mobile:true,platform:'mobile_iphone',client:'ok'},
  {name:'ok-web',w:1280,h:720,client:'ok'},
  {name:'ok-android',w:390,h:844,mobile:true,platform:'mobile_android',client:'ok'},
  {name:'vk-landscape-en',w:844,h:390,mobile:true,platform:'mobile_web',lang:'en'},
 ]){
  const ctx=await browser.newContext({viewport:{width:cfg.w,height:cfg.h},isMobile:!!cfg.mobile,hasTouch:!!cfg.mobile,locale:'ru-RU'});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(cfg.name+': '+e.message));
  await page.goto(base+'/parent?'+new URLSearchParams(cfg));const f=await loaded(page);
  await f.waitForFunction(()=>__game.view.sceneAnim?.kind==='generated');
  await page.screenshot({path:path.join(out,cfg.name+'-menu.png')});
  const click=async selector=>{await f.locator(selector).scrollIntoViewIfNeeded();await f.locator(selector).click();};
  await click('[data-a=travelPlay]');assert.equal(await f.evaluate(()=>__game.levelIdx),0);
  await click('[data-go]');
  await f.waitForFunction(()=>__game.view.sceneAnim?.kind==='generated');
  await sleep(300);await page.screenshot({path:path.join(out,cfg.name+'-game.png')});
  const bounds=await f.locator('.boost').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));
  assert.ok(bounds.every(r=>r.top>=0&&r.bottom<=cfg.h),'Helpers fit on screen: '+cfg.name);
  await click('[data-a=pause]');await stopped(f);
  const slider=f.locator('[data-k=music]'),rect=await slider.boundingBox();
  await page.mouse.move(rect.x+rect.width*.8,rect.y+rect.height/2);await page.mouse.down();
  await page.mouse.move(rect.x+rect.width*.25,rect.y+rect.height/2,{steps:5});await page.mouse.up();
  assert.ok(await f.evaluate(()=>__game.ui.modalOpen));await stopped(f);
  await sleep(250);await page.screenshot({path:path.join(out,cfg.name+'-pause.png')});
  await click('.modal .bigbtn[data-x]');
  assert.equal(await f.evaluate(()=>__sdk.gameplayOn),true);
  await f.evaluate(()=>window.dispatchEvent(new Event('blur')));await stopped(f);
  await f.evaluate(()=>window.dispatchEvent(new Event('focus')));assert.ok(await f.evaluate(()=>__game.ui.modalOpen));
  await click('.modal .bigbtn[data-x]');
  await f.evaluate(()=>{const A=__game,p=__plan(A.st.game,{beam:3})[0];A.placeAt(p.slot,p.x,p.y);});
  const snapshot=await f.evaluate(()=>JSON.stringify(__game.st.game.toJSON()));
  await page.reload();const f2=await loaded(page);
  await f2.locator('[data-a=travelPlay]').click();await f2.locator('[data-go]').click();
  assert.equal(await f2.evaluate(()=>JSON.stringify(__game.st.game.toJSON())),snapshot);
  await solve(f2);
  assert.equal(await f2.evaluate(()=>__save.data.levels[0].stars>0),true);
  assert.equal(await page.evaluate(()=>log.some(x=>x.handler==='VKWebAppShowNativeAds')),false);
  assert.equal(await page.evaluate(()=>log.some(x=>/Wall|Favorites|Story/.test(x.handler))),false);
  await page.screenshot({path:path.join(out,cfg.name+'-win.png')});
  await ctx.close();report.push({name:cfg.name,passed:true});console.log('PASS',cfg.name);
 }
 // Реклама удерживает ввод и звук дольше короткого тайм-аута, отмена без награды.
 const ctx=await browser.newContext({viewport:{width:1280,height:800}}),page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/parent');let f=await loaded(page);
 await f.waitForFunction(()=>__sdk.canReward());
 await f.evaluate(()=>{__game.startClassic(false);__game.ui.pause();});
 await page.evaluate(()=>holdAds=true);
 const before=await f.evaluate(()=>__save.data.coins);
 await f.evaluate(()=>{__sdk.showRewarded(()=>__game.addCoins(60));__sdk.showRewarded(()=>__game.addCoins(60));});
 await page.waitForFunction(()=>heldAd);
 await stopped(f);await sleep(5500);await stopped(f);
 assert.equal(await f.evaluate(()=>__audio.ctx?.state==='running'),false);
 assert.equal(await page.evaluate(()=>log.filter(x=>x.handler==='VKWebAppShowNativeAds').length),1);
 await page.evaluate(()=>releaseAd());await f.waitForFunction(()=>!__sdk.adActive);
 assert.equal(await f.evaluate(()=>__save.data.coins),before+60);assert.ok(await f.evaluate(()=>__game.ui.modalOpen));
 await page.evaluate(()=>{holdAds=false;adResult=false;});
 await f.evaluate(()=>__sdk.showRewarded(()=>__game.addCoins(60)));await sleep(100);
 assert.equal(await f.evaluate(()=>__save.data.coins),before+60);
 // Задача дня: победа не открывает кампанию, повтор не выдаёт монеты.
 await f.evaluate(()=>{__game.toMenu();__game.ui.challenge();});await f.locator('[data-start]').click();await f.locator('[data-go]').click();
 const coins=await f.evaluate(()=>__save.data.coins);await solve(f);
 assert.equal(await f.evaluate(()=>__save.data.coins),coins+80);
 // Указатель облачного сохранения не переключается при неполной записи.
 await f.evaluate(()=>__save.flush());
 const cloudCoins=await f.evaluate(()=>__save.data.coins);
 await page.evaluate(()=>failKey='fireside_blocks_v1_n');
 await f.evaluate(()=>{__save.data.coins+=25;return __save.flush();});
 assert.equal(await f.evaluate(async()=> (await __sdk.loadData()).coins),cloudCoins);
 await page.evaluate(()=>failKey='');await f.evaluate(()=>__save.flush());
 assert.equal(await f.evaluate(async()=> (await __sdk.loadData()).coins),cloudCoins+25);
 assert.equal(await f.evaluate(()=>Object.keys(__save.data.levels).length),0);
 await f.locator('[data-home]').click();await f.evaluate(()=>__game.ui.challenge());
 await f.locator('[data-start]').click();await f.locator('[data-go]').click();await solve(f);
 assert.equal(await f.evaluate(()=>__save.data.coins),coins+105);
 // Все сцены декодируются и резервная сцена продолжает работать без изображений.
 for(const [id,index] of [['autumn',0],['winter',15],['spring',30],['summer',45],['sea',60],['fair',80],['forest',100],['night',120]]){
  await f.evaluate(i=>{__game.toMenu();__game.startLevel(i);document.querySelector('[data-go]').click();},index);
  await f.waitForFunction(id=>__game.view.sceneAnim?.kind==='generated'&&__game.view.scene===id,id);
  await page.screenshot({path:path.join(out,'scene-'+id+'.png')});
 }
 await f.evaluate(()=>{window.__FB_ART__={};__game.view.rebuild();});assert.notEqual(await f.evaluate(()=>__game.view.sceneAnim?.kind),'generated');
 await ctx.close();report.push({name:'ads-daily-scenes',passed:true});
 // Реальные touch-события Chrome: drag, tap-place, отмена захваченного касания при скрытии.
 const touchCtx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ru-RU'});
 const touchPage=await touchCtx.newPage();await touchPage.goto(base+'/parent?platform=mobile_android');const tf=await loaded(touchPage);
 await tf.evaluate(()=>__game.startClassic(false));
 const points=await tf.evaluate(()=>{const v=__game.view,L=v.L;return {from:v.slotCenter(1),to:{x:L.gx+4.5*L.cell,y:L.gy+5.55*L.cell}};});
 const cdp=await touchCtx.newCDPSession(touchPage);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:points.from.x,y:points.from.y}]});
 for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:points.from.x+(points.to.x-points.from.x)*i/8,y:points.from.y+(points.to.y-points.from.y)*i/8}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await tf.evaluate(()=>__game.st.game.lines),1);
 const p2=await tf.evaluate(()=>{const v=__game.view,L=v.L;return {from:v.slotCenter(0),to:{x:L.gx+3*L.cell,y:L.gy+7*L.cell}};});
 await touchPage.touchscreen.tap(p2.from.x,p2.from.y);await touchPage.touchscreen.tap(p2.to.x,p2.to.y);
 assert.equal(await tf.evaluate(()=>__game.st.game.lines),2);
 await touchPage.evaluate(()=>document.querySelector('iframe').contentWindow.postMessage({type:'VKWebAppViewHide',data:{}},'*'));
 await sleep(80);await stopped(tf);
 await touchPage.evaluate(()=>document.querySelector('iframe').contentWindow.postMessage({type:'VKWebAppViewRestore',data:{}},'*'));
 await sleep(80);assert.ok(await tf.evaluate(()=>__game.ui.modalOpen));
 await touchCtx.close();report.push({name:'touch-drag-tap-platform-pause',passed:true});
 // Недоступная реклама и ОК Web не предлагают ролик.
 for(const adCheck of ['false','error','timeout']){
  const page=await browser.newPage();await page.goto(base+'/parent?ads='+adCheck);const f=await loaded(page);
  await f.evaluate(()=>__game.ui.daily());assert.equal(await f.locator('[data-x2]').isVisible(),false);
  await f.locator('[data-take]').click();assert.equal(await f.evaluate(()=>__save.data.coins),200);
  await page.close();report.push({name:'ads-'+adCheck,passed:true});
 }
 // Автономный HTML — без запросов в сеть.
 const offline=await browser.newPage();let requests=[];offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await offline.goto(new URL('file:///'+path.resolve('dist-vk-single/index.html').replaceAll('\\','/')).href);
 await offline.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
 assert.deepEqual(requests,[]);assert.equal(await offline.evaluate(()=>__sdk.canReward()),false);await offline.close();
 assert.deepEqual(errors,[]);console.log('ALL PASS',report.length);
}finally{
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({date:'2026-11-15',report,errors},null,2));
 await browser.close();server.close();
}


