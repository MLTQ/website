# simulation.js

## Purpose
WGSL compute programs for genuine single-channel Lenia in the shared 160 × 112 habitat. The periodic world evolves independently of rendering and pointer deformation.

## Components
- `evolveShader`: normalized neighborhood convolution, polynomial growth, Euler integration, clamping. 8 × 8 workgroups cover the habitat.
- `occupancyShader`: 256-thread reduction counts all strictly positive cells and sums their mass. An empty world reports exact zero.

## Contracts
| Dependent | Expects | Breaking changes |
|---|---|---|
| `gpu.js` | Source/target/kernel bindings; occupancy vec4(occupied, mass, 0, 0) | Binding layout |
| `orbium.js` | Radius 13, μ .15, σ .015, timestep .1, kn=gn=1 | Species/rules |
| `colony.js` | Width and height are multiples of 8 | Dispatch dimensions |

## Notes
The source and `nextField` buffers must never alias in an evolution dispatch. Growth is polynomial, matching the source species; common Gaussian examples use different rules.
