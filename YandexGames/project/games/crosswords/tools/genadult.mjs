// Раздел «Клуб эрудитов»: tools/words_<lang>_adult.txt -> ключ `adult` в src/data/<lang>.json
// Запускать после genlevels.mjs:  node tools/genadult.mjs
import fs from 'fs';
import { generate, hashStr } from '../src/gen.js';

const COUNT = 30;
const ALPHA = { ru: /^[А-ЯЁ]+$/, en: /^[A-Z]+$/ };

function load(lang, files) {
  const words = new Map();
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    for (const raw of fs.readFileSync(f, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const [w, clue] = line.split('|');
      if (!clue) throw new Error(`${f}: нет вопроса: ${line}`);
      const word = w.trim().toUpperCase().replace(/Ё/g, 'Е');
      if (!ALPHA[lang].test(word)) throw new Error(`${f}: недопустимые символы: ${word}`);
      if (word.length < 3 || word.length > 10 || words.has(word)) continue;
      words.set(word, { word, clue: clue.trim() });
    }
  }
  return [...words.values()];
}

function spec(j) {
  const p = j / (COUNT - 1);
  const lerp = (a, b) => a + (b - a) * p;
  return { target: Math.round(lerp(9, 13)), maxW: p < 0.3 ? 9 : 10, maxH: p < 0.3 ? 9 : 10, filler: lerp(0.25, 0), maxLen: p < 0.3 ? 9 : Math.round(lerp(10, 9)) };
}

for (const lang of ['ru', 'en']) {
  const main = load(lang, [`tools/words_${lang}_adult.txt`]);
  const mainSet = new Set(main.map((w) => w.word));
  // трудные слова основной кампании — только как добавка в начале раздела
  const filler = load(lang, [`tools/words_${lang}_3.txt`, `tools/words_${lang}_new_3.txt`]).filter((w) => !mainSet.has(w.word));
  const lastUsed = new Map();
  const uses = new Map();
  const levels = [];
  for (let j = 0; j < COUNT; j++) {
    const sp = spec(j);
    const seed = hashStr(lang + ':adult:' + j);
    let R = seed;
    const rnd = () => ((R = (R * 1664525 + 1013904223) >>> 0) / 4294967296);
    let res = null;
    for (const [gap, cut] of [[12, 0], [8, 0], [5, 0], [5, 1], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5]]) {
      const ok = (w) => w.word.length <= sp.maxLen && (!lastUsed.has(w.word) || j - lastUsed.get(w.word) > gap);
      const sortU = (a) => a.filter(ok).sort((x, y) => (uses.get(x.word) || 0) - (uses.get(y.word) || 0) || rnd() - 0.5);
      const N = sp.target * 16;
      const nf = Math.round(N * sp.filler);
      const m = sortU(main);
      const pool = [...m.slice(0, N - nf).sort(() => rnd() - 0.5)];
      if (nf) pool.push(...sortU(filler).slice(0, nf * 3).sort(() => rnd() - 0.5).slice(0, nf));
      if (pool.length < sp.target) continue;
      res = generate(pool, { target: sp.target - cut, maxW: sp.maxW, maxH: sp.maxH, tries: 80, seed });
      if (res) break;
    }
    if (!res) console.error("DBG", main.length, filler.length, sp);
    if (!res) throw new Error(`${lang}: уровень ${j + 1} не собрался`);
    for (const e of res.entries) {
      lastUsed.set(e.word, j);
      uses.set(e.word, (uses.get(e.word) || 0) + 1);
    }
    levels.push({ w: res.w, h: res.h, e: res.entries.map((e) => [e.x, e.y, e.dir, e.word, e.clue]) });
  }
  const file = `src/data/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.adult = levels;
  fs.writeFileSync(file, JSON.stringify(data));
  const repeats = [...uses.values()].filter((n) => n > 1).length;
  const fromMain = levels.flatMap((l) => l.e).filter((e) => mainSet.has(e[3])).length;
  const total = levels.flatMap((l) => l.e).length;
  console.log(`${lang}: слов в разделе ${main.length}, уровней ${levels.length}, слов в сетках ${total} (из раздела ${fromMain}), повторов слов ${repeats}`);
  console.log('  ', levels.filter((_, i) => i % 5 === 0).map((l) => `${l.w}x${l.h}/${l.e.length}`).join(' '));
}
