// Сборка словаря и уровней кампании: tools/words_<lang>_<tier>.txt -> src/data/<lang>.json
// node tools/genlevels.mjs
import fs from 'fs';
import path from 'path';
import { generate, hashStr } from '../src/gen.js';

const LEVELS = 120;
const ALPHA = { ru: /^[А-ЯЁ]+$/, en: /^[A-Z]+$/ };

function load(lang) {
  const words = new Map(); // слово -> { word, clue, tier }
  for (const tier of [1, 2, 3]) {
    const f = path.join('tools', `words_${lang}_${tier}.txt`);
    for (const raw of fs.readFileSync(f, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const [w, clue] = line.split('|');
      if (!clue) throw new Error(`${f}: нет вопроса: ${line}`);
      let word = w.trim().toUpperCase();
      if (!ALPHA[lang].test(word)) throw new Error(`${f}: недопустимые символы: ${word}`);
      word = word.replace(/Ё/g, 'Е');
      if (word.length < 3 || word.length > 10) continue;
      const c = clue.trim();
      if (words.has(word)) {
        // повтор слова — второй вариант вопроса
        const e = words.get(word);
        if (!e.alt.includes(c)) e.alt.push(c);
        continue;
      }
      words.set(word, { word, clue: c, alt: [c], tier });
    }
  }
  return [...words.values()];
}

// параметры сложности уровня i (0..LEVELS-1)
function spec(i) {
  const target = Math.min(12, 5 + Math.floor(i / 12));
  const maxW = Math.min(10, 7 + Math.floor(i / 25));
  const maxH = Math.min(10, 7 + Math.floor(i / 22));
  // доли слов по сложности
  let mix;
  if (i < 15) mix = [0.9, 0.1, 0];
  else if (i < 30) mix = [0.65, 0.35, 0];
  else if (i < 50) mix = [0.45, 0.45, 0.1];
  else if (i < 75) mix = [0.3, 0.5, 0.2];
  else if (i < 100) mix = [0.2, 0.45, 0.35];
  else mix = [0.15, 0.4, 0.45];
  return { target, maxW, maxH, mix };
}

function campaign(lang, bank) {
  const lastUsed = new Map();
  const uses = new Map();
  const levels = [];
  for (let i = 0; i < LEVELS; i++) {
    const sp = spec(i);
    const seed = hashStr(lang + ':' + i);
    let R = seed;
    const rnd = () => ((R = (R * 1664525 + 1013904223) >>> 0) / 4294967296);
    // кандидаты: подходят по длине, не использовались недавно
    const fresh = (w, gap) => !lastUsed.has(w.word) || i - lastUsed.get(w.word) > gap;
    let res = null;
    for (const [gap, cut] of [[60, 0], [40, 0], [25, 0], [60, 1], [25, 1], [12, 1], [0, 2], [0, 3], [0, 4]]) {
      const cand = bank.filter((w) => w.word.length <= Math.max(sp.maxW, sp.maxH) && fresh(w, gap));
      const byTier = [1, 2, 3].map((t) => cand.filter((w) => w.tier === t).sort((a, b) => (uses.get(a.word) || 0) - (uses.get(b.word) || 0) || rnd() - 0.5));
      const pool = [];
      const N = sp.target * 5;
      for (let t = 0; t < 3; t++) {
        const k = Math.round(N * sp.mix[t]);
        // берём наименее использованные, но вперемешку
        const src = byTier[t].slice(0, Math.max(k * 3, 1)).sort(() => rnd() - 0.5);
        pool.push(...src.slice(0, k));
      }
      if (pool.length < sp.target) continue;
      res = generate(pool, { target: sp.target - cut, maxW: sp.maxW, maxH: sp.maxH, tries: 80, seed });
      if (res) break;
    }
    if (!res) throw new Error(`${lang}: уровень ${i + 1} не собрался`);
    for (const e of res.entries) {
      lastUsed.set(e.word, i);
      const n = (uses.get(e.word) || 0) + 1;
      uses.set(e.word, n);
      // при повторе слова — другой вариант вопроса, если есть
      const b = bank.find((w) => w.word === e.word);
      e.clue = b.alt[(n - 1) % b.alt.length];
    }
    levels.push({ w: res.w, h: res.h, e: res.entries.map((e) => [e.x, e.y, e.dir, e.word, e.clue]) });
  }
  const reused = [...uses.values()].filter((n) => n > 1).length;
  console.log(`${lang}: слов ${bank.length}, уровней ${levels.length}, использовано слов ${uses.size}, повторов ${reused}`);
  return levels;
}

fs.mkdirSync('src/data', { recursive: true });
for (const lang of ['ru', 'en']) {
  const bank = load(lang);
  const levels = campaign(lang, bank);
  const out = { bank: bank.map((w) => [w.word, w.alt.join('|'), w.tier]), levels };
  fs.writeFileSync(`src/data/${lang}.json`, JSON.stringify(out));
  const sizes = levels.map((l) => `${l.w}x${l.h}/${l.e.length}`);
  console.log('  ', sizes.filter((_, i) => i % 10 === 0).join(' '));
}
