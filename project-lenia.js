import specimens from './content/lenia.js';
import { decodeCells } from './static/lenia/specimen.js';

const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** A true density map of this species remains visible without WebGPU. */
function still(species) {
  const rows = decodeCells(species.cells);
  const width = Math.max(...rows.map(row => row.length)), height = rows.length;
  const side = Math.max(width, height) + 12;
  const rects = rows.flatMap((row, y) => row.flatMap((a, x) => {
    if (a < 0.025) return [];
    const t = Math.min(1, Math.max(0, (a - 0.1) / 0.7));
    const c = [109 + t * 46, 187 - t * 85, 152 + t * 50].map(Math.round);
    return `<rect x="${x + (side - width) / 2}" y="${y + (side - height) / 2}" width="1.1" height="1.1" fill="rgb(${c.join(',')})" opacity="${Math.min(1, a * 3).toFixed(2)}"/>`;
  })).join('');
  return `<svg class="lenia-still" viewBox="0 0 ${side} ${side}" role="img" aria-label="Still density portrait of ${esc(species.name)}">${rects}</svg>`;
}

export function projectLeniaMarkup(slug) {
  const species = specimens[slug];
  if (!species) throw new Error(`No Lenia species assigned to ${slug}`);
  return `<figure class="lenia lenia-project" data-lenia data-mode="still" aria-label="${esc(species.name)} specimen">
<div class="lenia-stage">
${still(species)}
<canvas aria-hidden="true" aria-label="Interactive ${esc(species.name)} jelly. Drag to stretch; arrow keys to nudge; space to pause." aria-describedby="lenia-hint" tabindex="-1"></canvas>
<button class="lenia-reset" type="button" data-reset disabled aria-label="Reset Lenia specimen" title="Reset this creature"><span aria-hidden="true">↺</span> Reset</button>
</div>
<figcaption class="lenia-caption">
<a class="lenia-name" href="https://arxiv.org/pdf/1812.05433" title="Lenia — mathematical life forms, by Bert Chan">${esc(species.name)}</a>
<div><span class="lenia-state"><i aria-hidden="true"></i><span data-status>STILL SPECIMEN</span></span><span class="lenia-actions"><button type="button" data-pause disabled aria-label="Pause Lenia simulation">Pause</button></span></div>
<span class="lenia-project-hint" id="lenia-hint" data-hint>Pet gently. They don’t bite.</span>
</figcaption>
<script type="application/json" data-lenia-species>${JSON.stringify(species).replace(/</g, '\\u003c')}</script>
</figure>
<script type="module" src="../lenia/index.js"></script>`;
}
