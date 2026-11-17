const images={};
export async function loadItemArt(){
 await Promise.all(Object.entries(window.__FB_ITEMS__||{}).map(([id,url])=>new Promise(resolve=>{const img=new Image();img.onload=()=>{images[id]=img;resolve();};img.onerror=resolve;img.src=url;})));
}
export const itemArt=id=>images[id];
