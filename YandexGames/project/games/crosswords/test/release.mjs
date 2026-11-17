import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';
const out='test-results/release';fs.mkdirSync(out,{recursive:true});
const root=path.resolve('.');
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/parent'){
    res.setHeader('Content-Type','text/html;charset=utf-8');return res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}iframe{width:100vw;height:100vh;border:0}</style><iframe></iframe><script>
    const q=new URLSearchParams(location.search);window.calls=[];window.storage={};window.reward=true;window.story='success';window.holdAd=false;window.pendingAd=null;
    addEventListener('message',e=>{const m=e.data;if(m?.type!=='vk-connect')return;const{handler,params}=m;calls.push({handler,params});let data={result:true},failed=false;
    if(handler==='SetSupportedHandlers')data={supportedHandlers:q.get('support')==='yes'?['VKWebAppShowStoryBox']:[]};
    if(handler==='VKWebAppStorageGet')data={keys:params.keys.map(key=>({key,value:storage[key]||''}))};
    if(handler==='VKWebAppStorageSet')storage[params.key]=params.value;
    if(handler==='VKWebAppCheckNativeAds')data={result:q.get('ads')==='yes'};
    if(handler==='VKWebAppShowNativeAds')data={result:reward};
    if(handler==='VKWebAppShowStoryBox'){if(story==='timeout')return;data={result:story==='success'};failed=story==='error';}
    const respond=()=>{if(e.source)e.source.postMessage({type:handler+(failed?'Failed':'Result'),data:{...data,request_id:params.request_id,...(failed?{error_type:'client_error'}:{})}},'*');};
    if(handler==='VKWebAppShowNativeAds'&&holdAd)pendingAd=respond;else setTimeout(respond,5);
    });
    document.querySelector('iframe').src='/dist-vk/index.html?vk_app_id=98765&vk_platform='+(q.get('platform')||'desktop_web')+'&vk_client='+(q.get('client')||'vk')+'&vk_language='+(q.get('lang')||'ru');</script>`);
  }
  const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',({'.html':'text/html;charset=utf-8','.js':'text/javascript','.jpg':'image/jpeg','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome'}),errors=[],report=[];
const ready=f=>f.waitForFunction(()=>window.__app&&!document.getElementById('boot'));
const solve=async f=>{
  await f.evaluate(()=>{const g=__app.game,p=g.pz;for(const e of p.entries){if(p.solved.has(e.id))continue;g.selectEntry(e.id,true);for(const i of e.cells)if(!p.locked(i)){g.sel=i;g.type(p.cells[i].ch);}}if(!p.complete())throw Error('Puzzle not complete');});
  await f.locator('.sheet.win').waitFor();
};
try{
  // Responsive layouts, themes, large text, both languages, first/last expert grids.
  for(const [name,width,height,locale] of [['desktop',1440,900,'ru-RU'],['phone',390,844,'ru-RU'],['small',320,568,'ru-RU'],['landscape',844,390,'ru-RU'],['english',1280,800,'en-US']]){
    const ctx=await browser.newContext({viewport:{width,height},locale,timezoneId:'Europe/Moscow',reducedMotion:'reduce'}),p=await ctx.newPage();p.on('pageerror',e=>errors.push(name+': '+e.message));
    await p.goto(base+'/dist-vk-single/index.html');await ready(p);
    assert.equal(await p.evaluate(()=>document.documentElement.lang),locale==='ru-RU'?'ru':'en');
    await p.screenshot({path:`${out}/${name}-menu.png`});
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await p.evaluate(()=>{__app.save.data.tutDone=true;__app.openLevel(999,'adult');});
    for(const theme of ['light','dark','contrast']){
      await p.evaluate(theme=>{__app.save.data.settings.theme=theme;__app.openSettings();document.querySelector('[data-v="'+theme+'"]').click();__app.closeModal();},theme);
      assert.equal(await p.locator('.kbd').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight+1),true,name+' keyboard clipped');
      assert.equal(await p.locator('.boardbox').evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1),true,name+' board container clipped');
      await p.screenshot({path:`${out}/${name}-${theme}-expert.png`});
    }
    await p.evaluate(()=>__app.openSettings());await p.locator('[data-k=text] [data-v="2"]').click();
    assert.equal(await p.locator('.sheet').evaluate(e=>e.scrollWidth>e.clientWidth+1),false,name+' large settings overflow');
    await p.screenshot({path:`${out}/${name}-settings-large.png`});
    await p.evaluate(()=>__app.closeModal());
    for(const tab of ['goals','archive','notebook']){await p.evaluate(tab=>__app.openJournal(tab),tab);assert.equal(await p.locator('.sheet').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);}
    await ctx.close();report.push({name,responsive:true});
  }
  // Persistence, modal input guard, notes, mistakes, win/replay, weekly goals, daily archive.
  const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'ru-RU',timezoneId:'Europe/Moscow',reducedMotion:'reduce'}),p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/dist-vk-single/index.html');await ready(p);await p.evaluate(()=>{__app.save.data.tutDone=true;__app.openLevel(0);});
  await p.locator('.g-pencil').click();await p.locator('.key[data-k="А"]').click();
  assert.equal(await p.evaluate(()=>Object.values(__app.game.pz.notes)[0]),'А');
  await p.evaluate(()=>__app.save.write());await p.reload();await ready(p);await p.locator('.m-play').click();
  assert.equal(await p.evaluate(()=>Object.values(__app.game.pz.notes)[0]),'А','notes survive reload');
  await p.locator('.g-set').click();
  const frozen=await p.evaluate(()=>JSON.stringify(__app.game.pz.serialize()));
  await p.keyboard.press('KeyF');await p.locator('.vol-in[data-k=music]').fill('20');await p.locator('.vol-in[data-k=sfx]').fill('40');
  assert.equal(await p.evaluate(()=>JSON.stringify(__app.game.pz.serialize())),frozen,'settings block physical input');
  assert.equal(await p.evaluate(()=>__app.sdk.gameplayOn),false,'sliders cannot resume game');
  await p.locator('.xbtn').click();assert.equal(await p.evaluate(()=>__app.sdk.gameplayOn),true);
  await p.evaluate(()=>{const g=__app.game;g.pz.setLetter(g.sel,g.pz.cells[g.sel].ch==='А'?'Б':'А');g.render();});
  await p.locator('.g-clear').click();assert.equal(await p.evaluate(()=>__app.game.pz.letters.filter(Boolean).length),0);
  await p.locator('.g-zoom').click();assert.equal(await p.locator('.boardbox.zoomed').count(),1);
  await solve(p);const first=await p.evaluate(()=>({coins:__app.save.data.coins,words:__app.save.data.solvedWords,weekly:{...__app.save.data.weekly}}));
  assert(first.words>0);assert.equal(await p.locator('.w-x2').count(),0,'no fake local rewarded ads');
  await p.screenshot({path:out+'/phone-win.png'});
  await p.evaluate(()=>{__app.closeModal(true);__app.openLevel(0);});await solve(p);
  assert.equal(await p.evaluate(()=>__app.save.data.solvedWords),first.words,'replay does not inflate word records');
  assert.equal(await p.evaluate(()=>__app.save.data.weekly.solved),1);
  for(let n=1;n<5;n++){await p.evaluate(n=>{__app.closeModal(true);__app.openLevel(n);},n);await solve(p);}
  await p.evaluate(()=>{__app.closeModal(true);__app.openJournal('goals');});
  const coins=await p.evaluate(()=>__app.save.data.coins);await p.locator('[data-goal=solved]').click();
  assert.equal(await p.evaluate(()=>__app.save.data.coins),coins+50);assert(await p.locator('[data-goal=solved]').isDisabled());
  await p.evaluate(()=>__app.openJournal('notebook'));assert(await p.locator('.word-row').count()>0);await p.locator('.word-star').first().click();await p.locator('.book-filter input').check();assert.equal(await p.locator('.word-row:visible').count(),1);
  await p.evaluate(()=>{__app.closeModal(true);__app.openDaily('2026-11-14');});await solve(p);
  const dailyCoins=await p.evaluate(()=>__app.save.data.coins);await p.evaluate(()=>{__app.closeModal(true);__app.openDaily('2026-11-13');});await solve(p);
  await p.evaluate(()=>{__app.closeModal(true);__app.openDaily('2026-11-14');});assert.equal(await p.evaluate(()=>__app.game.pz.complete()),true);
  assert.equal(await p.evaluate(()=>__app.save.data.coins),dailyCoins+60,'old date keeps completion/reward');
  await p.evaluate(()=>{__app.save.write();});await p.reload();await ready(p);await p.evaluate(()=>__app.openJournal('archive'));assert.equal(await p.locator('.calendar-day.done').count(),2);
  assert.equal(await p.locator('.share-record').count(),0);
  await ctx.close();report.push({gameplay:true,notes:true,rewards:true,archive:true});
  // Official bridge in an emulated parent client, including stories/ads/storage and OK.
  for(const [support,client,ads,platform]of [['yes','vk','yes','desktop_web'],['no','vk','no','mobile_web'],['yes','ok','no','mobile_iphone']]){
    const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+`/parent?support=${support}&client=${client}&ads=${ads}&platform=${platform}`);
    const f=page.frames().find(f=>f.url().includes('/dist-vk/'));assert(f);await ready(f);
    await f.evaluate(()=>{__app.save.data.tutDone=true;__app.openLevel(0);});await solve(f);await f.evaluate(()=>{__app.closeModal(true);__app.renderMenu();__app.show('menu');});
    await f.locator('.m-lb').click();assert.equal(await f.locator('.share-record').count(),support==='yes'&&client==='vk'?1:0);
    if(support==='yes'&&client==='vk'){
      await f.locator('.share-record').click();await f.waitForFunction(()=>!document.querySelector('.share-record').disabled);
      const options=await page.evaluate(()=>calls.find(c=>c.handler==='VKWebAppShowStoryBox').params);
      assert(options.blob.startsWith('data:image/png;base64,'));assert.equal(options.attachment.url,'https://vk.com/app98765');
      fs.writeFileSync(out+'/story.png',Buffer.from(options.blob.split(',')[1],'base64'));
      for(const mode of ['cancel','error']){await page.evaluate(mode=>window.story=mode,mode);await f.locator('.share-record').click();await f.waitForFunction(()=>!document.querySelector('.share-record').disabled);}
      await f.evaluate(()=>{__app.closeModal(true);document.querySelector('.m-store').click();});
      await page.evaluate(()=>{window.holdAd=true;});
      const before=await f.evaluate(()=>__app.save.data.coins);await f.locator('.s-ad').click();await page.waitForFunction(()=>pendingAd);
      assert(await f.locator('.s-ad').isDisabled());await f.evaluate(()=>document.querySelector('.s-ad').click());
      assert.equal(await page.evaluate(()=>calls.filter(c=>c.handler==='VKWebAppShowNativeAds').length),1);
      await page.evaluate(()=>{pendingAd();pendingAd();pendingAd=null;holdAd=false;});
      await f.waitForFunction(()=>!__app.sdk.adActive);assert.equal(await f.evaluate(()=>__app.save.data.coins),before+30);
      await page.evaluate(()=>window.reward=false);await f.locator('.s-ad').click();await f.waitForFunction(()=>!__app.sdk.adActive);assert.equal(await f.evaluate(()=>__app.save.data.coins),before+30,'cancelled ads do not reward');
      await f.evaluate(()=>__app.save.flush());const stored=await page.evaluate(()=>({...storage}));assert(Object.keys(stored).some(k=>k.endsWith('_n')));
      await f.evaluate(async()=>{__app.save.data.cloudProbe='Я'.repeat(205000);await __app.save.flush();localStorage.removeItem('crosswords_save_v1');});
      await f.goto(f.url());await ready(f);
      assert.equal(await f.evaluate(()=>__app.save.data.cloudProbe.length),205000,'large cloud save restores beyond 100 chunks');
      await f.evaluate(async()=>{delete __app.save.data.cloudProbe;await __app.save.flush();});
      // VK hide/restore cannot punch through an open settings modal.
      await f.evaluate(()=>{__app.closeModal(true);__app.openLevel(1);__app.openSettings();dispatchEvent(new MessageEvent('message',{data:{type:'VKWebAppViewHide',data:{}}}));dispatchEvent(new MessageEvent('message',{data:{type:'VKWebAppViewRestore',data:{}}}));});
      assert.equal(await f.evaluate(()=>__app.sdk.gameplayOn),false);
    }
    const methods=await page.evaluate(()=>calls.map(c=>c.handler));assert(!methods.some(m=>/WallPost|Favorites|GetAuthToken|CallAPIMethod/.test(m)));
    await page.close();report.push({support,client,ads,bridge:true});
  }
  // Legacy in-progress boards remain the exact same puzzle after the expansion.
  const old=JSON.parse(fs.readFileSync('src/data/legacy-ru.json')).levels[12];
  const legacy=await browser.newPage({locale:'ru-RU'});
  await legacy.addInitScript(({old})=>{localStorage.setItem('crosswords_save_v1',JSON.stringify({v:1,tutDone:true,p:{ru:{cur:12,stars:{0:3},ip:{lvl:12,l:'.'.repeat(old.w*old.h),r:[],h:1}}}}));},{old});
  await legacy.goto(base+'/dist-vk-single/index.html');await ready(legacy);await legacy.locator('.m-play').click();
  assert.deepEqual(await legacy.evaluate(()=>__app.game.pz.entries.map(e=>e.word).sort()),old.e.map(e=>e[3]).sort());await legacy.close();report.push({legacyMigration:true});
}finally{await browser.close();await new Promise(r=>server.close(r));}
assert.deepEqual(errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify({report,errors,platformResponses:'emulated'},null,2));console.log('PASS release:',report.length,'scenarios, zero page errors');
