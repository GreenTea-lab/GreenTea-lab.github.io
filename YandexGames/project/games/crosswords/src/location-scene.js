import {LOCATIONS} from './locations.js';
export const THUMB_W=640,THUMB_H=240;

// Only the visible scene is decoded at full size; chapter cards use small thumbnails.
export class Scene {
  constructor(){
    this.assets=window.__CW_LOCATION_ART__||{};
    this.ch=null;this.theme='light';this.front=0;this.token=0;this.loaded=false;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.layers=[0,1].map(i=>{const el=document.createElement('div');el.id='location-bg-'+i;el.className='bgc illustrated-bg';document.body.insertBefore(el,document.getElementById('app'));return el;});
    this.pc=document.createElement('canvas');this.pc.id='bgp';this.pc.className='bgc location-particles';document.body.insertBefore(this.pc,document.getElementById('app'));
    this.parts=[];this.lastFrame=0;this.running=false;
    window.addEventListener('resize',()=>this.resize());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.loop();});
    this.resize();
  }
  spec(id){return typeof id==='number'?LOCATIONS[id]:LOCATIONS.find(x=>x.id===id);}
  set(id,theme='light'){
    const spec=this.spec(id);id=spec?.id||null;
    if(id===this.ch&&theme===this.theme){this.loop();return;}
    this.ch=id;this.theme=theme;this.loaded=false;this.parts=[];
    document.body.dataset.location=id||'';
    const token=++this.token;
    if(!id||theme==='contrast'){
      this.layers.forEach(el=>el.classList.remove('on'));this.loaded=true;this.loop();return;
    }
    const url=this.assets[id]?.full;
    if(!url){this.layers.forEach(el=>el.classList.remove('on'));this.loaded=true;return;}
    const image=new Image();image.src=url;
    const activate=()=>{
      if(token!==this.token)return;
      const next=this.layers[1-this.front],old=this.layers[this.front];
      next.style.backgroundImage=`url("${url}")`;
      next.dataset.theme=theme;next.dataset.id=id;next.classList.add('on');old.classList.remove('on');
      this.front=1-this.front;this.loaded=true;this.loop();
    };
    if(image.decode)image.decode().then(activate,()=>{if(token===this.token){this.loaded=true;this.layers.forEach(el=>el.classList.remove('on'));}});
    else if(image.complete)activate();else image.onload=activate;
    image.onerror=()=>{if(token===this.token)this.loaded=true;};
  }
  thumb(id){const spec=this.spec(id);return this.assets[spec?.id]?.thumb||this.assets[spec?.id]?.full||'';}
  resize(){
    this.dpr=Math.min(1.5,devicePixelRatio||1);this.pc.width=Math.round(innerWidth*this.dpr);this.pc.height=Math.round(innerHeight*this.dpr);
    this.loop();
  }
  partType(){return !this.ch||this.reduced||this.theme==='contrast'?'none':this.spec(this.ch)?.particles||'dust';}
  loop(){
    const ctx=this.pc.getContext('2d');
    if(this.partType()==='none'){ctx.clearRect(0,0,this.pc.width,this.pc.height);return;}
    if(this.running||document.hidden)return;
    this.running=true;this.lastFrame=performance.now();
    const frame=now=>{
      if(document.hidden||this.partType()==='none'){this.running=false;ctx.clearRect(0,0,this.pc.width,this.pc.height);return;}
      const elapsed=now-this.lastFrame;
      if(elapsed>=32){this.tick(Math.min(elapsed,64)/1000,now);this.lastFrame=now;}
      requestAnimationFrame(frame);
    };requestAnimationFrame(frame);
  }
  tick(dt,now){
    const ctx=this.pc.getContext('2d'),W=innerWidth,H=innerHeight,type=this.partType();
    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,W,H);
    const count=Math.min(22,Math.round(W*H/65000)+7);
    while(this.parts.length<count)this.parts.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*2+1,vx:Math.random()*9+2,vy:type==='snow'?Math.random()*14+8:type==='petal'||type==='leaf'?Math.random()*12+6:-Math.random()*6-2,phase:Math.random()*Math.PI*2});
    for(const p of this.parts){
      p.phase+=dt;p.x+=(p.vx+Math.sin(p.phase)*7)*dt;p.y+=p.vy*dt;
      if(p.x>W+10)p.x=-10;if(p.y>H+12)p.y=-12;if(p.y<-15)p.y=H+10;
      const glow=type==='firefly';ctx.globalAlpha=glow ? .12+.25*(1+Math.sin(now/1500+p.phase)) : .2;
      ctx.fillStyle=type==='leaf'?'#c47a34':type==='petal'?'#ffe6ee':type==='snow'?'#fffaff':'#fff1b3';
      ctx.beginPath();
      if(type==='leaf'||type==='petal')ctx.ellipse(p.x,p.y,p.r*2.4,p.r,Math.sin(p.phase),0,Math.PI*2);else ctx.arc(p.x,p.y,glow?p.r*1.7:p.r,0,Math.PI*2);
      ctx.fill();
    }ctx.globalAlpha=1;
  }
}
