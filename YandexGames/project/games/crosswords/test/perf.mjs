// Время отрисовки фонов и частота кадров при 4-кратном замедлении CPU (грубая модель телефона)
import { run, done } from './shot.mjs';
let all = await run({ w: 390, h: 844, mobile: true, dpr: 3, steps: async (page) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const res = await page.evaluate(async () => {
    const a = window.__app; a.save.data.tutDone = true;
    const out = [];
    for (let c = 0; c < 8; c++) {
      const t0 = performance.now();
      a.openLevel(c * 15);
      out.push(Math.round(performance.now() - t0));
      await new Promise((r) => setTimeout(r, 300));
    }
    // кадры за 3 секунды на главе 5 (снег — самая плотная анимация)
    a.openLevel(75);
    await new Promise((r) => setTimeout(r, 500));
    let n = 0, worst = 0, last = performance.now();
    await new Promise((r) => { const t0 = last; const f = (now) => { n++; worst = Math.max(worst, now - last); last = now; if (now - t0 < 3000) requestAnimationFrame(f); else r(); }; requestAnimationFrame(f); });
    return { openMs: out, fps: Math.round(n / 3), worstFrame: Math.round(worst) };
  });
  console.log(JSON.stringify(res));
} });
done(all);
