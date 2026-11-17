// Игрок: движение от первого лица, бег и выносливость, фонарик с батарейкой, прятки в шкафу
import * as THREE from 'three';

export const EYE = 1.62;

export class Player {
  constructor(camera, scene, opts) {
    this.cam = camera;
    this.pos = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.up = opts.up; // уровни прокачки
    this.batMax = 100 * (1 + 0.2 * this.up.battery);
    this.battery = this.batMax;
    this.staMax = 5.5 * (1 + 0.25 * this.up.stamina);
    this.stamina = this.staMax;
    this.exhausted = false;
    this.lightOn = true;
    this.running = false;
    this.hidden = false;
    this.hideSpot = null;
    this.bob = 0;
    this.stepAcc = 0;
    this.flashCd = 0;
    this.flashT = 0;
    this.flicker = 0;
    this.shake = 0;
    this.noiseMul = 1 - 0.15 * this.up.quiet;
    // фонарь: узкий луч + слабая подсветка вокруг
    const range = 15 + this.up.beam * 3;
    this.spot = new THREE.SpotLight(opts.color, 26, range, 0.5, 0.55, 1.35);
    this.spot.castShadow = opts.shadows;
    this.spot.shadow.mapSize.set(1024, 1024);
    this.spot.shadow.camera.near = 0.2;
    this.spot.shadow.camera.far = range;
    this.spot.shadow.bias = -0.0015;
    this.spot.shadow.normalBias = 0.02;
    this.baseInt = 26 + this.up.beam * 5;
    scene.add(this.spot);
    scene.add(this.spot.target);
    this.spill = new THREE.PointLight(opts.color, 0.6, 4.5, 2);
    scene.add(this.spill);
    this.color = opts.color;
  }

  setColor(c) {
    this.spot.color.set(c);
    this.spill.color.set(c);
  }

  place(x, z, yaw) {
    this.pos.set(x, 0, z);
    this.yaw = yaw;
    this.pitch = 0;
  }

  get forward() {
    return new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
  }

  update(dt, input, world, cfg, game) {
    const lk = input.takeLook();
    const s = 0.0024;
    this.yaw -= lk.x * s;
    this.pitch = Math.max(-1.25, Math.min(1.25, this.pitch - lk.y * s));
    if (this.hidden) {
      // в шкафу — только оглядеться
      const h = this.hideSpot;
      let d = this.yaw - (h.ry + Math.PI);
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.yaw = h.ry + Math.PI + Math.max(-0.6, Math.min(0.6, d));
      this.pitch = Math.max(-0.4, Math.min(0.3, this.pitch));
      this.running = false;
      this.stamina = Math.min(this.staMax, this.stamina + dt * 1.2);
    } else {
      const a = input.axis();
      const wantRun = input.running() && a.y > 0.2 && !this.exhausted;
      this.running = wantRun && this.stamina > 0;
      const sp = (this.running ? 4.5 : 2.5) * a.mag;
      const fx = -Math.sin(this.yaw),
        fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw),
        rz = -Math.sin(this.yaw);
      const l = Math.hypot(a.x, a.y) || 1;
      const vx = ((fx * a.y + rx * a.x) / l) * sp,
        vz = ((fz * a.y + rz * a.x) / l) * sp;
      const ox = this.pos.x,
        oz = this.pos.z;
      this.pos.x += vx * dt;
      this.pos.z += vz * dt;
      world.collide(this.pos, 0.28);
      const moved = Math.hypot(this.pos.x - ox, this.pos.z - oz);
      if (this.running) {
        this.stamina -= dt;
        if (this.stamina <= 0) {
          this.exhausted = true;
          game.sound('pant');
        }
      } else this.stamina = Math.min(this.staMax, this.stamina + dt * (a.mag > 0.1 ? 0.6 : 1));
      if (this.exhausted && this.stamina > this.staMax * 0.35) this.exhausted = false;
      // шаги: шум, слышный монстру
      this.bob += moved * (this.running ? 2.6 : 3.2);
      this.stepAcc += moved;
      const stride = this.running ? 0.95 : 0.75;
      if (this.stepAcc > stride) {
        this.stepAcc = 0;
        game.sound(this.running ? 'stepRun' : 'step');
        game.noise(this.pos.x, this.pos.z, (this.running ? 9 : 2.2) * this.noiseMul);
      }
    }
    // батарейка
    if (this.lightOn) {
      this.battery = Math.max(0, this.battery - dt * cfg.drain);
      if (this.battery <= 0) {
        this.lightOn = false;
        game.sound('click');
        game.onBatteryEmpty();
      }
    }
    this.flashCd = Math.max(0, this.flashCd - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    this.shake = Math.max(0, this.shake - dt);
    this._camera(dt, game);
  }

  toggleLight(game) {
    if (!this.lightOn && this.battery <= 0.5) {
      game.sound('click');
      game.toast('battery');
      return;
    }
    this.lightOn = !this.lightOn;
    game.sound('click');
  }

  // вспышка: оглушает Жильца в луче
  flash(game) {
    if (this.flashCd > 0 || this.battery < 12) {
      game.sound('deny');
      return false;
    }
    this.battery -= 12;
    this.flashCd = 7;
    this.flashT = 0.35;
    this.lightOn = true;
    game.sound('flash');
    return true;
  }

  _camera(dt, game) {
    const c = this.cam;
    const bobY = this.hidden ? 0 : Math.sin(this.bob * 2) * 0.035;
    const bobX = this.hidden ? 0 : Math.cos(this.bob) * 0.025;
    const sh = this.shake > 0 ? this.shake * 0.08 : 0;
    c.position.set(this.pos.x + Math.cos(this.yaw) * bobX + (Math.random() - 0.5) * sh, EYE + bobY + (Math.random() - 0.5) * sh, this.pos.z - Math.sin(this.yaw) * bobX);
    if (this.hidden) {
      const h = this.hideSpot;
      c.position.set(h.x + Math.sin(h.ry) * 0.42, 1.5, h.z + Math.cos(h.ry) * 0.42);
    }
    c.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    // фонарь чуть справа-снизу и с лёгким запаздыванием
    const f = this.forward;
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.spot.position.copy(c.position).addScaledVector(right, 0.18).add(new THREE.Vector3(0, -0.2, 0));
    const tgt = this.spot.position.clone().addScaledVector(f, 5);
    if (!this._tgt) this._tgt = tgt.clone();
    this._tgt.lerp(tgt, Math.min(1, dt * 14));
    this.spot.target.position.copy(this._tgt);
    this.spill.position.copy(c.position);
    // яркость: мерцание на низком заряде и рядом с Жильцом
    let k = this.lightOn ? 1 : 0;
    const low = this.battery / this.batMax;
    if (this.lightOn && low < 0.15 && Math.random() < 0.08) k *= Math.random() * 0.5;
    if (this.lightOn && this.flicker > 0 && Math.random() < 0.3 * this.flicker) k *= Math.random() * 0.3;
    if (this.lightOn) k *= 0.55 + 0.45 * Math.min(1, low / 0.3 + 0.2);
    // вплотную к стене луч не пересвечивает
    if (this.lightOn && game.world) {
      let d = 0.3;
      while (d < 3 && !game.world.solid(Math.floor(c.position.x + f.x * d), Math.floor(c.position.z + f.z * d))) d += 0.25;
      const near = Math.max(0.3, Math.min(1, d / 2.6));
      this._near = this._near === undefined ? near : this._near + (near - this._near) * Math.min(1, dt * 8);
      k *= this._near;
    }
    if (this.flashT > 0) k = 5;
    this.spot.intensity = this.baseInt * k;
    this.spot.angle = this.flashT > 0 ? 0.75 : 0.5;
    this.spill.intensity = 0.55 * k;
    if (this.hidden) {
      this.spot.intensity *= 0.22;
      this.spill.intensity = 0;
    }
  }
}
