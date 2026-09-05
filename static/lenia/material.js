// A volumetric glass lens whose silhouette and thickness come from live cells.
export const materialShader = /* wgsl */ `
struct Uniforms {
  resolution: vec2f,
  time: f32,
  spare: f32,
  drag: vec4f,
};
@group(0) @binding(0) var<storage, read> cells: array<f32>;
@group(0) @binding(1) var<storage, read> center: vec4f;
@group(0) @binding(2) var<uniform> u: Uniforms;

@vertex fn vertex(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  return vec4f(p[i], 0.0, 1.0);
}

fn cell(p: vec2i) -> f32 {
  let q = (p + vec2i(256)) % vec2i(64);
  return cells[u32(q.y * 64 + q.x)];
}
fn density(p: vec2f) -> f32 {
  if (any(abs(p) > vec2f(2.5))) { return 0.0; }
  let q = p * 8.2 + center.xy;
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
  let influence = exp(-dot(p.xz - u.drag.zw, p.xz - u.drag.zw) * 0.65);
  let q = p.xz - u.drag.xy * influence;
  let a = density(q);
  let vertical = (p.y - 0.59) / 0.57;
  return a - 0.045 - vertical * vertical * 0.94;
}
fn normal(p: vec3f) -> vec3f {
  let e = 0.025;
  return normalize(-vec3f(
    shape(p + vec3f(e, 0.0, 0.0)) - shape(p - vec3f(e, 0.0, 0.0)),
    shape(p + vec3f(0.0, e, 0.0)) - shape(p - vec3f(0.0, e, 0.0)),
    shape(p + vec3f(0.0, 0.0, e)) - shape(p - vec3f(0.0, 0.0, e))));
}
fn environment(d: vec3f) -> vec3f {
  var c = mix(vec3f(0.12, 0.19, 0.17), vec3f(0.87, 0.95, 0.92), smoothstep(-0.3, 0.8, d.y));
  // Broad rectangular softboxes, a narrow strip, and a dark studio flag.
  let key = pow(max(0.0, dot(d, normalize(vec3f(-0.8, 1.3, 0.5)))), 28.0);
  let strip = pow(max(0.0, dot(d, normalize(vec3f(0.9, 0.65, -0.3)))), 100.0);
  let flag = pow(max(0.0, dot(d, normalize(vec3f(0.1, 0.2, 1.0)))), 13.0);
  c = mix(c, vec3f(0.015, 0.065, 0.05), flag * 0.82);
  return c + vec3f(1.9, 1.9, 1.8) * key + vec3f(2.2) * strip;
}
fn ground(p: vec2f, shadow: bool) -> vec3f {
  var c = vec3f(236.0, 237.0, 236.0) / 255.0;
  // A quiet ruled ground makes the bent light visible through the jelly.
  let grid = abs(fract((p + center.xy / 8.2) * 1.2 + 0.5) - 0.5);
  let line = 1.0 - smoothstep(0.006, 0.018, min(grid.x, grid.y));
  c -= vec3f(line * 0.014 * exp(-dot(p, p) * 0.12));
  if (shadow) {
    let q = p - vec2f(0.16, -0.10);
    var s = density(q) * 0.28;
    s += (density(q + vec2f(0.16, 0.0)) + density(q - vec2f(0.16, 0.0))
      + density(q + vec2f(0.0, 0.16)) + density(q - vec2f(0.0, 0.16))) * 0.13;
    c *= 1.0 - s * 0.52;
    // Pale green transmitted light just beyond the footprint.
    let caustic = max(0.0, density(p * 0.88) - density(p));
    c += vec3f(-0.10, 0.095, 0.015) * caustic;
  }
  return c;
}
fn floorHit(p: vec3f, d: vec3f) -> vec2f {
  return (p + d * (-p.y / min(d.y, -0.03))).xz;
}

@fragment fn fragment(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  let uv = (frag.xy * 2.0 - u.resolution) / u.resolution.y;
  let origin = vec3f(0.0, 4.7, 6.5);
  let forward = normalize(vec3f(0.0, 0.40, 0.0) - origin);
  let right = vec3f(1.0, 0.0, 0.0);
  let up = cross(right, forward);
  let ray = normalize(forward + right * uv.x * 0.195 - up * uv.y * 0.195);
  let floorT = -origin.y / ray.y;
  let floorP = origin + floorT * ray;
  var color = ground(floorP.xz, true);

  // Traverse only the slab occupied by the lens, then refine the first surface.
  let start = max(0.0, (1.19 - origin.y) / ray.y);
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
    var travel = 0.018;
    for (var j = 0; j < 54; j++) {
      if (shape(p + inside * travel) < 0.0) { break; }
      travel += 0.028;
    }
    var exitLo = max(0.0, travel - 0.028);
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
    let absorption = exp(-vec3f(1.18, 0.24, 0.74) * travel * 0.95);
    let behind = mix(ground(bent, false), environment(transmittedRay), smoothstep(-0.10, 0.15, transmittedRay.y));
    let transmission = behind * absorption;
    let fresnel = 0.035 + 0.965 * pow(1.0 - max(0.0, dot(-ray, n)), 5.0);
    let reflection = environment(reflect(ray, n));
    color = mix(transmission, reflection, fresnel);
    color += vec3f(0.035, 0.12, 0.075) * (1.0 - absorption);
    let light = normalize(vec3f(-0.65, 1.0, 0.65));
    let halfV = normalize(light - ray);
    color += vec3f(0.9) * pow(max(dot(n, halfV), 0.0), 100.0);
    color += vec3f(0.28, 0.34, 0.31) * pow(max(dot(n, halfV), 0.0), 22.0);
    let rim = pow(1.0 - max(0.0, dot(-ray, n)), 3.0);
    color += vec3f(0.36, 0.58, 0.45) * rim * 0.22;
  }
  // Fade the specimen's ground into the page, avoiding a visible canvas box.
  let vignette = smoothstep(0.92, 1.42, length(uv * vec2f(0.48, 0.8)));
  color = mix(color, vec3f(236.0, 237.0, 236.0) / 255.0, vignette);
  return vec4f(clamp(color, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;
