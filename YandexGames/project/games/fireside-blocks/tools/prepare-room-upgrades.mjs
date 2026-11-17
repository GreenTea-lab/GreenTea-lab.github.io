import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';import{chromium}from'playwright';
import{ROOM_UPGRADES}from'../src/room-progress.js';
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage(),manifest=[];
try{
 await page.goto(pathToFileURL(path.resolve('art/v2-4/generated/room-upgrades.png')).href);await page.waitForFunction(()=>document.querySelector('img')?.complete);
 for(let n=0;n<ROOM_UPGRADES.length;n++){
  const data=await page.evaluate(n=>{
   const i=document.querySelector('img'),w=i.naturalWidth/4,h=i.naturalHeight/4,s=document.createElement('canvas');s.width=w;s.height=h;
   s.getContext('2d').drawImage(i,n%4*w,Math.floor(n/4)*h,w,h,0,0,w,h);
   const d=s.getContext('2d').getImageData(0,0,w,h).data;let l=w,t=h,r=0,b=0;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
   const c=document.createElement('canvas');c.width=c.height=384;const k=352/Math.max(r-l+1,b-t+1),W=(r-l+1)*k,H=(b-t+1)*k;c.getContext('2d').drawImage(s,l,t,r-l+1,b-t+1,(384-W)/2,(384-H)/2,W,H);
   return c.toDataURL('image/webp',.93).split(',')[1];
  },n);
  const buffer=Buffer.from(data,'base64'),x=ROOM_UPGRADES[n];fs.writeFileSync('static/decor/'+x.id+'.webp',buffer);manifest.push({...x,bytes:buffer.length,cell:n});
 }
}finally{await browser.close();}
fs.writeFileSync('art/v2-4/manifest.json',JSON.stringify(manifest,null,2));console.log('Prepared',manifest.length,'room upgrades');
