'use client'

import type { CalendarCell, Milestones } from '@/lib/goal'

interface Props {
  cells: CalendarCell[]
  monthLabel: string
  firstOfMonth: Date
  milestones: Milestones | null
  selectedIso: string | null
  onSelectDay: (iso: string) => void
  onPrev: () => void
  onNext: () => void
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Tone for the cell background based on counts and day kind. Past completion
// uses cyan intensity; future review/new uses amber/cyan respectively. The
// non-study future days are dimmed since nothing's planned for them.
function cellTone(c: CalendarCell): string {
  if (c.kind === 'today') return 'bg-indigo-500/30 border-indigo-400 text-indigo-100'

  if (c.kind === 'past') {
    if (c.count === 0) return 'bg-[#181825] border-[#313244] text-[#45475a]'
    if (c.count <= 2) return 'bg-cyan-900/30 border-cyan-700/50 text-cyan-300'
    if (c.count <= 5) return 'bg-cyan-700/40 border-cyan-500/60 text-cyan-100'
    return 'bg-cyan-500/50 border-cyan-300 text-white'
  }
  if (c.kind === 'past-non-study') {
    if (c.count === 0) return 'bg-[#11111b] border-[#1e1e2e] text-[#3a3b4f]'
    return 'bg-cyan-900/15 border-[#313244] text-cyan-400/70'
  }

  // Future days
  if (c.kind === 'future') {
    if (c.count === 0) return 'bg-[#181825] border-[#313244] text-[#45475a]'
    // New problems planned → cyan tint, reviews-only → amber
    if (c.newPlanned > 0 && c.reviewsDue === 0) {
      if (c.count <= 2) return 'bg-cyan-900/25 border-cyan-700/40 text-cyan-300'
      return 'bg-cyan-800/35 border-cyan-500/50 text-cyan-100'
    }
    if (c.newPlanned > 0 && c.reviewsDue > 0) {
      return 'bg-gradient-to-br from-cyan-900/30 to-amber-900/30 border-amber-600/40 text-amber-100'
    }
    if (c.count <= 2) return 'bg-amber-900/20 border-amber-700/40 text-amber-300'
    if (c.count <= 5) return 'bg-amber-800/40 border-amber-500/60 text-amber-200'
    return 'bg-amber-600/50 border-amber-300 text-amber-50'
  }
  // Future non-study
  if (c.count === 0) return 'bg-[#11111b] border-[#1e1e2e] text-[#3a3b4f]'
  return 'bg-amber-900/10 border-[#313244] text-amber-400/60'
}

// Border accent for milestone dates. Stacked: goal > RTI > ready (most specific wins).
function milestoneRing(c: CalendarCell): string {
  if (c.isGoalDate) return 'ring-2 ring-fuchsia-400 ring-offset-1 ring-offset-[#1e1e2e]'
  if (c.isRTIDate) return 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-[#1e1e2e]'
  if (c.isReadyDate) return 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-[#1e1e2e]'
  return ''
}

function cellLabel(c: CalendarCell): string {
  const tags: string[] = [c.iso]
  if (!c.isStudyDay) tags.push('off-day')
  if (c.kind === 'today') tags.push("today's plan")
  if (c.newPlanned > 0) tags.push(`${c.newPlanned} new`)
  if (c.reviewsDue > 0) {
    const verb = c.kind.startsWith('past') ? 'reviewed' : 'reviews due'
    tags.push(`${c.reviewsDue} ${verb}`)
  }
  if (c.isGoalDate) tags.push('GOAL')
  if (c.isRTIDate) tags.push('Ready to interview')
  if (c.isReadyDate) tags.push('Ready')
  return tags.join(' · ')
}

function fmtIso(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

export function CalendarMonth({
  cells, monthLabel, firstOfMonth, milestones, selectedIso, onSelectDay, onPrev, onNext,
}: Props) {
  const today = cells.find((c) => c.kind === 'today')

  return (
    <section>
      <header className="flex items-center gap-3 mb-3 px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#a6adc8]">
          {monthLabel}
        </h2>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onPrev}
            className="text-xs text-[#6c7086] hover:text-[#cdd6f4] px-2 py-1 rounded hover:bg-[#252537] transition-colors"
            aria-label="Previous month"
          >
            ←
          </button>
          {today && (
            <span className="text-[11px] text-[#6c7086]">today {today.iso}</span>
          )}
          <button
            onClick={onNext}
            className="text-xs text-[#6c7086] hover:text-[#cdd6f4] px-2 py-1 rounded hover:bg-[#252537] transition-colors"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </header>

      <div className="rounded-xl border border-[#313244] bg-[#1e1e2e] p-3">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DOW.map((d) => (
            <div key={d} className="text-[10px] uppercase tracking-wider text-[#6c7086] text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c) => {
            const isSelected = selectedIso === c.iso
            return (
              <button
                key={c.iso}
                type="button"
                onClick={() => onSelectDay(c.iso)}
                className={`aspect-square rounded-md border flex flex-col items-center justify-center text-[11px] font-mono cursor-pointer hover:brightness-125 transition ${cellTone(c)} ${milestoneRing(c)} ${
                  c.inMonth ? '' : 'opacity-40'
                } ${isSelected ? 'outline outline-2 outline-[#cdd6f4] outline-offset-1' : ''}`}
                title={cellLabel(c)}
              >
                <span className="leading-none text-[10px] opacity-70">{c.date.getDate()}</span>
                {c.count > 0 && (
                  <span className="leading-none mt-0.5 font-bold">{c.count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Milestone summary */}
      {milestones && (milestones.readyIso || milestones.readyToInterviewIso) && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <MilestoneChip
            tone="yellow"
            label="Projected — Ready"
            sub="seen each core ≥1 time"
            iso={milestones.readyIso}
          />
          <MilestoneChip
            tone="emerald"
            label="Projected — Ready to interview"
            sub="fluent on every core"
            iso={milestones.readyToInterviewIso}
          />
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 px-1 text-[11px] text-[#6c7086]">
        <Legend swatch="bg-cyan-700/40 border-cyan-500/60" label="completed (past)" />
        <Legend swatch="bg-indigo-500/30 border-indigo-400" label="today" />
        <Legend swatch="bg-cyan-800/35 border-cyan-500/50" label="new planned" />
        <Legend swatch="bg-amber-800/40 border-amber-500/60" label="reviews due" />
        <Legend swatch="bg-[#11111b] border-[#1e1e2e]" label="non-study day" />
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm ring-2 ring-yellow-400 bg-[#1e1e2e]" />
          Ready
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm ring-2 ring-emerald-400 bg-[#1e1e2e]" />
          Ready to interview
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm ring-2 ring-fuchsia-400 bg-[#1e1e2e]" />
          Goal date
        </span>
      </div>

      <span className="hidden">{firstOfMonth.toISOString()}</span>
    </section>
  )
}

function MilestoneChip({
  tone, label, sub, iso,
}: {
  tone: 'yellow' | 'emerald'; label: string; sub: string; iso: string | null
}) {
  const ring = tone === 'yellow' ? 'ring-yellow-400' : 'ring-emerald-400'
  const text = tone === 'yellow' ? 'text-yellow-300' : 'text-emerald-300'
  return (
    <div className={`rounded-lg border border-[#313244] bg-[#181825] px-4 py-3 ring-1 ${ring}/40`}>
      <div className="text-[10px] uppercase tracking-wider text-[#6c7086]">{label}</div>
      <div className={`text-base font-semibold tabular-nums mt-0.5 ${text}`}>{fmtIso(iso)}</div>
      <div className="text-[10px] text-[#6c7086] mt-0.5">{sub}</div>
    </div>
  )
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded-sm border ${swatch}`} />
      {label}
    </span>
  )
}
