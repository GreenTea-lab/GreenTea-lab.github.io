// 3D-гараж: помещение (бетонный пол с разметкой, кирпичная стена, рольворота), светодиодные лампы
// на потолке (их отражения бегут по краске), подъёмник, верстак, тележка с инструментами, стеллажи,
// шины, неоновая вывеска. Окружение для отражений рендерится из упрощённой копии гаража.
// Камера облетает машину; есть выбор детали лучом, отмывка, искры и пена.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const RW = 7.5,
  RD = 6,
  RH = 4.2; // половина ширины, половина глубины, высота комнаты

// ---------- процедурные текстуры ----------
function ctex(w, h, draw, srgb = true, rep) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (rep) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep[0], rep[1]);
  }
  return t;
}
const rnd = (() => {
  let s = 12345;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
})();

function floorTex(sign) {
  return ctex(1024, 1024, (x, w, h) => {
    x.fillStyle = '#7a7e84';
    x.fillRect(0, 0, w, h);
    // пятна бетона
    for (let i = 0; i < 1400; i++) {
      const r = 4 + rnd() * 40;
      x.fillStyle = `rgba(${rnd() < 0.5 ? '40,42,46' : '170,172,176'},${0.02 + rnd() * 0.05})`;
      x.beginPath();
      x.arc(rnd() * w, rnd() * h, r, 0, Math.PI * 2);
      x.fill();
    }
    // масляные пятна
    for (let i = 0; i < 9; i++) {
      const cx = w * (0.3 + rnd() * 0.4),
        cy = h * (0.3 + rnd() * 0.4),
        r = 20 + rnd() * 50;
      const g = x.createRadialGradient(cx, cy, 2, cx, cy, r);
      g.addColorStop(0, 'rgba(20,20,24,.35)');
      g.addColorStop(1, 'rgba(20,20,24,0)');
      x.fillStyle = g;
      x.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    // плиты пола
    x.strokeStyle = 'rgba(30,32,36,.5)';
    x.lineWidth = 2;
    for (let k = 1; k < 4; k++) {
      x.beginPath();
      x.moveTo((k * w) / 4, 0);
      x.lineTo((k * w) / 4, h);
      x.moveTo(0, (k * h) / 4);
      x.lineTo(w, (k * h) / 4);
      x.stroke();
    }
    // жёлтая разметка зоны подъёмника
    const bx = w * 0.18,
      by = h * 0.3,
      bw = w * 0.64,
      bh = h * 0.4;
    x.strokeStyle = '#e8b520';
    x.lineWidth = 12;
    x.strokeRect(bx, by, bw, bh);
    // зебра у края
    x.save();
    x.beginPath();
    x.rect(bx, by + bh + 14, bw, 26);
    x.clip();
    for (let k = -2; k < 40; k++) {
      x.fillStyle = k % 2 ? '#e8b520' : '#2a2a2e';
      x.beginPath();
      x.moveTo(bx + k * 26, by + bh + 14);
      x.lineTo(bx + k * 26 + 26, by + bh + 14);
      x.lineTo(bx + k * 26 + 0, by + bh + 40);
      x.lineTo(bx + k * 26 - 26, by + bh + 40);
      x.fill();
    }
    x.restore();
    // потёртости разметки
    for (let i = 0; i < 300; i++) {
      x.fillStyle = 'rgba(122,126,132,.6)';
      x.fillRect(bx + rnd() * bw, rnd() < 0.5 ? by - 6 + rnd() * 12 : by + bh - 6 + rnd() * 12, 3 + rnd() * 8, 2 + rnd() * 4);
    }
    // решётка слива
    x.fillStyle = '#3a3c40';
    x.fillRect(w * 0.47, h * 0.84, w * 0.06, h * 0.03);
    x.strokeStyle = '#1a1a1e';
    x.lineWidth = 2;
    for (let k = 0; k < 10; k++) {
      x.beginPath();
      x.moveTo(w * 0.47 + k * w * 0.006, h * 0.84);
      x.lineTo(w * 0.47 + k * w * 0.006, h * 0.87);
      x.stroke();
    }
  });
}
function roughTex() {
  return ctex(
    256,
    256,
    (x, w, h) => {
      x.fillStyle = '#909090';
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) {
        const v = 100 + rnd() * 110;
        x.fillStyle = `rgba(${v},${v},${v},.25)`;
        x.beginPath();
        x.arc(rnd() * w, rnd() * h, 2 + rnd() * 14, 0, Math.PI * 2);
        x.fill();
      }
    },
    false,
  );
}
function brickTex() {
  return ctex(
    512,
    512,
    (x, w, h) => {
      x.fillStyle = '#8a8478';
      x.fillRect(0, 0, w, h);
      const bh = 32,
        bw = 96;
      for (let r = 0; r < h / bh; r++)
        for (let c = -1; c < w / bw + 1; c++) {
          const ox = r % 2 ? bw / 2 : 0;
          const t = rnd();
          const R = 150 + t * 40,
            G = 70 + t * 30,
            B = 50 + t * 20;
          x.fillStyle = `rgb(${R},${G},${B})`;
          x.fillRect(c * bw + ox + 3, r * bh + 3, bw - 6, bh - 6);
          x.fillStyle = 'rgba(0,0,0,.08)';
          x.fillRect(c * bw + ox + 3, r * bh + bh - 9, bw - 6, 6);
          for (let k = 0; k < 6; k++) {
            x.fillStyle = `rgba(${rnd() < 0.5 ? '255,230,210' : '60,30,20'},.08)`;
            x.fillRect(c * bw + ox + 3 + rnd() * (bw - 12), r * bh + 3 + rnd() * (bh - 12), 6, 4);
          }
        }
      // покраска нижней части стены
    },
    true,
    [3, 1.3],
  );
}
function panelTex(color) {
  return ctex(
    256,
    256,
    (x, w, h) => {
      x.fillStyle = color;
      x.fillRect(0, 0, w, h);
      for (let k = 0; k < 8; k++) {
        const g = x.createLinearGradient((k * w) / 8, 0, ((k + 1) * w) / 8, 0);
        g.addColorStop(0, 'rgba(0,0,0,.18)');
        g.addColorStop(0.15, 'rgba(255,255,255,.08)');
        g.addColorStop(0.5, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(0,0,0,.12)');
        x.fillStyle = g;
        x.fillRect((k * w) / 8, 0, w / 8, h);
      }
    },
    true,
    [4, 1],
  );
}
function doorTex() {
  return ctex(
    256,
    512,
    (x, w, h) => {
      x.fillStyle = '#b8bcc2';
      x.fillRect(0, 0, w, h);
      for (let k = 0; k < 32; k++) {
        const y = (k * h) / 32;
        const g = x.createLinearGradient(0, y, 0, y + h / 32);
        g.addColorStop(0, '#e8ecf0');
        g.addColorStop(0.5, '#a8acb2');
        g.addColorStop(1, '#6a6e74');
        x.fillStyle = g;
        x.fillRect(0, y, w, h / 32);
      }
    },
    true,
  );
}
function pegTex() {
  return ctex(
    512,
    256,
    (x, w, h) => {
      x.fillStyle = '#c8a878';
      x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(60,40,20,.7)';
      for (let i = 8; i < w; i += 16)
        for (let j = 8; j < h; j += 16) {
          x.beginPath();
          x.arc(i, j, 2.4, 0, Math.PI * 2);
          x.fill();
        }
      // силуэты инструментов
      const tool = (cx, cy, len, ang, kind) => {
        x.save();
        x.translate(cx, cy);
        x.rotate(ang);
        const g = x.createLinearGradient(-6, 0, 6, 0);
        g.addColorStop(0, '#7a8088');
        g.addColorStop(0.5, '#e8ecf0');
        g.addColorStop(1, '#6a7078');
        x.fillStyle = g;
        if (kind === 0) {
          x.fillRect(-4, -len / 2, 8, len);
          x.beginPath();
          x.arc(0, -len / 2, 10, 0, Math.PI * 2);
          x.arc(0, len / 2, 8, 0, Math.PI * 2);
          x.fill();
          x.fillStyle = '#c8a878';
          x.fillRect(-4, -len / 2 - 12, 8, 10);
        } else if (kind === 1) {
          x.fillStyle = '#d02a2a';
          x.fillRect(-6, 0, 12, len * 0.55);
          x.fillStyle = g;
          x.fillRect(-2, -len * 0.45, 4, len * 0.45);
        } else {
          x.fillStyle = '#1a1a1e';
          x.fillRect(-5, 0, 10, len * 0.4);
          x.fillStyle = g;
          x.fillRect(-7, -len * 0.5, 14, len * 0.5);
        }
        x.restore();
      };
      for (let k = 0; k < 9; k++) tool(40 + k * 22, 90, 80 + k * 6, 0, 0);
      for (let k = 0; k < 6; k++) tool(270 + k * 26, 80, 100, 0, 1);
      for (let k = 0; k < 4; k++) tool(430 + k * 20, 90, 90, 0, 2);
      x.strokeStyle = '#2a2a2e';
      x.lineWidth = 3;
      for (let k = 0; k < 3; k++) {
        x.beginPath();
        x.arc(80 + k * 120, 200, 22, 0, Math.PI * 2);
        x.stroke();
      }
    },
    true,
  );
}
function neonTex(text) {
  return ctex(1024, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.font = '900 150px Unbounded, Impact, Arial Black, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.shadowColor = '#ff2a6a';
    x.shadowBlur = 40;
    x.fillStyle = '#ff5a8a';
    x.fillText(text, w / 2, h / 2);
    x.shadowBlur = 12;
    x.fillStyle = '#ffd0e0';
    x.fillText(text, w / 2, h / 2);
  });
}
function posterTex(kind) {
  return ctex(256, 360, (x, w, h) => {
    if (kind === 0) {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#1a3a6a');
      g.addColorStop(1, '#e85a2a');
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#ffd23a';
      x.beginPath();
      x.arc(w / 2, h * 0.45, 70, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#111';
      x.fillRect(30, h * 0.55, w - 60, 40);
      x.beginPath();
      x.arc(70, h * 0.68, 22, 0, Math.PI * 2);
      x.arc(w - 70, h * 0.68, 22, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#fff';
      x.font = '900 34px Arial Black, sans-serif';
      x.textAlign = 'center';
      x.fillText('RACING', w / 2, 60);
    } else {
      x.fillStyle = '#f2ead8';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#c8302a';
      x.fillRect(0, 0, w, 70);
      x.fillStyle = '#fff';
      x.font = '900 40px Arial Black, sans-serif';
      x.textAlign = 'center';
      x.fillText('MOTOR OIL', w / 2, 50);
      x.fillStyle = '#2a2a2e';
      x.fillRect(w / 2 - 50, 110, 100, 170);
      x.fillStyle = '#ffd23a';
      x.fillRect(w / 2 - 50, 160, 100, 60);
      x.fillStyle = '#2a2a2e';
      x.fillRect(w / 2 - 20, 90, 40, 24);
    }
  });
}

// ---------- гараж ----------
export class Garage {
  constructor(canvas, o = {}) {
    this.q = o.quality || 'high';
    const R = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!o.preserve }));
    R.setPixelRatio(Math.min(devicePixelRatio || 1, this.q === 'low' ? 1 : o.mobile ? 1.5 : 2));
    R.toneMapping = THREE.NeutralToneMapping;
    R.toneMappingExposure = 1.0;
    R.outputColorSpace = THREE.SRGBColorSpace;
    R.shadowMap.enabled = this.q !== 'low';
    R.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x15161a);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
    this.view = { yaw: 0.75, pitch: 0.22, dist: 6.4, ty: 0.75, tx: 0, tyaw: 0.75, tpitch: 0.22, tdist: 6.4, auto: true };
    this.t = 0;
    this.fx = [];
    this._room();
    this._props();
    this._lights();
    this._env();
    this.carRoot = new THREE.Group();
    this.scene.add(this.carRoot);
    this.lift = this._lift();
    this.liftH = 0;
    this.liftT = 0;
  }

  // ---------- помещение ----------
  _room() {
    const S = this.scene;
    const ft = floorTex();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(RW * 2, RD * 2),
      new THREE.MeshStandardMaterial({ map: ft, roughnessMap: roughTex(), roughness: 0.55, metalness: 0.05, color: 0xffffff }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    S.add(floor);
    this.floor = floor;
    // задняя стена — кирпич, снизу окрашенная панель
    const brick = new THREE.MeshStandardMaterial({ map: brickTex(), roughness: 0.9 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(RW * 2, RH), brick);
    back.position.set(0, RH / 2, -RD);
    S.add(back);
    const dado = new THREE.Mesh(new THREE.PlaneGeometry(RW * 2, 1.1), new THREE.MeshStandardMaterial({ color: 0x2a4a5a, roughness: 0.6 }));
    dado.position.set(0, 0.55, -RD + 0.01);
    S.add(dado);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(RW * 2, 0.08), new THREE.MeshStandardMaterial({ color: 0xe8b520, roughness: 0.5 }));
    stripe.position.set(0, 1.12, -RD + 0.012);
    S.add(stripe);
    // боковые стены — профнастил
    const side = new THREE.MeshStandardMaterial({ map: panelTex('#5a6a78'), roughness: 0.55, metalness: 0.3 });
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(RD * 2, RH), side);
      w.position.set(sx * RW, RH / 2, 0);
      w.rotation.y = -sx * (Math.PI / 2);
      S.add(w);
    }
    // передняя стена (за камерой) — рольворота
    const front = new THREE.Mesh(new THREE.PlaneGeometry(RW * 2, RH), new THREE.MeshStandardMaterial({ map: panelTex('#4a5a68'), roughness: 0.6, metalness: 0.3 }));
    front.position.set(0, RH / 2, RD);
    front.rotation.y = Math.PI;
    S.add(front);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.2), new THREE.MeshStandardMaterial({ map: doorTex(), roughness: 0.35, metalness: 0.7 }));
    door.position.set(-RW + 0.02, 1.6, 0.4);
    door.rotation.y = Math.PI / 2;
    S.add(door);
    // полоска дневного света под воротами
    const gap = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.05), new THREE.MeshBasicMaterial({ color: 0xfff2d8 }));
    gap.position.set(-RW + 0.03, 0.03, 0.4);
    gap.rotation.y = Math.PI / 2;
    S.add(gap);
    // потолок и балки
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(RW * 2, RD * 2), new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.9 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = RH;
    S.add(ceil);
    const beamM = new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: 0.6, metalness: 0.5 });
    for (let k = -3; k <= 3; k++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, RD * 2), beamM);
      b.position.set(k * 2.2, RH - 0.15, 0);
      S.add(b);
    }
    // окно на задней стене (дневной свет)
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), new THREE.MeshBasicMaterial({ color: 0xcfe6ff }));
    win.position.set(3.6, 3.0, -RD + 0.02);
    S.add(win);
    const frameM = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: 0.5, metalness: 0.4 });
    for (const [w, h, x, y] of [[2.5, 0.06, 3.6, 3.45], [2.5, 0.06, 3.6, 2.55], [0.06, 0.96, 2.37, 3.0], [0.06, 0.96, 4.83, 3.0], [0.04, 0.9, 3.0, 3.0], [0.04, 0.9, 4.2, 3.0], [0.04, 0.9, 3.6, 3.0]]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), frameM);
      f.position.set(x, y, -RD + 0.04);
      S.add(f);
    }
  }

  _lights() {
    const S = this.scene;
    // светодиодные лампы на потолке
    const tubeM = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const housM = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.5, metalness: 0.5 });
    this.tubes = [];
    for (const z of [-2.2, -0.75, 0.75, 2.2])
      for (const x of [-2.6, 0, 2.6]) {
        const h = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.07, 0.2), housM);
        h.position.set(x, RH - 0.55, z);
        const t = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.02, 0.13), tubeM);
        t.position.set(x, RH - 0.59, z);
        S.add(h, t);
        for (const sx of [-1, 1]) {
          const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 4), housM);
          cable.position.set(x + sx * 0.9, RH - 0.27, z);
          S.add(cable);
        }
        this.tubes.push(t);
      }
    S.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3630, 0.55));
    // ключевой свет с тенью сверху
    const key = (this.key = new THREE.SpotLight(0xffffff, 55, 14, 0.9, 0.7, 1.6));
    key.position.set(0.6, RH - 0.6, 1.0);
    key.target.position.set(0, 0, 0);
    key.castShadow = this.q !== 'low';
    key.shadow.mapSize.set(this.q === 'high' ? 2048 : 1024, this.q === 'high' ? 2048 : 1024);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;
    S.add(key, key.target);
    // заполняющие
    const fill = new THREE.PointLight(0xffe2c0, 10, 9, 1.6);
    fill.position.set(-4, 2.6, 3);
    S.add(fill);
    const fill2 = new THREE.PointLight(0xc8dcff, 8, 9, 1.6);
    fill2.position.set(4.5, 2.4, -3.5);
    S.add(fill2);
    // лампа над верстаком
    const bl = new THREE.PointLight(0xffd8a0, 4, 4, 1.8);
    bl.position.set(-3.2, 2.0, -RD + 0.8);
    S.add(bl);
  }

  // окружение для отражений: тёмная комната с яркими лампами и окнами
  _env() {
    const pm = new THREE.PMREMGenerator(this.renderer);
    const E = new THREE.Scene();
    E.background = new THREE.Color(0x2a2c30);
    const box = new THREE.Mesh(new THREE.BoxGeometry(RW * 2, RH, RD * 2), new THREE.MeshBasicMaterial({ color: 0x3a3c42, side: THREE.BackSide }));
    box.position.y = RH / 2;
    E.add(box);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(RW * 2, RD * 2), new THREE.MeshBasicMaterial({ color: 0x55585e }));
    fl.rotation.x = -Math.PI / 2;
    fl.position.y = 0.01;
    E.add(fl);
    const L = (w, h, d, x, y, z, c, k = 1) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) }));
      m.position.set(x, y, z);
      E.add(m);
    };
    for (const z of [-2.2, -0.75, 0.75, 2.2]) for (const x of [-2.6, 0, 2.6]) L(2.2, 0.05, 0.26, x, RH - 0.58, z, 0xffffff, 7);
    L(2.4, 0.9, 0.05, 3.6, 3.0, -RD + 0.05, 0xcfe6ff, 4);
    L(0.05, 0.08, 4.4, -RW + 0.05, 0.05, 0.4, 0xfff2d8, 6);
    L(0.05, 2.6, 3.4, RW - 0.05, 1.8, 1.5, 0x8a9aaa, 1.2);
    L(3, 2.2, 0.05, -2, 1.6, RD - 0.05, 0x8a8a92, 1.1);
    L(1.6, 0.4, 0.05, -1.5, 2.9, -RD + 0.06, 0xff5a8a, 3);
    this.envMap = pm.fromScene(E, 0.02, 0.1, 40, { size: 512, position: new THREE.Vector3(0, 1.1, 0.6) }).texture;
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = 1.0;
    pm.dispose();
  }

  // ---------- реквизит ----------
  _props() {
    const S = this.scene;
    const add = (m, x, y, z, ry = 0) => {
      m.position.set(x, y, z);
      m.rotation.y = ry;
      S.add(m);
      return m;
    };
    const std = (c, r = 0.5, mt = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: mt });
    const chrome = std(0xdde2e8, 0.15, 1);
    // перфопанель с инструментами и верстак
    const peg = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshStandardMaterial({ map: pegTex(), roughness: 0.8 }));
    add(peg, -3.2, 2.05, -RD + 0.03);
    const bench = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 0.8), new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.7 }));
    top.position.y = 0.92;
    bench.add(top);
    const legM = std(0x2a3a4a, 0.5, 0.6);
    for (const x of [-1.4, 1.4])
      for (const z of [-0.33, 0.33]) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), legM);
        l.position.set(x, 0.45, z);
        bench.add(l);
      }
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.03, 0.7), legM);
    shelf.position.y = 0.25;
    bench.add(shelf);
    // тиски и ящик
    const vise = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.16, 0.18, 2, 0.02), std(0x2a5ab0, 0.4, 0.4));
    vise.position.set(1.1, 1.04, 0.2);
    const box = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.2, 0.26, 2, 0.02), std(0xd02a2a, 0.45, 0.2));
    box.position.set(-0.7, 1.06, 0);
    // канистры и банки
    for (let k = 0; k < 4; k++) {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 14), std([0xe8b520, 0x2a8a4a, 0xd02a2a, 0x2a6ad0][k], 0.35, 0.4));
      can.position.set(0.1 + k * 0.16, 1.05, -0.15);
      bench.add(can);
    }
    bench.add(vise, box);
    bench.traverse((o) => o.isMesh && (o.castShadow = true));
    add(bench, -3.2, 0, -RD + 0.45);
    // лампа над верстаком
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.2, 18, 1, true), std(0x2a6a4a, 0.5, 0.4));
    shade.material.side = THREE.DoubleSide;
    add(shade, -3.2, 2.15, -RD + 0.8);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff0c8 }));
    add(bulb, -3.2, 2.06, -RD + 0.8);
    // тележка с инструментами (красная, с ящиками)
    const cab = new THREE.Group();
    const body = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.95, 0.48, 2, 0.03), std(0xc81e1e, 0.32, 0.35));
    body.position.y = 0.6;
    cab.add(body);
    for (let k = 0; k < 6; k++) {
      const d = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.12, 0.02, 2, 0.006), std(0xd82a2a, 0.3, 0.35));
      d.position.set(0, 0.25 + k * 0.145, 0.245);
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.018, 0.02), chrome);
      h.position.set(0, 0.25 + k * 0.145 + 0.03, 0.262);
      cab.add(d, h);
    }
    const ctop = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.03, 0.5), std(0x1a1a1e, 0.6));
    ctop.position.y = 1.09;
    cab.add(ctop);
    for (const x of [-0.3, 0.3])
      for (const z of [-0.18, 0.18]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 14), std(0x111113, 0.6));
        w.rotation.x = Math.PI / 2;
        w.position.set(x, 0.06, z);
        cab.add(w);
      }
    // ключи на крышке
    for (let k = 0; k < 3; k++) {
      const wr = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.012, 0.03), chrome);
      wr.position.set(-0.15 + k * 0.05, 1.112, -0.05 + k * 0.08);
      wr.rotation.y = 0.3 * k;
      cab.add(wr);
    }
    cab.traverse((o) => o.isMesh && (o.castShadow = true));
    add(cab, 3.5, 0, -RD + 0.6, -0.25);
    // стеллаж с шинами справа
    const rackM = std(0x2a6ab0, 0.45, 0.5);
    const rack = new THREE.Group();
    for (const x of [-0.9, 0.9])
      for (const z of [-0.3, 0.3]) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.6, 0.05), rackM);
        p.position.set(x, 1.3, z);
        rack.add(p);
      }
    const tireM = std(0x18181a, 0.85);
    const tireG = new THREE.TorusGeometry(0.27, 0.11, 10, 24);
    for (const y of [0.15, 1.0, 1.85]) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.04, 0.65), rackM);
      sh.position.y = y;
      rack.add(sh);
      for (let k = 0; k < 4; k++) {
        const t = new THREE.Mesh(tireG, tireM);
        t.position.set(-0.66 + k * 0.44, y + 0.38, 0);
        rack.add(t);
      }
    }
    rack.traverse((o) => o.isMesh && (o.castShadow = true));
    add(rack, RW - 0.4, 0, -2.2, -Math.PI / 2);
    // стопка шин на полу
    for (let k = 0; k < 4; k++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.12, 10, 24), tireM);
      t.rotation.x = Math.PI / 2;
      t.castShadow = true;
      add(t, 5.3, 0.12 + k * 0.23, 2.4);
    }
    // компрессор
    const comp = new THREE.Group();
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.8, 20), std(0xd02a2a, 0.35, 0.4));
    tank.rotation.z = Math.PI / 2;
    tank.position.y = 0.3;
    const motor = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.22, 0.25, 2, 0.03), std(0x2a2a2e, 0.5, 0.5));
    motor.position.set(0.1, 0.62, 0);
    comp.add(tank, motor);
    comp.traverse((o) => o.isMesh && (o.castShadow = true));
    add(comp, -5.6, 0, -3.8, 0.4);
    // конус и ведро
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 20), std(0xff6a1a, 0.5));
    cone.castShadow = true;
    add(cone, -4.8, 0.25, 3.2);
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.32, 20, 1, true), std(0x2a8ae0, 0.4));
    bucket.material.side = THREE.DoubleSide;
    bucket.castShadow = true;
    add(bucket, 3.3, 0.16, 2.6);
    const foam = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), std(0xffffff, 0.9));
    foam.scale.y = 0.4;
    add(foam, 3.3, 0.3, 2.6);
    // неоновая вывеска
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: neonTex(this.signText || 'GARAGE'), transparent: true, toneMapped: false }));
    add(sign, -1.2, 3.0, -RD + 0.05);
    this.sign = sign;
    // плакаты
    for (const [k, x] of [[0, 0.9], [1, 1.6]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshStandardMaterial({ map: posterTex(k), roughness: 0.7 }));
      add(p, x, 1.9, -RD + 0.03);
    }
    // огнетушитель
    const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 14), std(0xd01a1a, 0.3, 0.3));
    add(ext, RW - 0.15, 0.9, 1.4);
  }

  setSignText(text) {
    this.signText = text;
    if (this.sign) {
      this.sign.material.map.dispose();
      this.sign.material.map = neonTex(text);
      this.sign.material.needsUpdate = true;
    }
  }

  // ножничный подъёмник: две площадки под колёсами, при подъёме раскрываются ножницы
  _lift() {
    const g = new THREE.Group();
    const runM = new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.55, metalness: 0.6 });
    const yel = new THREE.MeshStandardMaterial({ color: 0xe8b520, roughness: 0.45, metalness: 0.2 });
    const armM = new THREE.MeshStandardMaterial({ color: 0x2060c0, roughness: 0.4, metalness: 0.5 });
    this.runways = new THREE.Group();
    this.scissors = [];
    for (const z of [-0.72, 0.72]) {
      const run = new THREE.Mesh(new RoundedBoxGeometry(4.6, 0.09, 0.56, 2, 0.02), runM);
      run.position.set(0, 0.045, z);
      run.receiveShadow = true;
      // жёлто-чёрные края
      for (const zz of [-0.27, 0.27]) {
        const e = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.092, 0.03), yel);
        e.position.set(0, 0.046, z + zz);
        this.runways.add(e);
      }
      // рифление
      for (let k = 0; k < 22; k++) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.48), runM);
        r.position.set(-2.1 + k * 0.2, 0.095, z);
        this.runways.add(r);
      }
      this.runways.add(run);
      // ножницы
      for (const sx of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.1), armM);
        arm.position.set(0, 0.05, z);
        arm.userData.sx = sx;
        arm.castShadow = true;
        g.add(arm);
        this.scissors.push(arm);
      }
    }
    // пандусы
    for (const x of [-2.45, 2.45])
      for (const z of [-0.72, 0.72]) {
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.56), yel);
        ramp.position.set(x, 0.03, z);
        ramp.rotation.z = Math.sign(x) * -0.2;
        g.add(ramp);
      }
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.02, 2.0), new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.7, metalness: 0.4 }));
    base.position.y = 0.01;
    base.receiveShadow = true;
    g.add(base, this.runways);
    this.runways.traverse((o) => o.isMesh && (o.castShadow = true));
    this.scene.add(g);
    this.arms = this.runways;
    return g;
  }

  // ---------- машина ----------
  setCar(car) {
    this.carRoot.clear();
    this.car = car;
    if (car) {
      this.carRoot.add(car.root);
      car.root.traverse((o) => o.isMesh && o.castShadow === undefined && (o.castShadow = true));
      // мягкая тень-пятно под машиной
      if (!this.blob) {
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const x = c.getContext('2d');
        const g = x.createRadialGradient(64, 64, 10, 64, 64, 64);
        g.addColorStop(0, 'rgba(0,0,0,.65)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g;
        x.fillRect(0, 0, 128, 128);
        this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
        this.blob.rotation.x = -Math.PI / 2;
        this.blob.position.y = 0.006;
        this.scene.add(this.blob);
      }
      this.blob.scale.set(car.shape.L * 1.25, car.spec.W * 2.6, 1);
      this.blob.visible = true;
    } else if (this.blob) this.blob.visible = false;
  }
  setLift(h) {
    this.liftT = h;
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 58 : 40;
    this.camera.updateProjectionMatrix();
    this.portrait = w / h < 0.8;
  }

  // поворот камеры (из жестов): dx, dy в пикселях
  orbit(dx, dy) {
    const v = this.view;
    v.tyaw -= dx * 0.006;
    v.tpitch = clamp(v.tpitch + dy * 0.004, 0.02, 0.95);
    v.auto = false;
    this._idle = 0;
  }
  zoom(k) {
    const v = this.view;
    v.tdist = clamp(v.tdist * k, 3.4, 9.5);
    v.auto = false;
    this._idle = 0;
  }
  focus(o) {
    Object.assign(this.view, o);
  }

  update(dt) {
    this.t += dt;
    const v = this.view;
    this._idle = (this._idle || 0) + dt;
    if (this._idle > 6) v.auto = true;
    if (v.auto) v.tyaw += dt * 0.12;
    const k = 1 - Math.exp(-dt * 6);
    v.yaw += (v.tyaw - v.yaw) * k;
    v.pitch += (v.tpitch - v.pitch) * k;
    v.dist += (v.tdist - v.dist) * k;
    // подъёмник
    this.liftH += (this.liftT - this.liftH) * (1 - Math.exp(-dt * 2));
    this.runways.position.y = this.liftH;
    const h = this.liftH + 0.05;
    const ang = Math.asin(clamp(h / 2.4, 0, 0.95));
    for (const a of this.scissors) {
      a.position.y = h / 2 + 0.03;
      a.rotation.z = a.userData.sx * ang;
      a.visible = this.liftH > 0.05;
    }
    if (this.car) {
      this.car.root.position.y = this.liftH + 0.095;
      if (this.blob) this.blob.material.opacity = clamp(1 - this.liftH * 0.8, 0.15, 1);
    }
    const d = v.dist * (this.portrait ? 1.35 : 1);
    const ty = v.ty + this.liftH * 0.8;
    const cx = Math.sin(v.yaw) * Math.cos(v.pitch) * d,
      cz = Math.cos(v.yaw) * Math.cos(v.pitch) * d,
      cy = ty + Math.sin(v.pitch) * d;
    // не выходить за стены
    this.camera.position.set(clamp(cx + v.tx, -RW + 0.4, RW - 0.4), clamp(cy, 0.3, RH - 0.4), clamp(cz, -RD + 0.4, RD - 0.4));
    this.camera.lookAt(v.tx, ty, 0);
    // эффекты
    for (const p of this.fx) {
      p.life -= dt;
      p.v.y -= (p.g ?? 9) * dt;
      p.m.position.addScaledVector(p.v, dt);
      if (p.floor && p.m.position.y < 0.02) {
        p.m.position.y = 0.02;
        p.v.set(p.v.x * 0.3, Math.abs(p.v.y) * 0.25, p.v.z * 0.3);
      }
      const a = clamp(p.life / p.max, 0, 1);
      if (p.grow) p.m.scale.setScalar(p.s * (1 + (1 - a) * p.grow));
      if (p.m.material.opacity !== undefined && p.fade) p.m.material.opacity = a * p.op;
      if (p.life <= 0) {
        this.scene.remove(p.m);
        p.m.material.dispose();
        if (!p.shared) p.m.geometry.dispose();
      }
    }
    this.fx = this.fx.filter((p) => p.life > 0);
  }
  render() {
    this.renderer.render(this.scene, this.camera);
  }

  // ---------- выбор детали и мойка ----------
  ray(x, y) {
    const r = new THREE.Raycaster();
    const el = this.renderer.domElement;
    const rc = el.getBoundingClientRect();
    r.setFromCamera(new THREE.Vector2(((x - rc.left) / rc.width) * 2 - 1, -((y - rc.top) / rc.height) * 2 + 1), this.camera);
    return r;
  }
  pick(x, y) {
    if (!this.car) return null;
    const meshes = Object.values(this.car.panels);
    const hit = this.ray(x, y).intersectObjects(meshes, false)[0];
    return hit ? { panel: hit.object.userData.panel, point: hit.point, uv: hit.uv, hit } : null;
  }
  // попадание по кузову для мойки: uv по общей маске грязи
  bodyHit(x, y) {
    if (!this.car) return null;
    const list = [];
    this.car.body.traverse((o) => o.isMesh && o.userData.panel && list.push(o));
    const hit = this.ray(x, y).intersectObjects(list, false)[0];
    return hit || null;
  }

  // ---------- фото для объявлений ----------
  // снимок машины на «площадке» (светлый фон, мягкий свет), возвращает dataURL
  photo(root, w = 480, h = 300, yaw = 0.8) {
    if (!this.photoScene) {
      const S = (this.photoScene = new THREE.Scene());
      S.environment = this.envMap;
      S.environmentIntensity = 1.0;
      const c = document.createElement('canvas');
      c.width = 4;
      c.height = 256;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, '#9cc8ee');
      g.addColorStop(0.55, '#e8f2fa');
      g.addColorStop(0.56, '#9a9ea4');
      g.addColorStop(1, '#6a6e74');
      x.fillStyle = g;
      x.fillRect(0, 0, 4, 256);
      const bg = new THREE.CanvasTexture(c);
      bg.colorSpace = THREE.SRGBColorSpace;
      S.background = bg;
      const ground = new THREE.Mesh(new THREE.CircleGeometry(9, 40), new THREE.MeshStandardMaterial({ color: 0x8a8e94, roughness: 0.9 }));
      ground.rotation.x = -Math.PI / 2;
      S.add(ground);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.blob ? this.blob.material : new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 }));
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = 0.01;
      S.add(sh);
      this.photoShadow = sh;
      const sun = new THREE.DirectionalLight(0xffffff, 1.6);
      sun.position.set(3, 6, 4);
      S.add(sun, new THREE.HemisphereLight(0xdfefff, 0x5a5a5a, 0.6));
      this.photoCam = new THREE.PerspectiveCamera(30, w / h, 0.1, 50);
      this.photoRT = new THREE.WebGLRenderTarget(w, h, { samples: 4 });
      this.photoRT.texture.colorSpace = THREE.SRGBColorSpace;
      this.photoCv = document.createElement('canvas');
    }
    if (!this.blob) this.setCar(null);
    const S = this.photoScene;
    const car = root.userData.car;
    this.photoShadow.material = this.blob ? this.blob.material : this.photoShadow.material;
    this.photoShadow.scale.set(car.shape.L * 1.25, car.spec.W * 2.6, 1);
    const prevParent = root.parent;
    S.add(root);
    const R = this.renderer;
    if (this.photoRT.width !== w || this.photoRT.height !== h) this.photoRT.setSize(w, h);
    const cam = this.photoCam;
    cam.aspect = w / h;
    const d = Math.max(car.shape.L, 3.8) * 1.75;
    cam.position.set(Math.sin(yaw) * d, 1.55 + car.spec.wheel.R, Math.cos(yaw) * d);
    cam.lookAt(0, 0.62, 0);
    cam.updateProjectionMatrix();
    const old = R.getRenderTarget();
    R.setRenderTarget(this.photoRT);
    R.render(S, cam);
    const px = new Uint8Array(w * h * 4);
    R.readRenderTargetPixels(this.photoRT, 0, 0, w, h, px);
    R.setRenderTarget(old);
    S.remove(root);
    if (prevParent) prevParent.add(root);
    const cv = this.photoCv;
    cv.width = w;
    cv.height = h;
    const x = cv.getContext('2d');
    const img = x.createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    x.putImageData(img, 0, 0);
    return cv.toDataURL('image/jpeg', 0.86);
  }

  // ---------- эффекты ----------
  sparks(p, n = 14) {
    const geo = sparkGeo || (sparkGeo = new THREE.SphereGeometry(0.014, 4, 3));
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: i % 3 ? 0xffc040 : 0xfff2a0, transparent: true, toneMapped: false }));
      m.position.copy(p);
      m.scale.set(1, 1, 6);
      const v = new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3 + 0.5, (Math.random() - 0.5) * 4);
      m.lookAt(p.clone().add(v));
      this.scene.add(m);
      this.fx.push({ m, v, life: 0.5 + Math.random() * 0.4, max: 0.9, g: 9, floor: true, fade: true, op: 1, s: 1, shared: true });
    }
  }
  foam(p, n = 5) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, transparent: true, opacity: 0.9 }));
      m.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1));
      this.scene.add(m);
      this.fx.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 0.3, -0.2, (Math.random() - 0.5) * 0.3), life: 0.9, max: 0.9, g: 1.5, fade: true, op: 0.9, grow: 0.8, s: 1 });
    }
  }
  puff(p, color = 0xd8d8d8, n = 6) {
    // мягкое облачко краски или пыли: спрайт с размытым краем
    for (let i = 0; i < n; i++) {
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color, transparent: true, opacity: 0.5, depthWrite: false }));
      const s = 0.22 + Math.random() * 0.12;
      m.scale.setScalar(s);
      m.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 0.3, Math.random() * 0.2, (Math.random() - 0.5) * 0.3));
      this.scene.add(m);
      this.fx.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.4 + Math.random() * 0.4, (Math.random() - 0.5) * 0.4), life: 1.2, max: 1.2, g: 0, fade: true, op: 0.5, grow: 2.2, s, shared: true });
    }
  }
}
let sparkGeo = null;
let soft = null;
function softTex() {
  if (soft) return soft;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  soft = new THREE.CanvasTexture(c);
  soft.colorSpace = THREE.SRGBColorSpace;
  return soft;
}
