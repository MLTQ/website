import { createKernel } from './orbium.js';
import { WIDTH, HEIGHT, STEPS_PER_SECOND, createColony, isEmpty } from './colony.js';
import { evolveShader, occupancyShader } from './simulation.js';
import { materialShader } from './material.js';

export async function createGPU(canvas, onLost, { onPopulation = () => {} } = {}) {
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
  const initial = createColony(Math.random, 6);
  const fields = [buffer(initial.field, usage), buffer(initial.field, usage)];
  const kernel = buffer(createKernel(), GPUBufferUsage.STORAGE);
  const population = buffer(new Float32Array(4), usage);
  const readback = device.createBuffer({ size: 16, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  resources.push(readback);
  const uniform = buffer(new Float32Array(8), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
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
    const shaders = await Promise.all([module(evolveShader), module(occupancyShader), module(materialShader)]);
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

  const reset = (field = createColony().field) => {
    if (!(field instanceof Float32Array) || field.length !== WIDTH * HEIGHT) throw new RangeError('Invalid colony field');
    fields.forEach(b => device.queue.writeBuffer(b, 0, field));
    current = 0;
    revision++;
    stepsSinceProbe = STEPS_PER_SECOND;
  };
  const inspect = async capturedRevision => {
    try {
      await readback.mapAsync(GPUMapMode.READ);
      const [occupied, mass] = new Float32Array(readback.getMappedRange()).slice(0, 2);
      readback.unmap();
      if (disposed || capturedRevision !== revision) return;
      if (isEmpty(occupied)) {
        const fresh = createColony();
        reset(fresh.field);
        onPopulation({ occupied: 0, mass: 0, respawned: true, spawned: fresh.gliders.length });
      } else {
        onPopulation({ occupied, mass, respawned: false });
      }
    } catch (error) {
      if (!disposed) onLost(error.message);
    } finally { reading = false; }
  };

  return {
    resize(width, height) {
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      context.configure({ device, format, alphaMode: 'opaque' });
    },
    reset,
    frame(count, time, drag) {
      if (disposed) return;
      device.queue.writeBuffer(uniform, 0, new Float32Array([canvas.width, canvas.height, time, 0, ...drag]));
      stepsSinceProbe += count;
      const probe = !reading && stepsSinceProbe >= STEPS_PER_SECOND;
      const capturedRevision = revision;
      const encoder = device.createCommandEncoder();
      const compute = encoder.beginComputePass();
      compute.setPipeline(evolve);
      for (let i = 0; i < count; i++) {
        compute.setBindGroup(0, steps[current]);
        compute.dispatchWorkgroups(WIDTH / 8, HEIGHT / 8);
        current = 1 - current;
      }
      if (probe) {
        compute.setPipeline(measure);
        compute.setBindGroup(0, measurements[current]);
        compute.dispatchWorkgroups(1);
      }
      compute.end();
      if (probe) encoder.copyBufferToBuffer(population, 0, readback, 0, 16);
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
