// VK contracts in a JS VM with a mock bridge. This is not a live VK/browser test.
import {build} from 'esbuild';
import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const bundle=await build({entryPoints:['src/sdk_vk.js'],bundle:true,write:false,format:'cjs',platform:'browser',plugins:[{name:'mock-bridge',setup(b){
 b.onResolve({filter:/^@vkontakte\/vk-bridge$/},()=>({path:'bridge',namespace:'audit'}));
 b.onResolve({filter:/record-story\.js$/},()=>({path:'story',namespace:'audit'}));
 b.onLoad({filter:/.*/,namespace:'audit'},a=>({contents:a.path==='bridge'?'export default globalThis.auditBridge;':"export const createRecordStory=()=> 'data:image/png;base64,stub';"}));
}}]});
const values=new Map(),calls=[],events=[],warnings=[];let nativeReply=true,storyReply=true,failHead=false,holdNative=null,releaseNative;
const bridge={supportsAsync:async()=>true,subscribe:fn=>events.push(fn),send:async(method,p={})=>{
 calls.push({method,params:p});
 if(method==='VKWebAppStorageGet')return {keys:p.keys.map(key=>({key,value:values.get(key)||''}))};
 if(method==='VKWebAppStorageSet'){if(failHead&&p.key.endsWith('_n'))throw Error('Injected pointer write failure');values.set(p.key,p.value);return {result:true};}
 if(method==='VKWebAppCheckNativeAds')return {result:true};
 if(method==='VKWebAppShowNativeAds'){if(holdNative)return new Promise(r=>releaseNative=r);if(nativeReply instanceof Error)throw nativeReply;return {result:nativeReply};}
 if(method==='VKWebAppShowStoryBox'){if(storyReply instanceof Error)throw storyReply;return {result:storyReply};}
 return {result:true};
}};
function instance(){const module={exports:{}};const context={module,exports:module.exports,auditBridge:bridge,URLSearchParams,setTimeout,clearTimeout,Date,Event:class{},navigator:{language:'ru'},location:{protocol:'https:',search:'?vk_app_id=123&vk_language=ru&vk_platform=desktop_web'},window:{addEventListener(){}},document:{addEventListener(){},documentElement:{style:{setProperty(){}}}},console:{warn:(...x)=>warnings.push(x),log(){}}};vm.runInNewContext(bundle.outputFiles[0].text,context);return module.exports.sdk;}
const report={browserRun:false,bridge:'mock',canvasRendered:false,checks:[]};const pass=name=>{report.checks.push(name);console.log('PASS',name);};
const sdk=instance();await sdk.init();await new Promise(setImmediate);
assert.equal(calls.filter(c=>c.method==='VKWebAppInit').length,1);assert.equal(calls.some(c=>/ShowStory|ShowWall|Favorites/.test(c.method)),false);pass('startup does not publish or open social dialogs');
sdk.ads.reward=true;sdk.adsSupported=true;let rewards=0,done=0;holdNative=true;
sdk.showRewarded(()=>rewards++,()=>done++);sdk.showRewarded(()=>rewards++,()=>done++);await new Promise(setImmediate);
assert.equal(sdk.adActive,true);assert.equal(calls.filter(c=>c.method==='VKWebAppShowNativeAds').length,1);assert.equal(rewards,0);
releaseNative({result:true});await new Promise(setImmediate);assert.equal(rewards,1);assert.equal(done,2);assert.equal(sdk.adActive,false);holdNative=false;pass('held and repeated rewarded requests issue exactly one reward');
for(const result of [false,new Error('Injected ad failure')]){nativeReply=result;sdk.showRewarded(()=>rewards++);await new Promise(setImmediate);assert.equal(rewards,1);assert.equal(sdk.adActive,false);}pass('cancelled/failed ads give no reward and release pause');
const a={ts:1,coins:500,padding:'a'.repeat(5000)},b={ts:2,coins:600,padding:'b'.repeat(5000)};
await sdk.saveData(a,true);const head=values.get('hungry_sinkhole_v1_n');failHead=true;await sdk.saveData(b,true);assert.equal(values.get('hungry_sinkhole_v1_n'),head);
const reader=instance();reader.real=true;assert.equal((await reader.loadData()).coins,500);failHead=false;await sdk.saveData(b,true);assert.equal((await reader.loadData()).coins,600);pass('failed multipart save preserves the previous complete cloud snapshot');
await Promise.all([sdk.saveData({ts:3,coins:700},true),sdk.saveData({ts:4,coins:800},true)]);assert.equal((await reader.loadData()).coins,800);pass('concurrent cloud saves are serialized and preserve the newest snapshot');
for(const [answer,status]of [[true,'complete'],[false,'cancelled'],[new Error('Injected story failure'),'cancelled']]){storyReply=answer;const r=await sdk.shareRecord({pts:100});assert.equal(r.status,status);assert.equal(sdk.storyBusy,false);}
const story=calls.find(c=>c.method==='VKWebAppShowStoryBox').params;assert.equal(story.attachment.url,'https://vk.com/app123');assert.equal(story.background_type,'image');assert.equal(story.locked,true);pass('story editor is user-triggered, links to this app and handles cancellation');
sdk.ok=true;const count=calls.length;assert.equal((await sdk.shareRecord({pts:100})).status,'unavailable');assert.equal(calls.length,count);pass('unsupported social clients do not call the editor');
assert.equal(calls.some(c=>/ShowWallPostBox|AddToFavorites|GetLeaderboard/.test(c.method)),false);
report.expectedInjectedFailures=warnings.length;fs.mkdirSync('test-results/audit',{recursive:true});fs.writeFileSync('test-results/audit/sdk.json',JSON.stringify(report,null,2)+'\n');console.log('SDK CONTRACT AUDIT PASS',report.checks.length,'checks; no browser or VK network used');
