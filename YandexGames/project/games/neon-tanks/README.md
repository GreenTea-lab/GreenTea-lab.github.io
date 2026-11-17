# Неоновые Танки / Neon Tanks

Танковая арена в духе diep.io в неоновом стиле Неонового Роя. Phaser 3, вся графика и музыка процедурные.

```
npm install
node build.mjs      # dist/ для Яндекса, dist-single/ — один html для проверки
bash pack.sh        # release/neon-tanks-yandex.zip и neon-tanks-source.zip
```

- `src/data.js` — классы танков, характеристики, фигуры, боссы, гараж
- `src/world.js` — симуляция арены (без Phaser, запускается в node)
- `src/bots.js`, `src/names.js` — боты и их ники
- `src/scenes/` — Arena (рендер), Hud, Menu, Bg
- `test/` — headless-проверки (smoke, ui, touch, iap) и баланс (`sim.mjs`, `psim.mjs`)
- `promo/` — скрипты промо: `promo.mjs` (скриншоты, обложки, иконка), `inapps.mjs`, `video.mjs`

Публикация: см. `КАК_ОПУБЛИКОВАТЬ.md`.
