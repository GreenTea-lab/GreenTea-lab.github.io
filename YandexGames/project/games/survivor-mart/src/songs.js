// Музыка «Лавки выживших»: уютный кантри-фолк на короткой гитаре-щипке, маримбе и электропиано днём,
// напряжённый, но мягкий минор ночью. Только короткие ноты: без пэдов, флейты и протяжной меди.
// Плейлисты: меню, утро, день, вечер, ночь, орда, босс.
const GT = (decay = 0.3) => ({ inst: 'pluck', decay, lp: 2200 });

export const SONGS = {
  menu: [
    { name: 'Porch Radio', bpm: 92, key: 55, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 501, loops: 2, swing: 0.12, layers: [
      { t: 'bass', pat: 'x...5...x...5...', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', ...GT(0.3), pat: '0.2.1.2.0.2.1.2.', vol: 0.03 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x...x.x...x.....', 'x.x...x.....x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.012 },
    ] },
    { name: 'Last Light Sale', bpm: 84, key: 53, scale: 'mixolydian', prog: [0, 6, 3, 0, 4, 6, 3, 4], seed: 502, loops: 2, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'triangle', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'epiano', pat: '0...2...1...3...', vol: 0.022, decay: 0.5 },
      { t: 'lead', ...GT(0.35), rhythm: ['x..x..x...x.....', 'x.......x.x.....'], vol: 0.034, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.007 },
    ] },
  ],
  morning: [
    { name: 'Coffee and Batteries', bpm: 100, key: 57, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 511, loops: 2, swing: 0.1, layers: [
      { t: 'bass', pat: 'x...x...x...5...', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'celesta', pat: '0.2.1.2.0.2.1.3.', vol: 0.018, decay: 0.35 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x.x...x...x.....', 'x...x.x.x.......'], vol: 0.03, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.008 },
    ] },
  ],
  day: [
    { name: 'Open Sign', bpm: 112, key: 55, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 521, loops: 3, swing: 0.14, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..5.', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', ...GT(0.25), pat: '0.2.1.2.0.2.1.2.', vol: 0.026 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x..x..x...x.x...', 'x.x...x...x.....', 'x..x..x.x.x.x...', 'x.......x...x...'], vol: 0.032, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.075, f: 85 },
      { t: 'snare', pat: '....o.......o...', vol: 0.016 },
      { t: 'hat', pat: 'o.o.o.o.o.o.o.o.', vol: 0.005 },
    ] },
    { name: 'Parking Lot Bluegrass', bpm: 120, key: 57, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 4], seed: 522, loops: 3, swing: 0.16, layers: [
      { t: 'bass', pat: 'x...5...x...5.x.', wave: 'sine', vol: 0.11, len: 1 },
      { t: 'arp', inst: 'pizz', decay: 0.18, pat: '0120012001200123', vol: 0.018 },
      { t: 'lead', ...GT(0.3), rhythm: ['x.x.x...x.x.....', 'x...x.x.x...x...'], vol: 0.036, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.075, f: 85 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.012 },
    ] },
    { name: 'Shelf Stacker', bpm: 106, key: 52, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 523, loops: 3, layers: [
      { t: 'bass', pat: 'x...x.o.x...x.5.', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'epiano', pat: '0123012301230123', vol: 0.013, decay: 0.2 },
      { t: 'lead', inst: 'marimba', decay: 0.28, rhythm: ['x...x.x.x.......', 'x.x.....x...x...'], vol: 0.032, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.075, f: 86 },
      { t: 'rim', pat: '....o.......o...', vol: 0.014 },
    ] },
  ],
  evening: [
    { name: 'Boarding Up', bpm: 96, key: 52, scale: 'minor', prog: [0, 5, 3, 6, 0, 5, 3, 4], seed: 531, loops: 2, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'triangle', vol: 0.1, len: 2 },
      { t: 'arp', ...GT(0.3), pat: '0.1.2.3.2.1.0.1.', vol: 0.026 },
      { t: 'bell', inst: 'celesta', rhythm: ['x.......x...x...', 'x...x.......x...'], vol: 0.02, from: 2, decay: 0.45 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.007 },
    ] },
  ],
  night: [
    { name: 'Flashlight Watch', bpm: 112, key: 50, scale: 'harmonic', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 541, loops: 3, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..5.', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0.2.1.3.0.2.1.3.', vol: 0.022, decay: 0.2 },
      { t: 'lead', inst: 'pizz', decay: 0.2, rhythm: ['x..x..x.x.......', 'x.x.x...x...x...'], vol: 0.032, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 82 },
      { t: 'rim', pat: '..o...o...o.o.o.', vol: 0.016 },
    ] },
    { name: 'Moan at the Window', bpm: 104, key: 52, scale: 'minor', prog: [0, 3, 6, 2, 5, 3, 1, 4], seed: 542, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x.....x...', wave: 'sine', vol: 0.11, len: 2 },
      { t: 'arp', ...GT(0.25), pat: '..1.2...1.2...3.', vol: 0.024 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x.....x.....x...', 'x...x.x.....x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.....x.........', vol: 0.07, f: 80 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.008 },
    ] },
  ],
  horde: [
    { name: 'Hold the Door', bpm: 130, key: 50, scale: 'harmonic', prog: [0, 5, 6, 4, 0, 5, 3, 4], seed: 551, loops: 4, layers: [
      { t: 'bass', pat: 'x.x.x.x.x.x.x.5.', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0120012001200123', vol: 0.018, decay: 0.15 },
      { t: 'lead', ...GT(0.22), rhythm: ['x..x..x.x.......', 'x.x.x.x.x...x...'], vol: 0.034, len: 2 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.085, f: 88 },
      { t: 'clap', pat: '....o.......o...', vol: 0.014 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.01 },
    ] },
  ],
  boss: [
    { name: 'Big Fella in the Lot', bpm: 128, key: 52, scale: 'harmonic', prog: [0, 5, 6, 4, 0, 5, 1, 4], seed: 561, loops: 4, swing: 0.08, layers: [
      { t: 'bass', pat: 'x.x...x.x.x...x.', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'pizz', decay: 0.15, pat: '0123012301230123', vol: 0.018 },
      { t: 'lead', inst: 'marimba', decay: 0.28, rhythm: ['x.x.x.x.x...x...', 'x..x..x.x.x.....'], vol: 0.036, len: 2 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.085, f: 88 },
      { t: 'tom', pat: '............ooxx', vol: 0.035, f: 115 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.01 },
    ] },
  ],
};
