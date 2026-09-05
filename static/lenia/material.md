# material.js

## Purpose
Raymarches the live Lenia density as a thick mint glass volume. Rendering is a presentation of the actual organism; no animation loop substitutes for simulation.

## Components
- `density` / `shape`: cubic B-spline field interpolation and rounded vertical density isosurface. A finite viewing window suppresses repeated periodic copies.
- `normal`: finite differences of the same surface used for intersection.
- `environment` / `ground`: studio reflections, contact shadow, subtle floor markings and green transmitted light.
- `fragment`: close specimen camera, binary-refined entry/exit tracing, refraction with IOR 1.38, thickness absorption, Fresnel reflections, highlights. Exit rays sample the floor or studio, including internal reflection.
- Pointer deformation warps the sampling coordinates locally; it does not corrupt the cellular state.

## Contracts
| Dependent | Expects | Breaking changes |
|---|---|---|
| `gpu.js` | Field, center, 32-byte uniform bindings | Bindings, uniform packing |
| `index.js` | Drag xy displacement and zw anchor in ground units | Interaction coordinates |

## Notes
This is a density-derived 3D rendering of 2D Lenia, not the separate Lenia-3D project. Reflections use an analytic studio environment; the floor caustic is an approximation. No remote textures or runtime dependencies.
