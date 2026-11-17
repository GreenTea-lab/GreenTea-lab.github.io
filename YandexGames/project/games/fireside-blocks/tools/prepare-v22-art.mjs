import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const ids=['cup','scatter','glasses','book','yarn','plate','candle','flowers','watch','cat','jam','teapot','crossword'];
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage();
fs.mkdirSync('static/ui',{recursive:true});fs.mkdirSync('static/decor',{recursive:true});
try{
 for(const name of ['loader-wide','loader-phone','decor-atlas']){
  await page.goto(pathToFileURL(path.resolve('art/v2-2/generated/'+name+'.png')).href);
  await page.waitForFunction(()=>document.querySelector('img')?.complete);
  for(let n=0;n<(name==='decor-atlas'?13:1);n++){
   const data=await page.evaluate(({name,n})=>{
    const img=document.querySelector('img'),c=document.createElement('canvas');
    if(name!=='decor-atlas'){c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);}
    else{
     const w=img.naturalWidth/4,h=img.naturalHeight/4,s=document.createElement('canvas');s.width=w;s.height=h;
     s.getContext('2d').drawImage(img,n%4*w,Math.floor(n/4)*h,w,h,0,0,w,h);
     const d=s.getContext('2d').getImageData(0,0,w,h).data;let l=w,t=h,r=0,b=0;
     for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
     c.width=c.height=384;const k=352/Math.max(r-l+1,b-t+1),W=(r-l+1)*k,H=(b-t+1)*k;
     c.getContext('2d').drawImage(s,l,t,r-l+1,b-t+1,(384-W)/2,(384-H)/2,W,H);
    }
    return c.toDataURL('image/webp',.93).split(',')[1];
   },{name,n});
   fs.writeFileSync(name==='decor-atlas'?'static/decor/'+ids[n]+'.webp':'static/ui/'+name+'.webp',Buffer.from(data,'base64'));
  }
 }
}finally{await browser.close();}
console.log('Prepared two loading scenes and 13 transparent decor objects');
