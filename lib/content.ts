/**
 * Shared content types and pure helpers.
 *
 * Deliberately free of node imports: the client desktop needs the labels,
 * formatters, and derived stats, and anything reachable from a client
 * component gets bundled for the browser. Filesystem access lives in
 * `entries.ts`, which imports from here rather than the other way round.
 */

export const CATEGORIES = ['professional', 'personal', 'fact'] as const
export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABEL: Record<Category, string> = {
  professional: 'Professional',
  personal: 'Personal',
  fact: 'Cool Facts',
}

export function isCategory(value: unknown): value is Category {
  return CATEGORIES.includes(value as Category)
}

export interface EntryMeta {
  slug: string
  date: string
  title: string
  category: Category
  tags: string[]
}

export interface Entry extends EntryMeta {
  body: string
}

export interface DaySummary {
  date: string
  total: number
  counts: Record<Category, number>
}

export interface Stats {
  total: number
  days: number
  streak: number
  counts: Record<Category, number>
  firstDate?: string
}

function countByCategory(entries: EntryMeta[]): Record<Category, number> {
  return {
    professional: entries.filter((e) => e.category === 'professional').length,
    personal: entries.filter((e) => e.category === 'personal').length,
    fact: entries.filter((e) => e.category === 'fact').length,
  }
}

/** One summary per day that has entries, newest first. */
export function getDays(entries: EntryMeta[]): DaySummary[] {
  const byDate = new Map<string, EntryMeta[]>()

  entries.forEach((entry) => {
    byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry])
  })

  return [...byDate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayEntries]) => ({
      date,
      total: dayEntries.length,
      counts: countByCategory(dayEntries),
    }))
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function shiftDate(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10)
}

/**
 * Consecutive days ending today or yesterday. Yesterday still counts, because
 * today may simply not be written yet — otherwise every morning shows a zero.
 */
export function getStreak(dates: string[], today = todayISO()): number {
  const seen = new Set(dates)
  let cursor = seen.has(today) ? today : shiftDate(today, -1)
  if (!seen.has(cursor)) return 0

  let streak = 0
  while (seen.has(cursor)) {
    streak += 1
    cursor = shiftDate(cursor, -1)
  }
  return streak
}

export function getStats(entries: EntryMeta[]): Stats {
  const dates = entries.map((e) => e.date)

  return {
    total: entries.length,
    days: new Set(dates).size,
    streak: getStreak(dates),
    counts: countByCategory(entries),
    firstDate: dates.length ? dates[dates.length - 1] : undefined,
  }
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatDateShort(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
