// Достижения: условие — прогресс (have / goal) по сохранению; награда в монетах забирается кнопкой
import { ITEMS } from './garden.js';
import { PER_GARDEN } from './levels.js';

const pathDone = (D) => {
  const s = D.path.stars;
  let n = 0;
  for (let k = 0; k < s.length; k++) if (s[k] > '0') n++;
  return n;
};
const gardensDone = (D) => {
  const s = D.path.stars;
  let n = 0;
  for (let g = 0; g * PER_GARDEN < s.length; g++) {
    let ok = true;
    for (let k = 0; k < PER_GARDEN; k++) if (!(s[g * PER_GARDEN + k] > '0')) ok = false;
    if (ok) n++;
  }
  return n;
};
const flag = (k) => (D) => (D.flags[k] ? 1 : 0);

export const ACHS = [
  { id: 'first', icon: 'play', goal: 1, coins: 30, have: (D) => D.solved },
  { id: 'solved10', icon: 'grid', goal: 10, coins: 50, have: (D) => D.solved },
  { id: 'solved50', icon: 'grid', goal: 50, coins: 100, have: (D) => D.solved },
  { id: 'solved100', icon: 'grid', goal: 100, coins: 150, have: (D) => D.solved },
  { id: 'solved250', icon: 'grid', goal: 250, coins: 250, have: (D) => D.solved },
  { id: 'solved500', icon: 'grid', goal: 500, coins: 400, have: (D) => D.solved },
  { id: 'solved1000', icon: 'grid', goal: 1000, coins: 700, have: (D) => D.solved },
  { id: 'perfect10', icon: 'star', goal: 10, coins: 60, have: (D) => D.perfect },
  { id: 'perfect100', icon: 'star', goal: 100, coins: 250, have: (D) => D.perfect },
  { id: 'garden1', icon: 'blossom', goal: 1, coins: 100, have: gardensDone },
  { id: 'garden5', icon: 'koi', goal: 5, coins: 250, have: gardensDone },
  { id: 'garden10', icon: 'torii', goal: 10, coins: 400, have: gardensDone },
  { id: 'garden20', icon: 'enso', goal: 20, coins: 1000, have: gardensDone },
  { id: 'path100', icon: 'path', goal: 100, coins: 150, have: pathDone },
  { id: 'daily3', icon: 'calendar', goal: 3, coins: 60, have: (D) => D.daily.best || 0 },
  { id: 'daily7', icon: 'calendar', goal: 7, coins: 150, have: (D) => D.daily.best || 0 },
  { id: 'daily30', icon: 'calendar', goal: 30, coins: 500, have: (D) => D.daily.best || 0 },
  { id: 'diag', icon: 'diag', goal: 1, coins: 40, have: flag('diag') },
  { id: 'mini', icon: 'mini', goal: 1, coins: 20, have: flag('mini') },
  { id: 'expert', icon: 'snow', goal: 1, coins: 80, have: flag('expert') },
  { id: 'master', icon: 'enso', goal: 1, coins: 150, have: flag('master') },
  { id: 'fast', icon: 'clock', goal: 1, coins: 50, have: flag('fast') },
  { id: 'clean', icon: 'check', goal: 1, coins: 60, have: flag('clean') },
  { id: 'gardenAll', icon: 'tree', goal: ITEMS.length, coins: 500, have: (D) => D.gardenCount || 0 },
];

export function achState(D) {
  return ACHS.map((a) => {
    const have = Math.min(a.goal, a.have(D));
    return { ...a, have, done: have >= a.goal, claimed: !!D.ach[a.id] };
  });
}

export const claimable = (D) => achState(D).filter((a) => a.done && !a.claimed).length;
