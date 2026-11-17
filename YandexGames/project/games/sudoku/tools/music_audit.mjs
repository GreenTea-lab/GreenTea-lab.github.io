// Аудит музыки без звука: гоняем генератор каждой пьесы 10 минут и проверяем,
// что все ноты в ладу, мелодия не уходит в писк, нет больших скачков, нет тянущихся инструментов, тишины в меру.
import { PIECES, ZEN_SCALES, LIMITS, Composer } from '../src/zen.js';
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let bad = 0;
for (const [mood, list] of Object.entries(PIECES))
  for (const P of list) {
    const C = new Composer(P, 7);
    const sc = ZEN_SCALES[P.scale];
    const ev = [];
    const bars = Math.ceil(600 / (4 * C.beat));
    for (let b = 0; b < bars; b++) for (const e of C.barEvents()) ev.push({ ...e, at: b * 4 * C.beat + e.t });
    const issues = [];
    const known = new Set(['koto', 'bass', 'chime', 'drop']);
    for (const e of ev) {
      if (!known.has(e.inst)) issues.push('инструмент ' + e.inst);
      if (e.inst !== 'drop' && e.inst !== 'chime' && !sc.includes((((e.midi - P.key) % 12) + 12) % 12)) issues.push('вне лада ' + e.midi);
      if (e.inst === 'koto' && e.midi > LIMITS.melodyTop) issues.push('высоко ' + e.midi);
      if (e.inst === 'bass' && e.midi > LIMITS.bassTop) issues.push('бас высоко ' + e.midi);
      if (e.inst === 'chime' && e.midi > LIMITS.chimeTop) issues.push('колокольчик высоко ' + e.midi);
    }
    const mel = ev.filter((e) => e.inst === 'koto').sort((a, b) => a.at - b.at);
    let jump = 0;
    for (let i = 1; i < mel.length; i++) if (mel[i].at - mel[i - 1].at > 0.2 && mel[i].at - mel[i - 1].at < 1.5) jump = Math.max(jump, Math.abs(mel[i].midi - mel[i - 1].midi));
    if (jump > 12) issues.push('скачок ' + jump);
    // самая долгая тишина мелодии и плотность нот в минуту
    let gap = 0;
    for (let i = 1; i < mel.length; i++) gap = Math.max(gap, mel[i].at - mel[i - 1].at);
    const perMin = (mel.length / 10).toFixed(0);
    if (gap > 14) issues.push('пауза ' + gap.toFixed(1) + ' с');
    if (perMin > 80) issues.push('слишком часто: ' + perMin + ' нот/мин');
    bad += issues.length;
    const top = Math.max(...mel.map((e) => e.midi));
    console.log(`${mood}/${P.name}: ${perMin} нот/мин, макс. ${mtof(top).toFixed(0)} Гц, скачок ${jump}, макс. пауза ${gap.toFixed(1)} с${issues.length ? ' — ' + [...new Set(issues)].slice(0, 4).join(', ') : ''}`);
  }
console.log(bad ? 'ЕСТЬ ПРОБЛЕМЫ' : 'музыка в порядке');
