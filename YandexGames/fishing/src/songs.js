// Музыка рыбалки: тихая «гитарная» акустика — щипки, мягкий бас, колокольчик. Всё короткое и затухающее.
export const SONGS = {
  menu: [
    { name: 'Quiet Pond', bpm: 76, key: 55, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 3, 4], seed: 501, loops: 2, swing: 0.1, vol: 0.9, layers: [
      { t: 'pad', vol: 0.014, notes: 3 },
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.09 },
      { t: 'arp', inst: 'lute', pat: '0.2.1.2.3.2.1.2.', vol: 0.017 },
      { t: 'bell', rhythm: ['x.......x...x...', 'x.....x.........'], oct: 1, vol: 0.012, from: 4 },
    ] },
  ],
  day: [
    { name: 'Float on Water', bpm: 84, key: 57, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 511, loops: 2, swing: 0.12, vol: 0.85, layers: [
      { t: 'pad', vol: 0.013, notes: 3 },
      { t: 'bass', pat: 'x.....x.x.......', wave: 'triangle', vol: 0.085 },
      { t: 'arp', inst: 'lute', pat: '0.2.1.2.0.2.1.2.', vol: 0.016 },
      { t: 'lead', rhythm: ['x...x.x.........', 'x.x.....x.......'], oct: 1, vol: 0.014, from: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.005 },
    ] },
    { name: 'Dragonfly', bpm: 92, key: 60, scale: 'pentaMajor', prog: [0, 3, 1, 4, 0, 3, 2, 4], seed: 512, loops: 2, swing: 0.14, vol: 0.85, layers: [
      { t: 'bass', pat: 'x...x...x...x...', wave: 'triangle', vol: 0.08 },
      { t: 'arp', inst: 'pluck', pat: '0.1.2.1.0.1.3.1.', oct: 1, vol: 0.014, decay: 0.22 },
      { t: 'bell', rhythm: ['x.....x...x.....', '....x.....x.....'], oct: 1, vol: 0.013, from: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.007 },
    ] },
    { name: 'Lazy Afternoon', bpm: 72, key: 53, scale: 'major', prog: [3, 0, 4, 5, 3, 0, 1, 4], seed: 513, loops: 2, swing: 0.1, vol: 0.9, layers: [
      { t: 'pad', vol: 0.015, notes: 3 },
      { t: 'bass', pat: 'x.........x.....', wave: 'sine', vol: 0.095 },
      { t: 'arp', inst: 'epiano', pat: '0...2.1...3.2...', oct: 1, vol: 0.017 },
      { t: 'bell', rhythm: ['....x...x...x...', 'x.......x.......'], oct: 1, vol: 0.012, from: 4 },
    ] },
    { name: 'Village Morning', bpm: 88, key: 55, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 0], seed: 514, loops: 2, swing: 0.13, vol: 0.85, layers: [
      { t: 'bass', pat: 'x...5...x...5...', wave: 'triangle', vol: 0.08 },
      { t: 'arp', inst: 'lute', pat: '0.1.2.1.0.1.2.1.', vol: 0.015 },
      { t: 'lead', rhythm: ['x.x.x...x.......', '....x.x.x...x...'], oct: 1, vol: 0.013, from: 4 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.0035 },
    ] },
  ],
  night: [
    { name: 'Moon Path', bpm: 66, key: 57, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 0, 4], seed: 521, loops: 2, swing: 0.08, vol: 0.85, layers: [
      { t: 'pad', vol: 0.017, notes: 3 },
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.095 },
      { t: 'arp', inst: 'epiano', pat: '0...2...1...3...', oct: 1, vol: 0.017 },
      { t: 'bell', rhythm: ['x.....x.........', 'x...x...........'], oct: 1, vol: 0.012, from: 4 },
    ] },
    { name: 'Fireflies', bpm: 70, key: 62, scale: 'major', prog: [0, 3, 5, 4, 0, 3, 1, 4], seed: 522, loops: 2, vol: 0.85, layers: [
      { t: 'bass', pat: 'x...............', wave: 'sine', vol: 0.1 },
      { t: 'arp', inst: 'bell', pat: '2...1...3...0...', oct: 1, vol: 0.011 },
      { t: 'lead', rhythm: ['x.......x.......', '....x.......x...'], oct: 1, vol: 0.014, from: 2 },
    ] },
  ],
};
