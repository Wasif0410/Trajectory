# trajectory

A desktop environment for a daily learning log. Not a portfolio.

Every day gets filed into one of three folders: **Professional**, **Personal**,
and **Cool Facts**. The site renders those files as a windowed OS you can
browse, drag around, and stack.

Live entries live in `content/entries/` as MDX, one file per note. Everything
the site displays about totals, days, and streaks is computed from those files
at build time, so the numbers cannot drift from what is actually written.

## Stack

- **Next.js 16** (App Router) on **React 19**
- **MDX** compiled server-side, handed to the client desktop as rendered nodes
- **Tailwind v4** for layout, hand-rolled CSS for the window chrome
- **Web Audio API** for the interface sounds and ambient bed (no audio files)

## Running it

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run sample` | Write the starter entries |
| `npm run sample:clear` | Remove them again |

## Adding an entry

Drop a file in `content/entries/` named `YYYY-MM-DD-some-slug.mdx`:

```mdx
---
date: 2026-08-15
title: "What you worked out"
category: professional
tags: [react]
---

Body goes here.
```

`category` must be `professional`, `personal`, or `fact`. A malformed entry
fails the build rather than disappearing quietly from its folder.

## Layout

```
app/              routes and global styling
components/os/    the desktop: windows, taskbar, icons, views
lib/content.ts    types and pure helpers (safe for the client bundle)
lib/entries.ts    filesystem loading (server only)
lib/audio.ts      synthesised sound
content/          entries, pages, and the context file
```

`lib/content.ts` and `lib/entries.ts` are split deliberately. Anything reachable
from a client component gets bundled for the browser, and `entries.ts` imports
`node:fs`, so the client-facing helpers have to live apart from it.
