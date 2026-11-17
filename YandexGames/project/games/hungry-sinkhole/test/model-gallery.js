import * as THREE from 'three';
import {makeModels} from '../src/models.js';
import {NEW_MODEL_LABELS} from '../src/model-catalog.js';
import {THEME_NAMES,ROLE_LABELS,ROLE_SIZE} from '../src/theme-catalog.js';
const query=new URLSearchParams(location.search),theme=query.get('theme');
const models=makeModels(),names=Object.keys(models).filter(n=>theme?models[n].userData.theme===theme:!query.has('new')||NEW_MODEL_LABELS[n]),cell=192,cols=theme?4:8,rows=Math.ceil(names.length/cols);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(cell*cols,cell*rows);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setScissorTest(true);document.body.append(renderer.domElement);
const overlay=document.createElement('div');overlay.id='labels';overlay.style.cssText=`position:absolute;inset:0;display:grid;grid-template-columns:repeat(${cols},${cell}px);grid-auto-rows:${cell}px;pointer-events:none`;document.body.append(overlay);
for(let i=0;i<names.length;i++){
 const name=names[i],geometry=models[name].clone(),color=geometry.attributes.color,tint=geometry.attributes.aTint;
 if(geometry.userData.fitCollider)geometry.scale(...ROLE_SIZE[geometry.userData.role]);
 const accent=new THREE.Color(0x75b6d8);
 for(let v=0;v<color.count;v++)if(tint.getX(v)>.5)color.setXYZ(v,color.getX(v)*accent.r,color.getY(v)*accent.g,color.getZ(v)*accent.b);
 const scene=new THREE.Scene();scene.background=new THREE.Color(i%2?0xe9eef3:0xf6f2e9);scene.add(new THREE.HemisphereLight(0xffffff,0x9b9d87,2));const sun=new THREE.DirectionalLight(0xfff5e4,2.5);sun.position.set(5,9,6);scene.add(sun);
 const mesh=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({vertexColors:true}));scene.add(mesh);geometry.computeBoundingBox();const box=geometry.boundingBox,size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),radius=Math.max(size.x,size.y,size.z);
 const camera=new THREE.PerspectiveCamera(36,1,.01,200);camera.position.copy(center).add(new THREE.Vector3(radius*1.35,radius*.9,radius*1.65));camera.lookAt(center);camera.updateProjectionMatrix();
 const x=i%cols*cell,y=(rows-1-Math.floor(i/cols))*cell;renderer.setViewport(x,y,cell,cell);renderer.setScissor(x,y,cell,cell);renderer.render(scene,camera);
 const label=document.createElement('div');label.style.cssText='align-self:end;text-align:center;background:#17223bdf;color:#fff8df;border-radius:5px;font:600 12px system-ui;margin:6px;padding:4px';label.textContent=geometry.userData.theme?THEME_NAMES[geometry.userData.theme]+' · '+ROLE_LABELS[geometry.userData.role]:NEW_MODEL_LABELS[name]||name;overlay.append(label);
}
window.__GALLERY_SIZE={width:cell*cols,height:cell*rows,rows,count:names.length};
window.__GALLERY_READY=true;
