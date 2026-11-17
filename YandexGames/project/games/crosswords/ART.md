# Графика версии 2.1

Встроенным ImageGen созданы 40 новых рисунков для уровней: 20 отдельных мест для классики и 20 для эрудитов. Все главы сгруппированы по 50 уровней, циклическое повторение фонов убрано. Подробный маршрут и проверки — в [LOCATIONS.md](LOCATIONS.md).

Готовые рабочие файлы: `static/locations/<id>.jpg` (1536×1024) и `static/locations/<id>-thumb.jpg` (640×240). Все 40 точных итоговых промптов сохранены в `tools/location-art.json`, исходные пути результатов — в `tools/location-art-sources.json`. Использован встроенный инструмент ImageGen, без CLI/API; игровые копии находятся внутри проекта.

Галерея всех иллюстраций: `deliverables/locations-2.1.0/gallery.html`. Названия, темы и связь каждого изображения с диапазоном уровней доступны также в самой игре. Ночная тема использует затемнение того же рисунка; это 40 самостоятельных картин, а не перекраски одного фона.

## История: графика версии 2.0

Сохранены все 12 исходных пейзажей глав с процедурными частицами и ночными вариантами. В обычной кампании пейзажи циклически повторяются по главам; ответы и поля не повторяются. Для эрудитов сохранена книжная комната.

Для меню встроенным инструментом ImageGen создана одна дополнительная иллюстрация читального зала. Она не заменяет исходные фоны: в настройках меню можно вернуть прежний бумажный вариант. Ночная тема накладывает затемнение, контрастная тема отключает иллюстрацию. Кнопки и значки доработаны кодом поверх существующей векторной системы.

Файлы:

- `static/art/reading-room.png` — исходный результат генерации 1536×1024.
- `static/art/reading-room.jpg` — тот же рисунок, JPEG quality 90 для игры, около 363 KiB.
- `static/polish.css` — объём, блики, медальоны и адаптивная компоновка.
- `src/scene.js` — сохранённые процедурные пейзажи и частицы.

Режим: встроенный ImageGen, без API/CLI. Исходный путь инструмента: `[local-path] рабочие сборки используют копию внутри проекта.

## Итоговый промпт

Use case: stylized-concept. Asset type: optional background for a calm classic Russian crossword puzzle game, wide landscape 1536x1024. A warm elegant reading room in a small garden library, hand-painted storybook illustration with tactile gouache and subtle paper grain, muted sage green, honey oak, cream paper, brass and golden afternoon sunlight. Composition: a large quiet softly lit cream wall and empty desk space occupying center, bookcases and plants along the extreme edges, tall garden window at left edge, a green banker lamp and teacup on a side table at lower right edge, no objects dominating the center. Atmospheric depth, tasteful mature cozy art direction, refined detail at edges, central area calm for overlaying large readable game menu. No people, no lettering, no symbols, no UI, no crossword grid, no logos, no watermark. This is an actual full game environment artwork, not a screenshot or UI mockup.
