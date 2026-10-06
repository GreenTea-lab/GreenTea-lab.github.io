// Общие сцены для промо: поставить героя в нужное место уровня, заморозить физику, настроить камеру.
// pose выполняется в браузере: page.evaluate(pose, opts)
export const SAVE = { max: 40, last: 12, coins: 3480, stars: Object.fromEntries(Array.from({ length: 27 }, (_, i) => [i + 1, 1 + ((i * 7) % 3)])), skins: ['red', 'blue', 'cat', 'pink', 'ninja', 'king'], skin: 'red', tut: { cp: 1, bounce: 1, moving: 1, fade: 1, sweeper: 1, disc: 1, lift: 1, pillars: 1 }, gift: { last: 1e9, streak: 1 } };
export const saveJS = (o = {}) => `localStorage.setItem('sky_parkour_save_v1', ${JSON.stringify(JSON.stringify({ ...SAVE, ...o }))});`;

export function pose(o) {
  const g = window.__game;
  g.closeModal(true);
  if (o.skin) g.world.setSkin(o.skinObj || g.world._skins?.[o.skin] || { id: o.skin });
  g.startLevel(o.L);
  document.querySelectorAll('.banner').forEach((b) => b.remove());
  g.hintQ = [];
  g.hintT = 0;
  g.hinted = new Set(['bounce', 'moving', 'fade', 'sweeper', 'disc', 'lift', 'pillars']);
  g.el.hint.classList.add('hidden');
  document.getElementById('toasts').style.display = 'none';
  const lv = g.lv;
  let i = o.seg ? lv.plats.findIndex((p, k) => p.seg === o.seg && k > (o.after || 0)) : o.i || 0;
  i = Math.max(0, Math.min(lv.plats.length - 2, i + (o.di || 0)));
  const a = lv.plats[i],
    b = lv.plats[i + 1];
  const P = g.P;
  const f = o.f ?? 0;
  const dx = b.cx - a.cx,
    dz = b.cz - a.cz,
    dl = Math.hypot(dx, dz) || 1;
  const base = Math.atan2(dx, dz);
  P.yaw = base + (o.turn || 0);
  P.x = a.cx + dx * f + (o.ox || 0);
  P.z = a.cz + dz * f + (o.oz || 0);
  const sp = o.run ?? 1;
  P.vx = (dx / dl) * 6.6 * sp;
  P.vz = (dz / dl) * 6.6 * sp;
  if (o.air) {
    P.y = Math.max(a.cy, b.cy) + o.air;
    P.vy = o.vy ?? 3;
    P.ground = null;
  } else {
    P.y = a.cy;
    P.vy = 0;
    P.ground = a;
  }
  for (let k = 0; k < i; k++) if (lv.plats[k].cp) P.cp = k;
  g.maxId = i;
  g.time = o.time ?? 14.3;
  g.started = true;
  g.state = 'promo';
  g.input.enabled = false;
  g.view = { yaw: base + (o.cy || 0), pitch: o.pitch ?? 0.38, snap: true };
  g.world.cam.dist = (innerWidth / innerHeight < 0.8 ? 8.2 : 7) * (o.zoom || 1);
  if (o.fov) {
    g.world.camera.fov = o.fov;
    g.world.camera.updateProjectionMatrix();
  }
  if (o.coins !== undefined) g.s.coins = o.coins;
  g.hud(true);
  if (o.noHud) document.getElementById('hud').style.display = 'none';
  if (o.joy) {
    const j = g.input.base;
    j.classList.remove('hidden');
    j.style.left = '96px';
    j.style.top = innerHeight - 150 + 'px';
    j.firstChild.style.transform = 'translate(6px,-34px)';
    document.body.classList.add('touch');
  }
  if (o.jumpDown) g.ui.querySelector('.jumpb').classList.add('down');
  if (o.hint) {
    g.el.hint.textContent = o.hint;
    g.el.hint.classList.remove('hidden', 'out');
  }
  // герой не двигается, но анимация бега/прыжка идёт
  const P0 = { x: P.x, y: P.y, z: P.z };
  g.update = ((up) =>
    function (dt) {
      up.call(this, dt);
      Object.assign(P, P0);
    })(g.constructor.prototype.update);
  return [i, lv.plats.length];
}
