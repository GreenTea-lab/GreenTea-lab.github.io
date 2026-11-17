import {chromium}from'playwright';import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';
const browser=await chromium.launch({channel:'chrome'}),out='test-results/v2';fs.mkdirSync(out,{recursive:true});
try{for(const[name,width,height]of[['desktop',1440,900],['phone',390,844],['small',320,568]]){
 const ctx=await browser.newContext({viewport:{width,height},locale:'ru-RU',reducedMotion:'reduce'}),page=await ctx.newPage();await page.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);await page.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
 await page.screenshot({path:out+'/'+name+'-menu.png'});
 for(const tab of['blocks','boards','effects','album']){await page.evaluate(tab=>__game.ui.styles(tab),tab);await page.screenshot({path:out+'/'+name+'-'+tab+'.png'});}
 await page.evaluate(()=>{__game.toMenu();__game.ui.challenge();});await page.screenshot({path:out+'/'+name+'-daily-hub.png'});
 if(name==='desktop'){
  const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1200;c.height=1300;const g=c.getContext('2d');g.fillStyle='#fff3d9';g.fillRect(0,0,c.width,c.height);const ids=Object.keys(__gfx.STYLES);ids.forEach((id,n)=>{const x=(n%4)*300,y=Math.floor(n/4)*210;g.fillStyle='#55381f';g.font='bold 19px Arial';g.fillText(id,x+16,y+28);[0,2,4,6].forEach((ci,k)=>g.drawImage(__gfx.blockSprite(id,ci,100),x+12+k*65,y+46+(k%2)*14,84,84));});return c.toDataURL().split(',')[1];});fs.writeFileSync(out+'/all-24-skins.png',Buffer.from(data,'base64'));
 }
 await ctx.close();
}}finally{await browser.close();}
