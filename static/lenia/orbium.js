// Orbium unicaudatus, Bert Chan (MIT). See LICENSE.txt.
export const species = {
  "code": "O2u",
  "name": "Orbium unicaudatus",
  "cname": "球虫(單尾)",
  "params": {
    "R": 13,
    "T": 10,
    "b": "1",
    "m": 0.15,
    "s": 0.015,
    "kn": 1,
    "gn": 1
  },
  "cells": "7.MD6.qL$6.pKqEqFURpApBRAqQ$5.VqTrSsBrOpXpWpTpWpUpCrQ$4.CQrQsTsWsApITNPpGqGvL$3.IpIpWrOsGsBqXpJ4.LsFrL$A.DpKpSpJpDqOqUqSqE5.ExD$qL.pBpTT2.qCrGrVrWqM5.sTpP$.pGpWpD3.qUsMtItQtJ6.tL$.uFqGH3.pXtOuR2vFsK5.sM$.tUqL4.GuNwAwVxBwNpC4.qXpA$2.uH5.vBxGyEyMyHtW4.qIpL$2.wV5.tIyG3yOxQqW2.FqHpJ$2.tUS4.rM2yOyJyOyHtVpPMpFqNV$2.HsR4.pUxAyOxLxDxEuVrMqBqGqKJ$3.sLpE3.pEuNxHwRwGvUuLsHrCqTpR$3.TrMS2.pFsLvDvPvEuPtNsGrGqIP$4.pRqRpNpFpTrNtGtVtStGsMrNqNpF$5.pMqKqLqRrIsCsLsIrTrFqJpHE$6.RpSqJqPqVqWqRqKpRXE$8.OpBpIpJpFTK!"
};

export const SIZE = 64;
export const RADIUS = 13;

export function createSeed() {
  const rows = species.cells.replace('!', '').split('$').map(row => {
    const values = [];
    for (const token of row.matchAll(/(\d*)([p-y]?[A-X]|yO|\.)/g)) {
      const c = token[2];
      const v = c === '.' ? 0 : c.length === 1 ? c.charCodeAt(0) - 64
        : (c.charCodeAt(0) - 112) * 24 + c.charCodeAt(1) - 65 + 25;
      for (let i = 0; i < +(token[1] || 1); i++) values.push(v / 255);
    }
    return values;
  });
  const field = new Float32Array(SIZE * SIZE);
  const left = Math.floor((SIZE - Math.max(...rows.map(r => r.length))) / 2);
  const top = Math.floor((SIZE - rows.length) / 2);
  rows.forEach((row, y) => row.forEach((v, x) => { field[(y + top) * SIZE + x + left] = v; }));
  return field;
}

export function createKernel() {
  const taps = [];
  let sum = 0;
  for (let y = -RADIUS; y <= RADIUS; y++) {
    for (let x = -RADIUS; x <= RADIUS; x++) {
      const r = Math.hypot(x, y) / RADIUS;
      if (r >= 1 || r === 0) continue;
      const w = (4 * r * (1 - r)) ** 4;
      taps.push(x, y, w, 0);
      sum += w;
    }
  }
  for (let i = 2; i < taps.length; i += 4) taps[i] /= sum;
  return new Float32Array(taps);
}
