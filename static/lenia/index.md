# index.js

## Purpose
Progressively enhances the homepage specimen with a live WebGPU simulation and accessible interaction. All site navigation and content work independently.

## Components
- `start`: finds the scoped controls and creates the renderer, falling back to the still on errors.
- `tick`: capped 30 fps rendering, fixed 40 Lenia steps per second, bounded catch-up, damped drag spring.
- Pointer handlers: local stretch with pointer capture and cancellation; arrow keys provide equivalent nudges.
- Pause/play and reset controls remain ordinary keyboard-operable buttons. Space on the canvas toggles motion.
- Visibility, intersection, resize, and page lifecycle observers manage GPU work and resources.

## Contracts
| Dependent | Expects | Breaking changes |
|---|---|---|
| Homepage markup | `data-lenia`, canvas, status/hint/pause/reset selectors | Selector names |
| `gpu.js` | Renderer factory and methods | API |
| `lenia.css` | mode, paused, dragging data attributes | State names |

## Notes
Reduced motion starts paused and disables spring interaction. Visitors can explicitly play. Offscreen and hidden tabs suspend drawing. Device pixel ratio is capped at 1.5 and drawing width at 1050. Failures restore an honest still specimen, hide the inert canvas from assistive technology, disable controls, and disconnect all observers and event listeners.
