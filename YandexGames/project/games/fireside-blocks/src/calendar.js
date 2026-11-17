export const dayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function dailyLevel(key = dayKey()) {
  let seed=0;for(const ch of key)seed=(seed*31+ch.charCodeAt(0))>>>0;
  const index=140+seed%860,L=level(index);
  return { index, seed: L.seeds?.[seed%L.seeds.length] ?? seed, key };
}
import {level} from './levels.js';
