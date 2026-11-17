import '../test/remote-browser.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const orientation = process.argv[2];
assert.ok(['landscape', 'portrait'].includes(orientation));
const portrait = orientation === 'portrait';
const root = path.resolve('test-results/vk-media-2.3.1', orientation);
const frameDir = path.join(root, 'frames');
fs.mkdirSync(frameDir, {recursive:true});
fs.mkdirSync(root + '/screenshots', {recursive:true});
const url = pathToFileURL(path.resolve('dist-vk/index.html')).href;
const report = { version: '2.3.1', orientation, screenshots: [], scenes: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });

async function page(width, height) {
  const p = await browser.newPage({viewport:{width,height},locale:'ru-RU',hasTouch:portrait,reducedMotion:'reduce'});
  p.on('pageerror', e => report.errors.push(e.message));
  await p.addInitScript(() => {
    window.__HS_DEBUG = {seed:4100,quality:'low'};
    localStorage.setItem('hungry_sinkhole_save_v1',JSON.stringify({
      level:25,tutDone:true,rounds:0,coins:430,skins:['classic','neon','gold'],skin:'neon',
      settings:{musicVol:.65,sfxVol:.68,quality:'low'}
    }));
  });
  await p.goto(url);
  await p.waitForFunction(() => window.__game?.ui && !document.querySelector('#loader'),null,{timeout:90000});
  return p;
}

async function stage(p,map,kind) {
  return p.evaluate(({map,kind}) => {
    const g=__game;
    g.manual=true;
    g.ui.closeModal();
    g.backgroundHolds.clear();
    __save.data.map=map;
    __save.data.mode=kind==='arena'?'battle':'zen';
    __save.data.skin=map==='neoncity'?'neon':map==='candyland'?'gold':'classic';
    g.play();
    g.paused=false;
    document.querySelectorAll('.toast').forEach(e=>e.remove());
    const h=g.me, sim=g.sim, tower=sim.map.landmarks[0];
    let target;
    if(kind==='tower'||kind==='skyline'){
      target={x:tower.x,z:tower.z};
      h.x=tower.x;h.z=tower.z+16;
      h.mass=kind==='skyline'?56:1800;
    } else {
      const car=sim.items.find(it=>it.agent?.type==='car'&&Math.abs(it.p.x)<45&&Math.abs(it.p.z)<48);
      const food=car||sim.items.find(it=>!it.grp&&it.kind==='prop'&&Math.hypot(it.p.x,it.p.z)<25);
      const yaw=Math.atan2(2*food.q.w*food.q.y,1-2*food.q.y*food.q.y);
      if(car)car.agent.speed=0;
      h.x=food.p.x-Math.sin(yaw)*5.7;h.z=food.p.z-Math.cos(yaw)*5.7;
      target={x:food.p.x,z:food.p.z};h.mass=kind==='arena'?156:260;
    }
    h.r=Math.sqrt((1.15+h.sizeBonus)**2+h.mass*.055);
    h.pts=Math.round(h.mass*10);
    g.view.cam.x=h.x;g.view.cam.z=h.z;g.view.cam.dist=26+h.r*5;
    window.__promo={target,kind,tower};
    return {map,kind};
  }, {map,kind});
}

async function advance(p,dt) {
  return p.evaluate(dt=>{
    const g=__game,h=g.me,p=window.__promo;
    const x=p.target.x-h.x,z=p.target.z-h.z,d=Math.hypot(x,z);
    g.stick={on:true,dx:d>.24?x/d*58:0,dy:d>.24?z/d*58:0};
    // The fixed frame clock can advance three physics steps at 20 fps.
    const quality=g.quality;
    g.quality='high';
    try {g.update(dt);} finally {g.quality=quality;}
    if(p.kind==='skyline') {
      const {x,z,height}=p.tower,v=g.view;
      const distance=innerHeight>innerWidth?1.82:1.56;
      v.camera.position.set(x+height*.9*distance,height*1.1,z+height*1.3*distance);
      v.camera.lookAt(x,height*.46,z);
      v.scene.fog.near=height*3;v.scene.fog.far=height*7;
      v.render();
    }
    return {eaten:g.stats.eaten,points:h.pts,simTime:g.sim.time};
  },dt);
}

try {
  const width=portrait?600:1200,height=portrait?1200:600;
  const still=await page(width,height);
  for(const [id,map,kind] of [
    ['01-city','town','arena'],['02-metropolis','metro','tower'],['03-neon-city','neoncity','skyline'],
    ['04-sweet-city','candyland','props'],['05-aurora','aurora','props']
  ]) {
    await stage(still,map,kind);
    const steps=kind==='skyline'?1:35;
    for(let i=0;i<steps;i++)await advance(still,1/30);
    const file='screenshots/'+id+'.png';
    await still.screenshot({path:path.join(root,file),animations:'disabled'});
    report.screenshots.push({file,width,height,map,kind});
  }
  await still.evaluate(()=>{const g=__game;g.menu();g.backgroundHolds.clear();g.update(1/30);});
  await still.locator('#play').waitFor();
  await still.screenshot({path:root+'/screenshots/06-menu.png',animations:'disabled'});
  report.screenshots.push({file:'screenshots/06-menu.png',width,height,kind:'menu'});
  await still.close();

  const p=await page(portrait?540:960,portrait?960:540);
  const fps=20, perScene=120;
  for (const [scene,map,kind] of [[0,'town','arena'],[1,'candyland','props'],[2,'metro','tower']]) {
    const sceneInfo=await stage(p,map,kind);
    let snapshot;
    for(let i=0;i<perScene;i++){
      snapshot=await advance(p,1/fps);
      await p.screenshot({path:frameDir+'/'+String(scene*perScene+i).padStart(4,'0')+'.jpg',type:'jpeg',quality:89});
    }
    assert.ok(snapshot.simTime>=5.9,map+' advances at recording speed');
    assert.ok(snapshot.eaten>0,map+' shows actual swallowing');
    report.scenes.push({...sceneInfo,seconds:perScene/fps,...snapshot});
    console.log('Captured',orientation,map,snapshot);
  }
  await p.evaluate(()=>__audio.unlock());
  const sound=await p.evaluate(async()=>{
    const a=__audio;
    await a.ctx.resume();
    a.setMusicVol(.72);
    a.setIntensity(1);
    a.setMood('town');
    a.startMusic();
    const destination=a.ctx.createMediaStreamDestination();
    a.music.connect(destination);
    const rec=new MediaRecorder(destination.stream,{mimeType:'audio/webm;codecs=opus'});
    const chunks=[];
    rec.ondataavailable=e=>chunks.push(e.data);
    const finished=new Promise(resolve=>rec.onstop=resolve);
    rec.start();
    await new Promise(resolve=>setTimeout(resolve,18400));
    rec.stop();
    await finished;
    return await new Promise(resolve=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(new Blob(chunks,{type:rec.mimeType}));
    });
  });
  fs.writeFileSync(root+'/sound.webm',Buffer.from(sound,'base64'));
  await p.close();
  report.capture={
    width:portrait?540:960,height:portrait?960:540,duration:18,fps,frames:3*perScene,
    source:'2.3.1 gameplay at simulation speed, recorded in remote Chromium with a staged save and starting positions',
    audio:'Original game music'
  };
  assert.deepEqual(report.errors,[]);
} finally {
  fs.writeFileSync(root+'/manifest.json',JSON.stringify(report,null,2)+'\n');
  await browser.close();
}
