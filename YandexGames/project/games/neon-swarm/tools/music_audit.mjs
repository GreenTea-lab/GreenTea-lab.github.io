// Аудит музыки: ищем протяжные высокие/резкие ноты (без звука — перехватываем _voice)
import { Music } from '../src/music.js';
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const games = ['neon'];
const verbose = process.argv[2] === '-v';
for (const g of games) {
  const { SONGS } = await import('../src/songs.js');
  const M = new Music({ ctx: null });
  M.define(JSON.parse(JSON.stringify(SONGS)));
  for (const [mood, list] of Object.entries(M.lists)) {
    for (const S of list) {
      const ev = [];
      M._drum = () => {};
      M._voice = (midi, t, dur, vol, out, o) => ev.push({ midi, f: mtof(midi), dur: dur + (o.release || 0), vol, wave: o.wave, lp: o.lp, sustain: o.sustain, vib: o.vib, partial: o.partial });
      M.intensity = 1;
      M.loops = 1;
      const spb = 60 / S.bpm / 4;
      let curLayer = null;
      for (let bar = 0; bar < S._bars; bar++) for (let s = 0; s < 16; s++) {
        const n0 = ev.length;
        M._playStep(S, bar, s, 0);
      }
      // «режущие»: основной тон > 880 Гц и звучит дольше 0.45 с, или пила/квадрат без сильного фильтра дольше 0.6 с выше 500 Гц
      const bad = ev.filter((e) => e.dur > 0.32 || e.sustain || e.vib || ((e.wave === "sawtooth" || e.wave === "square") && e.dur > 0.25));
      const maxF = Math.max(...ev.map((e) => e.f));
      console.log(`${g}/${mood}/${S.name}: нот ${ev.length}, подозрительных ${bad.length}, макс. ${maxF.toFixed(0)} Гц`);
      if (verbose && bad.length) {
        const sum = {};
        for (const e of bad) { const k = `${e.wave}${e.partial ? '+p' + e.partial : ''} ${Math.round(e.f)}Hz ${e.dur.toFixed(2)}s`; sum[k] = (sum[k] || 0) + 1; }
        console.log('   ', Object.entries(sum).slice(0, 8).map(([k, v]) => `${k}×${v}`).join(' | '));
      }
    }
  }
}
