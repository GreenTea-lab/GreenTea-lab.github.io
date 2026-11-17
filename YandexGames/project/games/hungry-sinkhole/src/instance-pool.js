import * as THREE from 'three';

// A dense instance buffer: disappeared objects stop consuming vertex/shadow work.
// Moving the final instance also updates its owner, including sinking ghosts.
export class Pool {
  constructor(view,geo,mat,cap,castShadow=true){
    Object.assign(this,{view,geo,mat,cap:Math.max(8,cap),castShadow,n:0,owners:[]});
    this.mesh=this._make(this.cap);
  }
  _make(cap){
    const m=new THREE.InstancedMesh(this.geo,this.mat,cap);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(cap*3).fill(1),3);
    m.count=0;m.frustumCulled=false;m.castShadow=this.castShadow;m.receiveShadow=true;
    this.view.world.add(m);return m;
  }
  alloc(owner){
    if(this.n>=this.cap){
      const old=this.mesh;this.cap*=2;this.mesh=this._make(this.cap);
      this.mesh.instanceMatrix.array.set(old.instanceMatrix.array);
      this.mesh.instanceColor.array.set(old.instanceColor.array);
      this.view.world.remove(old);old.dispose();
    }
    const i=this.n++;owner.i=i;this.owners[i]=owner;this.mesh.count=this.n;return i;
  }
  release(i){
    if(i<0||i>=this.n)return;
    const last=--this.n;
    if(i!==last){
      this.mesh.instanceMatrix.array.copyWithin(i*16,last*16,(last+1)*16);
      this.mesh.instanceColor.array.copyWithin(i*3,last*3,(last+1)*3);
      const moved=this.owners[last];this.owners[i]=moved;moved.i=i;
    }
    this.owners.pop();this.mesh.count=this.n;
    this.mesh.instanceMatrix.needsUpdate=true;this.mesh.instanceColor.needsUpdate=true;
  }
}
