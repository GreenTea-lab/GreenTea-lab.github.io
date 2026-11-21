import { Vox } from './vox.js';
import { palm, bush, flowers, rock, shell, driftwood, crate, barrel, C } from './models.js';
import * as models from './decor-models.js';

function bunch(color) {
  const plant = new Vox();
  for (const [x, z, height] of [[-2, -2, 3], [0, 0, 5], [2, 1, 4], [-1, 2, 3]]) {
    plant.box(x, 0, z, x, height - 1, z, C.grassD);
    plant.set(x + 1, 1, z, C.frond);
    plant.set(x - 1, 2, z, C.frondL);
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) plant.set(x + dx, height, z + dz, color);
    plant.set(x, height, z, C.sun || 0xffd766);
  }
  return plant;
}

function bench(color = C.plank) {
  const v = new Vox();
  for (const x of [-5, 5]) for (const z of [-2, 2]) v.box(x, 0, z, x, z < 0 ? 7 : 3, z, C.trunkD);
  v.box(-6, 3, -2, 6, 3, 2, color);
  v.box(-6, 5, -2, 6, 7, -2, color);
  return v;
}

function lantern() {
  const v = new Vox();
  v.box(-2, 0, -2, 2, 0, 2, C.rock);
  v.box(0, 1, 0, 0, 10, 0, C.trunkD);
  v.box(-1, 7, -1, 1, 9, 1, 0xffc367);
  v.box(-2, 10, -2, 2, 10, 2, C.woodD);
  return v;
}

function flag(color = 0x44b8c6) {
  const v = new Vox();
  v.box(-1, 0, -1, 1, 0, 1, C.rock);
  v.box(0, 1, 0, 0, 15, 0, C.woodD);
  v.box(1, 10, 0, 5, 14, 0, (x, y) => (x + y) % 3 ? color : 0xffd57e);
  return v;
}

function grass() {
  const v = new Vox();
  for (const [x,z,h] of [[-2,0,3],[0,-1,5],[1,1,3],[2,-2,4],[-1,2,2]]) {
    v.box(x,0,z,x,h-1,z,C.grassD);
    v.set(x+1,h,z,C.frondL);
  }
  return v;
}

function planter() {
  const v = new Vox();
  v.box(-4,0,-3,4,3,3,(x,y) => y % 2 ? C.plank : C.trunkD);
  v.box(-3,4,-2,3,4,2,C.soil);
  for (const [x,z,color] of [[-2,0,0xea718e],[0,-1,0xffd056],[2,1,0x9f75df]]) {
    v.box(x,5,z,x,8,z,C.grassD);
    v.box(x-1,9,z,x+1,9,z,color);
    v.set(x,10,z,0xffedac);
  }
  return v;
}

const originalDecor = [
  {id:'grass', ru:'Трава', en:'Grass', coins:0, groundCover:true, model:grass},
  {id:'hibiscus', ru:'Гибискус', en:'Hibiscus', coins:25, model:() => bunch(0xec5573)},
  {id:'goldflowers', ru:'Жёлтые цветы', en:'Golden flowers', coins:25, model:() => bunch(0xffbf44)},
  {id:'violets', ru:'Фиалки', en:'Violets', coins:25, model:() => bunch(0x9d73d9)},
  {id:'whiteflowers', ru:'Белые цветы', en:'White flowers', coins:25, model:() => bunch(0xffedce)},
  {id:'wildflowers', ru:'Полевые цветы', en:'Wildflowers', coins:25, model:() => flowers(9)},
  {id:'shrub', ru:'Цветущий куст', en:'Flowering shrub', coins:40, model:() => bush(26, true)},
  {id:'palm', ru:'Кокосовая пальма', en:'Coconut palm', coins:80, tree:true, model:() => palm(31, 25)},
  {id:'rock', ru:'Камни', en:'Rocks', coins:30, model:() => rock(14, .75)},
  {id:'shell', ru:'Ракушка', en:'Shell', coins:15, model:() => shell(0)},
  {id:'driftwood', ru:'Коряга', en:'Driftwood', coins:20, model:() => driftwood(2)},
  {id:'crate', ru:'Ящик', en:'Crate', coins:35, model:() => crate()},
  {id:'barrel', ru:'Бочка', en:'Barrel', coins:35, model:() => barrel()},
  {id:'bench', ru:'Скамейка', en:'Bench', coins:60, model:bench},
  {id:'bluebench', ru:'Голубая скамейка', en:'Blue bench', coins:60, model:() => bench(0x54a5b9)},
  {id:'planter', ru:'Ящик с цветами', en:'Flower box', coins:55, model:planter},
  {id:'lantern', ru:'Фонарь', en:'Lantern', coins:65, model:lantern},
  {id:'flag', ru:'Флажок', en:'Flag', coins:50, model:flag},
  {id:'coralflag', ru:'Коралловый флажок', en:'Coral flag', coins:50, model:() => flag(0xe37365)},
];
const sections={
  plants:['grass','hibiscus','goldflowers','violets','whiteflowers','wildflowers','shrub','palm','planter'],
  shore:['rock','shell','driftwood','flag','coralflag'],
  furniture:['bench','bluebench'],
  lights:['lantern'],
  finds:['crate','barrel'],
};

export const DECOR_FILTERS=[
  ['all','Всё','All'],['plants','Растения','Plants'],['shore','У берега','By the shore'],
  ['furniture','Для отдыха','For relaxing'],['lights','Освещение','Lighting'],['finds','Находки','Finds'],
];

const newDecor=[
  ['monstera','plants','Монстера в горшке','Potted monstera',52,models.monstera],
  ['orchids','plants','Розовые орхидеи','Pink orchids',42,models.orchids],
  ['strelitzia','plants','Райские цветы','Bird of paradise',50,models.strelitzia],
  ['banana-tree','plants','Банановое дерево','Banana tree',90,models.bananaTree,{tree:true}],
  ['lotus-bowl','plants','Чаша с лотосами','Lotus bowl',65,models.lotusPlanter],
  ['parasol-coral','shore','Коралловый зонт','Coral parasol',70,()=>models.beachParasol(0xe87260)],
  ['parasol-blue','shore','Бирюзовый зонт','Turquoise parasol',70,()=>models.beachParasol(0x54aeb0)],
  ['surf-rack','shore','Стойка с досками','Surfboard rack',75,models.surfRack],
  ['sand-castle','shore','Песочный замок','Sandcastle',32,models.sandCastle],
  ['canoe','shore','Бирюзовое каноэ','Turquoise canoe',100,models.shoreCanoe],
  ['lifesaver','shore','Спасательный круг','Lifebuoy stand',44,models.lifesaver],
  ['tea-table','furniture','Чайный столик','Tea table',70,models.teaTable],
  ['stripe-hammock','furniture','Полосатый гамак','Striped hammock',88,models.hammock],
  ['flower-pergola','furniture','Пергола с цветами','Flower pergola',120,models.pergola],
  ['picnic','furniture','Пикник на пледе','Picnic blanket',55,models.picnic,{walkable:true}],
  ['flower-cart','furniture','Повозка с цветами','Flower cart',95,models.flowerCart],
  ['double-lantern','lights','Двойной фонарь','Twin lantern',84,models.doubleLantern],
  ['lantern-string','lights','Гирлянда фонариков','Lantern string',97,models.paperLanterns],
  ['lighthouse-lamp','lights','Светильник-маяк','Lighthouse lamp',78,models.beaconLantern],
  ['treasure-chest','finds','Сундук с сокровищами','Treasure chest',95,models.treasure],
  ['compass-rose','finds','Мозаика «Роза ветров»','Compass rose mosaic',48,models.compass,{walkable:true}],
  ['message-bottle','finds','Письмо в бутылке','Message in a bottle',36,models.messageBottle],
  ['wind-chimes','finds','Музыка ветра','Wind chimes',63,models.windChimes],
  ['wooden-whale','finds','Деревянный кит','Wooden whale',82,models.woodenWhale],
];
export const DECOR=[
  ...originalDecor.map(item=>({...item,section:Object.keys(sections).find(section=>sections[section].includes(item.id))})),
  ...newDecor.map(([id,section,ru,en,coins,model,traits])=>({id,section,ru,en,coins,model,...traits})),
];
export const DECOR_LIMIT = 36;
export const GRASS_LIMIT = 160;
export const DECOR_BY_ID = Object.fromEntries(DECOR.map(item => [item.id, item]));
export const meadowFlower = seed => bunch([0xcc70d9, 0xffbf44, 0xf2797d, 0xffefe0][seed % 4]);

export function restoreDecor(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.filter(item => {
    if (!item || !Object.hasOwn(DECOR_BY_ID, item.type) ||
      !Number.isSafeInteger(item.id) || item.id < 1 || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).slice(0, DECOR_LIMIT + GRASS_LIMIT).map(({id, type, x, z, turn}) => {
    const placed = Number.isFinite(x) && Number.isFinite(z) && Math.abs(x) <= 23 && Math.abs(z) <= 18;
    return {id, type, x: placed ? x : null, z: placed ? z : null, turn: Number.isInteger(turn) ? (turn % 4 + 4) % 4 : 0};
  });
}
