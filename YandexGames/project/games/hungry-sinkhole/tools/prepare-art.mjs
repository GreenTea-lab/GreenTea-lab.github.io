import '../test/remote-browser.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import crypto from 'node:crypto';
import {chromium} from 'playwright';
const source='[local-path]';
const files={city:'exec-217d28b6-8410-4864-8626-0116bb07bbc9.png',oasis:'exec-54e77f78-4978-4281-b44f-848ffaccd981.png',aurora:'exec-c5530d92-c28b-4efc-bcb3-a7a370b3ec66.png',garden:'exec-d0469010-69cd-49d1-a6fd-ca5a6dfdc255.png'};
fs.mkdirSync('art/generated',{recursive:true});fs.mkdirSync('static/backgrounds',{recursive:true});
const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage();const manifest=[];
try{for(const[id,file]of Object.entries(files)){
 const target=path.resolve('art/generated/'+id+'.png');
 if(!fs.existsSync(target))fs.copyFileSync(path.join(source,file),target);
 await page.goto(pathToFileURL(target).href);await page.waitForFunction(()=>document.querySelector('img')?.naturalWidth>0);
 const result=await page.evaluate(()=>{const im=document.querySelector('img'),c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);return {w:c.width,h:c.height,data:c.toDataURL('image/webp',.86).split(',')[1]};});
 const bytes=Buffer.from(result.data,'base64');fs.writeFileSync('static/backgrounds/'+id+'.webp',bytes);manifest.push({id,width:result.w,height:result.h,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),origin:'Built-in image_gen'});
}}finally{await browser.close();}
fs.writeFileSync('art/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(manifest);
