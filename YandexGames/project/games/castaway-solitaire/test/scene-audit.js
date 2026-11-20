import {Box3,Vector3} from 'three';
import {IC} from '../src/icons.js';
window.__icons=IC;
window.auditIsland=I=>{
 const solids=Object.entries(I.projObjs).map(([id,o])=>{
  o.grp.updateMatrixWorld(true);
  // Rotating blades form a cross, so measure their vertices rather than rotating their square bounds.
  return {id,box:new Box3().setFromObject(o.model,id==='windmill')};
 });
 const overlaps=[],buried=[],decor=[];
 const entries=I.staticEntries.map((e,i)=>({id:'decor-'+i,box:new Box3(new Vector3(e.minX,e.minY,e.minZ),new Vector3(e.maxX,e.maxY,e.maxZ))}));
 const penetrates=(a,b)=>a.min.x<b.max.x-.005&&a.max.x>b.min.x+.005&&a.min.z<b.max.z-.005&&a.max.z>b.min.z+.005&&a.min.y<b.max.y-.005&&a.max.y>b.min.y+.005;
 for(let i=0;i<solids.length;i++)for(let j=i+1;j<solids.length;j++)if(penetrates(solids[i].box,solids[j].box))overlaps.push([solids[i].id,solids[j].id]);
 for(const a of entries){for(const b of solids)if(penetrates(a.box,b.box))decor.push([a.id,b.id]);}
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)if(penetrates(entries[i].box,entries[j].box))decor.push([entries[i].id,entries[j].id]);
 for(const [id,o]of Object.entries(I.projObjs)){
  if(id==='pier')continue;const base=I.spots[id].y;let hits=0;
  o.grp.children[0].traverse(mesh=>{
   if(!mesh.geometry)return;const attr=mesh.geometry.attributes.position,v=new Vector3();
   for(let k=0;k<attr.count;k++){v.fromBufferAttribute(attr,k).applyMatrix4(mesh.matrixWorld);if(v.y<=base+.04&&I.ground(v.x,v.z)>v.y+.035)hits++;}
  });if(hits)buried.push({id,hits});
 }
 return {overlaps,buried,decor,buildings:solids.length,decoration:entries.length,trees:I.palmPos.length};
};
