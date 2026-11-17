import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const out=path.resolve('test-results/art');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try{
 for(const [name,width,height] of [['desktop',1440,900],['phone',390,844],['small',320,568]]){
  const ctx=await browser.newContext({viewport:{width,height},locale:'ru-RU',reducedMotion:'reduce'});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);
  await page.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
  assert.equal(await page.evaluate(()=>__game.view.sceneAnim.kind),'generated');
  await page.screenshot({path:path.join(out,name+'-menu.png')});
  const start=await page.evaluate(()=>document.querySelector('#c').toDataURL());
  await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>document.querySelector('#c').toDataURL()),start);
  const decoded=await page.evaluate(async()=>{
    const res=[];for(const [id,url]of Object.entries(__FB_ART__)){const img=new Image();img.src=url;await img.decode();res.push({id,width:img.naturalWidth,height:img.naturalHeight});}return res;
  });assert.equal(decoded.length,16);
  assert.equal(await page.evaluate(()=>Object.keys(window.__FB_ITEMS__).length),24);
  const transparent=await page.evaluate(async()=>{let n=0;for(const url of Object.values(__FB_ITEMS__)){const i=new Image();i.src=url;await i.decode();const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.drawImage(i,0,0,256,256);if(g.getImageData(0,0,1,1).data[3]===0)n++;}return n;});assert.equal(transparent,24);
  await page.evaluate(()=>__game.ui.settings());await page.locator('[data-motion]').uncheck();
  assert.equal(await page.evaluate(()=>__game.view.ambientOn),false);
  await page.reload();await page.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
  assert.equal(await page.evaluate(()=>__game.view.ambientOn),false);
  await page.locator('[data-a=travelPlay]').click();await page.locator('[data-go]').click();
  await page.waitForTimeout(300);await page.screenshot({path:path.join(out,name+'-game.png')});
  assert.deepEqual(errors,[]);await ctx.close();console.log('PASS',name);
 }
}finally{await browser.close();}
