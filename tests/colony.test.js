import test from 'node:test';
import assert from 'node:assert/strict';
import { createColony, isEmpty, WIDTH, HEIGHT } from '../static/lenia/colony.js';

function random(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

test('random colonies cover 3–7 gliders with varied headings and intact starting mass', () => {
  const counts = new Set();
  for (let seed = 1; seed <= 100; seed++) {
    const colony = createColony(random(seed * 673));
    counts.add(colony.gliders.length);
    assert.equal(colony.field.length, WIDTH * HEIGHT);
    assert.ok(colony.field.every(v => Number.isFinite(v) && v >= 0 && v <= 1));
    const massPerGlider = colony.field.reduce((a, b) => a + b, 0) / colony.gliders.length;
    assert.ok(massPerGlider > 75 && massPerGlider < 79, `Rotated seed lost mass: ${massPerGlider}`);
    assert.equal(new Set(colony.gliders.map(g => g.angle)).size, colony.gliders.length);
    for (const g of colony.gliders) assert.ok(g.angle >= 0 && g.angle < Math.PI * 2);
  }
  assert.deepEqual([...counts].sort(), [3, 4, 5, 6, 7]);
});

test('seed source is reproducible and rejects invalid population sizes', () => {
  assert.deepEqual(createColony(random(42)), createColony(random(42)));
  assert.equal(createColony(random(7), 6).gliders.length, 6);
  assert.throws(() => createColony(random(1), 0), RangeError);
  assert.throws(() => createColony(random(1), 8), RangeError);
});

test('repopulation waits for true zero occupancy', () => {
  assert.equal(isEmpty(0), true);
  assert.equal(isEmpty(1), false);
  assert.equal(isEmpty(Number.MIN_VALUE), false);
  assert.equal(isEmpty(17920), false);
});
