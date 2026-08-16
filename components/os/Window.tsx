'use client'

import type { ReactNode } from 'react'
import { CloseIcon, MaximizeIcon, MinimizeIcon, RestoreIcon } from './icons'
import type { WindowState } from './types'

const MIN_W = 320
const MIN_H = 200

interface Props {
  win: WindowState
  active: boolean
  bounds: { w: number; h: number }
  compact: boolean
  children: ReactNode
  onFocus: (id: string) => void
  onClose: (id: string) => void
  onMinimize: (id: string) => void
  onToggleMax: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  onResize: (id: string, w: number, h: number) => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function Window({
  win,
  active,
  bounds,
  compact,
  children,
  onFocus,
  onClose,
  onMinimize,
  onToggleMax,
  onMove,
  onResize,
}: Props) {
  const filled = compact || win.maximized

  /**
   * Drag and resize share this: capture the pointer origin, then translate
   * every subsequent move against it. Listeners go on window so the drag
   * survives the cursor leaving the titlebar.
   */
  function beginDrag(event: React.PointerEvent) {
    if (filled) return
    onFocus(win.id)

    const startX = event.clientX
    const startY = event.clientY
    const originX = win.x
    const originY = win.y
    document.body.classList.add('dragging')

    const move = (e: PointerEvent) => {
      onMove(
        win.id,
        clamp(originX + e.clientX - startX, 0, Math.max(bounds.w - 140, 0)),
        clamp(originY + e.clientY - startY, 0, Math.max(bounds.h - 44, 0))
      )
    }

    const end = () => {
      document.body.classList.remove('dragging')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
  }

  function beginResize(event: React.PointerEvent) {
    if (filled) return
    event.stopPropagation()
    onFocus(win.id)

    const startX = event.clientX
    const startY = event.clientY
    const originW = win.w
    const originH = win.h
    document.body.classList.add('dragging')

    const move = (e: PointerEvent) => {
      onResize(
        win.id,
        clamp(originW + e.clientX - startX, MIN_W, bounds.w - win.x),
        clamp(originH + e.clientY - startY, MIN_H, bounds.h - win.y)
      )
    }

    const end = () => {
      document.body.classList.remove('dragging')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
  }

  if (win.minimized) return null

  const Glyph = win.icon

  return (
    <section
      className="panel window-enter absolute flex flex-col overflow-hidden rounded-[6px]"
      style={
        filled
          ? { inset: 0, zIndex: win.z }
          : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z }
      }
      onPointerDown={() => onFocus(win.id)}
      aria-label={win.title}
    >
      <header
        className={`${active ? 'titlebar-active' : 'titlebar'} flex shrink-0 items-center gap-2 px-2.5 py-1.5`}
        onPointerDown={beginDrag}
        onDoubleClick={() => !compact && onToggleMax(win.id)}
        style={{ cursor: filled ? 'default' : 'grab' }}
      >
        <Glyph
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: active ? 'var(--amber)' : 'var(--text-faint)' }}
        />
        <h2
          className="mono truncate text-[0.75rem]"
          style={{ color: active ? 'var(--text)' : 'var(--text-dim)' }}
        >
          {win.title}
        </h2>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="Minimise"
            className="hit rounded p-1 hover:bg-white/10"
            style={{ color: 'var(--text-dim)' }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onMinimize(win.id)}
          >
            <MinimizeIcon className="h-3.5 w-3.5" />
          </button>

          {!compact && (
            <button
              type="button"
              aria-label={win.maximized ? 'Restore' : 'Maximise'}
              className="hit rounded p-1 hover:bg-white/10"
              style={{ color: 'var(--text-dim)' }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onToggleMax(win.id)}
            >
              {win.maximized ? (
                <RestoreIcon className="h-3.5 w-3.5" />
              ) : (
                <MaximizeIcon className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          <button
            type="button"
            aria-label="Close"
            className="hit rounded p-1 hover:bg-[var(--amber)] hover:text-black"
            style={{ color: 'var(--text-dim)' }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onClose(win.id)}
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="scroll-thin min-h-0 flex-1 overflow-auto">{children}</div>

      {!filled && (
        <div
          role="presentation"
          onPointerDown={beginResize}
          className="absolute right-0 bottom-0 h-4 w-4 cursor-nwse-resize"
          style={{
            background:
              'linear-gradient(135deg, transparent 50%, var(--edge-bright) 50%, var(--edge-bright) 62%, transparent 62%, transparent 74%, var(--edge-bright) 74%, var(--edge-bright) 86%, transparent 86%)',
          }}
        />
      )}
    </section>
  )
}
