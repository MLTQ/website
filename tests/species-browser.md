# species-browser.js

## Purpose
Tests every assigned creature on real WebGPU: original seed mass, survival after 200 steps using its own rules, deterministic reset, and exact-zero reseeding of one specimen of the same species. Devices are destroyed between species.

## Contracts
In an isolated local-only directory, serve `browser.html`, this file as `browser.js`, `content/lenia.js` as `catalog.js`, and `static/lenia` as `lenia/`. Never publish this fixture directory. Pass/fail is visible in the page; no page-scope mutation is needed for browser testing.
