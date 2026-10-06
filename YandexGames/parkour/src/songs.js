// Музыка паркура: бодрая и лёгкая — щипки, маримба, мягкая бочка. Всё короткое и затухающее.
export const SONGS = {
  menu: [
    { name: 'Sky Lobby', bpm: 110, key: 60, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 901, loops: 2, swing: 0.06, vol: 0.9, layers: [
      { t: 'bass', pat: 'x...x...x...x...', wave: 'triangle', vol: 0.08 },
      { t: 'arp', inst: 'pluck', pat: '0.1.2.1.0.1.2.1.', oct: 1, vol: 0.015, decay: 0.2 },
      { t: 'bell', rhythm: ['x.....x...x.....', 'x.......x.......'], oct: 1, vol: 0.012, from: 4 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.03, f: 90 },
    ] },
  ],
  day: [
    { name: 'Jump Up', bpm: 124, key: 62, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 911, loops: 2, swing: 0.05, vol: 0.85, layers: [
      { t: 'bass', pat: 'x.x...x.x.x...x.', wave: 'triangle', vol: 0.075 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.2.0.2.1.2.', oct: 1, vol: 0.014, decay: 0.18 },
      { t: 'lead', rhythm: ['x.x.x...x.x.....', 'x...x.x.x...x...'], oct: 1, vol: 0.014, from: 2 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.006 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.035, f: 90 },
    ] },
    { name: 'Cloud Hopper', bpm: 118, key: 57, scale: 'pentaMajor', prog: [0, 3, 1, 4, 0, 3, 2, 4], seed: 912, loops: 2, swing: 0.08, vol: 0.85, layers: [
      { t: 'bass', pat: 'x...x...x...x...', wave: 'triangle', vol: 0.075 },
      { t: 'arp', inst: 'lute', pat: '0.1.2.1.0.1.3.1.', vol: 0.014 },
      { t: 'bell', rhythm: ['x.....x...x.....', '....x.....x.....'], oct: 1, vol: 0.013, from: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.008 },
      { t: 'kick', pat: 'x.......x.x.....', vol: 0.035, f: 90 },
    ] },
    { name: 'Run Run', bpm: 130, key: 65, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 0], seed: 913, loops: 2, swing: 0.04, vol: 0.85, layers: [
      { t: 'bass', pat: 'x.x.5...x.x.5...', wave: 'triangle', vol: 0.07 },
      { t: 'arp', inst: 'pluck', pat: '0.1.2.1.0.1.2.1.', oct: 1, vol: 0.013, decay: 0.16 },
      { t: 'lead', rhythm: ['x.x.x...x.......', '....x.x.x...x...'], oct: 1, vol: 0.013, from: 4 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.004 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.03, f: 90 },
    ] },
  ],
  night: [
    { name: 'Neon Steps', bpm: 116, key: 57, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 0, 4], seed: 921, loops: 2, vol: 0.85, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..x.', wave: 'triangle', vol: 0.075 },
      { t: 'arp', inst: 'saw', pat: '0.2.1.3.0.2.1.3.', oct: 1, vol: 0.009, lp: 1600 },
      { t: 'bell', rhythm: ['x.....x.........', 'x...x...........'], oct: 1, vol: 0.012, from: 2 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.006 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.035, f: 90 },
    ] },
    { name: 'Star Walk', bpm: 100, key: 62, scale: 'major', prog: [0, 3, 5, 4, 0, 3, 1, 4], seed: 922, loops: 2, vol: 0.85, layers: [
      { t: 'pad', vol: 0.014, notes: 3 },
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.09 },
      { t: 'arp', inst: 'bell', pat: '2...1...3...0...', oct: 1, vol: 0.011 },
      { t: 'lead', rhythm: ['x.......x.......', '....x.......x...'], oct: 1, vol: 0.014, from: 2 },
    ] },
  ],
};
