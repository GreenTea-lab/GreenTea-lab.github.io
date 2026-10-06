// Стенд для проверки моделей: студия с отражениями, ряд машин, разные состояния. Собирается в test/out/carlab.html
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildCar, setSpoiler } from '../src/car.js';
import { setState } from '../src/paint.js';
import { MODELS } from '../src/models.js';

const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
R.setPixelRatio(1);
R.setSize(innerWidth, innerHeight);
R.toneMapping = THREE.ACESFilmicToneMapping;
R.toneMappingExposure = 1.0;
R.shadowMap.enabled = true;
R.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(R.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x30343a);
const pm = new THREE.PMREMGenerator(R);
scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
const cam = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 100);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x8a8c90, roughness: 0.7 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(4, 9, 6);
sun.castShadow = true;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.5));

window.__lab = {
  show(opts) {
    for (const c of [...scene.children]) if (c.userData.car) scene.remove(c);
    const list = opts.cars;
    list.forEach((o, i) => {
      const car = buildCar(MODELS[o.model], o.look || {});
      car.root.position.set(o.x ?? 0, 0, o.z ?? 0);
      car.root.rotation.y = o.ry ?? 0;
      for (const k in car.mats) setState(car.mats[k], o.state?.[k] || o.state?.all || {});
      if (o.dents) for (const k in car.mats) {
        const u = car.mats[k].userData.u;
        const box = new THREE.Box3().setFromObject(car.panels[k]);
        const c = box.getCenter(new THREE.Vector3()).sub(car.root.position);
        u.uDents.value[0].set(c.x + car.shape.L / 2, c.y, c.z, 0.22);
      }
      if (o.only !== undefined) car.root.children.forEach((c, k) => (c.visible = o.only.includes(k)));
      if (o.hood && car.hoodPivot) car.hoodPivot.rotation.z = o.hood;
      if (o.spoiler) setSpoiler(car, o.spoiler);
      scene.add(car.root);
    });
    const envT = scene.userData.env || (scene.userData.env = scene.environment);
    scene.environment = opts.noEnv ? null : envT;
    const v = opts.cam;
    cam.position.set(...v.p);
    cam.lookAt(...v.t);
    cam.fov = v.fov || 32;
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
    R.render(scene, cam);
    return R.info.render.triangles;
  },
};
window.__lab.stats = (model) => {
  const car = buildCar(MODELS[model], {});
  const out = {};
  car.root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    const n = (g.index ? g.index.count : g.attributes.position.count) / 3;
    const k = o.userData.panel || o.parent?.type + ':' + (g.type || '');
    out[k] = (out[k] || 0) + n;
  });
  return Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, 14);
};
window.__lab.thin = (model) => {
  const car = buildCar(MODELS[model], {});
  car.root.updateMatrixWorld(true);
  const out = [];
  car.root.traverse((o) => {
    if (!o.isMesh) return;
    const b = new THREE.Box3().setFromObject(o);
    const s = b.getSize(new THREE.Vector3());
    const mx = Math.max(s.x, s.y, s.z);
    out.push([o.geometry.type, o.material.type, o.material.color && o.material.color.getHexString(), s.x.toFixed(2), s.y.toFixed(2), s.z.toFixed(2), b.min.x.toFixed(2), b.min.y.toFixed(2)]);
  });
  return out.filter((r) => r[0] !== 'BufferGeometry' || true).filter((r) => +r[3] > 0.9 || +r[4] > 0.9 || +r[5] > 1.4);
};
window.__lab.kids = (model) => {
  const car = buildCar(MODELS[model], {});
  return car.root.children.map((c, k) => {
    const b = new THREE.Box3().setFromObject(c);
    const s = b.getSize(new THREE.Vector3());
    let name = c.type;
    c.traverse((o) => o.isMesh && !name.includes(':') && (name += ':' + o.geometry.type));
    return [k, name, s.x.toFixed(2), s.y.toFixed(2), s.z.toFixed(2)];
  });
};
window.__lab.bodyKids = (model) => {
  const car = buildCar(MODELS[model], {});
  return car.body.children.map((c, k) => {
    const b = new THREE.Box3().setFromObject(c);
    let name = c.type + ':' + (c.userData.panel || '');
    c.traverse((o) => o.isMesh && (name += ':' + (o.userData.panel || o.material.type)));
    return [k, name.slice(0, 60), b.min.x.toFixed(2), b.max.x.toFixed(2), b.min.y.toFixed(2), b.max.y.toFixed(2)];
  });
};
