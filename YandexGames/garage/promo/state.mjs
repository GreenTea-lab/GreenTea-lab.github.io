// Сцены для промо: машина в гараже в нужном состоянии, вторая машина рядом, камера, интерфейс.
// stage выполняется в браузере: page.evaluate(stage, opts)
export const SAVE = { money: 1846500, lvl: 12, xp: 120, sold: 41, profit: 6420000, best: 612000, up: { tools: 3, booth: 3, scanner: 1, washer: 1, contacts: 2, adverts: 2, tuning: 1 }, tut: { welcome: 1, step: 6, firstCar: 1 }, gift: { last: 1e9, streak: 3 } };
export const saveJS = (o = {}) => `localStorage.setItem('garage_flipper_save_v1', ${JSON.stringify(JSON.stringify({ ...SAVE, ...o }))});`;

export function stage(o) {
  const g = window.__game;
  const { CarView, genCar, rng } = window.__GF;
  g.closeModal(true);
  const mk = (c) => {
    const d = genCar(rng(c.seed || 5), c.model, c.tier ?? 0);
    if (c.wreck) {
      for (const k in d.panels) Object.assign(d.panels[k], { rust: Math.max(d.panels[k].rust, c.wreck * (k.startsWith('quarter') || k.startsWith('fender') || k.startsWith('door') || k.startsWith('bumper') ? 0.9 : 0.4)), fade: 0.45, primer: 0 });
      d.dirt = 1;
      d.panels.doorR.dent = 0.8;
    }
    if (c.fresh) {
      for (const k in d.panels) Object.assign(d.panels[k], { rust: 0, dent: 0, fade: 0, primer: 0 });
      for (const k in d.sys) d.sys[k] = 1;
      d.dirt = 0;
    }
    if (c.color !== undefined) d.color = c.color;
    if (c.metallic !== undefined) d.metallic = c.metallic;
    Object.assign(d.look, c.look || {});
    Object.assign(d.tuned, c.tuned || {});
    if (c.dirt !== undefined) d.dirt = c.dirt;
    if (c.primer) for (const k of c.primer) Object.assign(d.panels[k], { rust: 0, dent: 0, primer: 1 });
    d.bought = c.bought ?? 31000;
    d.spent = c.spent ?? 0;
    return d;
  };
  const d = mk(o.car);
  if (o.ui) {
    g.s.car = d;
    g._loadCar();
    g.tab = o.tab || 'garage';
    g.setTool(o.tool || 'info');
    g.setTab(g.tab);
  } else {
    g.s.car = null;
    if (g.view) g.view.dispose();
    g.view = new CarView(d);
    g.g.setCar(g.view.car);
    document.getElementById('ui').style.display = 'none';
    document.getElementById('panel').style.display = 'none';
    g.g.camera.clearViewOffset();
  }
  g.ui.querySelector('.hint').classList.add('hidden');
  document.getElementById('toasts').style.display = 'none';
  // вторая машина рядом
  if (g._second) {
    g.g.scene.remove(g._second.car.root);
    g._second = null;
  }
  if (o.second) {
    const v2 = new CarView(mk(o.second));
    v2.car.root.position.set(o.second.x || 0, 0, o.second.z || 0);
    v2.car.root.rotation.y = o.second.ry || 0;
    g.g.scene.add(v2.car.root);
    g._second = v2;
  }
  if (o.carPos) {
    g.view.car.root.position.x = o.carPos[0];
    g.view.car.root.position.z = o.carPos[1];
    g.view.car.root.rotation.y = o.carPos[2] || 0;
  }
  if (o.lift !== undefined) {
    g.g.setLift(o.lift);
    g.g.liftH = o.lift;
  }
  if (o.hood && g.view.car.hoodPivot) g.view.car.hoodPivot.rotation.z = o.hood;
  const v = g.g.view;
  Object.assign(v, o.view, { auto: false });
  for (const k of ['yaw', 'pitch', 'dist']) if (o.view && o.view[k] !== undefined) v['t' + k] = o.view[k];
  if (o.view && o.view.tx !== undefined) v.tx = o.view.tx;
  g.g._idle = -1e9;
  if (o.fov) {
    g.g.camera.fov = o.fov;
    g.g.camera.updateProjectionMatrix();
  }
  return true;
}
