import { WIDTH, HEIGHT } from './colony.js';

// Shared-world evolution and exact occupancy reduction.
export const evolveShader = /* wgsl */ `
@group(0) @binding(0) var<storage, read> source: array<f32>;
@group(0) @binding(1) var<storage, read_write> nextField: array<f32>;
@group(0) @binding(2) var<storage, read> kernel: array<vec4f>;

@compute @workgroup_size(8, 8)
fn evolve(@builtin(global_invocation_id) id: vec3u) {
  let p = vec2i(id.xy);
  var potential = 0.0;
  for (var k = 0u; k < arrayLength(&kernel); k++) {
    let tap = kernel[k];
    let q = (p + vec2i(tap.xy) + vec2i(${WIDTH}, ${HEIGHT})) % vec2i(${WIDTH}, ${HEIGHT});
    potential += source[u32(q.y * ${WIDTH} + q.x)] * tap.z;
  }
  let d = (potential - 0.15) / (3.0 * 0.015);
  let bell = max(0.0, 1.0 - d * d);
  let growth = 2.0 * bell * bell * bell * bell - 1.0;
  let i = id.y * ${WIDTH}u + id.x;
  nextField[i] = clamp(source[i] + 0.1 * growth, 0.0, 1.0);
}
`;

export const occupancyShader = /* wgsl */ `
@group(0) @binding(0) var<storage, read> field: array<f32>;
@group(0) @binding(1) var<storage, read_write> population: vec4f;
var<workgroup> sums: array<vec2f, 256>;

@compute @workgroup_size(256)
fn measure(@builtin(local_invocation_index) tid: u32) {
  var sum = vec2f(0.0);
  for (var i = tid; i < ${WIDTH * HEIGHT}u; i += 256u) {
    let value = field[i];
    sum += vec2f(select(0.0, 1.0, value > 0.0), value);
  }
  sums[tid] = sum;
  workgroupBarrier();
  for (var stride = 128u; stride > 0u; stride /= 2u) {
    if (tid < stride) { sums[tid] += sums[tid + stride]; }
    workgroupBarrier();
  }
  if (tid == 0u) { population = vec4f(sums[0], 0.0, 0.0); }
}
`;
