// Оптимизация формата без изменения композиции или размера сгенерированных мастеров.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
const dir=path.resolve('art/backgrounds/generated'),out=path.resolve('static/backgrounds');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({...process.platform==='win32'?{channel:'chrome'}:{}});
const manifest=[];
try{
  const page=await browser.newPage();
  for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.png')).sort()){
    const id=path.basename(file,'.png'),target=path.join(out,id+'.webp');
    await page.goto(pathToFileURL(path.join(dir,file)).href);
    await page.waitForFunction(()=>document.querySelector('img')?.naturalWidth>0);
    const image=await page.evaluate(()=>{
      const img=document.querySelector('img'),c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);
      return {width:c.width,height:c.height,data:c.toDataURL('image/webp',.9).split(',')[1]};
    });
    const buffer=Buffer.from(image.data,'base64');fs.writeFileSync(target,buffer);
    manifest.push({id,file:'backgrounds/'+id+'.webp',width:image.width,height:image.height,bytes:buffer.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex'),origin:'Built-in image_gen; full prompt in art/backgrounds/prompts.json'});
  }
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Prepared',manifest.length,'backgrounds,',(manifest.reduce((a,x)=>a+x.bytes,0)/1024/1024).toFixed(2),'MiB');

