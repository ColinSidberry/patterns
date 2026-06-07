'use client'

// Header stopwatch for the per-problem study page, backed by the timing engine
// (lib/timing.ts). Auto-starts when the page mounts for a problem, tagged
// new/review from SRS state. Shows ACTIVE time only — it pauses while the tab
// is hidden or when you pause manually, so the recorded number reflects real
// focus. The session is recorded when you rate the problem (SrsControls), or on
// navigation away (unmount). The pause button is a manual override; ↻ restarts
// the session from zero without recording.
//
// At the 5-minute mark of ACTIVE time it pauses, sounds an alarm, and pops a
// reminder — the "give it 5 minutes, then read the solution" study cue.

import { useEffect, useRef, useState } from 'react'
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

const ALARM_MS = 5 * 60 * 1000

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Best-effort beep via Web Audio — three short pulses, no asset needed. If the
// audio context is blocked (no prior user gesture), the popup still fires.
function playAlarm(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    void ctx.resume?.()
    const now = ctx.currentTime
    for (const t of [0, 0.32, 0.64]) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, now + t)
      gain.gain.exponentialRampToValueAtTime(0.3, now + t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.27)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + t)
      osc.stop(now + t + 0.28)
    }
    setTimeout(() => {
      void ctx.close().catch(() => {})
    }, 1400)
  } catch {
    // Audio unavailable — popup is the reliable signal.
  }
}

export function PageStopwatch({ problemId }: Props) {
  // A tick counter just to force re-render; the real state lives in timing.ts.
  const [, setTick] = useState(0)
  const [running, setRunning] = useState(true)
  const [showAlarm, setShowAlarm] = useState(false)
  const alarmedRef = useRef(false)

  useEffect(() => {
    startTimer(problemId, loadState(problemId) ? 'review' : 'new')
    setRunning(true)
    alarmedRef.current = false
    setShowAlarm(false)
    const id = setInterval(() => {
      // Fire once when active time crosses 5 minutes: pause, beep, pop up.
      if (!alarmedRef.current && isRunning() && elapsedMs() >= ALARM_MS) {
        alarmedRef.current = true
        pauseTimer()
        playAlarm()
        setShowAlarm(true)
      }
      setRunning(isRunning())
      setTick((n) => n + 1)
    }, 500)
    return () => {
      clearInterval(id)
      stopTimer('nav')
    }
  }, [problemId])

  const elapsedSec = Math.floor(elapsedMs() / 1000)
  const overLimit = elapsedMs() >= ALARM_MS

  const toggle = () => {
    if (isRunning()) pauseTimer()
    else resumeTimer()
    setRunning(isRunning())
  }
  const reset = () => {
    restartTimer()
    alarmedRef.current = false
    setShowAlarm(false)
    setRunning(isRunning())
    setTick((n) => n + 1)
  }

  const keepGoing = () => {
    setShowAlarm(false)
    resumeTimer()
    setRunning(true)
  }
  const stayPaused = () => {
    setShowAlarm(false)
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={toggle}
        title={running ? 'Pause stopwatch' : 'Resume stopwatch'}
        className={`text-xs font-mono tabular-nums px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1.5 ${
          overLimit && !running
            ? 'bg-red-900/20 border-red-500/40 text-red-300 hover:bg-red-900/40'
            : running
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

      {showAlarm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={stayPaused}
        >
          <div
            className="max-w-sm w-full rounded-xl border border-amber-500/40 bg-[#1e1e2e] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⏰</span>
              <h2 className="text-base font-semibold text-amber-300">5 minutes up</h2>
            </div>
            <p className="text-sm text-[#cdd6f4] leading-relaxed mb-4">
              If you haven&apos;t gotten traction, open the <span className="font-medium">Reference
              Solution</span> and work through it to understand the pattern — then jot a note on
              exactly where you were blocked before moving on.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={keepGoing}
                className="text-sm px-3 py-1.5 rounded-md border border-[#45475a] text-[#a6adc8] hover:border-[#6c7086] hover:text-[#cdd6f4] transition-colors"
              >
                Keep going
              </button>
              <button
                onClick={stayPaused}
                className="text-sm px-3 py-1.5 rounded-md border border-amber-500/50 bg-amber-900/30 text-amber-200 hover:bg-amber-900/50 transition-colors font-medium"
              >
                Got it — read the solution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
