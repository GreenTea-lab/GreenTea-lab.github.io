// Музыка «Магната»: лёгкий лаунж и свинг — электропиано, щипковый бас, маримба, колокольчики, щётки.
// Плейлисты: menu (главный экран), game (партия днём), night (вечерние фоны), final (последние круги).
const G = (decay = 0.34) => ({ inst: 'pluck', decay, lp: 2000 });
const M = (decay = 0.32) => ({ inst: 'marimba', decay });
const E = (decay = 0.5) => ({ inst: 'epiano', decay });
const C = (decay = 0.6) => ({ inst: 'bell', decay });
const V = (decay = 0.3) => ({ inst: 'vibes', decay });

export const SONGS = {
  menu: [
    { name: 'Grand Lobby', bpm: 92, key: 53, scale: 'major', prog: [0, 5, 1, 4, 0, 5, 1, 4], seed: 901, loops: 2, swing: 0.14, layers: [
      { t: 'bass', pat: 'x...x...x...x.5.', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', ...E(0.5), pat: '..1.2.....1.2...', vol: 0.02 },
      { t: 'lead', ...M(0.36), rhythm: ['x..x..x...x.....', 'x.x...x...x.x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.004 },
      { t: 'rim', pat: '....o.......o...', vol: 0.006 },
    ] },
    { name: 'Velvet Ledger', bpm: 84, key: 50, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 902, loops: 2, swing: 0.12, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', ...E(0.55), pat: '0...2...1...2...', vol: 0.022 },
      { t: 'bell', ...C(0.55), rhythm: ['x.......x...x...', 'x...x.......x...'], vol: 0.018, from: 2 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.004 },
    ] },
    { name: 'Morning Exchange', bpm: 100, key: 55, scale: 'pentaMajor', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 903, loops: 2, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', ...G(0.28), pat: '0.1.2.1.0.1.2.3.', vol: 0.018 },
      { t: 'lead', ...E(0.42), rhythm: ['x...x.x...x.....', 'x.x.....x.......'], vol: 0.028, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.006 },
    ] },
  ],
  game: [
    { name: 'Dice on Felt', bpm: 96, key: 53, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 0], seed: 911, loops: 3, swing: 0.14, layers: [
      { t: 'bass', pat: 'x...x...x...x...', wave: 'triangle', vol: 0.085, len: 1 },
      { t: 'arp', ...E(0.45), pat: '..1.2.....1.2...', vol: 0.016 },
      { t: 'lead', ...M(0.36), rhythm: ['x.x...x...x.....', 'x...x.x.x.......'], vol: 0.024, from: 2, len: 2 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.004 },
    ] },
    { name: 'Trans-Siberian', bpm: 104, key: 57, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 912, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x..x..x.x..x....', wave: 'triangle', vol: 0.08, len: 1 },
      { t: 'arp', ...G(0.26), pat: '0123012301230123', vol: 0.011 },
      { t: 'lead', ...V(0.3), rhythm: ['x.x.x...x.......', 'x.......x.x.x...'], vol: 0.024, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.04, f: 80 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.004 },
    ] },
    { name: 'Volga Promenade', bpm: 88, key: 50, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 913, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.09, len: 1 },
      { t: 'arp', ...E(0.5), pat: '0.2.1.2.0.2.1.2.', vol: 0.015 },
      { t: 'lead', ...M(0.38), rhythm: ['x..x..x...x.....', 'x.......x.x.....'], vol: 0.024, from: 2, len: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.006 },
    ] },
    { name: 'Rent Day', bpm: 108, key: 52, scale: 'pentaMajor', prog: [0, 5, 3, 4, 0, 5, 3, 4], seed: 914, loops: 3, swing: 0.15, layers: [
      { t: 'bass', pat: 'x...x...x...x.x.', wave: 'triangle', vol: 0.08, len: 1 },
      { t: 'arp', ...M(0.25), pat: '0.2.1.3.0.2.1.3.', vol: 0.013 },
      { t: 'bell', ...C(0.45), rhythm: ['x.......x...x...', 'x...x.......x...'], vol: 0.016, from: 2 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.004 },
      { t: 'clap', pat: '....x.......x...', vol: 0.006 },
    ] },
    { name: 'Golden Ring', bpm: 82, key: 55, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 915, loops: 3, layers: [
      { t: 'bass', pat: 'x...........x...', wave: 'sine', vol: 0.09, len: 2 },
      { t: 'arp', ...G(0.32), pat: '0...2...1...2...', vol: 0.02 },
      { t: 'lead', ...E(0.44), rhythm: ['x...x...x.x.....', 'x.x...x.........'], vol: 0.025, from: 2, len: 2 },
    ] },
  ],
  night: [
    { name: 'City Lights', bpm: 78, key: 50, scale: 'minor', prog: [0, 5, 3, 4, 0, 5, 6, 4], seed: 921, loops: 3, swing: 0.12, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'sine', vol: 0.09, len: 1 },
      { t: 'arp', ...E(0.55), pat: '0...2...1...2...', vol: 0.02 },
      { t: 'bell', ...C(0.55), rhythm: ['x.....x.....x...', 'x.......x.......'], vol: 0.016, from: 2 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.003 },
    ] },
    { name: 'Neva Midnight', bpm: 86, key: 53, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 922, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.....x.........', wave: 'triangle', vol: 0.085, len: 1 },
      { t: 'arp', ...V(0.32), pat: '0.2.1.2.0.2.1.2.', vol: 0.013 },
      { t: 'lead', ...E(0.44), rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.022, from: 2, len: 2 },
      { t: 'rim', pat: '........o.......', vol: 0.006 },
    ] },
    { name: 'Snow on the Roofs', bpm: 72, key: 55, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 1, 4], seed: 923, loops: 3, layers: [
      { t: 'bass', pat: 'x...............', wave: 'sine', vol: 0.09, len: 3 },
      { t: 'arp', ...C(0.6), pat: '0...1...2...1...', vol: 0.016 },
      { t: 'lead', ...E(0.5), rhythm: ['x.....x...x.....', 'x...x...........'], vol: 0.022, from: 2, len: 3 },
    ] },
  ],
  final: [
    { name: 'Closing Bell', bpm: 112, key: 52, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 4], seed: 931, loops: 3, swing: 0.12, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..x.', wave: 'triangle', vol: 0.085, len: 1 },
      { t: 'arp', ...M(0.25), pat: '0123012301230123', vol: 0.012 },
      { t: 'lead', ...V(0.3), rhythm: ['x.x.x...x.x.....', 'x...x.x.x...x...'], vol: 0.025, from: 1, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.045, f: 80 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.005 },
    ] },
    { name: 'Last Lap', bpm: 118, key: 57, scale: 'pentaMajor', prog: [0, 5, 3, 4, 0, 5, 3, 4], seed: 932, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x...x...x...x.x.', wave: 'triangle', vol: 0.08, len: 1 },
      { t: 'arp', ...G(0.24), pat: '0.1.2.3.2.1.0.1.', vol: 0.014 },
      { t: 'bell', ...C(0.45), rhythm: ['x...x...x.x.....', 'x.x...x...x.....'], vol: 0.018, from: 1 },
      { t: 'clap', pat: '....x.......x...', vol: 0.007 },
      { t: 'hat', pat: 'o.o.o.o.o.o.o.o.', vol: 0.003 },
    ] },
  ],
};
