// Музыка «Кухонного Переполоха»: мягкий уютный поп короткими нотами (электропиано, щипки, колокольчики).
// Без пэдов, флейты и пилы — никаких протяжных звуков; мелодия в среднем регистре.
// Плейлисты: меню, миры (дом, пляж, горы, ночь) и «аврал» на последних 30 секундах.
const EP = (decay = 0.5) => ({ inst: 'epiano', decay });

export const SONGS = {
  menu: [
    { name: 'Morning Kettle', bpm: 92, key: 53, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 3, 4], seed: 201, loops: 2, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'sine', vol: 0.11, len: 2 },
      { t: 'arp', inst: 'epiano', pat: '0.2.1.2.0.2.1.3.', vol: 0.03, decay: 0.45 },
      { t: 'lead', ...EP(0.5), rhythm: ['x...x.x...x.....', 'x.x...x.........'], vol: 0.03, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.008 },
    ] },
    { name: 'Cozy Apron', bpm: 86, key: 55, scale: 'pentaMajor', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 202, loops: 2, layers: [
      { t: 'bass', pat: 'x...........x...', wave: 'triangle', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'pluck', pat: '0.1.2.3.2.1.0.1.', vol: 0.022, decay: 0.3 },
      { t: 'bell', rhythm: ['x.......x...x...', 'x...x.......x...'], vol: 0.02, from: 2, decay: 0.7 },
      { t: 'rim', pat: '....o.......o...', vol: 0.01 },
    ] },
    { name: 'Recipe Book', bpm: 80, key: 50, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 203, loops: 2, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'epiano', pat: '2...3...1...0...', vol: 0.026, decay: 0.6 },
      { t: 'lead', ...EP(0.45), rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.028, from: 2, len: 2 },
    ] },
  ],
  home: [
    { name: 'Pancake Shuffle', bpm: 112, key: 53, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 211, loops: 3, swing: 0.12, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..5.', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.2.0.2.1.2.', vol: 0.02, decay: 0.2 },
      { t: 'lead', ...EP(0.4), rhythm: ['x..x..x...x.x...', 'x.x...x...x.....', 'x..x..x.x.x.x...', 'x.......x...x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 85 },
      { t: 'clap', pat: '....o.......o...', vol: 0.014 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.006 },
    ] },
    { name: 'Soup of the Day', bpm: 106, key: 55, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 0], seed: 212, loops: 3, layers: [
      { t: 'bass', pat: 'x...5...x...5.x.', wave: 'sine', vol: 0.11, len: 1 },
      { t: 'arp', inst: 'epiano', pat: '0.2.1.2.0.2.1.2.', vol: 0.024, decay: 0.3 },
      { t: 'bell', rhythm: ['x.x.x...x.x.....', 'x...x.x.x...x...'], vol: 0.02, from: 2, decay: 0.5 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 85 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.014 },
    ] },
    { name: 'Busy Burners', bpm: 116, key: 52, scale: 'pentaMajor', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 213, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'triangle', vol: 0.11, len: 2 },
      { t: 'arp', inst: 'pluck', pat: '0123012301230123', vol: 0.016, decay: 0.18 },
      { t: 'lead', ...EP(0.4), rhythm: ['x.x.x...x.......', 'x.......x.x.x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x...x...', vol: 0.08, f: 90 },
      { t: 'rim', pat: '....o.......o...', vol: 0.016 },
    ] },
  ],
  beach: [
    { name: 'Coconut Grill', bpm: 110, key: 52, scale: 'major', prog: [0, 3, 4, 3, 0, 5, 3, 4], seed: 221, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.x...x.x.x...x.', wave: 'sine', vol: 0.11, len: 1 },
      { t: 'arp', inst: 'bell', pat: '0.2.1.3.0.2.1.3.', vol: 0.012, decay: 0.4 },
      { t: 'lead', inst: 'pluck', decay: 0.35, rhythm: ['x..x..x.x.......', 'x.x.x...x...x...'], vol: 0.032, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 88 },
      { t: 'rim', pat: '....o.......o.o.', vol: 0.018 },
      { t: 'shaker', pat: '..o...o...o...oo', vol: 0.008 },
    ] },
    { name: 'Seashell Fries', bpm: 104, key: 55, scale: 'pentaMajor', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 222, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'triangle', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'epiano', pat: '0.1.2.1.0.1.2.3.', vol: 0.022, decay: 0.3 },
      { t: 'lead', ...EP(0.4), rhythm: ['x.x.x...x.......', 'x.......x.x.x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x...x...', vol: 0.08, f: 88 },
      { t: 'clap', pat: '....o.......o...', vol: 0.012 },
    ] },
    { name: 'Sunny Pass', bpm: 114, key: 50, scale: 'mixolydian', prog: [0, 6, 3, 4, 0, 6, 4, 4], seed: 223, loops: 3, layers: [
      { t: 'bass', pat: 'x.x...x.x.x...x.', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.3.2.1.0.2.', vol: 0.02, decay: 0.22 },
      { t: 'bell', rhythm: ['x..x..x.x.......', 'x.x.x...x...x...'], vol: 0.02, from: 2, decay: 0.45 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 86 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.014 },
    ] },
  ],
  snow: [
    { name: 'Cocoa Cabin', bpm: 100, key: 52, scale: 'minor', prog: [0, 5, 3, 4, 0, 5, 6, 4], seed: 231, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.x.....', wave: 'sine', vol: 0.11, len: 2 },
      { t: 'arp', inst: 'bell', pat: '0.2.1.3.0.2.1.3.', vol: 0.012, decay: 0.5 },
      { t: 'lead', ...EP(0.45), rhythm: ['x...x...x.......', 'x.......x...x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.075, f: 85 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.008 },
    ] },
    { name: 'Slippery Floor', bpm: 108, key: 50, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 232, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'triangle', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'pluck', pat: '0123012301230123', vol: 0.015, decay: 0.2 },
      { t: 'bell', rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.02, from: 2, decay: 0.5 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 88 },
      { t: 'rim', pat: '....o.......o...', vol: 0.016 },
    ] },
  ],
  night: [
    { name: 'Lantern Market', bpm: 104, key: 50, scale: 'minor', prog: [0, 5, 2, 6, 0, 5, 3, 4], seed: 241, loops: 3, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..5.', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'epiano', pat: '0123012301230123', vol: 0.016, decay: 0.2 },
      { t: 'lead', ...EP(0.4), rhythm: ['x..x..x...x.x...', 'x.x...x...x.....'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.085, f: 90 },
      { t: 'rim', pat: '....o.......o...', vol: 0.024 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.009 },
    ] },
    { name: 'Firefly Noodles', bpm: 98, key: 55, scale: 'dorian', prog: [0, 3, 4, 3, 0, 6, 4, 5], seed: 242, loops: 3, layers: [
      { t: 'bass', pat: 'x...x.o.x...x.5.', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'bell', pat: '0.2.1.3.2.1.0.2.', vol: 0.012, decay: 0.45 },
      { t: 'lead', ...EP(0.45), rhythm: ['x...x.x.x.......', 'x.x.....x...x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 85 },
      { t: 'clap', pat: '....o.......o...', vol: 0.012 },
    ] },
    { name: 'Moon Dumplings', bpm: 92, key: 48, scale: 'minor', prog: [0, 6, 5, 6, 0, 6, 3, 4], seed: 243, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.11, len: 2 },
      { t: 'arp', inst: 'pluck', pat: '0.1.2.3.2.1.0.2.', vol: 0.018, decay: 0.25 },
      { t: 'bell', rhythm: ['x.....x...x.....', 'x...x...x.......'], vol: 0.02, from: 2, decay: 0.6 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.075, f: 85 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.008 },
    ] },
  ],
  // последние 30 секунд уровня
  boss: [
    { name: 'Rush Hour', bpm: 128, key: 50, scale: 'minor', prog: [0, 5, 6, 4, 0, 5, 3, 4], seed: 251, loops: 4, layers: [
      { t: 'bass', pat: 'x.x.x.x.x.x.x.5.', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', inst: 'pluck', pat: '0120012001200123', vol: 0.016, decay: 0.16 },
      { t: 'lead', ...EP(0.35), rhythm: ['x..x..x.x.......', 'x.x.x.x.x...x...'], vol: 0.03, len: 2 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.085, f: 90 },
      { t: 'clap', pat: '....o.......o...', vol: 0.014 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.01 },
    ] },
    { name: 'Last Orders', bpm: 132, key: 53, scale: 'mixolydian', prog: [0, 6, 3, 4, 0, 6, 4, 4], seed: 252, loops: 4, layers: [
      { t: 'bass', pat: 'x.x...x.x.x...x.', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'bell', pat: '0123012301230123', vol: 0.011, decay: 0.25 },
      { t: 'lead', inst: 'pluck', decay: 0.3, rhythm: ['x.x.x.x.x...x...', 'x..x..x.x.x.....'], vol: 0.032, len: 2 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.08, f: 90 },
      { t: 'tom', pat: '............ooxx', vol: 0.035, f: 120 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.01 },
    ] },
  ],
};
