// Музыка «Голодной Воронки»: бодрый городской фанк короткими нотами — маримба, пиццикато, щипок, электропиано.
// Никаких тянущихся пэдов и флейты. Плейлисты: меню, восемь карт, финальные 30 секунд и итоги.
const PZ = (decay = 0.18) => ({ inst: 'pizz', decay });

export const SONGS = {
  menu: [
    { name: 'Rooftop Coffee', bpm: 98, key: 60, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 501, loops: 2, swing: 0.12, layers: [
      { t: 'bass', pat: 'x...5...x.x.5...', wave: 'sine', vol: 0.11, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0.2.1.2.0.2.1.3.', vol: 0.026, decay: 0.22 },
      { t: 'bell', inst: 'celesta', rhythm: ['x...x.x...x.....', 'x.x...x.........'], vol: 0.02, from: 2, decay: 0.4 },
      { t: 'rim', pat: '....o.......o...', vol: 0.012 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.006 },
    ] },
    { name: 'Pigeon Square', bpm: 90, key: 57, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 502, loops: 2, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'triangle', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'epiano', pat: '2...3...1...0...', vol: 0.024, decay: 0.45 },
      { t: 'lead', inst: 'marimba', decay: 0.28, rhythm: ['x..x..x...x.....', 'x.......x.x.....'], vol: 0.03, from: 2, len: 2 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.005 },
    ] },
    { name: 'Sunny Crossing', bpm: 104, key: 62, scale: 'pentaMajor', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 503, loops: 2, layers: [
      { t: 'bass', pat: 'x...x...x...x.5.', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', ...PZ(0.16), pat: '0.1.2.1.0.1.2.3.', vol: 0.022 },
      { t: 'bell', inst: 'bell', rhythm: ['x.......x...x...', 'x...x...........'], vol: 0.018, from: 2, decay: 0.35 },
      { t: 'rim', pat: '....o.......o.o.', vol: 0.012 },
    ] },
  ],
  town: [
    { name: 'Block Party', bpm: 118, key: 60, scale: 'mixolydian', prog: [0, 6, 3, 4, 0, 6, 5, 4], seed: 511, loops: 3, swing: 0.14, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..5.', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0.2.1.2.0.2.1.2.', vol: 0.022, decay: 0.2 },
      { t: 'lead', ...PZ(0.2), rhythm: ['x..x..x...x.x...', 'x.x...x...x.....', 'x..x..x.x.x.x...', 'x.......x...x...'], vol: 0.034, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 85 },
      { t: 'snare', pat: '....o.......o...', vol: 0.02 },
      { t: 'hat', pat: 'o.o.o.o.o.o.o.o.', vol: 0.006 },
    ] },
    { name: 'Lemonade Stand', bpm: 112, key: 65, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 512, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x...5...x...5.x.', wave: 'sine', vol: 0.11, len: 1 },
      { t: 'arp', inst: 'celesta', pat: '0.2.1.2.0.2.1.2.', vol: 0.015, decay: 0.28 },
      { t: 'lead', inst: 'pluck', decay: 0.22, rhythm: ['x.x.x...x.x.....', 'x...x.x.x...x...'], vol: 0.034, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 85 },
      { t: 'clap', pat: '....o.......o...', vol: 0.012 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.005 },
    ] },
  ],
  port: [
    { name: 'Dockside Shuffle', bpm: 114, key: 57, scale: 'dorian', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 521, loops: 3, swing: 0.16, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..5.', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0.2.1.3.0.2.1.3.', vol: 0.024, decay: 0.2 },
      { t: 'lead', inst: 'lute', decay: 0.24, rhythm: ['x..x..x.x.......', 'x.x.x...x...x...'], vol: 0.032, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x...x...', vol: 0.08, f: 88 },
      { t: 'rim', pat: '..o...o...o.o.o.', vol: 0.016 },
    ] },
    { name: 'Seagull Funk', bpm: 120, key: 62, scale: 'mixolydian', prog: [0, 6, 5, 4, 0, 6, 3, 4], seed: 522, loops: 3, layers: [
      { t: 'bass', pat: 'x.x...x.x.x...5.', wave: 'sine', vol: 0.11, len: 1 },
      { t: 'arp', ...PZ(0.15), pat: '0123012301230123', vol: 0.016 },
      { t: 'bell', inst: 'bell', rhythm: ['x.x.x...x.......', 'x.......x.x.x...'], vol: 0.017, from: 2, decay: 0.35 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 90 },
      { t: 'snare', pat: '....o.......o...', vol: 0.018 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.006 },
    ] },
  ],
  metro: [
    { name: 'Neon Avenue', bpm: 122, key: 59, scale: 'minor', prog: [0, 5, 3, 6, 0, 5, 3, 4], seed: 531, loops: 3, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..x.', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'epiano', pat: '0.2.1.2.0.2.1.2.', vol: 0.02, decay: 0.25 },
      { t: 'lead', inst: 'marimba', decay: 0.24, rhythm: ['x.x...x.x...x...', 'x..x..x...x.x...'], vol: 0.032, from: 2, len: 2 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.07, f: 80 },
      { t: 'clap', pat: '....o.......o...', vol: 0.013 },
      { t: 'hat', pat: 'o.o.o.o.o.o.o.o.', vol: 0.006 },
    ] },
    { name: 'Skyline Rush', bpm: 126, key: 64, scale: 'dorian', prog: [0, 3, 4, 3, 0, 6, 5, 4], seed: 532, loops: 3, swing: 0.08, layers: [
      { t: 'bass', pat: 'x...x.x.x...x.x.', wave: 'sine', vol: 0.11, len: 1 },
      { t: 'arp', inst: 'pluck', pat: '0.1.2.3.2.1.0.1.', vol: 0.02, decay: 0.15 },
      { t: 'bell', inst: 'celesta', rhythm: ['x...x...x.x.....', 'x.x.....x...x...'], vol: 0.018, from: 2, decay: 0.3 },
      { t: 'kick', pat: 'x.......x.x.....', vol: 0.08, f: 85 },
      { t: 'snare', pat: '....o.......o...', vol: 0.02 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.005 },
    ] },
  ],
  castle: [
    { name: 'Jester Jig', bpm: 116, key: 62, scale: 'dorian', prog: [0, 6, 0, 4, 0, 6, 3, 4], seed: 541, loops: 3, swing: 0.15, layers: [
      { t: 'bass', pat: 'x.....x.x.....5.', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'lute', pat: '0.2.1.2.0.2.1.2.', vol: 0.024, decay: 0.2 },
      { t: 'lead', ...PZ(0.2), rhythm: ['x.x.x...x.x.....', 'x..x..x...x.....'], vol: 0.032, from: 2, len: 2 },
      { t: 'tom', pat: 'x.......x...x...', vol: 0.05 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.012 },
    ] },
    { name: 'Market Morning', bpm: 108, key: 60, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 4, 4], seed: 542, loops: 3, layers: [
      { t: 'bass', pat: 'x...5...x...5...', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0.1.2.1.0.1.2.1.', vol: 0.022, decay: 0.2 },
      { t: 'bell', inst: 'bell', rhythm: ['x...x.x.........', 'x.x.....x.......'], vol: 0.018, from: 2, decay: 0.35 },
      { t: 'drum', pat: 'x...x...x...x.x.', vol: 0.04 },
    ] },
  ],
  beach: [
    { name: 'Coconut Breeze', bpm: 104, key: 65, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 1, 4], seed: 561, loops: 3, swing: 0.18, layers: [
      { t: 'bass', pat: 'x..x....x..x..5.', wave: 'sine', vol: 0.11, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0.2.1.2.0.2.3.2.', vol: 0.024, decay: 0.22 },
      { t: 'lead', inst: 'pluck', decay: 0.24, rhythm: ['x..x..x...x.....', 'x.x...x.x.......', 'x..x..x.x...x...'], vol: 0.032, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.07, f: 82 },
      { t: 'shaker', pat: 'o.oo.oo.o.oo.oo.', vol: 0.006 },
      { t: 'rim', pat: '...o..o....o..o.', vol: 0.012 },
    ] },
    { name: 'Flip-Flop Parade', bpm: 112, key: 62, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 5, 4], seed: 562, loops: 3, swing: 0.12, layers: [
      { t: 'bass', pat: 'x...5.x.x...5...', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'celesta', pat: '0.1.2.1.0.1.2.3.', vol: 0.016, decay: 0.3 },
      { t: 'lead', inst: 'marimba', decay: 0.26, rhythm: ['x.x.x...x...x...', 'x...x.x...x.....'], vol: 0.032, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x...x...', vol: 0.075, f: 85 },
      { t: 'clap', pat: '....o.......o...', vol: 0.012 },
      { t: 'tambourine', pat: '..o...o...o...o.', vol: 0.008 },
    ] },
  ],
  winter: [
    { name: 'Snowball Waltz', bpm: 100, key: 64, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 571, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x...5...', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'celesta', pat: '0.2.1.2.0.2.1.3.', vol: 0.02, decay: 0.35 },
      { t: 'bell', inst: 'bell', rhythm: ['x...x...x.x.....', 'x.x.....x.......'], vol: 0.02, from: 2, decay: 0.45 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.06, f: 80 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.007 },
    ] },
    { name: 'Hot Cocoa Hop', bpm: 110, key: 60, scale: 'lydian', prog: [0, 1, 4, 0, 5, 3, 1, 4], seed: 572, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x..x..x.x.....5.', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', ...PZ(0.18), pat: '0.2.1.2.0.2.1.2.', vol: 0.02 },
      { t: 'lead', inst: 'celesta', decay: 0.3, rhythm: ['x..x..x...x.....', 'x.x.x...x...x...'], vol: 0.026, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.07, f: 84 },
      { t: 'snare', pat: '....o.......o...', vol: 0.016 },
      { t: 'tambourine', pat: 'o.o.o.o.o.o.o.o.', vol: 0.006 },
    ] },
  ],
  fair: [
    { name: 'Carousel Ride', bpm: 120, key: 67, scale: 'major', prog: [0, 4, 0, 4, 0, 3, 4, 0], seed: 581, loops: 3, layers: [
      { t: 'bass', pat: 'x...5...x...5...', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'bell', pat: '0.2.1.2.0.2.1.2.', vol: 0.014, decay: 0.3 },
      { t: 'lead', inst: 'marimba', decay: 0.22, rhythm: ['x.x.x.x.x...x...', 'x..x..x.x.......', 'x.x.x...x.x.x...'], vol: 0.032, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.07, f: 86 },
      { t: 'clap', pat: '....o.......o...', vol: 0.012 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.006 },
    ] },
    { name: 'Candy Floss Swing', bpm: 116, key: 60, scale: 'mixolydian', prog: [0, 6, 5, 4, 0, 6, 3, 4], seed: 582, loops: 3, swing: 0.2, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..5.', wave: 'sine', vol: 0.11, len: 1 },
      { t: 'arp', inst: 'epiano', pat: '0.2.1.2.0.2.1.2.', vol: 0.02, decay: 0.3 },
      { t: 'lead', ...PZ(0.2), rhythm: ['x.x...x.x.x.....', 'x..x..x...x.x...'], vol: 0.032, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x...x...', vol: 0.075, f: 85 },
      { t: 'snare', pat: '....o.......o...', vol: 0.018 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.005 },
    ] },
  ],
  japan: [
    { name: 'Petal Path', bpm: 96, key: 62, scale: 'yo', prog: [0, 3, 4, 0, 5, 3, 4, 0], seed: 591, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'pluck', pat: '0.1.2.1.0.2.1.2.', vol: 0.022, decay: 0.3 },
      { t: 'lead', inst: 'lute', decay: 0.3, rhythm: ['x...x.x...x.....', 'x.x.....x...x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'tom', pat: 'x.......x.....x.', vol: 0.04 },
      { t: 'rim', pat: '....o.......o...', vol: 0.012 },
    ] },
    { name: 'Lantern Festival', bpm: 108, key: 57, scale: 'yo', prog: [0, 4, 3, 0, 0, 4, 5, 4], seed: 592, loops: 3, swing: 0.08, layers: [
      { t: 'bass', pat: 'x..x....x..x..5.', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0.2.1.3.0.2.1.3.', vol: 0.022, decay: 0.22 },
      { t: 'bell', inst: 'bell', rhythm: ['x.......x.x.....', 'x...x...x.......'], vol: 0.018, from: 2, decay: 0.4 },
      { t: 'drum', pat: 'x...x...x...x.x.', vol: 0.04 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.006 },
    ] },
  ],
  final: [
    { name: 'Last Bite', bpm: 136, key: 57, scale: 'minor', prog: [0, 5, 6, 4, 0, 5, 6, 4], seed: 551, loops: 4, layers: [
      { t: 'bass', pat: 'x.x.x.x.x.x.x.x.', wave: 'triangle', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0123012301230123', vol: 0.02, decay: 0.14 },
      { t: 'lead', ...PZ(0.16), rhythm: ['x.x.x.x.x...x...', 'x..x..x.x.x.x...'], vol: 0.034, from: 2, len: 2 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.085, f: 85 },
      { t: 'snare', pat: '....o.......o.o.', vol: 0.022 },
      { t: 'hat', pat: 'oooooooooooooooo', vol: 0.005 },
    ] },
    { name: 'Countdown Chase', bpm: 140, key: 60, scale: 'dorian', prog: [0, 3, 0, 4, 0, 3, 5, 4], seed: 552, loops: 4, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..x.', wave: 'sine', vol: 0.11, len: 1 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.3.0.2.1.3.', vol: 0.02, decay: 0.12 },
      { t: 'bell', inst: 'celesta', rhythm: ['x.x.x.x.........', 'x...x...x.x.x...'], vol: 0.018, from: 2, decay: 0.25 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.085, f: 90 },
      { t: 'clap', pat: '....o.......o...', vol: 0.014 },
      { t: 'shaker', pat: 'oooooooooooooooo', vol: 0.005 },
    ] },
  ],
};
