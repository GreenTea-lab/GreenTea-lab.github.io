import {chromium}from'playwright';import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';import assert from'node:assert/strict';
import{BOARDS,EFFECTS}from'../src/materials.js';
const out='test-results/refinement';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},locale:'ru-RU',reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);await page.waitForFunction(()=>__game?.ui&&!document.querySelector('#loader'));
 const report=await page.evaluate(async({boards,effects})=>{
  __game.startClassic(false);const v=__game.view,skins=Object.keys(__gfx.STYLES),images=[];
  const preset={style:v.style,board:__save.data.cosmetics.board,effect:__save.data.cosmetics.effect};
  for(let group=0;group<2;group++){
   const c=document.createElement('canvas');c.width=1320;c.height=12*156;const g=c.getContext('2d');g.fillStyle='#563f2b';g.fillRect(0,0,c.width,c.height);
   for(let row=0;row<12;row++){
    const id=skins[group*12+row];g.fillStyle='#f8e5bf';g.font='18px Arial';g.fillText(id,8,row*156+80);v.style=id;
    for(let col=0;col<boards.length;col++){
     const x=150+col*146,y=row*156;g.drawImage(v.boardPreview(boards[col],true),x,y,144,144);
     for(let k=0;k<5;k++)v.block(g,k,x+24+k*23,y+42+(k%2)*24,23,['leaf','acorn','cherry','moon','snowflake'][k]);
     g.fillStyle='#f8e5bf';g.font='12px Arial';g.fillText(boards[col],x+14,y+152);
    }
   }
   images.push(['skins-boards-'+(group+1),c.toDataURL().split(',')[1]]);
  }
  // Each effect is actually emitted by the game, including wood chips for sparks.
  const emitted=[];for(const [id,x]of Object.entries(effects)){
   v.fx.parts=[];v.effect=id;v.addClear([[0,2]],null);
   const p=v.fx.parts.filter(p=>p.kind!=='spark');
   if(!p.length||p.some(p=>id==='sparks'?p.kind!=='chip':p.kind!=='collectible'||p.item!==x.item))throw Error('Wrong particles '+id);
   emitted.push({id,count:p.length});
  }
  // Every saved preset survives a rebuild and uses the chosen renderer.
  for(const id of skins){__save.data.style=id;__game.applyCosmetics();__game.setStyle(id);if(v.style!==id)throw Error(id);}
  for(const id of boards){__save.data.cosmetics.board=id;__game.applyCosmetics();if(v.boardStyle!==id||!v.boardImg)throw Error(id);}
  const c=document.createElement('canvas');c.width=1280;c.height=960;const g=c.getContext('2d'),all=Object.entries(__FB_ART__);
  for(let n=0;n<all.length;n++){
   const [id,url]=all[n],i=new Image();i.src=url;await i.decode();const x=n%4*320,y=Math.floor(n/4)*240;g.drawImage(i,x,y,320,240);g.drawImage(v.boardPreview(boards[n%8],true),x+70,y+25,180,180);
   v.style=skins[n%skins.length];for(let k=0;k<5;k++)v.block(g,k,x+100+k*24,y+83+(k%2)*24,24,['leaf','acorn','cherry','moon','snowflake'][k]);
   g.fillStyle='#23180be6';g.fillRect(x,y+210,320,30);g.fillStyle='#f6e1b5';g.font='16px Arial';g.fillText(id,x+10,y+231);
  }images.push(['all-backgrounds',c.toDataURL().split(',')[1]]);
  const d=document.createElement('canvas');d.width=1040;d.height=4*240;const dg=d.getContext('2d');dg.fillStyle='#987044';dg.fillRect(0,0,d.width,d.height);
  for(let n=0;n<__gfx.DECOR.length;n++){const item=__gfx.DECOR[n],i=new Image();i.src=__FB_DECOR__[item.id];await i.decode();const x=n%4*260,y=Math.floor(n/4)*240;dg.drawImage(i,x+30,y+8,200,200);dg.fillStyle='#ffedc8';dg.font='18px Arial';dg.fillText(item.id+' · '+item.stars+' ★',x+35,y+227);}
  images.push(['13-decor-objects',d.toDataURL().split(',')[1]]);
  __save.data.style=preset.style;__save.data.cosmetics.board=preset.board;__save.data.cosmetics.effect=preset.effect;__game.applyCosmetics();__save.data.levels=Object.fromEntries(Array.from({length:40},(_,i)=>[i,{stars:3}]));__game.toMenu();
  return {images,skins:skins.length,boards:boards.length,effects:emitted,backgrounds:all.length};
 },{boards:Object.keys(BOARDS),effects:EFFECTS});
 for(const [name,data]of report.images)fs.writeFileSync(`${out}/${name}.png`,Buffer.from(data,'base64'));delete report.images;
 await page.waitForTimeout(250);await page.screenshot({path:out+'/all-decor.png'});
 assert.equal(report.skins,24);assert.equal(report.boards,8);assert.equal(report.effects.length,6);assert.equal(report.backgrounds,16);assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/cosmetics-report.json',JSON.stringify(report,null,2));console.log('PASS 192 skin/board combinations, 16 backgrounds, 13 decor objects, 6 emitted effects');
}finally{await browser.close();}
