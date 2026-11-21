import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {Vox} from './vox.js';
import {VS} from './models.js';

const sides=[-1,1];
const quadrupeds={
  hedgehog:{x:1,height:1,rear:-2,front:2,range:.75},
  dog:{x:2,height:4,rear:-4,front:2,range:.85,toes:1},
  goat:{x:1,height:4,rear:-3,front:2,range:.8},
  deer:{x:2,height:5,rear:-4,front:1,range:.8,upper:true},
};
const birds={
  parrot:{height:4,pivot:-1,colors:[0x635263,0x756478,0x514454],range:.64},
  chicken:{height:2,pivot:0,colors:[0xc7884d,0xe3a35e],range:.79},
  duck:{height:2,pivot:-1,colors:[0xd39358,0xdfa963],range:.83},
};
const joint=(match,y,z,weight,lateral=0)=>({match,y,z,weight,lateral,vox:new Vox()});

function limbs(species){
  const four=quadrupeds[species];
  if(four)return sides.flatMap(side=>[four.rear,four.front].map((z,index)=>joint(
    (x,y,zz)=>Math.sign(x)===side&&
      (Math.abs(x)===four.x||(four.upper&&y>=3&&Math.abs(x)===1))&&
      y>=0&&y<=four.height&&(zz===z||(y===0&&four.toes&&zz===z+1)),
    four.height+.55,z+.5,side*(index?1:-1)*four.range,
  )));

  const bird=birds[species];
  if(bird)return sides.map(side=>joint((x,y,z,color)=>Math.sign(x)===side&&y<=bird.height&&bird.colors.includes(color),
    bird.height+.58,bird.pivot+.5,side*bird.range));

  if(species==='crab')return sides.flatMap(side=>[
    ...[-2,-1,1].map((z,index)=>joint((x,y,zz,c)=>Math.sign(x)===side&&Math.abs(x)>=2&&y<=1&&
      (c===0xe47250?zz-1===z:zz===z&&(c===0xcf543d||c===0xb74337)),1.6,side*2.35+.5,side*(index%2?-1:1)*.85,1)),
    joint((x,y,z,c)=>Math.sign(x)===side&&z>=2&&y>=2&&y<=3&&
      [0xe45c40,0xed7049,0xe65d3e,0xe09669].includes(c),2.55,2.5,side*.3),
  ]);

  if(species==='monkey')return sides.flatMap(side=>[
    joint((x,y,z)=>x*side>=2&&y>=2&&y<=6&&(y>=3||Math.abs(x)>=3)&&z>=0&&z<=2,6.45,1,side*-.74),
    joint((x,y,z)=>Math.sign(x)===side&&y<=2&&z>=-1&&z<=2,2.62,.52,side*.66),
  ]);
  if(species==='rabbit')return [
    joint((x,y,z,c)=>y<=1&&z<=1&&c===0xcbb9a8,1.57,.45,-.62),
    joint((x,y,z,c)=>y<=2&&z>=2&&[0xdfcabb,0xcbb9a8].includes(c),2.52,2.72,.55),
  ];
  if(species==='squirrel')return [
    joint((x,y,z,c)=>c===0x9d5938,1.55,1.04,-.65),
    joint((x,y,z,c)=>c===0xb97249,3.48,2.65,.52),
    joint((x,y,z)=>z<=-3&&y>=2,2.35,-2.43,.32),
  ];
  return [];
}

export function wildlifeGeometry(model,species){
  const parts=limbs(species);
  const body=joint(null,0,0,0);
  for(const [key,color] of model.m){
    const x=(key>>20)-512,y=((key>>10)&1023)-512,z=(key&1023)-512;
    const part=parts.find(limb=>limb.match(x,y,z,color))||body;
    part.vox.set(x,y,z,color);
  }
  // Every voxel face belongs to exactly one rigid part, including the faces at a joint.
  // The mesh still uses one draw call for the animal.
  const pieces=[body,...parts].filter(part=>part.vox.m.size).map(part=>{
    const {geo}=part.vox.build(VS,0,0);
    const count=geo.getAttribute('position').count,buffer=new Float32Array(count*4);
    for(let i=0;i<count;i++)buffer.set([part.y*VS,part.z*VS,part.weight,part.lateral],i*4);
    geo.setAttribute('actorJoint',new THREE.BufferAttribute(buffer,4));
    return geo;
  });
  const geometry=mergeGeometries(pieces);
  for(const piece of pieces)piece.dispose();
  return geometry;
}
