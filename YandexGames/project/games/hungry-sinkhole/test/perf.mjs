// Профиль кадров: телефонный экран, троттлинг CPU, раскладка времени по шагам, пики
import { run, done } from './shot.mjs';
const [, , map = 'town', secs = '40', thr = '4', q = 'mid'] = process.argv;
const errs = await run({ w: 390, h: 844, mobile: true, debug: { seed: 5, auto: true, quality: q }, steps: async (page) => {
  const cdp = await page.context().newCDPSession(page);
  await page.evaluate((m) => { const s = window.__save.data; s.map = m; s.mode = 'battle'; s.level = 20; window.__game.play(); window.__game.manual = true; }, map);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: +thr });
  const res = await page.evaluate(async (N) => {
    const g = window.__game, sim = g.sim, v = g.view;
    const T = { step: 0, act: 0, frame: 0, render: 0, ui: 0 };
    const wrap = (o, k, key) => { const f = o[k].bind(o); o[k] = (...a) => { const t = performance.now(); const r = f(...a); T[key] += performance.now() - t; return r; }; };
    wrap(sim, 'step', 'step'); wrap(sim, 'activateGroup', 'act'); wrap(v, 'frame', 'frame'); { const r0 = v.render.bind(v); let c = 0; v.render = () => { if (c++ % 30 === 0) { const t = performance.now(); r0(); T.render += performance.now() - t; } }; } wrap(g.ui, 'frame', 'ui');
    const frames = [];
    const progs0 = v.renderer.info.programs.length;
    for (let i = 0; i < N; i++) {
      for (const k in T) T[k] = 0;
      const t0 = performance.now();
      g.update(1 / 60);
      const rt = T.render;
      const gl = v.renderer.getContext(); gl.finish && 0;
      const dt = performance.now() - t0 - rt;
      frames.push({ i, dt, ...T, act: T.act, pools: v.pools.size, progs: v.renderer.info.programs.length, active: sim.active.size, calls: v.renderer.info.render.calls });
      if (i % 30 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    const s = frames.map((f) => f.dt).sort((a, b) => a - b);
    const pct = (p) => s[Math.floor(p * (s.length - 1))].toFixed(1);
    const spikes = frames.filter((f) => f.dt > Math.max(3 * +pct(0.5), 25)).slice(0, 25).map((f) => `#${f.i} ${f.dt.toFixed(0)}ms step ${f.step.toFixed(0)} act ${f.act.toFixed(0)} frame ${f.frame.toFixed(0)} render ${f.render.toFixed(0)} ui ${f.ui.toFixed(0)} pools ${f.pools} progs ${f.progs} active ${f.active}`);
    const avg = (k) => (frames.reduce((a, f) => a + f[k], 0) / frames.length).toFixed(2);
    return { p50: pct(0.5), p90: pct(0.9), p99: pct(0.99), max: pct(1), avg: { step: avg('step'), frame: avg('frame'), render: avg('render'), ui: avg('ui') }, progs: [progs0, v.renderer.info.programs.length], calls: frames.at(-1).calls, spikes };
  }, +secs * 60);
  console.log(JSON.stringify(res, null, 1));
} });
done(errs);
