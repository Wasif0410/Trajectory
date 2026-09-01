'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { playClick, playClose, playOpen } from '@/lib/audio'
import { CalendarIcon, DocIcon, InfoIcon, LogIcon, RouteIcon } from './icons'
import { ArcadeDock } from './ArcadeDock'
import { Taskbar, type LauncherItem } from './Taskbar'
import { Window } from './Window'
import {
  chromeFor,
  viewKey,
  type OsData,
  type View,
  type WindowState,
} from './types'
import {
  CategoryDocument,
  DayView,
  EntryView,
  LearnedView,
  LogView,
  PageView,
} from './views'

const LAUNCHER: readonly LauncherItem[] = [
  { view: { type: 'learned' }, label: 'What I Learned', icon: CalendarIcon },
  { view: { type: 'log' }, label: 'Daily Log', icon: LogIcon },
  { view: { type: 'roadmap' }, label: 'Roadmap', icon: RouteIcon },
  { view: { type: 'about' }, label: 'About', icon: InfoIcon },
  { view: { type: 'readme' }, label: 'Read Me', icon: DocIcon },
]

const COMPACT_BREAKPOINT = 768

export function Desktop({ data }: { data: OsData }) {
  const [windows, setWindows] = useState<WindowState[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [bounds, setBounds] = useState({ w: 1200, h: 700 })
  const [compact, setCompact] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)

  const surfaceRef = useRef<HTMLDivElement>(null)
  const topZ = useRef(10)
  const opened = useRef(0)

  useEffect(() => {
    const el = surfaceRef.current
    if (!el) return

    const measure = () => {
      setBounds({ w: el.clientWidth, h: el.clientHeight })
      setCompact(window.innerWidth < COMPACT_BREAKPOINT)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const focus = useCallback((id: string) => {
    topZ.current += 1
    const z = topZ.current
    setActiveId(id)
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, z, minimized: false } : w))
    )
  }, [])

  const open = useCallback(
    (view: View) => {
      playOpen()
      const key = viewKey(view)

      setWindows((prev) => {
        const existing = prev.find((w) => viewKey(w.view) === key)
        topZ.current += 1

        if (existing) {
          setActiveId(existing.id)
          return prev.map((w) =>
            w.id === existing.id
              ? { ...w, z: topZ.current, minimized: false }
              : w
          )
        }

        const chrome = chromeFor(view, data)
        const step = opened.current % 7
        opened.current += 1

        const w = Math.min(chrome.w, Math.max(bounds.w - 40, 300))
        const h = Math.min(chrome.h, Math.max(bounds.h - 40, 220))

        const win: WindowState = {
          id: `${key}#${opened.current}`,
          view,
          title: chrome.title,
          icon: chrome.icon,
          x: Math.max(Math.min(56 + step * 30, bounds.w - w - 12), 8),
          y: Math.max(Math.min(40 + step * 26, bounds.h - h - 12), 8),
          w,
          h,
          z: topZ.current,
          minimized: false,
          maximized: false,
        }

        setActiveId(win.id)
        return [...prev, win]
      })
    },
    [bounds.h, bounds.w, data]
  )

  const close = useCallback((id: string) => {
    playClose()
    setWindows((prev) => prev.filter((w) => w.id !== id))
    setActiveId((current) => (current === id ? null : current))
  }, [])

  const minimize = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: true } : w))
    )
    setActiveId((current) => (current === id ? null : current))
  }, [])

  const toggleMax = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w
        if (w.maximized && w.restore) {
          return { ...w, ...w.restore, maximized: false, restore: undefined }
        }
        return {
          ...w,
          maximized: true,
          restore: { x: w.x, y: w.y, w: w.w, h: w.h },
        }
      })
    )
  }, [])

  const move = useCallback((id: string, x: number, y: number) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, x, y } : w)))
  }, [])

  const resize = useCallback((id: string, w: number, h: number) => {
    setWindows((prev) => prev.map((win) => (win.id === id ? { ...win, w, h } : win)))
  }, [])

  const selectFromTaskbar = useCallback(
    (id: string) => {
      const win = windows.find((w) => w.id === id)
      if (!win) return
      if (win.id === activeId && !win.minimized) minimize(id)
      else focus(id)
    },
    [activeId, focus, minimize, windows]
  )

  function body(win: WindowState) {
    const view = win.view

    switch (view.type) {
      case 'learned':
        return <LearnedView data={data} compact={compact} open={open} />
      case 'day':
        return <DayView date={view.date} data={data} compact={compact} open={open} />
      case 'category':
        return (
          <CategoryDocument
            date={view.date}
            category={view.category}
            data={data}
          />
        )
      case 'entry': {
        const entry = data.entries.find((e) => e.slug === view.slug)
        return entry ? <EntryView entry={entry} /> : null
      }
      case 'log':
        return <LogView data={data} open={open} />
      case 'about':
        return <PageView content={data.pages.about.content} />
      case 'roadmap':
        return <PageView content={data.pages.roadmap.content} />
      case 'readme':
        return <PageView content={data.pages.readme.content} />
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={surfaceRef}
        className="desktop-surface relative min-h-0 flex-1 overflow-hidden"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedIcon(null)
            setActiveId(null)
          }
        }}
      >
        <ul className="absolute top-4 left-4 z-0 flex w-[7rem] flex-col gap-2">
          {LAUNCHER.map((item) => {
            const Glyph = item.icon
            const isSelected = selectedIcon === item.label

            return (
              <li key={item.label}>
                <button
                  type="button"
                  className="hit flex w-full flex-col items-center gap-1.5 rounded px-1.5 py-3 text-center"
                  style={{
                    background: isSelected ? 'var(--amber-wash)' : 'transparent',
                    border: `1px solid ${isSelected ? 'var(--amber-line)' : 'transparent'}`,
                  }}
                  onClick={() => {
                    if (compact) {
                      open(item.view)
                    } else {
                      playClick()
                      setSelectedIcon(item.label)
                    }
                  }}
                  onDoubleClick={() => open(item.view)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') open(item.view)
                  }}
                >
                  <Glyph
                    className="h-12 w-12"
                    style={{ color: isSelected ? 'var(--amber)' : 'var(--amber-deep)' }}
                  />
                  <span className="mono text-[0.75rem] leading-tight break-words">
                    {item.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {windows.map((win) => (
          <Window
            key={win.id}
            win={win}
            active={win.id === activeId}
            bounds={bounds}
            compact={compact}
            onFocus={focus}
            onClose={close}
            onMinimize={minimize}
            onToggleMax={toggleMax}
            onMove={move}
            onResize={resize}
          >
            {body(win)}
          </Window>
        ))}
      </div>

      <ArcadeDock />

      <Taskbar
        windows={windows}
        activeId={activeId}
        data={data}
        launcher={LAUNCHER}
        onSelect={selectFromTaskbar}
        open={open}
      />
    </div>
  )
}
