import * as THREE from 'three';
import {VS} from './models.js';

// Cadence, body lift, roll, pitch, and limb range in radians.
const gaits={
  person:   [5.8,.028,.026,.027,.56],
  crab:     [11,.012,.042,.015,.72],
  parrot:   [5.4,.083,.038,.088,.38],
  monkey:   [8,.13,.065,.15,.68],
  hedgehog: [12,.014,.031,.024,.54],
  dog:      [8.5,.055,.042,.049,.89],
  rabbit:   [7.1,.19,.018,.19,.83],
  goat:     [6.2,.026,.025,.045,.59],
  chicken:  [8.6,.03,.028,.104,.76],
  deer:     [5.9,.037,.023,.049,.7],
  squirrel: [9.4,.13,.018,.17,.89],
  duck:     [5.8,.023,.12,.051,.58],
};

export function bindLimbGeometry(geometry){
  const positions=geometry.getAttribute('position');
  const joints=new Float32Array(positions.count*4);
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i)/VS-.5,y=positions.getY(i)/VS;
    const side=Math.sign(x),absX=Math.abs(x);
    let height=0,pivot=0,weight=0,arm=0;
    if(absX>=.5&&y<5.5){height=5.5;pivot=.5;weight=side;}
    if(absX>2.75&&y>=3.8&&y<8.8){height=8.8;pivot=.6;weight=-side*.83;arm=side>0?2:3;}
    if(!weight)continue;
    const taper=Math.min(1,Math.max(0,(height-y)*.6));
    joints.set([height*VS,pivot*VS,weight*taper,arm],i*4);
  }
  geometry.setAttribute('actorJoint',new THREE.BufferAttribute(joints,4));
}

export function limbMaterial(base, driver, batched=false){
  const material=base.clone();
  material.customProgramCacheKey=()=>batched?'island-limbs-batched':'island-limbs';
  material.onBeforeCompile=shader=>{
    shader.uniforms.actorStride=driver;
    const uniform=batched?'highp sampler2D':'vec2';
    const wave=batched?'texelFetch(actorStride, ivec2(int(getIndirectIndex(gl_DrawID)), 0), 0).rg':'actorStride';
    shader.vertexShader=`attribute vec4 actorJoint; uniform ${uniform} actorStride;
      vec3 bendLimb(vec3 p, float c, float s) {
        if (actorJoint.w > .5 && actorJoint.w < 1.5) return vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);
        return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);
      }
    `+shader.vertexShader
      .replace('#include <batching_vertex>',`#include <batching_vertex>
        vec2 actorPose = ${wave};
        float jointAngle = actorJoint.z * actorPose.x;
        if (actorJoint.w > 1.5) jointAngle += actorPose.y * (actorJoint.w < 2.5 ? 1. : .32) * abs(actorJoint.z) / .83;
        float cs = cos(jointAngle), sn = sin(jointAngle);`)
      .replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
        objectNormal = bendLimb(objectNormal, cs, sn);`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        vec3 joint = actorJoint.w > .5 && actorJoint.w < 1.5 ? vec3(actorJoint.y, actorJoint.x, 0.) : vec3(0., actorJoint.x, actorJoint.y);
        transformed = joint + bendLimb(transformed-joint, cs, sn);`);
  };
  return material;
}

const approach=(from,to,dt,rate)=>from+(to-from)*Math.min(1,dt*rate);
const bounders=new Set(['parrot','monkey','rabbit','squirrel']);

export function moveActor(actor,ground,dt,distance){
  const species=actor.species||'person',m=actor.m;
  const [cadence,lift,roll,pitch,swing]=gaits[species];
  const running=!actor.species&&(actor.running||actor.celebration);
  const moving=distance>0,pace=actor.pace||actor.speed;
  const target=moving&&dt>0 ? Math.min(1.55,distance/(pace*dt)) : 0;
  actor.gaitMix=approach(actor.gaitMix||0,target,dt,11);
  actor.ph+=cadence*actor.gaitMix*dt*(actor.child?1.22:1);
  const stride=Math.sin(actor.ph),alternate=Math.sin(2*actor.ph),mix=actor.gaitMix;
  const bound=bounders.has(species);
  const strideLift=bound ? Math.max(0,stride)**1.65 : (1-Math.cos(2*actor.ph))*.5;
  const height=(lift+(running ? .045 : 0)+(actor.child ? .018 : 0))*strideLift*mix;
  m.gait.value.set(stride*swing*Math.min(1.15,mix),0);
  m.rotation.x=approach(m.rotation.x,(pitch*(bound?stride:alternate)+(running ? .11 : 0))*mix,dt,12);
  m.rotation.z=approach(m.rotation.z,roll*stride*mix,dt,12);
  actor.y=Math.max(ground,approach(actor.y??ground,ground,dt,12));
  m.position.set(actor.x,actor.y+height,actor.z);
}
