import { WIDTH, HEIGHT, CELLS_PER_UNIT } from './colony.js';

// A volumetric glass lens whose silhouette and thickness come from live cells.
export const materialShader = /* wgsl */ `
struct Uniforms {
  resolution: vec2f,
  time: f32,
  spare: f32,
  drag: vec4f,
};
@group(0) @binding(0) var<storage, read> cells: array<f32>;
@group(0) @binding(1) var<uniform> u: Uniforms;

@vertex fn vertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[i], 0.0, 1.0);
}

fn cell(p: vec2i) -> f32 {
  let q = (p + vec2i(${WIDTH * 2}, ${HEIGHT * 2})) % vec2i(${WIDTH}, ${HEIGHT});
  return cells[u32(q.y * ${WIDTH} + q.x)];
}
fn density(p: vec2f) -> f32 {
  if (any(abs(p) > vec2f(${WIDTH / (2 * CELLS_PER_UNIT)}, ${HEIGHT / (2 * CELLS_PER_UNIT)}))) { return 0.0; }
  let q = p * ${CELLS_PER_UNIT}.0 + vec2f(${WIDTH / 2}.0, ${HEIGHT / 2}.0);
  let i = vec2i(floor(q));
  let f = fract(q);
  let x = vec4f(pow(1.0 - f.x, 3.0), 3.0*f.x*f.x*f.x - 6.0*f.x*f.x + 4.0,
    -3.0*f.x*f.x*f.x + 3.0*f.x*f.x + 3.0*f.x + 1.0, f.x*f.x*f.x) / 6.0;
  let y = vec4f(pow(1.0 - f.y, 3.0), 3.0*f.y*f.y*f.y - 6.0*f.y*f.y + 4.0,
    -3.0*f.y*f.y*f.y + 3.0*f.y*f.y + 3.0*f.y + 1.0, f.y*f.y*f.y) / 6.0;
  var value = 0.0;
  for (var row = 0; row < 4; row++) {
    var line = 0.0;
    for (var col = 0; col < 4; col++) { line += cell(i + vec2i(col - 1, row - 1)) * x[col]; }
    value += line * y[row];
  }
  return value;
}
fn shape(p: vec3f) -> f32 {
  let influence = exp(-dot(p.xz - u.drag.zw, p.xz - u.drag.zw) * 3.5);
  let q = p.xz - u.drag.xy * influence;
  let a = density(q);
  let vertical = (p.y - 0.30) / 0.285;
  return a - 0.045 - vertical * vertical * 0.94;
}
fn normal(p: vec3f) -> vec3f {
  let e = 0.0125;
  return normalize(-vec3f(
    shape(p + vec3f(e, 0.0, 0.0)) - shape(p - vec3f(e, 0.0, 0.0)),
    shape(p + vec3f(0.0, e, 0.0)) - shape(p - vec3f(0.0, e, 0.0)),
    shape(p + vec3f(0.0, 0.0, e)) - shape(p - vec3f(0.0, 0.0, e))));
}
fn environment(d: vec3f) -> vec3f {
  var c = mix(vec3f(0.14, 0.15, 0.18), vec3f(0.91, 0.94, 0.97), smoothstep(-0.3, 0.8, d.y));
  // Broad rectangular softboxes, a narrow strip, and a dark studio flag.
  let key = pow(max(0.0, dot(d, normalize(vec3f(-0.8, 1.3, 0.5)))), 28.0);
  let strip = pow(max(0.0, dot(d, normalize(vec3f(0.9, 0.65, -0.3)))), 100.0);
  let flag = pow(max(0.0, dot(d, normalize(vec3f(0.1, 0.2, 1.0)))), 13.0);
  c = mix(c, vec3f(0.025, 0.03, 0.045), flag * 0.82);
  return c + vec3f(1.9, 1.9, 1.8) * key + vec3f(2.2) * strip;
}
fn ground(p: vec2f, shadow: bool) -> vec3f {
  var c = vec3f(236.0, 237.0, 236.0) / 255.0;
  // A quiet ruled ground makes the bent light visible through the jelly.
  let grid = abs(fract(p * 1.2 + 0.5) - 0.5);
  let line = 1.0 - smoothstep(0.006, 0.018, min(grid.x, grid.y));
  c -= vec3f(line * 0.014 * exp(-dot(p, p) * 0.12));
  if (shadow) {
    let q = p - vec2f(0.08, -0.05);
    var s = density(q) * 0.28;
    s += (density(q + vec2f(0.08, 0.0)) + density(q - vec2f(0.08, 0.0))
      + density(q + vec2f(0.0, 0.08)) + density(q - vec2f(0.0, 0.08))) * 0.13;
    c *= 1.0 - s * 0.52;
    // A small offset approximates colored transmitted light near each footprint.
    let caustic = max(0.0, density(p - vec2f(0.04, 0.03)) - density(p));
    c += mix(vec3f(-0.06, 0.07, 0.01), vec3f(0.03, -0.05, 0.09), smoothstep(0.12, 0.75, density(p))) * caustic;
  }
  return c;
}
fn floorHit(p: vec3f, d: vec3f) -> vec2f {
  return (p + d * (-p.y / min(d.y, -0.03))).xz;
}

@fragment fn fragment(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  let uv = (frag.xy * 2.0 - u.resolution) / u.resolution.y;
  let viewScale = max(3.1, 5.4 / (u.resolution.x / u.resolution.y));
  let forward = normalize(vec3f(0.0, -6.8, -7.5));
  let right = vec3f(1.0, 0.0, 0.0);
  let up = cross(right, forward);
  let origin = vec3f(0.0, 6.8, 7.5) + right * uv.x * viewScale - up * uv.y * viewScale;
  let ray = forward;
  let floorT = -origin.y / ray.y;
  let floorP = origin + floorT * ray;
  var color = ground(floorP.xz, true);

  // Traverse only the slab occupied by the lens, then refine the first surface.
  let start = max(0.0, (0.60 - origin.y) / ray.y);
  let end = floorT;
  let step = (end - start) / 72.0;
  var hit = false;
  var t = start;
  for (var j = 0; j < 73; j++) {
    if (shape(origin + ray * t) > 0.0) { hit = true; break; }
    t += step;
  }
  if (hit) {
    var lo = t - step;
    var hi = t;
    for (var j = 0; j < 6; j++) {
      let mid = (lo + hi) * 0.5;
      if (shape(origin + ray * mid) > 0.0) { hi = mid; } else { lo = mid; }
    }
    let p = origin + ray * hi;
    let n = normal(p);
    let inside = refract(ray, n, 1.0 / 1.38);
    var travel = 0.009;
    for (var j = 0; j < 54; j++) {
      if (shape(p + inside * travel) < 0.0) { break; }
      travel += 0.014;
    }
    var exitLo = max(0.0, travel - 0.014);
    var exitHi = travel;
    for (var j = 0; j < 6; j++) {
      let mid = (exitLo + exitHi) * 0.5;
      if (shape(p + inside * mid) > 0.0) { exitLo = mid; } else { exitHi = mid; }
    }
    travel = (exitLo + exitHi) * 0.5;
    let exitP = p + inside * travel;
    let exitN = normal(exitP);
    let outRay = refract(inside, -exitN, 1.38);
    let transmittedRay = select(reflect(inside, -exitN), outRay, dot(outRay, outRay) > 0.01);
    let bent = floorHit(exitP, transmittedRay);
    let influence = exp(-dot(p.xz - u.drag.zw, p.xz - u.drag.zw) * 3.5);
    let life = smoothstep(0.10, 0.80, density(p.xz - u.drag.xy * influence));
    // Cell state A in [0,1]: green at low density, violet at high density.
    let pigment = mix(vec3f(1.45, 0.23, 0.80), vec3f(0.65, 1.70, 0.20), life);
    let absorption = exp(-pigment * travel * 2.15);
    let behind = mix(ground(bent, false), environment(transmittedRay), smoothstep(-0.10, 0.15, transmittedRay.y));
    let transmission = behind * absorption;
    let fresnel = 0.035 + 0.965 * pow(1.0 - max(0.0, dot(-ray, n)), 5.0);
    let reflection = environment(reflect(ray, n));
    color = mix(transmission, reflection, fresnel);
    color += mix(vec3f(0.025, 0.12, 0.07), vec3f(0.10, 0.025, 0.16), life) * (1.0 - absorption);
    let light = normalize(vec3f(-0.65, 1.0, 0.65));
    let halfV = normalize(light - ray);
    color += vec3f(0.9) * pow(max(dot(n, halfV), 0.0), 100.0);
    color += vec3f(0.28, 0.34, 0.31) * pow(max(dot(n, halfV), 0.0), 22.0);
    let rim = pow(1.0 - max(0.0, dot(-ray, n)), 3.0);
    color += mix(vec3f(0.36, 0.58, 0.45), vec3f(0.55, 0.37, 0.69), life) * rim * 0.22;
  }
  // Fade the specimen's ground into the page, avoiding a visible canvas box.
  let vignette = smoothstep(1.0, 1.6, length(uv * vec2f(0.36, 0.6)));
  color = mix(color, vec3f(236.0, 237.0, 236.0) / 255.0, vignette);
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;
