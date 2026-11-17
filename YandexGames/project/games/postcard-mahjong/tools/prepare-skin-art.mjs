// Technical atlas extraction: isolate each cell's main connected tile, trim gutters, resize and encode.
import {chromium} from 'playwright';import fs from 'node:fs';
const styles=['ivory','jade','honey','porcelain','rose','obsidian','pearl','aqua','lavender','walnut','terracotta','midnight'];
const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage(),manifest=[];
try{for(const [kind,master]of [['front','fronts'],['back','backs']]){
 const data='data:image/png;base64,'+fs.readFileSync(`art/skins/${master}-master.png`).toString('base64');
 const result=await page.evaluate(async data=>{
  const img=new Image();img.src=data;await img.decode();const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=960;const g=atlas.getContext('2d'),crops=[];
  for(let n=0;n<12;n++){
   const x=Math.round(n%4*img.width/4),y=Math.round(Math.floor(n/4)*img.height/3),w=Math.round((n%4+1)*img.width/4)-x,h=Math.round((Math.floor(n/4)+1)*img.height/3)-y;
   const c=document.createElement('canvas');c.width=w;c.height=h;const cg=c.getContext('2d');cg.drawImage(img,x,y,w,h,0,0,w,h);const a=cg.getImageData(0,0,w,h).data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let best={count:0};
   // A generated grid can contain a sliver of a neighboring tile. Extract the whole main body only.
   for(let start=0;start<w*h;start++){
    if(seen[start]||a[start*4+3]<=64)continue;
    let head=0,tail=1,X=w,Y=h,R=0,B=0;queue[0]=start;seen[start]=1;
    while(head<tail){const p=queue[head++],i=p%w,j=Math.floor(p/w);X=Math.min(X,i);Y=Math.min(Y,j);R=Math.max(R,i);B=Math.max(B,j);
     for(const q of [i>0?p-1:-1,i<w-1?p+1:-1,j>0?p-w:-1,j<h-1?p+w:-1])if(q>=0&&!seen[q]&&a[q*4+3]>64){seen[q]=1;queue[tail++]=q;}
    }
    if(tail>best.count)best={count:tail,X,Y,R,B};
   }
   if(best.count<w*h*.25)throw Error('Empty skin cell');
   const X=Math.max(0,best.X-2),Y=Math.max(0,best.Y-2),R=Math.min(w-1,best.R+2),B=Math.min(h-1,best.B+2),cw=R-X+1,ch=B-Y+1;
   g.drawImage(c,X,Y,cw,ch,n%4*256+1,Math.floor(n/4)*320+1,254,318);crops.push({x:x+X,y:y+Y,w:cw,h:ch});
  }
  return {webp:atlas.toDataURL('image/webp',.96),master:[img.width,img.height],crops,alpha:g.getImageData(0,0,1,1).data[3]};
 },data);
 if(result.alpha!==0)throw Error('Transparency lost');fs.writeFileSync(`static/tiles/skins-${kind}.webp`,Buffer.from(result.webp.split(',')[1],'base64'));manifest.push({kind,file:`skins-${kind}.webp`,width:1024,height:960,cell:[256,320],masterSize:result.master,cells:styles.map((style,n)=>({style,column:n%4,row:Math.floor(n/4),source:result.crops[n]}))});
}fs.writeFileSync('static/tiles/skins-manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log('Prepared 12 isolated fronts and 12 matching backs.');}finally{await browser.close()}
