// Мультяшная графика, нарисованная кодом
export const INK = '#2b1a0e';

export const css = (c, a = 1) => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
export function mix(c1, c2, t) {
  const r = ((c1 >> 16) & 255) * (1 - t) + ((c2 >> 16) & 255) * t;
  const g = ((c1 >> 8) & 255) * (1 - t) + ((c2 >> 8) & 255) * t;
  const b = (c1 & 255) * (1 - t) + (c2 & 255) * t;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}
export const light = (c, t = 0.3) => mix(c, 0xffffff, t);
export const dark = (c, t = 0.3) => mix(c, 0x000000, t);

export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2);
}
export function circ(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}
export function poly(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}
// заливка с вертикальным градиентом (светлее сверху) + контур
export function paint(ctx, color, lw = 4, opts = {}) {
  if (opts.flat) ctx.fillStyle = css(color);
  else {
    const b = opts.box || [0, 0, 128, 128];
    const g = ctx.createLinearGradient(0, b[1], 0, b[3]);
    g.addColorStop(0, css(light(color, 0.22)));
    g.addColorStop(1, css(dark(color, 0.12)));
    ctx.fillStyle = g;
  }
  ctx.fill();
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}
export function line(ctx, pts, color, w) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = typeof color === 'number' ? css(color) : color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
export function eye(ctx, x, y, r, look = 1, angry = false) {
  ell(ctx, x, y, r, r * 1.1);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = INK;
  ctx.stroke();
  circ(ctx, x + r * 0.35 * look, y + r * 0.1, r * 0.5);
  ctx.fillStyle = INK;
  ctx.fill();
  circ(ctx, x + r * 0.15 * look, y - r * 0.2, r * 0.18);
  ctx.fillStyle = '#fff';
  ctx.fill();
  if (angry) line(ctx, [[x - r * 1.1, y - r * 1.3], [x + r * 1.0, y - r * 0.7]], INK, 3.5);
}

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return [c, c.getContext('2d')];
}

export function addTex(scene, key, w, h, draw) {
  const [c, ctx] = canvas(w, h);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx, c.width, c.height);
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, c);
}
