import fs from'node:fs';import path from'node:path';import crypto from'node:crypto';import{pathToFileURL}from'node:url';import{chromium}from'playwright';
import{ROOM_SCENES}from'../src/room-scenes.js';
const partial=process.argv.includes('--partial'),out='static/rooms',source='art/v2-5/generated';fs.mkdirSync(out,{recursive:true});
const expected=ROOM_SCENES.flatMap(s=>['wide','phone'].map(o=>({key:s.key+'-'+o,stars:s.stars,orientation:o})));
if(!partial)for(const x of expected)if(!fs.existsSync(source+'/'+x.key+'.png'))throw Error('Missing generated room: '+x.key);
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage(),manifest=[];
try{for(const x of expected){
 const file=source+'/'+x.key+'.png';if(!fs.existsSync(file))continue;
 await page.goto(pathToFileURL(path.resolve(file)).href);await page.waitForFunction(()=>document.querySelector('img')?.naturalWidth>0);
 const r=await page.evaluate(()=>{const i=document.querySelector('img'),c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;c.getContext('2d').drawImage(i,0,0);return {w:c.width,h:c.height,data:c.toDataURL('image/webp',.88).split(',')[1]};});
 const buffer=Buffer.from(r.data,'base64');fs.writeFileSync(out+'/'+x.key+'.webp',buffer);
 manifest.push({...x,width:r.w,height:r.h,bytes:buffer.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex'),master:file});
}}finally{await browser.close();}
fs.writeFileSync(out+'/manifest.json',JSON.stringify(manifest,null,2));console.log('Prepared',manifest.length,'full room backgrounds,',(manifest.reduce((a,x)=>a+x.bytes,0)/1024/1024).toFixed(2),'MiB');
