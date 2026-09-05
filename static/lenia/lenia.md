# lenia.css

## Purpose
Styles the specimen as part of the archive header, with a seamless page ground and restrained scientific labels. The rest of the archive retains its existing styling.

## Components
- `.lenia-stage`: reserves canvas space, overlays fallback and WebGPU surfaces without layout shifts.
- Data-state selectors display the live canvas only after initialization succeeds.
- Caption and controls use the archive's established compact typography.
- Responsive rules stack the specimen below the introduction on phones; touch scroll remains possible.

## Contracts
| Dependent | Expects | Breaking changes |
|---|---|---|
| `build.js` | Specimen markup and class names | Selectors |
| `index.js` | Live/still, dragging and paused state attributes | State names |

## Notes
Disabled controls are hidden in the no-JavaScript or unsupported-WebGPU view. Focus treatment is retained on interactive surfaces.
