// Музыка фермы: спокойное «кантри» — банджо-щипки, мягкий бас, лёгкий шейкер. Всё короткое и затухающее.
export const SONGS = {
  menu: [
    { name: 'Morning Dew', bpm: 84, key: 55, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 4, 0], seed: 301, loops: 2, swing: 0.12, vol: 0.9, layers: [
      { t: 'pad', vol: 0.016, notes: 3 },
      { t: 'bass', pat: 'x.......5.......', wave: 'triangle', vol: 0.1 },
      { t: 'arp', inst: 'lute', pat: '0.2.1.2.0.2.1.2.', vol: 0.018 },
      { t: 'bell', rhythm: ['x.....x.....x...', 'x.......x.......'], oct: 1, vol: 0.014, from: 4 },
    ] },
  ],
  game: [
    { name: 'Country Road', bpm: 96, key: 55, scale: 'major', prog: [0, 0, 3, 3, 4, 4, 0, 0], seed: 311, loops: 2, swing: 0.14, vol: 0.85, layers: [
      { t: 'pad', vol: 0.014, notes: 3 },
      { t: 'bass', pat: 'x...5...x...5...', wave: 'triangle', vol: 0.09 },
      { t: 'arp', inst: 'lute', pat: '0.2.1.2.0.2.1.2.', vol: 0.016 },
      { t: 'lead', rhythm: ['x.x...x.x.......', 'x...x...x.x.....'], oct: 1, vol: 0.016, from: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.006 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.04, f: 80 },
    ] },
    { name: 'Sunny Barn', bpm: 88, key: 60, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 312, loops: 2, swing: 0.12, vol: 0.85, layers: [
      { t: 'pad', vol: 0.014 },
      { t: 'bass', pat: 'x.....x...x.....', wave: 'triangle', vol: 0.09 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.3.0.2.1.3.', oct: 1, vol: 0.015, decay: 0.25 },
      { t: 'bell', rhythm: ['x...x.....x.....', 'x.....x...x.....'], oct: 1, vol: 0.014, from: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.008 },
    ] },
    { name: 'Hay Ride', bpm: 102, key: 57, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 0], seed: 313, loops: 2, swing: 0.15, vol: 0.8, layers: [
      { t: 'bass', pat: 'x...5...x...5...', wave: 'triangle', vol: 0.085 },
      { t: 'arp', inst: 'lute', pat: '0.1.2.1.0.1.2.1.', vol: 0.016 },
      { t: 'lead', rhythm: ['x.x.x...x.......', '....x.x.x...x...'], oct: 1, vol: 0.015, from: 4 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.004 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.035, f: 80 },
    ] },
    { name: 'Golden Field', bpm: 80, key: 53, scale: 'major', prog: [3, 2, 1, 0, 3, 2, 1, 4], seed: 314, loops: 2, swing: 0.12, vol: 0.85, layers: [
      { t: 'pad', vol: 0.016, notes: 3 },
      { t: 'bass', pat: 'x.........x.....', wave: 'sine', vol: 0.1 },
      { t: 'arp', inst: 'epiano', pat: '0...2.1...3.2...', oct: 1, vol: 0.018 },
      { t: 'bell', rhythm: ['....x...x...x...', 'x.......x.......'], oct: 1, vol: 0.013, from: 4 },
    ] },
  ],
  night: [
    { name: 'Crickets', bpm: 70, key: 57, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 0, 4], seed: 321, loops: 2, swing: 0.1, vol: 0.85, layers: [
      { t: 'pad', vol: 0.018, notes: 3 },
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.1 },
      { t: 'arp', inst: 'epiano', pat: '0...2...1...3...', oct: 1, vol: 0.018 },
      { t: 'bell', rhythm: ['x.....x.........', 'x...x...........'], oct: 1, vol: 0.013, from: 4 },
    ] },
    { name: 'Moon Over Barn', bpm: 66, key: 62, scale: 'major', prog: [0, 3, 5, 4, 0, 3, 1, 4], seed: 322, loops: 2, vol: 0.85, layers: [
      { t: 'bass', pat: 'x...............', wave: 'sine', vol: 0.1 },
      { t: 'arp', inst: 'bell', pat: '2...1...3...0...', oct: 1, vol: 0.012 },
      { t: 'lead', rhythm: ['x.......x.......', '....x.......x...'], oct: 1, vol: 0.016, from: 2 },
    ] },
  ],
};
