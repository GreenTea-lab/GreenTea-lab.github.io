// Стенд: гараж + машина в разных состояниях
import * as THREE from 'three';
import { Garage } from '../src/garage.js';
import { buildCar, setSpoiler } from '../src/car.js';
import { setState } from '../src/paint.js';
import { MODELS } from '../src/models.js';
const cv = document.createElement('canvas');
document.body.appendChild(cv);
const G = new Garage(cv, { preserve: true });
G.resize(innerWidth, innerHeight);
window.__lab = {
  show(o) {
    const car = buildCar(MODELS[o.model], o.look || {});
    for (const k in car.mats) setState(car.mats[k], o.state?.[k] || o.state?.all || {});
    if (o.dents) for (const k of o.dents) {
      const u = car.mats[k].userData.u;
      const b = new THREE.Box3().setFromObject(car.panels[k]);
      const c = b.getCenter(new THREE.Vector3());
      u.uDents.value[0].set(c.x + car.shape.L / 2, c.y, c.z, 0.2);
      u.uDents.value[1].set(c.x + car.shape.L / 2 + 0.25, c.y - 0.08, c.z, 0.14);
    }
    if (o.hood && car.hoodPivot) car.hoodPivot.rotation.z = o.hood;
    if (o.spoiler) setSpoiler(car, o.spoiler);
    G.setCar(car);
    if (o.sphere) {
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 48, 32), new THREE.MeshPhysicalMaterial({ color: 0xc0392b, metalness: 0.05, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03 }));
      sp.position.set(2.6, 0.6, 1.2);
      const sp2 = new THREE.Mesh(new THREE.SphereGeometry(0.4, 48, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.0 }));
      sp2.position.set(2.6, 0.6, 0.2);
      G.scene.add(sp, sp2);
    }
    if (o.lift) { G.setLift(o.lift); G.liftH = o.lift; }
    Object.assign(G.view, o.view || {}, { auto: false });
    for (const k of ['yaw', 'pitch', 'dist']) if (o.view && o.view[k] !== undefined) G.view['t' + k] = o.view[k];
    G.update(0.016);
    G.render();
    return G.renderer.info.render.calls + ' calls ' + G.renderer.info.render.triangles + ' tris';
  },
};
