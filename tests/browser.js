import { createGPU } from './lenia/gpu.js';
import { WIDTH, HEIGHT } from './lenia/colony.js';

const result = document.querySelector('#result');
const checks = document.querySelector('#checks');
const events = [], errors = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
let gpu;
const waitFor = async predicate => {
  const deadline = performance.now() + 8000;
  while (!predicate()) {
    assert(performance.now() < deadline, 'Timed out waiting for GPU readback');
    assert(errors.length === 0, errors.join('\n'));
    await new Promise(requestAnimationFrame);
    gpu.frame(0, 0, [0, 0, 0, 0]);
  }
};
const pass = message => { checks.textContent += `PASS: ${message}\n`; };

try {
  gpu = await createGPU(document.querySelector('canvas'), error => errors.push(error), {
    onPopulation: event => events.push(event),
  });
  gpu.resize(320, 180);
  gpu.reset(new Float32Array(WIDTH * HEIGHT));
  gpu.frame(1, 0, [0, 0, 0, 0]);
  await waitFor(() => events.some(e => e.respawned));
  const spawned = events.find(e => e.respawned).spawned;
  assert(spawned >= 3 && spawned <= 7, 'Respawn count out of range');
  await waitFor(() => events.some(e => e.occupied > 0));
  pass(`Zero occupancy automatically spawned ${spawned} gliders; new cells measured on GPU`);

  events.length = 0;
  const faint = new Float32Array(WIDTH * HEIGHT);
  faint[WIDTH * (HEIGHT / 2) + WIDTH / 2] = 1e-8;
  gpu.reset(faint);
  gpu.frame(0, 0, [0, 0, 0, 0]);
  await waitFor(() => events.length > 0);
  assert(events[0].occupied === 1 && !events[0].respawned, 'A surviving cell was discarded');
  pass('One faint surviving cell prevents reseeding');

  events.length = 0;
  gpu.reset(new Float32Array(WIDTH * HEIGHT));
  gpu.frame(0, 0, [0, 0, 0, 0]);
  gpu.reset();
  await waitFor(() => events.some(e => e.occupied > 0));
  assert(!events.some(e => e.respawned), 'Stale empty result overwrote a manual reset');
  pass('Manual reset wins over an in-flight empty readback');
  assert(errors.length === 0, errors.join('\n'));
  result.textContent = 'All WebGPU checks passed';
} catch (error) {
  result.textContent = 'WebGPU check failed';
  checks.textContent += error.stack;
} finally { gpu?.destroy(); }
