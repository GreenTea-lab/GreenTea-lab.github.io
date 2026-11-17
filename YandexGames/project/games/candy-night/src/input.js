// Управление: клавиатура, плавающий сенсорный джойстик и кнопка рывка
export const input = {
  keys: new Set(),
  hits: new Set(),
  isTouch: false,
  joy: { x: 0, y: 0, id: null, ox: 0, oy: 0 },
  dashTap: false,
  pausePressed: false,

  init() {
    this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      this.hits.add(e.code);
      if (e.code === 'Escape' || e.code === 'KeyP') this.pausePressed = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
  },

  clear() {
    this.keys.clear();
    this.hits.clear();
    this.joy.x = this.joy.y = 0;
    this.joy.id = null;
    this.dashTap = false;
  },

  // направление движения в мире: x — вправо, z — к камере
  move() {
    let x = 0,
      z = 0;
    const k = this.keys;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) z -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) z += 1;
    if (this.joy.id !== null) {
      x = this.joy.x;
      z = -this.joy.y;
      const l = Math.hypot(x, z);
      if (l < 0.18) x = z = 0;
    }
    return { x, z };
  },

  dash() {
    const d = this.hits.has('Space') || this.hits.has('ShiftLeft') || this.hits.has('ShiftRight') || this.dashTap;
    this.dashTap = false;
    return d;
  },

  endFrame() {
    this.hits.clear();
  },

  // джойстик появляется там, где коснулись
  bindJoy(zone, base, knob) {
    const J = this.joy;
    const R = 54;
    const move = (e) => {
      let dx = e.clientX - J.ox,
        dy = e.clientY - J.oy;
      const d = Math.hypot(dx, dy);
      if (d > R) {
        // база подтягивается за пальцем
        J.ox += (dx / d) * (d - R);
        J.oy += (dy / d) * (d - R);
        base.style.left = J.ox - zone.getBoundingClientRect().left + 'px';
        base.style.top = J.oy - zone.getBoundingClientRect().top + 'px';
        dx = (dx / d) * R;
        dy = (dy / d) * R;
      }
      J.x = dx / R;
      J.y = -dy / R;
      knob.style.transform = `translate(${dx}px,${dy}px)`;
    };
    zone.addEventListener('pointerdown', (e) => {
      if (J.id !== null) return;
      e.preventDefault();
      J.id = e.pointerId;
      J.ox = e.clientX;
      J.oy = e.clientY;
      try {
        zone.setPointerCapture(e.pointerId);
      } catch (er) {}
      base.style.left = J.ox - zone.getBoundingClientRect().left + 'px';
      base.style.top = J.oy - zone.getBoundingClientRect().top + 'px';
      base.classList.add('on');
      this.isTouch = true;
      move(e);
    });
    zone.addEventListener('pointermove', (e) => e.pointerId === J.id && move(e));
    const end = (e) => {
      if (e.pointerId !== J.id) return;
      J.id = null;
      J.x = J.y = 0;
      knob.style.transform = '';
      base.classList.remove('on');
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  },

  bindDash(el) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dashTap = true;
      el.classList.add('on');
    });
    const up = () => el.classList.remove('on');
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  },
};
