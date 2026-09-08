/**
 * Reports which of the three categories a given day already has.
 *
 * Used by the reminder to decide whether the evening still needs anything
 * written. It only ever reads content/entries, so it knows nothing beyond what
 * is already published in this repository.
 *
 * Usage:
 *   node scripts/report-day.mjs [--date=YYYY-MM-DD]
 */

import fs from 'node:fs'
import path from 'node:path'

const ENTRIES_DIR = path.join(process.cwd(), 'content', 'entries')
const CATEGORIES = ['professional', 'personal', 'fact']

const DATE_ARG = (
  process.argv.find((a) => a.startsWith('--date='))?.split('=')[1] ?? ''
).trim()

if (DATE_ARG && !/^\d{4}-\d{2}-\d{2}$/.test(DATE_ARG)) {
  console.error(`--date must be YYYY-MM-DD, got "${DATE_ARG}"`)
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

/** Categories already filed for a date, read from entry frontmatter. */
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

function emit(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`)
  }
}

const date = DATE_ARG || today()
const filed = categoriesPublishedOn(date)
const missing = CATEGORIES.filter((c) => !filed.has(c))

console.log(`${date}: ${filed.size} of 3 categories filed.`)
if (missing.length) console.log(`Missing: ${missing.join(', ')}`)

emit('missing', missing.join(','))
emit('complete', missing.length === 0 ? 'true' : 'false')
