// Actual material bodies and independent reverse designs, indexed by persistent skin IDs.
const styles=['ivory','jade','honey','porcelain','rose','obsidian','pearl','aqua','lavender','walnut','terracotta','midnight'];
const images=new Map();let loading;
export function loadSkinArt(){
  if(loading)return loading;if(typeof window==='undefined')return Promise.resolve();
  loading=Promise.all(['front','back'].map(kind=>new Promise(resolve=>{
    const src=window.__TILE_ART__?.['skins-'+kind];if(!src){resolve();return;}
    const img=new Image(),timer=setTimeout(resolve,3500);
    img.onload=()=>{clearTimeout(timer);if(img.naturalWidth===1024&&img.naturalHeight===960){images.set(kind,img);window.dispatchEvent(new Event('tileartready'));}resolve();};
    img.onerror=()=>{clearTimeout(timer);resolve();};img.src=src;
  })));return loading;
}
export function drawSkinBody(g,style,w,h,d,kind='face'){
  const index=styles.indexOf(style),img=images.get(kind==='back'?'back':'front');if(index<0||!img)return false;
  // The image contains its own bevel and thickness. Fit its face to the existing hit rectangle.
  g.drawImage(img,index%4*256,Math.floor(index/4)*320,256,320,0,0,w+d*.55,h+d*.55);return true;
}
export function skinArtStatus(){return {loaded:[...images.keys()],styles:styles.length,fronts:images.has('front')?12:0,backs:images.has('back')?12:0};}
