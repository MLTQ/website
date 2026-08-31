---
title: The ledger is the site
date: 2026-08-27
summary: Why this thing is a data file and a build script, and what it costs to add a system to it.
tags: Meta, Tooling
draft: false
---

Everything on this site — the six genera, every system row, every commit
field, the DAG at the top of the index, this page — comes out of two files in
`content/` and one script that walks them. There is no CMS, no framework, and
nothing shipped to the browser except HTML and CSS.

That is not a purity exercise. It is the only arrangement where the cost of
logging a system is low enough that I actually do it.

## What a system costs

Adding a system to the ledger is one object in `content/projects.js`:

```js
{
  slug: 'lantern', name: 'LANTERN', genus: 'optica',
  status: 'SEED', featured: false,
  summary: 'One sentence about what it is.',
  log: [{ text: 'the first thing that worked' }],
  heat: { seed: 227, ramp: 'seed' },
  glyph: [{ x: 14, y: 14, w: 28, h: 28, r: '50%' }],
}
```

From that, the build emits the index row, a page at
`projects/lantern.html`, a node and an edge in the DAG, the genus count in the
band, the previous/next links on its neighbours' pages, and a sitemap entry.
Nothing is written twice, so nothing can drift out of sync.

## Two kinds of writing

There are two registers here and they are kept apart on purpose.

- **CHRONICA** is the log: one dated line, no argument, no framing. A thing happened. It is cheap enough to write on the day it happens, which is the whole point.
- **SCRIPTA** — this section — is for pieces that need paragraphs. Post files live in `content/posts/`, one Markdown file each, and a `project:` key in the frontmatter cross-links a post to its system in both directions.

If a note is straining against one line, it wants to be a post. If a post is
one line wearing a coat, it wants to be a log entry.

## Glyphs scale

Each system's mark is a list of rectangles on a 56-unit grid — position, size,
corner radius, rotation, and optionally a border width to make it hollow. The
build scales that same list to 56px for the index and 110px for the page hero,
so a mark is defined once and never redrawn at a second size.

It is a deliberately poor drawing tool. Two or three shapes, periwinkle, and
whatever reads at thumbnail size. The constraint keeps the marks a family
rather than a collection.

## No client-side JavaScript

The commit fields are 182 coloured divs each, and the DAG is an SVG with a
hundred-odd line segments. Both used to be generated in the browser on load.
Now they are generated at build time and arrive as markup.

The site works with scripting disabled, there is nothing to block, and there
is nothing to track. The heat fields are stylized by default — a seeded ramp,
not a claim about my week. Swapping in real numbers is a matter of replacing
`{ seed, ramp }` with `{ counts: [...] }`, one integer per day, oldest first.

## What is still owed

Real commit counts pulled at build time rather than seeded. Media for the
systems whose pages currently carry drop slots. And a domain, which is the one
part of this that a build script cannot decide for me.
