import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import projects from '../content/projects.js';
import specimens from '../content/lenia.js';
import { seedSpecimen, specimenKernel, specimenHabitat } from '../static/lenia/specimen.js';

test('every project owns a unique species and exactly one live surface', () => {
  assert.equal(Object.keys(specimens).length, projects.length);
  assert.equal(new Set(Object.values(specimens).map(s => s.code)).size, projects.length);
  for (const project of projects) {
    const s = specimens[project.slug];
    assert.ok(s, project.slug);
    const html = fs.readFileSync(new URL(`../dist/projects/${project.slug}.html`, import.meta.url), 'utf8');
    assert.equal((html.match(/data-lenia data-mode/g) || []).length, 1, project.slug);
    assert.equal((html.match(/<canvas /g) || []).length, 1, project.slug);
    assert.equal((html.match(/type="module" src="\.\.\/lenia\/index.js"/g) || []).length, 1);
    assert.ok(html.includes('href="../lenia/lenia.css"'));
    const data = JSON.parse(html.match(/data-lenia-species>(.*?)<\/script>/s)[1]);
    assert.deepEqual(data, s);
  }
});

test('project seeds and multi-ring kernels fit the bounded single-specimen habitat', () => {
  for (const s of Object.values(specimens)) {
    const habitat = specimenHabitat(s), seed = seedSpecimen(s), kernel = specimenKernel(s);
    assert.equal(seed.length, 96 * 96);
    assert.ok(seed.some(v => v > 0));
    assert.ok(seed.every(v => Number.isFinite(v) && v >= 0 && v <= 1));
    assert.ok(habitat.cellsPerUnit >= 12);
    let sum = 0;
    for (let i = 0; i < kernel.length; i += 4) {
      assert.ok(Math.hypot(kernel[i], kernel[i + 1]) < s.params.R);
      assert.ok(kernel[i + 2] > 0);
      sum += kernel[i + 2];
    }
    assert.ok(Math.abs(sum - 1) < 1e-6, s.name);
    assert.ok(seed.slice(0,96).every(v=>v===0));
  }
  assert.throws(() => seedSpecimen(specimens.bonsai, 8, 8), RangeError);
});
