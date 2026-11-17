// Reuse actual in-game renders for the first-paint loader; no additional generated artwork.
import {chromium} from 'playwright';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage();
try{
 await page.goto(pathToFileURL(path.resolve('dist-single/index.html')).href);await page.waitForFunction(()=>window.__PM_BOOT_DONE);
 const tiles=await page.evaluate(async()=>{
  const T=__lib.tiles,result={};for(const [id,style,face]of [['loader-apple','ivory','apple'],['loader-bamboo','jade',null],['loader-flower','porcelain','cornflower']]){const source=face?T.tileURL(style,face,176,'fruit'):T.backURL(style,176);const img=new Image();img.src=source;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);result[id]=c.toDataURL('image/webp',.94);}return result;
 });for(const [id,data]of Object.entries(tiles))fs.writeFileSync(`static/ui/${id}.webp`,Buffer.from(data.split(',')[1],'base64'));
 const city=await page.evaluate(async data=>{const img=new Image();img.src=data;await img.decode();const c=document.createElement('canvas');c.width=c.height=1000;c.getContext('2d').drawImage(img,0,0,1000,1000);return c.toDataURL('image/webp',.82);},'data:image/webp;base64,'+fs.readFileSync('static/cities/moscow.webp').toString('base64'));
 fs.writeFileSync('static/ui/loader-city.webp',Buffer.from(city.split(',')[1],'base64'));console.log('Prepared loader city and three authentic tile renders.');
}finally{await browser.close()}
