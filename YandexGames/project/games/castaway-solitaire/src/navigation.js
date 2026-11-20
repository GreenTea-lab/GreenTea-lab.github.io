const STEP = .5;
const X_LIMIT = 46;
const Z_LIMIT = 36;
const WIDTH = X_LIMIT * 2 + 1;
const HEIGHT = Z_LIMIT * 2 + 1;
const SIZE = WIDTH * HEIGHT;
const OFFSETS = [
  [1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1], [-1,1], [-1,-1],
];
const NEIGHBORS = OFFSETS.map(([x,z]) => x + z * WIDTH);
const cell = (x,z) => x >= 0 && x < WIDTH && z >= 0 && z < HEIGHT ? z * WIDTH + x : -1;

export class NavigationGrid {
  constructor(walkable) {
    this.edges = new Uint8Array(SIZE);
    this.component = new Uint8Array(SIZE);
    this.visited = new Uint32Array(SIZE);
    this.parents = new Int32Array(SIZE);
    this.queue = new Int32Array(SIZE);
    this.generation = 0;
    const open = new Uint8Array(SIZE);
    for (let i = 0; i < SIZE; i++) {
      const {x,z} = this.point(i);
      open[i] = walkable(x,z);
    }
    const sampleWidth = WIDTH * 2 - 1;
    const midpoints = new Uint8Array(sampleWidth * (HEIGHT * 2 - 1));
    for (let i = 0; i < SIZE; i++) {
      if (!open[i]) continue;
      const gx = i % WIDTH, gz = Math.floor(i / WIDTH);
      for (let d = 0; d < OFFSETS.length; d++) {
        const [dx,dz] = OFFSETS[d];
        if (!open[cell(gx + dx,gz + dz)]) continue;
        if (dx && dz && (!open[cell(gx + dx,gz)] || !open[cell(gx,gz + dz)])) continue;
        const mx = gx * 2 + dx, mz = gz * 2 + dz;
        const sample = mx + mz * sampleWidth;
        if (!midpoints[sample]) {
          midpoints[sample] = walkable((mx * .5 - X_LIMIT) * STEP,(mz * .5 - Z_LIMIT) * STEP) ? 2 : 1;
        }
        if (midpoints[sample] === 2) this.edges[i] |= 1 << d;
      }
    }
    this.points = this.largestRegion(open).map(i => this.point(i));
  }

  point(index) {
    return {x:(index % WIDTH - X_LIMIT) * STEP,z:(Math.floor(index / WIDTH) - Z_LIMIT) * STEP};
  }

  index(x,z) {
    return cell(Math.round(x / STEP) + X_LIMIT,Math.round(z / STEP) + Z_LIMIT);
  }

  largestRegion(open) {
    const seen = new Uint8Array(SIZE);
    let largest = [];
    for (let i = 0; i < SIZE; i++) {
      if (!open[i] || seen[i]) continue;
      const group = [i];
      seen[i] = 1;
      for (let head = 0; head < group.length; head++) {
        const here = group[head];
        for (let d = 0; d < 4; d++) {
          if (!(this.edges[here] & (1 << d))) continue;
          const next = here + NEIGHBORS[d];
          if (seen[next]) continue;
          seen[next] = 1;
          group.push(next);
        }
      }
      if (group.length > largest.length) largest = group;
    }
    for (const i of largest) this.component[i] = 1;
    return largest;
  }

  has(x,z) {
    return this.component[this.index(x,z)] === 1;
  }

  route(start,end) {
    const a = this.index(start.x,start.z), b = this.index(end.x,end.z);
    if (!this.component[a] || !this.component[b]) return [];
    const {visited,parents,queue,edges,component} = this;
    const stamp = ++this.generation;
    visited[a] = stamp;
    parents[a] = -1;
    queue[0] = a;
    let size = 1;
    for (let head = 0; head < size; head++) {
      const here = queue[head];
      if (here === b) {
        const path = [];
        for (let i = here; i !== -1; i = parents[i]) path.push(this.point(i));
        return path.reverse();
      }
      for (let d = 0; d < NEIGHBORS.length; d++) {
        if (!(edges[here] & (1 << d))) continue;
        const next = here + NEIGHBORS[d];
        if (!component[next] || visited[next] === stamp) continue;
        visited[next] = stamp;
        parents[next] = here;
        queue[size++] = next;
      }
    }
    return [];
  }
}
