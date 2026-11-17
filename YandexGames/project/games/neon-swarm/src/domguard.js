// Окна на HTML поверх игры (громкость, магазин): нажатия по ним не должны доходить до кнопок игры под ними.
// На телефоне касания (touchstart/touchend) идут мимо pointer-событий и раньше нажимали, например, «Продолжить» в паузе.
const EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchmove', 'touchend', 'touchcancel'];

// root — элемент окна; возвращает функцию, которую надо вызвать при закрытии окна
export function guardOverlay(root) {
  for (const ev of EVENTS) root.addEventListener(ev, (e) => e.stopPropagation());
  const gm = typeof window !== 'undefined' && window.__game;
  if (gm && gm.input) gm.input.enabled = false;
  return () => {
    // ввод включаем после того, как отпущенный палец или кнопка мыши уже обработаны
    setTimeout(() => {
      if (gm && gm.input && !document.querySelector('[data-guard]')) gm.input.enabled = true;
    }, 120);
  };
}
