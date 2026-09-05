# material.js

## Purpose
Raymarches the shared Lenia colony as small glass volumes. Each surface shifts from green at low cell density to purple at high density. Rendering presents the actual cellular state.

## Components
- `density` / `shape`: cubic B-spline field interpolation and rounded vertical density isosurface. The finite 160 × 112 window displays the shared torus once; 16 cells per unit and half-height jelly shrink each glider.
- `normal`: finite differences of the same surface used for intersection.
- `environment` / `ground`: neutral studio reflections, contact shadows, subtle floor markings and density-tinted transmitted light.
- `fragment`: fixed orthographic camera fits the whole field on wide and narrow viewports. Binary-refined entry/exit refraction, IOR 1.38, density-dependent pigment and thickness absorption, Fresnel reflections and highlights are retained.
- Pointer deformation warps the sampling coordinates locally; it does not corrupt the cellular state.

## Contracts
| Dependent | Expects | Breaking changes |
|---|---|---|
| `gpu.js` | Field and 32-byte uniform bindings | Bindings, uniform packing |
| `index.js` | Drag xy displacement and zw anchor in ground units | Interaction coordinates |

## Notes
This is a density-derived 3D rendering of 2D Lenia, not the separate Lenia-3D project. Color uses cell state A, not growth rate or a biological health score. Reflections use an analytic studio environment; floor caustics are approximations. No remote textures or runtime dependencies.
