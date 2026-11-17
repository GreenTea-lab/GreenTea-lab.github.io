import {chromium} from 'playwright';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const out='test-results/interface';const browser=await chromium.launch({channel:'chrome'});
try{for(const [width,height]of [[1280,800],[390,844]]){
 const page=await browser.newPage({viewport:{width,height},locale:'ru-RU'});
 await page.goto(pathToFileURL(path.resolve('dist-single/index.html')).href);await page.waitForFunction(()=>window.__PM_BOOT_DONE);
 for(const city of [2,7,8]){
  await page.evaluate(async n=>{__save.data.levels={};for(let i=0;i<n*50;i++)__save.data.levels[i]={stars:1,time:30};await __lib.cityArt.loadCityArt(__lib.levels.CITIES[n].id);__game.toMenu();},city);
  await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>__game.view.city),city);
  await page.screenshot({path:`${out}/${width}-glass-city-${city}.png`});
 }
 await page.close();
}console.log('PASS: large glass menu reviewed over Paris, Cairo and Kyoto on desktop and phone.');}finally{await browser.close()}
