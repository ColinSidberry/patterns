'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { describeInterval, getSkippedToday, getStateMap, type SrsState } from '@/lib/srs'
import { calendarDaysBetween, deriveDailyPlan, getEffectiveGoal, loadGoal, selectTodayQueue } from '@/lib/goal'
import type { Difficulty } from '@/data/algo-monster-types'

interface ProblemMeta {
  title: string
  pattern: string | null
  difficulty?: Difficulty
}

interface Props {
  problems: Record<string, ProblemMeta>
  coreIds: string[]
}

// One source of truth for whether a SRS state counts as "fluent".
function isFluentState(s: SrsState | undefined): boolean {
  return !!s && s.reps >= 2 && s.ef >= 2.5
}

// Item shown in any of the three sections.
interface QueueItem {
  id: string
  status: 'new' | 'carryover' | 'review' | 'done' | 'upcoming'
  state: SrsState | null
  daysUntilDue: number   // 0 for new (no state)
  daysLate?: number      // only set when status === 'carryover'
}

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy:   'text-green-400',
  medium: 'text-yellow-400',
  hard:   'text-red-400',
}

export function ReviewQueue({ problems, coreIds }: Props) {
  const [hydrated, setHydrated] = useState(false)
  const [stateMap, setStateMap] = useState<Map<string, SrsState>>(() => new Map())
  const [newPicks, setNewPicks] = useState<QueueItem[]>([])
  const [reviews, setReviews] = useState<QueueItem[]>([])
  const [done, setDone] = useState<QueueItem[]>([])
  const [upcoming, setUpcoming] = useState<QueueItem[]>([])

  const byPattern = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const [id, meta] of Object.entries(problems)) {
      if (!meta.pattern) continue
      if (!m.has(meta.pattern)) m.set(meta.pattern, [])
      m.get(meta.pattern)!.push(id)
    }
    return m
  }, [problems])

  const coreSet = useMemo(() => new Set(coreIds), [coreIds])

  useEffect(() => {
    const refresh = () => {
      const stateById = getStateMap()
      const effective = getEffectiveGoal(loadGoal())
      const plan = deriveDailyPlan(effective, stateById, coreIds)
      const todayQueue = selectTodayQueue(plan, effective, stateById, coreIds)
      const now = new Date()

      // Sections (all bucketing uses calendar-day diff to match the
      // calendar widget's logic — Math.round on millisecond diffs gave
      // wrong results when nextDue is at midnight and "now" is afternoon):
      //   - Due today  = carryover (untouched but scheduled in past
      //                  snapshots) + due reviews (Again-rated, etc.)
      //                  + fresh new picks for today.
      //   - Done today = ANY state rated today and pushed forward
      //                  (lastReviewed=today AND nextDue's calendar day
      //                  is in the future). Includes items not in today's
      //                  snapshot.
      //   - Upcoming   = items whose nextDue lands on the next study day.
      // Today's work splits into two visually-distinct lists:
      //   • newPicks  = first-touch items (carryover + fresh new)
      //                 Do these first — they're the breadth-first quota.
      //   • reviews   = items in SRS rotation that are due today.
      //                 Sorted hardest-first so priority is unambiguous.
      const newPickItems: QueueItem[] = []
      const reviewItems: QueueItem[] = []
      const doneItems: QueueItem[] = []
      const upcomingItems: QueueItem[] = []
      const todayIso = new Date().toDateString()

      for (const { id, daysLate } of todayQueue.carryover) {
        newPickItems.push({ id, status: 'carryover', state: null, daysUntilDue: -daysLate, daysLate })
      }
      for (const id of todayQueue.newIds) {
        newPickItems.push({ id, status: 'new', state: null, daysUntilDue: 0 })
      }
      for (const id of todayQueue.dueIds) {
        const s = stateById.get(id)
        if (!s) continue
        const days = calendarDaysBetween(now, new Date(s.nextDue))
        reviewItems.push({ id, status: 'review', state: s, daysUntilDue: days })
      }

      // Done today: any state rated today AND scheduled forward (or
      // mastered today — both count as "I closed this out today").
      for (const [id, s] of stateById) {
        if (!s.lastReviewed) continue
        const lastReviewedDay = new Date(s.lastReviewed).toDateString()
        if (lastReviewedDay !== todayIso) continue
        const days = calendarDaysBetween(now, new Date(s.nextDue))
        if (s.mastered || days > 0) {
          doneItems.push({ id, status: 'done', state: s, daysUntilDue: days })
        }
      }

      // Upcoming: items due on the user's NEXT study day (skipping any
      // off-days in between). Friday with a Mon-Fri mask → Upcoming
      // previews Monday and bundles Sat/Sun-due items in too, so the
      // user sees the full backlog they'll face when they next sit
      // down. Monday → Upcoming previews Tuesday only.
      const mask = effective.studyDaysMask
      let cursor = new Date(now); cursor.setDate(cursor.getDate() + 1)
      let nextStudyDayOffset = 0
      for (let i = 0; i < 14; i++) {
        if (mask.includes(cursor.getDay())) {
          nextStudyDayOffset = calendarDaysBetween(now, cursor)
          break
        }
        cursor.setDate(cursor.getDate() + 1)
      }
      if (nextStudyDayOffset > 0) {
        for (const [id, s] of stateById) {
          if (s.mastered) continue
          const days = calendarDaysBetween(now, new Date(s.nextDue))
          if (days >= 1 && days <= nextStudyDayOffset) {
            upcomingItems.push({ id, status: 'upcoming', state: s, daysUntilDue: days })
          }
        }
      }

      // Today's skip set: items the user explicitly deprioritized via
      // the Skip button. They stay in the queue but sort to the bottom
      // of whichever list they're in. Clears automatically tomorrow.
      const skipped = getSkippedToday(now)
      const skipRank = (item: QueueItem) => (skipped.has(item.id) ? 1 : 0)

      // New picks: carryover first (most-late at top), then fresh new
      // in coreIds order (stable from input). Skipped items sink to end.
      newPickItems.sort((a, b) => {
        const aSk = skipRank(a), bSk = skipRank(b)
        if (aSk !== bSk) return aSk - bSk
        if (a.status !== b.status) {
          return a.status === 'carryover' ? -1 : 1
        }
        if (a.status === 'carryover' && b.status === 'carryover') {
          return (b.daysLate ?? 0) - (a.daysLate ?? 0)
        }
        return 0
      })
      // Reviews: hardest-first — lowest EF, ties broken by oldest-overdue.
      // Skipped items sink to end.
      reviewItems.sort((a, b) => {
        const aSk = skipRank(a), bSk = skipRank(b)
        if (aSk !== bSk) return aSk - bSk
        const aEf = a.state?.ef ?? 0
        const bEf = b.state?.ef ?? 0
        if (aEf !== bEf) return aEf - bEf
        return a.daysUntilDue - b.daysUntilDue
      })
      doneItems.sort((a, b) =>
        (b.state?.lastReviewed ?? '').localeCompare(a.state?.lastReviewed ?? '')
      )
      upcomingItems.sort((a, b) => a.daysUntilDue - b.daysUntilDue)

      setNewPicks(newPickItems)
      setReviews(reviewItems)
      setDone(doneItems)
      setUpcoming(upcomingItems)
      setStateMap(stateById)
      setHydrated(true)
    }
    refresh()
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    const onStorage = (e: StorageEvent) => {
      if (
        !e.key ||
        e.key.startsWith('patterns:srs:') ||
        e.key.startsWith('patterns:queue:') ||
        e.key === 'patterns:goal'
      ) refresh()
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

  if (!hydrated) {
    return <p className="text-sm text-[#6c7086]">Loading review state…</p>
  }

  if (newPicks.length === 0 && reviews.length === 0 && done.length === 0 && upcoming.length === 0) {
    return (
      <div className="rounded-lg border border-[#313244] bg-[#1e1e2e] px-6 py-10 text-center">
        <p className="text-[#cdd6f4] mb-2">Nothing scheduled. Set a goal to start.</p>
        <p className="text-sm text-[#6c7086]">
          Check{' '}
          <Link href="/progress" className="text-indigo-400 hover:text-indigo-300">progress</Link>
          {' '}to set a target date.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* New picks — do these first; carryover problems sit at the top. */}
      {newPicks.length > 0 && (
        <FlatSection
          title="Today's new"
          accent="cyan"
          items={newPicks}
          problems={problems}
          byPattern={byPattern}
          stateMap={stateMap}
          coreSet={coreSet}
          emptyText=""
        />
      )}

      {/* Reviews — hardest first so priority is unambiguous. */}
      <FlatSection
        title="Reviews"
        accent="amber"
        items={reviews}
        problems={problems}
        byPattern={byPattern}
        stateMap={stateMap}
        coreSet={coreSet}
        emptyText={newPicks.length > 0 ? 'No reviews due today.' : 'Nothing left for today — check Done below or set a goal.'}
      />

      {/* Done — accordion, default closed */}
      <CollapsibleSection
        title="Done today"
        count={done.length}
        defaultOpen={false}
        items={done}
        problems={problems}
        byPattern={byPattern}
        stateMap={stateMap}
        coreSet={coreSet}
      />

      {/* Upcoming — accordion, default closed */}
      <CollapsibleSection
        title="Upcoming"
        count={upcoming.length}
        defaultOpen={false}
        items={upcoming}
        problems={problems}
        byPattern={byPattern}
        stateMap={stateMap}
        coreSet={coreSet}
      />
    </div>
  )
}

function FlatSection({
  title, accent, items, problems, byPattern, stateMap, coreSet, emptyText,
}: {
  title: string
  accent: 'amber' | 'emerald' | 'cyan'
  items: QueueItem[]
  problems: Record<string, ProblemMeta>
  byPattern: Map<string, string[]>
  stateMap: Map<string, SrsState>
  coreSet: Set<string>
  emptyText: string
}) {
  const accentColor =
    accent === 'amber' ? 'text-amber-400' :
    accent === 'emerald' ? 'text-emerald-400' :
    'text-cyan-400'
  return (
    <section>
      <header className="flex items-baseline gap-2 mb-2 px-1">
        <h2 className={`text-sm font-semibold uppercase tracking-wider ${accentColor}`}>
          {title}
        </h2>
        <span className="text-xs text-[#6c7086]">{items.length}</span>
      </header>
      {items.length === 0 ? (
        <p className="text-xs text-[#6c7086] italic px-1">{emptyText}</p>
      ) : (
        <ul className="rounded-lg border border-[#313244] bg-[#1e1e2e] divide-y divide-[#313244]">
          {items.map((it) => (
            <ItemRow
              key={it.id}
              item={it}
              meta={problems[it.id]}
              problems={problems}
              byPattern={byPattern}
              stateMap={stateMap}
              coreSet={coreSet}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function CollapsibleSection({
  title, count, defaultOpen, items, problems, byPattern, stateMap, coreSet,
}: {
  title: string
  count: number
  defaultOpen: boolean
  items: QueueItem[]
  problems: Record<string, ProblemMeta>
  byPattern: Map<string, string[]>
  stateMap: Map<string, SrsState>
  coreSet: Set<string>
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-baseline gap-2 px-1 py-1 hover:bg-[#252537]/40 rounded transition-colors"
      >
        <span className="text-[#6c7086] text-xs font-mono shrink-0" style={{ width: 12 }}>
          {open ? '▾' : '▸'}
        </span>
        <span className="text-sm font-semibold uppercase tracking-wider text-[#a6adc8]">
          {title}
        </span>
        <span className="text-xs text-[#6c7086]">{count}</span>
      </button>
      {open && (
        items.length === 0 ? (
          <p className="text-xs text-[#6c7086] italic px-1 mt-1">Nothing here.</p>
        ) : (
          <ul className="mt-2 rounded-lg border border-[#313244] bg-[#1e1e2e] divide-y divide-[#313244]">
            {items.map((it) => (
              <ItemRow
                key={it.id}
                item={it}
                meta={problems[it.id]}
                problems={problems}
                byPattern={byPattern}
                stateMap={stateMap}
                coreSet={coreSet}
              />
            ))}
          </ul>
        )
      )}
    </section>
  )
}

function ItemRow({
  item, meta, problems, byPattern, stateMap, coreSet,
}: {
  item: QueueItem
  meta: ProblemMeta | undefined
  problems: Record<string, ProblemMeta>
  byPattern: Map<string, string[]>
  stateMap: Map<string, SrsState>
  coreSet: Set<string>
}) {
  const [showSiblings, setShowSiblings] = useState(false)
  const siblingIds = meta?.pattern ? (byPattern.get(meta.pattern) ?? []).filter((id) => id !== item.id) : []

  let trailing: React.ReactNode
  if (item.status === 'new') {
    trailing = <span className="text-[11px] text-cyan-300/80 font-medium">new</span>
  } else if (item.status === 'carryover') {
    const n = item.daysLate ?? 1
    trailing = (
      <span className="text-[11px] font-medium tabular-nums text-orange-400">
        {n}d late
      </span>
    )
  } else if (item.status === 'done') {
    trailing = <span className="text-[11px] text-emerald-400 font-medium">✓ done</span>
  } else if (item.status === 'review') {
    const text =
      item.daysUntilDue === 0 ? 'today' :
      item.daysUntilDue < 0 ? `${-item.daysUntilDue}d overdue` :
      describeInterval(item.daysUntilDue)
    trailing = (
      <>
        {item.state && (
          <span className="text-[11px] text-[#6c7086] font-mono">reps {item.state.reps}</span>
        )}
        <span className="text-xs font-medium tabular-nums text-amber-400">{text}</span>
      </>
    )
  } else {
    // upcoming
    trailing = (
      <>
        {item.state && (
          <span className="text-[11px] text-[#6c7086] font-mono">reps {item.state.reps}</span>
        )}
        <span className="text-xs font-medium tabular-nums text-[#a6adc8]">
          {describeInterval(item.daysUntilDue)}
        </span>
      </>
    )
  }

  return (
    <li>
      <div className="flex items-baseline gap-3 px-4 py-3">
        <Link
          href={`/study/${item.id}`}
          className="flex items-baseline gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
        >
          <span className="text-sm text-[#cdd6f4] flex-1 truncate">{meta?.title ?? item.id}</span>
          {meta?.difficulty && (
            <span className={`text-[10px] uppercase ${DIFFICULTY_COLOR[meta.difficulty]}`}>
              {meta.difficulty}
            </span>
          )}
          {meta?.pattern && (
            <span className="text-[10px] font-mono text-[#6c7086]">{meta.pattern}</span>
          )}
          {trailing}
        </Link>
        {siblingIds.length > 0 && (
          <button
            onClick={() => setShowSiblings((v) => !v)}
            className="text-[10px] text-[#6c7086] hover:text-cyan-300 px-2 py-0.5 rounded border border-[#313244] hover:border-cyan-500/40 transition-colors shrink-0"
            title="Drill a sibling problem instead — original stays queued"
          >
            {showSiblings ? '− siblings' : `+ ${siblingIds.length} siblings`}
          </button>
        )}
      </div>
      {showSiblings && siblingIds.length > 0 && (
        <SiblingList
          ids={siblingIds}
          problems={problems}
          stateMap={stateMap}
          coreSet={coreSet}
        />
      )}
    </li>
  )
}

function SiblingList({
  ids, problems, stateMap, coreSet,
}: {
  ids: string[]
  problems: Record<string, ProblemMeta>
  stateMap: Map<string, SrsState>
  coreSet: Set<string>
}) {
  // Sort: untouched core first (best transfer practice), then untouched extras,
  // then studied (extras + studied core), then fluent at the bottom.
  const ranked = ids.map((id) => {
    const s = stateMap.get(id)
    const isCore = coreSet.has(id)
    let bucket: 0 | 1 | 2 | 3
    if (!s) bucket = isCore ? 0 : 1
    else if (isFluentState(s)) bucket = 3
    else bucket = 2
    return { id, bucket, s, isCore }
  })
  ranked.sort((a, b) => a.bucket - b.bucket)
  const top = ranked.slice(0, 8)
  return (
    <div className="px-4 pb-3 pt-1 bg-[#181825]/40 border-t border-[#313244]">
      <p className="text-[10px] uppercase tracking-wider text-[#6c7086] font-semibold mb-1.5">
        Same pattern · transfer practice
      </p>
      <ul className="flex flex-col gap-1">
        {top.map(({ id, bucket, s, isCore }) => {
          const meta = problems[id]
          const status =
            !s ? (isCore ? 'untouched core' : 'untouched extra')
            : isFluentState(s) ? 'fluent'
            : `reps ${s.reps}`
          const tone =
            !s && isCore ? 'text-cyan-300'
            : !s ? 'text-[#a6adc8]'
            : isFluentState(s) ? 'text-emerald-400'
            : 'text-amber-300'
          return (
            <li key={id}>
              <Link
                href={`/study/${id}`}
                className="flex items-baseline gap-3 px-2 py-1.5 rounded hover:bg-[#252537] transition-colors"
              >
                <span className="text-xs text-[#cdd6f4] flex-1 truncate">
                  {meta?.title ?? id}
                </span>
                {meta?.difficulty && (
                  <span className={`text-[10px] uppercase ${DIFFICULTY_COLOR[meta.difficulty]}`}>
                    {meta.difficulty}
                  </span>
                )}
                <span className={`text-[10px] tabular-nums ${tone}`}>{status}</span>
              </Link>
            </li>
          )
        })}
        {ranked.length > top.length && (
          <li className="text-[10px] text-[#6c7086] italic px-2">
            +{ranked.length - top.length} more in this pattern
          </li>
        )}
      </ul>
    </div>
  )
}
