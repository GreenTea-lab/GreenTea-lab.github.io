import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

const out='test-results/layout';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),errors=[],report=[];
try{
  for(const [width,height] of [[1440,900],[1024,900],[900,1200],[1280,720],[844,390],[390,844],[320,568]]){
    const context=await browser.newContext({viewport:{width,height},locale:'ru-RU',reducedMotion:'reduce'});
    const page=await context.newPage();
    // Hold the actual hosted entry at its first paint, before the game bundle runs.
    await page.route('**/game.js',route=>route.abort());
    await page.goto(pathToFileURL(path.resolve('dist-vk/index.html')).href);
    await page.evaluate(()=>document.fonts.ready);
    const card=await page.locator('.boot-card').boundingBox();
    assert(card.x>=0&&card.y>=0&&card.x+card.width<=width&&card.y+card.height<=height,'loader fits');
    await page.screenshot({path:`${out}/boot-${width}.png`});
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);
    await page.waitForFunction(()=>window.__app&&!document.querySelector('#boot'));
    await page.evaluate(()=>{__app.save.data.tutDone=true;__app.openLevel(999,'adult');});
    await page.waitForFunction(()=>__app.scene.loaded);
    const wide=width>=860&&width/height>1.15;
    assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('wide')),wide);
    const metrics=await page.evaluate(()=>{
      const rect=selector=>document.querySelector(selector).getBoundingClientRect().toJSON();
      return {board:rect('.boardbox'),list:rect('.cluelists'),keyboard:rect('.kbd'),host:document.querySelector('.kbd').parentElement.className};
    });
    assert(metrics.keyboard.bottom<=height+1,'keyboard fits');
    if(wide){
      assert.equal(metrics.host,'gright');
      assert(metrics.list.height>0&&metrics.list.x>=metrics.board.right,'questions stay on right');
      assert(Math.abs(metrics.keyboard.x-metrics.list.x)<=1,'keyboard stays in original right column');
      assert(metrics.keyboard.top>=metrics.list.bottom,'questions end above the keyboard');
      assert(metrics.board.bottom>=metrics.keyboard.bottom-1,'grid uses the full left column');
      assert.equal(Math.round(metrics.list.width),Math.round(Math.max(432,Math.min(width*.36,558))),'original panel width');
      const question=page.locator('.cluelists li').first();
      const id=Number(await question.getAttribute('data-id'));
      await question.click();
      assert.equal(await page.evaluate(()=>__app.game.cur().id),id,'question selects its word');
    }else{
      assert.equal(metrics.host,'gright');
      await page.locator('.t-list').click();assert(await page.locator('.sheet').isVisible());
      await page.evaluate(()=>__app.closeModal(true));
    }
    await page.screenshot({path:`${out}/game-${width}.png`});
    // Repeated desktop/phone transitions keep one keyboard, with working input.
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>document.querySelector('.kbd').parentElement.className==='gright');
    await page.setViewportSize({width:1440,height:900});
    await page.waitForFunction(()=>document.body.classList.contains('wide'));
    assert.equal(await page.locator('.kbd').evaluate(e=>e.parentElement.className),'gright');
    assert.equal(await page.locator('.kbd').count(),1);
    await page.evaluate(()=>{const g=__app.game,e=g.pz.entries.find(e=>e.cells.some(i=>!g.pz.locked(i)));g.selectEntry(e.id,true);});
    const selected=await page.evaluate(()=>__app.game.sel);
    await page.locator('.key[data-k="А"]').dispatchEvent('pointerdown');
    assert.equal(await page.evaluate(i=>__app.game.pz.letters[i],selected),'А');
    report.push({width,height,wide,questionHeight:metrics.list.height,passed:true});
    await context.close();
  }
}finally{await browser.close();}
assert.deepEqual(errors,[]);
fs.writeFileSync(out+'/report.json',JSON.stringify({report,errors},null,2));
console.log('PASS original right-column proportions, full-height grid, loader, resizing and input across 7 viewport sizes');
