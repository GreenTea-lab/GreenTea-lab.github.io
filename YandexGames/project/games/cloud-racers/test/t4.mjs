import { run, done } from './shot.mjs';
import fs from 'fs';
const errs = await run({
  w: 800, h: 450, debug: { bot: 1, sub: 12, pushBot: 1, quality: 'low' },
  steps: async (page) => {
    await page.evaluate(() => window.__game.startRace(0));
    for (let i = 0; i < 80; i++) {
      await page.waitForTimeout(2000);
      if (await page.evaluate(() => window.__game.race && window.__game.race.finished)) break;
    }
    const raw = await page.evaluate(() => localStorage.getItem('cloud_racers_local_ghosts'));
    fs.writeFileSync('test/ghosts.json', raw);
  },
});
done(errs);
