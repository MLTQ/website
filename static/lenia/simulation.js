// Two GPU passes: Lenia evolution and a periodic center-of-mass camera target.
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
    let q = (p + vec2i(tap.xy) + vec2i(64)) % vec2i(64);
    potential += source[u32(q.y * 64 + q.x)] * tap.z;
  }
  let d = (potential - 0.15) / (3.0 * 0.015);
  let bell = max(0.0, 1.0 - d * d);
  let growth = 2.0 * bell * bell * bell * bell - 1.0;
  let i = id.y * 64u + id.x;
  nextField[i] = clamp(source[i] + 0.1 * growth, 0.0, 1.0);
}
`;

export const centerShader = /* wgsl */ `
@group(0) @binding(0) var<storage, read> field: array<f32>;
@group(0) @binding(1) var<storage, read_write> center: vec4f;
var<workgroup> sums: array<vec4f, 256>;

@compute @workgroup_size(256)
fn locate(@builtin(local_invocation_index) tid: u32) {
  var sum = vec4f(0.0);
  for (var i = tid; i < 4096u; i += 256u) {
    let a = vec2f(f32(i % 64u), f32(i / 64u)) * (6.28318530718 / 64.0);
    sum += vec4f(cos(a.x), sin(a.x), cos(a.y), sin(a.y)) * field[i];
  }
  sums[tid] = sum;
  workgroupBarrier();
  for (var stride = 128u; stride > 0u; stride /= 2u) {
    if (tid < stride) { sums[tid] += sums[tid + stride]; }
    workgroupBarrier();
  }
  if (tid == 0u) {
    let s = sums[0];
    let c = (vec2f(atan2(s.y, s.x), atan2(s.w, s.z)) / 6.28318530718 + 1.0) * 64.0;
    center = vec4f(c % vec2f(64.0), 0.0, 0.0);
  }
}
`;
