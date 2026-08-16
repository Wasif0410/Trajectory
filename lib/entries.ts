import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { isCategory, type Entry } from './content'

/**
 * Filesystem-backed content loading. Server-only — importing this from a
 * client component pulls node:fs into the browser bundle and fails the build.
 * Client code should import from `./content` instead.
 */

export const ENTRIES_DIR = path.join(process.cwd(), 'content', 'entries')
export const PAGES_DIR = path.join(process.cwd(), 'content', 'pages')

/**
 * Reads one entry. Throws rather than skipping — a malformed file should fail
 * the build loudly, not silently disappear from the folder it belongs in.
 */
function readEntry(filename: string): Entry {
  const raw = fs.readFileSync(path.join(ENTRIES_DIR, filename), 'utf8')
  const { data, content } = matter(raw)

  const date =
    data.date instanceof Date
      ? data.date.toISOString().slice(0, 10)
      : String(data.date ?? '')

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Entry "${filename}" needs a frontmatter date of YYYY-MM-DD`)
  }
  if (typeof data.title !== 'string' || data.title.trim() === '') {
    throw new Error(`Entry "${filename}" is missing a title`)
  }
  if (!isCategory(data.category)) {
    throw new Error(
      `Entry "${filename}" has category "${data.category}" — expected professional, personal, or fact`
    )
  }

  return {
    slug: filename.replace(/\.mdx?$/, ''),
    date,
    title: data.title.trim(),
    category: data.category,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    body: content.trim(),
  }
}

/** All entries, newest first. */
export function getAllEntries(): Entry[] {
  if (!fs.existsSync(ENTRIES_DIR)) return []

  return fs
    .readdirSync(ENTRIES_DIR)
    .filter((f) => /\.mdx?$/.test(f))
    .map(readEntry)
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))
}

/** Free-form pages (about, roadmap, readme) kept as MDX alongside entries. */
export function getPage(name: string): { title: string; body: string } {
  const file = path.join(PAGES_DIR, `${name}.mdx`)

  if (!fs.existsSync(file)) {
    return { title: name, body: '_Not written yet._' }
  }

  const { data, content } = matter(fs.readFileSync(file, 'utf8'))
  return { title: String(data.title ?? name), body: content.trim() }
}
