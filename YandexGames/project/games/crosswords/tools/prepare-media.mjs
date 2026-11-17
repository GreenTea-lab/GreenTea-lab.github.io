import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
const out='deliverables/media-'+version;fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'}),errors=[];
const ctx=await browser.newContext({viewport:{width:600,height:1200},locale:'ru-RU',reducedMotion:'reduce'}),p=await ctx.newPage();
p.on('pageerror',e=>errors.push(e.message));
const url=pathToFileURL(path.resolve('dist-vk-single/index.html')).href;
try{
  await p.goto(url);await p.waitForFunction(()=>window.__app&&!document.querySelector('#boot'));
  const logo=await p.locator('.logo').evaluate(e=>e.outerHTML);
  await p.screenshot({path:out+'/01-menu-600x1200.png'});
  await p.evaluate(()=>{__app.save.data.tutDone=true;__app.openLevel(0);const g=__app.game,e=g.pz.entries[0];g.selectEntry(e.id,true);for(const i of e.cells)if(!g.pz.locked(i)){g.sel=i;g.type(g.pz.cells[i].ch);}});
  await p.waitForTimeout(800);await p.screenshot({path:out+'/02-classic-600x1200.png'});
  await p.evaluate(()=>__app.openLevel(150,'adult'));await p.waitForTimeout(400);await p.screenshot({path:out+'/03-scholars-600x1200.png'});
  await p.evaluate(()=>__app.openJournal('archive'));await p.screenshot({path:out+'/04-daily-archive-600x1200.png'});
  await p.setViewportSize({width:1280,height:720});await p.evaluate(()=>{__app.closeModal(true);__app.renderMenu();__app.show('menu');});await p.screenshot({path:out+'/cover-1280x720.png'});
  const fonts=['cyr','lat'].map(tag=>`@font-face{font-family:"PT Sans";font-weight:700;src:url(data:font/woff2;base64,${fs.readFileSync('static/ptsans-'+tag+'-700.woff2').toString('base64')})${tag==='cyr'?';unicode-range:U+0400-045F':''}}`).join('');
  await p.setContent(`<style>${fonts}*{box-sizing:border-box}body{margin:0;width:100vw;height:100vh;padding:4%;background:radial-gradient(at 15% 10%,#6ca88c,#1f6e5b 60%,#154438);display:grid;place-items:center}.frame{width:100%;height:100%;border-radius:15%;padding:10%;background:#fff9ed;box-shadow:inset 0 0 0 2px #c4a976,0 6px 0 #0f3a31;display:grid;place-items:center}.frame svg{width:100%;height:100%;filter:drop-shadow(0 5px 0 #a3947733)}</style><div class="frame">${logo}</div>`);
  await p.evaluate(()=>document.fonts.ready);
  for(const size of [576,512,278,150]){await p.setViewportSize({width:size,height:size});await p.screenshot({path:out+`/icon-${size}.png`});}
  if(errors.length)throw Error(errors.join('\n'));
  const files=fs.readdirSync(out).filter(f=>f.endsWith('.png')).map(file=>{const b=fs.readFileSync(out+'/'+file);return{file,width:b.readUInt32BE(16),height:b.readUInt32BE(20),bytes:b.length};});
  fs.writeFileSync(out+'/manifest.json',JSON.stringify({files,source:'Actual game screenshots; icon reuses the existing vector logo',errors},null,2));console.log('Media prepared:',files.length,'PNG files');
}finally{await browser.close();}
