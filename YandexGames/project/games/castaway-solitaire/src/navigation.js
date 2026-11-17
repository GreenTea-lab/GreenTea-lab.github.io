// Grid routes keep residents on dry ground and outside completed buildings.
export function findRoute(start, end, walkable, step = 0.5) {
  const key = (x, z) => `${x},${z}`;
  const sx = Math.round(start.x / step), sz = Math.round(start.z / step);
  const ex = Math.round(end.x / step), ez = Math.round(end.z / step);
  const valid = (x, z) => Math.abs(x) <= 46 && Math.abs(z) <= 36 && walkable(x * step, z * step);
  if (!valid(sx, sz) || !valid(ex, ez)) return [];
  const queue = [[sx, sz]], parents = new Map([[key(sx, sz), null]]);
  for (let head = 0; head < queue.length; head++) {
    const [x, z] = queue[head];
    if (x === ex && z === ez) {
      const path = []; let p = [x, z];
      while (p) { path.push({x:p[0]*step,z:p[1]*step}); p = parents.get(key(...p)); }
      return path.reverse();
    }
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const nx=x+dx,nz=z+dz,k=key(nx,nz);
      if (parents.has(k) || !valid(nx,nz)) continue;
      if (dx && dz && (!valid(x+dx,z) || !valid(x,z+dz))) continue;
      // Sample between grid centers as well, so a route cannot cut a corner.
      if (!walkable((x+dx*.5)*step,(z+dz*.5)*step)) continue;
      parents.set(k,[x,z]); queue.push([nx,nz]);
    }
  }
  return [];
}
