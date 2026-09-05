# orbium.js

## Purpose
The original O2u Orbium unicaudatus specimen and its exact polynomial Lenia rules, from Bert Chan's MIT-licensed Lenia collection. No network fetch is needed at runtime.

## Components
- `species`: source RLE and parameters from `Chakazul/Lenia/Python/animals.json`.
- `createSeed`: decodes 0–255 multistate RLE into a centered 64 × 64 float field.
- `createKernel`: normalized polynomial ring, radius 13; packed vec4 taps for WebGPU.
- `SIZE`, `RADIUS`: shared simulation dimensions.

## Contracts
| Dependent | Expects | Breaking changes |
|---|---|---|
| `gpu.js` | Float32 arrays, normalized taps, 64² field | Packing or size |
| `simulation.js` | Polynomial kernel/growth; μ=.15, σ=.015, Δt=.1 | Switching to Gaussian rules |

## Attribution
Source: https://github.com/Chakazul/Lenia/blob/master/Python/animals.json
Copyright (c) 2018 Bert Chan. MIT license retained in `LICENSE.txt`.
