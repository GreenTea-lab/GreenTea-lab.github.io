// Runs only through shot.mjs's remote-only browser gate.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { run, done } from './shot.mjs';
fs.mkdirSync('test/out/release', { recursive: true });
process.env.MOCK_SDK = '1';
const errors = [], results = [];
for (const [name,w,h,mobile] of [['small',360,640,true],['phone',390,844,true],['landscape',844,390,true],['desktop',1440,900,false]]) {
  errors.push(...await run({ w,h,mobile,steps:async page => {
    const badRequests = [];
    page.on('response', r => { if (r.status() >= 400 && r.url().includes('/art/')) badRequests.push(r.url()); });
    await page.waitForFunction(() => [...document.querySelectorAll('.ambient-layer')].some(x=>x.classList.contains('visible')));
    await page.screenshot({path:`test/out/release/${name}-menu.png`});
    await page.locator('.m-garden').click();
    await page.waitForTimeout(450);
    assert.equal(await page.locator('.gi').count(),12);
    await page.locator('.g-preview').click();
    assert.equal(await page.locator('.garden-art').getAttribute('data-preview'),'true');
    assert.equal(await page.evaluate(()=>window.__app.gardenCount()),0);
    // Dream previews must not grant decorations or mutate progression.
    for(let s=0;s<4;s++) {
      await page.locator(`[data-s="${s}"]`).click();
      await page.locator('.g-preview').click();
      await page.waitForTimeout(700);
      await page.screenshot({path:`test/out/release/${name}-garden-${s}.png`});
      const sceneOK=await page.evaluate(async()=>{
        const url=getComputedStyle(document.querySelector('.garden-landscape')).backgroundImage.slice(5,-2);
        const img=new Image();img.src=url;await img.decode();return img.naturalWidth>1000;
      });
      assert(sceneOK,'Garden background must decode');
    }
    await page.locator('.g-walk').click();
    assert(await page.locator('body').evaluate(b=>b.classList.contains('garden-walk')));
    await page.locator('.garden-walk-exit').click();
    assert(!(await page.locator('body').evaluate(b=>b.classList.contains('garden-walk'))));
    const coins=await page.evaluate(()=>window.__app.save.data.coins);
    await page.evaluate(()=>{window.__app.save.data.coins=10000;window.__app.renderGarden();});
    await page.locator('.g-buy').click();
    assert.equal(await page.evaluate(()=>window.__app.gardenCount()),1);
    // Put away an earned decoration and persist its ownership.
    await page.locator('[data-s="0"]').click();
    await page.locator('[data-item="0"]').click();
    await page.locator('.g-place').click();
    assert(await page.evaluate(()=>window.__app.save.data.garden.hidden.includes(0)));
    await page.locator('[data-item="0"]').click();
    await page.locator('.g-place').click();
    assert(!(await page.evaluate(()=>window.__app.save.data.garden.hidden.includes(0))));
    await page.evaluate(()=>{const A=window.__app;A.save.data.tutDone=true;A.openGame('p:120');});
    const target=await page.evaluate(()=>{const b=window.__app.board;const i=b.vals.findIndex(v=>!v);b.select(i);return [i,b.sol[i]];});
    await page.evaluate(()=>window.__mockPause());
    const before=await page.evaluate(()=>window.__app.board.time);
    await page.waitForTimeout(700);
    await page.keyboard.press(String(target[1]));
    assert.equal(await page.evaluate(()=>window.__app.board.time),before,'Platform pause stops timer');
    assert.equal(await page.evaluate(i=>window.__app.board.vals[i],target[0]),0,'Platform pause blocks input');
    await page.evaluate(()=>window.__mockResume());
    await page.keyboard.press(String(target[1]));
    assert.equal(await page.evaluate(i=>window.__app.board.vals[i],target[0]),target[1]);
    await page.reload();
    await page.waitForFunction(()=>window.__app&&!document.getElementById('boot'));
    await page.locator('.m-play').click();
    assert.equal(await page.evaluate(i=>window.__app.board.vals[i],target[0]),target[1],'Immediate reload retains last move');
    await page.waitForTimeout(450);
    const layouts=await page.evaluate(()=>{
      const b=document.querySelector('.board').getBoundingClientRect();
      const nums=[...document.querySelectorAll('.num')].map(n=>n.getBoundingClientRect());
      const rect=r=>({x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right});
      return {ok:b.width>100&&b.left>=-1&&b.right<=innerWidth+1&&nums.every(r=>r.left>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1),board:rect(b),nums:nums.map(rect)};
    });
    await page.screenshot({path:`test/out/release/${name}-game.png`});
    fs.writeFileSync(`test/out/release/${name}-layout.json`,JSON.stringify(layouts,null,2));
    assert(layouts.ok,`Board/keypad fit ${name}: ${JSON.stringify(layouts)}`);
    await page.evaluate(()=>{const A=window.__app;A.openStore('skins');});
    assert.equal(await page.locator('.skin').count(),14);
    await page.screenshot({path:`test/out/release/${name}-skins.png`});
    await page.evaluate(()=>{const A=window.__app;A.closeModal(true);A.save.data.settings.reducedMotion=true;A.applySettings();});
    assert.equal(await page.locator('html').getAttribute('data-motion'),'reduced');
    assert.equal(badRequests.length,0);
    results.push({name,w,h,passed:true});
  }}));
}
fs.writeFileSync('test/out/release/results.json',JSON.stringify({results,errors},null,2));
console.log(JSON.stringify(results));
done(errors);
