---
# Page-only fields. Everything else about JEWELS lives in content/projects.js.
stats:
  ~55 dB | SYNTHETIC TUBE FIT
  23.4 dB | ONE-SHOT ENCODER, HELD-OUT
  ~600 KB | 64-FRAME WINDOW ON DISK
  0.62 | CROSS-SEED CANONICALITY
media:
  slot | drop: avenue_fit.gif — GT | reconstruction
  slot | drop: prior_sample_v1.gif — real fit | generated
links:
  README / PROJECT.md / sol/results | https://github.com/MLTQ/jewels
---

## 2026.08.17 — THE ENCODER GATE

One pass, ~5M params: 23.4 dB / 0.944 SSIM on held-out clips at native
resolution, macro-layout at the fitted ceiling. First arm to beat the blur
baseline on every metric — by 8.7 dB over the best set-generative arm. The
field, not the pixels, remains the persistent state.

## 2026.07.31 — A BURIAL

The Voronoi arm lost every measured axis even after a steelman round, and was
removed. Mark-space generative emission is retired as the primary path: every
sampler composed worse macro-structure than trilinear upsampling of its own
conditioning. Full post-mortem in the decision log.

## SCALING — v0 → v1 → v2

CFD 0.31 → 0.20 → 0.16, monotone on both metrics with a flattening slope:
model scaling saturates against a 231-window single-scene corpus. Data is the
measured next axis; a 2,392-scene sky-timelapse corpus is fitting now.
