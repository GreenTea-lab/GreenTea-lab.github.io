// 3D-сцена: окружение миров, блоки замка (инстансы), гоблины, катапульта, снаряды и эффекты
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeTextures } from './textures.js';
import * as M from './models.js';
import { hash } from './vox.js';
import { G, AMMO } from './physics.js';

export const PIVOT = [0, 1.1, -0.2];
export const BALL_R = 2.2;
export const REST_ANGLE = -1.9;
export const RELEASE_ANGLE = 0.67;

const WORLD_LOOK = [
  {
    sky: [0x6fbdf2, 0xdff2ff], glow: 0xfff3d6, fog: 0xd6eefc, hemi: [0xffffff, 0x8aa070, 1.35], sun: [0xfff1d8, 2.5], sunPos: [-22, 34, -18],
    trees: ['round', 'round', 'pine'], bush: 0x4fa83f, mount: 0x7a9a6a, snow: true, top: 0x6db34e,
  },
  {
    sky: [0xf08a50, 0xffe0b8], glow: 0xffd090, fog: 0xf6d2b0, hemi: [0xffd8b0, 0x7a6a50, 1.2], sun: [0xffb878, 2.7], sunPos: [-34, 20, -14],
    trees: ['autumn', 'autumn', 'pine'], bush: 0xb08a3a, mount: 0x9a7a5a, snow: false, top: 0xa8a44e,
  },
  {
    sky: [0x7ea2ea, 0xe6efff], glow: 0xf0f6ff, fog: 0xdde8fa, hemi: [0xf4f8ff, 0x9aaccc, 1.4], sun: [0xeef4ff, 2.2], sunPos: [-18, 30, -22],
    trees: ['snowpine', 'snowpine', 'snowpine'], bush: 0xdfeaf8, mount: 0x8a9ab8, snow: true, top: 0xf4f8ff,
  },
];

export class Scene3D {
  constructor(canvas, quality = 'high') {
    this.quality = quality;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance', preserveDrawingBuffer: !!window.__CW_DEBUG }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : quality === 'mid' ? 1.5 : 1));
    r.shadowMap.enabled = quality !== 'low';
    r.shadowMap.type = THREE.PCFShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.T = makeTextures();
    const s = (this.scene = new THREE.Scene());
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.3, 500);
    s.fog = new THREE.Fog(0xd6eefc, 70, 260);

    // небо
    this.skyU = { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, glow: { value: new THREE.Color() } };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(400, 24, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: this.skyU,
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 glow; varying vec3 vP; void main(){ float h = clamp(vP.y*1.1+0.1,0.0,1.0); vec3 c = mix(bottom, top, pow(h, 0.7)); float s = max(dot(normalize(vP), normalize(sunDir)), 0.0); c += glow * (pow(s, 5.0) * 0.4 + pow(s, 80.0) * 0.8); gl_FragColor = vec4(c,1.0); }',
      }),
    );
    sky.renderOrder = -10;
    s.add(sky);
    this.sky = sky;

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x88aa77, 1.3);
    s.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight(0xffffff, 2.4));
    sun.castShadow = r.shadowMap.enabled;
    const sm = quality === 'high' ? 2048 : 1024;
    sun.shadow.mapSize.set(sm, sm);
    const sc = sun.shadow.camera;
    sc.left = -20;
    sc.right = 20;
    sc.top = 22;
    sc.bottom = -16;
    sc.near = 1;
    sc.far = 140;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    sun.target.position.set(0, 0, 16);
    s.add(sun, sun.target);

    this.voxMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.env = null;
    this.blockMats = new Map();
    this.level = null;
    this.shake = 0;
    this.time = 0;

    this._initFx();
    this._initCatapult('classic');
    this._initAimUI();
  }

  // ---------- материалы блоков с трещинами и вспышкой ----------
  _blockMat(map) {
    if (this.blockMats.has(map)) return this.blockMats.get(map);
    const m = new THREE.MeshLambertMaterial({ map });
    const cr = this.T.cracks;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.crackMap = { value: cr };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aCrack;\nattribute float aFlash;\nvarying float vCrack;\nvarying float vFlash;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCrack = aCrack;\nvFlash = aFlash;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D crackMap;\nvarying float vCrack;\nvarying float vFlash;')
        .replace(
          '#include <map_fragment>',
          '#include <map_fragment>\nfloat crk = texture2D(crackMap, vMapUv * 0.5).r;\ndiffuseColor.rgb *= 1.0 - crk * vCrack * 0.8 - vCrack * 0.12;\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.95, 0.85), vFlash * 0.7);',
        );
    };
    m.customProgramCacheKey = () => 'blk';
    this.blockMats.set(map, m);
    return m;
  }

  _matsFor(mat, shape, size) {
    const T = this.T;
    const tall = size[1] > Math.max(size[0], size[2]) * 1.3;
    const base = { wood: tall ? T.woodV : T.wood, stone: T.stone, ice: T.ice, metal: T.metal, tnt: T.tnt, straw: T.straw }[mat];
    if (shape === 'cyl') {
      if (mat === 'tnt') return [this._blockMat(T.tnt), this._blockMat(T.wood), this._blockMat(T.wood)];
      return [this._blockMat(base), this._blockMat(mat === 'wood' ? T.wood : base), this._blockMat(mat === 'wood' ? T.wood : base)];
    }
    if (shape === 'roof') {
      const top = mat === 'wood' ? T.shingleRed : mat === 'stone' ? T.shingleBlue : base;
      return [this._blockMat(top), this._blockMat(mat === 'wood' ? T.wood : base)];
    }
    return this._blockMat(base);
  }

  _geoFor(shape, size) {
    const [w, h, d] = size;
    let g;
    if (shape === 'cyl') {
      g = new THREE.CylinderGeometry(w / 2, w / 2, h, 14, 1);
      const uv = g.attributes.uv;
      const sideVerts = 15 * 2; // (сегменты+1) x (высота+1): боковые вершины идут первыми
      for (let i = 0; i < uv.count; i++) {
        const isSide = i < sideVerts;
        if (isSide) uv.setXY(i, uv.getX(i) * Math.PI * w, uv.getY(i) * h);
        else uv.setXY(i, uv.getX(i) * w, uv.getY(i) * w);
      }
    } else if (shape === 'roof') {
      g = roofGeo(w, h, d);
    } else {
      g = new THREE.BoxGeometry(w, h, d);
      const uv = g.attributes.uv;
      const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      const ou = hash(Math.round(w * 10), Math.round(h * 10), Math.round(d * 10));
      for (let f = 0; f < 6; f++)
        for (let i = 0; i < 4; i++) {
          const k = f * 4 + i;
          uv.setXY(k, uv.getX(k) * dims[f][0] + ou, uv.getY(k) * dims[f][1] + ou * 0.5);
        }
    }
    return g;
  }

  // ---------- уровень ----------
  loadLevel(P, lv) {
    this.clearLevel();
    const L = (this.level = { group: new THREE.Group(), meshes: [], slot: new Map(), enemies: new Map(), projs: new Map(), rocks: [], fires: new Map() });
    this.scene.add(L.group);
    // скалы
    const top = WORLD_LOOK[lv.world].top;
    for (const r of lv.rocks) {
      const [w, h, d] = r.size;
      const g = new THREE.BoxGeometry(w, h, d);
      const uv = g.attributes.uv;
      const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) uv.setXY(f * 4 + i, uv.getX(f * 4 + i) * dims[f][0], uv.getY(f * 4 + i) * dims[f][1]);
      const sideM = new THREE.MeshLambertMaterial({ map: this.T.rock });
      const topM = new THREE.MeshLambertMaterial({ map: this.T.grass[['valley', 'rocks', 'ice'][lv.world]] });
      const m = new THREE.Mesh(g, [sideM, sideM, topM, sideM, sideM, sideM]);
      m.position.set(...r.pos);
      m.castShadow = m.receiveShadow = true;
      L.group.add(m);
      L.rocks.push(m);
      // травяной козырёк
      const lip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.18, d + 0.12), new THREE.MeshLambertMaterial({ color: top }));
      lip.position.set(r.pos[0], r.pos[1] + h / 2 - 0.08, r.pos[2]);
      lip.receiveShadow = true;
      L.group.add(lip);
    }
    // блоки: инстансы по одинаковой форме
    const groups = new Map();
    for (const o of P.objs.values()) {
      if (o.kind !== 'block') continue;
      const key = `${o.mat}|${o.shape}|${o.size.map((v) => v.toFixed(2)).join(',')}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(o);
    }
    for (const [, list] of groups) {
      const o0 = list[0];
      const geo = this._geoFor(o0.shape, o0.size);
      const n = list.length;
      geo.setAttribute('aCrack', new THREE.InstancedBufferAttribute(new Float32Array(n), 1));
      geo.setAttribute('aFlash', new THREE.InstancedBufferAttribute(new Float32Array(n), 1));
      const mesh = new THREE.InstancedMesh(geo, this._matsFor(o0.mat, o0.shape, o0.size), n);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      list.forEach((o, i) => L.slot.set(o.id, { mesh, i, flash: 0 }));
      L.meshes.push(mesh);
      L.group.add(mesh);
    }
    for (const o of P.objs.values()) if (o.kind === 'enemy') this.addEnemy(o);
    this._camp(lv);
    this.sync(P, 0);
  }

  // лагерь гоблинов вокруг замка: флаги, шатры, ящики, костёр, трава
  _camp(lv) {
    const L = this.level;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const b of lv.blocks.concat(lv.rocks)) {
      x0 = Math.min(x0, b.pos[0] - b.size[0] / 2);
      x1 = Math.max(x1, b.pos[0] + b.size[0] / 2);
      z0 = Math.min(z0, b.pos[2] - b.size[2] / 2);
      z1 = Math.max(z1, b.pos[2] + b.size[2] / 2);
    }
    const W = WORLD_LOOK[lv.world];
    const geos = [];
    const put = (vox, size, x, z, rot = 0, cx = 0, cz = 0) => {
      const g = vox.build(size, cx, cz).geo;
      if (!g) return;
      g.rotateY(rot);
      g.translate(x, 0, z);
      geos.push(g);
    };
    const seed = lv.index * 7 + 3;
    put(M.goblinFlag(seed), 0.1, x0 - 1.6, z0 + 0.5, 0.3);
    put(M.goblinFlag(seed + 1), 0.1, x1 + 1.6, z0 + 0.5, -0.3);
    put(M.tent(seed), 0.12, x0 - 3.6 - hash(seed, 1) * 2, z1 + 2.5, 0.5);
    put(M.tent(seed + 1), 0.12, x1 + 3.4 + hash(seed, 2) * 2, z1 + 1.5, -0.6);
    put(M.crates(seed), 0.12, x1 + 2.2, (z0 + z1) / 2, 0.2);
    if (seed % 2) put(M.crates(seed + 1), 0.12, x0 - 2.6, (z0 + z1) / 2 + 1, -0.4);
    const fx = (x0 + x1) / 2 + (hash(seed, 3) - 0.5) * 4;
    const fz = z1 + 3.2;
    put(M.campfire(), 0.12, fx, fz, 0);
    L.campfire = { x: fx, z: fz };
    // трава и цветы
    const tuft = lv.world === 2 ? 0xdfe8f4 : lv.world === 1 ? 0xa8a44e : 0x5cb848;
    for (let i = 0; i < 40; i++) {
      const x = (hash(seed, i, 4) - 0.5) * 34;
      const z = 6 + hash(seed, i, 5) * 34;
      if (x > x0 - 1 && x < x1 + 1 && z > z0 - 1 && z < z1 + 1) continue;
      if (Math.abs(x) < 2 && z < z0) continue;
      put(M.grassTuft(seed + i, tuft), 0.08, x, z, hash(i, 6) * 6);
    }
    const m = new THREE.Mesh(mergeGeometries(geos), this.voxMat);
    m.castShadow = true;
    m.receiveShadow = true;
    L.group.add(m);
  }

  clearLevel() {
    const L = this.level;
    if (!L) return;
    this.scene.remove(L.group);
    L.group.traverse((m) => {
      if (m.geometry && !m.userData.shared) m.geometry.dispose();
    });
    for (const f of L.fires.values()) f.length = 0;
    this.level = null;
    this.fx.clear();
    this.debrisN = 0;
    this.debris.length = 0;
  }

  addEnemy(o) {
    const L = this.level;
    if (!this._enemyGeo) this._enemyGeo = {};
    const s = o.type === 'king' ? 0.125 : 0.075;
    if (!this._enemyGeo[o.type]) {
      const g = M.goblin(o.type).build(s, 4, 4).geo;
      g.userData = {};
      this._enemyGeo[o.type] = g;
    }
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xff3020, emissiveIntensity: 0 });
    const mesh = new THREE.Mesh(this._enemyGeo[o.type], mat);
    mesh.userData.shared = true;
    mesh.castShadow = true;
    mesh.position.y = -o.size[1] / 2;
    const grp = new THREE.Group();
    grp.add(mesh);
    grp.userData.enemy = o.id;
    L.group.add(grp);
    L.enemies.set(o.id, { grp, mesh, flash: 0, phase: Math.random() * 6 });
  }

  addProj(o) {
    const L = this.level;
    if (!this._projGeo) this._projGeo = {};
    if (!this._projGeo[o.type]) this._projGeo[o.type] = M.projectile(o.type).build(0.1, 0.5, 0.5).geo;
    const mesh = new THREE.Mesh(this._projGeo[o.type], this.voxMat);
    mesh.userData.shared = true;
    mesh.castShadow = true;
    const k = o.r / 0.38;
    mesh.scale.setScalar(k);
    mesh.position.y = 0;
    const grp = new THREE.Group();
    const inner = new THREE.Group();
    inner.add(mesh);
    mesh.position.y = -0.05 * k;
    grp.add(inner);
    L.group.add(grp);
    L.projs.set(o.id, { grp, o });
  }

  removeObj(o) {
    const L = this.level;
    if (!L) return;
    const sl = L.slot.get(o.id);
    if (sl) {
      sl.mesh.setMatrixAt(sl.i, ZERO);
      sl.mesh.instanceMatrix.needsUpdate = true;
      L.slot.delete(o.id);
    }
    const e = L.enemies.get(o.id);
    if (e) {
      L.group.remove(e.grp);
      L.enemies.delete(o.id);
    }
    const p = L.projs.get(o.id);
    if (p) {
      L.group.remove(p.grp);
      L.projs.delete(o.id);
    }
  }

  flashObj(o, k = 1) {
    const L = this.level;
    if (!L) return;
    const sl = L.slot.get(o.id);
    if (sl) sl.flash = Math.max(sl.flash, k);
    const e = L.enemies.get(o.id);
    if (e) e.flash = Math.max(e.flash, k);
  }

  sync(P, dt) {
    const L = this.level;
    if (!L) return;
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    const touched = new Set();
    for (const [id, sl] of L.slot) {
      const o = P.objs.get(id);
      if (!o) continue;
      const t = o.body.translation();
      const r = o.body.rotation();
      m4.compose(v.set(t.x, t.y, t.z), q.set(r.x, r.y, r.z, r.w), one);
      sl.mesh.setMatrixAt(sl.i, m4);
      const g = sl.mesh.geometry;
      g.attributes.aCrack.array[sl.i] = Math.max(0, Math.min(1, 1 - o.hp / o.maxHp)) * (o.hp < o.maxHp * 0.9 ? 1 : 0);
      sl.flash = Math.max(0, sl.flash - dt * 5);
      g.attributes.aFlash.array[sl.i] = sl.flash;
      touched.add(sl.mesh);
    }
    for (const m of L.meshes) {
      m.instanceMatrix.needsUpdate = true;
      m.geometry.attributes.aCrack.needsUpdate = true;
      m.geometry.attributes.aFlash.needsUpdate = true;
    }
    for (const [id, e] of L.enemies) {
      const o = P.objs.get(id);
      if (!o) continue;
      const t = o.body.translation();
      const r = o.body.rotation();
      e.grp.position.set(t.x, t.y, t.z);
      e.grp.quaternion.set(r.x, r.y, r.z, r.w);
      e.phase += dt * 3;
      const b = 1 + Math.sin(e.phase) * 0.03;
      e.mesh.scale.set(1 / Math.sqrt(b), b, 1 / Math.sqrt(b));
      e.flash = Math.max(0, e.flash - dt * 4);
      e.mesh.material.emissiveIntensity = e.flash * 0.9;
    }
    for (const [id, p] of L.projs) {
      const o = P.objs.get(id);
      if (!o) {
        L.group.remove(p.grp);
        L.projs.delete(id);
        continue;
      }
      const t = o.body.translation();
      const r = o.body.rotation();
      p.grp.position.set(t.x, t.y, t.z);
      p.grp.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }

  // ---------- катапульта ----------
  // катапульта строится дважды: в мире (видна в меню, облёте и осмотре)
  // и на переднем плане при прицеливании (отдельная сцена поверх, как оружие в шутерах)
  _makeCat(skin, shadows, noFlag = false) {
    const { base, arm } = M.catapult(skin, noFlag);
    const grp = new THREE.Group();
    const bm = new THREE.Mesh(base.build(0.1, 0.5, 0.5).geo, this.voxMat);
    bm.castShadow = bm.receiveShadow = shadows;
    grp.add(bm);
    const pivot = new THREE.Group();
    pivot.position.set(...PIVOT);
    const am = new THREE.Mesh(arm.build(0.1, 0, 0).geo, this.voxMat);
    am.castShadow = shadows;
    am.position.set(0.05, 0, 0.05);
    pivot.add(am);
    const ball = new THREE.Group();
    ball.position.set(0, BALL_R, 0);
    pivot.add(ball);
    grp.add(pivot);
    pivot.rotation.x = REST_ANGLE;
    return { grp, pivot, ball, ballMesh: null };
  }

  _initCatapult(skin) {
    if (this.cat) this.scene.remove(this.cat.grp);
    if (this.vm && this.vm.cat) this.vm.scene.remove(this.vm.cat.grp);
    this.cat = Object.assign(this._makeCat(skin, true), { angle: REST_ANGLE, skin });
    this.scene.add(this.cat.grp);
    if (!this.vm) {
      const sc = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
      const hemi = new THREE.HemisphereLight(0xffffff, 0x88aa77, 1.4);
      const sun = new THREE.DirectionalLight(0xffffff, 2.2);
      sun.position.set(-3, 6, -4);
      sc.add(hemi, sun);
      this.vm = { scene: sc, cam, hemi, sun, show: false };
    }
    this.vm.cat = this._makeCat(skin, false, true);
    this.vm.scene.add(this.vm.cat.grp);
    this.layoutVm();
  }

  // положение катапульты на переднем плане: внизу экрана, чуть левее центра
  layoutVm() {
    const vm = this.vm;
    if (!vm) return;
    const aspect = this.camera.aspect || 16 / 9;
    const portrait = aspect < 1;
    vm.cam.aspect = aspect;
    vm.cam.fov = portrait ? 50 : 40;
    vm.cam.updateProjectionMatrix();
    vm.cam.position.set(portrait ? 1.2 : 2.4, 3.6, portrait ? -7.2 : -6.6);
    vm.cam.lookAt(portrait ? 0.6 : 1.3, 2.3, 4);
  }

  showVm(on) {
    if (!this.vm) return;
    this.vm.show = on;
    // настоящая катапульта в мире прячется, чтобы не было двойника
    this.cat.grp.visible = !on;
  }

  setSkin(skin) {
    if (this.cat && this.cat.skin === skin) return;
    const ballType = this.cat && this.cat.ballType;
    this._initCatapult(skin);
    if (ballType) this.setBall(ballType);
    this.showVm(this.vm.show);
  }

  // разворот катапульты в сторону прицела
  setYaw(a) {
    this.cat.grp.rotation.y = a;
  }

  setArm(a) {
    this.cat.angle = a;
    this.cat.pivot.rotation.x = a;
    if (this.vm) this.vm.cat.pivot.rotation.x = a;
  }

  setBall(type) {
    this.cat.ballType = type;
    for (const c of [this.cat, this.vm && this.vm.cat]) {
      if (!c) continue;
      if (c.ballMesh) c.ball.remove(c.ballMesh);
      c.ballMesh = null;
      if (!type) continue;
      if (!this._projGeo) this._projGeo = {};
      if (!this._projGeo[type]) this._projGeo[type] = M.projectile(type).build(0.1, 0.5, 0.5).geo;
      const m = new THREE.Mesh(this._projGeo[type], this.voxMat);
      m.castShadow = c === this.cat;
      m.scale.setScalar(AMMO[type].r / 0.38);
      c.ball.add(m);
      c.ballMesh = m;
    }
  }

  // ---------- прицел ----------
  _initAimUI() {
    const n = 40;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(n), 1));
    this.traj = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { map: { value: this.T.dot }, scale: { value: 400 } },
        vertexShader: 'attribute float alpha; varying float vA; uniform float scale; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = 0.22*scale/-mv.z; gl_Position = projectionMatrix*mv; vA = alpha; }',
        fragmentShader: 'uniform sampler2D map; varying float vA; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(1.0,1.0,1.0, t.a*vA); if (gl_FragColor.a < 0.02) discard; }',
      }),
    );
    this.traj.frustumCulled = false;
    this.traj.visible = false;
    this.traj.renderOrder = 5;
    this.scene.add(this.traj);
    // перекрестие
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.58, 28), new THREE.MeshBasicMaterial({ color: 0xff5a3c, transparent: true, opacity: 0.95, depthTest: false, side: THREE.DoubleSide }));
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
    const cross = new THREE.Group();
    cross.add(ring, dot);
    for (let i = 0; i < 4; i++) {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.32), ring.material);
      const a = (i * Math.PI) / 2;
      t.position.set(Math.cos(a) * 0.76, Math.sin(a) * 0.76, 0);
      t.rotation.z = a + Math.PI / 2;
      cross.add(t);
    }
    cross.renderOrder = 10;
    cross.traverse((m) => (m.renderOrder = 10));
    cross.visible = false;
    this.cross = cross;
    this.scene.add(cross);
  }

  showAim(points, target, ok) {
    const n = 40;
    const pos = this.traj.geometry.attributes.position;
    const al = this.traj.geometry.attributes.alpha;
    for (let i = 0; i < n; i++) {
      const p = points[Math.min(points.length - 1, i)] || [0, -100, 0];
      pos.setXYZ(i, p[0], p[1], p[2]);
      al.setX(i, i < points.length ? 0.95 * (1 - (i / n) * 0.6) : 0);
    }
    pos.needsUpdate = al.needsUpdate = true;
    this.traj.visible = true;
    this.cross.visible = true;
    this.cross.position.set(target[0], target[1], target[2]);
    this.cross.quaternion.copy(this.camera.quaternion);
    const d = this.camera.position.distanceTo(this.cross.position);
    this.cross.scale.setScalar(Math.max(0.25, d * Math.tan((this.camera.fov * Math.PI) / 360) * 0.075));
    this.cross.children[0].material.color.setHex(ok ? 0xff5a3c : 0x888888);
  }

  hideAim() {
    this.traj.visible = false;
    this.cross.visible = false;
  }

  raycast(nx, ny) {
    const rc = (this._rc ||= new THREE.Raycaster());
    rc.setFromCamera({ x: nx, y: ny }, this.camera);
    const L = this.level;
    const list = [];
    if (L) {
      for (const m of L.meshes) {
        m.computeBoundingSphere();
        list.push(m);
      }
      for (const e of L.enemies.values()) list.push(e.mesh);
      list.push(...L.rocks);
    }
    if (this.groundMesh) list.push(this.groundMesh);
    this._aimList = list;
    const hits = rc.intersectObjects(list, false);
    for (const h of hits) {
      if (h.point.z < 6) continue; // слишком близко к катапульте
      return h.point;
    }
    return null;
  }

  // пересечение отрезка траектории с замком/землёй
  segmentHit(a, b) {
    const rc = (this._rc2 ||= new THREE.Raycaster());
    const A = new THREE.Vector3(a[0], a[1], a[2]);
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = d.length();
    rc.set(A, d.normalize());
    rc.far = len;
    const h = rc.intersectObjects(this._aimList || [], false);
    return h[0] ? h[0].point : null;
  }

  // ---------- окружение ----------
  setWorld(wi) {
    if (this.worldIndex === wi && this.env) return;
    this.worldIndex = wi;
    if (this.env) {
      this.scene.remove(this.env);
      this.env.traverse((m) => m.geometry && m.geometry.dispose());
    }
    const W = WORLD_LOOK[wi];
    this.look = W;
    this.skyU.top.value.setHex(W.sky[0]);
    this.skyU.bottom.value.setHex(W.sky[1]);
    this.skyU.glow.value.setHex(W.glow);
    this.skyU.sunDir.value.set(...W.sunPos).normalize();
    this.scene.fog.color.setHex(W.fog);
    this.hemi.color.setHex(W.hemi[0]);
    this.hemi.groundColor.setHex(W.hemi[1]);
    this.hemi.intensity = W.hemi[2];
    this.sun.color.setHex(W.sun[0]);
    this.sun.intensity = W.sun[1];
    this.sun.position.set(W.sunPos[0], W.sunPos[1], 16 + W.sunPos[2]);
    if (this.vm) {
      this.vm.hemi.color.setHex(W.hemi[0]);
      this.vm.hemi.groundColor.setHex(W.hemi[1]);
      this.vm.hemi.intensity = W.hemi[2];
      this.vm.sun.color.setHex(W.sun[0]);
      this.vm.sun.intensity = W.sun[1] * 0.9;
    }

    const env = (this.env = new THREE.Group());
    // земля
    const gg = new THREE.PlaneGeometry(600, 600);
    gg.rotateX(-Math.PI / 2);
    const uv = gg.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 300, uv.getY(i) * 300);
    const ground = new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ map: this.T.grass[['valley', 'rocks', 'ice'][wi]] }));
    ground.receiveShadow = true;
    env.add(ground);
    this.groundMesh = ground;
    // тропинка от катапульты
    const path = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 12), new THREE.MeshLambertMaterial({ color: wi === 2 ? 0xd8e4f4 : 0xb89a6a, transparent: true, opacity: 0.55 }));
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.01, -1);
    path.receiveShadow = true;
    env.add(path);

    // декор: деревья, кусты, валуны, горы — всё в одну геометрию
    const geos = [];
    const put = (vox, size, x, y, z, rot = 0, cx = 0, cz = 0) => {
      const g = vox.build(size, cx, cz).geo;
      if (!g) return;
      g.rotateY(rot);
      g.translate(x, y, z);
      geos.push(g);
    };
    const free = (x, z) => !(Math.abs(x) < 15 && z > -14 && z < 46);
    let k = 0;
    for (let i = 0; i < 240 && k < 70; i++) {
      const a = hash(i, 1, wi) * Math.PI * 2;
      const r = 20 + hash(i, 2, wi) * 60;
      const x = Math.sin(a) * r;
      const z = 22 + Math.cos(a) * r;
      if (!free(x, z) || z < -30) continue;
      const kind = W.trees[i % 3];
      put(M.tree(i + wi * 100, kind), 0.32, x, 0, z, hash(i, 3) * 6, 0.5, 0.5);
      k++;
    }
    for (let i = 0; i < 60; i++) {
      const x = (hash(i, 5, wi) - 0.5) * 90;
      const z = -20 + hash(i, 6, wi) * 90;
      if (!free(x, z) && !(Math.abs(x) > 9 && z < 2)) continue;
      if (i % 3 === 0) put(M.boulder(i, W.top), 0.3, x, 0, z, hash(i, 7) * 6);
      else put(M.bush(i, W.bush), 0.3, x, 0, z, 0);
    }
    for (let i = 0; i < 14; i++) {
      const a = -1.5 + (i / 13) * 3;
      const r = 170 + hash(i, 8, wi) * 40;
      put(M.mountain(i + wi * 50, W.snow, W.mount), 3.2, Math.sin(a) * r, -1, 22 + Math.cos(a) * r, 0);
    }
    if (wi === 2) for (let i = 0; i < 16; i++) {
      const x = (hash(i, 9) - 0.5) * 70;
      const z = 45 + hash(i, 10) * 30;
      put(M.crystal(i), 0.3, x, 0, z, hash(i, 11) * 3);
    }
    const merged = mergeGeometries(geos);
    const deco = new THREE.Mesh(merged, this.voxMat);
    deco.castShadow = this.quality === 'high';
    deco.receiveShadow = true;
    env.add(deco);
    // облака
    this.clouds = [];
    for (let i = 0; i < 12; i++) {
      const g = M.cloud(i + wi * 7).build(1.3, 0, 0).geo;
      const c = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xffffff, emissiveIntensity: 0.25 }));
      c.position.set((hash(i, 12) - 0.5) * 260, 45 + hash(i, 13) * 30, 40 + hash(i, 14) * 140);
      c.userData.v = 0.6 + hash(i, 15);
      env.add(c);
      this.clouds.push(c);
    }
    this.scene.add(env);
  }

  // ---------- эффекты ----------
  _initFx() {
    this.fx = new Particles(1400, this.T.dot, false);
    this.fxAdd = new Particles(900, this.T.dot, true);
    this.scene.add(this.fx.points, this.fxAdd.points);
    // обломки
    const DN = 700;
    this.debrisMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), DN);
    this.debrisMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(DN * 3), 3);
    this.debrisMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.debrisMesh.frustumCulled = false;
    this.debrisMesh.castShadow = this.quality === 'high';
    this.debrisMesh.count = 0;
    this.scene.add(this.debrisMesh);
    this.debris = [];
    this.DN = DN;
  }

  debrisBurst(p, mat, n, power = 4, size = 0.22) {
    const cols = DEBRIS[mat] || DEBRIS.stone;
    for (let i = 0; i < n; i++) {
      if (this.debris.length >= this.DN) this.debris.shift();
      const a = Math.random() * Math.PI * 2;
      const up = 0.3 + Math.random() * 0.9;
      const sp = power * (0.4 + Math.random() * 0.8);
      this.debris.push({
        p: new THREE.Vector3(p.x + (Math.random() - 0.5) * 0.6, p.y + (Math.random() - 0.5) * 0.6, p.z + (Math.random() - 0.5) * 0.6),
        v: new THREE.Vector3(Math.cos(a) * sp, up * sp + 2, Math.sin(a) * sp),
        r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
        w: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, 0),
        s: size * (0.5 + Math.random()),
        life: 1.6 + Math.random() * 1.4,
        c: new THREE.Color(cols[Math.floor(Math.random() * cols.length)]),
      });
    }
  }

  dust(p, n = 8, color = 0xe8e0d0, size = 1.2, spread = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.5 + Math.random() * 1.5) * spread;
      this.fx.emit({ x: p.x, y: p.y, z: p.z }, { x: Math.cos(a) * sp, y: Math.random() * 1.2 * spread, z: Math.sin(a) * sp }, color, size * (0.6 + Math.random() * 0.6), 0.7 + Math.random() * 0.6, { grow: 1.4, drag: 2.2, alpha: 0.75 });
    }
  }

  explosion(p, R) {
    const n = Math.round(14 + R * 6);
    // вспышка
    this.fxAdd.emit(p, { x: 0, y: 0, z: 0 }, 0xfff2c0, R * 2.6, 0.22, { grow: 3, alpha: 1 });
    for (let i = 0; i < n; i++) {
      const d = randDir();
      const sp = R * (1.5 + Math.random() * 2.5);
      this.fxAdd.emit(p, { x: d.x * sp, y: d.y * sp * 0.7 + 1, z: d.z * sp }, [0xffd040, 0xff8a20, 0xff5a10][i % 3], R * (0.5 + Math.random() * 0.4), 0.35 + Math.random() * 0.35, { grow: 1.6, drag: 3.5, alpha: 1 });
    }
    for (let i = 0; i < n; i++) {
      const d = randDir();
      const sp = R * (0.6 + Math.random() * 1.2);
      this.fx.emit(p, { x: d.x * sp, y: Math.abs(d.y) * sp + 1.5, z: d.z * sp }, i % 2 ? 0x5a5550 : 0x8a847c, R * (0.6 + Math.random() * 0.5), 1.2 + Math.random() * 1.0, { grow: 1.8, drag: 2.5, alpha: 0.8, grav: -0.6 });
    }
    // искры
    for (let i = 0; i < 18; i++) {
      const d = randDir();
      const sp = 6 + Math.random() * 10;
      this.fxAdd.emit(p, { x: d.x * sp, y: Math.abs(d.y) * sp + 3, z: d.z * sp }, 0xffe080, 0.18, 0.6 + Math.random() * 0.5, { grav: G * 0.7, drag: 0.6, alpha: 1 });
    }
    this.shake = Math.max(this.shake, 0.25 + R * 0.08);
  }

  trail(p, type) {
    if (type === 'fire') {
      this.fxAdd.emit(p, { x: (Math.random() - 0.5), y: Math.random() + 0.5, z: (Math.random() - 0.5) }, Math.random() < 0.5 ? 0xffa030 : 0xff6020, 0.6 + Math.random() * 0.4, 0.35, { grow: -0.8, drag: 1, alpha: 1 });
    } else if (type === 'bomb') {
      this.fxAdd.emit({ x: p.x, y: p.y + 0.45, z: p.z }, { x: (Math.random() - 0.5) * 2, y: 1.5, z: (Math.random() - 0.5) * 2 }, 0xffe080, 0.14, 0.3, { alpha: 1 });
      this.fx.emit(p, { x: 0, y: 0.4, z: 0 }, 0xb0aca4, 0.35, 0.6, { grow: 1.2, alpha: 0.35 });
    } else this.fx.emit(p, { x: 0, y: 0.2, z: 0 }, 0xffffff, 0.35, 0.45, { grow: 1, alpha: 0.4 });
  }

  // пламя на горящем блоке
  burn(p, s) {
    if (Math.random() < 0.5) this.fxAdd.emit({ x: p.x + (Math.random() - 0.5) * s, y: p.y + s * 0.3, z: p.z + (Math.random() - 0.5) * s }, { x: 0, y: 1.6 + Math.random(), z: 0 }, Math.random() < 0.5 ? 0xffa030 : 0xff5a10, 0.5 + Math.random() * 0.4, 0.5, { grow: -0.6, drag: 0.5, alpha: 0.95 });
    if (Math.random() < 0.15) this.fx.emit({ x: p.x, y: p.y + s * 0.6, z: p.z }, { x: 0, y: 1.5, z: 0 }, 0x4a4640, 0.6, 1.4, { grow: 1.2, alpha: 0.45 });
  }

  // погода и окружение
  ambient(dt) {
    const wi = this.worldIndex;
    if (wi === 2 && Math.random() < dt * 40) {
      const x = (Math.random() - 0.5) * 50;
      const z = Math.random() * 50;
      this.fx.emit({ x, y: 18, z }, { x: 0.4, y: -1.6, z: 0 }, 0xffffff, 0.16, 11, { alpha: 0.9, sway: 1 });
    }
    if (wi === 1 && Math.random() < dt * 4) {
      const x = (Math.random() - 0.5) * 40;
      const z = 10 + Math.random() * 40;
      this.fx.emit({ x, y: 12, z }, { x: 0.8, y: -1, z: 0 }, [0xe8902a, 0xd8602a, 0xf0c040][Math.floor(Math.random() * 3)], 0.22, 10, { alpha: 1, sway: 2 });
    }
    const cf = this.level && this.level.campfire;
    if (cf && Math.random() < dt * 30) {
      this.fxAdd.emit({ x: cf.x + (Math.random() - 0.5) * 0.4, y: 0.25, z: cf.z + (Math.random() - 0.5) * 0.4 }, { x: 0, y: 1.2 + Math.random(), z: 0 }, Math.random() < 0.5 ? 0xffa030 : 0xff6020, 0.35 + Math.random() * 0.25, 0.5, { grow: -0.5, alpha: 0.9 });
      if (Math.random() < 0.3) this.fx.emit({ x: cf.x, y: 0.9, z: cf.z }, { x: 0.2, y: 1.2, z: 0 }, 0x8a8680, 0.4, 2.2, { grow: 0.8, alpha: 0.35 });
    }
    if (this.clouds) for (const c of this.clouds) {
      c.position.x += c.userData.v * dt;
      if (c.position.x > 140) c.position.x = -140;
    }
  }

  update(dt) {
    this.time += dt;
    this.fx.update(dt);
    this.fxAdd.update(dt);
    this.ambient(dt);
    // обломки
    const rocks = this.level ? this.level.rocks : [];
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    let n = 0;
    const out = [];
    for (const d of this.debris) {
      d.life -= dt;
      if (d.life <= 0) continue;
      d.v.y -= G * dt;
      d.p.addScaledVector(d.v, dt);
      let floor = 0;
      for (const r of rocks) {
        const pp = r.position;
        const hs = r.geometry.parameters;
        if (Math.abs(d.p.x - pp.x) < hs.width / 2 && Math.abs(d.p.z - pp.z) < hs.depth / 2) floor = Math.max(floor, pp.y + hs.height / 2);
      }
      if (d.p.y < floor + d.s / 2) {
        d.p.y = floor + d.s / 2;
        if (d.v.y < 0) d.v.y *= -0.3;
        d.v.x *= 0.7;
        d.v.z *= 0.7;
        d.w.multiplyScalar(0.7);
      }
      d.r.x += d.w.x * dt;
      d.r.y += d.w.y * dt;
      const k = Math.min(1, d.life / 0.5);
      q.setFromEuler(d.r);
      m4.compose(d.p, q, sc.setScalar(d.s * k));
      this.debrisMesh.setMatrixAt(n, m4);
      this.debrisMesh.setColorAt(n, d.c);
      n++;
      out.push(d);
    }
    this.debris = out;
    this.debrisMesh.count = n;
    this.debrisMesh.instanceMatrix.needsUpdate = true;
    if (this.debrisMesh.instanceColor) this.debrisMesh.instanceColor.needsUpdate = true;
    // горение
    this.shake = Math.max(0, this.shake - dt * 1.2);
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.H = h;
    this._setFov(this.camera.fov, true);
    this.layoutVm();
  }

  _setFov(fov, force) {
    const c = this.camera;
    if (!force && Math.abs(c.fov - fov) < 0.01) return;
    c.fov = fov;
    c.updateProjectionMatrix();
    const scale = ((this.H || 720) * this.renderer.getPixelRatio()) / (2 * Math.tan((fov * Math.PI) / 360));
    this.fx.mat.uniforms.scale.value = scale;
    this.fxAdd.mat.uniforms.scale.value = scale;
    this.traj.material.uniforms.scale.value = scale;
  }

  render(camPos, camLook, fov) {
    const c = this.camera;
    if (fov) this._setFov(fov);
    c.position.copy(camPos);
    if (this.shake > 0) {
      const s = this.shake * this.shake * 1.2;
      c.position.x += (Math.random() - 0.5) * s;
      c.position.y += (Math.random() - 0.5) * s;
    }
    c.lookAt(camLook);
    this.renderer.render(this.scene, c);
    if (this.vm && this.vm.show) {
      const r = this.renderer;
      r.autoClear = false;
      r.clearDepth();
      r.render(this.vm.scene, this.vm.cam);
      r.autoClear = true;
    }
  }
}

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const DEBRIS = {
  wood: [0xb07a45, 0x8a5a30, 0xc89058],
  stone: [0xa7a49c, 0x8a877f, 0xbdb9b0],
  ice: [0xbfe8ff, 0xffffff, 0x9ad0f0],
  metal: [0x7d8794, 0x5a626c],
  tnt: [0x9a5b2c, 0xd93a2b, 0x3a3a3a],
  straw: [0xe8c45a, 0xd0a840],
  enemy: [0x74c24f, 0x4f9a35, 0x8a5a2b],
};

function randDir() {
  const u = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return { x: s * Math.cos(a), y: u, z: s * Math.sin(a) };
}

// треугольная призма-крыша: конёк вдоль X
function roofGeo(w, h, d) {
  const x0 = -w / 2;
  const x1 = w / 2;
  const yb = -h / 2;
  const yt = h / 2;
  const z0 = -d / 2;
  const z1 = d / 2;
  const sl = Math.hypot(d / 2, h);
  const pos = [];
  const uv = [];
  const groups = [];
  const quad = (a, b, c, dd, ua) => {
    pos.push(...a, ...b, ...c, ...a, ...c, ...dd);
    uv.push(...ua[0], ...ua[1], ...ua[2], ...ua[0], ...ua[2], ...ua[3]);
  };
  // скаты (группа 0)
  quad([x0, yb, z0], [x1, yb, z0], [x1, yt, 0], [x0, yt, 0], [[0, 0], [w, 0], [w, sl], [0, sl]]);
  quad([x1, yb, z1], [x0, yb, z1], [x0, yt, 0], [x1, yt, 0], [[0, 0], [w, 0], [w, sl], [0, sl]]);
  groups.push([0, 12, 0]);
  // торцы и низ (группа 1)
  pos.push(x0, yb, z1, x0, yt, 0, x0, yb, z0);
  uv.push(d, 0, d / 2, h, 0, 0);
  pos.push(x1, yb, z0, x1, yt, 0, x1, yb, z1);
  uv.push(0, 0, d / 2, h, d, 0);
  quad([x0, yb, z0], [x0, yb, z1], [x1, yb, z1], [x1, yb, z0], [[0, 0], [0, d], [w, d], [w, 0]]);
  groups.push([12, 12, 1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  for (const [s, c, m] of groups) g.addGroup(s, c, m);
  return g;
}

// система частиц на одном Points
class Particles {
  constructor(max, map, additive) {
    this.max = max;
    this.n = 0;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.P = [];
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    this.aAlpha = new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos);
    g.setAttribute('color', this.aCol);
    g.setAttribute('size', this.aSize);
    g.setAttribute('alpha', this.aAlpha);
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { map: { value: map }, scale: { value: 400 } },
      vertexShader:
        'attribute float size; attribute float alpha; attribute vec3 color; varying vec4 vC; uniform float scale; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = min(size*scale/-mv.z, 512.0); gl_Position = projectionMatrix*mv; vC = vec4(color, alpha); }',
      fragmentShader: 'uniform sampler2D map; varying vec4 vC; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC.rgb, vC.a*t.a); if (gl_FragColor.a < 0.01) discard; }',
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 4 : 3;
    this.g = g;
    this.tmpC = new THREE.Color();
  }
  emit(p, v, color, size, life, o = {}) {
    if (this.P.length >= this.max) this.P.shift();
    this.tmpC.setHex(color);
    this.P.push({ x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, r: this.tmpC.r, g: this.tmpC.g, b: this.tmpC.b, s: size, life, max: life, grow: o.grow || 0, drag: o.drag || 0, grav: o.grav || 0, a: o.alpha ?? 1, sway: o.sway || 0, ph: Math.random() * 6 });
  }
  clear() {
    this.P.length = 0;
  }
  update(dt) {
    const out = [];
    let i = 0;
    for (const q of this.P) {
      q.life -= dt;
      if (q.life <= 0 || q.y < -1) continue;
      const dr = Math.max(0, 1 - q.drag * dt);
      q.vx *= dr;
      q.vy *= dr;
      q.vz *= dr;
      q.vy -= q.grav * dt;
      q.x += q.vx * dt + (q.sway ? Math.sin(q.life * 2 + q.ph) * q.sway * dt : 0);
      q.y += q.vy * dt;
      q.z += q.vz * dt;
      if (q.y < 0.05 && q.sway) (q.vy = 0), (q.vx = 0), (q.y = 0.05);
      q.s = Math.max(0.02, q.s + q.grow * dt);
      const t = q.life / q.max;
      this.pos[i * 3] = q.x;
      this.pos[i * 3 + 1] = q.y;
      this.pos[i * 3 + 2] = q.z;
      this.col[i * 3] = q.r;
      this.col[i * 3 + 1] = q.g;
      this.col[i * 3 + 2] = q.b;
      this.size[i] = q.s;
      this.alpha[i] = q.a * Math.min(1, t * 3);
      i++;
      out.push(q);
    }
    this.P = out;
    this.g.setDrawRange(0, i);
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aSize.needsUpdate = this.aAlpha.needsUpdate = true;
  }
}
