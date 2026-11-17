// Музыка «Барабана удачи»: бодрая эстрада телестудии — электропиано, медь, колокольчики, лёгкий свинг.
// Плейлисты: menu (заставка студии), game (под игру, тихо и мягко, чтобы не мешать ведущему),
// final (финал), super (суперигра — напряжённее).
const E = (decay = 0.6) => ({ inst: 'epiano', decay });
const M = (decay = 0.3) => ({ inst: 'marimba', decay });
const C = (decay = 0.8) => ({ inst: 'bell', decay });
const BR = { inst: 'brass', lp: 1300 };

export const SONGS = {
  menu: [
    { name: 'Studio Lights', bpm: 118, key: 55, scale: 'major', prog: [0, 5, 1, 4, 0, 5, 3, 4], seed: 901, loops: 2, swing: 0.12, layers: [
      { t: 'bass', pat: 'x...5...x...5.3.', wave: 'triangle', vol: 0.11, len: 1.5 },
      { t: 'arp', ...E(0.5), pat: '..1.2...1.2...3.', vol: 0.024 },
      { t: 'lead', ...BR, rhythm: ['x.x...x...x.....', 'x...x.x.x.......'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.05 },
      { t: 'snare', pat: '....x.......x...', vol: 0.018 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.01 },
    ] },
    { name: 'Capital Show', bpm: 124, key: 57, scale: 'mixolydian', prog: [0, 3, 0, 4, 0, 3, 6, 4], seed: 902, loops: 2, swing: 0.1, layers: [
      { t: 'bass', pat: 'x..x..x...x..x..', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', ...M(0.28), pat: '0.2.1.2.0.2.1.3.', vol: 0.02 },
      { t: 'bell', ...C(0.7), rhythm: ['x.......x...x...', 'x...x.......x...'], vol: 0.02, from: 2 },
      { t: 'lead', ...BR, rhythm: ['x...x.x...x.....', 'x.x.....x.......'], vol: 0.026, from: 4, len: 2 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.04 },
      { t: 'clap', pat: '....x.......x...', vol: 0.012 },
    ] },
  ],
  game: [
    { name: 'Thinking Cap', bpm: 96, key: 53, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 911, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.......x...5...', wave: 'sine', vol: 0.09, len: 1.5 },
      { t: 'arp', ...E(0.45), pat: '0...2...1...2...', vol: 0.016 },
      { t: 'lead', ...M(0.34), rhythm: ['x...x.....x.....', 'x.x.....x.......'], vol: 0.018, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.004 },
    ] },
    { name: 'Letter by Letter', bpm: 102, key: 55, scale: 'pentaMajor', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 912, loops: 3, swing: 0.12, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'triangle', vol: 0.085, len: 1 },
      { t: 'arp', ...M(0.26), pat: '0.1.2.3.2.1.0.1.', vol: 0.013 },
      { t: 'bell', ...C(0.6), rhythm: ['x.......x...x...', 'x...x.......x...'], vol: 0.014, from: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.007 },
    ] },
    { name: 'Golden Drum', bpm: 92, key: 50, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 913, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.09, len: 1.5 },
      { t: 'arp', ...E(0.5), pat: '0.2.1.2.0.2.1.3.', vol: 0.014 },
      { t: 'lead', ...M(0.36), rhythm: ['x...x.x...x.....', 'x.....x.x.......'], vol: 0.017, from: 2, len: 2 },
    ] },
  ],
  final: [
    { name: 'Big Final', bpm: 108, key: 52, scale: 'minor', prog: [0, 5, 3, 4, 0, 5, 6, 4], seed: 921, loops: 3, layers: [
      { t: 'bass', pat: 'x..x....x..x....', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', ...E(0.4), pat: '0.1.2.1.0.1.2.3.', vol: 0.015 },
      { t: 'lead', ...BR, rhythm: ['x.......x.x.....', 'x...x...x.......'], vol: 0.016, from: 2, len: 3 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.035 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.006 },
    ] },
  ],
  super: [
    { name: 'Countdown', bpm: 120, key: 50, scale: 'minor', prog: [0, 0, 5, 5, 3, 3, 4, 4], seed: 931, loops: 4, layers: [
      { t: 'bass', pat: 'x.x.x.x.x.x.x.x.', wave: 'triangle', vol: 0.08, len: 0.6 },
      { t: 'arp', ...M(0.22), pat: '0.2.0.2.1.2.1.3.', vol: 0.014 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.035 },
      { t: 'hat', pat: 'o.o.o.o.o.o.o.o.', vol: 0.006 },
    ] },
  ],
};
