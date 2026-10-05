// Общая сцена для промо: поля в разных стадиях, трактор в нужном месте. Выполняется в странице.
export const FARM = () => {
  window.__promoFarm = (opt = {}) => {
    const g = window.__game;
    const now = Date.now();
    g.s.tutDone = true;
    g.closeModal(true);
    document.getElementById('toast').innerHTML = '';
    const set = (i, crop, stage, k = 1, part = 0) => {
      const f = g.fields[i];
      f.setOwned(true);
      f.setCrop(crop);
      f.stage = stage;
      f.cells.fill(0);
      f.doneN = 0;
      if (stage === 2) {
        f.dur = 60000;
        f.t0 = now - f.dur * k;
      }
      // часть клеток уже обработана: полосы вдоль поля
      if (part) for (let i2 = 0; i2 < f.cells.length; i2++) if (Math.floor(i2 / 40) < 28 * part) ((f.cells[i2] = 1), f.doneN++);
      f.paintAll();
      f.updatePlants(true, now);
    };
    set(0, 'sunflower', 3, 1, opt.harvest0 ?? 0.35);
    set(1, 'wheat', 3, 1, 0);
    set(2, 'corn', 2, 0.75);
    set(3, 'pumpkin', 3, 1, 0);
    set(4, 'carrot', 1, 1, opt.sow4 ?? 0.4);
    set(5, 'wheat', opt.wild5 ?? 0, 1, opt.plow5 ?? 0.45);
    g.s.coins = opt.coins ?? 2460;
    g.s.lvl = opt.lvl ?? 9;
    g.s.xp = Math.round((opt.xp ?? 0.6) * 50 * Math.pow(g.s.lvl, 1.6));
    if (opt.tr) {
      g.s.tr = opt.tr;
      g.applyStats();
    }
    g.world.time = opt.time ?? 480 * 0.3;
    g.updateHud();
  };
  window.__place = (x, z, h, tool, load = 0) => {
    const g = window.__game,
      tr = g.tractor;
    tr.x = x;
    tr.z = z;
    tr.h = h;
    tr.v = 0;
    tr._tc = null;
    if (tool) tr.setTool(tool, true);
    g.s.load = load ? { [g.fields[0].crop]: load } : {};
    tr.load = load;
    tr.setLoadColor(g.fields[0].crop);
    g.focus.set(x, 0, z);
    g.snapCam = true;
  };
};
