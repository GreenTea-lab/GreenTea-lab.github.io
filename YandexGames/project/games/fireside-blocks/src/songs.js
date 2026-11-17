// Музыка «Блоков у камина»: тёплая и неспешная, только короткие звуки — маримба, электропиано, щипки, челеста, колокольчики.
// Никаких пэдов, флейт и протяжных нот. Лёгкая перкуссия (шейкер, римшот), без «долбёжки».
// Плейлисты: меню, классика, четыре времени года в путешествии.
const PZ = (decay = 0.22) => ({ inst: 'pizz', decay });

export const SONGS = {
  menu: [
    { name: 'Evening Tea', bpm: 84, key: 60, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 501, loops: 2, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'epiano', pat: '0...2...1...2...', vol: 0.026, decay: 0.7 },
      { t: 'lead', inst: 'marimba', decay: 0.35, rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.03, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.006 },
    ] },
    { name: 'Warm Slippers', bpm: 78, key: 57, scale: 'pentaMajor', prog: [0, 3, 4, 3, 0, 5, 3, 4], seed: 502, loops: 2, layers: [
      { t: 'bass', pat: 'x.....x.........', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'marimba', pat: '0.1.2.1.0.1.2.1.', vol: 0.022, decay: 0.3 },
      { t: 'bell', inst: 'celesta', rhythm: ['x.......x...x...', '....x.......x...'], vol: 0.02, from: 2, decay: 0.5 },
    ] },
    { name: 'Rocking Chair', bpm: 90, key: 62, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 503, loops: 2, swing: 0.12, layers: [
      { t: 'bass', pat: 'x.....x.....x...', wave: 'triangle', vol: 0.09, len: 2 },
      { t: 'arp', ...PZ(0.2), pat: '0.2.1.2.0.2.1.2.', vol: 0.022 },
      { t: 'lead', inst: 'epiano', decay: 0.6, rhythm: ['x.....x.....x...', 'x...x.....x.....'], vol: 0.026, from: 2, len: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.01 },
    ] },
  ],
  classic: [
    { name: 'Wooden Steps', bpm: 96, key: 60, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 511, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x...5...x...5...', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0.2.1.2.0.2.1.3.', vol: 0.022, decay: 0.25 },
      { t: 'lead', inst: 'epiano', decay: 0.5, rhythm: ['x..x..x...x.....', 'x.x...x.........', 'x...x.x.x.......', 'x.......x...x...'], vol: 0.028, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.05, f: 80 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.007 },
    ] },
    { name: 'Knitting Circle', bpm: 88, key: 55, scale: 'pentaMajor', prog: [0, 5, 3, 4, 0, 5, 3, 4], seed: 512, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', ...PZ(0.2), pat: '0.1.2.3.2.1.0.1.', vol: 0.02 },
      { t: 'bell', inst: 'celesta', rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.02, from: 2, decay: 0.45 },
      { t: 'rim', pat: '....o.......o...', vol: 0.009 },
    ] },
    { name: 'Honey Jar', bpm: 100, key: 62, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 4], seed: 513, loops: 3, swing: 0.14, layers: [
      { t: 'bass', pat: 'x..x..x.x.......', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.2.0.2.1.2.', vol: 0.018, decay: 0.25 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x..x..x.x.......', 'x.x.x...x...x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.05, f: 80 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.005 },
    ] },
  ],
  autumn: [
    { name: 'Falling Leaves', bpm: 86, key: 57, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 521, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x...x.o.x...x.5.', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0.2.1.3.0.2.1.3.', vol: 0.022, decay: 0.28 },
      { t: 'lead', inst: 'epiano', decay: 0.6, rhythm: ['x...x.x.x.......', 'x.x.....x...x...'], vol: 0.026, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...oo', vol: 0.006 },
    ] },
    { name: 'Apple Harvest', bpm: 94, key: 60, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 522, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'triangle', vol: 0.09, len: 2 },
      { t: 'arp', ...PZ(0.2), pat: '0123012301230123', vol: 0.016 },
      { t: 'bell', inst: 'bell', rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.016, from: 2, decay: 0.5 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.045, f: 80 },
      { t: 'rim', pat: '....o.......o...', vol: 0.01 },
    ] },
  ],
  winter: [
    { name: 'Snow on the Sill', bpm: 80, key: 64, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 531, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x.....x...', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'celesta', pat: '0.2.1.2.0.2.1.2.', vol: 0.016, decay: 0.4 },
      { t: 'lead', inst: 'marimba', decay: 0.32, rhythm: ['x.....x.....x...', 'x...x.x.....x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.006 },
    ] },
    { name: 'Tangerines', bpm: 92, key: 62, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 4, 4], seed: 532, loops: 3, swing: 0.12, layers: [
      { t: 'bass', pat: 'x...5...x...5...', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'bell', pat: '0...1...2...1...', vol: 0.013, decay: 0.5 },
      { t: 'lead', ...PZ(0.24), rhythm: ['x.x.x...x.x.....', 'x...x.x.x...x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.008 },
    ] },
  ],
  spring: [
    { name: 'Window Garden', bpm: 98, key: 65, scale: 'lydian', prog: [0, 1, 4, 0, 5, 1, 3, 4], seed: 541, loops: 3, layers: [
      { t: 'bass', pat: 'x...x...x...x.5.', wave: 'sine', vol: 0.09, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0.2.1.2.0.2.1.2.', vol: 0.02, decay: 0.25 },
      { t: 'bell', inst: 'celesta', rhythm: ['x..x..x.x.......', 'x.x.x...x...x...'], vol: 0.02, from: 2, decay: 0.4 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.045, f: 80 },
      { t: 'shaker', pat: '..o...o...o...oo', vol: 0.006 },
    ] },
    { name: 'Lilac Breeze', bpm: 88, key: 60, scale: 'pentaMajor', prog: [0, 3, 5, 4, 0, 3, 4, 4], seed: 542, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'epiano', pat: '2...3...1...0...', vol: 0.024, decay: 0.6 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x..x..x...x.....', 'x.......x.x.....'], vol: 0.03, from: 2, len: 2 },
    ] },
  ],
  summer: [
    { name: 'Strawberry Porch', bpm: 102, key: 62, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 551, loops: 3, swing: 0.14, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..5.', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', ...PZ(0.18), pat: '0.2.1.2.0.2.1.2.', vol: 0.02 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x..x..x...x.x...', 'x.x...x...x.....'], vol: 0.032, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.05, f: 82 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.005 },
    ] },
    { name: 'Long Light', bpm: 90, key: 67, scale: 'mixolydian', prog: [0, 6, 3, 4, 0, 6, 4, 4], seed: 552, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'pluck', pat: '0123012301230123', vol: 0.014, decay: 0.22 },
      { t: 'bell', inst: 'bell', rhythm: ['x.x.x...x.......', 'x.......x.x.x...'], vol: 0.015, from: 2, decay: 0.45 },
      { t: 'rim', pat: '....o.......o...', vol: 0.01 },
    ] },
  ],
  sea: [
    { name: 'Low Tide', bpm: 92, key: 62, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 561, loops: 3, swing: 0.12, layers: [
      { t: 'bass', pat: 'x...x.....x.....', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'marimba', pat: '0.2.1.2.0.2.1.2.', vol: 0.02, decay: 0.26 },
      { t: 'bell', inst: 'celesta', rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.018, from: 2, decay: 0.45 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.007 },
    ] },
    { name: 'Seashell Song', bpm: 84, key: 65, scale: 'lydian', prog: [0, 1, 4, 0, 5, 1, 3, 4], seed: 562, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'pluck', pat: '0123012301230123', vol: 0.014, decay: 0.24 },
      { t: 'lead', inst: 'epiano', decay: 0.55, rhythm: ['x...x.x.........', 'x.....x...x.....'], vol: 0.026, from: 2, len: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.009 },
    ] },
  ],
  fair: [
    { name: 'Gingerbread Stall', bpm: 104, key: 60, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 4], seed: 571, loops: 3, swing: 0.14, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..5.', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', ...PZ(0.18), pat: '0.2.1.2.0.2.1.2.', vol: 0.02 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x..x..x...x.x...', 'x.x.x...x...x...'], vol: 0.032, from: 2, len: 2 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.008 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.05, f: 82 },
    ] },
    { name: 'Merry Square', bpm: 96, key: 64, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 572, loops: 3, layers: [
      { t: 'bass', pat: 'x...5...x...5...', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'bell', pat: '0...1...2...1...', vol: 0.013, decay: 0.5 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x.x.x...x.x.....', 'x...x.x.x...x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.005 },
    ] },
  ],
  forest: [
    { name: 'Fireflies', bpm: 78, key: 57, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 581, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x.....x...', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'celesta', pat: '0.2.1.3.0.2.1.3.', vol: 0.016, decay: 0.4 },
      { t: 'lead', inst: 'epiano', decay: 0.6, rhythm: ['x.....x.....x...', 'x...x.x.....x...'], vol: 0.026, from: 2, len: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.008 },
    ] },
    { name: 'Mossy Path', bpm: 86, key: 55, scale: 'pentaMajor', prog: [0, 5, 3, 4, 0, 5, 3, 4], seed: 582, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'marimba', pat: '0.1.2.3.2.1.0.1.', vol: 0.02, decay: 0.28 },
      { t: 'bell', inst: 'bell', rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.016, from: 2, decay: 0.5 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.006 },
    ] },
  ],
  night: [
    { name: 'Starlight', bpm: 72, key: 60, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 591, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'celesta', pat: '0...2...1...2...', vol: 0.018, decay: 0.55 },
      { t: 'lead', inst: 'epiano', decay: 0.7, rhythm: ['x.......x.......', 'x...x...........'], vol: 0.024, from: 2, len: 2 },
    ] },
    { name: 'Lullaby for the Moon', bpm: 76, key: 63, scale: 'pentaMajor', prog: [0, 3, 5, 4, 0, 3, 4, 4], seed: 592, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x.........', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', ...PZ(0.3), pat: '2.1.0.1.2.1.0.1.', vol: 0.02 },
      { t: 'bell', inst: 'celesta', rhythm: ['x.......x...x...', '....x.......x...'], vol: 0.018, from: 2, decay: 0.5 },
    ] },
  ],
};
