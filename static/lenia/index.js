import { createGPU } from './gpu.js';

const root = document.querySelector('[data-lenia]');
if (root) start(root);

async function start(root) {
  const canvas = root.querySelector('canvas');
  const status = root.querySelector('[data-status]');
  const pause = root.querySelector('[data-pause]');
  const reset = root.querySelector('[data-reset]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches;
  let visible = true;
  let failed = false;
  let gpu;
  let observer, sizes;
  let frameID = 0;
  let last = 0;
  let accumulator = 0;
  let age = 0;
  let pointer = null;
  const drag = [0, 0, 0, 0];
  const velocity = [0, 0];
  const target = [0, 0];
  const abort = new AbortController();
  const listen = (el, event, fn, extra = {}) => el.addEventListener(event, fn, { signal: abort.signal, ...extra });
  const fail = error => {
    if (failed) return;
    failed = true;
    cancelAnimationFrame(frameID);
    root.dataset.mode = 'still';
    status.textContent = 'STILL SPECIMEN';
    root.querySelector('[data-hint]').textContent = 'Live in a WebGPU-enabled browser';
    pause.disabled = reset.disabled = true;
    canvas.tabIndex = -1;
    canvas.setAttribute('aria-hidden', 'true');
    observer?.disconnect(); sizes?.disconnect(); abort.abort();
    gpu?.destroy();
    console.warn('Lenia preview:', error);
  };
  try { gpu = await createGPU(canvas, fail); } catch (error) { fail(error.message); return; }
  if (failed) { gpu.destroy(); return; }

  const updateStatus = () => {
    status.textContent = paused ? 'PAUSED' : 'LIVING';
    pause.textContent = paused ? 'Play' : 'Pause';
    pause.setAttribute('aria-label', paused ? 'Play Lenia simulation' : 'Pause Lenia simulation');
    root.dataset.paused = String(paused);
  };
  const draw = count => gpu.frame(count, age, drag);
  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(devicePixelRatio || 1, 1.5, 1050 / Math.max(bounds.width, 1));
    gpu.resize(bounds.width * scale, bounds.height * scale);
    draw(0);
  };
  const schedule = () => {
    if (!frameID && !failed && visible && !document.hidden) frameID = requestAnimationFrame(tick);
  };
  function tick(now) {
    frameID = 0;
    if (failed || !visible || document.hidden) { last = 0; return; }
    if (last && now - last < 1000 / 31) { schedule(); return; }
    const dt = Math.min((now - (last || now)) / 1000, 0.06);
    last = now;
    let spring = false;
    for (let i = 0; i < 2; i++) {
      const desired = pointer === null ? 0 : target[i];
      // Two substeps keep this damped spring stable across slower frames.
      for (let j = 0; j < 2; j++) {
        velocity[i] += ((desired - drag[i]) * 115 - velocity[i] * 9) * dt / 2;
        drag[i] += velocity[i] * dt / 2;
      }
      spring ||= Math.abs(drag[i]) + Math.abs(velocity[i]) > 0.001;
    }
    let steps = 0;
    if (!paused) {
      accumulator += dt * 40;
      steps = Math.min(3, Math.floor(accumulator));
      accumulator -= steps;
      age += dt;
    }
    draw(steps);
    if (!paused || spring || pointer !== null) schedule(); else last = 0;
  }
  const toggle = () => { paused = !paused; last = 0; updateStatus(); schedule(); };
  const release = () => { pointer = null; target.fill(0); root.dataset.dragging = 'false'; schedule(); };
  const nudge = (x, z) => { if (motion.matches) return; velocity[0] += x; velocity[1] += z; schedule(); };
  listen(pause, 'click', toggle);
  listen(reset, 'click', () => {
    gpu.reset(); drag.fill(0); target.fill(0); velocity.fill(0);
    age = accumulator = 0; pointer = null; root.dataset.dragging = 'false'; draw(0); schedule();
  });
  listen(canvas, 'pointerdown', event => {
    if (event.button !== 0 || motion.matches) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    const rect = canvas.getBoundingClientRect();
    drag[2] = (event.clientX - rect.left - rect.width / 2) / rect.height * 4.6;
    drag[3] = (event.clientY - rect.top - rect.height / 2) / rect.height * 5.5;
    canvas.setPointerCapture(event.pointerId);
    root.dataset.dragging = 'true';
    nudge(0.6, -0.8);
    schedule();
  });
  listen(canvas, 'pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const scale = 4.6 / canvas.getBoundingClientRect().height;
    target[0] = Math.max(-0.95, Math.min(0.95, (event.clientX - pointer.x) * scale));
    target[1] = Math.max(-0.95, Math.min(0.95, (event.clientY - pointer.y) * scale * 1.25));
    schedule();
  });
  listen(canvas, 'pointerup', release);
  listen(canvas, 'pointercancel', release);
  listen(canvas, 'lostpointercapture', release);
  listen(canvas, 'keydown', event => {
    if (event.code === 'Space') { event.preventDefault(); toggle(); }
    const impulse = { ArrowLeft: [-3, 0], ArrowRight: [3, 0], ArrowUp: [0, -3], ArrowDown: [0, 3] }[event.key];
    if (impulse) { event.preventDefault(); nudge(...impulse); }
  });
  listen(document, 'visibilitychange', () => {
    last = 0;
    if (document.hidden) { cancelAnimationFrame(frameID); frameID = 0; release(); } else schedule();
  });
  listen(motion, 'change', () => {
    paused = motion.matches;
    if (motion.matches) { drag.fill(0); velocity.fill(0); pointer = null; }
    updateStatus(); schedule();
  });
  observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    last = 0;
    if (visible) schedule(); else { cancelAnimationFrame(frameID); frameID = 0; }
  });
  observer.observe(root);
  sizes = new ResizeObserver(resize);
  sizes.observe(canvas);
  listen(window, 'pagehide', event => {
    cancelAnimationFrame(frameID); frameID = 0;
    if (!event.persisted) { sizes.disconnect(); observer.disconnect(); abort.abort(); gpu.destroy(); }
  });
  listen(window, 'pageshow', () => { last = 0; schedule(); });
  pause.disabled = reset.disabled = false;
  root.dataset.mode = 'live';
  canvas.removeAttribute('aria-hidden');
  canvas.tabIndex = 0;
  updateStatus(); resize(); schedule();
}
