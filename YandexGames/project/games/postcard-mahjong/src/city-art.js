// Сгенерированные фоны. В HTML для локального запуска src — встроенные data URL.
const records=new Map();
let clock=0;
const recordKey=(id,format)=>format==='square'?id:id+':'+format;
export function cityArtStatus(id,format='square'){return records.get(recordKey(id,format));}
export function cityFormat(W,H){
  const ratio=W/H;
  return [['square',1],['landscape',16/9],['wide',2],['portrait',.5]].reduce((best,item)=>Math.abs(Math.log(ratio/item[1]))<Math.abs(Math.log(ratio/best[1]))?item:best)[0];
}
export function getCityArt(id,format='square'){
  const r=records.get(recordKey(id,format));
  if(!r)loadCityArt(id,format!=='square',format);
  const fallback=records.get(id);
  return r?.image||r?.thumb||fallback?.image||fallback?.thumb||null;
}
export function loadCityArt(id,full=true,format='square'){
  const src=format==='square'?window.__CITY_ART__?.[id]:window.__CITY_VARIANTS__?.[format]?.[id];
  if(!src)return Promise.resolve(null);
  const key=recordKey(id,format);let r=records.get(key);
  if(r?.image){r.used=++clock;return Promise.resolve(r.image);}
  if(r?.thumb&&!full)return Promise.resolve(r.thumb);
  if(r?.pending){if(full)r.wantFull=true;return r.pending;}
  if(!r){r={used:++clock};records.set(key,r);}
  const record=r;
  record.pending=new Promise(resolve=>{
    const img=new Image();img.decoding='async';
    img.onload=()=>{
      const thumb=document.createElement('canvas');thumb.width=512;thumb.height=Math.round(512*img.naturalHeight/img.naturalWidth);
      thumb.getContext('2d').drawImage(img,0,0,thumb.width,thumb.height);
      record.thumb=thumb;record.used=++clock;record.image=full||record.wantFull?img:null;record.pending=null;record.error=false;
      // Полные декодированные изображения только для трёх недавно открытых городов.
      const large=[...records.values()].filter(x=>x.image).sort((a,b)=>b.used-a.used);
      large.slice(3).forEach(x=>{x.image=null;});
      window.dispatchEvent(new CustomEvent('cityartready',{detail:{id}}));
      resolve(record.image||record.thumb);
    };
    img.onerror=()=>{record.pending=null;record.error=true;resolve(null);};
    img.src=src;
  });
  return record.pending;
}

export function drawCityArt(g,id,W,H,opts={}){
  const format=opts.responsive?cityFormat(W,H):'square',image=getCityArt(id,format);
  if(!image){
    const a=g.createLinearGradient(0,0,0,H);a.addColorStop(0,'#9faebe');a.addColorStop(1,'#eee0c7');g.fillStyle=a;g.fillRect(0,0,W,H);return;
  }
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,ratio=W/H;
  // Exact native format fills the screen as-is. Unusual ratios use a normal
  // proportional cover crop; no blurred padding, stretch or extra scene zoom.
  let sw=iw,sh=ih;if(iw/ih>ratio)sw=ih*ratio;else sh=iw/ratio;
  g.drawImage(image,(iw-sw)*.5,(ih-sh)*(opts.responsive?.08:.5),sw,sh,0,0,W,H);
  if(opts.variant===2){g.fillStyle='rgba(93,65,114,.11)';g.fillRect(0,0,W,H);}
  if(opts.variant===3){g.fillStyle='rgba(255,210,120,.07)';g.fillRect(0,0,W,H);}
}
