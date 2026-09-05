# specimen.js

## Purpose
Decodes original Lenia species without rescaling their cellular state. Supplies the polynomial multi-ring kernels and compact habitats used on individual project pages.

## Components
- `decodeCells`: original 0–255 multistate RLE to rows of 0–1 density.
- `seedSpecimen`: centers one unmodified seed in a 96² periodic field; rejects oversized seeds.
- `specimenKernel`: normalized vec4 taps for the species' original radius and rational ring weights. Only supported polynomial kernel/growth rules are accepted.
- `specimenHabitat`: 96² grid, species-sized rendering scale, and tracking-camera settings. Render scaling never changes the simulation's cell resolution.

## Contracts
Build-time fallbacks, the runtime renderer, and species checks share these functions. Original catalog records carry `cells` and `params{R,T,b,m,s,kn,gn}`. Source attribution is retained in `LICENSE.txt` and `content/lenia.md`.
