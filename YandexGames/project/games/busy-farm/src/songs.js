// Музыка «Хлопотливой фермы»: деревенский кантри-поп короткими нотами (щипки «банджо», электропиано, колокольчики).
// Без пэдов и протяжных звуков. Плейлисты: меню и четыре сезона.
const PL = (decay = 0.22) => ({ inst: 'pluck', decay }); // «банджо»
const EP = (decay = 0.45) => ({ inst: 'epiano', decay });

export const SONGS = {
  menu: [
    { name: 'Porch Morning', bpm: 92, key: 55, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 501, loops: 2, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'sine', vol: 0.11, len: 2 },
      { t: 'arp', ...PL(0.3), pat: '0.2.1.2.0.2.1.3.', vol: 0.022 },
      { t: 'lead', ...EP(0.5), rhythm: ['x...x.x...x.....', 'x.x...x.........'], vol: 0.03, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.007 },
    ] },
    { name: 'Rooster Waltz', bpm: 84, key: 53, scale: 'pentaMajor', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 502, loops: 2, layers: [
      { t: 'bass', pat: 'x.....x.....x...', wave: 'triangle', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'bell', decay: 0.6, pat: '0...2...1...3...', vol: 0.016 },
      { t: 'lead', ...PL(0.35), rhythm: ['x..x..x.....x...', 'x.....x..x......'], vol: 0.03, from: 2, len: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.01 },
    ] },
    { name: 'Hayloft Nap', bpm: 78, key: 50, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 503, loops: 2, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', ...EP(0.55), pat: '2...3...1...0...', vol: 0.024 },
      { t: 'lead', inst: 'bell', decay: 0.7, rhythm: ['x.......x.x.....', 'x...x.......x...'], vol: 0.018, from: 2, len: 2 },
    ] },
  ],
  spring: [
    { name: 'Goose Parade', bpm: 116, key: 55, scale: 'major', prog: [0, 3, 4, 0, 0, 3, 4, 4], seed: 511, loops: 3, swing: 0.12, layers: [
      { t: 'bass', pat: 'x...5...x...5...', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', ...PL(0.18), pat: '0.2.1.2.0.2.1.2.', vol: 0.02 },
      { t: 'lead', ...PL(0.3), rhythm: ['x.x.x...x.x.....', 'x...x.x.x...x...', 'x.x.x.x.x.......', 'x.......x.x.x...'], vol: 0.032, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.07, f: 85 },
      { t: 'clap', pat: '....o.......o...', vol: 0.012 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.006 },
    ] },
    { name: 'Fresh Grass', bpm: 108, key: 52, scale: 'pentaMajor', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 512, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'sine', vol: 0.11, len: 2 },
      { t: 'arp', ...EP(0.3), pat: '0.1.2.3.2.1.0.1.', vol: 0.02 },
      { t: 'lead', inst: 'bell', decay: 0.5, rhythm: ['x..x..x...x.x...', 'x.x...x...x.....'], vol: 0.02, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.07, f: 88 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.012 },
    ] },
    { name: 'Puddle Hop', bpm: 120, key: 57, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 3, 4], seed: 513, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..x.', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', ...PL(0.15), pat: '0123012301230123', vol: 0.014 },
      { t: 'lead', ...EP(0.35), rhythm: ['x.x.x...x.......', 'x.......x.x.x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x...x...', vol: 0.07, f: 90 },
      { t: 'rim', pat: '....o.......o...', vol: 0.014 },
    ] },
  ],
  summer: [
    { name: 'Sunny Pasture', bpm: 112, key: 53, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 0], seed: 521, loops: 3, swing: 0.14, layers: [
      { t: 'bass', pat: 'x...5...x...5.x.', wave: 'sine', vol: 0.11, len: 1 },
      { t: 'arp', ...PL(0.2), pat: '0.2.1.2.0.2.1.2.', vol: 0.02 },
      { t: 'lead', ...PL(0.32), rhythm: ['x..x..x.x.......', 'x.x.x...x...x...'], vol: 0.032, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.07, f: 85 },
      { t: 'clap', pat: '....o.......o...', vol: 0.012 },
      { t: 'shaker', pat: '..o...o...o...oo', vol: 0.007 },
    ] },
    { name: 'Woolly Jig', bpm: 124, key: 55, scale: 'major', prog: [0, 4, 0, 4, 3, 0, 4, 0], seed: 522, loops: 3, layers: [
      { t: 'bass', pat: 'x.x.x.x.x.x.x.x.', wave: 'triangle', vol: 0.08, len: 1 },
      { t: 'arp', inst: 'bell', decay: 0.35, pat: '0.2.1.3.0.2.1.3.', vol: 0.012 },
      { t: 'lead', ...PL(0.25), rhythm: ['x.x.x.x.x.x.x...', 'x.xxx.x.x.x.....'], vol: 0.03, from: 2, len: 1 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.06, f: 92 },
      { t: 'rim', pat: '..o...o...o...o.', vol: 0.012 },
    ] },
    { name: 'Lemonade Break', bpm: 100, key: 50, scale: 'pentaMajor', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 523, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'sine', vol: 0.11, len: 2 },
      { t: 'arp', ...EP(0.35), pat: '0.1.2.1.0.1.2.3.', vol: 0.022 },
      { t: 'lead', ...EP(0.45), rhythm: ['x...x.x...x.....', 'x.x.......x.x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.07, f: 85 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.005 },
    ] },
  ],
  autumn: [
    { name: 'Harvest Cart', bpm: 104, key: 50, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 531, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'triangle', vol: 0.1, len: 2 },
      { t: 'arp', ...PL(0.22), pat: '0.2.1.2.0.2.1.2.', vol: 0.02 },
      { t: 'lead', ...EP(0.4), rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.07, f: 82 },
      { t: 'rim', pat: '....o.......o...', vol: 0.014 },
    ] },
    { name: 'Pumpkin Patch', bpm: 112, key: 52, scale: 'mixolydian', prog: [0, 6, 3, 0, 4, 3, 6, 0], seed: 532, loops: 3, layers: [
      { t: 'bass', pat: 'x..x..x...x..x..', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'bell', decay: 0.4, pat: '0...2...1...2...', vol: 0.014 },
      { t: 'lead', ...PL(0.3), rhythm: ['x.x.x...x.x.....', 'x...x.x.x...x...'], vol: 0.032, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.07, f: 86 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.012 },
    ] },
    { name: 'Apple Basket', bpm: 96, key: 55, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 3, 4], seed: 533, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'sine', vol: 0.11, len: 2 },
      { t: 'arp', ...EP(0.4), pat: '0.2.1.3.0.2.1.3.', vol: 0.02 },
      { t: 'lead', ...PL(0.35), rhythm: ['x..x..x...x.....', 'x.....x.x.x.....'], vol: 0.03, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.007 },
    ] },
  ],
  winter: [
    { name: 'Snowy Barn', bpm: 98, key: 57, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 541, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'bell', decay: 0.5, pat: '0.2.1.2.0.2.1.3.', vol: 0.015 },
      { t: 'lead', ...EP(0.45), rhythm: ['x...x.x...x.....', 'x.x...x.........'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.06, f: 82 },
      { t: 'tambourine', pat: 'o...o...o...o...', vol: 0.01 },
    ] },
    { name: 'Cheese & Cocoa', bpm: 104, key: 53, scale: 'pentaMajor', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 542, loops: 3, swing: 0.12, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'triangle', vol: 0.1, len: 2 },
      { t: 'arp', ...PL(0.2), pat: '0123012301230123', vol: 0.013 },
      { t: 'lead', inst: 'bell', decay: 0.55, rhythm: ['x.x.x...x.......', 'x...x.x.x...x...'], vol: 0.02, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x...x...', vol: 0.06, f: 86 },
      { t: 'rim', pat: '....o.......o...', vol: 0.012 },
    ] },
    { name: 'Sleigh Bells Farm', bpm: 118, key: 55, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 543, loops: 3, layers: [
      { t: 'bass', pat: 'x...5...x...5...', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', ...EP(0.3), pat: '0.2.1.2.0.2.1.2.', vol: 0.02 },
      { t: 'lead', ...PL(0.3), rhythm: ['x.x.x.x.x...x...', 'x...x.x.x.x.....'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.07, f: 88 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.008 },
    ] },
  ],
};
