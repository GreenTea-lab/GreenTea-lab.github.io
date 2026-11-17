// Музыка «Облачных Гонок»: мягкий солнечный поп и синтвейв, без долбящего бита.
// Плейлисты по настроению: меню, дневные трассы, снег, ночь, последний круг (boss).
const RAW = {
  menu: [
    { name: 'Cloud Garage', bpm: 92, key: 60, scale: 'major', prog: [0, 5, 3, 4, 0, 5, 3, 4], seed: 101, loops: 2, layers: [
      { t: 'pad', wave: 'triangle', lp: 1300, vol: 0.026, attack: 0.8, notes: 4 },
      { t: 'bass', pat: 'x.......x...x...', wave: 'sine', vol: 0.12 },
      { t: 'arp', inst: 'epiano', pat: '0.2.1.2.0.2.1.3.', vol: 0.03, decay: 0.6 },
      { t: 'bell', rhythm: ['x.....x...x.....', 'x...x...x.......'], oct: 1, vol: 0.024, from: 2 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.008 },
    ] },
    { name: 'Sunny Workshop', bpm: 86, key: 65, scale: 'lydian', prog: [0, 1, 0, 4, 5, 1, 3, 4], seed: 102, loops: 2, layers: [
      { t: 'pad', wave: 'sine', lp: 1600, vol: 0.03, attack: 1.0, notes: 4 },
      { t: 'bass', pat: 'x...........x...', wave: 'triangle', vol: 0.11 },
      { t: 'arp', inst: 'pluck', pat: '0.1.2.3.2.1.0.1.', oct: 1, vol: 0.02, decay: 0.4 },
      { t: 'flute', rhythm: ['x.......x...x...', 'x...x.......x...'], oct: 1, vol: 0.024, from: 4, len: 6 },
    ] },
    { name: 'Daydream Lot', bpm: 80, key: 57, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 103, loops: 2, layers: [
      { t: 'pad', wave: 'triangle', lp: 1200, vol: 0.03, attack: 1.2, notes: 4 },
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.11 },
      { t: 'arp', inst: 'bell', pat: '2...3...1...0...', oct: 1, vol: 0.016, decay: 1.3 },
      { t: 'lead', inst: 'epiano', rhythm: ['x...x.x...x.....', 'x.......x.x.....'], vol: 0.026, from: 2 },
      { t: 'rim', pat: '....o.......o...', vol: 0.012 },
    ] },
  ],
  game: [
    { name: 'Blue Sky Sprint', bpm: 118, key: 62, scale: 'major', prog: [0, 4, 5, 3, 0, 4, 3, 4], seed: 111, loops: 3, layers: [
      { t: 'pad', wave: 'triangle', lp: 1500, vol: 0.02, attack: 0.4, notes: 4 },
      { t: 'bass', pat: 'x..x..x.x..x..5.', wave: 'triangle', vol: 0.1 },
      { t: 'arp', inst: 'pluck', pat: '0123012301230123', oct: 1, vol: 0.016, decay: 0.2 },
      { t: 'lead', inst: 'synth', rhythm: ['x..x..x...x.x...', 'x.x...x...x.....', 'x..x..x.x.x.x...', 'x.......x...x...'], oct: 1, vol: 0.024, from: 4, lp: 2000 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.09, f: 90 },
      { t: 'clap', pat: '....o.......o...', vol: 0.016 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.011 },
    ] },
    { name: 'Meadow Drift', bpm: 112, key: 67, scale: 'mixolydian', prog: [0, 6, 3, 0, 0, 6, 4, 0], seed: 112, loops: 3, swing: 0.1, layers: [
      { t: 'pad', wave: 'triangle', lp: 1400, vol: 0.02 },
      { t: 'bass', pat: 'x...5...x...5.x.', wave: 'triangle', vol: 0.1 },
      { t: 'arp', inst: 'epiano', pat: '0.2.1.2.0.2.1.2.', vol: 0.024, decay: 0.35 },
      { t: 'flute', rhythm: ['x.x.x...x.x.....', 'x...x.x.x...x...'], oct: 1, vol: 0.026, from: 2, len: 3 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.085, f: 85 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.016 },
      { t: 'shaker', pat: 'o.o.o.o.o.o.o.o.', vol: 0.006 },
    ] },
    { name: 'Seaside Turbo', bpm: 122, key: 64, scale: 'major', prog: [0, 3, 4, 3, 0, 5, 3, 4], seed: 113, loops: 3, layers: [
      { t: 'pad', wave: 'sine', lp: 1700, vol: 0.022, attack: 0.3, notes: 4 },
      { t: 'bass', pat: 'x.x...x.x.x...x.', wave: 'sine', vol: 0.11, oct: -2 },
      { t: 'arp', inst: 'bell', pat: '0.2.1.3.0.2.1.3.', oct: 1, vol: 0.013, decay: 0.5 },
      { t: 'lead', inst: 'flute', rhythm: ['x..x..x.x.......', 'x.x.x...x...x...'], oct: 1, vol: 0.026, from: 4 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.09, f: 88 },
      { t: 'rim', pat: '....o.......o.o.', vol: 0.02 },
      { t: 'hat', pat: '..o...o...o...oo', vol: 0.01 },
    ] },
    { name: 'Lemonade Lap', bpm: 108, key: 60, scale: 'pentaMajor', prog: [0, 3, 4, 0, 5, 3, 1, 4], seed: 114, loops: 3, layers: [
      { t: 'pad', wave: 'triangle', lp: 1300, vol: 0.022, attack: 0.5 },
      { t: 'bass', pat: 'x.....x...x.....', wave: 'triangle', vol: 0.11 },
      { t: 'arp', inst: 'pluck', pat: '0.1.2.1.0.1.2.3.', oct: 1, vol: 0.02, decay: 0.3 },
      { t: 'lead', inst: 'epiano', rhythm: ['x.x.x...x.......', 'x.......x.x.x...'], oct: 1, vol: 0.026, from: 2 },
      { t: 'kick', pat: 'x.......x...x...', vol: 0.085, f: 90 },
      { t: 'clap', pat: '....o.......o...', vol: 0.014 },
    ] },
  ],
  snow: [
    { name: 'Snowflake Rally', bpm: 110, key: 64, scale: 'minor', prog: [0, 5, 3, 4, 0, 5, 6, 4], seed: 121, loops: 3, layers: [
      { t: 'pad', wave: 'sine', lp: 1600, vol: 0.026, attack: 0.7, notes: 4 },
      { t: 'bass', pat: 'x.......x.x.....', wave: 'sine', vol: 0.12 },
      { t: 'arp', inst: 'bell', pat: '0.2.1.3.0.2.1.3.', oct: 1, vol: 0.014, decay: 1.0 },
      { t: 'flute', rhythm: ['x...x...x.......', 'x.......x...x...'], oct: 1, vol: 0.024, from: 4, len: 5 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 85 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.009 },
      { t: 'tambourine', pat: '....o.......o...', vol: 0.014 },
    ] },
    { name: 'Frosty Curves', bpm: 116, key: 59, scale: 'dorian', prog: [0, 3, 0, 4, 5, 3, 6, 4], seed: 122, loops: 3, layers: [
      { t: 'pad', wave: 'triangle', lp: 1300, vol: 0.022, attack: 0.6 },
      { t: 'bass', pat: 'x.....x...x.....', wave: 'triangle', vol: 0.11 },
      { t: 'arp', inst: 'pluck', pat: '0123012301230123', oct: 1, vol: 0.015, decay: 0.25 },
      { t: 'bell', rhythm: ['x...x.x...x.....', 'x.......x.x.....'], oct: 1, vol: 0.02, from: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.085, f: 88 },
      { t: 'rim', pat: '....o.......o...', vol: 0.018 },
    ] },
  ],
  night: [
    { name: 'Neon Lanterns', bpm: 104, key: 57, scale: 'minor', prog: [0, 5, 2, 6, 0, 5, 3, 4], seed: 131, loops: 3, layers: [
      { t: 'pad', wave: 'sawtooth', lp: 900, vol: 0.016, attack: 0.6 },
      { t: 'bass', pat: 'x..x..x.x..x..5.', wave: 'sawtooth', lp: 420, vol: 0.075 },
      { t: 'arp', wave: 'square', lp: 1500, pat: '0123012301230123', oct: 1, vol: 0.01, decay: 0.16 },
      { t: 'lead', inst: 'synth', rhythm: ['x..x..x...x.x...', 'x.x...x...x.....'], oct: 1, vol: 0.024, from: 4, lp: 1700 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.09, f: 90 },
      { t: 'rim', pat: '....o.......o...', vol: 0.028 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.011 },
    ] },
    { name: 'Firefly Highway', bpm: 98, key: 62, scale: 'dorian', prog: [0, 3, 4, 3, 0, 6, 4, 5], seed: 132, loops: 3, layers: [
      { t: 'pad', wave: 'triangle', lp: 1200, vol: 0.022, attack: 0.5, notes: 4 },
      { t: 'bass', pat: 'x...x.o.x...x.5.', wave: 'triangle', vol: 0.1, oct: -2 },
      { t: 'arp', inst: 'bell', pat: '0.2.1.3.2.1.0.2.', oct: 1, vol: 0.013, decay: 0.8 },
      { t: 'lead', inst: 'epiano', rhythm: ['x...x.x.x.......', 'x.x.....x...x...'], vol: 0.026, from: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.085, f: 85 },
      { t: 'clap', pat: '....o.......o...', vol: 0.014 },
    ] },
    { name: 'Moonlit Loop', bpm: 92, key: 55, scale: 'minor', prog: [0, 6, 5, 6, 0, 6, 3, 4], seed: 133, loops: 3, layers: [
      { t: 'pad', wave: 'sawtooth', lp: 800, vol: 0.018, attack: 0.9 },
      { t: 'bass', pat: 'x.......x.....5.', wave: 'sine', vol: 0.12 },
      { t: 'arp', wave: 'square', lp: 1200, pat: '0.1.2.3.2.1.0.2.', oct: 1, vol: 0.012, decay: 0.25 },
      { t: 'bell', rhythm: ['x.....x...x.....', 'x...x...x.......'], oct: 1, vol: 0.024, from: 2 },
      { t: 'kick', pat: 'x.......x.......', vol: 0.08, f: 85 },
      { t: 'shaker', pat: '..o...o...o...o.', vol: 0.008 },
    ] },
  ],
  boss: [
    { name: 'Final Lap', bpm: 128, key: 62, scale: 'minor', prog: [0, 5, 6, 4, 0, 5, 3, 4], seed: 141, loops: 4, layers: [
      { t: 'pad', wave: 'sawtooth', lp: 1000, vol: 0.016, attack: 0.3 },
      { t: 'bass', pat: 'x.x.x.x.x.x.x.5.', wave: 'sawtooth', lp: 480, vol: 0.07 },
      { t: 'arp', inst: 'pluck', pat: '0120012001200123', oct: 1, vol: 0.016, decay: 0.2 },
      { t: 'lead', inst: 'synth', rhythm: ['x..x..x.x.......', 'x.x.x.x.x...x...'], oct: 1, vol: 0.026, lp: 2100 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.09, f: 90 },
      { t: 'clap', pat: '....o.......o...', vol: 0.016 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.012 },
    ] },
    { name: 'Photo Finish', bpm: 132, key: 65, scale: 'mixolydian', prog: [0, 6, 3, 4, 0, 6, 4, 4], seed: 142, loops: 4, layers: [
      { t: 'pad', wave: 'triangle', lp: 1400, vol: 0.02, attack: 0.3 },
      { t: 'bass', pat: 'x.x...x.x.x...x.', wave: 'triangle', vol: 0.1 },
      { t: 'arp', inst: 'bell', pat: '0123012301230123', oct: 1, vol: 0.011, decay: 0.3 },
      { t: 'lead', inst: 'flute', rhythm: ['x.x.x.x.x...x...', 'x..x..x.x.x.....'], oct: 1, vol: 0.026 },
      { t: 'kick', pat: 'x...x...x...x...', vol: 0.085, f: 90 },
      { t: 'tom', pat: '............ooxx', vol: 0.04, f: 120 },
      { t: 'hat', pat: '..o...o...o...o.', vol: 0.011 },
    ] },
  ],
};

// Без протяжных звуков: тянущиеся аккорды (pad), свистящая «флейта» с вибрато и пила-синт
// заменены на короткие мягкие ноты электропиано; мелодии и колокольчики на октаву ниже.
function soften(list) {
  return list.map((song) => ({
    ...song,
    layers: song.layers.map((L) => {
      if (L.t === 'pad') return { t: 'arp', inst: 'epiano', pat: '0.......2.......', vol: Math.min(0.022, L.vol), decay: 0.8 };
      if (L.t === 'flute' || L.t === 'lead') {
        const inst = L.inst === 'pluck' ? 'pluck' : 'epiano';
        return { ...L, t: 'lead', inst, oct: 0, len: 2, decay: inst === 'pluck' ? 0.3 : 0.45, vib: 0, lp: undefined, vol: L.vol * 0.9 };
      }
      if (L.t === 'bell') return { ...L, oct: 0, decay: Math.min(L.decay || 1.2, 0.55), vol: L.vol * 0.85 };
      if (L.t === 'arp') {
        const out = { ...L, decay: Math.min(L.decay || 0.35, 0.5) };
        if (L.wave === 'square' || L.wave === 'sawtooth') Object.assign(out, { wave: 'triangle', inst: 'pluck' });
        if (out.inst === 'bell') out.oct = 0;
        return out;
      }
      if (L.t === 'bass' && L.wave === 'sawtooth') return { ...L, wave: 'triangle', lp: 500, vol: L.vol * 1.3 };
      return L;
    }),
  }));
}
export const SONGS = Object.fromEntries(Object.entries(RAW).map(([k, v]) => [k, soften(v)]));
