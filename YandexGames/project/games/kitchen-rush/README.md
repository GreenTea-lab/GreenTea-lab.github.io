# Кухонный Переполох / Kitchen Rush

3D-игра про готовку для Яндекс Игр (Three.js). Сборка: `npm install`, затем `node build.mjs` → `dist/` (для Яндекса) и `dist-single/` (один HTML).

- `src/data.js` — уровни, блюда, повара, улучшения
- `src/kitchen.js` — логика кухни, `src/bot.js` — бот для проверки баланса
- `src/kview.js`, `src/models.js` — 3D-вид, `src/ui.js` — интерфейс
- `test/sim.mjs` — прогон бота, `test/calib.mjs` — пересчёт порогов звёзд
- `promo/promo.mjs`, `promo/inapps.mjs` — промо-картинки и иконки покупок
