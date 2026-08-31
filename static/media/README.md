# static/media

Images, video and audio for project pages and posts. Drop files here and reference
them as `media/<name>` from anywhere — frontmatter or Markdown body. The build
rewrites the path for each page's depth, so one spelling works everywhere.

    media:
      avenue_fit.png       | ground truth vs reconstruction
      loop:avenue_fit.mp4  | ground truth vs reconstruction
      demo.mp4             | full walkthrough
      scene_03.mp3         | scene 3 — the cistern
      loop:room_tone.wav   | cistern room tone
      slot                 | drop: not shot yet

`loop:` on video plays silently on a loop with no controls — a GIF, at a
fraction of the bytes. Without it, video gets normal playback controls. Audio
never autoplays; `loop:` there only loops, for room tone and drones.

A same-named `.jpg`/`.png`/`.webp` beside a file is picked up automatically: as
a poster frame for video, as cover art for audio. Audio runtime is read from
the file and shown at the end of the caption.

Audio also gets an FFT waterfall. Adding `take.mp3` produces `take.spectrum.png`
beside it, which fills the block above the player: frequency left to right on a
log axis, time down the plate, newest at the bottom. It regenerates only when
the audio is newer, and is removed if the audio goes away. Commit the
`.spectrum.png` files so CI never needs ffmpeg. An explicit `take.jpg` overrides
the waterfall.

In body Markdown, the image syntax covers both:

    ![ground truth vs reconstruction](media/avenue_fit.png)
    ![the rig running](media/demo.mp4)
    ![scene 3 — the cistern](media/scene_03.mp3)

Referencing a file that isn't here fails the build rather than shipping a
broken image. This README is copied into `dist/media/` and is harmless; delete
it once there are real files.

Formats: PNG, JPEG, GIF, WebP, AVIF, SVG for images; MP4, WebM, MOV for video;
MP3, WAV, FLAC, M4A, OGG, Opus for audio. MP4 (H.264 + AAC) and MP3 are the
safest choices. Intrinsic dimensions are read from PNG/JPEG/GIF/WebP headers
and written onto the tag so the page doesn't jump as media loads.
