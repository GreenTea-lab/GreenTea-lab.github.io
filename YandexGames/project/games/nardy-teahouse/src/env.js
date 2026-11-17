// Окружение: стол, ковёр, чай, фрукты, сладости, фонари, стена чайханы с арками
import * as THREE from 'three';
import { TeapotGeometry } from 'three/examples/jsm/geometries/TeapotGeometry.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { woodCanvas, carpetCanvas, wallCanvas, canvas, rng, rosette } from './textures.js';

const tex = (c, rep) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (rep) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep[0], rep[1]);
  }
  return t;
};
const std = (o) => new THREE.MeshStandardMaterial(o);
const lathe = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);

function shadowAll(o, cast = true, recv = true) {
  o.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = cast;
      m.receiveShadow = recv;
    }
  });
  return o;
}

// стакан-армуду с чаем на блюдце
function teaGlass() {
  const g = new THREE.Group();
  const saucer = new THREE.Mesh(lathe([[0, 0], [0.9, 0], [1.05, 0.05], [1.12, 0.13], [1.08, 0.15], [0.95, 0.08], [0, 0.08]], 40), std({ color: '#f4efe6', roughness: 0.25 }));
  g.add(saucer);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.025, 6, 48), std({ color: '#d9a64a', metalness: 0.9, roughness: 0.3 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.14;
  g.add(rim);
  const prof = [[0, 0.1], [0.36, 0.1], [0.42, 0.18], [0.5, 0.45], [0.4, 0.75], [0.38, 0.9], [0.45, 1.2], [0.5, 1.4]];
  const glass = new THREE.Mesh(lathe(prof, 36), std({ color: '#ffffff', transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
  g.add(glass);
  const tea = new THREE.Mesh(lathe([[0, 0.14], [0.33, 0.14], [0.39, 0.2], [0.46, 0.45], [0.37, 0.75], [0.36, 0.9], [0.41, 1.12], [0, 1.12]], 32), std({ color: '#a8380e', roughness: 0.15, transparent: true, opacity: 0.9, emissive: '#4a1000', emissiveIntensity: 0.4 }));
  g.add(tea);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 6, 36), std({ color: '#e7b54e', metalness: 0.9, roughness: 0.25 }));
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 1.4;
  g.add(lip);
  // ложечка
  const sp = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.1, 8), std({ color: '#cfd4da', metalness: 0.95, roughness: 0.25 }));
  handle.rotation.z = Math.PI / 2;
  sp.add(handle);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), std({ color: '#cfd4da', metalness: 0.95, roughness: 0.25 }));
  bowl.scale.set(1.4, 0.35, 1);
  bowl.position.x = 0.6;
  sp.add(bowl);
  sp.position.set(0.2, 0.17, 0.72);
  sp.rotation.y = 0.5;
  g.add(sp);
  // кусочки сахара
  for (let i = 0; i < 2; i++) {
    const s = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.16, 0.2, 2, 0.03), std({ color: '#fbf8f0', roughness: 0.9 }));
    s.position.set(-0.7 + i * 0.22, 0.17, 0.35 - i * 0.1);
    s.rotation.y = i * 0.6;
    g.add(s);
  }
  return shadowAll(g);
}

// фарфоровый чайник с синим узором
function teapot() {
  const c = canvas(512, 256);
  const x = c.getContext('2d');
  x.fillStyle = '#f7f3ea';
  x.fillRect(0, 0, 512, 256);
  x.strokeStyle = '#1d4f9a';
  x.fillStyle = '#2a63b8';
  x.lineWidth = 3;
  for (let i = 0; i < 8; i++) rosette(x, 32 + i * 64, 128, 22, 6, '#2a63b8', '#123a78', 2);
  x.fillRect(0, 60, 512, 8);
  x.fillRect(0, 190, 512, 8);
  for (let i = 0; i < 16; i++) {
    x.beginPath();
    x.arc(16 + i * 32, 40, 8, 0, Math.PI * 2);
    x.stroke();
    x.beginPath();
    x.arc(16 + i * 32, 216, 8, 0, Math.PI * 2);
    x.stroke();
  }
  const m = std({ map: tex(c), roughness: 0.18, metalness: 0.0 });
  const pot = new THREE.Mesh(new TeapotGeometry(1, 10, true, true, true, true, true), m);
  pot.position.y = 0.78;
  const g = new THREE.Group();
  g.add(pot);
  const stand = new THREE.Mesh(lathe([[0, 0], [0.95, 0], [1.05, 0.08], [0.9, 0.12], [0, 0.12]], 32), std({ color: '#c99a3e', metalness: 0.85, roughness: 0.3 }));
  g.add(stand);
  return shadowAll(g);
}

// медная чаша с гранатами и виноградом
function fruitBowl() {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(
    lathe([[0, 0], [0.6, 0], [0.7, 0.1], [1.5, 0.55], [1.8, 0.95], [1.86, 1.0], [1.78, 1.0], [1.45, 0.65], [0.6, 0.2], [0, 0.2]], 48),
    std({ color: '#c0703a', metalness: 0.85, roughness: 0.32, side: THREE.DoubleSide })
  );
  g.add(bowl);
  const R = rng(9);
  const pomMat = std({ color: '#b0182a', roughness: 0.45 });
  const pom = (x, z, s, ry) => {
    const p = new THREE.Group();
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), pomMat);
    b.scale.set(1, 0.92, 1);
    p.add(b);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.2, 6, 1, true), std({ color: '#7a1420', roughness: 0.6, side: THREE.DoubleSide }));
    crown.position.y = 0.55;
    p.add(crown);
    p.position.set(x, 0.85, z);
    p.scale.setScalar(s);
    p.rotation.set(0.3, ry, 0.2);
    g.add(p);
  };
  pom(-0.45, 0.2, 1, 0.3);
  pom(0.55, -0.25, 0.95, 1.2);
  pom(0.15, 0.6, 0.85, 2.2);
  // виноград
  const gm = std({ color: '#4b2a5c', roughness: 0.3 });
  const gg = new THREE.SphereGeometry(0.14, 12, 8);
  const grapes = new THREE.InstancedMesh(gg, gm, 26);
  const mt = new THREE.Matrix4();
  for (let i = 0; i < 26; i++) {
    const lvl = Math.floor(i / 6);
    const a = (i % 6) / 6 * Math.PI * 2 + lvl;
    const r = 0.3 - lvl * 0.06;
    mt.makeTranslation(-0.6 + Math.cos(a) * r, 1.25 - lvl * 0.13 + R() * 0.03, -0.55 + Math.sin(a) * r + lvl * 0.12);
    grapes.setMatrixAt(i, mt);
  }
  g.add(grapes);
  // абрикосы
  const am = std({ color: '#f29a2e', roughness: 0.6 });
  for (const [x, z] of [[0.9, 0.45], [-0.15, -0.75]]) {
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), am);
    a.position.set(x, 0.9, z);
    g.add(a);
  }
  return shadowAll(g);
}

// тарелка с пахлавой
function baklavaPlate() {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(lathe([[0, 0], [1.1, 0], [1.5, 0.12], [1.62, 0.18], [1.55, 0.2], [1.1, 0.08], [0, 0.08]], 40), std({ color: '#f5f0e6', roughness: 0.2 }));
  g.add(plate);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.03, 6, 48), std({ color: '#1f5fa8', roughness: 0.3 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.15;
  g.add(ring);
  // ромбики пахлавы: слои теста и орехи сверху
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.5);
  shape.lineTo(0.32, 0);
  shape.lineTo(0, 0.5);
  shape.lineTo(-0.32, 0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
  geo.rotateX(-Math.PI / 2);
  const dough = std({ color: '#d99a3c', roughness: 0.45 });
  const nut = std({ color: '#5f8a2e', roughness: 0.8 });
  const pos = [[0, 0], [0.62, 0.05], [-0.62, 0.05], [0.3, -0.62], [-0.3, -0.62], [0.3, 0.68], [-0.3, 0.68]];
  pos.forEach(([x, z], i) => {
    const b = new THREE.Mesh(geo, dough);
    b.position.set(x, 0.08, z);
    b.rotation.y = 0.1;
    g.add(b);
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), nut);
    n.position.set(x + 0.02, 0.36, z - 0.03);
    n.scale.set(1, 0.5, 1);
    g.add(n);
    if (i % 2) {
      const n2 = n.clone();
      n2.position.x -= 0.08;
      n2.position.z += 0.1;
      g.add(n2);
    }
  });
  return shadowAll(g);
}

// латунный фонарь с цветными стёклами
function lantern(withLight) {
  const g = new THREE.Group();
  const brass = std({ color: '#c9973c', metalness: 0.9, roughness: 0.3 });
  const base = new THREE.Mesh(lathe([[0, 0], [0.7, 0], [0.75, 0.1], [0.6, 0.2], [0, 0.2]], 8), brass);
  g.add(base);
  const glassCols = ['#ff8a3a', '#e0453a', '#3aa0a8', '#ffc040', '#c0458a', '#4a8a3a'];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.3), std({ color: glassCols[i], emissive: glassCols[i], emissiveIntensity: 1.1, transparent: true, opacity: 0.8, side: THREE.DoubleSide, roughness: 0.2 }));
    pane.position.set(Math.sin(a) * 0.52, 0.9, Math.cos(a) * 0.52);
    pane.rotation.y = a;
    g.add(pane);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), brass);
    const a2 = a + Math.PI / 6;
    rod.position.set(Math.sin(a2) * 0.6, 0.9, Math.cos(a2) * 0.6);
    g.add(rod);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.7, 6), brass);
  roof.position.y = 1.9;
  roof.rotation.y = Math.PI / 6;
  g.add(roof);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), brass);
  knob.position.y = 2.3;
  g.add(knob);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 6, 16), brass);
  ring.position.y = 2.48;
  g.add(ring);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffd27a' }));
  flame.scale.set(1, 1.6, 1);
  flame.position.y = 0.6;
  g.add(flame);
  g.userData.flame = flame;
  if (withLight) {
    const l = new THREE.PointLight('#ff9a3c', 14, 22, 1.6);
    l.position.y = 0.9;
    g.add(l);
    g.userData.light = l;
  }
  shadowAll(g, true, false);
  flame.castShadow = false;
  return g;
}

// подушка-валик на скамье
function cushion(col, col2) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new RoundedBoxGeometry(4, 1.2, 2.4, 4, 0.5), std({ color: col, roughness: 0.85 }));
  g.add(m);
  const band = new THREE.Mesh(new RoundedBoxGeometry(4.04, 0.3, 2.44, 2, 0.12), std({ color: col2, roughness: 0.7 }));
  band.position.y = 0.05;
  g.add(band);
  return shadowAll(g);
}

export function buildEnv(scene, quality) {
  const env = new THREE.Group();
  scene.add(env);
  // стол
  const tableTex = tex(woodCanvas(1024, 512, ['#4a2a18', '#2a160b', '#6a4026'], 21, { sx: 0.003, sy: 0.02 }), [2, 2]);
  const table = new THREE.Mesh(new RoundedBoxGeometry(40, 1.4, 28, 3, 0.35), std({ map: tableTex, roughness: 0.55 }));
  table.position.y = -0.7;
  table.receiveShadow = true;
  env.add(table);
  // ковёр под доской
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(27, 18.5), std({ map: tex(carpetCanvas()), roughness: 0.95 }));
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.y = 0.012;
  carpet.receiveShadow = true;
  env.add(carpet);
  // бахрома
  const fr = canvas(256, 32);
  const fx = fr.getContext('2d');
  for (let i = 0; i < 64; i++) {
    fx.fillStyle = i % 2 ? '#e8d3a0' : '#d9bf86';
    fx.fillRect(i * 4, 0, 2.4, 28 + (i % 3));
  }
  const fringeMat = new THREE.MeshStandardMaterial({ map: tex(fr, [10, 1]), transparent: true, alphaTest: 0.3, roughness: 1 });
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(18.5, 0.7), fringeMat);
    f.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    f.position.set(s * 13.85, 0.014, 0);
    env.add(f);
  }
  // посуда и угощения
  const g1 = teaGlass();
  g1.position.set(11.4, 0, 5.2);
  env.add(g1);
  const g2 = teaGlass();
  g2.position.set(-11.2, 0, -5.6);
  g2.rotation.y = 2;
  env.add(g2);
  const pot = teapot();
  pot.position.set(-12.2, 0, 2.2);
  pot.rotation.y = 0.6;
  pot.scale.setScalar(1.25);
  env.add(pot);
  const bowl = fruitBowl();
  bowl.position.set(12.4, 0, -4.8);
  bowl.scale.setScalar(1.2);
  env.add(bowl);
  const pl = baklavaPlate();
  pl.position.set(-10.8, 0, 7.6);
  pl.scale.setScalar(1.1);
  env.add(pl);
  const lamp = lantern(true);
  lamp.position.set(15.5, 0, -9);
  lamp.scale.setScalar(1.5);
  env.add(lamp);
  // стена с арками
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(72, 36), new THREE.MeshStandardMaterial({ map: tex(wallCanvas()), roughness: 0.95 }));
  wall.position.set(0, 9, -34);
  env.add(wall);
  // пол и скамья с подушками за столом
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), std({ color: '#3a2116', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -9;
  env.add(floor);
  const bench = new THREE.Mesh(new RoundedBoxGeometry(46, 2.5, 6, 2, 0.4), std({ map: tableTex, roughness: 0.7 }));
  bench.position.set(0, -5, -30);
  env.add(bench);
  const cols = [['#8f2428', '#e3b453'], ['#1f5c6b', '#e3b453'], ['#c4692a', '#2d1a3a'], ['#2d1a3a', '#d9a64a'], ['#8f2428', '#1f5c6b']];
  cols.forEach(([a, b], i) => {
    const c = cushion(a, b);
    c.position.set(-18 + i * 9, -2.4, -31);
    c.rotation.set(-0.35, i % 2 ? 0.08 : -0.06, 0);
    env.add(c);
  });
  // подвесные фонари у стены
  const hang = [];
  for (const [x, y, z] of [[-16, 5, -26], [0, 7, -28], [16, 5, -26]]) {
    const l = lantern(false);
    l.position.set(x, y, z);
    l.scale.setScalar(1.6);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 12, 4), std({ color: '#5a4020', metalness: 0.7, roughness: 0.4 }));
    chain.position.y = 2.5 + 6;
    l.add(chain);
    env.add(l);
    hang.push(l);
  }
  env.userData = { lamp, hang };
  return env;
}
