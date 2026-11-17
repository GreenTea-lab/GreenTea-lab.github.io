// Export responsive crops of existing artwork; no blur, stretching or painted fill.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {pathToFileURL} from 'node:url';import {chromium} from 'playwright';
const formats={landscape:[1920,1080],wide:[1920,960],portrait:[1080,2160]},root='static/cities',manifest=[];
const browser=await chromium.launch({channel:'chrome'});
try{
  const page=await browser.newPage();
  for(const file of fs.readdirSync('art/city-backgrounds/generated').filter(f=>f.endsWith('.png')).sort()){
    const id=path.basename(file,'.png');await page.goto(pathToFileURL(path.resolve('art/city-backgrounds/generated',file)).href);await page.waitForFunction(()=>document.querySelector('img')?.naturalWidth>0);
    for(const [format,[width,height]]of Object.entries(formats)){
      const encoded=await page.evaluate(({width,height})=>{const image=document.querySelector('img'),iw=image.naturalWidth,ih=image.naturalHeight,ratio=width/height;let sw=iw,sh=ih;if(iw/ih>ratio)sw=ih*ratio;else sh=iw/ratio;const sx=(iw-sw)/2,sy=(ih-sh)*.08,c=document.createElement('canvas');c.width=width;c.height=height;const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(image,sx,sy,sw,sh,0,0,width,height);return c.toDataURL('image/webp',.88).split(',')[1];},{width,height});
      const relative=`formats/${format}/${id}.webp`,target=path.join(root,relative),data=Buffer.from(encoded,'base64');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);manifest.push({id,format,file:'cities/'+relative,width,height,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex'),source:`art/city-backgrounds/generated/${file}`,method:'Proportional crop of existing master; upper architectural focus, no blur or padding'});
    }
  }
}finally{await browser.close();}
fs.writeFileSync(path.join(root,'formats/manifest.json'),JSON.stringify({formats,images:manifest},null,2)+'\n');console.log('Prepared',manifest.length,'responsive images:',(manifest.reduce((s,x)=>s+x.bytes,0)/1024/1024).toFixed(2),'MiB');
