'use client'

import { useEffect, useState } from 'react'
import {
  DEFAULT_GOAL,
  DEFAULT_STUDY_DAYS,
  GOAL_MODE_LABEL,
  isoDate,
  parseIsoDate,
  type GoalMode,
  type StudyGoal,
} from '@/lib/goal'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Props {
  initial: StudyGoal | null
  onSave: (g: StudyGoal) => void
  onCancel: () => void
  onClear?: () => void
}

function defaultTargetIso(weeksOut = 4): string {
  const d = new Date()
  d.setDate(d.getDate() + weeksOut * 7)
  return isoDate(d)
}

export function GoalSetupModal({ initial, onSave, onCancel, onClear }: Props) {
  const [mode, setMode] = useState<GoalMode>(initial?.mode ?? DEFAULT_GOAL.mode)
  const [targetDate, setTargetDate] = useState<string>(
    initial?.targetDate ?? defaultTargetIso(4)
  )
  const [dailyMin, setDailyMin] = useState<number>(
    initial?.dailyMin ?? DEFAULT_GOAL.dailyMin
  )
  const [dailyMax, setDailyMax] = useState<number>(
    initial?.dailyMax ?? DEFAULT_GOAL.dailyMax
  )
  const [studyDays, setStudyDays] = useState<Set<number>>(
    () => new Set(initial?.studyDaysMask ?? DEFAULT_STUDY_DAYS)
  )

  const toggleDay = (n: number) => {
    setStudyDays((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  // Esc to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  const weeksAway = (() => {
    const d = parseIsoDate(targetDate)
    const ms = d.getTime() - Date.now()
    return Math.max(0, Math.round(ms / (7 * 86_400_000)))
  })()

  const submit = () => {
    if (dailyMin < 1) return
    if (dailyMax < dailyMin) return
    if (!targetDate) return
    if (studyDays.size === 0) return
    onSave({
      mode,
      targetDate,
      dailyMin,
      dailyMax,
      studyDaysMask: Array.from(studyDays).sort((a, b) => a - b),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#313244] bg-[#1e1e2e] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b border-[#313244]">
          <h2 className="text-lg font-semibold text-[#cdd6f4]">
            {initial ? 'Edit study goal' : 'Set a study goal'}
          </h2>
          <p className="text-xs text-[#6c7086] mt-1">
            Stored on this device. Daily plan re-derives from your SRS state.
          </p>
        </header>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Mode */}
          <div>
            <label className="text-xs uppercase tracking-wider text-[#6c7086] font-semibold">
              Goal
            </label>
            <div className="flex flex-col gap-2 mt-2">
              {(['ready-to-interview', 'ready'] as GoalMode[]).map((m) => (
                <label
                  key={m}
                  className={`flex items-start gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    mode === m
                      ? 'border-indigo-500 bg-indigo-900/20'
                      : 'border-[#313244] bg-[#181825] hover:border-[#45475a]'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === m}
                    onChange={() => setMode(m)}
                    className="mt-1 accent-indigo-500"
                  />
                  <span className="text-sm text-[#cdd6f4]">
                    {GOAL_MODE_LABEL[m]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Target date */}
          <div>
            <label className="text-xs uppercase tracking-wider text-[#6c7086] font-semibold flex items-baseline justify-between">
              <span>Target date</span>
              <span className="text-[#a6adc8] normal-case font-normal">
                {weeksAway === 0 ? 'today' : `${weeksAway} ${weeksAway === 1 ? 'week' : 'weeks'} away`}
              </span>
            </label>
            <input
              type="date"
              value={targetDate}
              min={isoDate(new Date())}
              onChange={(e) => setTargetDate(e.target.value)}
              className="mt-2 w-full px-3 py-2 rounded-md border border-[#313244] bg-[#181825] text-[#cdd6f4] focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Study days */}
          <div>
            <label className="text-xs uppercase tracking-wider text-[#6c7086] font-semibold flex items-baseline justify-between">
              <span>Study days</span>
              <span className="text-[#a6adc8] normal-case font-normal">
                {studyDays.size} {studyDays.size === 1 ? 'day' : 'days'} / week
              </span>
            </label>
            <div className="flex gap-2 mt-2">
              {DAY_LABELS.map((lbl, i) => {
                const on = studyDays.has(i)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    title={DAY_FULL[i]}
                    className={`w-9 h-9 rounded-md border text-sm font-medium transition-colors ${
                      on
                        ? 'border-indigo-500 bg-indigo-900/40 text-indigo-200'
                        : 'border-[#313244] bg-[#181825] text-[#6c7086] hover:border-[#45475a]'
                    }`}
                  >
                    {lbl}
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-[#6c7086] mt-1">
              New problems are only introduced on study days. Reviews still come up any day.
            </p>
          </div>

          {/* Daily min */}
          <div>
            <label className="text-xs uppercase tracking-wider text-[#6c7086] font-semibold flex items-baseline justify-between">
              <span>Min new problems / day</span>
              <span className="text-[#cdd6f4] font-mono normal-case">{dailyMin}</span>
            </label>
            <input
              type="range"
              min={1}
              max={15}
              value={dailyMin}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                setDailyMin(v)
                if (v > dailyMax) setDailyMax(v)
              }}
              className="w-full mt-2 accent-indigo-500"
            />
            <p className="text-[11px] text-[#6c7086] mt-1">
              Floor on new problems even if pace would otherwise be lower.
            </p>
          </div>

          {/* Daily max */}
          <div>
            <label className="text-xs uppercase tracking-wider text-[#6c7086] font-semibold flex items-baseline justify-between">
              <span>Max total / day (cap)</span>
              <span className="text-[#cdd6f4] font-mono normal-case">{dailyMax}</span>
            </label>
            <input
              type="range"
              min={Math.max(1, dailyMin)}
              max={30}
              value={dailyMax}
              onChange={(e) => setDailyMax(parseInt(e.target.value, 10))}
              className="w-full mt-2 accent-indigo-500"
            />
            <p className="text-[11px] text-[#6c7086] mt-1">
              Hard ceiling on (new + reviews due) per day.
            </p>
          </div>
        </div>

        <footer className="px-6 py-4 border-t border-[#313244] flex items-center gap-3">
          {initial && onClear && (
            <button
              onClick={onClear}
              className="text-xs text-[#6c7086] hover:text-red-400 transition-colors"
            >
              Remove goal
            </button>
          )}
          <button
            onClick={onCancel}
            className="ml-auto text-sm text-[#a6adc8] hover:text-[#cdd6f4] px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="text-sm font-medium px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  )
}
