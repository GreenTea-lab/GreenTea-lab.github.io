// Управление: клавиатура (WASD/стрелки, пробел, Q/E), мышь (тянуть — камера),
// сенсор: джойстик слева, кнопка прыжка справа, свайп справа — камера
export class Input {
  constructor(el) {
    this.el = el;
    this.keys = new Set();
    this.jx = 0;
    this.jy = 0;
    this.joyId = null;
    this.camId = null;
    this.jumpPressed = false;
    this.jumpHeld = false;
    this.camDX = 0;
    this.camDY = 0;
    this.lastCam = 0;
    this.touch = matchMedia('(pointer: coarse)').matches;
    this.R = 58;
    this.enabled = false;
    const base = (this.base = document.createElement('div'));
    base.className = 'joy hidden';
    base.innerHTML = '<i></i>';
    document.body.appendChild(base);
    this.knob = base.firstChild;
    el.addEventListener('pointerdown', (e) => this._down(e));
    addEventListener('pointermove', (e) => this._move(e));
    addEventListener('pointerup', (e) => this._up(e));
    addEventListener('pointercancel', (e) => this._up(e));
    addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      const k = e.code;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE'].includes(k)) {
        this.keys.add(k);
        e.preventDefault();
      }
      if (k === 'Space') {
        e.preventDefault();
        if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
        if (!e.repeat) this.jumpPressed = true;
        this.jumpHeld = true;
      }
    });
    addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'Space') {
        this.jumpHeld = false;
        if (this.enabled) e.preventDefault();
      }
    });
    // кнопки интерфейса не забирают фокус клавиатуры, иначе пробел «нажимает» кнопку вместо прыжка
    addEventListener('mousedown', (e) => {
      if (e.target.closest && e.target.closest('button')) e.preventDefault();
    });
    addEventListener('blur', () => this.release());
  }

  // кнопка прыжка (сенсор)
  bindJump(btn) {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.jumpPressed = true;
      this.jumpHeld = true;
      this.jumpId = e.pointerId;
      btn.classList.add('down');
    });
    const up = (e) => {
      if (e.pointerId !== this.jumpId) return;
      this.jumpHeld = false;
      this.jumpId = null;
      btn.classList.remove('down');
    };
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
    this.jumpBtn = btn;
  }

  _down(e) {
    if (!this.enabled) return;
    const touch = e.pointerType === 'touch' || e.pointerType === 'pen';
    if (touch) this.touch = true;
    // левая половина экрана — джойстик, правая — камера (на компьютере мышь всегда крутит камеру)
    if (touch && e.clientX < innerWidth * 0.5 && this.joyId === null) {
      this.joyId = e.pointerId;
      this.ox = e.clientX;
      this.oy = e.clientY;
      this.base.style.left = this.ox + 'px';
      this.base.style.top = this.oy + 'px';
      this.base.classList.remove('hidden');
      this._set(e.clientX, e.clientY);
    } else if (this.camId === null) {
      this.camId = e.pointerId;
      this.cx = e.clientX;
      this.cy = e.clientY;
    }
  }
  _move(e) {
    if (e.pointerId === this.joyId) this._set(e.clientX, e.clientY);
    else if (e.pointerId === this.camId) {
      this.camDX += e.clientX - this.cx;
      this.camDY += e.clientY - this.cy;
      this.cx = e.clientX;
      this.cy = e.clientY;
      this.lastCam = performance.now();
    }
  }
  _up(e) {
    if (e.pointerId === this.joyId) {
      this.joyId = null;
      this.jx = this.jy = 0;
      this.base.classList.add('hidden');
    }
    if (e.pointerId === this.camId) this.camId = null;
  }
  _set(x, y) {
    let dx = x - this.ox,
      dy = y - this.oy;
    const d = Math.hypot(dx, dy);
    if (d > this.R) {
      this.ox = x - (dx / d) * this.R;
      this.oy = y - (dy / d) * this.R;
      this.base.style.left = this.ox + 'px';
      this.base.style.top = this.oy + 'px';
      dx = x - this.ox;
      dy = y - this.oy;
    }
    this.jx = dx / this.R;
    this.jy = -dy / this.R;
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  release() {
    this.keys.clear();
    this._up({ pointerId: this.joyId });
    this._up({ pointerId: this.camId });
    this.jumpHeld = false;
    this.jumpPressed = false;
    if (this.jumpBtn) this.jumpBtn.classList.remove('down');
  }

  // движение в экранных осях: x вправо, y вперёд
  move() {
    let x = this.jx,
      y = this.jy;
    const K = this.keys;
    if (K.size) {
      x = (K.has('KeyD') || K.has('ArrowRight') ? 1 : 0) - (K.has('KeyA') || K.has('ArrowLeft') ? 1 : 0);
      y = (K.has('KeyW') || K.has('ArrowUp') ? 1 : 0) - (K.has('KeyS') || K.has('ArrowDown') ? 1 : 0);
    }
    const m = Math.hypot(x, y);
    if (m > 1) {
      x /= m;
      y /= m;
    }
    // мёртвая зона джойстика
    if (m < 0.12) return { x: 0, y: 0, m: 0 };
    return { x, y, m: Math.min(1, m) };
  }
  // поворот камеры с клавиш Q/E
  keyCam() {
    return (this.keys.has('KeyE') ? 1 : 0) - (this.keys.has('KeyQ') ? 1 : 0);
  }
  takeCam() {
    const d = [this.camDX, this.camDY];
    this.camDX = this.camDY = 0;
    return d;
  }
  takeJump() {
    const j = this.jumpPressed;
    this.jumpPressed = false;
    return j;
  }
}
