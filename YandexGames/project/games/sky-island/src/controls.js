// Камера: свайп — вращение, щипок/колесо — зум, два пальца/правая кнопка — сдвиг, тап — выбор
import * as THREE from 'three';

export class Controls {
  constructor(el, camera, onTap, onHover) {
    this.el = el;
    this.camera = camera;
    this.onTap = onTap;
    this.onHover = onHover;
    this.target = new THREE.Vector3(0, 0, 0);
    this.goal = new THREE.Vector3(0, 0, 0);
    this.theta = Math.PI * 0.25; // азимут
    this.phi = 0.95; // угол от вертикали
    this.dist = 26;
    this.tTheta = this.theta;
    this.tPhi = this.phi;
    this.tDist = this.dist;
    this.vTheta = 0;
    this.pointers = new Map();
    this.minDist = 7;
    this.maxDist = 46;
    this.bounds = 8;
    this.enabled = true;

    el.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e));
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.tDist = clamp(this.tDist * Math.pow(1.0012, e.deltaY), this.minDist, this.maxDist);
    }, { passive: false });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  down(e) {
    if (!this.enabled) return;
    this.el.setPointerCapture && this.el.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), btn: e.button });
    this.moved = this.pointers.size > 1 ? 99 : 0;
    if (this.pointers.size === 2) this.pinch = this.pinchState();
    this.vTheta = 0;
  }

  pinchState() {
    const [a, b] = [...this.pointers.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }

  move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) {
      if (e.pointerType === 'mouse' && this.onHover) this.onHover(e.clientX, e.clientY);
      return;
    }
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    this.moved += Math.abs(dx) + Math.abs(dy);
    const h = this.el.clientHeight || 600;
    if (this.pointers.size === 1) {
      if (p.btn === 2 || e.shiftKey) this.pan(dx, dy);
      else {
        const k = 3.2 / h;
        this.tTheta -= dx * k;
        this.tPhi = clamp(this.tPhi - dy * k * 0.7, 0.45, 1.25);
        this.vTheta = -dx * k * 60;
      }
      if (e.pointerType === 'mouse' && this.onHover) this.onHover(e.clientX, e.clientY);
    } else if (this.pointers.size === 2) {
      const s = this.pinchState();
      if (this.pinch && s.d > 10) {
        this.tDist = clamp((this.tDist * this.pinch.d) / s.d, this.minDist, this.maxDist);
        this.pan(s.mx - this.pinch.mx, s.my - this.pinch.my);
      }
      this.pinch = s;
    }
  }

  pan(dx, dy) {
    const h = this.el.clientHeight || 600;
    const k = (this.dist / h) * 1.1;
    const right = new THREE.Vector3(Math.cos(this.theta), 0, -Math.sin(this.theta));
    const fwd = new THREE.Vector3(Math.sin(this.theta), 0, Math.cos(this.theta));
    this.goal.addScaledVector(right, -dx * k).addScaledVector(fwd, -dy * k);
    this.clampGoal();
  }

  clampGoal() {
    const b = this.bbox;
    if (b) {
      this.goal.x = clamp(this.goal.x, b.minx, b.maxx);
      this.goal.z = clamp(this.goal.z, b.minz, b.maxz);
    }
  }

  up(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    const dt = performance.now() - p.t;
    if (this.pointers.size === 0 && this.moved < 10 && dt < 500 && this.onTap) this.onTap(e.clientX, e.clientY);
  }

  focus(x, z) {
    this.goal.set(x, 0, z);
    this.clampGoal();
  }

  update(dt) {
    // инерция вращения
    if (this.pointers.size === 0 && Math.abs(this.vTheta) > 0.001) {
      this.tTheta += this.vTheta * dt;
      this.vTheta *= Math.pow(0.04, dt);
    }
    const k = 1 - Math.pow(0.0005, dt);
    this.theta += (this.tTheta - this.theta) * k;
    this.phi += (this.tPhi - this.phi) * k;
    this.dist += (this.tDist - this.dist) * k;
    this.target.lerp(this.goal, k * 0.7);
    const c = this.camera;
    const sp = Math.sin(this.phi);
    c.position.set(this.target.x + this.dist * sp * Math.sin(this.theta), this.target.y + this.dist * Math.cos(this.phi), this.target.z + this.dist * sp * Math.cos(this.theta));
    c.lookAt(this.target);
  }
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
