'use client'

// 5-minute "understanding" countdown for the My Code fold.
// Click Start when you want the early-signal pressure: if you can't
// articulate the approach by 0:00, peek at the Approach section.
// Total solve time lives separately in the page header (PageStopwatch).

import { useEffect, useRef, useState } from 'react'

interface Props {
  problemId: string  // reserved for future per-problem best-time persistence
}

const COUNTDOWN_SECONDS = 5 * 60

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

type RunState = 'idle' | 'running' | 'paused'

export function SolveTimer({ problemId: _problemId }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const [state, setState] = useState<RunState>('idle')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastTickRef = useRef<number>(0)

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const tick = () => {
    const now = performance.now()
    const dt = (now - lastTickRef.current) / 1000
    lastTickRef.current = now
    setElapsed((e) => e + dt)
  }

  const start = () => {
    if (state === 'running') return
    lastTickRef.current = performance.now()
    intervalRef.current = setInterval(tick, 250)
    setState('running')
  }
  const pause = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setState('paused')
  }
  const reset = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setElapsed(0)
    setState('idle')
  }

  const elapsedSec = Math.floor(elapsed)
  const remaining = Math.max(0, COUNTDOWN_SECONDS - elapsedSec)
  const overTime = Math.max(0, elapsedSec - COUNTDOWN_SECONDS)
  const expired = elapsed >= COUNTDOWN_SECONDS

  const color = expired
    ? 'text-red-500'
    : remaining <= 60
      ? 'text-red-400'
      : remaining <= 120
        ? 'text-amber-300'
        : 'text-emerald-300'

  if (state === 'idle') {
    return (
      <div className="rounded-lg border border-[#313244] bg-[#181825] px-4 py-3 flex items-center gap-3">
        <button
          onClick={start}
          className="text-sm font-medium px-3 py-1.5 rounded-md bg-emerald-900/30 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 transition-colors"
        >
          ▶ Start 5-min timer
        </button>
        <span className="text-xs text-[#6c7086]">
          Early signal: can you articulate the approach in 5 minutes?
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[#313244] bg-[#181825] px-4 py-3 flex items-center gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[#6c7086] font-semibold">
          Understand
        </div>
        <div className={`text-2xl font-mono font-bold tabular-nums leading-tight ${color}`}>
          {expired ? `+${formatMMSS(overTime)}` : formatMMSS(remaining)}
        </div>
        <div className="text-[10px] text-[#6c7086] mt-0.5">
          {expired
            ? 'window expired — try the Approach section'
            : remaining <= 60
              ? 'wrap up'
              : state === 'paused' ? 'paused' : '5-min check-in'}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {state === 'running' ? (
          <button
            onClick={pause}
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-[#313244] hover:bg-[#45475a] text-[#cdd6f4] transition-colors"
          >
            Pause
          </button>
        ) : (
          <button
            onClick={start}
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-emerald-900/30 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 transition-colors"
          >
            Resume
          </button>
        )}
        <button
          onClick={reset}
          className="text-xs text-[#6c7086] hover:text-red-400 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
