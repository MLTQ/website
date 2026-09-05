/** Original multistate Lenia RLE and polynomial ring kernels (Bert Chan, MIT). */
export function decodeCells(cells) {
  return cells.replace('!', '').split('$').map(row => {
    const values = [];
    for (const [, repeat, code] of row.matchAll(/(\d*)([p-y]?[A-X]|yO|\.)/g)) {
      const value = code === '.' ? 0 : code.length === 1 ? code.charCodeAt(0) - 64
        : (code.charCodeAt(0) - 112) * 24 + code.charCodeAt(1) - 65 + 25;
      for (let i = 0; i < +(repeat || 1); i++) values.push(value / 255);
    }
    return values;
  });
}

export function seedSpecimen(species, width = 96, height = 96) {
  const rows = decodeCells(species.cells);
  const w = Math.max(...rows.map(row => row.length));
  if (w > width || rows.length > height) throw new RangeError('Specimen does not fit its habitat');
  const field = new Float32Array(width * height);
  const left = Math.floor((width - w) / 2), top = Math.floor((height - rows.length) / 2);
  rows.forEach((row, y) => field.set(row, (top + y) * width + left));
  return field;
}

export function specimenKernel({ params }) {
  if (params.kn !== 1 || params.gn !== 1) throw new RangeError('Expected polynomial Lenia rules');
  const bands = params.b.split(',').map(value => {
    const [n, d = 1] = value.split('/').map(Number);
    return n / d;
  });
  const taps = [];
  let sum = 0;
  for (let y = -params.R; y <= params.R; y++) {
    for (let x = -params.R; x <= params.R; x++) {
      const r = Math.hypot(x, y) / params.R;
      if (r >= 1) continue;
      const band = r * bands.length, f = band % 1;
      const weight = (4 * f * (1 - f)) ** 4 * bands[Math.floor(band)];
      if (!weight) continue;
      taps.push(x, y, weight, 0); sum += weight;
    }
  }
  if (!(sum > 0)) throw new RangeError('Empty Lenia kernel');
  for (let i = 2; i < taps.length; i += 4) taps[i] /= sum;
  return new Float32Array(taps);
}

export function specimenHabitat(species) {
  const rows = decodeCells(species.cells);
  return { width: 96, height: 96, cellsPerUnit: Math.max(12, Math.max(rows.length, ...rows.map(r => r.length)) / 2.5),
    viewScale: 1.7, halfWidth: 1.8, centered: true };
}
