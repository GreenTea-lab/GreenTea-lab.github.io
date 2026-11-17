// Аналитика воронки через Яндекс Метрику (работает и в Яндекс Играх, и в VK).
// Чтобы включить: создать счётчик на metrika.yandex.ru и вписать его номер в COUNTER, затем пересобрать.
// Пока номер 0 — события никуда не отправляются, игра работает как обычно.
const COUNTER = 0;

let ready = false;

export function initAnalytics() {
  if (!COUNTER || ready) return;
  ready = true;
  try {
    window.ym =
      window.ym ||
      function () {
        (window.ym.a = window.ym.a || []).push(arguments);
      };
    window.ym.l = Date.now();
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://mc.yandex.ru/metrika/tag.js';
    document.head.appendChild(s);
    window.ym(COUNTER, 'init', { clickmap: false, trackLinks: false, accurateTrackBounce: true });
  } catch (e) {}
}

// цель в Метрике: first_run, first_win, camp_clear, return_d1 и т. д.
export function track(goal, params) {
  if (!COUNTER || !window.ym) return;
  try {
    window.ym(COUNTER, 'reachGoal', goal, params || {});
  } catch (e) {}
}
