'use client'

// Header stopwatch for the per-problem study page, backed by the timing engine
// (lib/timing.ts). Auto-starts when the page mounts for a problem, tagged
// new/review from SRS state. Shows ACTIVE time only — it auto-pauses while the
// tab is hidden or after ~90s idle, so the recorded number reflects real focus.
// The session is recorded when you rate the problem (SrsControls), or on
// navigation away (unmount). The pause button is a manual override; ↻ restarts
// the session from zero without recording.

import { useEffect, useState } from 'react'
import { loadState } from '@/lib/srs'
import {
  startTimer,
  stopTimer,
  pauseTimer,
  resumeTimer,
  restartTimer,
  isRunning,
  elapsedMs,
} from '@/lib/timing'

interface Props {
  problemId: string
}

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function PageStopwatch({ problemId }: Props) {
  // A tick counter just to force re-render; the real state lives in timing.ts.
  const [, setTick] = useState(0)
  const [running, setRunning] = useState(true)

  useEffect(() => {
    startTimer(problemId, loadState(problemId) ? 'review' : 'new')
    setRunning(true)
    const id = setInterval(() => {
      setRunning(isRunning())
      setTick((n) => n + 1)
    }, 500)
    return () => {
      clearInterval(id)
      stopTimer('nav')
    }
  }, [problemId])

  const elapsedSec = Math.floor(elapsedMs() / 1000)

  const toggle = () => {
    if (isRunning()) pauseTimer()
    else resumeTimer()
    setRunning(isRunning())
  }
  const reset = () => {
    restartTimer()
    setRunning(isRunning())
    setTick((n) => n + 1)
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={toggle}
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
        onClick={reset}
        title="Restart timer from zero (does not record)"
        className="text-xs text-[#6c7086] hover:text-[#cdd6f4] px-1.5 py-1 transition-colors"
      >
        ↻
      </button>
    </div>
  )
}
