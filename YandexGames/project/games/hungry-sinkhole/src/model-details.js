import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {B} from './model-builder.js';

const metal=0x697787,cream=0xfff1d2,dark=0x28384a,gold=0xe8b75c;
// Coordinates are fractions of each original model's bounds, measured from ground.
const DETAILS={
 car(q){q.panel(.05,.32,.485,.24,.07,.02,dark);q.lines(3,-.2,.35,.49,.08,.018,.012,metal);q.handles();q.panel(0,.71,.22,.56,.022,.025,0xdeeaf0);},
 van(q){q.panel(0,.42,-.49,.012,.53,.018,metal);q.panel(.12,.42,-.495,.09,.02,.014,dark);q.handles();q.panel(0,.96,-.22,.28,.025,.2,cream);},
 bus(q){for(const z of [-.3,0,.3])q.panel(0,.94,z,.55,.025,.09,metal);q.panel(.49,.4,.29,.014,.42,.014,dark);q.panel(-.49,.28,.1,.014,.035,.53,cream);},
 truck(q){q.panel(0,.52,-.492,.015,.58,.018,metal);for(const x of [-.25,.25])q.panel(x,.5,-.495,.04,.48,.015,metal);q.handles();q.panel(0,.15,.495,.28,.06,.014,cream);},
 person0(q){q.person(0xd28e54);},person1(q){q.person(0x53849e);},person2(q){q.person(0x8b9c5e);},person3(q){q.person(0xb56876);},
 knight(q){q.panel(0,.57,.21,.28,.08,.045,gold);q.panel(0,.36,.13,.54,.05,.05,0x6f604b);q.lines(3,-.1,.82,.28,.1,.016,.018,dark);},
 peasant(q){q.panel(0,.52,.15,.6,.055,.05,0x6f4e34);q.panel(.12,.58,.2,.1,.13,.035,0xb18d5c);q.dot(0,.53,.2,.028,gold);},
 dog(q){q.panel(0,.57,.28,.69,.08,.04,0xcb625b);q.dot(0,.51,.36,.045,gold);q.panel(0,.55,-.1,.32,.2,.38,0xae713c);},
 sheep(q){q.panel(0,.54,.22,.5,.09,.04,0xa8bdd3);q.dot(0,.5,.33,.055,gold);},
 cow(q){q.panel(0,.58,.24,.5,.07,.04,0xc17367);q.dot(0,.5,.31,.07,gold);q.panel(0,.77,.36,.22,.025,.018,cream);},
 cat(q){q.panel(0,.67,.22,.57,.065,.03,0xca6a72);q.dot(0,.6,.31,.035,gold);q.panel(0,.35,-.12,.18,.17,.35,0xc88b51);},
 crab(q){for(const x of [-.2,0,.2])q.dot(x,.7,.15,.045,0xffc98f);q.panel(0,.3,.25,.36,.03,.04,0xa44b38);},
 penguin(q){q.panel(.12,.63,.22,.13,.25,.04,0x5a9bb9);q.lines(3,.095,.48,.24,.025,.014,.012,cream);},
 tree(q){q.bark();q.dot(.12,.64,.29,.043,0xf4ba62);q.dot(-.22,.75,.12,.038,0xeb9a5a);},
 pine(q){q.bark();q.cone(.2,.36,.15,.05,.13,0x6f5137);q.cone(-.22,.56,.1,.045,.11,0x82613d);},
 palm(q){q.palmBark();},
 bush(q){q.dot(-.2,.7,.22,.055,0xffedb0);q.dot(.24,.6,.1,.045,0xe9b6cd);q.panel(0,.06,0,.5,.04,.4,0x4a7c48);},
 lamp(q){q.panel(0,.015,0,.63,.02,.63,metal);q.panel(0,.88,.35,.35,.012,.2,cream);q.dot(0,.64,.085,.028,cream);},
 bench(q){for(const x of [-.4,.4])for(const y of [.53,.73,.9])q.dot(x,y,-.405,.015,metal);q.panel(0,.16,-.12,.7,.045,.04,dark);},
 hydrant(q){q.dot(0,.8,.12,.055,metal);q.panel(0,.4,.46,.22,.1,.03,cream);q.ring(0,.08,0,.38,.018,metal);},
 bin(q){q.panel(0,.52,.43,.35,.26,.02,0xe5e9cf);q.panel(0,.54,.455,.18,.025,.02,0x61927a);q.dot(0,.39,.45,.02,metal);},
 mailbox(q){q.panel(0,.76,.48,.45,.2,.02,cream);q.panel(0,.8,.495,.32,.025,.015,dark);q.panel(0,.69,.495,.15,.015,.015,metal);},
 cone(q){for(const x of [-.35,.35])q.dot(x,.045,.35,.025,0x78644d);q.ring(0,.48,0,.17,.012,cream);},
 barrel(q){q.ring(0,.97,0,.1,.025,metal);q.panel(.12,.5,.49,.16,.15,.012,0xf2e6b4);q.dot(-.2,.94,.1,.035,dark);},
 pump(q){q.lines(3,-.15,.65,.43,.15,.014,.012,cream);q.panel(.32,.35,.13,.04,.42,.04,dark);q.dot(.23,.44,.43,.025,0xd69c57);},
 tlight(q){q.panel(.25,.6,0,.4,.015,.05,metal);q.panel(0,.015,0,.7,.025,.6,metal);q.panel(0,.89,.45,.52,.025,.1,dark);},
 busstop(q){q.lines(4,.21,.63,-.39,.19,.014,.02,0x64879b);q.panel(-.25,.4,-.41,.06,.28,.025,metal);q.panel(0,.98,0,.94,.015,.72,0x86b6cf);},
 pot(q){q.ring(0,.53,0,.42,.027,0xe2a071);q.panel(0,.23,.38,.22,.11,.02,0xe8bd8d);},
 umbrella(q){q.umbrella();},parasol(q){q.umbrella();},
 slide(q){q.slideRails();},
 swing(q){q.swingBraces();},
 fountain(q){q.ring(0,.12,0,.47,.02,0xd7d1bd);q.dot(0,.74,0,.05,0xd5f5ff);for(const x of [-.2,.2])q.dot(x,.23,.22,.022,0xe4fbff);},
 statue(q){q.panel(0,.13,.37,.38,.12,.018,gold);q.lines(2,-.09,.14,.385,.18,.012,.014,0x8b6b46);},
 kiosk(q){q.panel(.32,.48,.43,.18,.16,.035,cream);q.lines(3,-.2,.51,.44,.19,.018,.025,0x68878d);q.panel(0,.94,0,.92,.018,.75,cream);},
 crate(q){for(const x of [-.4,.4])for(const y of [.12,.86])q.dot(x,y,.48,.022,metal);q.panel(0,.54,-.49,.24,.17,.018,cream);},
 pallet(q){for(const z of [-.3,0,.3])q.panel(0,.17,z,.95,.045,.04,0x976c48);q.panel(.25,.55,.49,.13,.24,.016,cream);},
 forklift(q){q.panel(0,.42,-.49,.55,.05,.02,0xcf654a);q.panel(0,.51,-.49,.5,.06,.025,cream);q.panel(0,.49,.12,.2,.035,.03,metal);},
 bollard(q){for(const x of [-.3,.3])q.dot(x,.035,.1,.035,metal);q.ring(0,.53,0,.34,.015,cream);},
 buoy(q){q.ring(0,.16,0,.46,.025,0xa45635);q.ring(0,.84,0,.085,.025,gold);},
 hay(q){for(const z of [-.3,.3])q.ring(0,.49,z,.31,.017,0xe5c77b);q.panel(0,.88,.12,.04,.02,.43,0xf6d78c);},
 cart(q){q.panel(0,.44,-.4,.72,.035,.04,0x805835);for(const x of [-.28,.28])q.dot(x,.55,.3,.045,0xf0c677);},
 well(q){q.panel(0,.7,.03,.035,.35,.035,0xc09c62);q.panel(.31,.75,.02,.14,.04,.04,gold);q.ring(0,.29,0,.46,.018,cream);},
 stall(q){q.panel(.24,.51,.49,.17,.12,.018,cream);q.lines(3,-.34,.35,.47,.22,.014,.018,0x976b49);q.panel(0,.85,.45,.92,.065,.035,0xe5c59c);},
 torch(q){q.ring(0,.72,0,.14,.024,metal);q.cone(0,.92,0,.11,.1,0xffed96);},
 bike(q){q.panel(0,.67,.05,.045,.025,.3,gold);q.dot(0,.85,.35,.045,cream);q.panel(0,.35,.2,.2,.025,.035,metal);},
 fence(q){for(const x of [-.4,0,.4])for(const y of [.32,.72])q.dot(x,y,.34,.017,metal);},
 hedge(q){q.dot(-.3,.86,.12,.05,0x9bc77d);q.dot(.22,.92,-.15,.06,0x81b76d);q.panel(0,.06,0,.8,.055,.75,0x496a3f);},
 sign(q){q.panel(0,.69,.47,.63,.055,.02,cream);q.panel(0,.49,.47,.42,.03,.02,cream);q.dot(0,.85,.48,.027,metal);},
 ac(q){q.lines(5,-.15,.39,.46,.13,.022,.02,0x5e7381);q.panel(.25,.38,.465,.1,.12,.025,dark);q.panel(0,.09,0,.8,.07,.5,metal);},
 tank(q){q.ring(0,.86,0,.39,.012,metal);q.panel(.25,.43,.1,.05,.52,.04,metal);q.panel(.25,.5,.13,.2,.025,.025,metal);},
 antenna(q){q.panel(0,.08,0,.8,.045,.6,metal);q.ring(0,.57,0,.13,.012,metal);q.dot(0,.96,0,.028,gold);},
 billboard(q){q.panel(0,.63,.48,.85,.028,.018,cream);q.panel(0,.45,.48,.75,.018,.018,cream);q.panel(0,.23,0,.65,.035,.2,metal);},
 flowers(q){for(const x of [-.35,0,.35])q.panel(x,.22,.4,.025,.23,.02,0xbb9972);q.panel(0,.08,0,.8,.04,.72,0x7d6249);},
 table(q){q.panel(0,.49,0,.3,.02,.15,cream);q.dot(.1,.55,.08,.025,0xc18e63);q.panel(-.15,.54,.03,.07,.11,.06,cream);},
 dumpster(q){q.panel(0,.62,.46,.4,.18,.02,cream);for(const x of [-.34,.34])q.panel(x,.91,.25,.08,.035,.25,dark);},
 phone(q){q.lines(3,-.15,.48,.47,.15,.018,.02,cream);q.panel(0,.28,.46,.27,.1,.025,gold);q.panel(0,.93,0,.82,.02,.7,0xe39d7c);},
 anchor(q){q.ring(0,.36,.03,.12,.02,0x8b98a0);q.panel(0,.57,.15,.14,.045,.03,metal);},
 sunbed(q){q.panel(0,.4,.16,.65,.035,.22,cream);q.panel(0,.6,-.23,.58,.055,.24,0xe4e6c5);},
 lifeguard(q){q.panel(0,.47,.48,.25,.08,.025,cream);q.panel(0,.43,.48,.075,.22,.026,cream);q.ring(0,.61,-.44,.13,.03,0xf49b63);},
 surfboard(q){q.panel(0,.51,.44,.06,.55,.018,cream);q.panel(0,.18,.4,.38,.04,.018,gold);},
 beachball(q){q.dot(.1,.94,.06,.045,cream);},
 sandcastle(q){q.panel(0,.33,.35,.15,.27,.035,0xb98954);q.lines(3,-.2,.42,.33,.15,.025,.025,0xe5b76b);},
 icecart(q){q.panel(0,.32,.48,.55,.15,.02,cream);q.dot(0,.36,.49,.06,0xe59caf);q.panel(0,.18,-.1,.55,.025,.08,metal);},
 snowman(q){q.panel(.12,.68,.22,.11,.22,.035,0xd5776b);q.lines(3,.095,.55,.25,.025,.014,.012,cream);},
 xtree(q){q.ring(0,.09,0,.19,.02,gold);q.dot(.16,.65,.2,.035,0xe6a8b2);q.dot(-.18,.44,.32,.035,0x83bdd1);},
 snowpine(q){q.bark();q.dot(.2,.38,.13,.03,cream);},
 sled(q){q.panel(0,.66,0,.5,.015,.65,0xdcc493);q.panel(0,.42,.48,.08,.03,.12,0xcba676);},
 gift(q){q.panel(.25,.55,.48,.18,.16,.018,cream);q.dot(.3,.7,.49,.018,gold);},
 horse(q){q.panel(0,.38,.03,.57,.04,.12,0xd8ad63);q.panel(0,.46,.05,.42,.02,.12,cream);q.dot(0,.62,.46,.025,dark);},
 bumper(q){q.panel(0,.2,.48,.55,.045,.025,metal);for(const x of [-.3,.3])q.dot(x,.25,.475,.04,cream);},
 popcorn(q){q.panel(0,.35,.46,.45,.15,.02,cream);q.lines(3,-.15,.33,.48,.15,.018,.015,0xc0624f);q.dot(.25,.23,.45,.025,gold);},
 balloons(q){q.panel(0,.085,.4,.4,.04,.018,gold);q.dot(.1,.08,.41,.025,cream);},
 candy(q){q.ring(0,.55,.12,.22,.015,cream);q.panel(0,.15,.02,.08,.12,.04,gold);},
 gondola(q){q.panel(0,.34,.48,.55,.07,.02,cream);q.panel(0,.23,.49,.2,.05,.02,gold);},
 sakura(q){q.bark();q.dot(-.25,.64,.2,.04,0xfff3ed);q.dot(.15,.8,.16,.04,0xffedf3);},
 slantern(q){q.panel(0,.46,.44,.22,.23,.02,0xffe5ac);q.panel(0,.81,0,.62,.025,.62,0xebe0c3);},
 plantern(q){q.panel(0,.72,.48,.12,.18,.02,cream);q.panel(0,.43,.25,.025,.17,.025,gold);},
 bamboo(q){for(let y=.18;y<.8;y+=.2)q.ring(0,y,0,.19,.013,0xd8d88b);},
 koi(q){q.ring(0,.8,0,.43,.016,0xded4b4);q.dot(.23,.84,-.18,.028,0xe4faf7);},
 cactus(q){q.ring(0,.4,0,.12,.01,0xa2d89c);q.lines(3,-.06,.6,.12,.06,.035,.012,0xe2d6b1);},
 crystal(q){q.panel(-.1,.64,.22,.045,.37,.015,0xe4fcfb);q.panel(.15,.3,.2,.035,.16,.016,0x85a8cf);},
 mushroom(q){q.dot(.24,.75,.13,.055,cream);q.panel(0,.29,.13,.035,.25,.025,0xe1c89e);},
 pumpkin(q){q.panel(0,.5,.45,.025,.6,.015,0xc47d35);q.panel(.26,.49,.33,.02,.48,.015,0xe5aa48);q.dot(.12,.9,.02,.025,0x76a457);},
 lollipop(q){q.ring(0,.78,.12,.23,.022,cream);q.panel(0,.36,0,.055,.2,.04,0xf4c6d9);},
};

export const POLISHED_MODELS=Object.keys(DETAILS);
export function polishModel(id,base,height){
  height=base.userData.modelHeight||height;
  base.computeBoundingBox();const size=base.boundingBox.getSize(new THREE.Vector3()),center=base.boundingBox.getCenter(new THREE.Vector3());
  const b=new B(),q={
    panel(x,y,z,w,h,d,c,t=0){b.box(w*size.x,h*size.y,d*size.z,center.x+x*size.x,y*size.y,center.z+z*size.z,c,t);},
    dot(x,y,z,r,c){b.ball(r*Math.min(size.x,size.y,size.z),center.x+x*size.x,y*size.y,center.z+z*size.z,c,0,1,1,1,6);},
    ring(x,y,z,r,t,c){b.torus(r*Math.min(size.x,size.z),t*Math.min(size.x,size.z),center.x+x*size.x,y*size.y,center.z+z*size.z,c,0,Math.PI/2,0,0,8);},
    cone(x,y,z,r,h,c){b.cone(r*size.x,h*size.y,center.x+x*size.x,y*size.y,center.z+z*size.z,c,0,6);},
    lines(n,x,y,z,step,h,d,c){for(let i=0;i<n;i++)q.panel(x+i*step,y,z,step*.65,h,d,c);},
    handles(){for(const x of [-.46,.46])q.panel(x,.56,.06,.018,.025,.12,cream);},
    person(color){q.panel(0,.46,.33,.54,.04,.035,0x6a5341);q.panel(.13,.6,.35,.18,.1,.025,color);q.lines(3,-.015,.7,.35,.018,.012,.018,cream);},
    bark(){for(let i=0;i<3;i++)q.panel(-.025+i*.027,.19,.08,.012,.18,.014,0xb48659);},
    palmBark(){for(let k=0;k<6;k++)b.torus(.17-k*.01,.014,k*.06,.68+k*.78,0,0xd3ac7b,0,Math.PI/2,0,0,8);},
    slideRails(){for(const x of [-.46,.46])b.box(.055,.12,2.4,x,1.02,.5,0xffc16c,0,.6,0,0);},
    swingBraces(){for(const x of [-1.4,1.4])b.box(.17,.17,.04,x,2.34,.07,metal);},
    umbrella(){q.panel(0,.94,0,.08,.045,.08,gold);for(const x of [-.16,.16])q.panel(x,.9,.15,.015,.015,.29,cream);},
  };
  DETAILS[id]?.(q);
  let result=base;
  if(b.parts.length){const detail=b.raw();detail.translate(0,-height/2,0);result=mergeGeometries([base,detail]);base.dispose();detail.dispose();}
  // Baked material depth costs no extra draw calls, textures or runtime passes.
  const colors=result.attributes.color,norm=result.attributes.normal,pos=result.attributes.position;
  for(let i=0;i<colors.count;i++){
    const y=(pos.getY(i)+height/2)/Math.max(.1,size.y),light=.85+.09*Math.max(0,Math.min(1,y))+.06*Math.max(0,norm.getY(i));
    colors.setXYZ(i,colors.getX(i)*light,colors.getY(i)*light,colors.getZ(i)*light);
  }
  result.computeBoundingBox();result.computeBoundingSphere();result.userData={polished:true,details:!!DETAILS[id]};
  return result;
}
