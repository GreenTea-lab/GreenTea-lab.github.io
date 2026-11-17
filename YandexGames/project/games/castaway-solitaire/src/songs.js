// Музыка «Пасьянса Робинзона»: тёплые тропики короткими нотами — маримба, укулеле, стальной барабан,
// мягкий шейкер. Без пэдов и тянущихся звуков. Плейлисты: остров (меню) и партия (спокойнее).
const M = (decay = 0.32) => ({ inst: 'marimba', decay });
const U = (decay = 0.3) => ({ inst: 'uke', decay });
const S = (decay = 0.45) => ({ inst: 'steel', decay });

export const SONGS = {
  menu: [
    { name: 'Sunny Shore', bpm: 96, key: 55, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 501, loops: 2, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', ...U(0.28), pat: '0.2.1.2.0.2.1.2.', vol: 0.02 },
      { t: 'lead', ...M(0.35), rhythm: ['x..x..x...x.....', 'x.x...x...x.x...'], vol: 0.034, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.008 },
    ] },
    { name: 'Palm Breeze', bpm: 88, key: 53, scale: 'pentaMajor', prog: [0, 5, 3, 4, 0, 5, 3, 4], seed: 502, loops: 2, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'triangle', vol: 0.1, len: 2 },
      { t: 'arp', ...M(0.3), pat: '0.1.2.3.2.1.0.1.', vol: 0.022 },
      { t: 'bell', ...S(0.5), rhythm: ['x.......x...x...', 'x...x.......x...'], vol: 0.022, from: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.01 },
    ] },
    { name: 'Coconut Morning', bpm: 104, key: 57, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 0], seed: 503, loops: 2, swing: 0.12, layers: [
      { t: 'bass', pat: 'x..x....x..x....', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', ...U(0.25), pat: '0.2.0.2.1.2.1.3.', vol: 0.02 },
      { t: 'lead', ...S(0.4), rhythm: ['x.x...x...x.....', 'x...x.x.x.......'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.06, f: 80 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.005 },
    ] },
    { name: 'Tide Pools', bpm: 84, key: 52, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 504, loops: 2, layers: [
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', ...M(0.4), pat: '2...1...0...1...', vol: 0.026 },
      { t: 'lead', ...U(0.32), rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.03, from: 2, len: 2 },
    ] },
  ],
  game: [
    { name: 'Card Shells', bpm: 92, key: 53, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 3, 4], seed: 511, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.09, len: 2 },
      { t: 'arp', ...M(0.3), pat: '0.2.1.2.0.2.1.3.', vol: 0.018 },
      { t: 'lead', ...M(0.4), rhythm: ['x...x.x...x.....', 'x.x.....x.......'], vol: 0.026, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.006 },
    ] },
    { name: 'Hammock Afternoon', bpm: 80, key: 55, scale: 'pentaMajor', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 512, loops: 3, layers: [
      { t: 'bass', pat: 'x...........x...', wave: 'triangle', vol: 0.09, len: 2 },
      { t: 'arp', ...U(0.28), pat: '0.1.2.3.2.1.0.1.', vol: 0.017 },
      { t: 'bell', ...S(0.45), rhythm: ['x.......x...x...', 'x...x.......x...'], vol: 0.018, from: 2 },
    ] },
    { name: 'Lagoon Steps', bpm: 98, key: 50, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 513, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'sine', vol: 0.09, len: 1 },
      { t: 'arp', ...M(0.28), pat: '0.2.1.2.0.2.1.2.', vol: 0.017 },
      { t: 'lead', ...S(0.38), rhythm: ['x..x..x...x.....', 'x.......x.x.....'], vol: 0.024, from: 2, len: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.008 },
    ] },
    { name: 'Driftwood Waltz', bpm: 90, key: 57, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 514, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.09, len: 2 },
      { t: 'arp', ...U(0.3), pat: '0...2...1...2...', vol: 0.02 },
      { t: 'lead', ...M(0.42), rhythm: ['x...x...x.x.....', 'x.x...x.........'], vol: 0.026, from: 2, len: 2 },
      { t: 'shaker', pat: '....o.......o...', vol: 0.006 },
    ] },
    { name: 'Starfish Shuffle', bpm: 106, key: 52, scale: 'pentaMajor', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 515, loops: 3, swing: 0.14, layers: [
      { t: 'bass', pat: 'x..x..x.x..x....', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', ...M(0.25), pat: '0123012301230123', vol: 0.013 },
      { t: 'lead', ...U(0.3), rhythm: ['x.x.x...x.......', 'x.......x.x.x...'], vol: 0.026, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.05, f: 80 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.005 },
    ] },
  ],
};
