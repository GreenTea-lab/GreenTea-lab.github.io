// Звук: все эффекты и смена плейлистов без ошибок; пиковый уровень на выходе
import { run, done } from './shot.mjs';
const errs = await run({ debug: {}, steps: async (p) => {
  const r = await p.evaluate(async () => {
    const a = window.__audio;
    a.unlock();
    const names = ['click', 'deal', 'flip', 'place', 'draw', 'combo', 'deny', 'coin', 'unlock', 'wave', 'undo', 'joker', 'star', 'win', 'lose', 'build', 'buy', 'gift', 'open', 'error'];
    for (const n of names) { a.play(n, 3); await new Promise((r) => setTimeout(r, 60)); }
    a.setIntensity(1);
    await new Promise((r) => setTimeout(r, 2500));
    a.setIntensity(0);
    await new Promise((r) => setTimeout(r, 1500));
    return { state: a.ctx && a.ctx.state, names: names.length };
  });
  console.log('AUDIO', JSON.stringify(r));
}});
done(errs);
