'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { playEat, playGameOver } from '@/lib/audio'

export const COLS = 24
export const ROWS = 14

/** Milliseconds per step, and how much each meal takes off. */
const START_MS = 150
const FLOOR_MS = 75
const SPEEDUP_MS = 4

const POINTS_PER_FOOD = 10

type Point = { x: number; y: number }
type Dir = 'up' | 'down' | 'left' | 'right'

const DELTA: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const OPPOSITE: Record<Dir, Dir> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

const KEYS: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
}

function startingSnake(): Point[] {
  // Head first, so growth is a push onto the front and the tail is the pop.
  return [
    { x: 8, y: 7 },
    { x: 7, y: 7 },
    { x: 6, y: 7 },
  ]
}

/**
 * A cell not currently under the snake. Rejection sampling is fine here: the
 * board is 336 cells and the snake would have to fill most of it before the
 * retries became noticeable, at which point the game is nearly won anyway.
 */
function placeFood(snake: Point[]): Point {
  const taken = new Set(snake.map((p) => `${p.x},${p.y}`))

  if (taken.size >= COLS * ROWS) return { x: -1, y: -1 }

  for (;;) {
    const p = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    }
    if (!taken.has(`${p.x},${p.y}`)) return p
  }
}

interface Props {
  /** Fires whenever the score changes, so the dock can show it. */
  onScore: (score: number) => void
  /** Fires once per death, with the final score. */
  onGameOver: (score: number) => void
}

export function Snake({ onScore, onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const snake = useRef<Point[]>(startingSnake())
  const food = useRef<Point>(placeFood(startingSnake()))
  const dir = useRef<Dir>('right')
  /**
   * Direction changes queue rather than apply immediately. Without this,
   * pressing up then left inside a single tick turns the snake back onto its
   * own neck, which reads as the game killing you for a legal move.
   */
  const queued = useRef<Dir[]>([])
  const score = useRef(0)
  const alive = useRef(true)

  /** Null while alive; the final score once dead. Kept in state rather
   * than read off the ref, because the overlay renders from it. */
  const [over, setOver] = useState<number | null>(null)
  /**
   * Bumped by restart. The loop stops scheduling itself once the snake dies,
   * so resetting the refs is not enough to get it moving again — the effect
   * has to re-run, and this is what tells it to.
   */
  const [runId, setRunId] = useState(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cw = canvas.width / COLS
    const ch = canvas.height / ROWS

    const css = getComputedStyle(canvas)
    const snakeColor = css.getPropertyValue('--snake').trim() || '#6ec36e'
    const foodColor = css.getPropertyValue('--amber').trim() || '#ffb454'
    const gridColor = css.getPropertyValue('--edge').trim() || '#2a2a2e'

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = gridColor
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        ctx.fillRect(x * cw + cw / 2 - 0.5, y * ch + ch / 2 - 0.5, 1, 1)
      }
    }

    ctx.fillStyle = foodColor
    ctx.fillRect(food.current.x * cw, food.current.y * ch, cw - 1, ch - 1)

    snake.current.forEach((p, i) => {
      // The head is full strength and the body fades slightly toward the tail,
      // which makes the direction of travel readable in a still frame.
      ctx.globalAlpha = i === 0 ? 1 : Math.max(0.45, 1 - i * 0.03)
      ctx.fillStyle = snakeColor
      ctx.fillRect(p.x * cw, p.y * ch, cw - 1, ch - 1)
    })
    ctx.globalAlpha = 1
  }, [])

  // Size the backing store to the device pixel ratio, so cells stay crisp
  // instead of being scaled up from CSS pixels.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      draw()
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [draw])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const next = KEYS[e.key] ?? KEYS[e.key.toLowerCase()]
      if (!next) return

      // Arrows scroll the page otherwise, which drags the whole desktop
      // around while you are trying to play.
      e.preventDefault()

      const last = queued.current.at(-1) ?? dir.current
      if (next !== last && next !== OPPOSITE[last]) queued.current.push(next)
    }

    window.addEventListener('keydown', onKey, { passive: false })
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    let timer: number
    let paused = false

    const step = () => {
      if (!alive.current || paused) return

      const heading = queued.current.shift() ?? dir.current
      dir.current = heading

      const head = snake.current[0]
      const next = {
        x: head.x + DELTA[heading].x,
        y: head.y + DELTA[heading].y,
      }

      const hitWall =
        next.x < 0 || next.y < 0 || next.x >= COLS || next.y >= ROWS
      // The tail cell is about to be vacated, so moving into it is legal
      // unless the snake is also growing this step.
      const eating = next.x === food.current.x && next.y === food.current.y
      const body = eating ? snake.current : snake.current.slice(0, -1)
      const hitSelf = body.some((p) => p.x === next.x && p.y === next.y)

      if (hitWall || hitSelf) {
        alive.current = false
        setOver(score.current)
        playGameOver()
        onGameOver(score.current)
        return
      }

      snake.current = [next, ...(eating ? snake.current : snake.current.slice(0, -1))]

      if (eating) {
        score.current += POINTS_PER_FOOD
        food.current = placeFood(snake.current)
        playEat()
        onScore(score.current)
      }

      draw()
      schedule()
    }

    const schedule = () => {
      const eaten = score.current / POINTS_PER_FOOD
      const ms = Math.max(FLOOR_MS, START_MS - eaten * SPEEDUP_MS)
      timer = window.setTimeout(step, ms)
    }

    // A game that keeps running in a hidden tab is a game you come back to
    // having already lost.
    const onVisibility = () => {
      paused = document.hidden
      if (!paused && alive.current) schedule()
      else window.clearTimeout(timer)
    }

    document.addEventListener('visibilitychange', onVisibility)
    schedule()

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [draw, onGameOver, onScore, runId])

  function restart() {
    snake.current = startingSnake()
    food.current = placeFood(snake.current)
    dir.current = 'right'
    queued.current = []
    score.current = 0
    alive.current = true
    onScore(0)
    setOver(null)
    setRunId((id) => id + 1)
  }

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        role="img"
        aria-label={
          over !== null
            ? `Game over. Final score ${over}.`
            : 'Snake game in progress. Use the arrow keys or WASD.'
        }
      />

      {over !== null && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          style={{ background: 'rgba(10, 10, 12, 0.82)' }}
        >
          <p className="mono text-[0.75rem] font-semibold tracking-wider uppercase text-[var(--amber)]">
            Game Over
          </p>
          <button
            type="button"
            autoFocus
            className="hit mono rounded px-3 py-1 text-[0.6875rem] font-semibold tracking-wider uppercase"
            style={{
              background: 'var(--amber)',
              color: '#0a0a0c',
              border: '1px solid var(--amber)',
            }}
            onClick={restart}
          >
            Again ▶
          </button>
        </div>
      )}
    </div>
  )
}
