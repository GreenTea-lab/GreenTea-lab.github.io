import {WILDLIFE,wildlifeUnlocked} from './wildlife.js';
import {planSites,contains,intersects,movedBox} from './spatial.js';
import {worldScale,WORLD_PROJECTS} from './world-data.js';
// 3D-остров в море: рельеф, вода, небо, пальмы, постройки, жители, звери, птицы, камера
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { hash, Vox } from './vox.js';
import * as M from './models.js';
import { findRoute } from './navigation.js';
import { DECOR_BY_ID, meadowFlower } from './decor.js';
import { PROJECTS } from './data.js';

const TS = 0.5; // размер «блока» рельефа
const RX = 15;
const RZ = 11;
export const WL = 0.3; // уровень воды
const NX = 46; // колонки от -NX до NX
const NZ = 36;

function vnoise(x, z, s) {
  const xi = Math.floor(x / s);
  const zi = Math.floor(z / s);
  const fx = x / s - xi;
  const fz = z / s - zi;
  const u = fx * fx * (3 - 2 * fx);
  const w = fz * fz * (3 - 2 * fz);
  const a = hash(xi, zi, 5);
  const b = hash(xi + 1, zi, 5);
  const c = hash(xi, zi + 1, 5);
  const d = hash(xi + 1, zi + 1, 5);
  return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
}
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const easeOutBack = (k) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};

function footBox(v,x,z,rot=0,scale=1,ceiling=null){
 let minX=v.minX,maxX=v.maxX+1,minZ=v.minZ,maxZ=v.maxZ+1;
 if(ceiling!==null){minX=minZ=Infinity;maxX=maxZ=-Infinity;for(const key of v.m.keys()){const yy=((key>>10)&1023)-512;if(yy>ceiling)continue;const xx=((key>>20)&1023)-512,zz=(key&1023)-512;minX=Math.min(minX,xx);maxX=Math.max(maxX,xx+1);minZ=Math.min(minZ,zz);maxZ=Math.max(maxZ,zz+1);}}
 const out={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity},c=Math.cos(rot),sn=Math.sin(rot);
 for(const xx of[minX,maxX])for(const zz of[minZ,maxZ]){const rx=(xx*c+zz*sn)*M.VS*scale+x,rz=(-xx*sn+zz*c)*M.VS*scale+z;out.minX=Math.min(out.minX,rx);out.maxX=Math.max(out.maxX,rx);out.minZ=Math.min(out.minZ,rz);out.maxZ=Math.max(out.maxZ,rz);}return out;
}

// «насколько внутри острова»: >0 — суша, <0 — вода
export function shapeF(x, z, tier=0) {
  const scale=worldScale(tier);
  const r = Math.sqrt((x / (RX*scale)) ** 2 + (z / (RZ*scale)) ** 2);
  const n = (vnoise(x + 40, z + 40, 4.5) - 0.5) * 0.24 + (vnoise(x + 7, z - 3, 1.8) - 0.5) * 0.07;
  // бухта на юго-западе
  const bay = Math.exp(-((x + 7) ** 2 + (z - 9) ** 2) / 10) * 0.25;
  let f=1-r+n-bay;
  for(const p of WORLD_PROJECTS)if(p.tier<=tier)f=Math.max(f,.38-Math.hypot(x-p.pos[0],z-p.pos[1])/9);
  return f;
}

const HILL = { x: -2.5, z: -6.5, r: 5.2 };
const cellKey = (x,z) => Math.floor(x/TS) + ',' + Math.floor(z/TS);
const angleFor = turn => turn * Math.PI/2;

export class Island {
  constructor(canvas, quality = 'high', expansion=0, decor=[], trimmedGrass=[]) {
    this.expansion=expansion;this.rx=15*worldScale(expansion);this.rz=11*worldScale(expansion);
    this.canvas = canvas;
    this.quality = quality;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance', preserveDrawingBuffer: !!window.__CS_DEBUG }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : quality === 'mid' ? 1.5 : 1));
    r.shadowMap.enabled = quality !== 'low';
    r.shadowMap.type = THREE.PCFShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    const scene = (this.scene = new THREE.Scene());
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.3, 600);
    scene.fog = new THREE.Fog(0xcdeefa, 90, 330);
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.time = 0;
    this.tableOrbit = 0;
    this.anims = [];
    this.stages = {};
    this.projObjs = {};
    this.builtAreas = [];
    this.projectAreas = new Map();
    this.trimmedGrass = new Set(trimmedGrass);
    this.walkers = [];
    this.fx = [];
    this.makeSky();
    this.makeLights();
    this.makeGlowTexture();
    this.sitePlan=planSites(expansion,(x,z)=>this.shapeF(x,z));
    this.staticEntries=[];
    this.buildTerrain();
    this.makeOcean();
    this.placeSpots();
    this.playerDecor = new Map();
    for (const item of decor) {
      if (item.x !== null && !this.installDecor(item, true)) item.x = item.z = null;
    }
    this.makeDecor();
    this.makeGrass();
    this.makeClouds();
    this.makeBirds();
    this.makeCritters();
    // камера: сферические координаты вокруг центра
    this.cam = { yaw: 0.25, pitch: 0.82, dist: 36*worldScale(this.expansion), tx: 0, ty: 0.6, tz: 0.5 };
    this.camT = null; // цель плавного перелёта
    this.mode = 'island';
    this.w = 1;
    this.h = 1;
  }

  shapeF(x,z){return shapeF(x,z,this.expansion);}

  // ---------- небо и свет ----------
  makeSky() {
    this.skyU = { top: { value: new THREE.Color(0x5fb8f0) }, bottom: { value: new THREE.Color(0xd9f3ff) }, sunDir: { value: new THREE.Vector3(0.4, 0.5, -0.6).normalize() }, glow: { value: new THREE.Color(0xfff3d6) } };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(500, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: this.skyU,
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 glow; varying vec3 vP; void main(){ float h = clamp(vP.y*1.4+0.08,0.0,1.0); vec3 c = mix(bottom, top, pow(h, 0.7)); float s = max(dot(normalize(vP), normalize(sunDir)), 0.0); c += glow * (pow(s, 8.0) * 0.35 + pow(s, 400.0) * 1.2); gl_FragColor = vec4(c,1.0); }',
      })
    );
    sky.renderOrder = -10;
    this.scene.add(sky);
  }
  makeLights() {
    this.hemi = new THREE.HemisphereLight(0xfffaf0, 0x7fb6c8, 1.55);
    this.scene.add(this.hemi);
    const s = (this.sun = new THREE.DirectionalLight(0xfff0d8, 2.4));
    s.position.set(14, 26, 10);
    s.castShadow = this.quality !== 'low';
    const ms = this.quality === 'high' ? 2048 : 1024;
    s.shadow.mapSize.set(ms, ms);
    const sc = s.shadow.camera;
    sc.left = -this.rx-5;
    sc.right = this.rx+5;
    sc.top = this.rz+6;
    sc.bottom = -this.rz-6;
    sc.near = 1;
    sc.far = 80;
    s.shadow.bias = -0.0006;
    s.shadow.normalBias = 0.03;
    this.scene.add(s);
    this.scene.add(s.target);
  }
  makeGlowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,235,170,1)');
    gr.addColorStop(0.35, 'rgba(255,210,120,0.45)');
    gr.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 64, 64);
    this.glowTex = new THREE.CanvasTexture(c);
    const d = document.createElement('canvas');
    d.width = d.height = 64;
    const dx = d.getContext('2d');
    const g2 = dx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g2.addColorStop(0, 'rgba(255,255,255,0.95)');
    g2.addColorStop(0.6, 'rgba(240,230,210,0.5)');
    g2.addColorStop(1, 'rgba(240,230,210,0)');
    dx.fillStyle = g2;
    dx.fillRect(0, 0, 64, 64);
    this.puffTex = new THREE.CanvasTexture(d);
  }
  glow(color = 0xffc070, size = 2) {
    const m = new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 });
    const s = new THREE.Sprite(m);
    s.scale.set(size, size, 1);
    return s;
  }

  // ---------- рельеф ----------
  hvAt(i, k) {
    const x = i * TS + TS / 2;
    const z = k * TS + TS / 2;
    const f = this.shapeF(x, z);
    if (f < -0.16) return -99;
    if (f < 0) return f < -0.07 ? -1 : 0;
    let h = f < 0.1 ? 1 : 2;
    const hd = Math.hypot(x - HILL.x, z - HILL.z);
    if (hd < HILL.r) h += Math.round(4.6 * smooth(HILL.r, 1.2, hd) + (vnoise(x, z, 1.3) - 0.5) * 1.2);
    // площадки под постройки ровные
    for (const p of PROJECTS) {
      if((p.tier||0)>this.expansion)continue;
      if (p.water) continue;
      const site=this.sitePlan[p.id];
      if (site && contains(site.box,x,z,.5)) h = p.id === 'beacon' ? (this._beaconH || h) : 2;
    }
    return h;
  }
  buildTerrain() {
    // площадка маяка — по высоте вершины холма
    this._beaconH = 0;
    const W = NX * 2;
    const D = NZ * 2;
    const hv = (this.hv = new Int8Array(W * D));
    const idx = (i, k) => (i + NX) * D + (k + NZ);
    // сначала холм для площадки маяка
    {
      const p = PROJECTS.find((q) => q.id === 'beacon');
      const hd = Math.hypot(p.pos[0] - HILL.x, p.pos[1] - HILL.z);
      this._beaconH = 2 + Math.round(4.6 * smooth(HILL.r, 1.2, hd));
    }
    for (let i = -NX; i < NX; i++) for (let k = -NZ; k < NZ; k++) hv[idx(i, k)] = this.hvAt(i, k);
    this.hvIdx = idx;
    const pos = [];
    const nor = [];
    const col = [];
    const ind = [];
    const c = new THREE.Color();
    const quad = (a, b, cc, d, n, color, k1 = 1, k2 = 1) => {
      const base = pos.length / 3;
      pos.push(...a, ...b, ...cc, ...d);
      for (let i = 0; i < 4; i++) nor.push(...n);
      c.setHex(color);
      const ks = [k1, k1, k2, k2];
      for (let i = 0; i < 4; i++) col.push(c.r * ks[i], c.g * ks[i], c.b * ks[i]);
      ind.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    const get = (i, k) => (i < -NX || i >= NX || k < -NZ || k >= NZ ? -99 : hv[idx(i, k)]);
    const BOTTOM = -4;
    for (let i = -NX; i < NX; i++)
      for (let k = -NZ; k < NZ; k++) {
        const h = get(i, k);
        if (h === -99) continue;
        const x0 = i * TS;
        const z0 = k * TS;
        const x1 = x0 + TS;
        const z1 = z0 + TS;
        const y = h * TS;
        const xc = x0 + TS / 2;
        const zc = z0 + TS / 2;
        const f = this.shapeF(xc, zc);
        const j = (hash(i, k, 3) - 0.5) * 0.05;
        let top;
        if (h <= 0) top = h < 0 ? 0xd9c48e : 0xe6d29b;
        else if (h === 1) top = f < 0.04 ? 0xf0d9a0 : 0xf3dca0;
        else if (h >= 5) top = this.rockTile(xc, zc) ? 0xb9b2a6 : 0x92b66d;
        else top = f < 0.13 ? (hash(i, k) > 0.5 ? 0xb8d37a : 0xd9d690) : hash(i, k, 2) > 0.8 ? 0x96d468 : 0x86cf62;
        if (h >= 1 && h <= 2 && this.onPath(xc, zc)) top = hash(i, k, 4) > 0.5 ? 0xe8d39a : 0xdcc489;
        top = new THREE.Color(top).offsetHSL(0, 0, j).getHex();
        quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], top);
        const sides = [
          [1, 0, [x1, z1], [x1, z0]],
          [-1, 0, [x0, z0], [x0, z1]],
          [0, 1, [x0, z1], [x1, z1]],
          [0, -1, [x1, z0], [x0, z0]],
        ];
        for (const [dx, dz, A, Bp] of sides) {
          const nh = get(i + dx, k + dz);
          const ny = nh === -99 ? BOTTOM : nh * TS;
          if (ny >= y) continue;
          for (let yy = y; yy > ny + 1e-4; yy -= TS) {
            const yb = Math.max(ny, yy - TS);
            const layer = Math.round(yy / TS);
            let sc;
            if (h >= 2 && layer === h) sc = h >= 5 ? 0x9b9286 : 0x78b958;
            else if (layer >= 3) sc = 0xa89c8c;
            else sc = 0xe2c483;
            if (layer <= 0) sc = 0xd2b678;
            sc = new THREE.Color(sc).offsetHSL(0, 0, (hash(i, k, layer) - 0.5) * 0.05).getHex();
            const lk = dx === 1 ? 0.88 : dx === -1 ? 0.8 : dz === 1 ? 0.95 : 0.74;
            quad([Bp[0], yy, Bp[1]], [A[0], yy, A[1]], [A[0], yb, A[1]], [Bp[0], yb, Bp[1]], [dx, 0, dz], sc, lk, lk * 0.95);
          }
        }
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(ind);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, this.mat);
    m.receiveShadow = true;
    m.castShadow = true;
    this.scene.add(m);
    this.terrain = m;
  }
  // тропинки от хижины к остальным постройкам
  onPath(x, z) {
    if (!this._paths) {
      const base=this.sitePlan.hut;const h=[base.x,base.z];
      this._paths = PROJECTS.slice(1).filter((p) => (p.tier||0)<=this.expansion && p.id !== 'beacon' && p.id !== 'lookout').map((p) => [h[0], h[1] + 1.8, this.sitePlan[p.id].x, this.sitePlan[p.id].z]);
      this._paths.push([h[0], h[1] + 1.8, -2.6, -4.6]);
    }
    for (const [ax, az, bx, bz] of this._paths) {
      const vx = bx - ax;
      const vz = bz - az;
      const L = vx * vx + vz * vz;
      let t = ((x - ax) * vx + (z - az) * vz) / L;
      t = Math.max(0, Math.min(1, t));
      // лёгкий изгиб
      const wob = Math.sin(t * 6 + ax) * 0.5;
      const px = ax + vx * t + (-vz / Math.sqrt(L)) * wob;
      const pz = az + vz * t + (vx / Math.sqrt(L)) * wob;
      if (Math.hypot(x - px, z - pz) < 0.42 + (vnoise(x, z, 0.7) - 0.5) * 0.3) return true;
    }
    return false;
  }
  // высота земли в точке (мир)
  ground(x, z) {
    const i = Math.floor(x / TS);
    const k = Math.floor(z / TS);
    if (i < -NX || i >= NX || k < -NZ || k >= NZ) return -2;
    const h = this.hv[this.hvIdx(i, k)];
    return h === -99 ? -2 : h * TS;
  }
  isLand(x, z, minF = 0.03) {
    return this.shapeF(x, z) > minF && this.ground(x, z) > 0.4;
  }
  rockTile(x,z) {
    const cx=(Math.floor(x/TS)+.5)*TS,cz=(Math.floor(z/TS)+.5)*TS;
    return this.ground(cx,cz) >= 5*TS && vnoise(cx+1,cz-1,2.1) <= .49;
  }

  // ---------- вода ----------
  makeOcean() {
    // поле расстояний до берега
    const N = 160;
    const S = 80; // мировой размер области
    const dist = new Float32Array(N * N).fill(1e6);
    const q = [];
    for (let a = 0; a < N; a++)
      for (let b = 0; b < N; b++) {
        const x = (a / N - 0.5) * S;
        const z = (b / N - 0.5) * S;
        if (this.ground(x, z) > 0.2) {
          dist[a * N + b] = 0;
          q.push(a * N + b);
        }
      }
    // проход «шахматным» расстоянием
    for (let pass = 0; pass < 2; pass++) {
      const order = pass === 0 ? [0, N, 1] : [N - 1, -1, -1];
      for (let a = order[0]; a !== order[1]; a += order[2])
        for (let b = order[0]; b !== order[1]; b += order[2]) {
          let d = dist[a * N + b];
          for (const [da, db, w] of [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.414], [-1, 1, 1.414]]) {
            const aa = a + da * order[2];
            const bb = b + db * order[2];
            if (aa < 0 || bb < 0 || aa >= N || bb >= N) continue;
            d = Math.min(d, dist[aa * N + bb] + w);
          }
          dist[a * N + b] = d;
        }
    }
    const data = new Uint8Array(N * N * 4);
    for (let a = 0; a < N; a++)
      for (let b = 0; b < N; b++) {
        const d = (dist[a * N + b] * S) / N; // в мировых единицах
        const x = (a / N - 0.5) * S;
        const z = (b / N - 0.5) * S;
        const shelf = this.ground(x, z) > -1 ? 1 : 0; // мель
        const o = (b * N + a) * 4;
        data[o] = Math.min(255, (d / 14) * 255);
        data[o + 1] = shelf * 255;
        data[o + 2] = 0;
        data[o + 3] = 255;
      }
    const tex = new THREE.DataTexture(data, N, N);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    this.oceanU = {
      time: { value: 0 },
      distTex: { value: tex },
      area: { value: S },
      shallow: { value: new THREE.Color(0x5fe0d6) },
      mid: { value: new THREE.Color(0x2fb3d8) },
      deep: { value: new THREE.Color(0x1e7fc4) },
      fogColor: { value: new THREE.Color(0xcdeefa) },
      fogNear: { value: 90 },
      fogFar: { value: 330 },
    };
    const geo = new THREE.PlaneGeometry(900, 900, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.oceanU,
      transparent: true,
      depthWrite: false,
      vertexShader: `varying vec3 vW; varying float vDepth;
        void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float time; uniform sampler2D distTex; uniform float area; uniform vec3 shallow; uniform vec3 mid; uniform vec3 deep;
        uniform vec3 fogColor; uniform float fogNear; uniform float fogFar; varying vec3 vW; varying float vDepth;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float n2(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
        void main(){
          vec2 uv = vW.xz / area + 0.5;
          vec4 t = texture2D(distTex, uv);
          float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
          float d = mix(14.0, t.r * 14.0, inside);
          float shelf = t.g * inside;
          vec3 c = mix(shallow, mid, smoothstep(0.0, 3.5, d));
          c = mix(c, deep, smoothstep(3.0, 13.0, d));
          // рябь
          float r1 = n2(vW.xz * 0.45 + vec2(time * 0.18, time * 0.11));
          float r2 = n2(vW.xz * 0.9 - vec2(time * 0.14, -time * 0.16));
          float rip = r1 * 0.6 + r2 * 0.4;
          c *= 0.95 + rip * 0.08;
          // мелкие блики
          float s1 = n2(vW.xz * 3.1 + vec2(time * 0.6, time * 0.2));
          float s2 = n2(vW.xz * 2.3 - vec2(time * 0.3, -time * 0.5));
          float sp = smoothstep(0.86, 0.97, s1 * s2 * 1.25 + rip * 0.1) * (1.0 - smoothstep(60.0, 160.0, vDepth));
          c += vec3(1.0) * sp * 0.28;
          // пена у берега: кромка + бегущие кольца
          float edge = 1.0 - smoothstep(0.0, 0.55 + rip * 0.25, d);
          float ring = smoothstep(0.82, 1.0, sin(d * 3.2 - time * 1.6) * 0.5 + 0.5) * (1.0 - smoothstep(0.3, 2.2, d)) * (0.55 + 0.45 * rip);
          c = mix(c, vec3(1.0), clamp(edge * 0.95 + ring * 0.6, 0.0, 1.0));
          float a = mix(0.62, 0.97, smoothstep(0.0, 2.6, d));
          a = max(a, edge * 0.95);
          float fogF = smoothstep(fogNear, fogFar, vDepth);
          c = mix(c, fogColor, fogF);
          gl_FragColor = vec4(c, a);
        }`,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = WL;
    m.renderOrder = 1;
    this.scene.add(m);
    this.ocean = m;
  }

  // ---------- точки построек ----------
  placeSpots() {
    this.spots={};
    for(const p of PROJECTS){const site=this.sitePlan[p.id];if(!site)continue;this.spots[p.id]={...site,y:Math.max(.5,this.ground(site.x,site.z))};}
  }

  // ---------- декор ----------
  geomOf(v) {
    return v.build(M.VS, 0, 0);
  }
  addStatic(list,v,x,z,rot=0,scale=1,y=null,tree=false,blocks=true) {
    // A tree needs dry, level ground under its trunk, not under its whole crown.
    const bounds=footBox(v,x,z,rot,scale);
    const support=tree?footBox(v,x,z,rot,scale,v.minY+8):bounds;
    const placement = this.staticPlacement(v, bounds, support, x, z, scale, y, tree, blocks);
    if (!placement) return false;
    placement.nav = footBox(v,x,z,rot,scale,Math.min(v.maxY,v.minY+8));
    this.staticEntries.push(placement);
    const g=this.geomOf(v),matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,placement.base,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),rot),new THREE.Vector3(scale,scale,scale));
    if(g.geo)list.solid.push(g.geo.applyMatrix4(matrix));if(g.glow)list.glow.push(g.glow.applyMatrix4(matrix));return true;
  }
  staticPlacement(v, bounds, support, x, z, scale, y, tree, blocks, player=false) {
    const water = y !== null;
    const edge=.001;
    const samples=[[support.minX+edge,support.minZ+edge],[support.maxX-edge,support.minZ+edge],[support.minX+edge,support.maxZ-edge],[support.maxX-edge,support.maxZ-edge],[x,z]];
    const heights=samples.map(([xx,zz])=>this.ground(xx,zz));
    if(!water && (Math.min(...heights)<.4||Math.max(...heights)-Math.min(...heights)>.1))return null;
    const base=y??(Math.max(...heights)-v.minY*M.VS*scale),minY=base+v.minY*M.VS*scale,maxY=base+(v.maxY+1)*M.VS*scale;
    const area={...bounds,base,minY,maxY,x,z,water,tree,blocks,player};
    if(player ? this.builtAreas.some(box=>this.overlaps(area,box)) :
      Object.values(this.spots).some(p=>intersects(bounds,p.box,.22)))return null;
    if(this.staticEntries.some(b=>!b.groundCover && this.overlaps(area,b,player ? .01 : .14)))return null;
    return area;
  }
  overlaps(a,b,gap=0) {
    return intersects(a,b,gap) && a.minY < b.maxY+.03 && a.maxY > b.minY-.03;
  }
  decorShape(def,turn=0) {
    const model = def.model();
    const rot=angleFor(turn);
    const support=footBox(model,0,0,rot,1,def.tree ? model.minY+8 : null);
    const ox=-(support.minX+support.maxX)/2,oz=-(support.minZ+support.maxZ)/2;
    return {model,def,turn,rot,ox,oz,bounds:movedBox(footBox(model,0,0,rot),ox,oz),
      support:movedBox(support,ox,oz),nav:movedBox(footBox(model,0,0,rot,1,Math.min(model.maxY,model.minY+8)),ox,oz)};
  }
  decorPlacement(shape, x, z) {
    if (!this.isLand(x,z,0)) return null;
    const cover=!!shape.def.groundCover;
    if (cover && (this.rockTile(x,z) || this.staticEntries.some(b=>b.groundCover&&cellKey(b.x,b.z)===cellKey(x,z)))) return null;
    const bounds = movedBox(shape.bounds,x,z);
    const support = movedBox(shape.support,x,z);
    return this.staticPlacement(shape.model,bounds,support,x,z,1,null,!!shape.def.tree,!cover,true);
  }
  installDecor(item, relocate = false) {
    const def = DECOR_BY_ID[item.type];
    if (!def || this.playerDecor.has(item.id)) return false;
    const turn=item.turn||0;
    const selected=this.decorPicker?.shape;
    const shape = selected?.def === def && selected.turn === turn ? selected : this.decorShape(def,turn);
    const place = (x, z) => {
      const entry = this.decorPlacement(shape,x,z);
      if (!entry) return false;
      entry.nav = movedBox(shape.nav,x,z);
      entry.groundCover=!!def.groundCover;
      this.staticEntries.push(entry);
      const group = this.meshOf(shape.model);
      group.position.set(x+shape.ox,entry.base,z+shape.oz);
      group.rotation.y=shape.rot;
      this.scene.add(group);
      this.playerDecor.set(item.id, {group, entry, item});
      Object.assign(item, {x, z});
      this.refreshPaths();
      this.maskGrass();
      return true;
    };
    if (place(item.x, item.z)) return true;
    if (!relocate) return false;
    for (let radius = .5; radius <= 5; radius += .5) {
      for (let i = 0; i < 16; i++) {
        const angle = i * Math.PI / 8;
        const x = Math.round((item.x + radius * Math.cos(angle)) * 4) / 4;
        const z = Math.round((item.z + radius * Math.sin(angle)) * 4) / 4;
        if (place(x, z)) return true;
      }
    }
    return false;
  }
  storeDecor(id, refresh = true) {
    const placed = this.playerDecor.get(id);
    if (!placed) return false;
    this.scene.remove(placed.group);
    placed.group.traverse(object => object.geometry?.dispose());
    this.staticEntries.splice(this.staticEntries.indexOf(placed.entry), 1);
    this.playerDecor.delete(id);
    if(refresh){this.refreshPaths();this.maskGrass();}
    return true;
  }
  storeDecorForProject(id, stage) {
    if (!stage) return 0;
    const area=this.projectArea(id,stage);
    let stored=0;
    for(const [key,{entry,item}] of this.playerDecor) {
      if(!this.overlaps(entry,area)) continue;
      this.storeDecor(key,false);
      item.x=item.z=null;
      stored++;
    }
    if(stored)this.maskGrass();
    return stored;
  }
  refreshPaths() {
    this.navCache?.clear();
    for (const actor of this.landAnimals ? this.allActors() : []) {
      actor.route = [];
      this.relocateWalker(actor);
    }
  }
  makeGrass() {
    const vertices = [], colors = [];
    const shades = [0x478c35, 0x61a842, 0x83b449, 0x6aaf45];
    for (let i = 0; i < 5; i++) {
      const x = (hash(i,11)-.5)*.38, z = (hash(i,12)-.5)*.35;
      const lean = (hash(i,13)-.5)*.24, height = .15 + hash(i,14)*.28;
      const color = new THREE.Color(shades[i%shades.length]);
      for (const [dx,dz] of [[.045,0],[0,.045]]) {
        vertices.push(x-dx,0,z-dz,x+dx,0,z+dz,x+lean,height,z+lean);
        colors.push(color.r*.78,color.g*.78,color.b*.78,color.r,color.g,color.b,color.r,color.g,color.b);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const material = new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide});
    const spots = [];
    for (let i=-NX+1; i<NX; i++) for (let j=-NZ+1; j<NZ; j++) {
      const x=(i+.5)*TS,z=(j+.5)*TS;
      if (hash(i,j,553) > .20 + .18*vnoise(x,z,2) || this.ground(x,z) < .9 || this.rockTile(x,z) ||
          !this.isLand(x,z,.11) || this.onPath(x,z) ||
          this.staticEntries.some(entry => !entry.player && !entry.water && contains(entry,x,z,.12))) continue;
      spots.push({x,z});
    }
    const mesh = new THREE.InstancedMesh(geometry,material,spots.length);
    mesh.frustumCulled = false;
    this.grass = {mesh, spots};
    this.scene.add(mesh);
    this.maskGrass();
  }
  maskGrass() {
    if (!this.grass) return;
    const {mesh, spots} = this.grass;
    const placed = [...this.playerDecor.values()];
    const obstacles = this.builtAreas;
    for(const {group,entry} of placed) {
      if (entry.groundCover) group.visible = !placed.some(p=>!p.entry.groundCover&&this.overlaps(entry,p.entry));
    }
    const transform = new THREE.Object3D();
    this.grass.visible=new Set();
    spots.forEach(({x,z}, index) => {
      const hidden = this.trimmedGrass.has(cellKey(x,z)) || placed.some(({entry}) => contains(entry,x,z,.14)) ||
        obstacles.some(area=>contains(area,x,z,.05) && area.minY<this.ground(x,z)+.45);
      if(!hidden)this.grass.visible.add(cellKey(x,z));
      transform.position.set(x,this.ground(x,z),z);
      transform.rotation.y = hash(index,17) * Math.PI * 2;
      transform.scale.setScalar(hidden ? 0 : .65 + hash(index,18)*.75);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  manualGrassAt(x,z) {
    return [...this.playerDecor.values()].find(({entry})=>entry.groundCover&&cellKey(x,z)===cellKey(entry.x,entry.z));
  }
  hasGrass(x,z) {
    return !!this.manualGrassAt(x,z) || this.grass.visible.has(cellKey(x,z));
  }
  removeGrass(x,z) {
    if(!this.hasGrass(x,z)) return false;
    const manual=this.manualGrassAt(x,z);
    if(manual){
      this.storeDecor(manual.item.id,false);
      manual.item.x=manual.item.z=null;
    }
    this.trimmedGrass.add(cellKey(x,z));
    this.maskGrass();
    return true;
  }
  showDecorGrid(def, turn=0, removing=false) {
    this.hideDecorGrid();
    const shape = this.decorShape(def,turn);
    const group = new THREE.Group();
    const lines = [];
    const half = TS*.43;
    for (let i=-NX; i<NX; i++) for (let j=-NZ; j<NZ; j++) {
      const x=(i+.5)*TS,z=(j+.5)*TS;
      if (removing ? !this.hasGrass(x,z) : !this.decorPlacement(shape,x,z)) continue;
      const y=this.ground(x,z)+.035;
      lines.push(x-half,y,z-half,x+half,y,z-half, x+half,y,z-half,x+half,y,z+half,
        x+half,y,z+half,x-half,y,z+half, x-half,y,z+half,x-half,y,z-half);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(lines,3));
    const grid = new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0xb7ff90,transparent:true,opacity:.74,depthWrite:false}));
    group.add(grid);
    const ghost = this.meshOf(shape.model,false);
    ghost.rotation.y=shape.rot;
    for (const part of ghost.children) {
      part.material = new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.68,depthWrite:false});
      part.renderOrder = 2;
    }
    const geometryMarker=new THREE.BufferGeometry();
    const marker=new THREE.Mesh(geometryMarker,new THREE.MeshBasicMaterial({
      color:0xc3ff99,side:THREE.DoubleSide,transparent:true,opacity:.48,depthWrite:false,
    }));
    marker.frustumCulled=false;
    marker.renderOrder=1;
    ghost.visible = marker.visible = false;
    group.add(ghost,marker);
    this.scene.add(group);
    this.decorPicker = {group,shape,ghost,marker,removing,available:lines.length/24};
  }
  previewDecor(point) {
    const picker = this.decorPicker;
    if (!picker) return false;
    const {ghost,marker,shape,removing} = picker;
    ghost.visible = !!point && !removing;
    marker.visible = !!point;
    if (!point) {picker.footprint=0;return false;}
    const {x,z} = point;
    const place = removing ? this.hasGrass(x,z) : this.decorPlacement(shape,x,z);
    const y = place?.base ?? Math.max(WL,this.ground(x,z))-shape.model.minY*M.VS;
    const bounds = shape.def.groundCover ? {minX:x-TS/2,maxX:x+TS/2,minZ:z-TS/2,maxZ:z+TS/2} : movedBox(shape.bounds,x,z);
    ghost.position.set(x+shape.ox,y,z+shape.oz);
    for (const part of ghost.children) part.material.color.setHex(place ? 0xcaffbb : 0xff6559);
    marker.material.color.setHex(place && !removing ? 0x9bff5c : 0xff735e);
    const positions=[];
    const firstX=Math.floor((bounds.minX+.001)/TS),endX=Math.ceil((bounds.maxX-.001)/TS);
    const firstZ=Math.floor((bounds.minZ+.001)/TS),endZ=Math.ceil((bounds.maxZ-.001)/TS);
    for(let i=firstX;i<endX;i++)for(let j=firstZ;j<endZ;j++){
      const cx=(i+.5)*TS,cz=(j+.5)*TS,cy=Math.max(WL,this.ground(cx,cz))+.045,h=TS*.43;
      positions.push(cx-h,cy,cz-h,cx-h,cy,cz+h,cx+h,cy,cz+h,cx-h,cy,cz-h,cx+h,cy,cz+h,cx+h,cy,cz-h);
    }
    marker.geometry.dispose();
    marker.geometry=new THREE.BufferGeometry();
    marker.geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    picker.footprint=positions.length/18;
    return !!place;
  }
  hideDecorGrid() {
    if (!this.decorPicker) return;
    const {group} = this.decorPicker;
    this.scene.remove(group);
    group.traverse(object => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
    this.decorPicker = null;
  }
  nearSpot(x,z,pad=1.2){return Object.values(this.spots).some(p=>contains(p.box,x,z,pad));}
  makeDecor() {
    const list = { solid: [], glow: [] };
    const R = (k) => hash(k, 77, 13);
    // Count successfully planted palms, not rejected candidate positions.
    this.palmPos=[];
    const treeTarget=20+this.expansion*3;
    let tries = 0;
    while (this.palmPos.length < treeTarget && tries++ < 2600) {
      const a = R(tries) * Math.PI * 2;
      const rr = 0.55 + R(tries + 500) * 0.4;
      const x = Math.cos(a) * this.rx * rr;
      const z = Math.sin(a) * this.rz * rr;
      const f = this.shapeF(x, z);
      if (f < 0.055 || this.ground(x,z)<.7) continue;
      if (this.nearSpot(x, z, .35)) continue;
      if (this.palmPos.some((p) => Math.hypot(p[0] - x, p[1] - z) < 2.1)) continue;
      // не загораживать вид с юга на лагерь
      if (z > 4 && Math.abs(x) < 3) continue;
      const scale=.82+R(tries+1500)*.2;
      if(this.addStatic(list,M.palm(tries+3,24+Math.floor(R(tries+1200)*10)),x,z,R(tries+1400)*6,scale,null,true))this.palmPos.push([x,z]);
    }
    // роща у смотровой
    for (const [dx, dz] of [[-2, -2.4], [1.6, -2.6], [-2.6, 1.4]]) {
      const s = this.spots.lookout;
      const x=s.x+dx,z=s.z+dz;
      if(this.palmPos.some(p=>Math.hypot(p[0]-x,p[1]-z)<2.1))continue;
      if(this.addStatic(list,M.palm(50+dx,26),x,z,dx,.9,null,true))this.palmPos.push([x,z]);
    }
    // Ground cover and blooming shrubs appear on every new coast.
    this.naturalPlants = 0;
    this.hillPlants = 0;
    // Use the centres of individual terraces so plants sit flat on the stepped hill.
    const hillPlants = [];
    for (let i = 0; i < 144 && this.hillPlants < 12; i++) {
      const angle = i * 2.39996;
      const radius = 2.2 + R(i + 2700) * 2.6;
      const x = Math.floor((HILL.x + Math.cos(angle) * radius) / TS) * TS + TS / 2;
      const z = Math.floor((HILL.z + Math.sin(angle) * radius) / TS) * TS + TS / 2;
      if (!this.isLand(x, z, .065) || this.onPath(x, z) || hillPlants.some(p => Math.hypot(x-p.x,z-p.z) < 1.35)) continue;
      const model = this.hillPlants < 2 ? DECOR_BY_ID.lantern.model() : meadowFlower(i);
      if (this.addStatic(list, model, x, z, 0, .59, null, false, false)) {
        hillPlants.push({x,z});
        this.hillPlants++;
      }
    }
    const flowers = [];
    for (let i = 0; i < 680 && this.naturalPlants < 29 + this.expansion * 5; i++) {
      const x = (R(i * 3 + 19) - .5) * this.rx * 1.9;
      const z = (R(i * 3 + 20) - .5) * this.rz * 1.9;
      const hill = Math.hypot(x - HILL.x, z - HILL.z) < HILL.r - .3;
      if (hill) continue;
      if (!this.isLand(x, z, .075) || this.onPath(x, z) || this.nearSpot(x, z, .24)) continue;
      const shrub = R(i * 3 + 21) < .21;
      if (!shrub && flowers.some(p => Math.hypot(x-p.x,z-p.z) < 2)) continue;
      const plant = shrub ? M.bush(i, true) : meadowFlower(i);
      if (this.addStatic(list, plant, x, z, 0, shrub ? .82 : .65, null, false, shrub)) {
        if (!shrub) flowers.push({x,z});
        this.naturalPlants++;
      }
    }
    // ракушки, звёзды, коряги на песке
    for (let i = 0; i < 60; i++) {
      const a = R(i + 900) * Math.PI * 2;
      const rr = 0.86 + R(i + 1900) * 0.18;
      const x = Math.cos(a) * this.rx * rr;
      const z = Math.sin(a) * this.rz * rr;
      const f = this.shapeF(x, z);
      if (f < 0.0 || f > 0.09 || this.nearSpot(x, z, 0.6) || this.ground(x, z) < 0.4) continue;
      const t = R(i + 300);
      if (t < 0.18) this.addStatic(list, M.driftwood(i), x, z, a + 1.2);
      else this.addStatic(list, M.shell(t < 0.55 ? 0 : 1), x, z, a * 3);
    }
    // камни в воде
    for (let i = 0; i < 26; i++) {
      const a = R(i + 4000) * Math.PI * 2;
      const rr = 1.05 + R(i + 4100) * 0.14;
      const x = Math.cos(a) * this.rx * rr;
      const z = Math.sin(a) * this.rz * rr;
      if (this.nearSpot(x, z, 2) || (z > 6 && Math.abs(x) < 7)) continue;
      const g = this.ground(x, z);
      this.addStatic(list, M.rock(i + 50, 0.9 + R(i) * 0.8), x, z, a, 1, g > -1 ? g - 0.2 : -0.4);
    }
    // затонувший корабль на рифе (юго-запад)
    {
      let x = 0;
      let z = 0;
      const a = 2.35;
      for (let s = 8; s < 30; s += 0.25) {
        x = Math.cos(a) * s;
        z = Math.sin(a) * s;
        if (this.shapeF(x, z) < -0.1) break;
      }
      const g = new THREE.Group();
      const geo = this.geomOf(M.wreck());
      const mesh = new THREE.Mesh(geo.geo, this.mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      g.scale.setScalar(1.5);
      g.position.set(x - 1.5, -0.45, z + 1.5);
      g.rotation.set(0.18, -0.6, 0.12);
      let wreckBox;
      for(let attempt=0;attempt<24;attempt++){
        g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g);wreckBox={minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z,minY:b.min.y,maxY:b.max.y,water:true};
        if(!Object.values(this.spots).some(p=>intersects(wreckBox,p.box,.4))&&!this.staticEntries.some(p=>intersects(wreckBox,p,.25)))break;
        g.position.x-=.5;g.position.z+=.5;
      }
      this.staticEntries.push(wreckBox);this.scene.add(g);
      this.wreckPos = [g.position.x,g.position.z];
      // ящики и бочки, выброшенные на берег
      const bx = Math.cos(a) * this.rx * 0.8;
      const bz = Math.sin(a) * this.rz * 0.8;
      for (const [dx, dz, kind] of [[0, 0, 'c'], [1.1, 0.4, 'b'], [-0.6, 1, 'c2']]) {
        const xx = bx + dx;
        const zz = bz + dz;
        if (this.ground(xx, zz) < 0.4 || this.nearSpot(xx, zz, 0.3)) continue;
        this.addStatic(list, kind === 'b' ? M.barrel() : M.crate(kind === 'c2'), xx, zz, dx * 2 + 0.4);
      }
    }
    const grp = new THREE.Group();
    if (list.solid.length) {
      const m = new THREE.Mesh(mergeGeometries(list.solid), this.mat);
      m.castShadow = true;
      m.receiveShadow = true;
      grp.add(m);
    }
    if (list.glow.length) grp.add(new THREE.Mesh(mergeGeometries(list.glow), this.glowMat));
    this.scene.add(grp);
  }

  makeClouds() {
    this.clouds = [];
    for (let i = 0; i < 12; i++) {
      const g = this.geomOf(M.cloud(i + 10));
      const m = new THREE.Mesh(g.geo, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x9fb4c8, emissiveIntensity: 0.45 }));
      const s = 3 + hash(i, 3) * 3;
      m.scale.set(s, s * 0.8, s);
      const a = hash(i, 1) * Math.PI * 2;
      const r = 60 + hash(i, 2) * 120;
      m.position.set(Math.cos(a) * r, 26 + hash(i, 4) * 26, Math.sin(a) * r);
      m.userData.v = 0.6 + hash(i, 5) * 0.8;
      this.scene.add(m);
      this.clouds.push(m);
    }
  }

  meshOf(v, shadow = true) {
    const g = this.geomOf(v);
    const grp = new THREE.Group();
    if (g.geo) {
      const m = new THREE.Mesh(g.geo, this.mat);
      m.castShadow = shadow;
      m.receiveShadow = true;
      grp.add(m);
    }
    if (g.glow) grp.add(new THREE.Mesh(g.glow, this.glowMat));
    return grp;
  }

  makeBirds() {
    this.gulls = [];
    const body = this.geomOf(M.wingBird());
    const wl = this.geomOf(M.wing(-1));
    const wr = this.geomOf(M.wing(1));
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    // A single gull on the small starting island; a second on the larger coast.
    for (let i = 0; i < 1 + Math.floor(this.expansion / 3); i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(body.geo, mat));
      const l = new THREE.Mesh(wl.geo, mat);
      const r = new THREE.Mesh(wr.geo, mat);
      l.position.x = -0.1;
      r.position.x = 0.1;
      g.add(l, r);
      g.userData = { m:g,species:'gull',l,r,a:hash(i,9)*6,rad:12+hash(i,8)*16,y:9+hash(i,7)*7,sp:.15+hash(i,6)*.12,cx:(hash(i,5)-.5)*10,cz:(hash(i,4)-.5)*8 };
      g.scale.setScalar(1.6);
      this.scene.add(g);
      this.gulls.push(g);
    }
  }

  actorMesh(v,scale=1,shadow=true){
    const m=this.meshOf(v,shadow),box=new THREE.Box3().setFromObject(m),center=box.getCenter(new THREE.Vector3());
    for(const child of m.children){child.position.x-=center.x;child.position.z-=center.z;child.position.y-=box.min.y;}
    m.scale.setScalar(scale);const size=box.getSize(new THREE.Vector3());m.userData.bodyRadius=Math.hypot(size.x,size.z)*scale/2;return m;
  }
  makeCritters(){this.crabs=[];this.landAnimals=[];this.turtles=[];this.updateWildlife({});}
  allActors(){return [...this.walkers,...this.landAnimals];}
  makeTurtle(lane) {
    const m=this.actorMesh(M.turtle(),1.1,false);
    const head=this.meshOf(M.turtleHead(),false);
    head.position.set(-.05,.10,.31);
    m.add(head);
    const flippers=[];
    for (const side of [-1,1])for(const rear of [false,true]){
      const part=this.meshOf(M.turtleFlipper(side,rear),false);
      part.position.set(side*.28-.05,-.025,rear?-.26:.14);
      flippers.push({part,side,rear});
      m.add(part);
    }
    Object.assign(m.userData,{m,head,flippers,phase:lane*2.1,species:'turtle'});
    return m;
  }
  updateWildlife(stages){
    // Keep the beach varied rather than filling it with identical crabs.
    const crabCount=1+Math.floor(this.expansion/2);
    for(let i=this.crabs.length;i<crabCount;i++){
      const m=this.actorMesh(M.crab(),1.2,false),w={id:'crab-'+i,species:'crab',m,x:0,z:3+i*.7,route:[],wait:i*.3,ph:i,speed:1.35,radius:.44};
      w.radius=m.userData.bodyRadius;m.userData=w;this.landAnimals.push(w);this.relocateWalker(w);w.y=this.ground(w.x,w.z);m.position.set(w.x,w.y,w.z);this.scene.add(m);this.crabs.push(m);
    }
    for(const def of WILDLIFE)if(wildlifeUnlocked(def,stages))for(let i=0;i<def.count;i++){
      const id=def.id+'-'+i;if(this.landAnimals.some(w=>w.id===id))continue;
      const near=this.spots[def.requires[0]],m=this.actorMesh(M[def.id](),def.scale),w={id,species:def.id,m,x:near.x+2+i*.8,z:near.z+2,route:[],wait:i*.4,ph:i,speed:def.speed,radius:def.id==='deer'?.6:.46};
      m.userData=w;this.landAnimals.push(w);this.relocateWalker(w);w.y=this.ground(w.x,w.z);m.position.set(w.x,w.y,w.z);this.scene.add(m);
      if(def.id==='parrot')this.parrot=m;
    }
    const turtleCount=1+(this.expansion>=2?1:0)+(this.expansion>=5?1:0);
    while(this.turtles.length<turtleCount){const m=this.makeTurtle(this.turtles.length);this.scene.add(m);this.turtles.push(m);}this.turtle=this.turtles[0];
    this.population={people:this.walkers.length,animals:this.landAnimals.length+this.turtles.length};
  }
  swimPoint(angle,lane=0){
    if(!this.swimAvoid){
      this.swimAvoid=[...this.staticEntries.filter(b=>b.water),this.spots.pier.box].map(b=>{
        const points=[];for(const x of[b.minX-.8,b.maxX+.8])for(const z of[b.minZ-.8,b.maxZ+.8])points.push({x:x/this.rx,z:z/this.rz});
        const center=Math.atan2((b.minZ+b.maxZ)/this.rz,(b.minX+b.maxX)/this.rx),span=Math.max(...points.map(p=>Math.abs(Math.atan2(Math.sin(Math.atan2(p.z,p.x)-center),Math.cos(Math.atan2(p.z,p.x)-center)))));
        return {center,span:span+.035,r:Math.max(...points.map(p=>Math.hypot(p.x,p.z)))+.08};
      });
    }
    let radius=1.27+lane*.04;
    for(const b of this.swimAvoid){const d=Math.abs(Math.atan2(Math.sin(angle-b.center),Math.cos(angle-b.center)));if(d>b.span+.35)continue;const k=Math.min(1,Math.max(0,1-(d-b.span)/.35)),smooth=k*k*(3-2*k);radius=Math.max(radius,1.27+(b.r-1.27)*smooth+lane*.04);}
    return {x:Math.cos(angle)*this.rx*radius,z:Math.sin(angle)*this.rz*radius};
  }
  faunaWalkable(x,z,pad=.6){return this.isLand(x,z,.025)&&!this.blocked(x,z,pad)&&Math.hypot(x-HILL.x,z-HILL.z)>HILL.r+.15;}
  // ---------- постройки ----------
  projectArea(id,stage) {
    const key=id+':'+stage;
    if(!this.projectAreas.has(key)){
      const site=this.spots[id],model=M.BUILD[id](stage);
      const y=site.y+(id==='pier'?-.05:0);
      this.projectAreas.set(key,{...footBox(model,site.x,site.z,site.rot),minY:y+model.minY*M.VS,maxY:y+(model.maxY+1)*M.VS});
    }
    return this.projectAreas.get(key);
  }
  setStages(stages, animateId = null) {
    const peopleBefore=new Set(this.walkers.map(w=>w.id)),animalsBefore=new Set(this.landAnimals.map(w=>w.species));
    let stored=0;
    for (const p of PROJECTS) {
      if((p.tier||0)>this.expansion)continue;
      const s = stages[p.id] || 0;
      if (this.stages[p.id] === s && this.projObjs[p.id]) continue;
      stored+=this.storeDecorForProject(p.id,s);
      this.stages[p.id] = s;
      this.placeProject(p, s, p.id === animateId);
    }
    this.builtAreas=Object.values(this.projObjs).map(p=>p.area).filter(Boolean);
    this.navCache?.clear();
    this.maskGrass();
    this.updatePeople(stages);
    this.updateWildlife(stages);
    this.lastArrivals=[...M.PEOPLE.filter(p=>this.walkers.some(w=>w.id===p.id)&&!peopleBefore.has(p.id)).map(p=>({ru:p.nameRU||'Новый житель',en:p.nameEN||'New neighbour'})),...WILDLIFE.filter(d=>this.landAnimals.some(w=>w.species===d.id)&&!animalsBefore.has(d.id)).map(d=>({ru:d.ru,en:d.en}))];
    for(const w of this.allActors()){w.route=[];w.celebration=null;w.social=null;this.relocateWalker(w);w.wait=.3;}
    if (animateId && this.spots[animateId]) this.gatherForBuild(animateId);
    return stored;
  }
  gatherForBuild(id) {
    const site = this.spots[id];
    const distance = actor => Math.hypot(actor.x - site.x, actor.z - site.z);
    const residents = [...this.walkers].sort((a, b) => distance(a) - distance(b)).slice(0, 4);
    const actors = this.allActors();
    const claimed = [];
    for (const resident of residents) {
      const options = [];
      for (let z = -8; z <= 8; z += .5) {
        for (let x = -8; x <= 8; x += .5) {
          const point = {x: site.x + x, z: site.z + z};
          if (Math.hypot(x, z) > 8 || !this.walkable(point.x, point.z) ||
              !this.actorRegionHas(resident, point.x, point.z) ||
              claimed.some(p => Math.hypot(p.x - point.x, p.z - point.z) < 1.1) ||
              actors.some(a => a !== resident && Math.hypot(a.x - point.x, a.z - point.z) < .85)) continue;
          // Prefer the near edge of the lot, with a short approach for the resident.
          options.push({point, score: Math.hypot(x, z) * 2 + Math.hypot(point.x - resident.x, point.z - resident.z)});
        }
      }
      options.sort((a, b) => a.score - b.score);
      for (const {point} of options.slice(0, 8)) {
        const route = findRoute(resident, point, (x, z) => this.walkable(x, z));
        if (!route.length || route.length > 43) continue;
        resident.celebration = {site, point: route.at(-1), deadline: this.time + 9, started: null};
        resident.route = route;
        resident.wait = 0;
        claimed.push(resident.celebration.point);
        break;
      }
    }
  }
  updateCelebration(w, dt) {
    const event = w.celebration;
    if (!event) return false;
    const {site, point, started} = event;
    const arrived = Math.hypot(w.x - point.x, w.z - point.z) < .15;
    if (started === null && this.time < event.deadline && !arrived) {
      if (!w.route.length && w.wait <= 0) {
        w.route = findRoute(w, point, (x, z) => this.walkable(x, z));
        if (!w.route.length) w.celebration = null;
      }
      return false;
    }
    if ((started === null && !arrived) || (started !== null && this.time - started >= 1.8)) {
      w.celebration = null;
      w.route = [];
      w.wait = .5;
      return false;
    }
    if (started === null) event.started = this.time;
    const phase = (this.time - event.started) * Math.PI * 2.3;
    const angle = Math.atan2(site.x - w.x, site.z - w.z);
    const delta = Math.atan2(Math.sin(angle - w.m.rotation.y), Math.cos(angle - w.m.rotation.y));
    w.m.rotation.y += delta * Math.min(1, dt * 9);
    w.m.rotation.z = Math.sin(phase) * .15;
    w.m.position.set(w.x, this.ground(w.x, w.z) + Math.abs(Math.sin(phase)) * .4, w.z);
    return true;
  }
  placeProject(p, s, anim) {
    const old = this.projObjs[p.id];
    if (old) {
      this.scene.remove(old.grp);
      old.grp.traverse((c) => c.geometry && c.geometry !== this.markerGeo && c.geometry.dispose && c.geometry.dispose());
    }
    const sp = this.spots[p.id];
    const grp = new THREE.Group();
    grp.position.set(sp.x, sp.y, sp.z);
    grp.rotation.y = sp.rot || 0;
    const o = { grp, glows: [], s };
    if (s === 0) {
      // разметка: колышки с верёвкой и табличка
      const marker=this.markerVox(p);
      o.lot=footBox(marker,sp.x,sp.z,sp.rot);
      o.model=this.meshOf(marker);
      grp.add(o.model);
    } else {
      const m = this.meshOf(M.BUILD[p.id](s));
      if (p.id === 'pier') m.position.y = -0.05;
      grp.add(m);
      o.model=m;
      o.area=this.projectArea(p.id,s);
      // огоньки
      const addGlow = (x, y, z, c, size) => {
        const g = this.glow(c, size);
        g.position.set(x, y, z);
        grp.add(g);
        o.glows.push(g);
      };
      if(['kiln','market','pavilion','museum','tea'].includes(p.kind)&&s===3)addGlow(0,1.3,1,0xffcf80,1.5);
      if (p.id === 'fire') addGlow(0, 0.35, 0, 0xffa040, 2.4);
      if (p.id === 'beacon' && s === 1) addGlow(0, 0.9, 0, 0xffa040, 2);
      if (p.id === 'beacon' && s === 3) {
        addGlow(0, 4.0, 0, 0xfff0b0, 3.4);
        const beam = new THREE.Mesh(new THREE.ConeGeometry(1.4, 14, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        beam.rotation.z = Math.PI / 2;
        beam.position.x = 7;
        const piv = new THREE.Group();
        piv.position.y = 4.0;
        piv.add(beam);
        grp.add(piv);
        o.beam = piv;
      }

    }
    if (anim) {
      grp.scale.setScalar(0.01);
      this.anims.push({ t: 0, d: 0.9, fn: (k) => grp.scale.setScalar(Math.max(0.01, easeOutBack(k))) });
      this.puff(sp.x, sp.y + 0.3, sp.z, p.r);
    }
    this.scene.add(grp);
    this.projObjs[p.id] = o;
  }
  markerVox(p) {
    const v = new Vox();
    const r = Math.round(p.r * 8);
    for (const [x, z] of [[-r, -r], [r, -r], [-r, r], [r, r]]) v.box(x, 0, z, x, 3, z, M.C.woodL);
    for (let x = -r; x <= r; x++) (v.set(x, 2, -r, M.C.rope), v.set(x, 2, r, M.C.rope));
    for (let z = -r; z <= r; z++) (v.set(-r, 2, z, M.C.rope), v.set(r, 2, z, M.C.rope));
    // табличка
    v.box(0, 0, r, 0, 5, r, M.C.woodD);
    v.box(-2, 5, r, 2, 7, r, M.C.woodL);
    return v;
  }
  puff(x, y, z, r = 1) {
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.puffTex, transparent: true, depthWrite: false, opacity: 0.9 }));
      const a = (i / 14) * Math.PI * 2;
      m.position.set(x + Math.cos(a) * r * 0.6, y, z + Math.sin(a) * r * 0.6);
      m.userData = { vx: Math.cos(a) * 1.4, vz: Math.sin(a) * 1.4, vy: 0.8 + hash(i, 3) * 1.2, life: 0, max: 0.9 + hash(i, 4) * 0.4 };
      m.scale.setScalar(0.8);
      this.scene.add(m);
      this.fx.push(m);
    }
    // искорки-конфетти
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ color: [0xffd34a, 0xff8fb0, 0x7fe0ff, 0xffffff][i % 4], transparent: true, depthWrite: false }));
      m.position.set(x, y + 1, z);
      const a = hash(i, 7) * Math.PI * 2;
      m.userData = { vx: Math.cos(a) * 2.2, vz: Math.sin(a) * 2.2, vy: 3 + hash(i, 8) * 3, life: 0, max: 1.4, conf: true };
      m.scale.setScalar(0.18);
      this.scene.add(m);
      this.fx.push(m);
    }
  }

  // ---------- жители ----------
  updatePeople(stages) {
    const built = Object.values(stages).reduce((a, b) => a + b, 0);
    for (const def of M.PEOPLE) {
      if ((def.requires && (stages[def.requires[0]]||0)<def.requires[1]) || built < def.from || this.walkers.some((w) => w.id === def.id)) continue;
      const scale=def.child ? .51 : .78;
      const m = this.actorMesh(M.person(def.look),scale);
      const sp = this.spots.hut;
      const w = {id:def.id,m,child:!!def.child,lines:def.lines,radius:m.userData.bodyRadius,speed:def.child?1.14:.9,
        x:sp.x+1.5+this.walkers.length,z:sp.z+2.2,tx:0,tz:0,wait:1+this.walkers.length,ph:Math.random()*6};
      w.tx = w.x;
      w.tz = w.z;
      w.route=[];this.relocateWalker(w);w.y=this.ground(w.x,w.z);
      m.position.set(w.x,w.y,w.z);
      this.scene.add(m);
      this.walkers.push(w);
    }
  }
  walkable(x,z) {
    return this.isLand(x,z,.07) && !this.blocked(x,z,.42) && Math.hypot(x-HILL.x,z-HILL.z)>HILL.r+.1 && !this.palmPos?.some(p=>Math.hypot(x-p[0],z-p[1])<.5);
  }
  actorRegion(w){
    this.navCache ||= new Map();const fauna=!!w.species,pad=fauna?w.radius+.06:.42,key=(fauna?'animal':'person')+pad.toFixed(3);
    if(this.navCache.has(key))return this.navCache.get(key);
    const valid=(x,z)=>fauna?this.faunaWalkable(x,z,pad):this.walkable(x,z),all=new Set();
    const code=(x,z)=>x+','+z;
    for(let x=-45;x<=45;x++)for(let z=-35;z<=35;z++)if(valid(x*.5,z*.5))all.add(code(x,z));
    const seen=new Set();let largest=new Set();
    for(const start of all){if(seen.has(start))continue;const group=new Set([start]),q=[start.split(',').map(Number)];seen.add(start);
      for(let i=0;i<q.length;i++){const [x,z]=q[i];for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const next=code(x+dx,z+dz);if(seen.has(next)||!all.has(next)||!valid((x+dx*.5)*.5,(z+dz*.5)*.5))continue;seen.add(next);group.add(next);q.push([x+dx,z+dz]);}}
      if(group.size>largest.size)largest=group;
    }
    this.navCache.set(key,largest);return largest;
  }
  actorRegionHas(w,x,z){return this.actorRegion(w).has(Math.round(x*2)+','+Math.round(z*2));}
  relocateWalker(w) {
    const free=(x,z)=>(w.species?this.faunaWalkable(x,z,w.radius+.06):this.walkable(x,z))&&this.actorRegionHas(w,x,z);
    if(free(w.x,w.z) && free(Math.round(w.x*2)/2,Math.round(w.z*2)/2))return;
    for(let r=.5;r<25;r+=.5) for(let a=0;a<Math.PI*2;a+=.24){
      const x=Math.round((w.x+Math.cos(a)*r)*2)/2,z=Math.round((w.z+Math.sin(a)*r)*2)/2;
      if(free(x,z)){w.x=x;w.z=z;w.tx=x;w.tz=z;w.route=[];return;}
    }
  }
  pickTarget(w) {
    // интересные места: перед постройками, пляж, у костра
    const keys = Object.keys(this.spots).filter((k) => k !== 'ship' && k !== 'beacon');
    for (let i = 0; i < 30; i++) {
      let x;
      let z;
      if (!w.species && Math.random() < 0.55) {
        const s = this.spots[keys[Math.floor(Math.random() * keys.length)]];
        const a = Math.random() * Math.PI * 2;
        x = s.x + Math.cos(a) * (s.r + 0.9);
        z = s.z + Math.sin(a) * (s.r + 0.9);
      } else {
        const a = Math.random() * Math.PI * 2;
        const rr = (w.species?.length ? .2 : .3) + Math.random() * (w.species?.length ? .76 : .55);
        x = Math.cos(a) * this.rx * rr;
        z = Math.sin(a) * this.rz * rr;
      }
      if (!this.isLand(x, z, 0.05)) continue;
      if (this.blocked(x, z)) continue;
      if (Math.hypot(x - HILL.x, z - HILL.z) < HILL.r - 0.5) continue;
      const valid=(x,z)=>w.species?this.faunaWalkable(x,z,w.radius+.06):this.walkable(x,z);
      if(!valid(x,z)||!this.actorRegionHas(w,x,z)||this.allActors().some(v=>v!==w&&Math.hypot((v.route.at(-1)?.x??v.x)-x,(v.route.at(-1)?.z??v.z)-z)<.9))continue;
      const route=findRoute(w,{x,z},valid);
      if(route.length<3)continue;
      w.route=route;w.tx=route.at(-1).x;w.tz=route.at(-1).z;
      return;
    }
  }
  blocked(x,z,pad=.22) {
    if(this.builtAreas.some(area=>contains(area,x,z,pad)&&area.minY<this.ground(x,z)+1))return true;
    return this.staticEntries.some(b=>!b.water&&b.blocks!==false&&contains(b.nav,x,z,pad));
  }

  lookAtActor(w,x,z,dt) {
    const angle=Math.atan2(x-w.x,z-w.z)+(w.species==='crab'?Math.PI/2:0);
    const delta=Math.atan2(Math.sin(angle-w.m.rotation.y),Math.cos(angle-w.m.rotation.y));
    w.m.rotation.y+=delta*Math.min(1,dt*7);
  }
  startSocial() {
    if(this.mode!=='island'||this.time<(this.nextSocial??3))return;
    this.nextSocial=this.time+2.1;
    for(const person of this.walkers){
      if(person.celebration||person.social)continue;
      const animal=this.landAnimals.find(w=>{
        const d=Math.hypot(person.x-w.x,person.z-w.z);
        return !w.social && w.species!=='crab' && d>=.9 && d<=2.4;
      });
      if(!animal)continue;
      person.route=[];
      animal.route=[];
      person.social={partner:animal,start:this.time};
      animal.social={partner:person,start:this.time};
      this.socialHeart(animal.x,animal.m.position.y+.8,animal.z);
      this.nextSocial=this.time+6;
      return;
    }
  }
  socialHeart(x,y,z) {
    if(!this.heartTexture){
      const canvas=document.createElement('canvas');
      canvas.width=canvas.height=48;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#ff7698';
      ctx.strokeStyle='#fff4e3';
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.moveTo(24,41);
      ctx.bezierCurveTo(-8,22,8,1,24,14);
      ctx.bezierCurveTo(40,1,56,22,24,41);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      this.heartTexture=new THREE.CanvasTexture(canvas);
      this.heartTexture.colorSpace=THREE.SRGBColorSpace;
    }
    const m=new THREE.Sprite(new THREE.SpriteMaterial({map:this.heartTexture,transparent:true,depthWrite:false}));
    m.position.set(x,y,z);
    m.scale.setScalar(.48);
    m.userData={vx:0,vy:.55,vz:0,life:0,max:1.7,heart:true};
    this.scene.add(m);
    this.fx.push(m);
  }
  animateActorReaction(w,dt) {
    const elapsed=this.time-(w.tapped??-Infinity);
    const social=w.social;
    if(!social&&elapsed>=.68)return false;
    const phase=social?this.time-social.start:elapsed;
    if(social&&phase>=1.6){
      w.social=null;
      w.wait=.35;
      w.m.rotation.x=0;
      return false;
    }
    if(social)this.lookAtActor(w,social.partner.x,social.partner.z,dt);
    const parrot=w.species==='parrot';
    const sway=Math.sin(phase*(parrot ? 4.5 : 9));
    const bounce=Math.abs(sway)*(parrot ? .055 : w.species ? .19 : .08);
    w.m.rotation.x=social&&!w.species?Math.sin(phase*5)*.23:0;
    w.m.rotation.z=sway*(parrot ? .07 : .14);
    w.m.position.set(w.x,this.ground(w.x,w.z)+bounce,w.z);
    return true;
  }

  // ---------- камера ----------
  resize(w, h) {
    this.w = w;
    this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  baseDist() {
    const a = this.camera.aspect;
    return (a < 1 ? 34 / Math.max(0.5, a) ** 0.85 : 34)*worldScale(this.expansion);
  }
  applyRenderQuality() {
    const background = this.mode === 'table' && this.quality !== 'high';
    const ratio = Math.min(window.devicePixelRatio || 1,
      background ? 1 : this.quality === 'high' ? 2 : this.quality === 'mid' ? 1.5 : 1);
    if (this.renderer.getPixelRatio() !== ratio) this.renderer.setPixelRatio(ratio);
    const shadows = this.quality !== 'low' && !background;
    if (this.renderer.shadowMap.enabled !== shadows) {
      this.renderer.shadowMap.enabled = shadows;
      this.scene.traverse(object => {
        if (object.material) object.material.needsUpdate = true;
      });
    }
    this.sun.castShadow = this.quality !== 'low';
  }
  setMode(mode) {
    if (mode === 'island' && this.mode === 'table') {
      this.applyCam();
      const {x, y, z} = this.camera.position;
      const ty = .6;
      this.cam = {tx: 0, ty, tz: 0, yaw: Math.atan2(x, z),
        pitch: Math.atan2(y - ty, Math.hypot(x, z)), dist: Math.hypot(x, y - ty, z)};
    }
    this.mode = mode;
    this.applyRenderQuality();
    if (mode === 'island') this.flyTo({ yaw: 0.25, pitch: 0.82, dist: this.baseDist(), tx: 0, ty: 0.6, tz: 0.5 }, 1.2);
  }
  flyTo(c, dur = 1) {
    const from = { ...this.cam };
    const to = { ...from, ...c };
    const delta = to.yaw - from.yaw;
    to.yaw = from.yaw + Math.atan2(Math.sin(delta), Math.cos(delta));
    this.camT = { from, to, t: 0, d: dur };
  }
  focus(id) {
    const s = this.spots[id];
    const big = id === 'lookout' || id === 'beacon' || id === 'ship';
    this.flyTo({ yaw: 0.25, tx: s.x, ty: s.y + (big ? 1.6 : 0.5), tz: s.z, dist: (big ? 20 : 15) * Math.max(1, this.baseDist() / 34) * 0.9, pitch: 0.62 }, 1.1);
  }
  applyCam() {
    const c = this.cam;
    if(this.mode==='table'){
      // Frame the full coast from a 45-degree downward angle.
      const moving=document.documentElement.dataset.motion!=='off';
      const angle = .25 + (moving ? this.tableOrbit : 0);
      const radius = this.baseDist() * (this.camera.aspect < 1 ? 1.03 : .83);
      this.camera.position.set(Math.sin(angle)*radius,.6 + radius,Math.cos(angle)*radius);
      this.camera.lookAt(0,.6,0);return;
    }
    const cp = Math.cos(c.pitch);
    this.camera.position.set(c.tx + Math.sin(c.yaw) * cp * c.dist, c.ty + Math.sin(c.pitch) * c.dist, c.tz + Math.cos(c.yaw) * cp * c.dist);
    this.camera.lookAt(c.tx, c.ty, c.tz);
  }
  drag(dx, dy) {
    if (this.mode !== 'island') return;
    this.camT = null;
    this.cam.yaw -= dx * 0.006;
    this.cam.pitch = Math.min(1.25, Math.max(0.35, this.cam.pitch + dy * 0.004));
  }
  zoom(f) {
    if (this.mode !== 'island') return;
    this.camT = null;
    const b = this.baseDist();
    this.cam.dist = Math.min(b * 1.5, Math.max(9, this.cam.dist * f));
  }
  pan(dx, dy) {
    if (this.mode !== 'island') return;
    this.camT = null;
    const k = this.cam.dist * 0.0016;
    const cy = Math.cos(this.cam.yaw);
    const sy = Math.sin(this.cam.yaw);
    this.cam.tx = Math.max(-this.rx, Math.min(this.rx, this.cam.tx - (dx * cy + dy * sy) * k));
    this.cam.tz = Math.max(-this.rz, Math.min(this.rz, this.cam.tz - (-dx * sy + dy * cy) * k));
  }
  // экранные координаты точки мира (для подсказок интерфейса)
  project(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.w, y: (-v.y * 0.5 + 0.5) * this.h, vis: v.z < 1 };
  }
  rayAt(px,py) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(px/this.w*2-1,1-py/this.h*2),this.camera);
    return ray;
  }
  pickIsland(px,py) {
    const ray=this.rayAt(px,py);
    const targets=new Map(Object.entries(this.projObjs).map(([id,p])=>[p.model,{id}]));
    for(const w of this.allActors()) targets.set(w.m,{actor:w});
    for(const m of this.turtles) targets.set(m,{actor:m.userData});
    for(const m of this.gulls) targets.set(m,{actor:m.userData});
    const ground=ray.intersectObject(this.terrain)[0];
    const [nearest]=ray.intersectObjects([...targets.keys()]);
    if(nearest&&nearest.distance<=(ground?.distance??Infinity)+.01){
      let object=nearest.object;
      while(object&&!targets.has(object))object=object.parent;
      return targets.get(object)??null;
    }
    let best=null, radius=11;
    for(const [mesh,target] of targets){
      const actor=target.actor;
      if(!actor)continue;
      const head=mesh.position.clone().add(new THREE.Vector3(0,actor.species ? .26 : actor.child ? .42 : .68,0));
      if(head.distanceTo(this.camera.position)>(ground?.distance??Infinity)+.4)continue;
      const p=this.project(head.x,head.y,head.z),d=Math.hypot(px-p.x,py-p.y);
      if(p.vis&&d<radius){best=target;radius=d;}
    }
    if(best||!ground)return best;
    const {x,y,z}=ground.point;
    const empty=Object.entries(this.projObjs).find(([id,p])=>p.lot&&Math.abs(this.spots[id].y-y)<.6&&contains(p.lot,x,z));
    return empty?{id:empty[0]}:null;
  }
  pickAt(px,py) {
    return this.pickIsland(px,py)?.id??null;
  }
  pickGround(px, py) {
    const ray = this.rayAt(px,py);
    const {point} = ray.intersectObject(this.terrain)[0] || {};
    if (!point) return null;
    const snap = value => (Math.floor(value / TS) + .5) * TS;
    return {x:snap(point.x), z:snap(point.z)};
  }

  // ---------- кадр ----------
  update(dt) {
    this.time += dt;
    if(this.mode==='table'&&document.documentElement.dataset.motion!=='off')this.tableOrbit=(this.tableOrbit+dt*.028)%(Math.PI*2);
    const t = this.time;
    this.oceanU.time.value = t;
    if (this.camT) {
      const c = this.camT;
      c.t += dt;
      const k = Math.min(1, c.t / c.d);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      for (const key in c.to) this.cam[key] = c.from[key] + (c.to[key] - c.from[key]) * e;
      if (k >= 1) this.camT = null;
    }
    this.applyCam();
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i];
      a.t += dt;
      const k = Math.min(1, a.t / a.d);
      a.fn(k);
      if (k >= 1) this.anims.splice(i, 1);
    }
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const m = this.fx[i];
      const u = m.userData;
      u.life += dt;
      m.position.x += u.vx * dt;
      m.position.z += u.vz * dt;
      m.position.y += u.vy * dt;
      if (u.conf) u.vy -= 7 * dt;
      else if(!u.heart) {
        u.vx *= 0.94;
        u.vz *= 0.94;
        m.scale.setScalar(0.8 + u.life * 1.6);
      }
      m.material.opacity = Math.max(0, 1 - u.life / u.max);
      if (u.life >= u.max) {
        this.scene.remove(m);
        m.material.dispose();
        this.fx.splice(i, 1);
      }
    }
    // облака
    for (const c of this.clouds) {
      c.position.x += c.userData.v * dt;
      if (c.position.x > 200) c.position.x = -200;
    }
    // чайки
    for (const g of this.gulls) {
      const u = g.userData;
      u.a += u.sp * dt;
      const x = u.cx + Math.cos(u.a) * u.rad;
      const z = u.cz + Math.sin(u.a) * u.rad;
      g.position.set(x, u.y + Math.sin(u.a * 3) * 0.6, z);
      g.rotation.y = -u.a;
      const f = Math.sin(t * 6 + u.a * 10) * 0.6;
      u.l.rotation.z = f;
      u.r.rotation.z = -f;
    }
    // Turtle models face +Z. Heading follows the actual ellipse tangent.
    for(const [lane,turtle]of this.turtles.entries()){
      const u=turtle.userData;
      const angle=t*.06+2+u.phase+Math.sin(t*1.6+u.phase)*.006;
      const p=this.swimPoint(angle,lane),next=this.swimPoint(angle+.0001,lane);
      const stroke=t*4.2+u.phase,reacting=t-(u.tapped??-Infinity)<.75;
      turtle.position.set(p.x,WL-.045+Math.sin(t*1.25+u.phase)*.09+(reacting ? .12 : 0),p.z);
      const previous=u.lastPoint;
      const moved=previous&&Math.hypot(p.x-previous.x,p.z-previous.z)>1e-6;
      turtle.rotation.y=moved?Math.atan2(p.x-previous.x,p.z-previous.z):Math.atan2(next.x-p.x,next.z-p.z);
      u.lastPoint=p;
      turtle.rotation.x=Math.cos(stroke)*.047;
      turtle.rotation.z=Math.sin(stroke)*.06;
      u.head.rotation.x=.14*Math.sin(stroke*.55)-(reacting ? .26 : 0);
      u.head.rotation.y=Math.sin(t*.85+u.phase)*.14;
      u.head.position.z=.31+Math.sin(stroke)*.025;
      for(const {part,side,rear} of u.flippers){
        const phase=stroke+(rear?1.4:0);
        part.rotation.y=side*(.22+Math.sin(phase)*(rear ? .24 : .44));
        part.rotation.z=side*Math.cos(phase)*(rear ? .22 : .37);
      }
    }
    // Residents follow connected dry routes; movement never projects through buildings.
    const actors = this.allActors();
    this.startSocial();
    for (const w of actors) {
      if (this.updateCelebration(w,dt)||this.animateActorReaction(w,dt)) continue;
      let moving=false;
      if(w.wait>0) w.wait-=dt;
      else if(!w.route?.length){this.pickTarget(w);if(!w.route?.length)w.wait=.6;}
      else {
        const target=w.route[0],dx=target.x-w.x,dz=target.z-w.z,d=Math.hypot(dx,dz);
        if(d<.045){w.route.shift();if(!w.route.length && !w.celebration)w.wait=w.species?.length ? .3+Math.random()*1.2 : 2+Math.random()*4;}
        else {
          const step=Math.min((w.celebration ? 2.5 : w.speed || .9)*dt,d),nx=w.x+dx/d*step,nz=w.z+dz/d*step;
          if(!(w.species?this.faunaWalkable(nx,nz,w.radius+.06):this.walkable(nx,nz))){w.route=[];w.wait=.4;}
          else {
            this.lookAtActor(w,target.x,target.z,dt);
            w.x=nx;w.z=nz;moving=true;
          }
        }
      }
      const parrot=w.species==='parrot';
      const hopper=w.species==='monkey'||w.species==='rabbit';
      const pace=parrot ? 5.6 : hopper ? 10.5 : 9;
      w.ph+=dt*(moving ? pace : 1.5);
      const ground=this.ground(w.x,w.z);w.y=Math.max(ground,(w.y??ground)+(ground-(w.y??ground))*Math.min(1,dt*12));
      const stride=Math.sin(w.ph);
      w.m.rotation.z=moving?stride*.035:0;
      const height=parrot ? .15 : hopper ? .32 : w.child ? .1 : .045;
      const lift=parrot ? stride**2 : Math.abs(stride);
      const hop=moving ? lift*height : 0;
      w.m.position.set(w.x,w.y+hop,w.z);
    }
    // огни, маяк, звери
    for (const k in this.projObjs) {
      const o = this.projObjs[k];
      for (const g of o.glows) g.material.opacity = 0.65 + Math.sin(t * 9 + g.id) * 0.12 + Math.sin(t * 23) * 0.06;
      if (o.beam) o.beam.rotation.y = t * 0.8;

    }
  }
  dispose() {
    const geometries=new Set(),materials=new Set(),textures=new Set([this.glowTex,this.puffTex,this.oceanU.distTex.value,this.heartTexture]);
    this.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){materials.add(m);if(m.map)textures.add(m.map);}});
    for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t?.dispose();this.renderer.dispose();
  }
  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
