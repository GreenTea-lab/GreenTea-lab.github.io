import { World } from '../../src/world.js';
import { Controls } from '../../src/controls.js';
import { newState } from '../../src/econ.js';
const c = document.createElement('canvas');
c.style.cssText = 'width:100vw;height:100vh;display:block';
document.body.appendChild(c);
const w = new World(c, 'high');
const s = newState();
s.plots = ['2,2', '2,1', '1,2', '3,2', '1,1'];
const types = ['hut','cottage','tower','treehouse','farm','sawmill','quarry','mill','market','townhall','mine','iceworks','lighthouse','observatory','port','forge'];
types.forEach((t, i) => s.buildings.push({ id: 10 + i, type: t, x: 7 + (i % 6) * 2, z: 7 + Math.floor(i / 6) * 3 + (i % 2), lvl: 1 + (i * 3) % 10 }));
const deco = ['tree','flowers','fence','bench','lantern','well','pine','mushroom','fountain','snowman','statue','palm','crystaltree'];
deco.forEach((t, i) => s.decor.push({ type: t, x: 5 + (i % 7), z: 5 + Math.floor(i / 7) * 2, r: 0 }));
s.buildings[0].build = Date.now() + 100000;
w.buildIsland(s.plots);
w.setGhostPlots([{ px: 3, pz: 1, biome: 'desert', locked: true }, { px: 2, pz: 3, biome: 'meadow' }]);
w.sync(s, Date.now());
const ctl = new Controls(c, w.camera, () => {});
const qp = new URLSearchParams(location.search);
if (qp.get('phi')) { ctl.phi = ctl.tPhi = +qp.get('phi'); ctl.dist = ctl.tDist = +(qp.get('d') || 26); }
ctl.bbox = w.bbox;
const fixed = +(new URLSearchParams(location.search).get('t') || 0);
w.resize(innerWidth, innerHeight);
w.spawnBalloon();
w.setPeople([{x:10,z:12,rot:0.5,variant:0},{x:12,z:9,rot:2,variant:1},{x:14,z:13,rot:1,variant:2}]);
let last = performance.now();
let frames = 0;
function loop() {
  const now = performance.now();
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  ctl.update(dt);
  w.update(dt, fixed ? fixed : Date.now(), new URLSearchParams(location.search).get('rain') === '1');
  w.render();
  if (++frames === 40) document.title = 'done';
  requestAnimationFrame(loop);
}
loop();
