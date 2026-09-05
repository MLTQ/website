import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed, createKernel, SIZE, species } from '../static/lenia/orbium.js';

// Independent CPU reference checks the source organism, including torus crossings.
test('original Orbium stays alive and travels for 2,000 Lenia steps', () => {
  let field = createSeed();
  let next = new Float32Array(field.length);
  const kernel = createKernel();
  const taps = Array.from({ length: kernel.length / 4 }, (_, i) =>
    [kernel[i * 4], kernel[i * 4 + 1], kernel[i * 4 + 2]]);
  assert.ok(Math.abs(taps.reduce((sum, tap) => sum + tap[2], 0) - 1) < 1e-6);
  assert.ok(Math.abs(field.reduce((sum, value) => sum + value, 0) - 76.862745) < 1e-4);
  assert.equal(species.params.kn, 1);
  assert.equal(species.params.gn, 1);
  const neighbors = Array.from({ length: field.length }, (_, i) => Int32Array.from(taps,
    ([dx, dy]) => (((i / SIZE | 0) + dy + SIZE) % SIZE) * SIZE + ((i % SIZE + dx + SIZE) % SIZE)));
  const center = () => {
    let c = 0, s = 0;
    field.forEach((v, i) => { const a = (i / SIZE | 0) / SIZE * Math.PI * 2; c += v * Math.cos(a); s += v * Math.sin(a); });
    return Math.atan2(s, c) * SIZE / (Math.PI * 2);
  };
  let last = center(), distance = 0;
  for (let step = 0; step < 2000; step++) {
    for (let i = 0; i < field.length; i++) {
      let potential = 0;
      for (let j = 0; j < taps.length; j++) potential += field[neighbors[i][j]] * taps[j][2];
      const bell = Math.max(0, 1 - ((potential - species.params.m) / (3 * species.params.s)) ** 2);
      next[i] = Math.max(0, Math.min(1, field[i] + (2 * bell ** 4 - 1) / species.params.T));
    }
    [field, next] = [next, field];
    if (step % 100 === 99) {
      const mass = field.reduce((sum, value) => sum + value, 0);
      assert.ok(mass > 65 && mass < 85, `Orbium destabilized at step ${step}: mass ${mass}`);
      assert.ok(field.every(v => Number.isFinite(v) && v >= 0 && v <= 1));
      const now = center();
      distance += ((now - last + SIZE * 1.5) % SIZE) - SIZE / 2;
      last = now;
    }
  }
  assert.ok(Math.abs(distance) > SIZE, `Expected gliding across a full torus; traveled ${distance}`);
});
