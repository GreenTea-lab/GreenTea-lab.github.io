// звук: все эффекты и все треки без ошибок
import { run, done } from './shot.mjs';
const errs = await run({ w: 800, h: 600, debug: { shots: 1 }, steps: async (p) => {
  await p.mouse.click(10, 10);
  const r = await p.evaluate(async () => {
    const a = window.__audio; a.unlock();
    const names = ['click','tab','plant','nowater','refill','water','lay','collect','load','made','build','buy','land','goose','sheep','cow','cat','dog','bear','cageHit','caged','truck','sold','spoil','hungry','warn','starved','goal','deny','coin','star','win','upgrade'];
    const bad = [];
    for (const n of names) { try { a.play(n, 1); } catch (e) { bad.push(n + ':' + e.message); } await new Promise(r => setTimeout(r, 60)); }
    const moods = [];
    for (const m of ['menu','spring','summer','autumn','winter']) { try { a.setMood(m); a.startMusic(); moods.push(m); } catch (e) { bad.push(m + ':' + e.message); } await new Promise(r => setTimeout(r, 400)); }
    return { bad, moods, state: a.ctx && a.ctx.state };
  });
  console.log(JSON.stringify(r));
}});
done(errs);
