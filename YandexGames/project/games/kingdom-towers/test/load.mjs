import { run, done } from './shot.mjs';
const errs = await run({ w: 1920, h: 1080, debug: {}, steps: async (page) => { console.log('loaded'); } });
done(errs);
