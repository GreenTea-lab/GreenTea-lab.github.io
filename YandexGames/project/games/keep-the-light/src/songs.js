// Музыка «Не гаси свет»: тревога ритмом, а не гулом. Музыкальная шкатулка (челеста), пиццикато,
// глухие удары, тиканье. Никаких пэдов и тянущихся нот — всё короткое и затухающее.
// Плейлисты: меню, ночь (тихо), опасность (Жилец рядом), погоня, рассвет (победа).
const PZ = (decay = 0.2) => ({ inst: 'pizz', decay });

export const SONGS = {
  menu: [
    { name: 'Music Box', bpm: 76, key: 69, scale: 'harmonic', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 701, loops: 2, layers: [
      { t: 'arp', inst: 'celesta', pat: '0...2...1...2...', vol: 0.03, decay: 0.6 },
      { t: 'bell', inst: 'celesta', rhythm: ['x.....x...x.....', 'x...x.....x.....'], vol: 0.028, from: 2, decay: 0.7 },
      { t: 'bass', pat: 'x...............', wave: 'sine', vol: 0.07, len: 2 },
      { t: 'rim', pat: '........o.......', vol: 0.006 },
    ] },
    { name: 'Lullaby for Nobody', bpm: 70, key: 64, scale: 'minor', prog: [0, 3, 6, 4, 0, 3, 5, 4], seed: 702, loops: 2, layers: [
      { t: 'arp', inst: 'celesta', pat: '0.2.1.2.0.2.1.2.', vol: 0.022, decay: 0.5 },
      { t: 'lead', inst: 'celesta', rhythm: ['x.......x...x...', 'x...x...........'], vol: 0.026, from: 2, decay: 0.8, len: 2 },
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.06, len: 1 },
    ] },
  ],
  night: [
    { name: 'Empty Rooms', bpm: 64, key: 45, scale: 'phrygian', prog: [0, 1, 0, 6, 0, 1, 5, 4], seed: 711, loops: 2, layers: [
      { t: 'bass', ...PZ(0.3), pat: 'x.......x.......', vol: 0.06, len: 1 },
      { t: 'rim', pat: 'o.......o.......', vol: 0.006 },
      { t: 'bell', inst: 'celesta', rhythm: ['..........x.....', '................', '....x...........', '................'], vol: 0.02, decay: 0.9, oct: 1 },
    ] },
    { name: 'Floorboards', bpm: 60, key: 43, scale: 'harmonic', prog: [0, 0, 5, 4, 0, 0, 1, 4], seed: 712, loops: 2, layers: [
      { t: 'bass', ...PZ(0.35), pat: 'x.....x.........', vol: 0.065, len: 1 },
      { t: 'tom', pat: '............o...', vol: 0.02, f: 90 },
      { t: 'arp', inst: 'celesta', pat: '................', vol: 0 },
      { t: 'lead', inst: 'celesta', rhythm: ['................', '......x.........', '................', 'x...........x...'], vol: 0.018, decay: 0.8 },
    ] },
  ],
  danger: [
    { name: 'Footsteps Near', bpm: 92, key: 45, scale: 'phrygian', prog: [0, 1, 0, 1, 0, 1, 6, 5], seed: 721, loops: 4, layers: [
      { t: 'bass', ...PZ(0.18), pat: 'x...x...x...x...', vol: 0.07, len: 1 },
      { t: 'arp', ...PZ(0.15), pat: '..1...1...1...2.', vol: 0.02 },
      { t: 'tom', pat: 'x.......x.......', vol: 0.03, f: 70 },
      { t: 'rim', pat: '......o.......o.', vol: 0.01 },
    ] },
  ],
  chase: [
    { name: 'Run', bpm: 150, key: 45, scale: 'harmonic', prog: [0, 1, 0, 1, 5, 4, 1, 4], seed: 731, loops: 4, layers: [
      { t: 'bass', ...PZ(0.12), pat: 'x.x.x.x.x.x.x.x.', vol: 0.075, len: 1 },
      { t: 'arp', ...PZ(0.12), pat: '0.1.2.1.0.1.2.3.', vol: 0.024, oct: 1 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.09, f: 80 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.008 },
      { t: 'tom', pat: '..........x.x...', vol: 0.03, f: 110 },
    ] },
    { name: 'Don\'t Look Back', bpm: 144, key: 46, scale: 'phrygian', prog: [0, 1, 6, 1, 0, 1, 5, 4], seed: 732, loops: 4, layers: [
      { t: 'bass', ...PZ(0.12), pat: 'x.xxx.xxx.xxx.x.', vol: 0.06, len: 1 },
      { t: 'arp', inst: 'celesta', pat: '0.2.0.2.1.3.1.3.', vol: 0.018, decay: 0.2 },
      { t: 'kick', pat: 'x.....x...x.....', vol: 0.09, f: 80 },
      { t: 'snare', pat: '....o.......o...', vol: 0.016 },
    ] },
  ],
  dawn: [
    { name: 'First Light', bpm: 84, key: 60, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 741, loops: 3, layers: [
      { t: 'arp', inst: 'celesta', pat: '0.2.1.2.0.2.1.2.', vol: 0.024, decay: 0.5 },
      { t: 'bell', inst: 'bell', rhythm: ['x...x...x.......', 'x.......x...x...'], vol: 0.02, from: 2, decay: 0.6 },
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.07, len: 1 },
    ] },
  ],
};
