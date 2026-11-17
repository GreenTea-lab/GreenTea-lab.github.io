// Музыка «Башен Королевства»: сказочное средневековье
export const SONGS = {
  menu: [
    { name: 'Castle Gate', bpm: 80, key: 62, scale: 'dorian', prog: [0, 6, 0, 4, 0, 6, 3, 4], seed: 11, loops: 2, layers: [
      { t: 'pad', wave: 'triangle', lp: 1000, vol: 0.024, attack: 0.8 },
      { t: 'bass', pat: 'x.......x.......', wave: 'triangle', vol: 0.12 },
      { t: 'arp', inst: 'lute', pat: '0.1.2.1.0.1.2.3.', oct: 0, vol: 0.03, decay: 0.6 },
      { t: 'flute', rhythm: ['x...x.x.x.......', 'x.......x...x...'], oct: 1, vol: 0.03, from: 2, len: 6 },
    ] },
    { name: 'Royal Hall', bpm: 88, key: 55, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 4, 4], seed: 12, loops: 2, layers: [
      { t: 'pad', wave: 'triangle', lp: 1400, vol: 0.026, attack: 0.6 },
      { t: 'bass', pat: 'x.....x.x.......', wave: 'sine', vol: 0.12 },
      { t: 'arp', inst: 'lute', pat: '0.2.1.2.0.2.1.3.', vol: 0.028, decay: 0.5 },
      { t: 'bell', rhythm: ['x.......x.......', 'x...x...x.......'], oct: 1, vol: 0.022, from: 4 },
    ] },
  ],
  game: [
    { name: 'March of Towers', bpm: 108, key: 62, scale: 'minor', prog: [0, 6, 5, 4, 0, 3, 4, 0], seed: 13, loops: 3, layers: [
      { t: 'pad', wave: 'sawtooth', lp: 900, vol: 0.018, attack: 0.4 },
      { t: 'bass', pat: 'x...x...x...x.5.', wave: 'triangle', vol: 0.11 },
      { t: 'arp', inst: 'lute', pat: '0.1.2...0.1.2.1.', vol: 0.026, decay: 0.45 },
      { t: 'lead', inst: 'brass', rhythm: ['x..x..x.x.......', 'x.x.x...x...x...'], oct: 0, vol: 0.03, from: 4 },
      { t: 'drum', pat: 'x.......x.......', vol: 0.14 },
      { t: 'snare', pat: '....x.......x.oo', vol: 0.035 },
    ] },
    { name: 'Green Fields', bpm: 120, key: 55, scale: 'mixolydian', prog: [0, 0, 6, 0, 0, 3, 6, 4], seed: 14, loops: 3, layers: [
      { t: 'pad', wave: 'triangle', lp: 1500, vol: 0.022 },
      { t: 'bass', pat: 'x.....5.x.....5.', wave: 'triangle', vol: 0.11 },
      { t: 'arp', inst: 'lute', pat: '0.2.1.2.0.2.1.2.', vol: 0.026, decay: 0.35 },
      { t: 'flute', rhythm: ['x.x.x...x.x.x...', 'x...x.x.x.......'], oct: 1, vol: 0.03, from: 2, len: 3 },
      { t: 'drum', pat: 'x.....x...x.....', vol: 0.11 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.02 },
    ] },
    { name: 'Mountain Pass', bpm: 100, key: 57, scale: 'minor', prog: [0, 3, 6, 2, 5, 3, 4, 4], seed: 15, loops: 3, layers: [
      { t: 'pad', wave: 'sawtooth', lp: 800, vol: 0.02, attack: 0.6, notes: 4 },
      { t: 'bass', pat: 'x.......x...x...', wave: 'sine', vol: 0.13 },
      { t: 'arp', inst: 'pluck', pat: '0.1.2.3.2.1.0.1.', vol: 0.024, decay: 0.4 },
      { t: 'flute', rhythm: ['x.....x.x.......', 'x...x...x...x...'], oct: 1, vol: 0.028, from: 4, len: 6 },
      { t: 'drum', pat: 'x.......x.....o.', vol: 0.12 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.01 },
    ] },
    { name: 'Night Watch', bpm: 94, key: 52, scale: 'dorian', prog: [0, 3, 0, 6, 0, 3, 4, 6], seed: 16, loops: 3, layers: [
      { t: 'pad', wave: 'triangle', lp: 1100, vol: 0.026, attack: 0.9 },
      { t: 'bass', pat: 'x.......x.x.....', wave: 'triangle', vol: 0.12 },
      { t: 'arp', inst: 'lute', pat: '2.1.0.1.2.1.0.3.', vol: 0.024, decay: 0.6 },
      { t: 'bell', rhythm: ['x.......x...x...', 'x...x...........'], oct: 1, vol: 0.022, from: 2 },
      { t: 'drum', pat: 'x...........x...', vol: 0.1 },
    ] },
  ],
  boss: [
    { name: 'Dragon', bpm: 124, key: 60, scale: 'minor', prog: [0, 5, 6, 4, 0, 5, 3, 4], seed: 17, loops: 4, layers: [
      { t: 'pad', wave: 'sawtooth', lp: 900, vol: 0.02, attack: 0.3 },
      { t: 'bass', pat: 'x.x.x.x.x.x.x.5.', wave: 'sawtooth', lp: 450, vol: 0.07 },
      { t: 'arp', inst: 'lute', pat: '0120012001200123', vol: 0.022, decay: 0.3 },
      { t: 'lead', inst: 'brass', rhythm: ['x..x..x.x.......', 'x.x.x.x.x...x...'], vol: 0.032 },
      { t: 'drum', pat: 'x...x...x...x...', vol: 0.13 },
      { t: 'tom', pat: '............ooxx', vol: 0.05, f: 120 },
      { t: 'snare', pat: '....x.......x...', vol: 0.03 },
    ] },
  ],
};
