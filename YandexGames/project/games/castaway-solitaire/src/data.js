import {WORLD_PROJECTS} from './world-data.js';
// Данные: проекты на острове (3 стадии), цены, бустеры, экономика
export const PROJECTS = [
  { id: 'hut', pos: [-3, 1.5], rot: -.27, cost: [2, 3, 3], r: 1.6 },
  { id: 'fire', pos: [1.8, 4.6], rot: 0, cost: [3, 3, 4], r: 1.3 },
  { id: 'water', pos: [-8.2, -1.2], rot: 0.5, cost: [3, 4, 4], r: 1.1 },
  { id: 'garden', pos: [6.4, 0.2], rot: .18, cost: [4, 4, 5], r: 1.5 },
  { id: 'pier', pos: [-1.5, 8.6], rot: 0, cost: [4, 5, 5], r: 1.3, water: true },
  { id: 'lookout', pos: [-11.2, 3.4], rot: 0.3, cost: [4, 5, 6], r: 1.0 },
  { id: 'workshop', pos: [10, -3], rot: -0.4, cost: [5, 5, 6], r: 1.6 },
  { id: 'farm', pos: [3.6, -4.6], rot: -.21, cost: [5, 6, 6], r: 1.4 },
  { id: 'beacon', pos: [-2.5, -6.5], rot: 0, cost: [5, 6, 7], r: 1.85 },
  { id: 'ship', pos: [11.5, 8.2], rot: -0.5, cost: [6, 7, 7], r: 2.4 },
  ...WORLD_PROJECTS,
];
export const TOTAL_STEPS = PROJECTS.length * 3;

// стоимость и награды (монеты)
export const START_COINS = 400;
export const COST = { undo: 25, joker: 120, more5: 150 };
export const FREE_UNDO = 1; // бесплатных отмен на уровень
export const WIN_COINS = (stars, n) => 15 + stars * 8 + Math.min(20, Math.floor(n / 5));
export const AD_COINS = 100; // монеты за ролик в магазине
export const AD_COOLDOWN = 3 * 60 * 1000;
export const DAILY = [100, 150, 200, 250, 300, 400, 600]; // календарь подарков

// подсказка, если игрок долго не ходит (секунд)
export const HINT_DELAY = 6;
