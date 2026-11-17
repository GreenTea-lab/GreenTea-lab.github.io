// Партии через Match с фальшивой сценой (мгновенные анимации): ввод игрока случайный, отмена и подсказка
import { Match } from '../src/match.js';
import { absOf } from '../src/rules.js';
const fake = {
  anims: [], stacks: {},
  layout() {}, hideDice() {}, highlight() {}, showTrail() {}, setDiceUsed() {}, placeDice() {},
  throwDice(v, side, cb) { cb && cb(); },
  move(a, b, cb) { cb && cb(); },
  locOf(mode, p, t) { return t === -1 ? 'bar' + p : t >= 24 ? 'off' + p : 'a' + absOf(mode, p, t); },
};
const [mode = 'long', games = '20', lvl = '1'] = process.argv.slice(2);
let res = { w: 0, l: 0, undo: 0, hint: 0, nomove: 0 };
for (let g = 0; g < +games; g++) {
  let ended = null;
  const settings = { autoroll: false, confirm: g % 2 === 1 };
  const m = new Match(fake, { status() {}, phase(p) { if (p === 'noMove') res.nomove++; }, hud() {}, end(r) { ended = r; }, sound() {}, save() {}, settings: () => settings });
  m.start({ mode, level: +lvl });
  let guard = 0;
  while (!ended && guard++ < 200000) {
    if (m.timers.length) { m.update(5); continue; }
    if (m.phase === 'opening' || m.phase === 'roll') { m.roll(); continue; }
    if (m.phase === 'confirm') { if (Math.random() < 0.3) { m.undo(); res.undo++; } else m.confirm(); continue; }
    if (m.phase === 'move') {
      if (Math.random() < 0.05 && m.hints > 0) { m.hint(); res.hint++; const t = m.hinted; m.moveTo(t); continue; }
      if (m.canUndo() && Math.random() < 0.05) { m.undo(); res.undo++; continue; }
      const src = [...m.movable][Math.floor(Math.random() * m.movable.size)];
      m.tap(src);
      const tg = [...m.targets.keys()];
      if (!tg.length) throw new Error('no targets for ' + src);
      m.tap(tg[Math.floor(Math.random() * tg.length)]);
      continue;
    }
    throw new Error('stuck phase ' + m.phase);
  }
  if (!ended) throw new Error('no end');
  ended.winner === 0 ? res.w++ : res.l++;
}
console.log(mode, 'L' + lvl, JSON.stringify(res));
