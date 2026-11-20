import {save} from './save.js';
import {EXPANSIONS} from './world-data.js';
import {CHAPTERS} from './campaign.js';
const today=()=>new Date().toISOString().slice(0,10);
export function worldState(){
 const d=save.data;d.expansion=Math.min(5,Math.max(0,Math.floor(d.expansion)||0));
 if(!d.journal||typeof d.journal!=='object'||Array.isArray(d.journal))d.journal={};
 d.journal.chapters=Array.isArray(d.journal.chapters)?d.journal.chapters.filter(n=>Number.isInteger(n)&&n>=0&&n<20):[];
 if(!d.journal.daily||d.journal.daily.day!==today())d.journal.daily={day:today(),wins:0,cards:0,streak:0,claimed:[]};
 if(!Array.isArray(d.journal.daily.claimed))d.journal.daily.claimed=[];
 for(const key of ['wins','cards','streak'])if(!Number.isFinite(d.journal.daily[key])||d.journal.daily[key]<0)d.journal.daily[key]=0;
 return d.journal;
}
export const completedCount=()=>Object.keys(save.data.levels).filter(n=>+n<=1000).length;
export function chapterProgress(ch){let count=0,stars=0;for(let n=ch*50+1;n<=ch*50+50;n++){const l=save.data.levels[n];if(l){count++;stars+=l.stars;}}return {count,stars};}
export function nextExpansion(){return EXPANSIONS[save.data.expansion||0]||null;}
export function canExpand(){const e=nextExpansion();return !!e&&save.data.level>e.level&&save.stars()>=e.stars;}
export function expandWorld(){if(!canExpand())return false;const e=nextExpansion();save.data.starsSpent+=e.stars;save.data.expansion=e.id;save.write();return true;}
export function recordVoyageWin(cards,streak){const q=worldState().daily;q.wins++;q.cards+=Math.max(0,cards||0);q.streak=Math.max(q.streak,streak||0);}
export const TASKS=[
 {id:'wins',goal:3,coins:40,ru:'Выиграйте 3 партии',en:'Win 3 games'},
 {id:'cards',goal:60,coins:30,ru:'Уберите 60 карт',en:'Clear 60 cards'},
 {id:'streak',goal:8,coins:35,ru:'Соберите цепочку из 8 карт',en:'Build an 8-card streak'},
];
export function claimTask(id){const q=worldState().daily,t=TASKS.find(t=>t.id===id);if(!t||q.claimed.includes(id)||q[id]<t.goal)return 0;q.claimed.push(id);save.creditCoins(t.coins);save.write();return t.coins;}
export function claimChapter(ch){const j=worldState();if(!CHAPTERS[ch]||j.chapters.includes(ch)||chapterProgress(ch).count<50)return 0;j.chapters.push(ch);const coins=150+ch*15;save.creditCoins(coins);save.write();return coins;}
export function harvestReady(){return (save.data.stages.garden||0)>0&&save.data.wins-(save.data.harvestWins||0)>=3;}
export function harvest(){if(!harvestReady())return 0;const coins=25+save.data.stages.garden*10+(save.data.stages.orchard||0)*10;save.data.harvestWins=save.data.wins;save.creditCoins(coins);save.write();return coins;}
