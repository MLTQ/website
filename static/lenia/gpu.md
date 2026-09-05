# gpu.js

## Purpose
Owns the WebGPU device, buffers, compute pipelines and material renderer. Contains no UI policy or animation scheduling.

## Components
- `createGPU(canvas, onLost, {onPopulation})`: starts six randomly oriented gliders, negotiates WebGPU and checks shader compilation. Rejects cleanly on unsupported hardware or compilation failure. Later resets and empty-field respawns randomize the count to 3–7.
- `resize`: configures a bounded drawing buffer.
- `frame(count, time, drag)`: runs fixed Lenia steps and draws the shared field. Roughly once per simulation second, measures occupancy and asynchronously reads 16 bytes.
- `inspect`: on exact zero occupancy, seeds 3–7 gliders with fresh positions and directions. Revision checks discard stale results after reset.
- `reset(field?)`: installs a fresh random colony, or an explicit Float32 field for numerical/empty-world checks.
- `destroy`: releases all resources; pending readbacks do not respawn a disposed renderer.

## Contracts
| Dependent | Expects | Breaking changes |
|---|---|---|
| `index.js` | Async factory, renderer methods, population callback with occupied/mass/respawned | Interface |
| `simulation.js` | Ping-pong dispatch ordering and packed buffers | Binding order |
| `material.js` | 8-float uniform and current field | Packing |

## Notes
Device loss and uncaptured validation errors notify the UI to restore the still fallback. There is at most one asynchronous occupancy readback in flight. A reset advances the revision so an old zero sample cannot overwrite a new colony. Canvas resolution and frame scheduling are the caller's responsibility.
