'use client'

import { useState } from 'react'
import type { IconComponent } from './icons'

export interface FileItem {
  key: string
  label: string
  meta?: string
  icon: IconComponent
  onOpen: () => void
}

/**
 * The folder body. Double-click opens, matching the desktop metaphor; on
 * touch a single tap opens, because there is no double-tap convention there.
 */
export function FileGrid({
  items,
  compact,
  empty = 'This folder is empty',
}: {
  items: FileItem[]
  compact: boolean
  empty?: string
}) {
  const [selected, setSelected] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="chip">{empty}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <ul className="grid flex-1 content-start gap-1.5 p-4 [grid-template-columns:repeat(auto-fill,minmax(132px,1fr))]">
        {items.map((item) => {
          const Glyph = item.icon
          const isSelected = selected === item.key

          return (
            <li key={item.key}>
              <button
                type="button"
                className="hit flex w-full flex-col items-center gap-2 rounded px-2 py-4 text-center"
                style={{
                  background: isSelected ? 'var(--amber-wash)' : 'transparent',
                  border: `1px solid ${isSelected ? 'var(--amber-line)' : 'transparent'}`,
                }}
                onClick={() => (compact ? item.onOpen() : setSelected(item.key))}
                onDoubleClick={item.onOpen}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') item.onOpen()
                }}
              >
                <Glyph
                  className="h-12 w-12"
                  style={{ color: isSelected ? 'var(--amber)' : 'var(--amber-deep)' }}
                />
                <span className="mono text-[0.8125rem] leading-tight break-words text-[var(--text)]">
                  {item.label}
                </span>
                {item.meta && <span className="chip">{item.meta}</span>}
              </button>
            </li>
          )
        })}
      </ul>

      <footer
        className="flex shrink-0 items-center justify-between px-3 py-1.5"
        style={{ borderTop: '1px solid var(--edge)' }}
      >
        <span className="chip">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
        <span className="chip">{compact ? 'Tap to open' : 'Double-click to open'}</span>
      </footer>
    </div>
  )
}
