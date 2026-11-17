// Музыка «Чайханы»: уд, сантур, маримба и мягкая дарбука. Только короткие затухающие ноты, без пэдов.
// Плейлисты: menu (вечер в чайхане), game (партия, спокойнее), end (развязка: гонка и выброс шашек).
const OUD = (decay = 0.42) => ({ inst: 'oud', decay });
const SAN = (decay = 0.65) => ({ inst: 'santur', decay });
const MAR = (decay = 0.32) => ({ inst: 'marimba', decay });
const DOUM = { t: 'tom', f: 92 };

export const SONGS = {
  menu: [
    { name: 'Evening Tea', bpm: 92, key: 50, scale: 'harmMinor', prog: [0, 3, 4, 0, 5, 3, 4, 4], seed: 801, loops: 2, swing: 0.08, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'sine', vol: 0.1, len: 1 },
      { t: 'arp', ...SAN(0.6), pat: '0.2.1.2.0.2.1.2.', vol: 0.018 },
      { t: 'lead', ...OUD(0.45), rhythm: ['x..x..x...x.....', 'x.x...x...x.x...'], vol: 0.03, from: 2, len: 2 },
      { ...DOUM, pat: 'x.....x...x.....', vol: 0.05 },
      { t: 'rim', pat: '...o.......o..o.', vol: 0.012 },
    ] },
    { name: 'Copper Lanterns', bpm: 84, key: 52, scale: 'hijaz', prog: [0, 0, 6, 0, 3, 3, 1, 0], seed: 802, loops: 2, layers: [
      { t: 'bass', pat: 'x.......x...x...', wave: 'triangle', vol: 0.09, len: 2 },
      { t: 'arp', ...OUD(0.38), pat: '0.1.2.1.0.1.2.3.', vol: 0.017 },
      { t: 'bell', ...SAN(0.8), rhythm: ['x.......x...x...', 'x...x.......x...'], vol: 0.02, from: 2 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.006 },
    ] },
    { name: 'Garden of Pomegranates', bpm: 100, key: 55, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 803, loops: 2, swing: 0.1, layers: [
      { t: 'bass', pat: 'x..x....x..x....', wave: 'sine', vol: 0.095, len: 1 },
      { t: 'arp', ...MAR(0.3), pat: '0.2.0.2.1.2.1.3.', vol: 0.018 },
      { t: 'lead', ...SAN(0.55), rhythm: ['x.x...x...x.....', 'x...x.x.x.......'], vol: 0.026, from: 2, len: 2 },
      { ...DOUM, pat: 'x.......x.....x.', vol: 0.05 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.005 },
    ] },
  ],
  game: [
    { name: 'Slow Steam', bpm: 80, key: 50, scale: 'dorian', prog: [0, 3, 0, 4, 0, 3, 6, 4], seed: 811, loops: 3, layers: [
      { t: 'bass', pat: 'x...........x...', wave: 'sine', vol: 0.085, len: 2 },
      { t: 'arp', ...SAN(0.6), pat: '0...2...1...2...', vol: 0.018 },
      { t: 'lead', ...OUD(0.42), rhythm: ['x...x.x...x.....', 'x.x.....x.......'], vol: 0.024, from: 2, len: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.008 },
    ] },
    { name: 'Thinking Move', bpm: 76, key: 53, scale: 'harmMinor', prog: [0, 5, 3, 4, 0, 5, 1, 4], seed: 812, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.......', wave: 'triangle', vol: 0.085, len: 2 },
      { t: 'arp', ...OUD(0.36), pat: '0.1.2.1.0.1.2.1.', vol: 0.015 },
      { t: 'bell', ...SAN(0.75), rhythm: ['x.......x...x...', 'x...x.......x...'], vol: 0.018, from: 2 },
    ] },
    { name: 'Saffron Afternoon', bpm: 90, key: 48, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 0], seed: 813, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'sine', vol: 0.085, len: 1 },
      { t: 'arp', ...MAR(0.28), pat: '0.2.1.2.0.2.1.2.', vol: 0.015 },
      { t: 'lead', ...SAN(0.5), rhythm: ['x..x..x...x.....', 'x.......x.x.....'], vol: 0.022, from: 2, len: 2 },
      { ...DOUM, pat: 'x.......x.......', vol: 0.04 },
      { t: 'tambourine', pat: '..o...o...o...o.', vol: 0.004 },
    ] },
    { name: 'Carved Walnut', bpm: 86, key: 52, scale: 'hijaz', prog: [0, 0, 1, 0, 3, 3, 1, 0], seed: 814, loops: 3, layers: [
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.085, len: 2 },
      { t: 'arp', ...SAN(0.55), pat: '0.2.1.2.0.2.1.3.', vol: 0.014 },
      { t: 'lead', ...OUD(0.4), rhythm: ['x...x.x...x.....', 'x.x.....x.......'], vol: 0.022, from: 2, len: 2 },
      { t: 'rim', pat: '...o.......o....', vol: 0.008 },
    ] },
    { name: 'Glass of Tea', bpm: 96, key: 55, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 815, loops: 3, swing: 0.08, layers: [
      { t: 'bass', pat: 'x.......x.......', wave: 'sine', vol: 0.085, len: 2 },
      { t: 'arp', ...MAR(0.3), pat: '0...2...1...2...', vol: 0.018 },
      { t: 'lead', ...SAN(0.5), rhythm: ['x...x...x.x.....', 'x.x...x.........'], vol: 0.022, from: 2, len: 2 },
      { t: 'shaker', pat: '....o.......o...', vol: 0.005 },
    ] },
  ],
  end: [
    { name: 'Homeward Run', bpm: 104, key: 50, scale: 'harmMinor', prog: [0, 3, 4, 0, 5, 3, 4, 4], seed: 821, loops: 3, swing: 0.1, layers: [
      { t: 'bass', pat: 'x..x..x.x..x....', wave: 'sine', vol: 0.09, len: 1 },
      { t: 'arp', ...SAN(0.45), pat: '0123012301230123', vol: 0.012 },
      { t: 'lead', ...OUD(0.36), rhythm: ['x.x.x...x.......', 'x.......x.x.x...'], vol: 0.024, from: 2, len: 2 },
      { ...DOUM, pat: 'x.....x...x.....', vol: 0.05 },
      { t: 'rim', pat: '..o...o...o...o.', vol: 0.008 },
    ] },
    { name: 'Last Checkers', bpm: 98, key: 53, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 822, loops: 3, layers: [
      { t: 'bass', pat: 'x.....x...x.....', wave: 'triangle', vol: 0.09, len: 1 },
      { t: 'arp', ...MAR(0.26), pat: '0.2.1.2.0.2.1.2.', vol: 0.015 },
      { t: 'lead', ...SAN(0.48), rhythm: ['x..x..x...x.....', 'x.x...x...x.x...'], vol: 0.024, from: 2, len: 2 },
      { ...DOUM, pat: 'x.......x...x...', vol: 0.045 },
      { t: 'tambourine', pat: 'o.o.o.o.o.o.o.o.', vol: 0.003 },
    ] },
  ],
};
