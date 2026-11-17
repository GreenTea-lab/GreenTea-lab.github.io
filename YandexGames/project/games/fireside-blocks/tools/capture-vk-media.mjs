import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

const out=path.resolve('promo/vk-release-2.5.0'),work=path.resolve('test-results/promo-capture');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(work,{recursive:true});
const ffmpeg=path.resolve('../postcard-mahjong/tools/media-runtime/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe');
process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(work,'pw-browsers');
const revision=JSON.parse(fs.readFileSync('node_modules/playwright-core/browsers.json')).browsers.find(x=>x.name==='ffmpeg').revision;
const recorder=path.join(process.env.PLAYWRIGHT_BROWSERS_PATH,'ffmpeg-'+revision,'ffmpeg-win64.exe');
fs.mkdirSync(path.dirname(recorder),{recursive:true});if(!fs.existsSync(recorder))fs.copyFileSync(ffmpeg,recorder);
const {chromium}=await import('playwright');
const browser=await chromium.launch({channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}),errors=[],screenshots=[];
const url=pathToFileURL(path.resolve('dist-vk-single/index.html')).href;
const ready=p=>p.waitForFunction(()=>window.__game?.ui&&!document.querySelector('#loader'));
function ff(args,binary=false){const r=spawnSync(ffmpeg,args,{encoding:binary?undefined:'utf8',windowsHide:true,maxBuffer:20*1024*1024});if(r.status!==0)throw Error(String(r.stderr).slice(-4000));return r;}
async function settle(p){await p.evaluate(()=>document.querySelectorAll('.toast').forEach(e=>e.remove()));await p.waitForTimeout(1100);}
async function captureScreens(){
 const ctx=await browser.newContext({viewport:{width:1200,height:600},deviceScaleFactor:1,locale:'ru-RU'}),p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('fireside_blocks_save_v1',JSON.stringify({coins:2460,levels:Object.fromEntries(Array.from({length:600},(_,i)=>[i,{stars:3}])),daily:{day:'2026-11-15',streak:5},tut:{classic:1,tapHint:1},activity:{since:'2026-11-01',days:Object.fromEntries([1,2,3,5,6,7,9,10,12,13,14].map(n=>['2026-11-'+String(n).padStart(2,'0'),[32,15,21,3,1,1800,1]]))}})));
 await p.clock.setFixedTime(new Date('2026-11-15T12:00:00+03:00'));await p.goto(url);await ready(p);
 fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});fs.mkdirSync(path.join(out,'branding'),{recursive:true});
 async function shot(name,scene){await settle(p);const file='screenshots/'+name+'.png';await p.screenshot({path:path.join(out,file),animations:'disabled'});screenshots.push({file,width:1200,height:600,scene});console.log('Screenshot',name);}
 const scenes=[['01-autumn',6,'painted','walnut'],['02-winter',22,'frost','glacier'],['03-seaside',66,'ceramic','porcelain'],['04-lavender',640,'pearl','rose'],['05-starry-night',124,'stained','midnight']];
 for(const[name,i,style,board]of scenes){
  await p.evaluate(({i,style,board})=>{__game.ui.closeModal();__save.data.styles.push(style);__save.data.cosmetics.boards.push(board);__save.data.cosmetics.board=board;__game.setStyle(style);__game.applyCosmetics();__game.dbg.seed=i+123;__game.startLevel(i);}, {i,style,board});
  await p.locator('[data-go]').click();await shot(name,'Настоящий игровой экран, уровень '+(i+1));
 }
 await p.evaluate(()=>{__game.ui.closeModal();__game.toMenu();});await p.waitForFunction(()=>__game.view.roomState?.ready);await shot('06-cozy-room','Главное меню: комната за 1800 звёзд');
 await p.evaluate(()=>__game.ui.winCalendar());await shot('07-daily-calendar','Календарь ежедневных побед, демонстрационное сохранение');
 await p.evaluate(()=>{__game.ui.closeModal();__game.ui.styles();});await shot('08-block-skins','Мастерская: настоящие материалы блоков');
 const branding=await p.evaluate(async()=>{
  const result={},bg=new Image();bg.src=__FB_ROOMS__['room-0000-wide'];await bg.decode();
  const drawBg=(g,w,h)=>{const s=Math.max(w/bg.width,h/bg.height);g.drawImage(bg,(w-bg.width*s)/2,(h-bg.height*s)/2,bg.width*s,bg.height*s);};
  for(const n of[576,278,150,32]){const c=document.createElement('canvas');c.width=c.height=n;const g=c.getContext('2d');drawBg(g,n,n);g.fillStyle='#24100960';g.fillRect(0,0,n,n);for(const[x,y,color]of[[.13,.14,1],[.49,.14,2],[.13,.50,4],[.49,.50,0]])g.drawImage(__gfx.blockSprite('painted',color,256),n*x,n*y,n*.37,n*.37);result['icon-'+n+'.png']=c.toDataURL();}
  const c=document.createElement('canvas');c.width=1120;c.height=630;const g=c.getContext('2d');drawBg(g,1120,630);const d=g.createLinearGradient(0,0,0,630);d.addColorStop(0,'#1a0d06b0');d.addColorStop(1,'#24100733');g.fillStyle=d;g.fillRect(0,0,1120,630);g.textAlign='center';g.shadowColor='#190b05';g.shadowBlur=14;g.fillStyle='#ffe8ba';g.font='400 91px Kurale';g.fillText('Блоки у камина',560,155);g.font='800 30px Nunito';g.fillText('Собирайте линии. Создавайте уют.',560,215);for(const[x,y,color]of[[410,350,1],[510,350,2],[510,450,4],[610,450,0]])g.drawImage(__gfx.blockSprite('painted',color,160),x,y,100,100);result['cover-1120x630.png']=c.toDataURL();return result;
 });
 for(const[name,data]of Object.entries(branding))fs.writeFileSync(path.join(out,'branding',name),Buffer.from(data.split(',')[1],'base64'));
 await ctx.close();
}
function audioCapture(){const connect=AudioNode.prototype.connect,seen=new WeakSet();AudioNode.prototype.connect=function(destination,...args){if(destination===this.context.destination&&!seen.has(this)){let cap=window.__promoAudio;if(!cap||cap.ctx!==this.context){cap={ctx:this.context,dest:this.context.createMediaStreamDestination()};window.__promoAudio=cap;}connect.call(this,cap.dest);seen.add(this);}return connect.call(this,destination,...args);};}
async function captureVideo(){
 const rawDir=path.join(work,'landscape');fs.mkdirSync(rawDir,{recursive:true});fs.mkdirSync(path.join(out,'video'),{recursive:true});
 const ctx=await browser.newContext({viewport:{width:1920,height:1080},recordVideo:{dir:rawDir,size:{width:1920,height:1080}},deviceScaleFactor:1,locale:'ru-RU'}),p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(audioCapture);await p.goto(url);await ready(p);await p.mouse.click(1800,960);await p.waitForFunction(()=>window.__promoAudio?.ctx.state==='running');
 const patch=path.join(rawDir,'corner.png');await p.screenshot({path:patch,clip:{x:0,y:0,width:12,height:12}});
 await p.evaluate(()=>{const marker=document.createElement('div');marker.id='capture-marker';marker.style.cssText='position:fixed;top:0;left:0;width:12px;height:12px;background:#ff00ff;z-index:2147483647;pointer-events:none';document.body.appendChild(marker);const c=__promoAudio;c.parts=[];c.rec=new MediaRecorder(c.dest.stream,{mimeType:'audio/webm;codecs=opus',audioBitsPerSecond:128000});c.rec.ondataavailable=e=>{if(e.data.size)c.parts.push(e.data);};c.rec.start(100);});
 const started=Date.now(),moves=[];await p.waitForTimeout(650);await p.locator('[data-a=travelPlay]').click();await p.waitForTimeout(850);await p.locator('[data-go]').click();await p.waitForTimeout(500);
 while(Date.now()-started<26700){
  const state=await p.evaluate(()=>({finished:__game.finished,idx:__game.levelIdx,modal:__game.ui.modalOpen}));
  if(state.finished){if(await p.locator('[data-next]').isVisible()){await p.waitForTimeout(650);await p.locator('[data-next]').click();await p.waitForTimeout(550);if(await p.locator('[data-go]').isVisible())await p.locator('[data-go]').click();}else await p.waitForTimeout(150);continue;}
  const move=await p.evaluate(()=>{const A=__game,m=__plan(A.st.game,{beam:3})[0];if(!m)return null;const L=A.view.L,sh=__gfx.core.SHAPE[A.st.game.tray[m.slot].s];return {from:A.view.slotCenter(m.slot),to:{x:L.gx+(m.x+sh.w/2)*L.cell,y:L.gy+(m.y+sh.h/2)*L.cell},before:A.st.game.moves,level:A.levelIdx};});
  if(!move)throw Error('No legal move');await p.mouse.move(move.from.x,move.from.y,{steps:5});await p.mouse.down();await p.waitForTimeout(120);await p.mouse.move(move.to.x,move.to.y,{steps:18});await p.waitForTimeout(180);await p.mouse.up();await p.waitForTimeout(510);
  const after=await p.evaluate(()=>__game.st.game.moves);if(after!==move.before+1)throw Error('Pointer move was not accepted');moves.push({level:move.level+1,move:after});
 }
 await p.waitForTimeout(Math.max(0,28500-(Date.now()-started)));
 const audio=await p.evaluate(()=>new Promise(resolve=>{const c=__promoAudio;document.getElementById('capture-marker').style.background='#0000ff';c.rec.onstop=async()=>{const bytes=new Uint8Array(await new Blob(c.parts,{type:c.rec.mimeType}).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));resolve(btoa(s));};c.rec.stop();}));fs.writeFileSync(path.join(rawDir,'sound.webm'),Buffer.from(audio,'base64'));await p.waitForTimeout(240);const recording=p.video();await ctx.close();const raw=await recording.path();
 const pixels=ff(['-v','error','-i',raw,'-vf','fps=25,crop=4:4:4:4,scale=1:1,format=rgb24','-f','rawvideo','pipe:1'],true).stdout;let start=-1,end=-1;for(let i=0;i<pixels.length;i+=3){const[r,g,b]=pixels.subarray(i,i+3);if(start<0&&r>190&&b>190&&g<75)start=i/3;if(start>=0&&b>190&&r<75&&g<75){end=i/3;break;}}if(start<0||end<0)throw Error('Missing A/V markers');
 const duration=Math.min(28.5,(end-start)/25),file='video/gameplay-1920x1080.mp4';
 ff(['-y','-loglevel','error','-ss',String(start/25),'-i',raw,'-i',path.join(rawDir,'sound.webm'),'-loop','1','-i',patch,'-filter_complex',`[0:v]setpts=PTS-STARTPTS[v];[v][2:v]overlay=0:0,format=yuv420p[final];[1:a]loudnorm=I=-24:TP=-3:LRA=9,afade=t=in:st=0:d=0.25,afade=t=out:st=${duration-1}:d=1,apad[a]`,'-map','[final]','-map','[a]','-t',String(duration),'-r','30','-c:v','libx264','-preset','medium','-crf','20','-c:a','aac','-ar','48000','-b:a','128k','-movflags','+faststart',path.join(out,file)]);
 ff(['-y','-loglevel','error','-ss','8','-i',path.join(out,file),'-frames:v','1',path.join(out,'video/gameplay-poster.jpg')]);
 ff(['-v','error','-i',path.join(out,file),'-f','null','-']);
 fs.writeFileSync(path.join(work,'pointer-moves.json'),JSON.stringify(moves,null,2));console.log('Video',duration,'seconds;',moves.length,'real pointer moves');return {file,width:1920,height:1080,duration,audio:'Музыка и эффекты самой игры; H.264/AAC, 30 fps',realPointerMoves:moves.length};
}
let video;
try{if(!process.argv.includes('--video-only'))await captureScreens();if(!process.argv.includes('--screens-only'))video=await captureVideo();}finally{await browser.close();}
if(errors.length)throw Error(errors.join('\n'));
const previous=fs.existsSync(path.join(out,'media-manifest.json'))?JSON.parse(fs.readFileSync(path.join(out,'media-manifest.json'))):{};
fs.writeFileSync(path.join(out,'media-manifest.json'),JSON.stringify({version:'2.5.0',date:'2026-11-15',screenshots:screenshots.length?screenshots:previous.screenshots,videos:video?[video]:previous.videos,errors,screenshotProfile:'Демонстрационное сохранение: открытые главы, косметика и история ежедневных побед. Все кадры сняты из настоящего интерфейса без монтажа.',videoProfile:'Новое сохранение. Обычные движения мышью и игровые награды, без ускорения и подмены счёта.'},null,2));
