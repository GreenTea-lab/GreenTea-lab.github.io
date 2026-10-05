// Конфетти из бумажных квадратиков при решении кроссворда
const COLORS = ['#1f6e5b', '#f1c232', '#c3382d', '#2c5a96', '#e88a3c', '#8bc4a8'];

export function confetti() {
  const cv = document.getElementById('fx');
  if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = (cv.width = innerWidth * dpr),
    H = (cv.height = innerHeight * dpr);
  cv.style.width = innerWidth + 'px';
  cv.style.height = innerHeight + 'px';
  const g = cv.getContext('2d');
  const parts = [];
  for (let i = 0; i < 110; i++)
    parts.push({
      x: W * (0.15 + Math.random() * 0.7),
      y: H * (0.25 + Math.random() * 0.1),
      vx: (Math.random() - 0.5) * 14 * dpr,
      vy: (-8 - Math.random() * 12) * dpr,
      s: (6 + Math.random() * 7) * dpr,
      r: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.35,
      c: COLORS[i % COLORS.length],
    });
  const t0 = performance.now();
  const step = (now) => {
    const k = (now - t0) / 1000;
    g.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.42 * dpr;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.globalAlpha = Math.max(0, 1 - k / 2.6);
      g.fillStyle = p.c;
      g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
      g.restore();
    }
    if (k < 2.6) requestAnimationFrame(step);
    else g.clearRect(0, 0, W, H);
  };
  requestAnimationFrame(step);
}
