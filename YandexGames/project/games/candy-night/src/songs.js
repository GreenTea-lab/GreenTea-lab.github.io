// Музыка «Конфетной Ночи»: озорной хеллоуинский свинг короткими нотами — пиццикато, маримба, челеста, колокольчики.
// Без пэдов, флейты и пилы: никаких протяжных звуков. Гармонический минор даёт «таинственность», но мягко.
// Плейлисты: меню, четыре мира, полночь (последние 30 секунд) и босс.
const PZ = (decay = 0.2) => ({ inst: 'pizz', decay });

export const SONGS = {
  menu: [
    { name: 'Pumpkin Porch', bpm: 96, key: 57, scale: 'harmonic', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 301, loops: 2, swing: 0.14, layers: [
      { t: 'bass', pat: 'x...5...x...5...', wave: 'sine', vol: 0.11, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0.2.1.2.0.2.1.3.', vol: 0.028, decay: 0.25 },
      { t: 'bell', inst: 'celesta', rhythm: ['x...x.x...x.....', 'x.x...x.........'], vol: 0.022, from: 2, decay: 0.45 },
      { t: 'rim', pat: '....o.......o...', vol: 0.012 },
    ] },
    { name: 'Candy Lanterns', bpm: 88, key: 55, scale: 'minor', prog: [0, 3, 6, 4, 0, 3, 5, 4], seed: 302, loops: 2, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'triangle', vol: 0.1, len: 2 },
      { t: 'arp', ...PZ(0.2), pat: '0.1.2.3.2.1.0.1.', vol: 0.024 },
      { t: 'lead', inst: 'celesta', decay: 0.5, rhythm: ['x.......x...x...', 'x...x.......x...'], vol: 0.022, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.007 },
    ] },
    { name: 'Sleepy Bats', bpm: 82, key: 53, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 303, loops: 2, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'epiano', pat: '2...3...1...0...', vol: 0.024, decay: 0.5 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x..x..x...x.....', 'x.......x.x.....'], vol: 0.03, from: 2, len: 2 },
    ] },
  ],
  lane: [
    { name: 'Trick or Treat Shuffle', bpm: 118, key: 57, scale: 'harmonic', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 311, loops: 3, swing: 0.16, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..5.', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', ...PZ(0.18), pat: '0.2.1.2.0.2.1.2.', vol: 0.022 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x..x..x...x.x...', 'x.x...x...x.....', 'x..x..x.x.x.x...', 'x.......x...x...'], vol: 0.034, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 85 },
      { t: 'snare', pat: '....o.......o...', vol: 0.02 },
      { t: 'hat', pat: 'o.o.o.o.o.o.o.o.', vol: 0.006 },
    ] },
    { name: 'Doorbell Dance', bpm: 112, key: 55, scale: 'minor', prog: [0, 6, 5, 4, 0, 6, 3, 4], seed: 312, loops: 3, swing: 0.12, layers: [
      { t: 'bass', pat: 'x...5...x...5.x.', wave: 'sine', vol: 0.11, len: 1 },
      { t: 'arp', inst: 'celesta', pat: '0.2.1.2.0.2.1.2.', vol: 0.016, decay: 0.3 },
      { t: 'lead', ...PZ(0.22), rhythm: ['x.x.x...x.x.....', 'x...x.x.x...x...'], vol: 0.036, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 85 },
      { t: 'clap', pat: '....o.......o...', vol: 0.012 },
    ] },
    { name: 'Orange Moon', bpm: 122, key: 52, scale: 'harmonic', prog: [0, 3, 4, 0, 5, 1, 4, 4], seed: 313, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'triangle', vol: 0.11, len: 2 },
      { t: 'arp', inst: 'marimba', pat: '0123012301230123', vol: 0.018, decay: 0.18 },
      { t: 'bell', inst: 'bell', rhythm: ['x.x.x...x.......', 'x.......x.x.x...'], vol: 0.018, from: 2, decay: 0.4 },
      { t: 'kick', pat: 'x.......x...x...', vol: 0.08, f: 90 },
      { t: 'rim', pat: '....o.......o...', vol: 0.016 },
    ] },
  ],
  grave: [
    { name: 'Bony Boogie', bpm: 116, key: 50, scale: 'harmonic', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 321, loops: 3, swing: 0.15, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..5.', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0.2.1.3.0.2.1.3.', vol: 0.024, decay: 0.2 },
      { t: 'lead', ...PZ(0.2), rhythm: ['x..x..x.x.......', 'x.x.x...x...x...'], vol: 0.034, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 88 },
      { t: 'rim', pat: '..o...o...o.o.o.', vol: 0.02 },
    ] },
    { name: 'Tombstone Waltz', bpm: 104, key: 52, scale: 'minor', prog: [0, 3, 6, 2, 5, 3, 1, 4], seed: 322, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x.....x...', wave: 'sine', vol: 0.11, len: 2 },
      { t: 'arp', inst: 'celesta', pat: '..1.2...1.2...3.', vol: 0.016, decay: 0.35 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x.....x.....x...', 'x...x.x.....x...'], vol: 0.032, from: 2, len: 2 },
      { t: 'kick', pat: 'x.....x.........', vol: 0.07, f: 85 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.008 },
    ] },
    { name: 'Candlelight Crypt', bpm: 108, key: 55, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 323, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x...x.o.x...x.5.', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', ...PZ(0.18), pat: '0123012301230123', vol: 0.016 },
      { t: 'bell', inst: 'bell', rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.018, from: 2, decay: 0.45 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 86 },
      { t: 'clap', pat: '....o.......o...', vol: 0.012 },
    ] },
  ],
  forest: [
    { name: 'Firefly Path', bpm: 110, key: 55, scale: 'dorian', prog: [0, 3, 4, 3, 0, 6, 4, 5], seed: 331, loops: 3, layers: [
      { t: 'bass', pat: 'x...x...x...x.5.', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'celesta', pat: '0.2.1.3.2.1.0.2.', vol: 0.016, decay: 0.35 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x...x.x.x.......', 'x.x.....x...x...'], vol: 0.034, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.075, f: 85 },
      { t: 'shaker', pat: '..o...o...o...oo', vol: 0.008 },
    ] },
    { name: 'Mushroom Hop', bpm: 120, key: 53, scale: 'harmonic', prog: [0, 5, 3, 4, 0, 5, 6, 4], seed: 332, loops: 3, swing: 0.14, layers: [
      { t: 'bass', pat: 'x.x...x.x.x...x.', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', ...PZ(0.18), pat: '0.1.2.1.0.1.2.3.', vol: 0.022 },
      { t: 'lead', inst: 'bell', decay: 0.35, rhythm: ['x..x..x.x.......', 'x.x.x...x...x...'], vol: 0.02, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 88 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.012 },
    ] },
  ],
  castle: [
    { name: 'Vampire Tea Party', bpm: 114, key: 50, scale: 'harmonic', prog: [0, 3, 4, 0, 5, 1, 4, 4], seed: 341, loops: 3, swing: 0.12, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..5.', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'epiano', pat: '0123012301230123', vol: 0.014, decay: 0.2 },
      { t: 'lead', ...PZ(0.24), rhythm: ['x..x..x...x.x...', 'x.x...x...x.....'], vol: 0.036, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.085, f: 90 },
      { t: 'snare', pat: '....o.......o...', vol: 0.018 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.008 },
    ] },
    { name: 'Moonlit Ballroom', bpm: 106, key: 52, scale: 'minor', prog: [0, 5, 2, 6, 0, 5, 3, 4], seed: 342, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x.....x...', wave: 'sine', vol: 0.11, len: 2 },
      { t: 'arp', inst: 'celesta', pat: '..1.2...1.2...3.', vol: 0.018, decay: 0.35 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x.....x.....x...', 'x...x.x...x.x...'], vol: 0.034, from: 2, len: 2 },
      { t: 'kick', pat: 'x.....x.........', vol: 0.075, f: 85 },
      { t: 'rim', pat: '....o.......o...', vol: 0.014 },
    ] },
  ],
  // последние 30 секунд: «Полночь!»
  midnight: [
    { name: 'Midnight Dash', bpm: 134, key: 50, scale: 'harmonic', prog: [0, 5, 6, 4, 0, 5, 3, 4], seed: 351, loops: 4, layers: [
      { t: 'bass', pat: 'x.x.x.x.x.x.x.5.', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0120012001200123', vol: 0.018, decay: 0.15 },
      { t: 'lead', ...PZ(0.2), rhythm: ['x..x..x.x.......', 'x.x.x.x.x...x...'], vol: 0.034, len: 2 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.085, f: 90 },
      { t: 'clap', pat: '....o.......o...', vol: 0.014 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.01 },
    ] },
  ],
  boss: [
    { name: 'Big Boo Bounce', bpm: 128, key: 52, scale: 'harmonic', prog: [0, 5, 6, 4, 0, 5, 1, 4], seed: 361, loops: 4, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.x...x.x.x...x.', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', ...PZ(0.15), pat: '0123012301230123', vol: 0.018 },
      { t: 'lead', inst: 'marimba', decay: 0.28, rhythm: ['x.x.x.x.x...x...', 'x..x..x.x.x.....'], vol: 0.036, len: 2 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.085, f: 90 },
      { t: 'tom', pat: '............ooxx', vol: 0.035, f: 120 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.01 },
    ] },
    { name: 'Crowned Pumpkin', bpm: 132, key: 50, scale: 'minor', prog: [0, 6, 3, 4, 0, 6, 4, 4], seed: 362, loops: 4, layers: [
      { t: 'bass', pat: 'x.x.x.x.x.x.x.5.', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'bell', pat: '0123012301230123', vol: 0.011, decay: 0.22 },
      { t: 'lead', ...PZ(0.24), rhythm: ['x.x.x.x.x...x...', 'x..x..x.x.x.....'], vol: 0.036, len: 2 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.085, f: 90 },
      { t: 'snare', pat: '....o.......o...', vol: 0.02 },
    ] },
  ],
};
