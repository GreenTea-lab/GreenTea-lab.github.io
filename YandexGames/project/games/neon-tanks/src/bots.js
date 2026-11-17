// Боты: ведут себя как живые игроки — фармят фигуры, качаются, дерутся, убегают
import { TANKS, STATS } from './data.js';

const SI = Object.fromEntries(STATS.map((s, i) => [s.id, i]));
const TAU = Math.PI * 2;

// порядок прокачки для разных стилей
const BUILDS = {
  bullet: ['reload', 'bdmg', 'pen', 'reload', 'bdmg', 'pen', 'move', 'bspd', 'reload', 'bdmg', 'pen', 'move', 'bspd', 'reload', 'bdmg', 'pen', 'move', 'bspd', 'reload', 'bdmg', 'pen', 'move', 'reload', 'bdmg', 'pen', 'move', 'bspd', 'move', 'bspd', 'move', 'maxhp', 'regen', 'maxhp'],
  tanky: ['regen', 'maxhp', 'body', 'reload', 'maxhp', 'regen', 'body', 'move', 'reload', 'maxhp', 'regen', 'body', 'move', 'reload', 'maxhp', 'regen', 'body', 'move', 'reload', 'maxhp', 'regen', 'body', 'move', 'reload', 'maxhp', 'body', 'move', 'reload', 'move', 'bdmg', 'pen', 'bdmg', 'pen'],
  drone: ['reload', 'pen', 'bdmg', 'bspd', 'reload', 'pen', 'bdmg', 'bspd', 'move', 'reload', 'pen', 'bdmg', 'bspd', 'move', 'reload', 'pen', 'bdmg', 'bspd', 'move', 'reload', 'pen', 'bdmg', 'bspd', 'move', 'reload', 'pen', 'bdmg', 'move', 'move', 'maxhp', 'maxhp', 'regen', 'regen'],
  ram: ['maxhp', 'body', 'move', 'regen', 'maxhp', 'body', 'move', 'regen', 'maxhp', 'body', 'move', 'regen', 'maxhp', 'body', 'move', 'regen', 'maxhp', 'body', 'move', 'regen', 'maxhp', 'body', 'move', 'regen', 'maxhp', 'body', 'move', 'maxhp', 'body', 'move', 'maxhp', 'body', 'move'],
  mixed: ['bdmg', 'reload', 'pen', 'maxhp', 'move', 'regen', 'bdmg', 'reload', 'pen', 'bspd', 'maxhp', 'move', 'bdmg', 'reload', 'pen', 'body', 'regen', 'bdmg', 'reload', 'pen', 'move', 'maxhp', 'bspd', 'bdmg', 'reload', 'pen', 'move', 'body', 'bspd', 'regen', 'maxhp', 'bdmg', 'reload'],
};

// любимые ветки развития
const PATHS = [
  ['twin', 'triple', 'penta'],
  ['twin', 'triple', 'triplet'],
  ['twin', 'triple', 'spread'],
  ['twin', 'quad', 'octo'],
  ['twin', 'twinflank', 'tripletwin'],
  ['sniper', 'assassin', 'ranger'],
  ['sniper', 'assassin', 'stalker'],
  ['sniper', 'overseer', 'overlord'],
  ['sniper', 'overseer', 'necromancer'],
  ['sniper', 'overseer', 'manager'],
  ['sniper', 'hunter', 'predator'],
  ['sniper', 'trapper', 'tritrapper'],
  ['sniper', 'trapper', 'megatrapper'],
  ['machinegun', 'destroyer', 'annihilator'],
  ['machinegun', 'destroyer', 'hybrid'],
  ['machinegun', 'gunner', 'autogunner'],
  ['machinegun', 'gunner', 'streamliner'],
  ['machinegun', 'sprayer'],
  ['flank', 'triangle', 'booster'],
  ['flank', 'triangle', 'fighter'],
  ['flank', 'auto3', 'auto5'],
  ['flank', 'quad', 'octo'],
  ['smasher', 'spike'],
  ['smasher', 'landmine'],
  ['smasher', 'autosmasher'],
];

function styleOf(cls) {
  const c = TANKS[cls];
  if (c.smasher) return 'ram';
  if (c.drones !== undefined || c.necro) return 'drone';
  if (cls.includes('trapper')) return 'trap';
  if (c.fov >= 1.2) return 'sniper';
  return 'gun';
}

export function newBrain(t) {
  const path = PATHS[Math.floor(Math.random() * PATHS.length)];
  const skill = 0.25 + Math.random() * 0.6;
  let build = path[0] === 'smasher' ? 'ram' : path.includes('overseer') ? 'drone' : ['bullet', 'bullet', 'mixed', 'tanky'][Math.floor(Math.random() * 4)];
  if (path[0] === 'sniper' && build === 'tanky') build = 'bullet';
  return {
    path,
    build,
    skill,
    aggr: 0.3 + Math.random() * 0.7,
    hunter: Math.random() < 0.18,
    petty: Math.random() < 0.3,
    think: Math.random() * 0.2,
    target: null,
    shape: null,
    strafe: Math.random() < 0.5 ? 1 : -1,
    strafeT: 0,
    wx: 0,
    wy: 0,
    wanderT: 0,
    aimErr: 0,
    aimErrT: 0,
    mode: 'farm',
    flee: null,
    dodge: 0,
    dodgeX: 0,
    dodgeY: 0,
    turn: 5 + skill * 10,
    upgT: 1 + Math.random() * 3,
  };
}

export function botAlloc(w, t) {
  const order = BUILDS[t.bot.build];
  let guard = 0;
  while (w.freePoints(t) > 0 && guard++ < 40) {
    const tally = new Array(8).fill(0);
    let done = false;
    for (const id of order) {
      const i = SI[id];
      tally[i]++;
      const cap = w.statCap(t, i);
      // смэшер вместо недоступных характеристик качает свои до 10
      if (t.stats[i] < Math.min(cap, cap === 10 ? Math.ceil(tally[i] * 1.43) : tally[i]) && w.upgradeStat(t, i)) {
        done = true;
        break;
      }
    }
    if (!done) {
      let any = false;
      for (let i = 0; i < 8 && !any; i++) any = w.upgradeStat(t, i);
      if (!any) break;
    }
  }
}

export function botPickClass(w, t) {
  const opts = w.classOptions(t);
  if (!opts.length) return false;
  const br = t.bot;
  // путь через таран: ждём 30-го уровня на базовом танке
  if (br.path[0] === 'smasher' && t.cls === 'basic' && t.level < 30) return false;
  let pick = br.path.find((p) => opts.includes(p));
  if (!pick) {
    if (opts.includes('smasher') && opts.length > 1) opts.splice(opts.indexOf('smasher'), 1);
    pick = opts[Math.floor(Math.random() * opts.length)];
  }
  w.upgradeClass(t, pick);
  const st = styleOf(pick);
  if (st === 'ram' && br.build !== 'ram') {
    br.build = 'ram';
    t.stats = t.stats.map((v, i) => Math.min(v, w.statCap(t, i)));
  }
  if (st === 'drone' && br.build === 'tanky') br.build = 'drone';
  w.recalc(t);
  botAlloc(w, t);
  return true;
}

function power(t) {
  return (t.level + 6) * (0.35 + t.hp / t.maxHp) * (TANKS[t.cls].tier * 0.25 + 0.75);
}

function angDiff(a, b) {
  return ((b - a + Math.PI * 3) % TAU) - Math.PI;
}

export function thinkBot(w, t, dt) {
  const br = t.bot;
  const inp = t.input;
  const style = styleOf(t.cls);
  br.think -= dt;
  br.upgT -= dt;
  if (br.upgT <= 0) {
    br.upgT = 1.5 + Math.random() * 3;
    if (w.freePoints(t) > 0) botAlloc(w, t);
    if (w.classOptions(t).length) botPickClass(w, t);
  }
  const view = 980 * t.fov;
  if (br.think <= 0) {
    br.think = 0.15 + (1 - br.skill) * 0.2;
    // кто рядом
    let threat = null, threatD = Infinity, tgt = null, tgtScore = -Infinity;
    let threatSum = 0;
    const myP = power(t);
    for (const o of w.tanks) {
      if (o === t || o.dead || o.team === t.team) continue;
      const d = Math.hypot(o.x - t.x, o.y - t.y);
      if (d > view) continue;
      if (o.alpha < 0.3) continue;
      const op = power(o);
      if (op > myP * 1.15 && d < 750) {
        threatSum += op / myP;
        if (d < threatD) (threatD = d), (threat = o);
      }
      if (o.shield > 0) continue;
      // недавно стрелял в нас — отвечаем
      let revenge = t.lastTankHitter === o && w.t - t.lastHurt < 4;
      // сильный бот обычно не мстит новичку за случайную пулю
      if (revenge && o.isPlayer && o.level < 20 && t.level - o.level > 10 && !br.petty) revenge = false;
      const sc = (myP * (0.6 + br.aggr) - op * 0.9) / 10 - d / 300 + (revenge ? 3 : 0);
      // охотятся не все: остальные дерутся, только если враг рядом или напал первым
      const near = d < 320 + br.aggr * 180 && op < myP * 1.3 && t.level - o.level < 22;
      // новичка-игрока не травят толпой: только если он рядом или напал
      if (o.isPlayer && !revenge && (o.level < 15 || (o.level < 25 && d > 420))) continue;
      const ok = revenge || (br.hunter ? sc > -1.2 : near && sc > -2);
      if (ok && sc > tgtScore) (tgtScore = sc), (tgt = o);
    }
    const boss = w.boss && !w.boss.dead ? w.boss : null;
    if (boss) {
      const d = Math.hypot(boss.x - t.x, boss.y - t.y);
      if (d < 900) {
        threatSum += t.level < 40 ? 2 : 0.8;
        if (d < threatD) (threatD = d), (threat = boss);
      }
    }
    const hpf = t.hp / t.maxHp;
    if (threat && (hpf < 0.4 || threatSum > 1.8 - br.aggr * 0.6)) {
      br.mode = 'flee';
      br.flee = threat;
      // если сильный рядом, всё равно отстреливаемся
      br.target = tgt && Math.hypot(tgt.x - t.x, tgt.y - t.y) < 700 ? tgt : threat;
    } else if (tgt) {
      br.mode = 'fight';
      br.target = tgt;
    } else {
      br.mode = 'farm';
      br.target = null;
    }
    if (br.mode === 'farm' || (br.mode === 'flee' && !br.target)) {
      // ищем лучшую фигуру
      if (!br.shape || br.shape.dead || Math.random() < 0.15) {
        let best = null, bs = 0;
        const R = Math.min(view, 900);
        w.query(t.x, t.y, R, (e) => {
          if (e.kind !== 'shape' || e.dead) return;
          if (e.chase && t.level < 20) return;
          if (e.type === 'alpha' && t.level < 30) return;
          const d = Math.hypot(e.x - t.x, e.y - t.y);
          let v = e.xp / (d + 250);
          if (w.inNest(e.x, e.y) && t.level < 25) v *= 0.35;
          if (v > bs) (bs = v), (best = e);
        });
        br.shape = best;
      }
    }
    // ошибка прицела медленно «плывёт»
    br.aimErrT -= br.think;
    if (br.aimErrT <= 0) {
      br.aimErrT = 0.4 + Math.random() * 0.8;
      br.aimErr = (Math.random() - 0.5) * (1.1 - br.skill) * 0.8;
    }
    // уклонение от пуль
    br.dodge = 0;
    if (br.skill > 0.45) {
      let bx = 0, by = 0, n = 0;
      w.query(t.x, t.y, 320, (e) => {
        if (e.kind !== 'bullet' || e.team === t.team) return;
        const rx = t.x - e.x, ry = t.y - e.y;
        const vv = e.vx * e.vx + e.vy * e.vy;
        const tt = (rx * e.vx + ry * e.vy) / vv;
        if (tt < 0 || tt > 0.8) return;
        const cx = e.x + e.vx * tt - t.x, cy = e.y + e.vy * tt - t.y;
        const miss = Math.hypot(cx, cy);
        if (miss > t.r + e.r + 20) return;
        // уходим перпендикулярно траектории
        bx -= cx || -e.vy;
        by -= cy || e.vx;
        n++;
      });
      if (n && Math.random() < br.skill) {
        const l = Math.hypot(bx, by) || 1;
        br.dodge = 0.35;
        br.dodgeX = bx / l;
        br.dodgeY = by / l;
      }
    }
    br.strafeT -= br.think;
    if (br.strafeT <= 0) {
      br.strafeT = 0.8 + Math.random() * 2.2;
      if (Math.random() < 0.6) br.strafe = -br.strafe;
    }
  }

  // ---- управление каждый шаг ----
  let mx = 0, my = 0;
  let aimX = t.x + Math.cos(t.angle) * 300, aimY = t.y + Math.sin(t.angle) * 300;
  let fire = false;
  const tgt = br.target && !br.target.dead ? br.target : null;
  const aimAt = tgt || (br.shape && !br.shape.dead ? br.shape : null);
  if (aimAt) {
    const d = Math.hypot(aimAt.x - t.x, aimAt.y - t.y);
    const lead = (d / t.bspd) * (0.4 + br.skill * 0.6);
    aimX = aimAt.x + (aimAt.vx || 0) * lead;
    aimY = aimAt.y + (aimAt.vy || 0) * lead;
    const range = style === 'sniper' ? 1150 : style === 'drone' ? 900 : 760;
    fire = d < range;
  }
  // разворот ствола с ограниченной скоростью
  const want = Math.atan2(aimY - t.y, aimX - t.x) + br.aimErr;
  const da = angDiff(t.angle, want);
  const turn = br.turn * dt;
  const ang = t.angle + Math.max(-turn, Math.min(turn, da));
  inp.aim = ang;
  if (Math.abs(da) > 0.5 && style !== 'drone' && style !== 'ram') fire = fire && Math.abs(da) < 0.9;

  if (br.mode === 'flee' && br.flee && !br.flee.dead) {
    const f = br.flee;
    let ax = t.x - f.x, ay = t.y - f.y;
    const l = Math.hypot(ax, ay) || 1;
    mx = ax / l + (-ay / l) * br.strafe * 0.35;
    my = ay / l + (ax / l) * br.strafe * 0.35;
    // треугольник улетает задом наперёд и стреляет вперёд
    if (t.cls === 'triangle' || t.cls === 'booster' || t.cls === 'fighter') {
      inp.aim = Math.atan2(f.y - t.y, f.x - t.x);
      fire = true;
    }
  } else if (tgt) {
    const dx = tgt.x - t.x, dy = tgt.y - t.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    let pref = style === 'sniper' ? 720 : style === 'drone' ? 560 : style === 'trap' ? 480 : style === 'ram' ? 0 : 430;
    if (t.cls === 'destroyer' || t.cls === 'annihilator') pref = 380;
    if (style === 'ram') {
      mx = ux;
      my = uy;
    } else {
      const rad = d > pref + 80 ? 1 : d < pref - 80 ? -1 : 0;
      mx = ux * rad + -uy * br.strafe * 0.8;
      my = uy * rad + ux * br.strafe * 0.8;
    }
  } else if (br.shape && !br.shape.dead) {
    const s = br.shape;
    const dx = s.x - t.x, dy = s.y - t.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    const pref = style === 'ram' ? 0 : style === 'drone' ? 300 : 230;
    const rad = d > pref + 50 ? 1 : d < pref - 50 ? -0.6 : 0;
    mx = ux * rad - uy * br.strafe * 0.25;
    my = uy * rad + ux * br.strafe * 0.25;
    if (style === 'ram') fire = false;
  } else {
    // бродим
    br.wanderT -= dt;
    if (br.wanderT <= 0 || Math.hypot(br.wx - t.x, br.wy - t.y) < 150) {
      br.wanderT = 4 + Math.random() * 6;
      const h = w.half * 0.8;
      br.wx = (Math.random() * 2 - 1) * h;
      br.wy = (Math.random() * 2 - 1) * h;
      if (t.level >= 30 && Math.random() < 0.5) (br.wx *= 0.15), (br.wy *= 0.15);
    }
    const dx = br.wx - t.x, dy = br.wy - t.y;
    const d = Math.hypot(dx, dy) || 1;
    mx = (dx / d) * 0.8;
    my = (dy / d) * 0.8;
  }
  if (br.dodge > 0) {
    br.dodge -= dt;
    mx = mx * 0.4 + br.dodgeX;
    my = my * 0.4 + br.dodgeY;
  }
  // от стен
  const edge = w.half - 260;
  if (t.x < -edge) mx += 1;
  if (t.x > edge) mx -= 1;
  if (t.y < -edge) my += 1;
  if (t.y > edge) my -= 1;
  // в чужую базу не лезем
  for (const b of w.bases) {
    if (b.team === t.team) continue;
    const cx = (b.x0 + b.x1) / 2;
    if (Math.abs(t.x - cx) < w.baseW / 2 + 260) mx += Math.sign(t.x - cx) * 1.5;
  }
  inp.mx = mx;
  inp.my = my;
  inp.ax = aimX;
  inp.ay = aimY;
  // дронами управляем курсором-целью
  if (style === 'drone') {
    inp.fire = !!aimAt;
    if (br.mode === 'flee' && br.flee) {
      inp.ax = br.flee.x;
      inp.ay = br.flee.y;
      inp.fire = true;
    }
  } else inp.fire = fire;
}
