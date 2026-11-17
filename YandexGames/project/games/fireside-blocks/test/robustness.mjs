import{chromium}from'playwright';import path from'node:path';import{pathToFileURL}from'node:url';import assert from'node:assert/strict';
const b=await chromium.launch({channel:'chrome'});
const cases=[
 ['null level',{levels:{0:null,1:{stars:3},1000:{stars:3},2:{stars:-2}}}],
 ['broken settings and currency',{coins:'broken',best:-40,settings:[],boosts:{hint:-2},daily:'broken',challenge:'broken'}],
 ['broken collections',{styles:[null,'missing'],style:'missing',cosmetics:{boards:[null,'missing'],board:'missing',effects:['missing'],effect:'missing',claimed:null},trophies:[null,4]}],
 ['broken missions',{missions:{day:'TODAY',lines:10,items:10,wins:2,claimed:null},weekly:{key:'WEEK',stage:'broken',run:null}}],
 ['valid older progress',{coins:456,best:789,levels:{0:{stars:3},1:{stars:2}},styles:['painted','natural'],style:'natural',daily:{day:'2026-01-01',streak:4},settings:{music:false,sound:true}}],
];
try{for(const[name,data]of cases){
 const c=await b.newContext(),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(data=>{
  const d=new Date(),key=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),week=new Date(d);week.setDate(d.getDate()-(d.getDay()+6)%7);
  if(data.missions)data.missions.day=key(d);if(data.weekly)data.weekly.key=key(week);
  localStorage.setItem('fireside_blocks_save_v1',JSON.stringify(data));
 },data);
 await p.goto(pathToFileURL(path.resolve('dist-vk-single/index.html')).href);
 await p.waitForFunction(()=>window.__game?.ui||document.querySelector('#loader.failed'));
 assert.equal(await p.locator('#loader.failed').count(),0,name+' should load: '+errors.join(';'));
 await p.evaluate(()=>{__game.ui.daily();__game.ui.challenge();__game.ui.weekly();__game.ui.missions();__game.ui.styles();__game.ui.styles('boards');__game.ui.styles('effects');__game.ui.styles('album');__game.ui.settings();__game.toMenu();__game.startClassic(false);__game.toMenu();});
 const result=await p.evaluate(()=>({coins:__save.data.coins,stars:__save.stars(),style:__save.data.style}));assert(Number.isSafeInteger(result.coins)&&result.coins>=0,name+' coins');assert(Number.isSafeInteger(result.stars)&&result.stars>=0,name+' stars');
 if(name==='valid older progress'){assert.deepEqual(result,{coins:456,stars:5,style:'natural'});assert.equal(await p.evaluate(()=>__audio.musicOn),false,'legacy mute preserved');}
 assert.deepEqual(errors,[]);await c.close();console.log('PASS save robustness:',name);
}}finally{await b.close();}
