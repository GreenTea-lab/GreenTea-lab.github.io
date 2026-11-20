import * as THREE from 'three';
import { C } from './models.js';
import { windmillRotor } from './world-models.js';

const TAU=Math.PI*2;

function particles(group,count,geometry,material,sample){
  const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial(material),count);
  mesh.userData.ownedMaterial=true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled=false;
  const transform=new THREE.Object3D();
  group.add(mesh);
  const update=time=>{
    for(let i=0;i<count;i++){
      sample(transform,time,i);
      transform.updateMatrix();
      mesh.setMatrixAt(i,transform.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
  };
  update(0);
  return update;
}

function fountain(group,stage){
  const streams=stage===3?6:4,arc=stage===3?1.4:.86;
  const drops=particles(group,streams*6,new THREE.SphereGeometry(1,5,4),{color:0xa7f0f4},
    (drop,time,i)=>{
      const angle=(i%streams)/streams*TAU;
      const step=(time*1.44+Math.floor(i/streams)/6+(i%streams)*.041)%1;
      const reach=step*.73;
      drop.position.set(.05+Math.cos(angle)*reach,1.29+4*arc*step*(1-step)-.895*step,.05+Math.sin(angle)*reach);
      const size=.031+Math.sin(Math.PI*step)*.017;
      drop.scale.set(size,size*(1.1+Math.abs(.5-step)*2.1),size);
    });
  const ripples=[];
  for(let i=0;i<2;i++){
    const ripple=new THREE.Mesh(new THREE.RingGeometry(.89,1,24),
      new THREE.MeshBasicMaterial({color:0xbafaff,transparent:true,depthWrite:false}));
    ripple.userData.ownedMaterial=true;
    ripple.rotation.x=-Math.PI/2;
    ripple.position.set(.05,.406+i*.003,.05);
    ripples.push(ripple);
    group.add(ripple);
  }
  return time=>{
    drops(time);
    for(let i=0;i<ripples.length;i++){
      const step=(time*.96+i*.5)%1,ripple=ripples[i];
      ripple.scale.setScalar(.22+.65*step);
      ripple.material.opacity=.48*Math.sin(Math.PI*step);
    }
  };
}

function smoke(group,height){
  return particles(group,7,new THREE.DodecahedronGeometry(1),{color:0xcdc7bb,transparent:true,opacity:.32,depthWrite:false},
    (puff,time,i)=>{
      const p=(time*.64+i/7)%1;
      puff.position.set(.05+.74*p*p, height+1.45*p, -.15+.13*Math.sin(p*5+i)*p);
      puff.rotation.y=1.7*p+i;
      puff.scale.setScalar((.06+.25*p)*Math.min(1,(1-p)*6));
    });
}

function embers(group,stage){
  return particles(group,8,new THREE.BoxGeometry(1,1,1),{color:0xffb550},
    (spark,time,i)=>{
      const p=(time*1.4+i/8)%1,angle=i*2.39996;
      spark.position.set(.05+Math.cos(angle)*p*.43,.57+stage*.07+p*.83,.05+Math.sin(angle)*p*.43);
      spark.rotation.y=angle+p;
      spark.scale.setScalar(Math.sin(Math.PI*p)*(.027+.006*(i%3)));
    });
}

export function animateBuilding(island,project,object){
  const {s,grp}=object;
  if(project.id==='fire')return embers(grp,s);
  if(s<2)return;
  if(project.kind==='fountain')return fountain(grp,s);
  if(project.kind==='kiln')return smoke(grp,s===3?2.7:1.8);
  if(project.kind==='mill'){
    const pivot=new THREE.Group(),blades=island.meshOf(windmillRotor(s,C),false);
    blades.position.set(-.05,-.05,-.05);
    pivot.add(blades);
    pivot.position.set(.05,1.95,.97);
    object.model.add(pivot);
    return time=>{pivot.rotation.z=.52*time+.24*Math.sin(time*.6);};
  }
}
