import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runtime} from './runtime.mjs';
import {Tri,buildLevel,rng} from '../src/logic.js';
const R=await runtime(),out='test-results/release';fs.mkdirSync(out,{recursive:true});
const errors=[],report=[];
async function open(cfg={}){
 const ctx=await R.browser.newContext({viewport:{width:cfg.w||1280,height:cfg.h||800},locale:'ru-RU',isMobile:!!cfg.mobile,hasTouch:!!cfg.mobile});
 await ctx.addInitScript(()=>{window.__CS_DEBUG={};});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(R.base+'/parent?'+new URLSearchParams(cfg));
 const f=page.frames().find(f=>f.url().includes('dist-vk'));
 await f.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
 await f.evaluate(()=>window.dispatchEvent(new Event('focus')));await f.waitForTimeout(800);
 return {ctx,page,f};
}
async function frozen(f){
 const a=await f.evaluate(()=>JSON.stringify({cards:__game.table.g.cards,stock:__game.table.g.stock,time:__game.table.time}));
 await f.evaluate(()=>{const t=__game.table;t.onDown({clientX:t.stockPos.x,clientY:t.stockPos.y});t.draw();});
 await f.page().keyboard.press('Space');await f.waitForTimeout(150);
 assert.equal(await f.evaluate(()=>JSON.stringify({cards:__game.table.g.cards,stock:__game.table.g.stock,time:__game.table.time})),a);
 assert.equal(await f.evaluate(()=>__sdk.gameplayOn),false);
}
function winningActions(n){
 const def=buildLevel(n);
 for(let seed=1;seed<300;seed++){
  const g=new Tri(def),random=rng(seed),actions=[];
  for(let j=0;j<200&&!g.won();j++){
   const p=g.cards.map((_,i)=>i).filter(i=>g.playable(i));
   if(p.length){const i=p[Math.floor(random()*p.length)];g.play(i);actions.push(i);}
   else if(g.stock.length){g.draw();actions.push(-1);}else break;
  }
  if(g.won())return actions;
 }
 throw Error('No winning test sequence');
}
try{
 for(const cfg of [
  {name:'vk-desktop',w:1280,h:800},
  {name:'vk-phone',w:390,h:844,mobile:true,platform:'mobile_android'},
  {name:'ok-small',w:320,h:568,mobile:true,platform:'mobile_iphone',client:'ok'},
  {name:'ok-web',w:1280,h:720,client:'ok'},
  {name:'ok-android',w:390,h:844,mobile:true,platform:'mobile_android',client:'ok'},
  {name:'vk-landscape-en',w:844,h:390,mobile:true,platform:'mobile_web',lang:'en'},
 ]){
  const {ctx,page,f}=await open(cfg);
  await page.screenshot({path:`${out}/${cfg.name}-home.png`});
  await f.locator('[data-a=play]').click();await f.waitForFunction(()=>{document.querySelector('[data-a=ok]')?.click();return __game.table.busy===0&&!__game.ui.modalOpen;});await f.waitForTimeout(450);
  await page.screenshot({path:`${out}/${cfg.name}-game.png`});
  await f.locator('[data-a=pause]').click();await frozen(f);
  const slider=f.locator('[data-k=music]'),box=await slider.boundingBox();
  await page.mouse.move(box.x+box.width*.8,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.2,box.y+box.height/2,{steps:4});await page.mouse.up();
  await frozen(f);assert.ok(await f.evaluate(()=>__game.ui.modalOpen));
  await page.screenshot({path:`${out}/${cfg.name}-pause.png`});
  await f.locator('[data-a=resume]').click();assert.equal(await f.evaluate(()=>__game.paused),false);
  await f.evaluate(()=>window.dispatchEvent(new Event('blur')));await frozen(f);
  await f.evaluate(()=>window.dispatchEvent(new Event('focus')));assert.ok(await f.evaluate(()=>__game.ui.modalOpen));
  await f.locator('[data-a=resume]').click();
  await f.evaluate(()=>__game.toIsland(false));await f.locator('[data-a=cosmetics]').click();await f.waitForTimeout(350);
  await page.screenshot({path:`${out}/${cfg.name}-cosmetics.png`});
  const b=await f.locator('.panel').boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=cfg.w+1&&b.y+b.height<=cfg.h+1,'Panel fits viewport '+JSON.stringify(b));
  await f.locator('[data-x]').click();
  assert.equal(await page.evaluate(()=>log.some(x=>/WallPost|AddToFavorites|GetUserInfo/.test(x.handler))),false);
  await ctx.close();report.push({name:cfg.name,passed:true});console.log('PASS',cfg.name);
 }
 const {ctx,page,f}=await open();await f.waitForFunction(()=>__sdk.canReward()&&__sdk.canShareRecord());
 // Real level flow: card moves, victory reward and immediate affordable first construction.
 await f.locator('[data-a=play]').click();await f.waitForFunction(()=>__game.table.busy===0);
 await f.evaluate(actions=>{
  const g=__game;window.__CS_DEBUG.manual=true;
  for(const i of actions){if(i<0)g.table.draw();else g.table.play(i);for(let k=0;k<35;k++)g.table.update(.05);}
 },winningActions(1));
 await f.waitForSelector('.ribbon',{timeout:12000});
 assert.ok(await f.locator('[data-first-decor]').isVisible());
 assert.ok(await f.evaluate(()=>__save.data.levels[1]?.stars>=2));
 assert.ok(await f.evaluate(()=>__game.ui.affordable()>0));
 assert.equal(await page.evaluate(()=>log.some(x=>x.handler==='VKWebAppShowNativeAds')),false);
 await page.screenshot({path:`${out}/first-win.png`});
 await f.locator('[data-a=first-build]').click();
 assert.equal(await f.evaluate(()=>__save.data.stages.hut),0);
 assert.ok(await f.locator('#mod .panel h2').filter({hasText:'Хижина'}).isVisible());
 await f.locator('[data-a=go]').click();await f.waitForTimeout(800);
 assert.equal(await f.evaluate(()=>__save.data.stages.hut),1);
 assert.equal(await f.locator('[data-guide-notice]').getAttribute('data-kind'),'decor');
 await f.locator('[data-guide-open]').click();
 assert.match(await f.locator('.guide-step').innerText(),/зафиксировать/);
 await f.locator('[data-guide-next]').click();
 assert.match(await f.locator('.guide-step').innerText(),/повернуть предмет на 90°/);
 await f.locator('[data-guide-next]').click();
 assert.ok(await f.locator('[data-decor=grass]').isVisible());
 await f.locator('[data-x]').click();
 // Long ad: one request, mute, input blocked beyond the availability timeout.
 await f.evaluate(()=>{window.__CS_DEBUG.manual=false;__game.playLevel(2);});await f.waitForFunction(()=>__game.table.busy===0);
 await page.evaluate(()=>holdAds=true);const before=await f.evaluate(()=>__save.data.coins);
 await f.evaluate(()=>{__sdk.showRewarded(()=>__game.addCoins(100));__sdk.showRewarded(()=>__game.addCoins(100));});
 await page.waitForFunction(()=>heldAd);await frozen(f);await f.waitForTimeout(5200);await frozen(f);
 assert.equal(await f.evaluate(()=>__audio.ctx?.state==='running'),false);
 assert.equal(await page.evaluate(()=>log.filter(x=>x.handler==='VKWebAppShowNativeAds').length),1);
 await page.evaluate(()=>releaseAd());await f.waitForFunction(()=>!__sdk.adActive);
 assert.equal(await f.evaluate(()=>__save.data.coins),before+100);
 await page.evaluate(()=>{holdAds=false;adResult=false;});
 await f.evaluate(()=>__sdk.showRewarded(()=>__game.addCoins(100)));await f.waitForTimeout(100);
 assert.equal(await f.evaluate(()=>__save.data.coins),before+100);
 await page.evaluate(()=>adResult='error');await f.evaluate(()=>__sdk.showRewarded(()=>__game.addCoins(100)));await f.waitForTimeout(100);
 assert.equal(await f.evaluate(()=>__save.data.coins),before+100);
 // Cosmetic purchases deduct once and survive reload/cloud restore.
 await f.evaluate(()=>{__game.toIsland(false);__game.addCoins(1000);__game.ui.cosmetics();});
 const coins=await f.evaluate(()=>__save.data.coins);
 await f.locator('[data-style=sunset]').click();assert.equal(await f.evaluate(()=>__save.data.coins),coins-250);
 await f.locator('[data-style=sunset]').click();assert.equal(await f.evaluate(()=>__save.data.coins),coins-250);
 await f.locator('[data-style=royal]').click();
 await f.evaluate(()=>__save.flush());const saved=await f.evaluate(()=>__save.data.coins);
 await page.evaluate(()=>failKey='castaway_solitaire_v1_n');
 await f.evaluate(()=>{__save.data.coins+=10;return __save.flush();});
 assert.equal(await f.evaluate(async()=>(await __sdk.loadData()).coins),saved);
 await page.evaluate(()=>failKey='');await f.evaluate(()=>__save.flush());
 assert.equal(await f.evaluate(async()=>(await __sdk.loadData()).coins),saved+10);
 // Stories only from explicit click, with local PNG and actual application link.
 await f.locator('[data-x]').click();await f.locator('[data-a=lb]').click();await f.locator('[data-story]').click();
 await page.waitForFunction(()=>log.some(x=>x.handler==='VKWebAppShowStoryBox'));
 const story=await page.evaluate(()=>log.find(x=>x.handler==='VKWebAppShowStoryBox').params);
 assert.ok(story.blob.startsWith('data:image/png;base64,'));assert.equal(story.attachment.url,'https://vk.com/app123');
 fs.writeFileSync(`${out}/story.png`,Buffer.from(story.blob.split(',')[1],'base64'));
 await page.evaluate(()=>storyResult=false);await f.locator('[data-story]').click();await f.waitForTimeout(100);assert.equal(await f.locator('[data-story]').isEnabled(),true);
 await f.evaluate(()=>{localStorage.clear();});await page.reload();
 const f2=page.frames().find(f=>f.url().includes('dist-vk'));await f2.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
 assert.equal(await f2.evaluate(()=>__save.data.cosmetics.theme),'sunset');assert.equal(await f2.evaluate(()=>__save.data.cosmetics.back),'royal');
 // Resident simulation after every building is complete: no water/building penetration or jumps.
 const movement=await f2.evaluate(()=>{
  const I=__game.island;I.setStages(Object.fromEntries(Object.keys(I.spots).map(k=>[k,3])));
  const stats=I.walkers.map(w=>({id:w.id,distance:0,invalid:0,maxStep:0,unexpectedSteps:0}));
  for(let k=0;k<4800;k++){
   const old=I.walkers.map(w=>({x:w.x,z:w.z}));I.update(.05);
   I.walkers.forEach((w,i)=>{
    const d=Math.hypot(w.x-old[i].x,w.z-old[i].z),stat=stats[i];
    stat.distance+=d;stat.maxStep=Math.max(stat.maxStep,d);
    if(d>w.speed*.05+.003)stat.unexpectedSteps++;
    if(!I.walkable(w.x,w.z)||!Number.isFinite(w.m.position.y))stat.invalid++;
   });
  }return stats;
 });
 assert.ok(movement.every(x=>x.distance>5&&x.invalid===0&&x.unexpectedSteps===0),JSON.stringify(movement));
 fs.writeFileSync(`${out}/residents.json`,JSON.stringify(movement,null,2));await ctx.close();
 report.push({name:'first-win-build-ads-cosmetics-cloud-stories-residents',passed:true});
 for(const ads of ['false','error','timeout']){
  const c=await open({ads});if(ads==='timeout')await c.f.waitForTimeout(5200);
  await c.f.locator('[data-a=shop]').click();assert.equal(await c.f.locator('[data-a=adcoins]').count(),0);
  const money=await c.f.evaluate(()=>__save.data.coins);await c.f.evaluate(()=>__sdk.showRewarded(()=>__game.addCoins(100)));await c.f.waitForTimeout(50);
  assert.equal(await c.f.evaluate(()=>__save.data.coins),money);await c.ctx.close();report.push({name:'ads-'+ads,passed:true});
 }
 for(const cfg of [{client:'ok'},{stories:'false'}]){
  const c=await open(cfg);await c.f.evaluate(()=>{__save.data.levels[1]={stars:3,best:100};__game.ui.leaderboard();});
  assert.equal(await c.f.locator('[data-story]').count(),0);await c.ctx.close();
 }
 // Standalone VK build never invents ad rewards and contains all images/fonts.
 const local=await R.browser.newPage();await local.addInitScript(()=>{window.__CS_DEBUG={};});await local.goto(R.base+'/dist-vk-single/index.html');await local.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
 assert.equal(await local.evaluate(()=>__sdk.canReward()),false);await local.close();
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/report.json`,JSON.stringify({report,errors},null,2));console.log('PASS release scenarios',report.length);
}finally{await R.close();}
