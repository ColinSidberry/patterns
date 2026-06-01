'use client'

// Header stopwatch for the per-problem study page. Auto-starts when the
// component mounts (i.e., when the study page is rendered for a problem).
// Click to pause/resume; small ↻ to reset. Resets naturally when navigating
// to a different problem since the route remounts the component.

import { useEffect, useRef, useState } from 'react'

interface Props {
  problemId: string
}

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function PageStopwatch({ problemId: _problemId }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastTickRef = useRef<number>(0)

  // Auto-start on mount; clean up on unmount.
  useEffect(() => {
    lastTickRef.current = performance.now()
    intervalRef.current = setInterval(() => {
      const now = performance.now()
      const dt = (now - lastTickRef.current) / 1000
      lastTickRef.current = now
      setElapsed((e) => e + dt)
    }, 250)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  // React to pause/resume toggles.
  useEffect(() => {
    if (running) {
      if (intervalRef.current) return
      lastTickRef.current = performance.now()
      intervalRef.current = setInterval(() => {
        const now = performance.now()
        const dt = (now - lastTickRef.current) / 1000
        lastTickRef.current = now
        setElapsed((e) => e + dt)
      }, 250)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [running])

  const elapsedSec = Math.floor(elapsed)

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={() => setRunning((r) => !r)}
        title={running ? 'Pause stopwatch' : 'Resume stopwatch'}
        className={`text-xs font-mono tabular-nums px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1.5 ${
          running
            ? 'bg-[#181825] border-[#313244] text-[#cdd6f4] hover:border-[#45475a]'
            : 'bg-amber-900/20 border-amber-500/40 text-amber-300 hover:bg-amber-900/40'
        }`}
      >
        <span>{running ? '⏸' : '▶'}</span>
        <span>{formatMMSS(elapsedSec)}</span>
      </button>
      <button
        onClick={() => setElapsed(0)}
        title="Reset stopwatch"
        className="text-xs text-[#6c7086] hover:text-[#cdd6f4] px-1.5 py-1 transition-colors"
      >
        ↻
      </button>
    </div>
  )
}
