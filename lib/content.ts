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
  /** Consecutive ISO weeks with at least one entry. */
  weekStreak: number
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
 * The Monday of the week a date falls in, as an ISO date. Weeks start Monday
 * to match the Monday and Friday check-in rhythm the log is written on.
 */
function weekStart(iso: string): string {
  const d = new Date(Date.parse(iso))
  // getUTCDay is 0 for Sunday, so Sunday has to reach back six days rather
  // than forward one.
  const back = (d.getUTCDay() + 6) % 7
  return shiftDate(iso, -back)
}

/**
 * Consecutive weeks with at least one entry, counting back from this week or
 * last one.
 *
 * Days were the wrong unit once the log moved to Monday and Friday check-ins:
 * those are never adjacent, so a consecutive-days count is pinned at 1 forever
 * and stops meaning anything. The current week can still be empty without
 * breaking the count, for the same reason today used to be allowed to be —
 * it may simply not have been written yet.
 */
export function getWeekStreak(dates: string[], today = todayISO()): number {
  const weeks = new Set(dates.map(weekStart))
  const thisWeek = weekStart(today)

  let cursor = weeks.has(thisWeek) ? thisWeek : shiftDate(thisWeek, -7)
  if (!weeks.has(cursor)) return 0

  let streak = 0
  while (weeks.has(cursor)) {
    streak += 1
    cursor = shiftDate(cursor, -7)
  }
  return streak
}

export function getStats(entries: EntryMeta[]): Stats {
  const dates = entries.map((e) => e.date)

  return {
    total: entries.length,
    days: new Set(dates).size,
    weekStreak: getWeekStreak(dates),
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

/**
 * How a check-in day is framed. The log is written Monday and Friday, so those
 * two are the bookends of a week rather than two arbitrary dates.
 *
 * Null for any other day. Entries written outside the rhythm are still real
 * entries and should not be labelled as something they are not.
 */
export function checkInLabel(iso: string): string | null {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay()
  if (day === 1) return 'Start of week'
  if (day === 5) return 'End of week'
  return null
}

export function formatDateShort(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
