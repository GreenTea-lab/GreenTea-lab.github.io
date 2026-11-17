// A drag or pinch never becomes a tile selection on release.
import {audio} from './audio.js';
import {save} from './save.js';
export function bindBoardInput(app,canvas){
  const points=new Map();let pinch=null;
  const allowed=()=>app.state==='play'&&!app.blocked&&!app.finished&&!app.auto;
  const within=e=>{const b=app.view.L.board;return e.clientX>=b.x&&e.clientX<=b.x+b.w&&e.clientY>=b.y&&e.clientY<=b.y+b.h;};
  const geometry=()=>{const [a,b]=[...points.values()];return {distance:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2};};
  const remember=()=>{save.data.settings.zoom=app.view.zoom;app.ui.updateTravelHUD();app.ui.layout(app.view.L);app.checkpoint(false);save.write(false);};
  app.cancelGesture=()=>{points.clear();pinch=null;};
  canvas.addEventListener('pointerdown',e=>{
    if(!allowed()||!within(e)||e.button>0)return;
    audio.unlock();points.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false});
    try{canvas.setPointerCapture(e.pointerId);}catch{}
    if(points.size>=2){for(const p of points.values())p.moved=true;pinch={...geometry(),zoom:app.view.zoom};}
  });
  canvas.addEventListener('pointermove',e=>{
    const p=points.get(e.pointerId);if(!p)return;
    if(!allowed()){app.cancelGesture();return;}
    const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
    if(Math.hypot(p.x-p.startX,p.y-p.startY)>8)p.moved=true;
    if(points.size>=2){
      const g=geometry();if(pinch?.distance>0){app.view.setZoom(pinch.zoom*g.distance/pinch.distance,{x:g.x,y:g.y});app.view.pan(g.x-pinch.x,g.y-pinch.y);}
      pinch={...g,zoom:app.view.zoom};app.ui.updateTravelHUD();
    }else if(p.moved&&app.view.zoom>1){app.view.pan(dx,dy);app.ui.updateTravelHUD();}
  });
  canvas.addEventListener('pointerup',e=>{
    const p=points.get(e.pointerId);if(!p)return;
    points.delete(e.pointerId);const tap=!p.moved&&!pinch&&points.size===0;
    for(const remaining of points.values())remaining.moved=true;pinch=null;
    if(allowed()&&tap)app.tap(e.clientX,e.clientY);
    if(allowed())remember();
  });
  canvas.addEventListener('pointercancel',()=>app.cancelGesture());
  canvas.addEventListener('lostpointercapture',e=>{if(points.has(e.pointerId))app.cancelGesture();});
  canvas.addEventListener('wheel',e=>{
    if(!allowed()||!within(e))return;e.preventDefault();
    app.view.setZoom(app.view.zoom*Math.exp(-e.deltaY*.0015),{x:e.clientX,y:e.clientY});remember();
  },{passive:false});
  window.addEventListener('blur',()=>app.cancelGesture());
}
