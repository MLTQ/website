---
# Page-only fields for PHARAOH. Everything else lives in content/projects.js.
stats:
  6 | LOCAL INFERENCE SERVERS
  13 | ROOMS, BOOTH TO MAUSOLEUM
  49 | MCP TOOLS
  3 | FACES ON ONE FILESYSTEM
media:
  pharaoh-tracks.png | Compose mode. Script rows on the left, placed clips on ATMO, MUSIC, JACK and VERA on the right, and the target at −16 LUFS
  pharaoh-pyramid.png | The Pyramid. Story bible at the apex, scenes on the second tier, assets below them, the episode along the base
---

The models already exist. Qwen3-TTS, Chatterbox, Woosh, AudioLDM, ACE-Step,
AudioSR, RVC: a voice, a sigh, a door closing, rain on single-pane glass, a
score in D minor at 72 bpm, all of it open-weights and all of it runnable on
the machine under the desk. What did not exist was a place where thirty
minutes of it could be commissioned, auditioned, versioned, laid on a
timeline, mastered, and run again tomorrow with the same result. Pharaoh is
that place. The problem was never generation. It was coordination.

The name is the shape of the work. Something commands a pyramid to be built,
and the monument is the drama: a story bible at the apex, scenes beneath it,
one row per audio event beneath those, and at the base the takes, each wav
with a sidecar recording every parameter that produced it. Every stone is a
file. There is no unsaved state anywhere in the app, because there is no
state that is not on disk.

That is the decision that lets the thing have three faces. A person works the
desktop app. An agent works the headless CLI, fifty-six subcommands that print
JSON and exit with a code that means something. A model works the MCP server,
forty-nine tools and a `pipeline` resource meant to be the first thing it
reads: scenes against stages, what is done and what is owed. All three read
and write the same files. None of them is the real one.

## 2026.08.16 — STORY SHAPE

Each scene carries a tension value, or carries none. The Story Shape view
draws the curve through them. It uses a monotone cubic rather than
Catmull-Rom, because Catmull-Rom overshoots between control points and
invents peaks nobody wrote, and in a tool whose premise is *show me the shape
I made*, inventing shape is the one unacceptable failure. Null means unshaped,
not zero. Three shaped scenes and twenty blank ones draw three points and a
dashed line, not a valley on the floor.

## 2026.07.02 — TWO MONOLITHS, SPLIT

The CLI finished its move into domain modules and the MCP entry point went
from a monolith to sixty-nine lines. A first attempt at the same split had sat
parked in a side directory for weeks because it broke the build. This one did
not.

## 2026.06.10 — ON THE MESH

Pharaoh announces itself to a local GRUVE agent every twenty seconds. A friend
opens it from their own lobby, served from this laptop, driving these
inference servers. Reads are always allowed. Writes pass an allowlist.
Settings, imports from the host filesystem, recording, and deleting from the
library stay with whoever owns the machine.

## 2026.06.01 — ROOMS

Two axes on any clip. Where it is: azimuth and elevation, rendered through a
KEMAR head-related transfer function. What it is in: a room, applied as
convolution against an impulse response. A moving source is a list of
waypoints. The render splits the clip into segments, places each at the
midpoint of its arc, and crossfades them back together. Interpolation takes
the short way round, so 350° to 10° passes through the front and not the back.
That is one of the unit tests.

Thirteen rooms, vocal booth to mausoleum, RT60 from 0.18 s to 12 s. The plan
was to download measured impulse responses from the public acoustics
archives. Most of the links were dead. The fix was a synthesizer in the
standard library: decaying noise, a handful of early reflections, a spectral
tilt, the same recipe plate reverbs have shipped for forty years. A
synthesized cathedral has the decay and the coloration. It lacks the
fingerprint of York Minster, which matters if you are doing forensic
acoustics and not at all if your character is standing in a cathedral.

Every part of this has a floor beneath it. No HRTF file, and the render
approximates with interaural delay and level. No room file, and it skips the
convolution, logs a warning, and finishes. The feature works on a fresh clone
with nothing downloaded. The downloads are an upgrade, not a requirement.

## 2026.05.16 — FOUR STAGES TO A VOICE

No single model gives both a consistent identity and a natural performance,
so the pipeline uses four. Describe the voice in prose and let Qwen3 design
it. Give the character a palette, two to five named states with an approved
reference take each. Have Chatterbox clone every reference fifty to a hundred
times with varied breath and sigh tags: not lines, training data. Train an
RVC model on that synthetic corpus, so it learns to normalize Chatterbox's
own drift. Nobody sat in a booth. In production a script row names its
emotion, the palette picks the reference, Chatterbox performs it, AudioSR
lifts it to 48 kHz, and RVC makes it the same person it was in scene one.

## 2026.05.14 — THE THIRD FACE

The MCP server landed on port 18000. It loads no models and holds no state. It
reads the project off disk and proxies generation to the six servers behind
it. The same day Chatterbox Turbo and the emotional palette arrived, and Qwen3
stepped back from lead voice to the thing that designs voices.

## 2026.05.09 — MASTERING

The render is one ffmpeg filter graph in three stages. Per clip: fade, delay,
gain, pan. Per bus: dialogue high-passed at 80 Hz and doubling as the
sidechain that ducks music and beds beneath it. Master: normalized to −16
LUFS, brick-walled at −1 dBTP, then measured again and the true numbers
written into the sidecar. Dialogue intelligibility above everything. Ducking
is not optional.

## 2026.05.08 — PROSE IN

A Fountain editor, deliberately partial. It knows character cues,
parentheticals, and three additions for audio: SFX, BED, MUSIC. A
parenthetical becomes the delivery direction on the row. Tab cycles a line
through its kinds. Every row carries a stable id in its notes, so recompiling
edited prose finds the row it used to be and carries its placement forward.
Editing the words never moves the clips.

## 2026.04.30 — FIRST STONE

Scaffold, inference pipeline, generation panels, render, timeline, and the
character designer all landed on the first day. May had 195 commits. The
stubs were gone by the second of May and never came back.

## WHAT IS OWED

Thirteen Rust tests and three integration renders, and nothing on the
JavaScript or Python side. Windows is untested. The scene drafter speaks only
to Anthropic. There is still no sample project for a first run, so the first
thing a new user makes is the demo. And an AudioLDM bed still comes out, in
the tracker's words, as articulated static: the code finished and the model
did not.
