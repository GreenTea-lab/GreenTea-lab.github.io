import * as THREE from 'three';
import {Vox,hash} from './vox.js';

const brown=0x875433,oak=0xd7a16b,brass=0xe7b554,linen=0xffead0,blue=0x73c2cd,leaf=0x62a74c;

const wood=()=>new Vox().box(-3,-2,-1,3,0,1,brown).box(-3,0,0,3,1,1,oak).box(-1,-2,-2,0,2,2,linen);
const shell=()=>new Vox().cyl(0,0,2,-2,-2,oak).sphere(0,-1,0,2,0xf6cfae).set(0,1,0,linen);
const basket=()=>new Vox().box(-3,-3,-2,3,0,2,oak).box(-3,-2,-2,3,-2,2,brown)
  .set(-2,1,0,0xd5684c).set(0,1,1,0xf3ad51).set(2,1,-1,leaf).box(-3,1,0,3,1,0,brass);
const wateringCan=()=>new Vox().cyl(0,0,2,-2,1,0x529eaa).cyl(0,0,1,2,2,blue)
  .box(0,0,2,0,1,4,blue).box(-1,1,5,1,1,5,0x386b77).set(0,0,6,blue).set(1,-1,7,blue).set(-1,-2,8,blue);
const hammer=()=>new Vox().box(0,-2,0,0,5,0,brown).box(-2,5,-1,2,6,1,0x818794).set(0,4,0,oak);
const rod=()=>{
  const v=new Vox();
  for(let i=0;i<15;i++)v.set(0,Math.floor(i/4),i,i<3?brown:brass);
  return v;
};
const book=()=>new Vox().box(-3,-1,-1,3,-1,2,0x447e88)
  .box(-3,0,0,-1,0,2,linen).box(1,0,0,3,0,2,linen).box(0,0,0,0,0,2,brown);
const tray=()=>new Vox().box(-4,-1,-2,4,-1,2,oak).cyl(-2,0,1,0,1,linen)
  .cyl(2,0,2,0,2,0x4b989e).set(2,3,0,brass).set(2,1,2,blue);
const seed=()=>new Vox().cyl(0,0,2,-2,0,oak).set(0,1,-1,brass).set(1,1,0,linen).set(-1,1,1,brass);
const glass=()=>new Vox().box(-2,0,-1,2,0,1,brown).box(-2,-1,-1,-1,1,3,brass)
  .box(1,-1,-1,2,1,3,brass).set(-1,0,3,blue).set(1,0,3,blue);
const lute=()=>new Vox().sphere(0,-1,2,3,oak).box(-1,0,-5,0,1,0,brown)
  .box(0,2,-5,0,2,3,linen).cyl(0,3,1,2,2,brown);

// Each profile has a hand prop, a work motion, a place to work and a line for a tap.
const jobs={
  wood:    {prop:wood, kind:'gather', seconds:4.3, lines:['Собираю хворост.','I’m gathering kindling.']},
  shell:   {prop:shell, kind:'gather', shore:true, seconds:4.4, lines:['Посмотри, какая ракушка!','Look at this shell!']},
  water:   {prop:wateringCan, kind:'pour', sites:['garden','orchard'], seconds:5.5, lines:['Полью грядки, пока жарко.','I’m watering the beds while it’s hot.']},
  pick:    {prop:basket, kind:'gather', sites:['orchard','garden'], seconds:5.1, lines:['Эти плоды уже поспели.','These are ripe already.']},
  repair:  {prop:hammer, kind:'hammer', sites:['workshop'], seconds:5.7, lines:['Ещё пара ударов, и готово.','A couple more taps and it’s done.']},
  fish:    {prop:rod, kind:'fish', shore:true, pier:true, seconds:7, lines:['Тише, поплавок шевельнулся.','Quiet, the float just moved.']},
  serve:   {prop:tray, kind:'hold', sites:['teahouse','smokehouse','fire','pavilion'], seconds:4.9, lines:['Угощение для соседей.','A little treat for the neighbours.']},
  carry:   {prop:basket, kind:'gather', sites:['fishmarket','boathouse','windmill','guesthouse'], seconds:4.2, lines:['Проверю припасы.','I’m checking the supplies.']},
  read:    {prop:book, kind:'read', sites:['library','treasury','hammock','guesthouse'], seconds:6.5, lines:['Интересная история. Дочитаю страницу.','What a story. Let me finish this page.']},
  feed:    {prop:seed, kind:'pour', sites:['farm','aviary'], seconds:4.9, lines:['Рассыплю зёрна для птиц.','I’m scattering seed for the birds.']},
  survey:  {prop:glass, kind:'look', sites:['observatory','lookout','boathouse'], seconds:5.5, lines:['Отсюда хорошо видно дальний берег.','You get a clear view of the far shore here.']},
  music:   {prop:lute, kind:'music', sites:['pavilion','fountain'], seconds:6.1, lines:['Выучил мелодию для вечерних встреч.','I learned a tune for the evening get-togethers.']},
};

const roles={
  robin:['repair','wood','fish'],mila:['water','shell','pick'],cap:['fish','survey','shell'],
  kid:['shell','feed'],kid2:['shell','pick'],fisher:['fish','carry'],cook:['serve','carry'],
  reader:['read','survey'],ranger:['feed','survey'],agnia:['serve','wood'],yanek:['repair','carry'],
  rita:['water','pick'],stefan:['fish','carry'],sava:['feed','water'],ada:['carry','serve'],
  nadir:['read','shell'],zoya:['serve','pick'],faye:['pick','water'],irina:['carry','repair'],
  sofia:['shell','read'],kir:['carry','fish'],naomi:['survey','read'],felix:['music','serve'],
  galina:['read','survey'],liza:['music','shell'],
};

const gap=(a,b)=>(a.x-b.x)**2+(a.z-b.z)**2;
const coastAngle=(I,{x,z})=>Math.atan2(x/(I.rx*I.rx),z/(I.rz*I.rz));

function taskSpot(I, job, resident, point){
  const distance=gap(resident,point);
  if(distance<.6||distance>100)return null;
  if(job.shore){
    if(job.pier&&!I.stages.pier)return null;
    const land=I.shapeF(point.x,point.z),yaw=coastAngle(I,point);
    if(land>(job.pier ? .18 : .33))return null;
    const x=Math.sin(yaw),z=Math.cos(yaw);
    let water=0;
    if(job.pier){
      for(let reach=.9;reach<=2.9;reach+=.25){
        if(I.ground(point.x+x*reach,point.z+z*reach)<.3){water=reach;break;}
      }
      if(!water)return null;
    }
    return {face:{x:point.x+x,z:point.z+z},water,score:distance*.3+land*9};
  }
  if(!job.sites){
    const palm=I.palmPos.find(([x,z])=>(x-point.x)**2+(z-point.z)**2<3);
    return palm&&{face:{x:palm[0],z:palm[1]},score:distance*.34};
  }
  let best=null;
  for(const id of job.sites){
    const area=I.projObjs[id]?.area;
    if(!area||!I.stages[id])continue;
    const face={x:Math.max(area.minX,Math.min(area.maxX,point.x)),z:Math.max(area.minZ,Math.min(area.maxZ,point.z))};
    const edge=gap(point,face);
    const score=distance*.23+edge*1.15;
    if(edge<=5&&(!best||score<best.score))best={face,score};
  }
  return best;
}

export function planResidentActivity(I,w,grid){
  if(w.celebration||w.social||I.time<(w.nextActivity??2+w.order*.37))return false;
  const limit=Math.max(1,Math.min(5,Math.ceil(I.walkers.length*.2)));
  if(I.walkers.filter(person=>person.activity).length>=limit)return false;

  const preferred=roles[w.id]||['wood'];
  const cycle=w.activityCycle||0;
  const options=preferred.map((_,i)=>preferred[(i+cycle)%preferred.length]);
  if(!options.includes('wood'))options.push('wood');
  w.nextActivity=I.time+3+hash(w.order,cycle+8)*2;
  for(const id of options){
    const job=jobs[id],candidates=[];
    if((job.pier&&!I.stages.pier)||(job.sites&&!job.sites.some(site=>I.stages[site])))continue;
    for(const point of grid.points){
      const place=taskSpot(I,job,w,point);
      if(!place||I.walkers.some(other=>other!==w&&(
        gap(other,point)<1||gap(other.activity?.point??other.celebration?.point??other.route.at(-1)??other,point)<1.69)))continue;
      candidates.push({point,...place});
    }
    candidates.sort((a,b)=>a.score-b.score);
    for(const {point,face,water} of candidates.slice(0,5)){
      const route=grid.route(w,point);
      if(route.length<2||route.length>30)continue;
      w.activity={id,job,point,face,water,started:null,deadline:I.time+18};
      w.activityCycle=cycle+1;
      w.route=route;
      return true;
    }
  }
  return false;
}

function makeHandProp(I,w,activity){
  const cache=I.activityModels??=new Map();
  if(!cache.has(activity.id))cache.set(activity.id,I.geomOf(activity.job.prop()).geo);
  const group=new THREE.Group(),hand=new THREE.Group();
  const offset=w.m.children[0].position;
  hand.position.set(offset.x+.45,offset.y+.88,offset.z+.06);
  const object=new THREE.Mesh(cache.get(activity.id),I.mat);
  object.position.set(-.045,-.41,.09);
  hand.add(object);group.add(hand);
  I.scene.add(group);
  activity.prop={group,hand,object};
  if(activity.water){
    const positions=new THREE.BufferAttribute(new Float32Array(9),3);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',positions);
    const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xa4e2df,transparent:true,opacity:.83}));
    line.frustumCulled=false;
    I.scene.add(line);
    Object.assign(activity.prop,{line,positions,tip:new THREE.Vector3()});
  }
}

export function endResidentActivity(I,w){
  const state=w.activity;
  if(!state)return;
  if(state.prop){
    I.scene.remove(state.prop.group);
    const line=state.prop.line;
    if(line){I.scene.remove(line);line.geometry.dispose();line.material.dispose();}
  }
  w.m.gait.value.y=0;
  w.activity=null;
  w.nextActivity=I.time+7+hash(w.order,w.activityCycle)*7;
}

export function updateResidentActivity(I,w,dt){
  const state=w.activity;
  if(!state)return false;
  const {job,point,face}=state;
  if(state.started===null){
    if(I.time>=state.deadline||(!w.route.length&&gap(w,point)>.0225)){
      endResidentActivity(I,w);
      w.route=[];
      return false;
    }
    if(gap(w,point)>.0225)return false;
    state.started=I.time;
    w.route=[];
    w.wait=0;
    w.gaitMix=0;
    makeHandProp(I,w,state);
  }
  const elapsed=I.time-state.started;
  if(elapsed>=job.seconds){
    endResidentActivity(I,w);
    w.wait=.25;
    return false;
  }

  const ripple=Math.sin(elapsed*3.3),beat=Math.abs(Math.sin(elapsed*4.55));
  let arm=-.88,lean=.08,bob=0;
  switch(job.kind){
    case 'gather': {
      const crouch=Math.max(0,Math.sin(elapsed*2.5))**2;
      lean=.12+crouch*.51;arm=-.65+crouch*.32;
      state.prop.object.visible=elapsed>.67;
      break;
    }
    case 'hammer': arm=-.51-beat*1.2;lean=.21+(1-beat)*.24;break;
    case 'pour': arm=-.85-ripple*.43;lean=.2+ripple*.13;break;
    case 'fish': arm=-.6+Math.sin(elapsed*2.25)*.13-beat*.15;lean=.015;break;
    case 'read': arm=-1.21+ripple*.08;lean=.19;break;
    case 'look': arm=-1.52+ripple*.06;lean=.035;break;
    case 'music': arm=-.91-beat*.29;lean=.07+ripple*.055;bob=beat*.025;break;
  }
  const blend=Math.min(1,elapsed*5,(job.seconds-elapsed)*5);
  arm*=blend;
  I.lookAtActor(w,face.x,face.z,dt);
  const m=w.m;
  m.gait.value.set(0,arm);
  m.rotation.x=lean*blend;
  m.rotation.z=ripple*.027*blend;
  m.position.set(w.x,I.ground(w.x,w.z)+bob,w.z);
  const {group,hand,line,positions,tip,object}=state.prop;
  group.position.copy(m.position);group.quaternion.copy(m.quaternion);group.scale.copy(m.scale);
  hand.rotation.x=arm;
  if(line){
    object.localToWorld(tip.set(.05,.35,1.44));
    const angle=coastAngle(I,point),reach=state.water;
    const x=point.x+Math.sin(angle)*reach,z=point.z+Math.cos(angle)*reach;
    positions.setXYZ(0,tip.x,tip.y,tip.z);
    positions.setXYZ(1,(tip.x+x)*.5,(tip.y+.3)*.5+.12,(tip.z+z)*.5);
    positions.setXYZ(2,x,.305,z);
    positions.needsUpdate=true;
  }
  return true;
}
