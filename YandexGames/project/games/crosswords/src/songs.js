// Музыка «Кроссвордов»: спокойный уютный лоу-фай, всё короткое и мягкое (щипки, электропиано, колокольчики)
export const SONGS = {
  menu: [
    { name: 'Tea Time', bpm: 72, key: 55, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 101, loops: 2, swing: 0.1, vol: 0.9, layers: [
      { t: 'pad', vol: 0.02, notes: 3 },
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.11 },
      { t: 'arp', inst: 'epiano', pat: '0...2...1...3...', oct: 1, vol: 0.022 },
      { t: 'bell', rhythm: ['x.....x.....x...', 'x.......x.......'], oct: 1, vol: 0.016, from: 4 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.006 },
    ] },
    { name: 'Old Library', bpm: 66, key: 57, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 0, 4], seed: 102, loops: 2, swing: 0.12, vol: 0.9, layers: [
      { t: 'pad', vol: 0.022, notes: 3 },
      { t: 'bass', pat: 'x.......x.....x.', wave: 'sine', vol: 0.11 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.3.........', oct: 1, vol: 0.02, decay: 0.3 },
      { t: 'lead', rhythm: ['x...x.......x...', '....x...x.......'], oct: 1, vol: 0.018, from: 2 },
    ] },
  ],
  game: [
    { name: 'Morning Paper', bpm: 70, key: 53, scale: 'major', prog: [3, 2, 1, 0, 3, 2, 1, 4], seed: 111, loops: 2, swing: 0.12, vol: 0.85, layers: [
      { t: 'pad', vol: 0.018, notes: 3 },
      { t: 'bass', pat: 'x.........x.....', wave: 'sine', vol: 0.1 },
      { t: 'arp', inst: 'epiano', pat: '0...2.1...3.2...', oct: 1, vol: 0.02 },
      { t: 'bell', rhythm: ['....x...x...x...', 'x.......x.......'], oct: 1, vol: 0.014, from: 4 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.005 },
    ] },
    { name: 'Garden Bench', bpm: 78, key: 60, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 112, loops: 2, vol: 0.85, layers: [
      { t: 'pad', vol: 0.018 },
      { t: 'bass', pat: 'x.....x...x.....', wave: 'triangle', vol: 0.09 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.3.0.2.1.3.', oct: 1, vol: 0.016, decay: 0.3 },
      { t: 'lead', rhythm: ['x...x.....x.....', 'x.....x...x.....'], oct: 1, vol: 0.018, from: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.008 },
    ] },
    { name: 'Rainy Window', bpm: 64, key: 57, scale: 'minor', prog: [5, 3, 0, 4, 5, 3, 6, 4], seed: 113, loops: 2, swing: 0.12, vol: 0.85, layers: [
      { t: 'pad', vol: 0.02, notes: 3 },
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.11 },
      { t: 'arp', inst: 'epiano', pat: '0.1.2.3.........', oct: 1, vol: 0.02 },
      { t: 'bell', rhythm: ['x.......x...x...', '....x...x.......'], oct: 1, vol: 0.014, from: 2 },
    ] },
    { name: 'Sunday Walk', bpm: 84, key: 55, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 114, loops: 2, swing: 0.1, vol: 0.8, layers: [
      { t: 'pad', vol: 0.016 },
      { t: 'bass', pat: 'x...5...x...5...', wave: 'triangle', vol: 0.085 },
      { t: 'arp', inst: 'lute', pat: '0.2.1.2.0.2.1.2.', vol: 0.016 },
      { t: 'bell', rhythm: ['x.x.....x.x.....', 'x...x...x.......'], oct: 1, vol: 0.014, from: 4 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.005 },
    ] },
    { name: 'Warm Lamp', bpm: 68, key: 62, scale: 'major', prog: [0, 3, 5, 4, 0, 3, 1, 4], seed: 115, loops: 2, vol: 0.85, layers: [
      { t: 'pad', vol: 0.02, notes: 3 },
      { t: 'bass', pat: 'x...............', wave: 'sine', vol: 0.1 },
      { t: 'arp', inst: 'bell', pat: '2...1...3...0...', oct: 1, vol: 0.013 },
      { t: 'lead', rhythm: ['x.......x.......', '....x.......x...'], oct: 1, vol: 0.017, from: 2 },
    ] },
  ],
};
