// 3D-студия капитал-шоу: сцена, барабан со стрелкой, задник, арки с лампочками, зрители, свет, камеры.
// Игровая логика живёт в game.js; студия только показывает: угол барабана, персонажей, планы камеры.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Char, buildChar, mat } from './chars.js';
import { HOST_DEF } from './roster.js';
import { SECTORS, SECTOR_DEG } from './data.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const DRUM_TOP = 1.15;
// места игроков за барабаном (слева направо для зрителя) и ведущего
const SLOT_R = 2.9;
const SLOT_A = [148, 90, 32].map((d) => (d * Math.PI) / 180);
export const SLOTS = SLOT_A.map((a) => V(Math.cos(a) * SLOT_R, 0, -Math.sin(a) * SLOT_R));
const HOST_POS = V(-3.35, 0, 1.05);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export class Studio {
  constructor(parent) {
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }));
    this.mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobile ? 1.6 : 1.75));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.domElement.id = 'gl';
    parent.prepend(r.domElement);
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color('#0a0c33');
    s.fog = new THREE.Fog('#0a0c33', 16, 34);
    const pm = new THREE.PMREMGenerator(r);
    s.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    s.environmentIntensity = 0.42;
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
    this.cam = { pos: V(0, 5, 10), look: V(0, 1.2, 0) };
    this.camT = { pos: this.cam.pos.clone(), look: this.cam.look.clone() };
    this.shotName = 'menu';
    this.focus = { x: 0.5, y: 0.5 };
    this.t = 0;
    this.chars = [null, null, null];
    this.blinkMats = [];
    this.buildLights();
    this.buildStage();
    this.buildDrum();
    this.buildAudience();
    this.instanceBulbs();
    this.host = new Char(HOST_DEF);
    this.host.root.position.copy(HOST_POS);
    this.host.root.rotation.y = Math.atan2(1.3 - HOST_POS.x, 2.2 - HOST_POS.z);
    this.host.setMood('host');
    s.add(this.host.root);
    this.shadowAll(this.host.root);
    this.lookTarget = null;
    this.clap = 0;
    this.resize();
  }

  // ---------- свет ----------
  buildLights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight('#9aa8ff', '#2a1440', 0.75));
    const key = new THREE.DirectionalLight('#fff0dc', 1.9);
    key.position.set(3, 10, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(this.mobile ? 1024 : 2048, this.mobile ? 1024 : 2048);
    Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 2, far: 30 });
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.02;
    s.add(key);
    const rim = new THREE.DirectionalLight('#7a8cff', 1.1);
    rim.position.set(-4, 7, -9);
    s.add(rim);
    const p1 = new THREE.PointLight('#ff4fb0', 18, 16, 2);
    p1.position.set(6, 3.5, 2);
    const p2 = new THREE.PointLight('#3ab8ff', 18, 16, 2);
    p2.position.set(-6, 3.5, 2);
    s.add(p1, p2);
    // прожектор на игроке, чей ход
    const sp = (this.spot = new THREE.SpotLight('#fff3d0', 0, 14, 0.32, 0.6, 1.5));
    sp.position.set(0, 9, 3);
    s.add(sp, sp.target);
  }

  // ---------- пол, задник, арки, лучи ----------
  buildStage() {
    const s = this.scene;
    const floorTex = canvasTex(1024, 1024, (g, w) => {
      const c = w / 2;
      const gr = g.createRadialGradient(c, c, 0, c, c, c);
      gr.addColorStop(0, '#2a2f8a');
      gr.addColorStop(0.55, '#1a1d66');
      gr.addColorStop(1, '#0c0e3c');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
      // лучи-«солнце»
      for (let i = 0; i < 32; i++) {
        g.save();
        g.translate(c, c);
        g.rotate((i / 32) * Math.PI * 2);
        g.fillStyle = i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(90,120,255,.06)';
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, c, -Math.PI / 32, Math.PI / 32);
        g.fill();
        g.restore();
      }
      for (const [rr, lw, col] of [[0.3, 10, '#f5c542'], [0.33, 3, '#ffe9a0'], [0.62, 8, '#f5c542'], [0.66, 3, '#ff5fae'], [0.94, 12, '#f5c542']]) {
        g.strokeStyle = col;
        g.lineWidth = lw;
        g.beginPath();
        g.arc(c, c, c * rr, 0, Math.PI * 2);
        g.stroke();
      }
      // звёздочки по кольцу
      g.fillStyle = '#ffe9a0';
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        g.beginPath();
        g.arc(c + Math.cos(a) * c * 0.8, c + Math.sin(a) * c * 0.8, 6, 0, Math.PI * 2);
        g.fill();
      }
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 96), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.32, metalness: 0.15 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    s.add(floor);
    const edge = new THREE.Mesh(new THREE.CylinderGeometry(9.05, 9.25, 0.25, 96, 1, true), mat('#f5c542', { r: 0.3, m: 0.8 }));
    edge.position.y = -0.1;
    s.add(edge);
    const outer = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshStandardMaterial({ color: '#07082a', roughness: 0.6 }));
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = -0.22;
    s.add(outer);
    // задник: полукруглая стена с вертикальными световыми полосами
    const wallTex = canvasTex(2048, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#060726');
      gr.addColorStop(0.6, '#1a1a6a');
      gr.addColorStop(1, '#2a1660');
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 48; i++) {
        const x = (i + 0.5) * (w / 48);
        const lg = g.createLinearGradient(0, h, 0, 0);
        const col = i % 3 === 0 ? '255,214,90' : i % 3 === 1 ? '120,160,255' : '255,110,190';
        lg.addColorStop(0, `rgba(${col},.55)`);
        lg.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = lg;
        g.fillRect(x - 6, 0, 12, h);
      }
      g.fillStyle = 'rgba(255,255,255,.5)';
      for (let i = 0; i < 260; i++) g.fillRect(Math.random() * w, Math.random() * h * 0.6, 2, 2);
    });
    wallTex.wrapS = THREE.RepeatWrapping;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 12, 64, 1, true, Math.PI / 2 + 0.1, Math.PI - 0.2), new THREE.MeshBasicMaterial({ map: wallTex, side: THREE.BackSide, fog: false }));
    wall.position.set(0, 5.6, -1);
    wall.rotation.y = Math.PI;
    s.add(wall);
    // «солнце» за барабаном: светящиеся кольца
    const sunM = new THREE.MeshBasicMaterial({ color: '#ffd45a', fog: false });
    const sunM2 = new THREE.MeshBasicMaterial({ color: '#ff6fbf', fog: false });
    for (const [rr, m] of [[3.2, sunM], [3.6, sunM2], [4.4, sunM]]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.06, 8, 96), m);
      ring.position.set(0, 4.2, -13.2);
      s.add(ring);
    }
    // арки с лампочками
    const gold = mat('#f5c542', { r: 0.28, m: 0.85 });
    const bulbA = new THREE.MeshStandardMaterial({ color: '#fff3b0', emissive: '#ffd45a', emissiveIntensity: 2 });
    const bulbB = new THREE.MeshStandardMaterial({ color: '#ffb08a', emissive: '#ff7a4a', emissiveIntensity: 0.6 });
    this.blinkMats = [bulbA, bulbB];
    const bulbG = (this.bulbG = new THREE.SphereGeometry(0.075, 10, 8));
    const arch = (cx, cz, rad, ry) => {
      const g = new THREE.Group();
      const tube = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.13, 10, 48, Math.PI), gold);
      g.add(tube);
      const n = Math.round(rad * 7);
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI;
        const b = new THREE.Mesh(bulbG, i % 2 ? bulbA : bulbB);
        b.position.set(Math.cos(a) * rad, Math.sin(a) * rad, 0.14);
        g.add(b);
      }
      g.position.set(cx, 0, cz);
      g.rotation.y = ry;
      s.add(g);
    };
    arch(0, -10.5, 6.2, 0);
    arch(0, -10.8, 7.4, 0);
    arch(-9.2, -3.5, 3.4, 0.9);
    arch(9.2, -3.5, 3.4, -0.9);
    // колонны по бокам с огнями
    for (const x of [-7.6, 7.6]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 7, 24), mat('#3a1650', { r: 0.4, m: 0.3 }));
      col.position.set(x, 3.5, -7.5);
      s.add(col);
      for (let k = 0; k < 9; k++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 6, 24), k % 2 ? bulbA : gold);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, 0.5 + k * 0.75, -7.5);
        s.add(ring);
      }
    }
    // лучи прожекторов
    const beamM = new THREE.MeshBasicMaterial({ color: '#fff2c8', transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const beamG = new THREE.ConeGeometry(1.6, 14, 24, 1, true);
    beamG.translate(0, -7, 0);
    this.beams = [];
    for (const [x, z, ph] of [[-6, -4, 0], [6, -4, 2], [-3, -8, 4], [3, -8, 1]]) {
      const b = new THREE.Mesh(beamG, beamM);
      b.position.set(x, 13, z);
      b.userData.ph = ph;
      s.add(b);
      this.beams.push(b);
    }
  }

  // ---------- барабан ----------
  buildDrum() {
    const s = this.scene;
    const d = (this.drum = new THREE.Group());
    s.add(d);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.3, 0.95, 72), mat('#5a0f2a', { r: 0.55 }));
    ped.position.y = 0.475;
    ped.castShadow = ped.receiveShadow = true;
    d.add(ped);
    const gold = mat('#f5c542', { r: 0.25, m: 0.85 });
    for (const [rr, y, t] of [[2.02, 0.95, 0.05], [2.3, 0.03, 0.06], [2.15, 0.48, 0.03]]) {
      const tr = new THREE.Mesh(new THREE.TorusGeometry(rr, t, 8, 96), gold);
      tr.rotation.x = Math.PI / 2;
      tr.position.y = y;
      d.add(tr);
    }
    const bulbG = new THREE.SphereGeometry(0.05, 10, 8);
    this.bulbG2 = bulbG;
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const b = new THREE.Mesh(bulbG, this.blinkMats[i % 2]);
      b.position.set(Math.cos(a) * 2.21, 0.25, Math.sin(a) * 2.21);
      d.add(b);
      const b2 = new THREE.Mesh(bulbG, this.blinkMats[(i + 1) % 2]);
      b2.position.set(Math.cos(a) * 2.08, 0.72, Math.sin(a) * 2.08);
      d.add(b2);
    }
    const rot = (this.rot = new THREE.Group());
    rot.position.y = 0.95;
    d.add(rot);
    this.rimMat = new THREE.MeshStandardMaterial({ color: '#7a4a1a', roughness: 0.45, metalness: 0.3 });
    const side = new THREE.Mesh(new THREE.CylinderGeometry(2.38, 2.34, 0.2, 96, 1, true), this.rimMat);
    side.position.y = 0.1;
    side.castShadow = true;
    rot.add(side);
    this.topMat = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.05 });
    const top = new THREE.Mesh(new THREE.CircleGeometry(2.38, 96), this.topMat);
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.2;
    top.receiveShadow = true;
    rot.add(top);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.38, 0.05, 8, 96), gold);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.2;
    rot.add(rim);
    // штырьки на границах секторов
    const pegG = new THREE.CylinderGeometry(0.028, 0.028, 0.12, 10);
    for (let i = 0; i < SECTORS.length; i++) {
      const a = ((i * SECTOR_DEG - 90) * Math.PI) / 180;
      const p = new THREE.Mesh(pegG, gold);
      p.position.set(Math.cos(a) * 2.26, 0.26, Math.sin(a) * 2.26);
      rot.add(p);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.16, 48), gold);
    hub.position.y = 0.28;
    hub.castShadow = true;
    rot.add(hub);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), mat('#d8343c', { r: 0.3, m: 0.3 }));
    knob.position.y = 0.38;
    knob.scale.y = 0.6;
    rot.add(knob);
    // стрелка (не вращается): спереди, указывает к центру
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.lineTo(-0.2, 0.62);
    sh.lineTo(0.2, 0.62);
    sh.closePath();
    const ag = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
    ag.rotateX(Math.PI / 2);
    const ptr = (this.ptr = new THREE.Group());
    ptr.position.set(0, DRUM_TOP + 0.1, 2.12);
    const arrow = new THREE.Mesh(ag, gold);
    arrow.castShadow = true;
    ptr.add(arrow);
    const inner = new THREE.Shape();
    inner.moveTo(0, 0.12);
    inner.lineTo(-0.09, 0.48);
    inner.lineTo(0.09, 0.48);
    inner.closePath();
    const ig = new THREE.ShapeGeometry(inner);
    ig.rotateX(-Math.PI / 2);
    const red = new THREE.Mesh(ig, mat('#d8343c', { r: 0.3 }));
    red.position.y = 0.025;
    ptr.add(red);
    d.add(ptr);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.55, 12), gold);
    post.position.set(0, 1.0, 2.62);
    d.add(post);
    this.ptrBase = 0;
    // кольцо под игроком, чей ход
    this.turnRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 48), new THREE.MeshBasicMaterial({ color: '#ffd45a' }));
    this.turnRing.rotation.x = -Math.PI / 2;
    this.turnRing.position.y = 0.03;
    this.turnRing.visible = false;
    s.add(this.turnRing);
  }

  // сотни лампочек → по одному InstancedMesh на материал и форму (меньше вызовов отрисовки на телефонах)
  instanceBulbs() {
    this.scene.updateMatrixWorld(true);
    const groups = new Map();
    const found = [];
    this.scene.traverse((o) => {
      if (o.isMesh && (o.geometry === this.bulbG || o.geometry === this.bulbG2)) found.push(o);
    });
    for (const o of found) {
      const k = o.geometry.uuid + o.material.uuid;
      if (!groups.has(k)) groups.set(k, { g: o.geometry, m: o.material, list: [] });
      groups.get(k).list.push(o.matrixWorld.clone());
      o.parent.remove(o);
    }
    for (const { g, m, list } of groups.values()) {
      const im = new THREE.InstancedMesh(g, m, list.length);
      list.forEach((mx, i) => im.setMatrixAt(i, mx));
      this.scene.add(im);
    }
  }

  setSkin(skin) {
    const tex = canvasTex(1024, 1024, (g, w) => {
      const c = w / 2, R = c * 0.985;
      g.translate(c, c);
      g.fillStyle = skin.rim;
      g.beginPath();
      g.arc(0, 0, R, 0, Math.PI * 2);
      g.fill();
      let ci = 0;
      const n = SECTORS.length;
      for (let i = 0; i < n; i++) {
        const v = SECTORS[i];
        let fill, ink, label;
        if (v === 'B') [fill, ink, label] = ['#15131c', '#fff', 'Б'];
        else if (v === '0') [fill, ink, label] = ['#f4f1ea', '#15131c', '0'];
        else if (v === 'P') [fill, ink, label] = ['#ffc83a', '#6a1d00', 'П'];
        else {
          fill = skin.cols[ci % skin.cols.length];
          ink = Array.isArray(skin.ink) ? skin.ink[ci % skin.ink.length] : skin.ink;
          ci++;
          label = v === '+' ? '+' : v === 'x2' ? '×2' : String(v);
        }
        const a0 = ((i * SECTOR_DEG - 90) * Math.PI) / 180, a1 = a0 + (SECTOR_DEG * Math.PI) / 180;
        g.fillStyle = fill;
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, R * 0.93, a0, a1);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(0,0,0,.35)';
        g.lineWidth = 3;
        g.stroke();
        const big = typeof v !== 'number';
        g.save();
        g.rotate((a0 + a1) / 2 + Math.PI / 2);
        g.translate(0, -R * (big ? 0.66 : 0.64));
        if (!big) g.rotate(-Math.PI / 2);
        g.fillStyle = ink;
        g.font = `800 ${big ? (label.length > 1 ? 82 : 100) : label.length > 3 ? 60 : 68}px Rubik, Arial, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineWidth = 3;
        g.strokeStyle = 'rgba(0,0,0,.18)';
        g.strokeText(label, 0, 0);
        g.fillText(label, 0, 0);
        g.restore();
      }
      const sh = g.createRadialGradient(0, 0, R * 0.6, 0, 0, R * 0.93);
      sh.addColorStop(0, 'rgba(0,0,0,0)');
      sh.addColorStop(1, 'rgba(0,0,0,.25)');
      g.fillStyle = sh;
      g.beginPath();
      g.arc(0, 0, R * 0.93, 0, Math.PI * 2);
      g.fill();
    });
    if (this.topMat.map) this.topMat.map.dispose();
    this.topMat.map = tex;
    this.topMat.needsUpdate = true;
    this.rimMat.color.set(skin.rim);
  }
  setDrumAngle(a) {
    this.rot.rotation.y = (-a * Math.PI) / 180;
  }
  flap() {
    this.flapT = 0.07;
  }
  setLit(on) {
    this.blinkMats[0].emissiveIntensity = on ? 2 : 0.6;
    this.blinkMats[1].emissiveIntensity = on ? 0.6 : 2;
    this.blinkMats[0].emissive.set(on ? '#ffd45a' : '#ff7a4a');
    this.blinkMats[1].emissive.set(on ? '#ff7a4a' : '#ffd45a');
  }

  // ---------- зрители ----------
  buildAudience() {
    const rows = [];
    for (const side of [-1, 1]) {
      for (let row = 0; row < 3; row++) {
        const rad = 11.2 + row * 1.1;
        for (let k = 0; k < 11; k++) {
          const a = (side > 0 ? -0.12 : Math.PI + 0.12) + side * -(0.05 + k * 0.085);
          rows.push({ x: Math.cos(a) * rad, z: -Math.sin(a) * rad * 0.8 + 1.5, y: 0.45 + row * 0.55, ph: Math.random() * 6 });
        }
      }
    }
    const n = rows.length;
    const bodyG = new THREE.CapsuleGeometry(0.22, 0.3, 4, 8);
    const headG = new THREE.SphereGeometry(0.18, 10, 8);
    this.aud = { rows, bodies: new THREE.InstancedMesh(bodyG, new THREE.MeshStandardMaterial({ roughness: 0.8 }), n), heads: new THREE.InstancedMesh(headG, new THREE.MeshStandardMaterial({ color: '#8a6a6a', roughness: 0.9 }), n) };
    const cols = ['#5a3a8a', '#3a5aa0', '#8a3a5a', '#3a7a6a', '#7a6a3a', '#4a4a6a'];
    rows.forEach((r, i) => this.aud.bodies.setColorAt(i, new THREE.Color(cols[i % cols.length])));
    this.scene.add(this.aud.bodies, this.aud.heads);
    // ступени трибун
    for (const side of [-1, 1]) for (let row = 0; row < 3; row++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.3, 1), mat('#1a1446', { r: 0.7 }));
      st.position.set(side * (10.4 + row * 0.9), row * 0.55 + 0.05, -2.9 - row * 0.5);
      st.rotation.y = side * -0.95;
      this.scene.add(st);
    }
    this.updAudience(0);
  }
  updAudience(dt) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = V(1, 1, 1);
    const { rows, bodies, heads } = this.aud;
    this.clap = Math.max(0, this.clap - dt);
    const k = Math.min(1, this.clap);
    rows.forEach((r, i) => {
      const j = k * Math.abs(Math.sin(this.t * 9 + r.ph)) * 0.12;
      m.compose(V(r.x, r.y + 0.35 + j, r.z), q, sc);
      bodies.setMatrixAt(i, m);
      m.compose(V(r.x, r.y + 0.85 + j, r.z), q, sc);
      heads.setMatrixAt(i, m);
    });
    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
  }
  applause(sec = 2) {
    this.clap = Math.max(this.clap, sec);
  }

  // ---------- персонажи ----------
  shadowAll(o) {
    o.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  }
  // defs: массив из 3 (или null на месте); показывает их у барабана
  setCast(defs, { appear = true } = {}) {
    for (const c of this.chars) if (c) this.scene.remove(c.root);
    this.chars = defs.map((d, i) => {
      if (!d) return null;
      const c = new Char(d);
      c.root.position.copy(SLOTS[i]);
      c.root.rotation.y = Math.atan2(0 - SLOTS[i].x, 7 - SLOTS[i].z);
      if (appear) {
        c.appear = -i * 0.35;
        c.body.scale.setScalar(0.01);
      }
      this.scene.add(c.root);
      return c;
    });
    this.setTurn(-1);
  }
  ch(i) {
    return i === 'host' ? this.host : this.chars[i];
  }
  anim(i, name, dur) {
    const c = this.ch(i);
    if (c) c.play(name, dur);
  }
  mood(i, m) {
    const c = this.ch(i);
    if (c) c.setMood(m);
  }
  talk(i, sec) {
    const c = this.ch(i);
    if (c) c.talk(sec);
  }
  clapOthers(i) {
    this.chars.forEach((c, k) => { if (c && k !== i && !c.mood) c.play('clap', 1.2 + Math.random() * 0.5); });
  }
  // все смотрят на: индекс игрока, 'host', 'cam', 'drum'
  lookAll(t) {
    this.lookTarget = t;
  }
  setTurn(i) {
    this.turn = i;
    const c = this.chars[i];
    this.turnRing.visible = !!c;
    this.spot.intensity = c ? 60 : 0;
    if (c) {
      this.turnRing.position.set(c.root.position.x, 0.03, c.root.position.z);
      this.spot.target.position.copy(c.root.position);
      this.spot.position.set(c.root.position.x * 0.6, 8.5, c.root.position.z + 4);
    }
  }

  // ---------- камера ----------
  shotOf(name, arg) {
    const look = (p, h = 1.5) => V(p.x, p.y + h, p.z);
    if (name === 'wide') return { pos: V(0, 5.0, 9.8), look: V(0, 1.55, -0.7) };
    if (name === 'menu') return { pos: V(0.6, 4.4, 9.6), look: V(-0.4, 1.6, -0.4) };
    if (name === 'drum') return { pos: V(0, 6.1, 4.6), look: V(0, 1.0, 0.55) };
    if (name === 'super') return { pos: V(0, 3.9, 7.0), look: V(0, 1.8, -1.4) };
    const c = arg === 'host' ? this.host : this.chars[arg];
    if (!c) return this.shotOf('wide');
    const p = c.root.position;
    const tgt = look(p, arg === 'host' ? 2.2 : 1.95);
    // «длинный объектив»: камера далеко, угол узкий — барабан не заслоняет игрока
    const dir = V(0 - p.x * 0.3, 0, 7.5 - p.z).normalize();
    const close = name === 'close';
    const pos = tgt.clone().addScaledVector(dir, close ? 8.5 : 10).add(V(0, close ? 2.2 : 3.4, 0));
    return { pos, look: close ? tgt.add(V(0, -0.1, 0)) : tgt.add(V(0, -0.55, 0)), zoom: close ? 2.6 : 2.0 };
  }
  shot(name, arg, cut = false) {
    this.shotName = name;
    this.shotArg = arg;
    const s = this.shotOf(name, arg);
    this.camT.pos.copy(s.pos);
    this.camT.look.copy(s.look);
    this.zoomT = s.zoom || 1;
    if (cut) {
      this.cam.pos.copy(s.pos);
      this.cam.look.copy(s.look);
      this.zoom = this.zoomT;
    }
  }
  // точка в экранных пикселях, куда ставится центр кадра (свободное от интерфейса место)
  setFocus(x, y, aw, ah) {
    this.focus = { x, y, aw, ah };
    this.applyView();
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.W = w;
    this.H = h;
    this.renderer.setSize(w, h);
    this.applyView();
  }
  applyView() {
    const { W: w, H: h } = this;
    const cam = this.camera;
    cam.aspect = w / h;
    // поле зрения подбирается под свободную область (ширина aw × высота ah в пикселях)
    const f = this.focus;
    const aw = f.aw || w, ah = f.ah || h;
    const need = Math.max(0.34, 0.6 / (aw / ah)) * (h / ah);
    const tanV = Math.min(0.75, need);
    this.dolly = need / tanV;
    this.baseTan = tanV;
    cam.fov = (2 * Math.atan(tanV / (this.zoom || 1)) * 180) / Math.PI;
    const ox = (f.x || w / 2) - w / 2, oy = (f.y || h / 2) - h / 2;
    cam.setViewOffset(w, h, -ox, -oy, w, h);
    cam.updateProjectionMatrix();
  }
  project(v) {
    const p = v.clone().project(this.camera);
    return { x: ((p.x + 1) / 2) * this.W, y: ((1 - p.y) / 2) * this.H, vis: p.z < 1 };
  }
  headPos(i) {
    const c = this.ch(i);
    if (!c) return null;
    const v = new THREE.Vector3();
    c.face.getWorldPosition(v);
    return v;
  }

  // ---------- кадр ----------
  update(dt) {
    this.t += dt;
    const k = 1 - Math.exp(-dt * 2.6);
    this.cam.pos.lerp(this.camT.pos, k);
    this.cam.look.lerp(this.camT.look, k);
    this.zoom = (this.zoom || 1) + ((this.zoomT || 1) - (this.zoom || 1)) * k;
    this.camera.fov = (2 * Math.atan(this.baseTan / this.zoom) * 180) / Math.PI;
    this.camera.updateProjectionMatrix();
    let pos = this.cam.pos;
    if (this.shotName === 'menu') {
      const a = Math.sin(this.t * 0.12) * 0.22;
      pos = pos.clone().sub(this.cam.look).applyAxisAngle(V(0, 1, 0), a).add(this.cam.look);
    }
    // в узком окне камера отъезжает, чтобы барабан и игроки помещались
    const off = pos.clone().sub(this.cam.look).multiplyScalar(this.dolly || 1);
    this.camera.position.copy(this.cam.look).add(off);
    this.camera.lookAt(this.cam.look);
    // лучи прожекторов покачиваются
    for (const b of this.beams) {
      const ph = b.userData.ph;
      b.rotation.z = Math.sin(this.t * 0.4 + ph) * 0.35;
      b.rotation.x = Math.cos(this.t * 0.33 + ph) * 0.2;
    }
    // стрелка подпрыгивает на штырьках
    this.flapT = Math.max(0, (this.flapT || 0) - dt);
    this.ptr.rotation.x = this.flapT > 0 ? -0.22 : this.ptr.rotation.x * 0.7;
    // взгляды
    const tgt = this.lookPoint();
    for (const c of this.chars) if (c) { c.lookAt = tgt; c.update(dt); }
    this.host.lookAt = this.turn >= 0 && this.chars[this.turn] ? this.chars[this.turn].root.position.clone() : V(1.5, 0, 3);
    if (this.shotName === 'close' && this.shotArg === 'host') this.host.lookAt = this.camera.position.clone();
    this.host.update(dt);
    this.updAudience(dt);
    if (this.turnRing.visible) this.turnRing.material.color.setHSL(0.13, 1, 0.55 + Math.sin(this.t * 6) * 0.12);
  }
  lookPoint() {
    const t = this.lookTarget;
    if (t === 'host') return this.host.root.position.clone();
    if (t === 'drum') return V(0, 0, 0.5);
    if (typeof t === 'number' && this.chars[t]) return this.chars[t].root.position.clone();
    return this.camera.position.clone();
  }
  render() {
    this.renderer.render(this.scene, this.camera);
  }

  // ---------- портреты (для табличек и выбора героя) ----------
  portrait(def) {
    this._pc = this._pc || {};
    if (this._pc[def.id]) return this._pc[def.id];
    if (!this._pr) {
      const r = (this._pr = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }));
      r.setSize(200, 200);
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.NeutralToneMapping;
      this._ps = new THREE.Scene();
      this._ps.add(new THREE.HemisphereLight('#ffffff', '#5a4a8a', 1.6));
      const l = new THREE.DirectionalLight('#fff4e0', 2.2);
      l.position.set(1.5, 3, 4);
      this._ps.add(l);
      const l2 = new THREE.DirectionalLight('#9ab0ff', 0.8);
      l2.position.set(-3, 1, -2);
      this._ps.add(l2);
      this._pcam = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    }
    const c = buildChar(def);
    const sc = (def.scale || 1) * 1.3;
    this._ps.add(c.root);
    c.armL.rotation.z = 0.15;
    c.armR.rotation.z = -0.15;
    const hy = 1.62 * sc;
    this._pcam.position.set(0.3, hy + 0.1, 2.0 * sc);
    this._pcam.lookAt(0, hy - 0.08, 0);
    this._pr.render(this._ps, this._pcam);
    const url = this._pr.domElement.toDataURL('image/png');
    this._ps.remove(c.root);
    this._pc[def.id] = url;
    return url;
  }
}
