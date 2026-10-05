// Музыка «Дзен-сада»: кото-подобные щипки, колокольчики, мягкий бас, японские лады. Всё короткое и затухающее.
export const SONGS = {
  menu: [
    { name: 'Moon Over Kyoto', bpm: 64, key: 57, scale: 'hirajoshi', prog: [0, 3, 4, 0, 5, 3, 4, 0], seed: 201, loops: 2, vol: 0.9, layers: [
      { t: 'bass', pat: 'x...............', wave: 'sine', vol: 0.11 },
      { t: 'arp', inst: 'lute', pat: '0...2...1...3...', oct: 1, vol: 0.022 },
      { t: 'bell', rhythm: ['x.....x.........', '....x.....x.....'], oct: 1, vol: 0.015, from: 2 },
    ] },
    { name: 'Temple Steps', bpm: 70, key: 52, scale: 'yo', prog: [0, 4, 3, 0, 0, 5, 4, 0], seed: 202, loops: 2, swing: 0.08, vol: 0.9, layers: [
      { t: 'pad', vol: 0.016, notes: 3 },
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.1 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1...3.2.....', oct: 1, vol: 0.02, decay: 0.28 },
      { t: 'tom', pat: '..............o.', vol: 0.03, f: 110 },
    ] },
  ],
  game: [
    { name: 'Raked Sand', bpm: 62, key: 55, scale: 'yo', prog: [0, 3, 0, 4, 5, 3, 4, 0], seed: 211, loops: 2, vol: 0.85, layers: [
      { t: 'bass', pat: 'x...............', wave: 'sine', vol: 0.1 },
      { t: 'arp', inst: 'lute', pat: '0...1...2...1...', oct: 1, vol: 0.018 },
      { t: 'lead', rhythm: ['x.......x...x...', '....x.......x...'], oct: 1, vol: 0.016, from: 2 },
      { t: 'rim', pat: '........o.......', vol: 0.007 },
    ] },
    { name: 'Koi Pond', bpm: 72, key: 60, scale: 'hirajoshi', prog: [0, 0, 3, 4, 0, 5, 3, 4], seed: 212, loops: 2, swing: 0.1, vol: 0.85, layers: [
      { t: 'pad', vol: 0.015, notes: 3 },
      { t: 'bass', pat: 'x.....x.........', wave: 'sine', vol: 0.095 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.3.........', oct: 1, vol: 0.017, decay: 0.26 },
      { t: 'bell', rhythm: ['x...........x...', '......x.........'], oct: 1, vol: 0.013, from: 4 },
    ] },
    { name: 'Bamboo Wind', bpm: 66, key: 50, scale: 'yo', prog: [0, 4, 5, 3, 0, 4, 3, 0], seed: 213, loops: 2, vol: 0.85, layers: [
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.1 },
      { t: 'arp', inst: 'lute', pat: '0.1.2.1.0.......', oct: 1, vol: 0.017 },
      { t: 'lead', rhythm: ['x.....x.....x...', 'x...............'], oct: 1, vol: 0.015, from: 2 },
      { t: 'shaker', pat: '..o.......o.....', vol: 0.004 },
    ] },
    { name: 'Lantern Path', bpm: 76, key: 57, scale: 'hirajoshi', prog: [0, 3, 4, 5, 0, 3, 4, 0], seed: 214, loops: 2, swing: 0.08, vol: 0.8, layers: [
      { t: 'pad', vol: 0.014 },
      { t: 'bass', pat: 'x...5...x.......', wave: 'triangle', vol: 0.085 },
      { t: 'arp', inst: 'pluck', pat: '0...2...1...3...', oct: 1, vol: 0.017, decay: 0.24 },
      { t: 'bell', rhythm: ['x.x.....x.......', '....x...x.......'], oct: 1, vol: 0.013, from: 4 },
      { t: 'tom', pat: 'o...............', vol: 0.025, f: 95 },
    ] },
    { name: 'Snow on Pines', bpm: 60, key: 62, scale: 'yo', prog: [0, 5, 3, 4, 0, 5, 4, 0], seed: 215, loops: 2, vol: 0.85, layers: [
      { t: 'bass', pat: 'x...............', wave: 'sine', vol: 0.1 },
      { t: 'arp', inst: 'bell', pat: '2...1...3...0...', oct: 1, vol: 0.012 },
      { t: 'lead', rhythm: ['x.......x.......', '....x.......x...'], oct: 1, vol: 0.016, from: 2 },
    ] },
  ],
};
