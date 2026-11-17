// Production atlas preparation: fixed cell extraction, trim transparent gutters, fit and encode.
import {chromium} from 'playwright';import fs from 'node:fs';import {FRUITS,FLOWERS,FACE_ORDER} from '../src/tile-catalog.js';
const groups={fruits:FRUITS,flowers:FLOWERS,'gems-a':FACE_ORDER.slice(0,16),'gems-b':FACE_ORDER.slice(16),'stamps-a':FACE_ORDER.slice(0,16),'stamps-b':FACE_ORDER.slice(16)};
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage(),manifest=[];
try{for(const [id,names]of Object.entries(groups)){
 const data='data:image/png;base64,'+fs.readFileSync(`art/collections/${id}-master.png`).toString('base64');
 const result=await page.evaluate(async data=>{
  const img=new Image();img.src=data;await img.decode();const atlas=document.createElement('canvas');atlas.width=atlas.height=1024;const g=atlas.getContext('2d'),crops=[];
  for(let n=0;n<16;n++){
   const x=Math.round(n%4*img.width/4),y=Math.round(Math.floor(n/4)*img.height/4),w=Math.round((n%4+1)*img.width/4)-x,h=Math.round((Math.floor(n/4)+1)*img.height/4)-y;
   const c=document.createElement('canvas');c.width=w;c.height=h;const cg=c.getContext('2d');cg.drawImage(img,x,y,w,h,0,0,w,h);const a=cg.getImageData(0,0,w,h).data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let best={count:0};
   for(let start=0;start<w*h;start++){
    if(seen[start]||a[start*4+3]<=64)continue;let head=0,tail=1,X=w,Y=h,R=0,B=0;queue[0]=start;seen[start]=1;
    while(head<tail){const p=queue[head++],i=p%w,j=Math.floor(p/w);X=Math.min(X,i);Y=Math.min(Y,j);R=Math.max(R,i);B=Math.max(B,j);for(const q of [i>0?p-1:-1,i<w-1?p+1:-1,j>0?p-w:-1,j<h-1?p+w:-1])if(q>=0&&!seen[q]&&a[q*4+3]>64){seen[q]=1;queue[tail++]=q;}}
    if(tail>best.count)best={count:tail,X,Y,R,B};
   }
   if(best.count<1000)throw Error('Empty collection cell');
   const X=Math.max(0,best.X-2),Y=Math.max(0,best.Y-2),R=Math.min(w-1,best.R+2),B=Math.min(h-1,best.B+2),cw=R-X+1,ch=B-Y+1,scale=226/Math.max(cw,ch);
   g.drawImage(c,X,Y,cw,ch,n%4*256+(256-cw*scale)/2,Math.floor(n/4)*256+(256-ch*scale)/2,cw*scale,ch*scale);crops.push({x:x+X,y:y+Y,w:cw,h:ch});
  }
  return {webp:atlas.toDataURL('image/webp',.95),master:[img.width,img.height],crops,alpha:g.getImageData(0,0,1,1).data[3]};
 },data);
 if(result.alpha!==0)throw Error('Transparency lost');fs.writeFileSync(`static/tiles/${id}.webp`,Buffer.from(result.webp.split(',')[1],'base64'));manifest.push({id,file:`${id}.webp`,width:1024,height:1024,masterSize:result.master,cells:names.map((face,n)=>({face,column:n%4,row:Math.floor(n/4),source:result.crops[n]}))});
}fs.writeFileSync('static/tiles/collections-manifest.json',JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync('static/tiles/manifest.json',JSON.stringify(manifest.filter(x=>x.id==='fruits'||x.id==='flowers'),null,2)+'\n');console.log('Prepared 96 ornaments: 32 botanicals, 32 gems and 32 travel stamps.');}finally{await browser.close()}
