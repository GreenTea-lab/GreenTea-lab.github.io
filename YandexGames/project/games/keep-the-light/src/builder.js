// Сборщик статической геометрии: детали копятся по материалам и сливаются в несколько мешей
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const _c = new THREE.Color();

// UV по мировым размерам (текстура не растягивается на длинных деталях)
function boxUV(geo, s) {
  const p = geo.attributes.position,
    n = geo.attributes.normal,
    uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)),
      ay = Math.abs(n.getY(i)),
      az = Math.abs(n.getZ(i));
    let u, v;
    if (ax >= ay && ax >= az) (u = p.getZ(i)), (v = p.getY(i));
    else if (ay >= az) (u = p.getX(i)), (v = p.getZ(i));
    else (u = p.getX(i)), (v = p.getY(i));
    uv.setXY(i, u * s, v * s);
  }
}

function paint(geo, color) {
  _c.set(color);
  const n = geo.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) (a[i * 3] = _c.r), (a[i * 3 + 1] = _c.g), (a[i * 3 + 2] = _c.b);
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
}

export class Builder {
  constructor() {
    this.parts = {};
    this.m = new THREE.Matrix4();
    this.stack = [];
    this.boxes = []; // коллайдеры AABB {x0,z0,x1,z1,y1}
    this.spots = []; // места, куда можно положить ключ/батарейку
  }

  // локальная система координат: сдвиг + поворот вокруг Y
  push(x = 0, y = 0, z = 0, ry = 0) {
    this.stack.push(this.m.clone());
    const t = new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeRotationY(ry));
    this.m = this.m.clone().multiply(t);
  }
  pop() {
    this.m = this.stack.pop();
  }

  add(mat, geo, color, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    if (!geo.index) geo = geo; // все примитивы three индексированные
    paint(geo, color);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    geo.applyMatrix4(this.m.clone().multiply(m));
    (this.parts[mat] ||= []).push(geo);
    return geo;
  }

  box(mat, color, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0, uvs = 1) {
    const g = new THREE.BoxGeometry(w, h, d);
    boxUV(g, uvs);
    return this.add(mat, g, color, x, y, z, rx, ry, rz);
  }
  // коробка, стоящая на y (низ на y)
  boxOn(mat, color, w, h, d, x, y, z, ry = 0) {
    return this.box(mat, color, w, h, d, x, y + h / 2, z, ry);
  }
  cyl(mat, color, rt, rb, h, seg, x, y, z, rx = 0, ry = 0, rz = 0) {
    return this.add(mat, new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y, z, rx, ry, rz);
  }
  sphere(mat, color, r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 10) {
    return this.add(mat, new THREE.SphereGeometry(r, seg, Math.max(6, seg - 2)), color, x, y, z, 0, 0, 0, sx, sy, sz);
  }
  torus(mat, color, r, t, x, y, z, rx = 0, ry = 0, rz = 0, arc = Math.PI * 2) {
    return this.add(mat, new THREE.TorusGeometry(r, t, 6, 16, arc), color, x, y, z, rx, ry, rz);
  }
  plane(mat, color, w, h, x, y, z, rx = 0, ry = 0, rz = 0, uvs = 0) {
    const g = new THREE.PlaneGeometry(w, h);
    if (uvs) {
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * uvs, uv.getY(i) * h * uvs);
    }
    return this.add(mat, g, color, x, y, z, rx, ry, rz);
  }

  // точка в мировых координатах из локальной
  world(x, y, z) {
    return new THREE.Vector3(x, y, z).applyMatrix4(this.m);
  }
  // коллайдер в локальных координатах
  collide(x0, z0, x1, z1, y1 = 2) {
    const a = this.world(x0, 0, z0),
      b = this.world(x1, 0, z1);
    this.boxes.push({ x0: Math.min(a.x, b.x), z0: Math.min(a.z, b.z), x1: Math.max(a.x, b.x), z1: Math.max(a.z, b.z), y1 });
  }
  spot(x, y, z, kind = 'any') {
    const p = this.world(x, y, z);
    this.spots.push({ x: p.x, y: p.y, z: p.z, kind });
  }

  // слить по материалам
  build(mats, parent) {
    const meshes = [];
    for (const k in this.parts) {
      const list = this.parts[k];
      if (!list.length) continue;
      const geo = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(geo, mats[k]);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.parts = {};
    return meshes;
  }
}
