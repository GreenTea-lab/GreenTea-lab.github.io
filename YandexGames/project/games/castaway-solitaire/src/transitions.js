// Navigation and pause callbacks stay synchronous; only the outgoing picture lingers.
const easing='cubic-bezier(.22,.7,.22,1)';
let serial=0;
export const motionEnabled=()=>document.documentElement.dataset.motion!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
export function enter(node,modal=false){
 if(!motionEnabled())return;
 node.getAnimations().forEach(a=>a.cancel());
 node.animate([{opacity:0},{opacity:1}],{duration:220,easing});
 if(modal)node.querySelector('.panel')?.animate([{transform:'translateY(14px) scale(.98)'},{transform:'translateY(0) scale(1)'}],{duration:280,easing});
}
export function leave(node,host,modal=false){
 if(!motionEnabled()||!node.childNodes.length)return;
 const ghost=node.cloneNode(true),suffix='-ghost'+(++serial),ids=new Map();
 for(const source of [node,...node.querySelectorAll('.panel')]){
  const copy=source===node?ghost:ghost.querySelector('.panel'),style=getComputedStyle(source);
  for(const key of style)copy.style.setProperty(key,style.getPropertyValue(key));
 }
 for(const copy of [ghost,...ghost.querySelectorAll('*')]){
  if(copy.id){ids.set(copy.id,copy.id+suffix);copy.id+=suffix;}
  for(const attr of [...copy.attributes])if(attr.name.startsWith('data-'))copy.removeAttribute(attr.name);
  if(copy.classList.contains('modal'))copy.classList.replace('modal','motion-modal');
  if(copy.classList.contains('panel'))copy.classList.replace('panel','motion-panel');
  copy.style.animation='none';
 }
 for(const copy of [ghost,...ghost.querySelectorAll('*')])for(const attr of [...copy.attributes]){
  if(attr.name==='id')continue;
  const value=attr.value.replace(/url\(#([^)]+)\)/g,(all,id)=>ids.has(id)?'url(#'+ids.get(id)+')':all);
  copy.setAttribute(attr.name,value.startsWith('#')&&ids.has(value.slice(1))?'#'+ids.get(value.slice(1)):value);
 }
 ghost.classList.add('ui-ghost');ghost.inert=true;ghost.setAttribute('aria-hidden','true');host.appendChild(ghost);
 const sources=node.querySelectorAll('*'),copies=ghost.querySelectorAll('*');
 sources.forEach((source,i)=>{copies[i].scrollTop=source.scrollTop;copies[i].scrollLeft=source.scrollLeft;});
 const animation=ghost.animate([{opacity:Number(getComputedStyle(node).opacity)},{opacity:0}],{duration:160,easing,fill:'forwards'});
 if(modal)ghost.querySelector('.motion-panel')?.animate([{transform:getComputedStyle(node.querySelector('.panel')).transform},{transform:'translateY(-6px) scale(.985)'}],{duration:160,easing,fill:'forwards'});
 const remove=()=>ghost.remove();animation.finished.then(remove,remove);setTimeout(remove,220);
}
