// Музыка «Домино на даче»: тёплая акустика короткими нотами — укулеле, гитарный щипок, «балалаечный» лют,
// маримба, мягкое электропиано, колокольчики. Без пэдов и тянущихся звуков.
// Плейлисты: menu (главный экран), game (партия днём), night (вечер и зима), final (концовка партии).
const U = (decay = 0.3) => ({ inst: 'uke', decay });
const G = (decay = 0.34) => ({ inst: 'pluck', decay, lp: 2000 });
const B = (decay = 0.38) => ({ inst: 'lute', decay, lp: 1700 });
const M = (decay = 0.32) => ({ inst: 'marimba', decay });
const E = (decay = 0.5) => ({ inst: 'epiano', decay });
const C = (decay = 0.6) => ({ inst: 'bell', decay });

export const SONGS = {
  menu: [
    { name: 'Dacha Morning', bpm: 94, key: 55, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 701, loops: 2, swing: 0.08, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', ...G(0.3), pat: '0.2.1.2.0.2.1.2.', vol: 0.022 },
      { t: 'lead', ...M(0.34), rhythm: ['x..x..x...x.....', 'x.x...x...x.x...'], vol: 0.034, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.007 },
    ] },
    { name: 'Garden Gate', bpm: 100, key: 53, scale: 'pentaMajor', prog: [0, 5, 3, 4, 0, 5, 3, 4], seed: 702, loops: 2, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', ...U(0.26), pat: '0.1.2.1.0.1.2.3.', vol: 0.02 },
      { t: 'bell', ...C(0.5), rhythm: ['x.......x...x...', 'x...x.......x...'], vol: 0.02, from: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.009 },
    ] },
    { name: 'Samovar Waltz', bpm: 112, key: 57, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 1, 4], seed: 703, loops: 2, layers: [
      { t: 'bass', pat: 'x.....x.....x...', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', ...B(0.32), pat: '..1.2...1.2.....', vol: 0.02 },
      { t: 'lead', ...E(0.45), rhythm: ['x.....x...x.....', 'x...x.x.........'], vol: 0.03, from: 2, len: 2 },
    ] },
    { name: 'Cherry Jam', bpm: 88, key: 52, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 0], seed: 704, loops: 2, swing: 0.12, layers: [
      { t: 'bass', pat: 'x..x....x..x....', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', ...U(0.25), pat: '0.2.0.2.1.2.1.3.', vol: 0.019 },
      { t: 'lead', ...G(0.36), rhythm: ['x.x...x...x.....', 'x...x.x.x.......'], vol: 0.03, from: 2, len: 2 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.004 },
    ] },
  ],
  game: [
    { name: 'Tea on the Porch', bpm: 90, key: 53, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 3, 4], seed: 711, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.09, len: 1 },
      { t: 'arp', ...G(0.3), pat: '0.2.1.2.0.2.1.3.', vol: 0.017 },
      { t: 'lead', ...M(0.38), rhythm: ['x...x.x...x.....', 'x.x.....x.......'], vol: 0.025, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.005 },
    ] },
    { name: 'Clicking Tiles', bpm: 96, key: 55, scale: 'pentaMajor', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 712, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', ...U(0.26), pat: '0.1.2.3.2.1.0.1.', vol: 0.016 },
      { t: 'bell', ...C(0.45), rhythm: ['x.......x...x...', 'x...x.......x...'], vol: 0.017, from: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.008 },
    ] },
    { name: 'Apple Orchard', bpm: 84, key: 50, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 713, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.09, len: 2 },
      { t: 'arp', ...B(0.34), pat: '0.2.1.2.0.2.1.2.', vol: 0.016 },
      { t: 'lead', ...E(0.42), rhythm: ['x..x..x...x.....', 'x.......x.x.....'], vol: 0.024, from: 2, len: 2 },
    ] },
    { name: 'Neighbors', bpm: 104, key: 57, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 714, loops: 3, swing: 0.14, layers: [
      { t: 'bass', pat: 'x..x..x.x..x....', wave: 'triangle', vol: 0.085, len: 1 },
      { t: 'arp', ...M(0.25), pat: '0123012301230123', vol: 0.012 },
      { t: 'lead', ...U(0.3), rhythm: ['x.x.x...x.......', 'x.......x.x.x...'], vol: 0.025, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.045, f: 80 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.004 },
    ] },
    { name: 'Lazy Sunday', bpm: 80, key: 52, scale: 'pentaMajor', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 715, loops: 3, layers: [
      { t: 'bass', pat: 'x...........x...', wave: 'sine', vol: 0.09, len: 2 },
      { t: 'arp', ...G(0.32), pat: '0...2...1...2...', vol: 0.02 },
      { t: 'lead', ...M(0.4), rhythm: ['x...x...x.x.....', 'x.x...x.........'], vol: 0.025, from: 2, len: 2 },
    ] },
  ],
  night: [
    { name: 'Fireflies', bpm: 78, key: 50, scale: 'minor', prog: [0, 5, 3, 4, 0, 5, 6, 4], seed: 721, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.09, len: 2 },
      { t: 'arp', ...E(0.5), pat: '0...2...1...2...', vol: 0.02 },
      { t: 'bell', ...C(0.55), rhythm: ['x.....x.....x...', 'x.......x.......'], vol: 0.016, from: 2 },
    ] },
    { name: 'String Lights', bpm: 86, key: 53, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 722, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.....x.........', wave: 'triangle', vol: 0.085, len: 1 },
      { t: 'arp', ...G(0.3), pat: '0.2.1.2.0.2.1.2.', vol: 0.014 },
      { t: 'lead', ...M(0.36), rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.022, from: 2, len: 2 },
      { t: 'rim', pat: '........o.......', vol: 0.007 },
    ] },
    { name: 'Warm Window', bpm: 72, key: 55, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 1, 4], seed: 723, loops: 3, layers: [
      { t: 'bass', pat: 'x...........x...', wave: 'sine', vol: 0.085, len: 2 },
      { t: 'arp', ...E(0.55), pat: '0.....2.....1...', vol: 0.02 },
      { t: 'lead', ...C(0.5), rhythm: ['x.......x...x...', 'x...x...........'], vol: 0.016, from: 2 },
    ] },
    { name: 'Crickets', bpm: 90, key: 48, scale: 'pentaMinor', prog: [0, 3, 4, 0, 5, 3, 4, 0], seed: 724, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'sine', vol: 0.085, len: 1 },
      { t: 'arp', ...U(0.24), pat: '0.1.2.1.0.1.2.1.', vol: 0.013 },
      { t: 'lead', ...B(0.36), rhythm: ['x..x....x.......', 'x.....x...x.....'], vol: 0.02, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.004 },
    ] },
  ],
  final: [
    { name: 'Last Tile', bpm: 108, key: 50, scale: 'dorian', prog: [0, 3, 4, 3, 0, 3, 6, 4], seed: 731, loops: 3, swing: 0.06, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..x.', wave: 'triangle', vol: 0.085, len: 1 },
      { t: 'arp', ...M(0.24), pat: '0213021302130213', vol: 0.012 },
      { t: 'lead', ...G(0.3), rhythm: ['x.x...x.x...x...', 'x...x.x...x.x...'], vol: 0.024, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.05, f: 80 },
      { t: 'rim', pat: '....o.......o...', vol: 0.009 },
    ] },
    { name: 'Who Blinks First', bpm: 100, key: 52, scale: 'minor', prog: [0, 5, 6, 4, 0, 5, 3, 4], seed: 732, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x...x...x.', wave: 'sine', vol: 0.09, len: 1 },
      { t: 'arp', ...U(0.24), pat: '0.2.1.2.0.2.1.3.', vol: 0.013 },
      { t: 'lead', ...M(0.32), rhythm: ['x..x..x...x.x...', 'x.x...x.x.......'], vol: 0.024, from: 2, len: 2 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.004 },
    ] },
  ],
};
