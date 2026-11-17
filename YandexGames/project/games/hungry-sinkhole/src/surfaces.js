// Repeating detail maps keep paving crisp close up without a giant city texture.
import * as THREE from 'three';
let cached;
export function surfaceDetails(renderer){
  if(cached)return cached;
  let seed=913;const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  const make=paint=>{const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');paint(g);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;};
  const asphalt=make(g=>{
    g.fillStyle='#808080';g.fillRect(0,0,512,512);
    const image=g.getImageData(0,0,512,512);
    for(let i=0;i<image.data.length;i+=4){const v=118+Math.floor(rnd()*22);image.data[i]=image.data[i+1]=image.data[i+2]=v;}g.putImageData(image,0,0);
    for(let i=0;i<1500;i++){g.fillStyle=rnd()>.5?'#ffffff12':'#00000010';const x=rnd()*512,y=rnd()*512;g.fillRect(x,y,1+rnd()*1.2,1+rnd()*1.2);}
  });
  const pavers=make(g=>{
    g.fillStyle='#535353';g.fillRect(0,0,512,512);
    const w=64,h=32;
    for(let row=0;row<16;row++)for(let col=-1;col<9;col++){
      const x=col*w+(row%2)*w/2,y=row*h,v=123+Math.floor(rnd()*17);
      g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(x+1,y+1,w-2,h-2);
      g.strokeStyle='#ffffff36';g.lineWidth=1;g.beginPath();g.moveTo(x+2,y+h-3);g.lineTo(x+2,y+2);g.lineTo(x+w-3,y+2);g.stroke();
      g.strokeStyle='#00000024';g.beginPath();g.moveTo(x+w-2,y+3);g.lineTo(x+w-2,y+h-2);g.lineTo(x+3,y+h-2);g.stroke();
      for(let k=0;k<9;k++){g.fillStyle=rnd()>.5?'#ffffff0b':'#00000009';g.fillRect(x+3+rnd()*(w-6),y+3+rnd()*(h-6),1,1);}
    }
  });
  return cached={asphalt,pavers};
}
export function detailedGround(material,mask,renderer){
  const detail=surfaceDetails(renderer);
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{uSurfaceMask:{value:mask},uAsphalt:{value:detail.asphalt},uPavers:{value:detail.pavers}});
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vSurfaceXZ;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSurfaceXZ=(modelMatrix*vec4(transformed,1.0)).xz;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vSurfaceXZ;uniform sampler2D uSurfaceMask;uniform sampler2D uAsphalt;uniform sampler2D uPavers;').replace('#include <map_fragment>',`#include <map_fragment>
      vec3 surfaceMask=texture2D(uSurfaceMask,vMapUv).rgb;
      float unpainted=1.0-smoothstep(.4,.75,max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b)));
      vec3 roadDetail=texture2D(uAsphalt,vSurfaceXZ/8.0).rgb*2.0;
      vec3 tileDetail=texture2D(uPavers,vSurfaceXZ/8.0).rgb*2.0;
      vec3 stoneDetail=texture2D(uPavers,vSurfaceXZ/5.6+vec2(.25,.0)).rgb*2.0;
      diffuseColor.rgb*=mix(vec3(1.0),roadDetail,surfaceMask.r*unpainted*.72);
      diffuseColor.rgb*=mix(vec3(1.0),tileDetail,surfaceMask.g*.8);
      diffuseColor.rgb*=mix(vec3(1.0),stoneDetail,surfaceMask.b*.7);
    `);
  };
  material.customProgramCacheKey=()=> 'detailed-city-ground-v1';
  material.userData.surfaceMask=mask;
}
