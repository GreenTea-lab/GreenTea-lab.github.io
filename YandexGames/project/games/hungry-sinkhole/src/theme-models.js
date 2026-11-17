import * as THREE from 'three';
import {B} from './model-builder.js';
import {THEME_NAMES,ROLES,themeId} from './theme-catalog.js';

const maps=Object.keys(THEME_NAMES);
const PALETTE=[
 [0x467756,0xd8b77d,0x41596b],[0x52aa9d,0xf4d89f,0x447b92],[0x567b89,0xc69c67,0x394957],[0x759eae,0xd5e0d8,0x384e65],
 [0x7facae,0xeaf5f5,0x54758b],[0x6b8061,0xb8a17a,0x645247],[0xef7867,0xffd66e,0x6b80c7],[0xb85762,0xe2c293,0x555868],
 [0x6f9d70,0xe7bd79,0x997453],[0x65a87d,0xcaddb0,0x658a89],[0x80a15d,0xe3ba68,0x957153],[0xd49043,0xf0ca73,0x8b6958],
 [0x9ca26d,0xd1a476,0x9c7565],[0xf2a3c4,0xffe0a0,0x8babc8],[0x8ab8c3,0xe4f3e7,0x557d8e],[0x9567c9,0x71e0df,0x353e67],
];
const metal=0x6e818c,wood=0x9b704d,cream=0xffe9b9,dark=0x33434a;
const box=(b,w,h,d,x,y,z,c,rx=0,ry=0,rz=0)=>b.box(w,h,d,x,y,z,c,0,rx,ry,rz);
const ball=(b,r,x,y,z,c,sx=1,sy=1,sz=1)=>b.ball(r,x,y,z,c,0,sx,sy,sz,6);
const ring=(b,r,t,x,y,z,c,rx=0,ry=0,rz=0)=>b.torus(r,t,x,y,z,c,0,rx,ry,rz,10);
const cyl=(b,r,h,x,y,z,c,rx=0,ry=0,rz=0)=>b.cyl(r,r,h,x,y,z,c,0,8,rx,ry,rz);
const cone=(b,r,h,x,y,z,c,seg=8)=>b.cone(r,h,x,y,z,c,0,seg);
function base(b,c,w=1.5,d=1.2){box(b,w,.18,d,0,.09,0,c);}
function pot(b,c){b.cyl(.65,.48,.65,0,.33,0,c,0,8);cyl(b,.66,.12,0,.66,0,cream);}
function trunk(b,c=wood){cyl(b,.11,1.4,0,.7,0,c);}
function canopy(b,c,y=1.7){ball(b,.65,0,y,0,c,1,.65,1);}
function petals(b,c,y=1.3,n=6){for(let k=0;k<n;k++){const a=k*Math.PI*2/n;ball(b,.27,Math.cos(a)*.48,y,Math.sin(a)*.48,c,1,.4,1);}ball(b,.25,0,y+.08,0,cream,1,.5,1);}
function spokes(b,c,y=1.5,n=6){for(let k=0;k<n;k++){const a=k*Math.PI*2/n;box(b,.13,.08,1.1,Math.sin(a)*.4,y,Math.cos(a)*.4,c,.25,a);}}
function chair(b,c){for(const x of [-.65,.65])for(const z of [-.45,.45])box(b,.12,.7,.12,x,.35,z,metal);box(b,1.6,.16,1.1,0,.8,0,c);}
function fence(b,c){for(const x of [-.85,.85]){box(b,.16,1.7,.16,x,.85,0,c);ball(b,.15,x,1.75,0,cream);}for(const y of [.45,1.25])box(b,1.75,.12,.12,0,y,0,c);}
function crate(b,c){box(b,1.6,1.25,1.3,0,.63,0,c);for(const x of [-.65,.65])box(b,.11,1.28,1.34,x,.64,0,cream);}
function stall(b,c){base(b,wood,1.8,1.4);box(b,1.7,.9,1.1,0,.64,0,wood);for(const x of [-.8,.8])box(b,.09,1.9,.09,x,1.05,-.45,c);box(b,1.95,.12,1.6,0,2,0,c);box(b,1.9,.12,1.4,0,1.14,0,cream);}
function badge(b,c,shape=0){if(shape===0)ball(b,.24,0,1.5,.22,c,1,1,.25);else if(shape===1)box(b,.42,.42,.08,0,1.5,.22,c,0,0,Math.PI/4);else ring(b,.22,.045,0,1.5,.22,c);}

// Every row is hand-shaped for its world, rather than a colour swap of one mesh.
const TREE=[
 (b,a)=>{trunk(b);for(const[x,y,z]of [[-.4,1.55,0],[.4,1.8,.1],[0,2.2,-.2]])ball(b,.56,x,y,z,a);},
 (b,a)=>{trunk(b);for(let k=0;k<7;k++){const t=k*Math.PI/6;box(b,.27,.08,1.4,Math.sin(t)*.45,1.9,Math.cos(t)*.45,a,.5,t);}ball(b,.2,0,1.65,0,wood);},
 (b,a)=>{trunk(b);for(let k=0;k<3;k++){box(b,1.1,.09,.12,.18*k,1.05+k*.4,0,wood);canopy(b,a,1.2+k*.4);}},
 (b,a)=>{base(b,metal,.8,.8);trunk(b,metal);box(b,.9,1.3,.9,0,1.45,0,a);box(b,.6,.5,.6,0,2.3,0,a);},
 (b,a,c)=>{trunk(b);for(let k=0;k<4;k++){cone(b,.85-k*.16,.9,0,.8+k*.43,0,a);cone(b,.86-k*.16,.27,0,1.08+k*.43,0,c);}},
 (b,a)=>{trunk(b);for(const x of [-.35,.35])box(b,.12,.7,.12,x,1.35,0,wood,0,0,-x);for(const x of [-.5,0,.5])ball(b,.58,x,1.8,0,a,1,.8,1);},
 (b,a,c)=>{trunk(b);for(let k=0;k<5;k++)ball(b,.42-k*.04,Math.sin(k*1.7)*.35,1+k*.27,Math.cos(k*1.7)*.35,k%2?a:c);cone(b,.13,.4,0,2.5,0,c);},
 (b,a)=>{trunk(b);for(let k=0;k<3;k++){box(b,1,.08,.16,0,1.05+k*.4,0,wood);ball(b,.65,.2-k*.16,1.3+k*.4,0,a,1,.35,1);}},
 (b,a,c)=>{trunk(b);spokes(b,a,1.85,9);for(const x of [-.2,.2]){ball(b,.16,x,1.6,.12,c,1,1.6,1);ball(b,.15,x,1.4,.12,c,1,1.5,1);}},
 (b,a)=>{trunk(b);for(let k=0;k<3;k++)spokes(b,a,1.1+k*.4,6);for(let k=0;k<5;k++)ring(b,.12,.02,0,.25+k*.2,0,cream,Math.PI/2);},
 (b,a,c)=>{trunk(b);canopy(b,a);for(let k=0;k<7;k++){const t=k*2.4;ball(b,.11,Math.cos(t)*.6,1.5+(k%3)*.2,Math.sin(t)*.6,c);}},
 (b,a,c)=>{trunk(b);for(let k=0;k<5;k++){const t=k*1.3;ball(b,.55,Math.cos(t)*.32,1.4+k*.18,Math.sin(t)*.32,k%2?a:c,1,.35,1);}},
 (b,a)=>{trunk(b);for(const x of [-.4,.4]){box(b,.12,.8,.12,x,1.25,0,wood,0,0,-x);spokes(b,a,1.6,5);}spokes(b,a,2.05,5);},
 (b,a,c)=>{trunk(b,c);for(const x of [-.4,0,.4]){ball(b,.5,x,1.6+(.4-Math.abs(x)),0,a);ring(b,.5,.07,x,1.6+(.4-Math.abs(x)),0,cream,Math.PI/2);}},
 (b,a,c)=>{trunk(b,c);for(const x of [-.65,-.3,.3,.65]){box(b,.06,.8,.06,x,1.25+(.65-Math.abs(x))*.4,0,a);ball(b,.17,x,.9+(.65-Math.abs(x))*.4,0,c,1,2,1);}},
 (b,a,c)=>{trunk(b,metal);for(let k=0;k<4;k++){box(b,1.2-k*.18,.08,.08,0,1+k*.4,0,c);for(const x of [-1,1])box(b,.08,.25,.25,x*(.6-k*.09),1.12+k*.4,0,a);}ring(b,.35,.04,0,2.4,0,c,Math.PI/2);},
];
const PLANT=[
 (b,a,c)=>{base(b,c);for(const x of [-.4,0,.4])ball(b,.35,x,.4,0,a);},
 (b,a,c)=>{pot(b,c);for(const x of [-.4,0,.4])cone(b,.16,.9,x,.95,0,a);},
 (b,a,c)=>{pot(b,c);for(let k=0;k<4;k++)box(b,.15,1,.09,(k-1.5)*.2,1.1,0,a,0,0,(k-1.5)*.2);},
 (b,a,c)=>{base(b,c);for(const x of [-.45,0,.45])cone(b,.2,.9,x,.6,0,a,4);},
 (b,a,c)=>{pot(b,a);petals(b,c,1,5);for(const x of [-.3,.3])cone(b,.1,.8,x,.8,0,c);},
 (b,a,c)=>{box(b,1.5,.45,1,0,.23,0,c);for(const x of [-.5,0,.5]){cyl(b,.04,.7,x,.6,0,a);ball(b,.25,x,.95,0,a);}},
 (b,a,c)=>{pot(b,c);for(let k=0;k<3;k++){cyl(b,.04,.8,(k-1)*.4,.9,0,a);ball(b,.23,(k-1)*.4,1.3,0,k%2?a:c);}},
 (b,a,c)=>{cyl(b,.75,.2,0,.1,0,c);petals(b,a,.4,7);},
 (b,a,c)=>{pot(b,c);for(let k=0;k<8;k++)box(b,.15,.7,.13,Math.sin(k)*.25,.9,Math.cos(k)*.25,a,Math.sin(k)*.5,0,Math.cos(k)*.5);},
 (b,a,c)=>{cyl(b,.8,.15,0,.1,0,c);for(const x of [-.35,.35])ball(b,.45,x,.25,0,a,1,.15,1);petals(b,0xe68aa9,.5,5);},
 (b,a,c)=>{box(b,1.5,.35,.95,0,.17,0,c);for(const x of [-.45,0,.45]){ball(b,.3,x,.5,0,a);ring(b,.2,.05,x,.55,.1,cream);}},
 (b,a,c)=>{pot(b,c);for(const x of [-.3,.3]){cyl(b,.08,.4,x,.85,0,cream);ball(b,.35,x,1.05,0,a,1,.5,1);}},
 (b,a,c)=>{base(b,c);for(const x of [-.4,.1,.4])ball(b,.28,x,.35,0,a,1,1.4,1);cone(b,.1,.7,0,.55,0,cream);},
 (b,a,c)=>{pot(b,c);for(const x of [-.35,.35]){cone(b,.22,.6,x,.95,0,a);ball(b,.13,x,1.3,0,cream);}},
 (b,a,c)=>{base(b,a);for(const x of [-.4,0,.4])cone(b,.24,.75,x,.5,0,c,5);},
 (b,a,c)=>{base(b,dark);for(let k=0;k<6;k++)box(b,.18,.6,.18,Math.sin(k)*.4,.45,Math.cos(k)*.4,k%2?a:c,0,0,Math.sin(k)*.6);ball(b,.23,0,.7,0,c);},
];
const LIGHT=[
 (b,a,c)=>{trunk(b,dark);box(b,.55,.6,.5,0,1.75,0,cream);cone(b,.5,.35,0,2.2,0,a,4);},
 (b,a,c)=>{trunk(b,a);box(b,.65,.08,.1,.25,1.85,0,a);ring(b,.2,.04,.5,1.65,0,c);ball(b,.18,.5,1.45,0,cream);},
 (b,a,c)=>{trunk(b,dark);for(const x of [-.4,.4]){box(b,.12,.45,.12,x,1.55,0,c);ball(b,.22,x,1.85,0,cream);}box(b,1,.1,.12,0,1.35,0,a);},
 (b,a,c)=>{for(const x of [-.3,0,.3])cyl(b,.09,1.8-Math.abs(x),x,1-Math.abs(x)/2,0,cream);base(b,a);},
 (b,a,c)=>{trunk(b,a);for(let k=0;k<3;k++)box(b,.08,.95,.08,0,1.8,0,c,0,0,k*Math.PI/3);ball(b,.2,0,1.8,0,cream);},
 (b,a,c)=>{trunk(b,c);b.cyl(.6,.25,.4,0,1.6,0,dark,0,8);for(const x of [-.25,0,.25])cone(b,.16,.65,x,2,0,x?a:0xffb65a);},
 (b,a,c)=>{trunk(b,a);ring(b,.55,.08,0,1.85,0,c);for(let k=0;k<8;k++)ball(b,.09,Math.cos(k*Math.PI/4)*.55,1.85+Math.sin(k*Math.PI/4)*.55,0,cream);},
 (b,a,c)=>{trunk(b,wood);box(b,.6,.06,.1,.25,1.8,0,wood);ball(b,.35,.5,1.5,0,a,1,1.2,1);for(const y of [1.25,1.75])cyl(b,.28,.06,.5,y,0,c);},
 (b,a,c)=>{trunk(b,c);b.cyl(.36,.22,.7,0,1.6,0,cream,0,6);cone(b,.45,.3,0,2.1,0,c,6);ring(b,.15,.035,0,2.35,0,c);},
 (b,a,c)=>{trunk(b,a);petals(b,c,1.8,6);ball(b,.25,0,1.95,0,cream);},
 (b,a,c)=>{trunk(b,wood);for(let k=0;k<4;k++)box(b,.16,.9,.05,0,1.75,0,c,0,0,k*Math.PI/2+.4);ball(b,.16,0,1.75,.1,cream);},
 (b,a,c)=>{trunk(b,wood);ball(b,.43,0,1.7,0,a,1,.8,1);box(b,.2,.3,.08,0,1.7,.38,cream);ring(b,.16,.04,0,2.1,0,c);},
 (b,a,c)=>{trunk(b,dark);box(b,.7,.55,.4,0,1.7,0,c);box(b,.52,.3,.08,0,1.75,.25,cream);box(b,.8,.12,.6,0,2.04,0,a);},
 (b,a,c)=>{trunk(b,c);for(const x of [-.35,.35]){ball(b,.27,x,1.7,0,a);box(b,.09,.5,.09,x,1.3,0,cream);}ring(b,.4,.05,0,2.1,0,c);},
 (b,a,c)=>{trunk(b,a);box(b,.9,.08,.08,0,1.8,0,a);for(const x of [-.4,.4]){cone(b,.22,.5,x,1.4,0,c,6);ball(b,.16,x,1.55,0,cream);}},
 (b,a,c)=>{base(b,dark);for(const x of [-.35,.35]){box(b,.1,2,.1,x,1,0,c);box(b,.5,.1,.1,0,1.8,0,a);}box(b,.1,.8,.1,0,1.1,0,a,0,0,.4);},
];
const BARRIER=[
 (b,a,c)=>{fence(b,a);for(const x of [-.45,0,.45])box(b,.07,1.1,.08,x,.9,0,dark);},
 (b,a,c)=>{for(const x of [-.85,.85])cyl(b,.12,1.6,x,.8,0,c);for(let k=0;k<5;k++)ball(b,.14,(k-2)*.36,1.1-Math.abs(k-2)*.13,0,a);},
 (b,a,c)=>{fence(b,metal);for(const x of [-.55,.55])ring(b,.25,.07,x,.85,0,c);},
 (b,a,c)=>{for(const x of [-.85,.85])box(b,.14,1.5,.14,x,.75,0,metal);box(b,1.7,.65,.07,0,.85,0,a);box(b,1.8,.07,.1,0,1.25,0,c);},
 (b,a,c)=>{for(let k=0;k<5;k++){box(b,.22,.9+(k%2)*.35,.16,(k-2)*.4,.55,0,a);cone(b,.16,.25,(k-2)*.4,1.12+(k%2)*.17,0,c,4);}},
 (b,a,c)=>{for(let k=0;k<5;k++){box(b,.12,1.6,.12,(k-2)*.4,.8,0,dark);cone(b,.14,.25,(k-2)*.4,1.7,0,c,4);}box(b,1.9,.16,.15,0,.6,0,a);},
 (b,a,c)=>{fence(b,a);for(const x of [-.5,0,.5])ball(b,.15,x,1.27,0,c);box(b,1.3,.08,.1,0,.85,0,cream);},
 (b,a,c)=>{for(const x of [-.85,.85])box(b,.12,1.4,.12,x,.7,0,dark);for(let k=0;k<3;k++)box(b,1.8,.06,.1,0,.4+k*.4,0,wood);box(b,.12,1.4,.12,0,.7,0,a);},
 (b,a,c)=>{for(let k=0;k<5;k++){box(b,.3,1.1,.12,(k-2)*.4,.55,0,c);box(b,.2,.2,.14,(k-2)*.4,1.1,0,a,0,0,Math.PI/4);}},
 (b,a,c)=>{fence(b,a);for(const x of [-.5,0,.5])ring(b,.23,.035,x,.9,0,c);},
 (b,a,c)=>{for(const x of [-.85,.85])box(b,.14,1.5,.14,x,.75,0,wood);for(const r of [-.55,.55])box(b,1.8,.12,.12,0,.75,0,c,0,0,r);},
 (b,a,c)=>{fence(b,wood);for(const x of [-.5,0,.5])box(b,.27,.2,.06,x,.75,0,a,0,0,x);},
 (b,a,c)=>{for(let k=0;k<4;k++)box(b,.35,.8+(k%2)*.3,.18,(k-1.5)*.5,.5,0,c,0,0,.08*(k-2));box(b,1.9,.12,.14,0,.6,0,a);},
 (b,a,c)=>{for(const x of [-.8,.8]){cyl(b,.13,1.4,x,.7,0,c);ball(b,.2,x,1.5,0,a);}for(let k=0;k<4;k++)ring(b,.22,.06,(k-1.5)*.45,.9,0,a);},
 (b,a,c)=>{for(let k=0;k<5;k++)cone(b,.15,1.1+(k%2)*.4,(k-2)*.4,.7,0,c,5);box(b,1.9,.1,.12,0,.5,0,a);},
 (b,a,c)=>{fence(b,dark);for(const y of [.55,.9,1.25])box(b,1.7,.045,.05,0,y,0,c);for(const x of [-.4,.4])box(b,.06,.7,.06,x,.9,0,a,0,0,.5);},
];
function buildBorder(b,i,a,c){
 const shapes=['brick','shell','rope','planter','snow','stone','bulb','bamboo','arch','leaf','log','basket','rock','cookie','ice','tube'];
 base(b,c,1.9,1);const s=shapes[i];
 for(let k=0;k<5;k++){const x=(k-2)*.36;
  if(['brick','stone','cookie'].includes(s)){box(b,.32,.45,.75,x,.4,0,a);if(s==='cookie')for(const z of [-.2,.2])ball(b,.045,x,.65,z,wood);}
  else if(['shell','leaf','snow','basket'].includes(s))ball(b,.3,x,.4,0,a,.7,s==='leaf'?1.5:.8,1);
  else if(['bamboo','log','tube','bulb'].includes(s)){cyl(b,.11,.6+(k%2)*.2,x,.45,0,a);ball(b,.14,x,.8+(k%2)*.2,0,c);}
  else if(['rock','ice'].includes(s))cone(b,.25,.7+(k%2)*.3,x,.55,0,a,5);
  else if(s==='arch')ring(b,.21,.07,x,.5,0,a);
  else if(s==='rope')ring(b,.2,.06,x,.55,0,a);
  else {box(b,.28,.3,.75,x,.4,0,a);ball(b,.2,x,.65,0,c);}
  if(i===1)for(const z of [-.2,0,.2])box(b,.035,.2,.06,x,.6,z,c,0,0,z*2);
  if(i===4)cone(b,.2,.25,x,.65,0,c,6);
  if(i===5)box(b,.17,.18,.75,x,.72,0,c);
  if(i===6)cone(b,.12,.22,x,.9,0,c,4);
  if(i===7)for(const y of [.3,.55,.8])ring(b,.12,.025,x,y,0,c,Math.PI/2);
  if(i===10)cyl(b,.08,.6,x,.35,.35,wood,Math.PI/2);
  if(i===11)box(b,.05,.4,.5,x,.42,0,wood,0,0,.3);
  if(i===15)box(b,.045,.65,.05,x,.55,.12,c);
 }
 if(i===2)box(b,1.9,.07,.07,0,.8,0,wood);
 if(i===14)for(const x of [-.55,-.18,.18,.55])cone(b,.12,.45,x,.35,.3,c,4);
}
function buildMarker(b,i,a,c){
 base(b,i===14?c:metal,.7,.7);
 if([0,3,15].includes(i)){box(b,.45,1.2,.45,0,.7,0,a);if(i===3)box(b,.3,.6,.05,0,.9,.25,c);else if(i===15){ring(b,.32,.07,0,1.4,0,c,Math.PI/2);box(b,.06,.9,.05,0,.8,.25,c);}else cone(b,.35,.35,0,1.5,0,c,4);}
 else if([1,2,14].includes(i)){cyl(b,.19,1.1,0,.65,0,a);if(i===1)ring(b,.32,.08,0,1.15,0,c);if(i===2)box(b,.85,.2,.25,0,1.15,0,c);if(i===14)cone(b,.37,.55,0,1.2,0,c,5);}
 else if([4,12].includes(i)){cone(b,.4,1.4,0,.8,0,a,i===4?6:5);ring(b,.27,.035,0,.65,0,c,Math.PI/2);}
 else if(i===5){box(b,.6,1,.6,0,.6,0,c);for(const x of [-.2,.2])box(b,.15,.25,.6,x,1.2,0,a);}
 else if(i===6){cyl(b,.2,1.1,0,.65,0,a);ball(b,.35,0,1.4,0,c);}
 else if(i===7){box(b,.5,1.2,.5,0,.7,0,c);box(b,.3,.45,.05,0,.95,.28,cream);box(b,.7,.16,.65,0,1.4,0,a);}
 else if(i===8){b.cyl(.3,.5,.9,0,.55,0,c,0,6);cone(b,.36,.5,0,1.25,0,a,6);}
 else if(i===9){cyl(b,.2,.9,0,.55,0,a);petals(b,c,1.1,5);}
 else if(i===10){box(b,.55,1,.55,0,.6,0,wood);box(b,.65,.08,.6,0,.9,0,c);ball(b,.25,0,1.3,0,a);}
 else if(i===11){ball(b,.45,0,.5,0,a);cyl(b,.08,.3,0,1,0,wood);box(b,.12,.25,.07,0,.6,.42,c);}
 else if(i===13){cyl(b,.25,.9,0,.55,0,c);ball(b,.38,0,1.1,0,a);for(const x of [-.2,.2])ball(b,.06,x,1.3,.2,cream);}
}
function buildSeat(b,i,a,c){
 chair(b,i===10?wood:c);
 if(i===1){box(b,1.6,.12,.8,0,1.1,-.3,a,-.6);box(b,1.6,.05,.3,0,.92,.35,cream);}
 else if(i===2){for(const x of [-.75,.75])ring(b,.3,.08,x,1.1,0,a,0,Math.PI/2);box(b,1.5,.35,.12,0,1.2,-.5,c);}
 else if(i===3){box(b,1.6,.65,.1,0,1.2,-.5,a);box(b,1.65,.08,.12,0,1.55,-.5,metal);}
 else if(i===4){ball(b,.6,0,.9,-.2,c,1.4,.5,1);box(b,1.7,.55,.12,0,1.3,-.5,a);}
 else if(i===5){for(const x of [-.65,.65])box(b,.2,.75,.2,x,1.1,-.45,c);box(b,1.6,.4,.16,0,1.2,-.5,a);}
 else if(i===6){for(const x of [-.7,.7])ball(b,.24,x,1.3,0,a);box(b,1.5,.5,.12,0,1.2,-.5,c);}
 else if(i===7){for(let k=0;k<4;k++)cyl(b,.06,1.6,0,1+k*.18,-.45,a,0,0,Math.PI/2);}
 else if(i===8){box(b,1.6,.35,.1,0,1.08,-.5,a);for(const x of [-.5,0,.5])box(b,.25,.05,.95,x,.9,0,c);}
 else if(i===9){for(const x of [-.5,0,.5])ball(b,.36,x,1.2,-.45,a,1,1,.3);}
 else if(i===10){for(const x of [-.5,0,.5])box(b,.3,.4,.12,x,1.2,-.5,a,0,0,.15*x);}
 else if(i===11){for(const x of [-.55,0,.55])ball(b,.25,x,1.2,-.45,a,1,1.4,.3);}
 else if(i===12){box(b,1.6,.35,.4,0,1.2,-.45,c);for(const x of [-.6,.6])cone(b,.18,.4,x,1.55,-.45,a,5);}
 else if(i===13){box(b,1.6,.45,.2,0,1.2,-.5,a);for(const x of [-.55,0,.55])ball(b,.13,x,1.4,-.35,cream);}
 else if(i===14){for(const x of [-.65,.65])cone(b,.22,.9,x,1,-.45,a,5);box(b,1.5,.35,.16,0,1.15,-.5,c);}
 else if(i===15){box(b,1.6,.45,.1,0,1.2,-.5,dark);for(const y of [1.05,1.35])box(b,1.5,.05,.05,0,y,-.42,c);}
 else {for(const y of [1.05,1.35])box(b,1.6,.18,.12,0,y,-.5,a);}
}
function buildCargo(b,i,a,c){
 if(i===1){box(b,1.5,.6,1,0,.3,0,c);for(const x of [-.5,0,.5])ball(b,.23,x,.8,0,a);}
 else if(i===2){crate(b,a);for(const y of [.3,.7,1.1])box(b,1.64,.08,1.34,0,y,0,metal);}
 else if(i===3){box(b,1.5,1.1,1.2,0,.55,0,a);box(b,.6,.6,.05,0,.7,.63,c);for(const x of [-.55,.55])box(b,.1,1.1,.08,x,.55,.65,metal);}
 else if(i===4){crate(b,a);box(b,1.7,.18,1.4,0,1.35,0,c);cone(b,.18,.4,0,1.6,0,c,6);}
 else if(i===5){box(b,1.5,.8,1.1,0,.4,0,wood);b._add(new THREE.CylinderGeometry(.55,.55,1.5,8,1,false,0,Math.PI),a,0,0,.8,0,0,0,Math.PI/2);box(b,.3,.35,.08,0,.8,.6,c);}
 else if(i===6){box(b,1.5,.9,1.2,0,.45,0,a);for(const x of [-.5,0,.5])box(b,.2,.95,1.24,x,.48,0,c);ball(b,.2,0,1.15,0,c);}
 else if(i===7){cyl(b,.65,1.1,0,.55,0,wood);for(const y of [.2,.8])ring(b,.66,.06,0,y,0,a,Math.PI/2);box(b,.4,.5,.05,0,.6,.65,c);}
 else if(i===8){for(const x of [-.4,.4]){b.cyl(.25,.4,.6,x,.3,0,c,0,8);b.cyl(.23,.12,.35,x,.75,0,a,0,8);}}
 else if(i===9){box(b,1.5,.7,1.1,0,.35,0,c);for(const x of [-.45,0,.45])ball(b,.28,x,.8,0,a,1,1.3,1);}
 else if(i===10){crate(b,wood);for(const x of [-.5,0,.5])ball(b,.25,x,1.3,0,a);}
 else if(i===11){box(b,1.5,.65,1.1,0,.33,0,wood);for(const x of [-.45,.45])ball(b,.35,x,.9,0,a);for(const z of [-.4,.4])box(b,1.55,.07,.07,0,.75,z,c);}
 else if(i===12){for(const x of [-.4,.4]){box(b,.5,.7,.7,x,.35,0,c);cone(b,.27,.5,x,.95,0,a,5);}}
 else if(i===13){crate(b,c);for(const x of [-.55,0,.55])box(b,.18,1.3,1.34,x,.65,0,a);ball(b,.24,0,1.5,0,a);}
 else if(i===14){box(b,1.5,.8,1.2,0,.4,0,a);box(b,1.6,.15,1.3,0,.9,0,c);for(const x of [-.5,.5])box(b,.2,.25,.1,x,.55,.65,dark);}
 else if(i===15){crate(b,dark);for(const y of [.25,.6,1])box(b,1.65,.05,1.34,0,y,0,c);badge(b,a,1);}
 else {crate(b,c);box(b,.5,.4,.05,0,.8,.69,a);}
}
function buildCanopy(b,i,a,c){
 trunk(b,i===3||i===15?metal:wood);
 if([1,8,10].includes(i)){cone(b,1,.5,0,1.8,0,c,i===1?8:6);if(i===8)cone(b,.18,.45,0,2.2,0,a);if(i===10)spokes(b,a,1.6,6);}
 else if(i===2){for(const x of [-.7,.7])box(b,.08,1.5,.08,x,.75,0,metal);box(b,1.9,.2,1.5,0,1.6,0,a,.2);ring(b,.25,.06,0,1.3,.7,c);}
 else if(i===3){box(b,1.9,.15,1.5,0,1.8,0,a);box(b,1.5,.4,.08,0,1.5,-.65,c);}
 else if(i===4){cone(b,1,.6,0,1.8,0,a,6);for(const x of [-.65,0,.65])cone(b,.09,.35,x,1.4,.6,c,5);}
 else if(i===5){cone(b,1,.9,0,1.8,0,a,4);box(b,.12,.8,.12,0,2.4,0,c);box(b,.5,.3,.06,.2,2.6,0,c);}
 else if(i===6){cone(b,1,.8,0,1.7,0,a,10);for(let k=0;k<8;k++)ball(b,.12,Math.sin(k)*.85,1.35,Math.cos(k)*.85,c);}
 else if(i===7){cone(b,1,.3,0,1.75,0,a,12);cyl(b,.15,.15,0,2,0,c);spokes(b,c,1.65,6);}
 else if(i===9){for(let k=0;k<5;k++)ball(b,.58,Math.sin(k*1.26)*.5,1.75,Math.cos(k*1.26)*.5,a,1,.2,1);}
 else if(i===11){for(let k=0;k<6;k++)box(b,.7,.08,1,Math.sin(k)*.45,1.8,Math.cos(k)*.45,k%2?a:c,.15,k);}
 else if(i===12){for(const x of [-.7,.7])box(b,.1,1.5,.1,x,.75,0,wood);box(b,1.9,.15,1.5,0,1.6,0,c,-.2);cone(b,.2,.5,0,1.95,0,a,5);}
 else if(i===13){ball(b,1,0,1.7,0,a,1,.35,1);for(let k=0;k<8;k++)ball(b,.12,Math.sin(k)*.8,1.9,Math.cos(k)*.8,c);}
 else if(i===14){cone(b,1,.65,0,1.7,0,c,5);ring(b,.4,.05,0,2.05,0,a,Math.PI/2);}
 else if(i===15){box(b,1.7,.08,1.7,0,1.7,0,dark);for(const x of [-.75,.75])box(b,.06,.06,1.7,x,1.77,0,c);box(b,1.7,.06,.06,0,1.77,.75,a);}
 else {cone(b,1,.4,0,1.7,0,a,8);cyl(b,.6,.1,0,.7,0,c);}
}
const FEATURE=[
 (b,a,c)=>{base(b,c);box(b,1,.8,.6,0,.6,0,a);ring(b,.45,.1,0,1.5,0,metal);box(b,.08,.5,.08,0,1.5,.08,dark);},
 (b,a,c)=>{base(b,c);box(b,1,.22,1,0,.4,0,a);for(const x of [-.5,.5])box(b,.1,1.1,.1,x,.8,0,wood);box(b,1.5,.15,.7,0,1.4,0,c,.2);},
 (b,a,c)=>{base(b,metal);box(b,.25,1.5,.25,-.4,.9,0,a);box(b,1.4,.2,.3,.1,1.6,0,a);box(b,.06,.8,.06,.6,1.2,0,metal);ring(b,.22,.06,.6,.7,0,c);},
 (b,a,c)=>{base(b,metal);box(b,1,1.4,.4,0,.9,0,dark);box(b,.8,1,.05,0,1,.25,a);for(const y of [.75,1,1.25])box(b,.55,.04,.05,0,y,.3,c);},
 (b,a,c)=>{base(b,c);for(const x of [-.45,0,.45])cone(b,.3,1.3-Math.abs(x),x,.8,0,a,5);ring(b,.3,.07,0,1.6,0,c);},
 (b,a,c)=>{base(b,c);cyl(b,.4,1,0,.7,0,a);for(let k=0;k<4;k++)box(b,.25,.3,.25,Math.sin(k*Math.PI/2)*.35,1.35,Math.cos(k*Math.PI/2)*.35,c);cone(b,.45,.5,0,1.8,0,a,4);},
 (b,a,c)=>{base(b,c);trunk(b);ring(b,.7,.13,0,1.4,0,a);for(let k=0;k<6;k++)ball(b,.17,Math.sin(k*1.05)*.7,1.4+Math.cos(k*1.05)*.7,0,c);},
 (b,a,c)=>{base(b,c);for(const x of [-.55,.55])box(b,.12,1.6,.12,x,.9,0,wood);box(b,1.6,.14,.18,0,1.8,0,a);box(b,1.3,.1,.15,0,1.5,0,a);},
 (b,a,c)=>{base(b,c);b.cyl(.35,.55,.9,0,.65,0,a,0,8);b.cyl(.18,.3,.5,0,1.35,0,c,0,8);ring(b,.3,.06,0,1.6,0,c);},
 (b,a,c)=>{base(b,c);for(const x of [-.45,.45])ball(b,.5,x,.9,0,a,1,1.3,1);ring(b,.7,.06,0,1.1,0,metal);ball(b,.15,0,1.7,0,cream);},
 (b,a,c)=>{base(b,wood);box(b,.7,1,.7,0,.7,0,c);cone(b,.65,.5,0,1.45,0,a,4);for(let k=0;k<4;k++)box(b,.15,1,.05,0,1.7,.35,c,0,0,k*Math.PI/2+.3);},
 (b,a,c)=>{base(b,c);for(const x of [-.45,0,.45])ball(b,.35,x,.6,0,a);for(const x of [-.55,.55])box(b,.12,1,.12,x,1.2,0,wood);box(b,1.5,.35,.1,0,1.6,0,c);},
 (b,a,c)=>{base(b,c);for(const x of [-.5,.5])cone(b,.35,1.7,x,.9,0,a,5);box(b,1.4,.16,.25,0,1.6,0,c);ring(b,.23,.07,0,1.3,.1,metal);},
 (b,a,c)=>{base(b,c);ball(b,.7,0,.8,0,a);cone(b,.3,.6,0,1.6,0,cream);ball(b,.15,0,2,0,c);},
 (b,a,c)=>{base(b,a);box(b,.7,1.2,.7,0,.8,0,c);cone(b,.6,.5,0,1.65,0,a,6);for(const x of [-.2,.2])box(b,.15,.25,.05,x,1,.38,dark);},
 (b,a,c)=>{base(b,dark);for(const x of [-.5,.5])box(b,.12,1.6,.12,x,.9,0,a,0,0,-x*.5);ring(b,.55,.09,0,1.3,0,c);ball(b,.2,0,1.3,0,a);},
];
function buildStall(b,i,a,c){
 stall(b,a);
 if([1,4,8,12].includes(i))cone(b,1.2,.65,0,2.3,0,c,i===8?6:4);
 else if([5,7,10].includes(i)){for(const x of [-.55,.55])box(b,1.15,.1,1.65,x,2.2,0,c,0,0,x<0?.35:-.35);}
 else if([6,13].includes(i)){ball(b,.8,0,2.3,0,c,1,.6,.7);for(const x of [-.6,0,.6])ball(b,.13,x,1.9,.75,cream);}
 else if(i===14){box(b,2,.3,1.6,0,2.1,0,c);for(const x of [-.65,0,.65])cone(b,.08,.3,x,1.85,.72,c,5);}
 else if(i===15){for(const x of [-.9,.9])box(b,.05,1.6,.05,x,1.15,.6,c);box(b,1.8,.07,.07,0,1.9,.7,c);}
 else {box(b,1,.3,.1,0,2.3,.3,c);badge(b,c,(i+1)%3);}
 if(i===1)ring(b,.24,.07,.65,1.65,.7,c);
 if(i===4)for(const x of [-.75,-.25,.25,.75])cone(b,.07,.35,x,1.82,.7,c,5);
 if(i===9)petals(b,a,2.3,5);
 if(i===13){ring(b,.4,.12,0,2.85,0,a);ball(b,.12,0,3.35,0,c);}
 for(const x of [-.55,0,.55]){
  if(i===2||i===3||i===15)box(b,.27,.4,.3,x,1.4,0,c);
  else if(i===5||i===8||i===12)cyl(b,.14,.35,x,1.4,0,c);
  else ball(b,.18,x,1.4,0,c,1,i===7||i===14?1.5:1,1);
 }
}
const RELIC=[
 (b,a,c)=>{box(b,1,.2,.8,0,.1,0,c);box(b,.6,.8,.2,0,.6,0,a);ring(b,.23,.07,0,1.3,0,metal);},
 (b,a,c)=>{ball(b,.6,0,.5,0,c,1,.55,1);for(let k=0;k<5;k++)box(b,.06,.55,.06,Math.sin(k)*.3,.6,Math.cos(k)*.3,a,0,0,Math.sin(k)*.3);},
 (b,a,c)=>{base(b,wood);cyl(b,.35,.15,0,.3,0,metal);ring(b,.55,.12,0,.9,0,a);box(b,.8,.1,.15,0,.9,0,c);},
 (b,a,c)=>{base(b,a);box(b,.7,1,.16,0,.7,0,dark);box(b,.5,.6,.03,0,.8,.1,c);for(const x of [-.15,.15])ball(b,.05,x,.35,.1,cream);},
 (b,a,c)=>{base(b,c);for(let k=0;k<3;k++)box(b,.08,1.3,.08,0,.8,0,a,0,0,k*Math.PI/3);ball(b,.2,0,.8,0,c);},
 (b,a,c)=>{base(b,c);box(b,.7,.9,.15,0,.7,0,a);cone(b,.4,.4,0,1.35,0,c,4);box(b,.08,.5,.1,0,.8,.15,c);},
 (b,a,c)=>{base(b,c);ring(b,.5,.1,0,.8,0,a);ball(b,.2,0,.8,0,c);box(b,.1,.6,.1,0,.3,0,wood);},
 (b,a,c)=>{base(b,wood);ball(b,.45,0,.65,0,c,1,1.2,1);box(b,.45,.08,.6,0,1.25,0,a);for(const x of [-.15,.15])ball(b,.06,x,.8,.4,dark);},
 (b,a,c)=>{base(b,c);b.cyl(.4,.3,.6,0,.5,0,a,0,8);cone(b,.28,.5,0,1.05,0,c,6);ring(b,.3,.06,.38,.7,0,c,0,Math.PI/2);},
 (b,a,c)=>{pot(b,c);cyl(b,.05,.5,0,.9,0,a);petals(b,a,1.2,8);},
 (b,a,c)=>{base(b,wood);for(const x of [-.3,.3]){ball(b,.28,x,.55,0,a);box(b,.04,.2,.04,x,.9,0,wood);}box(b,.8,.1,.1,0,.3,.4,c);},
 (b,a,c)=>{base(b,wood);ball(b,.55,0,.6,0,a);box(b,.12,.35,.1,0,1.2,0,wood);ball(b,.22,.2,1.15,0,c,1,.3,1);},
 (b,a,c)=>{base(b,c);cone(b,.45,1.2,0,.75,0,a,5);for(const x of [-.4,.4])cone(b,.2,.65,x,.45,0,c,5);},
 (b,a,c)=>{cyl(b,.5,.3,0,.15,0,c);ball(b,.45,0,.6,0,a,1,.6,1);ball(b,.25,0,.9,0,cream);ball(b,.1,0,1.2,0,a);},
 (b,a,c)=>{base(b,a);ball(b,.42,0,.6,0,c,1,1.3,.8);for(const x of [-.25,.25])ball(b,.08,x,1,.15,dark);cone(b,.1,.25,0,.8,.4,a,5);},
 (b,a,c)=>{base(b,dark);box(b,.65,.8,.65,0,.6,0,a);ring(b,.3,.06,0,1.3,0,c);for(const x of [-.3,.3])box(b,.05,.6,.05,x,.65,.35,c);},
];

export function makeThemeModels(){
 const result={};
 maps.forEach((map,i)=>{const[a,c]=PALETTE[i];for(const role of ROLES){
  const b=new B();
  if(role==='tree')TREE[i](b,a,c);
  else if(role==='plant')PLANT[i](b,a,c);
  else if(role==='light')LIGHT[i](b,a,c);
  else if(role==='barrier')BARRIER[i](b,a,c);
  else if(role==='border')buildBorder(b,i,a,c);
  else if(role==='marker')buildMarker(b,i,a,c);
  else if(role==='seat')buildSeat(b,i,a,c);
  else if(role==='cargo')buildCargo(b,i,a,c);
  else if(role==='canopy')buildCanopy(b,i,a,c);
  else if(role==='feature')FEATURE[i](b,a,c);
  else if(role==='stall')buildStall(b,i,a,c);
  else RELIC[i](b,a,c);
  const g=b.raw();g.computeBoundingBox();const size=g.boundingBox.getSize(new THREE.Vector3()),center=g.boundingBox.getCenter(new THREE.Vector3());
  g.translate(-center.x,-center.y,-center.z);g.scale(1/size.x,1/size.y,1/size.z);
  const col=g.attributes.color,n=g.attributes.normal,p=g.attributes.position;
  for(let v=0;v<col.count;v++){const light=.86+.08*(p.getY(v)+.5)+.06*Math.max(0,n.getY(v));col.setXYZ(v,col.getX(v)*light,col.getY(v)*light,col.getZ(v)*light);}
  g.computeBoundingBox();g.computeBoundingSphere();g.userData={fitCollider:true,theme:map,role};result[themeId(map,role)]=g;
 }});return result;
}
