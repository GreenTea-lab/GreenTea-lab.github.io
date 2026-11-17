// Encode generated atlases for the game, retaining their exact composition and size.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const input=path.resolve('art/postcards'),output=path.resolve('static/postcards');fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),manifest=[];
try{
  const page=await browser.newPage();
  for(const file of fs.readdirSync(input).filter(x=>x.endsWith('.png')).sort()){
    await page.goto(pathToFileURL(path.join(input,file)).href);await page.waitForFunction(()=>document.querySelector('img')?.naturalWidth>0);
    const result=await page.evaluate(()=>{const img=document.querySelector('img'),c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const g=c.getContext('2d');g.drawImage(img,0,0);const samples=[];for(let i=0;i<4;i++){const q=document.createElement('canvas');q.width=192;q.height=128;q.getContext('2d').drawImage(img,i%2*c.width/2,Math.floor(i/2)*c.height/2,c.width/2,c.height/2,0,0,192,128);samples.push(q.toDataURL('image/webp',.85));}return {width:c.width,height:c.height,data:c.toDataURL('image/webp',.88).split(',')[1],samples};});
    const id=path.basename(file,'.png'),bytes=Buffer.from(result.data,'base64');fs.writeFileSync(path.join(output,id+'.webp'),bytes);
    manifest.push({id,file:'postcards/'+id+'.webp',width:result.width,height:result.height,scenes:4,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),sceneHashes:result.samples.map(s=>crypto.createHash('sha256').update(s).digest('hex')),origin:'Built-in image_gen, see art/postcards/generation.json'});
  }
  await page.goto(pathToFileURL(path.resolve('art/interface/mira.png')).href);await page.waitForFunction(()=>document.querySelector('img')?.naturalWidth>0);
  const guide=await page.evaluate(()=>{const img=document.querySelector('img'),c=document.createElement('canvas');c.width=512;c.height=Math.round(512*img.naturalHeight/img.naturalWidth);const g=c.getContext('2d');g.drawImage(img,0,0,c.width,c.height);return {width:c.width,height:c.height,alpha:[g.getImageData(0,0,1,1).data[3],g.getImageData(c.width-1,0,1,1).data[3]],data:c.toDataURL('image/webp',.91).split(',')[1]};});
  if(guide.alpha.some(a=>a>0))throw Error('Mira portrait needs actual transparency');
  fs.writeFileSync('static/ui/mira.webp',Buffer.from(guide.data,'base64'));delete guide.data;fs.writeFileSync('static/ui/mira.json',JSON.stringify(guide,null,2)+'\n');
}finally{await browser.close();}
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Prepared',manifest.length,'atlases /',manifest.length*4,'independent postcard illustrations');
