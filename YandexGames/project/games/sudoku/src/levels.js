// Уровни сложности, сады пути и план 1000 уровней (общий для игры и генератора головоломок)

// классика 9×9: уровень приёмов (1 — одиночки, 2 — пересечения и пары, 3 — тройки и крестокрыл, 4 — XY-крыло, рыба-меч)
export const TIERS = [
  { id: 'beginner', color: '#e08aa3', coins: 10, points: 60, spec: { givens: [40, 45], level: [1, 1] } },
  { id: 'easy', color: '#d97893', coins: 12, points: 100, spec: { givens: [34, 38], level: [1, 1] } },
  { id: 'medium', color: '#3f9b8a', coins: 18, points: 180, spec: { givens: [27, 31], level: [1, 1] } },
  { id: 'hard', color: '#cf6a33', coins: 25, points: 300, spec: { givens: [24, 29], level: [2, 2], test: (r) => r.score < 90 } },
  { id: 'expert', color: '#5b84c8', coins: 35, points: 450, spec: { givens: [22, 27], level: [2, 3], test: (r) => r.level === 3 || r.score >= 90 } },
  { id: 'master', color: '#8a62c4', coins: 50, points: 650, spec: { givens: [21, 27], level: [4, 4] } },
];
// диагональное: на диагоналях цифры тоже не повторяются
export const DTIERS = [
  { id: 'easy', color: '#d97893', coins: 14, points: 140, spec: { givens: [32, 36], level: [1, 1] } },
  { id: 'medium', color: '#3f9b8a', coins: 20, points: 220, spec: { givens: [25, 30], level: [1, 1] } },
  { id: 'hard', color: '#cf6a33', coins: 28, points: 340, spec: { givens: [22, 28], level: [2, 2] } },
  { id: 'expert', color: '#5b84c8', coins: 40, points: 500, spec: { givens: [20, 27], level: [3, 4] } },
];
// мини 6×6
export const MTIERS = [
  { id: 'easy', color: '#d97893', coins: 6, points: 40, spec: { givens: [15, 17], level: [1, 1] } },
  { id: 'medium', color: '#3f9b8a', coins: 8, points: 60, spec: { givens: [11, 13], level: [1, 1] } },
];
export const tiersOf = (kind) => (kind === 'diag' ? DTIERS : kind === 'mini' ? MTIERS : TIERS);

export const GARDENS = 20;
export const PER_GARDEN = 50;

// сады пути: ключ (для текста и иконки), цвет
export const GARDEN_LIST = [
  { id: 'spring', color: '#d97893', icon: 'blossom' },
  { id: 'bamboo', color: '#4f9a5c', icon: 'bamboo' },
  { id: 'stones', color: '#8d8a9e', icon: 'stones' },
  { id: 'koi', color: '#3c7fc0', icon: 'koi' },
  { id: 'tea', color: '#6f9a3a', icon: 'tea' },
  { id: 'iris', color: '#7a5bc4', icon: 'iris' },
  { id: 'wisteria', color: '#9a7ad6', icon: 'wisteria' },
  { id: 'lotus', color: '#e07aa0', icon: 'lotus' },
  { id: 'waterfall', color: '#2f9aa0', icon: 'waterfall' },
  { id: 'temple', color: '#c7432f', icon: 'torii' },
  { id: 'maple', color: '#d9612f', icon: 'maple' },
  { id: 'chrys', color: '#d6a12a', icon: 'chrys' },
  { id: 'moon', color: '#5560b0', icon: 'moon' },
  { id: 'pines', color: '#2f7a5a', icon: 'pine' },
  { id: 'lanterns', color: '#e0802f', icon: 'lantern' },
  { id: 'winter', color: '#5b84c8', icon: 'snow' },
  { id: 'camellia', color: '#c8394f', icon: 'camellia' },
  { id: 'plum', color: '#b04f8f', icon: 'plum' },
  { id: 'peak', color: '#4c8fc7', icon: 'mountain' },
  { id: 'master', color: '#c9962c', icon: 'enso' },
];

// «пила» сложности: средняя сложность сада растёт, внутри сада — от лёгкого к трудному
const BASE = [0.15, 0.7, 1.1, 1.5, 1.85, 2.15, 2.45, 2.7, 2.95, 3.15, 3.35, 3.55, 3.7, 3.85, 4.0, 4.15, 4.3, 4.45, 4.6, 4.8];

// план пути: [{ g, k, kind, tier }]
export function pathPlan() {
  const out = [];
  for (let g = 0; g < GARDENS; g++)
    for (let k = 0; k < PER_GARDEN; k++) {
      let d = BASE[g] - 0.65 + 1.3 * (k / (PER_GARDEN - 1));
      if (k === PER_GARDEN - 1) d += 0.35; // финал сада
      if (k % 7 === 3) d -= 0.5; // передышки
      let tier = Math.max(0, Math.min(5, Math.round(d)));
      let kind = 'classic';
      if (g === 0 && k === 0) tier = 0; // первый уровень — обучение
      if (k % 10 === 9 && g >= 1) {
        kind = 'diag';
        tier = Math.max(0, Math.min(3, Math.round(d * 0.75 - 0.4)));
      } else if (g <= 1 && k % 10 === 4) {
        kind = 'mini';
        tier = g;
      }
      out.push({ g, k, kind, tier });
    }
  return out;
}
