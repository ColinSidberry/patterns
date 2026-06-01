'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  deriveProgress,
  sortByWeakest,
  summarize,
  type OverallProgress,
  type PatternProgress,
  type PatternStatus,
} from '@/lib/progress'
import { buildVirtualQueue, getStateMap, setMastered } from '@/lib/srs'
import type { CorePatternSummary } from '@/lib/coreCatalog'
import {
  buildCalendar,
  clearGoal,
  deriveDailyPlan,
  getEffectiveGoal,
  hasCommittedGoal,
  loadGoal,
  parseIsoDate,
  saveGoal,
  isoDate,
  type CalendarCell,
  type DailyPlan,
  type DayProblems,
  type Milestones,
  type StudyGoal,
} from '@/lib/goal'
import type { Difficulty } from '@/data/algo-monster-types'
import { GoalCard } from './GoalCard'
import { GoalSetupModal } from './GoalSetupModal'
import { CalendarMonth } from './CalendarMonth'
import { DayDetail } from './DayDetail'

export interface ProgressProblemMeta {
  title: string
  pattern: string | null
  difficulty?: Difficulty
}

interface Props {
  patterns: CorePatternSummary[]
  coreIds: string[]
  problemMeta: Record<string, ProgressProblemMeta>
}

const STATUS_LABEL: Record<PatternStatus, string> = {
  untouched: 'Untouched',
  started: 'Started',
  learning: 'Learning',
  fluent: 'Fluent',
}

const STATUS_DOT: Record<PatternStatus, string> = {
  untouched: 'bg-[#45475a]',
  started: 'bg-amber-400',
  learning: 'bg-cyan-400',
  fluent: 'bg-emerald-400',
}

const STATUS_TEXT: Record<PatternStatus, string> = {
  untouched: 'text-[#6c7086]',
  started: 'text-amber-300',
  learning: 'text-cyan-300',
  fluent: 'text-emerald-300',
}

export function ProgressView({ patterns, coreIds, problemMeta }: Props) {
  const [hydrated, setHydrated] = useState(false)
  const [rows, setRows] = useState<PatternProgress[]>([])
  const [overall, setOverall] = useState<OverallProgress | null>(null)
  const [goal, setGoal] = useState<StudyGoal | null>(null)
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [calendar, setCalendar] = useState<{
    cells: CalendarCell[]
    monthLabel: string
    firstOfMonth: Date
    milestones: Milestones | null
    idsByDay: Map<string, DayProblems>
  } | null>(null)
  const [focusMonth, setFocusMonth] = useState<Date>(() => {
    const d = new Date(); d.setDate(1); return d
  })
  const [showSetup, setShowSetup] = useState(false)
  const [selectedIso, setSelectedIso] = useState<string | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  const handleSelectDay = (iso: string) => {
    setSelectedIso(iso)
    // Surface the panel even if the user has to scroll a bit to see it.
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const stableCoreIds = useMemo(() => coreIds, [coreIds])

  useEffect(() => {
    const refresh = () => {
      const stateById = getStateMap()
      const derived = deriveProgress(patterns, stateById)
      // Always derive a plan against the *effective* goal (saved or default).
      // This way the calendar projection + Today's stats are useful even
      // before the user commits to a target date.
      const saved = loadGoal()
      const effective = getEffectiveGoal(saved)
      const p = deriveDailyPlan(effective, stateById, stableCoreIds)
      setGoal(saved)
      setPlan(p)
      setRows(sortByWeakest(derived))
      setOverall(summarize(derived, p.reviewsDueToday, p.newToday))
      const built = buildCalendar(focusMonth, stateById, effective, p, stableCoreIds)
      setCalendar(built)
      // Default-select today on first hydration so the day-detail panel is
      // populated without requiring a click.
      setSelectedIso((cur) => cur ?? isoDate(new Date()))
      void hasCommittedGoal(saved)
      void buildVirtualQueue
      setHydrated(true)
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
  }, [patterns, stableCoreIds, focusMonth])

  if (!hydrated || !overall) {
    return <p className="text-sm text-[#6c7086]">Loading…</p>
  }

  const handleSaveGoal = (g: StudyGoal) => {
    saveGoal(g)
    setShowSetup(false)
    // Trigger refresh by bumping focusMonth setter (no-op set still re-runs effect).
    setFocusMonth((d) => new Date(d))
  }
  const handleClearGoal = () => {
    clearGoal()
    setShowSetup(false)
    setFocusMonth((d) => new Date(d))
  }
  const handleSlideDeadline = () => {
    if (!goal || !plan || plan.recommendedSlide <= 0) return
    const newDate = parseIsoDate(goal.targetDate)
    newDate.setDate(newDate.getDate() + plan.recommendedSlide)
    saveGoal({ ...goal, targetDate: isoDate(newDate) })
    setFocusMonth((d) => new Date(d))
  }
  const prevMonth = () => setFocusMonth((d) => {
    const x = new Date(d); x.setMonth(x.getMonth() - 1); return x
  })
  const nextMonth = () => setFocusMonth((d) => {
    const x = new Date(d); x.setMonth(x.getMonth() + 1); return x
  })

  return (
    <div className="flex flex-col gap-8">
      <GoalCard
        goal={goal}
        plan={plan}
        onEdit={() => setShowSetup(true)}
        onSlideDeadline={handleSlideDeadline}
      />

      <OverallSummary o={overall} />

      {calendar && (
        <div className="flex flex-col items-center gap-5">
          <div className="w-full max-w-xl">
            <CalendarMonth
              cells={calendar.cells}
              monthLabel={calendar.monthLabel}
              firstOfMonth={calendar.firstOfMonth}
              milestones={calendar.milestones}
              selectedIso={selectedIso}
              onSelectDay={handleSelectDay}
              onPrev={prevMonth}
              onNext={nextMonth}
            />
          </div>
          {selectedIso && (
            <div ref={detailRef} className="w-full max-w-xl scroll-mt-20">
              <DayDetail
                iso={selectedIso}
                ids={calendar.idsByDay.get(selectedIso)}
                problems={problemMeta}
                isToday={selectedIso === isoDate(new Date())}
                isStudyDay={
                  calendar.cells.find((c) => c.iso === selectedIso)?.isStudyDay ?? false
                }
                onClose={() => setSelectedIso(null)}
              />
            </div>
          )}
        </div>
      )}

      <MasteredSection problemMeta={problemMeta} />

      <section>
        <header className="flex items-baseline gap-3 mb-3 px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#a6adc8]">
            Patterns
          </h2>
          <span className="text-xs text-[#6c7086]">weakest first</span>
        </header>
        <ul className="rounded-xl border border-[#313244] bg-[#1e1e2e] divide-y divide-[#313244] overflow-hidden">
          {rows.map((r) => (
            <PatternRow key={r.id} r={r} />
          ))}
        </ul>
      </section>

      {showSetup && (
        <GoalSetupModal
          initial={goal}
          onSave={handleSaveGoal}
          onCancel={() => setShowSetup(false)}
          onClear={goal ? handleClearGoal : undefined}
        />
      )}
    </div>
  )
}

function OverallSummary({ o }: { o: OverallProgress }) {
  const pct = o.coreTotal === 0 ? 0 : Math.round((o.coreStudied / o.coreTotal) * 100)
  const fluentPct = o.patternsTotal === 0 ? 0 : Math.round((o.patternsFluent / o.patternsTotal) * 100)
  return (
    <section className="rounded-2xl border border-[#313244] bg-[#1e1e2e] p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        <Stat
          label="Core studied"
          value={`${o.coreStudied}/${o.coreTotal}`}
          sub={`${pct}%`}
          tone="cyan"
        />
        <Stat
          label="Fluent patterns"
          value={`${o.patternsFluent}/${o.patternsTotal}`}
          sub={`${fluentPct}%`}
          tone="emerald"
        />
        <Stat
          label="Extras done"
          value={`${o.extrasStudied}`}
          sub="non-core"
          tone="amber"
        />
        <Stat
          label="Due today"
          value={`${o.dueToday}`}
          sub="reviews coming back"
          tone="rose"
        />
        <Stat
          label="New today"
          value={`${o.newToday}`}
          sub="planned starts"
          tone="indigo"
        />
      </div>
    </section>
  )
}

function Stat({
  label, value, sub, tone,
}: {
  label: string; value: string; sub: string; tone: 'cyan' | 'emerald' | 'amber' | 'indigo' | 'rose'
}) {
  const color = {
    cyan: 'text-cyan-300',
    emerald: 'text-emerald-300',
    amber: 'text-amber-300',
    indigo: 'text-indigo-300',
    rose: 'text-rose-300',
  }[tone]
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-[#6c7086] mb-1">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-[11px] text-[#6c7086] mt-0.5">{sub}</div>
    </div>
  )
}

function MasteredSection({
  problemMeta,
}: {
  problemMeta: Record<string, ProgressProblemMeta>
}) {
  const [open, setOpen] = useState(false)
  const [tick, setTick] = useState(0)

  const masteredIds = useMemo(() => {
    void tick   // re-derive when toggled
    const stateMap = getStateMap()
    const ids: string[] = []
    for (const [id, s] of stateMap) {
      if (s.mastered) ids.push(id)
    }
    return ids.sort((a, b) => (problemMeta[a]?.title ?? a).localeCompare(problemMeta[b]?.title ?? b))
  }, [problemMeta, tick])

  if (masteredIds.length === 0) return null

  const reactivate = (id: string) => {
    setMastered(id, false)
    setTick((n) => n + 1)
    try {
      window.dispatchEvent(new StorageEvent('storage', { key: `patterns:srs:${id}` }))
    } catch {
      // ignore
    }
  }

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-baseline gap-2 px-1 py-1 hover:bg-[#252537]/40 rounded transition-colors"
      >
        <span className="text-[#6c7086] text-xs font-mono shrink-0" style={{ width: 12 }}>
          {open ? '▾' : '▸'}
        </span>
        <span className="text-sm font-semibold uppercase tracking-wider text-emerald-300">
          Mastered
        </span>
        <span className="text-xs text-[#6c7086]">{masteredIds.length}</span>
        <span className="text-[11px] text-[#6c7086] italic ml-2">graduated out of the daily queue</span>
      </button>
      {open && (
        <ul className="mt-2 rounded-lg border border-[#313244] bg-[#1e1e2e] divide-y divide-[#313244]">
          {masteredIds.map((id) => {
            const meta = problemMeta[id]
            return (
              <li key={id} className="flex items-baseline gap-3 px-4 py-2.5">
                <Link href={`/study/${id}`} className="flex-1 truncate text-sm text-[#cdd6f4] hover:text-emerald-300">
                  {meta?.title ?? id}
                </Link>
                {meta?.pattern && (
                  <span className="text-[10px] font-mono text-[#6c7086] shrink-0">{meta.pattern}</span>
                )}
                <button
                  onClick={() => reactivate(id)}
                  className="text-[11px] text-[#6c7086] hover:text-amber-300 transition-colors shrink-0"
                  title="Put this problem back into the daily review rotation"
                >
                  Reactivate
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function PatternRow({ r }: { r: PatternProgress }) {
  const coverPct = r.coreTotal === 0 ? 0 : (r.coreStudied / r.coreTotal) * 100
  const efText = r.avgEf === null ? '—' : r.avgEf.toFixed(2)
  return (
    <li>
      <Link
        href={`/patterns/${r.id}`}
        className="group flex items-center gap-4 px-4 py-3 hover:bg-[#252537] transition-colors"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[r.status]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-[#cdd6f4] font-medium truncate group-hover:text-indigo-300">
              {r.name}
            </span>
            <span className="text-[10px] text-[#6c7086] font-mono">{r.module}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="w-24 h-1.5 bg-[#313244] rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  r.status === 'fluent' ? 'bg-emerald-400'
                  : r.status === 'learning' ? 'bg-cyan-400'
                  : r.status === 'started' ? 'bg-amber-400'
                  : 'bg-[#45475a]'
                }`}
                style={{ width: `${coverPct}%` }}
              />
            </div>
            <span className="text-[11px] tabular-nums text-[#6c7086]">
              {r.coreStudied}/{r.coreTotal} core
            </span>
            <span className="text-[11px] tabular-nums text-[#6c7086]">EF {efText}</span>
            {r.extraStudied > 0 && (
              <span className="text-[11px] tabular-nums text-amber-300/80">
                +{r.extraStudied} extra
              </span>
            )}
            {r.coreDueNow > 0 && (
              <span className="text-[11px] tabular-nums text-amber-400 font-medium">
                {r.coreDueNow} due
              </span>
            )}
            {r.coreNew > 0 && r.status !== 'untouched' && (
              <span className="text-[11px] tabular-nums text-cyan-300/80">
                {r.coreNew} new
              </span>
            )}
          </div>
        </div>
        <span className={`text-xs font-medium uppercase tracking-wider shrink-0 ${STATUS_TEXT[r.status]}`}>
          {STATUS_LABEL[r.status]}
        </span>
      </Link>
    </li>
  )
}
