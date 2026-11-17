const images={};
const bounds={};
export const decorURL=id=>window.__FB_DECOR__?.[id]||'';
export const decorArt=id=>images[id];
export const decorBounds=id=>bounds[id]||{x:16,y:16,w:352,h:352};
export async function loadDecorArt(){
 await Promise.all(Object.entries(window.__FB_DECOR__||{}).map(([id,url])=>new Promise(resolve=>{
  const img=new Image();img.onload=()=>{
   images[id]=img;
   const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
   const g=c.getContext('2d');g.drawImage(img,0,0);const data=g.getImageData(0,0,c.width,c.height).data;
   let l=c.width,t=c.height,r=0,b=0;
   for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>24){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}
   bounds[id]={x:l,y:t,w:r-l+1,h:b-t+1};
   window.dispatchEvent(new Event('decorready'));resolve();
  };img.onerror=resolve;img.src=url;
 })));
}
