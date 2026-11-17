import{chromium}from'playwright';import fs from'node:fs';import path from'node:path';import{pathToFileURL}from'node:url';import assert from'node:assert/strict';
const browser=await chromium.launch({channel:'chrome'}),mock=fs.readFileSync('test/mock/sdk.js','utf8'),out='test-results/personal-records';fs.mkdirSync(out,{recursive:true});
try{for(const build of ['dist-single','dist-vk-single'])for(const locale of ['ru-RU','en-US'])for(const[name,width,height]of[['desktop',1440,900],['phone',390,844],['small',320,568]]){
 const ctx=await browser.newContext({viewport:{width,height},locale,reducedMotion:'reduce'}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript({content:'window.__MOCK_LANG='+JSON.stringify(locale==='ru-RU'?'ru':'en')+';'+mock});
 await p.addInitScript(locale=>{
  window.__MOCK_LANG=locale==='ru-RU'?'ru':'en';
  if(!sessionStorage.getItem('personal-seeded')){sessionStorage.setItem('personal-seeded','1');const d=new Date(),day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');localStorage.setItem('fireside_blocks_save_v1',JSON.stringify({best:777,activity:{since:day,days:{[day]:[9,4,2,2,1,321,1]}},challenge:{claimed:day,completed:1,run:null}}));}
 },locale);
 await p.goto(pathToFileURL(path.resolve(build+'/index.html')).href);await p.waitForFunction(()=>__game?.ui&&!document.querySelector('#loader'));
 await p.evaluate(()=>__game.ui.settings());await p.locator('[data-a=lb]').click();assert.equal(await p.locator('.mhead>b').innerText(),locale==='ru-RU'?'Личные рекорды':'Personal records');
 assert.equal(await p.locator('[data-stat=classicBest]>b').innerText(),'321');assert.equal(await p.locator('.lbr,[data-login]').count(),0);
 await p.evaluate(()=>{__game.ui.closeModal();__game.startClassic(false);__game.st.game.score=888;__game.endClassic();__game.endClassic();__game.toMenu();__game.startLevel(0);document.querySelector('[data-go]').click();const A=__game;for(let n=0;n<100&&!A.finished;n++){const s=__plan(A.st.game,{beam:3})[0];if(!s)throw Error('No solution');A.placeAt(s.slot,s.x,s.y);}});await p.locator('.result').waitFor();
 await p.evaluate(()=>__game.ui.statistics('month'));assert.equal(await p.locator('[data-stat=classicBest]>b').innerText(),'888');
 const text=await p.locator('.modal').innerText();assert(!/Анна|Nobody here|Войти|Sign in|leaderboard/.test(text));
 assert.equal(await p.locator('.mhead').evaluate(e=>e.scrollWidth>e.clientWidth+1),false);
 const calls=await p.evaluate(()=>__calls);assert(calls.every(x=>!/^setScore|getEntries|auth/.test(x)),JSON.stringify(calls));
 if(locale==='ru-RU')await p.screenshot({path:`${out}/${build}-${name}.png`});
 await p.reload();await p.waitForFunction(()=>__game?.ui&&!document.querySelector('#loader'));await p.evaluate(()=>__game.ui.statistics());assert.equal(await p.locator('[data-stat=classicBest]>b').innerText(),'888');assert.equal(await p.evaluate(()=>__save.data.best),888);
 assert.deepEqual(errors,[]);await ctx.close();console.log('PASS private records, no rank calls, persistence:',build,locale,name);
}}finally{await browser.close();}
