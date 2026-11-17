import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {chromium} from 'playwright';
for(const file of ['src/game.js','src/ui.js','src/sdk.js','src/sdk_vk.js'])assert.ok(!/submitScore|getLeaderboard|getLeaderboards|setLeaderboardScore|\.leaderboards\./.test(fs.readFileSync(file,'utf8')),file+' must not access a public leaderboard');
const out='test-results/records';fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome'}),errors=[],report=[];
try{
 for(const [dir,w,h,locale]of [['dist-vk-single',390,844,'ru-RU'],['dist-single',1280,800,'en-US'],['dist-single',320,568,'ru-RU']]){
  const p=await browser.newPage({viewport:{width:w,height:h},locale});p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve(dir,'index.html')).href);await p.waitForFunction(()=>window.__PM_BOOT_DONE);
  await p.evaluate(()=>{
   window.recordRequests=[];__sdk.getLeaderboard=()=>{recordRequests.push('read');throw Error('Public leaderboard forbidden');};__sdk.submitScore=()=>{recordRequests.push('write');throw Error('Public leaderboard forbidden');};__sdk.login=()=>{recordRequests.push('login');throw Error('Leaderboard login forbidden');};
   __save.data.best=1200;__save.data.bestCalm=2400;__save.data.levels[0]={stars:3,time:40};__save.write(false);__game.ui.leaderboard();
  });
  assert.equal(await p.locator('.mhead b').textContent(),locale.startsWith('ru')?'Мои рекорды':'My records');assert.equal(await p.locator('[data-login],.lbr').count(),0);
  for(const [pace,score]of [['challenge',1800],['calm',2600],['challenge',600]])await p.evaluate(({pace,score})=>{__game.ui.closeModal();__game.setPace(pace);__game.startEndless(false);__game.E.score=score;__game.endEndless();__game.toMenu();},{pace,score});
  assert.deepEqual(await p.evaluate(()=>({normal:__save.data.best,calm:__save.data.bestCalm,requests:recordRequests})),{normal:1800,calm:2600,requests:[]});
  await p.reload();await p.waitForFunction(()=>window.__PM_BOOT_DONE);await p.locator('[data-a=lb]').click();
  assert.deepEqual(await p.evaluate(()=>({normal:__save.data.best,calm:__save.data.bestCalm,stars:__save.data.levels[0].stars})),{normal:1800,calm:2600,stars:3});
  assert.ok(await p.locator('.mpanel').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await p.screenshot({path:`${out}/personal-${w}.png`,animations:'disabled'});
  report.push({dir,w,h,locale,personalOnly:true,separateModes:true,persisted:true});await p.close();
 }
}finally{await browser.close();}
assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/report.json`,JSON.stringify({report,errors},null,2));console.log('PASS personal records only: no service calls/login, separate challenge/calm bests, persistence, preserved progress, RU/EN/mobile');
