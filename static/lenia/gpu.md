# gpu.js

## Purpose
Owns the WebGPU device, buffers, compute pipelines and material renderer. Contains no UI policy or animation scheduling.

## Components
- `createGPU(canvas, onLost)`: negotiates WebGPU and checks all shader compilation messages. Rejects cleanly on unsupported hardware or compilation failure.
- `resize`: configures a bounded drawing buffer.
- `frame(count, time, drag)`: runs fixed Lenia steps, locates the organism, then draws; no per-frame CPU readback.
- `reset` / `destroy`: restore source cells or release all GPU resources.

## Contracts
| Dependent | Expects | Breaking changes |
|---|---|---|
| `index.js` | Async factory, resize/reset/frame/destroy | Interface |
| `simulation.js` | Ping-pong dispatch ordering and packed buffers | Binding order |
| `material.js` | 8-float uniform and current field | Packing |

## Notes
Device loss and uncaptured validation errors notify the UI to restore the still fallback. Canvas resolution and frame scheduling are the caller's responsibility.
