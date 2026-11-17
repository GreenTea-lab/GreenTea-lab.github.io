import * as THREE from 'three';
import { BUILD_MODELS, DECOR_MODELS, person, balloon, cloud, millBlades, airship, scaffold } from '../../src/models.js';
const q = new URLSearchParams(location.search);
const what = q.get('w') || 'build';
const W = 1600, H = 900;
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(W, H);
r.shadowMap.enabled = true;
r.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(r.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe3f7);
scene.add(new THREE.HemisphereLight(0xfdf6ff, 0x8fb0c9, 1.6));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
sun.position.set(-8, 14, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 });
scene.add(sun);
const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
const items = [];
if (what === 'build') {
  for (const [k, f] of Object.entries(BUILD_MODELS)) items.push([f(1), f(4), f(7), f(10)]);
} else {
  const row = [];
  for (const [k, f] of Object.entries(DECOR_MODELS)) row.push(f(0));
  for (let i = 0; i < row.length; i += 6) items.push(row.slice(i, i + 6));
  items.push([person(0xf28fb0), person(0x78a6e3), balloon(), cloud(3), scaffold(12), airship(1)]);
}
// каждая строка items — отдельная плитка со своей камерой
const tilesX = 4, tw = W / tilesX, th = 225;
r.setScissorTest(true);
r.setClearColor(0xbfe3f7);
items.forEach((row, ri) => {
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xfdf6ff, 0x8fb0c9, 1.6));
  const sn = new THREE.DirectionalLight(0xfff1dc, 2.2);
  sn.position.set(-6, 12, 9);
  sn.castShadow = true;
  sn.shadow.mapSize.set(1024, 1024);
  Object.assign(sn.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
  sc.add(sn);
  const gr = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 4), new THREE.MeshLambertMaterial({ color: 0x8fd16a }));
  gr.position.set(row.length * 0.75 - 0.75, -0.1, 0);
  gr.receiveShadow = true;
  sc.add(gr);
  row.forEach((v, ci) => {
    const { geo, glow } = v.build(1 / 12, 6, 6);
    const g = new THREE.Group();
    if (geo) { const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; g.add(m); }
    if (glow) g.add(new THREE.Mesh(glow, glowMat));
    g.position.set(ci * 1.5, 0, 0);
    sc.add(g);
  });
  const cx = row.length * 0.75 - 0.75;
  const cam = new THREE.PerspectiveCamera(30, tw / th, 0.1, 100);
  cam.position.set(cx + 1.5, 3.2, 6.5 + row.length * 0.3);
  cam.lookAt(cx, 1.0, 0);
  const x = (ri % tilesX) * tw, y = H - (Math.floor(ri / tilesX) + 1) * th;
  r.setViewport(x, y, tw, th);
  r.setScissor(x, y, tw, th);
  r.render(sc, cam);
});
document.title = 'done';
