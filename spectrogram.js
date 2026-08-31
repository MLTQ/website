/* XENOZOA — build-time FFT waterfall for audio files.

   Every audio file in static/media/ gets a companion <name>.spectrum.png:
   frequency left to right on a log axis, time down the image, so the plate
   reads the way a live waterfall moves — newest at the bottom, older rows
   having scrolled up. Set TIME_DOWN false to flip it.

   The plate is generated once, cached beside the audio, and regenerated only
   when the source is newer. Commit the PNGs and CI never needs ffmpeg.

   ffmpeg is used only to decode to raw mono float samples. Everything after
   that — window, FFT, log-frequency mapping, colour, PNG encoding — is plain
   Node with zlib, so there is still nothing to npm install. */

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { spawnSync } from 'node:child_process'

export const SPECTRUM_SUFFIX = '.spectrum.png'
export const AUDIO_EXT = /\.(mp3|wav|flac|m4a|aac|ogg|oga|opus)$/i

const RATE = 32000        // decode to this; the right edge is RATE/2
const FFT_N = 2048        // ~15.6 Hz bins at RATE
const W = 1000, H = 220   // plate size in pixels; CSS scales it to the column
const MAX_FRAMES = 2400   // cap the analysis on long files
const DB_FLOOR = -78      // dB below peak that maps to the background colour
const F_MIN = 40          // Hz at the left edge
const TIME_DOWN = true    // newest at the bottom, i.e. the waterfall scrolls up

/* The commit-field palette, extended dark at the top end so loud content
   reads as ink rather than saturating in periwinkle. */
const STOPS = ['#ecedec', '#dfe0e3', '#c9cce9', '#a3a8de', '#8f93d9', '#5f64b4', '#26284a']
const LEVELS = 64

/* --------------------------------------------------------------------- fft */

/* In-place iterative radix-2 Cooley-Tukey. Length must be a power of two. */
function fft(re, im) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t
      t = im[i]; im[i] = im[j]; im[j] = t
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len
    const wr = Math.cos(ang), wi = Math.sin(ang)
    const half = len >> 1
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half
        const vr = re[b] * cr - im[b] * ci
        const vi = re[b] * ci + im[b] * cr
        re[b] = re[a] - vr; im[b] = im[a] - vi
        re[a] += vr; im[a] += vi
        const t = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = t
      }
    }
  }
}

/* ------------------------------------------------------------------ decode */

let ffmpegOk = null
export function hasFfmpeg() {
  if (ffmpegOk === null) {
    ffmpegOk = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0
  }
  return ffmpegOk
}

function decode(file) {
  const r = spawnSync('ffmpeg',
    ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(RATE), '-'],
    { maxBuffer: 1 << 28 })                       // ~35 min of mono audio
  if (r.status !== 0 || !r.stdout || r.stdout.length < FFT_N * 4) return null
  const b = r.stdout
  const n = Math.floor(b.length / 4)
  // .slice gives an aligned copy; a Buffer's byteOffset may not be 4-aligned
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + n * 4))
}

/* ---------------------------------------------------------------- analysis */

/* -> Uint8Array of W*H palette indices, row 0 = earliest (or latest). */
function analyse(pcm) {
  const bins = FFT_N >> 1
  const hop = Math.max(FFT_N >> 1, Math.ceil(pcm.length / MAX_FRAMES))
  const frames = Math.max(1, Math.floor((pcm.length - FFT_N) / hop) + 1)

  const win = new Float64Array(FFT_N)
  for (let i = 0; i < FFT_N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (FFT_N - 1))

  // sum every frame's magnitude spectrum into its output row, then average:
  // decimating by averaging keeps transients that picking one frame would miss
  const acc = new Float64Array(H * bins)
  const cnt = new Uint32Array(H)
  const re = new Float64Array(FFT_N), im = new Float64Array(FFT_N)

  for (let f = 0; f < frames; f++) {
    const off = f * hop
    for (let i = 0; i < FFT_N; i++) { re[i] = (pcm[off + i] || 0) * win[i]; im[i] = 0 }
    fft(re, im)
    const row = Math.min(H - 1, Math.floor(f / frames * H))
    const base = row * bins
    for (let k = 0; k < bins; k++) acc[base + k] += Math.sqrt(re[k] * re[k] + im[k] * im[k])
    cnt[row]++
  }
  for (let y = 0; y < H; y++) {
    if (cnt[y]) { for (let k = 0; k < bins; k++) acc[y * bins + k] /= cnt[y] }
    else if (y) { acc.copyWithin(y * bins, (y - 1) * bins, y * bins) }   // short file: hold
  }

  let peak = 0
  for (let i = 0; i < acc.length; i++) if (acc[i] > peak) peak = acc[i]
  if (peak <= 0) return new Uint8Array(W * H)

  // log frequency axis: each column takes the loudest bin that falls in it,
  // so a narrow tone stays visible where many bins collapse into one column
  const nyq = RATE / 2
  const perBin = RATE / FFT_N
  const edge = new Int32Array(W + 1)
  for (let x = 0; x <= W; x++) {
    const hz = F_MIN * Math.pow(nyq / F_MIN, x / W)
    edge[x] = Math.min(bins - 1, Math.max(0, Math.round(hz / perBin)))
  }

  const out = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    const src = (TIME_DOWN ? y : H - 1 - y) * bins
    const dst = y * W
    for (let x = 0; x < W; x++) {
      let m = 0
      for (let k = edge[x], end = Math.max(edge[x + 1], edge[x] + 1); k < end && k < bins; k++) {
        if (acc[src + k] > m) m = acc[src + k]
      }
      const db = 20 * Math.log10(m / peak || 1e-12)
      const v = Math.max(0, Math.min(1, (db - DB_FLOOR) / -DB_FLOOR))
      out[dst + x] = Math.min(LEVELS - 1, Math.round(v * (LEVELS - 1)))
    }
  }
  return out
}

/* ------------------------------------------------------------- png encoder */

function palette() {
  const rgb = STOPS.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)))
  const out = Buffer.alloc(LEVELS * 3)
  for (let i = 0; i < LEVELS; i++) {
    const t = i / (LEVELS - 1) * (rgb.length - 1)
    const a = Math.min(rgb.length - 1, Math.floor(t)), b = Math.min(rgb.length - 1, a + 1)
    const f = t - a
    for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(rgb[a][c] + (rgb[b][c] - rgb[a][c]) * f)
  }
  return out
}

const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32
    ? zlib.crc32(body) : crc32(body))
  return Buffer.concat([len, body, crc])
}

/* zlib.crc32 only exists on newer Node, so carry a small table fallback */
let TABLE
function crc32(buf) {
  if (!TABLE) {
    TABLE = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      TABLE[n] = c
    }
  }
  let c = -1
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

/* 8-bit indexed PNG: one byte per pixel against a 64-entry palette, which is a
   third of the size of truecolour for data this noisy. */
function writePng(file, idx) {
  const raw = Buffer.alloc(H * (W + 1))
  for (let y = 0; y < H; y++) {
    raw[y * (W + 1)] = 0                                   // filter: none
    Buffer.from(idx.buffer, idx.byteOffset + y * W, W).copy(raw, y * (W + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8; ihdr[9] = 3; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('PLTE', palette()),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]))
}

/* -------------------------------------------------------------------- api */

export const spectrumName = f => f.replace(/\.[^.]+$/, '') + SPECTRUM_SUFFIX

/* Generate a plate for every audio file that lacks a current one.
   Returns { made, skipped, missingFfmpeg } — nothing here throws: a plate is
   an enhancement, and a page without one still renders. */
export function ensureSpectra(mediaDir, log = () => {}) {
  const result = { made: 0, skipped: 0, missingFfmpeg: false }
  if (!fs.existsSync(mediaDir)) return result

  const all = fs.readdirSync(mediaDir)
  const audio = all.filter(f => AUDIO_EXT.test(f))

  // drop plates whose audio has been deleted, so static/media/ doesn't silt up
  const wanted = new Set(audio.map(spectrumName))
  for (const f of all.filter(x => x.endsWith(SPECTRUM_SUFFIX))) {
    if (!wanted.has(f)) {
      fs.unlinkSync(path.join(mediaDir, f))
      log(`  · removed orphaned ${f}`)
    }
  }

  const stale = audio.filter(f => {
    const out = path.join(mediaDir, spectrumName(f))
    if (!fs.existsSync(out)) return true
    return fs.statSync(out).mtimeMs < fs.statSync(path.join(mediaDir, f)).mtimeMs
  })
  if (!stale.length) return result

  if (!hasFfmpeg()) {
    result.missingFfmpeg = true
    result.skipped = stale.length
    return result
  }

  for (const f of stale) {
    const pcm = decode(path.join(mediaDir, f))
    if (!pcm) { result.skipped++; log(`  ! could not decode ${f}`); continue }
    writePng(path.join(mediaDir, spectrumName(f)), analyse(pcm))
    result.made++
    log(`  · waterfall for ${f}`)
  }
  return result
}
