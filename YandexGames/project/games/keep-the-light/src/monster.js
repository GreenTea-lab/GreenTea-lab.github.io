// Жилец: высокая фигура в тёмном балахоне с фарфоровой маской. Модель и поведение.
import * as THREE from 'three';
import { glow } from './tex.js';
import { ROOMS } from './map.js';

// ---------- модель ----------
export function monsterModel() {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: 0x17121c, roughness: 0.95 });
  const cloth2 = new THREE.MeshStandardMaterial({ color: 0x221a26, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x8a8090, roughness: 0.8 });
  const mask = new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.35 });
  const black = new THREE.MeshBasicMaterial({ color: 0x050305 });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xfff4d8, fog: false });
  // балахон: профиль вращения с рваным подолом
  const prof = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const y = t * 1.75;
    const r = 0.42 - t * 0.22 + Math.sin(t * 3.14) * 0.05 + (t > 0.85 ? -(t - 0.85) * 1.2 : 0);
    prof.push(new THREE.Vector2(Math.max(0.05, r), y));
  }
  const robeGeo = new THREE.LatheGeometry(prof, 18);
  // рваный край: подол неровный
  const p = robeGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) < 0.05) {
      const a = Math.atan2(p.getZ(i), p.getX(i));
      p.setY(i, Math.max(0, 0.02 + Math.abs(Math.sin(a * 5)) * 0.12));
    }
  }
  robeGeo.computeVertexNormals();
  const robe = new THREE.Mesh(robeGeo, cloth);
  g.add(robe);
  // складки
  for (let i = 0; i < 8; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.4, 0.05), cloth2);
    const a = (i / 8) * Math.PI * 2;
    f.position.set(Math.cos(a) * 0.33, 0.75, Math.sin(a) * 0.33);
    f.rotation.y = -a;
    f.rotation.z = Math.cos(a) * 0.12;
    f.rotation.x = Math.sin(a) * 0.12;
    g.add(f);
  }
  // плечи и капюшон
  const torso = new THREE.Group();
  torso.position.y = 1.75;
  g.add(torso);
  const sh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), cloth);
  sh.scale.set(1.25, 0.5, 0.8);
  torso.add(sh);
  const head = new THREE.Group();
  head.position.set(0, 0.32, 0.02);
  torso.add(head);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.8), cloth2);
  hood.material.side = THREE.DoubleSide;
  hood.scale.set(1, 1.25, 1.05);
  hood.rotation.x = -0.35;
  hood.position.z = -0.03;
  head.add(hood);
  // маска: вытянутый овал
  const mk = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 14, 0, Math.PI, 0, Math.PI), mask);
  mk.scale.set(0.95, 1.3, 0.8);
  mk.position.z = 0.05;
  head.add(mk);
  // пустые глазницы со светящимися точками
  const eyes = [];
  for (const sx of [-1, 1]) {
    const hole = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), black);
    hole.scale.set(1.2, 0.8, 0.5);
    hole.position.set(sx * 0.055, 0.035, 0.175);
    head.add(hole);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), eyeM);
    e.position.set(sx * 0.055, 0.035, 0.19);
    head.add(e);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow('255,236,200'), color: 0xfff0d0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.85 }));
    s.scale.set(0.12, 0.12, 1);
    s.position.set(sx * 0.055, 0.035, 0.2);
    head.add(s);
    eyes.push(s);
  }
  // трещина на маске и узкая щель рта
  const crack = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.12, 0.004), black);
  crack.position.set(0.07, 0.11, 0.165);
  crack.rotation.z = 0.5;
  head.add(crack);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.006, 0.01), black);
  mouth.position.set(0, -0.09, 0.15);
  head.add(mouth);
  // длинные руки с пальцами
  const arms = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(sx * 0.34, -0.02, 0.02);
    torso.add(arm);
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.55, 8), cloth);
    up.position.y = -0.27;
    arm.add(up);
    const fore = new THREE.Group();
    fore.position.y = -0.55;
    arm.add(fore);
    const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.55, 6), skin);
    lo.position.y = -0.27;
    fore.add(lo);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), skin);
    hand.position.y = -0.56;
    hand.scale.set(0.8, 1.3, 0.5);
    fore.add(hand);
    for (let i = 0; i < 4; i++) {
      const fg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.2, 4), skin);
      fg.position.set((i - 1.5) * 0.02, -0.68, 0.01);
      fg.rotation.x = 0.15;
      fore.add(fg);
    }
    arms.push({ arm, fore, sx });
  }
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  g.userData = { torso, head, arms, eyes, robe };
  return g;
}

// ---------- поведение ----------
export class Monster {
  constructor(world, cfg, scene, audio) {
    this.w = world;
    this.cfg = cfg;
    this.audio = audio;
    this.mesh = monsterModel();
    scene.add(this.mesh);
    this.pos = new THREE.Vector3();
    this.yaw = 0;
    this.state = 'idle';
    this.timer = cfg.grace;
    this.path = null;
    this.pi = 0;
    this.target = null;
    this.lastSeen = null;
    this.lostT = 0;
    this.seeT = 0; // сколько подряд видит игрока
    this.stepAcc = 0;
    this.sense = 0;
    this.repath = 0;
    this.doorWait = 0;
    this.walkPhase = 0;
    this.sawHideT = 9;
    this.speed = 0;
    this.spawnFar(new THREE.Vector3(21, 0, 17));
  }

  // дальняя от игрока комната
  farRoom(from) {
    const rooms = this.w.openRooms().filter((r) => r.type !== 'foyer');
    rooms.sort((a, b) => Math.hypot(b.x + b.w / 2 - from.x, b.y + b.h / 2 - from.z) - Math.hypot(a.x + a.w / 2 - from.x, a.y + a.h / 2 - from.z));
    return rooms[Math.floor(Math.random() * Math.min(2, rooms.length))];
  }

  spawnFar(from) {
    const r = this.farRoom(from);
    const c = this.w.randomCellIn(r);
    this.pos.set(c[0] + 0.5, 0, c[1] + 0.5);
    this.path = null;
  }

  get cx() {
    return Math.floor(this.pos.x);
  }
  get cz() {
    return Math.floor(this.pos.z);
  }

  goTo(x, z) {
    this.path = this.w.path(this.cx, this.cz, Math.floor(x), Math.floor(z));
    this.pi = 0;
    this.target = { x, z };
  }

  // услышал шум
  hear(x, z, radius) {
    if (this.state === 'idle' || this.state === 'stunned' || this.state === 'flee' || this.state === 'chase' || this.state === 'check') return;
    const d = Math.hypot(x - this.pos.x, z - this.pos.z);
    if (d > radius) return;
    this.state = 'investigate';
    this.timer = 12;
    this.goTo(x, z);
  }

  stun(t) {
    this.state = 'stunned';
    this.timer = t;
    this.path = null;
  }

  // после «второго шанса»
  banish(from) {
    this.spawnFar(from);
    this.state = 'idle';
    this.timer = 8;
  }

  _wanderTarget(player) {
    const rooms = this.w.openRooms();
    let r;
    if (Math.random() < this.cfg.bias) {
      // режиссёр: тянется к комнате игрока
      r = rooms.find((q) => player.pos.x >= q.x && player.pos.x < q.x + q.w && player.pos.z >= q.y && player.pos.z < q.y + q.h) || rooms[(Math.random() * rooms.length) | 0];
    } else r = rooms[(Math.random() * rooms.length) | 0];
    const c = this.w.randomCellIn(r);
    if (c) this.goTo(c[0] + 0.5, c[1] + 0.5);
  }

  canSee(player) {
    if (player.hidden) return false;
    const dx = player.pos.x - this.pos.x,
      dz = player.pos.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    let range = player.lightOn ? 12 : 5;
    if (player.running) range += 2;
    if (d > range) return false;
    // поле зрения ~120°, вплотную видит всегда; включённый фонарь заметен и сбоку
    const fx = Math.sin(this.yaw),
      fz = Math.cos(this.yaw);
    const dot = (dx * fx + dz * fz) / (d || 1);
    if (d > 2 && dot < 0.45 && !(player.lightOn && d < 7)) return false;
    return this.w.los(this.pos.x, this.pos.z, player.pos.x, player.pos.z);
  }

  update(dt, player, game) {
    const cfg = this.cfg;
    this.sawHideT += dt;
    this.sense -= dt;
    if (this.state !== 'idle' && this.state !== 'stunned' && this.sense <= 0) {
      this.sense = 0.12;
      const sees = this.canSee(player);
      if (sees) {
        this.seeT += 0.12;
        this.lastSeen = { x: player.pos.x, z: player.pos.z };
        // на дальней дистанции нужно мгновение, чтобы заметить
        const dd = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
        if (this.state !== 'chase' && (this.seeT > 0.35 || dd < 3) && this.state !== 'flee' && this.state !== 'check') {
          this.state = 'chase';
          this.repath = 0;
          game.onSpotted();
        }
        if (this.state === 'chase') this.lostT = 0;
      } else this.seeT = Math.max(0, this.seeT - 0.06);
    }
    let speed = 0;
    switch (this.state) {
      case 'idle':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'wander';
          this._wanderTarget(player);
        }
        break;
      case 'wander':
        speed = cfg.walk;
        if (!this.path || this.pi >= this.path.length) {
          // постоять, послушать
          this.timer -= dt;
          if (this.timer <= 0) {
            this.timer = 1 + Math.random() * 2.5;
            this._wanderTarget(player);
          }
          speed = 0;
        }
        break;
      case 'investigate':
        speed = cfg.walk * 1.45;
        this.timer -= dt;
        if (!this.path || this.pi >= this.path.length || this.timer <= 0) {
          this.state = 'search';
          this.timer = 5;
          this.path = null;
        }
        break;
      case 'search':
        speed = cfg.walk * 1.1;
        this.timer -= dt;
        if (!this.path || this.pi >= this.path.length) {
          const base = this.lastSeen || this.pos;
          const c = this.w.nearestWalk(Math.floor(base.x + (Math.random() - 0.5) * 7), Math.floor(base.z + (Math.random() - 0.5) * 7));
          if (c) this.goTo(c[0] + 0.5, c[1] + 0.5);
        }
        if (this.timer <= 0) {
          this.state = 'wander';
          this.timer = 0;
        }
        break;
      case 'chase': {
        speed = cfg.chase;
        this.repath -= dt;
        if (player.hidden) {
          // видел, как игрок залез в шкаф?
          if (this.sawHideT < 1.3 && player.hideSpot) {
            this.state = 'check';
            const h = player.hideSpot;
            this.goTo(h.front.x, h.front.z);
            break;
          }
          this.lostT = 99;
        }
        if (this.lostT === 0 && this.repath <= 0) {
          this.repath = 0.4;
          this.goTo(player.pos.x, player.pos.z);
        }
        this.lostT += dt;
        if (this.lostT > 0.2 && this.repath <= 0 && this.lastSeen) {
          this.repath = 1;
          this.goTo(this.lastSeen.x, this.lastSeen.z);
        }
        if (this.lostT > 4.5 || (this.lostT > 0.5 && (!this.path || this.pi >= this.path.length))) {
          this.state = 'search';
          this.timer = 7;
          this.path = null;
          game.onLost();
        }
        // поймал
        const d = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
        if (d < 0.9 && !player.hidden) game.caught(this);
        // прямой рывок, когда рядом и видно
        if (d < 2.2 && this.lostT < 0.3) this.direct = player.pos;
        else this.direct = null;
        break;
      }
      case 'check':
        speed = cfg.chase * 0.9;
        if (!this.path || this.pi >= this.path.length) {
          if (player.hidden && player.hideSpot) game.caught(this, true);
          else {
            this.state = 'search';
            this.timer = 6;
          }
        }
        break;
      case 'stunned':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.state = 'flee';
          this.timer = 7;
          const r = this.farRoom(player.pos);
          const c = this.w.randomCellIn(r);
          if (c) this.goTo(c[0] + 0.5, c[1] + 0.5);
        }
        break;
      case 'flee':
        speed = cfg.walk * 1.9;
        this.timer -= dt;
        if (this.timer <= 0 || !this.path || this.pi >= this.path.length) {
          this.state = 'wander';
          this.timer = 2;
          this.path = null;
        }
        break;
    }
    if (this.state !== 'chase') this.direct = null;
    this._move(dt, speed, game);
    this._animate(dt, speed);
  }

  _move(dt, speed, game) {
    if (this.doorWait > 0) {
      this.doorWait -= dt;
      speed = 0;
    }
    let tx, tz;
    if (this.direct) {
      tx = this.direct.x;
      tz = this.direct.z;
    } else if (this.path && this.pi < this.path.length) {
      const [px, pz, c] = this.path[this.pi];
      // закрытая дверь на пути — открыть
      if (this.w.g[c] === 2 && this.doorWait <= 0) {
        const o = this.w.doorAt(c % 42, (c / 42) | 0);
        if (o && !o.open && Math.hypot(px - this.pos.x, pz - this.pos.z) < 1.4) {
          this.w.toggleDoor(o, true);
          this.doorWait = this.state === 'chase' ? 0.35 : 0.7;
          game.sound('doorOpen', { x: px, z: pz });
          return;
        }
      }
      tx = px;
      tz = pz;
      if (Math.hypot(px - this.pos.x, pz - this.pos.z) < 0.3) this.pi++;
    } else {
      this.speed = 0;
      return;
    }
    const dx = tx - this.pos.x,
      dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.01) {
      const want = Math.atan2(dx, dz);
      let da = want - this.yaw;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      this.yaw += da * Math.min(1, dt * 7);
      // на поворотах притормаживает
      const k = Math.max(0.35, 1 - Math.abs(da) / 2);
      const step = Math.min(d, speed * k * dt);
      this.pos.x += (dx / d) * step;
      this.pos.z += (dz / d) * step;
      this.speed = speed * k;
    } else this.speed = 0;
    this.w.collide(this.pos, 0.3, true);
    // шаги
    this.stepAcc += this.speed * dt;
    const stride = this.state === 'chase' ? 0.95 : 0.8;
    if (this.stepAcc > stride) {
      this.stepAcc = 0;
      game.sound(this.state === 'chase' ? 'mStepFast' : 'mStep', { x: this.pos.x, z: this.pos.z });
    }
  }

  _animate(dt, speed) {
    const u = this.mesh.userData;
    this.walkPhase += dt * (1 + this.speed * 2.2);
    const ph = this.walkPhase;
    this.mesh.position.set(this.pos.x, Math.abs(Math.sin(ph * 2)) * 0.04 * Math.min(1, this.speed), this.pos.z);
    this.mesh.rotation.y = this.yaw;
    const chase = this.state === 'chase' || this.state === 'check';
    const stunned = this.state === 'stunned';
    u.torso.rotation.x = stunned ? -0.4 : chase ? 0.28 : 0.08;
    u.robe.rotation.z = Math.sin(ph * 2) * 0.03 * this.speed;
    // дёрганый наклон головы
    u.head.rotation.z = Math.sin(ph * 0.7) * 0.18 + (Math.sin(ph * 5.3) > 0.97 ? 0.3 : 0);
    u.head.rotation.x = chase ? -0.25 : 0.1;
    for (const a of u.arms) {
      if (chase) {
        a.arm.rotation.x = -1.1 + Math.sin(ph * 2 + a.sx) * 0.15;
        a.fore.rotation.x = -0.4;
      } else if (stunned) {
        a.arm.rotation.x = -2.2;
        a.fore.rotation.x = -0.8;
        a.arm.rotation.z = a.sx * 0.4;
      } else {
        a.arm.rotation.x = Math.sin(ph * 2 + (a.sx > 0 ? 0 : Math.PI)) * 0.25 * Math.min(1, this.speed);
        a.fore.rotation.x = -0.15;
        a.arm.rotation.z = a.sx * 0.08;
      }
    }
    for (const e of u.eyes) e.material.opacity = stunned ? 0.2 : chase ? 1 : 0.75;
  }

  dispose(scene) {
    scene.remove(this.mesh);
  }
}

export { ROOMS };
