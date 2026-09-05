# simulation.js

## Purpose
WGSL compute programs for genuine single-channel Lenia. The periodic world evolves independently of rendering and pointer deformation.

## Components
- `evolveShader`: normalized neighborhood convolution, polynomial growth, Euler integration, clamping. 8 × 8 workgroups cover a 64² torus.
- `centerShader`: 256-thread reduction computes circular moments so the camera follows the glider seamlessly across boundaries.

## Contracts
| Dependent | Expects | Breaking changes |
|---|---|---|
| `gpu.js` | Source/target/kernel bindings; separate center pass | Binding layout |
| `orbium.js` | Radius 13, μ .15, σ .015, timestep .1, kn=gn=1 | Species/rules |
| `material.js` | Center contains field-space x/y in a vec4 | Center coordinates |

## Notes
The source and `nextField` buffers must never alias in an evolution dispatch. Growth is polynomial, matching the source species; common Gaussian examples use different rules.
