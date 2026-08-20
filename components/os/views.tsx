'use client'

import { CATEGORY_LABEL, formatDate, formatDateShort, type Category } from '@/lib/content'
import { FileGrid, type FileItem } from './FileGrid'
import { CalendarIcon } from './icons'
import { CATEGORY_ICON, type OsData, type RenderedEntry, type View } from './types'

interface ViewProps {
  data: OsData
  compact: boolean
  open: (view: View) => void
}

/** "What I Learned" — one folder per day that has entries. */
export function LearnedView({ data, compact, open }: ViewProps) {
  const items: FileItem[] = data.days.map((day) => ({
    key: day.date,
    label: formatDateShort(day.date),
    meta: `${day.total} ${day.total === 1 ? 'item' : 'items'}`,
    icon: CalendarIcon,
    onOpen: () => open({ type: 'day', date: day.date }),
  }))

  return <FileGrid items={items} compact={compact} empty="No entries yet" />
}

/**
 * A single day — the three category folders. Opening one goes straight to the
 * writing; there is no intermediate list of files to click through.
 */
export function DayView({
  date,
  data,
  compact,
  open,
}: ViewProps & { date: string }) {
  const day = data.days.find((d) => d.date === date)

  const items: FileItem[] = (
    ['professional', 'personal', 'fact'] as Category[]
  ).map((category) => {
    const count = day?.counts[category] ?? 0
    return {
      key: category,
      label: CATEGORY_LABEL[category],
      meta: count === 0 ? 'empty' : `${count} ${count === 1 ? 'note' : 'notes'}`,
      icon: CATEGORY_ICON[category],
      onOpen: () => open({ type: 'category', date, category }),
    }
  })

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-3 pt-3">
        <p className="chip">{formatDate(date)}</p>
      </div>
      <div className="min-h-0 flex-1">
        <FileGrid items={items} compact={compact} />
      </div>
    </div>
  )
}

/** The writing itself, shared by the day-category document and single entries. */
function Article({ entry, showTitle }: { entry: RenderedEntry; showTitle: boolean }) {
  return (
    <article>
      {showTitle && (
        <h2 className="mono text-[0.9375rem] leading-snug font-semibold text-[var(--text)]">
          {entry.title}
        </h2>
      )}

      <div className={`prose-os ${showTitle ? 'mt-3' : ''}`}>{entry.content}</div>

      {entry.tags.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <li
              key={tag}
              className="mono rounded px-1.5 py-0.5 text-[0.625rem]"
              style={{
                background: 'var(--amber-wash)',
                color: 'var(--amber)',
                border: '1px solid var(--amber-line)',
              }}
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

/**
 * One category on one day, opened as a document rather than a folder. If the
 * day has several notes filed under the category they stack in the same file,
 * separated by a rule — the way a page of notes actually reads.
 */
export function CategoryDocument({
  date,
  category,
  data,
}: {
  date: string
  category: Category
  data: OsData
}) {
  const entries = data.entries.filter(
    (e) => e.date === date && e.category === category
  )
  const Glyph = CATEGORY_ICON[category]

  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="chip">Nothing filed under {CATEGORY_LABEL[category]} this day</p>
      </div>
    )
  }

  return (
    <div className="px-5 py-4">
      <header className="pb-4" style={{ borderBottom: '1px solid var(--edge)' }}>
        <div className="flex items-center gap-2">
          <Glyph className="h-3.5 w-3.5" style={{ color: 'var(--amber)' }} />
          <span className="chip">{CATEGORY_LABEL[category]}</span>
        </div>
        <p className="mono mt-1.5 text-[0.9375rem] text-[var(--text)]">
          {formatDate(date)}
        </p>
      </header>

      <div className="mt-5 space-y-7">
        {entries.map((entry, i) => (
          <div key={entry.slug}>
            {i > 0 && (
              <hr
                className="mb-7 border-0"
                style={{ borderTop: '1px dashed var(--edge)' }}
              />
            )}
            <Article entry={entry} showTitle />
          </div>
        ))}
      </div>
    </div>
  )
}

/** A single note, opened from the Daily Log. */
export function EntryView({ entry }: { entry: RenderedEntry }) {
  const Glyph = CATEGORY_ICON[entry.category]

  return (
    <div className="px-5 py-4">
      <header className="pb-4" style={{ borderBottom: '1px solid var(--edge)' }}>
        <div className="flex items-center gap-2">
          <Glyph className="h-3.5 w-3.5" style={{ color: 'var(--amber)' }} />
          <span className="chip">{CATEGORY_LABEL[entry.category]}</span>
          <span className="chip">·</span>
          <span className="chip">{entry.date}</span>
        </div>
        <h1 className="mono mt-2 text-[1.0625rem] leading-snug font-semibold">
          {entry.title}
        </h1>
      </header>

      <div className="mt-4">
        <Article entry={entry} showTitle={false} />
      </div>
    </div>
  )
}

/** Everything, newest first — the flat feed across all days and categories. */
export function LogView({ data, open }: Omit<ViewProps, 'compact'>) {
  if (data.entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="chip">No entries yet</p>
      </div>
    )
  }

  return (
    <div>
      <div
        className="sticky top-0 grid grid-cols-[5.5rem_6rem_1fr] gap-3 px-4 py-2"
        style={{ background: 'var(--chrome)', borderBottom: '1px solid var(--edge)' }}
      >
        <span className="chip">Date</span>
        <span className="chip">Category</span>
        <span className="chip">Note</span>
      </div>

      <ul>
        {data.entries.map((entry) => (
          <li key={entry.slug} style={{ borderBottom: '1px solid var(--edge)' }}>
            <button
              type="button"
              className="hit grid w-full grid-cols-[5.5rem_6rem_1fr] gap-3 px-4 py-2 text-left hover:bg-[var(--amber-wash)]"
              onClick={() => open({ type: 'entry', slug: entry.slug })}
            >
              <span className="mono text-[0.6875rem] text-[var(--text-faint)]">
                {entry.date}
              </span>
              <span className="mono text-[0.6875rem] text-[var(--amber-deep)]">
                {CATEGORY_LABEL[entry.category]}
              </span>
              <span className="text-[0.8125rem] leading-snug">{entry.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** About / Roadmap / Read Me — plain prose windows. */
export function PageView({ content }: { content: React.ReactNode }) {
  return <div className="prose-os px-5 py-4">{content}</div>
}
