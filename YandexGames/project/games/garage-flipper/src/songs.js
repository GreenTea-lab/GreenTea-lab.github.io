// Музыка гаража: спокойный фанк и лоу-фай — щипковый бас, электропиано, лёгкие барабаны. Всё короткое.
export const SONGS = {
  menu: [
    { name: 'Oil Change', bpm: 92, key: 57, scale: 'dorian', prog: [0, 3, 4, 3, 0, 5, 4, 3], seed: 1101, loops: 2, swing: 0.12, vol: 0.85, layers: [
      { t: 'bass', pat: 'x..x..x...x.x...', wave: 'triangle', vol: 0.08 },
      { t: 'arp', inst: 'pluck', pat: '0...2...1...3...', oct: 1, vol: 0.014, decay: 0.2 },
      { t: 'bell', rhythm: ['x.....x.........', '....x.....x.....'], oct: 1, vol: 0.011, from: 2 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.005 },
      { t: 'kick', pat: 'x.......x..x....', vol: 0.032, f: 80 },
    ] },
  ],
  day: [
    { name: 'Garage Groove', bpm: 98, key: 55, scale: 'mixolydian', prog: [0, 0, 3, 3, 4, 3, 0, 4], seed: 1111, loops: 2, swing: 0.14, vol: 0.85, layers: [
      { t: 'bass', pat: 'x.x...x.x..x....', wave: 'triangle', vol: 0.08 },
      { t: 'arp', inst: 'lute', pat: '.0.1.2.1.0.1.3.1', vol: 0.012 },
      { t: 'lead', rhythm: ['x...x.x.........', '........x.x.x...'], oct: 1, vol: 0.012, from: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.008 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.003 },
      { t: 'kick', pat: 'x.....x...x.....', vol: 0.034, f: 80 },
    ] },
    { name: 'Chrome & Rust', bpm: 86, key: 60, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 1112, loops: 2, swing: 0.1, vol: 0.85, layers: [
      { t: 'pad', vol: 0.012, notes: 3 },
      { t: 'bass', pat: 'x.......x...x...', wave: 'sine', vol: 0.09 },
      { t: 'arp', inst: 'bell', pat: '2...0...1...3...', oct: 1, vol: 0.01 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.005 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.03, f: 80 },
    ] },
    { name: 'Wrench Funk', bpm: 104, key: 52, scale: 'dorian', prog: [0, 3, 0, 4, 0, 3, 5, 4], seed: 1113, loops: 2, swing: 0.1, vol: 0.85, layers: [
      { t: 'bass', pat: 'x..x.x..x..x.x..', wave: 'triangle', vol: 0.075 },
      { t: 'arp', inst: 'pluck', pat: '0.1.2.1.0.1.2.1.', oct: 1, vol: 0.012, decay: 0.16 },
      { t: 'bell', rhythm: ['x.........x.....', '....x...........'], oct: 1, vol: 0.011, from: 4 },
      { t: 'rim', pat: '....o..o....o...', vol: 0.008 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.03, f: 80 },
    ] },
  ],
  night: [
    { name: 'Late Shift', bpm: 80, key: 57, scale: 'pentaMinor', prog: [0, 3, 4, 3, 0, 3, 1, 4], seed: 1121, loops: 2, swing: 0.12, vol: 0.85, layers: [
      { t: 'pad', vol: 0.012, notes: 3 },
      { t: 'bass', pat: 'x.......x.x.....', wave: 'sine', vol: 0.09 },
      { t: 'arp', inst: 'bell', pat: '0...1...2...1...', oct: 1, vol: 0.01 },
      { t: 'hat', pat: '..o.......o.....', vol: 0.004 },
    ] },
  ],
};
