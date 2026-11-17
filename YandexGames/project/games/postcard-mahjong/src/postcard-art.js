import {CITIES} from './levels.js';
import {TRIPS,weekNumber} from './travel.js';
const records=new Map();let clock=0;
export function postcardAsset(city,variant=0,edition=''){
  if(edition.startsWith('event:'))return {key:'events',index:Math.max(0,TRIPS.findIndex(t=>t.id===edition.slice(6)))};
  if(/^\d{4}-\d{2}-\d{2}$/.test(edition))return {key:'weekly',index:((weekNumber(edition)%4)+4)%4};
  return {key:CITIES[city]?.id||'moscow',index:Math.max(0,Math.min(3,variant))};
}
export function postcardArtStatus(key){return records.get(key);}
export function loadPostcardArt(key,full=true){
  const src=window.__POSTCARD_ART__?.[key];if(!src)return Promise.resolve(null);
  let r=records.get(key);
  if(r?.image){r.used=++clock;return Promise.resolve(r.image);}
  if(r?.thumb&&!full)return Promise.resolve(r.thumb);
  if(r?.pending)return r.pending;
  if(r?.failedAt&&Date.now()-r.failedAt<30000)return Promise.resolve(r.thumb||null);
  if(!r){r={revision:0};records.set(key,r);}const record=r;
  record.pending=new Promise(resolve=>{
    const image=new Image();let ended=false;
    const timer=setTimeout(()=>finish(null),6000);
    const finish=img=>{
      if(ended)return;ended=true;clearTimeout(timer);record.pending=null;
      if(img){
        const thumb=document.createElement('canvas');thumb.width=768;thumb.height=Math.round(768*img.naturalHeight/img.naturalWidth);thumb.getContext('2d').drawImage(img,0,0,thumb.width,thumb.height);
        record.thumb=thumb;record.image=full?img:null;record.used=++clock;record.revision++;record.failedAt=0;
        [...records.values()].filter(x=>x.image).sort((a,b)=>b.used-a.used).slice(4).forEach(x=>{x.image=null;});
        window.dispatchEvent(new CustomEvent('cardartready',{detail:{key}}));
      }else record.failedAt=Date.now();
      resolve(img||record.thumb||null);
    };
    image.onload=()=>finish(image);image.onerror=()=>finish(null);image.src=src;
  });return record.pending;
}
export function drawPostcardArt(g,city,w,h,variant,edition){
  const {key,index}=postcardAsset(city,variant,edition),r=records.get(key),img=r?.image||r?.thumb;
  if(!img){loadPostcardArt(key,w>400);return false;}
  if(!r.image&&w>500)loadPostcardArt(key,true);r.used=++clock;
  const iw=(img.naturalWidth||img.width)/2,ih=(img.naturalHeight||img.height)/2,ratio=w/h;
  let sw=iw,sh=ih;if(iw/ih>ratio)sw=ih*ratio;else sh=iw/ratio;
  g.drawImage(img,index%2*iw+(iw-sw)/2,Math.floor(index/2)*ih+(ih-sh)/2,sw,sh,0,0,w,h);return true;
}
export const WEEKLY_THEMES=[['Письма цветущего сада','Letters from the blooming garden'],['Лето у моря','Summer by the sea'],['Осенняя почтовая станция','The autumn post house'],['Зимний свет в окне','Winter window light']];
