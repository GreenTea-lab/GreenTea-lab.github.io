// Музыка «Дурака на веранде»: летний вечер на даче. Только короткие звуки — щипки (как балалайка), маримба,
// электропиано, челеста. Без пэдов и протяжных нот. Плейлисты: меню, партия, напряжённый конец (колода кончилась), победа.
const PZ = (decay = 0.2) => ({ inst: 'pizz', decay });

export const SONGS = {
  menu: [
    { name: 'Evening Porch', bpm: 86, key: 57, scale: 'minor', prog: [0, 3, 6, 2, 0, 3, 4, 4], seed: 701, loops: 2, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', ...PZ(0.2), pat: '0.2.1.2.0.2.1.2.', vol: 0.02 },
      { t: 'lead', inst: 'epiano', decay: 0.55, rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.028, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.006 },
    ] },
    { name: 'Samovar', bpm: 80, key: 60, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 702, loops: 2, layers: [
      { t: 'bass', pat: 'x.....x.........', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'marimba', pat: '0.1.2.1.0.1.2.1.', vol: 0.022, decay: 0.28 },
      { t: 'bell', inst: 'celesta', rhythm: ['x.......x...x...', '....x.......x...'], vol: 0.02, from: 2, decay: 0.45 },
    ] },
    { name: 'Lilac Garden', bpm: 92, key: 62, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 703, loops: 2, swing: 0.12, layers: [
      { t: 'bass', pat: 'x.....x.....x...', wave: 'triangle', vol: 0.09, len: 2 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.2.0.2.1.2.', vol: 0.018, decay: 0.22 },
      { t: 'lead', inst: 'marimba', decay: 0.32, rhythm: ['x.....x.....x...', 'x...x.....x.....'], vol: 0.03, from: 2, len: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.01 },
    ] },
  ],
  game: [
    { name: 'Card Table', bpm: 98, key: 57, scale: 'harmonic', prog: [0, 3, 4, 0, 5, 3, 4, 4], seed: 711, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x...4...x...4...', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', ...PZ(0.18), pat: '0.2.1.2.0.2.1.3.', vol: 0.02 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x..x..x...x.....', 'x.x...x.........', 'x...x.x.x.......', 'x.......x...x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.045, f: 80 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.006 },
    ] },
    { name: 'Dacha Afternoon', bpm: 90, key: 60, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 3, 4], seed: 712, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'marimba', pat: '0.1.2.3.2.1.0.1.', vol: 0.02, decay: 0.25 },
      { t: 'bell', inst: 'celesta', rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.02, from: 2, decay: 0.4 },
      { t: 'rim', pat: '....o.......o...', vol: 0.009 },
    ] },
    { name: 'Cherry Jam', bpm: 104, key: 62, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 4], seed: 713, loops: 3, swing: 0.14, layers: [
      { t: 'bass', pat: 'x..x..x.x.......', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.2.0.2.1.2.', vol: 0.017, decay: 0.22 },
      { t: 'lead', ...PZ(0.24), rhythm: ['x..x..x.x.......', 'x.x.x...x...x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.045, f: 80 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.007 },
    ] },
    { name: 'Garden Swing', bpm: 94, key: 55, scale: 'pentaMajor', prog: [0, 3, 5, 4, 0, 3, 4, 4], seed: 714, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'sine', vol: 0.1, len: 2 },
      { t: 'arp', inst: 'epiano', pat: '2...3...1...0...', vol: 0.022, decay: 0.55 },
      { t: 'lead', inst: 'marimba', decay: 0.3, rhythm: ['x..x..x...x.....', 'x.......x.x.....'], vol: 0.03, from: 2, len: 2 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.004 },
    ] },
  ],
  tense: [
    { name: 'Last Cards', bpm: 108, key: 57, scale: 'harmonic', prog: [0, 0, 3, 4, 0, 5, 4, 4], seed: 721, loops: 3, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..x.', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', ...PZ(0.16), pat: '0123012301230123', vol: 0.016 },
      { t: 'lead', inst: 'marimba', decay: 0.28, rhythm: ['x.x.x...x.x.....', 'x...x.x.x...x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.05, f: 78 },
      { t: 'rim', pat: '....o.......o..o', vol: 0.01 },
    ] },
    { name: 'Who Is the Fool', bpm: 112, key: 52, scale: 'harmonic', prog: [0, 3, 0, 4, 5, 3, 4, 4], seed: 722, loops: 3, swing: 0.08, layers: [
      { t: 'bass', pat: 'x...x...x...x.4.', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'pluck', pat: '0.2.1.3.0.2.1.3.', vol: 0.018, decay: 0.2 },
      { t: 'bell', inst: 'bell', rhythm: ['x..x..x...x.....', 'x.x.x...x.......'], vol: 0.014, from: 2, decay: 0.4 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.05, f: 80 },
      { t: 'shaker', pat: '..o...o...o...oo', vol: 0.006 },
    ] },
  ],
  win: [
    { name: 'Tea Party', bpm: 100, key: 64, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 4, 4], seed: 731, loops: 2, swing: 0.12, layers: [
      { t: 'bass', pat: 'x...5...x...5...', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'celesta', pat: '0.2.1.2.0.2.1.2.', vol: 0.016, decay: 0.35 },
      { t: 'lead', ...PZ(0.24), rhythm: ['x.x.x...x.x.....', 'x...x.x.x...x...'], vol: 0.03, from: 2, len: 2 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.008 },
    ] },
  ],
};
