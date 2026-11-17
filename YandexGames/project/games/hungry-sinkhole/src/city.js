import {EXTRA_CARS,EXTRA_PROPS,THEME_PROPS} from './model-catalog.js';
import {THEMED_PROPS,ROLES,themeId,themedLook,MODEL_OWNER} from './theme-catalog.js';
import {lanePose,footprintOverlap} from './traffic.js';
// Генератор карт: сетка улиц, кварталы разных типов, здания из панелей и плит, мелкие предметы.
// На выходе — список предметов для Sim, схема земли для отрисовки и дорожная сеть для машин.

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// карты: размер сетки, шаг кварталов, набор кварталов и палитры
export const MAPS = [
  { id: 'town', n: 6, pitch: 32, need: 1 },
  { id: 'beach', n: 6, pitch: 32, need: 2 },
  { id: 'port', n: 6, pitch: 34, need: 3 },
  { id: 'metro', n: 6, pitch: 36, need: 6 },
  { id: 'winter', n: 6, pitch: 32, need: 8 },
  { id: 'castle', n: 6, pitch: 32, need: 10 },
  { id: 'fair', n: 6, pitch: 34, need: 12 },
  { id: 'japan', n: 6, pitch: 32, need: 15 },
  { id: 'oasis', n: 6, pitch: 30, need: 3, art: 'oasis' },
  { id: 'botanical', n: 6, pitch: 30, need: 4, art: 'garden' },
  { id: 'farm', n: 6, pitch: 32, need: 5, art: 'garden' },
  { id: 'autumn', n: 6, pitch: 32, need: 7, art: 'garden' },
  { id: 'canyon', n: 6, pitch: 34, need: 9, art: 'oasis' },
  { id: 'candyland', n: 6, pitch: 30, need: 11, art: 'city' },
  { id: 'aurora', n: 6, pitch: 32, need: 14, art: 'aurora' },
  { id: 'neoncity', n: 6, pitch: 34, need: 18, art: 'aurora' },
];

// покрытие, транспорт, жители и звери каждой карты
const THEME = {
  oasis: {ground:'sand',road:'cobble',walk:'plaza',inner:'sand',cars:0,people:65,noDash:true,anim:['cat'],nAnim:14},
  botanical: {ground:'moss',road:'fairroad',walk:'gravel',inner:'grass',cars:12,carts:true,people:65,noDash:true,anim:['cat','dog'],nAnim:20},
  farm: {ground:'meadow',road:'cobble',walk:'path',inner:'field',cars:0,people:40,noDash:true,anim:['cow','sheep'],nAnim:42},
  autumn: {ground:'autumn',road:'road',walk:'walk',inner:'autumn',cars:24,people:70,anim:['dog'],nAnim:16,lights:true},
  canyon: {ground:'sand',road:'cobble',walk:'cobble2',inner:'sand',cars:0,people:45,noDash:true,anim:['cat'],nAnim:10},
  candyland: {ground:'sugar',road:'fairroad',walk:'plaza',inner:'sugar',cars:20,carts:true,people:85,noDash:true},
  aurora: {ground:'snow',road:'snowroad',walk:'boards',inner:'snow',cars:18,people:55,anim:['penguin'],nAnim:24,lights:true},
  neoncity: {ground:'nightgrass',road:'nightroad',walk:'nightwalk',cars:36,people:80,lights:true},
  town: { ground: 'grass', road: 'road', walk: 'walk', cars: 34, people: 80, anim: ['dog'], nAnim: 10, lights: true },
  beach: { ground: 'beach', road: 'road', walk: 'boards', inner: 'beach', cars: 26, people: 100, anim: ['crab'], nAnim: 22, lights: true },
  port: { ground: 'asphalt2', road: 'road', walk: 'walk', cars: 34, people: 80, trucks: true, lights: true },
  metro: { ground: 'grass', road: 'road', walk: 'walk', cars: 46, people: 110, lights: true },
  winter: { ground: 'snow', road: 'snowroad', walk: 'snowwalk', inner: 'snow', cars: 30, people: 80, anim: ['penguin', 'penguin', 'dog'], nAnim: 16, lights: true },
  castle: { ground: 'meadow', road: 'cobble', walk: 'cobble2', inner: 'meadow', cars: 0, people: 80, noDash: true, anim: ['sheep', 'sheep', 'sheep', 'cow', 'cow'], nAnim: 30 },
  fair: { ground: 'grass', road: 'fairroad', walk: 'plaza', inner: 'grass', cars: 24, carts: true, people: 150, noDash: true },
  japan: { ground: 'grass', road: 'road', walk: 'gravel', inner: 'moss', cars: 30, people: 90, anim: ['cat'], nAnim: 14, lights: true },
};
const ANIMAL = {
  dog: { size: [0.35, 0.55, 0.8], pts: 8, speed: 0.6 },
  sheep: { size: [0.7, 0.9, 1.1], pts: 8, speed: 0.6 },
  cow: { size: [0.9, 1.4, 2], pts: 20, speed: 0.6 },
  crab: { size: [0.6, 0.45, 0.5], pts: 6, speed: 0.5 },
  penguin: { size: [0.55, 1.05, 0.5], pts: 10, speed: 0.35 },
  cat: { size: [0.25, 0.55, 0.75], pts: 6, speed: 0.7 },
};

const ROAD = 7;
const WALK = 2.5;
const T = 0.35; // толщина стены
const FH = 3; // высота этажа
const SLAB = 0.3;

const HOUSE_TINTS = [0xf4d8b0, 0xf2c4c0, 0xc8e0f0, 0xd6ecc4, 0xfbe6a0, 0xe8d4f0, 0xf6f0e6, 0xffd1a8];
const ROOF_TINTS = [0xd0563f, 0x8a5a44, 0x4f7fb0, 0x5e8f5a, 0xb8463a, 0x6b6b7a];
const CAR_TINTS = [0xe8473f, 0x3f8fe8, 0xf2c230, 0x5cc06a, 0xffffff, 0x9a6ae0, 0xff8a3a, 0x3fd0c8, 0x40465a];
const SHIRTS = [0, 1, 2, 3, 4, 5];
const SNOW = 0xf4f8fc;
const FUN = [0xe8473f, 0x3f8fe8, 0xf2c230, 0x5cc06a, 0xff7ab0, 0x9a6ae0, 0xff8a3a, 0x3fd0c8];

// поворот: сначала наклон вокруг z, потом поворот вокруг y
function quat(ry, rz) {
  const sy = Math.sin(ry / 2), cy = Math.cos(ry / 2), sz = Math.sin(rz / 2), cz = Math.cos(rz / 2);
  return { x: sy * sz, y: sy * cz, z: cy * sz, w: cy * cz };
}

export function genMap(id, seed = 1) {
  const def = MAPS.find((m) => m.id === id) || MAPS[0];
  id = def.id;
  const th = THEME[id];
  const R = rng(seed * 7919 + def.id.length * 131);
  const n = def.n, P = def.pitch;
  const span = n * P;
  const half = span / 2 + 8;
  const items = [];
  const ground = [];
  let GID = 1;
  const landmarks=[];
  const S = { items, ground, R, theme: id, landmarks, gid: () => GID++ };

  // ---------- земля и дороги ----------
  ground.push({ t: th.ground, x0: -half, z0: -half, x1: half, z1: half });
  const lines = [];
  for (let k = 0; k <= n; k++) lines.push(-span / 2 + k * P);
  // кварталы (тротуар + содержимое)
  const blocks = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const cx = lines[i] + P / 2, cz = lines[j] + P / 2;
      const hw = P / 2 - ROAD / 2;
      ground.push({ t: th.walk, x0: cx - hw, z0: cz - hw, x1: cx + hw, z1: cz + hw, r: 1.2 });
      const iw = hw - WALK;
      if (th.inner) ground.push({ t: th.inner, x0: cx - iw + 0.4, z0: cz - iw + 0.4, x1: cx + iw - 0.4, z1: cz + iw - 0.4, r: 2 });
      blocks.push({ i, j, cx, cz, iw });
    }
  for (const x of lines) ground.push({ t: th.road, x0: x - ROAD / 2, z0: lines[0] - ROAD / 2, x1: x + ROAD / 2, z1: lines[n] + ROAD / 2 });
  for (const z of lines) ground.push({ t: th.road, x0: lines[0] - ROAD / 2, z0: z - ROAD / 2, x1: lines[n] + ROAD / 2, z1: z + ROAD / 2 });
  if (!th.noDash) {
    for (const x of lines) for (let j = 0; j < n; j++) ground.push({ t: 'dash', x0: x, z0: lines[j] + ROAD / 2 + 1, x1: x, z1: lines[j + 1] - ROAD / 2 - 1, v: true });
    for (const z of lines) for (let i = 0; i < n; i++) ground.push({ t: 'dash', x0: lines[i] + ROAD / 2 + 1, z0: z, x1: lines[i + 1] - ROAD / 2 - 1, z1: z, v: false });
    for (const x of lines)
      for (const z of lines) {
        // зебры у перекрёстков
        ground.push({ t: 'zebra', x0: x - ROAD / 2, z0: z + ROAD / 2 + 0.3, x1: x + ROAD / 2, z1: z + ROAD / 2 + 2.3, v: true });
        ground.push({ t: 'zebra', x0: x + ROAD / 2 + 0.3, z0: z - ROAD / 2, x1: x + ROAD / 2 + 2.3, z1: z + ROAD / 2, v: false });
      }
  }
  // дорожная сеть: узлы — перекрёстки
  const nodes = [];
  const idx = (i, j) => i * (n + 1) + j;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) nodes.push({ x: lines[i], z: lines[j], n: [] });
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      const a = idx(i, j);
      if (i < n) nodes[a].n.push(idx(i + 1, j)), nodes[idx(i + 1, j)].n.push(a);
      if (j < n) nodes[a].n.push(idx(i, j + 1)), nodes[idx(i, j + 1)].n.push(a);
    }
  S.roads = { nodes };

  // ---------- кварталы ----------
  const kinds = BLOCK_MIX[id];
  // разбрасываем типы кварталов без повторов рядом; центр — главный
  const order = [];
  for (let k = 0; k < blocks.length; k++) order.push(kinds[k % kinds.length]);
  shuffle(order, R);
  blocks.forEach((b, k) => {
    const centre = b.i >= 2 && b.i <= 3 && b.j >= 2 && b.j <= 3;
    const kind = centre ? CENTRE[id][(b.i - 2) * 2 + (b.j - 2)] : order[k];
    BLOCKS[kind](S, b);
  });

  // ---------- улица: фонари, деревья, гидранты, светофоры ----------
  for (const b of blocks) streetDecor(S, b);
  if (th.lights)
    for (const x of lines)
      for (const z of lines) if (R() < 0.35) prop(S, 'tlight', x + ROAD / 2 + 0.6, z + ROAD / 2 + 0.6, R() * 6);

  // New themed objects are real game items, with collision sizes and regeneration.
  const themed=[...ROLES.map(role=>themeId(id,role)),...(THEME_PROPS[id]||[]).filter(look=>MODEL_OWNER[look]===id)];
  const extras=[];
  const themedWalls=items.filter(it=>it.grp&&it.kind==='block');
  const existingProps=items.filter(it=>it.kind==='prop'&&!it.grp);
  for(let i=0;i<blocks.length;i++)for(let slot=0;slot<2;slot++){
    const b=blocks[i],look=themed[(i*2+slot)%themed.length];if(!look)continue;
    const spec=PROPS[look],edge=b.iw-2.1,spots=[[0,edge],[0,-edge],[edge,0],[-edge,0],[-edge,-edge],[edge,edge],[-edge,edge],[edge,-edge],[0,0],[edge*.5,0],[0,edge*.5]];
    for(let k=0;k<spots.length;k++){
      const [dx,dz]=spots[(k+i+slot*3)%spots.length],x=b.cx+dx,z=b.cz+dz,ry=(i+slot)%4*Math.PI/2;
      const box={x,z,yaw:ry,w:spec.size[0],d:spec.size[2]};
      const blocked=themedWalls.some(o=>o.y-o.size[1]/2<spec.size[1]-.1&&o.y+o.size[1]/2>.2&&footprintOverlap(box,{x:o.x,z:o.z,yaw:o.ry||0,w:o.size[0],d:o.size[2]},.18))||existingProps.some(o=>o.y-o.size[1]/2<spec.size[1]&&footprintOverlap(box,{x:o.x,z:o.z,yaw:o.ry||0,w:o.size[0],d:o.size[2]},.12))||extras.some(o=>footprintOverlap(box,{x:o.x,z:o.z,yaw:o.ry||0,w:o.size[0],d:o.size[2]},.25));
      if(!blocked){extras.push(prop(S,look,x,z,ry));break;}
    }
  }

  // ---------- машины и жители ----------
  for (let k = 0; k < th.cars; k++) {
    const a = Math.floor(R() * nodes.length);
    const nb = nodes[a].n;
    const b = nb[Math.floor(R() * nb.length)];
    const na = nodes[a], nbb = nodes[b];
    const len = Math.hypot(nbb.x - na.x, nbb.z - na.z);
    const big = R();
    // в парке аттракционов по аллеям катаются электрокары
    let look = th.carts ? 'bumper' : th.trucks && big < 0.35 ? 'truck' : big < 0.12 ? 'bus' : big < 0.3 ? 'van' : 'car';
    if(!th.carts){const extra=['taxi','policecar','ambulance','delivery'][k%13];if(extra)look=extra;}
    const sz = CAR_SIZE[look];
    const t=.15+R()*.55,pose=lanePose(S.roads,a,b,t);
    items.push({ kind: 'car', look, shape: 'box', size: sz, mat: 'prop', tint: CAR_TINTS[Math.floor(R() * CAR_TINTS.length)], x: pose.x, y: sz[1] / 2, z: pose.z, ry: pose.yaw, pts: PROP_PTS[look], agent: { type: 'car', a, b, t, len, speed: look === 'bus' || look === 'truck' ? 5 : look === 'bumper' ? 3.5 + R() * 1.5 : 6 + R() * 3, lane: 1.75 } });
  }
  for (let k = 0; k < th.people; k++) {
    const b = blocks[Math.floor(R() * blocks.length)];
    const side = Math.floor(R() * 4);
    const off = (R() * 2 - 1) * (b.iw + 1);
    const e = b.iw + WALK / 2;
    // в парке аттракционов народ гуляет и по аллеям
    const onRoad = id === 'fair' && R() < 0.45;
    const x = b.cx + (side === 0 ? e : side === 1 ? -e : off) + (onRoad && side === 0 ? WALK / 2 + 2 : 0);
    const z = b.cz + (side === 2 ? e : side === 3 ? -e : off) + (onRoad && side === 2 ? WALK / 2 + 2 : 0);
    const look = id === 'castle' ? (R() < 0.3 ? 'knight' : 'peasant') : 'person';
    items.push({ kind: 'person', look, shape: 'box', size: [0.55, 1.7, 0.45], mat: 'prop', tint: PERSON_TINTS[Math.floor(R() * PERSON_TINTS.length)], x, y: 0.85, z, ry: R() * 6, pts: 6, agent: { type: 'walk', hx: x, hz: z, dx: 0, dz: 1, speed: 1 + R() * 0.6, turn: R() * 2, idle: 0 } });
  }
  // животные гуляют по паркам, лугам и пляжу
  for (let k = 0; k < (th.nAnim || 0); k++) {
    const b = blocks[Math.floor(R() * blocks.length)];
    const x = b.cx + (R() * 2 - 1) * b.iw, z = b.cz + (R() * 2 - 1) * b.iw;
    const look = pick(th.anim, R);
    const A = ANIMAL[look];
    items.push({ kind: 'animal', look, shape: 'box', size: A.size, mat: 'prop', tint: look === 'cat' ? pick([0xffffff, 0xf2a050, 0x5a5a60, 0xe8d8c0], R) : undefined, x, y: A.size[1] / 2, z, ry: R() * 6, pts: A.pts, agent: { type: 'walk', hx: x, hz: z, dx: 0, dz: 1, speed: A.speed + R() * 0.4, turn: R() * 2, idle: 0 } });
  }
  // All parked variants use their actual dimensions, and no vehicle starts inside a wall.
  const cars=items.filter(it=>it.kind==='car');
  const walls=items.filter(it=>it.grp && it.kind==='block');
  const accepted=[];
  for(const car of cars){
    car.size=CAR_SIZE[car.look]||car.size;car.y=car.size[1]/2;
    const clear=(x,z)=>{
      const box={x,z,yaw:car.ry||0,w:car.size[0],d:car.size[2]};
      if(!car.agent){
        const c=Math.abs(Math.cos(box.yaw)),s=Math.abs(Math.sin(box.yaw));
        const hx=(box.w*c+box.d*s)/2,hz=(box.w*s+box.d*c)/2;
        if(Math.min(...lines.map(v=>Math.abs(v-x)))<ROAD/2+hx+.1 || Math.min(...lines.map(v=>Math.abs(v-z)))<ROAD/2+hz+.1)return false;
      }
      return !walls.some(it=>it.y-it.size[1]/2<car.size[1]-.1&&it.y+it.size[1]/2>.25&&footprintOverlap(box,{x:it.x,z:it.z,yaw:it.ry||0,w:it.size[0],d:it.size[2]},.16)) && !accepted.some(it=>footprintOverlap(box,{x:it.x,z:it.z,yaw:it.ry||0,w:it.size[0],d:it.size[2]},.4));
    };
    if(!clear(car.x,car.z)){
      let found=false;
      if(car.agent){for(let k=0;k<12;k++){const t=.12+k*.05,p=lanePose(S.roads,car.agent.a,car.agent.b,t);if(clear(p.x,p.z)){Object.assign(car,{x:p.x,z:p.z,ry:p.yaw});car.agent.t=t;found=true;break;}}}
      else{const x=car.x,z=car.z;for(let radius=.6;radius<=4.2&&!found;radius+=.6)for(let k=0;k<16&&!found;k++){const a=k*Math.PI/8,nx=x+Math.cos(a)*radius,nz=z+Math.sin(a)*radius;if(clear(nx,nz)){car.x=nx;car.z=nz;found=true;}}}
      if(!found){items.splice(items.indexOf(car),1);continue;}
    }
    accepted.push(car);
  }
  // ограда по краю карты
  border(S, half);
  const palettes={autumn:[0xeeb455,0xd58e49,0xc86937],neoncity:[0x6e6aaf,0x49b8bc,0xc781bd],candyland:[0xffb8d4,0xbad8ff,0xd7c1ff],aurora:[0xb9d9e5,0xe1c7e3,0xa7cecb]};
  if(palettes[id])for(const it of items)if(it.tint!==undefined&&it.kind==='block'&&!it.keepTint)it.tint=pick(palettes[id],R);
  for(const it of items)if(it.kind==='prop'){
    const look=themedLook(id,it.look);
    if(look!==it.look){it.sourceLook=it.look;it.look=look;}
  }
  return { id, half, span, lines, items, ground, roads: S.roads, blocks,landmarks };
}

export const PERSON_TINTS = [0xe8473f, 0x3f8fe8, 0xf2c230, 0x5cc06a, 0x9a6ae0, 0xff8a3a, 0x3fd0c8, 0xff7ab0, 0xffffff];
export const CAR_SIZE = { car: [2.0, 1.5, 4.08], van: [2.12, 2.2, 4.68], bus: [2.56, 3.1, 9.04], truck: [2.46, 3.0, 7.0], bumper: [1.6, 2.15, 2.1], ...EXTRA_CARS };
const PROP_PTS = { taxi:45,policecar:50,ambulance:65,delivery:65, car: 40, van: 60, bus: 150, truck: 120, bumper: 30 };

function shuffle(a, R) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}
const pick = (a, R) => a[Math.floor(R() * a.length)];

// ---------- примитивы ----------
// предмет-реквизит: размеры коллайдера и очки из таблицы
export const PROPS = {
  ...THEMED_PROPS,
  ...EXTRA_PROPS,
  cactus:{shape:'cyl',size:[1.5,3.2,1.2],pts:16},
  crystal:{shape:'cyl',size:[1.1,2.4,1.1],pts:14},
  mushroom:{shape:'cyl',size:[1.4,1.4,1.4],pts:8},
  pumpkin:{shape:'ball',size:[1.1,1,1.1],pts:7},
  lollipop:{shape:'cyl',size:[1.1,2.8,1.1],pts:10},
  tree: { shape: 'cyl', size: [2.6, 4.6, 2.6], pts: 25 },
  pine: { shape: 'cyl', size: [2.2, 5.2, 2.2], pts: 25 },
  bush: { shape: 'box', size: [1.4, 1.0, 1.4], pts: 6 },
  lamp: { shape: 'box', size: [0.4, 4.6, 0.4], pts: 10 },
  bench: { shape: 'box', size: [1.8, 0.9, 0.7], pts: 8 },
  hydrant: { shape: 'cyl', size: [0.45, 0.8, 0.45], pts: 4 },
  bin: { shape: 'cyl', size: [0.6, 0.95, 0.6], pts: 4 },
  mailbox: { shape: 'box', size: [0.5, 1.2, 0.45], pts: 5 },
  cone: { shape: 'cyl', size: [0.45, 0.75, 0.45], pts: 2 },
  barrel: { shape: 'cyl', size: [0.75, 1.1, 0.75], pts: 12, mat: 'tnt' },
  pump: { shape: 'box', size: [0.9, 1.9, 0.6], pts: 20 },
  tlight: { shape: 'box', size: [0.4, 4.2, 0.4], pts: 10 },
  busstop: { shape: 'box', size: [3.2, 2.6, 1.4], pts: 30 },
  pot: { shape: 'cyl', size: [0.8, 1.0, 0.8], pts: 5 },
  umbrella: { shape: 'cyl', size: [2.2, 2.4, 2.2], pts: 15 },
  slide: { shape: 'box', size: [1.2, 2.4, 3.4], pts: 25 },
  swing: { shape: 'box', size: [3.0, 2.4, 1.4], pts: 25 },
  fountain: { shape: 'cyl', size: [4.4, 2.2, 4.4], pts: 60 },
  statue: { shape: 'box', size: [1.6, 4.2, 1.6], pts: 60 },
  kiosk: { shape: 'box', size: [2.6, 2.8, 2.0], pts: 35 },
  crate: { shape: 'box', size: [1.2, 1.2, 1.2], pts: 8 },
  pallet: { shape: 'box', size: [1.4, 1.0, 1.2], pts: 8 },
  forklift: { shape: 'box', size: [1.3, 2.2, 2.6], pts: 40 },
  container: { shape: 'box', size: [2.5, 2.6, 6.1], pts: 90, mat: 'metal' },
  bollard: { shape: 'cyl', size: [0.5, 0.7, 0.5], pts: 3 },
  buoy: { shape: 'cyl', size: [0.9, 1.4, 0.9], pts: 6 },
  hay: { shape: 'cyl', size: [1.4, 1.2, 1.4], pts: 6 },
  cart: { shape: 'box', size: [1.6, 1.5, 2.8], pts: 25 },
  well: { shape: 'cyl', size: [2.0, 2.8, 2.0], pts: 30 },
  stall: { shape: 'box', size: [3.0, 2.6, 1.8], pts: 30 },
  torch: { shape: 'box', size: [0.3, 2.4, 0.3], pts: 4 },
  bike: { shape: 'box', size: [0.5, 1.0, 1.7], pts: 6 },
  fence: { shape: 'box', size: [2.0, 1.0, 0.12], pts: 3 },
  hedge: { shape: 'box', size: [2.0, 1.1, 0.8], pts: 5 },
  sign: { shape: 'box', size: [0.9, 2.6, 0.2], pts: 5 },
  ac: { shape: 'box', size: [1.2, 0.9, 0.9], pts: 8 },
  tank: { shape: 'cyl', size: [1.6, 2.2, 1.6], pts: 20 },
  antenna: { shape: 'box', size: [0.5, 2.6, 0.5], pts: 6 },
  billboard: { shape: 'box', size: [5.0, 4.6, 0.4], pts: 40 },
  flowers: { shape: 'box', size: [1.8, 0.6, 0.9], pts: 4 },
  table: { shape: 'box', size: [1.4, 0.9, 1.4], pts: 5 },
  dumpster: { shape: 'box', size: [2.0, 1.4, 1.2], pts: 15 },
  phone: { shape: 'box', size: [1.0, 2.4, 1.0], pts: 15 },
  palm: { shape: 'cyl', size: [2.4, 5.6, 2.4], pts: 25 },
  anchor: { shape: 'box', size: [1.6, 2.0, 0.5], pts: 20 },
  // курорт
  parasol: { shape: 'cyl', size: [2.3, 2.6, 2.3], pts: 10 },
  sunbed: { shape: 'box', size: [0.75, 0.9, 2.0], pts: 6 },
  lifeguard: { shape: 'box', size: [2.2, 4.6, 2.2], pts: 40 },
  surfboard: { shape: 'box', size: [0.65, 2.0, 0.4], pts: 6 },
  beachball: { shape: 'ball', size: [0.8, 0.8, 0.8], pts: 4 },
  sandcastle: { shape: 'box', size: [1.6, 1.8, 1.6], pts: 12 },
  icecart: { shape: 'box', size: [1.8, 2.95, 1.2], pts: 20 },
  // зима
  snowman: { shape: 'cyl', size: [1.2, 2.6, 1.2], pts: 15 },
  xtree: { shape: 'cyl', size: [3.8, 7.2, 3.8], pts: 120 },
  snowpine: { shape: 'cyl', size: [2.2, 5.2, 2.2], pts: 25 },
  sled: { shape: 'box', size: [0.8, 0.5, 1.6], pts: 5 },
  gift: { shape: 'box', size: [0.95, 1.0, 0.95], pts: 6 },
  // парк аттракционов
  horse: { shape: 'box', size: [0.4, 2.6, 1.0], pts: 10 },
  bumper: { shape: 'box', size: [1.6, 2.15, 2.1], pts: 25 },
  popcorn: { shape: 'box', size: [1.3, 2.5, 0.9], pts: 20 },
  balloons: { shape: 'cyl', size: [1.0, 2.9, 1.0], pts: 8 },
  candy: { shape: 'cyl', size: [0.8, 2.4, 0.8], pts: 6 },
  gondola: { shape: 'box', size: [1.4, 1.6, 1.4], pts: 15 },
  // сакура
  sakura: { shape: 'cyl', size: [2.8, 4.2, 2.8], pts: 25 },
  slantern: { shape: 'box', size: [0.7, 1.9, 0.7], pts: 8 },
  plantern: { shape: 'box', size: [1.0, 2.4, 0.5], pts: 6 },
  bamboo: { shape: 'cyl', size: [1.0, 3.4, 1.0], pts: 8 },
  koi: { shape: 'cyl', size: [2.0, 0.35, 2.0], pts: 10 },
};

function prop(S, look, x, z, ry = 0, extra = {}) {
  const P = PROPS[look];
  const size = extra.size || P.size;
  const it = { kind: 'prop', look, shape: P.shape, size, mat: P.mat || 'prop', x, y: (extra.y || 0) + size[1] / 2, z, ry, pts: P.pts, ...extra };
  it.y = (extra.y || 0) + size[1] / 2;
  S.items.push(it);
  return it;
}

function block(S, look, mat, size, x, y, z, ry, tint, grp, shape = 'box') {
  S.items.push({ kind: 'block', look, mat, shape, size, x, y, z, ry, tint, grp });
}

// поворот локальной точки здания (ry) в мир
function rot(x, z, ry) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return [x * c + z * s, -x * s + z * c];
}

// здание: этажи из стеновых панелей (длинные стены режутся на секции) и плит перекрытия
// o: { cx, cz, w, d, floors, ry, look, door, mat, tint, roof: 'gable'|'flat'|'none', roofTint, fh, seg, slabLook, top }
function building(S, o) {
  const g = S.gid();
  const fh = o.fh || FH;
  const ry = o.ry || 0;
  const seg = o.seg || 3.6;
  const put = (look, mat, size, lx, y, lz, tint, shape = 'box', yrot = 0) => {
    const [x, z] = rot(lx, lz, ry);
    block(S, look, mat, size, o.cx + x, y, o.cz + z, ry + yrot, tint, g, shape);
  };
  const { w, d } = o;
  let y0 = 0;
  for (let f = 0; f < o.floors; f++) {
    const look = f === 0 && o.groundLook ? o.groundLook : o.look;
    // фасад и задняя стена: во всю ширину
    for (const side of [1, -1]) {
      const ns = Math.max(1, Math.round(w / seg));
      const sw = w / ns;
      for (let k = 0; k < ns; k++) {
        const lx = -w / 2 + sw * (k + 0.5);
        const isDoor = f === 0 && side === 1 && o.door && k === Math.floor(ns / 2);
        put(isDoor ? o.door : look, o.mat, [sw, fh, T], lx, y0 + fh / 2, side * (d / 2 - T / 2), o.tint, 'box', side === 1 ? 0 : Math.PI);
      }
    }
    // боковые стены между ними
    for (const side of [1, -1]) {
      const dd = d - 2 * T;
      const ns = Math.max(1, Math.round(dd / seg));
      const sd = dd / ns;
      for (let k = 0; k < ns; k++) {
        const lz = -dd / 2 + sd * (k + 0.5);
        put(look, o.mat, [sd, fh, T], side * (w / 2 - T / 2), y0 + fh / 2, lz, o.tint, 'box', side * Math.PI / 2);
      }
    }
    y0 += fh;
    // перекрытие (большие — из двух плит)
    const slabLook = o.slabLook || 'plain';
    const accent = o.slabAccents?.[f + 1];
    const slabTint = accent || o.slabTint || 0xd8d2c8;
    if (w > 9 || d > 9) {
      if (w >= d) {
        put(slabLook, 'concrete', [w / 2, SLAB, d], -w / 4, y0 + SLAB / 2, 0, slabTint);
        put(slabLook, 'concrete', [w / 2, SLAB, d], w / 4, y0 + SLAB / 2, 0, slabTint);
      } else {
        put(slabLook, 'concrete', [w, SLAB, d / 2], 0, y0 + SLAB / 2, -d / 4, slabTint);
        put(slabLook, 'concrete', [w, SLAB, d / 2], 0, y0 + SLAB / 2, d / 4, slabTint);
      }
    } else {
      const overhang = accent ? .35 : 0;
      put(slabLook, 'concrete', [w + overhang, SLAB, d + overhang], 0, y0 + SLAB / 2, 0, slabTint);
    }
    y0 += SLAB;
  }
  if (o.roof === 'gable') {
    const rh = Math.min(w, d) * 0.42;
    // конёк вдоль длинной стороны
    if (w >= d) put('roof', 'wood', [w + 0.5, rh, d + 0.5], 0, y0 + rh / 2, 0, o.roofTint, 'roof');
    else put('roof', 'wood', [d + 0.5, rh, w + 0.5], 0, y0 + rh / 2, 0, o.roofTint, 'roof', Math.PI / 2);
    if (o.chimney) put('brick', 'brick', [0.7, 1.6, 0.7], w * 0.25, y0 + rh * 0.55, d * 0.1, 0xb8604a);
  } else if (o.roof === 'flat') {
    // парапет и всё, что стоит на крыше
    const ph = 0.6;
    put('plain', 'concrete', [w, ph, 0.25], 0, y0 + ph / 2, d / 2 - 0.125, o.tint);
    put('plain', 'concrete', [w, ph, 0.25], 0, y0 + ph / 2, -d / 2 + 0.125, o.tint);
    put('plain', 'concrete', [0.25, ph, d - 0.5], w / 2 - 0.125, y0 + ph / 2, 0, o.tint);
    put('plain', 'concrete', [0.25, ph, d - 0.5], -w / 2 + 0.125, y0 + ph / 2, 0, o.tint);
    const tops = o.top || ['ac', 'ac', 'antenna'];
    tops.forEach((t, k) => {
      const lx = (S.R() - 0.5) * (w - 2.5), lz = (S.R() - 0.5) * (d - 2.5);
      const [x, z] = rot(lx, lz, ry);
      const it = prop(S, t, o.cx + x, o.cz + z, ry + (k % 2) * Math.PI / 2, { y: y0, grp: g });
      it.grp = g;
    });
  }
  return { g, h: y0 };
}

// ---------- улица ----------
function streetDecor(S, b) {
  const R = S.R;
  const e = b.iw + WALK - 0.6;
  const th = S.theme;
  for (let side = 0; side < 4; side++) {
    for (let k = -1; k <= 1; k++) {
      const along = k * (b.iw * 0.62) + (R() - 0.5) * 2;
      const [x, z] = side === 0 ? [b.cx + e, b.cz + along] : side === 1 ? [b.cx - e, b.cz + along] : side === 2 ? [b.cx + along, b.cz + e] : [b.cx + along, b.cz - e];
      const ry = side === 0 ? Math.PI / 2 : side === 1 ? -Math.PI / 2 : side === 2 ? 0 : Math.PI;
      if (th === 'castle') {
        if (k === 0) prop(S, 'torch', x, z, 0);
        else if (R() < 0.4) prop(S, R() < 0.5 ? 'barrel' : 'hay', x, z, R() * 6, R() < 0.5 ? {} : { mat: 'prop' });
        continue;
      }
      if (k === 0) prop(S, th === 'japan' && R() < 0.5 ? 'plantern' : 'lamp', x, z, ry);
      else if (STREET[th]) STREET[th](S, x, z, ry, k, side);
      else {
        const r = R();
        if (r < 0.45) prop(S, th === 'port' ? 'bollard' : th === 'metro' && R() < 0.4 ? 'palm' : 'tree', x, z, R() * 6);
        else if (r < 0.6) prop(S, 'hydrant', x, z, 0);
        else if (r < 0.72) prop(S, 'bin', x, z, 0);
        else if (r < 0.8) prop(S, 'mailbox', x, z, ry);
        else if (r < 0.88 && k === 1) prop(S, 'busstop', x, z, ry);
        else if (r < 0.94) prop(S, th === 'metro' ? 'phone' : 'bench', x, z, ry);
        else prop(S, 'bike', x, z, ry + 0.3);
      }
    }
  }
}

// уличная мелочь новых карт
const STREET = {
  oasis(S,x,z,ry){prop(S,S.R()<.5?'cactus':'pot',x,z,ry);},
  botanical(S,x,z,ry){prop(S,S.R()<.5?'flowers':'mushroom',x,z,ry);},
  farm(S,x,z,ry){prop(S,S.R()<.5?'hay':'fence',x,z,ry);},
  autumn(S,x,z,ry){prop(S,S.R()<.6?'pumpkin':'tree',x,z,ry,{tint:0xf2a050});},
  canyon(S,x,z,ry){prop(S,S.R()<.6?'cactus':'crystal',x,z,ry);},
  candyland(S,x,z,ry){prop(S,S.R()<.6?'lollipop':'candy',x,z,ry);},
  aurora(S,x,z,ry){prop(S,S.R()<.6?'snowpine':'buoy',x,z,ry);},
  neoncity(S,x,z,ry){prop(S,S.R()<.6?'crystal':'phone',x,z,ry,{tint:0x9b75ff});},
  beach(S, x, z, ry, k) {
    const r = S.R();
    if (r < 0.45) prop(S, 'palm', x, z, S.R() * 6);
    else if (r < 0.58) prop(S, 'bin', x, z, 0);
    else if (r < 0.7) prop(S, 'bench', x, z, ry);
    else if (r < 0.8) prop(S, 'surfboard', x, z, ry, { tint: pick(FUN, S.R) });
    else if (r < 0.88 && k === 1) prop(S, 'icecart', x, z, ry, { tint: pick([0xffffff, 0xbfeaff, 0xffe0ec], S.R) });
    else if (r < 0.94) prop(S, 'pot', x, z, 0);
    else prop(S, 'bike', x, z, ry + 0.3);
  },
  winter(S, x, z, ry, k) {
    const r = S.R();
    if (r < 0.42) prop(S, 'snowpine', x, z, S.R() * 6);
    else if (r < 0.56) prop(S, 'snowman', x, z, ry + Math.PI, { tint: pick(FUN, S.R) });
    else if (r < 0.66) prop(S, 'hydrant', x, z, 0);
    else if (r < 0.76) prop(S, 'bin', x, z, 0);
    else if (r < 0.84 && k === 1) prop(S, 'busstop', x, z, ry);
    else if (r < 0.92) prop(S, 'bench', x, z, ry);
    else prop(S, 'sled', x, z, ry + 0.4, { tint: pick(FUN, S.R) });
  },
  fair(S, x, z, ry) {
    const r = S.R();
    if (r < 0.3) prop(S, 'tree', x, z, S.R() * 6);
    else if (r < 0.45) prop(S, 'balloons', x, z, S.R() * 6, { tint: pick(FUN, S.R) });
    else if (r < 0.57) prop(S, 'bin', x, z, 0);
    else if (r < 0.69) prop(S, 'bench', x, z, ry);
    else if (r < 0.79) prop(S, 'popcorn', x, z, ry);
    else if (r < 0.89) prop(S, 'candy', x, z, 0, { tint: pick([0xff9ad0, 0xbfe6ff, 0xffffff], S.R) });
    else prop(S, 'flowers', x, z, ry);
  },
  japan(S, x, z, ry) {
    const r = S.R();
    if (r < 0.4) prop(S, 'sakura', x, z, S.R() * 6);
    else if (r < 0.52) prop(S, 'slantern', x, z, ry);
    else if (r < 0.64) prop(S, 'bin', x, z, 0);
    else if (r < 0.74) prop(S, 'phone', x, z, ry);
    else if (r < 0.84) prop(S, 'bamboo', x, z, S.R() * 6);
    else if (r < 0.92) prop(S, 'bench', x, z, ry);
    else prop(S, 'bike', x, z, ry + 0.3);
  },
};

function border(S, half) {
  const th = S.theme;
  const step = 2;
  for (let s = -half + 1; s < half - 1; s += step) {
    for (const [x, z, ry] of [[s + 1, -half + 1.5, 0], [s + 1, half - 1.5, 0], [-half + 1.5, s + 1, Math.PI / 2], [half - 1.5, s + 1, Math.PI / 2]]) {
      if (th === 'castle' || th === 'town') prop(S, th === 'castle' ? 'hedge' : S.R() < 0.5 ? 'hedge' : 'fence', x, z, ry);
      else if (th === 'fair') prop(S, S.R() < 0.75 ? 'fence' : 'flowers', x, z, ry);
      else if (th === 'japan') prop(S, S.R() < 0.6 ? 'hedge' : 'bamboo', x, z, ry);
      else if (th === 'winter') {
        if (S.R() < 0.3) prop(S, 'snowpine', x, z, S.R() * 6);
        else prop(S, 'fence', x, z, ry);
      } else if (th === 'beach') {
        if (S.R() < 0.18) prop(S, 'palm', x, z, S.R() * 6);
      } else if (S.R() < 0.5) prop(S, 'bollard', x, z, 0);
    }
  }
}

// ---------- кварталы ----------
const BLOCKS = {
  bazaar(S,b) {
    const R=S.R;
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const x=b.cx+sx*5.7,z=b.cz+sz*5.7;
      building(S,{cx:x,cz:z,w:6,d:6,floors:1+(R()>.65),look:'house',door:'houseDoor',mat:'brick',tint:pick([0xe8b87c,0xf0d6a4,0xe2a487],R),roof:'flat',seg:3});
      prop(S,'stall',x,z+sz*4,0,{tint:pick(FUN,R)});
      prop(S,'pot',x+3.8,z,0);prop(S,'cactus',x-3.8,z,0);
    }
    prop(S,'well',b.cx,b.cz,0);
  },
  greenhouse(S,b) {
    for(const sx of [-1,1]){
      building(S,{cx:b.cx+sx*5.2,cz:b.cz,w:7,d:15,floors:1,fh:3.8,look:'office',mat:'glass',tint:0x91d2ca,roof:'gable',roofTint:0xc5ebe6,seg:3});
      for(let k=-2;k<=2;k++)prop(S,'flowers',b.cx+sx*5.2,b.cz+k*2.6,0);
    }
    for(const z of [-9,9]){prop(S,'fountain',b.cx,b.cz+z,0);prop(S,'mushroom',b.cx+3,b.cz+z,0);}
  },
  orchard(S,b) {
    for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++){
      const x=b.cx+i*4,z=b.cz+j*4;
      prop(S,S.theme==='autumn'?'pumpkin':S.theme==='candyland'?'lollipop':'tree',x,z,0,{tint:pick(FUN,S.R)});
      if((i+j)%2===0)prop(S,'crate',x+1.3,z+.8,0,{tint:0xc49354});
    }
    prop(S,'cart',b.cx,b.cz,0);
  },
  candyworks(S,b) {
    building(S,{cx:b.cx,cz:b.cz,w:13,d:10,floors:2,look:'house',door:'houseDoor',mat:'wood',tint:0xffb7cf,roof:'gable',roofTint:0x9666c9,seg:3});
    for(const x of [-8,8])for(const z of [-7,0,7])prop(S,'lollipop',b.cx+x,b.cz+z,0);
    for(let k=-2;k<=2;k++)prop(S,'candy',b.cx+k*3,b.cz+8,0);
  },
  outpost(S,b) {
    building(S,{cx:b.cx,cz:b.cz,w:9,d:8,floors:2,look:'brick',door:'houseDoor',mat:'stone',tint:0xd7a07b,roof:'flat',seg:3});
    for(const x of [-8,8])for(const z of [-8,0,8])prop(S,'crystal',b.cx+x,b.cz+z,0,{tint:pick([0xffbd78,0x70c9d4,0xae85d6],S.R)});
    for(let k=-2;k<=2;k++)prop(S,'crate',b.cx+k*2.2,b.cz+7,0);
  },
  // четыре домика с участками
  houses(S, b) {
    const R = S.R;
    const q = b.iw / 2;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = b.cx + sx * q, cz = b.cz + sz * q;
      const w = 5 + Math.floor(R() * 3) * 0.6, d = 5 + Math.floor(R() * 3) * 0.6;
      const ry = sz > 0 ? 0 : Math.PI; // фасадом к улице
      building(S, { cx: cx + (R() - 0.5), cz: cz - sz * 0.6, w, d, floors: R() < 0.5 ? 2 : 1, ry, look: R() < 0.3 ? 'brick' : 'house', door: 'houseDoor', mat: R() < 0.3 ? 'brick' : 'wood', tint: pick(HOUSE_TINTS, R), roof: 'gable', roofTint: S.theme === 'winter' ? SNOW : pick(ROOF_TINTS, R), chimney: R() < 0.5, seg: 3 });
      // заборчик со стороны улицы, кусты, дерево, почтовый ящик
      const fz = cz + sz * (q - 0.3);
      for (let k = -2; k <= 2; k++) if (k !== 0) prop(S, 'fence', cx + k * 2, fz, 0);
      prop(S, 'mailbox', cx + 1.2, fz - sz * 0.6, ry);
      prop(S, R() < 0.5 ? 'tree' : 'pine', cx + sx * (q - 1.2), cz - sz * (q - 1.4), R() * 6);
      prop(S, 'bush', cx - sx * (q - 1), cz + sz * (q - 1.4), R() * 6);
      if (R() < 0.5) prop(S, 'flowers', cx - 2.2, fz - sz * 1, 0);
      if (R() < 0.35) S.items.push({ kind: 'car', look: 'car', shape: 'box', size: CAR_SIZE.car, mat: 'prop', tint: pick(CAR_TINTS, R), x: cx + sx * 3.4, y: 0.75, z: cz + sz * 2.6, ry: 0, pts: PROP_PTS.car });
    }
  },
  // парк: деревья, лавочки, фонтан, детская площадка
  park(S, b) {
    const R = S.R;
    S.ground.push({ t: 'path', x0: b.cx - 1.2, z0: b.cz - b.iw, x1: b.cx + 1.2, z1: b.cz + b.iw });
    S.ground.push({ t: 'path', x0: b.cx - b.iw, z0: b.cz - 1.2, x1: b.cx + b.iw, z1: b.cz + 1.2 });
    S.ground.push({ t: 'plaza', x0: b.cx - 3.6, z0: b.cz - 3.6, x1: b.cx + 3.6, z1: b.cz + 3.6, r: 3.6 });
    prop(S, 'fountain', b.cx, b.cz, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const qx = b.cx + sx * b.iw * 0.55, qz = b.cz + sz * b.iw * 0.55;
      if (sx === 1 && sz === 1) {
        S.ground.push({ t: 'sand', x0: qx - 4, z0: qz - 4, x1: qx + 4, z1: qz + 4, r: 1 });
        prop(S, 'slide', qx - 1.5, qz, 0.3);
        prop(S, 'swing', qx + 1.6, qz + 1, 0);
        continue;
      }
      for (let k = 0; k < 3; k++) prop(S, R() < 0.3 ? 'pine' : 'tree', qx + (R() - 0.5) * 6, qz + (R() - 0.5) * 6, R() * 6);
      prop(S, 'bush', qx + (R() - 0.5) * 6, qz + (R() - 0.5) * 6, R() * 6);
    }
    for (const [x, z, ry] of [[b.cx + 2.4, b.cz + 6, Math.PI / 2], [b.cx - 2.4, b.cz - 6, -Math.PI / 2], [b.cx + 6, b.cz - 2.4, 0], [b.cx - 6, b.cz + 2.4, Math.PI]]) prop(S, 'bench', x, z, ry);
    prop(S, 'bin', b.cx + 2.2, b.cz + 4.2, 0);
    prop(S, 'lamp', b.cx - 2.2, b.cz + 4.6, 0);
    prop(S, 'lamp', b.cx + 2.2, b.cz - 4.6, 0);
    if (R() < 0.6) prop(S, 'kiosk', b.cx - b.iw + 2, b.cz + b.iw - 2.5, 0);
  },
  // магазинчики с витринами и парковкой
  shops(S, b) {
    const R = S.R;
    const w = b.iw * 2 - 1;
    const n = 3;
    const sw = w / n;
    for (let k = 0; k < n; k++) {
      const cx = b.cx - w / 2 + sw * (k + 0.5);
      building(S, { cx, cz: b.cz + b.iw - 4, w: sw - 0.4, d: 7, floors: 2, ry: 0, look: R() < 0.5 ? 'house' : 'brick', groundLook: 'shop', door: 'shopDoor', mat: 'brick', tint: pick(HOUSE_TINTS, R), roof: 'flat', top: ['ac', 'sign'], seg: 3.2 });
    }
    S.ground.push({ t: 'parking', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + 1, n: 7 });
    for (let k = 0; k < 7; k++) if (R() < 0.6) S.items.push({ kind: 'car', look: R() < 0.2 ? 'van' : 'car', shape: 'box', size: CAR_SIZE.car, mat: 'prop', tint: pick(CAR_TINTS, R), x: b.cx - b.iw + (k + 0.5) * (b.iw * 2) / 7, y: 0.75, z: b.cz - b.iw * 0.45, ry: R() < 0.5 ? 0 : Math.PI, pts: PROP_PTS.car });
    prop(S, 'dumpster', b.cx + b.iw - 1.5, b.cz + 1.2, 0);
    prop(S, 'bin', b.cx - b.iw + 1, b.cz + 1.6, 0);
    prop(S, 'umbrella', b.cx - 3, b.cz + 2.4, 0);
    prop(S, 'table', b.cx + 1, b.cz + 2.4, 0);
  },
  // панельная многоэтажка
  apartments(S, b) {
    const R = S.R;
    const w = b.iw * 2 - 3, d = 9;
    building(S, { cx: b.cx, cz: b.cz + 1, w, d, floors: 4 + Math.floor(R() * 2), ry: 0, look: 'flat', door: 'flatDoor', mat: 'concrete', tint: pick([0xf0e6d8, 0xd8e4ee, 0xf4dccc, 0xe0ecd8], R), roof: 'flat', top: ['tank', 'antenna', 'ac', 'ac'], seg: 3.6 });
    S.ground.push({ t: 'sand', x0: b.cx - 4, z0: b.cz - b.iw + 0.5, x1: b.cx + 4, z1: b.cz - b.iw + 5, r: 1 });
    prop(S, 'swing', b.cx - 1.8, b.cz - b.iw + 2.6, 0);
    prop(S, 'slide', b.cx + 2, b.cz - b.iw + 2.8, Math.PI / 2);
    for (const x of [-b.iw + 1.5, b.iw - 1.5]) prop(S, 'tree', b.cx + x, b.cz - b.iw + 2.5, R() * 6);
    prop(S, 'bench', b.cx - 5, b.cz - 4.5, 0);
    prop(S, 'bench', b.cx + 5, b.cz - 4.5, 0);
    prop(S, 'dumpster', b.cx + b.iw - 2, b.cz - 5, 0);
  },
  // заправка: навес, колонки, бочки (взрываются!)
  gas(S, b) {
    const R = S.R;
    const g = S.gid();
    S.ground.push({ t: 'asphalt', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    const cx = b.cx, cz = b.cz - 2;
    for (const [x, z] of [[-4, -2.5], [4, -2.5], [-4, 2.5], [4, 2.5]]) block(S, 'plain', 'metal', [0.4, 4, 0.4], cx + x, 2, cz + z, 0, 0xeeeeee, g);
    block(S, 'canopy', 'metal', [10, 0.6, 7], cx, 4.3, cz, 0, 0xffffff, g);
    for (const x of [-2, 2]) prop(S, 'pump', cx + x, cz, 0);
    building(S, { cx: b.cx, cz: b.cz + b.iw - 3.5, w: 9, d: 5.5, floors: 1, ry: 0, look: 'shop', door: 'shopDoor', mat: 'brick', tint: 0xf6f6f6, roof: 'flat', top: ['sign', 'ac'], seg: 3 });
    for (let k = 0; k < 6; k++) prop(S, 'barrel', b.cx + b.iw - 1.2 - (k % 2) * 0.9, b.cz - b.iw + 1.5 + Math.floor(k / 2) * 0.9, 0);
    for (let k = 0; k < 4; k++) prop(S, 'cone', b.cx - b.iw + 1 + k * 1.2, b.cz - b.iw + 1, 0);
    S.items.push({ kind: 'car', look: 'car', shape: 'box', size: CAR_SIZE.car, mat: 'prop', tint: pick(CAR_TINTS, R), x: cx - 2, y: 0.75, z: cz + 2.4, ry: Math.PI / 2, pts: PROP_PTS.car });
  },
  // кирпичная школа / офис
  office(S, b) {
    const R = S.R;
    building(S, { cx: b.cx, cz: b.cz + 2, w: b.iw * 2 - 4, d: 10, floors: 3, ry: 0, look: 'brick', door: 'bigDoor', mat: 'brick', tint: pick([0xd8785a, 0xc8684a, 0xe09070], R), roof: 'flat', top: ['ac', 'ac', 'tank'], seg: 3.6 });
    S.ground.push({ t: 'plaza', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz - 3.5 });
    prop(S, 'statue', b.cx, b.cz - 6.5, 0);
    for (const x of [-6, 6]) prop(S, 'flowers', b.cx + x, b.cz - 6.5, 0);
    for (const x of [-9, -3, 3, 9]) prop(S, 'tree', b.cx + x, b.cz - 9.5, R() * 6);
    for (let k = 0; k < 4; k++) prop(S, 'bike', b.cx - 8 + k * 0.7, b.cz - 3.8, 0);
  },
  // площадь с киосками и кафе
  plaza(S, b) {
    const R = S.R;
    S.ground.push({ t: 'plaza', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    prop(S, 'statue', b.cx, b.cz, 0);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      prop(S, 'kiosk', b.cx + Math.cos(a) * 7, b.cz + Math.sin(a) * 7, -a + Math.PI / 2);
    }
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2;
      prop(S, 'umbrella', b.cx + Math.cos(a) * 4.5, b.cz + Math.sin(a) * 4.5, 0);
      prop(S, 'pot', b.cx + Math.cos(a) * 2.4, b.cz + Math.sin(a) * 2.4, 0);
    }
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) prop(S, 'tree', b.cx + x * (b.iw - 1.5), b.cz + z * (b.iw - 1.5), R() * 6);
    prop(S, 'billboard', b.cx, b.cz + b.iw - 1, 0);
  },
  // стоянка
  parking(S, b) {
    const R = S.R;
    S.ground.push({ t: 'parking', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz - 1, n: 7 });
    S.ground.push({ t: 'parking', x0: b.cx - b.iw, z0: b.cz + 1, x1: b.cx + b.iw, z1: b.cz + b.iw, n: 7 });
    for (const zz of [-1, 1])
      for (let k = 0; k < 7; k++) {
        if (R() < 0.3) continue;
        const look = R() < 0.15 ? 'van' : 'car';
        S.items.push({ kind: 'car', look, shape: 'box', size: CAR_SIZE[look], mat: 'prop', tint: pick(CAR_TINTS, R), x: b.cx - b.iw + (k + 0.5) * (b.iw * 2) / 7, y: CAR_SIZE[look][1] / 2, z: b.cz + zz * b.iw * 0.55, ry: zz > 0 ? 0 : Math.PI, pts: PROP_PTS[look] });
      }
    prop(S, 'kiosk', b.cx + b.iw - 2, b.cz, Math.PI / 2);
    for (let k = 0; k < 5; k++) prop(S, 'cone', b.cx - b.iw + 2 + k * 1.4, b.cz, 0);
  },
  // ---------- порт ----------
  containers(S, b) {
    const R = S.R;
    S.ground.push({ t: 'asphalt', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    const tints = [0xd84a3a, 0x3a7fd8, 0xf2b62a, 0x3fae5a, 0xe86f2a, 0x8a5ad8, 0x2ab8b0];
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 5; col++) {
        if (R() < 0.15) continue;
        const x = b.cx - b.iw + 2.2 + col * 3.6, z = b.cz - b.iw + 4 + row * 7;
        const g = S.gid();
        const hgt = 1 + Math.floor(R() * 3);
        for (let k = 0; k < hgt; k++) prop(S, 'container', x, z, 0, { y: k * 2.6, tint: pick(tints, R), grp: g });
      }
    for (let k = 0; k < 4; k++) prop(S, 'crate', b.cx + b.iw - 1, b.cz - b.iw + 1.5 + k * 1.3, 0);
    prop(S, 'forklift', b.cx + b.iw - 3, b.cz - b.iw + 3, R() * 6);
  },
  warehouse(S, b) {
    const R = S.R;
    building(S, { cx: b.cx, cz: b.cz + 2, w: b.iw * 2 - 3, d: 12, floors: 2, fh: 3.5, ry: 0, look: 'metalwall', door: 'gate', mat: 'metal', tint: pick([0x9fb8c8, 0xc8b89f, 0xb0c8a8, 0xd0d0d8], R), roof: 'flat', top: ['ac', 'ac', 'ac'], seg: 4 });
    for (let k = 0; k < 6; k++) prop(S, 'pallet', b.cx - b.iw + 1.5 + k * 1.6, b.cz - b.iw + 1.5, 0);
    for (let k = 0; k < 3; k++) prop(S, 'crate', b.cx - b.iw + 2 + k * 1.3, b.cz - b.iw + 3.2, 0, { y: 0 });
    prop(S, 'forklift', b.cx + 2, b.cz - b.iw + 3, Math.PI / 2);
    for (let k = 0; k < 4; k++) prop(S, 'barrel', b.cx + b.iw - 1 - (k % 2) * 0.9, b.cz - b.iw + 1.2 + Math.floor(k / 2) * 0.9, 0);
  },
  crane(S, b) {
    const R = S.R;
    S.ground.push({ t: 'asphalt', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    // портальный кран: ноги, балки, кабина
    const g = S.gid();
    const H = 12;
    const y = 0xf2b62a;
    for (const [x, z] of [[-5, -3], [5, -3], [-5, 3], [5, 3]]) {
      for (let k = 0; k < 3; k++) block(S, 'plain', 'metal', [0.6, H / 3, 0.6], b.cx + x, H / 6 + k * (H / 3), b.cz + z, 0, y, g);
    }
    block(S, 'plain', 'metal', [11.2, 0.8, 0.8], b.cx, H + 0.4, b.cz - 3, 0, y, g);
    block(S, 'plain', 'metal', [11.2, 0.8, 0.8], b.cx, H + 0.4, b.cz + 3, 0, y, g);
    block(S, 'plain', 'metal', [0.8, 0.8, 5.2], b.cx - 5, H + 0.4, b.cz, 0, y, g);
    block(S, 'plain', 'metal', [0.8, 0.8, 5.2], b.cx + 5, H + 0.4, b.cz, 0, y, g);
    block(S, 'cabin', 'metal', [2, 2, 2], b.cx + 1, H + 1.8, b.cz, 0, 0xffffff, g);
    // под краном контейнеры
    const tints = [0xd84a3a, 0x3a7fd8, 0x3fae5a, 0xe86f2a];
    for (let k = 0; k < 2; k++) {
      const gg = S.gid();
      for (let h = 0; h < 2; h++) prop(S, 'container', b.cx - 1.5 + k * 3, b.cz, 0, { y: h * 2.6, tint: pick(tints, R), grp: gg });
    }
    for (let k = 0; k < 5; k++) prop(S, 'crate', b.cx - b.iw + 1.5 + k * 1.3, b.cz + b.iw - 1.5, 0);
    for (let k = 0; k < 3; k++) prop(S, 'buoy', b.cx + b.iw - 1.5, b.cz + b.iw - 2 - k * 1.2, 0);
    prop(S, 'anchor', b.cx - b.iw + 2, b.cz - b.iw + 2, 0.4);
  },
  lighthouse(S, b) {
    const R = S.R;
    S.ground.push({ t: 'sand', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw, r: 2 });
    const g = S.gid();
    let y = 0;
    const segs = [[4.6, 3, 0xffffff], [4.2, 3, 0xe84a3a], [3.8, 3, 0xffffff], [3.4, 3, 0xe84a3a], [3.0, 3, 0xffffff]];
    for (const [dm, h, c] of segs) {
      block(S, 'plain', 'stone', [dm, h, dm], b.cx, y + h / 2, b.cz, 0, c, g, 'cyl');
      y += h;
    }
    block(S, 'lamp', 'glass', [2.4, 2, 2.4], b.cx, y + 1, b.cz, 0, 0xfff2b0, g, 'cyl');
    block(S, 'plain', 'metal', [3.0, 0.8, 3.0], b.cx, y + 2.4, b.cz, 0, 0xe84a3a, g, 'cyl');
    building(S, { cx: b.cx + 6, cz: b.cz - 6, w: 5, d: 5, floors: 1, ry: 0.3, look: 'house', door: 'houseDoor', mat: 'wood', tint: 0xffffff, roof: 'gable', roofTint: 0x4f7fb0, seg: 2.6 });
    for (let k = 0; k < 6; k++) prop(S, 'buoy', b.cx - 7 + (k % 3) * 1.4, b.cz + 6 + Math.floor(k / 3) * 1.4, 0);
    prop(S, 'anchor', b.cx - 7, b.cz - 7, 0.6);
    for (let k = 0; k < 3; k++) prop(S, 'palm', b.cx + (R() - 0.5) * 16, b.cz + 8 + R() * 2, R() * 6);
  },
  // ---------- мегаполис ----------
  skyscraper(S, b) {
    const neon = S.theme === 'neoncity', town = S.theme === 'town';
    const floors = town ? 16 : neon ? 22 : 20 + (S.R() > .5 ? 2 : 0);
    const w = town ? 8 : 9, d = town ? 8 : 8.5;
    const start = S.items.length;
    // One panel per wall keeps tall buildings within the existing physics envelope.
    const tower = building(S, {
      cx: b.cx, cz: b.cz, w, d, floors, fh: neon ? 3.5 : 3.3, seg: 9,
      look: town ? 'office' : 'glass', groundLook: 'lobby', door: 'lobbyDoor',
      mat: town ? 'concrete' : 'glass', tint: town ? 0xa8b9cb : neon ? 0x718bbb : 0x83bdcf,
      slabTint: 0xc6d0da, slabAccents: neon ? { 6: 0x73e9ef, 13: 0xff8bdb, 20: 0x73e9ef } : null,
      roof: 'flat', top: [],
    });
    const roofPart = (size, bottom, tint, shape = 'box') =>
      block(S, 'plain', 'metal', size, b.cx, tower.h + bottom + size[1] / 2, b.cz, 0, tint, tower.g, shape);
    if (neon) {
      roofPart([6.5, 1.6, 6], 0, 0x7ee2e7);
      roofPart([4.8, 1.3, 4.5], 1.6, 0xc293ef);
    } else {
      roofPart([w * .8, 1.4, d * .8], 0, town ? 0x7196ac : 0x88cadb);
      roofPart([.3, town ? 3 : 6, .3], 1.4, 0xb9d9e2, 'cyl');
    }
    const parts = S.items.slice(start);
    for (const part of parts) part.keepTint = true;
    const height = Math.max(...parts.map(part => part.y + part.size[1] / 2));
    S.landmarks.push({ type: 'skyscraper', group: tower.g, x: b.cx, z: b.cz, floors, height, parts: parts.length });
    S.ground.push({ t: 'plaza', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      prop(S, town ? 'pot' : 'bench', b.cx + x * (b.iw - 1.4), b.cz + z * (b.iw - 1.4), x < 0 ? Math.PI / 2 : 0);
  },
  tower(S, b) {
    const R = S.R;
    const w = 10 + Math.floor(R() * 3) * 2, d = 10;
    building(S, { cx: b.cx, cz: b.cz, w, d, floors: 5 + Math.floor(R() * 4), fh: 4.5, ry: 0, look: 'glass', groundLook: 'lobby', door: 'lobbyDoor', mat: 'glass', tint: pick([0x8fc8f0, 0x9ad8d0, 0xb8b0f0, 0xa0d0ff, 0xf0d0a0], R), slabTint: 0xc8d4e0, roof: 'flat', top: ['antenna', 'tank', 'ac', 'ac'], seg: 3.4 });
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) prop(S, R() < 0.5 ? 'palm' : 'pot', b.cx + x * (b.iw - 1.2), b.cz + z * (b.iw - 1.2), 0);
    S.ground.push({ t: 'plaza', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
  },
  twin(S, b) {
    const R = S.R;
    S.ground.push({ t: 'plaza', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    for (const s of [-1, 1]) building(S, { cx: b.cx + s * 6, cz: b.cz, w: 8, d: 8, floors: 4 + Math.floor(R() * 3), fh: 4, ry: 0, look: R() < 0.5 ? 'glass' : 'office', groundLook: 'lobby', door: 'lobbyDoor', mat: 'glass', tint: pick([0x8fc8f0, 0xf0d0a0, 0xc8f0d0, 0xf0b8c8], R), slabTint: 0xd0d8e0, roof: 'flat', top: ['antenna', 'ac'], seg: 2.8 });
    prop(S, 'billboard', b.cx, b.cz - b.iw + 1, 0);
  },
  mall(S, b) {
    const R = S.R;
    building(S, { cx: b.cx, cz: b.cz + 3, w: b.iw * 2 - 2, d: 11, floors: 2, fh: 4, ry: 0, look: 'office', groundLook: 'shop', door: 'lobbyDoor', mat: 'glass', tint: pick([0xf6e6c8, 0xe6f0f6], R), roof: 'flat', top: ['sign', 'ac', 'ac', 'billboard'], seg: 3.6 });
    S.ground.push({ t: 'parking', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz - 3, n: 8 });
    for (let k = 0; k < 8; k++) if (R() < 0.6) S.items.push({ kind: 'car', look: 'car', shape: 'box', size: CAR_SIZE.car, mat: 'prop', tint: pick(CAR_TINTS, R), x: b.cx - b.iw + (k + 0.5) * (b.iw * 2) / 8, y: 0.75, z: b.cz - b.iw * 0.6, ry: 0, pts: PROP_PTS.car });
  },
  // ---------- замковый город ----------
  cottages(S, b) {
    const R = S.R;
    const q = b.iw / 2;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = b.cx + sx * q, cz = b.cz + sz * q;
      building(S, { cx, cz, w: 5 + R() * 1.4, d: 4.6 + R() * 1.2, floors: R() < 0.4 ? 2 : 1, ry: sz > 0 ? 0 : Math.PI, look: 'timber', door: 'timberDoor', mat: 'wood', tint: pick([0xfff4dc, 0xf6e6c4, 0xffe8d0], R), roof: 'gable', roofTint: pick([0x9a5a3a, 0xc8a050, 0x7a4a3a], R), chimney: R() < 0.6, seg: 2.6 });
      prop(S, R() < 0.5 ? 'hay' : 'barrel', cx + sx * (q - 1), cz - sz * (q - 1), 0, { mat: 'prop' });
      prop(S, 'tree', cx - sx * (q - 1.2), cz + sz * (q - 1.6), R() * 6);
      for (let k = -1; k <= 1; k++) prop(S, 'fence', cx + k * 2, cz + sz * (q - 0.2), 0);
    }
  },
  market(S, b) {
    const R = S.R;
    S.ground.push({ t: 'cobble2', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    prop(S, 'well', b.cx, b.cz, 0);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      prop(S, 'stall', b.cx + Math.cos(a) * 7, b.cz + Math.sin(a) * 7, -a - Math.PI / 2, { tint: pick([0xe84a3a, 0x3a7fd8, 0xf2b62a, 0x3fae5a], R) });
    }
    for (let k = 0; k < 8; k++) prop(S, R() < 0.5 ? 'barrel' : 'crate', b.cx + (R() - 0.5) * 16, b.cz + (R() - 0.5) * 16, R() * 6, { mat: 'prop' });
    prop(S, 'cart', b.cx + 4, b.cz - 3, 0.5);
  },
  keep(S, b) {
    // замок: стены из камня, башни-цилиндры по углам, донжон
    const R = S.R;
    const g = S.gid();
    const W = b.iw - 1;
    const wallH = 4;
    const stoneT = 0xd8d0c0;
    for (const side of [0, 1, 2, 3]) {
      const n = 5;
      for (let k = 0; k < n; k++) {
        const along = -W + (2 * W * (k + 0.5)) / n;
        if (side === 3 && k === 2) continue; // ворота
        const sz = (2 * W) / n;
        const [x, z, ry] = side === 0 ? [W, along, Math.PI / 2] : side === 1 ? [-W, along, Math.PI / 2] : side === 2 ? [along, W, 0] : [along, -W, 0];
        for (let h = 0; h < 2; h++) block(S, 'stone', 'stone', [sz, wallH / 2, 1.2], b.cx + x, wallH / 4 + h * (wallH / 2), b.cz + z, ry, stoneT, g);
        block(S, 'stone', 'stone', [sz * 0.45, 0.8, 1.2], b.cx + x, wallH + 0.4, b.cz + z, ry, stoneT, g);
      }
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      let y = 0;
      for (let h = 0; h < 3; h++) {
        block(S, 'stone', 'stone', [3.2, 2.2, 3.2], b.cx + sx * W, y + 1.1, b.cz + sz * W, 0, stoneT, g, 'cyl');
        y += 2.2;
      }
      block(S, 'cone', 'wood', [3.8, 2.6, 3.8], b.cx + sx * W, y + 1.3, b.cz + sz * W, 0, 0x4f6fb0, g, 'cyl');
    }
    building(S, { cx: b.cx, cz: b.cz + 2, w: 7, d: 7, floors: 3, ry: 0, look: 'stone', door: 'castleDoor', mat: 'stone', tint: 0xe0d8c8, roof: 'gable', roofTint: 0x4f6fb0, seg: 3.5 });
    prop(S, 'well', b.cx - 5, b.cz - 5, 0);
    for (let k = 0; k < 4; k++) prop(S, 'torch', b.cx - 3 + k * 2, b.cz - W + 1.2, 0);
  },
  farm(S, b) {
    const R = S.R;
    S.ground.push({ t: 'field', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz - 2 });
    building(S, { cx: b.cx + 3, cz: b.cz + b.iw - 4.5, w: 10, d: 7, floors: 1, fh: 4, ry: 0, look: 'barn', door: 'barnDoor', mat: 'wood', tint: 0xc8443a, roof: 'gable', roofTint: 0x6a5a4a, seg: 3.4 });
    for (let k = 0; k < 8; k++) prop(S, 'hay', b.cx - b.iw + 2 + (k % 4) * 2.6, b.cz - b.iw + 2 + Math.floor(k / 4) * 3, 0);
    prop(S, 'cart', b.cx - 6, b.cz + 4, 1.2);
    for (let k = 0; k < 5; k++) prop(S, 'fence', b.cx - b.iw + 1 + k * 2, b.cz - 1.4, 0);
    prop(S, 'tree', b.cx - b.iw + 2, b.cz + b.iw - 2, 0);
  },
  chapel(S, b) {
    const R = S.R;
    S.ground.push({ t: 'cobble2', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    const r = building(S, { cx: b.cx, cz: b.cz + 2, w: 7, d: 12, floors: 2, fh: 3.5, ry: 0, look: 'stone', door: 'castleDoor', mat: 'stone', tint: 0xf0e8d8, roof: 'gable', roofTint: 0x8a4a3a, seg: 3.5 });
    // колокольня
    const g = S.gid();
    let y = 0;
    for (let h = 0; h < 4; h++) {
      block(S, 'stone', 'stone', [3, 3, 3], b.cx, y + 1.5, b.cz - 6, 0, 0xf0e8d8, g);
      y += 3;
    }
    block(S, 'cone', 'wood', [3.4, 4, 3.4], b.cx, y + 2, b.cz - 6, 0, 0x8a4a3a, g, 'cyl');
    for (let k = 0; k < 4; k++) prop(S, 'tree', b.cx + (k < 2 ? -1 : 1) * (b.iw - 1.5), b.cz + (k % 2 ? 1 : -1) * (b.iw - 2), R() * 6);
  },
  // ---------- курорт ----------
  hotel(S, b) {
    const R = S.R;
    building(S, { cx: b.cx, cz: b.cz + b.iw - 4.6, w: b.iw * 2 - 3, d: 8, floors: 4 + Math.floor(R() * 3), ry: Math.PI, look: 'hotel', door: 'hotelDoor', mat: 'concrete', tint: pick([0xffffff, 0xfff0d8, 0xd8f0ff, 0xffe0e8, 0xe0f8e8], R), roof: 'flat', top: ['parasol', 'parasol', 'tank'], seg: 3.2 });
    S.ground.push({ t: 'plaza', x0: b.cx - b.iw + 0.5, z0: b.cz - b.iw + 0.5, x1: b.cx + b.iw - 0.5, z1: b.cz + b.iw - 9 });
    S.ground.push({ t: 'pool', x0: b.cx - 6, z0: b.cz - b.iw + 4, x1: b.cx + 6, z1: b.cz - 0.5, r: 1.5 });
    for (let k = 0; k < 6; k++) prop(S, 'sunbed', b.cx - 6.5 + k * 2.6, b.cz - b.iw + 2, Math.PI, { tint: pick(FUN, R) });
    for (const x of [-8, 8]) {
      prop(S, 'parasol', b.cx + x, b.cz - b.iw + 3, 0, { tint: pick(FUN, R) });
      prop(S, 'palm', b.cx + x, b.cz - 1.5, R() * 6);
    }
    prop(S, 'beachball', b.cx + (R() - 0.5) * 8, b.cz - 4, 0, { tint: 0xffffff });
  },
  beachfront(S, b) {
    const R = S.R;
    S.ground.push({ t: 'water', x0: b.cx - b.iw + 0.4, z0: b.cz + b.iw - 5, x1: b.cx + b.iw - 0.4, z1: b.cz + b.iw - 0.4, r: 2 });
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 4; col++) {
        if (R() < 0.2) continue;
        const x = b.cx - b.iw + 3 + col * ((b.iw * 2 - 6) / 3), z = b.cz - b.iw + 2.8 + row * 4.6;
        const c = pick(FUN, R);
        prop(S, 'parasol', x, z, 0, { tint: c });
        prop(S, 'sunbed', x - 0.6, z + 1.4, 0, { tint: c });
        if (R() < 0.6) prop(S, 'sunbed', x + 0.6, z + 1.4, 0, { tint: c });
      }
    prop(S, 'lifeguard', b.cx + b.iw - 2.5, b.cz + 2, -Math.PI / 2, { tint: 0xffffff });
    for (let k = 0; k < 2; k++) prop(S, 'sandcastle', b.cx - 4 + k * 7 + R() * 2, b.cz + 3.5 + R(), R() * 6);
    for (let k = 0; k < 3; k++) prop(S, 'beachball', b.cx + (R() - 0.5) * 14, b.cz + 4 + R() * 2, 0);
    for (let k = 0; k < 3; k++) prop(S, 'surfboard', b.cx - b.iw + 1.2 + k * 0.8, b.cz + 2, 0.2, { tint: pick(FUN, R) });
  },
  villas(S, b) {
    const R = S.R;
    const q = b.iw / 2;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = b.cx + sx * q, cz = b.cz + sz * q;
      const ry = sz > 0 ? 0 : Math.PI;
      building(S, { cx: cx + (R() - 0.5), cz: cz - sz * 0.8, w: 5.4 + R() * 0.8, d: 5, floors: R() < 0.5 ? 2 : 1, ry, look: 'house', door: 'houseDoor', mat: 'concrete', tint: pick([0xffffff, 0xf6f0e6, 0xd8ecff, 0xfff0c8, 0xffe0d8], R), roof: 'flat', top: ['pot', 'parasol'], seg: 2.8 });
      prop(S, 'palm', cx + sx * (q - 1.2), cz - sz * (q - 1.4), R() * 6);
      prop(S, 'sunbed', cx - sx * (q - 1.4), cz + sz * (q - 1.2), ry, { tint: pick(FUN, R) });
      if (R() < 0.6) prop(S, 'flowers', cx + 1.5, cz + sz * (q - 0.8), 0);
      if (R() < 0.35) prop(S, 'surfboard', cx + sx * 3.2, cz + sz * 2.2, ry, { tint: pick(FUN, R) });
    }
  },
  cafes(S, b) {
    const R = S.R;
    S.ground.push({ t: 'plaza', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    for (const s of [-1, 1]) building(S, { cx: b.cx + s * (b.iw / 2), cz: b.cz + b.iw - 4, w: b.iw - 1, d: 7, floors: 2, ry: 0, look: 'hotel', groundLook: 'shop', door: 'shopDoor', mat: 'brick', tint: pick([0xfff0d8, 0xd8f0ff, 0xffe0e8, 0xffffff], R), roof: 'flat', top: ['ac', 'sign'], seg: 3.2 });
    for (let k = 0; k < 6; k++) prop(S, 'umbrella', b.cx - b.iw + 3 + (k % 3) * ((b.iw * 2 - 6) / 2), b.cz - 2 - Math.floor(k / 3) * 5.5, 0);
    prop(S, 'icecart', b.cx - 2, b.cz + 1.5, 0, { tint: 0xffe0ec });
    prop(S, 'icecart', b.cx + 3, b.cz + 1.5, 0, { tint: 0xbfeaff });
    prop(S, 'kiosk', b.cx + b.iw - 2, b.cz - b.iw + 2.2, Math.PI / 2, { tint: pick(FUN, R) });
    for (const x of [-b.iw + 1, b.iw - 1]) prop(S, 'palm', b.cx + x, b.cz + 1, R() * 6);
  },
  aqua(S, b) {
    const R = S.R;
    S.ground.push({ t: 'plaza', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    S.ground.push({ t: 'pool', x0: b.cx - b.iw + 3.5, z0: b.cz - b.iw + 4, x1: b.cx + b.iw - 3.5, z1: b.cz + b.iw - 4, r: 4 });
    for (const [x, z, ry] of [[-b.iw + 2, -3, Math.PI / 2], [-b.iw + 2, 4, Math.PI / 2], [b.iw - 2, -3, -Math.PI / 2], [b.iw - 2, 4, -Math.PI / 2]]) prop(S, 'slide', b.cx + x, b.cz + z, ry);
    for (let k = 0; k < 7; k++) prop(S, 'sunbed', b.cx - 7.5 + k * 2.5, b.cz - b.iw + 1.8, Math.PI, { tint: pick(FUN, R) });
    for (let k = 0; k < 4; k++) prop(S, 'parasol', b.cx - 6 + k * 4, b.cz + b.iw - 1.8, 0, { tint: pick(FUN, R) });
    prop(S, 'lifeguard', b.cx, b.cz + b.iw - 2, Math.PI, { tint: 0xffffff });
    for (let k = 0; k < 4; k++) prop(S, 'beachball', b.cx + (R() - 0.5) * 10, b.cz + (R() - 0.5) * 8, 0);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) prop(S, 'palm', b.cx + x * (b.iw - 1), b.cz + z * (b.iw - 1), R() * 6);
  },
  // ---------- зимний городок ----------
  chalets(S, b) {
    const R = S.R;
    const q = b.iw / 2;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = b.cx + sx * q, cz = b.cz + sz * q;
      const ry = sz > 0 ? 0 : Math.PI;
      building(S, { cx: cx + (R() - 0.5), cz: cz - sz * 0.6, w: 5.2 + R() * 1.2, d: 5 + R() * 0.8, floors: R() < 0.5 ? 2 : 1, ry, look: 'chalet', door: 'chaletDoor', mat: 'wood', tint: pick([0xc8905a, 0xb07848, 0xd8a070, 0xa86a40], R), roof: 'gable', roofTint: SNOW, chimney: true, seg: 2.8 });
      prop(S, 'snowpine', cx + sx * (q - 1.2), cz - sz * (q - 1.4), R() * 6);
      if (R() < 0.7) prop(S, 'snowman', cx - sx * (q - 1.4), cz + sz * (q - 1.4), ry, { tint: pick(FUN, R) });
      if (R() < 0.5) prop(S, 'sled', cx + 2.2, cz + sz * (q - 1), 0.4, { tint: pick(FUN, R) });
      const fz = cz + sz * (q - 0.3);
      for (let k = -2; k <= 2; k++) if (k !== 0) prop(S, 'fence', cx + k * 2, fz, 0);
    }
  },
  rink(S, b) {
    const R = S.R;
    const e = b.iw - 2.5;
    S.ground.push({ t: 'ice', x0: b.cx - e, z0: b.cz - e, x1: b.cx + e, z1: b.cz + e, r: 4 });
    for (let k = -3; k <= 3; k++) {
      if (k === 0) continue;
      prop(S, 'fence', b.cx + k * 2.4, b.cz - e - 0.4, 0);
      prop(S, 'fence', b.cx + k * 2.4, b.cz + e + 0.4, 0);
      prop(S, 'fence', b.cx - e - 0.4, b.cz + k * 2.4, Math.PI / 2);
      prop(S, 'fence', b.cx + e + 0.4, b.cz + k * 2.4, Math.PI / 2);
    }
    prop(S, 'snowman', b.cx, b.cz, 0, { tint: pick(FUN, R) });
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) prop(S, 'lamp', b.cx + x * (e + 1.2), b.cz + z * (e + 1.2), 0);
    prop(S, 'kiosk', b.cx + b.iw - 1.4, b.cz, Math.PI / 2, { tint: 0xe84a3a });
    for (let k = 0; k < 3; k++) prop(S, 'sled', b.cx + (R() - 0.5) * 10, b.cz + (R() - 0.5) * 10, R() * 6, { tint: pick(FUN, R) });
  },
  xmasfair(S, b) {
    const R = S.R;
    S.ground.push({ t: 'snowwalk', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    prop(S, 'xtree', b.cx, b.cz, 0);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      prop(S, 'stall', b.cx + Math.cos(a) * 8, b.cz + Math.sin(a) * 8, -a - Math.PI / 2, { tint: pick([0xe84a3a, 0x3f8a5a, 0xf2b62a, 0xffffff], R) });
    }
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + R();
      prop(S, 'gift', b.cx + Math.cos(a) * 3.4, b.cz + Math.sin(a) * 3.4, R() * 6, { tint: pick(FUN, R) });
    }
    for (const [x, z] of [[-1, -1], [1, 1]]) prop(S, 'snowman', b.cx + x * (b.iw - 1.5), b.cz + z * (b.iw - 1.5), R() * 6, { tint: pick(FUN, R) });
    for (const [x, z] of [[1, -1], [-1, 1]]) prop(S, 'bench', b.cx + x * (b.iw - 1.5), b.cz + z * (b.iw - 1.5), 0);
  },
  forest(S, b) {
    const R = S.R;
    building(S, { cx: b.cx, cz: b.cz, w: 5, d: 4.6, floors: 1, ry: R() < 0.5 ? 0 : Math.PI, look: 'chalet', door: 'chaletDoor', mat: 'wood', tint: 0xb07848, roof: 'gable', roofTint: SNOW, chimney: true, seg: 2.5 });
    for (let k = 0; k < 14; k++) {
      let x, z;
      do {
        x = (R() * 2 - 1) * (b.iw - 1.2);
        z = (R() * 2 - 1) * (b.iw - 1.2);
      } while (Math.abs(x) < 4.5 && Math.abs(z) < 4.5);
      prop(S, R() < 0.85 ? 'snowpine' : 'pine', b.cx + x, b.cz + z, R() * 6);
    }
    for (let k = 0; k < 3; k++) prop(S, 'sled', b.cx - 3 + k * 1.2, b.cz + 4, 0.2, { tint: pick(FUN, R) });
    prop(S, 'snowman', b.cx + 3.5, b.cz - 3.5, R() * 6, { tint: pick(FUN, R) });
  },
  // ---------- парк аттракционов ----------
  carousel(S, b) {
    const R = S.R;
    S.ground.push({ t: 'plaza', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw, r: b.iw });
    const g = S.gid();
    block(S, 'plain', 'wood', [11, 0.6, 11], b.cx, 0.3, b.cz, 0, 0xffd24a, g, 'cyl');
    block(S, 'plain', 'wood', [1.4, 5, 1.4], b.cx, 3.1, b.cz, 0, 0xffffff, g, 'cyl');
    block(S, 'tent', 'wood', [12, 3.4, 12], b.cx, 7.3, b.cz, 0, pick([0xe84a3a, 0x3f8fe8, 0x9a6ae0], R), g, 'cone');
    block(S, 'plain', 'wood', [0.8, 0.8, 0.8], b.cx, 9.3, b.cz, 0, 0xffd24a, g, 'ball');
    for (const [rr, n] of [[4.3, 10], [2.5, 6]])
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        prop(S, 'horse', b.cx + Math.cos(a) * rr, b.cz + Math.sin(a) * rr, -a, { y: 0.6, tint: pick([0xffffff, 0xf6e0c0, 0x8a5a3a, 0x3a3a44, 0xffe0f0], R) });
      }
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) prop(S, R() < 0.5 ? 'balloons' : 'candy', b.cx + x * (b.iw - 1.5), b.cz + z * (b.iw - 1.5), 0, { tint: pick(FUN, R) });
  },
  ferris(S, b) {
    const R = S.R;
    S.ground.push({ t: 'plaza', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    const g = S.gid();
    const cx = b.cx, cz = b.cz + 1;
    const RW = 8.5, H = 10.4;
    const put = (look, size, x, y, z, ry, rz, tint, shape = 'box') => S.items.push({ kind: 'block', look, mat: 'metal', shape, size, x, y, z, q: quat(ry, rz), tint, grp: g });
    // две окружности обода
    const N = 16, L = 2 * RW * Math.sin(Math.PI / N) + 0.3;
    for (const zz of [-0.8, 0.8])
      for (let k = 0; k < N; k++) {
        const a = ((k + 0.5) / N) * Math.PI * 2;
        put('plain', [L, 0.45, 0.45], cx + Math.cos(a) * RW, H + Math.sin(a) * RW, cz + zz, 0, a + Math.PI / 2, k % 2 ? 0xffffff : 0xff6a8a);
      }
    // спицы и ось
    for (const zz of [-0.8, 0.8]) for (let k = 0; k < 4; k++) put('plain', [RW * 2, 0.22, 0.22], cx, H, cz + zz, 0, (k * Math.PI) / 4, 0xe8e8f0);
    put('plain', [1.3, 3.8, 1.3], cx, H, cz, Math.PI / 2, Math.PI / 2, 0xffd24a, 'cyl');
    // опоры буквой А
    const lean = Math.atan2(4.6, H), len = Math.hypot(4.6, H);
    for (const zz of [-1.7, 1.7]) for (const s of [-1, 1]) put('plain', [0.6, len, 0.6], cx + s * 2.3, H / 2, cz + zz, 0, s * lean, 0x3f8fe8);
    // кабинки висят на ободе
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      prop(S, 'gondola', cx + Math.cos(a) * RW, cz, 0, { y: H + Math.sin(a) * RW - 1.6, tint: FUN[k % FUN.length] });
    }
    prop(S, 'kiosk', b.cx - b.iw + 2, b.cz - b.iw + 2, 0, { tint: 0xff7ab0 });
    for (let k = 0; k < 4; k++) prop(S, 'fence', b.cx - 4 + k * 2, b.cz - 4.5, 0);
    prop(S, 'balloons', b.cx + b.iw - 2, b.cz - b.iw + 2, 0, { tint: pick(FUN, R) });
  },
  coaster(S, b) {
    const R = S.R;
    S.ground.push({ t: 'grass', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    const g = S.gid();
    const N = 28, ex = b.iw - 2, ez = b.iw - 3;
    const pts = [];
    for (let k = 0; k < N; k++) {
      const t = (k / N) * Math.PI * 2;
      const c = Math.cos(t), s = Math.sin(t);
      // скруглённый квадрат и волны высоты
      const x = b.cx + ex * Math.sign(c) * Math.abs(c) ** 0.6, z = b.cz + ez * Math.sign(s) * Math.abs(s) ** 0.6;
      const y = Math.max(1.4, 4 + 3 * Math.sin(t * 2) + 1.8 * Math.sin(t * 3 + 1));
      pts.push([x, y, z]);
    }
    const col = pick([0xe84a3a, 0x3f8fe8, 0x9a6ae0], R);
    for (let k = 0; k < N; k++) {
      const [x0, y0, z0] = pts[k], [x1, y1, z1] = pts[(k + 1) % N];
      const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, lh = Math.hypot(dx, dz);
      S.items.push({ kind: 'block', look: 'plain', mat: 'metal', shape: 'box', size: [Math.hypot(lh, dy) + 0.15, 0.35, 1.4], x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, q: quat(Math.atan2(-dz, dx), Math.atan2(dy, lh)), tint: col, grp: g });
      if (k % 2 === 0) block(S, 'plain', 'metal', [0.4, y0 - 0.2, 0.4], x0, (y0 - 0.2) / 2, z0, 0, 0xffffff, g);
    }
    // вагончики на самом верху
    let top = 0;
    for (let k = 0; k < N; k++) if (pts[k][1] > pts[top][1]) top = k;
    for (let k = 0; k < 3; k++) {
      const [x, y, z] = pts[(top + k) % N];
      prop(S, 'bumper', x, z, R() * 0.2, { y: y + 0.15, tint: FUN[(k * 3) % FUN.length] });
    }
    prop(S, 'kiosk', b.cx, b.cz, 0, { tint: 0x3fd0c8 });
    for (let k = 0; k < 3; k++) prop(S, 'bench', b.cx - 3 + k * 3, b.cz + 3, 0);
    prop(S, 'popcorn', b.cx - 3, b.cz - 3, 0);
  },
  circus(S, b) {
    const R = S.R;
    S.ground.push({ t: 'sand', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw, r: 3 });
    const tent = (cx, cz, r, h, col) => {
      const g = S.gid();
      const n = Math.max(8, Math.round(r * 2.4));
      const w = 2 * r * Math.sin(Math.PI / n) + 0.15;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        if (k === 0 && r > 3) continue; // вход
        block(S, 'tent', 'wood', [w, h, 0.3], cx + Math.cos(a) * r, h / 2, cz + Math.sin(a) * r, -a + Math.PI / 2, col, g);
      }
      block(S, 'tent', 'wood', [r * 2 + 1.2, r * 0.9, r * 2 + 1.2], cx, h + r * 0.45, cz, 0, col, g, 'cone');
      block(S, 'plain', 'metal', [0.15, 1.6, 0.15], cx, h + r * 0.9 + 0.8, cz, 0, 0xffffff, g);
      block(S, 'plain', 'wood', [1, 0.5, 0.08], cx + 0.5, h + r * 0.9 + 1.3, cz, 0, 0xffd24a, g);
    };
    tent(b.cx, b.cz, 5, 3.6, 0xe84a3a);
    tent(b.cx - b.iw + 3, b.cz + b.iw - 3, 2, 2.4, 0x3f8fe8);
    tent(b.cx + b.iw - 3, b.cz + b.iw - 3, 2, 2.4, 0xf2c230);
    for (let k = 0; k < 2; k++) prop(S, 'cart', b.cx - 6 + k * 12, b.cz - b.iw + 2.5, Math.PI / 2, { tint: pick(FUN, R) });
    prop(S, 'popcorn', b.cx + 2.5, b.cz - 7, 0);
    prop(S, 'balloons', b.cx - 2.5, b.cz - 7, 0, { tint: pick(FUN, R) });
  },
  bumpercars(S, b) {
    const R = S.R;
    S.ground.push({ t: 'arena', x0: b.cx - b.iw + 1, z0: b.cz - b.iw + 1, x1: b.cx + b.iw - 1, z1: b.cz + b.iw - 3, r: 2 });
    const g = S.gid();
    const ex = b.iw - 1.6, ez = b.iw - 2.5;
    for (const [x, z] of [[-ex, -ez], [ex, -ez], [-ex, ez - 2], [ex, ez - 2]]) block(S, 'plain', 'metal', [0.45, 4.6, 0.45], b.cx + x, 2.3, b.cz + z, 0, 0xffd24a, g);
    block(S, 'canopy', 'metal', [ex * 2 + 1, 0.6, (ez * 2 - 2) / 2 + 0.5], b.cx, 4.9, b.cz - (ez * 2 - 2) / 4 - 1, 0, 0xff7ab0, g);
    block(S, 'canopy', 'metal', [ex * 2 + 1, 0.6, (ez * 2 - 2) / 2 + 0.5], b.cx, 4.9, b.cz + (ez * 2 - 2) / 4 - 1, 0, 0xff7ab0, g);
    for (let k = 0; k < 9; k++) prop(S, 'bumper', b.cx + (R() - 0.5) * (ex * 2 - 3), b.cz - 1 + (R() - 0.5) * (ez * 2 - 5), R() * 6, { tint: FUN[k % FUN.length] });
    prop(S, 'kiosk', b.cx - b.iw + 2, b.cz + b.iw - 1.5, 0, { tint: 0xf2c230 });
    for (let k = 0; k < 3; k++) prop(S, 'bench', b.cx - 2 + k * 3, b.cz + b.iw - 1.3, 0);
  },
  foodcourt(S, b) {
    const R = S.R;
    S.ground.push({ t: 'plaza', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    for (let k = 0; k < 4; k++) prop(S, 'stall', b.cx - b.iw + 2.5 + k * ((b.iw * 2 - 5) / 3), b.cz + b.iw - 1.8, 0, { tint: FUN[(k * 2) % FUN.length] });
    for (let k = 0; k < 4; k++) prop(S, 'umbrella', b.cx - 6 + (k % 2) * 12, b.cz - 5 + Math.floor(k / 2) * 6, 0);
    for (let k = 0; k < 4; k++) prop(S, 'table', b.cx - 2 + (k % 2) * 4, b.cz - 3 + Math.floor(k / 2) * 4, 0);
    prop(S, 'popcorn', b.cx - b.iw + 1.5, b.cz - 2, Math.PI / 2);
    prop(S, 'icecart', b.cx + b.iw - 1.6, b.cz - 2, -Math.PI / 2, { tint: 0xffe0ec });
    prop(S, 'candy', b.cx, b.cz - b.iw + 1.5, 0, { tint: 0xff9ad0 });
    prop(S, 'balloons', b.cx + 3, b.cz - b.iw + 1.5, 0, { tint: pick(FUN, R) });
    for (const x of [-b.iw + 1, b.iw - 1]) prop(S, 'bin', b.cx + x, b.cz + 2, 0);
  },
  games(S, b) {
    const R = S.R;
    S.ground.push({ t: 'plaza', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    for (let k = 0; k < 3; k++) prop(S, 'kiosk', b.cx - 7 + k * 7, b.cz + b.iw - 1.6, 0, { tint: FUN[k * 2] });
    for (let k = 0; k < 3; k++) prop(S, 'stall', b.cx - 7 + k * 7, b.cz - b.iw + 1.8, Math.PI, { tint: FUN[k * 2 + 1] });
    // пирамида из ящиков — тир
    for (let row = 0; row < 3; row++) for (let k = 0; k <= 2 - row; k++) prop(S, 'crate', b.cx - 1.2 + k * 1.2 + row * 0.6, b.cz, 0, { y: row * 1.2 });
    for (let k = 0; k < 6; k++) prop(S, 'gift', b.cx + (R() - 0.5) * 14, b.cz + (R() - 0.5) * 8, R() * 6, { tint: pick(FUN, R) });
    for (const x of [-1, 1]) prop(S, 'balloons', b.cx + x * 6, b.cz + 2, 0, { tint: pick(FUN, R) });
  },
  // павильоны с игровыми автоматами
  pavilion(S, b) {
    const R = S.R;
    for (const s of [-1, 1]) building(S, { cx: b.cx + s * (b.iw / 2), cz: b.cz + b.iw - 4.5, w: b.iw - 1, d: 8, floors: 2, fh: 3.5, ry: 0, look: 'hotel', groundLook: 'shop', door: 'shopDoor', mat: 'brick', tint: pick([0xffd0e8, 0xd0e8ff, 0xfff0b0, 0xd8f8d0], R), roof: 'flat', top: ['balloons', 'sign', 'ac'], seg: 3.2 });
    S.ground.push({ t: 'plaza', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz });
    for (let k = 0; k < 3; k++) prop(S, 'umbrella', b.cx - 6 + k * 6, b.cz - 4, 0);
    prop(S, 'popcorn', b.cx - b.iw + 1.5, b.cz - b.iw + 1.5, 0);
    prop(S, 'candy', b.cx + b.iw - 1.5, b.cz - b.iw + 1.5, 0, { tint: 0xbfe6ff });
    for (let k = 0; k < 4; k++) prop(S, 'gift', b.cx - 3 + k * 2, b.cz - b.iw + 1.4, R() * 6, { tint: pick(FUN, R) });
  },
  // комната страха: мрачный особняк с башенками
  haunted(S, b) {
    const R = S.R;
    S.ground.push({ t: 'cobble2', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    building(S, { cx: b.cx, cz: b.cz + 2, w: 12, d: 9, floors: 2, fh: 3.5, ry: 0, look: 'stone', door: 'castleDoor', mat: 'stone', tint: 0xb0a0c8, roof: 'gable', roofTint: 0x4a2a5a, chimney: true, seg: 3 });
    const g = S.gid();
    for (const sx of [-1, 1]) {
      let y = 0;
      for (let h = 0; h < 4; h++) {
        block(S, 'stone', 'stone', [2.6, 2.2, 2.6], b.cx + sx * 7, y + 1.1, b.cz + 5.5, 0, 0xa898c0, g, 'cyl');
        y += 2.2;
      }
      block(S, 'cone', 'wood', [3.2, 3, 3.2], b.cx + sx * 7, y + 1.5, b.cz + 5.5, 0, 0x4a2a5a, g, 'cone');
    }
    for (let k = 0; k < 5; k++) prop(S, 'pine', b.cx - 8 + k * 4, b.cz - b.iw + 1.8, R() * 6);
    for (const x of [-3, 3]) prop(S, 'torch', b.cx + x, b.cz - 3, 0);
    prop(S, 'kiosk', b.cx + b.iw - 2, b.cz - 5, Math.PI / 2, { tint: 0x9a6ae0 });
  },
  // ---------- сакура ----------
  machiya(S, b) {
    const R = S.R;
    const q = b.iw / 2;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = b.cx + sx * q, cz = b.cz + sz * q;
      const ry = sz > 0 ? 0 : Math.PI;
      building(S, { cx: cx + (R() - 0.5), cz: cz - sz * 0.6, w: 5 + Math.floor(R() * 3) * 0.6, d: 5, floors: R() < 0.5 ? 2 : 1, ry, look: 'shoji', door: 'shojiDoor', mat: 'wood', tint: pick([0xf6ecd8, 0xefe2c8, 0xfaf2e4, 0xe8d8bc], R), roof: 'gable', roofTint: pick([0x3a3e4a, 0x4a5468, 0x5a3a32], R), seg: 2.4 });
      const fz = cz + sz * (q - 0.4);
      for (const k of [-2, 2]) prop(S, 'hedge', cx + k, fz, 0);
      prop(S, R() < 0.5 ? 'bamboo' : 'sakura', cx + sx * (q - 1.2), cz - sz * (q - 1.4), R() * 6);
      if (R() < 0.6) prop(S, 'plantern', cx + 0.5, fz - sz * 0.6, ry);
      if (R() < 0.4) prop(S, 'bike', cx - sx * 3, cz + sz * 2.4, ry + 0.3);
    }
  },
  temple(S, b) {
    const R = S.R;
    S.ground.push({ t: 'gravel', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    building(S, { cx: b.cx, cz: b.cz + 3.5, w: 12, d: 8, floors: 1, fh: 4, ry: Math.PI, look: 'shoji', door: 'shojiDoor', mat: 'wood', tint: 0xf4ead8, roof: 'gable', roofTint: 0x3a3e4a, seg: 3 });
    torii(S, b.cx, b.cz - b.iw + 2.5, 0);
    for (const s of [-1, 1]) for (let k = 0; k < 2; k++) prop(S, 'slantern', b.cx + s * 2.6, b.cz - 6 + k * 4, 0);
    for (const s of [-1, 1]) prop(S, 'sakura', b.cx + s * (b.iw - 2), b.cz - b.iw + 3, R() * 6);
    for (const s of [-1, 1]) prop(S, 'bamboo', b.cx + s * (b.iw - 1.2), b.cz + b.iw - 1.5, R() * 6);
  },
  pagoda(S, b) {
    const R = S.R;
    S.ground.push({ t: 'gravel', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw });
    const g = S.gid();
    let y = 0;
    const wall = 0xe0664a, roof = 0x3a3e4a;
    for (let t = 0; t < 5; t++) {
      const s = 7 - t * 1.05, h = t ? 2.3 : 3;
      for (const [x, z, ry] of [[0, s / 2, 0], [0, -s / 2, Math.PI], [s / 2, 0, Math.PI / 2], [-s / 2, 0, -Math.PI / 2]]) block(S, t ? 'shoji' : 'shojiDoor', 'wood', [s, h, 0.3], b.cx + x, y + h / 2, b.cz + z, ry, wall, g);
      y += h;
      block(S, 'plain', 'wood', [s + 3, 0.35, s + 3], b.cx, y + 0.17, b.cz, 0, roof, g);
      block(S, 'plain', 'wood', [s + 1.4, 0.45, s + 1.4], b.cx, y + 0.57, b.cz, 0, 0x5a6478, g);
      y += 0.8;
    }
    block(S, 'plain', 'metal', [0.35, 3, 0.35], b.cx, y + 1.5, b.cz, 0, 0xd8b040, g, 'cyl');
    for (let k = 0; k < 3; k++) block(S, 'plain', 'metal', [0.9 - k * 0.15, 0.15, 0.9 - k * 0.15], b.cx, y + 0.8 + k * 0.7, b.cz, 0, 0xd8b040, g, 'cyl');
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      prop(S, 'slantern', b.cx + x * 6.5, b.cz + z * 6.5, 0);
      prop(S, 'sakura', b.cx + x * (b.iw - 1.5), b.cz + z * (b.iw - 1.5), R() * 6);
    }
  },
  garden(S, b) {
    const R = S.R;
    S.ground.push({ t: 'water', x0: b.cx - 7, z0: b.cz - 5.5, x1: b.cx + 7, z1: b.cz + 3.5, r: 4.5 });
    // красный мостик через пруд
    const g = S.gid();
    const red = 0xe8442a;
    S.items.push({ kind: 'block', look: 'plain', mat: 'wood', shape: 'box', size: [3.2, 0.3, 2], x: b.cx - 2.9, y: 0.65, z: b.cz - 1, q: quat(0, 0.38), tint: red, grp: g });
    S.items.push({ kind: 'block', look: 'plain', mat: 'wood', shape: 'box', size: [3.2, 0.3, 2], x: b.cx + 2.9, y: 0.65, z: b.cz - 1, q: quat(0, -0.38), tint: red, grp: g });
    block(S, 'plain', 'wood', [3, 0.3, 2], b.cx, 1.25, b.cz - 1, 0, red, g);
    for (const x of [-1.4, 1.4]) for (const z of [-0.9, 0.9]) block(S, 'plain', 'wood', [0.18, 1.0, 0.18], b.cx + x, 1.9, b.cz - 1 + z, 0, red, g);
    for (const z of [-0.9, 0.9]) block(S, 'plain', 'wood', [3, 0.14, 0.14], b.cx, 2.35, b.cz - 1 + z, 0, red, g);
    for (let k = 0; k < 5; k++) prop(S, 'sakura', b.cx + (k - 2) * 4.4 + (R() - 0.5), b.cz + b.iw - 2 - (k % 2) * 1.5, R() * 6);
    for (let k = 0; k < 3; k++) prop(S, 'bamboo', b.cx - b.iw + 1.5, b.cz - b.iw + 2 + k * 2, R() * 6);
    for (const x of [-9, 9]) prop(S, 'slantern', b.cx + x, b.cz - 1, 0);
    for (const x of [-4, 4]) prop(S, 'bench', b.cx + x, b.cz - b.iw + 1.5, Math.PI);
    prop(S, 'koi', b.cx + b.iw - 2.5, b.cz - b.iw + 2.5, 0);
  },
  shopstreet(S, b) {
    const R = S.R;
    const w = b.iw * 2 - 1, n = 3, sw = w / n;
    for (let k = 0; k < n; k++) building(S, { cx: b.cx - w / 2 + sw * (k + 0.5), cz: b.cz + b.iw - 4, w: sw - 0.4, d: 7, floors: 2, ry: 0, look: 'shoji', groundLook: 'shop', door: 'shojiDoor', mat: 'wood', tint: pick([0xf6ecd8, 0xefe2c8, 0xfaf2e4], R), roof: 'gable', roofTint: pick([0x3a3e4a, 0x4a5468], R), seg: 2.4 });
    S.ground.push({ t: 'gravel', x0: b.cx - b.iw, z0: b.cz - b.iw, x1: b.cx + b.iw, z1: b.cz + b.iw - 7.5 });
    for (let k = 0; k < 4; k++) prop(S, 'stall', b.cx - 7.5 + k * 5, b.cz - 1.5, Math.PI, { tint: pick([0xe8442a, 0x3a5a9a, 0xf2c230, 0xffffff], R) });
    for (let k = 0; k < 5; k++) prop(S, 'plantern', b.cx - 8 + k * 4, b.cz + 1.5, 0);
    for (let k = 0; k < 2; k++) prop(S, 'phone', b.cx - b.iw + 1.2 + k * 1.1, b.cz - b.iw + 1.2, 0);
    for (let k = 0; k < 3; k++) prop(S, 'bike', b.cx + 4 + k * 0.7, b.cz - b.iw + 1.4, 0);
    prop(S, 'sakura', b.cx - 2, b.cz - b.iw + 3, R() * 6);
  },
};

// ворота-тории: две красные колонны и две перекладины
function torii(S, x, z, ry) {
  const g = S.gid();
  const red = 0xe8442a;
  for (const s of [-1, 1]) {
    const [dx, dz] = rot(s * 2.8, 0, ry);
    block(S, 'plain', 'wood', [0.7, 5, 0.7], x + dx, 2.5, z + dz, ry, red, g, 'cyl');
  }
  block(S, 'plain', 'wood', [7.2, 0.45, 0.5], x, 4.1, z, ry, red, g);
  block(S, 'plain', 'wood', [8.6, 0.55, 0.9], x, 5.25, z, ry, 0x2a2a30, g);
  block(S, 'plain', 'wood', [0.4, 0.8, 0.4], x, 4.7, z, ry, red, g);
}

const BLOCK_MIX = {
oasis:["bazaar","bazaar","villas","market","beachfront"],
botanical:["greenhouse","greenhouse","garden","park","orchard","cafes"],
farm:["farm","orchard","cottages","farm","market"],
autumn:["houses","orchard","park","cafes","chapel"],
canyon:["outpost","outpost","bazaar","warehouse","market"],
candyland:["candyworks","orchard","carousel","foodcourt","games"],
aurora:["chalets","lighthouse","forest","warehouse","rink"],
neoncity:["tower","twin","mall","pavilion","office","plaza"],
  town: ['houses', 'houses', 'park', 'shops', 'apartments', 'gas', 'office', 'parking', 'houses', 'shops'],
  beach: ['hotel', 'beachfront', 'villas', 'cafes', 'aqua', 'beachfront', 'villas', 'parking', 'hotel', 'lighthouse'],
  port: ['containers', 'containers', 'warehouse', 'crane', 'warehouse', 'parking', 'shops', 'containers', 'gas', 'lighthouse'],
  metro: ['tower', 'twin', 'mall', 'tower', 'apartments', 'plaza', 'office', 'park', 'twin', 'parking'],
  winter: ['chalets', 'chalets', 'rink', 'xmasfair', 'forest', 'apartments', 'shops', 'chalets', 'forest', 'parking', 'houses'],
  castle: ['cottages', 'cottages', 'market', 'farm', 'cottages', 'chapel', 'farm', 'market'],
  fair: ['carousel', 'foodcourt', 'bumpercars', 'circus', 'games', 'pavilion', 'coaster', 'haunted', 'pavilion', 'park'],
  japan: ['machiya', 'machiya', 'temple', 'garden', 'shopstreet', 'pagoda', 'apartments', 'tower', 'machiya', 'parking'],
};
const CENTRE = {
oasis:["bazaar","garden","market","bazaar"],
botanical:["greenhouse","garden","greenhouse","park"],
farm:["farm","orchard","market","farm"],
autumn:["orchard","park","chapel","cafes"],
canyon:["outpost","outpost","bazaar","warehouse"],
candyland:["candyworks","carousel","candyworks","orchard"],
aurora:["lighthouse","rink","forest","chalets"],
neoncity:["skyscraper","plaza","skyscraper","mall"],
  town: ['plaza', 'park', 'apartments', 'skyscraper'],
  beach: ['aqua', 'beachfront', 'hotel', 'cafes'],
  port: ['crane', 'lighthouse', 'warehouse', 'containers'],
  metro: ['skyscraper', 'plaza', 'twin', 'skyscraper'],
  winter: ['xmasfair', 'rink', 'chalets', 'forest'],
  castle: ['keep', 'market', 'chapel', 'cottages'],
  fair: ['ferris', 'carousel', 'circus', 'coaster'],
  japan: ['pagoda', 'garden', 'temple', 'shopstreet'],
};
