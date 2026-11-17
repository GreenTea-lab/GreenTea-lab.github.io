import assert from 'node:assert/strict';
import { Game } from '../src/core.js';
import { level, COUNT } from '../src/levels.js';

let boards = 0;
for (let i = 0; i < COUNT; i++) {
  const L = level(i);
  assert.equal(L.pos.length % 2, 0, `Level ${i + 1}: even tile count`);
  for (const seed of L.seeds) {
    const g = new Game({...L,seed});
    for (const pair of g.order) assert.ok(g.match(...pair), `Level ${i + 1}, seed ${seed}: valid generated solution`);
    assert.equal(g.left, 0);
    boards++;
  }
}
console.log(`PASS: ${COUNT} levels, ${boards} generated boards cleared, including keys/locks and hidden tiles.`);
