// 3D-мир: рендер, остров, здания, декор, жители, небо, день/ночь, погода, шары
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GRID, PLOT, plotBiome, BIOMES, BUILDINGS, DECOR, effLvl } from './econ.js';
import { BUILD_MODELS, DECOR_MODELS, person, balloon, cloud, millBlades, millAxle, airship, scaffold, P } from './models.js';
import { hash, Vox, jitter } from './vox.js';
import { SkyDeco } from './skydeco.js';

const HALF = (GRID - 1) / 2;
export const cellPos = (x, z) => new THREE.Vector3(x - HALF, 0, z - HALF);
const VS = 1 / 12;
const DAY = 360; // секунд в сутках

export class World {
  constructor(canvas, quality) {
    this.canvas = canvas;
    this.quality = quality; // 'high' | 'mid' | 'low'
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance', preserveDrawingBuffer: !!window.__SI_DEBUG }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : quality === 'mid' ? 1.5 : 1));
    r.shadowMap.enabled = quality !== 'low';
    r.shadowMap.type = THREE.PCFShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;

    const scene = (this.scene = new THREE.Scene());
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.5, 400);
    this.fog = scene.fog = new THREE.Fog(0xcfeaff, 75, 200);

    // небо-градиент
    this.skyU = { top: { value: new THREE.Color(0x8ccff7) }, bottom: { value: new THREE.Color(0xe9f6ff) }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, glow: { value: new THREE.Color(0xfff0d0) } };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(300, 24, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: this.skyU,
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 glow; varying vec3 vP; void main(){ float h = clamp(vP.y*0.9+0.35,0.0,1.0); vec3 c = mix(bottom, top, pow(h, 0.8)); float s = max(dot(normalize(vP), normalize(sunDir)), 0.0); c += glow * (pow(s, 6.0) * 0.35 + pow(s, 60.0) * 0.5); gl_FragColor = vec4(c,1.0); }',
      })
    );
    sky.renderOrder = -10;
    scene.add(sky);
    this.sky = sky;

    // звёзды
    const sp = [];
    for (let i = 0; i < 400; i++) {
      const a = Math.random() * Math.PI * 2;
      const b = Math.random() * 0.45 + 0.05;
      sp.push(Math.cos(a) * Math.cos(b) * 250, Math.sin(b) * 250, Math.sin(a) * Math.cos(b) * 250);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    scene.add(this.stars);

    // свет
    this.hemi = new THREE.HemisphereLight(0xfdf6ff, 0x9bb7cf, 1.5);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1dc, 2.3);
    this.sun.castShadow = quality !== 'low';
    const ms = quality === 'high' ? 2048 : 1024;
    this.sun.shadow.mapSize.set(ms, ms);
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.02;
    scene.add(this.sun);
    scene.add(this.sun.target);

    // материалы
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.cloudMat = new THREE.MeshLambertMaterial({ vertexColors: true });

    this.root = new THREE.Group();
    scene.add(this.root);
    this.islandGroup = new THREE.Group();
    this.root.add(this.islandGroup);
    this.objGroup = new THREE.Group();
    this.root.add(this.objGroup);

    this.geoCache = new Map();
    this.objs = new Map(); // key -> {group, ...}
    this.anims = [];
    this.glowSprites = [];
    this.night = 0;
    this.rain = 0;
    this.time = 0;

    this.makeGlowTexture();
    this.makeClouds();
    this.deco = new SkyDeco(this);
    this.makeRain();
    this.makeHighlight();
    this.people = [];
    this.makePeople();
    this.balloon = null;
    this.bounds = 6;
  }

  // ---------- Геометрия с кэшем ----------
  geom(key, makeVox) {
    let g = this.geoCache.get(key);
    if (!g) {
      const v = makeVox();
      g = v.build(VS, 6, 6);
      this.geoCache.set(key, g);
    }
    return g;
  }

  meshFrom(g, shadow = true) {
    const grp = new THREE.Group();
    if (g.geo) {
      const m = new THREE.Mesh(g.geo, this.mat);
      m.castShadow = shadow;
      m.receiveShadow = true;
      m.userData.main = true;
      grp.add(m);
    }
    if (g.glow) {
      const m = new THREE.Mesh(g.glow, this.glowMat);
      m.userData.main = true;
      grp.add(m);
    }
    return grp;
  }

  // ---------- Склейка статичных объектов по участкам (меньше вызовов отрисовки) ----------
  plotOf(x, z) {
    return Math.floor(x / PLOT) + ',' + Math.floor(z / PLOT);
  }
  dirty(x, z, delay = 1.3) {
    if (!this.dirtyPlots) this.dirtyPlots = new Map();
    const k = this.plotOf(x, z);
    this.dirtyPlots.set(k, Math.max(this.dirtyPlots.get(k) || 0, this.time + delay));
  }
  rebuildChunk(pk) {
    if (!this.chunks) this.chunks = new Map();
    const old = this.chunks.get(pk);
    if (old) {
      this.objGroup.remove(old);
      old.children.forEach((c) => c.geometry.dispose());
    }
    const solid = [];
    const glow = [];
    const m4 = new THREE.Matrix4();
    for (const o of this.objs.values()) {
      if (this.plotOf(o.ref.x, o.ref.z) !== pk) continue;
      const mains = [];
      o.grp.traverse((c) => c.userData.main && mains.push(c));
      if (o.hidden || o.live) {
        mains.forEach((c) => (c.visible = !o.hidden));
        continue;
      }
      o.grp.updateMatrixWorld(true);
      for (const c of mains) {
        m4.copy(c.matrixWorld);
        const g = c.geometry.clone().applyMatrix4(this.objGroup.matrixWorld.clone().invert().multiply(m4));
        (c.material === this.glowMat ? glow : solid).push(g);
        c.visible = false;
      }
    }
    const grp = new THREE.Group();
    if (solid.length) {
      const m = new THREE.Mesh(mergeGeometries(solid), this.mat);
      m.castShadow = true;
      m.receiveShadow = true;
      grp.add(m);
    }
    if (glow.length) grp.add(new THREE.Mesh(mergeGeometries(glow), this.glowMat));
    solid.concat(glow).forEach((g) => g.dispose());
    this.objGroup.add(grp);
    this.chunks.set(pk, grp);
  }
  hideObj(key, hidden) {
    const o = this.objs.get(key);
    if (!o) return;
    o.hidden = hidden;
    o.grp.traverse((c) => c.userData.main && (c.visible = !hidden));
    this.dirty(o.ref.x, o.ref.z, 0);
  }

  makeGlowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,230,160,1)');
    gr.addColorStop(0.35, 'rgba(255,210,120,0.45)');
    gr.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 64, 64);
    this.glowTex = new THREE.CanvasTexture(c);
  }

  glowSprite(color = 0xffd98a, size = 1.6) {
    const m = new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    const s = new THREE.Sprite(m);
    s.scale.set(size, size, 1);
    this.glowSprites.push(s);
    return s;
  }

  // ---------- Остров ----------
  buildIsland(plots) {
    this.islandGroup.clear();
    const R = 2; // субклеток на клетку
    const N = GRID * R;
    const owned = new Uint8Array(N * N);
    const biomeAt = (cx, cz) => plotBiome(Math.floor(cx / PLOT), Math.floor(cz / PLOT));
    for (const p of plots) {
      const [px, pz] = p.split(',').map(Number);
      for (let x = px * PLOT * R; x < (px + 1) * PLOT * R; x++) for (let z = pz * PLOT * R; z < (pz + 1) * PLOT * R; z++) owned[x * N + z] = 1;
    }
    // расстояние до края
    const dist = new Float32Array(N * N).fill(1e9);
    const q = [];
    for (let x = 0; x < N; x++)
      for (let z = 0; z < N; z++) {
        if (!owned[x * N + z]) continue;
        let edge = false;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const nz = z + dz;
          if (nx < 0 || nz < 0 || nx >= N || nz >= N || !owned[nx * N + nz]) edge = true;
        }
        if (edge) {
          dist[x * N + z] = 0;
          q.push(x * N + z);
        }
      }
    for (let i = 0; i < q.length; i++) {
      const k = q[i];
      const x = Math.floor(k / N);
      const z = k % N;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue;
        const nk = nx * N + nz;
        if (owned[nk] && dist[nk] > dist[k] + 1) {
          dist[nk] = dist[k] + 1;
          q.push(nk);
        }
      }
    }
    const S = 1 / R;
    let maxD = 0;
    for (let k = 0; k < N * N; k++) if (owned[k]) maxD = Math.max(maxD, dist[k]);
    const maxDepth = 3 + maxD * S * 0.55;
    const depth = new Float32Array(N * N);
    for (let k = 0; k < N * N; k++) {
      if (!owned[k]) continue;
      const x = Math.floor(k / N);
      const z = k % N;
      depth[k] = Math.min(maxDepth, 0.6 + Math.pow(dist[k] * S, 1.15) * 0.75) + hash(x, z, 7) * 0.8 + (hash(x, z, 11) > 0.92 ? 1.2 + hash(x, z, 12) * 1.6 : 0);
    }
    const pos = [];
    const nor = [];
    const col = [];
    const idx = [];
    const c = new THREE.Color();
    const quad = (a, b, cc, d, n, color, k1 = 1, k2 = 1) => {
      const base = pos.length / 3;
      pos.push(...a, ...b, ...cc, ...d);
      for (let i = 0; i < 4; i++) nor.push(...n);
      c.setHex(color);
      const ks = [k1, k1, k2, k2];
      for (let i = 0; i < 4; i++) col.push(c.r * ks[i], c.g * ks[i], c.b * ks[i]);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    const GR = 0.3; // толщина травы
    const DIRT = 1.6;
    for (let x = 0; x < N; x++)
      for (let z = 0; z < N; z++) {
        const k = x * N + z;
        if (!owned[k]) continue;
        const bi = BIOMES[biomeAt(Math.floor(x / R), Math.floor(z / R))];
        const x0 = x * S - GRID / 2;
        const z0 = z * S - GRID / 2;
        const x1 = x0 + S;
        const z1 = z0 + S;
        const d = depth[k];
        // верх: лёгкая клетка-шахматка по игровым клеткам
        const cellChk = (Math.floor(x / R) + Math.floor(z / R)) % 2;
        const top = new THREE.Color(bi.top).offsetHSL(0, 0, (hash(x, z) - 0.5) * 0.035 + (cellChk ? 0.012 : -0.012)).getHex();
        quad([x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], [0, 1, 0], top);
        // низ
        quad([x0, -d, z0], [x1, -d, z0], [x1, -d, z1], [x0, -d, z1], [0, -1, 0], 0x6b5446, 0.6, 0.6);
        // стороны
        const sides = [
          [1, 0, [x1, z1], [x1, z0]],
          [-1, 0, [x0, z0], [x0, z1]],
          [0, 1, [x0, z1], [x1, z1]],
          [0, -1, [x1, z0], [x0, z0]],
        ];
        for (const [dx, dz, A, Bp] of sides) {
          const nx = x + dx;
          const nz = z + dz;
          const nk = nx * N + nz;
          const nd = nx >= 0 && nz >= 0 && nx < N && nz < N && owned[nk] ? depth[nk] : 0;
          if (nd >= d) continue;
          // слои: трава, земля, камень
          const layers = [
            [0, GR, bi.side],
            [GR, DIRT, bi.dirt],
            [DIRT, 99, 0x8d8279],
          ];
          for (const [ya, yb, color] of layers) {
            const top = Math.max(ya, nd);
            const bot = Math.min(yb, d);
            if (bot <= top) continue;
            const kTop = 1 - top * 0.12;
            const kBot = 1 - bot * 0.12;
            const n = [dx, 0, dz];
            const lightK = dx === 1 ? 0.88 : dx === -1 ? 0.8 : dz === 1 ? 0.95 : 0.75;
            const cc2 = new THREE.Color(color).offsetHSL(0, 0, (hash(x, z, ya * 10) - 0.5) * 0.04).getHex();
            quad([Bp[0], -top, Bp[1]], [A[0], -top, A[1]], [A[0], -bot, A[1]], [Bp[0], -bot, Bp[1]], n, cc2, Math.max(0.4, kTop) * lightK, Math.max(0.4, kBot) * lightK);
          }
        }
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, this.mat);
    m.receiveShadow = true;
    m.castShadow = true;
    this.islandGroup.add(m);
    // свисающие лианы и корни по краям (только украшение)
    const vines = new Vox();
    const VS2 = 0.1;
    for (let x = 0; x < N; x++)
      for (let z = 0; z < N; z++) {
        const k = x * N + z;
        if (!owned[k] || dist[k] !== 0) continue;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const nz = z + dz;
          if (nx >= 0 && nz >= 0 && nx < N && nz < N && owned[nx * N + nz]) continue;
          const hv = hash(x * 3 + dx, z * 3 + dz, 31);
          if (hv < 0.72) continue;
          // лоза висит вплотную к грани острова: смещение только вдоль грани
          const fx = (x + 0.5 + dx * 0.5) * S - GRID / 2;
          const fz = (z + 0.5 + dz * 0.5) * S - GRID / 2;
          const tang = (hash(x, z, 32) - 0.5) * S * 0.7;
          const wx = dx ? fx : fx + tang;
          const wz = dz ? fz : fz + tang;
          const vx = dx > 0 ? Math.ceil(wx / VS2 - 0.01) : dx < 0 ? Math.floor(wx / VS2 + 0.01) - 1 : Math.round(wx / VS2);
          const vz = dz > 0 ? Math.ceil(wz / VS2 - 0.01) : dz < 0 ? Math.floor(wz / VS2 + 0.01) - 1 : Math.round(wz / VS2);
          const root = hv > 0.93;
          // не длиннее края скалы, к которой лоза прикреплена, — иначе она повиснет в воздухе
          const maxLen = Math.max(3, Math.floor(depth[k] / VS2) - 1);
          const len = Math.min(maxLen, root ? 8 + Math.floor(hash(x, z, 34) * 14) : 4 + Math.floor(hash(x, z, 34) * 12));
          for (let i = 0; i < len; i++) {
            const sway = Math.round(Math.sin(i * 0.6 + hv * 9) * 0.8);
            const c = root ? jitter(0x8a6a4c, vx, i, vz, 0.06) : i === len - 1 && hv > 0.85 ? 0xf28fb0 : jitter(i % 3 === 0 ? 0x6fbf5a : 0x5aa84c, vx, i, vz, 0.06);
            vines.set(vx + (dz ? sway : 0), -i - 1, vz + (dx ? sway : 0), c);
            if (!root && i % 4 === 2) vines.set(vx + dz, -i - 1, vz + dx, 0x7ccc6a);
          }
        }
      }
    const vg = vines.build(VS2, 0, 0);
    if (vg.geo) {
      const vm = new THREE.Mesh(vg.geo, this.mat);
      vm.castShadow = false;
      this.islandGroup.add(vm);
    }
    // границы острова для камеры и теней
    let minx = 99;
    let maxx = -99;
    let minz = 99;
    let maxz = -99;
    for (const p of plots) {
      const [px, pz] = p.split(',').map(Number);
      minx = Math.min(minx, px * PLOT);
      maxx = Math.max(maxx, (px + 1) * PLOT);
      minz = Math.min(minz, pz * PLOT);
      maxz = Math.max(maxz, (pz + 1) * PLOT);
    }
    this.bbox = { minx: minx - GRID / 2, maxx: maxx - GRID / 2, minz: minz - GRID / 2, maxz: maxz - GRID / 2 };
    this.bounds = Math.max(maxx - minx, maxz - minz) / 2 + 2;
    const sc = this.sun.shadow.camera;
    const b = this.bounds + 3;
    sc.left = -b;
    sc.right = b;
    sc.top = b;
    sc.bottom = -b;
    sc.near = 1;
    sc.far = 120;
    sc.updateProjectionMatrix();
  }

  // Призрачные участки для покупки
  setGhostPlots(list) {
    if (this.ghosts) this.root.remove(this.ghosts);
    this.ghosts = new THREE.Group();
    for (const g of list) {
      const bi = BIOMES[g.biome];
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(PLOT - 0.2, 0.3, PLOT - 0.2),
        new THREE.MeshLambertMaterial({ color: bi.top, transparent: true, opacity: g.locked ? 0.1 : 0.24, depthWrite: false })
      );
      m.position.set((g.px + 0.5) * PLOT - GRID / 2, -0.2, (g.pz + 0.5) * PLOT - GRID / 2);
      this.ghosts.add(m);
    }
    this.root.add(this.ghosts);
  }

  // ---------- Объекты ----------
  objKey(o) {
    return o.id !== undefined ? 'b' + o.id : 'd' + o.x + ',' + o.z;
  }

  buildingModel(type, lvl) {
    return this.geom(`b_${type}_${lvl}`, () => BUILD_MODELS[type](lvl));
  }

  // синхронизация зданий и декора с состоянием
  sync(state, now) {
    const seen = new Set();
    for (const b of state.buildings) {
      const k = 'b' + b.id;
      seen.add(k);
      const building = b.build && b.build > now;
      const showLvl = building ? Math.max(1, b.lvl - 1) : b.lvl;
      const sig = `${b.type}_${showLvl}_${building ? 1 : 0}_${b.x}_${b.z}_${b.r || 0}`;
      let o = this.objs.get(k);
      if (o && o.sig === sig) continue;
      if (o) this.removeObj(k);
      const grp = new THREE.Group();
      if (building && b.lvl === 1) {
        grp.add(this.meshFrom(this.geom('scaffold6', () => scaffold(6))));
      } else {
        grp.add(this.meshFrom(this.buildingModel(b.type, showLvl)));
        if (building) {
          const sg = this.meshFrom(this.geom('scaffold14', () => scaffold(14)));
          sg.scale.set(1.08, 1, 1.08);
          grp.add(sg);
        }
      }
      const extra = [];
      if (b.type === 'mill' && !(building && b.lvl === 1)) {
        const bl = this.meshFrom(this.geom('blades' + showLvl, () => millBlades(showLvl)));
        const [ax, ay, az] = millAxle(showLvl);
        bl.position.set(ax, ay, az);
        grp.add(bl);
        extra.push({ obj: bl, kind: 'spinZ', speed: 1.2 });
      }
      if (b.type === 'port' && !(building && b.lvl === 1)) {
        const sh = this.meshFrom(this.geom('airship', () => airship(1)));
        sh.position.set(0.1, 0.4, 0);
        sh.scale.setScalar(0.9);
        grp.add(sh);
        extra.push({ obj: sh, kind: 'bob', base: 0.4 });
      }
      if (b.type === 'lighthouse' && !(building && b.lvl === 1)) {
        const s = this.glowSprite(0xfff1b0, 4);
        s.position.set(0, (14 + showLvl * 2 + 3) * VS, 0);
        grp.add(s);
      }
      const p = cellPos(b.x, b.z);
      grp.position.copy(p);
      grp.rotation.y = ((b.r || 0) * Math.PI) / 2;
      this.objGroup.add(grp);
      const live = building; // стройка — отдельным мешем (леса меняются)
      this.objs.set(k, { grp, sig, extra, kind: 'b', ref: b, live });
      this.dirty(b.x, b.z);
      if (o) this.popIn(grp);
    }
    for (const d of state.decor) {
      const k = 'd' + d.x + ',' + d.z;
      seen.add(k);
      const sig = `${d.type}_${d.r || 0}`;
      const o = this.objs.get(k);
      if (o && o.sig === sig) continue;
      if (o) this.removeObj(k);
      const seed = Math.floor(hash(d.x, d.z) * 3);
      const grp = this.meshFrom(this.geom(`d_${d.type}_${seed}`, () => DECOR_MODELS[d.type](seed)));
      if (DECOR[d.type].light) {
        const s = this.glowSprite(d.type === 'crystaltree' ? 0x9ff6ff : d.type === 'lavalamp' ? 0xff9a50 : 0xffd98a, d.type === 'lantern' ? 1.6 : 2.4);
        s.position.set(0, d.type === 'lantern' ? 10 * VS : 6 * VS, 0);
        grp.add(s);
      }
      grp.position.copy(cellPos(d.x, d.z));
      grp.rotation.y = ((d.r || 0) * Math.PI) / 2;
      this.objGroup.add(grp);
      this.objs.set(k, { grp, sig, extra: [], kind: 'd', ref: d });
      this.dirty(d.x, d.z);
    }
    for (const k of [...this.objs.keys()]) if (!seen.has(k)) this.removeObj(k);
  }

  removeObj(k) {
    const o = this.objs.get(k);
    if (!o) return;
    this.dirty(o.ref.x, o.ref.z, 0);
    this.objGroup.remove(o.grp);
    o.grp.traverse((c) => {
      if (c.isSprite) {
        c.material.dispose();
        const i = this.glowSprites.indexOf(c);
        if (i >= 0) this.glowSprites.splice(i, 1);
      }
    });
    this.objs.delete(k);
  }

  popIn(grp) {
    grp.scale.set(1, 0.6, 1);
    this.anims.push({ t: 0, d: 0.45, fn: (k) => grp.scale.set(1 + Math.sin(k * Math.PI) * 0.08, 0.6 + 0.4 * easeOutBack(k), 1 + Math.sin(k * Math.PI) * 0.08) });
  }

  bump(objKey) {
    const o = this.objs.get(objKey);
    if (!o) return;
    const g = o.grp;
    this.anims.push({ t: 0, d: 0.3, fn: (k) => g.scale.set(1 + Math.sin(k * Math.PI) * 0.1, 1 - Math.sin(k * Math.PI) * 0.08, 1 + Math.sin(k * Math.PI) * 0.1) });
  }

  // ---------- Подсветка выбора и призрак постройки ----------
  makeHighlight() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(5, 5, 54, 54, 10);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(c);
    this.hl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: 0xffffff }));
    this.hl.rotation.x = -Math.PI / 2;
    this.hl.position.y = 0.02;
    this.hl.visible = false;
    this.hl.renderOrder = 5;
    this.root.add(this.hl);
    this.ghostMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false });
  }

  highlight(x, z, color = 0xffffff) {
    if (x === null) {
      this.hl.visible = false;
      return;
    }
    this.hl.visible = true;
    this.hl.material.color.setHex(color);
    const p = cellPos(x, z);
    this.hl.position.set(p.x, 0.02, p.z);
  }

  setGhost(kind, type, x, z, r, ok) {
    if (this.ghost) {
      this.root.remove(this.ghost);
      this.ghost = null;
    }
    if (!kind) return;
    const g = kind === 'b' ? this.buildingModel(type, 1) : this.geom(`d_${type}_0`, () => DECOR_MODELS[type](0));
    const grp = new THREE.Group();
    if (g.geo) grp.add(new THREE.Mesh(g.geo, this.ghostMat));
    if (g.glow) grp.add(new THREE.Mesh(g.glow, this.ghostMat));
    grp.position.copy(cellPos(x, z));
    grp.rotation.y = (r * Math.PI) / 2;
    this.ghostMat.color.setHex(ok ? 0xc8ffc8 : 0xffb0b0);
    this.ghost = grp;
    this.root.add(grp);
    this.highlight(x, z, ok ? 0x8dff8d : 0xff7a7a);
  }

  // ---------- Облака ----------
  makeClouds() {
    this.clouds = [];
    for (let i = 0; i < 30; i++) {
      const g = this.geom('cloud' + (i % 16), () => cloud((i % 16) + 1));
      const m = new THREE.Mesh(g.geo, this.cloudMat);
      const a = (i / 30) * Math.PI * 2 + hash(i, 5) * 0.8;
      const layer = i % 3;
      const r = 20 + hash(i, 6) * 40 + layer * 15;
      const y = layer === 0 ? -9 + hash(i, 7) * 6 : layer === 1 ? 2 + hash(i, 7) * 8 : 14 + hash(i, 7) * 12;
      m.scale.setScalar((1.8 + hash(i, 8) * 2.4) * (layer === 2 ? 1.4 : 1));
      m.rotation.y = hash(i, 9) * 6;
      this.scene.add(m);
      this.clouds.push({ m, a, r, y, sp: 0.004 + hash(i, 9) * 0.006 });
    }
  }

  // ---------- Дождь ----------
  makeRain() {
    const n = 700;
    const pos = new Float32Array(n * 6);
    this.rainData = [];
    for (let i = 0; i < n; i++) this.rainData.push([(Math.random() - 0.5) * 40, Math.random() * 25, (Math.random() - 0.5) * 40]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rainMesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xc5dcf0, transparent: true, opacity: 0 }));
    this.rainMesh.frustumCulled = false;
    this.scene.add(this.rainMesh);
  }

  // ---------- Жители ----------
  makePeople() {
    const looks = [
      { shirt: 0xf28fb0, hair: 0x6b4a32, skin: 0xf3c9a1 },
      { shirt: 0x78a6e3, hair: 0x2e2a2a, skin: 0xd9a77c, pants: 0x5a4a3a },
      { shirt: 0xffcf5c, hair: 0xc8743a, skin: 0xf6d4b4 },
      { shirt: 0x8fd16a, hair: 0xe8d27a, skin: 0xb98058, pants: 0x3a4a6a },
    ];
    // монетка над жителем, который готов дать бонус
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g2 = cv.getContext('2d');
    g2.fillStyle = 'rgba(255,255,255,0.9)';
    g2.beginPath();
    g2.arc(32, 32, 30, 0, Math.PI * 2);
    g2.fill();
    g2.fillStyle = '#ffcf3d';
    g2.strokeStyle = '#c8901a';
    g2.lineWidth = 5;
    g2.beginPath();
    g2.arc(32, 32, 21, 0, Math.PI * 2);
    g2.fill();
    g2.stroke();
    g2.lineWidth = 4;
    g2.beginPath();
    g2.arc(32, 32, 11, 0, Math.PI * 2);
    g2.stroke();
    const coinTex = new THREE.CanvasTexture(cv);
    coinTex.colorSpace = THREE.SRGBColorSpace;
    this.coinMat = new THREE.SpriteMaterial({ map: coinTex, depthWrite: false });
    this.coinSprites = [];
    this.peopleMeshes = looks.map((c, i) => {
      const g = person(c).build(VS * 0.58, 2.5, 2.5);
      const m = new THREE.InstancedMesh(g.geo, this.mat, 12);
      m.castShadow = true;
      m.count = 0;
      m.frustumCulled = false;
      this.scene.add(m);
      return m;
    });
  }

  // ---------- Воздушный шар ----------
  spawnBalloon() {
    if (this.balloon) return;
    const g = this.geom('balloon', () => balloon());
    const grp = this.meshFrom(g);
    grp.scale.setScalar(1.6);
    const a = Math.random() * Math.PI * 2;
    const R = this.bounds + 22;
    const from = new THREE.Vector3(Math.cos(a) * R, 5 + Math.random() * 3, Math.sin(a) * R);
    const to = new THREE.Vector3(-Math.cos(a + 0.4) * R, 5 + Math.random() * 3, -Math.sin(a + 0.4) * R);
    this.scene.add(grp);
    this.balloon = { grp, from, to, t: 0, dur: 38, popped: false };
  }

  // ---------- Обновление кадра ----------
  update(dt, now, rain) {
    this.time += dt;
    // время суток по реальным часам
    const tday = (((now / 1000 + (this.dayOffset || 0)) % DAY) + DAY) % DAY / DAY; // 0..1
    const sunA = tday * Math.PI * 2;
    const elev = Math.sin(sunA);
    const nightK = smooth(0.15, -0.25, elev); // 0 днём, 1 ночью
    this.night += (nightK - this.night) * Math.min(1, dt * 2);
    this.rain += ((rain ? 1 : 0) - this.rain) * Math.min(1, dt * 0.8);
    const n = this.night;
    const rk = this.rain;
    // солнце (днём) / луна (ночью)
    const sx = Math.cos(sunA) * 30;
    const sy = Math.max(12, Math.abs(elev) * 40);
    this.sun.position.set(sx, sy, 18);
    this.sun.target.position.set(0, 0, 0);
    const dusk = Math.max(0, 1 - Math.abs(elev) * 4) * (1 - n * 0.5);
    this.sun.color.setRGB(1, 0.94 - dusk * 0.2, 0.86 - dusk * 0.35).lerp(new THREE.Color(0x9fb4ff), n);
    this.sun.intensity = (2.3 * (1 - n) + 0.55 * n) * (1 - rk * 0.45);
    this.hemi.intensity = (1.5 * (1 - n) + 0.75 * n) * (1 - rk * 0.25);
    this.hemi.color.setRGB(1, 0.97, 1).lerp(new THREE.Color(0x7f8fd6), n);
    const top = new THREE.Color(0x8ccff7).lerp(new THREE.Color(0xf4a98f), dusk * 0.6).lerp(new THREE.Color(0x141b45), n).lerp(new THREE.Color(0x8a99a8), rk * 0.6);
    const bot = new THREE.Color(0xe9f6ff).lerp(new THREE.Color(0xffd2b0), dusk).lerp(new THREE.Color(0x2e3a78), n).lerp(new THREE.Color(0xb7c3cf), rk * 0.6);
    this.skyU.top.value.copy(top);
    this.skyU.bottom.value.copy(bot);
    this.fog.color.copy(bot);
    this.stars.material.opacity = n * (1 - rk);
    this.glowMat.color.setScalar(0.78 + 0.5 * n);
    for (const s of this.glowSprites) s.material.opacity = n * 0.95;
    this.skyU.sunDir.value.set(sx, sy * (n > 0.5 ? -1 : 1), 18);
    this.skyU.glow.value.setRGB(1, 0.86 + (1 - dusk) * 0.1, 0.7 + (1 - dusk) * 0.2).multiplyScalar((1 - n) * (1 - rk * 0.7));
    this.deco.update(dt, n, this.sun.position.clone(), rk);
    // облака
    for (const c of this.clouds) {
      c.a += c.sp * dt;
      c.m.position.set(Math.cos(c.a) * c.r, c.y, Math.sin(c.a) * c.r);
    }
    this.cloudMat.color.setRGB(1, 1, 1).lerp(new THREE.Color(0x8f97b8), n * 0.8).lerp(new THREE.Color(0xa5adb5), rk * 0.5);
    // дождь
    this.rainMesh.material.opacity = rk * 0.55;
    if (rk > 0.01) {
      const arr = this.rainMesh.geometry.attributes.position.array;
      for (let i = 0; i < this.rainData.length; i++) {
        const d = this.rainData[i];
        d[1] -= dt * 22;
        if (d[1] < -6) d[1] += 30;
        arr.set([d[0], d[1], d[2], d[0] + 0.05, d[1] + 0.6, d[2]], i * 6);
      }
      this.rainMesh.geometry.attributes.position.needsUpdate = true;
    }
    // перестройка склеенных участков
    if (this.dirtyPlots && this.dirtyPlots.size) {
      for (const [pk, at] of [...this.dirtyPlots]) {
        if (this.time >= at && !this.anims.length) {
          this.dirtyPlots.delete(pk);
          this.rebuildChunk(pk);
        }
      }
    }
    // анимации
    for (const o of this.objs.values())
      for (const e of o.extra) {
        if (e.kind === 'spinZ') e.obj.rotation.z += dt * e.speed;
        if (e.kind === 'bob') e.obj.position.y = e.base + Math.sin(this.time * 1.3) * 0.08;
      }
    for (const a of this.anims) {
      a.t += dt;
      a.fn(Math.min(1, a.t / a.d));
    }
    this.anims = this.anims.filter((a) => a.t < a.d);
    // шар
    const b = this.balloon;
    if (b) {
      b.t += dt;
      if (b.popped) {
        b.grp.position.y += dt * 8;
        b.grp.scale.multiplyScalar(1 - dt * 1.5);
        if (b.grp.scale.x < 0.2) this.removeBalloon();
      } else {
        const k = b.t / b.dur;
        b.grp.position.lerpVectors(b.from, b.to, k);
        b.grp.position.y += Math.sin(b.t * 0.8) * 0.4;
        if (k >= 1) this.removeBalloon();
      }
    }
  }

  removeBalloon() {
    if (!this.balloon) return;
    this.scene.remove(this.balloon.grp);
    this.balloon = null;
  }

  setPeople(list) {
    // list: [{x,z,rot,variant,bob}]
    const counts = [0, 0, 0, 0];
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const s = new THREE.Vector3(1, 1, 1);
    for (const p of list) {
      const mesh = this.peopleMeshes[p.variant];
      const i = counts[p.variant]++;
      if (i >= 12) continue;
      e.set(0, p.rot, 0);
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(p.x - HALF, p.y || 0, p.z - HALF), q, s);
      mesh.setMatrixAt(i, m4);
    }
    // монетки над готовыми жителями
    let ci = 0;
    const tt = performance.now() / 1000;
    for (const p of list) {
      if (!p.ready) continue;
      let sp = this.coinSprites[ci];
      if (!sp) {
        sp = new THREE.Sprite(this.coinMat);
        sp.renderOrder = 3;
        this.root.add(sp);
        this.coinSprites.push(sp);
      }
      sp.visible = true;
      sp.position.set(p.x - HALF, (p.y || 0) + 0.92 + Math.sin(tt * 3 + p.x * 2) * 0.05, p.z - HALF);
      sp.scale.setScalar(0.25);
      ci++;
    }
    for (let i = ci; i < this.coinSprites.length; i++) this.coinSprites[i].visible = false;
    this.peopleMeshes.forEach((m, i) => {
      m.count = Math.min(12, counts[i]);
      m.instanceMatrix.needsUpdate = true;
    });
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  // экранные координаты точки мира
  project(v, w, h) {
    const p = v.clone().project(this.camera);
    return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h, vis: p.z < 1 && p.z > -1 };
  }

  // луч из экранной точки на плоскость y=0 → клетка
  pickCell(nx, ny) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    const t = -ray.ray.origin.y / ray.ray.direction.y;
    if (!(t > 0)) return null;
    const p = ray.ray.origin.clone().addScaledVector(ray.ray.direction, t);
    return { x: Math.round(p.x + HALF), z: Math.round(p.z + HALF), wx: p.x, wz: p.z };
  }

  pickBalloon(nx, ny) {
    if (!this.balloon || this.balloon.popped) return false;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    const c = this.balloon.grp.position.clone();
    c.y += 1.2;
    return ray.ray.distanceToPoint(c) < 2.2;
  }

  pickPerson(nx, ny, people) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    let best = null;
    let bd = 0.45;
    for (const p of people) {
      // попадание по фигурке или по монетке над головой
      let d = ray.ray.distanceToPoint(new THREE.Vector3(p.x + (p.ox || 0) - HALF, 0.3, p.z + (p.oz || 0) - HALF));
      if (p.cd <= 0) d = Math.min(d, ray.ray.distanceToPoint(new THREE.Vector3(p.x + (p.ox || 0) - HALF, 0.92, p.z + (p.oz || 0) - HALF)));
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  // миниатюра модели для меню (dataURL)
  thumbnail(kind, type, lvl = 3) {
    if (!this.thumbR) {
      this.thumbC = document.createElement('canvas');
      this.thumbC.width = this.thumbC.height = 128;
      this.thumbR = new THREE.WebGLRenderer({ canvas: this.thumbC, alpha: true, antialias: true, preserveDrawingBuffer: true });
      this.thumbR.outputColorSpace = THREE.SRGBColorSpace;
      this.thumbScene = new THREE.Scene();
      this.thumbScene.add(new THREE.HemisphereLight(0xffffff, 0xa0b4c8, 1.8));
      const d = new THREE.DirectionalLight(0xffffff, 1.8);
      d.position.set(-3, 6, 5);
      this.thumbScene.add(d);
      this.thumbCam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    }
    const g = kind === 'b' ? this.buildingModel(type, lvl) : this.geom(`d_${type}_0`, () => DECOR_MODELS[type](0));
    const grp = this.meshFrom(g, false);
    grp.rotation.y = -0.6;
    this.thumbScene.add(grp);
    const bb = new THREE.Box3().setFromObject(grp);
    const size = bb.getSize(new THREE.Vector3());
    const ctr = bb.getCenter(new THREE.Vector3());
    const dist = Math.max(size.x, size.y, size.z) * 2.3 + 0.4;
    this.thumbCam.position.set(ctr.x + dist * 0.55, ctr.y + dist * 0.45, ctr.z + dist * 0.75);
    this.thumbCam.lookAt(ctr);
    this.thumbR.setClearColor(0x000000, 0);
    this.thumbR.render(this.thumbScene, this.thumbCam);
    const url = this.thumbC.toDataURL();
    this.thumbScene.remove(grp);
    return url;
  }
}

function smooth(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
function easeOutBack(k) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}
