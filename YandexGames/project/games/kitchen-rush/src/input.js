// Управление: клавиатура, сенсорный джойстик и кнопки
export const input = {
  keys: new Set(),
  pick: false,
  act: false,
  actHeld: false,
  sw: false,
  pausePressed: false,
  isTouch: false,
  joy: { x: 0, y: 0, id: null, ox: 0, oy: 0 },
  touchAct: false,

  hits: new Set(), // клавиши, нажатые с прошлого опроса

  init() {
    this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Slash', 'Quote'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      this.hits.add(e.code);
      if (e.code === 'Escape' || e.code === 'KeyP') this.pausePressed = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.hits.clear();
      this.joy.x = this.joy.y = 0;
      this.touchAct = false;
    });
  },

  // джойстик: зона в левой части экрана
  bindJoy(zone, base, knob) {
    const J = this.joy;
    const R = 56;
    const move = (e) => {
      let dx = e.clientX - J.ox,
        dy = e.clientY - J.oy;
      const d = Math.hypot(dx, dy);
      if (d > R) {
        dx *= R / d;
        dy *= R / d;
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

  // кнопка: pick / act / sw
  bindBtn(el, name) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this[name] = true;
      if (name === 'act') this.touchAct = true;
      el.classList.add('on');
      this.isTouch = true;
      try {
        el.setPointerCapture(e.pointerId);
      } catch (er) {}
    });
    const off = () => {
      if (name === 'act') this.touchAct = false;
      el.classList.remove('on');
    };
    el.addEventListener('pointerup', off);
    el.addEventListener('pointercancel', off);
    el.addEventListener('lostpointercapture', off);
  },

  // вектор движения в экранных осях (x вправо, y вверх) и нажатия
  // coop=false: один игрок, все клавиши его; coop=true: [игрок 1 — WASD, игрок 2 — стрелки]
  read(coop) {
    const k = this.keys,
      h = this.hits;
    const any = (set, list) => list.some((c) => set.has(c));
    const axis = (r, l, u, d) => [(any(k, r) ? 1 : 0) - (any(k, l) ? 1 : 0), (any(k, u) ? 1 : 0) - (any(k, d) ? 1 : 0)];
    const A = { r: ['KeyD'], l: ['KeyA'], u: ['KeyW'], d: ['KeyS'], pick: ['Space', 'KeyF'], act: ['KeyE', 'KeyG', 'ControlLeft'] };
    const Bk = { r: ['ArrowRight'], l: ['ArrowLeft'], u: ['ArrowUp'], d: ['ArrowDown'], pick: ['Enter', 'NumpadEnter', 'Period', 'Numpad0', 'KeyL'], act: ['Slash', 'ShiftRight', 'ControlRight', 'NumpadDecimal', 'Quote', 'Semicolon'] };
    const mk = (S) => {
      const [x, y] = axis(S.r, S.l, S.u, S.d);
      return { x, y, pick: any(h, S.pick), act: any(h, S.act), actHeld: any(k, S.act), sw: false };
    };
    let out;
    if (coop) {
      out = [mk(A), mk(Bk)];
    } else {
      const S = { r: [...A.r, ...Bk.r], l: [...A.l, ...Bk.l], u: [...A.u, ...Bk.u], d: [...A.d, ...Bk.d], pick: [...A.pick, ...Bk.pick, 'KeyJ'], act: [...A.act, 'KeyK', 'ControlRight'] };
      const o = mk(S);
      o.sw = any(h, ['ShiftLeft', 'ShiftRight', 'Tab', 'KeyQ']);
      if (this.joy.id !== null) {
        const m = Math.hypot(this.joy.x, this.joy.y);
        if (m > 0.2) {
          o.x = this.joy.x;
          o.y = this.joy.y;
        }
      }
      o.pick = o.pick || this.pick;
      o.act = o.act || this.act;
      o.actHeld = o.actHeld || this.touchAct;
      o.sw = o.sw || this.sw;
      out = o;
    }
    this.pick = this.act = this.sw = false;
    h.clear();
    return out;
  },

  reset() {
    this.hits.clear();
    this.pick = this.act = this.sw = this.pausePressed = false;
    this.joy.x = this.joy.y = 0;
  },
};
