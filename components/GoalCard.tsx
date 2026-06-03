'use client'

import {
  GOAL_MODE_SHORT,
  parseIsoDate,
  type DailyPlan,
  type StudyGoal,
} from '@/lib/goal'
import { medianMinutes } from '@/lib/timing'

interface Props {
  goal: StudyGoal | null
  plan: DailyPlan | null
  onEdit: () => void
  onSlideDeadline: () => void
}

function formatDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function GoalCard({ goal, plan, onEdit, onSlideDeadline }: Props) {
  if (!goal || !plan) {
    return (
      <section className="rounded-2xl border border-dashed border-[#45475a] bg-[#1e1e2e] p-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#cdd6f4]">
            No study goal yet
          </h2>
          <p className="text-sm text-[#a6adc8] mt-1">
            Set a target date to get a daily plan and pacing.
          </p>
        </div>
        <button
          onClick={onEdit}
          className="text-sm font-medium px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shrink-0"
        >
          Set a goal
        </button>
      </section>
    )
  }

  const headlineColor = plan.goalMet
    ? 'text-emerald-300'
    : plan.overload
      ? 'text-amber-300'
      : 'text-cyan-300'

  // Time-aware estimate: medians from your logged study time once enough
  // sessions exist (≥5 each), else fall back to rough constants.
  const newMin = medianMinutes('new')
  const reviewMin = medianMinutes('review')
  const calibrated = newMin !== null || reviewMin !== null
  const estMin = Math.round(plan.newToday * (newMin ?? 20) + plan.reviewsDueToday * (reviewMin ?? 6))

  return (
    <section className="rounded-2xl border border-[#313244] bg-[#1e1e2e] p-6">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#6c7086] font-semibold">
            Goal
          </p>
          <h2 className={`text-lg font-semibold mt-0.5 ${headlineColor}`}>
            {GOAL_MODE_SHORT[goal.mode]} by {formatDate(goal.targetDate)}
          </h2>
          <p className="text-xs text-[#a6adc8] mt-1">
            {plan.goalMet
              ? 'Goal met. New core is exhausted — review-only mode.'
              : `${plan.remaining} remaining · ${plan.studyDaysLeft} study ${plan.studyDaysLeft === 1 ? 'day' : 'days'} left · pace ${plan.requiredPerDay}/day`}
          </p>
        </div>
        <button
          onClick={onEdit}
          className="text-xs text-[#6c7086] hover:text-indigo-300 underline decoration-dotted underline-offset-2 shrink-0"
        >
          Edit
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Metric
          label="Today"
          value={String(plan.totalToday)}
          sub={plan.isStudyDayToday ? 'new + due' : 'reviews only (off-day)'}
          tone="indigo"
        />
        <Metric
          label="New today"
          value={String(plan.newToday)}
          sub={plan.isStudyDayToday ? `min ${goal.dailyMin}` : 'no new on off-days'}
          tone="cyan"
        />
        <Metric
          label="Reviews due"
          value={String(plan.reviewsDueToday)}
          sub={`cap ${goal.dailyMax}`}
          tone="amber"
        />
      </div>

      <p className="text-xs text-[#a6adc8] mt-3">
        Est. time today:{' '}
        <span className="font-mono text-[#cdd6f4]">≈ {estMin} min</span>
        <span className="text-[#6c7086]">
          {' · '}
          {calibrated
            ? `your pace — new ~${Math.round(newMin ?? 20)}m, review ~${Math.round(reviewMin ?? 6)}m`
            : 'rough estimate — refines as you log study time'}
        </span>
      </p>

      {plan.overload && (
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-900/15 px-4 py-3 flex items-start gap-3">
          <span className="text-amber-300 text-sm">⚠</span>
          <div className="flex-1">
            <p className="text-sm text-amber-200">
              Pace exceeds your daily cap. To finish on time you would need {plan.requiredPerDay} new + {plan.reviewsDueToday} reviews today.
            </p>
            <p className="text-xs text-[#a6adc8] mt-1">
              Sliding the deadline by {plan.recommendedSlide} {plan.recommendedSlide === 1 ? 'day' : 'days'} keeps the workload at most {goal.dailyMax}/day.
            </p>
            <button
              onClick={onSlideDeadline}
              className="mt-2 text-xs font-medium px-3 py-1 rounded-md border border-amber-500/40 bg-amber-900/30 text-amber-200 hover:bg-amber-900/50 transition-colors"
            >
              Slide deadline +{plan.recommendedSlide}d
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function Metric({
  label, value, sub, tone,
}: {
  label: string; value: string; sub: string; tone: 'cyan' | 'amber' | 'indigo'
}) {
  const color = {
    cyan: 'text-cyan-300',
    amber: 'text-amber-300',
    indigo: 'text-indigo-300',
  }[tone]
  return (
    <div className="rounded-lg bg-[#181825] border border-[#313244] px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-[#6c7086] mb-1">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] text-[#6c7086] mt-0.5">{sub}</div>
    </div>
  )
}
