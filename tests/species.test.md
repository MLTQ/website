# species.test.js

## Purpose
Guards stable unique species assignments and the one-simulation-per-project limit across all generated pages. Checks relative assets, exact embedded species, normalized multi-ring kernels, valid seed bounds, and habitat size.

## Contracts
Run after `npm run build` with `node --test tests/*.test.js`. Actual GPU evolution and same-species extinction/reset are exercised in `species-browser.js`.
