import { createSeed, SIZE } from './orbium.js';

export const WIDTH = 160;
export const HEIGHT = 112;
export const MIN_GLIDERS = 3;
export const MAX_GLIDERS = 7;
export const STEPS_PER_SECOND = 16;
export const CELLS_PER_UNIT = 16;

const template = createSeed();
const sample = (x, y) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const at = (x, y) => x >= 0 && y >= 0 && x < SIZE && y < SIZE ? template[y * SIZE + x] : 0;
  return (at(ix, iy) * (1 - fx) + at(ix + 1, iy) * fx) * (1 - fy)
    + (at(ix, iy + 1) * (1 - fx) + at(ix + 1, iy + 1) * fx) * fy;
};

/** Rotate the original density field, rather than rotating a rendered copy. */
export function createColony(random = Math.random, requestedCount) {
  const count = requestedCount ?? MIN_GLIDERS + Math.floor(random() * (MAX_GLIDERS - MIN_GLIDERS + 1));
  if (!Number.isInteger(count) || count < MIN_GLIDERS || count > MAX_GLIDERS) throw new RangeError('Expected 3–7 gliders');
  const field = new Float32Array(WIDTH * HEIGHT);
  const slots = Array.from({ length: 12 }, (_, i) => i);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const gliders = slots.slice(0, count).map(slot => ({
    x: 20 + (slot % 4) * 40 + (random() - 0.5) * 5,
    y: HEIGHT / 6 + Math.floor(slot / 4) * HEIGHT / 3 + (random() - 0.5) * 5,
    angle: random() * Math.PI * 2,
  }));
  for (const glider of gliders) {
    const cos = Math.cos(glider.angle), sin = Math.sin(glider.angle);
    for (let y = Math.floor(glider.y) - 18; y <= Math.ceil(glider.y) + 18; y++) {
      for (let x = Math.floor(glider.x) - 18; x <= Math.ceil(glider.x) + 18; x++) {
        const dx = x - glider.x, dy = y - glider.y;
        const value = sample(cos * dx + sin * dy + (SIZE - 1) / 2,
          -sin * dx + cos * dy + (SIZE - 1) / 2);
        const i = ((y + HEIGHT) % HEIGHT) * WIDTH + ((x + WIDTH) % WIDTH);
        field[i] = Math.min(1, field[i] + value);
      }
    }
  }
  return { field, gliders };
}

/** Occupancy counts cells, not mass; tiny surviving values must not be erased. */
export const isEmpty = occupiedCells => occupiedCells === 0;
