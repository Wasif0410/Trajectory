/**
 * Seed entries — STARTER DATA.
 *
 * One day, one note per folder, so every part of the desktop has something in
 * it. Written to be replaced: keep them until the real entries pile up, then
 *
 *   npm run sample:clear
 *
 * Any file carrying `sample: true` in its frontmatter is removed by --clear,
 * so your own entries are never touched.
 */

import fs from 'node:fs'
import path from 'node:path'

const DIR = path.join(process.cwd(), 'content', 'entries')
const MARKER = 'sample: true'

const TODAY = '2026-08-15'

const SAMPLES = [
  {
    date: TODAY,
    slug: 'sync-external-store',
    category: 'professional',
    title: 'A ticking clock belongs in useSyncExternalStore, not an effect',
    tags: ['react'],
    body: `Wrote a clock the obvious way. \`useState\` plus a \`setInterval\` inside
\`useEffect\`. Linter flagged it straight away for setting state directly in an
effect.

Turns out the actual problem is that the time is external state, and React has
a hook built for exactly that:

\`\`\`tsx
const stamp = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
\`\`\`

\`subscribe\` kicks off the interval and hands back the teardown. \`getSnapshot\`
reads the current value. \`getServerSnapshot\` returns a placeholder so the
server render and the first client render agree, which also kills the hydration
warning you get from rendering something that changes every second.

Took about five minutes to swap over and it reads better than what I had.`,
  },
  {
    date: TODAY,
    slug: 'shutter-angle-video',
    category: 'personal',
    title: 'Shutter speed should be double the frame rate when shooting video',
    tags: ['photography', 'video'],
    body: `My handheld clips off the ZV-E10 have looked weirdly stuttery for a
while now and I just assumed my hands were shaky.

Nope. Shutter speed. For video you want it around double your frame rate, so
1/50 at 25fps or 1/60 at 30fps. I'd been letting auto pick and it kept landing
on 1/500, which freezes every single frame so sharply that the motion between
them reads like a slideshow instead of movement.

Annoying bit is you can't just drop to 1/60 outside, everything blows out. Need
an ND filter for that. Ordering one before the next trip.`,
  },
  {
    date: TODAY,
    slug: 'peach-baskets',
    category: 'fact',
    title: 'Basketball was played with actual peach baskets, and no hole',
    tags: ['sports'],
    body: `James Naismith made the game up in 1891 by nailing two peach baskets to
the railing of a gym balcony.

The baskets still had their bottoms in. So every time someone scored, the whole
game stopped while somebody climbed up and fished the ball back out. Took years
before anyone thought to just cut the bottom off.

Best part: the rim is ten feet up purely because that's how high that
particular balcony railing happened to be. Never changed since.`,
  },
]

function frontmatter(entry) {
  return `---
date: ${entry.date}
title: ${JSON.stringify(entry.title)}
category: ${entry.category}
tags: [${entry.tags.join(', ')}]
${MARKER}
---

${entry.body}
`
}

function clear() {
  if (!fs.existsSync(DIR)) return
  let removed = 0

  for (const file of fs.readdirSync(DIR)) {
    const full = path.join(DIR, file)
    if (fs.readFileSync(full, 'utf8').includes(MARKER)) {
      fs.unlinkSync(full)
      removed += 1
    }
  }

  console.log(`Removed ${removed} seed ${removed === 1 ? 'entry' : 'entries'}.`)
}

function seed() {
  fs.mkdirSync(DIR, { recursive: true })

  for (const entry of SAMPLES) {
    fs.writeFileSync(
      path.join(DIR, `${entry.date}-${entry.slug}.mdx`),
      frontmatter(entry),
      'utf8'
    )
  }

  console.log(`Wrote ${SAMPLES.length} seed entries for ${TODAY}.`)
  console.log('Remove them with: npm run sample:clear')
}

if (process.argv.includes('--clear')) {
  clear()
} else {
  seed()
}
