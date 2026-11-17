import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import{pathToFileURL}from'node:url';import{chromium}from'playwright';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage();
const file='static/backgrounds/manifest.json',manifest=JSON.parse(fs.readFileSync(file,'utf8'));
try{for(const[source,id]of[['room-wide','hearth'],['room-phone','hearth-phone']]){
 await page.goto(pathToFileURL(path.resolve('art/v2-3/generated/'+source+'.png')).href);await page.waitForFunction(()=>document.querySelector('img')?.naturalWidth>0);
 const r=await page.evaluate(()=>{const i=document.querySelector('img'),c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;c.getContext('2d').drawImage(i,0,0);return {width:c.width,height:c.height,data:c.toDataURL('image/webp',.93).split(',')[1]};});
 const buffer=Buffer.from(r.data,'base64');fs.writeFileSync('static/backgrounds/'+id+'.webp',buffer);
 const old=manifest.find(x=>x.id===id);Object.assign(old,{width:r.width,height:r.height,bytes:buffer.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex'),origin:'Built-in image_gen edit; art/v2-3/prompts.json'});
}}finally{await browser.close();}
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');console.log('Prepared modular room backgrounds');
