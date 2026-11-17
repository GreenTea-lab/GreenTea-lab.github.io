// Бот: жадно перебирает выстрелы и проверяет, что уровень проходим заданным запасом снарядов
import { initPhysics, Phys, solveLaunch, DT, FROM } from '../src/physics.js';
import { LEVELS, buildLevel } from '../src/levels.js';
await initPhysics();
const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
const K = +(process.argv[3] || 28);

function fire(P, type, target, arc, noise = 0, rnd = Math.random, sf = 0.55) {
  if (noise) target = [target[0] + (rnd() - 0.5) * 2 * noise, target[1] + (rnd() - 0.5) * 2 * noise, target[2] + (rnd() - 0.5) * noise];
  const s = solveLaunch(FROM, target, arc);
  if (!s) return false;
  P.damageOn = true;
  let projs = [P.addProjectile(type, FROM, s.vel)];
  let calm = 0, t = 0;
  while (t < 9) {
    if (type === 'split' && !projs[0].spent && t > s.T * sf) P.splitProj(projs[0]);
    P.step(); t += DT;
    if (t > 1 && P.activity() < 0.25) calm += DT; else calm = 0;
    if (calm > 0.6) break;
  }
  // снаряды, которые лежат, убираем
  for (const o of [...P.objs.values()]) if (o.kind === 'proj') P.remove(o);
  P.events = [];
  return t;
}

function candidates(P, ammo, rnd) {
  const out = [];
  const types = Object.keys(ammo).filter(k => ammo[k] > 0);
  const tg = [];
  for (const o of P.objs.values()) {
    const p = o.body.translation();
    if (o.kind === 'enemy') { tg.push([p.x, p.y, p.z], [p.x, p.y - 0.3, p.z - 0.4]); }
    if (o.kind === 'block' && o.mat === 'tnt') tg.push([p.x, p.y, p.z], [p.x, p.y, p.z]);
  }
  const blocks = [...P.objs.values()].filter(o => o.kind === 'block');
  for (let i = 0; i < 6 && blocks.length; i++) { const p = blocks[Math.floor(rnd() * blocks.length)].body.translation(); tg.push([p.x, p.y, p.z]); }
  for (const t of tg) for (const arc of ['low', 'high']) for (const ty of types) out.push({ t, arc, ty, sf: rnd() < 0.5 ? 0.3 : 0.5 });
  // перемешать и ограничить
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out.slice(0, K);
}

export function solve(i, seed = 1, noise = 0) {
  let r = seed * 9973;
  const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
  const lv = buildLevel(i);
  let P = new Phys(); P.load(lv);
  for (let k = 0; k < 150; k++) P.step();
  const ammo = { ...lv.ammo };
  const total = Object.values(ammo).reduce((a, b) => a + b, 0);
  const plan = [];
  let tsum = 0;
  for (let shot = 0; shot < total; shot++) {
    const S = P.snapshot();
    let best = null;
    for (const c of candidates(P, ammo, rnd)) {
      const Q = Phys.restore(S);
      const before = Q.enemiesLeft();
      const t = fire(Q, c.ty, c.t, c.arc, 0, rnd, c.sf);
      if (t === false) { Q.free(); continue; }
      const val = (before - Q.enemiesLeft()) * 10 + Q.score / 2000 - (c.ty === 'stone' ? 0 : 0.6) + rnd() * 0.01;
      const win = Q.enemiesLeft() === 0;
      if (!best || val + (win ? 100 : 0) > best.val) best = { ...c, val: val + (win ? 100 : 0), win, dur: t };
      Q.free();
    }
    if (!best) break;
    tsum += fire(P, best.ty, best.t, best.arc, noise, rnd, best.sf);
    ammo[best.ty]--;
    plan.push(`${best.ty}/${best.arc}`);
    if (P.enemiesLeft() === 0) return { shots: shot + 1, total, plan, t: tsum, bodies: lv.blocks.length };
  }
  return { shots: null, total, left: P.enemiesLeft(), plan, bodies: lv.blocks.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (let i = 0; i < LEVELS.length; i++) {
    if (only && !only.includes(i + 1)) continue;
    const t0 = Date.now();
    const res = [1, 2].map(sd => solve(i, sd));
    const noisy = [3, 4, 5].map(sd => solve(i, sd, 0.45));
    const best = res.filter(x => x.shots).sort((a, b) => a.shots - b.shots)[0];
    const tag = !best ? 'FAIL' : best.shots >= best.total ? 'TIGHT' : 'ok';
    const out = { L: i + 1, ammo: res[0].total, precise: res.map(x => x.shots ?? ('x' + x.left)), noisy: noisy.map(x => x.shots ?? ('x' + x.left)), plan: best ? best.plan.join(' ') : '' };
    console.log(`${tag.padEnd(5)} L${i + 1} ammo ${out.ammo} bot ${out.precise.join('/')} noisy ${out.noisy.join('/')} ${out.plan} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
}
