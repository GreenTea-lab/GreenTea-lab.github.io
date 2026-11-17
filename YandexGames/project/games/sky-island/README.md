# Sky Islet / Небесный островок

A voxel idle builder for Yandex Games, built with Three.js.

- `npm i`, then `node build.mjs` builds `dist/` (for Yandex) and `dist-single/` (a single inlined HTML file).
- `node test/sim.mjs` runs the economy simulation with a bot.
- `node test/flow.mjs` and `node test/long.mjs` run Playwright tests.
  - These two use mock SDK and headless Chromium.
- `node promo/shots.mjs` and `node promo/covers.mjs` render the screenshots, icon and covers.

Code map:

- `src/econ.js`: economy, pure functions.
- `src/vox.js` and `src/models.js`: voxel models.
- `src/world.js` and `src/skydeco.js`: the 3D scene.
- `src/game.js`: the game logic.
- `src/ui.js`: the interface.
- `src/sdk.js`: the Yandex SDK wrapper.
