import {decorArt,decorBounds} from './decor-art.js';
import {roomSlot} from './room-progress.js';

// Опорные точки — поверхности мебели на фоне; x и bottom в долях комнаты.
// Предмет остаётся на своём месте при открытии следующих наград.
const WIDE={
 cup:[.065,.81,.065,.12],scatter:[.235,.87,.07,.10],glasses:[.12,.87,.07,.07],
 book:[.19,.79,.09,.13],yarn:[.245,.67,.08,.13],plate:[.115,.79,.08,.12],
 candle:[.79,.225,.055,.13],flowers:[.94,.20,.07,.12],watch:[.86,.215,.05,.11],
 cat:[.72,.96,.14,.15],jam:[.79,.76,.06,.13],teapot:[.93,.775,.095,.14],crossword:[.855,.79,.09,.10],
};
const PHONE={
 cup:[.25,.842,.115,.065],scatter:[.56,.895,.12,.05],glasses:[.30,.895,.125,.04],
 book:[.43,.842,.14,.065],yarn:[.1,.865,.13,.065],plate:[.6,.842,.14,.055],
 candle:[.43,.895,.08,.055],flowers:[.15,.895,.10,.06],watch:[.69,.895,.085,.055],
 cat:[.85,.985,.20,.065],jam:[.76,.842,.10,.065],teapot:[.89,.842,.15,.065],crossword:[.84,.895,.16,.06],
};
export function roomDecorLayout(W,H,ids){
 const anchors=H>W*1.15?PHONE:WIDE;
 return ids.filter(id=>anchors[roomSlot(id)]).map(id=>{
  const slot=roomSlot(id);let [cx,bottom,mw,mh]=anchors[slot];const source=decorBounds(id);
  if(anchors===WIDE&&H<500){
   const compact={cat:[.85,.99,.12,.15],yarn:[.17,.67,.08,.13],candle:[.025,.78,.04,.13],watch:[.22,.83,.04,.09],flowers:[.98,.76,.04,.12]};
   if(compact[slot])[cx,bottom,mw,mh]=compact[slot];
  }
  const scale=Math.min(W*mw/source.w,H*mh/source.h),w=source.w*scale,h=source.h*scale;
  return {id,slot,x:W*cx-w/2,y:H*bottom-h,w,h,source};
 });
}
export function paintRoomDecor(g,W,H,ids,fallback){
 const placed=roomDecorLayout(W,H,ids);
 for(const p of [...placed].sort((a,b)=>(a.y+a.h)-(b.y+b.h))){
  const img=decorArt(p.id);g.save();
  if(img){
   g.shadowColor='rgba(38,18,6,.32)';g.shadowBlur=Math.max(1,p.w*.035);g.shadowOffsetY=Math.max(1,p.h*.025);
   const s=p.source;g.drawImage(img,s.x,s.y,s.w,s.h,p.x,p.y,p.w,p.h);
  }else if(fallback){g.translate(p.x+p.w/2,p.y+p.h/2);fallback(p.slot,g,Math.min(p.w,p.h)/2);}
  g.restore();
 }
 return placed;
}
