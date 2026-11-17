// Проверяет двадцать настоящих изображений, автономность HTML, смену городов и открытки.
import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const manifest=JSON.parse(fs.readFileSync('static/cities/manifest.json','utf8'));
assert.equal(manifest.length,20);
assert.equal(new Set(manifest.map(x=>x.sha256)).size,20);
assert.ok(manifest.every(x=>x.width>=1024&&x.height>=1024));
const dir=path.resolve('test-results/art');fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({...process.platform==='win32'?{channel:'chrome'}:{}});
const report=[],errors=[];
try{
  for(const [w,h]of[[390,844],[1280,720]]){
    const ctx=await browser.newContext({viewport:{width:w,height:h},locale:'ru-RU',isMobile:w<500,hasTouch:w<500});
    const page=await ctx.newPage(),requests=[];page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve('dist-single/index.html')).href);await page.waitForFunction(()=>window.__PM_BOOT_DONE);
    assert.equal(await page.evaluate(()=>Object.keys(__CITY_ART__).length),20);
    assert.ok(!requests.some(url=>/^https?:/.test(url)));
    const loaded=await page.evaluate(async()=>{
      const result=[];
      for(const C of __lib.levels.CITIES){await __lib.cityArt.loadCityArt(C.id);const r=__lib.cityArt.cityArtStatus(C.id);result.push({id:C.id,ok:!!r.thumb&&!r.error});}
      return result;
    });assert.ok(loaded.every(x=>x.ok));
    assert.ok(await page.evaluate(()=>__lib.levels.CITIES.filter(C=>__lib.cityArt.cityArtStatus(C.id)?.image).length<=3));
    if(w===1280){
      const sheet=await page.evaluate(()=>{
        const c=document.createElement('canvas');c.width=1600;c.height=1280;const g=c.getContext('2d');
        __lib.levels.CITIES.forEach((C,i)=>{const x=i%5*320,y=Math.floor(i/5)*320;const tile=document.createElement('canvas');tile.width=tile.height=320;__lib.drawCity(tile.getContext('2d'),C.id,320,320);g.drawImage(tile,x,y);g.fillStyle='rgba(255,248,230,.9)';g.fillRect(x+8,y+8,140,24);g.font='bold 16px Arial';g.fillStyle='#3d453e';g.fillText(C.id,x+15,y+26);});return c.toDataURL('image/png');
      });fs.writeFileSync(path.join(dir,'twenty-generated-cities.png'),Buffer.from(sheet.split(',')[1],'base64'));
    }
    for(const city of [0,2,8,17,19]){
      await page.evaluate(async c=>{await __lib.cityArt.loadCityArt(__lib.levels.CITIES[c].id);__game.ui.closeModal();__game.toMenu();__game.startLevel(c*50,false);__game.ui.closeModal();},city);
      await page.waitForTimeout(500);
      assert.equal(await page.evaluate(()=>__game.view.city),city);
      await page.screenshot({path:path.join(dir,`${w}-city-${city}.png`)});
    }
    await page.evaluate(()=>__game.ui.postcard(8,null,true));await page.locator('.pcm').waitFor();
    await page.waitForTimeout(500);await page.screenshot({path:path.join(dir,`${w}-postcard.png`)});
    assert.ok(await page.locator('.pcimg').evaluate(img=>img.naturalWidth>0));
    report.push({viewport:[w,h],images:loaded,networkRequests:requests.filter(u=>/^https?:/.test(u)),passed:true});await ctx.close();
  }
  const vk=await browser.newPage({locale:'ru-RU'});vk.on('pageerror',e=>errors.push(e.message));
  await vk.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);await vk.waitForFunction(()=>window.__PM_BOOT_DONE);
  await vk.evaluate(()=>__game.ui.postcard(0,null,true));await vk.locator('.pcm').waitFor();assert.ok(await vk.locator('.pcimg').evaluate(i=>i.naturalWidth>0));await vk.close();
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify({date:new Date().toISOString(),report,errors,localVkPreview:true},null,2));console.log('PASS: 20 distinct backgrounds, portrait/landscape, postcards, offline HTML and three-image memory limit.');
}finally{await browser.close();}
