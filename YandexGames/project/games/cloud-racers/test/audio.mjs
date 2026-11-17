import { run, done } from './shot.mjs';
const errs = await run({
  w: 960, h: 540, debug: { bot: 1, sub: 4, quality: 'low' },
  steps: async (page) => {
    await page.mouse.click(5, 300);
    await page.waitForTimeout(1500);
    const a = await page.evaluate(() => ({ st: window.__audio.ctx && window.__audio.ctx.state, mood: window.__audio.mus.mood, song: window.__audio.mus.song && window.__audio.mus.song.name }));
    console.log('menu', JSON.stringify(a));
    for (const m of ['game', 'snow', 'night', 'boss']) {
      await page.evaluate((m) => window.__audio.setMood(m), m);
      await page.waitForTimeout(5000);
      console.log(m, await page.evaluate(() => window.__audio.mus.song.name));
    }
    await page.evaluate(() => window.__game.startRace(0));
    await page.waitForTimeout(8000);
    console.log('engine', await page.evaluate(() => !!window.__audio.eng));
    for (const s of ['beep', 'go', 'coin', 'boost', 'turbo1', 'turbo2', 'nitro', 'hit', 'lap', 'finalLap', 'win', 'finish', 'lose', 'buy', 'upgrade', 'error']) await page.evaluate((s) => window.__audio.play(s, 0.5), s);
    await page.waitForTimeout(1500);
  },
});
done(errs);
