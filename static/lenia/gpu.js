import { createKernel, species as orbium } from './orbium.js';
import { seedSpecimen, specimenKernel, specimenHabitat } from './specimen.js';
import { WIDTH, HEIGHT, STEPS_PER_SECOND, createColony, isEmpty } from './colony.js';
import { createEvolveShader, createOccupancyShader } from './simulation.js';
import { createMaterialShader } from './material.js';

export async function createGPU(canvas, onLost, { onPopulation = () => {}, species = null } = {}) {
  const habitat = species ? specimenHabitat(species) : { width: WIDTH, height: HEIGHT, centered: false, viewScale: 3.1, halfWidth: 5.4 };
  const { width, height, centered } = habitat;
  const spawn = initial => species ? { field: seedSpecimen(species), count: 1 }
    : (() => { const colony = createColony(Math.random, initial ? 6 : undefined); return { field: colony.field, count: colony.gliders.length }; })();
  const probeInterval = centered ? 4 : STEPS_PER_SECOND;
  const center = [width / 2, height / 2], targetCenter = [...center];
  if (!navigator.gpu) throw new Error('WebGPU unavailable');
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
  if (!adapter) throw new Error('No WebGPU adapter');
  const device = await adapter.requestDevice();
  const resources = [];
  let disposed = false;
  device.lost.then(info => { if (!disposed) onLost(info.message); });
  device.addEventListener('uncapturederror', event => onLost(event.error.message));

  const buffer = (data, usage) => {
    const b = device.createBuffer({ size: data.byteLength, usage, mappedAtCreation: true });
    new Float32Array(b.getMappedRange()).set(data);
    b.unmap();
    resources.push(b);
    return b;
  };
  const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
  const initial = spawn(true);
  const fields = [buffer(initial.field, usage), buffer(initial.field, usage)];
  const kernel = buffer(species ? specimenKernel(species) : createKernel(), GPUBufferUsage.STORAGE);
  const population = buffer(new Float32Array(8), usage);
  const readback = device.createBuffer({ size: 32, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  resources.push(readback);
  const uniform = buffer(new Float32Array(12), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
  const context = canvas.getContext('webgpu');
  if (!context) { device.destroy(); throw new Error('No WebGPU canvas'); }
  const format = navigator.gpu.getPreferredCanvasFormat();

  async function module(code) {
    const shader = device.createShaderModule({ code });
    const info = await shader.getCompilationInfo();
    const errors = info.messages.filter(m => m.type === 'error');
    if (errors.length) throw new Error(errors.map(m => `${m.lineNum}: ${m.message}`).join('\n'));
    return shader;
  }
  let evolve, measure, material;
  try {
    const shaders = await Promise.all([module(createEvolveShader(width, height, species || orbium)),
      module(createOccupancyShader(width, height, centered)), module(createMaterialShader(habitat))]);
    [evolve, measure, material] = await Promise.all([
      device.createComputePipelineAsync({ layout: 'auto', compute: { module: shaders[0], entryPoint: 'evolve' } }),
      device.createComputePipelineAsync({ layout: 'auto', compute: { module: shaders[1], entryPoint: 'measure' } }),
      device.createRenderPipelineAsync({ layout: 'auto', vertex: { module: shaders[2], entryPoint: 'vertex' },
        fragment: { module: shaders[2], entryPoint: 'fragment', targets: [{ format }] }, primitive: { topology: 'triangle-list' } }),
    ]);
  } catch (error) {
    disposed = true;
    device.destroy();
    throw error;
  }
  const bind = (pipeline, buffers) => device.createBindGroup({ layout: pipeline.getBindGroupLayout(0),
    entries: buffers.map((b, binding) => ({ binding, resource: { buffer: b } })) });
  const steps = fields.map((b, i) => bind(evolve, [b, fields[1 - i], kernel]));
  const measurements = fields.map(b => bind(measure, [b, population]));
  const renders = fields.map(b => bind(material, [b, uniform]));
  let current = 0;
  let revision = 0;
  let stepsSinceProbe = STEPS_PER_SECOND;
  let reading = false;

  const reset = (field = spawn(false).field) => {
    if (!(field instanceof Float32Array) || field.length !== width * height) throw new RangeError('Invalid Lenia field');
    fields.forEach(b => device.queue.writeBuffer(b, 0, field));
    current = 0;
    revision++;
    stepsSinceProbe = probeInterval;
    center[0] = targetCenter[0] = width / 2;
    center[1] = targetCenter[1] = height / 2;
  };
  const inspect = async capturedRevision => {
    try {
      await readback.mapAsync(GPUMapMode.READ);
      const [occupied, mass, , , cosX, sinX, cosY, sinY] = new Float32Array(readback.getMappedRange()).slice();
      readback.unmap();
      if (disposed || capturedRevision !== revision) return;
      if (isEmpty(occupied)) {
        const fresh = spawn(false);
        reset(fresh.field);
        onPopulation({ occupied: 0, mass: 0, respawned: true, spawned: fresh.count });
      } else {
        if (centered) {
          targetCenter[0] = (Math.atan2(sinX, cosX) / (2 * Math.PI) * width + width) % width;
          targetCenter[1] = (Math.atan2(sinY, cosY) / (2 * Math.PI) * height + height) % height;
        }
        onPopulation({ occupied, mass, respawned: false });
      }
    } catch (error) {
      if (!disposed) onLost(error.message);
    } finally { reading = false; }
  };

  return {
    habitat,
    resize(width, height) {
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      context.configure({ device, format, alphaMode: 'opaque' });
    },
    reset,
    frame(count, time, drag) {
      if (disposed) return;
      if (centered) [width, height].forEach((size, i) => {
        const delta = ((targetCenter[i] - center[i] + size * 1.5) % size) - size / 2;
        center[i] = (center[i] + delta * 0.2 + size) % size;
      });
      device.queue.writeBuffer(uniform, 0, new Float32Array([canvas.width, canvas.height, time, 0, ...drag, ...center, 0, 0]));
      stepsSinceProbe += count;
      const probe = !reading && stepsSinceProbe >= probeInterval;
      const capturedRevision = revision;
      const encoder = device.createCommandEncoder();
      const compute = encoder.beginComputePass();
      compute.setPipeline(evolve);
      for (let i = 0; i < count; i++) {
        compute.setBindGroup(0, steps[current]);
        compute.dispatchWorkgroups(width / 8, height / 8);
        current = 1 - current;
      }
      if (probe) {
        compute.setPipeline(measure);
        compute.setBindGroup(0, measurements[current]);
        compute.dispatchWorkgroups(1);
      }
      compute.end();
      if (probe) encoder.copyBufferToBuffer(population, 0, readback, 0, 32);
      const render = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(),
        clearValue: { r: 236 / 255, g: 237 / 255, b: 236 / 255, a: 1 }, loadOp: 'clear', storeOp: 'store' }] });
      render.setPipeline(material);
      render.setBindGroup(0, renders[current]);
      render.draw(3);
      render.end();
      if (probe) { reading = true; stepsSinceProbe = 0; }
      device.queue.submit([encoder.finish()]);
      if (probe) void inspect(capturedRevision);
    },
    destroy() {
      disposed = true;
      resources.forEach(b => b.destroy());
      context.unconfigure();
      device.destroy();
    },
  };
}
