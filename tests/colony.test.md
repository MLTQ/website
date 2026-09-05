# colony.test.js

## Purpose
Verifies randomized seeding preserves the source organism while exercising all allowed population sizes and continuous orientations. Separately guards exact-zero extinction detection.

## Components
- 100 reproducible colony generations check the count range, heading variation, density bounds and per-glider mass.
- Determinism and invalid-count checks protect the reusable seed interface.
- A single surviving value must prevent empty-field replacement.

## Contracts
Run `node --test tests/*.test.js`. Browser GPU integration is covered by `browser.html` / `browser.js` in an isolated local test server.
