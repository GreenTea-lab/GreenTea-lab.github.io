import { LAYOUTS, positions } from '../src/layouts.js';
import { Game, link } from '../src/core.js';
for (const name of Object.keys(LAYOUTS)) {
  const p = positions(name);
  const issues = [];
  // перекрытия на одном слое и опора снизу
  for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
    const a = p[i], b = p[j];
    if (a.z === b.z && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2) issues.push(`overlap ${JSON.stringify(a)}`);
  }
  for (const a of p) if (a.z > 0 && !p.some((b) => b.z === a.z - 1 && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2)) issues.push(`float ${JSON.stringify(a)}`);
  const xs = p.map((t) => t.x), ys = p.map((t) => t.y);
  const w = (Math.max(...xs) - Math.min(...xs) + 2) / 2, h = (Math.max(...ys) - Math.min(...ys) + 2) / 2;
  const zmax = Math.max(...p.map((t) => t.z));
  let ok = 0, ms = 0;
  if (p.length % 2 === 0) {
    const t0 = Date.now();
    for (let s = 1; s <= 20; s++) { try { new Game({ pos: p, types: Array.from({ length: 20 }, (_, i) => 'f' + i), seed: s }); ok++; } catch (e) {} }
    ms = (Date.now() - t0) / 20;
  }
  console.log(name.padEnd(10), String(p.length).padStart(4), `${w}x${h}`, 'z' + zmax, p.length % 2 ? 'ODD!' : '', `gen ${ok}/20 ${ms.toFixed(1)}ms`, issues.slice(0, 3).join(' '), issues.length > 3 ? `(+${issues.length - 3})` : '');
}
