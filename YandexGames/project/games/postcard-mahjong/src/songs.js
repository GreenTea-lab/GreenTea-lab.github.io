// Музыка «Маджонга с открытками»: спокойная, только короткие звуки — маримба, электропиано, щипки, челеста, колокольчики, лютня.
// Никаких пэдов, флейт и протяжных нот. У каждого города свой лад и своя пара мелодий; отдельно меню и бесконечный режим.
const PZ = (decay = 0.22) => ({ inst: 'pizz', decay });
const LU = (decay = 0.3) => ({ inst: 'lute', decay });

export const SONGS = {
  menu: [
    { name: 'Postcard Morning', bpm: 82, key: 60, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 701, loops: 2, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'epiano', pat: '0...2...1...2...', vol: 0.026, decay: 0.7 },
      { t: 'lead', inst: 'marimba', decay: 0.35, rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.03, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.006 },
    ] },
    { name: 'Suitcase', bpm: 88, key: 57, scale: 'pentaMajor', prog: [0, 3, 4, 3, 0, 5, 3, 4], seed: 702, loops: 2, layers: [
      { t: 'bass', pat: 'x.....x.........', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'marimba', pat: '0.1.2.1.0.1.2.1.', vol: 0.022, decay: 0.3 },
      { t: 'bell', inst: 'celesta', rhythm: ['x.......x...x...', '....x.......x...'], vol: 0.02, from: 2, decay: 0.5 },
    ] },
  ],
  endless: [
    { name: 'Long Road', bpm: 98, key: 62, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 711, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x...5...x...5...', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0.2.1.2.0.2.1.3.', vol: 0.022, decay: 0.25 },
      { t: 'lead', inst: 'epiano', decay: 0.5, rhythm: ['x..x..x...x.....', 'x.x...x.........', 'x...x.x.x.......', 'x.......x...x...'], vol: 0.028, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.05, f: 80 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.007 },
    ] },
    { name: 'Window Seat', bpm: 92, key: 55, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 4], seed: 712, loops: 3, swing: 0.12, layers: [
      { t: 'bass', pat: 'x..x..x.x.......', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.2.0.2.1.2.', vol: 0.018, decay: 0.25 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x..x..x.x.......', 'x.x.x...x...x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.01 },
    ] },
  ],
  moscow: [
    { name: 'Boulevard', bpm: 86, key: 57, scale: 'minor', prog: [0, 3, 6, 2, 5, 3, 4, 4], seed: 721, loops: 3, swing: 0.08, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', ...PZ(0.22), pat: '0.2.1.2.0.2.1.2.', vol: 0.02 },
      { t: 'lead', inst: 'celesta', decay: 0.45, rhythm: ['x...x.x...x.....', 'x.x.....x...x...'], vol: 0.026, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.006 },
    ] },
    { name: 'Golden Autumn', bpm: 94, key: 60, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 722, loops: 3, layers: [
      { t: 'bass', pat: 'x...x...x...x.5.', wave: 'sine', vol: 0.09, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0123012301230123', vol: 0.016, decay: 0.22 },
      { t: 'bell', inst: 'bell', rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.016, from: 2, decay: 0.5 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.045, f: 80 },
    ] },
  ],
  spb: [
    { name: 'White Nights', bpm: 78, key: 64, scale: 'minor', prog: [0, 5, 3, 4, 0, 5, 6, 4], seed: 731, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x.....x...', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'epiano', pat: '0.2.1.2.0.2.1.2.', vol: 0.02, decay: 0.5 },
      { t: 'lead', inst: 'celesta', decay: 0.4, rhythm: ['x.....x.....x...', 'x...x.x.....x...'], vol: 0.024, from: 2, len: 2 },
    ] },
    { name: 'Drawbridge', bpm: 90, key: 62, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 732, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x...x.o.x...x.5.', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0.2.1.3.0.2.1.3.', vol: 0.02, decay: 0.28 },
      { t: 'lead', ...PZ(0.24), rhythm: ['x...x.x.x.......', 'x.x.....x...x...'], vol: 0.028, from: 2, len: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.009 },
    ] },
  ],
  paris: [
    { name: 'Café Corner', bpm: 100, key: 62, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 741, loops: 3, swing: 0.16, layers: [
      { t: 'bass', pat: 'x...5...x...5...', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', inst: 'epiano', pat: '..2...2...2...2.', vol: 0.02, decay: 0.4 },
      { t: 'lead', inst: 'pluck', decay: 0.3, rhythm: ['x..x..x...x.x...', 'x.x...x...x.....'], vol: 0.03, from: 2, len: 2 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.004 },
    ] },
    { name: 'Lavender Lane', bpm: 84, key: 65, scale: 'lydian', prog: [0, 1, 4, 0, 5, 1, 3, 4], seed: 742, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'celesta', pat: '0.2.1.2.0.2.1.2.', vol: 0.015, decay: 0.4 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x..x..x...x.....', 'x.......x.x.....'], vol: 0.03, from: 2, len: 2 },
    ] },
  ],
  amsterdam: [
    { name: 'Tulip Rows', bpm: 104, key: 60, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 4, 4], seed: 751, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..5.', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0.2.1.2.0.2.1.2.', vol: 0.02, decay: 0.22 },
      { t: 'bell', inst: 'bell', rhythm: ['x.x.x...x.......', 'x.......x.x.x...'], vol: 0.015, from: 2, decay: 0.45 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.05, f: 82 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.007 },
    ] },
    { name: 'Canal Bicycle', bpm: 92, key: 67, scale: 'mixolydian', prog: [0, 6, 3, 4, 0, 6, 4, 4], seed: 752, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', ...PZ(0.18), pat: '0123012301230123', vol: 0.014 },
      { t: 'lead', inst: 'epiano', decay: 0.5, rhythm: ['x...x.x.x.......', 'x.x.....x...x...'], vol: 0.026, from: 2, len: 2 },
    ] },
  ],
  venice: [
    { name: 'Gondolier', bpm: 80, key: 57, scale: 'minor', prog: [0, 3, 4, 0, 5, 3, 4, 4], seed: 761, loops: 3, swing: 0.14, layers: [
      { t: 'bass', pat: 'x.....5.....x...', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', ...LU(0.3), pat: '0.2.1.2.0.2.1.2.', vol: 0.02 },
      { t: 'lead', inst: 'pluck', decay: 0.35, rhythm: ['x.....x...x.....', 'x...x.x.....x...'], vol: 0.03, from: 2, len: 2 },
    ] },
    { name: 'Glass Island', bpm: 88, key: 62, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 762, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'celesta', pat: '0...1...2...1...', vol: 0.016, decay: 0.45 },
      { t: 'lead', ...LU(0.3), rhythm: ['x..x..x...x.....', 'x.x...x...x.....'], vol: 0.03, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.005 },
    ] },
  ],
  rome: [
    { name: 'Piazza', bpm: 96, key: 60, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 4], seed: 771, loops: 3, swing: 0.12, layers: [
      { t: 'bass', pat: 'x...5...x...5...', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', ...LU(0.25), pat: '0.2.1.2.0.2.1.2.', vol: 0.02 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x..x..x.x.......', 'x.x.x...x...x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.007 },
    ] },
    { name: 'Umbrella Pines', bpm: 84, key: 65, scale: 'major', prog: [0, 3, 4, 3, 0, 5, 3, 4], seed: 772, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'epiano', pat: '2...3...1...0...', vol: 0.022, decay: 0.6 },
      { t: 'bell', inst: 'celesta', rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.02, from: 2, decay: 0.45 },
    ] },
  ],
  istanbul: [
    { name: 'Bosphorus', bpm: 86, key: 62, scale: 'harmonic', prog: [0, 3, 4, 0, 5, 3, 4, 4], seed: 781, loops: 3, swing: 0.08, layers: [
      { t: 'bass', pat: 'x..x....x..x....', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', ...LU(0.28), pat: '0.1.2.1.0.1.2.1.', vol: 0.02 },
      { t: 'lead', inst: 'pluck', decay: 0.3, rhythm: ['x.x.x...x.......', 'x...x.x.x.......'], vol: 0.03, from: 2, len: 2 },
      { t: 'drum', pat: 'x..o..x...o.....', vol: 0.03 },
    ] },
    { name: 'Spice Market', bpm: 100, key: 57, scale: 'phrygian', prog: [0, 1, 0, 6, 0, 1, 6, 0], seed: 782, loops: 3, layers: [
      { t: 'bass', pat: 'x...x...x...x...', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', inst: 'marimba', pat: '0.2.1.2.0.2.1.2.', vol: 0.018, decay: 0.22 },
      { t: 'lead', ...LU(0.26), rhythm: ['x..x..x.x.......', 'x.x...x...x.....'], vol: 0.03, from: 2, len: 2 },
      { t: 'tambourine', pat: '..o...o...o...o.', vol: 0.006 },
    ] },
  ],
  cairo: [
    { name: 'Felucca', bpm: 82, key: 60, scale: 'harmonic', prog: [0, 6, 5, 4, 0, 6, 5, 4], seed: 791, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x.....x...', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', ...LU(0.3), pat: '0.2.1.2.0.2.1.2.', vol: 0.02 },
      { t: 'bell', inst: 'bell', rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.015, from: 2, decay: 0.5 },
      { t: 'drum', pat: 'x.....o.x.......', vol: 0.03 },
    ] },
    { name: 'Desert Stars', bpm: 92, key: 64, scale: 'phrygian', prog: [0, 1, 6, 0, 3, 1, 6, 0], seed: 792, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x..x..x.........', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'celesta', pat: '0.1.2.1.0.1.2.1.', vol: 0.015, decay: 0.4 },
      { t: 'lead', inst: 'pluck', decay: 0.3, rhythm: ['x.x.x...x.......', 'x...x.x.....x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...oo', vol: 0.006 },
    ] },
  ],
  kyoto: [
    { name: 'Sakura Path', bpm: 76, key: 62, scale: 'pentaMinor', prog: [0, 3, 4, 3, 0, 5, 3, 4], seed: 801, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.09, len: 2 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.2.0.2.1.2.', vol: 0.016, decay: 0.35 },
      { t: 'lead', ...LU(0.4), rhythm: ['x.....x...x.....', 'x...x.....x.....'], vol: 0.03, from: 2, len: 2 },
    ] },
    { name: 'Temple Bell', bpm: 84, key: 57, scale: 'pentaMajor', prog: [0, 3, 5, 4, 0, 3, 4, 4], seed: 802, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x.........', wave: 'sine', vol: 0.09, len: 2 },
      { t: 'arp', inst: 'celesta', pat: '0...2...1...2...', vol: 0.016, decay: 0.5 },
      { t: 'bell', inst: 'bell', rhythm: ['x.......x.......', '....x.......x...'], vol: 0.016, from: 2, decay: 0.55 },
      { t: 'rim', pat: '....o.......o...', vol: 0.008 },
    ] },
  ],
  rio: [
    { name: 'Copacabana Breeze', bpm: 104, key: 62, scale: 'mixolydian', prog: [0, 6, 3, 4, 0, 6, 4, 4], seed: 811, loops: 3, swing: 0.14, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..5.', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', inst: 'epiano', pat: '..2...2...2...2.', vol: 0.02, decay: 0.35 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x..x..x...x.x...', 'x.x...x...x.....'], vol: 0.032, from: 2, len: 2 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.006 },
      { t: 'rim', pat: '...o..o....o..o.', vol: 0.01 },
    ] },
    { name: 'Sugarloaf', bpm: 96, key: 65, scale: 'major', prog: [0, 3, 1, 4, 0, 3, 4, 4], seed: 812, loops: 3, swing: 0.12, layers: [
      { t: 'bass', pat: 'x...x.5.x...x.5.', wave: 'sine', vol: 0.09, len: 1 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.2.0.2.1.2.', vol: 0.016, decay: 0.22 },
      { t: 'bell', inst: 'celesta', rhythm: ['x..x..x.x.......', 'x.x.x...x...x...'], vol: 0.02, from: 2, decay: 0.4 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.007 },
    ] },
  ],
};
