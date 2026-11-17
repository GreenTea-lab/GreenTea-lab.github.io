import {roomSceneForDecor} from './room-scenes.js';
const cache=new Map(),LIMIT=3;
export const roomImageCacheSize=()=>cache.size;
export function roomBackground(ids,W,H){
 const stage=roomSceneForDecor(ids),orientation=H>W*1.15?'phone':'wide',key=stage.key+'-'+orientation;
 const url=window.__FB_ROOMS__?.[key];
 if(!url)return {key,stage:stage.key,stars:stage.stars,objects:stage.objects,orientation,ready:false,image:null,shownKey:null};
 const old=cache.get(key);if(old?.state==='error'&&Date.now()-old.failedAt>10000)cache.delete(key);
 if(url&&!cache.has(key)){
  const image=new Image(),entry={image,key,orientation,state:'loading',promise:null};
  entry.promise=new Promise(resolve=>{
   image.onload=()=>{entry.state='ready';resolve(true);window.dispatchEvent(new Event('backgroundready'));};
   image.onerror=()=>{entry.state='error';entry.failedAt=Date.now();resolve(false);window.dispatchEvent(new Event('backgroundready'));};
  });cache.set(key,entry);image.src=url;
 }
 const entry=cache.get(key);
 if(entry){cache.delete(key);cache.set(key,entry);}
 while(cache.size>LIMIT)cache.delete(cache.keys().next().value);
 const shown=entry?.state==='ready'?entry:[...cache.values()].reverse().find(x=>x.orientation===orientation&&x.state==='ready');
 return {key,stage:stage.key,stars:stage.stars,objects:stage.objects,orientation,ready:entry?.state==='ready',image:shown?.image||null,shownKey:shown?.key||null,promise:entry?.promise};
}
export async function preloadRoom(ids,W,H){
 const state=roomBackground(ids,W,H);if(state.ready||!state.promise)return;
 let timer;await Promise.race([state.promise,new Promise(r=>{timer=setTimeout(r,2000);})]);clearTimeout(timer);
}
