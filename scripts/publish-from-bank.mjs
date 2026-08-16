/**
 * Publishes the top entry from the private bank into content/entries.
 *
 * Runs from the publish workflow with the bank repo checked out alongside.
 * Does nothing if today already has an entry, so writing your own always wins
 * over the bank.
 *
 * The whole bank file is validated on every run. If any entry is malformed the
 * script exits non-zero and publishes nothing, so a typo can never push a
 * broken entry to a public repo.
 *
 * Publishes at most one entry per category, so the workflow can call it once
 * per category and get a separate commit for each. A category with nothing
 * banked is skipped rather than forced, which keeps the output uneven the way
 * real days are.
 *
 * Usage:
 *   node scripts/publish-from-bank.mjs --category=personal [--dry-run]
 */

import fs from 'node:fs'
import path from 'node:path'

const BANK_DIR = process.env.BANK_DIR ?? 'bank'
const ENTRIES_DIR = path.join(process.cwd(), 'content', 'entries')
const LOG_FILE = path.join(BANK_DIR, 'log.md')

/** One queue per category, so a typo in one cannot block the other two. */
const bankFile = (category) => path.join(BANK_DIR, `${category}.md`)

const CATEGORIES = new Set(['professional', 'personal', 'fact'])
const LOW_BANK_THRESHOLD = 3
const DRY_RUN = process.argv.includes('--dry-run')

const REPORT = process.argv.includes('--report')
const PR_TITLE = process.argv.includes('--pr-title')

const CATEGORY = (
  process.argv.find((a) => a.startsWith('--category='))?.split('=')[1] ?? ''
).trim()

if (!REPORT && !PR_TITLE && !CATEGORIES.has(CATEGORY)) {
  console.error(
    `--category is required and must be one of: ${[...CATEGORIES].join(', ')}`
  )
  process.exit(2)
}

/** Today in the log's own timezone, not the runner's UTC. */
function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.LOG_TZ ?? 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * Byte offsets of every entry heading. Only matches "## " at the start of a
 * line, which is why the format docs indent their example — an indented
 * heading inside a comment is not an entry.
 */
function headingOffsets(raw) {
  const re = /^## /gm
  const offsets = []
  let match
  while ((match = re.exec(raw)) !== null) offsets.push(match.index)
  return offsets
}

function parseEntry(chunk, position) {
  const lines = chunk.replace(/^## /, '').split('\n')
  const title = (lines.shift() ?? '').trim()

  const meta = {}
  while (lines.length) {
    const line = lines[0].trim()
    if (line === '') {
      lines.shift()
      break
    }
    const match = line.match(/^([a-z]+):\s*(.*)$/i)
    if (!match) break
    meta[match[1].toLowerCase()] = match[2].trim()
    lines.shift()
  }

  const body = lines.join('\n').trim()
  const problems = []

  if (!title) problems.push('missing a title')
  if (!meta.category) problems.push('missing a category')
  else if (!CATEGORIES.has(meta.category)) {
    problems.push(
      `has category "${meta.category}", expected professional, personal, or fact`
    )
  }
  if (!body) problems.push('has no body text')
  if (meta.date) problems.push('has a date; the workflow stamps that on publish')

  return {
    title,
    category: meta.category,
    tags: meta.tags
      ? meta.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [],
    body,
    problems,
    label: title || `entry ${position + 1}`,
  }
}

function parseBank(raw) {
  const offsets = headingOffsets(raw)

  return offsets.map((start, i) => {
    const end = offsets[i + 1] ?? raw.length
    return { ...parseEntry(raw.slice(start, end), i), start, end }
  })
}

/**
 * Commit subjects for published entries. All of them are general on purpose:
 * a message should read the same whether the entry was written that evening or
 * drawn from the queue.
 *
 * Picked at random rather than fixed, because a log that repeats one string
 * forever is its own kind of tell.
 */
const MESSAGE_TEMPLATES = [
  (category, date) => `content(${category}): publish entry for ${date}`,
  (category) => `content(${category}): update site content`,
  (category) => `content(${category}): expand the learning log`,
  (category) => `content(${category}): add to the archive`,
  (category, date) => `content(${category}): new entry for ${date}`,
]

/** Same idea, phrased for a pull request covering the whole day. */
const PR_TITLE_TEMPLATES = [
  (date) => `content: publish entries for ${date}`,
  () => `content: update site content`,
  () => `content: expand the learning log`,
  (date) => `content: add ${date} to the archive`,
  (date) => `content: new entries for ${date}`,
]

function pickFrom(templates, ...args) {
  return templates[Math.floor(Math.random() * templates.length)](...args)
}

function commitMessage(date) {
  return pickFrom(MESSAGE_TEMPLATES, CATEGORY, date)
}

function frontmatter(entry, date) {
  const tags = entry.tags.length ? `\ntags: [${entry.tags.join(', ')}]` : ''
  return `---
date: ${date}
title: ${JSON.stringify(entry.title)}
category: ${entry.category}${tags}
---

${entry.body}
`
}

function emit(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`)
  }
}

/** Categories already filed for a given date, read from entry frontmatter. */
function categoriesPublishedOn(date) {
  const filed = new Set()

  fs.readdirSync(ENTRIES_DIR)
    .filter((file) => file.startsWith(`${date}-`))
    .forEach((file) => {
      const head = fs.readFileSync(path.join(ENTRIES_DIR, file), 'utf8')
      const match = head.match(/^category:\s*(\w+)\s*$/m)
      if (match) filed.add(match[1])
    })

  return filed
}

/**
 * Reports which categories are still missing for today. The day is only
 * complete when all three are filed, whether by hand or from the bank.
 */
function report() {
  const date = today()
  const filed = categoriesPublishedOn(date)
  const missing = [...CATEGORIES].filter((c) => !filed.has(c))

  console.log(`${date}: ${filed.size} of 3 categories filed.`)
  if (missing.length) console.log(`Missing: ${missing.join(', ')}`)

  emit('missing', missing.join(','))
  emit('complete', missing.length === 0 ? 'true' : 'false')
}

function main() {
  const date = today()

  if (PR_TITLE) {
    console.log(pickFrom(PR_TITLE_TEMPLATES, date))
    return
  }

  if (REPORT) {
    report()
    return
  }

  const BANK_FILE = bankFile(CATEGORY)

  if (!fs.existsSync(BANK_FILE)) {
    console.error(`No queue at ${BANK_FILE}. Is the bank repo checked out?`)
    process.exit(1)
  }

  const raw = fs.readFileSync(BANK_FILE, 'utf8')
  const entries = parseBank(raw)

  // Validate the whole queue, not just the entry being published, so problems
  // surface before they reach the front. Scoped to this category's file, so a
  // typo in one queue cannot block the other two from publishing.
  const broken = entries.filter((e) => e.problems.length)
  if (broken.length) {
    console.error(`${CATEGORY}.md has malformed entries. Publishing nothing.\n`)
    broken.forEach((e) => console.error(`  "${e.label}" ${e.problems.join('; ')}`))
    emit('published', 'false')
    emit('reason', 'invalid-bank')
    process.exit(1)
  }

  // The filename decides the category, so a mismatched category line is a
  // copy-paste slip worth catching rather than silently honouring.
  const mismatched = entries.filter((e) => e.category !== CATEGORY)
  if (mismatched.length) {
    console.error(`${CATEGORY}.md contains entries labelled another category.\n`)
    mismatched.forEach((e) =>
      console.error(`  "${e.label}" says category: ${e.category}`)
    )
    emit('published', 'false')
    emit('reason', 'category-mismatch')
    process.exit(1)
  }

  // Writing your own entry beats the bank for that category.
  if (categoriesPublishedOn(date).has(CATEGORY)) {
    console.log(`${date} already has a ${CATEGORY} entry. Skipping.`)
    emit('published', 'false')
    emit('reason', 'already-written')
    emit('remaining', String(entries.length))
    return
  }

  const target = entries[0]

  if (!target) {
    console.log(`${CATEGORY}.md is empty. Nothing to publish.`)
    emit('published', 'false')
    emit('reason', 'empty')
    emit('remaining', '0')
    return
  }

  const slug = slugify(target.title)
  const filename = `${date}-${slug}.mdx`
  const remaining = entries.length - 1

  console.log(`Publishing "${target.title}" as ${filename}`)
  console.log(`${remaining} left in the bank after this.`)

  if (DRY_RUN) {
    console.log('\n--- dry run, nothing written ---\n')
    console.log(frontmatter(target, date))
    emit('published', 'false')
    emit('reason', 'dry-run')
    emit('remaining', String(entries.length))
    return
  }

  fs.writeFileSync(path.join(ENTRIES_DIR, filename), frontmatter(target, date), 'utf8')

  // Splice the entry out byte-for-byte so the rest of the file keeps its
  // exact formatting.
  fs.writeFileSync(BANK_FILE, raw.slice(0, target.start) + raw.slice(target.end), 'utf8')

  const row = `| ${date} | ${target.title.replace(/\|/g, '\\|')} | ${target.category} | ${slug} |\n`
  fs.appendFileSync(LOG_FILE, row, 'utf8')

  // Conventional-commit subject, so content commits read like the rest of the
  // history instead of a stream of lowercase sentences. The slug keeps each
  // one distinct and greppable. Written to a file so titles containing quotes
  // or apostrophes never have to survive shell escaping.
  if (process.env.MESSAGE_FILE) {
    fs.writeFileSync(process.env.MESSAGE_FILE, `${commitMessage(date)}\n`, 'utf8')
  }

  emit('published', 'true')
  emit('slug', slug)
  emit('title', target.title)
  emit('filename', filename)
  emit('remaining', String(remaining))
  emit('low', remaining < LOW_BANK_THRESHOLD ? 'true' : 'false')
}

main()
