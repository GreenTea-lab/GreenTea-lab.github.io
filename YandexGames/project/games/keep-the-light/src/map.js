// План дома: комнаты прямоугольниками, двери, сетка 1×1 м.
// С каждой ночью открываются новые крылья (до этого двери заколочены).
export const W = 42,
  H = 21;

// type — вид комнаты (обои, пол, мебель), night — с какой ночи доступна
export const ROOMS = [
  { id: 'hall', type: 'hall', x: 1, y: 8, w: 40, h: 2, night: 1 },
  { id: 'foyer', type: 'foyer', x: 19, y: 11, w: 4, h: 9, night: 1 },
  { id: 'living', type: 'living', x: 10, y: 11, w: 8, h: 9, night: 1 },
  { id: 'bath', type: 'bath', x: 1, y: 17, w: 8, h: 3, night: 1 },
  { id: 'dining', type: 'dining', x: 24, y: 11, w: 6, h: 9, night: 1 },
  { id: 'kitchen', type: 'kitchen', x: 31, y: 11, w: 5, h: 9, night: 1 },
  { id: 'bed1', type: 'bedroom', x: 1, y: 11, w: 8, h: 5, night: 2 },
  { id: 'bed2', type: 'bedroom2', x: 37, y: 11, w: 4, h: 9, night: 2 },
  { id: 'library', type: 'library', x: 1, y: 1, w: 10, h: 6, night: 3 },
  { id: 'study', type: 'study', x: 12, y: 1, w: 7, h: 6, night: 3 },
  { id: 'kids', type: 'kids', x: 20, y: 1, w: 8, h: 6, night: 4 },
  { id: 'pantry', type: 'pantry', x: 29, y: 1, w: 4, h: 6, night: 4 },
  { id: 'cellar', type: 'cellar', x: 34, y: 1, w: 7, h: 6, night: 5 },
];

// двери: клетка в стене между двумя комнатами
export const DOORS = [
  { x: 14, y: 10 }, // гостиная
  { x: 20, y: 10, arch: true }, // арка прихожей
  { x: 21, y: 10, arch: true },
  { x: 18, y: 15 }, // гостиная ↔ прихожая
  { x: 9, y: 18 }, // гостиная ↔ ванная
  { x: 27, y: 10 }, // столовая
  { x: 23, y: 15 }, // столовая ↔ прихожая
  { x: 30, y: 13 }, // столовая ↔ кухня
  { x: 33, y: 10 }, // кухня
  { x: 5, y: 10 }, // спальня 1
  { x: 39, y: 10 }, // спальня 2
  { x: 5, y: 7 }, // библиотека
  { x: 11, y: 3 }, // библиотека ↔ кабинет
  { x: 15, y: 7 }, // кабинет
  { x: 23, y: 7 }, // детская
  { x: 30, y: 7 }, // кладовая
  { x: 33, y: 4 }, // кладовая ↔ подвал
];

// парадная дверь (выход) — двойная, в нижней стене прихожей
export const EXIT = { x: 20, y: 20, w: 2 };
export const START = { x: 21, z: 17.2, yaw: 0 }; // yaw 0 — смотрим на север (−z)

// клетки: 0 стена, 1 пол, 2 дверь, 3 выход
export function buildGrid(night) {
  const g = new Uint8Array(W * H);
  const room = new Int8Array(W * H).fill(-1);
  ROOMS.forEach((r, i) => {
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      g[y * W + x] = 1;
      room[y * W + x] = i;
    }
  });
  const doors = DOORS.map((d) => {
    // комнаты по обе стороны
    const vert = g[d.y * W + d.x - 1] === 0 && g[d.y * W + d.x + 1] === 0; // стены слева/справа → проход по z
    const a = vert ? room[(d.y - 1) * W + d.x] : room[d.y * W + d.x - 1];
    const b = vert ? room[(d.y + 1) * W + d.x] : room[d.y * W + d.x + 1];
    const need = Math.max(ROOMS[a] ? ROOMS[a].night : 1, ROOMS[b] ? ROOMS[b].night : 1);
    return { ...d, vert, a, b, need, boarded: need > night };
  });
  for (const d of doors) g[d.y * W + d.x] = 2;
  for (let i = 0; i < EXIT.w; i++) g[EXIT.y * W + EXIT.x + i] = 3;
  const open = ROOMS.map((r) => r.night <= night);
  return { g, room, doors, open };
}

export const cell = (x, y) => y * W + x;
export const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
