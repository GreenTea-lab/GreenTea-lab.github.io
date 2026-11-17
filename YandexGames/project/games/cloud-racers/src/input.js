// Управление: клавиатура и сенсорные кнопки
export const input = {
  keys: new Set(),
  touch: { left: false, right: false, brake: false, drift: false },
  nitroPressed: false,
  pausePressed: false,
  steerSmooth: 0,
  isTouch: false,

  init() {
    this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyN' || e.code === 'KeyE') this.nitroPressed = true;
      if (e.code === 'Escape' || e.code === 'KeyP') this.pausePressed = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      for (const k in this.touch) this.touch[k] = false;
    });
  },

  // привязать сенсорную кнопку: name — left/right/brake/drift/nitro
  bind(el, name) {
    const on = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (name === 'nitro') this.nitroPressed = true;
      else this.touch[name] = true;
      el.classList.add('on');
      this.isTouch = true;
    };
    const off = (e) => {
      if (e) e.preventDefault();
      if (name !== 'nitro') this.touch[name] = false;
      el.classList.remove('on');
    };
    el.addEventListener('pointerdown', (e) => {
      try {
        el.setPointerCapture(e.pointerId);
      } catch (er) {}
      on(e);
    });
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('lostpointercapture', () => off());
  },

  read(dt) {
    const k = this.keys;
    const L = k.has('ArrowLeft') || k.has('KeyA') || this.touch.left;
    const R = k.has('ArrowRight') || k.has('KeyD') || this.touch.right;
    const target = (R ? 1 : 0) - (L ? 1 : 0);
    // плавный руль: быстро в сторону, ещё быстрее обратно к центру
    const rate = target === 0 ? 9 : Math.sign(target) !== Math.sign(this.steerSmooth) ? 12 : 6;
    this.steerSmooth += Math.max(-rate * dt, Math.min(rate * dt, target - this.steerSmooth));
    const out = {
      steer: this.steerSmooth,
      brake: k.has('ArrowDown') || k.has('KeyS') || this.touch.brake,
      drift: k.has('Space') || this.touch.drift,
      nitro: this.nitroPressed,
    };
    this.nitroPressed = false;
    return out;
  },

  reset() {
    this.steerSmooth = 0;
    this.nitroPressed = false;
    this.pausePressed = false;
  },
};
