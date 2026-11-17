// Short, deterministic solo challenges. Rewards are granted once per new star.
import { MAPS } from './city.js';

export const EXPEDITIONS = MAPS.flatMap((map, i) => [0, 1, 2].map(stage => ({
  id: i * 3 + stage + 1,
  map: map.id,
  stage,
  seed: 4100 + i * 71 + stage * 13,
  time: 90 + stage * 15,
  target: 35 + stage * 20 + Math.min(i, 8) * 3,
  cars: stage === 1 && !['port', 'castle', 'farm', 'oasis', 'canyon', 'botanical'].includes(map.id) ? 3 : 0,
  crates: stage === 1 && map.id === 'port' ? 8 : 0,
  trees: stage === 2 && !['canyon','candyland'].includes(map.id) ? 6 : 0,
})));

export function expeditionStars(level, stats) {
  const primary = stats.eaten >= level.target && stats.cars >= level.cars && stats.trees >= level.trees && (stats.crates || 0) >= level.crates;
  if (!primary) return 0;
  return 1 + Number(stats.eaten >= Math.ceil(level.target * 1.35)) + Number(stats.eaten >= Math.ceil(level.target * 1.75));
}

export function expeditionOpen(id, data) {
  return id === 1 || (data.expeditions?.[id - 1] || 0) > 0 || (data.expeditions?.[id] || 0) > 0;
}
