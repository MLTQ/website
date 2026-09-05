# lenia.test.js

## Purpose
Meaningful regression coverage for the source specimen and numerical rule. An independent CPU convolution verifies that the glider stays alive and travels across the periodic boundary over 2,000 steps.

## Components
- Checks exact decoded starting mass and normalized kernel.
- Integrates the species' declared polynomial growth and timestep.
- Samples bounded mass and finite [0,1] states over the run.
- Unwraps circular centroid motion and requires more than one world-width of travel.

## Contracts
Run `node --test tests/lenia.test.js`. The reference does not execute WGSL; actual GPU compilation, rendering, and controls are checked separately in the browser.
