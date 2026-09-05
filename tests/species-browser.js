import { createGPU } from './lenia/gpu.js';
import specimens from './catalog.js';
import { seedSpecimen } from './lenia/specimen.js';
const result = document.querySelector('#result'), checks = document.querySelector('#checks');
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const errors = [];
let gpu;
try {
  for (const [slug, species] of Object.entries(specimens)) {
    let event;
    gpu = await createGPU(document.querySelector('canvas'), message => errors.push(message), {
      species, onPopulation: e => { event = e; },
    });
    gpu.resize(80, 80);
    const sample = async steps => {
      event = null;
      gpu.frame(steps, 0, [0,0,0,0]);
      const deadline = performance.now() + 10000;
      while (!event) {
        assert(performance.now() < deadline, `${slug}: readback timeout`);
        assert(!errors.length, errors.join('\n'));
        await new Promise(requestAnimationFrame);
      }
      return event;
    };
    const initial = await sample(0);
    const expected = seedSpecimen(species).reduce((a,b)=>a+b,0);
    assert(Math.abs(initial.mass - expected) < 0.01, `${slug}: wrong seed`);
    const evolved = await sample(200);
    assert(!evolved.respawned && evolved.mass > initial.mass * 0.35 && evolved.mass < initial.mass * 2.1, `${slug}: unstable evolution`);
    gpu.reset();
    const reset = await sample(0);
    assert(Math.abs(reset.mass-initial.mass)<0.01, `${slug}: reset changed its identity`);
    gpu.reset(new Float32Array(96*96));
    const empty = await sample(0);
    assert(empty.respawned && empty.spawned === 1, `${slug}: empty world must reseed one assigned creature`);
    const restored = await sample(0);
    assert(Math.abs(restored.mass-initial.mass)<0.01, `${slug}: extinction changed its identity`);
    checks.textContent += `PASS ${slug}: ${species.name} — evolved, reset, restored one\n`;
    gpu.destroy(); gpu = null;
  }
  result.textContent = 'All 26 project species passed WebGPU checks';
} catch(error) { result.textContent = 'Species check failed'; checks.textContent += error.stack; }
finally { gpu?.destroy(); }
