'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { playClick, playClose, playOpen } from '@/lib/audio'
import { ChevronUpIcon, GamepadIcon } from './icons'

// --- open/closed preference -------------------------------------
// Same shape as the music pref in lib/audio.ts: an external store rather than
// state seeded from an effect, so the dock reads localStorage without a
// setState-in-effect and without a hydration mismatch. Storage access is
// wrapped because it throws outright in a private window, and a dock that
// forgets its state is a far smaller problem than a desktop that will not
// render.

const STORAGE_KEY = 'trajectory:arcade-open'
const openListeners = new Set<() => void>()

function subscribeOpen(onChange: () => void) {
  openListeners.add(onChange)
  return () => openListeners.delete(onChange)
}

/** Closed by default. Only an explicit open is remembered. */
function getOpen(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function getOpenServer(): boolean {
  return false
}

function setOpen(open: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, open ? '1' : '0')
  } catch {
    // Private mode or storage disabled; the session still honours the toggle.
  }
  openListeners.forEach((fn) => fn())
}

/**
 * A board drawn from a static cell map, so the collapsed dock has something to
 * show before any game logic exists. The real game replaces the children of
 * this frame without changing the frame itself.
 */
const PREVIEW_COLS = 24
const PREVIEW_ROWS = 14
const PREVIEW_SNAKE = [
  [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10],
  [4, 9], [4, 8], [4, 7],
]
const PREVIEW_FOOD: [number, number] = [14, 5]

function PreviewBoard() {
  const snake = new Set(PREVIEW_SNAKE.map(([x, y]) => `${x},${y}`))
  const food = `${PREVIEW_FOOD[0]},${PREVIEW_FOOD[1]}`
  const cells: ReactNode[] = []

  for (let y = 0; y < PREVIEW_ROWS; y++) {
    for (let x = 0; x < PREVIEW_COLS; x++) {
      const key = `${x},${y}`
      const isSnake = snake.has(key)
      const isFood = key === food

      cells.push(
        <div
          key={key}
          style={{
            background: isSnake
              ? 'var(--snake)'
              : isFood
                ? 'var(--amber)'
                : 'transparent',
            outline: isSnake || isFood ? 'none' : '1px solid var(--edge)',
            outlineOffset: -1,
            opacity: isSnake || isFood ? 1 : 0.35,
          }}
        />
      )
    }
  }

  return (
    <div
      className="grid h-full w-full"
      style={{
        gridTemplateColumns: `repeat(${PREVIEW_COLS}, 1fr)`,
        gridTemplateRows: `repeat(${PREVIEW_ROWS}, 1fr)`,
        gap: 1,
      }}
    >
      {cells}
    </div>
  )
}

export function ArcadeDock() {
  const open = useSyncExternalStore(subscribeOpen, getOpen, getOpenServer)

  function toggle() {
    const next = !open
    setOpen(next)
    if (next) playOpen()
    else playClose()
  }

  return (
    <section
      // Hidden on compact. A permanent dock on a phone would take most of the
      // screen away from the thing people actually came to read.
      className="hidden shrink-0 md:block"
      style={{ background: 'var(--chrome)', borderTop: '1px solid var(--edge)' }}
      aria-label="Arcade"
    >
      <button
        type="button"
        aria-expanded={open}
        className="hit flex w-full items-center gap-2 px-3 py-1.5 text-left"
        onClick={toggle}
      >
        <GamepadIcon className="h-4 w-4 shrink-0 text-[var(--amber-deep)]" />
        <span className="mono text-[0.6875rem] font-semibold tracking-wider uppercase text-[var(--amber)]">
          Arcade
        </span>
        <span className="chip">Retro Snake</span>
        <ChevronUpIcon
          className="ml-auto h-4 w-4 shrink-0 text-[var(--text-faint)] transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {open && (
        <div
          className="flex gap-4 px-3 pb-3"
          style={{ borderTop: '1px solid var(--edge)', paddingTop: '0.75rem' }}
        >
          <div
            className="aspect-[24/14] h-[9.5rem] shrink-0 rounded-[3px] p-1.5"
            style={{
              background: 'var(--chrome-sunken)',
              border: '1px solid var(--amber-line)',
            }}
          >
            <PreviewBoard />
          </div>

          <div className="flex min-w-0 flex-col justify-between py-0.5">
            <div>
              <h2 className="mono text-[0.8125rem] font-semibold text-[var(--amber)]">
                Retro Snake
              </h2>
              <p className="mt-1 text-[0.75rem] leading-relaxed text-[var(--text-dim)]">
                Eat the dots.
                <br />
                Don&apos;t hit the walls.
                <br />
                Beat your high score.
              </p>
            </div>

            <div>
              <p className="chip">High Score</p>
              <p className="mono text-[0.8125rem] text-[var(--text)]">00000</p>
            </div>
          </div>

          <div className="ml-auto flex items-end">
            <button
              type="button"
              className="hit mono rounded px-4 py-1.5 text-[0.75rem] font-semibold tracking-wider uppercase"
              style={{
                background: 'var(--chrome-raised)',
                border: '1px solid var(--edge-bright)',
                color: 'var(--text-faint)',
                cursor: 'not-allowed',
              }}
              disabled
              onClick={playClick}
            >
              Play ▶
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
