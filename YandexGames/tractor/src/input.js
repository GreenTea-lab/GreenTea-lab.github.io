// Управление: плавающий джойстик (палец или мышь в любом месте поля зрения) и клавиатура (WASD / стрелки)
export class Input {
  constructor(el) {
    this.el = el;
    this.jx = 0;
    this.jy = 0;
    this.keys = new Set();
    this.id = null;
    this.R = 62;
    this.enabled = true;
    const base = (this.base = document.createElement('div'));
    base.className = 'joy hidden';
    base.innerHTML = '<i></i>';
    document.body.appendChild(base);
    this.knob = base.firstChild;
    el.addEventListener('pointerdown', (e) => this._down(e));
    window.addEventListener('pointermove', (e) => this._move(e));
    window.addEventListener('pointerup', (e) => this._up(e));
    window.addEventListener('pointercancel', (e) => this._up(e));
    window.addEventListener('keydown', (e) => {
      const k = e.code;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) {
        this.keys.add(k);
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this._up({ pointerId: this.id });
    });
  }

  _down(e) {
    if (!this.enabled || this.id !== null) return;
    this.id = e.pointerId;
    this.ox = e.clientX;
    this.oy = e.clientY;
    this.base.style.left = this.ox + 'px';
    this.base.style.top = this.oy + 'px';
    this.base.classList.remove('hidden');
    this._set(e.clientX, e.clientY);
    this.onStart && this.onStart();
  }
  _move(e) {
    if (e.pointerId !== this.id) return;
    this._set(e.clientX, e.clientY);
  }
  _up(e) {
    if (e.pointerId !== this.id) return;
    this.id = null;
    this.jx = this.jy = 0;
    this.base.classList.add('hidden');
  }
  _set(x, y) {
    let dx = x - this.ox,
      dy = y - this.oy;
    const d = Math.hypot(dx, dy);
    // база джойстика едет за пальцем, если тянуть далеко
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
    this._up({ pointerId: this.id });
    this.keys.clear();
  }

  // вектор в экранных осях: x — вправо, y — вверх; длина 0..1
  get() {
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
    return { x, y, m: Math.min(1, m) };
  }
}
