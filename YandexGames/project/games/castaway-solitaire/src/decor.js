import { Vox } from './vox.js';
import { palm, bush, flowers, rock, shell, driftwood, crate, barrel, C } from './models.js';

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

function bench() {
  const v = new Vox();
  for (const x of [-5, 5]) for (const z of [-2, 2]) v.box(x, 0, z, x, z < 0 ? 7 : 3, z, C.trunkD);
  v.box(-6, 3, -2, 6, 3, 2, C.plank);
  v.box(-6, 5, -2, 6, 7, -2, C.woodL);
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

function flag() {
  const v = new Vox();
  v.box(-1, 0, -1, 1, 0, 1, C.rock);
  v.box(0, 1, 0, 0, 15, 0, C.woodD);
  v.box(1, 10, 0, 5, 14, 0, (x, y) => (x + y) % 3 ? 0x44b8c6 : 0xffd57e);
  return v;
}

export const DECOR = [
  {id:'hibiscus', ru:'Гибискус', en:'Hibiscus', coins:25, model:() => bunch(0xec5573)},
  {id:'goldflowers', ru:'Жёлтые цветы', en:'Golden flowers', coins:25, model:() => bunch(0xffbf44)},
  {id:'wildflowers', ru:'Полевые цветы', en:'Wildflowers', coins:25, model:() => flowers(9)},
  {id:'shrub', ru:'Цветущий куст', en:'Flowering shrub', coins:40, model:() => bush(26, true)},
  {id:'palm', ru:'Кокосовая пальма', en:'Coconut palm', coins:80, tree:true, model:() => palm(31, 25)},
  {id:'rock', ru:'Камни', en:'Rocks', coins:30, model:() => rock(14, .75)},
  {id:'shell', ru:'Ракушка', en:'Shell', coins:15, model:() => shell(0)},
  {id:'driftwood', ru:'Коряга', en:'Driftwood', coins:20, model:() => driftwood(2)},
  {id:'crate', ru:'Ящик', en:'Crate', coins:35, model:() => crate()},
  {id:'barrel', ru:'Бочка', en:'Barrel', coins:35, model:() => barrel()},
  {id:'bench', ru:'Скамейка', en:'Bench', coins:60, model:bench},
  {id:'lantern', ru:'Фонарь', en:'Lantern', coins:65, model:lantern},
  {id:'flag', ru:'Флажок', en:'Flag', coins:50, model:flag},
];
export const DECOR_LIMIT = 36;
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
  }).slice(0, DECOR_LIMIT).map(({id, type, x, z}) => {
    const placed = Number.isFinite(x) && Number.isFinite(z) && Math.abs(x) <= 23 && Math.abs(z) <= 18;
    return {id, type, x: placed ? x : null, z: placed ? z : null};
  });
}
