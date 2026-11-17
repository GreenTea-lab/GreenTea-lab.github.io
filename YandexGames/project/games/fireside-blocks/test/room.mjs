import{chromium}from'playwright';import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';import assert from'node:assert/strict';
import{ROOM_SCENES,roomSceneForDecor}from'../src/room-scenes.js';
const partial=process.argv.includes('--partial'),out='test-results/room-scenes';fs.mkdirSync(out,{recursive:true});
assert.equal(ROOM_SCENES.length,24);for(const s of ROOM_SCENES)assert.equal(roomSceneForDecor(s.objects).key,s.key);
assert(!fs.readFileSync('src/table.js','utf8').includes('paintRoomDecor'),'No sprite compositing in home room');
const browser=await chromium.launch({channel:'chrome'}),report=[];
try{for(const[name,width,height]of[['desktop',1440,900],['desktop-short',1280,720],['phone',390,844],['small',320,568],['landscape',844,390],['tablet',768,1024]]){
 const ctx=await browser.newContext({viewport:{width,height},locale:'ru-RU',reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);await page.waitForFunction(()=>__game?.ui&&!document.querySelector('#loader'));
 const count=await page.evaluate(()=>Object.keys(__FB_ROOMS__).length);if(!partial)assert.equal(count,48);
 const stages=partial?ROOM_SCENES.filter(s=>[0,112].includes(s.stars)):ROOM_SCENES;
 for(const stage of stages){
  await page.evaluate(stars=>{__save.data.levels={};for(let n=stars;n>0;n-=3)__save.data.levels[Object.keys(__save.data.levels).length]={stars:Math.min(3,n)};__game.toMenu();},stage.stars);
  await page.waitForFunction(key=>__game.view.roomState?.stage===key&&__game.view.roomState.ready,stage.key);
  const state=await page.evaluate(()=>__game.view.roomState);assert.equal(state.orientation,height>width*1.15?'phone':'wide');assert.deepEqual(state.objects,stage.objects);
  assert.equal(await page.evaluate(()=>__gfx.roomImageCacheSize()<=3),true,'Bounded decoded image cache');
  const buttons=await page.locator('.menu button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
  assert(buttons.every(b=>b.x>=0&&b.y>=0&&b.x+b.w<=width&&b.y+b.h<=height),name+' menu buttons stay visible');
  if([0,8,14,112,550,1420,3000].includes(stage.stars))await page.screenshot({path:`${out}/${name}-${stage.stars}.png`});
  report.push({name,stars:stage.stars,key:state.key,ready:state.ready});
 }
 await page.evaluate(()=>__game.ui.styles());assert.equal(await page.locator('[data-tab=cozy]').count(),0);
 await page.evaluate(()=>{__game.startLevel(3);__game.ui.levelResult({L:__game.st.game.level,stars:3,moves:3,coins:30,newDecor:['yarn'],last:false});});await page.locator('[data-decor]').click();assert.equal(await page.evaluate(()=>__game.state),'menu');
 await page.evaluate(()=>__save.write());await page.reload();await page.waitForFunction(()=>__game?.ui&&!document.querySelector('#loader'));
 await page.waitForFunction(()=>__game.view.roomState?.ready);assert.equal(await page.evaluate(()=>__game.view.roomState.stars),stages[stages.length-1].stars);
 if(!partial){
  await page.evaluate(()=>{__FB_ROOMS__={};__game.view.rebuild();});assert.equal(await page.evaluate(()=>__game.view.roomState.ready),false,'Missing room art falls back without crash');
 }
 assert.deepEqual(errors,[]);await ctx.close();console.log('PASS full room scenes',name);
}fs.writeFileSync(out+'/report.json',JSON.stringify({partial,report},null,2));}
finally{await browser.close();}
