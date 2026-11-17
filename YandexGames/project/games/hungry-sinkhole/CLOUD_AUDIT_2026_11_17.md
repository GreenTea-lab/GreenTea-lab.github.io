# Облачный аудит «Голодной Воронки» 2.2.1

Дата: 17 ноября 2026, Europe/Moscow. База: `251232b1a2105cf6cdce5fad3e5a9add729820bc` + исходный пользовательский патч + дополнительные исправления.

Рабочая папка: `/workspace/GreenTea-lab.github.io/YandexGames/project/games/hungry-sinkhole`. Исходная облачная рабочая копия была на `04f38f2`; нужная папка извлечена через git archive из актуального коммита. Прочитаны корневой AGENTS.md, YandexGames/project/AGENTS.md, CLOUD.md и PROJECT.md игры. Другие игры не изменялись. Публикации, push и загрузки в VK не выполнялись.

## Команды и результаты

Зависимости устанавливались только в Linux. Сначала выполнен `git apply --check --verbose --directory=YandexGames/project/games/hungry-sinkhole .../cloud-input.patch` из корня репозитория: проверены все 10 файлов. Затем патч применён без конфликтов. Проверка из вложенной папки без префикса пропускает патчи; этот запуск не считался проверкой.

Браузерные команды запускались с `NODE_OPTIONS=--import=./test/cloud-browser.mjs`. Адаптер меняет только путь/флаги браузера, таймаут операций и способ доставки file:// через HTTP loopback. Сборки и assertions не заменяются. HTTP разрешён локально в облачной среде.

| Команда | Итог |
|---|---|
| `npm ci` | PASS — 10 packages |
| `npx playwright install --with-deps chrome` | FAIL — root authentication unavailable; existing cloud Chromium used |
| `npm run build` | PASS — four distributions |
| `node test/audit-core.mjs` | PASS — 11 checks, 3 physics scenarios |
| `npm run test:economy` | PASS |
| `npm run test:models` | PASS — 312 models |
| `npm run test:themes` | PASS — 16 maps |
| `npm run test:worlds` | PASS — 16 maps, regeneration, 3 CPU benchmarks |
| `npm run test:routes` | PASS — 48 expeditions |
| `npm run test:traffic` | PASS — 16 maps × 3 seeds × 90 simulated seconds |
| `npm run test:loading` | FAIL — original file URL blocked; HTTP retry fails live-menu speed assertion |
| `npm run test:release` | PASS on retry — 5 layouts/platforms and ad hold/cancellation/reentry |
| `npm run test:runtime` | PASS on retry — 240 frames at CPU 4× and repeated-world cleanup |
| `node test/audit-adaptation.mjs` | PASS — real-time adaptation and physics budget |
| `node test/cloud-audit.mjs` | PASS — 18 checks and 8 frame benchmarks |
| `node test/cloud-ads.mjs` | PASS — 5 checks |
| `node test/cloud-perf-repeat.mjs` | PASS — aurora 4x, 39 frames after warmup |
| `node test/cloud-loading.mjs` | PASS — 9 checks; low quality explicitly selected for complete startup |

## Дополнительные исправления

1. `src/game.js`: прогрев и оценка FPS теперь используют performance.now(), а не время симуляции и ограниченный dt. Раньше на крайне медленных кадрах автоупрощение почти не наступало. Сохранены ручной выбор графики, порог 36 FPS, окна 5 секунд, 6 секунд прогрева и физические бюджеты.
2. `src/volume.js`: сняты минимальные ширины контейнера/инпута, обрезавшие проценты громкости на 320×568. Проверены границы обоих ползунков на 320×568, 390×844, 1440×900 и 844×390.
3. `src/render.js`: clear() освобождает map текстуру погодных частиц. Первый обход заполнял кэш; второй дополнительно терял 4 текстуры (74 → 78). После исправления выполнены те же два обхода.
4. `test/release-v2.mjs`: сценарий обрабатывает штатный отложенный подарок дня через #gtake, прежде чем открывать экспедиции. Первоначальный тест нажимал под модальным окном и завершался по таймауту. Ни одна проверка не удалена.
5. Добавлены облачный адаптер, воспроизводимые UI/память/FPS/реклама сценарии и тест адаптации. Все изменения относительно уже применённого исходного патча — в additional.patch.

## Визуальная и функциональная проверка

Release проверяет desktop 1440×900, телефон 390×844, малый экран 320×568, landscape 844×390 и вариант без поддерживаемых социальных/рекламных методов. Проверены меню, запуск, HUD/top 10, пауза, громкость, результаты, экспедиция, продолжение города, сохранение и отсутствие нежелательных вызовов WallPost/AddToFavorites/Leaderboard. Это локальный mock VK через 127.0.0.1, а не реальная платформа.

Дополнительный сценарий посещает все 16 карт дважды в одинаковом порядке, с seed 4100 и фиксированным low при сравнении памяти. Проверяет реальные матрицы и владельцев после удаления половины крупнейшего пула, запуск battle/royale/solo/zen через UI, платформенную паузу, смерть от другой дыры, сброс массы/очков, respawn и экспедиция → свободный город → немедленный итог. Прохождение 48 маршрутов проверено отдельно автоматической симуляцией, а не ручным прохождением каждой экспедиции.

| Проверка | Итог |
|---|---|
| all maps have no WebGL errors | PASS |
| second complete map cycle has stable geometry/texture/program counts | PASS |
| GPU pool compaction preserves survivors and removes instances | PASS |
| UI launches battle | PASS |
| UI launches royale | PASS |
| UI launches solo | PASS |
| UI launches zen | PASS |
| volume controls fit small | PASS |
| volume controls fit phone | PASS |
| volume controls fit desktop | PASS |
| volume controls fit landscape | PASS |
| platform hold stops simulation | PASS |
| manual resume cannot bypass platform hold | PASS |
| platform resume shows explicit pause UI | PASS |
| real death clears mass and score | PASS |
| respawn starts with reset size | PASS |
| continuation cannot award old mass | PASS |
| no page/shader/console errors | PASS |

## Производительность

Это облачные измерения, не реальный телефон. Linux x86_64, Intel Xeon Platinum 8573C, 3 видимых vCPU, cgroup CPU quota 2 cores, около 10 GB RAM. Chromium 156.0.8078.79. WebGL2; renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`; vendor: Google Inc. (Google).

Viewport 390×844, DPR 1, battle, seed 4100, управление ботом. Каждый прогон начинается с mid и режима auto, после прогрева может перейти в low. Полная production-отрисовка выполняется каждый кадр; пропуска render(), как в старом test/perf.mjs, нет. Интервалы requestAnimationFrame включают JS, рендер и ожидание кадра. Прогоны идут последовательно без тяжёлых тестов рядом. p50/p95/p99 рассчитаны nearest-rank (ceil(N×p)−1) по сохранённым сырым данным. При малом числе кадров p95/p99 совпадают с максимумом и статистически нестабильны; прогрев новых шейдеров/автопонижение графики могли попасть в измерение, поэтому это не steady-state оценка. CPU throttle — CDP rate 4, не эмуляция конкретного процессора телефона. В cloud.log сохранены первоначально напечатанные перцентили по floor((N−1)×p); окончательные таблица и cloud-report.json пересчитаны из тех же сырых dt по nearest-rank. Это пересчёт статистики, без удаления кадров и без повторной классификации провалов.

| Карта | CPU | Секунды | Кадры | p50, мс | p95, мс | p99, мс | Max draw calls | Max triangles | Max active / bodies | Качество | Бюджет active |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| town | 1× | 15.20 | 13 | 590.6 | 8838.1 | 8838.1 | 60 | 676970 | 1 / 3 | low | 110 |
| metro | 1× | 15.15 | 37 | 404.5 | 625.7 | 775.8 | 52 | 425110 | 2 / 4 | low | 110 |
| neoncity | 1× | 15.00 | 27 | 602.6 | 800.3 | 2235.8 | 85 | 768038 | 1 / 3 | mid → low | 150 → 110 |
| aurora | 1× | 15.37 | 36 | 436.4 | 652.5 | 908.5 | 53 | 332782 | 9 / 13 | low | 110 |
| town | 4× | 15.05 | 22 | 668.2 | 1328.9 | 1413.5 | 60 | 676970 | 2 / 4 | low | 110 |
| metro | 4× | 15.67 | 30 | 510.1 | 741.3 | 1129.6 | 52 | 425122 | 0 / 2 | low | 110 |
| neoncity | 4× | 15.52 | 22 | 651.3 | 1335.0 | 2519.6 | 85 | 768038 | 0 / 2 | mid → low | 150 → 110 |
| aurora | 4× | 15.52 | 1 | 15523.5 | 15523.5 | 15523.5 | 49 | 332770 | 0 / 2 | low | 110 |
| aurora (повтор) | 4× | 15.13 | 39 | 385.9 | 545.0 | 625.0 | 54 | 333748 | 12 / 16 | low | 110 |

В первой aurora/4× получился один кадр за 15,5 секунды; его перцентили неинформативны. Отдельный повтор aurora/4× начинается с low, после 20 секунд прогрева, набирает минимум 30 кадров и минимум 15 секунд (верхний предел 90 секунд). Исходное измерение сохранено и показано отдельно.

active — размер Sim.active; bodies — все тела Rapier, включая служебные. Это обычные ранние участки раунда, а не стресс-тест максимальной дыры/массового обвала. Из них нельзя заключить, что лимит физики гарантированно выдерживается при любом разрушении. high/mid/low задают 320/150/110 активных тел; код допускает временные превышения для групп (+30), обломков (+20), цепного пробуждения (+80), а при перегрузе включает упрощённое поглощение. Сопоставлять следует с этими мягкими бюджетами, а не считать maxBodies жёстким пределом всех тел мира.

Отдельный Node worlds-v2 измеряет только ботов и шаг симуляции (без GPU): town p50/p95/p99 0.552/1.564/2.406 мс; neoncity 0.317/0.752/1.493 мс; candyland 0.293/0.797/1.307 мс. Эти цифры не равны времени полного кадра и не заменяют браузерную таблицу.

## Память и ошибки

Цикл 1, финальная neoncity: geometries=328, textures=70, programs=18. Диапазон геометрий 62–328, текстур 28–71.
Цикл 2, финальная neoncity: geometries=328, textures=70, programs=18. Диапазон геометрий 320–332, текстур 70–71.

Все 32 проверки gl.getError() сохранены в cloud-report.json. Page errors: 0; console errors: 0. Стабильность счётчиков WebGL на двух циклах подтверждает исправление найденной утечки, но не является многочасовым тестом JS heap или памяти драйвера.

## Ограничения и непройденные проверки

- `test:loading` остаётся FAIL. После замены заблокированного file:// на loopback дошёл до assert `sim.time > begin.time + .2` за 800 мс. На SwiftShader desktop/high кадры существенно медленнее, симуляция ограничивает число физических шагов за кадр. Условие не ослаблялось и провал не переименовывался в успех; дальнейшие ветки именно этого теста не пройдены. Они проверены отдельно в cloud-loading.mjs: размеры загрузчика, reduced motion, 6 стадий, экран ошибки/retry и запуск single-file. Для полного запуска в этом отдельном сценарии явно выбрана low-графика; исходный скоростной тест не считается успешным.
- Первоначальный `test:runtime` завершился таймаутом продвижения симуляции. Повтор после исправления адаптации/увеличения облачного таймаута прошёл. Его 240-кадровый замер и 15-секундные прогоны выше — разные методики.
- Нет физического телефона, аппаратного GPU, настоящих VK/OK/Yandex SDK, реальной рекламы/покупок/публикации историй или проверки модератором.
- Сеть/CDN, потеря соединения, долговременный нагрев и расход батареи телефона, многочасовой soak и пиковый обвал всего города не измерялись.

## Артефакты

- `additional-source-only.patch`: только три дополнительных исправления production-кода; полный набор включает и тесты.
- `additional.patch`: отдельный unified diff только дополнительных изменений; проверен git apply --check на копии базы с уже применённым исходным патчем.
- `cloud-report.json`: сырые интервалы каждого кадра, GPU, параметры, оба цикла памяти, UI-проверки.
- `cloud-before-weather-fix.json`: доказательство утечки до исправления.
- `../release-v2/report.json`, `../runtime-v2/report.json`, `core.json`, `ads/report.json`, `../worlds-v2.json`, `../expedition-routes.json` и другие JSON.
- Скриншоты: `../release-v2/*`, `map-*.png` для всех карт, `volume-*.png`, `small-*.png`, `pool-compacted.png`, `perf-*.png`, `ads/reward-confirmed.png`.
- Логи initial/retry сохранены; `cloud.log`, `ads.log`, `build.log`, `core.log`, `adaptation.log` и журналы npm-тестов.
