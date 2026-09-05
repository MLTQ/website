# lenia.css

## Purpose
Styles the specimen as part of the archive header, with a seamless page ground and restrained scientific labels. The rest of the archive retains its existing styling.

## Components
- `.lenia-stage`: reserves canvas space, overlays fallback and WebGPU surfaces without layout shifts.
- `.lenia-reset`: small bordered button at the stage's bottom right, above the canvas. Keyboard focus and a larger phone touch target remain available; unsupported views hide it.
- Data-state selectors display the live canvas only after initialization succeeds.
- Caption and controls use the archive's established compact typography. A green-to-purple strip labels the 0–1 cell-density palette.
- `.lenia-invitation`: a compact, wrapping line below the controls, with an underlined link to the Lenia paper.
- Responsive rules stack the specimen below the introduction on phones; touch scroll remains possible.

## Contracts
| Dependent | Expects | Breaking changes |
|---|---|---|
| `build.js` | Specimen markup and class names | Selectors |
| `index.js` | Live/still, dragging and paused state attributes | State names |

## Notes
Disabled controls are hidden in the no-JavaScript or unsupported-WebGPU view. Focus treatment is retained on interactive surfaces.

## Project specimens
`.phdr-specimen` replaces the old sigil row with a compact specimen column and the existing project title/summary. `.lenia-project` uses a 220px stage, species name/paper link, pause/reset, and petting hint. Phones center the 240px specimen above the text. The density-map fallback occupies the same reserved stage. Archive-list sigils are untouched.
