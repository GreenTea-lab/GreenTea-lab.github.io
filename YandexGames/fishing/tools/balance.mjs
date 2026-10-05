// Баланс: симуляция вываживания «разумным игроком» и доход в минуту. node tools/balance.mjs
import { SPECIES, LOCATIONS, rollFish, fightRatio, fightStep, fishPrice, GEAR } from '../src/data.js';
const dt = 1 / 60;
function fight(id, w, gl, pow = 1) {
  const g = { rod: gl, reel: gl, line: gl };
  const F = { p: 0, T: 0, ratio: fightRatio(id, w, gl, pow), rush: 0, warn: 0, next: 1.2 + Math.random() * 1.2, side: 1 };
  let hold = true, react = 0, t = 0;
  while (t < 90) {
    t += dt;
    // реакция игрока с задержкой 0,25 с
    const want = F.T > 0.72 || F.warn > 0 || F.rush > 0 ? false : F.T < 0.35 ? true : hold;
    if (want !== hold) { react += dt; if (react > 0.25) { hold = want; react = 0; } } else react = 0;
    fightStep(F, hold, dt, g);
    if (F.T >= 1) return [false, t];
    if (F.p >= 1) return [true, t];
  }
  return [false, t];
}
for (const [li, L] of LOCATIONS.entries()) {
  for (const gl of [li, li + 1].filter((x) => x <= 5)) {
    const row = [];
    for (const id of L.fish) {
      let win = 0, tt = 0, n = 300;
      for (let i = 0; i < n; i++) {
        const f = rollFish({ loc: L, bait: 'worm', part: 'day', weather: 'sun', d: 0.6, bubbles: false, luck: false, fishDay: null });
        const S = SPECIES[id];
        const w = S.w[0] + (S.w[1] - S.w[0]) * Math.pow(Math.random(), 1.8);
        const [ok, t] = fight(id, w, gl, L.pow);
        if (ok) { win++; tt += t; }
      }
      row.push(`${id} ${Math.round((100 * win) / n)}% ${(tt / Math.max(1, win)).toFixed(1)}с`);
    }
    console.log(L.id + ' снасти ' + gl + ': ' + row.join(' | '));
  }
}
// доход в минуту на пруду и реке с базовыми снастями
for (const [li, gl] of [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]) {
  const L = LOCATIONS[li];
  let coins = 0, time = 0, n = 2000;
  for (let i = 0; i < n; i++) {
    const f = rollFish({ loc: L, bait: 'worm', part: 'day', weather: 'cloud', d: 0.7, bubbles: false, luck: false, fishDay: null });
    const [ok, t] = fight(f.id, f.w, gl, L.pow);
    time += 0.8 + 5.25 * 0.85 + 0.6 + t + 2.5;
    if (ok) coins += fishPrice(f.id, f.w, L);
  }
  console.log(`${L.id} снасти ${gl}: ${(coins / (time / 60)).toFixed(0)} монет/мин`);
}
