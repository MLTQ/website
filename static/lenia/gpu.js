import { SIZE, createSeed, createKernel } from './orbium.js';
import { evolveShader, centerShader } from './simulation.js';
import { materialShader } from './material.js';

export async function createGPU(canvas, onLost) {
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
  const fields = [buffer(createSeed(), usage), buffer(createSeed(), usage)];
  const kernel = buffer(createKernel(), GPUBufferUsage.STORAGE);
  const center = buffer(new Float32Array([32, 32, 0, 0]), usage);
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
  let evolve, locate, material;
  try {
    const shaders = await Promise.all([module(evolveShader), module(centerShader), module(materialShader)]);
    [evolve, locate, material] = await Promise.all([
      device.createComputePipelineAsync({ layout: 'auto', compute: { module: shaders[0], entryPoint: 'evolve' } }),
      device.createComputePipelineAsync({ layout: 'auto', compute: { module: shaders[1], entryPoint: 'locate' } }),
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
  const centers = fields.map(b => bind(locate, [b, center]));
  const renders = fields.map(b => bind(material, [b, center, uniform]));
  let current = 0;

  return {
    resize(width, height) {
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      context.configure({ device, format, alphaMode: 'opaque' });
    },
    reset() {
      const seed = createSeed();
      fields.forEach(b => device.queue.writeBuffer(b, 0, seed));
      current = 0;
    },
    frame(count, time, drag) {
      if (disposed) return;
      device.queue.writeBuffer(uniform, 0, new Float32Array([canvas.width, canvas.height, time, 0, ...drag]));
      const encoder = device.createCommandEncoder();
      const compute = encoder.beginComputePass();
      compute.setPipeline(evolve);
      for (let i = 0; i < count; i++) {
        compute.setBindGroup(0, steps[current]);
        compute.dispatchWorkgroups(SIZE / 8, SIZE / 8);
        current = 1 - current;
      }
      compute.setPipeline(locate);
      compute.setBindGroup(0, centers[current]);
      compute.dispatchWorkgroups(1);
      compute.end();
      const render = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(),
        clearValue: { r: 236 / 255, g: 237 / 255, b: 236 / 255, a: 1 }, loadOp: 'clear', storeOp: 'store' }] });
      render.setPipeline(material);
      render.setBindGroup(0, renders[current]);
      render.draw(3);
      render.end();
      device.queue.submit([encoder.finish()]);
    },
    destroy() {
      disposed = true;
      resources.forEach(b => b.destroy());
      context.unconfigure();
      device.destroy();
    },
  };
}
