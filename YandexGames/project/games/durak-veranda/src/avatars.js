// Портреты соперников: милые звери с аксессуарами. Рисуются в круге радиуса R.
const P2 = Math.PI * 2;

export const KINDS = ['cat', 'bear', 'fox', 'rabbit', 'hedgehog', 'owl', 'raccoon', 'dog', 'sheep'];
const BG = { cat: '#f6d9a8', bear: '#cfe3c4', fox: '#d4e4f4', rabbit: '#f4d4dc', hedgehog: '#e8e0c8', owl: '#d8d0ec', raccoon: '#cfe8e4', dog: '#f2e2c0', sheep: '#d0e4f0' };

function circ(g, x, y, r, fill) {
  g.beginPath();
  g.arc(x, y, r, 0, P2);
  g.fillStyle = fill;
  g.fill();
}
function ell(g, x, y, rx, ry, rot, fill) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, P2);
  g.fillStyle = fill;
  g.fill();
}

function eyes(g, u, dy = 0, sp = 0.36, big = 1) {
  for (const s of [-1, 1]) {
    ell(g, s * sp * u, dy * u, 0.085 * u * big, 0.11 * u * big, 0, '#2a1a10');
    circ(g, s * sp * u + 0.03 * u * big, (dy - 0.04) * u, 0.03 * u * big, '#ffffff');
  }
}
function cheeks(g, u, dy = 0.22, sp = 0.5) {
  for (const s of [-1, 1]) ell(g, s * sp * u, dy * u, 0.12 * u, 0.08 * u, 0, 'rgba(240,110,120,.45)');
}
function smile(g, u, dy = 0.25, w = 0.12, col = '#5a2a1a') {
  g.strokeStyle = col;
  g.lineWidth = 0.045 * u;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-w * u, dy * u);
  g.quadraticCurveTo(-w * 0.5 * u, (dy + 0.08) * u, 0, dy * u);
  g.quadraticCurveTo(w * 0.5 * u, (dy + 0.08) * u, w * u, dy * u);
  g.stroke();
}

const FACE = {
  cat(g, u) {
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * 0.62 * u, -0.25 * u);
      g.lineTo(s * 0.6 * u, -0.95 * u);
      g.lineTo(s * 0.15 * u, -0.58 * u);
      g.closePath();
      g.fillStyle = '#e8963a';
      g.fill();
      g.beginPath();
      g.moveTo(s * 0.52 * u, -0.38 * u);
      g.lineTo(s * 0.54 * u, -0.78 * u);
      g.lineTo(s * 0.28 * u, -0.56 * u);
      g.closePath();
      g.fillStyle = '#f7c4b8';
      g.fill();
    }
    ell(g, 0, 0, 0.72 * u, 0.62 * u, 0, '#f0a24a');
    // полоски
    g.fillStyle = '#c9752a';
    for (const x of [-0.18, 0, 0.18]) ell(g, x * u, -0.5 * u, 0.05 * u, 0.13 * u, 0, '#c9752a');
    ell(g, 0, 0.22 * u, 0.36 * u, 0.24 * u, 0, '#fff4e6');
    eyes(g, u, -0.05);
    ell(g, 0, 0.12 * u, 0.07 * u, 0.05 * u, 0, '#e8707a');
    smile(g, u, 0.2, 0.1);
    g.strokeStyle = 'rgba(80,50,30,.6)';
    g.lineWidth = 0.025 * u;
    for (const s of [-1, 1]) for (const k of [-0.05, 0.06]) {
      g.beginPath();
      g.moveTo(s * 0.3 * u, (0.15 + k) * u);
      g.lineTo(s * 0.72 * u, (0.1 + k * 2) * u);
      g.stroke();
    }
    cheeks(g, u, 0.15, 0.48);
  },
  bear(g, u) {
    for (const s of [-1, 1]) {
      circ(g, s * 0.55 * u, -0.55 * u, 0.25 * u, '#8a5a34');
      circ(g, s * 0.55 * u, -0.55 * u, 0.13 * u, '#c99a72');
    }
    ell(g, 0, 0.02 * u, 0.72 * u, 0.66 * u, 0, '#9a6a40');
    ell(g, 0, 0.25 * u, 0.32 * u, 0.24 * u, 0, '#e2c09a');
    ell(g, 0, 0.14 * u, 0.11 * u, 0.08 * u, 0, '#3a2414');
    eyes(g, u, -0.08, 0.32);
    smile(g, u, 0.28, 0.08);
    cheeks(g, u, 0.18, 0.5);
  },
  fox(g, u) {
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * 0.65 * u, -0.2 * u);
      g.lineTo(s * 0.7 * u, -1.0 * u);
      g.lineTo(s * 0.12 * u, -0.55 * u);
      g.closePath();
      g.fillStyle = '#e0682a';
      g.fill();
      g.beginPath();
      g.moveTo(s * 0.58 * u, -0.35 * u);
      g.lineTo(s * 0.62 * u, -0.82 * u);
      g.lineTo(s * 0.3 * u, -0.55 * u);
      g.closePath();
      g.fillStyle = '#3a2418';
      g.fill();
    }
    g.beginPath();
    g.moveTo(-0.76 * u, -0.1 * u);
    g.quadraticCurveTo(-0.7 * u, -0.66 * u, 0, -0.62 * u);
    g.quadraticCurveTo(0.7 * u, -0.66 * u, 0.76 * u, -0.1 * u);
    g.quadraticCurveTo(0.6 * u, 0.5 * u, 0, 0.62 * u);
    g.quadraticCurveTo(-0.6 * u, 0.5 * u, -0.76 * u, -0.1 * u);
    g.fillStyle = '#ef7a34';
    g.fill();
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * 0.74 * u, 0.0);
      g.quadraticCurveTo(s * 0.3 * u, 0.0, 0, 0.62 * u);
      g.quadraticCurveTo(s * 0.5 * u, 0.45 * u, s * 0.74 * u, 0.0);
      g.fillStyle = '#fff6ea';
      g.fill();
    }
    ell(g, 0, 0.42 * u, 0.09 * u, 0.065 * u, 0, '#2a1a10');
    eyes(g, u, -0.12, 0.3);
    cheeks(g, u, 0.12, 0.45);
  },
  rabbit(g, u) {
    for (const s of [-1, 1]) {
      ell(g, s * 0.28 * u, -0.95 * u, 0.17 * u, 0.48 * u, s * 0.12, '#ece6e2');
      ell(g, s * 0.28 * u, -0.92 * u, 0.08 * u, 0.36 * u, s * 0.12, '#f4b8c4');
    }
    ell(g, 0, 0.02 * u, 0.68 * u, 0.62 * u, 0, '#f4f0ec');
    eyes(g, u, -0.05, 0.32);
    ell(g, 0, 0.15 * u, 0.07 * u, 0.05 * u, 0, '#e8707a');
    g.strokeStyle = '#8a6a5a';
    g.lineWidth = 0.035 * u;
    g.beginPath();
    g.moveTo(0, 0.19 * u);
    g.lineTo(0, 0.27 * u);
    g.stroke();
    smile(g, u, 0.27, 0.09, '#8a6a5a');
    g.fillStyle = '#fff';
    g.fillRect(-0.05 * u, 0.29 * u, 0.1 * u, 0.1 * u);
    cheeks(g, u, 0.18, 0.46);
  },
  hedgehog(g, u) {
    // иголки
    g.fillStyle = '#6a4a30';
    for (let k = 0; k < 18; k++) {
      const a = Math.PI * 0.95 + (k / 17) * Math.PI * 1.1;
      g.beginPath();
      g.moveTo(Math.cos(a - 0.12) * 0.62 * u, Math.sin(a - 0.12) * 0.62 * u);
      g.lineTo(Math.cos(a) * 0.98 * u, Math.sin(a) * 0.95 * u);
      g.lineTo(Math.cos(a + 0.12) * 0.62 * u, Math.sin(a + 0.12) * 0.62 * u);
      g.fill();
    }
    ell(g, 0, -0.15 * u, 0.75 * u, 0.55 * u, 0, '#7a5638');
    ell(g, 0, 0.12 * u, 0.58 * u, 0.5 * u, 0, '#f0d6b4');
    ell(g, 0, 0.3 * u, 0.1 * u, 0.075 * u, 0, '#2a1a10');
    eyes(g, u, 0.02, 0.26, 0.9);
    smile(g, u, 0.42, 0.07);
    cheeks(g, u, 0.25, 0.4);
  },
  owl(g, u) {
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * 0.5 * u, -0.4 * u);
      g.lineTo(s * 0.62 * u, -0.85 * u);
      g.lineTo(s * 0.2 * u, -0.55 * u);
      g.closePath();
      g.fillStyle = '#7a6a9a';
      g.fill();
    }
    ell(g, 0, 0.02 * u, 0.72 * u, 0.68 * u, 0, '#8a7ab0');
    ell(g, 0, 0.35 * u, 0.42 * u, 0.32 * u, 0, '#d8cce8');
    for (const s of [-1, 1]) {
      circ(g, s * 0.3 * u, -0.08 * u, 0.25 * u, '#fbf6ea');
      circ(g, s * 0.3 * u, -0.08 * u, 0.13 * u, '#2a1a10');
      circ(g, s * 0.3 * u + 0.05 * u, -0.13 * u, 0.045 * u, '#fff');
    }
    g.beginPath();
    g.moveTo(-0.08 * u, 0.12 * u);
    g.lineTo(0.08 * u, 0.12 * u);
    g.lineTo(0, 0.26 * u);
    g.closePath();
    g.fillStyle = '#f2a83a';
    g.fill();
    cheeks(g, u, 0.2, 0.52);
  },
  raccoon(g, u) {
    for (const s of [-1, 1]) {
      circ(g, s * 0.55 * u, -0.55 * u, 0.22 * u, '#7a7a82');
      circ(g, s * 0.55 * u, -0.55 * u, 0.11 * u, '#3a3a40');
    }
    ell(g, 0, 0.02 * u, 0.74 * u, 0.62 * u, 0, '#9a9aa4');
    ell(g, 0, -0.38 * u, 0.3 * u, 0.2 * u, 0, '#eeeef2');
    // маска
    g.beginPath();
    g.ellipse(-0.33 * u, -0.05 * u, 0.3 * u, 0.18 * u, 0.25, 0, P2);
    g.ellipse(0.33 * u, -0.05 * u, 0.3 * u, 0.18 * u, -0.25, 0, P2);
    g.fillStyle = '#3a3a44';
    g.fill();
    ell(g, 0, 0.25 * u, 0.3 * u, 0.22 * u, 0, '#f2f2f4');
    ell(g, 0, 0.14 * u, 0.09 * u, 0.065 * u, 0, '#1a1a20');
    for (const s of [-1, 1]) {
      circ(g, s * 0.33 * u, -0.05 * u, 0.09 * u, '#ffffff');
      circ(g, s * 0.33 * u, -0.05 * u, 0.06 * u, '#1a1a20');
    }
    smile(g, u, 0.27, 0.08, '#3a3a44');
    cheeks(g, u, 0.2, 0.5);
  },
  dog(g, u) {
    for (const s of [-1, 1]) ell(g, s * 0.66 * u, -0.05 * u, 0.2 * u, 0.42 * u, s * -0.25, '#a8743e');
    ell(g, 0, 0, 0.62 * u, 0.62 * u, 0, '#e2b878');
    ell(g, 0.28 * u, -0.22 * u, 0.22 * u, 0.2 * u, 0, '#fbf2e2');
    ell(g, 0, 0.24 * u, 0.3 * u, 0.22 * u, 0, '#fbf2e2');
    ell(g, 0, 0.12 * u, 0.12 * u, 0.085 * u, 0, '#2a1a10');
    eyes(g, u, -0.12, 0.28);
    g.beginPath();
    g.ellipse(0, 0.38 * u, 0.08 * u, 0.1 * u, 0, 0, Math.PI);
    g.fillStyle = '#e8707a';
    g.fill();
    smile(g, u, 0.3, 0.12);
    cheeks(g, u, 0.15, 0.46);
  },
  sheep(g, u) {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * P2;
      circ(g, Math.cos(a) * 0.62 * u, Math.sin(a) * 0.58 * u - 0.05 * u, 0.24 * u, '#fbf8f2');
    }
    for (const s of [-1, 1]) ell(g, s * 0.62 * u, 0.05 * u, 0.2 * u, 0.1 * u, s * 0.4, '#5a4a40');
    ell(g, 0, 0.1 * u, 0.48 * u, 0.5 * u, 0, '#6a5a50');
    for (let k = 0; k < 5; k++) circ(g, (k - 2) * 0.16 * u, -0.38 * u, 0.15 * u, '#fbf8f2');
    for (const s of [-1, 1]) {
      circ(g, s * 0.2 * u, 0.0, 0.1 * u, '#fff');
      circ(g, s * 0.2 * u, 0.01 * u, 0.06 * u, '#1a1a20');
    }
    ell(g, 0, 0.3 * u, 0.06 * u, 0.04 * u, 0, '#2a1a10');
    smile(g, u, 0.38, 0.07, '#2a1a10');
    cheeks(g, u, 0.22, 0.32);
  },
};

// аксессуары по характеру
const ACC = {
  cat: 'bow',
  bear: 'cap',
  fox: 'scarf',
  rabbit: 'glasses',
  hedgehog: 'beret',
  owl: 'glasses',
  raccoon: 'cap2',
  dog: 'bandana',
  sheep: 'hat',
};

function accessory(g, a, u, kind) {
  if (a === 'bow') {
    const y = 0.62 * u;
    g.fillStyle = '#d23a4a';
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(-0.3 * u, y - 0.15 * u);
    g.lineTo(-0.3 * u, y + 0.15 * u);
    g.closePath();
    g.moveTo(0, y);
    g.lineTo(0.3 * u, y - 0.15 * u);
    g.lineTo(0.3 * u, y + 0.15 * u);
    g.closePath();
    g.fill();
    circ(g, 0, y, 0.07 * u, '#a82a3a');
  } else if (a === 'cap') {
    g.fillStyle = '#4a5a6a';
    g.beginPath();
    g.ellipse(0, -0.55 * u, 0.62 * u, 0.32 * u, 0, Math.PI, P2);
    g.fill();
    ell(g, 0.22 * u, -0.52 * u, 0.5 * u, 0.1 * u, 0.05, '#3a4a5a');
    circ(g, 0, -0.85 * u, 0.06 * u, '#3a4a5a');
  } else if (a === 'cap2') {
    g.fillStyle = '#3a8a5a';
    g.beginPath();
    g.ellipse(0, -0.5 * u, 0.6 * u, 0.4 * u, 0, Math.PI, P2);
    g.fill();
    ell(g, -0.25 * u, -0.48 * u, 0.45 * u, 0.09 * u, -0.1, '#2a6a44');
  } else if (a === 'scarf') {
    g.fillStyle = '#3f72c8';
    g.beginPath();
    g.ellipse(0, 0.66 * u, 0.6 * u, 0.16 * u, 0, 0, P2);
    g.fill();
    g.fillRect(0.2 * u, 0.66 * u, 0.18 * u, 0.4 * u);
    g.fillStyle = '#f2f2f2';
    for (const x of [-0.35, -0.05, 0.25]) g.fillRect(x * u, 0.58 * u, 0.08 * u, 0.16 * u);
  } else if (a === 'glasses') {
    g.strokeStyle = '#3a2a20';
    g.lineWidth = 0.05 * u;
    const y = kind === 'owl' ? -0.08 : -0.05, sp = kind === 'owl' ? 0.3 : 0.32;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.arc(s * sp * u, y * u, (kind === 'owl' ? 0.28 : 0.17) * u, 0, P2);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(-0.12 * u, y * u);
    g.lineTo(0.12 * u, y * u);
    g.stroke();
  } else if (a === 'beret') {
    ell(g, -0.1 * u, -0.6 * u, 0.55 * u, 0.22 * u, -0.15, '#c23a3a');
    circ(g, -0.1 * u, -0.8 * u, 0.06 * u, '#9a2a2a');
  } else if (a === 'bandana') {
    g.fillStyle = '#d23a3a';
    g.beginPath();
    g.moveTo(-0.5 * u, 0.48 * u);
    g.lineTo(0.5 * u, 0.48 * u);
    g.lineTo(0, 0.82 * u);
    g.closePath();
    g.fill();
    g.fillStyle = '#fff';
    for (const [x, y] of [[-0.25, 0.55], [0.2, 0.56], [0, 0.68]]) circ(g, x * u, y * u, 0.04 * u, '#fff');
  } else if (a === 'hat') {
    g.fillStyle = '#e8b13a';
    g.beginPath();
    g.ellipse(0, -0.6 * u, 0.5 * u, 0.35 * u, 0, Math.PI, P2);
    g.fill();
    g.fillStyle = '#c4122a';
    g.fillRect(-0.5 * u, -0.66 * u, u, 0.12 * u);
    circ(g, 0, -0.98 * u, 0.12 * u, '#f6f2ea');
  }
}

// дурацкий колпак проигравшему
export function jesterCap(g, u) {
  for (const [s, c] of [[-1, '#d23a4a'], [1, '#3f72c8']]) {
    g.beginPath();
    g.moveTo(0, -0.55 * u);
    g.quadraticCurveTo(s * 0.4 * u, -1.25 * u, s * 0.95 * u, -1.0 * u);
    g.quadraticCurveTo(s * 0.55 * u, -0.85 * u, s * 0.62 * u, -0.45 * u);
    g.closePath();
    g.fillStyle = c;
    g.fill();
    circ(g, s * 0.95 * u, -1.0 * u, 0.1 * u, '#f5c03c');
  }
  g.beginPath();
  g.moveTo(0, -0.55 * u);
  g.lineTo(-0.25 * u, -1.2 * u);
  g.lineTo(0.25 * u, -1.2 * u);
  g.closePath();
  g.fillStyle = '#3a9a4a';
  g.fill();
  circ(g, 0, -1.22 * u, 0.1 * u, '#f5c03c');
  ell(g, 0, -0.5 * u, 0.66 * u, 0.12 * u, 0, '#f5c03c');
}

// портрет в круге; opts: { ring, dim, cap }
export function drawAvatar(g, kind, x, y, R, opts = {}) {
  g.save();
  g.translate(x, y);
  // подложка
  g.beginPath();
  g.arc(0, 0, R, 0, P2);
  g.fillStyle = BG[kind] || '#eee';
  g.fill();
  g.save();
  g.beginPath();
  g.arc(0, 0, R * 0.96, 0, P2);
  g.clip();
  const u = R * 0.78;
  g.translate(0, R * 0.12);
  FACE[kind](g, u);
  accessory(g, ACC[kind], u, kind);
  g.restore();
  if (opts.dim) {
    g.beginPath();
    g.arc(0, 0, R, 0, P2);
    g.fillStyle = 'rgba(40,30,20,.35)';
    g.fill();
  }
  g.lineWidth = R * 0.1;
  g.strokeStyle = opts.ring || '#fff6e3';
  g.beginPath();
  g.arc(0, 0, R, 0, P2);
  g.stroke();
  if (opts.cap) {
    g.translate(0, -R * 0.35);
    jesterCap(g, R * 0.75);
  }
  g.restore();
}
