# browser.html

## Purpose
Local-only test harness for real GPU occupancy measurement and automatic colony reseeding. It is outside `static/` and is never deployed.

## Contracts
Serve a temporary directory containing this file as `index.html`, `browser.js`, and a `lenia/` copy from the built site. Open over localhost with WebGPU enabled. The heading and log display pass/fail results.

# browser.js

## Purpose
Exercises actual compute shader dispatches and asynchronous readback, including the extinction path that is hard to reach on demand through normal glider collisions.

## Components
- Empty-world check verifies automatic 3–7 respawn and a subsequent nonzero GPU occupancy measurement.
- A faint single cell verifies occupancy counts cells rather than comparing mass to an arbitrary threshold.
- A reset during an empty readback verifies revision protection.
- Runs with a small canvas and releases the device when done.

## Contracts
Loaded by `browser.html` from an isolated localhost test directory. Neither file ships in production. Reads `lenia/` from the same origin.
