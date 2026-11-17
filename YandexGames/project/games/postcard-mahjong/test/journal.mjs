import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';import {journalRewards} from '../src/journal-rewards.js';
const fixture={levels:{0:{stars:3,time:40}},postcards:{},weeklyCards:{},dailyWins:Object.fromEntries(['09','10','11','12'].map(d=>['2026-11-'+d,true])),dc:{},ach:{},stats:{},styles:['ivory'],best:0,postOffice:{day:'2026-11-15',counts:{boards:2,pairs:18,letters:3},claimed:{}}};
let r=journalRewards(fixture,'2026-11-15');assert.equal(r.total,5);assert.equal(r.mail,3);assert.equal(r.achievements,1);assert.deepEqual(r.weekly,['2026-11-09']);assert.equal(r.tabs.letters,0);
assert.equal(journalRewards(fixture,'2026-11-16').mail,0,'Yesterday’s postal tasks do not advertise a reward today');
fixture.weeklyCards['2026-11-09']={city:0};fixture.ach.first=1;fixture.postOffice.claimed={boards:true,pairs:true,letters:true};assert.equal(journalRewards(fixture,'2026-11-15').total,0);

const out='test-results/journal';fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome'}),errors=[],report=[];
try{
  for(const [width,height,locale,reducedMotion]of [[320,568,'ru-RU','no-preference'],[390,844,'ru-RU','no-preference'],[1280,800,'en-US','no-preference'],[844,390,'ru-RU','reduce']]){
    const p=await browser.newPage({viewport:{width,height},locale,reducedMotion});p.on('pageerror',e=>errors.push(e.message));
    await p.clock.setFixedTime(new Date('2026-11-15T12:00:00+03:00'));
    await p.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);await p.waitForFunction(()=>window.__PM_BOOT_DONE);
    await p.evaluate(()=>{
      const d=__save.data;d.coins=200;d.levels={0:{stars:3,time:40}};d.postcards={};d.ach={};d.stats={};d.weeklyCards={};
      d.dailyWins=Object.fromEntries(['09','10','11','12'].map(x=>['2026-11-'+x,true]));d.dc={};
      d.postOffice={day:'2026-11-15',counts:{boards:2,pairs:18,letters:3},claimed:{},tokens:[],stamps:{}};
      __game.ui.refresh();__game.ui.journal();__game.ui.ml.querySelector('.journalm').__identity='persistent';
    });
    assert.equal(await p.locator('.journal-tabs [data-jtab=home] .journal-tab-badge').textContent(),'5');
    assert.equal(await p.locator('.journal-tabs [data-jtab=mail] .journal-tab-badge').textContent(),'3');
    assert.equal(await p.locator('.journal-tabs [data-jtab=letters] .journal-tab-badge').count(),0);
    await p.screenshot({path:`${out}/ready-${width}.png`});
    const animation=await p.evaluate(()=>{const b=document.querySelector('.journal-tabs [data-jtab=mail]');b.click();return {count:document.querySelector('.journal-body').getAnimations().length,opacity:+getComputedStyle(document.querySelector('.journal-body')).opacity,height:document.querySelector('.journalm .mpanel').clientHeight};});
    assert.equal(await p.evaluate(()=>document.querySelector('.journalm').__identity),'persistent');
    assert.equal(animation.count,reducedMotion==='reduce'?0:1);
    if(reducedMotion!=='reduce'){assert.ok(animation.opacity<1);await p.waitForTimeout(260);assert.equal(await p.locator('.journal-body').evaluate(e=>+getComputedStyle(e).opacity),1);}
    assert.ok(await p.locator('.mpanel').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    assert.ok(await p.locator('.journal-tabs').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
    for(const id of ['boards','pairs','letters'])await p.locator(`[data-postal=${id}]`).click();
    assert.equal(await p.locator('.journal-tabs [data-jtab=mail] .journal-tab-badge').count(),0);
    assert.equal(await p.locator('.journal-tabs [data-jtab=home] .journal-tab-badge').textContent(),'2');
    assert.equal(await p.evaluate(()=>__save.data.coins),325);
    await p.locator('.journal-tabs [data-jtab=home]').click();await p.locator('[data-journal-ach]').click();await p.locator('[data-claim=first]').click();await p.locator('.achmodal [data-x]').click();
    assert.equal(await p.locator('.journal-tabs [data-jtab=home] .journal-tab-badge').textContent(),'1');
    await p.locator('[data-journal-week]').click();assert.equal(await p.evaluate(()=>__save.data.coins),495);
    assert.equal(await p.locator('.journal-tabs .journal-tab-badge').count(),0);assert.equal(await p.locator('[data-journal-week]').count(),0);
    const stableHeight=await p.locator('.journalm .mpanel').evaluate(e=>e.clientHeight);assert.ok(Math.abs(stableHeight-animation.height)<=1);
    await p.evaluate(()=>{for(const id of ['trips','letters','shelf','mail','home','letters'])document.querySelector('.journal-tabs [data-jtab='+id+']').click();});
    assert.equal(await p.locator('.journal-body').count(),1);assert.equal(await p.locator('.journal-tabs [aria-selected=true]').getAttribute('data-jtab'),'letters');
    await p.locator('.journal-tabs [data-jtab=home]').click();await p.locator('.journal-tabs [data-jtab=home]').focus();await p.keyboard.press('ArrowRight');
    assert.equal(await p.locator('.journal-tabs [aria-selected=true]').getAttribute('data-jtab'),'mail');
    assert.equal(await p.locator('.journal-tabs [data-jtab=mail]').evaluate(e=>e===document.activeElement),true);
    await p.screenshot({path:`${out}/claimed-${width}.png`});
    if(width===390){
      await p.evaluate(()=>{__game.ui.closeModal();__game.startLevel(0,false);__game.ui.closeModal();__game.ui.tutorial(0);__game.elapsed=55;__game.ui.journal();});
      const alive=await p.evaluate(()=>__game.game.alive.slice());
      await p.locator('.journal-tabs [data-jtab=trips]').click();await p.locator('.journal-tabs [data-jtab=shelf]').click();await p.waitForTimeout(320);
      assert.equal(await p.evaluate(()=>__game.elapsed),55);assert.deepEqual(await p.evaluate(()=>__game.game.alive.slice()),alive);assert.equal(await p.evaluate(()=>__game.ui.scr.inert),true);
    }
    report.push({width,height,locale,reducedMotion,badgesClaimOnce:true,panelStable:true,keyboard:true});await p.close();
  }
}finally{await browser.close();}
assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/report.json`,JSON.stringify({report,errors},null,2));console.log('PASS journal reward badges, claim once, stable tab transitions, rapid switching, keyboard and reduced motion');
