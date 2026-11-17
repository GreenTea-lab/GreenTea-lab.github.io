// Regression: endless must start before any campaign/daily board has assigned App.L.
import {chromium} from 'playwright';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const out='test-results/endless';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),errors=[],report=[];
const ready=p=>p.waitForFunction(()=>window.__PM_BOOT_DONE);
try{
  for(const [width,height,locale='ru-RU',dir='dist-single'] of [
    [1280,800],[390,844],[320,568],[844,390],[320,568,'en-US'],[390,844,'ru-RU','dist-vk-single']
  ]){
    const page=await browser.newPage({viewport:{width,height},locale});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(dir,'index.html')).href);await ready(page);
    assert.equal(await page.evaluate(()=>__game.L),undefined);
    assert.equal(await page.locator('[data-a=newEndless]').count(),0);
    await page.locator('[data-a=endless]').click();
    assert.equal(await page.evaluate(()=>__game.mode),'endless');
    assert.equal(await page.locator('.hud').count(),1);
    await page.evaluate(()=>{__game.pair(...__game.game.hint().pair);__game.toMenu();});
    const saved=await page.evaluate(()=>JSON.parse(JSON.stringify(__save.data.endless)));
    assert.ok(saved.score>0);assert.ok(saved.game);
    await page.reload();await ready(page);
    assert.equal(await page.evaluate(()=>__game.L),undefined);
    const button=page.locator('[data-a=newEndless]');
    assert.equal(await button.innerText(),locale==='en-US'?'New game · endless mode':'Новая партия · бесконечный режим');
    await button.scrollIntoViewIfNeeded();
    const r=await button.boundingBox();
    assert.ok(r.x>=0&&r.x+r.width<=width+1&&r.y>=0&&r.y+r.height<=height+1);
    assert.ok(await button.evaluate(e=>e.scrollWidth<=e.clientWidth));
    await page.screenshot({path:`${out}/${dir}-${width}-${locale}.png`,animations:'disabled'});
    await page.locator('[data-a=endless]').click();
    assert.deepEqual(await page.evaluate(()=>JSON.parse(JSON.stringify(__game.game.toJSON()))),saved.game);
    assert.equal(await page.evaluate(()=>__game.E.score),saved.score);
    await page.evaluate(()=>__game.toMenu());
    await page.locator('[data-a=newEndless]').click();
    assert.equal(await page.evaluate(()=>__game.mode),'endless');
    assert.equal(await page.evaluate(()=>__game.E.n),1);
    assert.equal(await page.evaluate(()=>__game.E.score),0);
    assert.ok(await page.evaluate(()=>__game.game.left>0));
    report.push({width,height,locale,dir,coldStart:true,exactResume:true,newRun:true,labelFits:true});
    await page.close();
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({date:new Date().toISOString(),report,errors},null,2));
  console.log('PASS: endless cold start, exact save/resume and new run; explicit RU/EN label fits six configurations.');
}finally{await browser.close();}
