// Platform callbacks and pause guards without a browser or network.
import assert from 'node:assert/strict';
import { Board } from '../src/board.js';
import { sceneSVG, earnedCount, need } from '../src/garden.js';
import { SKINS, owns } from '../src/skins.js';
import { DICTS } from '../src/i18n.js';

globalThis.document = { hidden:false, documentElement:{ lang:'ru' } };
let callbacks;
globalThis.window = { YaGames:{ init:async()=>({
  environment:{i18n:{lang:'ru'}},on(){},getPlayer:async()=>null,
  features:{GameplayAPI:{start(){},stop(){}}},
  adv:{ showRewardedVideo:({callbacks:c})=>{callbacks=c;},showFullscreenAdv:({callbacks:c})=>{callbacks=c;} },
}) } };
const { sdk } = await import('../src/sdk.js');
await sdk.init();
let rewards=0,finished=0;
sdk.showRewarded(()=>rewards++,()=>finished++);
callbacks.onRewarded();callbacks.onClose();callbacks.onError();
assert.equal(rewards,1);assert.equal(finished,1);
sdk.platformPaused=true;sdk.gameplay(true);assert.equal(sdk.gameplayOn,false);
sdk.platformPaused=false;sdk.gameplay(true);assert.equal(sdk.gameplayOn,true);
sdk.showInterstitial(()=>finished++);callbacks.onClose();callbacks.onError();assert.equal(finished,2);
const blockedBoard={done:false,paused:false,app:{blocked:()=>true}};
for(const method of ['tapCell','tapDigit','input','erase','undo','hint','applyHint','toggleNotes']) {
  assert.doesNotThrow(()=>Board.prototype[method].call(blockedBoard,0),`${method} ignores input during platform pause`);
}
assert.equal(SKINS.length,14);
for(const skin of SKINS) { assert(owns({premium:true},skin.id)); assert(DICTS.RU['skin_'+skin.id]);assert(DICTS.EN['skin_'+skin.id]); }
assert.equal(earnedCount(need(3)),4);
const all=sceneSVG(0,48,-1,{artwork:true}),hidden=sceneSVG(0,48,-1,{artwork:true,hidden:[0]});
assert.equal((all.match(/class="it/g)||[]).length,12);
assert.equal((hidden.match(/class="it/g)||[]).length,11);
console.log('PASS: platform pause guards, duplicate ad callbacks, 14 skins, garden ownership.');
