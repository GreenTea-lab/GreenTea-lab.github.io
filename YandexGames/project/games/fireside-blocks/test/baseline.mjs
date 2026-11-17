import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const out=path.resolve('test-results/baseline'); fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try {
 for(const [name,w,h,mobile] of [['desktop',1440,900,false],['phone',390,844,true]]){
  const ctx=await browser.newContext({viewport:{width:w,height:h},isMobile:mobile,hasTouch:mobile,locale:'ru-RU'});
  const page=await ctx.newPage();
  await page.goto(pathToFileURL(path.resolve('releases/yandex/index.html')).href);
  await page.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
  await page.screenshot({path:path.join(out,name+'-menu.png')});
  await page.evaluate(()=>__game.startClassic(false));
  await page.screenshot({path:path.join(out,name+'-classic.png')});
  await page.evaluate(()=>{__game.toMenu();__game.startLevel(0);document.querySelector('[data-go]').click();});
  await page.screenshot({path:path.join(out,name+'-autumn.png')});
  await page.evaluate(()=>__game.ui.pause());
  await page.screenshot({path:path.join(out,name+'-pause.png')});
  await ctx.close();
 }
}finally{await browser.close();}
console.log(out);
