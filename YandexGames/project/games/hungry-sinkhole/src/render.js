// Отрисовка: город инстансами (один меш на вид фасада/модели), земля одной текстурой,
// дыры через трафарет (земля не рисуется внутри круга), частицы обломков и пыли.
import * as THREE from 'three';
import {Pool} from './instance-pool.js';
import {detailedGround} from './surfaces.js';
import { makeLooks } from './textures.js';
import { makeModels } from './models.js';
import { SKINS } from './data.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const easeOut = (k) => 1 - (1 - k) ** 3;
const easeBack = (k) => 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;

// бонусы на карте: цвет и значок
export const PICK_COL = { speed: '#3aa0ff', magnet: '#ff5a4e', x2: '#ffc93c', giant: '#8a6af0', shield: '#3ccf8e', freeze: '#7fd8ff', slow: '#8a96b4', gold: '#ffc020' };
export function pickIcon(type, size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const k = size / 128;
  g.scale(k, k);
  g.fillStyle = 'rgba(29,34,64,.35)';
  g.beginPath();
  g.arc(64, 70, 54, 0, 7);
  g.fill();
  g.fillStyle = PICK_COL[type];
  g.strokeStyle = '#1d2240';
  g.lineWidth = 8;
  g.beginPath();
  g.arc(64, 62, 52, 0, 7);
  g.fill();
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,.3)';
  g.beginPath();
  g.ellipse(52, 36, 26, 12, -0.4, 0, 7);
  g.fill();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.fillStyle = '#fff';
  g.strokeStyle = '#1d2240';
  g.lineWidth = 6;
  const path = (pts) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
    g.stroke();
  };
  if (type === 'speed') path([[72, 22], [40, 68], [60, 68], [52, 102], [88, 52], [67, 52], [76, 22]]);
  else if (type === 'magnet') {
    g.lineWidth = 22;
    g.strokeStyle = '#1d2240';
    g.beginPath();
    g.arc(64, 60, 24, Math.PI, 0, true);
    g.moveTo(40, 60); g.lineTo(40, 34); g.moveTo(88, 60); g.lineTo(88, 34);
    g.stroke();
    g.lineWidth = 12;
    g.strokeStyle = '#fff';
    g.beginPath();
    g.arc(64, 60, 24, Math.PI, 0, true);
    g.moveTo(40, 60); g.lineTo(40, 40); g.moveTo(88, 60); g.lineTo(88, 40);
    g.stroke();
    g.fillStyle = '#c8d0e0';
    g.fillRect(32, 26, 16, 12); g.fillRect(80, 26, 16, 12);
    g.lineWidth = 4;
    g.strokeRect(32, 26, 16, 12); g.strokeRect(80, 26, 16, 12);
  } else if (type === 'x2') {
    g.font = '800 54px Rubik, Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 9;
    g.strokeText('×2', 64, 66);
    g.fillText('×2', 64, 66);
  } else if (type === 'shield') {
    g.beginPath();
    g.moveTo(64, 20);
    g.lineTo(98, 32);
    g.quadraticCurveTo(98, 84, 64, 104);
    g.quadraticCurveTo(30, 84, 30, 32);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#3ccf8e';
    g.beginPath();
    g.moveTo(64, 32);
    g.lineTo(86, 40);
    g.quadraticCurveTo(86, 78, 64, 92);
    g.closePath();
    g.fill();
  } else if (type === 'freeze' || type === 'slow') {
    // снежинка
    g.lineWidth = 16;
    g.strokeStyle = '#1d2240';
    const arms = () => {
      g.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = (k * Math.PI) / 3;
        g.moveTo(64 - Math.cos(a) * 40, 62 - Math.sin(a) * 40);
        g.lineTo(64 + Math.cos(a) * 40, 62 + Math.sin(a) * 40);
      }
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3, x = 64 + Math.cos(a) * 26, y = 62 + Math.sin(a) * 26;
        for (const d of [-0.7, 0.7]) {
          g.moveTo(x, y);
          g.lineTo(x + Math.cos(a + d) * 13, y + Math.sin(a + d) * 13);
        }
      }
      g.stroke();
    };
    arms();
    g.lineWidth = 7;
    g.strokeStyle = '#fff';
    arms();
  } else if (type === 'gold') {
    // звезда
    const pts = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 20 : 44;
      pts.push([64 + Math.cos(a) * r, 64 + Math.sin(a) * r]);
    }
    g.fillStyle = '#fff6c0';
    path(pts);
  } else {
    // великан: дыра с расходящимися стрелками
    g.fillStyle = '#1d2240';
    g.beginPath();
    g.ellipse(64, 76, 26, 13, 0, 0, 7);
    g.fill();
    g.fillStyle = '#fff';
    path([[64, 18], [80, 38], [70, 38], [70, 54], [58, 54], [58, 38], [48, 38]]);
    path([[16, 76], [34, 62], [34, 70], [42, 70], [42, 82], [34, 82], [34, 90]]);
    path([[112, 76], [94, 62], [94, 70], [86, 70], [86, 82], [94, 82], [94, 90]]);
  }
  return c;
}

// затемнение всего, что ниже уровня земли (в глубине дыры темно)
const DARK = 'col *= clamp(1.0 + vWY * 0.42, 0.0, 1.0);';

function itemMat(kind, look, mode) {
  const m = new THREE.MeshLambertMaterial(kind === 'prop' ? { vertexColors: true } : { map: look.map });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWY;\n' + (kind === 'prop' ? 'attribute float aTint;\n' : 'varying vec2 vUv2;\nvarying float vSide;\nuniform vec3 uTile;\n'));
    let vbody = '#include <begin_vertex>\n{ vec4 wp = modelMatrix * vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wp = modelMatrix * instanceMatrix * vec4(transformed, 1.0);\n#endif\n vWY = wp.y; }\n';
    if (kind !== 'prop') {
      vbody += `{
  vec3 sc = vec3(1.0);
  #ifdef USE_INSTANCING
  sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  #endif
  vec2 tile = uTile.xy;
  vec3 an = abs(normal);
  vSide = 1.0;
  ${
    mode === 0
      ? `if (an.z > 0.5) { vec2 m = sc.xy; vUv2 = uTile.z > 0.5 ? uv * max(vec2(1.0), floor(m / tile + 0.5)) : uv * m / tile; }
  else if (an.x > 0.5) { vUv2 = uv * vec2(sc.z, sc.y) / tile; vSide = uTile.z > 0.5 ? 0.0 : 1.0; }
  else { vUv2 = uv * vec2(sc.x, sc.z) / tile; vSide = uTile.z > 0.5 ? 0.0 : 1.0; }`
      : mode === 1
        ? `vUv2 = vec2(position.x * sc.x, position.y * sc.y + abs(position.z) * sc.z) / tile; if (an.x > 0.6) vSide = 0.0;`
        : `vUv2 = vec2(atan(position.z, position.x) * 0.5 * sc.x, position.y * sc.y) / tile; if (an.y > 0.7) vSide = 0.0;`
  }
}\n`;
    }
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', vbody);
    if (kind === 'prop') {
      sh.vertexShader = sh.vertexShader.replace(
        '#include <color_vertex>',
        'vColor = vec4(1.0);\n#ifdef USE_COLOR\nvColor.rgb = color.rgb;\n#endif\n#ifdef USE_INSTANCING_COLOR\nvColor.rgb *= mix(vec3(1.0), instanceColor.rgb, aTint);\n#endif',
      );
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vWY;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n{ vec3 col = diffuseColor.rgb; ' + DARK + ' diffuseColor.rgb = col; }');
    } else {
      sh.uniforms.uTile = { value: new THREE.Vector3(look.tw, look.th, look.fit ? 1 : 0) };
      sh.uniforms.maskMap = { value: look.mask };
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vWY;\nvarying vec2 vUv2;\nvarying float vSide;\nuniform sampler2D maskMap;')
        .replace(
          '#include <map_fragment>',
          `vec3 tint = vec3(1.0);
#if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)
tint = vColor.rgb;
#endif
vec4 tc = texture2D(map, vUv2);
float mk = texture2D(maskMap, vUv2).r;
vec3 col = mix(tc.rgb, tc.rgb * tint, mk);
if (vSide < 0.5) col = tint * 0.86;
${DARK}
diffuseColor.rgb = col;`,
        )
        .replace('#include <color_fragment>', '');
    }
  };
  m.customProgramCacheKey = () => kind + mode;
  return m;
}

function roofGeo() {
  const pos = [];
  const uv = [];
  const quad = (a, b, c, d) => {
    // обход против часовой снаружи — иначе скаты отсекаются и сквозь крышу видно серое перекрытие
    pos.push(...a, ...c, ...b, ...a, ...d, ...c);
    uv.push(0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1);
  };
  quad([-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, 0], [-0.5, 0.5, 0]);
  quad([0.5, -0.5, 0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0], [0.5, 0.5, 0]);
  pos.push(-0.5, -0.5, 0.5, -0.5, 0.5, 0, -0.5, -0.5, -0.5);
  pos.push(0.5, -0.5, -0.5, 0.5, 0.5, 0, 0.5, -0.5, 0.5);
  uv.push(0, 0, 0.5, 1, 1, 0, 0, 0, 0.5, 1, 1, 0);
  quad([-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, -0.5, -0.5]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

const GROUND = {
  autumn:'#cbaa64',sugar:'#f4d8ee',nightgrass:'#666b8c',nightroad:'#424866',nightwalk:'#929ab4',
  grass: '#8fd16a', meadow: '#9ad46a', asphalt2: '#a4a8b0', road: '#5d6270', walk: '#dcd6cc', path: '#ead9b0', plaza: '#e8dcc8', sand: '#f2dca0', parking: '#6c717c', asphalt: '#80858f', cobble: '#a49884', cobble2: '#c4b8a2', field: '#a8c860',
  beach: '#f4e0a8', boards: '#d8b484', pool: '#5ad0f4', water: '#5ab8e0', snow: '#f2f6fa', snowroad: '#a8b0bc', snowwalk: '#e2eaf2', ice: '#c8ecfa', fairroad: '#e8bca4', arena: '#5a6488', gravel: '#e0d8c8', moss: '#9cc878',
};
const SKY = { oasis:0xf6d8a4,botanical:0xbbe8dc,farm:0xc9e9bd,autumn:0xf4d0ad,canyon:0xeec2aa,candyland:0xf3d8ef,aurora:0x91b6d6,neoncity:0x9392bd, town: 0xbfe6ff, beach: 0xaee4ff, port: 0xc4e4f4, metro: 0xd0dcf4, winter: 0xdce8f4, castle: 0xc8ecff, fair: 0xc8e4ff, japan: 0xf6e4ee };
const OUTER = { oasis:0xe9cc8e,botanical:0x77b892,farm:0xa0c675,autumn:0xb99759,canyon:0xd3a579,candyland:0xebc5e2,aurora:0x86bad0,neoncity:0x5e658b, port: 0x5ab0e0, beach: 0x4ab8e8, castle: 0x8acd5a, winter: 0xeef4fa, japan: 0x8cc870 };
// погода: снег зимой, лепестки сакуры
const WEATHER = { autumn:{col:'#efb35e',n:220,fall:1.2,sway:1.3,size:.32},aurora:{col:'#dafbff',n:360,fall:1.2,sway:.6,size:.3}, winter: { col: '#ffffff', n: 900, fall: 2.2, sway: 0.8, size: 0.35 }, japan: { col: '#ffb8d0', n: 420, fall: 1.1, sway: 1.6, size: 0.42 } };

export class View {
  constructor(canvas, quality = 'high') {
    this.quality = quality;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', stencil: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!window.__HS_DEBUG }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : quality === 'mid' ? 1.5 : 1));
    r.shadowMap.enabled = quality !== 'low';
    r.shadowMap.type = THREE.PCFShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0xbfe6ff);
    s.fog = new THREE.Fog(0xbfe6ff, 120, 320);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.5, 600);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8aa070, 1.5);
    s.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight(0xfff4e0, 2.3));
    sun.castShadow = r.shadowMap.enabled;
    const sm = quality === 'high' ? 2048 : 1024;
    sun.shadow.mapSize.set(sm, sm);
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.04;
    s.add(sun, sun.target);
    this.world = new THREE.Group();
    s.add(this.world);
    this.looks = makeLooks();
    this.models = makeModels();
    this.pools = new Map();
    this.slots = new Map();
    this.ghosts = [];
    this.holes = new Map();
    this.rising = new Set();
    this.picks = new Map();
    this.simT = 0;
    this.cam = { x: 0, z: 0, dist: 20 };
    this.shake = 0;
    this.time = 0;
    this._fx();
    this.resize();
  }

  setQuality(q) {
    this.quality = q;
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.attractView?1:q === 'high' ? 2 : q === 'mid' ? 1.5 : 1));
    const sh = !this.attractView&&q !== 'low';
    if (r.shadowMap.enabled !== sh) {
      r.shadowMap.enabled = sh;
      this.sun.castShadow = sh;
      this.scene.traverse((o) => {
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.needsUpdate = true));
      });
    }
    this.resize();
  }

  setAttract(on){this.attractView=on;this.attractVisible=new Set();this.attractCullT=0;this.setQuality(this.quality);}

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // на узком экране отодвигаем камеру, чтобы видеть вокруг дыры
    this.portrait = h > w;
    this.camera.fov = this.portrait ? 50 : 36;
    this.camera.updateProjectionMatrix();
    // setSize clears the canvas even while gameplay is paused or on results.
    if(this.map){this._camera();this.render();}
  }

  // ---------- карта ----------
  clear() {
    if(this.goldSp)this.goldSp.visible=false;
    if(this.roadPaint){this.world.remove(this.roadPaint);this.roadPaint.geometry.dispose();this.roadPaint.material.dispose();this.roadPaint=null;}
    for (const p of this.pools.values()) {
      this.world.remove(p.mesh);
      p.mesh.dispose();
      if (!p.geo.getAttribute('aTint')) p.geo.dispose();
    }
    this.pools.clear();
    this.slots.clear();
    this.rising.clear();
    for (const v of this.picks.values()) { this.world.remove(v.grp); v.grp.traverse(o=>{o.geometry?.dispose();o.material?.dispose();}); }
    this.picks.clear();
    this.ghosts = [];
    for (const h of this.holes.values()) this._dropHole(h);
    this.holes.clear();
    if (this.ground) {
      this.world.remove(this.ground);
      this.ground.geometry.dispose();
      this.ground.material.map.dispose();
      this.ground.material.userData.surfaceMask?.dispose();
      this.ground.material.dispose();
      this.ground = null;
    }
    if (this.outer) {
      this.world.remove(this.outer);
      this.outer.geometry.dispose();
      this.outer.material.dispose();
      this.outer = null;
    }
    if (this.wx) {
      this.scene.remove(this.wx.pts);
      this.wx.pts.geometry.dispose();
      this.wx.pts.material.map?.dispose();
      this.wx.pts.material.dispose();
      this.wx = null;
    }
    this.fx.reset();
  }

  setMap(map, sim) {
    this.clear();
    this._warm = true;
    this.map = map;
    const sky = SKY[map.id] || 0xbfe6ff;
    this.scene.background.setHex(sky);
    this.scene.fog.color.setHex(sky);
    const dusk = map.id === 'neoncity' || map.id === 'aurora';
    this.sun.color.setHex(dusk ? 0xc3d4ff : ['oasis','autumn','canyon'].includes(map.id) ? 0xffdfac : 0xfff4e0);
    this.sun.intensity = dusk ? 1.25 : 2.3;
    this.hemi.intensity = dusk ? 1.25 : 1.5;
    this.hemi.groundColor.setHex(dusk ? 0x62658e : 0x8aa070);
    this._ground(map);
    if(!this.attractView)this._weather(map);
    // считаем, сколько экземпляров каждого вида нужно
    const need = new Map();
    for (const it of sim.items) {
      const k = this._key(it);
      need.set(k, (need.get(k) || 0) + 1);
    }
    for (const [k, n] of need) this._pool(k, Math.ceil(n * 1.3) + 16);
    for (const it of sim.items) this._add(it);
    this._dirty();
  }

  _key(it) {
    if (it.look === 'person') return 'm:person' + (it.id % 4);
    if (this.models[it.look]) return 'm:' + it.look;
    return 'b:' + it.look + ':' + (it.look === 'cone' ? 'cone' : it.shape);
  }

  _pool(k, cap = 64) {
    let p = this.pools.get(k);
    if (p) return p;
    if (k.startsWith('m:')) {
      const g = this.models[k.slice(2)];
      if (!this.propMat) this.propMat = itemMat('prop');
      p = new Pool(this, g, this.propMat, cap);
    } else {
      const [, look, shape] = k.split(':');
      const L = this.looks[look] || this.looks.plain;
      const geo = shape === 'roof' ? roofGeo() : shape === 'cyl' ? new THREE.CylinderGeometry(0.5, 0.5, 1, 16) : shape === 'cone' ? new THREE.ConeGeometry(0.5, 1, 16) : new THREE.BoxGeometry(1, 1, 1);
      const mode = shape === 'roof' ? 1 : shape === 'box' ? 0 : 2;
      this.blockMats = this.blockMats || {};
      const mk = look + mode;
      const mat = this.blockMats[mk] || (this.blockMats[mk] = itemMat('block', L, mode));
      p = new Pool(this, geo, mat, cap);
    }
    this.pools.set(k, p);
    return p;
  }

  _add(it) {
    if(this.attractView&&!this.attractVisible.has(it.id))return;
    const p = this._pool(this._key(it));
    const slot = { p, i: -1, it };
    const i = p.alloc(slot);
    const c = new THREE.Color(it.tint);
    p.mesh.setColorAt(i, c);
    p.mesh.instanceColor.needsUpdate = true;
    this.slots.set(it.id, slot);
    this._set(slot);
    return slot;
  }

  _set(slot, dy = 0) {
    const it = slot.it;
    const model = slot.p.geo.getAttribute('aTint') != null;
    // вернувшийся предмет: дом поднимается из-под земли, мелочь «выпрыгивает»
    let sc = 1;
    if (it.born != null) {
      const k = (this.simT - it.born) / (it.riseH ? 1.8 : 0.55);
      if (k >= 1) {
        it.born = null;
        this.rising.delete(slot);
      } else {
        this.rising.add(slot);
        const a = Math.max(0, k);
        if (it.riseH) dy -= (it.riseH + 0.5) * (1 - easeOut(a));
        else sc = Math.max(0.001, easeBack(a));
      }
    }
    _p.set(it.p.x, it.p.y * sc + dy, it.p.z);
    _q.set(it.q.x, it.q.y, it.q.z, it.q.w);
    if (model && !slot.p.geo.userData.fitCollider) _s.set(sc, sc, sc);
    else _s.set(it.size[0] * sc, it.size[1] * sc, it.size[2] * sc);
    _m.compose(_p, _q, _s);
    slot.p.mesh.setMatrixAt(slot.i, _m);
    slot.p.dirty = true;
  }

  _dirty() {
    for (const p of this.pools.values()) {
      p.mesh.instanceMatrix.needsUpdate = true;
      p.dirty = false;
    }
  }

  _release(id) {
    const s = this.slots.get(id);
    if (!s) return;
    this.rising.delete(s);
    s.p.release(s.i);
    this.slots.delete(id);
  }

  // земля: одна текстура на всю карту
  _ground(map) {
    const span = map.half * 2;
    const ppm = Math.min(10, 2048 / span);
    const W = Math.round(span * ppm);
    const c = document.createElement('canvas');
    c.width = c.height = W;
    const g = c.getContext('2d');
    const X = (x) => (x + map.half) * ppm;
    const paint=[];
    const stripe=(x0,z0,x1,z1)=>paint.push(x0,.014,z0,x0,.014,z1,x1,.014,z1,x0,.014,z0,x1,.014,z1,x1,.014,z0);
    const mask=document.createElement('canvas');mask.width=mask.height=Math.min(1024,W);
    const mg=mask.getContext('2d');mg.scale(mask.width/W,mask.height/W);mg.fillStyle='#000';mg.fillRect(0,0,W,W);
    let seed = 7;
    const R = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const r of map.ground) {
      const x0 = X(Math.min(r.x0, r.x1)), z0 = X(Math.min(r.z0, r.z1)), x1 = X(Math.max(r.x0, r.x1)), z1 = X(Math.max(r.z0, r.z1));
      const w = x1 - x0, h = z1 - z0;
      if(r.t!=='dash'&&r.t!=='zebra'){
        mg.fillStyle=['road','asphalt','asphalt2','nightroad','snowroad'].includes(r.t)?'#f00':['walk','plaza','nightwalk','snowwalk','fairroad'].includes(r.t)?'#0f0':['cobble','cobble2'].includes(r.t)?'#00f':'#000';
        if(r.r){mg.beginPath();mg.roundRect(x0,z0,w,h,r.r*ppm);mg.fill();}else mg.fillRect(x0,z0,w,h);
      }
      if (r.t === 'dash') {
        // Leave the pedestrian crossing and the junction free of centre dashes.
        if(r.v)for(let z=r.z0+2.2;z<r.z1-2.2;z+=4.2)stripe(r.x0-.08,z,r.x0+.08,Math.min(r.z1-2.2,z+2));
        else for(let x=r.x0+2.2;x<r.x1-2.2;x+=4.2)stripe(x,r.z0-.08,Math.min(r.x1-2.2,x+2),r.z0+.08);
        continue;
      }
      if (r.t === 'zebra') {
        if(r.v)for(let x=r.x0+.25;x<r.x1-.25;x+=1)stripe(x,r.z0,x+.5,r.z1);
        else for(let z=r.z0+.25;z<r.z1-.25;z+=1)stripe(r.x0,z,r.x1,z+.5);
        continue;
      }
      g.fillStyle = GROUND[r.t] || '#888';
      if (r.r) {
        g.beginPath();
        g.roundRect(x0, z0, w, h, r.r * ppm);
        g.fill();
      } else g.fillRect(x0, z0, w, h);
      // детали покрытия
      if (r.t === 'grass' || r.t === 'meadow') {
        for (let i = 0; i < (w * h) / 40; i++) {
          g.fillStyle = R() < 0.5 ? 'rgba(60,120,40,.12)' : 'rgba(255,255,200,.12)';
          g.fillRect(x0 + R() * w, z0 + R() * h, 2, 2);
        }
        for (let i = 0; i < (w * h) / (ppm * ppm * 60); i++) {
          g.fillStyle = ['#ffffff', '#ffd24a', '#ff8ac0'][i % 3];
          g.beginPath();
          g.arc(x0 + R() * w, z0 + R() * h, 0.12 * ppm, 0, 7);
          g.fill();
        }
      } else if (r.t === 'walk' || r.t === 'plaza') {
        g.strokeStyle = 'rgba(0,0,0,.07)';
        g.lineWidth = 1;
        const st = (r.t === 'walk' ? 1 : 1.5) * ppm;
        g.beginPath();
        for (let x = x0; x < x1; x += st) g.moveTo(x, z0), g.lineTo(x, z1);
        for (let z = z0; z < z1; z += st) g.moveTo(x0, z), g.lineTo(x1, z);
        g.stroke();
        g.strokeStyle = 'rgba(41,50,61,.32)';
        g.lineWidth = 0.22 * ppm;
        g.strokeRect(x0, z0, w, h);
        g.strokeStyle='rgba(255,255,255,.46)';g.lineWidth=.1*ppm;g.strokeRect(x0+.16*ppm,z0+.16*ppm,w-.32*ppm,h-.32*ppm);
      } else if (r.t === 'parking') {
        g.fillStyle = 'rgba(255,255,255,.85)';
        const n = r.n || 6;
        for (let k = 0; k <= n; k++) g.fillRect(x0 + (w * k) / n - 0.06 * ppm, z0 + h * 0.15, 0.12 * ppm, h * 0.7);
      } else if (r.t === 'cobble' || r.t === 'cobble2') {
        // Fine staggered stonework comes from the repeating detail map.
      } else if (r.t === 'field') {
        for (let z = z0; z < z1; z += 1.2 * ppm) {
          g.fillStyle = 'rgba(90,60,30,.35)';
          g.fillRect(x0, z, w, 0.5 * ppm);
        }
      } else if (r.t === 'beach' || r.t === 'gravel' || r.t === 'snow' || r.t === 'snowwalk') {
        const dots = r.t === 'beach' ? ['rgba(190,150,80,.18)', 'rgba(255,255,255,.3)'] : r.t === 'gravel' ? ['rgba(0,0,0,.1)', 'rgba(255,255,255,.35)'] : ['rgba(150,180,220,.16)', 'rgba(255,255,255,.9)'];
        for (let i = 0; i < (w * h) / 50; i++) {
          g.fillStyle = dots[i % 2];
          g.fillRect(x0 + R() * w, z0 + R() * h, 2, 2);
        }
        if (r.t === 'snow')
          for (let i = 0; i < (w * h) / (ppm * ppm * 40); i++) {
            g.fillStyle = 'rgba(170,195,225,.18)';
            g.beginPath();
            g.ellipse(x0 + R() * w, z0 + R() * h, (0.8 + R() * 1.6) * ppm, (0.4 + R() * 0.6) * ppm, R() * 3, 0, 7);
            g.fill();
          }
      } else if (r.t === 'boards') {
        g.fillStyle = 'rgba(90,50,20,.22)';
        for (let x = x0; x < x1; x += 0.5 * ppm) g.fillRect(x, z0, 0.06 * ppm, h);
        for (let z = z0; z < z1; z += 0.5 * ppm) g.fillRect(x0, z, w, 0.06 * ppm);
      } else if (r.t === 'pool' || r.t === 'water' || r.t === 'ice') {
        if (r.t === 'pool') {
          g.strokeStyle = '#ffffff';
          g.lineWidth = 0.35 * ppm;
          g.beginPath();
          g.roundRect(x0, z0, w, h, (r.r || 0) * ppm);
          g.stroke();
          g.fillStyle = 'rgba(255,255,255,.12)';
          for (let x = x0 + ppm; x < x1 - ppm; x += ppm) g.fillRect(x, z0 + ppm, 0.04 * ppm, h - 2 * ppm);
        }
        g.strokeStyle = r.t === 'ice' ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.4)';
        g.lineWidth = 0.1 * ppm;
        for (let i = 0; i < (w * h) / (ppm * ppm * 6); i++) {
          const x = x0 + ppm + R() * (w - 2 * ppm), z = z0 + ppm + R() * (h - 2 * ppm), l = (0.5 + R()) * ppm;
          g.beginPath();
          if (r.t === 'ice') g.moveTo(x, z), g.lineTo(x + l * 2, z + l * (R() - 0.5));
          else g.moveTo(x, z), g.quadraticCurveTo(x + l / 2, z - l / 3, x + l, z);
          g.stroke();
        }
      } else if (r.t === 'fairroad') {
        g.strokeStyle = 'rgba(120,60,40,.14)';
        g.lineWidth = 1;
        g.beginPath();
        for (let x = x0; x < x1; x += 0.8 * ppm) g.moveTo(x, z0), g.lineTo(x, z1);
        for (let z = z0; z < z1; z += 0.8 * ppm) g.moveTo(x0, z), g.lineTo(x1, z);
        g.stroke();
      } else if (r.t === 'moss') {
        for (let i = 0; i < (w * h) / 40; i++) {
          g.fillStyle = R() < 0.5 ? 'rgba(40,100,30,.14)' : 'rgba(255,255,220,.12)';
          g.fillRect(x0 + R() * w, z0 + R() * h, 2, 2);
        }
        for (let i = 0; i < (w * h) / (ppm * ppm * 30); i++) {
          g.fillStyle = 'rgba(255,190,215,.85)';
          g.beginPath();
          g.ellipse(x0 + R() * w, z0 + R() * h, 0.12 * ppm, 0.07 * ppm, R() * 3, 0, 7);
          g.fill();
        }
      } else if (r.t === 'snowroad') {
        g.fillStyle = 'rgba(255,255,255,.35)';
        for (let i = 0; i < (w * h) / 40; i++) g.fillRect(x0 + R() * w, z0 + R() * h, 2, 2);
        g.fillStyle = 'rgba(255,255,255,.5)';
        if (w > h) g.fillRect(x0, z0, w, 0.5 * ppm), g.fillRect(x0, z1 - 0.5 * ppm, w, 0.5 * ppm);
        else g.fillRect(x0, z0, 0.5 * ppm, h), g.fillRect(x1 - 0.5 * ppm, z0, 0.5 * ppm, h);
      } else if (r.t === 'road' || r.t === 'asphalt' || r.t === 'asphalt2') {
        // Aggregate is resolved by the mipmapped asphalt detail texture.

      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const mat = new THREE.MeshLambertMaterial({ map: tex, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp });
    const maskTexture=new THREE.CanvasTexture(mask);
    detailedGround(mat,maskTexture,this.renderer);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(span, span), mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.world.add(ground);
    this.ground = ground;
    if(paint.length){
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(paint,3));geo.computeVertexNormals();geo.computeBoundingSphere();
      const pm=new THREE.MeshLambertMaterial({color:0xf3f3ec,stencilWrite:true,stencilRef:1,stencilFunc:THREE.NotEqualStencilFunc,stencilFail:THREE.KeepStencilOp,stencilZFail:THREE.KeepStencilOp,stencilZPass:THREE.KeepStencilOp});
      this.roadPaint=new THREE.Mesh(geo,pm);this.roadPaint.receiveShadow=true;this.world.add(this.roadPaint);
    }
    // вокруг карты — бесконечный газон / вода
    const outerCol = OUTER[map.id] || 0x86c860;
    const outer = new THREE.Mesh(new THREE.RingGeometry(span * 0.705, 700, 4, 1, Math.PI / 4), new THREE.MeshLambertMaterial({ color: outerCol }));
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = -0.02;
    outer.receiveShadow = true;
    this.world.add(outer);
    this.outer = outer;
  }

  // снежинки / лепестки: облако точек вокруг камеры, падают и покачиваются
  _weather(map) {
    const W = WEATHER[map.id];
    if (!W) return;
    const n = this.quality === 'low' ? Math.round(W.n / 3) : this.quality === 'mid' ? Math.round(W.n * 0.6) : W.n;
    const pos = new Float32Array(n * 3);
    const ph = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 1] = Math.random() * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 90;
      ph[i] = Math.random() * 7;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d');
    g.fillStyle = W.col;
    g.beginPath();
    if (map.id === 'japan') g.ellipse(16, 16, 14, 8, 0.6, 0, 7);
    else g.arc(16, 16, 13, 0, 7);
    g.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.PointsMaterial({ size: W.size, map: tex, transparent: true, depthWrite: false, alphaTest: 0.3, fog: true });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    this.scene.add(pts);
    this.wx = { pts, pos, ph, n, W, t: 0 };
  }

  _weatherStep(dt) {
    const { pos, ph, n, W } = this.wx;
    this.wx.t += dt;
    const t = this.wx.t, cx = this.cam.x, cz = this.cam.z;
    // область растёт вместе с отдалением камеры
    const A = 45 + this.cam.dist * 0.4, top = 18 + this.cam.dist * 0.6;
    for (let i = 0; i < n; i++) {
      const k = i * 3;
      pos[k + 1] -= W.fall * dt * (0.7 + (i % 5) * 0.12);
      pos[k] += Math.sin(t * 0.9 + ph[i]) * W.sway * dt;
      pos[k + 2] += Math.cos(t * 0.7 + ph[i]) * W.sway * 0.6 * dt;
      if (pos[k + 1] < 0) pos[k + 1] += top;
      if (pos[k] < cx - A) pos[k] += A * 2;
      else if (pos[k] > cx + A) pos[k] -= A * 2;
      if (pos[k + 2] < cz - A) pos[k + 2] += A * 2;
      else if (pos[k + 2] > cz + A) pos[k + 2] -= A * 2;
    }
    this.wx.pts.material.size = W.size * (1 + this.cam.dist / 60);
    this.wx.pts.geometry.attributes.position.needsUpdate = true;
  }

  // ---------- дыры ----------
  _holeVis(h) {
    let v = this.holes.get(h.id);
    if (v) return v;
    const skin = SKINS.find((s) => s.id === h.skin) || SKINS[0];
    const grp = new THREE.Group();
    const mask = new THREE.Mesh(
      new THREE.CircleGeometry(1, 56),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp }),
    );
    mask.rotation.x = -Math.PI / 2;
    mask.position.y = 0.03;
    mask.renderOrder = -5;
    const wallU = { top: { value: new THREE.Color(skin.wall) }, glow: { value: new THREE.Color(skin.glow) }, time: { value: 0 }, hot: { value: skin.hot ? 1 : 0 }, stars: { value: skin.stars ? 1 : 0 } };
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 1, 48, 1, true),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: wallU,
        vertexShader: 'varying float vY; varying float vA; void main(){ vY = position.y + 0.5; vA = atan(position.z, position.x); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 top; uniform vec3 glow; uniform float time; uniform float hot; uniform float stars; varying float vY; varying float vA;\n' +
          'void main(){ float k = pow(vY, 3.0); vec3 c = mix(vec3(0.0), top, k); c += glow * pow(vY, 14.0) * 0.6;\n' +
          ' if (hot > 0.5) c += glow * 0.25 * pow(vY, 2.0) * (0.6 + 0.4 * sin(vA * 7.0 + time * 3.0));\n' +
          ' if (stars > 0.5) { float s = fract(sin(floor(vA * 30.0) * 12.9 + floor(vY * 24.0) * 78.2) * 43758.5); c += vec3(step(0.93, s)) * 0.8 * vY; }\n' +
          ' gl_FragColor = vec4(c, 1.0); }',
      }),
    );
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    bottom.rotation.x = -Math.PI / 2;
    // ободок в цветах скина
    const N = 96;
    const rimGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 2 * 3 * 3);
    const col = new Float32Array(N * 2 * 3 * 3);
    rimGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    rimGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const cols = skin.rim.map((c) => new THREE.Color(c));
    const stripes = cols.length > 1 ? 24 : 1;
    for (let i = 0; i < N; i++) {
      const c = cols[Math.floor((i / N) * stripes) % cols.length];
      for (let k = 0; k < 6; k++) col.set([c.r, c.g, c.b], (i * 6 + k) * 3);
    }
    const rim = new THREE.Mesh(rimGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    rim.renderOrder = 1;
    // мягкое свечение вокруг
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(1, 1.5, 64, 1),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { c: { value: new THREE.Color(skin.glow) }, a: { value: 0.5 } },
        vertexShader: 'varying float vR; void main(){ vR = length(position.xy); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 c; uniform float a; varying float vR; void main(){ float k = 1.0 - smoothstep(1.0, 1.5, vR); gl_FragColor = vec4(c, k * k * a); }',
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.04;
    halo.renderOrder = 2;
    const bevel=new THREE.Mesh(new THREE.TorusGeometry(1.035,.038,6,64),new THREE.MeshLambertMaterial({color:skin.rim[0]}));
    bevel.rotation.x=-Math.PI/2;bevel.position.y=.065;bevel.renderOrder=1;
    grp.add(mask, wall, bottom, rim, halo,bevel);
    this.world.add(grp);
    v = { grp, mask, wall, bottom, bevel, rim, rimPos: pos, halo, wallU, r: -1, skin, spin: 0 };
    this.holes.set(h.id, v);
    return v;
  }

  _dropHole(v) {
    this.world.remove(v.grp);
    v.grp.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }

  setSkin(h) {
    const v = this.holes.get(h.id);
    if (v) {
      this._dropHole(v);
      this.holes.delete(h.id);
    }
  }

  _updateHole(h, v, dt) {
    v.grp.visible = h.alive;
    if (!h.alive) return;
    v.grp.position.set(h.x, 0, h.z);
    const r = h.r;
    v.mask.scale.set(r, r, 1);
    v.bevel.scale.set(r,r,Math.max(.6,Math.min(2,r*.25)));
    const depth = 3 + r * 1.6;
    v.wall.scale.set(r, depth, r);
    v.wall.position.y = -depth / 2 + 0.02;
    v.bottom.scale.set(r, r, 1);
    v.bottom.position.y = -depth + 0.05;
    v.wallU.time.value = this.time;
    v.halo.scale.set(r, r, 1);
    v.halo.material.uniforms.a.value = h.shield > 0 ? 0.5 + 0.4 * Math.sin(this.time * 20) : h.eff.shield > 0 ? 0.85 + 0.15 * Math.sin(this.time * 4) : h.me ? 0.55 : 0.32;
    // ободок перестраиваем, только когда заметно изменился радиус
    if (Math.abs(v.r - r) > 0.01) {
      v.r = r;
      const w = Math.max(0.12, Math.min(0.4, r * 0.07));
      const N = 96;
      const P = v.rimPos;
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
        const p = [
          [Math.cos(a0) * r, Math.sin(a0) * r], [Math.cos(a0) * (r + w), Math.sin(a0) * (r + w)], [Math.cos(a1) * (r + w), Math.sin(a1) * (r + w)],
          [Math.cos(a0) * r, Math.sin(a0) * r], [Math.cos(a1) * (r + w), Math.sin(a1) * (r + w)], [Math.cos(a1) * r, Math.sin(a1) * r],
        ];
        for (let k = 0; k < 6; k++) P.set([p[k][0], 0.05, p[k][1]], (i * 6 + k) * 3);
      }
      v.rim.geometry.attributes.position.needsUpdate = true;
      v.rim.geometry.computeBoundingSphere();
    }
    v.rim.rotation.y += dt * (v.skin.spin ? 1.2 : 0.25);
  }

  // ---------- кадр ----------
  frame(dt, sim, focus) {
    this.time += dt;
    // события мира
    for (const e of sim.events) {
      if (e.t === 'sink') {
        const s = this.slots.get(e.it.id);
        if (s) {
          this.slots.delete(e.it.id);
          this.rising.delete(s);
          s.it = e.it;
          this.ghosts.push({ s, t: 0, it: e.it });
        }
      } else if (e.t === 'eat' || e.t === 'break') {
        if (e.t === 'break') this.fx.burst(e.p, e.it, e.big);
        this._release(e.it.id);
      } else if (e.t === 'boom') this.fx.boom(e.p, e.R);
      else if (e.t === 'regen') this.fx.rise(e.p, e.r, e.big);
      else if (e.t === 'pick') this.fx.pick(e.p, e.type, e.h.r);
      else if (e.t === 'gold') {
        const s = this.slots.get(e.it.id);
        if (s) {
          s.p.mesh.setColorAt(s.i, new THREE.Color(e.it.tint));
          s.p.mesh.instanceColor.needsUpdate = true;
        }
      }
    }
    this.simT = sim.time;
    for (const s of this.rising) this._set(s);
    for (const it of sim.added) if (it.st !== 2 && !this.slots.has(it.id)) this._add(it);
    sim.added.length = 0;
    // движение
    // спящие тела и стоящие на месте агенты не трогаем — меньше пересчёта и выгрузки буферов
    for (const it of sim.active) {
      const s = this.slots.get(it.id);
      if (s && (it.awake || !s.rest)) {
        this._set(s);
        s.rest = !it.awake;
      }
    }
    for (const it of sim.agents) {
      if (it.st !== 0 || !it.agent) continue;
      const s = this.slots.get(it.id);
      if (!s || s.mv === it.mv) continue;
      s.mv = it.mv;
      const bob = it.agent.type === 'walk' && it.agent.phase ? Math.abs(Math.sin(it.agent.phase)) * 0.08 : 0;
      this._set(s, bob);
    }
    // замороженные после физики — одно обновление
    if (sim.frozenNow) {
      for (const it of sim.frozenNow) {
        const s = this.slots.get(it.id);
        if (s) this._set(s);
      }
      sim.frozenNow.length = 0;
    }
    // проваливающиеся без физики (вдали или при перегрузе)
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i];
      g.t += dt;
      g.it.p.y -= dt * (2 + g.t * 14);
      this._set(g.s);
      if (g.t > 0.7) {
        this.rising.delete(g.s);
        g.s.p.release(g.s.i);
        this.ghosts.splice(i, 1);
      }
    }
    for (const p of this.pools.values())
      if (p.dirty) {
        p.mesh.instanceMatrix.needsUpdate = true;
        p.dirty = false;
      }
    // дыры
    const seen = new Set();
    for (const h of sim.holes) {
      const v = this._holeVis(h);
      this._updateHole(h, v, dt);
      seen.add(h.id);
    }
    for (const [id, v] of this.holes) if (!seen.has(id)) (this._dropHole(v), this.holes.delete(id));
    this._picks(sim);
    this._goldMark(sim);
    this.fx.update(dt);
    if (this.wx) this._weatherStep(dt);
    // камера
    if (focus) {
      const k = Math.min(1, dt * 6);
      this.cam.x += (focus.x - this.cam.x) * k;
      this.cam.z += (focus.z - this.cam.z) * k;
      const want = (this.portrait ? 25 : 24) + Math.min(focus.r, 8) * 6.2 + Math.max(0, focus.r - 8) * 3.4;
      this.cam.dist += (want - this.cam.dist) * Math.min(1, dt * 2);
    }
    this._camera();
    if(this.attractView){this.attractCullT-=dt;if(this.attractCullT<=0){this.attractCullT=.15;this._cullAttract(sim);}}
  }

  _cullAttract(sim){
    this.camera.updateMatrixWorld();this.attractFrustum ||= new THREE.Frustum();this.attractMatrix ||= new THREE.Matrix4();this.attractSphere ||= new THREE.Sphere();
    this.attractMatrix.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);this.attractFrustum.setFromProjectionMatrix(this.attractMatrix);
    const wanted=this.attractVisible;wanted.clear();let budget=100;
    for(const it of sim.items){if(it.st===2)continue;const sphere=this.attractSphere;sphere.center.set(it.p.x,it.p.y,it.p.z);sphere.radius=it.rad+5;if(this.attractFrustum.intersectsSphere(sphere))wanted.add(it.id);}
    for(const [id]of this.slots)if(!wanted.has(id))this._release(id);
    for(const it of sim.items)if(wanted.has(it.id)&&!this.slots.has(it.id)&&budget-->0)this._add(it);
  }

  // золотая цель: звезда над ней и золотые искры
  _goldMark(sim) {
    const G = sim.gold && sim.gold.st !== 2 ? sim.gold : null;
    if (!G) {
      if (this.goldSp) this.goldSp.visible = false;
      return;
    }
    if (!this.goldSp) {
      const tex = new THREE.CanvasTexture(pickIcon('gold', 128));
      tex.colorSpace = THREE.SRGBColorSpace;
      this.goldSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
      this.goldSp.renderOrder = 20;
      this.scene.add(this.goldSp);
    }
    const S = Math.max(2.2, this.cam.dist * 0.07);
    const sp = this.goldSp;
    sp.visible = true;
    sp.scale.set(S, S, 1);
    sp.position.set(G.p.x, G.p.y + G.size[1] / 2 + 1.2 + S * 0.5 + Math.sin(this.time * 4) * 0.35, G.p.z);
    if ((this._goldT = (this._goldT || 0) - 1) <= 0) {
      this._goldT = 4;
      this.fx.spark(G.p, G.p.y + G.size[1] / 2);
    }
  }

  // бонусы: значок парит над дорогой, под ним светится круг
  _picks(sim) {
    const seen = this._seenP || (this._seenP = new Set());
    seen.clear();
    const S = Math.max(2.4, this.cam.dist * 0.075);
    for (const p of sim.pickups) {
      seen.add(p.id);
      let v = this.picks.get(p.id);
      if (!v) {
        if (!this.pickTex) this.pickTex = {};
        if (!this.pickTex[p.type]) {
          const tx = new THREE.CanvasTexture(pickIcon(p.type));
          tx.colorSpace = THREE.SRGBColorSpace;
          this.pickTex[p.type] = tx;
        }
        const grp = new THREE.Group();
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.pickTex[p.type], depthWrite: false }));
        spr.renderOrder = 4;
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 40), new THREE.MeshBasicMaterial({ color: PICK_COL[p.type], transparent: true, opacity: 0.75, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.06;
        grp.add(spr, ring);
        grp.position.set(p.x, 0, p.z);
        this.world.add(grp);
        v = { grp, spr, ring, ph: Math.random() * 6 };
        this.picks.set(p.id, v);
      }
      const bob = Math.sin(this.time * 3 + v.ph) * 0.25;
      v.spr.scale.set(S, S, 1);
      v.spr.position.y = S * 0.75 + 0.4 + bob;
      const rs = S * (0.5 + 0.08 * Math.sin(this.time * 4 + v.ph));
      v.ring.scale.set(rs, rs, 1);
      // скоро исчезнет — мигает
      v.grp.visible = p.life > 5 || Math.sin(this.time * 14) > -0.2;
    }
    for (const [id, v] of this.picks)
      if (!seen.has(id)) {
        this.world.remove(v.grp);
        v.spr.material.dispose();
        v.ring.geometry.dispose();
        v.ring.material.dispose();
        this.picks.delete(id);
      }
  }

  _camera() {
    const c = this.cam;
    // camFix — ракурс для промо-кадров
    if (this.camFix) c.dist = this.camFix.dist;
    const pitch = this.camFix ? this.camFix.pitch : 0.98;
    let sx = 0, sz = 0;
    if (this.shake > 0) {
      sx = (Math.random() - 0.5) * this.shake;
      sz = (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - 0.05);
    }
    this.camera.position.set(c.x + sx, Math.sin(pitch) * c.dist, c.z + Math.cos(pitch) * c.dist + sz);
    this.camera.lookAt(c.x + sx, 0, c.z + sz - c.dist * 0.04);
    // тень следует за камерой
    const S = c.dist * 1.25;
    const sc = this.sun.shadow.camera;
    if (sc.right !== S) {
      sc.left = -S;
      sc.right = S;
      sc.top = S;
      sc.bottom = -S;
      sc.near = 1;
      sc.far = 220;
      sc.updateProjectionMatrix();
    }
    this.sun.position.set(c.x + 40, 90, c.z + 30);
    this.sun.target.position.set(c.x, 0, c.z);
    this.scene.fog.near = c.dist * 3;
    this.scene.fog.far = c.dist * 9 + 60;
  }

  render() {
    // все шейдеры (частицы, взрывы, дыры) собираем сразу после смены карты, а не посреди раунда при первом взрыве
    if (this._warm) {
      this._warm = false;
      this.renderer.compile(this.scene, this.camera);
    }
    if(this.splitPlayers){
      const r=this.renderer,W=window.innerWidth,H=window.innerHeight,vertical=H>W;
      this.splitCameras ||= [this.camera.clone(),this.camera.clone()];
      r.setScissorTest(true);
      for(let i=0;i<2;i++){
        const h=this.splitPlayers[i],c=this.splitCameras[i],w=vertical?W:W/2,height=vertical?H/2:H,x=vertical?0:i*w,y=vertical?(1-i)*height:0;
        const distance=26+Math.min(h.r,8)*6.2+Math.max(0,h.r-8)*3.4;
        c.aspect=w/height;c.fov=50;c.updateProjectionMatrix();
        c.position.set(h.x,Math.sin(.98)*distance,h.z+Math.cos(.98)*distance);c.lookAt(h.x,0,h.z-distance*.04);
        r.setViewport(x,y,w,height);r.setScissor(x,y,w,height);r.render(this.scene,c);
      }
      r.setScissorTest(false);r.setViewport(0,0,W,H);
    }else this.renderer.render(this.scene, this.camera);
  }

  toScreen(x, y, z, out) {
    _p.set(x, y, z).project(this.camera);
    out.x = (_p.x * 0.5 + 0.5) * window.innerWidth;
    out.y = (-_p.y * 0.5 + 0.5) * window.innerHeight;
    out.vis = _p.z < 1 && Math.abs(_p.x) < 1.2 && Math.abs(_p.y) < 1.2;
    return out;
  }

  // ---------- частицы ----------
  _fx() {
    const N = 500;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const mesh = new THREE.InstancedMesh(geo, mat, N);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3).fill(1), 3);
    mesh.frustumCulled = false;
    mesh.count = 0;
    const puffGeo = new THREE.IcosahedronGeometry(1, 0);
    const puffMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false });
    const puff = new THREE.InstancedMesh(puffGeo, puffMat, 200);
    puff.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(200 * 3).fill(1), 3);
    puff.frustumCulled = false;
    puff.count = 0;
    this.scene.add(mesh, puff);
    const parts = [];
    const puffs = [];
    const self = this;
    const col = new THREE.Color();
    this.fx = {
      reset() {
        parts.length = 0;
        puffs.length = 0;
      },
      burst(p, it, big) {
        const n = big ? 8 : 12;
        col.setHex(it.tint || 0xffffff);
        if (it.look === 'glass') col.setHex(0xbfe6ff);
        for (let i = 0; i < n && parts.length < N; i++) {
          parts.push({ x: p.x + (Math.random() - 0.5) * it.rad, y: p.y + (Math.random() - 0.5), z: p.z + (Math.random() - 0.5) * it.rad, vx: (Math.random() - 0.5) * 6, vy: 2 + Math.random() * 5, vz: (Math.random() - 0.5) * 6, s: 0.12 + Math.random() * 0.25, r: Math.random() * 6, t: 0, life: 1 + Math.random() * 0.6, c: col.clone().multiplyScalar(0.8 + Math.random() * 0.3) });
        }
        for (let i = 0; i < (big ? 3 : 5) && puffs.length < 200; i++) puffs.push({ x: p.x + (Math.random() - 0.5) * it.rad, y: Math.max(0.3, p.y), z: p.z + (Math.random() - 0.5) * it.rad, s: 0.5 + Math.random() * it.rad * 0.4, t: 0, life: 0.9 + Math.random() * 0.5, c: new THREE.Color(0xf0ece4) });
      },
      dust(x, z, r) {
        for (let i = 0; i < 3 && puffs.length < 200; i++) {
          const a = Math.random() * 7;
          puffs.push({ x: x + Math.cos(a) * r, y: 0.2, z: z + Math.sin(a) * r, s: 0.3 + Math.random() * 0.4, t: 0, life: 0.6, c: new THREE.Color(0xe8e0d0) });
        }
      },
      rise(p, r, big) {
        const n = big ? 14 : 4;
        for (let i = 0; i < n && puffs.length < 200; i++) {
          const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
          const d = big ? r * (0.7 + Math.random() * 0.4) : r * 0.6;
          puffs.push({ x: p.x + Math.cos(a) * d, y: 0.3, z: p.z + Math.sin(a) * d, s: (big ? 1 : 0.35) + Math.random() * (big ? 0.9 : 0.3), t: 0, life: big ? 1.4 : 0.6, c: new THREE.Color(0xf0e8d8) });
        }
      },
      spark(p, y) {
        col.set(PICK_COL.gold);
        for (let i = 0; i < 2 && parts.length < N; i++) {
          const a = Math.random() * 7;
          parts.push({ x: p.x + Math.cos(a) * 0.8, y, z: p.z + Math.sin(a) * 0.8, vx: Math.cos(a) * 1.2, vy: 5 + Math.random() * 2, vz: Math.sin(a) * 1.2, s: 0.18 + Math.random() * 0.12, r: Math.random() * 6, t: 0, life: 0.7, c: col.clone() });
        }
      },
      pick(p, type, r) {
        col.set(PICK_COL[type]);
        for (let i = 0; i < 16 && parts.length < N; i++) {
          const a = (i / 16) * Math.PI * 2;
          parts.push({ x: p.x, y: 1.2, z: p.z, vx: Math.cos(a) * 6, vy: 4 + Math.random() * 4, vz: Math.sin(a) * 6, s: 0.25 + Math.random() * 0.2, r: Math.random() * 6, t: 0, life: 0.8, c: col.clone() });
        }
      },
      boom(p, R) {
        self.shake = Math.max(self.shake, 0.9);
        for (let i = 0; i < 14 && puffs.length < 200; i++) {
          const a = Math.random() * 7, d = Math.random() * R * 0.5;
          puffs.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.random() * 1.5, z: p.z + Math.sin(a) * d, s: 0.8 + Math.random() * 1.2, t: 0, life: 0.7 + Math.random() * 0.4, c: new THREE.Color(i < 7 ? 0xffa030 : 0x5a5050), grow: 3 });
        }
      },
      update(dt) {
        let k = 0;
        for (let i = parts.length - 1; i >= 0; i--) {
          const q = parts[i];
          q.t += dt;
          if (q.t > q.life) {
            parts.splice(i, 1);
            continue;
          }
          q.vy -= 14 * dt;
          q.x += q.vx * dt;
          q.y += q.vy * dt;
          q.z += q.vz * dt;
          if (q.y < q.s / 2 && Math.abs(q.vy) > 0) {
            q.y = q.s / 2;
            q.vy *= -0.3;
            q.vx *= 0.6;
            q.vz *= 0.6;
          }
          q.r += dt * 5;
        }
        for (const q of parts) {
          const s = q.s * Math.min(1, (q.life - q.t) * 3);
          _p.set(q.x, q.y, q.z);
          _q.setFromAxisAngle(_s.set(0.6, 0.8, 0).normalize(), q.r);
          _s.set(s, s, s);
          _m.compose(_p, _q, _s);
          mesh.setMatrixAt(k, _m);
          mesh.setColorAt(k, q.c);
          k++;
        }
        mesh.count = k;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        k = 0;
        for (let i = puffs.length - 1; i >= 0; i--) {
          const q = puffs[i];
          q.t += dt;
          if (q.t > q.life) puffs.splice(i, 1);
        }
        for (const q of puffs) {
          const f = q.t / q.life;
          const s = q.s * (1 + f * (q.grow || 1.2)) * (1 - f * f);
          _p.set(q.x, q.y + f * 1.2, q.z);
          _q.identity();
          _s.set(s, s, s);
          _m.compose(_p, _q, _s);
          puff.setMatrixAt(k, _m);
          puff.setColorAt(k, q.c);
          k++;
        }
        puff.count = k;
        puff.instanceMatrix.needsUpdate = true;
        if (puff.instanceColor) puff.instanceColor.needsUpdate = true;
      },
    };
  }
}
