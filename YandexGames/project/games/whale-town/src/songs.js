// Музыка городка на ките: весёлая «маримба», щипки и лёгкий шейкер. Всё короткое и затухающее.
export const SONGS = {
  menu: [
    { name: 'Morning Harbor', bpm: 96, key: 60, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 701, loops: 2, swing: 0.1, vol: 0.9, layers: [
      { t: 'pad', vol: 0.013, notes: 3 },
      { t: 'bass', pat: 'x...x...x...x...', wave: 'triangle', vol: 0.08 },
      { t: 'arp', inst: 'pluck', pat: '0.1.2.1.0.1.2.1.', oct: 1, vol: 0.015, decay: 0.22 },
      { t: 'bell', rhythm: ['x.....x...x.....', 'x.......x.......'], oct: 1, vol: 0.012, from: 4 },
    ] },
  ],
  day: [
    { name: 'Whale Song', bpm: 104, key: 62, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 711, loops: 2, swing: 0.12, vol: 0.85, layers: [
      { t: 'bass', pat: 'x.....x.x.......', wave: 'triangle', vol: 0.08 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.2.0.2.1.2.', oct: 1, vol: 0.014, decay: 0.2 },
      { t: 'lead', rhythm: ['x.x...x.x.......', 'x...x...x.x.....'], oct: 1, vol: 0.015, from: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.005 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.035, f: 90 },
    ] },
    { name: 'Island Hop', bpm: 112, key: 57, scale: 'pentaMajor', prog: [0, 3, 1, 4, 0, 3, 2, 4], seed: 712, loops: 2, swing: 0.14, vol: 0.85, layers: [
      { t: 'bass', pat: 'x...x...x...x...', wave: 'triangle', vol: 0.075 },
      { t: 'arp', inst: 'lute', pat: '0.1.2.1.0.1.3.1.', vol: 0.014 },
      { t: 'bell', rhythm: ['x.....x...x.....', '....x.....x.....'], oct: 1, vol: 0.013, from: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.007 },
    ] },
    { name: 'Sunny Deck', bpm: 98, key: 65, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 713, loops: 2, swing: 0.1, vol: 0.85, layers: [
      { t: 'pad', vol: 0.012, notes: 3 },
      { t: 'bass', pat: 'x.....x...x.....', wave: 'sine', vol: 0.09 },
      { t: 'arp', inst: 'epiano', pat: '0...2.1...3.2...', oct: 1, vol: 0.016 },
      { t: 'lead', rhythm: ['x.x.x...x.......', '....x.x.x...x...'], oct: 1, vol: 0.013, from: 4 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.0035 },
    ] },
  ],
  night: [
    { name: 'Glow Jellies', bpm: 78, key: 57, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 0, 4], seed: 721, loops: 2, swing: 0.08, vol: 0.85, layers: [
      { t: 'pad', vol: 0.016, notes: 3 },
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.09 },
      { t: 'arp', inst: 'bell', pat: '0...2...1...3...', oct: 1, vol: 0.011 },
      { t: 'lead', rhythm: ['x.......x.......', '....x.......x...'], oct: 1, vol: 0.013, from: 2 },
    ] },
  ],
};
