import fs from'node:fs';import{chromium}from'playwright';import{ROOM_SCENES}from'../src/room-scenes.js';
const out='test-results/room-scenes';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try{for(const orientation of['wide','phone']){
 const page=await browser.newPage({viewport:{width:1280,height:900}}),cards=ROOM_SCENES.map(s=>({stars:s.stars,src:'data:image/webp;base64,'+fs.readFileSync('static/rooms/'+s.key+'-'+orientation+'.webp').toString('base64')}));
 await page.setContent('<html><body style="margin:0;background:#302417;color:#ffe8bf;font:16px Arial"><div id="grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px"></div></body></html>');
 await page.evaluate(({cards,orientation})=>{document.querySelector('#grid').innerHTML=cards.map(x=>'<div><img style="width:100%;height:'+(orientation==='wide'?205:420)+'px;object-fit:contain;display:block" src="'+x.src+'"><div style="padding:8px;text-align:center">'+x.stars+' ★</div></div>').join('');},{cards,orientation});
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await page.screenshot({path:out+'/contact-'+orientation+'.png',fullPage:true});await page.close();
}}finally{await browser.close();}
console.log('Prepared contact sheets for all 48 room images');
