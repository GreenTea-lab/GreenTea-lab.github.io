// Аудит музыки: ищем протяжные или резкие ноты (без звука — перехватываем _voice)
import { Music } from '../src/music.js';
import { SONGS } from '../src/songs.js';
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const M = new Music({ ctx: null });
M.define(JSON.parse(JSON.stringify(SONGS)));
let badAll = 0;
for (const [mood, list] of Object.entries(M.lists)) {
  for (const S of list) {
    const ev = [];
    M._drum = () => {};
    M._voice = (midi, t, dur, vol, out, o) => ev.push({ f: mtof(midi), dur: dur + (o.release || 0), wave: o.wave, sustain: o.sustain, vib: o.vib });
    M.intensity = 1;
    M.loops = 1;
    for (let bar = 0; bar < S._bars; bar++) for (let s = 0; s < 16; s++) M._playStep(S, bar, s, 0);
    const bad = ev.filter((e) => e.dur > 0.32 || e.sustain || e.vib || ((e.wave === 'sawtooth' || e.wave === 'square') && e.dur > 0.25));
    badAll += bad.length;
    console.log(`${mood}/${S.name}: нот ${ev.length}, подозрительных ${bad.length}, макс. ${Math.max(...ev.map((e) => e.f)).toFixed(0)} Гц`);
  }
}
console.log(badAll ? 'ЕСТЬ ПРОБЛЕМЫ' : 'музыка в порядке');
