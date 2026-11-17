// Отладка: галерея моделей крупным планом (только в режиме __SM_DEBUG)
import * as THREE from 'three';
import { makeCar, makeHero, makeStaff, makeCustomer, makeZombie, animZombie, animPerson } from './models.js';

// spec: 'hero' | 'staff:cashier' | 'cust:11' | 'zombie:walker' | 'car:sedan'
function build(spec) {
  const [k, a] = spec.split(':');
  if (k === 'hero') return makeHero();
  if (k === 'staff') return makeStaff(a, 77);
  if (k === 'cust') return makeCustomer(+a);
  if (k === 'zombie') {
    const z = makeZombie(a, 5);
    animZombie(z, 0.3, false, {});
    return z;
  }
  const cols = { sedan: '#e8705a', hatch: '#5aa8e0', van: '#f2e6c8', pickup: '#7cc06a' };
  return makeCar(a, cols[a] || '#e8705a').mesh();
}

export function galleryRender(renderer, specs, view) {
  const sc = new THREE.Scene();
  sc.background = new THREE.Color('#c8dcec');
  sc.add(new THREE.HemisphereLight('#ffffff', '#8a8a80', 1.4));
  const d = new THREE.DirectionalLight('#ffffff', 2.2);
  d.position.set(4, 8, 6);
  sc.add(d);
  const cars = specs[0].startsWith('car');
  const gap = cars ? 5.6 : 1.1;
  specs.forEach((sp, k) => {
    const m = build(sp);
    m.position.x = (k - (specs.length - 1) / 2) * gap;
    if (m.userData.legs && !m.userData.type) animPerson(m, 0.2, 0, {});
    sc.add(m);
  });
  const W = (specs.length - 1) * gap + (cars ? 5.5 : 1.2);
  const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 200);
  const R = Math.max(W / (2 * Math.tan((15 * Math.PI) / 180) * cam.aspect), cars ? 8 : 3.2) * 1.08;
  const cy = cars ? 0.8 : 0.75;
  const dir = new THREE.Vector3(...view).normalize();
  cam.position.set(dir.x * R, cy + dir.y * R, dir.z * R);
  cam.lookAt(0, cy, 0);
  renderer.setAnimationLoop(null);
  renderer.render(sc, cam);
}
