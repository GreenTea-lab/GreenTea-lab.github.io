// Музыка «Небесного островка»: уютный лоу-фай
export const SONGS = {
  game: [
    { name: 'Morning Breeze', bpm: 76, key: 53, scale: 'major', prog: [3, 2, 1, 0, 3, 2, 1, 4], seed: 21, loops: 2, swing: 0.12, layers: [
      { t: 'pad', wave: 'triangle', lp: 1200, vol: 0.022, attack: 0.6, notes: 4 },
      { t: 'bass', pat: 'x.........x.....', wave: 'sine', vol: 0.13 },
      { t: 'arp', inst: 'epiano', pat: '0...2.1...3.2...', oct: 1, vol: 0.024, decay: 0.9 },
      { t: 'bell', rhythm: ['....x...x...x...', 'x.......x.......'], oct: 1, vol: 0.02, from: 4 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.008, minI: 0.3 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.06, f: 80, minI: 0.3 },
    ] },
    { name: 'Cloud Garden', bpm: 84, key: 60, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 22, loops: 2, layers: [
      { t: 'pad', wave: 'triangle', lp: 1600, vol: 0.022, attack: 0.5 },
      { t: 'bass', pat: 'x.....x...x.....', wave: 'triangle', vol: 0.11 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.3.0.2.1.3.', oct: 1, vol: 0.02, decay: 0.4 },
      { t: 'flute', rhythm: ['x...x.....x.....', 'x.....x...x.....'], oct: 1, vol: 0.024, from: 2, len: 6 },
      { t: 'hat', pat: 'o.o.o.o.o.o.o.o.', vol: 0.006, minI: 0.3 },
    ] },
    { name: 'Sunny Fields', bpm: 92, key: 55, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 23, loops: 2, swing: 0.1, layers: [
      { t: 'pad', wave: 'triangle', lp: 1400, vol: 0.02 },
      { t: 'bass', pat: 'x...5...x...5...', wave: 'triangle', vol: 0.1 },
      { t: 'arp', inst: 'lute', pat: '0.2.1.2.0.2.1.2.', vol: 0.02, lp: 2200, decay: 0.4 },
      { t: 'bell', rhythm: ['x.x.....x.x.....', 'x...x...x.......'], oct: 1, vol: 0.02, from: 4 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.012, minI: 0.3 },
    ] },
    { name: 'Evening Lanterns', bpm: 70, key: 57, scale: 'minor', prog: [5, 3, 0, 4, 5, 3, 6, 4], seed: 24, loops: 2, swing: 0.12, layers: [
      { t: 'pad', wave: 'triangle', lp: 1000, vol: 0.024, attack: 0.9, notes: 4 },
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.13 },
      { t: 'arp', inst: 'epiano', pat: '0.1.2.3.........', oct: 1, vol: 0.024, decay: 1.2 },
      { t: 'flute', rhythm: ['x.......x...x...', '....x...x.......'], oct: 1, vol: 0.022, from: 2, len: 8 },
      { t: 'rim', pat: '....o.......o...', vol: 0.012, minI: 0.3 },
    ] },
  ],
  night: [
    { name: 'Starry Night', bpm: 66, key: 62, scale: 'major', prog: [0, 3, 5, 4, 0, 3, 1, 4], seed: 25, loops: 2, layers: [
      { t: 'pad', wave: 'sine', lp: 1200, vol: 0.03, attack: 1.2, notes: 4 },
      { t: 'bass', pat: 'x...............', wave: 'sine', vol: 0.12 },
      { t: 'arp', inst: 'bell', pat: '2...1...3...0...', oct: 1, vol: 0.016, decay: 1.6 },
      { t: 'flute', rhythm: ['x.......x.......', '....x.......x...'], oct: 1, vol: 0.02, from: 2, len: 8 },
    ] },
    { name: 'Moon Harbor', bpm: 72, key: 57, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 0, 4], seed: 26, loops: 2, swing: 0.1, layers: [
      { t: 'pad', wave: 'triangle', lp: 900, vol: 0.026, attack: 1, notes: 4 },
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.12 },
      { t: 'arp', inst: 'epiano', pat: '0...2...1...3...', oct: 1, vol: 0.02, decay: 1.2 },
      { t: 'bell', rhythm: ['x.....x.........', 'x...x...........'], oct: 1, vol: 0.016, from: 4 },
    ] },
  ],
};
SONGS.menu = SONGS.game;
