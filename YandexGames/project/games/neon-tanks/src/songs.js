// Музыка «Неоновых Танков»: мягкий синтвейв короткими нотами (щипки, электропиано, колокольчики).
// Без пэдов, флейты и тянущихся лидов — ничего протяжного. Бас короткий.
// Плейлисты: меню, игра, поздняя игра (30+ уровень) и босс рядом.
const PL = (o = {}) => ({ inst: 'pluck', wave: 'square', lp: 1500, decay: 0.22, ...o });
const EP = (decay = 0.45) => ({ inst: 'epiano', decay });

export const SONGS = {
  menu: [
    { name: 'Garage Lights', bpm: 86, key: 57, scale: 'minor', prog: [0, 5, 2, 6, 0, 5, 3, 4], seed: 301, loops: 2, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'triangle', vol: 0.1, len: 2 },
      { t: 'arp', ...PL({ lp: 1300, decay: 0.25 }), pat: '0.1.2.3.2.1.0.2.', oct: 1, vol: 0.014 },
      { t: 'lead', ...EP(0.5), rhythm: ['x.....x...x.....', 'x...x...x.......'], oct: 1, vol: 0.026, from: 2, len: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.007 },
    ] },
    { name: 'Idle Turret', bpm: 78, key: 52, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 302, loops: 2, layers: [
      { t: 'bass', pat: 'x...........x...', wave: 'sine', vol: 0.11, len: 2 },
      { t: 'arp', inst: 'bell', pat: '2...3...1...0...', oct: 1, vol: 0.013, decay: 0.7 },
      { t: 'lead', ...EP(0.45), rhythm: ['x.......x...x...', 'x...x.......x...'], oct: 1, vol: 0.026, from: 2, len: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.012 },
    ] },
  ],
  game: [
    { name: 'Square Farm', bpm: 104, key: 57, scale: 'minor', prog: [0, 5, 2, 6, 0, 5, 3, 4], seed: 311, loops: 3, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..5.', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', ...PL(), pat: '0123012301230123', oct: 1, vol: 0.011, decay: 0.16 },
      { t: 'lead', ...EP(0.38), rhythm: ['x..x..x...x.x...', 'x.x...x...x.....', 'x..x..x.x.x.x...', 'x.......x...x...'], oct: 1, vol: 0.028, from: 2, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.085, f: 88 },
      { t: 'rim', pat: '....o.......o...', vol: 0.022 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.009 },
    ] },
    { name: 'Bullet Garden', bpm: 110, key: 62, scale: 'dorian', prog: [0, 3, 4, 3, 0, 6, 4, 5], seed: 312, loops: 3, layers: [
      { t: 'bass', pat: 'x...x.o.x...x.5.', wave: 'triangle', vol: 0.09, oct: -2, len: 1 },
      { t: 'arp', ...PL({ lp: 1900 }), pat: '0213021302130213', vol: 0.012, decay: 0.18 },
      { t: 'bell', rhythm: ['x...x.x...x.....', '..x...x...x...x.'], oct: 1, vol: 0.018, from: 2, decay: 0.5 },
      { t: 'kick', pat: 'x.........x.....', vol: 0.085, f: 92 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.006 },
    ] },
    { name: 'Pentagon Drift', bpm: 98, key: 60, scale: 'lydian', prog: [0, 1, 0, 4, 5, 1, 3, 4], seed: 313, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'sine', vol: 0.11, len: 2 },
      { t: 'arp', inst: 'epiano', pat: '0.2.1.3.0.2.1.3.', oct: 1, vol: 0.018, decay: 0.4 },
      { t: 'lead', ...PL({ lp: 1700, decay: 0.3 }), rhythm: ['x...x...x.x.....', 'x.x.x.......x...'], oct: 1, vol: 0.022, from: 2, len: 2 },
      { t: 'clap', pat: '........o.......', vol: 0.016 },
      { t: 'hat', pat: 'o.o.o.o.o.o.o.o.', vol: 0.007 },
    ] },
    { name: 'Afterglow Arena', bpm: 94, key: 54, scale: 'minor', prog: [0, 6, 5, 6, 0, 3, 5, 4], seed: 314, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.x.....', wave: 'triangle', vol: 0.1, len: 2 },
      { t: 'arp', ...PL({ wave: 'triangle', lp: 2200, decay: 0.24 }), pat: '0.2.3.2.1.2.3.2.', oct: 1, vol: 0.016 },
      { t: 'bell', rhythm: ['x.....x.x.......', 'x...x.....x.....'], oct: 1, vol: 0.018, from: 2, decay: 0.6 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 85 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.007 },
    ] },
  ],
  // поздняя игра: 30+ уровень, чуть плотнее
  late: [
    { name: 'Top Ten', bpm: 114, key: 55, scale: 'minor', prog: [0, 5, 6, 4, 0, 5, 3, 4], seed: 321, loops: 3, layers: [
      { t: 'bass', pat: 'x.x.x...x.x.x.5.', wave: 'triangle', vol: 0.085, len: 1 },
      { t: 'arp', ...PL({ lp: 1800 }), pat: '0120012001200123', vol: 0.011, decay: 0.15 },
      { t: 'lead', ...EP(0.35), rhythm: ['x..x..x.x.......', 'x.x.x...x..x....'], oct: 1, vol: 0.028, len: 2 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.08, f: 90 },
      { t: 'clap', pat: '....o.......o...', vol: 0.014 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.009 },
    ] },
    { name: 'Overlord Lane', bpm: 108, key: 50, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 322, loops: 3, layers: [
      { t: 'bass', pat: 'x..x..x.x..x..x.', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', inst: 'bell', pat: '0123012301230123', oct: 1, vol: 0.01, decay: 0.25 },
      { t: 'lead', ...PL({ lp: 1600, decay: 0.28 }), rhythm: ['x.x.x...x...x...', 'x..x..x.x.x.....'], oct: 1, vol: 0.024, len: 2 },
      { t: 'kick', pat: 'x.......x...x...', vol: 0.08, f: 90 },
      { t: 'rim', pat: '....o.......o.o.', vol: 0.018 },
    ] },
  ],
  boss: [
    { name: 'Guardian Pulse', bpm: 120, key: 52, scale: 'phrygian', prog: [0, 1, 0, 6, 0, 1, 5, 6], seed: 331, loops: 4, layers: [
      { t: 'bass', pat: 'x.xx..x.x.xx..x.', wave: 'triangle', vol: 0.085, len: 1 },
      { t: 'arp', ...PL({ lp: 1600 }), pat: '0101210101213210', oct: 1, vol: 0.011, decay: 0.13 },
      { t: 'lead', ...EP(0.32), rhythm: ['x..x..x.x.......', 'x.x.x...x..x....'], oct: 1, vol: 0.028, len: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.09, f: 95 },
      { t: 'tom', pat: '.............o.o', vol: 0.04, f: 140 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.01 },
    ] },
    { name: 'Summoner Steps', bpm: 126, key: 57, scale: 'minor', prog: [0, 6, 5, 4, 0, 6, 3, 4], seed: 332, loops: 4, layers: [
      { t: 'bass', pat: 'x.x.x.x.x.x.x.5.', wave: 'sine', vol: 0.09, len: 1 },
      { t: 'arp', inst: 'bell', pat: '0123012301230123', vol: 0.01, decay: 0.2 },
      { t: 'lead', ...PL({ lp: 1800, decay: 0.26 }), rhythm: ['x.x.x.x.x...x...', 'x..x..x.x.x.....'], oct: 1, vol: 0.026, len: 2 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.08, f: 92 },
      { t: 'clap', pat: '....o.......o...', vol: 0.013 },
    ] },
  ],
};
