'use client'

import Link from 'next/link'
import type { Difficulty } from '@/data/algo-monster-types'
import type { DayProblems } from '@/lib/goal'

interface ProblemMeta {
  title: string
  pattern: string | null
  difficulty?: Difficulty
}

interface Props {
  iso: string
  ids: DayProblems | undefined
  problems: Record<string, ProblemMeta>
  isToday: boolean
  isStudyDay: boolean
  onClose: () => void
}

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy: 'text-green-400',
  medium: 'text-yellow-400',
  hard: 'text-red-400',
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

export function DayDetail({ iso, ids, problems, isToday, isStudyDay, onClose }: Props) {
  const reviewIds = ids?.reviewIds ?? []
  const newIds = ids?.newIds ?? []
  const total = reviewIds.length + newIds.length

  return (
    <section className="rounded-2xl border border-[#313244] bg-[#1e1e2e] p-5">
      <header className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-semibold text-[#cdd6f4]">
            {fmtDate(iso)} {isToday && <span className="text-indigo-400 text-sm font-normal">· today</span>}
          </h2>
          <p className="text-xs text-[#6c7086] mt-0.5">
            {total === 0
              ? isStudyDay ? 'Nothing scheduled this day.' : 'Off-day — no work scheduled.'
              : `${reviewIds.length} review${reviewIds.length === 1 ? '' : 's'} · ${newIds.length} new`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-[#6c7086] hover:text-[#cdd6f4] px-2 py-1"
          aria-label="Close day detail"
        >
          ✕
        </button>
      </header>

      {(reviewIds.length > 0 || newIds.length > 0) && (
        <div className="flex flex-col gap-4">
          {reviewIds.length > 0 && (
            <ProblemList
              title="Reviews"
              accent="amber"
              ids={reviewIds}
              problems={problems}
            />
          )}
          {newIds.length > 0 && (
            <ProblemList
              title="New starts"
              accent="cyan"
              ids={newIds}
              problems={problems}
            />
          )}
        </div>
      )}
    </section>
  )
}

function ProblemList({
  title, accent, ids, problems,
}: {
  title: string
  accent: 'amber' | 'cyan'
  ids: string[]
  problems: Record<string, ProblemMeta>
}) {
  const accentColor = accent === 'amber' ? 'text-amber-400' : 'text-cyan-400'
  return (
    <div>
      <header className="flex items-baseline gap-2 mb-1.5 px-1">
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${accentColor}`}>
          {title}
        </h3>
        <span className="text-xs text-[#6c7086]">{ids.length}</span>
      </header>
      <ul className="rounded-lg border border-[#313244] bg-[#181825] divide-y divide-[#313244]">
        {ids.map((id) => {
          const meta = problems[id]
          return (
            <li key={id}>
              <Link
                href={`/study/${id}`}
                className="flex items-baseline gap-3 px-3 py-2 hover:bg-[#252537] transition-colors"
              >
                <span className="text-sm text-[#cdd6f4] flex-1 truncate">
                  {meta?.title ?? id}
                </span>
                {meta?.difficulty && (
                  <span className={`text-[10px] uppercase ${DIFFICULTY_COLOR[meta.difficulty]}`}>
                    {meta.difficulty}
                  </span>
                )}
                {meta?.pattern && (
                  <span className="text-[10px] font-mono text-[#6c7086] truncate max-w-[140px]">
                    {meta.pattern}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
