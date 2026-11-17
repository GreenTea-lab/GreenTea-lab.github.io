// Музыка «Неонового Роя»: ритмичный неоновый электро-поп. 8 треков с мелодиями, написанными вручную
// (цифра — ступень лада от тоники, точка — пауза). Ритм держат бочка, синкопированный бас и арпеджио.
// Звук мягкий: пила только под тёмным фильтром, мягкий малый вместо хлопка, без высоких тарелок,
// у нот мягкое начало. Только короткие ноты — без тянущихся пэдов и флейт.
const K = (pat, vol = 0.085, f = 90) => ({ t: 'kick', pat, vol, f });
const SN = (pat, vol = 0.03) => ({ t: 'snap', pat, vol });
const SH = (pat, vol = 0.004) => ({ t: 'shaker', pat, vol });
const TOM = (vol = 0.045) => ({ t: 'tom', pat: ['................', '................', '................', '..........o.o.oo'], vol, f: 140 });
const song = (o, drums, from = 0) => ({ ...o, layers: o.layers.concat(drums.map((d) => ({ ...d, from: d.t === 'kick' ? 0 : from }))) });
const BASS = (pat, vol = 0.052) => ({ t: 'bass', punch: true, lp: 380, lpEnv: 1.5, pat, vol });
const SAW = { inst: 'saw', lp: 1250, lpEnv: 1.5 };
// крючок из 4 тактов, в 8-м такте — своя концовка
const hook = (a, b, c, d, e) => [a, b, c, d, a, b, c, e];

export const SONGS = {
  menu: [
    song({ name: 'Night Drive', bpm: 100, key: 57, scale: 'minor', prog: [0, 5, 3, 4, 0, 5, 3, 4], seed: 41, loops: 2, layers: [
      { t: 'pad', pat: '..x...x...x...x.', vol: 0.011 },
      BASS('x..x..x.x..x..x.', 0.05),
      { t: 'arp', inst: 'pluck', pat: '0.1.2.1.0.1.2.1.', oct: 1, vol: 0.009 },
      { t: 'lead', inst: 'bell', oct: 1, vol: 0.02, from: 2, mel: hook('4...4.5.4...2...', '5...4.2.0...2...', '3...5.7.5...3...', '4...6.4.1.2.4...', '4.2.1.....0.....') },
    ] }, [K('x.......x.x.....', 0.08, 86), SN('....x.......x...'), SH('o.x.o.x.o.x.o.x.')], 1),
    song({ name: 'Synth City', bpm: 112, key: 53, scale: 'dorian', prog: [0, 3, 0, 3, 5, 4, 3, 4], seed: 42, loops: 2, layers: [
      { t: 'pad', stab: 'saw', lp: 900, lpEnv: 1.4, pat: '..x...x...x...x.', vol: 0.012 },
      BASS('x.o.x..ox.o.x.5.', 0.05),
      { t: 'arp', inst: 'epiano', pat: '0...2...1...3...', oct: 1, vol: 0.01 },
      { t: 'lead', inst: 'pluck', oct: 1, vol: 0.021, from: 2, mel: ['0.2.4.2.3.2.0...', '3...5.3.2.3.5...', '0.2.4.2.3.2.0...', '3...5.3.2.3.5...', '5.4.2.0.2...4...', '4...2.4.6.4.2...', '3.2.0.2.3...5...', '4.6.7...6.4.2...'] },
    ] }, [K('x...x...x...x...', 0.08, 88), SN('....x.......x...', 0.028), SH('o.x.o.x.o.x.o.x.')], 1),
  ],
  game: [
    song({ name: 'Neon Chase', bpm: 124, key: 57, scale: 'minor', prog: [0, 0, 5, 5, 6, 6, 4, 4], seed: 51, loops: 3, layers: [
      { t: 'pad', stab: 'saw', lp: 1000, lpEnv: 1.5, pat: 'x.....x.....x...', vol: 0.013 },
      BASS('x.x...x.x.x...x.'),
      { t: 'arp', ...SAW, lp: 1100, pat: '0.2.1.2.3.2.1.2.', oct: 1, vol: 0.01 },
      { t: 'lead', ...SAW, oct: 1, vol: 0.019, from: 4, mel: ['7...7.6.7...4...', '7.9.7.6.4...2...', '5...5.4.5...7...', '7.5.4.2.0.......', '6...6.5.6...8...', '8.6.5.4.6.......', '4...4.6.7...6.4.', '4.2.4.6.8...7...'] },
    ] }, [K('x...x...x...x...'), SN('....x.......x...'), SH('oxoxoxoxoxoxoxox', 0.0035), TOM()]),
    song({ name: 'Pixel Rain', bpm: 118, key: 55, scale: 'minor', prog: [0, 3, 4, 0, 0, 3, 5, 4], seed: 52, loops: 3, layers: [
      { t: 'pad', pat: '..x.......x.....', vol: 0.012 },
      BASS('x..xx..xx..xx.x.', 0.05),
      { t: 'arp', inst: 'chip', lp: 1000, pat: '0.1.2.3.2.1.0.1.', oct: 1, vol: 0.008 },
      { t: 'lead', inst: 'epiano', oct: 1, vol: 0.021, from: 2, mel: ['0.2.4.5.4.2.0...', '3...3.5.7...5...', '4.6.8.6.4...1...', '2.0.......2.4...', '0.2.4.5.4.2.0...', '3.5.7.8.7.5.3...', '5...4...2...0...', '1.2.4.....6.4...'] },
    ] }, [K('x..x..x...x..x..', 0.08, 88), SN('....x.......x...'), SH('o.x.o.x.o.x.o.x.')], 1),
    song({ name: 'Overclock', bpm: 128, key: 50, scale: 'dorian', prog: [0, 3, 6, 3, 0, 3, 4, 4], seed: 53, loops: 3, layers: [
      { t: 'pad', pat: '..x...x...x...x.', vol: 0.011 },
      BASS('x.o..x.ox.o..x.o', 0.05),
      { t: 'arp', inst: 'pluck', pat: '0123012301230123', oct: 1, vol: 0.009 },
      { t: 'lead', inst: 'lute', oct: 1, vol: 0.021, from: 4, mel: ['4.4.4.2.4...7...', '5.5.5.3.5...8...', '6.6.6.4.6...9...', '5...4...3...2...', '4.4.4.2.4...7...', '8.7.5.3.5...7...', '6...5.4.3...4...', '4.......2...1...'] },
    ] }, [K('x...x...x...x.x.'), SN('....x.......x..o', 0.032), SH('oxoxoxoxoxoxoxox', 0.0035), TOM()]),
    song({ name: 'Afterburn', bpm: 132, key: 52, scale: 'minor', prog: [0, 5, 6, 6, 0, 5, 3, 4], seed: 54, loops: 3, layers: [
      { t: 'pad', stab: 'saw', lp: 950, lpEnv: 1.4, pat: 'x..x..x.x..x..x.', vol: 0.012 },
      BASS('xoxoxoxoxoxoxoxo', 0.045),
      { t: 'lead', inst: 'bell', oct: 1, vol: 0.02, from: 2, mel: hook('7...9...7.6.4...', '5...7...9.7.5...', '6...8...6.5.4...', '6.5.4.5.6...8...', '4.2.1.2.4...6...') },
    ] }, [K('x...x...x...x...'), SN('....x.......x...'), SH('o.x.o.x.o.x.o.x.'), TOM()], 1),
  ],
  boss: [
    song({ name: 'Titan Core', bpm: 136, key: 52, scale: 'phrygian', prog: [0, 1, 0, 6, 0, 1, 3, 4], seed: 61, loops: 4, layers: [
      { t: 'pad', stab: 'saw', lp: 1000, lpEnv: 1.5, pat: 'x..x..x..x..x.x.', vol: 0.013 },
      BASS('xxx.xxx.xxx.xoxo', 0.048),
      { t: 'arp', ...SAW, lp: 1050, pat: '0.1.0.2.0.1.0.3.', oct: 1, vol: 0.01 },
      { t: 'lead', ...SAW, oct: 1, vol: 0.02, mel: ['0.1.0...4.3.1.0.', '1...3.1.0...6...', '0.1.0...4.3.1.0.', '1...3.1.0...6...', '0.1.3.4.5.4.3.1.', '1.0.6.0.1...3...', '3.4.5.4.3.1.0...', '4.......4.5.6.7.'] },
    ] }, [K('x...x...x...x.x.'), SN('....x.......x..o', 0.032), SH('oxoxoxoxoxoxoxox', 0.0035), TOM(0.05)]),
    song({ name: 'Hive Mind', bpm: 134, key: 53, scale: 'minor', prog: [0, 0, 6, 6, 5, 5, 4, 4], seed: 62, loops: 4, layers: [
      { t: 'pad', pat: '..x...x...x...x.', vol: 0.012 },
      BASS('x.ox.ox.x.ox.ox.', 0.05),
      { t: 'arp', inst: 'pluck', pat: '0123012343210123', oct: 1, vol: 0.01 },
      { t: 'lead', inst: 'pluck', oct: 1, vol: 0.022, mel: ['4.4.7.4.6.4.2.4.', '4.4.7.4.8.7.6...', '6.6.9.6.8.6.4.6.', '6...5...4...3...', '5.5.8.5.7.5.4.5.', '5.5.8.5.9.8.7...', '4...6...8...6...', '4.2.1.2.4.......'] },
    ] }, [K('x...x...x...x...'), SN('....x.......x...'), SH('oxoxoxoxoxoxoxox', 0.0035), TOM(0.05)]),
  ],
};
