// Управление: клавиатура + мышь (захват указателя или перетаскивание), на телефоне — стик слева и обзор пальцем справа
export class Input {
  constructor(canvas, isTouch) {
    this.canvas = canvas;
    this.touch = isTouch;
    this.keys = new Set();
    this.look = { x: 0, y: 0 };
    this.move = { x: 0, y: 0 };
    this.stick = null; // {id, ox, oy, x, y}
    this.lookId = null;
    this.lookLast = null;
    this.runHeld = false;
    this.enabled = false;
    this.pressed = new Set(); // одиночные нажатия
    this.locked = false;
    this.dragMouse = false;
    this.sens = 1;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.code;
      this.keys.add(k);
      this.pressed.add(k);
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(k)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.stick = null;
      this.lookId = null;
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      this.onLockChange && this.onLockChange(this.locked);
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (this.locked || this.dragMouse) {
        this.look.x += e.movementX || 0;
        this.look.y += e.movementY || 0;
      }
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled || this.touch) return;
      if (!this.locked) {
        this.requestLock();
        this.dragMouse = true;
      }
    });
    window.addEventListener('mouseup', () => (this.dragMouse = false));
    // сенсор
    canvas.addEventListener('touchstart', (e) => this._ts(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this._tm(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this._te(e), { passive: false });
    canvas.addEventListener('touchcancel', (e) => this._te(e), { passive: false });
  }

  requestLock() {
    if (this.touch) return;
    try {
      const p = this.canvas.requestPointerLock && this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }
  unlock() {
    try {
      if (document.pointerLockElement) document.exitPointerLock();
    } catch (e) {}
  }

  _ts(e) {
    e.preventDefault();
    this.touch = true;
    if (!this.enabled) return;
    const W = window.innerWidth;
    for (const t of e.changedTouches) {
      if (t.clientX < W * 0.42 && !this.stick) {
        this.stick = { id: t.identifier, ox: t.clientX, oy: t.clientY, x: t.clientX, y: t.clientY };
        this.onStick && this.onStick(this.stick);
      } else if (this.lookId === null) {
        this.lookId = t.identifier;
        this.lookLast = { x: t.clientX, y: t.clientY };
      }
    }
  }
  _tm(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (this.stick && t.identifier === this.stick.id) {
        this.stick.x = t.clientX;
        this.stick.y = t.clientY;
        this.onStick && this.onStick(this.stick);
      } else if (t.identifier === this.lookId) {
        this.look.x += (t.clientX - this.lookLast.x) * 1.6;
        this.look.y += (t.clientY - this.lookLast.y) * 1.6;
        this.lookLast = { x: t.clientX, y: t.clientY };
      }
    }
  }
  _te(e) {
    for (const t of e.changedTouches) {
      if (this.stick && t.identifier === this.stick.id) {
        this.stick = null;
        this.onStick && this.onStick(null);
      } else if (t.identifier === this.lookId) this.lookId = null;
    }
  }

  // вектор движения (-1..1), x — вбок, y — вперёд
  axis() {
    let x = 0,
      y = 0;
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (this.stick) {
      const R = 55;
      let dx = (this.stick.x - this.stick.ox) / R,
        dy = (this.stick.y - this.stick.oy) / R;
      const l = Math.hypot(dx, dy);
      if (l > 1) (dx /= l), (dy /= l);
      x += dx;
      y -= dy;
    }
    const l = Math.hypot(x, y);
    if (l > 1) (x /= l), (y /= l);
    return { x, y, mag: Math.min(1, l) };
  }

  running() {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.runHeld || (this.stick && Math.hypot(this.stick.x - this.stick.ox, this.stick.y - this.stick.oy) > 70);
  }

  hit(code) {
    return this.pressed.has(code);
  }

  takeLook() {
    const l = { x: this.look.x * this.sens, y: this.look.y * this.sens };
    this.look.x = this.look.y = 0;
    return l;
  }

  endFrame() {
    this.pressed.clear();
  }

  reset() {
    this.keys.clear();
    this.pressed.clear();
    this.look.x = this.look.y = 0;
    this.stick = null;
    this.lookId = null;
    this.runHeld = false;
    this.onStick && this.onStick(null);
  }
}
