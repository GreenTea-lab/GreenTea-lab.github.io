import {chromium} from 'playwright';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
// Visual review of menu, field, map, pause and collection on supported small/large screens.
const dir='test-results/interface';fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),errors=[],report=[];
async function shot(page,name){await page.waitForTimeout(450);await page.screenshot({path:`${dir}/${name}.png`});}
try{
 for(const [w,h,locale='ru-RU'] of [[1280,800],[390,844],[320,568],[844,390],[320,568,'en-US'],[844,390,'en-US']]){
  const page=await browser.newPage({viewport:{width:w,height:h},locale});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve('dist-single/index.html')).href);
  await page.waitForFunction(()=>window.__PM_BOOT_DONE);
  assert.ok(await page.locator('.brand-emblem').evaluate(i=>i.complete&&i.naturalWidth===512));
  const boxes=await page.locator('.menu button').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return {name:b.dataset.a,x:r.x,y:r.y,w:r.width,h:r.height};}));
  const shell=await page.locator('.menu-layout').boundingBox();
  assert.ok(Math.abs(shell.x+shell.width/2-w/2)<1&&Math.abs(shell.y+shell.height/2-h/2)<1,'Menu must be centered');
  for(const b of boxes){assert.ok(b.x>=shell.x&&b.x+b.w<=shell.x+shell.width+1&&b.y>=shell.y&&b.y+b.h<=shell.y+shell.height+1,`${w} menu ${b.name} outside panel`);assert.ok(b.x>=0&&b.x+b.w<=w+1&&b.y>=0&&b.y+b.h<=h+1,`${w} menu ${b.name} outside viewport`);}
  assert.equal(await page.locator('.menu-layout .brand,.menu-layout .topbar').count(),2);
  assert.equal(await page.locator('.destination').count(),0);
  if(locale==='en-US'){await shot(page,`${w}-menu-en`);report.push({viewport:[w,h],locale,centered:true,allControlsInsidePanel:true});await page.close();continue;}
  await shot(page,`${w}-menu`);
  await page.locator('[data-a="journey"]').click();await shot(page,`${w}-map`);
  await page.locator('.lvl.cur').click();await page.locator('[data-go]').click();await shot(page,`${w}-play`);
  await page.locator('[data-a=pause]').click();await shot(page,`${w}-pause`);
  await page.evaluate(()=>{__game.ui.closeModal();__game.toMenu();__game.ui.styles()});await shot(page,`${w}-styles`);
  await page.evaluate(()=>{__game.ui.closeModal();__game.ui.album()});await shot(page,`${w}-album`);
  report.push({viewport:[w,h],locale,centered:true,allControlsInsidePanel:true,menuButtonsInsideViewport:true,emblemLoaded:true});await page.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(`${dir}/report.json`,JSON.stringify({report,errors},null,2));console.log('PASS: centered panel and all controls inside; six screens at four sizes, plus English menus.');
}finally{await browser.close()}
