# colony.js

## Purpose
Defines the shared 160 × 112 Lenia habitat and seeds a random colony of 3–7 original Orbium gliders. Each glider has its own position and continuous rotation, which sets its direction of locomotion.

## Components
- `createColony(random, requestedCount)`: shuffles spaced spawn sites, jitters placement, rotates the original cell density using bilinear interpolation, and returns the field and starting gliders. The optional arguments make regression checks reproducible.
- `isEmpty`: exact zero-occupancy predicate. A faint surviving cell is not an empty world.
- Constants: habitat dimensions, population bounds, 16 evolution steps per second, and 16 cells per rendering unit.

## Contracts
| Dependent | Expects | Breaking changes |
|---|---|---|
| `gpu.js` | Float32 field with WIDTH × HEIGHT elements | Dimensions, layout |
| `simulation.js`, `material.js` | Shared dimensions embedded into WGSL | Buffer dimensions |
| `index.js` | Fixed simulation speed | Time units |

## Notes
All organisms evolve together. Rotation is applied to their cellular state, not decorative mesh instances. The shader still uses the original R=13 Lenia rules.
