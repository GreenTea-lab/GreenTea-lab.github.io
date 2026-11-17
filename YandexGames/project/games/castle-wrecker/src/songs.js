// Музыка «Разрушителя Замков»: средневековые плясовые, марши и баллады
export const SONGS = {
  menu: [
    { name: 'Siege Camp', bpm: 96, key: 62, scale: 'dorian', prog: [0, 6, 5, 6, 0, 6, 0, 4], seed: 31, loops: 2, layers: [
      { t: 'pad', wave: 'triangle', lp: 1000, vol: 0.022, attack: 0.6 },
      { t: 'bass', pat: 'x.......x.......', wave: 'triangle', vol: 0.12 },
      { t: 'arp', inst: 'lute', pat: '0.1.2.1.0.1.2.3.', vol: 0.028, decay: 0.5 },
      { t: 'flute', rhythm: ['x.x.x...x.......', 'x.......x.x.x...'], oct: 1, vol: 0.026, from: 2, len: 4 },
      { t: 'drum', pat: 'x.......x.......', vol: 0.08 },
    ] },
  ],
  valley: [
    { name: 'Valley Jig', bpm: 120, key: 55, scale: 'major', prog: [0, 4, 0, 4, 3, 0, 4, 0], seed: 32, loops: 3, layers: [
      { t: 'pad', wave: 'triangle', lp: 1400, vol: 0.02 },
      { t: 'bass', pat: 'x.....5.x.....5.', wave: 'triangle', vol: 0.11 },
      { t: 'arp', inst: 'lute', pat: '0.2.1.2.0.2.1.2.', vol: 0.026, decay: 0.35 },
      { t: 'flute', rhythm: ['x.x.x.x.x...x...', 'x...x.x.x.x.....'], oct: 1, vol: 0.03, from: 2, len: 3 },
      { t: 'drum', pat: 'x.....x...x.....', vol: 0.11 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.02 },
    ] },
    { name: 'Tavern Tune', bpm: 112, key: 62, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 0], seed: 33, loops: 3, swing: 0.12, layers: [
      { t: 'pad', wave: 'triangle', lp: 1200, vol: 0.02 },
      { t: 'bass', pat: 'x...5...x...5...', wave: 'triangle', vol: 0.11 },
      { t: 'arp', inst: 'lute', pat: '0.1.2.1.0.2.1.2.', vol: 0.026, decay: 0.4 },
      { t: 'lead', inst: 'flute', rhythm: ['x.x.x...x.x.....', 'x...x.x.x...x...'], oct: 1, vol: 0.028, from: 4, len: 4 },
      { t: 'drum', pat: 'x.......x.....o.', vol: 0.1 },
      { t: 'clap', pat: '....o.......o...', vol: 0.015 },
    ] },
  ],
  rocks: [
    { name: 'Stone March', bpm: 104, key: 57, scale: 'minor', prog: [0, 5, 6, 4, 0, 5, 3, 4], seed: 34, loops: 3, layers: [
      { t: 'pad', wave: 'sawtooth', lp: 900, vol: 0.018, attack: 0.5 },
      { t: 'bass', pat: 'x...x...x...x.5.', wave: 'triangle', vol: 0.11 },
      { t: 'arp', inst: 'lute', pat: '0.1.2...0.1.2.1.', vol: 0.024, decay: 0.45 },
      { t: 'lead', inst: 'brass', rhythm: ['x..x..x.x.......', 'x.x.x...x...x...'], vol: 0.028, from: 4 },
      { t: 'drum', pat: 'x.......x.......', vol: 0.13 },
      { t: 'snare', pat: '....x.......x.oo', vol: 0.03 },
    ] },
    { name: 'Autumn Road', bpm: 96, key: 52, scale: 'dorian', prog: [0, 3, 6, 3, 0, 3, 4, 4], seed: 35, loops: 3, layers: [
      { t: 'pad', wave: 'triangle', lp: 1100, vol: 0.024, attack: 0.7 },
      { t: 'bass', pat: 'x.......x.x.....', wave: 'sine', vol: 0.12 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.3.0.2.1.3.', vol: 0.024, decay: 0.4 },
      { t: 'flute', rhythm: ['x.....x.x.......', 'x...x...x...x...'], oct: 1, vol: 0.026, from: 2, len: 6 },
      { t: 'drum', pat: 'x.......x.....o.', vol: 0.1 },
    ] },
  ],
  ice: [
    { name: 'Frozen Bells', bpm: 90, key: 64, scale: 'minor', prog: [0, 5, 3, 4, 0, 5, 6, 4], seed: 36, loops: 3, layers: [
      { t: 'pad', wave: 'sine', lp: 1600, vol: 0.028, attack: 0.9, notes: 4 },
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.12 },
      { t: 'arp', inst: 'bell', pat: '0.2.1.3.0.2.1.3.', oct: 1, vol: 0.014, decay: 1.2 },
      { t: 'flute', rhythm: ['x...x...x.......', 'x.......x...x...'], oct: 1, vol: 0.024, from: 4, len: 6 },
      { t: 'drum', pat: 'x...........x...', vol: 0.09 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.009 },
    ] },
    { name: 'Snowy Peaks', bpm: 100, key: 59, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 37, loops: 3, layers: [
      { t: 'pad', wave: 'triangle', lp: 1300, vol: 0.022, attack: 0.6 },
      { t: 'bass', pat: 'x.....x...x.....', wave: 'triangle', vol: 0.11 },
      { t: 'arp', inst: 'pluck', pat: '0123012301230123', oct: 1, vol: 0.016, decay: 0.25 },
      { t: 'bell', rhythm: ['x...x.x...x.....', 'x.......x.x.....'], oct: 1, vol: 0.02, from: 2 },
      { t: 'drum', pat: 'x.......x.......', vol: 0.1 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.016 },
    ] },
  ],
  boss: [
    { name: 'Goblin King', bpm: 124, key: 60, scale: 'phrygian', prog: [0, 1, 0, 6, 0, 1, 5, 6], seed: 38, loops: 4, layers: [
      { t: 'pad', wave: 'sawtooth', lp: 900, vol: 0.02, attack: 0.3 },
      { t: 'bass', pat: 'x.x.x.x.x.x.x.5.', wave: 'sawtooth', lp: 420, vol: 0.07 },
      { t: 'arp', inst: 'lute', pat: '0120012001200123', vol: 0.022, decay: 0.3 },
      { t: 'lead', inst: 'brass', rhythm: ['x..x..x.x.......', 'x.x.x.x.x...x...'], vol: 0.03 },
      { t: 'drum', pat: 'x...x...x...x...', vol: 0.13 },
      { t: 'tom', pat: '............ooxx', vol: 0.05, f: 120 },
    ] },
  ],
};
SONGS.game = SONGS.valley;
