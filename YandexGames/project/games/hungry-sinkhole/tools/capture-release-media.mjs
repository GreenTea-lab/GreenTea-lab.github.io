import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const out=path.resolve('promo/vk-2.2.1'),work=path.resolve('test-results/media-v2');fs.mkdirSync(out,{recursive:true});fs.mkdirSync(work,{recursive:true});
const ffmpeg=path.resolve('../postcard-mahjong/tools/media-runtime/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe');
if(!fs.existsSync(ffmpeg))throw Error('FFmpeg media runtime missing');
process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(work,'pw');
const revision=JSON.parse(fs.readFileSync('node_modules/playwright-core/browsers.json')).browsers.find(x=>x.name==='ffmpeg').revision;
const recorder=path.join(process.env.PLAYWRIGHT_BROWSERS_PATH,'ffmpeg-'+revision,'ffmpeg-win64.exe');fs.mkdirSync(path.dirname(recorder),{recursive:true});if(!fs.existsSync(recorder))fs.copyFileSync(ffmpeg,recorder);
const{chromium}=await import('playwright');const browser=await chromium.launch({channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}),errors=[];
const url=pathToFileURL(path.resolve('dist-vk-single/index.html')).href;
const ready=p=>p.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
function audioCapture(){const connect=AudioNode.prototype.connect,seen=new WeakSet();AudioNode.prototype.connect=function(destination,...args){if(destination===this.context.destination&&!seen.has(this)){let cap=window.__capture;if(!cap||cap.ctx!==this.context){cap={ctx:this.context,dest:this.context.createMediaStreamDestination()};window.__capture=cap;}connect.call(this,cap.dest);seen.add(this);}return connect.call(this,destination,...args);};}
function ff(args,binary=false){const r=spawnSync(ffmpeg,args,{encoding:binary?undefined:'utf8',windowsHide:true,maxBuffer:30*1024*1024});if(r.status!==0)throw Error(String(r.stderr).slice(-3000));return r;}
async function demo(p){await p.addInitScript(()=>{window.__HS_DEBUG={seed:4100,auto:true};localStorage.setItem('hungry_sinkhole_save_v1',JSON.stringify({ts:Date.now(),level:20,coins:2380,tutDone:true,settings:{musicVol:.32,sfxVol:.7,quality:'auto'},skins:['classic','galaxy','rainbow'],skin:'galaxy',up:{size:3,speed:2,suck:2,time:0},expeditions:{1:3,2:2,3:3}}));});}
const media={screenshots:process.argv.includes('--videos-only')&&fs.existsSync(out+'/manifest.json')?JSON.parse(fs.readFileSync(out+'/manifest.json')).screenshots:[],videos:[],errors};
try{
 if(!process.argv.includes('--videos-only'))for(const[label,w,h]of [['landscape',1200,600],['portrait',600,1200]]){
  const p=await browser.newPage({viewport:{width:w,height:h},locale:'ru-RU'});p.on('pageerror',e=>errors.push(e.message));await demo(p);await p.goto(url);await ready(p);const dir=out+'/screenshots/'+label;fs.mkdirSync(dir,{recursive:true});
  for(const[id,map,mode]of [['01-city','town','battle'],['02-oasis','oasis','zen'],['03-garden','botanical','zen'],['04-polar','aurora','zen'],['05-candy','candyland','zen']]){
   await p.evaluate(({map,mode})=>{const g=__game;g.ui.closeModal();__save.data.map=map;__save.data.mode=mode;g.play();},{map,mode});await p.waitForTimeout(3600);await p.evaluate(()=>document.querySelectorAll('.toast').forEach(e=>e.remove()));
   const file='screenshots/'+label+'/'+id+'.png';await p.screenshot({path:out+'/'+file,animations:'disabled'});media.screenshots.push({file,width:w,height:h,map,mode,source:'Actual gameplay; demo save'});console.log('SCREEN',label,map);
  }
  await p.evaluate(()=>__game.menu());await p.waitForTimeout(300);await p.screenshot({path:dir+'/06-menu.png',animations:'disabled'});media.screenshots.push({file:'screenshots/'+label+'/06-menu.png',width:w,height:h,source:'Menu; demo save'});
  if(label==='landscape'){
   const branding=await p.evaluate(async()=>{const result={},im=new Image();im.src=__HS_ART__.city;await im.decode();
    for(const n of [576,278,150,32]){const c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d');g.fillStyle='#9edfff';g.fillRect(0,0,n,n);g.drawImage(im,im.width*.25,im.height*.33,im.width*.5,im.height*.65,0,0,n,n);g.fillStyle='#fff6d8';g.strokeStyle='#19243d';g.lineWidth=n*.035;g.beginPath();g.ellipse(n*.5,n*.62,n*.42,n*.22,-.07,0,Math.PI*2);g.fill();g.stroke();const gr=g.createRadialGradient(n*.5,n*.56,n*.04,n*.5,n*.64,n*.4);gr.addColorStop(0,'#34496c');gr.addColorStop(.7,'#0b1224');gr.addColorStop(1,'#000');g.fillStyle=gr;g.beginPath();g.ellipse(n*.5,n*.62,n*.35,n*.15,-.07,0,Math.PI*2);g.fill();result['icon-'+n+'.png']=c.toDataURL();}
    const c=document.createElement('canvas');c.width=1120;c.height=630;const g=c.getContext('2d');g.drawImage(im,0,0,1120,630);g.textAlign='center';g.font='400 62px "Rubik Bubbles"';g.lineWidth=11;g.strokeStyle='#1d2240';g.fillStyle='#ffda59';g.strokeText('Голодная Воронка',560,115);g.fillText('Голодная Воронка',560,115);result['cover-1120x630.png']=c.toDataURL();return result;});
   fs.mkdirSync(out+'/branding',{recursive:true});for(const[name,data]of Object.entries(branding))fs.writeFileSync(out+'/branding/'+name,Buffer.from(data.split(',')[1],'base64'));
  }
  await p.close();
 }
 for(const[label,w,h]of [['landscape',1920,1080],['portrait',1080,1920]]){
  const rawDir=work+'/'+label;fs.mkdirSync(rawDir,{recursive:true});fs.mkdirSync(out+'/video',{recursive:true});const ctx=await browser.newContext({viewport:{width:w,height:h},recordVideo:{dir:rawDir,size:{width:w,height:h}},locale:'ru-RU'}),p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await demo(p);await p.addInitScript(audioCapture);await p.goto(url);await ready(p);await p.mouse.click(4,h-4);await p.waitForFunction(()=>window.__capture?.ctx.state==='running');
  const patch=rawDir+'/corner.png';await p.screenshot({path:patch,clip:{x:0,y:0,width:12,height:12}});
  await p.evaluate(()=>{const m=document.createElement('div');m.id='marker';m.style.cssText='position:fixed;top:0;left:0;width:12px;height:12px;background:#ff00ff;z-index:2147483647';document.body.appendChild(m);const c=__capture;c.parts=[];c.rec=new MediaRecorder(c.dest.stream,{mimeType:'audio/webm;codecs=opus',audioBitsPerSecond:128000});c.rec.ondataavailable=e=>{if(e.data.size)c.parts.push(e.data);};c.rec.start(100);});
  const started=Date.now();await p.waitForTimeout(500);await p.locator('#play').click();await p.waitForTimeout(10500);
  await p.evaluate(()=>{__game.ui.closeModal();__save.data.map='candyland';__save.data.mode='zen';__save.data.skin='rainbow';__game.play();});await p.waitForTimeout(Math.max(0,23500-(Date.now()-started)));
  const audio=await p.evaluate(()=>new Promise(resolve=>{document.getElementById('marker').style.background='#0000ff';const c=__capture;c.rec.onstop=async()=>{const bytes=new Uint8Array(await new Blob(c.parts,{type:c.rec.mimeType}).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));resolve(btoa(s));};c.rec.stop();}));fs.writeFileSync(rawDir+'/sound.webm',Buffer.from(audio,'base64'));await p.waitForTimeout(200);const vid=p.video();await ctx.close();const raw=await vid.path();
  const pixels=ff(['-v','error','-i',raw,'-vf','fps=25,crop=4:4:4:4,scale=1:1,format=rgb24','-f','rawvideo','pipe:1'],true).stdout;let start=-1,end=-1;for(let i=0;i<pixels.length;i+=3){const[r,g,b]=pixels.subarray(i,i+3);if(start<0&&r>190&&b>190&&g<75)start=i/3;if(start>=0&&b>190&&r<75&&g<75){end=i/3;break;}}
  if(start<0||end<0)throw Error('Missing A/V markers '+label);const duration=Math.min(24,(end-start)/25),file='video/gameplay-'+label+'.mp4';
  ff(['-y','-loglevel','error','-ss',String(start/25),'-i',raw,'-i',rawDir+'/sound.webm','-loop','1','-i',patch,'-filter_complex',`[0:v]setpts=PTS-STARTPTS[v];[v][2:v]overlay=0:0,format=yuv420p[final];[1:a]loudnorm=I=-24:TP=-3:LRA=9,afade=t=in:st=0:d=0.25,afade=t=out:st=${duration-1}:d=1,apad[a]`,'-map','[final]','-map','[a]','-t',String(duration),'-r','30','-c:v','libx264','-preset','fast','-crf','22','-c:a','aac','-ar','48000','-b:a','128k','-movflags','+faststart',out+'/'+file]);
  ff(['-y','-loglevel','error','-ss','6','-i',out+'/'+file,'-frames:v','1',out+'/video/poster-'+label+'.jpg']);media.videos.push({file,width:w,height:h,duration,audio:'Actual synthesized game music and SFX; AAC 48kHz',source:'Actual gameplay; demo save and automatic steering'});console.log('VIDEO',label,duration);
 }
 if(errors.length)throw Error(errors.join('\n'));
}finally{fs.writeFileSync(out+'/manifest.json',JSON.stringify(media,null,2)+'\n');await browser.close();}
