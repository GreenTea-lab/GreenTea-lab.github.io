import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {chromium} from 'playwright';
const sets=[['items-a',['leaf','acorn','mushroom','snowflake','mitten','ornament','tulip','daisy','ladybug','strawberry','cherry','butterfly']],['items-b',['shell','starfish','anchor','bagel','gingerbread','honey','owl','pinecone','fern','star','moon','lantern']]];
fs.mkdirSync('static/items',{recursive:true});const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage(),manifest=[];
try{for(const[file,ids]of sets){await page.goto(pathToFileURL(path.resolve('art/v2/generated/'+file+'.png')).href);await page.waitForFunction(()=>document.querySelector('img')?.complete);
 for(let n=0;n<12;n++){
  const res=await page.evaluate(n=>{const img=document.querySelector('img'),w=img.naturalWidth/4,h=img.naturalHeight/3,s=document.createElement('canvas');s.width=Math.floor(w);s.height=Math.floor(h);const g=s.getContext('2d');g.drawImage(img,(n%4)*w,Math.floor(n/4)*h,w,h,0,0,w,h);const d=g.getImageData(0,0,s.width,s.height).data;let l=s.width,t=s.height,r=0,b=0;for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++)if(d[(y*s.width+x)*4+3]>32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}const c=document.createElement('canvas');c.width=c.height=256;const scale=236/Math.max(r-l+1,b-t+1),W=(r-l+1)*scale,H=(b-t+1)*scale;c.getContext('2d').drawImage(s,l,t,r-l+1,b-t+1,(256-W)/2,(256-H)/2,W,H);return c.toDataURL('image/webp',.93).split(',')[1];},n);
  const data=Buffer.from(res,'base64');fs.writeFileSync('static/items/'+ids[n]+'.webp',data);manifest.push({id:ids[n],atlas:file,cell:n,bytes:data.length});
 }
}}finally{await browser.close();}
fs.writeFileSync('static/items/manifest.json',JSON.stringify(manifest,null,2));console.log('Prepared',manifest.length,'transparent item sprites');
