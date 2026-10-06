// Надёжность прыжка: нажатия пробела при разной частоте кадров (60/120/144/240 Гц) и короткие тапы.
// Игровой цикл останавливается, кадры прокручиваются вручную. node test/jump.mjs
import { run, done } from './shot.mjs';
const res = {};
const errs = await run({ w: 640, h: 360, pre: 'localStorage.clear()', steps: async (page) => {
  await page.click('.m-play', { force: true });
  await page.waitForTimeout(400);
  Object.assign(res, await page.evaluate(() => {
    const g = __game;
    g.loop = () => {};
    g.world.render = () => {};
    const out = {};
    // tap — сколько кадров кнопка удерживается (0 — отпущена в том же кадре)
    const trial = (hz, holdFrames, n) => {
      let ok = 0, high = 0;
      for (let k = 0; k < n; k++) {
        g.startLevel(1);
        document.querySelectorAll('.banner').forEach((b) => b.remove());
        g.hintQ = [];
        const dt = 1 / hz;
        // постоять, чтобы опора определилась; случайная фаза накопителя шагов
        for (let i = 0; i < 20; i++) g.update(dt);
        g.acc = Math.random() * (1 / 120);
        const y0 = g.P.y;
        g.input.jumpPressed = true;
        g.input.jumpHeld = true;
        let maxY = y0;
        for (let i = 0; i < hz * 0.8; i++) {
          if (i === holdFrames) g.input.jumpHeld = false;
          g.update(dt);
          maxY = Math.max(maxY, g.P.y);
        }
        g.input.jumpHeld = false;
        if (maxY > y0 + 0.3) ok++;
        if (maxY > y0 + 1.0) high++;
      }
      return `${ok}/${n} прыжков, высоких ${high}`;
    };
    for (const hz of [60, 120, 144, 240]) out['hz' + hz] = trial(hz, 1e9, 60);
    out.tap144_1frame = trial(144, 1, 40);
    out.tap60_0frame = trial(60, 0, 40);
    return out;
  }));
} });
// настоящая клавиатура: клик по «Паузе», Esc, затем пробел — должен быть прыжок, а не повторная пауза
const errs2 = await run({ w: 640, h: 360, pre: 'localStorage.clear()', steps: async (page) => {
  await page.click('.m-play', { force: true });
  await page.waitForTimeout(600);
  await page.click('.h-pause', { force: true });
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const y0 = await page.evaluate(() => __game.P.y);
  await page.keyboard.down('Space');
  const ymax = await page.evaluate(() => new Promise((r) => { let m = -1e9; const t0 = performance.now(); const f = () => { m = Math.max(m, __game.P.y); performance.now() - t0 < 2500 ? requestAnimationFrame(f) : r(m); }; f(); }));
  await page.keyboard.up('Space');
  res.afterPauseButton = { jumped: +(ymax - y0).toFixed(2), pauseReopened: await page.evaluate(() => !!__game.modal), focus: await page.evaluate(() => document.activeElement.tagName) };
} });
errs.push(...errs2);
console.log(JSON.stringify(res, null, 1));
done(errs);
