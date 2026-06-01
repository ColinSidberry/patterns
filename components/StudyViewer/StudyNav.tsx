'use client'

// Prev/Next links in the StudyViewer header that skip problems already
// done today. Walks coreIds from the current entry's position; the next
// (or prev) link points to the closest core problem that hasn't been
// rated today.
//
// Falls back to the static prev/next IDs (raw studyOrder neighbors) when
// the current entry isn't in the curated core list, so non-core problems
// still navigate sensibly.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getStateMap, type SrsState } from '@/lib/srs'
import { isoDate } from '@/lib/goal'

interface Props {
  currentId: string
  coreIds?: string[]
  fallbackPrevId: string | null
  fallbackNextId: string | null
}

function isDoneTodayState(s: SrsState | undefined, todayIso: string): boolean {
  return !!s?.lastReviewed && isoDate(new Date(s.lastReviewed)) === todayIso
}

export function StudyNav({ currentId, coreIds, fallbackPrevId, fallbackNextId }: Props) {
  const [stateMap, setStateMap] = useState<Map<string, SrsState>>(() => new Map())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const refresh = () => {
      setStateMap(getStateMap())
      setHydrated(true)
    }
    refresh()
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith('patterns:srs:')) refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const { prevId, nextId } = useMemo(() => {
    if (!hydrated || !coreIds || coreIds.length === 0) {
      return { prevId: fallbackPrevId, nextId: fallbackNextId }
    }
    const todayIso = isoDate(new Date())
    const idx = coreIds.indexOf(currentId)
    if (idx === -1) {
      // Current entry isn't core — use raw studyOrder neighbors.
      return { prevId: fallbackPrevId, nextId: fallbackNextId }
    }
    // Walk forward for next, backward for prev — skip done-today.
    let next: string | null = null
    for (let i = idx + 1; i < coreIds.length; i++) {
      const id = coreIds[i]
      if (!isDoneTodayState(stateMap.get(id), todayIso)) {
        next = id
        break
      }
    }
    let prev: string | null = null
    for (let i = idx - 1; i >= 0; i--) {
      const id = coreIds[i]
      if (!isDoneTodayState(stateMap.get(id), todayIso)) {
        prev = id
        break
      }
    }
    return { prevId: prev, nextId: next }
  }, [currentId, coreIds, stateMap, hydrated, fallbackPrevId, fallbackNextId])

  return (
    <>
      {prevId ? (
        <Link
          href={`/study/${prevId}`}
          className="text-sm text-[#a6adc8] hover:text-indigo-300 transition-colors px-2 py-1"
          title="Previous undone core problem"
        >
          ← Prev
        </Link>
      ) : (
        <span className="text-sm text-[#45475a] px-2 py-1" title="No earlier undone core problem">
          ← Prev
        </span>
      )}
      {nextId ? (
        <Link
          href={`/study/${nextId}`}
          className="text-sm text-[#a6adc8] hover:text-indigo-300 transition-colors px-2 py-1"
          title="Next undone core problem"
        >
          Next →
        </Link>
      ) : (
        <span className="text-sm text-[#45475a] px-2 py-1" title="All core problems for today are done">
          Next →
        </span>
      )}
    </>
  )
}
