'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { GridIcon, type IconComponent } from './icons'
import type { OsData, View, WindowState } from './types'

export interface LauncherItem {
  view: View
  label: string
  icon: IconComponent
}

interface Props {
  windows: WindowState[]
  activeId: string | null
  data: OsData
  launcher: readonly LauncherItem[]
  onSelect: (id: string) => void
  open: (view: View) => void
}

/**
 * The wall clock is external state, so it goes through useSyncExternalStore
 * rather than an effect. The server snapshot is 0, which renders a placeholder
 * and keeps hydration from mismatching on a value that changes every second.
 */
let clockSnapshot = 0

function subscribeToClock(onChange: () => void) {
  clockSnapshot = Date.now()
  onChange()

  const id = setInterval(() => {
    clockSnapshot = Date.now()
    onChange()
  }, 1000)

  return () => clearInterval(id)
}

function Clock() {
  const stamp = useSyncExternalStore(
    subscribeToClock,
    () => clockSnapshot,
    () => 0
  )
  const now = stamp ? new Date(stamp) : null

  return (
    <div className="hidden shrink-0 flex-col items-end leading-tight sm:flex">
      <span className="mono text-[0.6875rem] text-[var(--text)]">
        {now ? now.toLocaleTimeString('en-GB') : '--:--:--'}
      </span>
      <span className="chip">
        {now
          ? now.toLocaleDateString('en-CA', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })
          : ''}
      </span>
    </div>
  )
}

export function Taskbar({
  windows,
  activeId,
  data,
  launcher,
  onSelect,
  open,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [menuOpen])

  return (
    <div ref={menuRef} className="relative shrink-0">
      {menuOpen && (
        <div
          className="panel window-enter absolute bottom-full left-2 mb-2 w-60 overflow-hidden rounded-[6px]"
          style={{ zIndex: 10_000 }}
        >
          <div
            className="px-3 py-2.5"
            style={{
              borderBottom: '1px solid var(--edge)',
              background: 'var(--chrome-raised)',
            }}
          >
            <p className="mono text-[0.8125rem] font-semibold text-[var(--amber)]">
              trajectory
            </p>
            <p className="chip mt-0.5">
              {data.stats.total} entries · {data.stats.days} days · {data.stats.streak}d streak
            </p>
          </div>

          <ul className="p-1">
            {launcher.map((item) => {
              const Glyph = item.icon
              return (
                <li key={item.label}>
                  <button
                    type="button"
                    className="hit flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left hover:bg-[var(--amber-wash)]"
                    onClick={() => {
                      open(item.view)
                      setMenuOpen(false)
                    }}
                  >
                    <Glyph className="h-4 w-4 text-[var(--amber-deep)]" />
                    <span className="text-[0.8125rem]">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div
        className="flex h-11 items-center gap-2 px-2"
        style={{
          background: 'var(--chrome)',
          borderTop: '1px solid var(--edge)',
        }}
      >
        <button
          type="button"
          aria-expanded={menuOpen}
          className="hit flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1.5"
          style={{
            background: menuOpen ? 'var(--amber)' : 'var(--chrome-raised)',
            color: menuOpen ? '#0a0a0c' : 'var(--text)',
            border: `1px solid ${menuOpen ? 'var(--amber)' : 'var(--edge-bright)'}`,
          }}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <GridIcon className="h-3.5 w-3.5" />
          <span className="mono text-[0.6875rem] font-semibold tracking-wider uppercase">
            Start
          </span>
        </button>

        <div className="scroll-thin flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {windows.map((win) => {
            const Glyph = win.icon
            const isActive = win.id === activeId && !win.minimized

            return (
              <button
                key={win.id}
                type="button"
                className="hit flex max-w-[11rem] min-w-0 shrink-0 items-center gap-1.5 rounded px-2 py-1.5"
                style={{
                  background: isActive ? 'var(--amber-wash)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--amber-line)' : 'var(--edge)'}`,
                  opacity: win.minimized ? 0.55 : 1,
                }}
                onClick={() => onSelect(win.id)}
              >
                <Glyph className="h-3.5 w-3.5 shrink-0 text-[var(--amber-deep)]" />
                <span className="mono truncate text-[0.6875rem]">{win.title}</span>
              </button>
            )
          })}
        </div>

        <Clock />
      </div>
    </div>
  )
}
