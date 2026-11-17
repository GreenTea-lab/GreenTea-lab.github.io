// Генератор кроссворда: слова пересекаются по общим буквам, соседних «лишних» слов не образуется.
// Используется при сборке (уровни кампании) и в игре (кроссворд дня).

export function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffle(a, R) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(R() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// одна попытка раскладки
function attempt(pool, target, maxW, maxH, R) {
  const cells = new Map(); // "x,y" -> { ch, a: bool, d: bool }
  const placed = [];
  let minX = 0,
    maxX = 0,
    minY = 0,
    maxY = 0;
  const key = (x, y) => x + ',' + y;
  const at = (x, y) => cells.get(key(x, y));

  const put = (w, x, y, dir) => {
    const dx = dir === 'a' ? 1 : 0,
      dy = dir === 'a' ? 0 : 1;
    for (let i = 0; i < w.word.length; i++) {
      const k = key(x + dx * i, y + dy * i);
      const c = cells.get(k) || { ch: w.word[i], a: false, d: false };
      c[dir] = true;
      cells.set(k, c);
    }
    if (!placed.length) {
      minX = x;
      minY = y;
      maxX = x + dx * (w.word.length - 1);
      maxY = y + dy * (w.word.length - 1);
    } else {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + dx * (w.word.length - 1));
      maxY = Math.max(maxY, y + dy * (w.word.length - 1));
    }
    placed.push({ ...w, x, y, dir });
  };

  // проверка позиции; возвращает число пересечений или -1
  const check = (word, x, y, dir) => {
    const dx = dir === 'a' ? 1 : 0,
      dy = dir === 'a' ? 0 : 1;
    const L = word.length;
    const ex = x + dx * (L - 1),
      ey = y + dy * (L - 1);
    const nminX = Math.min(minX, x),
      nmaxX = Math.max(maxX, ex),
      nminY = Math.min(minY, y),
      nmaxY = Math.max(maxY, ey);
    if (nmaxX - nminX + 1 > maxW || nmaxY - nminY + 1 > maxH) return -1;
    if (at(x - dx, y - dy) || at(ex + dx, ey + dy)) return -1;
    let cross = 0;
    for (let i = 0; i < L; i++) {
      const cx = x + dx * i,
        cy = y + dy * i;
      const c = at(cx, cy);
      if (c) {
        if (c.ch !== word[i] || c[dir]) return -1;
        cross++;
      } else {
        // у новой клетки не должно быть соседей поперёк направления
        if (at(cx + dy, cy + dx) || at(cx - dy, cy - dx)) return -1;
      }
    }
    if (cross === 0 || cross === L) return -1;
    return cross;
  };

  const list = pool.slice();
  // первым идёт одно из длинных слов
  list.sort((a, b) => b.word.length - a.word.length);
  const firstIdx = Math.floor(R() * Math.min(4, list.length));
  const first = list.splice(firstIdx, 1)[0];
  if (first.word.length > maxW) return null;
  put(first, 0, 0, 'a');
  shuffle(list, R);
  // слова подлиннее пробуем раньше, но с долей случайности
  list.sort((a, b) => b.word.length + R() * 3 - (a.word.length + R() * 3));

  let pass = 0;
  while (placed.length < target && pass < 3) {
    let added = false;
    for (let li = 0; li < list.length && placed.length < target; li++) {
      const w = list[li];
      let best = null;
      for (const [k, c] of cells) {
        const [cx, cy] = k.split(',').map(Number);
        for (let i = 0; i < w.word.length; i++) {
          if (w.word[i] !== c.ch) continue;
          for (const dir of ['a', 'd']) {
            if (c[dir]) continue;
            const x = dir === 'a' ? cx - i : cx;
            const y = dir === 'a' ? cy : cy - i;
            const cr = check(w.word, x, y, dir);
            if (cr < 0) continue;
            // оценка: пересечения и компактность
            const ex = x + (dir === 'a' ? w.word.length - 1 : 0),
              ey = y + (dir === 'd' ? w.word.length - 1 : 0);
            const area = (Math.max(maxX, ex) - Math.min(minX, x) + 1) * (Math.max(maxY, ey) - Math.min(minY, y) + 1);
            const score = cr * 40 - area * 0.6 + R() * 12;
            if (!best || score > best.score) best = { x, y, dir, score };
          }
        }
      }
      if (best) {
        put(w, best.x, best.y, best.dir);
        list.splice(li, 1);
        li--;
        added = true;
      }
    }
    if (!added) break;
    pass++;
  }
  if (placed.length < target) return null;

  // нормализуем координаты и нумеруем
  const W = maxX - minX + 1,
    H = maxY - minY + 1;
  const entries = placed.map((p) => ({ word: p.word, clue: p.clue, x: p.x - minX, y: p.y - minY, dir: p.dir }));
  number(entries);
  let crosses = 0;
  for (const c of cells.values()) if (c.a && c.d) crosses++;
  return { w: W, h: H, entries, crosses, letters: cells.size };
}

// номера как в газетном кроссворде: по порядку начала слов (сверху вниз, слева направо)
export function number(entries) {
  const starts = [...new Set(entries.map((e) => e.y * 100 + e.x))].sort((a, b) => a - b);
  for (const e of entries) e.num = starts.indexOf(e.y * 100 + e.x) + 1;
  entries.sort((a, b) => (a.dir === b.dir ? a.num - b.num : a.dir === 'a' ? -1 : 1));
}

// pool: [{word, clue}], target: сколько слов нужно; возвращает лучшую из попыток
export function generate(pool, { target, maxW, maxH, tries = 60, seed = 1 }) {
  const R = rng(seed);
  let best = null;
  for (let t = 0; t < tries; t++) {
    const res = attempt(pool, target, maxW, maxH, R);
    if (!res) continue;
    // предпочтение — больше пересечений и плотнее сетка
    const q = res.crosses * 3 + (res.letters / (res.w * res.h)) * 20 - Math.abs(res.w - res.h) * 0.4;
    res.q = q;
    if (!best || q > best.q) best = res;
  }
  return best;
}
