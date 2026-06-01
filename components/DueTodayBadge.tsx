'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getStateMap } from '@/lib/srs'
import { deriveDailyPlan, getEffectiveGoal, loadGoal } from '@/lib/goal'

interface Props {
  coreIds: string[]
}

export function DueTodayBadge({ coreIds }: Props) {
  const [snapshot, setSnapshot] = useState<{
    remaining: number; total: number; completed: number
  } | null>(null)

  useEffect(() => {
    const refresh = () => {
      const stateById = getStateMap()
      const effective = getEffectiveGoal(loadGoal())
      const plan = deriveDailyPlan(effective, stateById, coreIds)
      setSnapshot({
        remaining: plan.remainingToday,
        total: plan.totalToday,
        completed: plan.completedToday,
      })
    }
    refresh()
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith('patterns:srs:') || e.key === 'patterns:goal') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [coreIds])

  if (snapshot === null) return null

  const { remaining, total, completed } = snapshot
  const allDone = remaining === 0 && total > 0

  // When the queue has nothing actionable left (either everything's done
  // or nothing was scheduled), point the user at /progress rather than an
  // empty review page.
  if (remaining === 0) {
    return (
      <Link
        href="/progress"
        className="text-xs font-medium px-3 py-1 rounded-full border transition-colors bg-[#1e1e2e] border-[#313244] text-[#a6adc8] hover:text-emerald-300 hover:border-emerald-500/40"
        title={allDone ? `Done — ${completed} completed today` : 'No plan today'}
      >
        {allDone ? '✓ Progress' : 'Progress'}
      </Link>
    )
  }

  return (
    <Link
      href="/review"
      className="text-xs font-medium px-3 py-1 rounded-full border transition-colors tabular-nums bg-amber-900/30 border-amber-500/50 text-amber-300 hover:bg-amber-900/50"
      title={`${remaining} remaining today (${completed}/${total} done)`}
    >
      {remaining}
    </Link>
  )
}
