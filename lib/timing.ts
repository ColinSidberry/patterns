// Study-time tracking. A session starts when a problem opens and accumulates
// time while the tab is VISIBLE — reading and thinking with no keypresses
// still counts as studying. It pauses only when the tab is hidden (you switched
// away / locked your phone) or you pause it manually. A session records on
// rating (primary), on navigation away, or via manual stop. Each record is
// stored under its OWN key so the cloud sync (last-write-wins per key) never
// clobbers it; records sync across devices so medians pool all study.

export type TimingType = 'new' | 'review'

export interface TimingRecord {
  problemId: string
  type: TimingType
  activeMs: number
  completedVia: 'rating' | 'manual' | 'nav'
  at: number
}

const PREFIX = 'patterns:timing:'
const MIN_RECORD_MS = 3_000

interface Session {
  problemId: string
  type: TimingType
  activeMs: number
  runningSince: number | null // Date.now() when last resumed; null = paused
  recorded: boolean
}

let session: Session | null = null
let bound = false

function flushRunning(): void {
  if (session && session.runningSince !== null) {
    session.activeMs += Date.now() - session.runningSince
    session.runningSince = null
  }
}

export function elapsedMs(): number {
  if (!session) return 0
  return session.activeMs + (session.runningSince !== null ? Date.now() - session.runningSince : 0)
}

function resume(): void {
  if (session && session.runningSince === null) session.runningSince = Date.now()
}

function onVisibility(): void {
  if (document.hidden) flushRunning()
  else resume()
}

function bind(): void {
  if (bound || typeof window === 'undefined') return
  bound = true
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', () => stopTimer('nav'))
}

// Begin timing a problem. type = 'new' if it had no SRS record when opened,
// else 'review'. Switching problems without stopping records the prior as 'nav'.
export function startTimer(problemId: string, type: TimingType): void {
  if (typeof window === 'undefined') return
  if (session && !session.recorded && session.problemId !== problemId) stopTimer('nav')
  bind()
  session = { problemId, type, activeMs: 0, runningSince: Date.now(), recorded: false }
}

export function stopTimer(completedVia: TimingRecord['completedVia']): TimingRecord | null {
  if (!session || session.recorded) return null
  flushRunning()
  session.recorded = true
  const rec: TimingRecord = {
    problemId: session.problemId,
    type: session.type,
    activeMs: session.activeMs,
    completedVia,
    at: Date.now(),
  }
  if (rec.activeMs >= MIN_RECORD_MS) {
    try {
      localStorage.setItem(`${PREFIX}${rec.at}_${rec.problemId}`, JSON.stringify(rec))
    } catch {
      /* quota */
    }
  }
  return rec
}

// Manual controls (the header stopwatch pause button).
export function isRunning(): boolean {
  return !!session && session.runningSince !== null
}
export function pauseTimer(): void {
  flushRunning()
}
export function resumeTimer(): void {
  resume()
}
// Discard the current session's accumulated time and start fresh (the ↻ reset)
// WITHOUT recording — used when you want to re-time a problem from zero.
export function restartTimer(): void {
  if (!session) return
  session = {
    problemId: session.problemId,
    type: session.type,
    activeMs: 0,
    runningSince: Date.now(),
    recorded: false,
  }
}

// ── Aggregation ────────────────────────────────────────────────────────────

export function readRecords(): TimingRecord[] {
  const out: TimingRecord[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(PREFIX)) continue
      try {
        out.push(JSON.parse(localStorage.getItem(k)!) as TimingRecord)
      } catch {
        /* skip malformed */
      }
    }
  } catch {
    /* localStorage unavailable */
  }
  return out
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

// Median ACTIVE minutes for a type over the most recent `lastN` records.
// Returns null until `minSamples` exist — callers fall back to a constant
// estimate (new ≈ 20 min, review ≈ 6 min) until real data accumulates.
export function medianMinutes(type: TimingType, lastN = 30, minSamples = 5): number | null {
  const recs = readRecords()
    .filter((r) => r.type === type)
    .sort((a, b) => b.at - a.at)
    .slice(0, lastN)
  if (recs.length < minSamples) return null
  const med = median(recs.map((r) => r.activeMs))
  return med === null ? null : med / 60_000
}
