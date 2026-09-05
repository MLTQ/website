import { WIDTH, HEIGHT } from './colony.js';
import { species } from './orbium.js';

// Shared-world evolution and exact occupancy reduction.
export const createEvolveShader = (width = WIDTH, height = HEIGHT, { params } = species) => /* wgsl */ `
@group(0) @binding(0) var<storage, read> source: array<f32>;
@group(0) @binding(1) var<storage, read_write> nextField: array<f32>;
@group(0) @binding(2) var<storage, read> kernel: array<vec4f>;

@compute @workgroup_size(8, 8)
fn evolve(@builtin(global_invocation_id) id: vec3u) {
  let p = vec2i(id.xy);
  var potential = 0.0;
  for (var k = 0u; k < arrayLength(&kernel); k++) {
    let tap = kernel[k];
    let q = (p + vec2i(tap.xy) + vec2i(${width}, ${height})) % vec2i(${width}, ${height});
    potential += source[u32(q.y * ${width} + q.x)] * tap.z;
  }
  let d = (potential - ${params.m}) / (3.0 * ${params.s});
  let bell = max(0.0, 1.0 - d * d);
  let growth = 2.0 * bell * bell * bell * bell - 1.0;
  let i = id.y * ${width}u + id.x;
  nextField[i] = clamp(source[i] + ${1 / params.T} * growth, 0.0, 1.0);
}
`;

export const createOccupancyShader = (width = WIDTH, height = HEIGHT, centered = false) => /* wgsl */ `
@group(0) @binding(0) var<storage, read> field: array<f32>;
@group(0) @binding(1) var<storage, read_write> population: array<vec4f, 2>;
var<workgroup> sums: array<vec2f, 256>;
var<workgroup> centers: array<vec4f, 256>;

@compute @workgroup_size(256)
fn measure(@builtin(local_invocation_index) tid: u32) {
  var sum = vec2f(0.0);
  var center = vec4f(0.0);
  for (var i = tid; i < ${width * height}u; i += 256u) {
    let value = field[i];
    sum += vec2f(select(0.0, 1.0, value > 0.0), value);
    ${centered ? `let angle = vec2f(f32(i % ${width}u) / ${width}.0, f32(i / ${width}u) / ${height}.0) * 6.283185307;
    center += vec4f(cos(angle.x), sin(angle.x), cos(angle.y), sin(angle.y)) * value;` : ''}
  }
  sums[tid] = sum;
  centers[tid] = center;
  workgroupBarrier();
  for (var stride = 128u; stride > 0u; stride /= 2u) {
    if (tid < stride) { sums[tid] += sums[tid + stride]; centers[tid] += centers[tid + stride]; }
    workgroupBarrier();
  }
  if (tid == 0u) { population[0] = vec4f(sums[0], 0.0, 0.0); population[1] = centers[0]; }
}
`;

export const evolveShader = createEvolveShader();
export const occupancyShader = createOccupancyShader();
