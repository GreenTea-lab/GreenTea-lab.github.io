// Материал кузова: глянцевая краска с лаком (clearcoat) и отражениями окружения, а поверх —
// состояние детали прямо в шейдере: ржавчина с пузырями краски, вмятины (смещение вершин и нормалей),
// выгоревшая краска, серый грунт на новой детали и грязь, которую отмывают пальцем (маска в текстуре).
import * as THREE from 'three';

const NOISE = /* glsl */ `
float gfHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float gfNoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(gfHash(i), gfHash(i + vec3(1,0,0)), f.x), mix(gfHash(i + vec3(0,1,0)), gfHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(gfHash(i + vec3(0,0,1)), gfHash(i + vec3(1,0,1)), f.x), mix(gfHash(i + vec3(0,1,1)), gfHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float gfFbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * gfNoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
`;

const DENTS = 4;

// общие белая/чёрная текстуры для деталей без маски грязи
let WHITE = null;
function white() {
  if (!WHITE) {
    WHITE = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    WHITE.needsUpdate = true;
  }
  return WHITE;
}

// o: { color, metallic, rough, chrome, plastic }
export function paintMaterial(o = {}) {
  const chrome = !!o.chrome;
  const plastic = !!o.plastic;
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(o.color ?? 0xc0392b),
    metalness: chrome ? 1 : plastic ? 0 : o.metallic ? 0.55 : 0.05,
    roughness: chrome ? 0.12 : plastic ? 0.62 : o.metallic ? 0.32 : 0.28,
    clearcoat: chrome || plastic ? 0 : 1,
    clearcoatRoughness: 0.05,
    side: o.side ?? THREE.FrontSide,
  });
  const u = {
    uRust: { value: 0 },
    uDent: { value: 0 },
    uDirt: { value: 0 },
    uFade: { value: 0 },
    uPrimer: { value: 0 },
    uHi: { value: 0 },
    uSill: { value: 0.35 },
    uSeed: { value: Math.random() * 50 },
    uDirtMap: { value: white() },
    uArch: { value: [-99, -99] },
    uArchR: { value: new THREE.Vector2(0.3, 0.36) },
    uDirtK: { value: chrome ? 0.45 : 1 },
    uRustK: { value: chrome ? 0.0 : 1 },
    uDents: { value: Array.from({ length: DENTS }, () => new THREE.Vector4(0, -99, 0, 0.2)) },
  };
  m.userData.u = u;
  m.userData.base = { metalness: m.metalness, roughness: m.roughness, clearcoat: m.clearcoat };
  m.customProgramCacheKey = () => 'gfPaint';
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uDent; uniform vec4 uDents[${DENTS}];
varying vec3 vObj; varying vec2 vGfUv;
${NOISE}`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
  float gfD = 0.0; vec3 gfG = vec3(0.0);
  for (int k = 0; k < ${DENTS}; k++) {
    vec4 c = uDents[k]; vec3 d = position - c.xyz; float r2 = c.w * c.w;
    float e = exp(-dot(d, d) / r2);
    gfD += e; gfG += -2.0 * d / r2 * e;
  }
  float gfCr = 0.75 + 0.5 * gfNoise(position * 11.0);
  float gfAmp = uDent * 0.05;
  vec3 gfT = gfG - dot(gfG, objectNormal) * objectNormal;
  objectNormal = normalize(objectNormal + gfT * gfAmp * gfCr);`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
  transformed -= normal * gfAmp * gfD * gfCr;
  vObj = transformed; vGfUv = uv;`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uRust; uniform float uDirt; uniform float uFade; uniform float uPrimer; uniform float uHi;
uniform float uSill; uniform float uSeed; uniform sampler2D uDirtMap; uniform float uArch[2]; uniform vec2 uArchR; uniform float uDirtK; uniform float uRustK;
varying vec3 vObj; varying vec2 vGfUv;
float gfRust = 0.0; float gfDirtA = 0.0; float gfBump = 0.0; float ring = 0.0;
${NOISE}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  {
    vec3 P = vObj;
    float low = 1.0 - smoothstep(uSill, uSill + 0.42, P.y);
    // близость к аркам колёс (там ржавеет первым)
    float arch = 0.0;
    for (int k = 0; k < 2; k++) {
      float ax = uArch[k];
      float d = length(vec2(P.x - ax, P.y - uArchR.x)) - uArchR.y;
      arch = max(arch, 1.0 - smoothstep(0.0, 0.22, d));
    }
    float rn = gfFbm(P * 5.5 + uSeed);
    float th = 1.0 - uRust * 0.95;
    float v = rn * 0.55 + (low * 0.5 + arch * 0.38) * uRustK + (1.0 - uRustK) * 0.3 + gfNoise(P * 27.0) * 0.07 + 0.05;
    gfRust = uRust < 0.01 ? 0.0 : smoothstep(th - 0.015, th + 0.015, v);
    ring = uRust < 0.01 ? 0.0 : smoothstep(th - 0.07, th - 0.015, v) - gfRust;
    // грунт новой детали и выгоревшая краска
    vec3 col = mix(diffuseColor.rgb, vec3(0.42, 0.44, 0.46), uPrimer);
    float g = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, mix(vec3(g), col, 0.45) * 0.92 + vec3(0.07, 0.065, 0.06), uFade * 0.8);
    // вздутая краска вокруг ржавчины
    col = mix(col, col * 0.62 + vec3(0.12, 0.08, 0.05), clamp(ring, 0.0, 1.0) * 0.85);
    float rv = gfFbm(P * 21.0 + 3.0);
    vec3 rustC = mix(vec3(0.16, 0.055, 0.025), vec3(0.48, 0.19, 0.06), rv);
    rustC = mix(rustC, vec3(0.62, 0.3, 0.1), smoothstep(0.62, 0.8, gfNoise(P * 47.0)) * 0.5);
    col = mix(col, rustC, gfRust);
    // грязь: тонкая плёнка, гуще снизу, брызги от колёс, потёки; маска стирается при мойке
    float dm = texture2D(uDirtMap, vGfUv).r;
    float streak = gfNoise(vec3(P.x * 22.0, P.y * 1.6, P.z * 22.0));
    float splash = smoothstep(0.55, 0.75, gfNoise(P * 38.0)) * (low * 0.8 + arch * 0.6);
    float film = 0.42 + low * 0.5 + arch * 0.25 + (streak - 0.5) * 0.25 + (gfFbm(P * 2.5) - 0.5) * 0.3;
    gfDirtA = clamp(uDirt * dm * (clamp(film, 0.0, 1.0) * 0.8 + splash * 0.4) * uDirtK, 0.0, 0.94);
    vec3 dirtC = mix(vec3(0.2, 0.17, 0.13), vec3(0.36, 0.31, 0.24), gfNoise(P * 11.0));
    col = mix(col, dirtC, gfDirtA);
    // подсветка выбранной детали
    col = mix(col, col + vec3(0.25, 0.18, 0.02), uHi);
    diffuseColor.rgb = col;
    gfBump = (gfFbm(P * 60.0) * 0.003 + gfNoise(P * 13.0) * 0.002) * gfRust + clamp(ring, 0.0, 1.0) * gfNoise(P * 70.0) * 0.0012 + gfNoise(P * 80.0) * 0.0005 * gfDirtA;
  }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor, 0.55, uPrimer);
  roughnessFactor = mix(roughnessFactor, 0.9, max(gfRust, gfDirtA));
  roughnessFactor = min(1.0, roughnessFactor + uFade * 0.25);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
  metalnessFactor = mix(metalnessFactor, 0.0, max(gfRust * 0.85, max(gfDirtA, uPrimer)));`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
  if (gfBump > 0.0) {
    vec3 sp = -vViewPosition;
    vec3 dpx = dFdx(sp), dpy = dFdy(sp);
    vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
    float det = dot(dpx, r1);
    vec2 dh = vec2(dFdx(gfBump), dFdy(gfBump));
    vec3 gr = sign(det) * (dh.x * r1 + dh.y * r2);
    normal = normalize(abs(det) * normal - gr);
  }`,
      )
      .replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>
  #ifdef USE_CLEARCOAT
  material.clearcoat *= (1.0 - max(gfRust, gfDirtA)) * (1.0 - uFade * 0.8) * (1.0 - uPrimer);
  #endif`,
      );
  };
  return m;
}

// состояние детали → униформы
export function setState(m, s) {
  const u = m.userData.u;
  if (!u) return;
  if (s.rust !== undefined) u.uRust.value = s.rust;
  if (s.dent !== undefined) u.uDent.value = s.dent;
  if (s.dirt !== undefined) u.uDirt.value = s.dirt;
  if (s.fade !== undefined) u.uFade.value = s.fade;
  if (s.primer !== undefined) u.uPrimer.value = s.primer;
  if (s.hi !== undefined) u.uHi.value = s.hi;
}

// маска грязи на всю машину (u — вдоль кузова, v — по кругу сечения); стирается кистью
export class DirtMask {
  constructor(w = 256, h = 128) {
    this.c = document.createElement('canvas');
    this.c.width = w;
    this.c.height = h;
    this.x = this.c.getContext('2d', { willReadFrequently: true });
    this.tex = new THREE.CanvasTexture(this.c);
    this.tex.colorSpace = THREE.NoColorSpace;
    this.reset();
  }
  reset() {
    this.x.globalCompositeOperation = 'source-over';
    this.x.fillStyle = '#fff';
    this.x.fillRect(0, 0, this.c.width, this.c.height);
    this.tex.needsUpdate = true;
  }
  // стереть пятно в точке uv, r — радиус в долях ширины; возвращает долю стёртого (примерно)
  rub(u, v, r = 0.035, k = 0.5) {
    const { x, c } = this;
    const px = u * c.width,
      py = (1 - v) * c.height;
    const R = r * c.width;
    const g = x.createRadialGradient(px, py, 0, px, py, R);
    g.addColorStop(0, `rgba(0,0,0,${k})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = g;
    x.beginPath();
    x.arc(px, py, R, 0, Math.PI * 2);
    x.fill();
    this.tex.needsUpdate = true;
  }
  // сколько грязи осталось (0..1), по сетке выборок
  left() {
    const { c, x } = this;
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let s = 0,
      n = 0;
    for (let i = 0; i < d.length; i += 4 * 37) {
      s += d[i];
      n++;
    }
    return s / n / 255;
  }
  toData() {
    return this.c.toDataURL('image/png');
  }
}
