import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {spawnSync} from 'node:child_process';

const out=path.resolve('promo/vk-release-2.3.0'),work=path.resolve('test-results/promo-capture');
const previousManifest=fs.existsSync(path.join(out,'media-manifest.json'))?JSON.parse(fs.readFileSync(path.join(out,'media-manifest.json'))):null;
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(work,{recursive:true});
const ffmpeg=path.resolve('tools/media-runtime/node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe');
if(!fs.existsSync(ffmpeg))throw Error('Install tools/media-runtime dependencies first');
// Playwright uses a private ffmpeg recorder; keep that executable inside the workspace too.
process.env.PLAYWRIGHT_BROWSERS_PATH=path.resolve('tools/media-runtime/pw-browsers');
const revision=JSON.parse(fs.readFileSync('node_modules/playwright-core/browsers.json')).browsers.find(x=>x.name==='ffmpeg').revision;
const recorder=path.join(process.env.PLAYWRIGHT_BROWSERS_PATH,'ffmpeg-'+revision,'ffmpeg-win64.exe');
fs.mkdirSync(path.dirname(recorder),{recursive:true});if(!fs.existsSync(recorder))fs.copyFileSync(ffmpeg,recorder);
const {chromium}=await import('playwright');
const browser=await chromium.launch({channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}),errors=[],shots=[],videos=[];
const url=pathToFileURL(path.resolve('dist-vk-single/index.html')).href;
const wait=p=>p.waitForFunction(()=>window.__PM_BOOT_DONE);
function ff(args,binary=false){const r=spawnSync(ffmpeg,args,{encoding:binary?undefined:'utf8',windowsHide:true,maxBuffer:20*1024*1024});if(r.status!==0)throw Error((r.stderr||'FFmpeg failed').toString().slice(-3500));return r;}
async function settle(p){
  await p.evaluate(()=>{__game.view.anim.clear();document.querySelectorAll('.toast,.banner').forEach(e=>e.remove());});
  await p.waitForTimeout(200);
}
async function demoSave(p){
  await p.addInitScript(()=>localStorage.setItem('postcard_mahjong_save_v1',JSON.stringify({v:2,campaignVersion:2,ts:Date.now(),coins:2460,
    levels:Object.fromEntries(Array.from({length:500},(_,i)=>[i,{stars:3,time:70}])),
    styles:['ivory','jade','porcelain','obsidian','pearl'],faces:'fruit',owned:{faces:['fruit','classic','gems','stamps']},
    settings:{pace:'calm',zoom:1,musicVol:.45,sfxVol:.8},
    tut:{first:1,coin:1,repeat:1,lock:1,hidden:1,envelope:1,campaign_mail:1,campaign_seals:1,campaign_unlock:1},
    postOffice:{day:'2026-11-15',counts:{boards:2,pairs:18,letters:3},claimed:{},tokens:[],stamps:{}}
  })));
}
async function captureScreens(){
  const sizes=process.argv.includes('--landscape-only')?[['landscape',1200,600]]:[['portrait',600,1200],['landscape',1200,600]];
  for(const [label,w,h]of sizes){
    const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,locale:'ru-RU'}),p=await ctx.newPage();
    p.on('pageerror',e=>errors.push(e.message));await demoSave(p);await p.clock.setFixedTime(new Date('2026-11-15T12:00:00+03:00'));await p.goto(url);await wait(p);
    fs.mkdirSync(path.join(out,'screenshots',label),{recursive:true});
    const scenes=[
      ['01-moscow-mail',12,'fruit','ivory'],['02-paris-gems',112,'gems','porcelain'],
      ['03-kyoto-seals',427,'fruit','jade'],['04-venice-classic',212,'classic','ivory'],
    ];
    for(const [name,i,faces,skin]of scenes){
      await p.evaluate(({i,faces,skin})=>{__game.ui.closeModal();__game.setFaces(faces);__game.setStyle(skin);__save.data.settings.zoom=1;__game.startLevel(i,false);__game.ui.closeModal();__game.ui.tutorial(0);},{i,faces,skin});
      await p.waitForFunction(()=>!!__lib.cityArt.cityArtStatus(__lib.levels.CITIES[__game.L.city].id)?.image);await settle(p);
      const file=`screenshots/${label}/${name}.png`;await p.screenshot({path:path.join(out,file),animations:'disabled'});shots.push({file,w,h,scene:name,level:i+1});console.log('Screenshot',label,name);
    }
    await p.evaluate(async()=>{__game.toMenu();__game.setCity(0);await __game.ui.postcard(0,null,false,0);});await settle(p);
    let file=`screenshots/${label}/05-postcard-collection.png`;await p.screenshot({path:path.join(out,file),animations:'disabled'});shots.push({file,w,h,scene:'Unlocked postcard'});
    await p.evaluate(()=>{__game.ui.closeModal();__game.ui.journal();});await settle(p);
    file=`screenshots/${label}/06-travel-journal.png`;await p.screenshot({path:path.join(out,file),animations:'disabled'});shots.push({file,w,h,scene:'Travel journal rewards'});
    await p.evaluate(()=>{__game.ui.closeModal();__game.ui.city=2;__game.ui.mapCity=null;__game.ui.page=0;__game.ui.journey();});await settle(p);
    file=`screenshots/${label}/07-city-map.png`;await p.screenshot({path:path.join(out,file),animations:'disabled'});shots.push({file,w,h,scene:'Paris route map'});
    if(label==='landscape'&&!process.argv.includes('--screens-only')){
      fs.mkdirSync(path.join(out,'branding'),{recursive:true});
      const art=await p.evaluate(async()=>{
        const image=new Image();image.src=window.__UI_ART__.emblem;await image.decode();
        const files={};
        for(const n of [576,278,150,32]){
          const cv=document.createElement('canvas');cv.width=cv.height=n;const g=cv.getContext('2d');
          const grad=g.createLinearGradient(0,0,n,n);grad.addColorStop(0,'#fff7e5');grad.addColorStop(1,'#d9c99c');g.fillStyle=grad;g.fillRect(0,0,n,n);
          g.strokeStyle='#9a7950';g.lineWidth=n*.017;g.beginPath();g.roundRect(n*.05,n*.05,n*.9,n*.9,n*.12);g.stroke();g.drawImage(image,n*.06,n*.06,n*.88,n*.88);files['icon-'+n+'.png']=cv.toDataURL('image/png');
        }
        await __lib.cityArt.loadCityArt('paris');
        const cv=document.createElement('canvas');cv.width=1120;cv.height=630;const g=cv.getContext('2d');__lib.drawCity(g,'paris',1120,630,{});
        g.fillStyle='#1d403a33';g.fillRect(0,0,1120,630);g.fillStyle='#fff6e4e8';g.beginPath();g.roundRect(80,85,960,445,32);g.fill();g.strokeStyle='#b49560';g.lineWidth=3;g.stroke();
        g.drawImage(image,112,168,230,230);g.textAlign='center';g.fillStyle='#375a49';g.font='400 72px Kurale';g.fillText('Маджонг',675,240);g.font='800 49px Nunito';g.fillText('с открытками',675,311);g.font='800 25px Nunito';g.fillStyle='#8d7249';g.fillText('Находите пары. Собирайте впечатления.',675,378);files['cover-1120x630.png']=cv.toDataURL('image/png');
        return files;
      });
      for(const [name,data]of Object.entries(art))fs.writeFileSync(path.join(out,'branding',name),Buffer.from(data.split(',')[1],'base64'));
    }
    await ctx.close();
  }
}
function audioCapture(){
  const connect=AudioNode.prototype.connect,seen=new WeakSet();
  AudioNode.prototype.connect=function(destination,...args){
    if(destination===this.context.destination&&!seen.has(this)){
      let cap=window.__promoAudio;if(!cap||cap.ctx!==this.context){cap={ctx:this.context,dest:this.context.createMediaStreamDestination()};window.__promoAudio=cap;}
      connect.call(this,cap.dest);seen.add(this);
    }return connect.call(this,destination,...args);
  };
}
async function captureVideo(label,w,h){
  const rawDir=path.join(work,label);fs.mkdirSync(rawDir,{recursive:true});
  const ctx=await browser.newContext({viewport:{width:w,height:h},recordVideo:{dir:rawDir,size:{width:w,height:h}},deviceScaleFactor:1,locale:'ru-RU'}),p=await ctx.newPage();
  p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(audioCapture);await p.goto(url);await wait(p);
  await p.mouse.click(w*.5,130);await p.waitForFunction(()=>window.__promoAudio?.ctx.state==='running');
  const patch=path.join(rawDir,'corner.png');await p.screenshot({path:patch,clip:{x:0,y:0,width:12,height:12}});
  await p.evaluate(()=>{
    const marker=document.createElement('div');marker.id='capture-marker';marker.style.cssText='position:fixed;top:0;left:0;width:12px;height:12px;background:#ff00ff;z-index:2147483647;pointer-events:none';document.body.appendChild(marker);
    const cap=window.__promoAudio;cap.parts=[];cap.rec=new MediaRecorder(cap.dest.stream,{mimeType:'audio/webm;codecs=opus',audioBitsPerSecond:128000});cap.rec.ondataavailable=e=>{if(e.data.size)cap.parts.push(e.data);};cap.rec.start(100);
  });
  console.log('Recording gameplay',label);await p.waitForTimeout(1300);await p.locator('[data-a=play]').click();await p.locator('.intro [data-go]').waitFor();await p.waitForTimeout(1500);await p.locator('.intro [data-go]').click();await p.waitForTimeout(900);
  for(let level=0;level<3;level++){
    for(let n=0;n<65;n++){
      const move=await p.evaluate(()=>{
        if(__game.finished)return null;const pair=__game.ui.tutStep>0&&__game.ui.tutStep<=2&&__game.ui.tutPair?__game.ui.tutPair:__game.game.hint()?.pair;
        if(!pair)throw Error('No move in captured game');return pair.map(i=>__game.view.tileCenter(i));
      });if(!move)break;
      for(let i=0;i<2;i++){await p.mouse.move(move[i].x,move[i].y,{steps:5});await p.waitForTimeout(i?210:120);await p.mouse.click(move[i].x,move[i].y);}
      await p.waitForTimeout(570);
    }
    if(level<2){await p.locator('.result [data-next]').waitFor();await p.waitForTimeout(1100);await p.locator('.result [data-next]').click();await p.waitForTimeout(1000);}
  }
  await p.locator('.pcm').waitFor({state:'visible'});await p.waitForTimeout(3800);
  const thumbnail=path.join(out,'video',`gameplay-${label}-poster.jpg`);fs.mkdirSync(path.dirname(thumbnail),{recursive:true});await p.screenshot({path:thumbnail,type:'jpeg',quality:94,animations:'disabled'});
  const audio=await p.evaluate(()=>new Promise(resolve=>{
    const cap=window.__promoAudio;document.getElementById('capture-marker').style.background='#0000ff';cap.rec.onstop=async()=>{const bytes=new Uint8Array(await new Blob(cap.parts,{type:cap.rec.mimeType}).arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));resolve(btoa(s));};cap.rec.stop();
  }));
  fs.writeFileSync(path.join(rawDir,'sound.webm'),Buffer.from(audio,'base64'));await p.waitForTimeout(240);
  const recording=p.video();await ctx.close();const raw=await recording.path();
  const pixels=ff(['-v','error','-i',raw,'-vf','fps=25,crop=4:4:4:4,scale=1:1,format=rgb24','-f','rawvideo','pipe:1'],true).stdout;
  let start=-1,end=-1;for(let i=0;i<pixels.length;i+=3){const [r,g,b]=pixels.subarray(i,i+3);if(start<0&&r>190&&b>190&&g<75)start=i/3;if(start>=0&&b>190&&r<75&&g<75){end=i/3;break;}}
  if(start<0||end<0)throw Error('Could not locate capture sync markers');
  const duration=(end-start)/25,file=`video/gameplay-${label}.mp4`;
  ff(['-y','-loglevel','error','-ss',String(start/25),'-i',raw,'-i',path.join(rawDir,'sound.webm'),'-loop','1','-i',patch,'-filter_complex',`[0:v]setpts=PTS-STARTPTS[v];[v][2:v]overlay=0:0,format=yuv420p[final];[1:a]loudnorm=I=-24:TP=-3:LRA=9,afade=t=in:st=0:d=0.3,afade=t=out:st=${Math.max(0,duration-1.4)}:d=1.4,apad[a]`,'-map','[final]','-map','[a]','-t',String(duration),'-r','30','-c:v','libx264','-preset','medium','-crf','20','-c:a','aac','-b:a','128k','-movflags','+faststart',path.join(out,file)]);
  ff(['-v','error','-i',path.join(out,file),'-f','null','-']);
  videos.push({file,w,h,duration:Math.round(duration*100)/100,audio:'Actual game music and sound effects',source:'First three levels played via pointer input; first postcard unlocked normally'});console.log('Encoded',file,duration.toFixed(2),'seconds');
}
try{
  if(!process.argv.includes('--video-only'))await captureScreens();
  else for(const label of ['portrait','landscape'])for(const name of fs.readdirSync(path.join(out,'screenshots',label)).filter(n=>n.endsWith('.png'))){const b=fs.readFileSync(path.join(out,'screenshots',label,name));shots.push({file:`screenshots/${label}/${name}`,w:b.readUInt32BE(16),h:b.readUInt32BE(20),scene:name.replace('.png','')});}
  if(!process.argv.includes('--screens-only')){await captureVideo('landscape',1920,1080);await captureVideo('portrait',720,1280);}
}finally{await browser.close();}
if(errors.length)throw Error(errors.join('\n'));
const untouchedShots=process.argv.includes('--screens-only')?(previousManifest?.screenshots||[]).filter(s=>!shots.some(n=>n.file===s.file)):[];
fs.writeFileSync(path.join(out,'media-manifest.json'),JSON.stringify({...previousManifest,version:JSON.parse(fs.readFileSync('package.json')).version,date:'2026-11-15',screenshots:[...untouchedShots,...shots],videos:process.argv.includes('--screens-only')?previousManifest?.videos||[]:videos,errors,screenshotProfile:'Prepared demo save to show unlocked cities/cosmetics; all images are captures of actual game UI.',videoProfile:'Fresh save; genuine input and awards, no external ads or purchases.'},null,2));
console.log('Media complete:',shots.length,'screenshots;',videos.length,'gameplay videos');
if(videos.length){const shorter=spawnSync(process.execPath,['tools/shorten-vk-videos.mjs'],{stdio:'inherit',windowsHide:true});if(shorter.status!==0)throw Error('Video duration check failed');}
