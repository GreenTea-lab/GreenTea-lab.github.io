// Six transparent atlases: enamel botanicals, gemstones and travel stamps.
import { FRUITS, FLOWERS, FACE_ORDER } from './tile-catalog.js';
const groups={
  fruits:FRUITS,flowers:FLOWERS,'gems-a':FACE_ORDER.slice(0,16),'gems-b':FACE_ORDER.slice(16),'stamps-a':FACE_ORDER.slice(0,16),'stamps-b':FACE_ORDER.slice(16),
};
const cells=new Map(Object.entries(groups).flatMap(([group,names])=>names.map((face,index)=>[(group.startsWith('gems')?'gems':group.startsWith('stamps')?'stamps':'fruit')+':'+face,{group,index}])));
const images=new Map();let loading;
export function loadTileArt(){
  if(loading)return loading;
  if(typeof window==='undefined')return Promise.resolve();
  loading=Promise.all(Object.keys(groups).map(group=>new Promise(resolve=>{
    const src=window.__TILE_ART__?.[group];if(!src){resolve();return;}
    const img=new Image(),timer=setTimeout(resolve,3500);
    img.onload=()=>{clearTimeout(timer);if(img.naturalWidth===1024&&img.naturalHeight===1024){images.set(group,img);window.dispatchEvent(new Event('tileartready'));}resolve();};
    img.onerror=()=>{clearTimeout(timer);resolve();};img.src=src;
  })));
  return loading;
}
export function drawPaintedFace(g,face,set='fruit'){
  const cell=cells.get(set+':'+face),img=cell&&images.get(cell.group);if(!img)return false;
  const expand=set==='stamps'?112:100,offset=(100-expand)/2;
  g.drawImage(img,cell.index%4*256,Math.floor(cell.index/4)*256,256,256,offset,offset,expand,expand);return true;
}
export function tileArtStatus(){const count=prefix=>[...images.keys()].filter(k=>k.startsWith(prefix)).length*16;return {loaded:[...images.keys()],faces:(images.has('fruits')?16:0)+(images.has('flowers')?16:0),totalFaces:images.size*16,collections:{fruit:(images.has('fruits')?16:0)+(images.has('flowers')?16:0),gems:count('gems'),stamps:count('stamps')}};}
