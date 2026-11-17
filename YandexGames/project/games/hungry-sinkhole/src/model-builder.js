import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
export class B {
  constructor() {
    this.parts = [];
  }
  _add(g, col, tint, x, y, z, rx = 0, ry = 0, rz = 0) {
    if (rx || ry || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)));
    g.translate(x, y, z);
    g = g.index ? g.toNonIndexed() : g;
    g.deleteAttribute('uv');
    const n = g.attributes.position.count;
    const c = new THREE.Color(col);
    const ca = new Float32Array(n * 3);
    const ta = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      ca[i * 3] = c.r;
      ca[i * 3 + 1] = c.g;
      ca[i * 3 + 2] = c.b;
      ta[i] = tint;
    }
    g.setAttribute('color', new THREE.BufferAttribute(ca, 3));
    g.setAttribute('aTint', new THREE.BufferAttribute(ta, 1));
    this.parts.push(g);
    return this;
  }
  box(w, h, d, x, y, z, col, tint = 0, rx, ry, rz) {
    return this._add((Math.min(w,h,d)>.45 ? new RoundedBoxGeometry(w,h,d,1,Math.min(.08,Math.min(w,h,d)*.12)) : new THREE.BoxGeometry(w,h,d)), col, tint, x, y, z, rx, ry, rz);
  }
  cyl(rt, rb, h, x, y, z, col, tint = 0, seg = 10, rx, ry, rz) {
    return this._add(new THREE.CylinderGeometry(rt, rb, h, seg), col, tint, x, y, z, rx, ry, rz);
  }
  ball(r, x, y, z, col, tint = 0, sx = 1, sy = 1, sz = 1, seg = 10) {
    const g = new THREE.SphereGeometry(r, seg, Math.max(5, Math.round(seg * 0.7)));
    g.scale(sx, sy, sz);
    return this._add(g, col, tint, x, y, z);
  }
  cone(r, h, x, y, z, col, tint = 0, seg = 10, rx, ry, rz) {
    return this._add(new THREE.ConeGeometry(r, h, seg), col, tint, x, y, z, rx, ry, rz);
  }
  torus(r, t, x, y, z, col, tint = 0, rx = 0, ry = 0, rz = 0, seg = 12) {
    return this._add(new THREE.TorusGeometry(r, t, 5, seg), col, tint, x, y, z, rx, ry, rz);
  }
  raw(){return mergeGeometries(this.parts);}
  done(h) {
    const g = mergeGeometries(this.parts);
    g.computeBoundingBox();
    // Small rotated details must not sink below the ground (hay, anchors, swings).
    g.translate(0, -h / 2 - g.boundingBox.min.y, 0);
    g.computeBoundingSphere();
    g.userData.modelHeight=h;
    return g;
  }
}
