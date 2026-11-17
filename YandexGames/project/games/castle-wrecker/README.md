# Castle Wrecker / Разрушитель Замков

A 3D physics game about wrecking castles for Yandex Games, built with Three.js and Rapier.

## Commands

- `npm i`, then `node build.mjs` builds two outputs:
  - `dist/` for Yandex Games;
  - `dist-single/`, a single HTML file.
- `node test/stable.mjs` checks that all 30 castles stand on their own.
- `node test/bot.mjs` runs a bot that checks each level can be beaten.
  - It also estimates the "par" for three stars.
  - It runs both precise aiming and noisy aiming.
- `node test/flow.mjs [m]` runs the full scenario in Chromium with the mock SDK.
- `node promo/shots.mjs` and `node promo/covers.mjs` render the screenshots, icon and covers.

## Code map

- `src/physics.js`: physics, damage from impacts, explosions and fire. Runs in Node too.
- `src/levels.js`: the castle builder and the 30 levels.
- `src/render.js`, `src/models.js` and `src/textures.js`: graphics, voxel models and pixel textures.
- `src/game.js`: game logic.
- `src/ui.js`: the interface.
- `src/audio.js`: synthesized sound and music.
- `src/sdk.js`: the Yandex SDK wrapper.
