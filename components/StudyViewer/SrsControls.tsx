'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  applyReview,
  clearState,
  describeInterval,
  getSkippedToday,
  loadState,
  saveState,
  setMastered,
  skipToday,
  unskipToday,
  type Quality,
  type SrsState,
} from '@/lib/srs'
import { getEffectiveGoal, loadGoal } from '@/lib/goal'
import { stopTimer } from '@/lib/timing'

const RATINGS: { q: Quality; label: string; tone: string; hint: string }[] = [
  { q: 0, label: 'Again',  tone: 'bg-red-900/30 border-red-500/40 hover:bg-red-900/50 text-red-300',           hint: 'forgot — retry tomorrow' },
  { q: 3, label: 'Hard',   tone: 'bg-orange-900/30 border-orange-500/40 hover:bg-orange-900/50 text-orange-300', hint: 'recalled but tough' },
  { q: 4, label: 'Good',   tone: 'bg-emerald-900/30 border-emerald-500/40 hover:bg-emerald-900/50 text-emerald-300', hint: 'normal recall' },
  { q: 5, label: 'Easy',   tone: 'bg-cyan-900/30 border-cyan-500/40 hover:bg-cyan-900/50 text-cyan-300',          hint: 'trivial' },
]

export function SrsControls({
  problemId,
  siblings = [],
}: {
  problemId: string
  siblings?: { id: string; title: string }[]
}) {
  const [state, setState] = useState<SrsState | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [justRated, setJustRated] = useState<Quality | null>(null)
  const [isSkipped, setIsSkipped] = useState(false)
  // On a struggle (Again/Hard), suggest the next un-mastered same-pattern
  // problem to cement understanding before moving on.
  const [cement, setCement] = useState<{ id: string; title: string } | null>(null)

  useEffect(() => {
    setState(loadState(problemId))
    setIsSkipped(getSkippedToday().has(problemId))
    setHydrated(true)
  }, [problemId])

  if (!hydrated) {
    return (
      <div className="text-xs text-[#6c7086] italic">Loading review state…</div>
    )
  }

  // Notify same-tab listeners (DueTodayBadge in the header, ReviewQueue,
  // ProgressView, calendar) so they refresh without needing a focus event.
  // Cross-tab updates already work via the native storage event.
  const fireSameTabRefresh = () => {
    try {
      window.dispatchEvent(new StorageEvent('storage', { key: `patterns:srs:${problemId}` }))
    } catch {
      // Older Safari — ignore; cross-tab still works.
    }
  }

  const rate = (q: Quality) => {
    // Rating completes the study session — record the active study time
    // (tagged new/review from when the problem was opened). No-op if already
    // recorded or below the minimum-duration threshold.
    stopTimer('rating')
    // Pass the user's study-day mask so nextDue snaps forward to the next
    // study day instead of landing on a weekend.
    const goal = getEffectiveGoal(loadGoal())
    const next = applyReview(state, q, new Date(), goal.studyDaysMask)
    saveState(problemId, next)
    setState(next)
    setJustRated(q)
    fireSameTabRefresh()
    // Again (0) or Hard (3) = struggled → offer the next un-mastered sibling
    // to cement. Confident ratings clear any prior suggestion.
    if (q === 0 || q === 3) {
      setCement(siblings.find((s) => s.id !== problemId && !loadState(s.id)?.mastered) ?? null)
    } else {
      setCement(null)
    }
  }

  const reset = () => {
    clearState(problemId)
    setState(null)
    setJustRated(null)
    fireSameTabRefresh()
  }

  const toggleMastered = () => {
    const next = setMastered(problemId, !state?.mastered)
    setState(next)
    setJustRated(null)
    fireSameTabRefresh()
  }

  const toggleSkip = () => {
    if (isSkipped) {
      unskipToday(problemId)
      setIsSkipped(false)
    } else {
      skipToday(problemId)
      setIsSkipped(true)
    }
    setJustRated(null)
    fireSameTabRefresh()
  }

  // Calendar-day diff (today vs. nextDue's day), not a millisecond floor.
  // Without this, an interval=1 review just saved at 8pm reads back as
  // "due now" because (nextDue - now) is just under 24h and floors to 0.
  const dueIn = state
    ? (() => {
        const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0)
        const dueMid = new Date(state.nextDue); dueMid.setHours(0, 0, 0, 0)
        return Math.round((dueMid.getTime() - todayMid.getTime()) / 86_400_000)
      })()
    : null

  return (
    <div className="flex flex-col gap-3">
      {state ? (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-[#a6adc8]">
          <span>
            <span className="text-[#6c7086]">Reps:</span>{' '}
            <span className="font-mono text-[#cdd6f4]">{state.reps}</span>
          </span>
          <span>
            <span className="text-[#6c7086]">EF:</span>{' '}
            <span className="font-mono text-[#cdd6f4]">{state.ef.toFixed(2)}</span>
          </span>
          <span>
            <span className="text-[#6c7086]">Interval:</span>{' '}
            <span className="font-mono text-[#cdd6f4]">
              {state.interval}d
            </span>
          </span>
          <span>
            <span className="text-[#6c7086]">Next:</span>{' '}
            <span className={dueIn !== null && dueIn <= 0 ? 'text-amber-400' : 'text-[#cdd6f4]'}>
              {dueIn !== null && dueIn <= 0 ? 'due now' : describeInterval(dueIn ?? 0)}
            </span>
          </span>
          {state.mastered && (
            <span className="text-emerald-300 font-medium">✓ Mastered — out of rotation</span>
          )}
          {isSkipped && !state.mastered && (
            <span className="text-amber-300 font-medium">✓ Skipped today — bottom of queue</span>
          )}
          {justRated !== null && (
            <span className="text-emerald-400">
              ✓ Marked {RATINGS.find((r) => r.q === justRated)?.label}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-[#6c7086] italic">
          Not in your review queue yet. Rate this problem to start tracking it.
        </p>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        {RATINGS.map((r) => (
          <button
            key={r.q}
            onClick={() => rate(r.q)}
            title={r.hint}
            className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${r.tone}`}
          >
            {r.label}
          </button>
        ))}
        {!state?.mastered && (
          <button
            onClick={toggleMastered}
            title="Graduate this problem out of the daily queue. It still counts toward Ready / Ready-to-interview. Use this when a problem is so easy that future reviews are wasted brain space."
            className="px-3 py-1.5 rounded-md border text-sm font-medium transition-colors bg-emerald-900/30 border-emerald-500/40 hover:bg-emerald-900/50 text-emerald-300"
          >
            Mastered
          </button>
        )}
        {state && state.mastered && (
          <button
            onClick={toggleMastered}
            className="px-3 py-1.5 rounded-md border text-sm font-medium transition-colors bg-[#1e1e2e] border-[#45475a] hover:border-[#6c7086] text-[#a6adc8]"
          >
            Reactivate review
          </button>
        )}
        <button
          onClick={toggleSkip}
          title={isSkipped
            ? "This problem is at the bottom of today's queue. Click to restore its normal priority."
            : "Move this problem to the end of today's queue. It stays in the queue and resets to normal priority tomorrow."
          }
          className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
            isSkipped
              ? 'bg-amber-900/30 border-amber-500/40 hover:bg-amber-900/50 text-amber-300'
              : 'bg-[#1e1e2e] border-[#45475a] hover:border-[#585b70] text-[#a6adc8]'
          }`}
        >
          {isSkipped ? '✓ Skipped — undo' : 'Skip'}
        </button>
        {state && (
          <button
            onClick={reset}
            className="ml-auto text-xs text-[#6c7086] hover:text-[#a6adc8] transition-colors"
          >
            Remove from queue
          </button>
        )}
      </div>

      {cement && (
        <div className="rounded-lg border border-indigo-500/40 bg-indigo-900/15 px-4 py-3 flex items-center gap-3">
          <span className="text-indigo-300 text-sm shrink-0">↻</span>
          <p className="text-sm text-indigo-200 flex-1">
            Struggled? Cement it with a same-pattern problem:{' '}
            <Link
              href={`/study/${cement.id}`}
              className="font-medium underline decoration-dotted underline-offset-2 hover:text-indigo-100"
            >
              {cement.title} →
            </Link>
          </p>
        </div>
      )}

      <p className="text-[10px] text-[#6c7086]">
        SM-2 spaced repetition. Stored in your browser only.
      </p>
    </div>
  )
}
