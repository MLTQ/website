# build.js

## Purpose
Builds the static archive from the structured ledger, Markdown content, and static assets. Content and navigation remain usable without client JavaScript.

## Components
- `buildIndex` / `leniaMarkup`: assemble the homepage and its progressively enhanced Lenia specimen. The canvas is hidden from assistive technology until it is interactive.
- `shell`: shared metadata, styles, and document structure. Only the homepage loads the specimen module.
- `genusNav`: section links on every screen size.
- `build`: validates content, emits pages and discovery files, copies assets, and reconciles output.
- `serve`: serves `dist` and watches source; JavaScript modules need a JavaScript MIME type.

## Contracts
| Dependent | Expects | Breaking changes |
|---|---|---|
| GitHub Pages workflow | `node build.js` emits complete `dist/` | Output path, runtime dependencies |
| Content authors | Existing Markdown and ledger formats | Content schema |
| `static/lenia/index.js` | Homepage specimen DOM from `leniaMarkup()` | Selectors, controls |

## Notes
Never edit generated `dist` files. The Lenia enhancement is isolated from project pages.
